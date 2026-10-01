# Этап 4 — редактирование каталога и product ID в калькуляторе

Основа: завершённые этапы 1–3, DECISIONS_AND_CONSTRAINTS и 04_PHASE_PRODUCTS / TASK_05. Цены и физический склад — отдельные данные.

1. Расширить существующую атомарную owner очередь командами каталога. Metadata Save сохраняет physical balance; creation может задавать явный opening balance без производства. Catalog revision защищает от устаревшего редактора. Archive/Undo каталога сохраняют ledger, snapshots и текущий physical stock.
2. Добавить общий ProductCalculationEditor и чистые product/form/snapshot преобразования. Полный набор параметров, live preview, reusable CalculationReceipt, Save/Cancel, dirty и предупреждение ухода. Исходная retail price остаётся до явного Save; recalc — явное действие. Single и assembly не теряют существующий состав/метаданные.
3. Передача товара в калькулятор создаёт отдельную карточку с product ID и всеми параметрами. Показывать edit mode и отдельные Update ID / Save as new операции. Не заменять чужие карточки проекта. Защитить уход с dirty draft.
4. Подготовить additive SQL (catalog revision/archive/calculation snapshot и атомарный catalog RPC), обновить schema/MIGRATIONS, сохранить local fallback. Проверить stock race, CAS/retry, no material consumption/retail autowrite, immutable historical orders, single/assembly conversion и Save/Cancel.
5. Завершить unit/typecheck/lint/build, SQL и browser smoke. E2E только перед final push всей ветки.

Решение: Undo восстанавливает metadata каталога, не отменяет реальное производство и не возвращает материал. Мягкое архивирование сохраняет parent IDs для исторического учёта. Конфликт редактора не перезаписывает товар автоматически.
