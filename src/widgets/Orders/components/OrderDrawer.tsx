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
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { Select, SelectOption } from '../../../shared/ui/Select';
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
  CheckCircle2, 
  Flame, 
  Tag, 
  Clock, 
  NotebookPen,
  Calendar,
  Layers,
  ShoppingBag,
  List,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Save,
  AlertCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_OPTIONS: SelectOption[] = ALL_STATUSES.map((st) => {
  const cfg = STATUS_CONFIG[st];
  return {
    value: st,
    label: cfg.label,
    icon: cfg.icon,
    iconColor: cfg.color,
    badgeStyle: cfg.badgeStyle,
  };
});

const CLIENT_OPTIONS: SelectOption[] = ALL_CLIENTS.map((cl) => {
  const cfg = CLIENT_CONFIG[cl];
  return {
    value: cl,
    label: cfg.label,
    icon: cfg.icon,
    badgeStyle: cfg.badgeStyle,
  };
});

const CONTACT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'phone', label: 'Телефон', icon: Phone, iconColor: 'text-emerald-400' },
  { value: 'telegram', label: 'Telegram', icon: Send, iconColor: 'text-sky-400' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, iconColor: 'text-green-400' },
  { value: 'avito', label: 'Авито', icon: ShoppingBag, iconColor: 'text-blue-400' },
  { value: 'vk', label: 'ВКонтакте', icon: Share2, iconColor: 'text-indigo-400' },
  { value: 'email', label: 'Email', icon: ExternalLink, iconColor: 'text-purple-400' },
  { value: 'other', label: 'Другое', icon: Layers, iconColor: 'text-gray-400' },
];

