'use client';

import React from 'react';
import { MotionPulse } from '../MotionPrimitives';

export interface MeridianSectionHeaderProps {
  stamp: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  version?: string;
  scale?: string;
  accuracy?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function MeridianSectionHeader({
  stamp,
  title,
  subtitle,
  version = 'v2.4',
  scale = '1 : 1',
  accuracy = '99.4%',
  actions,
  className = '',
}: MeridianSectionHeaderProps) {
  return (
    <div
      className={`border border-white/10 bg-neutral-950/80 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl relative overflow-hidden select-none ${className}`}
    >
      {/* Мягкая фоновая подсветка */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-cyan-500/10 blur-[90px] pointer-events-none -z-10" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          {/* Инженерный бейдж */}
          <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
            <MotionPulse className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-cyan-400 font-bold uppercase tracking-wider">{stamp}</span>
            <span>·</span>
            <span>KUMO CRM OS {version}</span>
          </div>

          {/* Заголовок */}
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            {title}
          </h1>

          {/* Подзаголовок */}
          {subtitle && (
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Правый блок действий и штампа */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 self-start lg:self-center">
          {/* Инженерный штамп */}
          <div className="hidden sm:flex flex-col text-[11px] font-mono text-neutral-400 bg-white/[0.02] border border-white/10 px-3.5 py-2 rounded-xl">
            <div className="flex items-center justify-between gap-4 text-white">
              <span>МАСШТАБ</span>
              <span>{scale}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-emerald-400">
              <span>ТОЧНОСТЬ</span>
              <span>{accuracy}</span>
            </div>
          </div>

          {/* Кнопки действий */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
