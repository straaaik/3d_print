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
alter table public.saved_calculations add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
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
