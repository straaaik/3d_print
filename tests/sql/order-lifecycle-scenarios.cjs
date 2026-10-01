/* eslint-disable @typescript-eslint/no-require-imports -- Node fixture runner loads disposable compiled CommonJS core. */
// Run ONLY against a disposable PostgreSQL fixture. Never a cloud/project database.
// Args: compiled shared/lib directory, psql executable, disposable DB name, port.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const [libDir, psql, database, port = '55439'] = process.argv.slice(2);
if (!libDir || !psql || !database?.startsWith('orders_')) throw new Error('Disposable orders_ database required');
const { applyBusinessOrderCommand, reserveOrderItems } = require(path.resolve(libDir, 'businessOrders.js'));
const { applyCalculationProjectCommand, createProjectOrderDraft } = require(path.resolve(libDir, 'calculationProjects.js'));
const { applyProjectOrderCommand } = require(path.resolve(libDir, 'projectOrders.js'));
const { applyInventoryCommand } = require(path.resolve(libDir, 'inventoryEngine.js'));
const { calculatePrintCost } = require(path.resolve(libDir, 'formulas.js'));
const owner = '11111111-1111-4111-8111-111111111111';
const at = '2026-10-01T00:00:00.000Z';
const productId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const orderId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const itemId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const variantId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const literal = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
function sql(query) {
  const response = spawnSync(psql, ['-h','127.0.0.1','-p',port,'-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1','-f','-'], {
    encoding:'utf8', env:{...process.env,PGCLIENTENCODING:'UTF8'},
    input:`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false); ${query}` });
  if (response.status !== 0) throw new Error(response.stderr);
  return response.stdout.trim().split(/\r?\n/).at(-1);
}
const snapshot = () => JSON.parse(sql('select public.business_inventory_snapshot();'));
const normalize = state => ({...state,
  legacyOrders: state.legacyOrders.map(order => { const head={...order}; delete head.items; return {...head,order_revision:head.order_revision ?? 0,order_archived:head.order_archived ?? false}; }),
  orderItems:state.orderItems.map(item => ({...item,reserved_quantity:item.reserved_quantity ?? 0,returned_quantity:item.returned_quantity ?? 0,archived:item.archived ?? false}))});
const call = (revision, command, prepared, rpc='business_apply_order') => JSON.parse(sql(
  `select public.${rpc}(${revision},${literal(command)},${literal(normalize(prepared))});`));
let checks = 0;
function equal(actual, expected) { assert.deepEqual(actual, expected); checks++; }
function rejects(command, prepared, pattern, revision=state.revision) {
  const before = snapshot();
  assert.throws(()=>call(revision,command,prepared),pattern); checks++;
  equal(snapshot(),before);
}
let state = snapshot();
const inputs = {weightG:50,quantity:5,hours:0,minutes:0,laborMinutes:0,defectPercent:0,agreedPrice:500,
  filament:{id:variantId,user_id:owner,name:'PLA',weight_g:1000,price:2000},printer:null,settings:null};
const result = calculatePrintCost(inputs);
const recipe = {version:1,materials:[{variant_id:variantId,grams_per_unit:10}],non_material_unit_cost:0,
  product_snapshot:state.legacyProducts.find(p=>p.id===productId)};
const order = {id:orderId,user_id:owner,created_at:at,title:'Five parts',type:'income',date:'01.10.2026',
  status:'Не в работе',quantity:5,base_amount:500,amount:500,cost:100,payment:0,payments:[],
  agreed_price:500,client:'',contact:'',deadline:'',notes:''};
const item = {id:itemId,user_id:owner,created_at:at,order_id:orderId,source_order_id:orderId,product_id:productId,
  name:'Part',quantity:5,unit_cost:20,total_cost:100,unit_price:100,total_price:500,cost_provenance:'estimate',
  fulfilled_quantity:0,production_quantity:0,legacy_key:null,snapshot:{version:1,order:{},calculation:{inputs,result},recipe}};
const create = {id:'order-create',kind:'saveBusinessOrder',occurredAt:at,order,items:[item],expectedRevision:0,isNew:true};
const prepared = applyBusinessOrderCommand(state,create);
state = call(state.revision,create,prepared);
equal(state.finishedBalances[0].quantity,0);
equal(state.orderItems.find(i=>i.id===itemId).reserved_quantity,2);
equal(state.orderItems.find(i=>i.id===itemId).fulfilled_quantity,2);
equal(state.legacyOrders.find(o=>o.id===orderId).cost,80);
equal(state.productionEvents.length,0);
equal(call(0,create,prepared),state); // Receipt precedes stale owner/head checks.
rejects({...create,id:'stale-edit',isNew:false,expectedRevision:99},state,/BUSINESS_ORDER_REVISION_CONFLICT/);
// Produce one stock unit after creation: material is consumed here, not twice later.
const stockProduction = {id:'stock-plus-one',kind:'produce',occurredAt:at,productId,quantity:1,recipe};
state = call(state.revision,stockProduction,applyInventoryCommand(state,stockProduction),'commit_business_inventory');
equal(state.variants[0].stock_g,15);
equal(state.finishedBalances[0].quantity,1);
const finished = {...state.legacyOrders.find(o=>o.id===orderId),status:'Готово'};
const print = {id:'direct-done',kind:'saveBusinessOrder',occurredAt:at,order:finished,
  expectedRevision:finished.order_revision,isNew:false};
