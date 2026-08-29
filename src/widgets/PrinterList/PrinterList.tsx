'use client';

import React, { useState } from 'react';
import { useData } from '../../entities/model/DataProvider';
import { Printer } from '../../shared/types';
import { Input } from '../../shared/ui/Input';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { Modal } from '../../shared/ui/Modal';
import { ColorPicker } from '../../shared/ui/ColorPicker';
import { Tooltip } from '../../shared/ui/Tooltip';
import { formatCurrency } from '../../shared/lib/format';
import { Edit2, Trash2, Plus, Cpu, Settings as SettingsIcon } from 'lucide-react';
import { usePersistentState } from '../../shared/lib/usePersistentState';

export function PrinterList() {
  const { printers, settings, addPrinter, updatePrinter, deletePrinter } = useData();

  // Состояния для модального окна формы
  const [isOpen, setIsOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Состояния полей формы
  const [name, setName] = usePersistentState('3d_printer_draft_name', '');
  const [powerW, setPowerW] = usePersistentState('3d_printer_draft_power', '300');
  const [price, setPrice] = usePersistentState('3d_printer_draft_price', '');
  const [lifespanHours, setLifespanHours] = usePersistentState('3d_printer_draft_lifespan', '5000');
  const [color, setColor] = usePersistentState('3d_printer_draft_color', '#0CB4E0');

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
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-white font-mono font-bold text-xs sm:text-sm tracking-wider">
              § 3D-LABS // ПАРК ОБОРУДОВАНИЯ
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
            Добавить принтер
          </CockpitButton>
        </div>
      </div>

      {/* Список принтеров */}
      <div className="p-4 sm:p-6">
        {printers.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3 select-none">
            <div className="w-10 h-10 bg-cyan-950/60 border border-cyan-800/40 rounded-xl flex items-center justify-center text-cyan-400">
              <Cpu size={20} />
            </div>
            <div className="max-w-sm">
              <h3 className="text-white font-bold text-sm mb-1 font-mono">Список принтеров пуст</h3>
              <p className="text-neutral-400 text-xs font-sans">
                Добавьте принтер (например, Bambu Lab A1), указав его мощность и цену покупки, чтобы корректно считать амортизацию и расход электричества.
              </p>
            </div>
            <CockpitButton onClick={handleOpenAdd} icon={Plus} className="mt-2">
              Добавить первый принтер
            </CockpitButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {printers.map((printer) => {
              const depreciationPerHour = printer.lifespan_hours > 0 ? printer.price / printer.lifespan_hours : 0;
              const isDefault = settings?.default_printer_id === printer.id;
              
              return (
                <div
                  key={printer.id}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-3 group font-mono"
                >
                  <div>
                    {/* Шапка карточки */}
                    <div className="flex justify-between items-start gap-3 mb-2.5 select-none">
                      <div className="flex items-start gap-2">
                        <div 
                          className="w-3.5 h-3.5 rounded-full border border-white/20 mt-0.5 shrink-0 shadow-sm"
                          style={{ backgroundColor: printer.color || '#0CB4E0' }}
                        />
                        <div>
                          <h3 className="text-white font-bold text-sm font-sans leading-tight">
                            {printer.name}
                          </h3>
                          {isDefault && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 font-mono font-bold uppercase mt-1">
                              <SettingsIcon size={10} /> По умолчанию
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Действия */}
                      <div className="flex items-center gap-1">
                        <Tooltip content="Редактировать">
                          <button
                            onClick={() => handleOpenEdit(printer)}
                            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                        </Tooltip>
                        <Tooltip content="Удалить">
                          <button
                            onClick={() => handleDelete(printer.id, printer.name)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/40 transition-colors focus:outline-none cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Характеристики */}
                    <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-white/10 text-xs select-none">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-neutral-500 text-[10px] uppercase">Мощность</span>
                        <span className="text-white font-semibold">{printer.power_w} Вт</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-neutral-500 text-[10px] uppercase">Стоимость</span>
                        <span className="text-white font-semibold">{formatCurrency(printer.price, currencySymbol)}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-neutral-500 text-[10px] uppercase">Ресурс</span>
                        <span className="text-white font-semibold">{printer.lifespan_hours.toLocaleString('ru-RU')} ч</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-neutral-500 text-[10px] uppercase">Амортизация</span>
                        <span className="text-cyan-400 font-bold">{depreciationPerHour.toFixed(2)} {currencySymbol}/ч</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модальное окно создания/редактирования */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingPrinter ? '§ 3D-LABS // EDIT_PRINTER' : '§ 3D-LABS // NEW_PRINTER'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-mono text-xs">
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
          {errors.powerW && <p className="text-rose-400 text-xs -mt-2 select-none">{errors.powerW}</p>}

          {/* Стоимость и Ресурс */}
          <div className="grid grid-cols-2 gap-3">
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
                label="Ресурс работы, ч"
                value={parseInt(lifespanHours) || 0}
                onChange={(val) => setLifespanHours(val.toString())}
                min={1}
              />
              {errors.lifespanHours && <p className="text-rose-400 text-xs select-none">{errors.lifespanHours}</p>}
            </div>
          </div>

          {/* Цвет принтера */}
          <ColorPicker
            label="Цвет принтера"
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
              {editingPrinter ? 'Сохранить изменения' : 'Добавить принтер'}
            </CockpitButton>
          </div>
        </form>
      </Modal>

      {/* Модальное окно подтверждения удаления */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="§ 3D-LABS // DELETE_PRINTER"
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
          Вы уверены, что хотите удалить принтер <strong className="text-white font-mono">«{deleteTarget?.name}»</strong>? Это сбросит его из настроек по умолчанию, если он был выбран.
        </p>
      </Modal>
    </div>
  );
}
