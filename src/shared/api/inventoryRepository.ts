import type { Filament, Order, SavedCalculation } from '../types';
import { applyLegacyOrderCommand, isLegacyOrderCommand, type LegacyOrderCommand } from '../lib/legacyInventoryOrders';
import type { FoundationState } from '../types/foundation';
import { commitFoundationState, foundationStorageKey, loadFoundationState } from '../lib/foundationStorage';
import { applyInventoryCommand, bootstrapInventoryState, type InventoryCommand } from '../lib/inventoryEngine';
import type { JsonStorage } from '../lib/versionedStorage';
import { applyCalculationProjectCommand, type ProjectCommand } from '../lib/calculationProjects';
import { applyProjectOrderCommand, type ProjectOrderCommand } from '../lib/projectOrders';
import { applyCatalogCommand, isCatalogCommand, type CatalogCommand } from '../lib/catalogCommands';
import { applyBusinessOrderCommand, isBusinessOrderCommand, reserveOrderItems, type BusinessOrderCommand } from '../lib/businessOrders';
import { recoverLocalSnapshot } from '../lib/atomicLocalSnapshot';
import { installCloudMaintenanceSnapshot } from './businessMaintenance';

export type BusinessCommand = InventoryCommand | LegacyOrderCommand | ProjectCommand | ProjectOrderCommand | CatalogCommand | BusinessOrderCommand;
export type InventoryRequest = (BusinessCommand | {
  kind: 'bootstrap'; id: string; occurredAt: string; filaments: Filament[]; products: SavedCalculation[]; orders?: Order[];
}) & { generation?: number };
export interface MaintenanceIntent {
  id: string;
  occurredAt: string;
  expectedRevision: number;
  generation: number;
  snapshot: Record<string, unknown>;
}
export interface InventoryTransport {
  load: () => Promise<FoundationState>;
  commit: (revision: number, command: InventoryRequest, state: FoundationState) => Promise<FoundationState>;
  maintain?: (intent: MaintenanceIntent) => Promise<FoundationState>;
  loadFull?: () => Promise<Record<string, unknown>>;
}
export interface InventoryView {
  resolvedProjectId?: string;
  state: FoundationState;
  pendingCount: number;
  mode: 'cloud' | 'local';
  syncError: string | null;
}
interface PersistedInventory extends FoundationState {
  pendingMaintenance?: MaintenanceIntent;
  orderConflictBackups?: { occurredAt: string; commands: InventoryRequest[] }[];
  catalogConflictBackups?: { occurredAt: string; commands: InventoryRequest[] }[];
  projectConflictBackups?: { occurredAt: string; projectId: string; commands: InventoryRequest[] }[];
  inventoryCacheVersion: 1;
  pendingInventory: InventoryRequest[];
  remoteInventoryRevision: number;
}
export interface InventoryRepositoryOptions {
  ownerId: string;
  storage: JsonStorage & { removeItem?: (key: string) => void };
  transport?: InventoryTransport;
  /** Must serialize the WHOLE async read/modify/write across browser tabs. */
  lock: <T>(name: string, callback: () => Promise<T>) => Promise<T>;
}

function apply(state: FoundationState, request: InventoryRequest, remote = false): FoundationState {
  if (isBusinessOrderCommand(request)) return applyBusinessOrderCommand(state, request);
  if (isCatalogCommand(request)) return applyCatalogCommand(state, request);
  if (request.kind === 'createProjectOrder') {
    const created = applyProjectOrderCommand(state, request);
    // Previously acknowledged creates must not opportunistically reserve new stock on retry.
    return state.legacyOrders?.some(order => order.id === request.order.id) ? created
      : reserveOrderItems(created, request.order.id, request.id, request.occurredAt);
  }
  if (request.kind === 'saveProject') return applyCalculationProjectCommand(state, request);
  if (isLegacyOrderCommand(request)) return applyLegacyOrderCommand(state, request);
  return request.kind === 'bootstrap'
    ? { ...bootstrapInventoryState(state, request.filaments, remote ? state.legacyProducts ?? request.products : request.products),
      ...(state.legacyOrders === undefined && request.orders ? { legacyOrders: structuredClone(request.orders) } : {}),
      ...(state.legacyProducts === undefined ? { legacyProducts: structuredClone(request.products) } : {}) }
    : applyInventoryCommand(state, request);
}

