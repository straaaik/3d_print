import React, { useState } from 'react';
import { SavedCalculation, Filament, Printer } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Select, SelectOption } from '../../../../shared/ui/Select';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { round2 } from '../../helpers';

interface QuickEditProductModalProps {
  item: SavedCalculation | null;
  filaments: Filament[];
  printers: Printer[];
  categoryOptions: SelectOption[];
  onClose: () => void;
  onSave: (updatedItem: SavedCalculation) => Promise<void>;
}

export function QuickEditProductModal({
  item,
  ...props
}: QuickEditProductModalProps) {
  if (!item) return null;

  return <QuickEditProductModalForm key={item.id} item={item} {...props} />;
}

function QuickEditProductModalForm({
  item,
  filaments,
  printers,
  categoryOptions,
  onClose,
  onSave,
}: QuickEditProductModalProps & { item: SavedCalculation }) {
  const [name, setName] = useState(() => item.name || '');
  const [category, setCategory] = useState(() => item.category || 'Разное');
  const [tagsInput, setTagsInput] = useState(() => item.tags?.join(', ') || '');
  const [filamentId, setFilamentId] = useState(
    () => item.filament_id || filaments.find((f) => f.name === item.filament_name)?.id || ''
  );
  const [printerId, setPrinterId] = useState(
    () => item.printer_id || printers.find((p) => p.name === item.printer_name)?.id || ''
  );
  const [weight, setWeight] = useState(() => (item.weight_g || 0).toString());
  const [hours, setHours] = useState(() => (item.hours || 0).toString());
  const [minutes, setMinutes] = useState(() => (item.minutes || 0).toString());
  const [stock, setStock] = useState(() => (item.stock_quantity || 0).toString());
  const [baseCost, setBaseCost] = useState(() => (item.base_cost || 0).toString());
  const [finalPrice, setFinalPrice] = useState(() => (item.final_price || 0).toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const chosenFilament = filaments.find((f) => f.id === filamentId);
      const chosenPrinter = printers.find((p) => p.id === printerId);

      const parsedTags = tagsInput
        .split(',')
        .map((t: string) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const updated: SavedCalculation = {
        ...item,
        name: name.trim(),
        category,
        tags: parsedTags,
        filament_id: chosenFilament?.id || item.filament_id,
        filament_name: chosenFilament?.name || item.filament_name,
        filament_color: chosenFilament?.color || item.filament_color,
        printer_id: chosenPrinter?.id || item.printer_id,
        printer_name: chosenPrinter?.name || item.printer_name,
        weight_g: parseFloat(weight) || 0,
        hours: parseInt(hours, 10) || 0,
        minutes: parseInt(minutes, 10) || 0,
        stock_quantity: Math.max(0, parseInt(stock, 10) || 0),
        base_cost: round2(parseFloat(baseCost) || 0),
        final_price: round2(parseFloat(finalPrice) || 0),
      };

      await onSave(updated);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(item)}
      onClose={onClose}
      title="Быстрое редактирование"
      subtitle={item.name}
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-2 w-full font-mono text-xs">
          <CockpitButton type="button" onClick={onClose} disabled={isSaving}>
            Закрыть
          </CockpitButton>
          <CockpitButton
            type="submit"
            disabled={isSaving || !name.trim()}
            onClick={handleSubmit}
            isActive={true}
            className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </CockpitButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 pt-1 font-mono text-xs">
        <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
            Наименование товара *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
            autoFocus
            className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors font-mono"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Категория</label>
            <Select
              options={categoryOptions.filter((o) => o.value !== '__new__')}
              value={category}
              onChange={(val: string) => setCategory(val)}
            />
          </div>

          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Теги (через запятую)</label>
            <input
              type="text"
              placeholder="напр. дракон, игрушка"
              value={tagsInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagsInput(e.target.value)}
              className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Материал (Пластик)</label>
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
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Принтер</label>
            <Select
              options={printers.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
              value={printerId}
              onChange={(val: string) => setPrinterId(val)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Вес (г)</label>
            <input
              type="number"
              step="any"
              value={weight}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)}
              className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
            />
          </div>
          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Часы</label>
            <input
              type="number"
              min="0"
              value={hours}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHours(e.target.value)}
              className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
            />
          </div>
          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Минуты</label>
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinutes(e.target.value)}
              className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Склад (шт)</label>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStock(e.target.value)}
              className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
            />
          </div>
          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Себестоимость</label>
            <input
              type="number"
              step="any"
              value={baseCost}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseCost(e.target.value)}
              className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
            />
          </div>
          <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Цена продажи</label>
            <input
              type="number"
              step="any"
              value={finalPrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinalPrice(e.target.value)}
              className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-cyan-400 font-bold font-mono focus:outline-none"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
