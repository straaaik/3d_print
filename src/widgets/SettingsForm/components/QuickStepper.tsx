'use client';

import React, { useState, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Tooltip } from '../../../shared/ui/Tooltip';

export interface QuickStepperProps {
  label?: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
  presets?: number[];
  disabled?: boolean;
  className?: string;
  isModified?: boolean;
  hint?: string;
}

export function QuickStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  suffix = '',
  prefix = '',
  presets,
  disabled = false,
  className = '',
  isModified = false,
  hint,
}: QuickStepperProps) {
  const [localVal, setLocalVal] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCommit = (valStr: string) => {
    const parsed = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      setLocalVal(clamped.toString());
    } else {
      setLocalVal(value.toString());
    }
    setIsEditing(false);
  };

  const handleStep = (direction: 'up' | 'down') => {
    if (disabled) return;
    const current = isEditing ? (parseFloat(localVal) || 0) : value;
    const delta = direction === 'up' ? step : -step;
    const nextVal = Math.max(min, Math.min(max, Math.round((current + delta) * 100) / 100));
    onChange(nextVal);
    setLocalVal(nextVal.toString());
  };

  return (
    <div className={`flex flex-col gap-1.5 font-mono text-xs ${className}`}>
      {label && (
        <div className="text-neutral-400 text-xs font-mono uppercase tracking-wider select-none flex items-center justify-between">
          <div>{label}</div>
        </div>
      )}

      <div
        className={`flex items-center rounded-xl h-9 min-h-[36px] overflow-hidden transition-all select-none ${
          disabled
            ? 'bg-neutral-950 border border-white/5 opacity-40 cursor-not-allowed'
            : isModified
            ? 'bg-neutral-900 border border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.15)] focus-within:border-cyan-400'
            : 'bg-neutral-900 border border-white/15 hover:border-white/25 focus-within:border-cyan-400'
        }`}
      >
        <Tooltip content="Уменьшить">
          <button
            type="button"
            onClick={() => handleStep('down')}
            disabled={disabled || value <= min}
            className="h-full px-2.5 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500 transition-all flex items-center justify-center border-r border-white/10 cursor-pointer disabled:cursor-not-allowed"
          >
            <Minus size={13} />
          </button>
        </Tooltip>

        <div className="relative flex h-full flex-1 items-center justify-center px-2 font-mono text-xs font-bold tracking-wide text-white">
          {prefix && <span className="text-neutral-400 font-normal mr-1 select-none">{prefix}</span>}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={localVal}
              onChange={(e) => setLocalVal(e.target.value)}
              onBlur={() => handleCommit(localVal)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommit(localVal);
                if (e.key === 'Escape') {
                  setLocalVal(value.toString());
                  setIsEditing(false);
                }
              }}
              className="w-full text-center bg-transparent border-none outline-none font-mono text-xs text-white font-bold p-0 focus:ring-0"
              autoFocus
            />
          ) : (
            <button
              type="button"
              disabled={disabled}
              aria-label={`Редактировать значение ${value}${suffix}`}
              onClick={() => {
                setLocalVal(value.toString());
                setIsEditing(true);
                setTimeout(() => inputRef.current?.select(), 20);
              }}
              className="flex h-full min-w-0 flex-1 cursor-text items-center justify-center bg-transparent text-center font-mono text-xs font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 disabled:cursor-not-allowed"
            >
              {value}
            </button>
          )}
          {suffix && <span className="text-neutral-400 font-normal ml-1 select-none">{suffix}</span>}
        </div>

        <Tooltip content="Увеличить">
          <button
            type="button"
            onClick={() => handleStep('up')}
            disabled={disabled || value >= max}
            className="h-full px-2.5 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500 transition-all flex items-center justify-center border-l border-white/10 cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus size={13} />
          </button>
        </Tooltip>
      </div>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 select-none">
          {presets.map((preset) => {
            const isSelected = value === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onChange(preset);
                  setLocalVal(preset.toString());
                }}
                className={`px-2 py-0.5 text-[11px] font-mono rounded-lg transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-white/15 text-white border-white/30 font-bold'
                    : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {prefix}{preset}{suffix}
              </button>
            );
          })}
        </div>
      )}

      {hint && <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed font-sans">{hint}</p>}
    </div>
  );
}
