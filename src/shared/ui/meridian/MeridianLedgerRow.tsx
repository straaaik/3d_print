'use client';

import React from 'react';

export interface MeridianLedgerRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  badge?: React.ReactNode;
  variant?: 'default' | 'positive' | 'warning' | 'purple' | 'subtotal' | 'total';
  className?: string;
}

export function MeridianLedgerRow({
  label,
  value,
  sublabel,
  badge,
  variant = 'default',
  className = '',
}: MeridianLedgerRowProps) {
  const valueColors = {
    default: 'text-white',
    positive: 'text-emerald-400',
    warning: 'text-amber-400',
    purple: 'text-purple-300',
    subtotal: 'text-cyan-400 font-bold',
    total: 'text-white font-bold text-base',
  }[variant];

  const dotColors = {
    default: 'border-white/20',
    positive: 'border-emerald-500/20',
    warning: 'border-amber-500/20',
    purple: 'border-purple-500/20',
    subtotal: 'border-cyan-500/30',
    total: 'border-white/40',
  }[variant];

  return (
    <div className={`flex items-baseline justify-between py-1.5 font-mono text-xs ${className}`}>
      <div className="flex items-center gap-1.5 shrink-0 min-w-0 max-w-[60%] truncate">
        <span className="text-neutral-400 truncate">{label}</span>
        {badge}
      </div>

      <span className={`grow border-b border-dotted mx-2 ${dotColors}`} />

      <div className="shrink-0 text-right">
        <span className={`tabular-nums ${valueColors}`}>{value}</span>
        {sublabel && (
          <span className="text-[10px] text-neutral-500 block">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
