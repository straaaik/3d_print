'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingBag, BarChart3, Calculator, ChevronDown, Check, Compass, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface RadialNavMenuProps {
  currentMainTab?: 'orders' | 'stats' | 'calculator';
  currentSubTab?: string;
  onNavigate?: (mainTab: 'orders' | 'stats' | 'calculator', subTab?: string) => void;
  className?: string;
}

interface MenuItem {
  id: string;
  title: string;
  description: string;
  href: string;
  mainTab: 'orders' | 'stats' | 'calculator';
  subTab?: string;
  icon: any;
  iconColor: string;
  badgeStyle: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'orders',
    title: 'Заказы и Финансы',
    description: 'Учет заказов, доходов и расходов',
    href: '/orders',
    mainTab: 'orders',
    icon: ShoppingBag,
    iconColor: 'text-[#FF8800]',
    badgeStyle: 'bg-[#FF6B00]/20 text-[#FF8800] border-[#FF6B00]/40',
  },
  {
    id: 'stats',
    title: 'Статистика',
    description: 'Аналитика прибыли и расхода материалов',
    href: '/stats',
    mainTab: 'stats',
    icon: BarChart3,
    iconColor: 'text-emerald-400',
    badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'calculator',
    title: 'Калькулятор 3D',
    description: 'Расчет стоимости печати и материалов',
    href: '/calculator',
    mainTab: 'calculator',
    subTab: 'calculator',
    icon: Calculator,
    iconColor: 'text-blue-400',
    badgeStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
];

export function RadialNavMenu({
  currentMainTab,
  onNavigate,
  className = '',
}: RadialNavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Закрытие при клике вне меню или нажатии Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Определение активного раздела по pathname
  const getActiveTab = () => {
    if (pathname?.startsWith('/stats') || currentMainTab === 'stats') return 'stats';
    if (pathname?.startsWith('/calculator') || currentMainTab === 'calculator') return 'calculator';
    return 'orders';
  };

  const activeTab = getActiveTab();

  const getCurrentIcon = () => {
    if (activeTab === 'stats') return BarChart3;
    if (activeTab === 'calculator') return Calculator;
    return ShoppingBag;
  };

  const CurrentIcon = getCurrentIcon();

  const handleItemClick = (item: MenuItem) => {
    if (onNavigate) {
      onNavigate(item.mainTab, item.subTab);
    }
    router.push(item.href);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`fixed top-4 left-4 sm:top-5 sm:left-6 z-50 select-none ${className}`}>
      {/* Фиксированная кнопка вызова выпадающего списка */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative h-12 px-3.5 rounded-xl flex items-center gap-2.5 transition-all duration-200 cursor-pointer shadow-2xl backdrop-blur-md active:scale-95 group ${
          isOpen
            ? 'bg-[#1a1d24] text-white border-2 border-[#FF6B00] shadow-lg shadow-[#FF6B00]/30'
            : 'bg-[#16181d]/90 hover:bg-[#FF6B00]/25 text-[#FF8800] border border-[#FF6B00]/50 hover:border-[#FF6B00] shadow-black/80'
        }`}
        title="Нажмите для выбора раздела навигации"
      >
        <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center text-[#FF8800]">
          <CurrentIcon className="w-5 h-5" />
        </div>

        <span className="hidden sm:inline text-xs font-bold text-white tracking-wide">
          {activeTab === 'orders' ? 'Заказы' : activeTab === 'stats' ? 'Статистика' : 'Калькулятор'}
        </span>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-[#FF8800]" />
        </motion.div>

        {/* Пульсирующий индикатор активной кнопки */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B00] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF8800]"></span>
          </span>
        )}
      </button>

      {/* Выпадающий список навигации (Dropdown Menu) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-14 left-0 w-72 bg-[#16181d] border border-[#FF6B00]/40 rounded-2xl shadow-2xl p-2 backdrop-blur-2xl select-none z-50 space-y-1"
          >
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#FF8800] border-b border-[#242930] flex items-center justify-between">
              <span>Быстрый переход</span>
              <Compass className="w-3.5 h-3.5 text-[#FF8800]" />
            </div>

            {MENU_ITEMS.map((item) => {
              const IconComp = item.icon;
              const isCurrent = item.mainTab === activeTab;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left group ${
                    isCurrent
                      ? 'bg-[#FF6B00]/15 border border-[#FF6B00]/40 text-white'
                      : 'hover:bg-[#242930]/70 text-gray-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      isCurrent ? 'bg-[#FF6B00]/25 border-[#FF6B00]/60' : 'bg-[#0d0e12] border-[#242930]'
                    }`}>
                      <IconComp className={`w-5 h-5 ${item.iconColor}`} />
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                        <span>{item.title}</span>
                      </div>
                      <div className="text-[11px] text-[#9ca3af] truncate">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] border ${item.badgeStyle}`}>
                      {item.href}
                    </span>
                    {isCurrent && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
