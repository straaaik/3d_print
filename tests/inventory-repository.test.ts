import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryRepository, type InventoryRequest, type InventoryTransport } from '../src/shared/api/inventoryRepository';
import { emptyFoundationState, foundationStorageKey } from '../src/shared/lib/foundationStorage';
import { bootstrapInventoryState } from '../src/shared/lib/inventoryEngine';
import { applyLegacyOrderCommand, isLegacyOrderCommand } from '../src/shared/lib/legacyInventoryOrders';
import { applyCatalogCommand, isCatalogCommand } from '../src/shared/lib/catalogCommands';
import { applyBusinessOrderCommand, isBusinessOrderCommand } from '../src/shared/lib/businessOrders';
import { backfillLegacyOrderItems } from '../src/shared/lib/orderSnapshots';
import type { FoundationState } from '../src/shared/types/foundation';
import type { Order, SavedCalculation } from '../src/shared/types';

const filament = { id: 'f', name: 'PLA', weight_g: 500, price: 10, color: '#ffffff' };
const purchase = { kind: 'purchase' as const, id: 'buy-1', occurredAt: '2026-09-29T12:00:00Z', variantId: 'f', weightG: 1000, totalPrice: 24 };
const product: SavedCalculation = { id: 'p', name: 'Part', filament_name: 'PLA', printer_name: '',
  weight_g: 20, hours: 0, minutes: 0, quantity: 1, base_cost: 2, final_price: 10, stock_quantity: 2 };
const order: Order = { id: 'o', title: 'Order', type: 'income', date: '2026-09-30', product_id: 'p',
  quantity: 1, amount: 10, cost: 2, payment: 0, client: '', contact: '', deadline: '', status: 'Не в работе', notes: '' };

test('maintenance retry reaches receipt before load and replays only post-restore purchases once', async () => {
  const f = fixture();
  const base = { ...bootstrapInventoryState(emptyFoundationState('alice'), [filament], [product]), generation: 1 };
  const after = structuredClone(base); after.variants[0].stock_g = 1500;
  const command = { ...purchase, generation: 1 };
  const intent = { id: 'restore', occurredAt: purchase.occurredAt, expectedRevision: 3, generation: 0, snapshot: { business: base } };
  f.storage.setItem(foundationStorageKey('alice'), JSON.stringify({ ...after, inventoryCacheVersion: 1,
    remoteInventoryRevision: 3, pendingMaintenance: intent, pendingInventory: [command] }));
  let maintenance = 0, commits = 0;
  const repo = createInventoryRepository({ ...f, ownerId: 'alice', transport: {
    async load() { throw new Error('Must not drain legacy queue or load before restore receipt'); },
    async maintain(request) {
      assert.deepEqual(request, intent); maintenance++;
      if (maintenance === 1) throw new Error('lost response');
      return { ...base, revision: 4 };
    },
    async commit(revision, request, state) {
      commits++; assert.equal(revision, 4); assert.equal(request.generation, 1);
      return { ...state, revision: 5 };
    },
  } });
  assert.equal((await repo.sync()).pendingCount, 2);
  const result = await repo.sync();
  assert.equal(result.syncError, null); assert.equal(result.pendingCount, 0);
  assert.equal(result.state.variants[0].stock_g, 1500);
  assert.equal(result.state.purchases.length, 1); assert.equal(commits, 1);
  assert.equal(JSON.parse(f.storage.getItem(foundationStorageKey('alice'))!).pendingMaintenance, undefined);
});

test('explicit full server choice preserves rejected generation and replaces every local resource atomically', async () => {
  const f = fixture();
  const storage = { ...f.storage, removeItem: (key: string) => f.values.delete(key) };
  const rejected = { ...emptyFoundationState('alice'), pendingInventory: [purchase], inventoryCacheVersion: 1,
    remoteInventoryRevision: 1, pendingMaintenance: { id: 'restore', occurredAt: purchase.occurredAt, expectedRevision: 1, generation: 0, snapshot: {} } };
  storage.setItem(foundationStorageKey('alice'), JSON.stringify(rejected));
  storage.setItem('3d_calc_printers::user:alice', '[{"id":"local"}]');
  const remote = { ...emptyFoundationState('alice'), legacyOrders: [], legacyProducts: [], generation: 2, revision: 20 };
  const repo = createInventoryRepository({ ...f, storage, ownerId: 'alice', transport: {
    ...f.transport, async loadFull() { return { business: remote, printers: [], filaments: [], settings: [], collections: [],
      saved_calculations: [], orders: [], monthly_goals: [] }; },
  } });
  const result = await repo.acceptMaintenanceServerVersion();
  assert.equal(result.pendingCount, 0); assert.equal(result.state.generation, 2);
  assert.equal(storage.getItem('3d_calc_printers::user:alice'), '[]');
  const backups = JSON.parse(storage.getItem('3d_business_maintenance_conflicts::user:alice')!);
  assert.deepEqual(backups[0].business.pendingInventory, [purchase]);
  assert.equal(backups[0].values['3d_calc_printers::user:alice'], '[{"id":"local"}]');
});

