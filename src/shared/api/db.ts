import { createClient } from '@supabase/supabase-js';
import { Filament, Printer, Settings, SupabaseConfig, SavedCalculation, Order } from '../types';

const STORAGE_KEYS = {
  FILAMENTS: '3d_calc_filaments',
  PRINTERS: '3d_calc_printers',
  SETTINGS: '3d_calc_settings',
  SUPABASE_CONFIG: '3d_calc_supabase_config',
  SAVED_CALCULATIONS: '3d_calc_saved_calculations',
  ORDERS: '3d_calc_orders',
};

const DEFAULT_SETTINGS: Settings = {
  currency: '₽',
  electricity_rate: 4.89,
  default_printer_id: null,
  labor_rate_per_hour: 0,
  labor_time_minutes: 15,
  default_markup_percent: 100,
  default_defect_percent: 5,
};

const DEFAULT_PRINTERS: Printer[] = [];
const DEFAULT_FILAMENTS: Filament[] = [];
const DEFAULT_SAVED_CALCULATIONS: SavedCalculation[] = [];
const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord-1',
    order_number: 1001,
    date: '10.10',
    type: 'income',
    title: 'Котлы Колонки - 2 статуэтки',
    amount: 5000,
    cost: 1500,
    payments: [2500, 2500, 200],
    payment: 5200,
    client: 'Авито',
    contacts: [{ type: 'phone', value: '79188798043' }],
    contact: '79188798043',
    deadline: '10.10',
    status: 'Готово',
    notes: '',
  },
  {
    id: 'ord-2',
    order_number: 1002,
    date: '12.10',
    type: 'income',
    title: '2 фигурки по фото с покраской',
    amount: 21000,
    cost: 500,
    payments: [10500],
    payment: 10500,
    client: 'Авито',
    contacts: [{ type: 'phone', value: '79064755254' }],
    contact: '79064755254',
    deadline: '',
    status: 'Ждет покраски',
    notes: 'Не забрали фигурки',
  },
  {
    id: 'ord-3',
    order_number: 1003,
    date: '13.10',
    type: 'income',
    title: 'Китаец',
    amount: 2500,
    cost: 200,
    payments: [2500],
    payment: 2500,
    client: 'Авито',
    contacts: [{ type: 'telegram', value: '@Elephant_freedom' }],
    contact: '@Elephant_freedom',
    deadline: '',
    status: 'Готово',
    notes: '',
  },
  {
    id: 'ord-4',
    order_number: 1004,
    date: '13.10',
    type: 'income',
    title: 'Девушка на стуле по фото с покраской',
    amount: 12000,
    cost: 5000,
    payments: [6000, 6000],
    payment: 12000,
    client: 'Авито',
    contacts: [],
    contact: '',
    deadline: '',
    status: 'Готово',
    notes: '',
  },
  {
    id: 'ord-5',
    order_number: 1005,
    date: '14.10',
    type: 'income',
    title: 'Девушка у пруда по фото с покраской',
    amount: 13000,
    cost: 5000,
    payments: [6500, 6500],
    payment: 13000,
    client: 'Авито',
    contacts: [],
    contact: '',
    deadline: '',
    status: 'Готово',
    notes: '',
  },
  {
    id: 'ord-6',
    order_number: 1006,
    date: '20.10',
    type: 'income',
    title: 'Девушка сидит',
    amount: 2500,
    cost: 1100,
    payments: [1250, 1250],
    payment: 2500,
    client: 'Авито',
    contacts: [],
    contact: '',
    deadline: '',
    status: 'Готово',
    notes: '',
  },
  {
    id: 'ord-7',
    order_number: 1007,
    date: '11.10',
    type: 'expense',
    title: 'Авито',
    amount: 367,
    cost: 0,
    payments: [367],
    payment: 367,
    client: 'Авито',
    contacts: [],
    contact: '',
    deadline: '',
    status: 'Готово',
    notes: '',
  },
  {
    id: 'ord-8',
    order_number: 1008,
    date: '11.10',
    type: 'expense',
    title: 'Авито',
    amount: 367,
    cost: 0,
    payments: [367],
    payment: 367,
    client: 'Авито',
    contacts: [],
    contact: '',
    deadline: '',
    status: 'Готово',
    notes: '',
  },
  {
    id: 'ord-9',
    order_number: 1009,
    date: '12.10',
    type: 'expense',
    title: 'Авито',
    amount: 94,
    cost: 0,
    payments: [94],
    payment: 94,
    client: 'Авито',
    contacts: [],
    contact: '',
    deadline: '',
    status: 'Готово',
    notes: '',
  },
  {
    id: 'ord-10',
    order_number: 1010,
    date: '12.10',
    type: 'expense',
    title: 'Авито',
    amount: 94,
    cost: 0,
    payments: [94],
    payment: 94,
    client: 'Авито',
    contacts: [],
    contact: '',
    deadline: '',
    status: 'Готово',
    notes: '',
  },
];

