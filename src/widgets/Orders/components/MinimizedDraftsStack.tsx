'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatMoney } from '../helpers';
import { Order } from '../types';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { MotionPing, MotionPulse } from '../../../shared/ui/MotionPrimitives';

export interface MinimizedDraft {
  id: string;
  order: Partial<Order>;
  savedAt: number;
}

interface MinimizedDraftsStackProps {
  drafts: MinimizedDraft[];
  onRestore: (id: string) => void;
  onDiscard: (id: string) => void;
}

export function MinimizedDraftsStack({
  drafts,
  onRestore,
  onDiscard,
}: MinimizedDraftsStackProps) {
  if (drafts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2.5 items-end pointer-events-none select-none">
      <AnimatePresence mode="popLayout">
        {drafts.map((draft) => {
          const isIncome = draft.order.type !== 'expense';
          const title = draft.order.title?.trim() || (isIncome ? 'Новый заказ' : 'Новый расход');
          const amount = draft.order.amount || 0;
          const subtitle = isIncome
            ? (draft.order.client_name || draft.order.contact || draft.order.client || 'Клиент')
            : (draft.order.client || 'Расход');

          return (
            <motion.div
              key={draft.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={() => onRestore(draft.id)}
              className="pointer-events-auto group relative flex items-center justify-between gap-3.5 py-2.5 px-3.5 rounded-xl border border-white/15 bg-neutral-950/95 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-2xl font-mono text-xs cursor-pointer hover:border-white/40 hover:bg-neutral-900/95 w-[280px] sm:w-[320px]"
            >
              {/* Левая часть: Индикатор и тип */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="relative flex items-center justify-center shrink-0">
                  <MotionPulse className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <MotionPing className="absolute w-4 h-4 rounded-full bg-amber-400/30" />
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold tracking-wider uppercase px-1 py-0.2 rounded border shrink-0 ${
                      isIncome
                        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                        : 'text-rose-400 bg-rose-950/40 border-rose-800/40'
                    }`}>
                      {isIncome ? 'ДОХОД' : 'РАСХОД'}
                    </span>
                    <span className="text-white font-medium truncate text-xs group-hover:text-amber-200 ">
                      {title}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#71717a] pt-0.5">
                    <span className="truncate max-w-[140px]">{subtitle}</span>
                    <span className={`font-semibold shrink-0 ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatMoney(amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Правая часть: Кнопки Развернуть и Закрыть */}
              <div className="flex items-center gap-1 shrink-0 border-l border-white/10 pl-2">
                <Tooltip content="Развернуть черновик">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(draft.id);
                    }}
                    className="p-1 rounded-md text-[#71717a] hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <span className="text-xs">↗</span>
                  </button>
                </Tooltip>

                <Tooltip content="Закрыть черновик">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDiscard(draft.id);
                    }}
                    className="p-1 rounded-md text-[#71717a] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <span className="text-sm font-bold leading-none">×</span>
                  </button>
                </Tooltip>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
