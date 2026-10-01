import type { Filament, SavedCalculation } from '../types';
import type {
  FilamentDeficit, FilamentMovement, FilamentVariant, FinishedStockBalance,
  FinishedStockMovement, FoundationState, OrderItem, ProductionEvent, ProductionRecipe,
} from '../types/foundation';

interface CommandBase { id: string; occurredAt: string }

/** Commands are applied to a fresh state, then committed by the caller's CAS transaction. */
export type InventoryCommand = CommandBase & (
  | { kind: 'saveManufacturer'; entityId: string; name: string }
  | { kind: 'saveMaterialType'; entityId: string; name: string; difficultyId: string | null }
  | { kind: 'saveMaterialLine'; entityId: string; name: string; manufacturerId: string | null; materialTypeId: string | null }
  | { kind: 'saveVariant'; entityId: string; name: string; color: string; materialLineId: string | null }
  | { kind: 'purchase'; variantId: string; weightG: number; totalPrice: number }
  | { kind: 'produce'; productId: string; quantity: number; recipe: ProductionRecipe }
  | { kind: 'adjustFinished'; productId: string; quantity: number; unitCost: number; reason?: string }
  | { kind: 'fulfill'; orderItemId: string; recipe: ProductionRecipe }
);

export type InventoryOperationErrorCode = 'invalid' | 'not_found' | 'foreign_reference' | 'event_conflict';

export class InventoryOperationError extends Error {
  constructor(public readonly code: InventoryOperationErrorCode, message: string) {
    super(message);
    this.name = 'InventoryOperationError';
  }
}

const openingTime = '1970-01-01T00:00:00.000Z';
const validId = (value: string): boolean => typeof value === 'string' && value.trim().length > 0;
const finiteNonnegative = (value: number): boolean => Number.isFinite(value) && value >= 0;
const positiveInteger = (value: number): boolean => Number.isSafeInteger(value) && value > 0;
const GRAM_SCALE = 1_000_000;

/** SQL stores gram balances and monetary totals with six decimal places. */
function sixPlaceUnits(value: number, label: string): number {
  requireValid(finiteNonnegative(value), `Invalid ${label}`);
  const units = Math.round(value * GRAM_SCALE);
  requireValid(Number.isSafeInteger(units), `${label} exceeds supported precision`);
  return units;
}

const sixPlaces = (units: number): number => units / GRAM_SCALE;

function requireValid(condition: boolean, message: string): void {
  if (!condition) throw new InventoryOperationError('invalid', message);
}

function requireOwned<T extends { user_id: string }>(entity: T | undefined, userId: string, name: string): T {
  if (!entity) throw new InventoryOperationError('not_found', `${name} was not found`);
  if (entity.user_id !== userId) throw new InventoryOperationError('foreign_reference', `${name} belongs to another user`);
  return entity;
}

function assertScope(userId: string, entityUserId?: string): void {
  if (entityUserId && entityUserId !== userId) {
    throw new InventoryOperationError('foreign_reference', 'Entity belongs to another user');
  }
}

