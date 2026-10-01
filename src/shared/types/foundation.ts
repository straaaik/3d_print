import type { Order, SavedCalculation } from './index';
import type { CalculateCostParams, DetailedCalculationResult } from '../lib/formulas';

/** New accounting entities always belong to a single authenticated/local scope. */
export interface OwnedEntity {
  id: string;
  user_id: string;
  created_at: string;
}

export interface FilamentManufacturer extends OwnedEntity { name: string }
export interface MaterialType extends OwnedEntity {
  name: string;
  difficulty_id: string | null;
}
export interface MaterialLine extends OwnedEntity {
  manufacturer_id: string | null;
  material_type_id: string | null;
  name: string;
}
export interface FilamentVariant extends OwnedEntity {
  material_line_id: string | null;
  legacy_filament_id: string | null;
  name: string;
  color: string;
  stock_g: number;
  average_cost_per_g: number;
  revision: number;
}
export interface FilamentPurchase extends OwnedEntity {
  variant_id: string;
  weight_g: number;
  total_price: number;
  purchased_at: string;
  event_key: string;
}
export type InventorySource = 'purchase' | 'production' | 'order' | 'manual_adjustment' | 'opening_balance' | 'finished_return';
export interface ProductionEvent extends OwnedEntity {
  event_key: string;
  product_id: string | null;
  order_item_id: string | null;
  quantity: number;
  unit_cost: number;
  recipe_snapshot: ProductionRecipe;
}
export interface RecipeMaterial {
  variant_id: string;
  grams_per_unit: number;
}
export interface ProductionRecipe {
  version: 1;
  materials: RecipeMaterial[];
  non_material_unit_cost: number;
  product_snapshot: SavedCalculation | null;
}
export interface FilamentMovement extends OwnedEntity {
  variant_id: string;
  event_key: string;
  source: InventorySource;
  source_id: string;
  delta_g: number;
  unit_cost_per_g: number;
  balance_after_g: number;
}
export interface FilamentDeficit extends OwnedEntity {
  variant_id: string;
  event_key: string;
  source_id: string;
  grams: number;
}
export interface CalculationItem extends OwnedEntity {
  /** Removed project positions remain recoverable without affecting active totals. */
  archived?: boolean;
  project_id: string;
  product_id: string | null;
  name: string;
  sort_order: number;
  quantity: number;
  inputs: CalculateCostParams;
  result: DetailedCalculationResult;
  recipe: ProductionRecipe;
}
export interface CalculationProject extends OwnedEntity {
  name: string;
  revision: number;
  discount_percent: number;
  discount_amount: number;
  urgency_percent: number;
  urgency_amount: number;
  agreed_price: number | null;
}
export interface OrderItemSnapshot {
  version: 1;
  order: Partial<Order>;
  calculation: { inputs: CalculateCostParams; result: DetailedCalculationResult } | null;
  recipe: ProductionRecipe | null;
}
export interface OrderItem extends OwnedEntity {
  /** Soft removal keeps the item ID and its physical audit recoverable. */
  archived?: boolean;
  /** Allocated finished units, separate from units manufactured for the order. */
  reserved_quantity?: number;
  /** Explicit finished returns never erase fulfillment or its original cost. */
  returned_quantity?: number;
  order_id: string | null;
  source_order_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  unit_price: number;
  total_price: number;
  cost_provenance: 'legacy' | 'estimate' | 'finished_stock' | 'production' | 'mixed';
  fulfilled_quantity: number;
  production_quantity: number;
  snapshot: OrderItemSnapshot;
  legacy_key: string | null;
}
export interface FinishedStockBalance extends OwnedEntity {
  product_id: string | null;
  source_product_id: string;
  quantity: number;
  average_unit_cost: number;
  revision: number;
}
export interface FinishedStockMovement extends OwnedEntity {
  product_id: string | null;
  source_product_id: string;
  order_item_id: string | null;
  production_event_id: string | null;
  event_key: string;
  source: InventorySource;
  delta_quantity: number;
  unit_cost: number;
  balance_after: number;
}

/** A single local write commits related inventory changes together. */
export interface FoundationState {
  /** Changes only on an explicit complete restore/reset; rejects stale offline work. */
  generation?: number;
  /** Legacy orders share the inventory transaction/outbox until the multi-item UI is connected. */
  legacyOrders?: Order[];
  /** Canonical templates, including archived IDs. Physical stock is projected from finishedBalances. */
  legacyProducts?: SavedCalculation[];
  version: 1;
  user_id: string;
  revision: number;
  manufacturers: FilamentManufacturer[];
  materialTypes: MaterialType[];
  materialLines: MaterialLine[];
  variants: FilamentVariant[];
  purchases: FilamentPurchase[];
  filamentMovements: FilamentMovement[];
  deficits: FilamentDeficit[];
  projects: CalculationProject[];
  calculationItems: CalculationItem[];
  orderItems: OrderItem[];
  productionEvents: ProductionEvent[];
  finishedBalances: FinishedStockBalance[];
  finishedMovements: FinishedStockMovement[];
}
