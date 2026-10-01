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
  avatar_color text,
  model_3d text not null default 'a1' check (model_3d in ('a1', 'p1'))
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
  default_urgency_percent numeric default 25,
  unique (user_id)
);

-- 6. Таблица коллекций товаров
create table if not exists public.collections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  category text,
  tags jsonb default '[]'::jsonb,
  description text,
  color text
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
  assembly_electronics jsonb default '[]'::jsonb,
  assembly_labor_minutes integer,
  assembly_labor_cost numeric,
  custom_cost_items jsonb,
  discount_percent numeric,
  discount_amount numeric,
  urgency_percent numeric,
  urgency_amount numeric,
  category text,
  tags jsonb,
  stock_quantity integer check (coalesce(stock_quantity, 0) >= 0),
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
  client_name text,
  contact text,
  contacts jsonb default '[]'::jsonb,
  deadline text,
  status text default 'Готово',
  notes text,
  product_id uuid,
  unique (user_id, order_number),
  check (
    type in ('income', 'expense')
    and quantity > 0
    and coalesce(base_amount, 0) >= 0
    and coalesce(amount, 0) >= 0
    and coalesce(cost, 0) >= 0
    and coalesce(payment, 0) >= 0
    and coalesce(discount_percent, 0) between 0 and 100
    and coalesce(discount_amount, 0) >= 0
    and coalesce(urgency_percent, 0) >= 0
    and coalesce(urgency_amount, 0) >= 0
  )
);

-- 9. Таблица целей по прибыли (индивидуальная для каждого пользователя и каждого месяца + общая 'default')
create table if not exists public.monthly_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  month_key text not null, -- 'default' для общей цели или 'YYYY-MM' (например '2026-08') для конкретного месяца
  target_amount numeric not null default 0,
  unique (user_id, month_key)
);

-- 10. Атомарные счётчики номеров заказов. Прямой доступ клиентам закрыт.
create table if not exists public.order_counters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  next_number bigint not null check (next_number > 0)
);

-- =========================================================================
-- КОМАНДЫ МИГРАЦИИ ДЛЯ СУЩЕСТВУЮЩИХ ТАБЛИЦ (если таблицы создавались ранее)
-- =========================================================================
alter table public.printers add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.filaments add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.settings add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.collections add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.collections add column if not exists color text;
alter table public.saved_calculations add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.saved_calculations add column if not exists assembly_electronics jsonb default '[]'::jsonb;
alter table public.orders add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.orders add column if not exists client_name text;
alter table public.monthly_goals add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

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
create index if not exists idx_monthly_goals_user on public.monthly_goals(user_id);
create index if not exists idx_monthly_goals_user_month on public.monthly_goals(user_id, month_key);

with ranked_settings as (
  select id, row_number() over (partition by user_id order by updated_at desc nulls last, id desc) as row_num
  from public.settings where user_id is not null
)
delete from public.settings s using ranked_settings r
where s.id = r.id and r.row_num > 1;

with ranked_orders as (
  select id, user_id, order_number,
    row_number() over (partition by user_id, order_number order by created_at, id) as duplicate_num,
    greatest(coalesce(max(order_number) over (partition by user_id), 1000), 1000) as max_num
  from public.orders where user_id is not null
), to_renumber as (
  select id, user_id, max_num,
    row_number() over (partition by user_id order by id) as offset_num
  from ranked_orders where order_number is null or duplicate_num > 1
)
update public.orders o set order_number = r.max_num + r.offset_num
from to_renumber r where o.id = r.id;

create unique index if not exists uq_settings_user_id on public.settings(user_id);
create unique index if not exists uq_orders_user_order_number on public.orders(user_id, order_number)
  where user_id is not null and order_number is not null;

alter table public.printers drop constraint if exists printers_positive_values;
alter table public.printers add constraint printers_positive_values
  check (power_w > 0 and price >= 0 and lifespan_hours > 0) not valid;
alter table public.filaments drop constraint if exists filaments_positive_values;
alter table public.filaments add constraint filaments_positive_values
  check (weight_g > 0 and price >= 0) not valid;
alter table public.saved_calculations drop constraint if exists saved_calculations_valid_values;
alter table public.saved_calculations add constraint saved_calculations_valid_values
  check (
    weight_g >= 0 and hours >= 0 and minutes >= 0 and quantity > 0
    and base_cost >= 0 and final_price >= 0 and coalesce(stock_quantity, 0) >= 0
    and coalesce(discount_percent, 0) between 0 and 100
    and coalesce(discount_amount, 0) >= 0 and coalesce(urgency_percent, 0) >= 0
    and coalesce(urgency_amount, 0) >= 0
  ) not valid;
alter table public.orders drop constraint if exists orders_valid_financial_values;
alter table public.orders add constraint orders_valid_financial_values
  check (
    type in ('income', 'expense') and quantity > 0
    and coalesce(base_amount, 0) >= 0 and coalesce(amount, 0) >= 0
    and coalesce(cost, 0) >= 0 and coalesce(payment, 0) >= 0
    and coalesce(discount_percent, 0) between 0 and 100
    and coalesce(discount_amount, 0) >= 0 and coalesce(urgency_percent, 0) >= 0
    and coalesce(urgency_amount, 0) >= 0
  ) not valid;

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
alter table public.monthly_goals enable row level security;

-- Очистка старых политик (если были)
drop policy if exists "Allow full access to printers" on public.printers;
drop policy if exists "Allow full access to filaments" on public.filaments;
drop policy if exists "Allow full access to settings" on public.settings;
drop policy if exists "Allow full access to collections" on public.collections;
drop policy if exists "Allow full access to saved_calculations" on public.saved_calculations;
drop policy if exists "Allow full access to orders" on public.orders;
drop policy if exists "Allow full access to monthly_goals" on public.monthly_goals;

drop policy if exists "Users own printers" on public.printers;
drop policy if exists "Users own filaments" on public.filaments;
drop policy if exists "Users own settings" on public.settings;
drop policy if exists "Users own collections" on public.collections;
drop policy if exists "Users own calculations" on public.saved_calculations;
drop policy if exists "Users own orders" on public.orders;
drop policy if exists "Users own monthly goals" on public.monthly_goals;

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

create policy "Users own monthly goals" on public.monthly_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Безопасная проверка административной роли без рекурсивного RLS.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

-- Пользователь видит только свой профиль; администратор — список пользователей.
drop policy if exists "Read profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Profiles select own or admin" on public.profiles;
drop policy if exists "Profiles update own safe fields" on public.profiles;
drop policy if exists "Admins delete profiles" on public.profiles;

create policy "Profiles select own or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_current_user_admin());

create policy "Profiles update own safe fields" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "Admins delete profiles" on public.profiles
  for delete to authenticated
  using (public.is_current_user_admin() and id <> auth.uid());

revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (name, email, avatar_color, last_login_at) on public.profiles to authenticated;
grant delete on public.profiles to authenticated;

create or replace function public.admin_update_profile(
  target_user_id uuid,
  new_role text default null,
  new_is_active boolean default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_current_user_admin() then raise exception 'FORBIDDEN'; end if;
  if new_role is not null and new_role not in ('admin', 'user') then raise exception 'INVALID_ROLE'; end if;
  if target_user_id = auth.uid() and (new_role = 'user' or new_is_active = false) then
    raise exception 'CANNOT_LOCK_CURRENT_ADMIN';
  end if;
  update public.profiles
  set role = coalesce(new_role, role), is_active = coalesce(new_is_active, is_active)
  where id = target_user_id;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
end;
$$;

revoke all on function public.admin_update_profile(uuid, text, boolean) from public;
grant execute on function public.admin_update_profile(uuid, text, boolean) to authenticated;

-- Анонимная проверка не раскрывает сами ключи и данные их владельцев.
create or replace function public.validate_registration_key(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.registration_keys
    where key = upper(trim(p_key)) and is_used = false
      and (expires_at is null or expires_at > now())
  );
$$;

revoke all on function public.validate_registration_key(text) from public;
grant execute on function public.validate_registration_key(text) to anon, authenticated;

-- Ключ погашается атомарно в той же транзакции, что и auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed_role text;
  claimed_key text := upper(trim(coalesce(new.raw_user_meta_data->>'registration_key_used', '')));
begin
  update public.registration_keys
  set is_used = true, used_by_email = new.email, used_by_user_id = new.id, used_at = now()
  where key = claimed_key and is_used = false
    and (expires_at is null or expires_at > now())
  returning role_to_grant into claimed_role;

  if claimed_role is null then raise exception 'INVALID_REGISTRATION_KEY'; end if;

  insert into public.profiles (id, email, name, role, is_active, avatar_color, registration_key_used)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(coalesce(new.email, ''), '@', 1), 'Пользователь'),
    claimed_role,
    true,
    coalesce(nullif(new.raw_user_meta_data->>'avatar_color', ''), '#8B5CF6'),
    claimed_key
  )
  on conflict (id) do update set
    email = excluded.email, name = excluded.name, avatar_color = excluded.avatar_color;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop policy if exists "Anyone can read keys for validation" on public.registration_keys;
drop policy if exists "Anyone can update keys" on public.registration_keys;
drop policy if exists "Admins manage keys insert" on public.registration_keys;
drop policy if exists "Admins manage keys delete" on public.registration_keys;
drop policy if exists "Admins manage registration keys" on public.registration_keys;

create policy "Admins manage registration keys" on public.registration_keys
  for all to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

revoke all on public.registration_keys from anon;
grant select, insert, update, delete on public.registration_keys to authenticated;

-- Первый admin-ключ создаётся вручную со случайным значением в SQL Editor.
-- Никогда не храните действующий мастер-ключ в репозитории.

alter table public.order_counters enable row level security;
revoke all on public.order_counters from anon, authenticated;

insert into public.order_counters (user_id, next_number)
select user_id, greatest(coalesce(max(order_number), 1000) + 1, 1001)
from public.orders where user_id is not null group by user_id
on conflict (user_id) do update
set next_number = greatest(public.order_counters.next_number, excluded.next_number);

create or replace function public.allocate_order_number()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare allocated_number bigint;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  insert into public.order_counters as counters (user_id, next_number)
  values (auth.uid(), 1002)
  on conflict (user_id) do update set next_number = counters.next_number + 1
  returning next_number - 1 into allocated_number;
  return allocated_number;
end;
$$;

revoke all on function public.allocate_order_number() from public;
grant execute on function public.allocate_order_number() to authenticated;

