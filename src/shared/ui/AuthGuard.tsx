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
  const isAboutPage = pathname === '/about' || pathname?.startsWith('/about');
  const isPublicPage = isLoginPage || isAboutPage;
  const isAdminPage = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isLoading) return;

    // Если не авторизован и не на публичной странице — редирект на /login
    if (!isAuthenticated && !isPublicPage) {
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
  }, [isLoading, isAuthenticated, isAdmin, isLoginPage, isPublicPage, isAdminPage, router]);

  // Во время первоначальной проверки аутентификации
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-9 h-9 rounded-full border-2 border-white/10 border-t-white animate-spin" />
          <p className="text-neutral-400 text-xs font-mono font-semibold">
            Проверка авторизации 3D Labs...
          </p>
        </div>
      </div>
    );
  }

  // Для публичных страниц просто рендерим
  if (isPublicPage && !isAuthenticated) {
    return <>{children}</>;
  }

  if (isLoginPage && isAuthenticated) {
    return <>{children}</>;
  }

  // Если не авторизован (до срабатывания редиректа)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center font-sans p-4 select-none">
        <div className="bg-neutral-950/90 border border-white/15 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-xs text-rose-400 font-bold uppercase tracking-wider block">
              // ТРЕБУЕТСЯ АВТОРИЗАЦИЯ
            </span>
            <h2 className="text-lg font-bold text-white">Доступ ограничен</h2>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Для доступа к системе необходимо войти в систему или зарегистрироваться по инвайт-ключу.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-neutral-950 font-bold font-mono text-xs transition-all cursor-pointer shadow-md"
          >
            [ Перейти к авторизации ]
          </button>
        </div>
      </div>
    );
  }

  // Если на странице админки, но нет прав администратора
  if (isAdminPage && !isAdmin) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center font-sans p-4 select-none">
        <div className="bg-neutral-950/90 border border-white/15 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <div className="w-12 h-12 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-xs text-amber-400 font-bold uppercase tracking-wider block">
              // ОГРАНИЧЕНИЕ ПРАВ ДОСТУПА
            </span>
            <h2 className="text-lg font-bold text-white">Требуются права администратора</h2>
            <p className="text-neutral-400 text-xs leading-relaxed">
              У вашей учетной записи нет прав для просмотра панели управления безопасностью.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.replace('/orders')}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.98] text-neutral-950 font-bold font-mono text-xs transition-all cursor-pointer shadow-md"
          >
            [ Вернуться к заказам ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
}
