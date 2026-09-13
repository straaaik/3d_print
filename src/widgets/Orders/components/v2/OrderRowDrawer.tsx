'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Order,
  OrderStatus,
  ALL_STATUSES,
  STATUS_CONFIG,
  CLIENT_CONFIG,
  ORDER_CHANNELS,
  ContactItem,
  ContactType,
  PaymentItem
} from '../../types';
import { formatMoney, getDeadlineInfo, roundTo2 } from '../../helpers';
import { TableDeadlinePicker } from './TableDeadlinePicker';
import { getContactHref } from './OrderContactsModal';
import { formatOrderNumber } from './types';
import {
  Check,
  CheckCircle2,
  Tag,
  ChevronDown,
  ExternalLink,
  X,
  MoreHorizontal,
  Package,
  Wrench,
  Droplet,
  Sparkles,
  Printer,
  Box,
  Truck,
  Building,
  Zap,
  TrendingUp,
  Layers,
  Code,
  Hammer,
  Receipt,
  BookOpen,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const EXPENSE_CATEGORIES_CONFIG: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { label: 'Пластик и филамент', icon: Package },
  { label: 'Комплектующие и сопла', icon: Wrench },
  { label: 'Фотополимерная смола', icon: Droplet },
  { label: 'Химия и изопропанол', icon: Sparkles },
  { label: 'Оборудование и 3D-принтеры', icon: Printer },
  { label: 'Упаковка и коробки', icon: Box },
  { label: 'Доставка и логистика', icon: Truck },
  { label: 'Аренда мастерской', icon: Building },
  { label: 'Электроэнергия и ЖКХ', icon: Zap },
  { label: 'Реклама и продвижение', icon: TrendingUp },
  { label: 'Фурнитура и крепеж', icon: Layers },
  { label: '3D-модели и ПО', icon: Code },
  { label: 'Обслуживание и ремонт', icon: Hammer },
  { label: 'Налоги и эквайринг', icon: Receipt },
  { label: 'Обучение и курсы', icon: BookOpen },
  { label: 'Прочие расходы', icon: MoreHorizontal },
];



interface OrderRowDrawerProps {
  order: Order;
  onInlineUpdate: (orderId: string, updates: Partial<Order>) => void;
  onOpenEditModal?: (order: Order) => void;
  onOpenPaymentModal?: (order: Order) => void;
  onClose?: () => void;
  onOpenContactsModal?: (order: Order) => void;
}

/**
 * Фирменное рукописное подчёркивание с плавной анимацией PathLength из Motion
 */
