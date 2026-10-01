import type { Order, OrderStatus } from '../types';
import type { FoundationState, OrderItem } from '../types/foundation';
import { calculatePrintCost, calculateProjectTotals, round2 } from './formulas';
import { applyInventoryCommand, InventoryOperationError, reserveFinishedOrderItem,
  releaseReservedOrderItem, returnFinishedOrderItem } from './inventoryEngine';

export type BusinessOrderCommand = { id: string; occurredAt: string } & (
  | { kind: 'saveBusinessOrder'; order: Order; items?: OrderItem[]; expectedRevision: number; isNew: boolean }
  | { kind: 'archiveBusinessOrders'; orderIds: string[] }
  | { kind: 'returnOrderFinished'; orderItemId: string; quantity: number }
  | { kind: 'restoreBusinessOrders'; orders: Order[]; orderIds: string[];
      expectedRevisions: Record<string, number>; activeItemIds?: Record<string, string[]> }
);

export function isBusinessOrderCommand(command: { kind: string }): command is BusinessOrderCommand {
  return ['saveBusinessOrder', 'archiveBusinessOrders', 'returnOrderFinished', 'restoreBusinessOrders'].includes(command.kind);
}

const statuses: OrderStatus[] = ['Не в работе', 'Моделирование', 'Ждет печати', 'Печать',
  'Ждет покраски', 'Покраска', 'Ждет отправки', 'Отправлен', 'Готово'];
const atProduction = (status: OrderStatus) => statuses.indexOf(status) >= statuses.indexOf('Печать');
const validId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const nonnegative = (value: number) => Number.isFinite(value) && value >= 0;
function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new InventoryOperationError('invalid', message);
}
function assertOwner(state: FoundationState, owner: string | undefined): void {
  if (owner !== undefined && owner !== state.user_id) throw new InventoryOperationError('foreign_reference', 'Order belongs to another user');
}
function validateNumbers(value: unknown): void {
  if (typeof value === 'number') requireValid(Number.isFinite(value), 'Non-finite order or snapshot number');
  else if (Array.isArray(value)) value.forEach(validateNumbers);
  else if (value && typeof value === 'object') Object.values(value).forEach(validateNumbers);
}
function canonical(value: unknown): string {
  const normalize = (input: unknown): unknown => Array.isArray(input) ? input.map(normalize)
    : input && typeof input === 'object' ? Object.fromEntries(Object.entries(input).filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, normalize(item)])) : input;
  return JSON.stringify(normalize(value));
}
function cleanHead(order: Order): Order {
  const head = structuredClone(order);
  delete head.items;
  return head;
}
function activeItems(state: FoundationState, orderId: string): OrderItem[] {
  return state.orderItems.filter(item => item.source_order_id === orderId && !item.archived);
}
function requireOrder(state: FoundationState, id: string): Order {
  const order = state.legacyOrders?.find(row => row.id === id);
  if (!order) throw new InventoryOperationError('not_found', 'Order was not found');
  assertOwner(state, order.user_id);
  return order;
}
function sameDraft(left: OrderItem, right: OrderItem): boolean {
  return left.product_id === right.product_id && left.name === right.name && left.quantity === right.quantity
    && canonical(left.snapshot) === canonical(right.snapshot)
    && left.unit_price === right.unit_price && left.total_price === right.total_price;
}

