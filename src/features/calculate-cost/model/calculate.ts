import { productToCalculatorForm, calculatorFormToProductUpdates } from '../../../shared/lib/productCalculation';
import { Filament, Printer, Settings, SavedCalculation } from '../../../shared/types';
import {
  calculatePrintCost,
  calculateAssemblyTotals,
  CalculateCostParams,
  DetailedCalculationResult,
  CustomCostBreakdownItem,
  round2
} from '../../../shared/lib/formulas';

// Реэкспорт типов и функций для обратной совместимости
export type { CustomCostBreakdownItem };
export type CalculationResult = DetailedCalculationResult;

/**
 * Калькулятор стоимости 3D-печати (делегирует единому ядру формул)
 */
export const calculateCost = (params: CalculateCostParams): DetailedCalculationResult => {
  return calculatePrintCost(params);
};

/**
 * Пересчет себестоимости и розничных цен сохраненных товаров и сборок (всех или выбранных по targetIds)
 */
export function recalculateAllProducts(
  savedCalculations: SavedCalculation[],
  filaments: Filament[],
  printers: Printer[],
  settings: Settings | null,
  targetIds?: string[]
): SavedCalculation[] {
  const isTarget = (id: string) => !targetIds || targetIds.length === 0 || targetIds.includes(id);

  // 1. Сначала пересчитываем одиночные товары
  const updatedList: SavedCalculation[] = savedCalculations.map((item) => {
    if (item.type === 'assembly') return item;
    if (!isTarget(item.id)) return item;

    const liveFilament = item.filament_id ? filaments.find((f) => f.id === item.filament_id) : null;
    const livePrinter = item.printer_id ? printers.find((p) => p.id === item.printer_id) : null;

    if (!liveFilament && !livePrinter && !item.hours && !item.minutes && !item.weight_g) {
      return item;
    }

    const form = productToCalculatorForm(item, filaments, printers);
    form.isOwnerLabor = item.is_owner_labor ?? item.calculation_snapshot?.inputs.isOwnerLabor ?? settings?.is_owner_labor_default ?? true;
    form.isLaborPerUnit = item.is_labor_per_unit ?? item.calculation_snapshot?.inputs.isLaborPerUnit ?? settings?.is_labor_per_unit_default ?? false;
    const updates = calculatorFormToProductUpdates(form,
      { filaments, printers, settings, product: item });
    return { ...item, ...updates };

  });

  // 2. Затем пересчитываем составные сборки на основе обновленных деталей
  const fullyUpdatedList: SavedCalculation[] = updatedList.map((item) => {
    if (item.type !== 'assembly') return item;

    // Проверяем: либо сама сборка в targetIds, либо хотя бы одна входящая деталь обновилась
    const isAssemblyTarget = isTarget(item.id);
    const hasUpdatedChildPart = (item.assembly_parts || []).some((part) => part.product_id && isTarget(part.product_id));

    if (!isAssemblyTarget && !hasUpdatedChildPart) {
      return item;
    }

    const updatedParts = (item.assembly_parts || []).map((part) => {
      const matchingSingle = updatedList.find((s) => s.id === part.product_id);
      if (matchingSingle) {
        const singleQty = Math.max(1, matchingSingle.quantity || 1);
        return {
          ...part,
          name: matchingSingle.name,
          filament_name: matchingSingle.filament_name,
          filament_color: matchingSingle.filament_color,
          printer_name: matchingSingle.printer_name,
          base_cost: round2(matchingSingle.base_cost / singleQty),
          final_price: round2(matchingSingle.final_price / singleQty),
        };
      }

      const liveFilament = part.filament_id ? filaments.find((f) => f.id === part.filament_id) : null;
      const livePrinter = part.printer_id ? printers.find((p) => p.id === part.printer_id) : null;

      if (liveFilament || livePrinter) {
        const res = calculateCost({
          weightG: part.weight_g || 0,
          hours: part.hours || 0,
          minutes: part.minutes || 0,
          laborMinutes: 0,
          quantity: 1,
          filament: liveFilament || null,
          printer: livePrinter || null,
          settings,
        });
        return {
          ...part,
          filament_name: liveFilament ? liveFilament.name : part.filament_name,
          filament_color: liveFilament ? liveFilament.color : part.filament_color,
          printer_name: livePrinter ? livePrinter.name : part.printer_name,
          base_cost: round2(res.totalBaseCost),
          final_price: round2(res.totalFinalPrice),
        };
      }

      return part;
    });

    const laborMins = item.assembly_labor_minutes ?? 15;
    const laborRate = item.labor_rate_per_hour ?? (settings?.labor_rate_per_hour ?? 600);
    const isOwnerLabor = Boolean(item.is_owner_labor);

    const assemblyTotals = calculateAssemblyTotals(
      updatedParts,
      item.assembly_hardware || [],
      laborMins,
      laborRate,
      isOwnerLabor, item.assembly_electronics || []
    );

    return {
      ...item,
      assembly_parts: updatedParts,
      assembly_labor_cost: assemblyTotals.laborCost,
      base_cost: assemblyTotals.grandBaseCost,
      final_price: item.agreed_price ?? assemblyTotals.grandFinalPrice,
    };
  });

  return fullyUpdatedList;
}
