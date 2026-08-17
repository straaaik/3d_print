'use client';

import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Layers, Printer, Sparkles, ArrowRight } from 'lucide-react';

interface StatsPlaceholderProps {
  onGoToCalculator: () => void;
}

export function StatsPlaceholder({ onGoToCalculator }: StatsPlaceholderProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Заголовок и статус */}
      <div className="bg-[#16181d] border border-[#00e676]/20 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-[#00e676]/5">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#00e676]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00e676]/15 border border-[#00e676]/30 flex items-center justify-center text-[#00e676] shrink-0 shadow-lg shadow-[#00e676]/20">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">Аналитика и Статистика</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30">
                  <Sparkles className="w-3 h-3" /> В разработке
                </span>
              </div>
              <p className="text-[#9ca3af] text-sm">
                Финансовый учет, аналитика расхода филаментов и статистика работы оборудования
              </p>
            </div>
          </div>

          <button
            onClick={onGoToCalculator}
            className="sm:self-center shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00e676] to-[#10b981] hover:from-[#10e576] hover:to-[#34d399] text-[#0d0e12] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-[#00e676]/25 cursor-pointer"
          >
            Перейти к калькулятору
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Заглушки метрик аналитики */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#16181d] border border-[#242930] rounded-xl p-5 flex items-center gap-4 opacity-80 hover:border-[#00e676]/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-[#00e676]/15 border border-[#00e676]/30 flex items-center justify-center text-[#00e676]">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9ca3af]">Выручка за месяц</div>
            <div className="text-xl font-bold text-white">0 ₽</div>
          </div>
        </div>

        <div className="bg-[#16181d] border border-[#242930] rounded-xl p-5 flex items-center gap-4 opacity-80 hover:border-[#00e676]/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9ca3af]">Расход пластика</div>
            <div className="text-xl font-bold text-white">0.0 кг</div>
          </div>
        </div>

        <div className="bg-[#16181d] border border-[#242930] rounded-xl p-5 flex items-center gap-4 opacity-80 hover:border-[#00e676]/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9ca3af]">Часов печати</div>
            <div className="text-xl font-bold text-white">0 ч</div>
          </div>
        </div>
      </div>

      {/* Визуальный макет аналитических графиков */}
      <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-semibold text-white">Планируемые отчеты и графики:</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#0d0e12] border border-[#00e676]/20 space-y-3">
            <div className="flex items-center gap-2 text-[#00e676] font-medium text-sm">
              <TrendingUp className="w-4 h-4" />
              Прибыльность и окупаемость
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Автоматический расчет чистой прибыли с учетом амортизации принтеров, электричества и небракованной печати.
            </p>
            <div className="h-16 flex items-end gap-1.5 pt-2 border-b border-[#242930]/40 px-2 opacity-70">
              <div className="w-full bg-[#00e676]/20 h-4 rounded-t" />
              <div className="w-full bg-[#00e676]/40 h-8 rounded-t" />
              <div className="w-full bg-[#00e676]/60 h-6 rounded-t" />
              <div className="w-full bg-[#00e676]/80 h-11 rounded-t" />
              <div className="w-full bg-[#00e676] h-14 rounded-t shadow-sm shadow-[#00e676]/50" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0d0e12] border border-[#00e676]/20 space-y-3">
            <div className="flex items-center gap-2 text-[#00e676] font-medium text-sm">
              <Layers className="w-4 h-4" />
              Остатки материалов
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Графическое отслеживание расхода катушек и предупреждение о необходимости дозакупки пластика.
            </p>
            <div className="space-y-2 pt-1 opacity-70">
              <div className="w-full bg-[#1c2026] h-2 rounded-full overflow-hidden">
                <div className="bg-[#00e676] h-full w-3/4 rounded-full shadow-sm shadow-[#00e676]/50" />
              </div>
              <div className="w-full bg-[#1c2026] h-2 rounded-full overflow-hidden">
                <div className="bg-[#10b981]/60 h-full w-1/2 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
