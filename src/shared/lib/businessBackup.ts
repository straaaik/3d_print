import type { FoundationState } from '../types/foundation';
import type { DataBackupSnapshot } from './dataBackup';
import { isFoundationState } from './foundationStorage';
import { isCalculationDraft } from './calculationDraft';
import { round2 } from './formulas';

type RecordValue = Record<string, unknown>;
const object = (value: unknown): value is RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const id = (value: unknown): value is string => text(value) && value.length > 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nonnegative = (value: unknown): value is number => finite(value) && value >= 0;
const integer = (value: unknown): value is number => nonnegative(value) && Number.isSafeInteger(value);
const date = (value: unknown) => text(value) && value.trim() !== '' && Number.isFinite(Date.parse(value));
function requireValid(condition: unknown, path: string): asserts condition {
  if (!condition) throw new Error(`Неверные данные резервной копии: ${path}.`);
}

/** Recovery payloads stay opaque to replay policy, but cannot hide a foreign owner,
 * non-finite number, non-JSON object or recursive reference inside a snapshot. */
export function validateBackupOwnership(value: unknown, ownerId: string, path = 'business', ancestors = new Set<object>()): void {
  if (value === null || text(value) || typeof value === 'boolean' || finite(value)) return;
  requireValid(typeof value === 'object' && !ancestors.has(value!), path);
  requireValid(Array.isArray(value) || (object(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))), path);
  ancestors.add(value!);
  if (object(value) && value.user_id !== undefined) {
    requireValid(value.user_id === ownerId, `${path}: другой владелец (owner)`);
  }
  for (const [key, child] of Object.entries(value!)) {
    if (child === undefined && !Array.isArray(value)) continue; // Optional fields disappear in JSON exports.
    validateBackupOwnership(child, ownerId, `${path}.${key}`, ancestors);
  }
  ancestors.delete(value!);
}

const requiredResultNumbers = ['materialCost', 'electricityCost', 'depreciationCost', 'laborCost', 'defectCost',
  'customCostsTotal', 'customCostsExpenseTotal', 'customCostsProfitTotal', 'customCostsNoMarkupTotal',
  'printDirectCost', 'printBaseSubtotal', 'printFinalPrice', 'laborMinutesPerUnit', 'effectiveLaborMinutes', 'laborInCost',
  'appliedMarkupPercent', 'urgencyPercent', 'urgencyAmount', 'urgencyCost', 'discountPercent', 'discountAmount', 'discountTotal',
  'baseRetailPrice', 'priceWithUrgency', 'minOrderPrice', 'calculatedFinalPrice', 'computedFinalPrice', 'priceAdjustment',
  'totalBaseCost', 'totalFinalPrice', 'baseCostPerUnit', 'finalPricePerUnit', 'profitTotal', 'plannedProfit',
  'profitPerUnit', 'marginPercent', 'markupPercent'] as const;

function customCosts(value: unknown, path: string) {
  requireValid(Array.isArray(value), path);
  const ids = new Set<string>();
  for (const [index, row] of value.entries()) {
    requireValid(object(row) && id(row.id) && text(row.name) && finite(row.amount) && typeof row.isEnabled === 'boolean'
      && (row.isPerUnit === undefined || typeof row.isPerUnit === 'boolean')
      && (row.target === undefined || row.target === 'cost' || row.target === 'profit')
      && (row.mode === undefined || ['profit_only', 'cost_with_markup', 'cost_no_markup'].includes(String(row.mode)))
      && !ids.has(row.id), `${path}[${index}]`);
    ids.add(row.id);
  }
}