create or replace function public.save_order_with_inventory(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  saved_order public.orders%rowtype;
  old_order public.orders%rowtype;
  order_record public.orders%rowtype;
  requested_id uuid;
  inventory_delta numeric;
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  begin requested_id := nullif(p_order->>'id', '')::uuid;
  exception when others then requested_id := null; end;
  requested_id := coalesce(requested_id, gen_random_uuid());

  select * into old_order from public.orders
  where id = requested_id and user_id = current_user_id for update;

  order_record := jsonb_populate_record(
    null::public.orders,
    p_order - 'id' - 'user_id' - 'created_at' - 'order_number'
  );
  order_record.id := requested_id;
  order_record.user_id := current_user_id;
  order_record.created_at := coalesce(old_order.created_at, nullif(p_order->>'created_at', '')::timestamptz, now());
  if old_order.id is not null then
    order_record.order_number := old_order.order_number;
  else
    order_record.order_number := nullif(p_order->>'order_number', '')::bigint;
    if order_record.order_number is null or exists (
      select 1 from public.orders
      where user_id = current_user_id and order_number = order_record.order_number
    ) then
      order_record.order_number := public.allocate_order_number();
    else
      insert into public.order_counters as counters (user_id, next_number)
      values (current_user_id, order_record.order_number + 1)
      on conflict (user_id) do update
        set next_number = greatest(counters.next_number, excluded.next_number);
    end if;
  end if;

  if old_order.id is not null and old_order.type = 'income' and old_order.product_id is not null then
    update public.saved_calculations
    set stock_quantity = coalesce(stock_quantity, 0) + greatest(coalesce(old_order.quantity, 0), 0)::integer
    where id = old_order.product_id and user_id = current_user_id;
  end if;

  if order_record.type = 'income' and order_record.product_id is not null then
    inventory_delta := greatest(coalesce(order_record.quantity, 0), 0);
    update public.saved_calculations
    set stock_quantity = coalesce(stock_quantity, 0) - inventory_delta::integer
    where id = order_record.product_id and user_id = current_user_id
      and coalesce(stock_quantity, 0) >= inventory_delta;
    if not found then raise exception 'INSUFFICIENT_STOCK'; end if;
  end if;

  insert into public.orders as target (
    id, user_id, order_number, created_at, date, type, title, quantity,
    base_amount, urgency_type, urgency_percent, urgency_amount,
    discount_type, discount_percent, discount_amount, amount, cost,
    cost_items, payments, payment, client, client_name, contact, contacts, deadline,
    status, notes, product_id
  ) values (
    order_record.id, order_record.user_id, order_record.order_number, order_record.created_at,
    order_record.date, order_record.type, order_record.title, order_record.quantity,
    order_record.base_amount, order_record.urgency_type, order_record.urgency_percent, order_record.urgency_amount,
    order_record.discount_type, order_record.discount_percent, order_record.discount_amount,
    order_record.amount, order_record.cost, coalesce(order_record.cost_items, '[]'::jsonb),
    coalesce(order_record.payments, '[]'::jsonb), order_record.payment, order_record.client,
    order_record.client_name, order_record.contact, coalesce(order_record.contacts, '[]'::jsonb), order_record.deadline,
    order_record.status, order_record.notes, order_record.product_id
  )
  on conflict (id) do update set
    order_number = excluded.order_number, date = excluded.date, type = excluded.type,
    title = excluded.title, quantity = excluded.quantity, base_amount = excluded.base_amount,
    urgency_type = excluded.urgency_type, urgency_percent = excluded.urgency_percent,
    urgency_amount = excluded.urgency_amount, discount_type = excluded.discount_type,
    discount_percent = excluded.discount_percent, discount_amount = excluded.discount_amount,
    amount = excluded.amount, cost = excluded.cost, cost_items = excluded.cost_items,
    payments = excluded.payments, payment = excluded.payment, client = excluded.client,
    client_name = excluded.client_name, contact = excluded.contact, contacts = excluded.contacts, deadline = excluded.deadline,
    status = excluded.status, notes = excluded.notes, product_id = excluded.product_id
  where target.user_id = current_user_id
  returning target.* into saved_order;

  if saved_order.id is null then raise exception 'ORDER_FORBIDDEN'; end if;
  return to_jsonb(saved_order);
end;
$$;

revoke all on function public.save_order_with_inventory(jsonb) from public;
grant execute on function public.save_order_with_inventory(jsonb) to authenticated;

create or replace function public.delete_orders_atomic(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare deleted_count integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  update public.saved_calculations product
  set stock_quantity = coalesce(product.stock_quantity, 0) + returned.quantity::integer
  from (
    select product_id, sum(quantity) as quantity
    from public.orders
    where user_id = auth.uid() and id = any(p_ids)
      and type = 'income' and product_id is not null
    group by product_id
  ) returned
  where product.id = returned.product_id and product.user_id = auth.uid();
  delete from public.orders where user_id = auth.uid() and id = any(p_ids);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_orders_atomic(uuid[]) from public;
grant execute on function public.delete_orders_atomic(uuid[]) to authenticated;

create or replace function public.restore_orders_snapshot(p_orders jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  restored_count integer := 0;
  existing_ids uuid[];
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_orders) <> 'array' then raise exception 'INVALID_ORDER_SNAPSHOT'; end if;
  select coalesce(array_agg(id), array[]::uuid[]) into existing_ids
  from public.orders where user_id = auth.uid();
  perform public.delete_orders_atomic(existing_ids);
  for item in select value from jsonb_array_elements(p_orders)
  loop
    perform public.save_order_with_inventory(item);
    restored_count := restored_count + 1;
  end loop;
  return restored_count;
end;
$$;

revoke all on function public.restore_orders_snapshot(jsonb) from public;
grant execute on function public.restore_orders_snapshot(jsonb) to authenticated;

create or replace function public.restore_saved_calculations_snapshot(p_items jsonb)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare restored_count integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'INVALID_CALCULATION_SNAPSHOT'; end if;
  delete from public.saved_calculations where user_id = auth.uid();
  insert into public.saved_calculations
  select (jsonb_populate_record(null::public.saved_calculations, (item - 'user_id') || jsonb_build_object('user_id', auth.uid()))).*
  from jsonb_array_elements(p_items) as source(item);
  get diagnostics restored_count = row_count;
  return restored_count;
end;
$$;
revoke all on function public.restore_saved_calculations_snapshot(jsonb) from public;
grant execute on function public.restore_saved_calculations_snapshot(jsonb) to authenticated;

create or replace function public.restore_collections_snapshot(p_items jsonb)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare restored_count integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'INVALID_COLLECTION_SNAPSHOT'; end if;
  delete from public.collections where user_id = auth.uid();
  insert into public.collections
  select (jsonb_populate_record(null::public.collections, (item - 'user_id') || jsonb_build_object('user_id', auth.uid()))).*
  from jsonb_array_elements(p_items) as source(item);
  get diagnostics restored_count = row_count;
  return restored_count;
end;
$$;
revoke all on function public.restore_collections_snapshot(jsonb) from public;
grant execute on function public.restore_collections_snapshot(jsonb) to authenticated;

-- Полная замена снимка выполняется одной транзакцией. Любая ошибка приведения
-- типов, ограничения или вставки откатывает все удаления этой функции.
create or replace function public.restore_database_snapshot(p_snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  section_name text;
  workshop_printers jsonb;
  workshop_filaments jsonb;
begin
  if current_user_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_snapshot) is distinct from 'object' then raise exception 'INVALID_DATABASE_SNAPSHOT'; end if;
  perform pg_advisory_xact_lock(hashtextextended('restore_database_snapshot:' || current_user_id::text, 0));
  -- Preserve spatial links when inventory records are replaced with the same IDs.
  perform pg_advisory_xact_lock(hashtextextended('workshop:' || current_user_id::text, 0));
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into workshop_printers
    from public.workshop_printer_placements p where p.user_id = current_user_id;
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into workshop_filaments
    from public.workshop_filament_placements p where p.user_id = current_user_id;


  foreach section_name in array array[
    'printers', 'filaments', 'settings', 'collections',
    'saved_calculations', 'orders', 'monthly_goals'
  ]
  loop
    if p_snapshot ? section_name and jsonb_typeof(p_snapshot->section_name) <> 'array' then
      raise exception 'INVALID_DATABASE_SNAPSHOT_SECTION: %', section_name;
    end if;
  end loop;

  if p_snapshot ? 'monthly_goals' then
    delete from public.monthly_goals where user_id = current_user_id;
  end if;
  if p_snapshot ? 'orders' then
    delete from public.orders where user_id = current_user_id;
  end if;
  if p_snapshot ? 'saved_calculations' then
    delete from public.saved_calculations where user_id = current_user_id;
  end if;
  if p_snapshot ? 'collections' then
    delete from public.collections where user_id = current_user_id;
  end if;
  if p_snapshot ? 'settings' then
    delete from public.settings where user_id = current_user_id;
  end if;
  if p_snapshot ? 'filaments' then
    delete from public.filaments where user_id = current_user_id;
  end if;
  if p_snapshot ? 'printers' then
    delete from public.printers where user_id = current_user_id;
  end if;

  if p_snapshot ? 'printers' then
    insert into public.printers
    select (jsonb_populate_record(
      null::public.printers,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'printers') as source(item);
  end if;

  if p_snapshot ? 'filaments' then
    insert into public.filaments
    select (jsonb_populate_record(
      null::public.filaments,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'filaments') as source(item);
  end if;

  if p_snapshot ? 'settings' then
    if exists (
      select 1 from jsonb_array_elements(p_snapshot->'settings') as source(item)
      where nullif(item->>'default_printer_id', '') is not null
        and not exists (
          select 1 from public.printers
          where id = (item->>'default_printer_id')::uuid and user_id = current_user_id
        )
    ) then raise exception 'PRINTER_FORBIDDEN'; end if;
    insert into public.settings
    select (jsonb_populate_record(
      null::public.settings,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'updated_at', coalesce(nullif(item->>'updated_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'settings') as source(item);
  end if;

  if p_snapshot ? 'collections' then
    insert into public.collections
    select (jsonb_populate_record(
      null::public.collections,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'collections') as source(item);
  end if;

  if p_snapshot ? 'saved_calculations' then
    insert into public.saved_calculations
    select (jsonb_populate_record(
      null::public.saved_calculations,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'saved_calculations') as source(item);
  end if;

  if p_snapshot ? 'orders' then
    insert into public.orders
    select (jsonb_populate_record(
      null::public.orders,
      jsonb_build_object('quantity', 1) || (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'orders') as source(item);

    insert into public.order_counters as counters (user_id, next_number)
    values (
      current_user_id,
      greatest(
        coalesce((select max(order_number) + 1 from public.orders where user_id = current_user_id), 1001),
        1001
      )
    )
    on conflict (user_id) do update set next_number = excluded.next_number;
  end if;

  if p_snapshot ? 'monthly_goals' then
    insert into public.monthly_goals
    select (jsonb_populate_record(
      null::public.monthly_goals,
      (item - 'user_id') || jsonb_build_object(
        'id', coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
        'user_id', current_user_id,
        'created_at', coalesce(nullif(item->>'created_at', '')::timestamptz, now()),
        'updated_at', coalesce(nullif(item->>'updated_at', '')::timestamptz, now())
      )
    )).*
    from jsonb_array_elements(p_snapshot->'monthly_goals') as source(item);
  end if;

  if p_snapshot ? 'printers' then
    insert into public.workshop_printer_placements
    select p.* from jsonb_populate_recordset(null::public.workshop_printer_placements, workshop_printers) p
    where exists(select 1 from public.printers i where i.id=p.printer_id and i.user_id=current_user_id);
  end if;
  if p_snapshot ? 'filaments' then
    insert into public.workshop_filament_placements
    select p.* from jsonb_populate_recordset(null::public.workshop_filament_placements, workshop_filaments) p
    where exists(select 1 from public.filaments i where i.id=p.filament_id and i.user_id=current_user_id);
  end if;
  if p_snapshot ? 'printers' or p_snapshot ? 'filaments' then
    update public.workshop_revisions set revision=revision+1 where user_id=current_user_id;
  end if;
end;
$$;

revoke all on function public.restore_database_snapshot(jsonb) from public;
grant execute on function public.restore_database_snapshot(jsonb) to authenticated;


-- Workshop schema (2026-09-23)
-- Workshop v1. Run in Supabase Dashboard > SQL Editor after the canonical schema.
-- No inventory records are created, copied or deleted by these RPCs.
begin;

create unique index if not exists printers_id_owner_unique on public.printers(id, user_id);
create unique index if not exists filaments_id_owner_unique on public.filaments(id, user_id);

create table if not exists public.workshop_revisions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision > 0)
);
create table if not exists public.workshop_rooms (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  width_m numeric not null check (width_m between 4 and 40),
  depth_m numeric not null check (depth_m between 4 and 40),
  sort_order integer not null,
  camera_x numeric, camera_y numeric, camera_z numeric, camera_span numeric,
  unique (id, user_id),
  check ((camera_x is null and camera_y is null and camera_z is null and camera_span is null)
    or (camera_x is not null and camera_y is not null and camera_z is not null and camera_span is not null
      and camera_x between -100000 and 100000 and camera_y between -100000 and 100000
      and camera_z between -100000 and 100000 and camera_span > 0 and camera_span < 100000))
);
alter table public.workshop_rooms add column if not exists camera_azimuth numeric check (camera_azimuth between -1000 and 1000);
alter table public.workshop_rooms add column if not exists camera_top boolean;
create table if not exists public.workshop_furniture (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null,
  name text not null,
  kind text not null check (kind in ('table', 'printer_rack', 'filament_rack', 'wall_filament_rack', 'plant', 'boxes', 'cabinet')),
  x numeric not null check (x between -100000 and 100000),
  z numeric not null check (z between -100000 and 100000),
  rotation integer not null check (rotation in (0, 90, 180, 270)),
  width numeric not null check (width > 0 and width < 100000),
  depth numeric not null check (depth > 0 and depth < 100000),
  height numeric not null check (height > 0 and height < 100000),
  levels integer not null check (levels > 0),
  columns integer not null check (columns > 0),
  sort_order integer not null,
  unique (id, user_id),
  foreign key (room_id, user_id) references public.workshop_rooms(id, user_id) on delete cascade
);
create table if not exists public.workshop_slots (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  furniture_id uuid not null,
  kind text not null check (kind in ('printer', 'filament')),
  slot_index integer not null check (slot_index >= 0),
  x numeric not null check (x between -100000 and 100000),
  y numeric not null check (y between -100000 and 100000),
  z numeric not null check (z between -100000 and 100000),
  sort_order integer not null,
  unique (id, user_id, kind),
  unique (furniture_id, kind, slot_index),
  foreign key (furniture_id, user_id) references public.workshop_furniture(id, user_id) on delete cascade
);
create table if not exists public.workshop_printer_placements (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  printer_id uuid not null,
  slot_id uuid not null unique,
  kind text not null default 'printer' check (kind = 'printer'),
  model text not null check (model in ('a1', 'p1')),
  sort_order integer not null,
  unique (printer_id, user_id),
  foreign key (printer_id, user_id) references public.printers(id, user_id) on delete cascade,
  foreign key (slot_id, user_id, kind) references public.workshop_slots(id, user_id, kind) on delete cascade
);
create table if not exists public.workshop_filament_placements (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  filament_id uuid not null,
  slot_id uuid not null unique,
  kind text not null default 'filament' check (kind = 'filament'),
  model text not null check (model in ('a1', 'p1')),
  sort_order integer not null,
  unique (filament_id, user_id),
  foreign key (filament_id, user_id) references public.filaments(id, user_id) on delete cascade,
  foreign key (slot_id, user_id, kind) references public.workshop_slots(id, user_id, kind) on delete cascade
);

create index if not exists workshop_rooms_owner on public.workshop_rooms(user_id);
create index if not exists workshop_furniture_owner on public.workshop_furniture(user_id);
create index if not exists workshop_furniture_room on public.workshop_furniture(room_id, user_id);
create index if not exists workshop_slots_owner on public.workshop_slots(user_id);
create index if not exists workshop_printers_owner on public.workshop_printer_placements(user_id);
create index if not exists workshop_filaments_owner on public.workshop_filament_placements(user_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['workshop_revisions', 'workshop_rooms', 'workshop_furniture',
    'workshop_slots', 'workshop_printer_placements', 'workshop_filament_placements'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('drop policy if exists workshop_owner on public.%I', table_name);
    execute format('create policy workshop_owner on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
  end loop;
end;
$$;

alter table public.workshop_rooms add column if not exists spatial_metadata jsonb not null default '{}'::jsonb
  check (jsonb_typeof(spatial_metadata) = 'object');

-- Validate before replacing normalized rows, inside the same CAS transaction.
create or replace function public.validate_workshop_spatial(rooms jsonb)
returns void language plpgsql immutable security invoker set search_path = '' as $$
declare room jsonb; label jsonb; link jsonb; cursor_id text; visited text[]; parent jsonb;
begin
  if jsonb_typeof(rooms) is distinct from 'array' then
    raise exception 'INVALID_WORKSHOP_SPATIAL' using errcode = '22023';
  end if;
  if jsonb_array_length(rooms)>50 then
    raise exception 'INVALID_WORKSHOP_SPATIAL: room count' using errcode='22023';
  end if;
  for room in select value from jsonb_array_elements(rooms) loop
    if jsonb_typeof(room->'width') is distinct from 'number' or jsonb_typeof(room->'depth') is distinct from 'number' then
      raise exception 'INVALID_WORKSHOP_SPATIAL: dimensions' using errcode='22023';
    end if;
    if (room->>'width')::numeric not between 4 and 40 or (room->>'depth')::numeric not between 4 and 40 then
      raise exception 'INVALID_WORKSHOP_SPATIAL: dimensions' using errcode='22023';
    end if;
    if room ? 'attachment' then
      link := room->'attachment';
      if jsonb_typeof(link) is distinct from 'object'
        or jsonb_typeof(link->'roomId') is distinct from 'string'
        or coalesce(link->>'side','') not in ('north','east','south','west')
        or not exists(select 1 from jsonb_array_elements(rooms) r where r->>'id'=link->>'roomId') then
        raise exception 'INVALID_WORKSHOP_SPATIAL: attachment' using errcode = '22023';
      end if;
      visited := array[room->>'id'];
      cursor_id := link->>'roomId';
      while cursor_id is not null loop
        if cursor_id = any(visited) then
          raise exception 'INVALID_WORKSHOP_SPATIAL: cycle' using errcode = '22023';
        end if;
        visited := array_append(visited,cursor_id);
        select r into parent from jsonb_array_elements(rooms) r where r->>'id'=cursor_id;
        cursor_id := parent#>>'{attachment,roomId}';
      end loop;
    end if;
    if room ? 'labels' then
      if jsonb_typeof(room->'labels') is distinct from 'array' then
        raise exception 'INVALID_WORKSHOP_SPATIAL: labels' using errcode = '22023';
      end if;
      if jsonb_array_length(room->'labels') > 100 or exists (
        select 1 from jsonb_array_elements(room->'labels') l group by l->>'id' having count(*)>1
      ) then raise exception 'INVALID_WORKSHOP_SPATIAL: labels' using errcode = '22023'; end if;
      for label in select value from jsonb_array_elements(room->'labels') loop
        if jsonb_typeof(label) is distinct from 'object'
          or jsonb_typeof(label->'id') is distinct from 'string' or length(label->>'id') not between 1 and 128
          or jsonb_typeof(label->'text') is distinct from 'string' or (length(btrim(label->>'text')) = 0 or length(label->>'text') > 120 or (label->>'text') ~ '[[:cntrl:]]')
          or coalesce(label->>'color','') !~ '^#[0-9a-fA-F]{6}$'
          or coalesce(label->>'surface','') not in ('floor','north','east','south','west')
          or jsonb_typeof(label->'u') is distinct from 'number' or jsonb_typeof(label->'v') is distinct from 'number'
          or jsonb_typeof(label->'size') is distinct from 'number'
          or (label ? 'rotation' and jsonb_typeof(label->'rotation') is distinct from 'number') then
          raise exception 'INVALID_WORKSHOP_SPATIAL: label shape' using errcode = '22023';
        end if;
        if (label->>'u')::numeric not between 0 and 1 or (label->>'v')::numeric not between 0 and 1
          or (label->>'size')::numeric not between 0.1 and 10
          or (label ? 'rotation' and (label->>'rotation')::numeric not between -360 and 360) then
          raise exception 'INVALID_WORKSHOP_SPATIAL: label bounds' using errcode = '22023';
        end if;
      end loop;
    end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(rooms) r where r ? 'attachment'
    group by r#>>'{attachment,roomId}',r#>>'{attachment,side}' having count(*)>1) then
    raise exception 'INVALID_WORKSHOP_SPATIAL: occupied side' using errcode = '22023';
  end if;
  -- Legacy independent rooms are normalized by the client on first load.
  -- Once attachment metadata exists, enforce the same single tree as the client.
  if exists(select 1 from jsonb_array_elements(rooms) r where r ? 'attachment') then
    if (select count(*) from jsonb_array_elements(rooms) r where not r ? 'attachment')<>1 then
      raise exception 'INVALID_WORKSHOP_SPATIAL: root count' using errcode='22023';
    end if;
    if exists(select 1 from jsonb_array_elements(rooms) child
      join jsonb_array_elements(rooms) parent_room on parent_room->>'id'=child#>>'{attachment,roomId}'
      where child#>>'{attachment,side}'=case parent_room#>>'{attachment,side}'
        when 'north' then 'south' when 'south' then 'north' when 'east' then 'west' when 'west' then 'east' end) then
      raise exception 'INVALID_WORKSHOP_SPATIAL: parent-facing side' using errcode='22023';
    end if;
    if exists(
      with recursive origins as (
        select r->>'id' id, (r->>'width')::numeric w, (r->>'depth')::numeric d, 0::numeric x, 0::numeric z
          from jsonb_array_elements(rooms) r where not r ? 'attachment'
        union all
        select r->>'id', (r->>'width')::numeric, (r->>'depth')::numeric,
          p.x + case r#>>'{attachment,side}' when 'east' then (p.w+(r->>'width')::numeric)/2 when 'west' then -(p.w+(r->>'width')::numeric)/2 else 0 end,
          p.z + case r#>>'{attachment,side}' when 'south' then (p.d+(r->>'depth')::numeric)/2 when 'north' then -(p.d+(r->>'depth')::numeric)/2 else 0 end
          from origins p join jsonb_array_elements(rooms) r on r#>>'{attachment,roomId}'=p.id
      )
      select 1 from origins a join origins b on a.id<b.id
        where abs(a.x-b.x)<(a.w+b.w)/2-0.000001 and abs(a.z-b.z)<(a.d+b.d)/2-0.000001
    ) then raise exception 'INVALID_WORKSHOP_SPATIAL: overlap' using errcode='22023'; end if;
  end if;
end;
$$;
revoke all on function public.validate_workshop_spatial(jsonb) from public, anon;
grant execute on function public.validate_workshop_spatial(jsonb) to authenticated;

create or replace function public.get_workshop()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); result jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select jsonb_build_object('revision', r.revision, 'layout', jsonb_build_object(
    'version', 1,
    'rooms', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'width', width_m, 'depth', depth_m)
      || spatial_metadata
      || case when camera_x is null then '{}'::jsonb else jsonb_build_object('camera', jsonb_build_object('x', camera_x, 'y', camera_y, 'z', camera_z, 'span', camera_span) || jsonb_strip_nulls(jsonb_build_object('azimuth', camera_azimuth, 'top', camera_top))) end order by sort_order)
      from public.workshop_rooms where user_id = owner_id), '[]'::jsonb),
    'furniture', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'roomId', room_id, 'name', name, 'kind', kind,
      'x', x, 'z', z, 'rotation', rotation, 'width', width, 'depth', depth, 'height', height, 'levels', levels, 'columns', columns) order by sort_order)
      from public.workshop_furniture where user_id = owner_id), '[]'::jsonb),
    'slots', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'furnitureId', furniture_id, 'kind', kind, 'index', slot_index, 'x', x, 'y', y, 'z', z) order by sort_order)
      from public.workshop_slots where user_id = owner_id), '[]'::jsonb),
    'placements', coalesce((select jsonb_agg(item order by sort_order) from (
      select jsonb_build_object('id', id, 'entityId', printer_id, 'kind', kind, 'slotId', slot_id, 'model', model) item, sort_order
        from public.workshop_printer_placements where user_id = owner_id
      union all
      select jsonb_build_object('id', id, 'entityId', filament_id, 'kind', kind, 'slotId', slot_id, 'model', model), sort_order
        from public.workshop_filament_placements where user_id = owner_id
    ) placements), '[]'::jsonb)
  )) into result from public.workshop_revisions r where r.user_id = owner_id;
  return result;
end;
$$;

