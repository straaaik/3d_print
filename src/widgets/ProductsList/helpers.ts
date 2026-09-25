import { SavedCalculation, Order, AssemblyPrintedPart, AssemblyHardwareItem, AssemblyElectronicsItem, CostItem, ProductCollection } from '../../shared/types';
import { WarehouseMetrics, SalesStatInfo, CatalogTableRow } from './types';
import { getCategoryConfig } from '../../shared/lib/costCategories';

import {
  round2,
  calculateAssemblyTotals,
  calculateWarehouseMetrics,
  AssemblyTotalsResult
} from '../../shared/lib/formulas';

export { round2 };

export function calcAssemblyTotals(
  parts: AssemblyPrintedPart[],
  hardware: AssemblyHardwareItem[],
  assemblyLaborMinutes: number | string,
  laborRate: number = 600,
  isOwnerLabor: boolean = false,
  electronics: AssemblyElectronicsItem[] = []
): AssemblyTotalsResult {
  return calculateAssemblyTotals(parts, hardware, assemblyLaborMinutes, laborRate, isOwnerLabor, electronics);
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

  const cost_items: CostItem[] = [];

  if (item.type === 'assembly') {
    const parts = item.assembly_parts || [];
    const hardware = item.assembly_hardware || [];
    const electronics = item.assembly_electronics || [];

    const partsCost = parts.reduce((acc, p) => acc + (p.final_price || 0) * (p.quantity || 1), 0);
    const hwCost = hardware.reduce((acc, h) => acc + (h.cost_per_unit || 0) * (h.quantity || 1), 0);
    const hwPrice = hardware.reduce((acc, h) => acc + (h.price_per_unit || 0) * (h.quantity || 1), 0);
    const elCost = electronics.reduce((acc, el) => acc + (el.cost_per_unit || 0) * (el.quantity || 1), 0);
    const elPrice = electronics.reduce((acc, el) => acc + (el.price_per_unit || 0) * (el.quantity || 1), 0);
    const laborCost = item.assembly_labor_cost || 0;

    const unitPrintHours = parts.reduce((acc, p) => {
      const partHours = (p.hours || 0) + (p.minutes || 0) / 60;
      return acc + partHours * (p.quantity || 1);
    }, 0);
    totalPrintHours = unitPrintHours * orderQty;

    const unitCost = partsCost + hwCost + elCost + laborCost;
    const unitAmount = partsCost + hwPrice + elPrice + laborCost;

    cost = Math.round(unitCost * orderQty * 100) / 100;
    amount = Math.round(unitAmount * orderQty * 100) / 100;
    notes = `Составная сборка: ${item.name} (${parts.length} дет, ${hardware.length} мет, ${electronics.length > 0 ? `${electronics.length} эл, ` : ''}${orderQty} шт)`;

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
    if (elCost > 0) {
      cost_items.push({
        category: 'Электроника и компоненты',
        amount: Math.round(elCost * orderQty * 100) / 100,
        note: `${electronics.length} поз. электроники`,
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

/**
 * Преобразует HEX-цвет в HSL
 */
function hexToHsl(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/**
 * Вычисляет гармоничный, более светлый и свежий оттенок для дочерних позиций коллекции,
 * чтобы они визуально отличались от заглавной строки-коллекции.
 */
export function getChildCollectionColor(parentHex?: string): string {
  if (!parentHex || !parentHex.startsWith('#')) return '#38bdf8';
  try {
    const [h, s, l] = hexToHsl(parentHex);
    let newH = h;
    if (h >= 200 && h <= 245) newH = Math.max(190, h - 18); // синий -> небесно-голубой / cyan-blue
    else if (h >= 130 && h <= 170) newH = Math.min(180, h + 18); // зеленый -> мятный / teal
    else if (h >= 250 && h <= 300) newH = Math.min(310, h + 18); // фиолетовый -> лавандовый
    else if (h >= 0 && h <= 35) newH = Math.min(45, h + 15); // красный/оранжевый -> теплый янтарный
    const newL = Math.min(84, Math.max(68, l + 16));
    const newS = Math.min(92, Math.max(65, s));
    return hslToHex(newH, newS, newL);
  } catch {
    return '#38bdf8';
  }
}

/**
 * Проверяет соответствие товара (штучного или сборки) поисковому запросу.
 * Для сборок производит глубокий поиск по печатным деталям, крепежу и электронике.
 */
export function matchesSearchProduct(calc: SavedCalculation, rawQuery: string): boolean {
  const query = rawQuery.toLowerCase().trim();
  if (!query) return true;

  // 1. Прямые реквизиты товара
  if (calc.name && calc.name.toLowerCase().includes(query)) return true;
  if (calc.id && calc.id.toLowerCase().includes(query)) return true;
  if (calc.category && calc.category.toLowerCase().includes(query)) return true;
  if (calc.filament_name && calc.filament_name.toLowerCase().includes(query)) return true;
  if (calc.printer_name && calc.printer_name.toLowerCase().includes(query)) return true;
  if (calc.tags && calc.tags.some((t) => t.toLowerCase().includes(query))) return true;

  // 2. Глубокий поиск по внутреннему составу сборок
  if (calc.type === 'assembly') {
    // Печатные детали
    if (
      calc.assembly_parts &&
      calc.assembly_parts.some(
        (p) =>
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.filament_name && p.filament_name.toLowerCase().includes(query)) ||
          (p.printer_name && p.printer_name.toLowerCase().includes(query)) ||
          (p.id && p.id.toLowerCase().includes(query))
      )
    ) {
      return true;
    }

    // Крепёж и фурнитура
    if (
      calc.assembly_hardware &&
      calc.assembly_hardware.some(
        (h) =>
          (h.name && h.name.toLowerCase().includes(query)) ||
          (h.id && h.id.toLowerCase().includes(query))
      )
    ) {
      return true;
    }

    // Электроника и модули
    if (
      calc.assembly_electronics &&
      calc.assembly_electronics.some(
        (e) =>
          (e.name && e.name.toLowerCase().includes(query)) ||
          (e.id && e.id.toLowerCase().includes(query))
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Проверяет соответствие коллекции и её дочерних товаров поисковому запросу.
 * Если совпадает сама коллекция — возвращаются все дочерние позиции.
 * Если совпадает дочерний товар/компонент — коллекция считается совпавшей, а matchedChilds сужается до совпавших.
 */
export function matchesSearchCollection(
  col: ProductCollection,
  childs: SavedCalculation[],
  rawQuery: string
): { matches: boolean; matchedChilds: SavedCalculation[] } {
  const query = rawQuery.toLowerCase().trim();
  if (!query) return { matches: true, matchedChilds: childs };

  const matchSelf =
    (col.name && col.name.toLowerCase().includes(query)) ||
    (col.id && col.id.toLowerCase().includes(query)) ||
    (col.category && col.category.toLowerCase().includes(query)) ||
    (col.description && col.description.toLowerCase().includes(query)) ||
    (col.tags && col.tags.some((t) => t.toLowerCase().includes(query)));

  const matchedChilds = childs.filter((c) => matchesSearchProduct(c, query));

  if (matchSelf) {
    return { matches: true, matchedChilds: childs };
  }

  if (matchedChilds.length > 0) {
    return { matches: true, matchedChilds };
  }

  return { matches: false, matchedChilds: [] };
}

/**
 * Вычисляет словарь ID строк для автоматического раскрытия при активном поиске.
 * Если коллекция или сборка совпала по вложенным элементам/компонентам,
 * она автоматически разворачивается для наглядного отображения найденного.
 */
export function getSearchAutoExpandedIds(
  rows: CatalogTableRow[],
  rawQuery: string,
  currentExpandedIds: Record<string, boolean> = {}
): Record<string, boolean> {
  const query = rawQuery.toLowerCase().trim();
  if (!query) return currentExpandedIds;

  const result: Record<string, boolean> = { ...currentExpandedIds };

  rows.forEach((row) => {
    // Если пользователь явно свернул строку во время поиска, уважаем его выбор
    if (currentExpandedIds[row.id] === false) {
      return;
    }

    if (row.rowKind === 'collection') {
      if (row.childItems && row.childItems.length > 0) {
        result[row.id] = true;
      }
    } else if (row.rowKind === 'product' && row.item.type === 'assembly') {
      const hasSubMatch =
        (row.item.assembly_parts || []).some(
          (p) =>
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.filament_name && p.filament_name.toLowerCase().includes(query)) ||
            (p.printer_name && p.printer_name.toLowerCase().includes(query)) ||
            (p.id && p.id.toLowerCase().includes(query))
        ) ||
        (row.item.assembly_hardware || []).some(
          (h) =>
            (h.name && h.name.toLowerCase().includes(query)) ||
            (h.id && h.id.toLowerCase().includes(query))
        ) ||
        (row.item.assembly_electronics || []).some(
          (e) =>
            (e.name && e.name.toLowerCase().includes(query)) ||
            (e.id && e.id.toLowerCase().includes(query))
        );

      if (hasSubMatch) {
        result[row.id] = true;
      }
    }
  });

  return result;
}

