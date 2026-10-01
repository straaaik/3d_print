-- Run after legacy-inventory-bridge-checks.sql in the disposable local DB.
-- 5 units at 10 -> reserve 3 -> add 2 at 20 -> return 3 at their original 10.
insert into auth.users values ('33333333-3333-4333-8333-333333333333');
insert into public.saved_calculations(id,user_id,final_price,base_cost,stock_quantity,quantity)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','33333333-3333-4333-8333-333333333333',999,50,5,5);
insert into public.finished_stock_balances(user_id,product_id,source_product_id,quantity,average_unit_cost)
values ('33333333-3333-4333-8333-333333333333','dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',5,10);

set role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$
declare
  order_data jsonb := '{"id":"dddddddd-dddd-4ddd-8ddd-dddddddddd01","product_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","type":"income","quantity":3,"amount":90,"cost":30}'::jsonb;
  command jsonb;
  snapshot jsonb;
  current_revision bigint;
  movement_count integer;
begin
  command := jsonb_build_object('id','basis-reserve','occurredAt','2026-09-30T12:10:00Z',
    'kind','saveLegacyOrder','order',order_data);
  snapshot := public.business_apply_legacy_order(command);
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 2, 'reservation quantity incorrect';
  assert (snapshot->'finishedBalances'->0->>'average_unit_cost')::numeric = 10, 'reservation changed average';
  assert (select count(*) from public.finished_stock_movements
    where event_key='legacy-order:dddddddd-dddd-4ddd-8ddd-dddddddddd01:basis-reserve:reserve'
      and source='order' and delta_quantity=-3 and unit_cost=10) = 1, 'reservation basis/key not immutable';
  snapshot := public.business_apply_legacy_order(command);
  assert (snapshot->>'revision')::bigint = 1, 'reserve receipt duplicated reservation';

  -- Use the actual inventory commit path to add 2 units at a new cost.
  snapshot := jsonb_set(snapshot,'{finishedBalances,0,quantity}','4'::jsonb);
  snapshot := jsonb_set(snapshot,'{finishedBalances,0,average_unit_cost}','15'::jsonb);
  snapshot := jsonb_set(snapshot,'{finishedBalances,0,revision}','2'::jsonb);
  snapshot := jsonb_set(snapshot,'{finishedMovements}',snapshot->'finishedMovements' ||
    jsonb_build_array(jsonb_build_object('id','dddddddd-dddd-4ddd-8ddd-dddddddddd02',
      'user_id','33333333-3333-4333-8333-333333333333','created_at',clock_timestamp(),
      'product_id','dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'source_product_id','dddddddd-dddd-4ddd-8ddd-dddddddddddd','event_key','basis-add',
      'source','manual_adjustment','delta_quantity',2,'unit_cost',20,'balance_after',4)));
  snapshot := public.commit_business_inventory(1,'{"id":"basis-add","kind":"adjustFinished"}'::jsonb,snapshot);
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 4, 'added inventory quantity incorrect';
  assert (snapshot->'finishedBalances'->0->>'average_unit_cost')::numeric = 15, 'added inventory cost incorrect';
  select count(*) into movement_count from public.finished_stock_movements;

  command := jsonb_build_object('id','basis-financial','occurredAt','2026-09-30T12:11:00Z',
    'kind','saveLegacyOrder','order',order_data || '{"amount":120,"cost":35,"title":"Edited"}'::jsonb);
  snapshot := public.business_apply_legacy_order(command);
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 4, 'financial edit changed quantity';
  assert (snapshot->'finishedBalances'->0->>'average_unit_cost')::numeric = 15, 'financial edit revalued stock';
  assert (select count(*) from public.finished_stock_movements) = movement_count, 'financial edit created movements';
  current_revision := (snapshot->>'revision')::bigint;
  snapshot := public.business_apply_legacy_order(command);
  assert (snapshot->>'revision')::bigint = current_revision, 'financial receipt duplicated';

  -- Snapshot restore must also keep the basis of an unchanged reservation.
  snapshot := public.business_apply_legacy_order(jsonb_build_object('id','basis-restore',
    'occurredAt','2026-09-30T12:12:00Z','kind','restoreLegacyOrders',
    'orders',jsonb_build_array(order_data || '{"amount":130}'::jsonb)));
  assert (snapshot->'finishedBalances'->0->>'average_unit_cost')::numeric = 15, 'restore revalued unchanged reservation';
  assert (select count(*) from public.finished_stock_movements) = movement_count, 'restore recreated unchanged reservation';

  command := jsonb_build_object('id','basis-delete','occurredAt','2026-09-30T12:13:00Z',
    'kind','deleteLegacyOrders','orderIds',jsonb_build_array(order_data->>'id'));
  snapshot := public.business_apply_legacy_order(command);
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 7, 'delete did not return 3 units';
  assert (snapshot->'finishedBalances'->0->>'average_unit_cost')::numeric = round(90::numeric / 7,8),
    'delete used current average instead of original reservation basis';
  assert (select count(*) from public.finished_stock_movements
    where event_key='legacy-order:dddddddd-dddd-4ddd-8ddd-dddddddddd01:basis-delete:release'
      and source='order' and delta_quantity=3 and unit_cost=10) = 1, 'return lost original cost basis';
  current_revision := (snapshot->>'revision')::bigint;
  snapshot := public.business_apply_legacy_order(command);
  assert (snapshot->>'revision')::bigint = current_revision, 'delete receipt duplicated return';
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 7, 'delete receipt returned stock twice';
  assert (snapshot->'legacyProducts'->0->>'stock_quantity')::integer = 7
    and (snapshot->'legacyProducts'->0->>'final_price')::numeric = 999,
    'legacy projection incorrect or retail changed';
  assert coalesce(current_setting('business_inventory.legacy_order_id',true),'') = '', 'order context leaked';
  assert coalesce(current_setting('business_inventory.legacy_command_id',true),'') = '', 'command context leaked';
  assert coalesce(current_setting('business_inventory.legacy_skip_bridge',true),'') = '', 'skip context leaked';
