import React, { useState } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { RefreshCw, CheckSquare, Package, Zap } from 'lucide-react';

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
      title="§ 3D-LABS // RECALCULATE_CATALOG"
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-2 w-full font-mono text-xs">
          <CockpitButton
            type="button"
            disabled={isRecalculating}
            onClick={onClose}
          >
            Отмена
          </CockpitButton>
          <CockpitButton
            type="button"
            disabled={isRecalculating || (scope === 'selected' && selectedCount === 0)}
            onClick={() => onConfirm(scope)}
            isActive={true}
            className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold flex items-center gap-1.5"
          >
            <Zap className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
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
      <div className="space-y-3 pt-1 font-mono text-xs">
        <div className="p-3 bg-neutral-900 border border-white/10 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white/5 text-cyan-400 shrink-0">
            <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
          </div>
          <div className="space-y-1 text-xs text-neutral-300 font-sans">
            <h4 className="text-white font-bold font-mono text-xs">Актуализация цен каталога</h4>
            <p className="leading-relaxed text-[11px] text-neutral-400">
              Пересчет обновит себестоимость сырья, электричество, амортизацию и наценку по актуальным настройкам.
              Исторические данные о проданных товарах в Заказах сохранятся.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Какие позиции обновить:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setScope('selected')}
              disabled={selectedCount === 0}
              className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                scope === 'selected'
                  ? 'bg-white/10 border-white/25 text-white font-bold shadow-sm'
                  : selectedCount === 0
                  ? 'bg-neutral-950 border-white/5 text-neutral-600 opacity-50 cursor-not-allowed'
                  : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              <div>
                <div className="font-bold flex items-center gap-1.5 font-mono text-xs">
                  <CheckSquare size={14} className={scope === 'selected' ? 'text-cyan-400' : 'text-neutral-500'} />
                  Только выбранные
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                  {selectedCount > 0 ? `${selectedCount} поз.` : '0 поз. выбрано'}
                </div>
              </div>
              {scope === 'selected' && <span className="text-cyan-400 font-bold text-sm">✓</span>}
            </button>

            <button
              type="button"
              onClick={() => setScope('all')}
              className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-white/10 border-white/25 text-white font-bold shadow-sm'
                  : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              <div>
                <div className="font-bold flex items-center gap-1.5 font-mono text-xs">
                  <Package size={14} className={scope === 'all' ? 'text-cyan-400' : 'text-neutral-500'} />
                  Все товары каталога
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                  {totalCount} позиций
                </div>
              </div>
              {scope === 'all' && <span className="text-cyan-400 font-bold text-sm">✓</span>}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
