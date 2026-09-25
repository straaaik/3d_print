'use client';

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { usePageTransition } from '../../shared/ui/page-transition/PageTransitionProvider';
import { useData } from '../../entities/model/DataProvider';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { usePersistentState } from '../../shared/lib/usePersistentState';
import {
  OrdersSkeleton,
  CalculatorSkeleton,
  StatsSkeleton,
  ProductsSkeleton,
  FilamentsSkeleton,
  PrintersSkeleton
} from '../../shared/ui/CockpitSkeleton';
import {
  CockpitPanelTransition,
  commitCockpitHistoryIfCurrent,
  getCockpitTabFromPathname,
  getCockpitTransitionDirection,
  shouldHoldExpandedShell,
  shouldShowFullscreenDevelopmentGate,
} from '../../shared/ui/CockpitContentTransition';
import { FullscreenDevelopmentGate } from '../../shared/ui/FullscreenDevelopmentGate';
import { createWorkspaceComponents, workspaceDefinitions } from './workspaceDefinitions';
import { WorkspaceShellReadinessContext } from './WorkspaceReadyBoundary';

const {
  orders: OrdersTable,
  stats: StatsDashboard,
  calculator: Calculator,
  products: ProductsList,
  filaments: FilamentList,
  printers: PrinterList,
} = createWorkspaceComponents(dynamic);

export type CockpitTabId = 'orders' | 'stats' | 'calculator' | 'products' | 'filaments' | 'printers';

interface CockpitWorkspaceProps {
  initialTab: CockpitTabId;
}

