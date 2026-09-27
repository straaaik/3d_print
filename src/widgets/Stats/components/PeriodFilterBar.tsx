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
import { CockpitButton } from '../../../shared/ui/CockpitButton';
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
  rightSlot?: React.ReactNode;
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
  rightSlot,
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
      {/* Строка элементов управления: выбор месяца, пресеты, даты и правый слот (режим) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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
            className="w-[185px] h-10"
          />

          {/* Сегментированная группа фильтра периода */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-neutral-950/80 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setIsCustomOpen(false);
                onSelectPreset('all');
              }}
              className={`h-8 px-2.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 select-none ${
                selectedPreset === 'all'
                  ? 'bg-neutral-800 text-white font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {selectedPreset === 'all' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              <span>Вся история</span>
            </button>

            {SHORTCUT_PRESETS.map((p) => {
              const isActive = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleShortcutClick(p.id)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer select-none ${
                    isActive
                      ? 'bg-neutral-800 text-white font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleCustomToggle}
              className={`h-8 px-2.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1 select-none ${
                selectedPreset === 'custom' || isCustomOpen
                  ? 'bg-neutral-800 text-white font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span>Даты</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isCustomOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {rightSlot ? (
          <div className="shrink-0 flex items-center justify-start xl:justify-end">
            {rightSlot}
          </div>
        ) : null}
      </div>

      {/* Выпадающая панель кастомных дат */}
      {(isCustomOpen || selectedPreset === 'custom') && (
        <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
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
            <CockpitButton
              onClick={() => {
                const now = new Date();
                onChangeCustomRange({
                  startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                  endDate: now,
                });
                onSelectPreset('custom');
              }}
              className="flex-1 justify-center"
            >
              С 1 числа месяца
            </CockpitButton>
            <CockpitButton
              icon={X}
              onClick={() => {
                onChangeCustomRange({ startDate: null, endDate: null });
                onSelectPreset('all');
                setIsCustomOpen(false);
              }}
              title="Сбросить выбранный диапазон"
            >
              Сброс
            </CockpitButton>
          </div>
        </div>
      )}
    </div>
  );
}
