export type TransitionPhase = 'idle' | 'covering' | 'loading' | 'finishing' | 'revealing' | 'error';
export type NavigationKind = 'route' | 'workspace' | 'bootstrap' | 'pop';
export type TransitionTaskId =
  | 'route' | 'auth' | 'module' | 'view' | 'assets'
  | `data:${'connection' | 'settings' | 'filaments' | 'printers' | 'savedCalculations' | 'collections' | 'orders' | 'monthlyGoals'}`;
export interface TaskDefinition { id: TransitionTaskId; weight: number }
export interface TransitionState {
  id: number;
  target: string;
  kind: NavigationKind;
  phase: TransitionPhase;
  tasks: ReadonlyArray<TaskDefinition>;
  completed: ReadonlySet<TransitionTaskId>;
  covered: boolean;
  preparedView: string | null;
  error: string | null;
}
export type TransitionEvent =
  | { type: 'begin'; id: number; target: string; kind: NavigationKind; tasks: ReadonlyArray<TaskDefinition> }
  | { type: 'complete'; id: number; task: TransitionTaskId }
  | { type: 'view-prepared'; id: number; viewKey: string }
  | { type: 'covered' | 'finish' | 'fill-complete' | 'reveal-complete' | 'cancel'; id: number }
  | { type: 'fail'; id: number; message: string };
export interface NavigationOptions {
  replace?: boolean;
  scroll?: boolean;
  beforeNavigate?: (href: string) => boolean | Promise<boolean>;
}
export interface WorkspaceDriver {
  owns: (fromHref: string, toHref: string) => boolean;
  commit: (href: string, transitionId: number) => void;
  beforeReveal: (href: string, transitionId: number) => void;
  complete: (href: string, transitionId: number) => void;
}
export type CurtainHandler = (target: string, options?: NavigationOptions) => Promise<boolean>;

export interface PageTransitionApi {
  state: TransitionState;
  navigate: (href: string, options?: NavigationOptions) => Promise<boolean>;
  completeTask: (id: number, task: TransitionTaskId) => void;
  fail: (id: number, message: string) => void;
  prepareView: (id: number, viewKey: string) => void;
  registerWorkspace: (driver: WorkspaceDriver) => () => void;
  registerGuard: (guard: (href: string) => boolean | Promise<boolean>) => () => void;
  registerCurtain?: (handler: CurtainHandler) => () => void;
}

export const initialTransitionState: TransitionState = {
  id: 0, target: '', kind: 'bootstrap', phase: 'idle', tasks: [],
  completed: new Set<TransitionTaskId>(), covered: false, preparedView: null, error: null,
};

export function getRealProgress(state: TransitionState): number {
  const total = state.tasks.reduce((sum, task) => sum + task.weight, 0);
  if (total === 0) return 0;
  const done = state.tasks.reduce((sum, task) => sum + (state.completed.has(task.id) ? task.weight : 0), 0);
  return Math.min(1, Math.max(0, done / total));
}

export function canFinish(state: TransitionState): boolean {
  return state.covered && state.phase === 'loading' && state.error === null
    && state.tasks.length > 0 && state.tasks.every(task => state.completed.has(task.id));
}

export function transitionReducer(state: TransitionState, event: TransitionEvent): TransitionState {
  if (event.type === 'begin') {
    if (event.id <= state.id) return state;
    return {
      id: event.id, target: event.target, kind: event.kind, phase: 'covering',
      tasks: event.tasks.map(task => ({ ...task })), completed: new Set<TransitionTaskId>(),
      covered: false, preparedView: null, error: null,
    };
  }
  if (event.id !== state.id || state.phase === 'idle') return state;
  switch (event.type) {
    case 'complete':
      if ((state.phase !== 'covering' && state.phase !== 'loading')
        || state.completed.has(event.task) || !state.tasks.some(task => task.id === event.task)) return state;
      return { ...state, completed: new Set([...state.completed, event.task]) };
    case 'view-prepared':
      if ((state.phase !== 'covering' && state.phase !== 'loading') || state.preparedView === event.viewKey) return state;
      return { ...state, preparedView: event.viewKey };
    case 'covered':
      return state.phase === 'covering' ? { ...state, covered: true, phase: 'loading' } : state;
    case 'finish':
      return canFinish(state) ? { ...state, phase: 'finishing' } : state;
    case 'fill-complete':
      return state.phase === 'finishing' ? { ...state, phase: 'revealing' } : state;
    case 'reveal-complete':
      return state.phase === 'revealing' ? { ...state, phase: 'idle' } : state;
    case 'fail':
      return { ...state, phase: 'error', error: event.message };
    case 'cancel':
      return { ...state, phase: 'idle', error: null };
  }
}
