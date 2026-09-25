'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useData } from '../../entities/model/DataProvider';
import { usePageTransition } from '../../shared/ui/page-transition/PageTransitionProvider';
import { usePageReadiness } from '../../shared/ui/page-transition/usePageReadiness';
import type { CockpitTabId } from './CockpitWorkspace';

export const WorkspaceShellReadinessContext = createContext(true);

/** This boundary is part of the resolved module, never its dynamic fallback. */
export function WorkspaceReadyBoundary({ tab, children }: { tab: CockpitTabId; children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isLoading, initialLoad } = useData();
  const shellReady = useContext(WorkspaceShellReadinessContext);
  const { state, completeTask } = usePageTransition();
  const viewKey = `/${tab}`;

  useEffect(() => {
    if (state.phase !== 'idle' && state.target.split(/[?#]/, 1)[0] === viewKey) {
      completeTask(state.id, 'module');
    }
  }, [completeTask, state.id, state.phase, state.target, viewKey]);

  usePageReadiness({ viewKey, ready: !isLoading && initialLoad.status === 'ready' && shellReady, rootRef });
  return <div ref={rootRef} className="w-full" data-workspace-ready={tab}>{children}</div>;
}
