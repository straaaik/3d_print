'use client';

import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AreaChart, BarChart3 } from 'lucide-react';
import type { ChartBucket } from '../helpers/statsCalculator';
import type { FinancialMode } from '../types';
import { getFinancialLabels } from '../helpers/statsCalculator';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { StatsChartShell } from './StatsChartShell';
import { formatMoney } from './StatsKpiCards';

interface FinancialDynamicsChartProps {
  data: ChartBucket[];
  periodLabel: string;
  mode: FinancialMode;
  activeBucketKey: string | null;
  pinnedBucketKey: string | null;
  onActiveBucketChange: (key: string | null) => void;
  onPinnedBucketChange: (key: string | null) => void;
}

type ChartView = 'bars' | 'area';
type Series = 'all' | 'revenue' | 'expense' | 'profit';

const WIDTH = 920;
const HEIGHT = 320;
const MARGIN = { top: 20, right: 18, bottom: 42, left: 64 };

export function FinancialDynamicsChart({
  data,
  periodLabel,
  mode,
  activeBucketKey,
  pinnedBucketKey,
  onActiveBucketChange,
  onPinnedBucketChange,
}: FinancialDynamicsChartProps) {
  const [view, setView] = useState<ChartView>('area');
  const [series, setSeries] = useState<Series>('all');
  const reducedMotion = useReducedMotion();
  const labels = getFinancialLabels(mode);
  const selectedKey = pinnedBucketKey || activeBucketKey;
  const selected = data.find((item) => item.key === selectedKey) || null;
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { min, max, ticks } = useMemo(() => {
    let localMin = 0;
    let localMax = 0;
    for (const point of data) {
      if (series === 'all' || series === 'revenue') localMax = Math.max(localMax, point.revenue);
      if (series === 'all' || series === 'expense') localMax = Math.max(localMax, point.expense);
      if (series === 'all' || series === 'profit') {
        localMax = Math.max(localMax, point.profit);
        localMin = Math.min(localMin, point.profit);
      }
    }
    if (localMax === 0 && localMin === 0) localMax = 1;
    const padding = Math.max(1, (localMax - localMin) * 0.12);
    const chartMin = localMin < 0 ? localMin - padding : 0;
    const chartMax = localMax + padding;
    return {
      min: chartMin,
      max: chartMax,
      ticks: Array.from({ length: 5 }, (_, index) => chartMin + ((chartMax - chartMin) * index) / 4),
    };
  }, [data, series]);

  const x = (index: number) => MARGIN.left + (innerWidth * (index + 0.5)) / Math.max(1, data.length);
  const y = (value: number) => MARGIN.top + innerHeight - ((value - min) / (max - min)) * innerHeight;
  const zeroY = y(0);
  const barSlot = innerWidth / Math.max(1, data.length);
  const linePath = (key: 'revenue' | 'expense' | 'profit') =>
    data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point[key])}`).join(' ');
  const areaPath = (key: 'revenue' | 'expense' | 'profit') => {
    if (data.length === 0) return '';
    return `${linePath(key)} L ${x(data.length - 1)} ${zeroY} L ${x(0)} ${zeroY} Z`;
  };

  const seriesConfig = [
    { id: 'revenue' as const, label: labels.revenue, color: '#22d3ee' },
    { id: 'expense' as const, label: 'Расходы', color: '#fb7185' },
    { id: 'profit' as const, label: labels.result, color: '#34d399' },
  ];
  const visibleSeries = series === 'all' ? seriesConfig : seriesConfig.filter((item) => item.id === series);
  const summary = `${labels.revenue}: ${formatMoney(data.reduce((sum, item) => sum + item.revenue, 0))}; расходы: ${formatMoney(data.reduce((sum, item) => sum + item.expense, 0))}; ${labels.result.toLocaleLowerCase('ru')}: ${formatMoney(data.reduce((sum, item) => sum + item.profit, 0))}.`;

  return (
    <StatsChartShell
      title="Финансовая динамика"
      description={`${periodLabel} · наведение показывает срез, клик закрепляет точку`}
      summary={summary}
      icon={BarChart3}
      className="xl:col-span-2"
      controls={
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <CockpitButton icon={BarChart3} isActive={view === 'bars'} onClick={() => setView('bars')}>Столбцы</CockpitButton>
          <CockpitButton icon={AreaChart} isActive={view === 'area'} onClick={() => setView('area')}>Линии</CockpitButton>
        </div>
      }
    >
      <div className="mb-3 flex max-w-full gap-1 overflow-x-auto pb-1">
        <CockpitButton isActive={series === 'all'} onClick={() => setSeries('all')}>Все</CockpitButton>
        {seriesConfig.map((item) => (
          <CockpitButton key={item.id} dotColor="" isActive={series === item.id} onClick={() => setSeries(item.id)}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </CockpitButton>
        ))}
      </div>

      <div
        className="relative min-h-[280px] w-full overflow-x-auto"
        onMouseLeave={() => { if (!pinnedBucketKey) onActiveBucketChange(null); }}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="min-w-[680px] w-full" role="img" aria-label={summary}>
          <defs>
            <linearGradient id="statsRevenueArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity=".28" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="statsExpenseArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity=".20" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="statsProfitArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity=".24" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke={Math.abs(tick) < 0.01 ? '#525252' : '#262626'} strokeDasharray="3 4" />
              <text x={MARGIN.left - 10} y={y(tick) + 4} textAnchor="end" fill="#737373" fontSize="10" fontFamily="monospace">
                {Math.abs(tick) >= 1000 ? `${Math.round(tick / 1000)}k` : Math.round(tick)}
              </text>
            </g>
          ))}

          {view === 'area' ? visibleSeries.map((item) => (
            <g key={item.id}>
              <motion.path d={areaPath(item.id)} fill={`url(#stats${item.id === 'revenue' ? 'Revenue' : item.id === 'expense' ? 'Expense' : 'Profit'}Area)`} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} />
              <motion.path
                d={linePath(item.id)}
                fill="none"
                stroke={item.color}
                strokeWidth="2.25"
                initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: .55, ease: 'easeOut' }}
              />
            </g>
          )) : data.flatMap((point, index) => visibleSeries.map((item, seriesIndex) => {
            const value = point[item.id];
            const width = Math.max(3, Math.min(20, (barSlot * .7) / visibleSeries.length));
            const left = x(index) - (width * visibleSeries.length) / 2 + width * seriesIndex;
            const height = Math.max(1, Math.abs(zeroY - y(value)));
            return (
              <motion.rect
                key={`${point.key}-${item.id}`}
                x={left}
                width={Math.max(2, width - 1)}
                rx="2"
                fill={item.color}
                initial={reducedMotion ? false : { y: zeroY, height: 0, opacity: 0 }}
                animate={{ y: value >= 0 ? y(value) : zeroY, height, opacity: selectedKey && selectedKey !== point.key ? .32 : .9 }}
                transition={{ type: 'spring', bounce: .08, duration: .45 }}
              />
            );
          }))}

          {data.map((point, index) => {
            const isActive = selectedKey === point.key;
            return (
              <g key={point.key}>
                {isActive ? <line x1={x(index)} x2={x(index)} y1={MARGIN.top} y2={zeroY} stroke="#e5e5e5" strokeDasharray="3 3" opacity=".75" /> : null}
                <rect
                  x={MARGIN.left + index * barSlot}
                  y={MARGIN.top}
                  width={barSlot}
                  height={innerHeight}
                  fill="transparent"
                  role="button"
                  tabIndex={0}
                  aria-label={`${point.label}: ${labels.revenue} ${formatMoney(point.revenue)}, расходы ${formatMoney(point.expense)}, ${labels.result.toLocaleLowerCase('ru')} ${formatMoney(point.profit)}`}
                  onMouseEnter={() => onActiveBucketChange(point.key)}
                  onFocus={() => onActiveBucketChange(point.key)}
                  onClick={() => onPinnedBucketChange(pinnedBucketKey === point.key ? null : point.key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onPinnedBucketChange(pinnedBucketKey === point.key ? null : point.key);
                    }
                    if (event.key === 'Escape') onPinnedBucketChange(null);
                  }}
                  className="cursor-crosshair outline-none focus:stroke-cyan-400"
                />
                {(index % Math.max(1, Math.ceil(data.length / 10)) === 0 || index === data.length - 1) ? (
                  <text x={x(index)} y={HEIGHT - 14} textAnchor="middle" fill={isActive ? '#f5f5f5' : '#737373'} fontSize="10" fontFamily="monospace">
                    {point.shortLabel}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {selected ? (
          <div className="pointer-events-none absolute right-2 top-2 min-w-48 rounded-xl border border-white/15 bg-neutral-950/95 p-3 font-mono text-[11px] shadow-2xl backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
              <strong className="text-white">{selected.label}</strong>
              {pinnedBucketKey ? <span className="text-cyan-400">PIN</span> : null}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between gap-4 text-cyan-300"><span>{labels.revenue}</span><b>{formatMoney(selected.revenue)}</b></div>
              <div className="flex justify-between gap-4 text-rose-300"><span>Расходы</span><b>{formatMoney(selected.expense)}</b></div>
              <div className={`flex justify-between gap-4 ${selected.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}><span>{labels.result}</span><b>{formatMoney(selected.profit)}</b></div>
            </div>
          </div>
        ) : null}
      </div>
    </StatsChartShell>
  );
}

