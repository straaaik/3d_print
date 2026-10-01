import test from 'node:test';
import assert from 'node:assert/strict';
import { readVersionedJson, writeVersionedJson } from '../src/shared/lib/versionedStorage';
import { backfillLegacyOrderItems } from '../src/shared/lib/orderSnapshots';
import type { Order } from '../src/shared/types';
import type { CustomCostItem } from '../src/shared/types';
import { calculatePrintCost } from '../src/shared/lib/formulas';
import { loadFoundationState, commitFoundationState } from '../src/shared/lib/foundationStorage';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test('legacy cache migration preserves amounts, custom cost behavior and original recovery copy', () => {
  const key = '3d_calc_saved_calculations::user:alice';
  const original = JSON.stringify([{ id: 'p', base_cost: 20, final_price: 45, custom_cost_items: [
    { id: 'a', amount: 10, isEnabled: true, target: 'profit' },
    { id: 'b', amount: 5, isEnabled: true },
    { id: 'c', amount: 2, isEnabled: true, mode: 'cost_no_markup' },
  ] }]);
  const storage = memoryStorage({ [key]: original });
  const result = readVersionedJson<Array<{ base_cost: number; final_price: number; custom_cost_items: { mode: string }[] }>>(storage, key, []);
  assert.equal(result[0].base_cost, 20);
  assert.equal(result[0].final_price, 45);
  // Legacy screens still edit target, so migration must not freeze it as a mode.
  assert.deepEqual(result[0].custom_cost_items.map(item => item.mode), [undefined, undefined, 'cost_no_markup']);
  assert.equal(storage.getItem(`${key}::before-v1`), original);
  assert.deepEqual(readVersionedJson(storage, key, []), result);
  assert.equal(storage.getItem('3d_calc_saved_calculations::user:bob'), null);
});

test('corrupt cache is retained instead of deleted or rewritten', () => {
  const storage = memoryStorage({ broken: '{bad' });
  assert.deepEqual(readVersionedJson(storage, 'broken', []), []);
  assert.equal(storage.getItem('broken'), '{bad');
  assert.throws(() => writeVersionedJson(storage, 'broken', []));
  assert.equal(storage.getItem('broken'), '{bad');
});

test('editing a migrated legacy target still changes the financial result', () => {
  const storage = memoryStorage({ costs: JSON.stringify([
    { id: 'legacy', name: 'Legacy extra', amount: 100, isEnabled: true, target: 'cost' },
  ]) });
  const costs = readVersionedJson<CustomCostItem[]>(storage, 'costs', []);
  const params = { weightG: 0, hours: 0, minutes: 0, laborMinutes: 0, quantity: 1,
    markupPercent: 100, defectPercent: 0, filament: null, printer: null, settings: null };
  const before = calculatePrintCost({ ...params, customCostItems: costs });
  assert.equal(before.totalBaseCost, 100);
  assert.equal(before.totalFinalPrice, 200);
  const edited: CustomCostItem[] = costs.map(item => ({ ...item, target: 'profit' }));
  writeVersionedJson(storage, 'costs', edited);
  const after = calculatePrintCost({ ...params, customCostItems: readVersionedJson(storage, 'costs', []) });
  assert.equal(after.totalBaseCost, 0);
  assert.equal(after.totalFinalPrice, 100);
});

test('cache with a future version is not downgraded', () => {
  const storage = memoryStorage({ data: '[1]', 'data::schema-version': '99' });
  assert.deepEqual(readVersionedJson(storage, 'data', []), []);
  assert.equal(storage.getItem('data'), '[1]');
  assert.equal(storage.getItem('data::schema-version'), '99');
  assert.throws(() => writeVersionedJson(storage, 'data', [2]));
  assert.equal(storage.getItem('data'), '[1]');
});