// Функция для безопасного получения ключей Supabase
export function getSupabaseConfig(): SupabaseConfig | null {
  if (typeof window === 'undefined') return null;

  // 1. Проверяем переменные окружения Next.js
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (envUrl && envKey && envUrl !== 'your-project-url' && envKey !== 'your-anon-key') {
    return { url: envUrl, anonKey: envKey };
  }

  // 2. Проверяем localStorage (вручную введенные пользователем ключи)
  const localConfig = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
  if (localConfig) {
    try {
      const parsed = JSON.parse(localConfig);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    } catch {
      // Игнорируем ошибки парсинга
    }
  }

  return null;
}

// Инициализация клиента Supabase
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const config = getSupabaseConfig();
  if (!config) return null;

  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    });
    return supabaseInstance;
  } catch (error) {
    console.error('Ошибка инициализации Supabase клиента:', error);
    return null;
  }
}

// Проверка доступности Supabase
export async function checkSupabaseConnection(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    // Делаем легкий запрос к таблице настроек
    const { error } = await (client as any).from('settings').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// FILAMENTS API
// ==========================================

export async function getFilaments(): Promise<Filament[]> {
  // Принудительно очищаем демонстрационные тестовые данные при обновлении на чистую версию
  if (typeof window !== 'undefined' && !localStorage.getItem('3d_calc_data_cleaned_mock_30')) {
    localStorage.setItem(STORAGE_KEYS.FILAMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify([]));
    localStorage.setItem('3d_calc_data_cleaned_mock_30', 'true');
    // Удаляем старый seed флаг
    localStorage.removeItem('3d_calc_data_seeded_30');
  }

  const client = getSupabaseClient();
  
  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('filaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Синхронизируем локальный кэш
        localStorage.setItem(STORAGE_KEYS.FILAMENTS, JSON.stringify(data));
        return data as Filament[];
      }
      console.warn('Ошибка получения филаментов из Supabase, используем кэш:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  // Fallback на LocalStorage
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.FILAMENTS);
    if (local) {
      return JSON.parse(local);
    }
    localStorage.setItem(STORAGE_KEYS.FILAMENTS, JSON.stringify(DEFAULT_FILAMENTS));
    return DEFAULT_FILAMENTS;
  }
  return [];
}

