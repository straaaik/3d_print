'use client';

import React, { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Database, HardDrive } from 'lucide-react';
import { Tooltip } from '../../shared/ui/Tooltip';
import { usePixelCurtain } from '../../shared/ui/PixelCurtain';
import { CockpitContentTransition } from '../../shared/ui/CockpitContentTransition';

interface InventoryCockpitShellProps {
  section: string;
  sectionLabel: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  isOnline: boolean;
  recordCount: number;
  filteredCount: number;
  actions: React.ReactNode;
  children: React.ReactNode;
  onRequestClose?: () => void;
}

interface InventoryWindowControlsProps {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onRequestClose: () => void;
}

export function InventoryWindowControls({
  isExpanded,
  onExpandedChange,
  onRequestClose,
}: InventoryWindowControlsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Tooltip content="Закрыть раздел и перейти на главную">
        <button
          type="button"
          onClick={onRequestClose}
          aria-label="Перейти на главную"
          className="h-3 w-3 rounded-full border border-rose-400/40 bg-rose-500/80 shadow-sm shadow-rose-500/20 transition-all duration-150 hover:scale-125 hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        />
      </Tooltip>
      <Tooltip content={isExpanded ? 'Свернуть рабочую область' : 'Компактный режим уже включён'}>
        <button
          type="button"
          onClick={() => onExpandedChange(false)}
          disabled={!isExpanded}
          aria-label="Свернуть рабочую область"
          className="h-3 w-3 rounded-full border border-amber-400/40 bg-amber-500/80 transition-all duration-150 enabled:hover:scale-125 enabled:hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        />
      </Tooltip>
      <Tooltip content={isExpanded ? 'Рабочая область уже развёрнута' : 'Развернуть на весь экран'}>
        <button
          type="button"
          onClick={() => onExpandedChange(true)}
          disabled={isExpanded}
          aria-label="Развернуть рабочую область"
          className="h-3 w-3 rounded-full border border-emerald-400/40 bg-emerald-500/80 transition-all duration-150 enabled:hover:scale-125 enabled:hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        />
      </Tooltip>
    </div>
  );
}

export function InventoryCockpitShell({
  section,
  sectionLabel,
  icon,
  isExpanded,
  onExpandedChange,
  isOnline,
  recordCount,
  filteredCount,
  actions,
  children,
  onRequestClose,
}: InventoryCockpitShellProps) {
  const { navigate: curtainNavigate } = usePixelCurtain();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isExpanded) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const section = sectionRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('[data-cockpit-modal="true"]')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onExpandedChange(false);
        return;
      }
      if (event.key !== 'Tab' || !section) return;
      const focusable = Array.from(section.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute('disabled') && element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        section.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    window.requestAnimationFrame(() => section?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isExpanded, onExpandedChange]);

  return (
    <div className={isExpanded ? 'fixed inset-0 z-40 bg-neutral-950/98 p-2 sm:p-4' : 'w-full'}>
      <section
        ref={sectionRef}
        tabIndex={isExpanded ? -1 : undefined}
        role={isExpanded ? 'dialog' : undefined}
        aria-modal={isExpanded ? true : undefined}
        aria-label={sectionLabel}
        className={`mx-auto flex w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl ${
          isExpanded ? 'h-full max-w-none' : 'max-w-[1500px]'
        }`}
      >
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-neutral-900/60 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <InventoryWindowControls
              isExpanded={isExpanded}
              onExpandedChange={onExpandedChange}
              onRequestClose={() => onRequestClose ? onRequestClose() : curtainNavigate('/')}
            />

            <div className="flex min-w-0 items-center gap-2 border-l border-white/10 pl-3 font-mono">
              <span className="h-5 w-5 shrink-0 text-cyan-400">{icon}</span>
              <span className="hidden text-xs font-bold tracking-wider text-white sm:inline">3D-LABS</span>
              <span className="hidden text-neutral-600 sm:inline">{'//'}</span>
              <span className="truncate text-[11px] font-semibold tracking-wider text-neutral-300 sm:text-xs">{section}</span>
              <span className="hidden items-center gap-1 rounded border border-emerald-800/40 bg-emerald-950/60 px-2 py-0.5 text-[9px] font-bold tracking-wider text-emerald-400 md:inline-flex">
                <ArrowUpRight className="h-2.5 w-2.5" />
                {isExpanded ? 'FULLSCREEN' : 'COMPACT'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
        </header>

        <div className={`min-h-0 flex-1 ${isExpanded ? 'overflow-y-auto' : ''}`}>
          <CockpitContentTransition>
            {children}
          </CockpitContentTransition>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-neutral-950 px-3 py-2 font-mono text-[9px] text-neutral-500 sm:px-5 sm:text-[11px]">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              {isOnline ? <Database className="h-3 w-3 text-emerald-400" /> : <HardDrive className="h-3 w-3" />}
              DATABASE: {isOnline ? 'SUPABASE CLOUD' : 'LOCALSTORAGE'}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden whitespace-nowrap sm:inline">VIEW: {isExpanded ? 'FULLSCREEN' : 'COMPACT'}</span>
          </div>
          <span className="shrink-0 tabular-nums">RECORDS: {filteredCount}/{recordCount}</span>
        </footer>
      </section>
    </div>
  );
}

import { CockpitTiltCard, type CockpitTiltTone } from '../../shared/ui/CockpitTiltCard';

interface InventoryKpiCardProps {
  label: string;
  value: React.ReactNode;
  detail: React.ReactNode;
  icon: LucideIcon;
  accent?: CockpitTiltTone;
  backContent?: React.ReactNode;
}

export function InventoryKpiCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = 'neutral',
  backContent,
}: InventoryKpiCardProps) {
  const defaultBackContent = (
    <div className="flex h-full flex-col justify-between font-mono text-[10px]">
      <div className="flex items-center justify-between border-b border-white/10 pb-1">
        <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400 truncate">
          {label}
        </span>
      </div>
      <div className="my-auto space-y-1.5 py-1">
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Значение:</span>
          <span className="font-bold text-white tabular-nums">{value}</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <span className="text-neutral-500">Справка:</span>
          <span className="text-neutral-300 tabular-nums">{detail}</span>
        </div>
      </div>
    </div>
  );

  return (
    <CockpitTiltCard
      tone={accent}
      className="p-3 flex flex-col justify-between"
      backContent={backContent || defaultBackContent}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-neutral-500 sm:text-[10px]">{label}</span>
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
      </div>
      <div className="truncate font-mono text-lg font-bold tracking-tight text-white tabular-nums sm:text-xl">{value}</div>
      <div className="mt-1 truncate font-mono text-[9px] text-neutral-500 sm:text-[10px]">{detail}</div>
    </CockpitTiltCard>
  );
}
