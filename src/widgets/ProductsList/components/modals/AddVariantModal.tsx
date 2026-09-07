import React, { useState } from 'react';
import { ProductCollection, SavedCalculation, Filament, Printer } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Select } from '../../../../shared/ui/Select';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import {  Layers, Copy, Sparkles } from 'lucide-react';

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
      title="Добавление модификации"
      subtitle={collection.name}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between gap-3 select-none w-full font-mono text-xs">
          <button
            type="button"
            onClick={onNavigateToCalculator}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer font-mono font-semibold"
          >
            <Sparkles size={13} />
            <span>[ Рассчитать в калькуляторе ]</span>
          </button>

          <div className="flex items-center gap-2">
            <CockpitButton type="button" onClick={onClose} disabled={isSubmitting}>
              Закрыть
            </CockpitButton>
            <CockpitButton
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !variantName.trim()}
              isActive={true}
              className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
            >
              {isSubmitting ? 'Создание...' : 'Добавить вариант'}
            </CockpitButton>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 pt-1 select-none font-mono text-xs">
        {/* Базовый вариант (источник) */}
        {childsInCol.length > 0 && (
          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Copy size={13} className="text-cyan-400" />
              Взять за основу существующий вариант
            </label>
            <Select
              options={childsInCol.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.filament_name || 'Пластик'}, ${c.weight_g}г)`,
              }))}
              value={sourceId}
              onChange={(val: string) => {
                setSourceId(val);
                const src = savedCalculations.find((c) => c.id === val);
                if (src) {
                  setVariantName(`${src.name} (копия)`);
                  setFilamentId(src.filament_id || filaments[0]?.id || '');
                  setWeight(src.weight_g?.toString() || '50');
                }
              }}
            />
          </div>
        )}

        {/* Название варианта */}
        <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
            Название нового варианта *
          </label>
          <input
            type="text"
            placeholder="например: Дракон 200% Красный Silk или Размер L (PETG)"
            value={variantName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariantName(e.target.value)}
            required
            autoFocus
            className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors font-mono"
          />
        </div>

        {/* Материал и Вес */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers size={13} className="text-cyan-400" />
              Материал / Филамент
            </label>
            <Select
              options={filaments.map((f) => ({
                value: f.id,
                label: `${f.name} (${f.color || ''})`,
                color: f.color,
              }))}
              value={filamentId}
              onChange={(val: string) => setFilamentId(val)}
            />
          </div>

          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Масса детали (грамм)
            </label>
            <input
              type="number"
              min="1"
              placeholder="Масса в граммах"
              value={weight}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)}
              className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
