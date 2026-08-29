'use client';

import React from 'react';

export interface MeridianCardProps {
  children: React.ReactNode;
  index?: string | number;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  headerActions?: React.ReactNode;
  accent?: 'cyan' | 'amber' | 'purple' | 'emerald' | 'rose' | 'none';
  variant?: 'default' | 'ledger' | 'ghost' | 'inset';
  className?: string;
  bodyClassName?: string;
}

export function MeridianCard({
  children,
  index,
  title,
  subtitle,
  badge,
  headerActions,
  accent = 'none',
  variant = 'default',
  className = '',
  bodyClassName = '',
}: MeridianCardProps) {
  const accentGradients = {
    cyan: 'from-cyan-400 via-cyan-600 to-transparent',
    amber: 'from-amber-400 via-amber-600 to-transparent',
    purple: 'from-purple-400 via-purple-600 to-transparent',
    emerald: 'from-emerald-400 via-emerald-600 to-transparent',
    rose: 'from-rose-400 via-rose-600 to-transparent',
    none: '',
  }[accent];

  const indexBg = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    none: 'bg-white/5 text-neutral-300 border-white/10',
  }[accent];

  const variantStyles = {
    default: 'bg-neutral-950/80 border-white/10 shadow-2xl backdrop-blur-2xl',
    ledger: 'bg-neutral-950/90 border-white/15 shadow-2xl backdrop-blur-2xl',
    ghost: 'bg-white/[0.02] border-white/10 hover:border-white/20',
    inset: 'bg-black/40 border-white/10 shadow-inner',
  }[variant];

  const hasHeader = index !== undefined || title || badge || headerActions;

  return (
    <div
      className={`border rounded-2xl relative overflow-hidden transition-all duration-200 select-none ${variantStyles} ${className}`}
    >
      {/* Верхняя акцентная линия */}
      {accent !== 'none' && (
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accentGradients} opacity-80`} />
      )}

      {/* Шапка карточки */}
      {hasHeader && (
        <div className="p-5 sm:p-6 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            {index !== undefined && (
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs border shadow-inner shrink-0 ${indexBg}`}
              >
                {typeof index === 'number' && index < 10 ? `0${index}` : index}
              </div>
            )}

            <div>
              {title && (
                <div className="flex items-center gap-2">
                  <h3 className="text-white text-base sm:text-lg font-bold tracking-tight">
                    {title}
                  </h3>
                  {badge}
                </div>
              )}
              {subtitle && (
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {headerActions && (
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Тело карточки */}
      <div className={`p-5 sm:p-6 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
