'use client';

import { useMemo, useSyncExternalStore } from 'react';

export const BACKGROUND_STORAGE_KEY = '3dlabs.background.v1';
export const BACKGROUND_OPTIONS = [
  { id: 'dots', name: 'Точки', description: 'Мягкий водяной след за мышью и затухающая рябь при клике.' },
  { id: 'crosses', name: 'Крестики', description: 'Метки плавно поворачиваются и слегка тянутся к мыши. Без подсветки.' },
  { id: 'none', name: 'Графит', description: 'Однотонный фон для полного сосредоточения.' },
] as const;
export type BackgroundVariant = typeof BACKGROUND_OPTIONS[number]['id'];
export interface BackgroundPreferences {
  variant: BackgroundVariant;
  contrast: 'quiet' | 'balanced' | 'clear';
  interactive: boolean;
}
export const DEFAULT_BACKGROUND: BackgroundPreferences = {
  variant: 'dots', contrast: 'balanced', interactive: true,
};

export function parseBackgroundPreferences(raw: string | null): BackgroundPreferences {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return DEFAULT_BACKGROUND;
    return {
      variant: BACKGROUND_OPTIONS.some(option => option.id === value.variant) ? value.variant : DEFAULT_BACKGROUND.variant,
      contrast: ['quiet', 'balanced', 'clear'].includes(value.contrast) ? value.contrast : DEFAULT_BACKGROUND.contrast,
      interactive: typeof value.interactive === 'boolean' ? value.interactive : DEFAULT_BACKGROUND.interactive,
    };
  } catch { return DEFAULT_BACKGROUND; }
}

const listeners = new Set<() => void>();
let memoryValue: string | null = null;
let memoryOnly = false;
function getSnapshot(): string | null {
  if (memoryOnly) return memoryValue;
  try { return window.localStorage.getItem(BACKGROUND_STORAGE_KEY); }
  catch { return memoryValue; }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === BACKGROUND_STORAGE_KEY || event.key === null) {
      memoryOnly = false;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
const serverSnapshot = () => null;

/** Device-local visual preference; business data and cloud settings stay separate. */
export function useBackgroundPreferences() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const preferences = useMemo(() => parseBackgroundPreferences(raw), [raw]);
  const update = (patch: Partial<BackgroundPreferences>): boolean => {
    memoryValue = JSON.stringify({ ...parseBackgroundPreferences(getSnapshot()), ...patch });
    try {
      window.localStorage.setItem(BACKGROUND_STORAGE_KEY, memoryValue);
      memoryOnly = false;
    } catch { memoryOnly = true; }
    listeners.forEach(listener => listener());
    return !memoryOnly;
  };
  return { preferences, update };
}
