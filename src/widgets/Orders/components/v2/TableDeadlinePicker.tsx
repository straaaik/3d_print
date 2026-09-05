'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDeadlineInfo } from '../../helpers';

const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEK_DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function parseDate(str?: string): Date {
  if (!str || !str.trim()) return new Date();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parts = str.split('.');
  if (parts.length >= 2) {
    const day = Number(parts[0]) || 1;
    const month = (Number(parts[1]) || 1) - 1;
    const year = parts[2] ? (parts[2].length === 2 ? Number(`20${parts[2]}`) : Number(parts[2])) : new Date().getFullYear();
    return new Date(year, month, day);
  }
  return new Date();
}

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export interface TableDeadlinePickerProps {
  isOpen: boolean;
  targetRect: DOMRect | null;
  triggerRef?: React.RefObject<HTMLElement | null>;
  value: string;
  title?: string;
  orderStatus?: string;
  showDeadlineBadge?: boolean;
  onChange: (newDate: string) => void;
  onClose: () => void;
}

export function TableDeadlinePicker({
  isOpen,
  targetRect,
  triggerRef,
  value,
  title = 'ДЕДЛАЙН ЗАКАЗА',
  orderStatus,
  showDeadlineBadge = true,
  onChange,
  onClose,
}: TableDeadlinePickerProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedDate = useMemo(() => (value ? parseDate(value) : null), [value]);
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate || new Date());

  // Обновление месяца при открытии с новым значением
  useEffect(() => {
    if (isOpen) {
      setViewDate(selectedDate || new Date());
    }
  }, [isOpen, selectedDate]);

  // Закрытие при клике вне попапа
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      if (triggerRef?.current && triggerRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Позиционирование попапа (компактный размер 260px x 310px)
  const coords = useMemo(() => {
    if (!targetRect || typeof window === 'undefined') return null;

    const popoverWidth = 260;
    const popoverHeight = 310;
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

  // Генерация дней месяца
  const calendarDays = useMemo(() => {
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

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (date: Date) => {
    const formatted = formatDate(date);
    onChange(formatted);
    onClose();
  };

  const handleQuickPreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const formatted = formatDate(d);
    onChange(formatted);
    onClose();
  };

  const handleClearDeadline = () => {
    onChange('');
    onClose();
  };

  const today = new Date();
  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const isSelected = (d: Date) =>
    Boolean(
      selectedDate &&
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );

  const deadlinePreview = useMemo(() => {
    return getDeadlineInfo(value, orderStatus);
  }, [value, orderStatus]);

  if (!isOpen || !coords || typeof window === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        zIndex: 99999,
      }}
    >
      <AnimatePresence>
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, scale: 0.96, y: coords.isTop ? 6 : -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: coords.isTop ? 6 : -6 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="w-[260px] bg-neutral-950/95 border border-white/20 rounded-xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-2.5 flex flex-col gap-2 select-none font-mono text-xs text-neutral-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. ШАПКА КАЛЕНДАРЯ: Заголовок */}
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 px-0.5">
            <span className="text-[10px] font-bold text-neutral-300 tracking-wider uppercase truncate">
              {title}
            </span>
          </div>

          {/* 2. БЫСТРЫЕ ШОРТКАТЫ (Монохромный / Серый стиль) */}
          <div className="flex flex-col gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-1.5">
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => handleQuickPreset(0)}
                className="py-0.5 px-1 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 text-[9px] font-mono transition-all text-center cursor-pointer"
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(1)}
                className="py-0.5 px-1 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 text-[9px] font-mono transition-all text-center cursor-pointer"
              >
                Завтра
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(2)}
                className="py-0.5 px-1 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 text-[9px] font-mono transition-all text-center cursor-pointer"
              >
                +2 дня
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(3)}
                className="py-0.5 px-1 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 text-[9px] font-mono transition-all text-center cursor-pointer"
              >
                +3 дня
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => handleQuickPreset(7)}
                className="py-0.5 px-1 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 text-[9px] font-mono transition-all text-center cursor-pointer"
              >
                +1 нед. (7 дн.)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(14)}
                className="py-0.5 px-1 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 text-[9px] font-mono transition-all text-center cursor-pointer"
              >
                +2 нед. (14 дн.)
              </button>
            </div>
          </div>

          {/* 3. НАВИГАЦИЯ ПО МЕСЯЦАМ */}
          <div className="flex items-center justify-between px-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-white text-[11px] font-bold tracking-wider uppercase">
              {MONTH_NAMES_RU[month]} {year}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Следующий месяц"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4. ДНИ НЕДЕЛИ */}
          <div className="grid grid-cols-7 text-center text-[9px] font-semibold text-neutral-500 font-mono">
            {WEEK_DAYS_RU.map((wd) => (
              <span key={wd} className="py-0.5">
                {wd}
              </span>
            ))}
          </div>

          {/* 5. СЕТКА ДНЕЙ (Монохромная) */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {calendarDays.map((item, idx) => {
              const selected = isSelected(item.date);
              const todayFlag = isToday(item.date);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(item.date)}
                  className={`h-6 rounded flex items-center justify-center font-mono text-[10px] transition-all cursor-pointer ${
                    selected
                      ? 'bg-white text-neutral-950 font-bold shadow-md'
                      : todayFlag
                      ? 'bg-white/15 text-white border border-white/40 font-bold'
                      : item.isCurrentMonth
                      ? 'text-neutral-200 hover:bg-white/15 hover:text-white'
                      : 'text-neutral-600 hover:bg-white/5'
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* 6. ПОДВАЛ С ТЕКУЩИМ СТАТУСОМ И КНОПКОЙ ОЧИСТКИ */}
          <div className="border-t border-white/10 pt-1.5 flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center gap-1 min-w-0">
              {value ? (
                <>
                  <span className="text-neutral-300 truncate text-[10px] font-medium">{value}</span>
                  {showDeadlineBadge && deadlinePreview && (
                    <span className={`px-1 py-0.2 rounded border text-[8.5px] ${deadlinePreview.badgeStyle}`}>
                      {deadlinePreview.label}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-neutral-500 italic text-[10px]">Не задано</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearDeadline}
              className="flex items-center gap-1 text-neutral-400 hover:text-rose-400 hover:underline cursor-pointer ml-auto shrink-0 pl-1 text-[10px]"
              title="Очистить значение"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>Очистить</span>
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
