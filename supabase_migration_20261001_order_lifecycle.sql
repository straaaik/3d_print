-- Phase 5: order snapshots, available-stock allocation and physical production.
-- Apply after the six phase 1–4 migrations. Never runs production during migration.
begin;
alter table public.orders add column if not exists order_revision bigint not null default 0 check(order_revision >= 0);
alter table public.orders add column if not exists order_archived boolean not null default false;
alter table public.order_items add column if not exists reserved_quantity integer default 0 check(reserved_quantity >= 0);
alter table public.order_items add column if not exists returned_quantity integer default 0 check(returned_quantity >= 0);
alter table public.order_items add column if not exists archived boolean default false;
create index if not exists orders_active_owner on public.orders(user_id,order_archived);

-- Only the validated RPCs may write snapshots and immutable inventory facts.
-- SELECT remains owner-scoped under the existing RLS policies.
do $$ declare relation_name text; begin
  foreach relation_name in array array['orders','saved_calculations','filament_manufacturers','material_types','material_lines','filament_variants',
    'filament_purchases','filament_movements','filament_deficits','calculation_projects','calculation_items','order_items',
    'production_events','finished_stock_balances','finished_stock_movements','business_state_revisions','business_operation_receipts'] loop
    execute format('revoke insert,update,delete on public.%I from authenticated,anon',relation_name);
  end loop;
  if to_regprocedure('public.business_commit_inventory_internal(bigint,jsonb,jsonb)') is null then
    alter function public.commit_business_inventory(bigint,jsonb,jsonb) rename to business_commit_inventory_internal;
  end if;
