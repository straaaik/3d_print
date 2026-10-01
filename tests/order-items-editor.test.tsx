import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderItemReceipts, OrderItemsFinancials, OrderItemsEditor } from '../src/widgets/Orders/components/OrderItemsEditor';
import { ProductCalculationEditor } from '../src/widgets/ProductsList/ProductCalculationEditor';
import type { Order } from '../src/shared/types';
import { applyBusinessOrderCommand } from '../src/shared/lib/businessOrders';
import { buildOrderItem, summarizeOrderItems } from '../src/widgets/Orders/orderItems';
import { emptyFoundationState } from '../src/shared/lib/foundationStorage';
import { calculatePrintCost } from '../src/shared/lib/formulas';
const inputs = {weightG:100, hours:1, minutes:0, quantity:2, laborMinutes:0, filament:{id:'f',name:'PLA',weight_g:1000,price:1000},printer:null,settings:null};
const product = {id:'p', name:'Корпус',filament_name:'PLA',printer_name:'',weight_g:100,hours:1,minutes:0,quantity:2,base_cost:100,final_price:200, calculation_snapshot:{version:1 as const,inputs,result:calculatePrintCost(inputs)}};
const items = [buildOrderItem(product,2,{id:'a',userId:'owner',orderId:'order',variantId:'v'}),buildOrderItem({...product,name:'Крышка'},1,{id:'b',userId:'owner',orderId:'order',variantId:'v'})];
test('each frozen item has full receipt and physical accounting annotation', () => {
 const html=renderToStaticMarkup(<OrderItemReceipts items={items}/>);
 for(const label of ['Чек позиции · Корпус','Чек позиции · Крышка','Электроэнергия','Амортизация','Брак и тесты','Учтённая себестоимость','Со склада','Осталось изготовить']) assert.ok(html.includes(label),label);
});
test('financial editor accepts empty/zero agreed override, zero payments and distinguishes actual profit', () => {
 const html=renderToStaticMarkup(<OrderItemsFinancials order={{items,amount:300,cost:150,payment:0,payments:[],agreed_price:0}} onChange={()=>{}}/>);
 for(const label of ['Согласованная цена заказа','Получено оплат','Фактическая прибыль','Плановая прибыль']) assert.ok(html.includes(label),label);
 assert.doesNotMatch(html,/type="number"/);
 assert.match(html,/-150/);
});
test('embedded common editor retains all calculation fields and no catalog Save buttons', () => {
 const html=renderToStaticMarkup(<ProductCalculationEditor product={product} embedded onClose={()=>{}} onDraftChange={()=>{}}/>);
 for(const label of ['Вес печати','Количество в тираже','Наценка','Брак','Труд за единицу','Скидка позиции','Дополнительные расходы']) assert.ok(html.includes(label),label);
 assert.doesNotMatch(html,/Сохранить изменения|Отменить изменения|Создать заказ/);
});


