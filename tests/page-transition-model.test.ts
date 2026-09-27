import assert from 'node:assert/strict';
import test from 'node:test';
import { initialTransitionState, transitionReducer, getRealProgress, canFinish, type TransitionState } from '../src/shared/ui/page-transition/model';
import { createRouteTasks, isPageNavigation, normalizePageHref } from '../src/shared/ui/page-transition/routePlan';

function begin(id = 1): TransitionState {
  return transitionReducer(initialTransitionState, {
    type: 'begin', id, target: '/orders', kind: 'route',
    tasks: [{ id: 'data:orders', weight: 3 }, { id: 'view', weight: 1 }],
  });
}

test('completed data cannot reveal a page before its view commits', () => {
  let state = transitionReducer(begin(), { type: 'covered', id: 1 });
  state = transitionReducer(state, { type: 'complete', id: 1, task: 'data:orders' });
  assert.equal(getRealProgress(state), 0.75);
  assert.equal(canFinish(state), false);
  assert.equal(transitionReducer(state, { type: 'finish', id: 1 }), state);
  state = transitionReducer(state, { type: 'complete', id: 1, task: 'view' });
  assert.equal(canFinish(state), true);
  assert.equal(state.phase, 'loading');
});

test('cached tasks still wait for covering and explicit finishing callbacks', () => {
  let state = begin();
  state = transitionReducer(state, { type: 'complete', id: 1, task: 'view' });
  state = transitionReducer(state, { type: 'complete', id: 1, task: 'data:orders' });
  assert.equal(getRealProgress(state), 1);
  assert.equal(canFinish(state), false);
  assert.equal(transitionReducer(state, { type: 'fill-complete', id: 1 }), state);
  state = transitionReducer(state, { type: 'covered', id: 1 });
  state = transitionReducer(state, { type: 'finish', id: 1 });
  assert.equal(state.phase, 'finishing');
  assert.equal(transitionReducer(state, { type: 'reveal-complete', id: 1 }), state);
  state = transitionReducer(state, { type: 'fill-complete', id: 1 });
  assert.equal(state.phase, 'revealing');
  state = transitionReducer(state, { type: 'reveal-complete', id: 1 });
  assert.equal(state.phase, 'idle');
});

test('duplicate and unknown tasks cannot change progress or mutate prior snapshots', () => {
  const original = begin();
  const state = transitionReducer(original, { type: 'complete', id: 1, task: 'view' });
  assert.equal(original.completed.size, 0);
  assert.equal(getRealProgress(state), 0.25);
  assert.equal(transitionReducer(state, { type: 'complete', id: 1, task: 'view' }), state);
  assert.equal(transitionReducer(state, { type: 'complete', id: 1, task: 'auth' }), state);
});

test('a new navigation rejects all stale lifecycle events including begin', () => {
  let state = transitionReducer(begin(), { type: 'view-prepared', id: 1, viewKey: '/orders' });
  state = transitionReducer(state, { type: 'begin', id: 2, target: '/about', kind: 'route', tasks: createRouteTasks('/about') });
  assert.equal(state.preparedView, null);
  assert.equal(getRealProgress(state), 0);
  for (const type of ['covered', 'finish', 'fill-complete', 'reveal-complete', 'cancel'] as const) {
    assert.equal(transitionReducer(state, { type, id: 1 }), state);
  }
  assert.equal(transitionReducer(state, { type: 'view-prepared', id: 1, viewKey: '/orders' }), state);
  assert.equal(transitionReducer(state, { type: 'complete', id: 1, task: 'view' }), state);
  assert.equal(transitionReducer(state, { type: 'fail', id: 1, message: 'old' }), state);
  assert.equal(transitionReducer(state, { type: 'begin', id: 1, target: '/orders', kind: 'route', tasks: [] }), state);
});

test('failure preserves real progress and cannot automatically finish', () => {
  let state = transitionReducer(begin(), { type: 'complete', id: 1, task: 'view' });
  state = transitionReducer(state, { type: 'fail', id: 1, message: 'Unavailable' });
  assert.equal(state.phase, 'error');
  assert.equal(getRealProgress(state), 0.25);
  assert.equal(canFinish(state), false);
  assert.equal(transitionReducer(state, { type: 'complete', id: 1, task: 'data:orders' }), state);
  assert.equal(transitionReducer(state, { type: 'finish', id: 1 }), state);
  state = transitionReducer(state, { type: 'cancel', id: 1 });
  assert.equal(state.phase, 'idle');
  assert.equal(transitionReducer(state, { type: 'fail', id: 1, message: 'late' }), state);
});

test('a navigation during reveal resets readiness and keeps the new target covered', () => {
  let state = begin();
  state = transitionReducer(state, { type: 'complete', id: 1, task: 'view' });
  state = transitionReducer(state, { type: 'complete', id: 1, task: 'data:orders' });
  state = transitionReducer(state, { type: 'covered', id: 1 });
  state = transitionReducer(state, { type: 'finish', id: 1 });
  state = transitionReducer(state, { type: 'fill-complete', id: 1 });
  state = transitionReducer(state, { type: 'begin', id: 2, target: '/login', kind: 'route', tasks: createRouteTasks('/login') });
  assert.equal(state.phase, 'covering');
  assert.equal(state.target, '/login');
  assert.equal(getRealProgress(state), 0);
  assert.equal(transitionReducer(state, { type: 'reveal-complete', id: 1 }), state);
});

test('query and fragment changes stay local and the profile redirect shares settings identity', () => {
  assert.equal(isPageNavigation('/settings?section=general', '/profile'), false);
  assert.equal(isPageNavigation('/orders', '/orders?sort=date#table'), false);
  assert.equal(isPageNavigation('/orders', '#table'), false);
  assert.equal(isPageNavigation('/orders', '?sort=date'), false);
  assert.equal(isPageNavigation('/orders', '/about'), true);
  assert.equal(normalizePageHref('/profile?x=1#details'), '/settings?x=1&section=profile#details');
  assert.equal(normalizePageHref('/orders/'), '/orders');
  for (const href of ['javascript:alert(1)', 'https://example.com/orders', '//example.com/orders', '/\\example.com']) {
    assert.throws(() => normalizePageHref(href));
    assert.equal(isPageNavigation('/orders', href), false);
  }
});

test('route plans wait only for readiness sources available in their layout', () => {
  for (const href of ['/', '/calculator', '/orders', '/products', '/filaments', '/printers', '/stats', '/settings', '/profile', '/admin']) {
    const tasks = createRouteTasks(href);
    assert.equal(tasks.filter(task => task.id.startsWith('data:')).length, 8);
    assert.equal(tasks.some(task => task.id === 'auth'), true);
    assert.equal(tasks.reduce((sum, task) => sum + task.weight, 0), 100);
  }
  for (const href of ['/about', '/login']) {
    const tasks = createRouteTasks(href);
    assert.equal(tasks.some(task => task.id.startsWith('data:')), false);
    assert.equal(tasks.some(task => task.id === 'auth'), true);
  }
  for (const href of ['/missing', '/error', '/404']) {
    const tasks = createRouteTasks(href);
    assert.equal(tasks.some(task => task.id.startsWith('data:') || task.id === 'auth'), false);
    assert.equal(tasks.some(task => task.id === 'view'), true);
  }
});
