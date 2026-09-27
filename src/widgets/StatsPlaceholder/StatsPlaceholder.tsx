'use client';

import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Layers, Printer, Sparkles, ArrowRight } from 'lucide-react';
import { CockpitButton } from '../../shared/ui/CockpitButton';

interface StatsPlaceholderProps {
  onGoToCalculator: () => void;
}

export function StatsPlaceholder({ onGoToCalculator }: StatsPlaceholderProps) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto py-2 font-mono text-xs select-none">
      {/* Терминальная шапка */}
      <div className="rounded-2xl border border-white/15 bg-neutral-950/90 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-cyan-400 shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white tracking-tight font-sans">Аналитика и Статистика</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 font-mono">
                  <Sparkles className="w-3 h-3" /> В РАЗРАБОТКЕ
                </span>
              </div>
              <p className="text-neutral-400 text-xs font-sans">
                Финансовый учет, аналитика расхода филаментов и статистика работы оборудования
              </p>
            </div>
          </div>

          <CockpitButton
            onClick={onGoToCalculator}
            icon={ArrowRight}
            isActive={true}
            className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
          >
            К калькулятору
          </CockpitButton>
        </div>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase">Выручка за месяц</div>
            <div className="text-base font-bold text-white font-mono">0 ₽</div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase">Расход пластика</div>
            <div className="text-base font-bold text-white font-mono">0.0 кг</div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-300">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase">Часов печати</div>
            <div className="text-base font-bold text-white font-mono">0 ч</div>
          </div>
        </div>
      </div>

      {/* Планируемые отчеты */}
      <div className="bg-neutral-950/90 border border-white/15 rounded-2xl p-5 sm:p-6 space-y-3">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
          KUMO CRM // ПЛАНИРУЕМЫЕ ОТЧЕТЫ И ГРАФИКИ
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
              Прибыльность и окупаемость
            </div>
            <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
              Автоматический расчет чистой прибыли с учетом амортизации принтеров, электричества и небракованной печати.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <Layers className="w-3.5 h-3.5" />
              Остатки материалов
            </div>
            <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
              Графическое отслеживание расхода катушек и предупреждение о необходимости дозакупки пластика.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
