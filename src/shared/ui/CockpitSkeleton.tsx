'use client';

import React from 'react';
import { CockpitContentTransition } from './CockpitContentTransition';
import { MainNavbar } from './MainNavbar';

// Базовая шапка терминала для всех скелетонов
export function SkeletonTerminalHeader({ title, badge = 'СИНХРОНИЗАЦИЯ...' }: { title: string; badge?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between border-b border-white/10 px-4 py-2.5 bg-neutral-900/60 gap-3 select-none">
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40 inline-block" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-400/40 inline-block" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40 inline-block" />
        </div>
        <div className="flex items-center gap-2 pl-3 border-l border-white/10 font-mono text-xs text-neutral-300">
          <span className="text-white font-bold">3D-LABS</span>
          <span className="text-neutral-600">{'//'}</span>
          <span className="text-neutral-400 uppercase tracking-wider">{title}</span>
          <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {badge}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-mono">
        <div className="w-24 h-7 rounded-lg bg-white/5 animate-pulse border border-white/10" />
        <div className="w-20 h-7 rounded-lg bg-white/5 animate-pulse border border-white/10 hidden sm:block" />
      </div>
    </div>
  );
}

// Базовый подвал телеметрии
export function SkeletonTerminalFooter() {
  return (
    <div className="border-t border-white/10 px-5 py-2.5 bg-neutral-950 flex flex-wrap items-center justify-between text-[11px] font-mono text-neutral-500 select-none gap-2">
      <div className="flex items-center gap-3">
        <div className="w-28 h-3.5 bg-white/5 rounded animate-pulse" />
        <span className="hidden sm:inline">•</span>
        <div className="w-24 h-3.5 bg-white/5 rounded animate-pulse hidden sm:block" />
        <span className="hidden md:inline">•</span>
        <div className="w-20 h-3.5 bg-white/5 rounded animate-pulse hidden md:block" />
      </div>
      <div className="w-32 h-3.5 bg-white/5 rounded animate-pulse" />
    </div>
  );
}

// 1. Скелетон для раздела Заказов (/orders)
export function OrdersSkeleton() {
  return (
    <div className="w-full max-w-[1500px] mx-auto select-none font-sans">
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
        <SkeletonTerminalHeader title="ЗАКАЗЫ" badge="ЗАГРУЗКА БАЗЫ..." />

        <CockpitContentTransition>
          <div className="p-3.5 sm:p-4 md:p-5 space-y-3 sm:space-y-3.5">
            {/* KPI карточки (5 колонок) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 sm:h-28 rounded-xl bg-white/[0.03] border border-white/10 p-3 flex flex-col justify-between animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="w-20 h-3 bg-white/10 rounded" />
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                  </div>
                  <div className="w-28 h-6 bg-white/15 rounded" />
                  <div className="w-16 h-2.5 bg-white/5 rounded" />
                </div>
              ))}
            </div>

            {/* Фильтр-бар */}
            <div className="h-12 rounded-xl bg-white/[0.03] border border-white/10 p-2 flex items-center justify-between animate-pulse gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="w-44 h-8 bg-white/10 rounded-lg" />
                <div className="w-28 h-8 bg-white/10 rounded-lg hidden sm:block" />
              </div>
              <div className="flex items-center gap-1.5 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-20 h-8 bg-white/10 rounded-lg hidden md:block" />
                ))}
                <div className="w-28 h-8 bg-white/10 rounded-lg" />
              </div>
            </div>

            {/* Таблица строк */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="h-10 border-b border-white/10 bg-white/[0.02] px-4 flex items-center justify-between">
                <div className="w-24 h-3 bg-white/10 rounded" />
                <div className="w-32 h-3 bg-white/10 rounded hidden sm:block" />
                <div className="w-24 h-3 bg-white/10 rounded hidden md:block" />
                <div className="w-20 h-3 bg-white/10 rounded" />
              </div>
              <div className="divide-y divide-white/5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-14 px-4 flex items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-4 bg-white/15 rounded" />
                      <div className="w-12 h-5 bg-emerald-500/10 border border-emerald-500/20 rounded" />
                    </div>
                    <div className="w-48 h-4 bg-white/10 rounded hidden sm:block" />
                    <div className="w-24 h-4 bg-white/10 rounded hidden md:block" />
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-4 bg-white/15 rounded" />
                      <div className="w-16 h-5 bg-cyan-500/10 border border-cyan-500/20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CockpitContentTransition>

        <SkeletonTerminalFooter />
      </div>
    </div>
  );
}

