-- 3D Labs: безопасность, целостность заказов и атомарный склад
-- Выполнить целиком в Supabase Dashboard -> SQL Editor.

begin;

-- Известный установочный ключ больше не должен существовать.
delete from public.registration_keys
where key = '3DLAB-SETUP-ADMIN-KEY';

-- Восстанавливаем отсутствующие legacy-профили только с безопасной ролью user.
insert into public.profiles (id, email, name, role, is_active, avatar_color)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(nullif(u.raw_user_meta_data->>'name', ''), split_part(coalesce(u.email, ''), '@', 1), 'Пользователь'),
  'user',
  true,
  coalesce(nullif(u.raw_user_meta_data->>'avatar_color', ''), '#8B5CF6')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Оставляем одну, самую свежую строку настроек на пользователя.
with ranked_settings as (
  select id, row_number() over (
    partition by user_id
    order by updated_at desc nulls last, id desc
  ) as row_num
  from public.settings
  where user_id is not null
)
delete from public.settings s
using ranked_settings r
where s.id = r.id and r.row_num > 1;

create unique index if not exists uq_settings_user_id
  on public.settings(user_id);

-- Нормализуем повторяющиеся/пустые номера перед уникальным индексом.
with ranked_orders as (
  select
    id,
    user_id,
    order_number,
    row_number() over (
      partition by user_id, order_number
      order by created_at, id
    ) as duplicate_num,
    greatest(coalesce(max(order_number) over (partition by user_id), 1000), 1000) as max_num
  from public.orders
  where user_id is not null
), to_renumber as (
  select
    id,
    user_id,
    max_num,
    row_number() over (partition by user_id order by id) as offset_num
  from ranked_orders
  where order_number is null or duplicate_num > 1
)
update public.orders o
set order_number = r.max_num + r.offset_num
from to_renumber r
where o.id = r.id;

create unique index if not exists uq_orders_user_order_number
  on public.orders(user_id, order_number)
  where user_id is not null and order_number is not null;

-- Ограничения применяются к новым/изменяемым строкам, не ломая миграцию на legacy-данных.
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
    and base_cost >= 0 and final_price >= 0
    and coalesce(stock_quantity, 0) >= 0
    and coalesce(discount_percent, 0) between 0 and 100
    and coalesce(discount_amount, 0) >= 0
    and coalesce(urgency_percent, 0) >= 0
    and coalesce(urgency_amount, 0) >= 0
  ) not valid;

alter table public.orders drop constraint if exists orders_valid_financial_values;
alter table public.orders add constraint orders_valid_financial_values
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
  ) not valid;

-- Безопасная проверка административных полномочий без рекурсии RLS.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

-- Закрываем утечку профилей и возможность самому менять роль/статус.
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
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Admins delete profiles" on public.profiles
  for delete to authenticated
  using (public.is_current_user_admin() and id <> auth.uid());

revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (name, email, avatar_color, last_login_at) on public.profiles to authenticated;
grant delete on public.profiles to authenticated;

-- Изменение роли/статуса доступно только через проверенный RPC.
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
  if not public.is_current_user_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if new_role is not null and new_role not in ('admin', 'user') then
    raise exception 'INVALID_ROLE';
  end if;
  if target_user_id = auth.uid() and (new_role = 'user' or new_is_active = false) then
    raise exception 'CANNOT_LOCK_CURRENT_ADMIN';
  end if;

  update public.profiles
  set
    role = coalesce(new_role, role),
    is_active = coalesce(new_is_active, is_active)
  where id = target_user_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.admin_update_profile(uuid, text, boolean) from public;
grant execute on function public.admin_update_profile(uuid, text, boolean) to authenticated;

-- Анонимному клиенту возвращается только boolean, содержимое ключей не раскрывается.
create or replace function public.validate_registration_key(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.registration_keys
    where key = upper(trim(p_key))
      and is_used = false
      and (expires_at is null or expires_at > now())
  );
$$;

revoke all on function public.validate_registration_key(text) from public;
grant execute on function public.validate_registration_key(text) to anon, authenticated;

-- Профиль и ключ создаются/погашаются в одной транзакции auth.users.
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
  set
    is_used = true,
    used_by_email = new.email,
    used_by_user_id = new.id,
    used_at = now()
  where key = claimed_key
    and is_used = false
    and (expires_at is null or expires_at > now())
  returning role_to_grant into claimed_role;

  if claimed_role is null then
    raise exception 'INVALID_REGISTRATION_KEY';
  end if;

  insert into public.profiles (
    id, email, name, role, is_active, avatar_color, registration_key_used
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(coalesce(new.email, ''), '@', 1), 'Пользователь'),
    claimed_role,
    true,
    coalesce(nullif(new.raw_user_meta_data->>'avatar_color', ''), '#8B5CF6'),
    claimed_key
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    avatar_color = excluded.avatar_color;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Ключи полностью скрыты от anon; CRUD разрешён только администраторам.
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

-- Атомарное выделение номера заказа без гонки между вкладками.
create table if not exists public.order_counters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  next_number bigint not null check (next_number > 0)
);

insert into public.order_counters (user_id, next_number)
select user_id, greatest(coalesce(max(order_number), 1000) + 1, 1001)
from public.orders
where user_id is not null
group by user_id
on conflict (user_id) do update
set next_number = greatest(public.order_counters.next_number, excluded.next_number);

alter table public.order_counters enable row level security;
revoke all on public.order_counters from anon, authenticated;

create or replace function public.allocate_order_number()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allocated_number bigint;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  insert into public.order_counters as counters (user_id, next_number)
  values (auth.uid(), 1002)
  on conflict (user_id) do update
    set next_number = counters.next_number + 1
  returning next_number - 1 into allocated_number;

  return allocated_number;
