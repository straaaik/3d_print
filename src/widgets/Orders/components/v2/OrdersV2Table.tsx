import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Order, 
  OrderStatus, 
  ContactType,
  CONTACT_TYPES_CONFIG,
  SortField, 
  SortOrder, 
  SavedCalculation, 
  CLIENT_CONFIG, 
  STATUS_CONFIG,
  ALL_STATUSES,
  ALL_CLIENTS,
} from '../../types';
import { formatMoney, roundTo2, getDeadlineInfo } from '../../helpers';
import { formatOrderNumber, getPaymentBadgeInfo, getStatusBadgeV2 } from './types';
import { 
  ChevronUp, 
  ChevronDown, 
  Edit2, 
  Copy, 
  Trash2, 
  Package, 
  Phone, 
  Flame, 
  Globe,
  Check, 
  CheckCircle2,
  ExternalLink, 
  Plus, 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip } from '@/shared/ui/Tooltip';
import { AnimatedPriceNumber } from '@/shared/ui/AnimatedPriceNumber';
import { TableDeadlinePicker } from './TableDeadlinePicker';
import { OrderContactsModal, getContactHref } from './OrderContactsModal';
import { OrderRowDrawer } from './OrderRowDrawer';
import { OrderPaymentModal } from './OrderPaymentModal';

const COMPACT_GRID_COLUMNS = '112px 80px 176px minmax(200px, 1.5fr) 144px 128px 96px 144px 112px';
const EXPANDED_GRID_COLUMNS = '128px 112px 96px 176px 176px minmax(200px, 1.5fr) 192px 128px 144px 128px 112px 128px 144px 144px';

export type EditableField = 
  | 'date' 
  | 'client_name' 
  | 'contact' 
  | 'title' 
  | 'quantity' 
  | 'notes' 
  | 'amount' 
  | 'cost' 
  | 'deadline' 
  | 'payment';

interface OrdersV2TableProps {
  orders: Order[];
  visibleOrders: Order[];
  visibleCount: number;
  totalOrdersCount: number;
  onLoadMore: () => void;
  onShowAll: () => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onOpenEditModal: (order: Order) => void;
  onOpenAddModal: () => void;
  onUpdateStatus: (order: Order, newStatus: OrderStatus) => void;
  onToggleType: (order: Order) => void;
  onDuplicateOrder: (order: Order) => void;
  onRequestDelete: (order: Order) => void;
  onInlineUpdate: (orderId: string, updates: Partial<Order>) => void;
  searchQuery: string;
  savedCalculations?: SavedCalculation[];
  isExpanded?: boolean;

  // Контекстное меню
  contextMenu: { x: number; y: number; order: Order } | null;
  setContextMenu: (menu: { x: number; y: number; order: Order } | null) => void;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  onCopyContact: (text: string) => void;
  elevatedOrder?: Order | null;
  setElevatedOrder?: (order: Order | null) => void;
}

// Вспомогательная функция для получения дня недели
const getDayOfWeek = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      return days[d.getDay()] || '';
    }
  } catch {
    return '';
  }
  return '';
};

interface StatusDropdownPortalProps {
  order: Order;
  targetRect: DOMRect;
  onClose: () => void;
  onUpdateStatus: (order: Order, newStatus: OrderStatus) => void;
}

function TableStatusDropdownPortal({
  order,
  targetRect,
  onClose,
  onUpdateStatus,
}: StatusDropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      if (targetRect) {
        const { left, right, top, bottom } = targetRect;
        if (e.clientX >= left && e.clientX <= right && e.clientY >= top && e.clientY <= bottom) {
          return;
        }
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
  }, [onClose, targetRect]);

  if (typeof window === 'undefined') return null;

  const width = 180;
  const height = 330;
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
      className="rounded-xl bg-neutral-950 border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden flex flex-col font-mono select-none text-xs"
    >
      <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-neutral-500 border-b border-white/5 font-semibold bg-white/[0.02]">
        СТАТУС ЗАКАЗА
      </div>
      <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto scrollbar-none p-1">
        {ALL_STATUSES.map((st) => {
          const cfg = STATUS_CONFIG[st];
          const Icon = cfg?.icon || CheckCircle2;
          const isSelected = order.status === st;
          return (
            <button
              key={st}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(order, st);
                onClose();
              }}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 cursor-pointer text-xs group ${
                isSelected
                  ? 'bg-white/10 text-white font-semibold'
                  : 'bg-transparent hover:bg-white/5 text-neutral-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`} />
                <span className="truncate leading-none">{st}</span>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-white/80 shrink-0 ml-1.5" />}
            </button>
          );
        })}
      </div>
      <div className="px-3 py-1 bg-neutral-950 border-t border-white/5 text-[9px] font-mono text-neutral-500 uppercase tracking-wider flex items-center justify-between shrink-0">
        <span>{ALL_STATUSES.length} СТАТУСОВ</span>
        <span className="text-neutral-600">3DLABS</span>
      </div>
    </motion.div>,
    document.body
  );
}

interface ChannelDropdownPortalProps {
  order: Order;
  targetRect: DOMRect;
  onClose: () => void;
  onInlineUpdate: (orderId: string, updates: Partial<Order>) => void;
}

function TableChannelDropdownPortal({
  order,
  targetRect,
  onClose,
  onInlineUpdate,
}: ChannelDropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
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
  }, [onClose]);

  if (typeof window === 'undefined') return null;

  const width = 180;
  const height = 310;
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
      className="rounded-xl bg-neutral-950 border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden flex flex-col font-mono select-none text-xs"
    >
      <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-neutral-500 border-b border-white/5 font-semibold bg-white/[0.02]">
        ИСТОЧНИК ЗАКАЗА
      </div>
      <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto scrollbar-none p-1">
        {ALL_CLIENTS.map((cl) => {
          const cfg = CLIENT_CONFIG[cl];
          const Icon = cfg?.icon || Globe;
          const isSelected = order.client === cl;
          return (
            <button
              key={cl}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInlineUpdate(order.id, { client: cl });
                onClose();
              }}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 cursor-pointer text-xs group ${
                isSelected
                  ? 'bg-white/10 text-white font-semibold'
                  : 'bg-transparent hover:bg-white/5 text-neutral-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`} />
                <span className="truncate leading-none">{cl}</span>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-white/80 shrink-0 ml-1.5" />}
            </button>
          );
        })}
      </div>
      <div className="px-3 py-1 bg-neutral-950 border-t border-white/5 text-[9px] font-mono text-neutral-500 uppercase tracking-wider flex items-center justify-between shrink-0">
        <span>{ALL_CLIENTS.length} ИСТОЧНИКОВ</span>
        <span className="text-neutral-600">3DLABS</span>
      </div>
    </motion.div>,
    document.body
  );
}