export async function saveFilament(filament: Omit<Filament, 'id'> & { id?: string }): Promise<Filament> {
  const client = getSupabaseClient();
  const id = filament.id || crypto.randomUUID();
  const newFilament = { ...filament, id };

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('filaments')
        .upsert(newFilament)
        .select()
        .single();

      if (!error && data) {
        // Обновляем локальный кэш
        const filaments = await getFilaments();
        const updated = filaments.map(f => f.id === id ? (data as Filament) : f);
        if (!filaments.some(f => f.id === id)) updated.unshift(data as Filament);
        localStorage.setItem(STORAGE_KEYS.FILAMENTS, JSON.stringify(updated));
        return data as Filament;
      }
      console.warn('Ошибка сохранения филамента в Supabase, сохраняем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  // Fallback на LocalStorage
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.FILAMENTS);
    const filaments: Filament[] = local ? JSON.parse(local) : [];
    const index = filaments.findIndex(f => f.id === id);
    
    if (index >= 0) {
      filaments[index] = newFilament as Filament;
    } else {
      filaments.unshift(newFilament as Filament);
    }
    
    localStorage.setItem(STORAGE_KEYS.FILAMENTS, JSON.stringify(filaments));
  }
  
  return newFilament as Filament;
}

export async function deleteFilament(id: string): Promise<void> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { error } = await (client as any).from('filaments').delete().eq('id', id);
      if (!error) {
        const local = localStorage.getItem(STORAGE_KEYS.FILAMENTS);
        if (local) {
          const filaments: Filament[] = JSON.parse(local);
          const filtered = filaments.filter(f => f.id !== id);
          localStorage.setItem(STORAGE_KEYS.FILAMENTS, JSON.stringify(filtered));
        }
        return;
      }
      console.warn('Ошибка удаления филамента из Supabase, удаляем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  // Fallback на LocalStorage
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.FILAMENTS);
    if (local) {
      const filaments: Filament[] = JSON.parse(local);
      const filtered = filaments.filter(f => f.id !== id);
      localStorage.setItem(STORAGE_KEYS.FILAMENTS, JSON.stringify(filtered));
    }
  }
}

// ==========================================
// PRINTERS API
// ==========================================

export async function getPrinters(): Promise<Printer[]> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('printers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(data));
        return data as Printer[];
      }
      console.warn('Ошибка получения принтеров из Supabase, используем кэш:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.PRINTERS);
    if (local) {
      return JSON.parse(local);
    }
    localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(DEFAULT_PRINTERS));
    return DEFAULT_PRINTERS;
  }
  return [];
}

export async function savePrinter(printer: Omit<Printer, 'id'> & { id?: string }): Promise<Printer> {
  const client = getSupabaseClient();
  const id = printer.id || crypto.randomUUID();
  const newPrinter = { ...printer, id };

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('printers')
        .upsert(newPrinter)
        .select()
        .single();

      if (!error && data) {
        const printers = await getPrinters();
        const updated = printers.map(p => p.id === id ? (data as Printer) : p);
        if (!printers.some(p => p.id === id)) updated.unshift(data as Printer);
        localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(updated));
        return data as Printer;
      }
      console.warn('Ошибка сохранения принтера в Supabase, сохраняем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.PRINTERS);
    const printers: Printer[] = local ? JSON.parse(local) : [];
    const index = printers.findIndex(p => p.id === id);

    if (index >= 0) {
      printers[index] = newPrinter as Printer;
    } else {
      printers.unshift(newPrinter as Printer);
    }

    localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(printers));
  }

  return newPrinter as Printer;
}

export async function deletePrinter(id: string): Promise<void> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { error } = await (client as any).from('printers').delete().eq('id', id);
      if (!error) {
        const local = localStorage.getItem(STORAGE_KEYS.PRINTERS);
        if (local) {
          const printers: Printer[] = JSON.parse(local);
          const filtered = printers.filter(p => p.id !== id);
          localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(filtered));
        }
        return;
      }
      console.warn('Ошибка удаления принтера из Supabase, удаляем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.PRINTERS);
    if (local) {
      const printers: Printer[] = JSON.parse(local);
      const filtered = printers.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(filtered));
    }
  }
}

// ==========================================
// SETTINGS API
// ==========================================

