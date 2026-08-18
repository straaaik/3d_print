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

export interface AssemblyPrintedPart {
  id?: string;
  product_id?: string;
  name: string;
  weight_g: number;
  hours: number;
  minutes: number;
  quantity: number;
  filament_id?: string;
  filament_name?: string;
  filament_color?: string;
  printer_id?: string;
  printer_name?: string;
  base_cost: number;
  final_price: number;
  stl_url?: string;
  stl_file_name?: string;
  stl_file_data?: string;
}

export interface AssemblyHardwareItem {
  id: string;
  name: string;
  quantity: number;
  cost_per_unit: number;
  price_per_unit: number;
}

export interface SavedCalculation {
  id: string;
  created_at?: string;
  name: string;
  type?: 'single' | 'assembly';
  filament_name: string;
  filament_color?: string;
  printer_name: string;
  weight_g: number;
  hours: number;
  minutes: number;
  quantity: number;
  base_cost: number;
  final_price: number;
  
  // Состав сборки (для type === 'assembly')
  assembly_parts?: AssemblyPrintedPart[];
  assembly_hardware?: AssemblyHardwareItem[];
  assembly_labor_minutes?: number;
  assembly_labor_cost?: number;

  // Поля для повторной загрузки в калькулятор
  filament_id?: string;
  printer_id?: string;
  labor_minutes?: number;

  // Поля для категорий и тегов
  category?: string;
  tags?: string[];

  // Учет наличия готовой продукции на складе
  stock_quantity?: number;

  // Поля для STL файла и ссылки
  stl_url?: string;
  stl_file_name?: string;
  stl_file_data?: string;
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

export interface CostItem {
  id?: string;
  category: string; // Наименование расхода (печать, упаковка, работа руками, покраска, доставка, брак/тесты или пользовательский пункт)
  amount: number;   // Сумма расхода в ₽
  note?: string;    // Дополнительное примечание
}

export interface Order {
  id: string;
  order_number?: number; // Автоматический уникальный номер заказа (1001, 1002...)
  created_at?: string;
  date: string;
  type: 'income' | 'expense';
  title: string;
  quantity?: number; // Количество проданных штук (по умолчанию 1)
  amount: number;
  cost: number;
  cost_items?: CostItem[]; // Детализированный список пунктов расхода
  payments?: number[]; // Список отдельных транзакций оплаты
  payment: number; // Сумма всех транзакций оплаты
  client: string;
  contacts?: ContactItem[]; // Список контактов клиента (телефон, телеграм, whatsapp и др.)
  contact: string; // Основной контакт для обратной совместимости
  deadline: string;
  status: OrderStatus;
  notes: string;
  product_id?: string; // Связь с ID товара из каталога для автосписания при сохранении заказа
}

// Конфигурация для Supabase API ключей, вводимых пользователем вручную
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
