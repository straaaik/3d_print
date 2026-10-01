import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyFoundationState } from '../src/shared/lib/foundationStorage';
import { applyInventoryCommand, bootstrapInventoryState } from '../src/shared/lib/inventoryEngine';
import { backfillLegacyOrderItems } from '../src/shared/lib/orderSnapshots';
import { calculatePrintCost, type CalculateCostParams } from '../src/shared/lib/formulas';
import type { Order, SavedCalculation } from '../src/shared/types';
import type { FoundationState, OrderItem, ProductionRecipe } from '../src/shared/types/foundation';
import { applyBusinessOrderCommand as apply, reserveOrderItems, isBusinessOrderCommand } from '../src/shared/lib/businessOrders';
const at = '2026-09-30T12:00:00.000Z';
const product: SavedCalculation = { id: 'product', user_id: 'alice', name: 'Part', filament_name: 'PLA',
  printer_name: 'Printer', weight_g: 100, hours: 0, minutes: 0, quantity: 1,
  base_cost: 8, final_price: 20, stock_quantity: 2 };
const recipe: ProductionRecipe = { version: 1, materials: [{ variant_id: 'filament', grams_per_unit: 100 }],
  non_material_unit_cost: 3, product_snapshot: product };
function opening(stock = 2, grams = 500): FoundationState {
  return bootstrapInventoryState(emptyFoundationState('alice'),
    [{ id: 'filament', user_id: 'alice', name: 'PLA', weight_g: grams, price: grams * 0.1 }],
    [{ ...product, stock_quantity: stock }]);
}
function draft(id = 'item', quantity = 5, manual = false): OrderItem {
  const inputs: CalculateCostParams = { weightG: quantity * 100, hours: 0, minutes: 0,
    laborMinutes: quantity * 3, laborRatePerHour: 60, quantity, markupPercent: 0, defectPercent: 0,
    filament: { id: 'filament', name: 'PLA', weight_g: 1000, price: 100 }, printer: null, settings: null };
  const result = calculatePrintCost(inputs);
  return { id, user_id: 'alice', created_at: at, order_id: 'order', source_order_id: 'order',
    product_id: manual ? null : product.id, name: 'Part', quantity,
    unit_cost: result.baseCostPerUnit, total_cost: result.totalBaseCost,
    unit_price: result.finalPricePerUnit, total_price: result.totalFinalPrice,
    cost_provenance: 'estimate', fulfilled_quantity: 0, production_quantity: 0, legacy_key: null,
    snapshot: { version: 1, order: { quantity, amount: result.totalFinalPrice, cost: result.totalBaseCost },
      calculation: { inputs, result }, recipe: { ...recipe, product_snapshot: manual ? null : product } } };
}
function head(items: OrderItem[] = [draft()]): Order {
  return { id: 'order', user_id: 'alice', created_at: at, date: '2026-09-30', type: 'income',
    title: 'Order', amount: items.reduce((sum, item) => sum + item.total_price, 0),
    cost: items.reduce((sum, item) => sum + item.total_cost, 0), quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    payment: 0, payments: [], client: '', contact: '', deadline: '', notes: '', status: 'Не в работе' };
}
function save(state: FoundationState, order = head(), items: OrderItem[] | undefined = undefined,
  id = 'save', isNew = false, expectedRevision = 0) {
  return apply(state, { kind: 'saveBusinessOrder', id, occurredAt: at, order, items, isNew, expectedRevision });
}
function created(state = opening(), items = [draft()]) { return save(state, head(items), items, 'create', true); }

test('save reserves only available stock with its basis and leaves a frozen estimated remainder', () => {
  const state = created();
  assert.equal(state.finishedBalances[0].quantity, 0);
  assert.equal(state.orderItems[0].fulfilled_quantity, 2);
  assert.equal((state.orderItems[0] as OrderItem & { reserved_quantity: number }).reserved_quantity, 2);
  assert.equal(state.orderItems[0].total_cost, 55); // 2 × 8 actual + 3 × 13 frozen estimate
  assert.equal(state.legacyOrders?.[0].cost, 55);
  assert.equal(state.productionEvents.length, 0);
  assert.deepEqual(reserveOrderItems(state, 'order', 'create', at), state);
  assert.equal(isBusinessOrderCommand({ kind: 'saveBusinessOrder' }), true);
  assert.equal(isBusinessOrderCommand({ kind: 'purchase' }), false);
});

