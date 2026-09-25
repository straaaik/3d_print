'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { CalendarDays } from 'lucide-react';
import type { StatsReport } from '../types';
import { getHeatLevel, MONTH_NAMES_SHORT } from '../helpers/statsCalculator';
import { StatsChartShell } from './StatsChartShell';
import { formatMoney } from './StatsKpiCards';

interface ActivityHeatmapProps {
  data: StatsReport['activity'];
  range: { startDate: Date | null; endDate: Date | null };
  activeBucketKey: string | null;
  pinnedBucketKey: string | null;
  onActiveBucketChange: (key: string | null) => void;
  onPinnedBucketChange: (key: string | null) => void;
}

// Спокойная матовая палитра в стиле Cockpit Console (без яркого кислотного неона)
const LEVELS = [
  'bg-white/[0.03] border-white/5',
  'bg-emerald-950/80 border-emerald-900/50',
  'bg-emerald-900/80 border-emerald-700/60',
  'bg-emerald-700/85 border-emerald-600/70',
  'bg-emerald-600/90 border-emerald-500/80',
];

const WEEKDAYS = [
  { label: 'Пн', index: 0 },
  { label: '', index: 1 },
  { label: 'Ср', index: 2 },
  { label: '', index: 3 },
  { label: 'Пт', index: 4 },
  { label: '', index: 5 },
  { label: 'Вс', index: 6 },
];

interface DayCell {
  key: string;
  date: Date;
  orders: number;
  revenue: number;
  result: number;
  isInRange: boolean;
  isToday: boolean;
}

interface WeekColumn {
  weekIndex: number;
  monthLabel?: string;
  days: DayCell[];
}

