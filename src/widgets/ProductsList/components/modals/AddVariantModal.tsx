import React, { useState, useEffect } from 'react';
import { ProductCollection, SavedCalculation, Filament, Printer } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Select } from '../../../../shared/ui/Select';
import { Button } from '../../../../shared/ui/Button';
import { FolderPlus, Layers, Copy, Plus, Sparkles } from 'lucide-react';

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
  onClose,
  savedCalculations,
  filaments,
  printers,
  onConfirm,
  onNavigateToCalculator,
}: AddVariantModalProps) {
  const [variantName, setVariantName] = useState('');
  const [filamentId, setFilamentId] = useState('');
  const [weight, setWeight] = useState('50');
  const [sourceId, setSourceId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (collection) {
      const childs = savedCalculations.filter((c) => c.collection_id === collection.id);
      if (childs.length > 0) {
        const src = childs[0];
        setSourceId(src.id);
        setVariantName(`${src.name} (копия)`);
        setFilamentId(src.filament_id || filaments[0]?.id || '');
        setWeight(src.weight_g?.toString() || '50');
      } else {
        setSourceId('');
        setVariantName(`${collection.name} (Вариант 1)`);
        setFilamentId(filaments[0]?.id || '');
        setWeight('50');
      }
    }
  }, [collection, savedCalculations, filaments]);

  if (!collection) return null;

  const childsInCol = savedCalculations.filter((c) => c.collection_id === collection.id);

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
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300">
            <Plus size={18} />
          </div>
          <div>
            <span className="text-white font-bold">
              Добавить вариант в коллекцию «{collection.name}»
            </span>
            <div className="text-[11px] text-gray-400 font-normal">
              Создание новой модификации по размеру, цвету или типу материала
            </div>
          </div>
        </div>
      }
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between gap-3 select-none w-full">
          <button
            type="button"
            onClick={onNavigateToCalculator}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1.5 underline cursor-pointer font-semibold"
          >
            <Sparkles size={13} />
            <span>Рассчитать детально в калькуляторе</span>
          </button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="border-[#242930] text-gray-300">
              Отмена
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || !variantName.trim()}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-extrabold px-4 py-2 rounded-xl shadow-md shadow-purple-500/25 cursor-pointer"
            >
              {isSubmitting ? 'Создание...' : 'Добавить вариант'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 select-none">
        {/* Базовый вариант (источник) */}
        {childsInCol.length > 0 && (
          <div className="bg-[#13111f] p-3 rounded-2xl border border-purple-500/30">
            <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Copy size={13} />
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
        <div className="bg-[#161224] p-3 rounded-2xl border border-[#242930]">
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
            Название нового варианта *
          </label>
          <input
            type="text"
            placeholder="например: Дракон 200% Красный Silk или Размер L (PETG)"
            value={variantName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVariantName(e.target.value)}
            required
            autoFocus
            className="w-full bg-[#0d0a17] border border-[#242930] hover:border-purple-500/50 focus:border-purple-400 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-colors font-medium"
          />
        </div>

        {/* Материал и Вес */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[#12141c] p-3 rounded-2xl border border-[#242930]">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers size={14} className="text-purple-400" />
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

          <div className="bg-[#12141c] p-3 rounded-2xl border border-[#242930]">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Масса детали (грамм)
            </label>
            <input
              type="number"
              min="1"
              placeholder="Масса в граммах"
              value={weight}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)}
              className="w-full bg-[#0d0e14] border border-[#242930] hover:border-purple-500/40 focus:border-purple-400 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white font-mono placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
