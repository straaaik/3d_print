import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearAllDatabaseTablesWithClient,
  resetAndSeedDatabaseWithClient,
  restoreDatabaseSnapshotWithClient,
  STORAGE_KEYS,
} from '../src/shared/api/db';
import { createDataBackup } from '../src/shared/lib/dataBackup';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function withBrowserStorage(run: (storage: MemoryStorage) => Promise<void> | void) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });
  return Promise.resolve(run(storage)).finally(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  });
}

function createAtomicClient(error?: unknown) {
  return {
    from() { throw new Error('Cloud snapshots must not use non-atomic table writes.'); },
    rpc: async () => ({ error: error ?? null }),
  };
}

test('returned atomic Supabase error rejects maintenance without clearing local data or queue', async () => {
  await withBrowserStorage(async (storage) => {
    storage.setItem(STORAGE_KEYS.FILAMENTS, '[{"id":"keep"}]');
    storage.setItem(STORAGE_KEYS.SYNC_QUEUE, '[{"entity":"filaments"}]');

    await assert.rejects(
      clearAllDatabaseTablesWithClient(createAtomicClient({ message: 'failed snapshot' })),
      /атомарная очистка базы/,
    );

    assert.equal(storage.getItem(STORAGE_KEYS.FILAMENTS), '[{"id":"keep"}]');
    assert.equal(storage.getItem(STORAGE_KEYS.SYNC_QUEUE), '[{"entity":"filaments"}]');
  });
});

test('offline reset clears a pre-existing sync queue after local completion', async () => {
  await withBrowserStorage(async (storage) => {
    storage.setItem(STORAGE_KEYS.SYNC_QUEUE, '[{"entity":"orders"}]');
    const backup = createDataBackup({
      filaments: [], printers: [], settings: {
        currency: '₽', electricity_rate: 4.89, default_printer_id: null,
        labor_rate_per_hour: 0, labor_time_minutes: 15, default_markup_percent: 100, default_defect_percent: 5,
      }, savedCalculations: [], collections: [], orders: [],
      monthlyGoals: { defaultGoal: 0, targetType: 'profit', monthlyGoals: {} },
    });

    await resetAndSeedDatabaseWithClient({
      filaments: backup.filaments,
      printers: backup.printers,
      settings: backup.settings!,
      savedCalculations: backup.savedCalculations,
      collections: backup.collections,
      orders: backup.orders,
    }, null);

    assert.equal(storage.getItem(STORAGE_KEYS.SYNC_QUEUE), '[]');
  });
});

test('malformed restore is rejected before cloud writes begin', async () => {
  const calls: string[] = [];
  const client = {
    from(table: string) {
      calls.push(`from:${table}`);
      return {
        delete: () => ({ neq: async () => ({ error: null }) }),
        insert: async () => ({ error: null }),
      };
    },
    rpc: async () => {
      calls.push('rpc');
      return { error: null };
    },
  };

  await assert.rejects(
    restoreDatabaseSnapshotWithClient({
      version: 2,
      exportedAt: new Date().toISOString(),
      filaments: [],
      printers: [],
      settings: null,
      savedCalculations: [],
      collections: [],
      orders: [{ id: 'order-1', date: '2026-09-05', type: 'income', title: 'Broken', amount: 1, cost: 1, payment: 1,
        client: 'Direct', contact: '', deadline: '', status: 'Готово', notes: '', contacts: [{ type: 'phone', value: 42 }] }],
      monthlyGoals: { defaultGoal: 0, targetType: 'profit', monthlyGoals: {} },
    }, client),
    /orders\[0\]\.contacts\[0\]/,
  );
  assert.deepEqual(calls, []);
});

test('restore strips imported owners and delegates ownership to one atomic RPC', async () => {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> | undefined }> = [];
  const client = {
    from() { throw new Error('Cloud snapshots must not use non-atomic table writes.'); },
    rpc: async (name: string, args?: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return { error: null };
    },
  };

  await restoreDatabaseSnapshotWithClient({
    version: 2,
    exportedAt: new Date().toISOString(),
    filaments: [{ id: 'filament-1', user_id: 'old-user', name: 'PLA', weight_g: 1000, price: 100 }],
    printers: [],
    settings: null,
    savedCalculations: [],
    collections: [{ id: 'collection-1', user_id: 'old-user', name: 'Workshop', tags: [] }],
    orders: [],
    monthlyGoals: { defaultGoal: 0, targetType: 'profit', monthlyGoals: {} },
  }, client);

  assert.deepEqual(rpcCalls.map(call => call.name), ['restore_database_snapshot']);
  const payload = rpcCalls[0].args?.p_snapshot as Record<string, unknown>;
  const filamentRows = payload.filaments as Record<string, unknown>[];
  assert.equal(filamentRows[0].user_id, undefined);
  assert.equal(filamentRows[0].old_ui_only, undefined);
});

