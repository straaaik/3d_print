'use client';

import React from 'react';
import { OrdersTable } from '../../widgets/Orders/OrdersTable';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { useData } from '../../entities/model/DataProvider';

export default function OrdersPage() {
  const { isLoading } = useData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-10 h-10 rounded-full border-4 border-[#242930] border-t-[#FF6B00] animate-spin" />
          <p className="text-gray-400 text-sm font-semibold animate-pulse">
            Загрузка списка заказов...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0e12]/60 flex flex-col justify-between font-sans">
      <main className="w-full mx-auto px-3 sm:px-6 py-4 md:py-6 max-w-none space-y-4">
        {/* Главный верхний таббар навигации */}
        <div className="flex justify-center">
          <MainNavbar />
        </div>

        <OrdersTable />
      </main>

      <footer className="w-full text-center py-6 border-t border-[#242930]/30 select-none">
        <p className="text-[#6b7280] text-xs">
          Все данные хранятся локально в этом браузере (localStorage) и Supabase.
        </p>
      </footer>
    </div>
  );
}
