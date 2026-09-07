'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import {
  PeriodPreset,
  DateRange,
  getOrderMonthKey
} from '../helpers/statsCalculator';
import { DatePicker } from '../../../shared/ui/DatePicker';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { MonthSelector } from '../../../shared/ui/MonthSelector';
import type { Order } from '../../../shared/types';

interface PeriodFilterBarProps {
  selectedPreset: PeriodPreset;
  onSelectPreset: (preset: PeriodPreset) => void;
  selectedMonthKey: string;
  onSelectMonthKey: (key: string) => void;
  availableMonthKeys: string[];
  customRange: DateRange;
  onChangeCustomRange: (range: DateRange) => void;
  orders?: Order[];
}

const SHORTCUT_PRESETS: Array<{ id: PeriodPreset; label: string }> = [
  { id: 'today', label: 'Сегодня' },
  { id: '7d', label: '7 дней' },
  { id: '30d', label: '30 дней' },
];

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
  orders,
}: PeriodFilterBarProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(selectedPreset === 'custom');

  const monthOrdersCountMap = useMemo(() => {
    if (!orders || orders.length === 0) return undefined;
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const key = getOrderMonthKey(o);
      if (key) {
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [orders]);

  const handleMonthSelect = (mKey: string) => {
    setIsCustomOpen(false);
    if (mKey === 'all') {
      onSelectPreset('all');
    } else {
      onSelectMonthKey(mKey);
      onSelectPreset('month');
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
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2.5 sm:p-3 shadow-sm flex flex-col gap-2.5 font-mono text-xs select-none">
      {/* Строка элементов управления: выбор месяца, пресеты и даты */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Капсула выбора месяца из заказов с зафиксированными стрелками */}
          <MonthSelector
            selectedMonthKey={selectedPreset === 'month' ? selectedMonthKey : ''}
            onSelectMonth={handleMonthSelect}
            availableMonthKeys={availableMonthKeys}
            monthCounts={monthOrdersCountMap}
            totalOrdersCount={orders?.length}
            showAllOption={false}
            isActive={selectedPreset === 'month'}
            className="w-[185px] h-9"
          />

          {/* Кнопка «Вся история» */}
          <button
            type="button"
            onClick={() => {
              setIsCustomOpen(false);
              onSelectPreset('all');
            }}
            className={`px-3 h-9 rounded-xl text-xs font-mono font-semibold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedPreset === 'all'
                ? 'bg-neutral-800 text-white border border-white/15 shadow-sm font-bold'
                : 'bg-neutral-950/80 text-neutral-400 hover:text-white hover:bg-white/5 border border-white/10'
            }`}
          >
            {selectedPreset === 'all' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>Вся история</span>
          </button>
        </div>

        {/* Быстрые шорткаты и Календарь */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SHORTCUT_PRESETS.map((p) => {
            const isActive = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleShortcutClick(p.id)}
                className={`px-2.5 h-9 rounded-xl text-xs font-mono font-semibold cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-neutral-800 text-white border border-white/15 font-bold shadow-sm'
                    : 'bg-neutral-950/80 text-neutral-400 hover:text-neutral-200 border border-white/10 hover:bg-white/5'
                }`}
              >
                {p.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleCustomToggle}
            className={`px-2.5 h-9 rounded-xl text-xs font-mono font-semibold cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              selectedPreset === 'custom' || isCustomOpen
                ? 'bg-neutral-800 text-white border border-white/15 font-bold shadow-sm'
                : 'bg-neutral-950/80 text-neutral-400 hover:text-neutral-200 border border-white/10 hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span>Даты</span>
            <ChevronDown className={`w-3 h-3 ${isCustomOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Выпадающая панель кастомных дат */}
      {(isCustomOpen || selectedPreset === 'custom') && (
        <div className="pt-2.5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-end">
          <div>
            <DatePicker
              label="Дата начала"
              value={formatDateToInput(customRange.startDate)}
              onChange={handleStartDateChange}
              placeholder="Начало периода"
              format="DD.MM.YYYY"
            />
          </div>

          <div>
            <DatePicker
              label="Дата окончания"
              value={formatDateToInput(customRange.endDate)}
              onChange={handleEndDateChange}
              placeholder="Конец периода"
              format="DD.MM.YYYY"
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
                onSelectPreset('custom');
              }}
              className="flex-1 h-9 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white text-xs font-medium flex items-center justify-center cursor-pointer font-mono"
            >
              С 1 числа месяца
            </button>
            <Tooltip content="Сбросить даты">
              <button
                type="button"
                onClick={() => {
                  onChangeCustomRange({ startDate: null, endDate: null });
                  onSelectPreset('all');
                  setIsCustomOpen(false);
                }}
                className="h-9 px-3 rounded-xl bg-neutral-900 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-medium flex items-center justify-center gap-1 cursor-pointer font-mono"
              >
                <X className="w-3.5 h-3.5" />
                <span>Сброс</span>
              </button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
