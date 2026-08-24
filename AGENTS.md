<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Правила для AI-агентов (AI Agent Guidelines)

## 🌿 Правила работы с Git и ветками:
В репозитории используются две ветки:
- `main` — основная рабочая ветка (Production)
- `test` — тестовая ветка (Testing / Staging)

**Строгие правила заливки изменений:**
1. **Всегда спрашивать пользователя**, в какую ветку залить изменения (`main` или `test`), если пользователь явно не указал целевую ветку в запросе.
2. **Если заливка в ветку `test`**:
   - Изменения применяются, коммитятся и пушатся **ТОЛЬКО** в ветку `test`.
   - Ветка `main` не затрагивается.
3. **Если заливка в ветку `main`**:
   - Изменения применяются, коммитятся и пушатся в ветку `main`.
   - Затем ветка `main` **обязательно синхронизируется/вливается в ветку `test`** (через merge или push), чтобы тестовая ветка всегда содержала все последние изменения из `main`.

## ⚠️ Обязательное уведомление об изменениях в Supabase:
Если любая задача, новая фича или доработка требует изменений в базе данных **Supabase** (создание новых таблиц, добавление/изменение колонок, индексов, триггеров или политик RLS):
1. **Всегда сразу и явно предупреждать пользователя в ответе** о том, что требуется выполнить SQL-скрипт в Supabase.
2. **Предоставлять готовый, чистый SQL-скрипт миграции** прямо в сообщении, который пользователь сможет скопировать и выполнить в **Supabase Dashboard -> SQL Editor**.
3. **Обязательно обновлять центральный файл схемы `supabase_schema.sql`** в корне репозитория, поддерживая его в актуальном состоянии.
4. **Всегда реализовывать безопасный fallback** (на `localStorage` / кэш), чтобы приложение не падало с ошибками у пользователя даже до применения миграции в Supabase.
