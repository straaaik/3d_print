import type { SavedCalculation } from '../types';
import type { FoundationState } from '../types/foundation';
import { bootstrapInventoryState, InventoryOperationError } from './inventoryEngine';

export type CatalogCommand = { id: string; occurredAt: string } & (
  { kind: 'saveCatalogProduct'; product: SavedCalculation; expectedRevision: number; isNew: boolean }
  | { kind: 'archiveCatalogProducts'; productIds: string[] }
  | ({ kind: 'restoreCatalog'; products: SavedCalculation[] } & CatalogRestoreOptions)
);
export interface CatalogRestoreOptions { productIds?: string[]; expectedRevisions?: Record<string, number> }
export const isCatalogCommand = (command: { kind: string }): command is CatalogCommand =>
  ['saveCatalogProduct', 'archiveCatalogProducts', 'restoreCatalog'].includes(command.kind);
function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new InventoryOperationError('invalid', message);
}
const validId = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const nonnegative = (value: number) => Number.isFinite(value) && value >= 0;
function validatePayload(value: unknown, owner: string): void {
  if (typeof value === 'number') requireValid(Number.isFinite(value), 'Non-finite catalog data');
  if (!value || typeof value !== 'object') return;
  if ('user_id' in value && value.user_id !== undefined && value.user_id !== null) {
    requireValid(value.user_id === owner, 'Catalog data belongs to another user');
  }
  for (const field of Object.values(value)) validatePayload(field, owner);
}
function validateProduct(product: SavedCalculation, owner: string) {
  validatePayload(product, owner);
  requireValid(validId(product.id) && validId(product.name) && nonnegative(product.base_cost)
    && nonnegative(product.final_price) && nonnegative(product.weight_g) && nonnegative(product.hours)
    && nonnegative(product.minutes) && Number.isSafeInteger(product.quantity) && product.quantity > 0,
  'Invalid catalog product');
  requireValid(product.catalog_revision === undefined || Number.isSafeInteger(product.catalog_revision)
    && product.catalog_revision >= 0, 'Invalid catalog revision');
  requireValid(product.calculation_snapshot == null || product.calculation_snapshot?.version === 1
    && product.calculation_snapshot.inputs && product.calculation_snapshot.result, 'Invalid calculation snapshot');
}

/** Templates, archive and Undo never represent physical production or a material return. */
export function applyCatalogCommand(state: FoundationState, command: CatalogCommand): FoundationState {
  requireValid(validId(command.id) && Number.isFinite(Date.parse(command.occurredAt)), 'Invalid catalog command');
  const products = state.legacyProducts ?? [];
  const balances = new Map(state.finishedBalances.map(balance => [balance.source_product_id, balance.quantity]));
  const save = (product: SavedCalculation, archived = false): SavedCalculation => {
    validateProduct(product, state.user_id);
    const previous = products.find(row => row.id === product.id);
    return { ...structuredClone(product), user_id: state.user_id, created_at: previous?.created_at ?? product.created_at ?? command.occurredAt,
      catalog_revision: previous ? (previous.catalog_revision ?? 0) + 1 : 0, catalog_archived: archived,
      stock_quantity: balances.get(product.id) ?? previous?.stock_quantity ?? product.stock_quantity ?? 0 };
  };
  let updated: SavedCalculation[];
  if (command.kind === 'saveCatalogProduct') {
    const previous = products.find(row => row.id === command.product.id);
    requireValid(Number.isSafeInteger(command.expectedRevision) && command.expectedRevision >= 0,
      'Invalid expected catalog revision');
    requireValid(command.isNew ? !previous : previous && (previous.catalog_revision ?? 0) === command.expectedRevision,
      'BUSINESS_CATALOG_REVISION_CONFLICT: товар изменён; исходный редактор сохранён.');
    const saved = save(command.product);
    updated = [...products.filter(row => row.id !== saved.id), saved];
  } else if (command.kind === 'archiveCatalogProducts') {
    requireValid(Array.isArray(command.productIds) && new Set(command.productIds).size === command.productIds.length
      && command.productIds.every(id => validId(id) && products.some(row => row.id === id)), 'Catalog product not found');
    updated = products.map(product => command.productIds.includes(product.id) && !product.catalog_archived
      ? save(product, true) : structuredClone(product));
  } else {
    requireValid(Array.isArray(command.products) && new Set(command.products.map(row => row.id)).size === command.products.length,
      'Invalid catalog snapshot');
    const selected = new Set(command.products.map(row => row.id));
    const affected = command.productIds ? new Set(command.productIds) : null;
    if (affected) {
      requireValid(affected.size === command.productIds!.length && command.products.every(row => affected.has(row.id)), 'Invalid targeted catalog snapshot');
      for (const id of affected) {
        const previous = products.find(row => row.id === id);
        requireValid(previous && command.expectedRevisions?.[id] === (previous.catalog_revision ?? 0),
          'BUSINESS_CATALOG_REVISION_CONFLICT: товар изменён после действия; Undo отменён.');
      }
    }
    updated = [...products.filter(row => !selected.has(row.id)).map(row => affected && !affected.has(row.id)
      || row.catalog_archived ? structuredClone(row) : save(row, true)), ...command.products.map(product => save(product))];
  }
  const next = { ...structuredClone(state), legacyProducts: updated };
  return bootstrapInventoryState(next, [], updated);
}
