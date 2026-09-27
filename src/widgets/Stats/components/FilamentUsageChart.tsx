'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Layers3 } from 'lucide-react';
import type { RankedDatum } from '../types';
import { StatsChartShell } from './StatsChartShell';
import { formatWeight } from './StatsKpiCards';

export function FilamentUsageChart({ data, unknownG }: { data: RankedDatum[]; unknownG: number }) {
  const reducedMotion = useReducedMotion();
  const max = Math.max(1, ...data.map((item) => item.value));
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <StatsChartShell title="Расход филамента" description="Расчётный расход по связанным товарам" summary={data.map((item) => `${item.label}: ${formatWeight(item.value)}`).join('; ') || 'Нет расчётных данных по материалам.'} icon={Layers3} className="h-full">
      <div className="min-h-64 space-y-3">
        {data.slice(0, 8).map((item, index) => (
          <div key={item.id}>
            <div className="mb-1 flex justify-between gap-3 font-mono text-[11px]"><span className="truncate text-neutral-300">{item.label}</span><strong className="text-cyan-300">{formatWeight(item.value)}</strong></div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-900"><motion.div className="h-full rounded-full" style={{ backgroundColor: item.color || '#22d3ee' }} initial={reducedMotion ? false : { width: 0 }} animate={{ width: `${(item.value / max) * 100}%` }} transition={{ type: 'spring', bounce: .06, duration: .5, delay: index * .035 }} /></div>
          </div>
        ))}
        {data.length === 0 ? <p className="py-16 text-center text-xs text-neutral-600">Нет заказов со связанными товарами и материалами.</p> : null}
        <div className="mt-4 flex justify-between border-t border-white/10 pt-3 font-mono text-[10px] text-neutral-500"><span>ВСЕГО: {formatWeight(total)}</span><span className={unknownG > 0 ? 'text-amber-400' : 'text-neutral-600'}>НЕ УКАЗАНО: {formatWeight(unknownG)}</span></div>
      </div>
    </StatsChartShell>
  );
}

