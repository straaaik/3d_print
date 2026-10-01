import type { Filament, Printer, SavedCalculation, Settings } from '../types';
import { addDraftItem, createCalculationDraft, draftItemInputs, emptyCalculatorForm,
  type CalculationDraft, type CalculatorFormDraft } from './calculationDraft';
import { calculatePrintCost } from './formulas';

/** Compatible with calculator drafts; extra fields preserve legacy combined adjustments. */
export interface ProductCalculatorForm extends CalculatorFormDraft {
  name: string;
  agreedPrice: string;
  discountExtraAmount: string;
  urgencyExtraAmount: string;
  filamentName: string;
  filamentColor?: string;
  printerName: string;
}

export function productToCalculatorForm(product: SavedCalculation, filaments: Filament[] = [],
  printers: Printer[] = []): ProductCalculatorForm {
  const snapshot = product.calculation_snapshot?.inputs;
  const filament = product.filament_id ? filaments.find(item => item.id === product.filament_id)
    : filaments.find(item => item.name === product.filament_name && item.color === product.filament_color);
  const printer = product.printer_id ? printers.find(item => item.id === product.printer_id)
    : printers.find(item => item.name === product.printer_name);
  const hours = product.hours || 0;
  const discountPercent = product.discount_percent ?? snapshot?.discountPercent ?? 0;
  const discountAmount = product.discount_amount ?? snapshot?.discountAmount ?? 0;
  const urgencyPercent = product.urgency_percent ?? snapshot?.urgencyPercent ?? 0;
  const urgencyAmount = product.urgency_amount ?? snapshot?.urgencyAmount ?? 0;
  const agreedPrice = product.agreed_price !== undefined ? product.agreed_price : snapshot?.agreedPrice;
  const discountFixed = !discountPercent && Boolean(discountAmount);
  const urgencyFixed = !urgencyPercent && Boolean(urgencyAmount);
  return { ...emptyCalculatorForm(), name: product.name, weight: String(product.weight_g ?? 0),
    days: String(Math.floor(hours / 24)), hours: String(hours % 24), minutes: String(product.minutes ?? 0),
    quantity: String(product.quantity ?? 1), filamentId: product.filament_id ?? filament?.id ?? '',
    printerId: product.printer_id ?? printer?.id ?? '', filamentName: product.filament_name,
    filamentColor: product.filament_color, printerName: product.printer_name,
    laborMinutes: String(product.labor_minutes ?? snapshot?.laborMinutes ?? ''),
    laborRate: String(product.labor_rate_per_hour ?? snapshot?.laborRatePerHour ?? snapshot?.settings?.labor_rate_per_hour ?? ''),
    markup: String(product.markup_percent ?? snapshot?.markupPercent ?? snapshot?.settings?.default_markup_percent ?? ''),
    defect: String(product.defect_percent ?? snapshot?.defectPercent ?? snapshot?.settings?.default_defect_percent ?? ''),
    isOwnerLabor: product.is_owner_labor ?? snapshot?.isOwnerLabor ?? true,
    isLaborPerUnit: product.is_labor_per_unit ?? snapshot?.isLaborPerUnit ?? false,
    discountType: discountFixed ? 'fixed' : 'percent',
    discountValue: String(discountFixed ? discountAmount : discountPercent),
    discountExtraAmount: String(discountFixed ? 0 : discountAmount),
    urgencyType: urgencyFixed ? 'fixed' : 'percent',
    urgencyValue: String(urgencyFixed ? urgencyAmount : urgencyPercent),
    urgencyExtraAmount: String(urgencyFixed ? 0 : urgencyAmount),
    agreedPrice: agreedPrice === undefined || agreedPrice === null ? '' : String(agreedPrice), preserveResourceSelection: true,
    customCosts: structuredClone(product.custom_cost_items ?? snapshot?.customCostItems ?? []) };
}

export interface ProductCalculationResources {
  filaments: Filament[];
  printers: Printer[];
  settings: Settings | null;
  product?: SavedCalculation;
}

/** A calculation patch only: identity, metadata and physical stock remain owned by the catalog. */
export function calculatorFormToProductUpdates(form: ProductCalculatorForm,
  { filaments, printers, settings, product }: ProductCalculationResources): Partial<SavedCalculation> {
  if (product?.type === 'assembly') throw new Error('Для сборки используйте редактор состава.');
  const filament = filaments.find(item => item.id === form.filamentId) ?? null;
  const printer = printers.find(item => item.id === form.printerId) ?? null;
  const inputs = { ...draftItemInputs(form, filaments, printers, settings), filament, printer };
  const result = calculatePrintCost(inputs);
  return { name: form.name.trim(), type: 'single', filament_id: form.filamentId || undefined,
    filament_name: filament?.name ?? form.filamentName,
    filament_color: filament ? filament.color : form.filamentColor,
    printer_id: form.printerId || undefined, printer_name: printer?.name ?? form.printerName,
    weight_g: inputs.weightG, hours: (inputs.days ?? 0) * 24 + inputs.hours, minutes: inputs.minutes,
    quantity: inputs.quantity, labor_minutes: inputs.laborMinutes, labor_rate_per_hour: inputs.laborRatePerHour,
    is_owner_labor: inputs.isOwnerLabor, is_labor_per_unit: inputs.isLaborPerUnit,
    markup_percent: inputs.markupPercent, defect_percent: inputs.defectPercent,
    custom_cost_items: structuredClone(inputs.customCostItems ?? []),
    discount_percent: inputs.discountPercent, discount_amount: inputs.discountAmount,
    urgency_percent: inputs.urgencyPercent, urgency_amount: inputs.urgencyAmount,
    agreed_price: inputs.agreedPrice ?? null,
    base_cost: result.totalBaseCost, final_price: result.totalFinalPrice,
    calculation_snapshot: { version: 1, inputs: structuredClone(inputs), result } };
}

/** Append a linked product without replacing any existing calculation-project cards. */
export function addProductToCalculationDraft(source: CalculationDraft | null, ownerId: string,
  product: SavedCalculation, filaments: Filament[], printers: Printer[],
  newId: () => string = () => crypto.randomUUID()): CalculationDraft {
  if (product.type === 'assembly') throw new Error('Для сборки используйте редактор состава.');
  if (source && source.user_id !== ownerId) throw new Error('Не совпадает владелец черновика.');
  const form = productToCalculatorForm(product, filaments, printers);
  const draft = source ? addDraftItem(source, newId) : createCalculationDraft(ownerId, form, newId);
  return { ...draft, items: draft.items.map(item => item.id === draft.activeItemId ? {
    ...item, name: product.name, productId: product.id, productRevision: product.catalog_revision ?? 0,
    form, productEditBaseline: { name: product.name, form: structuredClone(form) },
  } : item) };
}

/** Consumers must honor preventDefault before replacing or collapsing a local product draft. */
export function canCloseProductEditor(productId: string, target: EventTarget): boolean {
  return target.dispatchEvent(new CustomEvent('3d-product-editor-close', {
    detail: { productId }, cancelable: true,
  }));
}