test('stock2/order5 then +1 production and direct done produces only the remaining two at current cost', () => {
  const first = created();
  const purchased = applyInventoryCommand(first, { kind: 'purchase', id: 'purchase', occurredAt: at,
    variantId: 'filament', weightG: 500, totalPrice: 150 }); // current basis = .2/g
  const stocked = applyInventoryCommand(purchased, { kind: 'produce', id: 'make-stock', occurredAt: at,
    productId: product.id, quantity: 1, recipe });
  const done = save(stocked, { ...stocked.legacyOrders![0], status: 'Готово' }, undefined, 'done');
  assert.equal(done.productionEvents.length, 2);
  assert.equal(done.productionEvents[1].quantity, 2);
  assert.equal(done.variants[0].stock_g, 700);
  assert.equal(done.finishedBalances[0].quantity, 0);
  assert.equal(done.orderItems[0].total_cost, 85); // 2 × 8 + 1 × 23 + 2 × 23
  assert.equal(done.orderItems[0].fulfilled_quantity, 5);
  assert.equal(done.orderItems[0].production_quantity, 2);
  assert.equal(done.orderItems[0].cost_provenance, 'mixed');
  assert.deepEqual(done.orderItems[0].snapshot, draft().snapshot);
  const back = save(done, { ...done.legacyOrders![0], status: 'Не в работе' }, undefined, 'back', false, 1);
  const again = save(back, { ...back.legacyOrders![0], status: 'Печать' }, undefined, 'again', false, 2);
  assert.deepEqual(again.filamentMovements, done.filamentMovements);
  assert.deepEqual(again.productionEvents, done.productionEvents);
});

test('manual frozen recipe produces without a catalog ID and records shortage with stock at zero', () => {
  const item = draft('manual', 2, true);
  const state = save(opening(0, 50), { ...head([item]), status: 'Ждет покраски' }, [item], 'manual-create', true);
  assert.equal(state.productionEvents[0].product_id, null);
  assert.equal(state.productionEvents[0].quantity, 2);
  assert.equal(state.variants[0].stock_g, 0);
  assert.equal(state.deficits[0].grams, 150);
  assert.equal(state.orderItems[0].total_cost, 26);
  assert.equal(state.finishedBalances[0].quantity, 0);
});

test('finance edits preserve all item snapshots and physical facts despite changed catalog', () => {
  const first = created();
  const changed = { ...first, legacyProducts: [{ ...product, base_cost: 999, final_price: 999 }] };
  const next = save(changed, { ...changed.legacyOrders![0], payment: 50, payments: [50], items: [draft('ignored', 9)] },
    undefined, 'payment');
  assert.deepEqual(next.orderItems, first.orderItems);
  assert.equal(next.legacyOrders![0].cost, 55);
  assert.equal(next.legacyOrders![0].payment, 50);
  assert.equal('items' in next.legacyOrders![0], false);
});

test('legacy already-completed orders keep historical quantity/cost and do not invent production', () => {
  const order = { ...head(), status: 'Готово' as const, cost: 42, quantity: 7 };
  const base = opening();
  const state = { ...base, legacyOrders: [order], orderItems: backfillLegacyOrderItems([order], [], 'alice') };
  const next = save(state, { ...order, payment: 120, payments: [120] }, undefined, 'legacy-payment');
  assert.deepEqual(next.orderItems, state.orderItems);
  assert.equal(next.legacyOrders![0].cost, 42);
  assert.equal(next.legacyOrders![0].quantity, 7);
  assert.deepEqual(next.productionEvents, []);
  assert.deepEqual(next.finishedMovements, state.finishedMovements);
});

test('revision rejects stale edits before changing any inventory', () => {
  const first = created();
  assert.equal(first.legacyOrders![0].order_revision, 0);
  const next = save(first, { ...first.legacyOrders![0], payment: 10 }, undefined, 'payment');
  assert.equal(next.legacyOrders![0].order_revision, 1);
  assert.throws(() => save(next, { ...first.legacyOrders![0], status: 'Печать' }, undefined, 'stale'),
    /BUSINESS_ORDER_REVISION_CONFLICT:order/);
  assert.equal(next.productionEvents.length, 0);
});

