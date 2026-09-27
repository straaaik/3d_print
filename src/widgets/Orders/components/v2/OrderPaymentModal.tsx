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
  Coins,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Tooltip } from '../../../../shared/ui/Tooltip';
import { AnimatedPriceNumber } from '../../../../shared/ui/AnimatedPriceNumber';

function HandDrawnUnderline({
  isSelected,
  color = 'white',
}: {
  isSelected: boolean;
  color?: string;
}) {
  return (
    <AnimatePresence>
      {isSelected && (
        <motion.svg
          className="absolute -bottom-1 left-0 w-full h-[6px] pointer-events-none overflow-visible z-10"
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

const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const WEEK_DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('.');
  if (parts.length >= 2) {
    const day = Number(parts[0]) || 1;
    const month = (Number(parts[1]) || 1) - 1;
    const year = parts[2]
      ? parts[2].length === 2
        ? Number(`20${parts[2]}`)
        : Number(parts[2])
      : new Date().getFullYear();
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function formatDateString(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

interface ReceiptDatePickerPopoverProps {
  targetRect: DOMRect;
  value: string;
  title?: string;
  onChange: (dateStr: string) => void;
  onClose: () => void;
}

function ReceiptDatePickerPopover({
  targetRect,
  value,
  title = 'ДАТА ЧЕКА',
  onChange,
  onClose,
}: ReceiptDatePickerPopoverProps) {
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const selectedDate = React.useMemo(() => parseDateString(value), [value]);
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const coords = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    const popoverWidth = 252;
    const popoverHeight = 285;
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    const isTop = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    let left = targetRect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) left = 12;

    const top = isTop
      ? Math.max(12, targetRect.top - popoverHeight - 6)
      : Math.min(window.innerHeight - popoverHeight - 12, targetRect.bottom + 6);

    return { top, left, isTop };
  }, [targetRect]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const calendarDays = React.useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let firstDayIndex = firstDayOfMonth.getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6;

    const daysCount = lastDayOfMonth.getDate();
    const days: Array<{ day: number; date: Date; isCurrentMonth: boolean }> = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      days.push({
        day: dayNum,
        date: new Date(year, month - 1, dayNum),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysCount; d++) {
      days.push({
        day: d,
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }

    const remainingSlots = 42 - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      days.push({
        day: d,
        date: new Date(year, month + 1, d),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (date: Date) => {
    onChange(formatDateString(date));
  };

  const handleSelectToday = () => {
    onChange(formatDateString(new Date()));
  };

  const today = new Date();
  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const isSelectedDay = (d: Date) =>
    d.getDate() === selectedDate.getDate() &&
    d.getMonth() === selectedDate.getMonth() &&
    d.getFullYear() === selectedDate.getFullYear();

  if (!coords || typeof window === 'undefined') return null;

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, y: coords.isTop ? 6 : -6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: coords.isTop ? 6 : -6, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          backgroundColor: 'var(--cockpit-accent-color, #CAC4B0)',
          color: '#0a0a0a',
        }}
        className="w-[252px] p-3.5 pb-2 flex flex-col gap-2 font-mono text-xs select-none shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85)] border border-neutral-900/30 rounded-t-xs relative"
      >
        {/* Шапка календаря */}
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-neutral-700">
          <span>KUMO CRM · КАЛЕНДАРЬ</span>
          <span className="truncate max-w-[120px]">{title}</span>
        </div>

        {/* Пунктирный разделитель */}
        <div className="border-b border-dashed border-[#737373]" />

        {/* Навигация по месяцам */}
        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-xs hover:bg-black/10 text-neutral-800 hover:text-black cursor-pointer transition-colors"
            title="Предыдущий месяц"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-bold font-mono tracking-wider uppercase text-[#0a0a0a]">
            {MONTH_NAMES_RU[month]} {year}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-xs hover:bg-black/10 text-neutral-800 hover:text-black cursor-pointer transition-colors"
            title="Следующий месяц"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 text-center text-[9px] font-bold text-neutral-600 font-mono">
          {WEEK_DAYS_RU.map((wd) => (
            <span key={wd} className="py-0.5">
              {wd}
            </span>
          ))}
        </div>

        {/* Сетка дней */}
        <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
          {calendarDays.map((item, idx) => {
            const selected = isSelectedDay(item.date);
            const todayFlag = isToday(item.date);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectDay(item.date)}
                className={`h-6 rounded-xs flex items-center justify-center font-mono text-xs cursor-pointer transition-colors ${
                  selected
                    ? 'bg-[#0a0a0a] text-[#CAC4B0] font-extrabold shadow-xs'
                    : todayFlag
                    ? 'border border-neutral-900 text-[#0a0a0a] font-bold hover:bg-black/10'
                    : item.isCurrentMonth
                    ? 'text-[#0a0a0a] hover:bg-black/10 font-medium'
                    : 'text-neutral-500/50 hover:bg-black/5'
                }`}
              >
                {item.day}
              </button>
            );
          })}
        </div>

        {/* Подвал */}
        <div className="border-t border-dashed border-[#737373] pt-1.5 flex items-center justify-between text-[10px] font-mono">
          <button
            type="button"
            onClick={handleSelectToday}
            className="text-[#0a0a0a] hover:underline font-bold cursor-pointer"
          >
            [ сегодня ]
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-700 hover:text-black cursor-pointer"
          >
            [ закрыть ]
          </button>
        </div>

        {/* Зубчатый отрывной край попапа */}
        <div className="relative -mx-3.5 -mb-2 mt-1 h-2 overflow-hidden pointer-events-none select-none">
          <svg
            className="w-full h-full text-[#18181c] fill-current"
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
          >
            <polygon points="0,8 0,0 4.16,6 8.33,0 12.5,6 16.66,0 20.83,6 25,0 29.16,6 33.33,0 37.5,6 41.66,0 45.83,6 50,0 54.16,6 58.33,0 62.5,6 66.66,0 70.83,6 75,0 79.16,6 83.33,0 87.5,6 91.66,0 95.83,6 100,0 100,8" />
          </svg>
        </div>
      </motion.div>
    </div>,
    document.body
  );
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

export function applyFullPaymentPreset(
  items: readonly PaymentItem[],
  totalOrderAmount: number,
  todayStr: string,
  createId: (prefix?: string) => string = createPaymentItemId
): PaymentItem[] {
  if (totalOrderAmount <= 0) return [...items];

  const validItems = items.filter((it) => (Number(it.amount) || 0) > 0);
  const currentPaidSum = roundTo2(
    validItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0)
  );
  const remainingDebt = roundTo2(Math.max(0, totalOrderAmount - currentPaidSum));

  if (remainingDebt <= 0) {
    return [...items];
  }

  if (validItems.length === 0) {
    return [{
      id: items[0]?.id || createId('pay-full'),
      amount: totalOrderAmount,
      date: todayStr,
      note: 'Полная оплата (100%)',
    }];
  }

  const lastItem = items[items.length - 1];
  if (lastItem && (Number(lastItem.amount) || 0) <= 0) {
    const updated = items.map((it, idx) =>
      idx === items.length - 1
        ? {
            ...it,
            amount: remainingDebt,
            date: it.date || todayStr,
            note: it.note?.trim() ? it.note : 'Доплата до 100%',
          }
        : it
    );
    return updated.filter(
      (it, idx) => (Number(it.amount) || 0) > 0 || idx === updated.length - 1
    );
  }

  const newItem: PaymentItem = {
    id: createId(`pay-${validItems.length}`),
    amount: remainingDebt,
    date: todayStr,
    note: 'Доплата до 100%',
  };

  return [...validItems, newItem];
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
  const [activeDatePicker, setActiveDatePicker] = useState<{
    index: number;
    targetRect: DOMRect;
    value: string;
  } | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const activeIdx =
    focusedIndex !== null
      ? focusedIndex
      : activeDatePicker !== null
      ? activeDatePicker.index
      : hoveredIndex;

  const handleOpenDatePicker = (index: number, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveDatePicker({
      index,
      targetRect: rect,
      value: items[index]?.date || getTodayFormatted(),
    });
  };

  const handleDatePickerChange = (newDate: string) => {
    if (activeDatePicker === null) return;
    handleUpdateItem(activeDatePicker.index, { date: newDate });
    setActiveDatePicker(null);
  };

  // Системное время реального времени с секундами (стандарт эталона GoalSettingsModal)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setCurrentTimeStr(`${hours}:${mins}:${secs} MSK`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
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
    : currentTotalPaid > 0
    ? 100
    : 0;

  const isFullyPaid = totalOrderAmount > 0 && currentTotalPaid >= totalOrderAmount;
  const isPartiallyPaid = currentTotalPaid > 0 && currentTotalPaid < totalOrderAmount;
  const isUnpaid = currentTotalPaid === 0;

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
    const newIndex = items.length;
    setItems((prev) => [
      ...prev,
      {
        id: createPaymentItemId(`pay-${prev.length}`),
        amount,
        date: getTodayFormatted(),
        note,
      },
    ]);
    setFocusedIndex(newIndex);
  };

  const handleRemoveItem = (index: number) => {
    if (focusedIndex === index) {
      setFocusedIndex(null);
    }
    if (hoveredIndex === index) {
      setHoveredIndex(null);
    }
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
    setHoveredIndex(null);
    const updated = applyFullPaymentPreset(items, totalOrderAmount, getTodayFormatted());
    setItems(updated);
    setFocusedIndex(updated.length - 1);
  };


  const handleSetPresetHalf = () => {
    setFocusedIndex(null);
    setHoveredIndex(null);
    setItems([{
      id: createPaymentItemId('pay-half'),
      amount: roundTo2(totalOrderAmount * 0.5),
      date: getTodayFormatted(),
      note: 'Предоплата 50%',
    }]);
  };

  const handleSetPresetZero = () => {
    setFocusedIndex(null);
    setHoveredIndex(null);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none overflow-hidden font-mono">
      {/* СТЕКЛЯННЫЙ ТЁМНЫЙ БЭКДРОП */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-sm cursor-pointer"
      />

      {/* ГЛАВНОЕ ОКНО КОНСОЛИ MERIDIAN COCKPIT */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        className="relative w-full max-w-[780px] sm:max-w-[840px] rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden text-xs flex flex-col max-h-[92vh] z-10 font-mono"
      >
        {/* 1. Верхняя панель (Cockpit Topbar: Red LED + Title + Live time) */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 bg-neutral-900/60 shrink-0 gap-3 select-none">
          {/* Левая часть: красный терминальный кружок закрытия + заголовок раздела */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Tooltip content="Закрыть окно">
                <button
                  type="button"
                  onClick={onClose}
                  title="Закрыть окно"
                  aria-label="Закрыть окно"
                  className="w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#f87171] hover:scale-125 cursor-pointer transition-all border-none outline-none shrink-0"
                />
              </Tooltip>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-neutral-300 min-w-0">
              <span id="payment-modal-title" className="text-neutral-300 font-normal shrink-0">
                Учёт оплаты заказа
              </span>
              <span className="text-[#52525b] shrink-0">·</span>
              <span className="text-[#71717a] truncate min-w-0">
                Детализация и оплата частями
              </span>
            </div>
          </div>

          {/* Правая часть: Системное время с секундами (без крестика) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="font-mono text-xs text-[#71717a] tabular-nums">
              {currentTimeStr}
            </div>
          </div>
        </div>

        {/* 2. Рабочее тело модального окна (bg-[#18181c]) */}
        <div className="p-5 sm:p-6 bg-[#18181c] space-y-4 overflow-y-auto custom-scrollbar flex-1 font-mono">
          {/* 1. Мета-информация о заказе */}
          <div className="border border-[#26262b] bg-[#121214]/90 rounded-xl p-3 flex items-center justify-between text-[11px] font-mono select-none">
            <div className="flex items-center gap-2 truncate min-w-0 pr-2">
              <Receipt className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
              <span className="text-neutral-200 font-medium truncate">
                {formatOrderNumber(order)} {order.title ? `• ${order.title}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-[#71717a] uppercase font-semibold">Клиент:</span>
              <span className="px-2 py-0.5 rounded bg-[#1e1e22] border border-[#2e2e34] text-neutral-300 text-[11px] truncate max-w-[200px]">
                {order.client_name || order.client || 'Не указан'}
              </span>
            </div>
          </div>

          {/* 2. Три карточки телеметрии (Сумма заказа, Внесено всего, Остаток к оплате) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 select-none">
            {/* 1. Сумма заказа */}
            <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-xl p-3 sm:p-3.5 font-mono text-center flex flex-col justify-between">
              <div className="h-5 flex items-center justify-center gap-1 mb-1">
                <span className="text-[9.5px] sm:text-[10.5px] text-[#71717a] uppercase tracking-wider font-semibold">
                  Сумма заказа
                </span>
              </div>
              <div className="flex items-baseline justify-center gap-1 h-7">
                <AnimatedPriceNumber
                  value={totalOrderAmount}
                  className="text-lg sm:text-xl font-light text-white"
                  currencyClassName="text-neutral-400 font-normal ml-0.5"
                />
              </div>
            </div>

            {/* 2. Внесено всего */}
            <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-xl p-3 sm:p-3.5 font-mono text-center flex flex-col justify-between">
              <div className="h-5 flex items-center justify-center gap-1 mb-1">
                <span className="text-[9.5px] sm:text-[10.5px] text-[#71717a] uppercase tracking-wider font-semibold">
                  Внесено всего
                </span>
                {totalOrderAmount > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {Math.round(paidPercent)}%
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-center gap-1 h-7">
                <AnimatedPriceNumber
                  value={currentTotalPaid}
                  className="text-lg sm:text-xl font-light text-emerald-400"
                  currencyClassName="text-emerald-400/80 font-normal ml-0.5"
                />
              </div>
            </div>

            {/* 3. Остаток к оплате */}
            <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-xl p-3 sm:p-3.5 font-mono text-center flex flex-col justify-between">
              <div className="h-5 flex items-center justify-center gap-1 mb-1">
                <span className="text-[9.5px] sm:text-[10.5px] text-[#71717a] uppercase tracking-wider font-semibold">
                  Остаток к оплате
                </span>
              </div>
              <div className="flex items-baseline justify-center gap-1 h-7">
                <AnimatedPriceNumber
                  value={debt}
                  className={`text-lg sm:text-xl font-light ${
                    debt <= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                  currencyClassName={
                    debt <= 0
                      ? 'text-emerald-400/80 font-normal ml-0.5'
                      : 'text-amber-400/80 font-normal ml-0.5'
                  }
                />
              </div>
            </div>
          </div>

          {/* 3. Прогресс-бар и быстрые пресеты */}
          <div className="space-y-2.5 pt-1 select-none">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  {isFullyPaid ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[10.5px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Полностью оплачен
                    </span>
                  ) : isPartiallyPaid ? (
                    <span className="text-amber-400 flex items-center gap-1 font-semibold text-[10.5px]">
                      <Clock className="w-3.5 h-3.5" />
                      Предоплата {paidPercent.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1 font-semibold text-[10.5px]">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Не оплачен (0%)
                    </span>
                  )}
                </div>
                <span className="text-[#71717a] tabular-nums text-[10.5px]">
                  {formatMoney(currentTotalPaid)} / {formatMoney(totalOrderAmount)}
                </span>
              </div>

              <div className="w-full h-1.5 bg-[#222226] rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFullyPaid
                      ? 'bg-emerald-400'
                      : isPartiallyPaid
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>

            {/* Быстрые пресеты */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#26262b] flex-wrap select-none">
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <span className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                  Планка:
                </span>
                <button
                  type="button"
                  onClick={handleSetPresetZero}
                  className={`py-0.5 text-xs font-mono cursor-pointer ${
                    currentTotalPaid === 0 ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  <span className="relative inline-block">
                    <span>0% Не оплачен</span>
                    <HandDrawnUnderline isSelected={currentTotalPaid === 0} />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleSetPresetHalf}
                  className={`py-0.5 text-xs font-mono cursor-pointer ${
                    currentTotalPaid > 0 && currentTotalPaid === roundTo2(totalOrderAmount * 0.5)
                      ? 'text-white font-bold'
                      : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  <span className="relative inline-block">
                    <span>50% Предоплата</span>
                    <HandDrawnUnderline
                      isSelected={
                        currentTotalPaid > 0 &&
                        currentTotalPaid === roundTo2(totalOrderAmount * 0.5)
                      }
                    />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleSetPresetFull}
                  className={`py-0.5 text-xs font-mono cursor-pointer ${
                    isFullyPaid
                      ? 'text-white font-bold'
                      : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  <span className="relative inline-block">
                    <span>100% Полная</span>
                    <HandDrawnUnderline isSelected={isFullyPaid} />
                  </span>
                </button>
              </div>

              {debt > 0 && (
                <button
                  type="button"
                  onClick={handleAddRemainingDebtPart}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 hover:border-amber-500/40 text-xs font-mono text-amber-300 hover:text-amber-200 cursor-pointer transition-colors shrink-0"
                  title="Добавить строку с суммой оставшегося долга"
                >
                  <Plus className="w-3 h-3 text-amber-400" />
                  <span>Внести остаток ({formatMoney(debt)})</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. ЧЕКИ ОПЛАТЫ (Слева кнопка добавления, справа стопка-веер чеков) */}
          <div className="space-y-2 pt-2 border-t border-[#26262b]">
            <div className="flex items-center justify-between text-[11px] text-[#71717a] font-semibold uppercase tracking-wider select-none px-0.5">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#71717a]" />
                <span>ЧЕКИ ОПЛАТЫ ({items.length})</span>
              </div>
              <span className="text-[10px] text-[#71717a] lowercase font-normal">
                стопка чеков · наведите для раскрытия
              </span>
            </div>

            {/* Контейнер: стопка чеков слева + кнопка добавления всегда зафиксирована справа */}
            <div className="flex items-start gap-3 sm:gap-3.5 relative">
              {/* 1. Каскадная стопка чеков со скроллом при переполнении (СЛЕВА) */}
              <div className="flex-1 min-w-0 flex items-start overflow-x-auto pt-6 pb-6 px-3.5 relative z-10 [scrollbar-width:thin] [scrollbar-color:#52525b_#18181c] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-[#121214] [&::-webkit-scrollbar-track]:border [&::-webkit-scrollbar-track]:border-[#26262b] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#3f3f46] hover:[&::-webkit-scrollbar-thumb]:bg-[#71717a] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-[#18181c]">
                <AnimatePresence initial={false}>
                  {items.map((item, idx) => {
                    const isCurrentActive = activeIdx === idx;
                    const sharePercent =
                      currentTotalPaid > 0
                        ? ((item.amount / currentTotalPaid) * 100).toFixed(0)
                        : 0;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        data-receipt-card
                        initial={{ opacity: 0, scale: 0.92, y: 8 }}
                        animate={{
                          opacity: 1,
                          scale: isCurrentActive ? 1.02 : 1,
                          y: isCurrentActive ? -10 : 0,
                          x: isCurrentActive ? 0 : activeIdx !== null && idx > activeIdx ? 16 : 0,
                        }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 28,
                          mass: 0.8,
                        }}
                        style={{
                          backgroundColor: 'var(--cockpit-accent-color, #CAC4B0)',
                          color: '#0a0a0a',
                          marginLeft: idx > 0 ? (items.length > 3 ? -130 : -120) : 0,
                          zIndex: isCurrentActive ? 40 : idx + 2,
                        }}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onFocusCapture={() => setFocusedIndex(idx)}
                        onBlurCapture={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setFocusedIndex(null);
                          }
                        }}
                        onClick={() => setFocusedIndex(idx)}
                        className={`w-[205px] sm:w-[215px] min-h-[320px] sm:min-h-[335px] shrink-0 rounded-t-xs p-3.5 sm:p-4 pb-2.5 flex flex-col justify-between font-mono relative select-none cursor-pointer transition-shadow duration-200 ${
                          isCurrentActive
                            ? 'shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_20px_rgba(0,0,0,0.3)] ring-1 ring-black/25'
                            : 'shadow-[-6px_8px_20px_rgba(0,0,0,0.55)] hover:shadow-[-8px_12px_28px_rgba(0,0,0,0.65)]'
                        }`}
                      >
                        <div>
                          {/* 1. Какой это платёж (Шапка чека) */}
                          <div className="flex items-start justify-between gap-1 select-none">
                            <div className="pr-1">
                              <div className="text-[8.5px] font-bold tracking-wider text-neutral-700 uppercase font-mono truncate max-w-[145px]">
                                KUMO CRM · ЧЕК № {(idx + 1).toString().padStart(2, '0')}
                              </div>
                              <div className="text-sm font-extrabold text-[#0a0a0a] uppercase tracking-tight font-mono mt-0.5">
                                ПЛАТЁЖ #{idx + 1}
                              </div>
                            </div>

                            {/* Кнопка закрытия / обнуления чека (стиль ReceiptCloseButton) */}
                            <Tooltip
                              content={
                                items.length <= 1
                                  ? 'Обнулить платёж'
                                  : 'Удалить этот чек'
                              }
                            >
                              <motion.button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveItem(idx);
                                }}
                                aria-label={`Удалить чек ${idx + 1}`}
                                className="w-5 h-5 rounded-full flex items-center justify-center bg-black/8 hover:bg-rose-500/20 text-[#404040] hover:text-rose-600 transition-colors border border-black/15 hover:border-rose-500/30 cursor-pointer outline-none select-none shrink-0"
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.88 }}
                              >
                                <X className="w-3 h-3" strokeWidth={2.5} />
                              </motion.button>
                            </Tooltip>
                          </div>

                          {/* Доля в оплате с точечной линией-лидером */}
                          <div className="flex items-baseline justify-between text-[8.5px] text-neutral-700 font-mono mt-1">
                            <span className="shrink-0 text-neutral-600 uppercase">ДОЛЯ В ОПЛАТЕ</span>
                            <span className="flex-1 mx-1.5 border-b border-dotted border-neutral-600/40" />
                            <span className="font-bold text-[#0a0a0a] tabular-nums">
                              {currentTotalPaid > 0 ? `${sharePercent}%` : '0%'}
                            </span>
                          </div>

                          {/* Пунктирный разделитель шапки */}
                          <div className="border-b border-dashed border-[#737373] my-2.5" />

                          {/* 2. Сумма платежа (БЕЗ РАМОК, нативный вид печати на чеке) */}
                          <div>
                            <div className="flex items-baseline justify-between text-[8.5px] font-bold text-neutral-600 uppercase tracking-wider">
                              <span className="shrink-0">ИТОГО ВНЕСЕНО</span>
                              <span className="flex-1 mx-1.5 border-b border-dotted border-neutral-600/40" />
                              <span className="text-[8px] text-neutral-600 font-normal">СУММА</span>
                            </div>
                            <div className="flex items-baseline gap-1 mt-1">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.amount === 0 ? '' : item.amount}
                                onChange={(e) => handleAmountChange(idx, e.target.value)}
                                onFocus={() => setFocusedIndex(idx)}
                                placeholder="0"
                                className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-[#0a0a0a] font-black font-mono text-2xl tracking-tight placeholder:text-neutral-500/60"
                              />
                              <span className="text-base font-extrabold text-[#0a0a0a] font-mono select-none pointer-events-none">
                                ₽
                              </span>
                            </div>
                          </div>

                          {/* 3. Дата платежа (БЕЗ РАМОК, нативный вид печати с date picker) */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[8.5px] font-bold text-neutral-600 uppercase tracking-wider">
                              <span>ДАТА ПЛАТЕЖА</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateItem(idx, { date: getTodayFormatted() });
                                }}
                                className="text-[8px] text-neutral-600 hover:text-[#0a0a0a] underline underline-offset-2 cursor-pointer lowercase font-normal"
                              >
                                сегодня
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDatePicker(idx, e);
                              }}
                              className="w-full flex items-center gap-1.5 text-left bg-transparent border-none outline-none focus:ring-0 p-0 mt-1 cursor-pointer group/date"
                            >
                              <Calendar className="w-3.5 h-3.5 text-neutral-700 group-hover/date:text-black shrink-0 transition-colors" />
                              <span className="font-mono text-xs font-bold text-[#0a0a0a] group-hover/date:underline underline-offset-2 truncate">
                                {item.date || getTodayFormatted()}
                              </span>
                            </button>
                          </div>

                          {/* 4. Комментарий к платежу (БЕЗ РАМОК, нативный вид печати) */}
                          <div className="mt-3">
                            <div className="flex items-baseline justify-between text-[8.5px] font-bold text-neutral-600 uppercase tracking-wider">
                              <span className="shrink-0">ПРИМЕЧАНИЕ</span>
                              <span className="flex-1 mx-1.5 border-b border-dotted border-neutral-600/40" />
                              <span className="text-[7.5px] text-neutral-600 font-normal">НАЗНАЧЕНИЕ</span>
                            </div>
                            <input
                              type="text"
                              value={item.note || ''}
                              onChange={(e) =>
                                handleUpdateItem(idx, { note: e.target.value })
                              }
                              onFocus={() => setFocusedIndex(idx)}
                              placeholder="Напр. Аванс 50%, Доплата..."
                              className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 mt-1 text-[#0a0a0a] font-mono text-xs font-medium placeholder:text-neutral-500/60 truncate"
                            />
                          </div>
                        </div>

                        {/* Низ чека: Перфорация с боковыми вырезами, штрихкод и зубчатый отрыв */}
                        <div className="pt-2 select-none">
                          {/* Боковые вырезы (Ticket Punch Notches) с пунктирной линией */}
                          <div className="relative my-2.5 -mx-4 h-3.5 flex items-center overflow-visible pointer-events-none select-none">
                            <div className="absolute -left-2 w-4 h-4 rounded-full bg-[#18181c]" />
                            <div className="w-full border-b border-dashed border-[#737373]" />
                            <div className="absolute -right-2 w-4 h-4 rounded-full bg-[#18181c]" />
                          </div>

                          <div className="flex items-center justify-between text-[8px] font-mono text-neutral-700 tracking-wider uppercase mb-1">
                            <span>AUTH · 0XKUMOCRM</span>
                            <span className="tabular-nums">PAID // #{String(idx + 1).padStart(2, '0')}</span>
                          </div>

                          {/* Аутентичный термо-штрихкод чека */}
                          <div className="flex items-center justify-center gap-[1.5px] h-3.5 py-0.5 opacity-80 overflow-hidden">
                            {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 2].map((w, i) => (
                              <div key={i} style={{ backgroundColor: '#0a0a0a', width: `${w}px`, height: '100%', borderRadius: '0.5px' }} />
                            ))}
                          </div>

                          {/* Зубчатый отрывной край чека (Serrated Tear Edge) */}
                          <div className="relative -mx-4 -mb-2.5 mt-2.5 h-2 overflow-hidden pointer-events-none select-none">
                            <svg
                              className="w-full h-full text-[#18181c] fill-current"
                              viewBox="0 0 100 8"
                              preserveAspectRatio="none"
                            >
                              <polygon points="0,8 0,0 4.16,6 8.33,0 12.5,6 16.66,0 20.83,6 25,0 29.16,6 33.33,0 37.5,6 41.66,0 45.83,6 50,0 54.16,6 58.33,0 62.5,6 66.66,0 70.83,6 75,0 79.16,6 83.33,0 87.5,6 91.66,0 95.83,6 100,0 100,8" />
                            </svg>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {/* Отступ справа внутри скролла для предотвращения обрезки тени и масштаба */}
                <div className="w-4 shrink-0 pointer-events-none" />
              </div>

              {/* 2. Кнопка «Добавить новый чек» СПРАВА (всегда зафиксирована и видна без прокрутки) */}
              <button
                type="button"
                onClick={() =>
                  handleAddItem(debt > 0 ? debt : 0, debt > 0 ? 'Доплата' : '')
                }
                className="w-[155px] sm:w-[170px] shrink-0 min-h-[320px] sm:min-h-[335px] mt-6 border-2 border-dashed border-[#2e2e34] hover:border-neutral-400 rounded-t-xs bg-[#121214]/90 hover:bg-[#16161b] flex flex-col justify-between text-[#71717a] hover:text-white cursor-pointer transition-all p-3.5 pb-2.5 group select-none relative z-0 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                title="Добавить новый чек оплаты (всегда под рукой)"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="text-[9px] font-bold tracking-wider text-[#52525b] group-hover:text-[#a1a1aa] uppercase font-mono text-left">
                    KUMO CRM · НОВЫЙ ЧЕК
                  </div>
                </div>

                <div className="py-12 flex flex-col items-center justify-center gap-2 w-full">
                  <span className="text-sm font-mono font-bold text-center leading-tight text-neutral-200 group-hover:text-white transition-colors">
                    Добавить чек
                  </span>
                  <span className="text-[9.5px] text-[#71717a] font-mono text-center">
                    {debt > 0 ? `остаток: ${formatMoney(debt)}` : 'новый платёж'}
                  </span>
                </div>

                {/* Нижняя перфорация */}
                <div className="w-full">
                  <div className="border-b border-dashed border-[#2e2e34] group-hover:border-neutral-500 mb-2" />
                  <div className="flex items-center justify-between text-[8px] font-mono text-[#52525b] tracking-wider uppercase">
                    <span>ADD · RECEIPT</span>
                    <span className="text-emerald-400/80 font-bold">#{String(items.length + 1).padStart(2, '0')}</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 5. НИЖНЯЯ ПАНЕЛЬ С ДЕЙСТВИЯМИ (ФУТЕР) */}
        <div className="border-t border-white/10 px-5 py-3 bg-neutral-900/60 flex items-center justify-between font-mono text-xs select-none shrink-0">
          <div className="text-[11px] text-[#71717a] font-mono flex items-baseline gap-1.5">
            <span>ИТОГО К СОХРАНЕНИЮ:</span>
            <AnimatedPriceNumber
              value={currentTotalPaid}
              className="text-xs font-bold text-emerald-400"
              currencyClassName="text-emerald-400/80 font-normal ml-0.5"
            />
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <CockpitButton
              type="button"
              onClick={handleSave}
              icon={Check}
            >
              Сохранить оплату
            </CockpitButton>
          </div>
        </div>

        {/* Термо-календарь выбора даты чека */}
        {activeDatePicker && (
          <ReceiptDatePickerPopover
            targetRect={activeDatePicker.targetRect}
            value={activeDatePicker.value}
            title={`ЧЕК № 0${activeDatePicker.index + 1}`}
            onChange={handleDatePickerChange}
            onClose={() => setActiveDatePicker(null)}
          />
        )}
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
