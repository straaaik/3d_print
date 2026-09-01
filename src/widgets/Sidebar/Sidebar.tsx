'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, BarChart3, Calculator } from 'lucide-react';

export type MainTabType = 'orders' | 'stats' | 'calculator';

interface SidebarProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
}

interface NavItem {
  id: MainTabType;
  label: string;
  icon: React.ElementType;
  activeBg: string;
  glowShadow: string;
  hoverText: string;
  hoverBg: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'orders',
    label: 'Заказы',
    icon: ShoppingBag,
    activeBg: 'bg-gradient-to-r from-[#FF5500] via-[#FF7A00] to-[#FF9900]',
    glowShadow: 'shadow-lg shadow-[#FF6B00]/35',
    hoverText: 'hover:text-[#FF8800]',
    hoverBg: 'hover:bg-[#FF6B00]/10',
  },
  {
    id: 'stats',
    label: 'Статистика',
    icon: BarChart3,
    activeBg: 'bg-gradient-to-r from-[#00e676] via-[#10b981] to-[#059669]',
    glowShadow: 'shadow-lg shadow-[#00e676]/35',
    hoverText: 'hover:text-[#00e676]',
    hoverBg: 'hover:bg-[#00e676]/10',
  },
  {
    id: 'calculator',
    label: 'Калькулятор',
    icon: Calculator,
    activeBg: 'bg-gradient-to-r from-[#0CB4E0] to-[#099abf]',
    glowShadow: 'shadow-lg shadow-[#0CB4E0]/35',
    hoverText: 'hover:text-[#0CB4E0]',
    hoverBg: 'hover:bg-primary/10',
  },
];

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside className="fixed bottom-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-5 md:top-1/2 md:-translate-y-1/2 md:bottom-auto z-50 select-none">
      <nav className="bg-[#16181d]/90 backdrop-blur-xl border border-[#242930] p-1.5 rounded-2xl flex md:flex-col items-stretch gap-1.5 shadow-2xl shadow-black/50 md:w-44">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group relative px-4 py-2.5 rounded-xl flex items-center gap-2.5 transition-all duration-200 focus:outline-none cursor-pointer text-xs sm:text-sm font-medium tracking-wide ${
                isActive
                  ? 'text-white font-semibold'
                  : `text-[#9ca3af] ${item.hoverText} ${item.hoverBg}`
              }`}
            >
              {/* Анимированный активный фон с индивидуальным неоновым градиентом */}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarIndicator"
                  className={`absolute inset-0 ${item.activeBg} ${item.glowShadow} rounded-xl z-0`}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}

              {/* Иконка и Текстовая надпись */}
              <Icon className="w-4 h-4 relative z-10 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className="relative z-10 whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