test('preproduction archive restores reserved units at original cost and keeps parent/audit', () => {
  const state = created();
  const changedBasis = applyInventoryCommand(state, { kind: 'adjustFinished', id: 'adjust', occurredAt: at,
    productId: product.id, quantity: 1, unitCost: 20 });
  const command = { kind: 'archiveBusinessOrders' as const, id: 'archive', occurredAt: at, orderIds: ['order'] };
  const archived = apply(changedBasis, command);
  assert.equal(archived.finishedBalances[0].quantity, 3);
  assert.equal(archived.finishedBalances[0].average_unit_cost, 12); // (1 × 20 + 2 × 8) / 3
  assert.equal(archived.legacyOrders![0].order_archived, true);
  assert.equal((archived.orderItems[0] as OrderItem & { archived: boolean }).archived, true);
  assert.equal(archived.orderItems[0].source_order_id, 'order');
  assert.equal(archived.productionEvents.length, 0);
  assert.deepEqual(apply(archived, command), archived);
});

test('production archive never autoreturns allocated units, explicit finished returns keep cost history', () => {
  const first = created();
  const done = save(first, { ...first.legacyOrders![0], status: 'Печать' }, undefined, 'print');
  const archived = apply(done, { kind: 'archiveBusinessOrders', id: 'archive-made', occurredAt: at, orderIds: ['order'] });
  assert.equal(archived.finishedBalances[0].quantity, 0);
  assert.deepEqual(archived.filamentMovements, done.filamentMovements);
  const command = { kind: 'returnOrderFinished' as const, id: 'return', occurredAt: at, orderItemId: 'item', quantity: 2 };
  const returned = apply(archived, command);
  assert.equal(returned.finishedBalances[0].quantity, 2);
  assert.equal(returned.finishedBalances[0].average_unit_cost, 11); // actual total 55 / 5
  assert.equal(returned.finishedMovements.at(-1)!.source, 'finished_return');
  assert.equal(returned.orderItems[0].total_cost, 55);
  assert.equal(returned.legacyOrders![0].cost, 55);
  assert.deepEqual(apply(returned, command), returned);
  assert.throws(() => apply(returned, { ...command, id: 'excess', quantity: 4 }), /quantity/i);
});

test('explicit preprint replacement releases reservation before reserving replacement and preserves archived IDs', () => {
  const first = created();
  const replacement = draft('replacement', 3);
  const next = save(first, head([replacement]), [replacement], 'replace');
  assert.equal(next.orderItems.length, 2);
  assert.equal((next.orderItems[0] as OrderItem & { archived: boolean }).archived, true);
  assert.equal(next.orderItems[1].fulfilled_quantity, 2);
  assert.equal(next.orderItems[1].total_cost, 29); // 16 actual + 13 remainder
  assert.equal(next.finishedBalances[0].quantity, 0);
  assert.equal(next.legacyOrders![0].cost, 29);
});

test('quantity or recipe edits after production reject without erasing physical history', () => {
  const first = created();
  const made = save(first, { ...first.legacyOrders![0], status: 'Готово' }, undefined, 'made');
  assert.throws(() => save(made, head([draft('new-item', 4)]), [draft('new-item', 4)], 'edit-made', false, 1),
    /отдельн|separate/i);
});

test('expense saves have no inventory production even at a later status', () => {
  const state = save(opening(), { ...head(), type: 'expense', status: 'Готово' }, undefined, 'expense', true);
  assert.equal(state.productionEvents.length, 0);
  assert.equal(state.orderItems.length, 0);
});

test('validation rejects foreign references, malformed quantities, NaN and tampered calculation snapshots', () => {
  const state = opening();
  assert.throws(() => save(state, { ...head(), user_id: 'bob' }, [draft()], 'foreign-head', true));
  assert.throws(() => created(state, [{ ...draft(), user_id: 'bob' }]));
  for (const quantity of [0, -1, 1.5, NaN]) assert.throws(() => created(state, [{ ...draft(), quantity }]));
  assert.throws(() => save(state, { ...head(), payment: NaN }, [draft()], 'nan-head', true));
  const altered = draft();
  altered.snapshot.calculation!.result.totalBaseCost = 999;
  assert.throws(() => created(state, [altered]), /snapshot|расчет/i);
  const foreign = { ...state, variants: state.variants.map(row => ({ ...row, user_id: 'bob' })) };
  assert.throws(() => created(foreign));
  assert.equal(state.finishedBalances[0].quantity, 2);
});