end $$;
revoke all on function public.business_commit_inventory_internal(bigint,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.business_create_project_order(bigint,jsonb,jsonb) from public,anon,authenticated;

create or replace function public.commit_business_inventory(p_expected_revision bigint,p_command jsonb,p_state jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner_id uuid:=auth.uid(); original jsonb; stored_command jsonb; row_item jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  select command into stored_command from public.business_operation_receipts where user_id=owner_id and event_key=p_command->>'id';
  if found then
    if stored_command is distinct from p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  original:=public.business_inventory_snapshot();
  if coalesce(p_command->>'kind','') not in ('bootstrap','purchase','produce','adjustFinished',
    'saveManufacturer','saveMaterialType','saveMaterialLine','saveVariant','saveProject',
    'saveCatalogProduct','archiveCatalogProducts','restoreCatalog') then raise exception 'INVALID_INVENTORY_COMMAND_KIND'; end if;
  if exists(select from jsonb_array_elements(original->'orderItems') old where not exists
    (select from jsonb_array_elements(p_state->'orderItems') incoming where incoming=old))
    then raise exception 'ORDER_ITEMS_REQUIRE_ATOMIC_API'; end if;
  for row_item in select value from jsonb_array_elements(p_state->'orderItems') incoming where not exists
    (select from jsonb_array_elements(original->'orderItems') old where old->>'id'=incoming->>'id') loop
    if p_command->>'kind'<>'bootstrap' or row_item->>'cost_provenance'<>'legacy'
      or (row_item->>'fulfilled_quantity')::integer<>0 or (row_item->>'production_quantity')::integer<>0
      or row_item#>'{snapshot,calculation}' is distinct from 'null'::jsonb
      or row_item#>'{snapshot,recipe}' is distinct from 'null'::jsonb
      or not exists(select from public.orders o where o.user_id=owner_id and o.id::text=row_item->>'source_order_id'
        and o.type='income' and o.cost=(row_item->>'total_cost')::numeric and o.amount=(row_item->>'total_price')::numeric
        and o.quantity=(row_item->>'quantity')::integer)
      then raise exception 'ORDER_ITEMS_REQUIRE_ATOMIC_API'; end if;
  end loop;
  if exists(select from jsonb_array_elements(p_state->'productionEvents') p where p->>'order_item_id' is not null
    and not exists(select from public.production_events old where old.user_id=owner_id and old.id=(p->>'id')::uuid))
    or exists(select from jsonb_array_elements(p_state->'finishedMovements') m where m->>'order_item_id' is not null
      and not exists(select from public.finished_stock_movements old where old.user_id=owner_id and old.id=(m->>'id')::uuid))
    then raise exception 'ORDER_ALLOCATION_REQUIRES_ATOMIC_API'; end if;
  return public.business_commit_inventory_internal(p_expected_revision,p_command,p_state);
end $$;
revoke all on function public.commit_business_inventory(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.commit_business_inventory(bigint,jsonb,jsonb) to authenticated;

create or replace function public.business_apply_order(p_expected_revision bigint,p_command jsonb,p_state jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  owner_id uuid:=auth.uid();
  event_id text:=p_command->>'id';
  command_kind text:=p_command->>'kind';
  stored_command jsonb;
  original jsonb;
  original_head jsonb;
  head jsonb;
  item jsonb;
  production jsonb;
  material jsonb;
  current_cost numeric;
  required_grams numeric;
  accounted_grams numeric;
  actual_item_cost numeric;
  produced_delta integer;
  reserved_delta integer;
  returned_delta integer;
  stock_balance jsonb;
  stock_movement jsonb;
  stock_quantity integer;
  stock_average numeric;
  return_basis numeric;
  old_item jsonb;
  mapping record;
  target_ids text[];
  target_id text;
  columns_list text;
  assignments text;
  new_number bigint;
  invalid boolean;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_command) is distinct from 'object' or event_id is null
    or length(event_id) not between 1 and 160 or coalesce(command_kind,'') not in
      ('saveBusinessOrder','createProjectOrder','archiveBusinessOrders','restoreBusinessOrders','returnOrderFinished')
    or p_state->>'user_id' is distinct from owner_id::text then raise exception 'INVALID_ORDER_COMMAND'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  select command into stored_command from public.business_operation_receipts where user_id=owner_id and event_key=event_id;
  if found then
    if stored_command<>p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  if p_expected_revision is distinct from coalesce((select revision from public.business_state_revisions where user_id=owner_id),0)
    then raise exception 'BUSINESS_REVISION_CONFLICT'; end if;
  original:=public.business_inventory_snapshot();
  if jsonb_typeof(p_state->'legacyOrders') is distinct from 'array' or jsonb_typeof(p_state->'orderItems') is distinct from 'array'
    then raise exception 'INVALID_ORDER_STATE'; end if;
  if command_kind in ('saveBusinessOrder','createProjectOrder') then
    target_id:=p_command#>>'{order,id}';
    if target_id is null or p_command#>>'{order,user_id}' is distinct from owner_id::text then raise exception 'INVALID_ORDER_OWNER'; end if;
    target_ids:=array[target_id];
  elsif command_kind in ('archiveBusinessOrders','restoreBusinessOrders') then
    if jsonb_typeof(p_command->'orderIds') is distinct from 'array' then raise exception 'INVALID_ORDER_IDS'; end if;
    select array_agg(value) into target_ids from jsonb_array_elements_text(p_command->'orderIds');
    target_ids:=coalesce(target_ids,array[]::text[]);
  else
    select source_order_id into target_id from public.order_items where id=(p_command->>'orderItemId')::uuid and user_id=owner_id;
    if target_id is null or coalesce((p_command->>'quantity')::integer,0)<=0 then raise exception 'INVALID_FINISHED_RETURN'; end if;
    target_ids:=array[target_id];
  end if;
  -- No unrelated catalog, project, purchase or dictionary changes in an order transaction.
  foreach target_id in array array['legacyProducts','manufacturers','materialTypes','materialLines','purchases','projects','calculationItems'] loop
    if p_state->target_id is distinct from original->target_id then raise exception 'ORDER_CHANGED_UNRELATED_STATE: %',target_id; end if;
  end loop;
  -- Every head remains present; archived orders retain their FK and financial history.
  if exists(select from jsonb_array_elements(original->'legacyOrders') old where not exists
      (select from jsonb_array_elements(p_state->'legacyOrders') incoming where incoming->>'id'=old->>'id'))
    or exists(select from jsonb_array_elements(p_state->'legacyOrders') incoming
      where incoming->>'user_id' is distinct from owner_id::text)
    or exists(select from jsonb_array_elements(p_state->'legacyOrders') incoming group by incoming->>'id' having count(*)>1)
    then raise exception 'INVALID_ORDER_HEADS'; end if;
  for head in select value from jsonb_array_elements(p_state->'legacyOrders') loop
    select value into original_head from jsonb_array_elements(original->'legacyOrders') where value->>'id'=head->>'id';
    if not (head->>'id'=any(target_ids)) then
      if head is distinct from original_head then raise exception 'ORDER_CHANGED_UNRELATED_HEAD'; end if;
      continue;
    end if;
    if coalesce(head->>'type','') not in ('income','expense')
      or coalesce(head->>'status','') not in ('Не в работе','Моделирование','Ждет печати','Печать','Ждет покраски','Покраска','Ждет отправки','Отправлен','Готово')
      or jsonb_typeof(head->'amount') is distinct from 'number' or (head->>'amount')::numeric<0
      or jsonb_typeof(head->'cost') is distinct from 'number' or (head->>'cost')::numeric<0
      or (head->>'payment' is not null and (jsonb_typeof(head->'payment')<>'number' or (head->>'payment')::numeric<0))
      or (head->>'agreed_price' is not null and (jsonb_typeof(head->'agreed_price')<>'number' or (head->>'agreed_price')::numeric<0))
      then raise exception 'INVALID_ORDER_FINANCIALS'; end if;
    if original_head is not null and head->>'type' is distinct from original_head->>'type'
      then raise exception 'ORDER_TYPE_IS_IMMUTABLE'; end if;
    if command_kind='saveBusinessOrder' then
      if (p_command->>'isNew')::boolean then
        if original_head is not null or coalesce((head->>'order_revision')::bigint,-1)<>0 then raise exception 'ORDER_ID_OCCUPIED'; end if;
      else
        if original_head is null or coalesce((original_head->>'order_revision')::bigint,0) is distinct from (p_command->>'expectedRevision')::bigint
          then raise exception 'BUSINESS_ORDER_REVISION_CONFLICT:%',head->>'id'; end if;
        if (head->>'order_revision')::bigint<>coalesce((original_head->>'order_revision')::bigint,0)+1
          then raise exception 'INVALID_ORDER_REVISION'; end if;
      end if;
      if (head-array['cost','quantity','order_revision','created_at','order_number','order_archived','items']) is distinct from
        ((p_command->'order')-array['cost','quantity','order_revision','created_at','order_number','order_archived','items'])
        then raise exception 'ORDER_HEAD_DOES_NOT_MATCH_COMMAND'; end if;
    elsif command_kind='createProjectOrder' then
      if original_head is not null or coalesce((head->>'order_revision')::bigint,0)<>0
        or head->>'type' is distinct from 'income' or head->>'status' is distinct from 'Не в работе'
        or not exists(select from public.calculation_projects where user_id=owner_id and id=(p_command#>>'{draft,projectId}')::uuid)
        then raise exception 'INVALID_PROJECT_ORDER'; end if;
      if jsonb_typeof(p_command#>'{draft,items}') is distinct from 'array'
        or jsonb_array_length(p_command#>'{draft,items}')=0
        or jsonb_array_length(p_command#>'{draft,items}')<>jsonb_array_length(p_command->'itemIds')
        or exists(select from jsonb_array_elements(p_command#>'{draft,items}') draft_item
          where not exists(select from public.calculation_items c where c.user_id=owner_id
            and c.id=(draft_item->>'calculation_item_id')::uuid
            and c.project_id=(p_command#>>'{draft,projectId}')::uuid))
        then raise exception 'INVALID_PROJECT_ORDER_ITEMS'; end if;
    elsif original_head is null then raise exception 'ORDER_NOT_FOUND';
    end if;
    if command_kind='restoreBusinessOrders' then
      if coalesce((original_head->>'order_revision')::bigint,0) is distinct from
        (p_command->'expectedRevisions'->>(head->>'id'))::bigint
        then raise exception 'BUSINESS_ORDER_REVISION_CONFLICT:%',head->>'id'; end if;
      if (head->>'order_revision')::bigint<>coalesce((original_head->>'order_revision')::bigint,0)+1
        then raise exception 'INVALID_ORDER_REVISION'; end if;
    end if;
    if command_kind='archiveBusinessOrders' and head->>'order_archived' is distinct from 'true'
      then raise exception 'INVALID_ORDER_ARCHIVE'; end if;
    if command_kind='returnOrderFinished' and (head-'order_revision') is distinct from (original_head-'order_revision')
      then raise exception 'RETURN_CHANGED_FINANCIAL_HISTORY'; end if;
    if head->>'type'='income' and exists(select from jsonb_array_elements(p_state->'orderItems') p
        where p->>'source_order_id'=head->>'id' and not coalesce((p->>'archived')::boolean,false)) then
      if abs((head->>'cost')::numeric-(select sum((p->>'total_cost')::numeric) from jsonb_array_elements(p_state->'orderItems') p
          where p->>'source_order_id'=head->>'id' and not coalesce((p->>'archived')::boolean,false)))>0.005
        then raise exception 'INVALID_ORDER_COST'; end if;
      if (head->>'quantity')::integer is distinct from (select sum((p->>'quantity')::integer)
        from jsonb_array_elements(p_state->'orderItems') p where p->>'source_order_id'=head->>'id' and not coalesce((p->>'archived')::boolean,false))
        then raise exception 'INVALID_ORDER_TOTAL_QUANTITY'; end if;
    end if;
    if exists(select from public.orders where id=(head->>'id')::uuid and user_id<>owner_id) then raise exception 'CROSS_OWNER_ID'; end if;
    if original_head is not null then
      head:=head||jsonb_build_object('created_at',original_head->'created_at','order_number',original_head->'order_number');
    else
      select coalesce(max(order_number),1000)+1 into new_number from public.orders where user_id=owner_id;
      head:=head||jsonb_build_object('order_number',new_number,'order_revision',0,'order_archived',false);
    end if;
    select string_agg(format('%I',a.attname),','),string_agg(format('%1$I=excluded.%1$I',a.attname),',') filter
      (where a.attname not in ('id','user_id','created_at','order_number')) into columns_list,assignments
      from pg_attribute a where a.attrelid='public.orders'::regclass and a.attnum>0 and not a.attisdropped;
    execute format('insert into public.orders(%s) select %s from jsonb_populate_record(null::public.orders,$1)
      on conflict(id) do update set %s where public.orders.user_id=excluded.user_id',columns_list,columns_list,assignments) using head;
  end loop;
  if exists(select from unnest(target_ids) required_id(value) where not exists(select from public.orders where user_id=owner_id and orders.id::text=required_id.value))
    then raise exception 'ORDER_NOT_FOUND'; end if;
  for item in select value from jsonb_array_elements(p_state->'orderItems') loop
    select value into old_item from jsonb_array_elements(original->'orderItems') where value->>'id'=item->>'id';
    if not (item->>'source_order_id'=any(target_ids)) then
      if item is distinct from old_item then raise exception 'ORDER_CHANGED_UNRELATED_ITEM'; end if;
      continue;
    end if;
    if old_item is not null and (item-array['unit_cost','total_cost','cost_provenance','fulfilled_quantity','production_quantity',
        'reserved_quantity','returned_quantity','archived']) is distinct from (old_item-array['unit_cost','total_cost','cost_provenance',
        'fulfilled_quantity','production_quantity','reserved_quantity','returned_quantity','archived'])
      then raise exception 'IMMUTABLE_ORDER_SNAPSHOT'; end if;
    if old_item is not null and coalesce((item->>'production_quantity')::integer,0)<coalesce((old_item->>'production_quantity')::integer,0)
      then raise exception 'PRODUCTION_CANNOT_BE_REVERSED'; end if;
    select coalesce(sum(p.quantity),0) into produced_delta
      from jsonb_populate_recordset(null::public.production_events,p_state->'productionEvents') p
      where p.order_item_id=(item->>'id')::uuid and not exists(select from public.production_events known where known.id=p.id);
    select coalesce(-sum(m.delta_quantity) filter(where m.source='order'),0),
        coalesce(sum(m.delta_quantity) filter(where m.source='finished_return'),0) into reserved_delta,returned_delta
      from jsonb_populate_recordset(null::public.finished_stock_movements,p_state->'finishedMovements') m
      where m.order_item_id=(item->>'id')::uuid and not exists(select from public.finished_stock_movements known where known.id=m.id);
    if (item->>'production_quantity')::integer<>coalesce((old_item->>'production_quantity')::integer,0)+produced_delta
      or coalesce((item->>'reserved_quantity')::integer,0)<>coalesce((old_item->>'reserved_quantity')::integer,0)+reserved_delta
      or (item->>'fulfilled_quantity')::integer<>coalesce((old_item->>'fulfilled_quantity')::integer,0)+produced_delta+reserved_delta
      or coalesce((item->>'returned_quantity')::integer,0)<>coalesce((old_item->>'returned_quantity')::integer,0)+returned_delta
      then raise exception 'ORDER_ALLOCATION_COUNTERS_DO_NOT_MATCH_LEDGER'; end if;
    if old_item is not null and coalesce((item->>'fulfilled_quantity')::integer,0)<=coalesce((old_item->>'fulfilled_quantity')::integer,0)
      and (item->'total_cost' is distinct from old_item->'total_cost' or item->'unit_cost' is distinct from old_item->'unit_cost'
        or item->'cost_provenance' is distinct from old_item->'cost_provenance')
      then raise exception 'IMMUTABLE_ORDER_ACTUAL_COST'; end if;
    if item->>'cost_provenance'<>'legacy' and (old_item is null or
      coalesce((item->>'fulfilled_quantity')::integer,0)>coalesce((old_item->>'fulfilled_quantity')::integer,0)) then
      select coalesce(-sum(m.delta_quantity*m.unit_cost),0) into actual_item_cost
        from jsonb_populate_recordset(null::public.finished_stock_movements,p_state->'finishedMovements') m
        where m.order_item_id=(item->>'id')::uuid and m.source='order';
      actual_item_cost:=actual_item_cost+coalesce((select sum(p.quantity*p.unit_cost)
        from jsonb_populate_recordset(null::public.production_events,p_state->'productionEvents') p
        where p.order_item_id=(item->>'id')::uuid),0)
        +((item->>'quantity')::integer-(item->>'fulfilled_quantity')::integer)
        *coalesce((item#>>'{snapshot,calculation,result,totalBaseCost}')::numeric,
          (item#>>'{snapshot,order,cost}')::numeric,(item->>'total_cost')::numeric)/(item->>'quantity')::integer;
      if abs(actual_item_cost-(item->>'total_cost')::numeric)>0.000001
        or abs((item->>'unit_cost')::numeric*(item->>'quantity')::integer-actual_item_cost)>0.000001
        then raise exception 'ORDER_ACTUAL_COST_LEDGER_MISMATCH'; end if;
    end if;
    if coalesce((item->>'reserved_quantity')::integer,0)>coalesce((item->>'fulfilled_quantity')::integer,0)
      or coalesce((item->>'returned_quantity')::integer,0)>coalesce((item->>'fulfilled_quantity')::integer,0)
      then raise exception 'INVALID_ORDER_ALLOCATION'; end if;
  end loop;
  if exists(select from jsonb_populate_recordset(null::public.finished_stock_movements,p_state->'finishedMovements') m
    where not exists(select from public.finished_stock_movements known where known.id=m.id)
      and (m.source not in ('order','finished_return') or not exists(select from jsonb_array_elements(p_state->'orderItems') p
        where p->>'source_order_id'=any(target_ids) and p->>'id'=m.order_item_id::text
          and p->>'product_id'=m.source_product_id)
        or (m.source='finished_return' and (command_kind<>'returnOrderFinished' or m.order_item_id::text<>p_command->>'orderItemId'))))
    then raise exception 'INVALID_ORDER_ALLOCATION_MOVEMENT'; end if;
  if command_kind='saveBusinessOrder' then
    if p_command ? 'items' then
      if jsonb_typeof(p_command->'items') is distinct from 'array' then raise exception 'INVALID_ORDER_DRAFT_ITEMS'; end if;
      if (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(p_state->'orderItems') p
        where p->>'source_order_id'=any(target_ids) and not coalesce((p->>'archived')::boolean,false)) is distinct from
        (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(p_command->'items') p)
        then raise exception 'ORDER_ITEMS_DO_NOT_MATCH_COMMAND'; end if;
      if exists(select from jsonb_array_elements(p_command->'items') draft_item where not exists
        (select from jsonb_array_elements(p_state->'orderItems') incoming where incoming->>'id'=draft_item->>'id'
          and (incoming-array['unit_cost','total_cost','cost_provenance','fulfilled_quantity','production_quantity',
            'reserved_quantity','returned_quantity','archived']) is not distinct from
          (draft_item-array['unit_cost','total_cost','cost_provenance','fulfilled_quantity','production_quantity',
            'reserved_quantity','returned_quantity','archived']))) then raise exception 'ORDER_DRAFT_SNAPSHOT_MISMATCH'; end if;
    elsif (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(p_state->'orderItems') p
      where p->>'source_order_id'=any(target_ids) and not coalesce((p->>'archived')::boolean,false)) is distinct from
      (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(original->'orderItems') p
        where p->>'source_order_id'=any(target_ids) and not coalesce((p->>'archived')::boolean,false))
      then raise exception 'METADATA_CHANGED_ORDER_ITEMS'; end if;
  end if;
  if command_kind='createProjectOrder' then
    if (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(p_state->'orderItems') p
      where p->>'source_order_id'=any(target_ids)) is distinct from
      (select coalesce(jsonb_agg(p order by p),'[]') from jsonb_array_elements_text(p_command->'itemIds') p)
      or exists(select from jsonb_array_elements(p_command#>'{draft,items}') with ordinality d(value,ordinal)
        where not exists(select from jsonb_array_elements(p_state->'orderItems') incoming
          where incoming->>'id'=p_command->'itemIds'->>(d.ordinal::integer-1)
            and incoming->'snapshot'=d.value->'snapshot' and incoming->'quantity'=d.value->'quantity'
            and incoming->'name'=d.value->'name' and incoming->'product_id'=d.value->'product_id'
            and incoming->'total_price'=d.value->'total_price' and incoming->'unit_price'=d.value->'unit_price'))
      then raise exception 'PROJECT_ORDER_ITEMS_DO_NOT_MATCH_COMMAND'; end if;
  end if;
  -- A printed position cannot be replaced by a new ID after rolling back status.
  if command_kind='saveBusinessOrder' and exists(select from jsonb_array_elements(original->'orderItems') old
    where old->>'source_order_id'=any(target_ids) and not coalesce((old->>'archived')::boolean,false)
      and ((old->>'production_quantity')::integer>0 or exists(select from public.finished_stock_movements m
        where m.user_id=owner_id and m.order_item_id=(old->>'id')::uuid
          and m.event_key like '%:fulfill:'||(old->>'id')))
      and exists(select from jsonb_array_elements(p_state->'orderItems') incoming
        where incoming->>'id'=old->>'id' and coalesce((incoming->>'archived')::boolean,false)))
    then raise exception 'PRINTED_ORDER_ITEMS_CANNOT_BE_REPLACED'; end if;
  if command_kind='saveBusinessOrder' and exists(select from jsonb_array_elements(original->'orderItems') old
    where old->>'source_order_id'=any(target_ids) and not coalesce((old->>'archived')::boolean,false)
      and ((old->>'production_quantity')::integer>0 or exists(select from public.finished_stock_movements m
        where m.user_id=owner_id and m.order_item_id=(old->>'id')::uuid
          and m.event_key like '%:fulfill:'||(old->>'id'))))
    and (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(p_state->'orderItems') p
      where p->>'source_order_id'=any(target_ids) and not coalesce((p->>'archived')::boolean,false)) is distinct from
      (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(original->'orderItems') p
        where p->>'source_order_id'=any(target_ids) and not coalesce((p->>'archived')::boolean,false))
    then raise exception 'PRINTED_ORDER_ITEMS_CANNOT_BE_REPLACED'; end if;
  if command_kind='returnOrderFinished' then
    select value into item from jsonb_array_elements(p_state->'orderItems') where value->>'id'=p_command->>'orderItemId';
    select value into old_item from jsonb_array_elements(original->'orderItems') where value->>'id'=p_command->>'orderItemId';
    if item is null or old_item is null or item->>'product_id' is null
      or coalesce((item->>'returned_quantity')::integer,0)-coalesce((old_item->>'returned_quantity')::integer,0)
        is distinct from (p_command->>'quantity')::integer
      or (item-array['returned_quantity']) is distinct from (old_item-array['returned_quantity'])
      then raise exception 'INVALID_FINISHED_RETURN'; end if;
    if coalesce((select sum(m.delta_quantity) from jsonb_populate_recordset(null::public.finished_stock_movements,p_state->'finishedMovements') m
      where m.order_item_id=(p_command->>'orderItemId')::uuid and m.source='finished_return'
        and not exists(select from public.finished_stock_movements known where known.id=m.id)),0)
      is distinct from (p_command->>'quantity')::integer then raise exception 'INVALID_FINISHED_RETURN_MOVEMENT'; end if;
  end if;
  -- Replay only the new movements to verify their historical/weighted basis.
  for stock_balance in select value from jsonb_array_elements(p_state->'finishedBalances') loop
    select coalesce((b->>'quantity')::integer,0),coalesce((b->>'average_unit_cost')::numeric,0)
      into stock_quantity,stock_average from jsonb_array_elements(original->'finishedBalances') b
      where b->>'source_product_id'=stock_balance->>'source_product_id';
    stock_quantity:=coalesce(stock_quantity,0); stock_average:=coalesce(stock_average,0);
    for stock_movement in select value from jsonb_array_elements(p_state->'finishedMovements') m
      where m->>'source_product_id'=stock_balance->>'source_product_id'
        and not exists(select from public.finished_stock_movements known where known.id=(m->>'id')::uuid) loop
      if stock_movement->>'event_key' is distinct from event_id
        and left(stock_movement->>'event_key',length(event_id)+1) is distinct from event_id||':'
        then raise exception 'ORDER_MOVEMENT_DOES_NOT_MATCH_COMMAND'; end if;
      if (stock_movement->>'delta_quantity')::integer<0 then
        if -(stock_movement->>'delta_quantity')::integer>stock_quantity
          or abs((stock_movement->>'unit_cost')::numeric-stock_average)>0.000001
          then raise exception 'ORDER_RESERVE_BASIS_MISMATCH'; end if;
      elsif (stock_movement->>'delta_quantity')::integer>0 then
        select value into old_item from jsonb_array_elements(original->'orderItems') i where i->>'id'=stock_movement->>'order_item_id';
        if old_item is null or (old_item->>'fulfilled_quantity')::integer<=0 then raise exception 'INVALID_RETURN_ALLOCATION'; end if;
        select coalesce(-sum(m.delta_quantity*m.unit_cost),0) into return_basis
          from jsonb_populate_recordset(null::public.finished_stock_movements,original->'finishedMovements') m
          where m.order_item_id=(old_item->>'id')::uuid and m.source='order';
        return_basis:=return_basis+coalesce((select sum(p.quantity*p.unit_cost)
          from jsonb_populate_recordset(null::public.production_events,original->'productionEvents') p
          where p.order_item_id=(old_item->>'id')::uuid),0);
        if not exists(select from public.finished_stock_movements m where m.user_id=owner_id and m.order_item_id=(old_item->>'id')::uuid and m.source='order')
          and not exists(select from public.production_events p where p.user_id=owner_id and p.order_item_id=(old_item->>'id')::uuid)
          then return_basis:=(old_item->>'total_cost')::numeric; end if;
        return_basis:=return_basis/(old_item->>'fulfilled_quantity')::integer;
        if abs((stock_movement->>'unit_cost')::numeric-return_basis)>0.000001 then raise exception 'ORDER_RETURN_BASIS_MISMATCH'; end if;
        stock_average:=(stock_quantity*stock_average+(stock_movement->>'delta_quantity')::integer*return_basis)
          /(stock_quantity+(stock_movement->>'delta_quantity')::integer);
      end if;
      stock_quantity:=stock_quantity+(stock_movement->>'delta_quantity')::integer;
      if (stock_movement->>'balance_after')::integer<>stock_quantity then raise exception 'ORDER_MOVEMENT_BALANCE_MISMATCH'; end if;
    end loop;
    if (stock_balance->>'quantity')::integer<>stock_quantity
      or abs((stock_balance->>'average_unit_cost')::numeric-stock_average)>0.000001
      then raise exception 'ORDER_FINISHED_BASIS_MISMATCH'; end if;
  end loop;
  -- Allocation cannot create or erase on-hand inventory without immutable movements.
  if exists(select from jsonb_populate_recordset(null::public.finished_stock_balances,p_state->'finishedBalances') incoming
    left join public.finished_stock_balances old on old.id=incoming.id and old.user_id=owner_id
    where incoming.quantity<>coalesce(old.quantity,0)+coalesce((select sum(m.delta_quantity)
      from jsonb_populate_recordset(null::public.finished_stock_movements,p_state->'finishedMovements') m
      where m.user_id=owner_id and m.source_product_id=incoming.source_product_id
        and not exists(select from public.finished_stock_movements known where known.id=m.id)),0))
    then raise exception 'ORDER_FINISHED_LEDGER_MISMATCH'; end if;
  if exists(select from jsonb_populate_recordset(null::public.filament_variants,p_state->'variants') incoming
    join public.filament_variants old on old.id=incoming.id and old.user_id=owner_id
    where abs(incoming.stock_g-old.stock_g-coalesce((select sum(m.delta_g)
      from jsonb_populate_recordset(null::public.filament_movements,p_state->'filamentMovements') m
      where m.user_id=owner_id and m.variant_id=incoming.id
        and not exists(select from public.filament_movements known where known.id=m.id)),0))>0.000001
      or incoming.average_cost_per_g<>old.average_cost_per_g)
    then raise exception 'ORDER_MATERIAL_LEDGER_MISMATCH'; end if;
  if exists(select from jsonb_populate_recordset(null::public.production_events,p_state->'productionEvents') incoming
    where not exists(select from public.production_events old where old.id=incoming.id)
      and not exists(select from jsonb_array_elements(p_state->'orderItems') p
        where p->>'id'=incoming.order_item_id::text and p->>'source_order_id'=any(target_ids)))
    then raise exception 'ORDER_PRODUCTION_SOURCE_MISMATCH'; end if;
  for production in select value from jsonb_array_elements(p_state->'productionEvents') p
    where not exists(select from public.production_events known where known.id=(p->>'id')::uuid) loop
    select value into item from jsonb_array_elements(p_state->'orderItems') where value->>'id'=production->>'order_item_id';
    select value into head from jsonb_array_elements(p_state->'legacyOrders') where value->>'id'=item->>'source_order_id';
    if command_kind<>'saveBusinessOrder' or head->>'status' not in
      ('Печать','Ждет покраски','Покраска','Ждет отправки','Отправлен','Готово')
      or production->'recipe_snapshot' is distinct from item#>'{snapshot,recipe}'
      or production->'product_id' is distinct from item->'product_id'
      then raise exception 'INVALID_ORDER_PRODUCTION'; end if;
    current_cost:=(production#>>'{recipe_snapshot,non_material_unit_cost}')::numeric;
    for material in select jsonb_build_object('variant_id',m->>'variant_id',
        'grams_per_unit',sum(round((m->>'grams_per_unit')::numeric,6)))
      from jsonb_array_elements(production#>'{recipe_snapshot,materials}') m group by m->>'variant_id' loop
      required_grams:=(material->>'grams_per_unit')::numeric*(production->>'quantity')::integer;
      select coalesce(-sum(delta_g),0) into accounted_grams
        from jsonb_populate_recordset(null::public.filament_movements,p_state->'filamentMovements')
        where source_id=production->>'id' and variant_id=(material->>'variant_id')::uuid;
      accounted_grams:=accounted_grams+coalesce((select sum(grams)
        from jsonb_populate_recordset(null::public.filament_deficits,p_state->'deficits')
        where source_id=production->>'id' and variant_id=(material->>'variant_id')::uuid),0);
      if abs(required_grams-accounted_grams)>0.000001 then raise exception 'ORDER_PRODUCTION_GRAMS_MISMATCH'; end if;
      current_cost:=current_cost+(material->>'grams_per_unit')::numeric*
        (select average_cost_per_g from public.filament_variants where id=(material->>'variant_id')::uuid and user_id=owner_id);
    end loop;
    if current_cost is null or abs(current_cost-(production->>'unit_cost')::numeric)>0.000001
      then raise exception 'ORDER_PRODUCTION_COST_MISMATCH'; end if;
  end loop;
  -- Reuses ownership/FK/finite checks, append-only audit and receipt in the same transaction.
  return public.business_commit_inventory_internal(p_expected_revision,p_command,p_state);
end $$;
revoke all on function public.business_apply_order(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.business_apply_order(bigint,jsonb,jsonb) to authenticated;

-- Pending pre-upgrade single-product commands must also accept a shortage.
-- The public compatibility wrapper from phase 2 supplies the same owner lock and ledger context.
create or replace function public.legacy_save_order_with_inventory_unlocked(p_order jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  owner_id uuid:=auth.uid();
  target_order_id uuid:=coalesce(nullif(p_order->>'id','')::uuid,gen_random_uuid());
  old_head public.orders%rowtype;
  product_id uuid:=nullif(p_order->>'product_id','')::uuid;
  requested integer:=coalesce((p_order->>'quantity')::integer,1);
  reserved integer:=0;
  head jsonb;
  saved jsonb;
  columns_list text;
  assignments text;
  next_number bigint;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  select * into old_head from public.orders where id=target_order_id and user_id=owner_id for update;
  if exists(select from public.orders where id=target_order_id and user_id<>owner_id) then raise exception 'CROSS_OWNER_ID'; end if;
  if old_head.order_archived or exists(select from public.order_items where user_id=owner_id
    and source_order_id=target_order_id::text and cost_provenance<>'legacy') then
    raise exception 'ORDER_REQUIRES_ATOMIC_ITEM_API';
  end if;
  if old_head.id is not null and (old_head.type is distinct from p_order->>'type' or old_head.product_id is distinct from product_id
    or old_head.quantity is distinct from requested) then raise exception 'ORDER_ITEM_EDIT_REQUIRES_ATOMIC_API'; end if;
  if old_head.id is null and p_order->>'type'='income' and product_id is not null then
    if requested<=0 then raise exception 'INVALID_ORDER_QUANTITY'; end if;
    select least(coalesce(stock_quantity,0),requested) into reserved from public.saved_calculations
      where id=product_id and user_id=owner_id for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
    update public.saved_calculations set stock_quantity=greatest(0,coalesce(stock_quantity,0)-reserved)
      where id=product_id and user_id=owner_id;
  end if;
  -- Metadata/payment changes do not return/re-reserve old inventory or revalue it.
  if old_head.id is not null then
    next_number:=old_head.order_number;
  else
    select coalesce(max(order_number),1000)+1 into next_number from public.orders where user_id=owner_id;
  end if;
  head:=(coalesce(to_jsonb(old_head),'{}'::jsonb)||p_order)-'items';
  head:=head||jsonb_build_object('id',target_order_id,'user_id',owner_id,'order_number',next_number,
    'created_at',coalesce(old_head.created_at,nullif(p_order->>'created_at','')::timestamptz,now()),
    'order_revision',case when old_head.id is null then 0 else old_head.order_revision+1 end,
    'cost',coalesce(old_head.cost,nullif(p_order->>'cost','')::numeric,0),
    'order_archived',false,'payment',coalesce(nullif(p_order->>'payment','')::numeric,old_head.payment,0),
    'payments',coalesce(p_order->'payments',to_jsonb(old_head.payments),'[]'::jsonb));
  select string_agg(format('%I',a.attname),','),string_agg(format('%1$I=excluded.%1$I',a.attname),',') filter
    (where a.attname not in ('id','user_id','created_at','order_number')) into columns_list,assignments
    from pg_attribute a where a.attrelid='public.orders'::regclass and a.attnum>0 and not a.attisdropped;
  execute format('insert into public.orders(%s) select %s from jsonb_populate_record(null::public.orders,$1)
    on conflict(id) do update set %s where public.orders.user_id=excluded.user_id',columns_list,columns_list,assignments) using head;
  select to_jsonb(o) into saved from public.orders o where id=target_order_id and user_id=owner_id;
  if saved->>'type'='income' and requested>0 and not exists(select from public.order_items
      where user_id=owner_id and source_order_id=target_order_id::text) then
    insert into public.order_items(id,user_id,order_id,source_order_id,product_id,name,quantity,
      unit_cost,total_cost,unit_price,total_price,cost_provenance,fulfilled_quantity,production_quantity,
      snapshot,legacy_key,reserved_quantity,returned_quantity,archived)
    values(target_order_id,owner_id,target_order_id,target_order_id::text,product_id,coalesce(saved->>'title','Order'),requested,
      (saved->>'cost')::numeric/requested,(saved->>'cost')::numeric,
      (saved->>'amount')::numeric/requested,(saved->>'amount')::numeric,'legacy',reserved,0,
      jsonb_build_object('version',1,'order',saved,'calculation',null,'recipe',null),target_order_id::text,reserved,0,false);
  end if;
  return saved;
end $$;
revoke all on function public.legacy_save_order_with_inventory_unlocked(jsonb) from public,anon,authenticated;

-- Compatibility deletion also retains parents/audit and releases only the actual
-- preprint reserve. Modern snapshots must use the revisioned atomic API.
create or replace function public.legacy_delete_orders_atomic_unlocked(p_ids uuid[])
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  owner_id uuid:=auth.uid();
  old_head public.orders%rowtype;
  item public.order_items%rowtype;
  released integer;
  changed integer:=0;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  for old_head in select * from public.orders where user_id=owner_id and id=any(p_ids) and not order_archived for update loop
    if exists(select from public.order_items where user_id=owner_id and source_order_id=old_head.id::text
      and cost_provenance<>'legacy') then raise exception 'ORDER_REQUIRES_ATOMIC_ITEM_API'; end if;
    for item in select * from public.order_items where user_id=owner_id and source_order_id=old_head.id::text and not coalesce(archived,false) loop
      released:=greatest(0,coalesce(item.reserved_quantity,0)-coalesce(item.returned_quantity,0));
      if old_head.status in ('Не в работе','Моделирование','Ждет печати') and item.production_quantity=0
        and released>0 and item.product_id is not null then
        update public.saved_calculations set stock_quantity=coalesce(stock_quantity,0)+released
          where id=item.product_id and user_id=owner_id;
        update public.order_items set returned_quantity=coalesce(returned_quantity,0)+released where id=item.id;
      end if;
      update public.order_items set archived=true where id=item.id;
    end loop;
    update public.orders set order_archived=true,order_revision=order_revision+1 where id=old_head.id;
    changed:=changed+1;
  end loop;
  return changed;
end $$;
revoke all on function public.legacy_delete_orders_atomic_unlocked(uuid[]) from public,anon,authenticated;
commit;
