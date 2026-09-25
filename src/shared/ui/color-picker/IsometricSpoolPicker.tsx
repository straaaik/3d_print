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

export function IsometricSpoolPicker({
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
      {/* Шапка изометрической катушки */}
      <div className="w-full flex items-center justify-between pb-1.5 border-b border-white/10 text-[10px] text-neutral-400 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Box size={12} className="text-cyan-400 shrink-0" />
          <span className="font-bold text-neutral-200 truncate">SPOOL // 3D</span>
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
            1KG
          </span>
        </div>
      </div>

      {/* Изометрическая 3D модель катушки филамента в перспективе */}
      <div className="relative w-full max-w-[220px] aspect-[240/170] flex items-center justify-center">
        <svg viewBox="0 0 240 170" className="w-full h-full drop-shadow-2xl">
          {/* Тень под катушкой на столе */}
          <ellipse cx="120" cy="145" rx="85" ry="20" fill="rgba(0,0,0,0.6)" filter="blur(4px)" />

          {/* Нижний фланец катушки */}
          <ellipse cx="120" cy="120" rx="80" ry="24" fill="#18181b" stroke="#3f3f46" strokeWidth="2.5" />
          <ellipse cx="120" cy="120" rx="76" ry="22" fill="#09090b" stroke="#27272a" strokeWidth="1" />

          {/* Тело намотанного филамента (Цилиндр с цветом) */}
          <path
            d="M 52,70 L 52,110 A 68 20 0 0 0 188,110 L 188,70 A 68 20 0 0 1 52,70 Z"
            fill={currentColor}
            stroke="#09090b"
            strokeWidth="1.5"
          />

          {/* Горизонтальные текстурные полосы слоев намотки витков нити */}
          <path d="M 53,78 A 67 19 0 0 0 187,78" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
          <path d="M 53,86 A 67 19 0 0 0 187,86" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
          <path d="M 53,94 A 67 19 0 0 0 187,94" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
          <path d="M 53,102 A 67 19 0 0 0 187,102" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />

          {/* Блик света на изгибе цилиндра нитей */}
          <path
            d="M 80,72 L 80,118"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="blur(2px)"
          />

          {/* Верхняя поверхность намотки филамента */}
          <ellipse cx="120" cy="70" rx="68" ry="20" fill={currentColor} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />

          {/* Верхний прозрачный фланец катушки */}
          <ellipse
            cx="120"
            cy="52"
            rx="80"
            ry="24"
            fill="rgba(39, 39, 42, 0.45)"
            stroke="#52525b"
            strokeWidth="2.5"
          />

          {/* Окошки/вырезы в верхнем фланце катушки */}
          <ellipse cx="80" cy="50" rx="14" ry="5" fill="rgba(0,0,0,0.4)" stroke="#3f3f46" strokeWidth="1" />
          <ellipse cx="160" cy="50" rx="14" ry="5" fill="rgba(0,0,0,0.4)" stroke="#3f3f46" strokeWidth="1" />
          <ellipse cx="120" cy="65" rx="16" ry="5" fill="rgba(0,0,0,0.4)" stroke="#3f3f46" strokeWidth="1" />
          <ellipse cx="120" cy="38" rx="16" ry="5" fill="rgba(0,0,0,0.4)" stroke="#3f3f46" strokeWidth="1" />

          {/* Центральная металлическая втулка катушки */}
          <ellipse cx="120" cy="52" rx="28" ry="9" fill="#09090b" stroke="#71717a" strokeWidth="2" />
          <ellipse cx="120" cy="52" rx="16" ry="5" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />

          {/* Нить, сходящая с катушки в сопло */}
          <path
            d="M 188,75 Q 215,90 220,120"
            fill="none"
            stroke={currentColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Сопло-приемник */}
          <polygon points="215,120 225,120 222,132 218,132" fill="#d97706" stroke="#78350f" strokeWidth="1" />
          <circle cx="220" cy="136" r="3" fill={currentColor} stroke="#000" strokeWidth="1" />
        </svg>

        {/* Интерактивный бэйдж с текущим цветом в центре катушки */}
        <div
          onClick={handleCopy}
          className="absolute left-1/2 -translate-x-1/2 top-7 px-2.5 py-1 rounded-md border border-white/20 shadow-xl flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
          style={{
            backgroundColor: currentColor,
            color: contrast,
          }}
          title="Нажмите, чтобы скопировать HEX"
        >
          <span className="font-bold text-[11px] tracking-wider uppercase">{currentColor}</span>
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </div>
      </div>

      {/* Интерактивный ползунок угла оттенка Hue (0..360°) */}
      <div className="w-full flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-neutral-400">
          <span>HUE // ОТТЕНОК НИТИ</span>
          <span className="tabular-nums text-neutral-300">{hsl.h}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          value={hsl.h}
          onChange={(e) => updateHsl({ ...hsl, h: parseInt(e.target.value) })}
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
            onChange={(e) => updateHsl({ ...hsl, s: parseInt(e.target.value) })}
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
            onChange={(e) => updateHsl({ ...hsl, l: parseInt(e.target.value) })}
            className="w-full h-2 rounded appearance-none cursor-pointer border border-white/15"
            style={{
              background: `linear-gradient(to right, #000, hsl(${hsl.h}, ${hsl.s}%, 50%), #fff)`,
            }}
          />
        </div>
      </div>

      {/* Быстрые пресеты катушек */}
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