function calculation(value: unknown, path: string) {
  requireValid(object(value) && object(value.inputs) && object(value.result), path);
  const { inputs, result } = value;
  requireValid(['weightG', 'hours', 'minutes', 'laborMinutes'].every(key => nonnegative(inputs[key]))
    && integer(inputs.quantity) && inputs.quantity > 0, `${path}.inputs`);
  for (const key of ['days', 'laborRatePerHour', 'markupPercent', 'defectPercent', 'discountPercent', 'discountAmount', 'urgencyPercent', 'urgencyAmount']) {
    requireValid(inputs[key] === undefined || nonnegative(inputs[key]), `${path}.inputs.${key}`);
  }
  requireValid(inputs.agreedPrice === undefined || inputs.agreedPrice === null || nonnegative(inputs.agreedPrice), `${path}.inputs.agreedPrice`);
  for (const key of ['isOwnerLabor', 'isLaborPerUnit']) requireValid(inputs[key] === undefined || typeof inputs[key] === 'boolean', `${path}.inputs.${key}`);
  for (const key of ['filament', 'printer', 'settings']) requireValid(inputs[key] === null || object(inputs[key]), `${path}.inputs.${key}`);
  if (inputs.filament !== null) {
    requireValid(object(inputs.filament) && id(inputs.filament.id) && text(inputs.filament.name)
      && nonnegative(inputs.filament.weight_g) && nonnegative(inputs.filament.price), `${path}.inputs.filament`);
  }
  if (inputs.printer !== null) {
    requireValid(object(inputs.printer) && id(inputs.printer.id) && text(inputs.printer.name)
      && ['power_w', 'price', 'lifespan_hours'].every(key => nonnegative((inputs.printer as RecordValue)[key])), `${path}.inputs.printer`);
  }
  if (inputs.settings !== null) {
    requireValid(object(inputs.settings) && text(inputs.settings.currency)
      && ['electricity_rate', 'labor_rate_per_hour', 'labor_time_minutes', 'default_markup_percent', 'default_defect_percent']
        .every(key => nonnegative((inputs.settings as RecordValue)[key]))
      && (inputs.settings.default_printer_id === null || id(inputs.settings.default_printer_id)), `${path}.inputs.settings`);
  }
  if (inputs.customCostItems !== undefined) customCosts(inputs.customCostItems, `${path}.inputs.customCostItems`);
  requireValid(requiredResultNumbers.every(key => finite(result[key]))
    && ['isOwnerLabor', 'isLaborPerUnit', 'isMinOrderApplied', 'isBelowCost'].every(key => typeof result[key] === 'boolean')
    && (result.agreedPrice === null || nonnegative(result.agreedPrice))
    && (result.materialDifficulty === null || object(result.materialDifficulty))
    && Array.isArray(result.customCostsBreakdown), `${path}.result`);
  if (result.materialDifficulty !== null) {
    const difficulty = result.materialDifficulty as RecordValue;
    requireValid(['id', 'name', 'shortLabel', 'description', 'badgeColor', 'textColor', 'borderColor', 'icon'].every(key => text(difficulty[key]))
      && nonnegative(difficulty.defaultMarkup) && Array.isArray(difficulty.keywords) && difficulty.keywords.every(text), `${path}.result.materialDifficulty`);
  }
  for (const [index, row] of result.customCostsBreakdown.entries()) {
    requireValid(object(row) && id(row.id) && text(row.name) && finite(row.amount) && finite(row.totalAmount)
      && typeof row.isPerUnit === 'boolean' && ['cost', 'profit'].includes(String(row.target))
      && ['profit_only', 'cost_with_markup', 'cost_no_markup'].includes(String(row.mode)), `${path}.result.customCostsBreakdown[${index}]`);
  }
  requireValid(Math.abs(result.baseCostPerUnit as number - round2((result.totalBaseCost as number) / inputs.quantity)) < 0.011
    && Math.abs(result.finalPricePerUnit as number - round2((result.totalFinalPrice as number) / inputs.quantity)) < 0.011, `${path}.result totals`);
}

function product(value: unknown, path: string) {
  requireValid(object(value) && id(value.id) && ['name', 'filament_name', 'printer_name'].every(key => text(value[key]))
    && ['weight_g', 'hours', 'minutes', 'base_cost', 'final_price'].every(key => nonnegative(value[key]))
    && integer(value.quantity) && value.quantity > 0, path);
  if (value.stock_quantity !== undefined) requireValid(integer(value.stock_quantity), `${path}.stock_quantity`);
  if (value.type !== undefined) requireValid(value.type === 'single' || value.type === 'assembly', `${path}.type`);
  if (value.tags !== undefined) requireValid(Array.isArray(value.tags) && value.tags.every(text), `${path}.tags`);
  if (value.custom_cost_items !== undefined) customCosts(value.custom_cost_items, `${path}.custom_cost_items`);
  for (const key of ['assembly_parts', 'assembly_hardware', 'assembly_electronics']) {
    if (value[key] === undefined) continue;
    requireValid(Array.isArray(value[key]), `${path}.${key}`);
    for (const [index, row] of value[key].entries()) {
      requireValid(object(row) && text(row.name) && nonnegative(row.quantity)
        && (key === 'assembly_parts'
          ? integer(row.quantity) && row.quantity > 0 && ['weight_g', 'hours', 'minutes', 'base_cost', 'final_price'].every(field => nonnegative(row[field]))
          : id(row.id) && ['cost_per_unit', 'price_per_unit'].every(field => nonnegative(row[field]))), `${path}.${key}[${index}]`);
    }
  }
  if (value.calculation_snapshot !== undefined && value.calculation_snapshot !== null) {
    requireValid(object(value.calculation_snapshot) && value.calculation_snapshot.version === 1, `${path}.calculation_snapshot`);
    calculation(value.calculation_snapshot, `${path}.calculation_snapshot`);
  }
}

