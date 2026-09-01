import { Order, SavedCalculation } from '../../../shared/types';
import { round2, round1, calcMarginPercent, calcMarkupPercent } from '../../../shared/lib/formulas';
import { timeToHours } from '../../../shared/lib/format';
import type { FinancialLabels, FinancialMode, StatsReport, StatsReportInput, StatsReportKpi } from '../types';

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

export function getFinancialLabels(mode: FinancialMode): FinancialLabels {
  return mode === 'cash'
    ? { revenue: 'Получено', result: 'Кассовый результат' }
    : { revenue: 'Выручка', result: 'Чистая прибыль' };
}

export function getHeatLevel(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4))) as 1 | 2 | 3 | 4;
}

export function normalizeSharePercentages(values: number[]): number[] {
  const safe = values.map((value) => Math.max(0, Number(value) || 0));
  const total = safe.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return safe.map(() => 0);

  const raw = safe.map((value) => (value / total) * 100);
  const result = raw.map(Math.floor);
  let remainder = 100 - result.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let index = 0; remainder > 0; index += 1, remainder -= 1) {
    result[order[index % order.length].index] += 1;
  }
  return result;
}

function getReportOrderFinancials(order: Order, mode: FinancialMode) {
  if (order.type === 'expense') {
    return {
      ordered: 0,
      paid: 0,
      revenue: 0,
      expense: Math.max(0, Number(order.amount) || 0),
    };
  }

  const ordered = Math.max(0, Number(order.amount) || 0);
  const paid = Math.max(0, Number(order.payment) || 0);

  return {
    ordered,
    paid,
    revenue: mode === 'cash' ? paid : ordered,
    expense: Math.max(0, Number(order.cost) || 0),
  };
}

function emptyDeltas(): StatsReport['deltas'] {
  return {
    revenue: { value: 0, percent: null },
    expenses: { value: 0, percent: null },
    result: { value: 0, percent: null },
    margin: { value: 0, percent: null },
    averageCheck: { value: 0, percent: null },
  };
}

export function getPreviousDateRange(range: DateRange): DateRange | null {
  if (!range.startDate || !range.endDate) return null;
  const duration = range.endDate.getTime() - range.startDate.getTime();
  if (duration < 0) return null;
  const endDate = new Date(range.startDate.getTime() - 1);
  return {
    startDate: new Date(endDate.getTime() - duration),
    endDate,
  };
}

function calculateReportKpi(
  orders: Order[],
  productsMap: Map<string, SavedCalculation>,
  mode: FinancialMode,
) {
  let ordered = 0;
  let paid = 0;
  let revenue = 0;
  let expenses = 0;
  let receivables = 0;
  let unpaidOrders = 0;
  let incomeOrders = 0;
  let expenseOrders = 0;
  let completedOrders = 0;
  let inProgressOrders = 0;
  let filamentG = 0;
  let printHours = 0;

  for (const order of orders) {
    const financials = getReportOrderFinancials(order, mode);
    ordered += financials.ordered;
    paid += financials.paid;
    revenue += financials.revenue;
    expenses += financials.expense;

    if (order.type === 'expense') {
      expenseOrders += 1;
      continue;
    }

    incomeOrders += 1;
    const unpaid = Math.max(0, financials.ordered - financials.paid);
    receivables += unpaid;
    if (unpaid > 0) unpaidOrders += 1;
    if (order.status === 'Готово') completedOrders += 1;
    else inProgressOrders += 1;

    const production = getOrderProductionMetrics(order, productsMap);
    filamentG += production.weightG;
    printHours += production.printHours;
  }

  const result = revenue - expenses;
  const kpi: StatsReportKpi = {
    revenue: round2(revenue),
    expenses: round2(expenses),
    result: round2(result),
    margin: calcMarginPercent(result, revenue),
    averageCheck: incomeOrders > 0 ? round2(revenue / incomeOrders) : 0,
    receivables: round2(receivables),
    unpaidOrders,
    incomeOrders,
    expenseOrders,
    completedOrders,
    inProgressOrders,
    filamentG: round2(filamentG),
    printHours: round2(printHours),
  };

  return {
    kpi,
    paymentGap: {
      ordered: round2(ordered),
      paid: round2(paid),
      receivable: round2(receivables),
    },
  };
}

function buildDelta(current: number, previous: number) {
  const value = round2(current - previous);
  return {
    value,
    percent: previous === 0 ? null : round1((value / Math.abs(previous)) * 100),
  };
}

