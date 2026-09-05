import React, { useState } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Очистка каталога"
      subtitle="Удаление всех моделей"
      maxWidth="md"
      variant="error"
      footer={
        <div className="flex justify-end gap-2 w-full font-mono text-xs">
          <CockpitButton type="button" onClick={onClose} disabled={isDeleting}>
            Закрыть
          </CockpitButton>
          <CockpitButton
            type="button"
            disabled={isDeleting}
            onClick={handleConfirm}
            className="bg-rose-950/60 text-rose-300 border-rose-800/40 hover:bg-rose-900/80 hover:text-white font-bold"
          >
            {isDeleting ? 'Очистка...' : 'Очистить каталог'}
          </CockpitButton>
        </div>
      }
    >
      <div className="space-y-3 pt-1 text-xs text-neutral-300 font-mono">
        <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl flex items-start gap-2.5 text-rose-300 font-sans">
          <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Внимание! Будут удалены <strong>все товары, сборки и коллекции</strong> из каталога.
          </p>
        </div>
      </div>
    </Modal>
  );
}
