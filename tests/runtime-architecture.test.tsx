import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(path), 'utf8');

test('workspace implementations are isolated behind named next/dynamic boundaries', () => {
  const workspace = source('src/widgets/CockpitWorkspace/CockpitWorkspace.tsx');

  assert.match(workspace, /import dynamic from 'next\/dynamic';/);
  assert.doesNotMatch(workspace, /import\s+\{\s*OrdersTable\s*\}\s+from/);
  assert.doesNotMatch(workspace, /import\s+\{\s*Calculator\s*\}\s+from/);
  assert.doesNotMatch(workspace, /import\s+\{\s*StatsDashboard\s*\}\s+from/);
  assert.doesNotMatch(workspace, /import\s+\{\s*ProductsList\s*\}\s+from/);
  assert.doesNotMatch(workspace, /import\s+\{\s*FilamentList\s*\}\s+from/);
  assert.doesNotMatch(workspace, /import\s+\{\s*PrinterList\s*\}\s+from/);

  const boundaries = [
    ['OrdersTable', '../Orders/OrdersTable', 'OrdersSkeleton'],
    ['Calculator', '../Calculator/Calculator', 'CalculatorSkeleton'],
    ['StatsDashboard', '../Stats/StatsDashboard', 'StatsSkeleton'],
    ['ProductsList', '../ProductsList/ProductsList', 'ProductsSkeleton'],
    ['FilamentList', '../FilamentList/FilamentList', 'FilamentsSkeleton'],
    ['PrinterList', '../PrinterList/PrinterList', 'PrintersSkeleton'],
  ];

  for (const [name, modulePath, skeleton] of boundaries) {
    const escapedPath = modulePath.replaceAll('/', '\\/');
    assert.match(
      workspace,
      new RegExp(`const ${name} = dynamic\\([\\s\\S]*?import\\('${escapedPath}'\\)\\.then\\(\\(module\\) => module\\.${name}\\)[\\s\\S]*?loading: \\(\\) => <${skeleton} \\/>`),
    );
  }
});

test('route groups keep provider ownership out of the root and public routes', () => {
  const rootLayout = source('src/app/layout.tsx');
  const protectedLayout = source('src/app/(protected)/layout.tsx');
  const loginLayout = source('src/app/(login)/layout.tsx');

  assert.match(rootLayout, /<body className="antialiased min-h-screen text-white bg-\[#0a0a0a\] bg-dot-grid">/);
  for (const provider of ['DataProvider', 'ToastProvider', 'AuthProvider', 'OrderModalProvider', 'AuthGuard', 'PixelCurtainProvider', 'CockpitTransitionProvider', 'InteractiveDotGrid']) {
    assert.doesNotMatch(rootLayout, new RegExp(provider));
  }

  for (const provider of ['ToastProvider', 'AuthProvider', 'DataProvider', 'OrderModalProvider', 'AuthGuard', 'PixelCurtainProvider', 'CockpitTransitionProvider']) {
    assert.match(protectedLayout, new RegExp(provider));
  }
  assert.match(loginLayout, /ToastProvider/);
  assert.match(loginLayout, /AuthProvider/);
  assert.doesNotMatch(loginLayout, /DataProvider|AuthGuard|OrderModalProvider|PixelCurtainProvider|CockpitTransitionProvider/);
  assert.equal(existsSync(resolve('src/app/(about)/about/page.tsx')), true);
  assert.equal(existsSync(resolve('src/app/auth/callback/route.ts')), true);
});

test('data initialization starts connectivity and every entity read before awaiting results', () => {
  const provider = source('src/entities/model/DataProvider.tsx');
  const loadData = provider.slice(provider.indexOf('const loadData = useCallback'));
  const starts = [
    'api.checkSupabaseConnection()',
    'api.getSettings()',
    'api.getFilaments()',
    'api.getPrinters()',
    'api.getSavedCalculations()',
    'api.getCollections()',
    'api.getOrders()',
    'api.getMonthlyGoalsConfig()',
  ];

  const awaitAll = loadData.indexOf('await Promise.all');
  for (const operation of starts) {
    const operationIndex = loadData.indexOf(operation);
    assert.notEqual(operationIndex, -1, `${operation} starts during initialization`);
    assert.ok(operationIndex < awaitAll, `${operation} starts before the combined await`);
  }
  assert.match(loadData, /await Promise\.all\(\[\s*onlineStatusPromise,\s*settingsPromise,\s*filamentsPromise,\s*printersPromise,\s*savedCalculationsPromise,\s*collectionsPromise,\s*ordersPromise,\s*monthlyGoalsPromise,?\s*\]\)/);
});
