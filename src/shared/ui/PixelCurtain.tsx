'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { usePageTransition } from './page-transition/PageTransitionProvider';
import type { CurtainHandler, NavigationOptions } from './page-transition/model';

interface PixelCurtainContextType {
  navigate: (href: string, options?: NavigationOptions) => void;
  isTransitioning: boolean;
}

const PixelCurtainContext = createContext<PixelCurtainContextType>({
  navigate: () => {},
  isTransitioning: false,
});

export const usePixelCurtain = () => useContext(PixelCurtainContext);

// 12 колонок и 8 рядов пиксельных блоков для идеального разрешения пиксельного занавеса
const COLS = 12;
const ROWS = 8;

interface Tile {
  id: number;
  row: number;
  col: number;
  coverDelay: number;
  revealDelay: number;
}

export function PixelCurtainProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { navigate: transitionNavigate, registerCurtain, state: transitionState } = usePageTransition();
  const [, startReactTransition] = useTransition();
  const [phase, setPhaseState] = useState<'idle' | 'covering' | 'revealing'>('idle');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const reduced = useReducedMotion();

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  const setPhase = useCallback((nextPhase: 'idle' | 'covering' | 'revealing') => {
    phaseRef.current = nextPhase;
    setPhaseState(nextPhase);
  }, []);

  // Генерация сетки пикселей с предсказуемым псевдослучайным шахматным паттерном задержек
  const tiles: Tile[] = useMemo(() => {
    const list: Tile[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // Детерминированный псевдослучайный шум для естественного эффекта рассыпания
        const pseudoRandom = Math.abs(Math.sin((r + 1) * 12.9898 + (c + 1) * 78.233)) % 1;

        // Диагональная волна + шум
        const normalizedDist = (r / ROWS + c / COLS) / 2;
        const coverDelay = normalizedDist * 0.18 + pseudoRandom * 0.12;

        // Обратная волна для открытия страницы
        const reverseDist = ((ROWS - 1 - r) / ROWS + (COLS - 1 - c) / COLS) / 2;
        const revealDelay = reverseDist * 0.15 + pseudoRandom * 0.1;

        list.push({
          id: r * COLS + c,
          row: r,
          col: c,
          coverDelay,
          revealDelay,
        });
      }
    }
    return list;
  }, []);

  const curtainHandler: CurtainHandler = useCallback((target: string, options?: NavigationOptions) => {
    return new Promise<boolean>((resolve) => {
      if (phaseRef.current !== 'idle') {
        resolve(false);
        return;
      }

      if (reduced) {
        if (options?.replace) {
          router.replace(target, { scroll: options?.scroll ?? true });
        } else {
          router.push(target, { scroll: options?.scroll ?? true });
        }
        resolve(true);
        return;
      }

      clearAllTimers();

      // 1. Фаза закрытия пикселями (Covering)
      setPhase('covering');

      // 2. После полного закрытия экрана (380ms) переходим на целевой маршрут
      const coverTimer = setTimeout(() => {
        startReactTransition(() => {
          if (options?.replace) {
            router.replace(target, { scroll: options?.scroll ?? true });
          } else {
            router.push(target, { scroll: options?.scroll ?? true });
          }
        });

        // 3. Фаза раскрытия новой страницы (Revealing)
        const revealTimer = setTimeout(() => {
          setPhase('revealing');

          // 4. Завершение анимации и возвращение в исходное состояние
          const idleTimer = setTimeout(() => {
            setPhase('idle');
            resolve(true);
          }, 380);

          timersRef.current.push(idleTimer);
        }, 70);

        timersRef.current.push(revealTimer);
      }, 380);

      timersRef.current.push(coverTimer);
    });
  }, [router, reduced, clearAllTimers, setPhase]);

  // Регистрируем обработчик шторки в центральном координаторе переходов
  useEffect(() => {
    if (!registerCurtain) return;
    return registerCurtain(curtainHandler);
  }, [registerCurtain, curtainHandler]);

  const navigate = useCallback((href: string, options?: NavigationOptions) => {
    void transitionNavigate(href, options);
  }, [transitionNavigate]);

  const isCurtainTransitioning = phase !== 'idle';
  const isTransitioning = isCurtainTransitioning || transitionState.phase !== 'idle';

  return (
    <PixelCurtainContext.Provider value={{ navigate, isTransitioning }}>
      {children}

      {/* Полноэкранный слой пиксельного занавеса (Curtains: Pixels) */}
      <AnimatePresence>
        {isCurtainTransitioning && (
          <div
            data-testid="pixel-curtain"
            className="fixed inset-0 z-[99999] pointer-events-auto grid w-screen h-screen overflow-hidden select-none bg-transparent"
            style={{
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
            }}
          >
            {tiles.map((tile) => (
              <motion.div
                key={tile.id}
                className="w-full h-full bg-[#0a0a0a] border border-white/[0.04]"
                style={{ transformOrigin: 'center center' }}
                initial={{
                  scale: 0,
                  opacity: 0,
                }}
                animate={{
                  scale: phase === 'covering' ? 1.04 : 0,
                  opacity: phase === 'covering' ? 1 : 0,
                }}
                transition={{
                  duration: 0.2,
                  delay: phase === 'covering' ? tile.coverDelay : tile.revealDelay,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </PixelCurtainContext.Provider>
  );
}
