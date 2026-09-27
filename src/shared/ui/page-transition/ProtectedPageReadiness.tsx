'use client';

import { useEffect } from 'react';
import { useAuth } from '../../../entities/model/AuthProvider';
import { useData } from '../../../entities/model/DataProvider';
import { usePageTransition } from './PageTransitionProvider';

export function ProtectedPageReadiness() {
  const { state, completeTask, fail } = usePageTransition();
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const { initialLoad } = useData();
  const active = state.phase === 'covering' || state.phase === 'loading';
  const protectedTarget = state.tasks.some(task => task.id.startsWith('data:'));
  useEffect(() => {
    if (!active || !protectedTarget || isLoading || !isAuthenticated) return;
    if (state.target.split(/[?#]/)[0] === '/admin' && !isAdmin) return;
    completeTask(state.id, 'auth');
    if (initialLoad.status === 'ready') {
      for (const task of initialLoad.completed) completeTask(state.id, `data:${task}`);
    }
    if (initialLoad.status === 'error') fail(state.id, 'Не удалось загрузить данные страницы');
  }, [active, protectedTarget, state.id, state.target, isLoading, isAuthenticated, isAdmin, initialLoad, completeTask, fail]);
  return null;
}
