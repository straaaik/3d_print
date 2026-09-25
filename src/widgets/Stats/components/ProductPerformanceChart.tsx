'use client';

import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PackageSearch } from 'lucide-react';
import type { StatsReport } from '../types';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { StatsChartShell } from './StatsChartShell';
import { formatMoney } from './StatsKpiCards';

type Metric = 'profit' | 'revenue' | 'quantity';

export function ProductPerformanceChart({ data }: { data: StatsReport['products'] }) {
  const [metric, setMetric] = useState<Metric>('profit');
  const reducedMotion = useReducedMotion();
  const ranked = useMemo(() => [...data].sort((a, b) => b[metric] - a[metric] || a.label.localeCompare(b.label, 'ru')).slice(0, 8), [data, metric]);
  const max = Math.max(1, ...ranked.map((item) => Math.abs(item[metric])));
  const valueLabel = (item: StatsReport['products'][number]) => metric === 'quantity' ? `${item.quantity} шт.` : formatMoney(item[metric]);

  return (
    <StatsChartShell
      title="Эффективность товаров"
      description="Лидеры каталога в выбранном финансовом режиме"
      summary={ranked.map((item) => `${item.label}: ${valueLabel(item)}`).join('; ') || 'Нет связанных товаров.'}
      icon={PackageSearch}
      className="h-full"
      controls={<div className="flex gap-1"><CockpitButton isActive={metric === 'profit'} onClick={() => setMetric('profit')}>Прибыль</CockpitButton><CockpitButton isActive={metric === 'revenue'} onClick={() => setMetric('revenue')}>Выручка</CockpitButton><CockpitButton isActive={metric === 'quantity'} onClick={() => setMetric('quantity')}>Штуки</CockpitButton></div>}
    >
      <div className="min-h-72 space-y-3">
        {ranked.length === 0 ? <p className="py-20 text-center text-xs text-neutral-600">Свяжите заказы с товарами, чтобы увидеть рейтинг.</p> : ranked.map((item, index) => {
          const value = item[metric];
          const percent = (Math.abs(value) / max) * 100;
          return (
            <div key={item.id} className="group">
              <div className="mb-1 flex items-center justify-between gap-3 font-mono text-[11px]"><span className="min-w-0 truncate text-neutral-300"><b className="mr-2 text-neutral-600">{String(index + 1).padStart(2, '0')}</b>{item.label}</span><strong className={value < 0 ? 'text-rose-400' : 'text-white'}>{valueLabel(item)}</strong></div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-900">
                <motion.div className={value < 0 ? 'h-full rounded-full bg-rose-500/80' : 'h-full rounded-full bg-cyan-500/80'} initial={reducedMotion ? false : { width: 0 }} animate={{ width: `${percent}%` }} transition={{ type: 'spring', bounce: .06, duration: .5, delay: index * .035 }} />
              </div>
            </div>
          );
        })}
        {data.length > 8 ? <p className="border-t border-white/10 pt-2 text-right font-mono text-[10px] text-neutral-600">ещё {data.length - 8} позиций</p> : null}
      </div>
    </StatsChartShell>
  );
}

