'use client';

import React from 'react';
import { MotionPing } from '../MotionPrimitives';

export interface MeridianBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'outline' | 'bracket';
  size?: 'xs' | 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export function MeridianBadge({
  children,
  variant = 'default',
  size = 'sm',
  pulse = false,
  className = '',
}: MeridianBadgeProps) {
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.2',
    sm: 'text-[10px] sm:text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size];

  const variantClasses = {
    default: 'bg-white/5 text-neutral-300 border-white/10',
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60 shadow-[0_0_12px_-3px_rgba(6,182,212,0.3)]',
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-[0_0_12px_-3px_rgba(16,185,129,0.3)]',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-[0_0_12px_-3px_rgba(245,158,11,0.3)]',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-700/60 shadow-[0_0_12px_-3px_rgba(244,63,94,0.3)]',
    purple: 'bg-purple-950/80 text-purple-300 border-purple-700/60 shadow-[0_0_12px_-3px_rgba(168,85,247,0.3)]',
    outline: 'bg-transparent text-neutral-400 border-white/20',
    bracket: 'bg-transparent text-neutral-300 border-transparent font-mono',
  }[variant];

  const dotColor = {
    default: 'bg-neutral-400',
    cyan: 'bg-cyan-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    purple: 'bg-purple-400',
    outline: 'bg-neutral-400',
    bracket: 'bg-cyan-400',
  }[variant];

  if (variant === 'bracket') {
    return (
      <span className={`inline-flex items-center gap-1 font-mono text-xs text-neutral-400 select-none ${className}`}>
        <span className="text-neutral-600">[</span>
        <span className="text-neutral-200">{children}</span>
        <span className="text-neutral-600">]</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-md border select-none ${sizeClasses} ${variantClasses} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <MotionPing className={`absolute inline-flex h-full w-full rounded-full ${dotColor}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`} />
        </span>
      )}
      <span>{children}</span>
    </span>
  );
}
