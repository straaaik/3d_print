# MASTER PROMPT — Codex / Мастерская

Работай с существующим репозиторием `https://github.com/straaaik/3d_print`, целевая ветка **`test`**. Не изменяй `main`. Не создавай новый Vite/React проект: нужно встроить функцию в существующее приложение.

Перед изменениями обязательно:

1. прочитай корневые `AGENTS.md` и `DESIGN_SYSTEM.md`;
2. найди текущий код прототипа 3D-мастерской;
3. найди текущую навигацию;
4. изучи фактическую Supabase-схему и смысл существующих `printers` и `filaments`;
5. прочитай весь пакет `codex_workshop_pack`;
6. сравни `references/current_workshop.png` и `references/target_reference.png`.

## Главная цель

Создай полноценную страницу `/workshop` с названием **«Мастерская»**. Это визуальная карта реальных принтеров и филамента пользователя, а не отдельный справочник. Визуально привести текущий прототип к `target_reference.png`: low-poly management-game isometric scene, более плотная и организованная композиция, аккуратная инженерная UI-обвязка.

## Что уже нельзя ломать

Сохрани рабочий renderer/camera/controls/raycasting/minimap/search из текущего прототипа, если они архитектурно пригодны. Не переписывай Three.js только ради другой библиотеки. Используй уже существующие зависимости; новые npm пакеты — только при доказанной необходимости и с учётом project rules.

## Навигация

Добавь `Мастерская` в существующий MainNavbar и route `/workshop`. Следуй текущему UI-kit и дизайн-системе проекта.

## Динамическая архитектура

НЕ делай комнату одним GLB. Динамически строить в Three.js:
- room floor/walls;
- tables;
- printer racks;
- filament racks;
- slots;
- zoning/floor markings;
- selection marker.

Blender/GLB — только для повторно используемых ассетов, прежде всего двух принтеров и катушки.

## Комнаты

Пользователь должен:
- создавать несколько комнат;
- переименовывать/удалять;
- менять width/depth;
- переключать active room;
- сохранять layout.

Room switcher сделать существующими UI primitives проекта.

## Мебель и edit mode

Два режима: VIEW / EDIT. В EDIT:
- `+ Стол`;
- `+ Стойка`;
- `+ Стеллаж`;
- drag по floor plane;
- grid snap 0.25/0.5 м;
- rotate 90°;
- rename/delete;
- bounds check;
- basic AABB collision.

Мебель хранит world transform. Каждый объект мебели создаёт local slots. Placement привязан к slot, а не к случайному world XYZ.

## Принтеры

Использовать уже существующие принтеры сайта. Не дублировать их бизнес-поля. Placement хранит только связь printer → slot и `visual_model_key`.

Для MVP только 2 визуальных типа:
- `a1` — открытый A1-style;
- `p1` — закрытый P1-style.

В пакете есть стартовые `models/printer-a1-style.glb` и `models/printer-p1-style.glb` и Blender generator. Используй их как placeholders/базу, но при доступном Blender улучши геометрию по `blender/ASSET_BRIEF.md`, не меняя общий силуэт и web performance.

Каждый уникальный GLB загружается один раз и переиспользуется. Для большого числа одинаковых объектов использовать shared geometry/material или instancing.

## Филамент

Использовать существующие filaments сайта. Одну low-poly spool geometry загружать/создавать один раз. Цвет центрального материала катушки — из существующего `filament.color`. Placement только отвечает за физическое расположение на filament rack. Не уменьшать weight из-за размещения.

## Interaction

- hover printer → pointer + лёгкая визуальная реакция;
- click printer → selected id, сдержанный cyan/blue WebGL selection marker, smooth focus target;
- кнопка `Общий вид`;
- inspector справа;
- search printer: найти room, переключить, сфокусировать; если не размещён — предложить `Разместить`.

## Inspector

Показывать только реальные данные existing printer + room/furniture/slot + visual model. Не создавать fake print progress, temperatures или ETA, если backend их не содержит. Действия: `Переместить`, `Изменить модель`, `Убрать из комнаты`.

## Visual

Следовать `03_WORKSHOP_VISUAL_SPEC.md` и `references/target_reference.png`. Orthographic camera, isometric management view, low-poly, открытая со стороны камеры комната, светлое дерево + graphite, цветные катушки. Не добавлять сильный CSS neon. В WebGL допустим небольшой emissive marker.

Renderer: sRGB, ACES Filmic, pixel ratio clamp <= 1.5. Свет: Hemisphere + Directional + максимум один fill; emissive strips вместо десятков PointLight. Shadows только там, где дают реальную визуальную пользу.

## Database

Используй `04_DATABASE_PLAN.md` как план, но сначала проверь фактическую схему. Если existing `printers` — каталог моделей, а не физические единицы, не делай уникальность printer placement напрямую: введи `printer_units` или другой минимальный совместимый слой. Не ломай текущую бизнес-логику.

Нужны отдельная migration + обновление canonical schema + RLS. До применения migration `/workshop` не падает: localStorage fallback.

## Blender

Прочитай `blender/SKILL.md`. Это общая инструкция, не scene brief. Конкретное ТЗ — `blender/ASSET_BRIEF.md`.

Проверь `blender --version`. Если Blender доступен, положи generator в проект `scripts/blender/`, запусти headless и создай:
- `assets/blender/workshop-printer-a1.blend`;
- `assets/blender/workshop-printer-p1.blend`;
- `public/models/workshop/printer-a1.glb`;
- `public/models/workshop/printer-p1.glb`;
- `public/models/workshop/filament-spool.glb`.

Если Blender недоступен — frontend работу не блокировать; использовать переданные GLB placeholders и оставить generator готовым к запуску.

## Performance / lifecycle

- ResizeObserver;
- cancelAnimationFrame on unmount;
- remove listeners;
- dispose controls/renderer/local geometries/materials/textures;
- не dispose shared cached assets, пока они используются;
- не HTTP-load одинаковый GLB для каждого printer;
- target smooth desktop experience.

## Responsive

Desktop first. Desktop: canvas + right inspector. Tablet: inspector overlay. Mobile: canvas + bottom sheet.

## Acceptance

Готово только когда:
- `/workshop` работает;
- `Мастерская` есть в общей навигации;
- rooms CRUD;
- table/rack/filament rack CRUD;
- drag/rotate/snap/bounds;
- slots;
- existing printers размещаются/перемещаются/удаляются из layout;
- existing filaments размещаются на racks и имеют правильный цвет;
- 2 visual models работают;
- selection/focus/overview работают;
- minimap строится из layout data;
- search работает;
- persistence после reload;
- Supabase integration + migration + localStorage fallback;
- нет fake telemetry;
- нет console errors/leaks при навигации;
- tests/build проходят.

В финальном отчёте перечисли modified/new files, migration path, Blender outputs и размеры/triangles моделей, результаты test/build и реальные ограничения.
