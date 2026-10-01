-- Run in a disposable database after legacy-inventory-bridge-fixture.sql,
-- business_foundation, inventory_transactions, and the legacy bridge migration.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
declare
  command jsonb;
  snapshot jsonb;
begin
  snapshot := public.business_inventory_snapshot();
  assert jsonb_array_length(snapshot->'legacyOrders') = 2, 'snapshot omitted owner legacy orders';
  assert jsonb_array_length(snapshot->'legacyProducts') = 1, 'snapshot omitted owner legacy products';
  command := jsonb_build_object('id','old-save-1','occurredAt','2026-09-30T12:00:00Z',
    'kind','saveLegacyOrder','order',jsonb_build_object(
      'id','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','product_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'type','income','title','New sale','quantity',1,'amount',30,'cost',10));
  snapshot := public.business_apply_legacy_order(command);
  assert (snapshot->>'revision')::bigint = 1, 'legacy stock operation did not advance revision';
  assert jsonb_array_length(snapshot->'legacyOrders') = 3, 'new order missing from snapshot';
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 1, 'ledger did not mirror old sale';
  assert (snapshot->'legacyProducts'->0->>'stock_quantity')::integer = 1, 'legacy product projection is stale';
  snapshot := public.business_apply_legacy_order(command);
  assert (snapshot->>'revision')::bigint = 1, 'idempotent replay advanced revision';
  begin
    perform public.business_apply_legacy_order(command || '{"order":{"title":"conflict"}}'::jsonb);
    raise exception 'Conflicting event key was accepted';
  exception when others then
    if sqlerrm = 'Conflicting event key was accepted' then raise; end if;
    assert sqlerrm = 'IDEMPOTENCY_KEY_REUSED', 'wrong idempotency error';
  end;

  snapshot := public.business_apply_legacy_order(jsonb_build_object(
    'id','financial-edit-1','occurredAt','2026-09-30T12:01:00Z','kind','saveLegacyOrder',
    'order',jsonb_build_object('id','ffffffff-ffff-4fff-8fff-ffffffffffff',
      'type','expense','title','Shipping','quantity',1,'amount',5,'cost',0)));
  assert (snapshot->>'revision')::bigint = 2, 'financial order edit did not advance revision';
  assert jsonb_array_length(snapshot->'legacyOrders') = 4, 'financial order omitted';
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 1, 'financial edit changed stock';

  begin
    perform public.business_apply_legacy_order(jsonb_build_object(
      'id','insufficient-1','occurredAt','2026-09-30T12:02:00Z','kind','saveLegacyOrder',
      'order',jsonb_build_object('id','99999999-9999-4999-8999-999999999999',
        'product_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'type','income','title','Too many','quantity',3,'amount',30,'cost',10)));
    raise exception 'Insufficient stock was accepted';
  exception when others then
    if sqlerrm = 'Insufficient stock was accepted' then raise; end if;
    assert sqlerrm = 'INSUFFICIENT_STOCK', 'legacy insufficient stock error changed';
  end;
end $$;

reset role;
do $$ begin
  assert (select stock_quantity = 1 and final_price = 999 from public.saved_calculations
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'legacy sale or failed action changed product incorrectly';
  assert (select quantity = 1 and average_unit_cost = 888 from public.finished_stock_balances
    where source_product_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'current cost basis was repriced';
  assert (select count(*) from public.finished_stock_movements where source = 'order') = 1,
    'legacy sale movement missing or duplicated';
  assert (select count(*) from public.business_operation_receipts where event_key='insufficient-1') = 0,
    'failed legacy action wrote a receipt';
  assert (select revision from public.business_state_revisions
    where user_id='11111111-1111-4111-8111-111111111111') = 2,
    'failed action changed revision';
  assert not has_function_privilege('authenticated',
    'public.legacy_save_order_with_inventory_unlocked(jsonb)', 'EXECUTE'),
    'unlocked original is externally callable';
end $$;

-- A subsequent phase-2 purchase commits a full snapshot; its product writeback
-- must leave the already-consumed legacy stock at one, not restore it to two.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
do $$
declare
  snapshot jsonb := public.business_inventory_snapshot();
  owner_id text := '11111111-1111-4111-8111-111111111111';
  at_time text := '2026-09-30T12:03:00Z';
begin
  snapshot := jsonb_set(snapshot, '{variants}', snapshot->'variants' || jsonb_build_array(jsonb_build_object(
    'id','99999999-9999-4999-8999-999999999998','user_id',owner_id,'created_at',at_time,
    'material_line_id',null,'legacy_filament_id',null,'name','Fresh PLA','color','#111111',
    'stock_g',1000,'average_cost_per_g',0.02,'revision',1)));
  snapshot := jsonb_set(snapshot, '{purchases}', snapshot->'purchases' || jsonb_build_array(jsonb_build_object(
    'id','88888888-8888-4888-8888-888888888888','user_id',owner_id,'created_at',at_time,
    'variant_id','99999999-9999-4999-8999-999999999998','weight_g',1000,'total_price',20,
    'purchased_at',at_time,'event_key','new-buy-1')));
  snapshot := jsonb_set(snapshot, '{filamentMovements}', snapshot->'filamentMovements' || jsonb_build_array(jsonb_build_object(
    'id','77777777-7777-4777-8777-777777777777','user_id',owner_id,'created_at',at_time,
    'variant_id','99999999-9999-4999-8999-999999999998','event_key','new-buy-1','source','purchase',
    'source_id','new-buy-1','delta_g',1000,'unit_cost_per_g',0.02,'balance_after_g',1000)));
  snapshot := public.commit_business_inventory(2, '{"id":"new-buy-1","kind":"purchase"}'::jsonb, snapshot);
  assert (snapshot->>'revision')::bigint = 3, 'new purchase commit revision incorrect';
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 1,
    'new purchase restored legacy-consumed finished stock';
  assert jsonb_array_length(snapshot->'legacyOrders') = 4, 'commit snapshot lost legacy orders';
  assert (snapshot->'legacyProducts'->0->>'stock_quantity')::integer = 1,
    'commit snapshot restored legacy product stock';
end $$;
reset role;
do $$ begin
  assert (select stock_quantity from public.saved_calculations where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') = 1,
    'new purchase writeback restored consumed product stock';
  assert (select count(*) from public.finished_stock_movements where source='order') = 1,
    'new RPC writeback created a duplicate legacy movement';
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
do $$
declare snapshot jsonb;
begin
  snapshot := public.business_apply_legacy_order(jsonb_build_object(
    'id','old-delete-1','occurredAt','2026-09-30T12:04:00Z','kind','deleteLegacyOrders',
    'orderIds',jsonb_build_array('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')));
  assert (snapshot->>'revision')::bigint = 4, 'legacy delete revision incorrect';
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 2, 'legacy delete did not return stock';
  begin
    perform public.restore_database_snapshot('{}'::jsonb);
    raise exception 'Inventory restore guard failed';
  exception when others then
    if sqlerrm = 'Inventory restore guard failed' then raise; end if;
    assert sqlerrm = 'FOUNDATION_INVENTORY_RESTORE_BLOCKED', 'wrong database restore guard error';
  end;
  begin
    perform public.restore_saved_calculations_snapshot('[]'::jsonb);
    raise exception 'Product restore guard failed';
  exception when others then
    if sqlerrm = 'Product restore guard failed' then raise; end if;
    assert sqlerrm = 'FOUNDATION_INVENTORY_RESTORE_BLOCKED', 'wrong product restore guard error';
  end;
end $$;

-- The guard must not make an empty new owner's legacy restore unavailable.
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
select public.restore_database_snapshot('{}'::jsonb);
select public.restore_saved_calculations_snapshot('[]'::jsonb);
do $$ declare snapshot jsonb;
begin
  snapshot := public.business_apply_legacy_order(jsonb_build_object(
    'id','empty-restore-1','occurredAt','2026-09-30T12:05:00Z','kind','restoreLegacyOrders',
    'orders','[]'::jsonb));
  assert (snapshot->>'revision')::bigint = 1, 'empty owner restore did not advance revision';
  assert jsonb_array_length(snapshot->'legacyOrders') = 0, 'empty owner sees foreign orders';
  assert jsonb_array_length(snapshot->'legacyProducts') = 0, 'empty owner sees foreign products';
end $$;
reset role;

do $$ begin
  assert (select stock_quantity = 2 and final_price = 999 from public.saved_calculations
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'delete did not restore stock without repricing';
  assert (select quantity = 2 and average_unit_cost = 888 from public.finished_stock_balances
    where source_product_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'delete changed cost basis';
  assert (select count(*) from public.finished_stock_movements where source='order') = 2,
    'delete audit movement missing';
end $$;