function orderSnapshot(value: unknown, path: string) {
  requireValid(object(value), path);
  for (const key of ['id', 'date', 'title', 'client', 'contact', 'deadline', 'status', 'notes', 'created_at']) {
    requireValid(value[key] === undefined || text(value[key]), `${path}.${key}`);
  }
  for (const key of ['amount', 'cost', 'payment']) requireValid(value[key] === undefined || finite(value[key]), `${path}.${key}`);
  for (const key of ['quantity', 'order_revision']) requireValid(value[key] === undefined || integer(value[key])
    && (key !== 'quantity' || (value[key] as number) > 0), `${path}.${key}`);
  requireValid(value.type === undefined || value.type === 'income' || value.type === 'expense', `${path}.type`);
  requireValid(value.product_id === undefined || value.product_id === null || id(value.product_id), `${path}.product_id`);
  requireValid(value.order_archived === undefined || typeof value.order_archived === 'boolean', `${path}.order_archived`);
  for (const key of ['payments', 'contacts', 'cost_items']) {
    if (value[key] === undefined) continue;
    requireValid(Array.isArray(value[key]), `${path}.${key}`);
    for (const row of value[key]) {
      if (key === 'payments' && finite(row)) continue;
      requireValid(object(row) && (key === 'payments' ? id(row.id) && finite(row.amount) && text(row.date)
        : key === 'contacts' ? text(row.type) && text(row.value) && (row.label === undefined || text(row.label))
          : text(row.category) && finite(row.amount)), `${path}.${key}`);
    }
  }
}