test('new compatibility catalog orders accept historical draft costs but produce using their frozen recipe', () => {
  const order = { ...head(), product_id: product.id, cost: 40, status: 'Готово' as const };
  const item = backfillLegacyOrderItems([order], [], 'alice')[0];
  item.snapshot.recipe = recipe;
  const next = save(opening(), order, [item], 'compatibility-create', true);
  assert.equal(next.orderItems[0].fulfilled_quantity, 5);
  assert.equal(next.orderItems[0].production_quantity, 3);
  assert.equal(next.orderItems[0].total_cost, 55);
  assert.equal(next.productionEvents[0].quantity, 3);
});

test('new financial-only compatibility order retains historical values without inventing a recipe', () => {
  const order = { ...head(), cost: 42.123, status: 'Готово' as const };
  const item = backfillLegacyOrderItems([order], [], 'alice')[0];
  const next = save(opening(), order, [item], 'manual-compatibility', true);
  assert.equal(next.orderItems[0].total_cost, 42.123);
  assert.equal(next.legacyOrders![0].cost, 42.123);
  assert.equal(next.orderItems[0].cost_provenance, 'legacy');
  assert.equal(next.productionEvents.length, 0);
  assert.equal(next.finishedBalances[0].quantity, 2);
});

test('head and receipt totals cannot be silently overwritten by a mismatched explicit draft', () => {
  assert.throws(() => save(opening(), { ...head(), cost: 999 }, [draft()], 'bad-cost', true), /totals|snapshot/i);
  const item = draft();
  item.snapshot.order.amount = 999;
  assert.throws(() => created(opening(), [item]), /snapshot|receipt/i);
});

test('an all-stock order cannot reopen quantity edits after printing then reverting its status', () => {
  const first = created(opening(5));
  const made = save(first, { ...first.legacyOrders![0], status: 'Печать' }, undefined, 'all-stock-print');
  const back = save(made, { ...made.legacyOrders![0], status: 'Не в работе' }, undefined, 'all-stock-back', false, 1);
  assert.throws(() => save(back, head([draft('replacement', 4)]), [draft('replacement', 4)], 'all-stock-edit', false, 2),
    /отдельн|separate/i);
});

test('targeted undo restores head metadata without overwriting another order or physical history', () => {
  const initial = created();
  const oldHead = initial.legacyOrders![0];
  const printed = save(initial, { ...oldHead, status: 'Готово', payment: 50 }, undefined, 'printed');
  const other: Order = { ...head(), id: 'other-order', title: 'Independent expense', type: 'expense', amount: 99 };
  const state = save(printed, other, undefined, 'other-create', true);
  const restored = apply(state, { kind: 'restoreBusinessOrders', id: 'undo', occurredAt: at,
    orderIds: ['order'], orders: [oldHead], expectedRevisions: { order: 1 } });
  assert.equal(restored.legacyOrders!.find(row => row.id === 'order')!.payment, 0);
  assert.equal(restored.legacyOrders!.find(row => row.id === 'order')!.status, 'Не в работе');
  assert.deepEqual(restored.legacyOrders!.find(row => row.id === 'other-order'), state.legacyOrders!.find(row => row.id === 'other-order'));
  assert.deepEqual(restored.orderItems, state.orderItems);
  assert.deepEqual(restored.productionEvents, state.productionEvents);
  assert.deepEqual(restored.filamentMovements, state.filamentMovements);
  assert.equal(restored.legacyOrders![0].cost, 55);
  assert.throws(() => apply(restored, { kind: 'restoreBusinessOrders', id: 'stale-undo', occurredAt: at,
    orderIds: ['order'], orders: [oldHead], expectedRevisions: { order: 1 } }), /BUSINESS_ORDER_REVISION_CONFLICT/);
});