export function ActivityHeatmap({
  data,
  range,
  activeBucketKey,
  pinnedBucketKey,
  onActiveBucketChange,
  onPinnedBucketChange,
}: ActivityHeatmapProps) {
  const { weeks, startDate, endDate, totalOrders, activeDaysCount, totalRevenue } = useMemo(() => {
    const map = new Map(data.map((item) => [item.key, item]));
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let rawStart: Date;
    let rawEnd: Date;

    if (range.startDate && range.endDate) {
      // Пользовательский или пресетный диапазон дат
      rawStart = new Date(range.startDate);
      rawEnd = new Date(range.endDate);
    } else if (data.length > 0) {
      // Режим «Вся история»: начинаем с первого месяца, где есть реальные заказы
      const firstOrderDate = data[0].date;
      const lastOrderDate = data[data.length - 1].date;
      rawStart = new Date(firstOrderDate.getFullYear(), firstOrderDate.getMonth(), 1);
      rawEnd = new Date(lastOrderDate.getFullYear(), lastOrderDate.getMonth() + 1, 0);

      // Если заказы были давно, доводим до конца текущего месяца
      if (now > rawEnd) {
        rawEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
    } else {
      // Заказов нет — показываем только текущий месяц вместо года пустоты
      rawStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rawEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    rawStart.setHours(12, 0, 0, 0);
    rawEnd.setHours(12, 0, 0, 0);

    // Ограничение максимум 365 дней в прошлое
    const maxCap = new Date(rawEnd);
    maxCap.setDate(maxCap.getDate() - 365);
    if (rawStart < maxCap) {
      rawStart = maxCap;
    }

    // Выравнивание начала на понедельник недели (0 = Пн)
    const startDayOfWeek = (rawStart.getDay() + 6) % 7;
    const alignedStart = new Date(rawStart);
    alignedStart.setDate(alignedStart.getDate() - startDayOfWeek);

    // Выравнивание конца на воскресенье недели
    const endDayOfWeek = (rawEnd.getDay() + 6) % 7;
    const alignedEnd = new Date(rawEnd);
    alignedEnd.setDate(alignedEnd.getDate() + (6 - endDayOfWeek));

    const allWeeks: WeekColumn[] = [];
    let currentWeekDays: DayCell[] = [];
    let weekIndex = 0;
    let lastSeenMonth = -1;

    let totalOrdersSum = 0;
    let activeDays = 0;
    let totalRevSum = 0;

    const cursor = new Date(alignedStart);
    while (cursor <= alignedEnd) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      const isInRange = cursor >= rawStart && cursor <= rawEnd;
      const existing = map.get(key);
      const orders = existing ? existing.orders : 0;
      const revenue = existing ? existing.revenue : 0;
      const result = existing ? existing.result : 0;

      if (isInRange) {
        if (orders > 0) activeDays += 1;
        totalOrdersSum += orders;
        totalRevSum += revenue;
      }

      currentWeekDays.push({
        key,
        date: new Date(cursor),
        orders,
        revenue,
        result,
        isInRange,
        isToday: key === todayKey,
      });

      if (currentWeekDays.length === 7) {
        const midDayOfWeek = currentWeekDays[3]?.date || currentWeekDays[0].date;
        let monthLabel: string | undefined = undefined;

        const currentMonth = midDayOfWeek.getMonth();
        if (currentMonth !== lastSeenMonth) {
          monthLabel = MONTH_NAMES_SHORT[currentMonth];
          lastSeenMonth = currentMonth;
        }

        allWeeks.push({
          weekIndex,
          monthLabel,
          days: currentWeekDays,
        });

        currentWeekDays = [];
        weekIndex += 1;
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      weeks: allWeeks,
      startDate: rawStart,
      endDate: rawEnd,
      totalOrders: totalOrdersSum,
      activeDaysCount: activeDays,
      totalRevenue: totalRevSum,
    };
  }, [data, range.endDate, range.startDate]);

  const allCells = useMemo(() => weeks.flatMap((w) => w.days), [weeks]);
  const maxOrders = useMemo(() => Math.max(0, ...allCells.map((item) => item.orders)), [allCells]);
  const selectedKey = pinnedBucketKey || activeBucketKey;

  const hoveredCell = useMemo(() => {
    if (!selectedKey) return null;
    return allCells.find((d) => d.key === selectedKey || (selectedKey.length === 7 && d.key.startsWith(selectedKey))) || null;
  }, [allCells, selectedKey]);

  const summary = `${activeDaysCount} активных дней · ${totalOrders} заказов · ${formatMoney(totalRevenue)} выручка`;

  return (
    <StatsChartShell
      title="Календарь активности"
      description="Интенсивность заказов по дням · наведите для просмотра деталей"
      summary={summary}
      icon={CalendarDays}
      className="w-full"
    >
      <div
        className="w-full overflow-x-auto p-1 pb-2"
        onMouseLeave={() => {
          if (!pinnedBucketKey) onActiveBucketChange(null);
        }}
      >
        <div className="inline-flex min-w-full flex-col gap-2">
          {/* Сетка календаря с днями недели и месяцами */}
          <div className="flex items-start gap-2">
            {/* Метки дней недели */}
            <div className="flex flex-col gap-1 pt-5 font-mono text-[9px] text-neutral-500 select-none">
              {WEEKDAYS.map((day, idx) => (
                <div key={idx} className="flex h-3.5 w-4 items-center justify-center sm:h-4">
                  {day.label}
                </div>
              ))}
            </div>

            {/* Колонки недель */}
            <div className="flex gap-1 sm:gap-1.5 py-1">
              {weeks.map((week) => (
                <div key={week.weekIndex} className="relative flex flex-col gap-1 hover:z-20">
                  {/* Подпись месяца над началом месяца */}
                  <div className="h-4 font-mono text-[10px] text-neutral-400 capitalize select-none text-left pl-0.5">
                    {week.monthLabel || ''}
                  </div>

                  {/* 7 ячеек недели (Пн-Вс) */}
                  <div className="flex flex-col gap-1">
                    {week.days.map((cell) => {
                      const level = cell.isInRange ? getHeatLevel(cell.orders, maxOrders) : 0;
                      const isSelected = selectedKey === cell.key || (selectedKey?.length === 7 && cell.key.startsWith(selectedKey));
                      const label = `${cell.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}: ${cell.orders} заказов, ${formatMoney(cell.revenue)}, результат ${formatMoney(cell.result)}`;

                      if (!cell.isInRange) {
                        return (
                          <div
                            key={cell.key}
                            aria-hidden="true"
                            className="h-3.5 w-3.5 rounded-[3px] border border-transparent bg-white/[0.01] opacity-20 sm:h-4 sm:w-4"
                          />
                        );
                      }

                      return (
                        <motion.button
                          key={cell.key}
                          type="button"
                          aria-label={label}
                          title={label}
                          onMouseEnter={() => onActiveBucketChange(cell.key)}
                          onFocus={() => onActiveBucketChange(cell.key)}
                          onClick={() => onPinnedBucketChange(pinnedBucketKey === cell.key ? null : cell.key)}
                          className={`relative h-3.5 w-3.5 rounded-[3px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 sm:h-4 sm:w-4 ${
                            LEVELS[level]
                          } ${
                            isSelected
                              ? 'z-20 border-white ring-1 ring-white/80 shadow-md'
                              : 'hover:z-30 hover:border-white/80 hover:shadow-lg'
                          } ${
                            cell.isToday && level === 0 ? 'ring-1 ring-white/20' : ''
                          }`}
                          whileHover={{ scale: 1.35, zIndex: 50 }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Нижняя информационная панель */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-2.5 font-mono text-[11px] text-neutral-400">
            {/* Текущее наведение или диапазон */}
            <div className="flex items-center gap-2">
              {hoveredCell ? (
                <div className="flex flex-wrap items-center gap-2 text-white">
                  <span className="font-semibold text-neutral-200">
                    {hoveredCell.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}:
                  </span>
                  <span className={hoveredCell.orders > 0 ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
                    {hoveredCell.orders} {hoveredCell.orders === 1 ? 'заказ' : hoveredCell.orders >= 2 && hoveredCell.orders <= 4 ? 'заказа' : 'заказов'}
                  </span>
                  {hoveredCell.orders > 0 ? (
                    <>
                      <span className="text-neutral-600">•</span>
                      <span>Выручка: {formatMoney(hoveredCell.revenue)}</span>
                      <span className="text-neutral-600">•</span>
                      <span className={hoveredCell.result >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                        Прибыль: {formatMoney(hoveredCell.result)}
                      </span>
                    </>
                  ) : null}
                </div>
              ) : (
                <span>
                  {startDate.toLocaleDateString('ru-RU')} — {endDate.toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>

            {/* Легенда */}
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
              <span>меньше</span>
              <div className="flex items-center gap-1">
                {LEVELS.map((levelClass, index) => (
                  <i
                    key={index}
                    className={`h-3 w-3 rounded-[2px] border ${levelClass}`}
                  />
                ))}
              </div>
              <span>больше</span>
            </div>
          </div>
        </div>
      </div>
    </StatsChartShell>
  );
}
