# Этап 5 — заказы, чеки, оплаты и производственное списание

Это пятый этап. Схема order_items, склад и calculator/project уже готовы.

Полностью интегрируй Orders:
1. Один Order содержит много OrderItem snapshots. Manual order может добавлять/редактировать items тем же calculation engine.
2. В блоке «Финансы и оплаты» отдельный CalculationReceipt для каждой детали + общий financial summary.
3. Actual profit везде = payment - cost; planned profit показывай только как дополнительный показатель. Новый order payment=0, payments=[]; product selection не создает auto-payment.
4. Обнови Orders row/table/drawer/modal/filter/sort/summary и Stats/KPI на единую семантику фактической прибыли. При необходимости показывай отдельно ordered revenue и received payments.
5. Finished stock shortage не блокирует: reserve/use available stock, remainder to produce. Stock не отрицательный. Себестоимость использованных готовых единиц snapshot-ится из finished-stock weighted cost basis; retail price товара от этого не меняется.
6. Перед производством заказа используй новый доступный unreserved stock для покрытия remaining; filament списывай только на остаток.
7. Производственное списание запускается один раз при первом достижении «Печать» или любого более позднего статуса при skip. Повторные status transitions идемпотентны.
8. Filament shortage не блокирует: stock 0 + deficit + warning.
9. Уменьшение stock/откат статуса не возвращает уже физически использованный filament.
10. NumberInput применить ко всем релевантным финансовым/числовым полям модалки.
11. Все multi-table Supabase changes по order production делай атомарно.

Особенно протестируй: stock2/order5; +1 production_stock после order creation; затем запуск order => material не списывается дважды; direct «Не в работе» -> «Готово»; частичная оплата/переплата.
