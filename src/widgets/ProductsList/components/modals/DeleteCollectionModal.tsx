import React, { useState } from 'react';
import { ProductCollection } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Check, AlertTriangle } from 'lucide-react';

interface DeleteCollectionModalProps {
  collection: ProductCollection | null;
  onClose: () => void;
  onConfirm: (collectionId: string, deleteWithProducts: boolean) => Promise<void>;
}

export function DeleteCollectionModal({
  collection,
  onClose,
  onConfirm,
}: DeleteCollectionModalProps) {
  const [deleteWithProducts, setDeleteWithProducts] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!collection) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(collection.id, deleteWithProducts);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(collection)}
      onClose={onClose}
      title="Удаление коллекции"
      subtitle={collection.name}
      maxWidth="md"
      variant="warning"
      footer={
        <div className="flex justify-end gap-2 w-full font-mono text-xs">
          <CockpitButton type="button" onClick={onClose} disabled={isDeleting}>
            Закрыть
          </CockpitButton>
          <CockpitButton
            type="button"
            disabled={isDeleting}
            onClick={handleConfirm}
            className={
              deleteWithProducts
                ? 'bg-rose-950/60 text-rose-300 border-rose-800/40 hover:bg-rose-900/80 hover:text-white font-bold'
                : 'border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold'
            }
          >
            {isDeleting ? 'Удаление...' : 'Подтвердить'}
          </CockpitButton>
        </div>
      }
    >
      <div className="space-y-3 pt-1 select-none font-mono text-xs">
        <div className="space-y-2 text-xs">
          {/* Вариант 1: Расформировать */}
          <div
            onClick={() => setDeleteWithProducts(false)}
            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              !deleteWithProducts
                ? 'bg-white/10 border-white/25 text-white font-semibold shadow-sm'
                : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
            }`}
          >
            <div>
              <div className="font-bold flex items-center gap-2 text-white">
                <span>Расформировать коллекцию</span>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 rounded font-mono font-bold">
                  Рекомендуется
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-1 font-sans">
                Коллекция удалится, а все товары останутся в каталоге как самостоятельные позиции.
              </div>
            </div>
            {!deleteWithProducts && (
              <div className="w-5 h-5 rounded-full bg-white text-neutral-950 flex items-center justify-center shrink-0 ml-2 shadow-sm font-bold">
                <Check size={13} strokeWidth={3} />
              </div>
            )}
          </div>

          {/* Вариант 2: Удалить вместе с товарами */}
          <div
            onClick={() => setDeleteWithProducts(true)}
            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              deleteWithProducts
                ? 'bg-rose-950/40 border-rose-800/60 text-white font-semibold shadow-sm'
                : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
            }`}
          >
            <div>
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-400" />
                <span>Удалить коллекцию и все вложенные товары</span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-1 font-sans">
                Все варианты товаров внутри коллекции будут безвозвратно удалены из базы.
              </div>
            </div>
            {deleteWithProducts && (
              <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white shrink-0 ml-2 shadow-sm">
                <Check size={13} strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
