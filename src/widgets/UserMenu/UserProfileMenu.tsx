'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {

  ShieldCheck,
  Settings,
  LogOut,
  ChevronDown,
  Edit3,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../entities/model/AuthProvider';
import { EditProfileModal } from './EditProfileModal';
import { Modal } from '../../shared/ui/Modal';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { usePixelCurtain } from '../../shared/ui/PixelCurtain';

export function UserProfileMenu() {
  const { currentUser, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { navigate: curtainNavigate } = usePixelCurtain();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!currentUser) return null;

  const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '?';

  const handleConfirmLogout = async () => {
    await logout();
    setIsLogoutModalOpen(false);
    setIsOpen(false);
    router.replace('/login');
  };

  return (
    <div className="relative select-none font-mono" ref={menuRef}>
      {/* Кнопка-триггер профиля */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-neutral-900 border border-white/10 hover:border-white/20 hover:bg-neutral-800 shadow-md cursor-pointer backdrop-blur-xl group"
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-neutral-950 shadow-sm shrink-0 "
          style={{ backgroundColor: currentUser.avatar_color || '#06B6D4' }}
        >
          {initial}
        </div>

        <div className="flex flex-col items-start text-left leading-tight hidden sm:flex">
          <span className="text-xs font-bold text-white max-w-[120px] truncate">
            {currentUser.name}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {isAdmin ? 'Администратор' : 'Пользователь'}
          </span>
        </div>

        {isAdmin && (
          <span className="sm:hidden text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50">
            ADM
          </span>
        )}

        <ChevronDown
          className={`w-3 h-3 text-neutral-400 group-hover:text-white ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Выпадающее меню */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-64 rounded-2xl bg-neutral-950 border border-white/15 p-2 shadow-2xl backdrop-blur-2xl z-50 overflow-hidden font-mono text-xs"
          >
            {/* Блок пользователя в шапке меню */}
            <div className="p-2.5 bg-neutral-900 border border-white/10 rounded-xl mb-1.5 flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm text-neutral-950 shadow-md shrink-0"
                style={{ backgroundColor: currentUser.avatar_color || '#06B6D4' }}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate font-sans">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-neutral-400 truncate font-mono">
                  {currentUser.email}
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                      isAdmin
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-700/60'
                        : 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60'
                    }`}
                  >
                    {isAdmin ? 'АДМИНИСТРАТОР' : 'ПОЛЬЗОВАТЕЛЬ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Пункты меню */}
            <div className="space-y-0.5">
              {pathname !== '/' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    curtainNavigate('/');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Главный хаб (Меню)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Редактировать профиль</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/admin');
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 cursor-pointer ${
                    pathname === '/admin'
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Панель администратора</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/settings');
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 cursor-pointer ${
                  pathname === '/settings'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-neutral-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-neutral-400" />
                <span>Настройки приложения</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/about');
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 cursor-pointer ${
                  pathname === '/about'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-neutral-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>О системе (Визитка)</span>
              </button>
            </div>

            {/* Разделитель */}
            <div className="my-1.5 border-t border-white/10" />

            {/* Кнопка выхода */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsLogoutModalOpen(true);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти из аккаунта</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Выход из системы"
        subtitle="Завершение сеанса"
        variant="error"
        maxWidth="sm"
      >
        <div className="space-y-3 font-mono text-xs">
          <p className="text-neutral-300 leading-relaxed font-sans">
            Вы действительно хотите выйти из системы?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <CockpitButton
              type="button"
              onClick={() => setIsLogoutModalOpen(false)}
            >
              Закрыть
            </CockpitButton>
            <CockpitButton
              type="button"
              onClick={handleConfirmLogout}
              className="bg-rose-950/60 text-rose-300 border-rose-800/40 hover:bg-rose-900/80"
            >
              Выйти
            </CockpitButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
