import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { calculatePrintCost, calculateProjectTotals, calculateProjectResources } from '../src/shared/lib/formulas';
import { CalculationReceipt } from '../src/shared/ui/CalculationReceipt';

const line = calculatePrintCost({ weightG: 0, hours: 0, minutes: 0, laborMinutes: 0,
  quantity: 2, markupPercent: 100, defectPercent: 0, filament: null, printer: null, settings: null,
  customCostItems: [{ id: 'x', name: 'Упаковка', amount: 30, isEnabled: true,
    mode: 'cost_no_markup' }], agreedPrice: 10 });

test('print receipt displays explicit planned profit, cost mode and loss warning', () => {
  const html = renderToStaticMarkup(<CalculationReceipt kind="print" result={line} title="Деталь" />);
  assert.match(html, /Плановая прибыль/);
  assert.match(html, /Без наценки/);
  assert.match(html, /Упаковка/);
  assert.match(html, /ниже себестоимости/);
  assert.match(html, /Согласованная цена/);
});

test('project receipt lists line batches and one global adjustment', () => {
  const project = calculateProjectTotals({ lines: [{ quantity: 2, result: line }],
    urgencyAmount: 5, agreedPrice: 0 });
  const html = renderToStaticMarkup(<CalculationReceipt kind="project" result={project}
    lines={[{ name: 'Деталь', quantity: 2, result: line }]} />);
  assert.match(html, /Деталь/);
  assert.match(html, /2 шт/);
  assert.match(html, /Срочность/);
  assert.match(html, /Согласованная цена/);
});

test('project resource receipt adds batch grams/time once, groups material and shows units/margin', () => {
  const inputs = { weightG: 100, hours: 2, minutes: 30, laborMinutes: 0, quantity: 5,
    filament: { id: 'pla', name: 'PLA Blue', weight_g: 1000, price: 1000 }, printer: null, settings: null };
  const result = calculatePrintCost(inputs);
  const lines = [{ name: 'Part A', quantity: 5, result, inputs }, { name: 'Part B', quantity: 2, result,
    inputs: { ...inputs, quantity: 2, weightG: 50, hours: 1, minutes: 0 } }];
  assert.deepEqual(calculateProjectResources(lines), { positionCount: 2, weightG: 150, printHours: 3.5,
    materials: [{ id: 'pla', name: 'PLA Blue', grams: 150 }] });
  const html = renderToStaticMarkup(<CalculationReceipt kind="project" result={calculateProjectTotals({ lines })} lines={lines} />);
  assert.match(html, /Изделий: 7 шт/);
  assert.match(html, /Общий вес: 150 г/);
  assert.match(html, /PLA Blue: 150 г/);
  assert.match(html, /Время печати: 3,5 ч/);
  assert.match(html, /Маржа проекта/);
});
