import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsChartShellProps {
  title: string;
  description: string;
  summary: string;
  icon?: LucideIcon;
  controls?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function StatsChartShell({
  title,
  description,
  summary,
  icon: Icon,
  controls,
  children,
  className = '',
  contentClassName = '',
}: StatsChartShellProps) {
  return (
    <section
      aria-label={title}
      className={`rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/20 ${className}`}
    >
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon ? <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-400" /> : null}
            <h2 className="truncate font-mono text-xs font-bold uppercase tracking-wider text-white">{title}</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">{description}</p>
        </div>
        {controls ? <div className="shrink-0">{controls}</div> : null}
      </div>
      <p className="sr-only">{summary}</p>
      <div className={`p-4 ${contentClassName}`}>{children}</div>
    </section>
  );
}

