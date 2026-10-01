import type { Order } from '../types';
import type { CalculationItem, CalculationProject, FoundationState, OrderItemSnapshot } from '../types/foundation';
import { calculatePrintCost, calculateProjectTotals, type ProjectTotalsResult } from './formulas';
import { InventoryOperationError } from './inventoryEngine';

export interface ProjectCommand {
  kind: 'saveProject';
  id: string;
  occurredAt: string;
  project: CalculationProject;
  items: CalculationItem[];
}
export interface CalculationProjectOrderDraftItem {
  calculation_item_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  unit_price: number;
  total_price: number;
  cost_provenance: 'estimate';
  snapshot: OrderItemSnapshot;
}
export interface CalculationProjectOrderDraft {
  projectId: string;
  projectRevision: number;
  order: Partial<Order>;
  items: CalculationProjectOrderDraftItem[];
  totals: ProjectTotalsResult;
}
const validId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const integer = (value: unknown): value is number => nonnegative(value) && Number.isSafeInteger(value);
const timestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

function requireValid(condition: boolean, message: string): asserts condition {
  if (!condition) throw new InventoryOperationError('invalid', message);
}
function requireOwner(owner: string, expected: string): void {
  if (owner !== expected) throw new InventoryOperationError('foreign_reference', 'Calculation belongs to another user');
}

/** Reject bad numeric snapshots before JSON persistence can silently convert them to null. */
function validateSnapshot(value: unknown, owner: string): void {
  if (typeof value === 'number') requireValid(Number.isFinite(value), 'Calculation snapshot contains a non-finite number');
  if (!value || typeof value !== 'object') return;
  if ('user_id' in value && value.user_id !== undefined) requireOwner(String(value.user_id), owner);
  for (const field of Object.values(value)) validateSnapshot(field, owner);
}

function validateProject(project: CalculationProject, owner: string): void {
  requireValid(Boolean(project) && validId(project.id) && timestamp(project.created_at)
    && typeof project.name === 'string' && Boolean(project.name.trim()) && integer(project.revision), 'Invalid calculation project');
  requireOwner(project.user_id, owner);
  requireValid(nonnegative(project.discount_percent) && project.discount_percent <= 100
    && nonnegative(project.discount_amount) && nonnegative(project.urgency_percent)
    && nonnegative(project.urgency_amount) && (project.agreed_price === null || nonnegative(project.agreed_price)),
  'Invalid project financial adjustments');
}

function validateItem(item: CalculationItem, project: CalculationProject): void {
  requireValid(Boolean(item) && validId(item.id) && timestamp(item.created_at)
    && typeof item.name === 'string' && Boolean(item.name.trim()) && integer(item.sort_order)
    && integer(item.quantity) && item.quantity > 0 && item.project_id === project.id, 'Invalid calculation item');
  requireOwner(item.user_id, project.user_id);
  requireValid(Boolean(item.inputs) && typeof item.inputs === 'object' && Boolean(item.result)
    && typeof item.result === 'object', 'Invalid calculation snapshot');
  validateSnapshot(item, project.user_id);
  const inputs = item.inputs;
  requireValid(inputs.quantity === item.quantity && nonnegative(inputs.weightG) && nonnegative(inputs.hours)
    && nonnegative(inputs.minutes) && nonnegative(inputs.laborMinutes), 'Invalid calculation inputs');
  for (const field of ['days', 'laborRatePerHour', 'markupPercent', 'defectPercent', 'discountPercent',
    'discountAmount', 'urgencyPercent', 'urgencyAmount', 'agreedPrice'] as const) {
    requireValid(inputs[field] === undefined || (field === 'agreedPrice' && inputs[field] === null)
      || nonnegative(inputs[field]), `Invalid ${field}`);
  }
  requireValid((inputs.discountPercent ?? 0) <= 100, 'Invalid item discount');
  for (const resource of [inputs.filament, inputs.printer, inputs.settings]) {
    requireValid(resource === null || (Boolean(resource) && typeof resource === 'object'), 'Invalid calculation resource');
    if (resource && 'id' in resource) requireValid(validId(resource.id), 'Invalid calculation resource ID');
  }
  if (inputs.customCostItems !== undefined) {
    requireValid(Array.isArray(inputs.customCostItems), 'Invalid custom costs');
    const ids = new Set<string>();
    for (const cost of inputs.customCostItems) {
      requireValid(Boolean(cost) && validId(cost.id) && !ids.has(cost.id) && typeof cost.name === 'string'
        && Number.isFinite(cost.amount) && typeof cost.isEnabled === 'boolean'
        && (cost.mode === undefined || ['profit_only', 'cost_with_markup', 'cost_no_markup'].includes(cost.mode)), 'Invalid custom cost');
      ids.add(cost.id);
    }
  }
  requireValid(item.product_id === null || validId(item.product_id), 'Invalid product reference');
  const recipe = item.recipe;
  requireValid(Boolean(recipe) && recipe.version === 1 && Array.isArray(recipe.materials)
    && nonnegative(recipe.non_material_unit_cost), 'Invalid calculation recipe');
  for (const material of recipe.materials) {
    requireValid(Boolean(material) && validId(material.variant_id) && nonnegative(material.grams_per_unit)
      && material.grams_per_unit > 0, 'Invalid recipe material');
  }
  requireValid(recipe.product_snapshot === null || Boolean(recipe.product_snapshot)
    && recipe.product_snapshot.id === item.product_id, 'Recipe product does not match calculation item');
}

function requireReference<T extends { user_id: string }>(entity: T | undefined, owner: string, label: string): void {
  if (!entity) throw new InventoryOperationError('not_found', `${label} was not found`);
  requireOwner(entity.user_id, owner);
}

