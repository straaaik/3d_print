'use client';

import { motion, useTransform, type MotionValue } from 'motion/react';
import { CockpitButton } from '../CockpitButton';
import type { TransitionPhase } from './model';

export interface PageLoadingOverlayProps {
  progress: MotionValue<number>;
  opacity: MotionValue<number>;
  realProgress: number;
  phase: TransitionPhase;
  error: string | null;
  slow: boolean;
  onRetry: () => void;
  onHome: () => void;
  variant?: 'standalone' | 'inline';
}

export function PageLoadingOverlay({
  progress,
  opacity,
  realProgress,
  phase,
  error,
  slow,
  onRetry,
  onHome,
  variant = 'standalone',
}: PageLoadingOverlayProps) {
  const clipPath = useTransform(progress, [0, 1], ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)']);
  const percent = Math.round(realProgress * 100);

  if (variant === 'inline') {
    return (
      <motion.div
        data-testid="page-loading-overlay"
        data-phase={phase}
        className="absolute inset-0 z-30 flex min-h-[460px] flex-col items-center justify-center overflow-hidden bg-neutral-950/95 p-6 text-center text-white backdrop-blur-md"
        style={{ opacity }}
      >
        <div
          role="progressbar"
          aria-label="Подготовка страницы"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`Готовность этапов загрузки: ${percent}%`}
        >
          <span
            aria-hidden="true"
            className="relative inline-block font-mono text-[clamp(2.5rem,7vw,4.5rem)] font-semibold leading-none tracking-[-0.055em]"
          >
            <span className="text-neutral-800">LOADING</span>
            <motion.span
              className="absolute inset-0 text-[var(--cockpit-accent-color)]"
              style={{ clipPath }}
            >
              LOADING
            </motion.span>
          </span>
        </div>

        <p role="status" aria-live="polite" className="mt-5 min-h-5 font-mono text-xs text-neutral-400">
          {error ?? (slow ? 'Загрузка занимает больше времени' : 'Подготовка рабочей области…')}
        </p>

        {(error || slow) && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <CockpitButton onClick={onRetry}>повторить</CockpitButton>
            <CockpitButton onClick={onHome}>на главную</CockpitButton>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 font-mono text-[10px] text-neutral-500">
          <span>STATUS: {phase === 'revealing' ? 'READY' : (error ? 'RECOVERY' : 'SYNCHRONIZING')}</span>
          <span>•</span>
          <span>PROGRESS: {percent}%</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      data-testid="page-loading-overlay"
      data-phase={phase}
      className="fixed inset-0 z-[100000] flex min-h-dvh items-center justify-center overflow-auto bg-[#0a0a0a] bg-dot-grid p-5 text-white"
      style={{ opacity }}
    >
      <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 bg-neutral-900/60 px-4 py-3 font-mono text-[10px] sm:px-5 sm:text-xs">
          <div className="flex shrink-0 gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-rose-500/80" />
            <span className="h-2 w-2 rounded-full bg-amber-500/80" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
          </div>
          <span className="h-3 w-px bg-white/15" aria-hidden="true" />
          <span className="tracking-wider text-neutral-300">KUMO-CRM // LOADING</span>
        </div>
        <div className="px-4 py-14 text-center sm:px-8 sm:py-20">
          <div
            role="progressbar"
            aria-label="Подготовка страницы"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={`Готовность этапов загрузки: ${percent}%`}
          >
            <span
              aria-hidden="true"
              className="relative inline-block font-mono text-[clamp(2rem,9vw,4.5rem)] font-semibold leading-none tracking-[-0.055em]"
            >
              <span className="text-neutral-800">LOADING</span>
              <motion.span
                className="absolute inset-0 text-[var(--cockpit-accent-color)]"
                style={{ clipPath }}
              >
                LOADING
              </motion.span>
            </span>
          </div>
          <p role="status" aria-live="polite" className="mt-6 min-h-5 font-mono text-[11px] text-neutral-400">
            {error ?? (slow ? 'Загрузка занимает больше времени' : 'Открываем страницу…')}
          </p>
          {(error || slow) && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <CockpitButton onClick={onRetry}>повторить</CockpitButton>
              <CockpitButton onClick={onHome}>на главную</CockpitButton>
            </div>
          )}
        </div>
        <div className="flex justify-between gap-2 border-t border-white/10 bg-neutral-950 px-4 py-2.5 font-mono text-[10px] text-neutral-500 sm:px-5">
          <span>{error ? 'RECOVERY' : 'PAGE PREPARATION'}</span>
          <span>{phase === 'revealing' ? 'READY' : 'PLEASE WAIT'}</span>
        </div>
        <footer className="border-t border-white/10 bg-neutral-950 px-4 py-2.5 text-center font-mono text-[10px] text-neutral-500">
          KUMO CRM · LOADING RUNTIME
        </footer>
      </section>
    </motion.div>
  );
}
