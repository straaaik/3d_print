import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyFoundationState } from '../src/shared/lib/foundationStorage';
import { applyInventoryCommand, bootstrapInventoryState, InventoryOperationError } from '../src/shared/lib/inventoryEngine';
import type { Filament, SavedCalculation } from '../src/shared/types';
import type { OrderItem, ProductionRecipe } from '../src/shared/types/foundation';

const at = '2026-09-29T12:00:00.000Z';
const filament: Filament = { id: 'filament-a', user_id: 'alice', name: 'PLA Blue', color: '#123456',
  weight_g: 0, price: 0 };
const product: SavedCalculation = { id: 'product-a', user_id: 'alice', name: 'Part', filament_name: 'PLA',
  printer_name: 'Printer', weight_g: 100, hours: 1, minutes: 0, quantity: 1,
  base_cost: 8, final_price: 20, stock_quantity: 0 };
const recipe: ProductionRecipe = { version: 1, materials: [{ variant_id: filament.id, grams_per_unit: 100 }],
  non_material_unit_cost: 3, product_snapshot: product };

test('catalog saves preserve entity IDs, check references and upsert without duplication', () => {
  const initial = emptyFoundationState('alice');
  const manufacturer = applyInventoryCommand(initial, { kind: 'saveManufacturer', id: 'cmd-1', occurredAt: at,
    entityId: 'maker', name: 'Maker' });
  const materialType = applyInventoryCommand(manufacturer, { kind: 'saveMaterialType', id: 'cmd-2',
    occurredAt: at, entityId: 'type', name: 'PLA', difficultyId: 'pla' });
  const line = applyInventoryCommand(materialType, { kind: 'saveMaterialLine', id: 'cmd-3', occurredAt: at,
    entityId: 'line', name: 'Basic', manufacturerId: 'maker', materialTypeId: 'type' });
  const variant = applyInventoryCommand(line, { kind: 'saveVariant', id: 'cmd-4', occurredAt: at,
    entityId: 'variant', name: 'Blue', color: '#123456', materialLineId: 'line' });
  assert.equal(variant.variants[0].id, 'variant');
  assert.equal(variant.variants[0].stock_g, 0);
  assert.equal(variant.variants[0].material_line_id, 'line');
  assert.deepEqual(applyInventoryCommand(variant, { kind: 'saveVariant', id: 'cmd-4', occurredAt: at,
    entityId: 'variant', name: 'Blue', color: '#123456', materialLineId: 'line' }), variant);
  assert.throws(() => applyInventoryCommand(initial, { kind: 'saveMaterialLine', id: 'bad', occurredAt: at,
    entityId: 'line', name: 'No maker', manufacturerId: 'foreign', materialTypeId: null }), InventoryOperationError);
  assert.deepEqual(initial, emptyFoundationState('alice'));
});

test('purchases update weighted average and repeated event never adds stock twice', () => {
  const initial = bootstrapInventoryState(emptyFoundationState('alice'), [filament], [product]);
  const first = applyInventoryCommand(initial, { kind: 'purchase', id: 'buy-1', occurredAt: at,
    variantId: filament.id, weightG: 500, totalPrice: 10 });
  const second = applyInventoryCommand(first, { kind: 'purchase', id: 'buy-2', occurredAt: at,
    variantId: filament.id, weightG: 1000, totalPrice: 24 });
  assert.equal(second.variants[0].stock_g, 1500);
  assert.ok(Math.abs(second.variants[0].average_cost_per_g - 34 / 1500) < 1e-12);
  assert.deepEqual(applyInventoryCommand(second, { kind: 'purchase', id: 'buy-2', occurredAt: at,
    variantId: filament.id, weightG: 1000, totalPrice: 24 }), second);
  assert.equal(second.purchases.length, 2);
  assert.equal(second.filamentMovements.length, 2);
});

test('production consumes available grams, records shortage and current cost, and does not reprice retail', () => {
  const opening = bootstrapInventoryState(emptyFoundationState('alice'),
    [{ ...filament, weight_g: 50, price: 5 }], [product]);
  const state = applyInventoryCommand(opening, { kind: 'produce', id: 'production-1', occurredAt: at,
    productId: product.id, quantity: 2, recipe });
  assert.equal(state.variants[0].stock_g, 0);
  assert.equal(state.deficits[0].grams, 150);
  assert.equal(state.filamentMovements.at(-1)?.delta_g, -50);
  assert.equal(state.productionEvents[0].unit_cost, 13); // 100g × 0.10/g + 3 labor
  assert.equal(state.finishedBalances[0].quantity, 2);
  assert.equal(state.finishedBalances[0].average_unit_cost, 13);
  assert.equal(state.productionEvents[0].recipe_snapshot.product_snapshot?.final_price, 20);
  assert.equal(product.final_price, 20);
  assert.deepEqual(applyInventoryCommand(state, { kind: 'produce', id: 'production-1', occurredAt: at,
    productId: product.id, quantity: 2, recipe }), state);
});

