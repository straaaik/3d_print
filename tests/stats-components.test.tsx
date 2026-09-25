import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnalyticsModeToggle } from '../src/widgets/Stats/components/AnalyticsModeToggle';
import { StatsChartShell } from '../src/widgets/Stats/components/StatsChartShell';
import { StatsEmptyState } from '../src/widgets/Stats/components/StatsEmptyState';
import { PeriodFilterBar } from '../src/widgets/Stats/components/PeriodFilterBar';
import { StatsKpiCards } from '../src/widgets/Stats/components/StatsKpiCards';

test('переключатель финансового режима использует сегментированный стиль фильтров заказов', () => {
  const markup = renderToStaticMarkup(
    <AnalyticsModeToggle value="cash" onChange={() => undefined} />,
  );

  assert.match(markup, /По заказам/);
  assert.match(markup, /По оплатам/);
  assert.match(markup, /h-10/);
  assert.match(markup, /bg-neutral-800/);
  assert.equal((markup.match(/role="radio"/g) ?? []).length, 2);
  assert.equal((markup.match(/aria-checked="true"/g) ?? []).length, 1);
  assert.equal((markup.match(/<svg/g) ?? []).length, 2);
  assert.doesNotMatch(markup, />\[ <\/span>/);
});

test('панель фильтрации периода успешно рендерится с правым слотом и пресетами', () => {
  const markup = renderToStaticMarkup(
    <PeriodFilterBar
      selectedPreset="month"
      onSelectPreset={() => undefined}
      selectedMonthKey="2026-09"
      onSelectMonthKey={() => undefined}
      availableMonthKeys={['2026-09']}
      customRange={{ startDate: null, endDate: null }}
      onChangeCustomRange={() => undefined}
      rightSlot={<div id="test-right-slot">Режим</div>}
    />,
  );

  assert.match(markup, /Вся история/);
  assert.match(markup, /Сегодня/);
  assert.match(markup, /test-right-slot/);
});

test('карточки KPI рендерят интерактивную обратную сторону с формулой и контекстом', () => {
  const markup = renderToStaticMarkup(
    <StatsKpiCards
      kpi={{
        revenue: 120000,
        expenses: 45000,
        result: 75000,
        margin: 62.5,
        averageCheck: 12000,
        receivables: 15000,
        incomeOrders: 10,
        expenseOrders: 3,
        completedOrders: 8,
        unpaidOrders: 2,
        inProgressOrders: 2,
        filamentG: 1500,
        printHours: 24,
      }}
      deltas={{
        revenue: { value: 10000, percent: 9.1 },
        expenses: { value: 2000, percent: 4.6 },
        result: { value: 8000, percent: 11.9 },
        margin: { value: 1.5, percent: 2.4 },
        averageCheck: { value: 500, percent: 4.3 },
      }}
      mode="accrual"
      goal={{ target: 100000, actual: 75000, progressPercent: 75 }}
    />,
  );

  assert.match(markup, /cursor-pointer/);
  assert.match(markup, /Формула:/);
  assert.match(markup, /Динамика:/);
  assert.match(markup, /Контекст:/);
  assert.match(markup, /Выручка/);
  assert.match(markup, /Средний чек/);
});

test('оболочка графика публикует заголовок и текстовое резюме', () => {
  const markup = renderToStaticMarkup(
    <StatsChartShell
      title="Финансовая динамика"
      description="Выручка, расходы и результат"
      summary="Выручка за период составила 1000 ₽"
    />,
  );

  assert.match(markup, /aria-label="Финансовая динамика"/);
  assert.match(markup, /Выручка за период составила 1000 ₽/);
});

test('пустое состояние объясняет следующий полезный шаг', () => {
  const markup = renderToStaticMarkup(
    <StatsEmptyState
      title="Нет заказов"
      description="Создайте первый заказ, чтобы увидеть динамику"
      actionLabel="Перейти к заказам"
      onAction={() => undefined}
    />,
  );

  assert.match(markup, /Нет заказов/);
  assert.match(markup, /Создайте первый заказ/);
  assert.match(markup, /Перейти к заказам/);
});