export type DrawerTab = 
  | 'all' 
  | 'order_info' 
  | 'type' 
  | 'client' 
  | 'deadline' 
  | 'status' 
  | 'pricing' 
  | 'payments' 
  | 'costs' 
  | 'financials' 
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

  const financials = calculateOrderFinancials(order);
  const deadlineInfo = getDeadlineInfo(order.deadline, order.status);

  const statusCfg = STATUS_CONFIG[order.status || 'Готово'] || STATUS_CONFIG['Готово'];
  const StatusIcon = statusCfg.icon;

  const clientCfg = CLIENT_CONFIG[order.client || 'Авито'] || CLIENT_CONFIG['Авито'];
  const ClientIcon = clientCfg.icon;

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

  const handleConfirmSaveAndClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setShowUnsavedWarning(false);
    handleSaveAllChanges();
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

  // Получить заголовок активного раздела
  const getTabTitle = () => {
    switch (activeTab) {
      case 'order_info': return '📦 Данные заказа (Наименование, Кол-во, Заметки)';
      case 'type': return '🔄 Тип операции (Доход / Расход)';
      case 'client': return '👤 Клиент и контакты';
      case 'deadline': return '⏳ Срок сдачи (Дедлайн)';
      case 'status': return '⚙️ Статус производства';
      case 'pricing': return '💰 Стоимость, наценки и скидки';
      case 'payments': return '💳 Оплата заказа';
      case 'costs': return '🧾 Себестоимость и статьи затрат';
      case 'financials': return '📊 Финансовая сводка и маржинальность';
      case 'date': return '📅 Дата заказа';
      default: return '📑 Вся карточка заказа';
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
        className="absolute inset-0 bg-black/75 backdrop-blur-sm" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%', transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="w-screen max-w-xl bg-[#12141a] border-l border-[#242930] shadow-2xl flex flex-col justify-between"
        >
          {/* 1. Шапка Drawer */}
          <div className="p-4 sm:p-5 border-b border-[#242930] bg-[#16181d] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleCopy(order.id || `#ord-${order.order_number}`)}
                  className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold text-[#FF8800] bg-[#FF6B00]/15 hover:bg-[#FF6B00]/25 border border-[#FF6B00]/30 hover:border-[#FF6B00]/50 shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                  title={`ID: ${order.id} (Кликните, чтобы скопировать)`}
                >
                  <span>#ord-{order.order_number || order.id.slice(0, 4)}</span>
                  {copiedText === (order.id || `#ord-${order.order_number}`) ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                  )}
                </button>
                <span className="text-xs text-gray-400 font-mono">
                  {order.date}
                </span>
                {!isIncome ? (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                    Расход
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                    Доход
                  </span>
                )}

                {hasUnsavedChanges && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-lg animate-pulse">
                    <AlertCircle className="w-3 h-3" /> Есть несохраненные правки
                  </span>
                )}

                {showSavedNotification && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/40"
                  >
                    <Check className="w-3 h-3" /> Сохранено
                  </motion.span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onDuplicateOrder(order)}
                  className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-[#242930] transition-colors cursor-pointer border border-[#242930]"
                  title="Дублировать запись"
                >
                  <Copy className="w-4 h-4 text-blue-400" />
                </button>

                <button
                  type="button"
                  onClick={() => onRequestDelete(order)}
                  className="p-2 rounded-xl text-gray-300 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer border border-[#242930]"
                  title="Удалить запись"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#242930] transition-colors cursor-pointer ml-1"
                  title="Закрыть панель"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#FF8800] uppercase tracking-wider block mb-0.5">
                {getTabTitle()}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="truncate">{draftTitle || (isIncome ? 'Заказ на печать' : 'Операционный расход')}</span>
                {isIncome && (
                  <span className="text-xs text-gray-400 font-normal font-mono bg-[#0d0e12] px-2 py-0.5 rounded border border-[#242930] shrink-0">
                    ×{draftQuantity || 1} шт
                  </span>
                )}
              </h2>
            </div>

            {/* Навигационная лента вкладок/ячеек */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#242930]/80 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                    : 'bg-[#0d0e12] text-gray-400 border border-[#242930] hover:text-white hover:border-gray-600'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Все</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('order_info')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'order_info'
                    ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                    : 'bg-[#0d0e12] text-gray-300 border border-[#242930] hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#FF8800]" />
                <span>Заказ</span>
              </button>

              {isIncome && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('client')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'client'
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'bg-[#0d0e12] text-sky-400 border border-[#242930] hover:text-sky-300'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Клиент</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('deadline')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'deadline'
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'bg-[#0d0e12] text-amber-400 border border-[#242930] hover:text-amber-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Срок</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('status')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'status'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-[#0d0e12] text-blue-400 border border-[#242930] hover:text-blue-300'
                    }`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>Статус</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('pricing')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'pricing'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-[#0d0e12] text-emerald-400 border border-[#242930] hover:text-emerald-300'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Сумма</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'payments'
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'bg-[#0d0e12] text-amber-400/90 border border-[#242930] hover:text-amber-300'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Оплата</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('costs')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'costs'
                        ? 'bg-[#FF6B00] text-white shadow-md'
                        : 'bg-[#0d0e12] text-[#FF8800] border border-[#242930] hover:text-white'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Себестоимость</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('date')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'date'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-[#0d0e12] text-purple-400 border border-[#242930] hover:text-purple-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Дата</span>
              </button>
            </div>
          </div>

          {/* 2. Контент Drawer со скроллом */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-xs sm:text-sm select-text">
            {/* РЕЖИМ 1: Редактирование Наименования, Тиража и Заметок */}
            {(activeTab === 'order_info' || activeTab === 'all') && (
              <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-[#242930] pb-2">
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-[#FF8800]" />
                    Наименование и параметры заказа
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1">
                      Наименование изделия / услуги:
                    </label>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="Название заказа..."
                      className="w-full bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none"
                    />
                  </div>

                  {isIncome && (
                    <div>
                      <label className="text-xs text-gray-400 font-semibold block mb-1">
                        Количество (тираж в шт):
                      </label>
                      <NumberCounter
                        value={draftQuantity}
                        onChange={(newQ) => setDraftQuantity(newQ)}
                        min={1}
                        max={9999}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1">
                      Техтребования, примечания и заметки:
                    </label>
                    <textarea
                      rows={3}
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Цвет, высота слоя, адрес доставки или трек-номер..."
                      className="w-full bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* РЕЖИМ 2: Клиент, Канал продаж и Контакты */}
            {isIncome && (activeTab === 'client' || activeTab === 'all') && (
              <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-[#242930] pb-2">
                  <span className="flex items-center gap-1.5">
                    <ClientIcon className="w-4 h-4 text-sky-400" />
                    Клиент и контакты
                  </span>
                  <Select
                    variant="compact"
                    size="xs"
                    dropdownWidth={170}
                    options={CLIENT_OPTIONS}
                    value={draftClient}
                    onChange={setDraftClient}
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1.5">
                      Канал продаж (Источник):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_CLIENTS.map((cl) => {
                        const isSel = draftClient === cl;
                        const cfg = CLIENT_CONFIG[cl];
                        const Icon = cfg.icon;

                        return (
                          <button
                            key={cl}
                            type="button"
                            onClick={() => setDraftClient(cl)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSel
                                ? `${cfg.badgeStyle} border font-bold shadow-md`
                                : 'bg-[#0d0e12] text-gray-400 border border-[#242930] hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Список контактов */}
                  <div className="space-y-2 pt-2 border-t border-[#242930]/80">
                    <label className="text-xs text-gray-400 font-semibold block">
                      Контакты клиента ({contactsList.length}):
                    </label>
                    {contactsList.length === 0 ? (
                      <p className="text-xs text-gray-500 bg-[#0d0e12] p-3 rounded-xl border border-[#242930]">Контакты не добавлены</p>
                    ) : (
                      contactsList.map((c, idx) => {
                        const cfg = CONTACT_TYPES_CONFIG[c.type] || CONTACT_TYPES_CONFIG.other;
                        const Icon = cfg.icon;
                        const href = getContactHref(c.type, c.value);

                        return (
                          <div key={idx} className="flex items-center justify-between bg-[#0d0e12] p-2.5 rounded-xl border border-[#242930] text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-1.5 rounded-lg ${cfg.badgeStyle}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] text-gray-400 block">{cfg.label}</span>
                                <span className="text-white font-mono font-semibold truncate block">{c.value}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {href !== '#' && (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-[#16181d] hover:bg-[#242930] text-sky-400 transition-colors"
                                  title="Перейти / Написать"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopy(c.value)}
                                className="p-1.5 rounded-lg bg-[#16181d] hover:bg-[#242930] text-gray-300 hover:text-white transition-colors"
                                title="Скопировать"
                              >
                                {copiedText === c.value ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteContact(order, idx)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 transition-colors"
                                title="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Добавить новый контакт */}
                  <form onSubmit={handleQuickAddContact} className="flex items-center gap-2 pt-1 border-t border-[#242930]/80">
                    <Select
                      variant="compact"
                      size="sm"
                      dropdownWidth={150}
                      options={CONTACT_TYPE_OPTIONS}
                      value={newContactType}
                      onChange={(val) => setNewContactType(val as ContactType)}
                    />

                    <input
                      type="text"
                      placeholder="Номер, ник @username или ссылка..."
                      value={newContactVal}
                      onChange={(e) => setNewContactVal(e.target.value)}
                      className="flex-1 bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />

                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-xl bg-[#1a1d24] hover:bg-[#FF6B00] border border-[#242930] text-gray-200 hover:text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* РЕЖИМ 3: Дедлайн (Срок сдачи) */}
            {isIncome && (activeTab === 'deadline' || activeTab === 'all') && (
              <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-[#242930] pb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Срок сдачи (Дедлайн)
                  </span>
                  {deadlineInfo && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${deadlineInfo.badgeStyle}`}>
                      {deadlineInfo.label}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1.5">
                      Дата сдачи заказа:
                    </label>
                    <DatePicker
                      value={draftDeadline}
                      onChange={(val) => setDraftDeadline(val)}
                      format="DD.MM.YYYY"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1.5">
                      Быстрые сроки:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyDeadlinePreset(1)}
                        className="px-3 py-1.5 rounded-xl bg-[#0d0e12] border border-[#242930] hover:border-amber-500/40 text-gray-300 hover:text-white text-xs font-medium cursor-pointer"
                      >
                        Завтра (+1 день)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyDeadlinePreset(2)}
                        className="px-3 py-1.5 rounded-xl bg-[#0d0e12] border border-[#242930] hover:border-amber-500/40 text-gray-300 hover:text-white text-xs font-medium cursor-pointer"
                      >
                        +2 дня
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyDeadlinePreset(3)}
                        className="px-3 py-1.5 rounded-xl bg-[#0d0e12] border border-[#242930] hover:border-amber-500/40 text-gray-300 hover:text-white text-xs font-medium cursor-pointer"
                      >
                        +3 дня
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyDeadlinePreset(7)}
                        className="px-3 py-1.5 rounded-xl bg-[#0d0e12] border border-[#242930] hover:border-amber-500/40 text-gray-300 hover:text-white text-xs font-medium cursor-pointer"
                      >
                        +1 неделя
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftDeadline('')}
                        className="px-3 py-1.5 rounded-xl bg-[#0d0e12] border border-rose-500/30 text-rose-400 hover:bg-rose-950/30 text-xs font-medium cursor-pointer"
                      >
                        Без дедлайна
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* РЕЖИМ 4: Статус заказа */}
            {isIncome && (activeTab === 'status' || activeTab === 'all') && (
              <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-[#242930] pb-2">
                  <span className="flex items-center gap-1.5">
                    <StatusIcon className="w-4 h-4 text-blue-400" />
                    Статус производства
                  </span>
                  <Select
                    variant="badge"
                    size="xs"
                    dropdownWidth={175}
                    options={STATUS_OPTIONS}
                    value={order.status || 'Готово'}
                    onChange={(newSt) => onUpdateStatus(order, newSt as OrderStatus)}
                    showChevron={true}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_STATUSES.map((st) => {
                    const cfg = STATUS_CONFIG[st];
                    const Icon = cfg.icon;
                    const isSelected = order.status === st;

                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onUpdateStatus(order, st)}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? `${cfg.badgeStyle} ring-2 ring-[#FF6B00] font-bold shadow-lg`
                            : 'bg-[#0d0e12] border-[#242930] text-gray-300 hover:text-white hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                          <span>{st}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#FF8800]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* РЕЖИМ 5: Стоимость, срочность и скидки */}
            {isIncome && (activeTab === 'pricing' || activeTab === 'all') && (
              <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-[#242930] pb-2">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Стоимость, наценки и скидки
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1">
                      Базовая стоимость печати (₽):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={draftBaseAmount || ''}
                      onChange={(e) => setDraftBaseAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Срочность */}
                    <div className="p-3 bg-[#0d0e12] border border-[#242930] rounded-xl space-y-2">
                      <span className="font-semibold text-gray-300 flex items-center gap-1 text-xs">
                        <Flame size={12} className="text-orange-400" /> Наценка за срочность:
                      </span>
                      <div className="flex items-center gap-1">
                        {[0, 25, 50, 100].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setDraftUrgencyType('percent');
                              setDraftUrgencyVal(pct);
                            }}
                            className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              draftUrgencyType === 'percent' && draftUrgencyVal === pct
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-[#16181d] text-gray-400 border border-[#242930] hover:text-white'
                            }`}
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Скидка */}
                    <div className="p-3 bg-[#0d0e12] border border-[#242930] rounded-xl space-y-2">
                      <span className="font-semibold text-gray-300 flex items-center gap-1 text-xs">
                        <Tag size={12} className="text-emerald-400" /> Скидка клиенту:
                      </span>
                      <div className="flex items-center gap-1">
                        {[0, 5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setDraftDiscountType('percent');
                              setDraftDiscountVal(pct);
                            }}
                            className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              draftDiscountType === 'percent' && draftDiscountVal === pct
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-[#16181d] text-gray-400 border border-[#242930] hover:text-white'
                            }`}
                          >
                            -{pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0d0e12] border border-[#FF6B00]/30 rounded-xl flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400">Итоговая сумма для клиента:</span>
                    <strong className="text-base font-bold text-[#FF8800]">
                      {formatMoney(
                        draftBaseAmount * 
                        (1 + (draftUrgencyType === 'percent' ? draftUrgencyVal / 100 : 0)) * 
                        (1 - (draftDiscountType === 'percent' ? draftDiscountVal / 100 : 0))
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* РЕЖИМ 6: Оплаты и транзакции */}
            {isIncome && (activeTab === 'payments' || activeTab === 'all') && (
              <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-[#242930] pb-2">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    Оплата заказа
                  </span>
                  <span className={`font-mono text-xs font-bold ${isFullyPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isFullyPaid ? '✓ Оплачен полностью' : `Остаток: ${formatMoney(remainingDebt)}`}
                  </span>
                </div>

                {/* Прогресс-бар оплаты */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Внесено: <strong className="text-white font-mono">{formatMoney(totalPaid)}</strong> из {formatMoney(totalAmount)}</span>
                    <span>{paymentProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#0d0e12] rounded-full overflow-hidden border border-[#242930]">
                    <div 
                      className={`h-full transition-all duration-300 ${isFullyPaid ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#FF6B00] to-amber-500'}`}
                      style={{ width: `${paymentProgressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Быстрая кнопка 100% оплата */}
                {!isFullyPaid && (
                  <button
                    type="button"
                    onClick={handleQuickPayFull}
                    className="w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Отметить как полностью оплаченный (+{formatMoney(remainingDebt)})
                  </button>
                )}

                {/* Список транзакций */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs text-gray-400 font-semibold block">История платежей ({paymentsList.length}):</span>
                  {paymentsList.map((pVal, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#0d0e12] px-3 py-2 rounded-xl border border-[#242930] text-xs font-mono">
                      <span className="text-gray-400">Платеж #{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <strong className="text-emerald-400 text-sm">+{formatMoney(pVal)}</strong>
                        {paymentsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeletePayment(order, idx)}
                            className="text-gray-500 hover:text-rose-400 transition-colors p-1"
                            title="Удалить этот платеж"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Быстрое добавление нового платежа */}
                {!isFullyPaid && (
                  <form onSubmit={handleQuickAddPayment} className="flex items-center gap-2 pt-1 border-t border-[#242930]/80">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder={`Сумма доплаты (напр. ${remainingDebt})...`}
                      value={newPaymentVal}
                      onChange={(e) => setNewPaymentVal(e.target.value)}
                      className="flex-1 bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none font-mono"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Внести оплату
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* РЕЖИМ 7: Себестоимость и статьи затрат */}
            {isIncome && (activeTab === 'costs' || activeTab === 'all') && (
              <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-[#242930] pb-2">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[#FF8800]" />
                    Пункты себестоимости ({costItemsList.length})
                  </span>
                  <span className="font-mono text-xs text-[#FF8800] font-bold">
                    Итого: {formatMoney(costVal)}
                  </span>
                </div>

                {/* Список пунктов расхода */}
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {costItemsList.map((item, idx) => {
                    const cfg = getCategoryConfig(item.category);
                    const IconComp = cfg.icon;

                    return (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between bg-[#0d0e12] border border-[#242930] p-2.5 rounded-xl gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`p-1.5 rounded-lg ${cfg.badgeStyle} shrink-0`}>
                            <IconComp className={`w-3.5 h-3.5 ${cfg.color}`} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-white font-bold truncate block">{item.category}</span>
                            {item.note && <span className="text-[11px] text-gray-400 truncate block">{item.note}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-[#16181d] border border-[#242930] rounded-lg px-2 py-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.amount !== undefined ? item.amount : ''}
                              onChange={(e) => onUpdateCostItem(order, idx, 'amount', Number(e.target.value))}
                              className="w-16 bg-transparent text-right text-xs text-white font-mono font-bold focus:outline-none"
                            />
                            <span className="text-gray-500 font-mono text-[10px]">₽</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onDeleteCostItem(order, idx)}
                            className="text-gray-500 hover:text-rose-400 p-1 rounded transition-colors"
                            title="Удалить пункт"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Быстрое добавление пункта расхода */}
                <form onSubmit={handleQuickAddCost} className="space-y-2 pt-1 border-t border-[#242930]/80">
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_COST_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCostCat(cat.name)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          selectedCostCat === cat.name
                            ? 'bg-[#FF6B00]/20 text-[#FF8800] border border-[#FF6B00]/50 font-bold'
                            : 'bg-[#0d0e12] text-gray-400 border border-[#242930] hover:text-white'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedCostCat('custom')}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedCostCat === 'custom'
                          ? 'bg-[#FF6B00]/20 text-[#FF8800] border border-[#FF6B00]/50 font-bold'
                          : 'bg-[#0d0e12] text-gray-400 border border-[#242930] hover:text-white'
                      }`}
                    >
                      + Свой пункт
                    </button>
                  </div>

                  {selectedCostCat === 'custom' && (
                    <input
                      type="text"
                      placeholder="Название расхода (напр. Упаковка, Смола)..."
                      value={customCostCatName}
                      onChange={(e) => setCustomCostCatName(e.target.value)}
                      className="w-full bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Сумма ₽..."
                      value={newCostAmount}
                      onChange={(e) => setNewCostAmount(e.target.value)}
                      className="w-28 bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Примечание (опционально)..."
                      value={newCostNote}
                      onChange={(e) => setNewCostNote(e.target.value)}
                      className="flex-1 bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-[#1a1d24] hover:bg-[#FF6B00] border border-[#242930] hover:border-[#FF6B00] text-gray-200 hover:text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* РЕЖИМ 8: Дата заказа */}
            {(activeTab === 'date' || activeTab === 'all') && (
              <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-[#242930] pb-2">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    Дата оформления заказа
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1.5">
                      Дата заказа:
                    </label>
                    <DatePicker
                      value={draftDate}
                      onChange={(val) => setDraftDate(val)}
                      format="DD.MM.YYYY"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const formatted = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
                        setDraftDate(formatted);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#0d0e12] border border-[#242930] hover:border-purple-500/40 text-gray-300 hover:text-white text-xs font-medium cursor-pointer"
                    >
                      Сегодня
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const yest = new Date();
                        yest.setDate(yest.getDate() - 1);
                        const formatted = `${String(yest.getDate()).padStart(2, '0')}.${String(yest.getMonth() + 1).padStart(2, '0')}.${yest.getFullYear()}`;
                        setDraftDate(formatted);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#0d0e12] border border-[#242930] hover:border-purple-500/40 text-gray-300 hover:text-white text-xs font-medium cursor-pointer"
                    >
                      Вчера
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* РЕЖИМ 9: Финансовая аналитика и маржа */}
            {(activeTab === 'financials' || activeTab === 'all') && (
              <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-[#242930] pb-2">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Финансовая сводка и маржинальность
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-[#0d0e12] p-2.5 rounded-xl border border-[#242930]">
                    <span className="text-[11px] text-gray-400 block mb-0.5">Сумма заказа</span>
                    <span className="text-base font-bold font-mono text-white">{formatMoney(totalAmount)}</span>
                  </div>

                  <div className="bg-[#0d0e12] p-2.5 rounded-xl border border-[#242930]">
                    <span className="text-[11px] text-gray-400 block mb-0.5">Себестоимость</span>
                    <span className="text-base font-bold font-mono text-gray-300">{formatMoney(costVal)}</span>
                  </div>

                  <div className="bg-[#0d0e12] p-2.5 rounded-xl border border-[#242930]">
                    <span className="text-[11px] text-gray-400 block mb-0.5">Чистая прибыль</span>
                    <span className={`text-base font-bold font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {netProfit >= 0 ? `+${formatMoney(netProfit)}` : formatMoney(netProfit)}
                    </span>
                  </div>

                  <div className="bg-[#0d0e12] p-2.5 rounded-xl border border-[#242930]">
                    <span className="text-[11px] text-gray-400 block mb-0.5">Маржа</span>
                    <span className="text-base font-bold font-mono text-[#FF8800]">
                      {isIncome && totalAmount > 0 ? `${marginPercent.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Подвал Drawer: кнопка Закрыть и кнопка Сохранить изменения */}
          <div className="p-4 border-t border-[#242930] bg-[#16181d] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-300 hover:text-white bg-[#1a1d24] hover:bg-[#242930] border border-[#242930] transition-colors cursor-pointer"
            >
              Закрыть
            </button>

            <button
              type="button"
              onClick={handleSaveAllChanges}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all cursor-pointer flex items-center gap-2 shadow-lg ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-900/40 ring-2 ring-emerald-400/50 scale-102'
                  : 'bg-gradient-to-r from-[#FF5500] to-[#FF8800] hover:from-[#FF6600] hover:to-[#FF9900] shadow-[#FF6B00]/25'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{hasUnsavedChanges ? 'Сохранить изменения' : 'Сохранено'}</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Модалка подтверждения при выходе с несохраненными изменениями */}
      <AnimatePresence>
        {showUnsavedWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10, transition: { duration: 0.15 } }}
              className="bg-[#16181d] border border-amber-500/40 rounded-2xl shadow-2xl p-5 max-w-md w-full space-y-4"
            >
              <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  В карточке заказа <strong className="text-white">#{order.order_number || ''} «{order.title}»</strong> есть измененные данные, которые не были сохранены. Что вы хотите сделать?
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1 border-t border-[#242930]">
                <button
                  type="button"
                  onClick={handleConfirmSaveAndClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить и закрыть</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDiscardAndClose}
                  className="w-full py-2 px-4 rounded-xl bg-[#1a1d24] hover:bg-rose-950/40 border border-[#242930] hover:border-rose-500/40 text-gray-300 hover:text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Сбросить изменения и закрыть</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUnsavedWarning(false)}
                  className="w-full py-2 px-4 rounded-xl text-gray-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Продолжить редактирование
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