// 2. Скелетон для раздела Калькулятора (/calculator)
export function CalculatorSkeleton() {
  return (
    <div className="w-full max-w-[1500px] mx-auto select-none font-sans">
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
        <SkeletonTerminalHeader title="КАЛЬКУЛЯТОР" badge="ИНИЦИАЛИЗАЦИЯ..." />

        <CockpitContentTransition>
          <div className="p-4 sm:p-5 md:p-6 bg-gradient-to-b from-neutral-950 to-neutral-900/90">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
              {/* Левая колонка параметров */}
              <div className="space-y-4">
                {/* Быстрые пресеты */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                  <div className="flex gap-1.5 ml-auto">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-7 w-20 bg-white/10 rounded-lg animate-pulse" />
                    ))}
                  </div>
                </div>

                {/* Сетка параметров */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-xl bg-white/[0.03] border border-white/10 p-4 flex flex-col justify-between animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="w-24 h-3 bg-white/10 rounded" />
                        <div className="w-3 h-3 rounded-full bg-white/10" />
                      </div>
                      <div className="w-32 h-7 bg-white/15 rounded" />
                      <div className="pt-2 border-t border-white/5 flex gap-1.5">
                        <div className="w-12 h-4 bg-white/5 rounded" />
                        <div className="w-12 h-4 bg-white/5 rounded" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Дополнительные расходы */}
                <div className="h-28 rounded-xl bg-white/[0.03] border border-white/10 p-4 flex flex-col justify-between animate-pulse">
                  <div className="w-36 h-3.5 bg-white/10 rounded" />
                  <div className="flex gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-8 w-24 bg-white/10 rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Правая колонка сметы / квитанции */}
              <div className="rounded-xl bg-white/[0.04] border border-white/15 p-5 flex flex-col justify-between space-y-4 animate-pulse">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="w-32 h-4 bg-white/15 rounded" />
                    <div className="w-16 h-4 bg-white/10 rounded" />
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center py-1">
                        <div className="w-24 h-3 bg-white/10 rounded" />
                        <div className="w-16 h-3 bg-white/10 rounded" />
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <div className="w-20 h-3 bg-white/10 rounded" />
                    <div className="w-44 h-8 bg-white/20 rounded" />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="h-11 w-full bg-white/20 rounded-xl" />
                  <div className="h-9 w-full bg-white/5 rounded-xl border border-white/10" />
                </div>
              </div>
            </div>
          </div>
        </CockpitContentTransition>

        <SkeletonTerminalFooter />
      </div>
    </div>
  );
}

