import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyFoundationState, foundationStorageKey } from '../src/shared/lib/foundationStorage';
import { applyCalculationProjectCommand, createProjectOrderDraft } from '../src/shared/lib/calculationProjects';
import { applyProjectOrderCommand, type ProjectOrderCommand } from '../src/shared/lib/projectOrders';
import { createInventoryRepository, type InventoryTransport } from '../src/shared/api/inventoryRepository';
import { calculatePrintCost } from '../src/shared/lib/formulas';
import type { CalculationProject, CalculationItem } from '../src/shared/types/foundation';
import type { Order } from '../src/shared/types';

const now = '2026-09-30T15:00:00Z';
function setup() {
  const project: CalculationProject = { id: 'project', user_id: 'alice', created_at: now, name: 'Three parts', revision: 0,
    discount_percent: 10, discount_amount: 0, urgency_percent: 0, urgency_amount: 0, agreed_price: 0 };
  const items: CalculationItem[] = Array.from({ length: 3 }, (_, i) => {
    const inputs = { weightG: 0, hours: 0, minutes: 0, laborMinutes: 0, quantity: i + 1, filament: null, printer: null,
      settings: null, customCostItems: [{ id: 'extra', name: 'Assembly', amount: 10 * (i + 1), isEnabled: true }] };
    return { id: `calculation-${i}`, user_id: 'alice', created_at: now, name: `Part ${i}`, project_id: project.id,
      product_id: null, sort_order: i, quantity: i + 1, inputs, result: calculatePrintCost(inputs),
      recipe: { version: 1, materials: [], non_material_unit_cost: 10, product_snapshot: null } };
  });
  const state = applyCalculationProjectCommand(emptyFoundationState('alice'), {
    kind: 'saveProject', id: 'save', occurredAt: now, project, items,
  });
  state.legacyOrders = [];
  const draft = createProjectOrderDraft(state.projects[0], state.calculationItems);
  const order: Order = { ...draft.order, id: 'order', user_id: 'alice', created_at: now, date: '30.09.2026',
    type: 'income', title: project.name, amount: draft.totals.totalFinalPrice, cost: draft.totals.totalBaseCost,
    payment: 0, client: 'Сайт', contact: '', deadline: '', notes: '', status: 'Не в работе' };
  const command: ProjectOrderCommand = { kind: 'createProjectOrder', id: 'create', occurredAt: now, order, draft,
    itemIds: ['order-item-0', 'order-item-1', 'order-item-2'] };
  return { state, command };
}

test('one project order preserves three independent snapshots and unpaid agreed zero', () => {
  const { state, command } = setup();
  const next = applyProjectOrderCommand(state, command);
  assert.equal(state.legacyOrders!.length, 0);
  assert.equal(next.legacyOrders!.length, 1);
  assert.equal(next.legacyOrders![0].amount, 0);
  assert.equal(next.legacyOrders![0].payment, 0);
  assert.equal(next.legacyOrders![0].cost, 60);
  assert.equal(next.orderItems.length, 3);
  assert.deepEqual(next.orderItems.map(row => row.quantity), [1, 2, 3]);
  assert.ok(next.orderItems.every(row => row.order_id === 'order' && row.fulfilled_quantity === 0));
  assert.equal(next.productionEvents.length, 0);
  command.draft.items[0].snapshot.calculation!.inputs.customCostItems![0].amount = 999;
  next.calculationItems[1].result.totalBaseCost = 888;
  assert.equal(next.orderItems[0].snapshot.calculation!.inputs.customCostItems![0].amount, 10);
  assert.equal(next.orderItems[1].total_cost, 20);
});

test('creation is idempotent even when the server has assigned a different order number', () => {
  const { state, command } = setup();
  const next = applyProjectOrderCommand(state, command);
  next.legacyOrders![0].order_number = 5012;
  assert.deepEqual(applyProjectOrderCommand(next, command), next);
  const changed = structuredClone(command); changed.order.title = 'Different request';
  assert.throws(() => applyProjectOrderCommand(next, changed), /already|conflict|занят/i);
});

test('rejects foreign owner, missing parent, duplicate item ID and altered financial totals', () => {
  const { state, command } = setup();
  const foreign = structuredClone(command); foreign.order.user_id = 'bob';
  assert.throws(() => applyProjectOrderCommand(state, foreign));
  const missing = structuredClone(state); missing.calculationItems = [];
  assert.throws(() => applyProjectOrderCommand(missing, command));
  const duplicate = structuredClone(command); duplicate.itemIds[1] = duplicate.itemIds[0];
  assert.throws(() => applyProjectOrderCommand(state, duplicate));
  const altered = structuredClone(command); altered.order.cost = 1;
  assert.throws(() => applyProjectOrderCommand(state, altered));
  assert.equal(state.orderItems.length, 0);
});

test('repository quota failure commits neither order head nor positions nor queue', async () => {
  const { state, command } = setup();
  const raw = JSON.stringify(state);
  const storage = { getItem: (key: string) => key === foundationStorageKey('alice') ? raw : null, setItem: () => { throw new Error('Quota'); } };
  const repository = createInventoryRepository({ ownerId: 'alice', storage, lock: async (_key, fn) => fn() });
  await assert.rejects(repository.execute(command), /Quota/);
  assert.equal(storage.getItem(foundationStorageKey('alice')), raw);
  assert.equal(repository.inspect().state.orderItems.length, 0);
});

test('offline order and its positions survive reload in one queued record', async () => {
  const { state, command } = setup();
  const map = new Map([[foundationStorageKey('alice'), JSON.stringify(state)]]);
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const options = { ownerId: 'alice', storage, lock: async <T>(_key: string, fn: () => Promise<T>) => fn() };
  const view = await createInventoryRepository(options).execute(command);
  const reloaded = createInventoryRepository(options).inspect();
  assert.equal(view.pendingCount, 1);
  assert.deepEqual(reloaded.state, view.state);
  assert.equal(reloaded.state.orderItems.length, 3);
});

for (const laterAction of ['edit', 'delete'] as const) {
  test(`acknowledged create reaches its receipt after a lost response and later ${laterAction}`, async () => {
    const { state, command } = setup();
    let remote = structuredClone(state);
    const map = new Map([[foundationStorageKey('alice'), JSON.stringify(state)]]);
    const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
    let received = false;
    const transport: InventoryTransport = {
      load: async () => structuredClone(remote),
      commit: async (_revision, request, next) => {
        if (!received) {
          remote = { ...structuredClone(next), revision: remote.revision + 1 };
          received = true;
          throw new Error('Response lost');
        }
        assert.deepEqual(request, command);
        return structuredClone(remote);
      },
    };
    const repo = createInventoryRepository({ ownerId: 'alice', storage, transport, lock: async (_key, fn) => fn() });
    assert.equal((await repo.execute(command)).pendingCount, 1);
    if (laterAction === 'delete') remote.legacyOrders = [];
    else remote.legacyOrders![0] = { ...remote.legacyOrders![0], payment: 500, title: 'Edited by another tab', status: 'Готово' };
    const synced = await repo.sync();
    assert.equal(synced.pendingCount, 0);
    assert.deepEqual(synced.state.legacyOrders, remote.legacyOrders);
    assert.equal(synced.state.orderItems.length, 3);
  });
}
