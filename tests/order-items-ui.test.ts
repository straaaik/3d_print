import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderItem, summarizeOrderItems, replaceOrderItem, updateOrderPaymentTotal } from '../src/widgets/Orders/orderItems';
import { calculatePrintCost } from '../src/shared/lib/formulas';
import { emptyFoundationState } from '../src/shared/lib/foundationStorage';
import { applyBusinessOrderCommand } from '../src/shared/lib/businessOrders';
import type { Order, SavedCalculation } from '../src/shared/types';
const inputs = { weightG: 100, hours: 1, minutes: 0, quantity: 5, laborMinutes: 0, defectPercent:0, filament: {id:'f', name:'PLA', weight_g:1000, price:1000}, printer:null, settings:null };
const product: SavedCalculation = { id:'p', name:'Деталь', weight_g:100, hours:1, minutes:0, quantity:5, filament_id:'f', filament_name:'PLA', printer_name:'', base_cost:100, final_price:200, calculation_snapshot:{version:1,inputs,result:calculatePrintCost(inputs)} };
test('catalog selection divides frozen batch cost and retail and never adds payments', () => {
  const item = buildOrderItem(product, 2, {userId:'owner', orderId:'order', variantId:'v', id:'item'});
  assert.equal(item.total_cost, 40); assert.equal(item.total_price,80);
  assert.equal(item.snapshot.recipe?.materials[0].grams_per_unit,20);
  const order = summarizeOrderItems({payment:0,payments:[], agreed_price:null},[item]);
  assert.equal(order.cost,40); assert.equal(order.amount,80); assert.deepEqual(order.payments,[]); assert.equal(order.payment,0);
  assert.equal(product.quantity,5);
});
test('line totals receive global adjustments once and agreed zero overrides', () => {
  const item = buildOrderItem(product, 2, {userId:'owner', orderId:'order', variantId:'v', id:'item'});
  const order = summarizeOrderItems({discount_percent:10,payment:120,payments:[120],agreed_price:0},[item]);
  assert.equal(order.amount,0); assert.equal(order.payment,120); assert.equal(order.base_amount,80);
});
test('explicit edit creates a fresh snapshot identity and protects printed positions', () => {
  const item = buildOrderItem(product, 2, {userId:'owner', orderId:'order', variantId:'v', id:'item'});
  const changed = replaceOrderItem(item, {...product,name:'Новая'}, 'v', 'new');
  assert.equal(changed.id,'new'); assert.equal(item.name,'Деталь');
  assert.throws(()=>replaceOrderItem({...item,production_quantity:1},product,'v','new'),/производства/);
});

test('manual detail keeps an empty agreed price so live markup changes affect retail', () => {
  const manual = {...product,id:'', agreed_price:null};
  const item=buildOrderItem(manual,5,{userId:'owner',orderId:'order',variantId:'v',id:'manual'});
  assert.equal(item.snapshot.calculation!.inputs.agreedPrice,null);
  assert.equal(item.total_price,calculatePrintCost(item.snapshot.calculation!.inputs).totalFinalPrice);
});

test('editing payment total retains receipt metadata and permits overpayment without negatives', () => {
  const source={payment:100,payments:[{id:'first',amount:70,date:'01.10.2026',note:'Аванс'},{id:'last',amount:30,date:'02.10.2026',note:'Доплата'}]};
  assert.deepEqual(updateOrderPaymentTotal(source,120).payments,[source.payments[0],{...source.payments[1],amount:50}]);
  assert.deepEqual(updateOrderPaymentTotal(source,50).payments,[{...source.payments[0],amount:50},{...source.payments[1],amount:0}]);
  assert.deepEqual(updateOrderPaymentTotal(source,0).payments,[]);
  assert.equal(source.payments[1].amount,30);
});
test('catalog snapshot calculation matches engine exactly at fractional per-unit prices', () => {
  const item=buildOrderItem({...product,quantity:3},2,{userId:'owner',orderId:'order',variantId:'v'});
  const calculation=item.snapshot.calculation!;
  assert.deepEqual(calculation.result,calculatePrintCost(calculation.inputs));
  assert.equal(item.unit_cost,calculation.result.baseCostPerUnit);
  assert.equal(item.unit_price,calculation.result.finalPricePerUnit);
});
test('assembly freezes composition and supplied material recipe while scaling ordered quantity', () => {
  const assembly={...product,type:'assembly' as const,quantity:1,base_cost:100,final_price:250,
    assembly_parts:[{name:'Корпус',weight_g:10,hours:1,minutes:0,quantity:2,base_cost:30,final_price:80}],
    assembly_hardware:[{id:'bolt',name:'Винты',quantity:4,cost_per_unit:10,price_per_unit:10}]};
  const recipe={version:1 as const,materials:[{variant_id:'v',grams_per_unit:20}],non_material_unit_cost:80,product_snapshot:assembly};
  const item=buildOrderItem(assembly,2,{userId:'owner',orderId:'order',id:'assembly',recipe});
  assert.equal(item.total_cost,200);assert.equal(item.total_price,500);
  assert.deepEqual(item.snapshot.recipe,recipe);
  assert.equal(item.snapshot.calculation!.result.customCostsBreakdown.length,2);
  assert.deepEqual(item.snapshot.calculation!.result,calculatePrintCost(item.snapshot.calculation!.inputs));
});

test('manual UI snapshot is accepted by lifecycle and returned head uses actual production cost', () => {
  const state=emptyFoundationState('owner');
  state.variants=[{id:'v',user_id:'owner',created_at:'2026-10-01T00:00:00Z',material_line_id:null,legacy_filament_id:'f',name:'PLA',color:'',stock_g:100,average_cost_per_g:0.2,revision:0}];
  const item=buildOrderItem({...product,id:''},2,{userId:'owner',orderId:'order',variantId:'v',id:'manual'});
  const order={...summarizeOrderItems({payment:0,payments:[]},[item]),id:'order',user_id:'owner',created_at:'2026-10-01T00:00:00Z',date:'01.10.2026',title:'Заказ',type:'income',client:'',contact:'',deadline:'',notes:'',status:'Готово'} as Order;
  const next=applyBusinessOrderCommand(state,{kind:'saveBusinessOrder',id:'create-ui-order',occurredAt:'2026-10-01T00:00:00Z',order,items:[item],isNew:true,expectedRevision:0});
  assert.equal(next.orderItems[0].production_quantity,2);
  assert.equal(next.variants[0].stock_g,60);
  assert.equal(next.legacyOrders![0].cost,8);
  assert.deepEqual(next.orderItems[0].snapshot,item.snapshot);
});
