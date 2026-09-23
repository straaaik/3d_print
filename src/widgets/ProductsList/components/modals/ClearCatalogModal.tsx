import React, { useState } from 'react';
import { CockpitDeleteModal } from '../../../../shared/ui/CockpitDeleteModal';

interface ClearCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ClearCatalogModal({ isOpen, onClose, onConfirm }: ClearCatalogModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <CockpitDeleteModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      isDeleting={isDeleting}
      title="Полная очистка каталога"
      itemName="Все товары, сборки и коллекции"
      itemDetails="База каталога Kumo CRM"
      description="Внимание! Будут безвозвратно удалены все позиции каталога. Действие необратимо."
    />
  );
}