test('unarchive restores only selected active item IDs and reserves stock without producing historical status', () => {
  const initial = created();
  const replacement = draft('replacement', 3);
  const changed = save(initial, head([replacement]), [replacement], 'replace-for-archive');
  const beforeArchive = changed.legacyOrders![0];
  const archived = apply(changed, { kind: 'archiveBusinessOrders', id: 'archive-for-undo', occurredAt: at, orderIds: ['order'] });
  const restored = apply(archived, { kind: 'restoreBusinessOrders', id: 'unarchive', occurredAt: at,
    orderIds: ['order'], orders: [beforeArchive], expectedRevisions: { order: 2 }, activeItemIds: { order: ['replacement'] } });
  assert.equal((restored.orderItems.find(row => row.id === 'item') as OrderItem & { archived: boolean }).archived, true);
  assert.equal((restored.orderItems.find(row => row.id === 'replacement') as OrderItem & { archived: boolean }).archived, false);
  assert.equal(restored.orderItems.find(row => row.id === 'replacement')!.total_cost, 29);
  assert.equal(restored.finishedBalances[0].quantity, 0);
  assert.equal(restored.productionEvents.length, 0);
  assert.equal(restored.legacyOrders![0].order_revision, 3);
});

test('return then archive/unarchive keeps returned history and avoids reserving returned units twice', () => {
  const initial = created(opening(5));
  const returned = apply(initial, { kind: 'returnOrderFinished', id: 'early-return', occurredAt: at, orderItemId: 'item', quantity: 1 });
  const archived = apply(returned, { kind: 'archiveBusinessOrders', id: 'returned-archive', occurredAt: at, orderIds: ['order'] });
  assert.equal((archived.orderItems[0] as OrderItem & { returned_quantity: number }).returned_quantity, 1);
  const restored = apply(archived, { kind: 'restoreBusinessOrders', id: 'returned-unarchive', occurredAt: at,
    orderIds: ['order'], orders: [initial.legacyOrders![0]], expectedRevisions: { order: 1 }, activeItemIds: { order: ['item'] } });
  assert.equal(restored.finishedBalances[0].quantity, 1);
  assert.equal(restored.orderItems[0].fulfilled_quantity, 5);
  assert.equal(restored.orderItems[0].total_cost, 40);
  assert.equal((restored.orderItems[0] as OrderItem & { returned_quantity: number }).returned_quantity, 1);
});

test('standalone project-order reservation updates the head cost in the same state transition', () => {
  const initial = { ...opening(), legacyOrders: [head()], orderItems: [draft()] };
  const reserved = reserveOrderItems(initial, 'order', 'project-create', at);
  assert.equal(reserved.orderItems[0].total_cost, 55);
  assert.equal(reserved.legacyOrders![0].cost, 55);
});

test('every later status triggers production once, while every earlier status leaves the estimate frozen', () => {
  for (const status of ['Не в работе', 'Моделирование', 'Ждет печати'] as const) {
    const item = draft('item', 1);
    const state = save(opening(0), { ...head([item]), status }, [item], `early-${status}`, true);
    assert.equal(state.productionEvents.length, 0);
    assert.equal(state.orderItems[0].fulfilled_quantity, 0);
    assert.equal(state.orderItems[0].total_cost, 13);
  }
  for (const status of ['Печать', 'Ждет покраски', 'Покраска', 'Ждет отправки', 'Отправлен', 'Готово'] as const) {
    const item = draft('item', 1);
    const first = save(opening(0), { ...head([item]), status }, [item], `later-${status}`, true);
    const again = save(first, { ...first.legacyOrders![0], status }, undefined, `later-again-${status}`);
    assert.equal(again.productionEvents.length, 1);
    assert.equal(again.productionEvents[0].quantity, 1);
    assert.equal(again.variants[0].stock_g, 400);
    assert.deepEqual(again.finishedMovements, first.finishedMovements);
  }
});

