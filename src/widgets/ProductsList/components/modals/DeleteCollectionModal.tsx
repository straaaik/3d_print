import React, { useState } from 'react';
import { ProductCollection } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Button } from '../../../../shared/ui/Button';
import { Check, FolderX, AlertTriangle } from 'lucide-react';

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
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300">
            <FolderX size={18} />
          </div>
          <div>
            <span className="text-white font-bold">
              Удаление коллекции «{collection.name}»
            </span>
            <div className="text-[11px] text-gray-400 font-normal">
              Выберите действие с товарами и вариантами внутри коллекции
            </div>
          </div>
        </div>
      }
      maxWidth="md"
    >
      <div className="space-y-4 pt-1 select-none">
        <div className="space-y-2.5 text-xs">
          {/* Вариант 1: Расформировать */}
          <div
            onClick={() => setDeleteWithProducts(false)}
            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
              !deleteWithProducts
                ? 'bg-purple-500/20 border-purple-500/80 text-white font-semibold shadow-md'
                : 'bg-[#12141c] border-[#242930] text-gray-400 hover:text-white hover:bg-[#181a24]'
            }`}
          >
            <div>
              <div className="font-bold flex items-center gap-2 text-purple-200">
                <span>Расформировать коллекцию</span>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
                  Рекомендуется
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Коллекция удалится, а все товары останутся в каталоге как самостоятельные позиции.
              </div>
            </div>
            {!deleteWithProducts && (
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white shrink-0 ml-2 shadow-sm">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
          </div>

          {/* Вариант 2: Удалить вместе с товарами */}
          <div
            onClick={() => setDeleteWithProducts(true)}
            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
              deleteWithProducts
                ? 'bg-red-500/20 border-red-500 text-white font-semibold shadow-md'
                : 'bg-[#12141c] border-[#242930] text-gray-400 hover:text-white hover:bg-[#181a24]'
            }`}
          >
            <div>
              <div className="font-bold text-red-300 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                <span>Удалить коллекцию и все вложенные товары</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Все варианты товаров внутри коллекции будут безвозвратно удалены из базы.
              </div>
            </div>
            {deleteWithProducts && (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white shrink-0 ml-2 shadow-sm">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#242930]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isDeleting} className="border-[#242930] text-gray-300">
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isDeleting}
            onClick={handleConfirm}
            className={
              deleteWithProducts
                ? 'bg-red-600 hover:bg-red-500 text-white font-bold border-none px-4 rounded-xl cursor-pointer'
                : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold border-none px-4 rounded-xl cursor-pointer'
            }
          >
            {isDeleting ? 'Удаление...' : 'Подтвердить'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
