# Модернизация 3D Labs — состояние работы

Обновлено 1 октября 2026. Требования: `new-qust/3d_labs_codex_instructions/docs/codex/DECISIONS_AND_CONSTRAINTS.md`. Этапы выполняются последовательно; этот файл фиксирует выполненное, а не заменяет требования.

## Git и исходное состояние

- Исходные изменения сохранены и отправлены в `origin/test`: `6491f21`.
- Перед этим push: unit **285 passed / 0 failed**, E2E **94 passed / 0 failed / 4 skipped**. Обновление двух calculator snapshots пользователь разрешил.
- Новая работа находится в `codex/business-modernization`, пока без commit/push. Новые изменения в `test` не отправлять; `main` не изменять.
- Автопродолжение `3d-labs`: каждые 5 часов. По просьбе пользователя сообщение — ровно `продолжи`. После завершения всех этапов удалить автозапуск.

## Этап 1: завершён

- Добавлены отдельные user-scoped модели справочников, вариантов, закупок, проектов и позиций расчёта/заказа, производства, готового склада и движений.
- SQL создаёт 13 таблиц, RLS, индексы и составные внешние ключи, защищающие связь между пользователями. Безопасный backfill сохраняет историческую сумму/себестоимость доходного single-item заказа. Он не создаёт расход материалов или готового товара.
- Legacy таблицы остаются совместимыми. Исторические ссылки при удалении старого родителя обнуляются без удаления финансового snapshot.
- Кэш получает версию и резервную копию вместо очистки. Неизвестная версия/повреждение не допускают перезапись. Новый складской fallback записывает целое состояние одной операцией с проверкой revision; при подключении операций нужен Web Lock на весь read/modify/write.
- Единое расчётное ядро поддерживает три режима дополнительных расходов, согласованную цену последним override, отдельную плановую/фактическую прибыль и итоги проекта. Вес/время существующего расчёта уже относятся ко всей партии и не умножаются повторно.
- Добавлены переиспользуемые `NumberInput` и `CalculationReceipt`, пока без глубокой интеграции экранов.
- Независимое ревью обнаружило три дефекта; все исправлены и повторно проверены: legacy target при миграции, запись кэша будущей версии, SQL NULL-проверка версии snapshot.

Итоговые проверки: unit **310 passed / 0 failed**, TypeScript и production build успешны, общий lint **0 ошибок / 52 предупреждения**. На локальной PostgreSQL 18 миграция применена дважды; SQL assertions прошли (финансовая история, RLS, ownership FK, некорректный snapshot, отрицательные/NaN остатки, идемпотентность события, запрет удаления аудита, сохранение истории после удаления родителей). Временный сервер остановлен. Сервер Supabase не изменялся.

Общий lint выявил ошибки существующего кода и включение временных файлов/вложенного worktree. Временные каталоги исключены из ESLint; ошибки исходников и тестовых типов исправлены без отключения правил. При проверке этих правок устранены дефект первого открытия ColorPicker и инициализация текста выбранной подписи мастерской. E2E во время разработки не запускались: полный прогон только перед финальным push.

## Следующие этапы — ещё не выполнены

2. **Завершён.** Каталог материалов, закупки, weighted average, производство/ручная корректировка, ledger, атомарные RPC и цельный local fallback.
3. **Завершён.** Multi-item калькулятор, сохранение/сравнение, общий чек, создание заказа.
4. **Завершён.** Полное редактирование товара, Save/Cancel, edit-in-calculator, явный пересчёт.
5. **Завершён.** Multi-item заказы, snapshot себестоимости, actual profit, производство по порогу статуса без двойного списания.
6. Интеграционные проверки, backup/restore новых данных, полный final test/E2E и push в `codex/`.

### Итог этапа 2 (30 сентября)