test('manual finished adjustment changes weighted cost without consuming filament', () => {
  const opening = bootstrapInventoryState(emptyFoundationState('alice'),
    [{ ...filament, weight_g: 200, price: 20 }], [{ ...product, stock_quantity: 2 }]);
  const state = applyInventoryCommand(opening, { kind: 'adjustFinished', id: 'count-1', occurredAt: at,
    productId: product.id, quantity: 4, unitCost: 12 });
  assert.equal(state.finishedBalances[0].quantity, 4);
  assert.equal(state.finishedBalances[0].average_unit_cost, 10); // (2 × 8 + 2 × 12) / 4
  assert.equal(state.variants[0].stock_g, 200);
  assert.equal(state.filamentMovements.length, opening.filamentMovements.length);
  const removed = applyInventoryCommand(state, { kind: 'adjustFinished', id: 'count-2', occurredAt: at,
    productId: product.id, quantity: 1, unitCost: 0 });
  assert.equal(removed.finishedBalances[0].quantity, 1);
  assert.equal(removed.variants[0].stock_g, 200);
});

test('fulfillment uses finished stock first and directly produces only the remainder once', () => {
  const opening = bootstrapInventoryState(emptyFoundationState('alice'),
    [{ ...filament, weight_g: 500, price: 50 }], [{ ...product, stock_quantity: 2 }]);
  const orderItem: OrderItem = { id: 'item-1', user_id: 'alice', created_at: at,
    order_id: null, source_order_id: 'order-1', product_id: product.id, name: product.name,
    quantity: 5, unit_cost: 19.8, total_cost: 99, unit_price: 20, total_price: 100,
    cost_provenance: 'estimate', fulfilled_quantity: 0, production_quantity: 0,
    snapshot: { version: 1, order: {}, calculation: null, recipe }, legacy_key: null };
  const state = applyInventoryCommand({ ...opening, orderItems: [orderItem] },
    { kind: 'fulfill', id: 'fulfill-1', occurredAt: at, orderItemId: orderItem.id, recipe });
  assert.equal(state.finishedBalances[0].quantity, 0);
  assert.equal(state.variants[0].stock_g, 200); // only three new units consumed
  assert.equal(state.productionEvents[0].quantity, 3);
  assert.equal(state.productionEvents[0].order_item_id, orderItem.id);
  assert.equal(state.orderItems[0].fulfilled_quantity, 5);
  assert.equal(state.orderItems[0].production_quantity, 3);
  assert.equal(state.orderItems[0].cost_provenance, 'mixed');
  assert.equal(state.orderItems[0].total_cost, 55); // 2 × 8 stock + 3 × 13 production
  assert.equal(state.orderItems[0].total_price, 100);
  assert.deepEqual(applyInventoryCommand(state, { kind: 'fulfill', id: 'fulfill-1', occurredAt: at,
    orderItemId: orderItem.id, recipe }), state);
});

test('bootstrap opening balances are idempotent and foreign references are rejected', () => {
  const once = bootstrapInventoryState(emptyFoundationState('alice'),
    [{ ...filament, weight_g: 500, price: 10 }], [{ ...product, stock_quantity: 2 }]);
  assert.deepEqual(bootstrapInventoryState(once, [filament], [product]), once);
  assert.equal(once.variants[0].id, filament.id);
  assert.equal(once.finishedBalances[0].id, product.id);
  assert.equal(once.finishedBalances[0].source_product_id, product.id);
  assert.equal(once.finishedBalances[0].average_unit_cost, 8);
  assert.throws(() => applyInventoryCommand(once, { kind: 'purchase', id: 'bad', occurredAt: at,
    variantId: 'other-user-variant', weightG: 1, totalPrice: 1 }), InventoryOperationError);
  assert.throws(() => bootstrapInventoryState(once, [{ ...filament, user_id: 'bob' }], []), InventoryOperationError);
});

