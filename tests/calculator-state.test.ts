import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCalculatorNumber, resolveCalculatorSelection, resolveCalculatorLabor, calculatorPricingSnapshot } from '../src/features/calculate-cost/model/calculatorState';
import { calculateCost, recalculateAllProducts } from '../src/features/calculate-cost/model/calculate';
import { resetPersistentKeys } from '../src/shared/lib/persistentStorage';
import { getScopedStorageKey } from '../src/shared/lib/storageScope';
import type { Settings, SavedCalculation } from '../src/shared/types';

const settings: Settings = {
  currency: '₽', electricity_rate: 0, default_printer_id: null,
  labor_rate_per_hour: 600, labor_time_minutes: 30,
  default_markup_percent: 100, default_defect_percent: 5,
  enable_material_difficulty: false, is_owner_labor_default: true, is_labor_per_unit_default: true,
};

test('saved zero overrides survive JSON storage and product recalculation', () => {
  const filament = { id: 'f', name: 'PLA', color: '#fff', price: 1000, weight_g: 1000 };
  const pricing = calculatorPricingSnapshot({ laborMinutes: '0', laborRate: '0', markup: '0', defect: '0' });
  const item = JSON.parse(JSON.stringify({ id: 'saved', name: 'Zero overrides',
    weight_g: 100, hours: 0, minutes: 0, quantity: 1, filament_id: 'f',
    base_cost: 100, final_price: 100, ...pricing,
  })) as SavedCalculation;
  assert.deepEqual(pricing, { labor_minutes: 0, labor_rate_per_hour: 0, markup_percent: 0, defect_percent: 0 });
  const [updated] = recalculateAllProducts([item], [filament], [], settings);
  assert.equal(updated.final_price, 100);
  assert.equal(updated.base_cost, 100);
});

test('calculator numeric parsing rejects negative and non-finite values while preserving decimals', () => {
  for (const value of ['-100', 'Infinity', 'NaN', '1e999', '']) assert.equal(parseCalculatorNumber(value), 0);
  assert.equal(parseCalculatorNumber('12.5'), 12.5);
  assert.equal(parseCalculatorNumber('12.5', true), 12);
});

test('unset labor follows settings while explicit zero and false remain overrides', () => {
  const defaults = resolveCalculatorLabor(settings, '', null, null);
  assert.deepEqual(defaults, { minutes: '30', isOwner: true, isPerUnit: true });
  assert.deepEqual(resolveCalculatorLabor(settings, '0', false, false), { minutes: '0', isOwner: false, isPerUnit: false });
  const result = calculateCost({ weightG: 0, hours: 0, minutes: 0, quantity: 2,
    laborMinutes: Number(defaults.minutes), isOwnerLabor: defaults.isOwner, isLaborPerUnit: defaults.isPerUnit,
    filament: null, printer: null, settings });
  assert.equal(result.laborCost, 600);
  assert.equal(result.laborInCost, 0);
});

test('missing selection resolves to an existing default and never retains deleted IDs', () => {
  const items = [{ id: 'first' }, { id: 'default' }];
  assert.equal(resolveCalculatorSelection(items, 'deleted', 'default')?.id, 'default');
  assert.equal(resolveCalculatorSelection(items, 'first', 'default')?.id, 'first');
  assert.equal(resolveCalculatorSelection(items, 'deleted', 'deleted')?.id, 'first');
  assert.equal(resolveCalculatorSelection([], 'deleted'), null);
});

test('legacy product recalculation uses configured labor defaults when overrides are absent', () => {
  const item = { id: 'legacy', weight_g: 100, hours: 0, minutes: 0, quantity: 2 } as SavedCalculation;
  const [updated] = recalculateAllProducts([item], [], [], settings);
  assert.equal(updated.final_price, 600);
  assert.equal(updated.base_cost, 0);
});

test('model reset clears current-user storage and notifies mounted subscribers without clearing another user', () => {
  const store = new Map<string, string>();
  const events = new EventTarget();
  const notified: string[] = [];
  const keys = ['3d_calc_stl_url', '3d_calc_stl_file_name', '3d_calc_stl_file_data'];
  for (const key of keys) {
    store.set(getScopedStorageKey(key), 'old-model');
    store.set(`${key}::user:other`, 'other-model');
  }
  events.addEventListener('3d-persistent-state-changed', event => {
    const key = (event as CustomEvent<{ key: string }>).detail.key;
    assert.equal(store.has(key), false);
    notified.push(key);
  });
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { removeItem: (key: string) => store.delete(key) },
    dispatchEvent: events.dispatchEvent.bind(events),
  } });
  try {
    resetPersistentKeys(keys);
    assert.equal(notified.length, 3);
    for (const key of keys) assert.equal(store.get(`${key}::user:other`), 'other-model');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