export async function getSettings(): Promise<Settings> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('settings')
        .select('*')
        .limit(1);

      if (!error && data && data.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data[0]));
        return data[0] as Settings;
      }
      
      // Если таблицы настроек нет или она пуста в Supabase
      if (!error && (!data || data.length === 0)) {
        // Создаем дефолтные настройки
        const created = await saveSettings(DEFAULT_SETTINGS);
        return created;
      }
      console.warn('Ошибка получения настроек из Supabase, используем кэш:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (local) {
      return JSON.parse(local);
    }
    // Если в LocalStorage тоже пусто, сохраняем дефолт
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const client = getSupabaseClient();

  if (client) {
    try {
      // Ищем ID настроек в LocalStorage, чтобы обновить ту же строку
      const local = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      let id = settings.id;
      if (!id && local) {
        try {
          id = JSON.parse(local).id;
        } catch {
          // Игнорируем
        }
      }

      const settingsToSave = { ...settings, updated_at: new Date().toISOString() };
      if (id) settingsToSave.id = id;

      const { data, error } = await (client as any)
        .from('settings')
        .upsert(settingsToSave)
        .select()
        .single();

      if (!error && data) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
        return data as Settings;
      }
      console.warn('Ошибка сохранения настроек в Supabase, сохраняем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
  return settings;
}

// Сохранение кастомных ключей Supabase от пользователя
export function saveSupabaseConfig(config: SupabaseConfig | null): void {
  if (typeof window === 'undefined') return;

  if (config) {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
  } else {
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_CONFIG);
  }
  // Сбрасываем инстанс для переинициализации
  supabaseInstance = null;
}

// ==========================================
// SAVED CALCULATIONS (FAVORITES) API
// ==========================================

export async function getSavedCalculations(): Promise<SavedCalculation[]> {
  const client = getSupabaseClient();
  
  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('saved_calculations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const safeData = (data as SavedCalculation[]).map(({ stl_file_data, ...rest }) => rest);
        try {
          localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify(safeData));
        } catch (e) {
          console.warn('localStorage setItem limit warning:', e);
        }
        return data as SavedCalculation[];
      }
      console.warn('Ошибка получения расчетов из Supabase, используем кэш:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.SAVED_CALCULATIONS);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error('Ошибка чтения localStorage:', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify(DEFAULT_SAVED_CALCULATIONS));
    return DEFAULT_SAVED_CALCULATIONS;
  }
  return [];
}

export async function addSavedCalculation(
  calc: Omit<SavedCalculation, 'id' | 'created_at'>
): Promise<SavedCalculation> {
  const client = getSupabaseClient();
  const id = typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
  const newCalc: SavedCalculation = {
    ...calc,
    id,
    created_at: new Date().toISOString(),
  };

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('saved_calculations')
        .insert(newCalc)
        .select()
        .single();

      if (!error && data) {
        const localList = await getSavedCalculations();
        const updatedList = [data as SavedCalculation, ...localList.filter(item => item.id !== data.id)];
        const safeList = updatedList.map(({ stl_file_data, ...rest }) => rest);
        try {
          localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify(safeList));
        } catch (e) {
          console.warn('localStorage warning:', e);
        }
        return data as SavedCalculation;
      }
      console.warn('Ошибка сохранения расчета в Supabase, сохраняем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const localList = await getSavedCalculations();
    const updatedList = [newCalc, ...localList];
    const safeList = updatedList.map(({ stl_file_data, ...rest }) => rest);
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify(safeList));
    } catch (e) {
      console.warn('localStorage warning:', e);
    }
  }
  return newCalc;
}

export async function updateSavedCalculation(
  calc: SavedCalculation
): Promise<SavedCalculation> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('saved_calculations')
        .upsert(calc)
        .select()
        .single();

      if (!error && data) {
        const localList = await getSavedCalculations();
        const updatedList = localList.map(item => item.id === calc.id ? (data as SavedCalculation) : item);
        const safeList = updatedList.map(({ stl_file_data, ...rest }) => rest);
        try {
          localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify(safeList));
        } catch (e) {
          console.warn('localStorage warning:', e);
        }
        return data as SavedCalculation;
      }
      console.warn('Ошибка обновления расчета в Supabase, сохраняем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const localList = await getSavedCalculations();
    const updatedList = localList.map(item => item.id === calc.id ? calc : item);
    const safeList = updatedList.map(({ stl_file_data, ...rest }) => rest);
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify(safeList));
    } catch (e) {
      console.warn('localStorage warning:', e);
    }
  }
  return calc;
}

