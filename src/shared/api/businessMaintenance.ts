import type { FoundationState } from '../types/foundation';
import type { DataBackupSnapshot, DataBackupV3, ParsedDataBackup } from '../lib/dataBackup';
import { createDataBackup, parseDataBackup } from '../lib/dataBackup';
import { emptyFoundationState, foundationStorageKey, loadFoundationState } from '../lib/foundationStorage';
import { calculationDraftKey } from '../lib/calculationDraft';
import { commitLocalSnapshot, recoverLocalSnapshot, readLocalSnapshotItem } from '../lib/atomicLocalSnapshot';
import { bootstrapInventoryState } from '../lib/inventoryEngine';
import { backfillLegacyOrderItems } from '../lib/orderSnapshots';
import { getScopedStorageKey, getStorageScope } from '../lib/storageScope';
import { readVersionedJson } from '../lib/versionedStorage';
import type { MaintenanceIntent } from './inventoryRepository';

const baseKeys = { filaments: '3d_calc_filaments', printers: '3d_calc_printers', settings: '3d_calc_settings',
  savedCalculations: '3d_calc_saved_calculations', collections: '3d_calc_collections', orders: '3d_calc_orders',
  monthlyGoals: '3d_calc_monthly_goals' } as const;
export const maintenanceJournalKey = () => getScopedStorageKey('3d_business_maintenance_journal');
export function recoverBusinessMaintenance(): void {
  if (typeof window !== 'undefined') recoverLocalSnapshot(window.localStorage, maintenanceJournalKey());
}
export function maintenanceStorage() {
  const storage = window.localStorage;
  const journalKey = maintenanceJournalKey();
  return { getItem: (key: string) => readLocalSnapshotItem(storage, key, journalKey),
    setItem: (key: string, value: string) => {
      // Read-time legacy migration must not mutate a journaled replacement.
      if (storage.getItem(journalKey) === null) storage.setItem(key, value);
    } };
}

/** Operational outbox/recovery payloads embed whole earlier snapshots. They are never
 * exported or re-sent as business facts, otherwise every backup nests the previous one. */
function withoutMaintenanceEnvelope(business: FoundationState): FoundationState {
  const clean = structuredClone(business) as FoundationState & { pendingMaintenance?: unknown; maintenanceRecovery?: unknown };
  delete clean.pendingMaintenance;
  delete clean.maintenanceRecovery;
  return clean;
}

/** Uses canonical archived rows and audit facts rather than the current screen projection. */
export function exportBusinessBackup(defaults: DataBackupSnapshot): DataBackupV3 {
  if (typeof window === 'undefined') throw new Error('Экспорт доступен в браузере.');
  const owner = getStorageScope();
  const loaded = loadFoundationState(window.localStorage, owner);
  if (loaded.status !== 'ready') throw new Error('Складской кэш повреждён; исходная копия сохранена.');
  const snapshot = Object.fromEntries(Object.entries(baseKeys).map(([section, base]) => [section,
    readVersionedJson(maintenanceStorage(), getScopedStorageKey(base), defaults[section as keyof DataBackupSnapshot])])) as unknown as DataBackupSnapshot;
  const business = withoutMaintenanceEnvelope(loaded.state);
  snapshot.orders = business.legacyOrders ?? snapshot.orders;
  snapshot.savedCalculations = business.legacyProducts ?? snapshot.savedCalculations;
  // A pre-bootstrap legacy cache becomes a financial/opening balance backup;
  // old order status never manufactures new physical history.
  const complete = bootstrapInventoryState(business, snapshot.filaments, snapshot.savedCalculations);
  complete.legacyOrders = snapshot.orders.map(({ items: _items, ...head }) => head);
  complete.legacyProducts = snapshot.savedCalculations;
  complete.orderItems = backfillLegacyOrderItems(complete.legacyOrders, complete.orderItems, owner);
  const recovery = window.localStorage.getItem(getScopedStorageKey('3d_business_maintenance_recovery'));
  const conflicts = window.localStorage.getItem(getScopedStorageKey('3d_business_maintenance_conflicts'));
  if (recovery || conflicts) {
    const before = recovery ? JSON.parse(recovery) as { business?: FoundationState } : undefined;
    // One generation deep: the stored recovery never carries its own recovery envelope.
    if (before?.business) before.business = withoutMaintenanceEnvelope(before.business);
    Object.assign(complete, { maintenanceRecovery: {
      ...(before ? { before } : {}), ...(conflicts ? { conflicts: JSON.parse(conflicts) } : {}),
    } });
  }
  const rawDraft = maintenanceStorage().getItem(calculationDraftKey(owner));
  const draft = rawDraft ? JSON.parse(rawDraft) : undefined;
  const backup = createDataBackup(snapshot, complete, draft) as DataBackupV3;
  parseDataBackup(backup, owner);
  return backup;
}

export interface MaintenanceClient {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data?: unknown; error?: unknown } | null | undefined>;
}
export interface MaintenanceRows {
  [key: string]: unknown;
}

/** Explicit conflict choice atomically installs all server resources, retaining
 * the rejected local generation and every raw cache value as recovery evidence. */
