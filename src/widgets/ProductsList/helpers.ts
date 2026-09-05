import { SavedCalculation, Order, AssemblyPrintedPart, AssemblyHardwareItem, Filament, Printer, Settings } from '../../shared/types';
import { WarehouseMetrics, SalesStatInfo } from './types';
import { getCategoryConfig } from '../../shared/lib/costCategories';

import { 
  round2, 
  calculateAssemblyTotals, 
  calculateWarehouseMetrics, 
  AssemblyTotalsResult, 
  WarehouseMetricsResult 
} from '../../shared/lib/formulas';

export { round2 };

export function calcAssemblyTotals(
  parts: AssemblyPrintedPart[],
  hardware: AssemblyHardwareItem[],
  assemblyLaborMinutes: number | string,
  laborRate: number = 600,
  isOwnerLabor: boolean = false
): AssemblyTotalsResult {
  return calculateAssemblyTotals(parts, hardware, assemblyLaborMinutes, laborRate, isOwnerLabor);
}

export function getWarehouseMetrics(savedCalculations: SavedCalculation[]): WarehouseMetrics {
  return calculateWarehouseMetrics(savedCalculations);
}

/**
 * Расчет истории продаж на основе реальных зафиксированных исторических заказов.
 * Изменение цен/себестоимости в товарах НЕ меняет исторические данные о продажах!
 */
export function getSalesStats(orders: Order[], savedCalculations: SavedCalculation[]) {
  const map = new Map<string, SalesStatInfo>();
  let totalAllTimeSold = 0;
  let maxSoldQty = 0;

  orders.forEach((order) => {
    if (order.type === 'income') {
      const orderQty = Math.max(1, order.quantity || 1);
      const orderAmount = order.amount || 0;

      let matchedProductId = order.product_id;
      if (!matchedProductId) {
        const found = savedCalculations.find(
          (p) => p.name.toLowerCase().trim() === (order.title || '').toLowerCase().trim()
        );
        if (found) matchedProductId = found.id;
      }

      if (matchedProductId) {
        const current = map.get(matchedProductId) || {
          soldQty: 0,
          orderCount: 0,
          totalRevenue: 0,
          isBestseller: false,
          salesSharePercent: 0,
          totalAllTimeSold: 0,
        };
        current.soldQty += orderQty;
        current.orderCount += 1;
        current.totalRevenue += orderAmount;
        map.set(matchedProductId, current);

        totalAllTimeSold += orderQty;
        if (current.soldQty > maxSoldQty) {
          maxSoldQty = current.soldQty;
        }
      }
    }
  });

  const activeProductsCount = map.size;
  const averageShare = activeProductsCount > 0 ? 100 / activeProductsCount : 0;
  
  // Расчет адаптивного процентного порога:
  // При 1-6 активных товарах: порог ровно 30% (как указано в правиле: <30% - не хит, >=30% - хит)
  // При 7+ товарах: адаптируется под широкий каталог (минимум 15%, максимум 30%, но не менее 2x от среднего)
  const thresholdPercent = activeProductsCount <= 6
    ? 30
    : Math.max(15, Math.min(30, Math.round(averageShare * 2)));

  map.forEach((val) => {
    val.totalAllTimeSold = totalAllTimeSold;
    val.salesSharePercent = totalAllTimeSold > 0
      ? Math.round((val.soldQty / totalAllTimeSold) * 1000) / 10
      : 0;

    const meetsVolume = totalAllTimeSold >= 5 && val.soldQty >= 3;
    const meetsShare = val.salesSharePercent >= thresholdPercent;

    val.isBestseller = meetsVolume && meetsShare;
  });

  return { map, maxSoldQty, totalAllTimeSold, thresholdPercent };
}

