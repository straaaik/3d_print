'use client';

import React, { useState } from 'react';
import { ProductCollection } from '../../../../shared/types';
import { RoundDeleteModal } from '../../../../shared/ui/RoundDeleteModal';

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
    <RoundDeleteModal
      isOpen={Boolean(collection)}
      onClose={onClose}
      onConfirm={handleConfirm}
      isDeleting={isDeleting}
      title="Удаление коллекции"
      itemName={`«${collection.name}»`}
      itemDetails={deleteWithProducts ? 'Коллекция и вложенные товары' : 'Только коллекция'}
      description={
        deleteWithProducts
          ? 'Коллекция и все входящие в неё товары будут безвозвратно удалены.'
          : 'Коллекция будет удалена. Её товары останутся в общем каталоге.'
      }
    >
      <div className="pt-1 flex flex-col items-center gap-1.5">
        <label className="flex items-center gap-2 cursor-pointer text-[10.5px] text-neutral-300 hover:text-white select-none">
          <input
            type="checkbox"
            checked={deleteWithProducts}
            onChange={(e) => setDeleteWithProducts(e.target.checked)}
            className="rounded border-neutral-700 bg-neutral-900 text-rose-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <span>Удалить с товарами</span>
        </label>
        {deleteWithProducts && (
          <span className="text-[9.5px] text-rose-300 font-mono tracking-tight text-center">
            Товары удалятся безвозвратно
          </span>
        )}
      </div>
    </RoundDeleteModal>
  );
}
