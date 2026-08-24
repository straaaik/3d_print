import React, { useState } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Button } from '../../../../shared/ui/Button';
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
      title="Пересчет себестоимости и цен товаров"
    >
      <div className="space-y-4 pt-1">
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
            <RefreshCw className={`w-5 h-5 ${isRecalculating ? 'animate-spin' : ''}`} />
          </div>
          <div className="space-y-1 text-xs text-gray-300">
            <h4 className="text-white font-bold text-sm">Актуализация цен каталога</h4>
            <p className="leading-relaxed">
              Пересчет обновит себестоимость сырья, электричество, амортизацию и наценку по актуальным настройкам.
              <br />
              <strong className="text-amber-300 font-medium">
                Исторические данные о ранее проданных товарах в Заказах останутся неизменными.
              </strong>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
            Какие позиции обновить:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setScope('selected')}
              disabled={selectedCount === 0}
              className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                scope === 'selected'
                  ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm'
                  : selectedCount === 0
                  ? 'bg-[#12141a] border-[#242930] text-gray-600 opacity-50 cursor-not-allowed'
                  : 'bg-[#12141a] border-[#242930] text-gray-400 hover:text-white hover:bg-[#16181f]'
              }`}
            >
              <div>
                <div className="font-bold flex items-center gap-1.5">
                  <CheckSquare size={14} className={scope === 'selected' ? 'text-amber-400' : 'text-gray-500'} />
                  Только выбранные
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                  {selectedCount > 0 ? `${selectedCount} поз. с галочками` : '0 позиций выбрано'}
                </div>
              </div>
              {scope === 'selected' && <span className="text-amber-400 font-bold text-sm">✓</span>}
            </button>

            <button
              type="button"
              onClick={() => setScope('all')}
              className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm'
                  : 'bg-[#12141a] border-[#242930] text-gray-400 hover:text-white hover:bg-[#16181f]'
              }`}
            >
              <div>
                <div className="font-bold flex items-center gap-1.5">
                  <Package size={14} className={scope === 'all' ? 'text-amber-400' : 'text-gray-500'} />
                  Все товары каталога
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                  {totalCount} позиций и сборок
                </div>
              </div>
              {scope === 'all' && <span className="text-amber-400 font-bold text-sm">✓</span>}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#242930]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRecalculating}
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isRecalculating || (scope === 'selected' && selectedCount === 0)}
            onClick={() => onConfirm(scope)}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold border-none flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Zap className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span>
              {isRecalculating
                ? 'Пересчитываем...'
                : scope === 'selected' && selectedCount > 0
                ? `Пересчитать выбранные (${selectedCount})`
                : `Пересчитать все (${totalCount})`}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