- Готовы `inventoryEngine`, каталог `MaterialInventory`, панель `FinishedStockPanel`, repository с цельной записью очереди и Web Locks, Supabase transport и InventoryProvider.
- В `useData` подключены проекции текущей цены материала и готового остатка. Сложность материала берётся из справочника типа; сохранённые retail/base_cost товаров не меняются от закупки.
- Подготовлена миграция `supabase_migration_20260929_inventory_transactions.sql`; включена в schema. Реальные SQL-проверки CAS/идемпотентности/rollback/изоляции/неизменяемого аудита прошли на локальной PostgreSQL 18.
- Итоговый unit-прогон: **339 passed / 0 failed**. TypeScript, production build и diff check прошли; lint **0 ошибок / 52 предупреждения**. `.test-dist` исключён из ESLint.
- Ревью исправлено: микродефицит float (вес согласован с SQL до 6 знаков); ping-pong storage/refetch между вкладками; stock writeback после старых order RPC; потеря syncError в уведомлении; expense-only очередь при старом reset; возврат резерва по неверной себестоимости; повтор подтверждённого заказа после потерянного ответа и изменений другой вкладки. Последнее независимое клиентское ревью не нашло оставшихся P1/P2 в проверенном объёме.
- Старые заказы после bootstrap идут через ту же цельную state/outbox запись, что закупки и производство. Старая sync_queue обрабатывается до inventory snapshot под общей owner WebLock. Remote bootstrap использует `legacyProducts` сервера, а не оптимистический браузерный stock. Повтор legacy command достигает серверной квитанции до проверки актуального остатка.
- `supabase_migration_20260930_legacy_inventory_bridge.sql` добавлена в schema. Owner lock предшествует row locks; old order RPC обновляет ledger; возврат использует исходный basis отрицательного order movement; финансовые изменения/неизменные резервы не переоценивают склад. Старые резервы без движения имеют неизвестный actual basis и возвращаются по текущей средней оценке.
- Bridge применена дважды на одноразовой PostgreSQL 18: **72 SQL assertions passed / 0 failed**. SQL на сервере Supabase не применялся.
- Browser smoke: создание варианта, закупка 500 г/1000 ₽ → 2 ₽/г; производство 600 г при остатке 500 → stock0, deficit100, finished+1 с cost1200; manual+1 по100 → finished2/cost650 без нового расхода; retail2000 сохранена. `/filaments` и `/products` на390px без горизонтального переполнения. Это smoke, полный E2E остаётся перед финальным push.
- **До завершения всей задачи:** реализовать полноценный backup V3/export/atomic restore/reset со складом. Сейчас старые export/reset/restore/seed временно fail-closed, если локально есть новая складская история. Не оставлять этот временный guard как финальный результат. SQL restore guard также нужен, если история существует только на сервере.
- Временный PostgreSQL cluster `.codex-tmp/phase-modernization/pgdata` остановлен после проверки; cloud Supabase не изменялся.
- На этапе 4 отдельно сохранить physical stock при редактировании metadata товара и обработать старый Undo каталога новым атомарным путём; временный restore guard не обходить.

## SQL для пользователя

### Итог этапа 3 (30 сентября)

