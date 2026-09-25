'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pipette, Copy, Check } from 'lucide-react';
import {
  hexToHsv,
  hsvToHex,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  isValidHex,
  normalizeHex,
  hasEyeDropperSupport,
  pickScreenColor,
  FILAMENT_PRESETS,
} from '../../lib/colorUtils';
import { CustomColorPickerProps } from './types';
import { ColorPickerTrigger } from './ColorPickerTrigger';
import { Tooltip } from '../Tooltip';

export function CockpitMatrixPicker({
  value = '#0CB4E0',
  onChange,
  label,
  className = '',
  disabled = false,
  inline = false,
}: CustomColorPickerProps) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState(() => normalizeHex(value));
  const [format, setFormat] = useState<'HEX' | 'RGB' | 'HSL'>('HEX');
  const [copied, setCopied] = useState(false);
  const [hasDropper, setHasDropper] = useState(false);

  useEffect(() => {
    setHasDropper(hasEyeDropperSupport());
  }, []);

  // Синхронизация внешнего value с внутренним состоянием
  useEffect(() => {
    if (isValidHex(value)) {
      const normalized = normalizeHex(value);
      setHexInput(normalized);
      setHsv(hexToHsv(normalized));
    }
  }, [value]);

  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // Обновление цвета из HSV
  const updateColorFromHsv = useCallback(
    (newHsv: { h: number; s: number; v: number }) => {
      setHsv(newHsv);
      const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
      setHexInput(newHex);
      onChange(newHex);
    },
    [onChange]
  );

  // Обработка клика/драга по 2D полю Saturation/Value
  const handleSatValPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = satValRef.current?.getBoundingClientRect();
    if (!rect) return;

    const updatePosition = (clientX: number, clientY: number) => {
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);
      updateColorFromHsv({ ...hsv, s, v });
    };

    updatePosition(e.clientX, e.clientY);

    const onPointerMove = (moveEvent: PointerEvent) => {
      updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Обработка клика/драга по полосе Hue
  const handleHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;

    const updateHue = (clientX: number) => {
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const h = Math.round((x / rect.width) * 360) % 360;
      updateColorFromHsv({ ...hsv, h });
    };

    updateHue(e.clientX);

    const onPointerMove = (moveEvent: PointerEvent) => {
      updateHue(moveEvent.clientX);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Копирование в буфер
  const handleCopy = () => {
    navigator.clipboard?.writeText(hexInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Вызов нативной пипетки
  const handleEyeDropper = async () => {
    const picked = await pickScreenColor();
    if (picked) {
      const normalized = normalizeHex(picked);
      setHexInput(normalized);
      setHsv(hexToHsv(normalized));
      onChange(normalized);
    }
  };

  // Текущие RGB и HSL
  const currentRgb = hexToRgb(hexInput);
  const currentHsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);

  // Внутренний интерфейс пикера
  const pickerBody = (
    <div className="w-[264px] flex flex-col gap-3 font-mono select-none text-xs">
      {/* Шапка спектрометра */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-[10px] text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="font-bold text-neutral-200">SPECTRUM // MATRIX-2D</span>
        </div>
        {hasDropper && (
          <button
            type="button"
            onClick={handleEyeDropper}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 hover:border-white/20 hover:text-white transition-colors cursor-pointer text-neutral-400"
            title="Захватить цвет с экрана"
          >
            <Pipette size={11} />
            <span className="text-[9px]">[ ПИПЕТКА ]</span>
          </button>
        )}
      </div>

      {/* 2D Поле Saturation / Value */}
      <div
        ref={satValRef}
        onPointerDown={handleSatValPointerDown}
        className="relative h-[130px] rounded-lg border border-white/15 overflow-hidden cursor-crosshair shadow-inner"
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
        }}
      >
        {/* Горизонтальный градиент: от белого к прозрачному */}
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        {/* Вертикальный градиент: от прозрачного к чёрному */}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />

        {/* Инженерное перекрестие-прицел */}
        <div
          className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-[0_0_3px_rgba(0,0,0,0.9)] pointer-events-none flex items-center justify-center"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
          }}
        >
          <div className="w-1 h-1 rounded-full bg-black/80" />
        </div>
      </div>

      {/* 1D Линейка Hue */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-neutral-500">
          <span>HUE ANGLE</span>
          <span className="tabular-nums text-neutral-400">{hsv.h}°</span>
        </div>
        <div
          ref={hueRef}
          onPointerDown={handleHuePointerDown}
          className="relative h-3.5 rounded-md border border-white/15 cursor-pointer shadow-inner"
          style={{
            background:
              'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
          }}
        >
          {/* Ползунок-визир */}
          <div
            className="absolute top-0 bottom-0 w-2 -ml-1 rounded-sm border border-black/50 bg-white shadow-md pointer-events-none"
            style={{
              left: `${(hsv.h / 360) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Инженерная панель значений и форматов */}
      <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-neutral-900/80 border border-white/10">
        <div className="flex items-center justify-between gap-1">
          {/* Переключатель формата */}
          <div className="flex items-center gap-1">
            {(['HEX', 'RGB', 'HSL'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                  format === fmt
                    ? 'bg-white/15 text-white font-bold border border-white/20'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Превью текущего цвета и кнопка копирования */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-4 h-4 rounded border border-white/20 shrink-0 shadow-inner"
              style={{ backgroundColor: hexInput }}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Скопировать HEX"
            >
              {copied ? (
                <>
                  <Check size={11} className="text-emerald-400" />
                  <span className="text-emerald-400">[ OK ]</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  <span>[ COPY ]</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Поля ввода в зависимости от формата */}
        {format === 'HEX' && (
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500 text-[11px]">#</span>
            <input
              type="text"
              value={hexInput.replace('#', '')}
              onChange={(e) => {
                const val = e.target.value;
                setHexInput(`#${val}`);
                if (isValidHex(val)) {
                  const normalized = normalizeHex(val);
                  setHsv(hexToHsv(normalized));
                  onChange(normalized);
                }
              }}
              maxLength={6}
              className="w-full h-7 px-2 bg-neutral-950 border border-white/15 rounded text-neutral-200 text-xs font-mono uppercase focus:border-white/30 focus:outline-none"
            />
          </div>
        )}

        {format === 'RGB' && (
          <div className="grid grid-cols-3 gap-1.5">
            {(['r', 'g', 'b'] as const).map((channel) => (
              <div key={channel} className="flex items-center gap-1 bg-neutral-950 border border-white/10 px-1.5 py-1 rounded">
                <span className="text-[10px] text-neutral-500 uppercase">{channel}</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={currentRgb[channel]}
                  onChange={(e) => {
                    const num = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                    const next = { ...currentRgb, [channel]: num };
                    const nextHex = rgbToHex(next.r, next.g, next.b);
                    setHexInput(nextHex);
                    setHsv(hexToHsv(nextHex));
                    onChange(nextHex);
                  }}
                  className="w-full bg-transparent text-neutral-200 text-right text-[11px] font-mono focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}

        {format === 'HSL' && (
          <div className="grid grid-cols-3 gap-1.5">
            <div className="flex items-center gap-1 bg-neutral-950 border border-white/10 px-1.5 py-1 rounded">
              <span className="text-[10px] text-neutral-500">H</span>
              <input
                type="number"
                min={0}
                max={360}
                value={currentHsl.h}
                onChange={(e) => {
                  const num = Math.max(0, Math.min(360, parseInt(e.target.value) || 0));
                  const rgb = hslToRgb(num, currentHsl.s, currentHsl.l);
                  const nextHex = rgbToHex(rgb.r, rgb.g, rgb.b);
                  setHexInput(nextHex);
                  setHsv(hexToHsv(nextHex));
                  onChange(nextHex);
                }}
                className="w-full bg-transparent text-neutral-200 text-right text-[11px] font-mono focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-neutral-950 border border-white/10 px-1.5 py-1 rounded">
              <span className="text-[10px] text-neutral-500">S</span>
              <input
                type="number"
                min={0}
                max={100}
                value={currentHsl.s}
                onChange={(e) => {
                  const num = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                  const rgb = hslToRgb(currentHsl.h, num, currentHsl.l);
                  const nextHex = rgbToHex(rgb.r, rgb.g, rgb.b);
                  setHexInput(nextHex);
                  setHsv(hexToHsv(nextHex));
                  onChange(nextHex);
                }}
                className="w-full bg-transparent text-neutral-200 text-right text-[11px] font-mono focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-neutral-950 border border-white/10 px-1.5 py-1 rounded">
              <span className="text-[10px] text-neutral-500">L</span>
              <input
                type="number"
                min={0}
                max={100}
                value={currentHsl.l}
                onChange={(e) => {
                  const num = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                  const rgb = hslToRgb(currentHsl.h, currentHsl.s, num);
                  const nextHex = rgbToHex(rgb.r, rgb.g, rgb.b);
                  setHexInput(nextHex);
                  setHsv(hexToHsv(nextHex));
                  onChange(nextHex);
                }}
                className="w-full bg-transparent text-neutral-200 text-right text-[11px] font-mono focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Быстрые пресеты пластиков */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-neutral-500">БАЗОВЫЕ МАТЕРИАЛЫ</span>
        <div className="flex items-center justify-between gap-1">
          {FILAMENT_PRESETS.slice(0, 8).map((preset) => {
            const isSelected = hexInput.toUpperCase() === preset.hex.toUpperCase();
            return (
              <Tooltip key={preset.hex} content={preset.name}>
                <button
                  type="button"
                  onClick={() => {
                    setHexInput(preset.hex);
                    setHsv(hexToHsv(preset.hex));
                    onChange(preset.hex);
                  }}
                  className={`w-5 h-5 rounded-md border transition-transform cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'border-cyan-400 scale-110 ring-1 ring-cyan-400/40 shadow-sm'
                      : 'border-white/20 hover:scale-105 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                >
                  {isSelected && (
                    <Check
                      size={10}
                      className={preset.hex === '#F8FAFC' ? 'text-black font-bold' : 'text-white font-bold'}
                    />
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div
        className={`p-3.5 rounded-xl border border-white/15 bg-neutral-950/90 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl ${className}`}
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
    <ColorPickerTrigger value={hexInput} label={label} className={className} disabled={disabled}>
      {() => pickerBody}
    </ColorPickerTrigger>
  );
}
