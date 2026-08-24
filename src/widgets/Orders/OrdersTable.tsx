'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Order, 
  OrderStatus, 
  ContactItem,
  ContactType, 
  CostItem, 
  SortField, 
  SortOrder 
} from './types';
import { 
  getOrders, 
  saveOrder, 
  deleteOrder, 
  restoreAllOrders, 
  getSavedCalculations, 
  updateSavedCalculation 
} from '../../shared/api/db';
import { useData } from '../../entities/model/DataProvider';
import { 
  OrdersSummary 
} from './components/OrdersSummary';
import { 
  OrdersMonthlyGoal 
} from './components/OrdersMonthlyGoal';
import { 
  OrdersFilterBar, 
  OrderTypeFilter, 
  PaymentFilter 
} from './components/OrdersFilterBar';
import { 
  OrdersTableModern 
} from './components/OrdersTableModern';
import { 
  OrderDrawer, 
  DrawerTab 
} from './components/OrderDrawer';
import { 
  OrderFormModal 
} from './components/OrderFormModal';
import { 
  DeleteOrderModal 
} from './components/DeleteOrderModal';
import { 
  ClearMonthModal 
} from './components/ClearMonthModal';

import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { ordersTheme } from '../../shared/theme';
import { 
  roundTo2, 
  getOrderMonthKey, 
  formatMonthKeyLabel, 
  getCurrentRealMonthKey, 
  calculateOrderFinancials,
  calculateOrdersSummaryKPI
} from './helpers';
import { 
  ShoppingBag, 
  Plus, 
  RotateCcw, 
  Sparkles, 
  Layers 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

  // Выбранный месяц ('all' | 'YYYY-MM')
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');

  // Сортировка (по номеру заказа desc по умолчанию)
  const [sortField, setSortField] = useState<SortField>('order_number');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Пагинация порциями (Infinite Scroll)
  const ORDERS_CHUNK_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState<number>(ORDERS_CHUNK_SIZE);

  // Состояния Drawer / Модалок
  const [activeDrawerOrder, setActiveDrawerOrder] = useState<Order | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<DrawerTab>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<Order> | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isClearMonthModalOpen, setIsClearMonthModalOpen] = useState(false);

  // Контекстное меню
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; order: Order } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Стек истории для Alt+Z / Ctrl+Z
  const [historyStack, setHistoryStack] = useState<Order[][]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { savedCalculations } = useData();

  // Загрузка заказов
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    const data = await getOrders();
    setOrders(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();

    const handleRefresh = () => loadOrders();
    window.addEventListener('saved_calculations_updated', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('saved_calculations_updated', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [loadOrders]);

  // Проверка черновика из каталога товаров
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawDraft = localStorage.getItem('draft_order_from_product');
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft);
        localStorage.removeItem('draft_order_from_product');

        const today = new Date();
        const formattedDate = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;

        const inTwoDays = new Date();
        inTwoDays.setDate(inTwoDays.getDate() + 2);
        const deadlineStr = `${String(inTwoDays.getDate()).padStart(2, '0')}.${String(inTwoDays.getMonth() + 1).padStart(2, '0')}.${inTwoDays.getFullYear()}`;

        const parsedAmount = roundTo2(draft.amount || 0);
        const parsedCost = roundTo2(draft.cost || 0);

        const parsedCostItems: CostItem[] = (draft.cost_items && Array.isArray(draft.cost_items) && draft.cost_items.length > 0)
          ? draft.cost_items.map((ci: any) => ({
              id: ci.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Math.random())),
              category: ci.category || 'Печать',
              amount: roundTo2(ci.amount || 0),
              note: ci.note || undefined,
            }))
          : (parsedCost > 0 ? [{ id: 'init-1', category: 'Печать', amount: parsedCost }] : []);

        setEditingOrder({
          date: formattedDate,
          type: 'income',
          title: draft.title || '',
          quantity: draft.quantity || 1,
          product_id: draft.product_id || undefined,
          base_amount: draft.base_amount ?? parsedAmount,
          urgency_type: draft.urgency_type || 'percent',
          urgency_percent: draft.urgency_percent || 0,
          urgency_amount: draft.urgency_amount || 0,
          discount_type: draft.discount_type || 'percent',
          discount_percent: draft.discount_percent || 0,
          discount_amount: draft.discount_amount || 0,
          amount: parsedAmount,
          cost: parsedCost,
          cost_items: parsedCostItems,
          payments: [parsedAmount],
          payment: parsedAmount,
          client: 'Авито',
          contacts: [],
          contact: '',
          deadline: draft.deadline || deadlineStr,
          status: 'Ждет печати',
          notes: draft.notes || '',
        });

        setIsModalOpen(true);
        setToastMessage(`📦 Товар «${draft.title}» загружен в форму заказа!`);
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err) {
        console.error('Ошибка загрузки черновика заказа:', err);
      }
    }
  }, []);

  // Закрытие контекстного меню при клике вне его или скролле
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleClose = () => setContextMenu(null);

    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleClose);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleClose);
    };
  }, []);

  // Сохранение в историю для Undo
  const pushToHistory = (currentOrders: Order[]) => {
    setHistoryStack(prev => [...prev.slice(-25), JSON.parse(JSON.stringify(currentOrders))]);
  };

  // Undo (Alt+Z)
  const handleUndo = useCallback(async () => {
    if (historyStack.length === 0) {
      setToastMessage('Нет действий для отмены');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    const previousState = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, -1));
    setOrders(previousState);
    await restoreAllOrders(previousState);

    setToastMessage('Изменение отменено (Alt+Z)');
    setTimeout(() => setToastMessage(null), 2500);
  }, [historyStack]);

  // Горячие клавиши Alt+Z и Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.code === 'KeyZ') || ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey)) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Месяцы
  const availableMonthKeys = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o: Order) => {
      const key = getOrderMonthKey(o);
      if (key) set.add(key);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const handlePrevMonth = () => {
    let currentKey = selectedMonthKey;
    if (currentKey === 'all') {
      currentKey = getCurrentRealMonthKey();
    }
    const [y, m] = currentKey.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonthKey(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let currentKey = selectedMonthKey;
    if (currentKey === 'all') {
      currentKey = getCurrentRealMonthKey();
    }
    const [y, m] = currentKey.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonthKey(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  // Фильтрация по месяцу
  const monthFilteredOrders = useMemo(() => {
    if (selectedMonthKey === 'all') return orders;
    return orders.filter(o => getOrderMonthKey(o) === selectedMonthKey);
  }, [orders, selectedMonthKey]);

  // Вычисляемые KPI для выбранного месяца (через централизованную формулу)
  const {
    totalIncome,
    totalExpenses,
    netProfitTotal,
    totalMarginPercent,
    unpaidSum,
    incomeOrdersCount,
    unpaidOrdersCount,
    inProgressCount,
    completedCount,
    expenseCount,
  } = useMemo(() => {
    return calculateOrdersSummaryKPI(monthFilteredOrders);
  }, [monthFilteredOrders]);

  // Фильтрация по поиску, вкладкам, каналу и оплате
  const filteredOrders = useMemo(() => {
    return monthFilteredOrders.filter((o) => {
      // 1. Поиск
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().replace('#', '').trim();
        const matchesTitle = o.title?.toLowerCase().includes(q);
        const matchesClient = o.client?.toLowerCase().includes(q);
        const matchesContact = o.contact?.toLowerCase().includes(q) || o.contacts?.some(c => c.value?.toLowerCase().includes(q));
        const matchesNum = String(o.order_number || '').includes(q);
        if (!matchesTitle && !matchesClient && !matchesContact && !matchesNum) {
          return false;
        }
      }

      // 2. Вкладка типа
      if (typeFilter === 'income' && o.type !== 'income') return false;
      if (typeFilter === 'expense' && o.type !== 'expense') return false;
      if (typeFilter === 'in_progress') {
        if (o.type !== 'income' || o.status === 'Готово' || o.status === 'Не в работе') return false;
      }
      if (typeFilter === 'completed') {
        if (o.status !== 'Готово') return false;
      }

      // 3. Канал клиента
      if (clientFilter !== 'all' && o.client !== clientFilter) {
        return false;
      }

      // 4. Оплата
      if (paymentFilter === 'paid') {
        if (o.type === 'income' && (o.payment || 0) < (o.amount || 0)) return false;
      }
      if (paymentFilter === 'unpaid') {
        if (o.type !== 'income' || (o.payment || 0) >= (o.amount || 0)) return false;
      }

      return true;
    });
  }, [monthFilteredOrders, searchQuery, typeFilter, clientFilter, paymentFilter]);

  // Сортировка
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
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

      if (sortField === 'date' || sortField === 'deadline') {
        const parseDate = (val: any) => {
          if (!val) return 0;
          const str = String(val).trim();
          if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            const [y, m, d] = str.slice(0, 10).split('-').map(Number);
            return new Date(y, m - 1, d).getTime();
          }
          const parts = str.split('.');
          if (parts.length >= 2) {
            const day = Number(parts[0]) || 1;
            const month = (Number(parts[1]) || 1) - 1;
            const year = parts[2] ? (parts[2].length === 2 ? Number(`20${parts[2]}`) : Number(parts[2])) : new Date().getFullYear();
            return new Date(year, month, day).getTime();
          }
          return 0;
        };
        const tA = parseDate(aValue);
        const tB = parseDate(bValue);
        return sortOrder === 'asc' ? tA - tB : tB - tA;
      }

      const sA = String(aValue).toLowerCase();
      const sB = String(bValue).toLowerCase();
      return sortOrder === 'asc' ? sA.localeCompare(sB, 'ru') : sB.localeCompare(sA, 'ru');
    });
  }, [filteredOrders, sortField, sortOrder]);

  const visibleOrders = useMemo(() => {
    return sortedOrders.slice(0, visibleCount);
  }, [sortedOrders, visibleCount]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Дублирование
  const handleDuplicateOrder = async (order: Order) => {
    pushToHistory(orders);
    const maxNum = orders.reduce((max, o) => Math.max(max, o.order_number || 0), 1000);
    const duplicated: Order = {
      ...order,
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      order_number: maxNum + 1,
      title: `${order.title} (копия)`,
      created_at: new Date().toISOString(),
    };
    const saved = await saveOrder(duplicated);
    setOrders(prev => [saved, ...prev]);
    setToastMessage(`Заказ #${saved.order_number} продублирован`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Удаление одной записи
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    pushToHistory(orders);
    await deleteOrder(orderToDelete.id);
    setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
    if (activeDrawerOrder?.id === orderToDelete.id) {
      setActiveDrawerOrder(null);
    }
    setToastMessage(`Запись #${orderToDelete.order_number || ''} удалена (Alt+Z для отмены)`);
    setTimeout(() => setToastMessage(null), 3000);
    setOrderToDelete(null);
  };

  // Очистка месяца
  const handleConfirmClearMonth = async () => {
    if (selectedMonthKey === 'all') return;
    const idsToDelete = monthFilteredOrders.map(o => o.id);
    if (idsToDelete.length === 0) return;

    pushToHistory(orders);
    for (const id of idsToDelete) {
      await deleteOrder(id);
    }
    setOrders(prev => prev.filter(o => getOrderMonthKey(o) !== selectedMonthKey));
    setActiveDrawerOrder(null);
    setToastMessage(`Все записи за ${formatMonthKeyLabel(selectedMonthKey)} очищены`);
    setTimeout(() => setToastMessage(null), 3000);
    setIsClearMonthModalOpen(false);
  };

  // Открытие Drawer с целевой вкладкой
  const handleOpenDrawer = (order: Order, tab: DrawerTab = 'all') => {
    setDrawerInitialTab(tab);
    setActiveDrawerOrder(order);
  };

  // Прямое обновление заказа из Drawer
  const handleUpdateOrder = async (updatedOrder: Order) => {
    pushToHistory(orders);
    setOrders(prev => prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o)));
    setActiveDrawerOrder(prev => (prev && prev.id === updatedOrder.id ? updatedOrder : null));
    await saveOrder(updatedOrder);
  };

  // Быстрое переключение типа Доход <-> Расход
  const handleToggleType = async (order: Order) => {
    pushToHistory(orders);
    const newType = order.type === 'income' ? 'expense' : 'income';
    const updated: Order = { ...order, type: newType };
    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    if (activeDrawerOrder?.id === order.id) {
      setActiveDrawerOrder(updated);
    }
    await saveOrder(updated);
  };

  // Смена статуса
  const handleUpdateStatus = async (order: Order, newStatus: OrderStatus) => {
    pushToHistory(orders);
    const updated = { ...order, status: newStatus };
    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    if (activeDrawerOrder?.id === order.id) {
      setActiveDrawerOrder(updated);
    }
    await saveOrder(updated);
  };

  // Добавление платежа в Drawer
  const handleAddPayment = async (order: Order, amountNum: number) => {
    if (!amountNum || amountNum <= 0) return;
    pushToHistory(orders);

    const cleanAmount = roundTo2(amountNum);
    const existingPayments = order.payments && order.payments.length > 0 
      ? order.payments.map(p => roundTo2(p)) 
      : (order.payment ? [roundTo2(order.payment)] : []);
    const updatedPayments = [...existingPayments, cleanAmount];
    const newTotalPayment = roundTo2(updatedPayments.reduce((sum, p) => sum + p, 0));

    const updated: Order = {
      ...order,
      payments: updatedPayments,
      payment: newTotalPayment,
    };

    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    setActiveDrawerOrder(updated);
    await saveOrder(updated);
  };

  // Удаление платежа
  const handleDeletePayment = async (order: Order, indexToDelete: number) => {
    pushToHistory(orders);

    const existingPayments = order.payments && order.payments.length > 0 
      ? order.payments.map(p => roundTo2(p)) 
      : (order.payment ? [roundTo2(order.payment)] : []);
    const updatedPayments = existingPayments.filter((_, idx) => idx !== indexToDelete);
    const newTotalPayment = roundTo2(updatedPayments.reduce((sum, p) => sum + p, 0));

    const updated: Order = {
      ...order,
      payments: updatedPayments,
      payment: newTotalPayment,
    };

    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    setActiveDrawerOrder(updated);
    await saveOrder(updated);
  };

  // Добавление пункта расхода
  const handleAddCostItem = async (order: Order, categoryName: string, amountNum: number, note?: string) => {
    if (!categoryName || !categoryName.trim() || isNaN(amountNum) || amountNum <= 0) return;
    pushToHistory(orders);

    const cleanAmount = roundTo2(amountNum);
    const existingItems: CostItem[] = order.cost_items && order.cost_items.length > 0 
      ? order.cost_items.map(it => ({ ...it, amount: roundTo2(it.amount || 0) }))
      : (order.cost ? [{ id: 'init-1', category: 'Печать', amount: roundTo2(order.cost) }] : []);

    const newItem: CostItem = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      category: categoryName.trim(),
      amount: cleanAmount,
      note: note ? note.trim() : undefined,
    };

    const updatedItems = [...existingItems, newItem];
    const newTotalCost = roundTo2(updatedItems.reduce((acc, item) => acc + (item.amount || 0), 0));

    const updated: Order = {
      ...order,
      cost_items: updatedItems,
      cost: newTotalCost,
    };

    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    setActiveDrawerOrder(updated);
    await saveOrder(updated);
  };

  // Обновление пункта расхода
  const handleUpdateCostItem = async (order: Order, indexToUpdate: number, field: keyof CostItem, value: any) => {
    pushToHistory(orders);

    const existingItems: CostItem[] = order.cost_items && order.cost_items.length > 0 ? order.cost_items : [];
    const updatedItems = existingItems.map((item, idx) => {
      if (idx === indexToUpdate) {
        return { ...item, [field]: field === 'amount' ? roundTo2(Number(value)) : value };
      }
      return item;
    });

    const newTotalCost = roundTo2(updatedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));

    const updated: Order = {
      ...order,
      cost_items: updatedItems,
      cost: newTotalCost,
    };

    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    setActiveDrawerOrder(updated);
    await saveOrder(updated);
  };

  // Удаление пункта расхода
  const handleDeleteCostItem = async (order: Order, indexToDelete: number) => {
    pushToHistory(orders);

    const existingItems: CostItem[] = order.cost_items && order.cost_items.length > 0 ? order.cost_items : [];
    const updatedItems = existingItems.filter((_, idx) => idx !== indexToDelete);
    const newTotalCost = roundTo2(updatedItems.reduce((acc, item) => acc + (item.amount || 0), 0));

    const updated: Order = {
      ...order,
      cost_items: updatedItems,
      cost: newTotalCost,
    };

    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    setActiveDrawerOrder(updated);
    await saveOrder(updated);
  };

  // Добавление контакта
  const handleAddContact = async (order: Order, type: ContactType, val: string) => {
    if (!val || !val.trim()) return;
    pushToHistory(orders);

    const existingContacts: ContactItem[] = order.contacts && order.contacts.length > 0 
      ? order.contacts 
      : (order.contact ? [{ type: 'other', value: order.contact }] : []);

    const updatedContacts = [...existingContacts, { type, value: val.trim() }];
    const updated: Order = {
      ...order,
      contacts: updatedContacts,
      contact: updatedContacts.map(c => c.value).join(', '),
    };

    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    setActiveDrawerOrder(updated);
    await saveOrder(updated);
  };

  // Удаление контакта
  const handleDeleteContact = async (order: Order, indexToDelete: number) => {
    pushToHistory(orders);

    const existingContacts: ContactItem[] = order.contacts && order.contacts.length > 0 
      ? order.contacts 
      : (order.contact ? [{ type: 'other', value: order.contact }] : []);

    const updatedContacts = existingContacts.filter((_, idx) => idx !== indexToDelete);
    const updated: Order = {
      ...order,
      contacts: updatedContacts,
      contact: updatedContacts.map(c => c.value).join(', '),
    };

    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    setActiveDrawerOrder(updated);
    await saveOrder(updated);
  };

  // Сохранение заметок
  const handleSaveNotes = async (order: Order, notesVal: string) => {
    pushToHistory(orders);
    const updated: Order = {
      ...order,
      notes: notesVal.trim(),
    };
    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    setActiveDrawerOrder(updated);
    await saveOrder(updated);
  };

  // Открытие формы добавления
  const handleOpenAddModal = () => {
    let formattedDate = '';
    const today = new Date();
    if (selectedMonthKey && selectedMonthKey !== 'all') {
      const [y, m] = selectedMonthKey.split('-').map(Number);
      if (today.getFullYear() === y && today.getMonth() + 1 === m) {
        formattedDate = `${String(today.getDate()).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
      } else {
        formattedDate = `01.${String(m).padStart(2, '0')}.${y}`;
      }
    } else {
      formattedDate = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    }

    setEditingOrder({
      date: formattedDate,
      type: 'income',
      title: '',
      quantity: 1,
      base_amount: 0,
      urgency_type: 'percent',
      urgency_percent: 0,
      urgency_amount: 0,
      discount_type: 'percent',
      discount_percent: 0,
      discount_amount: 0,
      amount: 0,
      cost: 0,
      cost_items: [],
      payments: [0],
      payment: 0,
      client: 'Авито',
      contacts: [],
      contact: '',
      deadline: '',
      status: 'Не в работе',
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Открытие формы редактирования
  const handleOpenEditModal = (order: Order) => {
    setEditingOrder({
      ...order,
      base_amount: order.base_amount !== undefined ? order.base_amount : roundTo2(order.amount || 0),
      urgency_type: order.urgency_type || 'percent',
      urgency_percent: order.urgency_percent || 0,
      urgency_amount: order.urgency_amount || 0,
      discount_type: order.discount_type || 'percent',
      discount_percent: order.discount_percent || 0,
      discount_amount: order.discount_amount || 0,
      amount: roundTo2(order.amount || 0),
      cost: roundTo2(order.cost || 0),
      payment: roundTo2(order.payment || 0),
      cost_items: (order.cost_items || []).map(ci => ({
        ...ci,
        amount: roundTo2(ci.amount || 0),
      })),
    });
    setIsModalOpen(true);
  };

  // Сохранение из модального окна
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const orderToSave: Order = {
      ...(editingOrder as Order),
      base_amount: editingOrder.base_amount !== undefined ? roundTo2(editingOrder.base_amount) : roundTo2(editingOrder.amount || 0),
      urgency_type: editingOrder.urgency_type || 'percent',
      urgency_percent: editingOrder.urgency_percent ? roundTo2(editingOrder.urgency_percent) : 0,
      urgency_amount: editingOrder.urgency_amount ? roundTo2(editingOrder.urgency_amount) : 0,
      discount_type: editingOrder.discount_type || 'percent',
      discount_percent: editingOrder.discount_percent ? roundTo2(editingOrder.discount_percent) : 0,
      discount_amount: editingOrder.discount_amount ? roundTo2(editingOrder.discount_amount) : 0,
      amount: roundTo2(editingOrder.amount || 0),
      cost: roundTo2(editingOrder.cost || 0),
      payment: roundTo2(editingOrder.payment || 0),
      cost_items: (editingOrder.cost_items || []).map(ci => ({
        ...ci,
        amount: roundTo2(ci.amount || 0),
      })),
    };

    pushToHistory(orders);
    const saved = await saveOrder(orderToSave);

    setOrders(prev => {
      const exists = prev.some(o => o.id === saved.id);
      if (exists) {
        return prev.map(o => (o.id === saved.id ? saved : o));
      }
      return [saved, ...prev];
    });

    if (activeDrawerOrder?.id === saved.id) {
      setActiveDrawerOrder(saved);
    }

    // Списание со склада при наличии product_id
    if (editingOrder.product_id) {
      try {
        const calcs = await getSavedCalculations();
        const targetProduct = calcs.find(c => c.id === editingOrder.product_id);
        if (targetProduct) {
          const qtyToDeduct = Math.max(1, Number(editingOrder.quantity) || 1);
          const currentStock = targetProduct.stock_quantity || 0;
          const newStock = Math.max(0, currentStock - qtyToDeduct);

          await updateSavedCalculation({
            ...targetProduct,
            stock_quantity: newStock,
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('saved_calculations_updated'));
          }

          setToastMessage(`Заказ сохранен! Со склада списано: ${qtyToDeduct} шт`);
          setTimeout(() => setToastMessage(null), 3000);
        }
      } catch (err) {
        console.error('Ошибка списания товара со склада:', err);
      }
    }

    setIsModalOpen(false);
    setEditingOrder(null);
  };

  return (
    <div className="space-y-4 select-none relative">
      {/* Шапка раздела */}
      <PageHeader
        icon={ShoppingBag}
        title="Заказы и Финансы"
        subtitle={
          <>
            Кликните по строке для открытия карточки заказа •{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-[#242930] text-gray-200 text-[11px] font-mono border border-gray-700">
              Alt+Z
            </kbd>{' '}
            для отмены
          </>
        }
        accentColor={ordersTheme.accentHex}
        className="p-4 sm:p-5"
        actions={
          <div className="flex items-center gap-2">
            {/* Кнопка отмены Alt+Z */}
            <Button
              onClick={handleUndo}
              disabled={historyStack.length === 0}
              variant="outline"
              size="sm"
              className={`p-2 rounded-xl transition-all flex items-center justify-center shrink-0 ${
                historyStack.length > 0
                  ? `${ordersTheme.accent.borderHover} ${ordersTheme.accent.text} hover:${ordersTheme.accent.bgSubtle} cursor-pointer shadow-sm`
                  : 'border-[#242930] text-gray-600 opacity-40 cursor-not-allowed'
              }`}
              title={historyStack.length > 0 ? "Отменить последнее изменение (Alt+Z / Ctrl+Z)" : "Нет действий для отмены"}
            >
              <RotateCcw className={`w-4 h-4 ${historyStack.length > 0 ? ordersTheme.accent.text : 'text-gray-600'}`} />
            </Button>

            {/* Кнопка создания нового заказа */}
            <Button
              onClick={handleOpenAddModal}
              variant="primary"
              size="sm"
              className={`${ordersTheme.primaryButton.gradient} ${ordersTheme.primaryButton.text} border-none ${ordersTheme.primaryButton.shadow} cursor-pointer text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl`}
            >
              <Plus className="w-4 h-4 mr-1" />
              Добавить заказ
            </Button>
          </div>
        }
      />

      {/* Компактный блок «Цель на месяц» с прогресс-баром */}
      <OrdersMonthlyGoal
        selectedMonthKey={selectedMonthKey}
        totalIncome={totalIncome}
        netProfitTotal={netProfitTotal}
        incomeOrdersCount={incomeOrdersCount}
      />

      {/* KPI Сводка за выбранный месяц */}
      <OrdersSummary
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        netProfitTotal={netProfitTotal}
        totalMarginPercent={totalMarginPercent}
        unpaidSum={unpaidSum}
        incomeOrdersCount={incomeOrdersCount}
        unpaidOrdersCount={unpaidOrdersCount}
      />

      {/* Панель фильтров и поиска */}
      <OrdersFilterBar
        selectedMonthKey={selectedMonthKey}
        setSelectedMonthKey={setSelectedMonthKey}
        availableMonthKeys={availableMonthKeys}
        handlePrevMonth={handlePrevMonth}
        handleNextMonth={handleNextMonth}
        monthOrdersCount={monthFilteredOrders.length}
        onOpenClearMonthModal={() => setIsClearMonthModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        clientFilter={clientFilter}
        setClientFilter={setClientFilter}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        totalFilteredCount={filteredOrders.length}
        inProgressCount={inProgressCount}
        completedCount={completedCount}
        expenseCount={expenseCount}
      />

      {/* Оптимизированная таблица заказов */}
      <OrdersTableModern
        orders={sortedOrders}
        visibleOrders={visibleOrders}
        visibleCount={visibleCount}
        totalOrdersCount={sortedOrders.length}
        onLoadMore={() => setVisibleCount(prev => Math.min(prev + ORDERS_CHUNK_SIZE, sortedOrders.length))}
        onShowAll={() => setVisibleCount(sortedOrders.length)}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        onOpenDrawer={handleOpenDrawer}
        onOpenEditModal={handleOpenEditModal}
        onOpenAddModal={handleOpenAddModal}
        onUpdateStatus={handleUpdateStatus}
        onToggleType={handleToggleType}
        onDuplicateOrder={handleDuplicateOrder}
        onRequestDelete={(order) => setOrderToDelete(order)}
        searchQuery={searchQuery}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        contextMenuRef={contextMenuRef}
        onCopyContact={(text) => {
          navigator.clipboard.writeText(text);
          setToastMessage(`Контакт скопирован: ${text}`);
          setTimeout(() => setToastMessage(null), 2200);
        }}
      />

      {/* Боковая панель деталей заказа (Drawer) */}
      <AnimatePresence>
        {activeDrawerOrder && (
          <OrderDrawer
            key={activeDrawerOrder.id}
            order={activeDrawerOrder}
            initialTab={drawerInitialTab}
            onClose={() => setActiveDrawerOrder(null)}
            onUpdateOrder={handleUpdateOrder}
            onOpenEditModal={handleOpenEditModal}
            onDuplicateOrder={handleDuplicateOrder}
            onRequestDelete={(order) => setOrderToDelete(order)}
            onUpdateStatus={handleUpdateStatus}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
            onAddCostItem={handleAddCostItem}
            onUpdateCostItem={handleUpdateCostItem}
            onDeleteCostItem={handleDeleteCostItem}
            onAddContact={handleAddContact}
            onDeleteContact={handleDeleteContact}
            onSaveNotes={handleSaveNotes}
          />
        )}
      </AnimatePresence>

      {/* Модальное окно создания и полного редактирования */}
      <OrderFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOrder(null);
        }}
        order={editingOrder}
        setOrder={setEditingOrder}
        onSave={handleSaveModal}
        savedCalculations={savedCalculations}
      />

      {/* Модальное окно удаления записи */}
      <DeleteOrderModal
        order={orderToDelete}
        onClose={() => setOrderToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Модальное окно очистки месяца */}
      <ClearMonthModal
        isOpen={isClearMonthModalOpen}
        onClose={() => setIsClearMonthModalOpen(false)}
        selectedMonthKey={selectedMonthKey}
        monthOrdersCount={monthFilteredOrders.length}
        onConfirm={handleConfirmClearMonth}
      />

      {/* Тост уведомление */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-[#16181d] border border-[#FF6B00]/40 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold backdrop-blur-xl"
          >
            <RotateCcw className="w-4 h-4 text-[#FF8800]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
