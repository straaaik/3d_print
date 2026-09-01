'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useData } from '../../entities/model/DataProvider';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { usePersistentState } from '../../shared/lib/usePersistentState';
import { OrdersTable } from '../Orders/OrdersTable';
import { Calculator } from '../Calculator/Calculator';
import { StatsDashboard } from '../Stats/StatsDashboard';
import { ProductsList } from '../ProductsList/ProductsList';
import { FilamentList } from '../FilamentList/FilamentList';
import { PrinterList } from '../PrinterList/PrinterList';
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
  getCockpitTransitionDirection,
  queueCockpitHistoryPush,
} from '../../shared/ui/CockpitContentTransition';

export type CockpitTabId = 'orders' | 'stats' | 'calculator' | 'products' | 'filaments' | 'printers';

interface CockpitWorkspaceProps {
  initialTab: CockpitTabId;
}

export function CockpitWorkspace({ initialTab }: CockpitWorkspaceProps) {
  const { isLoading } = useData();
  const [activeTab, setActiveTab] = useState<CockpitTabId>(initialTab);
  const [transitionDirection, setTransitionDirection] = useState<-1 | 0 | 1>(0);
  const activeTabRef = useRef<CockpitTabId>(initialTab);
  const historySyncTimerRef = useRef<number | null>(null);
  
  const [isOrdersExpanded, setIsOrdersExpanded] = usePersistentState<boolean>('3d_orders_expanded_view', false);
  const [isProductsExpanded, setIsProductsExpanded] = usePersistentState<boolean>('3d_products_expanded_view', false);

  const isExpanded = (activeTab === 'orders' && isOrdersExpanded) || (activeTab === 'products' && isProductsExpanded);

  const selectTab = useCallback((nextTab: CockpitTabId) => {
    const currentTab = activeTabRef.current;
    if (nextTab === currentTab) return;

    setTransitionDirection(getCockpitTransitionDirection(currentTab, nextTab));
    activeTabRef.current = nextTab;
    setActiveTab(nextTab);
  }, []);

  useEffect(() => {
    selectTab(initialTab);
  }, [initialTab, selectTab]);

  const cancelPendingHistorySync = useCallback(() => {
    if (historySyncTimerRef.current === null) return;
    window.clearTimeout(historySyncTimerRef.current);
    historySyncTimerRef.current = null;
  }, []);

  useEffect(() => cancelPendingHistorySync, [cancelPendingHistorySync]);

  useEffect(() => {
    const handlePopState = () => {
      cancelPendingHistorySync();
      const path = window.location.pathname.replace('/', '') as CockpitTabId;
      if (path && ['orders', 'stats', 'calculator', 'products', 'filaments', 'printers'].includes(path)) {
        selectTab(path);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [cancelPendingHistorySync, selectTab]);

  const handleTabChange = useCallback((tabId: string) => {
    const nextTab = tabId as CockpitTabId;
    if (nextTab === activeTabRef.current) return;

    cancelPendingHistorySync();
    selectTab(nextTab);

    // Next.js 16 перехватывает pushState и запускает маршрутный рендер. Сначала
    // завершаем локальную анимацию, затем синхронизируем адрес без визуального рывка.
    historySyncTimerRef.current = queueCockpitHistoryPush(
      `/${nextTab}`,
      (href) => window.history.pushState(null, '', href),
      (task, delayMs) => window.setTimeout(task, delayMs),
    );
  }, [cancelPendingHistorySync, selectTab]);

  return (
    <div className={`min-h-screen bg-dot-grid text-white flex flex-col font-sans selection:bg-white/20 selection:text-white ${
      isExpanded ? 'p-3 sm:p-4 md:p-6 justify-start' : 'p-0 justify-between'
    }`}>
      <main className={`w-full mx-auto max-w-none ${
        isExpanded ? 'p-0 space-y-0' : 'px-3 sm:px-6 py-4 md:py-6 space-y-6'
      }`}>
        {/* Главный верхний таббар навигации (остается неподвижным) */}
        {!isExpanded && (
          <div className="flex justify-center">
            <MainNavbar activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        )}

        <CockpitPanelTransition activeKey={activeTab} direction={transitionDirection}>
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
                  onToggleExpand={setIsOrdersExpanded} 
                />
              )}
              {activeTab === 'stats' && <StatsDashboard />}
              {activeTab === 'calculator' && <Calculator />}
              {activeTab === 'products' && (
                <ProductsList 
                  isExpanded={isProductsExpanded} 
                  onToggleExpand={setIsProductsExpanded} 
                />
              )}
              {activeTab === 'filaments' && <FilamentList />}
              {activeTab === 'printers' && <PrinterList />}
            </div>
          )}
        </CockpitPanelTransition>
      </main>

      {!isExpanded && (
        <footer className="w-full text-center py-6 border-t border-white/10 select-none bg-neutral-950/80 backdrop-blur-md font-mono text-xs text-neutral-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>§ 3D LABS · COCKPIT WORKSPACE v2.4</span>
            <span>ДАННЫЕ СОХРАНЯЮТСЯ В LOCALSTORAGE И SUPABASE</span>
          </div>
        </footer>
      )}
    </div>
  );
}
