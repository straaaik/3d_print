import React, { useState } from 'react';
import { SavedCalculation, ProductCollection } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { ModalDropdown } from '../../../../shared/ui/ModalDropdown';

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
  isBatchMoveOpen,
  ...props
}: MoveProductModalProps) {
  if (!movingProduct && !isBatchMoveOpen) return null;

  const sessionKey = movingProduct?.id ?? 'batch';
  return (
    <MoveProductModalForm
      key={sessionKey}
      movingProduct={movingProduct}
      isBatchMoveOpen={isBatchMoveOpen}
      {...props}
    />
  );
}

function MoveProductModalForm({
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
  const [targetCollectionId, setTargetCollectionId] = useState<string>(
    () => movingProduct?.collection_id || 'none'
  );
  const [isSaving, setIsSaving] = useState(false);

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
      title="Перемещение в коллекцию"
      subtitle={movingProduct ? movingProduct.name : `${selectedIds.length} поз.`}
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-2 w-full font-mono text-xs">
          <CockpitButton
            type="button"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Сохранение...' : 'Применить'}
          </CockpitButton>
        </div>
      }
    >
      <div className="space-y-4">
        <ModalDropdown
          label="Куда переместить"
          ariaLabel="Куда переместить товар"
          value={targetCollectionId}
          onChange={setTargetCollectionId}
          options={[
            { value: 'none', label: 'Без коллекции', subtext: 'Оставить в общем каталоге' },
            ...collections.map((col) => ({ value: col.id, label: col.name, subtext: 'Товаров: ' + savedCalculations.filter((c) => c.collection_id === col.id).length })),
          ]}
          searchable
          usePortal
        />
        <p className="text-[11px] leading-relaxed text-neutral-500">Товар сохранит цену, настройки печати и файлы.</p>
      </div>
    </Modal>
  );
}