// 3. Скелетон для раздела Статистики (/stats)
export function StatsSkeleton() {
  return (
    <div className="w-full max-w-[1500px] mx-auto select-none font-sans">
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
        <SkeletonTerminalHeader title="СТАТИСТИКА" badge="СБОР ТЕЛЕМЕТРИИ..." />

        <CockpitContentTransition>
          <div className="p-3.5 sm:p-4 md:p-5 space-y-3.5">
            {/* Период и фильтры */}
            <div className="h-12 rounded-xl bg-white/[0.03] border border-white/10 p-2 flex flex-wrap items-center justify-between animate-pulse gap-2">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-20 h-8 bg-white/10 rounded-lg" />
                ))}
              </div>
              <div className="w-48 h-8 bg-white/10 rounded-lg" />
            </div>

            {/* KPI карточки */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-3 animate-pulse flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="w-20 h-3 bg-white/10 rounded" />
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                  </div>
                  <div className="w-28 h-6 bg-white/15 rounded" />
                  <div className="w-16 h-2.5 bg-white/5 rounded" />
                </div>
              ))}
            </div>

            {/* Календарь активности */}
            <div className="h-28 rounded-xl bg-white/[0.03] border border-white/10 p-4 animate-pulse flex flex-col justify-between">
              <div className="w-36 h-4 bg-white/10 rounded" />
              <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 w-full">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="h-6 rounded bg-white/5" />
                ))}
              </div>
            </div>

            {/* Графики */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              <div className="h-72 rounded-xl bg-white/[0.03] border border-white/10 p-4 animate-pulse flex flex-col justify-between lg:col-span-2">
                <div className="w-44 h-4 bg-white/10 rounded" />
                <div className="w-full h-48 bg-white/5 rounded" />
              </div>
              <div className="h-64 rounded-xl bg-white/[0.03] border border-white/10 p-4 animate-pulse flex flex-col justify-between">
                <div className="w-36 h-4 bg-white/10 rounded" />
                <div className="w-full h-40 bg-white/5 rounded" />
              </div>
              <div className="h-64 rounded-xl bg-white/[0.03] border border-white/10 p-4 animate-pulse flex flex-col justify-between">
                <div className="w-36 h-4 bg-white/10 rounded" />
                <div className="w-full h-40 bg-white/5 rounded" />
              </div>
            </div>
          </div>
        </CockpitContentTransition>

        <SkeletonTerminalFooter />
      </div>
    </div>
  );
}

// 4. Скелетон для раздела Товаров (/products)
export function ProductsSkeleton() {
  return (
    <div className="w-full max-w-[1500px] mx-auto select-none font-sans">
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
        <SkeletonTerminalHeader title="ТОВАРЫ" badge="ЗАГРУЗКА КАТАЛОГА..." />

        <CockpitContentTransition>
          <div className="p-3.5 sm:p-4 md:p-5 space-y-3.5">
            {/* KPI карточки */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 sm:h-28 rounded-xl bg-white/[0.03] border border-white/10 p-3 flex flex-col justify-between animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="w-20 h-3 bg-white/10 rounded" />
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                  </div>
                  <div className="w-24 h-6 bg-white/15 rounded" />
                  <div className="w-16 h-2.5 bg-white/5 rounded" />
                </div>
              ))}
            </div>

            {/* Фильтр-бар */}
            <div className="h-12 rounded-xl bg-white/[0.03] border border-white/10 p-2 flex items-center justify-between animate-pulse gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="w-48 h-8 bg-white/10 rounded-lg" />
                <div className="w-32 h-8 bg-white/10 rounded-lg hidden sm:block" />
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-24 h-8 bg-white/10 rounded-lg hidden md:block" />
                ))}
              </div>
            </div>

            {/* Таблица товаров */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="h-10 border-b border-white/10 bg-white/[0.02] px-4 flex items-center justify-between">
                <div className="w-32 h-3 bg-white/10 rounded" />
                <div className="w-24 h-3 bg-white/10 rounded hidden sm:block" />
                <div className="w-20 h-3 bg-white/10 rounded" />
              </div>
              <div className="divide-y divide-white/5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 px-4 flex items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 shrink-0" />
                      <div className="space-y-1">
                        <div className="w-36 h-4 bg-white/15 rounded" />
                        <div className="w-20 h-2.5 bg-white/5 rounded" />
                      </div>
                    </div>
                    <div className="w-24 h-4 bg-white/10 rounded hidden sm:block" />
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-4 bg-white/15 rounded" />
                      <div className="w-16 h-5 bg-emerald-500/10 border border-emerald-500/20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CockpitContentTransition>

        <SkeletonTerminalFooter />
      </div>
    </div>
  );
}

