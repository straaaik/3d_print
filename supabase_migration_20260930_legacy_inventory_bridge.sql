-- Stage 2 compatibility bridge. Apply after the business foundation and inventory
-- transaction migrations. Keep legacy order RPCs usable until stage 5 replaces them.
begin;

create or replace function public.legacy_stock_inventory_bridge()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := new.user_id;
  old_stock integer := coalesce(old.stock_quantity, 0);
  new_stock integer := coalesce(new.stock_quantity, 0);
  balance public.finished_stock_balances%rowtype;
  event_id uuid;
  order_id text := nullif(pg_catalog.current_setting('business_inventory.legacy_order_id', true), '');
  command_id text := nullif(pg_catalog.current_setting('business_inventory.legacy_command_id', true), '');
  movement_cost numeric;
  movement_key text;
begin
  if owner_id is null or old.user_id is distinct from owner_id then
    raise exception 'LEGACY_INVENTORY_OWNER_CHANGED';
  end if;
  if old_stock = new_stock then return new; end if;
  -- The original save returns and reserves even an unchanged reservation.
  -- Ignore those temporary writes: only its final legacy projection matters.
  if pg_catalog.current_setting('business_inventory.legacy_skip_bridge', true) = 'on' then
    return new;
  end if;

  -- Known order RPC wrappers take this lock before their first row lock. The
  -- transaction RPC holds it already when it writes its legacy projection.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
  select * into balance from public.finished_stock_balances
    where user_id = owner_id and source_product_id = new.id::text for update;
  if not found then
    -- A product made by the old editor may not have an opening balance yet.
    insert into public.finished_stock_balances(
      user_id, product_id, source_product_id, quantity, average_unit_cost)
    values (owner_id, new.id, new.id::text, old_stock,
      coalesce(pg_catalog.round((old.base_cost / nullif(old.quantity, 0))::numeric, 8), 0))
    returning * into balance;
  end if;

  -- commit_business_inventory has already written the authoritative ledger.
  -- Its following saved_calculations update must not create a second movement
  -- or increment the revision again.
  if balance.quantity = new_stock then return new; end if;
  if balance.quantity <> old_stock then
    raise exception 'LEGACY_INVENTORY_STALE' using hint = 'Reload inventory before changing legacy stock';
  end if;

  movement_cost := balance.average_unit_cost;
  if order_id is not null and new_stock > old_stock then
    select m.unit_cost into movement_cost from public.finished_stock_movements m
      where m.user_id = owner_id and m.source_product_id = new.id::text
        and m.source = 'order' and m.delta_quantity < 0
        and m.event_key like 'legacy-order:' || order_id || ':%'
      order by m.created_at desc, m.id desc limit 1;
    -- Historical orders predate the immutable reservation ledger. Their actual
    -- basis cannot be reconstructed; explicitly retain current average cost.
    movement_cost := coalesce(movement_cost, balance.average_unit_cost);
  end if;
  update public.finished_stock_balances
    set quantity = new_stock, revision = revision + 1,
      average_unit_cost = case when new_stock > old_stock then
        pg_catalog.round((old_stock * balance.average_unit_cost
          + (new_stock - old_stock) * movement_cost) / new_stock, 8)
        else balance.average_unit_cost end
    where id = balance.id and user_id = owner_id;
  event_id := pg_catalog.gen_random_uuid();
  movement_key := case when order_id is null then 'legacy-stock:' || event_id::text
    else 'legacy-order:' || order_id || ':' || coalesce(command_id, event_id::text)
      || case when new_stock > old_stock then ':release' else ':reserve' end end;
  insert into public.finished_stock_movements(
    user_id, product_id, source_product_id, event_key, source, created_at,
    delta_quantity, unit_cost, balance_after)
  values (owner_id, new.id, new.id::text, movement_key,
    case when order_id is null then 'manual_adjustment' else 'order' end,
    pg_catalog.clock_timestamp(), new_stock - old_stock, movement_cost, new_stock);
  insert into public.business_state_revisions(user_id, revision) values (owner_id, 1)
    on conflict (user_id) do update
      set revision = public.business_state_revisions.revision + 1;
  return new;
end $$;

revoke all on function public.legacy_stock_inventory_bridge() from public, anon, authenticated;
drop trigger if exists legacy_stock_inventory_bridge on public.saved_calculations;
create trigger legacy_stock_inventory_bridge
  after update of stock_quantity on public.saved_calculations
  for each row when (old.stock_quantity is distinct from new.stock_quantity)
  execute function public.legacy_stock_inventory_bridge();

