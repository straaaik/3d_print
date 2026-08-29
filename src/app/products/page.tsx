'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProductsList } from '../../widgets/ProductsList/ProductsList';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { useData } from '../../entities/model/DataProvider';
import { usePersistentState } from '../../shared/lib/usePersistentState';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { Tooltip } from '../../shared/ui/Tooltip';
import { Sparkles, Maximize2, ArrowLeft, Home, Layers, TrendingUp } from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const { isLoading } = useData();
  const [isExpanded, setIsExpanded] = usePersistentState<boolean>('3d_products_expanded_view', false);

  const isPreviewProd = typeof window !== 'undefined' && (
    window.location.search.includes('preview=prod') || 
    window.location.search.includes('prod=1')
  );
  const isProduction = process.env.NODE_ENV === 'production' || isPreviewProd;
  const showProductionBlur = isExpanded && isProduction;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-9 h-9 rounded-full border-2 border-white/10 border-t-white animate-spin" />
          <p className="text-neutral-400 text-xs font-mono font-semibold">
            Инициализация каталога товаров 3D Labs...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-dot-grid text-white flex flex-col font-sans selection:bg-white/20 selection:text-white ${
      isExpanded 
        ? 'p-3 sm:p-4 md:p-6 justify-start' 
        : 'p-0 justify-between'
    }`}>
      <main className={`w-full mx-auto max-w-none ${
        isExpanded ? 'p-0 space-y-0' : 'px-3 sm:px-6 py-4 md:py-6 space-y-6'
      }`}>
        {/* Главный верхний таббар навигации и профиль (полностью скрывается в полноэкранном режиме) */}
        {!isExpanded && (
          <div className="flex justify-center">
            <MainNavbar />
          </div>
        )}

        <ProductsList 
          isExpanded={isExpanded}
          onToggleExpand={setIsExpanded}
        />
      </main>

      {/* Глобальный подвал страницы (скрывается в полноэкранном режиме) */}
      {!isExpanded && (
        <footer className="w-full text-center py-6 border-t border-white/10 select-none bg-neutral-950/80 backdrop-blur-md font-mono text-xs text-neutral-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>§ 3D LABS · CATALOG RUNTIME v2.4</span>
            <span>ДАННЫЕ СОХРАНЯЮТСЯ В LOCALSTORAGE И SUPABASE</span>
          </div>
        </footer>
      )}

      {/* Оверлей-заглушка с размытием для production-режима */}
      {showProductionBlur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-2xl animate-fade-in select-none">
          <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-neutral-950/95 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.95)] backdrop-blur-3xl overflow-hidden font-mono">
            {/* Шапка модального окна в стиле Cockpit Console */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-neutral-900/80">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Tooltip content="На главную">
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40 hover:bg-red-500 hover:scale-125 transition-all duration-150 cursor-pointer outline-none"
                    />
                  </Tooltip>
                  <Tooltip content="Свернуть в стандартный вид">
                    <button
                      type="button"
                      onClick={() => setIsExpanded(false)}
                      className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-400/40 hover:bg-yellow-400 hover:scale-125 transition-all duration-150 cursor-pointer outline-none"
                    />
                  </Tooltip>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-400/20" />
                </div>
                <span className="font-bold text-neutral-300 tracking-wider text-xs">
                  § 3D-LABS // FULLSCREEN RUNTIME
                </span>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 font-mono">
                <Sparkles className="w-3 h-3" /> В РАЗРАБОТКЕ
              </span>
            </div>

            {/* Тело сообщения */}
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <Maximize2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-white font-sans tracking-tight">
                    Полноэкранный режим пока в разработке
                  </h3>
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                    Развёрнутый полноэкранный режим каталога с разделением всех столбцов и расширенной складской аналитикой проходит тестирование и временно доступен только в режиме разработки.
                  </p>
                </div>
              </div>

              {/* Информационные плашки планируемых возможностей */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/10 text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5 text-neutral-300 font-sans">
                  <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>14 раздельных колонок данных</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5 text-neutral-300 font-sans">
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Детальная финансово-складская телеметрия</span>
                </div>
              </div>

              {/* Кнопки возврата */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <CockpitButton
                  onClick={() => router.push('/')}
                  icon={Home}
                  className="w-full sm:w-auto justify-center text-xs"
                >
                  На главную
                </CockpitButton>

                <CockpitButton
                  onClick={() => setIsExpanded(false)}
                  icon={ArrowLeft}
                  isActive={true}
                  className="w-full sm:w-auto justify-center text-xs font-bold"
                >
                  Свернуть в стандартный вид
                </CockpitButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