// 5. Скелетон для Филаментов (/filaments)
export function FilamentsSkeleton() {
  return (
    <div className="w-full max-w-[1500px] mx-auto select-none font-sans">
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
        <SkeletonTerminalHeader title="СЫРЬЕ И СКЛАД" badge="СИНХРОНИЗАЦИЯ..." />

        <CockpitContentTransition>
          <div className="p-3.5 sm:p-4 md:p-5 space-y-4">
            {/* Карточки KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-2 animate-pulse flex flex-col justify-between">
                  <div className="w-24 h-3 bg-white/10 rounded" />
                  <div className="w-28 h-6 bg-white/15 rounded" />
                  <div className="w-16 h-2 bg-white/5 rounded" />
                </div>
              ))}
            </div>

            {/* Тулбар поиска и сортировки */}
            <div className="h-12 rounded-xl bg-white/[0.03] border border-white/10 p-2 flex items-center justify-between animate-pulse gap-3">
              <div className="w-48 h-8 bg-white/10 rounded-lg" />
              <div className="flex items-center gap-2">
                <div className="w-36 h-8 bg-white/10 rounded-lg hidden sm:block" />
                <div className="w-36 h-8 bg-cyan-500/20 border border-cyan-500/30 rounded-lg" />
              </div>
            </div>

            {/* Сетка катушек */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 rounded-xl bg-white/[0.03] border border-white/10 p-4 flex flex-col justify-between animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="w-32 h-4 bg-white/15 rounded" />
                      <div className="w-20 h-3 bg-white/5 rounded" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-white/10" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="w-16 h-3 bg-white/10 rounded" />
                      <div className="w-16 h-3 bg-white/10 rounded" />
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="w-20 h-5 bg-cyan-500/10 border border-cyan-500/20 rounded" />
                    <div className="w-16 h-4 bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CockpitContentTransition>

        <SkeletonTerminalFooter />
      </div>
    </div>
  );
}

// 6. Скелетон для Принтеров (/printers)
export function PrintersSkeleton() {
  return (
    <div className="w-full max-w-[1500px] mx-auto select-none font-sans">
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
        <SkeletonTerminalHeader title="ОБОРУДОВАНИЕ" badge="СИНХРОНИЗАЦИЯ..." />

        <CockpitContentTransition>
          <div className="p-3.5 sm:p-4 md:p-5 space-y-4">
            {/* Карточки KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-2 animate-pulse flex flex-col justify-between">
                  <div className="w-24 h-3 bg-white/10 rounded" />
                  <div className="w-28 h-6 bg-white/15 rounded" />
                  <div className="w-16 h-2 bg-white/5 rounded" />
                </div>
              ))}
            </div>

            {/* Тулбар поиска и сортировки */}
            <div className="h-12 rounded-xl bg-white/[0.03] border border-white/10 p-2 flex items-center justify-between animate-pulse gap-3">
              <div className="w-48 h-8 bg-white/10 rounded-lg" />
              <div className="flex items-center gap-2">
                <div className="w-36 h-8 bg-white/10 rounded-lg hidden sm:block" />
                <div className="w-36 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-lg" />
              </div>
            </div>

            {/* Сетка принтеров */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 rounded-xl bg-white/[0.03] border border-white/10 p-4 flex flex-col justify-between animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="w-36 h-4 bg-white/15 rounded" />
                      <div className="w-24 h-3 bg-white/5 rounded" />
                    </div>
                    <div className="w-16 h-5 bg-emerald-500/10 border border-emerald-500/20 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="w-20 h-3 bg-white/10 rounded" />
                      <div className="w-16 h-3 bg-white/10 rounded" />
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="w-24 h-5 bg-cyan-500/10 border border-cyan-500/20 rounded" />
                    <div className="w-16 h-4 bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CockpitContentTransition>

        <SkeletonTerminalFooter />
      </div>
    </div>
  );
}

// Алиас для обратной совместимости
export function InventorySkeleton({ title = 'СКЛАД' }: { title?: string }) {
  if (title.toUpperCase().includes('ПРИНТ')) {
    return <PrintersSkeleton />;
  }
  return <FilamentsSkeleton />;
}

// 7. Скелетон для Настроек (/settings)
export function SettingsSkeleton() {
  return (
    <div className="w-full max-w-[1500px] mx-auto select-none font-sans">
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
        <SkeletonTerminalHeader title="НАСТРОЙКИ" badge="КОНФИГУРАЦИЯ..." />

        <CockpitContentTransition>
          <div className="p-5 space-y-5">
            <div className="flex gap-2 border-b border-white/10 pb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-24 h-8 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-2 animate-pulse">
                  <div className="w-28 h-3 bg-white/10 rounded" />
                  <div className="w-full h-8 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          </div>
        </CockpitContentTransition>

        <SkeletonTerminalFooter />
      </div>
    </div>
  );
}

// 8. Скелетон для Главной страницы (Hub /)
export function HubSkeleton() {
  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden bg-[#0a0a0a]">
      {/* Верхний бар */}
      <div className="w-full flex items-center justify-between z-20">
        <div className="flex items-center gap-2 font-mono text-xs text-neutral-400 tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-neutral-300">3D-LABS</span>
          <span className="text-neutral-600">//</span>
          <span className="text-neutral-400">OPERATIONS HUB</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
      </div>

      {/* Центральный ряд парящих модулей */}
      <div className="w-full flex-1 flex flex-col items-center justify-center py-6 sm:py-12 z-10">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-center -space-x-10 sm:-space-x-16 md:-space-x-20 lg:-space-x-24 xl:-space-x-28 px-4 py-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="relative w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 lg:w-60 lg:h-60 xl:w-64 xl:h-64 rounded-3xl bg-white/[0.02] border border-white/5 shadow-2xl backdrop-blur-sm animate-pulse flex items-center justify-center"
            >
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-white/5" />
            </div>
          ))}
        </div>
      </div>

      {/* Нижняя телеметрия */}
      <div className="w-full flex items-center justify-between text-[11px] font-mono text-neutral-600 z-20 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span>3D LABS</span>
          <span>·</span>
          <span>SYSTEM RUNTIME 2.4</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-neutral-500">
          <span>6 MODULES ONLINE</span>
          <span>·</span>
          <span>LOCAL + CLOUD SYNC</span>
        </div>
      </div>
    </div>
  );
}

