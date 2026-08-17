export interface Printer {
  id: string;
  created_at?: string;
  name: string;
  power_w: number;
  price: number;
  lifespan_hours: number;
  color?: string; // цветная метка принтера
}

export interface Filament {
  id: string;
  created_at?: string;
  name: string;
  weight_g: number;
  price: number;
  color?: string;
}

export interface SavedCalculation {
  id: string;
  created_at?: string;
  name: string;
  filament_name: string;
  filament_color?: string;
  printer_name: string;
  weight_g: number;
  hours: number;
  minutes: number;
  quantity: number;
  base_cost: number;
  final_price: number;
  
  // Поля для повторной загрузки в калькулятор
  filament_id?: string;
  printer_id?: string;
  labor_minutes?: number;
}

export interface Settings {
  id?: string;
  updated_at?: string;
  currency: string;
  electricity_rate: number;
  default_printer_id: string | null;
  labor_rate_per_hour: number;
  labor_time_minutes: number; // Время работы мастера на заказ в минутах
  default_markup_percent: number;
  default_defect_percent: number;
}

export type OrderStatus = 
  | 'Не в работе' 
  | 'Моделирование' 
  | 'Ждет печати' 
  | 'Печать' 
  | 'Ждет покраски' 
  | 'Покраска' 
  | 'Ждет отправки' 
  | 'Отправлен' 
  | 'Готово';

export type ContactType = 
  | 'phone' 
  | 'telegram' 
  | 'whatsapp' 
  | 'avito' 
  | 'vk' 
  | 'instagram' 
  | 'email' 
  | 'other';

export interface ContactItem {
  type: ContactType;
  value: string;
  label?: string;
}

export interface Order {
  id: string;
  order_number?: number; // Автоматический уникальный номер заказа (1001, 1002...)
  created_at?: string;
  date: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  cost: number;
  payments?: number[]; // Список отдельных транзакций оплаты
  payment: number; // Сумма всех транзакций оплаты
  client: string;
  contacts?: ContactItem[]; // Список контактов клиента (телефон, телеграм, whatsapp и др.)
  contact: string; // Основной контакт для обратной совместимости
  deadline: string;
  status: OrderStatus;
  notes: string;
}

// Конфигурация для Supabase API ключей, вводимых пользователем вручную
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
