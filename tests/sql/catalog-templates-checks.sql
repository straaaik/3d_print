-- Disposable database only, after legacy fixture and all stage 1–4 migrations.
alter table public.saved_calculations add column name text not null default 'Historical';
alter table public.saved_calculations add column created_at timestamptz not null default now();
insert into public.finished_stock_balances(user_id,product_id,source_product_id,quantity,average_unit_cost)
values ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',2,444);
grant select on public.saved_calculations to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare
 s jsonb := public.business_inventory_snapshot(); prepared jsonb; c jsonb; result jsonb;
 original jsonb := s; product jsonb; balance jsonb; new_id text := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
begin
 product := s->'legacyProducts'->0;
 c := jsonb_build_object('id','catalog-edit','kind','saveCatalogProduct','isNew',false,'expectedRevision',0,'product',product);
 prepared := jsonb_set(s,'{legacyProducts,0}',product||'{"name":"Edited","catalog_revision":1,"stock_quantity":999,"final_price":700,"agreed_price":0}');
 result := public.business_apply_catalog(0,c,prepared);
 assert result#>>'{legacyProducts,0,name}'='Edited';
 assert (result#>>'{legacyProducts,0,stock_quantity}')::integer=2;
 assert (result#>>'{legacyProducts,0,agreed_price}')::numeric=0;
 assert result->'finishedBalances'=original->'finishedBalances';
 assert result->'finishedMovements'=original->'finishedMovements';
 assert result->'productionEvents'=original->'productionEvents';
 assert public.business_apply_catalog(0,c,prepared)=result, 'Receipt not checked before revisions';
 begin
   perform public.business_apply_catalog(1,c||'{"id":"stale-editor"}',prepared);
   raise exception 'Stale editor accepted';
 exception when raise_exception then if sqlerrm not like 'BUSINESS_CATALOG_REVISION_CONFLICT:%' then raise; end if; end;
 c := jsonb_build_object('id','catalog-clear','kind','saveCatalogProduct','isNew',false,'expectedRevision',1,'product',result->'legacyProducts'->0);
 prepared := jsonb_set(result,'{legacyProducts,0}',(result->'legacyProducts'->0)||'{"catalog_revision":2,"agreed_price":null}');
 result := public.business_apply_catalog(1,c,prepared);
 assert result#>'{legacyProducts,0,agreed_price}'='null'::jsonb, 'Override not cleared';
 c := '{"id":"archive","kind":"archiveCatalogProducts","productIds":["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]}';
 prepared := jsonb_set(result,'{legacyProducts,0}',(result->'legacyProducts'->0)||'{"catalog_revision":3,"catalog_archived":true}');
 result := public.business_apply_catalog(2,c,prepared);
 assert result#>>'{legacyProducts,0,catalog_archived}'='true';
 assert result->'finishedBalances'=original->'finishedBalances';
 c := jsonb_build_object('id','undo','kind','restoreCatalog','products',original->'legacyProducts');
 prepared := jsonb_set(result,'{legacyProducts,0}',product||'{"catalog_revision":4,"catalog_archived":false,"stock_quantity":0}');
 result := public.business_apply_catalog(3,c,prepared);
 assert result#>>'{legacyProducts,0,name}'='Historical';
 assert (result#>>'{legacyProducts,0,stock_quantity}')::integer=2;
 assert result->'finishedBalances'=original->'finishedBalances';
 assert result->'finishedMovements'=original->'finishedMovements';
 -- Invalid inventory after metadata write must roll back the template as well.
 c := jsonb_build_object('id','bad-stock','kind','saveCatalogProduct','isNew',false,'expectedRevision',4,'product',result->'legacyProducts'->0);
 prepared := jsonb_set(result,'{legacyProducts,0}',(result->'legacyProducts'->0)||'{"catalog_revision":5,"name":"Should rollback"}');
 prepared := jsonb_set(prepared,'{finishedBalances,0,quantity}','3');
 begin
   perform public.business_apply_catalog(4,c,prepared);
   raise exception 'Catalog changed physical stock';
 exception when raise_exception then if sqlerrm<>'CATALOG_CHANGED_INVENTORY' then raise; end if; end;
 assert public.business_inventory_snapshot()=result;
 -- New template and its opening balance are inserted in dependency order.
 product := (result->'legacyProducts'->0)||jsonb_build_object('id',new_id,'catalog_revision',0,'name','New','base_cost',100,'quantity',2,'stock_quantity',3);
 c := jsonb_build_object('id','new-product','kind','saveCatalogProduct','isNew',true,'expectedRevision',0,'product',product);
 balance := jsonb_build_object('id',new_id,'user_id',auth.uid(),'created_at',now(),'product_id',new_id,
   'source_product_id',new_id,'quantity',3,'average_unit_cost',50,'revision',0);
 prepared := jsonb_set(result,'{legacyProducts}',(result->'legacyProducts')||jsonb_build_array(product));
 prepared := jsonb_set(prepared,'{finishedBalances}',(result->'finishedBalances')||jsonb_build_array(balance));
 prepared := jsonb_set(prepared,'{finishedMovements}',jsonb_build_array(jsonb_build_object(
  'id','dddddddd-dddd-4ddd-8ddd-dddddddddd01','user_id',auth.uid(),'created_at',now(),'product_id',new_id,
  'source_product_id',new_id,'event_key','opening:finished:'||new_id,'source','opening_balance',
  'delta_quantity',3,'unit_cost',50,'balance_after',3,'order_item_id',null,'production_event_id',null)));
 result := public.business_apply_catalog(4,c,prepared);
 assert jsonb_array_length(result->'legacyProducts')=2;
 assert jsonb_array_length(result->'finishedBalances')=2;
 assert jsonb_array_length(result->'finishedMovements')=1;
 assert result->'filamentMovements'=original->'filamentMovements';
 assert result->'productionEvents'=original->'productionEvents';
 begin
   perform public.business_apply_catalog(0,c||'{"id":"wrong-cas"}',prepared);
   raise exception 'Wrong CAS accepted';
 exception when raise_exception then if sqlerrm<>'BUSINESS_REVISION_CONFLICT' then raise; end if; end;
 begin
   perform public.business_apply_catalog(5,c||'{"id":"foreign-owner"}',jsonb_set(prepared,'{user_id}','"22222222-2222-4222-8222-222222222222"'));
   raise exception 'Foreign owner accepted';
 exception when raise_exception then if sqlerrm<>'INVALID_CATALOG_COMMAND' then raise; end if; end;
 assert public.business_inventory_snapshot()=result;
 -- Targeted Undo never archives a concurrently-created template, and stale Undo conflicts.
 c := jsonb_build_object('id','targeted-undo','kind','restoreCatalog','products',original->'legacyProducts',
   'productIds',jsonb_build_array('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
   'expectedRevisions',jsonb_build_object('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',4));
 prepared := jsonb_set(result,'{legacyProducts,0}',(result->'legacyProducts'->0)||'{"catalog_revision":5,"name":"Targeted"}');
 result := public.business_apply_catalog(5,c,prepared);
 assert (select count(*) from jsonb_array_elements(result->'legacyProducts') p
   where p->>'id'=new_id and p->>'catalog_archived'='false')=1;
 begin
   perform public.business_apply_catalog(6,c||'{"id":"stale-undo"}',prepared);
   raise exception 'Stale Undo accepted';
 exception when raise_exception then if sqlerrm not like 'BUSINESS_CATALOG_REVISION_CONFLICT:%' then raise; end if; end;
 assert public.business_inventory_snapshot()=result;
 begin
   perform public.business_apply_catalog(6,(c-'kind')||'{"id":"missing-kind"}',result);
   raise exception 'Missing command kind accepted';
 exception when raise_exception then if sqlerrm<>'INVALID_CATALOG_COMMAND' then raise; end if; end;
 c := jsonb_build_object('id','bad-snapshot','kind','saveCatalogProduct','isNew',false,'expectedRevision',5,'product',result->'legacyProducts'->0);
 prepared := jsonb_set(result,'{legacyProducts,0}',(result->'legacyProducts'->0)||'{"catalog_revision":6,"calculation_snapshot":{"version":1,"inputs":{}}}');
 begin
   perform public.business_apply_catalog(6,c,prepared);
   raise exception 'Incomplete snapshot accepted';
 exception when check_violation then null; end;
 assert public.business_inventory_snapshot()=result;
end $$;
reset role;
select 'Catalog checks passed';
