'use client';

import React from 'react';
import { MotionSpinner } from '../MotionPrimitives';

export interface MeridianButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'pill-white' | 'pill-cyan' | 'pill-emerald' | 'pill-purple' | 'pill-outline' | 'ghost' | 'bracket' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  iconPosition?: 'left' | 'right';
}

export const MeridianButton = React.forwardRef<HTMLButtonElement, MeridianButtonProps>(
  (
    {
      children,
      variant = 'pill-white',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon: Icon,
      iconPosition = 'left',
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: 'h-7 px-2.5 text-[11px] gap-1.5 rounded-lg',
      sm: 'h-9 px-3.5 text-xs gap-1.5 rounded-xl',
      md: 'h-11 px-5 text-xs sm:text-sm gap-2 rounded-xl',
      lg: 'h-12 sm:h-13 px-6 sm:px-8 text-sm sm:text-base gap-2.5 rounded-2xl',
    }[size];

    const variantClasses = {
      'pill-white':
        'bg-white text-neutral-950 hover:bg-neutral-200 shadow-[0_0_20px_-3px_rgba(255,255,255,0.35)] font-bold border border-transparent',
      'pill-cyan':
        'bg-cyan-400 text-neutral-950 hover:bg-cyan-300 shadow-[0_0_20px_-3px_rgba(6,182,212,0.4)] font-bold border border-transparent',
      'pill-emerald':
        'bg-emerald-500 text-neutral-950 hover:bg-emerald-400 shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)] font-bold border border-transparent',
      'pill-purple':
        'bg-purple-500 text-white hover:bg-purple-400 shadow-[0_0_20px_-3px_rgba(168,85,247,0.4)] font-bold border border-transparent',
      'pill-outline':
        'bg-white/[0.03] hover:bg-white/10 text-white border border-white/15 hover:border-white/30 font-medium ',
      ghost:
        'bg-transparent hover:bg-white/5 text-neutral-300 hover:text-white border border-transparent font-medium',
      bracket:
        'bg-transparent hover:bg-white/5 text-neutral-400 hover:text-cyan-400 border border-transparent font-mono text-xs',
      danger:
        'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/40 font-semibold',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-sans tracking-tight duration-200 cursor-pointer select-none disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed ${
          fullWidth ? 'w-full' : ''
        } ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {loading ? (
          <MotionSpinner className="w-4 h-4 rounded-full border-2 border-current border-t-transparent shrink-0" />
        ) : (
          Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />
        )}

        {variant === 'bracket' ? (
          <span className="flex items-center">
            <span className="text-neutral-600 mr-1">[</span>
            <span>{children}</span>
            <span className="text-neutral-600 ml-1">]</span>
          </span>
        ) : (
          <span className="truncate">{children}</span>
        )}

        {!loading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
      </button>
    );
  }
);

MeridianButton.displayName = 'MeridianButton';
