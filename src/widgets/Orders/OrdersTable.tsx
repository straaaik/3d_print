'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Order, OrderStatus, ContactItem, ContactType } from '../../shared/types';
import { getOrders, saveOrder, deleteOrder } from '../../shared/api/db';
import { 
  Plus, Search, Trash2, Edit2, ShoppingBag, ArrowUpRight, ArrowDownRight, 
  DollarSign, Wallet, ChevronUp, ChevronDown, RotateCcw, CreditCard,
  Phone, Send, MessageCircle, Share2, Camera, Mail, Globe, UserX, PhoneCall, ExternalLink, Copy, HelpCircle, CheckCircle2, Check, Info, NotebookPen,
  Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select, SelectOption } from '../../shared/ui/Select';
import { DatePicker } from '../../shared/ui/DatePicker';
import { CustomTooltip } from '../../shared/ui/Tooltip';
import { EmptyCellPlaceholder } from '../../shared/ui/EmptyCellPlaceholder';


type SortField = keyof Order | 'net_profit';
type SortOrder = 'asc' | 'desc';

export interface StatusBadgeConfig {
  value: OrderStatus;
  label: string;
  badgeStyle: string;
}

export const STATUS_CONFIG: Record<OrderStatus, StatusBadgeConfig> = {
  'Не в работе': {
    value: 'Не в работе',
    label: 'Не в работе',
    badgeStyle: 'bg-[#990000] text-white border border-red-700/60 shadow-sm shadow-red-950/40',
  },
  'Моделирование': {
    value: 'Моделирование',
    label: 'Моделирование',
    badgeStyle: 'bg-[#e69138] text-slate-950 border border-amber-600/60',
  },
  'Ждет печати': {
    value: 'Ждет печати',
    label: 'Ждет печати',
    badgeStyle: 'bg-[#c9daf8] text-[#1c4587] border border-blue-300/60',
  },
  'Печать': {
    value: 'Печать',
    label: 'Печать',
    badgeStyle: 'bg-[#1155cc] text-white border border-blue-600/60 shadow-sm shadow-blue-950/40',
  },
  'Ждет покраски': {
    value: 'Ждет покраски',
    label: 'Ждет покраски',
    badgeStyle: 'bg-[#fce5cd] text-[#783f04] border border-amber-200/60',
  },
  'Покраска': {
    value: 'Покраска',
    label: 'Покраска',
    badgeStyle: 'bg-[#783f04] text-white border border-amber-950/60',
  },
  'Ждет отправки': {
    value: 'Ждет отправки',
    label: 'Ждет отправки',
    badgeStyle: 'bg-[#e1d5e7] text-[#4c005c] border border-purple-300/60',
  },
  'Отправлен': {
    value: 'Отправлен',
    label: 'Отправлен',
    badgeStyle: 'bg-[#5e2b88] text-white border border-purple-700/60',
  },
  'Готово': {
    value: 'Готово',
    label: 'Готово',
    badgeStyle: 'bg-[#0b6a3f] text-white border border-emerald-600/60 shadow-sm shadow-emerald-950/40',
  },
};

export const ALL_STATUSES: OrderStatus[] = [
  'Не в работе',
  'Моделирование',
  'Ждет печати',
  'Печать',
  'Ждет покраски',
  'Покраска',
  'Ждет отправки',
  'Отправлен',
  'Готово',
];

export interface ClientBadgeConfig {
  value: string;
  label: string;
  badgeStyle: string;
}

export const CLIENT_CONFIG: Record<string, ClientBadgeConfig> = {
  'Авито': {
    value: 'Авито',
    label: 'Авито',
    badgeStyle: 'bg-[#3b2d18] text-[#ffe599] border border-[#783f04]/60 shadow-sm',
  },
  'Телеграмм': {
    value: 'Телеграмм',
    label: 'Телеграмм',
    badgeStyle: 'bg-[#0055b8] text-white border border-blue-600/60 shadow-sm',
  },
  'Ютуб': {
    value: 'Ютуб',
    label: 'Ютуб',
    badgeStyle: 'bg-[#cc0000] text-white border border-red-700/60 shadow-sm',
  },
  'Тикток': {
    value: 'Тикток',
    label: 'Тикток',
    badgeStyle: 'bg-[#512da8] text-white border border-purple-700/60 shadow-sm',
  },
  'Инстаграмм': {
    value: 'Инстаграмм',
    label: 'Инстаграмм',
    badgeStyle: 'bg-[#ffe599] text-[#783f04] border border-amber-300/60',
  },
  'Другое': {
    value: 'Другое',
    label: 'Другое',
    badgeStyle: 'bg-[#ead1dc] text-[#4c005c] border border-purple-300/60',
  },
};

export const ALL_CLIENTS = ['Авито', 'Телеграмм', 'Ютуб', 'Тикток', 'Инстаграмм', 'Другое'];

export const CONTACT_TYPES_CONFIG: Record<ContactType, { label: string; icon: any; placeholder: string; badgeStyle: string }> = {
  phone: {
    label: 'Телефон',
    icon: Phone,
    placeholder: '+7 900 000-00-00',
    badgeStyle: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
  },
  telegram: {
    label: 'Telegram',
    icon: Send,
    placeholder: '@username или t.me/...',
    badgeStyle: 'bg-sky-950/80 text-sky-300 border-sky-500/40',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    placeholder: '+7 900 000-00-00',
    badgeStyle: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
  },
  avito: {
    label: 'Авито профиль',
    icon: ShoppingBag,
    placeholder: 'Ссылка на профиль Авито',
    badgeStyle: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
  },
  vk: {
    label: 'ВКонтакте',
    icon: Share2,
    placeholder: 'vk.com/id...',
    badgeStyle: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
  },
  instagram: {
    label: 'Instagram',
    icon: Camera,
    placeholder: '@username или ссылка',
    badgeStyle: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
  },
  email: {
    label: 'Email',
    icon: Mail,
    placeholder: 'example@mail.ru',
    badgeStyle: 'bg-teal-950/80 text-teal-300 border-teal-500/40',
  },
  other: {
    label: 'Другой контакт / Ссылка',
    icon: Globe,
    placeholder: 'Любой контакт или комментарий',
    badgeStyle: 'bg-gray-800 text-gray-200 border-gray-700',
  },
};