create or replace function public.save_workshop_spatial(payload jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); current_revision bigint; new_revision bigint; field text;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if payload is null or jsonb_typeof(payload) <> 'object' or payload->'version' is distinct from '1'::jsonb then
    raise exception 'INVALID_WORKSHOP' using errcode = '22023';
  end if;
  foreach field in array array['rooms', 'furniture', 'slots', 'placements'] loop
    if jsonb_typeof(payload->field) is distinct from 'array' then
      raise exception 'INVALID_WORKSHOP: % must be an array', field using errcode = '22023';
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(payload->'placements') p where p->>'kind' is null or p->>'kind' not in ('printer', 'filament')) then
    raise exception 'INVALID_WORKSHOP: placement kind' using errcode = '22023';
  end if;
  perform public.validate_workshop_spatial(payload->'rooms');
  -- Also serialize initial creates, for which no revision row exists yet.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('workshop:' || owner_id::text, 0));
  select revision into current_revision from public.workshop_revisions where user_id = owner_id for update;
  if current_revision is distinct from expected_revision then
    raise exception 'WORKSHOP_REVISION_CONFLICT' using errcode = '40001';
  end if;
  new_revision := coalesce(current_revision, 0) + 1;
  delete from public.workshop_rooms where user_id = owner_id;
  insert into public.workshop_rooms (id, user_id, name, width_m, depth_m, sort_order, camera_x, camera_y, camera_z, camera_span, camera_azimuth, camera_top, spatial_metadata)
  select (p->>'id')::uuid, owner_id, p->>'name', (p->>'width')::numeric, (p->>'depth')::numeric, n::integer,
    (p#>>'{camera,x}')::numeric, (p#>>'{camera,y}')::numeric, (p#>>'{camera,z}')::numeric, (p#>>'{camera,span}')::numeric, (p#>>'{camera,azimuth}')::numeric, (p#>>'{camera,top}')::boolean,
    (case when p ? 'attachment' then jsonb_build_object('attachment',p->'attachment') else '{}'::jsonb end)
    || (case when p ? 'labels' then jsonb_build_object('labels',p->'labels') else '{}'::jsonb end)
  from jsonb_array_elements(payload->'rooms') with ordinality a(p,n);
  insert into public.workshop_furniture (id, user_id, room_id, name, kind, x, z, rotation, width, depth, height, levels, columns, sort_order)
  select (p->>'id')::uuid, owner_id, (p->>'roomId')::uuid, p->>'name', p->>'kind', (p->>'x')::numeric, (p->>'z')::numeric,
    (p->>'rotation')::integer, (p->>'width')::numeric, (p->>'depth')::numeric, (p->>'height')::numeric,
    (p->>'levels')::integer, (p->>'columns')::integer, n::integer
  from jsonb_array_elements(payload->'furniture') with ordinality a(p,n);
  insert into public.workshop_slots (id, user_id, furniture_id, kind, slot_index, x, y, z, sort_order)
  select (p->>'id')::uuid, owner_id, (p->>'furnitureId')::uuid, p->>'kind', (p->>'index')::integer,
    (p->>'x')::numeric, (p->>'y')::numeric, (p->>'z')::numeric, n::integer
  from jsonb_array_elements(payload->'slots') with ordinality a(p,n);
  insert into public.workshop_printer_placements (id, user_id, printer_id, slot_id, model, sort_order)
  select (p->>'id')::uuid, owner_id, (p->>'entityId')::uuid, (p->>'slotId')::uuid, p->>'model', n::integer
  from jsonb_array_elements(payload->'placements') with ordinality a(p,n) where p->>'kind' = 'printer';
  insert into public.workshop_filament_placements (id, user_id, filament_id, slot_id, model, sort_order)
  select (p->>'id')::uuid, owner_id, (p->>'entityId')::uuid, (p->>'slotId')::uuid, p->>'model', n::integer
  from jsonb_array_elements(payload->'placements') with ordinality a(p,n) where p->>'kind' = 'filament';
  insert into public.workshop_revisions(user_id, revision) values (owner_id, new_revision)
    on conflict (user_id) do update set revision = excluded.revision;
  return new_revision;
end;
$$;

-- An old client must not erase metadata it does not understand. Serialize this
-- check with the versioned writer, then delegate to the same atomic CAS path.
create or replace function public.save_workshop(payload jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if jsonb_typeof(payload->'rooms') is distinct from 'array' then
    raise exception 'INVALID_WORKSHOP: rooms' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('workshop:' || owner_id::text, 0));
  if exists(
    select 1 from public.workshop_rooms existing
    where existing.user_id=owner_id and existing.spatial_metadata<>'{}'::jsonb
      and not exists(select 1 from jsonb_array_elements(payload->'rooms') incoming
        where incoming->>'id'=existing.id::text
          and (not existing.spatial_metadata ? 'attachment' or incoming ? 'attachment')
          and (not existing.spatial_metadata ? 'labels' or incoming ? 'labels'))
  ) then raise exception 'WORKSHOP_SPATIAL_CLIENT_REQUIRED' using errcode='22023'; end if;
  return public.save_workshop_spatial(payload,expected_revision);
end;
$$;

revoke all on function public.get_workshop() from public, anon;
revoke all on function public.save_workshop(jsonb, bigint) from public, anon;
grant execute on function public.get_workshop() to authenticated;
grant execute on function public.save_workshop(jsonb, bigint) to authenticated;

-- Versioned names are the capability handshake: old servers must never accept
-- a spatial save through the legacy API and silently discard room metadata.
create or replace function public.get_workshop_spatial()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select public.get_workshop();
$$;
revoke all on function public.get_workshop_spatial() from public, anon;
revoke all on function public.save_workshop_spatial(jsonb,bigint) from public, anon;
grant execute on function public.get_workshop_spatial() to authenticated;
grant execute on function public.save_workshop_spatial(jsonb,bigint) to authenticated;

commit;

-- BEGIN BUSINESS FOUNDATION 20260929
-- Phase 1 foundation. Run after the existing 3D Labs base schema.
-- Additive only: no recalculation, stock consumption or legacy row deletion.
begin;

create unique index if not exists filaments_owner_identity on public.filaments(user_id, id);
create unique index if not exists products_owner_identity on public.saved_calculations(user_id, id);
create unique index if not exists orders_owner_identity on public.orders(user_id, id);

create table if not exists public.filament_manufacturers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null check (length(btrim(name)) > 0),
  unique(user_id, id), unique(user_id, name)
);
create table if not exists public.material_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null check (length(btrim(name)) > 0),
  difficulty_id text,
  unique(user_id, id), unique(user_id, name)
);
create table if not exists public.material_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  manufacturer_id uuid,
  material_type_id uuid,
  name text not null check (length(btrim(name)) > 0),
  unique(user_id, id),
  foreign key(user_id, manufacturer_id) references public.filament_manufacturers(user_id, id),
  foreign key(user_id, material_type_id) references public.material_types(user_id, id)
);
create table if not exists public.filament_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  material_line_id uuid,
  legacy_filament_id uuid,
  name text not null,
  color text not null default '#808080',
  stock_g numeric(20,6) not null default 0 check (stock_g >= 0 and stock_g <> 'NaN'::numeric),
  average_cost_per_g numeric(20,8) not null default 0 check (average_cost_per_g >= 0 and average_cost_per_g <> 'NaN'::numeric),
  revision bigint not null default 0 check (revision >= 0),
  unique(user_id, id), unique(user_id, legacy_filament_id),
  foreign key(user_id, material_line_id) references public.material_lines(user_id, id),
  foreign key(user_id, legacy_filament_id) references public.filaments(user_id, id) on delete set null (legacy_filament_id)
);
create table if not exists public.filament_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  variant_id uuid not null,
  weight_g numeric(20,6) not null check (weight_g > 0 and weight_g <> 'NaN'::numeric),
  total_price numeric(20,6) not null check (total_price >= 0 and total_price <> 'NaN'::numeric),
  purchased_at timestamptz not null default now(),
  event_key text not null check (length(event_key) > 0),
  unique(user_id, id), unique(user_id, event_key),
  foreign key(user_id, variant_id) references public.filament_variants(user_id, id)
);
create table if not exists public.calculation_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  revision bigint not null default 0 check (revision >= 0),
  discount_percent numeric(8,4) not null default 0 check (discount_percent between 0 and 100),
  discount_amount numeric(20,6) not null default 0 check (discount_amount >= 0 and discount_amount <> 'NaN'::numeric),
  urgency_percent numeric(12,4) not null default 0 check (urgency_percent >= 0 and urgency_percent <> 'NaN'::numeric),
  urgency_amount numeric(20,6) not null default 0 check (urgency_amount >= 0 and urgency_amount <> 'NaN'::numeric),
  agreed_price numeric(20,6) check (agreed_price >= 0 and agreed_price <> 'NaN'::numeric),
  unique(user_id, id)
);
create table if not exists public.calculation_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  project_id uuid not null,
  product_id uuid,
  name text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  quantity integer not null check (quantity > 0),
  inputs jsonb not null check (jsonb_typeof(inputs) = 'object'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  recipe jsonb not null check (jsonb_typeof(recipe) = 'object'),
  unique(user_id, id),
  foreign key(user_id, project_id) references public.calculation_projects(user_id, id) on delete cascade,
  foreign key(user_id, product_id) references public.saved_calculations(user_id, id) on delete set null (product_id)
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  order_id uuid,
  source_order_id text not null,
  product_id uuid,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(20,8) not null check (unit_cost >= 0 and unit_cost <> 'NaN'::numeric),
  total_cost numeric(20,6) not null check (total_cost >= 0 and total_cost <> 'NaN'::numeric),
  unit_price numeric(20,8) not null check (unit_price >= 0 and unit_price <> 'NaN'::numeric),
  total_price numeric(20,6) not null check (total_price >= 0 and total_price <> 'NaN'::numeric),
  cost_provenance text not null check (cost_provenance in ('legacy','estimate','finished_stock','production','mixed')),
  fulfilled_quantity integer not null default 0 check (fulfilled_quantity between 0 and quantity),
  production_quantity integer not null default 0 check (production_quantity between 0 and fulfilled_quantity),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and snapshot->>'version' IS NOT DISTINCT FROM '1' and jsonb_typeof(snapshot->'order') IS NOT DISTINCT FROM 'object'),
  legacy_key text,
  unique(user_id, id), unique(user_id, legacy_key),
  foreign key(user_id, order_id) references public.orders(user_id, id) on delete set null (order_id),
  foreign key(user_id, product_id) references public.saved_calculations(user_id, id) on delete set null (product_id)
);
create table if not exists public.production_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_key text not null check (length(event_key) > 0),
  product_id uuid,
  order_item_id uuid,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(20,8) not null check (unit_cost >= 0 and unit_cost <> 'NaN'::numeric),
  recipe_snapshot jsonb not null check (jsonb_typeof(recipe_snapshot) = 'object'),
  unique(user_id, id), unique(user_id, event_key),
  foreign key(user_id, product_id) references public.saved_calculations(user_id, id) on delete set null (product_id),
  foreign key(user_id, order_item_id) references public.order_items(user_id, id)
);
create table if not exists public.filament_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  variant_id uuid not null,
  event_key text not null check (length(event_key) > 0),
  source text not null check (source in ('purchase','production','order','manual_adjustment','opening_balance','finished_return')),
  source_id text not null,
  delta_g numeric(20,6) not null check (delta_g <> 'NaN'::numeric),
  unit_cost_per_g numeric(20,8) not null check (unit_cost_per_g >= 0 and unit_cost_per_g <> 'NaN'::numeric),
  balance_after_g numeric(20,6) not null check (balance_after_g >= 0 and balance_after_g <> 'NaN'::numeric),
  unique(user_id, id), unique(user_id, event_key, variant_id),
  foreign key(user_id, variant_id) references public.filament_variants(user_id, id)
);
create table if not exists public.filament_deficits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  variant_id uuid not null,
  event_key text not null check (length(event_key) > 0),
  source_id text not null,
  grams numeric(20,6) not null check (grams > 0 and grams <> 'NaN'::numeric),
  unique(user_id, id), unique(user_id, event_key, variant_id),
  foreign key(user_id, variant_id) references public.filament_variants(user_id, id)
);
create table if not exists public.finished_stock_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  product_id uuid,
  source_product_id text not null,
  quantity integer not null default 0 check (quantity >= 0),
  average_unit_cost numeric(20,8) not null default 0 check (average_unit_cost >= 0 and average_unit_cost <> 'NaN'::numeric),
  revision bigint not null default 0 check (revision >= 0),
  unique(user_id, id), unique(user_id, source_product_id),
  foreign key(user_id, product_id) references public.saved_calculations(user_id, id) on delete set null (product_id)
);
create table if not exists public.finished_stock_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  product_id uuid,
  source_product_id text not null,
  order_item_id uuid,
  production_event_id uuid,
  event_key text not null check (length(event_key) > 0),
  source text not null check (source in ('purchase','production','order','manual_adjustment','opening_balance','finished_return')),
  delta_quantity integer not null,
  unit_cost numeric(20,8) not null check (unit_cost >= 0 and unit_cost <> 'NaN'::numeric),
  balance_after integer not null check (balance_after >= 0),
  unique(user_id, id), unique(user_id, event_key, source_product_id),
  foreign key(user_id, product_id) references public.saved_calculations(user_id, id) on delete set null (product_id),
  foreign key(user_id, order_item_id) references public.order_items(user_id, id),
  foreign key(user_id, production_event_id) references public.production_events(user_id, id)
);

-- Owner-leading indexes support both RLS filtering and child lookups.
create index if not exists material_lines_manufacturer on public.material_lines(user_id, manufacturer_id);
create index if not exists material_lines_type on public.material_lines(user_id, material_type_id);
create index if not exists filament_variants_line on public.filament_variants(user_id, material_line_id);
create index if not exists filament_purchases_history on public.filament_purchases(user_id, variant_id, purchased_at);
create index if not exists calculation_items_project on public.calculation_items(user_id, project_id, sort_order);
create index if not exists calculation_items_product on public.calculation_items(user_id, product_id);
create index if not exists order_items_order on public.order_items(user_id, order_id);
create index if not exists order_items_source_order on public.order_items(user_id, source_order_id);
create index if not exists order_items_product on public.order_items(user_id, product_id);
create index if not exists production_events_product on public.production_events(user_id, product_id);
create index if not exists production_events_item on public.production_events(user_id, order_item_id);
create index if not exists filament_movements_history on public.filament_movements(user_id, variant_id, created_at);
create index if not exists filament_deficits_variant on public.filament_deficits(user_id, variant_id);
create index if not exists finished_balances_product on public.finished_stock_balances(user_id, product_id);
create index if not exists finished_movements_product on public.finished_stock_movements(user_id, product_id, created_at);
create index if not exists finished_movements_item on public.finished_stock_movements(user_id, order_item_id);
create index if not exists finished_movements_production on public.finished_stock_movements(user_id, production_event_id);

do $policies$
declare t text;
begin
  foreach t in array array['filament_manufacturers','material_types','material_lines','filament_variants',
    'filament_purchases','calculation_projects','calculation_items','order_items','production_events',
    'filament_movements','filament_deficits','finished_stock_balances','finished_stock_movements']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists owner_access on public.%I', t);
    execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
  -- Client writes to audit rows are append-only. Production RPCs will own transitions.
  foreach t in array array['filament_purchases','filament_movements','filament_deficits','production_events','finished_stock_movements']
  loop
    execute format('revoke update, delete on public.%I from authenticated', t);
  end loop;
end
$policies$;

-- Safe one-time financial backfill. Do not join current product pricing or infer
-- historical material consumption from a legacy order's status.
insert into public.order_items(id, user_id, created_at, order_id, source_order_id, product_id,
  name, quantity, unit_cost, total_cost, unit_price, total_price, cost_provenance,
  fulfilled_quantity, production_quantity, snapshot, legacy_key)
select o.id, o.user_id, o.created_at, o.id, o.id::text,
  case when exists(select 1 from public.saved_calculations p where p.id = o.product_id and p.user_id = o.user_id) then o.product_id end,
  o.title, coalesce(o.quantity, 1)::integer, o.cost / coalesce(o.quantity, 1), o.cost,
  o.amount / coalesce(o.quantity, 1), o.amount, 'legacy', 0, 0,
  jsonb_build_object('version',1,'order',to_jsonb(o),'calculation',null,'recipe',null), o.id::text
from public.orders o
where o.type = 'income' and o.user_id is not null
  and coalesce(o.quantity, 1) between 1 and 2147483647
  and coalesce(o.quantity, 1) = trunc(coalesce(o.quantity, 1))
  and o.amount >= 0 and o.amount < 100000000000000
  and o.cost >= 0 and o.cost < 100000000000000
  and not exists(select 1 from public.order_items i where i.user_id = o.user_id and i.source_order_id = o.id::text)
on conflict do nothing;

commit;

-- END BUSINESS FOUNDATION 20260929

-- BEGIN INVENTORY TRANSACTIONS 20260929
-- Phase 2. Apply after supabase_migration_20260929_business_foundation.sql.
-- No cloud SQL is executed by the application automatically.
begin;

create table if not exists public.business_state_revisions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0)
);
create table if not exists public.business_operation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  command jsonb not null,
  revision bigint not null,
  created_at timestamptz not null default now(),
  primary key(user_id, event_key)
);
alter table public.business_state_revisions enable row level security;
alter table public.business_operation_receipts enable row level security;
revoke all on public.business_state_revisions, public.business_operation_receipts from public, anon, authenticated;
grant select on public.business_state_revisions, public.business_operation_receipts to authenticated;
drop policy if exists owner_read on public.business_state_revisions;
create policy owner_read on public.business_state_revisions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists owner_read on public.business_operation_receipts;
create policy owner_read on public.business_operation_receipts for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.business_inventory_snapshot()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  result jsonb;
  mapping record;
  rows_json jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  -- The same owner lock also protects readers from observing mixed table revisions.
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:' || owner_id::text, 0));
  result := jsonb_build_object('version', 1, 'user_id', owner_id,
    'revision', coalesce((select revision from public.business_state_revisions where user_id = owner_id), 0));
  for mapping in select * from (values
    ('manufacturers','filament_manufacturers'), ('materialTypes','material_types'),
    ('materialLines','material_lines'), ('variants','filament_variants'),
    ('purchases','filament_purchases'), ('filamentMovements','filament_movements'),
    ('deficits','filament_deficits'), ('projects','calculation_projects'),
    ('calculationItems','calculation_items'), ('orderItems','order_items'),
    ('productionEvents','production_events'), ('finishedBalances','finished_stock_balances'),
    ('finishedMovements','finished_stock_movements')) as m(key, relation)
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at,r.id), ''[]''::jsonb) from public.%I r where user_id = $1', mapping.relation)
      into rows_json using owner_id;
    result := result || jsonb_build_object(mapping.key, rows_json);
  end loop;
  return result;
end $$;

