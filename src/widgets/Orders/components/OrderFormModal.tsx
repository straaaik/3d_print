'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Order, 
  OrderStatus, 
  CostItem, 
  SavedCalculation 
} from '../types';
import { 
  ALL_STATUSES, 
  STATUS_CONFIG, 
  ALL_CLIENTS, 
  CLIENT_CONFIG 
} from '../types';
import { 
  formatMoney, 
  roundTo2, 
  calculateOrderFinancials 
} from '../helpers';
import { DEFAULT_COST_CATEGORIES, getCategoryConfig } from '../../../shared/lib/costCategories';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select, SelectOption } from '../../../shared/ui/Select';
import { DatePicker } from '../../../shared/ui/DatePicker';
import { NumberCounter } from '../../../shared/ui/NumberCounter';
import { 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight, 
  Package, 
  ChevronUp, 
  ChevronDown, 
  Search, 
  DollarSign, 
  Flame, 
  Tag, 
  Receipt, 
  Plus, 
  Trash2, 
  PhoneCall, 
  NotebookPen, 
  Check, 
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  TrendingUp,
  CreditCard,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_OPTIONS: SelectOption[] = ALL_STATUSES.map(st => {
  const cfg = STATUS_CONFIG[st];
  return {
    value: st,
    label: cfg.label,
    icon: cfg.icon,
    iconColor: cfg.color,
    badgeStyle: cfg.badgeStyle,
  };
});

const CLIENT_OPTIONS: SelectOption[] = ALL_CLIENTS.map(cl => {
  const cfg = CLIENT_CONFIG[cl];
  return {
    value: cl,
    label: cfg.label,
    icon: cfg.icon,
    badgeStyle: cfg.badgeStyle,
  };
});

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Partial<Order> | null;
  setOrder: React.Dispatch<React.SetStateAction<Partial<Order> | null>>;
  onSave: (e: React.FormEvent) => void;
  savedCalculations: SavedCalculation[];
}

