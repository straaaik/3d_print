import React, { useState } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Zap } from 'lucide-react';
import { MotionSpinner } from '../../../../shared/ui/MotionPrimitives';

interface RecalculateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  totalCount: number;
  isRecalculating: boolean;
  onConfirm: (scope: 'selected' | 'all') => Promise<void>;
}

export function RecalculateModal({
  isOpen,
  onClose,
  selectedCount,
  totalCount,
  isRecalculating,
  onConfirm,
}: RecalculateModalProps) {
  const [scope, setScope] = useState<'selected' | 'all'>(selectedCount > 0 ? 'selected' : 'all');

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isRecalculating && onClose()}
      title="Перерасчет каталога"
      subtitle="Обновление цен и себестоимости"
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-2 w-full font-mono text-xs">
          <CockpitButton
            type="button"
            disabled={isRecalculating || (scope === 'selected' && selectedCount === 0)}
            onClick={() => onConfirm(scope)}
            className="flex items-center gap-1.5"
          >
            <MotionSpinner active={isRecalculating} className="inline-flex shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </MotionSpinner>
            <span>
              {isRecalculating
                ? 'Пересчитываем...'
                : scope === 'selected' && selectedCount > 0
                ? `Пересчитать (${selectedCount})`
                : `Пересчитать все (${totalCount})`}
            </span>
          </CockpitButton>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-xs leading-relaxed text-neutral-300">Обновить цены и себестоимость по текущим тарифам и стоимости материалов.</p>
        <div className="space-y-2">
          <span className="text-xs text-neutral-400">Какие товары пересчитать</span>
          <div className="flex flex-wrap gap-2">
            <CockpitButton isActive={scope === 'selected'} aria-pressed={scope === 'selected'} onClick={() => setScope('selected')} disabled={selectedCount === 0}>Выбранные · {selectedCount}</CockpitButton>
            <CockpitButton isActive={scope === 'all'} aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Весь каталог · {totalCount}</CockpitButton>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-neutral-500">Суммы в уже созданных заказах не изменятся.</p>
      </div>
    </Modal>
  );
}
