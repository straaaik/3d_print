'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Order } from '@/shared/types';

interface Props {
  order: Order;
  isOpen: boolean;
  onToggle: () => void;
}

export function ContextTableRow({ order, isOpen, onToggle }: Props) {
  const isExpense = order.type === 'expense';

  return (
    <div
      onClick={onToggle}
      className={`group font-mono text-xs flex items-center justify-between px-3 sm:px-4 py-2.5 cursor-pointer border-b transition-colors select-none ${
        isOpen
          ? 'bg-neutral-900/90 border-white/20'
          : 'bg-neutral-950/70 border-white/10 hover:bg-neutral-900/60'
      }`}
      title="Кликните для сворачивания/разворачивания меню"
    >
      {/* Левая часть: Номер, Дата, Тип, Категория, Название */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-4">
        {/* Номер */}
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded tracking-wider shrink-0 text-neutral-200 bg-white/5 border border-white/10">
          #{order.order_number}
        </span>

        {/* Дата */}
        <span className="text-neutral-400 text-[11px] shrink-0">
          {order.date}
        </span>

        {/* Бейдж типа */}
        <span
          className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
            isExpense
              ? 'bg-rose-950/40 text-rose-400 border-rose-800/40'
              : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
          }`}
        >
          {isExpense ? 'Расход' : 'Доход'}
        </span>

        {/* Категория */}
        <span className="text-neutral-300 font-medium shrink-0 truncate max-w-[150px]">
          {order.client}
        </span>

        {/* Название и заметка */}
        <div className="min-w-0 flex-1 truncate text-left">
          <span className="text-white truncate block">{order.title}</span>
          {order.notes && (
            <span className="text-neutral-500 text-[10px] truncate block">
              {order.notes}
            </span>
          )}
        </div>
      </div>

      {/* Правая часть: Сумма, влияние на кассу и индикатор раскрытия */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <div className="text-white font-bold font-mono">
            {(order.amount || 0).toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-neutral-500 text-[10px]">
            себест. {(order.cost || 0).toLocaleString('ru-RU')} ₽
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <div className={`font-mono font-bold ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isExpense ? `-${(order.amount || 0).toLocaleString('ru-RU')} ₽` : `+${(order.amount || 0).toLocaleString('ru-RU')} ₽`}
          </div>
          <div className="text-neutral-500 text-[9px] uppercase">
            {isExpense ? 'В кассу' : 'Прибыль'}
          </div>
        </div>

        <div className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 group-hover:text-white bg-white/5 border border-white/10">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );
}
