'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Filament, Printer, Settings, SupabaseConfig, SavedCalculation } from '../../shared/types';
import * as api from '../../shared/api/db';

interface DataContextType {
  filaments: Filament[];
  printers: Printer[];
  settings: Settings | null;
  savedCalculations: SavedCalculation[];
  isLoading: boolean;
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
  deleteSavedCalculation: (id: string) => Promise<void>;
  
  // Supabase configuration
  saveSupabaseConfig: (config: SupabaseConfig | null) => Promise<void>;
  refreshConnection: () => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const settingsSaveRef = useRef<(() => Promise<boolean>) | null>(null);

  // Стейты калькулятора для сохранения при смене страниц
  const [calcWeight, setCalcWeight] = useState('');
  const [calcHours, setCalcHours] = useState('');
  const [calcMinutes, setCalcMinutes] = useState('');
  const [calcQuantity, setCalcQuantity] = useState('1');
  const [calcFilamentId, setCalcFilamentId] = useState('');
  const [calcPrinterId, setCalcPrinterId] = useState('');

  const resetCalculator = () => {
    setCalcWeight('');
    setCalcHours('');
    setCalcMinutes('');
    setCalcQuantity('1');
  };

  // Инициализация данных
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Проверяем соединение с Supabase
      const onlineStatus = await api.checkSupabaseConnection();
      setIsOnline(onlineStatus);

      // 2. Параллельно загружаем все данные
      const [loadedSettings, loadedFilaments, loadedPrinters, loadedSavedCalculations] = await Promise.all([
        api.getSettings(),
        api.getFilaments(),
        api.getPrinters(),
        api.getSavedCalculations(),
      ]);

      setSettings(loadedSettings);
      setFilaments(loadedFilaments);
      setPrinters(loadedPrinters);
      setSavedCalculations(loadedSavedCalculations);
    } catch (error) {
      console.error('Ошибка инициализации данных:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const deleteSavedCalculation = async (id: string) => {
    await api.deleteSavedCalculation(id);
    setSavedCalculations(prev => prev.filter(c => c.id !== id));
  };

  // Настройки
  const updateSettings = async (settingsData: Settings) => {
    const updated = await api.saveSettings(settingsData);
    setSettings(updated);
    return updated;
  };

  // Настройки Supabase
  const saveSupabaseConfig = async (config: SupabaseConfig | null) => {
    api.saveSupabaseConfig(config);
    // После изменения конфигурации полностью перезагружаем данные
    await loadData();
  };

  const refreshConnection = async () => {
    const onlineStatus = await api.checkSupabaseConnection();
    setIsOnline(onlineStatus);
    if (onlineStatus) {
      // Если подключились, перезагружаем данные из облака
      const [loadedSettings, loadedFilaments, loadedPrinters, loadedSavedCalculations] = await Promise.all([
        api.getSettings(),
        api.getFilaments(),
        api.getPrinters(),
        api.getSavedCalculations(),
      ]);
      setSettings(loadedSettings);
      setFilaments(loadedFilaments);
      setPrinters(loadedPrinters);
      setSavedCalculations(loadedSavedCalculations);
    }
    return onlineStatus;
  };

  return (
    <DataContext.Provider
      value={{
        filaments,
        printers,
        settings,
        savedCalculations,
        isLoading,
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
        resetCalculator,
        addFilament,
        updateFilament,
        deleteFilament: handleDeleteFilament,
        addPrinter,
        updatePrinter,
        deletePrinter: handleDeletePrinter,
        updateSettings,
        addSavedCalculation,
        deleteSavedCalculation,
        saveSupabaseConfig,
        refreshConnection,
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