function validateNewItem(state: FoundationState, item: OrderItem, orderId: string): void {
  validateNumbers(item);
  assertOwner(state, item.user_id);
  requireValid(item.user_id === state.user_id && validId(item.id) && validId(item.name)
    && item.order_id === orderId && item.source_order_id === orderId
    && Number.isFinite(Date.parse(item.created_at)) && Number.isSafeInteger(item.quantity) && item.quantity > 0
    && item.fulfilled_quantity === 0 && item.production_quantity === 0 && (item.reserved_quantity ?? 0) === 0
    && (item.returned_quantity ?? 0) === 0 && !item.archived && ['estimate', 'legacy'].includes(item.cost_provenance)
    && nonnegative(item.unit_cost) && nonnegative(item.total_cost) && nonnegative(item.unit_price)
    && nonnegative(item.total_price), 'Invalid order item draft');
  const { snapshot } = item;
  requireValid(snapshot?.version === 1, 'Invalid frozen snapshot');
  if (item.cost_provenance === 'legacy') {
    requireValid(snapshot.calculation === null && item.legacy_key === orderId && snapshot.order.id === orderId
      && snapshot.order.cost === item.total_cost && snapshot.order.amount === item.total_price
      && (snapshot.order.quantity ?? 1) === item.quantity
      && Math.abs(item.unit_cost * item.quantity - item.total_cost) < 0.000001
      && Math.abs(item.unit_price * item.quantity - item.total_price) < 0.000001, 'Legacy snapshot does not match historical order');
    assertOwner(state, snapshot.order.user_id);
    if (!snapshot.recipe) return;
  } else {
    requireValid(snapshot.calculation && snapshot.recipe, 'Order item requires a frozen calculation snapshot and recipe');
    const { inputs, result } = snapshot.calculation;
    requireValid(inputs.quantity === item.quantity && [inputs.weightG, inputs.hours, inputs.minutes, inputs.laborMinutes].every(nonnegative),
      'Invalid calculation snapshot inputs');
    assertOwner(state, inputs.filament?.user_id);
    assertOwner(state, inputs.printer?.user_id);
    const verified = calculatePrintCost(inputs);
    requireValid(canonical(verified) === canonical(result)
      && Math.abs(item.total_cost - verified.totalBaseCost) < 0.000001
      && Math.abs(item.unit_cost - verified.baseCostPerUnit) < 0.000001
      && Math.abs(item.total_price - verified.totalFinalPrice) < 0.000001
      && Math.abs(item.unit_price - verified.finalPricePerUnit) < 0.000001, 'Calculation snapshot totals do not match the central calculation');
    requireValid((snapshot.order.quantity === undefined || snapshot.order.quantity === item.quantity)
      && (snapshot.order.cost === undefined || Math.abs(snapshot.order.cost - verified.totalBaseCost) < 0.000001)
      && (snapshot.order.amount === undefined || Math.abs(snapshot.order.amount - verified.totalFinalPrice) < 0.000001),
      'Receipt snapshot totals do not match calculation');
  }
  const recipe = snapshot.recipe;
  requireValid(recipe.version === 1 && Array.isArray(recipe.materials) && nonnegative(recipe.non_material_unit_cost), 'Invalid frozen recipe');
  if (recipe.product_snapshot) {
    assertOwner(state, recipe.product_snapshot.user_id);
    requireValid(recipe.product_snapshot.id === item.product_id, 'Recipe product does not match item');
  }
  requireValid(item.product_id === null || validId(item.product_id), 'Invalid item product');
  if (item.product_id) {
    const product = state.legacyProducts?.find(row => row.id === item.product_id);
    const balance = state.finishedBalances.find(row => row.source_product_id === item.product_id);
    if (product) assertOwner(state, product.user_id);
    if (balance) assertOwner(state, balance.user_id);
    requireValid(product || balance || recipe.product_snapshot, 'Order product was not found');
  }
  for (const material of recipe.materials) {
    const variant = state.variants.find(row => row.id === material.variant_id);
    if (!variant) throw new InventoryOperationError('not_found', 'Recipe material was not found');
    assertOwner(state, variant.user_id);
    const micros = Math.round(material.grams_per_unit * 1_000_000);
    requireValid(nonnegative(material.grams_per_unit) && Number.isSafeInteger(micros) && micros > 0,
      'Invalid recipe material quantity');
  }
}

/** Deterministic reservation keys make repeated order creation safe for inventory facts. */
export function reserveOrderItems(state: FoundationState, orderId: string, eventId: string, occurredAt: string): FoundationState {
  requireValid(validId(eventId) && Number.isFinite(Date.parse(occurredAt)), 'Invalid reservation event');
  const head = requireOrder(state, orderId);
  if (head.type !== 'income' || head.order_archived) return state;
  let next = state;
  for (const item of activeItems(state, orderId)) {
    assertOwner(state, item.user_id);
    next = reserveFinishedOrderItem(next, { id: `${eventId}:reserve:${item.id}`, occurredAt, orderItemId: item.id });
  }
  const items = activeItems(next, orderId);
  if (items.length > 0 && !items.every(item => item.cost_provenance === 'legacy')) {
    const cost = round2(items.reduce((sum, item) => sum + item.total_cost, 0));
    requireValid(nonnegative(cost), 'Order cost overflow');
    if (cost !== head.cost) next = { ...next, legacyOrders: next.legacyOrders!.map(row => row.id === orderId ? { ...cleanHead(row), cost } : row) };
  }
  return next;
}

