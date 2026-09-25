'use client';

import React, { createContext, useCallback, useContext, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Filament, Printer, Settings, SavedCalculation, CustomCostItem, ProductCollection, Order } from '../../shared/types';
import * as api from '../../shared/api/db';
import { parseDataBackup, type ParsedDataBackup } from '../../shared/lib/dataBackup';
import { useToast } from './ToastProvider';
import { useAuth } from './AuthProvider';
import { loadInitialData, createInitialDataLoadScope, type InitialLoadSnapshot } from './loadInitialData';

import { usePersistentState } from '../../shared/lib/usePersistentState';

interface DataContextType {
  filaments: Filament[];
  printers: Printer[];
  settings: Settings | null;
  savedCalculations: SavedCalculation[];
  collections: ProductCollection[];
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  monthlyGoals: api.MonthlyGoalsConfig;
  setMonthlyGoals: React.Dispatch<React.SetStateAction<api.MonthlyGoalsConfig>>;
  isLoading: boolean;
  initialLoad: InitialLoadSnapshot;
  isOnline: boolean;

  // Блокировка переходов при несохраненных настройках
  isSettingsDirty: boolean;
  setIsSettingsDirty: (dirty: boolean) => void;
  settingsSaveRef: React.MutableRefObject<(() => Promise<boolean>) | null> | null;

  // Сохранение состояния полей ввода калькулятора между страницами
  calcWeight: string;
  setCalcWeight: (val: string) => void;
  calcHours: string;
  setCalcHours: (val: string) => void;
  calcMinutes: string;
  setCalcMinutes: (val: string) => void;
  calcQuantity: string;
  setCalcQuantity: (val: string) => void;
  calcFilamentId: string;
  setCalcFilamentId: (val: string) => void;
  calcPrinterId: string;
  setCalcPrinterId: (val: string) => void;
  calcLaborMinutes: string;
  setCalcLaborMinutes: (val: string) => void;
  calcLaborRate: string;
  setCalcLaborRate: (val: string) => void;
  calcMarkup: string;
  setCalcMarkup: (val: string) => void;
  calcDefect: string;
  setCalcDefect: (val: string) => void;
  calcIsOwnerLabor: boolean;
  setCalcIsOwnerLabor: (val: boolean) => void;
  calcIsLaborPerUnit: boolean;
  setCalcIsLaborPerUnit: (val: boolean) => void;
  calcDiscountType: 'percent' | 'fixed';
  setCalcDiscountType: (val: 'percent' | 'fixed') => void;
  calcDiscountValue: string;
  setCalcDiscountValue: (val: string) => void;
  calcUrgencyType: 'percent' | 'fixed';
  setCalcUrgencyType: (val: 'percent' | 'fixed') => void;
  calcUrgencyValue: string;
  setCalcUrgencyValue: (val: string) => void;
  calcCustomCostItems: CustomCostItem[];
  setCalcCustomCostItems: React.Dispatch<React.SetStateAction<CustomCostItem[]>>;
  resetCalculator: () => void;

  // Filaments actions
  addFilament: (filament: Omit<Filament, 'id'>) => Promise<Filament>;
  updateFilament: (filament: Filament) => Promise<Filament>;
  deleteFilament: (id: string) => Promise<void>;

  // Printers actions
  addPrinter: (printer: Omit<Printer, 'id'>) => Promise<Printer>;
  updatePrinter: (printer: Printer) => Promise<Printer>;
  deletePrinter: (id: string) => Promise<void>;

  // Settings actions
  updateSettings: (settings: Settings) => Promise<Settings>;

  // Saved Calculations actions
  addSavedCalculation: (calc: Omit<SavedCalculation, 'id' | 'created_at'>) => Promise<SavedCalculation>;
  updateSavedCalculation: (calc: SavedCalculation) => Promise<SavedCalculation>;
  deleteSavedCalculation: (id: string) => Promise<void>;
  clearAllSavedCalculations: () => Promise<void>;
  restoreAllSavedCalculations: (calculations: SavedCalculation[]) => Promise<void>;
  setSavedCalculations: React.Dispatch<React.SetStateAction<SavedCalculation[]>>;

