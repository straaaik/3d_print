import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCalculationProjectCommand, createProjectOrderDraft, getCalculationProjectItems, type ProjectCommand } from '../src/shared/lib/calculationProjects';
import { calculatePrintCost } from '../src/shared/lib/formulas';
import { emptyFoundationState } from '../src/shared/lib/foundationStorage';
import { createInventoryRepository } from '../src/shared/api/inventoryRepository';
import type { CalculationItem, CalculationProject } from '../src/shared/types/foundation';

const now = '2026-09-30T12:00:00Z';
const project: CalculationProject = { id: 'project', user_id: 'alice', created_at: now, name: 'Prints', revision: 0,
  discount_percent: 0, discount_amount: 0, urgency_percent: 0, urgency_amount: 0, agreed_price: null };
function item(index = 0): CalculationItem {
  const inputs = { weightG: 0, hours: index, minutes: 0, laborMinutes: 0, quantity: index + 1,
    filament: null, printer: null, settings: null, defectPercent: 0, markupPercent: 100,
    customCostItems: [{ id: 'cost', name: 'Packaging', amount: 10 + index, isEnabled: true }] };
  return { id: `item-${index}`, user_id: 'alice', created_at: now, project_id: project.id, product_id: null,
    name: `Part ${index}`, sort_order: index, quantity: index + 1, inputs, result: calculatePrintCost(inputs),
    recipe: { version: 1, materials: [], non_material_unit_cost: (10 + index) / (index + 1), product_snapshot: null } };
}
function command(items = [item()], patch: Partial<CalculationProject> = {}): ProjectCommand {
  return { kind: 'saveProject', id: 'save', occurredAt: now, project: { ...project, ...patch }, items };
}

test('stale project is rejected instead of overwriting a newer version', () => {
  const state = applyCalculationProjectCommand(emptyFoundationState('alice'), command());
  const newer = applyCalculationProjectCommand(state, command([item()], { name: 'Newer' }));
  assert.throws(() => applyCalculationProjectCommand(newer, command()), /BUSINESS_PROJECT_REVISION_CONFLICT/);
  assert.equal(newer.projects[0].name, 'Newer');
});

test('explicit conflict resolution rebases local proposal and retains original command backup', async () => {
  const local = applyCalculationProjectCommand(emptyFoundationState('alice'), command());
  let remote = applyCalculationProjectCommand(local, command([item()], { name: 'Server version' }));
  remote.revision = 5;
  const map = new Map([['3d_business_state::user:alice', JSON.stringify(local)]]);
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const repo = createInventoryRepository({ ownerId: 'alice', storage, lock: async (_key, fn) => fn(), transport: {
    load: async () => structuredClone(remote),
    commit: async (_revision, request) => {
      assert.equal(request.kind, 'saveProject');
      remote = { ...applyCalculationProjectCommand(remote, request as ProjectCommand), revision: remote.revision + 1 };
      return structuredClone(remote);
    },
  } });
  const proposal = command([item()], { name: 'My version' });
  proposal.id = 'pending-save';
  const conflicted = await repo.execute(proposal);
  assert.match(conflicted.syncError ?? '', /BUSINESS_PROJECT_REVISION_CONFLICT/);
  assert.equal(conflicted.pendingCount, 1);
  assert.equal(remote.projects[0].name, 'Server version');
  const resolved = await repo.resolveProjectConflict('project');
  assert.equal(resolved.syncError, null);
  assert.equal(resolved.pendingCount, 0);
  assert.equal(remote.projects[0].name, 'My version');
  assert.equal(remote.projects[0].revision, 2);
  const persisted = JSON.parse(map.get('3d_business_state::user:alice')!);
  assert.deepEqual(persisted.projectConflictBackups[0].commands[0], proposal);
});

test('locally stale proposal is never claimed saved until a fresh explicit overwrite is executed', async () => {
  const original = applyCalculationProjectCommand(emptyFoundationState('alice'), command());
  let remote = applyCalculationProjectCommand(original, command([item()], { name: 'Newer' }));
  const map = new Map([['3d_business_state::user:alice', JSON.stringify(remote)]]);
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const repo = createInventoryRepository({ ownerId: 'alice', storage, lock: async (_key, fn) => fn(), transport: {
    load: async () => structuredClone(remote),
    commit: async (_revision, request, next) => { assert.equal(request.kind, 'saveProject'); remote = structuredClone(next); return remote; },
  } });
  const proposal = command([item()], { name: 'My explicit version' });
  await assert.rejects(repo.execute(proposal), /BUSINESS_PROJECT_REVISION_CONFLICT/);
  assert.equal(repo.inspect().pendingCount, 0);
  const checked = await repo.resolveProjectConflict('project');
  assert.equal(checked.resolvedProjectId, undefined);
  assert.equal(checked.state.projects[0].name, 'Newer');
  const saved = await repo.execute({ ...proposal, project: { ...proposal.project, revision: checked.state.projects[0].revision } });
  assert.equal(saved.pendingCount, 0);
  assert.equal(remote.projects[0].name, 'My explicit version');
});

