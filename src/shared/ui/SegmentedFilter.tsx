'use client';

import { useId, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

export interface SegmentedFilterOption<Value extends string> {
  value: Value;
  label: string;
  icon: LucideIcon;
  badge?: ReactNode;
  ariaLabel?: string;
}

interface SegmentedFilterProps<Value extends string> {
  value: Value;
  onChange: (value: Value) => void;
  options: ReadonlyArray<SegmentedFilterOption<Value>>;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  layoutId?: string;
}

export function SegmentedFilter<Value extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  disabled = false,
  className = '',
  layoutId,
}: SegmentedFilterProps<Value>) {
  const generatedId = useId();
  const activeIndicatorId = layoutId || `segmented-filter-active-${generatedId}`;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`flex h-10 shrink-0 items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-neutral-950/80 p-1 shadow-inner ${className}`}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.ariaLabel ?? option.label}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`group relative flex h-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 select-none ${
              isActive
                ? 'text-white'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={activeIndicatorId}
                className="absolute inset-0 rounded-lg bg-neutral-800 border border-white/15 shadow-sm"
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 32,
                  mass: 0.8,
                }}
              />
            )}
            <Icon
              aria-hidden="true"
              className={`relative z-10 h-3.5 w-3.5 shrink-0 transition-colors ${
                isActive ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'
              }`}
            />
            <span className={`relative z-10 transition-colors ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`}>
              {option.label}
            </span>
            {option.badge !== undefined && option.badge !== null ? (
              <span
                className={`relative z-10 rounded px-1.5 py-0.5 font-mono text-[10px] leading-none transition-colors ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
                }`}
              >
                {option.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
