-- =========================================================================
-- SQL СКРИПТ ДЛЯ ИНИЦИАЛИЗАЦИИ И ОБНОВЛЕНИЯ БАЗЫ ДАННЫХ В SUPABASE
-- 3D Labs Cloud • Многопользовательская архитектура с Supabase Auth и RLS
-- =========================================================================

-- 1. Таблица профилей пользователей (связана с auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text not null,
  name text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  is_active boolean not null default true,
  last_login_at timestamp with time zone,
  registration_key_used text,
  avatar_color text
);

-- 2. Таблица регистрационных ключей (приглашений)
create table if not exists public.registration_keys (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  key text unique not null,
  is_used boolean not null default false,
  used_by_email text,
  used_by_user_id uuid references auth.users(id) on delete set null,
  used_at timestamp with time zone,
  created_by text not null default 'Система',
  expires_at timestamp with time zone,
  role_to_grant text not null default 'user' check (role_to_grant in ('admin', 'user')),
  note text
);

-- 3. Таблица принтеров
create table if not exists public.printers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  power_w numeric not null,
  price numeric not null,
  lifespan_hours numeric not null,
  color text
);

-- 4. Таблица филаментов
create table if not exists public.filaments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  weight_g numeric not null,
  price numeric not null,
  color text
);

-- 5. Таблица настроек по умолчанию (индивидуальная для каждого пользователя)
create table if not exists public.settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  currency text default '₽',
  electricity_rate numeric default 4.89,
  default_printer_id uuid references public.printers(id) on delete set null,
  labor_rate_per_hour numeric default 0,
  labor_time_minutes numeric default 15,
  is_owner_labor_default boolean default true,
  is_labor_per_unit_default boolean default false,
  min_order_price numeric default 300,
  enable_material_difficulty boolean default true,
  material_multipliers jsonb default '{"pla_petg": 100, "abs_asa": 120, "tpu_flex": 140, "nylon_cf": 170}'::jsonb,
  default_markup_percent numeric default 100,
  default_defect_percent numeric default 5,
  default_urgency_percent numeric default 25
);

-- 6. Таблица коллекций товаров
create table if not exists public.collections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  category text,
  tags jsonb default '[]'::jsonb,
  description text
);

-- 7. Таблица сохраненных расчетов (изделий)
create table if not exists public.saved_calculations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  type text default 'single',
  filament_name text not null,
  filament_color text,
  printer_name text not null,
  weight_g numeric not null,
  hours integer not null,
  minutes integer not null,
  quantity integer not null,
  base_cost numeric not null,
  final_price numeric not null,
  filament_id uuid,
  printer_id uuid,
  labor_minutes integer,
  labor_rate_per_hour numeric,
  is_owner_labor boolean,
  is_labor_per_unit boolean,
  markup_percent numeric,
  defect_percent numeric,
  collection_id uuid,
  collection_name text,
  assembly_parts jsonb,
  assembly_hardware jsonb,
  assembly_labor_minutes integer,
  assembly_labor_cost numeric,
  custom_cost_items jsonb,
  discount_percent numeric,
  discount_amount numeric,
  urgency_percent numeric,
  urgency_amount numeric,
  category text,
  tags jsonb,
  stock_quantity integer,
  stl_url text,
  stl_file_name text,
  stl_file_data text
);

-- 8. Таблица заказов и финансов
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  order_number bigint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date text not null,
  type text not null,
  title text not null,
  quantity numeric default 1,
  base_amount numeric,
  urgency_type text,
  urgency_percent numeric,
  urgency_amount numeric,
  discount_type text,
  discount_percent numeric,
  discount_amount numeric,
  amount numeric default 0,
  cost numeric default 0,
  cost_items jsonb default '[]'::jsonb,
  payments jsonb default '[]'::jsonb,
  payment numeric default 0,
  client text default 'Авито',
  contact text,
  contacts jsonb default '[]'::jsonb,
  deadline text,
  status text default 'Готово',
  notes text,
  product_id uuid
);

