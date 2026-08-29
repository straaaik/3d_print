import { Filament, Printer, Settings, SavedCalculation, Order, ProductCollection } from '../types';
import { generateRandomSeedData, SeedDataResult } from '../lib/seedGenerator';
import { createClient } from '@/lib/supabase/client';

export const STORAGE_KEYS = {
  FILAMENTS: '3d_calc_filaments',
  PRINTERS: '3d_calc_printers',
  SETTINGS: '3d_calc_settings',
  SAVED_CALCULATIONS: '3d_calc_saved_calculations',
  ORDERS: '3d_calc_orders',
  COLLECTIONS: '3d_calc_collections',
  MONTHLY_GOALS: '3d_calc_monthly_goals',
};

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
const DEFAULT_ORDERS: Order[] = [
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
];
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
    const { data } = await client.auth.getSession();
    if (!data?.session?.user) {
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

      if (!error && data) {
        // Обновляем локальный кэш без повторного запроса к БД
        const local = localStorage.getItem(STORAGE_KEYS.FILAMENTS);
        const cached: Filament[] = local ? JSON.parse(local) : [];
        const updated = cached.map(f => f.id === id ? (data as Filament) : f);
        if (!cached.some(f => f.id === id)) updated.unshift(data as Filament);
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
  const client = await getAuthenticatedSupabaseClient();

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
  const client = await getAuthenticatedSupabaseClient();

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

      if (!error && data) {
        // Обновляем локальный кэш без повторного запроса к БД
        const local = localStorage.getItem(STORAGE_KEYS.PRINTERS);
        const cached: Printer[] = local ? JSON.parse(local) : [];
        const updated = cached.map(p => p.id === id ? (data as Printer) : p);
        if (!cached.some(p => p.id === id)) updated.unshift(data as Printer);
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
  const client = await getAuthenticatedSupabaseClient();

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
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { data, error } = await (client as any)
        .from('settings')
        .select('*')
        .limit(1);

      if (!error && data && data.length > 0) {
        const fullSettings: Settings = {
          ...DEFAULT_SETTINGS,
          ...data[0],
          material_multipliers: {
            ...DEFAULT_SETTINGS.material_multipliers,
            ...(data[0].material_multipliers || {}),
          },
        };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(fullSettings));
        return fullSettings;
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
      try {
        const parsed = JSON.parse(local);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          material_multipliers: {
            ...DEFAULT_SETTINGS.material_multipliers,
            ...(parsed.material_multipliers || {}),
          },
        };
      } catch {
        // Игнорируем
      }
    }
    // Если в LocalStorage тоже пусто, сохраняем дефолт
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const client = await getAuthenticatedSupabaseClient();

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
  const client = await getAuthenticatedSupabaseClient();
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
  const client = await getAuthenticatedSupabaseClient();

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
  const client = await getAuthenticatedSupabaseClient();

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
  const client = await getAuthenticatedSupabaseClient();

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

/**
 * Атомарно восстанавливает весь список сохранённых расчётов (для Undo).
 * Заменяет clearAll + addOne-by-one на единую операцию.
 */
export async function restoreAllSavedCalculations(calculations: SavedCalculation[]): Promise<void> {
  const client = await getAuthenticatedSupabaseClient();

  // Обновляем localStorage атомарно
  const safeList = calculations.map(({ stl_file_data, ...rest }) => rest);
  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify(safeList));
  } catch (e) {
    console.warn('localStorage warning:', e);
  }

  if (client) {
    try {
      // Удаляем всё и вставляем заново одной операцией
      await (client as any)
        .from('saved_calculations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (calculations.length > 0) {
        await (client as any)
          .from('saved_calculations')
          .insert(calculations);
      }
    } catch (e) {
      console.error('Ошибка восстановления расчётов в Supabase:', e);
    }
  }
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

      if (!error && data) {
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(data));
        return data as ProductCollection[];
      }
      console.warn('Ошибка получения коллекций из Supabase, используем кэш:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error('Ошибка чтения localStorage:', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(DEFAULT_COLLECTIONS));
    return DEFAULT_COLLECTIONS;
  }
  return [];
}

