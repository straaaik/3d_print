import assert from 'node:assert/strict';
import test from 'node:test';
import { createDataBackup, parseDataBackup, type DataBackupSnapshot } from '../src/shared/lib/dataBackup';
import { emptyFoundationState } from '../src/shared/lib/foundationStorage';
import { applyInventoryCommand, bootstrapInventoryState } from '../src/shared/lib/inventoryEngine';
import { applyBusinessOrderCommand } from '../src/shared/lib/businessOrders';
import { backfillLegacyOrderItems } from '../src/shared/lib/orderSnapshots';
import { calculatePrintCost } from '../src/shared/lib/formulas';
import { createCalculationDraft, emptyCalculatorForm } from '../src/shared/lib/calculationDraft';
import type { Order, SavedCalculation } from '../src/shared/types';
import type { FoundationState, OrderItem, ProductionRecipe } from '../src/shared/types/foundation';

const at = '2026-10-01T12:00:00.000Z';
const product: SavedCalculation = { id: 'product', user_id: 'alice', name: 'Part', filament_name: 'PLA',
  printer_name: 'P', weight_g: 10, hours: 0, minutes: 0, quantity: 1, base_cost: 2, final_price: 5, stock_quantity: 1 };
const recipe: ProductionRecipe = { version: 1, materials: [{ variant_id: 'filament', grams_per_unit: 10 }],
  non_material_unit_cost: 1, product_snapshot: product };
function fixture() {
  let business = bootstrapInventoryState(emptyFoundationState('alice'),
    [{ id: 'filament', name: 'PLA', weight_g: 100, price: 10 }], [product]);
  business.legacyProducts = [product];
  business = applyInventoryCommand(business, { kind: 'produce', id: 'production', occurredAt: at,
    productId: 'product', quantity: 2, recipe });
  const order: Order = { id: 'order', user_id: 'alice', date: '2026-10-01', type: 'income', title: 'Part',
    amount: 10, cost: 4, payment: 0, client: '', contact: '', deadline: '', status: 'Готово', notes: '' };
  business.legacyOrders = [order];
  business.orderItems = backfillLegacyOrderItems([order], [], 'alice');
  const snapshot: DataBackupSnapshot = { filaments: [], printers: [], settings: null,
    savedCalculations: business.legacyProducts!, orders: business.legacyOrders, collections: [],
    monthlyGoals: { defaultGoal: 0, targetType: 'profit', monthlyGoals: {} } };
  return { business, snapshot };
}
function modernOrder() {
  const { business } = fixture(); business.legacyOrders = []; business.orderItems = [];
  const inputs = { weightG: 40, hours: 0, minutes: 0, laborMinutes: 4, laborRatePerHour: 60,
    quantity: 4, filament: { id: 'filament', name: 'PLA', weight_g: 100, price: 10 }, printer: null, settings: null };
  const result = calculatePrintCost(inputs);
  const head: Order = { id: 'modern', user_id: 'alice', date: '2026-10-01', type: 'income', title: 'Part',
    amount: result.totalFinalPrice, cost: result.totalBaseCost, payment: 0, client: '', contact: '', deadline: '', status: 'Готово', notes: '' };
  const item: OrderItem = { id: 'item', user_id: 'alice', created_at: at, name: 'Part', order_id: head.id,
    source_order_id: head.id, product_id: 'product', quantity: 4, unit_cost: result.baseCostPerUnit,
    total_cost: result.totalBaseCost, unit_price: result.finalPricePerUnit, total_price: result.totalFinalPrice,
    cost_provenance: 'estimate', fulfilled_quantity: 0, production_quantity: 0, legacy_key: null,
    snapshot: { version: 1, order: head, calculation: { inputs, result }, recipe } };
  return applyBusinessOrderCommand(business, { kind: 'saveBusinessOrder', id: 'create', occurredAt: at,
    isNew: true, expectedRevision: 0, order: head, items: [item] });
}
function snapshotFor(business: FoundationState): DataBackupSnapshot {
  return { ...fixture().snapshot, orders: business.legacyOrders!, savedCalculations: business.legacyProducts! };
}

