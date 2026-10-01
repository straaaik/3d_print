-- Phase 6. Apply after order_lifecycle. Complete same-owner restore only.
-- Explicit user maintenance is the only operation that replaces audit history.
begin;
alter table public.business_state_revisions add column if not exists generation bigint not null default 0 check(generation >= 0);

do $$ begin
  if to_regprocedure('public.business_snapshot_before_maintenance()') is null then
    alter function public.business_inventory_snapshot() rename to business_snapshot_before_maintenance;
  end if;
end $$;
revoke all on function public.business_snapshot_before_maintenance() from public,anon,authenticated;
create or replace function public.business_inventory_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  result:=public.business_snapshot_before_maintenance();
  return result || jsonb_build_object('generation',coalesce((select generation from public.business_state_revisions where user_id=auth.uid()),0));
end $$;
revoke all on function public.business_inventory_snapshot() from public,anon;
grant execute on function public.business_inventory_snapshot() to authenticated;

create or replace function public.business_database_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); result jsonb; relation_name text; rows_json jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  result:=jsonb_build_object('business',public.business_inventory_snapshot());
  foreach relation_name in array array['printers','filaments','settings','collections','saved_calculations','orders','monthly_goals'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from public.%I r where user_id=$1',relation_name) into rows_json using owner_id;
    result:=result||jsonb_build_object(relation_name,rows_json);
  end loop;
  return result;
end $$;
revoke all on function public.business_database_snapshot() from public,anon;
grant execute on function public.business_database_snapshot() to authenticated;

create or replace function public.business_assert_generation(p_command jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); current_generation bigint;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  -- An acknowledged old request remains retryable after a reset.
  if exists(select from public.business_operation_receipts where user_id=owner_id and event_key=p_command->>'id') then return; end if;
  select coalesce(generation,0) into current_generation from public.business_state_revisions where user_id=owner_id;
  if coalesce((p_command->>'generation')::bigint,0) is distinct from coalesce(current_generation,0) then
    raise exception 'BUSINESS_GENERATION_CONFLICT';
  end if;
end $$;
revoke all on function public.business_assert_generation(jsonb) from public,anon,authenticated;

-- Keep existing validation/receipt behavior behind generation-aware entry points.
do $wrap$ declare api text; internal_name text; definition text; begin
  foreach api in array array['commit_business_inventory','business_apply_order','business_apply_catalog','business_save_calculation_project'] loop
    internal_name:=api||'_before_maintenance';
    if to_regprocedure(format('public.%I(bigint,jsonb,jsonb)',internal_name)) is null then
      execute format('alter function public.%I(bigint,jsonb,jsonb) rename to %I',api,internal_name);
    end if;
    execute format('revoke all on function public.%I(bigint,jsonb,jsonb) from public,anon,authenticated',internal_name);
    execute format($fn$create or replace function public.%I(p_expected_revision bigint,p_command jsonb,p_state jsonb)
      returns jsonb language plpgsql security definer set search_path='' as $body$
      begin perform public.business_assert_generation(p_command);
        return public.%I(p_expected_revision,p_command,p_state); end $body$;$fn$,api,internal_name);
    execute format('revoke all on function public.%I(bigint,jsonb,jsonb) from public,anon',api);
    execute format('grant execute on function public.%I(bigint,jsonb,jsonb) to authenticated',api);
  end loop;
  if to_regprocedure('public.business_apply_legacy_order_before_maintenance(jsonb)') is null then
    alter function public.business_apply_legacy_order(jsonb) rename to business_apply_legacy_order_before_maintenance;
  end if;
  -- The modern legacy command has already checked its epoch. Its internal calls
  -- bypass raw legacy entry points, which cannot safely identify old queued work.
  foreach api in array array['save_order_with_inventory','restore_orders_snapshot'] loop
    internal_name:='business_'||api||'_compat_internal';
    if to_regprocedure(format('public.%I(jsonb)',internal_name)) is null then
      execute format('alter function public.%I(jsonb) rename to %I',api,internal_name);
    end if;
    execute format('revoke all on function public.%I(jsonb) from public,anon,authenticated',internal_name);
    definition:=pg_get_functiondef('public.business_apply_legacy_order_before_maintenance(jsonb)'::regprocedure);
    definition:=replace(definition,'public.'||api||'(','public.'||internal_name||'(');
    execute definition;
    execute format($fn$create or replace function public.%I(%I jsonb) returns %s language plpgsql security definer set search_path='' as $body$
      begin perform public.business_assert_generation('{}'::jsonb); %s public.%I(%I); end $body$;$fn$,
      api,case when api='save_order_with_inventory' then 'p_order' else 'p_orders' end,
      case when api='save_order_with_inventory' then 'jsonb' else 'integer' end,'return',internal_name,
      case when api='save_order_with_inventory' then 'p_order' else 'p_orders' end);
    execute format('revoke all on function public.%I(jsonb) from public,anon',api);
    execute format('grant execute on function public.%I(jsonb) to authenticated',api);
  end loop;
  if to_regprocedure('public.business_delete_orders_compat_internal(uuid[])') is null then
    alter function public.delete_orders_atomic(uuid[]) rename to business_delete_orders_compat_internal;
  end if;
  definition:=pg_get_functiondef('public.business_apply_legacy_order_before_maintenance(jsonb)'::regprocedure);
  execute replace(definition,'public.delete_orders_atomic(','public.business_delete_orders_compat_internal(');
end $wrap$;
revoke all on function public.business_apply_legacy_order_before_maintenance(jsonb),public.business_delete_orders_compat_internal(uuid[]) from public,anon,authenticated;
create or replace function public.business_apply_legacy_order(p_command jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin perform public.business_assert_generation(p_command); return public.business_apply_legacy_order_before_maintenance(p_command); end $$;
create or replace function public.delete_orders_atomic(p_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$
begin perform public.business_assert_generation('{}'::jsonb); return public.business_delete_orders_compat_internal(p_ids); end $$;
revoke all on function public.business_apply_legacy_order(jsonb),public.delete_orders_atomic(uuid[]) from public,anon;
grant execute on function public.business_apply_legacy_order(jsonb),public.delete_orders_atomic(uuid[]) to authenticated;

-- Incomplete legacy restore endpoints must never resurrect a pre-reset cache.
do $legacy$ declare api text; internal_name text; parameter_name text; return_name text; call_keyword text; begin
  foreach api in array array['restore_database_snapshot','restore_saved_calculations_snapshot','restore_collections_snapshot'] loop
    internal_name:=api||'_before_maintenance';
    if to_regprocedure(format('public.%I(jsonb)',internal_name)) is null and to_regprocedure(format('public.%I(jsonb)',api)) is not null then
      execute format('alter function public.%I(jsonb) rename to %I',api,internal_name);
    end if;
    if to_regprocedure(format('public.%I(jsonb)',internal_name)) is null then continue; end if;
    select proargnames[1],prorettype::regtype::text into parameter_name,return_name from pg_proc where oid=to_regprocedure(format('public.%I(jsonb)',internal_name));
    call_keyword:=case when return_name='void' then 'perform' else 'return' end;
    execute format('revoke all on function public.%I(jsonb) from public,anon,authenticated',internal_name);
    execute format($fn$create or replace function public.%I(%I jsonb) returns %s language plpgsql security definer set search_path='' as $body$
      begin perform public.business_assert_generation('{}'::jsonb); %s public.%I(%I); end $body$;$fn$,api,parameter_name,return_name,call_keyword,internal_name,parameter_name);
    execute format('revoke all on function public.%I(jsonb) from public,anon',api);
    execute format('grant execute on function public.%I(jsonb) to authenticated',api);
  end loop;
end $legacy$;

create or replace function public.business_restore_snapshot(p_expected_revision bigint,p_command jsonb,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  owner_id uuid:=auth.uid(); state jsonb:=p_snapshot->'business'; mapping record; relation_name text;
  current_revision bigint; current_generation bigint; stored jsonb; receipt jsonb;
  rows_json jsonb; row_json jsonb; invalid boolean;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_command->>'kind' is distinct from 'restoreBusinessSnapshot' or nullif(p_command->>'id','') is null
    or length(p_command->>'id')>160 or nullif(p_command->>'occurredAt','') is null then raise exception 'INVALID_MAINTENANCE_COMMAND'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  receipt:=p_command||jsonb_build_object('snapshotHash',md5(p_snapshot::text));
  select command into stored from public.business_operation_receipts where user_id=owner_id and event_key=p_command->>'id';
  if found then
    if stored is distinct from receipt then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  insert into public.business_state_revisions(user_id) values(owner_id) on conflict do nothing;
  select revision,generation into current_revision,current_generation from public.business_state_revisions where user_id=owner_id for update;
  if p_expected_revision is distinct from current_revision or (p_command->>'generation')::bigint is distinct from current_generation then
    raise exception 'BUSINESS_MAINTENANCE_REVISION_CONFLICT'; end if;
  if state->>'version' is distinct from '1' or state->>'user_id' is distinct from owner_id::text then raise exception 'INVALID_OWNER_OR_VERSION'; end if;
  foreach relation_name in array array['printers','filaments','settings','collections','saved_calculations','orders','monthly_goals'] loop
    if jsonb_typeof(p_snapshot->relation_name) is distinct from 'array' then raise exception 'INCOMPLETE_MAINTENANCE_SNAPSHOT: %',relation_name; end if;
    if exists(select from jsonb_array_elements(p_snapshot->relation_name) r where r ? 'user_id' and r->>'user_id' is distinct from owner_id::text) then raise exception 'CROSS_OWNER_ROW'; end if;
  end loop;
  -- Check all row boundaries and foreign primary-key collisions before deletion.
  for mapping in select * from (values
    ('manufacturers','filament_manufacturers'),('materialTypes','material_types'),('materialLines','material_lines'),
    ('variants','filament_variants'),('purchases','filament_purchases'),('projects','calculation_projects'),
    ('calculationItems','calculation_items'),('orderItems','order_items'),('productionEvents','production_events'),
    ('filamentMovements','filament_movements'),('deficits','filament_deficits'),('finishedBalances','finished_stock_balances'),
    ('finishedMovements','finished_stock_movements')) m(key,relation) loop
    rows_json:=state->mapping.key;
    if jsonb_typeof(rows_json) is distinct from 'array' then raise exception 'INVALID_COLLECTION: %',mapping.key; end if;
    if exists(select from jsonb_array_elements(rows_json) r where r->>'user_id' is distinct from owner_id::text) then raise exception 'CROSS_OWNER_ROW'; end if;
    execute format('select exists(select from jsonb_populate_recordset(null::public.%1$I,$2) incoming join public.%1$I old on incoming.id=old.id where old.user_id<>$1)',mapping.relation)
      into invalid using owner_id,rows_json;
    if invalid then raise exception 'CROSS_OWNER_ID'; end if;
  end loop;
  -- Nested snapshots are historical facts, but their identities still belong to this owner.
  if exists(with recursive nested(value) as (
    select p_snapshot union all select child from nested n cross join lateral (
      select v as child from jsonb_each(case when jsonb_typeof(n.value)='object' then n.value else '{}'::jsonb end) e(k,v)
      union all select v from jsonb_array_elements(case when jsonb_typeof(n.value)='array' then n.value else '[]'::jsonb end) e(v)
    ) c) select from nested where jsonb_typeof(value)='object' and value ? 'user_id' and value->>'user_id' is distinct from owner_id::text)
    then raise exception 'CROSS_OWNER_SNAPSHOT'; end if;
  foreach relation_name in array array['finished_stock_movements','filament_movements','filament_deficits','production_events',
    'order_items','calculation_items','calculation_projects','filament_purchases','finished_stock_balances','filament_variants',
    'material_lines','material_types','filament_manufacturers'] loop
    execute format('delete from public.%I where user_id=$1',relation_name) using owner_id;
  end loop;
  perform public.legacy_restore_database_snapshot_unlocked(p_snapshot-'business');
  for mapping in select * from (values
    ('manufacturers','filament_manufacturers'),('materialTypes','material_types'),('materialLines','material_lines'),
    ('variants','filament_variants'),('purchases','filament_purchases'),('projects','calculation_projects'),
    ('calculationItems','calculation_items'),('orderItems','order_items'),('productionEvents','production_events'),
    ('filamentMovements','filament_movements'),('deficits','filament_deficits'),('finishedBalances','finished_stock_balances'),
    ('finishedMovements','finished_stock_movements')) m(key,relation) loop
    execute format('insert into public.%1$I select r.* from jsonb_populate_recordset(null::public.%1$I,$1) r',mapping.relation) using state->mapping.key;
  end loop;
  if exists(select from public.order_items where user_id=owner_id and (coalesce(reserved_quantity,0)+production_quantity<>fulfilled_quantity
    or coalesce(returned_quantity,0)>fulfilled_quantity)) then raise exception 'INVALID_ALLOCATION_COUNTERS'; end if;
  if exists(select from public.order_items i where i.user_id=owner_id and not exists
    (select from public.orders o where o.user_id=owner_id and o.id::text=i.source_order_id and o.type='income'))
    then raise exception 'INVALID_ORDER_REFERENCE'; end if;
  if exists(select from public.orders o where o.user_id=owner_id and o.product_id is not null and not exists
    (select from public.saved_calculations p where p.id=o.product_id and p.user_id=owner_id)) then raise exception 'CROSS_OWNER_PRODUCT'; end if;
  if exists(select from public.orders o where o.user_id=owner_id and o.type='income' and not o.order_archived and
    o.cost is distinct from (select coalesce(sum(i.total_cost),0) from public.order_items i where i.user_id=owner_id and i.source_order_id=o.id::text and not coalesce(i.archived,false)))
    then raise exception 'ORDER_COST_SNAPSHOT_MISMATCH'; end if;
  -- JSON recipes have no relational FK: validate their material identities explicitly.
  for row_json in select recipe from public.calculation_items where user_id=owner_id union all
    select recipe_snapshot from public.production_events where user_id=owner_id union all
    select snapshot->'recipe' from public.order_items where user_id=owner_id and snapshot->'recipe'<>'null'::jsonb loop
    if row_json->>'version' is distinct from '1' or jsonb_typeof(row_json->'materials') is distinct from 'array'
      or jsonb_typeof(row_json->'non_material_unit_cost') is distinct from 'number'
      or (row_json->>'non_material_unit_cost')::numeric<0 or exists(select from jsonb_array_elements(row_json->'materials') m where
        jsonb_typeof(m->'grams_per_unit') is distinct from 'number' or (m->>'grams_per_unit')::numeric<=0
        or not exists(select from public.filament_variants v where v.user_id=owner_id and v.id::text=m->>'variant_id'))
      then raise exception 'INVALID_RECIPE_REFERENCE'; end if;
  end loop;
  update public.saved_calculations p set stock_quantity=b.quantity from public.finished_stock_balances b where p.user_id=owner_id and b.user_id=owner_id and p.id=b.product_id;
  update public.business_state_revisions set revision=current_revision+1,generation=current_generation+1 where user_id=owner_id;
  insert into public.business_operation_receipts(user_id,event_key,command,revision) values(owner_id,p_command->>'id',receipt,current_revision+1);
  return public.business_inventory_snapshot();
end $$;
revoke all on function public.business_restore_snapshot(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.business_restore_snapshot(bigint,jsonb,jsonb) to authenticated;
commit;
