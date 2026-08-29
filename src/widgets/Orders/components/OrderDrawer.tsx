'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Order, 
  OrderStatus, 
  ContactItem, 
  ContactType, 
  CostItem 
} from '../types';
import { 
  STATUS_CONFIG, 
  CLIENT_CONFIG, 
  ALL_STATUSES, 
  ALL_CLIENTS,
  CONTACT_TYPES_CONFIG 
} from '../types';
import { 
  formatMoney, 
  roundTo2, 
  getDeadlineInfo, 
  getContactHref, 
  calculateOrderFinancials 
} from '../helpers';
import { DEFAULT_COST_CATEGORIES, getCategoryConfig } from '../../../shared/lib/costCategories';
import { DatePicker } from '../../../shared/ui/DatePicker';
import { NumberCounter } from '../../../shared/ui/NumberCounter';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { CockpitDropdown, CockpitDropdownOption } from '../../../shared/ui/CockpitDropdown';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { 
  X, 
  Edit2, 
  Copy, 
  Trash2, 
  CreditCard, 
  Receipt, 
  Plus, 
  Phone, 
  Send, 
  MessageCircle, 
  Share2, 
  ExternalLink, 
  Check, 
  DollarSign, 
  Flame, 
  Tag, 
  Clock, 
  NotebookPen,
  Calendar,
  Layers,
  ShoppingBag,
  List,
  AlertCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_DROPDOWN_OPTIONS: CockpitDropdownOption[] = ALL_STATUSES.map((st) => {
  const cfg = STATUS_CONFIG[st];
  let dotColor: 'cyan' | 'green' | 'orange' | 'red' | 'gray' = 'cyan';
  if (st === 'Готово') dotColor = 'green';
  else if (st === 'Не в работе') dotColor = 'red';
  else if (st === 'Моделирование' || st === 'Ждет покраски') dotColor = 'orange';
  else if (st === 'Печать' || st === 'Ждет печати' || st === 'Отправлен') dotColor = 'cyan';

  return {
    value: st,
    label: cfg.label,
    icon: cfg.icon,
    statusDotColor: dotColor,
  };
});

const CLIENT_DROPDOWN_OPTIONS: CockpitDropdownOption[] = ALL_CLIENTS.map((cl) => {
  const cfg = CLIENT_CONFIG[cl];
  return {
    value: cl,
    label: cfg.label,
    icon: cfg.icon,
  };
});

const CONTACT_TYPE_DROPDOWN_OPTIONS: CockpitDropdownOption[] = [
  { value: 'phone', label: 'Телефон', icon: Phone },
  { value: 'telegram', label: 'Telegram', icon: Send },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'avito', label: 'Авито', icon: ShoppingBag },
  { value: 'vk', label: 'ВКонтакте', icon: Share2 },
  { value: 'email', label: 'Email', icon: ExternalLink },
  { value: 'other', label: 'Другое', icon: Layers },
];

export type DrawerTab = 
  | 'all' 
  | 'order_info' 
  | 'client' 
  | 'deadline' 
  | 'status' 
  | 'pricing' 
  | 'payments' 
  | 'costs' 
  | 'date';

interface OrderDrawerProps {
  order: Order | null;
  initialTab?: DrawerTab;
  onClose: () => void;
  onUpdateOrder: (updatedOrder: Order) => void;
  onOpenEditModal: (order: Order) => void;
  onDuplicateOrder: (order: Order) => void;
  onRequestDelete: (order: Order) => void;
  onUpdateStatus: (order: Order, newStatus: OrderStatus) => void;
  onAddPayment: (order: Order, amount: number) => void;
  onDeletePayment: (order: Order, index: number) => void;
  onAddCostItem: (order: Order, category: string, amount: number, note?: string) => void;
  onUpdateCostItem: (order: Order, index: number, field: keyof CostItem, value: any) => void;
  onDeleteCostItem: (order: Order, index: number) => void;
  onAddContact: (order: Order, type: ContactType, value: string) => void;
  onDeleteContact: (order: Order, index: number) => void;
  onSaveNotes: (order: Order, notes: string) => void;
}

