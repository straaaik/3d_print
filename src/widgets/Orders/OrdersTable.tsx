'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Order, 
  OrderStatus, 
  SortField, 
  SortOrder, 
  OrderTypeFilter, 
  PaymentFilter,
  CostItem,
} from './types';
import { 
  saveOrder, 
  deleteOrder, 
  deleteOrders,
  restoreAllOrders, 
  saveMonthlyGoal,
  saveMonthlyGoalsConfig,
  MonthlyGoalsConfig
} from '../../shared/api/db';
import { useData } from '../../entities/model/DataProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { useOrderModal } from '../../entities/model/OrderModalContext';
import { 
  DeleteOrderModal 
} from './components/DeleteOrderModal';
import { 
  ClearMonthModal 
} from './components/ClearMonthModal';
import { 
  GoalSettingsModal 
} from './components/GoalSettingsModal';
import { 
  OpenNewMonthModal 
} from './components/OpenNewMonthModal';
import { 
  OrdersV2View 
} from './components/v2/OrdersV2View';

import { 
  roundTo2, 
  getOrderMonthKey, 
  formatMonthKeyLabel, 
  getCurrentRealMonthKey, 
  calculateOrdersSummaryKPI
} from './helpers';
import { usePersistentState } from '../../shared/lib/usePersistentState';

export interface OrdersTableProps {
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
}

