/**
 * ============================================================================
 * ЕДИНАЯ СИСТЕМА ФОРМУЛ И РАСЧЕТОВ 3D-ПЕЧАТИ (3D LABS FORMULAS ENGINE)
 * ============================================================================
 * 
 * Данный модуль содержит все математические, производственные, складские
 * и финансовые формулы приложения. Все формулы централизованы, протестированы
 * и снабжены подробными комментариями и JSDoc.
 */

import { 
  Filament, 
  Printer, 
  Settings, 
  SavedCalculation, 
  CustomCostItem, 
  AssemblyPrintedPart, 
  AssemblyHardwareItem, 
  Order, 
  OrderStatus 
} from '../types';
import { timeToHours } from './format';
import { detectMaterialDifficulty, MaterialDifficultyConfig } from './materialDifficulty';

// ============================================================================
// 1. БАЗОВЫЕ УТИЛИТЫ ОКРУГЛЕНИЯ
// ============================================================================

/**
 * Округление числа до 2 знаков после запятой (копейки)
 */
export function round2(num: number | undefined | null): number {
  if (num === undefined || num === null || isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
}

/**
 * Округление числа до 1 знака после запятой (для маржинальности и процентов)
 */
export function round1(num: number | undefined | null): number {
  if (num === undefined || num === null || isNaN(num)) return 0;
  return Math.round(num * 10) / 10;
}

/**
 * Расчет процента маржинальности от выручки: (Прибыль / Выручка) * 100%
 */
export function calcMarginPercent(profit: number, revenue: number): number {
  if (!revenue || revenue <= 0) return 0;
  return round1((profit / revenue) * 100);
}

/**
 * Расчет процента торговой наценки к себестоимости: (Прибыль / Себестоимость) * 100%
 */
export function calcMarkupPercent(profit: number, cost: number): number {
  if (!cost || cost <= 0) return 0;
  return round1((profit / cost) * 100);
}


// ============================================================================
// 2. ФОРМУЛЫ 3D-ПЕЧАТИ (МАТЕРИАЛ, ТОК, АМОРТИЗАЦИЯ, БРАК, ТРУД)
// ============================================================================

/**
 * Расчет стоимости израсходованного филамента / смолы
 * Формула: Вес(г) * (Цена_катушки / Вес_катушки)
 */
export function calcMaterialCost(weightG: number, filament: Filament | null): number {
  if (!filament || !filament.weight_g || filament.weight_g <= 0) return 0;
  const pricePerGram = filament.price / filament.weight_g;
  return round2(weightG * pricePerGram);
}

/**
 * Расчет стоимости электроэнергии за время печати
 * Формула: Время_печати(ч) * (Мощность_принтера(Вт) / 1000) * Тариф_за_кВтч(₽)
 */
export function calcElectricityCost(
  printHours: number, 
  printer: Printer | null, 
  electricityRate: number = 4.89
): number {
  if (!printer || !printer.power_w) return 0;
  return round2(printHours * (printer.power_w / 1000) * electricityRate);
}

/**
 * Расчет амортизации оборудования за время печати
 * Формула: Время_печати(ч) * (Стоимость_принтера / Ресурс_принтера(ч))
 */
export function calcDepreciationCost(printHours: number, printer: Printer | null): number {
  if (!printer || !printer.lifespan_hours || printer.lifespan_hours <= 0) return 0;
  const depreciationPerHour = printer.price / printer.lifespan_hours;
  return round2(printHours * depreciationPerHour);
}

/**
 * Расчет прямых производственных затрат 3D-печати
 * Формула: Материал + Электроэнергия + Амортизация
 */
export function calcPrintDirectCost(
  materialCost: number, 
  electricityCost: number, 
  depreciationCost: number
): number {
  return round2(materialCost + electricityCost + depreciationCost);
}

/**
 * Расчет затрат на возможный технологический брак и тесты
 * Формула: Прямые_затраты_печати * (Процент_брака / 100)
 */
export function calcDefectCost(printDirectCost: number, defectPercent: number = 5): number {
  if (!defectPercent || defectPercent <= 0) return 0;
  return round2(printDirectCost * (defectPercent / 100));
}

/**
 * Расчет стоимости рабочего времени мастера (почасовая ставка)
 * Формула: (Минуты_работы / 60) * Ставка_за_час
 */
export function calcLaborCost(laborMinutes: number, laborRatePerHour: number = 600): number {
  if (!laborMinutes || laborMinutes <= 0 || !laborRatePerHour || laborRatePerHour <= 0) return 0;
  return Math.round((laborMinutes / 60) * laborRatePerHour);
}

/**
 * Расчет наценки за срочность
 * Формула: (Базовая_цена * (Процент_срочности / 100)) + Фиксированная_сумма_срочности
 */
export function calcUrgencyFee(
  basePrice: number, 
  urgencyPercent: number = 0, 
  urgencyAmount: number = 0
): number {
  const percentFee = urgencyPercent > 0 ? (basePrice * urgencyPercent) / 100 : 0;
  return round2(percentFee + (urgencyAmount > 0 ? urgencyAmount : 0));
}

/**
 * Расчет суммы скидки
 * Формула: (Цена_со_срочностью * (Процент_скидки / 100)) + Фиксированная_скидка
 */
export function calcDiscountTotal(
  price: number, 
  discountPercent: number = 0, 
  discountAmount: number = 0
): number {
  const percentDisc = discountPercent > 0 ? (price * discountPercent) / 100 : 0;
  return round2(percentDisc + (discountAmount > 0 ? discountAmount : 0));
}


// ============================================================================
// 3. ПОЛНЫЙ РАСЧЕТ КАЛЬКУЛЯТОРА И СЕБЕСТОИМОСТИ ИЗДЕЛИЯ
// ============================================================================

export interface CustomCostBreakdownItem {
  id: string;
  name: string;
  amount: number;
  isPerUnit: boolean;
  totalAmount: number;
}

export interface DetailedCalculationResult {
  materialCost: number;
  electricityCost: number;
  depreciationCost: number;
  laborCost: number;
  defectCost: number;
  customCostsTotal: number;
  customCostsBreakdown: CustomCostBreakdownItem[];
  
  printDirectCost: number;
  printBaseSubtotal: number;
  printFinalPrice: number;

  isOwnerLabor: boolean;
  isLaborPerUnit: boolean;
  laborMinutesPerUnit: number;
  effectiveLaborMinutes: number;
  laborInCost: number;

  materialDifficulty: MaterialDifficultyConfig | null;
  appliedMarkupPercent: number;

  urgencyPercent: number;
  urgencyAmount: number;
  urgencyCost: number;
  discountPercent: number;
  discountAmount: number;
  discountTotal: number;
  baseRetailPrice: number;
  priceWithUrgency: number;

  minOrderPrice: number;
  isMinOrderApplied: boolean;
  calculatedFinalPrice: number;

  totalBaseCost: number;
  totalFinalPrice: number;
  
  baseCostPerUnit: number;
  finalPricePerUnit: number;

  profitTotal: number;
  profitPerUnit: number;
  marginPercent: number;
}

export interface CalculateCostParams {
  weightG: number;
  hours: number;
  minutes: number;
  laborMinutes: number;
  laborRatePerHour?: number;
  isOwnerLabor?: boolean;
  isLaborPerUnit?: boolean;
  markupPercent?: number;
  defectPercent?: number;
  customCostItems?: CustomCostItem[];
  quantity: number;
  discountPercent?: number;
  discountAmount?: number;
  urgencyPercent?: number;
  urgencyAmount?: number;
  filament: Filament | null;
  printer: Printer | null;
  settings: Settings | null;
}

/**
 * Главная функция расчета себестоимости и розничной цены единичного 3D-изделия или тиража
 */
export function calculatePrintCost(params: CalculateCostParams): DetailedCalculationResult {
  const { 
    weightG, 
    hours, 
    minutes, 
    laborMinutes, 
    laborRatePerHour,
    isOwnerLabor: customIsOwnerLabor,
    isLaborPerUnit: customIsLaborPerUnit,
    markupPercent: customMarkupPercent,
    defectPercent: customDefectPercent,
    customCostItems = [],
    quantity, 
    discountPercent = 0,
    discountAmount = 0,
    urgencyPercent = 0,
    urgencyAmount = 0,
    filament, 
    printer, 
    settings 
  } = params;
  
  const safeQuantity = Math.max(1, quantity || 1);
  const printTimeHours = timeToHours(hours, minutes);
  const electricityRate = settings?.electricity_rate ?? 4.89;
  
  // 1. Материал
  const materialCost = calcMaterialCost(weightG, filament);
  
  // 2. Электричество
  const electricityCost = calcElectricityCost(printTimeHours, printer, electricityRate);
  
  // 3. Амортизация принтера
  const depreciationCost = calcDepreciationCost(printTimeHours, printer);

  // 4. Прямые производственные затраты печати (нить + ток + амортизация)
  const printDirectCost = calcPrintDirectCost(materialCost, electricityCost, depreciationCost);
  
  // 5. Брак
  const effectiveDefectPercent = customDefectPercent !== undefined 
    ? customDefectPercent 
    : (settings?.default_defect_percent ?? 5);
  const defectCost = calcDefectCost(printDirectCost, effectiveDefectPercent);

  // Базовая себестоимость печати с учетом брака
  const printBaseSubtotal = round2(printDirectCost + defectCost);

  // 6. Определение сложности материала и наценки
  const materialDifficulty = filament ? detectMaterialDifficulty(filament.name) : null;
  
  let effectiveMarkupPercent: number;
  if (customMarkupPercent !== undefined) {
    effectiveMarkupPercent = customMarkupPercent;
  } else if (settings?.enable_material_difficulty !== false && materialDifficulty) {
    const configuredMarkup = settings?.material_multipliers?.[materialDifficulty.id];
    effectiveMarkupPercent = configuredMarkup !== undefined 
      ? configuredMarkup 
      : materialDifficulty.defaultMarkup;
  } else {
    effectiveMarkupPercent = settings?.default_markup_percent ?? 100;
  }

  const printFinalPrice = round2(printBaseSubtotal * (1 + effectiveMarkupPercent / 100));
  
  // 7. Труд мастера
  const isLaborPerUnit = customIsLaborPerUnit !== undefined 
    ? customIsLaborPerUnit 
    : (settings?.is_labor_per_unit_default ?? false);
  const effectiveLaborMinutes = isLaborPerUnit ? laborMinutes * safeQuantity : laborMinutes;

  const effectiveLaborRate = laborRatePerHour !== undefined ? laborRatePerHour : (settings?.labor_rate_per_hour ?? 600);
  const laborCost = calcLaborCost(effectiveLaborMinutes, effectiveLaborRate);

  // Личный труд владельца (идет в чистую прибыль, а не в расходную себестоимость)
  const isOwnerLabor = customIsOwnerLabor !== undefined 
    ? customIsOwnerLabor 
    : (settings?.is_owner_labor_default ?? false);
  const laborInCost = isOwnerLabor ? 0 : laborCost;
  
  // 8. Дополнительные расходы и услуги
  const customCostsBreakdown: CustomCostBreakdownItem[] = [];
  let customCostsTotal = 0;

  for (const item of customCostItems) {
    if (!item.isEnabled) continue;
    const itemAmount = item.amount || 0;
    const isPerUnit = Boolean(item.isPerUnit);
    const itemTotal = isPerUnit ? itemAmount * safeQuantity : itemAmount;
    
    customCostsBreakdown.push({
      id: item.id,
      name: item.name,
      amount: itemAmount,
      isPerUnit,
      totalAmount: itemTotal,
    });
    customCostsTotal += itemTotal;
  }
  customCostsTotal = round2(customCostsTotal);

  // 9. Итого себестоимость (Печать + Брак + Наемный труд + Доп. расходы)
  const totalBaseCost = round2(printBaseSubtotal + laborInCost + customCostsTotal);
  
  // 10. Базовая розничная цена (до срочности и скидок)
  const baseRetailPrice = round2(printFinalPrice + laborCost + customCostsTotal);

  // 11. Наценка за срочность (Urgency Fee)
  const safeUrgencyPercent = Math.max(0, urgencyPercent || 0);
  const safeUrgencyAmount = Math.max(0, urgencyAmount || 0);
  const urgencyCost = calcUrgencyFee(baseRetailPrice, safeUrgencyPercent, safeUrgencyAmount);
  const priceWithUrgency = round2(baseRetailPrice + urgencyCost);

  // 12. Скидка (Discount)
  const safeDiscountPercent = Math.max(0, discountPercent || 0);
  const safeDiscountAmount = Math.max(0, discountAmount || 0);
  const discountTotal = calcDiscountTotal(priceWithUrgency, safeDiscountPercent, safeDiscountAmount);
  const priceAfterDiscount = Math.max(0, round2(priceWithUrgency - discountTotal));

  // 13. Минимальная стоимость заказа
  const calculatedFinalPrice = priceAfterDiscount;
  const minOrderPrice = settings?.min_order_price ?? 0;
  const isMinOrderApplied = minOrderPrice > 0 && calculatedFinalPrice < minOrderPrice && (baseRetailPrice > 0 || calculatedFinalPrice > 0);
  const totalFinalPrice = isMinOrderApplied ? minOrderPrice : calculatedFinalPrice;
  
  // 14. Поштучные показатели
  const baseCostPerUnit = round2(totalBaseCost / safeQuantity);
  const finalPricePerUnit = round2(totalFinalPrice / safeQuantity);

  // 15. Прибыль и маржинальность
  const profitTotal = round2(totalFinalPrice - totalBaseCost);
  const profitPerUnit = safeQuantity > 1 
    ? round2(finalPricePerUnit - baseCostPerUnit) 
    : profitTotal;
  const marginPercent = calcMarginPercent(profitTotal, totalFinalPrice);
  
  return {
    materialCost,
    electricityCost,
    depreciationCost,
    laborCost,
    defectCost,
    customCostsTotal,
    customCostsBreakdown,
    printDirectCost,
    printBaseSubtotal,
    printFinalPrice,
    isOwnerLabor,
    isLaborPerUnit,
    laborMinutesPerUnit: laborMinutes,
    effectiveLaborMinutes,
    laborInCost,
    materialDifficulty,
    appliedMarkupPercent: effectiveMarkupPercent,
    urgencyPercent: safeUrgencyPercent,
    urgencyAmount: safeUrgencyAmount,
    urgencyCost,
    discountPercent: safeDiscountPercent,
    discountAmount: safeDiscountAmount,
    discountTotal,
    baseRetailPrice,
    priceWithUrgency,
    minOrderPrice,
    isMinOrderApplied,
    calculatedFinalPrice,
    totalBaseCost,
    totalFinalPrice,
    baseCostPerUnit,
    finalPricePerUnit,
    profitTotal,
    profitPerUnit,
    marginPercent,
  };
}


// ============================================================================
// 4. ФОРМУЛЫ СБОРОЧНЫХ ИЗДЕЛИЙ (ASSEMBLIES)
// ============================================================================

export interface AssemblyTotalsResult {
  totalWeight: number;
  totalHours: number;
  totalMins: number;
  partsBaseCost: number;
  partsFinalPrice: number;
  hwBaseCost: number;
  hwFinalPrice: number;
  totalHwPieces: number;
  laborCost: number;
  effectiveLaborBaseCost: number;
  grandBaseCost: number;
  grandFinalPrice: number;
  profit: number;
  marginPercent: number;
}

/**
 * Расчет сводных параметров и стоимости сборного изделия (3D детали + крепеж + сборка)
 */
export function calculateAssemblyTotals(
  parts: AssemblyPrintedPart[],
  hardware: AssemblyHardwareItem[],
  assemblyLaborMinutes: number | string,
  laborRate: number = 600,
  isOwnerLabor: boolean = false
): AssemblyTotalsResult {
  let totalWeight = 0;
  let totalMinutesTotal = 0;
  let partsBaseCost = 0;
  let partsFinalPrice = 0;

  parts.forEach((p) => {
    const qty = p.quantity || 1;
    totalWeight += (p.weight_g || 0) * qty;
    totalMinutesTotal += ((p.hours || 0) * 60 + (p.minutes || 0)) * qty;
    partsBaseCost += (p.base_cost || 0) * qty;
    partsFinalPrice += (p.final_price || 0) * qty;
  });

  let hwBaseCost = 0;
  let hwFinalPrice = 0;
  let totalHwPieces = 0;

  hardware.forEach((h) => {
    const qty = h.quantity || 1;
    totalHwPieces += qty;
    hwBaseCost += (h.cost_per_unit || 0) * qty;
    hwFinalPrice += (h.price_per_unit || 0) * qty;
  });

  const laborMins = typeof assemblyLaborMinutes === 'string' 
    ? parseInt(assemblyLaborMinutes, 10) || 0 
    : assemblyLaborMinutes || 0;
  const laborCost = calcLaborCost(laborMins, laborRate);

  const totalHours = Math.floor(totalMinutesTotal / 60);
  const totalMins = totalMinutesTotal % 60;

  // Если труд владельца (собираю сам), то стоимость труда НЕ входит в себестоимость (0 руб),
  // а целиком переходит в чистую прибыль
  const effectiveLaborBaseCost = isOwnerLabor ? 0 : laborCost;

  const grandBaseCost = round2(partsBaseCost + hwBaseCost + effectiveLaborBaseCost);
  const grandFinalPrice = round2(partsFinalPrice + hwFinalPrice + laborCost);
  const profit = round2(grandFinalPrice - grandBaseCost);
  const marginPercent = calcMarginPercent(profit, grandFinalPrice);

  return {
    totalWeight: round2(totalWeight),
    totalHours,
    totalMins,
    partsBaseCost: round2(partsBaseCost),
    partsFinalPrice: round2(partsFinalPrice),
    hwBaseCost: round2(hwBaseCost),
    hwFinalPrice: round2(hwFinalPrice),
    totalHwPieces,
    laborCost,
    effectiveLaborBaseCost,
    grandBaseCost,
    grandFinalPrice,
    profit,
    marginPercent,
  };
}


// ============================================================================
// 5. ФОРМУЛЫ СКЛАДА И ГОТОВОЙ ПРОДУКЦИИ (WAREHOUSE METRICS)
// ============================================================================

export interface WarehouseMetricsResult {
  totalUnits: number;
  inStockPositionsCount: number;
  totalRetailValue: number;
  totalCostValue: number;
  potentialProfit: number;
  profitMargin: number;
}

/**
 * Расчет складских показателей готовой продукции на складе
 */
export function calculateWarehouseMetrics(savedCalculations: SavedCalculation[]): WarehouseMetricsResult {
  let totalUnits = 0;
  let inStockPositionsCount = 0;
  let totalRetailValue = 0;
  let totalCostValue = 0;

  savedCalculations.forEach((item) => {
    const stock = item.stock_quantity || 0;
    if (stock > 0) {
      totalUnits += stock;
      inStockPositionsCount += 1;

      if (item.type === 'assembly') {
        const parts = item.assembly_parts || [];
        const hardware = item.assembly_hardware || [];
        const partsBaseCost = parts.reduce((acc, p) => acc + (p.base_cost || 0) * (p.quantity || 1), 0);
        const partsPrice = parts.reduce((acc, p) => acc + (p.final_price || 0) * (p.quantity || 1), 0);
        const hwCost = hardware.reduce((acc, h) => acc + (h.cost_per_unit || 0) * (h.quantity || 1), 0);
        const hwPrice = hardware.reduce((acc, h) => acc + (h.price_per_unit || 0) * (h.quantity || 1), 0);
        const laborCost = item.assembly_labor_cost || 0;
        const isOwnerLabor = Boolean(item.is_owner_labor);

        const unitCost = partsBaseCost + hwCost + (isOwnerLabor ? 0 : laborCost);
        const unitRetail = partsPrice + hwPrice + laborCost;

        totalCostValue += unitCost * stock;
        totalRetailValue += unitRetail * stock;
      } else {
        const itemQty = Math.max(1, item.quantity || 1);
        const unitCost = (item.base_cost || 0) / itemQty;
        const unitRetail = (item.final_price || item.base_cost || 0) / itemQty;

        totalCostValue += unitCost * stock;
        totalRetailValue += unitRetail * stock;
      }
    }
  });

  const potentialProfit = round2(totalRetailValue - totalCostValue);
  const profitMargin = calcMarginPercent(potentialProfit, totalRetailValue);

  return {
    totalUnits,
    inStockPositionsCount,
    totalRetailValue: round2(totalRetailValue),
    totalCostValue: round2(totalCostValue),
    potentialProfit,
    profitMargin,
  };
}


// ============================================================================
// 6. ФОРМУЛЫ ЗАКАЗОВ И ФИНАНСОВ (ORDERS FINANCIALS & KPI)
// ============================================================================

export interface OrderFinancialsResult {
  baseAmount: number;
  urgencyCost: number;
  priceWithUrgency: number;
  discountTotal: number;
  finalAmount: number;
}

/**
 * Расчет финансовой структуры единичного заказа (базовая цена, срочность, скидка, итог)
 */
export function calculateOrderFinancials(order: Partial<Order> | null | undefined): OrderFinancialsResult {
  if (!order) {
    return { baseAmount: 0, urgencyCost: 0, priceWithUrgency: 0, discountTotal: 0, finalAmount: 0 };
  }
  const base = Math.max(0, order.base_amount !== undefined ? order.base_amount : (order.amount || 0));

  // 1. Urgency fee
  let urgencyCost = 0;
  if (order.urgency_type === 'fixed') {
    urgencyCost = Math.max(0, order.urgency_amount || 0);
  } else {
    urgencyCost = (order.urgency_percent && order.urgency_percent > 0) ? (base * order.urgency_percent) / 100 : 0;
  }
  urgencyCost = round2(urgencyCost);

  const priceWithUrgency = round2(base + urgencyCost);

  // 2. Discount
  let discountTotal = 0;
  if (order.discount_type === 'fixed') {
    discountTotal = Math.max(0, order.discount_amount || 0);
  } else {
    discountTotal = (order.discount_percent && order.discount_percent > 0) ? (priceWithUrgency * order.discount_percent) / 100 : 0;
  }
  discountTotal = round2(discountTotal);

  const finalAmount = round2(Math.max(0, priceWithUrgency - discountTotal));

  return {
    baseAmount: base,
    urgencyCost,
    priceWithUrgency,
    discountTotal,
    finalAmount,
  };
}

export interface OrdersSummaryKPIResult {
  totalIncome: number;
  totalExpenses: number;
  netProfitTotal: number;
  totalMarginPercent: number;
  unpaidSum: number;
  incomeOrdersCount: number;
  unpaidOrdersCount: number;
  inProgressCount: number;
  completedCount: number;
  expenseCount: number;
}

/**
 * Расчет сводных финансовых показателей по массиву заказов
 */
export function calculateOrdersSummaryKPI(orders: Order[]): OrdersSummaryKPIResult {
  const incomeOrders = orders.filter((o) => o.type === 'income');
  const expenseOrders = orders.filter((o) => o.type === 'expense');

  // Выручка
  const totalIncome = round2(incomeOrders.reduce((sum, o) => sum + (o.amount || 0), 0));

  // Расходы (прямые расходы + производственная себестоимость выполненных заказов)
  const directExpenses = expenseOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const productionCosts = incomeOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
  const totalExpenses = round2(directExpenses + productionCosts);

  // Чистая прибыль
  const netProfitTotal = round2(
    orders.reduce((acc, o) => {
      if (o.type === 'income') {
        return acc + ((o.amount || 0) - (o.cost || 0));
      }
      return acc - (o.amount || 0);
    }, 0)
  );

  // Маржинальность
  const totalMarginPercent = calcMarginPercent(netProfitTotal, totalIncome);

  // Неоплаченные остатки
  const unpaidSum = round2(
    incomeOrders.reduce((sum, o) => {
      const diff = (o.amount || 0) - (o.payment || 0);
      return sum + (diff > 0 ? diff : 0);
    }, 0)
  );

  const incomeOrdersCount = incomeOrders.length;
  const unpaidOrdersCount = incomeOrders.filter((o) => (o.payment || 0) < (o.amount || 0)).length;
  const inProgressCount = incomeOrders.filter((o) => o.status !== 'Готово' && o.status !== 'Не в работе').length;
  const completedCount = orders.filter((o) => o.status === 'Готово').length;
  const expenseCount = expenseOrders.length;

  return {
    totalIncome,
    totalExpenses,
    netProfitTotal,
    totalMarginPercent,
    unpaidSum,
    incomeOrdersCount,
    unpaidOrdersCount,
    inProgressCount,
    completedCount,
    expenseCount,
  };
}


// ============================================================================
// 7. ФОРМУЛЫ ОБОРУДОВАНИЯ И МАТЕРИАЛОВ
// ============================================================================

/**
 * Расчет стоимости 1 часа работы 3D-принтера (ток + амортизация)
 * Формула: (Мощность(Вт) / 1000 * Тариф_кВтч) + (Цена_принтера / Ресурс_ч)
 */
export function calculatePrinterHourlyCost(
  printer: Printer | null, 
  electricityRate: number = 4.89
): number {
  if (!printer) return 0;
  const electricityPerHour = (printer.power_w / 1000) * electricityRate;
  const depreciationPerHour = printer.lifespan_hours > 0 ? printer.price / printer.lifespan_hours : 0;
  return round2(electricityPerHour + depreciationPerHour);
}

/**
 * Расчет удельной стоимости филамента за 1 килограмм
 * Формула: (Цена_катушки / Вес_катушки_г) * 1000
 */
export function calculateFilamentPricePerKg(filament: Filament | null): number {
  if (!filament || !filament.weight_g || filament.weight_g <= 0) return 0;
  return round2((filament.price / filament.weight_g) * 1000);
}
