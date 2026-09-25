-- Run in Supabase Dashboard > SQL Editor after the workshop base migration.
-- Additive: preserves existing rooms and the atomic expected_revision contract.
begin;
alter table public.workshop_rooms add column if not exists spatial_metadata jsonb not null default '{}'::jsonb
  check (jsonb_typeof(spatial_metadata) = 'object');

-- Validate before replacing normalized rows, inside the same CAS transaction.
create or replace function public.validate_workshop_spatial(rooms jsonb)
returns void language plpgsql immutable security invoker set search_path = '' as $$
declare room jsonb; label jsonb; link jsonb; cursor_id text; visited text[]; parent jsonb;
begin
  if jsonb_typeof(rooms) is distinct from 'array' then
    raise exception 'INVALID_WORKSHOP_SPATIAL' using errcode = '22023';
  end if;
  if jsonb_array_length(rooms)>50 then
    raise exception 'INVALID_WORKSHOP_SPATIAL: room count' using errcode='22023';
  end if;
  for room in select value from jsonb_array_elements(rooms) loop
    if jsonb_typeof(room->'width') is distinct from 'number' or jsonb_typeof(room->'depth') is distinct from 'number' then
      raise exception 'INVALID_WORKSHOP_SPATIAL: dimensions' using errcode='22023';
    end if;
    if (room->>'width')::numeric not between 4 and 40 or (room->>'depth')::numeric not between 4 and 40 then
      raise exception 'INVALID_WORKSHOP_SPATIAL: dimensions' using errcode='22023';
    end if;
    if room ? 'attachment' then
      link := room->'attachment';
      if jsonb_typeof(link) is distinct from 'object'
        or jsonb_typeof(link->'roomId') is distinct from 'string'
        or coalesce(link->>'side','') not in ('north','east','south','west')
        or not exists(select 1 from jsonb_array_elements(rooms) r where r->>'id'=link->>'roomId') then
        raise exception 'INVALID_WORKSHOP_SPATIAL: attachment' using errcode = '22023';
      end if;
      visited := array[room->>'id'];
      cursor_id := link->>'roomId';
      while cursor_id is not null loop
        if cursor_id = any(visited) then
          raise exception 'INVALID_WORKSHOP_SPATIAL: cycle' using errcode = '22023';
        end if;
        visited := array_append(visited,cursor_id);
        select r into parent from jsonb_array_elements(rooms) r where r->>'id'=cursor_id;
        cursor_id := parent#>>'{attachment,roomId}';
      end loop;
    end if;
    if room ? 'labels' then
      if jsonb_typeof(room->'labels') is distinct from 'array' then
        raise exception 'INVALID_WORKSHOP_SPATIAL: labels' using errcode = '22023';
      end if;
      if jsonb_array_length(room->'labels') > 100 or exists (
        select 1 from jsonb_array_elements(room->'labels') l group by l->>'id' having count(*)>1
      ) then raise exception 'INVALID_WORKSHOP_SPATIAL: labels' using errcode = '22023'; end if;
      for label in select value from jsonb_array_elements(room->'labels') loop
        if jsonb_typeof(label) is distinct from 'object'
          or jsonb_typeof(label->'id') is distinct from 'string' or length(label->>'id') not between 1 and 128
          or jsonb_typeof(label->'text') is distinct from 'string' or (length(btrim(label->>'text')) = 0 or length(label->>'text') > 120 or (label->>'text') ~ '[[:cntrl:]]')
          or coalesce(label->>'color','') !~ '^#[0-9a-fA-F]{6}$'
          or coalesce(label->>'surface','') not in ('floor','north','east','south','west')
          or jsonb_typeof(label->'u') is distinct from 'number' or jsonb_typeof(label->'v') is distinct from 'number'
          or jsonb_typeof(label->'size') is distinct from 'number'
          or (label ? 'rotation' and jsonb_typeof(label->'rotation') is distinct from 'number') then
          raise exception 'INVALID_WORKSHOP_SPATIAL: label shape' using errcode = '22023';
        end if;
        if (label->>'u')::numeric not between 0 and 1 or (label->>'v')::numeric not between 0 and 1
          or (label->>'size')::numeric not between 0.1 and 10
          or (label ? 'rotation' and (label->>'rotation')::numeric not between -360 and 360) then
          raise exception 'INVALID_WORKSHOP_SPATIAL: label bounds' using errcode = '22023';
        end if;
      end loop;
    end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(rooms) r where r ? 'attachment'
    group by r#>>'{attachment,roomId}',r#>>'{attachment,side}' having count(*)>1) then
    raise exception 'INVALID_WORKSHOP_SPATIAL: occupied side' using errcode = '22023';
  end if;
  -- Legacy independent rooms are normalized by the client on first load.
  -- Once attachment metadata exists, enforce the same single tree as the client.
  if exists(select 1 from jsonb_array_elements(rooms) r where r ? 'attachment') then
    if (select count(*) from jsonb_array_elements(rooms) r where not r ? 'attachment')<>1 then
      raise exception 'INVALID_WORKSHOP_SPATIAL: root count' using errcode='22023';
    end if;
    if exists(select 1 from jsonb_array_elements(rooms) child
      join jsonb_array_elements(rooms) parent_room on parent_room->>'id'=child#>>'{attachment,roomId}'
      where child#>>'{attachment,side}'=case parent_room#>>'{attachment,side}'
        when 'north' then 'south' when 'south' then 'north' when 'east' then 'west' when 'west' then 'east' end) then
      raise exception 'INVALID_WORKSHOP_SPATIAL: parent-facing side' using errcode='22023';
    end if;
    if exists(
      with recursive origins as (
        select r->>'id' id, (r->>'width')::numeric w, (r->>'depth')::numeric d, 0::numeric x, 0::numeric z
          from jsonb_array_elements(rooms) r where not r ? 'attachment'
        union all
        select r->>'id', (r->>'width')::numeric, (r->>'depth')::numeric,
          p.x + case r#>>'{attachment,side}' when 'east' then (p.w+(r->>'width')::numeric)/2 when 'west' then -(p.w+(r->>'width')::numeric)/2 else 0 end,
          p.z + case r#>>'{attachment,side}' when 'south' then (p.d+(r->>'depth')::numeric)/2 when 'north' then -(p.d+(r->>'depth')::numeric)/2 else 0 end
          from origins p join jsonb_array_elements(rooms) r on r#>>'{attachment,roomId}'=p.id
      )
      select 1 from origins a join origins b on a.id<b.id
        where abs(a.x-b.x)<(a.w+b.w)/2-0.000001 and abs(a.z-b.z)<(a.d+b.d)/2-0.000001
    ) then raise exception 'INVALID_WORKSHOP_SPATIAL: overlap' using errcode='22023'; end if;
  end if;
