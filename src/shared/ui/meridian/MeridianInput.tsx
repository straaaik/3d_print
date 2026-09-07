'use client';

import React from 'react';

export interface MeridianInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  unit?: string;
  icon?: React.ComponentType<{ className?: string }>;
  error?: string;
  accent?: 'cyan' | 'amber' | 'emerald' | 'purple';
}

export const MeridianInput = React.forwardRef<HTMLInputElement, MeridianInputProps>(
  (
    {
      label,
      sublabel,
      unit,
      icon: Icon,
      error,
      accent = 'cyan',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toString().replace(/\s+/g, '-').toLowerCase()}` : undefined);

    const focusBorders = {
      cyan: 'focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30',
      amber: 'focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30',
      emerald: 'focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30',
      purple: 'focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30',
    }[accent];

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {(label || sublabel) && (
          <div className="flex items-center justify-between gap-2 text-xs">
            {label && (
              <label htmlFor={inputId} className="font-semibold text-neutral-300 flex items-center gap-1.5 select-none">
                {Icon && <Icon className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{label}</span>
              </label>
            )}
            {sublabel && (
              <span className="text-neutral-400 font-mono text-[11px]">
                {sublabel}
              </span>
            )}
          </div>
        )}

        <div className="relative flex items-center w-full">
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-10 sm:h-11 bg-neutral-900 border border-white/15 hover:border-white/30 ${focusBorders} focus:outline-none rounded-xl px-3.5 text-white text-xs sm:text-sm font-mono font-medium duration-200 placeholder-neutral-600 shadow-inner ${
              unit ? 'pr-9' : ''
            } ${error ? '!border-rose-500/80 !ring-rose-500/20' : ''} ${className}`}
            {...props}
          />

          {unit && (
            <span className="absolute right-3.5 text-xs text-neutral-500 font-mono pointer-events-none font-bold select-none">
              {unit}
            </span>
          )}
        </div>

        {error && (
          <span className="text-[11px] font-mono text-rose-400 mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);

MeridianInput.displayName = 'MeridianInput';
