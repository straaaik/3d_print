-- Phase 3: create a project order head and all position snapshots in one transaction.
-- Apply after foundation, inventory transactions, legacy bridge and calculation projects.
begin;
alter table public.orders add column if not exists agreed_price numeric(20,6)
  check (agreed_price >= 0 and agreed_price <> 'NaN'::numeric);
create or replace function public.business_create_project_order(p_expected_revision bigint, p_command jsonb, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  event_id text := p_command->>'id';
  head jsonb := p_command->'order';
  order_id uuid := (head->>'id')::uuid;
  stored_command jsonb;
  incoming jsonb;
  declared_item jsonb;
  position integer := 0;
  item_cost numeric := 0;
  item_quantity bigint := 0;
  item_count integer := 0;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_command->>'kind' is distinct from 'createProjectOrder' or event_id is null
    or length(event_id) not between 1 and 160 or p_state->>'user_id' is distinct from owner_id::text
    or head->>'user_id' is distinct from owner_id::text then raise exception 'INVALID_PROJECT_ORDER'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:' || owner_id::text, 0));
  select command into stored_command from public.business_operation_receipts where user_id=owner_id and event_key=event_id;
  if found then
    if stored_command <> p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  if p_expected_revision is distinct from coalesce((select revision from public.business_state_revisions where user_id=owner_id),0)
    then raise exception 'BUSINESS_REVISION_CONFLICT'; end if;
  if order_id is null or exists(select from public.orders where id=order_id)
    or head->>'type' is distinct from 'income' or nullif(head->>'product_id','') is not null
    or head->>'status' is distinct from 'Не в работе'
    or jsonb_typeof(p_command->'itemIds') is distinct from 'array'
    or jsonb_typeof(p_command#>'{draft,items}') is distinct from 'array'
    or jsonb_array_length(p_command->'itemIds')=0
    or jsonb_array_length(p_command->'itemIds')<>jsonb_array_length(p_command#>'{draft,items}')
    then raise exception 'INVALID_PROJECT_ORDER'; end if;
  for declared_item in select value from jsonb_array_elements(p_command#>'{draft,items}') loop
    select value into incoming from jsonb_array_elements(p_state->'orderItems')
      where value->>'id'=p_command->'itemIds'->>position;
    if incoming is null or incoming->>'user_id' is distinct from owner_id::text
      or incoming->>'order_id' is distinct from order_id::text
      or incoming->>'source_order_id' is distinct from order_id::text
      or incoming->>'name' is distinct from declared_item->>'name'
      or incoming->>'quantity' is distinct from declared_item->>'quantity'
      or incoming->'snapshot' is distinct from declared_item->'snapshot'
      or incoming->>'cost_provenance' is distinct from 'estimate'
      or incoming->>'fulfilled_quantity' is distinct from '0'
      or incoming->>'production_quantity' is distinct from '0'
      or exists(select from public.order_items where id=(incoming->>'id')::uuid)
      or not exists(select from public.calculation_items where id=(declared_item->>'calculation_item_id')::uuid
        and user_id=owner_id and project_id=(p_command#>>'{draft,projectId}')::uuid)
      then raise exception 'INVALID_PROJECT_ORDER_ITEM'; end if;
    item_cost := item_cost + (incoming->>'total_cost')::numeric;
    item_quantity := item_quantity + (incoming->>'quantity')::integer;
    item_count := item_count + 1;
    position := position + 1;
  end loop;
  if item_cost is distinct from (head->>'cost')::numeric or item_quantity is distinct from (head->>'quantity')::bigint
    or item_count<>(select count(*) from jsonb_array_elements(p_state->'orderItems') where value->>'source_order_id'=order_id::text)
    then raise exception 'INVALID_PROJECT_ORDER_TOTAL'; end if;
  -- No product_id on the legacy head: reservation/production belongs to the separate positions.
  perform public.save_order_with_inventory(head);
  update public.orders set agreed_price=nullif(head->>'agreed_price','')::numeric where id=order_id and user_id=owner_id;
  -- FK/ownership/finite constraints and receipt are checked by the same transactional writer.
  return public.commit_business_inventory(p_expected_revision,p_command,p_state);
end $$;
revoke all on function public.business_create_project_order(bigint,jsonb,jsonb) from public, anon;
grant execute on function public.business_create_project_order(bigint,jsonb,jsonb) to authenticated;
commit;
