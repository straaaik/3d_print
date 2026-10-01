-- Run after foundation-fixture.sql and the foundation migration TWICE.
-- Raises on any regression. All assertions use literal financial expectations.
do $$ begin
  assert (select count(*) from public.order_items) = 1, 'backfill must be income-only and idempotent';
  assert (select total_cost = 60 and total_price = 100 and unit_cost = 12 and unit_price = 20
    and fulfilled_quantity = 0 and production_quantity = 0 and cost_provenance = 'legacy'
    from public.order_items), 'backfill changed historical financial/production facts';
  assert (select stock_quantity from public.saved_calculations) = 2, 'backfill consumed stock';
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
insert into public.filament_manufacturers(id,name) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Owner A');
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
do $$ begin
  assert (select count(*) from public.filament_manufacturers) = 0, 'RLS leaked another owner';
  begin
    insert into public.material_lines(manufacturer_id,name) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Cross owner');
    raise exception 'Cross-owner reference accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.filament_manufacturers(user_id,name) values ('11111111-1111-4111-8111-111111111111','Forged');
    raise exception 'Cross-owner write accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
do $$ begin
  begin
    update public.filament_manufacturers set user_id = '22222222-2222-4222-8222-222222222222';
    raise exception 'Owner reassignment accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.order_items(source_order_id,name,quantity,unit_cost,total_cost,unit_price,total_price,cost_provenance,snapshot)
      values ('test','Invalid snapshot',1,1,1,2,2,'estimate','{}');
    raise exception 'Unversioned snapshot accepted';
  exception when check_violation then null; end;
  begin
    insert into public.order_items(source_order_id,name,quantity,unit_cost,total_cost,unit_price,total_price,cost_provenance,snapshot)
      values ('null-version','Invalid snapshot',1,1,1,2,2,'estimate','{"version":null,"order":{}}');
    raise exception 'Null snapshot version accepted';
  exception when check_violation then null; end;
  begin
    insert into public.order_items(source_order_id,name,quantity,unit_cost,total_cost,unit_price,total_price,cost_provenance,snapshot)
      values ('missing-order','Invalid snapshot',1,1,1,2,2,'estimate','{"version":1}');
    raise exception 'Missing order snapshot accepted';
  exception when check_violation then null; end;
  begin
    insert into public.filament_variants(name,stock_g) values ('Negative',-1);
    raise exception 'Negative stock accepted';
  exception when check_violation then null; end;
  begin
    insert into public.filament_variants(name,stock_g) values ('NaN','NaN');
    raise exception 'NaN stock accepted';
  exception when check_violation then null; end;
end $$;
insert into public.production_events(event_key,quantity,unit_cost,recipe_snapshot) values ('once',1,12,'{"version":1}');
do $$ begin
  begin
    insert into public.production_events(event_key,quantity,unit_cost,recipe_snapshot) values ('once',1,12,'{"version":1}');
    raise exception 'Duplicate production event accepted';
  exception when unique_violation then null; end;
  begin
    delete from public.production_events;
    raise exception 'Audit deletion accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform * from public.order_items;
    raise exception 'Anonymous read accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Parent deletion must preserve financial/audit snapshots and ownership.
delete from public.orders;
delete from public.saved_calculations;
do $$ begin
  assert (select order_id is null and product_id is null and user_id = '11111111-1111-4111-8111-111111111111'
    and total_cost = 60 and snapshot->'order'->>'title' = 'Historical' from public.order_items), 'History lost after parent deletion';
end $$;
select 'Foundation checks passed' as result;