export function OrderFormModal({
  isOpen,
  onClose,
  order,
  setOrder,
  onSave,
  savedCalculations,
}: OrderFormModalProps) {
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const initialSnapshotRef = useRef<string>('');
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false;
      if (order) {
        initialSnapshotRef.current = JSON.stringify(order);
      }
    }
  }, [isOpen, order?.id]);

  const hasUnsavedChanges = useMemo(() => {
    if (!isOpen || !order || !initialSnapshotRef.current) return false;
    return JSON.stringify(order) !== initialSnapshotRef.current;
  }, [isOpen, order]);

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

  if (!order) return null;

  const isIncome = order.type === 'income' || (!order.type && true);
  const financials = calculateOrderFinancials(order);
  const totalAmount = financials.finalAmount || 0;
  const costVal = order.cost || 0;
  const profitVal = roundTo2(isIncome ? totalAmount - costVal : -totalAmount);
  const remainingDebt = Math.max(0, roundTo2(totalAmount - (order.payment || 0)));
  const marginPercent = totalAmount > 0 && isIncome ? (profitVal / totalAmount) * 100 : 0;
  const isFullyPaid = isIncome && (order.payment || 0) >= totalAmount && totalAmount > 0;

  // Категории готовых товаров
  const productCategories = Array.from(
    new Set((savedCalculations || []).map(p => p.category || 'Разное'))
  );

  const filteredProducts = (savedCalculations || []).filter(item => {
    if (selectedCategoryFilter !== 'all' && (item.category || 'Разное') !== selectedCategoryFilter) {
      return false;
    }
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
    const wasFullyPaid = (order.payment || 0) >= (order.amount || 0) && (order.amount || 0) > 0;

    const newFin = calculateOrderFinancials({
      ...order,
      base_amount: newBase,
    });

    const newPayment = wasFullyPaid ? newFin.finalAmount : (order.payment || 0);

    setOrder({
      ...order,
      base_amount: newBase,
      amount: newFin.finalAmount,
      payment: newPayment,
      payments: wasFullyPaid ? [newPayment] : order.payments,
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
    const wasFullyPaid = (order.payment || 0) >= (order.amount || 0) && (order.amount || 0) > 0;
    const newPayment = wasFullyPaid ? newFin.finalAmount : (order.payment || 0);

    setOrder({
      ...updated,
      amount: newFin.finalAmount,
      payment: newPayment,
      payments: wasFullyPaid ? [newPayment] : order.payments,
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
    const wasFullyPaid = (order.payment || 0) >= (order.amount || 0) && (order.amount || 0) > 0;
    const newPayment = wasFullyPaid ? newFin.finalAmount : (order.payment || 0);

    setOrder({
      ...updated,
      amount: newFin.finalAmount,
      payment: newPayment,
      payments: wasFullyPaid ? [newPayment] : order.payments,
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
      urgency_amount: order.urgency_type === 'fixed' ? roundTo2((order.urgency_amount || 0) * ratio) : order.urgency_amount,
      discount_amount: order.discount_type === 'fixed' ? roundTo2((order.discount_amount || 0) * ratio) : order.discount_amount,
    });

    const newAmount = newFin.finalAmount;
    const currentCost = order.cost || 0;
    const currentPayment = order.payment || 0;
    const newCost = roundTo2(currentCost * ratio);
    const wasFullyPaid = currentPayment >= (order.amount || 0) && (order.amount || 0) > 0;
    const newPayment = wasFullyPaid ? newAmount : roundTo2(currentPayment * ratio);
    const newPayments = (order.payments || []).map(p => roundTo2(p * ratio));

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
      payment: newPayment,
      payments: newPayments.length > 0 ? newPayments : (newPayment > 0 ? [newPayment] : []),
      cost_items: newCostItems,
    });
  };

  const handleApplyDeadlinePreset = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    const formatted = `${String(target.getDate()).padStart(2, '0')}.${String(target.getMonth() + 1).padStart(2, '0')}.${target.getFullYear()}`;
    setOrder({ ...order, deadline: formatted });
  };

  const handleApplyPaymentPreset = (ratio: number) => {
    const targetPayment = roundTo2(totalAmount * ratio);
    setOrder({
      ...order,
      payment: targetPayment,
      payments: targetPayment > 0 ? [targetPayment] : [],
    });
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
        id: typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Math.random()),
        category: 'Печать',
        amount: cost,
        note: `Товар «${prod.name}» (${prod.filament_name || 'Пластик'})`,
      });
    }

    // Дедлайн по умолчанию (+2 дня)
    const inDays = new Date();
    inDays.setDate(inDays.getDate() + 2);
    const deadlineStr = `${String(inDays.getDate()).padStart(2, '0')}.${String(inDays.getMonth() + 1).padStart(2, '0')}.${inDays.getFullYear()}`;

    const newFin = calculateOrderFinancials({
      ...order,
      base_amount: amount,
    });

    setOrder({
      ...order,
      product_id: prod.id,
      title: prod.name,
      base_amount: amount,
      amount: newFin.finalAmount,
      cost,
      cost_items: populatedCostItems,
      payments: [newFin.finalAmount],
      payment: newFin.finalAmount,
      deadline: order.deadline || deadlineStr,
      notes: `Товар: ${prod.name} (${prod.filament_name || 'Пластик'}, ${orderQty} шт)`,
    });

    setIsProductSelectorOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, boolean> = {};

    if (!order.title || !order.title.trim()) {
      errors.title = true;
    }
    if (order.amount === undefined || order.amount === null || isNaN(order.amount) || order.amount <= 0) {
      errors.amount = true;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    onSave(e);
  };

  return (
    <Modal
      isOpen={isOpen && !!order}
      onClose={handleAttemptClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#FF6B00]/15 text-[#FF8800] border border-[#FF6B00]/30 shrink-0">
            {order?.id ? <ShoppingBag className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base sm:text-lg">
                {order?.id
                  ? (!isIncome ? `Редактирование расхода` : `Редактирование заказа`)
                  : (!isIncome ? 'Новый операционный расход' : 'Новый заказ на 3D-печать')}
              </span>
              {order?.order_number && (
                <span className="font-mono text-xs font-bold text-[#FF8800] bg-[#FF6B00]/15 border border-[#FF6B00]/30 px-2 py-0.5 rounded-lg">
                  #{order.order_number}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-normal">
              {isIncome ? 'Параметры изделия, сроки, клиент и ценообразование' : 'Фиксация производственных или административных затрат'}
            </p>
          </div>
        </div>
      }
      maxWidth="3xl"
    >
      {order && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs sm:text-sm">
          {/* 1. Переключатель типа операции: Доход vs Расход */}
          <div className="p-1 bg-[#0d0e12] border border-[#242930] rounded-2xl flex items-center gap-1 select-none shadow-inner">
            <button
              type="button"
              onClick={() => setOrder({ ...order, type: 'income' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isIncome
                  ? 'bg-gradient-to-r from-emerald-600/30 to-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#16181d]'
              }`}
            >
              <ArrowUpRight className={`w-4 h-4 ${isIncome ? 'text-emerald-400' : 'text-gray-400'}`} />
              <span>Заказ на 3D-печать (Доход)</span>
            </button>

            <button
              type="button"
              onClick={() => setOrder({ ...order, type: 'expense' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                !isIncome
                  ? 'bg-gradient-to-r from-rose-600/30 to-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#16181d]'
              }`}
            >
              <ArrowDownRight className={`w-4 h-4 ${!isIncome ? 'text-rose-400' : 'text-gray-400'}`} />
              <span>Операционный расход (Затраты)</span>
            </button>
          </div>

          {/* 2. Блок: Изделие и параметры заказа */}
          <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#242930] pb-3">
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#FF8800]" />
                {isIncome ? 'Параметры изделия и сроки' : 'Детали расхода'}
              </span>

              {isIncome && savedCalculations && savedCalculations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsProductSelectorOpen(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1a1d24] text-[#FF8800] border border-[#FF6B00]/40 hover:bg-[#FF6B00]/15 transition-all cursor-pointer shadow-sm"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>{isProductSelectorOpen ? 'Скрыть каталог' : `Выбрать из каталога товаров (${savedCalculations.length})`}</span>
                  {isProductSelectorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Быстрый каталог товаров раскрывающийся */}
            <AnimatePresence>
              {isProductSelectorOpen && isIncome && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-[#0d0e12] border border-[#242930] rounded-2xl p-3.5 space-y-3 shadow-inner">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Поиск товара по названию, пластику или категории..."
                          value={productSearchQuery}
                          onChange={e => setProductSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[#16181d] border border-[#242930] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
                        />
                      </div>

                      {productCategories.length > 1 && (
                        <select
                          value={selectedCategoryFilter}
                          onChange={e => setSelectedCategoryFilter(e.target.value)}
                          className="bg-[#16181d] text-gray-300 border border-[#242930] rounded-xl px-2.5 py-2 text-xs font-medium focus:outline-none"
                        >
                          <option value="all">Все категории</option>
                          {productCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                      {filteredProducts.length === 0 ? (
                        <p className="text-center text-xs text-gray-500 py-4">Товары не найдены</p>
                      ) : (
                        filteredProducts.map(prod => (
                          <div
                            key={prod.id}
                            onClick={() => handleSelectProduct(prod)}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#16181d] border border-[#242930] hover:border-[#FF6B00] hover:bg-[#1a1d24] transition-all cursor-pointer text-xs group"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {prod.collection_name && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0 flex items-center gap-1">
                                    <Layers size={10} /> {prod.collection_name}
                                  </span>
                                )}
                                <span className="font-bold text-white group-hover:text-[#FF8800] transition-colors truncate block">
                                  {prod.name}
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-400">
                                {prod.category || 'Разное'} • {prod.filament_name || 'Пластик'} • {prod.hours || 0} ч печати
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-[#FF8800] block text-xs sm:text-sm">
                                {formatMoney(prod.final_price || prod.base_cost || 0)}
                              </span>
                              <span className="text-[10px] text-gray-500">Себестоимость: {formatMoney(prod.base_cost || 0)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
              <div className={isIncome ? "sm:col-span-6" : "sm:col-span-8"}>
                <Input
                  label="Наименование *"
                  placeholder={isIncome ? "Напр. Фигурка Ведьмака 25см" : "Напр. Пластик PETG 5 кг"}
                  value={order.title || ''}
                  onChange={e => setOrder({ ...order, title: e.target.value })}
                  error={formErrors.title ? "Введите наименование" : undefined}
                />
              </div>

              {isIncome && (
                <div className="sm:col-span-3">
                  <NumberCounter
                    label="Тираж (шт)"
                    value={order.quantity || 1}
                    onChange={handleQuantityChange}
                    min={1}
                    max={9999}
                  />
                </div>
              )}

              <div className={isIncome ? "sm:col-span-3" : "sm:col-span-4"}>
                <Select
                  label="Статус производства"
                  variant="default"
                  options={STATUS_OPTIONS}
                  value={order.status || 'Не в работе'}
                  onChange={val => setOrder({ ...order, status: val as OrderStatus })}
                />
              </div>
            </div>

            {/* Даты и Дедлайн */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-1 items-start">
              <div className="sm:col-span-4">
                <DatePicker
                  label="Дата заказа"
                  value={order.date || ''}
                  onChange={newDate => setOrder({ ...order, date: newDate })}
                  format="DD.MM.YYYY"
                />
              </div>

              {isIncome && (
                <div className="sm:col-span-8 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 text-xs sm:text-sm font-medium select-none flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Срок сдачи (Дедлайн)
                    </label>
                    {order.deadline && (
                      <button
                        type="button"
                        onClick={() => setOrder({ ...order, deadline: '' })}
                        className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Очистить срок
                      </button>
                    )}
                  </div>

                  <DatePicker
                    value={order.deadline || ''}
                    onChange={newDate => setOrder({ ...order, deadline: newDate })}
                    format="DD.MM.YYYY"
                  />

                  {/* Быстрые чипсы дедлайна без горизонтального скролла */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleApplyDeadlinePreset(1)}
                      className="px-2.5 py-1 rounded-lg bg-[#0d0e12] border border-[#242930] hover:border-amber-500/40 text-gray-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
                    >
                      Завтра (+1д)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDeadlinePreset(2)}
                      className="px-2.5 py-1 rounded-lg bg-[#0d0e12] border border-[#242930] hover:border-amber-500/40 text-gray-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
                    >
                      +2 дня
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDeadlinePreset(3)}
                      className="px-2.5 py-1 rounded-lg bg-[#0d0e12] border border-[#242930] hover:border-amber-500/40 text-gray-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
                    >
                      +3 дня
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDeadlinePreset(7)}
                      className="px-2.5 py-1 rounded-lg bg-[#0d0e12] border border-[#242930] hover:border-amber-500/40 text-gray-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
                    >
                      +1 неделя
                    </button>
                    {order.deadline && (
                      <button
                        type="button"
                        onClick={() => setOrder({ ...order, deadline: '' })}
                        className="px-2.5 py-1 rounded-lg bg-[#0d0e12] border border-rose-500/30 text-rose-400 hover:bg-rose-950/30 text-xs font-medium cursor-pointer transition-colors"
                      >
                        Без дедлайна
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Блок: Клиент и канал продаж */}
          {isIncome && (
            <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2 border-b border-[#242930] pb-2">
                <PhoneCall className="w-4 h-4 text-sky-400" />
                Клиент и канал продаж
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
                <div className="sm:col-span-5">
                  <Select
                    label="Канал продаж"
                    options={CLIENT_OPTIONS}
                    value={order.client || 'Авито'}
                    onChange={val => setOrder({ ...order, client: val })}
                  />
                </div>

                <div className="sm:col-span-7">
                  <Input
                    label="Основной контакт"
                    placeholder="+7 900 000-00-00, @username или ссылка..."
                    value={order.contact || ''}
                    onChange={e => setOrder({ ...order, contact: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Блок: Финансы, ценообразование и оплата */}
          <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#242930] pb-2.5">
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                {isIncome ? 'Финансы, скидки и маржинальность' : 'Сумма расхода'}
              </span>

              {isIncome && (
                <div className="flex items-center gap-2.5 font-mono text-xs">
                  <span className="text-gray-400">
                    Прибыль: <strong className={profitVal >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {profitVal >= 0 ? `+${formatMoney(profitVal)}` : formatMoney(profitVal)}
                    </strong>
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                    marginPercent >= 50
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : marginPercent >= 20
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                    {marginPercent.toFixed(0)}% маржа
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
              <div className={isIncome ? "sm:col-span-4" : "sm:col-span-12"}>
                <Input
                  label={isIncome ? "Базовая цена (₽) *" : "Сумма расхода (₽) *"}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={isIncome ? (order.base_amount !== undefined ? order.base_amount : (order.amount || '')) : (order.amount || '')}
                  onChange={e => {
                    if (!isIncome) {
                      const val = parseFloat(e.target.value) || 0;
                      setOrder({ ...order, amount: val });
                    } else {
                      handleUpdateBaseAmount(e.target.value);
                    }
                  }}
                  error={formErrors.amount ? "Укажите сумму больше 0" : undefined}
                />
              </div>

              {isIncome && (
                <>
                  <div className="sm:col-span-4">
                    <Input
                      label="Себестоимость (₽)"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={order.cost || ''}
                      onChange={e => {
                        const num = parseFloat(e.target.value) || 0;
                        setOrder({
                          ...order,
                          cost: num,
                          cost_items: (order.cost_items && order.cost_items.length > 0)
                            ? order.cost_items
                            : (num > 0 ? [{ id: 'init-1', category: 'Печать', amount: num }] : []),
                        });
                      }}
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <Input
                      label="Внесенная оплата (₽)"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={order.payment || ''}
                      onChange={e => {
                        const num = parseFloat(e.target.value) || 0;
                        setOrder({
                          ...order,
                          payment: num,
                          payments: [num],
                        });
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Наценки за срочность и скидки */}
            {isIncome && (
              <div className="p-3.5 bg-[#0d0e12] border border-[#242930] rounded-xl space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Срочность */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                        <Flame size={13} className="text-orange-400" /> Наценка за срочность:
                      </span>
                      <span className="text-[11px] text-orange-300 font-mono font-bold">
                        {order.urgency_percent ? `+${order.urgency_percent}%` : order.urgency_amount ? `+${order.urgency_amount} ₽` : '0%'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[0, 25, 50, 100].map(pct => {
                        const isSel = (order.urgency_percent === pct && !order.urgency_amount) || (pct === 0 && !order.urgency_percent && !order.urgency_amount);
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleApplyUrgency('percent', pct)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              isSel
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-[#16181d] text-gray-400 border border-[#242930] hover:text-white'
                            }`}
                          >
                            {pct === 0 ? '0%' : `+${pct}%`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Скидка */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                        <Tag size={13} className="text-emerald-400" /> Скидка клиенту:
                      </span>
                      <span className="text-[11px] text-emerald-300 font-mono font-bold">
                        {order.discount_percent ? `-${order.discount_percent}%` : order.discount_amount ? `-${order.discount_amount} ₽` : '0%'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[0, 5, 10, 15, 20].map(pct => {
                        const isSel = (order.discount_percent === pct && !order.discount_amount) || (pct === 0 && !order.discount_percent && !order.discount_amount);
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleApplyDiscount('percent', pct)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              isSel
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-[#16181d] text-gray-400 border border-[#242930] hover:text-white'
                            }`}
                          >
                            {pct === 0 ? '0%' : `-${pct}%`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Быстрые кнопки оплаты */}
                <div className="pt-2 border-t border-[#242930] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 text-xs flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" /> Оплата:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyPaymentPreset(1)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isFullyPaid
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'bg-[#16181d] text-gray-300 border border-[#242930] hover:text-white'
                      }`}
                    >
                      100% Оплачен
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPaymentPreset(0.5)}
                      className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#16181d] text-gray-300 border border-[#242930] hover:text-white transition-all cursor-pointer"
                    >
                      50% Аванс
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPaymentPreset(0)}
                      className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#16181d] text-gray-300 border border-[#242930] hover:text-white transition-all cursor-pointer"
                    >
                      0 ₽ Без оплаты
                    </button>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-gray-400">Итого к оплате:</span>
                    <strong className="text-sm font-bold text-white px-2.5 py-0.5 rounded-lg bg-[#FF6B00]/20 text-[#FF8800] border border-[#FF6B00]/30 shadow-sm">
                      {formatMoney(totalAmount)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Блок: Технические примечания и заметки */}
          <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-sm">
            <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <NotebookPen className="w-4 h-4 text-[#FF8800]" />
              Примечания, технастройки и доставка
            </span>
            <textarea
              rows={2}
              placeholder="Цвет, высота слоя, сопло, настройки слайсера, адрес доставки или трек-номер CDEK/Почты..."
              value={order.notes || ''}
              onChange={e => setOrder({ ...order, notes: e.target.value })}
              className="w-full bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] rounded-xl p-3 text-xs text-white focus:outline-none resize-none leading-relaxed placeholder-gray-500"
            />
          </div>

          {/* Подвал модального окна */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#242930]">
            <Button variant="outline" size="md" type="button" onClick={handleAttemptClose}>
              Отмена
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              className="bg-gradient-to-r from-[#FF5500] to-[#FF8800] hover:from-[#FF6600] hover:to-[#FF9900] text-white font-bold px-6 shadow-lg shadow-[#FF6B00]/25 cursor-pointer"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {order.id ? 'Сохранить изменения' : 'Создать заказ'}
            </Button>
          </div>
        </form>
      )}

      {/* Окно подтверждения при выходе с несохраненными данными */}
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
                  В форме {order?.id ? `заказа #${order.order_number || ''}` : 'создания'} есть несохраненные данные. Что вы хотите сделать?
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1 border-t border-[#242930]">
                <button
                  type="button"
                  onClick={(e) => {
                    if (isClosingRef.current) return;
                    isClosingRef.current = true;
                    setShowUnsavedWarning(false);
                    handleSubmit(e);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
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
    </Modal>
  );
}
