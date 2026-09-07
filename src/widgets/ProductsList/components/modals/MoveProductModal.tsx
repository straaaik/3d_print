import React, { useState } from 'react';
import { SavedCalculation, ProductCollection } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Package, Layers, Check } from 'lucide-react';

interface MoveProductModalProps {
  movingProduct: SavedCalculation | null;
  selectedIds: string[];
  isBatchMoveOpen: boolean;
  collections: ProductCollection[];
  savedCalculations: SavedCalculation[];
  onClose: () => void;
  onSaveSingle: (product: SavedCalculation, targetCollectionId: string) => Promise<void>;
  onSaveBatch: (selectedIds: string[], targetCollectionId: string) => Promise<void>;
}

export function MoveProductModal({
  movingProduct,
  isBatchMoveOpen,
  ...props
}: MoveProductModalProps) {
  if (!movingProduct && !isBatchMoveOpen) return null;

  const sessionKey = movingProduct?.id ?? 'batch';
  return (
    <MoveProductModalForm
      key={sessionKey}
      movingProduct={movingProduct}
      isBatchMoveOpen={isBatchMoveOpen}
      {...props}
    />
  );
}

function MoveProductModalForm({
  movingProduct,
  selectedIds,
  isBatchMoveOpen,
  collections,
  savedCalculations,
  onClose,
  onSaveSingle,
  onSaveBatch,
}: MoveProductModalProps) {
  const isOpen = Boolean(movingProduct) || isBatchMoveOpen;
  const [targetCollectionId, setTargetCollectionId] = useState<string>(
    () => movingProduct?.collection_id || 'none'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (movingProduct) {
        await onSaveSingle(movingProduct, targetCollectionId);
      } else if (isBatchMoveOpen && selectedIds.length > 0) {
        await onSaveBatch(selectedIds, targetCollectionId);
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Перемещение в коллекцию"
      subtitle={movingProduct ? movingProduct.name : `${selectedIds.length} поз.`}
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-2 w-full font-mono text-xs">
          <CockpitButton type="button" onClick={onClose} disabled={isSaving}>
            Закрыть
          </CockpitButton>
          <CockpitButton
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            isActive={true}
            className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
          >
            {isSaving ? 'Сохранение...' : 'Применить'}
          </CockpitButton>
        </div>
      }
    >
      <div className="space-y-3 pt-1 font-mono text-xs">
        <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
          Выберите целевую коллекцию:
        </label>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
          {/* Вариант: Без коллекции */}
          <div
            onClick={() => setTargetCollectionId('none')}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
              targetCollectionId === 'none'
                ? 'bg-white/10 border-white/25 text-white font-semibold'
                : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Package size={15} className={targetCollectionId === 'none' ? 'text-cyan-400' : 'text-neutral-500'} />
              <div>
                <span className="font-bold block font-mono">Без коллекции (Общий каталог)</span>
                <span className="text-[10px] text-neutral-500 font-sans">Сделать самостоятельной позицией</span>
              </div>
            </div>
            {targetCollectionId === 'none' && <Check size={14} className="text-cyan-400" />}
          </div>

          {/* Список существующих коллекций */}
          {collections.map((col) => {
            const isSelected = targetCollectionId === col.id;
            const childCount = savedCalculations.filter((c) => c.collection_id === col.id).length;
            return (
              <div
                key={col.id}
                onClick={() => setTargetCollectionId(col.id)}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white/10 border-white/25 text-white font-semibold'
                    : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers size={15} className={isSelected ? 'text-cyan-400' : 'text-neutral-500'} />
                  <div>
                    <span className="font-bold block font-mono">{col.name}</span>
                    <span className="text-[10px] text-neutral-500 font-sans">
                      {col.category || 'Разное'} • {childCount} вариантов
                    </span>
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-cyan-400" />}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