-- =========================================================================
-- КОМАНДЫ МИГРАЦИИ ДЛЯ СУЩЕСТВУЮЩИХ ТАБЛИЦ (если таблицы создавались ранее)
-- =========================================================================
alter table public.printers add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.filaments add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.settings add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.collections add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.saved_calculations add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.orders add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

-- Индексы для быстрой фильтрации по пользователю
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_reg_keys_key on public.registration_keys(key);
create index if not exists idx_reg_keys_is_used on public.registration_keys(is_used);
create index if not exists idx_printers_user on public.printers(user_id);
create index if not exists idx_filaments_user on public.filaments(user_id);
create index if not exists idx_settings_user on public.settings(user_id);
create index if not exists idx_collections_user on public.collections(user_id);
create index if not exists idx_saved_calc_user on public.saved_calculations(user_id);
create index if not exists idx_orders_user on public.orders(user_id);

-- =========================================================================
-- БЕЗОПАСНОСТЬ (RLS - Row Level Security)
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.registration_keys enable row level security;
alter table public.printers enable row level security;
alter table public.filaments enable row level security;
alter table public.settings enable row level security;
alter table public.collections enable row level security;
alter table public.saved_calculations enable row level security;
alter table public.orders enable row level security;

-- Очистка старых политик (если были)
drop policy if exists "Allow full access to printers" on public.printers;
drop policy if exists "Allow full access to filaments" on public.filaments;
drop policy if exists "Allow full access to settings" on public.settings;
drop policy if exists "Allow full access to collections" on public.collections;
drop policy if exists "Allow full access to saved_calculations" on public.saved_calculations;
drop policy if exists "Allow full access to orders" on public.orders;

drop policy if exists "Users own printers" on public.printers;
drop policy if exists "Users own filaments" on public.filaments;
drop policy if exists "Users own settings" on public.settings;
drop policy if exists "Users own collections" on public.collections;
drop policy if exists "Users own calculations" on public.saved_calculations;
drop policy if exists "Users own orders" on public.orders;

-- Политики изоляции данных (Каждый пользователь имеет доступ только к своим данным)
create policy "Users own printers" on public.printers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users own filaments" on public.filaments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users own collections" on public.collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users own calculations" on public.saved_calculations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users own orders" on public.orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Политики для профилей
drop policy if exists "Read profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Read profiles" on public.profiles
  for select using (auth.uid() is not null);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (true);

-- Автоматический триггер создания профиля при регистрации в auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, is_active, avatar_color, registration_key_used)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    true,
    coalesce(new.raw_user_meta_data->>'avatar_color', '#8B5CF6'),
    new.raw_user_meta_data->>'registration_key_used'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.profiles.name),
    role = coalesce(excluded.role, public.profiles.role);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Политики для регистрационных ключей
drop policy if exists "Anyone can read keys for validation" on public.registration_keys;
drop policy if exists "Anyone can update keys" on public.registration_keys;
drop policy if exists "Admins manage keys insert" on public.registration_keys;
drop policy if exists "Admins manage keys delete" on public.registration_keys;

-- Чтение для валидации ключа при регистрации (доступно всем, включая анонимный запрос регистрации)
create policy "Anyone can read keys for validation" on public.registration_keys
  for select using (true);

-- Погашение ключа при регистрации
create policy "Anyone can update keys" on public.registration_keys
  for update using (true);

-- Создание и удаление ключей доступно авторизованным администраторам
create policy "Admins manage keys insert" on public.registration_keys
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  );

create policy "Admins manage keys delete" on public.registration_keys
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  );

-- =========================================================================
-- СТАРТОВЫЙ КЛЮЧ ДЛЯ СОЗДАНИЯ ПЕРВОГО АДМИНИСТРАТОРА
-- =========================================================================
insert into public.registration_keys (key, role_to_grant, note)
values ('3DLAB-SETUP-ADMIN-KEY', 'admin', 'Стартовый мастер-ключ для регистрации первого Администратора. Удалите после создания аккаунта.')
on conflict (key) do nothing;