test('save keeps ten independent sorted snapshots and recomputes stale results centrally', () => {
  const state = emptyFoundationState('alice');
  const request = command(Array.from({ length: 10 }, (_, index) => item(index)).reverse());
  request.items[0].result.totalBaseCost = 999;
  const saved = applyCalculationProjectCommand(state, request);
  assert.equal(state.projects.length, 0);
  assert.equal(saved.projects.length, 1);
  assert.deepEqual(saved.calculationItems.map(row => row.quantity), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(saved.calculationItems.map(row => row.result.totalBaseCost), [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  request.items[0].inputs.customCostItems![0].amount = 777;
  saved.calculationItems[0].inputs.customCostItems![0].amount = 888;
  assert.equal(saved.calculationItems[9].inputs.customCostItems![0].amount, 19);
  assert.equal(request.items[9].inputs.customCostItems![0].amount, 10);
});

test('updates preserve other projects and order history while archiving removed item IDs', () => {
  const first = applyCalculationProjectCommand(emptyFoundationState('alice'), command([item(), item(1)]));
  const other = { ...project, id: 'other', name: 'Untouched' };
  first.projects.push(other);
  first.calculationItems.push({ ...item(2), project_id: 'other' });
  first.legacyOrders = [{ id: 'history', title: 'Paid before project edit', type: 'income', date: now,
    amount: 200, cost: 50, payment: 100, client: '', contact: '', deadline: '', status: 'Готово', notes: '' }];
  first.legacyProducts = [{ id: 'retail', name: 'Fixed catalogue price', filament_name: '', printer_name: '',
    weight_g: 0, hours: 0, minutes: 0, quantity: 1, base_cost: 50, final_price: 200 }];
  first.orderItems.push({ id: 'historic-snapshot', user_id: 'alice', created_at: now, order_id: null,
    source_order_id: 'history', product_id: null, name: 'Historical part', quantity: 1, unit_cost: 50,
    total_cost: 50, unit_price: 200, total_price: 200, cost_provenance: 'estimate', fulfilled_quantity: 0,
    production_quantity: 0, legacy_key: null, snapshot: { version: 1, order: { amount: 200, cost: 50, payment: 100 },
      calculation: { inputs: structuredClone(item().inputs), result: structuredClone(item().result) }, recipe: null } });
  const before = structuredClone(first);
  const updated = item(); updated.inputs.customCostItems![0].amount = 30;
  const saved = applyCalculationProjectCommand(first, command([updated]));
  assert.deepEqual(first, before);
  assert.equal(saved.projects[0].revision, 1);
  assert.deepEqual(saved.projects[1], other);
  assert.deepEqual(saved.calculationItems.find(row => row.project_id === 'other'), first.calculationItems[2]);
  assert.equal(saved.calculationItems.find(row => row.id === 'item-1')?.archived, true);
  assert.deepEqual(getCalculationProjectItems(saved, project.id).map(row => row.id), ['item-0']);
  assert.equal(saved.calculationItems.find(row => row.id === 'item-0')?.result.totalBaseCost, 30);
  assert.deepEqual(saved.legacyOrders, before.legacyOrders);
  assert.deepEqual(saved.legacyProducts, before.legacyProducts);
  assert.deepEqual(saved.orderItems, before.orderItems);
});

test('provided filament pricing snapshot remains unchanged by inventory weighted average', () => {
  const state = emptyFoundationState('alice');
  state.variants.push({ id: 'filament', user_id: 'alice', created_at: now, name: 'PLA', color: '#fff',
    material_line_id: null, legacy_filament_id: null, stock_g: 100, average_cost_per_g: 9, revision: 1 });
  const row = item();
  row.inputs.filament = { id: 'filament', user_id: 'alice', name: 'PLA', weight_g: 1000, price: 1000 };
  row.inputs.weightG = 10;
  row.recipe.materials = [{ variant_id: 'filament', grams_per_unit: 10 }];
  const saved = applyCalculationProjectCommand(state, command([row]));
  assert.equal(saved.calculationItems[0].result.materialCost, 10);
  assert.equal(saved.calculationItems[0].inputs.filament?.price, 1000);
  assert.equal(saved.variants[0].average_cost_per_g, 9);
});

test('invalid owner, references, quantity, recipe and numeric inputs reject atomically', () => {
  const mutations: Array<(request: ProjectCommand) => void> = [
    request => { request.project.user_id = 'bob'; },
    request => { request.items[0].user_id = 'bob'; },
    request => { request.items[0].project_id = 'elsewhere'; },
    request => { request.items.push(structuredClone(request.items[0])); },
    request => { request.items[0].quantity = 1.5; },
    request => { request.items[0].inputs.quantity = 2; },
    request => { request.items[0].recipe.version = 2 as 1; },
    request => { request.items[0].recipe.materials.push({ variant_id: 'missing', grams_per_unit: 10 }); },
    request => { request.items[0].inputs.hours = NaN; },
    request => { request.items[0].result.totalFinalPrice = Infinity; },
    request => { request.items[0].inputs.filament = { id: 'f', user_id: 'bob', name: 'PLA', price: 10, weight_g: 10 }; },
    request => { request.items[0].product_id = 'missing'; },
    request => { request.project.discount_percent = 101; },
    request => { request.project.agreed_price = -1; },
  ];
  for (const mutate of mutations) {
    const state = emptyFoundationState('alice');
    const request = command(); mutate(request);
    assert.throws(() => applyCalculationProjectCommand(state, request));
    assert.deepEqual(state, emptyFoundationState('alice'));
  }
});

test('an item ID belonging to another project cannot be reassigned', () => {
  const state = applyCalculationProjectCommand(emptyFoundationState('alice'), command());
  assert.throws(() => applyCalculationProjectCommand(state, command([{ ...item(), project_id: 'other' }], { id: 'other' })));
  assert.equal(state.calculationItems[0].project_id, project.id);
});

test('an archived item can be restored with its original ID and creation timestamp', () => {
  const initial = applyCalculationProjectCommand(emptyFoundationState('alice'), command([item(), item(1)]));
  const removed = applyCalculationProjectCommand(initial, command());
  const revived = item(1); revived.created_at = '2026-10-01T12:00:00Z';
  const saved = applyCalculationProjectCommand(removed, command([item(), revived], { revision: removed.projects[0].revision }));
  const row = getCalculationProjectItems(saved, project.id).find(entry => entry.id === revived.id)!;
  assert.equal(row.archived, false);
  assert.equal(row.created_at, now);
  assert.equal(saved.calculationItems.length, 2);
});

test('draft totals ignore archived positions and reject foreign item snapshots', () => {
  const archived = { ...item(1), archived: true };
  const draft = createProjectOrderDraft(project, [item(), archived]);
  assert.equal(draft.items.length, 1);
  assert.equal(draft.order.amount, 20);
  assert.throws(() => createProjectOrderDraft(project, [{ ...item(), user_id: 'bob' }]));
});

test('order draft aggregates discounted batch totals once and copies separate item snapshots', () => {
  const rows = [item(), item(1)];
  rows[0].inputs.discountPercent = 10;
  const saved = applyCalculationProjectCommand(emptyFoundationState('alice'), command(rows, { discount_percent: 10 }));
  const draft = createProjectOrderDraft(saved.projects[0], saved.calculationItems);
  assert.equal(draft.order.base_amount, 40); // 10*2*0.9 + 11*2
  assert.equal(draft.order.amount, 36);
  assert.equal(draft.order.cost, 21);
  assert.equal(draft.order.quantity, 3);
  assert.equal(draft.order.payment, 0);
  assert.equal(draft.totals.actualProfit, -21);
  assert.equal('product_id' in draft.order, false);
  assert.deepEqual(draft.items.map(row => row.total_price), [18, 22]);
  saved.calculationItems[0].inputs.customCostItems![0].amount = 999;
  assert.equal(draft.items[0].snapshot.calculation?.inputs.customCostItems![0].amount, 10);
});

test('order draft preserves agreed zero and below-cost override without changing item receipts', () => {
  for (const agreed of [0, 5]) {
    const saved = applyCalculationProjectCommand(emptyFoundationState('alice'), command([item()], { agreed_price: agreed }));
    const draft = createProjectOrderDraft(saved.projects[0], saved.calculationItems);
    assert.equal(draft.order.amount, agreed);
    assert.equal(draft.order.agreed_price, agreed);
    assert.equal(draft.order.payment, 0);
    assert.equal(draft.totals.isBelowCost, true);
    assert.equal(draft.totals.priceAdjustment, agreed - 20);
    assert.equal(draft.items[0].total_price, 20);
  }
});

test('project save uses the existing owner queue and survives an offline reload', async () => {
  const values = new Map<string, string>();
  const options = { ownerId: 'alice', storage: { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } },
    lock: async <T>(_key: string, callback: () => Promise<T>) => callback() };
  const repository = createInventoryRepository(options);
  await repository.execute(command());
  const restored = createInventoryRepository(options).inspect();
  assert.equal(restored.pendingCount, 1);
  assert.equal(restored.state.calculationItems[0].result.totalFinalPrice, 20);
  await repository.execute(command());
  assert.equal(repository.inspect().pendingCount, 1);
  assert.equal(repository.inspect().state.projects[0].revision, 0);
  await assert.rejects(createInventoryRepository({ ...options, ownerId: 'bob' }).execute(command()));
});
