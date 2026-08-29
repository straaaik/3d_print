'use client';

import React from 'react';

export interface PageHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  accentColor?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`bg-neutral-950/90 border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden z-10 select-none font-mono ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-sm text-cyan-400">
            <Icon className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 font-sans">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-neutral-400 text-xs mt-0.5 leading-relaxed font-sans">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