end;
$$;
revoke all on function public.validate_workshop_spatial(jsonb) from public, anon;
grant execute on function public.validate_workshop_spatial(jsonb) to authenticated;

create or replace function public.get_workshop()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); result jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select jsonb_build_object('revision', r.revision, 'layout', jsonb_build_object(
    'version', 1,
    'rooms', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'width', width_m, 'depth', depth_m)
      || spatial_metadata
      || case when camera_x is null then '{}'::jsonb else jsonb_build_object('camera', jsonb_build_object('x', camera_x, 'y', camera_y, 'z', camera_z, 'span', camera_span) || jsonb_strip_nulls(jsonb_build_object('azimuth', camera_azimuth, 'top', camera_top))) end order by sort_order)
      from public.workshop_rooms where user_id = owner_id), '[]'::jsonb),
    'furniture', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'roomId', room_id, 'name', name, 'kind', kind,
      'x', x, 'z', z, 'rotation', rotation, 'width', width, 'depth', depth, 'height', height, 'levels', levels, 'columns', columns) order by sort_order)
      from public.workshop_furniture where user_id = owner_id), '[]'::jsonb),
    'slots', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'furnitureId', furniture_id, 'kind', kind, 'index', slot_index, 'x', x, 'y', y, 'z', z) order by sort_order)
      from public.workshop_slots where user_id = owner_id), '[]'::jsonb),
    'placements', coalesce((select jsonb_agg(item order by sort_order) from (
      select jsonb_build_object('id', id, 'entityId', printer_id, 'kind', kind, 'slotId', slot_id, 'model', model) item, sort_order
        from public.workshop_printer_placements where user_id = owner_id
      union all
      select jsonb_build_object('id', id, 'entityId', filament_id, 'kind', kind, 'slotId', slot_id, 'model', model), sort_order
        from public.workshop_filament_placements where user_id = owner_id
    ) placements), '[]'::jsonb)
  )) into result from public.workshop_revisions r where r.user_id = owner_id;
  return result;
end;
$$;

