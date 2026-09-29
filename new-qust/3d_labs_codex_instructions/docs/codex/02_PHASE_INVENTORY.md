# Этап 2 — склад филамента и готовой продукции

Это второй этап. Предполагается, что фундамент/типы/миграции этапа 1 уже внедрены. Не меняй заново базовую модель без необходимости.

Реализуй склад:
1. UI производителей, типов, линий/карточек и color variants филамента.
2. Закупки variant: вес + общая цена; weighted average; purchase history; stock grams.
3. Material difficulty теперь берется из material type.
4. Filament ledger и deficit handling. Недостаток не блокирует, stock floor 0, deficit N г + toast/warning.
5. Готовый stock: раздели «Произвести +1» (списывает material по recipe товара и фиксирует current production unit cost) и «Ручная корректировка» (не списывает material, аудируется). Поддерживай weighted-average finished-stock unit cost отдельно от retail/final price Product.
6. Finished stock movements/ledger; при выдаче готового stock в OrderItem сохраняй snapshot его cost basis. Не возвращай filament при простом уменьшении stock.
7. Критические операции сделай идемпотентными и атомарными в Supabase; local fallback обновляй цельным состоянием.
8. Изменение weighted average не должно автоматически пересчитывать существующие товары; подготовь возможность показать предложение пересчета.

Проверь закупки по разным ценам, несколько цветов одной линии, производство +1, manual adjustment, недостаток material.
