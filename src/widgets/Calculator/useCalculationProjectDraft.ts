'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { calculationDraftKey, createCalculationDraft, readCalculationDraft, writeCalculationDraft,
  type CalculationDraft, type CalculatorFormDraft } from '../../shared/lib/calculationDraft';

/** Draft edits use one versioned record; storage work never runs inside a React updater. */
export function useCalculationProjectDraft(ownerId: string, ready: boolean, initialForm: CalculatorFormDraft) {
  const initial = useRef(initialForm);
  const activeOwner = useRef(ownerId);
  const current = useRef<{ owner: string; draft: CalculationDraft } | null>(null);
  const [snapshot, setSnapshot] = useState<{ owner: string; draft: CalculationDraft } | null>(null);
  const [failure, setFailure] = useState<{ owner: string; message: string } | null>(null);
  useLayoutEffect(() => { initial.current = initialForm; activeOwner.current = ownerId; }, [initialForm, ownerId]);
  useEffect(() => {
    if (!ready || ownerId === 'anonymous') return;
    const read = () => {
      try {
        const stored = readCalculationDraft(window.localStorage, ownerId);
        const draft = stored ?? createCalculationDraft(ownerId, initial.current);
        if (!stored) writeCalculationDraft(window.localStorage, draft);
        if (activeOwner.current !== ownerId) return;
        current.current = { owner: ownerId, draft };
        setSnapshot(current.current);
        setFailure(null);
      } catch (error) {
        if (activeOwner.current !== ownerId) return;
        current.current = null;
        setSnapshot(null);
        setFailure({ owner: ownerId, message: error instanceof Error ? error.message : 'Черновик проекта недоступен.' });
      }
    };
    const changed = (event: StorageEvent) => { if (event.key === calculationDraftKey(ownerId)) read(); };
    read();
    window.addEventListener('storage', changed);
    window.addEventListener('business_maintenance_updated', read);
    return () => {
      window.removeEventListener('storage', changed);
      window.removeEventListener('business_maintenance_updated', read);
    };
  }, [ownerId, ready]);
  const update = useCallback((change: CalculationDraft | ((draft: CalculationDraft) => CalculationDraft)) => {
    const previous = current.current;
    if (!previous || previous.owner !== ownerId || activeOwner.current !== ownerId) return;
    try {
      const draft = typeof change === 'function' ? change(previous.draft) : change;
      if (draft.user_id !== ownerId) throw new Error('Проект другого пользователя.');
      writeCalculationDraft(window.localStorage, draft);
      current.current = { owner: ownerId, draft };
      setSnapshot(current.current);
      setFailure(null);
    } catch (error) {
      setFailure({ owner: ownerId, message: error instanceof Error ? error.message : 'Не удалось сохранить черновик проекта.' });
    }
  }, [ownerId]);
  return { draft: snapshot?.owner === ownerId ? snapshot.draft : null, update,
    error: failure?.owner === ownerId ? failure.message : null };
}