export function parseBusinessBackup(value: unknown, ownerId?: string): FoundationState {
  requireValid(object(value) && id(value.user_id), 'business.user_id');
  const owner = ownerId ?? value.user_id;
  requireValid(value.user_id === owner, 'business: другой владелец (owner)');
  validateBackupOwnership(value, owner);
  requireValid(isFoundationState(value, owner), 'business FoundationState');
  const state = value;
  const products = new Set((state.legacyProducts ?? []).map(row => row.id));
  const orders = new Map((state.legacyOrders ?? []).map(row => [row.id, row]));
  const sets = {
    manufacturers: new Set(state.manufacturers.map(row => row.id)), materialTypes: new Set(state.materialTypes.map(row => row.id)),
    materialLines: new Set(state.materialLines.map(row => row.id)), variants: new Set(state.variants.map(row => row.id)),
    projects: new Set(state.projects.map(row => row.id)), orderItems: new Set(state.orderItems.map(row => row.id)),
    productionEvents: new Set(state.productionEvents.map(row => row.id)),
  };
  const reference = (value: unknown, ids: Set<string>, path: string, nullable = false) => {
    requireValid((nullable && value === null) || (id(value) && ids.has(value)), `${path}: отсутствующая ссылка`);
  };
  const recipe = (value: unknown, path: string) => {
    requireValid(object(value) && value.version === 1 && Array.isArray(value.materials)
      && nonnegative(value.non_material_unit_cost) && (value.product_snapshot === null || object(value.product_snapshot)), path);
    for (const [index, material] of value.materials.entries()) {
      requireValid(object(material) && nonnegative(material.grams_per_unit) && Math.round(material.grams_per_unit * 1e6) > 0, `${path}.materials[${index}]`);
      reference(material.variant_id, sets.variants, `${path}.materials[${index}].variant_id`);
    }
    if (value.product_snapshot !== null) product(value.product_snapshot, `${path}.product_snapshot`);
  };
  for (const key of ['purchases', 'productionEvents', 'finishedMovements', 'filamentMovements', 'deficits'] as const) {
    const unique = new Set<string>();
    for (const row of state[key]) {
      const event = 'variant_id' in row ? JSON.stringify([row.event_key, row.variant_id]) : row.event_key;
      requireValid(id(row.event_key) && !unique.has(event), `${key}: повтор события`);
      unique.add(event);
    }
  }
  for (const [key, rows] of Object.entries(state)) {
    if (!Array.isArray(rows) || ['legacyOrders', 'legacyProducts', 'pendingInventory'].includes(key) || key.endsWith('Backups')) continue;
    for (const row of rows) if (object(row) && row.created_at !== undefined) requireValid(date(row.created_at), `business.${key}.created_at`);
  }
  for (const row of state.materialTypes) requireValid(row.difficulty_id === null || id(row.difficulty_id), 'materialTypes.difficulty_id');
  for (const row of state.materialLines) {
    reference(row.manufacturer_id, sets.manufacturers, 'materialLines.manufacturer_id', true);
    reference(row.material_type_id, sets.materialTypes, 'materialLines.material_type_id', true);
  }
  for (const row of state.variants) {
    reference(row.material_line_id, sets.materialLines, 'variants.material_line_id', true);
    requireValid(text(row.color) && (row.legacy_filament_id === null || id(row.legacy_filament_id)), 'variants');
  }
  for (const row of state.purchases) {
    reference(row.variant_id, sets.variants, 'purchases.variant_id');
    requireValid(id(row.event_key) && date(row.purchased_at), 'purchases');
  }
  const sources = new Set(['purchase', 'production', 'order', 'manual_adjustment', 'opening_balance', 'finished_return']);
  for (const row of state.filamentMovements) {
    reference(row.variant_id, sets.variants, 'filamentMovements.variant_id');
    requireValid(id(row.event_key) && id(row.source_id) && sources.has(row.source), 'filamentMovements');
    if (row.source === 'production') reference(row.source_id, sets.productionEvents, 'filamentMovements.source_id');
    if (row.source === 'purchase') requireValid(state.purchases.some(purchase => purchase.event_key === row.event_key
      && purchase.variant_id === row.variant_id), 'filamentMovements purchase reference');
  }
  for (const row of state.deficits) {
    reference(row.variant_id, sets.variants, 'deficits.variant_id');
    reference(row.source_id, sets.productionEvents, 'deficits.source_id');
    requireValid(id(row.event_key), 'deficits.event_key');
  }
  for (const row of state.projects) {
    requireValid(integer(row.revision) && ['discount_percent', 'discount_amount', 'urgency_percent', 'urgency_amount']
      .every(key => nonnegative(row[key as keyof typeof row])) && (row.agreed_price === null || nonnegative(row.agreed_price)), 'projects');
  }
  for (const row of state.calculationItems) {
    reference(row.project_id, sets.projects, 'calculationItems.project_id');
    reference(row.product_id, products, 'calculationItems.product_id', true);
    requireValid(integer(row.sort_order), 'calculationItems.sort_order');
    calculation(row, `calculationItems.${row.id}`); recipe(row.recipe, `calculationItems.${row.id}.recipe`);
    requireValid(row.quantity === row.inputs.quantity, 'calculationItems.quantity');
    requireValid(row.recipe.product_snapshot === null || row.recipe.product_snapshot.id === row.product_id, 'calculationItems recipe product');
  }
  for (const row of state.legacyProducts ?? []) product(row, `legacyProducts.${row.id}`);
  for (const row of state.productionEvents) {
    reference(row.product_id, products, 'productionEvents.product_id', true);
    reference(row.order_item_id, sets.orderItems, 'productionEvents.order_item_id', true);
    requireValid(id(row.event_key), 'productionEvents.event_key'); recipe(row.recipe_snapshot, `productionEvents.${row.id}.recipe_snapshot`);
    requireValid(row.recipe_snapshot.product_snapshot === null || row.recipe_snapshot.product_snapshot.id === row.product_id, 'productionEvents recipe product');
    if (row.order_item_id !== null) requireValid(state.orderItems.find(item => item.id === row.order_item_id)?.product_id === row.product_id,
      'productionEvents product/order item consistency');
  }
  const balanceProducts = new Set<string>();
  for (const row of state.finishedBalances) {
    reference(row.product_id, products, 'finishedBalances.product_id', true);
    requireValid(id(row.source_product_id) && !balanceProducts.has(row.source_product_id)
      && (row.product_id === null || row.product_id === row.source_product_id), 'finishedBalances.source_product_id');
    balanceProducts.add(row.source_product_id);
    const movements = state.finishedMovements.filter(movement => movement.source_product_id === row.source_product_id);
    if (movements.some(movement => movement.source === 'opening_balance')) requireValid(row.quantity === movements.reduce((sum, movement) => sum + movement.delta_quantity, 0), 'finishedBalances ledger quantity');
  }
  for (const row of state.finishedMovements) {
    reference(row.product_id, products, 'finishedMovements.product_id', true);
    reference(row.order_item_id, sets.orderItems, 'finishedMovements.order_item_id', true);
    reference(row.production_event_id, sets.productionEvents, 'finishedMovements.production_event_id', true);
    requireValid(id(row.source_product_id) && id(row.event_key) && sources.has(row.source)
      && (row.product_id === null || row.product_id === row.source_product_id), 'finishedMovements');
    if (row.production_event_id !== null) requireValid(state.productionEvents.find(event => event.id === row.production_event_id)?.product_id === row.product_id,
      'finishedMovements production product consistency');
    if (row.order_item_id !== null) requireValid(state.orderItems.find(item => item.id === row.order_item_id)?.product_id === row.product_id,
      'finishedMovements order product consistency');
    if (row.source === 'finished_return') requireValid(row.delta_quantity > 0 && row.order_item_id !== null, 'finishedMovements return');
  }
  for (const row of state.orderItems) {
    reference(row.order_id, new Set(orders.keys()), 'orderItems.order_id', true);
    reference(row.product_id, products, 'orderItems.product_id', true);
    requireValid(id(row.source_order_id) && (row.order_id === null || row.order_id === row.source_order_id)
      && ['legacy', 'estimate', 'finished_stock', 'production', 'mixed'].includes(row.cost_provenance)
      && (row.legacy_key === null || id(row.legacy_key)), 'orderItems');
    orderSnapshot(row.snapshot.order, `orderItems.${row.id}.snapshot.order`);
    requireValid(row.snapshot.calculation === null || object(row.snapshot.calculation), 'orderItems.snapshot.calculation');
    if (row.snapshot.calculation !== null) calculation(row.snapshot.calculation, `orderItems.${row.id}.snapshot.calculation`);
    if (row.snapshot.recipe !== null) recipe(row.snapshot.recipe, `orderItems.${row.id}.snapshot.recipe`);
    requireValid(row.snapshot.recipe?.product_snapshot == null || row.snapshot.recipe.product_snapshot.id === row.product_id, 'orderItems recipe product');
    const reserved = row.reserved_quantity ?? row.fulfilled_quantity - row.production_quantity;
    requireValid(row.fulfilled_quantity === row.production_quantity + reserved, 'orderItems physical counter allocation');
    const produced = state.productionEvents.filter(event => event.order_item_id === row.id).reduce((sum, event) => sum + event.quantity, 0);
    const returned = state.finishedMovements.filter(movement => movement.order_item_id === row.id && movement.source === 'finished_return')
      .reduce((sum, movement) => sum + movement.delta_quantity, 0);
    requireValid(produced === row.production_quantity, 'orderItems production counter');
    // Legacy SQL allocation bridge records order-level moves without an item FK.
    // Its historical reserved/returned counters cannot be reconstructed per item.
    if (row.cost_provenance !== 'legacy') {
      requireValid(returned === (row.returned_quantity ?? 0), 'orderItems returned counter');
      const allocated = -state.finishedMovements.filter(movement => movement.order_item_id === row.id && movement.source === 'order')
        .reduce((sum, movement) => sum + movement.delta_quantity, 0);
      requireValid(allocated === reserved, 'orderItems reserved counter');
    }
    requireValid(Math.abs(row.unit_cost * row.quantity - row.total_cost) < 0.011
      && Math.abs(row.unit_price * row.quantity - row.total_price) < 0.011, 'orderItems financial totals');
  }
  for (const variant of state.variants) {
    const movements = state.filamentMovements.filter(movement => movement.variant_id === variant.id);
    if (movements.some(movement => movement.source === 'opening_balance')) requireValid(Math.abs(variant.stock_g - movements.reduce((sum, movement) => sum + movement.delta_g, 0)) < 1e-6, 'variants ledger quantity');
  }
  for (const head of orders.values()) {
    orderSnapshot(head, `legacyOrders.${head.id}`);
    const active = state.orderItems.filter(item => item.order_id === head.id && !item.archived);
    if (head.type === 'income' && !head.order_archived && active.length > 0) {
      requireValid(Math.abs(head.cost - round2(active.reduce((sum, item) => sum + item.total_cost, 0))) < 0.011, 'orders head cost consistency');
    }
  }
  const recovery = value as unknown as RecordValue;
  for (const key of ['revision', 'generation', 'remoteInventoryRevision']) if (recovery[key] !== undefined) requireValid(integer(recovery[key]), `business.${key}`);
  if (recovery.inventoryCacheVersion !== undefined) requireValid(recovery.inventoryCacheVersion === 1, 'business.inventoryCacheVersion');
  const commands = (value: unknown, path: string) => {
    requireValid(Array.isArray(value), path);
    for (const row of value) requireValid(object(row) && id(row.id) && id(row.kind) && date(row.occurredAt)
      && (row.generation === undefined || integer(row.generation)), path);
  };
  if (recovery.pendingInventory !== undefined) commands(recovery.pendingInventory, 'business.pendingInventory');
  for (const key of ['orderConflictBackups', 'catalogConflictBackups', 'projectConflictBackups', 'maintenanceConflictBackups', 'maintenanceRecoveryBackups']) {
    if (recovery[key] === undefined) continue;
    requireValid(Array.isArray(recovery[key]), `business.${key}`);
    for (const row of recovery[key]) {
      requireValid(object(row) && date(row.occurredAt), `business.${key}`);
      if (key === 'projectConflictBackups') requireValid(id(row.projectId), `business.${key}.projectId`);
      if (row.commands !== undefined) commands(row.commands, `business.${key}.commands`);
    }
  }
  if (recovery.pendingMaintenance !== undefined) {
    const intent = recovery.pendingMaintenance;
    requireValid(object(intent) && id(intent.id) && date(intent.occurredAt) && integer(intent.expectedRevision)
      && integer(intent.generation) && object(intent.snapshot), 'business.pendingMaintenance');
  }
  return structuredClone(state);
}

