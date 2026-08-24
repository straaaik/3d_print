import React, { useState, useEffect } from 'react';
import { SavedCalculation, Filament, Printer } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Input } from '../../../../shared/ui/Input';
import { Select, SelectOption } from '../../../../shared/ui/Select';
import { Button } from '../../../../shared/ui/Button';
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
  filaments,
  printers,
  categoryOptions,
  onClose,
  onSave,
}: QuickEditProductModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Разное');
  const [tagsInput, setTagsInput] = useState('');
  const [filamentId, setFilamentId] = useState('');
  const [printerId, setPrinterId] = useState('');
  const [weight, setWeight] = useState('0');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [stock, setStock] = useState('0');
  const [baseCost, setBaseCost] = useState('0');
  const [finalPrice, setFinalPrice] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setCategory(item.category || 'Разное');
      setTagsInput(item.tags ? item.tags.join(', ') : '');
      setFilamentId(item.filament_id || filaments.find((f) => f.name === item.filament_name)?.id || '');
      setPrinterId(item.printer_id || printers.find((p) => p.name === item.printer_name)?.id || '');
      setWeight((item.weight_g || 0).toString());
      setHours((item.hours || 0).toString());
      setMinutes((item.minutes || 0).toString());
      setStock((item.stock_quantity || 0).toString());
      setBaseCost((item.base_cost || 0).toString());
      setFinalPrice((item.final_price || 0).toString());
    }
  }, [item, filaments, printers]);

  if (!item) return null;

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
      title={`Редактирование товара: «${item.name}»`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <Input
          label="Наименование товара *"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Категория</label>
            <Select
              options={categoryOptions.filter((o) => o.value !== '__new__')}
              value={category}
              onChange={(val: string) => setCategory(val)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Теги (через запятую)</label>
            <Input
              placeholder="напр. дракон, игрушка"
              value={tagsInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagsInput(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#242930]">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Материал (Пластик)</label>
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

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Принтер</label>
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

        <div className="grid grid-cols-3 gap-3 pt-1 border-t border-[#242930]">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Вес (г)</label>
            <Input
              type="number"
              step="any"
              value={weight}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Часы печати</label>
            <Input
              type="number"
              min="0"
              value={hours}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHours(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Минуты</label>
            <Input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinutes(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1 border-t border-[#242930]">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Остаток на складе</label>
            <Input
              type="number"
              min="0"
              value={stock}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStock(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Себестоимость</label>
            <Input
              type="number"
              step="any"
              value={baseCost}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseCost(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Цена продажи</label>
            <Input
              type="number"
              step="any"
              value={finalPrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinalPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#242930]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Отмена
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSaving || !name.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold border-none"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
