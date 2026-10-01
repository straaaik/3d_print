import type { Order } from '../types';
import type { CalculationItem, FoundationState, OrderItem } from '../types/foundation';
import { createProjectOrderDraft, type CalculationProjectOrderDraft } from './calculationProjects';
import { calculatePrintCost } from './formulas';
import { InventoryOperationError } from './inventoryEngine';

export interface ProjectOrderCommand {
  kind: 'createProjectOrder';
  id: string;
  occurredAt: string;
  order: Order;
  draft: CalculationProjectOrderDraft;
  itemIds: string[];
}
function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new InventoryOperationError('invalid', message);
}
const validId = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

/** Head and immutable item snapshots are committed together; production is a later command. */
export function applyProjectOrderCommand(state: FoundationState, command: ProjectOrderCommand): FoundationState {
  requireValid(validId(command.id) && Number.isFinite(Date.parse(command.occurredAt)), 'Invalid order command');
  const { order, draft, itemIds } = command;
  requireValid(validId(order.id) && order.user_id === state.user_id && order.type === 'income'
    && !order.product_id && order.status === 'Не в работе', 'Invalid project order owner or status');
  requireValid(typeof order.title === 'string' && typeof order.created_at === 'string'
    && Number.isFinite(Date.parse(order.created_at)) && Number.isFinite(order.payment) && order.payment >= 0, 'Invalid project order');
  const project = state.projects.find(row => row.id === draft.projectId && row.user_id === state.user_id);
  requireValid(project && draft.items.length > 0 && draft.items.length === itemIds.length
    && itemIds.every(validId) && new Set(itemIds).size === itemIds.length, 'Invalid project or item IDs');
  const sources = new Set<string>();
  const calculations: CalculationItem[] = draft.items.map((item, index) => {
    const parent = state.calculationItems.find(row => row.id === item.calculation_item_id
      && row.project_id === project.id && row.user_id === state.user_id);
    requireValid(parent && !sources.has(parent.id) && item.snapshot?.calculation && item.snapshot.recipe, 'Missing calculation parent snapshot');
    sources.add(parent.id);
    const { inputs } = item.snapshot.calculation;
    return { id: parent.id, user_id: state.user_id, created_at: parent.created_at, project_id: project.id,
      product_id: item.product_id, name: item.name, sort_order: index, quantity: item.quantity,
      inputs: structuredClone(inputs), result: calculatePrintCost(inputs), recipe: structuredClone(item.snapshot.recipe) };
  });
  // Draft financial corrections were frozen when the form opened, even if the project changes later.
  const verified = createProjectOrderDraft({ ...project,
    discount_percent: 0, discount_amount: draft.order.discount_amount ?? 0,
    urgency_percent: 0, urgency_amount: draft.order.urgency_amount ?? 0,
    agreed_price: draft.order.agreed_price ?? null,
  }, calculations);
  requireValid(order.amount === verified.totals.totalFinalPrice && order.cost === verified.totals.totalBaseCost
    && order.quantity === verified.totals.quantity, 'Order financial totals do not match snapshots');
  const items: OrderItem[] = verified.items.map((item, index) => ({
    id: itemIds[index], user_id: state.user_id, created_at: command.occurredAt,
    order_id: order.id, source_order_id: order.id, product_id: item.product_id, name: item.name, quantity: item.quantity,
    unit_cost: item.unit_cost, total_cost: item.total_cost, unit_price: item.unit_price, total_price: item.total_price,
    cost_provenance: 'estimate', fulfilled_quantity: 0, production_quantity: 0, snapshot: item.snapshot, legacy_key: null,
  }));
  const previous = state.legacyOrders?.find(row => row.id === order.id);
  if (previous) {
    // SQL can add an order number, null columns and round currency. Immutable snapshots identify the same request.
    requireValid(Object.entries(order).every(([key, value]) => key === 'order_number'
      || (typeof value === 'number' && typeof previous[key as keyof Order] === 'number'
        ? Math.abs(value - (previous[key as keyof Order] as number)) < 0.005
        : JSON.stringify(value ?? null) === JSON.stringify(previous[key as keyof Order] ?? null)))
      && items.every(item => {
        const existing = state.orderItems.find(row => row.id === item.id);
        return existing && existing.source_order_id === order.id && existing.quantity === item.quantity
          && existing.name === item.name && JSON.stringify(existing.snapshot) === JSON.stringify(item.snapshot);
      }), 'Order ID already occupied by a conflicting request');
    return structuredClone(state);
  }
  requireValid(items.every(item => !state.orderItems.some(row => row.id === item.id)), 'Order item ID already occupied');
  const next = structuredClone(state);
  const number = order.order_number ?? Math.max(1000, ...(next.legacyOrders ?? []).map(row => row.order_number ?? 1000)) + 1;
  next.legacyOrders = [...(next.legacyOrders ?? []), { ...structuredClone(order), order_number: number }];
  next.orderItems.push(...items);
  return next;
}
