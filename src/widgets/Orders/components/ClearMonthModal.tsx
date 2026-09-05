'use client';

import React from 'react';
import { CockpitModal } from '../../../shared/ui/CockpitModal';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { formatMonthKeyLabel } from '../helpers';

interface ClearMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonthKey: string;
  monthOrdersCount: number;
  onConfirm: () => void;
}

export function ClearMonthModal({
  isOpen,
  onClose,
  selectedMonthKey,
  monthOrdersCount,
  onConfirm,
}: ClearMonthModalProps) {
  if (!isOpen) return null;

  const isAll = selectedMonthKey === 'all';
  const targetLabel = isAll ? 'все время' : formatMonthKeyLabel(selectedMonthKey);
  const title = isAll ? 'Очистка всех записей' : `Очистка месяца ${targetLabel}`;

  return (
    <CockpitModal
      isOpen={isOpen}
      onClose={onClose}
      variant="error"
      maxWidth="sm"
      title={title}
      subtitle="Очистка реестра"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] text-neutral-500 font-mono">
            Записей: {monthOrdersCount}
          </span>
          <div className="flex items-center gap-2">
            <CockpitButton type="button" onClick={onClose}>
              Закрыть
            </CockpitButton>

            <CockpitButton
              type="button"
              onClick={onConfirm}
              icon={Trash2}
              className="text-rose-300 hover:text-white border-rose-500/40 hover:border-rose-500/70 bg-rose-950/60 hover:bg-rose-900/80 font-bold"
            >
              {isAll ? `Очистить все (${monthOrdersCount})` : `Очистить месяц (${monthOrdersCount})`}
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
            Вы уверены, что хотите удалить {isAll ? 'ВСЕ ' : 'все '}
            <strong className="text-white font-bold font-mono">{monthOrdersCount} записей</strong> за{' '}
            <strong className="text-white font-bold">{targetLabel}</strong>?
          </div>
        </div>

        {/* Инфо-блок */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] text-neutral-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Действие можно отменить:</span>
            <kbd className="px-2 py-0.5 bg-neutral-900 border border-white/15 rounded text-neutral-200 font-mono text-[10px] font-bold">
              Alt + Z
            </kbd>
          </div>
          <p className="text-[10px] text-neutral-500 pt-1 border-t border-white/5">
            Все выбранные заказы и статьи расходов будут удалены из базы данных и локального кэша.
          </p>
        </div>
      </div>
    </CockpitModal>
  );
}
