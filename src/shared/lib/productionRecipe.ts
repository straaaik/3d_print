import type { Filament, Printer, SavedCalculation, Settings } from '../types';
import type { FoundationState, ProductionRecipe, RecipeMaterial } from '../types/foundation';
import { calculatePrintCost } from './formulas';

/** Rebuild production cost from current resources without mutating the product's retail snapshot. */
export function createProductionRecipe(product: SavedCalculation, state: FoundationState,
  products: SavedCalculation[], filaments: Filament[], printers: Printer[], settings: Settings | null,
  ancestors: ReadonlySet<string> = new Set()): ProductionRecipe {
  if (ancestors.has(product.id)) throw new Error('В составе товара обнаружена циклическая ссылка.');
  const visited = new Set(ancestors).add(product.id);
  const materials: RecipeMaterial[] = [];
  let nonMaterial = 0;
  if (product.type === 'assembly') {
    for (const part of product.assembly_parts ?? []) {
      const units = part.quantity;
      if (!Number.isSafeInteger(units) || units <= 0) throw new Error('Некорректное количество деталей в сборке.');
      const source = products.find(item => item.id === part.product_id);
      const component: SavedCalculation = source ?? { ...part, id: part.id ?? `${product.id}:part:${materials.length}`,
        name: part.name, filament_name: part.filament_name ?? '', printer_name: part.printer_name ?? '',
        quantity: 1, type: 'single', stock_quantity: 0 };
      const recipe = createProductionRecipe(component, state, products, filaments, printers, settings, visited);
      materials.push(...recipe.materials.map(material => ({ ...material, grams_per_unit: material.grams_per_unit * units })));
      nonMaterial += recipe.non_material_unit_cost * units;
    }
    for (const item of [...(product.assembly_hardware ?? []), ...(product.assembly_electronics ?? [])]) {
      nonMaterial += item.quantity * item.cost_per_unit;
    }
    if (!product.is_owner_labor) nonMaterial += product.assembly_labor_cost ??
      ((product.assembly_labor_minutes ?? 0) / 60 * (settings?.labor_rate_per_hour ?? 0));
  } else {
    const quantity = product.quantity || 1;
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Некорректный размер партии товара.');
    const filament = filaments.find(item => item.id === product.filament_id)
      ?? filaments.find(item => item.name === product.filament_name);
    const variant = state.variants.find(item => item.id === filament?.id || item.legacy_filament_id === filament?.id);
    if (product.weight_g > 0 && !variant) throw new Error(`Для «${product.name}» не назначен складской вариант материала.`);
    if (variant && product.weight_g > 0) materials.push({ variant_id: variant.id, grams_per_unit: product.weight_g / quantity });
    const printer = printers.find(item => item.id === product.printer_id)
      ?? printers.find(item => item.name === product.printer_name) ?? null;
    const result = calculatePrintCost({ weightG: product.weight_g, hours: product.hours, minutes: product.minutes,
      quantity, laborMinutes: product.labor_minutes ?? 0, laborRatePerHour: product.labor_rate_per_hour,
      isOwnerLabor: product.is_owner_labor, isLaborPerUnit: product.is_labor_per_unit,
      markupPercent: product.markup_percent, defectPercent: product.defect_percent,
      customCostItems: product.custom_cost_items, printer, settings,
      filament: variant ? { id: variant.id, name: variant.name, weight_g: 1000, price: variant.average_cost_per_g * 1000 } : null });
    nonMaterial = Math.max(0, result.totalBaseCost - result.materialCost) / quantity;
  }
  if (!Number.isFinite(nonMaterial) || nonMaterial < 0) throw new Error('Некорректная производственная себестоимость.');
  return { version: 1, materials, non_material_unit_cost: nonMaterial, product_snapshot: structuredClone(product) };
}
