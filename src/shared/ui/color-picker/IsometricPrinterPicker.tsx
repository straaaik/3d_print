'use client';

import React, { useState, useEffect } from 'react';
import { Box, Copy, Check, Pipette } from 'lucide-react';
import {
  hexToHsl,
  hslToHex,
  isValidHex,
  normalizeHex,
  getContrastTextColor,
  hasEyeDropperSupport,
  pickScreenColor,
  FILAMENT_PRESETS,
} from '../../lib/colorUtils';
import { CustomColorPickerProps } from './types';
import { ColorPickerTrigger } from './ColorPickerTrigger';
import { Tooltip } from '../Tooltip';
import { PrinterMachineIcon } from '../../../widgets/InventoryCockpit/InventoryIcons';

export function IsometricPrinterPicker({
  value = '#0CB4E0',
  onChange,
  label,
  className = '',
  disabled = false,
  inline = false,
}: CustomColorPickerProps) {
  const [currentColor, setCurrentColor] = useState(() => normalizeHex(value));
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const [copied, setCopied] = useState(false);
  const [hasDropper, setHasDropper] = useState(false);

  useEffect(() => {
    setHasDropper(hasEyeDropperSupport());
  }, []);

  useEffect(() => {
    if (isValidHex(value)) {
      const norm = normalizeHex(value);
      setCurrentColor(norm);
      setHsl(hexToHsl(norm));
    }
  }, [value]);

  const updateHsl = (newHsl: { h: number; s: number; l: number }) => {
    setHsl(newHsl);
    const newHex = hslToHex(newHsl.h, newHsl.s, newHsl.l);
    setCurrentColor(newHex);
    onChange(newHex);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(currentColor);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleEyeDropper = async () => {
    const picked = await pickScreenColor();
    if (picked) {
      const norm = normalizeHex(picked);
      setCurrentColor(norm);
      setHsl(hexToHsl(norm));
      onChange(norm);
    }
  };

  const contrast = getContrastTextColor(currentColor);

  const pickerBody = (
    <div className="w-full flex flex-col items-center gap-3 font-mono select-none text-xs">
      {/* Шапка 3D-принтера */}
      <div className="w-full flex items-center justify-between pb-1.5 border-b border-white/10 text-[10px] text-neutral-400 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Box size={12} className="text-cyan-400 shrink-0" />
          <span className="font-bold text-neutral-200 truncate">PRINTER // 3D</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasDropper && (
            <button
              type="button"
              onClick={handleEyeDropper}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 hover:border-white/20 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Захватить цвет с экрана"
            >
              <Pipette size={10} />
              <span className="text-[9px]">[ ПИПЕТКА ]</span>
            </button>
          )}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400">
            CORE-XY
          </span>
        </div>
      </div>

      {/* Изометрическая 3D модель принтера в перспективе */}
      <div className="relative w-full max-w-[220px] aspect-[200/168] flex items-center justify-center">
        <PrinterMachineIcon accentColor={currentColor} className="w-full h-full drop-shadow-2xl" />

        {/* Интерактивный бэйдж с текущим цветом */}
        <div
          onClick={handleCopy}
          className="absolute left-1/2 -translate-x-1/2 top-3 px-2 py-0.5 rounded-md border border-white/20 shadow-xl flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
          style={{
            backgroundColor: currentColor,
            color: contrast,
          }}
          title="Нажмите, чтобы скопировать HEX"
        >
          <span className="font-bold text-[10px] tracking-wider uppercase">{currentColor}</span>
          {copied ? <Check size={10} /> : <Copy size={10} />}
        </div>
      </div>

      {/* Интерактивный ползунок угла оттенка Hue (0..360°) */}
      <div className="w-full flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-neutral-400">
          <span>HUE // ОТТЕНОК АКЦЕНТА</span>
          <span className="tabular-nums text-neutral-300">{hsl.h}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          value={hsl.h}
          onChange={(e) => updateHsl({ ...hsl, h: parseInt(e.target.value, 10) })}
          className="w-full h-3 rounded-md appearance-none cursor-pointer border border-white/15"
          style={{
            background:
              'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
          }}
        />
      </div>

      {/* Ползунки насыщенности и яркости */}
      <div className="w-full grid grid-cols-2 gap-2 p-2 rounded-lg bg-neutral-900 border border-white/10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[9px] text-neutral-400">
            <span>ПИГМЕНТ (S)</span>
            <span className="tabular-nums text-neutral-300">{hsl.s}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={hsl.s}
            onChange={(e) => updateHsl({ ...hsl, s: parseInt(e.target.value, 10) })}
            className="w-full h-2 rounded appearance-none cursor-pointer border border-white/15"
            style={{
              background: `linear-gradient(to right, #666, hsl(${hsl.h}, 100%, 50%))`,
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[9px] text-neutral-400">
            <span>СВЕТЛОТА (L)</span>
            <span className="tabular-nums text-neutral-300">{hsl.l}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={hsl.l}
            onChange={(e) => updateHsl({ ...hsl, l: parseInt(e.target.value, 10) })}
            className="w-full h-2 rounded appearance-none cursor-pointer border border-white/15"
            style={{
              background: `linear-gradient(to right, #000, hsl(${hsl.h}, ${hsl.s}%, 50%), #fff)`,
            }}
          />
        </div>
      </div>

      {/* Быстрые пресеты */}
      <div className="w-full flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/10">
        <span className="text-[9px] text-neutral-500 uppercase tracking-wider shrink-0">ПРЕСЕТЫ:</span>
        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          {FILAMENT_PRESETS.slice(0, 6).map((p) => (
            <Tooltip key={p.hex} content={p.name}>
              <button
                type="button"
                onClick={() => {
                  setCurrentColor(p.hex);
                  setHsl(hexToHsl(p.hex));
                  onChange(p.hex);
                }}
                className="w-4 h-4 rounded-full border border-white/25 hover:scale-110 transition-transform cursor-pointer shadow-inner shrink-0"
                style={{ backgroundColor: p.hex }}
              />
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div
        className={`p-3.5 sm:p-4 rounded-xl border border-white/10 bg-neutral-900/60 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl w-full ${className}`}
      >
        {label && (
          <span className="block mb-2 text-[11px] font-mono text-neutral-400 select-none">
            {label}
          </span>
        )}
        {pickerBody}
      </div>
    );
  }

  return (
    <ColorPickerTrigger value={currentColor} label={label} className={className} disabled={disabled}>
      {() => pickerBody}
    </ColorPickerTrigger>
  );
}