export function prepareDraftOrderFromProduct(item: SavedCalculation) {
  let amount = 0;
  let cost = 0;
  let notes = '';
  let totalPrintHours = 0;
  const currentStock = item.stock_quantity || 0;
  const orderQty = item.quantity || 1;
  const isFromStock = currentStock >= orderQty;

  const cost_items: any[] = [];

  if (item.type === 'assembly') {
    const parts = item.assembly_parts || [];
    const hardware = item.assembly_hardware || [];

    const partsCost = parts.reduce((acc, p) => acc + (p.final_price || 0) * (p.quantity || 1), 0);
    const hwCost = hardware.reduce((acc, h) => acc + (h.cost_per_unit || 0) * (h.quantity || 1), 0);
    const hwPrice = hardware.reduce((acc, h) => acc + (h.price_per_unit || 0) * (h.quantity || 1), 0);
    const laborCost = item.assembly_labor_cost || 0;

    const unitPrintHours = parts.reduce((acc, p) => {
      const partHours = (p.hours || 0) + (p.minutes || 0) / 60;
      return acc + partHours * (p.quantity || 1);
    }, 0);
    totalPrintHours = unitPrintHours * orderQty;

    const unitCost = partsCost + hwCost + laborCost;
    const unitAmount = partsCost + hwPrice + laborCost;

    cost = Math.round(unitCost * orderQty * 100) / 100;
    amount = Math.round(unitAmount * orderQty * 100) / 100;
    notes = `Составная сборка: ${item.name} (${parts.length} дет, ${hardware.length} мет, ${orderQty} шт)`;

    if (partsCost > 0) {
      cost_items.push({
        category: 'Печать',
        amount: Math.round(partsCost * orderQty * 100) / 100,
        note: `${parts.length} печатных деталей`,
      });
    }
    if (hwCost > 0) {
      cost_items.push({
        category: 'Фурнитура и метизы',
        amount: Math.round(hwCost * orderQty * 100) / 100,
        note: `${hardware.length} поз. метизов`,
      });
    }
    if (laborCost > 0) {
      cost_items.push({
        category: 'Работа руками',
        amount: Math.round(laborCost * orderQty * 100) / 100,
        note: `Сборка (${item.assembly_labor_minutes || 0} мин)`,
      });
    }
  } else {
    const itemQty = Math.max(1, item.quantity || 1);
    const unitPrintHours = ((item.hours || 0) + (item.minutes || 0) / 60) / itemQty;
    totalPrintHours = unitPrintHours * orderQty;

    const unitCost = (item.base_cost || 0) / itemQty;
    const unitAmount = (item.final_price || item.base_cost || 0) / itemQty;

    cost = Math.round(unitCost * orderQty * 100) / 100;
    amount = Math.round(unitAmount * orderQty * 100) / 100;
    notes = `3D Печать: ${item.name} (${item.filament_name || 'Пластик'}, ${item.weight_g || 0}г, ${orderQty} шт)`;

    const customItems = (item.custom_cost_items || []).filter((c) => c.isEnabled);
    if (customItems.length > 0) {
      let customTotalPerUnit = 0;
      customItems.forEach((ci) => {
        const cfg = getCategoryConfig(ci.name);
        const ciAmount = ci.isPerUnit ? (ci.amount || 0) * orderQty : ci.amount || 0;
        if (ci.isPerUnit) customTotalPerUnit += ci.amount || 0;
        cost_items.push({
          category: cfg.name,
          amount: Math.round(ciAmount * 100) / 100,
          note: ci.isPerUnit ? `${Math.round((ci.amount || 0) * 100) / 100} ₽/шт` : 'на заказ',
        });
      });

      const printOnlyPerUnit = Math.max(0, unitCost - customTotalPerUnit);
      if (printOnlyPerUnit > 0) {
        cost_items.unshift({
          category: 'Печать',
          amount: Math.round(printOnlyPerUnit * orderQty * 100) / 100,
          note: `Пластик (${item.filament_name || 'Пластик'}) + Эл-во`,
        });
      }
    } else {
      if (cost > 0) {
        cost_items.push({
          category: 'Печать',
          amount: cost,
          note: `Материал (${item.filament_name || 'Пластик'})`,
        });
      }
    }
  }

  let totalAddDays = 0;
  let printDays = 0;

  if (!isFromStock) {
    printDays = totalPrintHours > 0 ? Math.ceil(totalPrintHours / 24) : 0;
    totalAddDays = 2 + printDays;
  }

  const inDays = new Date();
  inDays.setDate(inDays.getDate() + totalAddDays);
  const deadlineStr = `${String(inDays.getDate()).padStart(2, '0')}.${String(inDays.getMonth() + 1).padStart(2, '0')}.${inDays.getFullYear()}`;

  return {
    product_id: item.id,
    title: item.name,
    quantity: orderQty,
    amount,
    cost,
    cost_items,
    deadline: deadlineStr,
    notes,
    printDays,
    totalAddDays,
    totalPrintHours: Math.round(totalPrintHours * 10) / 10,
    isFromStock,
    currentStock,
  };
}
