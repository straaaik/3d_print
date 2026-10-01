-- Test fixture ONLY: run in a disposable PostgreSQL database, never Supabase.
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.filaments(id uuid primary key, user_id uuid, weight_g numeric, price numeric);
create table public.saved_calculations(id uuid primary key, user_id uuid, final_price numeric, base_cost numeric, stock_quantity integer);
create table public.orders(id uuid primary key, user_id uuid, created_at timestamptz default now(), product_id uuid,
  title text, type text, quantity numeric, amount numeric, cost numeric);
insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into public.saved_calculations values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',999,888,2);
insert into public.orders(id,user_id,product_id,title,type,quantity,amount,cost) values
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Historical','income',5,100,60),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111',null,'Expense','expense',1,10,0);
