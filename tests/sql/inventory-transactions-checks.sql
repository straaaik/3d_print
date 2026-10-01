-- Run after foundation fixture + both migrations in a disposable local database.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare initial jsonb; next_state jsonb; committed jsonb; attempted jsonb;
begin
  initial := public.business_inventory_snapshot();
  assert (initial->>'revision')::bigint = 0;
  next_state := jsonb_set(initial, '{manufacturers}', jsonb_build_array(jsonb_build_object(
    'id','dddddddd-dddd-4ddd-8ddd-dddddddddddd','user_id',auth.uid(),'created_at',now(),'name','Maker')));
  committed := public.commit_business_inventory(0,'{"id":"first","kind":"saveManufacturer"}',next_state);
  assert (committed->>'revision')::bigint = 1;
  assert jsonb_array_length(committed->'manufacturers') = 1;
  assert public.commit_business_inventory(0,'{"id":"first","kind":"saveManufacturer"}',next_state) = committed,
    'retry must return committed state, not apply twice';
  begin
    perform public.commit_business_inventory(1,'{"id":"first","kind":"purchase"}',committed);
    raise exception 'Reused key with different command accepted';
  exception when raise_exception then
    if sqlerrm <> 'IDEMPOTENCY_KEY_REUSED' then raise; end if;
  end;
  begin
    perform public.commit_business_inventory(0,'{"id":"stale"}',committed);
    raise exception 'Stale revision accepted';
  exception when raise_exception then
    if sqlerrm <> 'BUSINESS_REVISION_CONFLICT' then raise; end if;
  end;
  attempted := jsonb_set(committed,'{manufacturers,0,name}','"Should roll back"');
  attempted := jsonb_set(attempted,'{variants}',jsonb_build_array(jsonb_build_object(
    'id','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','user_id',auth.uid(),'created_at',now(),
    'name','Invalid','color','#ffffff','stock_g',-1,'average_cost_per_g',1,'revision',0)));
  begin
    perform public.commit_business_inventory(1,'{"id":"invalid-stock"}',attempted);
    raise exception 'Invalid stock accepted';
  exception when check_violation then null; end;
  assert public.business_inventory_snapshot() = committed, 'Failed change partially committed';
  attempted := jsonb_set(committed,'{manufacturers}','[]');
  begin
    perform public.commit_business_inventory(1,'{"id":"delete"}',attempted);
    raise exception 'Missing existing row accepted';
  exception when raise_exception then
    if sqlerrm not like 'INVENTORY_DELETION_NOT_SUPPORTED:%' then raise; end if;
  end;
  attempted := jsonb_set(committed,'{manufacturers,0,user_id}','"22222222-2222-4222-8222-222222222222"');
  begin
    perform public.commit_business_inventory(1,'{"id":"cross-owner"}',attempted);
    raise exception 'Forged owner accepted';
  exception when raise_exception then
    if sqlerrm <> 'CROSS_OWNER_ROW' then raise; end if;
  end;
  -- Add an audit row then prove it cannot be edited even through the definer RPC.
  attempted := jsonb_set(committed,'{productionEvents}',jsonb_build_array(jsonb_build_object(
    'id','ffffffff-ffff-4fff-8fff-ffffffffffff','user_id',auth.uid(),'created_at',now(),
    'event_key','production-once','quantity',1,'unit_cost',12,'recipe_snapshot','{"version":1}'::jsonb)));
  committed := public.commit_business_inventory(1,'{"id":"production-once"}',attempted);
  attempted := jsonb_set(committed,'{productionEvents,0,unit_cost}','99');
  begin
    perform public.commit_business_inventory(2,'{"id":"rewrite-audit"}',attempted);
    raise exception 'Audit edit accepted';
  exception when raise_exception then
    if sqlerrm not like 'IMMUTABLE_AUDIT_ROW:%' then raise; end if;
  end;
  assert public.business_inventory_snapshot() = committed, 'Audit failure changed state';
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin
  assert jsonb_array_length(public.business_inventory_snapshot()->'manufacturers') = 0, 'Snapshot leaked another owner';
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform public.business_inventory_snapshot();
    raise exception 'Anonymous RPC accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Inventory transaction checks passed' as result;
