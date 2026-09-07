'use client';

import React, { useState, useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Order,
  CostItem,
  SavedCalculation
} from '../types';
import {
  HandDrawnStrikethrough,
  HandDrawnUnderline,
  NativeDualDateCalendar,
  NativeEmbeddedCalendar,
  NativeVerticalChannelList,
  NativeVerticalStatusList,
  PhysicsQuantitySlider,
} from './OrderFormControls';
import {
  formatMoney,
  roundTo2,
  calculateOrderFinancials
} from '../helpers';
import { DEFAULT_COST_CATEGORIES } from '../../../shared/lib/costCategories';
import { useData } from '../../../entities/model/DataProvider';
import { calculateCost } from '../../../features/calculate-cost/model/calculate';
import { CustomCostItem, ContactType } from '../../../shared/types';
import {

  Package,
  Search,
  DollarSign,
  Flame,
  Tag,
  Receipt,
  NotebookPen,
  Check,
  Clock,
  Calendar,
  AlertTriangle,
  Layers,
  Wrench,
  X,
  User,
  Printer,
  TrendingUp,
  TrendingDown,
  Scale,
  Calculator as CalculatorIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type OrderModalTab = 'item' | 'pricing' | 'status' | 'client' | 'tech';

interface TabConfig {
  id: OrderModalTab;
  code: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ORDER_TABS: TabConfig[] = [
  { id: 'item', code: '01. Изделие и тираж', label: 'Изделие', description: 'Наименование, тираж, пластик, слой', icon: Package },
  { id: 'pricing', code: '02. Финансы и оплата', label: 'Финансы', description: 'Себестоимость, цена, оплата', icon: DollarSign },
  { id: 'status', code: '03. Сроки и статус', label: 'Сроки', description: 'Статус заказа и дедлайн', icon: Calendar },
  { id: 'client', code: '04. Клиент и канал', label: 'Клиент', description: 'Контакт, канал связи, доставка', icon: User },
];

const EXPENSE_TABS: TabConfig[] = [
  { id: 'item', code: '01. Детали расхода', label: 'Расход', description: 'Наименование, категория', icon: Receipt },
  { id: 'pricing', code: '02. Сумма и дата', label: 'Сумма', description: 'Сумма затрат, дата платежа', icon: DollarSign },
  { id: 'tech', code: '03. Заметки и чек', label: 'Заметки', description: 'Комментарии и поставщик', icon: NotebookPen },
];

interface DirectExtraOption {
  id: string;
  category: string;
  defaultAmount: number;
  isCustom?: boolean;
}

const DEFAULT_DIRECT_EXTRA_OPTIONS: DirectExtraOption[] = [
  { id: 'opt-pack', category: 'Упаковка', defaultAmount: 100 },
  { id: 'opt-paint', category: 'Покраска', defaultAmount: 150 },
  { id: 'opt-delivery', category: 'Доставка', defaultAmount: 300 },
  { id: 'opt-hardware', category: 'Фурнитура', defaultAmount: 100 },
  { id: 'opt-modeling', category: 'Моделирование', defaultAmount: 500 },
];

const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  'Пластик и филамент',
  'Комплектующие и сопла',
  'Фотополимерная смола',
  'Химия и изопропанол',
  'Оборудование и 3D-принтеры',
  'Упаковка и коробки',
  'Доставка и логистика',
  'Аренда мастерской',
  'Электроэнергия и ЖКХ',
  'Реклама и продвижение',
  'Фурнитура и крепеж',
  '3D-модели и ПО',
  'Обслуживание и ремонт',
  'Налоги и эквайринг',
  'Обучение и курсы',
  'Прочие расходы',
];

interface PresetExpenseItem {
  id: string;
  title: string;
  amount: number;
  client: string;
  notes: string;
  date?: string;
}

const DEFAULT_PRESET_EXPENSES: PresetExpenseItem[] = [
  { id: 'exp-pre-1', title: 'Катушка PLA 1кг', amount: 1200, client: 'Пластик и филамент', notes: 'Черный / Белый базовый', date: '' },
  { id: 'exp-pre-2', title: 'Катушка PETG 1кг', amount: 1100, client: 'Пластик и филамент', notes: 'FDplast / Kingroon', date: '' },
  { id: 'exp-pre-3', title: 'Фотополимерная смола 1кг', amount: 2400, client: 'Фотополимерная смола', notes: 'Anycubic Standard Grey', date: '' },
  { id: 'exp-pre-4', title: 'Изопропиловый спирт 5л', amount: 1350, client: 'Химия и изопропанол', notes: 'Абсолютированный 99.8%', date: '' },
  { id: 'exp-pre-5', title: 'Комплект сопел 0.4', amount: 850, client: 'Комплектующие и сопла', notes: 'Hardened Steel 0.4mm', date: '' },
  { id: 'exp-pre-6', title: 'Упаковочные коробки 50 шт', amount: 1500, client: 'Упаковка и коробки', notes: 'Самосборные коробки Т-23', date: '' },
  { id: 'exp-pre-7', title: 'Аренда мастерской', amount: 15000, client: 'Аренда мастерской', notes: 'Ежемесячный платеж', date: '' },
  { id: 'exp-pre-8', title: 'Электроэнергия мастерской', amount: 3200, client: 'Электроэнергия и ЖКХ', notes: 'По счетчику за месяц', date: '' },
];

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  order: Partial<Order> | null;
  setOrder: React.Dispatch<React.SetStateAction<Partial<Order> | null>>;
  onSave: (e: React.FormEvent) => Promise<Order | null>;
  savedCalculations: SavedCalculation[];
  allOrders?: Order[];
}

