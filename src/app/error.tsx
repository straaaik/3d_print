'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { CockpitButton } from '@/shared/ui/CockpitButton';

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-dot-grid px-3 py-4 font-sans text-white sm:px-6 sm:py-6">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 bg-neutral-900/60 px-4 py-3 font-mono text-xs sm:px-5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-4 w-px bg-white/15" />
          <span className="font-bold tracking-wider text-neutral-200">3D-LABS // RUNTIME_RECOVERY</span>
          <span className="rounded border border-rose-800/40 bg-rose-950/50 px-2 py-0.5 text-[10px] text-rose-300">ERROR</span>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-mono text-xs text-rose-300">СБОЙ РАБОЧЕГО СЕГМЕНТА</p>
            <h1 className="mt-2 text-xl font-semibold text-white">Не удалось загрузить рабочую область</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">Повторите попытку. Данные в локальном кэше не удаляются.</p>
            {error.digest ? <p className="mt-3 font-mono text-[11px] tabular-nums text-neutral-500">TRACE: {error.digest}</p> : null}
          </div>
          <CockpitButton icon={RefreshCw} onClick={retry} title="Повторить загрузку рабочего сегмента">повторить</CockpitButton>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-neutral-950 px-5 py-2.5 font-mono text-[11px] text-neutral-500">
          <span>DATABASE: PRESERVED</span><span>RECOVERY READY</span>
        </div>
        <footer className="border-t border-white/10 bg-neutral-950 px-5 py-2.5 text-center font-mono text-[11px] text-neutral-500">3D LABS · [RECOVERY] RUNTIME</footer>
      </section>
    </main>
  );
}
