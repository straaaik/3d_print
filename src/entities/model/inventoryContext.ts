import { createContext } from 'react';
import type { FoundationState } from '../../shared/types/foundation';
import type { BusinessCommand, InventoryView } from '../../shared/api/inventoryRepository';

export interface InventoryContextValue {
  state: FoundationState | null;
  isLoading: boolean;
  pendingCount: number;
  error: string | null;
  mode: 'cloud' | 'local';
  execute: (command: BusinessCommand) => Promise<InventoryView>;
  resolveProjectConflict: (projectId: string) => Promise<InventoryView>;
  acceptCatalogServerVersion: () => Promise<InventoryView>;
  acceptOrderServerVersion: () => Promise<InventoryView>;
  acceptMaintenanceServerVersion?: () => Promise<InventoryView>;
  reload: () => Promise<void>;
}
export const InventoryContext = createContext<InventoryContextValue | null>(null);
