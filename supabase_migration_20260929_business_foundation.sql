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