create or replace function public.commit_business_inventory(p_expected_revision bigint, p_command jsonb, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  event_id text := p_command->>'id';
  stored_command jsonb;
  current_revision bigint;
  mapping record;
  rows_json jsonb;
  invalid boolean;
  assignments text;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_command) is distinct from 'object' or event_id is null or length(event_id) not between 1 and 160 then
    raise exception 'INVALID_COMMAND';
  end if;
  if p_state->>'user_id' is distinct from owner_id::text or p_state->>'version' is distinct from '1' then
    raise exception 'INVALID_OWNER_OR_VERSION';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:' || owner_id::text, 0));
  select command into stored_command from public.business_operation_receipts where user_id = owner_id and event_key = event_id;
  if found then
    if stored_command <> p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  insert into public.business_state_revisions(user_id) values (owner_id) on conflict do nothing;
  select revision into current_revision from public.business_state_revisions where user_id = owner_id for update;
  if p_expected_revision is distinct from current_revision then raise exception 'BUSINESS_REVISION_CONFLICT'; end if;

  -- Dependency order. All writes are rolled back if any constraint or revision check fails.
  for mapping in select * from (values
    ('manufacturers','filament_manufacturers',false), ('materialTypes','material_types',false),
    ('materialLines','material_lines',false), ('variants','filament_variants',false),
    ('purchases','filament_purchases',true), ('projects','calculation_projects',false),
    ('calculationItems','calculation_items',false), ('orderItems','order_items',false),
    ('productionEvents','production_events',true), ('filamentMovements','filament_movements',true),
    ('deficits','filament_deficits',true), ('finishedBalances','finished_stock_balances',false),
    ('finishedMovements','finished_stock_movements',true)) as m(key, relation, immutable)
  loop
    rows_json := p_state->mapping.key;
    if jsonb_typeof(rows_json) is distinct from 'array' then raise exception 'INVALID_COLLECTION: %', mapping.key; end if;
    if exists(select from jsonb_array_elements(rows_json) r where r->>'user_id' is distinct from owner_id::text) then
      raise exception 'CROSS_OWNER_ROW';
    end if;
    -- No silent deletion, no cross-owner PK collision, no audit edits.
    execute format('select exists(select from public.%1$I old where old.user_id = $1 and not exists '
      '(select from jsonb_populate_recordset(null::public.%1$I,$2) incoming where incoming.id = old.id))', mapping.relation)
      into invalid using owner_id, rows_json;
    if invalid then raise exception 'INVENTORY_DELETION_NOT_SUPPORTED: %', mapping.key; end if;
    execute format('select exists(select from jsonb_populate_recordset(null::public.%1$I,$2) incoming '
      'join public.%1$I old on old.id = incoming.id where old.user_id <> $1)', mapping.relation)
      into invalid using owner_id, rows_json;
    if invalid then raise exception 'CROSS_OWNER_ID'; end if;
    if mapping.immutable then
      execute format('select exists(select from jsonb_populate_recordset(null::public.%1$I,$2) incoming '
        'join public.%1$I old on old.id = incoming.id where old.user_id = $1 and to_jsonb(old) <> to_jsonb(incoming))', mapping.relation)
        into invalid using owner_id, rows_json;
      if invalid then raise exception 'IMMUTABLE_AUDIT_ROW: %', mapping.key; end if;
      execute format('insert into public.%1$I select incoming.* from jsonb_populate_recordset(null::public.%1$I,$1) incoming on conflict(id) do nothing', mapping.relation)
        using rows_json;
    else
      select string_agg(format('%1$I = excluded.%1$I', a.attname), ',') into assignments
        from pg_attribute a where a.attrelid = format('public.%I', mapping.relation)::regclass
        and a.attnum > 0 and not a.attisdropped and a.attname not in ('id','user_id','created_at');
      execute format('insert into public.%1$I select incoming.* from jsonb_populate_recordset(null::public.%1$I,$1) incoming '
        'on conflict(id) do update set %2$s where public.%1$I.user_id = excluded.user_id', mapping.relation, assignments)
        using rows_json;
    end if;
  end loop;
  -- Keep the legacy product view consistent while later stages adopt the ledger.
  update public.saved_calculations p set stock_quantity = b.quantity
    from public.finished_stock_balances b where b.user_id = owner_id and p.user_id = owner_id and p.id = b.product_id;
  update public.business_state_revisions set revision = current_revision + 1 where user_id = owner_id;
  insert into public.business_operation_receipts(user_id,event_key,command,revision)
    values (owner_id,event_id,p_command,current_revision + 1);
  return public.business_inventory_snapshot();
end $$;
revoke all on function public.business_inventory_snapshot() from public, anon;
revoke all on function public.commit_business_inventory(bigint,jsonb,jsonb) from public, anon;
grant execute on function public.business_inventory_snapshot() to authenticated;
grant execute on function public.commit_business_inventory(bigint,jsonb,jsonb) to authenticated;

commit;
-- END INVENTORY TRANSACTIONS 20260929

-- BEGIN LEGACY INVENTORY BRIDGE 20260930
-- Stage 2 compatibility bridge. Apply after the business foundation and inventory
-- transaction migrations. Keep legacy order RPCs usable until stage 5 replaces them.
begin;

create or replace function public.legacy_stock_inventory_bridge()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := new.user_id;
  old_stock integer := coalesce(old.stock_quantity, 0);
  new_stock integer := coalesce(new.stock_quantity, 0);
  balance public.finished_stock_balances%rowtype;
  event_id uuid;
  order_id text := nullif(pg_catalog.current_setting('business_inventory.legacy_order_id', true), '');
  command_id text := nullif(pg_catalog.current_setting('business_inventory.legacy_command_id', true), '');
  movement_cost numeric;
  movement_key text;
begin
  if owner_id is null or old.user_id is distinct from owner_id then
    raise exception 'LEGACY_INVENTORY_OWNER_CHANGED';
  end if;
  if old_stock = new_stock then return new; end if;
  -- The original save returns and reserves even an unchanged reservation.
  -- Ignore those temporary writes: only its final legacy projection matters.
  if pg_catalog.current_setting('business_inventory.legacy_skip_bridge', true) = 'on' then
    return new;
  end if;

  -- Known order RPC wrappers take this lock before their first row lock. The
  -- transaction RPC holds it already when it writes its legacy projection.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
  select * into balance from public.finished_stock_balances
    where user_id = owner_id and source_product_id = new.id::text for update;
  if not found then
    -- A product made by the old editor may not have an opening balance yet.
    insert into public.finished_stock_balances(
      user_id, product_id, source_product_id, quantity, average_unit_cost)
    values (owner_id, new.id, new.id::text, old_stock,
      coalesce(pg_catalog.round((old.base_cost / nullif(old.quantity, 0))::numeric, 8), 0))
    returning * into balance;
  end if;

  -- commit_business_inventory has already written the authoritative ledger.
  -- Its following saved_calculations update must not create a second movement
  -- or increment the revision again.
  if balance.quantity = new_stock then return new; end if;
  if balance.quantity <> old_stock then
    raise exception 'LEGACY_INVENTORY_STALE' using hint = 'Reload inventory before changing legacy stock';
  end if;

  movement_cost := balance.average_unit_cost;
  if order_id is not null and new_stock > old_stock then
    select m.unit_cost into movement_cost from public.finished_stock_movements m
      where m.user_id = owner_id and m.source_product_id = new.id::text
        and m.source = 'order' and m.delta_quantity < 0
        and m.event_key like 'legacy-order:' || order_id || ':%'
      order by m.created_at desc, m.id desc limit 1;
    -- Historical orders predate the immutable reservation ledger. Their actual
    -- basis cannot be reconstructed; explicitly retain current average cost.
    movement_cost := coalesce(movement_cost, balance.average_unit_cost);
  end if;
  update public.finished_stock_balances
    set quantity = new_stock, revision = revision + 1,
      average_unit_cost = case when new_stock > old_stock then
        pg_catalog.round((old_stock * balance.average_unit_cost
          + (new_stock - old_stock) * movement_cost) / new_stock, 8)
        else balance.average_unit_cost end
    where id = balance.id and user_id = owner_id;
  event_id := pg_catalog.gen_random_uuid();
  movement_key := case when order_id is null then 'legacy-stock:' || event_id::text
    else 'legacy-order:' || order_id || ':' || coalesce(command_id, event_id::text)
      || case when new_stock > old_stock then ':release' else ':reserve' end end;
  insert into public.finished_stock_movements(
    user_id, product_id, source_product_id, event_key, source, created_at,
    delta_quantity, unit_cost, balance_after)
  values (owner_id, new.id, new.id::text, movement_key,
    case when order_id is null then 'manual_adjustment' else 'order' end,
    pg_catalog.clock_timestamp(), new_stock - old_stock, movement_cost, new_stock);
  insert into public.business_state_revisions(user_id, revision) values (owner_id, 1)
    on conflict (user_id) do update
      set revision = public.business_state_revisions.revision + 1;
  return new;
end $$;

revoke all on function public.legacy_stock_inventory_bridge() from public, anon, authenticated;
drop trigger if exists legacy_stock_inventory_bridge on public.saved_calculations;
create trigger legacy_stock_inventory_bridge
  after update of stock_quantity on public.saved_calculations
  for each row when (old.stock_quantity is distinct from new.stock_quantity)
  execute function public.legacy_stock_inventory_bridge();

create or replace function public.legacy_inventory_has_rows(p_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.filament_manufacturers where user_id = p_owner)
    or exists(select 1 from public.material_types where user_id = p_owner)
    or exists(select 1 from public.material_lines where user_id = p_owner)
    or exists(select 1 from public.filament_variants where user_id = p_owner)
    or exists(select 1 from public.filament_purchases where user_id = p_owner)
    or exists(select 1 from public.filament_movements where user_id = p_owner)
    or exists(select 1 from public.filament_deficits where user_id = p_owner)
    or exists(select 1 from public.calculation_projects where user_id = p_owner)
    or exists(select 1 from public.calculation_items where user_id = p_owner)
    or exists(select 1 from public.order_items where user_id = p_owner)
    or exists(select 1 from public.production_events where user_id = p_owner)
    or exists(select 1 from public.finished_stock_balances where user_id = p_owner)
    or exists(select 1 from public.finished_stock_movements where user_id = p_owner)
$$;
revoke all on function public.legacy_inventory_has_rows(uuid) from public, anon, authenticated;

-- Preserve the existing implementations. Guarded renames make the migration
-- repeatable and leave installations without optional legacy RPCs untouched.
do $rename$
declare
  pair text[];
begin
  foreach pair slice 1 in array array[
    array['save_order_with_inventory(jsonb)', 'legacy_save_order_with_inventory_unlocked'],
    array['delete_orders_atomic(uuid[])', 'legacy_delete_orders_atomic_unlocked'],
    array['restore_orders_snapshot(jsonb)', 'legacy_restore_orders_snapshot_unlocked'],
    array['restore_saved_calculations_snapshot(jsonb)', 'legacy_restore_saved_calculations_snapshot_unlocked'],
    array['restore_database_snapshot(jsonb)', 'legacy_restore_database_snapshot_unlocked'],
    array['business_inventory_snapshot()', 'legacy_business_inventory_snapshot_without_orders']
  ] loop
    if pg_catalog.to_regprocedure('public.' || pair[2] || substring(pair[1] from pg_catalog.strpos(pair[1], '('))) is null
       and pg_catalog.to_regprocedure('public.' || pair[1]) is not null then
      execute format('alter function public.%s rename to %I', pair[1], pair[2]);
    end if;
    if pg_catalog.to_regprocedure('public.' || pair[2] || substring(pair[1] from pg_catalog.strpos(pair[1], '('))) is not null then
      execute format('revoke all on function public.%s from public, anon, authenticated',
        pair[2] || substring(pair[1] from pg_catalog.strpos(pair[1], '(')));
    end if;
  end loop;
end $rename$;

-- The wrapper's owner lock precedes the row locks in the original functions.
do $wrappers$
begin
  if pg_catalog.to_regprocedure('public.legacy_business_inventory_snapshot_without_orders()') is not null then
    execute $create$create or replace function public.business_inventory_snapshot()
    returns jsonb language plpgsql security definer set search_path = '' as $body$
    declare owner_id uuid := auth.uid(); result jsonb;
    begin
      if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
      result := public.legacy_business_inventory_snapshot_without_orders();
      return result || pg_catalog.jsonb_build_object('legacyOrders',
        (select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(o) order by o.created_at, o.id), '[]'::jsonb)
         from public.orders o where o.user_id = owner_id),
        'legacyProducts',
        (select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) order by p.id), '[]'::jsonb)
         from public.saved_calculations p where p.user_id = owner_id));
    end $body$$create$;
    execute 'revoke all on function public.business_inventory_snapshot() from public, anon';
    execute 'grant execute on function public.business_inventory_snapshot() to authenticated';
  end if;
  if pg_catalog.to_regprocedure('public.legacy_save_order_with_inventory_unlocked(jsonb)') is not null then
    execute $create$create or replace function public.save_order_with_inventory(p_order jsonb)
    returns jsonb language plpgsql security definer set search_path = '' as $body$
    declare
      owner_id uuid := auth.uid(); order_id uuid; old_order public.orders%rowtype; result jsonb;
      previous_order text := coalesce(pg_catalog.current_setting('business_inventory.legacy_order_id', true), '');
      previous_skip text := coalesce(pg_catalog.current_setting('business_inventory.legacy_skip_bridge', true), '');
    begin
      if owner_id is null then raise exception 'UNAUTHENTICATED'; end if;
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
      begin order_id := nullif(p_order->>'id', '')::uuid;
      exception when invalid_text_representation then order_id := null; end;
      order_id := coalesce(order_id, pg_catalog.gen_random_uuid());
      select * into old_order from public.orders where id = order_id and user_id = owner_id for update;
      perform pg_catalog.set_config('business_inventory.legacy_order_id', order_id::text, true);
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge',
        case when old_order.id is not null
          and old_order.type is not distinct from p_order->>'type'
          and old_order.product_id is not distinct from nullif(p_order->>'product_id', '')::uuid
          and coalesce(old_order.quantity, 0) = coalesce((p_order->>'quantity')::numeric, 0)
          then 'on' else '' end, true);
      result := public.legacy_save_order_with_inventory_unlocked(
        p_order || pg_catalog.jsonb_build_object('id', order_id));
      perform pg_catalog.set_config('business_inventory.legacy_order_id', previous_order, true);
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge', previous_skip, true);
      return result;
    exception when others then
      perform pg_catalog.set_config('business_inventory.legacy_order_id', previous_order, true);
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge', previous_skip, true);
      raise;
    end $body$$create$;
    execute 'revoke all on function public.save_order_with_inventory(jsonb) from public, anon';
    execute 'grant execute on function public.save_order_with_inventory(jsonb) to authenticated';
  end if;
  if pg_catalog.to_regprocedure('public.legacy_delete_orders_atomic_unlocked(uuid[])') is not null then
    execute $create$create or replace function public.delete_orders_atomic(p_ids uuid[])
    returns integer language plpgsql security definer set search_path = '' as $body$
    declare
      owner_id uuid := auth.uid(); order_id uuid; deleted integer := 0;
      previous_order text := coalesce(pg_catalog.current_setting('business_inventory.legacy_order_id', true), '');
      previous_skip text := coalesce(pg_catalog.current_setting('business_inventory.legacy_skip_bridge', true), '');
    begin
      if owner_id is null then raise exception 'UNAUTHENTICATED'; end if;
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge', '', true);
      -- One order at a time identifies each return's reservation basis; the
      -- encompassing transaction and owner lock still make the batch atomic.
      for order_id in select o.id from public.orders o
        where o.user_id = owner_id and o.id = any(p_ids) order by o.id for update
      loop
        perform pg_catalog.set_config('business_inventory.legacy_order_id', order_id::text, true);
        deleted := deleted + public.legacy_delete_orders_atomic_unlocked(array[order_id]);
      end loop;
      perform pg_catalog.set_config('business_inventory.legacy_order_id', previous_order, true);
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge', previous_skip, true);
      return deleted;
    exception when others then
      perform pg_catalog.set_config('business_inventory.legacy_order_id', previous_order, true);
      perform pg_catalog.set_config('business_inventory.legacy_skip_bridge', previous_skip, true);
      raise;
    end $body$$create$;
    execute 'revoke all on function public.delete_orders_atomic(uuid[]) from public, anon';
    execute 'grant execute on function public.delete_orders_atomic(uuid[]) to authenticated';
  end if;
  if pg_catalog.to_regprocedure('public.legacy_restore_orders_snapshot_unlocked(jsonb)') is not null then
    execute $create$create or replace function public.restore_orders_snapshot(p_orders jsonb)
    returns integer language plpgsql security definer set search_path = '' as $body$
    declare owner_id uuid := auth.uid(); item jsonb; removed_ids uuid[]; restored integer := 0;
    begin
      if owner_id is null then raise exception 'UNAUTHENTICATED'; end if;
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
      if pg_catalog.jsonb_typeof(p_orders) is distinct from 'array' then raise exception 'INVALID_ORDER_SNAPSHOT'; end if;
      -- Release missing/changed reservations before adding any new ones. Keep
      -- unchanged reservations (and their immutable basis) for financial edits.
      select coalesce(array_agg(o.id), array[]::uuid[]) into removed_ids
      from public.orders o where o.user_id = owner_id and not exists (
        select 1 from pg_catalog.jsonb_array_elements(p_orders) incoming(item)
        where nullif(incoming.item->>'id', '')::uuid = o.id
          and o.type is not distinct from incoming.item->>'type'
          and o.product_id is not distinct from nullif(incoming.item->>'product_id', '')::uuid
          and coalesce(o.quantity, 0) = coalesce((incoming.item->>'quantity')::numeric, 0));
      perform public.delete_orders_atomic(removed_ids);
      for item in select value from pg_catalog.jsonb_array_elements(p_orders) loop
        perform public.save_order_with_inventory(item);
        restored := restored + 1;
      end loop;
      return restored;
    end $body$$create$;
    execute 'revoke all on function public.restore_orders_snapshot(jsonb) from public, anon';
    execute 'grant execute on function public.restore_orders_snapshot(jsonb) to authenticated';
  end if;
  if pg_catalog.to_regprocedure('public.legacy_restore_saved_calculations_snapshot_unlocked(jsonb)') is not null then
    execute $create$create or replace function public.restore_saved_calculations_snapshot(p_items jsonb)
    returns integer language plpgsql security definer set search_path = '' as $body$
    declare owner_id uuid := auth.uid();
    begin
      if owner_id is null then raise exception 'UNAUTHENTICATED'; end if;
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
      if public.legacy_inventory_has_rows(owner_id) then raise exception 'FOUNDATION_INVENTORY_RESTORE_BLOCKED'; end if;
      return public.legacy_restore_saved_calculations_snapshot_unlocked(p_items);
    end $body$$create$;
    execute 'revoke all on function public.restore_saved_calculations_snapshot(jsonb) from public, anon';
    execute 'grant execute on function public.restore_saved_calculations_snapshot(jsonb) to authenticated';
  end if;
  if pg_catalog.to_regprocedure('public.legacy_restore_database_snapshot_unlocked(jsonb)') is not null then
    execute $create$create or replace function public.restore_database_snapshot(p_snapshot jsonb)
    returns void language plpgsql security definer set search_path = '' as $body$
    declare owner_id uuid := auth.uid();
    begin
      if owner_id is null then raise exception 'UNAUTHENTICATED'; end if;
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
      if public.legacy_inventory_has_rows(owner_id) then raise exception 'FOUNDATION_INVENTORY_RESTORE_BLOCKED'; end if;
      perform public.legacy_restore_database_snapshot_unlocked(p_snapshot);
    end $body$$create$;
    execute 'revoke all on function public.restore_database_snapshot(jsonb) from public, anon';
    execute 'grant execute on function public.restore_database_snapshot(jsonb) to authenticated';
  end if;