export function installCloudMaintenanceSnapshot(storage: Storage, owner: string, full: Record<string, unknown>, rejected: FoundationState): void {
  const rawGoals = full.monthly_goals as { month_key: string; target_amount: number }[];
  if (!Array.isArray(rawGoals)) throw new Error('Серверная копия не содержит месячные цели.');
  const parsed = parseDataBackup({ version: 3, exportedAt: new Date().toISOString(), business: full.business,
    filaments: full.filaments, printers: full.printers, settings: Array.isArray(full.settings) ? full.settings[0] ?? null : undefined,
    collections: full.collections, savedCalculations: full.saved_calculations, orders: full.orders,
    monthlyGoals: { defaultGoal: rawGoals.find(row => row.month_key === 'default')?.target_amount ?? 0, targetType: 'profit',
      monthlyGoals: Object.fromEntries(rawGoals.filter(row => row.month_key !== 'default').map(row => [row.month_key, row.target_amount])) },
  }, owner);
  const business = parsed.business!;
  const key = (base: string) => `${base}::user:${owner}`;
  const values: Record<string, string | null> = {};
  const before: Record<string, string | null> = {};
  for (const [section, base] of Object.entries(baseKeys)) {
    before[key(base)] = storage.getItem(key(base));
    values[key(base)] = JSON.stringify(parsed[section as keyof ParsedDataBackup]);
    values[`${key(base)}::schema-version`] = '1';
  }
  before[calculationDraftKey(owner)] = storage.getItem(calculationDraftKey(owner));
  before[key('3d_calc_sync_queue')] = storage.getItem(key('3d_calc_sync_queue'));
  const conflictsKey = key('3d_business_maintenance_conflicts');
  const previous = JSON.parse(storage.getItem(conflictsKey) ?? '[]');
  if (!Array.isArray(previous)) throw new Error('Локальные копии конфликтов повреждены; запись отменена.');
  values[conflictsKey] = JSON.stringify([...previous, { occurredAt: new Date().toISOString(), business: rejected, values: before }]);
  values[foundationStorageKey(owner)] = JSON.stringify({ ...business, revision: rejected.revision + 1,
    inventoryCacheVersion: 1, pendingInventory: [], remoteInventoryRevision: business.revision });
  values[key('3d_calc_sync_queue')] = '[]';
  values[calculationDraftKey(owner)] = null;
  commitLocalSnapshot(storage, values, key('3d_business_maintenance_journal'));
  if (typeof window !== 'undefined') window.dispatchEvent?.(new Event('business_maintenance_updated'));
}

/** The recovery bundle and new state are journaled before attempting the RPC.
 * A lost response keeps exactly the same intent/id for receipt-first retry.
 */
export async function replaceBusinessSnapshot(snapshot: ParsedDataBackup, rows: MaintenanceRows,
  defaults: DataBackupSnapshot, client: MaintenanceClient | null): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Восстановление доступно в браузере.');
  recoverBusinessMaintenance();
  const owner = getStorageScope();
  const old = loadFoundationState(window.localStorage, owner);
  if (old.status !== 'ready') throw new Error('Складской кэш недоступен; исходная копия сохранена.');
  const previous = exportBusinessBackup(defaults);
  if (previous.business) previous.business = withoutMaintenanceEnvelope(previous.business);
  const proposed = snapshot.business ?? bootstrapInventoryState(emptyFoundationState(owner), snapshot.filaments ?? [], snapshot.savedCalculations ?? []);
  if (proposed.user_id !== owner) throw new Error('Полная резервная копия принадлежит другому пользователю.');
  const business: FoundationState = withoutMaintenanceEnvelope(proposed);
  business.legacyOrders = (snapshot.orders ?? []).map(({ items: _items, ...head }) => ({ ...head, user_id: owner }));
  business.legacyProducts = (snapshot.savedCalculations ?? []).map(product => ({ ...product, user_id: owner }));
  if (!snapshot.business) business.orderItems = backfillLegacyOrderItems(business.legacyOrders, [], owner);
  const generation = old.state.generation ?? 0;
  const intent: MaintenanceIntent = { id: crypto.randomUUID(), occurredAt: new Date().toISOString(), generation,
    expectedRevision: (old.state as FoundationState & { remoteInventoryRevision?: number }).remoteInventoryRevision ?? old.state.revision,
    snapshot: { ...rows, business } };
  const values: Record<string, string | null> = {
    [getScopedStorageKey('3d_business_maintenance_recovery')]: JSON.stringify(previous),
    [getScopedStorageKey('3d_calc_sync_queue')]: '[]',
    [foundationStorageKey(owner)]: JSON.stringify({ ...business, generation: generation + 1, revision: old.state.revision + 1,
      inventoryCacheVersion: 1, pendingInventory: [], pendingMaintenance: intent, remoteInventoryRevision: intent.expectedRevision }),
    [calculationDraftKey(owner)]: snapshot.calculationDraft === undefined ? null : JSON.stringify(snapshot.calculationDraft),
  };
  for (const [section, base] of Object.entries(baseKeys)) {
    const value = snapshot[section as keyof ParsedDataBackup];
    if (value !== undefined) {
      const key = getScopedStorageKey(base);
      values[key] = JSON.stringify(value);
      values[`${key}::schema-version`] = '1';
    }
  }
  commitLocalSnapshot(window.localStorage, values, maintenanceJournalKey());
  if (client) {
    // Synchronization failures retain the complete local replacement and prior
    // backup. The repository displays the error and retries the durable intent.
    try {
      const response = await client.rpc('business_restore_snapshot', {
        p_expected_revision: intent.expectedRevision,
        p_command: { kind: 'restoreBusinessSnapshot', id: intent.id, occurredAt: intent.occurredAt, generation },
        p_snapshot: intent.snapshot,
      });
      if (!response?.error && response?.data) {
        const remote = response.data as FoundationState;
        const { isFoundationState } = await import('../lib/foundationStorage');
        if (isFoundationState(remote, owner)) window.localStorage.setItem(foundationStorageKey(owner), JSON.stringify({
          ...remote, revision: old.state.revision + 2, inventoryCacheVersion: 1, pendingInventory: [], remoteInventoryRevision: remote.revision,
        }));
      }
    } catch { /* Durable intent is authoritative until receipt acknowledged. */ }
  }
  window.dispatchEvent?.(new Event('business_maintenance_updated'));
}
