'use client';

import React, { useState } from 'react';
import { useData } from '../../entities/model/DataProvider';
import { Printer } from '../../shared/types';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { Modal } from '../../shared/ui/Modal';
import { ColorPicker } from '../../shared/ui/ColorPicker';
import { formatCurrency } from '../../shared/lib/format';
import { Edit2, Trash2, Plus, Cpu, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../../shared/ui/PageHeader';

export function PrinterList() {
  const { printers, settings, addPrinter, updatePrinter, deletePrinter } = useData();

  // Состояния для модального окна формы
  const [isOpen, setIsOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Состояния полей формы
  const [name, setName] = useState('');
  const [powerW, setPowerW] = useState('300');
  const [price, setPrice] = useState('');
  const [lifespanHours, setLifespanHours] = useState('5000');
  const [color, setColor] = useState('#0CB4E0');

  // Ошибки формы
  const [errors, setErrors] = useState<{ name?: string; powerW?: string; price?: string; lifespanHours?: string }>({});

  const currencySymbol = settings?.currency ?? '₽';

  const handleOpenAdd = () => {
    setEditingPrinter(null);
    setName('');
    setPowerW('300');
    setPrice('');
    setLifespanHours('5000');
    setColor('#0CB4E0');
    setErrors({});
    setIsOpen(true);
  };

  const handleOpenEdit = (printer: Printer) => {
    setEditingPrinter(printer);
    setName(printer.name);
    setPowerW(printer.power_w.toString());
    setPrice(printer.price.toString());
    setLifespanHours(printer.lifespan_hours.toString());
    setColor(printer.color || '#0CB4E0');
    setErrors({});
    setIsOpen(true);
  };

  const validate = () => {
    const tempErrors: typeof errors = {};
    if (!name.trim()) tempErrors.name = 'Название принтера обязательно';
    
    const parsedPower = parseFloat(powerW);
    if (isNaN(parsedPower) || parsedPower <= 0) {
      tempErrors.powerW = 'Мощность должна быть положительным числом';
    }
    
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      tempErrors.price = 'Стоимость должна быть положительным числом или 0';
    }

    const parsedLifespan = parseFloat(lifespanHours);
    if (isNaN(parsedLifespan) || parsedLifespan <= 0) {
      tempErrors.lifespanHours = 'Ресурс работы должен быть больше 0 часов';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      name: name.trim(),
      power_w: parseFloat(powerW),
      price: parseFloat(price),
      lifespan_hours: parseFloat(lifespanHours),
      color: color,
    };

    try {
      if (editingPrinter) {
        await updatePrinter({ ...data, id: editingPrinter.id });
      } else {
        await addPrinter(data);
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
      await deletePrinter(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Заголовок и кнопка */}
      <PageHeader
        icon={Cpu}
        title="Мои 3D-принтеры"
        subtitle="Оборудование для печати, расчет энергопотребления и амортизации"
        accentColor="#38bdf8"
        actions={
          <Button
            onClick={handleOpenAdd}
            variant="primary"
            size="md"
            className="bg-gradient-to-r from-sky-600 to-sky-400 hover:from-sky-500 hover:to-sky-300 text-white border-none shadow-lg shadow-sky-400/25 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить принтер</span>
          </Button>
        }
      />

      {/* Список принтеров */}
      {printers.length === 0 ? (
        <Card>
          <div className="py-16 text-center flex flex-col items-center justify-center gap-4 select-none">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Cpu size={24} />
            </div>
            <div className="max-w-sm">
              <h3 className="text-white font-semibold text-base mb-1">Список принтеров пуст</h3>
              <p className="text-neutral-accent text-xs">
                Добавьте принтер (например, Bambu Lab A1), указав его мощность и цену покупки, чтобы корректно считать амортизацию и расход электричества.
              </p>
            </div>
            <Button size="sm" onClick={handleOpenAdd} className="flex items-center gap-1 mt-2">
              <Plus size={14} /> Добавить первый принтер
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence initial={false}>
            {printers.map((printer) => {
              const depreciationPerHour = printer.lifespan_hours > 0 ? printer.price / printer.lifespan_hours : 0;
              const isDefault = settings?.default_printer_id === printer.id;
              
              return (
                <motion.div
                  key={printer.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="relative group"
                >
                  <Card className="h-full flex flex-col justify-between">
                    <div>
                      {/* Шапка карточки принтера */}
                      <div className="flex justify-between items-start gap-4 mb-2.5 select-none">
                        <div className="flex items-start gap-2">
                          {/* Цветной кружочек метки принтера */}
                          <div 
                            className="w-4 h-4 rounded-full border border-black/25 mt-0.5 shrink-0 shadow-inner"
                            style={{ backgroundColor: printer.color || '#0CB4E0' }}
                          />
                          <div>
                            <h3 className="text-white font-bold text-base leading-tight group-hover:text-primary transition-colors">
                              {printer.name}
                            </h3>
                            {isDefault && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-primary font-bold uppercase mt-1">
                                <SettingsIcon size={10} /> По умолчанию
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Действия */}
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(printer)}
                            className="p-1 text-neutral-accent hover:text-white rounded hover:bg-[#242930] transition-colors focus:outline-none"
                            title="Редактировать"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(printer.id, printer.name)}
                            className="p-1 text-red-500/70 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors focus:outline-none"
                            title="Удалить"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Характеристики */}
                      <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-[#242930]/40 font-mono text-xs select-none">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-neutral-accent">Мощность</span>
                          <span className="text-white font-semibold">{printer.power_w} Вт</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-neutral-accent">Стоимость</span>
                          <span className="text-white font-semibold">{formatCurrency(printer.price, currencySymbol)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-neutral-accent">Ресурс работы</span>
                          <span className="text-white font-semibold">{printer.lifespan_hours.toLocaleString('ru-RU')} ч</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-neutral-accent">Амортизация</span>
                          <span className="text-primary font-bold">{depreciationPerHour.toFixed(2)} {currencySymbol}/ч</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Модальное окно создания/редактирования */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingPrinter ? 'Редактировать принтер' : 'Добавить новый принтер'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Название */}
          <Input
            label="Название 3D-принтера"
            placeholder="напр. Bambu Lab A1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            autoFocus
          />

          {/* Мощность */}
          <NumberCounter
            label="Потребляемая мощность, Вт"
            value={parseInt(powerW) || 0}
            onChange={(val) => setPowerW(val.toString())}
            min={1}
          />
          {errors.powerW && <p className="text-red-500 text-xs -mt-3 select-none">{errors.powerW}</p>}

          {/* Стоимость и Ресурс */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Цена покупки, ${currencySymbol}`}
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              error={errors.price}
            />
            <div className="flex flex-col gap-1">
              <NumberCounter
                label="Срок службы (ресурс), ч"
                value={parseInt(lifespanHours) || 0}
                onChange={(val) => setLifespanHours(val.toString())}
                min={1}
              />
              {errors.lifespanHours && <p className="text-red-500 text-xs select-none">{errors.lifespanHours}</p>}
            </div>
          </div>

          {/* Цвет принтера */}
          <ColorPicker
            label="Цвет принтера"
            value={color}
            onChange={setColor}
          />

          {/* Кнопки формы */}
          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-[#242930]/40">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">
              {editingPrinter ? 'Сохранить изменения' : 'Добавить принтер'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно подтверждения удаления */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Удалить принтер?"
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
          Вы уверены, что хотите удалить принтер <strong className="text-white">«{deleteTarget?.name}»</strong>? Это сбросит его из настроек по умолчанию, если он был выбран.
        </p>
      </Modal>
    </div>
  );
}