end $$;
reset role;

-- Pre-migration orders have no reservation movement. Financial order.cost is
-- not evidence of an actual stock basis, so fall back to the current average.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ declare snapshot jsonb;
begin
  snapshot := public.business_apply_legacy_order(jsonb_build_object('id','historical-delete',
    'occurredAt','2026-09-30T12:30:00Z','kind','deleteLegacyOrders',
    'orderIds',jsonb_build_array('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')));
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 7, 'historical return quantity incorrect';
  assert (snapshot->'finishedBalances'->0->>'average_unit_cost')::numeric = 888,
    'unknown historical basis was inferred from financial cost';
  assert (select unit_cost from public.finished_stock_movements
    where event_key='legacy-order:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb:historical-delete:release') = 888,
    'historical return did not explicitly use fallback basis';
end $$;
reset role;

-- Two concurrent reservations have different immutable bases. Restore releases
-- only the replaced reservation before new reservations, regardless of input order.
insert into auth.users values ('44444444-4444-4444-8444-444444444444');
insert into public.saved_calculations(id,user_id,final_price,base_cost,stock_quantity,quantity)
values ('44444444-4444-4444-8444-444444444400','44444444-4444-4444-8444-444444444444',999,50,5,5);
insert into public.finished_stock_balances(user_id,product_id,source_product_id,quantity,average_unit_cost)
values ('44444444-4444-4444-8444-444444444444','44444444-4444-4444-8444-444444444400',
  '44444444-4444-4444-8444-444444444400',5,10);
set role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
do $$
declare
  order_a jsonb := '{"id":"44444444-4444-4444-8444-444444444401","product_id":"44444444-4444-4444-8444-444444444400","type":"income","quantity":3}'::jsonb;
  order_b jsonb := '{"id":"44444444-4444-4444-8444-444444444402","product_id":"44444444-4444-4444-8444-444444444400","type":"income","quantity":1}'::jsonb;
  order_c jsonb := '{"id":"44444444-4444-4444-8444-444444444403","product_id":"44444444-4444-4444-8444-444444444400","type":"income","quantity":5}'::jsonb;
  snapshot jsonb;
  command jsonb;
