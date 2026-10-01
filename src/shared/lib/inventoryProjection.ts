import type { Filament, Order, SavedCalculation } from '../types';
import type { FoundationState } from '../types/foundation';

/** Preserve legacy IDs while exposing current unit cost independently of physical grams. */
export function projectInventoryFilaments(state: FoundationState, legacy: Filament[]): Filament[] {
  const mapped = new Set(state.variants.map(variant => variant.legacy_filament_id).filter(Boolean));
  return [...state.variants.map(variant => {
    const line = state.materialLines.find(item => item.id === variant.material_line_id);
    const material = state.materialTypes.find(item => item.id === line?.material_type_id);
    const old = legacy.find(item => item.id === variant.legacy_filament_id);
    return {
      id: variant.legacy_filament_id ?? variant.id, user_id: variant.user_id, created_at: variant.created_at,
      name: variant.name, color: variant.color, weight_g: 1000, price: variant.average_cost_per_g * 1000,
      // Unassigned imported records retain their legacy name-based behavior until categorized.
      material_difficulty_id: material ? material.difficulty_id
        : variant.legacy_filament_id ? old?.material_difficulty_id : null,
    };
  }), ...legacy.filter(item => !mapped.has(item.id))];
}

/** Only physical stock is projected. A purchase never changes catalog retail or saved estimates. */
export function projectInventoryProducts(state: FoundationState, products: SavedCalculation[]): SavedCalculation[] {
  const balances = new Map(state.finishedBalances.map(balance => [balance.source_product_id, balance.quantity]));
  return (state.legacyProducts ?? products).filter(product => !product.catalog_archived).map(product => balances.has(product.id)
    ? { ...product, stock_quantity: balances.get(product.id)! } : product);
}

/** Order calculations are frozen positions; projecting them never reads current catalog prices. */
export function projectInventoryOrders(state: FoundationState, orders: Order[]): Order[] {
  return (state.legacyOrders ?? orders).filter(order => !order.order_archived).map(order => ({
    ...order,
    items: state.orderItems.filter(item => item.source_order_id === order.id && !item.archived),
  }));
}
