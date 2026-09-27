import type { Settings } from '../../../shared/types';

export function parseCalculatorNumber(value: string, integer = false): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return integer ? Math.trunc(parsed) : parsed;
}

export function resolveCalculatorSelection<T extends { id: string }>(items: T[], id: string, defaultId?: string | null): T | null {
  return items.find(item => item.id === id)
    ?? items.find(item => item.id === defaultId)
    ?? items[0]
    ?? null;
}

export function resolveCalculatorLabor(settings: Settings | null, minutes: string, isOwner: boolean | null, isPerUnit: boolean | null) {
  return {
    minutes: minutes !== '' ? minutes : String(settings?.labor_time_minutes ?? 15),
    isOwner: isOwner ?? settings?.is_owner_labor_default ?? false,
    isPerUnit: isPerUnit ?? settings?.is_labor_per_unit_default ?? false,
  };
}

export function calculatorPricingSnapshot(values: { laborMinutes: string; laborRate: string; markup: string; defect: string }) {
  return {
    labor_minutes: parseCalculatorNumber(values.laborMinutes, true),
    labor_rate_per_hour: parseCalculatorNumber(values.laborRate),
    markup_percent: parseCalculatorNumber(values.markup),
    defect_percent: parseCalculatorNumber(values.defect),
  };
}
