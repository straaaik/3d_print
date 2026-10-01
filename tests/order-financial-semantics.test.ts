import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderFinancials, calculateOrdersSummaryKPI } from '../src/shared/lib/formulas';
import type { Order } from '../src/shared/types';

const order = (payment: number): Order => ({ id: 'income', type: 'income', title: 'Part',
  date: '01.10.2026', amount: 100, base_amount: 100, cost: 60, payment, payments: [],
  status: 'Не в работе', client: '', contact: '', deadline: '', notes: '' });

test('orders and KPI use received payments minus frozen cost, including overpayment', () => {
  for (const [payment, profit] of [[0, -60], [50, -10], [100, 40], [120, 60]]) {
    const head = order(payment);
    const financial = calculateOrderFinancials(head);
    assert.equal(financial.actualProfit, profit);
    assert.equal(financial.plannedProfit, 40);
    assert.equal(calculateOrderFinancials({ ...head, status: 'Готово' }).actualProfit, profit);
    const kpi = calculateOrdersSummaryKPI([head]);
    assert.equal(kpi.netProfitTotal, profit);
    assert.equal(kpi.totalIncome, 100);
    assert.equal(kpi.receivedPayments, payment);
  }
});

test('agreed price is the last override, zero and clearing preserve cost/payment', () => {
  const base = { ...order(50), urgency_type: 'fixed' as const, urgency_amount: 20,
    discount_type: 'fixed' as const, discount_amount: 10 };
  const zero = calculateOrderFinancials({ ...base, agreed_price: 0 });
  assert.equal(zero.computedFinalAmount, 110);
  assert.equal(zero.finalAmount, 0);
  assert.equal(zero.priceAdjustment, -110);
  assert.equal(zero.actualProfit, -10);
  assert.equal(zero.debt, 0);
  assert.equal(calculateOrderFinancials({ ...base, agreed_price: null }).finalAmount, 110);
  const high = calculateOrderFinancials({ ...base, agreed_price: 150 });
  assert.equal(high.plannedProfit, 90);
  assert.equal(high.actualProfit, -10);
});

test('standalone expense subtracts its amount while income cost is counted once', () => {
  const expense: Order = { ...order(0), id: 'expense', type: 'expense', amount: 20, cost: 20 };
  const kpi = calculateOrdersSummaryKPI([order(50), expense]);
  assert.equal(kpi.netProfitTotal, -30);
  assert.equal(kpi.totalExpenses, 80);
});
