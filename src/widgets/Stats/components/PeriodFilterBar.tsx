'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Clock, 
  Filter, 
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  PeriodPreset, 
  DateRange, 
  MONTH_NAMES_SHORT, 
  formatMonthKeyLabel 
} from '../helpers/statsCalculator';
import { DatePicker } from '../../../shared/ui/DatePicker';

interface PeriodFilterBarProps {
  selectedPreset: PeriodPreset;
  onSelectPreset: (preset: PeriodPreset) => void;
  selectedMonthKey: string;
  onSelectMonthKey: (key: string) => void;
  availableMonthKeys: string[];
  customRange: DateRange;
  onChangeCustomRange: (range: DateRange) => void;
  actualRange: DateRange;
  ordersCount: number;
}

const SHORTCUT_PRESETS: Array<{ id: PeriodPreset; label: string }> = [
  { id: 'today', label: 'Сегодня' },
  { id: '7d', label: '7 дней' },
  { id: '30d', label: '30 дней' },
];

function formatRangeLabel(range: DateRange, preset: PeriodPreset, selectedMonthKey: string): string {
  if (preset === 'all') return 'Все заказы за всю историю';
  if (preset === 'month' && selectedMonthKey) {
    return formatMonthKeyLabel(selectedMonthKey);
  }
  if (!range.startDate && !range.endDate) return 'За всё время';

  const start = range.startDate;
  const end = range.endDate;

  if (start && end) {
    if (
      start.getDate() === end.getDate() &&
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()
    ) {
      return `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getFullYear()}`;
    }

    return `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getFullYear()} — ${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  }

  if (start) {
    return `С ${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  }

  if (end) {
    return `По ${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  }

  return 'За всё время';
}

function formatDateToInput(d: Date | null): string {
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function parseInputToDate(str: string): Date | null {
  if (!str) return null;
  const parts = str.split('.');
  if (parts.length >= 2) {
    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const year = parts[2] ? Number(parts[2]) : new Date().getFullYear();
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function PeriodFilterBar({
  selectedPreset,
  onSelectPreset,
  selectedMonthKey,
  onSelectMonthKey,
  availableMonthKeys,
  customRange,
  onChangeCustomRange,
  actualRange,
  ordersCount,
}: PeriodFilterBarProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(selectedPreset === 'custom');

  const handlePrevMonth = () => {
    if (availableMonthKeys.length === 0) return;
    const currentIndex = availableMonthKeys.indexOf(selectedMonthKey);
    if (currentIndex === -1 || currentIndex === availableMonthKeys.length - 1) {
      // Переходим к первому или следующему
      onSelectMonthKey(availableMonthKeys[0]);
    } else {
      onSelectMonthKey(availableMonthKeys[currentIndex + 1]);
    }
  };

  const handleNextMonth = () => {
    if (availableMonthKeys.length === 0) return;
    const currentIndex = availableMonthKeys.indexOf(selectedMonthKey);
    if (currentIndex <= 0) {
      onSelectMonthKey(availableMonthKeys[availableMonthKeys.length - 1]);
    } else {
      onSelectMonthKey(availableMonthKeys[currentIndex - 1]);
    }
  };

  const handleMonthClick = (mKey: string) => {
    setIsCustomOpen(false);
    if (mKey === 'all') {
      onSelectPreset('all');
    } else {
      onSelectMonthKey(mKey);
    }
  };

  const handleShortcutClick = (preset: PeriodPreset) => {
    setIsCustomOpen(false);
    onSelectPreset(preset);
  };

  const handleCustomToggle = () => {
    if (selectedPreset !== 'custom') {
      onSelectPreset('custom');
      setIsCustomOpen(true);
    } else {
      setIsCustomOpen(!isCustomOpen);
    }
  };

  const handleStartDateChange = (val: string) => {
    const d = parseInputToDate(val);
    onChangeCustomRange({ ...customRange, startDate: d });
  };

  const handleEndDateChange = (val: string) => {
    const d = parseInputToDate(val);
    onChangeCustomRange({ ...customRange, endDate: d });
  };

  return (
    <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col gap-3">
      {/* 1-Я СТРОКА: Месяцы с быстрым переключением и кнопками навигации */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Навигатор со стрелками */}
          <div className="flex items-center gap-1 bg-[#101217] border border-[#242930] p-1 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#242930] transition-colors cursor-pointer"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2.5 py-1 bg-[#16181d] border border-emerald-500/30 rounded-lg text-xs sm:text-sm font-bold text-white shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="whitespace-nowrap font-mono">
                {selectedPreset === 'all' 
                  ? 'Все месяцы' 
                  : selectedPreset === 'month' 
                  ? formatMonthKeyLabel(selectedMonthKey) 
                  : selectedPreset === 'today'
                  ? 'Сегодня'
                  : selectedPreset === '7d'
                  ? '7 дней'
                  : selectedPreset === '30d'
                  ? '30 дней'
                  : 'Период'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#242930] transition-colors cursor-pointer"
              title="Следующий месяц"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Вкладка «Все время» */}
          <button
            type="button"
            onClick={() => handleMonthClick('all')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedPreset === 'all'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/25 border border-emerald-400/40'
                : 'bg-[#101217] text-gray-400 hover:text-white hover:bg-[#1f232b] border border-[#242930]'
            }`}
          >
            {selectedPreset === 'all' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>Вся история</span>
          </button>

          {/* Список динамических кнопок месяцев, где есть заказы */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full lg:max-w-xl scrollbar-none">
            {availableMonthKeys.map((mKey) => {
              const isSelected = selectedPreset === 'month' && selectedMonthKey === mKey;
              return (
                <button
                  key={mKey}
                  type="button"
                  onClick={() => handleMonthClick(mKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/25 border border-emerald-400/40'
                      : 'bg-[#101217] text-gray-300 hover:text-white hover:bg-[#1f232b] border border-[#242930]'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  <span>{formatMonthKeyLabel(mKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Быстрые шорткаты и Календарь */}
        <div className="flex items-center gap-1.5 flex-wrap self-start lg:self-center">
          {SHORTCUT_PRESETS.map((p) => {
            const isActive = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleShortcutClick(p.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                    : 'bg-[#101217] text-gray-400 hover:text-gray-200 border border-[#242930]'
                }`}
              >
                {p.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleCustomToggle}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              selectedPreset === 'custom'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'bg-[#101217] text-gray-400 hover:text-gray-200 border border-[#242930]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Даты</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isCustomOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2-Я СТРОКА: Информационная плашка активного интервала */}
      <div className="flex items-center justify-between gap-2 text-xs border-t border-[#242930]/60 pt-2.5">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-gray-400">Активный диапазон:</span>
          <span className="font-mono text-emerald-300 font-semibold">
            {formatRangeLabel(actualRange, selectedPreset, selectedMonthKey)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-semibold">
            {ordersCount} {ordersCount === 1 ? 'заказ' : ordersCount < 5 ? 'заказа' : 'заказов'}
          </span>
        </div>
      </div>

      {/* Выпадающая панель выбора произвольных дат (если включен режим custom) */}
      {(isCustomOpen || selectedPreset === 'custom') && (
        <div className="pt-3 border-t border-[#242930]/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-end animate-in fade-in">
          <div>
            <DatePicker
              label="Дата начала"
              value={formatDateToInput(customRange.startDate)}
              onChange={handleStartDateChange}
              placeholder="Начало периода"
              format="DD.MM.YYYY"
              buttonClassName="bg-[#101217]"
            />
          </div>

          <div>
            <DatePicker
              label="Дата окончания"
              value={formatDateToInput(customRange.endDate)}
              onChange={handleEndDateChange}
              placeholder="Конец периода"
              format="DD.MM.YYYY"
              buttonClassName="bg-[#101217]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onChangeCustomRange({
                  startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                  endDate: now,
                });
              }}
              className="flex-1 h-9 px-3 rounded-xl bg-[#101217] hover:bg-[#20242d] border border-[#242930] text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center cursor-pointer"
            >
              С 1 числа месяца
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeCustomRange({ startDate: null, endDate: null });
                onSelectPreset('all');
                setIsCustomOpen(false);
              }}
              className="h-9 px-3 rounded-xl bg-[#101217] hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-[#242930] hover:border-rose-500/30 text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Сбросить даты"
            >
              <X className="w-3.5 h-3.5" />
              <span>Сброс</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
