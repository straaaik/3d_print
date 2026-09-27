export default function Loading() {
  return (
    <main className="min-h-screen bg-dot-grid px-3 py-4 font-sans text-white sm:px-6 sm:py-6" role="status" aria-live="polite" aria-label="Загрузка рабочей области">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 bg-neutral-900/60 px-4 py-3 font-mono text-xs sm:px-5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-4 w-px bg-white/15" />
          <span className="font-bold tracking-wider text-neutral-200">KUMO-CRM // LOADING_RUNTIME</span>
          <span className="rounded border border-amber-800/40 bg-amber-950/50 px-2 py-0.5 text-[10px] text-amber-300">LOADING</span>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <p className="font-mono text-xs text-neutral-400">ИНИЦИАЛИЗАЦИЯ РАБОЧЕЙ ОБЛАСТИ</p>
          <div className="grid gap-3 md:grid-cols-[1.4fr_.6fr]">
            <div className="h-32 rounded-xl border border-white/10 bg-white/[0.03]" />
            <div className="h-32 rounded-xl border border-white/10 bg-white/[0.03]" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 bg-neutral-950 px-5 py-2.5 font-mono text-[11px] text-neutral-500"><span>DATABASE: CONNECTING</span><span>RUNTIME STANDBY</span></div>
        <footer className="border-t border-white/10 bg-neutral-950 px-5 py-2.5 text-center font-mono text-[11px] text-neutral-500">KUMO CRM · [LOADING] RUNTIME</footer>
      </section>
    </main>
  );
}
