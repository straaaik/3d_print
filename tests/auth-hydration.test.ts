import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialAuthRenderState, reconcileDevSessionHydration, reconcilePartialProfileUser } from '../src/entities/model/authHydration';

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

test('partial profile failure reconciles the Auth email without discarding profile fields', () => {
  const profile = {
    id: 'user-1',
    email: 'old@example.com',
    name: 'Studio',
    role: 'admin' as const,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    last_login_at: '2026-01-01T00:00:00.000Z',
    registration_key_used: 'KEY',
    avatar_color: '#123456',
  };

  assert.deepEqual(reconcilePartialProfileUser(profile, 'new@example.com'), {
    ...profile,
    email: 'new@example.com',
  });
});

test('stale local development-session hints are cleared without a server-confirmed cookie', () => {
  const cases = [
    { hasServerSession: true, hasLocalHint: true, authenticateAsDev: true, clearLocalHint: false },
    { hasServerSession: true, hasLocalHint: false, authenticateAsDev: true, clearLocalHint: false },
    { hasServerSession: false, hasLocalHint: true, authenticateAsDev: false, clearLocalHint: true },
    { hasServerSession: false, hasLocalHint: false, authenticateAsDev: false, clearLocalHint: false },
  ];

  for (const expected of cases) {
    assert.deepEqual(
      reconcileDevSessionHydration(expected.hasServerSession, expected.hasLocalHint),
      {
        authenticateAsDev: expected.authenticateAsDev,
        clearLocalHint: expected.clearLocalHint,
      }
    );
  }
});
