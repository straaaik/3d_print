import { Filament, Printer, Settings } from '../../../shared/types';
import { timeToHours } from '../../../shared/lib/format';

export interface CalculationResult {
  materialCost: number;
  electricityCost: number;
  depreciationCost: number;
  laborCost: number;
  defectCost: number;
  
  totalBaseCost: number;
  totalFinalPrice: number;
  
  baseCostPerUnit: number;
  finalPricePerUnit: number;
}

export function calculateCost(params: {
  weightG: number;
  hours: number;
  minutes: number;
  laborMinutes: number;
  quantity: number;
  filament: Filament | null;
  printer: Printer | null;
  settings: Settings | null;
}): CalculationResult {
  const { weightG, hours, minutes, laborMinutes, quantity, filament, printer, settings } = params;
  
  const safeQuantity = Math.max(1, quantity || 1);
  const printTimeHours = timeToHours(hours, minutes);
  const electricityRate = settings?.electricity_rate ?? 4.89;
  
  // 1. Стоимость материала
  let materialCost = 0;
  if (filament && filament.weight_g > 0) {
    const pricePerGram = filament.price / filament.weight_g;
    materialCost = weightG * pricePerGram;
  }
  
  // 2. Стоимость электричества
  let electricityCost = 0;
  if (printer) {
    electricityCost = printTimeHours * (printer.power_w / 1000) * electricityRate;
  }
  
  // 3. Амортизация принтера
  let depreciationCost = 0;
  if (printer && printer.lifespan_hours > 0) {
    const depreciationPerHour = printer.price / printer.lifespan_hours;
    depreciationCost = printTimeHours * depreciationPerHour;
  }
  
  // 4. Труд мастера
  let laborCost = 0;
  if (settings && settings.labor_rate_per_hour > 0) {
    const laborTimeHours = laborMinutes / 60;
    laborCost = laborTimeHours * settings.labor_rate_per_hour;
  }
  
  // 5. Стоимость брака
  let defectCost = 0;
  const defectPercent = settings?.default_defect_percent ?? 5;
  if (defectPercent > 0) {
    const subtotal = materialCost + electricityCost + depreciationCost + laborCost;
    defectCost = subtotal * (defectPercent / 100);
  }
  
  // 6. Итого себестоимость (без наценки)
  const totalBaseCost = materialCost + electricityCost + depreciationCost + laborCost + defectCost;
  
  // 7. Итого с наценкой
  const markupPercent = settings?.default_markup_percent ?? 100;
  const totalFinalPrice = totalBaseCost * (1 + markupPercent / 100);
  
  // 8. Поштучно
  const baseCostPerUnit = totalBaseCost / safeQuantity;
  const finalPricePerUnit = totalFinalPrice / safeQuantity;
  
  return {
    materialCost,
    electricityCost,
    depreciationCost,
    laborCost,
    defectCost,
    totalBaseCost,
    totalFinalPrice,
    baseCostPerUnit,
    finalPricePerUnit,
  };
}
