# Этап 6 — интеграционная проверка, миграции и полировка

Это финальный этап после всех функций. Не добавляй новую бизнес-логику без необходимости; цель — найти расхождения и довести систему до целостного состояния.

Проведи end-to-end ревизию:
1. Один и тот же calculation engine используется Calculator/Products/Orders; CalculationReceipt не расходится между экранами.
2. Проверь все старые места amount-cost и auto-payment; основная actual profit в Orders/Stats = payment-cost.
3. Проверь отсутствие скрытых stock blockers в UI/API/db/RPC.
4. Проверь идемпотентность ledger, уникальные keys/source references, отсутствие double material consumption.
5. Проверь legacy data/backfill, localStorage migration/fallback, работу до Supabase migration (без crash) и после migration.
6. Проверь, что existing product price не меняется сам при новой purchase, а new product берет current average.
7. Проверь NumberInput в orders/calculator/products.
8. Проверь accessibility/basic responsive behavior для stack checks, receipts и expanded product row.
9. Добавь/дополни automated tests для calculation engine, inventory transitions, order profit и migrations/helper logic.
10. Прогони все доступные lint/typecheck/tests/build, исправь регрессии.
11. Сверь и обнови supabase_schema.sql; подготовь конечный чистый SQL migration (или последовательность миграций) для пользователя.
12. Дай итоговый отчет: changes, SQL, manual steps, tests, limitations.
