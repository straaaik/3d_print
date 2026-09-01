'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../entities/model/AuthProvider';
import { ShieldAlert, Lock } from 'lucide-react';
import { Button } from './Button';
import { UserProfileMenu } from '../../widgets/UserMenu/UserProfileMenu';

import { 
  CockpitWorkspaceSkeleton, 
  HubSkeleton, 
  SettingsSkeleton, 
  OrdersSkeleton 
} from './CockpitSkeleton';
import { MainNavbar } from './MainNavbar';

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

  // Во время первоначальной проверки аутентификации показываем скелетон раздела
  if (isLoading) {
    const rawTab = pathname?.replace('/', '') || '';
    if (['orders', 'stats', 'calculator', 'products', 'filaments', 'printers'].includes(rawTab)) {
      return <CockpitWorkspaceSkeleton initialTab={rawTab as 'orders' | 'stats' | 'calculator' | 'products' | 'filaments' | 'printers'} />;
    }

    if (pathname === '/') {
      return <HubSkeleton />;
    }

    if (pathname === '/settings') {
      return (
        <div className="flex min-h-screen flex-col justify-between bg-dot-grid font-sans text-white selection:bg-white/20 selection:text-white">
          <main className="mx-auto w-full max-w-none space-y-6 px-3 py-4 sm:px-6 md:py-6">
            <div className="flex justify-center"><MainNavbar /></div>
            <SettingsSkeleton />
          </main>
          <footer className="w-full select-none border-t border-white/10 bg-neutral-950/80 py-6 font-mono text-[11px] text-neutral-500 backdrop-blur-md">
            <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-2 px-4 sm:flex-row">
              <span>§ 3D LABS · SETTINGS RUNTIME v2.4</span>
              <span>CONFIG: LOCALSTORAGE + SUPABASE CLOUD</span>
            </div>
          </footer>
        </div>
      );
    }

    if (isPublicPage) {
      return null;
    }

    // Fallback скелетон для любых других разделов
    return (
      <div className="min-h-screen bg-dot-grid text-white flex flex-col justify-between font-sans">
        <main className="w-full mx-auto max-w-none px-3 sm:px-6 py-4 md:py-6 space-y-6">
          <div className="flex justify-center">
            <MainNavbar />
          </div>
          <OrdersSkeleton />
        </main>
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