- Калькулятор использует один versioned user-scoped draft проекта с независимыми карточками; 10 карточек проверены переключением и reload. Новая карточка/копирование/удаление, названия, явное сохранение/загрузка, сравнение максимум двух позиций и live пересчёт работают через общее ядро.
- Есть отдельные скидки позиции/проекта, nullable agreed price (включая 0), warning below cost и 3 явных режима дополнительных расходов. Общий переиспользуемый чек показывает изделия, позиции, вес по филаментам, время, финансовые корректировки и маржу. Сравнение включает все показатели из TASK_03.
- `saveProject` сохраняет целый проект через общую state/outbox запись, архивирует удалённые позиции без удаления прежних IDs. Проверка revision не допускает молчаливую перезапись проекта другой вкладкой. Явный выбор сохранения своей версии поверх сервера перебазирует команду и сохраняет резервную копию исходной очереди локально; локальный конфликт без очереди требует нового сохранения перед сообщением успеха.
- Создание заказа из проекта передаёт отдельные frozen snapshot-ы в review modal, сохраняет head + order_items атомарно, не выставляет оплату автоматически. Новый заказ создаётся в «Не в работе»; резерв/производство и основной редактор заказов — этап 5. Повтор после потерянного ответа достигает квитанции, даже если другая вкладка уже отредактировала/удалила head.
- Подготовлены `supabase_migration_20260930_calculation_projects.sql` и `supabase_migration_20260930_project_orders.sql` (archived, project revision RPC, orders.agreed_price и atomic create RPC); оба exact-блока включены в schema. Обе миграции применены дважды на локальной PostgreSQL 18: **17 SQL assertions passed / 0 failed**; дополнительная исходная проверка архивной колонки — 8 assertions + NOT NULL. Сервер остановлен; облачный Supabase не изменялся.
- Последний полный unit-прогон: **367 passed / 0 failed**. TypeScript и production build успешны, lint **0 ошибок / 52 предупреждения**; targeted lint и diff check чистые. Независимое ревью и исправления: stale overwrite, receipt replay, ложный успех после локального конфликта, недостающие метрики; в проверенной области оставшихся P1/P2 нет.
- Browser smoke (390px): 10 карточек сохранили веса 10…100 г после reload, общий вес550 г без повторного умножения, horizontal overflow отсутствует. Заказ из исходных трёх карточек сохранил costs21/42/63, agreed0/payment0; дальнейшее изменение проекта не изменило его snapshots. Полный E2E ещё не запускался и требуется только перед final push.
- Следующий этап 4: metadata edit должен сохранять physical stock, новый atomic catalog update/Undo, полный row editor и product-ID bridge в калькулятор. Backup/restore остаются задачей этапа 6; временный fail-closed guard не считать окончательным решением.

Инструкция: [MIGRATIONS.md](MIGRATIONS.md). Подготовлена `supabase_migration_20260929_business_foundation.sql`, её содержимое также включено в `supabase_schema.sql`. Применение на сервере выполняет пользователь; приложение на этапе 1 не зависит от применения этой миграции.

## Ограничения для продолжения

- Не менять зафиксированные правила прибыли/цен/склада.
- Новые критические операции не отправлять через старую очередь одиночных upsert: необходим атомарный RPC с event key и revision/блокировками.
- Старый `save_order_with_inventory` работает через compatibility bridge. Его прежний запрет дефицита готовых изделий снимается при внедрении multi-item заказов на этапе 5; физическое производство уже использует floor0/deficit.
- Backup V1/V2 и `restore_database_snapshot` требуют расширения до ввода новых сущностей в UI.
- Не выводить стоимость нового производства из текущей retail price товара; отдельный cost basis готового склада обязателен.

### Прогресс этапа 4 (1 октября; финальный gate ещё не пройден)

- Готовы чистые catalog commands, canonical legacyProducts projection, мягкое архивирование, metadata-only targeted Undo/CAS, общее atomic state/outbox. Редактирование сохраняет finished balance/cost basis; catalog конфликт имеет явное принятие серверной версии с резервной копией исходной локальной команды и разблокированием очереди.
- ProductCalculationEditor и product/form/snapshot helpers готовы. Прямая передача товара добавляет linked card, исходный ID/revision; Calculator имеет Update/SaveAsNew, frozen revision при project reload, предупреждение ухода/удаления dirty cards и защиту default-resource effects при hydration. Browser уже подтвердил name-only Save без изменения retail/stock/basis/history, Cancel, сохранение прежних 10 карточек при добавлении товара.
- Добавлена supabase_migration_20260930_catalog_templates.sql (revision/archive/snapshot/agreed_price + catalog RPC), exact block в schema/MIGRATIONS. Первые локальные SQL assertions passed, повтор миграции passed; облачный SQL не выполнялся. После последних изменений constraint требуется ещё один свежий SQL прогон. Локальный PG запущен port55439.
- Последний промежуточный unit: 380passed/4failed (3 устаревших assembly drawer проверки, исправляется сохранением legacy synthetic-part drawer; 1 incomplete legacy fixture, исправлено). Не считать этап завершённым до нового полного npm test/typecheck/lint/build/SQL/browser smoke. E2E не запускался.
- Новый bounded implementer catalog_drawer_integration завершает mobile drawer, единый portal editor без double mount на resize, row catalog revision и close guards; работает только ProductCalculationEditor, ProductRowDrawer, ProductsV2Table/View. Root ProductList Undo/history/central recalc готовятся к review.