/** Durable command queue and state share one atomic localStorage write. */
export function createInventoryRepository(options: InventoryRepositoryOptions) {
  const { ownerId, storage, transport, lock } = options;
  const key = foundationStorageKey(ownerId);
  const withLock = <T>(callback: () => Promise<T>) => lock(key, async () => {
    if (storage.removeItem) recoverLocalSnapshot(storage as Storage, `3d_business_maintenance_journal::user:${ownerId}`);
    return callback();
  });
  const read = (): PersistedInventory => {
    const loaded = loadFoundationState(storage, ownerId);
    if (loaded.status !== 'ready') throw new Error(`Складской кэш недоступен (${loaded.status}); исходные данные сохранены.`);
    const state = loaded.state as FoundationState & Partial<PersistedInventory>;
    if (state.inventoryCacheVersion !== undefined && state.inventoryCacheVersion !== 1) {
      throw new Error('Складской кэш требует более новой версии приложения.');
    }
    const pending = state.pendingInventory ?? [];
    if (!Array.isArray(pending) || pending.some(command => !command || typeof command.id !== 'string'
      || typeof command.kind !== 'string' || typeof command.occurredAt !== 'string')) {
      throw new Error('Очередь складских операций повреждена; запись отменена.');
    }
    return { ...state, inventoryCacheVersion: 1, pendingInventory: pending,
      remoteInventoryRevision: state.remoteInventoryRevision ?? 0 };
  };
  const persist = (state: FoundationState, pending: InventoryRequest[], remoteRevision: number): PersistedInventory => {
    const previous = read();
    const next: PersistedInventory = { ...state, inventoryCacheVersion: 1,
      ...((state as PersistedInventory).orderConflictBackups || previous.orderConflictBackups
        ? { orderConflictBackups: (state as PersistedInventory).orderConflictBackups ?? previous.orderConflictBackups } : {}),
      ...((state as PersistedInventory).catalogConflictBackups || previous.catalogConflictBackups
        ? { catalogConflictBackups: (state as PersistedInventory).catalogConflictBackups ?? previous.catalogConflictBackups } : {}),
      ...((state as PersistedInventory).projectConflictBackups || previous.projectConflictBackups
        ? { projectConflictBackups: (state as PersistedInventory).projectConflictBackups ?? previous.projectConflictBackups } : {}),
      pendingInventory: pending, remoteInventoryRevision: remoteRevision };
    return commitFoundationState(storage, ownerId, next, previous.revision) as PersistedInventory;
  };
  const view = (cache: PersistedInventory, syncError: string | null = null): InventoryView => ({
    state: cache, pendingCount: cache.pendingInventory.length + (cache.pendingMaintenance ? 1 : 0),
    mode: transport && cache.pendingInventory.length === 0 && !cache.pendingMaintenance && !syncError ? 'cloud' : 'local', syncError,
  });
  const sync = async (): Promise<InventoryView> => {
    let cache = read();
    if (!transport) return view(cache);
    let pending = [...cache.pendingInventory];
    try {
      let remote: FoundationState;
      if (cache.pendingMaintenance) {
        if (!transport.maintain) throw new Error('Для облачного восстановления требуется SQL-миграция. Полная локальная копия сохранена.');
        remote = await transport.maintain(cache.pendingMaintenance);
        if (remote.user_id !== ownerId) throw new Error('Получен склад другого пользователя.');
        const { pendingMaintenance: _done, ...acknowledged } = cache;
        cache = persist(acknowledged, pending, remote.revision);
      } else remote = await transport.load();
      if (remote.user_id !== ownerId) throw new Error('Получен склад другого пользователя.');
      if (pending.length && (remote.generation ?? 0) !== (cache.generation ?? 0)) {
        throw new Error('BUSINESS_GENERATION_CONFLICT: база восстановлена в другой вкладке; прежняя очередь сохранена для восстановления.');
      }
      while (pending.length) {
        const command = pending[0];
        let committed = false;
        for (let attempt = 0; attempt < 3 && !committed; attempt += 1) {
          // Legacy RPC owns validation and checks its receipt before touching stock.
          // Acknowledged requests must remain retryable after other tabs change stock.
          const projectOrderMayBeAcknowledged = command.kind === 'createProjectOrder'
            && (remote.legacyOrders?.some(order => order.id === command.order.id)
              || remote.orderItems.some(item => item.source_order_id === command.order.id));
          let next = remote;
          if (!isLegacyOrderCommand(command) && !projectOrderMayBeAcknowledged) {
            try { next = apply(remote, command, true); }
            catch (error) {
              // The project RPC checks its receipt before reporting a same-project revision conflict.
              if (!(error instanceof Error) || !(isBusinessOrderCommand(command) || (command.kind === 'saveProject'
                && error.message.includes('BUSINESS_PROJECT_REVISION_CONFLICT')) || (isCatalogCommand(command)
                && error.message.includes('BUSINESS_CATALOG_REVISION_CONFLICT')))) throw error;
            }
          }
          try {
            remote = await transport.commit(remote.revision, command, next);
            if (remote.user_id !== ownerId) throw new Error('Получен склад другого пользователя.');
            committed = true;
          } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('BUSINESS_REVISION_CONFLICT') || attempt === 2) throw error;
            remote = await transport.load();
            if (remote.user_id !== ownerId) throw new Error('Получен склад другого пользователя.');
          }
        }
        pending = pending.slice(1);
        // Retain the current offline projection until every queued command has landed.
        // A crash here leaves acknowledged commands removed and all others recoverable.
        cache = persist(cache, pending, remote.revision);
      }
      cache = persist(remote, [], remote.revision);
      return view(cache);
    } catch (error) {
      return view(cache, error instanceof Error ? error.message : 'Склад сохранён локально; синхронизация не завершена.');
    }
  };
  return {
    // Storage events only read: persisting from them would cause cross-tab ping-pong.
    inspect: () => view(read()),
    load: (filaments: Filament[] = [], products: SavedCalculation[] = [], orders?: Order[]) => withLock(async () => {
      const cache = read();
      const request: InventoryRequest = { kind: 'bootstrap', id: crypto.randomUUID(),
        ...((cache.generation ?? 0) ? { generation: cache.generation } : {}),
        occurredAt: new Date().toISOString(), filaments: structuredClone(filaments), products: structuredClone(products),
        ...(orders ? { orders: structuredClone(orders) } : {}) };
      const bootstrapped = apply(cache, request);
      if (JSON.stringify(bootstrapped) !== JSON.stringify(cache)) {
        persist(bootstrapped, [...cache.pendingInventory, request], cache.remoteInventoryRevision);
      }
      return sync();
    }),
    execute: (command: BusinessCommand) => withLock(async () => {
      const cache = read();
      const request: InventoryRequest = { ...command,
        ...((cache.generation ?? 0) ? { generation: cache.generation } : {}) };
      const existing = cache.pendingInventory.find(request => request.id === command.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(request)) throw new Error('Ключ операции уже занят другой командой.');
      const next = existing && (command.kind === 'saveProject' || command.kind === 'createProjectOrder'
        || isCatalogCommand(command) || isBusinessOrderCommand(command)) ? cache : apply(cache, command);
      persist(next, existing ? cache.pendingInventory : [...cache.pendingInventory, structuredClone(request)], cache.remoteInventoryRevision);
      return sync();
    }),
    sync: () => withLock(sync),
    acceptMaintenanceServerVersion: () => withLock(async () => {
      if (!transport?.loadFull || !storage.removeItem) throw new Error('Для принятия серверной базы нужна связь с сервером.');
      const cache = read();
      const full = await transport.loadFull();
      installCloudMaintenanceSnapshot(storage as Storage, ownerId, full, cache);
      return view(read());
    }),
    /** Accept current server facts while preserving rejected local order proposals for recovery. */
    acceptOrderServerVersion: () => withLock(async () => {
      if (!transport) throw new Error('Для разрешения конфликта нужна связь с сервером.');
      const checked = await sync();
      if (!checked.syncError?.includes('BUSINESS_ORDER_REVISION_CONFLICT')) return checked;
      const cache = read();
      const first = cache.pendingInventory[0];
      if (!first || !['saveBusinessOrder', 'restoreBusinessOrders'].includes(first.kind)) throw new Error('Сначала разрешите конфликт другой операции.');
      const remote = await transport.load();
      if (remote.user_id !== ownerId) throw new Error('Получены заказы другого пользователя.');
      const conflictedIds = first.kind === 'saveBusinessOrder' ? [first.order.id]
        : first.kind === 'restoreBusinessOrders' ? first.orderIds : [];
      const rejected = cache.pendingInventory.filter(request => request === first
        || request.kind === 'saveBusinessOrder' && conflictedIds.includes(request.order.id)
        || request.kind === 'restoreBusinessOrders' && request.orderIds.some(id => conflictedIds.includes(id)));
      const remaining = cache.pendingInventory.filter(request => !rejected.includes(request));
      let projected = structuredClone(remote);
      for (const request of remaining) {
        if (isLegacyOrderCommand(request)) break;
        try { projected = apply(projected, request, true); } catch { break; }
      }
      persist({ ...projected, orderConflictBackups: [...(cache.orderConflictBackups ?? []), {
        occurredAt: new Date().toISOString(), commands: rejected,
      }] } as PersistedInventory, remaining, remote.revision);
      return sync();
    }),
    /** Explicit server choice retains the rejected local templates in a recoverable backup. */
    acceptCatalogServerVersion: () => withLock(async () => {
      if (!transport) throw new Error('Для разрешения конфликта нужна связь с сервером.');
      const checked = await sync();
      if (!checked.syncError?.includes('BUSINESS_CATALOG_REVISION_CONFLICT')) return checked;
      const cache = read();
      const first = cache.pendingInventory[0];
      if (!first || !isCatalogCommand(first)) throw new Error('Сначала разрешите конфликт другой операции.');
      const remote = await transport.load();
      if (remote.user_id !== ownerId) throw new Error('Получен каталог другого пользователя.');
      const rejected = cache.pendingInventory.filter(request => request === first || first.kind === 'saveCatalogProduct'
        && request.kind === 'saveCatalogProduct' && request.product.id === first.product.id);
      const remaining = cache.pendingInventory.filter(request => !rejected.includes(request));
      let projected = structuredClone(remote);
      for (const request of remaining) {
        // The first rejection must be recoverable even if the next product also conflicts.
        // All remaining requests stay durable; normal sync reaches receipts before validation.
        if (isLegacyOrderCommand(request)) break;
        try { projected = apply(projected, request, true); } catch { break; }
      }
      persist({ ...projected, catalogConflictBackups: [...(cache.catalogConflictBackups ?? []), {
        occurredAt: new Date().toISOString(), commands: rejected,
      }] } as PersistedInventory, remaining, remote.revision);
      return sync();
    }),
    /** Explicit user choice after a revision conflict. Keep the rejected proposal as a recoverable backup. */
    resolveProjectConflict: (projectId: string) => withLock(async () => {
      if (!transport) throw new Error('Для разрешения конфликта нужна связь с сервером.');
      const checked = await sync();
      if (!checked.syncError?.includes('BUSINESS_PROJECT_REVISION_CONFLICT')) return checked;
      const cache = read();
      const first = cache.pendingInventory[0];
      if (first?.kind !== 'saveProject' || first.project.id !== projectId) throw new Error('Сначала разрешите конфликт другого проекта.');
      const remote = await transport.load();
      if (remote.user_id !== ownerId) throw new Error('Получен проект другого пользователя.');
      let projected = structuredClone(remote);
      const revised = cache.pendingInventory.map(request => {
        let next = structuredClone(request);
        if (next.kind === 'saveProject' && next.project.id === projectId) {
          next = { ...next, id: crypto.randomUUID(), project: { ...next.project,
            revision: projected.projects.find(project => project.id === projectId)?.revision ?? 0 } };
        }
        projected = apply(projected, next);
        return next;
      });
      const backups = cache.projectConflictBackups ?? [];
      const retained = { ...projected, projectConflictBackups: [...backups, {
        occurredAt: new Date().toISOString(), projectId, commands: cache.pendingInventory,
      }] };
      persist(retained, revised, remote.revision);
      const resolved = await sync();
      return { ...resolved, resolvedProjectId: projectId };
    }),
  };
}

export async function inventoryBrowserLock<T>(name: string, callback: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    throw new Error('Для безопасной работы склада откройте приложение по HTTPS или localhost в браузере с поддержкой Web Locks.');
  }
  return navigator.locks.request(`3d-labs:${name}`, callback);
}
