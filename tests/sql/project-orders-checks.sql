-- Disposable local database only. Run after legacy bridge fixture + all phase 1–3 migrations.
grant select on public.orders to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare
  initial jsonb := public.business_inventory_snapshot();
  prepared jsonb;
  committed jsonb;
  payload jsonb;
  head jsonb;
  draft_items jsonb := '[]';
  ids jsonb := '[]';
  rows jsonb := '[]';
  item jsonb;
  snapshot jsonb;
  i integer;
  project_id uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  test_order_id uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  calc_id uuid;
  item_id uuid;
  project_command jsonb;
begin
  prepared := jsonb_set(initial,'{projects}',jsonb_build_array(jsonb_build_object(
    'id',project_id,'user_id',auth.uid(),'created_at',now(),'name','Three independent parts','revision',0,
    'discount_percent',0,'discount_amount',0,'urgency_percent',0,'urgency_amount',0,'agreed_price',0)));
  for i in 1..3 loop
    calc_id := ('33333333-3333-4333-8333-33333333333'||i)::uuid;
    item_id := ('44444444-4444-4444-8444-44444444444'||i)::uuid;
    prepared := jsonb_set(prepared,'{calculationItems}',(prepared->'calculationItems')||jsonb_build_array(jsonb_build_object(
      'id',calc_id,'user_id',auth.uid(),'created_at',now(),'project_id',project_id,'product_id',null,
      'name','Part '||i,'sort_order',i-1,'quantity',i,'inputs','{}'::jsonb,'result','{}'::jsonb,'recipe','{}'::jsonb,'archived',false)));
    snapshot := jsonb_build_object('version',1,'order',jsonb_build_object('type','income','amount',i*20,'cost',i*10));
    item := jsonb_build_object('id',item_id,'user_id',auth.uid(),'created_at',now(),'order_id',test_order_id,
      'source_order_id',test_order_id::text,'product_id',null,'name','Part '||i,'quantity',i,'unit_cost',10,
      'total_cost',i*10,'unit_price',20,'total_price',i*20,'cost_provenance','estimate',
      'fulfilled_quantity',0,'production_quantity',0,'snapshot',snapshot,'legacy_key',null);
    rows := rows||jsonb_build_array(item);
    ids := ids||jsonb_build_array(item_id);
    draft_items := draft_items||jsonb_build_array(jsonb_build_object('calculation_item_id',calc_id,
      'name','Part '||i,'quantity',i,'snapshot',snapshot));
  end loop;
  prepared := public.commit_business_inventory((initial->>'revision')::bigint,'{"id":"project-seed","kind":"saveProject"}',prepared);
  project_command := jsonb_build_object('id','project-update','kind','saveProject','project',prepared->'projects'->0);
  prepared := jsonb_set(prepared,'{projects,0,revision}','1');
  prepared := public.business_save_calculation_project((prepared->>'revision')::bigint,project_command,prepared);
  assert (prepared#>>'{projects,0,revision}')::integer=1;
  begin
    perform public.business_save_calculation_project((prepared->>'revision')::bigint,
      project_command||'{"id":"stale-project"}',prepared);
    raise exception 'Stale project overwritten';
  exception when raise_exception then if sqlerrm not like 'BUSINESS_PROJECT_REVISION_CONFLICT:%' then raise; end if; end;
  assert public.business_save_calculation_project(0,project_command,prepared)=prepared, 'Project retry missed receipt';
  head := jsonb_build_object('id',test_order_id,'user_id',auth.uid(),'title','Project order','type','income',
    'quantity',6,'amount',0,'agreed_price',0,'cost',60,'payment',0,'status','Не в работе');
  payload := jsonb_build_object('id','project-order','kind','createProjectOrder','order',head,'itemIds',ids,
    'draft',jsonb_build_object('projectId',project_id,'items',draft_items));
  prepared := jsonb_set(prepared,'{orderItems}',(prepared->'orderItems')||rows);
  -- Generic writer failure occurs after inserting the legacy head; both must roll back.
  begin
    perform public.business_create_project_order((prepared->>'revision')::bigint,payload,
      jsonb_set(prepared,'{variants}',jsonb_build_array(jsonb_build_object('id','55555555-5555-4555-8555-555555555555',
        'user_id',auth.uid(),'created_at',now(),'name','Bad stock','color','#fff','stock_g',-1,'average_cost_per_g',1,'revision',0))));
    raise exception 'Invalid stock accepted';
  exception when check_violation then null; end;
  assert not exists(select from public.orders where id=test_order_id), 'Partial order head survived rollback';
  assert not exists(select from public.order_items where source_order_id=test_order_id::text), 'Partial items survived rollback';
  assert not exists(select from public.business_operation_receipts where user_id=auth.uid() and event_key='project-order');
  begin
    perform public.business_create_project_order((prepared->>'revision')::bigint,payload||'{"order":{"user_id":"22222222-2222-4222-8222-222222222222"}}',prepared);
    raise exception 'Foreign order accepted';
  exception when raise_exception then if sqlerrm<>'INVALID_PROJECT_ORDER' then raise; end if; end;
  committed := public.business_create_project_order((prepared->>'revision')::bigint,payload,prepared);
  assert (select count(*) from public.orders where id=test_order_id)=1;
  assert (select amount from public.orders where id=test_order_id)=0;
  assert (select agreed_price from public.orders where id=test_order_id)=0;
  assert (select cost from public.orders where id=test_order_id)=60;
  assert (select count(*) from public.order_items where source_order_id=test_order_id::text)=3;
  assert (select sum(quantity) from public.order_items where source_order_id=test_order_id::text)=6;
  assert (select sum(total_cost) from public.order_items where source_order_id=test_order_id::text)=60;
  assert not exists(select from public.production_events where order_item_id in (select id from public.order_items where source_order_id=test_order_id::text));
  assert public.business_create_project_order(0,payload,prepared)=committed, 'Repeat did not reach receipt first';
  begin
    perform public.business_create_project_order((committed->>'revision')::bigint,jsonb_set(payload,'{order,title}','"Changed"'),committed);
    raise exception 'Reused event key accepted';
  exception when raise_exception then if sqlerrm<>'IDEMPOTENCY_KEY_REUSED' then raise; end if; end;
  assert (select count(*) from public.orders where id=test_order_id)=1;
  assert not has_function_privilege('anon','public.business_create_project_order(bigint,jsonb,jsonb)','execute');
  raise notice 'Project order checks passed (17 assertions, rollback, ownership, idempotency, project conflict)';
end $$;
reset role;

