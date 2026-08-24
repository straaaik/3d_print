'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

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

  useEffect(() => {
    if (!isEditing) {
      setLocalVal(value.toString());
    }
  }, [value, isEditing]);

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
    const current = parseFloat(localVal) || value || 0;
    const delta = direction === 'up' ? step : -step;
    const nextVal = Math.max(min, Math.min(max, Math.round((current + delta) * 100) / 100));
    onChange(nextVal);
    setLocalVal(nextVal.toString());
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="text-gray-300 text-xs sm:text-sm font-medium select-none flex items-center justify-between">
          <div>{label}</div>
        </div>
      )}

      <div
        className={`flex items-center rounded-xl h-10 overflow-hidden transition-all select-none ${
          disabled
            ? 'bg-[#101217] border border-[#1e222b] opacity-60 cursor-not-allowed'
            : isModified
            ? 'bg-[#14161d] border border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.18)] focus-within:border-amber-400'
            : 'bg-[#14161d] border border-[#242930] hover:border-[#38414e] focus-within:border-primary focus-within:shadow-[0_0_10px_rgba(255,107,0,0.15)]'
        }`}
      >
        <button
          type="button"
          onClick={() => handleStep('down')}
          disabled={disabled || value <= min}
          className="h-full px-3 text-gray-400 hover:text-white hover:bg-[#242930] active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:active:scale-100 transition-all flex items-center justify-center border-r border-[#242930] cursor-pointer disabled:cursor-not-allowed"
          title="Уменьшить"
        >
          <Minus size={15} />
        </button>

        <div
          onClick={() => {
            if (!disabled) {
              setIsEditing(true);
              setTimeout(() => inputRef.current?.select(), 20);
            }
          }}
          className="flex-1 h-full flex items-center justify-center px-2 relative cursor-text font-mono text-sm font-bold text-white tracking-wide"
        >
          {prefix && <span className="text-gray-400 font-normal mr-1 select-none">{prefix}</span>}
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
              className="w-full text-center bg-transparent border-none outline-none font-mono text-sm text-white font-bold p-0 focus:ring-0"
              autoFocus
            />
          ) : (
            <span>{value}</span>
          )}
          {suffix && <span className="text-gray-400 font-normal ml-1 select-none">{suffix}</span>}
        </div>

        <button
          type="button"
          onClick={() => handleStep('up')}
          disabled={disabled || value >= max}
          className="h-full px-3 text-gray-400 hover:text-white hover:bg-[#242930] active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:active:scale-100 transition-all flex items-center justify-center border-l border-[#242930] cursor-pointer disabled:cursor-not-allowed"
          title="Увеличить"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Быстрые пресеты */}
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
                className={`px-2 py-0.5 text-[11px] font-mono rounded-lg transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                    : 'bg-[#181b22] text-gray-400 hover:text-gray-200 hover:bg-[#242930] border border-transparent'
                }`}
              >
                {prefix}{preset}{suffix}
              </button>
            );
          })}
        </div>
      )}

      {hint && <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{hint}</p>}
    </div>
  );
}
