import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import React from 'react';
import RootLayout from '../src/app/layout';
import AboutLayout from '../src/app/(about)/layout';
import LoginLayout from '../src/app/(login)/layout';
import ProtectedLayout from '../src/app/(protected)/layout';
import { loadInitialData, type InitialDataApi } from '../src/entities/model/loadInitialData';
import { AuthProvider } from '../src/entities/model/AuthProvider';
import { DataProvider } from '../src/entities/model/DataProvider';
import { OrderModalProvider } from '../src/entities/model/OrderModalContext';
import { ToastProvider } from '../src/entities/model/ToastProvider';
import { AuthGuard } from '../src/shared/ui/AuthGuard';
import { CockpitTransitionProvider } from '../src/shared/ui/CockpitContentTransition';
import { PixelCurtainProvider } from '../src/shared/ui/PixelCurtain';
import {
  CalculatorSkeleton,
  FilamentsSkeleton,
  OrdersSkeleton,
  PrintersSkeleton,
  ProductsSkeleton,
  StatsSkeleton,
} from '../src/shared/ui/CockpitSkeleton';
import {
  createWorkspaceComponents,
  type WorkspaceDynamicAdapter,
  workspaceDefinitions,
} from '../src/widgets/CockpitWorkspace/workspaceDefinitions';
import {
  getPaymentCleanupUpdate,
  normalizeOrderPaymentItems,
} from '../src/widgets/Orders/components/v2/OrderRowDrawer';
import type { Order } from '../src/widgets/Orders/types';

const source = (path: string) => readFileSync(resolve(path), 'utf8');
type ElementWithChildren = React.ReactElement<{ children?: React.ReactElement; className?: string }>;

const child = (element: ElementWithChildren) => element.props.children as ElementWithChildren;

test('cockpit shell has no static workspace implementation imports', () => {
  const workspace = source('src/widgets/CockpitWorkspace/CockpitWorkspace.tsx');

  assert.match(workspace, /import dynamic from 'next\/dynamic';/);
  for (const name of ['OrdersTable', 'Calculator', 'StatsDashboard', 'ProductsList', 'FilamentList', 'PrinterList']) {
    assert.doesNotMatch(workspace, new RegExp(`import\\s+\\{\\s*${name}\\s*\\}\\s+from`));
  }
});

test('production workspace factory supplies every loader and matching skeleton to the dynamic adapter', () => {
  const calls: Array<{ load: unknown; loading: unknown }> = [];
  const dynamicAdapter: WorkspaceDynamicAdapter = (load, options) => {
    calls.push({ load, loading: options.loading });
    return () => null;
  };
  createWorkspaceComponents(dynamicAdapter);
  const definitions = [
    [workspaceDefinitions.orders, OrdersSkeleton],
    [workspaceDefinitions.stats, StatsSkeleton],
    [workspaceDefinitions.calculator, CalculatorSkeleton],
    [workspaceDefinitions.products, ProductsSkeleton],
    [workspaceDefinitions.filaments, FilamentsSkeleton],
    [workspaceDefinitions.printers, PrintersSkeleton],
  ] as const;

  assert.equal(calls.length, definitions.length);
  for (const [index, [definition, skeleton]] of definitions.entries()) {
    assert.equal(calls[index].load, definition.load);
    assert.equal(calls[index].loading, skeleton);
  }
});

test('real route layouts own only their required provider trees', () => {
  const protectedTree = ProtectedLayout({ children: <span>protected</span> });
  assert.equal(protectedTree.type, 'div');
  assert.equal(child(protectedTree).type, ToastProvider);
  assert.equal(child(child(protectedTree)).type, AuthProvider);
  assert.equal(child(child(child(protectedTree))).type, DataProvider);
  assert.equal(child(child(child(child(protectedTree)))).type, OrderModalProvider);
  assert.equal(child(child(child(child(child(protectedTree))))).type, AuthGuard);
  assert.equal(child(child(child(child(child(child(protectedTree)))))).type, PixelCurtainProvider);
  assert.equal(child(child(child(child(child(child(child(protectedTree))))))).type, CockpitTransitionProvider);
  assert.equal(child(child(child(child(child(child(child(child(protectedTree)))))))).type, 'span');

  const loginTree = LoginLayout({ children: <span>login</span> });
  assert.equal(loginTree.type, 'div');
  assert.equal(child(loginTree).type, ToastProvider);
  assert.equal(child(child(loginTree)).type, AuthProvider);
  assert.equal(child(child(child(loginTree))).type, 'span');

  const aboutTree = AboutLayout({ children: <span>about</span> });
  assert.equal(aboutTree.type, AuthProvider);
  assert.equal(child(aboutTree).type, 'span');

  const rootTree = RootLayout({ children: <span>root</span> });
  assert.equal(rootTree.type, 'html');
  const body = child(rootTree);
  assert.equal(body.type, 'body');
  assert.match(body.props.className ?? '', /bg-dot-grid/);
  assert.equal(body.props.children?.type, 'span');
});

