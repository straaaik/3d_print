import type { User } from '../../shared/types';

interface InitialAuthRenderState {
  currentUser: User | null;
  isLoading: boolean;
}

export interface DevSessionHydrationState {
  authenticateAsDev: boolean;
  clearLocalHint: boolean;
}

export function createInitialAuthRenderState(): InitialAuthRenderState {
  return {
    currentUser: null,
    isLoading: true,
  };
}

export function reconcileDevSessionHydration(
  hasServerSession: boolean,
  hasLocalHint: boolean
): DevSessionHydrationState {
  return {
    authenticateAsDev: hasServerSession,
    clearLocalHint: hasLocalHint && !hasServerSession,
  };
}

export function reconcilePartialProfileUser(currentUser: User, updatedEmail: string | null | undefined): User {
  return updatedEmail ? { ...currentUser, email: updatedEmail.toLowerCase() } : currentUser;
}