  // Collections actions
  addCollection: (collection: Omit<ProductCollection, 'id' | 'created_at'> & { id?: string }) => Promise<ProductCollection>;
  updateCollection: (collection: ProductCollection) => Promise<ProductCollection>;
  deleteCollection: (id: string, deleteContainedProducts?: boolean) => Promise<void>;
  setCollections: React.Dispatch<React.SetStateAction<ProductCollection[]>>;

  // Supabase connection
  refreshConnection: () => Promise<boolean>;

  // Data management & Random Seed
  seedRandomData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  restoreBackup: (snapshot: unknown) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { showSuccess, showWarning } = useToast();
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [monthlyGoals, setMonthlyGoals] = useState<api.MonthlyGoalsConfig>(api.DEFAULT_MONTHLY_GOALS_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState<InitialLoadSnapshot>({ revision: 0, completed: [], status: 'loading' });
  const [initialLoadUserId, setInitialLoadUserId] = useState<string | null>(null);
  const loadScope = useRef(createInitialDataLoadScope());
  const activeUserId = useRef<string | null>(null);
  const userId = currentUser?.id ?? null;

  // Invalidate before passive effects or pending request callbacks can publish for an old session.
  useLayoutEffect(() => {
    const scope = loadScope.current;
    activeUserId.current = isAuthLoading ? null : userId;
    scope.invalidate();
    return () => {
      activeUserId.current = null;
      scope.invalidate();
    };
  }, [userId, isAuthLoading]);
  const [isOnline, setIsOnline] = useState(false);
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const settingsSaveRef = useRef<(() => Promise<boolean>) | null>(null);

  // Стейты калькулятора с персистентным сохранением в localStorage
  const [calcWeight, setCalcWeight, resetCalcWeight] = usePersistentState('3d_calc_weight', '');
  const [calcHours, setCalcHours, resetCalcHours] = usePersistentState('3d_calc_hours', '');
  const [calcMinutes, setCalcMinutes, resetCalcMinutes] = usePersistentState('3d_calc_minutes', '');
  const [calcQuantity, setCalcQuantity, resetCalcQuantity] = usePersistentState('3d_calc_quantity', '1');
  const [calcFilamentId, setCalcFilamentId, resetCalcFilamentId] = usePersistentState('3d_calc_filament_id', '');
  const [calcPrinterId, setCalcPrinterId, resetCalcPrinterId] = usePersistentState('3d_calc_printer_id', '');
  const [calcLaborMinutes, setCalcLaborMinutes, resetCalcLaborMinutes] = usePersistentState('3d_calc_labor_minutes', '15');
  const [calcLaborRate, setCalcLaborRate, resetCalcLaborRate] = usePersistentState('3d_calc_labor_rate', '');
  const [calcMarkup, setCalcMarkup, resetCalcMarkup] = usePersistentState('3d_calc_markup', '');
  const [calcDefect, setCalcDefect, resetCalcDefect] = usePersistentState('3d_calc_defect', '');
  const [calcIsOwnerLabor, setCalcIsOwnerLabor, resetCalcIsOwnerLabor] = usePersistentState('3d_calc_is_owner_labor', false);
  const [calcIsLaborPerUnit, setCalcIsLaborPerUnit, resetCalcIsLaborPerUnit] = usePersistentState('3d_calc_is_labor_per_unit', false);
  const [calcDiscountType, setCalcDiscountType, resetCalcDiscountType] = usePersistentState<'percent' | 'fixed'>('3d_calc_discount_type', 'percent');
  const [calcDiscountValue, setCalcDiscountValue, resetCalcDiscountValue] = usePersistentState('3d_calc_discount_value', '');
  const [calcUrgencyType, setCalcUrgencyType, resetCalcUrgencyType] = usePersistentState<'percent' | 'fixed'>('3d_calc_urgency_type', 'percent');
  const [calcUrgencyValue, setCalcUrgencyValue, resetCalcUrgencyValue] = usePersistentState('3d_calc_urgency_value', '');
  const [calcCustomCostItems, setCalcCustomCostItems, resetCalcCustomCostItems] = usePersistentState<CustomCostItem[]>('3d_calc_custom_cost_items', []);

  const resetCalculator = () => {
    resetCalcWeight();
    resetCalcHours();
    resetCalcMinutes();
    resetCalcQuantity();
    resetCalcFilamentId();
    resetCalcPrinterId();
    resetCalcLaborMinutes();
    resetCalcLaborRate();
    resetCalcMarkup();
    resetCalcDefect();
    resetCalcIsOwnerLabor();
    resetCalcIsLaborPerUnit();
    resetCalcDiscountType();
    resetCalcDiscountValue();
    resetCalcUrgencyType();
    resetCalcUrgencyValue();
    resetCalcCustomCostItems();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('3d_calc_stl_url');
      localStorage.removeItem('3d_calc_stl_file_name');
      localStorage.removeItem('3d_calc_stl_file_data');
      localStorage.removeItem('3d_calc_save_modal_state');
    }
  };

