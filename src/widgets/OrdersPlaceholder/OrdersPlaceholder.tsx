'use client';

import React from 'react';
import { ShoppingBag, Clock, CheckCircle2, AlertCircle, ArrowRight, Sparkles, UserCheck } from 'lucide-react';
import { CockpitButton } from '../../shared/ui/CockpitButton';

interface OrdersPlaceholderProps {
  onGoToCalculator: () => void;
}

export function OrdersPlaceholder({ onGoToCalculator }: OrdersPlaceholderProps) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto py-2 font-mono text-xs select-none">
      {/* Терминальная шапка */}
      <div className="rounded-2xl border border-white/15 bg-neutral-950/90 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-cyan-400 shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white tracking-tight font-sans">Управление заказами</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 font-mono">
                  <Sparkles className="w-3 h-3" /> В РАЗРАБОТКЕ
                </span>
              </div>
              <p className="text-neutral-400 text-xs font-sans">
                Полноценная CRM-система для отслеживания коммерческих заказов на 3D-печать
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

      {/* Заглушки метрик */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase">В очереди</div>
            <div className="text-base font-bold text-white font-mono">—</div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase">В печати</div>
            <div className="text-base font-bold text-white font-mono">—</div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase">Готово к выдаче</div>
            <div className="text-base font-bold text-white font-mono">—</div>
          </div>
        </div>
      </div>

      {/* Карточка возможностей */}
      <div className="bg-neutral-950/90 border border-white/15 rounded-2xl p-5 sm:p-6 space-y-3">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
          § 3D-LABS // ПЛАНИРУЕМЫЕ МОДУЛИ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <ShoppingBag className="w-3.5 h-3.5" />
              Отслеживание статусов
            </div>
            <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
              Карточки заказов с контролем стадии: Ожидает оплаты, В печати, Постобработка, Готов.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <UserCheck className="w-3.5 h-3.5" />
              База клиентов
            </div>
            <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
              Сохранение контактов заказчиков, история прошлых расчетов и повторные быстрые заказы.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
