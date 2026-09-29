# Acceptance checklist

6. Контрольный список перед тем, как считать работу законченной
Склад филамента
Weighted average считается правильно.
Расход не меняет average.
Нехватка не блокирует, deficit виден.
Одинаковое событие не списывает дважды.
Готовый склад
Никаких отрицательных остатков.
Заказ может превышать stock.
Production +1 ≠ manual correction.
Новый stock после заказа может покрыть remaining без double-spend.
Финансы
Actual profit = payment-cost везде.
Новые orders не auto-paid.
Planned profit отделен.
Переплата поддерживается.
История
Старые orders не меняются от Product update.
Existing Product не auto-reprice от purchase.
OrderItem — snapshot.
Ledger/audit сохраняет источники.
Калькулятор
Несколько items сохраняются/reload.
Aggregate/compare live.
Item + global discount не дублируются.
Agreed price — последний override.
Технически
SQL migration готов.
supabase_schema.sql обновлен.
RLS/индексы есть.
Fallback работает до миграции.
Lint/typecheck/tests/build проверены.
Рекомендуемые ручные сценарии smoke-test
Купить 500 г по 20/кг, затем 1000 г по 24/кг → средняя 22,67/кг.
Создать заказ 5 шт. при stock=2 → stock=0, remaining production=3, заказ сохранен.
После этого сделать Production +1 в товарах → material списан один раз; затем запустить заказ → дополнительный material только на оставшиеся 2.
Перевести заказ сразу «Не в работе» → «Готово» → материал списан один раз. Затем сменить статус туда‑сюда → второго списания нет.
Нужно 300 г, доступно 120 г → stock filament=0, deficit=180 г, заказ не заблокирован.
Купить тот же filament дороже → existing Product retail price прежняя; новый Product считает по новой средней; явный recalc existing меняет только после действия пользователя. Затем произвести +1 existing Product → retail price прежняя, но finished-stock unit cost учитывает текущую себестоимость.
Order cost=60, payment 0/50/100/120 → profit -60/-10/40/60.
Создать 3 детали в Calculator, сохранить, перезагрузить, сравнить 2, создать один Order с 3 OrderItems.
Отредактировать Product inline → Cancel откатывает, Save сохраняет; открыть в Calculator → Update обновляет ID, Save as new создает новый.
Расчет 3500 → agreed 5000 дает adjustment +1500; agreed ниже cost показывает warning, но сохраняется.
Проверить profit_only / cost_with_markup / cost_no_markup на одной и той же сумме.
