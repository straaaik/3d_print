export type SnapshotStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type LocalSnapshotValues = Readonly<Record<string, string | null>>;

const defaultJournalKey = '3d_local_snapshot_journal';
type Entries = [string, string | null][];
interface Journal { version: 1; committed: boolean; before: Entries; after: Entries }

function entriesValid(value: unknown, journalKey: string): value is Entries {
  if (!Array.isArray(value)) return false;
  const keys = new Set<string>();
  return value.every(entry => {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string'
      || entry[0] === journalKey || keys.has(entry[0]) || (entry[1] !== null && typeof entry[1] !== 'string')) return false;
    keys.add(entry[0]); return true;
  });
}

function readJournal(raw: string, journalKey: string): Journal {
  let value: Partial<Journal> | null;
  try { value = JSON.parse(raw); } catch { throw new Error('Повреждён журнал локального восстановления.'); }
  if (!value || value.version !== 1 || typeof value.committed !== 'boolean'
    || !entriesValid(value.before, journalKey) || !entriesValid(value.after, journalKey)
    || value.before.length !== value.after.length
    || value.before.some(([key], index) => key !== value.after![index][0])) {
    throw new Error('Неверный формат журнала локального восстановления.');
  }
  return value as Journal;
}

function applyEntries(storage: SnapshotStorage, entries: Entries) {
  for (const [key, value] of entries) {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  }
}

function restoreEntries(storage: SnapshotStorage, entries: Entries) {
  // Free replacement values first. The previous snapshot plus its prepared journal
  // fit at preparation, so quota cannot be consumed by a larger partial replacement.
  for (const [key] of entries) storage.removeItem(key);
  applyEntries(storage, entries);
}

/** Call under the same owner-scoped lock used by readers and maintenance writers.
 * A prepared journal restores the old snapshot; a committed one finishes the new.
 * Failure preserves the journal so recovery can be retried without guessing.
 */
export function recoverLocalSnapshot(storage: SnapshotStorage, journalKey = defaultJournalKey): boolean {
  const raw = storage.getItem(journalKey);
  if (raw === null) return false;
  const journal = readJournal(raw, journalKey);
  restoreEntries(storage, journal.committed ? journal.after : journal.before);
  storage.removeItem(journalKey);
  return true;
}

/** Readers never recover a journal that another tab may still be writing. They
 * see the selected complete side of the journal for every covered key instead.
 * Readers requiring a stable multi-key view must also use the owner-scoped lock.
 */
export function readLocalSnapshotItem(storage: Pick<SnapshotStorage, 'getItem'>, key: string,
  journalKey = defaultJournalKey): string | null {
  const raw = storage.getItem(journalKey);
  if (raw === null) return storage.getItem(key);
  const journal = readJournal(raw, journalKey);
  const entry = (journal.committed ? journal.after : journal.before).find(([entryKey]) => entryKey === key);
  return entry ? entry[1] : storage.getItem(key);
}

/** Durable multi-key replacement. A failed prepare never touches application keys.
 * Storage operations are synchronous and individually atomic; a crash at any step
 * leaves an explicit old/new recovery decision in the journal.
 */
export function commitLocalSnapshot(storage: SnapshotStorage, values: LocalSnapshotValues,
  journalKey = defaultJournalKey): void {
  const after = Object.entries(values);
  if (!entriesValid(after, journalKey)) throw new Error('Неверные данные или ключ журнала локального восстановления.');
  recoverLocalSnapshot(storage, journalKey);
  if (after.length === 0) return;
  const journal: Journal = { version: 1, committed: false,
    before: after.map(([key]) => [key, storage.getItem(key)]), after };
  storage.setItem(journalKey, JSON.stringify(journal));
  try {
    applyEntries(storage, after);
    // Boolean literals true/false differ by one byte; preparation is the larger
    // value, so the commit marker needs no additional journal quota.
    storage.setItem(journalKey, JSON.stringify({ ...journal, committed: true }));
  } catch (error) {
    try { restoreEntries(storage, journal.before); storage.removeItem(journalKey); }
    catch { /* Leave prepared journal for the next recovery attempt. */ }
    throw error;
  }
  // Once the marker is durable, a cleanup error must never undo the committed data.
  storage.removeItem(journalKey);
}
