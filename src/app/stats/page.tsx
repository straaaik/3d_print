'use client';

import React from 'react';
import { StatsDashboard } from '../../widgets/Stats/StatsDashboard';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { useData } from '../../entities/model/DataProvider';

export default function StatsPage() {
  const { isLoading } = useData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-9 h-9 rounded-full border-2 border-white/10 border-t-white animate-spin" />
          <p className="text-neutral-400 text-xs font-mono font-semibold">
            Инициализация модуля статистики 3D Labs...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dot-grid text-white flex flex-col justify-between font-sans selection:bg-white/20 selection:text-white">
      <main className="w-full mx-auto px-3 sm:px-6 py-4 md:py-6 max-w-none space-y-6">
        {/* Главный верхний таббар навигации */}
        <div className="flex justify-center">
          <MainNavbar />
        </div>

        <StatsDashboard />
      </main>

      <footer className="w-full text-center py-6 border-t border-white/10 select-none bg-neutral-950/80 backdrop-blur-md font-mono text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>§ 3D LABS · STATS ENGINE v1.0</span>
          <span>ДАННЫЕ СОХРАНЯЮТСЯ В LOCALSTORAGE И SUPABASE</span>
        </div>
      </footer>
    </div>
  );
}
