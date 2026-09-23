'use client';

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { animate, motion, motionValue, useMotionValue, useReducedMotion, type MotionValue } from 'motion/react';
import { PageLoadingOverlay } from './PageLoadingOverlay';
import { initialTransitionState, transitionReducer, getRealProgress, canFinish,
  type TransitionEvent, type TransitionState, type NavigationKind, type NavigationOptions,
  type WorkspaceDriver, type PageTransitionApi, type TransitionTaskId, type CurtainHandler } from './model';
import { createRouteTasks, isPageNavigation, normalizePageHref } from './routePlan';

export const PAGE_TRANSITION_TIMING = { cover: 0.16, progress: 0.14, finish: 0.04, reveal: 0.30, reduced: 0.08, slow: 15_000 } as const;
export interface RuntimeApi extends PageTransitionApi {
  available: boolean;
  contentRef: React.RefObject<HTMLDivElement | null>;
  settleFallback: () => void;
  fill: MotionValue<number>;
  overlayOpacity: MotionValue<number>;
  contentOpacity: MotionValue<number>;
  realProgress: number;
  slow: boolean;
  retry: () => void;
  home: () => void;
}
interface Run {
  id: number;
  href: string;
  kind: NavigationKind;
  driver: WorkspaceDriver | null;
  commit: () => void;
  committed: boolean;
  prepared: boolean;
  controller: AbortController;
}
const Context = createContext<RuntimeApi | null>(null);
const fallbackMotion = motionValue(0);
const fallbackApi: RuntimeApi = {
  available: false, state: initialTransitionState, contentRef: { current: null },
  navigate: async () => false, completeTask: () => {}, fail: () => {}, prepareView: () => {},
  registerWorkspace: () => () => {}, registerGuard: () => () => {}, registerCurtain: () => () => {}, settleFallback: () => {},
  fill: fallbackMotion, overlayOpacity: fallbackMotion, contentOpacity: fallbackMotion, realProgress: 0, slow: false,
  retry: () => {}, home: () => {},
};
export const usePageTransition = () => useContext(Context) ?? fallbackApi;
const pageKey = (href: string) => normalizePageHref(href).split(/[?#]/)[0];

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const isHome = pathname === '/';
  // The server and first hydration frame must not advertise an already-ready page for non-home routes.
  const [state, setState] = useState<TransitionState>(() => (
    isHome ? initialTransitionState : { ...initialTransitionState, phase: 'covering' }
  ));
  const [slowId, setSlowId] = useState<number | null>(null);
  const stateRef = useRef(state);
  const sequence = useRef(0);
  const requestSequence = useRef(0);
  const runRef = useRef<Run | null>(null);
  const driverRef = useRef<WorkspaceDriver | null>(null);
  const guardRef = useRef<((href: string) => boolean | Promise<boolean>) | null>(null);
  const curtainHandlerRef = useRef<CurtainHandler | null>(null);
  const curtainTargetRef = useRef<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastPath = useRef<string | null>(null);
  const staleRouteTargets = useRef(new Set<string>());
  const overlayOpacity = useMotionValue(isHome ? 0 : 1);
  const contentOpacity = useMotionValue(isHome ? 1 : 0);
  const fill = useMotionValue(0);

  const dispatch = useCallback((event: TransitionEvent) => {
    const next = transitionReducer(stateRef.current, event);
    if (next !== stateRef.current) {
      stateRef.current = next;
      setState(next);
    }
  }, []);
  const current = useCallback((id: number) => runRef.current?.id === id && !runRef.current.controller.signal.aborted, []);
  const begin = useCallback((href: string, kind: NavigationKind, commit?: () => void, driver: WorkspaceDriver | null = null) => {
    const previous = runRef.current;
    if (previous?.committed && previous.kind === 'route' && stateRef.current.phase !== 'idle') {
      staleRouteTargets.current.add(pageKey(previous.href));
    }
    staleRouteTargets.current.delete(pageKey(href));
    runRef.current?.controller.abort();
    fill.stop();
    overlayOpacity.stop();
    contentOpacity.stop();
    const id = ++sequence.current;
    const run: Run = { id, href, kind, driver, commit: commit ?? (() => {}), committed: false, prepared: false, controller: new AbortController() };
    runRef.current = run;
    // Pop/initial render must be covered before the browser paints the incoming tree.
    if (kind === 'workspace') {
      if (stateRef.current.phase === 'idle') {
        overlayOpacity.set(0);
      }
      contentOpacity.set(1);
    } else if (kind === 'pop' || kind === 'bootstrap' || stateRef.current.phase !== 'idle') {
      overlayOpacity.set(1);
      contentOpacity.set(0);
    }
    fill.set(0);
    dispatch({ type: 'begin', id, target: href, kind, tasks: createRouteTasks(href) });
    return run;
  }, [dispatch, fill, overlayOpacity, contentOpacity]);

  const navigate = useCallback(async (href: string, options: NavigationOptions = {}) => {
    let target: string;
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol)) return false;
      target = normalizePageHref(url.pathname + url.search + url.hash);
    } catch { return false; }
    const requestId = ++requestSequence.current;
    const guard = guardRef.current ?? options.beforeNavigate;
    if (guard && !await guard(target)) return false;
    if (requestId !== requestSequence.current) return false;
    const from = window.location.pathname + window.location.search + window.location.hash;
    const isToHome = pageKey(target) === '/';
    const isFromHome = pageKey(from) === '/';
    if (isToHome || isFromHome) {
      if (pageKey(from) === pageKey(target)) return true;
      curtainTargetRef.current = pageKey(target);
      if (curtainHandlerRef.current) {
        return await curtainHandlerRef.current(target, options);
      }
      (options.replace ? router.replace : router.push)(target, { scroll: options.scroll });
      return true;
    }
    if (stateRef.current.phase !== 'idle' && runRef.current?.href === target) return true;
    if (!isPageNavigation(from, target) && stateRef.current.phase === 'idle') {
      if (from !== target) (options.replace ? router.replace : router.push)(target, { scroll: options.scroll });
      return true;
    }
    const driver = !options.replace && driverRef.current?.owns(from, target) ? driverRef.current : null;
    const kind = driver ? 'workspace' : 'route';
    const run = begin(target, kind, undefined, driver);
    run.commit = () => {
      if (driver) driver.commit(target, run.id);
      else (options.replace ? router.replace : router.push)(target, { scroll: options.scroll ?? true });
    };
    return true;
  }, [begin, router]);

  const completeTask = useCallback((id: number, task: TransitionTaskId) => dispatch({ type: 'complete', id, task }), [dispatch]);
  const fail = useCallback((id: number, message: string) => dispatch({ type: 'fail', id, message }), [dispatch]);
  const prepareView = useCallback((id: number, viewKey: string) => {
    const run = runRef.current;
    if (!run || run.id !== id || run.prepared || pageKey(run.href) !== pageKey(viewKey)) return;
    run.prepared = true;
    run.driver?.beforeReveal(run.href, id);
    dispatch({ type: 'view-prepared', id, viewKey: pageKey(viewKey) });
  }, [dispatch]);
  const registerWorkspace = useCallback((driver: WorkspaceDriver) => {
    driverRef.current = driver;
    return () => { if (driverRef.current === driver) driverRef.current = null; };
  }, []);
  const registerGuard = useCallback((guard: (href: string) => boolean | Promise<boolean>) => {
    guardRef.current = guard;
    return () => { if (guardRef.current === guard) guardRef.current = null; };
  }, []);
  const registerCurtain = useCallback((handler: CurtainHandler) => {
    curtainHandlerRef.current = handler;
    return () => { if (curtainHandlerRef.current === handler) curtainHandlerRef.current = null; };
  }, []);
  const settleFallback = useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    run.controller.abort();
    fill.stop();
    contentOpacity.set(1);
    overlayOpacity.set(0);
    dispatch({ type: 'cancel', id: run.id });
  }, [dispatch, fill, contentOpacity, overlayOpacity]);

  useLayoutEffect(() => {
    const href = window.location.pathname + window.location.search + window.location.hash;
    if (curtainTargetRef.current === pageKey(href) || pageKey(href) === '/') {
      curtainTargetRef.current = null;
      const isInitial = lastPath.current === null;
      lastPath.current = pathname;
      runRef.current?.controller.abort();
      fill.stop();
      overlayOpacity.stop();
      contentOpacity.stop();
      contentOpacity.set(1);
      overlayOpacity.set(0);
      if (isInitial) {
        const id = ++sequence.current;
        setState(prev => ({ ...initialTransitionState, id }));
        stateRef.current = { ...initialTransitionState, id };
      } else if (stateRef.current.phase !== 'idle') {
        dispatch({ type: 'cancel', id: stateRef.current.id });
      }
      return;
    }
    if (lastPath.current === null || runRef.current?.controller.signal.aborted) {
      lastPath.current = pathname;
      begin(normalizePageHref(href), 'bootstrap');
    } else if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      if (staleRouteTargets.current.has(pageKey(href))) return;
      if (!runRef.current || pageKey(runRef.current.href) !== pageKey(href) || stateRef.current.phase === 'idle') {
        begin(normalizePageHref(href), 'pop');
      }
    }
  }, [pathname, begin, contentOpacity, overlayOpacity, fill, dispatch]);

  useEffect(() => {
    const pop = () => {
      const target = normalizePageHref(window.location.pathname + window.location.search + window.location.hash);
      if (!isPageNavigation(lastPath.current ?? target, target)) return;
      if (pageKey(target) === '/' || pageKey(lastPath.current ?? '') === '/') {
        lastPath.current = window.location.pathname;
        contentOpacity.set(1);
        overlayOpacity.set(0);
        if (stateRef.current.phase !== 'idle') {
          dispatch({ type: 'cancel', id: stateRef.current.id });
        }
        return;
      }
      const driver = driverRef.current?.owns(lastPath.current ?? target, target) ? driverRef.current : null;
      const run = begin(target, 'pop', undefined, driver);
      run.commit = () => driver?.commit(target, run.id);
      lastPath.current = window.location.pathname;
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [begin, contentOpacity, overlayOpacity, dispatch]);

  useEffect(() => {
    if (state.phase !== 'covering') return;
    const run = runRef.current;
    if (!run || run.id !== state.id) return;
    const control = animate(overlayOpacity, 1, { duration: reduced ? PAGE_TRANSITION_TIMING.reduced : PAGE_TRANSITION_TIMING.cover });
    void control.finished.then(() => {
      if (!current(run.id) || run.committed) return;
      if (run.kind !== 'workspace') {
        contentOpacity.set(0);
      }
      run.committed = true;
      dispatch({ type: 'covered', id: run.id });
      run.commit();
    });
    return () => control.stop();
  }, [state.id, state.phase, overlayOpacity, contentOpacity, current, dispatch, reduced]);

  const progress = getRealProgress(state);
  useEffect(() => {
    if (state.phase !== 'error') return;
    fill.stop();
    const overlay = animate(overlayOpacity, 1, { duration: PAGE_TRANSITION_TIMING.cover });
    const content = animate(contentOpacity, 0, { duration: PAGE_TRANSITION_TIMING.cover });
    return () => { overlay.stop(); content.stop(); };
  }, [state.phase, state.id, fill, overlayOpacity, contentOpacity]);
  useEffect(() => {
    if (state.phase !== 'covering' && state.phase !== 'loading') return;
    const control = animate(fill, Math.min(progress, 0.97), { duration: reduced ? 0 : PAGE_TRANSITION_TIMING.progress, ease: 'easeOut' });
    return () => control.stop();
  }, [state.phase, progress, state.id, fill, reduced]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as unknown as { testLoading?: (ms?: number, autoNavigate?: boolean | string) => void }).testLoading = (ms = 3500, autoNavigate = true) => {
      (window as unknown as { __DEBUG_TRANSITION_DELAY?: number }).__DEBUG_TRANSITION_DELAY = ms;
      console.log(`%c[KUMO-CRM]%c Задержка перехода установлена на ${ms}мс!`, 'color: #06b6d4; font-weight: bold;', 'color: #e5e5e5;');
      if (autoNavigate) {
        let target = typeof autoNavigate === 'string' ? autoNavigate : '';
        if (!target) {
          const currentPath = window.location.pathname;
          target = currentPath.includes('calculator') ? '/orders' : '/calculator';
        }
        if (!target.startsWith('/')) target = '/' + target;
        console.log(`%c[KUMO-CRM]%c Автоматический переход на ${target}...`, 'color: #06b6d4; font-weight: bold;', 'color: #e5e5e5;');
        void navigate(target);
      } else {
        console.log(`%c[KUMO-CRM]%c Кликните на любую вкладку в меню (например, [Калькулятор] или [Статистика]), чтобы увидеть анимацию.`, 'color: #06b6d4; font-weight: bold;', 'color: #e5e5e5;');
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (!canFinish(state)) return;
    const debugDelay = typeof window !== 'undefined'
      ? ((window as unknown as { __DEBUG_TRANSITION_DELAY?: number }).__DEBUG_TRANSITION_DELAY
         ?? (new URLSearchParams(window.location.search).has('slow') ? 2500 : undefined))
      : undefined;

    if (debugDelay && debugDelay > 0) {
      const timer = window.setTimeout(() => dispatch({ type: 'finish', id: state.id }), debugDelay);
      return () => window.clearTimeout(timer);
    }
    dispatch({ type: 'finish', id: state.id });
  }, [state, dispatch]);
  useEffect(() => {
    if (state.phase !== 'finishing') return;
    const id = state.id;
    const control = animate(fill, 1, { duration: reduced ? 0 : PAGE_TRANSITION_TIMING.finish, ease: 'linear' });
    void control.finished.then(() => {
      if (!current(id) || stateRef.current.phase !== 'finishing') return;
      // No completed-label hold: fading starts in this very completion callback.
      dispatch({ type: 'fill-complete', id });
      const duration = reduced ? PAGE_TRANSITION_TIMING.reduced : PAGE_TRANSITION_TIMING.reveal;
      const cover = animate(overlayOpacity, 0, { duration });
      const content = runRef.current?.kind === 'workspace'
        ? { finished: Promise.resolve() }
        : animate(contentOpacity, 1, { duration });
      void Promise.all([cover.finished, content.finished]).then(() => {
        if (!current(id) || stateRef.current.phase !== 'revealing') return;
        const run = runRef.current!;
        // The driver's history event must see idle synchronously and not start another transition.
        dispatch({ type: 'reveal-complete', id });
        lastPath.current = pageKey(run.href);
        run.driver?.complete(run.href, id);

      });
    });
    return () => control.stop();
  }, [state.phase, state.id, fill, overlayOpacity, contentOpacity, current, dispatch, reduced]);

  const active = state.phase !== 'idle';
  useLayoutEffect(() => {
    const run = runRef.current;
    if (active || !run || run.kind === 'pop' || run.kind === 'bootstrap' || run.controller.signal.aborted) return;
    const main = contentRef.current?.querySelector<HTMLElement>('main, h1');
    if (!main) return;
    const old = main.getAttribute('tabindex');
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
    const restore = () => {
      if (old === null) main.removeAttribute('tabindex');
      else main.setAttribute('tabindex', old);
    };
    main.addEventListener('blur', restore, { once: true });
    return () => { main.removeEventListener('blur', restore); restore(); };
  }, [active, state.id]);
  useLayoutEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    const gutter = root.style.scrollbarGutter;
    root.style.scrollbarGutter = 'stable';
    root.style.overflow = 'hidden';
    return () => {
      if (root.style.overflow === 'hidden') root.style.overflow = overflow;
      if (root.style.scrollbarGutter === 'stable') root.style.scrollbarGutter = gutter;
    };
  }, [active]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setSlowId(state.id), PAGE_TRANSITION_TIMING.slow);
    return () => window.clearTimeout(timer);
  }, [active, state.id]);
  useEffect(() => () => {
    runRef.current?.controller.abort();
    fill.stop(); overlayOpacity.stop(); contentOpacity.stop();
  }, [fill, overlayOpacity, contentOpacity]);

  const retry = useCallback(() => {
    window.location.assign(runRef.current?.href ?? window.location.href);
  }, []);
  const home = useCallback(() => {
    void navigate('/');
  }, [navigate]);

  const api = useMemo<RuntimeApi>(() => ({
    available: true,
    state,
    navigate,
    completeTask,
    fail,
    prepareView,
    registerWorkspace,
    registerGuard,
    registerCurtain,
    contentRef,
    settleFallback,
    fill,
    overlayOpacity,
    contentOpacity,
    realProgress: progress,
    slow: slowId === state.id,
    retry,
    home,
  }), [state, navigate, completeTask, fail, prepareView, registerWorkspace, registerGuard, registerCurtain, settleFallback, fill, overlayOpacity, contentOpacity, progress, slowId, retry, home]);
  return <Context.Provider value={api}>
    <div data-transition-phase={state.phase} data-transition-id={state.id} data-transition-target={state.target}>
      <motion.div ref={contentRef} data-testid="page-transition-content" aria-busy={active}
        inert={active && state.kind !== 'workspace' ? true : undefined}
        aria-hidden={active && state.kind !== 'workspace' ? true : undefined}
        style={{ opacity: contentOpacity }}>
        {children}
      </motion.div>
      {active && state.kind !== 'workspace' && (
        <PageLoadingOverlay
          variant="standalone"
          progress={fill}
          opacity={overlayOpacity}
          realProgress={progress}
          phase={state.phase}
          error={state.error}
          slow={slowId === state.id}
          onRetry={retry}
          onHome={home}
        />
      )}
    </div>
  </Context.Provider>;
}