test('canonical modal renders one item editor inside the scrollable body, while legacy and expenses retain their fields', async (context) => {
 const { mock } = await import('node:test');
 const auth = await import('../src/entities/model/AuthProvider');
 const data = await import('../src/entities/model/DataProvider');
 const inventory = await import('../src/entities/model/InventoryProvider');
 const router = await import('../src/shared/ui/page-transition/PageTransitionLink');
 const modal = await import('../src/widgets/Orders/components/OrderFormModal');
 mock.method(auth, 'useAuth', () => ({currentUser:{id:'owner'}}));
 mock.method(data, 'useData', () => ({filaments:[],printers:[],settings:null}));
 mock.method(inventory, 'useInventory', () => ({state:null}));
 mock.method(router, 'usePageRouter', () => ({push:()=>{}}));
 context.after(() => mock.restoreAll());
 const render = (order: Parameters<typeof modal.OrderFormModal>[0]['order']) => renderToStaticMarkup(
   <modal.OrderFormModal isOpen order={order} setOrder={()=>{}} onClose={()=>{}} onSave={async()=>null} savedCalculations={[]}/>
 );
 const canonical = render({type:'income',title:'Заказ',items,quantity:3,cost:150,amount:300,payment:0});
 // Inspect the rendered ancestor chain rather than searching source JSX.
 const stack: {tag:string; attributes:string}[]=[];
 let editorAncestors: typeof stack | undefined;
 for (const token of canonical.matchAll(/<\/?([a-z][a-z0-9-]*)\b([^>]*)>/g)) {
   const [raw,tag,attributes]=token;
   if (raw.startsWith('</')) { stack.pop(); continue; }
   if (tag==='input' && attributes.includes('aria-label="Название заказа"')) editorAncestors=[...stack];
   if (!['input','img','br','hr','meta','link'].includes(tag)) stack.push({tag,attributes});
 }
 assert.ok(editorAncestors, 'manual order title input rendered');
 assert.ok(editorAncestors.some(node=>node.attributes.includes('overflow-y-auto') && node.attributes.includes('min-h-0')), 'editor belongs to constrained scrollable content');
 assert.ok(!editorAncestors.some(node=>node.tag==='span'), 'form content must never be nested inside the status label');
 assert.equal((canonical.match(/aria-label="Название заказа"/g)||[]).length,1);
 assert.doesNotMatch(canonical,/placeholder="Введите наименование изделия|aria-label="Количество"/);
 assert.match(render({type:'income',title:'Старый заказ',quantity:1,amount:300,cost:100}),/placeholder="Введите наименование изделия/);
 assert.match(render({type:'expense',title:'Пластик',quantity:1,amount:300}),/placeholder="Введите наименование расхода/);
 const originalUseState = React.useState;
 mock.method(React, 'useState', (initial: unknown) => originalUseState(initial === 'item' ? 'pricing' : initial));
 const pricing=render({type:'income',title:'Заказ',items,quantity:3,cost:150,amount:300,payment:0});
 const labels=[...pricing.matchAll(/<label\b[^>]*>([^<]*)<\/label>/g)].map(match=>match[1]);
 assert.equal(labels.filter(label=>label==='Получено оплат').length,1,'one canonical payment control');
 assert.equal(labels.filter(label=>label==='Согласованная цена заказа').length,1,'one agreed override control');
 for(const legacyControl of ['Оплата','Себестоимость','Количество','Вес печати, г']) {
   assert.ok(!labels.includes(legacyControl), 'legacy '+legacyControl+' editor must be absent');
 }
 const priceLabel=pricing.match(/<label\b[^>]*for="([^"]+)"[^>]*>Согласованная цена заказа<\/label>/);
 assert.ok(priceLabel);
 const pricingStack: {tag:string; attributes:string}[]=[];
 let priceAncestors: typeof pricingStack | undefined;
 for (const [raw,tag,attributes] of pricing.matchAll(/<\/?([a-z][a-z0-9-]*)\b([^>]*)>/g)) {
   if(raw.startsWith('</')) { pricingStack.pop(); continue; }
   if(tag==='input' && attributes.includes('id="'+priceLabel[1]+'"')) priceAncestors=[...pricingStack];
   if(!['input','img','br','hr','meta','link'].includes(tag)) pricingStack.push({tag,attributes});
 }
 assert.ok(priceAncestors?.some(node=>node.attributes.includes('overflow-y-auto') && node.attributes.includes('min-h-0')),'financial fields in scrollable content');
 assert.ok(!priceAncestors?.some(node=>node.tag==='span'),'financial fields outside heading span');

});


test('all-stock fulfillment remains protected after status rollback even with no production quantity', () => {
 const state=emptyFoundationState('owner');
 state.orderItems=structuredClone(items);
 state.finishedMovements=[{id:'movement',user_id:'owner',created_at:'2026-10-01T00:00:00Z',
   product_id:'p',source_product_id:'p',order_item_id:'a',production_event_id:null,
   event_key:'command:fulfill:a',source:'order',delta_quantity:-2,unit_cost:50,balance_after:0}];
 const render=(status: 'Не в работе'|'Готово', withHistory:boolean)=>renderToStaticMarkup(<OrderItemsEditor
   order={{id:'order',items,status}} onChange={()=>{}} userId="owner" filaments={[]} printers={[]} settings={null}
   state={withHistory?state:null}/>);
 for(const html of [render('Не в работе',true),render('Готово',false)]) {
   assert.match(html, /количество и расчётные параметры защищены/);
   for(const text of ['Добавить деталь','Редактировать расчёт','Удалить деталь']) {
     const button=[...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].find(match=>match[2].includes(text));
     assert.ok(button, text);
     assert.match(button[1],/disabled=""/,text+' protected');
   }
 }
 const draft=render('Не в работе',false);
 assert.doesNotMatch(draft,/количество и расчётные параметры защищены/);
});


test('receipts resolve actual core deficit production-event sources separately for each manual position', () => {
 const state=emptyFoundationState('owner');
 state.variants=[{id:'v',user_id:'owner',created_at:'2026-10-01T00:00:00Z',material_line_id:null,
   legacy_filament_id:'f',name:'PLA',color:'',stock_g:0,average_cost_per_g:0.2,revision:0}];
 const positions=[10,20,30].map((grams,index)=>{
   const frozen={...inputs,weightG:grams,quantity:1,defectPercent:0};
   return buildOrderItem({...product,id:'',name:'Деталь '+['A','B','C'][index],weight_g:grams,quantity:1,
     calculation_snapshot:{version:1,inputs:frozen,result:calculatePrintCost(frozen)}},1,
     {id:'manual-'+index,userId:'owner',orderId:'deficit-order',variantId:'v'});
 });
 const head={...summarizeOrderItems({payment:0,payments:[]},positions),id:'deficit-order',user_id:'owner',
   created_at:'2026-10-01T00:00:00Z',date:'01.10.2026',title:'Дефицит',type:'income',client:'',contact:'',
   deadline:'',notes:'',status:'Готово'} as Order;
 const next=applyBusinessOrderCommand(state,{kind:'saveBusinessOrder',id:'deficit-create',
   occurredAt:'2026-10-01T00:00:00Z',order:head,items:positions,isNew:true,expectedRevision:0});
 assert.equal(next.deficits.reduce((sum,row)=>sum+row.grams,0),60);
 assert.ok(next.deficits.every(row=>next.productionEvents.some(event=>event.id===row.source_id)), 'core sources refer to production events');
 for(const [index,item] of next.orderItems.entries()) {
   const html=renderToStaticMarkup(<OrderItemReceipts items={[item]} state={next}/>);
   const warnings=[...html.matchAll(/Дефицит материала PLA: ([0-9]+) г/g)].map(match=>Number(match[1]));
   assert.deepEqual(warnings,[[10,20,30][index]],item.name+' has only its own deficit');
 }
});