export async function saveCollection(
  col: Omit<ProductCollection, 'id' | 'created_at'> & { id?: string }
): Promise<ProductCollection> {
  const client = await getAuthenticatedSupabaseClient();
  const id = col.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9));
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

      if (!error && data) {
        const localList = await getCollections();
        const updatedList = [data as ProductCollection, ...localList.filter(item => item.id !== data.id)];
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(updatedList));
        return data as ProductCollection;
      }
      console.warn('Ошибка сохранения коллекции в Supabase, сохраняем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    const list: ProductCollection[] = local ? JSON.parse(local) : DEFAULT_COLLECTIONS;
    const index = list.findIndex(c => c.id === id);
    if (index >= 0) {
      list[index] = newCol;
    } else {
      list.unshift(newCol);
    }
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(list));
  }
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

      if (!error && data) {
        const localList = await getCollections();
        const updatedList = localList.map(item => item.id === col.id ? (data as ProductCollection) : item);
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(updatedList));
        return data as ProductCollection;
      }
      console.warn('Ошибка обновления коллекции в Supabase, сохраняем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    const list: ProductCollection[] = local ? JSON.parse(local) : DEFAULT_COLLECTIONS;
    const updatedList = list.map(item => item.id === col.id ? col : item);
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(updatedList));
  }
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

      if (!error) {
        const local = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
        if (local) {
          const list: ProductCollection[] = JSON.parse(local);
          const filtered = list.filter(item => item.id !== id);
          localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(filtered));
        }
        return true;
      }
      console.warn('Ошибка удаления коллекции из Supabase, удаляем локально:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    if (local) {
      const list: ProductCollection[] = JSON.parse(local);
      const filtered = list.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(filtered));
    }
    return true;
  }
  return false;
}

export async function clearAllCollections(): Promise<boolean> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      const { error } = await (client as any)
        .from('collections')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (!error) {
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify([]));
        return true;
      }
      console.warn('Ошибка очистки коллекций в Supabase:', error);
    } catch (e) {
      console.error('Ошибка соединения с Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify([]));
    return true;
  }
  return false;
}

export async function restoreAllCollections(collections: ProductCollection[]): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));

  const client = await getAuthenticatedSupabaseClient();
  if (client) {
    try {
      await (client as any)
        .from('collections')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (collections.length > 0) {
        await (client as any)
          .from('collections')
          .insert(collections);
      }
    } catch (e) {
      console.error('Ошибка восстановления коллекций в Supabase:', e);
    }
  }
}

/**
 * Атомарно восстанавливает весь список заказов (для Undo).
 * Вместо N последовательных saveOrder вызовов — один batch upsert.
 */
export async function restoreAllOrders(orders: Order[]): Promise<void> {
  // Обновляем localStorage атомарно
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

  const client = await getAuthenticatedSupabaseClient();
  if (client && orders.length > 0) {
    try {
      await (client as any)
        .from('orders')
        .upsert(orders);
    } catch (e) {
      console.error('Ошибка восстановления заказов в Supabase:', e);
    }
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

      if (!error && data) {
        // Пустой массив — валидный ответ (нет заказов)
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
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasModifiers = parsed.some(o => o.discount_percent || o.discount_amount || o.urgency_percent || o.urgency_amount);
          if (!hasModifiers) {
            const merged = [...DEFAULT_ORDERS.slice(0, 3), ...parsed];
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(merged));
            return merged;
          }
          return parsed;
        }
      } catch (e) {
        console.error('Ошибка парсинга заказов из localStorage:', e);
      }
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(DEFAULT_ORDERS));
    return DEFAULT_ORDERS;
  }
  return DEFAULT_ORDERS;
}

