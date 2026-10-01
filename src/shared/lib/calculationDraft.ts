import type { CustomCostItem, Filament, Printer, Settings } from '../types';
import type { CalculationProject } from '../types/foundation';
import type { CalculateCostParams } from './formulas';
import { parseCalculatorNumber, resolveCalculatorSelection } from '../../features/calculate-cost/model/calculatorState';
import type { JsonStorage } from './versionedStorage';

export interface CalculatorFormDraft {
  agreedPrice?: string;
  discountExtraAmount?: string;
  urgencyExtraAmount?: string;
  preserveResourceSelection?: boolean;
  weight: string; days: string; hours: string; minutes: string; quantity: string;
  filamentId: string; printerId: string; laborMinutes: string; laborRate: string;
  markup: string; defect: string; isOwnerLabor: boolean; isLaborPerUnit: boolean;
  discountType: 'percent' | 'fixed'; discountValue: string;
  urgencyType: 'percent' | 'fixed'; urgencyValue: string; customCosts: CustomCostItem[];
}
export interface CalculationDraftItem {
  id: string; name: string; productId: string | null; form: CalculatorFormDraft;
  productRevision?: number;
  productEditBaseline?: { name: string; form: CalculatorFormDraft };
}
export interface CalculationDraft {
  version: 1; user_id: string; project: CalculationProject;
  items: CalculationDraftItem[]; activeItemId: string; compareItemIds: string[];
}

export function emptyCalculatorForm(): CalculatorFormDraft {
  return { weight: '', days: '0', hours: '0', minutes: '0', quantity: '1', filamentId: '', printerId: '',
    laborMinutes: '', laborRate: '', markup: '', defect: '', isOwnerLabor: true, isLaborPerUnit: false,
    discountType: 'percent', discountValue: '0', urgencyType: 'percent', urgencyValue: '0', customCosts: [] };
}

export function createCalculationDraft(userId: string, form: CalculatorFormDraft,
  newId: () => string = () => crypto.randomUUID()): CalculationDraft {
  const project: CalculationProject = { id: newId(), user_id: userId, created_at: new Date().toISOString(),
    name: 'Новый проект', revision: 0, discount_percent: 0, discount_amount: 0,
    urgency_percent: 0, urgency_amount: 0, agreed_price: null };
  const item: CalculationDraftItem = { id: newId(), name: 'Расчёт 1', productId: null, form: structuredClone(form) };
  return { version: 1, user_id: userId, project, items: [item], activeItemId: item.id, compareItemIds: [] };
}

export function addDraftItem(draft: CalculationDraft, newId: () => string = () => crypto.randomUUID(),
  copyId?: string): CalculationDraft {
  const source = copyId ? draft.items.find(item => item.id === copyId) : undefined;
  if (copyId && !source) throw new Error('Расчёт не найден.');
  const item: CalculationDraftItem = { id: newId(), name: source ? `${source.name} — копия` : `Расчёт ${draft.items.length + 1}`,
    productId: null, form: source ? structuredClone(source.form) : emptyCalculatorForm() };
  return { ...draft, items: [...draft.items, item], activeItemId: item.id };
}

export function updateDraftForm(draft: CalculationDraft, itemId: string, patch: Partial<CalculatorFormDraft>): CalculationDraft {
  if (!draft.items.some(item => item.id === itemId)) throw new Error('Расчёт не найден.');
  return { ...draft, items: draft.items.map(item => item.id === itemId
    ? { ...item, form: { ...item.form, ...structuredClone(patch) } } : item) };
}

export function removeDraftItem(draft: CalculationDraft, itemId: string): CalculationDraft {
  if (draft.items.length === 1) throw new Error('Нельзя удалить последний расчёт.');
  const items = draft.items.filter(item => item.id !== itemId);
  if (items.length === draft.items.length) throw new Error('Расчёт не найден.');
  return { ...draft, items, activeItemId: draft.activeItemId === itemId ? items[0].id : draft.activeItemId,
    compareItemIds: draft.compareItemIds.filter(id => id !== itemId) };
}

export function setDraftComparison(draft: CalculationDraft, ids: string[]): CalculationDraft {
  const unique = [...new Set(ids)];
  if (unique.length > 2) throw new Error('Можно сравнить не больше двух расчётов.');
  if (unique.some(id => !draft.items.some(item => item.id === id))) throw new Error('Расчёт не найден.');
  return { ...draft, compareItemIds: unique };
}

