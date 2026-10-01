import type { Order } from '../types';
import type { OrderItem } from '../types/foundation';

/** Backfill financial facts only. Legacy statuses cannot prove inventory movement. */
export function backfillLegacyOrderItems(orders: readonly Order[], existing: readonly OrderItem[], userId: string): OrderItem[] {
  const items = [...existing];
  const coveredOrders = new Set(items.filter(item => item.user_id === userId).map(item => item.source_order_id));
  for (const order of orders) {
    if (order.type !== 'income' || (order.user_id && order.user_id !== userId) || coveredOrders.has(order.id)) continue;
    const quantity = order.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(order.cost) || order.cost < 0 || !Number.isFinite(order.amount) || order.amount < 0) continue;
    items.push({
      // The table has its own ID namespace; using the order ID makes retry deterministic.
      id: order.id, user_id: userId, created_at: order.created_at ?? '1970-01-01T00:00:00.000Z',
      order_id: order.id, source_order_id: order.id, product_id: order.product_id ?? null,
      name: order.title, quantity, unit_cost: order.cost / quantity, total_cost: order.cost,
      unit_price: order.amount / quantity, total_price: order.amount,
      cost_provenance: 'legacy', fulfilled_quantity: 0, production_quantity: 0,
      snapshot: { version: 1, order: structuredClone(order), calculation: null, recipe: null },
      legacy_key: order.id,
    });
    coveredOrders.add(order.id);
  }
  return items;
}
