import type { Order, SavedCalculation, Filament, Printer, Settings } from '../../shared/types';
import type { FoundationState, OrderItem, ProductionRecipe } from '../../shared/types/foundation';
import { calculateOrderFinancials, calculatePrintCost, round2, type CalculateCostParams } from '../../shared/lib/formulas';
import { ALL_STATUSES } from './types';
import { calculatorFormToProductUpdates, productToCalculatorForm } from '../../shared/lib/productCalculation';

/** Catalog quantities describe the saved batch. Freeze its rates, never today's resources. */
export function buildOrderItem(product: SavedCalculation, quantity: number,
  options: { userId: string; orderId: string; variantId?: string; id?: string; filaments?: Filament[]; printers?: Printer[]; settings?: Settings | null; recipe?: ProductionRecipe; freezeRetail?: boolean }): OrderItem {
  const batch = Math.max(1, product.quantity ?? 1);
  const units = Math.max(1, Math.floor(quantity));
  const ratio = units / batch;
  const assemblyCosts = [...(product.assembly_parts ?? []).map((part, index) => ({ id: part.id ?? `part-${index}`,
    name: `Печать · ${part.name}`, amount: part.base_cost * part.quantity })),
    ...(product.assembly_hardware ?? []).map(part => ({ id: part.id, name: part.name, amount: part.cost_per_unit * part.quantity })),
    ...(product.assembly_electronics ?? []).map(part => ({ id: part.id, name: part.name, amount: part.cost_per_unit * part.quantity }))];
  const assemblyCostSum = assemblyCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const assemblyInputs: CalculateCostParams = { weightG: 0, hours: 0, minutes: 0, laborMinutes: 0, quantity: batch,
    markupPercent: 0, defectPercent: 0, agreedPrice: product.final_price,
    filament: null, printer: null, settings: null,
    customCostItems: assemblyCosts.length && assemblyCostSum > 0
      ? assemblyCosts.map(cost => ({ ...cost, amount: cost.amount * product.base_cost / assemblyCostSum,
        isEnabled: true, isPerUnit: false, mode: 'cost_no_markup' as const }))
      : [{ id: 'assembly-estimate', name: 'Сохранённая себестоимость сборки', amount: product.base_cost,
        isEnabled: true, isPerUnit: false, mode: 'cost_no_markup' as const }],
  };
  const source = product.type === 'assembly' ? { inputs: assemblyInputs, result: calculatePrintCost(assemblyInputs) }
    : product.calculation_snapshot ?? calculatorFormToProductUpdates(
    productToCalculatorForm(product, options.filaments, options.printers), { filaments: options.filaments ?? [], printers: options.printers ?? [], settings: options.settings ?? null }).calculation_snapshot!;
  const inputs = structuredClone(source.inputs);
  inputs.quantity = units;
  inputs.weightG *= ratio;
  inputs.days = (inputs.days ?? 0) * ratio;
  inputs.hours *= ratio; inputs.minutes *= ratio;
  if (!inputs.isLaborPerUnit) inputs.laborMinutes *= ratio;
  inputs.customCostItems = inputs.customCostItems?.map(cost => ({ ...cost, amount: cost.isPerUnit ? cost.amount : cost.amount * ratio }));
  inputs.discountAmount = (inputs.discountAmount ?? 0) * ratio;
  inputs.urgencyAmount = (inputs.urgencyAmount ?? 0) * ratio;
  if (inputs.agreedPrice !== null && inputs.agreedPrice !== undefined) inputs.agreedPrice *= ratio;
  // Keep saved retail as the final override, with the engine's exact frozen-input result.
  // Batch weight/time and batch-only additions are divided before calculating ordered units.
  if (options.freezeRetail ?? Boolean(product.id)) inputs.agreedPrice = round2(product.final_price * ratio);
  inputs.agreedPrice ??= null;
  const result = calculatePrintCost(inputs);
  const totalCost = result.totalBaseCost;
  const totalPrice = result.totalFinalPrice;
  const createdAt = new Date().toISOString();
  return { id: options.id ?? crypto.randomUUID(), user_id: options.userId, created_at: createdAt,
    order_id: options.orderId || null, source_order_id: options.orderId, product_id: product.id || null,
    name: product.name, quantity: units, unit_cost: result.baseCostPerUnit, total_cost: totalCost,
    unit_price: result.finalPricePerUnit, total_price: totalPrice, cost_provenance: 'estimate',
    fulfilled_quantity: 0, production_quantity: 0, reserved_quantity: 0, returned_quantity: 0,
    legacy_key: null, snapshot: { version: 1, order: {}, calculation: { inputs, result },
      recipe: options.recipe ? structuredClone(options.recipe) : { version: 1, materials: options.variantId && inputs.weightG > 0
        ? [{ variant_id: options.variantId, grams_per_unit: inputs.weightG / units }] : [],
      non_material_unit_cost: Math.max(0, totalCost - result.materialCost) / units,
      product_snapshot: product.id ? structuredClone(product) : null } } };
}

export function summarizeOrderItems(order: Partial<Order>, items: OrderItem[]): Partial<Order> {
  const base = round2(items.reduce((sum, item) => sum + item.total_price, 0));
  const head = { ...order, items, product_id: undefined,
    quantity: items.reduce((sum, item) => sum + item.quantity, 0), base_amount: base,
    cost: round2(items.reduce((sum, item) => sum + item.total_cost, 0)) };
  return { ...head, amount: order.agreed_price === null || order.agreed_price === undefined
    ? calculateOrderFinancials(head).finalAmount : order.agreed_price };
}

