> Актуально на 24 сентября: [десять моделей](workshop-assets.md), [новый свет и камера](workshop-scene-quality.md). Ниже сохранён отчёт первоначального этапа; его числа тестов и состав ассетов исторические.

# Мастерская: результат реализации

Работа выполнена в ветке `test`. Добавлена защищённая страница `/workshop` и пункт общей навигации. Поддерживаются комнаты, редактируемая мебель, поворот и перемещение по сетке с проверкой границ/пересечений, слоты, размещение существующих принтеров и филамента, поиск, инспектор, minimap, 2D/3D и сохранение положения камеры. Данные оборудования не дублируются; вымышленной телеметрии нет.

Визуальное направление взято из `codex_workshop_pack/references/target_reference.png`; шесть GLB и процедурная мебель построены по изображениям из `codex_workshop_pack/assets`. Светлое дерево, графитовые рамы, открытая изометрическая комната, цвет реального филамента. Модели стилизованы, не являются точными CAD-копиями. Метрики и способы воспроизведения: [workshop-assets.md](workshop-assets.md).

## Проверки

- `npm test`: **208 пройдено, 0 ошибок**.
- `npm run build`: успешно, `/workshop` включён в сборку.
- ESLint новых компонентов мастерской и генератора: без ошибок и предупреждений.
- Локальная браузерная проверка Chromium: **12 сценариев пройдено, 0 ошибок**. Проверены комнаты, мебель, поворот, запрет выхода за границы, drag, модель принтера, перемещение между комнатами, поиск, удаление размещения, reload, мобильная ширина и навигация. Ошибок страницы не зарегистрировано.
- Миграция и `scripts/verify-workshop.sql` успешно исполнены на изолированном PostgreSQL 18 с тестовыми auth/inventory таблицами и ролями. Проверены ограничения, RLS, атомарность, конфликты revision и сохранение placements при восстановлении inventory.
- Полный `npm run test:e2e` не запускался согласно правилам проекта: push не запрошен. Существующий `playwright-report/index.html` не обновлялся и не является отчётом этой проверки.

Скриншоты и JSON браузерной проверки находятся в `.codex-tmp/workshop-desktop.png`, `.codex-tmp/workshop-focus.png`, `.codex-tmp/workshop-mobile.png`, `.codex-tmp/workshop-smoke-result.json`. Оборудование для проверки добавлялось только в отдельный браузерный контекст.

## База и ограничения

Готовый SQL для Supabase Dashboard → SQL Editor: `supabase_migration_20260923_workshop.sql`. Канонический `supabase_schema.sql` обновлён. Удалённая миграция не применялась; проверка с реальной Supabase Auth и одновременная гонка двух подключений остаются staging-проверками. Подробности: [workshop-database-verification.md](workshop-database-verification.md).

До миграции и при недоступности облака используется localStorage с разделением по аккаунтам. Конфликт облачной и локальной версии требует явного выбора копии. Отключённый браузером storage явно отображается как изменения только в памяти.

24 сентября модели заново построены в Blender 5.0 по PNG: нативные редактируемые детали, кривые и модификаторы, экспорт семи GLB (включая профили мебели). Семь .blend повторно открыты; шесть основных GLB прошли повторный импорт и рендер. Актуальные метрики, команды и изображения — в [workshop-assets.md](workshop-assets.md). Повторные проверки: 208 тестов и 12 браузерных сценариев без ошибок; build и ESLint успешны.

## Новые файлы

- `src/app/(protected)/workshop/page.tsx` — защищённая страница.
- `src/features/workshop/WorkshopPage.tsx`, `WorkshopCanvas.tsx`, `WorkshopScene.ts`, `sceneGeometry.ts`, `Editors.tsx`, `Minimap.tsx`, `model.ts`, `persistence.ts`, `useWorkshop.ts` — интерфейс, сцена, геометрия, правила планировки и сохранение.
- `tests/workshop.test.ts`, `tests/workshop-persistence.test.ts` — логика и сохранение.
- `supabase_migration_20260923_workshop.sql`, `scripts/verify-workshop.sql` — миграция и SQL-проверки.
- `scripts/generate-workshop-models.mjs`, `scripts/blender/generate_workshop_assets.py`, `scripts/blender/import_workshop_masters.py` — генераторы и подготовка Blender-файлов.
- `assets/blender/workshop-*.blend`, `assets/blender/verification.json` — шесть редактируемых моделей и проверка импорта.
- `public/models/workshop/printer-a1.glb`, `printer-p1.glb`, `filament-spool.glb`, `packing-boxes.glb`, `plant.glb`, `tool-cabinet.glb`, `metrics.json` — модели и метрики.
- `docs/superpowers/plans/2026-09-23-workshop.md`, `docs/workshop-assets.md`, `docs/workshop-database-verification.md`, `docs/workshop-implementation.md` — план и отчёты.

## Изменённые файлы

- `src/shared/ui/MainNavbar.tsx` — переход в мастерскую из общей навигации.
- `src/shared/ui/page-transition/routePlan.ts` — готовность защищённой страницы.
- `scripts/test.mjs` — подключение тестов мастерской.
- `supabase_schema.sql` — таблицы, RLS, RPC и совместимость восстановления inventory.

Исходный пользовательский пакет `codex_workshop_pack` сохранён. Коммиты и push не выполнялись.


## Дополнительно после переработки моделей 24 сентября

Новые файлы: scripts/blender/rebuild_workshop_assets.py, generate_furniture_profiles.py, verify_workshop_assets.py; assets/blender/master-verification.json; public/models/workshop/furniture-profiles.glb; assets/blender/workshop-furniture-profiles.blend; docs/workshop-renders/. Обновлены все шесть основных GLB и их .blend, metrics.json, verification.json, sceneGeometry.ts (профили мебели и версия загрузки), WorkshopScene.ts (отражённое окружение), генераторы и документация.

