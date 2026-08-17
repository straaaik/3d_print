'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DatePickerProps {
  label?: string;
  value: string; // Может быть в формате "10.10", "10.10.2026" или "2026-10-10"
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  className?: string;
  format?: 'DD.MM' | 'DD.MM.YYYY' | 'YYYY-MM-DD';
  dropdownPosition?: 'top' | 'bottom' | 'auto';
  align?: 'left' | 'right' | 'auto';
}

const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEK_DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Парсинг любой строки даты в объект Date
function parseToDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // DD.MM.YYYY или DD.MM
  const parts = dateStr.split('.');
  if (parts.length >= 2) {
    const day = Number(parts[0]) || 1;
    const month = (Number(parts[1]) || 1) - 1;
    const year = parts[2] ? (parts[2].length === 2 ? Number(`20${parts[2]}`) : Number(parts[2])) : new Date().getFullYear();
    return new Date(year, month, day);
  }

  return new Date();
}

// Форматирование даты в нужную строку
function formatDateString(date: Date, format: 'DD.MM' | 'DD.MM.YYYY' | 'YYYY-MM-DD'): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (format === 'DD.MM.YYYY') return `${day}.${month}.${year}`;
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${day}.${month}`;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Выберите дату...',
  error,
  hint,
  className = '',
  format = 'DD.MM',
  dropdownPosition = 'auto',
  align = 'auto',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; isTop: boolean; isRight: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Текущая просматриваемая дата в календаре
  const selectedDate = useMemo(() => parseToDate(value), [value]);
  const [viewDate, setViewDate] = useState<Date>(selectedDate);

  // Расчет фикс-координат для React Portal поверх всей страницы
  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.left;

      let openTop = false;
      if (dropdownPosition === 'top') {
        openTop = true;
      } else if (dropdownPosition === 'auto' && spaceBelow < 300 && spaceAbove > 300) {
        openTop = true;
      }

      let openRight = false;
      if (align === 'right') {
        openRight = true;
      } else if (align === 'auto' && spaceRight < 300) {
        openRight = true;
      }

      setCoords({
        top: openTop ? rect.top - 6 : rect.bottom + 6,
        left: openRight ? rect.right - 288 : rect.left,
        isTop: openTop,
        isRight: openRight,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  // Синхронизация viewDate при изменении внешнего value
  useEffect(() => {
    setViewDate(parseToDate(value));
  }, [value]);

  // Закрытие по клику вне контейнера и вне портала
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Генерация дней для сетки календаря
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
    const formatted = formatDateString(date, format);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const formatted = formatDateString(today, format);
    onChange(formatted);
    setViewDate(today);
    setIsOpen(false);
  };

  const today = new Date();
  const isSelectedDay = (d: Date) =>
    d.getDate() === selectedDate.getDate() &&
    d.getMonth() === selectedDate.getMonth() &&
    d.getFullYear() === selectedDate.getFullYear();

  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  return (
    <div ref={containerRef} className={`w-full flex flex-col gap-1 relative ${className}`}>
      {label && (
        <span className="text-gray-300 text-xs sm:text-sm font-medium select-none">
          {label}
        </span>
      )}

      <div className="relative">
        {/* Кнопка поля вызова Календаря */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-[#1a1d24] border border-[#242930] hover:border-[#FF6B00]/60 focus:border-[#FF6B00] focus:outline-none rounded-lg px-3 py-1.5 text-white text-xs sm:text-sm font-mono transition-colors cursor-pointer select-none ${
            error ? 'border-red-500' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#FF8800] shrink-0" />
            <span className={value ? 'text-white' : 'text-gray-500'}>
              {value || placeholder}
            </span>
          </div>
        </button>

        {/* Выпадающее модальное меню Календаря (Portal на document.body) */}
        {isOpen && coords && typeof window !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.isTop ? 'auto' : coords.top,
              bottom: coords.isTop ? window.innerHeight - coords.top : 'auto',
              left: Math.max(12, Math.min(coords.left, window.innerWidth - 300)),
              zIndex: 99999,
            }}
          >
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: coords.isTop ? 6 : -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: coords.isTop ? 6 : -6, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="w-72 bg-[#16181d] border border-[#242930] rounded-2xl shadow-2xl p-4 flex flex-col gap-3 select-none"
              >
                {/* Шапка навигации по месяцам */}
                <div className="flex items-center justify-between border-b border-[#242930] pb-2.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg hover:bg-[#242930] text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-white text-sm font-bold tracking-wide">
                    {MONTH_NAMES_RU[month]} {year}
                  </span>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg hover:bg-[#242930] text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Дни недели */}
                <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#9ca3af]">
                  {WEEK_DAYS_RU.map((wd) => (
                    <span key={wd} className="py-1">
                      {wd}
                    </span>
                  ))}
                </div>

                {/* Сетка дней месяца */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {calendarDays.map((item, idx) => {
                    const selected = isSelectedDay(item.date);
                    const todayFlag = isToday(item.date);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectDay(item.date)}
                        className={`h-8 rounded-lg flex items-center justify-center font-mono text-xs transition-all cursor-pointer ${
                          selected
                            ? 'bg-gradient-to-r from-[#FF5500] to-[#FF8800] text-white font-bold shadow-md shadow-[#FF6B00]/30 scale-105'
                            : todayFlag
                            ? 'bg-[#FF6B00]/20 text-[#FF8800] border border-[#FF6B00]/40 font-bold'
                            : item.isCurrentMonth
                            ? 'text-gray-200 hover:bg-[#242930] hover:text-white'
                            : 'text-gray-600 hover:bg-[#1a1d24]'
                        }`}
                      >
                        {item.day}
                      </button>
                    );
                  })}
                </div>

                {/* Подвал с быстрой кнопкой "Сегодня" */}
                <div className="border-t border-[#242930] pt-2.5 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={handleSelectToday}
                    className="text-[#FF8800] hover:underline font-semibold cursor-pointer"
                  >
                    Сегодня ({formatDateString(new Date(), format)})
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Закрыть
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>,
          document.body
        )}
      </div>

      {error && <span className="text-red-500 text-xs mt-0.5">{error}</span>}
      {hint && !error && <span className="text-[#9ca3af] text-xs mt-0.5">{hint}</span>}
    </div>
  );
}
