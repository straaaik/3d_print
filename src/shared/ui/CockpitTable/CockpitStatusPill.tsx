'use client';

import React from 'react';
import { CockpitStatusPillProps, CockpitStatusTone } from './types';
import { MotionPulse } from '../MotionPrimitives';

const toneStyles: Record<CockpitStatusTone, {
  container: string;
  dot: string;
}> = {
  yellow: {
    container: 'bg-yellow-950/80 text-yellow-300 border-yellow-700/60',
    dot: 'bg-yellow-400',
  },
  amber: {
    container: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
    dot: 'bg-amber-400',
  },
  cyan: {
    container: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
    dot: 'bg-cyan-400',
  },
  emerald: {
    container: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
    dot: 'bg-emerald-400',
  },
  green: {
    container: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
    dot: 'bg-emerald-400',
  },
  rose: {
    container: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
    dot: 'bg-rose-400',
  },
  red: {
    container: 'bg-red-950/80 text-red-300 border-red-700/60',
    dot: 'bg-red-400',
  },
  purple: {
    container: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
    dot: 'bg-purple-400',
  },
  blue: {
    container: 'bg-blue-950/80 text-blue-300 border-blue-700/60',
    dot: 'bg-blue-400',
  },
  neutral: {
    container: 'bg-neutral-900 text-neutral-400 border-neutral-700/60',
    dot: 'bg-neutral-500',
  },
};

export function CockpitStatusPill({
  label,
  tone = 'neutral',
  icon: Icon,
  pulse = false,
  dot = true,
  className = '',
  size = 'sm',
}: CockpitStatusPillProps) {
  const styles = toneStyles[tone] || toneStyles.neutral;
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[10px] sm:text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono border font-medium select-none shadow-sm ${styles.container} ${sizeClasses} ${className}`}
    >
      {Icon ? (
        <Icon className="w-3 h-3 shrink-0" />
      ) : dot ? (
        <MotionPulse
          active={pulse}
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`}
        />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