create or replace function public.save_workshop_spatial(payload jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); current_revision bigint; new_revision bigint; field text;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if payload is null or jsonb_typeof(payload) <> 'object' or payload->'version' is distinct from '1'::jsonb then
    raise exception 'INVALID_WORKSHOP' using errcode = '22023';
  end if;
  foreach field in array array['rooms', 'furniture', 'slots', 'placements'] loop
    if jsonb_typeof(payload->field) is distinct from 'array' then
      raise exception 'INVALID_WORKSHOP: % must be an array', field using errcode = '22023';
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(payload->'placements') p where p->>'kind' is null or p->>'kind' not in ('printer', 'filament')) then
    raise exception 'INVALID_WORKSHOP: placement kind' using errcode = '22023';
  end if;
  perform public.validate_workshop_spatial(payload->'rooms');
  -- Also serialize initial creates, for which no revision row exists yet.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('workshop:' || owner_id::text, 0));
  select revision into current_revision from public.workshop_revisions where user_id = owner_id for update;
  if current_revision is distinct from expected_revision then
    raise exception 'WORKSHOP_REVISION_CONFLICT' using errcode = '40001';
  end if;
  new_revision := coalesce(current_revision, 0) + 1;
  delete from public.workshop_rooms where user_id = owner_id;
  insert into public.workshop_rooms (id, user_id, name, width_m, depth_m, sort_order, camera_x, camera_y, camera_z, camera_span, camera_azimuth, camera_top, spatial_metadata)
  select (p->>'id')::uuid, owner_id, p->>'name', (p->>'width')::numeric, (p->>'depth')::numeric, n::integer,
    (p#>>'{camera,x}')::numeric, (p#>>'{camera,y}')::numeric, (p#>>'{camera,z}')::numeric, (p#>>'{camera,span}')::numeric, (p#>>'{camera,azimuth}')::numeric, (p#>>'{camera,top}')::boolean,
    (case when p ? 'attachment' then jsonb_build_object('attachment',p->'attachment') else '{}'::jsonb end)
    || (case when p ? 'labels' then jsonb_build_object('labels',p->'labels') else '{}'::jsonb end)
  from jsonb_array_elements(payload->'rooms') with ordinality a(p,n);
  insert into public.workshop_furniture (id, user_id, room_id, name, kind, x, z, rotation, width, depth, height, levels, columns, sort_order)
  select (p->>'id')::uuid, owner_id, (p->>'roomId')::uuid, p->>'name', p->>'kind', (p->>'x')::numeric, (p->>'z')::numeric,
    (p->>'rotation')::integer, (p->>'width')::numeric, (p->>'depth')::numeric, (p->>'height')::numeric,
    (p->>'levels')::integer, (p->>'columns')::integer, n::integer
  from jsonb_array_elements(payload->'furniture') with ordinality a(p,n);
  insert into public.workshop_slots (id, user_id, furniture_id, kind, slot_index, x, y, z, sort_order)
  select (p->>'id')::uuid, owner_id, (p->>'furnitureId')::uuid, p->>'kind', (p->>'index')::integer,
    (p->>'x')::numeric, (p->>'y')::numeric, (p->>'z')::numeric, n::integer
  from jsonb_array_elements(payload->'slots') with ordinality a(p,n);
  insert into public.workshop_printer_placements (id, user_id, printer_id, slot_id, model, sort_order)
  select (p->>'id')::uuid, owner_id, (p->>'entityId')::uuid, (p->>'slotId')::uuid, p->>'model', n::integer
  from jsonb_array_elements(payload->'placements') with ordinality a(p,n) where p->>'kind' = 'printer';
  insert into public.workshop_filament_placements (id, user_id, filament_id, slot_id, model, sort_order)
  select (p->>'id')::uuid, owner_id, (p->>'entityId')::uuid, (p->>'slotId')::uuid, p->>'model', n::integer
  from jsonb_array_elements(payload->'placements') with ordinality a(p,n) where p->>'kind' = 'filament';
  insert into public.workshop_revisions(user_id, revision) values (owner_id, new_revision)
    on conflict (user_id) do update set revision = excluded.revision;
  return new_revision;
end;
$$;

-- An old client must not erase metadata it does not understand. Serialize this
-- check with the versioned writer, then delegate to the same atomic CAS path.
create or replace function public.save_workshop(payload jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if jsonb_typeof(payload->'rooms') is distinct from 'array' then
    raise exception 'INVALID_WORKSHOP: rooms' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('workshop:' || owner_id::text, 0));
  if exists(
    select 1 from public.workshop_rooms existing
    where existing.user_id=owner_id and existing.spatial_metadata<>'{}'::jsonb
      and not exists(select 1 from jsonb_array_elements(payload->'rooms') incoming
        where incoming->>'id'=existing.id::text
          and (not existing.spatial_metadata ? 'attachment' or incoming ? 'attachment')
          and (not existing.spatial_metadata ? 'labels' or incoming ? 'labels'))
  ) then raise exception 'WORKSHOP_SPATIAL_CLIENT_REQUIRED' using errcode='22023'; end if;
  return public.save_workshop_spatial(payload,expected_revision);
end;
$$;

revoke all on function public.get_workshop() from public, anon;
revoke all on function public.save_workshop(jsonb, bigint) from public, anon;
grant execute on function public.get_workshop() to authenticated;
grant execute on function public.save_workshop(jsonb, bigint) to authenticated;

-- Versioned names are the capability handshake: old servers must never accept
-- a spatial save through the legacy API and silently discard room metadata.
create or replace function public.get_workshop_spatial()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select public.get_workshop();
$$;
revoke all on function public.get_workshop_spatial() from public, anon;
revoke all on function public.save_workshop_spatial(jsonb,bigint) from public, anon;
grant execute on function public.get_workshop_spatial() to authenticated;
grant execute on function public.save_workshop_spatial(jsonb,bigint) to authenticated;

commit;