begin
  snapshot := public.business_apply_legacy_order(jsonb_build_object('id','batch-a','occurredAt','2026-09-30T12:20:00Z',
    'kind','saveLegacyOrder','order',order_a));
  snapshot := jsonb_set(snapshot,'{finishedBalances,0,quantity}','4'::jsonb);
  snapshot := jsonb_set(snapshot,'{finishedBalances,0,average_unit_cost}','15'::jsonb);
  snapshot := jsonb_set(snapshot,'{finishedBalances,0,revision}','2'::jsonb);
  snapshot := jsonb_set(snapshot,'{finishedMovements}',snapshot->'finishedMovements' ||
    jsonb_build_array(jsonb_build_object('id','44444444-4444-4444-8444-444444444404',
      'user_id','44444444-4444-4444-8444-444444444444','created_at',clock_timestamp(),
      'product_id','44444444-4444-4444-8444-444444444400',
      'source_product_id','44444444-4444-4444-8444-444444444400','event_key','batch-add',
      'source','manual_adjustment','delta_quantity',2,'unit_cost',20,'balance_after',4)));
  snapshot := public.commit_business_inventory(1,'{"id":"batch-add","kind":"adjustFinished"}'::jsonb,snapshot);
  snapshot := public.business_apply_legacy_order(jsonb_build_object('id','batch-b','occurredAt','2026-09-30T12:21:00Z',
    'kind','saveLegacyOrder','order',order_b));
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 3, 'second reservation incorrect';
  assert (select unit_cost from public.finished_stock_movements
    where event_key='legacy-order:44444444-4444-4444-8444-444444444402:batch-b:reserve') = 15,
    'new reservation reused an unrelated older basis';
  command := jsonb_build_object('id','batch-restore','occurredAt','2026-09-30T12:22:00Z',
    'kind','restoreLegacyOrders','orders',jsonb_build_array(order_c,order_b || '{"amount":75}'::jsonb));
  snapshot := public.business_apply_legacy_order(command);
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 1, 'restore failed to release before reserving';
  assert (snapshot->'finishedBalances'->0->>'average_unit_cost')::numeric = 12.5, 'restore changed remaining reservation basis';
  assert (select count(*) from public.finished_stock_movements
    where event_key like 'legacy-order:44444444-4444-4444-8444-444444444402:%') = 1,
    'restore released an unchanged reservation';
  snapshot := public.business_apply_legacy_order(command);
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 1, 'restore receipt duplicated';

  snapshot := public.business_apply_legacy_order(jsonb_build_object('id','batch-delete','occurredAt','2026-09-30T12:23:00Z',
    'kind','deleteLegacyOrders','orderIds',jsonb_build_array(order_b->>'id',order_c->>'id',order_b->>'id')));
  assert (snapshot->'finishedBalances'->0->>'quantity')::integer = 7, 'batch delete returned duplicate/missing stock';
  assert (snapshot->'finishedBalances'->0->>'average_unit_cost')::numeric = round(90::numeric / 7,8),
    'batch delete aggregated reservations with different bases';
  assert (select unit_cost from public.finished_stock_movements
    where event_key='legacy-order:44444444-4444-4444-8444-444444444402:batch-delete:release') = 15,
    'batch delete lost B basis';
  assert (select unit_cost from public.finished_stock_movements
    where event_key='legacy-order:44444444-4444-4444-8444-444444444403:batch-delete:release') = 12.5,
    'batch delete lost C basis';

  -- Failing save unwinds transaction-local context, then a direct old RPC still
  -- works and produces an order-linked reservation with a generated event ID.
  begin
    perform public.business_apply_legacy_order(jsonb_build_object('id','batch-failed','occurredAt','2026-09-30T12:24:00Z',
      'kind','saveLegacyOrder','order',order_c || '{"quantity":100}'::jsonb));
    raise exception 'Expected insufficient stock';
  exception when others then
    assert sqlerrm = 'INSUFFICIENT_STOCK', 'failed save did not preserve original error';
  end;
  assert coalesce(current_setting('business_inventory.legacy_order_id',true),'') = '', 'failed save leaked order context';
  assert coalesce(current_setting('business_inventory.legacy_command_id',true),'') = '', 'failed save leaked command context';
  perform public.save_order_with_inventory(order_b);
  assert (select count(*) from public.finished_stock_movements
    where source='order' and delta_quantity=-1
      and event_key like 'legacy-order:44444444-4444-4444-8444-444444444402:%:reserve') = 2,
    'direct legacy save omitted order link';
end $$;
reset role;
