import { Filament, Printer, Settings, SavedCalculation, Order, ProductCollection } from '../types';
/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema types are not generated in this project yet. */
import { generateRandomSeedData, SeedDataResult } from '../lib/seedGenerator';
import { createClient } from '../../lib/supabase/client';
import { getScopedStorageKey, getStorageScope } from '../lib/storageScope';
import { parseDataBackup, type ParsedDataBackup } from '../lib/dataBackup';

const STORAGE_BASE_KEYS = {
  FILAMENTS: '3d_calc_filaments',
  PRINTERS: '3d_calc_printers',
  SETTINGS: '3d_calc_settings',
  SAVED_CALCULATIONS: '3d_calc_saved_calculations',
  ORDERS: '3d_calc_orders',
  COLLECTIONS: '3d_calc_collections',
  MONTHLY_GOALS: '3d_calc_monthly_goals',
  SYNC_QUEUE: '3d_calc_sync_queue',
} as const;

export const STORAGE_KEYS = {
  get FILAMENTS() { return getScopedStorageKey(STORAGE_BASE_KEYS.FILAMENTS); },
  get PRINTERS() { return getScopedStorageKey(STORAGE_BASE_KEYS.PRINTERS); },
  get SETTINGS() { return getScopedStorageKey(STORAGE_BASE_KEYS.SETTINGS); },
  get SAVED_CALCULATIONS() { return getScopedStorageKey(STORAGE_BASE_KEYS.SAVED_CALCULATIONS); },
  get ORDERS() { return getScopedStorageKey(STORAGE_BASE_KEYS.ORDERS); },
  get COLLECTIONS() { return getScopedStorageKey(STORAGE_BASE_KEYS.COLLECTIONS); },
  get MONTHLY_GOALS() { return getScopedStorageKey(STORAGE_BASE_KEYS.MONTHLY_GOALS); },
  get SYNC_QUEUE() { return getScopedStorageKey(STORAGE_BASE_KEYS.SYNC_QUEUE); },
};

type SyncEntity = 'filaments' | 'printers' | 'settings' | 'saved_calculations' | 'orders' | 'collections' | 'monthly_goals';
type SyncAction = 'upsert' | 'delete';

interface SyncOperation {
  entity: SyncEntity;
  action: SyncAction;
  id: string;
  payload?: Record<string, unknown>;
  queuedAt: string;
}

export class DatabaseOperationError extends Error {
  constructor(operation: string, readonly causeData?: unknown) {
    super(`Supabase отклонил операцию: ${operation}`);
    this.name = 'DatabaseOperationError';
  }
}

