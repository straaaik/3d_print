'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldX } from 'lucide-react';
import { AdminPanel } from '../../widgets/Admin/AdminPanel';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { useAuth } from '../../entities/model/AuthProvider';

export default function AdminPage() {
  const router = useRouter();
  const { isLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace('/');
  }, [isAdmin, isLoading, router]);

  if (isLoading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dot-grid font-sans">
        <div className="flex select-none flex-col items-center gap-4 text-center">
          {isLoading ? (
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-white" />
          ) : (
            <ShieldX className="h-9 w-9 text-rose-400" />
          )}
          <p className="font-mono text-xs font-semibold text-neutral-400">
            {isLoading ? 'Проверка административной сессии...' : 'Доступ к панели ограничен'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-dot-grid font-sans text-white selection:bg-white/20 selection:text-white">
      <main className="mx-auto w-full max-w-none space-y-6 px-3 py-4 sm:px-6 md:py-6">
        <div className="flex justify-center"><MainNavbar /></div>
        <AdminPanel />
      </main>

      <footer className="w-full select-none border-t border-white/10 bg-neutral-950/80 py-6 font-mono text-[11px] text-neutral-500 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-2 px-4 sm:flex-row">
          <span>3D LABS · ADMIN RUNTIME v2.4</span>
          <span>ACCESS: ADMINISTRATOR · SUPABASE AUTH</span>
        </div>
      </footer>
    </div>
  );
}
