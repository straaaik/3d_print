'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../entities/model/DataProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { Select } from '../../shared/ui/Select';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { AnimatedPrice } from '../../shared/ui/AnimatedPrice';
import { calculateCost } from '../../features/calculate-cost/model/calculate';
import { formatCurrency } from '../../shared/lib/format';
import { CustomCostItem } from '../../shared/types';
import { productsTheme, ordersTheme } from '../../shared/theme';
import { 
  AlertCircle, 
  Plus, 
  Package, 
  Trash2, 
  Copy, 
  Check, 
  Upload, 
  FileCode, 
  ExternalLink, 
  Calculator as CalculatorIcon, 
  Tag, 
  Folder, 
  RotateCcw,
  Sparkles,
  Wrench,
  Layers,
  ChevronDown,
  ChevronUp,
  Percent,
  X,
  HelpCircle,
  ShoppingBag,
  Scale,
  ShieldAlert,
  Flame,
  SlidersHorizontal,
  DollarSign,
  TrendingUp,
  Clock,
  Printer as PrinterIcon,
  CheckCircle2
} from 'lucide-react';
import { PageHeader } from '../../shared/ui/PageHeader';
import { CustomTooltip } from '../../shared/ui/Tooltip';
import { 
  getStoredCategories, 
  saveNewCategory, 
  ProductCategory, 
  getCategoryLucideIcon, 
  AVAILABLE_CATEGORY_ICONS 
} from '../../shared/lib/categories';
import { DEFAULT_COST_CATEGORIES, getCategoryConfig, CostCategoryConfig } from '../../shared/lib/costCategories';