test('read-only storage still provides migrated legacy values without losing source data', () => {
  const original = '[{"custom_cost_items":[{"target":"profit","amount":12}]}]';
  const storage = { getItem: (key: string) => key === 'data' ? original : null, setItem: () => { throw new Error('quota'); } };
  const result = readVersionedJson<{ custom_cost_items: { mode: string }[] }[]>(storage, 'data', []);
  assert.equal(result[0].custom_cost_items[0].mode, undefined);
  assert.equal(storage.getItem('data'), original);
});

test('legacy income snapshot preserves aggregate order cost and price, never infers production', () => {
  const order = { id: 'o', user_id: 'alice', title: 'Old item', type: 'income', quantity: 5, amount: 100, cost: 60, payment: 50, product_id: 'p', status: 'Готово' } as Order;
  const result = backfillLegacyOrderItems([order], [], 'alice');
  assert.equal(result.length, 1);
  assert.equal(result[0].total_cost, 60);
  assert.equal(result[0].total_price, 100);
  assert.equal(result[0].quantity, 5);
  assert.equal(result[0].unit_cost, 12);
  assert.equal(result[0].cost_provenance, 'legacy');
  assert.equal(result[0].production_quantity, 0);
  assert.equal(result[0].snapshot.order.title, 'Old item');
  order.title = 'Changed later';
  assert.equal(result[0].snapshot.order.title, 'Old item');
  assert.deepEqual(backfillLegacyOrderItems([order], result, 'alice'), result);
});

test('backfill skips expenses, other users and invalid quantities rather than inventing financial history', () => {
  const base = { id: 'o', user_id: 'alice', title: 'Old', type: 'income', quantity: 1, amount: 100, cost: 60 } as Order;
  const orders = [{ ...base, type: 'expense' }, { ...base, user_id: 'bob' }, { ...base, quantity: 0 }, { ...base, cost: NaN }] as Order[];
  assert.deepEqual(backfillLegacyOrderItems(orders, [], 'alice'), []);
});

test('foundation cache migrates v0 without clearing data and keeps scopes isolated', () => {
  const key = '3d_business_state::user:alice';
  const original = JSON.stringify({ version: 0, user_id: 'alice', revision: 4, manufacturers: [{ id: 'maker', user_id: 'alice', created_at: '2026-01-01', name: 'Maker' }] });
  const storage = memoryStorage({ [key]: original });
  const result = loadFoundationState(storage, 'alice');
  assert.equal(result.status, 'ready');
  assert.equal(result.state.manufacturers[0].name, 'Maker');
  assert.equal(result.state.version, 1);
  assert.equal(result.state.revision, 4);
  assert.equal(storage.getItem(`${key}::before-v1`), original);
  assert.equal(loadFoundationState(storage, 'bob').state.manufacturers.length, 0);
});

test('whole-state commit detects stale revisions and leaves prior state on storage failure', () => {
  const storage = memoryStorage();
  const initial = loadFoundationState(storage, 'alice').state;
  const next = commitFoundationState(storage, 'alice', initial, 0);
  assert.equal(next.revision, 1);
  assert.throws(() => commitFoundationState(storage, 'alice', initial, 0), /revision/i);
  const original = storage.getItem('3d_business_state::user:alice');
  const unavailable = { getItem: storage.getItem, setItem: () => { throw new Error('quota'); } };
  assert.throws(() => commitFoundationState(unavailable, 'alice', next, 1), /quota/);
  assert.equal(storage.getItem('3d_business_state::user:alice'), original);
});

test('corrupt, future and cross-user foundation state cannot be overwritten', () => {
  for (const raw of ['{bad', '{"version":99,"user_id":"alice"}', '{"version":1,"user_id":"bob"}']) {
    const key = '3d_business_state::user:alice';
    const storage = memoryStorage({ [key]: raw });
    const loaded = loadFoundationState(storage, 'alice');
    assert.notEqual(loaded.status, 'ready');
    assert.throws(() => commitFoundationState(storage, 'alice', loaded.state, 0), /cache/i);
    assert.equal(storage.getItem(key), raw);
  }
});