create or replace function public.legacy_inventory_has_rows(p_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.filament_manufacturers where user_id = p_owner)
    or exists(select 1 from public.material_types where user_id = p_owner)
    or exists(select 1 from public.material_lines where user_id = p_owner)
    or exists(select 1 from public.filament_variants where user_id = p_owner)
    or exists(select 1 from public.filament_purchases where user_id = p_owner)
    or exists(select 1 from public.filament_movements where user_id = p_owner)
    or exists(select 1 from public.filament_deficits where user_id = p_owner)
    or exists(select 1 from public.calculation_projects where user_id = p_owner)
    or exists(select 1 from public.calculation_items where user_id = p_owner)
    or exists(select 1 from public.order_items where user_id = p_owner)
    or exists(select 1 from public.production_events where user_id = p_owner)
    or exists(select 1 from public.finished_stock_balances where user_id = p_owner)
    or exists(select 1 from public.finished_stock_movements where user_id = p_owner)
$$;
revoke all on function public.legacy_inventory_has_rows(uuid) from public, anon, authenticated;

-- Preserve the existing implementations. Guarded renames make the migration
-- repeatable and leave installations without optional legacy RPCs untouched.
do $rename$
declare
  pair text[];
begin
  foreach pair slice 1 in array array[
    array['save_order_with_inventory(jsonb)', 'legacy_save_order_with_inventory_unlocked'],
    array['delete_orders_atomic(uuid[])', 'legacy_delete_orders_atomic_unlocked'],
    array['restore_orders_snapshot(jsonb)', 'legacy_restore_orders_snapshot_unlocked'],
    array['restore_saved_calculations_snapshot(jsonb)', 'legacy_restore_saved_calculations_snapshot_unlocked'],
    array['restore_database_snapshot(jsonb)', 'legacy_restore_database_snapshot_unlocked'],
    array['business_inventory_snapshot()', 'legacy_business_inventory_snapshot_without_orders']
  ] loop
    if pg_catalog.to_regprocedure('public.' || pair[2] || substring(pair[1] from pg_catalog.strpos(pair[1], '('))) is null
       and pg_catalog.to_regprocedure('public.' || pair[1]) is not null then
      execute format('alter function public.%s rename to %I', pair[1], pair[2]);
    end if;
    if pg_catalog.to_regprocedure('public.' || pair[2] || substring(pair[1] from pg_catalog.strpos(pair[1], '('))) is not null then
      execute format('revoke all on function public.%s from public, anon, authenticated',
        pair[2] || substring(pair[1] from pg_catalog.strpos(pair[1], '(')));
    end if;
  end loop;
end $rename$;

