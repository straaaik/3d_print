import React, { useState } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Button } from '../../../../shared/ui/Button';

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

  return (
    <Modal isOpen={Boolean(item)} onClose={onClose} title="Подтверждение удаления" maxWidth="sm">
      <div className="space-y-4 pt-1 text-xs text-gray-300">
        <p>
          Вы действительно хотите удалить {item.type === 'assembly' ? 'сборку' : 'товар'}{' '}
          <strong className="text-white font-semibold">«{item.name}»</strong>?
        </p>
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
            {isDeleting ? 'Удаление...' : 'Да, удалить'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