// 9. Оболочка CockpitWorkspaceSkeleton для полного каркаса со шапкой, навбаром и подвалом
export function CockpitWorkspaceSkeleton({ initialTab = 'orders' }: { initialTab?: 'orders' | 'stats' | 'calculator' | 'products' | 'filaments' | 'printers' }) {
  return (
    <div className="min-h-screen bg-dot-grid text-white flex flex-col justify-between font-sans selection:bg-white/20 selection:text-white">
      <main className="w-full mx-auto max-w-none px-3 sm:px-6 py-4 md:py-6 space-y-6">
        <div className="flex justify-center">
          <MainNavbar activeTab={initialTab} />
        </div>

        <div>
          {initialTab === 'orders' && <OrdersSkeleton />}
          {initialTab === 'calculator' && <CalculatorSkeleton />}
          {initialTab === 'stats' && <StatsSkeleton />}
          {initialTab === 'products' && <ProductsSkeleton />}
          {initialTab === 'filaments' && <FilamentsSkeleton />}
          {initialTab === 'printers' && <PrintersSkeleton />}
        </div>
      </main>

      <footer className="w-full text-center py-6 border-t border-white/10 select-none bg-neutral-950/80 backdrop-blur-md font-mono text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>3D LABS · COCKPIT WORKSPACE v2.4</span>
          <span>ДАННЫЕ СОХРАНЯЮТСЯ В LOCALSTORAGE И SUPABASE</span>
        </div>
      </footer>
    </div>
  );
}