-- The wrapper's owner lock precedes the row locks in the original functions.
do $wrappers$
begin
  if pg_catalog.to_regprocedure('public.legacy_business_inventory_snapshot_without_orders()') is not null then
    execute $create$create or replace function public.business_inventory_snapshot()
    returns jsonb language plpgsql security definer set search_path = '' as $body$
    declare owner_id uuid := auth.uid(); result jsonb;
    begin
      if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
      result := public.legacy_business_inventory_snapshot_without_orders();
      return result || pg_catalog.jsonb_build_object('legacyOrders',
        (select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(o) order by o.created_at, o.id), '[]'::jsonb)
         from public.orders o where o.user_id = owner_id),
        'legacyProducts',
        (select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) order by p.id), '[]'::jsonb)
         from public.saved_calculations p where p.user_id = owner_id));
    end $body$$create$;
    execute 'revoke all on function public.business_inventory_snapshot() from public, anon';
    execute 'grant execute on function public.business_inventory_snapshot() to authenticated';
  end if;
  if pg_catalog.to_regprocedure('public.legacy_save_order_with_inventory_unlocked(jsonb)') is not null then
    execute $create$create or replace function public.save_order_with_inventory(p_order jsonb)
    returns jsonb language plpgsql security definer set search_path = '' as $body$
    declare
      owner_id uuid := auth.uid(); order_id uuid; old_order public.orders%rowtype; result jsonb;
      previous_order text := coalesce(pg_catalog.current_setting('business_inventory.legacy_order_id', true), '');
      previous_skip text := coalesce(pg_catalog.current_setting('business_inventory.legacy_skip_bridge', true), '');
    begin
      if owner_id is null then raise exception 'UNAUTHENTICATED'; end if;
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
      begin order_id := nullif(p_order->>'id', '')::uuid;
      exception when invalid_text_representation then order_id := null; end;
      order_id := coalesce(order_id, pg_catalog.gen_random_uuid());
      select * into old_order from public.orders where id = order_id and user_id = owner_id for update;
      perform pg_catalog.set_config('business_inventory.legacy_order_id', order_id::text, true);
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge',
        case when old_order.id is not null
          and old_order.type is not distinct from p_order->>'type'
          and old_order.product_id is not distinct from nullif(p_order->>'product_id', '')::uuid
          and coalesce(old_order.quantity, 0) = coalesce((p_order->>'quantity')::numeric, 0)
          then 'on' else '' end, true);
      result := public.legacy_save_order_with_inventory_unlocked(
        p_order || pg_catalog.jsonb_build_object('id', order_id));
      perform pg_catalog.set_config('business_inventory.legacy_order_id', previous_order, true);
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge', previous_skip, true);
      return result;
    exception when others then
      perform pg_catalog.set_config('business_inventory.legacy_order_id', previous_order, true);
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge', previous_skip, true);
      raise;
    end $body$$create$;
    execute 'revoke all on function public.save_order_with_inventory(jsonb) from public, anon';
    execute 'grant execute on function public.save_order_with_inventory(jsonb) to authenticated';
  end if;
  if pg_catalog.to_regprocedure('public.legacy_delete_orders_atomic_unlocked(uuid[])') is not null then
    execute $create$create or replace function public.delete_orders_atomic(p_ids uuid[])
    returns integer language plpgsql security definer set search_path = '' as $body$
    declare
      owner_id uuid := auth.uid(); order_id uuid; deleted integer := 0;
      previous_order text := coalesce(pg_catalog.current_setting('business_inventory.legacy_order_id', true), '');
      previous_skip text := coalesce(pg_catalog.current_setting('business_inventory.legacy_skip_bridge', true), '');
    begin
      if owner_id is null then raise exception 'UNAUTHENTICATED'; end if;
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge', '', true);
      -- One order at a time identifies each return's reservation basis; the
      -- encompassing transaction and owner lock still make the batch atomic.
      for order_id in select o.id from public.orders o
        where o.user_id = owner_id and o.id = any(p_ids) order by o.id for update
      loop
        perform pg_catalog.set_config('business_inventory.legacy_order_id', order_id::text, true);
        deleted := deleted + public.legacy_delete_orders_atomic_unlocked(array[order_id]);
      end loop;
      perform pg_catalog.set_config('business_inventory.legacy_order_id', previous_order, true);
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge', previous_skip, true);
      return deleted;
    exception when others then
      perform pg_catalog.set_config('business_inventory.legacy_order_id', previous_order, true);
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge', previous_skip, true);
      raise;
    end $body$$create$;
    execute 'revoke all on function public.delete_orders_atomic(uuid[]) from public, anon';
    execute 'grant execute on function public.delete_orders_atomic(uuid[]) to authenticated';
  end if;
  if pg_catalog.to_regprocedure('public.legacy_restore_orders_snapshot_unlocked(jsonb)') is not null then
    execute $create$create or replace function public.restore_orders_snapshot(p_orders jsonb)
    returns integer language plpgsql security definer set search_path = '' as $body$
    declare owner_id uuid := auth.uid(); item jsonb; removed_ids uuid[]; restored integer := 0;
    begin
      if owner_id is null then raise exception 'UNAUTHENTICATED'; end if;
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
      if pg_catalog.jsonb_typeof(p_orders) is distinct from 'array' then raise exception 'INVALID_ORDER_SNAPSHOT'; end if;
      -- Release missing/changed reservations before adding any new ones. Keep
      -- unchanged reservations (and their immutable basis) for financial edits.
      select coalesce(array_agg(o.id), array[]::uuid[]) into removed_ids
      from public.orders o where o.user_id = owner_id and not exists (
        select 1 from pg_catalog.jsonb_array_elements(p_orders) incoming(item)
        where nullif(incoming.item->>'id', '')::uuid = o.id
          and o.type is not distinct from incoming.item->>'type'
          and o.product_id is not distinct from nullif(incoming.item->>'product_id', '')::uuid
          and coalesce(o.quantity, 0) = coalesce((incoming.item->>'quantity')::numeric, 0));
      perform public.delete_orders_atomic(removed_ids);
      for item in select value from pg_catalog.jsonb_array_elements(p_orders) loop
        perform public.save_order_with_inventory(item);
        restored := restored + 1;
      end loop;
      return restored;
    end $body$$create$;
    execute 'revoke all on function public.restore_orders_snapshot(jsonb) from public, anon';
    execute 'grant execute on function public.restore_orders_snapshot(jsonb) to authenticated';
  end if;
  if pg_catalog.to_regprocedure('public.legacy_restore_saved_calculations_snapshot_unlocked(jsonb)') is not null then
    execute $create$create or replace function public.restore_saved_calculations_snapshot(p_items jsonb)
    returns integer language plpgsql security definer set search_path = '' as $body$
    declare owner_id uuid := auth.uid();
    begin
      if owner_id is null then raise exception 'UNAUTHENTICATED'; end if;
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
      if public.legacy_inventory_has_rows(owner_id) then raise exception 'FOUNDATION_INVENTORY_RESTORE_BLOCKED'; end if;
      return public.legacy_restore_saved_calculations_snapshot_unlocked(p_items);
    end $body$$create$;
    execute 'revoke all on function public.restore_saved_calculations_snapshot(jsonb) from public, anon';
    execute 'grant execute on function public.restore_saved_calculations_snapshot(jsonb) to authenticated';
  end if;
  if pg_catalog.to_regprocedure('public.legacy_restore_database_snapshot_unlocked(jsonb)') is not null then
    execute $create$create or replace function public.restore_database_snapshot(p_snapshot jsonb)
    returns void language plpgsql security definer set search_path = '' as $body$
    declare owner_id uuid := auth.uid();
    begin
      if owner_id is null then raise exception 'UNAUTHENTICATED'; end if;
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
      if public.legacy_inventory_has_rows(owner_id) then raise exception 'FOUNDATION_INVENTORY_RESTORE_BLOCKED'; end if;
      perform public.legacy_restore_database_snapshot_unlocked(p_snapshot);
    end $body$$create$;
    execute 'revoke all on function public.restore_database_snapshot(jsonb) from public, anon';
    execute 'grant execute on function public.restore_database_snapshot(jsonb) to authenticated';
  end if;
