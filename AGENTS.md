<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Правила для AI-агентов (3D Labs Guidelines)

## 🌿 1. Git и ветки
В репозитории две ветки: `main` (Production) и `test` (Staging).
- **Спрашивать ветку для заливки:** ТОЛЬКО если пользователь явно дал команду запушить/залить изменения и не указал целевую ветку. Во время обычной разработки не спрашивать.
- **Ветка `test`:** коммитить и пушить только в неё. `main` не затрагивать.
- **Ветка `main`:** при заливке в `main` после пуша обязательно влить/синхронизировать `main` в ветку `test`.

## ⚡ 2. Анимации и Motion (СТРОГО ОБЯЗАТЕЛЬНО)
- **Каждая анимация — через Motion:** Любое движение в интерфейсе (появление, переходы страниц, раскрытие аккордеонов, взлёт карточек, сортировка списков, фильтрация, модальные окна, ховеры) **обязательно реализовывать с помощью библиотеки `motion` (`motion/react`)**.
- **Изучение документации:** Перед реализацией или изменением анимаций агент обязан изучить официальную документацию Motion (использовать скилл `motion`, Upstash Context7 и встроенные гайды), выбирая самые современные, производительные API (`layout`, `layoutId`, `AnimatePresence`, пружинные переходы, порталы для морфинга).
- **Максимальная эстетика и качество:** Реализовывать самый лучший, плавный, кинематографичный и тактильно приятный способ. Исключать любые рывки, скачки верстки (layout thrashing) и конфликты `z-index`/stacking context.

## 🎨 3. Дизайн-система (Meridian Cockpit Console)
Перед созданием или правкой UI обязательно читать `DESIGN_SYSTEM.md`. Эталоны — `/calculator` и `/orders`.
- **Обязательные элементы страницы:**
  - Фон: `bg-dot-grid`, кокпит-контейнер `bg-neutral-950/90 border-white/15 rounded-2xl backdrop-blur-2xl`.
  - Терминальная шапка: 3 точки (🔴🟡🟢), штамп `3D-LABS // НАЗВАНИЕ`, статус режима/хранилища.
  - Кнопки: компонент `<CockpitButton>` со скобочной нотацией `[ действие ]`.
  - Карточки и плитки: `bg-white/[0.03] border border-white/10 rounded-xl`.
  - Числа, формулы, даты, артикулы, метки: `font-mono tabular-nums`.
  - Нижняя панель: техническая телеметрия `border-t border-white/10 bg-neutral-950 text-neutral-500 font-mono text-[11px]`.
  - Футер: `3D LABS · [SECTION] RUNTIME`.
- **Запрещено:** `PageHeader`, неоновые пятна (`blur-3xl`), радужные градиенты, знак параграфа (`§`), случайные яркие рамки, эмодзи вместо иконок `lucide-react`.

## ⚠️ 4. База данных Supabase
Если задача меняет БД (таблицы, колонки, индексы, RLS):
1. Сразу и явно предупредить пользователя в ответе.
2. Предоставить чистый готовый SQL-скрипт миграции для выполнения в **Supabase Dashboard -> SQL Editor**.
3. Обновить центральный файл `supabase_schema.sql` в корне проекта.
4. Обязательно реализовать fallback на `localStorage` / кэш, чтобы UI не падал без миграции.

## 📦 5. Зависимости (npm)
- **Запрещено** запускать `npm install / uninstall / update` без предварительного явного разрешения пользователя.
- Перед запуском назвать пакет, объяснить зачем он нужен, почему нельзя обойтись имеющимся кодом и как он повлияет на бандл.

## ♻️ 6. Переиспользование компонентов
1. Перед созданием любого UI сначала проверить `src/shared/ui/`.
2. Существующие контролы (`CockpitButton`, `CockpitDropdown`, `Tooltip`, `Checkbox` и др.) использовать напрямую.
3. Новые компоненты проектировать переиспользуемыми и типизированными через props, не привязывая намертво к одной странице.

## ✅ 7. Обязательная проверка перед Git push
- Непосредственно перед каждым `git push` запускать на финальном состоянии рабочей копии полный набор тестов: `npm test` и `npm run test:e2e`.
- Если хотя бы одна проверка завершилась ошибкой, push запрещён. Сначала исправить проблему и заново выполнить обе команды.
- После проверок сообщить пользователю количество пройденных и упавших тестов, а также путь к HTML-отчёту Playwright: `playwright-report/index.html`.
- Не обновлять визуальные эталоны командой `npm run test:e2e:update` без явного подтверждения пользователя: расхождение снимков может быть реальной регрессией дизайна.
