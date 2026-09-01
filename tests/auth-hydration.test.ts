import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialAuthRenderState } from '../src/entities/model/authHydration';

test('auth first render stays identical when a development session exists in browser storage', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: { getItem: () => 'true' } },
  });

  try {
    assert.deepEqual(createInitialAuthRenderState(), {
      currentUser: null,
      isLoading: true,
    });
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
