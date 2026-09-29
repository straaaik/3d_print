# Этап 1 — фундамент: модель данных, миграции и единое ядро

Работаем над проектом 3D Labs. Это первый этап большой модернизации. Сначала прочитай AGENTS.md и текущую архитектуру. На этом этапе НЕ надо доводить все UI-фичи; задача — создать фундамент без ломки существующего приложения, чтобы следующие этапы не переделывали модель.

Сделай:
1. Спроектируй и добавь типы/схему для: filament manufacturers, material types, material lines, filament variants, purchases, filament movements/deficits, calculation projects/items, order items, finished stock movements/production accounting.
2. Все таблицы user-scoped, RLS + индексы. Подготовь чистый SQL migration и обнови supabase_schema.sql.
3. Сохрани backward compatibility: legacy filaments, saved_calculations, orders.product_id. Продумай backfill старых single order -> one order item там, где безопасно.
4. Версионируй/мигрируй localStorage fallback вместо очистки.
5. Укрепи calculation engine: единые типы результата, planned profit, подготовка project-level totals, CustomCostItem mode enum (profit_only/cost_with_markup/cost_no_markup), agreed-price final override. Legacy custom costs не должны менять старые суммы.
6. Создай единый NumberInput и базовый CalculationReceipt (presentational), но пока не переписывай все экраны целиком.
7. Добавь/обнови unit tests расчетного ядра: три custom cost mode, agreed price, quantity, discount/urgency.
8. Существующее приложение после этапа должно по-прежнему открываться даже до применения миграции Supabase благодаря fallback/feature-safe parsing.

В конце дай SQL, список измененных файлов и результаты tests/typecheck/lint/build. Не начинай глубокую UI-переделку следующих этапов.
