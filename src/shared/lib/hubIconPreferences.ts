'use client';

import { useMemo, useSyncExternalStore } from 'react';

export const HUB_ICON_STORAGE_KEY = '3dlabs.hub_icons_style.v1';

export const HUB_ICON_STYLES = [
  {
    id: 'cyber',
    name: '3D CAD Cyber',
    tag: 'HIGH-TECH',
    badge: 'Новый стиль',
    description: 'Матовый тёмный графит, дымчатый полупрозрачный акрил, золотистая латунь и бирюзовая неоновая подсветка.',
    previewIcons: ['calculator', 'products', 'filaments'],
  },
  {
    id: 'classic',
    name: 'Классический 3D',
    tag: 'ORIGINAL',
    badge: 'Версия 1.0',
    description: 'Оригинальные мягкие матовые 3D-модели студийного рендера первой версии интерфейса.',
    previewIcons: ['calculator', 'products', 'filaments'],
  },
] as const;

export type HubIconStyle = (typeof HUB_ICON_STYLES)[number]['id'];

export const DEFAULT_HUB_ICON_STYLE: HubIconStyle = 'cyber';

export function parseHubIconStyle(raw: string | null): HubIconStyle {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value && typeof value === 'object' && typeof value.style === 'string') {
      if (HUB_ICON_STYLES.some((s) => s.id === value.style)) {
        return value.style as HubIconStyle;
      }
    }
    // Также поддерживаем прямое строковое значение
    if (typeof value === 'string' && HUB_ICON_STYLES.some((s) => s.id === value)) {
      return value as HubIconStyle;
    }
    return DEFAULT_HUB_ICON_STYLE;
  } catch {
    return DEFAULT_HUB_ICON_STYLE;
  }
}

export function getHubIconSrc(sectionId: string, style: HubIconStyle = 'cyber'): string {
  const safeStyle: HubIconStyle = HUB_ICON_STYLES.some((s) => s.id === style) ? style : DEFAULT_HUB_ICON_STYLE;
  return `/images/hub/${safeStyle}/${sectionId}.png`;
}

const listeners = new Set<() => void>();
let memoryValue: string | null = null;
let memoryOnly = false;

function getSnapshot(): string | null {
  if (memoryOnly) return memoryValue;
  try {
    return window.localStorage.getItem(HUB_ICON_STORAGE_KEY);
  } catch {
    return memoryValue;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === HUB_ICON_STORAGE_KEY || event.key === null) {
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

/** Device-local visual preference for hub 3D icons style */
export function useHubIconPreferences() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const style = useMemo(() => parseHubIconStyle(raw), [raw]);

  const setStyle = (newStyle: HubIconStyle): boolean => {
    memoryValue = JSON.stringify({ style: newStyle });
    try {
      window.localStorage.setItem(HUB_ICON_STORAGE_KEY, memoryValue);
      memoryOnly = false;
    } catch {
      memoryOnly = true;
    }
    listeners.forEach((listener) => listener());
    return !memoryOnly;
  };

  return { style, setStyle };
}