test('return validates owner, integer quantity, valid catalog identity and immutable event payload', () => {
  const initial = created();
  for (const quantity of [0, -1, 1.1, NaN]) assert.throws(() => apply(initial, {
    kind: 'returnOrderFinished', id: 'invalid-return', occurredAt: at, orderItemId: 'item', quantity }));
  const foreign = { ...initial, orderItems: initial.orderItems.map(item => ({ ...item, user_id: 'bob' })) };
  assert.throws(() => apply(foreign, { kind: 'returnOrderFinished', id: 'foreign-return', occurredAt: at,
    orderItemId: 'item', quantity: 1 }));
  const command = { kind: 'returnOrderFinished' as const, id: 'stable-return', occurredAt: at, orderItemId: 'item', quantity: 1 };
  const returned = apply(initial, command);
  assert.throws(() => apply(returned, { ...command, quantity: 2 }), /conflict/i);
  const foreignReplay = { ...returned, orderItems: returned.orderItems.map(item => ({ ...item, user_id: 'bob' })) };
  assert.throws(() => apply(foreignReplay, command));
  const manual = draft('manual', 1, true);
  const made = save(opening(0), { ...head([manual]), status: 'Готово' }, [manual], 'manual-for-return', true);
  assert.throws(() => apply(made, { ...command, id: 'manual-return', orderItemId: 'manual' }), /product/i);
});

test('archiving a mixed owner batch rejects the entire command and targeted undo cannot replace unrelated heads', () => {
  const initial = created();
  const foreign = { ...head(), id: 'foreign', user_id: 'bob' };
  const state = { ...initial, legacyOrders: [...initial.legacyOrders!, foreign] };
  assert.throws(() => apply(state, { kind: 'archiveBusinessOrders', id: 'batch', occurredAt: at, orderIds: ['order', 'foreign'] }));
  assert.equal(state.legacyOrders[0].order_archived, false);
  assert.equal(state.finishedBalances[0].quantity, 0);
  assert.throws(() => apply(initial, { kind: 'restoreBusinessOrders', id: 'wrong-target', occurredAt: at,
    orderIds: ['order'], orders: [foreign], expectedRevisions: { order: 0 } }));
});

test('all-stock completed allocation survives rollback and archive until an explicit finished return', () => {
  const first = created(opening(5));
  const done = save(first, { ...first.legacyOrders![0], status: 'Готово' }, undefined, 'all-stock-done');
  const back = save(done, { ...done.legacyOrders![0], status: 'Не в работе' }, undefined, 'all-stock-rollback', false, 1);
  const archived = apply(back, { kind: 'archiveBusinessOrders', id: 'all-stock-archive', occurredAt: at, orderIds: ['order'] });
  assert.equal(archived.finishedBalances[0].quantity, 0);
  assert.equal(archived.orderItems[0].fulfilled_quantity, 5);
  assert.equal(archived.orderItems[0].reserved_quantity, 5);
  assert.deepEqual(archived.finishedMovements, back.finishedMovements);
  const returned = apply(archived, { kind: 'returnOrderFinished', id: 'all-stock-explicit-return', occurredAt: at,
    orderItemId: 'item', quantity: 2 });
  assert.equal(returned.finishedBalances[0].quantity, 2);
  assert.equal(returned.finishedBalances[0].average_unit_cost, 8);
  assert.equal(returned.orderItems[0].returned_quantity, 2);
  assert.equal(returned.orderItems[0].total_cost, 40);
  assert.equal(returned.legacyOrders![0].cost, 40);
});

test('preprint partial return and archive retain original actual basis rather than the remaining estimate', () => {
  const first = created(); // 2 allocated at 8 and 3 estimated at 13
  const returned = apply(first, { kind: 'returnOrderFinished', id: 'partial-preprint-return', occurredAt: at,
    orderItemId: 'item', quantity: 1 });
  assert.equal(returned.finishedBalances[0].quantity, 1);
  assert.equal(returned.finishedBalances[0].average_unit_cost, 8);
  const archived = apply(returned, { kind: 'archiveBusinessOrders', id: 'partial-preprint-archive', occurredAt: at, orderIds: ['order'] });
  assert.equal(archived.finishedBalances[0].quantity, 2);
  assert.equal(archived.finishedBalances[0].average_unit_cost, 8);
  assert.equal(archived.orderItems[0].fulfilled_quantity, 1);
  assert.equal(archived.orderItems[0].reserved_quantity, 1);
  assert.equal(archived.orderItems[0].returned_quantity, 1);
  assert.equal(archived.orderItems[0].total_cost, 55);
  assert.equal(archived.legacyOrders![0].cost, 55);
  assert.equal(archived.finishedMovements.at(-1)!.delta_quantity, 1);
  assert.equal(archived.finishedMovements.at(-1)!.unit_cost, 8);
});
