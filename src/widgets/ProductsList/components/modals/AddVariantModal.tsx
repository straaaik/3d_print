import React, { useState } from 'react';
import { ProductCollection, SavedCalculation, Filament, Printer } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { ModalDropdown } from '../../../../shared/ui/ModalDropdown';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Input } from '../../../../shared/ui/Input';

interface AddVariantModalProps {
  collection: ProductCollection | null;
  onClose: () => void;
  savedCalculations: SavedCalculation[];
  filaments: Filament[];
  printers: Printer[];
  onConfirm: (data: {
    name: string;
    filamentId: string;
    weightG: number;
    sourceCalculation?: SavedCalculation;
  }) => Promise<void>;
  onNavigateToCalculator: () => void;
}

export function AddVariantModal({
  collection,
  ...props
}: AddVariantModalProps) {
  if (!collection) return null;

  return <AddVariantModalForm key={collection.id} collection={collection} {...props} />;
}

function AddVariantModalForm({
  collection,
  onClose,
  savedCalculations,
  filaments,
  onConfirm,
  onNavigateToCalculator,
}: AddVariantModalProps & { collection: ProductCollection }) {
  const childsInCol = savedCalculations.filter((c) => c.collection_id === collection.id);
  const initialSource = childsInCol[0];
  const [variantName, setVariantName] = useState(() =>
    initialSource ? `${initialSource.name} (копия)` : `${collection.name} (Вариант 1)`
  );
  const [filamentId, setFilamentId] = useState(
    () => initialSource?.filament_id || filaments[0]?.id || ''
  );
  const [weight, setWeight] = useState(() => initialSource?.weight_g?.toString() || '50');
  const [sourceId, setSourceId] = useState(() => initialSource?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantName.trim()) return;

    setIsSubmitting(true);
    try {
      const sourceCalc = savedCalculations.find((c) => c.id === sourceId);
      await onConfirm({
        name: variantName.trim(),
        filamentId,
        weightG: parseFloat(weight) || 50,
        sourceCalculation: sourceCalc,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(collection)}
      onClose={onClose}
      title="Новый вариант"
      subtitle={collection.name}
      maxWidth="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <CockpitButton onClick={onNavigateToCalculator}>В калькулятор</CockpitButton>
          <CockpitButton type="submit" form="add-variant-form" disabled={isSubmitting || !variantName.trim()}>
            {isSubmitting ? 'Создание...' : 'Добавить вариант'}
          </CockpitButton>
        </div>
      }
    >
      <form id="add-variant-form" onSubmit={handleSubmit} className="space-y-5">
        {childsInCol.length > 0 && (
          <ModalDropdown
            label="На основе"
            ariaLabel="На основе"
            options={childsInCol.map((c) => ({ value: c.id, label: c.name }))}
            value={sourceId}
            onChange={(val) => {
              setSourceId(val);
              const src = savedCalculations.find((c) => c.id === val);
              if (src) {
                setVariantName(src.name + ' (копия)');
                setFilamentId(src.filament_id || filaments[0]?.id || '');
                setWeight(src.weight_g?.toString() || '50');
              }
            }}
            usePortal
          />
        )}
        <Input label="Название" aria-label="Название варианта" placeholder="Например, корпус — размер L" value={variantName} onChange={(e) => setVariantName(e.target.value)} required autoFocus />
        <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
          <ModalDropdown
            label="Материал"
            ariaLabel="Материал варианта"
            options={filaments.map((f) => ({ value: f.id, label: f.name, color: f.color }))}
            value={filamentId}
            onChange={setFilamentId}
            usePortal
          />
          <Input label="Вес, г" aria-label="Вес варианта, г" type="number" min="1" value={weight} onChange={(e) => setWeight(e.target.value)} required />
        </div>
        <p className="text-[11px] leading-relaxed text-neutral-500">Параметры печати будут скопированы из исходного варианта. Для нового расчёта откройте калькулятор.</p>
      </form>
    </Modal>
  );
}
