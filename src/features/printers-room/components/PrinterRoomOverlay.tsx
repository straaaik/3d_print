'use client';

import React from 'react';
import { Layers, Minus, Plus, Navigation, ChevronDown } from 'lucide-react';

export interface PrinterRoomOverlayProps {
  printersCount: number;
  hasSelection: boolean;
  onResetFocus: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export function PrinterRoomOverlay({
  printersCount,
  hasSelection,
  onResetFocus,
  onZoomIn,
  onZoomOut,
}: PrinterRoomOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 p-5 flex flex-col justify-between z-20 select-none">
      {/* Top HUD */}
      <div className="flex items-start justify-between gap-3 w-full">
        {/* Top-Left: Studio A & Operational Status */}
        <div className="flex flex-col gap-1 pointer-events-auto">
          <div className="flex items-center gap-2">
            <h2 className="text-white text-lg font-bold tracking-tight">Studio A</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>All systems operational</span>
          </div>
        </div>

        {/* Top-Right: Isometric View Pill */}
        <button
          type="button"
          onClick={onResetFocus}
          className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800/90 backdrop-blur-md border border-white/10 hover:border-white/20 text-xs font-medium text-neutral-200 hover:text-white shadow-xl transition-all cursor-pointer"
        >
          <Layers size={13} className="text-neutral-400" />
          <span>Isometric View</span>
          <ChevronDown size={12} className="text-neutral-500" />
        </button>
      </div>

      {/* Bottom HUD */}
      <div className="flex items-end justify-between gap-4 w-full">
        {/* Bottom-Left: 2D/3D & Navigation Pill Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center p-1 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-white/10 shadow-xl">
            <button
              type="button"
              onClick={onResetFocus}
              className="flex items-center justify-center px-3 py-1 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              2D
            </button>
            <button
              type="button"
              className="flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold bg-white/10 text-white shadow-sm cursor-default"
            >
              3D
            </button>
          </div>

          {/* Camera controls */}
          <div className="flex items-center p-1 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-white/10 shadow-xl">
            <button
              type="button"
              onClick={onResetFocus}
              title="Фокус на всю комнату"
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <Navigation size={13} className="rotate-45" />
            </button>
            <button
              type="button"
              onClick={onZoomOut}
              title="Отдалить"
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <Minus size={13} />
            </button>
            <button
              type="button"
              onClick={onZoomIn}
              title="Приблизить"
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Bottom-Right: Studio Tagline */}
        <div className="text-[11px] font-mono tracking-widest text-neutral-500 uppercase">
          <span className="font-semibold text-neutral-400">{`${printersCount} PRINTERS`}</span>
          <span className="mx-2 text-neutral-700">|</span>
          <span>STUDIO A</span>
          <span className="mx-2 text-neutral-700">|</span>
          <span className="text-neutral-500">ENDLESS POSSIBILITIES</span>
        </div>
      </div>
    </div>
  );
}

