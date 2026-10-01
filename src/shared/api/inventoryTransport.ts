import { createClient } from '../../lib/supabase/client';
import { isFoundationState } from '../lib/foundationStorage';
import type { InventoryTransport } from './inventoryRepository';
import { isLegacyOrderCommand } from '../lib/legacyInventoryOrders';
import { isCatalogCommand } from '../lib/catalogCommands';
import { isBusinessOrderCommand } from '../lib/businessOrders';

export function createInventoryTransport(ownerId: string, beforeLoad?: () => Promise<void>): InventoryTransport {
  const client = createClient();
  const parse = (data: unknown, error: { code?: string; message: string } | null) => {
    if (error) {
      if (['PGRST202', 'PGRST205', '42P01'].includes(error.code ?? '')) {
        throw new Error('Изменения сохранены на этом устройстве. Для облачной синхронизации склада требуется SQL-миграция.');
      }
      throw new Error(error.message);
    }
    if (!isFoundationState(data, ownerId)) throw new Error('Сервер вернул некорректные данные склада; локальная копия сохранена.');
    return data;
  };
  return {
    async load() {
      await beforeLoad?.();
      const { data, error } = await client.rpc('business_inventory_snapshot').abortSignal(AbortSignal.timeout(8000));
      return parse(data, error);
    },
    async commit(revision, command, state) {
      if (isLegacyOrderCommand(command)) {
        const { data, error } = await client.rpc('business_apply_legacy_order', { p_command: command })
          .abortSignal(AbortSignal.timeout(8000));
        return parse(data, error);
      }
      const rpc = command.kind === 'createProjectOrder' || isBusinessOrderCommand(command) ? 'business_apply_order'
        : command.kind === 'saveProject' ? 'business_save_calculation_project'
        : isCatalogCommand(command) ? 'business_apply_catalog' : 'commit_business_inventory';
      const { data, error } = await client.rpc(rpc, {
        p_expected_revision: revision, p_command: command,
        p_state: { ...state,
          legacyOrders: state.legacyOrders?.map(({ items: _items, ...order }) => ({ ...order,
            order_revision: order.order_revision ?? 0, order_archived: order.order_archived ?? false })),
          orderItems: state.orderItems.map(row => ({ ...row, reserved_quantity: row.reserved_quantity ?? 0,
            returned_quantity: row.returned_quantity ?? 0, archived: row.archived ?? false })),
          calculationItems: state.calculationItems.map(row => ({ ...row, archived: row.archived ?? false })) },
      }).abortSignal(AbortSignal.timeout(8000));
      return parse(data, error);
    },
    async maintain(intent) {
      const { data, error } = await client.rpc('business_restore_snapshot', {
        p_expected_revision: intent.expectedRevision,
        p_command: { kind: 'restoreBusinessSnapshot', id: intent.id, occurredAt: intent.occurredAt, generation: intent.generation },
        p_snapshot: intent.snapshot,
      }).abortSignal(AbortSignal.timeout(15000));
      return parse(data, error);
    },
    async loadFull() {
      const { data, error } = await client.rpc('business_database_snapshot').abortSignal(AbortSignal.timeout(15000));
      if (error) throw new Error(error.message);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Некорректная полная серверная копия.');
      return data;
    },
  };
}
