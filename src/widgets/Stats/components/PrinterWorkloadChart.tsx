'use client';

import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Printer } from 'lucide-react';
import type { StatsReport } from '../types';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { StatsChartShell } from './StatsChartShell';
import { formatMoney, formatPrintTime } from './StatsKpiCards';

type View = 'hours' | 'profitPerHour';

export function PrinterWorkloadChart({ data }: { data: StatsReport['printerWorkload'] }) {
  const [view, setView] = useState<View>('hours');
  const reducedMotion = useReducedMotion();
  const hasHours = data.some((item) => item.hours > 0);
  const ranked = useMemo(() => [...data].sort((a, b) => b[view] - a[view] || a.label.localeCompare(b.label, 'ru')).slice(0, 8), [data, view]);
  const max = Math.max(1, ...ranked.map((item) => Math.max(0, item[view])));
  const display = (item: StatsReport['printerWorkload'][number]) => view === 'hours' ? formatPrintTime(item.hours) : `${formatMoney(item.profitPerHour)}/ч`;

  return (
    <StatsChartShell
      title="Загрузка принтеров"
      description="Машино-часы и доходность производственного парка"
      summary={ranked.map((item) => `${item.label}: ${display(item)}`).join('; ') || 'Нет расчётных данных по принтерам.'}
      icon={Printer}
      className="h-full"
      controls={<div className="flex gap-1"><CockpitButton isActive={view === 'hours'} onClick={() => setView('hours')}>Часы</CockpitButton><CockpitButton disabled={!hasHours} isActive={view === 'profitPerHour'} onClick={() => setView('profitPerHour')}>₽ / час</CockpitButton></div>}
    >
      <div className="min-h-64 space-y-3">
        {ranked.map((item, index) => (
          <div key={item.id}>
            <div className="mb-1 flex justify-between gap-3 font-mono text-[11px]"><span className="truncate text-neutral-300">{item.label}</span><strong className="text-cyan-400">{display(item)}</strong></div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-900"><motion.div className="h-full rounded-full bg-cyan-500/80" initial={reducedMotion ? false : { width: 0 }} animate={{ width: `${(Math.max(0, item[view]) / max) * 100}%` }} transition={{ type: 'spring', bounce: .06, duration: .5, delay: index * .035 }} /></div>
          </div>
        ))}
        {data.length === 0 ? <p className="py-16 text-center text-xs text-neutral-600">Привяжите товары к принтерам, чтобы увидеть загрузку.</p> : null}
      </div>
    </StatsChartShell>
  );
}

