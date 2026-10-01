import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrintCost, calculateProjectTotals, calculateFinancialOutcome } from '../src/shared/lib/formulas';

const base = {
  weightG: 0, hours: 0, minutes: 0, laborMinutes: 0, quantity: 4,
  markupPercent: 100, defectPercent: 0, filament: null, printer: null,
  settings: null,
};

test('finite signed legacy adjustments retain their historical totals', () => {
  const result = calculatePrintCost({ ...base, weightG: 100,
    filament: { id: 'f', name: 'PLA', weight_g: 1000, price: 1000 },
    customCostItems: [{ id: 'credit', name: 'Legacy credit', amount: -10, isEnabled: true, target: 'cost' }],
  });
  assert.equal(result.totalBaseCost, 90);
  assert.equal(result.totalFinalPrice, 180);
});

test('three custom cost modes have different cost and retail treatment', () => {
  const result = calculatePrintCost({ ...base, customCostItems: [
    { id: 'profit', name: 'Service', amount: 10, isEnabled: true, isPerUnit: true, mode: 'profit_only' },
    { id: 'marked', name: 'Packaging', amount: 20, isEnabled: true,
      target: 'profit', mode: 'cost_with_markup' },
    { id: 'plain', name: 'Delivery', amount: 30, isEnabled: true, mode: 'cost_no_markup' },
  ] });
  assert.equal(result.totalBaseCost, 50);
  assert.equal(result.totalFinalPrice, 110);
  assert.deepEqual(result.customCostsBreakdown.map(item => (item as typeof item & { mode: string }).mode),
    ['profit_only', 'cost_with_markup', 'cost_no_markup']);
});

test('legacy target keeps previous totals, with per-unit extras but batch printing', () => {
  const result = calculatePrintCost({ ...base, weightG: 100,
    filament: { id: 'f', name: 'PLA', weight_g: 1000, price: 1000 },
    customCostItems: [
      { id: 'cost', name: 'Cost', amount: 5, isEnabled: true, isPerUnit: true, target: 'cost' },
      { id: 'profit', name: 'Profit', amount: 7, isEnabled: true, target: 'profit' },
    ],
  });
  assert.equal(result.materialCost, 100);
  assert.equal(result.totalBaseCost, 120); // 100 print + 20 extra; defect was explicitly zero
  assert.equal(result.totalFinalPrice, 247); // 120 * 2 + 7
});

test('agreed zero overrides urgency, discount and minimum without blocking loss', () => {
  const result = calculatePrintCost({ ...base, customCostItems: [
    { id: 'x', name: 'Cost', amount: 100, isEnabled: true },
  ], urgencyPercent: 10, discountAmount: 5,
    settings: { currency: '₽', electricity_rate: 0, default_printer_id: null,
      labor_rate_per_hour: 0, labor_time_minutes: 0, default_markup_percent: 100,
      default_defect_percent: 0, min_order_price: 250 },
    ...{ agreedPrice: 0 },
  });
  const extended = result as typeof result & { computedFinalPrice: number; priceAdjustment: number;
    agreedPrice: number | null; plannedProfit: number; isBelowCost: boolean };
  assert.equal(extended.computedFinalPrice, 250);
  assert.equal(extended.priceAdjustment, -250);
  assert.equal(extended.agreedPrice, 0);
  assert.equal(result.totalFinalPrice, 0);
  assert.equal(extended.plannedProfit, -100);
  assert.equal(result.profitTotal, -100);
  assert.equal(extended.isBelowCost, true);
});

test('non-finite agreed override is ignored', () => {
  const result = calculatePrintCost({ ...base, customCostItems: [
    { id: 'x', name: 'Cost', amount: 100, isEnabled: true },
  ], ...{ agreedPrice: Number.POSITIVE_INFINITY } });
  assert.equal(result.totalFinalPrice, 200);
});

test('project sums already-calculated batch lines and applies global adjustments once', () => {
  const first = calculatePrintCost({ ...base, customCostItems: [
    { id: 'a', name: 'Part A', amount: 100, isEnabled: true },
  ], discountPercent: 10 }); // 100 cost, 180 line price
  const second = calculatePrintCost({ ...base, quantity: 2, customCostItems: [
    { id: 'b', name: 'Part B', amount: 50, isEnabled: true },
  ] }); // 50 cost, 100 line price
  const project = calculateProjectTotals({
    lines: [{ quantity: 4, result: first }, { quantity: 2, result: second }],
    urgencyPercent: 10, discountAmount: 8, agreedPrice: 100, payment: 40,
  });
  assert.equal(project.quantity, 6);
  assert.equal(project.totalBaseCost, 150);
  assert.equal(project.baseRetailPrice, 280);
  assert.equal(project.urgencyCost, 28);
  assert.equal(project.discountTotal, 8);
  assert.equal(project.computedFinalPrice, 300);
  assert.equal(project.totalFinalPrice, 100);
  assert.equal(project.priceAdjustment, -200);
  assert.equal(project.plannedProfit, -50);
  assert.equal(project.actualProfit, -110);
  assert.equal(project.debt, 60);
  assert.equal(project.isBelowCost, true);
});

test('financial outcome distinguishes planned and paid profit', () => {
  assert.deepEqual(calculateFinancialOutcome(200, 120, 50), {
    plannedProfit: 80, actualProfit: -70, debt: 150,
  });
});
