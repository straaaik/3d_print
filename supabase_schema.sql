-- =========================================================================
-- SQL СКРИПТ ДЛЯ ИНИЦИАЛИЗАЦИИ И ОБНОВЛЕНИЯ БАЗЫ ДАННЫХ В SUPABASE
-- Скопируйте этот код и вставьте его в SQL Editor вашего проекта Supabase
-- =========================================================================

-- 1. Таблица принтеров
create table if not exists public.printers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,               -- Название принтера (например, "Bambu Lab A1")
  power_w numeric not null,          -- Мощность в Ваттах (например, 250)
  price numeric not null,            -- Стоимость покупки
  lifespan_hours numeric not null,   -- Ресурс службы в часах (например, 5000)
  color text                         -- Цвет принтера (Hex-код)
);

-- 2. Таблица филаментов
create table if not exists public.filaments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,                -- Название (например, "PETG CF")
  weight_g numeric not null,         -- Вес катушки в граммах (например, 1000)
  price numeric not null,            -- Стоимость катушки
  color text                         -- Цвет филамента (Hex-код)
);

-- 3. Таблица настроек по умолчанию (хранит одну строку с глобальными настройками)
create table if not exists public.settings (
  id uuid default gen_random_uuid() primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  currency text default '₽',
  electricity_rate numeric default 4.89,     -- Тариф за кВт·ч
  default_printer_id uuid references public.printers(id) on delete set null, -- Принтер по умолчанию
  labor_rate_per_hour numeric default 0,     -- Оплата труда мастера в час
  labor_time_minutes numeric default 15,     -- Время работы мастера по умолчанию
  default_markup_percent numeric default 100,  -- Наценка по умолчанию в %
  default_defect_percent numeric default 5     -- Брак по умолчанию в %
);

-- 4. Таблица избранных расчетов
create table if not exists public.saved_calculations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,                -- Название расчета
  filament_name text not null,       -- Название филамента на момент сохранения
  filament_color text,               -- Цвет филамента
  printer_name text not null,        -- Название принтера
  weight_g numeric not null,         -- Израсходованный вес
  hours integer not null,            -- Часы печати
  minutes integer not null,          -- Минуты печати
  quantity integer not null,         -- Количество изделий
  base_cost numeric not null,        -- Себестоимость
  final_price numeric not null,      -- Цена с наценкой
  filament_id uuid,                  -- Ссылочный id филамента (если есть)
  printer_id uuid,                   -- Ссылочный id принтера (если есть)
  labor_minutes integer              -- Время работы мастера
);

-- 5. Таблица заказов и финансов
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date text not null,                -- Дата (например, "10.10")
  type text not null,                -- Тип операции ("income" / "expense")
  title text not null,               -- Наименование
  amount numeric default 0,          -- Сумма
  cost numeric default 0,            -- Расход на производство
  payments jsonb default '[]'::jsonb,-- Список транзакций оплаты (массив чисел)
  payment numeric default 0,         -- Сумма всех транзакций оплаты
  client text default 'Авито',       -- Клиент / Канал ("Авито", "Телеграмм", "Ютуб", "Тикток", "Инстаграмм", "Другое")
  contact text,                      -- Контакт
  deadline text,                     -- Срок выполнения
  status text default 'Готово',      -- Статус ("Не в работе", "Моделирование", "Ждет печати", "Печать", "Ждет покраски", "Покраска", "Ждет отправки", "Отправлен", "Готово")
  notes text                         -- Примечание
);

-- Команды для обновления существующей таблицы в Supabase (если таблица уже была создана ранее):
-- alter table public.orders drop column if exists prepayment;
-- alter table public.orders drop column if exists extra_payment;
-- alter table public.orders add column if exists payments jsonb default '[]'::jsonb;

-- =========================================================================
-- БЕЗОПАСНОСТЬ (RLS - Row Level Security)
-- =========================================================================
alter table public.printers disable row level security;
alter table public.filaments disable row level security;
alter table public.settings disable row level security;
alter table public.saved_calculations disable row level security;
alter table public.orders disable row level security;