test('fractional unit cost retains basis across legacy opening and current production', () => {
  const opening = bootstrapInventoryState(emptyFoundationState('alice'),
    [{ ...filament, weight_g: 1500, price: 34 }],
    [{ ...product, base_cost: 25, quantity: 3, stock_quantity: 3 }]);
  assert.ok(Math.abs(opening.finishedBalances[0].average_unit_cost - 25 / 3) < 1e-9);
  const preciseRecipe: ProductionRecipe = { ...recipe, non_material_unit_cost: 0 };
  const made = applyInventoryCommand(opening, { kind: 'produce', id: 'precise', occurredAt: at,
    productId: product.id, quantity: 1, recipe: preciseRecipe });
  assert.ok(Math.abs(made.productionEvents[0].unit_cost - 34 / 15) < 1e-9);
});

test('fractional grams consume the exact available balance without a phantom deficit', () => {
  const opening = bootstrapInventoryState(emptyFoundationState('alice'), [filament], [product]);
  const purchased = applyInventoryCommand(opening, { kind: 'purchase', id: 'fractional-buy', occurredAt: at,
    variantId: filament.id, weightG: 3.3, totalPrice: 1 });
  const fractionalRecipe: ProductionRecipe = { ...recipe,
    materials: [{ variant_id: filament.id, grams_per_unit: 1.1 }] };
  const made = applyInventoryCommand(purchased, { kind: 'produce', id: 'fractional-make', occurredAt: at,
    productId: product.id, quantity: 3, recipe: fractionalRecipe });
  assert.equal(made.variants[0].stock_g, 0);
  assert.deepEqual(made.deficits, []);
  assert.equal(made.filamentMovements.at(-1)?.delta_g, -3.3);
  assert.equal(made.filamentMovements.at(-1)?.balance_after_g, 0);
});

test('gram operations use six decimal places and reject quantities that round to zero', () => {
  const opening = bootstrapInventoryState(emptyFoundationState('alice'), [filament], [product]);
  assert.throws(() => applyInventoryCommand(opening, { kind: 'purchase', id: 'dust-buy', occurredAt: at,
    variantId: filament.id, weightG: 0.0000004, totalPrice: 1 }), InventoryOperationError);
  const purchased = applyInventoryCommand(opening, { kind: 'purchase', id: 'micro-buy', occurredAt: at,
    variantId: filament.id, weightG: 0.000001, totalPrice: 1 });
  assert.equal(purchased.variants[0].stock_g, 0.000001);
  const roundedPrice = applyInventoryCommand(opening, { kind: 'purchase', id: 'rounded-price', occurredAt: at,
    variantId: filament.id, weightG: 1, totalPrice: 0.0000004 });
  assert.equal(roundedPrice.purchases[0].total_price, 0);
  assert.equal(roundedPrice.variants[0].average_cost_per_g, 0);
  assert.throws(() => applyInventoryCommand(purchased, { kind: 'produce', id: 'dust-make', occurredAt: at,
    productId: product.id, quantity: 3, recipe: { ...recipe,
      materials: [{ variant_id: filament.id, grams_per_unit: 0.0000004 }] } }), InventoryOperationError);
  const made = applyInventoryCommand(purchased, { kind: 'produce', id: 'micro-make', occurredAt: at,
    productId: product.id, quantity: 2, recipe: { ...recipe,
      materials: [{ variant_id: filament.id, grams_per_unit: 0.000001 }] } });
  assert.equal(made.deficits[0].grams, 0.000001);
  assert.equal(made.filamentMovements.at(-1)?.delta_g, -0.000001);
});

test('small sequential purchases and recipe aggregation keep canonical gram balances', () => {
  const opening = bootstrapInventoryState(emptyFoundationState('alice'), [filament], [product]);
  const first = applyInventoryCommand(opening, { kind: 'purchase', id: 'tenth', occurredAt: at,
    variantId: filament.id, weightG: 0.1, totalPrice: 1 });
  const second = applyInventoryCommand(first, { kind: 'purchase', id: 'fifth', occurredAt: at,
    variantId: filament.id, weightG: 0.2, totalPrice: 1 });
  assert.equal(second.variants[0].stock_g, 0.3);
  const made = applyInventoryCommand(second, { kind: 'produce', id: 'thirds', occurredAt: at,
    productId: product.id, quantity: 1, recipe: { ...recipe, materials: [
      { variant_id: filament.id, grams_per_unit: 0.1 },
      { variant_id: filament.id, grams_per_unit: 0.2 },
    ] } });
  assert.equal(made.variants[0].stock_g, 0);
  assert.equal(made.deficits.length, 0);
});
