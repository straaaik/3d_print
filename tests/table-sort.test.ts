import assert from 'node:assert/strict';
import test from 'node:test';
import { compareTableValues } from '../src/shared/ui/Table';

test('shared table comparator preserves numeric and boolean ordering', () => {
  assert.ok(compareTableValues(2, 10) < 0);
  assert.ok(compareTableValues(10, 2) > 0);
  assert.ok(compareTableValues(false, true) < 0);
  assert.equal(compareTableValues(null, undefined), 0);
});

test('shared table comparator keeps human-friendly string ordering', () => {
  assert.ok(compareTableValues('Заказ 2', 'Заказ 10') < 0);
});
