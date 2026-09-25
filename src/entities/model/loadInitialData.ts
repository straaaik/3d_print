import type * as api from '../../shared/api/db';

export interface InitialDataApi {
  checkSupabaseConnection: typeof api.checkSupabaseConnection;
  getSettings: typeof api.getSettings;
  getFilaments: typeof api.getFilaments;
  getPrinters: typeof api.getPrinters;
  getSavedCalculations: typeof api.getSavedCalculations;
  getCollections: typeof api.getCollections;
  getOrders: typeof api.getOrders;
  getMonthlyGoalsConfig: typeof api.getMonthlyGoalsConfig;
}

export type InitialDataTaskId = 'connection' | 'settings' | 'filaments' | 'printers'
  | 'savedCalculations' | 'collections' | 'orders' | 'monthlyGoals';

export type InitialDataObserver = (task: InitialDataTaskId, outcome: 'ready' | 'error') => void;

export interface InitialLoadSnapshot {
  revision: number;
  completed: readonly InitialDataTaskId[];
  status: 'loading' | 'ready' | 'error';
}

/** A load belongs to both a request revision and an authenticated session. */
export function createInitialDataLoadScope() {
  let revision = 0;
  let current: { revision: number; userId: string } | null = null;
  return {
    begin(userId: string) {
      current = { revision: ++revision, userId };
      return current;
    },
    invalidate() { current = null; revision += 1; },
    isCurrent(load: { revision: number; userId: string }) {
      return current?.revision === load.revision && current.userId === load.userId;
    },
  };
}

function observe<T>(id: InitialDataTaskId, run: () => Promise<T>, report?: InitialDataObserver): Promise<T> {
  // Preserve synchronous starts even if one API implementation throws before returning a promise.
  let operation: Promise<T>;
  try { operation = run(); } catch (error) { operation = Promise.reject(error); }
  return operation.then(value => {
    report?.(id, 'ready');
    return value;
  }, error => {
    report?.(id, 'error');
    throw error;
  });
}

export async function loadInitialData(dataApi: InitialDataApi, onTask?: InitialDataObserver) {
  const onlineStatusPromise = observe('connection', () => dataApi.checkSupabaseConnection(), onTask);
  const settingsPromise = observe('settings', () => dataApi.getSettings(), onTask);
  const filamentsPromise = observe('filaments', () => dataApi.getFilaments(), onTask);
  const printersPromise = observe('printers', () => dataApi.getPrinters(), onTask);
  const savedCalculationsPromise = observe('savedCalculations', () => dataApi.getSavedCalculations(), onTask);
  const collectionsPromise = observe('collections', () => dataApi.getCollections(), onTask);
  const ordersPromise = observe('orders', () => dataApi.getOrders(), onTask);
  const monthlyGoalsPromise = observe('monthlyGoals', () => dataApi.getMonthlyGoalsConfig(), onTask);

  const [onlineStatus, settings, filaments, printers, savedCalculations, collections, orders, monthlyGoals] = await Promise.all([
    onlineStatusPromise,
    settingsPromise,
    filamentsPromise,
    printersPromise,
    savedCalculationsPromise,
    collectionsPromise,
    ordersPromise,
    monthlyGoalsPromise,
  ]);

  return {
    onlineStatus,
    settings,
    filaments,
    printers,
    savedCalculations,
    collections,
    orders,
    monthlyGoals,
  };
}