function HandDrawnUnderline({
  isSelected,
  color = 'currentColor',
}: {
  isSelected: boolean;
  color?: string;
}) {
  return (
    <AnimatePresence>
      {isSelected && (
        <motion.svg
          className="absolute -bottom-1 left-0 w-full h-[5px] pointer-events-none overflow-visible z-10"
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.path
            d="M 1,4 C 25,6.5 75,2.5 99,5"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              visible: {
                pathLength: 1,
                opacity: 1,
                transition: {
                  pathLength: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
                  opacity: { duration: 0.08 },
                },
              },
              exit: {
                pathLength: 0,
                opacity: 0,
                transition: {
                  pathLength: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 0.08 },
                },
              },
            }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}

/**
 * Рукописное зачеркивание с плавной анимацией PathLength из Motion
 */
function HandDrawnStrikethrough({ isCrossedOut }: { isCrossedOut: boolean }) {
  return (
    <AnimatePresence>
      {isCrossedOut && (
        <motion.svg
          className="absolute top-1/2 -left-1 w-[calc(100%+8px)] h-[8px] -translate-y-1/2 pointer-events-none overflow-visible z-10"
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.path
            d="M 1,4.5 C 18,3 42,5.8 68,3.8 C 82,2.5 94,4.8 99,4"
            fill="none"
            stroke="#71717a"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              visible: {
                pathLength: 1,
                opacity: 0.9,
                transition: {
                  pathLength: { duration: 0.22, ease: [0.25, 1, 0.5, 1] },
                  opacity: { duration: 0.08 },
                },
              },
              exit: {
                pathLength: 0,
                opacity: 0,
                transition: {
                  pathLength: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 0.08 },
                },
              },
            }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}

const DEFAULT_CONTACT_OPTIONS: { type: ContactType; label: string; placeholder: string; isCustom?: boolean }[] = [
  { type: 'phone', label: 'Телефон', placeholder: '+7 999 000-00-00' },
  { type: 'telegram', label: 'Telegram', placeholder: '@username или https://t.me/...' },
  { type: 'whatsapp', label: 'WhatsApp', placeholder: '+7 999 000-00-00' },
  { type: 'vk', label: 'VK', placeholder: 'vk.com/id...' },
  { type: 'email', label: 'Email', placeholder: 'client@example.com' },
  { type: 'other', label: 'Адрес / СДЭК', placeholder: 'г. Москва, ПВЗ СДЭК...' },
];

interface StatusDropdownPortalProps {
  currentStatus: OrderStatus;
  targetRect: DOMRect | null;
  triggerRef?: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onSelect: (st: OrderStatus) => void;
  onClose: () => void;
}

function StatusDropdownPortal({
  currentStatus,
  targetRect,
  triggerRef,
  isOpen,
  onSelect,
  onClose,
}: StatusDropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      if (triggerRef?.current && triggerRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
      onClose();
    };

    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !targetRect || typeof window === 'undefined') return null;

  const width = Math.max(168, targetRect.width);
  const height = 300;
  const spaceBelow = window.innerHeight - targetRect.bottom;
  const isTop = spaceBelow < height && targetRect.top > spaceBelow;
  const top = isTop ? targetRect.top - height - 6 : targetRect.bottom + 6;
  let left = targetRect.left;
  if (left + width > window.innerWidth - 16) {
    left = window.innerWidth - width - 16;
  }
  if (left < 16) left = 16;

  return createPortal(
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, scale: 0.98, y: isTop ? 3 : -3 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: isTop ? 3 : -3 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'fixed',
        top: Math.max(12, top),
        left,
        width,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
      className="rounded-xl bg-neutral-950 border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden flex flex-col font-mono select-none"
    >
      <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto scrollbar-none">
        {ALL_STATUSES.map((st) => {
          const cfg = STATUS_CONFIG[st];
          const Icon = cfg?.icon || CheckCircle2;
          const isSelected = currentStatus === st;
          return (
            <button
              key={st}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(st);
                onClose();
              }}
              className={`relative w-full px-3 py-1.5 text-left flex items-center justify-between gap-2 cursor-pointer text-xs group ${
                isSelected
                  ? 'bg-white/10 text-white font-semibold'
                  : 'bg-transparent hover:bg-white/5 text-neutral-300 hover:text-white'
              }`}
            >
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white" />
              )}

              <div className="flex items-center gap-2 min-w-0 flex-1 pl-0.5">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${
                  isSelected ? 'text-white' : 'text-neutral-400 group-hover:text-white'
                }`} />
                <span className="truncate text-xs font-mono">
                  {st}
                </span>
              </div>

              {isSelected && (
                <Check className="w-3.5 h-3.5 text-white/80 shrink-0 ml-1.5" />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-3 py-1 bg-neutral-950 border-t border-white/5 text-[9px] font-mono text-neutral-500 uppercase tracking-wider flex items-center justify-between shrink-0">
        <span>{ALL_STATUSES.length} ОПЦИЙ</span>
        <span className="text-neutral-600">3DLABS</span>
      </div>
    </motion.div>,
    document.body
  );
}

function extractContactsFromOrder(order: Order): ContactItem[] {
  if (order.contacts && order.contacts.length > 0) {
    return order.contacts.filter(c => c && typeof c.value === 'string');
  }
  if (order.contact && order.contact.trim().length > 0) {
    const trimmed = order.contact.trim();
    const isTg = trimmed.startsWith('@') || trimmed.includes('t.me');
    return [{ type: isTg ? 'telegram' : 'phone', value: trimmed }];
  }
  return [];
}

function getTodayFormatted(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}.${month}.${year}`;
}

export function normalizeOrderPaymentItems(order: Order): PaymentItem[] {
  const todayStr = getTodayFormatted();

  if (order.payments && order.payments.length > 0) {
    return order.payments.map((p, idx) => {
      if (typeof p === 'number') {
        return {
          id: `pay-${order.id}-${idx}`,
          amount: p,
          date: order.date || todayStr,
          note: idx === 0 ? 'Оплата' : `Платёж #${idx + 1}`,
        };
      }
      return {
        id: p.id || `pay-${order.id}-${idx}`,
        amount: Number(p.amount) || 0,
        date: p.date || order.date || todayStr,
        note: p.note || '',
      };
    });
  }

  if ((order.payment || 0) > 0) {
    return [{
      id: `pay-${order.id}-0`,
      amount: order.payment || 0,
      date: order.date || todayStr,
      note: 'Оплата заказа',
    }];
  }

  return [];
}

export function getPaymentCleanupUpdate(
  paymentItems: readonly PaymentItem[],
): Pick<Order, 'payment' | 'payments'> | null {
  if (!paymentItems.some((item) => (Number(item.amount) || 0) <= 0)) {
    return null;
  }

  const payments = paymentItems.filter((item) => (Number(item.amount) || 0) > 0);
  const payment = roundTo2(
    payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
  );

  return { payment, payments };
}

function createPaymentItemId(orderId: string, paymentItems: readonly PaymentItem[]): string {
  const existingIds = new Set(paymentItems.map((item) => item.id));
  let sequence = paymentItems.length;
  let candidate = `pay-${orderId}-${sequence}`;

  while (existingIds.has(candidate)) {
    sequence += 1;
    candidate = `pay-${orderId}-${sequence}`;
  }

  return candidate;
}

export function OrderRowDrawer(props: OrderRowDrawerProps) {
  const editorKey = `${props.order.id}:${props.order.type}`;
  return <OrderRowDrawerEditor key={editorKey} {...props} />;
}

function OrderRowDrawerEditor({
  order,
  onInlineUpdate,
}: OrderRowDrawerProps) {
  const isExpense = order.type === 'expense';
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>(() => {
    if (typeof window === 'undefined' || !isExpense) return [];
    try {
      const saved = localStorage.getItem('3d_custom_expense_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const isValidExpenseCategory = (cat?: string) =>
    EXPENSE_CATEGORIES_CONFIG.some((c) => c.label === cat) ||
    customExpenseCategories.includes(cat || '');

  const initialClient = isExpense
    ? (isValidExpenseCategory(order.client) ? (order.client as string) : 'Пластик и филамент')
    : (order.client || 'Авито');

  const [title, setTitle] = useState(order.title || '');
  const [quantity, setQuantity] = useState(String(order.quantity || 1));
  const [status, setStatus] = useState<OrderStatus>(order.status || 'Не в работе');
  const [date, setDate] = useState(order.date || '');
  const [deadline, setDeadline] = useState(order.deadline || '');
  const [client, setClient] = useState(initialClient);
  const [clientName, setClientName] = useState(order.client_name || '');
  const [amount, setAmount] = useState(String(order.amount || 0));
  const [cost, setCost] = useState(String(order.cost || 0));
  const [payment, setPayment] = useState(String(order.payment || 0));
  const [notes, setNotes] = useState(order.notes || '');
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>(() => normalizeOrderPaymentItems(order));
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Контакты в стиле скриншота (рукописное зачеркивание / подчеркивание)
  const [contacts, setContacts] = useState<ContactItem[]>(() => extractContactsFromOrder(order));
  const [customContactOptions, setCustomContactOptions] = useState<{ type: ContactType; label: string; placeholder: string; isCustom?: boolean }[]>([]);
  const [isAddingCustomContact, setIsAddingCustomContact] = useState(false);
  const [customContactLabelInput, setCustomContactLabelInput] = useState('');
  // Кастомный выпадающий список статуса через Portal
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusTargetRect, setStatusTargetRect] = useState<DOMRect | null>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const deadlineButtonRef = useRef<HTMLButtonElement>(null);

  // Календари для даты, дедлайна и платежей
  const [activeDatePicker, setActiveDatePicker] = useState<{
    field: 'date' | 'deadline';
    targetRect: DOMRect;
    value: string;
  } | null>(null);

  const [paymentDatePicker, setPaymentDatePicker] = useState<{
    index: number;
    targetRect: DOMRect;
    value: string;
  } | null>(null);

  const cleanupSnapshotRef = useRef({ paymentItems, orderId: order.id, onInlineUpdate });

  useEffect(() => {
    cleanupSnapshotRef.current = { paymentItems, orderId: order.id, onInlineUpdate };
  }, [paymentItems, order.id, onInlineUpdate]);

  useEffect(() => {
    return () => {
      // При закрытии этого окна автоматически удаляем все платежи, где 0 рублей
      const snapshot = cleanupSnapshotRef.current;
      const update = getPaymentCleanupUpdate(snapshot.paymentItems);
      if (update) {
        snapshot.onInlineUpdate(snapshot.orderId, update);
      }
    };
  }, []);

  const [expenseCatSearch, setExpenseCatSearch] = useState('');

  const allExpenseCategories = useMemo(() => {
    const builtIn = EXPENSE_CATEGORIES_CONFIG.map((c) => ({ label: c.label, isCustom: false }));
    const customList = [...customExpenseCategories];
    if (
      order.client &&
      !builtIn.some((b) => b.label === order.client) &&
      !customList.includes(order.client)
    ) {
      customList.push(order.client);
    }
    const custom = customList.map((label) => ({
      label,
      isCustom: true,
    }));
    return [...builtIn, ...custom];
  }, [customExpenseCategories, order.client]);

  const displayedExpenseCategories = useMemo(() => {
    if (!expenseCatSearch.trim()) return allExpenseCategories;
    const q = expenseCatSearch.toLowerCase().trim();
    return allExpenseCategories.filter((c) => c.label.toLowerCase().includes(q));
  }, [allExpenseCategories, expenseCatSearch]);

  const handleSelectExpenseCategory = (cat: string) => {
    setClient(cat);
    onInlineUpdate(order.id, { client: cat });
    showSavedBadge();
  };

  const handleCreateCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      setIsAddingCustomCategory(false);
      setNewCategoryInput('');
      return;
    }
    const exists = allExpenseCategories.some(
      (c) => c.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      const updated = [...customExpenseCategories, trimmed];
      setCustomExpenseCategories(updated);
      try {
        localStorage.setItem('3d_custom_expense_categories', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save custom expense category', e);
      }
    }
    handleSelectExpenseCategory(trimmed);
    setNewCategoryInput('');
    setIsAddingCustomCategory(false);
  };

  const handleDeleteCustomCategory = (catLabel: string) => {
    const updated = customExpenseCategories.filter((c) => c !== catLabel);
    setCustomExpenseCategories(updated);
    try {
      localStorage.setItem('3d_custom_expense_categories', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update custom expense categories', e);
    }
    if (client === catLabel) {
      handleSelectExpenseCategory('Пластик и филамент');
    }
  };

  const showSavedBadge = () => {
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 1400);
  };

  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (trimmed !== (order.title || '')) {
      onInlineUpdate(order.id, { title: trimmed });
      showSavedBadge();
    }
  };

  const handleQuantityBlur = () => {
    const q = Math.max(1, parseInt(quantity.replace(/[^\d]/g, ''), 10) || 1);
    setQuantity(String(q));
    if (q !== (order.quantity || 1)) {
      onInlineUpdate(order.id, { quantity: q });
      showSavedBadge();
    }
  };

  const handleIncrementQuantity = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = parseInt(quantity.replace(/[^\d]/g, ''), 10) || 1;
    const next = current + 1;
    setQuantity(String(next));
    onInlineUpdate(order.id, { quantity: next });
    showSavedBadge();
  };

  const handleDecrementQuantity = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = parseInt(quantity.replace(/[^\d]/g, ''), 10) || 1;
    const next = Math.max(1, current - 1);
    if (next !== current) {
      setQuantity(String(next));
      onInlineUpdate(order.id, { quantity: next });
      showSavedBadge();
    }
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    setStatus(newStatus);
    if (newStatus !== order.status) {
      onInlineUpdate(order.id, { status: newStatus });
      showSavedBadge();
    }
  };

  const handleOpenDatePicker = (field: 'date' | 'deadline', e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (activeDatePicker && activeDatePicker.field === field) {
      setActiveDatePicker(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveDatePicker({
      field,
      targetRect: rect,
      value: field === 'date' ? date : deadline,
    });
  };

  const handleDatePickerChange = (newVal: string) => {
    if (!activeDatePicker) return;
    if (activeDatePicker.field === 'date') {
      setDate(newVal);
      onInlineUpdate(order.id, { date: newVal });
    } else {
      setDeadline(newVal);
      onInlineUpdate(order.id, { deadline: newVal });
    }
    showSavedBadge();
  };

  const handleClientChange = (newClient: string) => {
    setClient(newClient);
    if (newClient !== order.client) {
      onInlineUpdate(order.id, { client: newClient });
      showSavedBadge();
    }
  };

  const handleClientBlur = () => {
    const trimmed = clientName.trim();
    if (trimmed !== (order.client_name || '')) {
      onInlineUpdate(order.id, { client_name: trimmed });
      showSavedBadge();
    }
  };

  const allDirectContactOptions = useMemo(() => {
    const fromOrder = (contacts || [])
      .filter(c => c.label && !DEFAULT_CONTACT_OPTIONS.some(d => d.label.toLowerCase() === c.label?.toLowerCase()))
      .map(c => ({
        type: (c.type || 'other') as ContactType,
        label: c.label!,
        placeholder: 'Контактные данные...',
        isCustom: true,
      }));

    const combinedCustom = [...customContactOptions];
    fromOrder.forEach(item => {
      if (!combinedCustom.some(c => c.label.toLowerCase() === item.label.toLowerCase())) {
        combinedCustom.push(item);
      }
    });

    return [...DEFAULT_CONTACT_OPTIONS, ...combinedCustom];
  }, [contacts, customContactOptions]);

  const handleToggleContact = (type: ContactType, label: string) => {
    const exists = contacts.find(
      c => c.label === label || (!c.label && c.type === type && label === DEFAULT_CONTACT_OPTIONS.find(d => d.type === type)?.label)
    );
    let updated: ContactItem[];
    if (exists) {
      updated = contacts.filter(c => c !== exists);
    } else {
      updated = [...contacts, { type, label, value: '' }];
    }
    setContacts(updated);
    const primary = updated.find(c => c.value && c.value.trim().length > 0)?.value || '';
    onInlineUpdate(order.id, {
      contacts: updated,
      contact: primary,
    });
    showSavedBadge();
  };

  const handleUpdateContactValue = (type: ContactType, label: string, val: string) => {
    const idx = contacts.findIndex(
      c => c.label === label || (!c.label && c.type === type && label === DEFAULT_CONTACT_OPTIONS.find(d => d.type === type)?.label)
    );
    let updated: ContactItem[];
    if (idx >= 0) {
      updated = contacts.map((c, i) => (i === idx ? { ...c, value: val } : c));
    } else {
      updated = [...contacts, { type, label, value: val }];
    }
    setContacts(updated);
  };

  const handleContactInputBlur = () => {
    const primary = contacts.find(c => c.value && c.value.trim().length > 0)?.value || '';
    onInlineUpdate(order.id, {
      contacts,
      contact: primary,
    });
    showSavedBadge();
  };

  const handleCreateCustomContactOption = () => {
    const trimmed = customContactLabelInput.trim();
    if (!trimmed) {
      setIsAddingCustomContact(false);
      return;
    }
    if (!allDirectContactOptions.some(o => o.label.toLowerCase() === trimmed.toLowerCase())) {
      setCustomContactOptions(prev => [
        ...prev,
        { type: 'other', label: trimmed, placeholder: 'Контактные данные...', isCustom: true }
      ]);
      const updated = [...contacts, { type: 'other' as ContactType, label: trimmed, value: '' }];
      setContacts(updated);
      const primary = updated.find(c => c.value && c.value.trim().length > 0)?.value || '';
      onInlineUpdate(order.id, { contacts: updated, contact: primary });
      showSavedBadge();
    }
    setCustomContactLabelInput('');
    setIsAddingCustomContact(false);
  };

  const handleDeleteCustomContactOption = (label: string) => {
    setCustomContactOptions(prev => prev.filter(o => o.label !== label));
    const updated = contacts.filter(c => c.label !== label);
    setContacts(updated);
    const primary = updated.find(c => c.value && c.value.trim().length > 0)?.value || '';
    onInlineUpdate(order.id, { contacts: updated, contact: primary });
    showSavedBadge();
  };

  const handleAmountBlur = () => {
    const num = parseFloat(amount.replace(/\s+/g, '').replace(',', '.')) || 0;
    if (isExpense) {
      if (num !== order.amount || num !== order.payment) {
        onInlineUpdate(order.id, { amount: num, payment: num, payments: [num] });
        showSavedBadge();
      }
    } else {
      if (num !== order.amount) {
        onInlineUpdate(order.id, { amount: num });
        showSavedBadge();
      }
    }
  };

  const handleCostBlur = () => {
    const num = parseFloat(cost.replace(/\s+/g, '').replace(',', '.')) || 0;
    if (num !== order.cost) {
      onInlineUpdate(order.id, { cost: num });
      showSavedBadge();
    }
  };

  const handleNotesBlur = () => {
    if (notes !== (order.notes || '')) {
      onInlineUpdate(order.id, { notes });
      showSavedBadge();
    }
  };

  const totalAmount = parseFloat(amount.replace(/\s+/g, '').replace(',', '.')) || 0;
  const totalCost = parseFloat(cost.replace(/\s+/g, '').replace(',', '.')) || 0;
  const paid = parseFloat(payment.replace(/\s+/g, '').replace(',', '.')) || 0;
  const netProfit = totalAmount - totalCost;
  const marginPercent = totalAmount > 0 ? ((netProfit / totalAmount) * 100).toFixed(1) : '0';
  const debt = Math.max(0, totalAmount - paid);
  const paidPercent = totalAmount > 0
    ? Math.min(100, Math.max(0, (paid / totalAmount) * 100))
    : (paid > 0 ? 100 : 0);
  const isFullPaid = totalAmount > 0 && Math.abs(paid - totalAmount) < 0.01;
  const deadlineInfo = getDeadlineInfo(deadline, status);

  const handleUpdatePaymentItem = (index: number, updates: Partial<PaymentItem>) => {
    setPaymentItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...updates } : it))
    );
  };

  const handleCommitPaymentItemEdit = (itemsToSave?: PaymentItem[]) => {
    const items = itemsToSave || paymentItems;
    const total = roundTo2(items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0));
    setPayment(String(total));
    onInlineUpdate(order.id, {
      payment: total,
      payments: items,
    });
    showSavedBadge();
  };

  const handleSetFullPayment = () => {
    if (totalAmount <= 0) return;

    // Считаем сумму всех уже внесённых платежей
    const currentPaidSum = roundTo2(paymentItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0));
    const remainingDebt = roundTo2(Math.max(0, totalAmount - currentPaidSum));

    if (remainingDebt <= 0) {
      // Уже оплачено на 100% или больше
      return;
    }

    const todayStr = getTodayFormatted();
    const note = paymentItems.length === 0 ? 'Полная оплата 100%' : 'Доплата до 100%';
    const newItem: PaymentItem = {
      id: createPaymentItemId(order.id, paymentItems),
      amount: remainingDebt,
      date: todayStr,
      note,
    };

    const updated = [...paymentItems, newItem];
    setPaymentItems(updated);
    handleCommitPaymentItemEdit(updated);
  };

  const handleAddPaymentItem = (initialAmount = 0, initialNote = '') => {
    const newItem: PaymentItem = {
      id: createPaymentItemId(order.id, paymentItems),
      amount: initialAmount,
      date: getTodayFormatted(),
      note: initialNote,
    };
    const updated = [...paymentItems, newItem];
    setPaymentItems(updated);
    handleCommitPaymentItemEdit(updated);
  };

  const handleRemovePaymentItem = (index: number) => {
    const updated = paymentItems.filter((_, i) => i !== index);
    setPaymentItems(updated);
    handleCommitPaymentItemEdit(updated);
  };

  const handlePaymentDateChange = (newDate: string) => {
    if (paymentDatePicker === null) return;
    const idx = paymentDatePicker.index;
    const updated = paymentItems.map((it, i) => (i === idx ? { ...it, date: newDate } : it));
    setPaymentItems(updated);
    handleCommitPaymentItemEdit(updated);
    setPaymentDatePicker(null);
  };

  const handlePaymentBlur = () => {
    const num = parseFloat(payment.replace(/\s+/g, '').replace(',', '.')) || 0;
    if (num !== paid) {
      let updatedItems: PaymentItem[];
      if (paymentItems.length <= 1) {
        if (num === 0) {
          updatedItems = [];
        } else {
          updatedItems = [{
            id: paymentItems[0]?.id || createPaymentItemId(order.id, paymentItems),
            amount: num,
            date: paymentItems[0]?.date || getTodayFormatted(),
            note: paymentItems[0]?.note || 'Оплата',
          }];
        }
      } else {
        const diff = roundTo2(num - paid);
        updatedItems = [...paymentItems];
        const lastIdx = updatedItems.length - 1;
        const newLastAmt = Math.max(0, roundTo2((updatedItems[lastIdx].amount || 0) + diff));
        updatedItems[lastIdx] = {
          ...updatedItems[lastIdx],
          amount: newLastAmt,
        };
      }
      setPaymentItems(updatedItems);
      handleCommitPaymentItemEdit(updatedItems);
    }
  };

  const currentStatusConfig = STATUS_CONFIG[status];
  const CurrentStatusIcon = currentStatusConfig?.icon || CheckCircle2;

  // Динамический список каналов
  const displayChannels = React.useMemo(() => {
    if (client && !ORDER_CHANNELS.some(c => c.toLowerCase() === client.toLowerCase())) {
      return [client, ...ORDER_CHANNELS];
    }
    return [...ORDER_CHANNELS];
  }, [client]);

  return (
    <div
      data-row-drawer="true"
      onClick={(e) => e.stopPropagation()}
      className="p-2.5 sm:p-3 font-mono text-xs select-none space-y-2 bg-neutral-950/98 text-white border-t border-white/10"
    >
      {/* ========================================================================= */}
      {/* РАЗДЕЛ 01 · ИЗДЕЛИЕ И ПАРАМЕТРЫ ЗАКАЗА                                    */}
      {/* ========================================================================= */}
      <div className="p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-white/10 font-mono text-[#71717a]">
          <span className="text-[9.5px] uppercase tracking-wider font-semibold">
            {isExpense ? 'РАЗДЕЛ 01 · НАИМЕНОВАНИЕ И ПАРАМЕТРЫ РАСХОДА' : 'РАЗДЕЛ 01 · ИЗДЕЛИЕ И ПАРАМЕТРЫ ЗАКАЗА'}
          </span>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {isSavedNotice && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="h-5 px-1.5 rounded text-[9.5px] font-bold border flex items-center gap-1 shrink-0 bg-emerald-950/70 text-emerald-400 border-emerald-800/50"
                >
                  <Check className="w-2.5 h-2.5" />
                  СОХРАНЕНО
                </motion.div>
              )}
            </AnimatePresence>
            <span className="text-[9px] font-mono text-neutral-500">
              позиция {formatOrderNumber(order)}
            </span>
          </div>
        </div>

        {/* Единая строка: [Номер] [Доход/Расход] [Название...] [Статус] [Дата] [Срок] [Тираж шт] */}
        <div className="flex items-center gap-2.5 min-h-[36px] pt-0.5 flex-wrap sm:flex-nowrap">
          {/* Слева от названия: Номер заказа + Доход/Расход */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Номер заказа */}
            <span className="h-8 flex items-center justify-center font-mono text-xs font-bold px-2.5 rounded-md tracking-wider shrink-0 text-neutral-200 bg-white/5 border border-white/10">
              {formatOrderNumber(order)}
            </span>

            {/* Доход / Расход */}
            <span className={`h-8 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider px-2.5 rounded-md border shrink-0 ${
              order.type === 'income'
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                : 'bg-rose-950/40 text-rose-400 border-rose-800/40'
            }`}>
              {order.type === 'income' ? 'ДОХОД' : 'РАСХОД'}
            </span>
          </div>

          {/* Название изделия или расхода */}
          <div className="flex-1 min-w-[160px]">
            <input
              type="text"
              placeholder={isExpense ? "Введите наименование расхода (напр. 3 катушки PETG, сопло 0.4 Hardened Steel, аренда)..." : "Введите наименование изделия..."}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full bg-transparent border-none focus:outline-none p-0 text-base sm:text-lg font-light font-mono tracking-tight text-white placeholder-[#52525b]"
            />
          </div>

          {/* Справа от названия, между названием и количеством штук: Статус, Дата, Срок */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Статус заказа (Portal) - скрыт для расхода */}
            {!isExpense && (
              <button
                ref={statusButtonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isStatusOpen) {
                    setIsStatusOpen(false);
                    return;
                  }
                  setStatusTargetRect(e.currentTarget.getBoundingClientRect());
                  setIsStatusOpen(true);
                }}
                className={`h-8 border rounded-md px-2 flex items-center justify-between gap-1 text-left font-mono text-[11px] cursor-pointer select-none tracking-wider uppercase shadow-inner shrink-0 ${
                  isStatusOpen
                    ? 'border-white/30 ring-1 ring-white/10 bg-neutral-900 text-white'
                    : 'bg-neutral-950/80 border-white/15 hover:border-white/25 text-white'
                }`}
                title="Клик для выбора статуса заказа"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <CurrentStatusIcon className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                  <span className="truncate font-mono text-[11px] text-neutral-200 max-w-[90px] sm:max-w-[110px]">
                    {status}
                  </span>
                </div>
                <ChevronDown className={`w-3 h-3 shrink-0 ml-1 text-neutral-400 ${
                  isStatusOpen ? 'rotate-180' : ''
                }`} />
              </button>
            )}

            {/* Дата заказа / расхода */}
            <button
              ref={dateButtonRef}
              type="button"
              onClick={(e) => handleOpenDatePicker('date', e)}
              className="h-8 flex items-center gap-1.5 border rounded-md px-2 text-[10.5px] cursor-pointer select-none shrink-0 bg-black/60 hover:bg-neutral-900 border-white/15 hover:border-white/30 text-neutral-300"
              title="Клик для выбора даты в календаре"
            >
              <span className="text-[9.5px] font-mono uppercase text-neutral-500">ДАТА:</span>
              <span className="font-mono text-[11px] font-semibold text-white">
                {date || '—'}
              </span>
            </button>

            {/* Срок сдачи / Дедлайн - скрыт для расхода */}
            {!isExpense && (
              <button
                ref={deadlineButtonRef}
                type="button"
                onClick={(e) => handleOpenDatePicker('deadline', e)}
                className="h-8 flex items-center gap-1.5 border rounded-md px-2 text-[10.5px] cursor-pointer select-none shrink-0 bg-black/60 hover:bg-neutral-900 border-white/15 hover:border-white/30 text-neutral-300"
                title="Клик для выбора дедлайна в календаре"
              >
                <span className="text-[9.5px] font-mono uppercase text-neutral-500">СРОК:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[11px] font-semibold text-white">
                    {deadline || '—'}
                  </span>
                  {deadlineInfo && (
                    <span className={`text-[8.5px] px-1 py-0.1 rounded border font-mono ${deadlineInfo.badgeStyle}`}>
                      {deadlineInfo.label}
                    </span>
                  )}
                </div>
              </button>
            )}
          </div>

          {/* Количество штук (Тираж) по правому краю с кнопками + и − (скрыт для расхода) */}
          {!isExpense && (
            <div className="flex items-baseline gap-1.5 shrink-0 select-none pl-2 border-l border-white/10">
              <input
                type="number"
                min="1"
                max="9999"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onBlur={handleQuantityBlur}
                className="text-2xl font-light font-mono tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text text-white"
                style={{ width: `${Math.max(1, String(quantity || 1).length) * 0.65 + 0.15}em` }}
              />

              {/* Вертикальные кнопки + сверху и − снизу */}
              <div className="flex flex-col items-center justify-center font-mono select-none self-center leading-none">
                <button
                  type="button"
                  onClick={handleIncrementQuantity}
                  className="w-3.5 h-3.5 flex items-center justify-center text-xs font-bold cursor-pointer leading-none text-[#71717a] hover:text-white"
                  title="Увеличить тираж на 1"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={handleDecrementQuantity}
                  disabled={parseInt(quantity, 10) <= 1}
                  className="w-3.5 h-3.5 flex items-center justify-center text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer leading-none text-[#71717a] hover:text-white"
                  title="Уменьшить тираж на 1"
                >
                  −
                </button>
              </div>

              <span className="text-xs font-mono select-none text-[#71717a]">
                шт
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ДВУХКОЛОНОЧНЫЙ БЛОК: РАЗДЕЛ 02 + РАЗДЕЛ 03                              */}
      {/* ========================================================================= */}
      {isExpense ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          {/* ----------------------------------------------------------------------- */}
          {/* РАЗДЕЛ 02 (РАСХОД) · КАТЕГОРИЯ ЗАТРАТ (7 из 12 колонок на десктопе)      */}
          {/* ----------------------------------------------------------------------- */}
          <div className="p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between space-y-2.5 lg:col-span-7">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-white/10 font-mono text-[#71717a]">
                <span className="text-[9.5px] uppercase tracking-wider font-semibold">
                  РАЗДЕЛ 02 · КАТЕГОРИЯ ЗАТРАТ
                </span>
              </div>

              {/* Поиск категории... */}
              <div className="relative w-full max-w-sm pt-0.5 pb-1">
                <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Поиск категории..."
                  value={expenseCatSearch}
                  onChange={(e) => setExpenseCatSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-white/30 rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder-[#52525b] font-mono focus:outline-none "
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

              {/* Сетка категорий затрат без прокрутки (3 колонки в стиле скриншота) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 lg:gap-x-6 gap-y-2 pt-0.5 font-mono text-xs select-none">
                {displayedExpenseCategories.map((catItem) => {
                  const isSelected = (client || 'Пластик и филамент') === catItem.label;
                  return (
                    <div
                      key={catItem.label}
                      className="flex items-center gap-1 group min-w-0"
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectExpenseCategory(catItem.label)}
                        className={`text-left text-xs font-mono cursor-pointer py-0.5 inline-flex items-center gap-1.5 ${
                          isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-[#d4d4d8]'
                        }`}
                      >
                        <span className="relative inline-flex items-center">
                          <span>{catItem.label}</span>
                          <HandDrawnUnderline isSelected={isSelected} color="white" />
                        </span>
                      </button>

                      {catItem.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomCategory(catItem.label)}
                          className="text-[#71717a] hover:text-red-400 text-xs px-1 cursor-pointer "
                          title="Удалить категорию из списка"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Добавление своей категории в список (стиль из скриншота) */}
            <div className="pt-2 font-mono">
              {isAddingCustomCategory ? (
                <div className="flex items-center gap-2 max-w-sm pt-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Название категории..."
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateCustomCategory();
                      if (e.key === 'Escape') {
                        setIsAddingCustomCategory(false);
                        setNewCategoryInput('');
                      }
                    }}
                    className="flex-1 bg-black/60 border border-white/20 focus:border-white/40 rounded px-2.5 py-1 text-xs font-mono text-white placeholder-[#52525b] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCustomCategory}
                    className="p-1 text-neutral-400 hover:text-white text-xs font-mono cursor-pointer rounded hover:bg-white/10 "
                    title="Добавить категорию"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCustomCategory(false);
                      setNewCategoryInput('');
                    }}
                    className="p-1 text-neutral-400 hover:text-white text-xs font-mono cursor-pointer rounded hover:bg-white/10 "
                    title="Отмена"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCustomCategory(true)}
                  className="text-xs font-mono text-[#71717a] hover:text-white cursor-pointer inline-flex items-center gap-1 group pt-1"
                >
                  <span className="text-neutral-400 group-hover:text-white">+</span>
                  <span className="border-b border-dashed border-[#71717a] group-hover:border-white pb-0.5">
                    Добавить свою категорию в список
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* РАЗДЕЛ 03 (РАСХОД) · СУММА СПИСАНИЯ (5 из 12 колонок на десктопе)        */}
          {/* ----------------------------------------------------------------------- */}
          <div className="p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between space-y-2 lg:col-span-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-white/10 font-mono text-[#71717a]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] uppercase tracking-wider font-semibold">
                    РАЗДЕЛ 03 · СУММА СПИСАНИЯ
                  </span>
                </div>
              </div>

              {/* Только сумма списания и финансовая сводка */}
              <div className="space-y-3 pt-1 font-mono">
                {/* 1. Сумма списания */}
                <div className="space-y-1">
                  <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                    СУММА СПИСАНИЯ
                  </div>
                  <div className="flex items-baseline gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setPayment(e.target.value);
                      }}
                      onBlur={handleAmountBlur}
                      className="text-3xl sm:text-4xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block cursor-text selection:bg-white/20"
                      style={{ width: `${Math.max(1, String(amount || 0).length) * 0.65 + 0.15}em` }}
                    />
                    <span className="text-base font-mono select-none text-rose-400 font-medium">
                      ₽ расход
                    </span>
                  </div>
                </div>

                {/* Быстрые пресеты сумм */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {[500, 1000, 2000, 3000, 5000, 10000].map((presetAmt) => {
                    const isSelected = Number(amount) === presetAmt;
                    return (
                      <button
                        key={presetAmt}
                        type="button"
                        onClick={() => {
                          setAmount(String(presetAmt));
                          setPayment(String(presetAmt));
                          onInlineUpdate(order.id, { amount: presetAmt, payment: presetAmt, payments: [presetAmt] });
                          showSavedBadge();
                        }}
                        className={`px-2 py-0.5 rounded text-xs font-mono cursor-pointer border ${
                          isSelected
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                            : 'border-white/10 text-neutral-400 hover:text-white hover:border-white/20 bg-white/[0.02]'
                        }`}
                      >
                        {presetAmt} ₽
                      </button>
                    );
                  })}
                </div>

                {/* 2. Финансовая сводка */}
                <div className="pt-2.5 border-t border-white/[0.08] space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-[#71717a]">
                    <span>Влияние на кассу:</span>
                    <span className="text-rose-400 font-bold font-mono">-{formatMoney(totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#71717a]">
                    <span>Статья затрат:</span>
                    <span className="text-neutral-300 truncate max-w-[200px]">{client || 'Пластик и филамент'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Подвал раздела */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
              <span>СТАТУС СПИСАНИЯ</span>
              <span className="text-rose-400 font-medium">Расход учтён в кассе</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          {/* ----------------------------------------------------------------------- */}
          {/* РАЗДЕЛ 02 · ЗАКАЗЧИК И КАНАЛ СВЯЗИ (5 из 12 колонок на десктопе)        */}
          {/* ----------------------------------------------------------------------- */}
          <div className="p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between space-y-2 lg:col-span-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-white/10 font-mono text-[#71717a]">
                <span className="text-[9.5px] uppercase tracking-wider font-semibold">
                  РАЗДЕЛ 02 · ЗАКАЗЧИК И КАНАЛ СВЯЗИ
                </span>
                {client && (
                  <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400">
                    {client}
                  </span>
                )}
              </div>

              {/* Две колонки: Слева Клиент и Контакты, Справа Источник / Канал связи */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-0.5">
                {/* Левая колонка: Имя клиента и Контакты */}
                <div className="sm:col-span-7 space-y-2.5 font-mono">
                  {/* 1. Имя клиента */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                      ИМЯ КЛИЕНТА
                    </div>
                    <input
                      type="text"
                      placeholder="Введите имя клиента..."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      onBlur={handleClientBlur}
                      className="w-full bg-transparent border-none focus:outline-none p-0 text-base sm:text-lg font-light font-mono tracking-tight text-white placeholder-[#52525b]"
                    />
                  </div>

                  {/* 2. Контакты клиента */}
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.08]">
                    <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                      КОНТАКТЫ КЛИЕНТА
                    </div>

                    <div className="space-y-1">
                      {allDirectContactOptions.map((opt) => {
                        const activeContact = (contacts || []).find(
                          c => c.label === opt.label || (!c.label && c.type === opt.type && opt.label === DEFAULT_CONTACT_OPTIONS.find(d => d.type === opt.type)?.label)
                        );
                        const isSelected = !!activeContact;

                        return (
                          <div
                            key={opt.label}
                            className="flex items-baseline justify-between gap-2 py-0.5 border-b border-white/[0.03] last:border-none min-h-[26px]"
                          >
                            {/* Левая часть: название контакта со strikethrough / underline */}
                            <div className="flex items-center gap-1.5 shrink-0">
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
                                  <HandDrawnUnderline isSelected={isSelected} color="white" />
                                </span>
                              </button>

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

                            {/* Правая часть: поле ввода контакта */}
                            {isSelected && (
                              <div className="flex items-center gap-1 font-mono flex-1 justify-end min-w-0">
                                <input
                                  type="text"
                                  placeholder={opt.placeholder}
                                  value={activeContact?.value || ''}
                                  onChange={(e) => handleUpdateContactValue(opt.type, opt.label, e.target.value)}
                                  onBlur={handleContactInputBlur}
                                  className="bg-transparent border-none focus:outline-none p-0 text-xs text-right font-mono text-white placeholder-[#52525b] w-full max-w-[130px] selection:bg-white/20 truncate"
                                />
                                {activeContact?.value && getContactHref(opt.type, activeContact.value) && (
                                  <a
                                    href={getContactHref(opt.type, activeContact.value) || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#71717a] hover:text-white p-0.5 shrink-0"
                                    title="Перейти"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Добавление своего кастомного контакта */}
                    <div className="pt-1">
                      {isAddingCustomContact ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Название (напр. Discord)..."
                            value={customContactLabelInput}
                            onChange={(e) => setCustomContactLabelInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateCustomContactOption();
                              } else if (e.key === 'Escape') {
                                setIsAddingCustomContact(false);
                                setCustomContactLabelInput('');
                              }
                            }}
                            className="bg-black/50 border border-white/15 focus:border-white/40 rounded px-1.5 py-0.5 text-xs text-white placeholder-[#52525b] font-mono focus:outline-none flex-1 min-w-0"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleCreateCustomContactOption}
                            className="p-1 text-neutral-400 hover:text-white text-xs font-mono cursor-pointer rounded hover:bg-white/10 "
                            title="Добавить контакт"
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
                            title="Отмена"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsAddingCustomContact(true)}
                          className="py-0.5 text-xs font-mono text-[#71717a] hover:text-white cursor-pointer flex items-center gap-1.5 select-none"
                        >
                          <span className="text-[#a1a1aa] font-bold">+</span>
                          <span className="border-b border-dashed border-[#71717a] hover:border-white whitespace-nowrap">
                            Добавить свой контакт в список
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Правая колонка: Источник / Канал связи */}
                <div className="sm:col-span-5 sm:border-l sm:border-white/[0.08] sm:pl-3.5 space-y-1.5 font-mono select-none">
                  <div className="flex items-center justify-between text-[10px] text-[#71717a] uppercase tracking-wider font-semibold pb-0.5">
                    <span>ИСТОЧНИК / КАНАЛ СВЯЗИ</span>
                  </div>

                  <div className="space-y-0.5">
                    {displayChannels.map((channelName) => {
                      const clientCfg = CLIENT_CONFIG[channelName];
                      const IconComponent = clientCfg?.icon || MoreHorizontal;
                      const isSelected = (client || 'Авито') === channelName;

                      return (
                        <button
                          key={channelName}
                          type="button"
                          onClick={() => handleClientChange(channelName)}
                          className={`flex items-center gap-2 py-0.5 text-xs font-mono cursor-pointer text-left w-full ${
                            isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-[#d4d4d8]'
                          }`}
                        >
                          <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[#71717a]'}`} />
                          <span className="relative inline-flex items-center">
                            <span>{channelName}</span>
                            <HandDrawnUnderline isSelected={isSelected} color="white" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* РАЗДЕЛ 03 · ФИНАНСЫ, СЕБЕСТОИМОСТЬ И ОПЛАТА (7 из 12 колонок)             */}
          {/* ----------------------------------------------------------------------- */}
          <div className="p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between space-y-2 lg:col-span-7">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-white/10 font-mono text-[#71717a]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] uppercase tracking-wider font-semibold">
                    РАЗДЕЛ 03 · ФИНАНСЫ, СЕБЕСТОИМОСТЬ И ОПЛАТА
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {debt > 0 && (
                    <span className="text-[9px] font-mono font-semibold hidden xs:inline text-amber-400">
                      долг {formatMoney(debt)}
                    </span>
                  )}
                  <span className={`text-[8.5px] font-mono uppercase px-1.5 py-0.2 rounded border font-semibold ${
                    paid >= totalAmount && totalAmount > 0
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                      : paid > 0
                        ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                        : 'bg-white/5 text-neutral-400 border-white/10'
                  }`}>
                    {paid >= totalAmount && totalAmount > 0
                      ? 'ОПЛАЧЕН ПОЛНОСТЬЮ'
                      : paid > 0
                      ? `ОПЛАЧЕНО ${totalAmount > 0 ? Math.round((paid / totalAmount) * 100) : 0}%`
                      : 'НЕ ОПЛАЧЕН'}
                  </span>
                </div>
              </div>

              {/* Две симметричные колонки: Слева Стоимость и Себестоимость, Справа Внесение оплаты и остаток */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-0.5">
                {/* Левая колонка: Стоимость клиенту и Себестоимость */}
                <div className="sm:col-span-6 space-y-2.5 font-mono">
                  {/* 1. Стоимость клиенту */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                      СТОИМОСТЬ КЛИЕНТУ
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onBlur={handleAmountBlur}
                        className="text-2xl sm:text-3xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block cursor-text selection:bg-white/20"
                        style={{ width: `${Math.max(1, String(amount || 0).length) * 0.65 + 0.15}em` }}
                      />
                      <span className="text-sm font-mono select-none text-[#71717a]">
                        ₽ сумма
                      </span>
                    </div>
                  </div>

                  {/* 2. Себестоимость (для заказов) */}
                  <div className="space-y-1 pt-2 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                      <span>СЕБЕСТОИМОСТЬ</span>
                      <span className="text-white text-xs font-mono">{formatMoney(totalCost)}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        onBlur={handleCostBlur}
                        className="text-xl sm:text-2xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block cursor-text selection:bg-white/20"
                        style={{ width: `${Math.max(1, String(cost || 0).length) * 0.65 + 0.15}em` }}
                      />
                      <span className="text-xs font-mono select-none text-[#71717a]">
                        ₽ себест.
                      </span>
                    </div>

                    {/* Статьи расходов если есть */}
                    {order.cost_items && order.cost_items.length > 0 && (
                      <div className="pt-1 font-mono">
                        <div className="text-[8.5px] uppercase tracking-wider mb-0.5 text-neutral-500">
                          Статьи:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {order.cost_items.map((ci, idx) => (
                            <span key={idx} className="text-[9px] px-1.5 py-0.2 border rounded font-mono bg-white/5 border-white/10 text-neutral-300">
                              {ci.category}: {formatMoney(ci.amount)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Правая колонка: Внесение оплаты, полоска долга и платежи */}
                <div className="sm:col-span-6 sm:border-l sm:border-white/[0.08] sm:pl-3.5 space-y-2.5 font-mono select-none">
                  {/* 1. Внесение оплаты в нативном стиле */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                      <span>ВНЕСЕННАЯ ОПЛАТА</span>
                      <span className="text-white text-xs font-mono font-medium">{formatMoney(paid)}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={payment}
                          onChange={(e) => setPayment(e.target.value)}
                          onBlur={handlePaymentBlur}
                          className="text-2xl sm:text-3xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block cursor-text selection:bg-white/20"
                          style={{ width: `${Math.max(1, String(payment || 0).length) * 0.65 + 0.15}em` }}
                        />
                        <span className="text-sm font-mono select-none text-[#71717a]">
                          ₽ внесено
                        </span>
                      </div>

                      {/* Быстрое внесение оплаты 100% */}
                      <button
                        type="button"
                        onClick={handleSetFullPayment}
                        className={`py-0.5 text-xs font-mono cursor-pointer shrink-0 ${
                          isFullPaid
                            ? 'text-white font-bold'
                            : 'text-[#71717a] hover:text-white'
                        }`}
                        title={isFullPaid ? 'Заказ оплачен на 100%' : debt > 0 ? `Добавить платёж на остаток (${formatMoney(debt)})` : 'Внести 100% оплату'}
                      >
                        <span className="relative inline-block">
                          <span>100%</span>
                          <HandDrawnUnderline isSelected={isFullPaid} color="white" />
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Полоска остатка долга и прогресс оплаты */}
                  <div className="pt-2 border-t border-white/[0.08] space-y-1.5 font-mono">
                    <div className="flex items-baseline justify-between text-xs flex-wrap gap-x-2 gap-y-0.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">ОПЛАТА:</span>
                        <span className="text-white font-medium">{formatMoney(paid)}</span>
                        <span className="text-[#71717a] text-[11px]">/ {formatMoney(totalAmount)}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">ОСТАТОК:</span>
                        <span className={`font-semibold ${debt > 0 ? 'text-[#f87171]' : 'text-[#34d399]'}`}>
                          {debt > 0 ? formatMoney(debt) : 'Оплачен'}
                        </span>
                      </div>
                    </div>

                    {/* Тонкий аккуратный прогресс-бар в нативном стиле */}
                    <div className="w-full h-1 bg-[#222226] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full "
                        style={{ width: `${Math.min(100, Math.max(paidPercent > 0 ? 3 : 0, paidPercent))}%` }}
                      />
                    </div>

                    {/* Чистая прибыль */}
                    <div className="flex items-center justify-between text-[11px] text-[#71717a] pt-0.5">
                      <span>Чистая прибыль:</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`font-medium ${netProfit >= 0 ? 'text-white' : 'text-[#f87171]'}`}>
                          {netProfit >= 0 ? `+${formatMoney(netProfit)}` : formatMoney(netProfit)}
                        </span>
                        <span className="text-[10px] text-[#71717a]">({marginPercent}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. История платежей в нативном стиле без рамочных таблиц */}
                  <div className="pt-2 border-t border-white/[0.08] space-y-1 font-mono">
                    <div className="flex items-center justify-between text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                      <span>ИСТОРИЯ ПЛАТЕЖЕЙ</span>
                      {paymentItems.length > 0 && (
                        <span className="text-neutral-400 font-normal">{paymentItems.length} зап.</span>
                      )}
                    </div>

                    {/* Список платежей */}
                    {paymentItems.length > 0 && (
                      <div className="space-y-1 max-h-[85px] overflow-y-auto pr-1">
                        {paymentItems.map((item, idx) => (
                          <div
                            key={item.id}
                            className="flex items-baseline justify-between gap-2 py-0.5 border-b border-white/[0.04] last:border-none group text-xs"
                          >
                            <div className="flex items-baseline gap-1.5 min-w-0">
                              <span className="text-[#71717a] text-[10px]">#{idx + 1}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setPaymentDatePicker({
                                    index: idx,
                                    targetRect: rect,
                                    value: item.date || getTodayFormatted(),
                                  });
                                }}
                                className="text-white hover:text-white border-b border-dashed border-[#71717a] hover:border-white text-[11px] cursor-pointer shrink-0"
                                title="Изменить дату платежа"
                              >
                                {item.date || '—'}
                              </button>
                              <input
                                type="text"
                                value={item.note || ''}
                                onChange={(e) => handleUpdatePaymentItem(idx, { note: e.target.value })}
                                onBlur={() => handleCommitPaymentItemEdit()}
                                placeholder="Примечание..."
                                className="bg-transparent border-none focus:outline-none p-0 text-[11px] text-[#71717a] hover:text-[#d4d4d8] focus:text-white truncate max-w-[100px]"
                              />
                            </div>

                            <div className="flex items-baseline gap-1.5 shrink-0">
                              <input
                                type="text"
                                value={item.amount === 0 ? '' : item.amount}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/\s+/g, '').replace(',', '.');
                                  const val = parseFloat(clean);
                                  handleUpdatePaymentItem(idx, { amount: isNaN(val) ? 0 : val });
                                }}
                                onBlur={() => handleCommitPaymentItemEdit()}
                                placeholder="0"
                                className="bg-transparent border-none focus:outline-none p-0 text-right text-xs font-mono font-medium text-white [appearance:textfield]"
                                style={{ width: `${Math.max(1, String(item.amount || 0).length) * 0.65 + 0.15}em` }}
                              />
                              <span className="text-[10px] text-[#71717a]">₽</span>
                              <button
                                type="button"
                                onClick={() => handleRemovePaymentItem(idx)}
                                className="text-[#71717a] hover:text-rose-400 text-xs px-0.5 cursor-pointer opacity-40 group-hover:opacity-100 "
                                title="Удалить платёж"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Кнопка добавления нового платежа (в стиле Section 02) */}
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleAddPaymentItem(debt > 0 ? debt : 0, paymentItems.length === 0 ? 'Предоплата' : `Платёж #${paymentItems.length + 1}`)}
                        className="py-0.5 text-xs font-mono text-[#71717a] hover:text-white cursor-pointer flex items-center gap-1.5 select-none"
                      >
                        <span className="text-[#a1a1aa] font-bold">+</span>
                        <span className="border-b border-dashed border-[#71717a] hover:border-white whitespace-nowrap">
                          Добавить платёж в историю
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. РАЗДЕЛ 04 · ЗАМЕТКИ, ТЗ / ЧЕК И ТРЕКИНГ (на всю ширину блока)          */}
      {/* ========================================================================= */}
      <div className="p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-1.5">
        <div className="flex items-center justify-between pb-1 border-b border-white/10 font-mono text-[#71717a]">
          <span className="text-[9.5px] uppercase tracking-wider font-semibold">
            {isExpense ? 'РАЗДЕЛ 04 · ЗАМЕТКИ, ЧЕК И ТРЕКИНГ ЗАКУПКИ' : 'РАЗДЕЛ 04 · ЗАМЕТКИ, ТЗ И ПАРАМЕТРЫ ПЕЧАТИ'}
          </span>
          <div className="flex items-center gap-2.5">
            {order.product_id && !isExpense && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
                <Tag className="w-2.5 h-2.5" />
                <span>Связан с каталогом</span>
              </span>
            )}
            <span className="text-[9px] font-mono text-neutral-500">
              {notes.length} симв.
            </span>
          </div>
        </div>

        <div className="pt-0.5">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder={
              isExpense
                ? "Номер накладной, трек-номер посылки, чек, ссылка на товар или примечания к закупке..."
                : "Введите важные детали заказа, техническое задание, параметры печати, цвет пластика, постобработку..."
            }
            rows={2}
            className="w-full bg-transparent border-none focus:outline-none p-0 text-xs sm:text-sm font-light font-mono tracking-tight text-white placeholder-[#52525b] resize-y min-h-[36px] leading-relaxed"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ПОРТАЛЫ: Выпадающие списки и календари                                    */}
      {/* ========================================================================= */}
      <StatusDropdownPortal
        isOpen={isStatusOpen}
        targetRect={statusTargetRect}
        triggerRef={statusButtonRef}
        currentStatus={status}
        onSelect={(newStatus) => {
          handleStatusChange(newStatus);
          setIsStatusOpen(false);
        }}
        onClose={() => setIsStatusOpen(false)}
      />

      {activeDatePicker && (
        <TableDeadlinePicker
          isOpen={Boolean(activeDatePicker)}
          targetRect={activeDatePicker.targetRect}
          triggerRef={activeDatePicker.field === 'date' ? dateButtonRef : deadlineButtonRef}
          value={activeDatePicker.value}
          title={activeDatePicker.field === 'date' ? 'ДАТА ЗАКАЗА' : 'ДЕДЛАЙН ЗАКАЗА'}
          showDeadlineBadge={activeDatePicker.field === 'deadline'}
          orderStatus={status}
          onChange={handleDatePickerChange}
          onClose={() => setActiveDatePicker(null)}
        />
      )}

      {paymentDatePicker && (
        <TableDeadlinePicker
          isOpen={Boolean(paymentDatePicker)}
          targetRect={paymentDatePicker.targetRect}
          value={paymentDatePicker.value}
          title={`ДАТА ПЛАТЕЖА #${paymentDatePicker.index + 1}`}
          showDeadlineBadge={false}
          onChange={handlePaymentDateChange}
          onClose={() => setPaymentDatePicker(null)}
        />
      )}
    </div>
  );
}
