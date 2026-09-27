'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { CockpitButton } from '../../../shared/ui/CockpitButton';

interface StatsEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function StatsEmptyState({ title, description, actionLabel, onAction, compact = false }: StatsEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'min-h-40 p-4' : 'min-h-64 p-6'}`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
        <BarChart3 aria-hidden="true" className="h-5 w-5 text-neutral-500" />
      </div>
      <h3 className="font-mono text-sm font-bold text-white">{title}</h3>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-500">{description}</p>
      {actionLabel && onAction ? (
        <CockpitButton className="mt-4" onClick={onAction}>{actionLabel}</CockpitButton>
      ) : null}
    </div>
  );
}
