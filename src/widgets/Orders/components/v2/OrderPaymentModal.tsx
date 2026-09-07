'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Order,
  PaymentItem
} from '../../types';
import { formatMoney, roundTo2 } from '../../helpers';
import { formatOrderNumber } from './types';
import {

  Plus,
  Trash2,
  Calendar,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CockpitButton } from '@/shared/ui/CockpitButton';
import { Tooltip } from '@/shared/ui/Tooltip';

export interface OrderPaymentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: string, totalPayment: number, payments: PaymentItem[]) => void;
}

function getTodayFormatted(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}.${month}.${year}`;
}

function getInitialPaymentItems(order: Order): PaymentItem[] {
  const todayStr = getTodayFormatted();
  const orderId = order.id || 'draft';

  if (order.payments && order.payments.length > 0) {
    return order.payments.map((p, idx) => {
      if (typeof p === 'number') {
        return {
          id: `pay-${orderId}-${idx}`,
          amount: p,
          date: order.date || todayStr,
          note: idx === 0 ? 'Оплата' : `Платеж #${idx + 1}`,
        };
      }
      return {
        id: p.id || `pay-${orderId}-${idx}`,
        amount: p.amount || 0,
        date: p.date || order.date || todayStr,
        note: p.note || '',
      };
    });
  }

  if ((order.payment || 0) > 0) {
    return [{
      id: `pay-${orderId}-0`,
      amount: order.payment || 0,
      date: order.date || todayStr,
      note: 'Оплата заказа',
    }];
  }

  return [{
    id: `pay-${orderId}-0`,
    amount: 0,
    date: todayStr,
    note: '',
  }];
}

