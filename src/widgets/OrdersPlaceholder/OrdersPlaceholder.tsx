'use client';

import React from 'react';
import { ShoppingBag, Clock, CheckCircle2, AlertCircle, ArrowRight, Sparkles, UserCheck } from 'lucide-react';

interface OrdersPlaceholderProps {
  onGoToCalculator: () => void;
}

export function OrdersPlaceholder({ onGoToCalculator }: OrdersPlaceholderProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Заголовок и статус */}
      <div className="bg-[#16181d] border border-[#FF6B00]/20 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-[#FF6B00]/5">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#FF6B00]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF8800] shrink-0 shadow-lg shadow-[#FF6B00]/20">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">Управление заказами</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FF6B00]/15 text-[#FF8800] border border-[#FF6B00]/30">
                  <Sparkles className="w-3 h-3" /> В разработке
                </span>
              </div>
              <p className="text-[#9ca3af] text-sm">
                Полноценная CRM-система для отслеживания коммерческих заказов на 3D-печать
              </p>
            </div>
          </div>

          <button
            onClick={onGoToCalculator}
            className="sm:self-center shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF8800] hover:from-[#FF6600] hover:to-[#FF9900] text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-[#FF6B00]/25 cursor-pointer"
          >
            Перейти к калькулятору
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Заглушки метрик */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#16181d] border border-[#242930] rounded-xl p-5 flex items-center gap-4 opacity-80 hover:border-[#FF6B00]/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9ca3af]">В очереди</div>
            <div className="text-xl font-bold text-white">—</div>
          </div>
        </div>

        <div className="bg-[#16181d] border border-[#242930] rounded-xl p-5 flex items-center gap-4 opacity-80 hover:border-[#FF6B00]/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF8800]">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9ca3af]">В печати</div>
            <div className="text-xl font-bold text-white">—</div>
          </div>
        </div>

        <div className="bg-[#16181d] border border-[#242930] rounded-xl p-5 flex items-center gap-4 opacity-80 hover:border-[#FF6B00]/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#9ca3af]">Готово к выдаче</div>
            <div className="text-xl font-bold text-white">—</div>
          </div>
        </div>
      </div>

      {/* Карточка возможностей */}
      <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white mb-4">Скоро появится в этом разделе:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#0d0e12] border border-[#FF6B00]/20 space-y-2">
            <div className="flex items-center gap-2 text-[#FF8800] font-medium text-sm">
              <ShoppingBag className="w-4 h-4" />
              Отслеживание статусов
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Карточки заказов с контролем стадии: Ожидает оплаты, В печати, Постобработка, Готов.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0d0e12] border border-[#FF6B00]/20 space-y-2">
            <div className="flex items-center gap-2 text-[#FF8800] font-medium text-sm">
              <UserCheck className="w-4 h-4" />
              База клиентов
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Сохранение контактов заказчиков, история прошлых расчетов и повторные быстрые заказы.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
