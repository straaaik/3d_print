'use client';

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Order } from '../../widgets/Orders/types';
import { saveOrder, getOrders } from '../../shared/api/db';
import { useToast } from './ToastProvider';
import { useData } from './DataProvider';
import { useAuth } from './AuthProvider';
import { MinimizedDraftsStack, MinimizedDraft } from '../../widgets/Orders/components/MinimizedDraftsStack';
import { useInventory } from './InventoryProvider';
import { buildOrderItem, summarizeOrderItems } from '../../widgets/Orders/orderItems';
import { createProductionRecipe } from '../../shared/lib/productionRecipe';
import type { CalculationProjectOrderDraft } from '../../shared/lib/calculationProjects';

const OrderFormModal = dynamic(
  () => import('../../widgets/Orders/components/OrderFormModal').then(module => module.OrderFormModal),
  { ssr: false }
);

const MAX_MINIMIZED_DRAFTS = 5;
const ProjectOrderReviewModal = dynamic(
  () => import('../../widgets/Orders/components/ProjectOrderReviewModal').then(module => module.ProjectOrderReviewModal),
  { ssr: false }
);

interface OrderModalContextType {
  isModalOpen: boolean;
  activeOrder: Partial<Order> | null;
  setActiveOrder: React.Dispatch<React.SetStateAction<Partial<Order> | null>>;
  minimizedDrafts: MinimizedDraft[];
  openOrder: (order?: Partial<Order> | null) => void;
  openProjectOrder: (draft: CalculationProjectOrderDraft) => void;
  minimizeCurrentOrder: () => void;
  restoreDraft: (draftId: string) => void;
  discardDraft: (draftId: string) => void;
  closeActiveModal: () => void;
  saveCurrentOrder: (e?: React.FormEvent) => Promise<Order | null>;
}

const OrderModalContext = createContext<OrderModalContextType | undefined>(undefined);

