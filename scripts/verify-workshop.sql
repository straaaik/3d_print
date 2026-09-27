-- Run after the migration in a disposable/staging Supabase SQL Editor session.
-- Requires two existing auth users; all modifications roll back.
begin;
create temporary table workshop_test_users as
select id, row_number() over(order by id) n from (select id from auth.users order by id limit 2) u;
grant select on workshop_test_users to authenticated;
do $$ begin
  if (select count(*) from workshop_test_users) <> 2 then raise exception 'Need two test auth users'; end if;
end $$;
select set_config('request.jwt.claim.sub', (select id::text from workshop_test_users where n=1), true);
set local role authenticated;
delete from public.workshop_rooms where user_id = auth.uid();
delete from public.workshop_revisions where user_id = auth.uid();

do $$
declare layout jsonb := '{"version":1,"rooms":[{"id":"b3000000-0000-4000-8000-000000000001","name":"Test room","width":8,"depth":6,"camera":{"x":1,"y":2,"z":3,"span":10}}],"furniture":[{"id":"b3000000-0000-4000-8000-000000000002","roomId":"b3000000-0000-4000-8000-000000000001","name":"Rack","kind":"printer_rack","x":1,"z":1,"rotation":90,"width":1,"depth":1,"height":2,"levels":2,"columns":1}],"slots":[{"id":"b3000000-0000-4000-8000-000000000003","furnitureId":"b3000000-0000-4000-8000-000000000002","kind":"printer","index":0,"x":0,"y":0,"z":0}],"placements":[]}';
  before_count bigint; revision bigint; test_printer uuid := gen_random_uuid();
begin
  insert into public.printers(id,user_id,name,power_w,price,lifespan_hours)
    values(test_printer,auth.uid(),'Workshop SQL test',100,100,1000);
  layout := jsonb_set(layout, '{placements}', jsonb_build_array(jsonb_build_object(
    'id', gen_random_uuid(), 'entityId', test_printer, 'kind', 'printer',
    'slotId', 'b3000000-0000-4000-8000-000000000003', 'model', 'a1')));
  if public.get_workshop() is not null then raise exception 'Initial snapshot must be null'; end if;
  revision := public.save_workshop(layout, null);
  if revision <> 1 or public.get_workshop()->'layout' <> layout then raise exception 'Round trip failed'; end if;
  begin
    perform public.save_workshop(layout, null);
    raise exception 'Initial create overwrote an existing revision';
  exception when serialization_failure then null; end;
  begin
    perform public.save_workshop(jsonb_set(layout, '{rooms,0,width}', '3'), 1);
    raise exception 'Invalid room accepted';
  exception when check_violation then null; end;
  begin
    perform public.save_workshop(jsonb_set(layout, '{slots,0,kind}', '"filament"'), 1);
    raise exception 'Incompatible slot kind accepted';
  exception when foreign_key_violation then null; end;
  begin
    perform public.save_workshop(jsonb_set(layout, '{placements,0,entityId}', to_jsonb(gen_random_uuid())), 1);
    raise exception 'Nonexistent inventory accepted';
  exception when foreign_key_violation then null; end;
  begin
    perform public.save_workshop(jsonb_set(layout, '{placements}', (layout->'placements') ||
      jsonb_build_array(jsonb_set(layout#>'{placements,0}', '{id}', to_jsonb(gen_random_uuid())))), 1);
    raise exception 'Duplicate placement accepted';
  exception when unique_violation then null; end;
  if public.get_workshop()->'layout' <> layout or (public.get_workshop()->>'revision')::bigint <> 1 then
    raise exception 'Failed save was not atomic';
  end if;
  -- Existing backup restore replaces inventory with DELETE/INSERT; same-ID spatial links survive.
  perform public.restore_database_snapshot(jsonb_build_object('printers',
    (select jsonb_agg(to_jsonb(p)) from public.printers p where p.user_id=auth.uid())));
  if public.get_workshop()->'layout' <> layout or (public.get_workshop()->>'revision')::bigint <> 2 then
    raise exception 'Inventory snapshot restore lost placement or did not invalidate stale revisions';
  end if;
  select count(*) into before_count from public.printers;
  if public.save_workshop('{"version":1,"rooms":[],"furniture":[],"slots":[],"placements":[]}', 2) <> 3 then
    raise exception 'Empty layout update failed';
  end if;
  if exists(select 1 from public.workshop_slots where user_id = auth.uid()) then raise exception 'Cascade failed'; end if;
  if (select count(*) from public.printers) <> before_count then raise exception 'Inventory changed'; end if;
end $$;

select set_config('request.jwt.claim.sub', (select id::text from workshop_test_users where n=2), true);
do $$
declare other_id uuid := (select id from workshop_test_users where n=1); affected bigint;
begin
  if exists(select 1 from public.workshop_revisions where user_id=other_id) then raise exception 'RLS SELECT leak'; end if;
  update public.workshop_revisions set revision=99 where user_id=other_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS UPDATE leak'; end if;
  delete from public.workshop_revisions where user_id=other_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS DELETE leak'; end if;
  begin
    insert into public.workshop_rooms(id,user_id,name,width_m,depth_m,sort_order)
      values(gen_random_uuid(),other_id,'Forbidden',8,8,0);
    raise exception 'RLS INSERT leak';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon', 'public.get_workshop()', 'EXECUTE')
    or has_function_privilege('anon', 'public.save_workshop(jsonb,bigint)', 'EXECUTE') then
    raise exception 'Anonymous RPC privilege leak';
  end if;
end $$;
rollback;