export function OrderFormModal({
  isOpen,
  onClose,
  onMinimize,
  order,
  setOrder,
  onSave,
  savedCalculations,
  allOrders = [],
}: OrderFormModalProps) {
  const router = useRouter();
  const { printers, filaments, settings } = useData();
  const [activeTab, setActiveTab] = useState<OrderModalTab>('item');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [expenseHistorySearchQuery, setExpenseHistorySearchQuery] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Выбранный принтер и пластик
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [selectedFilament, setSelectedFilament] = useState<string>('');

  // Поиск по принтерам и пластику
  const [printerSearch, setPrinterSearch] = useState<string>('');
  const [filamentSearch, setFilamentSearch] = useState<string>('');

  // Параметры мини-калькулятора (полностью изолированы от прямого ввода, по умолчанию 0)
  const [isMiniCalcOpen, setIsMiniCalcOpen] = useState(false);
  const [calcWeight, setCalcWeight] = useState<string>('0');
  const [calcHours, setCalcHours] = useState<string>('0');
  const [calcMinutes, setCalcMinutes] = useState<string>('0');
  const [calcMarkup, setCalcMarkup] = useState<string>('0');
  const [calcLaborMinutes, setCalcLaborMinutes] = useState<string>('0');
  const [calcLaborRate, setCalcLaborRate] = useState<string>('');
  const [calcDefect, setCalcDefect] = useState<string>('0');
  const [calcIsOwnerLabor, setCalcIsOwnerLabor] = useState<boolean>(true);
  const [calcUrgencyPct, setCalcUrgencyPct] = useState<number>(0);
  const [calcDiscountPct, setCalcDiscountPct] = useState<number>(0);
  const [calcCustomCosts, setCalcCustomCosts] = useState<CustomCostItem[]>([]);
  const [calcAppliedFeedback, setCalcAppliedFeedback] = useState<boolean>(false);
  // Прямой ввод себестоимости и дополнительные расходы
  const [manualBaseCost, setManualBaseCost] = useState<string>('0');
  const [extraCostItems, setExtraCostItems] = useState<CostItem[]>([]);
  const [customExtraOptions, setCustomExtraOptions] = useState<DirectExtraOption[]>([]);
  const [customCostCategoryInput, setCustomCostCategoryInput] = useState<string>('');
  const [customCostAmountInput, setCustomCostAmountInput] = useState<string>('');
  const [isAddingCustomCost, setIsAddingCustomCost] = useState<boolean>(false);

  // Опции контактов клиента (в стиле дополнительных расходов)
  const defaultContactOptions: { type: ContactType; label: string; placeholder: string; isCustom?: boolean }[] = useMemo(() => [
    { type: 'phone', label: 'Телефон', placeholder: '+7 999 000-00-00' },
    { type: 'telegram', label: 'Telegram', placeholder: '@username или https://t.me/...' },
    { type: 'whatsapp', label: 'WhatsApp', placeholder: '+7 999 000-00-00' },
    { type: 'vk', label: 'VK', placeholder: 'vk.com/id...' },
    { type: 'email', label: 'Email', placeholder: 'client@example.com' },
    { type: 'other', label: 'Адрес / СДЭК', placeholder: 'г. Москва, ПВЗ СДЭК...' },
  ], []);

  const [customContactOptions, setCustomContactOptions] = useState<{ type: ContactType; label: string; placeholder: string; isCustom?: boolean }[]>([]);
  const [isAddingCustomContact, setIsAddingCustomContact] = useState<boolean>(false);
  const [customContactLabelInput, setCustomContactLabelInput] = useState<string>('');

  const allDirectContactOptions = useMemo(() => {
    return [...defaultContactOptions, ...customContactOptions];
  }, [defaultContactOptions, customContactOptions]);

  const handleToggleContact = (type: ContactType, label: string) => {
    if (!order) return;
    const current = order.contacts || [];
    const exists = current.find(c => c.label === label || (!c.label && c.type === type && label === defaultContactOptions.find(d => d.type === type)?.label));
    if (exists) {
      const updated = current.filter(c => c !== exists);
      setOrder({ ...order, contacts: updated });
    } else {
      const updated = [...current, { type, label, value: '' }];
      setOrder({ ...order, contacts: updated });
    }
  };

  const handleUpdateContactValue = (type: ContactType, label: string, val: string) => {
    if (!order) return;
    const current = [...(order.contacts || [])];
    const idx = current.findIndex(c => c.label === label || (!c.label && c.type === type && label === defaultContactOptions.find(d => d.type === type)?.label));
    if (idx >= 0) {
      current[idx] = { ...current[idx], value: val };
    } else {
      current.push({ type, label, value: val });
    }
    setOrder({ ...order, contacts: current });
  };

  const handleCreateCustomContactOption = () => {
    const trimmed = customContactLabelInput.trim();
    if (!trimmed) {
      setIsAddingCustomContact(false);
      return;
    }
    if (!allDirectContactOptions.some(o => o.label.toLowerCase() === trimmed.toLowerCase())) {
      setCustomContactOptions(prev => [...prev, { type: 'other', label: trimmed, placeholder: 'Контактные данные...', isCustom: true }]);
      if (order) {
        setOrder({ ...order, contacts: [...(order.contacts || []), { type: 'other', label: trimmed, value: '' }] });
      }
    }
    setCustomContactLabelInput('');
    setIsAddingCustomContact(false);
  };

  const handleDeleteCustomContactOption = (label: string) => {
    setCustomContactOptions(prev => prev.filter(o => o.label !== label));
    if (order && order.contacts) {
      setOrder({ ...order, contacts: order.contacts.filter(c => c.label !== label) });
    }
  };

  // Категории для Расходов
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>([]);
  const [isAddingExpenseCat, setIsAddingExpenseCat] = useState<boolean>(false);
  const [newExpenseCatInput, setNewExpenseCatInput] = useState<string>('');
  const [expenseCatSearch, setExpenseCatSearch] = useState<string>('');

  const allExpenseCategories = useMemo(() => {
    return [...DEFAULT_EXPENSE_CATEGORIES, ...customExpenseCategories];
  }, [customExpenseCategories]);

  const filteredExpenseCategories = useMemo(() => {
    if (!expenseCatSearch.trim()) return allExpenseCategories;
    const q = expenseCatSearch.toLowerCase().trim();
    return allExpenseCategories.filter(c => c.toLowerCase().includes(q));
  }, [allExpenseCategories, expenseCatSearch]);

  const handleCreateCustomExpenseCat = () => {
    const trimmed = newExpenseCatInput.trim();
    if (!trimmed) {
      setIsAddingExpenseCat(false);
      return;
    }
    if (!allExpenseCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setCustomExpenseCategories(prev => [...prev, trimmed]);
      if (order) {
        setOrder({ ...order, client: trimmed });
      }
    }
    setNewExpenseCatInput('');
    setIsAddingExpenseCat(false);
  };

  const handleDeleteCustomExpenseCat = (cat: string) => {
    setCustomExpenseCategories(prev => prev.filter(c => c !== cat));
    if (order && order.client === cat) {
      setOrder({ ...order, client: DEFAULT_EXPENSE_CATEGORIES[0] });
    }
  };

  // Список предыдущих расходов для автозаполнения
  const pastExpensesList = useMemo(() => {
    const realExpenses = (allOrders || [])
      .filter(o => o.type === 'expense' && o.title && o.title.trim().length > 0)
      .map(o => ({
        id: o.id || o.title,
        title: o.title,
        amount: o.amount || 0,
        client: o.client || DEFAULT_EXPENSE_CATEGORIES[0],
        notes: o.notes || '',
        date: o.date || '',
      }));

    // Дедупликация по названию расхода
    const uniqueMap = new Map<string, typeof realExpenses[0]>();
    for (const item of realExpenses) {
      const key = item.title.toLowerCase().trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }

    const existingReal = Array.from(uniqueMap.values());
    if (existingReal.length > 0) {
      return existingReal;
    }
    return DEFAULT_PRESET_EXPENSES;
  }, [allOrders]);

  const filteredPastExpenses = useMemo(() => {
    if (!expenseHistorySearchQuery.trim()) return pastExpensesList;
    const q = expenseHistorySearchQuery.toLowerCase().trim();
    return pastExpensesList.filter(
      e => e.title.toLowerCase().includes(q) || (e.client && e.client.toLowerCase().includes(q))
    );
  }, [pastExpensesList, expenseHistorySearchQuery]);

  const handleSelectPastExpense = (exp: { title: string; amount: number; client?: string; notes?: string }) => {
    if (!order) return;
    setOrder({
      ...order,
      type: 'expense',
      title: exp.title,
      amount: exp.amount,
      client: exp.client || DEFAULT_EXPENSE_CATEGORIES[0],
      notes: exp.notes || '',
    });
  };

  const [initialSnapshot, setInitialSnapshot] = useState('');
  const isClosingRef = useRef(false);

  const initializeModal = useEffectEvent(() => {
    setActiveTab('item');
    setIsMiniCalcOpen(false);
    setPrinterSearch('');
    setFilamentSearch('');
    setFormErrors({});

    // Сброс всех полей мини-калькулятора в 0
    setCalcWeight('0');
    setCalcHours('0');
    setCalcMinutes('0');
    setCalcMarkup('0');
    setCalcLaborMinutes('0');
    setCalcLaborRate(settings?.labor_rate_per_hour ? String(settings.labor_rate_per_hour) : '600');
    setCalcDefect('0');
    setCalcIsOwnerLabor(settings?.is_owner_labor_default ?? true);
    setCalcUrgencyPct(0);
    setCalcDiscountPct(0);
    setCalcCustomCosts([]);
    setCalcAppliedFeedback(false);

    if (order) {
      setInitialSnapshot(JSON.stringify(order));

      // Инициализация базовой себестоимости и доп. расходов
      if (order.cost_items && order.cost_items.length > 0) {
        const baseItem = order.cost_items.find(i => i.category === 'Печать' || i.category === 'Базовая себестоимость');
        const extras = baseItem ? order.cost_items.filter(i => i !== baseItem) : order.cost_items;
        setManualBaseCost(String(baseItem ? (baseItem.amount || 0) : (order.cost || 0)));
        setExtraCostItems(extras);

        // Любые кастомные статьи, которых нет в стандартных 5
        const customFound = extras.filter(
          ex => !DEFAULT_DIRECT_EXTRA_OPTIONS.some(d => d.category === ex.category)
        );
        setCustomExtraOptions(customFound.map(cf => ({
          id: cf.id || cf.category,
          category: cf.category,
          defaultAmount: cf.amount || 100,
          isCustom: true,
        })));
      } else {
        setManualBaseCost(String(order.cost || 0));
        setExtraCostItems([]);
        setCustomExtraOptions([]);
      }

      // Извлекаем выбранный принтер
      const notesStr = order.notes || '';
      const printerMatch = notesStr.match(/\[Принтер:\s*([^\]]+)\]/);
      if (printerMatch && printerMatch[1]) {
        setSelectedPrinter(printerMatch[1].trim());
      } else {
        const matchedP = printers.find(p => notesStr.includes(p.name));
        setSelectedPrinter(matchedP ? matchedP.name : '');
      }

      // Извлекаем выбранный пластик
      const filamentMatch = notesStr.match(/\[Пластик:\s*([^\]]+)\]/);
      if (filamentMatch && filamentMatch[1]) {
        setSelectedFilament(filamentMatch[1].trim());
      } else {
        const matchedF = filaments.find(f => notesStr.includes(f.name));
        setSelectedFilament(matchedF ? matchedF.name : '');
      }
    } else {
      setInitialSnapshot('');
      setSelectedPrinter('');
      setSelectedFilament('');
      setManualBaseCost('0');
      setExtraCostItems([]);
    }
  });

  // Живые часы в шапке
  useEffect(() => {
    if (!isOpen) return;
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const updateTime = () => {
      setCurrentTimeStr(`${formatter.format(new Date())} MSK`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Блокировка прокрутки фона
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false;
      queueMicrotask(initializeModal);
    }
  }, [isOpen, order?.id, printers, filaments, settings]);

  const liveFilament = useMemo(() => {
    if (selectedFilament) {
      const found = filaments.find(f => f.name === selectedFilament);
      if (found) return found;
    }
    return filaments[0] || null;
  }, [filaments, selectedFilament]);

  const livePrinter = useMemo(() => {
    if (selectedPrinter) {
      const found = printers.find(p => p.name === selectedPrinter);
      if (found) return found;
    }
    return printers[0] || null;
  }, [printers, selectedPrinter]);

  const allDirectExtraOptions = useMemo(() => {
    const combined = [...DEFAULT_DIRECT_EXTRA_OPTIONS, ...customExtraOptions];
    extraCostItems.forEach(item => {
      if (!combined.some(c => c.category === item.category)) {
        combined.push({
          id: item.id || item.category,
          category: item.category,
          defaultAmount: item.amount || 100,
          isCustom: true,
        });
      }
    });
    return combined;
  }, [customExtraOptions, extraCostItems]);

  const miniCalcResult = useMemo(() => {
    const w = parseFloat(calcWeight) || 0;
    const h = parseInt(calcHours) || 0;
    const m = parseInt(calcMinutes) || 0;
    const qty = order?.quantity || 1;
    const markup = parseFloat(calcMarkup) || 0;
    const laborMin = parseInt(calcLaborMinutes) || 0;
    const laborRate = parseFloat(calcLaborRate) || (settings?.labor_rate_per_hour || 600);
    const defect = parseFloat(calcDefect) || 0;

    return calculateCost({
      weightG: w,
      hours: h,
      minutes: m,
      laborMinutes: laborMin,
      laborRatePerHour: laborRate,
      isOwnerLabor: calcIsOwnerLabor,
      markupPercent: markup,
      defectPercent: defect,
      discountPercent: calcDiscountPct,
      urgencyPercent: calcUrgencyPct,
      customCostItems: calcCustomCosts,
      quantity: qty,
      filament: liveFilament,
      printer: livePrinter,
      settings: settings || null,
    });
  }, [
    calcWeight,
    calcHours,
    calcMinutes,
    calcMarkup,
    calcLaborMinutes,
    calcLaborRate,
    calcDefect,
    calcIsOwnerLabor,
    calcUrgencyPct,
    calcDiscountPct,
    calcCustomCosts,
    order?.quantity,
    liveFilament,
    livePrinter,
    settings
  ]);

  const filteredPrinters = useMemo(() => {
    if (!printerSearch.trim()) return printers;
    const q = printerSearch.toLowerCase().trim();
    return printers.filter(p => p.name.toLowerCase().includes(q));
  }, [printers, printerSearch]);

  const filteredFilaments = useMemo(() => {
    if (!filamentSearch.trim()) return filaments;
    const q = filamentSearch.toLowerCase().trim();
    return filaments.filter(f => f.name.toLowerCase().includes(q) || (f.color && f.color.toLowerCase().includes(q)));
  }, [filaments, filamentSearch]);

  const hasUnsavedChanges = useMemo(() => {
    if (!isOpen || !order || !initialSnapshot) return false;
    return JSON.stringify(order) !== initialSnapshot;
  }, [initialSnapshot, isOpen, order]);

  const handleAttemptClose = () => {
    if (isClosingRef.current) return;
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      isClosingRef.current = true;
      onClose();
    }
  };

  const handleConfirmDiscardAndClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setShowUnsavedWarning(false);
    onClose();
  };

  const handleShortcutKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape' && !showUnsavedWarning) {
      e.preventDefault();
      handleAttemptClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      document.getElementById('order-modal-save')?.click();
    }
  });

  const daysBetweenDates = useMemo(() => {
    if (!order?.date || !order?.deadline) return null;
    const p1 = order.date.split('.');
    const p2 = order.deadline.split('.');
    if (p1.length !== 3 || p2.length !== 3) return null;
    const d1 = new Date(Number(p1[2]), Number(p1[1]) - 1, Number(p1[0]));
    const d2 = new Date(Number(p2[2]), Number(p2[1]) - 1, Number(p2[0]));
    const diffTime = d2.getTime() - d1.getTime();
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  }, [order]);

  // Навигация по разделам колёсиком мыши
  const lastWheelTimeRef = useRef<number>(0);

  const handleWheelNavigation = (e: React.WheelEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.tagName === 'SELECT') {
      return;
    }

    // Если курсор находится над любым внутренним списком с прокруткой, не переключаем разделы
    const scrollableElement = target.closest('.overflow-y-auto, .overflow-auto, [data-scrollable="true"]');
    if (scrollableElement) {
      return;
    }

    const now = Date.now();
    if (now - lastWheelTimeRef.current < 260) return;

    const isIncomeType = order?.type === 'income' || (!order?.type && true);
    const tabs = isIncomeType ? ORDER_TABS : EXPENSE_TABS;
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex === -1) return;

    if (e.deltaY > 15) {
      // Прокрутка вниз -> следующий раздел
      if (currentIndex < tabs.length - 1) {
        lastWheelTimeRef.current = now;
        setActiveTab(tabs[currentIndex + 1].id);
      }
    } else if (e.deltaY < -15) {
      // Прокрутка вверх -> предыдущий раздел
      if (currentIndex > 0) {
        lastWheelTimeRef.current = now;
        setActiveTab(tabs[currentIndex - 1].id);
      }
    }
  };

  // Хоткеи
  useEffect(() => {
    window.addEventListener('keydown', handleShortcutKeyDown);
    return () => window.removeEventListener('keydown', handleShortcutKeyDown);
  }, []);

  if (!order) return null;

  const isIncome = order.type === 'income' || (!order.type && true);
  const financials = calculateOrderFinancials(order);
  const totalAmount = financials.finalAmount || 0;
  const costVal = order.cost || 0;
  const profitVal = roundTo2(isIncome ? totalAmount - costVal : -totalAmount);
  const remainingDebt = Math.max(0, roundTo2(totalAmount - (order.payment || 0)));
  const marginPercent = totalAmount > 0 && isIncome ? (profitVal / totalAmount) * 100 : 0;
  const paymentRatio = totalAmount > 0 ? Math.min(1, Math.max(0, (order.payment || 0) / totalAmount)) : 0;

  const tabsList = isIncome ? ORDER_TABS : EXPENSE_TABS;

  const filteredProducts = (savedCalculations || []).filter(item => {
    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase();
      const matchesName = item.name?.toLowerCase().includes(q);
      const matchesCategory = item.category?.toLowerCase().includes(q);
      const matchesFilament = item.filament_name?.toLowerCase().includes(q);
      const matchesCollection = item.collection_name?.toLowerCase().includes(q);
      const matchesTags = item.tags?.some(t => t.toLowerCase().includes(q));
      if (!matchesName && !matchesCategory && !matchesFilament && !matchesCollection && !matchesTags) {
        return false;
      }
    }
    return true;
  });

  const handleUpdateBaseAmount = (valStr: string) => {
    const cleanStr = valStr.replace(/^0+([1-9])/, '$1');
    const newBase = cleanStr === '' ? 0 : roundTo2(Number(cleanStr));

    const newFin = calculateOrderFinancials({
      ...order,
      base_amount: newBase,
    });

    setOrder({
      ...order,
      base_amount: newBase,
      amount: newFin.finalAmount,
      payment: order.payment || 0,
      payments: order.payments,
    });
  };

  const handleApplyUrgency = (type: 'percent' | 'fixed', val: number) => {
    const isFixed = type === 'fixed';
    const isSame = !isFixed ? order.urgency_percent === val && !order.urgency_amount : order.urgency_amount === val;
    const targetVal = isSame ? 0 : val;

    const updated = {
      ...order,
      urgency_type: type,
      urgency_percent: !isFixed ? targetVal : 0,
      urgency_amount: isFixed ? targetVal : 0,
    };
    const newFin = calculateOrderFinancials(updated);
    setOrder({
      ...updated,
      amount: newFin.finalAmount,
      payment: order.payment || 0,
      payments: order.payments,
    });
  };

  const handleApplyDiscount = (type: 'percent' | 'fixed', val: number) => {
    const isFixed = type === 'fixed';
    const isSame = !isFixed ? order.discount_percent === val && !order.discount_amount : order.discount_amount === val;
    const targetVal = isSame ? 0 : val;

    const updated = {
      ...order,
      discount_type: type,
      discount_percent: !isFixed ? targetVal : 0,
      discount_amount: isFixed ? targetVal : 0,
    };
    const newFin = calculateOrderFinancials(updated);
    setOrder({
      ...updated,
      amount: newFin.finalAmount,
      payment: order.payment || 0,
      payments: order.payments,
    });
  };

  const handleQuantityChange = (newQty: number) => {
    const prevQty = Math.max(1, Number(order.quantity) || 1);
    const targetQty = Math.max(1, newQty);
    if (prevQty === targetQty) return;

    const ratio = targetQty / prevQty;
    const currentBase = order.base_amount !== undefined ? order.base_amount : (order.amount || 0);
    const newBase = roundTo2(currentBase * ratio);

    const newFin = calculateOrderFinancials({
      ...order,
      base_amount: newBase,
      urgency_amount: order.urgency_amount,
      discount_amount: order.discount_amount,
    });

    const newAmount = newFin.finalAmount;
    const currentCost = order.cost || 0;
    const newCost = roundTo2(currentCost * ratio);

    const newCostItems = (order.cost_items || []).map(ci => ({
      ...ci,
      amount: roundTo2((ci.amount || 0) * ratio),
    }));

    setOrder({
      ...order,
      quantity: targetQty,
      base_amount: newBase,
      amount: newAmount,
      cost: newCost,
      payment: order.payment || 0,
      payments: order.payments,
      cost_items: newCostItems,
    });
  };

  const handleApplyPaymentPreset = (ratio: number) => {
    const targetPayment = roundTo2(totalAmount * ratio);
    const payments = [...(order.payments || [])];
    if (payments.length === 0) {
      if (targetPayment !== 0) payments.push(targetPayment);
    } else {
      const priorTotal = payments.reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : value.amount || 0), 0);
      const lastIdx = payments.length - 1;
      const last = payments[lastIdx];
      const lastAmt = typeof last === 'number' ? last : (last.amount || 0);
      const newAmt = roundTo2(lastAmt + targetPayment - priorTotal);
      if (typeof last === 'number') {
        payments[lastIdx] = newAmt;
      } else {
        payments[lastIdx] = { ...last, amount: newAmt };
      }
    }
    setOrder({
      ...order,
      payment: targetPayment,
      payments,
    });
  };

  const handlePaymentTotalChange = (targetPayment: number) => {
    const safePayment = Math.max(0, roundTo2(targetPayment));
    const payments = [...(order.payments || [])];
    if (payments.length === 0) {
      if (safePayment !== 0) payments.push(safePayment);
    } else {
      const priorTotal = payments.reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : value.amount || 0), 0);
      const lastIdx = payments.length - 1;
      const last = payments[lastIdx];
      const lastAmt = typeof last === 'number' ? last : (last.amount || 0);
      const newAmt = roundTo2(lastAmt + safePayment - priorTotal);
      if (typeof last === 'number') {
        payments[lastIdx] = newAmt;
      } else {
        payments[lastIdx] = { ...last, amount: newAmt };
      }
    }
    setOrder({ ...order, payment: safePayment, payments });
  };

  const handleSelectProduct = (prod: SavedCalculation) => {
    const orderQty = Math.max(1, Number(order.quantity) || 1);
    const itemQty = Math.max(1, prod.quantity || 1);
    const unitPrice = roundTo2((prod.final_price || prod.base_cost || 0) / itemQty);
    const unitCost = roundTo2((prod.base_cost || 0) / itemQty);
    const amount = roundTo2(unitPrice * orderQty);
    const cost = roundTo2(unitCost * orderQty);

    const populatedCostItems: CostItem[] = [];
    if (cost > 0) {
      populatedCostItems.push({
        id: crypto.randomUUID(),
        category: 'Печать',
        amount: cost,
        note: `Товар «${prod.name}» (${prod.filament_name || 'Пластик'})`,
      });
    }

    const inDays = new Date();
    inDays.setDate(inDays.getDate() + 2);
    const deadlineStr = `${String(inDays.getDate()).padStart(2, '0')}.${String(inDays.getMonth() + 1).padStart(2, '0')}.${inDays.getFullYear()}`;

    const newFin = calculateOrderFinancials({
      ...order,
      base_amount: amount,
    });

    if (prod.filament_name) setSelectedFilament(prod.filament_name);
    if (prod.printer_name) setSelectedPrinter(prod.printer_name);
    if (prod.weight_g) setCalcWeight(String(prod.weight_g));
    if (prod.hours) setCalcHours(String(prod.hours));
    if (prod.minutes) setCalcMinutes(String(prod.minutes));
    setManualBaseCost(String(cost));

    setOrder({
      ...order,
      product_id: prod.id,
      title: prod.name,
      base_amount: amount,
      amount: newFin.finalAmount,
      cost,
      cost_items: populatedCostItems,
      payments: order.payments || [],
      payment: order.payment || 0,
      deadline: order.deadline || deadlineStr,
      notes: `Товар: ${prod.name} (${prod.filament_name || 'Пластик'}, ${orderQty} шт)`,
    });
  };

  // Выбор принтера
  const handleSelectPrinter = (printerName: string) => {
    if (!order) return;
    const currentNotes = order.notes || '';
    const isAlreadySelected = selectedPrinter === printerName;
    const nextPrinter = isAlreadySelected ? '' : printerName;
    setSelectedPrinter(nextPrinter);

    // Удаляем старый тег [Принтер: ...] если был
    let cleanNotes = currentNotes.replace(/\[Принтер:[^\]]*\]/g, '').trim();

    if (nextPrinter) {
      cleanNotes = cleanNotes ? `${cleanNotes} [Принтер: ${nextPrinter}]` : `[Принтер: ${nextPrinter}]`;
    }

    setOrder({
      ...order,
      notes: cleanNotes,
    });
  };

  // Выбор пластика
  const handleSelectFilament = (filamentName: string) => {
    if (!order) return;
    const currentNotes = order.notes || '';
    const isAlreadySelected = selectedFilament === filamentName;
    const nextFilament = isAlreadySelected ? '' : filamentName;
    setSelectedFilament(nextFilament);

    // Удаляем старый тег [Пластик: ...] если был
    let cleanNotes = currentNotes.replace(/\[Пластик:[^\]]*\]/g, '').trim();

    if (nextFilament) {
      cleanNotes = cleanNotes ? `${cleanNotes} [Пластик: ${nextFilament}]` : `[Пластик: ${nextFilament}]`;
    }

    setOrder({
      ...order,
      notes: cleanNotes,
    });
  };

  const isPrinterSelected = (printerName: string) => {
    return selectedPrinter === printerName;
  };

  const isFilamentSelected = (filamentName: string) => {
    return selectedFilament === filamentName;
  };

  // Обновление базовой себестоимости вручную
  const handleUpdateManualBaseCost = (val: string) => {
    setManualBaseCost(val);
    const baseNum = parseFloat(val) || 0;
    const extraSum = extraCostItems.reduce((acc, it) => acc + (it.amount || 0), 0);
    const totalCost = roundTo2(baseNum + extraSum);
    const baseItem: CostItem = { id: 'base-print', category: 'Печать', amount: baseNum };
    setOrder({
      ...order,
      cost: totalCost,
      cost_items: [baseItem, ...extraCostItems],
    });
  };

  // Быстрое переключение/добавление предопределенной статьи расхода
  const handleToggleExtraCostCategory = (category: string, defaultAmount: number = 100) => {
    const existingIndex = extraCostItems.findIndex(it => it.category === category);
    let updated: CostItem[];
    if (existingIndex >= 0) {
      updated = extraCostItems.filter((_, idx) => idx !== existingIndex);
    } else {
      const newItem: CostItem = {
        id: crypto.randomUUID(),
        category,
        amount: defaultAmount,
      };
      updated = [...extraCostItems, newItem];
    }
    setExtraCostItems(updated);
    const baseNum = parseFloat(manualBaseCost) || 0;
    const extraSum = updated.reduce((acc, it) => acc + (it.amount || 0), 0);
    const totalCost = roundTo2(baseNum + extraSum);
    const baseItem: CostItem = { id: 'base-print', category: 'Печать', amount: baseNum };
    setOrder({
      ...order,
      cost: totalCost,
      cost_items: [baseItem, ...updated],
    });
  };

  // Изменение суммы конкретного доп. расхода по названию категории
  const handleUpdateExtraCostCategoryAmount = (category: string, newAmount: number) => {
    const updated = extraCostItems.map(it => it.category === category ? { ...it, amount: newAmount } : it);
    setExtraCostItems(updated);
    const baseNum = parseFloat(manualBaseCost) || 0;
    const extraSum = updated.reduce((acc, it) => acc + (it.amount || 0), 0);
    const totalCost = roundTo2(baseNum + extraSum);
    const baseItem: CostItem = { id: 'base-print', category: 'Печать', amount: baseNum };
    setOrder({
      ...order,
      cost: totalCost,
      cost_items: [baseItem, ...updated],
    });
  };

  // Создание произвольного доп. расхода
  const handleCreateCustomExtraCostItem = () => {
    const cat = customCostCategoryInput.trim();
    const amt = parseFloat(customCostAmountInput) || 0;
    if (!cat) return;

    // Добавляем в список кастомных опций
    if (!customExtraOptions.some(o => o.category === cat)) {
      setCustomExtraOptions(prev => [...prev, { id: String(Date.now()), category: cat, defaultAmount: amt || 100, isCustom: true }]);
    }

    if (amt > 0) {
      const newItem: CostItem = {
        id: crypto.randomUUID(),
        category: cat,
        amount: amt,
      };
      const updated = [...extraCostItems.filter(i => i.category !== cat), newItem];
      setExtraCostItems(updated);
      const baseNum = parseFloat(manualBaseCost) || 0;
      const extraSum = updated.reduce((acc, it) => acc + (it.amount || 0), 0);
      const totalCost = roundTo2(baseNum + extraSum);
      const baseItem: CostItem = { id: 'base-print', category: 'Печать', amount: baseNum };
      setOrder({
        ...order,
        cost: totalCost,
        cost_items: [baseItem, ...updated],
      });
    }

    setCustomCostCategoryInput('');
    setCustomCostAmountInput('');
    setIsAddingCustomCost(false);
  };

  // Удаление кастомной опции расхода
  const handleDeleteCustomExtraCategory = (category: string) => {
    setCustomExtraOptions(prev => prev.filter(o => o.category !== category));
    const updated = extraCostItems.filter(it => it.category !== category);
    setExtraCostItems(updated);
    const baseNum = parseFloat(manualBaseCost) || 0;
    const extraSum = updated.reduce((acc, it) => acc + (it.amount || 0), 0);
    const totalCost = roundTo2(baseNum + extraSum);
    const baseItem: CostItem = { id: 'base-print', category: 'Печать', amount: baseNum };
    setOrder({
      ...order,
      cost: totalCost,
      cost_items: [baseItem, ...updated],
    });
  };

  // Ручное применение расчёта калькулятора в заказ (только по нажатию кнопки пользователем)
  const handleApplyCalculationToOrder = () => {
    if (!order) return;
    const newCost = roundTo2(miniCalcResult.totalBaseCost);
    const newFinalPrice = roundTo2(miniCalcResult.totalFinalPrice);
    const newBaseAmount = roundTo2(miniCalcResult.baseRetailPrice || (newFinalPrice / Math.max(0.01, (1 + calcUrgencyPct / 100) * (1 - calcDiscountPct / 100))));

    // Базовые производственные затраты
    const baseProdCost = roundTo2(
      miniCalcResult.materialCost +
      miniCalcResult.electricityCost +
      miniCalcResult.depreciationCost +
      miniCalcResult.defectCost +
      (calcIsOwnerLabor ? 0 : miniCalcResult.laborCost)
    );

    // Дополнительные затраты из калькулятора
    const extraItems: CostItem[] = (calcCustomCosts || []).map(c => ({
      id: c.id,
      category: c.name,
      amount: roundTo2(c.amount * (c.isPerUnit ? (order.quantity || 1) : 1)),
    }));

    if (!calcIsOwnerLabor && miniCalcResult.laborCost > 0) {
      extraItems.push({ id: 'labor', category: 'Ручной труд', amount: roundTo2(miniCalcResult.laborCost) });
    }

    setManualBaseCost(String(baseProdCost));
    setExtraCostItems(extraItems);

    let currentNotes = order.notes || '';
    const specTag = `[Кальк: ${calcWeight}г, ${calcHours}ч ${calcMinutes}м, +${calcMarkup}%]`;
    if (currentNotes.includes('[Кальк:')) {
      currentNotes = currentNotes.replace(/\[Кальк:[^\]]*\]/g, specTag);
    } else {
      currentNotes = currentNotes ? `${currentNotes} ${specTag}` : specTag;
    }

    setOrder({
      ...order,
      cost: newCost,
      cost_items: [{ id: 'base-print', category: 'Печать', amount: baseProdCost }, ...extraItems],
      base_amount: newBaseAmount,
      amount: newFinalPrice,
      urgency_percent: calcUrgencyPct,
      discount_percent: calcDiscountPct,
      notes: currentNotes,
    });

    setCalcAppliedFeedback(true);
    setTimeout(() => setCalcAppliedFeedback(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;
    const errors: Record<string, boolean> = {};

    if (!order.title || !order.title.trim()) {
      errors.title = true;
    }
    if (order.amount === undefined || order.amount === null || isNaN(order.amount) || order.amount <= 0) {
      errors.amount = true;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (errors.title) {
        setActiveTab('item');
      } else if (errors.amount) {
        setActiveTab('pricing');
      }
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);
    try {
      const saved = await onSave(e);
      if (!saved) isClosingRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTabCompleted = (tabId: OrderModalTab): boolean => {
    if (tabId === 'item') {
      return Boolean(order.title && order.title.trim().length > 0);
    }
    if (tabId === 'pricing') {
      const amt = isIncome ? (order.base_amount !== undefined ? order.base_amount : order.amount) : order.amount;
      return Boolean(amt && amt > 0);
    }
    if (tabId === 'status') {
      return Boolean(order.status || order.deadline);
    }
    if (tabId === 'client') {
      return Boolean((order.client_name || order.contact || '').trim().length > 0);
    }
    if (tabId === 'tech') {
      return Boolean(order.notes && order.notes.trim().length > 0);
    }
    return false;
  };

  const completedTabsCount = tabsList.filter(t => isTabCompleted(t.id)).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none overflow-hidden">
          {/* Стеклянный темный бэкдроп с глубоким размытием */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            onClick={handleAttemptClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          />

          {/* Главное окно консоли в стиле Meridian Cockpit с эффектом взлета */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-modal-title"
            className="relative w-full max-w-[1240px] h-[92vh] max-h-[860px] min-h-[580px] my-auto rounded-2xl border border-white/20 bg-neutral-950/98 shadow-[0_30px_100px_rgba(0,0,0,0.95)] backdrop-blur-2xl overflow-hidden z-10 flex flex-col font-mono"
          >
            {/* 1. Верхняя панель (Cockpit Topbar: LEDs + Title + Type Switcher + live time) */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 bg-neutral-900/60 shrink-0 gap-3">
              {/* Левая часть: 3 терминальных кружка (красный, желтый, зеленый при наведении) + заголовок раздела */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="order-modal-save"
                    type="button"
                    onClick={handleAttemptClose}
                    title="Закрыть окно"
                    aria-label="Закрыть окно заказа"
                    className="w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#f87171] cursor-pointer border-none outline-none"
                  />
                  <button
                    type="button"
                    onClick={onMinimize ? onMinimize : undefined}
                    title="Свернуть черновик"
                    aria-label="Свернуть черновик заказа"
                    className={`w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#fbbf24] border-none outline-none ${
                      onMinimize ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-[#d4d4d8] min-w-0">
                  <span id="order-modal-title" className="text-[#d4d4d8] font-normal truncate">
                    {order?.id
                      ? (isIncome ? 'Редактирование заказа' : 'Редактирование расхода')
                      : (isIncome ? 'Новый заказ' : 'Новый расход')}
                  </span>
                  {order?.order_number && (
                    <>
                      <span className="text-[#52525b] shrink-0">·</span>
                      <span className="text-[#71717a] hidden sm:inline truncate">
                        #{order.order_number}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* ЦЕНТР ШАПКИ: Сегментированный переключатель Доход / Расход точно как в таблице */}
              <div className="bg-neutral-950/90 border border-white/10 p-1 rounded-xl h-9 flex items-center gap-1 shrink-0 shadow-inner">
                <button
                  type="button"
                  onClick={() => setOrder({ ...order, type: 'income' })}
                  className={`flex items-center gap-1.5 px-3 h-full rounded-lg text-xs font-medium cursor-pointer group ${
                    isIncome
                      ? 'bg-neutral-800 border border-white/15 text-white shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <TrendingUp className={`w-3.5 h-3.5 ${
                    isIncome ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'
                  }`} />
                  <span>Доход</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrder({ ...order, type: 'expense' })}
                  className={`flex items-center gap-1.5 px-3 h-full rounded-lg text-xs font-medium cursor-pointer group ${
                    !isIncome
                      ? 'bg-neutral-800 border border-white/15 text-white shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <TrendingDown className={`w-3.5 h-3.5 ${
                    !isIncome ? 'text-rose-400' : 'text-neutral-400 group-hover:text-white'
                  }`} />
                  <span>Расход</span>
                </button>
              </div>

              {/* Правая часть: Только системное время */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="font-mono text-xs text-[#71717a] tabular-nums">
                  {currentTimeStr || '16:47 MSK'}
                </div>
              </div>
            </div>

            {/* 2. Трёхколоночная рабочая консоль с поддержкой переключения разделов колёсиком */}
            <div
              onWheel={handleWheelNavigation}
              className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden"
            >

              {/* ========================================================================= */}
              {/* КОЛОНКА 1: РАЗДЕЛЫ ЗАКАЗА (SERVICES / НАВИГАЦИЯ)                          */}
              {/* ========================================================================= */}
              <div className="w-full lg:w-[240px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#222226] bg-[#111113] flex flex-col justify-between p-4 overflow-hidden select-none">
                <div className="space-y-3 flex-1 flex flex-col min-h-0">
                  {/* Список блоков заказа */}
                  <div className="space-y-1.5 shrink-0">
                    <div className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider font-semibold px-2">
                      РАЗДЕЛЫ ФОРМЫ
                    </div>

                    <div className="space-y-1">
                      {tabsList.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const isCompleted = isTabCompleted(tab.id);
                        const Icon = tab.icon;

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg font-mono text-xs cursor-pointer text-left select-none ${
                              isActive
                                ? 'text-white font-semibold'
                                : 'text-[#8e8e93] hover:text-white hover:bg-[#161619]'
                            }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="activeOrderFormModalTab"
                                className="absolute inset-0 rounded-lg bg-[#1e1e22] shadow-sm"
                                transition={{
                                  type: 'spring',
                                  stiffness: 450,
                                  damping: 32,
                                  mass: 0.8,
                                }}
                              />
                            )}
                            <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#71717a]'}`} />
                              <span className="truncate">{tab.code}</span>
                            </div>

                            {/* Индикаторная точка: зеленая если блок заполнен, серая если не заполнен */}
                            <span className={`relative z-10 w-2 h-2 rounded-full shrink-0 ml-2 ${
                              isCompleted
                                ? 'bg-[#34d399]'
                                : 'bg-[#36363c]'
                            }`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Встроенный интерактивный каталог 3D-моделей на всю высоту */}
                  {isIncome && savedCalculations && savedCalculations.length > 0 && (
                    <div className="pt-2.5 border-t border-[#1e1e24] space-y-1.5 flex-1 flex flex-col min-h-0">
                      <div className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider px-1 flex items-center justify-between shrink-0">
                        <span>КАТАЛОГ 3D-МОДЕЛЕЙ</span>
                        <span className="text-[#a1a1aa] text-[10px]">
                          {filteredProducts.length} из {savedCalculations.length}
                        </span>
                      </div>

                      {/* Поле живого поиска модели */}
                      <div className="relative w-full shrink-0">
                        <Search className="w-3 h-3 text-[#71717a] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Поиск модели..."
                          value={productSearchQuery}
                          onChange={e => setProductSearchQuery(e.target.value)}
                          className="w-full bg-[#161619] border border-[#27272c] focus:border-white/40 rounded-md pl-7 pr-6 py-1 text-xs text-white placeholder-[#52525b] font-mono focus:outline-none "
                        />
                        {productSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setProductSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Список моделей во всю оставшуюся высоту, без полосы прокрутки */}
                      <div
                        onWheel={(e) => e.stopPropagation()}
                        data-scrollable="true"
                        className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0 w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-contain"
                      >
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(prod => {
                            const isSelected = order.product_id === prod.id || order.title === prod.name;
                            const itemPrice = prod.final_price || prod.base_cost || 0;

                            return (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => handleSelectProduct(prod)}
                                className={`w-full py-1.5 px-2 rounded-lg font-mono text-left cursor-pointer border flex flex-col gap-0.5 group shrink-0 ${
                                  isSelected
                                    ? 'bg-[#1e1e22] text-white border-white/30 shadow-sm'
                                    : 'bg-[#141416]/70 border-[#222226] text-[#a1a1aa] hover:text-white hover:bg-[#18181c] hover:border-[#383840]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1.5 w-full">
                                  <span className="text-xs font-medium truncate text-white group-hover:text-white min-w-0 flex-1">
                                    {prod.name}
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-semibold shrink-0">
                                    {formatMoney(itemPrice)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-[#71717a] w-full">
                                  <span className="truncate min-w-0 flex-1 pr-1">
                                    {prod.filament_name || 'Пластик'}
                                  </span>
                                  <span className="shrink-0">{prod.weight_g ? `${prod.weight_g}г` : (prod.hours ? `${prod.hours}ч` : '')}</span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="text-[11px] text-[#71717a] py-3 px-1 text-center font-mono">
                            [ Модель не найдена ]
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Встроенный каталог «Расходы, которые уже были» (для расходов) */}
                  {!isIncome && (
                    <div className="pt-2.5 border-t border-[#1e1e24] space-y-1.5 flex-1 flex flex-col min-h-0">
                      <div className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider px-1 flex items-center justify-between shrink-0">
                        <span>РАСХОДЫ, КОТОРЫЕ БЫЛИ</span>
                        <span className="text-[#a1a1aa] text-[10px]">
                          {filteredPastExpenses.length} из {pastExpensesList.length}
                        </span>
                      </div>

                      {/* Поле живого поиска расхода */}
                      <div className="relative w-full shrink-0">
                        <Search className="w-3 h-3 text-[#71717a] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Поиск в истории..."
                          value={expenseHistorySearchQuery}
                          onChange={e => setExpenseHistorySearchQuery(e.target.value)}
                          className="w-full bg-[#161619] border border-[#27272c] focus:border-white/40 rounded-md pl-7 pr-6 py-1 text-xs text-white placeholder-[#52525b] font-mono focus:outline-none "
                        />
                        {expenseHistorySearchQuery && (
                          <button
                            type="button"
                            onClick={() => setExpenseHistorySearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Список прошлых расходов во всю оставшуюся высоту */}
                      <div
                        onWheel={(e) => e.stopPropagation()}
                        data-scrollable="true"
                        className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0 w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-contain"
                      >
                        {filteredPastExpenses.length > 0 ? (
                          filteredPastExpenses.map(exp => {
                            const isSelected = order.title === exp.title && Number(order.amount) === exp.amount;

                            return (
                              <button
                                key={exp.id}
                                type="button"
                                onClick={() => handleSelectPastExpense(exp)}
                                className={`w-full py-1.5 px-2 rounded-lg font-mono text-left cursor-pointer border flex flex-col gap-0.5 group shrink-0 ${
                                  isSelected
                                    ? 'bg-[#1e1e22] text-white border-white/30 shadow-sm'
                                    : 'bg-[#141416]/70 border-[#222226] text-[#a1a1aa] hover:text-white hover:bg-[#18181c] hover:border-[#383840]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1.5 w-full">
                                  <span className="text-xs font-medium truncate text-white group-hover:text-white min-w-0 flex-1">
                                    {exp.title}
                                  </span>
                                  <span className="text-[10px] text-[#f87171] font-semibold shrink-0">
                                    {formatMoney(exp.amount)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-[#71717a] w-full">
                                  <span className="truncate min-w-0 flex-1 pr-1">
                                    {exp.client || 'Расход'}
                                  </span>
                                  {exp.date && <span className="shrink-0 text-[9px] text-[#52525b]">{exp.date}</span>}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="text-[11px] text-[#71717a] py-3 px-1 text-center font-mono">
                            [ Расход не найден ]
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Нижняя системная плашка телеметрии: Название и шкала заполнения */}
                <div className="pt-3 border-t border-[#222226] space-y-1.5 shrink-0">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#71717a] uppercase tracking-wider px-1 font-semibold">
                    <span>3D LABS</span>
                    <span className="text-[#a1a1aa] font-medium text-[9px]">
                      {completedTabsCount}/{tabsList.length} РАЗД.
                    </span>
                  </div>

                  {/* Прогресс-линия заполненности формы */}
                  <div className="w-full h-1 bg-[#1c1c20] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        completedTabsCount === tabsList.length ? 'bg-[#34d399]' : 'bg-white'
                      }`}
                      style={{ width: `${Math.max(6, (completedTabsCount / tabsList.length) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* КОЛОНКА 2: ЦЕНТРАЛЬНАЯ РАБОЧАЯ ОБЛАСТЬ (ВВОД ДАННЫХ)                      */}
              {/* ========================================================================= */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#18181c] overflow-hidden">

                {/* Верхняя строка статуса раздела */}
                <div className="px-6 py-3 border-b border-[#26262b] flex items-center justify-between gap-3 bg-[#18181c] shrink-0">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-[#71717a] uppercase tracking-wider font-medium">
                      {activeTab === 'item' && (isIncome ? 'РАЗДЕЛ 01 · ИЗДЕЛИЕ, ТИРАЖ И ПАРАМЕТРЫ ПЕЧАТИ' : 'РАЗДЕЛ 01 · ДЕТАЛИ И КАТЕГОРИЯ РАСХОДА')}
                      {activeTab === 'pricing' && (isIncome ? 'РАЗДЕЛ 02 · ФИНАНСЫ, СЕБЕСТОИМОСТЬ И ОПЛАТА' : 'РАЗДЕЛ 02 · СУММА ЗАТРАТ И ДАТА ПЛАТЕЖА')}
                      {activeTab === 'status' && 'РАЗДЕЛ 03 · СРОКИ СДАЧИ И СТАТУС ВЫПОЛНЕНИЯ'}
                      {activeTab === 'client' && 'РАЗДЕЛ 04 · КЛИЕНТ, КАНАЛ СВЯЗИ И ДОСТАВКА'}
                      {activeTab === 'tech' && 'РАЗДЕЛ 03 · ЗАМЕТКИ, ЧЕК И ПОСТАВЩИК'}
                    </span>
                  </div>
                </div>

                {/* Контент центральной области без прокрутки */}
                <div className="flex-1 p-4 space-y-2.5 flex flex-col justify-between overflow-hidden">

                  <div className="space-y-3">
                    {/* Главная цифра Hero Stat / Нативный минималистичный ввод */}
                    <div className="space-y-1">
                      {/* ========================================================================= */}
                      {/* РАЗДЕЛ 1: ИЗДЕЛИЕ, ТИРАЖ И ПАРАМЕТРЫ ПЕЧАТИ                               */}
                      {/* ========================================================================= */}
                      {activeTab === 'item' && (
                        <div className="space-y-2.5">
                          {isIncome ? (
                            <>
                              {/* 1. Наименование изделия */}
                              <div className="flex items-center gap-2 pb-0.5">
                                <input
                                  type="text"
                                  placeholder="Введите наименование изделия..."
                                  value={order.title || ''}
                                  onChange={e => {
                                    setOrder({ ...order, title: e.target.value });
                                    if (formErrors.title) {
                                      setFormErrors({ ...formErrors, title: false });
                                    }
                                  }}
                                  className="bg-transparent border-none focus:outline-none p-0 text-xl sm:text-2xl font-light font-mono text-white placeholder-[#52525b] w-full tracking-tight"
                                />
                              </div>

                              {/* 2. Тираж партии + Слайдер и Пресеты */}
                              <div className="space-y-1 max-w-xl">
                                <div className="flex items-baseline gap-2.5">
                                  {/* Поле ввода цифры */}
                                  <input
                                    type="number"
                                    min="1"
                                    max="9999"
                                    value={order.quantity || 1}
                                    onChange={e => handleQuantityChange(parseInt(e.target.value) || 1)}
                                    className="text-4xl sm:text-5xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
                                    style={{ width: `${Math.max(1, String(order.quantity || 1).length) * 0.65 + 0.15}em` }}
                                  />

                                  {/* Вертикальные кнопки + сверху и - снизу */}
                                  <div className="flex flex-col items-center justify-center font-mono select-none self-center leading-none">
                                    <button
                                      type="button"
                                      onClick={() => handleQuantityChange((order.quantity || 1) + 1)}
                                      className="w-4 h-4 flex items-center justify-center text-sm font-bold text-[#71717a] hover:text-white cursor-pointer leading-none"
                                      title="Увеличить на 1"
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuantityChange(Math.max(1, (order.quantity || 1) - 1))}
                                      disabled={(order.quantity || 1) <= 1}
                                      className="w-4 h-4 flex items-center justify-center text-sm font-bold text-[#71717a] hover:text-white disabled:text-[#3f3f46] disabled:cursor-not-allowed cursor-pointer leading-none"
                                      title="Уменьшить на 1"
                                    >
                                      −
                                    </button>
                                  </div>

                                  <span className="text-sm text-[#71717a] font-mono select-none">шт тираж</span>
                                </div>

                                <PhysicsQuantitySlider
                                  value={order.quantity || 1}
                                  onChange={handleQuantityChange}
                                />
                              </div>

                              {/* 3. Оборудование и материал: 3D-принтер (слева 50%) и Пластик/Филамент (справа 50%) */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start pt-2.5 border-t border-[#222226]">
                                {/* 3D-Принтер для печати (из раздела Принтеры) */}
                                <div className="space-y-1.5 select-none font-mono">
                                  <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                    <span className="flex items-center gap-1.5">
                                      <Printer className="w-3.5 h-3.5 text-[#a1a1aa]" />
                                      <span>3D-ПРИНТЕР</span>
                                    </span>
                                    <span className="text-[#52525b] lowercase text-[10px]">
                                      {printers.length > 0 ? `${filteredPrinters.length} из ${printers.length}` : 'пресеты'}
                                    </span>
                                  </div>

                                  {/* Поле поиска принтера */}
                                  <div className="relative w-full">
                                    <Search className="w-3 h-3 text-[#71717a] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                      type="text"
                                      placeholder="Поиск принтера..."
                                      value={printerSearch}
                                      onChange={e => setPrinterSearch(e.target.value)}
                                      className="w-full bg-[#18181b] border border-[#27272c] focus:border-white/40 rounded-md pl-7 pr-6 py-0.5 text-xs text-white placeholder-[#52525b] font-mono focus:outline-none "
                                    />
                                    {printerSearch && (
                                      <button
                                        type="button"
                                        onClick={() => setPrinterSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white cursor-pointer"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Список принтеров */}
                                  <div className="flex flex-col items-start gap-1 pt-0.5 max-h-[285px] md:max-h-[300px] overflow-y-auto scrollbar-none pr-2 w-full">
                                    {filteredPrinters.length > 0 ? (
                                      filteredPrinters.map(p => {
                                        const isSelected = isPrinterSelected(p.name);
                                        return (
                                          <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleSelectPrinter(p.name)}
                                            className={`flex items-center gap-2.5 py-0.5 text-xs font-mono cursor-pointer text-left w-full ${
                                              isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-[#d4d4d8]'
                                            }`}
                                          >
                                            <span
                                              className="w-2 h-2 rounded-full shrink-0"
                                              style={{ backgroundColor: p.color || (isSelected ? '#ffffff' : '#38bdf8') }}
                                            />
                                            <span className="relative inline-flex items-center max-w-full">
                                              <span className="truncate">{p.name}</span>
                                              <HandDrawnUnderline isSelected={isSelected} />
                                            </span>
                                          </button>
                                        );
                                      })
                                    ) : printers.length > 0 ? (
                                      <div className="text-xs text-[#71717a] py-1 font-mono">
                                        [ Принтер «{printerSearch}» не найден ]
                                      </div>
                                    ) : (
                                      ['Bambu Lab X1C', 'Creality Ender 3', 'Anycubic Kobra', 'Elegoo Neptune']
                                        .filter(pName => !printerSearch.trim() || pName.toLowerCase().includes(printerSearch.toLowerCase()))
                                        .map(pName => {
                                          const isSelected = isPrinterSelected(pName);
                                          return (
                                            <button
                                              key={pName}
                                              type="button"
                                              onClick={() => handleSelectPrinter(pName)}
                                              className={`flex items-center gap-2.5 py-0.5 text-xs font-mono cursor-pointer text-left w-full ${
                                                isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-[#d4d4d8]'
                                              }`}
                                            >
                                              <span className="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0" />
                                              <span className="relative inline-flex items-center">
                                                <span>{pName}</span>
                                                <HandDrawnUnderline isSelected={isSelected} />
                                              </span>
                                            </button>
                                          );
                                        })
                                    )}
                                  </div>
                                </div>

                                {/* Пластик и филамент (из раздела Пластик) */}
                                <div className="space-y-1.5 select-none font-mono md:border-l md:border-[#222227] md:pl-6 lg:pl-8">
                                  <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                    <span className="flex items-center gap-1.5">
                                      <Layers className="w-3.5 h-3.5 text-[#a1a1aa]" />
                                      <span>МАТЕРИАЛ ПЛАСТИКА</span>
                                    </span>
                                    <span className="text-[#52525b] lowercase text-[10px]">
                                      {filaments.length > 0 ? `${filteredFilaments.length} из ${filaments.length}` : 'пресеты'}
                                    </span>
                                  </div>

                                  {/* Поле поиска пластика */}
                                  <div className="relative w-full">
                                    <Search className="w-3 h-3 text-[#71717a] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                      type="text"
                                      placeholder="Поиск пластика..."
                                      value={filamentSearch}
                                      onChange={e => setFilamentSearch(e.target.value)}
                                      className="w-full bg-[#18181b] border border-[#27272c] focus:border-white/40 rounded-md pl-7 pr-6 py-0.5 text-xs text-white placeholder-[#52525b] font-mono focus:outline-none "
                                    />
                                    {filamentSearch && (
                                      <button
                                        type="button"
                                        onClick={() => setFilamentSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white cursor-pointer"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Список пластика */}
                                  <div className="flex flex-col items-start gap-1 pt-0.5 max-h-[285px] md:max-h-[300px] overflow-y-auto scrollbar-none pr-2 w-full">
                                    {filteredFilaments.length > 0 ? (
                                      filteredFilaments.map(f => {
                                        const isSelected = isFilamentSelected(f.name);
                                        return (
                                          <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => handleSelectFilament(f.name)}
                                            className={`flex items-center gap-2.5 py-0.5 text-xs font-mono cursor-pointer text-left w-full ${
                                              isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-[#d4d4d8]'
                                            }`}
                                          >
                                            <span
                                              className="w-2 h-2 rounded-full shrink-0"
                                              style={{ backgroundColor: f.color || (isSelected ? '#ffffff' : '#fb923c') }}
                                            />
                                            <span className="relative inline-flex items-center max-w-full">
                                              <span className="truncate">{f.name}</span>
                                              <HandDrawnUnderline isSelected={isSelected} />
                                            </span>
                                          </button>
                                        );
                                      })
                                    ) : filaments.length > 0 ? (
                                      <div className="text-xs text-[#71717a] py-1 font-mono">
                                        [ Пластик «{filamentSearch}» не найден ]
                                      </div>
                                    ) : (
                                      ['PLA', 'PETG', 'ABS', 'TPU', 'Nylon', 'PC', 'ASA', 'PETG-CF']
                                        .filter(fName => !filamentSearch.trim() || fName.toLowerCase().includes(filamentSearch.toLowerCase()))
                                        .map(fName => {
                                          const isSelected = isFilamentSelected(fName);
                                          return (
                                            <button
                                              key={fName}
                                              type="button"
                                              onClick={() => handleSelectFilament(fName)}
                                              className={`flex items-center gap-2.5 py-0.5 text-xs font-mono cursor-pointer text-left w-full ${
                                                isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-[#d4d4d8]'
                                              }`}
                                            >
                                              <span className="w-2 h-2 rounded-full bg-[#fb923c] shrink-0" />
                                              <span className="relative inline-flex items-center">
                                                <span>{fName}</span>
                                                <HandDrawnUnderline isSelected={isSelected} />
                                              </span>
                                            </button>
                                          );
                                        })
                                    )}
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            /* Для Расхода: Наименование и расширенная категория */
                            <>
                              <div className="flex items-center gap-2 pb-0.5">
                                <input
                                  type="text"
                                  placeholder="Введите наименование расхода (напр. 3 катушки PETG, сопло 0.4 Hardened Steel)..."
                                  value={order.title || ''}
                                  onChange={e => {
                                    setOrder({ ...order, title: e.target.value });
                                    if (formErrors.title) {
                                      setFormErrors({ ...formErrors, title: false });
                                    }
                                  }}
                                  className="bg-transparent border-none focus:outline-none p-0 text-xl sm:text-2xl font-light font-mono text-white placeholder-[#52525b] w-full tracking-tight"
                                />
                              </div>

                              <div className="space-y-2.5 pt-2.5 border-t border-[#222226]">
                                <div className="flex items-center justify-between text-[11px] font-mono text-[#71717a] uppercase tracking-wider font-semibold">
                                  <span className="flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5 text-[#a1a1aa]" />
                                    <span>КАТЕГОРИЯ РАСХОДА</span>
                                  </span>
                                  <span className="text-[#52525b] lowercase text-[10px]">
                                    {filteredExpenseCategories.length} из {allExpenseCategories.length}
                                  </span>
                                </div>

                                {/* Поле поиска категории */}
                                <div className="relative w-full max-w-sm">
                                  <Search className="w-3 h-3 text-[#71717a] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  <input
                                    type="text"
                                    placeholder="Поиск категории..."
                                    value={expenseCatSearch}
                                    onChange={e => setExpenseCatSearch(e.target.value)}
                                    className="w-full bg-[#18181b] border border-[#27272c] focus:border-white/40 rounded-md pl-7 pr-6 py-1 text-xs text-white placeholder-[#52525b] font-mono focus:outline-none "
                                  />
                                  {expenseCatSearch && (
                                    <button
                                      type="button"
                                      onClick={() => setExpenseCatSearch('')}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                {/* Сетка категорий расхода (НЕ перечёркнутые, без точек!) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 pt-1">
                                  {filteredExpenseCategories.map(cat => {
                                    const isSelected = (order.client || DEFAULT_EXPENSE_CATEGORIES[0]) === cat;
                                    const isCustom = customExpenseCategories.includes(cat);

                                    return (
                                      <div key={cat} className="flex items-center justify-between gap-1 group py-0.5">
                                        <button
                                          type="button"
                                          onClick={() => setOrder({ ...order, client: cat })}
                                          className={`text-xs font-mono text-left cursor-pointer min-w-0 flex-1 ${
                                            isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-[#d4d4d8]'
                                          }`}
                                        >
                                          <span className="relative inline-flex items-center min-w-0">
                                            <span className="truncate">{cat}</span>
                                            <HandDrawnUnderline isSelected={isSelected} />
                                          </span>
                                        </button>

                                        {isCustom && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteCustomExpenseCat(cat);
                                            }}
                                            className="text-[#71717a] hover:text-rose-400 text-xs px-1 font-mono cursor-pointer "
                                            title="Удалить категорию"
                                          >
                                            ×
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Добавление своей категории в список в едином нативном стиле */}
                                <div className="pt-1">
                                  {!isAddingExpenseCat ? (
                                    <button
                                      type="button"
                                      onClick={() => setIsAddingExpenseCat(true)}
                                      className="py-1 text-xs font-mono text-[#71717a] hover:text-white cursor-pointer flex items-center gap-1.5 select-none"
                                    >
                                      <span className="text-[#a1a1aa] font-bold">+</span>
                                      <span className="border-b border-dashed border-[#71717a] hover:border-white whitespace-nowrap">
                                        Добавить свою категорию в список
                                      </span>
                                    </button>
                                  ) : (
                                    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-white/20 max-w-sm">
                                      <div className="flex items-baseline gap-1.5 flex-1">
                                        <input
                                          type="text"
                                          placeholder="Название категории (напр. Фотополимер, Аутсорс)"
                                          value={newExpenseCatInput}
                                          onChange={e => setNewExpenseCatInput(e.target.value)}
                                          className="w-full text-xs font-mono text-white bg-transparent border-none focus:outline-none p-0 placeholder-neutral-600 cursor-text selection:bg-white/20"
                                          autoFocus
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') handleCreateCustomExpenseCat();
                                            if (e.key === 'Escape') {
                                              setIsAddingExpenseCat(false);
                                              setNewExpenseCatInput('');
                                            }
                                          }}
                                        />
                                      </div>
                                      <div className="flex items-center gap-1.5 ml-2">
                                        <button
                                          type="button"
                                          onClick={handleCreateCustomExpenseCat}
                                          className="p-1 text-neutral-400 hover:text-white text-xs font-mono cursor-pointer rounded hover:bg-white/10 "
                                          title="Сохранить (Enter)"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setIsAddingExpenseCat(false);
                                            setNewExpenseCatInput('');
                                          }}
                                          className="p-1 text-neutral-400 hover:text-white text-xs font-mono cursor-pointer rounded hover:bg-white/10 "
                                          title="Отмена (Esc)"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* ========================================================================= */}
                      {/* РАЗДЕЛ 2: ФИНАНСЫ, СЕБЕСТОИМОСТЬ И МИНИ-КАЛЬКУЛЯТОР 3D-ПЕЧАТИ             */}
                      {/* ========================================================================= */}
                      {activeTab === 'pricing' && (
                        <div className="space-y-4">
                          {isIncome ? (
                            <>
                              {/* Верхняя панель: Кнопка перехода на страницу калькулятора */}
                              <div className="flex items-center justify-end border-b border-[#222226] pb-2 font-mono">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    router.push('/calculator');
                                  }}
                                  className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-white font-mono select-none cursor-pointer group"
                                >
                                  <CalculatorIcon className="w-3.5 h-3.5 text-[#71717a] group-hover:text-white " />
                                  <span className="border-b border-dashed border-[#71717a] group-hover:border-white">
                                    открыть калькулятор 3D-печати ↗
                                  </span>
                                </button>
                              </div>

                              {/* Анимированный контент раздела в зависимости от режима */}
                              <AnimatePresence mode="wait">
                                {!isMiniCalcOpen ? (
                                  /* РЕЖИМ 1: Прямой ввод цены (по умолчанию, изолирован) */
                                  <motion.div
                                    key="direct-mode"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.18 }}
                                    className="space-y-4 pt-1"
                                  >
                                    {/* 1. Главная базовая стоимость заказа клиенту */}
                                    <div className="space-y-2 max-w-xl">
                                      <div className="flex items-baseline gap-2">
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          placeholder="0"
                                          value={order.base_amount !== undefined ? order.base_amount : (order.amount || '')}
                                          onChange={e => handleUpdateBaseAmount(e.target.value)}
                                          className="text-5xl sm:text-6xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
                                          style={{ width: `${Math.max(1, String(order.base_amount || order.amount || 0).length) * 0.65 + 0.15}em` }}
                                        />
                                        <span className="text-base text-[#71717a] font-mono select-none">₽ стоимость клиенту</span>
                                      </div>

                                      {/* Пресеты базовой цены */}
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        {[300, 500, 1000, 1500, 2000, 3000, 5000, 10000].map(amt => {
                                          const isSelected = Number(order.base_amount || order.amount) === amt;
                                          return (
                                            <button
                                              key={amt}
                                              type="button"
                                              onClick={() => handleUpdateBaseAmount(String(amt))}
                                              className={`py-0.5 text-xs font-mono cursor-pointer ${
                                                isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                              }`}
                                            >
                                              <span className="relative inline-block">
                                                <span>{amt} ₽</span>
                                                <HandDrawnUnderline isSelected={isSelected} />
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {/* Наценка за срочность и Скидка клиенту */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                                        {/* Срочность */}
                                        <div className="space-y-1 font-mono">
                                          <div className="flex items-center justify-between text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                                            <span className="flex items-center gap-1">
                                              <Flame className="w-3 h-3 text-[#f87171]" /> НАЦЕНКА ЗА СРОЧНОСТЬ
                                            </span>
                                            <span className="text-white font-medium">
                                              {order.urgency_percent ? `+${order.urgency_percent}%` : '0%'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2.5 flex-wrap">
                                            {[0, 25, 50, 100].map(pct => {
                                              const isSelected = (order.urgency_percent === pct && !order.urgency_amount) || (pct === 0 && !order.urgency_percent && !order.urgency_amount);
                                              return (
                                                <button
                                                  key={pct}
                                                  type="button"
                                                  onClick={() => handleApplyUrgency('percent', pct)}
                                                  className={`py-0.5 text-xs font-mono cursor-pointer ${
                                                    isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                                  }`}
                                                >
                                                  <span className="relative inline-block">
                                                    <span>{pct === 0 ? '0% Обычный' : `+${pct}%`}</span>
                                                    <HandDrawnUnderline isSelected={isSelected} />
                                                  </span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* Скидка */}
                                        <div className="space-y-1 font-mono">
                                          <div className="flex items-center justify-between text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                                            <span className="flex items-center gap-1">
                                              <Tag className="w-3 h-3 text-[#a1a1aa]" /> СКИДКА КЛИЕНТУ
                                            </span>
                                            <span className="text-white font-medium">
                                              {order.discount_percent ? `-${order.discount_percent}%` : '0%'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2.5 flex-wrap">
                                            {[0, 5, 10, 15, 20].map(pct => {
                                              const isSelected = (order.discount_percent === pct && !order.discount_amount) || (pct === 0 && !order.discount_percent && !order.discount_amount);
                                              return (
                                                <button
                                                  key={pct}
                                                  type="button"
                                                  onClick={() => handleApplyDiscount('percent', pct)}
                                                  className={`py-0.5 text-xs font-mono cursor-pointer ${
                                                    isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                                  }`}
                                                >
                                                  <span className="relative inline-block">
                                                    <span>{pct === 0 ? '0% Без скидки' : `-${pct}%`}</span>
                                                    <HandDrawnUnderline isSelected={isSelected} />
                                                  </span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 2. Нижний симметричный блок 50/50: Дополнительные расходы (слева) + Себестоимость и оплата (справа) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start pt-4 border-t border-[#222226]">
                                      {/* Левая колонка: Дополнительные расходы */}
                                      <div className="space-y-3 font-mono select-none">
                                        <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                          <span className="whitespace-nowrap">ДОПОЛНИТЕЛЬНЫЕ РАСХОДЫ</span>
                                          {extraCostItems.length > 0 && (
                                            <span className="text-zinc-300 font-bold whitespace-nowrap shrink-0">
                                              +{formatMoney(extraCostItems.reduce((acc, it) => acc + (it.amount || 0), 0))}
                                            </span>
                                          )}
                                        </div>

                                        {/* Список пунктов расхода в виде вертикального списка */}
                                        <div className="space-y-2">
                                          {allDirectExtraOptions.map(opt => {
                                            const activeItem = extraCostItems.find(i => i.category === opt.category);
                                            const isSelected = !!activeItem;
                                            const currentAmount = activeItem ? (activeItem.amount ?? opt.defaultAmount) : opt.defaultAmount;

                                            return (
                                              <div
                                                key={opt.category}
                                                className="flex items-baseline justify-between gap-3 py-0.5 border-b border-white/[0.03] last:border-none"
                                              >
                                                {/* Левая часть: название с рукописным зачеркиванием / подчеркиванием */}
                                                <div className="flex items-center gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleExtraCostCategory(opt.category, currentAmount)}
                                                    className={`relative py-0.5 text-xs font-mono cursor-pointer select-none text-left whitespace-nowrap ${
                                                      isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-neutral-300'
                                                    }`}
                                                    title={isSelected ? 'Нажмите, чтобы зачеркнуть расход' : 'Нажмите, чтобы включить расход'}
                                                  >
                                                    <span className="relative inline-block px-1">
                                                      <span>{opt.category}</span>
                                                      {/* Рукописное зачеркивание, если не выбран */}
                                                      <HandDrawnStrikethrough isCrossedOut={!isSelected} />
                                                      {/* Рукописное подчеркивание, если выбран */}
                                                      <HandDrawnUnderline isSelected={isSelected} />
                                                    </span>
                                                  </button>

                                                  {/* Если это свой расход — кнопка удаления */}
                                                  {opt.isCustom && (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleDeleteCustomExtraCategory(opt.category)}
                                                      className="text-[#71717a] hover:text-red-400 text-xs px-1 cursor-pointer "
                                                      title="Удалить из списка"
                                                    >
                                                      ×
                                                    </button>
                                                  )}
                                                </div>

                                                {/* Правая часть: нативное поле ввода цены в точности как у стоимости клиента */}
                                                {isSelected ? (
                                                  <div className="flex items-baseline gap-1.5 font-mono">
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      step="any"
                                                      placeholder="0"
                                                      value={activeItem.amount !== undefined ? activeItem.amount : ''}
                                                      onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        handleUpdateExtraCostCategoryAmount(opt.category, val);
                                                      }}
                                                      className="text-lg sm:text-xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20 text-right"
                                                      style={{ width: `${Math.max(1, String(activeItem.amount || 0).length) * 0.65 + 0.2}em` }}
                                                      autoFocus={!activeItem.amount}
                                                    />
                                                    <span className="text-xs text-[#71717a] select-none">₽</span>
                                                  </div>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleExtraCostCategory(opt.category, opt.defaultAmount)}
                                                    className="text-[11px] text-[#52525b] hover:text-[#71717a] font-mono cursor-pointer whitespace-nowrap"
                                                  >
                                                    +{opt.defaultAmount} ₽
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })}

                                          {/* Нативное добавление своего расхода */}
                                          <div className="pt-1">
                                            {!isAddingCustomCost ? (
                                              <button
                                                type="button"
                                                onClick={() => setIsAddingCustomCost(true)}
                                                className="py-1 text-xs font-mono text-[#71717a] hover:text-white cursor-pointer flex items-center gap-1.5 select-none"
                                              >
                                                <span className="text-[#a1a1aa] font-bold">+</span>
                                                <span className="border-b border-dashed border-[#71717a] hover:border-white whitespace-nowrap">Добавить свой расход в список</span>
                                              </button>
                                            ) : (
                                              <div className="flex items-baseline justify-between gap-3 py-1 border-b border-white/20">
                                                <div className="flex items-baseline gap-1.5 flex-1">
                                                  <input
                                                    type="text"
                                                    placeholder="Название расхода (напр. Магниты)"
                                                    value={customCostCategoryInput}
                                                    onChange={e => setCustomCostCategoryInput(e.target.value)}
                                                    className="w-full text-xs font-mono text-white bg-transparent border-none focus:outline-none p-0 placeholder-neutral-600 cursor-text selection:bg-white/20"
                                                    autoFocus
                                                    onKeyDown={e => {
                                                      if (e.key === 'Enter') handleCreateCustomExtraCostItem();
                                                      if (e.key === 'Escape') setIsAddingCustomCost(false);
                                                    }}
                                                  />
                                                </div>

                                                <div className="flex items-baseline gap-1.5 font-mono">
                                                  <input
                                                    type="number"
                                                    placeholder="0"
                                                    min="0"
                                                    value={customCostAmountInput}
                                                    onChange={e => setCustomCostAmountInput(e.target.value)}
                                                    className="text-lg sm:text-xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-right cursor-text selection:bg-white/20"
                                                    style={{ width: `${Math.max(1, String(customCostAmountInput || 0).length) * 0.65 + 0.2}em` }}
                                                    onKeyDown={e => {
                                                      if (e.key === 'Enter') handleCreateCustomExtraCostItem();
                                                      if (e.key === 'Escape') setIsAddingCustomCost(false);
                                                    }}
                                                  />
                                                  <span className="text-xs text-[#71717a] select-none">₽</span>

                                                  <div className="flex items-center gap-1.5 ml-2">
                                                    <button
                                                      type="button"
                                                      onClick={handleCreateCustomExtraCostItem}
                                                      className="p-1 text-neutral-400 hover:text-white text-xs font-mono cursor-pointer rounded hover:bg-white/10 "
                                                      title="Сохранить (Enter)"
                                                    >
                                                      <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setIsAddingCustomCost(false);
                                                        setCustomCostCategoryInput('');
                                                        setCustomCostAmountInput('');
                                                      }}
                                                      className="p-1 text-neutral-400 hover:text-white text-xs font-mono cursor-pointer rounded hover:bg-white/10 "
                                                      title="Отмена (Esc)"
                                                    >
                                                      <X className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Правая колонка: Базовая себестоимость + Внесенная оплата */}
                                      <div className="space-y-5 font-mono md:border-l md:border-[#222227] md:pl-6 lg:pl-8">
                                        {/* 1. Ручной ввод базовой себестоимости */}
                                        <div className="space-y-1.5">
                                          <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                            <span className="whitespace-nowrap">БАЗОВАЯ СЕБЕСТОИМОСТЬ</span>
                                            <span className="text-white text-xs font-mono whitespace-nowrap shrink-0">{formatMoney(parseFloat(manualBaseCost) || 0)}</span>
                                          </div>
                                          <div className="flex items-baseline gap-2">
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              placeholder="0"
                                              value={manualBaseCost}
                                              onChange={e => handleUpdateManualBaseCost(e.target.value)}
                                              className="text-3xl sm:text-4xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
                                              style={{ width: `${Math.max(1, String(manualBaseCost || 0).length) * 0.65 + 0.15}em` }}
                                            />
                                            <span className="text-sm text-[#71717a] font-mono select-none whitespace-nowrap">₽ печать/заготовка</span>
                                          </div>

                                          {/* Пресеты базовой себестоимости */}
                                          <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap">
                                            {[0, 50, 100, 200, 500, 1000].map(c => {
                                              const isSelected = Number(manualBaseCost) === c;
                                              return (
                                                <button
                                                  key={c}
                                                  type="button"
                                                  onClick={() => handleUpdateManualBaseCost(String(c))}
                                                  className={`py-0.5 text-xs font-mono cursor-pointer whitespace-nowrap ${
                                                    isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                                  }`}
                                                >
                                                  <span className="relative inline-block">
                                                    <span>{c} ₽</span>
                                                    <HandDrawnUnderline isSelected={isSelected} />
                                                  </span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* 2. Внесенная оплата клиентом */}
                                        <div className="space-y-2 pt-4 border-t border-white/5">
                                          <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                            <span className="whitespace-nowrap">ВНЕСЕННАЯ ОПЛАТА</span>
                                            <span className="text-white text-xs font-mono whitespace-nowrap shrink-0">{formatMoney(order.payment || 0)}</span>
                                          </div>
                                          <div className="flex items-baseline gap-2">
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              placeholder="0"
                                              value={order.payment || ''}
                                              onChange={e => {
                                                handlePaymentTotalChange(parseFloat(e.target.value) || 0);
                                              }}
                                              className="text-3xl sm:text-4xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
                                              style={{ width: `${Math.max(1, String(order.payment || 0).length) * 0.65 + 0.15}em` }}
                                            />
                                            <span className="text-sm text-[#71717a] font-mono select-none whitespace-nowrap">₽ внесено</span>
                                          </div>

                                          <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap">
                                            {[0, 10, 20, 30, 50, 70, 100].map(pct => {
                                              const ratio = pct / 100;
                                              const isSelected = Math.abs(paymentRatio - ratio) < 0.02;
                                              return (
                                                <button
                                                  key={pct}
                                                  type="button"
                                                  onClick={() => handleApplyPaymentPreset(ratio)}
                                                  className={`py-0.5 text-xs font-mono cursor-pointer whitespace-nowrap ${
                                                    isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                                  }`}
                                                >
                                                  <span className="relative inline-block">
                                                    <span>{pct}%</span>
                                                    <HandDrawnUnderline isSelected={isSelected} />
                                                  </span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ) : (
                                  /* РЕЖИМ 2: Интерактивный мини-калькулятор 3D-печати (со всеми недостающими полями) */
                                  <motion.div
                                    key="calc-mode"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.18 }}
                                    className="space-y-4 pt-1"
                                  >
                                    {/* 1. Сетка основных параметров печати (4 блока Cockpit) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 pt-1">

                                      {/* 1. Вес изделия / расход материала */}
                                      <div className="space-y-1.5 font-mono select-none">
                                        <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                          <span className="flex items-center gap-1.5">
                                            <Scale className="w-3.5 h-3.5 text-[#a1a1aa]" />
                                            <span>РАСХОД ПЛАСТИКА (ВЕС)</span>
                                          </span>
                                          <span className="text-[#8e8e93] text-[10px] lowercase">
                                            ~{roundTo2(miniCalcResult.materialCost)} ₽ пластик
                                          </span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                          <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            placeholder="0"
                                            value={calcWeight}
                                            onChange={e => setCalcWeight(e.target.value)}
                                            className="text-2xl sm:text-3xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
                                            style={{ width: `${Math.max(1, String(calcWeight || 0).length) * 0.65 + 0.15}em` }}
                                          />
                                          <span className="text-sm text-[#71717a] font-mono">г на 1 шт</span>
                                        </div>
                                        {/* Пресеты веса */}
                                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                          {['10', '25', '50', '100', '250', '500'].map(wVal => {
                                            const isSelected = calcWeight === wVal;
                                            return (
                                              <button
                                                key={wVal}
                                                type="button"
                                                onClick={() => setCalcWeight(wVal)}
                                                className={`py-0.5 text-xs font-mono cursor-pointer ${
                                                  isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                                }`}
                                              >
                                                <span className="relative inline-block">
                                                  <span>{wVal} г</span>
                                                  <HandDrawnUnderline isSelected={isSelected} />
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* 2. Время 3D-печати */}
                                      <div className="space-y-1.5 font-mono select-none sm:border-l sm:border-[#222227] sm:pl-6 lg:pl-8">
                                        <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                          <span className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-[#a1a1aa]" />
                                            <span>ВРЕМЯ 3D-ПЕЧАТИ</span>
                                          </span>
                                          <span className="text-[#a1a1aa] text-[10px] lowercase">
                                            ~{roundTo2(miniCalcResult.electricityCost + miniCalcResult.depreciationCost)} ₽ ток/износ
                                          </span>
                                        </div>
                                        <div className="flex items-baseline gap-2 font-mono text-2xl sm:text-3xl font-light text-white tracking-tight">
                                          <input
                                            type="number"
                                            min="0"
                                            max="999"
                                            placeholder="0"
                                            value={calcHours}
                                            onChange={e => setCalcHours(e.target.value)}
                                            className="bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
                                            style={{ width: `${Math.max(1, String(calcHours || 0).length) * 0.65 + 0.15}em` }}
                                          />
                                          <span className="text-xs font-normal text-[#71717a] mr-2">ч</span>

                                          <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            placeholder="0"
                                            value={calcMinutes}
                                            onChange={e => setCalcMinutes(e.target.value)}
                                            className="bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
                                            style={{ width: `${Math.max(1, String(calcMinutes || 0).length) * 0.65 + 0.15}em` }}
                                          />
                                          <span className="text-xs font-normal text-[#71717a]">мин</span>
                                        </div>
                                        {/* Пресеты времени */}
                                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                          {[
                                            { label: '45м', h: '0', m: '45' },
                                            { label: '1.5ч', h: '1', m: '30' },
                                            { label: '3ч', h: '3', m: '0' },
                                            { label: '6ч', h: '6', m: '0' },
                                            { label: '12ч', h: '12', m: '0' },
                                            { label: '24ч', h: '24', m: '0' },
                                          ].map(tOpt => {
                                            const isSelected = calcHours === tOpt.h && calcMinutes === tOpt.m;
                                            return (
                                              <button
                                                key={tOpt.label}
                                                type="button"
                                                onClick={() => {
                                                  setCalcHours(tOpt.h);
                                                  setCalcMinutes(tOpt.m);
                                                }}
                                                className={`py-0.5 text-xs font-mono cursor-pointer ${
                                                  isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                                }`}
                                              >
                                                <span className="relative inline-block">
                                                  <span>{tOpt.label}</span>
                                                  <HandDrawnUnderline isSelected={isSelected} />
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* 3. Торговая наценка / Коэффициент маржи */}
                                      <div className="space-y-1.5 font-mono select-none pt-2 border-t border-[#222226]">
                                        <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                          <span className="flex items-center gap-1.5">
                                            <TrendingUp className="w-3.5 h-3.5 text-[#34d399]" />
                                            <span>НАЦЕНКА (MARKUP)</span>
                                          </span>
                                          <span className="text-[#34d399] text-[10px]">
                                            {((100 + (parseFloat(calcMarkup) || 0)) / 100).toFixed(1)}x к себестоимости
                                          </span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                          <input
                                            type="number"
                                            min="0"
                                            step="5"
                                            placeholder="0"
                                            value={calcMarkup}
                                            onChange={e => setCalcMarkup(e.target.value)}
                                            className="text-2xl sm:text-3xl font-light font-mono text-[#34d399] tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
                                            style={{ width: `${Math.max(1, String(calcMarkup || 0).length) * 0.65 + 0.15}em` }}
                                          />
                                          <span className="text-sm text-[#71717a] font-mono">% наценка</span>
                                        </div>
                                        {/* Пресеты наценки */}
                                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                          {['0', '50', '100', '150', '200', '300'].map(mVal => {
                                            const isSelected = calcMarkup === mVal;
                                            return (
                                              <button
                                                key={mVal}
                                                type="button"
                                                onClick={() => setCalcMarkup(mVal)}
                                                className={`py-0.5 text-xs font-mono cursor-pointer ${
                                                  isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                                }`}
                                              >
                                                <span className="relative inline-block">
                                                  <span>+{mVal}%</span>
                                                  <HandDrawnUnderline isSelected={isSelected} />
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* 4. Технологический брак */}
                                      <div className="space-y-1.5 font-mono select-none sm:border-l sm:border-[#222227] sm:pl-6 lg:pl-8 pt-2 border-t border-[#222226]">
                                        <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                          <span className="flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                            <span>ТЕХНОЛОГИЧЕСКИЙ БРАК</span>
                                          </span>
                                          <span className="text-amber-400 text-[10px]">
                                            +{roundTo2(miniCalcResult.defectCost)} ₽ на брак
                                          </span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            placeholder="0"
                                            value={calcDefect}
                                            onChange={e => setCalcDefect(e.target.value)}
                                            className="text-2xl sm:text-3xl font-light font-mono text-amber-300 tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
                                            style={{ width: `${Math.max(1, String(calcDefect || 0).length) * 0.65 + 0.15}em` }}
                                          />
                                          <span className="text-sm text-[#71717a] font-mono">% брак</span>
                                        </div>
                                        {/* Пресеты брака */}
                                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                          {['0', '5', '10', '15', '20'].map(dVal => {
                                            const isSelected = calcDefect === dVal;
                                            return (
                                              <button
                                                key={dVal}
                                                type="button"
                                                onClick={() => setCalcDefect(dVal)}
                                                className={`py-0.5 text-xs font-mono cursor-pointer ${
                                                  isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                                }`}
                                              >
                                                <span className="relative inline-block">
                                                  <span>{dVal}%</span>
                                                  <HandDrawnUnderline isSelected={isSelected} />
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                    </div>

                                    {/* 2. Секция: Ручной труд, Срочность/Скидка и Дополнительные услуги */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 pt-3 border-t border-[#222226]">

                                      {/* 5. Ручной труд мастера */}
                                      <div className="space-y-1.5 font-mono select-none">
                                        <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                          <span className="flex items-center gap-1.5">
                                            <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>РУЧНОЙ ТРУД МАСТЕРА</span>
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setCalcIsOwnerLabor(!calcIsOwnerLabor)}
                                            className={`px-1.5 py-0.2 rounded text-[10px] border cursor-pointer ${
                                              calcIsOwnerLabor
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                : 'bg-neutral-900 text-neutral-400 border-white/10'
                                            }`}
                                            title={calcIsOwnerLabor ? 'Оплата труда идет в чистую прибыль' : 'Оплата труда идет в прямую себестоимость'}
                                          >
                                            {calcIsOwnerLabor ? 'В прибыль' : 'В себестоимость'}
                                          </button>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                          <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={calcLaborMinutes}
                                            onChange={e => setCalcLaborMinutes(e.target.value)}
                                            className="text-2xl sm:text-3xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
                                            style={{ width: `${Math.max(1, String(calcLaborMinutes || 0).length) * 0.65 + 0.15}em` }}
                                          />
                                          <span className="text-sm text-[#71717a] font-mono">мин (~{roundTo2(miniCalcResult.laborCost)} ₽)</span>
                                        </div>
                                        {/* Пресеты ручного труда */}
                                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                          {['0', '15', '30', '60', '120'].map(lVal => {
                                            const isSelected = calcLaborMinutes === lVal;
                                            return (
                                              <button
                                                key={lVal}
                                                type="button"
                                                onClick={() => setCalcLaborMinutes(lVal)}
                                                className={`py-0.5 text-xs font-mono cursor-pointer ${
                                                  isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                                }`}
                                              >
                                                <span className="relative inline-block">
                                                  <span>{lVal}м</span>
                                                  <HandDrawnUnderline isSelected={isSelected} />
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* 6. Срочность и скидка в калькуляторе */}
                                      <div className="space-y-1.5 font-mono select-none sm:border-l sm:border-[#222227] sm:pl-6 lg:pl-8">
                                        <div className="grid grid-cols-2 gap-4">
                                          {/* Срочность */}
                                          <div className="space-y-1 font-mono">
                                            <div className="flex items-center justify-between text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                                              <span className="flex items-center gap-1">
                                                <Flame className="w-3 h-3 text-[#f87171]" /> СРОЧНОСТЬ
                                              </span>
                                              <span className="text-white font-medium">
                                                {calcUrgencyPct ? `+${calcUrgencyPct}%` : '0%'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {[0, 25, 50, 100].map(pct => {
                                                const isSelected = calcUrgencyPct === pct;
                                                return (
                                                  <button
                                                    key={pct}
                                                    type="button"
                                                    onClick={() => setCalcUrgencyPct(pct)}
                                                    className={`py-0.5 text-xs font-mono cursor-pointer ${
                                                      isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                                    }`}
                                                  >
                                                    <span className="relative inline-block">
                                                      <span>{pct === 0 ? '0%' : `+${pct}%`}</span>
                                                      <HandDrawnUnderline isSelected={isSelected} />
                                                    </span>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Скидка */}
                                          <div className="space-y-1 font-mono">
                                            <div className="flex items-center justify-between text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                                              <span className="flex items-center gap-1">
                                                <Tag className="w-3 h-3 text-[#a1a1aa]" /> СКИДКА
                                              </span>
                                              <span className="text-white font-medium">
                                                {calcDiscountPct ? `-${calcDiscountPct}%` : '0%'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {[0, 5, 10, 15, 20].map(pct => {
                                                const isSelected = calcDiscountPct === pct;
                                                return (
                                                  <button
                                                    key={pct}
                                                    type="button"
                                                    onClick={() => setCalcDiscountPct(pct)}
                                                    className={`py-0.5 text-xs font-mono cursor-pointer ${
                                                      isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                                    }`}
                                                  >
                                                    <span className="relative inline-block">
                                                      <span>{pct === 0 ? '0%' : `-${pct}%`}</span>
                                                      <HandDrawnUnderline isSelected={isSelected} />
                                                    </span>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                    </div>

                                    {/* 7. Дополнительные услуги и опции (Упаковка, Покраска, Доставка, Фурнитура, Моделирование) */}
                                    <div className="space-y-2 pt-3 border-t border-[#222226] font-mono select-none">
                                      <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                        <span>ДОПОЛНИТЕЛЬНЫЕ ОПЦИИ И УСЛУГИ</span>
                                        {miniCalcResult.customCostsTotal > 0 && (
                                          <span className="text-zinc-300 font-bold">
                                            +{roundTo2(miniCalcResult.customCostsTotal)} ₽ всего опций
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap gap-2 items-center">
                                        {DEFAULT_COST_CATEGORIES.filter(c => c.id !== 'print' && c.id !== 'labor').map(cat => {
                                          const activeItem = calcCustomCosts.find(i => i.id === cat.id);
                                          if (activeItem) {
                                            return (
                                              <div
                                                key={cat.id}
                                                className="flex items-center gap-1.5 p-1 px-2.5 rounded-lg text-xs font-mono border bg-white/[0.05] border-white/20 text-neutral-200 shadow-sm"
                                              >
                                                <span className="font-bold flex items-center gap-1 text-white shrink-0">
                                                  <span>✓</span>
                                                  <span>{cat.name}</span>
                                                </span>
                                                <div className="flex items-center gap-1 bg-neutral-950 border border-white/20 rounded px-1.5 py-0.5">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={activeItem.amount || ''}
                                                    onChange={e => {
                                                      const val = parseFloat(e.target.value) || 0;
                                                      setCalcCustomCosts(prev => prev.map(i => i.id === cat.id ? { ...i, amount: val } : i));
                                                    }}
                                                    className="w-12 text-right bg-transparent text-white font-bold font-mono focus:outline-none text-xs"
                                                    placeholder="0"
                                                  />
                                                  <span className="text-[#71717a] text-[10px]">₽</span>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setCalcCustomCosts(prev => prev.map(i => i.id === cat.id ? { ...i, isPerUnit: !i.isPerUnit } : i));
                                                  }}
                                                  className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer font-bold ${
                                                    activeItem.isPerUnit
                                                      ? 'bg-white/20 text-white border-white/40'
                                                      : 'bg-neutral-900 text-[#a1a1aa] border-white/10'
                                                  }`}
                                                  title={activeItem.isPerUnit ? 'Начисляется на каждую деталь (× тираж)' : 'Фиксированная цена на весь заказ'}
                                                >
                                                  {activeItem.isPerUnit ? 'за шт' : 'за заказ'}
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setCalcCustomCosts(prev => prev.filter(i => i.id !== cat.id));
                                                  }}
                                                  className="hover:text-red-400 px-1 text-xs font-bold cursor-pointer"
                                                  title="Удалить услугу"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            );
                                          }

                                          return (
                                            <button
                                              key={cat.id}
                                              type="button"
                                              onClick={() => {
                                                setCalcCustomCosts(prev => [
                                                  ...prev,
                                                  {
                                                    id: cat.id,
                                                    name: cat.name,
                                                    amount: cat.defaultAmount || 100,
                                                    isPerUnit: cat.isPerUnit ?? false,
                                                    isEnabled: true,
                                                  },
                                                ]);
                                              }}
                                              className="px-2.5 py-1 rounded-lg text-xs font-mono border border-white/10 bg-white/[0.02] text-[#71717a] hover:text-white hover:border-white/20 cursor-pointer flex items-center gap-1"
                                            >
                                              <span>+</span>
                                              <span>{cat.name}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* 8. Итоги расчёта калькулятора и кнопка применения */}
                                    <div className="space-y-4 pt-3 border-t border-[#222226]">
                                      {/* Сводка себестоимости и цены */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/10 font-mono">
                                        <div>
                                          <div className="text-[10px] text-[#71717a] uppercase tracking-wider">СТОИМОСТЬ КЛИЕНТУ (РАСЧЁТ)</div>
                                          <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                                            {formatMoney(miniCalcResult.totalFinalPrice)}
                                          </div>
                                          <div className="text-[11px] text-[#8e8e93] pt-0.5">
                                            Прибыль: <strong className="text-[#34d399]">+{formatMoney(miniCalcResult.profitTotal)}</strong> ({miniCalcResult.marginPercent.toFixed(0)}% маржа)
                                          </div>
                                        </div>

                                        <div className="sm:border-l sm:border-white/5 sm:pl-4">
                                          <div className="text-[10px] text-[#71717a] uppercase tracking-wider">СЕБЕСТОИМОСТЬ ПАРТИИ</div>
                                          <div className="text-xl sm:text-2xl font-light font-mono text-neutral-300">
                                            {formatMoney(miniCalcResult.totalBaseCost)}
                                          </div>
                                          <div className="text-[10px] text-[#71717a] truncate pt-0.5">
                                            пластик {formatMoney(miniCalcResult.materialCost)} • износ+ток {formatMoney(miniCalcResult.electricityCost + miniCalcResult.depreciationCost)} • брак {formatMoney(miniCalcResult.defectCost)} • труд {formatMoney(miniCalcResult.laborCost)}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Большая главная кнопка применения в заказ */}
                                      <button
                                        type="button"
                                        onClick={handleApplyCalculationToOrder}
                                        className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg select-none ${
                                          calcAppliedFeedback
                                            ? 'bg-emerald-500 text-black border border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                                            : 'bg-white hover:bg-neutral-200 text-black border border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                                        }`}
                                      >
                                        {calcAppliedFeedback ? (
                                          <>
                                            <Check className="w-4 h-4 text-black stroke-[3]" />
                                            <span>[ ✓ РАСЧЁТ УСПЕШНО ПРИМЕНЁН В СУММУ И СЕБЕСТОИМОСТЬ ЗАКАЗА ]</span>
                                          </>
                                        ) : (
                                          <>
                                            <CalculatorIcon className="w-4 h-4" />
                                            <span>[ ПРИМЕНИТЬ РАСЧЁТ КАЛЬКУЛЯТОРА В ЗАКАЗ ({formatMoney(miniCalcResult.totalFinalPrice)}) ]</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          ) : (
                            /* Для Расхода: Сумма затрат и Дата платежа */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start pt-2">
                              <div className="space-y-3">
                                <div className="flex items-baseline gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0"
                                    value={order.amount || ''}
                                    onChange={e => setOrder({ ...order, amount: parseFloat(e.target.value) || 0 })}
                                    className="text-5xl sm:text-6xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
                                    style={{ width: `${Math.max(1, String(order.amount || 0).length) * 0.65 + 0.15}em` }}
                                  />
                                  <span className="text-base text-[#71717a] font-mono select-none">₽ сумма расхода</span>
                                </div>

                                <div className="flex items-center gap-2.5 flex-wrap">
                                  {[300, 500, 1000, 1500, 2000, 3000, 5000, 10000].map(amt => {
                                    const isSelected = Number(order.amount) === amt;
                                    return (
                                      <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setOrder({ ...order, amount: amt })}
                                        className={`py-0.5 text-xs font-mono cursor-pointer ${
                                          isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                                        }`}
                                      >
                                        <span className="relative inline-block">
                                          <span>{amt} ₽</span>
                                          <HandDrawnUnderline isSelected={isSelected} />
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="w-full md:border-l md:border-[#222227] md:pl-8 lg:pl-10">
                                <NativeEmbeddedCalendar
                                  value={order.date || ''}
                                  onChange={newDate => setOrder({ ...order, date: newDate })}
                                  title="ДАТА СПИСАНИЯ РАСХОДА"
                                  emptyLabel="не указана"
                                  valuePrefix="дата:"
                                  presetsMode="past"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ========================================================================= */}
                      {/* РАЗДЕЛ 3: СРОКИ И СТАТУС ВЫПОЛНЕНИЯ                                       */}
                      {/* ========================================================================= */}
                      {activeTab === 'status' && (
                        <div className="space-y-4">
                          {/* Две симметричные колонки 50/50: Слева Сроки и календарь, Справа Статусы заказа */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start pt-2">
                            {/* Слева: Единый календарь с двумя датами (зеленая приёмка и красная сдача) */}
                            <div className="w-full">
                              <NativeDualDateCalendar
                                startDate={order.date || ''}
                                endDate={order.deadline || ''}
                                onChangeStartDate={val => setOrder({ ...order, date: val })}
                                onChangeEndDate={val => setOrder({ ...order, deadline: val })}
                              />
                            </div>

                            {/* Справа: Вертикальный список статусов заказа */}
                            <div className="w-full md:border-l md:border-[#222227] md:pl-8 lg:pl-10">
                              <NativeVerticalStatusList
                                value={order.status || 'Не в работе'}
                                onChange={val => setOrder({ ...order, status: val })}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ========================================================================= */}
                      {/* РАЗДЕЛ 4: КЛИЕНТ, КАНАЛ СВЯЗИ И ДОСТАВКА                                   */}
                      {/* ========================================================================= */}
                      {activeTab === 'client' && (
                        <div className="flex flex-col justify-between min-h-[460px] md:min-h-[490px]">
                          {/* Две симметричные колонки 50/50: Слева Клиент и Контакты, Справа Источник / Канал связи */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start pt-2">
                            {/* Слева: Имя клиента (в самом верху) и контакты (под именем в стиле дополнительных расходов) */}
                            <div className="w-full space-y-4 font-mono select-none">
                              {/* 1. В самом верху: Имя контакта / Клиента */}
                              <div className="space-y-1.5">
                                <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                  ИМЯ КЛИЕНТА
                                </div>
                                <input
                                  type="text"
                                  placeholder="Введите имя клиента..."
                                  value={order.client_name ?? order.contact ?? ''}
                                  onChange={e => setOrder({ ...order, client_name: e.target.value, contact: e.target.value })}
                                  className="bg-transparent border-none focus:outline-none p-0 text-xl sm:text-2xl font-light font-mono text-white placeholder-[#52525b] w-full tracking-tight"
                                />
                              </div>

                              {/* 2. Под именем: Контакты клиента в фирменном стиле дополнительных расходов */}
                              <div className="space-y-2.5 pt-2 border-t border-[#222227]">
                                <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                                  КОНТАКТЫ КЛИЕНТА
                                </div>

                                {/* Список каналов связи в стиле дополнительных расходов (без прокрутки) */}
                                <div className="space-y-1.5">
                                  {allDirectContactOptions.map(opt => {
                                    const activeContact = (order.contacts || []).find(
                                      c => c.label === opt.label || (!c.label && c.type === opt.type && opt.label === defaultContactOptions.find(d => d.type === opt.type)?.label)
                                    );
                                    const isSelected = !!activeContact;

                                    return (
                                      <div
                                        key={opt.label}
                                        className="flex items-baseline justify-between gap-3 py-0.5 border-b border-white/[0.03] last:border-none min-h-[26px]"
                                      >
                                        {/* Левая часть: название с рукописным зачеркиванием / подчеркиванием */}
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleContact(opt.type, opt.label)}
                                            className={`relative py-0.5 text-xs font-mono cursor-pointer select-none text-left whitespace-nowrap ${
                                              isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-neutral-300'
                                            }`}
                                            title={isSelected ? 'Нажмите, чтобы зачеркнуть контакт' : 'Нажмите, чтобы указать контакт'}
                                          >
                                            <span className="relative inline-block px-1">
                                              <span>{opt.label}</span>
                                              <HandDrawnStrikethrough isCrossedOut={!isSelected} />
                                              <HandDrawnUnderline isSelected={isSelected} />
                                            </span>
                                          </button>

                                          {/* Если это кастомный контакт — кнопка удаления */}
                                          {opt.isCustom && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteCustomContactOption(opt.label)}
                                              className="text-[#71717a] hover:text-red-400 text-xs px-1 cursor-pointer "
                                              title="Удалить из списка"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>

                                        {/* Правая часть: нативное поле ввода контакта (появляется при выборе) */}
                                        {isSelected && (
                                          <div className="flex items-baseline gap-1.5 font-mono flex-1 max-w-[260px]">
                                            <input
                                              type="text"
                                              placeholder={opt.placeholder}
                                              value={activeContact.value || ''}
                                              onChange={e => handleUpdateContactValue(opt.type, opt.label, e.target.value)}
                                              className="w-full text-xs font-mono text-white bg-transparent border-none focus:outline-none p-0 placeholder-[#52525b] cursor-text selection:bg-white/20 text-right"
                                              autoFocus={!activeContact.value}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Добавление своего контакта в список */}
                                  <div className="pt-1">
                                    {!isAddingCustomContact ? (
                                      <button
                                        type="button"
                                        onClick={() => setIsAddingCustomContact(true)}
                                        className="py-1 text-xs font-mono text-[#71717a] hover:text-white cursor-pointer flex items-center gap-1.5 select-none"
                                      >
                                        <span className="text-[#a1a1aa] font-bold">+</span>
                                        <span className="border-b border-dashed border-[#71717a] hover:border-white whitespace-nowrap">
                                          Добавить свой контакт в список
                                        </span>
                                      </button>
                                    ) : (
                                      <div className="flex items-baseline justify-between gap-3 py-1 border-b border-white/20">
                                        <div className="flex items-baseline gap-1.5 flex-1">
                                          <input
                                            type="text"
                                            placeholder="Название (напр. Discord, Viber, Instagram)"
                                            value={customContactLabelInput}
                                            onChange={e => setCustomContactLabelInput(e.target.value)}
                                            className="w-full text-xs font-mono text-white bg-transparent border-none focus:outline-none p-0 placeholder-neutral-600 cursor-text selection:bg-white/20"
                                            autoFocus
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') handleCreateCustomContactOption();
                                              if (e.key === 'Escape') setIsAddingCustomContact(false);
                                            }}
                                          />
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-2">
                                          <button
                                            type="button"
                                            onClick={handleCreateCustomContactOption}
                                            className="p-1 text-neutral-400 hover:text-white text-xs font-mono cursor-pointer rounded hover:bg-white/10 "
                                            title="Сохранить (Enter)"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setIsAddingCustomContact(false);
                                              setCustomContactLabelInput('');
                                            }}
                                            className="p-1 text-neutral-400 hover:text-white text-xs font-mono cursor-pointer rounded hover:bg-white/10 "
                                            title="Отмена (Esc)"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Справа: Источник и канал связи */}
                            <div className="w-full md:border-l md:border-[#222227] md:pl-8 lg:pl-10">
                              <NativeVerticalChannelList
                                value={order.client || 'Авито'}
                                onChange={val => setOrder({ ...order, client: val })}
                              />
                            </div>
                          </div>

                          {/* 3. В самом низу: Пожелания и комментарии на весь блок (выровнен по нижнему краю) */}
                          <div className="mt-auto w-full pt-3 border-t border-[#222227] space-y-1.5 font-mono">
                            <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                              ПОЖЕЛАНИЯ И КОММЕНТАРИИ К ЗАКАЗУ
                            </div>
                            <textarea
                              rows={3}
                              placeholder="Адрес доставки, ПВЗ СДЭК, Boxberry, пожелания по постобработке, цвету или любые комментарии к заказу..."
                              value={order.notes || ''}
                              onChange={e => setOrder({ ...order, notes: e.target.value })}
                              className="w-full bg-[#121214] border border-[#27272c] focus:border-white/40 rounded-xl p-3 text-xs text-white placeholder-[#52525b] focus:outline-none resize-none font-mono leading-relaxed "
                            />
                          </div>
                        </div>
                      )}

                      {/* ========================================================================= */}
                      {/* РАЗДЕЛ ДЛЯ РАСХОДОВ: ЗАМЕТКИ, ЧЕК И ПОСТАВЩИК                             */}
                      {/* ========================================================================= */}
                      {activeTab === 'tech' && !isIncome && (
                        <div className="space-y-3 font-mono">
                          <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                            ПОСТАВЩИК, НОМЕР ЧЕКА И ПРИМЕЧАНИЯ К РАСХОДУ
                          </div>
                          <textarea
                            rows={4}
                            placeholder="Укажите поставщика, магазин (напр. Ozon, Filamentarno), трек-номер, номер чека или комментарии..."
                            value={order.notes || ''}
                            onChange={e => setOrder({ ...order, notes: e.target.value })}
                            className="w-full bg-[#18181b] border border-[#27272c] focus:border-white/40 rounded-xl p-3 text-xs text-white placeholder-[#52525b] focus:outline-none resize-none font-mono leading-relaxed "
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4 Нижних тайла телеметрии с реальными данными заказа или расхода */}
                  <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-[#26262b]">
                    {isIncome ? (
                      <>
                        <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2 font-mono">
                          <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">ТИРАЖ ПАРТИИ</div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl sm:text-2xl font-light text-white">{order.quantity || 1}</span>
                            <span className="text-xs text-[#71717a]">ШТ</span>
                          </div>
                        </div>

                        <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2 font-mono">
                          <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">ИТОГО К ОПЛАТЕ</div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl sm:text-2xl font-light text-white">{totalAmount}</span>
                            <span className="text-xs text-[#71717a]">₽</span>
                          </div>
                        </div>

                        <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2 font-mono">
                          <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">МАРЖИНАЛЬНОСТЬ</div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl sm:text-2xl font-light text-white">{marginPercent.toFixed(0)}</span>
                            <span className="text-xs text-[#71717a]">%</span>
                          </div>
                        </div>

                        <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2 font-mono">
                          <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">ОПЛАЧЕНО</div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl sm:text-2xl font-light text-white">{(paymentRatio * 100).toFixed(0)}</span>
                            <span className="text-xs text-[#71717a]">%</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2 font-mono">
                          <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">ТИП ОПЕРАЦИИ</div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-sm sm:text-base font-semibold text-[#f87171]">РАСХОД</span>
                          </div>
                        </div>

                        <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2 font-mono">
                          <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">СУММА СПИСАНИЯ</div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl sm:text-2xl font-light text-white">{order.amount || 0}</span>
                            <span className="text-xs text-[#71717a]">₽</span>
                          </div>
                        </div>

                        <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2 font-mono col-span-2">
                          <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">КАТЕГОРИЯ РАСХОДА</div>
                          <div className="mt-0.5">
                            <span className="text-xs sm:text-sm font-medium text-white truncate block">
                              {order.client || DEFAULT_EXPENSE_CATEGORIES[0]}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                </div>

              </div>

              {/* ========================================================================= */}
              {/* КОЛОНКА 3: СВОДКА ЗАКАЗА / РАСХОДА (CLEAN NATIVE TELEMETRY)                */}
              {/* ========================================================================= */}
              <div className="w-full lg:w-[280px] xl:w-[300px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#222226] bg-[#111113] flex flex-col justify-between p-4 font-mono text-xs select-none overflow-y-auto min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">

                {isIncome ? (
                  /* ========================================================================= */
                  /* СВОДКА ДЛЯ ДОХОДА (ЗАКАЗ КЛИЕНТА)                                         */
                  /* ========================================================================= */
                  <div className="space-y-4">
                    {/* Заголовок Сводки и статус */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#222226]">
                      <div className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider font-semibold">
                        СВОДКА ЗАКАЗА
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          order.status === 'Готово'
                            ? 'bg-[#34d399]'
                            : order.status === 'Не в работе'
                            ? 'bg-[#f87171]'
                            : order.status === 'Моделирование' || order.status === 'Ждет покраски'
                            ? 'bg-[#fbbf24]'
                            : 'bg-white'
                        }`} />
                        <span>{order.status || 'Не в работе'}</span>
                      </div>
                    </div>

                    {/* 1. Изделие и параметры */}
                    <div className="space-y-1.5 pb-3 border-b border-[#222226]">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-white font-medium text-xs truncate">
                          {order.title || 'Новый заказ'}
                        </span>
                        <span className="text-[#a1a1aa] shrink-0">
                          {order.quantity || 1} шт
                        </span>
                      </div>

                      {(selectedPrinter || order.notes?.match(/\[Принтер:\s*([^\]]+)\]/)?.[1]) && (
                        <div className="flex items-center justify-between text-[11px] text-[#71717a]">
                          <span>Принтер:</span>
                          <span className="text-[#d4d4d8] truncate max-w-[160px]">
                            {selectedPrinter || order.notes?.match(/\[Принтер:\s*([^\]]+)\]/)?.[1]}
                          </span>
                        </div>
                      )}

                      {(selectedFilament || order.notes?.match(/\[Пластик:\s*([^\]]+)\]/)?.[1]) && (
                        <div className="flex items-center justify-between text-[11px] text-[#71717a]">
                          <span>Пластик:</span>
                          <span className="text-[#d4d4d8] truncate max-w-[160px]">
                            {selectedFilament || order.notes?.match(/\[Пластик:\s*([^\]]+)\]/)?.[1]}
                          </span>
                        </div>
                      )}

                      {((parseFloat(calcWeight) > 0) || (parseInt(calcHours) > 0 || parseInt(calcMinutes) > 0)) && (
                        <div className="flex items-center justify-between text-[11px] text-[#71717a]">
                          <span>Печать:</span>
                          <span className="text-[#d4d4d8]">
                            {parseFloat(calcWeight) > 0 ? `${calcWeight} г` : ''}
                            {parseFloat(calcWeight) > 0 && (parseInt(calcHours) > 0 || parseInt(calcMinutes) > 0) ? ' · ' : ''}
                            {parseInt(calcHours) > 0 || parseInt(calcMinutes) > 0 ? `${calcHours}ч ${calcMinutes}м` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 2. Сроки выполнения */}
                    <div className="space-y-1 pb-3 border-b border-[#222226] text-[11px]">
                      <div className="flex items-center justify-between text-[#71717a]">
                        <span className="uppercase text-[10px] tracking-wider font-semibold">Сроки:</span>
                        {daysBetweenDates !== null && (
                          <span className="text-[#d4d4d8]">
                            {daysBetweenDates === 1 ? '1 день' : `${daysBetweenDates} дн`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[#71717a]">
                        <span>Приёмка:</span>
                        <span className="text-[#d4d4d8]">{order.date || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#71717a]">
                        <span>Дедлайн:</span>
                        <span className={order.deadline ? 'text-white' : 'text-[#52525b]'}>
                          {order.deadline || 'Не установлен'}
                        </span>
                      </div>
                    </div>

                    {/* 3. Клиент и контакты */}
                    <div className="space-y-1 pb-3 border-b border-[#222226] text-[11px]">
                      <div className="flex items-center justify-between text-[#71717a]">
                        <span className="uppercase text-[10px] tracking-wider font-semibold">Клиент:</span>
                        <span className="text-[#d4d4d8]">{order.client || 'Авито'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#71717a]">
                        <span>Имя:</span>
                        <span className="text-white truncate max-w-[160px]">{order.client_name || order.contact || 'Не указано'}</span>
                      </div>

                      {(order.contacts || []).filter(c => c.value && c.value.trim().length > 0).map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[#71717a]">
                          <span className="capitalize">{c.label || c.type}:</span>
                          <span className="text-[#d4d4d8] truncate max-w-[160px]">{c.value}</span>
                        </div>
                      ))}

                      {order.notes && order.notes.replace(/\[(Принтер|Пластик):[^\]]*\]/g, '').trim() && (
                        <div className="pt-1 text-[#71717a]">
                          <span className="text-[10px] uppercase block">Примечание:</span>
                          <span className="text-[#a1a1aa] text-[11px] line-clamp-2 leading-tight block pt-0.5">
                            {order.notes.replace(/\[(Принтер|Пластик):[^\]]*\]/g, '').trim()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 4. Финансы и оплата */}
                    <div className="space-y-1.5 text-[11px]">
                      <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold pb-0.5">
                        ФИНАНСОВЫЙ РАСЧЕТ
                      </div>

                      <div className="flex items-baseline justify-between text-[#71717a]">
                        <span>Базовая цена:</span>
                        <span className="text-[#d4d4d8]">{formatMoney(order.base_amount || order.amount || 0)}</span>
                      </div>

                      {Boolean(order.urgency_percent || order.urgency_amount) && (
                        <div className="flex items-baseline justify-between text-[#71717a]">
                          <span>Срочность:</span>
                          <span className="text-[#d4d4d8]">+{formatMoney(financials.urgencyCost)}</span>
                        </div>
                      )}

                      {Boolean(order.discount_percent || order.discount_amount) && (
                        <div className="flex items-baseline justify-between text-[#71717a]">
                          <span>Скидка:</span>
                          <span className="text-[#d4d4d8]">-{formatMoney(financials.discountTotal)}</span>
                        </div>
                      )}

                      {extraCostItems.length > 0 && (
                        <div className="flex items-baseline justify-between text-[#71717a]">
                          <span>Доп. расходы:</span>
                          <span className="text-[#d4d4d8]">
                            +{formatMoney(extraCostItems.reduce((acc, it) => acc + (it.amount || 0), 0))}
                          </span>
                        </div>
                      )}

                      <div className="flex items-baseline justify-between text-[#71717a]">
                        <span>Себестоимость:</span>
                        <span className="text-[#d4d4d8]">-{formatMoney(costVal)}</span>
                      </div>

                      <div className="flex items-baseline justify-between text-white font-semibold pt-1 border-t border-[#222226]">
                        <span>Итого клиенту:</span>
                        <span className="text-sm">{formatMoney(totalAmount)}</span>
                      </div>

                      <div className="flex items-baseline justify-between text-[#a1a1aa]">
                        <span>Чистая прибыль:</span>
                        <span className="text-white">
                          {profitVal >= 0 ? `+${formatMoney(profitVal)}` : formatMoney(profitVal)} ({marginPercent.toFixed(0)}%)
                        </span>
                      </div>

                      {/* Оплата и прогресс */}
                      <div className="pt-2 border-t border-[#222226] space-y-1.5">
                        <div className="flex items-baseline justify-between text-[11px]">
                          <span className="text-[#71717a]">Оплата:</span>
                          <span className="text-white">
                            {formatMoney(order.payment || 0)} <span className="text-[#71717a]">/ {formatMoney(totalAmount)}</span>
                          </span>
                        </div>

                        {/* Тонкий аккуратный прогресс-бар */}
                        <div className="w-full h-1 bg-[#222226] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full "
                            style={{ width: `${Math.min(100, Math.max(paymentRatio > 0 ? 4 : 0, paymentRatio * 100))}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#71717a]">
                          <span>Остаток:</span>
                          <span className={remainingDebt > 0 ? 'text-[#f87171]' : 'text-[#d4d4d8]'}>
                            {remainingDebt > 0 ? formatMoney(remainingDebt) : 'Оплачен'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ========================================================================= */
                  /* СВОДКА ДЛЯ РАСХОДА (ОПЕРАЦИЯ СПИСАНИЯ СРЕДСТВ)                            */
                  /* ========================================================================= */
                  <div className="space-y-4">
                    {/* Заголовок Сводки расхода */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#222226]">
                      <div className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider font-semibold">
                        СВОДКА РАСХОДА
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#f87171]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]" />
                        <span>Списание</span>
                      </div>
                    </div>

                    {/* 1. Детали и категория расхода */}
                    <div className="space-y-1.5 pb-3 border-b border-[#222226]">
                      <div className="text-white font-medium text-xs break-words">
                        {order.title || 'Новый расход'}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#71717a] pt-0.5">
                        <span>Категория:</span>
                        <span className="text-[#d4d4d8] font-medium truncate max-w-[160px]">
                          {order.client || DEFAULT_EXPENSE_CATEGORIES[0]}
                        </span>
                      </div>
                    </div>

                    {/* 2. Дата списания и статус учета */}
                    <div className="space-y-1 pb-3 border-b border-[#222226] text-[11px]">
                      <div className="flex items-center justify-between text-[#71717a]">
                        <span className="uppercase text-[10px] tracking-wider font-semibold">УЧЕТ:</span>
                        <span className="text-[#34d399]">Проведено</span>
                      </div>
                      <div className="flex items-center justify-between text-[#71717a]">
                        <span>Дата списания:</span>
                        <span className="text-[#d4d4d8]">{order.date || 'Сегодня'}</span>
                      </div>
                    </div>

                    {/* 3. Поставщик / чек / примечания */}
                    <div className="space-y-1 pb-3 border-b border-[#222226] text-[11px]">
                      <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                        ПОСТАВЩИК / ЧЕК
                      </div>
                      <div className="text-[#a1a1aa] text-[11px] leading-relaxed line-clamp-3 pt-0.5">
                        {order.notes || 'Информация о поставщике и чеке не указана'}
                      </div>
                    </div>

                    {/* 4. Финансовый итог расхода */}
                    <div className="space-y-1.5 text-[11px]">
                      <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold pb-0.5">
                        ФИНАНСОВЫЙ ИТОГ
                      </div>

                      <div className="flex items-baseline justify-between text-[#71717a]">
                        <span>Тип затрат:</span>
                        <span className="text-[#d4d4d8]">Операционный расход</span>
                      </div>

                      <div className="flex items-baseline justify-between text-[#71717a]">
                        <span>Влияние на баланс:</span>
                        <span className="text-[#f87171]">Снижает прибыль</span>
                      </div>

                      <div className="flex items-baseline justify-between text-white font-semibold pt-1.5 border-t border-[#222226]">
                        <span>Сумма расхода:</span>
                        <span className="text-base text-[#f87171]">-{formatMoney(order.amount || 0)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Нижние кнопки сохранения */}
                <div className="pt-3 border-t border-[#222226] space-y-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-2 rounded-lg bg-white hover:bg-[#e4e4e7] text-black font-semibold text-xs font-mono cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-wait"
                  >
                    {isSubmitting ? 'Сохранение…' : order.id
                      ? (isIncome ? 'Сохранить изменения' : 'Сохранить расход')
                      : (isIncome ? 'Создать заказ' : 'Записать расход')}
                  </button>

                  <button
                    type="button"
                    onClick={handleAttemptClose}
                    className="w-full py-1.5 rounded-lg bg-transparent hover:bg-white/5 border border-white/10 text-[#71717a] hover:text-white text-xs font-mono cursor-pointer"
                  >
                    Закрыть [Esc]
                  </button>
                </div>

              </div>

            </div>
          </motion.div>

          {/* Окно предупреждения при выходе с несохраненными данными */}
          <AnimatePresence>
            {showUnsavedWarning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, pointerEvents: 'none' }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10, transition: { duration: 0.15 } }}
                  className="bg-[#121214] border border-[#27272c] rounded-2xl shadow-2xl p-5 max-w-md w-full space-y-4 font-mono text-xs"
                >
                  <div className="flex items-start gap-3 p-3.5 bg-[#18181b] border border-[#27272c] rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-[#d4d4d8] leading-relaxed font-sans">
                      В форме {order?.id ? `заказа #${order.order_number || ''}` : 'создания'} есть несохраненные данные. Что вы хотите сделать?
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1 border-t border-[#222226]">
                    <button
                      type="button"
                      onClick={(e) => {
                        if (isClosingRef.current) return;
                        isClosingRef.current = true;
                        setShowUnsavedWarning(false);
                        handleSubmit(e);
                      }}
                      className="w-full py-2.5 rounded-lg bg-white text-black font-semibold text-xs font-mono hover:bg-[#e4e4e7] cursor-pointer"
                    >
                      Сохранить и закрыть
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmDiscardAndClose}
                      className="w-full py-2 rounded-lg bg-[#18181b] border border-[#27272c] text-[#f87171] hover:text-white hover:bg-[#222228] text-xs font-mono cursor-pointer"
                    >
                      Сбросить изменения и закрыть
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUnsavedWarning(false)}
                      className="w-full py-1.5 text-center text-[11px] text-[#71717a] hover:text-white cursor-pointer"
                    >
                      [ Продолжить редактирование ]
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}
    </AnimatePresence>
  );
}
