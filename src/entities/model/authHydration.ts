import type { User } from '../../shared/types';

interface InitialAuthRenderState {
  currentUser: User | null;
  isLoading: boolean;
}

export function createInitialAuthRenderState(): InitialAuthRenderState {
  return {
    currentUser: null,
    isLoading: true,
  };
}
