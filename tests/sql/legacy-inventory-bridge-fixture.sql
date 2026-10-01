-- Disposable local test fixture. Loaded before the two foundation migrations.
\ir foundation-fixture.sql
alter table public.saved_calculations add column quantity integer not null default 1;

create function public.save_order_with_inventory(p_order jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  owner_id uuid := auth.uid();
  order_id uuid := coalesce(nullif(p_order->>'id', '')::uuid, gen_random_uuid());
  product_id uuid := nullif(p_order->>'product_id', '')::uuid;
  amount integer := coalesce((p_order->>'quantity')::integer, 1);
  result public.orders%rowtype;
  old_order public.orders%rowtype;
begin
  if owner_id is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into old_order from public.orders where id = order_id and user_id = owner_id for update;
  if old_order.type = 'income' and old_order.product_id is not null then
    update public.saved_calculations set stock_quantity = stock_quantity + old_order.quantity::integer
      where id = old_order.product_id and user_id = owner_id;
  end if;
  if product_id is not null and p_order->>'type' = 'income' then
    update public.saved_calculations set stock_quantity = stock_quantity - amount
      where id = product_id and user_id = owner_id and stock_quantity >= amount;
    if not found then raise exception 'INSUFFICIENT_STOCK'; end if;
  end if;
  insert into public.orders(id,user_id,product_id,title,type,quantity,amount,cost)
    values(order_id, owner_id, product_id, coalesce(p_order->>'title','Order'),
      coalesce(p_order->>'type','income'), amount,
      coalesce((p_order->>'amount')::numeric, 0), coalesce((p_order->>'cost')::numeric, 0))
    on conflict(id) do update set title=excluded.title, amount=excluded.amount, cost=excluded.cost,
      type=excluded.type, product_id=excluded.product_id, quantity=excluded.quantity
      where orders.user_id = owner_id
    returning * into result;
  if result.id is null then raise exception 'ORDER_FORBIDDEN'; end if;
  return to_jsonb(result);
end $$;

create function public.delete_orders_atomic(p_ids uuid[])
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare deleted integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  update public.saved_calculations p set stock_quantity = p.stock_quantity + returned.quantity
    from (select product_id, sum(quantity)::integer as quantity from public.orders
      where user_id=auth.uid() and id=any(p_ids) and type='income' and product_id is not null
      group by product_id) returned
    where p.id=returned.product_id and p.user_id=auth.uid();
  delete from public.orders where user_id=auth.uid() and id=any(p_ids);
  get diagnostics deleted = row_count;
  return deleted;
end $$;

create function public.restore_orders_snapshot(p_orders jsonb)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare item jsonb; restored integer := 0; ids uuid[];
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select coalesce(array_agg(id), array[]::uuid[]) into ids from public.orders where user_id=auth.uid();
  perform public.delete_orders_atomic(ids);
  for item in select value from jsonb_array_elements(p_orders) loop
    perform public.save_order_with_inventory(item); restored := restored + 1;
  end loop;
  return restored;
end $$;

create function public.restore_saved_calculations_snapshot(p_items jsonb)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  return jsonb_array_length(p_items);
end $$;

create function public.restore_database_snapshot(p_snapshot jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_snapshot) <> 'object' then raise exception 'INVALID_DATABASE_SNAPSHOT'; end if;
end $$;

revoke all on function public.save_order_with_inventory(jsonb), public.delete_orders_atomic(uuid[]),
  public.restore_orders_snapshot(jsonb), public.restore_saved_calculations_snapshot(jsonb),
  public.restore_database_snapshot(jsonb) from public;
grant execute on function public.save_order_with_inventory(jsonb), public.delete_orders_atomic(uuid[]),
  public.restore_orders_snapshot(jsonb), public.restore_saved_calculations_snapshot(jsonb),
  public.restore_database_snapshot(jsonb) to authenticated;
