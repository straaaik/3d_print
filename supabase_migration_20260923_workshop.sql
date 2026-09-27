-- Workshop v1. Run in Supabase Dashboard > SQL Editor after the canonical schema.
-- No inventory records are created, copied or deleted by these RPCs.
begin;

create unique index if not exists printers_id_owner_unique on public.printers(id, user_id);
create unique index if not exists filaments_id_owner_unique on public.filaments(id, user_id);

create table if not exists public.workshop_revisions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision > 0)
);
create table if not exists public.workshop_rooms (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  width_m numeric not null check (width_m between 4 and 40),
  depth_m numeric not null check (depth_m between 4 and 40),
  sort_order integer not null,
  camera_x numeric, camera_y numeric, camera_z numeric, camera_span numeric,
  unique (id, user_id),
  check ((camera_x is null and camera_y is null and camera_z is null and camera_span is null)
    or (camera_x is not null and camera_y is not null and camera_z is not null and camera_span is not null
      and camera_x between -100000 and 100000 and camera_y between -100000 and 100000
      and camera_z between -100000 and 100000 and camera_span > 0 and camera_span < 100000))
);
alter table public.workshop_rooms add column if not exists camera_azimuth numeric check (camera_azimuth between -1000 and 1000);
alter table public.workshop_rooms add column if not exists camera_top boolean;
create table if not exists public.workshop_furniture (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null,
  name text not null,
  kind text not null check (kind in ('table', 'printer_rack', 'filament_rack')),
  x numeric not null check (x between -100000 and 100000),
  z numeric not null check (z between -100000 and 100000),
  rotation integer not null check (rotation in (0, 90, 180, 270)),
  width numeric not null check (width > 0 and width < 100000),
  depth numeric not null check (depth > 0 and depth < 100000),
  height numeric not null check (height > 0 and height < 100000),
  levels integer not null check (levels > 0),
  columns integer not null check (columns > 0),
  sort_order integer not null,
  unique (id, user_id),
  foreign key (room_id, user_id) references public.workshop_rooms(id, user_id) on delete cascade
);
create table if not exists public.workshop_slots (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  furniture_id uuid not null,
  kind text not null check (kind in ('printer', 'filament')),
  slot_index integer not null check (slot_index >= 0),
  x numeric not null check (x between -100000 and 100000),
  y numeric not null check (y between -100000 and 100000),
  z numeric not null check (z between -100000 and 100000),
  sort_order integer not null,
  unique (id, user_id, kind),
  unique (furniture_id, kind, slot_index),
  foreign key (furniture_id, user_id) references public.workshop_furniture(id, user_id) on delete cascade
);
create table if not exists public.workshop_printer_placements (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  printer_id uuid not null,
  slot_id uuid not null unique,
  kind text not null default 'printer' check (kind = 'printer'),
  model text not null check (model in ('a1', 'p1')),
  sort_order integer not null,
  unique (printer_id, user_id),
  foreign key (printer_id, user_id) references public.printers(id, user_id) on delete cascade,
  foreign key (slot_id, user_id, kind) references public.workshop_slots(id, user_id, kind) on delete cascade
);
create table if not exists public.workshop_filament_placements (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  filament_id uuid not null,
  slot_id uuid not null unique,
  kind text not null default 'filament' check (kind = 'filament'),
  model text not null check (model in ('a1', 'p1')),
  sort_order integer not null,
  unique (filament_id, user_id),
  foreign key (filament_id, user_id) references public.filaments(id, user_id) on delete cascade,
  foreign key (slot_id, user_id, kind) references public.workshop_slots(id, user_id, kind) on delete cascade
);

