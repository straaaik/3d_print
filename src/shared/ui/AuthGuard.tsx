'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../entities/model/AuthProvider';
import { ShieldAlert, Lock } from 'lucide-react';
import { Button } from './Button';
import { UserProfileMenu } from '../../widgets/UserMenu/UserProfileMenu';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { currentUser, isAuthenticated, isAdmin, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';
  const isAdminPage = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isLoading) return;

    // Если не авторизован и не на странице логина — редирект на /login
    if (!isAuthenticated && !isLoginPage) {
      router.replace('/login');
      return;
    }

    // Если уже авторизован и зашел на /login — редирект в приложение
    if (isAuthenticated && isLoginPage) {
      router.replace('/orders');
      return;
    }

    // Если зашел в админку без прав админа
    if (isAuthenticated && isAdminPage && !isAdmin) {
      router.replace('/orders');
    }
  }, [isLoading, isAuthenticated, isAdmin, isLoginPage, isAdminPage, router]);

  // Во время первоначальной проверки аутентификации
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-10 h-10 rounded-full border-4 border-[#242930] border-t-primary animate-spin" />
          <p className="text-gray-400 text-sm font-semibold animate-pulse">
            Проверка авторизации...
          </p>
        </div>
      </div>
    );
  }

  // Для страницы логина просто рендерим
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Если не авторизован (до срабатывания редиректа)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center font-sans p-4">
        <div className="bg-[#16181d] border border-red-500/30 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Требуется авторизация</h2>
          <p className="text-gray-400 text-sm">
            Для доступа к системе необходимо войти в систему или зарегистрироваться по ключу.
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => router.replace('/login')}
          >
            Перейти к авторизации
          </Button>
        </div>
      </div>
    );
  }

  // Если на странице админки, но нет прав администратора
  if (isAdminPage && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center font-sans p-4">
        <div className="bg-[#16181d] border border-purple-500/30 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Доступ ограничен</h2>
          <p className="text-gray-400 text-sm">
            У вас нет прав администратора для просмотра этой страницы.
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => router.replace('/orders')}
          >
            Вернуться к заказам
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Меню профиля пользователя строго в правом верхнем углу */}
      <div className="fixed top-3.5 right-3.5 sm:top-5 sm:right-6 z-40">
        <UserProfileMenu />
      </div>
      {children}
    </>
  );
}