/** Deterministic UUID-shaped IDs keep retries stable and fit the SQL UUID columns. */
function childId(key: string, role: string): string {
  const input = `${key}:${role}`;
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const hex = seeds.map(seed => {
    let hash = seed;
    for (let index = 0; index < input.length; index += 1) {
      hash = Math.imul(hash ^ input.charCodeAt(index), 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function validateRecipe(state: FoundationState, productId: string | null, recipe: ProductionRecipe): Array<{ variant: FilamentVariant; gramsPerUnitMicros: number }> {
  requireValid(recipe?.version === 1 && Array.isArray(recipe.materials) &&
    finiteNonnegative(recipe.non_material_unit_cost), 'Invalid production recipe');
  if (recipe.product_snapshot) {
    requireValid(recipe.product_snapshot.id === productId, 'Recipe product does not match command');
    assertScope(state.user_id, recipe.product_snapshot.user_id);
  } else if (productId !== null && !state.finishedBalances.some(balance => balance.source_product_id === productId && balance.user_id === state.user_id)) {
    throw new InventoryOperationError('not_found', 'Product snapshot or existing balance is required');
  }
  const aggregated = new Map<string, number>();
  for (const material of recipe.materials) {
    requireValid(validId(material.variant_id) && Number.isFinite(material.grams_per_unit) &&
      material.grams_per_unit > 0, 'Invalid recipe material');
    const micros = sixPlaceUnits(material.grams_per_unit, 'Recipe material grams');
    requireValid(micros > 0, 'Recipe material grams round to zero');
    const total = (aggregated.get(material.variant_id) ?? 0) + micros;
    requireValid(Number.isSafeInteger(total), 'Recipe material grams overflow');
    aggregated.set(material.variant_id, total);
  }
  return [...aggregated].map(([variantId, gramsPerUnitMicros]) => ({
    variant: requireOwned(state.variants.find(variant => variant.id === variantId), state.user_id, 'Filament variant'),
    gramsPerUnitMicros,
  }));
}

interface ProductionResult {
  unitCost: number;
  variants: FilamentVariant[];
  movements: FilamentMovement[];
  deficits: FilamentDeficit[];
  event: ProductionEvent;
}

function produceBatch(state: FoundationState, command: CommandBase, productId: string | null,
  quantity: number, recipe: ProductionRecipe, orderItemId: string | null): ProductionResult {
  requireValid(positiveInteger(quantity), 'Production quantity must be a positive integer');
  const materials = validateRecipe(state, productId, recipe);
  const eventId = childId(command.id, 'production');
  const unitCost = recipe.non_material_unit_cost +
    materials.reduce((sum, material) => sum + sixPlaces(material.gramsPerUnitMicros) * material.variant.average_cost_per_g, 0);
  requireValid(finiteNonnegative(unitCost), 'Production unit cost overflow');
  const event: ProductionEvent = {
    id: eventId, user_id: state.user_id, created_at: command.occurredAt, event_key: command.id,
    product_id: productId, order_item_id: orderItemId, quantity, unit_cost: unitCost,
    recipe_snapshot: structuredClone(recipe),
  };
  const movements: FilamentMovement[] = [];
  const deficits: FilamentDeficit[] = [];
  const updated = new Map<string, FilamentVariant>();
  for (const { variant, gramsPerUnitMicros } of materials) {
    const requiredMicros = gramsPerUnitMicros * quantity;
    requireValid(Number.isSafeInteger(requiredMicros), 'Recipe material amount is too large');
    const stockMicros = sixPlaceUnits(variant.stock_g, 'Filament stock');
    const consumedMicros = Math.min(stockMicros, requiredMicros);
    const remaining = sixPlaces(stockMicros - consumedMicros);
    if (consumedMicros > 0) {
      movements.push({ id: childId(command.id, `material:${variant.id}`), user_id: state.user_id,
        created_at: command.occurredAt, variant_id: variant.id, event_key: command.id,
        source: 'production', source_id: eventId, delta_g: -sixPlaces(consumedMicros),
        unit_cost_per_g: variant.average_cost_per_g, balance_after_g: remaining });
    }
    if (requiredMicros > consumedMicros) {
      deficits.push({ id: childId(command.id, `deficit:${variant.id}`), user_id: state.user_id,
        created_at: command.occurredAt, variant_id: variant.id, event_key: command.id,
        source_id: eventId, grams: sixPlaces(requiredMicros - consumedMicros) });
    }
    updated.set(variant.id, { ...variant, stock_g: remaining, revision: variant.revision + 1 });
  }
  return { unitCost, variants: state.variants.map(variant => updated.get(variant.id) ?? variant),
    movements, deficits, event };
}

function finishedBalance(state: FoundationState, productId: string): FinishedStockBalance | undefined {
  const balance = state.finishedBalances.find(item => item.source_product_id === productId);
  if (balance) assertScope(state.user_id, balance.user_id);
  return balance;
}

function newFinishedBalance(state: FoundationState, productId: string, at: string): FinishedStockBalance {
  return { id: productId, user_id: state.user_id, created_at: at,
    product_id: productId, source_product_id: productId, quantity: 0, average_unit_cost: 0, revision: 0 };
}

function replaceBalance(state: FoundationState, balance: FinishedStockBalance): FinishedStockBalance[] {
  return state.finishedBalances.some(item => item.source_product_id === balance.source_product_id)
    ? state.finishedBalances.map(item => item.source_product_id === balance.source_product_id ? balance : item)
    : [...state.finishedBalances, balance];
}

function finishedMovement(state: FoundationState, command: CommandBase, productId: string,
  source: FinishedStockMovement['source'], delta: number, unitCost: number, balanceAfter: number,
  orderItemId: string | null, productionEventId: string | null): FinishedStockMovement {
  return { id: childId(command.id, `finished:${productId}`), user_id: state.user_id,
    created_at: command.occurredAt, product_id: productId, source_product_id: productId,
    order_item_id: orderItemId, production_event_id: productionEventId, event_key: command.id,
    source, delta_quantity: delta, unit_cost: unitCost, balance_after: balanceAfter };
}

function alreadyApplied(state: FoundationState, command: InventoryCommand): boolean {
  const purchase = state.purchases.some(row => row.event_key === command.id);
  const production = state.productionEvents.some(row => row.event_key === command.id);
  const finished = state.finishedMovements.some(row => row.event_key === command.id);
  const filament = state.filamentMovements.some(row => row.event_key === command.id);
  const deficit = state.deficits.some(row => row.event_key === command.id);
  const exists = purchase || production || finished || filament || deficit;
  if (!exists) return false;
  const matching = (command.kind === 'purchase' && purchase) ||
    (command.kind === 'produce' && production) ||
    (command.kind === 'fulfill' && (production || finished)) ||
    (command.kind === 'adjustFinished' && finished);
  if (!matching) throw new InventoryOperationError('event_conflict', 'Event key belongs to a different operation');
  return true;
}

/** Actual allocation basis comes from immutable facts, never the remaining estimate. */
function allocatedCost(state: FoundationState, item: OrderItem): number {
  const stock = state.finishedMovements.filter(row => row.order_item_id === item.id && row.source === 'order');
  const production = state.productionEvents.filter(row => row.order_item_id === item.id);
  if (stock.length || production.length) return stock.reduce((sum, row) => sum - row.delta_quantity * row.unit_cost, 0)
    + production.reduce((sum, row) => sum + row.quantity * row.unit_cost, 0);
  // Compatibility for previously fulfilled inventory commands without a reservation field.
  return item.fulfilled_quantity > 0 ? item.total_cost : 0;
}

interface OrderStockCommand extends CommandBase { orderItemId: string }

/** Reserve only available finished units; shortage is represented by the unfulfilled quantity. */
export function reserveFinishedOrderItem(state: FoundationState, command: OrderStockCommand): FoundationState {
  requireValid(validId(command.id) && Number.isFinite(Date.parse(command.occurredAt)), 'Invalid reservation command');
  const item = requireOwned(state.orderItems.find(row => row.id === command.orderItemId), state.user_id, 'Order item');
  if (item.archived || !item.product_id || item.cost_provenance === 'legacy'
    || state.finishedMovements.some(row => row.event_key === command.id)) return state;
  const remaining = item.quantity - item.fulfilled_quantity;
  requireValid(Number.isSafeInteger(remaining) && remaining >= 0, 'Invalid fulfillment balance');
  const balance = finishedBalance(state, item.product_id);
  if (!balance || remaining === 0 || balance.quantity === 0) return state;
  requireValid(Number.isSafeInteger(balance.quantity) && balance.quantity >= 0
    && finiteNonnegative(balance.average_unit_cost), 'Invalid finished balance');
  const quantity = Math.min(balance.quantity, remaining);
  const estimate = item.snapshot.calculation?.result.totalBaseCost
    ?? item.snapshot.order.cost ?? item.total_cost;
  requireValid(finiteNonnegative(estimate), 'Invalid order estimate');
  const totalCost = allocatedCost(state, item) + quantity * balance.average_unit_cost
    + (remaining - quantity) * estimate / item.quantity;
  requireValid(finiteNonnegative(totalCost), 'Order item cost overflow');
  const updatedBalance = { ...balance, quantity: balance.quantity - quantity, revision: balance.revision + 1 };
  const updatedItem: OrderItem = { ...item, fulfilled_quantity: item.fulfilled_quantity + quantity,
    reserved_quantity: (item.reserved_quantity ?? Math.max(0, item.fulfilled_quantity - item.production_quantity)) + quantity,
    returned_quantity: item.returned_quantity ?? 0, total_cost: totalCost, unit_cost: totalCost / item.quantity,
    cost_provenance: item.production_quantity > 0 || remaining > quantity ? 'mixed' : 'finished_stock' };
  return { ...state, finishedBalances: replaceBalance(state, updatedBalance),
    finishedMovements: [...state.finishedMovements, finishedMovement(state, command, item.product_id,
      'order', -quantity, balance.average_unit_cost, updatedBalance.quantity, item.id, null)],
    orderItems: state.orderItems.map(row => row.id === item.id ? updatedItem : row) };
}

function addOrderFinished(state: FoundationState, command: OrderStockCommand, quantity: number,
  unitCost: number, source: 'order' | 'finished_return'): FoundationState {
  const item = requireOwned(state.orderItems.find(row => row.id === command.orderItemId), state.user_id, 'Order item');
  requireValid(validId(item.product_id!), 'Order item has no valid product for finished return');
  const previous = finishedBalance(state, item.product_id!) ?? newFinishedBalance(state, item.product_id!, command.occurredAt);
  const nextQuantity = previous.quantity + quantity;
  requireValid(Number.isSafeInteger(nextQuantity) && finiteNonnegative(unitCost), 'Finished return quantity or cost overflow');
  const average = (previous.quantity * previous.average_unit_cost + quantity * unitCost) / nextQuantity;
  requireValid(finiteNonnegative(average), 'Finished average cost overflow');
  const balance = { ...previous, quantity: nextQuantity, average_unit_cost: average, revision: previous.revision + 1 };
  return { ...state, finishedBalances: replaceBalance(state, balance), finishedMovements: [...state.finishedMovements,
    finishedMovement(state, command, item.product_id!, source, quantity, unitCost, nextQuantity, item.id, null)] };
}

/** Preproduction cancellation restores only the reserve at its original actual basis. */
export function releaseReservedOrderItem(state: FoundationState, command: OrderStockCommand): FoundationState {
  if (state.finishedMovements.some(row => row.event_key === command.id)) return state;
  const item = requireOwned(state.orderItems.find(row => row.id === command.orderItemId), state.user_id, 'Order item');
  const reserved = item.reserved_quantity ?? Math.max(0, item.fulfilled_quantity - item.production_quantity);
  const fulfilled = state.finishedMovements.some(row => row.order_item_id === item.id
    && row.event_key.endsWith(`:fulfill:${item.id}`));
  if (item.production_quantity > 0 || fulfilled || reserved === 0) return state;
  const quantity = reserved - (item.returned_quantity ?? 0);
  requireValid(Number.isSafeInteger(quantity) && quantity >= 0, 'Invalid reserved quantity');
  let next = state;
  if (quantity > 0) next = addOrderFinished(state, command, quantity, allocatedCost(state, item) / reserved, 'order');
  const returned = item.returned_quantity ?? 0;
  return { ...next, orderItems: next.orderItems.map(row => row.id === item.id
    ? { ...row, fulfilled_quantity: returned, reserved_quantity: returned } : row) };
}

/** Returning good finished units is an explicit fact, independent from order cancellation. */
export function returnFinishedOrderItem(state: FoundationState, command: OrderStockCommand & { quantity: number }): FoundationState {
  requireValid(validId(command.id) && Number.isFinite(Date.parse(command.occurredAt)), 'Invalid return command');
  const item = requireOwned(state.orderItems.find(row => row.id === command.orderItemId), state.user_id, 'Order item');
  const previousMovement = state.finishedMovements.find(row => row.event_key === command.id);
  if (previousMovement) {
    requireOwned(previousMovement, state.user_id, 'Finished return');
    requireValid(previousMovement.source === 'finished_return' && previousMovement.order_item_id === command.orderItemId
      && previousMovement.delta_quantity === command.quantity, 'Finished return event conflict');
    return state;
  }
  requireValid(positiveInteger(command.quantity) && command.quantity <= item.fulfilled_quantity - (item.returned_quantity ?? 0),
    'Return quantity exceeds fulfilled quantity');
  const next = addOrderFinished(state, command, command.quantity, allocatedCost(state, item) / item.fulfilled_quantity, 'finished_return');
  return { ...next, orderItems: next.orderItems.map(row => row.id === item.id
    ? { ...row, returned_quantity: (row.returned_quantity ?? 0) + command.quantity } : row) };
}

/** Deterministic state transition; callers must commit the returned state atomically. */
export function applyInventoryCommand(state: FoundationState, command: InventoryCommand): FoundationState {
  requireValid(state.version === 1 && validId(state.user_id) && validId(command.id) &&
    Number.isFinite(Date.parse(command.occurredAt)), 'Invalid state or inventory command');

  if (command.kind === 'saveManufacturer') {
    requireValid(validId(command.entityId) && validId(command.name), 'Invalid manufacturer');
    const previous = state.manufacturers.find(item => item.id === command.entityId);
    if (previous) assertScope(state.user_id, previous.user_id);
    if (previous?.name === command.name.trim()) return state;
    const next = { id: command.entityId, user_id: state.user_id,
      created_at: previous?.created_at ?? command.occurredAt, name: command.name.trim() };
    return { ...state, manufacturers: previous
      ? state.manufacturers.map(item => item.id === next.id ? next : item)
      : [...state.manufacturers, next] };
  }

  if (command.kind === 'saveMaterialType') {
    requireValid(validId(command.entityId) && validId(command.name) &&
      (command.difficultyId === null || validId(command.difficultyId)), 'Invalid material type');
    const previous = state.materialTypes.find(item => item.id === command.entityId);
    if (previous) assertScope(state.user_id, previous.user_id);
    if (previous?.name === command.name.trim() && previous.difficulty_id === command.difficultyId) return state;
    const next = { id: command.entityId, user_id: state.user_id,
      created_at: previous?.created_at ?? command.occurredAt, name: command.name.trim(),
      difficulty_id: command.difficultyId };
    return { ...state, materialTypes: previous
      ? state.materialTypes.map(item => item.id === next.id ? next : item)
      : [...state.materialTypes, next] };
  }

  if (command.kind === 'saveMaterialLine') {
    requireValid(validId(command.entityId) && validId(command.name), 'Invalid material line');
    if (command.manufacturerId !== null) requireOwned(
      state.manufacturers.find(item => item.id === command.manufacturerId), state.user_id, 'Manufacturer');
    if (command.materialTypeId !== null) requireOwned(
      state.materialTypes.find(item => item.id === command.materialTypeId), state.user_id, 'Material type');
    const previous = state.materialLines.find(item => item.id === command.entityId);
    if (previous) assertScope(state.user_id, previous.user_id);
    if (previous?.name === command.name.trim() && previous.manufacturer_id === command.manufacturerId &&
      previous.material_type_id === command.materialTypeId) return state;
    const next = { id: command.entityId, user_id: state.user_id,
      created_at: previous?.created_at ?? command.occurredAt, name: command.name.trim(),
      manufacturer_id: command.manufacturerId, material_type_id: command.materialTypeId };
    return { ...state, materialLines: previous
      ? state.materialLines.map(item => item.id === next.id ? next : item)
      : [...state.materialLines, next] };
  }

  if (command.kind === 'saveVariant') {
    requireValid(validId(command.entityId) && validId(command.name) && validId(command.color), 'Invalid variant');
    if (command.materialLineId !== null) requireOwned(
      state.materialLines.find(item => item.id === command.materialLineId), state.user_id, 'Material line');
    const previous = state.variants.find(item => item.id === command.entityId);
    if (previous) assertScope(state.user_id, previous.user_id);
    if (previous?.name === command.name.trim() && previous.color === command.color &&
      previous.material_line_id === command.materialLineId) return state;
    const next: FilamentVariant = { id: command.entityId, user_id: state.user_id,
      created_at: previous?.created_at ?? command.occurredAt, material_line_id: command.materialLineId,
      legacy_filament_id: previous?.legacy_filament_id ?? null, name: command.name.trim(),
      color: command.color, stock_g: previous?.stock_g ?? 0,
      average_cost_per_g: previous?.average_cost_per_g ?? 0, revision: previous?.revision ?? 0 };
    return { ...state, variants: previous
      ? state.variants.map(item => item.id === next.id ? next : item)
      : [...state.variants, next] };
  }

  if (alreadyApplied(state, command)) return state;

  if (command.kind === 'purchase') {
    requireValid(validId(command.variantId) && Number.isFinite(command.weightG) && command.weightG > 0 &&
      finiteNonnegative(command.totalPrice), 'Invalid filament purchase');
    const variant = requireOwned(state.variants.find(item => item.id === command.variantId), state.user_id, 'Filament variant');
    const weightMicros = sixPlaceUnits(command.weightG, 'Purchase weight');
    requireValid(weightMicros > 0, 'Purchase weight rounds to zero');
    const previousStockMicros = sixPlaceUnits(variant.stock_g, 'Filament stock');
    const stockMicros = previousStockMicros + weightMicros;
    requireValid(Number.isSafeInteger(stockMicros), 'Filament stock overflow');
    const weight = sixPlaces(weightMicros);
    const stock = sixPlaces(stockMicros);
    const totalPrice = sixPlaces(sixPlaceUnits(command.totalPrice, 'Purchase total price'));
    const average = (sixPlaces(previousStockMicros) * variant.average_cost_per_g + totalPrice) / stock;
    requireValid(finiteNonnegative(average), 'Filament average cost overflow');
    const updated = { ...variant, stock_g: stock, average_cost_per_g: average, revision: variant.revision + 1 };
    const movement: FilamentMovement = { id: childId(command.id, 'purchase-movement'),
      user_id: state.user_id, created_at: command.occurredAt, variant_id: variant.id,
      event_key: command.id, source: 'purchase', source_id: command.id, delta_g: weight,
      unit_cost_per_g: totalPrice / weight, balance_after_g: stock };
    return { ...state, variants: state.variants.map(item => item.id === variant.id ? updated : item),
      purchases: [...state.purchases, { id: childId(command.id, 'purchase'), user_id: state.user_id,
        created_at: command.occurredAt, variant_id: variant.id, weight_g: weight,
        total_price: totalPrice, purchased_at: command.occurredAt, event_key: command.id }],
      filamentMovements: [...state.filamentMovements, movement] };
  }

  if (command.kind === 'produce') {
    requireValid(validId(command.productId), 'Invalid product ID');
    const production = produceBatch(state, command, command.productId, command.quantity, command.recipe, null);
    const previous = finishedBalance(state, command.productId) ?? newFinishedBalance(state, command.productId, command.occurredAt);
    const quantity = previous.quantity + command.quantity;
    requireValid(Number.isSafeInteger(quantity), 'Finished stock overflow');
    const average = (previous.quantity * previous.average_unit_cost + command.quantity * production.unitCost) / quantity;
    const updated = { ...previous, quantity, average_unit_cost: average, revision: previous.revision + 1 };
    return { ...state, variants: production.variants,
      filamentMovements: [...state.filamentMovements, ...production.movements],
      deficits: [...state.deficits, ...production.deficits],
      productionEvents: [...state.productionEvents, production.event],
      finishedBalances: replaceBalance(state, updated),
      finishedMovements: [...state.finishedMovements, finishedMovement(state, command, command.productId,
        'production', command.quantity, production.unitCost, quantity, null, production.event.id)] };
  }

  if (command.kind === 'adjustFinished') {
    requireValid(validId(command.productId) && Number.isSafeInteger(command.quantity) && command.quantity >= 0 &&
      finiteNonnegative(command.unitCost), 'Invalid finished stock adjustment');
    const previous = finishedBalance(state, command.productId);
    if (!previous) throw new InventoryOperationError('not_found', 'Finished stock balance was not found');
    const delta = command.quantity - previous.quantity;
    if (delta === 0) return state;
    const average = delta > 0
      ? (previous.quantity * previous.average_unit_cost + delta * command.unitCost) / command.quantity
      : previous.average_unit_cost;
    requireValid(finiteNonnegative(average), 'Finished average cost overflow');
    const updated = { ...previous, quantity: command.quantity, average_unit_cost: average,
      revision: previous.revision + 1 };
    return { ...state, finishedBalances: replaceBalance(state, updated),
      finishedMovements: [...state.finishedMovements, finishedMovement(state, command, command.productId,
        'manual_adjustment', delta, delta > 0 ? command.unitCost : previous.average_unit_cost,
        command.quantity, null, null)] };
  }

  const orderItem = requireOwned(state.orderItems.find(item => item.id === command.orderItemId), state.user_id, 'Order item');
  requireValid(!orderItem.archived, 'Archived item cannot be fulfilled');
  const remaining = orderItem.quantity - orderItem.fulfilled_quantity;
  requireValid(Number.isSafeInteger(remaining) && remaining >= 0, 'Invalid fulfillment balance');
  if (remaining === 0) {
    if (orderItem.production_quantity > 0 || !orderItem.product_id || state.finishedMovements.some(row => row.order_item_id === orderItem.id
      && row.event_key.endsWith(`:fulfill:${orderItem.id}`))) return state;
    const balance = finishedBalance(state, orderItem.product_id);
    return { ...state, finishedMovements: [...state.finishedMovements, finishedMovement(state, command,
      orderItem.product_id, 'order', 0, orderItem.unit_cost, balance?.quantity ?? 0, orderItem.id, null)] };
  }
  const balance = orderItem.product_id ? finishedBalance(state, orderItem.product_id) : undefined;
  const fromStock = Math.min(balance?.quantity ?? 0, remaining);
  const toProduce = remaining - fromStock;
  let production: ProductionResult | null = null;
  if (toProduce > 0) production = produceBatch(state, command, orderItem.product_id, toProduce, command.recipe, orderItem.id);
  const addedCost = fromStock * (balance?.average_unit_cost ?? 0) + toProduce * (production?.unitCost ?? 0);
  const totalCost = allocatedCost(state, orderItem) + addedCost;
  requireValid(finiteNonnegative(totalCost), 'Order item cost overflow');
  const reserved = (orderItem.reserved_quantity ?? Math.max(0, orderItem.fulfilled_quantity - orderItem.production_quantity)) + fromStock;
  const produced = orderItem.production_quantity + toProduce;
  const provenance: OrderItem['cost_provenance'] = reserved > 0 && produced > 0 ? 'mixed' : reserved > 0 ? 'finished_stock' : 'production';
  const updatedOrderItem = { ...orderItem, total_cost: totalCost,
    unit_cost: totalCost / orderItem.quantity, cost_provenance: provenance,
    fulfilled_quantity: orderItem.quantity, production_quantity: produced, reserved_quantity: reserved,
    returned_quantity: orderItem.returned_quantity ?? 0 };
  const updatedBalance = balance && fromStock > 0
    ? { ...balance, quantity: balance.quantity - fromStock, revision: balance.revision + 1 } : null;
  const stockMovement = updatedBalance
    ? finishedMovement(state, command, orderItem.product_id!, 'order', -fromStock,
      balance!.average_unit_cost, updatedBalance.quantity, orderItem.id, null) : null;
  return { ...state,
    variants: production?.variants ?? state.variants,
    filamentMovements: production ? [...state.filamentMovements, ...production.movements] : state.filamentMovements,
    deficits: production ? [...state.deficits, ...production.deficits] : state.deficits,
    productionEvents: production ? [...state.productionEvents, production.event] : state.productionEvents,
    finishedBalances: updatedBalance ? replaceBalance(state, updatedBalance) : state.finishedBalances,
    finishedMovements: stockMovement ? [...state.finishedMovements, stockMovement] : state.finishedMovements,
    orderItems: state.orderItems.map(item => item.id === orderItem.id ? updatedOrderItem : item),
  };
}

/** Copies legacy on-hand balances once; historical product prices and costs remain untouched. */
export function bootstrapInventoryState(state: FoundationState, filaments: Filament[],
  products: SavedCalculation[]): FoundationState {
  requireValid(state.version === 1 && validId(state.user_id), 'Invalid foundation state');
  let next = state;
  for (const filament of filaments) {
    assertScope(state.user_id, filament.user_id);
    requireValid(validId(filament.id) && validId(filament.name) && finiteNonnegative(filament.weight_g) &&
      finiteNonnegative(filament.price), 'Invalid legacy filament');
    if (next.variants.some(variant => variant.id === filament.id)) continue;
    const stockMicros = sixPlaceUnits(filament.weight_g, 'Legacy filament weight');
    requireValid(filament.weight_g === 0 || stockMicros > 0, 'Legacy filament weight rounds to zero');
    const stock = sixPlaces(stockMicros);
    const average = filament.weight_g > 0 ? filament.price / filament.weight_g : 0;
    const createdAt = filament.created_at ?? openingTime;
    const variant: FilamentVariant = { id: filament.id, user_id: state.user_id,
      created_at: createdAt, material_line_id: null, legacy_filament_id: filament.id,
      name: filament.name, color: filament.color ?? '#ffffff', stock_g: stock,
      average_cost_per_g: average, revision: 0 };
    const movement: FilamentMovement | null = stock > 0 ? {
      id: childId(filament.id, 'opening-filament'), user_id: state.user_id, created_at: createdAt,
      variant_id: filament.id, event_key: `opening:filament:${filament.id}`, source: 'opening_balance',
      source_id: filament.id, delta_g: stock, unit_cost_per_g: average,
      balance_after_g: stock,
    } : null;
    next = { ...next, variants: [...next.variants, variant],
      filamentMovements: movement ? [...next.filamentMovements, movement] : next.filamentMovements };
  }
  for (const product of products) {
    assertScope(state.user_id, product.user_id);
    requireValid(validId(product.id) && finiteNonnegative(product.base_cost) &&
      positiveInteger(product.quantity) && Number.isSafeInteger(product.stock_quantity ?? 0) &&
      (product.stock_quantity ?? 0) >= 0, 'Invalid legacy product');
    if (next.finishedBalances.some(balance => balance.source_product_id === product.id)) continue;
    const stock = product.stock_quantity ?? 0;
    const unitCost = product.base_cost / product.quantity;
    const createdAt = product.created_at ?? openingTime;
    const balance: FinishedStockBalance = { id: product.id,
      user_id: state.user_id, created_at: createdAt, product_id: product.id,
      source_product_id: product.id, quantity: stock, average_unit_cost: unitCost, revision: 0 };
    const movement: FinishedStockMovement | null = stock > 0 ? {
      id: childId(product.id, 'opening-finished'), user_id: state.user_id, created_at: createdAt,
      product_id: product.id, source_product_id: product.id, order_item_id: null, production_event_id: null,
      event_key: `opening:finished:${product.id}`, source: 'opening_balance',
      delta_quantity: stock, unit_cost: unitCost, balance_after: stock,
    } : null;
    next = { ...next, finishedBalances: [...next.finishedBalances, balance],
      finishedMovements: movement ? [...next.finishedMovements, movement] : next.finishedMovements };
  }
  return next;
}
