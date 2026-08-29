'use client';

import React from 'react';
import Link from 'next/link';
import { Box, ArrowRight, ShieldCheck, Terminal, Heart } from 'lucide-react';
import { useAuth } from '../../entities/model/AuthProvider';

export function AboutFooter() {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="bg-neutral-950 text-neutral-400 font-sans border-t border-white/15 select-none relative overflow-hidden">
      
      {/* Главный финальный CTA блок */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-b border-white/10">
        <div className="border border-white/15 bg-gradient-to-b from-white/[0.04] to-transparent p-8 sm:p-14 rounded-3xl relative overflow-hidden text-center max-w-4xl mx-auto">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-mono text-xs mb-6">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            ГОТОВО К ВНЕДРЕНИЮ В ВАШЕЙ МАСТЕРСКОЙ
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.05]">
            Управляйте 3D-печатью <br />
            <em className="text-neutral-400 font-normal italic">как высокоточным бизнесом.</em>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Подключите единый пульт управления: считайте себестоимость за 12 секунд, держите заказы под контролем и отслеживайте каждый грамм пластика.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={isAuthenticated ? '/orders' : '/login'}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl font-bold tracking-tight text-sm h-12 px-8 bg-white text-neutral-950 hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {isAuthenticated ? 'Перейти в консоль управления' : 'Начать работу с 3D Labs'}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <a
              href="#overview"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl font-semibold text-sm h-12 px-6 border border-white/20 text-white hover:bg-white/5 transition-all"
            >
              Изучить возможности
            </a>
          </div>

        </div>
      </div>

      {/* Навигационные колонки и статус системы */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-2 md:grid-cols-5 gap-8">
        
        {/* Бренд колонка */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Box className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">3D Labs OS</span>
          </div>

          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm">
            Профессиональная операционная система для студий 3D-печати, инжиниринговых мастерских и мелкосерийного аддитивного производства.
          </p>

          <div className="pt-2 font-mono text-xs text-neutral-500 space-y-1">
            <div>ARCHITECTURE: NEXT.JS 16 · REACT 19 · SUPABASE</div>
            <div>STATUS: ALL NODES OPERATIONAL · 99.98% UPTIME</div>
          </div>
        </div>

        {/* Колонка 1: Модули */}
        <div className="space-y-3">
          <div className="font-mono text-xs font-bold text-white uppercase tracking-wider">Модули</div>
          <ul className="space-y-2 text-xs">
            <li><Link href="/calculator" className="hover:text-cyan-400 transition-colors">Калькулятор печати</Link></li>
            <li><Link href="/orders" className="hover:text-cyan-400 transition-colors">Воронка заказов (CRM)</Link></li>
            <li><Link href="/products" className="hover:text-cyan-400 transition-colors">Каталог и сборки</Link></li>
            <li><Link href="/filaments" className="hover:text-cyan-400 transition-colors">Склад филаментов</Link></li>
            <li><Link href="/printers" className="hover:text-cyan-400 transition-colors">Парк принтеров</Link></li>
            <li><Link href="/stats" className="hover:text-cyan-400 transition-colors">Статистика</Link></li>
          </ul>
        </div>

        {/* Колонка 2: Возможности */}
        <div className="space-y-3">
          <div className="font-mono text-xs font-bold text-white uppercase tracking-wider">Технологии</div>
          <ul className="space-y-2 text-xs">
            <li><span className="text-neutral-400">IndexedDB STL Engine</span></li>
            <li><span className="text-neutral-400">LocalStorage Offline Sync</span></li>
            <li><span className="text-neutral-400">Supabase Cloud Security</span></li>
            <li><span className="text-neutral-400">Лицензионные ключи</span></li>
            <li><span className="text-neutral-400">Расчет машино-часов</span></li>
            <li><span className="text-neutral-400">Экспорт в Telegram/WhatsApp</span></li>
          </ul>
        </div>

        {/* Колонка 3: Доступ */}
        <div className="space-y-3">
          <div className="font-mono text-xs font-bold text-white uppercase tracking-wider">Вход в систему</div>
          <ul className="space-y-2 text-xs">
            <li><Link href="/login" className="text-cyan-400 hover:underline">Авторизация по ключу</Link></li>
            <li><Link href="/orders" className="hover:text-white transition-colors">Панель заказов</Link></li>
            <li><Link href="/admin" className="hover:text-white transition-colors">Панель администратора</Link></li>
            <li><Link href="/settings" className="hover:text-white transition-colors">Настройки тарифов</Link></li>
          </ul>
        </div>

      </div>

      {/* Копирайт и технический штамп */}
      <div className="border-t border-white/10 px-4 sm:px-6 py-6 bg-neutral-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-neutral-500">
          <div>
            © 2026 3D LABS. ВСЕ ПРАВА ЗАЩИЩЕНЫ · PRECISION 3D PRINTING SOFTWARE
          </div>
          <div className="flex items-center gap-2">
            <span>СДЕЛАНО ДЛЯ МАСТЕРОВ 3D-ПЕЧАТИ</span>
          </div>
        </div>
      </div>

    </footer>
  );
}
