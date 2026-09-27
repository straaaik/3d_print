import { getScopedStorageKey } from './storageScope';

export const PERSISTENT_STATE_EVENT = '3d-persistent-state-changed';

/** Clear only this user's values, and refresh any mounted persistent-state hooks. */
export function resetPersistentKeys(keys: readonly string[]): void {
  if (typeof window === 'undefined') return;
  for (const key of keys) {
    const resolvedKey = getScopedStorageKey(key);
    try {
      window.localStorage.removeItem(resolvedKey);
    } catch (error) {
      console.warn(`[persistentStorage] Failed to reset ${key}:`, error);
    }
    window.dispatchEvent(new CustomEvent(PERSISTENT_STATE_EVENT, { detail: { key: resolvedKey } }));
  }
}