/** Entire project replacement shares the existing repository transaction and owner outbox. */
export function applyCalculationProjectCommand(state: FoundationState, command: ProjectCommand): FoundationState {
  requireValid(command.kind === 'saveProject' && validId(command.id) && timestamp(command.occurredAt), 'Invalid project command');
  validateProject(command.project, state.user_id);
  requireValid(Array.isArray(command.items) && command.items.length > 0, 'Project must contain calculation items');
  const existingProject = state.projects.find(row => row.id === command.project.id);
  if (existingProject) requireOwner(existingProject.user_id, state.user_id);
  requireValid(!existingProject || existingProject.revision === command.project.revision,
    'BUSINESS_PROJECT_REVISION_CONFLICT: проект изменён в другой вкладке; локальный черновик сохранён.');
  const ids = new Set<string>();
  const items = command.items.map(item => {
    validateItem(item, command.project);
    requireValid(!ids.has(item.id), 'Duplicate calculation item ID');
    ids.add(item.id);
    const existingItem = state.calculationItems.find(row => row.id === item.id);
    if (existingItem) {
      requireOwner(existingItem.user_id, state.user_id);
      requireValid(existingItem.project_id === command.project.id, 'Calculation item belongs to another project');
    }
    if (item.inputs.filament) {
      requireReference(state.variants.find(row => row.id === item.inputs.filament!.id
        || row.legacy_filament_id === item.inputs.filament!.id), state.user_id, 'Filament variant');
    }
    if (item.product_id) {
      const product = state.legacyProducts?.find(row => row.id === item.product_id);
      const balance = state.finishedBalances.find(row => row.source_product_id === item.product_id);
      if (product) {
        if (product.user_id !== undefined) requireOwner(product.user_id, state.user_id);
      } else requireReference(balance, state.user_id, 'Product');
    }
    for (const material of item.recipe.materials) {
      requireReference(state.variants.find(row => row.id === material.variant_id), state.user_id, 'Recipe filament variant');
    }
    const inputs = structuredClone(item.inputs);
    const result = calculatePrintCost(inputs);
    validateSnapshot(result, state.user_id);
    requireValid(nonnegative(result.totalBaseCost) && nonnegative(result.totalFinalPrice), 'Invalid calculated cost or price');
    return { ...structuredClone(item), created_at: existingItem?.created_at ?? item.created_at,
      inputs, result, archived: false };
  }).sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));
  const next = structuredClone(state);
  const project = { ...structuredClone(command.project),
    created_at: existingProject?.created_at ?? command.project.created_at,
    revision: existingProject ? existingProject.revision + 1 : 0 };
  requireValid(integer(project.revision), 'Project revision overflow');
  const projectIndex = next.projects.findIndex(row => row.id === project.id);
  if (projectIndex === -1) next.projects.push(project);
  else next.projects[projectIndex] = project;
  next.calculationItems = next.calculationItems.filter(row => !ids.has(row.id)).map(row =>
    row.project_id === project.id && !row.archived ? { ...row, archived: true } : row);
  next.calculationItems.push(...items);
  return next;
}

/** Historical archived snapshots are retained in storage but hidden from project editors. */
export function getCalculationProjectItems(state: FoundationState, projectId: string): CalculationItem[] {
  return structuredClone(state.calculationItems.filter(row => row.project_id === projectId
    && row.user_id === state.user_id && !row.archived)
    .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id)));
}

/** Preparation only: no order IDs, reservation, production or database writes. */
export function createProjectOrderDraft(project: CalculationProject, items: CalculationItem[]): CalculationProjectOrderDraft {
  validateProject(project, project.user_id);
  const active = items.filter(item => !item.archived && item.project_id === project.id);
  requireValid(active.length > 0, 'Project must contain calculation items');
  const ids = new Set<string>();
  for (const item of active) {
    validateItem(item, project);
    requireValid(!ids.has(item.id), 'Duplicate calculation item ID');
    ids.add(item.id);
  }
  active.sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));
  const totals = calculateProjectTotals({ lines: active, discountPercent: project.discount_percent,
    discountAmount: project.discount_amount, urgencyPercent: project.urgency_percent,
    urgencyAmount: project.urgency_amount, agreedPrice: project.agreed_price, payment: 0 });
  validateSnapshot(totals, project.user_id);
  const order: Partial<Order> = { user_id: project.user_id, title: project.name, type: 'income',
    status: 'Не в работе', quantity: totals.quantity, base_amount: totals.baseRetailPrice,
    urgency_type: 'fixed', urgency_amount: totals.urgencyCost, urgency_percent: 0,
    discount_type: 'fixed', discount_amount: totals.discountTotal, discount_percent: 0,
    amount: totals.totalFinalPrice, cost: totals.totalBaseCost, payment: 0, payments: [],
    ...(project.agreed_price !== null ? { agreed_price: totals.totalFinalPrice } : {}) };
  return { projectId: project.id, projectRevision: project.revision, order, totals,
    items: active.map(item => ({ calculation_item_id: item.id, product_id: item.product_id,
      name: item.name, quantity: item.quantity, unit_cost: item.result.baseCostPerUnit,
      total_cost: item.result.totalBaseCost, unit_price: item.result.finalPricePerUnit,
      total_price: item.result.totalFinalPrice, cost_provenance: 'estimate',
      snapshot: structuredClone({ version: 1, order: { title: item.name, type: 'income', quantity: item.quantity,
        amount: item.result.totalFinalPrice, cost: item.result.totalBaseCost, payment: 0 },
        calculation: { inputs: item.inputs, result: item.result }, recipe: item.recipe }) })) };
}
