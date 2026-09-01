import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnalyticsModeToggle } from '../src/widgets/Stats/components/AnalyticsModeToggle';
import { StatsChartShell } from '../src/widgets/Stats/components/StatsChartShell';
import { StatsEmptyState } from '../src/widgets/Stats/components/StatsEmptyState';

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