end $wrappers$;

-- Route offline-queued legacy order operations through the same owner lock,
-- revision and idempotency receipts as inventory commands. Legacy functions
-- still own their original business semantics (including insufficient stock).
create or replace function public.business_apply_legacy_order(p_command jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  event_id text := p_command->>'id';
  operation_kind text := p_command->>'kind';
  stored_command jsonb;
  previous_revision bigint;
  current_revision bigint;
  order_ids uuid[];
  previous_command text := coalesce(pg_catalog.current_setting('business_inventory.legacy_command_id', true), '');
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if pg_catalog.jsonb_typeof(p_command) is distinct from 'object'
     or event_id is null or length(event_id) not between 1 and 160
     or nullif(p_command->>'occurredAt', '') is null then
    raise exception 'INVALID_COMMAND';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('business_inventory:' || owner_id::text, 0));
  select command into stored_command from public.business_operation_receipts
    where user_id = owner_id and event_key = event_id;
  if found then
    if stored_command <> p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  insert into public.business_state_revisions(user_id) values (owner_id) on conflict do nothing;
  select revision into previous_revision from public.business_state_revisions
    where user_id = owner_id for update;
  perform pg_catalog.set_config('business_inventory.legacy_command_id', event_id, true);

  if operation_kind = 'saveLegacyOrder' then
    if pg_catalog.jsonb_typeof(p_command->'order') is distinct from 'object' then
      raise exception 'INVALID_LEGACY_ORDER';
    end if;
    perform public.save_order_with_inventory(p_command->'order');
  elsif operation_kind = 'deleteLegacyOrders' then
    if pg_catalog.jsonb_typeof(p_command->'orderIds') is distinct from 'array' then
      raise exception 'INVALID_LEGACY_ORDER_IDS';
    end if;
    select coalesce(array_agg(value::uuid), array[]::uuid[]) into order_ids
      from pg_catalog.jsonb_array_elements_text(p_command->'orderIds') as ids(value);
    perform public.delete_orders_atomic(order_ids);
  elsif operation_kind = 'restoreLegacyOrders' then
    if pg_catalog.jsonb_typeof(p_command->'orders') is distinct from 'array' then
      raise exception 'INVALID_LEGACY_ORDERS';
    end if;
    perform public.restore_orders_snapshot(p_command->'orders');
  else
    raise exception 'INVALID_LEGACY_ORDER_OPERATION';
  end if;

  -- Stock changes have already bumped the revision in the trigger. Financial
  -- edits with no stock delta still need a revision so other tabs reload.
  select revision into current_revision from public.business_state_revisions
    where user_id = owner_id;
  if current_revision = previous_revision then
    update public.business_state_revisions set revision = revision + 1
      where user_id = owner_id returning revision into current_revision;
  end if;
  insert into public.business_operation_receipts(user_id,event_key,command,revision)
    values (owner_id,event_id,p_command,current_revision);
  perform pg_catalog.set_config('business_inventory.legacy_command_id', previous_command, true);
  return public.business_inventory_snapshot();
exception when others then
  perform pg_catalog.set_config('business_inventory.legacy_command_id', previous_command, true);
  raise;
end $$;
revoke all on function public.business_apply_legacy_order(jsonb) from public, anon;
grant execute on function public.business_apply_legacy_order(jsonb) to authenticated;

commit;

-- END LEGACY INVENTORY BRIDGE 20260930

-- BEGIN CALCULATION PROJECTS 20260930
-- Phase 3: retain removed calculation positions as archived snapshots.
-- Run in Supabase Dashboard → SQL Editor after the foundation migration.
-- Existing transactional RPC persists this column via its generic collection writer.
begin;
alter table public.calculation_items
  add column if not exists archived boolean not null default false;