export function OrdersTable({
  isExpanded: externalIsExpanded,
  onToggleExpand: externalOnToggleExpand,
}: OrdersTableProps = {}) {
  // Фильтры и поиск с сохранением между сессиями
  const [searchQuery, setSearchQuery] = usePersistentState('3d_orders_search_query', '');
  const [typeFilter, setTypeFilter] = usePersistentState<OrderTypeFilter>('3d_orders_type_filter', 'all');
  const [clientFilter, setClientFilter] = usePersistentState('3d_orders_client_filter', 'all');
  const [paymentFilter, setPaymentFilter] = usePersistentState<PaymentFilter>('3d_orders_payment_filter', 'all');

  // Выбранный месяц ('all' | 'YYYY-MM')
  const [selectedMonthKey, setSelectedMonthKey] = usePersistentState<string>('3d_orders_selected_month', 'all');

  // Сортировка (по номеру заказа desc по умолчанию)
  const [sortField, setSortField] = usePersistentState<SortField>('3d_orders_sort_field', 'order_number');
  const [sortOrder, setSortOrder] = usePersistentState<SortOrder>('3d_orders_sort_order', 'desc');

  // Пагинация порциями (Infinite Scroll)
  const ORDERS_CHUNK_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState<number>(ORDERS_CHUNK_SIZE);

  // Состояния Модалок
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isClearMonthModalOpen, setIsClearMonthModalOpen] = useState(false);
  const [isOpenNewMonthModalOpen, setIsOpenNewMonthModalOpen] = useState(false);
  const [openedMonthKeys, setOpenedMonthKeys] = useState<string[]>([]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Контекстное меню
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; order: Order } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Стек истории для Alt+Z / Ctrl+Z
  const [historyStack, setHistoryStack] = useState<Order[][]>([]);
  const { showSuccess, showWarning, showInfo, showError } = useToast();
  const {
    savedCalculations,
    isOnline,
    orders,
    setOrders,
    monthlyGoals: goalsConfig,
    setMonthlyGoals: setGoalsConfig,
  } = useData();
  const { openOrder } = useOrderModal();

  // Режим полного экрана (Развёрнутый / Компактный)
  const [internalIsExpanded, setInternalIsExpanded] = usePersistentState<boolean>('3d_orders_expanded_view', false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
  const setIsExpanded = externalOnToggleExpand || setInternalIsExpanded;

  // Сброс фильтров и поиска (по клику на красную кнопку терминала)
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('all');
    setClientFilter('all');
    setPaymentFilter('all');
    showInfo('Фильтры и поиск сброшены', 'Сброс');
  }, [setSearchQuery, setTypeFilter, setClientFilter, setPaymentFilter, showInfo]);

  const handleToggleExpand = useCallback((expanded: boolean) => {
    setIsExpanded(expanded);
  }, [setIsExpanded]);


  // Цель для текущего выбранного месяца
  const currentMonthGoal = useMemo(() => {
    if (selectedMonthKey && selectedMonthKey !== 'all') {
      if (typeof goalsConfig.monthlyGoals[selectedMonthKey] === 'number') {
        return goalsConfig.monthlyGoals[selectedMonthKey];
      }
    }
    return goalsConfig.defaultGoal || 0;
  }, [goalsConfig, selectedMonthKey]);

  const handleSaveGoal = async (newGoal: number, applyToAll: boolean) => {
    const updatedMonthly = { ...goalsConfig.monthlyGoals };
    if (applyToAll || selectedMonthKey === 'all') {
      const updated: MonthlyGoalsConfig = {
        defaultGoal: newGoal,
        targetType: 'profit',
        monthlyGoals: selectedMonthKey !== 'all' ? { ...updatedMonthly, [selectedMonthKey]: newGoal } : updatedMonthly,
      };
      setGoalsConfig(updated);
      await saveMonthlyGoalsConfig(updated);
    } else {
      updatedMonthly[selectedMonthKey] = newGoal;
      const updated: MonthlyGoalsConfig = {
        ...goalsConfig,
        targetType: 'profit',
        monthlyGoals: updatedMonthly,
      };
      setGoalsConfig(updated);
      await saveMonthlyGoal(selectedMonthKey, newGoal);
    }
  };

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
          ? draft.cost_items.map((ci: Partial<CostItem>) => ({
              id: ci.id || crypto.randomUUID(),
              category: ci.category || 'Печать',
              amount: roundTo2(ci.amount || 0),
              note: ci.note || undefined,
            }))
          : (parsedCost > 0 ? [{ id: 'init-1', category: 'Печать', amount: parsedCost }] : []);

        openOrder({
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
          payments: [0],
          payment: 0,
          client: 'Авито',
          contacts: [],
          contact: '',
          deadline: draft.deadline || deadlineStr,
          status: 'Ждет печати',
          notes: draft.notes || '',
        });

        showInfo(`Товар «${draft.title}» загружен в форму заказа!`, 'Черновик');
      } catch (err) {
        console.error('Ошибка загрузки черновика заказа:', err);
      }
    }
  }, [showInfo]);

  // Закрытие контекстного меню при клике вне его, скролле или Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleClose = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setContextMenu]);

  // Сохранение в историю для Undo
  const pushToHistory = (currentOrders: Order[]) => {
    setHistoryStack(prev => [...prev.slice(-25), JSON.parse(JSON.stringify(currentOrders))]);
  };

  // Undo (Alt+Z)
  const handleUndo = useCallback(async () => {
    if (historyStack.length === 0) {
      showWarning('Нет действий для отмены', 'История');
      return;
    }

    const previousState = historyStack[historyStack.length - 1];
    await restoreAllOrders(previousState);
    setHistoryStack(prev => prev.slice(0, -1));
    setOrders(previousState);
    window.dispatchEvent(new Event('orders_updated'));

    showInfo('Изменение отменено (Alt+Z)', 'История');
  }, [historyStack, setOrders, showWarning, showInfo]);

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
    const set = new Set<string>(openedMonthKeys);
    orders.forEach((o: Order) => {
      const key = getOrderMonthKey(o);
      if (key) set.add(key);
    });
    if (selectedMonthKey && selectedMonthKey !== 'all') {
      set.add(selectedMonthKey);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders, openedMonthKeys, selectedMonthKey]);

  const handleOpenNewMonth = (monthKey: string) => {
    setOpenedMonthKeys(prev => Array.from(new Set([...prev, monthKey])));
    setSelectedMonthKey(monthKey);
    showInfo(`Открыт месяц ${formatMonthKeyLabel(monthKey)}`, 'Реестр');
  };

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

  // Вычисляемые KPI для выбранного месяца
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

  // Дополнительные счетчики для V2 (печать и ожидание)
  const printingCount = useMemo(() => {
    return monthFilteredOrders.filter(o => o.type === 'income' && (o.status === 'Печать' || o.status === 'Ждет печати')).length;
  }, [monthFilteredOrders]);

  const waitingCount = useMemo(() => {
    return monthFilteredOrders.filter(o => o.type === 'income' && (o.status === 'Моделирование' || o.status === 'Не в работе' || o.status === 'Ждет печати' || o.status === 'Ждет покраски' || o.status === 'Ждет отправки')).length;
  }, [monthFilteredOrders]);

  // Фильтрация по поиску, вкладкам, каналу и оплате
  const filteredOrders = useMemo(() => {
    return monthFilteredOrders.filter((o) => {
      // 1. Поиск
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().replace('#', '').trim();
        const matchesTitle = o.title?.toLowerCase().includes(q);
        const matchesClientName = o.client_name?.toLowerCase().includes(q);
        const matchesClient = o.client?.toLowerCase().includes(q);
        const matchesContact = o.contact?.toLowerCase().includes(q) || o.contacts?.some(c => c.value?.toLowerCase().includes(q));
        const matchesNum = String(o.order_number || '').includes(q);
        const matchesNotes = o.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesClientName && !matchesClient && !matchesContact && !matchesNum && !matchesNotes) {
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
      if (paymentFilter === 'partial') {
        if (o.type !== 'income' || (o.payment || 0) <= 0 || (o.payment || 0) >= (o.amount || 0)) return false;
      }

      return true;
    });
  }, [monthFilteredOrders, searchQuery, typeFilter, clientFilter, paymentFilter]);

  // Общее количество заказов для вкладки "Все" (не зависит от выбранного typeFilter)
  const allTypeCount = useMemo(() => {
    return monthFilteredOrders.filter((o) => {
      // 1. Поиск
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().replace('#', '').trim();
        const matchesTitle = o.title?.toLowerCase().includes(q);
        const matchesClientName = o.client_name?.toLowerCase().includes(q);
        const matchesClient = o.client?.toLowerCase().includes(q);
        const matchesContact = o.contact?.toLowerCase().includes(q) || o.contacts?.some(c => c.value?.toLowerCase().includes(q));
        const matchesNum = String(o.order_number || '').includes(q);
        const matchesNotes = o.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesClientName && !matchesClient && !matchesContact && !matchesNum && !matchesNotes) {
          return false;
        }
      }

      // 2. Канал клиента
      if (clientFilter !== 'all' && o.client !== clientFilter) {
        return false;
      }

      // 3. Оплата
      if (paymentFilter === 'paid') {
        if (o.type === 'income' && (o.payment || 0) < (o.amount || 0)) return false;
      }
      if (paymentFilter === 'unpaid') {
        if (o.type !== 'income' || (o.payment || 0) >= (o.amount || 0)) return false;
      }
      if (paymentFilter === 'partial') {
        if (o.type !== 'income' || (o.payment || 0) <= 0 || (o.payment || 0) >= (o.amount || 0)) return false;
      }

      return true;
    }).length;
  }, [monthFilteredOrders, searchQuery, clientFilter, paymentFilter]);

  // Сброс порции видимых заказов при переключении месяца или фильтров для мгновенного отклика
  useEffect(() => {
    queueMicrotask(() => setVisibleCount(ORDERS_CHUNK_SIZE));
  }, [selectedMonthKey, searchQuery, typeFilter, clientFilter, paymentFilter]);

  // Сортировка
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      if (sortField === 'net_profit') {
        aValue = a.type === 'income' ? (a.amount || 0) - (a.cost || 0) : -(a.amount || 0);
        bValue = b.type === 'income' ? (b.amount || 0) - (b.cost || 0) : -(b.amount || 0);
      } else if (sortField === 'debt') {
        aValue = a.type === 'income' ? Math.max(0, (a.amount || 0) - (a.payment || 0)) : 0;
        bValue = b.type === 'income' ? Math.max(0, (b.amount || 0) - (b.payment || 0)) : 0;
      } else if (sortField === 'payment_status') {
        const getP = (o: Order) => ((o.payment || 0) >= (o.amount || 0) ? 2 : (o.payment || 0) > 0 ? 1 : 0);
        aValue = getP(a);
        bValue = getP(b);
      } else if (sortField === 'client_name' || sortField === 'client') {
        aValue = a.client_name || a.contact || (a.type === 'income' ? 'Частный заказчик' : a.client) || '';
        bValue = b.client_name || b.contact || (b.type === 'income' ? 'Частный заказчик' : b.client) || '';
      } else {
        aValue = a[sortField as keyof Order] ?? '';
        bValue = b[sortField as keyof Order] ?? '';
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (sortField === 'date' || sortField === 'deadline') {
        const parseDate = (val: unknown) => {
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
    const duplicated = {
      ...order,
      id: undefined,
      order_number: undefined,
      title: `${order.title} (копия)`,
      created_at: new Date().toISOString(),
    };
    const saved = await saveOrder(duplicated);
    setOrders(prev => [saved, ...prev]);
    showSuccess(`Заказ #${saved.order_number} продублирован`, 'Заказ');
  };

  // Прямое инлайн-обновление полей заказа из таблицы
  const handleInlineUpdateOrder = useCallback(async (orderId: string, updates: Partial<Order>) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    pushToHistory(orders);
    const updated: Order = { ...targetOrder, ...updates };

    setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));
    await saveOrder(updated);
    window.dispatchEvent(new Event('orders_updated'));
  }, [orders, pushToHistory, setOrders]);

  // Удаление одной записи
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    pushToHistory(orders);
    await deleteOrder(orderToDelete.id);
    setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
    showInfo(`Запись #${orderToDelete.order_number || ''} удалена (Alt+Z для отмены)`, 'Удаление');
    setOrderToDelete(null);
    window.dispatchEvent(new Event('orders_updated'));
  };

  // Очистка месяца или всех заказов
  const handleConfirmClearMonth = async () => {
    if (selectedMonthKey === 'all') {
      if (orders.length === 0) return;
      pushToHistory(orders);
      await deleteOrders(orders.map(order => order.id));
      setOrders([]);
      showInfo('Все записи журнала заказов очищены (Alt+Z для отмены)', 'Очистка');
      setIsClearMonthModalOpen(false);
      window.dispatchEvent(new Event('orders_updated'));
      return;
    }

    const idsToDelete = monthFilteredOrders.map(o => o.id);
    if (idsToDelete.length === 0) return;

    pushToHistory(orders);
    await deleteOrders(idsToDelete);
    setOrders(prev => prev.filter(o => getOrderMonthKey(o) !== selectedMonthKey));
    showInfo(`Все записи за ${formatMonthKeyLabel(selectedMonthKey)} очищены (Alt+Z для отмены)`, 'Очистка месяца');
    setIsClearMonthModalOpen(false);
    window.dispatchEvent(new Event('orders_updated'));
  };

  // Открытие модалки редактирования
  const handleOpenEditModal = (order: Order) => {
    openOrder(order);
  };

  // Открытие модалки создания нового заказа
  const handleOpenAddModal = () => {
    openOrder();
  };

  // Быстрое изменение статуса
  const handleUpdateStatus = async (order: Order, newStatus: OrderStatus) => {
    pushToHistory(orders);
    const updated: Order = { ...order, status: newStatus };
    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    await saveOrder(updated);
    showSuccess(`Статус заказа #${order.order_number} изменен на «${newStatus}»`, 'Статус');
  };

  // Переключение типа (Доход / Расход)
  const handleToggleType = async (order: Order) => {
    pushToHistory(orders);
    const newType = order.type === 'income' ? 'expense' : 'income';
    const updated: Order = { ...order, type: newType };
    setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
    await saveOrder(updated);
    showSuccess(`Тип записи #${order.order_number} изменен на ${newType === 'income' ? '«Доход»' : '«Расход»'}`, 'Тип записи');
  };

  return (
    <div className="space-y-4">
      {/* КОНСОЛЬ ЗАКАЗОВ V2 (ЕДИНАЯ ВЕРСИЯ С ИНЛАЙН-РЕДАКТИРОВАНИЕМ) */}
      <OrdersV2View
        isOnline={isOnline}
        orders={orders}
        sortedOrders={sortedOrders}
        visibleOrders={visibleOrders}
        visibleCount={visibleCount}
        totalOrdersCount={sortedOrders.length}
        onLoadMore={() => setVisibleCount(prev => Math.min(prev + ORDERS_CHUNK_SIZE, sortedOrders.length))}
        onShowAll={() => setVisibleCount(sortedOrders.length)}
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        netProfitTotal={netProfitTotal}
        totalMarginPercent={totalMarginPercent}
        inProgressCount={inProgressCount}
        printingCount={printingCount}
        waitingCount={waitingCount}
        completedCount={completedCount}
        incomeOrdersCount={incomeOrdersCount}
        unpaidSum={unpaidSum}
        unpaidOrdersCount={unpaidOrdersCount}
        expenseCount={expenseCount}
        currentMonthGoal={currentMonthGoal}
        onOpenGoalModal={() => setIsGoalModalOpen(true)}
        selectedMonthKey={selectedMonthKey}
        setSelectedMonthKey={setSelectedMonthKey}
        availableMonthKeys={availableMonthKeys}
        handlePrevMonth={handlePrevMonth}
        handleNextMonth={handleNextMonth}
        monthOrdersCount={monthFilteredOrders.length}
        onOpenClearMonthModal={() => setIsClearMonthModalOpen(true)}
        onOpenNewMonthModal={() => setIsOpenNewMonthModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        savedCalculations={savedCalculations}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        clientFilter={clientFilter}
        setClientFilter={setClientFilter}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        totalFilteredCount={allTypeCount}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        onOpenEditModal={handleOpenEditModal}
        onOpenAddModal={handleOpenAddModal}
        onUpdateStatus={handleUpdateStatus}
        onToggleType={handleToggleType}
        onDuplicateOrder={handleDuplicateOrder}
        onRequestDelete={(order) => setOrderToDelete(order)}
        onInlineUpdate={handleInlineUpdateOrder}
        isExpanded={isExpanded}
        onToggleExpand={handleToggleExpand}
        onResetFilters={handleResetFilters}
        onUndo={handleUndo}
        canUndo={historyStack.length > 0}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        contextMenuRef={contextMenuRef}
        onCopyContact={(text) => {
          navigator.clipboard.writeText(text);
          showSuccess(`Контакт скопирован: ${text}`, 'Буфер обмена');
        }}
      />

      {/* МОДАЛЬНЫЕ ОКНА */}
      
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

      {/* Модальное окно открытия нового месяца */}
      <OpenNewMonthModal
        isOpen={isOpenNewMonthModalOpen}
        onClose={() => setIsOpenNewMonthModalOpen(false)}
        onSelectMonth={handleOpenNewMonth}
        selectedMonthKey={selectedMonthKey}
        orders={orders}
      />

      {/* Модальное окно настройки цели на месяц */}
      <GoalSettingsModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        currentGoal={currentMonthGoal}
        selectedMonthKey={selectedMonthKey}
        monthLabel={formatMonthKeyLabel(selectedMonthKey)}
        onSave={handleSaveGoal}
        currentProfit={netProfitTotal}
      />
    </div>
  );
}
