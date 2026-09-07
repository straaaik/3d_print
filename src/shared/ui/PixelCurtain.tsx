'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';

interface PixelCurtainContextType {
  navigate: (href: string) => void;
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
  const [, startReactTransition] = useTransition();
  const [phase, setPhase] = useState<'idle' | 'covering' | 'revealing'>('idle');

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

  const navigate = useCallback((href: string) => {
    if (phase !== 'idle') return;

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isFromHome = currentPath === '/';
    const isToHome = href === '/' || href.startsWith('/?');

    // Анимация занавеса срабатывает ТОЛЬКО при переходе с главной или на главную
    if (!isFromHome && !isToHome) {
      router.push(href);
      return;
    }

    // 1. Фаза закрытия пикселями (Covering)
    setPhase('covering');

    // 2. После полного закрытия экрана (360ms) переходим на целевой маршрут
    setTimeout(() => {
      startReactTransition(() => {
        router.push(href);
      });

      // 3. Фаза раскрытия новой страницы (Revealing)
      setTimeout(() => {
        setPhase('revealing');

        // 4. Завершение анимации и возвращение в исходное состояние
        setTimeout(() => {
          setPhase('idle');
        }, 380);
      }, 70);
    }, 380);
  }, [phase, router]);

  const isTransitioning = phase !== 'idle';

  // Глобальный перехват кликов по внутренним ссылкам (строго только с главной или на главную)
  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Игнорируем клики с модификаторами (Ctrl/Cmd/Shift/Alt для открытия в новой вкладке)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      // Ищем ближайший тег <a>
      const anchor = (e.target as HTMLElement)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      // Проверяем, что ссылка внутренняя
      if (href && href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/#')) {
        if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

        // Если уже на этой странице — ничего не делаем
        if (window.location.pathname === href) return;

        const isFromHome = window.location.pathname === '/';
        const isToHome = href === '/' || href.startsWith('/?');

        // Если это переход между внутренними разделами (не с главной и не на главную) — не перехватываем
        if (!isFromHome && !isToHome) return;

        e.preventDefault();
        navigate(href);
      }
    };

    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => document.removeEventListener('click', handleGlobalClick, { capture: true });
  }, [navigate]);

  return (
    <PixelCurtainContext.Provider value={{ navigate, isTransitioning }}>
      {children}

      {/* Полноэкранный слой пиксельного занавеса (Curtains: Pixels) */}
      <AnimatePresence>
        {isTransitioning && (
          <div
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
