'use client';

import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { getScopedStorageKey, getStorageScopeEventName } from './storageScope';

const PERSISTENT_STATE_EVENT = '3d-persistent-state-changed';

/**
 * SSR-безопасный React-хук для сохранения состояния в localStorage / sessionStorage.
 * Предотвращает ошибки гидратации Next.js и гарантирует актуальность данных при перезагрузке (F5).
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T | (() => T),
  storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const instanceId = useId();
  const [initialDefault] = useState<T>(() => (
    typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue
  ));
  const getDefault = useCallback((): T => initialDefault, [initialDefault]);

  const getResolvedKey = useCallback(
    () => getScopedStorageKey(key),
    [key]
  );

  // Сервер и первый клиентский рендер используют одно значение, что исключает
  // hydration mismatch. Содержимое storage подключается после монтирования.
  const [state, setState] = useState<T>(initialDefault);
  const stateRef = useRef(state);

  // Синхронизация на клиенте после монтирования (для защиты от SSR hydration mismatch)
  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const storage = storageType === 'sessionStorage' ? window.sessionStorage : window.localStorage;
        const item = storage.getItem(getResolvedKey());
        const nextValue = item !== null ? JSON.parse(item) as T : getDefault();
        stateRef.current = nextValue;
        setState(nextValue);
      } catch (e) {
        console.warn(`[usePersistentState] Ошибка синхронизации ключа «${key}»:`, e);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === getResolvedKey()) syncFromStorage();
    };
    const handleLocalChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; source?: string }>).detail;
      if (detail?.source === instanceId) return;
      if (!detail?.key || detail.key === getResolvedKey()) syncFromStorage();
    };

    syncFromStorage();
    window.addEventListener('storage', handleStorage);
    window.addEventListener(getStorageScopeEventName(), syncFromStorage);
    window.addEventListener(PERSISTENT_STATE_EVENT, handleLocalChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(getStorageScopeEventName(), syncFromStorage);
      window.removeEventListener(PERSISTENT_STATE_EVENT, handleLocalChange);
    };
  }, [getDefault, getResolvedKey, instanceId, key, storageType]);

  // Сеттер с автоматической записью в storage
  const setPersistentState: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      // React 19 может вычислять functional updater во время рендера. Поэтому
      // storage и синхронные события нельзя вызывать внутри setState(updater):
      // подписчик другого экземпляра хука попытается обновиться в render-фазе.
      const nextValue = typeof action === 'function'
        ? (action as (prevState: T) => T)(stateRef.current)
        : action;

      stateRef.current = nextValue;
      setState(nextValue);

      if (typeof window !== 'undefined') {
        try {
          const storage = storageType === 'sessionStorage' ? window.sessionStorage : window.localStorage;
          const resolvedKey = getResolvedKey();
          if (nextValue === undefined) {
            storage.removeItem(resolvedKey);
          } else {
            storage.setItem(resolvedKey, JSON.stringify(nextValue));
          }
          window.dispatchEvent(new CustomEvent(PERSISTENT_STATE_EVENT, {
            detail: { key: resolvedKey, source: instanceId },
          }));
        } catch (e) {
          console.warn(`[usePersistentState] Ошибка записи ключа «${key}»:`, e);
        }
      }
    },
    [getResolvedKey, instanceId, key, storageType]
  );

  // Удаление ключа и сброс к defaultValue
  const resetPersistentState = useCallback(() => {
    const defaultState = getDefault();
    stateRef.current = defaultState;
    setState(defaultState);

    if (typeof window !== 'undefined') {
      try {
        const storage = storageType === 'sessionStorage' ? window.sessionStorage : window.localStorage;
        const resolvedKey = getResolvedKey();
        storage.removeItem(resolvedKey);
        window.dispatchEvent(new CustomEvent(PERSISTENT_STATE_EVENT, {
          detail: { key: resolvedKey, source: instanceId },
        }));
      } catch (e) {
        console.warn(`[usePersistentState] Ошибка удаления ключа «${key}»:`, e);
      }
    }
  }, [getDefault, getResolvedKey, instanceId, key, storageType]);

  return [state, setPersistentState, resetPersistentState];
}