test('a reset in another tab cannot rebase pre-reset offline purchases into the new history', async () => {
  const f = fixture();
  const initial = bootstrapInventoryState(emptyFoundationState('alice'), [filament], [product]);
  f.storage.setItem(foundationStorageKey('alice'), JSON.stringify({ ...initial, inventoryCacheVersion: 1,
    remoteInventoryRevision: 4, pendingInventory: [purchase] }));
  let commits = 0;
  const remote = { ...emptyFoundationState('alice'), generation: 1, revision: 5 };
  const repo = createInventoryRepository({ ...f, ownerId: 'alice', transport: {
    async load() { return remote; }, async commit() { commits += 1; return remote; },
  } });
  const result = await repo.sync();
  assert.match(result.syncError!, /BUSINESS_GENERATION_CONFLICT/);
  assert.equal(result.pendingCount, 1);
  assert.equal(commits, 0);
  assert.equal(result.state.variants[0].stock_g, 500);
});

test('explicit server choice resolves consecutive catalog conflicts without losing later inventory or local proposals', async () => {
  const f = fixture();
  const products = [product, { ...product, id: 'q', name: 'Second' }].map(row => ({ ...row, user_id: 'alice', catalog_revision: 0 }));
  let remote = { ...bootstrapInventoryState(emptyFoundationState('alice'), [filament], products), legacyProducts: products, legacyOrders: [] } as FoundationState;
  let online = true;
  const transport: InventoryTransport = {
    async load() { if (!online) throw new Error('offline'); return structuredClone(remote); },
    async commit(revision, command, state) {
      if (isCatalogCommand(command)) applyCatalogCommand(remote, command);
      remote = { ...state, revision: revision + 1 }; return structuredClone(remote);
    },
  };
  const repo = createInventoryRepository({ ownerId: 'alice', ...f, transport });
  await repo.load([filament], products, []);
  online = false;
  for (const row of products) await repo.execute({ kind: 'saveCatalogProduct', id: `edit-${row.id}`,
    occurredAt: purchase.occurredAt, product: { ...row, name: 'Local ' + row.id }, expectedRevision: 0, isNew: false });
  await repo.execute(purchase);
  remote.legacyProducts = products.map(row => ({ ...row, name: 'Server ' + row.id, catalog_revision: 1 }));
  remote.revision += 1;
  online = true;
  assert.match((await repo.sync()).syncError!, /BUSINESS_CATALOG_REVISION_CONFLICT/);
  const first = await repo.acceptCatalogServerVersion();
  assert.match(first.syncError!, /BUSINESS_CATALOG_REVISION_CONFLICT/);
  assert.equal(first.pendingCount, 2);
  const second = await repo.acceptCatalogServerVersion();
  assert.equal(second.pendingCount, 0);
  assert.equal(second.state.variants[0].stock_g, 1500);
  assert.deepEqual(second.state.legacyProducts?.map(row => row.name), ['Server p', 'Server q']);
  const stored = JSON.parse(f.storage.getItem(foundationStorageKey('alice'))!);
  assert.equal(stored.catalogConflictBackups.length, 2);
  assert.equal(stored.catalogConflictBackups[0].commands[0].product.name, 'Local p');
  assert.equal(stored.catalogConflictBackups[1].commands[0].product.name, 'Local q');
});

test('offline order reservation, production and purchase share one recoverable queue', async () => {
  const f = fixture();
  const repo = createInventoryRepository({ ...f, ownerId: 'alice' });
  await repo.load([filament], [product], []);
  await repo.execute({ kind: 'saveLegacyOrder', id: 'order-create', occurredAt: purchase.occurredAt, order });
  await repo.execute({ kind: 'produce', id: 'produce', occurredAt: purchase.occurredAt,
    productId: product.id, quantity: 1, recipe: { version: 1, materials: [{ variant_id: 'f', grams_per_unit: 20 }], non_material_unit_cost: 1, product_snapshot: product } });
  await repo.execute(purchase);
  const local = repo.inspect();
  assert.equal(local.state.finishedBalances[0].quantity, 2);
  assert.equal(local.state.legacyOrders?.length, 1);
  assert.equal(local.pendingCount, 4);
  f.online();
  f.loseResponse();
  await repo.sync();
  const restored = createInventoryRepository({ ...f, ownerId: 'alice' });
  const result = await restored.sync();
  assert.equal(result.pendingCount, 0);
  assert.equal(result.state.finishedBalances[0].quantity, 2);
  assert.equal(result.state.variants[0].stock_g, 1480);
  await restored.execute({ kind: 'deleteLegacyOrders', id: 'delete', occurredAt: purchase.occurredAt, orderIds: [order.id] });
  assert.equal(restored.inspect().state.finishedBalances[0].quantity, 3);
  assert.equal(restored.inspect().state.variants[0].stock_g, 1480);
});

