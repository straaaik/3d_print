'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Edit3, 
  KeyRound, 
  Shield
} from 'lucide-react';
import { useAuth } from '../../entities/model/AuthProvider';
import { EditProfileModal } from './EditProfileModal';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';

export function UserProfileMenu() {
  const { currentUser, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Закрытие дропдауна при клике вне меню
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
    <div className="relative select-none" ref={menuRef}>
      {/* Кнопка-триггер пользователя в правом верхнем углу */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#16181d] border border-[#242930] hover:border-purple-600/50 hover:bg-[#1a1d24] transition-all shadow-xl shadow-black/40 cursor-pointer backdrop-blur-xl group"
      >
        {/* Аватар */}
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md shrink-0 transition-transform group-hover:scale-105"
          style={{ backgroundColor: currentUser.avatar_color || '#8B5CF6' }}
        >
          {initial}
        </div>

        {/* Имя и роль */}
        <div className="flex flex-col items-start text-left leading-tight hidden sm:flex">
          <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors max-w-[120px] truncate">
            {currentUser.name}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            {isAdmin ? 'Администратор' : 'Пользователь'}
          </span>
        </div>

        {/* Бейдж для мобильных или компактный */}
        {isAdmin && (
          <span className="sm:hidden text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50">
            ADM
          </span>
        )}

        {/* Стрелка */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-purple-400' : ''
          }`}
        />
      </button>

      {/* Выпадающее меню */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#14161d] border border-[#242930] p-2 shadow-2xl shadow-black/80 backdrop-blur-2xl z-50 overflow-hidden"
          >
            {/* Блок пользователя в шапке меню */}
            <div className="p-3 bg-[#0d0e12] border border-[#242930] rounded-xl mb-1.5 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-base text-white shadow-md shrink-0"
                style={{ backgroundColor: currentUser.avatar_color || '#8B5CF6' }}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-gray-400 truncate">
                  {currentUser.email}
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                      isAdmin
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-700/60'
                        : 'bg-blue-950/80 text-blue-300 border border-blue-700/60'
                    }`}
                  >
                    {isAdmin ? 'АДМИНИСТРАТОР' : 'ПОЛЬЗОВАТЕЛЬ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Пункты меню */}
            <div className="space-y-0.5">
              {/* Редактировать профиль */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-purple-600/15 hover:border-purple-600/30 border border-transparent flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-purple-400" />
                <span>Редактировать профиль</span>
              </button>

              {/* Панель администратора (только для админов) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/admin');
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer border ${
                    pathname === '/admin'
                      ? 'bg-purple-950/60 text-purple-300 border-purple-700/50'
                      : 'text-gray-300 hover:text-white hover:bg-purple-600/15 hover:border-purple-600/30 border-transparent'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Панель администратора</span>
                </button>
              )}

              {/* Настройки */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/settings');
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer border ${
                  pathname === '/settings'
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'text-gray-300 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <Settings className="w-4 h-4 text-gray-400" />
                <span>Настройки приложения</span>
              </button>
            </div>

            {/* Разделитель */}
            <div className="my-1.5 border-t border-[#242930]" />

            {/* Кнопка выхода */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsLogoutModalOpen(true);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти из аккаунта</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно редактирования профиля */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Модальное окно подтверждения выхода */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Выход из аккаунта"
        variant="error"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            Вы действительно хотите выйти из системы 3D Labs?
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsLogoutModalOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmLogout}
            >
              Выйти
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
