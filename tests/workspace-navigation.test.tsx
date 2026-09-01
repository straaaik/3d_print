import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsWorkspaceNav } from '../src/widgets/SettingsForm/components/SettingsWorkspaceNav';
import { AdminWorkspaceNav } from '../src/widgets/Admin/components/AdminWorkspaceNav';
import { InventoryWindowControls } from '../src/widgets/InventoryCockpit/InventoryCockpitShell';
import { StableNavLabel } from '../src/shared/ui/StableNavLabel';
import {
  CockpitContentTransition,
  CockpitPanelTransition,
  getCockpitPanelMotionState,
  getCockpitTransitionDirection,
  queueCockpitHistoryPush,
} from '../src/shared/ui/CockpitContentTransition';

test('settings workspace navigation explains each category instead of exposing terse tabs', () => {
  const html = renderToStaticMarkup(
    <SettingsWorkspaceNav activeTab="general" onSelectTab={() => undefined} changesMap={{ general: 1, labor: 0, pricing: 0, materials: 0, data: 0 }} />,
  );

  assert.match(html, /aria-label="Разделы настроек"/);
  assert.match(html, /Валюта, электричество и принтер по умолчанию/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /1 изменение/);
});

test('admin workspace navigation separates access keys, people and system state', () => {
  const html = renderToStaticMarkup(
    <AdminWorkspaceNav activeTab="keys" onSelectTab={() => undefined} keyCount={4} userCount={3} />,
  );

  assert.match(html, /aria-label="Разделы администрирования"/);
  assert.match(html, /Приглашения и одноразовый доступ/);
  assert.match(html, /Учетные записи и роли/);
  assert.match(html, /Состояние подключения и ограничения/);
});

test('inventory window controls keep the same compact terminal-dot rhythm as the reference pages', () => {
  const html = renderToStaticMarkup(
    <InventoryWindowControls
      isExpanded={false}
      onExpandedChange={() => undefined}
      onRequestClose={() => undefined}
    />,
  );

  const controls = html.match(/<button[^>]+class="([^"]+)"[^>]*>/g) ?? [];
  assert.equal(controls.length, 3);
  controls.forEach((button) => {
    assert.match(button, /\bh-3\b/);
    assert.match(button, /\bw-3\b/);
    assert.doesNotMatch(button, /\bh-8\b|\bw-8\b/);
  });
});

test('cockpit content is visible at its final position on the first frame', () => {
  const html = renderToStaticMarkup(
    <CockpitContentTransition>
      <div>Готовый интерфейс</div>
    </CockpitContentTransition>,
  );

  assert.match(html, /Готовый интерфейс/);
  assert.doesNotMatch(html, /opacity:0/);
  assert.doesNotMatch(html, /translateY\(12px\)/);
});

test('cockpit section transitions follow the visual order of the workspace tabs', () => {
  assert.equal(getCockpitTransitionDirection('orders', 'calculator'), 1);
  assert.equal(getCockpitTransitionDirection('printers', 'stats'), -1);
  assert.equal(getCockpitTransitionDirection('products', 'products'), 0);
});

test('cockpit section transition always settles at the exact final position', () => {
  assert.deepEqual(getCockpitPanelMotionState('visible', 1), {
    opacity: 1,
    y: 0,
    scale: 1,
  });
  assert.deepEqual(getCockpitPanelMotionState('enter', -1), {
    opacity: 0,
    y: -12,
    scale: 0.997,
  });
});

test('workspace URL is committed only after the content transition has had time to finish', () => {
  const pushed: string[] = [];
  let scheduledTask: (() => void) | undefined;
  let scheduledDelay = 0;

  queueCockpitHistoryPush(
    '/calculator',
    (href: string) => pushed.push(href),
    (task: () => void, delay: number) => {
      scheduledTask = task;
      scheduledDelay = delay;
      return 1;
    },
  );

  assert.deepEqual(pushed, []);
  assert.ok(scheduledDelay >= 440);
  scheduledTask?.();
  assert.deepEqual(pushed, ['/calculator']);
});

test('cockpit section transition keeps the animated panel isolated from the page shell', () => {
  const html = renderToStaticMarkup(
    <CockpitPanelTransition activeKey="stats" direction={1}>
      <div>Статистика мастерской</div>
    </CockpitPanelTransition>,
  );

  assert.match(html, /aria-live="polite"/);
  assert.match(html, /data-cockpit-panel="stats"/);
  assert.match(html, /Статистика мастерской/);
  assert.doesNotMatch(html, /opacity:0/);
});

test('workspace tab labels reserve their active width so the navigation shell does not shift', () => {
  const html = renderToStaticMarkup(
    <StableNavLabel isActive={false}>Статистика</StableNavLabel>,
  );

  assert.match(html, /class="grid/);
  assert.match(html, /aria-hidden="true"/);
  assert.equal((html.match(/Статистика/g) ?? []).length, 2);
});
