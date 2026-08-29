'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * SSR-безопасный React-хук для сохранения состояния в localStorage / sessionStorage.
 * Предотвращает ошибки гидратации Next.js и гарантирует актуальность данных при перезагрузке (F5).
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T | (() => T),
  storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const getDefault = (): T => {
    return typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue;
  };

  // Начальное состояние (при SSR используется defaultValue, на клиенте пробуем прочитать сразу)
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return getDefault();
    try {
      const storage = storageType === 'sessionStorage' ? window.sessionStorage : window.localStorage;
      const item = storage.getItem(key);
      if (item !== null) {
        return JSON.parse(item);
      }
    } catch (e) {
      console.warn(`[usePersistentState] Ошибка чтения ключа «${key}»:`, e);
    }
    return getDefault();
  });

  const isMountedRef = useRef(false);

  // Синхронизация на клиенте после монтирования (для защиты от SSR hydration mismatch)
  useEffect(() => {
    isMountedRef.current = true;
    try {
      const storage = storageType === 'sessionStorage' ? window.sessionStorage : window.localStorage;
      const item = storage.getItem(key);
      if (item !== null) {
        const parsed = JSON.parse(item);
        setState(parsed);
      }
    } catch (e) {
      console.warn(`[usePersistentState] Ошибка синхронизации ключа «${key}»:`, e);
    }
  }, [key, storageType]);

  // Сеттер с автоматической записью в storage
  const setPersistentState: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      setState((prev) => {
        const nextValue = typeof action === 'function' ? (action as (prevState: T) => T)(prev) : action;
        if (typeof window !== 'undefined') {
          try {
            const storage = storageType === 'sessionStorage' ? window.sessionStorage : window.localStorage;
            if (nextValue === undefined) {
              storage.removeItem(key);
            } else {
              storage.setItem(key, JSON.stringify(nextValue));
            }
          } catch (e) {
            console.warn(`[usePersistentState] Ошибка записи ключа «${key}»:`, e);
          }
        }
        return nextValue;
      });
    },
    [key, storageType]
  );

  // Удаление ключа и сброс к defaultValue
  const resetPersistentState = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const storage = storageType === 'sessionStorage' ? window.sessionStorage : window.localStorage;
        storage.removeItem(key);
      } catch (e) {
        console.warn(`[usePersistentState] Ошибка удаления ключа «${key}»:`, e);
      }
    }
    setState(getDefault());
  }, [key, defaultValue, storageType]);

  return [state, setPersistentState, resetPersistentState];
}
