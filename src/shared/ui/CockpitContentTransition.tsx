'use client';

import React, { createContext, useContext, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react';

export type CockpitTransitionTab = 'orders' | 'stats' | 'calculator' | 'products' | 'filaments' | 'printers';

const COCKPIT_TAB_ORDER: readonly CockpitTransitionTab[] = [
  'orders',
  'stats',
  'calculator',
  'products',
  'filaments',
  'printers',
];

const COCKPIT_TAB_LABELS: Record<CockpitTransitionTab, string> = {
  orders: 'Заказы',
  stats: 'Статистика',
  calculator: 'Калькулятор',
  products: 'Товары',
  filaments: 'Филаменты',
  printers: 'Принтеры',
};

export function getCockpitTabFromPathname(pathname: string): CockpitTransitionTab | null {
  const segment = pathname.split('/').filter(Boolean)[0];
  return COCKPIT_TAB_ORDER.includes(segment as CockpitTransitionTab)
    ? segment as CockpitTransitionTab
    : null;
}

export function getCockpitTransitionDirection(
  currentTab: CockpitTransitionTab,
  nextTab: CockpitTransitionTab,
) {
  const currentIndex = COCKPIT_TAB_ORDER.indexOf(currentTab);
  const nextIndex = COCKPIT_TAB_ORDER.indexOf(nextTab);

  if (currentIndex === nextIndex) return 0;
  return nextIndex > currentIndex ? 1 : -1;
}

export function commitCockpitHistoryIfCurrent(
  completedTab: CockpitTransitionTab,
  currentTab: CockpitTransitionTab,
  pendingHref: string | null,
  currentPathname: string,
  push: (href: string) => void,
) {
  if (!pendingHref || completedTab !== currentTab) return false;
  const normalizePathname = (value: string) => {
    const pathname = value.split(/[?#]/, 1)[0] || '/';
    return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  };

  if (normalizePathname(pendingHref) !== normalizePathname(currentPathname)) {
    push(pendingHref);
  }
  return true;
}

export function isCockpitVisibleAnimation(definition: unknown) {
  return definition === 'visible';
}

export function shouldHoldExpandedShell(
  currentTab: CockpitTransitionTab,
  nextTab: CockpitTransitionTab,
  isOrdersExpanded: boolean,
  isProductsExpanded: boolean,
) {
  if (currentTab === nextTab) return false;
  return (currentTab === 'orders' && isOrdersExpanded)
    || (currentTab === 'products' && isProductsExpanded);
}

export function shouldShowFullscreenDevelopmentGate(
  activeTab: CockpitTransitionTab,
  isExpanded: boolean,
  isProduction: boolean,
) {
  return isProduction
    && isExpanded
    && (activeTab === 'orders' || activeTab === 'products');
}

interface CockpitTransitionContextType {
  tabPhase: 'idle' | 'covering' | 'revealing';
  switchTab: (href: string) => void;
  isTabTransitioning: boolean;
}

const CockpitTransitionContext = createContext<CockpitTransitionContextType>({
  tabPhase: 'idle',
  switchTab: () => {},
  isTabTransitioning: false,
});

export const useCockpitTransition = () => useContext(CockpitTransitionContext);

export function CockpitTransitionProvider({ children }: { children: React.ReactNode }) {
  return (
    <CockpitTransitionContext.Provider value={{ tabPhase: 'idle', switchTab: () => {}, isTabTransitioning: false }}>
      {children}
    </CockpitTransitionContext.Provider>
  );
}

interface CockpitContentTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Анимация №01: «Мягкий подъем и растворение» (Fade & Elevation)
 * Строго изолирована внутри рабочего блока консоли (не затрагивает навбар, шапку с точками и рамку).
 */
export function CockpitContentTransition({ children, className = '' }: CockpitContentTransitionProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`relative w-full ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface CockpitPanelTransitionProps {
  activeKey: CockpitTransitionTab;
  direction: -1 | 0 | 1;
  children: React.ReactNode;
  className?: string;
  onTransitionComplete?: (activeKey: CockpitTransitionTab) => void;
}

type CockpitPanelMotionPhase = 'enter' | 'visible' | 'exit';

export function getCockpitPanelMotionState(
  phase: CockpitPanelMotionPhase,
  direction: number,
) {
  if (phase === 'visible') {
    return { opacity: 1, y: 0, scale: 1 };
  }

  if (phase === 'enter') {
    return {
      opacity: 0,
      y: direction === 0 ? 0 : direction * 12,
      scale: 0.997,
    };
  }

  return {
    opacity: 0,
    y: direction === 0 ? -6 : direction * -8,
    scale: 0.998,
  };
}

const cockpitPanelVariants: Variants = {
  enter: (direction: number) => getCockpitPanelMotionState('enter', direction),
  visible: {
    ...getCockpitPanelMotionState('visible', 0),
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: (direction: number) => ({
    ...getCockpitPanelMotionState('exit', direction),
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 1, 1],
    },
  }),
};

/**
 * Переключает только слот рабочего раздела. Навигация, фон страницы и общий
 * runtime-футер остаются смонтированными и не участвуют в анимации.
 */
export function CockpitPanelTransition({
  activeKey,
  direction,
  children,
  className = '',
  onTransitionComplete,
}: CockpitPanelTransitionProps) {
  const [announcedTab, setAnnouncedTab] = useState(activeKey);

  return (
    <MotionConfig reducedMotion="user">
      <div aria-label="Содержимое рабочего раздела" className={`relative w-full ${className}`}>
        <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          Открыт раздел: {COCKPIT_TAB_LABELS[announcedTab]}
        </span>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={activeKey}
            data-cockpit-panel={activeKey}
            custom={direction}
            variants={cockpitPanelVariants}
            initial="enter"
            animate="visible"
            exit="exit"
            onAnimationComplete={(definition) => {
              if (!isCockpitVisibleAnimation(definition)) return;
              setAnnouncedTab(activeKey);
              onTransitionComplete?.(activeKey);
            }}
            className="relative w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