export function OrderModalProvider({ children }: { children: React.ReactNode }) {
  const { savedCalculations, settings, filaments, printers } = useData();
  const inventory = useInventory();
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { showWarning, showToast, showSuccess } = useToast();

  const [activeOrder, setActiveOrder] = useState<Partial<Order> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [minimizedDrafts, setMinimizedDrafts] = useState<MinimizedDraft[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const isSavingRef = useRef(false);
  const [projectDraft, setProjectDraft] = useState<CalculationProjectOrderDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const activeOwner = useRef(currentUser?.id);
  useLayoutEffect(() => { activeOwner.current = currentUser?.id; }, [currentUser?.id]);
  useEffect(() => {
    queueMicrotask(() => {
      setActiveOrder(null);
      setProjectDraft(null);
      setMinimizedDrafts([]);
      setIsModalOpen(false);
    });
  }, [currentUser?.id]);

  // Заказы для автозаполнения загружаются только после авторизации и обновляются по событию.
  useEffect(() => {
    if (isAuthLoading) return;
    if (!currentUser) {
      queueMicrotask(() => setAllOrders([]));
      return;
    }

    const refreshOrders = () => {
      getOrders().then(data => {
        if (Array.isArray(data)) setAllOrders(data);
      }).catch(console.error);
    };
    refreshOrders();
    window.addEventListener('3d-data-synchronized', refreshOrders);
    return () => window.removeEventListener('3d-data-synchronized', refreshOrders);
  }, [currentUser, isAuthLoading]);

  // Открытие модалки создания/редактирования
  const openOrder = useCallback((orderToOpen?: Partial<Order> | null) => {
    setProjectDraft(null);
    if (orderToOpen) {
      const canonical = orderToOpen.id ? inventory.state?.legacyOrders?.find(row => row.id === orderToOpen.id) : undefined;
      const items = orderToOpen.id ? inventory.state?.orderItems.filter(row => row.order_id === orderToOpen.id && !row.archived) : undefined;
      if (!orderToOpen.id && orderToOpen.type !== 'expense' && !orderToOpen.items) {
        const product = savedCalculations.find(row => row.id === orderToOpen.product_id);
        if (product) {
          const sourceFilamentId = product.filament_id ?? product.calculation_snapshot?.inputs.filament?.id
            ?? filaments.find(row => row.name === product.filament_name && (!product.filament_color || row.color === product.filament_color))?.id;
          const variantId = inventory.state?.variants.find(row => row.id === sourceFilamentId || row.legacy_filament_id === sourceFilamentId)?.id;
          const recipe = product.type === 'assembly' && inventory.state
            ? createProductionRecipe(product, inventory.state, savedCalculations, filaments, printers, settings) : undefined;
          const item = buildOrderItem(product, orderToOpen.quantity ?? 1, { userId: currentUser?.id ?? 'anonymous',
            orderId: '', variantId, filaments, printers, settings, recipe });
          setActiveOrder(summarizeOrderItems({ ...orderToOpen, payments: [], payment: 0,
            discount_percent: 0, discount_amount: 0, urgency_percent: 0, urgency_amount: 0, agreed_price: null }, [item]));
        } else setActiveOrder({ ...structuredClone(orderToOpen), items: [], payments: [], payment: 0 });
      } else setActiveOrder(structuredClone({ ...orderToOpen, ...(canonical ? { cost: canonical.cost, order_revision: canonical.order_revision } : {}),
        ...(items?.length ? { items } : orderToOpen.items ? { items: orderToOpen.items } : {}) }));
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
        payments: [],
        items: [],
        agreed_price: null,
        payment: 0,
        client: 'Авито',
        client_name: '',
        contacts: [],
        contact: '',
        deadline: '',
        status: 'Ждет печати',
        notes: '',
      });
    }
    setIsModalOpen(true);
  }, [inventory.state, savedCalculations, filaments, printers, settings, currentUser?.id]);

  const openProjectOrder = useCallback((draft: CalculationProjectOrderDraft) => {
    const today = new Date().toLocaleDateString('ru-RU');
    setProjectDraft(structuredClone(draft));
    setActiveOrder({ ...structuredClone(draft.order), date: today, client: 'Сайт', client_name: '',
      contact: '', contacts: [], deadline: '', notes: '' });
    setIsModalOpen(true);
  }, []);

  // Сворачивание текущего открытого черновика
  const minimizeCurrentOrder = useCallback(() => {
    if (!activeOrder) return;

    if (minimizedDrafts.length >= MAX_MINIMIZED_DRAFTS) {
      showWarning(`⚠️ Достигнут лимит: максимум ${MAX_MINIMIZED_DRAFTS} свёрнутых черновиков. Разверните или закройте один из них.`);
      return;
    }

    const draftId = activeOrder.id || crypto.randomUUID();
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
      const currentDraftId = activeOrder.id || crypto.randomUUID();
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
    setProjectDraft(null);
  }, []);

  // Сохранение заказа из активной модалки
  const saveCurrentOrder = useCallback(async (e?: React.FormEvent): Promise<Order | null> => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeOrder || isSavingRef.current) return null;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const isEdit = Boolean(activeOrder.id) && !projectDraft;
      let saved: Order;
      if (projectDraft) {
        const id = crypto.randomUUID();
        const occurredAt = new Date().toISOString();
        const order = { ...activeOrder, id, user_id: currentUser?.id, created_at: occurredAt } as Order;
        const view = await inventory.execute({ kind: 'createProjectOrder', id: crypto.randomUUID(), occurredAt,
          order, draft: projectDraft, itemIds: projectDraft.items.map(() => crypto.randomUUID()) });
        saved = view.state.legacyOrders!.find(row => row.id === id)!;
      } else {
        saved = await saveOrder(activeOrder as Omit<Order, 'id'> & { id?: string });
      }
      if (activeOwner.current !== currentUser?.id) return saved;

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
      setProjectDraft(null);
      showSuccess(isEdit ? `Заказ #${saved.order_number} обновлен` : `Создан заказ #${saved.order_number}`);

      // Dispatch custom event for pages to update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('orders_updated', { detail: saved }));
      }

      return saved;
    } catch (err) {
      console.error('Ошибка сохранения заказа:', err);
      showWarning(err instanceof Error ? err.message : 'Не удалось сохранить заказ');
      return null;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [activeOrder, projectDraft, currentUser, inventory, showSuccess, showWarning]);

  return (
    <OrderModalContext.Provider
      value={{
        isModalOpen,
        activeOrder,
        setActiveOrder,
        minimizedDrafts,
        openOrder,
        openProjectOrder,
        minimizeCurrentOrder,
        restoreDraft,
        discardDraft,
        closeActiveModal,
        saveCurrentOrder,
      }}
    >
      {children}

      {/* Глобальное модальное окно заказа/расхода */}
      {isModalOpen && projectDraft?.order.user_id === currentUser?.id && projectDraft && activeOrder && <ProjectOrderReviewModal draft={projectDraft} order={activeOrder}
        onChange={setActiveOrder} onClose={closeActiveModal} onSave={saveCurrentOrder} isSaving={isSaving}
        currency={settings?.currency ?? '₽'} />}
      {isModalOpen && !projectDraft && (
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
      )}

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