export async function saveOrder(order: Omit<Order, 'id'> & { id?: string }): Promise<Order> {
  const client = await getAuthenticatedSupabaseClient();
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
        // Обновляем локальный кэш без повторного запроса к БД
        const local = localStorage.getItem(STORAGE_KEYS.ORDERS);
        const cached: Order[] = local ? JSON.parse(local) : [];
        const updated = cached.map(o => o.id === id ? (data as Order) : o);
        if (!cached.some(o => o.id === id)) updated.unshift(data as Order);
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
  const client = await getAuthenticatedSupabaseClient();

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

// ==========================================
// DATABASE CLEANUP & RANDOM SEED API
// ==========================================

/**
 * Полностью удаляет все данные из всех таблиц (orders, saved_calculations, settings, filaments, printers)
 * как в Supabase (если подключен и авторизован), так и в LocalStorage.
 */
export async function clearAllDatabaseTables(): Promise<void> {
  const client = await getAuthenticatedSupabaseClient();

  if (client) {
    try {
      // Удаляем из всех таблиц с учетом foreign keys (сначала зависимые)
      await (client as any).from('monthly_goals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await (client as any).from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await (client as any).from('saved_calculations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await (client as any).from('collections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await (client as any).from('settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await (client as any).from('filaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await (client as any).from('printers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.error('Ошибка при очистке таблиц Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.FILAMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MONTHLY_GOALS, JSON.stringify(DEFAULT_MONTHLY_GOALS_CONFIG));
  }
}

/**
 * Очищает все таблицы и заполняет базу случайно сгенерированными реалистичными данными.
 */
export async function resetAndSeedDatabase(customSeed?: SeedDataResult): Promise<SeedDataResult> {
  const seedData = customSeed || generateRandomSeedData();

  // 1. Очищаем все таблицы
  await clearAllDatabaseTables();

  // 2. Записываем в LocalStorage
  if (typeof window !== 'undefined') {
    const safeCalcs = seedData.savedCalculations.map(({ stl_file_data, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(seedData.printers));
    localStorage.setItem(STORAGE_KEYS.FILAMENTS, JSON.stringify(seedData.filaments));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(seedData.settings));
    localStorage.setItem(STORAGE_KEYS.SAVED_CALCULATIONS, JSON.stringify(safeCalcs));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(seedData.orders));
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(seedData.collections || []));
  }

  // 3. Записываем в Supabase (если подключен и есть авторизованная сессия)
  const client = await getAuthenticatedSupabaseClient();
  if (client) {
    try {
      if (seedData.printers.length > 0) {
        await (client as any).from('printers').insert(seedData.printers);
      }
      if (seedData.filaments.length > 0) {
        await (client as any).from('filaments').insert(seedData.filaments);
      }
      if (seedData.settings) {
        await (client as any).from('settings').insert(seedData.settings);
      }
      if (seedData.collections && seedData.collections.length > 0) {
        await (client as any).from('collections').insert(seedData.collections);
      }
      if (seedData.savedCalculations.length > 0) {
        await (client as any).from('saved_calculations').insert(seedData.savedCalculations);
      }
      if (seedData.orders.length > 0) {
        await (client as any).from('orders').insert(seedData.orders);
      }
    } catch (e) {
      console.error('Ошибка вставки сгенерированных данных в Supabase:', e);
    }
  }

  return seedData;
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
      await (client as any)
        .from('monthly_goals')
        .upsert(
          {
            month_key: monthKey,
            target_amount: cleanAmount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,month_key' }
        );
    } catch (e) {
      console.error('Ошибка сохранения цели в Supabase:', e);
    }
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

  if (client) {
    try {
      const rows = [
        {
          month_key: 'default',
          target_amount: config.defaultGoal,
          updated_at: new Date().toISOString(),
        },
        ...Object.entries(config.monthlyGoals || {}).map(([mKey, amt]) => ({
          month_key: mKey,
          target_amount: amt,
          updated_at: new Date().toISOString(),
        })),
      ];

      await (client as any)
        .from('monthly_goals')
        .upsert(rows, { onConflict: 'user_id,month_key' });
    } catch (e) {
      console.error('Ошибка сохранения конфигурации целей в Supabase:', e);
    }
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
    // 1. Считываем данные из LocalStorage
    const localFilaments: Filament[] = localStorage.getItem(STORAGE_KEYS.FILAMENTS)
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.FILAMENTS)!)
      : [];
    const localPrinters: Printer[] = localStorage.getItem(STORAGE_KEYS.PRINTERS)
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.PRINTERS)!)
      : [];
    const localSettings: Settings | null = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)!)
      : null;
    const localCalcs: SavedCalculation[] = localStorage.getItem(STORAGE_KEYS.SAVED_CALCULATIONS)
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_CALCULATIONS)!)
      : [];
    const localOrders: Order[] = localStorage.getItem(STORAGE_KEYS.ORDERS)
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS)!)
      : [];
    const localCollections: ProductCollection[] = localStorage.getItem(STORAGE_KEYS.COLLECTIONS)
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.COLLECTIONS)!)
      : [];
    const localGoalsConfig = getCachedMonthlyGoalsConfig();

    // 2. Отправляем (upsert) локальные изменения в облако
    if (localPrinters.length > 0) {
      await (client as any).from('printers').upsert(localPrinters);
    }
    if (localFilaments.length > 0) {
      await (client as any).from('filaments').upsert(localFilaments);
    }
    if (localSettings) {
      await (client as any).from('settings').upsert({
        ...localSettings,
        updated_at: new Date().toISOString(),
      });
    }
    if (localCollections.length > 0) {
      await (client as any).from('collections').upsert(localCollections);
    }
    if (localCalcs.length > 0) {
      const safeCalcs = localCalcs.map(({ stl_file_data, ...rest }) => rest);
      await (client as any).from('saved_calculations').upsert(safeCalcs);
    }
    if (localOrders.length > 0) {
      await (client as any).from('orders').upsert(localOrders);
    }
    if (localGoalsConfig) {
      const rows = [
        {
          month_key: 'default',
          target_amount: localGoalsConfig.defaultGoal || 0,
          updated_at: new Date().toISOString(),
        },
        ...Object.entries(localGoalsConfig.monthlyGoals || {}).map(([mKey, amt]) => ({
          month_key: mKey,
          target_amount: amt,
          updated_at: new Date().toISOString(),
        })),
      ];
      await (client as any).from('monthly_goals').upsert(rows, { onConflict: 'user_id,month_key' });
    }

    // 3. Загружаем объединенные данные из облака
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