test('failed legacy reservation leaves orders, stock and outbox unchanged', async () => {
  const f = fixture();
  const repo = createInventoryRepository({ ...f, ownerId: 'alice' });
  await repo.load([filament], [product], []);
  const before = f.storage.getItem(foundationStorageKey('alice'));
  await assert.rejects(repo.execute({ kind: 'saveLegacyOrder', id: 'over', occurredAt: purchase.occurredAt,
    order: { ...order, quantity: 3 } }), /На складе/);
  assert.equal(f.storage.getItem(foundationStorageKey('alice')), before);
});

test('reservation release preserves its original cost basis after more expensive production', async () => {
  const f = fixture();
  const repo = createInventoryRepository({ ...f, ownerId: 'alice' });
  await repo.load([filament], [{ ...product, stock_quantity: 5, base_cost: 10 }], []);
  await repo.execute({ kind: 'saveLegacyOrder', id: 'reserve', occurredAt: purchase.occurredAt, order: { ...order, quantity: 3 } });
  await repo.execute({ kind: 'produce', id: 'expensive', occurredAt: purchase.occurredAt,
    productId: product.id, quantity: 2, recipe: { version: 1, materials: [], non_material_unit_cost: 20, product_snapshot: product } });
  assert.equal(repo.inspect().state.finishedBalances[0].average_unit_cost, 15);
  const before = structuredClone(repo.inspect().state.finishedBalances);
  await repo.execute({ kind: 'saveLegacyOrder', id: 'payment', occurredAt: purchase.occurredAt,
    order: { ...order, quantity: 3, payment: 7 } });
  assert.deepEqual(repo.inspect().state.finishedBalances, before);
  await repo.execute({ kind: 'deleteLegacyOrders', id: 'release', occurredAt: purchase.occurredAt, orderIds: [order.id] });
  assert.equal(repo.inspect().state.finishedBalances[0].quantity, 7);
  assert.ok(Math.abs(repo.inspect().state.finishedBalances[0].average_unit_cost - 90 / 7) < 1e-8);
  assert.equal(repo.inspect().state.legacyOrders?.length, 0);
});

test('cloud bootstrap follows canonical product stock rather than an optimistic legacy cache', async () => {
  const f = fixture();
  let remote: FoundationState = { ...emptyFoundationState('alice'), legacyOrders: [],
    legacyProducts: [{ ...product, stock_quantity: 5 }] };
  const transport: InventoryTransport = {
    async load() { return structuredClone(remote); },
    async commit(revision, _command, state) {
      remote = { ...state, revision: revision + 1 };
      return structuredClone(remote);
    },
  };
  const repo = createInventoryRepository({ ...f, ownerId: 'alice', transport });
  const view = await repo.load([filament], [{ ...product, stock_quantity: 4 }], []);
  assert.equal(view.state.finishedBalances[0].quantity, 5);
  assert.equal(view.pendingCount, 0);
});

