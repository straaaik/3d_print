/* eslint-disable @typescript-eslint/no-require-imports -- Disposable SQL runner. */
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const [psql, database, port='55439'] = process.argv.slice(2);
if (!database?.startsWith('orders_checks_')) throw new Error('Disposable orders_checks_ database required');
const owner='11111111-1111-4111-8111-111111111111';
const foreign='22222222-2222-4222-8222-222222222222';
const literal=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";
function sql(query) {
  const result=spawnSync(psql,['-h','127.0.0.1','-p',port,'-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1','-f','-'],{
    input:`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false); ${query}`,
    encoding:'utf8',env:{...process.env,PGCLIENTENCODING:'UTF8'},
  });
  if(result.status!==0) throw new Error(result.stderr);
  return result.stdout.trim().split(/\r?\n/).at(-1);
}
const full=()=>JSON.parse(sql('select public.business_database_snapshot();'));
let checks=0;
const equal=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const command=(id,generation)=>({kind:'restoreBusinessSnapshot',id,generation,occurredAt:'2026-10-01T12:00:00Z'});
const restore=(revision,cmd,snapshot)=>JSON.parse(sql(`select public.business_restore_snapshot(${revision},${literal(cmd)},${literal(snapshot)});`));
let bundle=full();
equal(bundle.business.user_id,owner);
const original=structuredClone(bundle);
const initial=command('complete-restore',bundle.business.generation);
let state=restore(bundle.business.revision,initial,bundle);
equal(state.generation,1);
equal(state.revision,bundle.business.revision+1);
for(const key of ['variants','purchases','orderItems','productionEvents','finishedMovements','deficits','legacyOrders','legacyProducts']) {
  // Legacy bridge projects stock; it does not alter immutable business facts.
  equal(state[key],original.business[key]);
}
equal(restore(0,initial,original),state);
const changed=structuredClone(original);changed.orders[0].title='Changed retry';
assert.throws(()=>restore(0,initial,changed),/IDEMPOTENCY_KEY_REUSED/);checks++;
bundle=full();
function reject(snapshot,pattern,id,revision=bundle.business.revision,generation=1) {
  const before=full();assert.throws(()=>restore(revision,command(id,generation),snapshot),pattern);checks++;
  equal(full(),before);
}
reject(bundle,/BUSINESS_MAINTENANCE_REVISION_CONFLICT/,'stale',0);
const cross=structuredClone(bundle);cross.business.variants[0].user_id=foreign;
reject(cross,/CROSS_OWNER_ROW/,'foreign-row');
const nested=structuredClone(bundle);nested.business.orderItems.find(i=>i.snapshot.recipe)?.snapshot.recipe &&
  (nested.business.orderItems.find(i=>i.snapshot.recipe).snapshot.recipe.product_snapshot={id:'foreign',user_id:foreign});
reject(nested,/CROSS_OWNER_SNAPSHOT/,'nested-owner');
const invalid=structuredClone(bundle);invalid.business.finishedMovements[0].production_event_id='99999999-9999-4999-8999-999999999999';
reject(invalid,/foreign key/,'broken-fk');
const wrongCost=structuredClone(bundle);wrongCost.orders.find(o=>o.type==='income'&&!o.order_archived).cost+=1;
reject(wrongCost,/ORDER_COST_SNAPSHOT_MISMATCH/,'wrong-cost');
const counters=structuredClone(bundle);counters.business.orderItems.find(i=>!i.archived).reserved_quantity+=1;
reject(counters,/INVALID_ALLOCATION_COUNTERS|check constraint/,'wrong-counters');
const incomplete=structuredClone(bundle);delete incomplete.business.purchases;
reject(incomplete,/INVALID_COLLECTION/,'incomplete');
const prior=full();
const stale={kind:'purchase',id:'old-offline',occurredAt:'2026-10-01T12:00:00Z',variantId:bundle.business.variants[0].id,weightG:100,totalPrice:10};
assert.throws(()=>sql(`select public.commit_business_inventory(${state.revision},${literal(stale)},${literal(state)});`),/BUSINESS_GENERATION_CONFLICT/);checks++;
equal(full(),prior);
assert.throws(()=>sql(`select public.delete_orders_atomic(array[]::uuid[]);`),/BUSINESS_GENERATION_CONFLICT/);checks++;
const empty={...bundle,business:{...bundle.business,legacyOrders:[],legacyProducts:[]}};
for(const key of ['manufacturers','materialTypes','materialLines','variants','purchases','filamentMovements','deficits','projects','calculationItems',
  'orderItems','productionEvents','finishedBalances','finishedMovements']) empty.business[key]=[];
for(const key of ['printers','filaments','settings','collections','saved_calculations','orders','monthly_goals']) empty[key]=[];
state=restore(bundle.business.revision,command('complete-clear',1),empty);
equal(state.generation,2);equal(state.orderItems,[]);equal(state.legacyOrders,[]);equal(state.finishedMovements,[]);
// Previously acknowledged command remains retryable, even though a newer reset happened.
equal(restore(0,initial,original),state);
bundle=full();
state=restore(bundle.business.revision,command('recover-full-history',2),original);
equal(state.generation,3);equal(state.orderItems,original.business.orderItems);equal(state.productionEvents,original.business.productionEvents);
console.log(`Business maintenance SQL checks passed: ${checks} assertions`);
