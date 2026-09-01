'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowRight, CircleCheck, Info, ShieldAlert } from 'lucide-react';
import type { StatsInsight } from '../types';
import { CockpitButton } from '../../../shared/ui/CockpitButton';

const STYLES = {
  positive: { icon: CircleCheck, shell: 'border-emerald-500/20 bg-emerald-950/20', iconClass: 'text-emerald-400' },
  info: { icon: Info, shell: 'border-cyan-500/20 bg-cyan-950/20', iconClass: 'text-cyan-400' },
  warning: { icon: AlertTriangle, shell: 'border-amber-500/20 bg-amber-950/20', iconClass: 'text-amber-400' },
  critical: { icon: ShieldAlert, shell: 'border-rose-500/20 bg-rose-950/20', iconClass: 'text-rose-400' },
} as const;

export function StatsInsights({ insights }: { insights: StatsInsight[] }) {
  const router = useRouter();
  if (insights.length === 0) return null;

  return (
    <section aria-label="Автоматические выводы" className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2 font-mono"><h2 className="text-xs font-bold uppercase tracking-wider text-white">{'// Инсайты мастерской'}</h2><span className="text-[10px] text-neutral-600">{insights.length} СИГНАЛОВ</span></div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {insights.slice(0, 6).map((insight) => {
          const style = STYLES[insight.severity];
          const Icon = style.icon;
          return (
            <motion.article
              whileHover={{ transform: 'translateY(-2px)' }}
              key={insight.id}
              className={`flex min-h-28 flex-col justify-between rounded-xl border transition-colors p-3 ${style.shell}`}
            >
              <div className="flex items-start gap-2.5"><Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconClass}`} /><div><h3 className="font-mono text-[11px] font-bold text-white">{insight.title}</h3><p className="mt-1 text-xs leading-relaxed text-neutral-400">{insight.detail}</p></div></div>
              {insight.href ? <CockpitButton icon={ArrowRight} className="mt-3 self-end" onClick={() => router.push(insight.href!)}>Подробнее</CockpitButton> : null}
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