### Итог этапа 4 (1 октября)

- Catalog RPC, полное inline редактирование, Save/Cancel, frozen revision, metadata-only targeted Undo и явное принятие server conflict с локальной копией готовы. Два последовательных Undo проверены в браузере: revision3→4→5, исходное название восстановлено, stock2/cost basis650/revision2, material0 и production events1 не изменились.
- Один portal editor сохраняет dirty draft при desktop/mobile resize; отмена закрытия удерживает weight700. При скрытии строк фильтром editor остаётся видимым в retained panel с рабочими Save/Cancel/close; это подтверждено браузером.
- Fresh linked card12 сохранила exact resource IDs, включая отсутствующий printerId, baseline и revision5, предыдущие 11 карточек сохранены. Update сохранил исходный ID/stock2, explicit agreed0; SaveAsNew создал UUID с stock0. Historical order item costs21/42/63 и physical basis650 не изменились.
- Финальный npm test: **384 passed / 0 failed**. TypeScript, production build, diff check прошли; lint **0 errors / 51 warnings**. Независимое source review не обнаружило оставшихся существенных P1/P2.
- Catalog SQL на новой disposable PostgreSQL18 применён дважды; 24 assertions + 7 negative checks прошли, включая missing command kind, incomplete snapshot rollback, targeted Undo/CAS/receipt/owner isolation. Log .codex-tmp/phase-modernization/catalog-gate-final-sql.log. Локальный сервер остановлен. Cloud SQL не применялся. E2E остаётся только перед final push.
- Далее этап5: полноценная lifecycle интеграция orderItems/reservation/production, manual multi-item modal, единая actual profit semantics. Stage6 backup V3 пока не начинался; временный maintenance guard остаётся до него.

### Итог этапа 5 (1 октября)

- Head/order items/reserve/production сохраняются одной командой с owner lock, CAS и квитанцией до проверки revision. Финансовые правки используют immutable snapshots; printed recipe/quantity защищены даже после отката статуса, finished return отдельная команда по исходной фактической стоимости. Старый SQL compatibility путь допускает shortage, сохраняет стоимость и освобождает только фактический preprint reserve.
- Manual multi-item форма использует полный общий редактор и individual/shared receipts. Удалены дублирующие старые поля, редакторы перенесены из заголовка в scrollable body, исправлены mobile catalog hit testing и доступность создания в compact header. Дефициты относятся к позициям через production event.
- Browser: три manual позиции10/20/30г → amount600/cost126/payment0; agreed0→clear600; directdone производит по единице и фиксирует60г дефицита. Повтор статусов не меняет4 production events. Mobile390 payment700→actualprofit574, snapshots/cost/events сохранены, overflow отсутствует.
- Browser stock2/order5: reserve2/remaining3/stock0/cost4900; затем отдельное production+1 даётstock1/basis1200 и600г дефицита. Directdone использует эту единицу и производит только2, reserve3/produced2/fulfilled5; ещё1200г дефицита, retail0 и payment0 сохранены.
- SQL: supabase_migration_20261001_order_lifecycle.sql дважды на свежей PostgreSQL18, **85 assertions passed**. Проверены RPC/direct-write bypass, защита actualcost/counters/active IDs, original return basis, duplicate-material assembly, project-order immediate reserve, retry/rollback/owner/CAS. Independent reviewer подтвердил исправление всех выявленных P1/P2. Точный блок включён в schema; cloudSQL не выполнялся.
- Gate: **430 unit passed / 0 failed**, TypeScript и production build прошли, lint **0 errors / 53 warnings**. E2E не запускался. Логи stage5-gate-* и stage5-sql-final.log в .codex-tmp/phase-modernization.
- Далее этап6: полный business backup/restore/reset вместо временных legacy guards, ревизия stock basis и конечный общий QA.