state = call(state.revision,print,applyBusinessOrderCommand(state,print));
equal(state.variants[0].stock_g,0);
equal(state.deficits.reduce((n,d)=>n+d.grams,0),5);
equal(state.productionEvents.map(p=>p.quantity).sort(),[1,2]);
equal(state.orderItems.find(i=>i.id===itemId).production_quantity,2);
equal(state.orderItems.find(i=>i.id===itemId).reserved_quantity,3);
equal(state.orderItems.find(i=>i.id===itemId).fulfilled_quantity,5);
equal(state.legacyOrders.find(o=>o.id===orderId).cost,80);
const immutableRecipe = state.orderItems.find(i=>i.id===itemId).snapshot;
const printedEvents = state.productionEvents.length;
const afterPrint = structuredClone(state);
const printedHead=state.legacyOrders.find(o=>o.id===orderId);
const auditSave={id:'audit-cost',kind:'saveBusinessOrder',occurredAt:at,order:{...printedHead,cost:0},
  expectedRevision:printedHead.order_revision,isNew:false};
const fabricatedCost=structuredClone(state);
Object.assign(fabricatedCost.legacyOrders.find(o=>o.id===orderId),{cost:0,order_revision:printedHead.order_revision+1});
Object.assign(fabricatedCost.orderItems.find(i=>i.id===itemId),{total_cost:0,unit_cost:0});
rejects(auditSave,fabricatedCost,/IMMUTABLE_ORDER_ACTUAL_COST/);
const addedId='ffffffff-ffff-4fff-8fff-ffffffffff99';
const extra={...item,id:addedId};
const appended=structuredClone(state);
appended.orderItems.push(extra);
Object.assign(appended.legacyOrders.find(o=>o.id===orderId),{quantity:10,cost:180,amount:1000,order_revision:printedHead.order_revision+1});
rejects({...auditSave,id:'audit-add-after-print',order:{...printedHead,quantity:10,cost:180,amount:1000},
  items:[state.orderItems.find(i=>i.id===itemId),extra]},appended,/PRINTED_ORDER_ITEMS_CANNOT_BE_REPLACED/);
