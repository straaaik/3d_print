-- Phase 2. Apply after supabase_migration_20260929_business_foundation.sql.
-- No cloud SQL is executed by the application automatically.
begin;

create table if not exists public.business_state_revisions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0)
);
create table if not exists public.business_operation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  command jsonb not null,
  revision bigint not null,
  created_at timestamptz not null default now(),
  primary key(user_id, event_key)
);
alter table public.business_state_revisions enable row level security;
alter table public.business_operation_receipts enable row level security;
revoke all on public.business_state_revisions, public.business_operation_receipts from public, anon, authenticated;
grant select on public.business_state_revisions, public.business_operation_receipts to authenticated;
drop policy if exists owner_read on public.business_state_revisions;
create policy owner_read on public.business_state_revisions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists owner_read on public.business_operation_receipts;
create policy owner_read on public.business_operation_receipts for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.business_inventory_snapshot()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  result jsonb;
  mapping record;
  rows_json jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  -- The same owner lock also protects readers from observing mixed table revisions.
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:' || owner_id::text, 0));
  result := jsonb_build_object('version', 1, 'user_id', owner_id,
    'revision', coalesce((select revision from public.business_state_revisions where user_id = owner_id), 0));
  for mapping in select * from (values
    ('manufacturers','filament_manufacturers'), ('materialTypes','material_types'),
    ('materialLines','material_lines'), ('variants','filament_variants'),
    ('purchases','filament_purchases'), ('filamentMovements','filament_movements'),
    ('deficits','filament_deficits'), ('projects','calculation_projects'),
    ('calculationItems','calculation_items'), ('orderItems','order_items'),
    ('productionEvents','production_events'), ('finishedBalances','finished_stock_balances'),
    ('finishedMovements','finished_stock_movements')) as m(key, relation)
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at,r.id), ''[]''::jsonb) from public.%I r where user_id = $1', mapping.relation)
      into rows_json using owner_id;
    result := result || jsonb_build_object(mapping.key, rows_json);
  end loop;
  return result;
end $$;

create or replace function public.commit_business_inventory(p_expected_revision bigint, p_command jsonb, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  event_id text := p_command->>'id';
  stored_command jsonb;
  current_revision bigint;
  mapping record;
  rows_json jsonb;
  invalid boolean;
  assignments text;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_command) is distinct from 'object' or event_id is null or length(event_id) not between 1 and 160 then
    raise exception 'INVALID_COMMAND';
  end if;
  if p_state->>'user_id' is distinct from owner_id::text or p_state->>'version' is distinct from '1' then
    raise exception 'INVALID_OWNER_OR_VERSION';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:' || owner_id::text, 0));
  select command into stored_command from public.business_operation_receipts where user_id = owner_id and event_key = event_id;
  if found then
    if stored_command <> p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  insert into public.business_state_revisions(user_id) values (owner_id) on conflict do nothing;
  select revision into current_revision from public.business_state_revisions where user_id = owner_id for update;
  if p_expected_revision is distinct from current_revision then raise exception 'BUSINESS_REVISION_CONFLICT'; end if;

  -- Dependency order. All writes are rolled back if any constraint or revision check fails.
  for mapping in select * from (values
    ('manufacturers','filament_manufacturers',false), ('materialTypes','material_types',false),
    ('materialLines','material_lines',false), ('variants','filament_variants',false),
    ('purchases','filament_purchases',true), ('projects','calculation_projects',false),
    ('calculationItems','calculation_items',false), ('orderItems','order_items',false),
    ('productionEvents','production_events',true), ('filamentMovements','filament_movements',true),
    ('deficits','filament_deficits',true), ('finishedBalances','finished_stock_balances',false),
    ('finishedMovements','finished_stock_movements',true)) as m(key, relation, immutable)
  loop
    rows_json := p_state->mapping.key;
    if jsonb_typeof(rows_json) is distinct from 'array' then raise exception 'INVALID_COLLECTION: %', mapping.key; end if;
    if exists(select from jsonb_array_elements(rows_json) r where r->>'user_id' is distinct from owner_id::text) then
      raise exception 'CROSS_OWNER_ROW';
    end if;
    -- No silent deletion, no cross-owner PK collision, no audit edits.
    execute format('select exists(select from public.%1$I old where old.user_id = $1 and not exists '
      '(select from jsonb_populate_recordset(null::public.%1$I,$2) incoming where incoming.id = old.id))', mapping.relation)
      into invalid using owner_id, rows_json;
    if invalid then raise exception 'INVENTORY_DELETION_NOT_SUPPORTED: %', mapping.key; end if;
    execute format('select exists(select from jsonb_populate_recordset(null::public.%1$I,$2) incoming '
      'join public.%1$I old on old.id = incoming.id where old.user_id <> $1)', mapping.relation)
      into invalid using owner_id, rows_json;
    if invalid then raise exception 'CROSS_OWNER_ID'; end if;
    if mapping.immutable then
      execute format('select exists(select from jsonb_populate_recordset(null::public.%1$I,$2) incoming '
        'join public.%1$I old on old.id = incoming.id where old.user_id = $1 and to_jsonb(old) <> to_jsonb(incoming))', mapping.relation)
        into invalid using owner_id, rows_json;
      if invalid then raise exception 'IMMUTABLE_AUDIT_ROW: %', mapping.key; end if;
      execute format('insert into public.%1$I select incoming.* from jsonb_populate_recordset(null::public.%1$I,$1) incoming on conflict(id) do nothing', mapping.relation)
        using rows_json;
    else
      select string_agg(format('%1$I = excluded.%1$I', a.attname), ',') into assignments
        from pg_attribute a where a.attrelid = format('public.%I', mapping.relation)::regclass
        and a.attnum > 0 and not a.attisdropped and a.attname not in ('id','user_id','created_at');
      execute format('insert into public.%1$I select incoming.* from jsonb_populate_recordset(null::public.%1$I,$1) incoming '
        'on conflict(id) do update set %2$s where public.%1$I.user_id = excluded.user_id', mapping.relation, assignments)
        using rows_json;
    end if;
  end loop;
  -- Keep the legacy product view consistent while later stages adopt the ledger.
  update public.saved_calculations p set stock_quantity = b.quantity
    from public.finished_stock_balances b where b.user_id = owner_id and p.user_id = owner_id and p.id = b.product_id;
  update public.business_state_revisions set revision = current_revision + 1 where user_id = owner_id;
  insert into public.business_operation_receipts(user_id,event_key,command,revision)
    values (owner_id,event_id,p_command,current_revision + 1);
  return public.business_inventory_snapshot();
end $$;
revoke all on function public.business_inventory_snapshot() from public, anon;
revoke all on function public.commit_business_inventory(bigint,jsonb,jsonb) from public, anon;
grant execute on function public.business_inventory_snapshot() to authenticated;
grant execute on function public.commit_business_inventory(bigint,jsonb,jsonb) to authenticated;

commit;