export function Calculator() {
  const router = useRouter();
  const { showWarning, showSuccess } = useToast();
  const { 
    isOnline,
    filaments, 
    printers, 
    settings, 
    collections,
    addCollection,
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
    calcLaborMinutes,
    setCalcLaborMinutes,
    calcLaborRate,
    setCalcLaborRate,
    calcMarkup,
    setCalcMarkup,
    calcDefect,
    setCalcDefect,
    calcIsOwnerLabor,
    setCalcIsOwnerLabor,
    calcIsLaborPerUnit,
    setCalcIsLaborPerUnit,
    calcDiscountType,
    setCalcDiscountType,
    calcDiscountValue,
    setCalcDiscountValue,
    calcUrgencyType,
    setCalcUrgencyType,
    calcUrgencyValue,
    setCalcUrgencyValue,
    calcCustomCostItems,
    setCalcCustomCostItems,
    resetCalculator
  } = useData();

  // Состояние формы сохранения в каталог
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [calculationName, setCalculationName] = useState('');
  const [calculationCategory, setCalculationCategory] = useState<string>('Разное');
  const [calculationTags, setCalculationTags] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');

  // Состояние выбора и создания коллекции при сохранении
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('none');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Состояние создания новой категории
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');

  // Добавление произвольного расхода
  const [isAddingCustomCost, setIsAddingCustomCost] = useState(false);
  const [newCostName, setNewCostName] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('100');
  const [newCostIsPerUnit, setNewCostIsPerUnit] = useState(false);

  // Сворачиваемые блоки
  const [isCommercialOpen, setIsCommercialOpen] = useState(false);
  const [isDetailedBreakdownOpen, setIsDetailedBreakdownOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stlUrl, setStlUrl] = useState('');
  const [stlFileName, setStlFileName] = useState('');
  const [stlFileData, setStlFileData] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCategoriesList(getStoredCategories());
  }, []);

  useEffect(() => {
    if (isSaveModalOpen) {
      setStockQuantity(quantity || '1');
    }
  }, [isSaveModalOpen, quantity]);

  // Установка дефолтов при загрузке данных
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

  // Константы и дефолты из настроек
  const currencySymbol = settings?.currency ?? '₽';
  const defaultMarkupValue = settings?.default_markup_percent ?? 100;
  const defaultDefectValue = settings?.default_defect_percent ?? 5;
  const defaultLaborRateValue = settings?.labor_rate_per_hour ?? 0;
  const defaultLaborMinutesValue = settings?.labor_time_minutes ?? 15;

  const currentLaborMinutes = calcLaborMinutes !== '' ? calcLaborMinutes : defaultLaborMinutesValue.toString();
  const currentLaborRate = calcLaborRate !== '' ? calcLaborRate : defaultLaborRateValue.toString();

  const selectedFilament = filaments.find(f => f.id === filamentId) || null;
  const selectedPrinter = printers.find(p => p.id === printerId) || null;

  // Расчет стоимости
  const result = useMemo(() => calculateCost({
    weightG: parseFloat(weightG) || 0,
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

  // Опции для селектов
  const filamentOptions = useMemo(() => {
    return filaments.map((f) => {
      const pricePerGram = f.weight_g > 0 ? f.price / f.weight_g : 0;
      return {
        value: f.id,
        label: `${f.name} — ${f.price} ${currencySymbol} / ${f.weight_g}г (${pricePerGram.toFixed(2)} ${currencySymbol}/г)`,
        color: f.color,
      };
    });
  }, [filaments, currencySymbol]);

  const printerOptions = useMemo(() => {
    return printers.map((p) => ({
      value: p.id,
      label: `${p.name} — ${p.power_w} Вт`,
      color: p.color,
    }));
  }, [printers]);

  const categorySelectOptions = useMemo(() => {
    const opts = categoriesList.map((cat) => ({
      value: cat.id,
      label: cat.label,
      icon: getCategoryLucideIcon(cat.id),
      badgeStyle: cat.color || 'bg-gray-800 text-gray-300 border-gray-700',
    }));
    return [
      ...opts,
      {
        value: '__new__',
        label: '+ Создать новую категорию...',
        icon: Plus,
        badgeStyle: productsTheme.badge.dashed,
      },
    ];
  }, [categoriesList]);

  // Опции выбора коллекции
  const collectionSelectOptions = useMemo(() => {
    const opts = (collections || []).map((col) => ({
      value: col.id,
      label: col.name,
      icon: Layers,
    }));
    return [
      {
        value: 'none',
        label: 'Без коллекции (отдельный товар)',
        icon: Package,
      },
      ...opts,
      {
        value: '__new__',
        label: '+ Создать новую коллекцию...',
        icon: Plus,
        badgeStyle: productsTheme.badge.dashed,
      },
    ];
  }, [collections]);

  const handleConfirmCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      showWarning('Введите название новой коллекции', 'Заполните название');
      return;
    }
    const created = await addCollection({
      name: newCollectionName.trim(),
      category: calculationCategory,
    });
    setSelectedCollectionId(created.id);
    setNewCollectionName('');
    setIsCreatingCollection(false);
    showSuccess(`Коллекция «${created.name}» создана!`, 'Коллекция добавлена');
  };

  // Обработчики пресетов и расходов
  const handleTogglePresetCost = (preset: CostCategoryConfig) => {
    const existingIndex = (calcCustomCostItems || []).findIndex(
      i => i && (i.id === preset.id || (i.name && i.name.toLowerCase() === preset.name.toLowerCase()))
    );

    if (existingIndex >= 0) {
      setCalcCustomCostItems(prev => prev.filter((_, idx) => idx !== existingIndex));
      showSuccess(`Пункт «${preset.name}» удален из расчета`, 'Расход отключен');
    } else {
      const newItem: CustomCostItem = {
        id: preset.id || `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: preset.name,
        amount: preset.defaultAmount || 100,
        isPerUnit: preset.isPerUnit || false,
        isEnabled: true,
      };
      setCalcCustomCostItems(prev => [...(prev || []), newItem]);
      showSuccess(`Пункт «${preset.name}» добавлен в расчет!`, 'Расход добавлен');
    }
  };

  const handleAddCustomCostConfirm = () => {
    if (!newCostName.trim()) {
      showWarning('Введите название расхода', 'Заполните поле');
      return;
    }

    const parsedAmount = parseFloat(newCostAmount) || 0;
    const newItem: CustomCostItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newCostName.trim(),
      amount: parsedAmount,
      isPerUnit: newCostIsPerUnit,
      isEnabled: true,
    };

    setCalcCustomCostItems(prev => [...(prev || []), newItem]);
    setNewCostName('');
    setNewCostAmount('100');
    setNewCostIsPerUnit(false);
    setIsAddingCustomCost(false);
    showSuccess(`Пункт «${newItem.name}» добавлен!`, 'Расход добавлен');
  };

  const handleRemoveCustomCost = (id: string) => {
    setCalcCustomCostItems(prev => prev.filter(item => item.id !== id));
  };

  const handleToggleCustomCost = (id: string) => {
    setCalcCustomCostItems(prev => prev.map(item => item.id === id ? { ...item, isEnabled: !item.isEnabled } : item));
  };

  const handleChangeCustomCostAmount = (id: string, amount: number) => {
    setCalcCustomCostItems(prev => prev.map(item => item.id === id ? { ...item, amount } : item));
  };

  const handleToggleCustomCostPerUnit = (id: string) => {
    setCalcCustomCostItems(prev => prev.map(item => item.id === id ? { ...item, isPerUnit: !item.isPerUnit } : item));
  };

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

  const handleCopyClientMessage = () => {
    const printHours = (parseInt(hours) || 0) + (parseInt(minutes) || 0) / 60;
    const printDays = Math.floor(printHours / 24);
    const leadTimeDays = Math.max(1, printDays + 2);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + leadTimeDays);
    const formattedTargetDate = targetDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const finalPriceText = formatCurrency(result.totalFinalPrice, currencySymbol);

    const enabledCustomNames = calcCustomCostItems
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

    let discountNotice = '';
    if (result.discountTotal > 0) {
      discountNotice = ` (с учетом персональной скидки ${calcDiscountType === 'percent' ? result.discountPercent + '%' : formatCurrency(result.discountAmount, currencySymbol)})`;
    }

    const message = `Стоимость 3D-печати вашего заказа — ${finalPriceText}${discountNotice}.\n\n${servicesText}\nСрок изготовления — до ${formattedTargetDate}.\n\nЕсли всё устраивает, можем запускать в работу 👍`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleCreateOrderDirectly = () => {
    if (!selectedFilament) {
      showWarning('Выберите филамент для 3D-печати', 'Внимание');
      return;
    }
    const printHours = (parseInt(hours) || 0) + (parseInt(minutes) || 0) / 60;
    const printDays = Math.floor(printHours / 24);
    const leadTimeDays = Math.max(1, printDays + 2);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + leadTimeDays);
    const deadlineStr = `${String(targetDate.getDate()).padStart(2, '0')}.${String(targetDate.getMonth() + 1).padStart(2, '0')}.${targetDate.getFullYear()}`;

    const costItems: any[] = [];
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

  const showPerUnit = (parseInt(quantity) || 1) > 1;
  const isLaborCustomized = calcLaborRate !== '' && parseFloat(calcLaborRate) !== defaultLaborRateValue;
  const isMarkupCustomized = calcMarkup !== '' && parseFloat(calcMarkup) !== result.appliedMarkupPercent;
  const isDefectCustomized = calcDefect !== '' && parseFloat(calcDefect) !== defaultDefectValue;
  const isUrgencyActive = parseFloat(calcUrgencyValue) > 0;
  const isDiscountActive = parseFloat(calcDiscountValue) > 0;
  const activeCustomCostsCount = (calcCustomCostItems || []).filter(i => i.isEnabled).length;

  const hasAnyCustomFields = Boolean(
    weightG || (hours && hours !== '0') || (minutes && minutes !== '0') || quantity !== '1' || 
    isLaborCustomized || isMarkupCustomized || isDefectCustomized || isUrgencyActive || isDiscountActive || 
    (calcCustomCostItems && calcCustomCostItems.length > 0)
  );

  // Расчет долей стоимости для визуальной шкалы (диаграммы)
  const priceSegments = useMemo(() => {
    const total = result.totalFinalPrice > 0 ? result.totalFinalPrice : 1;
    const material = Math.max(0, result.materialCost);
    const machine = Math.max(0, result.electricityCost + result.depreciationCost);
    const labor = Math.max(0, result.laborCost);
    const extra = Math.max(0, result.customCostsTotal);
    const defect = Math.max(0, result.defectCost);
    const profit = Math.max(0, result.profitTotal);

    return [
      { id: 'material', name: 'Материал', amount: material, percent: (material / total) * 100, color: 'bg-[#0CB4E0]', textColor: 'text-[#0CB4E0]' },
      { id: 'machine', name: 'Амортизация', amount: machine, percent: (machine / total) * 100, color: 'bg-indigo-500', textColor: 'text-indigo-400' },
      { id: 'defect', name: 'Брак', amount: defect, percent: (defect / total) * 100, color: 'bg-rose-500', textColor: 'text-rose-400' },
      { id: 'labor', name: 'Труд', amount: labor, percent: (labor / total) * 100, color: 'bg-amber-400', textColor: 'text-amber-400' },
      { id: 'extra', name: 'Доп. услуги', amount: extra, percent: (extra / total) * 100, color: 'bg-purple-500', textColor: 'text-purple-400' },
      { id: 'profit', name: 'Прибыль', amount: profit, percent: (profit / total) * 100, color: 'bg-emerald-400', textColor: 'text-emerald-400' },
    ].filter(s => s.amount > 0);
  }, [result]);

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-16 px-1 sm:px-2">
      {/* Шапка страницы */}
      <PageHeader
        icon={CalculatorIcon}
        title="Калькулятор стоимости 3D-печати"
        subtitle="Профессиональный расчет себестоимости, машинного времени, труда мастера, наценки и чистой прибыли"
        accentColor="#0CB4E0"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={resetCalculator}
              variant="outline"
              size="sm"
              className={`text-xs flex items-center gap-1.5 rounded-xl transition-all cursor-pointer ${
                hasAnyCustomFields
                  ? 'border-[#0CB4E0]/40 text-[#0CB4E0] hover:bg-[#0CB4E0]/15'
                  : 'border-[#242930] text-gray-500 hover:text-gray-300'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить расчет</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
        {/* ===================== ЛЕВАЯ КОЛОНКА: ВВОД ПАРАМЕТРОВ ===================== */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* СЕКЦИЯ 01: ОСНОВНЫЕ ПАРАМЕТРЫ ПЕЧАТИ */}
          <div className="bg-[#14161d] border border-[#242930] rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all hover:border-[#0CB4E0]/40">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0CB4E0] via-[#0993b8] to-transparent opacity-90" />

            <div className="flex items-center justify-between mb-5 select-none">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0CB4E0]/15 text-[#0CB4E0] flex items-center justify-center font-mono font-bold text-sm border border-[#0CB4E0]/30 shadow-inner">
                  01
                </div>
                <div>
                  <h2 className="text-white text-lg font-bold tracking-wide flex items-center gap-2">
                    <span>Параметры печати</span>
                  </h2>
                  <p className="text-xs text-gray-400">Материал, оборудование, геометрия и тираж изделий</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {/* Выбор филамента и принтера в 2 колонки с фиксированными подстроками без прыжков */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Филамент */}
                <div className="flex flex-col">
                  {filaments.length === 0 ? (
                    <div className="p-4 bg-[#181b24] border border-[#242930] rounded-xl flex flex-col items-center text-center gap-2">
                      <span className="text-xs font-semibold text-primary">Нет филаментов</span>
                      <Button size="sm" onClick={() => router.push('/filaments')} className="text-xs py-1.5">
                        <Plus size={14} /> Добавить
                      </Button>
                    </div>
                  ) : (
                    <Select
                      label="Филамент (пластик)"
                      value={filamentId}
                      options={filamentOptions}
                      onChange={setFilamentId}
                      isSearchable={true}
                    />
                  )}
                  
                  {/* Стабильная строка метаданных филамента (фиксированная высота min-h-[24px] исключает прыжки верстки) */}
                  <div className="min-h-[24px] flex items-center justify-between text-xs pt-1.5 px-1">
                    {selectedFilament && result.materialDifficulty ? (
                      <>
                        <span className="text-gray-400 flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${result.materialDifficulty.badgeColor} ${result.materialDifficulty.textColor} border ${result.materialDifficulty.borderColor}`}>
                            {result.materialDifficulty.icon} {result.materialDifficulty.shortLabel}
                          </span>
                        </span>
                        <span className="text-gray-400 font-mono text-[11px]">
                          Базовая наценка: <strong className="text-amber-400">+{result.appliedMarkupPercent}%</strong>
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500 text-[11px]">Выберите филамент для расчета стоимости сырья</span>
                    )}
                  </div>
                </div>

                {/* Принтер */}
                <div className="flex flex-col">
                  {printers.length === 0 ? (
                    <div className="p-4 bg-[#181b24] border border-[#242930] rounded-xl flex flex-col items-center text-center gap-2">
                      <span className="text-xs font-semibold text-primary">Нет принтеров</span>
                      <Button size="sm" onClick={() => router.push('/printers')} className="text-xs py-1.5">
                        <Plus size={14} /> Добавить
                      </Button>
                    </div>
                  ) : (
                    <Select
                      label="3D-Принтер"
                      value={printerId}
                      options={printerOptions}
                      onChange={setPrinterId}
                    />
                  )}

                  {/* Стабильная строка метаданных принтера (фиксированная высота min-h-[24px] исключает прыжки верстки) */}
                  <div className="min-h-[24px] flex items-center justify-between text-xs pt-1.5 px-1 text-gray-400">
                    {selectedPrinter ? (
                      <>
                        <span>Мощность: <strong className="text-gray-200 font-mono">{selectedPrinter.power_w} Вт</strong></span>
                        <span>Амортизация: <strong className="text-gray-200 font-mono">{formatCurrency(result.depreciationCost, currencySymbol)}</strong></span>
                      </>
                    ) : (
                      <span className="text-gray-500 text-[11px]">Выберите принтер для расчета тока и ресурса</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Расход веса, время печати и тираж */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
                {/* Расход грамм */}
                <div className="sm:col-span-4 flex flex-col gap-1.5">
                  <div className="h-5 flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Scale size={14} className="text-[#0CB4E0]" />
                      <span>Расход филамента, г</span>
                    </label>
                    {weightG && parseFloat(weightG) > 0 && selectedFilament && (
                      <span className="text-[11px] text-gray-400 font-mono">
                        {formatCurrency(result.materialCost, currencySymbol)}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      placeholder="0.0"
                      value={weightG}
                      onChange={(e) => setWeightG(e.target.value)}
                      className="w-full h-10 bg-[#101217] border border-[#242930] hover:border-[#537D8E] focus:border-[#0CB4E0] focus:outline-none rounded-xl px-3 text-white text-sm font-mono font-bold transition-colors placeholder-gray-600 shadow-inner"
                    />
                    <span className="absolute right-3.5 text-xs text-gray-500 font-mono pointer-events-none font-bold">
                      г
                    </span>
                  </div>
                </div>

                {/* Время печати: часы и минуты */}
                <div className="sm:col-span-5 grid grid-cols-2 gap-2.5">
                  <NumberCounter
                    label="Время: ч"
                    value={parseInt(hours) || 0}
                    onChange={(val) => setHours(val.toString())}
                    min={0}
                  />
                  <NumberCounter
                    label="мин"
                    value={parseInt(minutes) || 0}
                    onChange={(val) => setMinutes(val.toString())}
                    min={0}
                    max={59}
                  />
                </div>

                {/* Тираж изделий */}
                <div className="sm:col-span-3">
                  <NumberCounter
                    label="Тираж, шт"
                    value={parseInt(quantity) || 1}
                    onChange={(val) => setQuantity(val.toString())}
                    min={1}
                  />
                </div>
              </div>

              {/* Быстрые чипы тиража */}
              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#242930]/70 text-xs gap-2">
                <span className="text-gray-400 text-xs font-medium">Быстрый выбор тиража партии:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 5, 10, 20, 50, 100].map((qtyVal) => (
                    <button
                      key={qtyVal}
                      type="button"
                      onClick={() => setQuantity(qtyVal.toString())}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer select-none ${
                        parseInt(quantity) === qtyVal
                          ? 'bg-[#0CB4E0]/25 text-[#0CB4E0] border border-[#0CB4E0]/50 font-bold shadow-sm'
                          : 'bg-[#181b24] text-gray-400 hover:text-white hover:bg-[#222632] border border-[#242930]'
                      }`}
                    >
                      {qtyVal}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* СЕКЦИЯ 02: ЭКОНОМИКА, ТРУД И НАЦЕНКА */}
          <div className="bg-[#14161d] border border-[#242930] rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all hover:border-[#0CB4E0]/40">
            <div className="flex items-center justify-between mb-5 select-none">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-mono font-bold text-sm border border-amber-500/30 shadow-inner">
                  02
                </div>
                <div>
                  <h2 className="text-white text-lg font-bold tracking-wide flex items-center gap-2">
                    <span>Экономика и Работа мастера</span>
                  </h2>
                  <p className="text-xs text-gray-400">Труд мастера, наценка мастерской и технологический брак</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {/* Блок Труда мастера */}
              <div className="p-4 bg-[#101217] border border-[#242930] rounded-2xl space-y-3.5 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-amber-400" />
                    <span className="text-sm font-bold text-gray-200">Работа мастера (постобработка / сборка)</span>
                  </div>

                  {/* Переключатель: на заказ vs за штуку */}
                  <div className="inline-flex items-center bg-[#181b24] p-1 rounded-xl border border-[#242930] text-xs">
                    <button
                      type="button"
                      onClick={() => setCalcIsLaborPerUnit(false)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                        !calcIsLaborPerUnit
                          ? 'bg-[#242930] text-white font-bold shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      На весь заказ
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcIsLaborPerUnit(true)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                        calcIsLaborPerUnit
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      За каждую шт
                    </button>
                  </div>
                </div>

                {/* Время и ставка в 2 колонки */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <NumberCounter
                      label={calcIsLaborPerUnit ? "Время на 1 шт, мин" : "Время на весь заказ, мин"}
                      value={parseInt(currentLaborMinutes) || 0}
                      onChange={(val) => setCalcLaborMinutes(val.toString())}
                      min={0}
                    />
                    {calcIsLaborPerUnit && (parseInt(quantity) || 1) > 1 && (
                      <span className="text-[11px] text-amber-400/90 font-mono mt-1.5 block">
                        Всего времени: {result.effectiveLaborMinutes} мин ({quantity} шт × {currentLaborMinutes} мин)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                      <span>Ставка мастера, {currencySymbol}/час</span>
                      {isLaborCustomized && (
                        <button
                          type="button"
                          onClick={() => setCalcLaborRate('')}
                          className="text-[11px] text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw size={11} /> сбросить
                        </button>
                      )}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder={defaultLaborRateValue.toString()}
                        value={calcLaborRate !== '' ? calcLaborRate : ''}
                        onChange={(e) => setCalcLaborRate(e.target.value)}
                        className="w-full h-10 bg-[#14161d] border border-[#242930] hover:border-[#537D8E] focus:border-amber-400 focus:outline-none rounded-xl px-3 text-white text-sm font-mono font-bold transition-colors placeholder-gray-600 shadow-inner"
                      />
                      <span className="absolute right-3.5 text-xs text-gray-500 font-mono pointer-events-none font-bold">
                        {currencySymbol}/ч
                      </span>
                    </div>
                  </div>
                </div>

                {/* Карточка переключения Личный труд vs Наемный мастер */}
                <div 
                  onClick={() => setCalcIsOwnerLabor(!calcIsOwnerLabor)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3.5 ${
                    calcIsOwnerLabor 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/5' 
                      : 'bg-[#14161d] border-[#242930] text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                      calcIsOwnerLabor ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-gray-600 bg-[#101217]'
                    }`}>
                      {calcIsOwnerLabor && <Check size={14} className="stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold block leading-tight">
                        Мой личный труд (доход идет в чистую прибыль)
                      </span>
                      <span className="text-[11px] text-gray-400 block mt-0.5">
                        {calcIsOwnerLabor 
                          ? 'Оплата труда включается в чек клиента, но не списывается в себестоимость сырья' 
                          : 'Оплата труда списывается в расход себестоимости как зарплата мастеру'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-sm font-mono font-bold shrink-0 ${calcIsOwnerLabor ? 'text-emerald-400' : 'text-gray-400'}`}>
                    +{formatCurrency(result.laborCost, currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Наценка и Брак в 2 колонки */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Наценка */}
                <div className="p-4 bg-[#101217] border border-[#242930] rounded-2xl space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <Percent size={14} className="text-[#0CB4E0]" />
                      <span>Наценка мастерской, %</span>
                    </label>
                    {isMarkupCustomized && (
                      <button
                        type="button"
                        onClick={() => setCalcMarkup('')}
                        className="text-[11px] text-[#0CB4E0] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw size={11} /> сбросить
                      </button>
                    )}
                  </div>
                  <NumberCounter
                    value={parseInt(currentMarkup) || 0}
                    onChange={(val) => setCalcMarkup(val.toString())}
                    min={0}
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[50, 100, 150, 200, 300].map((presetVal) => (
                      <button
                        key={presetVal}
                        type="button"
                        onClick={() => setCalcMarkup(presetVal.toString())}
                        className={`px-2 py-0.5 rounded-lg text-xs font-mono transition-colors cursor-pointer select-none ${
                          parseInt(currentMarkup) === presetVal 
                            ? 'bg-[#0CB4E0]/25 text-[#0CB4E0] border border-[#0CB4E0]/50 font-bold' 
                            : 'bg-[#181b24] text-gray-400 hover:text-white hover:bg-[#242930]'
                        }`}
                      >
                        +{presetVal}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Брак */}
                <div className="p-4 bg-[#101217] border border-[#242930] rounded-2xl space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-rose-400" />
                      <span>Технологический брак, %</span>
                    </label>
                    {isDefectCustomized && (
                      <button
                        type="button"
                        onClick={() => setCalcDefect('')}
                        className="text-[11px] text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw size={11} /> сбросить
                      </button>
                    )}
                  </div>
                  <NumberCounter
                    value={parseInt(currentDefect) || 0}
                    onChange={(val) => setCalcDefect(val.toString())}
                    min={0}
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[0, 3, 5, 10, 15].map((presetVal) => (
                      <button
                        key={presetVal}
                        type="button"
                        onClick={() => setCalcDefect(presetVal.toString())}
                        className={`px-2 py-0.5 rounded-lg text-xs font-mono transition-colors cursor-pointer select-none ${
                          parseInt(currentDefect) === presetVal 
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 font-bold' 
                            : 'bg-[#181b24] text-gray-400 hover:text-white hover:bg-[#242930]'
                        }`}
                      >
                        {presetVal}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* СЕКЦИЯ 03: ДОПОЛНИТЕЛЬНЫЕ РАСХОДЫ И УСЛУГИ */}
          <div className="bg-[#14161d] border border-[#242930] rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all hover:border-[#0CB4E0]/40">
            <div className="flex items-center justify-between mb-4 select-none">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-mono font-bold text-sm border border-purple-500/30 shadow-inner">
                  03
                </div>
                <div>
                  <h2 className="text-white text-lg font-bold tracking-wide flex items-center gap-2">
                    <span>Дополнительные услуги и расходы</span>
                  </h2>
                  <p className="text-xs text-gray-400">Упаковка, доставка, постобработка, метизы или свои статьи</p>
                </div>
              </div>

              {activeCustomCostsCount > 0 && (
                <span className="px-3 py-1 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-full text-xs font-mono font-bold shadow-sm">
                  +{formatCurrency(result.customCostsTotal, currencySymbol)}
                </span>
              )}
            </div>

            {/* Интерактивные чипы пресетов */}
            <div className="space-y-4 pt-1">
              <div className="flex flex-wrap gap-2.5">
                {DEFAULT_COST_CATEGORIES.filter(c => c.id !== 'print').map((cat) => {
                  const IconComp = cat.icon;
                  const isAdded = (calcCustomCostItems || []).some(i => i.id === cat.id || i.name.toLowerCase().includes(cat.name.toLowerCase()));
                  
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleTogglePresetCost(cat)}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none ${
                        isAdded
                          ? 'bg-purple-500/20 text-purple-200 border-purple-500/50 shadow-md shadow-purple-500/10 scale-[1.02]'
                          : 'bg-[#101217] text-gray-300 border-[#242930] hover:text-white hover:border-gray-500'
                      }`}
                    >
                      <IconComp className={`w-4 h-4 ${isAdded ? 'text-purple-300' : 'text-gray-400'}`} />
                      <span>{cat.name}</span>
                      <span className="text-[11px] opacity-70 font-mono">
                        {cat.defaultAmount} {currencySymbol}{cat.isPerUnit ? '/шт' : ''}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsAddingCustomCost(!isAddingCustomCost)}
                  className="px-4 py-2 rounded-xl border border-dashed border-[#0CB4E0]/60 text-xs font-bold text-[#0CB4E0] hover:bg-[#0CB4E0]/15 flex items-center gap-1.5 transition-all cursor-pointer select-none"
                >
                  <Plus size={15} />
                  <span>+ Свой расход</span>
                </button>
              </div>

              {/* Форма добавления нового произвольного расхода */}
              <AnimatePresence>
                {isAddingCustomCost && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-[#101217] border border-[#0CB4E0]/50 rounded-2xl space-y-3.5 overflow-hidden shadow-xl"
                  >
                    <div className="text-xs font-bold text-[#0CB4E0] flex items-center gap-1.5">
                      <Sparkles size={14} /> Новый пользовательский расход
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6">
                        <Input
                          placeholder="Название (напр. Магниты, Лак, Коробка)"
                          value={newCostName}
                          onChange={(e) => setNewCostName(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Сумма"
                          value={newCostAmount}
                          onChange={(e) => setNewCostAmount(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-3 flex items-center">
                        <button
                          type="button"
                          onClick={() => setNewCostIsPerUnit(!newCostIsPerUnit)}
                          className={`w-full h-10 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            newCostIsPerUnit 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                              : 'bg-[#181b24] text-gray-300 border-[#242930]'
                          }`}
                        >
                          {newCostIsPerUnit ? 'За 1 шт' : 'На заказ'}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingCustomCost(false)}
                      >
                        Отмена
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCustomCostConfirm}
                        className="bg-[#0CB4E0] hover:bg-[#0CB4E0]/90 text-black font-bold"
                      >
                        Добавить расход
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Список активных добавленных расходов */}
              {calcCustomCostItems.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-[#242930]/70">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <span>Выбранные статьи ({calcCustomCostItems.length}):</span>
                    <button
                      type="button"
                      onClick={() => setCalcCustomCostItems([])}
                      className="text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Удалить все</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {calcCustomCostItems.map((item) => {
                      const cfg = getCategoryConfig(item.name);
                      const IconComp = cfg.icon;
                      const qty = parseInt(quantity, 10) || 1;
                      const itemTotal = item.isPerUnit ? (item.amount || 0) * qty : (item.amount || 0);

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all text-xs gap-3 ${
                            item.isEnabled
                              ? 'bg-[#101217] border-[#242930] hover:border-purple-500/50'
                              : 'bg-[#0d0e12] border-[#1a1d24] opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div 
                              onClick={() => handleToggleCustomCost(item.id)}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${
                                item.isEnabled ? 'bg-purple-500 border-purple-400 text-white' : 'border-gray-600 bg-[#14161d]'
                              }`}
                            >
                              {item.isEnabled && <Check size={13} className="stroke-[3]" />}
                            </div>

                            <div className="p-2 rounded-xl bg-[#181b24] border border-[#242930] shrink-0">
                              <IconComp className={`w-4 h-4 ${cfg.color}`} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <span className={`font-bold text-sm truncate block ${item.isEnabled ? 'text-white' : 'text-gray-500 line-through'}`}>
                                {item.name.replace(/^[\p{Emoji}\s]+/u, '')}
                              </span>
                              {qty > 1 && item.isPerUnit && item.isEnabled && (
                                <span className="text-[11px] text-gray-400 font-mono block mt-0.5">
                                  {qty} шт × {item.amount} {currencySymbol} = <strong className="text-purple-300">{formatCurrency(itemTotal, currencySymbol)}</strong>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                            <div className="flex items-center gap-1.5 bg-[#14161d] border border-[#242930] focus-within:border-purple-400 rounded-xl px-2.5 py-1">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.amount !== undefined && item.amount !== null ? item.amount : ''}
                                onChange={(e) => handleChangeCustomCostAmount(item.id, parseFloat(e.target.value) || 0)}
                                className="w-20 bg-transparent text-right text-sm text-white font-bold font-mono focus:outline-none"
                              />
                              <span className="text-gray-500 text-xs font-mono">{currencySymbol}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleCustomCostPerUnit(item.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer shrink-0 ${
                                item.isPerUnit 
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                                  : 'bg-[#181b24] text-gray-400 border-[#242930] hover:text-white'
                              }`}
                              title={item.isPerUnit ? 'На каждую штуку' : 'На весь заказ'}
                            >
                              {item.isPerUnit ? '/шт' : 'заказ'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveCustomCost(item.id)}
                              className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 cursor-pointer"
                              title="Удалить расход"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* СЕКЦИЯ 04: КОММЕРЧЕСКИЕ УСЛОВИЯ (СКИДКИ И СРОЧНОСТЬ) - СВОРАЧИВАЕМАЯ */}
          <div className="bg-[#14161d] border border-[#242930] rounded-2xl p-5 shadow-xl transition-all hover:border-[#0CB4E0]/40">
            <button
              type="button"
              onClick={() => setIsCommercialOpen(!isCommercialOpen)}
              className="w-full flex items-center justify-between text-left cursor-pointer select-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-mono font-bold text-sm border border-emerald-500/30 shadow-inner">
                  <SlidersHorizontal size={15} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-200 flex items-center gap-2">
                    <span>Скидка и Срочность заказа</span>
                    {(isDiscountActive || isUrgencyActive) && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </h3>
                  <p className="text-xs text-gray-400">Персональные скидки клиенту или надбавка за срочность изготовления</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(isDiscountActive || isUrgencyActive) && (
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    активно
                  </span>
                )}
                <div className="text-gray-400 hover:text-white transition-transform">
                  {isCommercialOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
            </button>

            <AnimatePresence>
              {isCommercialOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-5 border-t border-[#242930]/70 mt-4 space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Скидка */}
                    <div className="p-4 bg-[#101217] border border-[#242930] rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                          <Tag size={14} className="text-emerald-400" /> Скидка клиенту
                        </span>
                        {isDiscountActive && (
                          <button
                            type="button"
                            onClick={() => setCalcDiscountValue('')}
                            className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                          >
                            сбросить
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={calcDiscountValue}
                          onChange={(e) => setCalcDiscountValue(e.target.value)}
                        />
                        <div className="inline-flex bg-[#181b24] p-1 rounded-xl border border-[#242930] shrink-0">
                          <button
                            type="button"
                            onClick={() => setCalcDiscountType('percent')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                              calcDiscountType === 'percent' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-gray-400'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalcDiscountType('fixed')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                              calcDiscountType === 'fixed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-gray-400'
                            }`}
                          >
                            {currencySymbol}
                          </button>
                        </div>
                      </div>
                      {isDiscountActive && (
                        <span className="text-[11px] text-emerald-400 font-mono block">
                          Скидка: -{formatCurrency(result.discountTotal, currencySymbol)}
                        </span>
                      )}
                    </div>

                    {/* Срочность */}
                    <div className="p-4 bg-[#101217] border border-[#242930] rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                          <Flame size={14} className="text-amber-400" /> Наценка за срочность
                        </span>
                        {isUrgencyActive && (
                          <button
                            type="button"
                            onClick={() => setCalcUrgencyValue('')}
                            className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                          >
                            сбросить
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={calcUrgencyValue}
                          onChange={(e) => setCalcUrgencyValue(e.target.value)}
                        />
                        <div className="inline-flex bg-[#181b24] p-1 rounded-xl border border-[#242930] shrink-0">
                          <button
                            type="button"
                            onClick={() => setCalcUrgencyType('percent')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                              calcUrgencyType === 'percent' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-gray-400'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalcUrgencyType('fixed')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                              calcUrgencyType === 'fixed' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-gray-400'
                            }`}
                          >
                            {currencySymbol}
                          </button>
                        </div>
                      </div>
                      {isUrgencyActive && (
                        <span className="text-[11px] text-amber-400 font-mono block">
                          Надбавка: +{formatCurrency(result.urgencyCost, currencySymbol)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ===================== ПРАВАЯ КОЛОНКА: ИТОГОВЫЙ ДАШБОРД ===================== */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-5">
            
            {/* ГЛАВНАЯ КАРТОЧКА СТОИМОСТИ (HERO CARD) */}
            <div className="bg-[#14161d] border border-[#242930] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#0CB4E0]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between pb-3.5 border-b border-[#242930]/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-gray-400">
                    Итого к оплате
                  </span>
                  {result.isMinOrderApplied && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-md">
                      мин. заказ
                    </span>
                  )}
                </div>

                <CustomTooltip
                  title="Прозрачная формула ценообразования"
                  description="Наценка мастерской начисляется на производственные расходы станка (нить, ток, амортизация, брак). Ручной труд и доп. услуги прибавляются по фиксированной стоимости."
                  formula="Цена = (Печать + Брак) × (1 + Наценка%) + Труд + Доп. расходы"
                  accentColor="cyan"
                  align="right"
                >
                  <span className="p-1 text-gray-400 hover:text-white cursor-help transition-colors">
                    <HelpCircle size={16} />
                  </span>
                </CustomTooltip>
              </div>

              {/* Главный ценник */}
              <div className="py-4 flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono text-[#0CB4E0] tracking-tight">
                    <AnimatedPrice value={result.totalFinalPrice} currencySymbol={currencySymbol} />
                  </span>
                </div>

                {showPerUnit && (
                  <div className="text-xs sm:text-sm text-gray-400 font-mono mt-1.5 flex items-center gap-1.5">
                    <span>за 1 шт:</span>
                    <strong className="text-gray-200">{formatCurrency(result.finalPricePerUnit, currencySymbol)}</strong>
                    <span className="text-gray-500">({quantity} шт в партии)</span>
                  </div>
                )}
              </div>

              {/* КНОПКИ ДЕЙСТВИЙ (РАСПОЛОЖЕНЫ НА ВЫСОКОМ МЕСТЕ ДЛЯ 100% ВИДИМОСТИ) */}
              <div className="pt-2 pb-4 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleCreateOrderDirectly}
                    className={`w-full flex items-center justify-center gap-2 ${ordersTheme.primaryButton.gradient} ${ordersTheme.primaryButton.text} border-none shadow-xl cursor-pointer text-sm py-3 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]`}
                    disabled={!filamentId || filaments.length === 0}
                  >
                    <ShoppingBag size={17} /> В Заказы
                  </Button>

                  <Button
                    variant="primary"
                    type="button"
                    onClick={() => setIsSaveModalOpen(true)}
                    className={`w-full flex items-center justify-center gap-2 ${productsTheme.primaryButton.gradient} ${productsTheme.primaryButton.text} border-none shadow-xl cursor-pointer text-sm py-3 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]`}
                    disabled={!filamentId || filaments.length === 0}
                  >
                    <Package size={17} /> В Товары
                  </Button>
                </div>

                <Button
                  variant="outline"
                  type="button"
                  onClick={handleCopyClientMessage}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                    copied 
                      ? '!bg-emerald-600 hover:!bg-emerald-500 !text-white font-bold !border-emerald-500 shadow-md shadow-emerald-950/40' 
                      : 'bg-[#101217] hover:bg-[#1c1f28] text-gray-200 hover:text-white border-[#242930] hover:border-gray-500'
                  }`}
                  disabled={!filamentId || filaments.length === 0}
                >
                  {copied ? <Check size={16} className="text-white" /> : <Copy size={16} className="text-[#0CB4E0]" />}
                  <span>{copied ? 'Скопировано в буфер!' : 'Скопировать КП для клиента'}</span>
                </Button>
              </div>

              {/* KPI СЕТКА: Себестоимость, Чистая прибыль, Маржа */}
              <div className="grid grid-cols-3 gap-2.5 py-3.5 border-t border-b border-[#242930]/80">
                {/* 1. Себестоимость */}
                <div className="p-3 bg-[#101217] rounded-xl border border-[#242930] flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Себестоимость
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-gray-200">
                    {formatCurrency(result.totalBaseCost, currencySymbol)}
                  </span>
                  {showPerUnit && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      {formatCurrency(result.baseCostPerUnit, currencySymbol)}/шт
                    </span>
                  )}
                </div>

                {/* 2. Чистая прибыль */}
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Прибыль
                  </span>
                  <span className="text-sm sm:text-base font-bold font-mono text-emerald-300">
                    +{formatCurrency(result.profitTotal, currencySymbol)}
                  </span>
                  {showPerUnit && (
                    <span className="text-[10px] text-emerald-400/80 font-mono">
                      +{formatCurrency(result.profitPerUnit, currencySymbol)}/шт
                    </span>
                  )}
                </div>

                {/* 3. Маржинальность */}
                <div className="p-3 bg-[#101217] rounded-xl border border-[#242930] flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Маржа
                  </span>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-amber-400">
                    {result.marginPercent}%
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    рентабельность
                  </span>
                </div>
              </div>

              {/* ИНТЕРАКТИВНАЯ ШКАЛА СТРУКТУРЫ СТОИМОСТИ */}
              <div className="py-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-semibold">Структура цены:</span>
                  <span className="text-[11px] text-gray-500 font-mono">{priceSegments.length} статьи</span>
                </div>

                {/* Мультисегментный прогресс-бар */}
                <div className="h-3 w-full bg-[#101217] rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-[#242930]">
                  {priceSegments.map((seg) => (
                    <div
                      key={seg.id}
                      style={{ width: `${Math.max(4, seg.percent)}%` }}
                      className={`h-full rounded-sm ${seg.color} transition-all duration-300`}
                      title={`${seg.name}: ${formatCurrency(seg.amount, currencySymbol)} (${seg.percent.toFixed(1)}%)`}
                    />
                  ))}
                </div>

                {/* Фиксированная сетка легенды без дерганий */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  {priceSegments.map((seg) => (
                    <div key={seg.id} className="flex items-center gap-1.5 font-mono truncate">
                      <span className={`w-2 h-2 rounded-full ${seg.color} shrink-0`} />
                      <span className="text-gray-400 truncate">{seg.name}:</span>
                      <span className="text-gray-200 font-bold shrink-0">{formatCurrency(seg.amount, currencySymbol)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ДЕТАЛИЗИРОВАННЫЙ ЧЕК РАСХОДОВ (СВОРАЧИВАЕМЫЙ) */}
              <div className="pt-2 border-t border-[#242930]/80">
                <button
                  type="button"
                  onClick={() => setIsDetailedBreakdownOpen(!isDetailedBreakdownOpen)}
                  className="w-full flex items-center justify-between py-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer select-none"
                >
                  <span className="font-semibold flex items-center gap-1.5">
                    <span>Детализация расчета по статьям</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-mono">
                      {isDetailedBreakdownOpen ? 'свернуть' : 'развернуть'}
                    </span>
                    {isDetailedBreakdownOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </button>

                <AnimatePresence>
                  {isDetailedBreakdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 pt-2.5 text-xs font-mono overflow-hidden"
                    >
                      <div className="flex justify-between py-1 border-b border-[#242930]/40 text-gray-300">
                        <span className="text-gray-400">Нить ({weightG || 0}г):</span>
                        <span>{formatCurrency(result.materialCost, currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#242930]/40 text-gray-300">
                        <span className="text-gray-400">Электроэнергия:</span>
                        <span>{formatCurrency(result.electricityCost, currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#242930]/40 text-gray-300">
                        <span className="text-gray-400">Амортизация принтера:</span>
                        <span>{formatCurrency(result.depreciationCost, currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#242930]/40 text-gray-300">
                        <span className="text-gray-400">Технологический брак ({currentDefect}%):</span>
                        <span>{formatCurrency(result.defectCost, currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#242930]/40 text-gray-300">
                        <span className="text-gray-400 flex items-center gap-1">
                          <span>Работа мастера:</span>
                          {result.isOwnerLabor && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded">
                              в прибыль
                            </span>
                          )}
                        </span>
                        <span>{formatCurrency(result.laborCost, currencySymbol)}</span>
                      </div>
                      {result.customCostsBreakdown.map((item) => (
                        <div key={item.id} className="flex justify-between py-1 border-b border-[#242930]/40 text-purple-300">
                          <span className="truncate pr-2">• {item.name}:</span>
                          <span>+{formatCurrency(item.totalAmount, currencySymbol)}</span>
                        </div>
                      ))}
                      {result.urgencyCost > 0 && (
                        <div className="flex justify-between py-1 border-b border-[#242930]/40 text-amber-400">
                          <span>Срочность заказа:</span>
                          <span>+{formatCurrency(result.urgencyCost, currencySymbol)}</span>
                        </div>
                      )}
                      {result.discountTotal > 0 && (
                        <div className="flex justify-between py-1 border-b border-[#242930]/40 text-emerald-400">
                          <span>Скидка:</span>
                          <span>-{formatCurrency(result.discountTotal, currencySymbol)}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

          </div>
        </div>

        {/* МОДАЛЬНОЕ ОКНО СОХРАНЕНИЯ В КАТАЛОГ ТОВАРОВ */}
        <Modal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          title="Сохранить в каталог товаров"
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
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Folder size={14} className={productsTheme.accent.text} />
                Категория товара
              </label>

              {!isCreatingCategory ? (
                <Select
                  options={categorySelectOptions}
                  value={calculationCategory}
                  onChange={(val) => {
                    if (val === '__new__') {
                      setIsCreatingCategory(true);
                    } else {
                      setCalculationCategory(val);
                    }
                  }}
                  placeholder="Выберите категорию..."
                />
              ) : (
                <div className={`p-3.5 bg-[#14171f] border ${productsTheme.accent.borderHover} rounded-xl space-y-3 animate-scale-in`}>
                  <div className={`text-xs font-bold ${productsTheme.accent.text} flex items-center justify-between`}>
                    <span className="flex items-center gap-1.5">
                      <Folder size={14} /> Создание новой категории
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingCategory(false)}
                      className="text-gray-400 hover:text-white cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <Input
                      label="Название категории"
                      placeholder="Например: Медицина, Косплей, Модели..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      autoFocus
                    />

                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1.5">
                        Выберите иконку:
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {AVAILABLE_CATEGORY_ICONS.map((item) => {
                          const IconComp = item.icon;
                          const isSelected = newCategoryIcon === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setNewCategoryIcon(item.id)}
                              className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                                isSelected
                                  ? `${productsTheme.filterButton.active} font-semibold`
                                  : 'bg-[#181b24] text-gray-400 border-[#242930] hover:text-white hover:border-gray-600'
                              }`}
                              title={item.label}
                            >
                              <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? productsTheme.accent.text : 'text-gray-400'}`} />
                              <span className="text-[11px] truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-[#242930]/60">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsCreatingCategory(false)}>
                      Отмена
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={handleConfirmCreateCategory} 
                      className={`${productsTheme.primaryButton.solid} border-none cursor-pointer`}
                    >
                      Создать
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Коллекция (Группа вариаций) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Layers size={14} className={productsTheme.accent.text} />
                Коллекция (Группа модификаций / Серия)
              </label>

              {!isCreatingCollection ? (
                <Select
                  options={collectionSelectOptions}
                  value={selectedCollectionId}
                  onChange={(val) => {
                    if (val === '__new__') {
                      setIsCreatingCollection(true);
                    } else {
                      setSelectedCollectionId(val);
                    }
                  }}
                  placeholder="Выберите коллекцию..."
                />
              ) : (
                <div className={`p-3 bg-[#14171f] border ${productsTheme.accent.borderHover} rounded-xl space-y-2.5 animate-scale-in`}>
                  <div className={`text-xs font-bold ${productsTheme.accent.text} flex items-center justify-between`}>
                    <span className="flex items-center gap-1.5">
                      <Layers size={14} /> Новая коллекция
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingCollection(false)}
                      className="text-gray-400 hover:text-white cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <Input
                    placeholder="Например: Драконы подвижные, Органайзеры Gridfinity..."
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    autoFocus
                  />

                  <div className="flex justify-end gap-2 pt-1 border-t border-[#242930]/60">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsCreatingCollection(false)}>
                      Отмена
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={handleConfirmCreateCollection} 
                      className={`${productsTheme.primaryButton.solid} border-none cursor-pointer`}
                    >
                      Создать коллекцию
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-gray-500 font-sans">
                Объединяет товары разных размеров, цветов или пластиков в одну раскладывающуюся строку в каталоге.
              </p>
            </div>

            {/* Теги товара */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Tag size={14} className={productsTheme.accent.text} />
                Теги товара (через запятую)
              </label>
              <Input
                placeholder="например: PLA, Срочно, Популярное, Авито"
                value={calculationTags}
                onChange={(e) => setCalculationTags(e.target.value)}
              />
              <p className="text-[11px] text-gray-500 font-sans">
                Отобразятся в виде бэйджей #тег в каталоге.
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
            </div>

            {/* Ссылка на 3D-модель */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300">
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
                        onClick={() => {
                          try {
                            const url = new URL(stlUrl);
                            if (['http:', 'https:'].includes(url.protocol)) {
                              window.open(stlUrl, '_blank');
                            }
                          } catch {
                            // Невалидный URL
                          }
                        }}
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
              <label className="text-xs font-semibold text-gray-300">
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
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className={`${productsTheme.primaryButton.gradient} ${productsTheme.primaryButton.text} border-none shadow-lg`}
              >
                <Package size={14} className="mr-1.5" />
                {isSubmitting ? 'Сохранение...' : 'Сохранить в товары'}
              </Button>
            </div>
          </form>
        </Modal>

      </div>
    </div>
  );
}
