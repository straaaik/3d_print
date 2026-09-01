'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { WalletCards } from 'lucide-react';
import { StatsChartShell } from './StatsChartShell';
import { formatMoney } from './StatsKpiCards';

interface PaymentGapChartProps {
  data: { ordered: number; paid: number; receivable: number };
}

export function PaymentGapChart({ data }: PaymentGapChartProps) {
  const reducedMotion = useReducedMotion();
  const base = Math.max(1, data.ordered, data.paid + data.receivable);
  const paidPercent = Math.max(0, Math.min(100, (data.paid / base) * 100));
  const duePercent = Math.max(0, Math.min(100 - paidPercent, (data.receivable / base) * 100));
  const coverage = data.ordered > 0 ? Math.min(999, (data.paid / data.ordered) * 100) : 0;

  return (
    <StatsChartShell
      title="Заказы и оплаты"
      description="Кассовый разрыв без смены смысла при переключении режима"
      summary={`Заказано ${formatMoney(data.ordered)}, оплачено ${formatMoney(data.paid)}, к получению ${formatMoney(data.receivable)}.`}
      icon={WalletCards}
      className="h-full"
    >
      <div className="flex min-h-48 flex-col justify-center">
        <div className="mb-2 flex items-end justify-between font-mono">
          <div><span className="text-[10px] uppercase text-neutral-500">Покрытие оплатами</span><strong className="mt-1 block text-2xl text-cyan-300">{coverage.toFixed(0)}%</strong></div>
          <span className="text-xs text-neutral-500">из {formatMoney(data.ordered)}</span>
        </div>
        <div className="flex h-9 overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
          <motion.div
            className="h-full bg-cyan-500/80"
            initial={reducedMotion ? false : { width: 0 }}
            animate={{ width: `${paidPercent}%` }}
            transition={{ type: 'spring', bounce: .06, duration: .55 }}
          />
          <motion.div
            className="h-full border-l border-neutral-950 bg-amber-500/70"
            initial={reducedMotion ? false : { width: 0 }}
            animate={{ width: `${duePercent}%` }}
            transition={{ type: 'spring', bounce: .06, duration: .55, delay: .08 }}
          />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 font-mono text-xs">
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/30 p-3"><span className="text-cyan-400">● Оплачено</span><strong className="mt-1 block text-base text-white">{formatMoney(data.paid)}</strong></div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-950/30 p-3"><span className="text-amber-400">◐ К получению</span><strong className="mt-1 block text-base text-white">{formatMoney(data.receivable)}</strong></div>
        </div>
      </div>
    </StatsChartShell>
  );
}