// Функция для склонения слова "день"
export function formatPluralDays(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${abs} дней`;
  if (mod10 === 1) return `${abs} день`;
  if (mod10 >= 2 && mod10 <= 4) return `${abs} дня`;
  return `${abs} дней`;
}

// Функция для расчета остатка дней или просрочки
export function getDeadlineInfo(deadlineStr: string | undefined | null) {
  if (!deadlineStr || !deadlineStr.trim()) return null;

  const parts = deadlineStr.trim().split('.');
  if (parts.length < 2) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // в JS месяцы 0-11
  const year = parts.length >= 3 ? parseInt(parts[2], 10) : new Date().getFullYear();

  if (isNaN(day) || isNaN(month)) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const targetDate = new Date(year, month, day);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0) {
    return { 
      status: 'today', 
      label: 'Сегодня', 
      diffDays, 
      badgeStyle: 'bg-amber-950/80 text-amber-300 border-amber-500/50' 
    };
  } else if (diffDays > 0) {
    return { 
      status: 'future', 
      label: `${diffDays} дн.`, 
      diffDays, 
      badgeStyle: diffDays <= 3 
        ? 'bg-amber-950/70 text-amber-300 border-amber-500/40' 
        : 'bg-[#1a1d24] text-emerald-400 border border-emerald-500/30' 
    };
  } else {
    return { 
      status: 'overdue', 
      label: `! -${Math.abs(diffDays)} дн.`, 
      diffDays, 
      badgeStyle: 'bg-rose-950/90 text-rose-300 border-rose-500/60 font-bold shadow-sm shadow-rose-950/50' 
    };
  }
}

const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

function getOrderMonthKey(order: Order): string {
  let dateStr = order.date || order.created_at || '';
  let d: Date | null = null;

  if (dateStr) {
    if (dateStr.includes('-')) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) d = parsed;
    } else if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length >= 2) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
        d = new Date(year, month, day);
      }
    }
  }

  if ((!d || isNaN(d.getTime())) && order.created_at) {
    const parsed = new Date(order.created_at);
    if (!isNaN(parsed.getTime())) d = parsed;
  }

  if (!d || isNaN(d.getTime())) {
    d = new Date();
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthKeyLabel(key: string): string {
  if (key === 'all') return 'Все месяцы';
  const [yearStr, monthStr] = key.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10) - 1;
  if (isNaN(y) || isNaN(m) || m < 0 || m > 11) return key;
  return `${MONTH_NAMES_RU[m]} ${y}`;
}

function getCurrentRealMonthKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Выбранный месяц для переключателя раздельных таблиц по месяцам ('all' | 'YYYY-MM')
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(getCurrentRealMonthKey());

  // Уникальный список доступных месяцев из всех зарегистрированных заказов (плюс текущий)
  const availableMonthKeys = useMemo(() => {
    const set = new Set<string>();
    set.add(getCurrentRealMonthKey());
    orders.forEach(o => {
      const key = getOrderMonthKey(o);
      if (key) set.add(key);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const handlePrevMonth = () => {
    if (selectedMonthKey === 'all') {
      if (availableMonthKeys.length > 0) {
        setSelectedMonthKey(availableMonthKeys[availableMonthKeys.length - 1]);
      }
      return;
    }
    const idx = availableMonthKeys.indexOf(selectedMonthKey);
    if (idx > 0) {
      setSelectedMonthKey(availableMonthKeys[idx - 1]);
    } else {
      const [y, m] = selectedMonthKey.split('-').map(Number);
      const prevDate = new Date(y, m - 2, 1);
      const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonthKey(prevKey);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthKey === 'all') {
      if (availableMonthKeys.length > 0) {
        setSelectedMonthKey(availableMonthKeys[0]);
      }
      return;
    }
    const idx = availableMonthKeys.indexOf(selectedMonthKey);
    if (idx !== -1 && idx < availableMonthKeys.length - 1) {
      setSelectedMonthKey(availableMonthKeys[idx + 1]);
    } else {
      const [y, m] = selectedMonthKey.split('-').map(Number);
      const nextDate = new Date(y, m, 1);
      const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonthKey(nextKey);
    }
  };

  // Фильтрация заказов строго по выбранному месяцу
  const monthFilteredOrders = useMemo(() => {
    if (selectedMonthKey === 'all') return orders;
    return orders.filter(o => getOrderMonthKey(o) === selectedMonthKey);
  }, [orders, selectedMonthKey]);

  // Сортировка по умолчанию (по уникальному номеру заказа desc)
  const [sortField, setSortField] = useState<SortField>('order_number');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Инлайн редактирование по клику на ячейку
  const [inlineCell, setInlineCell] = useState<{ id: string; field: keyof Order } | null>(null);
  const [inlineValue, setInlineValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Окно управления транзакциями оплаты
  const [activePaymentsOrder, setActivePaymentsOrder] = useState<Order | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>('');

  // Окно управления множественными контактами
  const [activeContactsOrder, setActiveContactsOrder] = useState<Order | null>(null);
  const [newContactType, setNewContactType] = useState<ContactType>('phone');
  const [newContactValue, setNewContactValue] = useState<string>('');

  // Окно управления примечанием / заметками
  const [activeNotesOrder, setActiveNotesOrder] = useState<Order | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>('');

  // Кастомное контекстное меню по правой кнопке мыши
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; order: Order } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Стек истории изменений для отмены Alt+Z / Ctrl+Z
  const [historyStack, setHistoryStack] = useState<Order[][]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedItemValue, setCopiedItemValue] = useState<string | null>(null);

  const handleCopyText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedItemValue(text);
    setToastMessage(`Скопировано в буфер: ${text}`);
    setTimeout(() => {
      setCopiedItemValue(null);
      setToastMessage(null);
    }, 2200);
  };

  // Модальное окно для полного создания/редактирования
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<Order> | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (inlineCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inlineCell]);

  // Закрытие контекстного меню при клике вне его или скролле
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleClose = () => {
      setContextMenu(null);
    };

    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleClose);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleClose);
    };
  }, []);

  // Сохранение снимка в историю перед изменениями
  const pushToHistory = (currentOrders: Order[]) => {
    setHistoryStack(prev => [...prev.slice(-25), JSON.parse(JSON.stringify(currentOrders))]);
  };

  // Логика отмены (Undo)
  const handleUndo = async () => {
    if (historyStack.length === 0) {
      setToastMessage('Нет действий для отмены');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    const previousState = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, -1));
    setOrders(previousState);

    for (const order of previousState) {
      await saveOrder(order);
    }

    setToastMessage('Изменение отменено (Alt+Z)');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Глобальный обработчик горячих клавиш Alt+Z и Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.code === 'KeyZ') || ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey)) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text') {
          return;
        }
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStack, orders]);

  const loadOrders = async () => {
    setIsLoading(true);
    const data = await getOrders();
    setOrders(data);
    setIsLoading(false);
  };

  // Переключение сортировки по клику на заголовок
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Обработчик правой кнопки мыши по строке
  const handleRowContextMenu = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 230);
    const y = Math.min(e.clientY, window.innerHeight - 250);
    setContextMenu({ x, y, order });
  };

  // Дублирование заказа
  const handleDuplicateOrder = async (order: Order) => {
    pushToHistory(orders);
    const maxNum = orders.reduce((max, o) => Math.max(max, o.order_number || 0), 1000);
    const duplicatedOrder: Order = {
      ...order,
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      order_number: maxNum + 1,
      title: `${order.title} (копия)`,
      created_at: new Date().toISOString(),
    };
    const saved = await saveOrder(duplicatedOrder);
    setOrders(prev => [saved, ...prev]);
    setToastMessage(`Заказ #${saved.order_number} продублирован (Alt+Z для отмены)`);
    setTimeout(() => setToastMessage(null), 2500);
    setContextMenu(null);
  };

  // Начало инлайн редактирования текстовой/числовой ячейки
  const handleStartInlineEdit = (order: Order, field: keyof Order, currentValue: any) => {
    if (order.type === 'expense' && field !== 'title' && field !== 'amount' && field !== 'notes') {
      return;
    }
    setInlineCell({ id: order.id, field });
    setInlineValue(currentValue !== undefined && currentValue !== null ? String(currentValue) : '');
  };

  // Сохранение инлайн редактирования
  const handleSaveInlineEdit = async (order: Order) => {
    if (!inlineCell) return;
    const { field } = inlineCell;
    let newValue: any = inlineValue;

    if (['amount', 'cost', 'payment'].includes(field)) {
      newValue = Number(inlineValue) || 0;
    }

    const updatedOrder: Order = {
      ...order,
      [field]: newValue,
    };

    pushToHistory(orders);
    setOrders(prev => prev.map(o => (o.id === order.id ? updatedOrder : o)));
    setInlineCell(null);
    await saveOrder(updatedOrder);
  };

  // Добавление контакта к заказу
  const handleAddContactItem = async (order: Order, type: ContactType, val: string) => {
    if (!val || !val.trim()) return;
    pushToHistory(orders);

    const existingContacts: ContactItem[] = order.contacts && order.contacts.length > 0 
      ? order.contacts 
      : (order.contact ? [{ type: 'other', value: order.contact }] : []);

    const updatedContacts = [...existingContacts, { type, value: val.trim() }];
    const primaryContactStr = updatedContacts.map(c => c.value).join(', ');

    const updatedOrder: Order = {
      ...order,
      contacts: updatedContacts,
      contact: primaryContactStr,
    };

    setOrders(prev => prev.map(o => (o.id === order.id ? updatedOrder : o)));
    setActiveContactsOrder(updatedOrder);
    setNewContactValue('');
    await saveOrder(updatedOrder);
  };

  // Удаление контакта из заказа
  const handleDeleteContactItem = async (order: Order, indexToDelete: number) => {
    pushToHistory(orders);

    const existingContacts: ContactItem[] = order.contacts && order.contacts.length > 0 
      ? order.contacts 
      : (order.contact ? [{ type: 'other', value: order.contact }] : []);

    const updatedContacts = existingContacts.filter((_, idx) => idx !== indexToDelete);
    const primaryContactStr = updatedContacts.map(c => c.value).join(', ');

    const updatedOrder: Order = {
      ...order,
      contacts: updatedContacts,
      contact: primaryContactStr,
    };

    setOrders(prev => prev.map(o => (o.id === order.id ? updatedOrder : o)));
    setActiveContactsOrder(updatedOrder);
    await saveOrder(updatedOrder);
  };

  // Добавление новой транзакции оплаты
  const handleAddPaymentTransaction = async (order: Order, amountNum: number) => {
    if (!amountNum || amountNum <= 0) return;
    pushToHistory(orders);

    const existingPayments = order.payments && order.payments.length > 0 ? order.payments : (order.payment ? [order.payment] : []);
    const updatedPayments = [...existingPayments, amountNum];
    const newTotalPayment = updatedPayments.reduce((sum, p) => sum + p, 0);

    const updatedOrder: Order = {
      ...order,
      payments: updatedPayments,
      payment: newTotalPayment,
    };

    setOrders(prev => prev.map(o => (o.id === order.id ? updatedOrder : o)));
    setActivePaymentsOrder(updatedOrder);
    setNewPaymentAmount('');
    await saveOrder(updatedOrder);
  };

  // Удаление транзакции оплаты по индексу
  const handleDeletePaymentTransaction = async (order: Order, indexToDelete: number) => {
    pushToHistory(orders);

    const existingPayments = order.payments && order.payments.length > 0 ? order.payments : (order.payment ? [order.payment] : []);
    const updatedPayments = existingPayments.filter((_, idx) => idx !== indexToDelete);
    const newTotalPayment = updatedPayments.reduce((sum, p) => sum + p, 0);

    const updatedOrder: Order = {
      ...order,
      payments: updatedPayments,
      payment: newTotalPayment,
    };

    setOrders(prev => prev.map(o => (o.id === order.id ? updatedOrder : o)));
    setActivePaymentsOrder(updatedOrder);
    await saveOrder(updatedOrder);
  };

  // Открытие и сохранение примечания через Модальное окно
  const handleOpenNotesModal = (order: Order) => {
    setActiveNotesOrder(order);
    setNotesDraft(order.notes || '');
  };

  const handleSaveNotesModal = async () => {
    if (!activeNotesOrder) return;
    pushToHistory(orders);
    const updatedOrder: Order = {
      ...activeNotesOrder,
      notes: notesDraft.trim(),
    };
    setOrders(prev => prev.map(o => (o.id === activeNotesOrder.id ? updatedOrder : o)));
    setActiveNotesOrder(null);
    setToastMessage(`Примечание к заказу #${updatedOrder.order_number || ''} сохранено`);
    setTimeout(() => setToastMessage(null), 2500);
    await saveOrder(updatedOrder);
  };

  // Переключение типа операции по клику (Доход <-> Расход)
  const handleToggleType = async (order: Order) => {
    pushToHistory(orders);
    const newType = order.type === 'income' ? 'expense' : 'income';
    const updatedOrder: Order = { ...order, type: newType };
    setOrders(prev => prev.map(o => (o.id === order.id ? updatedOrder : o)));
    await saveOrder(updatedOrder);
  };

  // Изменение статуса через Select
  const handleSelectStatus = async (order: Order, newStatus: OrderStatus) => {
    pushToHistory(orders);
    const updatedOrder: Order = { ...order, status: newStatus };
    setOrders(prev => prev.map(o => (o.id === order.id ? updatedOrder : o)));
    await saveOrder(updatedOrder);
  };

  // Изменение клиента через Select
  const handleSelectClient = async (order: Order, newClient: string) => {
    pushToHistory(orders);
    const updatedOrder: Order = { ...order, client: newClient };
    setOrders(prev => prev.map(o => (o.id === order.id ? updatedOrder : o)));
    await saveOrder(updatedOrder);
  };

  // Изменение даты через DatePicker
  const handleSelectDate = async (order: Order, newDate: string) => {
    pushToHistory(orders);
    const updatedOrder: Order = { ...order, date: newDate };
    setOrders(prev => prev.map(o => (o.id === order.id ? updatedOrder : o)));
    await saveOrder(updatedOrder);
  };

  // Изменение срока через DatePicker
  const handleSelectDeadline = async (order: Order, newDeadline: string) => {
    pushToHistory(orders);
    const updatedOrder: Order = { ...order, deadline: newDeadline };
    setOrders(prev => prev.map(o => (o.id === order.id ? updatedOrder : o)));
    await saveOrder(updatedOrder);
  };

  const handleOpenAddModal = () => {
    let formattedDate = '';
    if (selectedMonthKey && selectedMonthKey !== 'all') {
      const [y, m] = selectedMonthKey.split('-').map(Number);
      const today = new Date();
      if (today.getFullYear() === y && today.getMonth() + 1 === m) {
        formattedDate = `${String(today.getDate()).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
      } else {
        formattedDate = `01.${String(m).padStart(2, '0')}.${y}`;
      }
    } else {
      const today = new Date();
      formattedDate = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}`;
    }

    setEditingOrder({
      date: formattedDate,
      type: 'income',
      title: '',
      amount: 0,
      cost: 0,
      payments: [0],
      payment: 0,
      client: 'Авито',
      contacts: [],
      contact: '',
      deadline: '',
      status: 'Готово',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (order: Order) => {
    setEditingOrder(order);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить эту запись?')) {
      pushToHistory(orders);
      await deleteOrder(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      setToastMessage('Запись удалена (нажмите Alt+Z для отмены)');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !editingOrder.title) return;

    pushToHistory(orders);
    const saved = await saveOrder(editingOrder as Order);
    setOrders(prev => {
      const exists = prev.some(o => o.id === saved.id);
      if (exists) {
        return prev.map(o => (o.id === saved.id ? saved : o));
      }
      return [saved, ...prev];
    });

    setIsModalOpen(false);
    setEditingOrder(null);
  };

  // Вычисляемые итоги (для выбранного месяца)
  const totalIncome = monthFilteredOrders.filter((o: Order) => o.type === 'income').reduce((acc: number, o: Order) => acc + (o.amount || 0), 0);
  const totalExpenses = monthFilteredOrders.filter((o: Order) => o.type === 'expense').reduce((acc: number, o: Order) => acc + (o.amount || 0), 0) +
                        monthFilteredOrders.filter((o: Order) => o.type === 'income').reduce((acc: number, o: Order) => acc + (o.cost || 0), 0);
  const netProfitTotal = monthFilteredOrders.reduce((acc: number, o: Order) => {
    if (o.type === 'income') {
      return acc + ((o.amount || 0) - (o.cost || 0));
    }
    return acc - (o.amount || 0);
  }, 0);

  const unpaidSum = monthFilteredOrders.filter((o: Order) => o.type === 'income').reduce((acc: number, o: Order) => {
    const totalPaid = o.payment || 0;
    const diff = (o.amount || 0) - totalPaid;
    return acc + (diff > 0 ? diff : 0);
  }, 0);

  // Фильтрация с поиском в том числе по № заказа (#1001)
  const filteredOrders = monthFilteredOrders.filter((o: Order) => {
    const matchesSearch = o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(o.order_number || '').includes(searchQuery.replace('#', ''));
    const matchesType = filterType === 'all' || o.type === filterType;
    return matchesSearch && matchesType;
  });

  // Сортировка
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortField === 'net_profit') {
      aValue = a.type === 'income' ? (a.amount || 0) - (a.cost || 0) : -(a.amount || 0);
      bValue = b.type === 'income' ? (b.amount || 0) - (b.cost || 0) : -(b.amount || 0);
    } else {
      aValue = a[sortField as keyof Order] ?? '';
      bValue = b[sortField as keyof Order] ?? '';
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }

    const strA = String(aValue).toLowerCase();
    const strB = String(bValue).toLowerCase();
    if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
    if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Опции для выпадающих списков Select
  const statusSelectOptions: SelectOption[] = ALL_STATUSES.map(st => ({
    value: st,
    label: st,
    badgeStyle: STATUS_CONFIG[st]?.badgeStyle,
  }));

  const clientSelectOptions: SelectOption[] = ALL_CLIENTS.map(cl => ({
    value: cl,
    label: cl,
    badgeStyle: CLIENT_CONFIG[cl]?.badgeStyle,
  }));

  const contactTypeSelectOptions: SelectOption[] = (Object.keys(CONTACT_TYPES_CONFIG) as ContactType[]).map(typeKey => ({
    value: typeKey,
    label: CONTACT_TYPES_CONFIG[typeKey].label,
  }));

  // Рендер иконки сортировки с зарезервированным местом
  const renderSortIndicator = (field: SortField) => {
    const isActive = sortField === field;
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 ml-0.5 shrink-0 align-middle">
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#FF8800]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#FF8800]" />
          )
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </span>
    );
  };

  // Функция для генерации ссылки на контакт (tel:, https://t.me/ и т.д.)
  const getContactHref = (type: ContactType, val: string) => {
    if (!val) return '#';
    const cleanVal = val.trim();
    if (type === 'phone' || type === 'whatsapp') {
      const nums = cleanVal.replace(/\D/g, '');
      return type === 'phone' ? `tel:+${nums}` : `https://wa.me/${nums}`;
    }
    if (type === 'telegram') {
      const username = cleanVal.replace('@', '');
      return cleanVal.startsWith('http') ? cleanVal : `https://t.me/${username}`;
    }
    if (type === 'email') {
      return `mailto:${cleanVal}`;
    }
    if (cleanVal.startsWith('http')) return cleanVal;
    return `https://${cleanVal}`;
  };

  return (
    <div className="space-y-5 select-none relative">
      {/* Шапка раздела с акцентным неоново-оранжевым стилем */}
      <div className="bg-[#16181d] border border-[#FF6B00]/20 rounded-2xl p-5 sm:p-6 shadow-xl relative z-10">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF8800] shadow-md shadow-[#FF6B00]/10">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Заказы и Финансы
              </h2>
              <p className="text-[#9ca3af] text-xs sm:text-sm">
                Уникальный номер заказа № • Кликните ПКМ по строке для меню действий • <kbd className="px-1.5 py-0.5 rounded bg-[#242930] text-gray-200 text-xs font-mono border border-gray-700">Alt+Z</kbd> для отмены
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Кнопка отмены последнего действия (Undo) */}
            <Button
              onClick={handleUndo}
              disabled={historyStack.length === 0}
              variant="outline"
              size="md"
              className="text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Отменить последнее изменение (Alt+Z)"
            >
              <RotateCcw className="w-4 h-4" />
              Отменить <span className="hidden sm:inline text-[11px] text-[#9ca3af]">(Alt+Z)</span>
            </Button>

            <Button
              onClick={handleOpenAddModal}
              variant="primary"
              size="md"
              className="bg-gradient-to-r from-[#FF5500] to-[#FF8800] hover:from-[#FF6600] hover:to-[#FF9900] text-white border-none shadow-lg shadow-[#FF6B00]/25 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Добавить запись
            </Button>
          </div>
        </div>

        {/* Переключатель таблиц по месяцам */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-[#242930]/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Стрелки переключения месяцев */}
            <div className="flex items-center gap-1 bg-[#0d0e12] border border-[#242930] p-1 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#242930] transition-colors cursor-pointer"
                title="Предыдущий месяц"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-3 py-1 bg-[#16181d] border border-[#FF6B00]/40 rounded-lg text-xs font-bold text-white shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-[#FF8800]" />
                <span>{selectedMonthKey === 'all' ? 'Все месяцы' : formatMonthKeyLabel(selectedMonthKey)}</span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#242930] transition-colors cursor-pointer"
                title="Следующий месяц"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Быстрые вкладки месяцев */}
            <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full sm:max-w-md scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedMonthKey('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                  selectedMonthKey === 'all'
                    ? 'bg-[#FF6B00]/20 text-[#FF8800] border-[#FF6B00]/50 font-bold'
                    : 'bg-[#0d0e12] text-gray-400 border-[#242930] hover:text-gray-200'
                }`}
              >
                Все время
              </button>
              {availableMonthKeys.map((mKey: string) => (
                <button
                  key={mKey}
                  type="button"
                  onClick={() => setSelectedMonthKey(mKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                    selectedMonthKey === mKey
                      ? 'bg-gradient-to-r from-[#FF5500] to-[#FF8800] text-white border-none shadow-md shadow-[#FF6B00]/20 font-bold'
                      : 'bg-[#0d0e12] text-gray-400 border-[#242930] hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  {formatMonthKeyLabel(mKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Быстрый переход на текущий календарный месяц */}
          {selectedMonthKey !== getCurrentRealMonthKey() && (
            <button
              type="button"
              onClick={() => setSelectedMonthKey(getCurrentRealMonthKey())}
              className="text-xs text-[#FF8800] hover:underline font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3 h-3" /> Текущий месяц ({formatMonthKeyLabel(getCurrentRealMonthKey())})
            </button>
          )}
        </div>

        {/* Сводные показатели с кастомными всплывающими подсказками только на знак вопроса */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#242930]/80">
          {/* Доходы */}
          <div className="bg-[#0d0e12] border border-[#242930] hover:border-emerald-500/40 rounded-xl p-3.5 transition-all group h-full">
            <div className="flex items-center justify-between text-[#9ca3af] group-hover:text-gray-200 text-xs sm:text-sm mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                Доходы
                <CustomTooltip
                  title="Доходы"
                  description="Общая валовая выручка от всех зарегистрированных доходных заказов."
                  formula="Сумма всех (Сумма заказа) по записям с типом «Доход»"
                  accentColor="emerald"
                  align="left"
                >
                  <span className="inline-flex items-center cursor-help">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-emerald-400 transition-all transform hover:scale-110" />
                  </span>
                </CustomTooltip>
              </span>
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-emerald-400">
              {totalIncome.toLocaleString()} ₽
            </div>
          </div>

          {/* Расходы */}
          <div className="bg-[#0d0e12] border border-[#242930] hover:border-rose-500/40 rounded-xl p-3.5 transition-all group h-full">
            <div className="flex items-center justify-between text-[#9ca3af] group-hover:text-gray-200 text-xs sm:text-sm mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                Расходы
                <CustomTooltip
                  title="Расходы"
                  description="Суммарные затраты на производство (сырье, пластик) и прямые расходные операции."
                  formula="Сумма (Расход произв. в доходах) + Сумма (Расходные операции)"
                  accentColor="rose"
                  align="center"
                >
                  <span className="inline-flex items-center cursor-help">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-rose-400 transition-all transform hover:scale-110" />
                  </span>
                </CustomTooltip>
              </span>
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-rose-400">
              {totalExpenses.toLocaleString()} ₽
            </div>
          </div>

          {/* Чистая прибыль */}
          <div className="bg-[#0d0e12] border border-[#242930] hover:border-[#FF6B00]/40 rounded-xl p-3.5 transition-all group h-full">
            <div className="flex items-center justify-between text-[#9ca3af] group-hover:text-gray-200 text-xs sm:text-sm mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                Чистая прибыль
                <CustomTooltip
                  title="Чистая прибыль"
                  description="Фактический чистый финансовый результат мастерской за весь период."
                  formula="Итого Доходы − Итого Расходы"
                  accentColor="orange"
                  align="center"
                >
                  <span className="inline-flex items-center cursor-help">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-[#FF8800] transition-all transform hover:scale-110" />
                  </span>
                </CustomTooltip>
              </span>
              <DollarSign className="w-4 h-4 text-[#FF8800]" />
            </div>
            <div className={`text-lg sm:text-xl font-bold ${netProfitTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netProfitTotal.toLocaleString()} ₽
            </div>
          </div>

          {/* Остаток к получению */}
          <div className="bg-[#0d0e12] border border-[#242930] hover:border-amber-500/40 rounded-xl p-3.5 transition-all group h-full">
            <div className="flex items-center justify-between text-[#9ca3af] group-hover:text-gray-200 text-xs sm:text-sm mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                Остаток к получению
                <CustomTooltip
                  title="Остаток к получению"
                  description="Суммарный неоплаченный долг со стороны клиентов (дебиторская задолженность)."
                  formula="Сумма (Сумма заказа − Оплачено) по незавершенным по оплате заказам"
                  accentColor="amber"
                  align="right"
                >
                  <span className="inline-flex items-center cursor-help">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-amber-400 transition-all transform hover:scale-110" />
                  </span>
                </CustomTooltip>
              </span>
              <Wallet className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-amber-400">
              {unpaidSum.toLocaleString()} ₽
            </div>
          </div>
        </div>
      </div>

      {/* Панель фильтров и поиска с использованием компонента Input */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#16181d] border border-[#242930] p-3 rounded-xl">
        <div className="relative flex-1">
          <Input
            placeholder="Быстрый поиск по № заказа, названию, клиенту или контакту..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 text-xs sm:text-sm focus:border-[#FF6B00]"
          />
          <Search className="w-4 h-4 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {(['all', 'income', 'expense'] as const).map(type => {
            const isActive = filterType === type;

            const getButtonStyle = () => {
              if (!isActive) {
                return 'bg-[#0d0e12] text-gray-400 border-[#242930] hover:text-white hover:border-gray-700';
              }
              if (type === 'income') {
                return 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-emerald-400/40 shadow-md shadow-emerald-950/50';
              }
              if (type === 'expense') {
                return 'bg-gradient-to-r from-rose-600 to-rose-500 text-white border-rose-400/40 shadow-md shadow-rose-950/50';
              }
              return 'bg-gradient-to-r from-[#FF5500] to-[#FF8800] text-white border-[#FF6B00]/40 shadow-md shadow-[#FF6B00]/25';
            };

            return (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${getButtonStyle()}`}
              >
                {type === 'all' ? 'Все' : type === 'income' ? 'Доходы' : 'Расходы'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Полноэкранная интерактивная таблица */}
      <div className="bg-[#16181d] border border-[#242930] rounded-2xl shadow-xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-[#0d0e12] border-b border-[#242930] text-[#9ca3af] uppercase tracking-wider font-bold text-xs sm:text-sm">
                <th onClick={() => handleSort('order_number')} className="py-3 px-2.5 text-center whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors min-w-[70px]">
                  № {renderSortIndicator('order_number')}
                </th>
                <th onClick={() => handleSort('date')} className="py-3 px-2.5 whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors">
                  Дата {renderSortIndicator('date')}
                </th>
                <th onClick={() => handleSort('type')} className="py-3 px-2.5 whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors">
                  Тип {renderSortIndicator('type')}
                </th>
                <th onClick={() => handleSort('title')} className="py-3 px-2.5 whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors min-w-[150px]">
                  Наименование {renderSortIndicator('title')}
                </th>
                <th onClick={() => handleSort('amount')} className="py-3 px-2.5 text-right whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors">
                  Сумма {renderSortIndicator('amount')}
                </th>
                <th onClick={() => handleSort('cost')} className="py-3 px-2.5 text-right whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors">
                  Расход {renderSortIndicator('cost')}
                </th>
                <th onClick={() => handleSort('payment')} className="py-3 px-2.5 text-right whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors">
                  Оплата {renderSortIndicator('payment')}
                </th>
                <th onClick={() => handleSort('client')} className="py-3 px-2.5 whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors">
                  Клиент {renderSortIndicator('client')}
                </th>
                <th onClick={() => handleSort('contact')} className="py-3 px-2.5 whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors">
                  Контакт {renderSortIndicator('contact')}
                </th>
                <th onClick={() => handleSort('deadline')} className="py-3 px-2.5 whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors">
                  Срок (ДО) {renderSortIndicator('deadline')}
                </th>
                <th onClick={() => handleSort('status')} className="py-3 px-2.5 whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors">
                  Статус {renderSortIndicator('status')}
                </th>
                <th onClick={() => handleSort('net_profit')} className="py-3 px-2.5 text-right whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors">
                  Чистая прибыль {renderSortIndicator('net_profit')}
                </th>
                <th onClick={() => handleSort('notes')} className="py-3 px-2.5 whitespace-nowrap select-none group cursor-pointer hover:text-white transition-colors">
                  Примечание {renderSortIndicator('notes')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242930]/60">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-10 text-[#6b7280]">
                    {isLoading ? 'Загрузка записей...' : 'Записи не найдены'}
                  </td>
                </tr>
              ) : (
                sortedOrders.map((row, idx) => {
                  const isIncome = row.type === 'income';
                  const totalPaid = row.payment || 0;
                  const isFullyPaid = isIncome && totalPaid >= (row.amount || 0);
                  const netProfit = isIncome ? (row.amount || 0) - (row.cost || 0) : -(row.amount || 0);

                  const isEditing = (field: keyof Order) => inlineCell?.id === row.id && inlineCell?.field === field;
                  const paymentsList = row.payments && row.payments.length > 0 ? row.payments : (row.payment ? [row.payment] : []);
                  
                  // Расчет контактов для вывода статуса (зеленый/красный)
                  const contactsList: ContactItem[] = row.contacts && row.contacts.length > 0
                    ? row.contacts
                    : (row.contact && row.contact.trim() !== '' ? [{ type: 'phone', value: row.contact }] : []);
                  const hasContact = contactsList.length > 0;

                  // Инфо по сроку
                  const deadlineInfo = getDeadlineInfo(row.deadline);
                  const isSelectedForMenu = contextMenu?.order.id === row.id;

                  return (
                    <tr 
                      key={row.id} 
                      onContextMenu={(e) => handleRowContextMenu(e, row)}
                      className={`transition-colors duration-150 cursor-context-menu border-b border-[#242930]/40 ${
                        isSelectedForMenu
                          ? 'bg-[#2a303d] shadow-sm'
                          : 'hover:bg-[#1a1e27]'
                      }`}
                      title="Нажмите правой кнопкой мыши для меню действий"
                    >
                      {/* Уникальный автоинкрементный номер заказа (#ord-1001) */}
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded font-mono text-xs font-bold text-[#FF8800] bg-[#FF6B00]/10 border border-[#FF6B00]/30 shadow-sm">
                          #ord-{row.order_number || row.id.slice(0, 4)}
                        </span>
                      </td>

                      {/* Дата */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap min-w-[110px]">
                        <DatePicker
                          value={row.date || ''}
                          onChange={(newDate) => handleSelectDate(row, newDate)}
                          format="DD.MM"
                        />
                      </td>

                      {/* Тип операции */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleType(row)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border cursor-pointer transition-transform active:scale-95 ${
                            isIncome
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80'
                              : 'bg-rose-950/70 text-rose-300 border-rose-500/40 hover:bg-rose-900/80'
                          }`}
                          title="Кликните для переключения (Доход / Расход)"
                        >
                          {isIncome ? 'Доход' : 'Расход'}
                        </button>
                      </td>

                      {/* Наименование */}
                      <td 
                        onClick={() => handleStartInlineEdit(row, 'title', row.title)} 
                        className="py-2.5 px-2.5 font-semibold text-white max-w-[180px] xl:max-w-[280px] truncate cursor-pointer hover:text-[#FF8800] transition-colors"
                        title="Кликните для редактирования"
                      >
                        {isEditing('title') ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={inlineValue}
                            onChange={e => setInlineValue(e.target.value)}
                            onBlur={() => handleSaveInlineEdit(row)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveInlineEdit(row)}
                            className="w-full bg-[#0d0e12] border border-[#FF6B00] rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                          />
                        ) : (
                          row.title
                        )}
                      </td>

                      {/* Сумма */}
                      <td 
                        onClick={() => handleStartInlineEdit(row, 'amount', row.amount)} 
                        className="py-2.5 px-2.5 text-right font-mono font-bold text-gray-100 whitespace-nowrap cursor-pointer hover:text-[#FF8800] transition-colors"
                        title="Кликните для редактирования"
                      >
                        {isEditing('amount') ? (
                          <input
                            ref={inputRef}
                            type="number"
                            value={inlineValue}
                            onChange={e => setInlineValue(e.target.value)}
                            onBlur={() => handleSaveInlineEdit(row)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveInlineEdit(row)}
                            className="w-20 bg-[#0d0e12] border border-[#FF6B00] rounded px-1.5 py-0.5 text-xs text-right text-white focus:outline-none"
                          />
                        ) : (
                          row.amount ? `${row.amount.toLocaleString()}` : '0'
                        )}
                      </td>

                      {/* Расход на производство (только для Дохода) */}
                      <td 
                        onClick={() => isIncome && handleStartInlineEdit(row, 'cost', row.cost)} 
                        className={`py-2.5 px-2.5 text-right font-mono whitespace-nowrap ${
                          isIncome ? 'text-gray-300 cursor-pointer hover:text-[#FF8800] transition-colors' : ''
                        }`}
                        title={isIncome ? "Кликните для редактирования" : "Неприменимо для Расхода"}
                      >
                        {isIncome ? (
                          isEditing('cost') ? (
                            <input
                              ref={inputRef}
                              type="number"
                              value={inlineValue}
                              onChange={e => setInlineValue(e.target.value)}
                              onBlur={() => handleSaveInlineEdit(row)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveInlineEdit(row)}
                              className="w-16 bg-[#0d0e12] border border-[#FF6B00] rounded px-1.5 py-0.5 text-xs text-right text-white focus:outline-none"
                            />
                          ) : (
                            row.cost ? `${row.cost.toLocaleString()}` : '0'
                          )
                        ) : (
                          <EmptyCellPlaceholder align="right" />
                        )}
                      </td>

                      {/* Оплата с поддержкой нескольких транзакций (только для Дохода) */}
                      <td className="py-2.5 px-2.5 text-right font-mono text-gray-300 whitespace-nowrap">
                        {isIncome ? (
                          <button
                            type="button"
                            onClick={() => setActivePaymentsOrder(row)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-xs font-bold cursor-pointer ${
                              isFullyPaid
                                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                                : 'bg-[#0d0e12] text-gray-200 border-[#242930] hover:border-[#FF6B00]/50'
                            }`}
                            title="Кликните для управления транзакциями оплаты"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-[#FF8800]" />
                            <span>{(row.payment || 0).toLocaleString()} ₽</span>
                            {paymentsList.length > 1 && (
                              <span className="px-1.5 py-0.2 bg-[#FF6B00]/20 text-[#FF8800] text-[10px] rounded-full">
                                {paymentsList.length}
                              </span>
                            )}
                          </button>
                        ) : (
                          <EmptyCellPlaceholder align="right" />
                        )}
                      </td>

                      {/* Клиент (только для Дохода) */}
                      <td className="py-2.5 px-2.5 text-left whitespace-nowrap min-w-[130px]">
                        {isIncome ? (
                          <Select
                            options={clientSelectOptions}
                            value={row.client || 'Авито'}
                            onChange={newVal => handleSelectClient(row, newVal)}
                            className="w-auto"
                            buttonClassName="bg-transparent border-none p-0 hover:bg-transparent"
                          />
                        ) : (
                          <EmptyCellPlaceholder align="left" />
                        )}
                      </td>

                      {/* Контакт (только для Дохода) */}
                      <td className="py-2.5 px-2.5 text-left whitespace-nowrap">
                        {isIncome ? (
                          <button
                            type="button"
                            onClick={() => setActiveContactsOrder(row)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-sm active:scale-95 ${
                              hasContact
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/90 shadow-emerald-950/40'
                                : 'bg-rose-950/80 text-rose-300 border-rose-500/50 hover:bg-rose-900/90 shadow-rose-950/40'
                            }`}
                            title="Кликните для управления контактами клиента"
                          >
                            {hasContact ? (
                              <>
                                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="max-w-[120px] truncate">{contactsList[0].value}</span>
                                {contactsList.length > 1 && (
                                  <span className="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-200 text-[10px] rounded-full">
                                    +{contactsList.length - 1}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5 text-rose-400" />
                                <span>Нет контакта</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <EmptyCellPlaceholder align="left" />
                        )}
                      </td>

                      {/* Срок (только для Дохода) */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        {isIncome ? (
                          <div className="flex flex-col items-center justify-center gap-1 w-full min-w-[85px]">
                            <DatePicker
                              value={row.deadline || ''}
                              onChange={(newDate) => handleSelectDeadline(row, newDate)}
                              placeholder="—"
                              format="DD.MM"
                            />
                            {deadlineInfo && (
                              <span
                                className={`w-full text-center px-1 py-0.5 rounded text-[10px] font-semibold border ${deadlineInfo.badgeStyle}`}
                                title={`Статус срока: ${deadlineInfo.label}`}
                              >
                                {deadlineInfo.label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <EmptyCellPlaceholder align="center" />
                        )}
                      </td>

                      {/* Статус (только для Дохода) */}
                      <td className="py-2.5 px-2.5 text-left whitespace-nowrap min-w-[140px]">
                        {isIncome ? (
                          <Select
                            options={statusSelectOptions}
                            value={row.status || 'Готово'}
                            onChange={newVal => handleSelectStatus(row, newVal as OrderStatus)}
                            className="w-auto"
                            buttonClassName="bg-transparent border-none p-0 hover:bg-transparent"
                            dropdownPosition={idx >= sortedOrders.length - 2 ? 'top' : 'auto'}
                          />
                        ) : (
                          <EmptyCellPlaceholder align="left" />
                        )}
                      </td>

                      {/* Чистая прибыль */}
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-md font-mono font-bold text-white text-xs sm:text-sm shadow-md tracking-tight ${
                          netProfit >= 0 ? 'bg-emerald-600 shadow-emerald-950/50' : 'bg-rose-600 shadow-rose-950/50'
                        }`}>
                          {netProfit > 0 ? `+${netProfit.toLocaleString()}` : netProfit.toLocaleString()} ₽
                        </span>
                      </td>

                      {/* Примечание (с вызовом модального окна) */}
                      <td className="py-2.5 px-2.5 text-left whitespace-nowrap max-w-[200px]">
                        <button
                          type="button"
                          onClick={() => handleOpenNotesModal(row)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer max-w-full truncate border ${
                            row.notes && row.notes.trim() !== ''
                              ? 'bg-[#1a1d24] text-gray-200 border-[#242930] hover:border-[#FF6B00]/60 hover:text-white shadow-sm'
                              : 'bg-transparent text-gray-500/60 border-transparent hover:text-gray-300'
                          }`}
                          title="Кликните для просмотра и редактирования примечания"
                        >
                          <NotebookPen className={`w-3.5 h-3.5 shrink-0 ${row.notes && row.notes.trim() !== '' ? 'text-[#FF8800]' : 'text-gray-500/50'}`} />
                          <span className="truncate">
                            {row.notes && row.notes.trim() !== '' ? row.notes : '—'}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Кастомное контекстное меню по правой кнопке мыши */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className="fixed z-50 bg-[#16181d] border border-[#FF6B00]/40 rounded-xl shadow-2xl p-1.5 min-w-[220px] select-none backdrop-blur-xl text-xs sm:text-sm"
          >
            <div className="px-3 py-1.5 text-[11px] font-bold text-[#FF8800] border-b border-[#242930] truncate flex items-center justify-between gap-2">
              <span className="truncate">{contextMenu.order.title}</span>
              <span className="text-[10px] text-[#FF8800] bg-[#FF6B00]/20 px-1.5 py-0.2 rounded font-mono">
                #ord-{contextMenu.order.order_number || contextMenu.order.id.slice(0, 4)}
              </span>
            </div>

            <div className="py-1 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  handleOpenEditModal(contextMenu.order);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-lg transition-colors cursor-pointer text-left font-medium"
              >
                <Edit2 className="w-4 h-4 text-[#FF8800]" />
                <span>Редактировать...</span>
              </button>

              <button
                type="button"
                onClick={() => handleDuplicateOrder(contextMenu.order)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-lg transition-colors cursor-pointer text-left font-medium"
              >
                <Copy className="w-4 h-4 text-blue-400" />
                <span>Дублировать запись</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivePaymentsOrder(contextMenu.order);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-lg transition-colors cursor-pointer text-left font-medium"
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Управление оплатой...</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveContactsOrder(contextMenu.order);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-lg transition-colors cursor-pointer text-left font-medium"
              >
                <PhoneCall className="w-4 h-4 text-amber-400" />
                <span>Управление контактами...</span>
              </button>

              {(() => {
                const firstContact = contextMenu.order.contacts?.[0]?.value || contextMenu.order.contact;
                if (!firstContact) return null;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyText(firstContact);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-lg transition-colors cursor-pointer text-left font-medium"
                  >
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    <span>Скопировать контакт</span>
                  </button>
                );
              })()}

              <div className="my-1 border-t border-[#242930]" />

              <button
                type="button"
                onClick={() => {
                  handleDelete(contextMenu.order.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-300 hover:text-rose-200 hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer text-left font-semibold"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Удалить запись</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно управления множественными контактами */}
      <Modal
        isOpen={!!activeContactsOrder}
        onClose={() => setActiveContactsOrder(null)}
        title="Управление контактами клиента"
        maxWidth="sm"
      >
        {activeContactsOrder && (() => {
          const contactsList: ContactItem[] = activeContactsOrder.contacts && activeContactsOrder.contacts.length > 0
            ? activeContactsOrder.contacts
            : (activeContactsOrder.contact && activeContactsOrder.contact.trim() !== '' ? [{ type: 'phone', value: activeContactsOrder.contact }] : []);

          return (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="bg-[#0d0e12] border border-[#242930] rounded-xl p-3.5">
                <div className="text-gray-400 text-xs">Клиент / Заказ</div>
                <div className="text-white font-bold text-sm truncate">
                  #{activeContactsOrder.order_number} {activeContactsOrder.title}
                </div>
                <div className="text-[#FF8800] text-xs font-semibold mt-0.5">
                  Канал: {activeContactsOrder.client}
                </div>
              </div>

              {/* Список добавленных контактов */}
              <div className="space-y-2">
                <div className="text-gray-300 text-xs font-semibold uppercase tracking-wider">
                  Контакты клиента ({contactsList.length})
                </div>

                {contactsList.length === 0 ? (
                  <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-center text-xs">
                    Контакты не добавлены. Заполните форму ниже для добавления телефона или соцсетей.
                  </div>
                ) : (
                  contactsList.map((item, idx) => {
                    const cfg = CONTACT_TYPES_CONFIG[item.type] || CONTACT_TYPES_CONFIG.other;
                    const IconComp = cfg.icon;
                    const href = getContactHref(item.type, item.value);
                    const isValueCopied = copiedItemValue === item.value;
                    const isHrefCopied = copiedItemValue === href;

                    return (
                      <div key={idx} className="flex items-center justify-between bg-[#1a1d24] border border-[#242930] p-2.5 rounded-lg gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border inline-flex items-center gap-1 shrink-0 ${cfg.badgeStyle}`}>
                            <IconComp className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white font-medium hover:text-[#FF8800] underline-offset-2 hover:underline truncate flex items-center gap-1 text-xs"
                            title="Нажмите, чтобы открыть ссылку в новой вкладке"
                          >
                            <span>{item.value}</span>
                            <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                          </a>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {/* Кнопка "Скопировать текст контакта" */}
                          <button
                            type="button"
                            onClick={() => handleCopyText(item.value)}
                            className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1 text-xs font-medium ${
                              isValueCopied
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'text-gray-400 hover:text-white hover:bg-[#242930]'
                            }`}
                            title="Скопировать значение контакта (номер/логин)"
                          >
                            {isValueCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Кнопка "Скопировать прямую ссылку/URL" */}
                          {href !== item.value && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(href)}
                              className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1 text-xs font-medium ${
                                isHrefCopied
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'text-gray-400 hover:text-white hover:bg-[#242930]'
                              }`}
                              title="Скопировать прямую URL-ссылку"
                            >
                              {isHrefCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Кнопка "Удалить контакт" */}
                          <button
                            type="button"
                            onClick={() => handleDeleteContactItem(activeContactsOrder, idx)}
                            className="p-1.5 rounded text-gray-400 hover:text-rose-400 hover:bg-[#242930] transition-colors cursor-pointer"
                            title="Удалить контакт"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Форма добавления нового контакта */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddContactItem(activeContactsOrder, newContactType, newContactValue);
                }}
                className="space-y-2 pt-3 border-t border-[#242930]"
              >
                <div className="text-gray-300 text-xs font-semibold">Добавить новый контакт:</div>

                <Select
                  label="Тип контакта"
                  options={contactTypeSelectOptions}
                  value={newContactType}
                  onChange={val => setNewContactType(val as ContactType)}
                />

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    placeholder={CONTACT_TYPES_CONFIG[newContactType]?.placeholder || 'Введите контакт...'}
                    value={newContactValue}
                    onChange={e => setNewContactValue(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button type="submit" variant="primary" size="md" className="bg-[#FF6B00] hover:bg-[#FF8800] text-white border-none shrink-0">
                    <Plus className="w-4 h-4 mr-1" /> Добавить
                  </Button>
                </div>
              </form>

              <div className="flex justify-end pt-3 border-t border-[#242930]">
                <Button variant="outline" size="sm" onClick={() => setActiveContactsOrder(null)}>
                  Готово
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Модальное окно управления мульти-транзакциями оплаты */}
      <Modal
        isOpen={!!activePaymentsOrder}
        onClose={() => setActivePaymentsOrder(null)}
        title="Управление транзакциями оплаты"
        maxWidth="sm"
      >
        {activePaymentsOrder && (() => {
          const orderAmount = activePaymentsOrder.amount || 0;
          const totalPaid = activePaymentsOrder.payment || 0;
          const remainingUnpaid = Math.max(0, orderAmount - totalPaid);
          const pmtList = (activePaymentsOrder.payments && activePaymentsOrder.payments.length > 0) 
            ? activePaymentsOrder.payments 
            : (activePaymentsOrder.payment ? [activePaymentsOrder.payment] : []);

          return (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="bg-[#0d0e12] border border-[#242930] rounded-xl p-3.5 space-y-1">
                <div className="text-gray-400 text-xs">Заказ</div>
                <div className="text-white font-bold text-sm truncate">
                  #{activePaymentsOrder.order_number} {activePaymentsOrder.title}
                </div>
                <div className="flex items-center justify-between pt-1 text-xs font-mono">
                  <span className="text-[#FF8800] font-semibold">
                    Сумма: {orderAmount.toLocaleString()} ₽
                  </span>
                  <span className={remainingUnpaid > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {remainingUnpaid > 0 ? `Остаток: ${remainingUnpaid.toLocaleString()} ₽` : 'Оплачен полностью ✓'}
                  </span>
                </div>
              </div>

              {/* Быстрая кнопка 1-клик "Оплатить полностью остаток" */}
              {remainingUnpaid > 0 && (
                <button
                  type="button"
                  onClick={() => handleAddPaymentTransaction(activePaymentsOrder, remainingUnpaid)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer active:scale-95 border border-emerald-400/30"
                  title="Нажмите для автоматической оплаты всей оставшейся суммы заказа в 1 клик"
                >
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-200" />
                  Оплатить полностью остаток ({remainingUnpaid.toLocaleString()} ₽)
                </button>
              )}

              {/* Список проведенных транзакций */}
              <div className="space-y-2">
                <div className="text-gray-300 text-xs font-semibold uppercase tracking-wider">
                  Список оплат ({pmtList.length})
                </div>

                {pmtList.map((pmt, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#1a1d24] border border-[#242930] p-2.5 rounded-lg font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#FF6B00]/20 text-[#FF8800] text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-white font-bold">{pmt.toLocaleString()} ₽</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePaymentTransaction(activePaymentsOrder, idx)}
                      className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-[#242930] transition-colors cursor-pointer"
                      title="Удалить эту транзакцию"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Форма добавления новой транзакции + быстрая плашка «Вставить остаток» */}
              <div className="space-y-2 pt-2 border-t border-[#242930]">
                {remainingUnpaid > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Быстрый ввод:</span>
                    <button
                      type="button"
                      onClick={() => setNewPaymentAmount(String(remainingUnpaid))}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FF6B00]/20 text-[#FF8800] border border-[#FF6B00]/40 hover:bg-[#FF6B00]/30 transition-colors cursor-pointer"
                      title="Нажмите, чтобы вставить оставшуюся сумму в поле ввода"
                    >
                      Вставить остаток: {remainingUnpaid.toLocaleString()} ₽
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddPaymentTransaction(activePaymentsOrder, Number(newPaymentAmount));
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    type="number"
                    min="1"
                    placeholder="Сумма оплаты (₽)..."
                    value={newPaymentAmount}
                    onChange={e => setNewPaymentAmount(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button type="submit" variant="primary" size="md" className="bg-[#FF6B00] hover:bg-[#FF8800] text-white border-none shrink-0">
                    <Plus className="w-4 h-4 mr-1" /> Добавить
                  </Button>
                </form>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#242930]">
                <div className="text-gray-300 text-xs">
                  Итого оплачено: <span className="text-emerald-400 font-bold font-mono text-sm">{totalPaid.toLocaleString()} ₽</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActivePaymentsOrder(null)}>
                  Готово
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Модальное окно просмотра и редактирования Примечания */}
      <Modal
        isOpen={!!activeNotesOrder}
        onClose={() => setActiveNotesOrder(null)}
        title="Примечание к записи"
        maxWidth="md"
      >
        {activeNotesOrder && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="bg-[#0d0e12] border border-[#242930] rounded-xl p-3.5 space-y-1">
              <div className="text-gray-400 text-xs">Запись</div>
              <div className="text-white font-bold text-sm truncate flex items-center justify-between">
                <span className="truncate">#{activeNotesOrder.order_number} {activeNotesOrder.title}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ml-2 ${
                  activeNotesOrder.type === 'income' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                }`}>
                  {activeNotesOrder.type === 'income' ? 'Доход' : 'Расход'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <NotebookPen className="w-4 h-4 text-[#FF8800]" /> Текст примечания:
                </span>
                <span className="text-gray-500 font-mono">{notesDraft.length} символов</span>
              </div>

              <textarea
                rows={5}
                autoFocus
                placeholder="Введите заметки, нюансы 3D-печати, подробное описание расхода, трек-номер отправки..."
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                className="w-full bg-[#0d0e12] border border-[#242930] hover:border-[#FF6B00]/40 focus:border-[#FF6B00] focus:outline-none rounded-xl p-3 text-white text-xs sm:text-sm font-sans transition-all placeholder-neutral-accent leading-relaxed resize-y"
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#242930]">
              {notesDraft ? (
                <button
                  type="button"
                  onClick={() => setNotesDraft('')}
                  className="text-gray-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Очистить
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveNotesOrder(null)}>
                  Отмена
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleSaveNotesModal}
                  className="bg-gradient-to-r from-[#FF5500] to-[#FF8800] text-white border-none shadow-md shadow-[#FF6B00]/20"
                >
                  Сохранить примечание
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Уведомление тост об отмене изменений Alt+Z */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-[#16181d] border border-[#FF6B00]/40 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold"
          >
            <RotateCcw className="w-4 h-4 text-[#FF8800]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingOrder?.id 
            ? (editingOrder.type === 'expense' ? `Редактирование расхода #${editingOrder.order_number || ''}` : `Редактирование заказа #${editingOrder.order_number || ''}`) 
            : (editingOrder?.type === 'expense' ? 'Новый операционный расход' : 'Новый заказ на 3D-печать')
        }
        maxWidth="2xl"
      >
        {editingOrder && (
          <form onSubmit={handleSaveModal} className="space-y-4 text-xs sm:text-sm">
            {/* Переключатель типа операции: Доход vs Расход */}
            <div className="flex items-center p-1 bg-[#0d0e12] border border-[#242930] rounded-xl select-none">
              <button
                type="button"
                onClick={() => setEditingOrder({ ...editingOrder, type: 'income' })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  editingOrder.type === 'income'
                    ? 'bg-gradient-to-r from-emerald-600/30 to-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1d24]'
                }`}
              >
                <ArrowUpRight className={`w-4 h-4 ${editingOrder.type === 'income' ? 'text-emerald-400' : 'text-gray-400'}`} />
                <span>Доход (Заказ)</span>
              </button>

              <button
                type="button"
                onClick={() => setEditingOrder({ ...editingOrder, type: 'expense' })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  editingOrder.type === 'expense'
                    ? 'bg-gradient-to-r from-rose-600/30 to-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1d24]'
                }`}
              >
                <ArrowDownRight className={`w-4 h-4 ${editingOrder.type === 'expense' ? 'text-rose-400' : 'text-gray-400'}`} />
                <span>Расход (Операционный)</span>
              </button>
            </div>

            {/* Блок 1: Основные данные */}
            <div className="bg-[#12141a] border border-[#242930] rounded-xl p-3.5 sm:p-4 space-y-3">
              <div className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#242930]/60 pb-2">
                <ShoppingBag className="w-3.5 h-3.5 text-[#FF8800]" /> Основные данные
              </div>

              <div className="space-y-3">
                <Input
                  label="Наименование *"
                  required
                  placeholder={
                    editingOrder.type === 'expense'
                      ? "Например: Закупка PETG пластика 5 кг (FDplast)"
                      : "Например: Фигурка Ведьмака 25см + покраска"
                  }
                  value={editingOrder.title || ''}
                  onChange={e => setEditingOrder({ ...editingOrder, title: e.target.value })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DatePicker
                    label="Дата записи"
                    value={editingOrder.date || ''}
                    onChange={newDate => setEditingOrder({ ...editingOrder, date: newDate })}
                    format="DD.MM"
                  />

                  {editingOrder.type === 'income' ? (
                    <Select
                      label="Статус выполнения"
                      options={statusSelectOptions}
                      value={editingOrder.status || 'Готово'}
                      onChange={val => setEditingOrder({ ...editingOrder, status: val as any })}
                    />
                  ) : (
                    <div className="flex items-center p-2.5 rounded-lg bg-[#0d0e12] border border-[#242930] text-gray-400 text-xs gap-2 h-[38px] mt-auto">
                      <Info className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">Учитывается в финансовой статистике</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Блок 2: Финансовые показатели */}
            <div className="bg-[#12141a] border border-[#242930] rounded-xl p-3.5 sm:p-4 space-y-3">
              <div className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center justify-between border-b border-[#242930]/60 pb-2">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Финансовые показатели
                </div>
                <span className="text-[11px] text-gray-500 font-mono">Все суммы в рублях (₽)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label={editingOrder.type === 'expense' ? "Сумма расхода (₽) *" : "Стоимость заказа (₽) *"}
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={editingOrder.amount || ''}
                  onChange={e => setEditingOrder({ ...editingOrder, amount: Number(e.target.value) })}
                />

                {editingOrder.type === 'income' && (
                  <>
                    <Input
                      label="Себестоимость (₽)"
                      type="number"
                      min="0"
                      placeholder="0"
                      hint="Пластик, э/э, брак"
                      value={editingOrder.cost || ''}
                      onChange={e => setEditingOrder({ ...editingOrder, cost: Number(e.target.value) })}
                    />

                    <Input
                      label="Внесенная оплата (₽)"
                      type="number"
                      min="0"
                      placeholder="0"
                      hint="Предоплата / Оплата"
                      value={editingOrder.payment || ''}
                      onChange={e => {
                        const num = Number(e.target.value);
                        setEditingOrder({ 
                          ...editingOrder, 
                          payment: num,
                          payments: [num]
                        });
                      }}
                    />
                  </>
                )}
              </div>

              {/* Живой виджет-расчет прибыли и остатка */}
              {editingOrder.type === 'income' && (
                <div className="mt-2 p-3 rounded-xl bg-[#0d0e12] border border-[#242930] grid grid-cols-2 gap-3 text-xs">
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-[11px]">Расчетная чистая прибыль:</span>
                    <span className={`text-sm font-bold font-mono ${
                      ((editingOrder.amount || 0) - (editingOrder.cost || 0)) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      +{((editingOrder.amount || 0) - (editingOrder.cost || 0)).toLocaleString()} ₽
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-gray-400 text-[11px]">Статус оплаты:</span>
                    {((editingOrder.amount || 0) - (editingOrder.payment || 0)) <= 0 ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Оплачен полностью
                      </span>
                    ) : (
                      <span className="text-sm font-bold font-mono text-amber-400">
                        Остаток: {((editingOrder.amount || 0) - (editingOrder.payment || 0)).toLocaleString()} ₽
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Блок 3: Информация о клиенте и дедлайн (только для доходов) */}
            {editingOrder.type === 'income' && (
              <div className="bg-[#12141a] border border-[#242930] rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#242930]/60 pb-2">
                  <PhoneCall className="w-3.5 h-3.5 text-sky-400" /> Клиент и сроки
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select
                    label="Канал продаж"
                    options={clientSelectOptions}
                    value={editingOrder.client || 'Авито'}
                    onChange={val => setEditingOrder({ ...editingOrder, client: val })}
                  />

                  <Input
                    label="Основной контакт"
                    placeholder="+7 900 ... или @username"
                    value={editingOrder.contact || ''}
                    onChange={e => setEditingOrder({ ...editingOrder, contact: e.target.value })}
                  />

                  <DatePicker
                    label="Срок сдачи (Дедлайн)"
                    value={editingOrder.deadline || ''}
                    onChange={newDeadline => setEditingOrder({ ...editingOrder, deadline: newDeadline })}
                    format="DD.MM"
                  />
                </div>
              </div>
            )}

            {/* Блок 4: Заметки и примечание */}
            <div className="bg-[#12141a] border border-[#242930] rounded-xl p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <NotebookPen className="w-3.5 h-3.5 text-[#FF8800]" /> Заметки и примечания
                </span>
                <span className="text-[11px] font-normal text-gray-500 font-mono">
                  {(editingOrder.notes || '').length} символов
                </span>
              </div>

              <textarea
                rows={2}
                placeholder="Укажите цвет пластика, сопло/слой печати, адрес доставки или трек-номер..."
                value={editingOrder.notes || ''}
                onChange={e => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                className="w-full bg-[#1a1d24] border border-[#242930] hover:border-[#FF6B00]/50 focus:border-[#FF6B00] focus:outline-none rounded-xl px-3 py-2 text-white text-xs sm:text-sm font-sans transition-all placeholder-neutral-accent leading-relaxed resize-y"
              />
            </div>

            {/* Подвал формы с кнопками действий */}
            <div className="flex items-center justify-between pt-3 border-t border-[#242930] mt-4">
              <span className="text-gray-500 text-xs hidden sm:inline select-none">
                * Обязательные поля для заполнения
              </span>

              <div className="flex items-center gap-2.5 ml-auto">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  className="bg-gradient-to-r from-[#FF5500] to-[#FF8800] hover:from-[#FF6600] hover:to-[#FF9900] text-white border-none shadow-lg shadow-[#FF6B00]/25 font-bold px-5 py-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  {editingOrder?.id ? 'Сохранить изменения' : 'Создать запись'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