test('initial data orchestration starts every API operation before any deferred result resolves', async () => {
  const starts: string[] = [];
  const deferred = <T,>() => {
    let resolvePromise: (value: T) => void = () => undefined;
    const promise = new Promise<T>((resolve) => { resolvePromise = resolve; });
    return { promise, resolve: resolvePromise };
  };
  const connection = deferred<boolean>();
  const settings = deferred<Awaited<ReturnType<InitialDataApi['getSettings']>>>();
  const filaments = deferred<Awaited<ReturnType<InitialDataApi['getFilaments']>>>();
  const printers = deferred<Awaited<ReturnType<InitialDataApi['getPrinters']>>>();
  const savedCalculations = deferred<Awaited<ReturnType<InitialDataApi['getSavedCalculations']>>>();
  const collections = deferred<Awaited<ReturnType<InitialDataApi['getCollections']>>>();
  const orders = deferred<Awaited<ReturnType<InitialDataApi['getOrders']>>>();
  const monthlyGoals = deferred<Awaited<ReturnType<InitialDataApi['getMonthlyGoalsConfig']>>>();
  const api: InitialDataApi = {
    checkSupabaseConnection: () => { starts.push('connection'); return connection.promise; },
    getSettings: () => { starts.push('settings'); return settings.promise; },
    getFilaments: () => { starts.push('filaments'); return filaments.promise; },
    getPrinters: () => { starts.push('printers'); return printers.promise; },
    getSavedCalculations: () => { starts.push('savedCalculations'); return savedCalculations.promise; },
    getCollections: () => { starts.push('collections'); return collections.promise; },
    getOrders: () => { starts.push('orders'); return orders.promise; },
    getMonthlyGoalsConfig: () => { starts.push('monthlyGoals'); return monthlyGoals.promise; },
  };

  const result = loadInitialData(api);
  assert.deepEqual(starts, ['connection', 'settings', 'filaments', 'printers', 'savedCalculations', 'collections', 'orders', 'monthlyGoals']);

  connection.resolve(true);
  const settingsValue = {} as Awaited<ReturnType<InitialDataApi['getSettings']>>;
  const filamentsValue = [] as Awaited<ReturnType<InitialDataApi['getFilaments']>>;
  const printersValue = [] as Awaited<ReturnType<InitialDataApi['getPrinters']>>;
  const savedCalculationsValue = [] as Awaited<ReturnType<InitialDataApi['getSavedCalculations']>>;
  const collectionsValue = [] as Awaited<ReturnType<InitialDataApi['getCollections']>>;
  const ordersValue = [] as Awaited<ReturnType<InitialDataApi['getOrders']>>;
  const monthlyGoalsValue = {} as Awaited<ReturnType<InitialDataApi['getMonthlyGoalsConfig']>>;
  settings.resolve(settingsValue);
  filaments.resolve(filamentsValue);
  printers.resolve(printersValue);
  savedCalculations.resolve(savedCalculationsValue);
  collections.resolve(collectionsValue);
  orders.resolve(ordersValue);
  monthlyGoals.resolve(monthlyGoalsValue);
  assert.deepEqual(await result, {
    onlineStatus: true,
    settings: settingsValue,
    filaments: filamentsValue,
    printers: printersValue,
    savedCalculations: savedCalculationsValue,
    collections: collectionsValue,
    orders: ordersValue,
    monthlyGoals: monthlyGoalsValue,
  });
});

const paymentOrder: Order = {
  id: 'order-7',
  date: '05.09.2026',
  type: 'income',
  title: 'Тестовый заказ',
  amount: 150,
  cost: 50,
  payment: 35,
  payments: [
    25,
    { id: '', amount: 10, date: '', note: '' },
  ],
  client: 'Сайт',
  contact: '',
  deadline: '',
  status: 'Не в работе',
  notes: '',
};

test('legacy order payments normalize to deterministic item identifiers', () => {
  const first = normalizeOrderPaymentItems(paymentOrder);
  const second = normalizeOrderPaymentItems(paymentOrder);

  assert.deepEqual(first, second);
  assert.deepEqual(first, [
    {
      id: 'pay-order-7-0',
      amount: 25,
      date: '05.09.2026',
      note: 'Оплата',
    },
    {
      id: 'pay-order-7-1',
      amount: 10,
      date: '05.09.2026',
      note: '',
    },
  ]);
});

test('drawer cleanup removes zero payments and preserves the paid total', () => {
  assert.deepEqual(getPaymentCleanupUpdate([
    { id: 'paid', amount: 25, date: '05.09.2026', note: 'Оплата' },
    { id: 'empty', amount: 0, date: '05.09.2026', note: '' },
  ]), {
    payment: 25,
    payments: [
      { id: 'paid', amount: 25, date: '05.09.2026', note: 'Оплата' },
    ],
  });

  assert.equal(getPaymentCleanupUpdate([
    { id: 'paid', amount: 25, date: '05.09.2026', note: 'Оплата' },
  ]), null);
});
