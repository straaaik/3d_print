'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Order } from '../../widgets/Orders/types';
import { saveOrder, getOrders } from '../../shared/api/db';
import { useToast } from './ToastProvider';
import { useData } from './DataProvider';
import { OrderFormModal } from '../../widgets/Orders/components/OrderFormModal';
import { MinimizedDraftsStack, MinimizedDraft } from '../../widgets/Orders/components/MinimizedDraftsStack';

const MAX_MINIMIZED_DRAFTS = 5;

interface OrderModalContextType {
  isModalOpen: boolean;
  activeOrder: Partial<Order> | null;
  setActiveOrder: React.Dispatch<React.SetStateAction<Partial<Order> | null>>;
  minimizedDrafts: MinimizedDraft[];
  openOrder: (order?: Partial<Order> | null) => void;
  minimizeCurrentOrder: () => void;
  restoreDraft: (draftId: string) => void;
  discardDraft: (draftId: string) => void;
  closeActiveModal: () => void;
  saveCurrentOrder: (e?: React.FormEvent) => Promise<Order | null>;
}

const OrderModalContext = createContext<OrderModalContextType | undefined>(undefined);

export function OrderModalProvider({ children }: { children: React.ReactNode }) {
  const { savedCalculations } = useData();
  const { showWarning, showToast, showSuccess } = useToast();

  const [activeOrder, setActiveOrder] = useState<Partial<Order> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [minimizedDrafts, setMinimizedDrafts] = useState<MinimizedDraft[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  // Загрузка всех заказов для автозаполнения
  useEffect(() => {
    getOrders().then(data => {
      if (Array.isArray(data)) {
        setAllOrders(data);
      }
    }).catch(console.error);
  }, [isModalOpen]);

  // Открытие модалки создания/редактирования
  const openOrder = useCallback((orderToOpen?: Partial<Order> | null) => {
    if (orderToOpen) {
      setActiveOrder({ ...orderToOpen });
    } else {
      const today = new Date();
      const formattedDate = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
      setActiveOrder({
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
        status: 'Ждет печати',
        notes: '',
      });
    }
    setIsModalOpen(true);
  }, []);

  // Сворачивание текущего открытого черновика
  const minimizeCurrentOrder = useCallback(() => {
    if (!activeOrder) return;

    if (minimizedDrafts.length >= MAX_MINIMIZED_DRAFTS) {
      showWarning(`⚠️ Достигнут лимит: максимум ${MAX_MINIMIZED_DRAFTS} свёрнутых черновиков. Разверните или закройте один из них.`);
      return;
    }

    const draftId = activeOrder.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Math.random()));
    const newDraft: MinimizedDraft = {
      id: draftId,
      order: { ...activeOrder },
      savedAt: Date.now(),
    };

    setMinimizedDrafts(prev => [...prev, newDraft]);
    setIsModalOpen(false);
    setActiveOrder(null);
    showToast('Черновик свёрнут');
  }, [activeOrder, minimizedDrafts.length, showWarning, showToast]);

  // Разворачивание черновика из стека
  const restoreDraft = useCallback((draftId: string) => {
    const draftIndex = minimizedDrafts.findIndex(d => d.id === draftId);
    if (draftIndex === -1) return;

    const draftToRestore = minimizedDrafts[draftIndex];

    // Если сейчас уже открыта модалка с другим заказом — сворачиваем его автоматически
    if (isModalOpen && activeOrder) {
      if (minimizedDrafts.length >= MAX_MINIMIZED_DRAFTS) {
        showWarning(`Достигнут лимит (${MAX_MINIMIZED_DRAFTS}). Сначала закройте или сохраните текущий заказ.`);
        return;
      }
      const currentDraftId = activeOrder.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Math.random()));
      const currentDraft: MinimizedDraft = {
        id: currentDraftId,
        order: { ...activeOrder },
        savedAt: Date.now(),
      };
      setMinimizedDrafts(prev => [...prev.filter(d => d.id !== draftId), currentDraft]);
    } else {
      setMinimizedDrafts(prev => prev.filter(d => d.id !== draftId));
    }

    setActiveOrder({ ...draftToRestore.order });
    setIsModalOpen(true);
  }, [minimizedDrafts, isModalOpen, activeOrder, showWarning]);

  // Удаление черновика из стека
  const discardDraft = useCallback((draftId: string) => {
    setMinimizedDrafts(prev => prev.filter(d => d.id !== draftId));
    showToast('Черновик закрыт');
  }, [showToast]);

  // Закрытие активной модалки
  const closeActiveModal = useCallback(() => {
    setIsModalOpen(false);
    setActiveOrder(null);
  }, []);

  // Сохранение заказа из активной модалки
  const saveCurrentOrder = useCallback(async (e?: React.FormEvent): Promise<Order | null> => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeOrder) return null;

    try {
      const isEdit = Boolean(activeOrder.id);
      let orderToSave: Order;

      if (isEdit) {
        orderToSave = activeOrder as Order;
      } else {
        const maxNum = allOrders.reduce((max, o) => Math.max(max, o.order_number || 0), 1000);
        orderToSave = {
          ...(activeOrder as Order),
          id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
          order_number: maxNum + 1,
          created_at: new Date().toISOString(),
        };
      }

      const saved = await saveOrder(orderToSave);

      setAllOrders(prev => {
        if (isEdit) {
          return prev.map(o => (o.id === saved.id ? saved : o));
        }
        return [saved, ...prev];
      });

      // Также удаляем из черновиков, если совпадает ID
      if (saved.id) {
        setMinimizedDrafts(prev => prev.filter(d => d.id !== saved.id && d.order.id !== saved.id));
      }

      setIsModalOpen(false);
      setActiveOrder(null);
      showSuccess(isEdit ? `Заказ #${saved.order_number} обновлен` : `Создан заказ #${saved.order_number}`);

      // Dispatch custom event for pages to update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('orders_updated', { detail: saved }));
      }

      return saved;
    } catch (err) {
      console.error('Ошибка сохранения заказа:', err);
      return null;
    }
  }, [activeOrder, allOrders, showSuccess]);

  return (
    <OrderModalContext.Provider
      value={{
        isModalOpen,
        activeOrder,
        setActiveOrder,
        minimizedDrafts,
        openOrder,
        minimizeCurrentOrder,
        restoreDraft,
        discardDraft,
        closeActiveModal,
        saveCurrentOrder,
      }}
    >
      {children}

      {/* Глобальное модальное окно заказа/расхода */}
      <OrderFormModal
        isOpen={isModalOpen}
        onClose={closeActiveModal}
        onMinimize={minimizeCurrentOrder}
        order={activeOrder}
        setOrder={setActiveOrder}
        onSave={saveCurrentOrder}
        savedCalculations={savedCalculations || []}
        allOrders={allOrders}
      />

      {/* Глобальный стек свёрнутых черновиков */}
      <MinimizedDraftsStack
        drafts={minimizedDrafts}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />
    </OrderModalContext.Provider>
  );
}

export function useOrderModal() {
  const context = useContext(OrderModalContext);
  if (context === undefined) {
    throw new Error('useOrderModal должен использоваться внутри OrderModalProvider');
  }
  return context;
}
