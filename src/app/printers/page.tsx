'use client';

import React from 'react';
import { PrinterList } from '../../widgets/PrinterList/PrinterList';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { useData } from '../../entities/model/DataProvider';

export default function PrintersPage() {
  const { isLoading } = useData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3 select-none">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin" />
          <p className="text-neutral-400 text-xs font-mono animate-pulse">
            Загрузка оборудования 3D-печати...
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
        <PrinterList />
      </main>

      <footer className="w-full text-center py-6 border-t border-white/10 bg-neutral-950 select-none font-mono text-[11px] text-neutral-500">
        <p>
          § 3D LABS · PRINTERS RUNTIME · Хранилище: LocalStorage + Supabase Cloud
        </p>
      </footer>
    </div>
  );
}
