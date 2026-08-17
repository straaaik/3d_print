'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '../../entities/model/DataProvider';
import { Card } from '../../shared/ui/Card';
import { Select } from '../../shared/ui/Select';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';
import { Table } from '../../shared/ui/Table';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { calculateCost } from '../../features/calculate-cost/model/calculate';
import { formatCurrency, formatDate } from '../../shared/lib/format';
import { AlertCircle, Plus, Star, Play, Trash2, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { SavedCalculation } from '../../shared/types';

export function Calculator() {
  const router = useRouter();
  const { 
    filaments, 
    printers, 
    settings, 
    savedCalculations, 
    addSavedCalculation, 
    deleteSavedCalculation,
    calcWeight: weightG,
    setCalcWeight: setWeightG,
    calcHours: hours,
    setCalcHours: setHours,
    calcMinutes: minutes,
    setCalcMinutes: setMinutes,
    calcQuantity: quantity,
    setCalcQuantity: setQuantity,
    calcFilamentId: filamentId,
    setCalcFilamentId: setFilamentId,
    calcPrinterId: printerId,
    setCalcPrinterId: setPrinterId,
    resetCalculator
  } = useData();

  // Состояние формы ввода (время работы мастера и модалки)
  const [laborMinutes, setLaborMinutes] = useState<string>('15');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [calculationName, setCalculationName] = useState('');

  // Обработчик полного сброса полей калькулятора
  const handleReset = () => {
    resetCalculator();
    if (settings) {
      setLaborMinutes(settings.labor_time_minutes.toString());
    } else {
      setLaborMinutes('15');
    }
  };

  // Установка значений по умолчанию при загрузке данных
  useEffect(() => {
    if (filaments.length > 0 && !filamentId) {
      setFilamentId(filaments[0].id);
    }
  }, [filaments, filamentId]);

  useEffect(() => {
    if (printerId) return; // Уже выбран — не перезаписываем
    if (settings?.default_printer_id && printers.some(p => p.id === settings.default_printer_id)) {
      setPrinterId(settings.default_printer_id);
    } else if (printers.length > 0) {
      setPrinterId(printers[0].id);
    }
  }, [printers, settings]); // Без printerId в зависимостях — не сбрасывает выбор пользователя

  // Синхронизация времени работы мастера с настройками по умолчанию
  useEffect(() => {
    if (settings) {
      setLaborMinutes(settings.labor_time_minutes.toString());
    }
  }, [settings]);

  const selectedFilament = filaments.find(f => f.id === filamentId) || null;
  const selectedPrinter = printers.find(p => p.id === printerId) || null;

  // Производим расчет
  const result = calculateCost({
    weightG: parseFloat(weightG) || 0,
    hours: parseInt(hours) || 0,
    minutes: parseInt(minutes) || 0,
    laborMinutes: parseInt(laborMinutes) || 0,
    quantity: parseInt(quantity) || 1,
    filament: selectedFilament,
    printer: selectedPrinter,
    settings,
  });

  const handleLoadCalculation = (calc: SavedCalculation) => {
    if (calc.filament_id && filaments.some(f => f.id === calc.filament_id)) {
      setFilamentId(calc.filament_id);
    }
    if (calc.printer_id && printers.some(p => p.id === calc.printer_id)) {
      setPrinterId(calc.printer_id);
    }
    setWeightG(calc.weight_g.toString());
    setHours(calc.hours.toString());
    setMinutes(calc.minutes.toString());
    setQuantity(calc.quantity.toString());
    if (calc.labor_minutes !== undefined) {
      setLaborMinutes(calc.labor_minutes.toString());
    }
  };

  const handleSaveCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calculationName.trim()) return;

    try {
      await addSavedCalculation({
        name: calculationName.trim(),
        filament_name: selectedFilament?.name || 'Не выбран',
        filament_color: selectedFilament?.color || '#0CB4E0',
        printer_name: selectedPrinter?.name || 'Не выбран',
        weight_g: parseFloat(weightG) || 0,
        hours: parseInt(hours) || 0,
        minutes: parseInt(minutes) || 0,
        quantity: parseInt(quantity) || 1,
        base_cost: result.totalBaseCost,
        final_price: result.totalFinalPrice,
        
        filament_id: filamentId || undefined,
        printer_id: printerId || undefined,
        labor_minutes: parseInt(laborMinutes) || undefined,
      });
      setIsSaveModalOpen(false);
      setCalculationName('');
    } catch (err) {
      console.error('Ошибка сохранения расчета:', err);
    }
  };

  const currencySymbol = settings?.currency ?? '₽';
  const markupPercent = settings?.default_markup_percent ?? 100;
  const defectPercent = settings?.default_defect_percent ?? 5;

  const showPerUnit = (parseInt(quantity) || 1) > 1;

  // Состояние для копирования сообщения клиенту
  const [copied, setCopied] = useState(false);

  const handleCopyClientMessage = () => {
    const printHours = (parseInt(hours) || 0) + (parseInt(minutes) || 0) / 60;
    const printDays = Math.floor(printHours / 24);
    const leadTimeDays = printDays + 2;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + leadTimeDays);
    const formattedTargetDate = targetDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const finalPriceText = formatCurrency(result.totalFinalPrice, currencySymbol);

    const message = `Стоимость 3D-печати вашей детали — ${finalPriceText}.

В стоимость входит сама печать и подготовка модели к печати.
Срок изготовления — до ${formattedTargetDate}.

Если всё устраивает, можем запускать в печать 👍`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // Опции для кастомных селектов
  const filamentOptions = filaments.map((f) => {
    const pricePerGram = f.weight_g > 0 ? f.price / f.weight_g : 0;
    return {
      value: f.id,
      label: `${f.name} — ${f.price} ${currencySymbol} / ${f.weight_g}г (${pricePerGram.toFixed(2)} ${currencySymbol}/г)`,
      color: f.color,
    };
  });

  const printerOptions = printers.map((p) => ({
    value: p.id,
    label: `${p.name} — ${p.power_w} Вт`,
    color: p.color,
  }));

  // Определение колонок для кастомной таблицы избранного
  const columns = [
    {
      key: 'name',
      header: 'Название расчёта',
      sortable: true,
      render: (item: SavedCalculation) => (
        <span className="font-semibold text-white truncate max-w-[140px] sm:max-w-[180px] block" title={item.name}>
          {item.name}
        </span>
      ),
    },
    {
      key: 'filament_name',
      header: 'Материал',
      sortable: true,
      render: (item: SavedCalculation) => (
        <div className="flex items-center gap-1.5 max-w-[130px] sm:max-w-[180px]">
          {item.filament_color && (
            <div 
              className="w-3 h-3 rounded-full border border-black/20 shrink-0 shadow-inner" 
              style={{ backgroundColor: item.filament_color }}
            />
          )}
          <span className="truncate font-medium block" title={item.filament_name}>
            {item.filament_name}
          </span>
        </div>
      ),
    },
    {
      key: 'printer_name',
      header: 'Принтер',
      sortable: true,
      render: (item: SavedCalculation) => (
        <span className="truncate max-w-[100px] sm:max-w-[130px] block" title={item.printer_name}>
          {item.printer_name}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Добавлено',
      sortable: true,
      render: (item: SavedCalculation) => (
        <span className="text-gray-400 text-xs font-mono select-none" title={item.created_at}>
          {formatDate(item.created_at)}
        </span>
      ),
    },
    {
      key: 'params',
      header: 'Параметры печати',
      sortable: true,
      sortValue: (item: SavedCalculation) => item.weight_g,
      render: (item: SavedCalculation) => (
        <span className="font-mono text-xs text-neutral-accent">
          {item.weight_g}г • {item.hours}ч {item.minutes}м {item.quantity > 1 ? `• ${item.quantity}шт` : ''}
        </span>
      ),
    },
    {
      key: 'prices',
      header: 'Стоимость',
      align: 'right' as const,
      sortable: true,
      sortValue: (item: SavedCalculation) => item.final_price,
      render: (item: SavedCalculation) => (
        <div className="flex flex-col items-end font-mono">
          <span className="text-primary font-bold text-sm">{formatCurrency(item.final_price, currencySymbol)}</span>
          <span className="text-gray-500 text-[10px]">себ: {formatCurrency(item.base_cost, currencySymbol)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Действия',
      align: 'center' as const,
      render: (item: SavedCalculation) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => handleLoadCalculation(item)}
            className="p-1.5 text-primary hover:text-white rounded hover:bg-primary/10 transition-colors focus:outline-none cursor-pointer"
            title="Загрузить в калькулятор"
          >
            <Play size={13} fill="currentColor" />
          </button>
          <button
            onClick={() => deleteSavedCalculation(item.id)}
            className="p-1.5 text-red-500/70 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors focus:outline-none cursor-pointer"
            title="Удалить"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 01 Параметры печати */}
      <div className="lg:col-span-6">
        <Card 
          title="Параметры печати" 
          stepNumber="01"
          headerAction={
            (weightG || hours || minutes || quantity !== '1') ? (
              <button
                type="button"
                onClick={handleReset}
                className="text-neutral-accent hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-[#242930] focus:outline-none flex items-center gap-1 text-[11px] font-semibold cursor-pointer select-none"
                title="Очистить все поля калькулятора"
              >
                <Trash2 size={13} />
                <span>Очистить</span>
              </button>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-3.5">
            
            {/* Выбор филамента */}
            <div>
              {filaments.length === 0 ? (
                <div className="p-4 bg-[#242930]/30 border border-[#242930] rounded-lg flex flex-col items-center text-center gap-3">
                  <div className="flex items-center gap-2 text-primary">
                    <AlertCircle size={20} />
                    <span className="text-sm font-semibold">Нет добавленных филаментов</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Для проведения расчета необходимо добавить хотя бы один филамент.
                  </p>
                  <Button size="sm" onClick={() => router.push('/filaments')} className="flex items-center gap-1">
                    <Plus size={14} /> Добавить филамент
                  </Button>
                </div>
              ) : (
                <Select
                  label="Филамент"
                  value={filamentId}
                  options={filamentOptions}
                  onChange={setFilamentId}
                  isSearchable={true}
                />
              )}
            </div>

            {/* Выбор принтера */}
            <div>
              {printers.length === 0 ? (
                <div className="p-4 bg-[#242930]/30 border border-[#242930] rounded-lg flex flex-col items-center text-center gap-3">
                  <div className="flex items-center gap-2 text-primary">
                    <AlertCircle size={20} />
                    <span className="text-sm font-semibold">Нет добавленных принтеров</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Добавьте принтер для автоматического расчета электричества и амортизации.
                  </p>
                  <Button size="sm" onClick={() => router.push('/printers')} className="flex items-center gap-1">
                    <Plus size={14} /> Добавить принтер
                  </Button>
                </div>
              ) : (
                <Select
                  label="Принтер"
                  value={printerId}
                  options={printerOptions}
                  onChange={setPrinterId}
                />
              )}
            </div>

            {/* Расход филамента */}
            <Input
              label="Израсходовано материала, г"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="напр. 42.5"
              value={weightG}
              onChange={(e) => setWeightG(e.target.value)}
            />

            {/* Время печати */}
            {/* Время печати */}
            <div className="grid grid-cols-2 gap-4">
              <NumberCounter
                label="Время печати, ч"
                value={parseInt(hours) || 0}
                onChange={(val) => setHours(val.toString())}
                min={0}
              />
              <NumberCounter
                label="и минут"
                value={parseInt(minutes) || 0}
                onChange={(val) => setMinutes(val.toString())}
                min={0}
                max={59}
              />
            </div>

            {/* Время работы мастера */}
            <NumberCounter
              label="Время работы мастера (подготовка, постобработка), мин"
              value={parseInt(laborMinutes) || 0}
              onChange={(val) => setLaborMinutes(val.toString())}
              min={0}
            />

            {/* Количество изделий */}
            <NumberCounter
              label="Количество изделий за печать, шт"
              value={parseInt(quantity) || 1}
              onChange={(val) => setQuantity(val.toString())}
              min={1}
            />

            <p className="text-[#6b7280] text-xs leading-relaxed mt-2">
              Если печаталось сразу несколько деталей — расход материала и время указывайте суммарно на всю печать, цена за штуку посчитается автоматически.
            </p>
          </div>
        </Card>
      </div>

      {/* 02 Расчёт */}
      <div className="lg:col-span-6">
        <Card title="Расчёт" stepNumber="02">
          <div className="flex flex-col gap-4 font-mono text-sm">
            {/* Материал */}
            <div className="flex justify-between items-center py-1.5 border-b border-secondary/40">
              <span className="text-[#9ca3af]">Материал</span>
              <span className="text-white font-bold">
                {formatCurrency(result.materialCost, currencySymbol)}
              </span>
            </div>

            {/* Электричество */}
            <div className="flex justify-between items-center py-1.5 border-b border-secondary/40">
              <span className="text-[#9ca3af]">Электричество</span>
              <span className="text-white font-bold">
                {formatCurrency(result.electricityCost, currencySymbol)}
              </span>
            </div>

            {/* Амортизация принтера */}
            <div className="flex justify-between items-center py-1.5 border-b border-secondary/40">
              <span className="text-[#9ca3af]">Амортизация принтера</span>
              <span className="text-white font-bold">
                {formatCurrency(result.depreciationCost, currencySymbol)}
              </span>
            </div>

            {/* Труд */}
            <div className="flex justify-between items-center py-1.5 border-b border-secondary/40">
              <span className="text-[#9ca3af]">Труд</span>
              <span className="text-white font-bold">
                {formatCurrency(result.laborCost, currencySymbol)}
              </span>
            </div>

            {/* Брак */}
            <div className="flex justify-between items-center py-1.5 border-b border-secondary/40">
              <span className="text-[#9ca3af]">Брак ({defectPercent}%)</span>
              <span className="text-white font-bold">
                {formatCurrency(result.defectCost, currencySymbol)}
              </span>
            </div>

            {/* Две плашки внизу */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3">
              {/* Без наценки */}
              <div className="bg-[#1e222b] border border-[#242930] rounded-lg p-3 flex flex-col gap-0.5 select-none">
                <span className="text-[#9ca3af] text-[10px] uppercase font-bold tracking-wider">Без наценки</span>
                <span className="text-white text-xl font-bold tracking-tight">
                  {formatCurrency(result.totalBaseCost, currencySymbol)}
                </span>
                {showPerUnit && (
                  <span className="text-neutral-accent text-xs">
                    за шт: {formatCurrency(result.baseCostPerUnit, currencySymbol)}
                  </span>
                )}
              </div>

              {/* С наценкой */}
              <div className="bg-[#1e222b] border border-primary/40 rounded-lg p-3 flex flex-col gap-0.5 select-none relative overflow-hidden">
                {/* Подсветка плашки */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-xl pointer-events-none" />
                
                <span className="text-primary text-[10px] uppercase font-bold tracking-wider">С наценкой {markupPercent}%</span>
                <span className="text-primary text-xl font-bold tracking-tight">
                  {formatCurrency(result.totalFinalPrice, currencySymbol)}
                </span>
                {showPerUnit && (
                  <span className="text-neutral-accent text-xs">
                    за шт: {formatCurrency(result.finalPricePerUnit, currencySymbol)}
                  </span>
                )}
              </div>
            </div>

            {/* Блок кнопок действий */}
            <div className="flex flex-col gap-2 mt-4">
              <Button
                variant="primary"
                type="button"
                onClick={handleCopyClientMessage}
                className={`w-full flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  copied 
                    ? '!bg-[#ea580c] hover:!bg-[#c2410c] !text-white font-bold shadow-lg shadow-orange-500/10' 
                    : ''
                }`}
                disabled={!filamentId || filaments.length === 0}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Скопировано!' : 'Скопировать для клиента'}
              </Button>
              
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsSaveModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5"
                disabled={!filamentId || filaments.length === 0}
              >
                <Star size={14} className="text-primary fill-primary" /> Сохранить в избранное
              </Button>
            </div>

          </div>
        </Card>
      </div>

      {/* 03 Сохраненные расчеты (Избранное) */}
      <div className="lg:col-span-12 mt-6 flex flex-col gap-4 select-none w-full overflow-hidden min-w-0">
        <div className="border-t border-[#242930]/40 pt-6">
          <h3 className="text-white text-base font-bold">Избранные расчёты</h3>
          <p className="text-neutral-accent text-xs">Ваши сохраненные шаблоны для быстрого повторного запуска расчетов</p>
        </div>
        <Table
          columns={columns}
          data={savedCalculations}
          keyExtractor={(item) => item.id}
          isSearchable={true}
          pageSize={15}
          emptyState={
            <div className="flex flex-col items-center gap-2 py-6 text-center select-none">
              <Star size={18} className="text-neutral-accent/40" />
              <span className="text-neutral-accent text-xs font-semibold">Список избранного пуст</span>
              <p className="text-gray-500 text-[10px] max-w-xs leading-normal mt-0.5">
                Введите параметры печати детали и нажмите «Сохранить в избранное», чтобы она появилась в этой таблице.
              </p>
            </div>
          }
        />
      </div>

      {/* Модальное окно для ввода имени избранного расчета */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Сохранить в избранное"
      >
        <form onSubmit={handleSaveCalculation} className="flex flex-col gap-4">
          <Input
            label="Название расчёта"
            placeholder="напр. Корпус прибора (ABS-пластик)"
            value={calculationName}
            onChange={(e) => setCalculationName(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 border-t border-[#242930]/40 pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => setIsSaveModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