/** Existing identities are immutable audit snapshots; explicit edits create a replacement. */
export function replaceOrderItem(item: OrderItem, product: SavedCalculation, variantId?: string,
  id: string = crypto.randomUUID()): OrderItem {
  if (item.production_quantity > 0) throw new Error('После производства параметры позиции защищены.');
  const next = buildOrderItem(product, product.quantity ?? item.quantity,
    { userId: item.user_id, orderId: item.source_order_id, variantId, id, freezeRetail: false });
  return { ...next, product_id: item.product_id,
    snapshot: { ...next.snapshot, recipe: { ...next.snapshot.recipe!, product_snapshot:
      item.product_id ? { ...structuredClone(product), id: item.product_id } : null } } };
}

/** Reconstruct the embedded editor exclusively from frozen values. */
export function orderItemToProduct(item: OrderItem): SavedCalculation {
  const calculation = item.snapshot.calculation;
  const inputs = calculation?.inputs;
  return { ...(item.snapshot.recipe?.product_snapshot ?? {}), id: item.product_id ?? '', name: item.name,
    type: item.snapshot.recipe?.product_snapshot?.type ?? 'single', quantity: item.quantity, weight_g: inputs?.weightG ?? 0,
    hours: (inputs?.days ?? 0) * 24 + (inputs?.hours ?? 0), minutes: inputs?.minutes ?? 0,
    filament_id: inputs?.filament?.id, filament_name: inputs?.filament?.name ?? '',
    filament_color: inputs?.filament?.color, printer_id: inputs?.printer?.id, printer_name: inputs?.printer?.name ?? '',
    labor_minutes: inputs?.laborMinutes, labor_rate_per_hour: inputs?.laborRatePerHour,
    is_owner_labor: inputs?.isOwnerLabor, is_labor_per_unit: inputs?.isLaborPerUnit,
    defect_percent: inputs?.defectPercent, markup_percent: inputs?.markupPercent,
    discount_percent: inputs?.discountPercent, discount_amount: inputs?.discountAmount,
    urgency_percent: inputs?.urgencyPercent, urgency_amount: inputs?.urgencyAmount,
    agreed_price: item.snapshot.recipe?.product_snapshot
      ? item.snapshot.recipe.product_snapshot.agreed_price ?? item.snapshot.recipe.product_snapshot.calculation_snapshot?.inputs.agreedPrice ?? null
      : inputs?.agreedPrice,
    custom_cost_items: inputs?.customCostItems,
    base_cost: calculation?.result.totalBaseCost ?? item.total_cost,
    final_price: calculation?.result.totalFinalPrice ?? item.total_price,
    calculation_snapshot: calculation ? { version: 1, ...structuredClone(calculation) } : undefined };
}

export function createManualOrderProduct(userId: string, filaments: Filament[],
  printers: Printer[], settings: Settings | null): SavedCalculation {
  const base: SavedCalculation = { id: '', user_id: userId, name: 'Новая деталь', filament_name: '', printer_name: '',
    filament_id: filaments[0]?.id, printer_id: printers[0]?.id, weight_g: 0, hours: 0, minutes: 0, quantity: 1, base_cost: 0, final_price: 0 };
  return { ...base, ...calculatorFormToProductUpdates(productToCalculatorForm(base, filaments, printers), {filaments, printers, settings}) };
}

/** Adjust a total without losing earlier receipt dates/notes or creating negative payments. */
export function updateOrderPaymentTotal(order: Partial<Order>, value: number): Partial<Order> {
  const payment = Math.max(0, round2(value));
  if (!payment) return { ...order, payment: 0, payments: [] };
  const payments = structuredClone(order.payments ?? []);
  let delta = round2(payment - payments.reduce<number>((sum, item) => sum + (typeof item === 'number' ? item : item.amount), 0));
  if (delta >= 0) {
    if (payments.length) {
      const last = payments.length - 1, item = payments[last];
      payments[last] = typeof item === 'number' ? round2(item + delta) : { ...item, amount: round2(item.amount + delta) };
    } else payments.push(payment);
  } else {
    for (let index = payments.length - 1; index >= 0 && delta < 0; index--) {
      const item = payments[index], amount = typeof item === 'number' ? item : item.amount;
      const next = Math.max(0, round2(amount + delta)); delta = round2(delta + amount - next);
      payments[index] = typeof item === 'number' ? next : { ...item, amount: next };
    }
  }
  return { ...order, payment, payments };
}

/** A fulfillment receipt locks an all-stock order even after its visible status is rolled back. */
export function areOrderItemsLocked(order: Partial<Order>, state: FoundationState | null): boolean {
  const active = state?.orderItems.filter(item => item.source_order_id === order.id && !item.archived) ?? [];
  const items = [...(order.items ?? []), ...active];
  const currentStatus = state?.legacyOrders?.find(head => head.id === order.id)?.status;
  const atProduction = (status: Order['status'] | undefined) =>
    status !== undefined && ALL_STATUSES.indexOf(status) >= ALL_STATUSES.indexOf('Печать');
  return items.some(item => item.production_quantity > 0)
    || atProduction(order.status) || atProduction(currentStatus)
    || Boolean(state?.finishedMovements.some(movement => items.some(item => item.id === movement.order_item_id)
      && movement.event_key.endsWith(':fulfill:' + movement.order_item_id)));
}
