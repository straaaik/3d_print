'use client';

import React from 'react';
import { AdminPanel } from '../../widgets/Admin/AdminPanel';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { useAuth } from '../../entities/model/AuthProvider';

export default function AdminPage() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3 select-none">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-purple-400 animate-spin" />
          <p className="text-neutral-400 text-xs font-mono animate-pulse">
            Инициализация панели безопасности и администрирования...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dot-grid flex flex-col justify-between font-mono text-xs">
      <main className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 md:py-6 space-y-4">
        <div className="flex justify-center">
          <MainNavbar />
        </div>
        <AdminPanel />
      </main>

      <footer className="w-full text-center py-6 border-t border-white/10 bg-neutral-950 select-none font-mono text-[11px] text-neutral-500">
        <p>
          § 3D LABS · ADMIN RUNTIME · Хранилище: LocalStorage + Supabase Cloud
        </p>
      </footer>
    </div>
  );
}
