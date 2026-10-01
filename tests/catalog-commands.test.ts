import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCatalogCommand, type CatalogCommand } from '../src/shared/lib/catalogCommands';
import { emptyFoundationState } from '../src/shared/lib/foundationStorage';
import { bootstrapInventoryState, applyInventoryCommand } from '../src/shared/lib/inventoryEngine';
import type { SavedCalculation } from '../src/shared/types';

const now = '2026-09-30T17:00:00Z';
const product: SavedCalculation = { id: 'product', user_id: 'alice', created_at: now, name: 'Original',
  filament_name: 'PLA', printer_name: 'Printer', weight_g: 10, hours: 1, minutes: 0, quantity: 2,
  base_cost: 100, final_price: 300, stock_quantity: 2, catalog_revision: 0, catalog_archived: false };
function setup() {
  const state = bootstrapInventoryState(emptyFoundationState('alice'), [], [product]);
  state.legacyProducts = [structuredClone(product)];
  return state;
}
function save(patch: Partial<SavedCalculation> = {}): Extract<CatalogCommand, { kind: 'saveCatalogProduct' }> {
  return { kind: 'saveCatalogProduct', id: 'edit', occurredAt: now, product: { ...product, ...patch },
    expectedRevision: 0, isNew: false };
}

test('metadata save ignores stale stock and preserves physical cost basis and audit', () => {
  const state = setup();
  state.finishedBalances[0].quantity = 5;
  state.finishedBalances[0].average_unit_cost = 70;
  const before = structuredClone(state);
  const next = applyCatalogCommand(state, save({ name: 'Edited', quantity: 3, base_cost: 120, final_price: 700, stock_quantity: 999 }));
  assert.deepEqual(state, before);
  assert.equal(next.legacyProducts![0].stock_quantity, 5);
  assert.equal(next.legacyProducts![0].name, 'Edited');
  assert.equal(next.legacyProducts![0].catalog_revision, 1);
  assert.deepEqual(next.finishedBalances, before.finishedBalances);
  assert.deepEqual(next.finishedMovements, before.finishedMovements);
  assert.deepEqual(next.productionEvents, []);
});

test('new product may record explicit opening stock without consuming material', () => {
  const state = emptyFoundationState('alice'); state.legacyProducts = [];
  const next = applyCatalogCommand(state, { ...save(), isNew: true });
  assert.equal(next.finishedBalances[0].quantity, 2);
  assert.equal(next.finishedBalances[0].average_unit_cost, 50);
  assert.equal(next.finishedMovements[0].source, 'opening_balance');
  assert.equal(next.productionEvents.length, 0);
  assert.equal(next.filamentMovements.length, 0);
});

test('archive and catalog undo retain current produced stock, ledger and parent IDs', () => {
  const state = applyInventoryCommand(setup(), { kind: 'produce', id: 'produce', occurredAt: now,
    productId: product.id, quantity: 1, recipe: { version: 1, materials: [], non_material_unit_cost: 200, product_snapshot: product } });
  const archived = applyCatalogCommand(state, { kind: 'archiveCatalogProducts', id: 'delete', occurredAt: now, productIds: [product.id] });
  assert.equal(archived.legacyProducts![0].catalog_archived, true);
  assert.equal(archived.finishedBalances[0].product_id, product.id);
  const restored = applyCatalogCommand(archived, { kind: 'restoreCatalog', id: 'undo', occurredAt: now, products: [product] });
  assert.equal(restored.legacyProducts![0].catalog_archived, false);
  assert.equal(restored.legacyProducts![0].stock_quantity, 3);
  assert.deepEqual(restored.finishedBalances, state.finishedBalances);
  assert.deepEqual(restored.productionEvents, state.productionEvents);
  assert.deepEqual(restored.finishedMovements, state.finishedMovements);
});

test('stale editor and foreign or non-finite metadata fail without writes', () => {
  const state = applyCatalogCommand(setup(), save());
  assert.throws(() => applyCatalogCommand(state, save({ name: 'Stale' })), /BUSINESS_CATALOG_REVISION_CONFLICT/);
  assert.throws(() => applyCatalogCommand(setup(), save({ user_id: 'bob' })));
  assert.throws(() => applyCatalogCommand(setup(), save({ final_price: NaN })));
  assert.throws(() => applyCatalogCommand(setup(), { ...save(), isNew: true }), /BUSINESS_CATALOG_REVISION_CONFLICT/);
});

test('targeted undo restores only changed IDs and refuses overwriting later edits', () => {
  const original = setup();
  let current = applyCatalogCommand(original, { kind: 'archiveCatalogProducts', id: 'archive', occurredAt: now, productIds: ['product'] });
  current = applyCatalogCommand(current, { ...save({ id: 'new', name: 'Concurrent' }), id: 'new', isNew: true });
  const command: CatalogCommand = { kind: 'restoreCatalog', id: 'undo-targeted', occurredAt: now,
    products: [product], productIds: ['product'], expectedRevisions: { product: 1 } };
  const restored = applyCatalogCommand(current, command);
  assert.equal(restored.legacyProducts?.find(row => row.id === 'new')?.catalog_archived, false);
  assert.equal(restored.legacyProducts?.find(row => row.id === 'product')?.name, 'Original');
  const newer = applyCatalogCommand(current, { ...save({ name: 'Newer' }), expectedRevision: 1 });
  assert.throws(() => applyCatalogCommand(newer, command), /BUSINESS_CATALOG_REVISION_CONFLICT/);
});
