-- Run after both workshop migrations in a disposable database. All data rolls back.
begin;
select set_config('request.jwt.claim.sub', (select id::text from auth.users order by id limit 1), true);
set local role authenticated;
delete from public.workshop_rooms where user_id = auth.uid();
delete from public.workshop_revisions where user_id = auth.uid();
do $$
declare
  layout jsonb := '{"version":1,"rooms":[{"id":"b3000000-0000-4000-8000-000000000001","name":"Main","width":8,"depth":6,"labels":[{"id":"sign","text":"Printers","color":"#ffffff","surface":"north","u":0.5,"v":0.5,"size":0.4,"rotation":15}]},{"id":"b3000000-0000-4000-8000-000000000002","name":"Side","width":4,"depth":4,"attachment":{"roomId":"b3000000-0000-4000-8000-000000000001","side":"east"}}],"furniture":[],"slots":[],"placements":[]}';
  bad jsonb;
begin
  if public.get_workshop_spatial() is not null then raise exception 'Expected empty'; end if;
  if public.save_workshop_spatial(layout, null) <> 1 then raise exception 'Revision failed'; end if;
  if public.get_workshop_spatial()->'layout' <> layout then raise exception 'Metadata round trip failed'; end if;
  for bad in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_set(layout,'{rooms,1,attachment,roomId}','"b3000000-0000-4000-8000-000000000099"'),
    jsonb_set(layout,'{rooms,1,attachment,roomId}','"b3000000-0000-4000-8000-000000000002"'),
    jsonb_set(layout,'{rooms,0,attachment}','{"roomId":"b3000000-0000-4000-8000-000000000002","side":"west"}'),
    jsonb_set(layout,'{rooms,1,attachment,side}','"ceiling"'),
    jsonb_set(layout,'{rooms,0,labels,0,u}','1.1'),
    jsonb_set(layout,'{rooms,0,labels,0,size}','0'),
    jsonb_set(layout,'{rooms,0,labels,0,surface}','"ceiling"'),
    jsonb_set(layout,'{rooms,0,labels,0,color}','"invalid"'),
    jsonb_set(layout,'{rooms,0,labels,0,text}','null'),
    jsonb_set(layout,'{rooms,0,labels}', jsonb_build_array(layout#>'{rooms,0,labels,0}',layout#>'{rooms,0,labels,0}'))
  )) loop
    begin
      perform public.save_workshop_spatial(bad,1);
      raise exception 'Invalid metadata accepted: %',bad;
    exception when invalid_parameter_value then null;
    end;
  end loop;
  begin
    perform public.save_workshop_spatial(layout, null);
    raise exception 'Stale revision accepted';
  exception when serialization_failure then null; end;
  if public.get_workshop_spatial()->'layout' <> layout or (public.get_workshop_spatial()->>'revision')::bigint <> 1 then
    raise exception 'Invalid save was not atomic';
  end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', (select id::text from auth.users order by id offset 1 limit 1), true);
set local role authenticated;
do $$ begin
  if public.get_workshop_spatial() is not null then raise exception 'Owner isolation failed'; end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon','public.get_workshop_spatial()','execute')
     or has_function_privilege('anon','public.save_workshop_spatial(jsonb,bigint)','execute') then
    raise exception 'Anonymous RPC exposed';
  end if;
end $$;
rollback;
