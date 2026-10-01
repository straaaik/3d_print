import type { FoundationState } from '../types/foundation';
import type { JsonStorage } from './versionedStorage';
import { readLocalSnapshotItem } from './atomicLocalSnapshot';

const collections = ['manufacturers', 'materialTypes', 'materialLines', 'variants', 'purchases',
  'filamentMovements', 'deficits', 'projects', 'calculationItems', 'orderItems',
  'productionEvents', 'finishedBalances', 'finishedMovements'] as const;

export function emptyFoundationState(userId: string): FoundationState {
  return {
    version: 1, user_id: userId, revision: 0, manufacturers: [], materialTypes: [], materialLines: [],
    variants: [], purchases: [], filamentMovements: [], deficits: [], projects: [], calculationItems: [],
    orderItems: [], productionEvents: [], finishedBalances: [], finishedMovements: [],
  };
}

export function foundationStorageKey(userId: string): string {
  if (!userId || !/^[a-zA-Z0-9_-]+$/.test(userId)) throw new Error('Invalid cache user scope');
  return `3d_business_state::user:${userId}`;
}

export interface FoundationLoad {
  state: FoundationState;
  status: 'ready' | 'corrupt' | 'unsupported' | 'unavailable';
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nonnegative = (value: unknown) => finite(value) && value >= 0;
const integer = (value: unknown) => nonnegative(value) && Number.isSafeInteger(value);

/** Validate boundaries before admitting browser storage as typed business data. */
export function isFoundationState(value: unknown, userId: string): value is FoundationState {
  if (!object(value) || value.version !== 1 || value.user_id !== userId || !integer(value.revision)) return false;
  if (value.generation !== undefined && !integer(value.generation)) return false;
  if (value.legacyProducts !== undefined) {
    if (!Array.isArray(value.legacyProducts)) return false;
    const ids = new Set<string>();
    for (const row of value.legacyProducts) {
      if (!object(row) || typeof row.id !== 'string' || !row.id || ids.has(row.id)
        || (row.user_id !== undefined && row.user_id !== userId) || typeof row.name !== 'string'
        || !nonnegative(row.base_cost) || !nonnegative(row.final_price) || !integer(row.quantity) || row.quantity === 0
        || (row.catalog_revision !== undefined && !integer(row.catalog_revision))
        || (row.catalog_archived !== undefined && typeof row.catalog_archived !== 'boolean')) return false;
      ids.add(row.id);
    }
  }
  if (value.legacyOrders !== undefined) {
    if (!Array.isArray(value.legacyOrders)) return false;
    const ids = new Set<string>();
    for (const row of value.legacyOrders) {
      if (!object(row) || typeof row.id !== 'string' || !row.id || ids.has(row.id)
        || (row.user_id !== undefined && row.user_id !== userId)
        || !['income', 'expense'].includes(String(row.type)) || !finite(row.amount) || !finite(row.cost)
        || (row.order_revision !== undefined && !integer(row.order_revision))
        || (row.order_archived !== undefined && typeof row.order_archived !== 'boolean')) return false;
      ids.add(row.id);
    }
  }
  for (const collection of collections) {
    const rows = value[collection];
    if (!Array.isArray(rows)) return false;
    const ids = new Set<string>();
    for (const row of rows) {
      if (!object(row) || typeof row.id !== 'string' || !row.id || row.user_id !== userId || typeof row.created_at !== 'string' || ids.has(row.id)) return false;
      ids.add(row.id);
      // Reject non-finite numeric payloads in all columns, including future ones.
      if (Object.values(row).some(field => typeof field === 'number' && !Number.isFinite(field))) return false;
      if (['manufacturers', 'materialTypes', 'materialLines', 'variants', 'projects', 'calculationItems', 'orderItems'].includes(collection) && typeof row.name !== 'string') return false;
      if (collection === 'variants' && (!nonnegative(row.stock_g) || !nonnegative(row.average_cost_per_g) || !integer(row.revision))) return false;
      if (collection === 'purchases' && (!finite(row.weight_g) || row.weight_g <= 0 || !nonnegative(row.total_price))) return false;
      if (collection === 'deficits' && (!finite(row.grams) || row.grams <= 0)) return false;
      if (collection === 'filamentMovements' && (!finite(row.delta_g) || !nonnegative(row.balance_after_g) || !nonnegative(row.unit_cost_per_g))) return false;
      if (['calculationItems', 'orderItems', 'productionEvents'].includes(collection) && (!integer(row.quantity) || row.quantity === 0)) return false;
      if (collection === 'calculationItems' && (!object(row.inputs) || !object(row.result) || !object(row.recipe)
        || (row.archived !== undefined && typeof row.archived !== 'boolean'))) return false;
      if (collection === 'orderItems' && (!object(row.snapshot) || row.snapshot.version !== 1 || !object(row.snapshot.order)
        || !nonnegative(row.total_cost) || !nonnegative(row.total_price) || !nonnegative(row.unit_cost) || !nonnegative(row.unit_price)
        || !integer(row.fulfilled_quantity) || !integer(row.production_quantity)
        || (row.fulfilled_quantity as number) > (row.quantity as number) || (row.production_quantity as number) > (row.fulfilled_quantity as number)
        || (row.reserved_quantity !== undefined && row.reserved_quantity !== null
          && (!integer(row.reserved_quantity) || (row.reserved_quantity as number) > (row.fulfilled_quantity as number)))
        || (row.returned_quantity !== undefined && row.returned_quantity !== null
          && (!integer(row.returned_quantity) || (row.returned_quantity as number) > (row.fulfilled_quantity as number)))
        || (row.archived !== undefined && row.archived !== null && typeof row.archived !== 'boolean'))) return false;
      if (collection === 'productionEvents' && (!object(row.recipe_snapshot) || !nonnegative(row.unit_cost))) return false;
      if (collection === 'finishedBalances' && (!integer(row.quantity) || !nonnegative(row.average_unit_cost) || !integer(row.revision))) return false;
      if (collection === 'finishedMovements' && (!finite(row.delta_quantity) || !Number.isSafeInteger(row.delta_quantity) || !integer(row.balance_after) || !nonnegative(row.unit_cost))) return false;
    }
  }
  return true;
}

/** Never clears malformed/future data. Callers may render an empty disabled view. */
export function loadFoundationState(storage: JsonStorage, userId: string): FoundationLoad {
  const fallback = emptyFoundationState(userId);
  const key = foundationStorageKey(userId);
  let raw: string | null;
  try { raw = readLocalSnapshotItem(storage, key, `3d_business_maintenance_journal::user:${userId}`); }
  catch { return { state: fallback, status: 'unavailable' }; }
  if (raw === null) return { state: fallback, status: 'ready' };
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { state: fallback, status: 'corrupt' }; }
  if (!object(value)) return { state: fallback, status: 'corrupt' };
  if (typeof value.version === 'number' && value.version > 1) return { state: fallback, status: 'unsupported' };
  const migrated = value.version === 0 ? { ...fallback, ...value, version: 1 } : value;
  if (!isFoundationState(migrated, userId)) return { state: fallback, status: 'corrupt' };
  if (value.version === 0) {
    try {
      if (storage.getItem(`${key}::before-v1`) === null) storage.setItem(`${key}::before-v1`, raw);
      storage.setItem(key, JSON.stringify(migrated));
    } catch { /* Preserve a usable read even when persistence is unavailable. */ }
  }
  return { state: migrated, status: 'ready' };
}

/** One synchronous setItem commits every collection or none. No mutation of inputs.
 * Cross-tab callers must serialize the read/modify/commit with Web Locks.
 */
export function commitFoundationState(storage: JsonStorage, userId: string, state: FoundationState, expectedRevision: number): FoundationState {
  const current = loadFoundationState(storage, userId);
  if (current.status !== 'ready') throw new Error(`Cannot overwrite ${current.status} cache`);
  if (current.state.revision !== expectedRevision) throw new Error('Foundation revision conflict');
  const next = { ...state, revision: expectedRevision + 1 };
  if (!isFoundationState(next, userId)) throw new Error('Invalid foundation cache state');
  storage.setItem(foundationStorageKey(userId), JSON.stringify(next));
  return next;
}
