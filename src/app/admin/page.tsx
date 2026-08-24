'use client';

import React from 'react';
import { AdminPanel } from '../../widgets/Admin/AdminPanel';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { useAuth } from '../../entities/model/AuthProvider';

export default function AdminPage() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-10 h-10 rounded-full border-4 border-[#242930] border-t-purple-500 animate-spin" />
          <p className="text-gray-400 text-sm font-semibold animate-pulse">
            Загрузка панели администратора...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0e12]/60 flex flex-col justify-between font-sans">
      <main className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 md:py-6 space-y-5">
        <div className="flex justify-center">
          <MainNavbar />
        </div>
        <AdminPanel />
      </main>

      <footer className="w-full text-center py-6 border-t border-[#242930]/30 select-none">
        <p className="text-[#6b7280] text-xs">
          3D Labs Cloud Admin • Управление доступом и безопасностью
        </p>
      </footer>
    </div>
  );
}