function getMonthKeysForRange(orders: Order[], range: DateRange): string[] {
  if (!range.startDate || !range.endDate) {
    return Array.from(new Set(orders.map(getOrderMonthKey))).sort();
  }

  const keys: string[] = [];
  const cursor = new Date(range.startDate.getFullYear(), range.startDate.getMonth(), 1);
  const end = new Date(range.endDate.getFullYear(), range.endDate.getMonth(), 1);
  while (cursor <= end) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

type MutableRank = { id: string; label: string; value: number; secondary: number; color?: string };

function addRankValue(
  map: Map<string, MutableRank>,
  id: string,
  label: string,
  value: number,
  secondary = 0,
  color?: string,
) {
  const existing = map.get(id);
  if (existing) {
    existing.value += value;
    existing.secondary += secondary;
    if (!existing.color && color) existing.color = color;
    return;
  }
  map.set(id, { id, label, value, secondary, color });
}

function sortedRanks(map: Map<string, MutableRank>) {
  return Array.from(map.values())
    .map((item) => ({ ...item, value: round2(item.value), secondary: round2(item.secondary) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ru'));
}

function distributeCostItems(
  order: Order,
  total: number,
  map: Map<string, MutableRank>,
  fallbackLabel: string,
) {
  if (total <= 0) return;

  const items = (order.cost_items || []).filter((item) => Number(item.amount) > 0);
  const detailedTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  if (items.length === 0 || detailedTotal <= 0) {
    addRankValue(map, fallbackLabel, fallbackLabel, total);
    return;
  }

  const allocatedTarget = round2(Math.min(detailedTotal, total));
  const scale = allocatedTarget / detailedTotal;
  let allocated = 0;
  for (const [index, item] of items.entries()) {
    const remaining = round2(allocatedTarget - allocated);
    const amount = index === items.length - 1
      ? remaining
      : Math.min(round2((Number(item.amount) || 0) * scale), remaining);
    if (amount <= 0) continue;
    const label = item.category?.trim() || fallbackLabel;
    addRankValue(map, label.toLocaleLowerCase('ru'), label, amount);
    allocated = round2(allocated + amount);
  }

  const remainder = round2(total - allocated);
  if (remainder > 0) addRankValue(map, fallbackLabel, fallbackLabel, remainder);
}

export function buildStatsReport(input: StatsReportInput): StatsReport {
  const filteredOrders = filterOrdersByDateRange(input.orders, input.range);
  const productsMap = new Map(input.products.map((product) => [product.id, product]));
  const { kpi, paymentGap } = calculateReportKpi(filteredOrders, productsMap, input.mode);
  const previousRange = getPreviousDateRange(input.range);
  const previousKpi = previousRange
    ? calculateReportKpi(filterOrdersByDateRange(input.orders, previousRange), productsMap, input.mode).kpi
    : null;

  const deltas = previousKpi
    ? {
        revenue: buildDelta(kpi.revenue, previousKpi.revenue),
        expenses: buildDelta(kpi.expenses, previousKpi.expenses),
        result: buildDelta(kpi.result, previousKpi.result),
        margin: buildDelta(kpi.margin, previousKpi.margin),
        averageCheck: buildDelta(kpi.averageCheck, previousKpi.averageCheck),
      }
    : emptyDeltas();

  const statusMap = new Map<string, MutableRank>();
  const costMap = new Map<string, MutableRank>();
  const filamentMap = new Map<string, MutableRank>();
  const printerMap = new Map<string, MutableRank & { profit: number }>();
  const productMap = new Map<string, MutableRank & { revenue: number; profit: number; quantity: number }>();
  const activityMap = new Map<string, { key: string; date: Date; orders: number; revenue: number; result: number }>();
  const filamentById = new Map(input.filaments.map((item) => [item.id, item]));
  const printerById = new Map(input.printers.map((item) => [item.id, item]));
  let unlinkedOrders = 0;
  let unknownFilamentG = 0;
  let unknownPrinterHours = 0;

  for (const order of filteredOrders) {
    const financials = getReportOrderFinancials(order, input.mode);
    if (order.type === 'expense') {
      distributeCostItems(order, financials.expense, costMap, 'Прямые расходы');
      continue;
    }

    addRankValue(statusMap, order.status, order.status, 1);
    distributeCostItems(order, financials.expense, costMap, 'Себестоимость заказа');

    const orderResult = financials.revenue - financials.expense;
    const quantity = Math.max(1, Number(order.quantity) || 1);
    const product = order.product_id ? productsMap.get(order.product_id) : undefined;
    const productId = product?.id || 'unlinked';
    const productLabel = product?.name || 'Без привязки';
    const currentProduct = productMap.get(productId);
    if (currentProduct) {
      currentProduct.value += orderResult;
      currentProduct.secondary += financials.revenue;
      currentProduct.revenue += financials.revenue;
      currentProduct.profit += orderResult;
      currentProduct.quantity += quantity;
    } else {
      productMap.set(productId, {
        id: productId,
        label: productLabel,
        value: orderResult,
        secondary: financials.revenue,
        revenue: financials.revenue,
        profit: orderResult,
        quantity,
      });
    }
    if (!product) unlinkedOrders += 1;

    const orderDate = parseOrderDate(order);
    const activityKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
    const activity = activityMap.get(activityKey);
    if (activity) {
      activity.orders += 1;
      activity.revenue += financials.revenue;
      activity.result += orderResult;
    } else {
      activityMap.set(activityKey, {
        key: activityKey,
        date: new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()),
        orders: 1,
        revenue: financials.revenue,
        result: orderResult,
      });
    }

    if (!product) continue;

    const productionParts = product.type === 'assembly' && product.assembly_parts?.length
      ? product.assembly_parts.map((part) => ({
          filamentId: part.filament_id,
          filamentName: part.filament_name,
          filamentColor: part.filament_color,
          printerId: part.printer_id,
          printerName: part.printer_name,
          weightG: (Number(part.weight_g) || 0) * Math.max(1, Number(part.quantity) || 1) * quantity,
          hours: timeToHours(Number(part.hours) || 0, Number(part.minutes) || 0) * Math.max(1, Number(part.quantity) || 1) * quantity,
        }))
      : [{
          filamentId: product.filament_id,
          filamentName: product.filament_name,
          filamentColor: product.filament_color,
          printerId: product.printer_id,
          printerName: product.printer_name,
          weightG: (Number(product.weight_g) || 0) * quantity,
          hours: timeToHours(Number(product.hours) || 0, Number(product.minutes) || 0) * quantity,
        }];

    const totalPartHours = productionParts.reduce((sum, part) => sum + part.hours, 0);
    for (const part of productionParts) {
      const knownFilament = part.filamentId ? filamentById.get(part.filamentId) : undefined;
      const filamentLabel = knownFilament?.name || part.filamentName?.trim() || 'Не указан';
      const filamentId = knownFilament?.id || part.filamentId || `name:${filamentLabel.toLocaleLowerCase('ru')}`;
      addRankValue(filamentMap, filamentId, filamentLabel, part.weightG, 0, knownFilament?.color || part.filamentColor);
      if (filamentLabel === 'Не указан') unknownFilamentG += part.weightG;

      const knownPrinter = part.printerId ? printerById.get(part.printerId) : undefined;
      const printerLabel = knownPrinter?.name || part.printerName?.trim() || 'Не указан';
      const printerId = knownPrinter?.id || part.printerId || `name:${printerLabel.toLocaleLowerCase('ru')}`;
      const allocatedProfit = totalPartHours > 0 ? orderResult * (part.hours / totalPartHours) : 0;
      const currentPrinter = printerMap.get(printerId);
      if (currentPrinter) {
        currentPrinter.value += part.hours;
        currentPrinter.secondary += allocatedProfit;
        currentPrinter.profit += allocatedProfit;
      } else {
        printerMap.set(printerId, {
          id: printerId,
          label: printerLabel,
          value: part.hours,
          secondary: allocatedProfit,
          profit: allocatedProfit,
          color: knownPrinter?.color,
        });
      }
      if (printerLabel === 'Не указан') unknownPrinterHours += part.hours;
    }
  }

  const products = Array.from(productMap.values())
    .map((item) => ({
      ...item,
      value: round2(item.profit),
      secondary: round2(item.revenue),
      revenue: round2(item.revenue),
      profit: round2(item.profit),
      quantity: round2(item.quantity),
    }))
    .sort((a, b) => b.profit - a.profit || a.label.localeCompare(b.label, 'ru'));
  const printerWorkload = Array.from(printerMap.values())
    .map((item) => ({
      ...item,
      value: round2(item.value),
      secondary: round2(item.profit),
      hours: round2(item.value),
      profitPerHour: item.value > 0 ? round2(item.profit / item.value) : 0,
    }))
    .sort((a, b) => b.hours - a.hours || a.label.localeCompare(b.label, 'ru'));
  const costs = sortedRanks(costMap);
  const statuses = sortedRanks(statusMap);
  const filamentUsage = sortedRanks(filamentMap);
  const activity = Array.from(activityMap.values())
    .map((item) => ({ ...item, revenue: round2(item.revenue), result: round2(item.result) }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const monthKeys = getMonthKeysForRange(filteredOrders, input.range);
  const goalTarget = round2(monthKeys.reduce(
    (sum, key) => sum + Math.max(0, Number(input.goals.monthlyGoals[key] ?? input.goals.defaultGoal) || 0),
    0,
  ));
  const goal = {
    target: goalTarget,
    actual: kpi.result,
    progressPercent: goalTarget > 0 ? round1((kpi.result / goalTarget) * 100) : null,
  };

  const insights: StatsReport['insights'] = [];
  if (unlinkedOrders > 0) {
    insights.push({
      id: 'unlinked-orders', severity: 'warning', title: 'Есть заказы без товара',
      detail: `${unlinkedOrders} заказ(а) не участвуют в производственной аналитике`, value: unlinkedOrders, href: '/orders',
    });
  }
  if (paymentGap.ordered > 0 && paymentGap.receivable / paymentGap.ordered > 0.15) {
    insights.push({
      id: 'receivables', severity: 'warning', title: 'Высокая дебиторская задолженность',
      detail: `Не оплачено ${round1((paymentGap.receivable / paymentGap.ordered) * 100)}% суммы заказов`, value: paymentGap.receivable, href: '/orders',
    });
  }
  if (kpi.incomeOrders > 0 && kpi.margin < 20) {
    insights.push({
      id: 'low-margin', severity: 'critical', title: 'Маржинальность ниже 20%',
      detail: `Текущая маржинальность ${round1(kpi.margin)}%`, value: kpi.margin, href: '/products',
    });
  }
  const strongestProduct = products.find((item) => item.id !== 'unlinked' && item.profit > 0);
  if (strongestProduct) {
    insights.push({
      id: 'top-product', severity: 'positive', title: 'Лидер по прибыли',
      detail: `${strongestProduct.label}: ${strongestProduct.profit.toLocaleString('ru-RU')} ₽`, value: strongestProduct.profit, href: '/products',
    });
  }
  if (printerWorkload[0]?.hours > 0) {
    insights.push({
      id: 'top-printer', severity: 'info', title: 'Самый загруженный принтер',
      detail: `${printerWorkload[0].label}: ${printerWorkload[0].hours.toLocaleString('ru-RU')} ч`, value: printerWorkload[0].hours, href: '/printers',
    });
  }
  if (costs[0]?.value > 0) {
    insights.push({
      id: 'top-cost', severity: 'info', title: 'Главная статья затрат',
      detail: `${costs[0].label}: ${costs[0].value.toLocaleString('ru-RU')} ₽`, value: costs[0].value,
    });
  }

  return {
    kpi,
    previousKpi,
    deltas,
    dynamics: generateDynamicsChartData(filteredOrders, input.range, input.preset, input.products, input.mode),
    paymentGap,
    goal,
    statuses,
    products,
    costs,
    filamentUsage,
    printerWorkload,
    activity,
    insights,
    quality: {
      unlinkedOrders,
      unknownFilamentG: round2(unknownFilamentG),
      unknownPrinterHours: round2(unknownPrinterHours),
    },
  };
}

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
  products: SavedCalculation[] = [],
  mode: FinancialMode = 'accrual',
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
  const endDate = range.endDate || new Date();

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
      const financials = getReportOrderFinancials(order, mode);

      bucket.ordersCount += 1;
      if (isIncome) {
        bucket.revenue += financials.revenue;
        bucket.expense += financials.expense;
        const { weightG, printHours } = getOrderProductionMetrics(order, productsMap);
        bucket.filamentG += weightG;
        bucket.printHours += printHours;
      } else {
        bucket.expense += financials.expense;
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
      const financials = getReportOrderFinancials(order, mode);

      bucket.ordersCount += 1;
      if (isIncome) {
        bucket.revenue += financials.revenue;
        bucket.expense += financials.expense;
        const { weightG, printHours } = getOrderProductionMetrics(order, productsMap);
        bucket.filamentG += weightG;
        bucket.printHours += printHours;
      } else {
        bucket.expense += financials.expense;
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
