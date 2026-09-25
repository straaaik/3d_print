import assert from 'node:assert/strict';
import test from 'node:test';
import { loadInitialData, createInitialDataLoadScope, type InitialDataApi, type InitialDataTaskId } from '../src/entities/model/loadInitialData';

function fixture() {
  const starts: string[] = [];
  const tasks = ['connection', 'settings', 'filaments', 'printers', 'savedCalculations', 'collections', 'orders', 'monthlyGoals'] as const;
  const pending = tasks.map(() => {
    let resolve!: (value: unknown) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
  });
  const methods = ['checkSupabaseConnection', 'getSettings', 'getFilaments', 'getPrinters', 'getSavedCalculations', 'getCollections', 'getOrders', 'getMonthlyGoalsConfig'];
  const api = Object.fromEntries(methods.map((method, index) => [method, () => {
    starts.push(tasks[index]);
    return pending[index].promise;
  }])) as unknown as InitialDataApi;
  return { api, tasks, pending, starts };
}

test('initial data reports only resolved stages and starts all eight operations in parallel', async () => {
  const { api, tasks, pending, starts } = fixture();
  const events: [InitialDataTaskId, string][] = [];
  const result = loadInitialData(api, (task, outcome) => events.push([task, outcome]));
  assert.deepEqual(starts, tasks);
  assert.deepEqual(events, []);
  pending[6].resolve([]);
  await Promise.resolve();
  assert.deepEqual(events, [['orders', 'ready']]);
  pending.forEach((item, index) => item.resolve(index === 0 ? false : index === 1 ? { cached: true } : []));
  const data = await result;
  assert.equal(data.onlineStatus, false);
  assert.deepEqual(data.settings, { cached: true });
  assert.equal(events.length, 8);
  assert.equal(new Set(events.map(event => (event as [InitialDataTaskId, string])[0])).size, 8);
});

test('initial data propagates a rejected stage without reporting it ready', async () => {
  const { api, pending } = fixture();
  const events: [InitialDataTaskId, string][] = [];
  const result = loadInitialData(api, (task, outcome) => events.push([task, outcome]));
  const failure = new Error('failed');
  pending[1].reject(failure);
  await assert.rejects(result, failure);
  assert.deepEqual(events, [['settings', 'error']]);
  pending.forEach((item) => item.resolve([]));
  await Promise.resolve();
  assert.equal(events.length, 8);
});

test('initial data remains compatible without an observer', async () => {
  const { api, pending } = fixture();
  const result = loadInitialData(api);
  pending.forEach((item, index) => item.resolve(index === 0 ? true : []));
  assert.equal((await result).onlineStatus, true);
});

test('a synchronous API failure still starts the remaining operations and reports error', async () => {
  const { api, pending, starts } = fixture();
  const failure = new Error('synchronous failure');
  api.getSettings = () => { throw failure; };
  const events: [InitialDataTaskId, string][] = [];
  const result = loadInitialData(api, (task, outcome) => events.push([task, outcome]));
  assert.equal(starts.length, 7);
  await assert.rejects(result, failure);
  assert.deepEqual(events, [['settings', 'error']]);
  pending.forEach(item => item.resolve([]));
});

test('load scope rejects old revisions, previous users and invalidated unmounted sessions', () => {
  const scope = createInitialDataLoadScope();
  const first = scope.begin('alice');
  const second = scope.begin('alice');
  assert.equal(scope.isCurrent(first), false);
  assert.equal(scope.isCurrent(second), true);
  const nextUser = scope.begin('bob');
  assert.equal(scope.isCurrent(second), false);
  assert.equal(scope.isCurrent(nextUser), true);
  scope.invalidate();
  assert.equal(scope.isCurrent(nextUser), false);
  assert.ok(scope.begin('bob').revision > nextUser.revision);
});