export function draftItemInputs(form: CalculatorFormDraft, filaments: Filament[], printers: Printer[],
  settings: Settings | null): CalculateCostParams {
  const number = parseCalculatorNumber;
  return { weightG: number(form.weight), days: number(form.days, true), hours: number(form.hours, true),
    minutes: number(form.minutes, true), quantity: Math.max(1, number(form.quantity, true)),
    laborMinutes: form.laborMinutes === '' ? settings?.labor_time_minutes ?? 15 : number(form.laborMinutes, true),
    laborRatePerHour: form.laborRate === '' ? settings?.labor_rate_per_hour ?? 0 : number(form.laborRate),
    isOwnerLabor: form.isOwnerLabor, isLaborPerUnit: form.isLaborPerUnit,
    markupPercent: form.markup === '' ? undefined : number(form.markup),
    defectPercent: form.defect === '' ? undefined : number(form.defect),
    discountPercent: form.discountType === 'percent' ? number(form.discountValue) : 0,
    discountAmount: (form.discountType === 'fixed' ? number(form.discountValue) : 0) + number(form.discountExtraAmount ?? '0'),
    urgencyPercent: form.urgencyType === 'percent' ? number(form.urgencyValue) : 0,
    urgencyAmount: (form.urgencyType === 'fixed' ? number(form.urgencyValue) : 0) + number(form.urgencyExtraAmount ?? '0'),
    agreedPrice: form.agreedPrice === undefined ? undefined : form.agreedPrice.trim() === '' ? null : number(form.agreedPrice),
    customCostItems: structuredClone(form.customCosts),
    filament: form.preserveResourceSelection ? filaments.find(row => row.id === form.filamentId) ?? null
      : resolveCalculatorSelection(filaments, form.filamentId),
    printer: form.preserveResourceSelection ? printers.find(row => row.id === form.printerId) ?? null
      : resolveCalculatorSelection(printers, form.printerId, settings?.default_printer_id), settings };
}

/** Refuse future/corrupt draft data without replacing its stored source. */
export function isCalculationDraft(value: unknown, ownerId: string): value is CalculationDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<CalculationDraft>;
  if (draft.version !== 1 || draft.user_id !== ownerId || !draft.project || draft.project.user_id !== ownerId
    || typeof draft.project.id !== 'string' || typeof draft.project.name !== 'string'
    || !Array.isArray(draft.items) || draft.items.length === 0 || !Array.isArray(draft.compareItemIds)) return false;
  for (const key of ['revision', 'discount_percent', 'discount_amount', 'urgency_percent', 'urgency_amount'] as const) {
    if (!Number.isFinite(draft.project[key]) || draft.project[key] < 0) return false;
  }
  if (draft.project.agreed_price !== null && (!Number.isFinite(draft.project.agreed_price) || draft.project.agreed_price < 0)) return false;
  const ids = new Set<string>();
  const defaults = emptyCalculatorForm();
  for (const item of draft.items) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.name !== 'string'
      || (item.productId !== null && typeof item.productId !== 'string') || !item.form) return false;
    ids.add(item.id);
    for (const key of ['agreedPrice', 'discountExtraAmount', 'urgencyExtraAmount'] as const) {
      if (item.form[key] !== undefined && typeof item.form[key] !== 'string') return false;
    }
    if (item.form.preserveResourceSelection !== undefined && typeof item.form.preserveResourceSelection !== 'boolean') return false;
    if (item.productRevision !== undefined && (!Number.isSafeInteger(item.productRevision) || item.productRevision < 0)) return false;
    if (item.productEditBaseline && (typeof item.productEditBaseline.name !== 'string'
      || !item.productEditBaseline.form || typeof item.productEditBaseline.form.weight !== 'string')) return false;
    for (const key of Object.keys(defaults) as (keyof CalculatorFormDraft)[]) {
      if (key !== 'customCosts' && typeof item.form[key] !== typeof defaults[key]) return false;
    }
    if (!['percent', 'fixed'].includes(item.form.discountType) || !['percent', 'fixed'].includes(item.form.urgencyType)
      || !Array.isArray(item.form.customCosts) || item.form.customCosts.some(cost => !cost || typeof cost.id !== 'string'
        || typeof cost.name !== 'string' || !Number.isFinite(cost.amount) || typeof cost.isEnabled !== 'boolean')) return false;
  }
  return typeof draft.activeItemId === 'string' && ids.has(draft.activeItemId) && draft.compareItemIds.length <= 2
    && new Set(draft.compareItemIds).size === draft.compareItemIds.length && draft.compareItemIds.every(id => ids.has(id));
}

export function calculationDraftKey(ownerId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(ownerId)) throw new Error('Некорректный владелец проекта.');
  return `3d_calculation_project_draft::user:${ownerId}`;
}

export function readCalculationDraft(storage: JsonStorage, ownerId: string): CalculationDraft | null {
  const raw = storage.getItem(calculationDraftKey(ownerId));
  if (raw === null) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Черновик проекта повреждён; исходные данные сохранены.'); }
  if (!isCalculationDraft(value, ownerId)) throw new Error('Черновик проекта несовместим с этой версией; исходные данные сохранены.');
  return value;
}

export function writeCalculationDraft(storage: JsonStorage, draft: CalculationDraft): void {
  readCalculationDraft(storage, draft.user_id); // A concealed newer/corrupt source may never be replaced.
  if (!isCalculationDraft(draft, draft.user_id)) throw new Error('Некорректный черновик проекта.');
  storage.setItem(calculationDraftKey(draft.user_id), JSON.stringify(draft));
}
