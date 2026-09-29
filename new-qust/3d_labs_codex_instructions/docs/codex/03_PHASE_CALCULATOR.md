# Этап 3 — новый многопозиционный калькулятор

Это третий этап после фундамента и складов.

Переведи Calculator на CalculationProject -> CalculationItem[]:
1. Несколько независимых расчетов с именами/ID/quantity и полным набором параметров.
2. «Добавить расчёт» + stack-анимация и удобная навигация по карточкам.
3. Item-level discount + project-level discount.
4. Project aggregate receipt/summary live.
5. Compare mode максимум 2 item, без итогового «лучше», только смысловая подсветка метрик.
6. Project save/load Supabase + local fallback.
7. Добавь «Согласованная цена» на project level как последний override с отдельной строкой adjustment и warning below cost.
8. Custom cost UI поддерживает profit_only / cost_with_markup / cost_no_markup.
9. CalculationReceipt/engine используются повторно, формулы не копируются.
10. Подготовь действие Create order, которое передает весь project как item snapshots в модель order_items (сам заказный UI будет доработан на следующем этапе).

Прогони сценарии reload, 10 items navigation, compare live, discounts, agreed price, custom cost modes.
