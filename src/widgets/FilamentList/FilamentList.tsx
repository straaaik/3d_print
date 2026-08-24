'use client';

import React, { useState } from 'react';
import { useData } from '../../entities/model/DataProvider';
import { Filament } from '../../shared/types';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { Modal } from '../../shared/ui/Modal';
import { Table } from '../../shared/ui/Table';
import { ColorPicker } from '../../shared/ui/ColorPicker';
import { formatCurrency } from '../../shared/lib/format';
import { Edit2, Trash2, Plus, Sparkles, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../../shared/ui/PageHeader';

export function FilamentList() {
  const { filaments, settings, addFilament, updateFilament, deleteFilament } = useData();

  // Состояния для модального окна формы
  const [isOpen, setIsOpen] = useState(false);
  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Состояния полей формы
  const [name, setName] = useState('');
  const [weightG, setWeightG] = useState('1000');
  const [price, setPrice] = useState('');
  const [color, setColor] = useState('#0CB4E0'); // Голубой по умолчанию

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
        <div
          className="w-5 h-5 rounded-full border border-black/20 shadow-inner"
          style={{ backgroundColor: item.color || '#fff' }}
          title={item.color}
        />
      ),
    },
    {
      key: 'name',
      header: 'Название',
      sortable: true,
      className: 'pl-2',
      render: (item: Filament) => <span className="font-semibold text-white">{item.name}</span>,
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
          <span className="font-mono text-primary font-semibold">
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
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleOpenEdit(item)}
            className="p-1.5 text-neutral-accent hover:text-white rounded hover:bg-[#242930] transition-colors focus:outline-none cursor-pointer"
            title="Редактировать"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => handleDelete(item.id, item.name)}
            className="p-1.5 text-red-500/70 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors focus:outline-none cursor-pointer"
            title="Удалить"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Заголовок и кнопка */}
      <PageHeader
        icon={Layers}
        title="Управление филаментами"
        subtitle="Каталог пластика с указанием стоимости катушек, веса и цвета"
        accentColor="#8b5cf6"
        actions={
          <Button
            onClick={handleOpenAdd}
            variant="primary"
            size="md"
            className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white border-none shadow-lg shadow-violet-500/25 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить филамент</span>
          </Button>
        }
      />

      {/* Список филаментов */}
      <Card>
        {filaments.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-4 select-none">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Sparkles size={24} />
            </div>
            <div className="max-w-sm">
              <h3 className="text-white font-semibold text-base mb-1">Список филаментов пуст</h3>
              <p className="text-neutral-accent text-xs">
                Добавьте ваш первый филамент (например, Bambu Lab PLA Matte), чтобы калькулятор мог рассчитать стоимость материалов.
              </p>
            </div>
            <Button size="sm" onClick={handleOpenAdd} className="flex items-center gap-1 mt-2">
              <Plus size={14} /> Добавить первый пластик
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filaments}
            keyExtractor={(item) => item.id}
            isSearchable={true}
            infiniteScroll={true}
            batchSize={25}
          />
        )}
      </Card>

      {/* Модальное окно создания/редактирования */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingFilament ? 'Редактировать филамент' : 'Добавить новый филамент'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <NumberCounter
                label="Вес катушки, г"
                value={parseInt(weightG) || 0}
                onChange={(val) => setWeightG(val.toString())}
                min={1}
              />
              {errors.weightG && <p className="text-red-500 text-xs select-none">{errors.weightG}</p>}
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
          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-[#242930]/40">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">
              {editingFilament ? 'Сохранить изменения' : 'Добавить филамент'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно подтверждения удаления */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Удалить филамент?"
        variant="warning"
        maxWidth="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Отмена</Button>
            <Button variant="danger" onClick={confirmDelete}>Удалить</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-300">
          Вы уверены, что хотите удалить филамент <strong className="text-white">«{deleteTarget?.name}»</strong>? Это действие нельзя отменить.
        </p>
      </Modal>
    </div>
  );
}
