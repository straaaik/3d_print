'use client';

import { ProtectedPageReady } from '../../shared/ui/page-transition/PageReadySurface';

import React, { useState } from 'react';
import { PageTransitionLink as Link } from '../../shared/ui/page-transition/PageTransitionLink';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../../entities/model/DataProvider';
import { UserProfileMenu } from '../../widgets/UserMenu/UserProfileMenu';
import { usePixelCurtain } from '../../shared/ui/PixelCurtain';
import { HubSkeleton } from '../../shared/ui/CockpitSkeleton';
import { MotionPulse } from '../../shared/ui/MotionPrimitives';
import { useHubIconPreferences, getHubIconSrc } from '../../shared/lib/hubIconPreferences';

interface HubSection {
  id: string;
  label: string;
  code: string;
  href: string;
  image: string;
  floatDuration: number;
  floatDelay: number;
  floatOffset: number;
}

const SECTIONS: HubSection[] = [
  {
    id: 'orders',
    label: 'Заказы',
    code: 'ORD',
    href: '/orders',
    image: '/images/hub/orders.png',
    floatDuration: 4.2,
    floatDelay: 0,
    floatOffset: -8,
  },
  {
    id: 'stats',
    label: 'Статистика',
    code: 'STAT',
    href: '/stats',
    image: '/images/hub/stats.png',
    floatDuration: 3.8,
    floatDelay: 0.7,
    floatOffset: 8,
  },
  {
    id: 'calculator',
    label: 'Калькулятор',
    code: 'CALC',
    href: '/calculator',
    image: '/images/hub/calculator.png',
    floatDuration: 4.6,
    floatDelay: 1.4,
    floatOffset: -9,
  },
  {
    id: 'products',
    label: 'Товары',
    code: 'PROD',
    href: '/products',
    image: '/images/hub/products.png',
    floatDuration: 4.0,
    floatDelay: 0.4,
    floatOffset: 8,
  },
  {
    id: 'filaments',
    label: 'Филамент',
    code: 'FIL',
    href: '/filaments',
    image: '/images/hub/filaments.png',
    floatDuration: 3.6,
    floatDelay: 1.1,
    floatOffset: -8,
  },
  {
    id: 'printers',
    label: 'Принтеры',
    code: 'PRN',
    href: '/printers',
    image: '/images/hub/printers.png',
    floatDuration: 4.4,
    floatDelay: 1.8,
    floatOffset: 9,
  },
];

export default function HomePage() {
  const { isLoading } = useData();
  const { navigate: curtainNavigate } = usePixelCurtain();
  const { style: iconStyle } = useHubIconPreferences();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const clientX = e.clientX;
    let closestIndex = 0;
    let minDistance = Infinity;

    itemRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      const rect = ref.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dist = Math.abs(clientX - centerX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    if (hoveredIndex !== closestIndex) {
      setHoveredIndex(closestIndex);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  if (isLoading) {
    return <HubSkeleton />;
  }

  return (
    <ProtectedPageReady viewKey="/">
    <div className="min-h-screen w-full relative flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden">
      {/* Верхний бар: штамп системы и меню пользователя */}
      <div className="w-full flex items-center justify-between z-20">
        <div className="flex items-center gap-2 font-mono text-xs text-neutral-400 tracking-wider">
          <MotionPulse className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-neutral-300">3D-LABS</span>
          <span className="text-neutral-600">{'//'}</span>
          <span className="text-neutral-400">OPERATIONS HUB</span>
        </div>
        <UserProfileMenu />
      </div>

      {/* Центральный блок: парящие 3D иконки в плотной связке */}
      <div className="w-full flex-1 flex flex-col items-center justify-center py-6 sm:py-12 z-10">
        {/* Контейнер иконок с точным расчётом хитбокса */}
        <div
          className="flex flex-wrap sm:flex-nowrap items-center justify-center -space-x-10 sm:-space-x-16 md:-space-x-20 lg:-space-x-24 xl:-space-x-28 px-4 py-12"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {SECTIONS.map((section, index) => {
            const isHovered = hoveredIndex === index;

            // Базовый порядок наложения: слева направо (левые поверх правых), при наведении активный выходит на самый верх
            const zIndex = isHovered ? 50 : SECTIONS.length - index;

            return (
              <motion.div
                key={section.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className="relative flex flex-col items-center cursor-pointer"
                style={{
                  zIndex,
                  pointerEvents: hoveredIndex === null || isHovered ? 'auto' : 'none',
                }}
                animate={{
                  scale: isHovered ? 1.18 : 1,
                  y: isHovered ? -12 : 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 24,
                  mass: 0.7,
                }}
              >
                <Link
                  href={section.href}
                  onClick={(e) => {
                    // Разрешаем открытие в новой вкладке по Ctrl/Cmd/Shift клику
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    curtainNavigate(section.href);
                  }}
                  className="relative flex flex-col items-center outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 rounded-3xl"
                >
                  {/* Парящая оболочка с непрерывной органической левитацией */}
                  <motion.div
                    className="relative w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 lg:w-60 lg:h-60 xl:w-64 xl:h-64 flex items-center justify-center"
                    animate={{
                      y: isHovered ? 0 : [0, section.floatOffset, 0],
                    }}
                    transition={
                      isHovered
                        ? { duration: 0.2 }
                        : {
                            duration: section.floatDuration,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            ease: 'easeInOut',
                            delay: section.floatDelay,
                          }
                    }
                  >
                    {/* 3D Иконка без рамок, карточек и свечений */}
                    <div className="relative w-full h-full drop-shadow-[0_16px_32px_rgba(0,0,0,0.85)] pointer-events-none">
                      <Image
                        src={getHubIconSrc(section.id, iconStyle)}
                        alt={section.label}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 128px, (max-width: 768px) 176px, (max-width: 1024px) 208px, (max-width: 1280px) 240px, 256px"
                        priority
                        className="object-contain select-none"
                      />
                    </div>
                  </motion.div>

                  {/* Всплывающая подсказка: появляется ТОЛЬКО при наведении (без точки) */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.92 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute -bottom-10 sm:-bottom-12 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/95 border border-white/20 shadow-2xl backdrop-blur-xl"
                      >
                        <span className="text-xs sm:text-sm font-sans font-semibold text-white tracking-wide">
                          {section.label}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-mono text-cyan-400 font-bold">
                          [{section.code}]
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Нижняя телеметрия */}
      <div className="w-full flex items-center justify-between text-[11px] font-mono text-neutral-600 z-20 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span>3D LABS</span>
          <span>·</span>
          <span>SYSTEM RUNTIME 2.4</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-neutral-500">
          <span>6 MODULES ONLINE</span>
          <span>·</span>
          <span>LOCAL + CLOUD SYNC</span>
        </div>
      </div>
    </div>
    </ProtectedPageReady>
  );
}
