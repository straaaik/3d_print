<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Правила проекта 3D Labs

## Git
- `main` — production, `test` — staging. При работе с `test` коммитить и пушить только в неё; `main` не затрагивать.
- Уточнять целевую ветку только при явной просьбе о push без указания ветки.
- После явно запрошенного push в `main` синхронизировать `main` в `test`.

## Интерфейс и анимации
- Перед изменением UI читать `DESIGN_SYSTEM.md`; эталоны — `/calculator` и `/orders`.
- Сначала проверять `src/shared/ui/` и использовать существующие контролы. Новые компоненты делать переиспользуемыми, с типизированными props.
- Все анимации, включая hover, реализовывать через `motion` (`motion/react`). Перед изменениями изучать официальную документацию через навык `motion`, Context7 и встроенные гайды.
- Обеспечивать плавность без рывков, скачков вёрстки, layout thrashing и конфликтов `z-index`/stacking context.

## Supabase
При изменении таблиц, колонок, индексов или RLS:
- Сразу предупредить пользователя об изменении БД.
- Предоставить готовый SQL-скрипт для Supabase Dashboard → SQL Editor и обновить `supabase_schema.sql`.
- Обеспечить fallback на `localStorage` / кэш, чтобы UI работал без миграции.

## Зависимости
- `npm install`, `npm uninstall` и `npm update` — только с предварительного явного разрешения пользователя.
- Перед запросом разрешения назвать пакет, его назначение, почему имеющегося кода недостаточно и влияние на бандл.

## Проверки
- **В процессе разработки и мелких правок**: `npm run test:e2e` **НЕ запускать**. Для промежуточной проверки логики использовать только быстрый `npm test`.
- **Только перед финальным push** (или по прямому запросу пользователя на полный прогон): обязательно запустить `npm test` и `npm run test:e2e` на финальном состоянии рабочей копии.
- При любой ошибке push запрещён: исправить причину и повторить обе команды.
- Сообщить число пройденных и упавших тестов и путь к отчёту `playwright-report/index.html`.
- `npm run test:e2e:update` — только с явного подтверждения пользователя.