test('already drained legacy order reservation is not repeated by inventory bootstrap', async () => {
  const f = fixture();
  let remote = { ...bootstrapInventoryState(emptyFoundationState('alice'), [filament],
    [{ ...product, stock_quantity: 4 }]), legacyOrders: [order] };
  const transport: InventoryTransport = {
    async load() { return structuredClone(remote); },
    async commit(revision, _command, state) {
      remote = { ...state, legacyOrders: state.legacyOrders ?? [], revision: revision + 1 };
      return structuredClone(remote);
    },
  };
  const repo = createInventoryRepository({ ...f, ownerId: 'alice', transport });
  const view = await repo.load([filament], [{ ...product, stock_quantity: 4 }], [order]);
  assert.equal(view.state.finishedBalances[0].quantity, 4);
  assert.equal(view.state.legacyOrders?.length, 1);
  assert.equal(view.pendingCount, 0);
});
function fixture() {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
  let tail: Promise<unknown> = Promise.resolve();
  const lock = <T>(_name: string, callback: () => Promise<T>): Promise<T> => {
    const result = tail.then(callback);
    tail = result.catch(() => {});
    return result;
  };
  let remote = emptyFoundationState('alice');
  const receipts = new Map<string, InventoryRequest>();
  let offline = true;
  let loseResponse = false;
  let conflict = false;
  const transport: InventoryTransport = {
    async load() { if (offline) throw new Error('offline'); return structuredClone(remote); },
    async commit(revision, command, state) {
      if (offline) throw new Error('offline');
      if (receipts.has(command.id)) return structuredClone(remote);
      if (conflict) { conflict = false; remote.revision += 1; }
      if (revision !== remote.revision) throw new Error('BUSINESS_REVISION_CONFLICT');
      remote = structuredClone({ ...(isBusinessOrderCommand(command) ? applyBusinessOrderCommand(remote, command)
        : isLegacyOrderCommand(command) ? applyLegacyOrderCommand(remote, command) : state), revision: revision + 1 });
      receipts.set(command.id, command);
      if (loseResponse) { loseResponse = false; throw new Error('response lost'); }
      return structuredClone(remote);
    },
  };
  return { values, storage, lock, transport, remote: () => remote,
    replaceRemote: (state: FoundationState) => { remote = structuredClone(state); },
    online: () => { offline = false; }, loseResponse: () => { loseResponse = true; }, conflict: () => { conflict = true; } };
}

test('acknowledged legacy command can clear after lost response and a conflicting later order', async () => {
  const f = fixture(); f.online();
  const repo = createInventoryRepository({ ...f, ownerId: 'alice' });
  await repo.load([filament], [product], []);
  f.loseResponse();
  await repo.execute({ kind: 'saveLegacyOrder', id: 'lost-order', occurredAt: purchase.occurredAt,
    order: { ...order, quantity: 2 } });
  assert.equal(repo.inspect().pendingCount, 1);
  const later = { ...f.remote(), legacyOrders: [{ ...order, id: 'other-order', quantity: 2 }] };
  f.replaceRemote(later);
  const result = await repo.sync();
  assert.equal(result.pendingCount, 0);
  assert.equal(result.state.finishedBalances[0].quantity, 0);
  assert.equal(result.state.legacyOrders?.[0].id, 'other-order');
});

test('acknowledged business save reaches receipt after a later head revision and clears once', async () => {
  const f = fixture(); f.online();
  const repo = createInventoryRepository({ ...f, ownerId: 'alice' });
  await repo.load([filament], [product], []);
  const head = { ...order, user_id: 'alice', created_at: purchase.occurredAt, product_id: undefined };
  const create = { kind: 'saveBusinessOrder' as const, id: 'business-create', occurredAt: purchase.occurredAt,
    order: head, items: backfillLegacyOrderItems([head], [], 'alice'), expectedRevision: 0, isNew: true };
  f.loseResponse();
  assert.equal((await repo.execute(create)).pendingCount, 1);
  const current = f.remote().legacyOrders![0];
  f.replaceRemote(applyBusinessOrderCommand(f.remote(), { kind: 'saveBusinessOrder', id: 'other-tab-payment',
    occurredAt: purchase.occurredAt, order: { ...current, payment: 7 }, expectedRevision: 0, isNew: false }));
  const result = await repo.sync();
  assert.equal(result.pendingCount, 0);
  assert.equal(result.state.legacyOrders![0].payment, 7);
  assert.equal(result.state.legacyOrders![0].order_revision, 1);
  assert.equal(result.state.orderItems.length, 1);
});

