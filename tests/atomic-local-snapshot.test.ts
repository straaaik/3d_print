import assert from 'node:assert/strict';
import test from 'node:test';
import { commitLocalSnapshot, recoverLocalSnapshot, readLocalSnapshotItem, type SnapshotStorage } from '../src/shared/lib/atomicLocalSnapshot';

class MemoryStorage implements SnapshotStorage {
  data = new Map<string, string>();
  writes = 0;
  failAt = Infinity;
  persistentFailure = false;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.check(); this.data.set(key, value); }
  removeItem(key: string) { this.check(); this.data.delete(key); }
  check() { if (++this.writes === this.failAt || (this.persistentFailure && this.writes >= this.failAt)) throw new Error('quota'); }
}
function initial() {
  const storage = new MemoryStorage();
  storage.data.set('orders', 'old'); storage.data.set('products', 'old-products');
  return storage;
}
const changes = { orders: 'new', products: null, draft: 'new-draft' };

test('multi-key snapshot replaces, removes and adds keys without retaining its journal', () => {
  const storage = initial();
  commitLocalSnapshot(storage, changes, 'journal');
  assert.deepEqual(Object.fromEntries(storage.data), { orders: 'new', draft: 'new-draft' });
  assert.equal(recoverLocalSnapshot(storage, 'journal'), false);
});
test('failure at every write boundary restores the complete previous snapshot', () => {
  for (let failAt = 1; failAt <= 5; failAt++) {
    const storage = initial(); storage.failAt = failAt;
    assert.throws(() => commitLocalSnapshot(storage, changes, 'journal'), /quota/);
    assert.deepEqual(Object.fromEntries(storage.data), { orders: 'old', products: 'old-products' });
  }
});
test('interrupted rollback leaves a recoverable journal and next load restores old keys', () => {
  const storage = initial(); storage.failAt = 3; storage.persistentFailure = true;
  assert.throws(() => commitLocalSnapshot(storage, changes, 'journal'));
  assert.ok(storage.getItem('journal'));
  storage.failAt = Infinity; storage.persistentFailure = false;
  assert.equal(recoverLocalSnapshot(storage, 'journal'), true);
  assert.deepEqual(Object.fromEntries(storage.data), { orders: 'old', products: 'old-products' });
});
test('interrupted committed journal cleanup recovers the complete new snapshot', () => {
  const storage = initial(); storage.failAt = 6; storage.persistentFailure = true;
  assert.throws(() => commitLocalSnapshot(storage, changes, 'journal'));
  storage.failAt = Infinity; storage.persistentFailure = false;
  assert.equal(recoverLocalSnapshot(storage, 'journal'), true);
  assert.deepEqual(Object.fromEntries(storage.data), { orders: 'new', draft: 'new-draft' });
});
test('corrupt journal and journal-key collisions never modify existing data', () => {
  const storage = initial(); storage.data.set('journal', '{broken');
  const before = Object.fromEntries(storage.data);
  assert.throws(() => recoverLocalSnapshot(storage, 'journal'), /журнал/);
  assert.deepEqual(Object.fromEntries(storage.data), before);
  storage.data.delete('journal');
  assert.throws(() => commitLocalSnapshot(storage, { journal: 'collision' }, 'journal'), /журнал/);
  assert.equal(storage.getItem('orders'), 'old');
});
test('virtual readers select old prepared or new committed values without recovering an active journal', () => {
  for (const committed of [false, true]) {
    const storage = initial(); storage.data.set('orders', 'partial');
    storage.data.set('journal', JSON.stringify({ version: 1, committed,
      before: [['orders', 'old'], ['products', 'old-products'], ['draft', null]],
      after: [['orders', 'new'], ['products', null], ['draft', 'new-draft']] }));
    const before = Object.fromEntries(storage.data);
    assert.equal(readLocalSnapshotItem(storage, 'orders', 'journal'), committed ? 'new' : 'old');
    assert.equal(readLocalSnapshotItem(storage, 'products', 'journal'), committed ? null : 'old-products');
    assert.equal(readLocalSnapshotItem(storage, 'draft', 'journal'), committed ? 'new-draft' : null);
    assert.deepEqual(Object.fromEntries(storage.data), before);
    assert.equal(storage.writes, 0);
  }
});
test('real byte quota failure frees partial larger values before rollback', () => {
  const storage = initial();
  const values = { orders: 'x'.repeat(70), products: 'y'.repeat(100) };
  const journalSize = JSON.stringify({ version: 1, committed: false,
    before: [['orders', 'old'], ['products', 'old-products']], after: Object.entries(values) }).length;
  const quota = journalSize + 70 + 'old-products'.length + 10;
  const originalSet = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    const next = new Map(storage.data); next.set(key, value);
    if ([...next.values()].reduce((sum, value) => sum + value.length, 0) > quota) throw new Error('quota');
    originalSet(key, value);
  };
  // Journal fits, first replacement fits, final replacement would exceed quota.
  assert.throws(() => commitLocalSnapshot(storage, values, 'journal'), /quota/);
  assert.deepEqual(Object.fromEntries(storage.data), { orders: 'old', products: 'old-products' });
});
