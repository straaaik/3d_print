'use client';

import React from 'react';
import { Order } from '../types';
import { CockpitModal } from '../../../shared/ui/CockpitModal';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { formatMoney } from '../helpers';

interface DeleteOrderModalProps {
  order: Order | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteOrderModal({
  order,
  onClose,
  onConfirm,
}: DeleteOrderModalProps) {
  if (!order) return null;

  const isExpense = order.type === 'expense';

  return (
    <CockpitModal
      isOpen={!!order}
      onClose={onClose}
      stamp="DELETE_CONFIRMATION"
      variant="error"
      maxWidth="sm"
      title={
        <span className="text-rose-400 font-mono text-sm uppercase tracking-wider flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Подтверждение удаления</span>
        </span>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] text-neutral-500 font-mono">
            Действие необратимо
          </span>
          <div className="flex items-center gap-2">
            <CockpitButton type="button" onClick={onClose}>
              Отмена
            </CockpitButton>
            <CockpitButton
              type="button"
              onClick={onConfirm}
              icon={Trash2}
              className="text-rose-300 hover:text-white border-rose-500/40 hover:border-rose-500/70 bg-rose-950/60 hover:bg-rose-900/80 font-bold"
            >
              Удалить запись
            </CockpitButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4 font-mono text-xs">
        {/* Карточка предупреждения */}
        <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-neutral-300 leading-relaxed font-sans">
            Вы действительно хотите удалить {isExpense ? 'операционный расход' : 'заказ'}{' '}
            <strong className="text-white font-bold font-mono">
              #{order.order_number || ''} «{order.title}»
            </strong>{' '}
            на сумму{' '}
            <span className="font-mono font-bold text-rose-400">
              {formatMoney(order.amount)}
            </span>
            ?
          </div>
        </div>

        {/* Подсказка об отмене действия */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] text-neutral-400 flex items-center justify-between">
          <span>Горячие клавиши отмены:</span>
          <kbd className="px-2 py-0.5 bg-neutral-900 border border-white/15 rounded text-neutral-200 font-mono text-[10px] font-bold">
            Alt + Z
          </kbd>
        </div>
      </div>
    </CockpitModal>
  );
}
