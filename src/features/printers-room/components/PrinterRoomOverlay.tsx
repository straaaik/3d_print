'use client';

import React from 'react';
import { Box, ChevronLeft, Sparkles } from 'lucide-react';

export interface PrinterRoomOverlayProps {
  printersCount: number;
  hasSelection: boolean;
  onResetFocus: () => void;
}

export function PrinterRoomOverlay({
  printersCount,
  hasSelection,
  onResetFocus,
}: PrinterRoomOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 p-4 flex flex-col justify-between z-20">
      {/* Top HUD */}
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Title badge */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-white/10 text-xs shadow-lg">
          <Box size={14} className="text-cyan-400" />
          <span className="font-bold tracking-wider text-white">3D-ФЕРМА</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span className="text-neutral-400">
            {printersCount} {getPrinterPlural(printersCount)}
          </span>
        </div>

        {/* Reset button when a printer is focused */}
        {hasSelection && (
          <button
            type="button"
            onClick={onResetFocus}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800/90 backdrop-blur-md border border-white/10 hover:border-white/20 text-xs font-medium text-neutral-200 hover:text-white shadow-lg transition-all cursor-pointer"
          >
            <ChevronLeft size={14} className="text-cyan-400" />
            <span>Вся комната</span>
            <span className="text-[10px] text-neutral-500 font-mono ml-0.5">Esc</span>
          </button>
        )}
      </div>

      {/* Bottom hint */}
      {!hasSelection && printersCount > 0 && (
        <div className="self-center flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900/60 backdrop-blur-md border border-white/5 text-[11px] text-neutral-400 shadow-lg">
          <Sparkles size={11} className="text-cyan-400/80" />
          <span>Нажмите на 3D-принтер для фокуса и характеристик</span>
        </div>
      )}
    </div>
  );
}

function getPrinterPlural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'принтеров';
  if (mod10 === 1) return 'принтер';
  if (mod10 >= 2 && mod10 <= 4) return 'принтера';
  return 'принтеров';
}
