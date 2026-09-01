import type { Filament, Printer } from '../../shared/types';

export type FilamentSort = 'name-asc' | 'name-desc' | 'unit-cost-asc' | 'unit-cost-desc' | 'price-asc' | 'price-desc' | 'weight-asc' | 'weight-desc';
export type PrinterSort = 'name-asc' | 'name-desc' | 'hourly-cost-asc' | 'hourly-cost-desc' | 'price-asc' | 'price-desc' | 'power-asc' | 'power-desc' | 'lifespan-asc' | 'lifespan-desc';

export function parseRequiredNonNegative(value: string) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function getFilamentUnitCost(filament: Filament) {
  return filament.weight_g > 0 ? filament.price / filament.weight_g : 0;
}

export function getPrinterHourlyCost(printer: Printer, electricityRate: number) {
  const depreciation = printer.lifespan_hours > 0 ? printer.price / printer.lifespan_hours : 0;
  const electricity = Math.max(0, electricityRate) * Math.max(0, printer.power_w) / 1000;
  return depreciation + electricity;
}

export function calculateFilamentInsights(filaments: Filament[]) {
  const withUnitCost = filaments.filter((item) => item.weight_g > 0).map((item) => ({
    ...item,
    unitCost: getFilamentUnitCost(item),
  }));
  const totalValue = filaments.reduce((sum, item) => sum + Math.max(0, item.price), 0);
  const valueLeaders = [...filaments]
    .sort((a, b) => b.price - a.price)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      value: item.price,
      sharePercent: totalValue > 0 ? item.price / totalValue * 100 : 0,
      color: item.color,
    }));
  const heaviest = filaments.reduce<Filament | null>((best, item) => (
    !best || item.weight_g > best.weight_g ? item : best
  ), null);
  const highestValue = filaments.reduce<Filament | null>((best, item) => (
    !best || item.price > best.price ? item : best
  ), null);

  return {
    minUnitCost: withUnitCost.length > 0 ? Math.min(...withUnitCost.map((item) => item.unitCost)) : 0,
    maxUnitCost: withUnitCost.length > 0 ? Math.max(...withUnitCost.map((item) => item.unitCost)) : 0,
    heaviestName: heaviest?.name ?? '—',
    highestValueName: highestValue?.name ?? '—',
    valueLeaders,
  };
}

export function calculatePrinterInsights(printers: Printer[], electricityRate: number) {
  const totalDepreciationPerHour = printers.reduce((sum, item) => (
    sum + (item.lifespan_hours > 0 ? Math.max(0, item.price) / item.lifespan_hours : 0)
  ), 0);
  const totalEnergyPerHour = printers.reduce((sum, item) => (
    sum + Math.max(0, item.power_w) / 1000 * Math.max(0, electricityRate)
  ), 0);
  const combinedHourlyCost = totalDepreciationPerHour + totalEnergyPerHour;
  const highestPower = printers.reduce<Printer | null>((best, item) => (
    !best || item.power_w > best.power_w ? item : best
  ), null);
  const hourlyCostLeaders = [...printers]
    .sort((a, b) => getPrinterHourlyCost(b, electricityRate) - getPrinterHourlyCost(a, electricityRate))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      hourlyCost: getPrinterHourlyCost(item, electricityRate),
      color: item.color,
    }));

  return {
    totalDepreciationPerHour,
    totalEnergyPerHour,
    energySharePercent: combinedHourlyCost > 0 ? totalEnergyPerHour / combinedHourlyCost * 100 : 0,
    highestPowerName: highestPower?.name ?? '—',
    hourlyCostLeaders,
  };
}

export function calculateFilamentMetrics(filaments: Filament[]) {
  const totalWeightG = filaments.reduce((sum, item) => sum + Math.max(0, item.weight_g), 0);
  const totalValue = filaments.reduce((sum, item) => sum + Math.max(0, item.price), 0);
  const bestValue = filaments
    .filter((item) => item.weight_g > 0)
    .reduce<Filament | null>((best, item) => (
      !best || getFilamentUnitCost(item) < getFilamentUnitCost(best) ? item : best
    ), null);

  return {
    count: filaments.length,
    totalWeightG,
    totalValue,
    averagePricePerGram: totalWeightG > 0 ? totalValue / totalWeightG : 0,
    uniqueColors: new Set(filaments.map((item) => item.color?.toUpperCase()).filter(Boolean)).size,
    bestValueName: bestValue?.name ?? '—',
    bestValuePerGram: bestValue ? getFilamentUnitCost(bestValue) : 0,
  };
}

export function calculatePrinterMetrics(printers: Printer[], electricityRate: number) {
  const hourlyCosts = printers.map((printer) => ({
    printer,
    cost: getPrinterHourlyCost(printer, electricityRate),
  }));
  const lowestHourlyCost = hourlyCosts.reduce<(typeof hourlyCosts)[number] | null>((best, item) => (
    !best || item.cost < best.cost ? item : best
  ), null);

  return {
    count: printers.length,
    totalValue: printers.reduce((sum, item) => sum + Math.max(0, item.price), 0),
    totalPowerW: printers.reduce((sum, item) => sum + Math.max(0, item.power_w), 0),
    totalResourceHours: printers.reduce((sum, item) => sum + Math.max(0, item.lifespan_hours), 0),
    averageHourlyCost: hourlyCosts.length > 0
      ? hourlyCosts.reduce((sum, item) => sum + item.cost, 0) / hourlyCosts.length
      : 0,
    lowestHourlyCostName: lowestHourlyCost?.printer.name ?? '—',
  };
}

export function filterAndSortFilaments(
  filaments: Filament[],
  query: string,
  sort: FilamentSort,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('ru');
  const result = filaments.filter((item) => item.name.toLocaleLowerCase('ru').includes(normalizedQuery));

  return result.sort((a, b) => {
    switch (sort) {
      case 'name-desc': return b.name.localeCompare(a.name, 'ru');
      case 'unit-cost-asc': return getFilamentUnitCost(a) - getFilamentUnitCost(b);
      case 'unit-cost-desc': return getFilamentUnitCost(b) - getFilamentUnitCost(a);
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'weight-asc': return a.weight_g - b.weight_g;
      case 'weight-desc': return b.weight_g - a.weight_g;
      default: return a.name.localeCompare(b.name, 'ru');
    }
  });
}

export function filterAndSortPrinters(
  printers: Printer[],
  query: string,
  sort: PrinterSort,
  electricityRate: number,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('ru');
  const result = printers.filter((item) => item.name.toLocaleLowerCase('ru').includes(normalizedQuery));

  return result.sort((a, b) => {
    switch (sort) {
      case 'name-desc': return b.name.localeCompare(a.name, 'ru');
      case 'hourly-cost-asc': return getPrinterHourlyCost(a, electricityRate) - getPrinterHourlyCost(b, electricityRate);
      case 'hourly-cost-desc': return getPrinterHourlyCost(b, electricityRate) - getPrinterHourlyCost(a, electricityRate);
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'power-asc': return a.power_w - b.power_w;
      case 'power-desc': return b.power_w - a.power_w;
      case 'lifespan-asc': return a.lifespan_hours - b.lifespan_hours;
      case 'lifespan-desc': return b.lifespan_hours - a.lifespan_hours;
      default: return a.name.localeCompare(b.name, 'ru');
    }
  });
}
