# Короткий промт для Codex

Работай в существующем репозитории `https://github.com/straaaik/3d_print`, только в ветке `test`.

Я передал тебе папку `codex_workshop_pack`. Сначала прочитай в ней:

1. `01_CODEX_MASTER_PROMPT.md`
2. `02_WORKSHOP_FUNCTIONAL_SPEC.md`
3. `03_WORKSHOP_VISUAL_SPEC.md`
4. `04_DATABASE_PLAN.md`
5. `blender/SKILL.md`
6. `blender/ASSET_BRIEF.md`

Затем изучи фактическое состояние репозитория, `AGENTS.md`, `DESIGN_SYSTEM.md`, текущую реализацию Мастерской и текущую Supabase-схему. Используй `references/target_reference.png` как целевой визуальный референс, а `references/current_workshop.png` как состояние «до».

Не создавай новый проект и не переписывай рабочие части без причины. Доработай существующий сайт: добавь полноценную страницу `/workshop` «Мастерская», комнаты, столы, стойки, стеллажи, слоты, размещение уже существующих принтеров и филамента, две low-poly визуальные модели принтеров A1-style/P1-style, сохранение в Supabase с localStorage fallback, выбор принтера, inspector и minimap.

Не показывай вымышленную телеметрию, если её нет в backend. Не устанавливай новые npm-зависимости без необходимости. Перед завершением запусти тесты и build.
