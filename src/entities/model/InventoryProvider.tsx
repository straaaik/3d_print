'use client';

import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useData } from './DataProvider';
import { InventoryContext } from './inventoryContext';
import { createInventoryRepository, inventoryBrowserLock, type BusinessCommand, type InventoryView } from '../../shared/api/inventoryRepository';
import { createInventoryTransport } from '../../shared/api/inventoryTransport';
import { drainLegacySyncQueue } from '../../shared/api/db';
import { foundationStorageKey } from '../../shared/lib/foundationStorage';
import { CockpitButton } from '../../shared/ui/CockpitButton';

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  // This provider sits outside its own context: these are the legacy bootstrap inputs.
  const { filaments, savedCalculations, orders, isLoading: dataLoading } = useData();
  const ownerId = currentUser?.id ?? 'anonymous';
  const activeOwner = useRef(ownerId);
  useLayoutEffect(() => { activeOwner.current = ownerId; }, [ownerId]);
  const [snapshot, setSnapshot] = useState<{ owner: string; view: InventoryView } | null>(null);
  const [failure, setFailure] = useState<{ owner: string; message: string } | null>(null);
  const repository = useMemo(() => createInventoryRepository({
    ownerId,
    storage: { getItem: key => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value), removeItem: (key: string) => window.localStorage.removeItem(key) },
    lock: inventoryBrowserLock,
    transport: /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(ownerId) ? createInventoryTransport(ownerId, drainLegacySyncQueue) : undefined,
  }), [ownerId]);
  const accept = useCallback((view: InventoryView) => {
    if (activeOwner.current === ownerId) {
      setSnapshot({ owner: ownerId, view });
      setFailure(null);
    }
  }, [ownerId]);
  const fail = useCallback((error: unknown) => {
    if (activeOwner.current === ownerId) setFailure({ owner: ownerId,
      message: error instanceof Error ? error.message : 'Не удалось открыть склад.' });
  }, [ownerId]);
  const reload = useCallback(async () => {
    if (dataLoading) return;
    try { accept(await repository.load(filaments, savedCalculations, orders)); }
    catch (error) { fail(error); }
  }, [repository, dataLoading, filaments, savedCalculations, orders, accept, fail]);
  useEffect(() => {
    let active = true;
    if (!dataLoading) repository.load(filaments, savedCalculations, orders).then(
      view => { if (active) accept(view); }, error => { if (active) fail(error); },
    );
    return () => { active = false; };
  }, [repository, dataLoading, filaments, savedCalculations, orders, accept, fail]);
  useEffect(() => {
    const refresh = () => { void repository.sync().then(accept, fail); };
    const localChanged = (event: Event) => {
      const detail = (event as CustomEvent<InventoryView>).detail;
      if (detail?.state.user_id === ownerId) accept(detail);
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key !== foundationStorageKey(ownerId)) return;
      try {
        const view = repository.inspect();
        setSnapshot(previous => activeOwner.current === ownerId ? { owner: ownerId,
          view: { ...view, syncError: previous?.owner === ownerId ? previous.view.syncError : null } } : previous);
      } catch (error) { fail(error); }
    };
    window.addEventListener('online', refresh);
    window.addEventListener('business_maintenance_updated', refresh);
    window.addEventListener('business_inventory_updated', localChanged);
    window.addEventListener('storage', storageChanged);
    return () => {
      window.removeEventListener('online', refresh);
      window.removeEventListener('business_maintenance_updated', refresh);
      window.removeEventListener('business_inventory_updated', localChanged);
      window.removeEventListener('storage', storageChanged);
    };
  }, [repository, ownerId, accept, fail]);
  const execute = useCallback(async (command: BusinessCommand) => {
    try {
      const view = await repository.execute(command);
      accept(view);
      return view;
    } catch (error) { fail(error); throw error; }
  }, [repository, accept, fail]);
  const resolveProjectConflict = useCallback(async (projectId: string) => {
    try {
      const view = await repository.resolveProjectConflict(projectId);
      accept(view);
      return view;
    } catch (error) { fail(error); throw error; }
  }, [repository, accept, fail]);
  const view = snapshot?.owner === ownerId ? snapshot.view : null;
  const error = failure?.owner === ownerId ? failure.message : view?.syncError ?? null;
  const acceptCatalogServerVersion = async () => {
    try { const result = await repository.acceptCatalogServerVersion(); accept(result); return result; }
    catch (error) { fail(error); throw error; }
  };
  const acceptOrderServerVersion = async () => {
    try { const result = await repository.acceptOrderServerVersion(); accept(result); return result; }
    catch (error) { fail(error); throw error; }
  };
  const acceptMaintenanceServerVersion = async () => {
    try { const result = await repository.acceptMaintenanceServerVersion(); accept(result); return result; }
    catch (error) { fail(error); throw error; }
  };
  return <InventoryContext.Provider value={{ state: view?.state ?? null,
    isLoading: dataLoading || (!view && !error), pendingCount: view?.pendingCount ?? 0,
    mode: view?.mode ?? 'local', error, execute, resolveProjectConflict, acceptCatalogServerVersion, acceptOrderServerVersion, acceptMaintenanceServerVersion, reload }}>
    {(error?.includes('BUSINESS_MAINTENANCE_REVISION_CONFLICT') || error?.includes('BUSINESS_GENERATION_CONFLICT')) && <div role="alert"
      className="m-3 rounded-lg border border-amber-400/30 bg-neutral-950 p-3 font-mono text-xs text-amber-300">
      <p>База изменена или восстановлена на другом устройстве. Локальная копия и очередь сохранены.
        Принятие серверной базы сохранит их в резервной копии и остановит старую очередь.</p>
      <CockpitButton onClick={() => { void acceptMaintenanceServerVersion().catch(() => undefined); }}>
        Принять серверную базу и сохранить локальную копию
      </CockpitButton>
    </div>}
    {error?.includes('BUSINESS_ORDER_REVISION_CONFLICT') && <div role="alert"
      className="m-3 rounded-lg border border-white/15 bg-neutral-950 p-3 font-mono text-xs text-amber-300">
      <p>Заказ изменён в другой вкладке. Локальное предложение сохранено. Примите серверную версию
        и откройте заказ заново для дальнейшего редактирования.</p>
      <CockpitButton onClick={() => { void acceptOrderServerVersion().catch(() => undefined); }}>
        Принять серверный заказ и сохранить локальную копию
      </CockpitButton>
    </div>}
    {error?.includes('BUSINESS_CATALOG_REVISION_CONFLICT') && <div role="alert"
      className="m-3 rounded-lg border border-amber-400/30 bg-neutral-950 p-3 font-mono text-xs text-amber-300">
      <p>Товар изменён в другой вкладке. Локальная версия сохранена. Примите серверную версию,
        затем откройте товар заново для дальнейшего редактирования.</p>
      <CockpitButton onClick={() => { void acceptCatalogServerVersion().catch(() => undefined); }}>
        Принять серверную версию и сохранить копию локальной
      </CockpitButton>
    </div>}
    {children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
}
