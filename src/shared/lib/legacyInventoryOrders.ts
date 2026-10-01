import type { Order } from '../types';
import type { FoundationState } from '../types/foundation';
import { applyInventoryCommand } from './inventoryEngine';

export type LegacyOrderCommand = { id: string; occurredAt: string } & (
  | { kind: 'saveLegacyOrder'; order: Order }
  | { kind: 'deleteLegacyOrders'; orderIds: string[] }
  | { kind: 'restoreLegacyOrders'; orders: Order[] }
);

export function isLegacyOrderCommand(command: { kind: string }): command is LegacyOrderCommand {
  return ['saveLegacyOrder', 'deleteLegacyOrders', 'restoreLegacyOrders'].includes(command.kind);
}

/** Transitional legacy reservation semantics; no physical material consumption. */
export function applyLegacyOrderCommand(state: FoundationState, command: LegacyOrderCommand): FoundationState {
  if (!state.legacyOrders) throw new Error('Список заказов ещё не загружен.');
  if (!command.id || !Number.isFinite(Date.parse(command.occurredAt))) throw new Error('Некорректная операция заказа.');
  const previous = state.legacyOrders;
  const incoming = command.kind === 'saveLegacyOrder' ? { ...structuredClone(command.order),
    user_id: command.order.user_id ?? state.user_id,
    order_number: previous.find(order => order.id === command.order.id)?.order_number
      ?? command.order.order_number ?? Math.max(1000, ...previous.map(order => order.order_number ?? 0)) + 1 } : null;
  const next = command.kind === 'saveLegacyOrder'
    ? [incoming!, ...previous.filter(order => order.id !== command.order.id)]
    : command.kind === 'deleteLegacyOrders'
      ? previous.filter(order => !command.orderIds.includes(order.id)) : structuredClone(command.orders);
  const ids = new Set<string>();
  const validate = (order: Order) => {
    if (order.user_id && order.user_id !== state.user_id) throw new Error('Заказ другого пользователя.');
    if (order.type !== 'income' || !order.product_id) return;
    const quantity = order.quantity ?? 0;
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Некорректное количество товара.');
  };
  for (const order of previous) validate(order);
  for (const order of next) {
    if (!order.id || ids.has(order.id)) throw new Error('Повторяющийся идентификатор заказа.');
    ids.add(order.id);
    validate(order);
  }
  let result = state;
  const sameReservation = (left: Order, right: Order | undefined) => Boolean(right
    && left.type === right.type && left.product_id === right.product_id && (left.quantity ?? 0) === (right.quantity ?? 0));
  const changeStock = (order: Order, release: boolean) => {
    if (order.type !== 'income' || !order.product_id || !order.quantity) return;
    const productId = order.product_id;
    const balance = result.finishedBalances.find(row => row.source_product_id === productId);
    if (!balance) throw new Error('Связанный товар не найден в складском учёте.');
    const delta = (release ? 1 : -1) * order.quantity;
    const quantity = balance.quantity + delta;
    if (quantity < 0) throw new Error(`На складе только ${balance.quantity} шт. товара.`);
    const prefix = `legacy-order:${order.id}:`;
    const reservation = release ? [...result.finishedMovements].reverse().find(row => row.source === 'order'
      && row.source_product_id === productId && row.event_key.startsWith(prefix) && row.delta_quantity < 0) : undefined;
    // Pre-migration reservations have no recorded actual basis; retain the existing estimate.
    const unitCost = reservation?.unit_cost ?? balance.average_unit_cost;
    const eventId = `${prefix}${command.id}:${release ? 'release' : 'reserve'}`;
    result = applyInventoryCommand(result, { kind: 'adjustFinished', id: eventId,
      occurredAt: command.occurredAt, productId, quantity, unitCost });
    result = { ...result, finishedMovements: result.finishedMovements.map(row =>
      row.event_key === eventId ? { ...row, source: 'order' as const } : row) };
  };
  // Release all changed reservations before reserving their replacements (also for Undo).
  for (const order of previous) if (!sameReservation(order, next.find(row => row.id === order.id))) changeStock(order, true);
  for (const order of next) if (!sameReservation(order, previous.find(row => row.id === order.id))) changeStock(order, false);
  return { ...result, legacyOrders: next };
}
