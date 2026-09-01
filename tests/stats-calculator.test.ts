import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStatsReport,
  getFinancialLabels,
  getHeatLevel,
  normalizeSharePercentages,
  getPreviousDateRange,
} from '../src/widgets/Stats/helpers/statsCalculator';
import type { Order, SavedCalculation, Filament, Printer } from '../src/shared/types';

const incomeOrder: Order = {
  id: 'order-income',
  date: '2026-08-15',
  type: 'income',
  title: 'Корпус датчика',
  quantity: 2,
  amount: 1000,
  cost: 350,
  payment: 600,
  client: 'Тестовый клиент',
  contact: '',
  deadline: '2026-08-20',
  status: 'Готово',
  notes: '',
};

const expenseOrder: Order = {
  ...incomeOrder,
  id: 'order-expense',
  type: 'expense',
  title: 'Упаковка',
  amount: 100,
  cost: 0,
  payment: 0,
};

const goals = {
  defaultGoal: 0,
  targetType: 'profit' as const,
  monthlyGoals: {},
};

function build(mode: 'accrual' | 'cash') {
  return buildStatsReport({
    orders: [incomeOrder, expenseOrder],
    products: [] as SavedCalculation[],
    filaments: [] as Filament[],
    printers: [] as Printer[],
    goals,
    range: {
      startDate: new Date(2026, 7, 1),
      endDate: new Date(2026, 7, 31, 23, 59, 59, 999),
    },
    preset: 'month',
    mode,
    now: new Date(2026, 7, 31),
  });
}

test('режим по заказам считает полную сумму заказа', () => {
  const report = build('accrual');

  assert.equal(report.kpi.revenue, 1000);
  assert.equal(report.kpi.expenses, 450);
  assert.equal(report.kpi.result, 550);
  assert.equal(report.kpi.receivables, 400);
});

test('режим по оплатам считает фактически полученные деньги', () => {
  const report = build('cash');

  assert.equal(report.kpi.revenue, 600);
  assert.equal(report.kpi.expenses, 450);
  assert.equal(report.kpi.result, 150);
  assert.deepEqual(report.paymentGap, {
    ordered: 1000,
    paid: 600,
    receivable: 400,
  });
});

test('структура расходов точно сходится с итогом после округления долей', () => {
  const report = buildStatsReport({
    orders: [{
      ...incomeOrder,
      id: 'rounding-order',
      cost: 2,
      cost_items: [
        { id: 'a', category: 'Материал', amount: 1 },
        { id: 'b', category: 'Упаковка', amount: 1 },
        { id: 'c', category: 'Доставка', amount: 1 },
      ],
    }],
    products: [],
    filaments: [],
    printers: [],
    goals,
    range: {
      startDate: new Date(2026, 7, 1),
      endDate: new Date(2026, 7, 31, 23, 59, 59, 999),
    },
    preset: 'month',
    mode: 'accrual',
    now: new Date(2026, 7, 31),
  });

  assert.equal(report.costs.reduce((sum, item) => sum + item.value, 0), report.kpi.expenses);
});

test('отчёт собирает товары, затраты, материалы, принтеры, статусы и цель', () => {
  const product: SavedCalculation = {
    id: 'product-1',
    name: 'Корпус датчика',
    filament_name: 'PLA Graphite',
    filament_id: 'filament-1',
    printer_name: 'Voron 2.4',
    printer_id: 'printer-1',
    weight_g: 100,
    hours: 1,
    minutes: 0,
    quantity: 1,
    base_cost: 175,
    final_price: 500,
  };
  const filament: Filament = {
    id: 'filament-1',
    name: 'PLA Graphite',
    weight_g: 1000,
    price: 1200,
    color: '#64748b',
  };
  const printer: Printer = {
    id: 'printer-1',
    name: 'Voron 2.4',
    power_w: 180,
    price: 100000,
    lifespan_hours: 5000,
    color: '#8b5cf6',
  };
  const previousOrder: Order = {
    ...incomeOrder,
    id: 'order-previous',
    date: '2026-07-15',
    amount: 500,
    payment: 500,
    cost: 100,
  };
  const detailedIncome: Order = {
    ...incomeOrder,
    product_id: product.id,
    cost_items: [
      { id: 'material', category: 'Материал', amount: 200 },
      { id: 'packing', category: 'Упаковка', amount: 50 },
    ],
  };
  const report = buildStatsReport({
    orders: [detailedIncome, expenseOrder, previousOrder],
    products: [product],
    filaments: [filament],
    printers: [printer],
    goals: {
      defaultGoal: 1000,
      monthlyGoals: { '2026-08': 2000 },
    },
    range: {
      startDate: new Date(2026, 7, 1),
      endDate: new Date(2026, 7, 31, 23, 59, 59, 999),
    },
    preset: 'month',
    mode: 'accrual',
    now: new Date(2026, 7, 31),
  });

  assert.equal(report.goal.target, 2000);
  assert.equal(report.goal.progressPercent, 27.5);
  assert.equal(report.statuses.find((item) => item.label === 'Готово')?.value, 1);
  assert.equal(report.products.find((item) => item.id === product.id)?.profit, 650);
  assert.equal(report.filamentUsage.find((item) => item.id === filament.id)?.value, 200);
  assert.equal(report.printerWorkload.find((item) => item.id === printer.id)?.hours, 2);
  assert.equal(report.costs.reduce((sum, item) => sum + item.value, 0), report.kpi.expenses);
  assert.equal(report.activity.find((item) => item.key === '2026-08-15')?.orders, 1);
  assert.equal(report.previousKpi?.result, 400);
  assert.equal(report.deltas.result.value, 150);
});

