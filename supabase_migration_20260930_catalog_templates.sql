-- Phase 4. Apply after all phase 1–3 migrations, in Supabase SQL Editor.
-- Catalog metadata never represents production or a material return.
begin;
alter table public.saved_calculations
  add column if not exists catalog_revision bigint not null default 0 check (catalog_revision >= 0),
  add column if not exists catalog_archived boolean not null default false,
  add column if not exists calculation_snapshot jsonb
    check (calculation_snapshot is null or jsonb_typeof(calculation_snapshot) is not distinct from 'object'
      and calculation_snapshot->>'version' is not distinct from '1'
      and jsonb_typeof(calculation_snapshot->'inputs') is not distinct from 'object'
      and jsonb_typeof(calculation_snapshot->'result') is not distinct from 'object'),
  add column if not exists agreed_price numeric(20,6)
    check (agreed_price >= 0 and agreed_price <> 'NaN'::numeric);

create or replace function public.business_apply_catalog(p_expected_revision bigint, p_command jsonb, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  stored_command jsonb;
  before_state jsonb;
  incoming jsonb;
  previous jsonb;
  target_id uuid;
  affected boolean;
  expected bigint;
  assignments text;
  collection text;
  restore_id text;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(p_command->>'kind','') not in ('saveCatalogProduct','archiveCatalogProducts','restoreCatalog')
    or p_command->>'id' is null or p_state->>'user_id' is distinct from owner_id::text
    or jsonb_typeof(p_state->'legacyProducts') is distinct from 'array'
    then raise exception 'INVALID_CATALOG_COMMAND'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  select command into stored_command from public.business_operation_receipts
    where user_id=owner_id and event_key=p_command->>'id';
  if found then
    if stored_command<>p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  before_state := public.business_inventory_snapshot();
  if p_expected_revision is distinct from (before_state->>'revision')::bigint
    then raise exception 'BUSINESS_REVISION_CONFLICT'; end if;
  if p_command->>'kind'='archiveCatalogProducts' and jsonb_typeof(p_command->'productIds') is distinct from 'array'
    or p_command->>'kind'='restoreCatalog' and jsonb_typeof(p_command->'products') is distinct from 'array'
    then raise exception 'INVALID_CATALOG_COMMAND'; end if;
  if exists(select from jsonb_array_elements(p_state->'legacyProducts') p where p->>'user_id' is distinct from owner_id::text)
    or exists(select from public.saved_calculations old where old.user_id=owner_id and not exists
      (select from jsonb_array_elements(p_state->'legacyProducts') p where p->>'id'=old.id::text))
    or (select count(*) from jsonb_array_elements(p_state->'legacyProducts')) <>
       (select count(distinct p->>'id') from jsonb_array_elements(p_state->'legacyProducts') p)
    then raise exception 'INVALID_CATALOG_STATE'; end if;
  -- Every non-catalog resource and every existing physical balance is unchanged.
  foreach collection in array array['manufacturers','materialTypes','materialLines','variants','purchases',
    'filamentMovements','deficits','projects','calculationItems','orderItems','productionEvents'] loop
    if p_state->collection is distinct from before_state->collection then raise exception 'CATALOG_CHANGED_INVENTORY'; end if;
  end loop;
  if exists(select from jsonb_array_elements(before_state->'finishedBalances') old where not exists
    (select from jsonb_array_elements(p_state->'finishedBalances') p where p=old))
    or exists(select from jsonb_array_elements(before_state->'finishedMovements') old where not exists
    (select from jsonb_array_elements(p_state->'finishedMovements') p where p=old))
    then raise exception 'CATALOG_CHANGED_INVENTORY'; end if;
  if p_command->>'kind'='saveCatalogProduct' then
    target_id := (p_command#>>'{product,id}')::uuid;
    select to_jsonb(p) into previous from public.saved_calculations p where id=target_id and user_id=owner_id;
    if target_id is null or coalesce(p_command->>'isNew','') not in ('true','false')
      or (p_command->>'isNew'='true' and exists(select from public.saved_calculations where id=target_id))
      or (p_command->>'isNew'='false' and (previous is null
        or (previous->>'catalog_revision')::bigint is distinct from (p_command->>'expectedRevision')::bigint))
      then raise exception 'BUSINESS_CATALOG_REVISION_CONFLICT: local editor retained'; end if;
    if not exists(select from jsonb_array_elements(p_state->'legacyProducts') p where p->>'id'=target_id::text)
      then raise exception 'INVALID_CATALOG_STATE'; end if;
  end if;
  if p_command->>'kind'='restoreCatalog' and p_command ? 'productIds' then
    if jsonb_typeof(p_command->'productIds') is distinct from 'array' then raise exception 'INVALID_CATALOG_STATE'; end if;
    for restore_id in select value from jsonb_array_elements_text(p_command->'productIds') as ids(value) loop
      select to_jsonb(p) into previous from public.saved_calculations p where p.id=restore_id::uuid and p.user_id=owner_id;
      if previous is null or (previous->>'catalog_revision')::bigint is distinct from
        (p_command->'expectedRevisions'->>restore_id)::bigint
        then raise exception 'BUSINESS_CATALOG_REVISION_CONFLICT: Undo retained'; end if;
    end loop;
  end if;
  select string_agg(format('%1$I=excluded.%1$I',a.attname),',') into assignments
    from pg_attribute a where a.attrelid='public.saved_calculations'::regclass
    and a.attnum>0 and not a.attisdropped and a.attname not in ('id','user_id','created_at','stock_quantity');
  for incoming in select value from jsonb_array_elements(p_state->'legacyProducts') loop
    select to_jsonb(p) into previous from public.saved_calculations p where id=(incoming->>'id')::uuid and user_id=owner_id;
    affected := case p_command->>'kind'
      when 'saveCatalogProduct' then incoming->>'id'=target_id::text
      when 'archiveCatalogProducts' then p_command->'productIds' ? (incoming->>'id')
      else not (p_command ? 'productIds') or p_command->'productIds' ? (incoming->>'id') end;
    if not affected then continue; end if;
    if exists(select from public.saved_calculations where id=(incoming->>'id')::uuid and user_id<>owner_id)
      then raise exception 'CROSS_OWNER_ID'; end if;
    expected := case when previous is null then 0 else (previous->>'catalog_revision')::bigint+1 end;
    -- Undo keeps already-archived rows unchanged.
    if incoming->>'catalog_revision' is distinct from expected::text and incoming is distinct from previous
      then raise exception 'INVALID_CATALOG_REVISION'; end if;
    if previous is not null and incoming->>'catalog_revision'=(previous->>'catalog_revision') then continue; end if;
    if p_command->>'kind'='archiveCatalogProducts' and incoming->>'catalog_archived' is distinct from 'true'
      then raise exception 'INVALID_CATALOG_ARCHIVE'; end if;
    if p_command->>'kind'='saveCatalogProduct' and incoming->>'catalog_archived' is distinct from 'false'
      then raise exception 'INVALID_CATALOG_ARCHIVE'; end if;
    -- Full template replacement clears optional parameters explicitly, preserving identity and stock.
    incoming := incoming || jsonb_build_object('user_id',owner_id,
      'created_at',coalesce(previous->'created_at',incoming->'created_at',to_jsonb(now())),
      'stock_quantity',coalesce(previous->'stock_quantity',incoming->'stock_quantity','0'::jsonb));
    execute format('insert into public.saved_calculations select r.* from jsonb_populate_record(null::public.saved_calculations,$1) r '
      'on conflict(id) do update set %s where saved_calculations.user_id=excluded.user_id',assignments) using incoming;
  end loop;
  -- New templates may only add opening balances, never alter existing stock or produce units.
  if exists(select from jsonb_array_elements(p_state->'finishedBalances') b
    where not exists(select from jsonb_array_elements(before_state->'finishedBalances') old where old=b)
    and (exists(select from jsonb_array_elements(before_state->'finishedBalances') old where old->>'id'=b->>'id')
      or not exists(select from public.saved_calculations p where p.user_id=owner_id
        and p.id::text=b->>'source_product_id' and coalesce(p.stock_quantity,0)=(b->>'quantity')::integer
        and abs((b->>'average_unit_cost')::numeric-p.base_cost/p.quantity)<=0.00000001 and b->>'revision'='0')))
    or exists(select from jsonb_array_elements(p_state->'finishedMovements') m
      where not exists(select from jsonb_array_elements(before_state->'finishedMovements') old where old=m)
      and (m->>'source' is distinct from 'opening_balance'
        or m->>'event_key' is distinct from 'opening:finished:'||(m->>'source_product_id')
        or exists(select from jsonb_array_elements(before_state->'finishedBalances') b where b->>'source_product_id'=m->>'source_product_id')
        or not exists(select from jsonb_array_elements(p_state->'finishedBalances') b
          where b->>'source_product_id'=m->>'source_product_id' and (b->>'quantity')::integer>0
            and b->>'quantity'=m->>'delta_quantity' and b->>'quantity'=m->>'balance_after'
            and abs((b->>'average_unit_cost')::numeric-(m->>'unit_cost')::numeric)<=0.00000001)))
    then raise exception 'CATALOG_CHANGED_INVENTORY'; end if;
  return public.commit_business_inventory(p_expected_revision,p_command,p_state);
end $$;
revoke all on function public.business_apply_catalog(bigint,jsonb,jsonb) from public, anon;
grant execute on function public.business_apply_catalog(bigint,jsonb,jsonb) to authenticated;
commit;
