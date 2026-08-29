import React, { useState } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';

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
    <Modal
      isOpen={Boolean(item)}
      onClose={onClose}
      title="§ 3D-LABS // DELETE_PRODUCT"
      variant="error"
      maxWidth="sm"
      footer={
        <div className="flex justify-end gap-2 w-full font-mono text-xs">
          <CockpitButton type="button" onClick={onClose} disabled={isDeleting}>
            Отмена
          </CockpitButton>
          <CockpitButton
            type="button"
            disabled={isDeleting}
            onClick={handleConfirm}
            className="bg-rose-950/60 text-rose-300 border-rose-800/40 hover:bg-rose-900/80 hover:text-white font-bold"
          >
            {isDeleting ? 'Удаление...' : 'Да, удалить'}
          </CockpitButton>
        </div>
      }
    >
      <div className="space-y-3 pt-1 text-xs text-neutral-300 font-mono">
        <p className="font-sans">
          Вы действительно хотите удалить {item.type === 'assembly' ? 'сборку' : 'товар'}{' '}
          <strong className="text-white font-mono">«{item.name}»</strong>?
        </p>
      </div>
    </Modal>
  );
}
