'use client';

import React from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { useData } from '../entities/model/DataProvider';
import { UserProfileMenu } from '../widgets/UserMenu/UserProfileMenu';
import { 
  ShoppingBag, 
  TrendingUp, 
  Calculator, 
  Package, 
  Layers, 
  Printer 
} from 'lucide-react';

interface HubSection {
  id: string;
  label: string;
  code: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const SECTIONS: HubSection[] = [
  {
    id: 'orders',
    label: 'Заказы',
    code: 'ORD',
    href: '/orders',
    icon: ShoppingBag,
  },
  {
    id: 'stats',
    label: 'Статистика',
    code: 'STAT',
    href: '/stats',
    icon: TrendingUp,
  },
  {
    id: 'calculator',
    label: 'Калькулятор',
    code: 'CALC',
    href: '/calculator',
    icon: Calculator,
  },
  {
    id: 'products',
    label: 'Товары',
    code: 'PROD',
    href: '/products',
    icon: Package,
  },
  {
    id: 'filaments',
    label: 'Филамент',
    code: 'FIL',
    href: '/filaments',
    icon: Layers,
  },
  {
    id: 'printers',
    label: 'Принтеры',
    code: 'PRN',
    href: '/printers',
    icon: Printer,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function HomePage() {
  const { isLoading } = useData();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-9 h-9 rounded-full border-2 border-white/10 border-t-white animate-spin" />
          <p className="text-neutral-400 text-xs font-mono font-semibold">
            Инициализация 3D Labs...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-8 select-none">
      {/* Иконка / меню пользователя в верхнем правом углу */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <UserProfileMenu />
      </div>

      <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center">
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon;

            return (
              <motion.div
                key={section.id}
                variants={itemVariants}
                whileHover={{ scale: 1.06, y: -6 }}
                whileTap={{ scale: 0.95 }}
                className="w-full"
              >
                <Link
                  href={section.href}
                  className="group relative flex flex-col items-center justify-center p-6 sm:p-7 rounded-2xl sm:rounded-3xl border border-white/10 bg-neutral-950/80 hover:bg-white/[0.05] hover:border-white/30 backdrop-blur-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.95)] transition-all duration-300 cursor-pointer text-center w-full aspect-square"
                >
                  {/* Фоновое субтильное свечение при наведении */}
                  <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  {/* Иконка раздела */}
                  <Icon 
                    className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-400 group-hover:text-white transition-colors duration-300 mb-3 sm:mb-4 group-hover:scale-110 transform transition-transform" 
                    strokeWidth={1.5}
                  />

                  {/* Название раздела */}
                  <span className="font-sans text-xs sm:text-sm font-semibold tracking-wide text-neutral-300 group-hover:text-white transition-colors duration-300 block">
                    {section.label}
                  </span>

                  {/* Микро-штамп кода раздела */}
                  <span className="text-[10px] font-mono text-neutral-600 group-hover:text-cyan-400 transition-colors duration-300 mt-1 block">
                    [{section.code}]
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