create index if not exists workshop_rooms_owner on public.workshop_rooms(user_id);
create index if not exists workshop_furniture_owner on public.workshop_furniture(user_id);
create index if not exists workshop_furniture_room on public.workshop_furniture(room_id, user_id);
create index if not exists workshop_slots_owner on public.workshop_slots(user_id);
create index if not exists workshop_printers_owner on public.workshop_printer_placements(user_id);
create index if not exists workshop_filaments_owner on public.workshop_filament_placements(user_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['workshop_revisions', 'workshop_rooms', 'workshop_furniture',
    'workshop_slots', 'workshop_printer_placements', 'workshop_filament_placements'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists workshop_owner on public.%I', table_name);
    execute format('create policy workshop_owner on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
  end loop;
end;
$$;

create or replace function public.get_workshop()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); result jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select jsonb_build_object('revision', r.revision, 'layout', jsonb_build_object(
    'version', 1,
    'rooms', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'width', width_m, 'depth', depth_m)
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

create or replace function public.save_workshop(payload jsonb, expected_revision bigint)
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
  -- Also serialize initial creates, for which no revision row exists yet.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('workshop:' || owner_id::text, 0));
  select revision into current_revision from public.workshop_revisions where user_id = owner_id for update;
  if current_revision is distinct from expected_revision then
    raise exception 'WORKSHOP_REVISION_CONFLICT' using errcode = '40001';
  end if;
  new_revision := coalesce(current_revision, 0) + 1;
  delete from public.workshop_rooms where user_id = owner_id;
  insert into public.workshop_rooms (id, user_id, name, width_m, depth_m, sort_order, camera_x, camera_y, camera_z, camera_span, camera_azimuth, camera_top)
  select (p->>'id')::uuid, owner_id, p->>'name', (p->>'width')::numeric, (p->>'depth')::numeric, n::integer,
    (p#>>'{camera,x}')::numeric, (p#>>'{camera,y}')::numeric, (p#>>'{camera,z}')::numeric, (p#>>'{camera,span}')::numeric, (p#>>'{camera,azimuth}')::numeric, (p#>>'{camera,top}')::boolean
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

revoke all on function public.get_workshop() from public, anon;
revoke all on function public.save_workshop(jsonb, bigint) from public, anon;
grant execute on function public.get_workshop() to authenticated;
grant execute on function public.save_workshop(jsonb, bigint) to authenticated;
create or replace function public.restore_database_snapshot(p_snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  section_name text;
  workshop_printers jsonb;
  workshop_filaments jsonb;
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_snapshot) is distinct from 'object' then raise exception 'INVALID_DATABASE_SNAPSHOT'; end if;
  perform pg_advisory_xact_lock(hashtextextended('restore_database_snapshot:' || current_user_id::text, 0));
  -- Preserve spatial links when inventory records are replaced with the same IDs.
  perform pg_advisory_xact_lock(hashtextextended('workshop:' || current_user_id::text, 0));
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into workshop_printers
    from public.workshop_printer_placements p where p.user_id = current_user_id;
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into workshop_filaments
    from public.workshop_filament_placements p where p.user_id = current_user_id;


  foreach section_name in array array[
    'printers', 'filaments', 'settings', 'collections',
    'saved_calculations', 'orders', 'monthly_goals'
  ]
  loop
    if p_snapshot ? section_name and jsonb_typeof(p_snapshot->section_name) <> 'array' then
      raise exception 'INVALID_DATABASE_SNAPSHOT_SECTION: %', section_name;
    end if;
  end loop;

  if p_snapshot ? 'monthly_goals' then
    delete from public.monthly_goals where user_id = current_user_id;
  end if;
  if p_snapshot ? 'orders' then
    delete from public.orders where user_id = current_user_id;
  end if;
  if p_snapshot ? 'saved_calculations' then
    delete from public.saved_calculations where user_id = current_user_id;
  end if;
  if p_snapshot ? 'collections' then
    delete from public.collections where user_id = current_user_id;
  end if;
  if p_snapshot ? 'settings' then
    delete from public.settings where user_id = current_user_id;
  end if;
  if p_snapshot ? 'filaments' then
    delete from public.filaments where user_id = current_user_id;
  end if;
  if p_snapshot ? 'printers' then
    delete from public.printers where user_id = current_user_id;
  end if;

  if p_snapshot ? 'printers' then
    insert into public.printers
    select (jsonb_populate_record(
      null::public.printers,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'printers') as source(item);
  end if;

  if p_snapshot ? 'filaments' then
    insert into public.filaments
    select (jsonb_populate_record(
      null::public.filaments,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'filaments') as source(item);
  end if;

  if p_snapshot ? 'settings' then
    if exists (
      select 1 from jsonb_array_elements(p_snapshot->'settings') as source(item)
      where nullif(item->>'default_printer_id', '') is not null
        and not exists (
          select 1 from public.printers
          where id = (item->>'default_printer_id')::uuid and user_id = current_user_id
        )
    ) then raise exception 'PRINTER_FORBIDDEN'; end if;
    insert into public.settings
    select (jsonb_populate_record(
      null::public.settings,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'updated_at', coalesce(nullif(item->>'updated_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'settings') as source(item);
  end if;

  if p_snapshot ? 'collections' then
    insert into public.collections
    select (jsonb_populate_record(
      null::public.collections,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'collections') as source(item);
  end if;

  if p_snapshot ? 'saved_calculations' then
    insert into public.saved_calculations
    select (jsonb_populate_record(
      null::public.saved_calculations,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'saved_calculations') as source(item);
  end if;

  if p_snapshot ? 'orders' then
    insert into public.orders
    select (jsonb_populate_record(
      null::public.orders,
      jsonb_build_object('quantity', 1) || (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'orders') as source(item);

    insert into public.order_counters as counters (user_id, next_number)
    values (
      current_user_id,
      greatest(
        coalesce((select max(order_number) + 1 from public.orders where user_id = current_user_id), 1001),
        1001
      )
    )
    on conflict (user_id) do update set next_number = excluded.next_number;
  end if;

  if p_snapshot ? 'monthly_goals' then
    insert into public.monthly_goals
    select (jsonb_populate_record(
      null::public.monthly_goals,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now()),
        'updated_at', coalesce(nullif(item->>'updated_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'monthly_goals') as source(item);
  end if;

  if p_snapshot ? 'printers' then
    insert into public.workshop_printer_placements
    select p.* from jsonb_populate_recordset(null::public.workshop_printer_placements, workshop_printers) p
    where exists(select 1 from public.printers i where i.id=p.printer_id and i.user_id=current_user_id);
  end if;
  if p_snapshot ? 'filaments' then
    insert into public.workshop_filament_placements
    select p.* from jsonb_populate_recordset(null::public.workshop_filament_placements, workshop_filaments) p
    where exists(select 1 from public.filaments i where i.id=p.filament_id and i.user_id=current_user_id);
  end if;
  if p_snapshot ? 'printers' or p_snapshot ? 'filaments' then
    update public.workshop_revisions set revision=revision+1 where user_id=current_user_id;
  end if;
end;
$$;

revoke all on function public.restore_database_snapshot(jsonb) from public, anon;
grant execute on function public.restore_database_snapshot(jsonb) to authenticated;
commit;
