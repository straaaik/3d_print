export interface Printer {
  id: string;
  user_id?: string;
  created_at?: string;
  name: string;
  power_w: number;
  price: number;
  lifespan_hours: number;
  color?: string; // цветная метка принтера
}

export interface Filament {
  id: string;
  user_id?: string;
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

export interface CustomCostItem {
  id: string;
  name: string;
  amount: number;
  isPerUnit?: boolean; // начисляется на каждую единицу изделия или фиксированно на весь заказ
  isEnabled: boolean;  // включен ли пункт в расчет
}

export interface ProductCollection {
  id: string;
  user_id?: string;
  created_at?: string;
  name: string;
  category?: string;
  tags?: string[];
  description?: string;
}

export interface SavedCalculation {
  id: string;
  user_id?: string;
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
  
  // Привязка к коллекции
  collection_id?: string;
  collection_name?: string;

  // Состав сборки (для type === 'assembly')
  assembly_parts?: AssemblyPrintedPart[];
  assembly_hardware?: AssemblyHardwareItem[];
  assembly_labor_minutes?: number;
  assembly_labor_cost?: number;

  // Поля для повторной загрузки в калькулятор и кастомных настроек
  filament_id?: string;
  printer_id?: string;
  labor_minutes?: number;
  labor_rate_per_hour?: number;
  is_owner_labor?: boolean; // Личный труд владельца (идет в чистую прибыль, а не в затратную себестоимость)
  is_labor_per_unit?: boolean; // Начислять время работы на каждую единицу тиража или за весь заказ
  markup_percent?: number;
  defect_percent?: number;
  custom_cost_items?: CustomCostItem[];

  // Скидка и Срочность
  discount_percent?: number;
  discount_amount?: number;
  urgency_percent?: number;
  urgency_amount?: number;

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
  user_id?: string;
  updated_at?: string;
  currency: string;
  electricity_rate: number;
  default_printer_id: string | null;
  labor_rate_per_hour: number;
  labor_time_minutes: number; // Время работы мастера на заказ в минутах
  is_owner_labor_default?: boolean; // По умолчанию личный труд в прибыль
  is_labor_per_unit_default?: boolean; // По умолчанию труд за штуку
  min_order_price?: number; // Минимальная стоимость заказа / печати (0 = выключено, напр. 300 ₽)
  default_urgency_percent?: number; // Процент наценки за срочность по умолчанию (напр. 25%)
  enable_material_difficulty?: boolean; // Учитывать категорию сложности пластика
  material_multipliers?: Record<string, number>; // Наценки по группам материалов (PLA: 100%, ABS: 120%, TPU: 140%, Nylon: 170%)
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
  user_id?: string;
  order_number?: number; // Автоматический уникальный номер заказа (1001, 1002...)
  created_at?: string;
  date: string;
  type: 'income' | 'expense';
  title: string;
  quantity?: number; // Количество проданных штук (по умолчанию 1)
  base_amount?: number; // Базовая сумма заказа до скидок и наценок
  urgency_type?: 'percent' | 'fixed';
  urgency_percent?: number;
  urgency_amount?: number;
  discount_type?: 'percent' | 'fixed';
  discount_percent?: number;
  discount_amount?: number;
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

// ==========================================
// AUTH & REGISTRATION KEYS
// ==========================================

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
  registration_key_used?: string;
  avatar_color?: string;
}

export interface RegistrationKey {
  id: string;
  key: string;
  is_used: boolean;
  used_by_email?: string;
  used_by_user_id?: string;
  used_at?: string;
  created_at: string;
  created_by: string;
  expires_at?: string | null;
  role_to_grant: UserRole;
  note?: string;
}