test('сборка распределяет расход и часы по деталям', () => {
  const assembly: SavedCalculation = {
    id: 'assembly-1',
    name: 'Светильник',
    type: 'assembly',
    filament_name: '',
    printer_name: '',
    weight_g: 0,
    hours: 0,
    minutes: 0,
    quantity: 1,
    base_cost: 100,
    final_price: 500,
    assembly_parts: [
      {
        id: 'part-a',
        name: 'Основание',
        weight_g: 50,
        hours: 1,
        minutes: 0,
        quantity: 2,
        filament_id: 'filament-a',
        filament_name: 'PLA',
        printer_id: 'printer-a',
        printer_name: 'Voron',
        base_cost: 50,
        final_price: 100,
      },
      {
        id: 'part-b',
        name: 'Рассеиватель',
        weight_g: 30,
        hours: 0,
        minutes: 30,
        quantity: 1,
        filament_id: 'filament-b',
        filament_name: 'PETG',
        printer_id: 'printer-b',
        printer_name: 'Prusa',
        base_cost: 30,
        final_price: 60,
      },
    ],
  };
  const order: Order = {
    ...incomeOrder,
    id: 'assembly-order',
    product_id: assembly.id,
    quantity: 3,
  };
  const report = buildStatsReport({
    orders: [order],
    products: [assembly],
    filaments: [],
    printers: [],
    goals,
    range: { startDate: null, endDate: null },
    preset: 'all',
    mode: 'accrual',
  });

  assert.equal(report.filamentUsage.find((item) => item.label === 'PLA')?.value, 300);
  assert.equal(report.filamentUsage.find((item) => item.label === 'PETG')?.value, 90);
  assert.equal(report.printerWorkload.find((item) => item.label === 'Voron')?.hours, 6);
  assert.equal(report.printerWorkload.find((item) => item.label === 'Prusa')?.hours, 1.5);
});

test('предыдущий период имеет ту же длительность и заканчивается перед текущим', () => {
  const current = {
    startDate: new Date(2026, 7, 10, 0, 0, 0, 0),
    endDate: new Date(2026, 7, 16, 23, 59, 59, 999),
  };
  const previous = getPreviousDateRange(current);

  assert.ok(previous?.startDate);
  assert.ok(previous?.endDate);
  assert.equal(previous.endDate.getTime(), current.startDate.getTime() - 1);
  assert.equal(
    previous.endDate.getTime() - previous.startDate.getTime(),
    current.endDate.getTime() - current.startDate.getTime(),
  );
});

test('пустые данные возвращают конечные нули без ложных инсайтов', () => {
  const report = buildStatsReport({
    orders: [],
    products: [],
    filaments: [],
    printers: [],
    goals,
    range: { startDate: null, endDate: null },
    preset: 'all',
    mode: 'cash',
  });

  assert.equal(report.kpi.result, 0);
  assert.equal(report.kpi.margin, 0);
  assert.equal(report.insights.length, 0);
  assert.ok(Number.isFinite(report.kpi.averageCheck));
});

test('финансовые подписи меняются вместе с режимом', () => {
  assert.deepEqual(getFinancialLabels('accrual'), {
    revenue: 'Выручка',
    result: 'Чистая прибыль',
  });
  assert.deepEqual(getFinancialLabels('cash'), {
    revenue: 'Получено',
    result: 'Кассовый результат',
  });
});

test('интенсивность heatmap ограничена пятью уровнями', () => {
  assert.equal(getHeatLevel(0, 10), 0);
  assert.equal(getHeatLevel(1, 10), 1);
  assert.equal(getHeatLevel(5, 10), 2);
  assert.equal(getHeatLevel(10, 10), 4);
  assert.equal(getHeatLevel(100, 0), 0);
});

test('проценты сегментов дают ровно сто процентов', () => {
  const shares = normalizeSharePercentages([1, 1, 1]);
  assert.equal(shares.reduce((sum, value) => sum + value, 0), 100);
  assert.deepEqual(normalizeSharePercentages([0, 0]), [0, 0]);
});