const genericTamper=structuredClone(state);
genericTamper.orderItems.find(i=>i.id===itemId).snapshot.calculation.inputs.weightG=999;
assert.throws(()=>call(state.revision,{id:'generic-bypass',kind:'purchase',occurredAt:at},genericTamper,'commit_business_inventory'),/ORDER_ITEMS_REQUIRE_ATOMIC_API/); checks++;
equal(snapshot(),state);
assert.throws(()=>sql(`update public.order_items set total_cost=0 where id='${itemId}';`),/permission denied/);checks++;
equal(sql("select has_function_privilege('authenticated','public.business_commit_inventory_internal(bigint,jsonb,jsonb)','execute');"),'f');
const fakeCounters=structuredClone(state);
fakeCounters.orderItems.find(i=>i.id===itemId).production_quantity=5;
fakeCounters.legacyOrders.find(o=>o.id===orderId).order_revision++;
rejects({...auditSave,id:'audit-counters',order:printedHead},fakeCounters,/ORDER_ALLOCATION_COUNTERS_DO_NOT_MATCH_LEDGER/);
for (const [index,status] of ['Не в работе','Печать','Готово'].entries()) {
  const head = {...state.legacyOrders.find(o=>o.id===orderId),status,payment:120};
  const command = {id:`status-again-${index}`,kind:'saveBusinessOrder',occurredAt:at,order:head,expectedRevision:head.order_revision,isNew:false};
  state=call(state.revision,command,applyBusinessOrderCommand(state,command));
  equal(state.productionEvents.length,printedEvents);
  equal(state.variants[0].stock_g,0);
  equal(state.orderItems.find(i=>i.id===itemId).snapshot,immutableRecipe);
}
equal(call(0,print,state),state); // Lost print response, followed by later edits, still reaches receipt.
rejects({...print,order:{...print.order,payment:999}},state,/IDEMPOTENCY_KEY_REUSED/);
const tampered = structuredClone(state);
tampered.orderItems.find(i=>i.id===itemId).snapshot.calculation.inputs.weightG=999;
const head = state.legacyOrders.find(o=>o.id===orderId);
const finance = {id:'bad-history',kind:'saveBusinessOrder',occurredAt:at,order:head,expectedRevision:head.order_revision,isNew:false};
tampered.legacyOrders.find(o=>o.id===orderId).order_revision++;
rejects(finance,tampered,/IMMUTABLE_ORDER_SNAPSHOT/);
rejects({...finance,id:'foreign'}, {...state,user_id:'22222222-2222-4222-8222-222222222222'}, /INVALID_ORDER_COMMAND/);
const archive = {id:'archive-printed',kind:'archiveBusinessOrders',occurredAt:at,orderIds:[orderId]};
state=call(state.revision,archive,applyBusinessOrderCommand(state,archive));
equal(state.finishedBalances[0].quantity,0);
equal(state.variants[0].stock_g,0);
equal(state.productionEvents.length,printedEvents);
const returned = {id:'explicit-return',kind:'returnOrderFinished',occurredAt:at,orderItemId:itemId,quantity:1};
const inventedBasis=applyBusinessOrderCommand(state,returned);
inventedBasis.finishedMovements.find(m=>m.event_key===returned.id).unit_cost=999;
inventedBasis.finishedBalances[0].average_unit_cost=999;
rejects(returned,inventedBasis,/ORDER_RETURN_BASIS_MISMATCH/);
state=call(state.revision,returned,applyBusinessOrderCommand(state,returned));
equal(state.finishedBalances[0].quantity,1);
equal(state.variants[0].stock_g,0);
equal(state.orderItems.find(i=>i.id===itemId).returned_quantity,1);
const erasedReturn=structuredClone(state);
erasedReturn.orderItems.find(i=>i.id===itemId).returned_quantity=0;
erasedReturn.legacyOrders.find(o=>o.id===orderId).order_revision++;
const currentReturnHead=state.legacyOrders.find(o=>o.id===orderId);
rejects({id:'audit-erase-return',kind:'saveBusinessOrder',occurredAt:at,order:currentReturnHead,
  expectedRevision:currentReturnHead.order_revision,isNew:false},erasedReturn,/ORDER_ALLOCATION_COUNTERS_DO_NOT_MATCH_LEDGER|Archived/);
equal(state.productionEvents,afterPrint.productionEvents);
equal(call(0,returned,state),state);
const archivedHead=state.legacyOrders.find(o=>o.id===orderId);
const restore={id:'restore-printed',kind:'restoreBusinessOrders',occurredAt:at,
  orders:[{...archivedHead,order_archived:false,status:'Не в работе'}],orderIds:[orderId],
  expectedRevisions:{[orderId]:archivedHead.order_revision},activeItemIds:{[orderId]:[itemId]}};
state=call(state.revision,restore,applyBusinessOrderCommand(state,restore));
equal(state.productionEvents.length,printedEvents);
equal(state.finishedBalances[0].quantity,1);
equal(state.orderItems.find(i=>i.id===itemId).returned_quantity,1);
rejects({...restore,id:'stale-undo'},state,/BUSINESS_ORDER_REVISION_CONFLICT/);
// A manual item can produce without any catalog FK, including zero available filament.
const manualId='dddddddd-dddd-4ddd-8ddd-dddddddddd01';
const manualItemId='ffffffff-ffff-4fff-8fff-ffffffffff01';
const manualInputs={...inputs,quantity:1,weightG:10,agreedPrice:100};
const manualResult=calculatePrintCost(manualInputs);
const manualRecipe={...recipe,product_snapshot:null};
const manualOrder={...order,id:manualId,title:'Manual',quantity:1,base_amount:100,amount:100,agreed_price:100,cost:20,status:'Готово'};
const manualItem={...item,id:manualItemId,order_id:manualId,source_order_id:manualId,product_id:null,
  quantity:1,unit_cost:20,total_cost:20,unit_price:100,total_price:100,
  snapshot:{version:1,order:{},calculation:{inputs:manualInputs,result:manualResult},recipe:manualRecipe}};