test('V3 round trip preserves archives, actual basis, audit, draft and pending recovery data independently', () => {
  const { business, snapshot } = fixture();
  const recovery = { ...business, pendingInventory: [{ id: 'pending', occurredAt: at, kind: 'purchase',
    variantId: 'filament', weightG: 5, totalPrice: 1 }], remoteInventoryRevision: 4,
    orderConflictBackups: [{ occurredAt: at, commands: [{ id: 'older', occurredAt: at, kind: 'archiveBusinessOrders', orderIds: ['order'] }] }] };
  const draft = createCalculationDraft('alice', emptyCalculatorForm(), (() => { let id = 0; return () => `draft-${++id}`; })());
  const backup = createDataBackup(snapshot, recovery, draft);
  assert.equal(backup.version, 3);
  const parsed = parseDataBackup(JSON.parse(JSON.stringify(backup)), 'alice');
  assert.deepEqual(parsed.business, recovery);
  assert.deepEqual(parsed.calculationDraft, draft);
  parsed.business!.productionEvents[0].unit_cost = 999;
  assert.equal(recovery.productionEvents[0].unit_cost, 2);
  backup.orders[0].title = 'changed';
  assert.equal(snapshot.orders[0].title, 'Part');
});
test('V3 accepts ownerless historical resources but rejects outer, nested and target foreign owners', () => {
  const { business, snapshot } = fixture();
  const backup = createDataBackup(snapshot, business);
  assert.doesNotThrow(() => parseDataBackup(backup, 'alice'));
  assert.throws(() => parseDataBackup(backup, 'bob'), /владел|owner/);
  const nested = structuredClone(backup);
  if (nested.version !== 3) throw new Error('V3 expected');
  nested.business.productionEvents[0].recipe_snapshot.product_snapshot!.user_id = 'bob';
  assert.throws(() => parseDataBackup(nested), /владел|owner/);
  const resource = structuredClone(backup); resource.filaments = [{ id: 'foreign', name: 'PLA', price: 1, weight_g: 1, user_id: 'bob' }];
  assert.throws(() => parseDataBackup(resource), /владел|owner/);
});
test('V3 rejects missing references, malformed recipe/calculation and inconsistent canonical heads', () => {
  const original = createDataBackup(snapshotFor(modernOrder()), modernOrder());
  if (original.version !== 3) throw new Error('V3 expected');
  for (const mutate of [
    (b: typeof original) => { b.business.productionEvents[0].recipe_snapshot.materials[0].variant_id = 'missing'; },
    (b: typeof original) => { b.business.orderItems[0].snapshot.calculation!.result.totalBaseCost = NaN; },
    (b: typeof original) => { b.business.orderItems[0].snapshot.recipe!.materials[0].grams_per_unit = -1; },
    (b: typeof original) => { b.orders[0].cost = 999; },
    (b: typeof original) => { b.business.legacyOrders![0].cost = 999; b.orders[0].cost = 999; },
    (b: typeof original) => { b.business.productionEvents[0].order_item_id = 'missing'; },
  ]) {
    const bad = structuredClone(original); mutate(bad); assert.throws(() => parseDataBackup(bad));
  }
});
test('V3 rejects fabricated physical counters and accepts actual explicit returns and archive history', () => {
  let business = modernOrder();
  assert.doesNotThrow(() => parseDataBackup(createDataBackup(snapshotFor(business), business)));
  const wrong = structuredClone(business); wrong.orderItems[0].production_quantity = 0;
  assert.throws(() => parseDataBackup(createDataBackup(snapshotFor(wrong), wrong)), /счётчик|counter/);
  business = applyBusinessOrderCommand(business, { kind: 'returnOrderFinished', id: 'return', occurredAt: at,
    orderItemId: 'item', quantity: 1 });
  business = applyBusinessOrderCommand(business, { kind: 'archiveBusinessOrders', id: 'archive', occurredAt: at, orderIds: ['modern'] });
  assert.doesNotThrow(() => parseDataBackup(createDataBackup(snapshotFor(business), business)));
});
test('V3 requires the complete business and legacy bundle and rejects invalid recovery records', () => {
  const { business, snapshot } = fixture();
  const backup = createDataBackup(snapshot, business) as unknown as Record<string, unknown>;
  delete backup.business; assert.throws(() => parseDataBackup(backup), /business/);
  const bad = { ...business, pendingInventory: 'bad' };
  assert.throws(() => parseDataBackup(createDataBackup(snapshot, bad)), /pendingInventory/);
});
test('V3 rejects duplicate audit events, fabricated stock and invalid frozen order types', () => {
  const business = modernOrder();
  const original = createDataBackup(snapshotFor(business), business);
  for (const mutate of [
    (b: typeof original) => { b.business.finishedBalances[0].quantity += 1; },
    (b: typeof original) => { b.business.variants[0].stock_g += 1; },
    (b: typeof original) => { b.business.productionEvents.push({ ...b.business.productionEvents[0], id: 'another' }); },
    (b: typeof original) => { b.business.orderItems[0].snapshot.order.cost = 'invalid' as unknown as number; },
    (b: typeof original) => { b.business.productionEvents[0].recipe_snapshot.product_snapshot!.id = 'other'; },
    (b: typeof original) => { b.savedCalculations[0].stock_quantity = 999; },
  ]) { const bad = structuredClone(original); mutate(bad); assert.throws(() => parseDataBackup(bad)); }
});
test('V3 preserves signed custom calculation adjustments and maintenance recovery without replay decisions', () => {
  const { business, snapshot } = fixture();
  const inputs = { weightG: 10, hours: 0, minutes: 0, laborMinutes: 0, quantity: 1,
    filament: null, printer: null, settings: null,
    customCostItems: [{ id: 'signed', name: 'Historical adjustment', amount: -5, isEnabled: true }] };
  const project = { id: 'project', user_id: 'alice', created_at: at, name: 'Project', revision: 0,
    discount_percent: 0, discount_amount: 0, urgency_percent: 0, urgency_amount: 0, agreed_price: null };
  const state = { ...business, generation: 2, projects: [project], calculationItems: [{ id: 'calculation',
    user_id: 'alice', created_at: at, project_id: project.id, product_id: 'product', name: 'Signed', sort_order: 0,
    quantity: 1, inputs, result: calculatePrintCost(inputs), recipe }],
    pendingMaintenance: { id: 'maintenance', occurredAt: at, expectedRevision: 1, generation: 2,
      snapshot: { beforeBackup: createDataBackup(snapshot, business) } } };
  const parsed = parseDataBackup(createDataBackup(snapshot, state));
  assert.deepEqual(parsed.business, state);
});
test('V3 validates the entire draft edit baseline and nested draft owner', () => {
  const { business, snapshot } = fixture();
  const draft = createCalculationDraft('alice', emptyCalculatorForm(), (() => { let id = 0; return () => `draft-${++id}`; })());
  draft.items[0].productEditBaseline = { name: 'Before', form: { weight: '10' } as ReturnType<typeof emptyCalculatorForm> };
  assert.throws(() => parseDataBackup(createDataBackup(snapshot, business, draft)), /calculationDraft/);
});