function createPaymentItemId(prefix = 'pay'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

type OrderPaymentModalContentProps = Omit<OrderPaymentModalProps, 'isOpen' | 'order'> & {
  order: Order;
};

function OrderPaymentModalContent({
  order,
  onClose,
  onSave,
}: OrderPaymentModalContentProps) {
  const [items, setItems] = useState<PaymentItem[]>(() => getInitialPaymentItems(order));
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Системное время для шапки модального окна
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} MSK`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const totalOrderAmount = order.amount || 0;
  const currentTotalPaid = roundTo2(
    items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  );
  const debt = Math.max(0, roundTo2(totalOrderAmount - currentTotalPaid));
  const paidPercent = totalOrderAmount > 0
    ? Math.min(100, Math.max(0, (currentTotalPaid / totalOrderAmount) * 100))
    : (currentTotalPaid > 0 ? 100 : 0);

  const handleUpdateItem = (index: number, updates: Partial<PaymentItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleAmountChange = (index: number, rawVal: string) => {
    const cleanStr = rawVal.replace(/\s+/g, '').replace(',', '.');
    const val = parseFloat(cleanStr);
    handleUpdateItem(index, { amount: isNaN(val) ? 0 : val });
  };

  const handleAddItem = (amount = 0, note = '') => {
    setItems((prev) => [
      ...prev,
      {
        id: createPaymentItemId(`pay-${prev.length}`),
        amount,
        date: getTodayFormatted(),
        note,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      // Если остался один элемент, просто обнуляем его
      setItems([{
        id: createPaymentItemId('pay-0'),
        amount: 0,
        date: getTodayFormatted(),
        note: '',
      }]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Пресеты
  const handleSetPresetFull = () => {
    setItems([{
      id: createPaymentItemId('pay-full'),
      amount: totalOrderAmount,
      date: getTodayFormatted(),
      note: 'Полная оплата (100%)',
    }]);
  };

  const handleSetPresetHalf = () => {
    setItems([{
      id: createPaymentItemId('pay-half'),
      amount: roundTo2(totalOrderAmount * 0.5),
      date: getTodayFormatted(),
      note: 'Предоплата 50%',
    }]);
  };

  const handleSetPresetZero = () => {
    setItems([{
      id: createPaymentItemId('pay-zero'),
      amount: 0,
      date: getTodayFormatted(),
      note: 'Не оплачен',
    }]);
  };

  const handleAddRemainingDebtPart = () => {
    if (debt <= 0) return;
    handleAddItem(debt, 'Доплата остатка');
  };

  const handleSave = () => {
    // Сохраняем все непустые платежи
    const cleaned = items.filter((it) => (it.amount || 0) > 0);
    const finalTotal = roundTo2(cleaned.reduce((s, it) => s + it.amount, 0));

    onSave(order.id, finalTotal, cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 select-none font-mono">
          {/* ФОНОВЫЙ БЛЮР */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md cursor-pointer"
          />

          {/* КОНТЕЙНЕР МОДАЛКИ (COCKPIT CONSOLE STYLE) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl bg-neutral-950/95 border border-white/20 rounded-2xl shadow-[0_25px_80px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl overflow-hidden text-xs flex flex-col max-h-[90vh]"
          >
            {/* 1. Верхняя панель (Cockpit Topbar: Red LED + Title + Live time) */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 bg-neutral-900/60 shrink-0 gap-3">
              {/* Левая часть: красный терминальный кружок закрытия + заголовок раздела */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip content="Закрыть окно">
                    <button
                      type="button"
                      onClick={onClose}
                      title="Закрыть окно"
                      aria-label="Закрыть окно"
                      className="w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#f87171] duration-150 cursor-pointer border-none outline-none shrink-0"
                    />
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-[#d4d4d8] min-w-0">
                  <span className="text-[#d4d4d8] font-normal truncate">
                    Учёт оплаты заказа
                  </span>
                  <span className="text-[#52525b] shrink-0">·</span>
                  <span className="text-[#71717a] hidden sm:inline truncate">
                    {formatOrderNumber(order)} {order.title ? `• ${order.title}` : ''}
                  </span>
                </div>
              </div>

              {/* Правая часть: Только системное время (без крестика) */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="font-mono text-xs text-[#71717a] tabular-nums">
                  {currentTimeStr}
                </div>
              </div>
            </div>

            {/* 2. ТЕЛЕМЕТРИЯ ФИНАНСОВ ЗАКАЗА */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02] space-y-3">
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span className="truncate max-w-[320px] font-semibold text-neutral-200">
                  {order.title || 'Заказ без названия'}
                </span>
                {order.client_name ? (
                  <span className="text-neutral-400 truncate max-w-[180px]">
                    {order.client_name}
                  </span>
                ) : (
                  <span className="text-neutral-500">{order.client || 'Авито'}</span>
                )}
              </div>

              {/* 3 карточки телеметрии */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-2.5">
                  <span className="text-[9.5px] text-neutral-400 uppercase tracking-wider block mb-0.5 font-semibold">
                    Сумма заказа
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white tabular-nums">
                    {formatMoney(totalOrderAmount)} ₽
                  </span>
                </div>

                <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-2.5">
                  <span className="text-[9.5px] text-neutral-400 uppercase tracking-wider block mb-0.5 font-semibold">
                    Внесено всего
                  </span>
                  <span className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums">
                    {formatMoney(currentTotalPaid)} ₽
                  </span>
                </div>

                <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-2.5">
                  <span className="text-[9.5px] text-neutral-400 uppercase tracking-wider block mb-0.5 font-semibold">
                    Остаток (долг)
                  </span>
                  <span className={`text-sm sm:text-base font-bold tabular-nums ${debt <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {debt <= 0 ? '0 ₽' : `${formatMoney(debt)} ₽`}
                  </span>
                </div>
              </div>

              {/* Прогресс оплаты */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-semibold">
                  <span>Прогресс оплаты:</span>
                  <span className={paidPercent >= 100 ? 'text-emerald-400' : paidPercent >= 35 ? 'text-amber-400' : 'text-rose-400'}>
                    {paidPercent.toFixed(0)}% {paidPercent >= 100 ? '• Полностью оплачен' : debt > 0 ? `• Долг ${formatMoney(debt)} ₽` : ''}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full duration-300 ${
                      paidPercent >= 100
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                        : paidPercent >= 35
                          ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : paidPercent > 0
                            ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                            : 'bg-transparent'
                    }`}
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>
              </div>

              {/* Быстрые кнопки-пресеты */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-neutral-500 mr-1">Быстро:</span>
                <button
                  type="button"
                  onClick={handleSetPresetZero}
                  className="px-2 py-0.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] text-neutral-300 hover:text-white cursor-pointer"
                >
                  0 ₽ Не оплачен
                </button>
                <button
                  type="button"
                  onClick={handleSetPresetHalf}
                  className="px-2 py-0.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] text-amber-300 hover:text-amber-200 cursor-pointer"
                >
                  50% Предоплата ({formatMoney(roundTo2(totalOrderAmount * 0.5))} ₽)
                </button>
                <button
                  type="button"
                  onClick={handleSetPresetFull}
                  className="px-2 py-0.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] text-emerald-300 hover:text-emerald-200 cursor-pointer"
                >
                  100% Оплачен ({formatMoney(totalOrderAmount)} ₽)
                </button>
                {debt > 0 && (
                  <button
                    type="button"
                    onClick={handleAddRemainingDebtPart}
                    className="px-2 py-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-[10px] text-amber-300 font-bold cursor-pointer flex items-center gap-1 ml-auto"
                    title="Добавить строку с суммой оставшегося долга"
                  >
                    <Plus className="w-3 h-3" />
                    Внести остаток ({formatMoney(debt)} ₽)
                  </button>
                )}
              </div>
            </div>

            {/* 3. СПИСОК ЧАСТЕЙ ОПЛАТЫ */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px] max-h-[380px]">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-semibold uppercase tracking-wider border-b border-white/10 pb-2">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-neutral-400" />
                  <span>ЧАСТИ ОПЛАТЫ ({items.length})</span>
                </span>
                <span className="text-[10px] text-neutral-500 lowercase font-normal">
                  {items.length === 1 ? 'один платёж' : 'оплата частями'}
                </span>
              </div>

              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="bg-neutral-900/60 border border-white/10 rounded-xl p-2.5 space-y-2 group/part hover:border-white/20 "
                    >
                      {/* Верхняя строка части платежа: бейдж # и кнопка удаления */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded bg-white/10 border border-white/15 text-[9.5px] font-bold text-neutral-300">
                            ПЛАТЕЖ #{idx + 1}
                          </span>
                          {items.length > 1 && (
                            <span className="text-[10px] text-neutral-400">
                              доля: {currentTotalPaid > 0 ? ((item.amount / currentTotalPaid) * 100).toFixed(0) : 0}%
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded hover:bg-rose-500/20 text-neutral-500 hover:text-rose-400 cursor-pointer"
                          title="Удалить эту часть"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Поля ввода: Сумма и Дата */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Сумма */}
                        <div className="space-y-1">
                          <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold block">
                            Сумма (₽)
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.amount === 0 ? '' : item.amount}
                              onChange={(e) => handleAmountChange(idx, e.target.value)}
                              placeholder="0"
                              className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold font-mono tracking-wide placeholder-neutral-600 "
                            />
                            <span className="absolute right-2.5 text-xs text-neutral-500 pointer-events-none font-bold">
                              ₽
                            </span>
                          </div>
                        </div>

                        {/* Дата платежа */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold block">
                              Дата платежа
                            </label>
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(idx, { date: getTodayFormatted() })}
                              className="text-[9px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                            >
                              Сегодня
                            </button>
                          </div>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={item.date || ''}
                              onChange={(e) => handleUpdateItem(idx, { date: e.target.value })}
                              placeholder="ДД.ММ.ГГГГ"
                              className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 focus:outline-none rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-neutral-200 font-mono tracking-wide placeholder-neutral-600 "
                            />
                            <Calendar className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* Примечание к платежу */}
                      <div>
                        <input
                          type="text"
                          value={item.note || ''}
                          onChange={(e) => handleUpdateItem(idx, { note: e.target.value })}
                          placeholder="Примечание (напр. Предоплата, Аванс, Наличные, Перевод)..."
                          className="w-full bg-neutral-950/60 border border-white/10 focus:border-white/25 focus:outline-none rounded-lg px-2.5 py-1 text-[11px] text-neutral-300 placeholder-neutral-600 font-mono "
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Кнопка добавления части */}
              <button
                type="button"
                onClick={() => handleAddItem(debt > 0 ? debt : 0, debt > 0 ? 'Доплата' : '')}
                className="w-full py-2 border border-dashed border-white/20 hover:border-white/40 rounded-xl flex items-center justify-center gap-2 text-neutral-400 hover:text-white cursor-pointer bg-white/[0.02] hover:bg-white/[0.05]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Добавить часть оплаты</span>
              </button>
            </div>

            {/* 4. НИЖНЯЯ ПАНЕЛЬ С ДЕЙСТВИЯМИ */}
            <div className="border-t border-white/10 px-4 py-3 bg-neutral-900/90 flex items-center justify-between">
              <div className="text-[11px] text-neutral-400 font-mono">
                Итого к сохранению:{' '}
                <span className="text-emerald-400 font-bold">{formatMoney(currentTotalPaid)} ₽</span>
              </div>

              <div className="flex items-center gap-2">
                <CockpitButton
                  type="button"
                  onClick={onClose}
                >
                  [ Закрыть ]
                </CockpitButton>

                <CockpitButton
                  type="button"
                  isActive={true}
                  onClick={handleSave}
                >
                  [ Сохранить оплату ]
                </CockpitButton>
              </div>
            </div>
          </motion.div>
    </div>
  );
}

export function OrderPaymentModal({
  order,
  isOpen,
  onClose,
  onSave,
}: OrderPaymentModalProps) {
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && order && (
        <OrderPaymentModalContent
          key={order.id}
          order={order}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
