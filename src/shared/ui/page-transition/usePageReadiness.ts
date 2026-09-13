'use client';

import { useEffect, type RefObject } from 'react';
import { usePageTransition } from './PageTransitionProvider';
import { waitForPageAssets, nextPageFrame, pageAssetSignature } from './waitForPageAssets';

export function usePageReadiness({ viewKey, ready, rootRef }: {
  viewKey: string; ready: boolean; rootRef: RefObject<HTMLElement | null>;
}) {
  const { state, completeTask, prepareView, fail } = usePageTransition();
  const active = state.phase === 'loading';
  const target = state.target.split(/[?#]/)[0];
  useEffect(() => {
    if (!active || !ready || target !== viewKey || !rootRef.current) return;
    completeTask(state.id, 'route');
    completeTask(state.id, 'module');
    prepareView(state.id, viewKey);
  }, [active, ready, target, state.id, viewKey, rootRef, completeTask, prepareView]);

  useEffect(() => {
    if (!active || !ready || target !== viewKey || state.preparedView !== viewKey || !rootRef.current) return;
    const root = rootRef.current;
    const controller = new AbortController();
    void (async () => {
      try {
        await nextPageFrame(controller.signal);
        let signature: string;
        do {
          await waitForPageAssets(root, controller.signal);
          signature = pageAssetSignature(root);
          await nextPageFrame(controller.signal);
          await nextPageFrame(controller.signal);
        } while (root.isConnected && signature !== pageAssetSignature(root));
        completeTask(state.id, 'assets');
        if (root.isConnected) completeTask(state.id, 'view');
      } catch {
        if (!controller.signal.aborted) fail(state.id, 'Не удалось подготовить страницу');
      }
    })();
    return () => controller.abort();
  }, [active, ready, target, state.id, state.preparedView, viewKey, rootRef, completeTask, fail]);
}