function canonical(value: unknown): string {
  const sorted = (value: unknown): unknown => Array.isArray(value) ? value.map(sorted)
    : object(value) ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined)
      .map(key => [key, sorted(value[key])])) : value;
  return JSON.stringify(sorted(value));
}

/** Catalog stock is a projection. Heads and immutable templates must otherwise
 * agree with the complete canonical business snapshot, including archived IDs. */
export function validateBusinessBackupConsistency(business: FoundationState, snapshot: Pick<DataBackupSnapshot, 'orders' | 'savedCalculations'>): void {
  const heads = (rows: DataBackupSnapshot['orders']) => rows.map(row => {
    const head = { ...row }; delete head.items; return head;
  }).sort((a, b) => a.id.localeCompare(b.id));
  const products = (rows: DataBackupSnapshot['savedCalculations']) => rows.map(row => {
    const balance = business.finishedBalances.find(balance => balance.source_product_id === row.id);
    return balance ? { ...row, stock_quantity: balance.quantity } : row;
  }).sort((a, b) => a.id.localeCompare(b.id));
  for (const row of snapshot.savedCalculations) {
    const canonicalProduct = business.legacyProducts?.find(product => product.id === row.id);
    const balance = business.finishedBalances.find(balance => balance.source_product_id === row.id);
    if (balance && canonicalProduct) requireValid(row.stock_quantity === canonicalProduct.stock_quantity
      || row.stock_quantity === balance.quantity, 'savedCalculations stock projection consistency');
  }
  requireValid(canonical(heads(snapshot.orders)) === canonical(heads(business.legacyOrders ?? [])), 'orders/business head consistency');
  requireValid(canonical(products(snapshot.savedCalculations)) === canonical(products(business.legacyProducts ?? [])), 'savedCalculations/business catalog consistency');
}

export function validateBackupDraft(value: unknown, ownerId: string): void {
  validateBackupOwnership(value, ownerId, 'calculationDraft');
  requireValid(isCalculationDraft(value, ownerId), 'calculationDraft');
  requireValid(id(value.project.id) && integer(value.project.revision) && date(value.project.created_at), 'calculationDraft.project');
  for (const item of value.items) {
    if (item.productEditBaseline !== undefined) {
      requireValid(isCalculationDraft({ ...value, items: value.items.map(row => row.id === item.id
        ? { ...row, form: item.productEditBaseline!.form } : row) }, ownerId), 'calculationDraft.productEditBaseline.form');
    }
  }
}
