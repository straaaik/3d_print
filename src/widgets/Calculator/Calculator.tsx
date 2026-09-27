'use client';

import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { usePageRouter as useRouter } from '../../shared/ui/page-transition/PageTransitionLink';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../../entities/model/DataProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { calculateCost } from '../../features/calculate-cost/model/calculate';
import { formatCurrency } from '../../shared/lib/format';
import { Tooltip, CustomTooltip } from '../../shared/ui/Tooltip';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { usePixelCurtain } from '../../shared/ui/PixelCurtain';
import { CockpitContentTransition } from '../../shared/ui/CockpitContentTransition';
import {
  getStoredCategories,
  INITIAL_PRODUCT_CATEGORIES,
  ProductCategory
} from '../../shared/lib/categories';
import { DEFAULT_COST_CATEGORIES } from '../../shared/lib/costCategories';
import {
  ShoppingBag,
  Package,
  Copy,
  Check,
  RotateCcw,
  Plus,
  X,
  Zap,
  HelpCircle,
  Share2
} from 'lucide-react';
import { usePersistentState } from '../../shared/lib/usePersistentState';
import { CockpitDropdown } from '../../shared/ui/CockpitDropdown';
import { ClientReceiptModal } from './ClientReceiptModal';
import { MotionRevealDiv } from '../../shared/ui/MotionPrimitives';

const PRODUCT_CATEGORIES_STORAGE_KEY = 'custom_product_categories';
const SERVER_PRODUCT_CATEGORIES_SNAPSHOT = JSON.stringify(INITIAL_PRODUCT_CATEGORIES);

