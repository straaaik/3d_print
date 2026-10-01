-- Disposable test database only. Minimal legacy snapshot implementation matching
-- canonical delete/insert transaction order; production keeps its workshop logic.
create table if not exists public.printers(id uuid primary key,user_id uuid,name text);
create table if not exists public.settings(id uuid primary key,user_id uuid,currency text);
create table if not exists public.collections(id uuid primary key,user_id uuid,name text);
create table if not exists public.monthly_goals(id uuid primary key,user_id uuid,month_key text,target_amount numeric);
create or replace function public.legacy_restore_database_snapshot_unlocked(p_snapshot jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare relation_name text; owner_id uuid:=auth.uid();
begin
  foreach relation_name in array array['monthly_goals','orders','saved_calculations','collections','settings','filaments','printers'] loop
    execute format('delete from public.%I where user_id=$1',relation_name) using owner_id;
  end loop;
  foreach relation_name in array array['printers','filaments','settings','collections','saved_calculations','orders','monthly_goals'] loop
    execute format('insert into public.%1$I select r.* from jsonb_populate_recordset(null::public.%1$I,$1) r',relation_name)
      using p_snapshot->relation_name;
  end loop;
end $$;
revoke all on function public.legacy_restore_database_snapshot_unlocked(jsonb) from public,anon,authenticated;
