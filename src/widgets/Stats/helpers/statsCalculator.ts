import { Order, SavedCalculation } from '../../../shared/types';
import { round2, round1, calcMarginPercent, calcMarkupPercent } from '../../../shared/lib/formulas';
import { timeToHours } from '../../../shared/lib/format';

export type PeriodPreset = 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'month' | 'all' | 'custom';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface StatsKPI {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  marginPercent: number;
  markupPercent: number;
  totalOrdersCount: number;
  incomeOrdersCount: number;
  expenseOrdersCount: number;
  completedOrdersCount: number;
  inProgressOrdersCount: number;
  unpaidSum: number;
  unpaidOrdersCount: number;
  averageCheck: number;
  totalFilamentWeightG: number;
  totalPrintHours: number;
}

export interface ChartBucket {
  key: string;
  label: string;
  shortLabel: string;
  revenue: number;
  expense: number;
  profit: number;
  ordersCount: number;
  filamentG: number;
  printHours: number;
}

export const MONTH_NAMES_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
];

export const MONTH_NAMES_FULL = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

/**
 * Надежный парсинг даты из строки заказа (DD.MM.YYYY, YYYY-MM-DD или ISO)
 */
export function parseOrderDate(order: Order): Date {
  const dateStr = order.date ? order.date.trim() : '';

  if (dateStr) {
    // Формат YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.slice(0, 10).split('-');
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      const date = new Date(y, m, d, 12, 0, 0);
      if (!isNaN(date.getTime())) return date;
    }

    // Формат DD.MM.YYYY или DD.MM.YY
    const parts = dateStr.split('.');
    if (parts.length >= 2) {
      const day = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const rawYear = parts[2] ? parts[2].trim() : '';
      const year = rawYear.length === 2 ? Number(`20${rawYear}`) : (rawYear ? Number(rawYear) : new Date().getFullYear());
      const date = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // Fallback на created_at
  if (order.created_at) {
    const d = new Date(order.created_at);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

/**
 * Получение ключа месяца заказа в формате YYYY-MM
 */
export function getOrderMonthKey(order: Order): string {
  const d = parseOrderDate(order);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Форматирование ключа месяца в человекочитаемый вид (например, "Май 2026")
 */
export function formatMonthKeyLabel(key: string): string {
  if (!key || key === 'all') return 'Все месяцы';
  const parts = key.split('-');
  if (parts.length >= 2) {
    const y = parts[0];
    const mIdx = Number(parts[1]) - 1;
    const mName = MONTH_NAMES_FULL[mIdx] || parts[1];
    return `${mName} ${y}`;
  }
  return key;
}

/**
 * Получение списка всех уникальных месяцев, в которых есть заказы
 */
export function getAvailableMonthKeys(orders: Order[]): string[] {
  const keysSet = new Set<string>();
  for (const order of orders) {
    keysSet.add(getOrderMonthKey(order));
  }

  // Если заказов нет, добавляем текущий месяц
  if (keysSet.size === 0) {
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    keysSet.add(curKey);
  }

  return Array.from(keysSet).sort().reverse();
}

/**
 * Получение диапазона дат для конкретного месяца (YYYY-MM)
 */
export function getDateRangeForMonthKey(monthKey: string): DateRange {
  const [yearStr, monthStr] = monthKey.split('-');
  const y = Number(yearStr);
  const m = Number(monthStr) - 1;

  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

  return { startDate: start, endDate: end };
}

/**
 * Получение диапазона дат для заданного пресета
 */
export function getDateRangeForPreset(
  preset: PeriodPreset, 
  customRange?: DateRange,
  selectedMonthKey?: string
): DateRange {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case 'today':
      return { startDate: todayStart, endDate: todayEnd };

    case '7d': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { startDate: start, endDate: todayEnd };
    }

    case '30d': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { startDate: start, endDate: todayEnd };
    }

    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case 'month': {
      if (selectedMonthKey && selectedMonthKey !== 'all') {
        return getDateRangeForMonthKey(selectedMonthKey);
      }
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    case 'custom':
      return {
        startDate: customRange?.startDate ? new Date(new Date(customRange.startDate).setHours(0, 0, 0, 0)) : null,
        endDate: customRange?.endDate ? new Date(new Date(customRange.endDate).setHours(23, 59, 59, 999)) : null,
      };

    case 'all':
    default:
      return { startDate: null, endDate: null };
  }
}

/**
 * Фильтрация заказов по диапазону дат
 */
export function filterOrdersByDateRange(orders: Order[], range: DateRange): Order[] {
  if (!range.startDate && !range.endDate) return orders;

  const startMs = range.startDate ? range.startDate.getTime() : 0;
  const endMs = range.endDate ? range.endDate.getTime() : Infinity;

  return orders.filter(order => {
    const orderDate = parseOrderDate(order);
    const time = orderDate.getTime();
    return time >= startMs && time <= endMs;
  });
}

/**
 * Расчет веса пластика и часов печати для одного заказа
 */
export function getOrderProductionMetrics(order: Order, productsMap: Map<string, SavedCalculation>) {
  const qty = Math.max(1, order.quantity || 1);
  let weightG = 0;
  let printHours = 0;

  if (order.product_id && productsMap.has(order.product_id)) {
    const product = productsMap.get(order.product_id)!;
    if (product.type === 'assembly' && product.assembly_parts && product.assembly_parts.length > 0) {
      for (const part of product.assembly_parts) {
        const partQty = Math.max(1, part.quantity || 1);
        weightG += (part.weight_g || 0) * partQty * qty;
        printHours += timeToHours(part.hours || 0, part.minutes || 0) * partQty * qty;
      }
    } else {
      weightG += (product.weight_g || 0) * qty;
      printHours += timeToHours(product.hours || 0, product.minutes || 0) * qty;
    }
  }

  return { weightG: round2(weightG), printHours: round2(printHours) };
}

/**
 * Расчет сводных KPI-метрик за период
 */
export function calculateStatsKPI(
  orders: Order[],
  products: SavedCalculation[] = []
): StatsKPI {
  const productsMap = new Map<string, SavedCalculation>(products.map(p => [p.id, p]));

  let totalRevenue = 0;
  let totalExpenses = 0;
  let incomeOrdersCount = 0;
  let expenseOrdersCount = 0;
  let completedOrdersCount = 0;
  let inProgressOrdersCount = 0;
  let unpaidSum = 0;
  let unpaidOrdersCount = 0;
  let totalFilamentWeightG = 0;
  let totalPrintHours = 0;

  for (const order of orders) {
    const isIncome = order.type !== 'expense';
    const amount = Number(order.amount) || 0;
    const cost = Number(order.cost) || 0;
    const payment = Number(order.payment) || 0;

    if (isIncome) {
      incomeOrdersCount += 1;
      totalRevenue += amount;
      totalExpenses += cost;

      // Дебиторка (недоплата)
      const unpaid = Math.max(0, amount - payment);
      if (unpaid > 0) {
        unpaidSum += unpaid;
        unpaidOrdersCount += 1;
      }

      if (order.status === 'Готово') {
        completedOrdersCount += 1;
      } else {
        inProgressOrdersCount += 1;
      }

      // Производственные метрики
      const { weightG, printHours } = getOrderProductionMetrics(order, productsMap);
      totalFilamentWeightG += weightG;
      totalPrintHours += printHours;
    } else {
      // Прямой расход
      expenseOrdersCount += 1;
      totalExpenses += amount;
    }
  }

  totalRevenue = round2(totalRevenue);
  totalExpenses = round2(totalExpenses);
  const netProfit = round2(totalRevenue - totalExpenses);
  const marginPercent = calcMarginPercent(netProfit, totalRevenue);
  const markupPercent = calcMarkupPercent(netProfit, totalExpenses);
  const averageCheck = incomeOrdersCount > 0 ? round2(totalRevenue / incomeOrdersCount) : 0;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    marginPercent,
    markupPercent,
    totalOrdersCount: orders.length,
    incomeOrdersCount,
    expenseOrdersCount,
    completedOrdersCount,
    inProgressOrdersCount,
    unpaidSum: round2(unpaidSum),
    unpaidOrdersCount,
    averageCheck,
    totalFilamentWeightG: round2(totalFilamentWeightG),
    totalPrintHours: round2(totalPrintHours),
  };
}

/**
 * Группировка заказов по временным интервалам для графика динамики
 */
export function generateDynamicsChartData(
  orders: Order[],
  range: DateRange,
  preset: PeriodPreset,
  products: SavedCalculation[] = []
): ChartBucket[] {
  const productsMap = new Map<string, SavedCalculation>(products.map(p => [p.id, p]));

  // Определяем режим группировки: 'day' или 'month'
  let isDaily = true;
  if (preset === 'all') {
    isDaily = false;
  } else if (preset === 'month' || preset === 'this_month' || preset === 'last_month') {
    isDaily = true;
  } else if (range.startDate && range.endDate) {
    const diffDays = Math.round((range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 62) {
      isDaily = false;
    }
  }

  // Если пресет 'all' или нет диапазона, определяем границы по заказам
  let startDate = range.startDate;
  let endDate = range.endDate || new Date();

  if (!startDate) {
    if (orders.length > 0) {
      const timestamps = orders.map(o => parseOrderDate(o).getTime());
      startDate = new Date(Math.min(...timestamps));
    } else {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 5);
    }
  }

  const bucketsMap = new Map<string, ChartBucket>();

  if (isDaily) {
    // Генерируем все дни диапазона последовательно
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    while (cur <= endLimit) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      const shortLabel = `${d}.${m}`;
      const label = `${d} ${MONTH_NAMES_SHORT[cur.getMonth()]} ${y}`;

      bucketsMap.set(key, {
        key,
        label,
        shortLabel,
        revenue: 0,
        expense: 0,
        profit: 0,
        ordersCount: 0,
        filamentG: 0,
        printHours: 0,
      });

      cur.setDate(cur.getDate() + 1);
    }

    // Заполняем данными
    for (const order of orders) {
      const d = parseOrderDate(order);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;

      let bucket = bucketsMap.get(key);
      if (!bucket) {
        // Если выходит за границы, создаем
        const shortLabel = `${day}.${m}`;
        const label = `${day} ${MONTH_NAMES_SHORT[d.getMonth()]} ${y}`;
        bucket = {
          key,
          label,
          shortLabel,
          revenue: 0,
          expense: 0,
          profit: 0,
          ordersCount: 0,
          filamentG: 0,
          printHours: 0,
        };
        bucketsMap.set(key, bucket);
      }

      const isIncome = order.type !== 'expense';
      const amount = Number(order.amount) || 0;
      const cost = Number(order.cost) || 0;

      bucket.ordersCount += 1;
      if (isIncome) {
        bucket.revenue += amount;
        bucket.expense += cost;
        const { weightG, printHours } = getOrderProductionMetrics(order, productsMap);
        bucket.filamentG += weightG;
        bucket.printHours += printHours;
      } else {
        bucket.expense += amount;
      }
      bucket.profit = round2(bucket.revenue - bucket.expense);
    }
  } else {
    // Группировка по месяцам
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (cur <= endLimit) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;
      const shortLabel = `${MONTH_NAMES_SHORT[cur.getMonth()]} ${String(y).slice(2)}`;
      const label = `${MONTH_NAMES_FULL[cur.getMonth()]} ${y}`;

      bucketsMap.set(key, {
        key,
        label,
        shortLabel,
        revenue: 0,
        expense: 0,
        profit: 0,
        ordersCount: 0,
        filamentG: 0,
        printHours: 0,
      });

      cur.setMonth(cur.getMonth() + 1);
    }

    // Заполняем данными
    for (const order of orders) {
      const d = parseOrderDate(order);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;

      let bucket = bucketsMap.get(key);
      if (!bucket) {
        const shortLabel = `${MONTH_NAMES_SHORT[d.getMonth()]} ${String(y).slice(2)}`;
        const label = `${MONTH_NAMES_FULL[d.getMonth()]} ${y}`;
        bucket = {
          key,
          label,
          shortLabel,
          revenue: 0,
          expense: 0,
          profit: 0,
          ordersCount: 0,
          filamentG: 0,
          printHours: 0,
        };
        bucketsMap.set(key, bucket);
      }

      const isIncome = order.type !== 'expense';
      const amount = Number(order.amount) || 0;
      const cost = Number(order.cost) || 0;

      bucket.ordersCount += 1;
      if (isIncome) {
        bucket.revenue += amount;
        bucket.expense += cost;
        const { weightG, printHours } = getOrderProductionMetrics(order, productsMap);
        bucket.filamentG += weightG;
        bucket.printHours += printHours;
      } else {
        bucket.expense += amount;
      }
      bucket.profit = round2(bucket.revenue - bucket.expense);
    }
  }

  // Округляем все значения и сортируем по ключу времени
  return Array.from(bucketsMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(b => ({
      ...b,
      revenue: round2(b.revenue),
      expense: round2(b.expense),
      profit: round2(b.profit),
      filamentG: round2(b.filamentG),
      printHours: round2(b.printHours),
    }));
}