function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Повреждён локальный кэш «${key}», использовано безопасное значение.`, error);
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function writeLocalJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function upsertLocalItem<T extends { id: string }>(key: string, item: T): T[] {
  const current = readLocalJson<T[]>(key, []);
  const next = current.map(existing => existing.id === item.id ? item : existing);
  if (!current.some(existing => existing.id === item.id)) next.unshift(item);
  writeLocalJson(key, next);
  return next;
}

function deleteLocalItem<T extends { id: string }>(key: string, id: string): T[] {
  const next = readLocalJson<T[]>(key, []).filter(item => item.id !== id);
  writeLocalJson(key, next);
  return next;
}

function withoutStlPayload(calculation: SavedCalculation): SavedCalculation {
  const safeCalculation = { ...calculation };
  delete safeCalculation.stl_file_data;
  return safeCalculation;
}

function enqueueSyncOperation(operation: Omit<SyncOperation, 'queuedAt'>): void {
  if (typeof window === 'undefined' || getStorageScope() === 'anonymous') return;
  const queue = readLocalJson<SyncOperation[]>(STORAGE_KEYS.SYNC_QUEUE, []);
  const withoutOlderVersion = queue.filter(item => !(item.entity === operation.entity && item.id === operation.id));
  withoutOlderVersion.push({ ...operation, queuedAt: new Date().toISOString() });
  writeLocalJson(STORAGE_KEYS.SYNC_QUEUE, withoutOlderVersion);
}

function removeSyncOperation(entity: SyncEntity, id: string): void {
  if (typeof window === 'undefined') return;
  const queue = readLocalJson<SyncOperation[]>(STORAGE_KEYS.SYNC_QUEUE, []);
  writeLocalJson(STORAGE_KEYS.SYNC_QUEUE, queue.filter(item => !(item.entity === entity && item.id === id)));
}

function removeAllSyncOperations(entity: SyncEntity): void {
  if (typeof window === 'undefined') return;
  const queue = readLocalJson<SyncOperation[]>(STORAGE_KEYS.SYNC_QUEUE, []);
  writeLocalJson(STORAGE_KEYS.SYNC_QUEUE, queue.filter(item => item.entity !== entity));
}

function isOfflineFailure(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!(error instanceof Error)) return false;
  return error.name === 'TypeError' || /fetch|network|failed to fetch|load failed/i.test(error.message);
}

function isMissingColumnError(error: unknown, columnName?: string): boolean {
  if (!error) return false;
  const err = error as { code?: string; message?: string; details?: string; hint?: string; causeData?: any };
  const target = err.causeData || err;
  const code = target?.code;
  const message = String(target?.message || (error instanceof Error ? error.message : ''));
  const details = String(target?.details || '');
  const text = `${message} ${details}`;

  const isColCode = code === 'PGRST204' || code === '42703';
  const isColText = /column.*does not exist/i.test(text) || /schema cache/i.test(text);

  if (columnName) {
    return (isColCode || isColText) && text.toLowerCase().includes(columnName.toLowerCase());
  }
  return isColCode || isColText;
}

function throwDatabaseError(operation: string, error: unknown): never {
  throw new DatabaseOperationError(operation, error);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const DEFAULT_SETTINGS: Settings = {
  currency: '₽',
  electricity_rate: 4.89,
  default_printer_id: null,
  labor_rate_per_hour: 0,
  labor_time_minutes: 15,
  is_owner_labor_default: true,
  is_labor_per_unit_default: false,
  min_order_price: 300,
  enable_material_difficulty: true,
  material_multipliers: {
    pla_petg: 100,
    abs_asa: 120,
    tpu_flex: 140,
    nylon_cf: 170,
  },
  default_markup_percent: 100,
  default_defect_percent: 5,
  default_urgency_percent: 25,
};

const DEFAULT_PRINTERS: Printer[] = [];
const DEFAULT_FILAMENTS: Filament[] = [];
const DEFAULT_SAVED_CALCULATIONS: SavedCalculation[] = [];
const DEFAULT_ORDERS: Order[] = [];
/* Legacy demo dataset intentionally disabled: production/offline users must
   never receive synthetic orders or contact data.
[
  {
    id: 'ord-sample-1',
    order_number: 1045,
    created_at: '2026-08-28T14:30:00.000Z',
    date: '28.08.2026',
    type: 'income',
    title: 'Срочная печать шестерни редуктора (Nylon CF)',
    quantity: 2,
    base_amount: 4000,
    urgency_type: 'percent',
    urgency_percent: 25,
    urgency_amount: 1000,
    amount: 5000,
    cost: 1350,
    cost_items: [
      { id: 'c1', category: 'Печать', amount: 1050 },
      { id: 'c2', category: 'Упаковка', amount: 300 },
    ],
    payments: [5000],
    payment: 5000,
    client: 'Авито',
    contact: '+7 (928) 441-89-12',
    contacts: [{ type: 'phone', value: '+7 (928) 441-89-12', label: 'Телефон' }],
    deadline: '29.08.2026',
    status: 'Печать',
    notes: 'Срочный заказ в день обращения, клиент заберет самовывозом.',
  },
  {
    id: 'ord-sample-2',
    order_number: 1044,
    created_at: '2026-08-27T11:15:00.000Z',
    date: '27.08.2026',
    type: 'income',
    title: 'Партия корпусов датчиков влажности (PETG)',
    quantity: 20,
    base_amount: 16000,
    discount_type: 'percent',
    discount_percent: 15,
    discount_amount: 2400,
    amount: 13600,
    cost: 4200,
    cost_items: [
      { id: 'c1', category: 'Печать', amount: 3600 },
      { id: 'c2', category: 'Работа руками', amount: 600 },
    ],
    payments: [6800],
    payment: 6800,
    client: 'Telegram',
    contact: '@sensor_maker_pro',
    contacts: [{ type: 'telegram', value: '@sensor_maker_pro', label: 'Telegram' }],
    deadline: '02.09.2026',
    status: 'Ждет печати',
    notes: 'Скидка 15% за оптовую партию 20 штук. Предоплата 50% внесена.',
  },
  {
    id: 'ord-sample-3',
    order_number: 1043,
    created_at: '2026-08-26T16:40:00.000Z',
    date: '26.08.2026',
    type: 'income',
    title: 'Прототип выставочного макета дрона (PLA+)',
    quantity: 1,
    base_amount: 8000,
    discount_type: 'fixed',
    discount_percent: 5,
    discount_amount: 400,
    urgency_type: 'percent',
    urgency_percent: 20,
    urgency_amount: 1600,
    amount: 9200,
    cost: 2800,
    cost_items: [
      { id: 'c1', category: 'Печать', amount: 2100 },
      { id: 'c2', category: 'Покраска', amount: 700 },
    ],
    payments: [9200],
    payment: 9200,
    client: 'VK',
    contact: 'vk.com/dronetech_lab',
    contacts: [{ type: 'vk', value: 'vk.com/dronetech_lab', label: 'VK' }],
    deadline: '30.08.2026',
    status: 'Покраска',
    notes: 'Применена наценка за срочность +20% и скидка постоянного клиента 400 ₽.',
  },
  {
    id: 'ord-sample-4',
    order_number: 1042,
    created_at: '2026-08-25T09:20:00.000Z',
    date: '25.08.2026',
    type: 'income',
    title: 'Шарнирный дракон Crystal (Silk Gold)',
    quantity: 2,
    base_amount: 3600,
    amount: 3600,
    cost: 840,
    cost_items: [
      { id: 'c1', category: 'Печать', amount: 720 },
      { id: 'c2', category: 'Упаковка', amount: 120 },
    ],
    payments: [3600],
    payment: 3600,
    client: 'Авито',
    contact: '+7 (918) 332-11-44',
    contacts: [{ type: 'phone', value: '+7 (918) 332-11-44', label: 'Телефон' }],
    deadline: '26.08.2026',
    status: 'Готово',
    notes: 'Стандартный заказ без скидок и наценок.',
  },
  {
    id: 'ord-sample-5',
    order_number: 1041,
    created_at: '2026-08-24T18:00:00.000Z',
    date: '24.08.2026',
    type: 'expense',
    title: 'Закупка филамента PETG и сопел 0.4мм',
    quantity: 1,
    amount: 5400,
    cost: 5400,
    cost_items: [{ id: 'c1', category: 'Расходные материалы', amount: 5400 }],
    payments: [5400],
    payment: 5400,
    client: 'Другое',
    contact: '',
    contacts: [],
    deadline: '24.08.2026',
    status: 'Готово',
    notes: 'Закупка расходников для мастерской (Ozon).',
  }
]
*/
const DEFAULT_COLLECTIONS: ProductCollection[] = [];

// Инициализация клиента Supabase (базовый)
export function getSupabaseClient() {
  return createClient();
}

// Получение клиента Supabase только при наличии активной авторизованной сессии
export async function getAuthenticatedSupabaseClient() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) {
      return null;
    }
    return client;
  } catch {
    return null;
  }
}

// Проверка доступности Supabase и наличия активной сессии
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const authClient = await getAuthenticatedSupabaseClient();
    return !!authClient;
  } catch {
    return false;
  }
}

// ==========================================
// FILAMENTS API
// ==========================================

export async function getFilaments(): Promise<Filament[]> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('filaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throwDatabaseError('загрузка филаментов', error);
      const filaments = (data || []) as Filament[];
      writeLocalJson(STORAGE_KEYS.FILAMENTS, filaments);
      return filaments;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  return readLocalJson<Filament[]>(STORAGE_KEYS.FILAMENTS, DEFAULT_FILAMENTS);
}

export async function saveFilament(filament: Omit<Filament, 'id'> & { id?: string }): Promise<Filament> {
  const client = await getAuthenticatedSupabaseClient();
  const id = filament.id || crypto.randomUUID();
  const newFilament = { ...filament, id };

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('filaments')
        .upsert(newFilament)
        .select()
        .single();

      if (error || !data) throwDatabaseError('сохранение филамента', error);
      const saved = data as Filament;
      upsertLocalItem(STORAGE_KEYS.FILAMENTS, saved);
      removeSyncOperation('filaments', saved.id);
      return saved;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  const saved = newFilament as Filament;
  upsertLocalItem(STORAGE_KEYS.FILAMENTS, saved);
  enqueueSyncOperation({ entity: 'filaments', action: 'upsert', id, payload: saved as unknown as Record<string, unknown> });
  return saved;
}

export async function deleteFilament(id: string): Promise<void> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { error } = await (client as any).from('filaments').delete().eq('id', id);
      if (error) throwDatabaseError('удаление филамента', error);
      deleteLocalItem<Filament>(STORAGE_KEYS.FILAMENTS, id);
      removeSyncOperation('filaments', id);
      return;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  deleteLocalItem<Filament>(STORAGE_KEYS.FILAMENTS, id);
  if (isUuid(id)) enqueueSyncOperation({ entity: 'filaments', action: 'delete', id });
}

// ==========================================
// PRINTERS API
// ==========================================

export async function getPrinters(): Promise<Printer[]> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('printers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throwDatabaseError('загрузка принтеров', error);
      const printers = (data || []) as Printer[];
      writeLocalJson(STORAGE_KEYS.PRINTERS, printers);
      return printers;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  return readLocalJson<Printer[]>(STORAGE_KEYS.PRINTERS, DEFAULT_PRINTERS);
}

export async function savePrinter(printer: Omit<Printer, 'id'> & { id?: string }): Promise<Printer> {
  const client = await getAuthenticatedSupabaseClient();
  const id = printer.id || crypto.randomUUID();
  const newPrinter = { ...printer, id };

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('printers')
        .upsert(newPrinter)
        .select()
        .single();

      if (error || !data) throwDatabaseError('сохранение принтера', error);
      const saved = data as Printer;
      upsertLocalItem(STORAGE_KEYS.PRINTERS, saved);
      removeSyncOperation('printers', saved.id);
      return saved;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  const saved = newPrinter as Printer;
  upsertLocalItem(STORAGE_KEYS.PRINTERS, saved);
  enqueueSyncOperation({ entity: 'printers', action: 'upsert', id, payload: saved as unknown as Record<string, unknown> });
  return saved;
}

export async function deletePrinter(id: string): Promise<void> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { error } = await (client as any).from('printers').delete().eq('id', id);
      if (error) throwDatabaseError('удаление принтера', error);
      deleteLocalItem<Printer>(STORAGE_KEYS.PRINTERS, id);
      removeSyncOperation('printers', id);
      return;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  deleteLocalItem<Printer>(STORAGE_KEYS.PRINTERS, id);
  if (isUuid(id)) enqueueSyncOperation({ entity: 'printers', action: 'delete', id });
}

// ==========================================
// SETTINGS API
// ==========================================

export async function getSettings(): Promise<Settings> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('settings')
        .select('*')
        .maybeSingle();

      if (error) throwDatabaseError('загрузка настроек', error);
      if (data) {
        const fullSettings: Settings = {
          ...DEFAULT_SETTINGS,
          ...data,
          material_multipliers: {
            ...DEFAULT_SETTINGS.material_multipliers,
            ...(data.material_multipliers || {}),
          },
        };
        writeLocalJson(STORAGE_KEYS.SETTINGS, fullSettings);
        return fullSettings;
      }

      return saveSettings(DEFAULT_SETTINGS);
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  const cached = readLocalJson<Settings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...cached,
    material_multipliers: {
      ...DEFAULT_SETTINGS.material_multipliers,
      ...(cached.material_multipliers || {}),
    },
  };
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) throwDatabaseError('проверка пользователя настроек', authError);
      const settingsToSave = {
        ...settings,
        user_id: authData.user.id,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await (client as any)
        .from('settings')
        .upsert(settingsToSave, { onConflict: 'user_id' })
        .select()
        .single();

      if (error || !data) throwDatabaseError('сохранение настроек', error);
      writeLocalJson(STORAGE_KEYS.SETTINGS, data);
      removeSyncOperation('settings', 'current');
      return data as Settings;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  writeLocalJson(STORAGE_KEYS.SETTINGS, settings);
  enqueueSyncOperation({ entity: 'settings', action: 'upsert', id: 'current', payload: settings as unknown as Record<string, unknown> });
  return settings;
}

// ==========================================
// SAVED CALCULATIONS (FAVORITES) API
// ==========================================

export async function getSavedCalculations(): Promise<SavedCalculation[]> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('saved_calculations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throwDatabaseError('загрузка расчётов', error);
      const rawCloudCalculations = (data || []) as SavedCalculation[];
      const localCached = readLocalJson<SavedCalculation[]>(STORAGE_KEYS.SAVED_CALCULATIONS, []);
      const localMap = new Map(localCached.map(c => [c.id, c]));
      const calculations = rawCloudCalculations.map(cloudItem => {
        const localItem = localMap.get(cloudItem.id);
        if (localItem?.assembly_electronics?.length && (!cloudItem.assembly_electronics || cloudItem.assembly_electronics.length === 0)) {
          return { ...cloudItem, assembly_electronics: localItem.assembly_electronics };
        }
        return cloudItem;
      });
      writeLocalJson(STORAGE_KEYS.SAVED_CALCULATIONS, calculations.map(withoutStlPayload));
      return calculations;
    } catch (error) {
      if (!isOfflineFailure(error)) {
        console.warn('Не удалось загрузить расчёты из Supabase, используется локальный кэш:', error);
      }
    }
  }

  return readLocalJson<SavedCalculation[]>(STORAGE_KEYS.SAVED_CALCULATIONS, DEFAULT_SAVED_CALCULATIONS);
}

export async function addSavedCalculation(
  calc: Omit<SavedCalculation, 'id' | 'created_at'>
): Promise<SavedCalculation> {
  const client = await getAuthenticatedSupabaseClient();
  const id = crypto.randomUUID();
  const newCalc: SavedCalculation = {
    ...calc,
    id,
    created_at: new Date().toISOString(),
  };

  if (client) {
    try {
      let data: any = null;
      let error: any = null;

      const res = await (client as any)
        .from('saved_calculations')
        .insert(newCalc)
        .select()
        .single();
      data = res.data;
      error = res.error;

      if (error && isMissingColumnError(error, 'assembly_electronics')) {
        console.warn('Колонка assembly_electronics отсутствует в Supabase, сохраняем без неё в облако с fallback в локальный кэш.');
        const { assembly_electronics, ...calcWithoutElectronics } = newCalc;
        const retryRes = await (client as any)
          .from('saved_calculations')
          .insert(calcWithoutElectronics)
          .select()
          .single();
        if (!retryRes.error && retryRes.data) {
          data = { ...retryRes.data, assembly_electronics: newCalc.assembly_electronics };
          error = null;
        }
      }

      if (error || !data) throwDatabaseError('сохранение расчёта', error);
      const saved = { ...((data || newCalc) as SavedCalculation), ...(newCalc.assembly_electronics ? { assembly_electronics: newCalc.assembly_electronics } : {}) };
      upsertLocalItem(STORAGE_KEYS.SAVED_CALCULATIONS, withoutStlPayload(saved));
      removeSyncOperation('saved_calculations', saved.id);
      return saved;
    } catch (error) {
      if (!isOfflineFailure(error)) {
        console.warn('Ошибка сохранения расчёта в Supabase, переключение на локальное хранилище:', error);
      }
    }
  }

  const safe = withoutStlPayload(newCalc);
  upsertLocalItem(STORAGE_KEYS.SAVED_CALCULATIONS, safe);
  enqueueSyncOperation({ entity: 'saved_calculations', action: 'upsert', id, payload: safe as unknown as Record<string, unknown> });
  return newCalc;
}

export async function updateSavedCalculation(
  calc: SavedCalculation
): Promise<SavedCalculation> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      let data: any = null;
      let error: any = null;

      const res = await (client as any)
        .from('saved_calculations')
        .upsert(calc)
        .select()
        .single();
      data = res.data;
      error = res.error;

      if (error && isMissingColumnError(error, 'assembly_electronics')) {
        console.warn('Колонка assembly_electronics отсутствует в Supabase, обновляем без неё в облаке с fallback в локальный кэш.');
        const { assembly_electronics, ...calcWithoutElectronics } = calc;
        const retryRes = await (client as any)
          .from('saved_calculations')
          .upsert(calcWithoutElectronics)
          .select()
          .single();
        if (!retryRes.error && retryRes.data) {
          data = { ...retryRes.data, assembly_electronics: calc.assembly_electronics };
          error = null;
        }
      }

      if (error || !data) throwDatabaseError('обновление расчёта', error);
      const saved = { ...((data || calc) as SavedCalculation), ...(calc.assembly_electronics ? { assembly_electronics: calc.assembly_electronics } : {}) };
      upsertLocalItem(STORAGE_KEYS.SAVED_CALCULATIONS, withoutStlPayload(saved));
      removeSyncOperation('saved_calculations', saved.id);
      return saved;
    } catch (error) {
      if (!isOfflineFailure(error)) {
        console.warn('Ошибка обновления расчёта в Supabase, переключение на локальное хранилище:', error);
      }
    }
  }

  const safe = withoutStlPayload(calc);
  upsertLocalItem(STORAGE_KEYS.SAVED_CALCULATIONS, safe);
  enqueueSyncOperation({ entity: 'saved_calculations', action: 'upsert', id: calc.id, payload: safe as unknown as Record<string, unknown> });
  return calc;
}

export async function deleteSavedCalculation(id: string): Promise<boolean> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { error } = await (client as any)
        .from('saved_calculations')
        .delete()
        .eq('id', id);

      if (error) throwDatabaseError('удаление расчёта', error);
      deleteLocalItem<SavedCalculation>(STORAGE_KEYS.SAVED_CALCULATIONS, id);
      removeSyncOperation('saved_calculations', id);
      return true;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  deleteLocalItem<SavedCalculation>(STORAGE_KEYS.SAVED_CALCULATIONS, id);
  if (isUuid(id)) enqueueSyncOperation({ entity: 'saved_calculations', action: 'delete', id });
  return true;
}

export async function clearAllSavedCalculations(): Promise<boolean> {
  await restoreAllSavedCalculations([]);
  return true;
}

/**
 * Атомарно восстанавливает весь список сохранённых расчётов (для Undo).
 * Заменяет clearAll + addOne-by-one на единую операцию.
 */
export async function restoreAllSavedCalculations(calculations: SavedCalculation[]): Promise<void> {
  const client = await getAuthenticatedSupabaseClient();
  const safeList = calculations.map(withoutStlPayload);

  if (client) {
    try {
      const { error } = await client.rpc('restore_saved_calculations_snapshot', { p_items: calculations });
      if (error) throwDatabaseError('восстановление снимка расчётов', error);
      writeLocalJson(STORAGE_KEYS.SAVED_CALCULATIONS, safeList);
      removeAllSyncOperations('saved_calculations');
      return;
    } catch (error) {
      if (!isOfflineFailure(error)) {
        console.warn('Не удалось восстановить расчёты в Supabase, переключение на локальное сохранение:', error);
      }
    }
  }

  const current = readLocalJson<SavedCalculation[]>(STORAGE_KEYS.SAVED_CALCULATIONS, []);
  const nextIds = new Set(safeList.map(item => item.id));
  current.filter(item => !nextIds.has(item.id)).forEach(item => {
    if (isUuid(item.id)) enqueueSyncOperation({ entity: 'saved_calculations', action: 'delete', id: item.id });
  });
  safeList.forEach(item => enqueueSyncOperation({
    entity: 'saved_calculations',
    action: 'upsert',
    id: item.id,
    payload: item as unknown as Record<string, unknown>,
  }));
  writeLocalJson(STORAGE_KEYS.SAVED_CALCULATIONS, safeList);
}

// ==========================================
// COLLECTIONS API
// ==========================================

export async function getCollections(): Promise<ProductCollection[]> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throwDatabaseError('загрузка коллекций', error);
      const collections = (data || []) as ProductCollection[];
      writeLocalJson(STORAGE_KEYS.COLLECTIONS, collections);
      return collections;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  return readLocalJson<ProductCollection[]>(STORAGE_KEYS.COLLECTIONS, DEFAULT_COLLECTIONS);
}

export async function saveCollection(
  col: Omit<ProductCollection, 'id' | 'created_at'> & { id?: string }
): Promise<ProductCollection> {
  const client = await getAuthenticatedSupabaseClient();
  const id = col.id || crypto.randomUUID();
  const newCol: ProductCollection = {
    ...col,
    id,
    created_at: new Date().toISOString(),
  };

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('collections')
        .upsert(newCol)
        .select()
        .single();

      if (error || !data) throwDatabaseError('сохранение коллекции', error);
      const saved = data as ProductCollection;
      upsertLocalItem(STORAGE_KEYS.COLLECTIONS, saved);
      removeSyncOperation('collections', saved.id);
      return saved;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  upsertLocalItem(STORAGE_KEYS.COLLECTIONS, newCol);
  enqueueSyncOperation({ entity: 'collections', action: 'upsert', id, payload: newCol as unknown as Record<string, unknown> });
  return newCol;
}

export async function updateCollection(col: ProductCollection): Promise<ProductCollection> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('collections')
        .upsert(col)
        .select()
        .single();

      if (error || !data) throwDatabaseError('обновление коллекции', error);
      const saved = data as ProductCollection;
      upsertLocalItem(STORAGE_KEYS.COLLECTIONS, saved);
      removeSyncOperation('collections', saved.id);
      return saved;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  upsertLocalItem(STORAGE_KEYS.COLLECTIONS, col);
  enqueueSyncOperation({ entity: 'collections', action: 'upsert', id: col.id, payload: col as unknown as Record<string, unknown> });
  return col;
}

export async function deleteCollection(id: string, deleteContainedProducts = false): Promise<boolean> {
  const client = await getAuthenticatedSupabaseClient();

  if (deleteContainedProducts) {
    const calculations = await getSavedCalculations();
    const filteredCalcs = calculations.filter(c => c.collection_id !== id);
    await restoreAllSavedCalculations(filteredCalcs);
  } else {
    const calculations = await getSavedCalculations();
    const updatedCalcs = calculations.map(c => c.collection_id === id ? { ...c, collection_id: undefined, collection_name: undefined } : c);
    await restoreAllSavedCalculations(updatedCalcs);
  }

  if (client) {
    try {
      const { error } = await (client as any)
        .from('collections')
        .delete()
        .eq('id', id);

      if (error) throwDatabaseError('удаление коллекции', error);
      deleteLocalItem<ProductCollection>(STORAGE_KEYS.COLLECTIONS, id);
      removeSyncOperation('collections', id);
      return true;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  deleteLocalItem<ProductCollection>(STORAGE_KEYS.COLLECTIONS, id);
  if (isUuid(id)) enqueueSyncOperation({ entity: 'collections', action: 'delete', id });
  return true;
}

export async function clearAllCollections(): Promise<boolean> {
  await restoreAllCollections([]);
  return true;
}

export async function restoreAllCollections(collections: ProductCollection[]): Promise<void> {
  const client = await getAuthenticatedSupabaseClient();
  if (client) {
    try {
      const { error } = await client.rpc('restore_collections_snapshot', { p_items: collections });
      if (error) throwDatabaseError('восстановление снимка коллекций', error);
      writeLocalJson(STORAGE_KEYS.COLLECTIONS, collections);
      removeAllSyncOperations('collections');
      return;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  const current = readLocalJson<ProductCollection[]>(STORAGE_KEYS.COLLECTIONS, []);
  const nextIds = new Set(collections.map(item => item.id));
  current.filter(item => !nextIds.has(item.id)).forEach(item => {
    if (isUuid(item.id)) enqueueSyncOperation({ entity: 'collections', action: 'delete', id: item.id });
  });
  collections.forEach(item => enqueueSyncOperation({
    entity: 'collections', action: 'upsert', id: item.id, payload: item as unknown as Record<string, unknown>,
  }));
  writeLocalJson(STORAGE_KEYS.COLLECTIONS, collections);
}

/**
 * Атомарно восстанавливает весь список заказов (для Undo).
 * Вместо N последовательных saveOrder вызовов — один batch upsert.
 */
export async function restoreAllOrders(orders: Order[]): Promise<void> {
  const client = await getAuthenticatedSupabaseClient();
  if (client) {
    try {
      const { error } = await client.rpc('restore_orders_snapshot', { p_orders: orders });
      if (error) throwDatabaseError('восстановление снимка заказов', error);
      writeLocalJson(STORAGE_KEYS.ORDERS, orders);
      removeAllSyncOperations('orders');
      return;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  const currentOrders = readLocalJson<Order[]>(STORAGE_KEYS.ORDERS, []);
  restoreLocalInventorySnapshot(currentOrders, orders);
  writeLocalJson(STORAGE_KEYS.ORDERS, orders);

  const snapshotIds = new Set(orders.map(order => order.id));
  for (const current of currentOrders) {
    if (!snapshotIds.has(current.id)) {
      enqueueSyncOperation({ entity: 'orders', action: 'delete', id: current.id });
    }
  }
  for (const order of orders) {
    enqueueSyncOperation({ entity: 'orders', action: 'upsert', id: order.id, payload: order as unknown as Record<string, unknown> });
  }
}

// ==========================================
// ORDERS API
// ==========================================

export async function getOrders(): Promise<Order[]> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throwDatabaseError('загрузка заказов', error);
      const orders = (data || []) as Order[];
      writeLocalJson(STORAGE_KEYS.ORDERS, orders);
      return orders;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  return readLocalJson<Order[]>(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS);
}

function restoreLocalInventorySnapshot(currentOrders: Order[], nextOrders: Order[]): void {
  const calculations = readLocalJson<SavedCalculation[]>(STORAGE_KEYS.SAVED_CALCULATIONS, []);
  if (calculations.length === 0) return;

  const stockByProduct = new Map(calculations.map(product => [product.id, product.stock_quantity || 0]));
  for (const order of currentOrders) {
    if (order.type === 'income' && order.product_id) {
      stockByProduct.set(order.product_id, (stockByProduct.get(order.product_id) || 0) + Math.max(0, order.quantity || 0));
    }
  }
  for (const order of nextOrders) {
    if (order.type === 'income' && order.product_id) {
      const available = stockByProduct.get(order.product_id) || 0;
      const required = Math.max(0, order.quantity || 0);
      if (available < required) throw new Error(`Недостаточно товара «${order.title}» для восстановления заказа`);
      stockByProduct.set(order.product_id, available - required);
    }
  }

  writeLocalJson(
    STORAGE_KEYS.SAVED_CALCULATIONS,
    calculations.map(product => ({ ...product, stock_quantity: stockByProduct.get(product.id) ?? product.stock_quantity }))
  );
}

function applyLocalInventoryChange(previous: Order | undefined, next: Order | undefined, enforceAvailability = true): void {
  const calculations = readLocalJson<SavedCalculation[]>(STORAGE_KEYS.SAVED_CALCULATIONS, []);
  if (calculations.length === 0) {
    if (enforceAvailability && next?.type === 'income' && next.product_id) {
      throw new Error('Связанный товар не найден в локальном каталоге');
    }
    return;
  }

  const updated = calculations.map(product => ({ ...product }));
  if (previous?.type === 'income' && previous.product_id) {
    const product = updated.find(item => item.id === previous.product_id);
    if (product) product.stock_quantity = (product.stock_quantity || 0) + Math.max(0, previous.quantity || 0);
  }
  if (next?.type === 'income' && next.product_id) {
    const product = updated.find(item => item.id === next.product_id);
    if (!product) {
      if (enforceAvailability) throw new Error('Связанный товар не найден в локальном каталоге');
      writeLocalJson(STORAGE_KEYS.SAVED_CALCULATIONS, updated);
      return;
    }
    const required = Math.max(0, next.quantity || 0);
    const available = product.stock_quantity || 0;
    if (available < required && enforceAvailability) {
      throw new Error(`На складе только ${available} шт. товара «${product.name}»`);
    }
    product.stock_quantity = Math.max(0, available - required);
  }
  writeLocalJson(STORAGE_KEYS.SAVED_CALCULATIONS, updated);
}

export async function saveOrder(order: Omit<Order, 'id'> & { id?: string }): Promise<Order> {
  const client = await getAuthenticatedSupabaseClient();
  const id = order.id || crypto.randomUUID();
  const cachedOrders = readLocalJson<Order[]>(STORAGE_KEYS.ORDERS, []);
  const previousOrder = cachedOrders.find(item => item.id === id);

  let order_number = order.order_number;
  const created_at = order.created_at || new Date().toISOString();

  if (client) {
    try {
      const payload = { ...order, id, created_at };
      const { data, error } = await client.rpc('save_order_with_inventory', { p_order: payload });
      if (error) throwDatabaseError('сохранение заказа', error);
      const saved = data as unknown as Order;
      applyLocalInventoryChange(previousOrder, saved, false);
      const updated = cachedOrders.filter(item => item.id !== id && item.id !== saved.id);
      updated.unshift(saved);
      writeLocalJson(STORAGE_KEYS.ORDERS, updated);
      removeSyncOperation('orders', saved.id);
      return saved;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  if (!order_number) {
    const maxNum = cachedOrders.reduce((max, item) => Math.max(max, item.order_number || 0), 1000);
    order_number = maxNum + 1;
  }
  const newOrder = { ...order, id, created_at, order_number } as Order;
  applyLocalInventoryChange(previousOrder, newOrder);
  const updated = cachedOrders.map(item => item.id === id ? newOrder : item);
  if (!cachedOrders.some(item => item.id === id)) updated.unshift(newOrder);
  writeLocalJson(STORAGE_KEYS.ORDERS, updated);
  enqueueSyncOperation({ entity: 'orders', action: 'upsert', id, payload: newOrder as unknown as Record<string, unknown> });
  return newOrder;
}

export async function deleteOrder(id: string): Promise<boolean> {
  return deleteOrders([id]);
}

export async function deleteOrders(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const cloudIds = ids.filter(isUuid);
  const client = await getAuthenticatedSupabaseClient();
  const cached = readLocalJson<Order[]>(STORAGE_KEYS.ORDERS, []);
  const deletedOrders = cached.filter(order => ids.includes(order.id));

  if (client && cloudIds.length > 0) {
    try {
      const { error } = await client.rpc('delete_orders_atomic', { p_ids: cloudIds });
      if (error) throwDatabaseError('удаление заказов', error);
      for (const order of deletedOrders) applyLocalInventoryChange(order, undefined, false);
      writeLocalJson(STORAGE_KEYS.ORDERS, cached.filter(order => !ids.includes(order.id)));
      for (const id of ids) removeSyncOperation('orders', id);
      return true;
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
    }
  }

  for (const order of deletedOrders) applyLocalInventoryChange(order, undefined);
  writeLocalJson(STORAGE_KEYS.ORDERS, cached.filter(order => !ids.includes(order.id)));
  for (const id of cloudIds) enqueueSyncOperation({ entity: 'orders', action: 'delete', id });
  return true;
}

// ==========================================
// DATABASE CLEANUP & RANDOM SEED API
// ==========================================

/**
 * Полностью удаляет все данные из всех таблиц (orders, saved_calculations, settings, filaments, printers)
 * как в Supabase (если подключен и авторизован), так и в LocalStorage.
 */
type DatabaseClient = {
  from: (table: string) => any;
  rpc?: (functionName: string, args?: Record<string, unknown>) => Promise<{ error?: unknown } | null | undefined>;
  auth?: { getUser?: () => Promise<{ data?: { user?: { id: string } | null }; error?: unknown }> };
};

function requireSupabaseSuccess(operation: string, response: { error?: unknown } | null | undefined): void {
  if (response?.error) throwDatabaseError(operation, response.error);
}

async function applyAtomicCloudSnapshot(
  client: DatabaseClient,
  snapshot: Record<string, unknown>,
  operation: string,
): Promise<void> {
  if (!client.rpc) {
    throw new DatabaseOperationError(`${operation}: отсутствует RPC restore_database_snapshot`);
  }
  const response = await client.rpc('restore_database_snapshot', { p_snapshot: snapshot });
  if ((response?.error as { code?: string } | undefined)?.code === 'PGRST202') {
    throw new Error('Облачное восстановление требует обновления базы. Данные и локальный кэш сохранены.');
  }
  requireSupabaseSuccess(operation, response);
}

function clearLocalDatabaseTables(): void {
  if (typeof window === 'undefined') return;
  writeLocalJson(STORAGE_KEYS.FILAMENTS, []);
  writeLocalJson(STORAGE_KEYS.PRINTERS, []);
  writeLocalJson(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  writeLocalJson(STORAGE_KEYS.SAVED_CALCULATIONS, []);
  writeLocalJson(STORAGE_KEYS.ORDERS, []);
  writeLocalJson(STORAGE_KEYS.COLLECTIONS, []);
  writeLocalJson(STORAGE_KEYS.MONTHLY_GOALS, DEFAULT_MONTHLY_GOALS_CONFIG);
  writeLocalJson(STORAGE_KEYS.SYNC_QUEUE, []);
}

/** Clears cloud tables first, then makes local caches and the sync queue empty. */
export async function clearAllDatabaseTablesWithClient(client: DatabaseClient | null): Promise<void> {
  if (client) {
    await applyAtomicCloudSnapshot(client, {
      monthly_goals: [],
      orders: [],
      saved_calculations: [],
      collections: [],
      settings: [],
      filaments: [],
      printers: [],
    }, 'атомарная очистка базы');
  }
  clearLocalDatabaseTables();
}

export async function clearAllDatabaseTables(): Promise<void> {
  await clearAllDatabaseTablesWithClient(await getAuthenticatedSupabaseClient());
}

/**
 * Очищает все таблицы и заполняет базу случайно сгенерированными реалистичными данными.
 */
function writeSeedToLocalStorage(seedData: SeedDataResult): void {
  if (typeof window === 'undefined') return;
  writeLocalJson(STORAGE_KEYS.PRINTERS, seedData.printers);
  writeLocalJson(STORAGE_KEYS.FILAMENTS, seedData.filaments);
  writeLocalJson(STORAGE_KEYS.SETTINGS, seedData.settings);
  writeLocalJson(STORAGE_KEYS.SAVED_CALCULATIONS, seedData.savedCalculations.map(withoutStlPayload));
  writeLocalJson(STORAGE_KEYS.ORDERS, seedData.orders);
  writeLocalJson(STORAGE_KEYS.COLLECTIONS, seedData.collections || []);
  writeLocalJson(STORAGE_KEYS.MONTHLY_GOALS, DEFAULT_MONTHLY_GOALS_CONFIG);
  writeLocalJson(STORAGE_KEYS.SYNC_QUEUE, []);
}

/** Restores generated data without changing local caches until every cloud write has succeeded. */
export async function resetAndSeedDatabaseWithClient(seedData: SeedDataResult, client: DatabaseClient | null): Promise<SeedDataResult> {
  if (client) {
    await applyAtomicCloudSnapshot(client, {
      printers: seedData.printers.map(item => toPrinterRow(item)),
      filaments: seedData.filaments.map(item => toFilamentRow(item)),
      settings: [toSettingsRow(seedData.settings)],
      collections: (seedData.collections || []).map(item => toCollectionRow(item)),
      saved_calculations: seedData.savedCalculations.map(item => toSavedCalculationRow(item)),
      orders: seedData.orders.map(item => toOrderRow(item)),
      monthly_goals: [],
    }, 'атомарная очистка и заполнение базы');
  }
  writeSeedToLocalStorage(seedData);
  return seedData;
}

export async function resetAndSeedDatabase(customSeed?: SeedDataResult): Promise<SeedDataResult> {
  const seedData = customSeed || generateRandomSeedData();
  return resetAndSeedDatabaseWithClient(seedData, await getAuthenticatedSupabaseClient());
}

export const clearAllData = clearAllDatabaseTables;
export const seedRandomData = resetAndSeedDatabase;

// ==========================================
// MONTHLY GOALS API
// ==========================================

export type GoalTargetType = 'profit' | 'income';

export interface MonthlyGoalsConfig {
  defaultGoal: number;
  targetType: GoalTargetType;
  monthlyGoals: Record<string, number>;
}

export const DEFAULT_MONTHLY_GOALS_CONFIG: MonthlyGoalsConfig = {
  defaultGoal: 0,
  targetType: 'profit',
  monthlyGoals: {},
};

export async function getMonthlyGoalsConfig(): Promise<MonthlyGoalsConfig> {
  const client = await getAuthenticatedSupabaseClient();
  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('monthly_goals')
        .select('*');

      if (!error && data) {
        let defaultGoal = 0;
        const monthlyGoals: Record<string, number> = {};

        data.forEach((row: any) => {
          const amt = Number(row.target_amount) || 0;
          if (row.month_key === 'default') {
            defaultGoal = amt;
          } else if (row.month_key) {
            monthlyGoals[row.month_key] = amt;
          }
        });

        const config: MonthlyGoalsConfig = {
          defaultGoal,
          targetType: 'profit',
          monthlyGoals,
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.MONTHLY_GOALS, JSON.stringify(config));
        }
        return config;
      }
      console.warn('Ошибка получения целей из Supabase, используем кэш:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase при получении целей:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MONTHLY_GOALS);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          defaultGoal: typeof parsed.defaultGoal === 'number' && parsed.defaultGoal >= 0 ? parsed.defaultGoal : 0,
          targetType: 'profit',
          monthlyGoals: parsed.monthlyGoals && typeof parsed.monthlyGoals === 'object' ? parsed.monthlyGoals : {},
        };
      }
    } catch (err) {
      console.error('Ошибка чтения целей из localStorage:', err);
    }
  }
  return DEFAULT_MONTHLY_GOALS_CONFIG;
}

export function getCachedMonthlyGoalsConfig(): MonthlyGoalsConfig {
  if (typeof window === 'undefined') return DEFAULT_MONTHLY_GOALS_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MONTHLY_GOALS);
    if (!raw) return DEFAULT_MONTHLY_GOALS_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      defaultGoal: typeof parsed.defaultGoal === 'number' && parsed.defaultGoal >= 0 ? parsed.defaultGoal : 0,
      targetType: 'profit',
      monthlyGoals: parsed.monthlyGoals && typeof parsed.monthlyGoals === 'object' ? parsed.monthlyGoals : {},
    };
  } catch {
    return DEFAULT_MONTHLY_GOALS_CONFIG;
  }
}

export async function saveMonthlyGoal(monthKey: string, targetAmount: number): Promise<void> {
  const cleanAmount = Math.max(0, Number(targetAmount) || 0);
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { error } = await (client as any)
        .from('monthly_goals')
        .upsert(
          {
            month_key: monthKey,
            target_amount: cleanAmount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,month_key' }
        );
      if (error) throwDatabaseError('сохранение месячной цели', error);
      removeSyncOperation('monthly_goals', monthKey);
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
      enqueueSyncOperation({
        entity: 'monthly_goals',
        action: 'upsert',
        id: monthKey,
        payload: { month_key: monthKey, target_amount: cleanAmount, updated_at: new Date().toISOString() },
      });
    }
  } else {
    enqueueSyncOperation({
      entity: 'monthly_goals',
      action: 'upsert',
      id: monthKey,
      payload: { month_key: monthKey, target_amount: cleanAmount, updated_at: new Date().toISOString() },
    });
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MONTHLY_GOALS);
      const current = raw ? JSON.parse(raw) : { defaultGoal: 0, targetType: 'profit', monthlyGoals: {} };
      if (monthKey === 'default') {
        current.defaultGoal = cleanAmount;
      } else {
        current.monthlyGoals = current.monthlyGoals || {};
        current.monthlyGoals[monthKey] = cleanAmount;
      }
      localStorage.setItem(STORAGE_KEYS.MONTHLY_GOALS, JSON.stringify(current));
      window.dispatchEvent(new Event('monthly_goals_updated'));
    } catch (err) {
      console.error('Ошибка сохранения цели в localStorage:', err);
    }
  }
}

export async function saveMonthlyGoalsConfig(config: MonthlyGoalsConfig): Promise<void> {
  const client = await getAuthenticatedSupabaseClient();
  const rows = [
    { month_key: 'default', target_amount: config.defaultGoal, updated_at: new Date().toISOString() },
    ...Object.entries(config.monthlyGoals || {}).map(([monthKey, amount]) => ({
      month_key: monthKey,
      target_amount: amount,
      updated_at: new Date().toISOString(),
    })),
  ];

  if (client) {
    try {
      const { error } = await (client as any)
        .from('monthly_goals')
        .upsert(rows, { onConflict: 'user_id,month_key' });
      if (error) throwDatabaseError('сохранение конфигурации целей', error);
      rows.forEach(row => removeSyncOperation('monthly_goals', row.month_key));
    } catch (error) {
      if (!isOfflineFailure(error)) throw error;
      rows.forEach(row => enqueueSyncOperation({
        entity: 'monthly_goals',
        action: 'upsert',
        id: row.month_key,
        payload: row,
      }));
    }
  } else {
    rows.forEach(row => enqueueSyncOperation({ entity: 'monthly_goals', action: 'upsert', id: row.month_key, payload: row }));
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.MONTHLY_GOALS, JSON.stringify(config));
      window.dispatchEvent(new Event('monthly_goals_updated'));
    } catch (err) {
      console.error('Ошибка сохранения целей в localStorage:', err);
    }
  }
}

function toMonthlyGoalRows(config: MonthlyGoalsConfig) {
  const updatedAt = new Date().toISOString();
  return [
    { month_key: 'default', target_amount: config.defaultGoal, updated_at: updatedAt },
    ...Object.entries(config.monthlyGoals).map(([monthKey, amount]) => ({
      month_key: monthKey,
      target_amount: amount,
      updated_at: updatedAt,
    })),
  ];
}

function toFilamentRow(item: Filament, userId?: string): Record<string, unknown> {
  return {
    id: item.id,
    ...(userId ? { user_id: userId } : {}),
    ...(item.created_at ? { created_at: item.created_at } : {}),
    name: item.name,
    weight_g: item.weight_g,
    price: item.price,
    ...(item.color !== undefined ? { color: item.color } : {}),
  };
}

function toPrinterRow(item: Printer, userId?: string): Record<string, unknown> {
  return {
    id: item.id,
    ...(userId ? { user_id: userId } : {}),
    ...(item.created_at ? { created_at: item.created_at } : {}),
    name: item.name,
    power_w: item.power_w,
    price: item.price,
    lifespan_hours: item.lifespan_hours,
    ...(item.color !== undefined ? { color: item.color } : {}),
  };
}

function toSettingsRow(settings: Settings, userId?: string): Record<string, unknown> {
  return {
    ...(userId ? { user_id: userId } : {}),
    ...(settings.updated_at ? { updated_at: settings.updated_at } : {}),
    currency: settings.currency,
    electricity_rate: settings.electricity_rate,
    default_printer_id: settings.default_printer_id,
    labor_rate_per_hour: settings.labor_rate_per_hour,
    labor_time_minutes: settings.labor_time_minutes,
    ...(settings.is_owner_labor_default !== undefined ? { is_owner_labor_default: settings.is_owner_labor_default } : {}),
    ...(settings.is_labor_per_unit_default !== undefined ? { is_labor_per_unit_default: settings.is_labor_per_unit_default } : {}),
    ...(settings.min_order_price !== undefined ? { min_order_price: settings.min_order_price } : {}),
    ...(settings.enable_material_difficulty !== undefined ? { enable_material_difficulty: settings.enable_material_difficulty } : {}),
    ...(settings.material_multipliers !== undefined ? { material_multipliers: settings.material_multipliers } : {}),
    default_markup_percent: settings.default_markup_percent,
    default_defect_percent: settings.default_defect_percent,
    ...(settings.default_urgency_percent !== undefined ? { default_urgency_percent: settings.default_urgency_percent } : {}),
  };
}

function toCollectionRow(item: ProductCollection, userId?: string): Record<string, unknown> {
  return {
    id: item.id,
    ...(userId ? { user_id: userId } : {}),
    ...(item.created_at ? { created_at: item.created_at } : {}),
    name: item.name,
    ...(item.category !== undefined ? { category: item.category } : {}),
    ...(item.tags !== undefined ? { tags: item.tags } : {}),
    ...(item.description !== undefined ? { description: item.description } : {}),
    ...(item.color !== undefined ? { color: item.color } : {}),
  };
}

function toSavedCalculationRow(item: SavedCalculation, userId?: string): Record<string, unknown> {
  const columns = [
    'id', 'created_at', 'name', 'type', 'filament_name', 'filament_color', 'printer_name',
    'weight_g', 'hours', 'minutes', 'quantity', 'base_cost', 'final_price', 'filament_id',
    'printer_id', 'labor_minutes', 'labor_rate_per_hour', 'is_owner_labor', 'is_labor_per_unit',
    'markup_percent', 'defect_percent', 'collection_id', 'collection_name', 'assembly_parts',
    'assembly_hardware', 'assembly_electronics', 'assembly_labor_minutes', 'assembly_labor_cost', 'custom_cost_items',
    'discount_percent', 'discount_amount', 'urgency_percent', 'urgency_amount', 'category', 'tags',
    'stock_quantity', 'stl_url', 'stl_file_name', 'stl_file_data',
  ] as const;
  const row = Object.fromEntries(columns.filter(column => item[column] !== undefined).map(column => [column, item[column]]));
  if (userId) row.user_id = userId;
  return row;
}

function toOrderRow(item: Order, userId?: string): Record<string, unknown> {
  const columns = [
    'id', 'created_at', 'order_number', 'date', 'type', 'title', 'quantity', 'base_amount',
    'urgency_type', 'urgency_percent', 'urgency_amount', 'discount_type', 'discount_percent',
    'discount_amount', 'amount', 'cost', 'cost_items', 'payments', 'payment', 'client', 'client_name',
    'contact', 'contacts', 'deadline', 'status', 'notes', 'product_id',
  ] as const;
  const row = Object.fromEntries(columns.filter(column => item[column] !== undefined).map(column => [column, item[column]]));
  if (userId) row.user_id = userId;
  return row;
}

function toMonthlyGoalRowsForUser(config: MonthlyGoalsConfig, userId?: string): Record<string, unknown>[] {
  return toMonthlyGoalRows(config).map(row => userId ? { ...row, user_id: userId } : row);
}

async function restoreCloudDatabaseSnapshot(client: DatabaseClient, snapshot: ParsedDataBackup): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (snapshot.filaments !== undefined) payload.filaments = snapshot.filaments.map(item => toFilamentRow(item));
  if (snapshot.printers !== undefined) payload.printers = snapshot.printers.map(item => toPrinterRow(item));
  if (snapshot.settings !== undefined) payload.settings = snapshot.settings === null ? [] : [toSettingsRow(snapshot.settings)];
  if (snapshot.collections !== undefined) payload.collections = snapshot.collections.map(item => toCollectionRow(item));
  if (snapshot.savedCalculations !== undefined) {
    payload.saved_calculations = snapshot.savedCalculations.map(item => toSavedCalculationRow(item));
  }
  if (snapshot.orders !== undefined) payload.orders = snapshot.orders.map(item => toOrderRow(item));
  if (snapshot.monthlyGoals !== undefined) payload.monthly_goals = toMonthlyGoalRowsForUser(snapshot.monthlyGoals);
  await applyAtomicCloudSnapshot(client, payload, 'атомарное восстановление снимка базы');
}

function writeRestoredSnapshotToLocalStorage(snapshot: ParsedDataBackup): void {
  if (typeof window === 'undefined') return;
  if (snapshot.filaments !== undefined) writeLocalJson(STORAGE_KEYS.FILAMENTS, snapshot.filaments);
  if (snapshot.printers !== undefined) writeLocalJson(STORAGE_KEYS.PRINTERS, snapshot.printers);
  if (snapshot.settings !== undefined) writeLocalJson(STORAGE_KEYS.SETTINGS, snapshot.settings);
  if (snapshot.savedCalculations !== undefined) writeLocalJson(STORAGE_KEYS.SAVED_CALCULATIONS, snapshot.savedCalculations.map(withoutStlPayload));
  if (snapshot.collections !== undefined) writeLocalJson(STORAGE_KEYS.COLLECTIONS, snapshot.collections);
  // V1 did not contain orders or monthly goals: their absence preserves existing data.
  if (snapshot.orders !== undefined) writeLocalJson(STORAGE_KEYS.ORDERS, snapshot.orders);
  if (snapshot.monthlyGoals !== undefined) writeLocalJson(STORAGE_KEYS.MONTHLY_GOALS, snapshot.monthlyGoals);
  writeLocalJson(STORAGE_KEYS.SYNC_QUEUE, []);
}

/** Validates the complete backup before touching cloud or local storage. */
export async function restoreDatabaseSnapshotWithClient(input: unknown, client: DatabaseClient | null): Promise<ParsedDataBackup> {
  const snapshot = parseDataBackup(input);
  if (client) await restoreCloudDatabaseSnapshot(client, snapshot);
  writeRestoredSnapshotToLocalStorage(snapshot);
  return snapshot;
}

export async function restoreDatabaseSnapshot(snapshot: unknown): Promise<void> {
  await restoreDatabaseSnapshotWithClient(snapshot, await getAuthenticatedSupabaseClient());
}

// ==========================================
// OFFLINE-TO-ONLINE AUTO SYNCHRONIZATION API
// ==========================================

export interface SyncDataResult {
  settings: Settings;
  filaments: Filament[];
  printers: Printer[];
  savedCalculations: SavedCalculation[];
  collections: ProductCollection[];
  orders: Order[];
  goals: MonthlyGoalsConfig;
}

/**
 * Автоматическая фоновая синхронизация данных из локального хранилища в облако.
 * Вызывается при восстановлении интернет-соединения.
 */
export async function syncLocalStorageToSupabase(): Promise<SyncDataResult | null> {
  const client = await getAuthenticatedSupabaseClient();
  if (!client || typeof window === 'undefined') return null;

  try {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) throwDatabaseError('авторизация синхронизации', authError);

    // Реплицируем только реальные локальные изменения. Снимки кэша не отправляются
    // целиком, поэтому устаревший браузер не может затереть свежие облачные данные.
    const queue = readLocalJson<SyncOperation[]>(STORAGE_KEYS.SYNC_QUEUE, []);
    for (const operation of queue) {
      let error: unknown = null;

      if (operation.entity === 'orders') {
        if (operation.action === 'delete') {
          if (isUuid(operation.id)) {
            ({ error } = await client.rpc('delete_orders_atomic', { p_ids: [operation.id] }));
          }
        } else if (operation.payload) {
          ({ error } = await client.rpc('save_order_with_inventory', { p_order: operation.payload }));
        }
      } else if (operation.entity === 'settings') {
        if (operation.action === 'upsert' && operation.payload) {
          ({ error } = await (client as any).from('settings').upsert(
            { ...operation.payload, user_id: authData.user.id, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          ));
        }
      } else if (operation.action === 'delete') {
        ({ error } = await (client as any).from(operation.entity).delete().eq('id', operation.id));
      } else if (operation.payload) {
        const query = (client as any).from(operation.entity);
        const options = operation.entity === 'monthly_goals'
          ? { onConflict: 'user_id,month_key' }
          : undefined;
        let res = await query.upsert(
          { ...operation.payload, user_id: authData.user.id },
          options
        );
        error = res.error;
        if (error && operation.entity === 'saved_calculations' && isMissingColumnError(error, 'assembly_electronics')) {
          console.warn('Колонка assembly_electronics отсутствует в Supabase при синхронизации очереди, синхронизируем без неё.');
          const { assembly_electronics, ...payloadWithoutElectronics } = operation.payload;
          const retryRes = await query.upsert(
            { ...payloadWithoutElectronics, user_id: authData.user.id },
            options
          );
          error = retryRes.error;
        }
      }

      if (error) throwDatabaseError(`синхронизация ${operation.entity}/${operation.action}`, error);
      removeSyncOperation(operation.entity, operation.id);
    }

    // После подтверждения журнала облако становится источником актуального снимка.
    const [cloudSettings, cloudFilaments, cloudPrinters, cloudCalcs, cloudCollections, cloudOrders, cloudGoals] = await Promise.all([
      getSettings(),
      getFilaments(),
      getPrinters(),
      getSavedCalculations(),
      getCollections(),
      getOrders(),
      getMonthlyGoalsConfig(),
    ]);

    return {
      settings: cloudSettings,
      filaments: cloudFilaments,
      printers: cloudPrinters,
      savedCalculations: cloudCalcs,
      collections: cloudCollections,
      orders: cloudOrders,
      goals: cloudGoals,
    };
  } catch (err) {
    console.error('Ошибка в syncLocalStorageToSupabase:', err);
    return null;
  }
}
