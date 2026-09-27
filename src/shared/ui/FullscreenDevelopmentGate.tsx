'use client';

import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Home, Layers, Maximize2, Sparkles, TrendingUp } from 'lucide-react';
import { CockpitButton } from './CockpitButton';

interface FullscreenDevelopmentGateProps {
  section: 'orders' | 'products';
  onReturn: () => void;
  onHome: () => void;
}

export function FullscreenDevelopmentGate({
  section,
  onReturn,
  onHome,
}: FullscreenDevelopmentGateProps) {
  const isProducts = section === 'products';
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    dialog?.focus();

    return () => previouslyFocused?.focus();
  }, []);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onReturn();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur-sm">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fullscreen-development-title"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/95 font-mono shadow-[0_20px_80px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-neutral-900/80 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-3 w-3 rounded-full border border-red-400/40 bg-red-500/80" />
              <span className="h-3 w-3 rounded-full border border-yellow-400/40 bg-yellow-500/80" />
              <span className="h-3 w-3 rounded-full border border-emerald-400/20 bg-emerald-500/40" />
            </div>
            <span className="truncate text-xs font-bold tracking-wider text-neutral-300">
              KUMO-CRM // FULLSCREEN RUNTIME
            </span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded border border-amber-800/40 bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-400">
            <Sparkles className="h-3 w-3" /> В РАЗРАБОТКЕ
          </span>
        </header>

        <div className="space-y-5 p-6">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
              <Maximize2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 id="fullscreen-development-title" className="font-sans text-base font-bold tracking-tight text-white sm:text-lg">
                Полноэкранный режим пока в разработке
              </h2>
              <p className="font-sans text-xs leading-relaxed text-neutral-400">
                {isProducts
                  ? 'Развёрнутый полноэкранный режим каталога проходит тестирование и временно доступен только в режиме разработки.'
                  : 'Развёрнутый полноэкранный реестр заказов проходит тестирование и временно доступен только в режиме разработки.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 border-t border-white/10 pt-4 text-xs sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 font-sans text-neutral-300">
              <Layers className="h-4 w-4 shrink-0 text-cyan-400" />
              <span>Расширенная сетка данных</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 font-sans text-neutral-300">
              <TrendingUp className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Детальная телеметрия</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-end gap-2.5 border-t border-white/10 pt-3 sm:flex-row">
            <CockpitButton onClick={onHome} icon={Home} className="w-full justify-center text-xs sm:w-auto">
              На главную
            </CockpitButton>
            <CockpitButton onClick={onReturn} icon={ArrowLeft} isActive className="w-full justify-center text-xs font-bold sm:w-auto">
              Свернуть в стандартный вид
            </CockpitButton>
          </div>
        </div>
      </section>
    </div>
  );
}