function archiveItems(state: FoundationState, items: OrderItem[], eventId: string, occurredAt: string): FoundationState {
  let next = state;
  for (const item of items) {
    assertOwner(state, item.user_id);
    next = releaseReservedOrderItem(next, { id: `${eventId}:release:${item.id}`, occurredAt, orderItemId: item.id });
    next = { ...next, orderItems: next.orderItems.map(row => row.id === item.id ? { ...row, archived: true } : row) };
  }
  return next;
}

/** Undo is scoped to named heads; current item snapshots and physical facts are authoritative. */
function restoreOrders(state: FoundationState,
  command: Extract<BusinessOrderCommand, { kind: 'restoreBusinessOrders' }>): FoundationState {
  requireValid(Array.isArray(command.orderIds) && command.orderIds.length > 0 && command.orderIds.every(validId)
    && new Set(command.orderIds).size === command.orderIds.length && Array.isArray(command.orders)
    && command.orders.length === command.orderIds.length && new Set(command.orders.map(order => order.id)).size === command.orders.length
    && command.orders.every(order => command.orderIds.includes(order.id))
    && command.expectedRevisions && typeof command.expectedRevisions === 'object', 'Invalid targeted order restore');
  for (const order of command.orders) {
    const previous = requireOrder(state, order.id);
    assertOwner(state, order.user_id);
    validateNumbers(order);
    const expected = command.expectedRevisions[order.id];
    requireValid(Number.isSafeInteger(expected) && expected >= 0 && expected === (previous.order_revision ?? 0),
      `BUSINESS_ORDER_REVISION_CONFLICT:${order.id}`);
    requireValid(order.type === previous.type && validId(order.title) && statuses.includes(order.status)
      && nonnegative(order.amount) && nonnegative(order.payment)
      && (order.order_archived === undefined || typeof order.order_archived === 'boolean'), 'Invalid restored order metadata');
  }
  let next = state;
  for (const incoming of command.orders) {
    const previous = requireOrder(next, incoming.id);
    const head = { ...cleanHead(incoming), user_id: state.user_id, created_at: previous.created_at,
      order_number: previous.order_number, order_revision: (previous.order_revision ?? 0) + 1,
      order_archived: incoming.order_archived ?? false, cost: previous.cost, quantity: previous.quantity };
    if (head.order_archived && !previous.order_archived) {
      next = archiveItems(next, activeItems(next, head.id), command.id, command.occurredAt);
    } else if (!head.order_archived && previous.order_archived && head.type === 'income') {
      const all = next.orderItems.filter(row => row.source_order_id === head.id);
      const ids = command.activeItemIds?.[head.id];
      requireValid(all.length === 0 || Array.isArray(ids) && ids.length > 0 && ids.every(validId)
        && new Set(ids).size === ids.length, 'Unarchive requires the exact previously active item IDs');
      const selected = new Set(ids ?? []);
      requireValid([...selected].every(id => all.some(row => row.id === id))
        && all.every(row => row.production_quantity === 0 || selected.has(row.id)), 'Unarchive cannot replace physical item history');
      all.filter(row => selected.has(row.id)).forEach(row => assertOwner(next, row.user_id));
      next = { ...next, orderItems: next.orderItems.map(row => selected.has(row.id) ? { ...row, archived: false } : row) };
    }
    next = { ...next, legacyOrders: next.legacyOrders!.map(row => row.id === head.id ? head : row) };
    if (!head.order_archived && previous.order_archived) next = reserveOrderItems(next, head.id, command.id, command.occurredAt);
    const items = activeItems(next, head.id);
    if (!head.order_archived && head.type === 'income' && items.length > 0) {
      const cost = items.every(item => item.cost_provenance === 'legacy') ? previous.cost
        : round2(items.reduce((sum, item) => sum + item.total_cost, 0));
      const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
      requireValid(nonnegative(cost) && Number.isSafeInteger(quantity), 'Restored order totals overflow');
      next = { ...next, legacyOrders: next.legacyOrders!.map(row => row.id === head.id ? { ...row, cost, quantity } : row) };
    }
  }
  return next;
}

