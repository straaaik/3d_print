export type JsonStorage = Pick<Storage, 'getItem' | 'setItem'>;
const CACHE_VERSION = 1;

/** Sidecar version keeps raw JSON compatible with old clients and exported backups. */
export function readVersionedJson<T>(storage: JsonStorage, key: string, fallback: T): T {
  let raw: string | null;
  let version: number;
  try {
    raw = storage.getItem(key);
    version = Number(storage.getItem(`${key}::schema-version`) ?? 0);
  } catch { return fallback; }
  if (raw === null || !Number.isInteger(version) || version < 0 || version > CACHE_VERSION) return fallback;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return fallback; }
  if (version === CACHE_VERSION) return parsed as T;
  // Version 1 preserves legacy target fields. Materializing mode would freeze
  // old screens that still change target; the engine resolves it at calculation.
  const migrated = parsed;
  try {
    const backupKey = `${key}::before-v1`;
    if (storage.getItem(backupKey) === null) storage.setItem(backupKey, raw);
    storage.setItem(key, JSON.stringify(migrated));
    // Written last so interrupted writes can safely repeat the idempotent migration.
    storage.setItem(`${key}::schema-version`, String(CACHE_VERSION));
  } catch { /* Reads remain usable when storage is full or read-only. */ }
  return migrated as T;
}

/** Refuse writes when a fallback read concealed newer or corrupted source data. */
export function writeVersionedJson<T>(storage: JsonStorage, key: string, value: T): void {
  const version = Number(storage.getItem(`${key}::schema-version`) ?? 0);
  if (!Number.isInteger(version) || version < 0 || version > CACHE_VERSION) {
    throw new Error('Локальный кэш создан более новой версией приложения; запись отменена.');
  }
  const raw = storage.getItem(key);
  if (raw !== null) {
    try { JSON.parse(raw); } catch {
      throw new Error('Локальный кэш повреждён; исходные данные сохранены, запись отменена.');
    }
    if (version === 0 && storage.getItem(`${key}::before-v1`) === null) storage.setItem(`${key}::before-v1`, raw);
  }
  storage.setItem(key, JSON.stringify(value));
  storage.setItem(`${key}::schema-version`, String(CACHE_VERSION));
}
