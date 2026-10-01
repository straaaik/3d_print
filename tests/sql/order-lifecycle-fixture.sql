-- Disposable database only. Load legacy fixture and migrations 1–5 first.
alter table public.orders add column if not exists order_number bigint;
alter table public.orders add column if not exists date text default '01.10.2026';
alter table public.orders add column if not exists status text default 'Не в работе';
alter table public.orders add column if not exists payment numeric default 0;
alter table public.orders add column if not exists payments jsonb default '[]';
alter table public.orders add column if not exists base_amount numeric;
alter table public.orders add column if not exists urgency_type text;
alter table public.orders add column if not exists urgency_percent numeric;
alter table public.orders add column if not exists urgency_amount numeric;
alter table public.orders add column if not exists discount_type text;
alter table public.orders add column if not exists discount_percent numeric;
alter table public.orders add column if not exists discount_amount numeric;
alter table public.orders add column if not exists client text default '';
alter table public.orders add column if not exists client_name text;
alter table public.orders add column if not exists contact text default '';
alter table public.orders add column if not exists contacts jsonb default '[]';
alter table public.orders add column if not exists deadline text default '';
alter table public.orders add column if not exists notes text default '';
alter table public.saved_calculations add column if not exists name text default 'Part';
alter table public.saved_calculations add column if not exists created_at timestamptz default now();
insert into public.filament_variants(id,user_id,name,color,stock_g,average_cost_per_g,revision)
values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111','PLA','#ffffff',25,2,0);
insert into public.finished_stock_balances(id,user_id,product_id,source_product_id,quantity,average_unit_cost,revision)
values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',2,10,0);