/** Head, immutable snapshots and physical changes form one caller-owned transaction. */
export function applyBusinessOrderCommand(state: FoundationState, command: BusinessOrderCommand): FoundationState {
  requireValid(state.version === 1 && validId(state.user_id) && validId(command.id)
    && Number.isFinite(Date.parse(command.occurredAt)), 'Invalid business order command');
  if (command.kind === 'returnOrderFinished') return returnFinishedOrderItem(state, command);
  if (command.kind === 'restoreBusinessOrders') return restoreOrders(state, command);
  if (command.kind === 'archiveBusinessOrders') {
    requireValid(Array.isArray(command.orderIds) && command.orderIds.every(validId)
      && new Set(command.orderIds).size === command.orderIds.length, 'Invalid order IDs');
    command.orderIds.forEach(id => requireOrder(state, id));
    let next = state;
    for (const id of command.orderIds) {
      const head = requireOrder(next, id);
      if (head.order_archived) continue;
      next = archiveItems(next, activeItems(next, id), command.id, command.occurredAt);
      next = { ...next, legacyOrders: next.legacyOrders!.map(row => row.id === id
        ? { ...cleanHead(row), order_archived: true, order_revision: (row.order_revision ?? 0) + 1 } : row) };
    }
    return next;
  }
  requireValid(command.kind === 'saveBusinessOrder', 'Unsupported business order command');
  const order = cleanHead(command.order);
  assertOwner(state, order.user_id);
  validateNumbers(order);
  requireValid(validId(order.id) && validId(order.title) && ['income', 'expense'].includes(order.type)
    && statuses.includes(order.status) && nonnegative(order.amount) && nonnegative(order.cost)
    && nonnegative(order.payment) && (order.quantity === undefined || (Number.isSafeInteger(order.quantity) && order.quantity > 0))
    && Number.isSafeInteger(command.expectedRevision) && command.expectedRevision >= 0
    && (order.agreed_price === undefined || order.agreed_price === null || nonnegative(order.agreed_price)), 'Invalid order head');
  const previous = state.legacyOrders?.find(row => row.id === order.id);
  if (previous) assertOwner(state, previous.user_id);
  if (command.isNew) {
    requireValid(!previous, 'Order ID is already occupied; replay must use the transaction receipt');
    requireValid(command.expectedRevision === 0, `BUSINESS_ORDER_REVISION_CONFLICT:${order.id}`);
  } else {
    requireValid(previous, 'Order was not found');
    requireValid(!previous.order_archived, 'Archived order cannot be edited');
    requireValid(command.expectedRevision === (previous.order_revision ?? 0), `BUSINESS_ORDER_REVISION_CONFLICT:${order.id}`);
    requireValid(previous.type === order.type, 'Order type cannot change; create a separate order');
  }
  const current = activeItems(state, order.id);
  current.forEach(item => assertOwner(state, item.user_id));
  let next = state;
  if (command.items !== undefined) {
    requireValid(order.type === 'income' && Array.isArray(command.items) && command.items.length > 0, 'Income order requires calculation items');
    const ids = new Set<string>();
    const incoming: OrderItem[] = [];
    for (const item of command.items) {
      requireValid(validId(item.id) && !ids.has(item.id), 'Duplicate order item ID');
      ids.add(item.id);
      assertOwner(state, item.user_id);
      const stored = state.orderItems.find(row => row.id === item.id);
      if (stored) {
        requireValid(stored.source_order_id === order.id && !stored.archived && sameDraft(stored, item),
          'Изменённая позиция требует нового ID; создайте отдельную позицию, сохранив историю исходной.');
        incoming.push(stored);
      } else {
        validateNewItem(state, item, order.id);
        incoming.push({ ...structuredClone(item), cost_provenance: item.snapshot.recipe ? 'estimate' : item.cost_provenance });
      }
    }
    const removed = current.filter(item => !ids.has(item.id));
    const changed = removed.length > 0 || incoming.some(item => !current.some(row => row.id === item.id));
    requireValid(!changed || !current.some(item => item.production_quantity > 0)
      && !(previous && atProduction(previous.status))
      && !state.finishedMovements.some(row => current.some(item => item.id === row.order_item_id)
        && row.event_key.endsWith(`:fulfill:${row.order_item_id}`)),
      'После печати расчёт и количество защищены; создайте отдельную позицию или заказ.');
    const totals = calculateProjectTotals({ lines: incoming.map(item => ({ quantity: item.quantity,
      result: item.snapshot.calculation?.result ?? { ...calculatePrintCost({ weightG: 0, hours: 0, minutes: 0,
        laborMinutes: 0, quantity: item.quantity, filament: null, printer: null, settings: null }),
      totalBaseCost: item.total_cost, totalFinalPrice: item.total_price } })),
      urgencyPercent: order.urgency_type === 'percent' ? order.urgency_percent : 0,
      urgencyAmount: order.urgency_type === 'percent' ? 0 : order.urgency_amount,
      discountPercent: order.discount_type === 'percent' ? order.discount_percent : 0,
      discountAmount: order.discount_type === 'percent' ? 0 : order.discount_amount,
      agreedPrice: order.agreed_price, payment: order.payment });
    requireValid(Math.abs(order.amount - totals.totalFinalPrice) < 0.005
      && Math.abs(order.cost - incoming.reduce((sum, item) => sum + item.total_cost, 0)) < 0.005
      && (order.quantity === undefined || order.quantity === totals.quantity), 'Order financial totals do not match snapshots');
    next = archiveItems(next, removed, command.id, command.occurredAt);
    next = { ...next, orderItems: [...next.orderItems, ...incoming.filter(item => !state.orderItems.some(row => row.id === item.id))] };
    order.quantity = totals.quantity;
  } else if (command.isNew && order.type === 'income') {
    requireValid(false, 'New income order requires calculation item drafts');
  }
  if (previous) {
    order.created_at = previous.created_at;
    order.order_number = previous.order_number;
  } else {
    order.created_at = order.created_at ?? command.occurredAt;
    order.order_number = order.order_number ?? Math.max(1000, ...(next.legacyOrders ?? []).map(row => row.order_number ?? 1000)) + 1;
  }
  order.user_id = state.user_id;
  order.order_revision = command.isNew ? 0 : (previous!.order_revision ?? 0) + 1;
  order.order_archived = false;
  next = { ...next, legacyOrders: previous ? next.legacyOrders!.map(row => row.id === order.id ? order : row)
    : [...(next.legacyOrders ?? []), order] };
  if (command.items !== undefined) next = reserveOrderItems(next, order.id, command.id, command.occurredAt);
  if (order.type === 'income' && atProduction(order.status)) {
    for (const item of activeItems(next, order.id)) {
      // Historical no-recipe rows cannot prove or reconstruct physical production.
      if (item.cost_provenance === 'legacy' || !item.snapshot.recipe) continue;
      next = applyInventoryCommand(next, { kind: 'fulfill', id: `${command.id}:fulfill:${item.id}`,
        occurredAt: command.occurredAt, orderItemId: item.id, recipe: item.snapshot.recipe });
    }
  }
  const items = activeItems(next, order.id);
  if (order.type === 'income' && items.length > 0) {
    const cost = items.every(item => item.cost_provenance === 'legacy')
      ? previous?.cost ?? items.reduce((sum, item) => sum + item.total_cost, 0)
      : round2(items.reduce((sum, item) => sum + item.total_cost, 0));
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    requireValid(nonnegative(cost) && Number.isSafeInteger(quantity), 'Order totals overflow');
    next = { ...next, legacyOrders: next.legacyOrders!.map(row => row.id === order.id ? { ...row, cost, quantity } : row) };
  }
  return next;
}
