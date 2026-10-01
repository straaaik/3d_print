-- Phase 3: retain removed calculation positions as archived snapshots.
-- Run in Supabase Dashboard → SQL Editor after the foundation migration.
-- Existing transactional RPC persists this column via its generic collection writer.
begin;
alter table public.calculation_items
  add column if not exists archived boolean not null default false;
create or replace function public.business_save_calculation_project(p_expected_revision bigint, p_command jsonb, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  project_id uuid := (p_command#>>'{project,id}')::uuid;
  stored_command jsonb;
  previous_revision bigint;
  desired_revision bigint;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_command->>'kind' is distinct from 'saveProject' or p_command#>>'{project,user_id}' is distinct from owner_id::text
    or p_state->>'user_id' is distinct from owner_id::text or project_id is null then raise exception 'INVALID_PROJECT'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:' || owner_id::text,0));
  select command into stored_command from public.business_operation_receipts
    where user_id=owner_id and event_key=p_command->>'id';
  if found then
    if stored_command<>p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  select revision into previous_revision from public.calculation_projects where id=project_id and user_id=owner_id;
  if found and previous_revision is distinct from (p_command#>>'{project,revision}')::bigint
    then raise exception 'BUSINESS_PROJECT_REVISION_CONFLICT: local draft retained'; end if;
  desired_revision := case when previous_revision is null then 0 else previous_revision+1 end;
  if not exists(select from jsonb_array_elements(p_state->'projects') p where p->>'id'=project_id::text
    and p->>'user_id'=owner_id::text and (p->>'revision')::bigint=desired_revision)
    then raise exception 'INVALID_PROJECT_STATE'; end if;
  return public.commit_business_inventory(p_expected_revision,p_command,p_state);
end $$;
revoke all on function public.business_save_calculation_project(bigint,jsonb,jsonb) from public, anon;
grant execute on function public.business_save_calculation_project(bigint,jsonb,jsonb) to authenticated;
commit;
