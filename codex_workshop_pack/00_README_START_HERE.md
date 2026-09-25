# Codex Workshop Pack

Это пакет для передачи Codex при доработке страницы **«Мастерская»** в существующем репозитории `straaaik/3d_print`, ветка `test`.

## С чего начать

1. Положи папку `codex_workshop_pack` в корень репозитория (или передай Codex ZIP целиком).
2. Отправь Codex содержимое `99_SHORT_PROMPT_FOR_CODEX.md`.
3. Codex должен сначала прочитать `01_CODEX_MASTER_PROMPT.md`, затем остальные спецификации и референсы.
4. `references/target_reference.png` — целевой визуальный референс.
5. `references/current_workshop.png` — текущий прототип, который нужно улучшать, а не переписывать вслепую.

## Что внутри

- `01_CODEX_MASTER_PROMPT.md` — основное задание Codex.
- `02_WORKSHOP_FUNCTIONAL_SPEC.md` — продуктовая логика комнат, мебели, слотов, принтеров и филамента.
- `03_WORKSHOP_VISUAL_SPEC.md` — точная визуальная спецификация сцены.
- `04_DATABASE_PLAN.md` — схема данных для Supabase без дублирования существующих `printers` и `filaments`.
- `blender/SKILL.md` — отдельная универсальная инструкция по Blender → GLB для web. В ней нет описания конкретной сцены.
- `blender/ASSET_BRIEF.md` — отдельное ТЗ на две low-poly модели принтеров и катушку.
- `blender/scripts/generate_workshop_assets.py` — Blender Python генератор ассетов.
- `models/*.glb` — очень лёгкие стартовые low-poly модели, которые можно сразу использовать как placeholders или улучшать.
- `textures/*` — необязательные лёгкие тайловые текстуры пола и дерева. Low-poly стиль может работать вообще без них.
- `web/workshop_default_layout.json` — стартовая раскладка комнаты для localStorage fallback/demo.
- `web/material_palette.json` — единая палитра сцены.

## Важное решение

Комната, стены, столы, стойки и стеллажи **не должны быть одним GLB**. Они создаются динамически в Three.js, потому что пользователь должен менять размер комнаты и расстановку мебели. Blender используется для повторно используемых ассетов: модели принтеров и при необходимости декоративные low-poly объекты.
