'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../../../entities/model/AuthProvider';
import { useData } from '../../../entities/model/DataProvider';
import { usePageTransition } from './PageTransitionProvider';
import { usePageReadiness } from './usePageReadiness';

export function PublicPageReady({ viewKey, children }: { viewKey: string; children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isLoading } = useAuth();
  const { state, completeTask } = usePageTransition();
  useEffect(() => {
    if (!isLoading && state.target.split(/[?#]/)[0] === viewKey) completeTask(state.id, 'auth');
  }, [isLoading, state.id, state.target, viewKey, completeTask]);
  usePageReadiness({ viewKey, ready: !isLoading, rootRef });
  return <div ref={rootRef} className="contents">{children}</div>;
}

export function ProtectedPageReady({ viewKey, children }: { viewKey: string; children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isLoading, initialLoad } = useData();
  usePageReadiness({ viewKey, ready: !isLoading && initialLoad.status === 'ready', rootRef });
  return <div ref={rootRef} className="contents">{children}</div>;
}

/** Error/404 must remain usable even when a requested resource cannot finish. */
export function PageErrorReady() {
  const { settleFallback } = usePageTransition();
  useEffect(() => settleFallback(), [settleFallback]);
  return null;
}