export function OrderDrawer({
  order,
  initialTab = 'all',
  onClose,
  onUpdateOrder,
  onOpenEditModal,
  onDuplicateOrder,
  onRequestDelete,
  onUpdateStatus,
  onAddPayment,
  onDeletePayment,
  onAddCostItem,
  onUpdateCostItem,
  onDeleteCostItem,
  onAddContact,
  onDeleteContact,
  onSaveNotes,
}: OrderDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab);

  // Локальные копии полей для мгновенного редактирования в активной секции
  const [draftTitle, setDraftTitle] = useState('');
  const [draftQuantity, setDraftQuantity] = useState(1);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftClient, setDraftClient] = useState('Авито');
  const [draftDate, setDraftDate] = useState('');
  const [draftDeadline, setDraftDeadline] = useState('');
  const [draftBaseAmount, setDraftBaseAmount] = useState<number>(0);
  const [draftUrgencyType, setDraftUrgencyType] = useState<'percent' | 'fixed'>('percent');
  const [draftUrgencyVal, setDraftUrgencyVal] = useState<number>(0);
  const [draftDiscountType, setDraftDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [draftDiscountVal, setDraftDiscountVal] = useState<number>(0);

  // Стейты быстрых форм добавления
  const [newPaymentVal, setNewPaymentVal] = useState('');
  const [selectedCostCat, setSelectedCostCat] = useState('Печать');
  const [customCostCatName, setCustomCostCatName] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');
  const [newCostNote, setNewCostNote] = useState('');
  const [newContactType, setNewContactType] = useState<ContactType>('phone');
  const [newContactVal, setNewContactVal] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  // Модалка предупреждения о несохраненных изменениях
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const initialOrderRef = useRef<Order | null>(null);
  const isClosingRef = useRef(false);

  // Блокировка прокрутки страницы при открытом боковом меню
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow || 'unset';
    };
  }, []);

  useEffect(() => {
    isClosingRef.current = false;
  }, [order?.id]);

  useEffect(() => {
    setActiveTab(initialTab || 'all');
  }, [initialTab, order?.id]);

  // Сброс драфтов только при смене ID заказа
  useEffect(() => {
    if (order && (!initialOrderRef.current || initialOrderRef.current.id !== order.id)) {
      initialOrderRef.current = order;
      setDraftTitle(order.title || '');
      setDraftQuantity(order.quantity || 1);
      setDraftNotes(order.notes || '');
      setDraftClient(order.client || 'Авито');
      setDraftDate(order.date || '');
      setDraftDeadline(order.deadline || '');
      setDraftBaseAmount(order.base_amount !== undefined ? order.base_amount : (order.amount || 0));
      setDraftUrgencyType(order.urgency_type || 'percent');
      setDraftUrgencyVal(order.urgency_type === 'fixed' ? (order.urgency_amount || 0) : (order.urgency_percent || 0));
      setDraftDiscountType(order.discount_type || 'percent');
      setDraftDiscountVal(order.discount_type === 'fixed' ? (order.discount_amount || 0) : (order.discount_percent || 0));
    }
  }, [order?.id]);

  // Проверка наличия несохраненных изменений против initialOrderRef
  const hasUnsavedChanges = useMemo(() => {
    const baseOrder = initialOrderRef.current || order;
    if (!baseOrder) return false;
    const origBase = baseOrder.base_amount !== undefined ? baseOrder.base_amount : (baseOrder.amount || 0);
    const origUrgency = baseOrder.urgency_type === 'fixed' ? (baseOrder.urgency_amount || 0) : (baseOrder.urgency_percent || 0);
    const origDiscount = baseOrder.discount_type === 'fixed' ? (baseOrder.discount_amount || 0) : (baseOrder.discount_percent || 0);

    const titleChanged = draftTitle.trim() !== (baseOrder.title || '').trim();
    const qtyChanged = draftQuantity !== (baseOrder.quantity || 1);
    const notesChanged = draftNotes.trim() !== (baseOrder.notes || '').trim();
    const clientChanged = draftClient !== (baseOrder.client || 'Авито');
    const dateChanged = draftDate !== (baseOrder.date || '');
    const deadlineChanged = draftDeadline !== (baseOrder.deadline || '');
    const baseChanged = roundTo2(draftBaseAmount) !== roundTo2(origBase);
    const urgencyValChanged = draftUrgencyVal !== origUrgency;
    const urgencyTypeChanged = draftUrgencyType !== (baseOrder.urgency_type || 'percent');
    const discountValChanged = draftDiscountVal !== origDiscount;
    const discountTypeChanged = draftDiscountType !== (baseOrder.discount_type || 'percent');

    return (
      titleChanged ||
      qtyChanged ||
      notesChanged ||
      clientChanged ||
      dateChanged ||
      deadlineChanged ||
      baseChanged ||
      urgencyValChanged ||
      urgencyTypeChanged ||
      discountValChanged ||
      discountTypeChanged
    );
  }, [
    order,
    draftTitle,
    draftQuantity,
    draftNotes,
    draftClient,
    draftDate,
    draftDeadline,
    draftBaseAmount,
    draftUrgencyVal,
    draftUrgencyType,
    draftDiscountVal,
    draftDiscountType,
  ]);

  // Перехват Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (!isClosingRef.current) {
          handleAttemptClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [hasUnsavedChanges]);

  if (!order) return null;

  const isIncome = order.type === 'income';
  const totalAmount = roundTo2(order.amount || 0);
  const totalPaid = roundTo2(order.payment || 0);
  const isFullyPaid = isIncome && totalPaid >= totalAmount && totalAmount > 0;
  const remainingDebt = Math.max(0, roundTo2(totalAmount - totalPaid));
  
  const costVal = roundTo2(order.cost || 0);
  const netProfit = roundTo2(isIncome ? totalAmount - costVal : -totalAmount);
  const marginPercent = isIncome && totalAmount > 0 ? (netProfit / totalAmount) * 100 : 0;
  const paymentProgressPercent = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 0;

  const deadlineInfo = getDeadlineInfo(order.deadline, order.status);

  const paymentsList = order.payments && order.payments.length > 0 
    ? order.payments 
    : (order.payment ? [order.payment] : []);

  const costItemsList = order.cost_items && order.cost_items.length > 0
    ? order.cost_items
    : (order.cost ? [{ id: 'init-1', category: 'Печать', amount: order.cost }] : []);

  const contactsList: ContactItem[] = order.contacts && order.contacts.length > 0
    ? order.contacts
    : (order.contact && order.contact.trim() !== '' ? [{ type: 'phone', value: order.contact }] : []);

  const triggerSaveNotification = () => {
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 2000);
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Главная функция комплексного сохранения всех изменений
  const handleSaveAllChanges = () => {
    const prevQty = Math.max(1, order.quantity || 1);
    const newQty = Math.max(1, draftQuantity);
    let newBase = roundTo2(draftBaseAmount);
    let newCost = order.cost || 0;
    let newCostItems = order.cost_items || [];

    if (prevQty !== newQty && isIncome) {
      const ratio = newQty / prevQty;
      newBase = roundTo2(newBase * ratio);
      newCost = roundTo2(newCost * ratio);
      newCostItems = newCostItems.map(ci => ({ ...ci, amount: roundTo2((ci.amount || 0) * ratio) }));
    }

    const updatedDraft = {
      ...order,
      title: draftTitle.trim() || (isIncome ? 'Заказ на печать' : 'Расход'),
      quantity: newQty,
      notes: draftNotes.trim(),
      client: draftClient,
      date: draftDate,
      deadline: draftDeadline,
      base_amount: newBase,
      urgency_type: draftUrgencyType,
      urgency_percent: draftUrgencyType === 'percent' ? draftUrgencyVal : 0,
      urgency_amount: draftUrgencyType === 'fixed' ? draftUrgencyVal : 0,
      discount_type: draftDiscountType,
      discount_percent: draftDiscountType === 'percent' ? draftDiscountVal : 0,
      discount_amount: draftDiscountType === 'fixed' ? draftDiscountVal : 0,
      cost: newCost,
      cost_items: newCostItems,
    };

    const newFin = calculateOrderFinancials(updatedDraft);
    const wasFullyPaid = (order.payment || 0) >= (order.amount || 0) && (order.amount || 0) > 0;
    const newPayment = wasFullyPaid ? newFin.finalAmount : (order.payment || 0);

    const finalUpdated: Order = {
      ...updatedDraft,
      amount: newFin.finalAmount,
      payment: newPayment,
      payments: wasFullyPaid ? [newPayment] : order.payments,
    };

    initialOrderRef.current = finalUpdated;
    onUpdateOrder(finalUpdated);
    triggerSaveNotification();
  };

  // Перехват закрытия при несохраненных изменениях
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

  // Пресеты дедлайна
  const handleApplyDeadlinePreset = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const formatted = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    setDraftDeadline(formatted);
  };

  const handleQuickAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newPaymentVal);
    if (!isNaN(val) && val > 0) {
      onAddPayment(order, val);
      setNewPaymentVal('');
      triggerSaveNotification();
    }
  };

  const handleQuickPayFull = () => {
    if (remainingDebt <= 0) return;
    onAddPayment(order, remainingDebt);
    triggerSaveNotification();
  };

  const handleQuickAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    const category = selectedCostCat === 'custom' ? customCostCatName.trim() : selectedCostCat;
    const amount = parseFloat(newCostAmount);
    if (category && !isNaN(amount) && amount > 0) {
      onAddCostItem(order, category, amount, newCostNote);
      setNewCostAmount('');
      setNewCostNote('');
      setCustomCostCatName('');
      triggerSaveNotification();
    }
  };

  const handleQuickAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (newContactVal.trim()) {
      onAddContact(order, newContactType, newContactVal.trim());
      setNewContactVal('');
      triggerSaveNotification();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, pointerEvents: 'auto' }}
      exit={{ opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-50 overflow-hidden select-none"
    >
      {/* Затемняющий фон */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, pointerEvents: 'auto' }}
        exit={{ opacity: 0, pointerEvents: 'none' }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={handleAttemptClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%', transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="w-screen max-w-xl bg-neutral-950 border-l border-white/15 shadow-2xl flex flex-col justify-between text-xs text-neutral-300 font-mono"
        >
          {/* 1. Шапка Drawer */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-neutral-900/80 space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 3 Светодиода терминала */}
                <div className="flex items-center gap-1.5 mr-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>

                <Tooltip content={`ID: ${order.id} (Нажмите для копирования)`}>
                  <button
                    type="button"
                    onClick={() => handleCopy(order.id || `#ord-${order.order_number}`)}
                    className="px-2 py-0.5 rounded font-mono text-xs font-bold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>#ORD-{order.order_number || order.id.slice(0, 4)}</span>
                    {copiedText === (order.id || `#ord-${order.order_number}`) ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </Tooltip>

                <span className="text-[10px] text-neutral-400 font-mono">
                  {order.date}
                </span>

                {!isIncome ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/40 font-bold">
                    Расход
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-bold">
                    Доход
                  </span>
                )}

                {hasUnsavedChanges && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded animate-pulse">
                    <AlertCircle className="w-3 h-3" /> Правки не сохранены
                  </span>
                )}

                {showSavedNotification && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40"
                  >
                    <Check className="w-3 h-3" /> Сохранено
                  </motion.span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Tooltip content="Дублировать запись">
                  <button
                    type="button"
                    onClick={() => onDuplicateOrder(order)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>

                <Tooltip content="Удалить запись">
                  <button
                    type="button"
                    onClick={() => onRequestDelete(order)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer border border-white/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>

                <Tooltip content="Закрыть панель" shortcut="Esc">
                  <button
                    type="button"
                    onClick={handleAttemptClose}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/10 ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-sans tracking-tight flex items-center gap-2">
                <span className="truncate">{draftTitle || (isIncome ? 'Заказ на печать' : 'Операционный расход')}</span>
                {isIncome && (
                  <span className="text-xs text-neutral-400 font-mono bg-white/[0.04] px-2 py-0.5 rounded border border-white/10 shrink-0">
                    ×{draftQuantity || 1} шт
                  </span>
                )}
              </h2>
            </div>

            {/* Быстрые вкладки фильтрации */}
            <div className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-white/5 scrollbar-none">
              {(
                [
                  { id: 'all', label: 'ВСЕ' },
                  { id: 'order_info', label: 'ЗАКАЗ' },
                  ...(isIncome ? [
                    { id: 'client', label: 'КЛИЕНТ' },
                    { id: 'deadline', label: 'СРОК' },
                    { id: 'status', label: 'СТАТУС' },
                    { id: 'pricing', label: 'СУММА' },
                    { id: 'payments', label: 'ОПЛАТА' },
                    { id: 'costs', label: 'СЕБЕСТОИМОСТЬ' },
                  ] : []),
                  { id: 'date', label: 'ДАТА' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as DrawerTab)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-neutral-950 font-bold shadow-sm'
                      : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200 border border-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Контент Drawer со скроллом */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar select-text text-xs">
            
            {/* РЯД 4-Х KPI КАРТОЧЕК */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] text-neutral-500 uppercase font-mono">
                  {isIncome ? 'Сумма заказа' : 'Сумма расхода'}
                </div>
                <div className="text-sm font-bold text-white mt-0.5 font-mono">
                  {formatMoney(totalAmount)}
                </div>
              </div>

              {isIncome ? (
                <>
                  <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3">
                    <div className="text-[10px] text-neutral-500 uppercase font-mono">Себестоимость</div>
                    <div className="text-sm font-bold text-neutral-300 mt-0.5 font-mono">
                      {formatMoney(costVal)}
                    </div>
                  </div>

                  <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3">
                    <div className="text-[10px] text-neutral-500 uppercase font-mono">Чистая прибыль</div>
                    <div className={`text-sm font-bold mt-0.5 font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {netProfit >= 0 ? `+${formatMoney(netProfit)}` : formatMoney(netProfit)}
                      <span className="text-[10px] text-neutral-500 font-normal ml-1">({marginPercent.toFixed(0)}%)</span>
                    </div>
                  </div>

                  <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3">
                    <div className="text-[10px] text-neutral-500 uppercase font-mono">Оплата</div>
                    <div className="text-sm font-bold mt-0.5 font-mono flex items-center justify-between">
                      <span className={isFullyPaid ? 'text-emerald-400' : 'text-amber-400'}>
                        {formatMoney(totalPaid)}
                      </span>
                      {remainingDebt > 0 && (
                        <span className="text-[10px] text-rose-400 font-normal">
                          долг {formatMoney(remainingDebt)}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono">Тип записи</div>
                  <div className="text-sm font-bold text-rose-400 mt-0.5 font-mono">
                    Затраты
                  </div>
                </div>
              )}
            </div>

            {/* РЕЖИМ 1: Редактирование Наименования, Тиража и Заметок */}
            {(activeTab === 'order_info' || activeTab === 'all') && (
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                  <span>§ ПАРАМЕТРЫ ИЗДЕЛИЯ И ТЕХТРЕБОВАНИЯ</span>
                </div>

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400 block uppercase">
                      Наименование:
                    </label>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="Название заказа..."
                      className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none font-sans"
                    />
                  </div>

                  {isIncome && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400 block uppercase">
                        Тираж (шт):
                      </label>
                      <NumberCounter
                        value={draftQuantity}
                        onChange={(newQ) => setDraftQuantity(newQ)}
                        min={1}
                        max={9999}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400 block uppercase">
                      Техтребования, примечания и заметки:
                    </label>
                    <textarea
                      rows={2}
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Цвет, высота слоя, адрес доставки или трек-номер..."
                      className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg p-2.5 text-xs text-white focus:outline-none resize-none font-sans"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* РЕЖИМ 2: Клиент, Канал продаж и Контакты */}
            {isIncome && (activeTab === 'client' || activeTab === 'all') && (
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between text-[10px] text-neutral-500 font-bold uppercase tracking-wider border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>§ КЛИЕНТ И КАНАЛ СВЯЗИ</span>
                  </span>
                  <div className="w-36">
                    <CockpitDropdown
                      variant="ghost"
                      options={CLIENT_DROPDOWN_OPTIONS}
                      value={draftClient}
                      onChange={setDraftClient}
                      buttonClassName="!h-7 !py-0.5 !text-[11px]"
                    />
                  </div>
                </div>

                {/* Список контактов */}
                <div className="space-y-1.5">
                  {contactsList.length === 0 ? (
                    <p className="text-[11px] text-neutral-500 italic py-1">[ Контакты не указаны ]</p>
                  ) : (
                    contactsList.map((c, idx) => {
                      const href = getContactHref(c.type, c.value);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/70 border border-white/10 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                            <span className="text-[10px] text-cyan-300 font-bold uppercase shrink-0">
                              {c.type}:
                            </span>
                            <span className="truncate text-white font-mono">{c.value}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {href && (
                              <Tooltip content="Перейти по ссылке">
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded text-neutral-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </Tooltip>
                            )}
                            <Tooltip content="Скопировать">
                              <button
                                type="button"
                                onClick={() => handleCopy(c.value)}
                                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Удалить">
                              <button
                                type="button"
                                onClick={() => onDeleteContact(order, idx)}
                                className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Быстрое добавление контакта */}
                <form onSubmit={handleQuickAddContact} className="pt-2 border-t border-white/5 flex gap-2">
                  <div className="w-28 shrink-0">
                    <CockpitDropdown
                      variant="input"
                      options={CONTACT_TYPE_DROPDOWN_OPTIONS}
                      value={newContactType}
                      onChange={val => setNewContactType(val as ContactType)}
                      buttonClassName="!h-8 !py-0.5 !text-[11px]"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Новый контакт..."
                    value={newContactVal}
                    onChange={e => setNewContactVal(e.target.value)}
                    className="flex-1 h-8 bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-2.5 text-xs text-white focus:outline-none font-mono"
                  />
                  <CockpitButton type="submit" icon={Plus} size="sm">
                    Добавить
                  </CockpitButton>
                </form>
              </div>
            )}

            {/* РЕЖИМ 3: Срок сдачи (Дедлайн) */}
            {isIncome && (activeTab === 'deadline' || activeTab === 'all') && (
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between text-[10px] text-neutral-500 font-bold uppercase tracking-wider border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>§ СРОК СДАЧИ (ДЕДЛАЙН)</span>
                  </span>
                  {draftDeadline && (
                    <button
                      type="button"
                      onClick={() => setDraftDeadline('')}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      [ Без дедлайна ]
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <DatePicker
                    value={draftDeadline}
                    onChange={setDraftDeadline}
                    format="DD.MM.YYYY"
                  />

                  {/* Пресеты дедлайна */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-neutral-500">Пресет:</span>
                    {[
                      { label: '+1 день', days: 1 },
                      { label: '+2 дня', days: 2 },
                      { label: '+3 дня', days: 3 },
                      { label: '+1 неделя', days: 7 },
                    ].map(p => (
                      <button
                        key={p.days}
                        type="button"
                        onClick={() => handleApplyDeadlinePreset(p.days)}
                        className="px-2 py-0.5 rounded bg-neutral-950 border border-white/10 hover:border-amber-500/40 text-neutral-300 hover:text-white text-[10px] font-mono cursor-pointer transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* РЕЖИМ 4: Статус производства */}
            {isIncome && (activeTab === 'status' || activeTab === 'all') && (
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>§ ЭТАП ПРОИЗВОДСТВА</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {ALL_STATUSES.map(st => {
                    const isSel = order.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onUpdateStatus(order, st)}
                        className={`p-2 rounded-lg text-left text-xs font-mono transition-all cursor-pointer border ${
                          isSel
                            ? 'bg-white/15 text-white border-white/30 font-bold shadow-sm'
                            : 'bg-neutral-950/70 border-white/10 text-neutral-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-cyan-400' : 'bg-neutral-600'}`} />
                          <span className="truncate">{st}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* РЕЖИМ 5: Стоимость и скидки */}
            {isIncome && (activeTab === 'pricing' || activeTab === 'all') && (
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>§ СТОИМОСТЬ, СРОЧНОСТЬ И СКИДКА</span>
                </div>

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400 block uppercase">
                      Базовая стоимость (₽):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={draftBaseAmount || ''}
                      onChange={e => setDraftBaseAmount(parseFloat(e.target.value) || 0)}
                      className="w-full h-8 bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-3 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>

                  {/* Срочность */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Flame size={12} className="text-amber-400" /> Наценка за срочность:
                      </span>
                      <span className="text-amber-300 font-bold">
                        {draftUrgencyType === 'percent' ? `+${draftUrgencyVal}%` : `+${draftUrgencyVal} ₽`}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 25, 50, 100].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setDraftUrgencyType('percent');
                            setDraftUrgencyVal(draftUrgencyVal === pct ? 0 : pct);
                          }}
                          className={`flex-1 py-1 rounded text-[11px] font-mono transition-all cursor-pointer border ${
                            draftUrgencyType === 'percent' && draftUrgencyVal === pct
                              ? 'bg-amber-950/60 text-amber-300 border-amber-500/50 font-bold'
                              : 'bg-neutral-950 border-white/10 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {pct === 0 ? '0%' : `+${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Скидка */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Tag size={12} className="text-emerald-400" /> Скидка:
                      </span>
                      <span className="text-emerald-300 font-bold">
                        {draftDiscountType === 'percent' ? `-${draftDiscountVal}%` : `-${draftDiscountVal} ₽`}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 5, 10, 15, 20].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setDraftDiscountType('percent');
                            setDraftDiscountVal(draftDiscountVal === pct ? 0 : pct);
                          }}
                          className={`flex-1 py-1 rounded text-[11px] font-mono transition-all cursor-pointer border ${
                            draftDiscountType === 'percent' && draftDiscountVal === pct
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 font-bold'
                              : 'bg-neutral-950 border-white/10 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {pct === 0 ? '0%' : `-${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* РЕЖИМ 6: Оплата */}
            {isIncome && (activeTab === 'payments' || activeTab === 'all') && (
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between text-[10px] text-neutral-500 font-bold uppercase tracking-wider border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                    <span>§ ИСТОРИЯ И ГРАФИК ОПЛАТЫ</span>
                  </span>
                  <span className="text-white font-mono font-bold">
                    {formatMoney(totalPaid)} / {formatMoney(totalAmount)}
                  </span>
                </div>

                {/* Список внесенных платежей */}
                <div className="space-y-1.5">
                  {paymentsList.length === 0 ? (
                    <p className="text-[11px] text-neutral-500 italic py-1">[ Платежи не внесены ]</p>
                  ) : (
                    paymentsList.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/70 border border-white/10 text-xs font-mono"
                      >
                        <span className="text-neutral-400">Платеж #{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <strong className="text-emerald-400 font-bold">{formatMoney(p)}</strong>
                          <Tooltip content="Удалить платеж">
                            <button
                              type="button"
                              onClick={() => onDeletePayment(order, idx)}
                              className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Быстрое добавление платежа */}
                <form onSubmit={handleQuickAddPayment} className="pt-2 border-t border-white/5 flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Сумма (₽)..."
                    value={newPaymentVal}
                    onChange={e => setNewPaymentVal(e.target.value)}
                    className="flex-1 h-8 bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-2.5 text-xs text-white focus:outline-none font-mono"
                  />
                  {remainingDebt > 0 && (
                    <CockpitButton
                      type="button"
                      onClick={handleQuickPayFull}
                      size="sm"
                      className="text-[11px]"
                    >
                      Закрыть долг
                    </CockpitButton>
                  )}
                  <CockpitButton type="submit" icon={Plus} size="sm">
                    Внести
                  </CockpitButton>
                </form>
              </div>
            )}

            {/* РЕЖИМ 7: Себестоимость и статьи затрат */}
            {(activeTab === 'costs' || activeTab === 'all') && (
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between text-[10px] text-neutral-500 font-bold uppercase tracking-wider border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                    <span>§ СТАТЬИ СЕБЕСТОИМОСТИ</span>
                  </span>
                  <span className="text-white font-mono font-bold">
                    Итого: {formatMoney(costVal)}
                  </span>
                </div>

                {/* Список статей */}
                <div className="space-y-1.5">
                  {costItemsList.length === 0 ? (
                    <p className="text-[11px] text-neutral-500 italic py-1">[ Затраты не зафиксированы ]</p>
                  ) : (
                    costItemsList.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/70 border border-white/10 text-xs font-mono"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="text-white font-bold">{item.category}</span>
                          {item.note && <span className="text-[10px] text-neutral-500 ml-2 font-sans">{item.note}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <strong className="text-neutral-200 font-bold">{formatMoney(item.amount)}</strong>
                          <Tooltip content="Удалить расход">
                            <button
                              type="button"
                              onClick={() => onDeleteCostItem(order, idx)}
                              className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Быстрое добавление статьи расхода */}
                <form onSubmit={handleQuickAddCost} className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex gap-2">
                    <div className="w-32 shrink-0">
                      <CockpitDropdown
                        variant="input"
                        options={[
                          { value: 'Печать', label: 'Печать' },
                          { value: 'Пластик', label: 'Пластик' },
                          { value: 'Покраска', label: 'Покраска' },
                          { value: 'Моделирование', label: '3D модель' },
                          { value: 'Фурнитура', label: 'Фурнитура' },
                          { value: 'Упаковка', label: 'Упаковка' },
                          { value: 'Доставка', label: 'Доставка' },
                          { value: 'Другое', label: 'Другое' },
                        ]}
                        value={selectedCostCat}
                        onChange={setSelectedCostCat}
                        buttonClassName="!h-8 !py-0.5 !text-[11px]"
                      />
                    </div>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Сумма (₽)..."
                      value={newCostAmount}
                      onChange={e => setNewCostAmount(e.target.value)}
                      className="w-24 h-8 bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-2.5 text-xs text-white focus:outline-none font-mono"
                    />

                    <input
                      type="text"
                      placeholder="Примечание..."
                      value={newCostNote}
                      onChange={e => setNewCostNote(e.target.value)}
                      className="flex-1 h-8 bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-lg px-2.5 text-xs text-white focus:outline-none font-mono"
                    />

                    <CockpitButton type="submit" icon={Plus} size="sm">
                      +
                    </CockpitButton>
                  </div>
                </form>
              </div>
            )}

            {/* РЕЖИМ 8: Дата */}
            {(activeTab === 'date' || activeTab === 'all') && (
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>§ ДАТА ФИКСАЦИИ ЗАПИСИ</span>
                </div>

                <DatePicker
                  value={draftDate}
                  onChange={setDraftDate}
                  format="DD.MM.YYYY"
                />
              </div>
            )}

          </div>

          {/* 3. Нижняя панель действий (Action Dock) */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-neutral-900/90 flex items-center justify-between gap-2 shrink-0">
            <Tooltip content="Удалить запись">
              <button
                type="button"
                onClick={() => onRequestDelete(order)}
                className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/40 border border-white/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Tooltip>

            <div className="flex items-center gap-2">
              <CockpitButton
                type="button"
                onClick={() => onOpenEditModal(order)}
                icon={Edit2}
              >
                Полное окно
              </CockpitButton>

              {hasUnsavedChanges && (
                <CockpitButton
                  type="button"
                  onClick={handleSaveAllChanges}
                  icon={Check}
                  isActive={true}
                  className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold shadow-sm"
                >
                  Сохранить
                </CockpitButton>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Окно подтверждения при выходе с несохраненными данными */}
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
              className="bg-neutral-950 border border-amber-500/40 rounded-2xl shadow-2xl p-5 max-w-md w-full space-y-4 font-mono text-xs"
            >
              <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-300 leading-relaxed font-sans">
                  В боковой панели заказа #{order.order_number || ''} есть несохраненные правки. Что вы хотите сделать?
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1 border-t border-white/10">
                <CockpitButton
                  type="button"
                  onClick={() => {
                    if (isClosingRef.current) return;
                    isClosingRef.current = true;
                    setShowUnsavedWarning(false);
                    handleSaveAllChanges();
                    onClose();
                  }}
                  icon={Check}
                  isActive={true}
                  className="w-full justify-center py-2 text-xs font-bold border-white/20 bg-white text-neutral-950 hover:bg-neutral-200"
                >
                  Сохранить и закрыть
                </CockpitButton>

                <CockpitButton
                  type="button"
                  onClick={handleConfirmDiscardAndClose}
                  icon={RotateCcw}
                  className="w-full justify-center py-2 text-xs text-rose-300 hover:text-white border-rose-500/40 hover:border-rose-500/70 bg-rose-950/60 hover:bg-rose-900/80"
                >
                  Сбросить правки и закрыть
                </CockpitButton>

                <button
                  type="button"
                  onClick={() => setShowUnsavedWarning(false)}
                  className="w-full py-1.5 text-center text-[11px] text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  [ Продолжить редактирование ]
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
