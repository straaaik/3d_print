'use client';

import React, { useState } from 'react';
import { useData } from '../../entities/model/DataProvider';
import { Filament } from '../../shared/types';
import { Input } from '../../shared/ui/Input';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { Modal } from '../../shared/ui/Modal';
import { Table } from '../../shared/ui/Table';
import { ColorPicker } from '../../shared/ui/ColorPicker';
import { Tooltip } from '../../shared/ui/Tooltip';
import { formatCurrency } from '../../shared/lib/format';
import { Edit2, Trash2, Plus, Sparkles, Layers, Database } from 'lucide-react';
import { usePersistentState } from '../../shared/lib/usePersistentState';

export function FilamentList() {
  const { filaments, settings, addFilament, updateFilament, deleteFilament } = useData();

  // Состояния для модального окна формы
  const [isOpen, setIsOpen] = useState(false);
  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Состояния полей формы
  const [name, setName] = usePersistentState('3d_filament_draft_name', '');
  const [weightG, setWeightG] = usePersistentState('3d_filament_draft_weight', '1000');
  const [price, setPrice] = usePersistentState('3d_filament_draft_price', '');
  const [color, setColor] = usePersistentState('3d_filament_draft_color', '#0CB4E0');

  // Ошибки формы
  const [errors, setErrors] = useState<{ name?: string; weightG?: string; price?: string }>({});

  const currencySymbol = settings?.currency ?? '₽';

  const handleOpenAdd = () => {
    setEditingFilament(null);
    setName('');
    setWeightG('1000');
    setPrice('');
    setColor('#0CB4E0');
    setErrors({});
    setIsOpen(true);
  };

  const handleOpenEdit = (filament: Filament) => {
    setEditingFilament(filament);
    setName(filament.name);
    setWeightG(filament.weight_g.toString());
    setPrice(filament.price.toString());
    setColor(filament.color || '#FEB63D');
    setErrors({});
    setIsOpen(true);
  };

  const validate = () => {
    const tempErrors: typeof errors = {};
    if (!name.trim()) tempErrors.name = 'Название филамента обязательно';
    
    const parsedWeight = parseFloat(weightG);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      tempErrors.weightG = 'Вес должен быть положительным числом';
    }
    
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      tempErrors.price = 'Цена должна быть положительным числом или 0';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      name: name.trim(),
      weight_g: parseFloat(weightG),
      price: parseFloat(price),
      color: color,
    };

    try {
      if (editingFilament) {
        await updateFilament({ ...data, id: editingFilament.id });
      } else {
        await addFilament(data);
      }
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteFilament(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      key: 'color',
      header: 'Цвет',
      className: 'w-10',
      render: (item: Filament) => (
        <Tooltip content={`Цвет: ${item.color || '#fff'}`}>
          <div
            className="w-4 h-4 rounded-full border border-white/20 shadow-sm cursor-help"
            style={{ backgroundColor: item.color || '#fff' }}
          />
        </Tooltip>
      ),
    },
    {
      key: 'name',
      header: 'Название',
      sortable: true,
      className: 'pl-2',
      render: (item: Filament) => <span className="font-semibold text-white font-sans">{item.name}</span>,
    },
    {
      key: 'weight_g',
      header: 'Вес катушки',
      align: 'right' as const,
      sortable: true,
      render: (item: Filament) => <span className="font-mono">{item.weight_g} г</span>,
    },
    {
      key: 'price',
      header: 'Цена катушки',
      align: 'right' as const,
      sortable: true,
      render: (item: Filament) => (
        <span className="font-mono">{formatCurrency(item.price, currencySymbol)}</span>
      ),
    },
    {
      key: 'price_per_gram',
      header: 'Цена за грамм',
      align: 'right' as const,
      sortable: true,
      sortValue: (item: Filament) => item.weight_g > 0 ? item.price / item.weight_g : 0,
      render: (item: Filament) => {
        const pricePerGram = item.weight_g > 0 ? item.price / item.weight_g : 0;
        return (
          <span className="font-mono text-cyan-400 font-semibold">
            {pricePerGram.toFixed(2)} {currencySymbol}/г
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Действия',
      align: 'center' as const,
      className: 'w-24',
      render: (item: Filament) => (
        <div className="flex items-center justify-center gap-1.5">
          <Tooltip content="Редактировать">
            <button
              onClick={() => handleOpenEdit(item)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
            >
              <Edit2 size={13} />
            </button>
          </Tooltip>
          <Tooltip content="Удалить">
            <button
              onClick={() => handleDelete(item.id, item.name)}
              className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/40 transition-colors focus:outline-none cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden font-mono text-xs">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3 bg-neutral-900/60 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-400/40 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 border border-yellow-400/40 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40 inline-block" />
          </div>

          <div className="flex items-center gap-2 pl-3 border-l border-white/10">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-white font-mono font-bold text-xs sm:text-sm tracking-wider">
              § 3D-LABS // КАТАЛОГ ФИЛАМЕНТОВ
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <CockpitButton
            onClick={handleOpenAdd}
            icon={Plus}
            isActive={true}
            className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
          >
            Добавить филамент
          </CockpitButton>
        </div>
      </div>

      {/* Список филаментов */}
      <div className="p-4 sm:p-6">
        {filaments.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3 select-none">
            <div className="w-10 h-10 bg-cyan-950/60 border border-cyan-800/40 rounded-xl flex items-center justify-center text-cyan-400">
              <Sparkles size={20} />
            </div>
            <div className="max-w-sm">
              <h3 className="text-white font-bold text-sm mb-1 font-mono">Список филаментов пуст</h3>
              <p className="text-neutral-400 text-xs font-sans">
                Добавьте первый филамент (например, Bambu Lab PLA Matte), чтобы калькулятор мог рассчитать стоимость материалов.
              </p>
            </div>
            <CockpitButton onClick={handleOpenAdd} icon={Plus} className="mt-2">
              Добавить первый пластик
            </CockpitButton>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filaments}
            keyExtractor={(item) => item.id}
            isSearchable={true}
            infiniteScroll={true}
            batchSize={25}
            storageKey="filaments"
          />
        )}
      </div>

      {/* Модальное окно создания/редактирования */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingFilament ? '§ 3D-LABS // EDIT_FILAMENT' : '§ 3D-LABS // NEW_FILAMENT'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-mono text-xs">
          {/* Название */}
          <Input
            label="Название филамента"
            placeholder="напр. Bambu Lab PLA Matte Black"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            autoFocus
          />

          {/* Вес и Цена */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <NumberCounter
                label="Вес катушки, г"
                value={parseInt(weightG) || 0}
                onChange={(val) => setWeightG(val.toString())}
                min={1}
              />
              {errors.weightG && <p className="text-rose-400 text-xs select-none">{errors.weightG}</p>}
            </div>
            <Input
              label={`Цена катушки, ${currencySymbol}`}
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              error={errors.price}
            />
          </div>

          {/* Цвет */}
          <ColorPicker
            label="Цвет филамента"
            value={color}
            onChange={setColor}
          />

          {/* Кнопки формы */}
          <div className="flex gap-2 justify-end mt-3 pt-3 border-t border-white/10">
            <CockpitButton type="button" onClick={() => setIsOpen(false)}>
              Отмена
            </CockpitButton>
            <CockpitButton
              type="submit"
              isActive={true}
              className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
            >
              {editingFilament ? 'Сохранить изменения' : 'Добавить филамент'}
            </CockpitButton>
          </div>
        </form>
      </Modal>

      {/* Модальное окно подтверждения удаления */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="§ 3D-LABS // DELETE_FILAMENT"
        variant="warning"
        maxWidth="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <CockpitButton onClick={() => setDeleteTarget(null)}>Отмена</CockpitButton>
            <CockpitButton
              onClick={confirmDelete}
              className="bg-rose-950/60 text-rose-300 border-rose-800/40 hover:bg-rose-900/80 hover:text-white font-bold"
            >
              Удалить
            </CockpitButton>
          </div>
        }
      >
        <p className="text-xs text-neutral-300 font-sans">
          Вы уверены, что хотите удалить филамент <strong className="text-white font-mono">«{deleteTarget?.name}»</strong>? Это действие нельзя отменить.
        </p>
      </Modal>
    </div>
  );
}
