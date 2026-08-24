import React, { useState, useEffect } from 'react';
import { SavedCalculation, ProductCollection } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Button } from '../../../../shared/ui/Button';
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
  selectedIds,
  isBatchMoveOpen,
  collections,
  savedCalculations,
  onClose,
  onSaveSingle,
  onSaveBatch,
}: MoveProductModalProps) {
  const isOpen = Boolean(movingProduct) || isBatchMoveOpen;
  const [targetCollectionId, setTargetCollectionId] = useState<string>('none');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (movingProduct) {
      setTargetCollectionId(movingProduct.collection_id || 'none');
    } else if (isBatchMoveOpen) {
      setTargetCollectionId('none');
    }
  }, [movingProduct, isBatchMoveOpen]);

  if (!isOpen) return null;

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
      title={
        movingProduct
          ? `Коллекция для «${movingProduct.name}»`
          : `Перемещение выбранных товаров (${selectedIds.length} шт)`
      }
      maxWidth="md"
    >
      <div className="space-y-4 pt-1">
        <label className="block text-xs font-semibold text-gray-300">
          Выберите целевую коллекцию:
        </label>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          {/* Вариант: Без коллекции */}
          <div
            onClick={() => setTargetCollectionId('none')}
            className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
              targetCollectionId === 'none'
                ? 'bg-amber-500/20 border-amber-500 text-white font-semibold'
                : 'bg-[#141720] border-[#242930] text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Package size={16} className={targetCollectionId === 'none' ? 'text-amber-400' : 'text-gray-500'} />
              <div>
                <span className="font-bold block">Без коллекции (Общий каталог)</span>
                <span className="text-[11px] text-gray-400">Сделать самостоятельной позицией</span>
              </div>
            </div>
            {targetCollectionId === 'none' && <Check size={16} className="text-amber-400" />}
          </div>

          {/* Список существующих коллекций */}
          {collections.map((col) => {
            const isSelected = targetCollectionId === col.id;
            const childCount = savedCalculations.filter((c) => c.collection_id === col.id).length;
            return (
              <div
                key={col.id}
                onClick={() => setTargetCollectionId(col.id)}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500 text-white font-semibold'
                    : 'bg-[#141720] border-[#242930] text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers size={16} className={isSelected ? 'text-amber-400' : 'text-gray-500'} />
                  <div>
                    <span className="font-bold block">{col.name}</span>
                    <span className="text-[11px] text-gray-400">
                      {col.category || 'Разное'} • {childCount} вариантов
                    </span>
                  </div>
                </div>
                {isSelected && <Check size={16} className="text-amber-400" />}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#242930]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={handleSave}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold border-none"
          >
            {isSaving ? 'Сохранение...' : 'Применить'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
