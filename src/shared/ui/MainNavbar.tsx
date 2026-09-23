'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PageTransitionLink as Link } from './page-transition/PageTransitionLink';
import { usePathname } from 'next/navigation';
import { usePageRouter as useRouter } from './page-transition/PageTransitionLink';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../entities/model/AuthProvider';
import {
  ChevronDown,
  Settings,
  ShieldCheck,
  Info,
  LogOut,
  LayoutGrid
} from 'lucide-react';
import { StableNavLabel } from './StableNavLabel';

export interface MainNavbarProps {
  className?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  /** Если задан — вызывается перед переходом. Вернуть false чтобы отменить навигацию. */
  onNavigate?: (href: string) => boolean | Promise<boolean>;
}

// 6 основных рабочих разделов
const NAV_ITEMS = [
  {
    id: 'orders',
    label: 'Заказы',
    href: '/orders',
  },
  {
    id: 'stats',
    label: 'Статистика',
    href: '/stats',
  },
  {
    id: 'calculator',
    label: 'Калькулятор',
    href: '/calculator',
  },
  {
    id: 'products',
    label: 'Товары',
    href: '/products',
  },
  {
    id: 'filaments',
    label: 'Филаменты',
    href: '/filaments',
  },
  {
    id: 'printers',
    label: 'Принтеры',
    href: '/printers',
  },
];

export function MainNavbar({ className = '', activeTab, onTabChange, onNavigate }: MainNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAdmin, logout } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const activeId = activeTab || NAV_ITEMS.find((item) => pathname?.startsWith(item.href))?.id;

  // Закрытие меню профиля при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = async (e: React.MouseEvent, href: string) => {
    if (!onNavigate) return;
    e.preventDefault();
    const allowed = await onNavigate(href);
    if (allowed) router.push(href);
  };

  const userName = currentUser?.name || 'Kumo';
  const userInitial = userName ? userName[0].toUpperCase() : 'K';
  const userRole = currentUser?.role === 'admin' ? 'Администратор' : 'Мастер 3D-печати';
  const avatarBg = currentUser?.avatar_color || '#ec4899';

  return (
    <header className={`w-full max-w-[1500px] mx-auto select-none ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">

        {/* ЛЕВАЯ ЧАСТЬ: ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ НА МЕСТЕ ЛОГОТИПА */}
        <div className="relative" ref={profileRef}>
          <div
            className="flex items-center gap-2.5 bg-neutral-950/85 hover:bg-neutral-900/90 border border-white/15 backdrop-blur-xl px-3 py-1.5 rounded-xl text-white shadow-2xl cursor-pointer group"
          >
            <Link
              href="/settings?section=profile"
              aria-label="Открыть профиль"
              aria-current={pathname === '/settings' ? 'page' : undefined}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                setIsProfileOpen(false);
                void handleClick(event, '/settings?section=profile');
              }}
              className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
            >
            {/* Аватарка (розовый сквиркл со скриншота) */}
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0 shadow-sm"
              style={{ backgroundColor: avatarBg }}
            >
              {userInitial}
            </div>

            {/* Имя и роль */}
            <div className="text-left leading-tight pr-1">
              <span className="font-bold text-white text-xs sm:text-[13px] block font-sans">
                {userName}
              </span>
              <span className="text-[10px] sm:text-[11px] text-neutral-400 font-sans block">
                {userRole}
              </span>
            </div>

            </Link>
            <button
              type="button"
              aria-label="Меню пользователя"
              aria-expanded={isProfileOpen}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              onKeyDown={(event) => { if (event.key === 'Escape') setIsProfileOpen(false); }}
              className="flex min-h-8 min-w-8 items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/60 cursor-pointer"
            >
              <motion.span animate={{ rotate: isProfileOpen ? 180 : 0 }} transition={{ duration: 0.15 }}><ChevronDown className="w-3.5 h-3.5 text-neutral-400" /></motion.span>
            </button>
          </div>

          {/* Выпадающее меню настроек пользователя */}
          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 mt-2 w-64 bg-neutral-950 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 space-y-1 font-mono text-xs"
              >
                {/* Шапка меню */}
                <div className="px-3 py-2 border-b border-white/10 mb-1">
                  <div className="font-bold text-white text-sm font-sans">{userName}</div>
                  <div className="text-[11px] text-neutral-400 truncate">{currentUser?.email || 'user@kumocrm.local'}</div>
                </div>

                {/* Пункт: Главный хаб */}
                <Link
                  href="/"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 "
                >
                  <LayoutGrid className="w-4 h-4 text-emerald-400" />
                  <span className="font-sans font-medium text-xs">Главный хаб</span>
                </Link>

                {/* Пункт: Настройки */}
                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 "
                >
                  <Settings className="w-4 h-4 text-neutral-400" />
                  <span className="font-sans font-medium text-xs">Настройки мастерской</span>
                </Link>

                {/* Пункт: Админ-панель (только для админов) */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 "
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-sans font-medium text-xs">Панель администратора</span>
                  </Link>
                )}

                {/* Пункт: О системе */}
                <Link
                  href="/about"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 "
                >
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span className="font-sans font-medium text-xs">О системе Kumo CRM</span>
                </Link>

                {/* Разделитель */}
                <div className="border-t border-white/10 my-1" />

                {/* Выйти */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsProfileOpen(false);
                    await logout();
                    router.push('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-sans font-medium text-xs">Выйти из аккаунта</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: МЕНЮ ОСНОВНЫХ РАЗДЕЛОВ БЕЗ ФОНОВЫХ СВЕЧЕНИЙ И КАПСУЛ */}
        <nav
          className="bg-neutral-950/85 border border-white/15 p-1 rounded-xl flex items-center justify-center gap-0.5 shadow-2xl backdrop-blur-xl flex-wrap"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            const linkClass = "relative px-3.5 py-1.5 text-xs font-mono tracking-wider flex items-center focus:outline-none cursor-pointer group";

            const content = (
              <>
                {/* Открывающая скобка (меняет только цвет и жирность) */}
                <span
                  className={`mr-0.5 font-mono ${
                    isActive ? 'text-cyan-400 font-bold' : 'text-neutral-600 group-hover:text-cyan-400'
                  }`}
                >
                  [
                </span>

                {/* Текст ссылки (меняет только цвет и жирность) */}
                <StableNavLabel isActive={isActive}>{item.label}</StableNavLabel>

                {/* Закрывающая скобка (меняет только цвет и жирность) */}
                <span
                  className={`ml-0.5 font-mono ${
                    isActive ? 'text-cyan-400 font-bold' : 'text-neutral-600 group-hover:text-cyan-400'
                  }`}
                >
                  ]
                </span>
              </>
            );

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  if (onNavigate) {
                    handleClick(e, item.href);
                    return;
                  }
                  if (onTabChange) {
                    e.preventDefault();
                    onTabChange(item.id);
                    return;
                  }
                }}
                className={linkClass}
              >
                {content}
              </Link>
            );
          })}
        </nav>

      </div>
    </header>
  );
}