create or replace function public.business_save_calculation_project(p_expected_revision bigint, p_command jsonb, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  project_id uuid := (p_command#>>'{project,id}')::uuid;
  stored_command jsonb;
  previous_revision bigint;
  desired_revision bigint;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_command->>'kind' is distinct from 'saveProject' or p_command#>>'{project,user_id}' is distinct from owner_id::text
    or p_state->>'user_id' is distinct from owner_id::text or project_id is null then raise exception 'INVALID_PROJECT'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:' || owner_id::text,0));
  select command into stored_command from public.business_operation_receipts
    where user_id=owner_id and event_key=p_command->>'id';
  if found then
    if stored_command<>p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  select revision into previous_revision from public.calculation_projects where id=project_id and user_id=owner_id;
  if found and previous_revision is distinct from (p_command#>>'{project,revision}')::bigint
    then raise exception 'BUSINESS_PROJECT_REVISION_CONFLICT: local draft retained'; end if;
  desired_revision := case when previous_revision is null then 0 else previous_revision+1 end;
  if not exists(select from jsonb_array_elements(p_state->'projects') p where p->>'id'=project_id::text
    and p->>'user_id'=owner_id::text and (p->>'revision')::bigint=desired_revision)
    then raise exception 'INVALID_PROJECT_STATE'; end if;
  return public.commit_business_inventory(p_expected_revision,p_command,p_state);
end $$;
revoke all on function public.business_save_calculation_project(bigint,jsonb,jsonb) from public, anon;
grant execute on function public.business_save_calculation_project(bigint,jsonb,jsonb) to authenticated;
commit;

-- END CALCULATION PROJECTS 20260930


-- BEGIN PROJECT ORDERS 20260930
-- Phase 3: create a project order head and all position snapshots in one transaction.
-- Apply after foundation, inventory transactions, legacy bridge and calculation projects.
begin;
alter table public.orders add column if not exists agreed_price numeric(20,6)
  check (agreed_price >= 0 and agreed_price <> 'NaN'::numeric);
create or replace function public.business_create_project_order(p_expected_revision bigint, p_command jsonb, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  event_id text := p_command->>'id';
  head jsonb := p_command->'order';
  order_id uuid := (head->>'id')::uuid;
  stored_command jsonb;
  incoming jsonb;
  declared_item jsonb;
  position integer := 0;
  item_cost numeric := 0;
  item_quantity bigint := 0;
  item_count integer := 0;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_command->>'kind' is distinct from 'createProjectOrder' or event_id is null
    or length(event_id) not between 1 and 160 or p_state->>'user_id' is distinct from owner_id::text
    or head->>'user_id' is distinct from owner_id::text then raise exception 'INVALID_PROJECT_ORDER'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:' || owner_id::text, 0));
  select command into stored_command from public.business_operation_receipts where user_id=owner_id and event_key=event_id;
  if found then
    if stored_command <> p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  if p_expected_revision is distinct from coalesce((select revision from public.business_state_revisions where user_id=owner_id),0)
    then raise exception 'BUSINESS_REVISION_CONFLICT'; end if;
  if order_id is null or exists(select from public.orders where id=order_id)
    or head->>'type' is distinct from 'income' or nullif(head->>'product_id','') is not null
    or head->>'status' is distinct from 'Не в работе'
    or jsonb_typeof(p_command->'itemIds') is distinct from 'array'
    or jsonb_typeof(p_command#>'{draft,items}') is distinct from 'array'
    or jsonb_array_length(p_command->'itemIds')=0
    or jsonb_array_length(p_command->'itemIds')<>jsonb_array_length(p_command#>'{draft,items}')
    then raise exception 'INVALID_PROJECT_ORDER'; end if;
  for declared_item in select value from jsonb_array_elements(p_command#>'{draft,items}') loop
    select value into incoming from jsonb_array_elements(p_state->'orderItems')
      where value->>'id'=p_command->'itemIds'->>position;
    if incoming is null or incoming->>'user_id' is distinct from owner_id::text
      or incoming->>'order_id' is distinct from order_id::text
      or incoming->>'source_order_id' is distinct from order_id::text
      or incoming->>'name' is distinct from declared_item->>'name'
      or incoming->>'quantity' is distinct from declared_item->>'quantity'
      or incoming->'snapshot' is distinct from declared_item->'snapshot'
      or incoming->>'cost_provenance' is distinct from 'estimate'
      or incoming->>'fulfilled_quantity' is distinct from '0'
      or incoming->>'production_quantity' is distinct from '0'
      or exists(select from public.order_items where id=(incoming->>'id')::uuid)
      or not exists(select from public.calculation_items where id=(declared_item->>'calculation_item_id')::uuid
        and user_id=owner_id and project_id=(p_command#>>'{draft,projectId}')::uuid)
      then raise exception 'INVALID_PROJECT_ORDER_ITEM'; end if;
    item_cost := item_cost + (incoming->>'total_cost')::numeric;
    item_quantity := item_quantity + (incoming->>'quantity')::integer;
    item_count := item_count + 1;
    position := position + 1;
  end loop;
  if item_cost is distinct from (head->>'cost')::numeric or item_quantity is distinct from (head->>'quantity')::bigint
    or item_count<>(select count(*) from jsonb_array_elements(p_state->'orderItems') where value->>'source_order_id'=order_id::text)
    then raise exception 'INVALID_PROJECT_ORDER_TOTAL'; end if;
  -- No product_id on the legacy head: reservation/production belongs to the separate positions.
  perform public.save_order_with_inventory(head);
  update public.orders set agreed_price=nullif(head->>'agreed_price','')::numeric where id=order_id and user_id=owner_id;
  -- FK/ownership/finite constraints and receipt are checked by the same transactional writer.
  return public.commit_business_inventory(p_expected_revision,p_command,p_state);
end $$;
revoke all on function public.business_create_project_order(bigint,jsonb,jsonb) from public, anon;
grant execute on function public.business_create_project_order(bigint,jsonb,jsonb) to authenticated;
commit;

-- END PROJECT ORDERS 20260930

-- BEGIN CATALOG TEMPLATES 20260930
-- Phase 4. Apply after all phase 1–3 migrations, in Supabase SQL Editor.
-- Catalog metadata never represents production or a material return.
begin;
alter table public.saved_calculations
  add column if not exists catalog_revision bigint not null default 0 check (catalog_revision >= 0),
  add column if not exists catalog_archived boolean not null default false,
  add column if not exists calculation_snapshot jsonb
    check (calculation_snapshot is null or jsonb_typeof(calculation_snapshot) is not distinct from 'object'
      and calculation_snapshot->>'version' is not distinct from '1'
      and jsonb_typeof(calculation_snapshot->'inputs') is not distinct from 'object'
      and jsonb_typeof(calculation_snapshot->'result') is not distinct from 'object'),
  add column if not exists agreed_price numeric(20,6)
    check (agreed_price >= 0 and agreed_price <> 'NaN'::numeric);

create or replace function public.business_apply_catalog(p_expected_revision bigint, p_command jsonb, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  stored_command jsonb;
  before_state jsonb;
  incoming jsonb;
  previous jsonb;
  target_id uuid;
  affected boolean;
  expected bigint;
  assignments text;
  collection text;
  restore_id text;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(p_command->>'kind','') not in ('saveCatalogProduct','archiveCatalogProducts','restoreCatalog')
    or p_command->>'id' is null or p_state->>'user_id' is distinct from owner_id::text
    or jsonb_typeof(p_state->'legacyProducts') is distinct from 'array'
    then raise exception 'INVALID_CATALOG_COMMAND'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  select command into stored_command from public.business_operation_receipts
    where user_id=owner_id and event_key=p_command->>'id';
  if found then
    if stored_command<>p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  before_state := public.business_inventory_snapshot();
  if p_expected_revision is distinct from (before_state->>'revision')::bigint
    then raise exception 'BUSINESS_REVISION_CONFLICT'; end if;
  if p_command->>'kind'='archiveCatalogProducts' and jsonb_typeof(p_command->'productIds') is distinct from 'array'
    or p_command->>'kind'='restoreCatalog' and jsonb_typeof(p_command->'products') is distinct from 'array'
    then raise exception 'INVALID_CATALOG_COMMAND'; end if;
  if exists(select from jsonb_array_elements(p_state->'legacyProducts') p where p->>'user_id' is distinct from owner_id::text)
    or exists(select from public.saved_calculations old where old.user_id=owner_id and not exists
      (select from jsonb_array_elements(p_state->'legacyProducts') p where p->>'id'=old.id::text))
    or (select count(*) from jsonb_array_elements(p_state->'legacyProducts')) <>
       (select count(distinct p->>'id') from jsonb_array_elements(p_state->'legacyProducts') p)
    then raise exception 'INVALID_CATALOG_STATE'; end if;
  -- Every non-catalog resource and every existing physical balance is unchanged.
  foreach collection in array array['manufacturers','materialTypes','materialLines','variants','purchases',
    'filamentMovements','deficits','projects','calculationItems','orderItems','productionEvents'] loop
    if p_state->collection is distinct from before_state->collection then raise exception 'CATALOG_CHANGED_INVENTORY'; end if;
  end loop;
  if exists(select from jsonb_array_elements(before_state->'finishedBalances') old where not exists
    (select from jsonb_array_elements(p_state->'finishedBalances') p where p=old))
    or exists(select from jsonb_array_elements(before_state->'finishedMovements') old where not exists
    (select from jsonb_array_elements(p_state->'finishedMovements') p where p=old))
    then raise exception 'CATALOG_CHANGED_INVENTORY'; end if;
  if p_command->>'kind'='saveCatalogProduct' then
    target_id := (p_command#>>'{product,id}')::uuid;
    select to_jsonb(p) into previous from public.saved_calculations p where id=target_id and user_id=owner_id;
    if target_id is null or coalesce(p_command->>'isNew','') not in ('true','false')
      or (p_command->>'isNew'='true' and exists(select from public.saved_calculations where id=target_id))
      or (p_command->>'isNew'='false' and (previous is null
        or (previous->>'catalog_revision')::bigint is distinct from (p_command->>'expectedRevision')::bigint))
      then raise exception 'BUSINESS_CATALOG_REVISION_CONFLICT: local editor retained'; end if;
    if not exists(select from jsonb_array_elements(p_state->'legacyProducts') p where p->>'id'=target_id::text)
      then raise exception 'INVALID_CATALOG_STATE'; end if;
  end if;
  if p_command->>'kind'='restoreCatalog' and p_command ? 'productIds' then
    if jsonb_typeof(p_command->'productIds') is distinct from 'array' then raise exception 'INVALID_CATALOG_STATE'; end if;
    for restore_id in select value from jsonb_array_elements_text(p_command->'productIds') as ids(value) loop
      select to_jsonb(p) into previous from public.saved_calculations p where p.id=restore_id::uuid and p.user_id=owner_id;
      if previous is null or (previous->>'catalog_revision')::bigint is distinct from
        (p_command->'expectedRevisions'->>restore_id)::bigint
        then raise exception 'BUSINESS_CATALOG_REVISION_CONFLICT: Undo retained'; end if;
    end loop;
  end if;
  select string_agg(format('%1$I=excluded.%1$I',a.attname),',') into assignments
    from pg_attribute a where a.attrelid='public.saved_calculations'::regclass
    and a.attnum>0 and not a.attisdropped and a.attname not in ('id','user_id','created_at','stock_quantity');
  for incoming in select value from jsonb_array_elements(p_state->'legacyProducts') loop
    select to_jsonb(p) into previous from public.saved_calculations p where id=(incoming->>'id')::uuid and user_id=owner_id;
    affected := case p_command->>'kind'
      when 'saveCatalogProduct' then incoming->>'id'=target_id::text
      when 'archiveCatalogProducts' then p_command->'productIds' ? (incoming->>'id')
      else not (p_command ? 'productIds') or p_command->'productIds' ? (incoming->>'id') end;
    if not affected then continue; end if;
    if exists(select from public.saved_calculations where id=(incoming->>'id')::uuid and user_id<>owner_id)
      then raise exception 'CROSS_OWNER_ID'; end if;
    expected := case when previous is null then 0 else (previous->>'catalog_revision')::bigint+1 end;
    -- Undo keeps already-archived rows unchanged.
    if incoming->>'catalog_revision' is distinct from expected::text and incoming is distinct from previous
      then raise exception 'INVALID_CATALOG_REVISION'; end if;
    if previous is not null and incoming->>'catalog_revision'=(previous->>'catalog_revision') then continue; end if;
    if p_command->>'kind'='archiveCatalogProducts' and incoming->>'catalog_archived' is distinct from 'true'
      then raise exception 'INVALID_CATALOG_ARCHIVE'; end if;
    if p_command->>'kind'='saveCatalogProduct' and incoming->>'catalog_archived' is distinct from 'false'
      then raise exception 'INVALID_CATALOG_ARCHIVE'; end if;
    -- Full template replacement clears optional parameters explicitly, preserving identity and stock.
    incoming := incoming || jsonb_build_object('user_id',owner_id,
      'created_at',coalesce(previous->'created_at',incoming->'created_at',to_jsonb(now())),
      'stock_quantity',coalesce(previous->'stock_quantity',incoming->'stock_quantity','0'::jsonb));
    execute format('insert into public.saved_calculations select r.* from jsonb_populate_record(null::public.saved_calculations,$1) r '
      'on conflict(id) do update set %s where saved_calculations.user_id=excluded.user_id',assignments) using incoming;
  end loop;
  -- New templates may only add opening balances, never alter existing stock or produce units.
  if exists(select from jsonb_array_elements(p_state->'finishedBalances') b
    where not exists(select from jsonb_array_elements(before_state->'finishedBalances') old where old=b)
    and (exists(select from jsonb_array_elements(before_state->'finishedBalances') old where old->>'id'=b->>'id')
      or not exists(select from public.saved_calculations p where p.user_id=owner_id
        and p.id::text=b->>'source_product_id' and coalesce(p.stock_quantity,0)=(b->>'quantity')::integer
        and abs((b->>'average_unit_cost')::numeric-p.base_cost/p.quantity)<=0.00000001 and b->>'revision'='0')))
    or exists(select from jsonb_array_elements(p_state->'finishedMovements') m
      where not exists(select from jsonb_array_elements(before_state->'finishedMovements') old where old=m)
      and (m->>'source' is distinct from 'opening_balance'
        or m->>'event_key' is distinct from 'opening:finished:'||(m->>'source_product_id')
        or exists(select from jsonb_array_elements(before_state->'finishedBalances') b where b->>'source_product_id'=m->>'source_product_id')
        or not exists(select from jsonb_array_elements(p_state->'finishedBalances') b
          where b->>'source_product_id'=m->>'source_product_id' and (b->>'quantity')::integer>0
            and b->>'quantity'=m->>'delta_quantity' and b->>'quantity'=m->>'balance_after'
            and abs((b->>'average_unit_cost')::numeric-(m->>'unit_cost')::numeric)<=0.00000001)))
    then raise exception 'CATALOG_CHANGED_INVENTORY'; end if;
  return public.commit_business_inventory(p_expected_revision,p_command,p_state);
end $$;
revoke all on function public.business_apply_catalog(bigint,jsonb,jsonb) from public, anon;
grant execute on function public.business_apply_catalog(bigint,jsonb,jsonb) to authenticated;
commit;
-- END CATALOG TEMPLATES 20260930

-- BEGIN ORDER LIFECYCLE 20261001
-- Phase 5: order snapshots, available-stock allocation and physical production.
-- Apply after the six phase 1–4 migrations. Never runs production during migration.
begin;
alter table public.orders add column if not exists order_revision bigint not null default 0 check(order_revision >= 0);
alter table public.orders add column if not exists order_archived boolean not null default false;
alter table public.order_items add column if not exists reserved_quantity integer default 0 check(reserved_quantity >= 0);
alter table public.order_items add column if not exists returned_quantity integer default 0 check(returned_quantity >= 0);
alter table public.order_items add column if not exists archived boolean default false;
create index if not exists orders_active_owner on public.orders(user_id,order_archived);

-- Only the validated RPCs may write snapshots and immutable inventory facts.
-- SELECT remains owner-scoped under the existing RLS policies.
do $$ declare relation_name text; begin
  foreach relation_name in array array['orders','saved_calculations','filament_manufacturers','material_types','material_lines','filament_variants',
    'filament_purchases','filament_movements','filament_deficits','calculation_projects','calculation_items','order_items',
    'production_events','finished_stock_balances','finished_stock_movements','business_state_revisions','business_operation_receipts'] loop
    execute format('revoke insert,update,delete on public.%I from authenticated,anon',relation_name);
  end loop;
  if to_regprocedure('public.business_commit_inventory_internal(bigint,jsonb,jsonb)') is null then
    alter function public.commit_business_inventory(bigint,jsonb,jsonb) rename to business_commit_inventory_internal;
  end if;
end $$;
revoke all on function public.business_commit_inventory_internal(bigint,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.business_create_project_order(bigint,jsonb,jsonb) from public,anon,authenticated;

create or replace function public.commit_business_inventory(p_expected_revision bigint,p_command jsonb,p_state jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner_id uuid:=auth.uid(); original jsonb; stored_command jsonb; row_item jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  select command into stored_command from public.business_operation_receipts where user_id=owner_id and event_key=p_command->>'id';
  if found then
    if stored_command is distinct from p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  original:=public.business_inventory_snapshot();
  if coalesce(p_command->>'kind','') not in ('bootstrap','purchase','produce','adjustFinished',
    'saveManufacturer','saveMaterialType','saveMaterialLine','saveVariant','saveProject',
    'saveCatalogProduct','archiveCatalogProducts','restoreCatalog') then raise exception 'INVALID_INVENTORY_COMMAND_KIND'; end if;
  if exists(select from jsonb_array_elements(original->'orderItems') old where not exists
    (select from jsonb_array_elements(p_state->'orderItems') incoming where incoming=old))
    then raise exception 'ORDER_ITEMS_REQUIRE_ATOMIC_API'; end if;
  for row_item in select value from jsonb_array_elements(p_state->'orderItems') incoming where not exists
    (select from jsonb_array_elements(original->'orderItems') old where old->>'id'=incoming->>'id') loop
    if p_command->>'kind'<>'bootstrap' or row_item->>'cost_provenance'<>'legacy'
      or (row_item->>'fulfilled_quantity')::integer<>0 or (row_item->>'production_quantity')::integer<>0
      or row_item#>'{snapshot,calculation}' is distinct from 'null'::jsonb
      or row_item#>'{snapshot,recipe}' is distinct from 'null'::jsonb
      or not exists(select from public.orders o where o.user_id=owner_id and o.id::text=row_item->>'source_order_id'
        and o.type='income' and o.cost=(row_item->>'total_cost')::numeric and o.amount=(row_item->>'total_price')::numeric
        and o.quantity=(row_item->>'quantity')::integer)
      then raise exception 'ORDER_ITEMS_REQUIRE_ATOMIC_API'; end if;
  end loop;
  if exists(select from jsonb_array_elements(p_state->'productionEvents') p where p->>'order_item_id' is not null
    and not exists(select from public.production_events old where old.user_id=owner_id and old.id=(p->>'id')::uuid))
    or exists(select from jsonb_array_elements(p_state->'finishedMovements') m where m->>'order_item_id' is not null
      and not exists(select from public.finished_stock_movements old where old.user_id=owner_id and old.id=(m->>'id')::uuid))
    then raise exception 'ORDER_ALLOCATION_REQUIRES_ATOMIC_API'; end if;
  return public.business_commit_inventory_internal(p_expected_revision,p_command,p_state);
end $$;
revoke all on function public.commit_business_inventory(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.commit_business_inventory(bigint,jsonb,jsonb) to authenticated;

create or replace function public.business_apply_order(p_expected_revision bigint,p_command jsonb,p_state jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  owner_id uuid:=auth.uid();
  event_id text:=p_command->>'id';
  command_kind text:=p_command->>'kind';
  stored_command jsonb;
  original jsonb;
  original_head jsonb;
  head jsonb;
  item jsonb;
  production jsonb;
  material jsonb;
  current_cost numeric;
  required_grams numeric;
  accounted_grams numeric;
  actual_item_cost numeric;
  produced_delta integer;
  reserved_delta integer;
  returned_delta integer;
  stock_balance jsonb;
  stock_movement jsonb;
  stock_quantity integer;
  stock_average numeric;
  return_basis numeric;
  old_item jsonb;
  mapping record;
  target_ids text[];
  target_id text;
  columns_list text;
  assignments text;
  new_number bigint;
  invalid boolean;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_command) is distinct from 'object' or event_id is null
    or length(event_id) not between 1 and 160 or coalesce(command_kind,'') not in
      ('saveBusinessOrder','createProjectOrder','archiveBusinessOrders','restoreBusinessOrders','returnOrderFinished')
    or p_state->>'user_id' is distinct from owner_id::text then raise exception 'INVALID_ORDER_COMMAND'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  select command into stored_command from public.business_operation_receipts where user_id=owner_id and event_key=event_id;
  if found then
    if stored_command<>p_command then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  if p_expected_revision is distinct from coalesce((select revision from public.business_state_revisions where user_id=owner_id),0)
    then raise exception 'BUSINESS_REVISION_CONFLICT'; end if;
  original:=public.business_inventory_snapshot();
  if jsonb_typeof(p_state->'legacyOrders') is distinct from 'array' or jsonb_typeof(p_state->'orderItems') is distinct from 'array'
    then raise exception 'INVALID_ORDER_STATE'; end if;
  if command_kind in ('saveBusinessOrder','createProjectOrder') then
    target_id:=p_command#>>'{order,id}';
    if target_id is null or p_command#>>'{order,user_id}' is distinct from owner_id::text then raise exception 'INVALID_ORDER_OWNER'; end if;
    target_ids:=array[target_id];
  elsif command_kind in ('archiveBusinessOrders','restoreBusinessOrders') then
    if jsonb_typeof(p_command->'orderIds') is distinct from 'array' then raise exception 'INVALID_ORDER_IDS'; end if;
    select array_agg(value) into target_ids from jsonb_array_elements_text(p_command->'orderIds');
    target_ids:=coalesce(target_ids,array[]::text[]);
  else
    select source_order_id into target_id from public.order_items where id=(p_command->>'orderItemId')::uuid and user_id=owner_id;
    if target_id is null or coalesce((p_command->>'quantity')::integer,0)<=0 then raise exception 'INVALID_FINISHED_RETURN'; end if;
    target_ids:=array[target_id];
  end if;
  -- No unrelated catalog, project, purchase or dictionary changes in an order transaction.
  foreach target_id in array array['legacyProducts','manufacturers','materialTypes','materialLines','purchases','projects','calculationItems'] loop
    if p_state->target_id is distinct from original->target_id then raise exception 'ORDER_CHANGED_UNRELATED_STATE: %',target_id; end if;
  end loop;
  -- Every head remains present; archived orders retain their FK and financial history.
  if exists(select from jsonb_array_elements(original->'legacyOrders') old where not exists
      (select from jsonb_array_elements(p_state->'legacyOrders') incoming where incoming->>'id'=old->>'id'))
    or exists(select from jsonb_array_elements(p_state->'legacyOrders') incoming
      where incoming->>'user_id' is distinct from owner_id::text)
    or exists(select from jsonb_array_elements(p_state->'legacyOrders') incoming group by incoming->>'id' having count(*)>1)
    then raise exception 'INVALID_ORDER_HEADS'; end if;
  for head in select value from jsonb_array_elements(p_state->'legacyOrders') loop
    select value into original_head from jsonb_array_elements(original->'legacyOrders') where value->>'id'=head->>'id';
    if not (head->>'id'=any(target_ids)) then
      if head is distinct from original_head then raise exception 'ORDER_CHANGED_UNRELATED_HEAD'; end if;
      continue;
    end if;
    if coalesce(head->>'type','') not in ('income','expense')
      or coalesce(head->>'status','') not in ('Не в работе','Моделирование','Ждет печати','Печать','Ждет покраски','Покраска','Ждет отправки','Отправлен','Готово')
      or jsonb_typeof(head->'amount') is distinct from 'number' or (head->>'amount')::numeric<0
      or jsonb_typeof(head->'cost') is distinct from 'number' or (head->>'cost')::numeric<0
      or (head->>'payment' is not null and (jsonb_typeof(head->'payment')<>'number' or (head->>'payment')::numeric<0))
      or (head->>'agreed_price' is not null and (jsonb_typeof(head->'agreed_price')<>'number' or (head->>'agreed_price')::numeric<0))
      then raise exception 'INVALID_ORDER_FINANCIALS'; end if;
    if original_head is not null and head->>'type' is distinct from original_head->>'type'
      then raise exception 'ORDER_TYPE_IS_IMMUTABLE'; end if;
    if command_kind='saveBusinessOrder' then
      if (p_command->>'isNew')::boolean then
        if original_head is not null or coalesce((head->>'order_revision')::bigint,-1)<>0 then raise exception 'ORDER_ID_OCCUPIED'; end if;
      else
        if original_head is null or coalesce((original_head->>'order_revision')::bigint,0) is distinct from (p_command->>'expectedRevision')::bigint
          then raise exception 'BUSINESS_ORDER_REVISION_CONFLICT:%',head->>'id'; end if;
        if (head->>'order_revision')::bigint<>coalesce((original_head->>'order_revision')::bigint,0)+1
          then raise exception 'INVALID_ORDER_REVISION'; end if;
      end if;
      if (head-array['cost','quantity','order_revision','created_at','order_number','order_archived','items']) is distinct from
        ((p_command->'order')-array['cost','quantity','order_revision','created_at','order_number','order_archived','items'])
        then raise exception 'ORDER_HEAD_DOES_NOT_MATCH_COMMAND'; end if;
    elsif command_kind='createProjectOrder' then
      if original_head is not null or coalesce((head->>'order_revision')::bigint,0)<>0
        or head->>'type' is distinct from 'income' or head->>'status' is distinct from 'Не в работе'
        or not exists(select from public.calculation_projects where user_id=owner_id and id=(p_command#>>'{draft,projectId}')::uuid)
        then raise exception 'INVALID_PROJECT_ORDER'; end if;
      if jsonb_typeof(p_command#>'{draft,items}') is distinct from 'array'
        or jsonb_array_length(p_command#>'{draft,items}')=0
        or jsonb_array_length(p_command#>'{draft,items}')<>jsonb_array_length(p_command->'itemIds')
        or exists(select from jsonb_array_elements(p_command#>'{draft,items}') draft_item
          where not exists(select from public.calculation_items c where c.user_id=owner_id
            and c.id=(draft_item->>'calculation_item_id')::uuid
            and c.project_id=(p_command#>>'{draft,projectId}')::uuid))
        then raise exception 'INVALID_PROJECT_ORDER_ITEMS'; end if;
    elsif original_head is null then raise exception 'ORDER_NOT_FOUND';
    end if;
    if command_kind='restoreBusinessOrders' then
      if coalesce((original_head->>'order_revision')::bigint,0) is distinct from
        (p_command->'expectedRevisions'->>(head->>'id'))::bigint
        then raise exception 'BUSINESS_ORDER_REVISION_CONFLICT:%',head->>'id'; end if;
      if (head->>'order_revision')::bigint<>coalesce((original_head->>'order_revision')::bigint,0)+1
        then raise exception 'INVALID_ORDER_REVISION'; end if;
    end if;
    if command_kind='archiveBusinessOrders' and head->>'order_archived' is distinct from 'true'
      then raise exception 'INVALID_ORDER_ARCHIVE'; end if;
    if command_kind='returnOrderFinished' and (head-'order_revision') is distinct from (original_head-'order_revision')
      then raise exception 'RETURN_CHANGED_FINANCIAL_HISTORY'; end if;
    if head->>'type'='income' and exists(select from jsonb_array_elements(p_state->'orderItems') p
        where p->>'source_order_id'=head->>'id' and not coalesce((p->>'archived')::boolean,false)) then
      if abs((head->>'cost')::numeric-(select sum((p->>'total_cost')::numeric) from jsonb_array_elements(p_state->'orderItems') p
          where p->>'source_order_id'=head->>'id' and not coalesce((p->>'archived')::boolean,false)))>0.005
        then raise exception 'INVALID_ORDER_COST'; end if;
      if (head->>'quantity')::integer is distinct from (select sum((p->>'quantity')::integer)
        from jsonb_array_elements(p_state->'orderItems') p where p->>'source_order_id'=head->>'id' and not coalesce((p->>'archived')::boolean,false))
        then raise exception 'INVALID_ORDER_TOTAL_QUANTITY'; end if;
    end if;
    if exists(select from public.orders where id=(head->>'id')::uuid and user_id<>owner_id) then raise exception 'CROSS_OWNER_ID'; end if;
    if original_head is not null then
      head:=head||jsonb_build_object('created_at',original_head->'created_at','order_number',original_head->'order_number');
    else
      select coalesce(max(order_number),1000)+1 into new_number from public.orders where user_id=owner_id;
      head:=head||jsonb_build_object('order_number',new_number,'order_revision',0,'order_archived',false);
    end if;
    select string_agg(format('%I',a.attname),','),string_agg(format('%1$I=excluded.%1$I',a.attname),',') filter
      (where a.attname not in ('id','user_id','created_at','order_number')) into columns_list,assignments
      from pg_attribute a where a.attrelid='public.orders'::regclass and a.attnum>0 and not a.attisdropped;
    execute format('insert into public.orders(%s) select %s from jsonb_populate_record(null::public.orders,$1)
      on conflict(id) do update set %s where public.orders.user_id=excluded.user_id',columns_list,columns_list,assignments) using head;
  end loop;
  if exists(select from unnest(target_ids) required_id(value) where not exists(select from public.orders where user_id=owner_id and orders.id::text=required_id.value))
    then raise exception 'ORDER_NOT_FOUND'; end if;
  for item in select value from jsonb_array_elements(p_state->'orderItems') loop
    select value into old_item from jsonb_array_elements(original->'orderItems') where value->>'id'=item->>'id';
    if not (item->>'source_order_id'=any(target_ids)) then
      if item is distinct from old_item then raise exception 'ORDER_CHANGED_UNRELATED_ITEM'; end if;
      continue;
    end if;
    if old_item is not null and (item-array['unit_cost','total_cost','cost_provenance','fulfilled_quantity','production_quantity',
        'reserved_quantity','returned_quantity','archived']) is distinct from (old_item-array['unit_cost','total_cost','cost_provenance',
        'fulfilled_quantity','production_quantity','reserved_quantity','returned_quantity','archived'])
      then raise exception 'IMMUTABLE_ORDER_SNAPSHOT'; end if;
    if old_item is not null and coalesce((item->>'production_quantity')::integer,0)<coalesce((old_item->>'production_quantity')::integer,0)
      then raise exception 'PRODUCTION_CANNOT_BE_REVERSED'; end if;
    select coalesce(sum(p.quantity),0) into produced_delta
      from jsonb_populate_recordset(null::public.production_events,p_state->'productionEvents') p
      where p.order_item_id=(item->>'id')::uuid and not exists(select from public.production_events known where known.id=p.id);
    select coalesce(-sum(m.delta_quantity) filter(where m.source='order'),0),
        coalesce(sum(m.delta_quantity) filter(where m.source='finished_return'),0) into reserved_delta,returned_delta
      from jsonb_populate_recordset(null::public.finished_stock_movements,p_state->'finishedMovements') m
      where m.order_item_id=(item->>'id')::uuid and not exists(select from public.finished_stock_movements known where known.id=m.id);
    if (item->>'production_quantity')::integer<>coalesce((old_item->>'production_quantity')::integer,0)+produced_delta
      or coalesce((item->>'reserved_quantity')::integer,0)<>coalesce((old_item->>'reserved_quantity')::integer,0)+reserved_delta
      or (item->>'fulfilled_quantity')::integer<>coalesce((old_item->>'fulfilled_quantity')::integer,0)+produced_delta+reserved_delta
      or coalesce((item->>'returned_quantity')::integer,0)<>coalesce((old_item->>'returned_quantity')::integer,0)+returned_delta
      then raise exception 'ORDER_ALLOCATION_COUNTERS_DO_NOT_MATCH_LEDGER'; end if;
    if old_item is not null and coalesce((item->>'fulfilled_quantity')::integer,0)<=coalesce((old_item->>'fulfilled_quantity')::integer,0)
      and (item->'total_cost' is distinct from old_item->'total_cost' or item->'unit_cost' is distinct from old_item->'unit_cost'
        or item->'cost_provenance' is distinct from old_item->'cost_provenance')
      then raise exception 'IMMUTABLE_ORDER_ACTUAL_COST'; end if;
    if item->>'cost_provenance'<>'legacy' and (old_item is null or
      coalesce((item->>'fulfilled_quantity')::integer,0)>coalesce((old_item->>'fulfilled_quantity')::integer,0)) then
      select coalesce(-sum(m.delta_quantity*m.unit_cost),0) into actual_item_cost
        from jsonb_populate_recordset(null::public.finished_stock_movements,p_state->'finishedMovements') m
        where m.order_item_id=(item->>'id')::uuid and m.source='order';
      actual_item_cost:=actual_item_cost+coalesce((select sum(p.quantity*p.unit_cost)
        from jsonb_populate_recordset(null::public.production_events,p_state->'productionEvents') p
        where p.order_item_id=(item->>'id')::uuid),0)
        +((item->>'quantity')::integer-(item->>'fulfilled_quantity')::integer)
        *coalesce((item#>>'{snapshot,calculation,result,totalBaseCost}')::numeric,
          (item#>>'{snapshot,order,cost}')::numeric,(item->>'total_cost')::numeric)/(item->>'quantity')::integer;
      if abs(actual_item_cost-(item->>'total_cost')::numeric)>0.000001
        or abs((item->>'unit_cost')::numeric*(item->>'quantity')::integer-actual_item_cost)>0.000001
        then raise exception 'ORDER_ACTUAL_COST_LEDGER_MISMATCH'; end if;
    end if;
    if coalesce((item->>'reserved_quantity')::integer,0)>coalesce((item->>'fulfilled_quantity')::integer,0)
      or coalesce((item->>'returned_quantity')::integer,0)>coalesce((item->>'fulfilled_quantity')::integer,0)
      then raise exception 'INVALID_ORDER_ALLOCATION'; end if;
  end loop;
  if exists(select from jsonb_populate_recordset(null::public.finished_stock_movements,p_state->'finishedMovements') m
    where not exists(select from public.finished_stock_movements known where known.id=m.id)
      and (m.source not in ('order','finished_return') or not exists(select from jsonb_array_elements(p_state->'orderItems') p
        where p->>'source_order_id'=any(target_ids) and p->>'id'=m.order_item_id::text
          and p->>'product_id'=m.source_product_id)
        or (m.source='finished_return' and (command_kind<>'returnOrderFinished' or m.order_item_id::text<>p_command->>'orderItemId'))))
    then raise exception 'INVALID_ORDER_ALLOCATION_MOVEMENT'; end if;
  if command_kind='saveBusinessOrder' then
    if p_command ? 'items' then
      if jsonb_typeof(p_command->'items') is distinct from 'array' then raise exception 'INVALID_ORDER_DRAFT_ITEMS'; end if;
      if (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(p_state->'orderItems') p
        where p->>'source_order_id'=any(target_ids) and not coalesce((p->>'archived')::boolean,false)) is distinct from
        (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(p_command->'items') p)
        then raise exception 'ORDER_ITEMS_DO_NOT_MATCH_COMMAND'; end if;
      if exists(select from jsonb_array_elements(p_command->'items') draft_item where not exists
        (select from jsonb_array_elements(p_state->'orderItems') incoming where incoming->>'id'=draft_item->>'id'
          and (incoming-array['unit_cost','total_cost','cost_provenance','fulfilled_quantity','production_quantity',
            'reserved_quantity','returned_quantity','archived']) is not distinct from
          (draft_item-array['unit_cost','total_cost','cost_provenance','fulfilled_quantity','production_quantity',
            'reserved_quantity','returned_quantity','archived']))) then raise exception 'ORDER_DRAFT_SNAPSHOT_MISMATCH'; end if;
    elsif (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(p_state->'orderItems') p
      where p->>'source_order_id'=any(target_ids) and not coalesce((p->>'archived')::boolean,false)) is distinct from
      (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(original->'orderItems') p
        where p->>'source_order_id'=any(target_ids) and not coalesce((p->>'archived')::boolean,false))
      then raise exception 'METADATA_CHANGED_ORDER_ITEMS'; end if;
  end if;
  if command_kind='createProjectOrder' then
    if (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(p_state->'orderItems') p
      where p->>'source_order_id'=any(target_ids)) is distinct from
      (select coalesce(jsonb_agg(p order by p),'[]') from jsonb_array_elements_text(p_command->'itemIds') p)
      or exists(select from jsonb_array_elements(p_command#>'{draft,items}') with ordinality d(value,ordinal)
        where not exists(select from jsonb_array_elements(p_state->'orderItems') incoming
          where incoming->>'id'=p_command->'itemIds'->>(d.ordinal::integer-1)
            and incoming->'snapshot'=d.value->'snapshot' and incoming->'quantity'=d.value->'quantity'
            and incoming->'name'=d.value->'name' and incoming->'product_id'=d.value->'product_id'
            and incoming->'total_price'=d.value->'total_price' and incoming->'unit_price'=d.value->'unit_price'))
      then raise exception 'PROJECT_ORDER_ITEMS_DO_NOT_MATCH_COMMAND'; end if;
  end if;
  -- A printed position cannot be replaced by a new ID after rolling back status.
  if command_kind='saveBusinessOrder' and exists(select from jsonb_array_elements(original->'orderItems') old
    where old->>'source_order_id'=any(target_ids) and not coalesce((old->>'archived')::boolean,false)
      and ((old->>'production_quantity')::integer>0 or exists(select from public.finished_stock_movements m
        where m.user_id=owner_id and m.order_item_id=(old->>'id')::uuid
          and m.event_key like '%:fulfill:'||(old->>'id')))
      and exists(select from jsonb_array_elements(p_state->'orderItems') incoming
        where incoming->>'id'=old->>'id' and coalesce((incoming->>'archived')::boolean,false)))
    then raise exception 'PRINTED_ORDER_ITEMS_CANNOT_BE_REPLACED'; end if;
  if command_kind='saveBusinessOrder' and exists(select from jsonb_array_elements(original->'orderItems') old
    where old->>'source_order_id'=any(target_ids) and not coalesce((old->>'archived')::boolean,false)
      and ((old->>'production_quantity')::integer>0 or exists(select from public.finished_stock_movements m
        where m.user_id=owner_id and m.order_item_id=(old->>'id')::uuid
          and m.event_key like '%:fulfill:'||(old->>'id'))))
    and (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(p_state->'orderItems') p
      where p->>'source_order_id'=any(target_ids) and not coalesce((p->>'archived')::boolean,false)) is distinct from
      (select coalesce(jsonb_agg(p->>'id' order by p->>'id'),'[]') from jsonb_array_elements(original->'orderItems') p
        where p->>'source_order_id'=any(target_ids) and not coalesce((p->>'archived')::boolean,false))
    then raise exception 'PRINTED_ORDER_ITEMS_CANNOT_BE_REPLACED'; end if;
  if command_kind='returnOrderFinished' then
    select value into item from jsonb_array_elements(p_state->'orderItems') where value->>'id'=p_command->>'orderItemId';
    select value into old_item from jsonb_array_elements(original->'orderItems') where value->>'id'=p_command->>'orderItemId';
    if item is null or old_item is null or item->>'product_id' is null
      or coalesce((item->>'returned_quantity')::integer,0)-coalesce((old_item->>'returned_quantity')::integer,0)
        is distinct from (p_command->>'quantity')::integer
      or (item-array['returned_quantity']) is distinct from (old_item-array['returned_quantity'])
      then raise exception 'INVALID_FINISHED_RETURN'; end if;
    if coalesce((select sum(m.delta_quantity) from jsonb_populate_recordset(null::public.finished_stock_movements,p_state->'finishedMovements') m
      where m.order_item_id=(p_command->>'orderItemId')::uuid and m.source='finished_return'
        and not exists(select from public.finished_stock_movements known where known.id=m.id)),0)
      is distinct from (p_command->>'quantity')::integer then raise exception 'INVALID_FINISHED_RETURN_MOVEMENT'; end if;
  end if;
  -- Replay only the new movements to verify their historical/weighted basis.
  for stock_balance in select value from jsonb_array_elements(p_state->'finishedBalances') loop
    select coalesce((b->>'quantity')::integer,0),coalesce((b->>'average_unit_cost')::numeric,0)
      into stock_quantity,stock_average from jsonb_array_elements(original->'finishedBalances') b
      where b->>'source_product_id'=stock_balance->>'source_product_id';
    stock_quantity:=coalesce(stock_quantity,0); stock_average:=coalesce(stock_average,0);
    for stock_movement in select value from jsonb_array_elements(p_state->'finishedMovements') m
      where m->>'source_product_id'=stock_balance->>'source_product_id'
        and not exists(select from public.finished_stock_movements known where known.id=(m->>'id')::uuid) loop
      if stock_movement->>'event_key' is distinct from event_id
        and left(stock_movement->>'event_key',length(event_id)+1) is distinct from event_id||':'
        then raise exception 'ORDER_MOVEMENT_DOES_NOT_MATCH_COMMAND'; end if;
      if (stock_movement->>'delta_quantity')::integer<0 then
        if -(stock_movement->>'delta_quantity')::integer>stock_quantity
          or abs((stock_movement->>'unit_cost')::numeric-stock_average)>0.000001
          then raise exception 'ORDER_RESERVE_BASIS_MISMATCH'; end if;
      elsif (stock_movement->>'delta_quantity')::integer>0 then
        select value into old_item from jsonb_array_elements(original->'orderItems') i where i->>'id'=stock_movement->>'order_item_id';
        if old_item is null or (old_item->>'fulfilled_quantity')::integer<=0 then raise exception 'INVALID_RETURN_ALLOCATION'; end if;
        select coalesce(-sum(m.delta_quantity*m.unit_cost),0) into return_basis
          from jsonb_populate_recordset(null::public.finished_stock_movements,original->'finishedMovements') m
          where m.order_item_id=(old_item->>'id')::uuid and m.source='order';
        return_basis:=return_basis+coalesce((select sum(p.quantity*p.unit_cost)
          from jsonb_populate_recordset(null::public.production_events,original->'productionEvents') p
          where p.order_item_id=(old_item->>'id')::uuid),0);
        if not exists(select from public.finished_stock_movements m where m.user_id=owner_id and m.order_item_id=(old_item->>'id')::uuid and m.source='order')
          and not exists(select from public.production_events p where p.user_id=owner_id and p.order_item_id=(old_item->>'id')::uuid)
          then return_basis:=(old_item->>'total_cost')::numeric; end if;
        return_basis:=return_basis/(old_item->>'fulfilled_quantity')::integer;
        if abs((stock_movement->>'unit_cost')::numeric-return_basis)>0.000001 then raise exception 'ORDER_RETURN_BASIS_MISMATCH'; end if;
        stock_average:=(stock_quantity*stock_average+(stock_movement->>'delta_quantity')::integer*return_basis)
          /(stock_quantity+(stock_movement->>'delta_quantity')::integer);
      end if;
      stock_quantity:=stock_quantity+(stock_movement->>'delta_quantity')::integer;
      if (stock_movement->>'balance_after')::integer<>stock_quantity then raise exception 'ORDER_MOVEMENT_BALANCE_MISMATCH'; end if;
    end loop;
    if (stock_balance->>'quantity')::integer<>stock_quantity
      or abs((stock_balance->>'average_unit_cost')::numeric-stock_average)>0.000001
      then raise exception 'ORDER_FINISHED_BASIS_MISMATCH'; end if;
  end loop;
  -- Allocation cannot create or erase on-hand inventory without immutable movements.
  if exists(select from jsonb_populate_recordset(null::public.finished_stock_balances,p_state->'finishedBalances') incoming
    left join public.finished_stock_balances old on old.id=incoming.id and old.user_id=owner_id
    where incoming.quantity<>coalesce(old.quantity,0)+coalesce((select sum(m.delta_quantity)
      from jsonb_populate_recordset(null::public.finished_stock_movements,p_state->'finishedMovements') m
      where m.user_id=owner_id and m.source_product_id=incoming.source_product_id
        and not exists(select from public.finished_stock_movements known where known.id=m.id)),0))
    then raise exception 'ORDER_FINISHED_LEDGER_MISMATCH'; end if;
  if exists(select from jsonb_populate_recordset(null::public.filament_variants,p_state->'variants') incoming
    join public.filament_variants old on old.id=incoming.id and old.user_id=owner_id
    where abs(incoming.stock_g-old.stock_g-coalesce((select sum(m.delta_g)
      from jsonb_populate_recordset(null::public.filament_movements,p_state->'filamentMovements') m
      where m.user_id=owner_id and m.variant_id=incoming.id
        and not exists(select from public.filament_movements known where known.id=m.id)),0))>0.000001
      or incoming.average_cost_per_g<>old.average_cost_per_g)
    then raise exception 'ORDER_MATERIAL_LEDGER_MISMATCH'; end if;
  if exists(select from jsonb_populate_recordset(null::public.production_events,p_state->'productionEvents') incoming
    where not exists(select from public.production_events old where old.id=incoming.id)
      and not exists(select from jsonb_array_elements(p_state->'orderItems') p
        where p->>'id'=incoming.order_item_id::text and p->>'source_order_id'=any(target_ids)))
    then raise exception 'ORDER_PRODUCTION_SOURCE_MISMATCH'; end if;
  for production in select value from jsonb_array_elements(p_state->'productionEvents') p
    where not exists(select from public.production_events known where known.id=(p->>'id')::uuid) loop
    select value into item from jsonb_array_elements(p_state->'orderItems') where value->>'id'=production->>'order_item_id';
    select value into head from jsonb_array_elements(p_state->'legacyOrders') where value->>'id'=item->>'source_order_id';
    if command_kind<>'saveBusinessOrder' or head->>'status' not in
      ('Печать','Ждет покраски','Покраска','Ждет отправки','Отправлен','Готово')
      or production->'recipe_snapshot' is distinct from item#>'{snapshot,recipe}'
      or production->'product_id' is distinct from item->'product_id'
      then raise exception 'INVALID_ORDER_PRODUCTION'; end if;
    current_cost:=(production#>>'{recipe_snapshot,non_material_unit_cost}')::numeric;
    for material in select jsonb_build_object('variant_id',m->>'variant_id',
        'grams_per_unit',sum(round((m->>'grams_per_unit')::numeric,6)))
      from jsonb_array_elements(production#>'{recipe_snapshot,materials}') m group by m->>'variant_id' loop
      required_grams:=(material->>'grams_per_unit')::numeric*(production->>'quantity')::integer;
      select coalesce(-sum(delta_g),0) into accounted_grams
        from jsonb_populate_recordset(null::public.filament_movements,p_state->'filamentMovements')
        where source_id=production->>'id' and variant_id=(material->>'variant_id')::uuid;
      accounted_grams:=accounted_grams+coalesce((select sum(grams)
        from jsonb_populate_recordset(null::public.filament_deficits,p_state->'deficits')
        where source_id=production->>'id' and variant_id=(material->>'variant_id')::uuid),0);
      if abs(required_grams-accounted_grams)>0.000001 then raise exception 'ORDER_PRODUCTION_GRAMS_MISMATCH'; end if;
      current_cost:=current_cost+(material->>'grams_per_unit')::numeric*
        (select average_cost_per_g from public.filament_variants where id=(material->>'variant_id')::uuid and user_id=owner_id);
    end loop;
    if current_cost is null or abs(current_cost-(production->>'unit_cost')::numeric)>0.000001
      then raise exception 'ORDER_PRODUCTION_COST_MISMATCH'; end if;
  end loop;
  -- Reuses ownership/FK/finite checks, append-only audit and receipt in the same transaction.
  return public.business_commit_inventory_internal(p_expected_revision,p_command,p_state);
end $$;
revoke all on function public.business_apply_order(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.business_apply_order(bigint,jsonb,jsonb) to authenticated;

-- Pending pre-upgrade single-product commands must also accept a shortage.
-- The public compatibility wrapper from phase 2 supplies the same owner lock and ledger context.
create or replace function public.legacy_save_order_with_inventory_unlocked(p_order jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  owner_id uuid:=auth.uid();
  target_order_id uuid:=coalesce(nullif(p_order->>'id','')::uuid,gen_random_uuid());
  old_head public.orders%rowtype;
  product_id uuid:=nullif(p_order->>'product_id','')::uuid;
  requested integer:=coalesce((p_order->>'quantity')::integer,1);
  reserved integer:=0;
  head jsonb;
  saved jsonb;
  columns_list text;
  assignments text;
  next_number bigint;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  select * into old_head from public.orders where id=target_order_id and user_id=owner_id for update;
  if exists(select from public.orders where id=target_order_id and user_id<>owner_id) then raise exception 'CROSS_OWNER_ID'; end if;
  if old_head.order_archived or exists(select from public.order_items where user_id=owner_id
    and source_order_id=target_order_id::text and cost_provenance<>'legacy') then
    raise exception 'ORDER_REQUIRES_ATOMIC_ITEM_API';
  end if;
  if old_head.id is not null and (old_head.type is distinct from p_order->>'type' or old_head.product_id is distinct from product_id
    or old_head.quantity is distinct from requested) then raise exception 'ORDER_ITEM_EDIT_REQUIRES_ATOMIC_API'; end if;
  if old_head.id is null and p_order->>'type'='income' and product_id is not null then
    if requested<=0 then raise exception 'INVALID_ORDER_QUANTITY'; end if;
    select least(coalesce(stock_quantity,0),requested) into reserved from public.saved_calculations
      where id=product_id and user_id=owner_id for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
    update public.saved_calculations set stock_quantity=greatest(0,coalesce(stock_quantity,0)-reserved)
      where id=product_id and user_id=owner_id;
  end if;
  -- Metadata/payment changes do not return/re-reserve old inventory or revalue it.
  if old_head.id is not null then
    next_number:=old_head.order_number;
  else
    select coalesce(max(order_number),1000)+1 into next_number from public.orders where user_id=owner_id;
  end if;
  head:=(coalesce(to_jsonb(old_head),'{}'::jsonb)||p_order)-'items';
  head:=head||jsonb_build_object('id',target_order_id,'user_id',owner_id,'order_number',next_number,
    'created_at',coalesce(old_head.created_at,nullif(p_order->>'created_at','')::timestamptz,now()),
    'order_revision',case when old_head.id is null then 0 else old_head.order_revision+1 end,
    'cost',coalesce(old_head.cost,nullif(p_order->>'cost','')::numeric,0),
    'order_archived',false,'payment',coalesce(nullif(p_order->>'payment','')::numeric,old_head.payment,0),
    'payments',coalesce(p_order->'payments',to_jsonb(old_head.payments),'[]'::jsonb));
  select string_agg(format('%I',a.attname),','),string_agg(format('%1$I=excluded.%1$I',a.attname),',') filter
    (where a.attname not in ('id','user_id','created_at','order_number')) into columns_list,assignments
    from pg_attribute a where a.attrelid='public.orders'::regclass and a.attnum>0 and not a.attisdropped;
  execute format('insert into public.orders(%s) select %s from jsonb_populate_record(null::public.orders,$1)
    on conflict(id) do update set %s where public.orders.user_id=excluded.user_id',columns_list,columns_list,assignments) using head;
  select to_jsonb(o) into saved from public.orders o where id=target_order_id and user_id=owner_id;
  if saved->>'type'='income' and requested>0 and not exists(select from public.order_items
      where user_id=owner_id and source_order_id=target_order_id::text) then
    insert into public.order_items(id,user_id,order_id,source_order_id,product_id,name,quantity,
      unit_cost,total_cost,unit_price,total_price,cost_provenance,fulfilled_quantity,production_quantity,
      snapshot,legacy_key,reserved_quantity,returned_quantity,archived)
    values(target_order_id,owner_id,target_order_id,target_order_id::text,product_id,coalesce(saved->>'title','Order'),requested,
      (saved->>'cost')::numeric/requested,(saved->>'cost')::numeric,
      (saved->>'amount')::numeric/requested,(saved->>'amount')::numeric,'legacy',reserved,0,
      jsonb_build_object('version',1,'order',saved,'calculation',null,'recipe',null),target_order_id::text,reserved,0,false);
  end if;
  return saved;
end $$;
revoke all on function public.legacy_save_order_with_inventory_unlocked(jsonb) from public,anon,authenticated;

-- Compatibility deletion also retains parents/audit and releases only the actual
-- preprint reserve. Modern snapshots must use the revisioned atomic API.
create or replace function public.legacy_delete_orders_atomic_unlocked(p_ids uuid[])
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  owner_id uuid:=auth.uid();
  old_head public.orders%rowtype;
  item public.order_items%rowtype;
  released integer;
  changed integer:=0;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  for old_head in select * from public.orders where user_id=owner_id and id=any(p_ids) and not order_archived for update loop
    if exists(select from public.order_items where user_id=owner_id and source_order_id=old_head.id::text
      and cost_provenance<>'legacy') then raise exception 'ORDER_REQUIRES_ATOMIC_ITEM_API'; end if;
    for item in select * from public.order_items where user_id=owner_id and source_order_id=old_head.id::text and not coalesce(archived,false) loop
      released:=greatest(0,coalesce(item.reserved_quantity,0)-coalesce(item.returned_quantity,0));
      if old_head.status in ('Не в работе','Моделирование','Ждет печати') and item.production_quantity=0
        and released>0 and item.product_id is not null then
        update public.saved_calculations set stock_quantity=coalesce(stock_quantity,0)+released
          where id=item.product_id and user_id=owner_id;
        update public.order_items set returned_quantity=coalesce(returned_quantity,0)+released where id=item.id;
      end if;
      update public.order_items set archived=true where id=item.id;
    end loop;
    update public.orders set order_archived=true,order_revision=order_revision+1 where id=old_head.id;
    changed:=changed+1;
  end loop;
  return changed;
end $$;
revoke all on function public.legacy_delete_orders_atomic_unlocked(uuid[]) from public,anon,authenticated;
commit;

-- END ORDER LIFECYCLE 20261001

-- BEGIN BUSINESS MAINTENANCE 20261001
-- Phase 6. Apply after order_lifecycle. Complete same-owner restore only.
-- Explicit user maintenance is the only operation that replaces audit history.
begin;
alter table public.business_state_revisions add column if not exists generation bigint not null default 0 check(generation >= 0);

do $$ begin
  if to_regprocedure('public.business_snapshot_before_maintenance()') is null then
    alter function public.business_inventory_snapshot() rename to business_snapshot_before_maintenance;
  end if;
end $$;
revoke all on function public.business_snapshot_before_maintenance() from public,anon,authenticated;
create or replace function public.business_inventory_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  result:=public.business_snapshot_before_maintenance();
  return result || jsonb_build_object('generation',coalesce((select generation from public.business_state_revisions where user_id=auth.uid()),0));
end $$;
revoke all on function public.business_inventory_snapshot() from public,anon;
grant execute on function public.business_inventory_snapshot() to authenticated;

create or replace function public.business_database_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); result jsonb; relation_name text; rows_json jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  result:=jsonb_build_object('business',public.business_inventory_snapshot());
  foreach relation_name in array array['printers','filaments','settings','collections','saved_calculations','orders','monthly_goals'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from public.%I r where user_id=$1',relation_name) into rows_json using owner_id;
    result:=result||jsonb_build_object(relation_name,rows_json);
  end loop;
  return result;
end $$;
revoke all on function public.business_database_snapshot() from public,anon;
grant execute on function public.business_database_snapshot() to authenticated;

create or replace function public.business_assert_generation(p_command jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); current_generation bigint;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  -- An acknowledged old request remains retryable after a reset.
  if exists(select from public.business_operation_receipts where user_id=owner_id and event_key=p_command->>'id') then return; end if;
  select coalesce(generation,0) into current_generation from public.business_state_revisions where user_id=owner_id;
  if coalesce((p_command->>'generation')::bigint,0) is distinct from coalesce(current_generation,0) then
    raise exception 'BUSINESS_GENERATION_CONFLICT';
  end if;
end $$;
revoke all on function public.business_assert_generation(jsonb) from public,anon,authenticated;

-- Keep existing validation/receipt behavior behind generation-aware entry points.
do $wrap$ declare api text; internal_name text; definition text; begin
  foreach api in array array['commit_business_inventory','business_apply_order','business_apply_catalog','business_save_calculation_project'] loop
    internal_name:=api||'_before_maintenance';
    if to_regprocedure(format('public.%I(bigint,jsonb,jsonb)',internal_name)) is null then
      execute format('alter function public.%I(bigint,jsonb,jsonb) rename to %I',api,internal_name);
    end if;
    execute format('revoke all on function public.%I(bigint,jsonb,jsonb) from public,anon,authenticated',internal_name);
    execute format($fn$create or replace function public.%I(p_expected_revision bigint,p_command jsonb,p_state jsonb)
      returns jsonb language plpgsql security definer set search_path='' as $body$
      begin perform public.business_assert_generation(p_command);
        return public.%I(p_expected_revision,p_command,p_state); end $body$;$fn$,api,internal_name);
    execute format('revoke all on function public.%I(bigint,jsonb,jsonb) from public,anon',api);
    execute format('grant execute on function public.%I(bigint,jsonb,jsonb) to authenticated',api);
  end loop;
  if to_regprocedure('public.business_apply_legacy_order_before_maintenance(jsonb)') is null then
    alter function public.business_apply_legacy_order(jsonb) rename to business_apply_legacy_order_before_maintenance;
  end if;
  -- The modern legacy command has already checked its epoch. Its internal calls
  -- bypass raw legacy entry points, which cannot safely identify old queued work.
  foreach api in array array['save_order_with_inventory','restore_orders_snapshot'] loop
    internal_name:='business_'||api||'_compat_internal';
    if to_regprocedure(format('public.%I(jsonb)',internal_name)) is null then
      execute format('alter function public.%I(jsonb) rename to %I',api,internal_name);
    end if;
    execute format('revoke all on function public.%I(jsonb) from public,anon,authenticated',internal_name);
    definition:=pg_get_functiondef('public.business_apply_legacy_order_before_maintenance(jsonb)'::regprocedure);
    definition:=replace(definition,'public.'||api||'(','public.'||internal_name||'(');
    execute definition;
    execute format($fn$create or replace function public.%I(%I jsonb) returns %s language plpgsql security definer set search_path='' as $body$
      begin perform public.business_assert_generation('{}'::jsonb); %s public.%I(%I); end $body$;$fn$,
      api,case when api='save_order_with_inventory' then 'p_order' else 'p_orders' end,
      case when api='save_order_with_inventory' then 'jsonb' else 'integer' end,'return',internal_name,
      case when api='save_order_with_inventory' then 'p_order' else 'p_orders' end);
    execute format('revoke all on function public.%I(jsonb) from public,anon',api);
    execute format('grant execute on function public.%I(jsonb) to authenticated',api);
  end loop;
  if to_regprocedure('public.business_delete_orders_compat_internal(uuid[])') is null then
    alter function public.delete_orders_atomic(uuid[]) rename to business_delete_orders_compat_internal;
  end if;
  definition:=pg_get_functiondef('public.business_apply_legacy_order_before_maintenance(jsonb)'::regprocedure);
  execute replace(definition,'public.delete_orders_atomic(','public.business_delete_orders_compat_internal(');
end $wrap$;
revoke all on function public.business_apply_legacy_order_before_maintenance(jsonb),public.business_delete_orders_compat_internal(uuid[]) from public,anon,authenticated;
create or replace function public.business_apply_legacy_order(p_command jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin perform public.business_assert_generation(p_command); return public.business_apply_legacy_order_before_maintenance(p_command); end $$;
create or replace function public.delete_orders_atomic(p_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$
begin perform public.business_assert_generation('{}'::jsonb); return public.business_delete_orders_compat_internal(p_ids); end $$;
revoke all on function public.business_apply_legacy_order(jsonb),public.delete_orders_atomic(uuid[]) from public,anon;
grant execute on function public.business_apply_legacy_order(jsonb),public.delete_orders_atomic(uuid[]) to authenticated;

-- Incomplete legacy restore endpoints must never resurrect a pre-reset cache.
do $legacy$ declare api text; internal_name text; parameter_name text; return_name text; call_keyword text; begin
  foreach api in array array['restore_database_snapshot','restore_saved_calculations_snapshot','restore_collections_snapshot'] loop
    internal_name:=api||'_before_maintenance';
    if to_regprocedure(format('public.%I(jsonb)',internal_name)) is null and to_regprocedure(format('public.%I(jsonb)',api)) is not null then
      execute format('alter function public.%I(jsonb) rename to %I',api,internal_name);
    end if;
    if to_regprocedure(format('public.%I(jsonb)',internal_name)) is null then continue; end if;
    select proargnames[1],prorettype::regtype::text into parameter_name,return_name from pg_proc where oid=to_regprocedure(format('public.%I(jsonb)',internal_name));
    call_keyword:=case when return_name='void' then 'perform' else 'return' end;
    execute format('revoke all on function public.%I(jsonb) from public,anon,authenticated',internal_name);
    execute format($fn$create or replace function public.%I(%I jsonb) returns %s language plpgsql security definer set search_path='' as $body$
      begin perform public.business_assert_generation('{}'::jsonb); %s public.%I(%I); end $body$;$fn$,api,parameter_name,return_name,call_keyword,internal_name,parameter_name);
    execute format('revoke all on function public.%I(jsonb) from public,anon',api);
    execute format('grant execute on function public.%I(jsonb) to authenticated',api);
  end loop;
end $legacy$;

create or replace function public.business_restore_snapshot(p_expected_revision bigint,p_command jsonb,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  owner_id uuid:=auth.uid(); state jsonb:=p_snapshot->'business'; mapping record; relation_name text;
  current_revision bigint; current_generation bigint; stored jsonb; receipt jsonb;
  rows_json jsonb; row_json jsonb; invalid boolean;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_command->>'kind' is distinct from 'restoreBusinessSnapshot' or nullif(p_command->>'id','') is null
    or length(p_command->>'id')>160 or nullif(p_command->>'occurredAt','') is null then raise exception 'INVALID_MAINTENANCE_COMMAND'; end if;
  perform pg_advisory_xact_lock(hashtextextended('business_inventory:'||owner_id::text,0));
  receipt:=p_command||jsonb_build_object('snapshotHash',md5(p_snapshot::text));
  select command into stored from public.business_operation_receipts where user_id=owner_id and event_key=p_command->>'id';
  if found then
    if stored is distinct from receipt then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    return public.business_inventory_snapshot();
  end if;
  insert into public.business_state_revisions(user_id) values(owner_id) on conflict do nothing;
  select revision,generation into current_revision,current_generation from public.business_state_revisions where user_id=owner_id for update;
  if p_expected_revision is distinct from current_revision or (p_command->>'generation')::bigint is distinct from current_generation then
    raise exception 'BUSINESS_MAINTENANCE_REVISION_CONFLICT'; end if;
  if state->>'version' is distinct from '1' or state->>'user_id' is distinct from owner_id::text then raise exception 'INVALID_OWNER_OR_VERSION'; end if;
  foreach relation_name in array array['printers','filaments','settings','collections','saved_calculations','orders','monthly_goals'] loop
    if jsonb_typeof(p_snapshot->relation_name) is distinct from 'array' then raise exception 'INCOMPLETE_MAINTENANCE_SNAPSHOT: %',relation_name; end if;
    if exists(select from jsonb_array_elements(p_snapshot->relation_name) r where r ? 'user_id' and r->>'user_id' is distinct from owner_id::text) then raise exception 'CROSS_OWNER_ROW'; end if;
  end loop;
  -- Check all row boundaries and foreign primary-key collisions before deletion.
  for mapping in select * from (values
    ('manufacturers','filament_manufacturers'),('materialTypes','material_types'),('materialLines','material_lines'),
    ('variants','filament_variants'),('purchases','filament_purchases'),('projects','calculation_projects'),
    ('calculationItems','calculation_items'),('orderItems','order_items'),('productionEvents','production_events'),
    ('filamentMovements','filament_movements'),('deficits','filament_deficits'),('finishedBalances','finished_stock_balances'),
    ('finishedMovements','finished_stock_movements')) m(key,relation) loop
    rows_json:=state->mapping.key;
    if jsonb_typeof(rows_json) is distinct from 'array' then raise exception 'INVALID_COLLECTION: %',mapping.key; end if;
    if exists(select from jsonb_array_elements(rows_json) r where r->>'user_id' is distinct from owner_id::text) then raise exception 'CROSS_OWNER_ROW'; end if;
    execute format('select exists(select from jsonb_populate_recordset(null::public.%1$I,$2) incoming join public.%1$I old on incoming.id=old.id where old.user_id<>$1)',mapping.relation)
      into invalid using owner_id,rows_json;
    if invalid then raise exception 'CROSS_OWNER_ID'; end if;
  end loop;
  -- Nested snapshots are historical facts, but their identities still belong to this owner.
  if exists(with recursive nested(value) as (
    select p_snapshot union all select child from nested n cross join lateral (
      select v as child from jsonb_each(case when jsonb_typeof(n.value)='object' then n.value else '{}'::jsonb end) e(k,v)
      union all select v from jsonb_array_elements(case when jsonb_typeof(n.value)='array' then n.value else '[]'::jsonb end) e(v)
    ) c) select from nested where jsonb_typeof(value)='object' and value ? 'user_id' and value->>'user_id' is distinct from owner_id::text)
    then raise exception 'CROSS_OWNER_SNAPSHOT'; end if;
  foreach relation_name in array array['finished_stock_movements','filament_movements','filament_deficits','production_events',
    'order_items','calculation_items','calculation_projects','filament_purchases','finished_stock_balances','filament_variants',
    'material_lines','material_types','filament_manufacturers'] loop
    execute format('delete from public.%I where user_id=$1',relation_name) using owner_id;
  end loop;
  perform public.legacy_restore_database_snapshot_unlocked(p_snapshot-'business');
  for mapping in select * from (values
    ('manufacturers','filament_manufacturers'),('materialTypes','material_types'),('materialLines','material_lines'),
    ('variants','filament_variants'),('purchases','filament_purchases'),('projects','calculation_projects'),
    ('calculationItems','calculation_items'),('orderItems','order_items'),('productionEvents','production_events'),
    ('filamentMovements','filament_movements'),('deficits','filament_deficits'),('finishedBalances','finished_stock_balances'),
    ('finishedMovements','finished_stock_movements')) m(key,relation) loop
    execute format('insert into public.%1$I select r.* from jsonb_populate_recordset(null::public.%1$I,$1) r',mapping.relation) using state->mapping.key;
  end loop;
  if exists(select from public.order_items where user_id=owner_id and (coalesce(reserved_quantity,0)+production_quantity<>fulfilled_quantity
    or coalesce(returned_quantity,0)>fulfilled_quantity)) then raise exception 'INVALID_ALLOCATION_COUNTERS'; end if;
  if exists(select from public.order_items i where i.user_id=owner_id and not exists
    (select from public.orders o where o.user_id=owner_id and o.id::text=i.source_order_id and o.type='income'))
    then raise exception 'INVALID_ORDER_REFERENCE'; end if;
  if exists(select from public.orders o where o.user_id=owner_id and o.product_id is not null and not exists
    (select from public.saved_calculations p where p.id=o.product_id and p.user_id=owner_id)) then raise exception 'CROSS_OWNER_PRODUCT'; end if;
  if exists(select from public.orders o where o.user_id=owner_id and o.type='income' and not o.order_archived and
    o.cost is distinct from (select coalesce(sum(i.total_cost),0) from public.order_items i where i.user_id=owner_id and i.source_order_id=o.id::text and not coalesce(i.archived,false)))
    then raise exception 'ORDER_COST_SNAPSHOT_MISMATCH'; end if;
  -- JSON recipes have no relational FK: validate their material identities explicitly.
  for row_json in select recipe from public.calculation_items where user_id=owner_id union all
    select recipe_snapshot from public.production_events where user_id=owner_id union all
    select snapshot->'recipe' from public.order_items where user_id=owner_id and snapshot->'recipe'<>'null'::jsonb loop
    if row_json->>'version' is distinct from '1' or jsonb_typeof(row_json->'materials') is distinct from 'array'
      or jsonb_typeof(row_json->'non_material_unit_cost') is distinct from 'number'
      or (row_json->>'non_material_unit_cost')::numeric<0 or exists(select from jsonb_array_elements(row_json->'materials') m where
        jsonb_typeof(m->'grams_per_unit') is distinct from 'number' or (m->>'grams_per_unit')::numeric<=0
        or not exists(select from public.filament_variants v where v.user_id=owner_id and v.id::text=m->>'variant_id'))
      then raise exception 'INVALID_RECIPE_REFERENCE'; end if;
  end loop;
  update public.saved_calculations p set stock_quantity=b.quantity from public.finished_stock_balances b where p.user_id=owner_id and b.user_id=owner_id and p.id=b.product_id;
  update public.business_state_revisions set revision=current_revision+1,generation=current_generation+1 where user_id=owner_id;
  insert into public.business_operation_receipts(user_id,event_key,command,revision) values(owner_id,p_command->>'id',receipt,current_revision+1);
  return public.business_inventory_snapshot();
end $$;
revoke all on function public.business_restore_snapshot(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.business_restore_snapshot(bigint,jsonb,jsonb) to authenticated;
commit;

-- END BUSINESS MAINTENANCE 20261001
