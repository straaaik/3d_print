const ANONYMOUS_SCOPE = 'anonymous';
const SCOPE_EVENT = '3d-storage-scope-changed';
const LEGACY_OWNER_KEY = '3d_labs_legacy_storage_owner';

let activeScope = ANONYMOUS_SCOPE;

function normalizeScope(userId?: string | null): string {
  const trimmed = userId?.trim();
  return trimmed ? trimmed.replace(/[^a-zA-Z0-9_-]/g, '_') : ANONYMOUS_SCOPE;
}

export function getStorageScope(): string {
  return activeScope;
}

export function getScopedStorageKey(baseKey: string): string {
  return `${baseKey}::user:${activeScope}`;
}

export function getStorageScopeEventName(): string {
  return SCOPE_EVENT;
}

function shouldMigrateLegacyKey(key: string): boolean {
  if (key.includes('::user:')) return false;
  if (key === LEGACY_OWNER_KEY || key === '3d_dev_session') return false;
  if (key.startsWith('3d_auth_')) return false;
  return key.startsWith('3d_') || key.startsWith('table_');
}

/**
 * Однократно переносит прежний глобальный кэш в пространство первого
 * авторизованного пользователя. Последующие пользователи не получают доступ
 * к этим данным.
 */
function migrateLegacyStorage(userId: string): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(LEGACY_OWNER_KEY)) return;

  const legacyKeys = Object.keys(localStorage).filter(shouldMigrateLegacyKey);
  for (const legacyKey of legacyKeys) {
    const value = localStorage.getItem(legacyKey);
    if (value === null) continue;

    const scopedKey = `${legacyKey}::user:${userId}`;
    if (localStorage.getItem(scopedKey) === null) {
      localStorage.setItem(scopedKey, value);
    }
    localStorage.removeItem(legacyKey);
  }

  localStorage.setItem(LEGACY_OWNER_KEY, userId);
}

export function setStorageScope(userId?: string | null): void {
  const nextScope = normalizeScope(userId);
  if (nextScope !== ANONYMOUS_SCOPE) {
    migrateLegacyStorage(nextScope);
  }

  if (activeScope === nextScope) return;
  activeScope = nextScope;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SCOPE_EVENT, { detail: { scope: nextScope } }));
  }
}

