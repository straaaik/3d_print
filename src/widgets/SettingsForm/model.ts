import type { Settings } from '../../shared/types';

export function parseNonNegativeSetting(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function normalizeWholeMinutes(value: number) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

export function hasNumericSettingChanged(value: string, savedValue: number) {
  if (value.trim() === '') return true;
  const parsed = Number(value.replace(',', '.'));
  return !Number.isFinite(parsed) || parsed !== savedValue;
}

export interface SettingsDraftSnapshot {
  currency: string;
  electricityRate: string;
  defaultPrinterId: string;
  minOrderPrice: string;
  laborRate: string;
  laborTimeMinutes: string;
  isOwnerLaborDefault: boolean;
  isLaborPerUnitDefault: boolean;
  defaultMarkup: string;
  defaultDefect: string;
  defaultUrgencyPercent: string;
  enableMaterialDifficulty: boolean;
  materialMultipliers: Record<string, number>;
}

export function isSettingsDraftEquivalent(draft: SettingsDraftSnapshot, settings: Settings) {
  const savedMultipliers = {
    pla_petg: settings.material_multipliers?.pla_petg ?? 100,
    abs_asa: settings.material_multipliers?.abs_asa ?? 120,
    tpu_flex: settings.material_multipliers?.tpu_flex ?? 140,
    nylon_cf: settings.material_multipliers?.nylon_cf ?? 170,
  };
  return draft.currency === (settings.currency || '₽')
    && !hasNumericSettingChanged(draft.electricityRate, settings.electricity_rate ?? 4.89)
    && draft.defaultPrinterId === (settings.default_printer_id || '')
    && !hasNumericSettingChanged(draft.minOrderPrice, settings.min_order_price ?? 300)
    && !hasNumericSettingChanged(draft.laborRate, settings.labor_rate_per_hour ?? 0)
    && !hasNumericSettingChanged(draft.laborTimeMinutes, settings.labor_time_minutes ?? 15)
    && draft.isOwnerLaborDefault === (settings.is_owner_labor_default ?? true)
    && draft.isLaborPerUnitDefault === (settings.is_labor_per_unit_default ?? false)
    && !hasNumericSettingChanged(draft.defaultMarkup, settings.default_markup_percent ?? 100)
    && !hasNumericSettingChanged(draft.defaultDefect, settings.default_defect_percent ?? 5)
    && !hasNumericSettingChanged(draft.defaultUrgencyPercent, settings.default_urgency_percent ?? 25)
    && draft.enableMaterialDifficulty === (settings.enable_material_difficulty ?? true)
    && Object.entries(savedMultipliers).every(([key, value]) => (draft.materialMultipliers[key] ?? 100) === value);
}