end $wrappers$;

-- Route offline-queued legacy order operations through the same owner lock,
-- revision and idempotency receipts as inventory commands. Legacy functions
-- still own their original business semantics (including insufficient stock).
create or replace function public.business_apply_legacy_order(p_command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  event_id text := p_command->>'id';
  operation_kind text := p_command->>'kind';
  stored_command jsonb;
  previous_revision bigint;
  current_revision bigint;
  order_ids uuid[];
  previous_command text := coalesce(pg_catalog.current_setting('business_inventory.legacy_command_id', true), '');
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if pg_catalog.jsonb_typeof(p_command) is distinct from 'object'
     or event_id is null or length(event_id) not between 1 and 160
     or nullif(p_command->>'occurredAt', '') is null then
    raise exception 'INVALID_COMMAND';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
  select command into stored_command from public.business_operation_receipts
    where user_id = owner_id and event_key = event_id;
  if found then
    if stored_command <> p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  insert into public.business_state_revisions(user_id) values (owner_id) on conflict do nothing;
  select revision into previous_revision from public.business_state_revisions
    where user_id = owner_id for update;
  perform pg_catalog.set_config('business_inventory.legacy_command_id', event_id, true);

  if operation_kind = 'saveLegacyOrder' then
    if pg_catalog.jsonb_typeof(p_command->'order') is distinct from 'object' then
      raise exception 'INVALID_LEGACY_ORDER';
    end if;
    perform public.save_order_with_inventory(p_command->'order');
  elsif operation_kind = 'deleteLegacyOrders' then
    if pg_catalog.jsonb_typeof(p_command->'orderIds') is distinct from 'array' then
      raise exception 'INVALID_LEGACY_ORDER_IDS';
    end if;
    select coalesce(array_agg(value::uuid), array[]::uuid[]) into order_ids
      from pg_catalog.jsonb_array_elements_text(p_command->'orderIds') as ids(value);
    perform public.delete_orders_atomic(order_ids);
  elsif operation_kind = 'restoreLegacyOrders' then
    if pg_catalog.jsonb_typeof(p_command->'orders') is distinct from 'array' then
      raise exception 'INVALID_LEGACY_ORDERS';
    end if;
    perform public.restore_orders_snapshot(p_command->'orders');
  else
    raise exception 'INVALID_LEGACY_ORDER_OPERATION';
  end if;

  -- Stock changes have already bumped the revision in the trigger. Financial
  -- edits with no stock delta still need a revision so other tabs reload.
  select revision into current_revision from public.business_state_revisions
    where user_id = owner_id;
  if current_revision = previous_revision then
    update public.business_state_revisions set revision = revision + 1
      where user_id = owner_id returning revision into current_revision;
  end if;
  insert into public.business_operation_receipts(user_id,event_key,command,revision)
    values (owner_id,event_id,p_command,current_revision);
  perform pg_catalog.set_config('business_inventory.legacy_command_id', previous_command, true);
  return public.business_inventory_snapshot();
exception when others then
  perform pg_catalog.set_config('business_inventory.legacy_command_id', previous_command, true);
  raise;
end $$;
revoke all on function public.business_apply_legacy_order(jsonb) from public, anon;
grant execute on function public.business_apply_legacy_order(jsonb) to authenticated;

commit;
