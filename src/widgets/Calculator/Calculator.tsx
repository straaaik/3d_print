'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '../../entities/model/DataProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { Card } from '../../shared/ui/Card';
import { Select } from '../../shared/ui/Select';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { calculateCost } from '../../features/calculate-cost/model/calculate';
import { formatCurrency } from '../../shared/lib/format';
import { AlertCircle, Plus, Package, Trash2, Copy, Check, Link as LinkIcon, Upload, FileCode, ExternalLink, Calculator as CalculatorIcon, Tag, Folder } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '../../shared/ui/PageHeader';
import { getStoredCategories, saveNewCategory, ProductCategory } from '../../shared/lib/categories';

export function Calculator() {
  const router = useRouter();
  const { showWarning, showSuccess } = useToast();
  const { 
    isOnline,
    filaments, 
    printers, 
    settings, 
    addSavedCalculation, 
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

  // Состояние формы ввода (время работы мастера, категории, теги и модалка)
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>([]);
  const [laborMinutes, setLaborMinutes] = useState<string>('15');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [calculationName, setCalculationName] = useState('');
  const [calculationCategory, setCalculationCategory] = useState<string>('Разное');
  const [calculationTags, setCalculationTags] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState<string>('0');

  // Состояние создания новой категории
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stlUrl, setStlUrl] = useState('');
  const [stlFileName, setStlFileName] = useState('');
  const [stlFileData, setStlFileData] = useState('');

  useEffect(() => {
    setCategoriesList(getStoredCategories());
  }, []);

  // Синхронизация начального количества на складе с тиражом печати
  useEffect(() => {
    if (isSaveModalOpen) {
      setStockQuantity(quantity || '1');
    }
  }, [isSaveModalOpen, quantity]);

  const handleConfirmCreateCategory = () => {
    if (!newCategoryName.trim()) {
      showWarning('Введите название новой категории', 'Заполните название');
      return;
    }
    const updated = saveNewCategory(newCategoryName.trim(), newCategoryIcon);
    setCategoriesList(updated);
    setCalculationCategory(newCategoryName.trim());
    setNewCategoryName('');
    setIsCreatingCategory(false);
    showSuccess(`Новая категория «${newCategoryName.trim()}» создана!`, 'Категория добавлена');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOnline) {
      showWarning(
        'Загрузка локальных файлов STL доступна только при подключенном Supabase (облачном хранилище). Используйте ссылку на 3D-модель или подключите Supabase в Настройках.',
        'Требуется Supabase'
      );
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setStlFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setStlFileData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

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

  const handleSaveCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calculationName.trim() || isSubmitting) return;

    const parsedTags = calculationTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      await addSavedCalculation({
        name: calculationName.trim(),
        category: calculationCategory,
        tags: parsedTags,
        stock_quantity: parseInt(stockQuantity) || 0,
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
        stl_url: stlUrl.trim() || undefined,
        stl_file_name: stlFileName || undefined,
        stl_file_data: stlFileData || undefined,
      });
      showSuccess(`Товар «${calculationName.trim()}» успешно сохранен в каталог!`, 'Товар создан');
      setIsSaveModalOpen(false);
      setCalculationName('');
      setCalculationCategory('Разное');
      setCalculationTags('');
      setStockQuantity('0');
      setStlUrl('');
      setStlFileName('');
      setStlFileData('');
    } catch (err) {
      console.error('Ошибка сохранения расчета:', err);
    } finally {
      setIsSubmitting(false);
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



  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalculatorIcon}
        title="Калькулятор стоимости"
        subtitle="Быстрый и точный расчет себестоимости 3D-печати деталей, амортизации и электроэнергии"
        accentColor="#0CB4E0"
        actions={
          (weightG || hours || minutes || quantity !== '1') ? (
            <Button
              type="button"
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="text-xs flex items-center gap-1.5 border-[#0CB4E0]/30 text-[#0CB4E0] hover:bg-[#0CB4E0]/10 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Очистить поля
            </Button>
          ) : undefined
        }
      />

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

            {/* Карточка Чистой Прибыли и Маржинальности */}
            {(() => {
              const profitTotal = Math.round((result.totalFinalPrice - result.totalBaseCost) * 100) / 100;
              const showPerUnit = (parseInt(quantity) || 1) > 1;
              const profitPerUnit = showPerUnit 
                ? Math.round((result.finalPricePerUnit - result.baseCostPerUnit) * 100) / 100 
                : profitTotal;
              const marginPercent = result.totalFinalPrice > 0 
                ? Math.round((profitTotal / result.totalFinalPrice) * 1000) / 10 
                : 0;

              return (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between mt-1 select-none font-mono">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-emerald-400 text-[10px] uppercase font-bold tracking-wider">
                      Чистая прибыль
                    </span>
                    <span className="text-emerald-300 text-lg font-bold">
                      +{formatCurrency(profitTotal, currencySymbol)}
                    </span>
                    {showPerUnit && (
                      <span className="text-emerald-400/90 text-xs font-semibold">
                        за шт: +{formatCurrency(profitPerUnit, currencySymbol)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-emerald-400/80 text-[10px] uppercase font-bold tracking-wider">
                      Маржинальность
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold rounded-lg">
                      ▲ {marginPercent}%
                    </span>
                  </div>
                </div>
              );
            })()}

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
                <Package size={14} className="text-primary" /> Сохранить в товары
              </Button>
            </div>

          </div>
        </Card>
      </div>

      {/* Модальное окно для ввода имени товара и 3D-модели */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Сохранить в товары"
      >
        <form onSubmit={handleSaveCalculation} className="flex flex-col gap-4">
          <Input
            label="Название товара"
            placeholder="напр. Корпус прибора (ABS-пластик)"
            value={calculationName}
            onChange={(e) => setCalculationName(e.target.value)}
            required
            autoFocus
          />

          {/* Категория товара */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9ca3af] flex items-center gap-1.5">
              <Folder size={14} className="text-amber-400" />
              Категория товара
            </label>

            {!isCreatingCategory ? (
              <select
                value={calculationCategory}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setIsCreatingCategory(true);
                  } else {
                    setCalculationCategory(e.target.value);
                  }
                }}
                className="w-full bg-[#1a1d24] border border-[#242930] text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer font-sans"
              >
                {categoriesList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
                <option value="__new__">➕ Создать новую категорию...</option>
              </select>
            ) : (
              <div className="p-3 bg-[#14171f] border border-amber-500/40 rounded-xl space-y-3 animate-scale-in">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Folder size={13} /> Создание новой категории
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    className="bg-[#1a1d26] border border-[#262a36] text-base rounded-xl p-2 focus:outline-none focus:border-amber-500 cursor-pointer shrink-0"
                  >
                    <option value="📦">📦</option>
                    <option value="🚗">🚗</option>
                    <option value="🏠">🏠</option>
                    <option value="⚙️">⚙️</option>
                    <option value="🎮">🎮</option>
                    <option value="🔧">🔧</option>
                    <option value="🏷️">🏷️</option>
                    <option value="💡">💡</option>
                    <option value="🚀">🚀</option>
                    <option value="🎁">🎁</option>
                    <option value="🧸">🧸</option>
                    <option value="🛠️">🛠️</option>
                  </select>

                  <Input
                    placeholder="Название (напр. Медицина, Модели)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCreatingCategory(false)}>
                    Отмена
                  </Button>
                  <Button type="button" size="sm" onClick={handleConfirmCreateCategory} className="bg-amber-500 hover:bg-amber-600 text-black font-bold border-none">
                    Создать
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Теги товара */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9ca3af] flex items-center gap-1.5">
              <Tag size={14} className="text-amber-400" />
              Теги товара (через запятую)
            </label>
            <Input
              placeholder="например: PLA, Срочно, Популярное, Авито"
              value={calculationTags}
              onChange={(e) => setCalculationTags(e.target.value)}
            />
            <p className="text-[11px] text-gray-500 font-sans">
              Любые ключевые слова через запятую. Они отобразятся в виде бэйджей #тег в каталоге.
            </p>
          </div>

          {/* Наличие на складе */}
          <div>
            <NumberCounter
              label="В наличии на складе (шт)"
              value={parseInt(stockQuantity) || 0}
              min={0}
              onChange={(val) => setStockQuantity(val.toString())}
            />
            <p className="text-[11px] text-gray-500 font-sans mt-1">
              Количество готовой продукции на складе. При добавлении в заказ 1 шт списывается автоматически!
            </p>
          </div>

          {/* Ссылка на 3D-модель */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9ca3af]">
              Ссылка на 3D-модель (Thingiverse, Printables, Облако)
            </label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="https://..."
                value={stlUrl}
                onChange={(e) => setStlUrl(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-1 shrink-0">
                {stlUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => window.open(stlUrl, '_blank')}
                      className="w-9 h-9 bg-[#242930] hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-[#242930] rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      title="Проверить / Открыть ссылку"
                    >
                      <ExternalLink size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setStlUrl('')}
                      className="w-9 h-9 bg-[#242930] hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-[#242930] rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      title="Удалить ссылку"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Загрузка STL файла */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#9ca3af]">
              Файл STL / 3MF (для скачивания)
            </label>
            
            <div className="flex items-center justify-between gap-3 p-3 bg-[#1a1d24] border border-[#242930] rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  stlFileName ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-[#242930] text-gray-500 border-[#242930]'
                }`}>
                  <FileCode size={16} />
                </div>
                
                <div className="min-w-0 flex-1">
                  {stlFileName ? (
                    <span className="text-xs font-semibold text-emerald-400 font-mono truncate block" title={stlFileName}>
                      {stlFileName}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs truncate block select-none">Файл не загружен</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <label className="w-9 h-9 bg-[#242930] hover:bg-primary/20 text-gray-300 hover:text-white border border-[#242930] rounded-xl flex items-center justify-center transition-colors cursor-pointer" title={stlFileName ? 'Заменить файл' : 'Загрузить файл'}>
                  <Upload size={15} />
                  <input
                    type="file"
                    accept=".stl,.3mf,.obj,.zip"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {stlFileName && (
                  <button
                    type="button"
                    onClick={() => { setStlFileName(''); setStlFileData(''); }}
                    className="w-9 h-9 bg-[#242930] hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-[#242930] rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                    title="Удалить файл"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#242930]/40 pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => setIsSaveModalOpen(false)} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  </div>
);
}
