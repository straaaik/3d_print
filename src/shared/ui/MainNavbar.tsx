'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, BarChart3, Calculator, Layers, Cpu, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export interface MainNavbarProps {
  className?: string;
  /** Если задан — вызывается перед переходом. Вернуть false чтобы отменить навигацию. */
  onNavigate?: (href: string) => boolean | Promise<boolean>;
}

const NAV_ITEMS = [
  {
    id: 'orders',
    label: 'Заказы',
    href: '/orders',
    icon: ShoppingBag,
    activeGradient: 'from-[#FF5500] to-[#FF8800]',
    activeShadow: 'shadow-[#FF6B00]/30',
  },
  {
    id: 'stats',
    label: 'Статистика',
    href: '/stats',
    icon: BarChart3,
    activeGradient: 'from-emerald-600 to-emerald-500',
    activeShadow: 'shadow-emerald-500/30',
  },
  {
    id: 'calculator',
    label: 'Калькулятор',
    href: '/calculator',
    icon: Calculator,
    activeGradient: 'from-[#0993b8] to-[#0CB4E0]',
    activeShadow: 'shadow-primary/30',
  },
  {
    id: 'filaments',
    label: 'Филаменты',
    href: '/filaments',
    icon: Layers,
    activeGradient: 'from-violet-600 to-violet-500',
    activeShadow: 'shadow-violet-500/30',
  },
  {
    id: 'printers',
    label: 'Принтеры',
    href: '/printers',
    icon: Cpu,
    activeGradient: 'from-sky-600 to-sky-400',
    activeShadow: 'shadow-sky-400/30',
  },
  {
    id: 'settings',
    label: 'Настройки',
    href: '/settings',
    icon: Settings,
    activeGradient: 'from-slate-600 to-slate-500',
    activeShadow: 'shadow-slate-400/30',
  },
];

export function MainNavbar({ className = '', onNavigate }: MainNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeId = NAV_ITEMS.find((item) => pathname?.startsWith(item.href))?.id ?? 'orders';

  const handleClick = async (e: React.MouseEvent, href: string) => {
    if (!onNavigate) return;
    e.preventDefault();
    const allowed = await onNavigate(href);
    if (allowed) router.push(href);
  };

  return (
    <nav className={`bg-[#16181d] border border-[#242930] p-1.5 rounded-2xl flex items-center justify-center gap-1 shadow-xl select-none backdrop-blur-xl flex-wrap ${className}`}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeId === item.id;
        const IconComp = item.icon;
        const linkClass = `relative px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all duration-200 focus:outline-none cursor-pointer ${
          isActive ? 'text-white shadow-md' : 'text-[#9ca3af] hover:text-white hover:bg-[#242930]/40'
        }`;

        const content = (
          <>
            {isActive && (
              <motion.div
                layoutId="mainNavbarActiveBackground"
                className={`absolute inset-0 bg-gradient-to-r ${item.activeGradient} rounded-xl z-0 shadow-lg ${item.activeShadow}`}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <IconComp className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10 whitespace-nowrap">{item.label}</span>
          </>
        );

        return onNavigate ? (
          <button
            key={item.id}
            onClick={(e) => handleClick(e, item.href)}
            className={linkClass}
          >
            {content}
          </button>
        ) : (
          <Link key={item.id} href={item.href} className={linkClass}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