test('missing snapshot migration preserves local data and pending synchronization', async () => {
  await withBrowserStorage(async (storage) => {
    storage.setItem(STORAGE_KEYS.FILAMENTS, '[{"id":"keep"}]');
    storage.setItem(STORAGE_KEYS.SYNC_QUEUE, '[{"entity":"filaments"}]');
    await assert.rejects(restoreDatabaseSnapshotWithClient({ filaments: [] },
      createAtomicClient({ code: 'PGRST202' })), /требует обновления базы/);
    assert.equal(storage.getItem(STORAGE_KEYS.FILAMENTS), '[{"id":"keep"}]');
    assert.equal(storage.getItem(STORAGE_KEYS.SYNC_QUEUE), '[{"entity":"filaments"}]');
  });
});

test('legacy cloud restore omits sections absent from the backup', async () => {
  let payload: Record<string, unknown> | undefined;
  await restoreDatabaseSnapshotWithClient({ savedCalculations: [] }, {
    from() { throw new Error('Non-atomic table write'); },
    rpc: async (_name, args) => {
      payload = args?.p_snapshot as Record<string, unknown>;
      return { error: null };
    },
  });
  assert.deepEqual(payload, { saved_calculations: [] });
});

test('restore sends exact backup stock in one atomic snapshot', async () => {
  await withBrowserStorage(async (storage) => {
    const calls: Array<{ name: string; args: Record<string, unknown> | undefined }> = [];
    const client = {
    from() { throw new Error('Cloud snapshots must not use non-atomic table writes.'); },
    rpc: async (name: string, args?: Record<string, unknown>) => {
      calls.push({ name, args });
      return { error: null };
    },
    };

    await restoreDatabaseSnapshotWithClient({
    version: 2,
    exportedAt: new Date().toISOString(),
    filaments: [],
    printers: [],
    settings: null,
    savedCalculations: [{ id: 'product-1', name: 'Product', filament_name: 'PLA', printer_name: 'CoreXY',
      weight_g: 20, hours: 1, minutes: 0, quantity: 1, base_cost: 10, final_price: 30, stock_quantity: 3 }],
    collections: [],
    orders: [{ id: 'order-1', date: '2026-09-05', type: 'income', title: 'Product', amount: 30, cost: 10,
      payment: 30, client: 'Direct', contact: '', deadline: '', status: 'Готово', notes: '', quantity: 2, product_id: 'product-1' }],
    monthlyGoals: { defaultGoal: 0, targetType: 'profit', monthlyGoals: {} },
    }, client);

    assert.deepEqual(calls.map(call => call.name), ['restore_database_snapshot']);
    const payload = calls[0].args?.p_snapshot as { saved_calculations: Array<{ stock_quantity: number }> };
    assert.equal(payload.saved_calculations[0].stock_quantity, 3);
    assert.equal(JSON.parse(storage.getItem(STORAGE_KEYS.SAVED_CALCULATIONS) || '[]')[0].stock_quantity, 3);
  });
});

test('cloud reset uses one atomic RPC and never performs destructive client-side writes', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> | undefined }> = [];
  const client = {
    from() { throw new Error('Cloud snapshots must not use non-atomic table writes.'); },
    rpc: async (name: string, args?: Record<string, unknown>) => {
      calls.push({ name, args });
      return { error: null };
    },
  };
  const settings = {
    currency: '₽', electricity_rate: 4.89, default_printer_id: null,
    labor_rate_per_hour: 0, labor_time_minutes: 15, default_markup_percent: 100, default_defect_percent: 5,
  };

  await resetAndSeedDatabaseWithClient({
    filaments: [], printers: [], settings, savedCalculations: [], collections: [], orders: [],
  }, client);

  assert.deepEqual(calls.map(call => call.name), ['restore_database_snapshot']);
  assert.deepEqual(Object.keys(calls[0].args?.p_snapshot as object).sort(), [
    'collections', 'filaments', 'monthly_goals', 'orders', 'printers', 'saved_calculations', 'settings',
  ]);
});
