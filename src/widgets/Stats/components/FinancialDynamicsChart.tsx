'use client';

import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  LineChart as LineChartIcon, 
  DollarSign, 
  Calendar,
  Layers,
  Printer,
  Sparkles,
  Info
} from 'lucide-react';
import { ChartBucket } from '../helpers/statsCalculator';
import { formatMoney, formatWeight, formatPrintTime } from './StatsKpiCards';
import { Tooltip } from '@/shared/ui/Tooltip';

interface FinancialDynamicsChartProps {
  data: ChartBucket[];
  periodLabel: string;
}

type ChartType = 'bar' | 'area';
type SeriesView = 'all' | 'revenue' | 'profit' | 'expense';

export function FinancialDynamicsChart({ data, periodLabel }: FinancialDynamicsChartProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [seriesView, setSeriesView] = useState<SeriesView>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasData = useMemo(() => {
    return data.some(d => d.revenue > 0 || d.expense > 0 || d.profit !== 0);
  }, [data]);

  const { minVal, maxVal, bestDay, totalRev, totalExp, totalProf } = useMemo(() => {
    let min = 0;
    let max = 0;
    let best = data[0] || null;
    let rev = 0;
    let exp = 0;
    let prof = 0;

    for (const d of data) {
      rev += d.revenue;
      exp += d.expense;
      prof += d.profit;

      if (seriesView === 'all') {
        max = Math.max(max, d.revenue, d.expense, d.profit);
        min = Math.min(min, d.profit);
      } else if (seriesView === 'revenue') {
        max = Math.max(max, d.revenue);
      } else if (seriesView === 'expense') {
        max = Math.max(max, d.expense);
      } else if (seriesView === 'profit') {
        max = Math.max(max, d.profit);
        min = Math.min(min, d.profit);
      }

      if (!best || d.profit > best.profit) {
        best = d;
      }
    }

    if (max === 0 && min === 0) {
      max = 10000;
    } else {
      max = Math.ceil((max * 1.15) / 1000) * 1000;
      if (min < 0) {
        min = Math.floor((min * 1.15) / 1000) * 1000;
      }
    }

    return { minVal: min, maxVal: max, bestDay: best, totalRev: rev, totalExp: exp, totalProf: prof };
  }, [data, seriesView]);

  const SVG_WIDTH = 900;
  const SVG_HEIGHT = 320;
  const MARGIN = { top: 25, right: 25, bottom: 40, left: 65 };
  const INNER_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
  const INNER_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

  const getY = (val: number) => {
    const range = maxVal - minVal;
    if (range === 0) return INNER_HEIGHT / 2 + MARGIN.top;
    const ratio = (val - minVal) / range;
    return MARGIN.top + INNER_HEIGHT - ratio * INNER_HEIGHT;
  };

  const zeroY = getY(0);

  const getX = (index: number) => {
    if (data.length <= 1) return MARGIN.left + INNER_WIDTH / 2;
    return MARGIN.left + (index / (data.length - 1)) * INNER_WIDTH;
  };

  const barSlotWidth = INNER_WIDTH / Math.max(1, data.length);
  const barWidth = Math.max(3, Math.min(28, barSlotWidth * 0.65));

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const count = 4;
    const step = (maxVal - minVal) / count;
    for (let i = 0; i <= count; i++) {
      ticks.push(minVal + step * i);
    }
    return ticks;
  }, [minVal, maxVal]);

  const generateSmoothPath = (key: 'revenue' | 'expense' | 'profit', isArea = false) => {
    if (data.length === 0) return '';
    if (data.length === 1) {
      const x = getX(0);
      const y = getY(data[0][key]);
      return isArea ? `M ${x - 20} ${zeroY} L ${x - 20} ${y} L ${x + 20} ${y} L ${x + 20} ${zeroY} Z` : `M ${x - 20} ${y} L ${x + 20} ${y}`;
    }

    const points = data.map((d, i) => ({
      x: getX(i),
      y: getY(d[key]),
    }));

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    if (isArea) {
      const last = points[points.length - 1];
      const first = points[0];
      path += ` L ${last.x} ${zeroY} L ${first.x} ${zeroY} Z`;
    }

    return path;
  };

  const xLabelInterval = useMemo(() => {
    const len = data.length;
    if (len <= 8) return 1;
    if (len <= 16) return 2;
    if (len <= 31) return 4;
    return Math.ceil(len / 10);
  }, [data.length]);

  const activeBucket = hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null;

  return (
    <div className="bg-neutral-950/90 border border-white/10 rounded-xl p-4 sm:p-6 shadow-xl relative flex flex-col gap-4 overflow-hidden select-none font-mono text-xs">
      {/* Верхняя шапка графика */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 font-sans">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Динамика доходов и расходов
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-neutral-300 border border-white/10 font-mono">
              {periodLabel}
            </span>
          </div>
          <p className="text-xs text-neutral-500 font-sans mt-0.5">
            Сравнение выручки, затрат и чистой прибыли во времени
          </p>
        </div>

        {/* Элементы управления */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Фильтр отображаемых серий */}
          <div className="flex items-center p-0.5 rounded-lg bg-neutral-900 border border-white/10">
            <button
              type="button"
              onClick={() => setSeriesView('all')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                seriesView === 'all'
                  ? 'bg-white/15 text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setSeriesView('revenue')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                seriesView === 'revenue'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-bold'
                  : 'text-neutral-400 hover:text-cyan-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Выручка
            </button>
            <button
              type="button"
              onClick={() => setSeriesView('profit')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                seriesView === 'profit'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-bold'
                  : 'text-neutral-400 hover:text-emerald-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Прибыль
            </button>
            <button
              type="button"
              onClick={() => setSeriesView('expense')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                seriesView === 'expense'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40 font-bold'
                  : 'text-neutral-400 hover:text-rose-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Расходы
            </button>
          </div>

          {/* Переключатель вида */}
          <div className="flex items-center p-0.5 rounded-lg bg-neutral-900 border border-white/10">
            <Tooltip content="Столбчатый график">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-white/15 text-white'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Плавная кривая">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-white/15 text-white'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                <LineChartIcon className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Интерактивная область SVG Графика */}
      <div 
        ref={containerRef}
        className="w-full relative overflow-hidden flex flex-col items-center justify-center min-h-[320px]"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Сетка */}
          {yTicks.map((val, idx) => {
            const y = getY(val);
            const isZero = Math.abs(val) < 0.01;
            return (
              <g key={idx}>
                <line
                  x1={MARGIN.left}
                  y1={y}
                  x2={SVG_WIDTH - MARGIN.right}
                  y2={y}
                  stroke={isZero ? '#404040' : '#262626'}
                  strokeDasharray={isZero ? '4 3' : '2 2'}
                  strokeWidth={isZero ? 1.5 : 1}
                />
                <text
                  x={MARGIN.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill={isZero ? '#a3a3a3' : '#525252'}
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {Math.abs(val) >= 1000000 
                    ? `${(val / 1000000).toFixed(1)}M ₽` 
                    : Math.abs(val) >= 1000 
                    ? `${Math.round(val / 1000)}k ₽` 
                    : `${Math.round(val)} ₽`}
                </text>
              </g>
            );
          })}

          {/* 1. РЕЖИМ СТОЛБЦОВ */}
          {chartType === 'bar' && data.map((d, i) => {
            const xCenter = getX(i);
            const isHovered = hoveredIndex === i;

            const revHeight = Math.abs(getY(d.revenue) - zeroY);
            const expHeight = Math.abs(getY(d.expense) - zeroY);
            const profHeight = Math.abs(getY(d.profit) - zeroY);

            const isMulti = seriesView === 'all';
            const w = isMulti ? Math.max(2, barWidth / 3) : barWidth;

            return (
              <g 
                key={d.key}
                className="cursor-pointer transition-opacity"
                opacity={hoveredIndex !== null && !isHovered ? 0.45 : 1}
                onMouseEnter={() => setHoveredIndex(i)}
              >
                {isHovered && (
                  <rect
                    x={xCenter - barSlotWidth / 2}
                    y={MARGIN.top}
                    width={barSlotWidth}
                    height={INNER_HEIGHT}
                    fill="#ffffff"
                    fillOpacity="0.04"
                    rx="4"
                  />
                )}

                {(seriesView === 'all' || seriesView === 'revenue') && d.revenue > 0 && (
                  <rect
                    x={isMulti ? xCenter - w * 1.5 : xCenter - w / 2}
                    y={Math.min(getY(d.revenue), zeroY)}
                    width={w}
                    height={Math.max(2, revHeight)}
                    fill="#06b6d4"
                    rx="1.5"
                  />
                )}

                {(seriesView === 'all' || seriesView === 'expense') && d.expense > 0 && (
                  <rect
                    x={isMulti ? xCenter - w * 0.5 : xCenter - w / 2}
                    y={Math.min(getY(d.expense), zeroY)}
                    width={w}
                    height={Math.max(2, expHeight)}
                    fill="#f43f5e"
                    rx="1.5"
                  />
                )}

                {(seriesView === 'all' || seriesView === 'profit') && (
                  <rect
                    x={isMulti ? xCenter + w * 0.5 : xCenter - w / 2}
                    y={d.profit >= 0 ? getY(d.profit) : zeroY}
                    width={w}
                    height={Math.max(2, profHeight)}
                    fill={d.profit >= 0 ? '#10b981' : '#fb7185'}
                    rx="1.5"
                  />
                )}
              </g>
            );
          })}

          {/* 2. РЕЖИМ КРИВЫХ */}
          {chartType === 'area' && (
            <g>
              {(seriesView === 'all' || seriesView === 'revenue') && (
                <>
                  <path
                    d={generateSmoothPath('revenue', true)}
                    fill="url(#revenueGrad)"
                  />
                  <path
                    d={generateSmoothPath('revenue', false)}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                  />
                </>
              )}

              {(seriesView === 'all' || seriesView === 'expense') && (
                <>
                  <path
                    d={generateSmoothPath('expense', true)}
                    fill="url(#expenseGrad)"
                  />
                  <path
                    d={generateSmoothPath('expense', false)}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                  />
                </>
              )}

              {(seriesView === 'all' || seriesView === 'profit') && (
                <>
                  <path
                    d={generateSmoothPath('profit', true)}
                    fill="url(#profitGrad)"
                  />
                  <path
                    d={generateSmoothPath('profit', false)}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                  />
                </>
              )}

              {data.map((d, i) => {
                const isHovered = hoveredIndex === i;
                const x = getX(i);
                return (
                  <g 
                    key={d.key} 
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                  >
                    <rect
                      x={x - barSlotWidth / 2}
                      y={MARGIN.top}
                      width={barSlotWidth}
                      height={INNER_HEIGHT}
                      fill="transparent"
                    />

                    {isHovered && (
                      <>
                        <line
                          x1={x}
                          y1={MARGIN.top}
                          x2={x}
                          y2={SVG_HEIGHT - MARGIN.bottom}
                          stroke="#ffffff"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                          opacity="0.4"
                        />
                        {(seriesView === 'all' || seriesView === 'profit') && (
                          <circle
                            cx={x}
                            cy={getY(d.profit)}
                            r="4.5"
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Подписи оси X */}
          {data.map((d, i) => {
            const isLabelVisible = i % xLabelInterval === 0 || i === data.length - 1;
            if (!isLabelVisible) return null;
            const x = getX(i);
            const isHovered = hoveredIndex === i;

            return (
              <text
                key={d.key}
                x={x}
                y={SVG_HEIGHT - 15}
                textAnchor="middle"
                fill={isHovered ? '#ffffff' : '#737373'}
                fontSize="11"
                fontWeight={isHovered ? 'bold' : 'normal'}
                fontFamily="monospace"
              >
                {d.shortLabel}
              </text>
            );
          })}
        </svg>

        {/* Плавающий тултип */}
        {activeBucket && (
          <div 
            className="absolute top-2 right-4 bg-neutral-950/95 backdrop-blur-md border border-white/20 rounded-xl p-3 shadow-2xl z-30 pointer-events-none min-w-[200px] flex flex-col gap-2 font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-white text-xs font-bold font-mono">
                {activeBucket.label}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-mono">
                {activeBucket.ordersCount} {activeBucket.ordersCount === 1 ? 'заказ' : 'заказов'}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-cyan-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Выручка:
                </span>
                <span className="font-mono font-bold text-white">
                  {formatMoney(activeBucket.revenue)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-rose-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Расходы:
                </span>
                <span className="font-mono font-bold text-white">
                  {formatMoney(activeBucket.expense)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-1">
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Прибыль:
                </span>
                <span className={`font-mono font-extrabold ${activeBucket.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activeBucket.profit >= 0 ? `+${formatMoney(activeBucket.profit)}` : formatMoney(activeBucket.profit)}
                </span>
              </div>

              {(activeBucket.filamentG > 0 || activeBucket.printHours > 0) && (
                <div className="border-t border-white/10 pt-1.5 flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-cyan-400" /> {formatWeight(activeBucket.filamentG)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Printer className="w-3 h-3 text-purple-400" /> {formatPrintTime(activeBucket.printHours)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Нижняя плашка */}
      <div className="border-t border-white/10 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center flex-wrap gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Выручка: <strong className="text-neutral-200 font-mono">{formatMoney(totalRev)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Расходы: <strong className="text-neutral-200 font-mono">{formatMoney(totalExp)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Чистая прибыль: <strong className={`font-mono ${totalProf >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{totalProf >= 0 ? `+${formatMoney(totalProf)}` : formatMoney(totalProf)}</strong></span>
          </div>
        </div>

        {bestDay && bestDay.profit > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-white/10 text-emerald-400 self-start md:self-auto font-mono">
            <Sparkles className="w-3 h-3" />
            <span>Пик: <strong className="text-white font-mono">{bestDay.label}</strong> ({formatMoney(bestDay.profit)})</span>
          </div>
        )}
      </div>
    </div>
  );
}