const manual={id:'manual-direct-done',kind:'saveBusinessOrder',occurredAt:at,order:manualOrder,items:[manualItem],isNew:true,expectedRevision:0};
state=call(state.revision,manual,applyBusinessOrderCommand(state,manual));
equal(state.productionEvents.find(p=>p.order_item_id===manualItemId).product_id,null);
equal(state.orderItems.find(i=>i.id===manualItemId).production_quantity,1);
equal(state.variants[0].stock_g,0);
equal(state.deficits.reduce((n,d)=>n+d.grams,0),15);
// Old single-product clients reserve available stock only, preserve history on
// financial edits and release exactly that reserve through soft archive.
const legacyId='dddddddd-dddd-4ddd-8ddd-dddddddddd02';
const legacy={...order,id:legacyId,product_id:productId,status:'Не в работе'};
const legacySaved=JSON.parse(sql(`select public.save_order_with_inventory(${literal(legacy)});`));
equal(legacySaved.payment,0);
equal(snapshot().finishedBalances[0].quantity,0);
equal(snapshot().orderItems.find(i=>i.source_order_id===legacyId).reserved_quantity,1);
const legacyEdited=JSON.parse(sql(`select public.save_order_with_inventory(${literal({...legacy,payment:50,cost:999})});`));
equal(legacyEdited.order_revision,1);
equal(legacyEdited.cost,100);
equal(snapshot().finishedBalances[0].quantity,0);
equal(Number(sql(`select public.delete_orders_atomic(array['${legacyId}'::uuid]);`)),1);
equal(snapshot().finishedBalances[0].quantity,1);
equal(snapshot().legacyOrders.find(o=>o.id===legacyId).order_archived,true);
equal(snapshot().orderItems.find(i=>i.source_order_id===legacyId).returned_quantity,1);
equal(Number(sql(`select public.delete_orders_atomic(array['${legacyId}'::uuid]);`)),0);
const beforeCompatibilityReject=snapshot();
assert.throws(()=>sql(`select public.save_order_with_inventory(${literal({...order,payment:100})});`),/ORDER_REQUIRES_ATOMIC_ITEM_API/);checks++;
assert.throws(()=>sql(`select public.delete_orders_atomic(array['${orderId}'::uuid]);`),/ORDER_REQUIRES_ATOMIC_ITEM_API/);checks++;
equal(snapshot(),beforeCompatibilityReject);
// Assembly recipes legitimately repeat the same variant in separate components.
const assemblyId='dddddddd-dddd-4ddd-8ddd-dddddddddd03';
const assemblyItemId='ffffffff-ffff-4fff-8fff-ffffffffff03';
state=snapshot();
const assemblyRecipe={...manualRecipe,materials:[{variant_id:variantId,grams_per_unit:5},{variant_id:variantId,grams_per_unit:5}]};
const assemblyItem={...manualItem,id:assemblyItemId,order_id:assemblyId,source_order_id:assemblyId,
  snapshot:{...manualItem.snapshot,recipe:assemblyRecipe}};
const assembly={...manual,id:'assembly-repeat-material',order:{...manualOrder,id:assemblyId,title:'Assembly'},items:[assemblyItem]};
state=call(state.revision,assembly,applyBusinessOrderCommand(state,assembly));
equal(state.productionEvents.find(p=>p.order_item_id===assemblyItemId).unit_cost,20);
equal(state.deficits.filter(d=>d.source_id===state.productionEvents.find(p=>p.order_item_id===assemblyItemId).id).reduce((n,d)=>n+d.grams,0),10);
const projectId='99999999-9999-4999-8999-999999999999';
const calcItemId='88888888-8888-4888-8888-888888888888';
const project={id:projectId,user_id:owner,created_at:at,name:'Project order',revision:0,
  discount_percent:0,discount_amount:0,urgency_percent:0,urgency_amount:0,agreed_price:0};
const calculation={id:calcItemId,user_id:owner,created_at:at,project_id:projectId,product_id:productId,
  name:'Project part',sort_order:0,quantity:1,inputs:manualInputs,result:manualResult,recipe};
const saveProject={id:'project-source',kind:'saveProject',occurredAt:at,project,items:[calculation]};
const projectState=applyCalculationProjectCommand(state,saveProject);
projectState.calculationItems=projectState.calculationItems.map(i=>({...i,archived:i.archived??false}));
state=call(state.revision,saveProject,projectState,'business_save_calculation_project');
const draft=createProjectOrderDraft(state.projects.find(p=>p.id===projectId),state.calculationItems.filter(i=>i.project_id===projectId));
const projectOrderId='dddddddd-dddd-4ddd-8ddd-dddddddddd04';
const projectItemId='ffffffff-ffff-4fff-8fff-ffffffffff04';
const projectOrder={...order,...draft.order,id:projectOrderId,created_at:at};
const projectCreate={id:'project-with-reserve',kind:'createProjectOrder',occurredAt:at,order:projectOrder,draft,itemIds:[projectItemId]};
const reservedProject=reserveOrderItems(applyProjectOrderCommand(state,projectCreate),projectOrderId,projectCreate.id,at);
state=call(state.revision,projectCreate,reservedProject);
equal(state.legacyOrders.find(o=>o.id===projectOrderId).agreed_price,0);
equal(state.legacyOrders.find(o=>o.id===projectOrderId).payment,0);
equal(state.orderItems.find(i=>i.id===projectItemId).reserved_quantity,1);
equal(state.legacyOrders.find(o=>o.id===projectOrderId).cost,16);
equal(call(0,projectCreate,state),state);
console.log(`Order lifecycle SQL checks passed: ${checks} assertions`);
