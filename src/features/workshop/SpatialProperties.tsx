'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Trash2, X, RotateCcw } from 'lucide-react';
import { Input } from '../../shared/ui/Input';
import { ColorPicker } from '../../shared/ui/ColorPicker';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import type { Room, RoomLabel } from './model';

interface Props {
  room: Room;
  label: RoomLabel;
  onSaveLabel: (label: RoomLabel) => void;
  onDeleteLabel: () => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  { label: 'Белый', value: '#ffffff' },
  { label: 'Голубой', value: '#38bdf8' },
  { label: 'Янтарный', value: '#f59e0b' },
  { label: 'Изумруд', value: '#10b981' },
  { label: 'Красный', value: '#f43f5e' },
  { label: 'Пурпур', value: '#a855f7' },
  { label: 'Жёлтый', value: '#eab308' },
];

const SURFACE_NAMES: Record<string, string> = {
  floor: 'Пол',
  north: 'Северная стена',
  south: 'Южная стена',
  west: 'Западная стена',
  east: 'Восточная стена',
};

/**
 * Clean cockpit editor for 3D graffiti labels with instant live-updates in 3D.
 */
export function SpatialProperties({
  label,
  onSaveLabel,
  onDeleteLabel,
  onClose,
}: Props) {
  const reduced = useReducedMotion();

  const handleLabelChange = (patch: Partial<RoomLabel>) => {
    const updated: RoomLabel = { ...label, ...patch };
    onSaveLabel(updated);
  };

  return (
    <motion.aside
      aria-label="Редактор надписи"
      initial={{ opacity: 0, x: -16, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -16, scale: 0.98 }}
      transition={{ duration: reduced ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="absolute left-3 top-20 z-30 max-h-[calc(100%-6rem)] w-[min(320px,calc(100%-24px))] overflow-y-auto rounded-2xl border border-white/15 bg-neutral-950/95 p-4 font-mono text-xs text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-xl"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="mb-3.5 flex items-center justify-between border-b border-white/10 pb-2.5 select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-3.5 w-px bg-white/15" />
          <span className="text-[11px] font-bold tracking-wider text-neutral-200 uppercase">
            3D-LABS // НАДПИСЬ
          </span>
          <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] text-neutral-400">
            {SURFACE_NAMES[label.surface] ?? label.surface}
          </span>
        </div>
        <button
          type="button"
          aria-label="Закрыть панель"
          onClick={onClose}
          className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* --- РЕДАКТОР НАДПИСИ (LIVE ИНТЕРАКТИВНЫЙ) --- */}
      <div className="space-y-3.5">
        {/* Текст надписи */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Текст надписи
          </label>
          <Input
            aria-label="Текст надписи"
            value={label.text}
            maxLength={60}
            placeholder="Текст в 3D"
            onChange={(e) => handleLabelChange({ text: e.target.value })}
          />
        </div>

        {/* Цвет надписи */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Цвет надписи
          </label>
          <div className="flex items-center gap-2">
            <ColorPicker
              value={label.color}
              onChange={(c) => handleLabelChange({ color: c })}
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  title={p.label}
                  onClick={() => handleLabelChange({ color: p.value })}
                  className={`h-6 w-6 rounded-md border transition-transform cursor-pointer ${
                    label.color.toLowerCase() === p.value.toLowerCase()
                      ? 'border-white ring-1 ring-white/50 scale-105 shadow-sm'
                      : 'border-white/20 hover:border-white/60 hover:scale-105'
                  }`}
                  style={{ backgroundColor: p.value }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Размер надписи */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            <span>Размер / Высота</span>
            <span className="font-mono text-neutral-200">{(label.size * 100).toFixed(0)} см</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.15}
              max={1.5}
              step={0.05}
              value={label.size}
              onChange={(e) => handleLabelChange({ size: parseFloat(e.target.value) })}
              className="w-full accent-neutral-300 h-1 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Поворот надписи */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            <span>Поворот</span>
            <span className="font-mono text-neutral-200">{label.rotation ?? 0}°</span>
          </div>
          <div className="flex items-center gap-2">
            <CockpitButton
              icon={RotateCcw}
              onClick={() => handleLabelChange({ rotation: ((label.rotation ?? 0) - 90 + 360) % 360 })}
            >
              -90°
            </CockpitButton>
            <CockpitButton
              icon={RotateCcw}
              onClick={() => handleLabelChange({ rotation: ((label.rotation ?? 0) + 90) % 360 })}
            >
              +90°
            </CockpitButton>
            <input
              type="range"
              min={0}
              max={355}
              step={5}
              value={label.rotation ?? 0}
              onChange={(e) => handleLabelChange({ rotation: parseInt(e.target.value, 10) })}
              className="flex-1 accent-neutral-300 h-1 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Удаление надписи */}
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onDeleteLabel}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-800/40 bg-rose-950/40 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-900/60 hover:border-rose-700/60 active:scale-[0.98] cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Удалить надпись</span>
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