function subscribeToProductCategories(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (
      event.storageArea === window.localStorage
      && (event.key === PRODUCT_CATEGORIES_STORAGE_KEY || event.key === null)
    ) {
      onStoreChange();
    }
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

function getProductCategoriesSnapshot() {
  return JSON.stringify(getStoredCategories());
}

function getServerProductCategoriesSnapshot() {
  return SERVER_PRODUCT_CATEGORIES_SNAPSHOT;
}

export function Calculator() {
  const router = useRouter();
  const { navigate: curtainNavigate } = usePixelCurtain();
  const { showWarning, showSuccess } = useToast();
  const {
    isOnline,
    filaments,
    printers,
    settings,
    collections,
    addSavedCalculation,
    calcWeight: weightG,
    setCalcWeight: setWeightG,
    calcDays: days,
    setCalcDays: setDays,
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
    calcLaborMinutes,
    setCalcLaborMinutes,
    calcLaborRate,
    calcMarkup,
    setCalcMarkup,
    calcDefect,
    setCalcDefect,
    calcIsOwnerLabor,
    setCalcIsOwnerLabor,
    calcIsLaborPerUnit,
    calcDiscountType,
    calcDiscountValue,
    calcUrgencyType,
    calcUrgencyValue,
    calcCustomCostItems,
    setCalcCustomCostItems,
    resetCalculator
  } = useData();

  // Состояние модалки сохранения в каталог
  const categoriesSnapshot = useSyncExternalStore(
    subscribeToProductCategories,
    getProductCategoriesSnapshot,
    getServerProductCategoriesSnapshot,
  );
  const categoriesList = useMemo(
    () => JSON.parse(categoriesSnapshot) as ProductCategory[],
    [categoriesSnapshot],
  );
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [calculationName, setCalculationName] = usePersistentState('3d_calc_save_name', '');
  const [calculationCategory, setCalculationCategory] = usePersistentState<string>('3d_calc_save_cat', 'Разное');
  const [calculationTags, setCalculationTags] = usePersistentState('3d_calc_save_tags', '');
  const [stockQuantity, setStockQuantity] = useState('0');

  // Состояние выбора коллекции
  const [selectedCollectionId, setSelectedCollectionId] = usePersistentState<string>('3d_calc_save_collection_id', 'none');

  // Добавление произвольного расхода
  const [isAddingCustomCost, setIsAddingCustomCost] = useState(false);
  const [newCostName, setNewCostName] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('100');
  const [newCostIsPerUnit, setNewCostIsPerUnit] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stlUrl, setStlUrl] = usePersistentState('3d_calc_stl_url', '');
  const [stlFileName, setStlFileName] = usePersistentState('3d_calc_stl_file_name', '');
  const [stlFileData, setStlFileData] = usePersistentState('3d_calc_stl_file_data', '');
  const [copied, setCopied] = useState(false);
  const [isClientReceiptOpen, setIsClientReceiptOpen] = useState(false);

  useEffect(() => {
    if (filaments.length > 0 && !filamentId) {
      setFilamentId(filaments[0].id);
    }
  }, [filaments, filamentId, setFilamentId]);

  useEffect(() => {
    if (printerId) return;
    if (settings?.default_printer_id && printers.some(p => p.id === settings.default_printer_id)) {
      setPrinterId(settings.default_printer_id);
    } else if (printers.length > 0) {
      setPrinterId(printers[0].id);
    }
  }, [printers, settings, printerId, setPrinterId]);

  const currencySymbol = settings?.currency ?? '₽';
  const defaultDefectValue = settings?.default_defect_percent ?? 5;
  const defaultLaborRateValue = settings?.labor_rate_per_hour ?? 0;
  const defaultLaborMinutesValue = settings?.labor_time_minutes ?? 15;

  const currentLaborMinutes = calcLaborMinutes !== '' ? calcLaborMinutes : defaultLaborMinutesValue.toString();
  const currentLaborRate = calcLaborRate !== '' ? calcLaborRate : defaultLaborRateValue.toString();

  const selectedFilament = filaments.find(f => f.id === filamentId) || (filaments.length > 0 ? filaments[0] : null);
  const selectedPrinter = printers.find(p => p.id === printerId) || (printers.length > 0 ? printers[0] : null);

  // Расчет стоимости
  const result = useMemo(() => calculateCost({
    weightG: parseFloat(weightG) || 0,
    days: parseInt(days) || 0,
    hours: parseInt(hours) || 0,
    minutes: parseInt(minutes) || 0,
    laborMinutes: parseInt(currentLaborMinutes) || 0,
    laborRatePerHour: parseFloat(currentLaborRate) || 0,
    isOwnerLabor: calcIsOwnerLabor,
    isLaborPerUnit: calcIsLaborPerUnit,
    markupPercent: calcMarkup !== '' ? parseFloat(calcMarkup) : undefined,
    defectPercent: calcDefect !== '' ? parseFloat(calcDefect) : undefined,
    discountPercent: calcDiscountType === 'percent' ? (parseFloat(calcDiscountValue) || 0) : 0,
    discountAmount: calcDiscountType === 'fixed' ? (parseFloat(calcDiscountValue) || 0) : 0,
    urgencyPercent: calcUrgencyType === 'percent' ? (parseFloat(calcUrgencyValue) || 0) : 0,
    urgencyAmount: calcUrgencyType === 'fixed' ? (parseFloat(calcUrgencyValue) || 0) : 0,
    customCostItems: calcCustomCostItems,
    quantity: parseInt(quantity) || 1,
    filament: selectedFilament,
    printer: selectedPrinter,
    settings,
  }), [
    weightG,
    days,
    hours,
    minutes,
    currentLaborMinutes,
    currentLaborRate,
    calcIsOwnerLabor,
    calcIsLaborPerUnit,
    calcMarkup,
    calcDefect,
    calcDiscountType,
    calcDiscountValue,
    calcUrgencyType,
    calcUrgencyValue,
    calcCustomCostItems,
    quantity,
    selectedFilament,
    selectedPrinter,
    settings
  ]);

  const currentMarkup = calcMarkup !== '' ? calcMarkup : result.appliedMarkupPercent.toString();
  const currentDefect = calcDefect !== '' ? calcDefect : defaultDefectValue.toString();

  const pricePerGram = selectedFilament && selectedFilament.weight_g > 0
    ? (selectedFilament.price / selectedFilament.weight_g)
    : 0;

  const totalPrintHours = (parseInt(days) || 0) * 24 + (parseInt(hours) || 0) + (parseInt(minutes) || 0) / 60;
  const powerKwH = selectedPrinter ? (selectedPrinter.power_w * totalPrintHours) / 1000 : 0;
  const electricityAndDeprecPerHour = totalPrintHours > 0
    ? (result.electricityCost + result.depreciationCost) / totalPrintHours
    : 0;

  const handleCopyClientMessage = () => {
    const printHoursVal = (parseInt(days) || 0) * 24 + (parseInt(hours) || 0) + (parseInt(minutes) || 0) / 60;
    const printDays = Math.floor(printHoursVal / 24);
    const leadTimeDays = Math.max(1, printDays + 2);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + leadTimeDays);
    const formattedTargetDate = targetDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const finalPriceText = formatCurrency(result.totalFinalPrice, currencySymbol);

    const enabledCustomNames = (calcCustomCostItems || [])
      .filter(i => i.isEnabled)
      .map(i => i.name.replace(/^[\p{Emoji}\s]+/u, '').trim());

    let servicesText = 'В стоимость входит: 3D-печать, подготовка модели';
    if (enabledCustomNames.length > 0) {
      servicesText += `, ${enabledCustomNames.join(', ').toLowerCase()}`;
    }
    if (result.urgencyCost > 0) {
      servicesText += ', срочное изготовление';
    }
    servicesText += '.';

    const message = `Стоимость 3D-печати вашего заказа — ${finalPriceText}.\n\n${servicesText}\nСрок изготовления — до ${formattedTargetDate}.\n\nЕсли всё устраивает, запускаем в работу 👍`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleOpenSaveModal = () => {
    setStockQuantity(quantity || '1');
    setIsSaveModalOpen(true);
  };

  const handleCreateOrderDirectly = () => {
    if (!selectedFilament) {
      showWarning('Выберите филамент для 3D-печати', 'Внимание');
      return;
    }
    const printHoursVal = (parseInt(days) || 0) * 24 + (parseInt(hours) || 0) + (parseInt(minutes) || 0) / 60;
    const printDays = Math.floor(printHoursVal / 24);
    const leadTimeDays = Math.max(1, printDays + 2);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + leadTimeDays);
    const deadlineStr = `${String(targetDate.getDate()).padStart(2, '0')}.${String(targetDate.getMonth() + 1).padStart(2, '0')}.${targetDate.getFullYear()}`;

    const costItems: Array<{ id: string; category: string; amount: number }> = [];
    if (result.materialCost > 0) {
      costItems.push({ id: 'c-mat', category: `Нить (${selectedFilament.name})`, amount: Math.round(result.materialCost * 100) / 100 });
    }
    if (result.electricityCost > 0 || result.depreciationCost > 0) {
      costItems.push({ id: 'c-print', category: 'Электроэнергия и амортизация', amount: Math.round((result.electricityCost + result.depreciationCost) * 100) / 100 });
    }
    if (result.defectCost > 0) {
      costItems.push({ id: 'c-defect', category: 'Брак и тесты', amount: Math.round(result.defectCost * 100) / 100 });
    }
    if (result.laborCost > 0 && !calcIsOwnerLabor) {
      costItems.push({ id: 'c-labor', category: 'Работа мастера', amount: Math.round(result.laborCost * 100) / 100 });
    }
    (calcCustomCostItems || []).filter(i => i.isEnabled && i.amount > 0).forEach((ci, idx) => {
      costItems.push({
        id: `c-cust-${idx}`,
        category: ci.name,
        amount: Math.round((ci.isPerUnit ? ci.amount * (parseInt(quantity) || 1) : ci.amount) * 100) / 100,
      });
    });

    const safeQty = parseInt(quantity) || 1;
    const draftTitle = `3D-печать: ${selectedFilament.name} (${weightG || 0}г)`;

    const draft = {
      title: draftTitle,
      quantity: safeQty,
      base_amount: result.totalFinalPrice,
      amount: result.totalFinalPrice,
      cost: result.totalBaseCost,
      cost_items: costItems.length > 0 ? costItems : [{ id: 'init-1', category: 'Печать', amount: result.totalBaseCost }],
      deadline: deadlineStr,
      notes: `Пластик: ${selectedFilament.name}${selectedFilament.color ? ` (${selectedFilament.color})` : ''}, Вес: ${weightG || 0}г, Время: ${hours || 0}ч ${minutes || 0}м, Принтер: ${selectedPrinter?.name || 'Основной'}`,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('draft_order_from_product', JSON.stringify(draft));
    }
    router.push('/orders');
  };

  const handleSaveCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calculationName.trim() || isSubmitting) return;

    const parsedTags = calculationTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const chosenCol = selectedCollectionId !== 'none' ? collections.find(c => c.id === selectedCollectionId) : undefined;

      await addSavedCalculation({
        name: calculationName.trim(),
        category: calculationCategory,
        tags: parsedTags,
        stock_quantity: parseInt(stockQuantity) || 0,
        collection_id: chosenCol ? chosenCol.id : undefined,
        collection_name: chosenCol ? chosenCol.name : undefined,
        filament_name: selectedFilament?.name || 'Не выбран',
        filament_color: selectedFilament?.color || '#ffffff',
        printer_name: selectedPrinter?.name || 'Не выбран',
        weight_g: parseFloat(weightG) || 0,
        hours: (parseInt(days) || 0) * 24 + (parseInt(hours) || 0),
        minutes: parseInt(minutes) || 0,
        quantity: parseInt(quantity) || 1,
        base_cost: result.totalBaseCost,
        final_price: result.totalFinalPrice,

        filament_id: filamentId || undefined,
        printer_id: printerId || undefined,
        labor_minutes: parseInt(currentLaborMinutes) || undefined,
        labor_rate_per_hour: parseFloat(currentLaborRate) || undefined,
        is_owner_labor: calcIsOwnerLabor,
        is_labor_per_unit: calcIsLaborPerUnit,
        markup_percent: parseFloat(currentMarkup) || undefined,
        defect_percent: parseFloat(currentDefect) || undefined,
        discount_percent: calcDiscountType === 'percent' && parseFloat(calcDiscountValue) > 0 ? parseFloat(calcDiscountValue) : undefined,
        discount_amount: calcDiscountType === 'fixed' && parseFloat(calcDiscountValue) > 0 ? parseFloat(calcDiscountValue) : undefined,
        urgency_percent: calcUrgencyType === 'percent' && parseFloat(calcUrgencyValue) > 0 ? parseFloat(calcUrgencyValue) : undefined,
        urgency_amount: calcUrgencyType === 'fixed' && parseFloat(calcUrgencyValue) > 0 ? parseFloat(calcUrgencyValue) : undefined,
        custom_cost_items: calcCustomCostItems && calcCustomCostItems.length > 0 ? calcCustomCostItems : undefined,

        stl_url: stlUrl.trim() || undefined,
        stl_file_name: stlFileName || undefined,
        stl_file_data: stlFileData || undefined,
      });
      showSuccess(`Товар «${calculationName.trim()}» успешно сохранен в каталог!`, 'Товар создан');
      setIsSaveModalOpen(false);
      setCalculationName('');
      setCalculationCategory('Разное');
      setCalculationTags('');
      setSelectedCollectionId('none');
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOnline) {
      showWarning(
        'Загрузка локальных файлов STL доступна только при активном подключении к сети. Используйте ссылку на 3D-модель или проверьте соединение.',
        'Требуется подключение'
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

  const markupRatio = (1 + (parseFloat(currentMarkup) || 100) / 100).toFixed(1);

  return (
    <div className="w-full max-w-[1500px] mx-auto select-none font-sans">

      {/* 1. ГЛАВНОЕ ОКНО КОНСОЛИ (MERIDIAN COCKPIT CONTAINER) */}
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">

        {/* Верхняя панель: реальная полезная информация мастерской и телеметрия */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 px-4 py-3 bg-neutral-900/60 gap-3">
          {/* Левая часть: Статус узла и синхронизация */}
          <div className="flex items-center gap-3">
            {/* Точки терминала */}
            <div className="flex items-center gap-1.5">
              <Tooltip content="Закрыть калькулятор и перейти на главную">
                <button
                  type="button"
                  onClick={() => curtainNavigate('/')}
                  className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40 hover:bg-red-500 cursor-pointer outline-none shadow-sm shadow-red-500/30"
                />
              </Tooltip>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-400/40 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40 inline-block" />
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-white/10 font-mono text-xs text-neutral-300">
              <span className="text-white font-bold">KUMO-CRM</span>
              <span className="text-neutral-600">{'//'}</span>
              <span className="text-neutral-400 hidden sm:inline">КАЛЬКУЛЯТОР</span>

              {isOnline ? (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                  Offline
                </span>
              )}
            </div>
          </div>

          {/* Правая часть: Тариф и Кнопка сброса */}
          <div className="flex items-center gap-2.5 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-lg">
              <Zap className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-neutral-400">Тариф:</span>
              <span className="text-white font-bold">{settings?.electricity_rate || 5.5} {currencySymbol}/кВт·ч</span>
              <CustomTooltip
                title="Тариф электроэнергии"
                description="Стоимость 1 кВт·ч для вашей мастерской. Задается в Настройках."
                formula="Ток(₽) = Время(ч) × (Мощность(Вт) / 1000) × Тариф"
                accentColor="cyan"
                align="right"
              >
                <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white ml-0.5 shrink-0 cursor-help" />
              </CustomTooltip>
            </div>

            <CockpitButton
              icon={RotateCcw}
              onClick={resetCalculator}
              title="Сбросить введенные параметры к значениям по умолчанию"
            >
              Сбросить
            </CockpitButton>
          </div>
        </div>

        {/* 2. ТЕЛО КАЛЬКУЛЯТОРА С АНИМАЦИЕЙ ПЕРЕХОДА */}
        <CockpitContentTransition>
          <div className="p-5 sm:p-6 bg-gradient-to-b from-neutral-950 to-neutral-900/90">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

            {/* ===================== ЛЕВАЯ КОЛОНКА ===================== */}
            <div className="space-y-3.5 w-full">

              {/* Шапка левой колонки */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider">
                  ПАРАМЕТРЫ ПЕЧАТИ ДЕТАЛИ
                </span>

                {/* Выбор принтера в точности по скриншоту */}
                <CockpitDropdown
                  value={printerId || (printers.length > 0 ? printers[0].id : '')}
                  onChange={(val) => setPrinterId(val)}
                  footerText={`${printers.length} ПРИНТЕРОВ · ${printers.length} ОНЛАЙН`}
                  options={printers.map((p) => ({
                    value: p.id,
                    label: p.name,
                    badge: `${p.power_w || 350}W`,
                    statusDotColor: 'green',
                  }))}
                  variant="ghost"
                  align="right"
                  placeholder="Выбрать принтер"
                />
              </div>

              {/* 4 Карточки параметров */}
              <div className="grid grid-cols-2 gap-3">

                {/* 1. Вес детали */}
                <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 p-3.5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-neutral-400 block">Вес детали (грамм)</label>
                      <CustomTooltip
                        title="Расход и стоимость материала"
                        description="Прямой расход филамента или смолы на изготовление детали."
                        formula="Материал(₽) = Вес(г) × (Цена катушки / Вес катушки)"
                        accentColor="cyan"
                        align="left"
                      >
                        <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white shrink-0 cursor-help" />
                      </CustomTooltip>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <input
                        type="number"
                        min="0"
                        max="999999"
                        step="any"
                        value={weightG}
                        onChange={(e) => setWeightG(e.target.value)}
                        placeholder="0"
                        style={{ width: `${Math.max(1, String(weightG || '').length) + 0.3}ch` }}
                        className="text-xl sm:text-2xl font-bold font-mono text-white bg-transparent focus:outline-none min-w-[1.5ch]"
                      />
                      <span className="text-sm font-mono text-neutral-400">г</span>
                    </div>
                  </div>

                  {/* Селектор пластика под весом */}
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <CockpitDropdown
                        value={filamentId}
                        onChange={(val) => setFilamentId(val)}
                        footerText={`${filaments.length} КАТУШЕК · В НАЛИЧИИ`}
                        options={filaments.map((f) => {
                          const priceG = f.weight_g > 0 ? (f.price / f.weight_g).toFixed(1) : '0';
                          return {
                            value: f.id,
                            label: f.name,
                            color: f.color,
                            badge: `${priceG} ₽/Г`,
                          };
                        })}
                        variant="card"
                        align="left"
                        dropdownWidth={330}
                        placeholder="Выбрать пластик..."
                      />
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold shrink-0">
                      {pricePerGram.toFixed(1)} ₽/г
                    </span>
                  </div>
                </div>

                {/* 2. Время печати */}
                <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 p-3.5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-neutral-400 block">Время печати</label>
                      <CustomTooltip
                        title="Время печати и тираж"
                        description="Длительность работы 3D-принтера для изготовления всей партии изделий."
                        formula="Всего часов = ((Дни × 24) + Часы + Минуты / 60) × Тираж"
                        accentColor="cyan"
                        align="left"
                      >
                        <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white shrink-0 cursor-help" />
                      </CustomTooltip>
                    </div>
                    <div className="mt-1 flex items-baseline gap-0.5 sm:gap-1 font-mono text-base sm:text-2xl font-bold text-white whitespace-nowrap overflow-hidden">
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        placeholder="0"
                        style={{ width: `${Math.max(1, String(days || '').length) + 0.3}ch` }}
                        className="bg-transparent focus:outline-none min-w-[1.2ch]"
                      />
                      <span className="text-xs sm:text-sm font-normal text-neutral-400 mr-1 sm:mr-2">д</span>

                      <input
                        type="number"
                        min="0"
                        max="9999"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        placeholder="0"
                        style={{ width: `${Math.max(1, String(hours || '').length) + 0.3}ch` }}
                        className="bg-transparent focus:outline-none min-w-[1.2ch]"
                      />
                      <span className="text-xs sm:text-sm font-normal text-neutral-400 mr-1 sm:mr-2">ч</span>

                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={minutes}
                        onChange={(e) => {
                          const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                          setMinutes(e.target.value === '' ? '' : val.toString());
                        }}
                        placeholder="0"
                        style={{ width: `${Math.max(1, String(minutes || '').length) + 0.3}ch` }}
                        className="bg-transparent focus:outline-none min-w-[1.2ch]"
                      />
                      <span className="text-xs sm:text-sm font-normal text-neutral-400">мин</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-500 font-mono">
                    <span>Тираж партии:</span>
                    <div className="flex items-center gap-1 text-white font-bold">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, (parseInt(quantity) || 1) - 1).toString())}
                        className="hover:text-cyan-400 px-1"
                      >
                        -
                      </button>
                      <span>{quantity} шт</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(((parseInt(quantity) || 1) + 1).toString())}
                        className="hover:text-cyan-400 px-1"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Электроэнергия + Износ */}
                <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 p-3.5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-neutral-400 block">Электроэнергия + Износ</label>
                      <CustomTooltip
                        title="Энергия и амортизация оборудования"
                        description="Почасовые затраты на электроэнергию и износ принтера (сопла, ремни, кинематика)."
                        formula="В час = (Мощность / 1000 × Тариф) + (Цена принтера / Ресурс принтера ч)"
                        accentColor="cyan"
                        align="left"
                      >
                        <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white shrink-0 cursor-help" />
                      </CustomTooltip>
                    </div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold font-mono text-white">
                      {electricityAndDeprecPerHour > 0 ? electricityAndDeprecPerHour.toFixed(0) : '185'} ₽ / час
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono mt-2 pt-2 border-t border-white/5 block">
                    Мощность {selectedPrinter?.power_w || 350}W + сопло
                  </span>
                </div>

                {/* 4. Коэффициент наценки */}
                <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 p-3.5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-neutral-400 block">Коэффициент наценки</label>
                      <CustomTooltip
                        title="Торговая наценка (Markup)"
                        description="Коэффициент наценки на прямые затраты печати для формирования розничной цены."
                        formula="Цена печати = Себестоимость печати × (1 + Наценка% / 100)"
                        align="left"
                      >
                        <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white shrink-0 cursor-help" />
                      </CustomTooltip>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                        {markupRatio}x (+{currentMarkup}%)
                      </span>
                    </div>
                  </div>

                  {/* Быстрые кнопки переключения наценки */}
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-neutral-500">Пресет:</span>
                    <div className="flex gap-1">
                      {[50, 100, 180, 250].map((mVal) => (
                        <button
                          key={mVal}
                          type="button"
                          onClick={() => setCalcMarkup(mVal.toString())}
                          className={`px-1.5 py-0.2 rounded ${
                            parseInt(currentMarkup) === mVal ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-neutral-500 hover:text-white'
                          }`}
                        >
                          +{mVal}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* ================= 2. СЕКЦИЯ: ПОСТ-ОБРАБОТКА И ДОП. РАСХОДЫ ================= */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2 pt-2">
                <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider">
                  ПОСТ-ОБРАБОТКА И ДОП. РАСХОДЫ
                </span>
                <span className="font-mono text-xs text-cyan-400 font-bold">
                  +{formatCurrency(result.defectCost + result.laborCost + result.customCostsTotal, currencySymbol)}
                </span>
              </div>

              {/* Карточки труда и брака */}
              <div className="grid grid-cols-2 gap-3">
                {/* 5. Ручной труд мастера */}
                <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 p-3.5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-mono text-neutral-400 block">Ручной труд</label>
                        <CustomTooltip
                          title="Оплата ручного труда"
                          description="Стоимость времени на снятие поддержек, пост-обработку и проверку детали. Личный труд переходит в чистую прибыль."
                          formula="Труд(₽) = (Минуты / 60) × Ставка за час"
                          accentColor="emerald"
                          align="left"
                        >
                          <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white shrink-0 cursor-help" />
                        </CustomTooltip>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {calcLaborRate !== '' ? calcLaborRate : defaultLaborRateValue} {currencySymbol}/ч
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <input
                        type="number"
                        min="0"
                        max="9999"
                        value={currentLaborMinutes}
                        onChange={(e) => setCalcLaborMinutes(e.target.value)}
                        placeholder="0"
                        style={{ width: `${Math.max(1, String(currentLaborMinutes || '').length) + 0.3}ch` }}
                        className="text-xl sm:text-2xl font-bold font-mono text-white bg-transparent focus:outline-none min-w-[1.5ch]"
                      />
                      <span className="text-sm font-mono text-neutral-400">мин</span>
                      {result.laborCost > 0 && (
                        <span className="text-xs font-mono text-cyan-400 font-bold ml-auto shrink-0 truncate">
                          +{formatCurrency(result.laborCost, currencySymbol)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Переключение типа труда */}
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-neutral-500">Доход:</span>
                    <Tooltip content={calcIsOwnerLabor ? 'Стоимость работы идет в чистую прибыль' : 'Стоимость работы идет в расходную себестоимость'}>
                      <button
                        type="button"
                        onClick={() => setCalcIsOwnerLabor(!calcIsOwnerLabor)}
                        className={`px-1.5 py-0.5 rounded cursor-pointer text-[10px] ${
                          calcIsOwnerLabor
                            ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                            : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
                        }`}
                      >
                        {calcIsOwnerLabor ? 'В прибыль' : 'В себестоимость'}
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* 6. Технологический брак */}
                <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 p-3.5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-mono text-neutral-400 block">Технологический брак</label>
                        <CustomTooltip
                          title="Закладка на брак и перепечать"
                          description="Процент на покрытие тестовых прогонов, срывов слоев и технологического брака."
                          formula="Брак(₽) = (Пластик + Ток + Амортизация) × (Брак% / 100)"
                          align="left"
                        >
                          <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white shrink-0 cursor-help" />
                        </CustomTooltip>
                      </div>
                      {result.defectCost > 0 && (
                        <span className="text-xs font-mono text-cyan-400 font-bold shrink-0 truncate">
                          +{formatCurrency(result.defectCost, currencySymbol)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={calcDefect !== '' ? calcDefect : defaultDefectValue.toString()}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                          setCalcDefect(e.target.value === '' ? '' : val.toString());
                        }}
                        placeholder="0"
                        style={{ width: `${Math.max(1, String(calcDefect !== '' ? calcDefect : defaultDefectValue).length) + 0.3}ch` }}
                        className="text-xl sm:text-2xl font-bold font-mono text-white bg-transparent focus:outline-none min-w-[1.5ch]"
                      />
                      <span className="text-sm font-mono text-neutral-400">%</span>
                    </div>
                  </div>

                  {/* Пресеты брака */}
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-neutral-500">Пресет:</span>
                    <div className="flex gap-1">
                      {[0, 5, 10, 15].map((dVal) => (
                        <button
                          key={dVal}
                          type="button"
                          onClick={() => setCalcDefect(dVal.toString())}
                          className={`px-1.5 py-0.2 rounded cursor-pointer ${
                            parseInt(currentDefect) === dVal
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                              : 'text-neutral-500 hover:text-white'
                          }`}
                        >
                          {dVal}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. Дополнительные услуги и расходы */}
              <div className="bg-white/[0.03] border border-white/10 hover:border-white/20 p-3.5 rounded-xl space-y-3.5">
                {/* Шапка карточки */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-mono text-neutral-400 block uppercase tracking-wider">
                      Дополнительные услуги и опции
                    </label>
                    <CustomTooltip
                      title="Дополнительные услуги и опции"
                      description="Упаковка, доставка, покраска, фурнитура и моделирование с расчетом за заказ или за шт."
                      formula="Услуги(₽) = Сумма(за заказ) + Сумма(за шт × Тираж)"
                      align="left"
                    >
                      <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white shrink-0 cursor-help" />
                    </CustomTooltip>
                    {calcCustomCostItems.length > 0 && (
                      <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.2 rounded">
                        {calcCustomCostItems.length} активн.
                      </span>
                    )}
                  </div>
                  {result.customCostsTotal > 0 && (
                    <span className="text-xs font-mono text-cyan-400 font-bold">
                      +{formatCurrency(result.customCostsTotal, currencySymbol)}
                    </span>
                  )}
                </div>

                {/* Интерактивные чипы: раскрываются прямо на месте при активации */}
                <div className="flex flex-wrap gap-2 items-center font-mono">
                  {DEFAULT_COST_CATEGORIES.filter(c => c.id !== 'print').map((cat) => {
                    const activeItem = (calcCustomCostItems || []).find(i => i.id === cat.id);

                    if (activeItem) {
                      // Раскрытый активный чип в голубом стиле с редактированием цены прямо внутри
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center gap-1.5 p-1 px-2.5 rounded-lg text-xs font-mono border bg-cyan-950/40 border-cyan-500/40 text-cyan-300 shadow-sm "
                        >
                          <span className="font-bold flex items-center gap-1 text-cyan-300 shrink-0">
                            <span className="text-cyan-400">✓</span>
                            <span>{cat.name}</span>
                          </span>

                          {/* Поле редактирования цены */}
                          <div className="flex items-center gap-1 bg-neutral-950 border border-cyan-500/40 rounded px-1.5 py-0.5 focus-within:border-cyan-300 ">
                            <input
                              type="number"
                              min="0"
                              value={activeItem.amount || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setCalcCustomCostItems(prev => prev.map(i => i.id === cat.id ? { ...i, amount: val } : i));
                              }}
                              className="w-12 text-right bg-transparent text-white font-bold font-mono focus:outline-none text-xs"
                              placeholder="0"
                            />
                            <span className="text-neutral-400 text-[10px]">{currencySymbol}</span>
                          </div>

                          {/* Переключатель: за шт / за заказ */}
                          <Tooltip content={activeItem.isPerUnit ? 'Начисляется на каждую деталь (× тираж)' : 'Фиксированная цена на весь заказ'}>
                            <button
                              type="button"
                              onClick={() => {
                                setCalcCustomCostItems(prev => prev.map(i => i.id === cat.id ? { ...i, isPerUnit: !i.isPerUnit } : i));
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer font-bold ${
                                activeItem.isPerUnit
                                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50'
                                  : 'bg-neutral-900 text-cyan-400 border-cyan-500/30 hover:text-white'
                              }`}
                            >
                              {activeItem.isPerUnit ? 'за шт' : 'за заказ'}
                            </button>
                          </Tooltip>

                          {/* Кнопка закрыть / убрать */}
                          <Tooltip content="Убрать услугу">
                            <button
                              type="button"
                              onClick={() => {
                                setCalcCustomCostItems(prev => prev.filter(i => i.id !== cat.id));
                              }}
                              className="p-0.5 text-neutral-400 hover:text-rose-400 cursor-pointer ml-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      );
                    }

                    // Неактивный компактный чип
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCalcCustomCostItems(prev => [...(prev || []), {
                            id: cat.id,
                            name: cat.name,
                            amount: cat.defaultAmount ?? 100,
                            isPerUnit: cat.isPerUnit ?? false,
                            isEnabled: true
                          }]);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs border cursor-pointer flex items-center gap-1 bg-white/[0.02] hover:bg-white/[0.06] text-neutral-400 border-white/10 hover:border-white/20 hover:text-white"
                      >
                        <span>+</span>
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}

                  {/* Пользовательские добавленные расходы (вне дефолтных категорий) */}
                  {(calcCustomCostItems || []).filter(item => !DEFAULT_COST_CATEGORIES.some(cat => cat.id === item.id)).map((customItem) => (
                    <div
                      key={customItem.id}
                      className="flex items-center gap-1.5 p-1 px-2.5 rounded-lg text-xs font-mono border bg-cyan-950/40 border-cyan-500/40 text-cyan-300 shadow-sm "
                    >
                      <span className="font-bold flex items-center gap-1 text-cyan-300 shrink-0">
                        <span className="text-cyan-400">✓</span>
                        <span>{customItem.name}</span>
                      </span>

                      <div className="flex items-center gap-1 bg-neutral-950 border border-cyan-500/40 rounded px-1.5 py-0.5 focus-within:border-cyan-300 ">
                        <input
                          type="number"
                          min="0"
                          value={customItem.amount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setCalcCustomCostItems(prev => prev.map(i => i.id === customItem.id ? { ...i, amount: val } : i));
                          }}
                          className="w-12 text-right bg-transparent text-white font-bold font-mono focus:outline-none text-xs"
                          placeholder="0"
                        />
                        <span className="text-neutral-400 text-[10px]">{currencySymbol}</span>
                      </div>

                      <Tooltip content={customItem.isPerUnit ? 'Начисляется на каждую деталь (× тираж)' : 'Фиксированная цена на весь заказ'}>
                        <button
                          type="button"
                          onClick={() => {
                            setCalcCustomCostItems(prev => prev.map(i => i.id === customItem.id ? { ...i, isPerUnit: !i.isPerUnit } : i));
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer font-bold ${
                            customItem.isPerUnit
                              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50'
                              : 'bg-neutral-900 text-cyan-400 border-cyan-500/30 hover:text-white'
                          }`}
                        >
                          {customItem.isPerUnit ? 'за шт' : 'за заказ'}
                        </button>
                      </Tooltip>

                      <Tooltip content="Удалить расход">
                        <button
                          type="button"
                          onClick={() => {
                            setCalcCustomCostItems(prev => prev.filter(i => i.id !== customItem.id));
                          }}
                          className="p-0.5 text-neutral-400 hover:text-rose-400 cursor-pointer ml-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                  ))}

                  {/* Кнопка добавления своего произвольного расхода */}
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomCost(!isAddingCustomCost)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs border cursor-pointer flex items-center gap-1 font-mono ${
                      isAddingCustomCost
                        ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 font-bold'
                        : 'bg-white/[0.02] hover:bg-white/[0.06] text-neutral-300 border-dashed border-white/20 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Свой расход</span>
                  </button>
                </div>

                {/* Форма добавления нового расхода */}
                {isAddingCustomCost && (
                  <MotionRevealDiv className="p-3 bg-neutral-900/90 border border-cyan-500/30 rounded-xl space-y-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-white/10 pb-1.5">
                      <span className="font-bold text-cyan-300">{'// НОВЫЙ РАСХОД'}</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomCost(false)}
                        className="text-neutral-500 hover:text-white "
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        placeholder="Название (напр. Гравировка)"
                        value={newCostName}
                        onChange={(e) => setNewCostName(e.target.value)}
                        className="sm:col-span-6 h-8 bg-neutral-950 border border-white/15 rounded-lg px-2.5 text-white focus:outline-none focus:border-cyan-400"
                      />
                      <div className="sm:col-span-3 flex items-center bg-neutral-950 border border-white/15 rounded-lg px-2.5 h-8">
                        <input
                          type="number"
                          min="0"
                          placeholder="Сумма"
                          value={newCostAmount}
                          onChange={(e) => setNewCostAmount(e.target.value)}
                          className="w-full bg-transparent text-white text-right font-bold focus:outline-none"
                        />
                        <span className="text-neutral-500 text-xs ml-1">{currencySymbol}</span>
                      </div>
                      <div className="sm:col-span-3 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewCostIsPerUnit(!newCostIsPerUnit)}
                          className={`flex-1 h-8 rounded-lg text-[10px] border cursor-pointer font-bold ${
                            newCostIsPerUnit ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-neutral-950 text-neutral-400 border-white/15 hover:text-white'
                          }`}
                        >
                          {newCostIsPerUnit ? 'за шт' : 'за заказ'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newCostName.trim()) return;
                            const newId = `custom_${Date.now()}`;
                            setCalcCustomCostItems(prev => [...(prev || []), {
                              id: newId,
                              name: newCostName.trim(),
                              amount: parseFloat(newCostAmount) || 0,
                              isPerUnit: newCostIsPerUnit,
                              isEnabled: true
                            }]);
                            setNewCostName('');
                            setNewCostAmount('100');
                            setNewCostIsPerUnit(false);
                            setIsAddingCustomCost(false);
                          }}
                          className="px-3 h-8 bg-cyan-400 text-neutral-950 font-bold rounded-lg hover:bg-cyan-300 cursor-pointer text-xs shrink-0"
                        >
                          Добавить
                        </button>
                      </div>
                    </div>
                  </MotionRevealDiv>
                )}
              </div>

            </div>

            {/* ===================== ПРАВАЯ КОЛОНКА: ЧЕК (MUTED MATTE RECEIPT) ===================== */}
            <div className="w-full">
              <div className="w-full bg-[var(--cockpit-accent-color,#D2CCBB)] text-neutral-950 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-none p-5 relative overflow-hidden flex flex-col justify-between space-y-4 select-none">

              <div>
                {/* 1. Верхняя шапка чека */}
                <div className="flex items-center justify-between font-mono text-[11px] text-neutral-700 tracking-wider font-medium">
                  <span className="font-bold text-neutral-900">KUMO CRM · PRODUCTION</span>
                  <span>№ KUMO-CALC-2026</span>
                </div>

                {/* Пунктирный разделитель */}
                <div className="border-b border-dashed border-neutral-600/30 my-2.5" />

                {/* 2. Заголовок чека */}
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-neutral-950 leading-tight">
                      {parseInt(quantity) > 1 ? `Тираж: ${quantity} шт.` : 'Расчет стоимости'}
                    </h3>
                    {parseInt(quantity) > 1 && (
                      <span className="text-xs font-mono font-bold text-neutral-800 whitespace-nowrap tabular-nums shrink-0">
                        ~{formatCurrency(result.totalFinalPrice / Math.max(1, parseInt(quantity) || 1), currencySymbol)}/шт.
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-700 font-mono mt-0.5">
                    {selectedPrinter?.name || '3D Принтер'} · {filaments.find(f => f.id === filamentId)?.name || 'Пластик'}
                  </p>
                </div>

                {/* 3. Секция INCLUDES с точечными линиями-лидерами */}
                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-600 block">
                    INCLUDES
                  </span>

                  <div className="space-y-1.5 text-xs font-mono text-neutral-800">
                    <div className="flex items-baseline justify-between">
                      <span className="shrink-0">• Пластик ({weightG || 0} г)</span>
                      <span className="flex-1 mx-2 border-b border-dotted border-neutral-600/40" />
                      <span className="font-bold text-neutral-950 shrink-0 whitespace-nowrap tabular-nums">{formatCurrency(result.materialCost, currencySymbol)}</span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="shrink-0">• Амортизация ({totalPrintHours.toFixed(2)} ч)</span>
                      <span className="flex-1 mx-2 border-b border-dotted border-neutral-600/40" />
                      <span className="font-bold text-neutral-950 shrink-0 whitespace-nowrap tabular-nums">{formatCurrency(result.depreciationCost, currencySymbol)}</span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="shrink-0">• Электроэнергия ({powerKwH.toFixed(2)} кВт·ч)</span>
                      <span className="flex-1 mx-2 border-b border-dotted border-neutral-600/40" />
                      <span className="font-bold text-neutral-950 shrink-0 whitespace-nowrap tabular-nums">{formatCurrency(result.electricityCost, currencySymbol)}</span>
                    </div>

                    {result.defectCost > 0 && (
                      <div className="flex items-baseline justify-between">
                        <span className="shrink-0">• Закладка на брак ({currentDefect}%)</span>
                        <span className="flex-1 mx-2 border-b border-dotted border-neutral-600/40" />
                        <span className="font-bold text-neutral-950 shrink-0 whitespace-nowrap tabular-nums">+{formatCurrency(result.defectCost, currencySymbol)}</span>
                      </div>
                    )}

                    {result.laborCost > 0 && (
                      <div className="flex items-baseline justify-between">
                        <span className="shrink-0">• Ручной труд ({currentLaborMinutes} мин)</span>
                        <span className="flex-1 mx-2 border-b border-dotted border-neutral-600/40" />
                        <span className="font-bold text-neutral-950 shrink-0 whitespace-nowrap tabular-nums">+{formatCurrency(result.laborCost, currencySymbol)}</span>
                      </div>
                    )}

                    {/* Дополнительные услуги */}
                    {result.customCostsBreakdown.map((item) => (
                      <div key={item.id} className="flex items-baseline justify-between">
                        <span className="shrink-0 text-cyan-950 font-semibold">• {item.name}</span>
                        <span className="flex-1 mx-2 border-b border-dotted border-neutral-600/40" />
                        <span className="font-bold text-cyan-950 shrink-0 whitespace-nowrap tabular-nums">+{formatCurrency(item.totalAmount, currencySymbol)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Перфорация с крупными выразительными вырезами чека (Ticket Punch Notches) */}
                <div className="relative my-4 -mx-5 sm:-mx-6 flex items-center">
                  {/* Левый полукруглый вырез */}
                  <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0a0a0a] pointer-events-none z-10" />
                  {/* Правый полукруглый вырез */}
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0a0a0a] pointer-events-none z-10" />
                  {/* Перфорированная линия */}
                  <div className="border-b border-dashed border-neutral-600/40 w-full" />
                </div>

                {/* 5. Финансовая сводка (Subtotal / Наценка / Скидка) */}
                <div className="space-y-1.5 text-xs font-mono text-neutral-700">
                  <div className="flex justify-between">
                    <span>Себестоимость (база):</span>
                    <span className="font-bold text-neutral-950 whitespace-nowrap tabular-nums">{formatCurrency(result.totalBaseCost, currencySymbol)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Наценка ({markupRatio}x / +{currentMarkup}%):</span>
                    <span className="text-neutral-950 font-medium whitespace-nowrap tabular-nums">+{formatCurrency(Math.max(0, result.totalFinalPrice - result.totalBaseCost), currencySymbol)}</span>
                  </div>

                  {result.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-900 font-bold">
                      <span>Скидка на тираж:</span>
                      <span className="whitespace-nowrap tabular-nums">-{formatCurrency(result.discountTotal, currencySymbol)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[11px] text-neutral-700 pt-0.5">
                    <span>Чистая прибыль:</span>
                    <span className="font-bold text-emerald-900 whitespace-nowrap tabular-nums">+{formatCurrency(result.profitTotal, currencySymbol)} ({result.marginPercent}%)</span>
                  </div>

                  {parseInt(quantity) > 1 && (
                    <div className="flex justify-between text-neutral-950 font-bold pt-1 border-t border-neutral-600/20">
                      <span>Цена за 1 шт.:</span>
                      <span className="whitespace-nowrap tabular-nums">{formatCurrency(result.totalFinalPrice / Math.max(1, parseInt(quantity) || 1), currencySymbol)} / шт.</span>
                    </div>
                  )}
                </div>

                {/* 6. Итого к оплате (Крупный блок с ценой) */}
                <div className="pt-3 border-t border-neutral-500/40 mt-3 flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-mono font-bold tracking-wider text-neutral-700 uppercase">
                      ИТОГО К ОПЛАТЕ
                    </span>
                    <CustomTooltip
                      title="Итоговая расчетная цена"
                      description="Окончательная расчетная стоимость для клиента с учетом себестоимости, наценки, труда, услуг и скидок."
                      formula="Цена = (Печать × Наценка + Труд + Услуги) + Срочность − Скидка"
                      accentColor="neutral"
                      align="right"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-neutral-600 hover:text-neutral-950 shrink-0 cursor-help" />
                    </CustomTooltip>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-neutral-950 tracking-tight whitespace-nowrap tabular-nums">
                      {formatCurrency(result.totalFinalPrice, currencySymbol)}
                    </div>
                    <div className="text-[10.5px] font-mono text-neutral-700 block font-bold whitespace-nowrap tabular-nums">
                      {parseInt(quantity) > 1
                        ? `${formatCurrency(result.totalFinalPrice / Math.max(1, parseInt(quantity) || 1), currencySymbol)} / шт. (за ${quantity} шт.)`
                        : 'за 1 шт.'}
                    </div>
                  </div>
                </div>

                {/* 7. Подвал чека: Аутентификация и штрихкод */}
                <div className="border-b border-dashed border-neutral-600/35 my-3" />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600 font-medium">
                    <span>AUTH · 0XKUMOCRM2026</span>
                    <span>CLIENT · ESTIMATE</span>
                  </div>

                  {/* Штрихкод */}
                  <div className="flex items-center justify-center gap-[2px] h-6 py-0.5">
                    {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2].map((w, i) => (
                      <div key={i} className="bg-neutral-950 h-full rounded-[0.5px]" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* 8. Кнопки действий чека */}
              <div className="space-y-2 font-mono pt-1">
                <button
                  type="button"
                  onClick={handleCreateOrderDirectly}
                  disabled={!filamentId || filaments.length === 0}
                  className="w-full py-3 rounded-full bg-neutral-950 text-white hover:bg-neutral-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>В Заказы (Оформить)</span>
                </button>

                {/* Кнопка экспорта чека для покупателя (PNG / PDF) */}
                <button
                  type="button"
                  onClick={() => setIsClientReceiptOpen(true)}
                  disabled={!filamentId || filaments.length === 0}
                  className="w-full py-2.5 rounded-xl bg-neutral-950/10 hover:bg-neutral-950/20 border border-neutral-950/30 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Чек для клиента (PNG / PDF)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleOpenSaveModal}
                    disabled={!filamentId || filaments.length === 0}
                    className="py-2 rounded-xl bg-neutral-300/70 hover:bg-neutral-300 border border-neutral-400/80 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Package className="w-3.5 h-3.5 text-neutral-700" />
                    <span>В Каталог</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyClientMessage}
                    disabled={!filamentId || filaments.length === 0}
                    className={`py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      copied
                        ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                        : 'bg-neutral-300/70 hover:bg-neutral-300 text-neutral-950 border-neutral-400/80'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-neutral-700" />}
                    <span>{copied ? 'Скопировано!' : 'Копировать КП'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          </div>
        </div>
        </CockpitContentTransition>

        {/* 3. ПОДВАЛ КОНСОЛИ (В ТОЧНОСТИ КАК НА СКРИНШОТЕ) */}
        <div className="border-t border-white/10 px-5 py-2.5 bg-neutral-950 flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <div className="flex items-center gap-3">
            <span>DATABASE: {isOnline ? 'CONNECTED' : 'OFFLINE'}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">CACHE: SYNCED</span>
          </div>
          <div>FPS: 60 · RESPONSE: 18ms</div>
        </div>

      </div>

      {/* МОДАЛЬНОЕ ОКНО ЧЕКА ДЛЯ КЛИЕНТА (PNG / PDF) */}
      <ClientReceiptModal
        isOpen={isClientReceiptOpen}
        onClose={() => setIsClientReceiptOpen(false)}
        quantity={quantity}
        weightG={weightG}
        printerName={selectedPrinter?.name || '3D-печать'}
        filamentName={filaments.find(f => f.id === filamentId)?.name || 'Пластик'}
        currencySymbol={currencySymbol}
        result={result}
      />

      {/* МОДАЛЬНОЕ ОКНО СОХРАНЕНИЯ В КАТАЛОГ */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSaveModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-neutral-950 border border-white/15 rounded-2xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3 font-mono text-xs text-neutral-400">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSaveModalOpen(false)}
                    aria-label="Закрыть окно"
                    className="w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#f87171] cursor-pointer border-none outline-none shrink-0 transition-colors"
                  />
                  <span className="text-neutral-300">Сохранение в каталог</span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white">Сохранить расчет в каталог товаров</h3>

              <form onSubmit={handleSaveCalculation} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">Название изделия</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="напр. Корпус прибора (ABS)"
                    value={calculationName}
                    onChange={(e) => setCalculationName(e.target.value)}
                    className="w-full h-10 bg-neutral-900 border border-white/15 rounded-xl px-3 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <CockpitDropdown
                    label="Категория"
                    footerText={`${categoriesList.length} КАТЕГОРИЙ`}
                    value={calculationCategory}
                    onChange={(val) => setCalculationCategory(val)}
                    options={categoriesList.map((cat) => ({
                      value: cat.id,
                      label: cat.label,
                    }))}
                    variant="input"
                    placeholder="Выберите категорию..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">Теги (через запятую)</label>
                  <input
                    type="text"
                    placeholder="PLA, Корпус, Дрон..."
                    value={calculationTags}
                    onChange={(e) => setCalculationTags(e.target.value)}
                    className="w-full h-10 bg-neutral-900 border border-white/15 rounded-xl px-3 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">Ссылка на 3D-модель</label>
                  <input
                    type="text"
                    placeholder="https://printables.com/..."
                    value={stlUrl}
                    onChange={(e) => setStlUrl(e.target.value)}
                    className="w-full h-10 bg-neutral-900 border border-white/15 rounded-xl px-3 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">Файл STL / 3MF</label>
                  <div className="flex items-center justify-between p-3 bg-neutral-900 border border-white/10 rounded-xl text-xs">
                    <span className="text-neutral-400 truncate">{stlFileName || 'Файл не выбран'}</span>
                    <label className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer">
                      Загрузить
                      <input type="file" accept=".stl,.3mf,.zip" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <CockpitButton
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Сохранение...' : 'Сохранить в каталог'}
                  </CockpitButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
