'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Tooltip } from './Tooltip';

export const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export function formatMonthKeyLabelDefault(key: string): string {
  if (!key || key === 'all') return 'Все месяцы';
  const parts = key.split('-');
  if (parts.length >= 2) {
    const yearStr = parts[0];
    const monthIdx = Number(parts[1]) - 1;
    const monthName = MONTH_NAMES_RU[monthIdx] || parts[1];
    return `${monthName} ${yearStr}`;
  }
  return key;
}

export function getPreviousMonthKey(currentKey?: string): string {
  let y: number;
  let m: number;
  if (!currentKey || currentKey === 'all') {
    const now = new Date();
    y = now.getFullYear();
    m = now.getMonth() + 1;
  } else {
    const parts = currentKey.split('-').map(Number);
    y = parts[0] || new Date().getFullYear();
    m = parts[1] || new Date().getMonth() + 1;
  }
  const prevDate = new Date(y, m - 2, 1);
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
}

export function getNextMonthKey(currentKey?: string): string {
  let y: number;
  let m: number;
  if (!currentKey || currentKey === 'all') {
    const now = new Date();
    y = now.getFullYear();
    m = now.getMonth() + 1;
  } else {
    const parts = currentKey.split('-').map(Number);
    y = parts[0] || new Date().getFullYear();
    m = parts[1] || new Date().getMonth() + 1;
  }
  const nextDate = new Date(y, m, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
}

export interface MonthDropdownOption {
  value: string;
  label: string;
  badge?: string | number;
}

export interface MonthSelectorProps {
  selectedMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
  availableMonthKeys?: string[];
  monthCounts?: Map<string, number> | Record<string, number>;
  totalOrdersCount?: number;
  showAllOption?: boolean;
  allOptionLabel?: string;
  allOptionBadge?: string | number;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  isActive?: boolean;
  className?: string;
  disabled?: boolean;
  formatLabel?: (key: string) => string;
}

export const MonthSelector = React.memo(function MonthSelector({
  selectedMonthKey,
  onSelectMonth,
  availableMonthKeys = [],
  monthCounts,
  totalOrdersCount,
  showAllOption = false,
  allOptionLabel,
  allOptionBadge,
  onPrevMonth,
  onNextMonth,
  isActive = false,
  className = 'w-[185px] h-10',
  disabled = false,
  formatLabel = formatMonthKeyLabelDefault,
}: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Закрытие выпадающего списка при клике снаружи
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Закрытие по клавише Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Объединяем и упорядочиваем доступные ключи месяцев
  const allSortedMonthKeys = useMemo(() => {
    const set = new Set(availableMonthKeys);
    if (selectedMonthKey && selectedMonthKey !== 'all') {
      set.add(selectedMonthKey);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [availableMonthKeys, selectedMonthKey]);

  // Опции для выпадающего меню
  const dropdownOptions = useMemo<MonthDropdownOption[]>(() => {
    const opts: MonthDropdownOption[] = [];

    if (showAllOption) {
      const defaultAllBadge = totalOrdersCount !== undefined ? totalOrdersCount : allOptionBadge;
      opts.push({
        value: 'all',
        label: allOptionLabel || 'Все месяцы',
        badge: defaultAllBadge,
      });
    }

    allSortedMonthKeys.forEach((key) => {
      let count: number | undefined;
      if (monthCounts instanceof Map) {
        count = monthCounts.get(key);
      } else if (monthCounts && typeof monthCounts === 'object') {
        count = (monthCounts as Record<string, number>)[key];
      }

      opts.push({
        value: key,
        label: formatLabel(key),
        badge: count,
      });
    });

    return opts;
  }, [allOptionBadge, allOptionLabel, allSortedMonthKeys, formatLabel, monthCounts, showAllOption, totalOrdersCount]);

  const handlePrev = () => {
    if (disabled) return;
    if (onPrevMonth) {
      onPrevMonth();
    } else {
      const prevKey = getPreviousMonthKey(selectedMonthKey);
      onSelectMonth(prevKey);
    }
  };

  const handleNext = () => {
    if (disabled) return;
    if (onNextMonth) {
      onNextMonth();
    } else {
      const nextKey = getNextMonthKey(selectedMonthKey);
      onSelectMonth(nextKey);
    }
  };

  const isSelectedOrOpen = (selectedMonthKey !== 'all' && Boolean(selectedMonthKey)) || isActive || isOpen;

  const currentDisplayText = useMemo(() => {
    if (selectedMonthKey === 'all') {
      return totalOrdersCount !== undefined ? `Все (${totalOrdersCount})` : 'Все месяцы';
    }
    if (!selectedMonthKey) {
      return 'Выберите месяц';
    }
    return formatLabel(selectedMonthKey);
  }, [formatLabel, selectedMonthKey, totalOrdersCount]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-neutral-950/80 border border-white/10 p-1 rounded-xl flex items-center justify-between shrink-0 shadow-inner select-none font-mono ${className}`}
    >
      {/* Кнопка «Предыдущий месяц» с фиксированным размером (никогда не смещается) */}
      <Tooltip content="Предыдущий месяц">
        <button
        type="button"
        onClick={handlePrev}
        disabled={disabled}
        aria-label="Предыдущий месяц"
        title="Предыдущий месяц"
          className="w-6 min-w-[24px] max-w-[24px] h-full rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
        </button>
      </Tooltip>

      {/* Центральная кнопка с иконкой и текстом месяца */}
      <Tooltip content="Нажмите, чтобы выбрать месяц">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-label={`Выбрать месяц: ${currentDisplayText}`}
          title={`Выбрать месяц: ${currentDisplayText}`}
          className={`group min-w-0 flex-1 h-full mx-0.5 flex items-center justify-center gap-1.5 px-1.5 rounded-lg text-xs font-mono cursor-pointer overflow-hidden ${
            isSelectedOrOpen
              ? 'bg-neutral-800 border border-white/15 text-white shadow-sm font-semibold'
              : 'bg-transparent border border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Calendar className={`w-3.5 h-3.5 shrink-0 transition-colors ${isSelectedOrOpen ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`} />
          <span className="truncate font-medium text-[11px] select-none text-center">
            {currentDisplayText}
          </span>
        </button>
      </Tooltip>

      {/* Кнопка «Следующий месяц» с фиксированным размером (никогда не смещается) */}
      <Tooltip content="Следующий месяц">
        <button
        type="button"
        onClick={handleNext}
        disabled={disabled}
        aria-label="Следующий месяц"
        title="Следующий месяц"
          className="w-6 min-w-[24px] max-w-[24px] h-full rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </Tooltip>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 3, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 min-w-[190px] rounded-xl bg-neutral-950 border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden flex flex-col font-mono select-none"
          >
            <div className="divide-y divide-white/[0.04] max-h-60 overflow-y-auto scrollbar-none">
              {dropdownOptions.map((opt) => {
                const isSelected = opt.value === selectedMonthKey;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onSelectMonth(opt.value);
                      setIsOpen(false);
                    }}
                    className={`relative w-full px-3 py-2 text-left flex items-center justify-between gap-2 cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-white/10 text-white font-semibold'
                        : 'bg-transparent hover:bg-white/5 text-neutral-300 hover:text-white'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white" />
                    )}

                    <span className="truncate text-xs font-mono pl-0.5">
                      {opt.label}
                    </span>

                    {opt.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono shrink-0 border border-white/10 bg-white/5 text-neutral-400">
                        {opt.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="px-3 py-1.5 bg-neutral-950 border-t border-white/5 text-[9px] font-mono text-neutral-500 uppercase tracking-wider flex items-center justify-between shrink-0">
              <span>{dropdownOptions.length} ОПЦИЙ</span>
              <span className="text-neutral-600">KUMO CRM</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
