import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsWorkspaceNav } from '../src/widgets/SettingsForm/components/SettingsWorkspaceNav';
import { AdminWorkspaceNav } from '../src/widgets/Admin/components/AdminWorkspaceNav';
import { InventoryWindowControls } from '../src/widgets/InventoryCockpit/InventoryCockpitShell';
import { StableNavLabel } from '../src/shared/ui/StableNavLabel';
import { FullscreenDevelopmentGate } from '../src/shared/ui/FullscreenDevelopmentGate';
import {
  CockpitContentTransition,
  CockpitPanelTransition,
  commitCockpitHistoryIfCurrent,
  getCockpitTabFromPathname,
  getCockpitPanelMotionState,
  getCockpitTransitionDirection,
  isCockpitVisibleAnimation,
  shouldHoldExpandedShell,
  shouldShowFullscreenDevelopmentGate,
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

test('workspace route is derived from the real pathname when a cached Next route tree is restored', () => {
  assert.equal(getCockpitTabFromPathname('/stats'), 'stats');
  assert.equal(getCockpitTabFromPathname('/products/'), 'products');
  assert.equal(getCockpitTabFromPathname('/settings'), null);
});

test('workspace URL is committed only when the current panel finishes entering', () => {
  const historyState: { hrefs: string[] } = { hrefs: [] };

  assert.equal(commitCockpitHistoryIfCurrent('stats', 'calculator', '/calculator', '/orders', (href) => historyState.hrefs.push(href)), false);
  assert.deepEqual(historyState.hrefs, []);
  assert.equal(commitCockpitHistoryIfCurrent('calculator', 'calculator', '/calculator', '/orders', (href) => historyState.hrefs.push(href)), true);
  assert.deepEqual(historyState.hrefs, ['/calculator']);
});

test('workspace does not duplicate history when a rapid transition returns to the current URL', () => {
  const historyState: { hrefs: string[] } = { hrefs: [] };

  assert.equal(commitCockpitHistoryIfCurrent('orders', 'orders', '/orders', '/orders', (href) => historyState.hrefs.push(href)), true);
  assert.deepEqual(historyState.hrefs, []);
  assert.equal(isCockpitVisibleAnimation('visible'), true);
  assert.equal(isCockpitVisibleAnimation('exit'), false);
});

test('expanded shell is held only while leaving an expanded registry', () => {
  assert.equal(shouldHoldExpandedShell('products', 'stats', false, true), true);
  assert.equal(shouldHoldExpandedShell('orders', 'calculator', true, false), true);
  assert.equal(shouldHoldExpandedShell('orders', 'orders', true, false), false);
  assert.equal(shouldHoldExpandedShell('stats', 'calculator', false, false), false);
});

test('production fullscreen gate applies only to expanded orders and products', () => {
  assert.equal(shouldShowFullscreenDevelopmentGate('orders', true, true), true);
  assert.equal(shouldShowFullscreenDevelopmentGate('products', true, true), true);
  assert.equal(shouldShowFullscreenDevelopmentGate('stats', true, true), false);
  assert.equal(shouldShowFullscreenDevelopmentGate('products', true, false), false);
});

test('fullscreen development gate provides a safe way back to the compact workspace', () => {
  const html = renderToStaticMarkup(
    <FullscreenDevelopmentGate section="products" onReturn={() => undefined} onHome={() => undefined} />,
  );

  assert.match(html, /В РАЗРАБОТКЕ/);
  assert.match(html, /полноэкранный режим каталога/i);
  assert.match(html, /Свернуть в стандартный вид/);
  assert.match(html, /На главную/);
  assert.match(html, /tabindex="-1"/);
});

test('cockpit section transition keeps the animated panel isolated from the page shell', () => {
  const html = renderToStaticMarkup(
    <CockpitPanelTransition activeKey="stats" direction={1}>
      <div>Статистика мастерской</div>
    </CockpitPanelTransition>,
  );

  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-atomic="true"/);
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

test('managed workspace panel exposes ready content without a local animation or fallback completion', () => {
  let completed = 0;
  const html = renderToStaticMarkup(
    <CockpitPanelTransition activeKey="calculator" direction={1} managed onTransitionComplete={() => { completed += 1; }}>
      <div>Скелетон представления</div>
    </CockpitPanelTransition>,
  );
  assert.match(html, /data-cockpit-panel="calculator"/);
  assert.doesNotMatch(html, /opacity:|transform:/);
  assert.equal(completed, 0);
});
