'use client';

import React from 'react';
import NumberFlow from '@number-flow/react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Percent,
  ReceiptText,
  Target,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { CockpitTiltCard } from '../../../shared/ui/CockpitTiltCard';
import type { FinancialMode, MetricDelta, StatsReportKpi } from '../types';
import { getFinancialLabels } from '../helpers/statsCalculator';

interface StatsKpiCardsProps {
  kpi: StatsReportKpi;
  deltas: Record<'revenue' | 'expenses' | 'result' | 'margin' | 'averageCheck', MetricDelta>;
  mode: FinancialMode;
  goal?: { target: number; actual: number; progressPercent: number | null };
}

export function formatMoney(num: number | undefined | null): string {
  return `${(Number(num) || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`;
}

export function formatWeight(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(2)} кг` : `${Math.round(grams)} г`;
}

export function formatPrintTime(decimalHours: number): string {
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} мин`;
  return minutes === 0 ? `${hours} ч` : `${hours} ч ${minutes} мин`;
}

const TONES = {
  cyan: 'text-cyan-300 bg-cyan-950/60 border-cyan-800/40',
  rose: 'text-rose-300 bg-rose-950/60 border-rose-800/40',
  emerald: 'text-emerald-300 bg-emerald-950/60 border-emerald-800/40',
  amber: 'text-amber-300 bg-amber-950/60 border-amber-800/40',
  neutral: 'text-neutral-300 bg-white/5 border-white/10',
} as const;

type Tone = keyof typeof TONES;

type KpiCard = {
  id: string;
  label: string;
  value: number;
  unit: string;
  icon: LucideIcon;
  tone: Tone;
  formula: string;
  footer: string;
  delta: MetricDelta | null;
  customDeltaText?: string;
  customDeltaColor?: string;
};

export function StatsKpiCards({ kpi, deltas, mode, goal }: StatsKpiCardsProps) {
  const labels = getFinancialLabels(mode);
  const resultTone: Tone = kpi.result >= 0 ? 'emerald' : 'rose';

  const isGoalSet = goal && goal.progressPercent !== null && goal.target > 0;
  const isGoalMet = isGoalSet && goal.actual >= goal.target;

  const cards: KpiCard[] = [
    {
      id: 'revenue', label: labels.revenue, value: kpi.revenue, unit: '₽', icon: ArrowUpRight, tone: 'cyan' as const,
      formula: mode === 'cash' ? 'Сумма фактически полученных оплат' : 'Сумма всех доходных заказов',
      footer: `${kpi.incomeOrders} доходных заказов`, delta: deltas.revenue,
    },
    {
      id: 'expenses', label: 'Расходы', value: kpi.expenses, unit: '₽', icon: ArrowDownRight, tone: 'rose' as const,
      formula: 'Себестоимость заказов + прямые расходы', footer: `${kpi.expenseOrders} прямых расходов`, delta: deltas.expenses,
    },
    {
      id: 'result', label: labels.result, value: kpi.result, unit: '₽', icon: TrendingUp, tone: resultTone,
      formula: `${labels.revenue} − расходы`, footer: kpi.result >= 0 ? 'Положительный результат' : 'Расходы выше дохода', delta: deltas.result,
    },
    {
      id: 'plan', label: 'План', value: goal?.target || 0, unit: '₽', icon: Target,
      tone: isGoalMet ? ('emerald' as const) : isGoalSet ? ('cyan' as const) : ('neutral' as const),
      formula: `Целевая сумма (${labels.result}) на выбранный период`,
      footer: isGoalSet
        ? (isGoalMet ? 'Цель достигнута' : `${formatMoney(Math.max(0, (goal?.target ?? 0) - (goal?.actual ?? 0)))} осталось`)
        : 'Цель не задана',
      delta: null,
      customDeltaText: isGoalSet ? `${goal.progressPercent?.toFixed(0)}%` : '—',
      customDeltaColor: isGoalMet ? 'text-emerald-400' : isGoalSet ? 'text-cyan-400' : 'text-neutral-700',
    },
    {
      id: 'margin', label: 'Маржинальность', value: kpi.margin, unit: '%', icon: Percent, tone: kpi.margin >= 20 ? 'emerald' as const : 'amber' as const,
      formula: `${labels.result} / ${labels.revenue} × 100`, footer: kpi.margin >= 20 ? 'Рабочий диапазон' : 'Ниже контрольных 20%', delta: deltas.margin,
    },
    {
      id: 'averageCheck', label: 'Средний чек', value: kpi.averageCheck, unit: '₽', icon: ReceiptText, tone: 'cyan' as const,
      formula: `${labels.revenue} / количество доходных заказов`, footer: `${kpi.completedOrders} завершено`, delta: deltas.averageCheck,
    },
    {
      id: 'receivables', label: 'К получению', value: kpi.receivables, unit: '₽', icon: WalletCards, tone: kpi.receivables > 0 ? 'amber' as const : 'neutral' as const,
      formula: 'Сумма заказов − полученные оплаты', footer: `${kpi.unpaidOrders} неоплаченных заказов`, delta: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {cards.map((card) => {
        const Icon = card.icon;
        const isNegative = card.value < 0;
        return (
          <CockpitTiltCard
            key={card.id}
            tone={card.tone}
            className="flex min-h-36 flex-col justify-between p-4"
            backContent={(
              <div className="flex h-full flex-col justify-between font-mono text-[10px]">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400 truncate">
                    {card.label}
                  </span>
                </div>
                <div className="my-auto space-y-1.5 py-1">
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase">Формула:</span>
                    <span className="text-neutral-300 text-[10px] leading-tight block">{card.formula}</span>
                  </div>
                  {card.delta && (
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-neutral-500">Динамика:</span>
                      <span className={`font-bold tabular-nums ${card.delta.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {card.delta.value >= 0 ? '+' : ''}{formatMoney(card.delta.value)} ({card.delta.percent !== null ? `${card.delta.percent >= 0 ? '+' : ''}${card.delta.percent.toFixed(1)}%` : '—'})
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-neutral-500">Контекст:</span>
                    <span className="text-white font-semibold truncate">{card.footer}</span>
                  </div>
                </div>
              </div>
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">{card.label}</span>
                <Tooltip content={card.formula}>
                  <CircleDollarSign aria-label={`Формула: ${card.formula}`} className="h-3.5 w-3.5 cursor-help text-neutral-600 hover:text-cyan-400" />
                </Tooltip>
              </div>
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${TONES[card.tone]}`}>
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>

            <div className={`my-3 flex items-baseline gap-1 font-mono text-2xl font-bold tabular-nums ${isNegative ? 'text-rose-400' : TONES[card.tone].split(' ')[0]}`}>
              <NumberFlow
                value={card.value}
                locales="ru-RU"
                format={{ maximumFractionDigits: card.unit === '%' ? 1 : 0 }}
                respectMotionPreference
              />
              <span className="text-sm text-neutral-500">{card.unit}</span>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2 font-mono text-[10px] text-neutral-500">
              <span className="truncate">{card.footer}</span>
              {card.customDeltaText ? (
                <span className={card.customDeltaColor || 'text-neutral-400 font-semibold'}>
                  {card.customDeltaText}
                </span>
              ) : card.delta && card.delta.percent !== null ? (
                <span className={card.delta.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {card.delta.value >= 0 ? '▲' : '▼'} {Math.abs(card.delta.percent).toFixed(1)}%
                </span>
              ) : (
                <span className="text-neutral-700">—</span>
              )}
            </div>
          </CockpitTiltCard>
        );
      })}
    </div>
  );
}

