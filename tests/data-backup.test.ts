import assert from 'node:assert/strict';
import test from 'node:test';
import { createDataBackup, parseDataBackup, type DataBackupSnapshot } from '../src/shared/lib/dataBackup';

const snapshot: DataBackupSnapshot = {
  filaments: [{ id: 'filament-1', name: 'PLA', weight_g: 1000, price: 1500 }],
  printers: [{ id: 'printer-1', name: 'CoreXY', power_w: 120, price: 45000, lifespan_hours: 10000 }],
  settings: {
    currency: '₽', electricity_rate: 4.89, default_printer_id: null, labor_rate_per_hour: 0,
    labor_time_minutes: 15, default_markup_percent: 100, default_defect_percent: 5,
  },
  savedCalculations: [{
    id: 'calculation-1', name: 'Bracket', filament_name: 'PLA', printer_name: 'CoreXY',
    weight_g: 20, hours: 1, minutes: 30, quantity: 1, base_cost: 40, final_price: 120,
  }],
  collections: [{ id: 'collection-1', name: 'Workshop' }],
  orders: [{
    id: 'order-1', date: '2026-09-05', type: 'income', title: 'Bracket', amount: 120,
    cost: 40, payment: 120, client: 'Direct', contact: '+70000000000', deadline: '2026-09-06',
    status: 'Готово', notes: '', contacts: [{ type: 'phone', value: '+70000000000' }],
  }],
  monthlyGoals: { defaultGoal: 10000, targetType: 'profit' as const, monthlyGoals: { '2026-09': 15000 } },
};

test('backup V2 exports literal orders and monthly goals', () => {
  const backup = createDataBackup(snapshot);

  assert.equal(backup.version, 2);
  assert.deepEqual(backup.orders, snapshot.orders);
  assert.deepEqual(backup.monthlyGoals, snapshot.monthlyGoals);
});

test('backup creator owns the V2 envelope fields', () => {
  const backup = createDataBackup({ ...snapshot, version: 1, exportedAt: 'stale' } as unknown as DataBackupSnapshot);

  assert.equal(backup.version, 2);
  assert.notEqual(backup.exportedAt, 'stale');
});

test('legacy backup keeps omitted orders and monthly goals absent', () => {
  const legacy = {
    filaments: snapshot.filaments,
    printers: snapshot.printers,
    settings: snapshot.settings,
    savedCalculations: snapshot.savedCalculations,
    collections: snapshot.collections,
  };

  const parsed = parseDataBackup(legacy);

  assert.equal(parsed.orders, undefined);
  assert.equal(parsed.monthlyGoals, undefined);
});

test('version 2 backup requires an exportedAt string', () => {
  const backup = createDataBackup(snapshot) as unknown as Record<string, unknown>;
  delete backup.exportedAt;

  assert.throws(() => parseDataBackup(backup), /exportedAt/);
  backup.exportedAt = 'not-a-timestamp';
  assert.throws(() => parseDataBackup(backup), /exportedAt/);
});

test('backup parsing rejects malformed nested order contacts', () => {
  const malformed = {
    ...createDataBackup(snapshot),
    orders: [{ ...snapshot.orders[0], contacts: [{ type: 'phone', value: 42 }] }],
  };

  assert.throws(() => parseDataBackup(malformed), /orders\[0\]\.contacts\[0\]/);
});
