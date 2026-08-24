import React, { useState } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Button } from '../../../../shared/ui/Button';
import { AlertTriangle } from 'lucide-react';

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
    <Modal isOpen={isOpen} onClose={onClose} title="Очистка каталога товаров" maxWidth="md">
      <div className="space-y-4 pt-1 text-xs text-gray-300">
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-300">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Внимание! Будут удалены <strong>все товары, сборки и коллекции</strong>.
            <br />
            (Вы сможете отменить это действие по комбинации <strong>Ctrl+Z</strong>).
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#242930]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isDeleting}
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-500 text-white font-bold border-none"
          >
            {isDeleting ? 'Очистка...' : 'Очистить каталог'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
