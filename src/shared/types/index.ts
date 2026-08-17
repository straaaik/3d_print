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

// Конфигурация для Supabase API ключей, вводимых пользователем вручную
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
