import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyFoundationState } from '../src/shared/lib/foundationStorage';
import { bootstrapInventoryState } from '../src/shared/lib/inventoryEngine';
import { projectInventoryFilaments, projectInventoryProducts, projectInventoryOrders } from '../src/shared/lib/inventoryProjection';
import { createProductionRecipe } from '../src/shared/lib/productionRecipe';
import type { Filament, Order, SavedCalculation } from '../src/shared/types';
import { backfillLegacyOrderItems } from '../src/shared/lib/orderSnapshots';

test('order projection includes frozen items and excludes archived heads/positions without repricing', () => {
  const state = emptyFoundationState('alice');
  const order: Order = { id: 'order', user_id: 'alice', type: 'income', title: 'Frozen',
    date: '01.10.2026', amount: 100, cost: 60, payment: 50, client: '', contact: '', deadline: '',
    status: 'Готово', notes: '' };
  state.legacyOrders = [order, { ...order, id: 'archived', order_archived: true }];
  state.orderItems = backfillLegacyOrderItems([order], [], 'alice');
  state.orderItems.push({ ...state.orderItems[0], id: 'hidden', archived: true });
  const projected = projectInventoryOrders(state, []);
  assert.equal(projected.length, 1);
  assert.equal(projected[0].items?.length, 1);
  assert.equal(projected[0].cost, 60);
  assert.equal(projected[0].items?.[0].snapshot.order.cost, 60);
  assert.equal(projected[0].payment, 50);
  assert.equal(order.items, undefined);
});

const filament: Filament = { id: 'material', name: 'PLA', weight_g: 1000, price: 100 };
const product: SavedCalculation = { id: 'part', name: 'Part', filament_id: 'material', filament_name: 'PLA',
  printer_name: '', weight_g: 100, hours: 0, minutes: 0, quantity: 5,
  base_cost: 30, final_price: 100, stock_quantity: 2, defect_percent: 0,
  labor_minutes: 10, labor_rate_per_hour: 60, is_labor_per_unit: false };
const initial = () => bootstrapInventoryState(emptyFoundationState('alice'), [filament], [product]);

test('inventory projection preserves saved prices and uses current material basis independently of remaining grams', () => {
  const state = initial();
  state.variants[0].stock_g = 0;
  state.variants[0].average_cost_per_g = 0.4;
  state.finishedBalances[0].quantity = 7;
  const projected = projectInventoryProducts(state, [product])[0];
  assert.equal(projected.stock_quantity, 7);
  assert.equal(projected.base_cost, 30);
  assert.equal(projected.final_price, 100);
  assert.equal(product.stock_quantity, 2);
  const material = projectInventoryFilaments(state, [filament])[0];
  assert.equal(material.price / material.weight_g, 0.4);
  assert.equal(material.id, filament.id);
});

test('native uncategorized material does not infer difficulty from its color name', () => {
  const state = initial();
  state.variants[0].legacy_filament_id = null;
  state.variants[0].name = 'ABS Blue';
  assert.equal(projectInventoryFilaments(state, [])[0].material_difficulty_id, null);
});

test('production recipe divides batch resources once and snapshots the original product', () => {
  const recipe = createProductionRecipe(product, initial(), [product], [filament], [], null);
  assert.equal(recipe.materials[0].grams_per_unit, 20);
  assert.equal(recipe.non_material_unit_cost, 2);
  assert.deepEqual(recipe.product_snapshot, product);
  assert.notEqual(recipe.product_snapshot, product);
});

test('assembly recipe expands component counts and rejects dependency cycles', () => {
  const assembly: SavedCalculation = { ...product, id: 'assembly', type: 'assembly', is_owner_labor: true,
    assembly_parts: [{ ...product, product_id: product.id, quantity: 3 }],
    assembly_hardware: [{ id: 'bolt', name: 'Bolt', quantity: 2, cost_per_unit: 4, price_per_unit: 10 }] };
  const recipe = createProductionRecipe(assembly, initial(), [product, assembly], [filament], [], null);
  assert.equal(recipe.materials[0].grams_per_unit, 60);
  assert.equal(recipe.non_material_unit_cost, 14);
  assembly.assembly_parts![0].product_id = assembly.id;
  assert.throws(() => createProductionRecipe(assembly, initial(), [assembly], [filament], [], null), /циклическая/);
});

test('production with positive weight refuses an unresolved material', () => {
  assert.throws(() => createProductionRecipe(product, initial(), [product], [], [], null), /не назначен/);
});
