// Run only against a disposable database: this creates a minimal Supabase schema.
// Usage: node scripts/test-atomic-snapshot.mjs <psql-path> <connection-url>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const [psql, database] = process.argv.slice(2);
if (!psql || !database) throw new Error('Provide psql and a disposable database URL.');
function sql(query, succeeds = true) {
  const result = spawnSync(psql, ['-X', '-v', 'ON_ERROR_STOP=1', '-At', database], {
    input: query, encoding: 'utf8', windowsHide: true,
  });
  if (succeeds) assert.equal(result.status, 0, result.stderr);
  else assert.notEqual(result.status, 0, 'Expected the transaction to fail.');
  return result.stdout.trim();
}
const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const product = '00000000-0000-4000-8000-000000000003';
const printer = '00000000-0000-4000-8000-000000000004';
const schema = readFileSync('supabase_schema.sql', 'utf8');
const migration = readFileSync('supabase_migration_20260908_atomic_snapshot.sql', 'utf8');
assert.equal(schema.slice(schema.indexOf('create or replace function public.restore_database_snapshot')).trim(),
  migration.slice(migration.indexOf('create or replace function public.restore_database_snapshot')).trim());
sql(`create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  create role authenticated;
  create role anon;
  ${schema.slice(0, schema.indexOf('-- КОМАНДЫ МИГРАЦИИ'))}
  ${migration}
  insert into auth.users values ('${owner}'), ('${other}');
  insert into public.printers (id,user_id,name,power_w,price,lifespan_hours)
    values ('${printer}','${other}','Other user printer',100,100,100);
  insert into public.filaments (user_id,name,weight_g,price)
    values ('${owner}','Keep me',1000,100), ('${other}','Other user filament',1000,100);
`);
const invoke = payload => `set role authenticated;
  set request.jwt.claim.sub = '${owner}';
  select public.restore_database_snapshot('${JSON.stringify(payload).replaceAll("'", "''")}'::jsonb);`;
const contents = () => sql("select jsonb_agg(to_jsonb(f) order by id) from public.filaments f");
const before = contents();
sql(invoke({ filaments: [], monthly_goals: [{ id: 'bad', month_key: 'default', target_amount: 10 }] }), false);
assert.equal(contents(), before, 'A late UUID error must roll back earlier deletes.');
sql(invoke({ filaments: [], settings: [{ default_printer_id: printer }] }), false);
assert.equal(contents(), before, 'A foreign-owner reference must roll back earlier deletes.');
sql("set role anon; select public.restore_database_snapshot('{}'::jsonb);", false);
sql("set role authenticated; select public.restore_database_snapshot('{}'::jsonb);", false);
sql(invoke({
  filaments: [{ name: 'Restored', weight_g: 1000, price: 100, user_id: other }],
  saved_calculations: [{ id: product, name: 'Product', filament_name: 'PLA', printer_name: 'Printer',
    weight_g: 1, hours: 1, minutes: 0, quantity: 1, base_cost: 1, final_price: 2, stock_quantity: 3 }],
  orders: [{ date: '2026-09-08', type: 'income', title: 'Order', quantity: 2, product_id: product, order_number: 1007 }],
}));
assert.equal(sql(`select stock_quantity from public.saved_calculations where id='${product}'`), '3');
assert.equal(sql(`select next_number from public.order_counters where user_id='${owner}'`), '1008');
assert.equal(sql(`select count(*) from public.filaments where user_id='${other}'`), '1');
assert.equal(sql(`select user_id from public.filaments where name='Restored'`), owner);
sql(invoke({ saved_calculations: [] }));
assert.equal(sql(`select count(*) from public.orders where user_id='${owner}'`), '1', 'Legacy omissions preserve orders.');
sql(invoke({ orders: [{ date: '2026-09-08', type: 'income', title: 'Legacy order' }] }));
assert.equal(sql(`select quantity from public.orders where user_id='${owner}'`), '1');
console.log('Atomic snapshot SQL checks passed: rollback, ownership, authorization, exact stock, counters, legacy omissions/defaults.');
