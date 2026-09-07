-- Выполнить в Supabase Dashboard -> SQL Editor.
-- Замена снимка атомарна: при любой ошибке вся функция откатывается.
create or replace function public.restore_database_snapshot(p_snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  section_name text;
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_snapshot) is distinct from 'object' then raise exception 'INVALID_DATABASE_SNAPSHOT'; end if;
  perform pg_advisory_xact_lock(hashtextextended('restore_database_snapshot:' || current_user_id::text, 0));

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
end;
$$;

revoke all on function public.restore_database_snapshot(jsonb) from public;
grant execute on function public.restore_database_snapshot(jsonb) to authenticated;
