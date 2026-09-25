import React, { useState } from 'react';
import { CockpitDeleteModal } from '../../../../shared/ui/CockpitDeleteModal';

interface DeleteProductModalProps {
  item: { id: string; name: string; type?: string } | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteProductModal({ item, onClose, onConfirm }: DeleteProductModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!item) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(item.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const itemTypeLabel = item.type === 'assembly' ? 'сборку' : 'товар';

  return (
    <CockpitDeleteModal
      isOpen={Boolean(item)}
      onClose={onClose}
      onConfirm={handleConfirm}
      isDeleting={isDeleting}
      title="Удаление из каталога"
      itemName={`«${item.name}»`}
      itemDetails={item.type === 'assembly' ? 'Сборное изделие' : 'Печатная деталь'}
      description={`Вы действительно хотите безвозвратно удалить ${itemTypeLabel} «${item.name}»?`}
    />
  );
}
