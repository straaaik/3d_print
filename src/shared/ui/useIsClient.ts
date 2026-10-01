'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Hydration-safe browser availability for portal components. */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