end;
$$;

revoke all on function public.allocate_order_number() from public;
grant execute on function public.allocate_order_number() to authenticated;

-- Сохранение заказа и изменение склада выполняются одной транзакцией.
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
  if current_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  begin
    requested_id := nullif(p_order->>'id', '')::uuid;
  exception when others then
    requested_id := null;
  end;
  requested_id := coalesce(requested_id, gen_random_uuid());

  select * into old_order
  from public.orders
  where id = requested_id and user_id = current_user_id
  for update;

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

  -- Возвращаем на склад количество, ранее зарезервированное этим заказом.
  if old_order.id is not null and old_order.type = 'income' and old_order.product_id is not null then
    update public.saved_calculations
    set stock_quantity = coalesce(stock_quantity, 0) + greatest(coalesce(old_order.quantity, 0), 0)::integer
    where id = old_order.product_id and user_id = current_user_id;
  end if;

  -- Резервируем новое количество и не допускаем отрицательный остаток.
  if order_record.type = 'income' and order_record.product_id is not null then
    inventory_delta := greatest(coalesce(order_record.quantity, 0), 0);
    update public.saved_calculations
    set stock_quantity = coalesce(stock_quantity, 0) - inventory_delta::integer
    where id = order_record.product_id
      and user_id = current_user_id
      and coalesce(stock_quantity, 0) >= inventory_delta;

    if not found then
      raise exception 'INSUFFICIENT_STOCK';
    end if;
  end if;

  insert into public.orders as target (
    id, user_id, order_number, created_at, date, type, title, quantity,
    base_amount, urgency_type, urgency_percent, urgency_amount,
    discount_type, discount_percent, discount_amount, amount, cost,
    cost_items, payments, payment, client, contact, contacts, deadline,
    status, notes, product_id
  ) values (
    order_record.id, order_record.user_id, order_record.order_number, order_record.created_at,
    order_record.date, order_record.type, order_record.title, order_record.quantity,
    order_record.base_amount, order_record.urgency_type, order_record.urgency_percent, order_record.urgency_amount,
    order_record.discount_type, order_record.discount_percent, order_record.discount_amount,
    order_record.amount, order_record.cost, coalesce(order_record.cost_items, '[]'::jsonb),
    coalesce(order_record.payments, '[]'::jsonb), order_record.payment, order_record.client,
    order_record.contact, coalesce(order_record.contacts, '[]'::jsonb), order_record.deadline,
    order_record.status, order_record.notes, order_record.product_id
  )
  on conflict (id) do update set
    order_number = excluded.order_number,
    date = excluded.date,
    type = excluded.type,
    title = excluded.title,
    quantity = excluded.quantity,
    base_amount = excluded.base_amount,
    urgency_type = excluded.urgency_type,
    urgency_percent = excluded.urgency_percent,
    urgency_amount = excluded.urgency_amount,
    discount_type = excluded.discount_type,
    discount_percent = excluded.discount_percent,
    discount_amount = excluded.discount_amount,
    amount = excluded.amount,
    cost = excluded.cost,
    cost_items = excluded.cost_items,
    payments = excluded.payments,
    payment = excluded.payment,
    client = excluded.client,
    contact = excluded.contact,
    contacts = excluded.contacts,
    deadline = excluded.deadline,
    status = excluded.status,
    notes = excluded.notes,
    product_id = excluded.product_id
  where target.user_id = current_user_id
  returning target.* into saved_order;

  if saved_order.id is null then
    raise exception 'ORDER_FORBIDDEN';
  end if;

  return to_jsonb(saved_order);
end;
$$;

revoke all on function public.save_order_with_inventory(jsonb) from public;
grant execute on function public.save_order_with_inventory(jsonb) to authenticated;

-- Пакетное удаление возвращает связанные товары на склад.
create or replace function public.delete_orders_atomic(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

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

  delete from public.orders
  where user_id = auth.uid() and id = any(p_ids);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_orders_atomic(uuid[]) from public;
grant execute on function public.delete_orders_atomic(uuid[]) to authenticated;

-- Undo заменяет снимок целиком, поэтому удалённые/созданные строки не воскресают.
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
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if jsonb_typeof(p_orders) <> 'array' then
    raise exception 'INVALID_ORDER_SNAPSHOT';
  end if;

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

-- Атомарные снимки для Undo каталога и коллекций.
create or replace function public.restore_saved_calculations_snapshot(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare restored_count integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'INVALID_CALCULATION_SNAPSHOT'; end if;

  delete from public.saved_calculations where user_id = auth.uid();
  insert into public.saved_calculations
  select (jsonb_populate_record(
    null::public.saved_calculations,
    (item - 'user_id') || jsonb_build_object('user_id', auth.uid())
  )).*
  from jsonb_array_elements(p_items) as source(item);
  get diagnostics restored_count = row_count;
  return restored_count;
end;
$$;

revoke all on function public.restore_saved_calculations_snapshot(jsonb) from public;
grant execute on function public.restore_saved_calculations_snapshot(jsonb) to authenticated;

create or replace function public.restore_collections_snapshot(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare restored_count integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'INVALID_COLLECTION_SNAPSHOT'; end if;

  delete from public.collections where user_id = auth.uid();
  insert into public.collections
  select (jsonb_populate_record(
    null::public.collections,
    (item - 'user_id') || jsonb_build_object('user_id', auth.uid())
  )).*
  from jsonb_array_elements(p_items) as source(item);
  get diagnostics restored_count = row_count;
  return restored_count;
end;
$$;

revoke all on function public.restore_collections_snapshot(jsonb) from public;
grant execute on function public.restore_collections_snapshot(jsonb) to authenticated;

commit;