export const OrdersV2Table = React.memo(function OrdersV2Table({
  orders,
  visibleOrders,
  visibleCount,
  totalOrdersCount,
  onLoadMore,
  onShowAll,
  sortField,
  sortOrder,
  onSort,
  onOpenEditModal,
  onUpdateStatus,
  onToggleType,
  onDuplicateOrder,
  onRequestDelete,
  onInlineUpdate,
  searchQuery,
  savedCalculations = [],
  isExpanded = false,
  contextMenu,
  setContextMenu,
  contextMenuRef,
  onCopyContact,
  elevatedOrder: propElevatedOrder,
  setElevatedOrder: propSetElevatedOrder,
}: OrdersV2TableProps) {
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<{
    order: Order;
    targetRect: DOMRect;
  } | null>(null);
  const [activeChannelDropdown, setActiveChannelDropdown] = useState<{
    order: Order;
    targetRect: DOMRect;
  } | null>(null);
  const [activeDatePicker, setActiveDatePicker] = useState<{
    orderId: string;
    field: 'date' | 'deadline';
    targetRect: DOMRect;
    value: string;
    status?: string;
  } | null>(null);

  // Модальное окно управления контактами заказа
  const [activeContactsOrder, setActiveContactsOrder] = useState<Order | null>(null);
  const [copiedContact, setCopiedContact] = useState<string | null>(null);

  // Модальное окно детального учета оплаты и оплаты частями
  const [activePaymentOrder, setActivePaymentOrder] = useState<Order | null>(null);

  // Взлетающая строка заказа с размытием фона (локальное или внешнее состояние)
  const [internalElevatedOrder, setInternalElevatedOrder] = useState<Order | null>(null);
  const elevatedOrder = propElevatedOrder !== undefined ? propElevatedOrder : internalElevatedOrder;
  const setElevatedOrder = propSetElevatedOrder !== undefined ? propSetElevatedOrder : setInternalElevatedOrder;
  const lastElevatedCloseTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!elevatedOrder) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setElevatedOrder(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [elevatedOrder, setElevatedOrder]);

  const handleOpenContactsModal = (order: Order) => {
    setContextMenu(null);
    setActiveDatePicker(null);
    setActiveStatusDropdown(null);
    setActiveChannelDropdown(null);
    setEditingCell(null);
    setActivePaymentOrder(null);
    setActiveContactsOrder(order);
  };

  const handleOpenPaymentModal = (order: Order) => {
    setContextMenu(null);
    setActiveDatePicker(null);
    setActiveStatusDropdown(null);
    setActiveChannelDropdown(null);
    setEditingCell(null);
    setActiveContactsOrder(null);
    setActivePaymentOrder(order);
  };

  const handleCopyContact = (text: string) => {
    if (!text) return;
    onCopyContact(text);
    setCopiedContact(text);
    setTimeout(() => setCopiedContact(null), 1500);
  };

  // Открыть кастомный календарь (для даты заказа или дедлайна)
  const handleOpenDatePicker = (
    order: Order,
    field: 'date' | 'deadline',
    e: React.MouseEvent<HTMLElement>
  ) => {
    e.stopPropagation();
    setContextMenu(null);
    setActiveStatusDropdown(null);
    setActiveChannelDropdown(null);
    setEditingCell(null);
    setActivePaymentOrder(null);
    setActiveContactsOrder(null);
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveDatePicker({
      orderId: order.id,
      field,
      targetRect: rect,
      value: field === 'date' ? (order.date || '') : (order.deadline || ''),
      status: order.status,
    });
  };

  // Инлайн-редактирование ячеек
  const [editingCell, setEditingCell] = useState<{ orderId: string; field: EditableField } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Начать редактирование ячейки
  const startEditing = (order: Order, field: EditableField, initialVal: string | number | undefined | null) => {
    setContextMenu(null);
    setActiveDatePicker(null);
    setActiveStatusDropdown(null);
    setActiveChannelDropdown(null);
    setActivePaymentOrder(null);
    setActiveContactsOrder(null);
    setEditingCell({ orderId: order.id, field });
    setEditValue(initialVal !== undefined && initialVal !== null ? String(initialVal) : '');
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 20);
  };

  // Сохранить изменения инлайн
  const commitEdit = (order: Order, field: EditableField, value: string) => {
    setEditingCell(null);
    const trimmed = value.trim();

    switch (field) {
      case 'amount': {
        const num = parseFloat(value.replace(/\s+/g, '').replace(',', '.')) || 0;
        const cleanAmount = Math.max(0, roundTo2(num));
        if (cleanAmount !== (order.amount || 0)) {
          if (order.type === 'expense') {
            onInlineUpdate(order.id, { amount: cleanAmount, payment: cleanAmount, payments: [cleanAmount] });
          } else {
            onInlineUpdate(order.id, { amount: cleanAmount });
          }
        }
        break;
      }
      case 'cost': {
        const num = parseFloat(value.replace(/\s+/g, '').replace(',', '.')) || 0;
        const cleanCost = Math.max(0, roundTo2(num));
        if (cleanCost !== (order.cost || 0)) {
          onInlineUpdate(order.id, { cost: cleanCost });
        }
        break;
      }
      case 'payment': {
        const num = parseFloat(value.replace(/\s+/g, '').replace(',', '.')) || 0;
        const cleanPayment = Math.max(0, roundTo2(num));
        if (cleanPayment !== (order.payment || 0)) {
          if (order.type === 'expense') {
            onInlineUpdate(order.id, { payment: cleanPayment, amount: cleanPayment, payments: [cleanPayment] });
          } else {
            onInlineUpdate(order.id, { payment: cleanPayment, payments: [cleanPayment] });
          }
        }
        break;
      }
      case 'quantity': {
        const num = parseInt(value.replace(/\s+/g, ''), 10) || 1;
        const cleanQty = Math.max(1, num);
        if (cleanQty !== (order.quantity || 1)) {
          onInlineUpdate(order.id, { quantity: cleanQty });
        }
        break;
      }
      case 'client_name': {
        if (trimmed !== (order.client_name || '')) {
          onInlineUpdate(order.id, { client_name: trimmed });
        }
        break;
      }
      case 'contact': {
        if (trimmed !== (order.contact || '')) {
          const existingContacts = order.contacts || [];
          const updatedContacts = existingContacts.length > 0
            ? existingContacts.map((c, i) => i === 0 ? { ...c, value: trimmed } : c)
            : [{ type: 'phone' as const, value: trimmed }];
          onInlineUpdate(order.id, { contact: trimmed, contacts: updatedContacts });
        }
        break;
      }
      case 'title': {
        if (trimmed && trimmed !== order.title) {
          onInlineUpdate(order.id, { title: trimmed });
        }
        break;
      }
      case 'notes': {
        if (value !== (order.notes || '')) {
          onInlineUpdate(order.id, { notes: value });
        }
        break;
      }
      case 'date': {
        if (trimmed && trimmed !== order.date) {
          onInlineUpdate(order.id, { date: trimmed });
        }
        break;
      }
      case 'deadline': {
        if (trimmed !== (order.deadline || '')) {
          onInlineUpdate(order.id, { deadline: trimmed });
        }
        break;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, order: Order, field: EditableField) => {
    if (e.key === 'Enter' && (!e.shiftKey || field !== 'notes')) {
      e.preventDefault();
      commitEdit(order, field, editValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
    }
  };

  // Sentinel для бесконечной подгрузки
  useEffect(() => {
    if (visibleCount >= orders.length) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, orders.length, onLoadMore]);

  // Закрытие контекстного меню при клике вне
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (contextMenuRef.current && !contextMenuRef.current.contains(target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, [setContextMenu, contextMenuRef]);

  const renderSortIndicator = (field: SortField) => {
    const isActive = sortField === field;
    return (
      <span className="inline-flex items-center justify-center w-3 h-3 shrink-0">
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="w-3 h-3 text-cyan-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-cyan-400" />
          )
        ) : (
          <ChevronDown className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 " />
        )}
      </span>
    );
  };

  const handleContextMenu = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDatePicker(null);
    setActiveStatusDropdown(null);
    setActiveChannelDropdown(null);
    setActivePaymentOrder(null);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      order,
    });
  };

  // Координаты контекстного меню с защитой от вылета за границы экрана
  const menuCoords = useMemo(() => {
    if (!contextMenu || typeof window === 'undefined') return null;
    const menuWidth = 220;
    const menuHeight = 220;
    let x = contextMenu.x;
    let y = contextMenu.y;

    if (x + menuWidth > window.innerWidth - 12) {
      x = Math.max(12, window.innerWidth - menuWidth - 12);
    }
    if (y + menuHeight > window.innerHeight - 12) {
      y = Math.max(12, window.innerHeight - menuHeight - 12);
    }

    return { x, y };
  }, [contextMenu]);

  // Поиск наименования связанного товара
  const getLinkedProductName = (productId?: string) => {
    if (!productId) return null;
    const found = savedCalculations.find(c => c.id === productId);
    return found ? found.name : null;
  };

  // Иконка для канала связи
  const getContactIcon = (type?: string) => {
    if (!type) return Phone;
    return CONTACT_TYPES_CONFIG[type as ContactType]?.icon || Phone;
  };

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden flex flex-col font-sans select-none bg-neutral-950/40">
      {/* МОБИЛЬНАЯ ВЕРСИЯ */}
      <div className="lg:hidden p-3 space-y-2">
        {visibleOrders.map((order, index) => {
          const status = getStatusBadgeV2(order.status || 'Не в работе');
          const payment = getPaymentBadgeInfo(order);
          const isElevated = elevatedOrder?.id === order.id;
          const isBlurred = Boolean(elevatedOrder) && !isElevated;

          return (
            <motion.article
              layout
              key={order.id}
              animate={{
                y: isElevated ? -12 : 0,
                scale: 1,
                filter: isBlurred ? 'blur(4px) opacity(0.35)' : 'blur(0px) opacity(1)',
              }}
              transition={{
                y: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                filter: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                layout: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
              }}
              onClick={() => setElevatedOrder(isElevated ? null : order)}
              className={`relative rounded-xl border p-3 cursor-pointer ${
                isElevated
                  ? '!z-50 !border-white/40 !bg-neutral-900/98 !shadow-[0_25px_60px_-10px_rgba(0,0,0,0.95)] ring-1 ring-white/20'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <button
                type="button"
                aria-label={`Открыть детали ${order.title || 'заказа'}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setElevatedOrder(isElevated ? null : order);
                }}
                className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              />
              <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] text-neutral-500">{formatOrderNumber(order, index)}</span>
                    {order.type === 'income' && (
                      <>
                        <span className="font-mono text-[10px] text-cyan-400 font-semibold truncate max-w-[150px]">
                          {order.client_name || 'Частный заказчик'}
                        </span>
                        <button
                          type="button"
                          title={order.contact ? 'Клик для изменения контактов' : 'Клик для добавления контакта'}
                          aria-label={`${order.contact ? 'Изменить контакты клиента' : 'Добавить контакт'} для ${order.title || 'заказа'}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenContactsModal(order);
                          }}
                          className="min-w-0 truncate text-left font-mono text-[10px] text-neutral-400 hover:text-white"
                        >
                          {order.contact || 'Добавить контакт'}
                        </button>
                      </>
                    )}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-white truncate max-w-[240px]">
                    {order.title || 'Без названия'}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-3 text-xs font-mono text-neutral-400">
                    {order.type !== 'expense' && (
                      <>
                        <span>{order.quantity || 1} шт</span>
                        <span>•</span>
                      </>
                    )}
                    <AnimatedPriceNumber
                      value={order.amount || 0}
                      currencySymbol="₽"
                      className="text-white font-semibold text-xs"
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {order.type !== 'expense' && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${status.badgeClass}`}>
                      {status.label}
                    </span>
                  )}
                  <div className="mt-1 text-[11px] font-mono text-neutral-400">
                    {order.date || '—'}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                    order.type === 'expense'
                      ? 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                      : payment.badgeClass
                  }`}>
                    {order.type === 'expense' ? (
                      <span className="inline-flex items-baseline gap-1">
                        <span>Списано</span>
                        <AnimatedPriceNumber
                          value={order.payment || 0}
                          currencySymbol="₽"
                          className="text-rose-400 font-bold"
                        />
                      </span>
                    ) : payment.label}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Редактировать ${order.title || 'заказ'}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenEditModal(order);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-neutral-300 hover:text-white"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
              </div>
            </motion.article>
          );
        })}
        {visibleOrders.length === 0 && (
          <div className="py-10 text-center font-mono text-xs text-neutral-500">Заказы не найдены</div>
        )}
        {visibleCount < totalOrdersCount && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={onLoadMore} className="rounded-lg border border-white/10 bg-white/5 py-2 font-mono text-[11px] text-neutral-300">
              Ещё
            </button>
            <button type="button" onClick={onShowAll} className="rounded-lg border border-white/10 bg-white/5 py-2 font-mono text-[11px] text-neutral-300">
              Показать все
            </button>
          </div>
        )}
      </div>

      {/* ОСНОВНОЕ ТЕЛО ТАБЛИЦЫ */}
      <div 
        onClick={() => {
          if (elevatedOrder) setElevatedOrder(null);
        }}
        className={`hidden lg:block overflow-x-auto w-full custom-scrollbar p-1.5 sm:p-2.5 relative ${elevatedOrder ? 'z-40 cursor-pointer' : 'z-10'}`}
      >
        {isExpanded ? (
          /* ========================================================================= */
          /* РАЗВЁРНУТЫЙ РЕЖИМ (15 ОТДЕЛЬНЫХ СТОЛБЦОВ С МАКСИМАЛЬНОЙ ДЕТАЛИЗАЦИЕЙ)       */
          /* ========================================================================= */
          <table className="w-full text-left text-xs border-collapse min-w-[1680px] block">
            <thead 
              className={`block w-full ${elevatedOrder ? 'pointer-events-none select-none' : ''}`}
              style={{ filter: elevatedOrder ? 'blur(4px) opacity(0.35)' : 'blur(0px) opacity(1)', transition: 'filter 0.4s ease, opacity 0.4s ease' }}
            >
              <tr 
                className="bg-neutral-900/95 border-b border-white/10 text-neutral-400 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider sticky top-0 z-20 grid items-center"
                style={{ gridTemplateColumns: EXPANDED_GRID_COLUMNS }}
              >
                {/* 1. № ЗАКАЗА */}
                <th 
                  onClick={() => onSort('order_number')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group w-32"
                >
                  <div className="flex items-center gap-1">
                    <span>№ ЗАКАЗА</span>
                    {renderSortIndicator('order_number')}
                  </div>
                </th>

                {/* 2. ДАТА */}
                <th 
                  onClick={() => onSort('date')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-center w-28"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ДАТА</span>
                    {renderSortIndicator('date')}
                  </div>
                </th>

                {/* 3. ТИП */}
                <th 
                  onClick={() => onSort('type')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-center w-24"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ТИП</span>
                    {renderSortIndicator('type')}
                  </div>
                </th>

                {/* 4. ИМЯ КЛИЕНТА */}
                <th 
                  onClick={() => onSort('client_name')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group w-44"
                >
                  <div className="flex items-center gap-1">
                    <span>ИМЯ КЛИЕНТА</span>
                    {renderSortIndicator('client_name')}
                  </div>
                </th>

                {/* 5. КОНТАКТЫ */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 w-44">
                  <span>КОНТАКТЫ</span>
                </th>

                {/* 6. ИЗДЕЛИЕ / ТОВАР */}
                <th 
                  onClick={() => onSort('title')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group w-56"
                >
                  <div className="flex items-center gap-1">
                    <span>ИЗДЕЛИЕ / ТОВАР</span>
                    {renderSortIndicator('title')}
                  </div>
                </th>

                {/* 7. ЗАМЕТКИ */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 w-48">
                  <span>ЗАМЕТКИ</span>
                </th>

                {/* 8. ИТОГО */}
                <th 
                  onClick={() => onSort('amount')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-right w-32"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ИТОГО</span>
                    {renderSortIndicator('amount')}
                  </div>
                </th>

                {/* 9. СЕБЕСТОИМОСТЬ */}
                <th 
                  onClick={() => onSort('cost')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>СЕБЕСТОИМОСТЬ</span>
                    {renderSortIndicator('cost')}
                  </div>
                </th>

                {/* 10. СТАТУС */}
                <th 
                  onClick={() => onSort('status')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group w-32"
                >
                  <div className="flex items-center gap-1">
                    <span>СТАТУС</span>
                    {renderSortIndicator('status')}
                  </div>
                </th>

                {/* 11. ДЕДЛАЙН */}
                <th 
                  onClick={() => onSort('deadline')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-left w-28"
                >
                  <div className="flex items-center justify-start gap-1">
                    <span>ДЕДЛАЙН</span>
                    {renderSortIndicator('deadline')}
                  </div>
                </th>

                {/* 12. ОПЛАЧЕНО */}
                <th 
                  onClick={() => onSort('payment')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-right w-32"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ОПЛАЧЕНО</span>
                    {renderSortIndicator('payment')}
                  </div>
                </th>

                {/* 13. ОСТАТОК (ДОЛГ) */}
                <th 
                  onClick={() => onSort('debt')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ОСТАТОК (ДОЛГ)</span>
                    {renderSortIndicator('debt')}
                  </div>
                </th>

                {/* 14. ЧИСТАЯ ПРИБЫЛЬ */}
                <th 
                  onClick={() => onSort('net_profit')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ПРИБЫЛЬ / МАРЖА</span>
                    {renderSortIndicator('net_profit')}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="block w-full divide-y divide-white/5 font-mono text-xs">
              {visibleOrders.length === 0 ? (
                <tr className="block w-full">
                  <td colSpan={14} className="block w-full py-12 text-center text-neutral-500 font-mono">
                    <div className="max-w-xs mx-auto space-y-1.5">
                      <Package className="w-6 h-6 mx-auto text-neutral-600 opacity-50" />
                      <p className="font-bold text-neutral-400 text-xs">Заказов не найдено</p>
                      <p className="text-[11px] text-neutral-600">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте новый заказ с помощью кнопки на панели'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleOrders.map((order, idx) => {
                  const statusInfo = getStatusBadgeV2(order.status || 'В РАБОТЕ');
                  const deadline = getDeadlineInfo(order.deadline, order.status);
                  const formattedNumber = formatOrderNumber(order, idx);
                  const isStatusMenuOpen = activeStatusDropdown?.order.id === order.id;
                  const isChannelMenuOpen = activeChannelDropdown?.order.id === order.id;
                  const linkedProduct = getLinkedProductName(order.product_id);

                  // Финансовые расчеты
                  const isIncome = order.type === 'income';
                  const isExpense = order.type === 'expense';
                  const netProfit = isIncome ? (order.amount || 0) - (order.cost || 0) : -(order.amount || 0);
                  const marginPercent = isIncome && (order.amount || 0) > 0 ? ((netProfit / order.amount) * 100) : 0;
                  const markupPercent = isIncome && (order.cost || 0) > 0 ? ((netProfit / order.cost) * 100) : 0;
                  const debtAmount = Math.max(0, (order.amount || 0) - (order.payment || 0));
                  const paidAmount = order.payment || 0;
                  const totalAmount = order.amount || 0;
                  const paidPercent = totalAmount > 0 ? Math.min(100, Math.max(0, (paidAmount / totalAmount) * 100)) : (paidAmount > 0 ? 100 : 0);
                  const quantity = order.quantity || 1;
                  const unitPrice = quantity > 0 ? (order.amount || 0) / quantity : (order.amount || 0);
                  const unitCost = quantity > 0 ? (order.cost || 0) / quantity : (order.cost || 0);
                  const unitProfit = quantity > 0 ? netProfit / quantity : netProfit;
                  const dayOfWeek = getDayOfWeek(order.date);

                  // Связанный расчёт калькулятора
                  const matchedCalc = savedCalculations?.find(
                    c => c.name === order.title
                  );

                  // Контакты
                  const allContacts = order.contacts && order.contacts.length > 0 
                    ? order.contacts 
                    : (order.contact ? [{ type: 'phone' as const, value: order.contact }] : []);

                  // Клиент инфо
                  const clientCfg = CLIENT_CONFIG[order.client] || CLIENT_CONFIG['Другое'];
                  const ClientIcon = clientCfg?.icon || Globe;

                  const isContextMenuActive = contextMenu?.order.id === order.id;
                  const isElevated = elevatedOrder?.id === order.id;
                  const isBlurred = Boolean(elevatedOrder) && !isElevated;

                  return (
                    <motion.tr
                      key={order.id}
                      animate={{
                        y: isElevated ? -10 : 0,
                        scale: 1,
                        filter: isBlurred ? 'blur(5px) opacity(0.35)' : 'blur(0px) opacity(1)',
                        backgroundColor: isElevated ? 'rgba(15, 15, 15, 0.98)' : 'rgba(0, 0, 0, 0)',
                        borderColor: isElevated ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: isElevated ? 14 : 0,
                        boxShadow: isElevated ? '0 25px 60px -10px rgba(0, 0, 0, 0.95)' : '0 0 0 0 rgba(0, 0, 0, 0)',
                      }}
                      whileHover={!isElevated && !isBlurred ? { backgroundColor: 'rgba(255, 255, 255, 0.04)' } : undefined}
                      transition={{
                        y: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                        filter: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                        backgroundColor: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                        borderColor: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                        borderRadius: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                        boxShadow: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                      }}
                      onContextMenu={(e) => !isBlurred && handleContextMenu(e, order)}
                      onClick={(e) => {
                        if (isElevated) {
                          e.stopPropagation();
                          lastElevatedCloseTimeRef.current = Date.now();
                          setElevatedOrder(null);
                        } else if (!elevatedOrder) {
                          if (Date.now() - lastElevatedCloseTimeRef.current < 450) return;
                          setElevatedOrder(order);
                        }
                      }}
                      className={` group relative border-b grid w-full items-center ${
                        isElevated 
                          ? '!z-50 ring-1 ring-white/20 cursor-default' 
                          : isBlurred
                          ? 'pointer-events-none select-none border-white/5'
                          : isContextMenuActive 
                          ? '!bg-neutral-800/90 text-white border-white/5 cursor-pointer' 
                          : 'border-white/5 cursor-pointer'
                      }`}
                      style={{ gridTemplateColumns: EXPANDED_GRID_COLUMNS }}
                    >
                      {/* 1. № ЗАКАЗА */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-neutral-300">
                        <div className="flex flex-col gap-1 leading-tight">
                          <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[11px] font-mono w-fit text-neutral-200 font-bold">
                            {formattedNumber}
                          </span>
                          {linkedProduct && (
                            <Tooltip content={`Товар каталога: ${linkedProduct}`}>
                              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-800/40 px-1 py-0.2 rounded w-fit truncate max-w-[110px] flex items-center gap-1">
                                <Package className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{linkedProduct}</span>
                              </span>
                            </Tooltip>
                          )}
                          {Boolean(order.urgency_percent || order.urgency_amount) && (
                            <span className="text-[8.5px] font-mono text-rose-400 bg-rose-950/50 border border-rose-800/40 px-1 py-0.2 rounded w-fit flex items-center gap-0.5 font-bold">
                              <Flame className="w-2.5 h-2.5 shrink-0" />
                              <span>СРОЧНО</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. ДАТА И ДЕНЬ НЕДЕЛИ (КАСТОМНЫЙ КАЛЕНДАРЬ, ПО ЦЕНТРУ) */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs text-center">
                        <button
                          type="button"
                          onClick={(e) => handleOpenDatePicker(order, 'date', e)}
                          className="inline-flex flex-col items-center justify-center gap-0.5 leading-tight cursor-pointer group/date p-1 -m-1 rounded-lg hover:bg-white/5 text-center mx-auto"
                          title="Клик для выбора даты заказа в календаре"
                        >
                          <span className="text-neutral-200 font-medium group-hover/date:text-neutral-400 ">
                            {order.date || '—'}
                          </span>
                          {dayOfWeek && (
                            <span className="text-[9px] font-mono text-neutral-500 font-semibold uppercase">
                              {dayOfWeek}
                            </span>
                          )}
                        </button>
                      </td>

                      {/* 3. ТИП И СТАТУС ОПЛАТЫ (ПЕРЕКЛЮЧЕНИЕ ТИПА В 1 КЛИК) */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleType(order);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer ${
                              isIncome 
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                            title="Клик для переключения Доход / Расход"
                          >
                            {isIncome ? 'Доход' : 'Расход'}
                          </button>
                          {isIncome && (
                            <span className={`text-[8.5px] font-mono font-semibold px-1 py-0.2 rounded border ${
                              paidPercent >= 100
                                ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30'
                                : paidPercent > 0
                                ? 'text-amber-400 bg-amber-950/40 border-amber-800/30'
                                : 'text-neutral-500 bg-white/5 border-white/10'
                            }`}>
                              {paidPercent >= 100 ? '100% Оплачен' : paidPercent > 0 ? `Аванс ${paidPercent.toFixed(0)}%` : 'Без оплаты'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. ИМЯ КЛИЕНТА И КАНАЛ (ИНЛАЙН-РЕДАКТИРОВАНИЕ) */}
                      <td 
                        onDoubleClick={(e) => {
                          if (isIncome && (!editingCell || editingCell.orderId !== order.id)) {
                            e.stopPropagation();
                            startEditing(order, 'client_name', order.client_name || '');
                          }
                        }}
                        className="py-2.5 px-3 whitespace-nowrap relative"
                      >
                        <div className="flex flex-col gap-1 leading-tight">
                          {editingCell?.orderId === order.id && editingCell?.field === 'client_name' ? (
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(order, 'client_name', editValue)}
                              onKeyDown={(e) => handleKeyDown(e, order, 'client_name')}
                              className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-neutral-400 font-semibold text-xs p-0 m-0 w-36 shadow-none"
                              placeholder="Имя клиента"
                              autoFocus
                            />
                          ) : isIncome ? (
                            <>
                              {Boolean(order.client_name?.trim()) && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(order, 'client_name', order.client_name || '');
                                  }}
                                  className="font-semibold text-xs truncate max-w-[140px] cursor-text block text-white hover:text-neutral-400"
                                  title={order.client_name}
                                >
                                  {order.client_name}
                                </span>
                              )}

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setActiveChannelDropdown(isChannelMenuOpen ? null : { order, targetRect: rect });
                                    setActiveStatusDropdown(null);
                                  }}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-mono border flex items-center gap-1 w-fit cursor-pointer hover:border-white/30 ${clientCfg?.badgeStyle || 'bg-white/5 border-white/10 text-neutral-300'}`}
                                  title="Клик для смены канала"
                                >
                                  <ClientIcon className="w-2.5 h-2.5 shrink-0" />
                                  <span>{order.client || 'Авито'}</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <span className="font-semibold text-neutral-300 text-xs truncate max-w-[140px] block">
                              {order.client || 'Расход'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. КОНТАКТЫ */}
                      <td className="py-2.5 px-3">
                        {!isIncome ? (
                          <span className="text-[11px] font-mono text-neutral-600 select-none">—</span>
                        ) : (
                          <div className="flex flex-col gap-1 max-w-[210px]">
                            {allContacts.length > 0 ? (
                              allContacts.map((c, cIdx) => {
                                const CIcon = getContactIcon(c.type);
                                const href = getContactHref(c.type, c.value);
                                const isCopied = copiedContact === c.value;

                                return (
                                  <div
                                    key={cIdx}
                                    className="flex items-center justify-between gap-1.5 text-[11px] font-mono group/c-row py-0.5"
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenContactsModal(order);
                                      }}
                                      className="flex items-center gap-1.5 text-neutral-300 hover:text-white truncate text-left cursor-pointer min-w-0 flex-1"
                                      title="Клик для управления контактами"
                                    >
                                      <CIcon className="w-3 h-3 text-neutral-400 shrink-0" />
                                      <span className="truncate">{c.value}</span>
                                    </button>

                                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover/c-row:opacity-100 ">
                                      {/* Скопировать */}
                                      <Tooltip content={isCopied ? 'Скопировано!' : 'Скопировать'}>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyContact(c.value);
                                          }}
                                          className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
                                        >
                                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                      </Tooltip>

                                      {/* Перейти по ссылке (если есть ссылка) */}
                                      {href && (
                                        <Tooltip content="Перейти по ссылке">
                                          <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-cyan-300 cursor-pointer"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenContactsModal(order);
                                }}
                                className="text-[11px] font-mono text-neutral-500 hover:text-neutral-300 italic flex items-center gap-1 cursor-pointer group/noc w-fit py-0.5"
                                title="Клик для добавления контактов"
                              >
                                <Plus className="w-3 h-3 text-neutral-600 group-hover/noc:text-neutral-400" />
                                <span>Нет контакта</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 6. ИЗДЕЛИЕ / ПАРАМЕТРЫ ПЕЧАТИ (ИНЛАЙН-РЕДАКТИРОВАНИЕ) */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1 max-w-[240px]">
                          <div className="flex items-center gap-1.5">
                            {editingCell?.orderId === order.id && editingCell?.field === 'title' ? (
                              <input
                                ref={inputRef as React.RefObject<HTMLInputElement>}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitEdit(order, 'title', editValue)}
                                onKeyDown={(e) => handleKeyDown(e, order, 'title')}
                                className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-neutral-400 font-semibold text-xs p-0 m-0 w-full shadow-none"
                                placeholder="Название изделия"
                              />
                            ) : (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(order, 'title', order.title);
                                }}
                                className="font-semibold text-neutral-100 hover:text-neutral-400 text-xs truncate cursor-text "
                                title={order.title || 'Печать 3D-детали'}
                              >
                                {order.title || 'Печать 3D-детали'}
                              </span>
                            )}

                            {isIncome && (
                              editingCell?.orderId === order.id && editingCell?.field === 'quantity' ? (
                                <input
                                  ref={inputRef as React.RefObject<HTMLInputElement>}
                                  type="number"
                                  min="1"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => commitEdit(order, 'quantity', editValue)}
                                  onKeyDown={(e) => handleKeyDown(e, order, 'quantity')}
                                  className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-neutral-400 font-mono text-xs p-0 m-0 w-12 text-center shadow-none"
                                />
                              ) : (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(order, 'quantity', order.quantity || 1);
                                  }}
                                  className="text-[10px] font-mono text-neutral-300 hover:text-neutral-400 shrink-0 font-bold cursor-pointer "
                                  title="Клик для изменения тиража"
                                >
                                  ×{quantity}
                                </span>
                              )
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-neutral-400">
                            {quantity > 1 && isIncome && (
                              <span className="text-neutral-300 font-semibold flex items-baseline gap-0.5">
                                <span>{formatMoney(unitPrice)}</span>
                                <span className="text-neutral-600 font-normal">₽</span>
                                <span>/шт</span>
                              </span>
                            )}
                            {matchedCalc && (
                              <span className="text-[9px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1 py-0.2 rounded truncate max-w-[120px]" title="Параметры из калькулятора">
                                {matchedCalc.filament_name || 'Калькулятор'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 7. ЗАМЕТКИ (ИНЛАЙН-РЕДАКТИРОВАНИЕ) */}
                      <td className="py-2.5 px-3 font-sans text-neutral-400">
                        {editingCell?.orderId === order.id && editingCell?.field === 'notes' ? (
                          <textarea
                            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(order, 'notes', editValue)}
                            onKeyDown={(e) => handleKeyDown(e, order, 'notes')}
                            rows={2}
                            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-neutral-400 font-sans text-xs p-0 m-0 w-full resize-none leading-snug shadow-none"
                            placeholder="Заметки к заказу..."
                          />
                        ) : (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(order, 'notes', order.notes || '');
                            }}
                            className="text-[11px] max-w-[220px] leading-snug text-neutral-200 hover:text-neutral-400 whitespace-pre-wrap cursor-text "
                            title="Клик для изменения заметок"
                          >
                            {order.notes || <span className="text-neutral-600 font-mono">—</span>}
                          </div>
                        )}
                      </td>

                      {/* 8. ИТОГО (ВЫРУЧКА - ИНЛАЙН-РЕДАКТИРОВАНИЕ) */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                        {editingCell?.orderId === order.id && editingCell?.field === 'amount' ? (
                          <div className="inline-flex items-baseline justify-end gap-0.5 font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(order, 'amount', editValue)}
                              onKeyDown={(e) => handleKeyDown(e, order, 'amount')}
                              className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-white font-mono font-bold text-xs text-right p-0 m-0 w-16 shadow-none"
                              placeholder="0"
                            />
                            <span className="text-neutral-500 font-normal ml-0.5 select-none text-xs">₽</span>
                          </div>
                        ) : (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(order, 'amount', order.amount || 0);
                            }}
                            className="flex flex-col items-end gap-0.5 leading-tight cursor-text group/amt"
                            title="Клик для изменения суммы заказа"
                          >
                            <div className="flex items-center gap-1.5 justify-end">
                              {Boolean((order.base_amount && order.base_amount !== order.amount) || order.discount_percent || order.urgency_percent) && order.base_amount && (
                                <AnimatedPriceNumber
                                  value={order.base_amount}
                                  currencySymbol="₽"
                                  className="text-[10px] text-neutral-500 line-through"
                                />
                              )}
                              <AnimatedPriceNumber
                                value={order.amount || 0}
                                currencySymbol="₽"
                                className="font-bold text-white group-hover/amt:text-neutral-400 text-xs "
                              />
                            </div>

                            {quantity > 1 && isIncome && (
                              <span className="text-[10px] text-neutral-400 flex items-baseline gap-0.5">
                                <AnimatedPriceNumber
                                  value={unitPrice}
                                  currencySymbol="₽"
                                  className="text-[10px] text-neutral-400"
                                />
                                <span>/шт</span>
                              </span>
                            )}

                            {/* Модификаторы */}
                            <div className="flex items-center gap-1 justify-end mt-0.5">
                              {Boolean(order.discount_percent || order.discount_amount) && (
                                <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded text-[9px] font-bold flex items-baseline gap-0.5">
                                  {order.discount_percent ? (
                                    <span>-{order.discount_percent}%</span>
                                  ) : (
                                    <>
                                      <span>-</span>
                                      <AnimatedPriceNumber
                                        value={order.discount_amount || 0}
                                        currencySymbol="₽"
                                        className="text-amber-400 text-[9px] font-bold"
                                      />
                                    </>
                                  )}
                                </span>
                              )}
                              {Boolean(order.urgency_percent || order.urgency_amount) && (
                                <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5" />
                                  {order.urgency_percent ? (
                                    <span>+{order.urgency_percent}%</span>
                                  ) : (
                                    <span className="flex items-baseline gap-0.5">
                                      <span>+</span>
                                      <AnimatedPriceNumber
                                        value={order.urgency_amount || 0}
                                        currencySymbol="₽"
                                        className="text-rose-400 text-[9px] font-bold"
                                      />
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 9. СЕБЕСТОИМОСТЬ (ИНЛАЙН-РЕДАКТИРОВАНИЕ) */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                        {editingCell?.orderId === order.id && editingCell?.field === 'cost' ? (
                          <div className="inline-flex items-baseline justify-end gap-0.5 font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(order, 'cost', editValue)}
                              onKeyDown={(e) => handleKeyDown(e, order, 'cost')}
                              className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-neutral-200 font-mono font-bold text-xs text-right p-0 m-0 w-16 shadow-none"
                              placeholder="0"
                            />
                            <span className="text-neutral-500 font-normal ml-0.5 select-none text-xs">₽</span>
                          </div>
                        ) : (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(order, 'cost', order.cost || 0);
                            }}
                            className="flex flex-col items-end gap-0.5 leading-tight cursor-text group/cost"
                            title="Клик для изменения себестоимости"
                          >
                            {order.cost ? (
                              <AnimatedPriceNumber
                                value={order.cost}
                                currencySymbol="₽"
                                className="font-bold text-neutral-200 group-hover/cost:text-neutral-400 text-xs "
                              />
                            ) : (
                              <span className="font-bold text-neutral-500 text-xs flex items-baseline gap-0.5">
                                0 <span className="text-neutral-600 font-normal">₽</span>
                              </span>
                            )}
                            {quantity > 1 && isIncome && order.cost ? (
                              <span className="text-[10px] text-neutral-400 flex items-baseline gap-0.5">
                                <AnimatedPriceNumber
                                  value={unitCost}
                                  currencySymbol="₽"
                                  className="text-[10px] text-neutral-400"
                                />
                                <span>/шт</span>
                              </span>
                            ) : null}

                            {/* Детализация статей затрат */}
                            {order.cost_items && order.cost_items.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1 mt-1 justify-end max-w-[160px]">
                                {order.cost_items.map((ci, ciIdx) => (
                                  <span key={ciIdx} className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-white/5 border border-white/10 text-neutral-300 flex items-baseline gap-0.5">
                                    <span>{ci.category}:</span>
                                    <AnimatedPriceNumber
                                      value={ci.amount}
                                      currencySymbol="₽"
                                      className="text-[8.5px] text-neutral-300"
                                    />
                                  </span>
                                ))}
                              </div>
                            ) : (order.cost && order.amount) ? (
                              <span className="text-[9px] text-neutral-500">
                                {((order.cost / order.amount) * 100).toFixed(0)}% от цены
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* 10. СТАТУС (ВЫБОР СТАТУСА) */}
                      <td 
                        className="py-2.5 px-3 whitespace-nowrap relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isExpense ? (
                          <span className="text-neutral-600 font-mono text-xs select-none pl-2">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveStatusDropdown(isStatusMenuOpen ? null : { order, targetRect: rect });
                              setActiveChannelDropdown(null);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border cursor-pointer shadow-sm ${statusInfo.badgeClass}`}
                            title="Клик для смены статуса"
                          >
                            {statusInfo.label}
                          </button>
                        )}
                      </td>

                      {/* 11. ДЕДЛАЙН (КАСТОМНЫЙ КАЛЕНДАРЬ, ПО ЛЕВОМУ КРАЮ) */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-neutral-300 text-left">
                        {isExpense ? (
                          <span className="text-neutral-600 font-mono text-xs select-none pl-1">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleOpenDatePicker(order, 'deadline', e)}
                            className="inline-flex flex-col items-start justify-center gap-0.5 font-mono leading-tight cursor-pointer group/dl rounded-lg p-1 -m-1 hover:bg-white/5 text-left"
                            title={
                              deadline
                                ? `Дедлайн: ${order.deadline || '—'} (${deadline.isOverdue ? `просрочен на ${Math.abs(deadline.daysDiff)} дн.` : deadline.daysDiff === 0 ? 'срок сдачи сегодня' : deadline.daysDiff === 1 ? 'срок сдачи завтра' : `осталось ${deadline.daysDiff} дн.`})`
                                : 'Клик для выбора дедлайна в календаре'
                            }
                          >
                            <span className="text-[11px] text-neutral-200 group-hover/dl:text-neutral-400 font-semibold ">
                              {order.deadline || '—'}
                            </span>
                            {deadline && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono leading-none border ${deadline.badgeStyle}`}>
                                {deadline.label}
                              </span>
                            )}
                          </button>
                        )}
                      </td>

                      {/* 12. ОПЛАЧЕНО (ОТКРЫТИЕ МОДАЛКИ ОПЛАТЫ И ЧАСТЕЙ / ИНЛАЙН ДЛЯ РАСХОДА) */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                        {editingCell?.orderId === order.id && editingCell?.field === 'payment' ? (
                          <div className="inline-flex items-center justify-end gap-1 font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type="text"
                              inputMode="decimal"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit(order, 'payment', editValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              onBlur={() => commitEdit(order, 'payment', editValue)}
                              className={`w-20 bg-neutral-900 border rounded px-1.5 py-0.5 text-right font-mono text-xs focus:outline-none ${
                                isExpense ? 'border-rose-500 text-rose-400' : 'border-emerald-500 text-emerald-400'
                              }`}
                            />
                            <span className="text-neutral-500 font-normal select-none text-xs">₽</span>
                          </div>
                        ) : isExpense ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(order, 'payment', order.payment ?? 0);
                            }}
                            className="flex flex-col items-end gap-0.5 leading-tight cursor-pointer group/pay p-1 -m-1 rounded-lg hover:bg-white/5 "
                            title="Клик для изменения суммы списания"
                          >
                            <AnimatedPriceNumber
                              value={paidAmount}
                              currencySymbol="₽"
                              className="text-rose-400 group-hover:text-rose-300 font-bold text-xs "
                            />
                            
                            {/* История транзакций платежей с датами */}
                            {order.payments && order.payments.length > 0 ? (
                              <div className="flex flex-col items-end gap-0.5 mt-0.5">
                                {order.payments.map((p, pIdx) => {
                                  const amt = typeof p === 'number' ? p : p.amount;
                                  const dt = typeof p !== 'number' && p.date ? p.date : '';
                                  return (
                                    <span key={pIdx} className="text-[8.5px] text-rose-400/70 font-mono">
                                      #{pIdx + 1}: {formatMoney(amt)} ₽{dt ? ` (${dt.length > 5 ? dt.slice(0, 5) : dt})` : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[9px] text-rose-400/60 font-mono">1 списание</span>
                            )}
                          </div>
                        ) : (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPaymentModal(order);
                            }}
                            className="flex flex-col items-end gap-0.5 leading-tight cursor-pointer group/pay p-1 -m-1 rounded-lg hover:bg-white/5 "
                            title="Клик для управления оплатой и частями"
                          >
                            <AnimatedPriceNumber
                              value={paidAmount}
                              currencySymbol="₽"
                              className="text-emerald-400 group-hover/pay:text-emerald-300 font-bold text-xs "
                            />
                            
                            {/* История транзакций платежей с датами */}
                            {order.payments && order.payments.length > 0 ? (
                              <div className="flex flex-col items-end gap-0.5 mt-0.5">
                                {order.payments.map((p, pIdx) => {
                                  const amt = typeof p === 'number' ? p : p.amount;
                                  const dt = typeof p !== 'number' && p.date ? p.date : '';
                                  return (
                                    <span key={pIdx} className="text-[8.5px] text-neutral-400 font-mono">
                                      #{pIdx + 1}: {formatMoney(amt)} ₽{dt ? ` (${dt.length > 5 ? dt.slice(0, 5) : dt})` : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[9px] text-neutral-500 font-mono">1 транзакция</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 13. ОСТАТОК (ДОЛГ) */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                        {isExpense ? (
                          debtAmount <= 0 ? (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(order, 'payment', order.payment ?? 0);
                              }}
                              className="text-neutral-500 hover:text-neutral-300 select-none cursor-pointer"
                              title="Клик для изменения списания"
                            >
                              —
                            </span>
                          ) : (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(order, 'payment', order.payment ?? 0);
                              }}
                              className="flex flex-col items-end gap-0.5 leading-tight cursor-pointer p-1 -m-1 rounded-lg hover:bg-white/5 "
                              title="Клик для изменения списания"
                            >
                              <AnimatedPriceNumber
                                value={debtAmount}
                                currencySymbol="₽"
                                className="text-rose-400 font-bold text-xs"
                              />
                              <Tooltip content={`Списано: ${paidPercent.toFixed(0)}% (${formatMoney(paidAmount)} из ${formatMoney(totalAmount)})`}>
                                <div className="flex items-center gap-1.5 w-[90px] mt-0.5">
                                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full rounded-full duration-300 bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)]"
                                      style={{ width: `${paidPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] font-mono text-rose-400/80 font-semibold shrink-0">
                                    {paidPercent.toFixed(0)}%
                                  </span>
                                </div>
                              </Tooltip>
                            </div>
                          )
                        ) : debtAmount <= 0 ? (
                          <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                            Оплачено 100%
                          </span>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <AnimatedPriceNumber
                              value={debtAmount}
                              currencySymbol="₽"
                              className="text-amber-400 font-bold text-xs"
                            />
                            <Tooltip content={`Оплачено: ${paidPercent.toFixed(0)}% (${formatMoney(paidAmount)} из ${formatMoney(totalAmount)})`}>
                              <div className="flex items-center gap-1.5 w-[90px] mt-0.5">
                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full duration-300 ${
                                      paidPercent >= 35
                                        ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]'
                                        : paidPercent > 0
                                          ? 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)]'
                                          : 'bg-transparent'
                                    }`}
                                    style={{ width: `${paidPercent}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-mono text-neutral-400 font-semibold shrink-0">
                                  {paidPercent.toFixed(0)}%
                                </span>
                              </div>
                            </Tooltip>
                          </div>
                        )}
                      </td>

                      {/* 14. ЧИСТАЯ ПРИБЫЛЬ И МАРЖА */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          <AnimatedPriceNumber
                            value={netProfit}
                            currencySymbol="₽"
                            showPositiveSign={netProfit > 0}
                            className={`font-bold text-xs ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                          />

                          {quantity > 1 && isIncome && (
                            <span className="text-[10px] text-emerald-400/80 flex items-baseline gap-0.5">
                              <span>+</span>
                              <AnimatedPriceNumber
                                value={unitProfit}
                                currencySymbol="₽"
                                className="text-[10px] text-emerald-400/80"
                              />
                              <span>/шт</span>
                            </span>
                          )}

                          {isIncome && (order.amount || 0) > 0 ? (
                            <div className="flex items-center gap-1 text-[10px] justify-end mt-0.5">
                              <div className={`tabular-nums flex items-center gap-0.5 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                <AnimatedPriceNumber
                                  value={marginPercent}
                                  currencySymbol="%"
                                  decimals={0}
                                  className={`font-medium text-[10px] ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                                  currencyClassName={`font-medium text-[10px] select-none ml-0.5 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                                />
                                <span className={netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>маржа</span>
                              </div>
                              {markupPercent > 0 && (
                                <span className="text-neutral-500">• {markupPercent.toFixed(0)}% нац.</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-600 font-mono">—</span>
                          )}
                        </div>
                      </td>

                    {/* Нижняя выезжающая панель: редактируемая информация о заказе */}
                    <AnimatePresence>
                      {isElevated && (
                        <td 
                          className="p-0 border-0 col-span-full w-full"
                          style={{ gridColumn: '1 / -1' }}
                        >
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              height: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                              opacity: { duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] },
                            }}
                            className="w-full overflow-hidden"
                          >
                            <OrderRowDrawer
                              order={order}
                              onInlineUpdate={onInlineUpdate}
                              onOpenEditModal={onOpenEditModal}
                              onOpenPaymentModal={handleOpenPaymentModal}
                              onOpenContactsModal={handleOpenContactsModal}
                              onClose={() => setElevatedOrder(null)}
                            />
                          </motion.div>
                        </td>
                      )}
                    </AnimatePresence>
                  </motion.tr>
                  );
                })
              )}

              {/* Sentinel для подгрузки */}
              {visibleCount < orders.length && (
                <tr ref={sentinelRef} className="block w-full">
                  <td colSpan={14} className="block w-full py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-neutral-400 font-mono animate-pulse">
                        Загрузка записей...
                      </span>
                      <button
                        type="button"
                        onClick={onShowAll}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 rounded-lg text-xs font-mono "
                      >
                        Показать все ({orders.length})
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* ========================================================================= */
          /* КОМПАКТНЫЙ РЕЖИМ (9 СДВОЕННЫХ СТОЛБЦОВ С ИНЛАЙН-РЕДАКТИРОВАНИЕМ)           */
          /* ========================================================================= */
          <table className="w-full text-left text-xs border-collapse min-w-[1050px] block">
            <thead 
              className={`block w-full ${elevatedOrder ? 'pointer-events-none select-none' : ''}`}
              style={{ filter: elevatedOrder ? 'blur(4px) opacity(0.35)' : 'blur(0px) opacity(1)', transition: 'filter 0.4s ease, opacity 0.4s ease' }}
            >
              <tr 
                className="bg-neutral-900/90 border-b border-white/10 text-neutral-400 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider grid items-center"
                style={{ gridTemplateColumns: COMPACT_GRID_COLUMNS }}
              >
                {/* 1. № ЗАКАЗА И ДАТА */}
                <th 
                  onClick={() => onSort('order_number')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group w-28"
                >
                  <div className="flex items-center gap-1">
                    <span>№ / ДАТА</span>
                    {renderSortIndicator('order_number')}
                  </div>
                </th>

                {/* 2. ТИП */}
                <th 
                  onClick={() => onSort('type')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-center w-20"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ТИП</span>
                    {renderSortIndicator('type')}
                  </div>
                </th>

                {/* 3. КЛИЕНТ / КАНАЛ */}
                <th 
                  onClick={() => onSort('client_name')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group w-44"
                >
                  <div className="flex items-center gap-1">
                    <span>КЛИЕНТ / КАНАЛ</span>
                    {renderSortIndicator('client_name')}
                  </div>
                </th>

                {/* 4. ИЗДЕЛИЕ / ЗАМЕТКИ */}
                <th 
                  onClick={() => onSort('title')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group w-56"
                >
                  <div className="flex items-center gap-1">
                    <span>ИЗДЕЛИЕ / ЗАМЕТКИ</span>
                    {renderSortIndicator('title')}
                  </div>
                </th>

                {/* 7. ИТОГО / СЕБЕСТОИМОСТЬ */}
                <th 
                  onClick={() => onSort('amount')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ИТОГО / СЕБЕСТ.</span>
                    {renderSortIndicator('amount')}
                  </div>
                </th>

                {/* 5. СТАТУС */}
                <th 
                  onClick={() => onSort('status')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group w-32"
                >
                  <div className="flex items-center gap-1">
                    <span>СТАТУС</span>
                    {renderSortIndicator('status')}
                  </div>
                </th>

                {/* 6. ДЕДЛАЙН */}
                <th 
                  onClick={() => onSort('deadline')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-left w-24"
                >
                  <div className="flex items-center justify-start gap-1">
                    <span>ДЕДЛАЙН</span>
                    {renderSortIndicator('deadline')}
                  </div>
                </th>

                {/* 8. ОПЛАТА / ОСТАТОК */}
                <th 
                  onClick={() => onSort('payment')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ОПЛАТА / ОСТАТОК</span>
                    {renderSortIndicator('payment')}
                  </div>
                </th>

                {/* 9. ЧИСТАЯ ПРИБЫЛЬ */}
                <th 
                  onClick={() => onSort('net_profit')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white group text-right w-28"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ПРИБЫЛЬ</span>
                    {renderSortIndicator('net_profit')}
                  </div>
                </th>
              </tr>
            </thead>

            {/* Строки заказов */}
            <tbody className="block w-full divide-y divide-white/5 font-mono text-xs">
              {visibleOrders.length === 0 ? (
                <tr className="block w-full">
                  <td colSpan={9} className="block w-full py-10 text-center text-neutral-500 font-mono">
                    <div className="max-w-xs mx-auto space-y-1.5">
                      <Package className="w-6 h-6 mx-auto text-neutral-600 opacity-50" />
                      <p className="font-bold text-neutral-400 text-xs">Заказов не найдено</p>
                      <p className="text-[11px] text-neutral-600">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте новый заказ с помощью кнопки выше'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleOrders.map((order, idx) => {
                  const statusInfo = getStatusBadgeV2(order.status || 'В РАБОТЕ');
                  const deadline = getDeadlineInfo(order.deadline, order.status);
                  const formattedNumber = formatOrderNumber(order, idx);
                  const isStatusMenuOpen = activeStatusDropdown?.order.id === order.id;
                  const isChannelMenuOpen = activeChannelDropdown?.order.id === order.id;

                  // Расчетные величины
                  const isIncome = order.type === 'income';
                  const isExpense = order.type === 'expense';
                  const netProfit = isIncome ? (order.amount || 0) - (order.cost || 0) : -(order.amount || 0);
                  const marginPercent = isIncome && (order.amount || 0) > 0 ? ((netProfit / order.amount) * 100) : 0;
                  const debtAmount = Math.max(0, (order.amount || 0) - (order.payment || 0));
                  const paidAmount = order.payment || 0;
                  const totalAmount = order.amount || 0;
                  const paidPercent = totalAmount > 0 ? Math.min(100, Math.max(0, (paidAmount / totalAmount) * 100)) : (paidAmount > 0 ? 100 : 0);

                  const clientCfg = CLIENT_CONFIG[order.client] || CLIENT_CONFIG['Другое'];
                  const ClientIcon = clientCfg?.icon || Globe;
                  const allContacts = order.contacts && order.contacts.length > 0 
                    ? order.contacts 
                    : (order.contact ? [{ type: 'phone' as const, value: order.contact }] : []);

                  const isContextMenuActive = contextMenu?.order.id === order.id;
                  const isElevated = elevatedOrder?.id === order.id;
                  const isBlurred = Boolean(elevatedOrder) && !isElevated;

                  return (
                    <motion.tr
                      key={order.id}
                      animate={{
                        y: isElevated ? -10 : 0,
                        scale: 1,
                        filter: isBlurred ? 'blur(5px) opacity(0.35)' : 'blur(0px) opacity(1)',
                        backgroundColor: isElevated ? 'rgba(15, 15, 15, 0.98)' : 'rgba(0, 0, 0, 0)',
                        borderColor: isElevated ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: isElevated ? 14 : 0,
                        boxShadow: isElevated ? '0 25px 60px -10px rgba(0, 0, 0, 0.95)' : '0 0 0 0 rgba(0, 0, 0, 0)',
                      }}
                      whileHover={!isElevated && !isBlurred ? { backgroundColor: 'rgba(255, 255, 255, 0.04)' } : undefined}
                      transition={{
                        y: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                        filter: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                        backgroundColor: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                        borderColor: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                        borderRadius: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                        boxShadow: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                      }}
                      onContextMenu={(e) => !isBlurred && handleContextMenu(e, order)}
                      onClick={(e) => {
                        if (isElevated) {
                          e.stopPropagation();
                          lastElevatedCloseTimeRef.current = Date.now();
                          setElevatedOrder(null);
                        } else if (!elevatedOrder) {
                          if (Date.now() - lastElevatedCloseTimeRef.current < 450) return;
                          setElevatedOrder(order);
                        }
                      }}
                      className={` group relative border-b grid w-full items-center ${
                        isElevated 
                          ? '!z-50 ring-1 ring-white/20 cursor-default' 
                          : isBlurred
                          ? 'pointer-events-none select-none border-white/5'
                          : isContextMenuActive 
                          ? '!bg-neutral-800/90 text-white border-white/5 cursor-pointer' 
                          : 'border-white/5 cursor-pointer'
                      }`}
                      style={{ gridTemplateColumns: COMPACT_GRID_COLUMNS }}
                    >
                      {/* 1. № ЗАКАЗА И ДАТА */}
                      <td className="py-2 px-3 whitespace-nowrap font-bold text-neutral-300">
                        <div className="flex flex-col items-center gap-1 leading-tight w-fit">
                          <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[11px] font-mono text-neutral-200 font-bold text-center w-full">
                            {formattedNumber}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleOpenDatePicker(order, 'date', e)}
                            className="text-[10.5px] text-neutral-400 hover:text-neutral-200 font-mono px-2 py-0.5 rounded hover:bg-white/5 cursor-pointer text-center w-full"
                            title="Клик для выбора даты заказа в календаре"
                          >
                            {order.date || '—'}
                          </button>
                        </div>
                      </td>

                      {/* 2. ТИП (ПЕРЕКЛЮЧЕНИЕ В 1 КЛИК) */}
                      <td className="py-2 px-3 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleType(order);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer ${
                            isIncome 
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                          }`}
                          title="Клик для переключения Доход / Расход"
                        >
                          {isIncome ? 'Доход' : 'Расход'}
                        </button>
                      </td>

                      {/* 3. КЛИЕНТ И КАНАЛ / КОНТАКТ (ИНЛАЙН-РЕДАКТИРОВАНИЕ) */}
                      <td 
                        onDoubleClick={(e) => {
                          if (isIncome && (!editingCell || editingCell.orderId !== order.id)) {
                            e.stopPropagation();
                            startEditing(order, 'client_name', order.client_name || '');
                          }
                        }}
                        className="py-2 px-3 font-sans font-medium text-white whitespace-nowrap relative"
                      >
                        <div className="flex flex-col gap-1 leading-tight">
                          {editingCell?.orderId === order.id && editingCell?.field === 'client_name' ? (
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(order, 'client_name', editValue)}
                              onKeyDown={(e) => handleKeyDown(e, order, 'client_name')}
                              className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-neutral-400 font-semibold text-xs p-0 m-0 w-36 shadow-none"
                              placeholder="Имя клиента"
                              autoFocus
                            />
                          ) : isIncome ? (
                            <>
                              {/* 1. СВЕРХУ: Имя клиента (если указано) */}
                              {Boolean(order.client_name?.trim()) && (
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(order, 'client_name', order.client_name || '');
                                  }}
                                  className="font-semibold text-xs truncate max-w-[160px] cursor-text block text-neutral-200 hover:text-white"
                                  title={order.client_name}
                                >
                                  {order.client_name}
                                </span>
                              )}

                              {/* 2. Источник заказа (посередине при наличии имени, или сверху если имени нет) */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setActiveChannelDropdown(isChannelMenuOpen ? null : { order, targetRect: rect });
                                    setActiveStatusDropdown(null);
                                  }}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-mono border flex items-center gap-1 w-fit cursor-pointer hover:border-white/30 ${clientCfg?.badgeStyle || 'bg-white/5 border-white/10 text-neutral-300'}`}
                                  title="Клик для смены канала"
                                >
                                  <ClientIcon className="w-2.5 h-2.5 shrink-0" />
                                  <span>{order.client || 'Авито'}</span>
                                </button>
                              </div>

                              {/* 3. СНИЗУ: Контакты */}
                              {allContacts.length > 0 ? (
                                <div className="flex items-center gap-1 text-[10px] font-mono group/c-row max-w-[160px]">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenContactsModal(order);
                                    }}
                                    className="flex items-center gap-1 text-neutral-400 hover:text-white truncate text-left cursor-pointer min-w-0"
                                    title="Клик для изменения контактов"
                                  >
                                    {(() => {
                                      const CIcon = getContactIcon(allContacts[0].type);
                                      return <CIcon className="w-2.5 h-2.5 text-neutral-500 shrink-0" />;
                                    })()}
                                    <span className="truncate">{allContacts[0].value}</span>
                                  </button>

                                  <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover/c-row:opacity-100 ">
                                    {/* Скопировать */}
                                    <Tooltip content={copiedContact === allContacts[0].value ? 'Скопировано!' : 'Скопировать'}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyContact(allContacts[0].value);
                                        }}
                                        className="p-0.5 rounded hover:bg-white/10 text-neutral-500 hover:text-white cursor-pointer"
                                      >
                                        {copiedContact === allContacts[0].value ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                      </button>
                                    </Tooltip>

                                    {/* Перейти по ссылке */}
                                    {getContactHref(allContacts[0].type, allContacts[0].value) && (
                                      <Tooltip content="Перейти по ссылке">
                                        <a
                                          href={getContactHref(allContacts[0].type, allContacts[0].value)!}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-0.5 rounded hover:bg-white/10 text-neutral-500 hover:text-cyan-300 cursor-pointer"
                                        >
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenContactsModal(order);
                                  }}
                                  className="text-[9.5px] font-mono text-neutral-500 hover:text-neutral-300 italic flex items-center gap-1 cursor-pointer group/noc"
                                  title="Клик для добавления контакта"
                                >
                                  <Plus className="w-2.5 h-2.5 text-neutral-600 group-hover/noc:text-neutral-400" />
                                  <span>Нет контакта</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="font-semibold text-neutral-300 text-xs truncate max-w-[160px] block">
                              {order.client || 'Расход'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. НАИМЕНОВАНИЕ, КОЛИЧЕСТВО И ЗАМЕТКИ (ИНЛАЙН-РЕДАКТИРОВАНИЕ) */}
                      <td className="py-2 px-3 font-sans text-neutral-200">
                        <div className="flex flex-col gap-0.5 max-w-[240px]">
                          <div className="flex items-center gap-1.5">
                            {editingCell?.orderId === order.id && editingCell?.field === 'title' ? (
                              <input
                                ref={inputRef as React.RefObject<HTMLInputElement>}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitEdit(order, 'title', editValue)}
                                onKeyDown={(e) => handleKeyDown(e, order, 'title')}
                                className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-neutral-400 font-medium text-xs p-0 m-0 w-full shadow-none"
                                placeholder="Название изделия"
                              />
                            ) : (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(order, 'title', order.title);
                                }}
                                className="font-medium text-neutral-200 hover:text-neutral-400 text-xs truncate cursor-text "
                                title="Клик для изменения наименования"
                              >
                                {order.title || 'Печать 3D-детали'}
                              </span>
                            )}

                            {isIncome && (
                              editingCell?.orderId === order.id && editingCell?.field === 'quantity' ? (
                                <input
                                  ref={inputRef as React.RefObject<HTMLInputElement>}
                                  type="number"
                                  min="1"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => commitEdit(order, 'quantity', editValue)}
                                  onKeyDown={(e) => handleKeyDown(e, order, 'quantity')}
                                  className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-neutral-400 font-mono text-xs p-0 m-0 w-12 text-center shadow-none"
                                />
                              ) : (
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(order, 'quantity', order.quantity || 1);
                                  }}
                                  className="text-[10px] font-mono text-neutral-300 hover:text-neutral-400 shrink-0 cursor-pointer "
                                  title="Клик для изменения тиража"
                                >
                                  ×{order.quantity || 1}
                                </span>
                              )
                            )}
                          </div>

                          {editingCell?.orderId === order.id && editingCell?.field === 'notes' ? (
                            <textarea
                              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(order, 'notes', editValue)}
                              onKeyDown={(e) => handleKeyDown(e, order, 'notes')}
                              rows={1}
                              className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-neutral-400 font-sans text-[10px] p-0 m-0 w-full resize-none leading-tight shadow-none"
                              placeholder="Заметки..."
                            />
                          ) : (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(order, 'notes', order.notes || '');
                              }}
                              className="text-[10px] text-neutral-400 hover:text-neutral-300 font-sans truncate block leading-tight cursor-text "
                              title="Клик для изменения заметок"
                            >
                              {order.notes || <span className="text-neutral-600 font-mono text-[9px]">+ заметка</span>}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. ИТОГО И СЕБЕСТОИМОСТЬ (ИНЛАЙН-РЕДАКТИРОВАНИЕ) */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          {editingCell?.orderId === order.id && editingCell?.field === 'amount' ? (
                            <div className="inline-flex items-baseline justify-end gap-0.5 font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                              <input
                                ref={inputRef as React.RefObject<HTMLInputElement>}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitEdit(order, 'amount', editValue)}
                                onKeyDown={(e) => handleKeyDown(e, order, 'amount')}
                                className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-white font-mono font-bold text-xs p-0 m-0 text-right w-16 shadow-none"
                                placeholder="0"
                              />
                              <span className="text-neutral-500 font-normal ml-0.5 select-none text-xs">₽</span>
                            </div>
                          ) : (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(order, 'amount', order.amount || 0);
                              }}
                              className="flex items-center gap-1.5 justify-end cursor-text group/c-amt"
                              title="Клик для изменения суммы заказа"
                            >
                              {Boolean((order.base_amount && order.base_amount !== order.amount) || order.discount_percent || order.urgency_percent) && order.base_amount && (
                                <AnimatedPriceNumber
                                  value={order.base_amount}
                                  currencySymbol="₽"
                                  className="text-[10px] text-neutral-500 line-through"
                                />
                              )}
                              <AnimatedPriceNumber
                                value={order.amount || 0}
                                currencySymbol="₽"
                                className="font-bold text-white group-hover/c-amt:text-neutral-400 text-xs "
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 justify-end">
                            {Boolean(order.discount_percent || order.discount_amount) && (
                              <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded text-[9px] font-bold flex items-baseline gap-0.5">
                                {order.discount_percent ? (
                                  <span>-{order.discount_percent}%</span>
                                ) : (
                                  <>
                                    <span>-</span>
                                    <AnimatedPriceNumber
                                      value={order.discount_amount || 0}
                                      currencySymbol="₽"
                                      className="text-amber-400 text-[9px] font-bold"
                                    />
                                  </>
                                )}
                              </span>
                            )}
                            {Boolean(order.urgency_percent || order.urgency_amount) && (
                              <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" />
                                {order.urgency_percent ? (
                                  <span>+{order.urgency_percent}%</span>
                                ) : (
                                  <span className="flex items-baseline gap-0.5">
                                    <span>+</span>
                                    <AnimatedPriceNumber
                                      value={order.urgency_amount || 0}
                                      currencySymbol="₽"
                                      className="text-rose-400 text-[9px] font-bold"
                                    />
                                  </span>
                                )}
                              </span>
                            )}

                            {editingCell?.orderId === order.id && editingCell?.field === 'cost' ? (
                              <div className="flex items-center gap-1 justify-end text-[10px] font-mono text-neutral-400" onClick={(e) => e.stopPropagation()}>
                                <span className="select-none pointer-events-none">себест.</span>
                                <input
                                  ref={inputRef as React.RefObject<HTMLInputElement>}
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => commitEdit(order, 'cost', editValue)}
                                  onKeyDown={(e) => handleKeyDown(e, order, 'cost')}
                                  className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-neutral-200 font-mono text-[10px] p-0 m-0 text-right w-12 shadow-none"
                                  placeholder="0"
                                />
                                <span className="text-neutral-500 font-normal select-none text-[10px]">₽</span>
                              </div>
                            ) : order.cost ? (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(order, 'cost', order.cost || 0);
                                }}
                                className="text-[10px] text-neutral-500 hover:text-neutral-300 font-mono cursor-text flex items-baseline gap-0.5"
                                title="Клик для изменения себестоимости"
                              >
                                <span>себест.</span>
                                <AnimatedPriceNumber
                                  value={order.cost}
                                  currencySymbol="₽"
                                  className="text-[10px] text-neutral-500"
                                />
                              </span>
                            ) : (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(order, 'cost', 0);
                                }}
                                className="text-[10px] text-neutral-500 hover:text-neutral-300 font-mono cursor-text "
                                title="Клик для изменения себестоимости"
                              >
                                — себест.
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 5. СТАТУС (ВЫБОР СТАТУСА) */}
                      <td 
                        className="py-2 px-3 whitespace-nowrap relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isExpense ? (
                          <span className="text-neutral-600 font-mono text-xs select-none pl-2">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveStatusDropdown(isStatusMenuOpen ? null : { order, targetRect: rect });
                              setActiveChannelDropdown(null);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer ${statusInfo.badgeClass}`}
                            title="Клик для смены статуса"
                          >
                            {statusInfo.label}
                          </button>
                        )}
                      </td>

                      {/* 6. ДЕДЛАЙН (КАСТОМНЫЙ КАЛЕНДАРЬ, ПО ЛЕВОМУ КРАЮ) */}
                      <td className="py-2 px-3 whitespace-nowrap text-neutral-300 text-left">
                        {isExpense ? (
                          <span className="text-neutral-600 font-mono text-xs select-none pl-1">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleOpenDatePicker(order, 'deadline', e)}
                            className="inline-flex flex-col items-start justify-center gap-0.5 font-mono leading-tight cursor-pointer group/c-dl rounded-lg p-1 -m-1 hover:bg-white/5 text-left"
                            title={
                              deadline
                                ? `Дедлайн: ${order.deadline || '—'} (${deadline.isOverdue ? `просрочен на ${Math.abs(deadline.daysDiff)} дн.` : deadline.daysDiff === 0 ? 'срок сдачи сегодня' : deadline.daysDiff === 1 ? 'срок сдачи завтра' : `осталось ${deadline.daysDiff} дн.`})`
                                : 'Клик для выбора дедлайна в календаре'
                            }
                          >
                            <span className="text-[11px] text-neutral-200 group-hover/c-dl:text-neutral-400 ">
                              {order.deadline || '—'}
                            </span>
                            {deadline && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono leading-none border ${deadline.badgeStyle}`}>
                                {deadline.label}
                              </span>
                            )}
                          </button>
                        )}
                      </td>

                      {/* 8. ОПЛАТА И ОСТАТОК (ОТКРЫТИЕ МОДАЛКИ ОПЛАТЫ И ЧАСТЕЙ / ИНЛАЙН ДЛЯ РАСХОДА) */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs w-36">
                        {editingCell?.orderId === order.id && editingCell?.field === 'payment' ? (
                          <div className="inline-flex items-center justify-end gap-1 font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type="text"
                              inputMode="decimal"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit(order, 'payment', editValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              onBlur={() => commitEdit(order, 'payment', editValue)}
                              className={`w-20 bg-neutral-900 border rounded px-1.5 py-0.5 text-right font-mono text-xs focus:outline-none ${
                                isExpense ? 'border-rose-500 text-rose-400' : 'border-emerald-500 text-emerald-400'
                              }`}
                            />
                            <span className="text-neutral-500 font-normal select-none text-xs">₽</span>
                          </div>
                        ) : isExpense ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(order, 'payment', order.payment ?? 0);
                            }}
                            className="flex flex-col items-end gap-0.5 leading-tight cursor-pointer group/c-pay p-1 -m-1 rounded-lg hover:bg-white/5 "
                            title="Клик для изменения суммы списания"
                          >
                            <AnimatedPriceNumber
                              value={paidAmount}
                              currencySymbol="₽"
                              className="text-rose-400 group-hover:text-rose-300 font-bold text-xs "
                            />
                            {debtAmount > 0 && (
                              <>
                                <span className="text-[10px] text-rose-400/80 font-mono flex items-baseline gap-0.5">
                                  <span>остаток</span>
                                  <AnimatedPriceNumber
                                    value={debtAmount}
                                    currencySymbol="₽"
                                    className="text-[10px] text-rose-400/80"
                                  />
                                </span>
                                <Tooltip content={`Списано: ${paidPercent.toFixed(0)}% (${formatMoney(paidAmount)} из ${formatMoney(totalAmount)})`}>
                                  <div className="flex items-center gap-1.5 w-[85px] mt-0.5">
                                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full duration-300 bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)]"
                                        style={{ width: `${paidPercent}%` }}
                                      />
                                    </div>
                                    <span className="text-[9px] font-mono text-rose-400 font-semibold shrink-0">
                                      {paidPercent.toFixed(0)}%
                                    </span>
                                  </div>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        ) : paidPercent >= 100 ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPaymentModal(order);
                            }}
                            className="flex items-center justify-end w-full cursor-pointer group/c-pay p-1 -m-1 rounded-lg hover:bg-white/5 "
                            title="Клик для управления оплатой"
                          >
                            <AnimatedPriceNumber
                              value={paidAmount}
                              currencySymbol="₽"
                              className="text-emerald-400 group-hover/c-pay:text-emerald-300 font-bold text-xs "
                            />
                          </div>
                        ) : (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPaymentModal(order);
                            }}
                            className="flex flex-col items-end gap-0.5 leading-tight cursor-pointer group/c-pay p-1 -m-1 rounded-lg hover:bg-white/5 "
                            title="Клик для управления оплатой и частями"
                          >
                            <AnimatedPriceNumber
                              value={paidAmount}
                              currencySymbol="₽"
                              className="text-emerald-400 group-hover/c-pay:text-emerald-300 font-bold text-xs "
                            />
                            <span className="text-[10px] text-neutral-400 font-mono flex items-baseline gap-0.5">
                              <span>долг.</span>
                              <AnimatedPriceNumber
                                value={debtAmount}
                                currencySymbol="₽"
                                className="text-[10px] text-neutral-400"
                              />
                            </span>
                            <Tooltip content={`Оплачено: ${paidPercent.toFixed(0)}% (${formatMoney(paidAmount)} из ${formatMoney(totalAmount)})`}>
                              <div className="flex items-center gap-1.5 w-[85px] mt-0.5">
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full duration-300 ${
                                      paidPercent >= 35
                                        ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]'
                                        : paidPercent > 0
                                          ? 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)]'
                                          : 'bg-transparent'
                                    }`}
                                    style={{ width: `${paidPercent}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-mono text-neutral-500 font-semibold shrink-0">
                                  {paidPercent.toFixed(0)}%
                                </span>
                              </div>
                            </Tooltip>
                          </div>
                        )}
                      </td>

                      {/* 9. ЧИСТАЯ ПРИБЫЛЬ */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs w-28">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          <AnimatedPriceNumber
                            value={netProfit}
                            currencySymbol="₽"
                            showPositiveSign={netProfit > 0}
                            className={`font-bold text-xs ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                          />
                          {isIncome && (order.amount || 0) > 0 ? (
                            <div className={`text-[10px] tabular-nums flex items-center justify-end gap-0.5 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              <AnimatedPriceNumber
                                value={marginPercent}
                                currencySymbol="%"
                                decimals={0}
                                className={`font-medium text-[10px] ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                                currencyClassName={`font-medium text-[10px] select-none ml-0.5 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                              />
                              <span className={netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>маржа</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-600 font-mono">—</span>
                          )}
                        </div>
                      </td>

                    {/* Нижняя выезжающая панель: редактируемая информация о заказе */}
                    <AnimatePresence>
                      {isElevated && (
                        <td 
                          className="p-0 border-0 col-span-full w-full"
                          style={{ gridColumn: '1 / -1' }}
                        >
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              height: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                              opacity: { duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] },
                            }}
                            className="w-full overflow-hidden"
                          >
                            <OrderRowDrawer
                              order={order}
                              onInlineUpdate={onInlineUpdate}
                              onOpenEditModal={onOpenEditModal}
                              onOpenPaymentModal={handleOpenPaymentModal}
                              onOpenContactsModal={handleOpenContactsModal}
                              onClose={() => setElevatedOrder(null)}
                            />
                          </motion.div>
                        </td>
                      )}
                    </AnimatePresence>
                  </motion.tr>
                  );
                })
              )}

              {/* Sentinel для подгрузки */}
              {visibleCount < orders.length && (
                <tr ref={sentinelRef} className="block w-full">
                  <td colSpan={9} className="block w-full py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-neutral-400 font-mono animate-pulse">
                        Загрузка записей...
                      </span>
                      <button
                        type="button"
                        onClick={onShowAll}
                        className="px-2.5 py-0.5 bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 rounded text-xs font-mono "
                      >
                        Показать все ({orders.length})
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* КОНТЕКСТНОЕ МЕНЮ (ПКМ) ЧЕРЕЗ PORTAL С ТОЧНЫМ ПОЗИЦИОНИРОВАНИЕМ */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {contextMenu && menuCoords && (
            <motion.div
              ref={contextMenuRef}
              initial={{ opacity: 0, scale: 0.98, y: -3 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -3 }}
              transition={{ duration: 0.12 }}
              style={{ top: menuCoords.y, left: menuCoords.x }}
              className="fixed z-[99999] w-56 rounded-xl bg-neutral-950 border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden flex flex-col font-mono select-none text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-neutral-500 border-b border-white/5 font-semibold bg-white/[0.02] truncate">
                {formatOrderNumber(contextMenu.order)} • {contextMenu.order.title || 'Заказ'}
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onOpenEditModal(contextMenu.order);
                    setContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate leading-none">Редактировать в форме</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDuplicateOrder(contextMenu.order);
                    setContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer text-xs"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate leading-none">Дублировать</span>
                </button>

                {(contextMenu.order.client_name || contextMenu.order.contact) && (
                  <button
                    type="button"
                    onClick={() => {
                      onCopyContact(contextMenu.order.client_name || contextMenu.order.contact);
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer text-xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate leading-none">Копировать имя / контакт</span>
                  </button>
                )}

                <div className="border-t border-white/5 my-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    onRequestDelete(contextMenu.order);
                    setContextMenu(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 cursor-pointer text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate leading-none">Удалить</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* КАСТОМНЫЙ ВЫПАДАЮЩИЙ КАЛЕНДАРЬ (ДАТА ИЛИ ДЕДЛАЙН) */}
      <TableDeadlinePicker
        isOpen={Boolean(activeDatePicker)}
        targetRect={activeDatePicker?.targetRect || null}
        value={activeDatePicker?.value || ''}
        title={activeDatePicker?.field === 'date' ? 'ДАТА ЗАКАЗА' : 'ДЕДЛАЙН ЗАКАЗА'}
        showDeadlineBadge={activeDatePicker?.field === 'deadline'}
        orderStatus={activeDatePicker?.status}
        onChange={(newVal) => {
          if (activeDatePicker) {
            if (activeDatePicker.field === 'date') {
              onInlineUpdate(activeDatePicker.orderId, { date: newVal });
            } else {
              onInlineUpdate(activeDatePicker.orderId, { deadline: newVal });
            }
          }
        }}
        onClose={() => setActiveDatePicker(null)}
      />

      {/* ПОРТАЛ ВЫБОРА СТАТУСА */}
      {activeStatusDropdown && (
        <TableStatusDropdownPortal
          order={activeStatusDropdown.order}
          targetRect={activeStatusDropdown.targetRect}
          onClose={() => setActiveStatusDropdown(null)}
          onUpdateStatus={onUpdateStatus}
        />
      )}

      {/* ПОРТАЛ ВЫБОРА КАНАЛА / КЛИЕНТА */}
      {activeChannelDropdown && (
        <TableChannelDropdownPortal
          order={activeChannelDropdown.order}
          targetRect={activeChannelDropdown.targetRect}
          onClose={() => setActiveChannelDropdown(null)}
          onInlineUpdate={onInlineUpdate}
        />
      )}

      {/* МОДАЛЬНОЕ ОКНО УПРАВЛЕНИЯ КОНТАКТАМИ ЗАКАЗА */}
      <OrderContactsModal
        order={activeContactsOrder}
        isOpen={Boolean(activeContactsOrder)}
        onClose={() => setActiveContactsOrder(null)}
        onSave={(orderId, contacts, primaryContact) => {
          onInlineUpdate(orderId, {
            contacts,
            contact: primaryContact,
          });
        }}
        onCopyContact={onCopyContact}
      />

      {/* МОДАЛЬНОЕ ОКНО УПРАВЛЕНИЯ ОПЛАТОЙ И ЧАСТЯМИ ПЛАТЕЖЕЙ */}
      <OrderPaymentModal
        order={activePaymentOrder}
        isOpen={Boolean(activePaymentOrder)}
        onClose={() => setActivePaymentOrder(null)}
        onSave={(orderId, totalPayment, payments) => {
          onInlineUpdate(orderId, {
            payment: totalPayment,
            payments,
          });
        }}
      />
    </div>
  );
});