test('accepting a stale business head keeps its proposal and drains unrelated queued purchase', async () => {
  const f = fixture();
  const head = { ...order, user_id: 'alice', created_at: purchase.occurredAt, product_id: undefined, order_revision: 0 };
  f.replaceRemote({ ...bootstrapInventoryState(emptyFoundationState('alice'), [filament], [product]),
    legacyProducts: [product], legacyOrders: [head], orderItems: backfillLegacyOrderItems([head], [], 'alice') });
  f.online();
  let offline = false;
  const transport = { ...f.transport, load: async () => { if (offline) throw new Error('offline'); return f.transport.load(); },
    commit: async (...args: Parameters<InventoryTransport['commit']>) => {
      if (offline) throw new Error('offline'); return f.transport.commit(...args);
    } };
  const repo = createInventoryRepository({ ...f, ownerId: 'alice', transport });
  await repo.load([filament], [product], [head]);
  offline = true;
  await repo.execute({ kind: 'saveBusinessOrder', id: 'local-payment', occurredAt: purchase.occurredAt,
    order: { ...head, payment: 3 }, expectedRevision: 0, isNew: false });
  await repo.execute(purchase);
  f.replaceRemote(applyBusinessOrderCommand(f.remote(), { kind: 'saveBusinessOrder', id: 'server-payment',
    occurredAt: purchase.occurredAt, order: { ...head, payment: 9 }, expectedRevision: 0, isNew: false }));
  offline = false;
  assert.match((await repo.sync()).syncError ?? '', /BUSINESS_ORDER_REVISION_CONFLICT/);
  const result = await repo.acceptOrderServerVersion();
  assert.equal(result.pendingCount, 0);
  assert.equal(result.state.legacyOrders![0].payment, 9);
  assert.equal(result.state.variants[0].stock_g, 1500);
  const persisted = JSON.parse(f.values.get(foundationStorageKey('alice'))!);
  assert.equal(persisted.orderConflictBackups[0].commands[0].order.payment, 3);
});

test('offline state and pending commands survive restart and reconcile without repricing old data', async () => {
  const f = fixture();
  const repo = createInventoryRepository({ ...f, ownerId: 'alice' });
  await repo.load([filament]);
  const offline = await repo.execute(purchase);
  assert.equal(offline.state.variants[0].stock_g, 1500);
  assert.equal(offline.pendingCount, 2);
  assert.equal(offline.mode, 'local');
  f.online();
  const resumed = createInventoryRepository({ ...f, ownerId: 'alice' });
  const synced = await resumed.sync();
  assert.equal(synced.pendingCount, 0);
  assert.equal(synced.state.variants[0].stock_g, 1500);
  assert.ok(Math.abs(synced.state.variants[0].average_cost_per_g - 34 / 1500) < 1e-7);
  assert.equal(f.remote().purchases.length, 1);
});

test('uncertain server completion retries the same command instead of buying twice', async () => {
  const f = fixture(); f.online();
  const repo = createInventoryRepository({ ...f, ownerId: 'alice' });
  await repo.load([filament]);
  f.loseResponse();
  assert.equal((await repo.execute(purchase)).pendingCount, 1);
  const result = await repo.sync();
  assert.equal(result.pendingCount, 0);
  assert.equal(result.state.variants[0].stock_g, 1500);
  assert.equal(result.state.purchases.length, 1);
});

test('revision conflict reloads cloud state and rebases the pending command', async () => {
  const f = fixture(); f.online();
  const repo = createInventoryRepository({ ...f, ownerId: 'alice' });
  await repo.load([filament]);
  f.conflict();
  const result = await repo.execute(purchase);
  assert.equal(result.syncError, null);
  assert.equal(result.pendingCount, 0);
  assert.equal(result.state.variants[0].stock_g, 1500);
});

test('two repository clients sharing a lock do not lose simultaneous offline purchases', async () => {
  const f = fixture();
  const a = createInventoryRepository({ ...f, ownerId: 'alice' });
  const b = createInventoryRepository({ ...f, ownerId: 'alice' });
  await a.load([filament]);
  await Promise.all([a.execute(purchase), b.execute({ ...purchase, id: 'buy-2', weightG: 500, totalPrice: 12 })]);
  const result = await a.sync();
  assert.equal(result.state.variants[0].stock_g, 2000);
  assert.equal(result.state.purchases.length, 2);
});

test('failed local persistence cannot leave stock changed without its queued command', async () => {
  const f = fixture();
  const repo = createInventoryRepository({ ...f, ownerId: 'alice' });
  await repo.load([filament]);
  const key = foundationStorageKey('alice');
  const original = f.values.get(key);
  const blocked = createInventoryRepository({ ...f, ownerId: 'alice', storage: {
    getItem: f.storage.getItem, setItem: () => { throw new Error('quota'); },
  } });
  await assert.rejects(blocked.execute(purchase), /quota/);
  assert.equal(f.values.get(key), original);
});

test('wrong-owner cloud state cannot replace the local inventory or pending operations', async () => {
  const f = fixture();
  const wrong: InventoryTransport = { ...f.transport, load: async (): Promise<FoundationState> => emptyFoundationState('bob') };
  const repo = createInventoryRepository({ ...f, ownerId: 'alice', transport: wrong });
  const result = await repo.load([filament]);
  assert.equal(result.state.user_id, 'alice');
  assert.equal(result.state.variants[0].stock_g, 500);
  assert.equal(result.pendingCount, 1);
  assert.match(result.syncError ?? '', /другого пользователя/);
});
