-- Local Postgres/Supabase regression checks; transaction always rolled back.
-- Run after bootstrap + base/spatial migrations with ON_ERROR_STOP=1.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
insert into public.printers(id,user_id,name) values ('b4000000-0000-4000-8000-000000000011','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Spatial regression printer');
do $$
declare
  layout jsonb := '{"version":1,"rooms":[{"id":"b4000000-0000-4000-8000-000000000001","name":"Main","width":8,"depth":6,"labels":[{"id":"sign","text":"Printers","color":"#ffffff","surface":"north","u":0.5,"v":0.5,"size":0.4}]},{"id":"b4000000-0000-4000-8000-000000000002","name":"Side","width":4,"depth":4,"labels":[],"attachment":{"roomId":"b4000000-0000-4000-8000-000000000001","side":"east"}}],"furniture":[],"slots":[],"placements":[]}';
  rev bigint; bad jsonb; current_layout jsonb;
begin
  layout := jsonb_set(layout,'{furniture}','[{"id":"b4000000-0000-4000-8000-000000000012","roomId":"b4000000-0000-4000-8000-000000000001","name":"Table","kind":"table","x":0,"z":0,"rotation":0,"width":2,"depth":1,"height":0.85,"levels":1,"columns":1}]');
  layout := jsonb_set(layout,'{slots}','[{"id":"b4000000-0000-4000-8000-000000000013","furnitureId":"b4000000-0000-4000-8000-000000000012","kind":"printer","index":0,"x":0,"y":0.85,"z":0}]');
  layout := jsonb_set(layout,'{placements}','[{"id":"b4000000-0000-4000-8000-000000000014","entityId":"b4000000-0000-4000-8000-000000000011","kind":"printer","slotId":"b4000000-0000-4000-8000-000000000013","model":"a1"}]');
  rev := (public.get_workshop_spatial()->>'revision')::bigint;
  rev := public.save_workshop_spatial(layout,rev);
  if public.get_workshop_spatial()->'layout' <> layout then raise exception 'Round trip failed'; end if;
  for bad in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_set(layout,'{rooms,1,attachment,roomId}','"b4000000-0000-4000-8000-000000000099"'),
    jsonb_set(layout,'{rooms,1,attachment,roomId}','"b4000000-0000-4000-8000-000000000002"'),
    jsonb_set(layout,'{rooms,0,attachment}','{"roomId":"b4000000-0000-4000-8000-000000000002","side":"west"}'),
    jsonb_set(layout,'{rooms,1,attachment,side}','"ceiling"'),
    jsonb_set(layout,'{rooms,0,labels,0,u}','1.1'),
    jsonb_set(layout,'{rooms,0,labels,0,size}','0'),
    jsonb_set(layout,'{rooms,0,labels,0,surface}','"ceiling"'),
    jsonb_set(layout,'{rooms,0,labels,0,color}','"invalid"'),
    jsonb_set(layout,'{rooms,0,labels,0,text}','null'),
    jsonb_set(layout,'{rooms,0,labels}',jsonb_build_array(layout#>'{rooms,0,labels,0}',layout#>'{rooms,0,labels,0}'))
  )) loop
    begin
      perform public.save_workshop_spatial(bad,rev);
      raise exception 'FAIL: malformed metadata accepted';
    exception when invalid_parameter_value then null; end;
  end loop;
  -- A west-facing grandchild of the east room occupies its parent-facing side.
  bad := jsonb_set(layout,'{rooms}',(layout->'rooms') || '[{"id":"b4000000-0000-4000-8000-000000000003","name":"Invalid","width":4,"depth":4,"attachment":{"roomId":"b4000000-0000-4000-8000-000000000002","side":"west"}}]'::jsonb);
  begin
    perform public.save_workshop_spatial(bad,rev);
    raise exception 'FAIL: parent-facing overlap accepted';
  exception when invalid_parameter_value then null; end;
  -- Opposite root branches can overlap at the corner when both are oversized.
  bad := jsonb_set(layout,'{rooms}',jsonb_build_array(layout#>'{rooms,0}',jsonb_set(layout#>'{rooms,1}','{depth}','16')) || '[{"id":"b4000000-0000-4000-8000-000000000003","name":"Invalid","width":20,"depth":4,"attachment":{"roomId":"b4000000-0000-4000-8000-000000000001","side":"north"}}]'::jsonb);
  begin
    perform public.save_workshop_spatial(bad,rev);
    raise exception 'FAIL: corner overlap accepted';
  exception when invalid_parameter_value then null; end;
  bad := jsonb_set(layout,'{rooms}',jsonb_build_array((layout#>'{rooms,0}')-'labels',(layout#>'{rooms,1}')-'labels'-'attachment'));
  begin
    perform public.save_workshop(bad,rev);
    raise exception 'FAIL: legacy metadata loss accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.save_workshop(jsonb_set(layout,'{rooms}',jsonb_build_array(layout#>'{rooms,0}')),rev);
    raise exception 'FAIL: legacy spatial-room deletion accepted';
  exception when invalid_parameter_value then null; end;
  if public.get_workshop_spatial()->'layout' <> layout or (public.get_workshop_spatial()->>'revision')::bigint<>rev then raise exception 'Rejected save was not atomic'; end if;
  begin
    perform public.save_workshop_spatial(layout,rev-1);
    raise exception 'FAIL: stale CAS accepted';
  exception when serialization_failure then null; end;
  -- New clients may intentionally clear labels and delete a leaf.
  current_layout := jsonb_set(layout,'{rooms}',jsonb_build_array(jsonb_set(layout#>'{rooms,0}','{labels}','[]')));
  rev := public.save_workshop_spatial(current_layout,rev);
  if public.get_workshop_spatial()->'layout' <> current_layout then raise exception 'Explicit clearing/deletion failed'; end if;
  -- Legacy clients can still save if they preserve the fields.
  rev := public.save_workshop(current_layout,rev);
  if public.get_workshop_spatial()->'layout' <> current_layout then raise exception 'Compatible legacy save failed'; end if;
  perform set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
  if exists(select 1 from public.workshop_rooms where id='b4000000-0000-4000-8000-000000000001') then raise exception 'RLS leaked other user room'; end if;
  perform set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
  raise notice 'PASS: 20 checks: occupied inventory round-trip, 10 malformed payloads, parent-side, corner-overlap, legacy-loss, legacy-delete, atomicity, CAS, explicit-clear/delete, compatible-legacy, RLS';
end $$;
rollback;