  // Инициализация данных
  const loadData = useCallback(async () => {
    if (!userId || isAuthLoading || activeUserId.current !== userId) return;
    const scope = loadScope.current;
    const load = scope.begin(userId);
    setIsLoading(true);
    setInitialLoadUserId(userId);
    setInitialLoad({ revision: load.revision, completed: [], status: 'loading' });
    try {
      const {
        onlineStatus,
        settings: loadedSettings,
        filaments: loadedFilaments,
        printers: loadedPrinters,
        savedCalculations: loadedSavedCalculations,
        collections: loadedCollections,
        orders: loadedOrders,
        monthlyGoals: loadedMonthlyGoals,
      } = await loadInitialData(api, (task, outcome) => {
        if (!scope.isCurrent(load)) return;
        setInitialLoad(previous => {
          if (!scope.isCurrent(load) || previous.revision !== load.revision) return previous;
          if (outcome === 'error') return { ...previous, status: 'error' };
          if (previous.completed.includes(task)) return previous;
          return { ...previous, completed: [...previous.completed, task] };
        });
      });

      if (!scope.isCurrent(load)) return;

      setIsOnline(onlineStatus);
      setSettings(loadedSettings);
      setFilaments(loadedFilaments);
      setPrinters(loadedPrinters);
      setSavedCalculations(loadedSavedCalculations);
      setCollections(loadedCollections);
      setOrders(loadedOrders);
      setMonthlyGoals(loadedMonthlyGoals);
      setInitialLoad(previous => scope.isCurrent(load) && previous.revision === load.revision
        ? { ...previous, status: 'ready' } : previous);
    } catch (error) {
      if (!scope.isCurrent(load)) return;
      setInitialLoad(previous => scope.isCurrent(load) && previous.revision === load.revision
        ? { ...previous, status: 'error' } : previous);
      console.error('Ошибка инициализации данных:', error);
    } finally {
      if (scope.isCurrent(load)) setIsLoading(false);
    }
  }, [userId, isAuthLoading]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!userId) {
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled) return;
        setFilaments([]);
        setPrinters([]);
        setSettings(null);
        setSavedCalculations([]);
        setCollections([]);
        setOrders([]);
        setMonthlyGoals(api.DEFAULT_MONTHLY_GOALS_CONFIG);
        setIsOnline(false);
        setIsLoading(false);
        setInitialLoadUserId(null);
        setInitialLoad(previous => ({ revision: previous.revision + 1, completed: [], status: 'loading' }));
      });
      return () => { cancelled = true; };
    }

    void Promise.resolve().then(loadData);

    const handleRefreshCalcs = async () => {
      try {
        const [calcs, cols] = await Promise.all([
          api.getSavedCalculations(),
          api.getCollections(),
        ]);
        setSavedCalculations(calcs);
        setCollections(cols);
      } catch (err) {
        console.error('Ошибка обновления расчетов в DataProvider:', err);
      }
    };

    const handleRefreshOrders = async () => {
      try {
        const [nextOrders, calcs, cols] = await Promise.all([
          api.getOrders(),
          api.getSavedCalculations(),
          api.getCollections(),
        ]);
        setOrders(nextOrders);
        setSavedCalculations(calcs);
        setCollections(cols);
      } catch (err) {
        console.error('Ошибка обновления заказов в DataProvider:', err);
      }
    };

    const handleRefreshGoals = async () => {
      try {
        setMonthlyGoals(await api.getMonthlyGoalsConfig());
      } catch (err) {
        console.error('Ошибка обновления целей в DataProvider:', err);
      }
    };

    const handleStorage = () => {
      void handleRefreshOrders();
      void handleRefreshGoals();
    };

    window.addEventListener('saved_calculations_updated', handleRefreshCalcs);
    window.addEventListener('orders_updated', handleRefreshOrders);
    window.addEventListener('refresh-orders-data', handleRefreshOrders);
    window.addEventListener('monthly_goals_updated', handleRefreshGoals);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('saved_calculations_updated', handleRefreshCalcs);
      window.removeEventListener('orders_updated', handleRefreshOrders);
      window.removeEventListener('refresh-orders-data', handleRefreshOrders);
      window.removeEventListener('monthly_goals_updated', handleRefreshGoals);
      window.removeEventListener('storage', handleStorage);
    };
  }, [userId, isAuthLoading, loadData]);

  // Автоматическое отслеживание статуса сети и автосинхронизация при восстановлении соединения
  useEffect(() => {
    if (isAuthLoading || !currentUser) return;
    let wasOffline = !isOnline;
    let isChecking = false;

    const handleOnline = async () => {
      const isConnected = await api.checkSupabaseConnection();
      setIsOnline(isConnected);
      if (isConnected && wasOffline) {
        wasOffline = false;
        try {
          const syncResult = await api.syncLocalStorageToSupabase();
          if (syncResult) {
            setSettings(syncResult.settings);
            setFilaments(syncResult.filaments);
            setPrinters(syncResult.printers);
            setSavedCalculations(syncResult.savedCalculations);
            setCollections(syncResult.collections);
            setOrders(syncResult.orders);
            setMonthlyGoals(syncResult.goals);
            window.dispatchEvent(new Event('3d-data-synchronized'));
            showSuccess('Связь с сервером восстановлена, данные синхронизированы.');
          }
        } catch (e) {
          console.error('Ошибка автоматической синхронизации данных:', e);
        }
      }
    };

    const handleOffline = () => {
      wasOffline = true;
      setIsOnline(false);
      showWarning('Работа в автономном режиме. Данные сохраняются только в браузере.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Периодическая проверка раз в 25 секунд
    const interval = setInterval(async () => {
      if (isChecking || document.visibilityState !== 'visible') return;
      isChecking = true;
      try {
        const currentOnline = await api.checkSupabaseConnection();
        if (currentOnline && !isOnline) {
          wasOffline = true;
          await handleOnline();
        } else if (!currentOnline && isOnline) {
          handleOffline();
        } else {
          setIsOnline(currentOnline);
        }
      } finally {
        isChecking = false;
      }
    }, 25000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [currentUser, isAuthLoading, isOnline, showSuccess, showWarning]);

  // Филаменты
  const addFilament = async (filamentData: Omit<Filament, 'id'>) => {
    const created = await api.saveFilament(filamentData);
    setFilaments(prev => [created, ...prev]);
    return created;
  };

  const updateFilament = async (filamentData: Filament) => {
    const updated = await api.saveFilament(filamentData);
    setFilaments(prev => prev.map(f => f.id === updated.id ? updated : f));
    return updated;
  };

  const handleDeleteFilament = async (id: string) => {
    await api.deleteFilament(id);
    setFilaments(prev => prev.filter(f => f.id !== id));
  };

  // Принтеры
  const addPrinter = async (printerData: Omit<Printer, 'id'>) => {
    const created = await api.savePrinter(printerData);
    setPrinters(prev => [created, ...prev]);
    return created;
  };

  const updatePrinter = async (printerData: Printer) => {
    const updated = await api.savePrinter(printerData);
    setPrinters(prev => prev.map(p => p.id === updated.id ? updated : p));
    return updated;
  };

  const handleDeletePrinter = async (id: string) => {
    await api.deletePrinter(id);
    setPrinters(prev => prev.filter(p => p.id !== id));
    // Если удалили принтер по умолчанию, сбрасываем его в настройках
    if (settings && settings.default_printer_id === id) {
      await updateSettings({ ...settings, default_printer_id: null });
    }
  };

  // Избранные расчеты
  const addSavedCalculation = async (calcData: Omit<SavedCalculation, 'id' | 'created_at'>) => {
    const created = await api.addSavedCalculation(calcData);
    setSavedCalculations(prev => [created, ...prev]);
    return created;
  };

  const updateSavedCalculation = async (calcData: SavedCalculation) => {
    const updated = await api.updateSavedCalculation(calcData);
    setSavedCalculations(prev => prev.map(c => c.id === updated.id ? updated : c));
    return updated;
  };

  const deleteSavedCalculation = async (id: string) => {
    await api.deleteSavedCalculation(id);
    setSavedCalculations(prev => prev.filter(c => c.id !== id));
  };

  const clearAllSavedCalculations = async () => {
    await api.clearAllSavedCalculations();
    setSavedCalculations([]);
  };

  const restoreAllSavedCalculations = async (calculations: SavedCalculation[]) => {
    await api.restoreAllSavedCalculations(calculations);
    setSavedCalculations(calculations);
  };

  // Коллекции
  const addCollection = async (collectionData: Omit<ProductCollection, 'id' | 'created_at'> & { id?: string }) => {
    const created = await api.saveCollection(collectionData);
    setCollections(prev => [created, ...prev.filter(c => c.id !== created.id)]);
    return created;
  };

  const updateCollection = async (collectionData: ProductCollection) => {
    const updated = await api.updateCollection(collectionData);
    setCollections(prev => prev.map(c => c.id === updated.id ? updated : c));
    return updated;
  };

  const handleDeleteCollection = async (id: string, deleteContainedProducts = false) => {
    await api.deleteCollection(id, deleteContainedProducts);
    setCollections(prev => prev.filter(c => c.id !== id));
    if (deleteContainedProducts) {
      setSavedCalculations(prev => prev.filter(c => c.collection_id !== id));
    } else {
      setSavedCalculations(prev => prev.map(c => c.collection_id === id ? { ...c, collection_id: undefined, collection_name: undefined } : c));
    }
  };

  // Настройки
  const updateSettings = async (settingsData: Settings) => {
    const updated = await api.saveSettings(settingsData);
    setSettings(updated);
    return updated;
  };

  const refreshConnection = async () => {
    const onlineStatus = await api.checkSupabaseConnection();
    setIsOnline(onlineStatus);
    if (onlineStatus) {
      // Синхронизируем локальные данные и обновляем состояние
      const syncResult = await api.syncLocalStorageToSupabase();
      if (syncResult) {
        setSettings(syncResult.settings);
        setFilaments(syncResult.filaments);
        setPrinters(syncResult.printers);
        setSavedCalculations(syncResult.savedCalculations);
        setCollections(syncResult.collections);
        setOrders(syncResult.orders);
        setMonthlyGoals(syncResult.goals);
        window.dispatchEvent(new Event('3d-data-synchronized'));
        showSuccess('Связь с сервером восстановлена, данные синхронизированы.');
      }
    } else {
      showWarning('Работа в автономном режиме. Данные сохраняются только в браузере.');
    }
    return onlineStatus;
  };

  const refreshAllData = async () => {
    await loadData();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('refresh-orders-data'));
    }
  };

  const seedRandomData = async () => {
    const result = await api.seedRandomData();
    setFilaments(result.filaments);
    setPrinters(result.printers);
    setSavedCalculations(result.savedCalculations);
    setCollections(result.collections);
    setOrders(result.orders);
    if (result.settings) setSettings(result.settings);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('3d-data-synchronized'));
    }
  };

  const clearAllData = async () => {
    await api.clearAllData();
    setFilaments([]);
    setPrinters([]);
    setSavedCalculations([]);
    setCollections([]);
    setOrders([]);
    setMonthlyGoals(api.DEFAULT_MONTHLY_GOALS_CONFIG);
    setSettings(null);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('3d-data-synchronized'));
    }
  };

  const restoreBackup = async (input: unknown) => {
    // Parse before any API call so malformed nested entities cannot partially
    // overwrite cloud or local data. The API validates again at its boundary.
    const snapshot: ParsedDataBackup = parseDataBackup(input);
    await api.restoreDatabaseSnapshot(snapshot);

    if (snapshot.filaments !== undefined) setFilaments(snapshot.filaments);
    if (snapshot.printers !== undefined) setPrinters(snapshot.printers);
    if (snapshot.settings !== undefined) setSettings(snapshot.settings);
    if (snapshot.savedCalculations !== undefined) setSavedCalculations(snapshot.savedCalculations);
    if (snapshot.collections !== undefined) setCollections(snapshot.collections);
    if (snapshot.orders !== undefined) setOrders(snapshot.orders);
    if (snapshot.monthlyGoals !== undefined) setMonthlyGoals(snapshot.monthlyGoals);
    setIsOnline(await api.checkSupabaseConnection());

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('3d-data-synchronized'));
    }
  };

  return (
    <DataContext.Provider
      value={{
        filaments,
        printers,
        settings,
        savedCalculations,
        collections,
        orders,
        setOrders,
        monthlyGoals,
        setMonthlyGoals,
        isLoading,
        initialLoad: initialLoadUserId === userId && !isAuthLoading
          ? initialLoad : { revision: initialLoad.revision, completed: [], status: 'loading' },
        isOnline,
        isSettingsDirty,
        setIsSettingsDirty,
        settingsSaveRef,
        calcWeight,
        setCalcWeight,
        calcHours,
        setCalcHours,
        calcMinutes,
        setCalcMinutes,
        calcQuantity,
        setCalcQuantity,
        calcFilamentId,
        setCalcFilamentId,
        calcPrinterId,
        setCalcPrinterId,
        calcLaborMinutes,
        setCalcLaborMinutes,
        calcLaborRate,
        setCalcLaborRate,
        calcMarkup,
        setCalcMarkup,
        calcDefect,
        setCalcDefect,
        calcIsOwnerLabor,
        setCalcIsOwnerLabor,
        calcIsLaborPerUnit,
        setCalcIsLaborPerUnit,
        calcDiscountType,
        setCalcDiscountType,
        calcDiscountValue,
        setCalcDiscountValue,
        calcUrgencyType,
        setCalcUrgencyType,
        calcUrgencyValue,
        setCalcUrgencyValue,
        calcCustomCostItems,
        setCalcCustomCostItems,
        resetCalculator,
        addFilament,
        updateFilament,
        deleteFilament: handleDeleteFilament,
        addPrinter,
        updatePrinter,
        deletePrinter: handleDeletePrinter,
        updateSettings,
        addSavedCalculation,
        updateSavedCalculation,
        deleteSavedCalculation,
        clearAllSavedCalculations,
        restoreAllSavedCalculations,
        setSavedCalculations,
        addCollection,
        updateCollection,
        deleteCollection: handleDeleteCollection,
        setCollections,
        refreshConnection,
        seedRandomData,
        clearAllData,
        restoreBackup,
        refreshAllData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData должен использоваться внутри DataProvider');
  }
  return context;
}