export async function deleteSavedCalculation(id: string): Promise<boolean> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { error } = await (client as any)
        .from('saved_calculations')
        .delete()
        .eq('id', id);

      if (!error) {
        const localList = await getSavedCalculations();
        const filtered = localList.filter((item) => item.id !== id);
        const safeList = filtered.map(({ stl_file_data, ...rest }) => rest);
        try {
          localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify(safeList));
        } catch (e) {
          console.warn('localStorage warning:', e);
        }
        return true;
      }
      console.warn('Ошибка удаления расчета из Supabase, удаляем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const localList = await getSavedCalculations();
    const filtered = localList.filter((item) => item.id !== id);
    const safeList = filtered.map(({ stl_file_data, ...rest }) => rest);
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify(safeList));
    } catch (e) {
      console.warn('localStorage warning:', e);
    }
    return true;
  }
  return false;
}

export async function clearAllSavedCalculations(): Promise<boolean> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { error } = await (client as any)
        .from('saved_calculations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (!error) {
        localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify([]));
        return true;
      }
      console.warn('Ошибка очистки расчетов в Supabase, очищаем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify([]));
    return true;
  }
  return false;
}

// ==========================================
// ORDERS API
// ==========================================

export async function getOrders(): Promise<Order[]> {
  const client = getSupabaseClient();
  
  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data));
        return data as Order[];
      }
      console.warn('Ошибка получения заказов из Supabase, используем кэш:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (local) {
      return JSON.parse(local);
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(DEFAULT_ORDERS));
    return DEFAULT_ORDERS;
  }
  return DEFAULT_ORDERS;
}

export async function saveOrder(order: Omit<Order, 'id'> & { id?: string }): Promise<Order> {
  const client = getSupabaseClient();
  const id = order.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9));

  let order_number = order.order_number;
  if (!order_number) {
    const existingOrders = await getOrders();
    const maxNum = existingOrders.reduce((max, o) => Math.max(max, o.order_number || 0), 1000);
    order_number = maxNum + 1;
  }

  const newOrder: Order = { ...order, id, order_number } as Order;

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('orders')
        .upsert(newOrder)
        .select()
        .single();

      if (!error && data) {
        const orders = await getOrders();
        const updated = orders.map(o => o.id === id ? (data as Order) : o);
        if (!orders.some(o => o.id === id)) updated.unshift(data as Order);
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
        return data as Order;
      }
      console.warn('Ошибка сохранения заказа в Supabase, сохраняем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const orders: Order[] = local ? JSON.parse(local) : DEFAULT_ORDERS;
    const index = orders.findIndex(o => o.id === id);

    if (index >= 0) {
      orders[index] = newOrder;
    } else {
      orders.unshift(newOrder);
    }

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }

  return newOrder;
}

export async function deleteOrder(id: string): Promise<boolean> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { error } = await (client as any)
        .from('orders')
        .delete()
        .eq('id', id);

      if (!error) {
        const local = localStorage.getItem(STORAGE_KEYS.ORDERS);
        if (local) {
          const orders: Order[] = JSON.parse(local);
          const filtered = orders.filter(o => o.id !== id);
          localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(filtered));
        }
        return true;
      }
      console.warn('Ошибка удаления заказа из Supabase, удаляем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (local) {
      const orders: Order[] = JSON.parse(local);
      const filtered = orders.filter(o => o.id !== id);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(filtered));
    }
    return true;
  }
  return false;
}
