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

export async function loadInitialData(dataApi: InitialDataApi) {
  const onlineStatusPromise = dataApi.checkSupabaseConnection();
  const settingsPromise = dataApi.getSettings();
  const filamentsPromise = dataApi.getFilaments();
  const printersPromise = dataApi.getPrinters();
  const savedCalculationsPromise = dataApi.getSavedCalculations();
  const collectionsPromise = dataApi.getCollections();
  const ordersPromise = dataApi.getOrders();
  const monthlyGoalsPromise = dataApi.getMonthlyGoalsConfig();

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