export function CockpitWorkspace({ initialTab }: CockpitWorkspaceProps) {
  const { isLoading } = useData();
  const pathname = usePathname();
  const { state, navigate, registerWorkspace, completeTask } = usePageTransition();
  const transitionStateRef = useRef(state);
  useLayoutEffect(() => { transitionStateRef.current = state; }, [state]);
  const pathnameTab = getCockpitTabFromPathname(pathname);
  const resolvedInitialTab = pathnameTab ?? initialTab;
  const [activeTab, setActiveTab] = useState<CockpitTabId>(resolvedInitialTab);
  const [transitionDirection, setTransitionDirection] = useState<-1 | 0 | 1>(0);
  const [holdExpandedShell, setHoldExpandedShell] = useState(false);
  const [heldExpandedTab, setHeldExpandedTab] = useState<'orders' | 'products' | null>(null);
  const activeTabRef = useRef<CockpitTabId>(resolvedInitialTab);
  const pendingHistoryHrefRef = useRef<string | null>(null);
  const holdExpandedShellRef = useRef(false);
  const committedTransitionRef = useRef<number | null>(null);

  const [isOrdersExpanded, setIsOrdersExpanded, , ordersHydrated] = usePersistentState<boolean>('3d_orders_expanded_view', false);
  const [isProductsExpanded, setIsProductsExpanded, , productsHydrated] = usePersistentState<boolean>('3d_products_expanded_view', false);

  const isDestinationExpanded = (activeTab === 'orders' && isOrdersExpanded)
    || (activeTab === 'products' && isProductsExpanded);
  const isExpanded = holdExpandedShell || isDestinationExpanded;

  const selectTab = useCallback((nextTab: CockpitTabId) => {
    const currentTab = activeTabRef.current;
    if (nextTab === currentTab) return;

    if (!holdExpandedShellRef.current && shouldHoldExpandedShell(
      currentTab,
      nextTab,
      isOrdersExpanded,
      isProductsExpanded,
    )) {
      holdExpandedShellRef.current = true;
      setHoldExpandedShell(true);
      if (currentTab === 'orders' || currentTab === 'products') {
        setHeldExpandedTab(currentTab);
      }
    }

    setTransitionDirection(getCockpitTransitionDirection(currentTab, nextTab));
    activeTabRef.current = nextTab;
    setActiveTab(nextTab);
  }, [isOrdersExpanded, isProductsExpanded]);

  const releaseExpandedShell = useCallback(() => {
    if (holdExpandedShellRef.current) {
      holdExpandedShellRef.current = false;
      setHoldExpandedShell(false);
      setHeldExpandedTab(null);
    }
  }, []);

  useLayoutEffect(() => registerWorkspace({
    owns: (fromHref, toHref) => (
      getCockpitTabFromPathname(new URL(fromHref, window.location.origin).pathname) !== null
      && getCockpitTabFromPathname(new URL(toHref, window.location.origin).pathname) !== null
    ),
    commit: (href, transitionId) => {
      const nextTab = getCockpitTabFromPathname(new URL(href, window.location.origin).pathname);
      if (!nextTab) return;
      committedTransitionRef.current = transitionId;
      pendingHistoryHrefRef.current = transitionStateRef.current.kind === 'pop' ? null : href;
      selectTab(nextTab);
    },
    beforeReveal: (_href, transitionId) => {
      if (committedTransitionRef.current === transitionId) releaseExpandedShell();
    },
    complete: (href, transitionId) => {
      if (committedTransitionRef.current !== transitionId) return;
      const completedTab = getCockpitTabFromPathname(new URL(href, window.location.origin).pathname);
      if (!completedTab) return;
      const didCommitHistory = commitCockpitHistoryIfCurrent(
        completedTab,
        activeTabRef.current,
        pendingHistoryHrefRef.current,
        window.location.pathname,
        (target) => window.history.pushState(null, '', target),
      );
      if (didCommitHistory) pendingHistoryHrefRef.current = null;
      committedTransitionRef.current = null;
    },
  }), [registerWorkspace, releaseExpandedShell, selectTab]);

  useEffect(() => {
    if (state.phase !== 'idle' && state.target.split(/[?#]/, 1)[0] === `/${activeTab}`) {
      completeTask(state.id, 'route');
    }
  }, [activeTab, completeTask, state.id, state.phase, state.target]);

  const handleTabChange = useCallback((tabId: string) => {
    const nextTab = getCockpitTabFromPathname(`/${tabId}`);
    if (!nextTab || nextTab === activeTabRef.current) return;
    // Warming the one destination module does not mount it before the cover.
    void workspaceDefinitions[nextTab].load().catch(() => undefined);
    void navigate(`/${nextTab}`);
  }, [navigate]);

  const handleOrdersExpandedChange = useCallback((expanded: boolean) => {
    setIsOrdersExpanded(expanded);
    if (!expanded) {
      holdExpandedShellRef.current = false;
      setHoldExpandedShell(false);
      setHeldExpandedTab(null);
    }
  }, [setIsOrdersExpanded]);

  const handleProductsExpandedChange = useCallback((expanded: boolean) => {
    setIsProductsExpanded(expanded);
    if (!expanded) {
      holdExpandedShellRef.current = false;
      setHoldExpandedShell(false);
      setHeldExpandedTab(null);
    }
  }, [setIsProductsExpanded]);

  const closeExpandedView = useCallback(() => {
    const expandedTab = heldExpandedTab ?? activeTabRef.current;
    if (expandedTab === 'orders') handleOrdersExpandedChange(false);
    if (expandedTab === 'products') handleProductsExpandedChange(false);
  }, [handleOrdersExpandedChange, handleProductsExpandedChange, heldExpandedTab]);

  const fullscreenGateTab = heldExpandedTab
    ?? (isDestinationExpanded && (activeTab === 'orders' || activeTab === 'products') ? activeTab : null);
  const showFullscreenDevelopmentGate = fullscreenGateTab !== null && shouldShowFullscreenDevelopmentGate(
    fullscreenGateTab,
    true,
    process.env.NODE_ENV === 'production',
  );

  return (
    <div className={`min-h-screen bg-dot-grid text-white flex flex-col font-sans selection:bg-white/20 selection:text-white ${
      isExpanded ? 'p-3 sm:p-4 md:p-6 justify-start' : 'p-0 justify-between'
    }`}>
      <div
        className="contents"
        inert={showFullscreenDevelopmentGate ? true : undefined}
        aria-hidden={showFullscreenDevelopmentGate ? true : undefined}
      >
        <main className={`w-full mx-auto max-w-none ${
          isExpanded ? 'p-0 space-y-0' : 'px-3 sm:px-6 py-4 md:py-6 space-y-6'
        }`}>
          {/* Главный верхний таббар навигации (остается неподвижным) */}
          {!isExpanded && (
            <div className="flex justify-center">
              <MainNavbar activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          )}

          <WorkspaceShellReadinessContext.Provider value={ordersHydrated && productsHydrated}>
          <CockpitPanelTransition
            activeKey={activeTab}
            direction={transitionDirection}
            managed
          >
          {isLoading ? (
            <div>
              {activeTab === 'orders' && <OrdersSkeleton />}
              {activeTab === 'calculator' && <CalculatorSkeleton />}
              {activeTab === 'stats' && <StatsSkeleton />}
              {activeTab === 'products' && <ProductsSkeleton />}
              {activeTab === 'filaments' && <FilamentsSkeleton />}
              {activeTab === 'printers' && <PrintersSkeleton />}
            </div>
          ) : (
            <div className="w-full">
              {activeTab === 'orders' && (
                <OrdersTable
                  isExpanded={isOrdersExpanded}
                  onToggleExpand={handleOrdersExpandedChange}
                />
              )}
              {activeTab === 'stats' && <StatsDashboard />}
              {activeTab === 'calculator' && <Calculator />}
              {activeTab === 'products' && (
                <ProductsList
                  isExpanded={isProductsExpanded}
                  onToggleExpand={handleProductsExpandedChange}
                />
              )}
              {activeTab === 'filaments' && <FilamentList />}
              {activeTab === 'printers' && <PrinterList />}
            </div>
          )}
          </CockpitPanelTransition>
          </WorkspaceShellReadinessContext.Provider>
        </main>

        {!isExpanded && (
          <footer className="w-full text-center py-6 border-t border-white/10 select-none bg-neutral-950/80 backdrop-blur-md font-mono text-xs text-neutral-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>KUMO CRM · COCKPIT WORKSPACE v2.4</span>
              <span>АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ И СИНХРОНИЗАЦИЯ</span>
            </div>
          </footer>
        )}
      </div>

      {showFullscreenDevelopmentGate && fullscreenGateTab ? (
        <FullscreenDevelopmentGate
          section={fullscreenGateTab}
          onReturn={closeExpandedView}
          onHome={() => { void navigate('/'); }}
        />
      ) : null}
    </div>
  );
}
