'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';

export interface MeridianNumberCounterProps {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
}

export function MeridianNumberCounter({
  label,
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  unit,
  className = '',
}: MeridianNumberCounterProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(Math.min(max, value + step));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (isNaN(parsed)) {
      onChange(min);
    } else {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full select-none ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-neutral-300 truncate">
          {label}
        </label>
      )}

      <div className="flex items-center h-10 sm:h-11 bg-neutral-900 border border-white/15 hover:border-white/30 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/30 rounded-xl p-1 transition-all duration-200 shadow-inner">
        {/* Кнопка минус */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none shrink-0"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Поле ввода значения */}
        <div className="flex-1 flex items-center justify-center relative px-2">
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            className="w-full text-center bg-transparent text-sm sm:text-base font-bold font-mono text-white focus:outline-none tabular-nums"
          />
          {unit && (
            <span className="text-xs text-neutral-500 font-mono font-bold pointer-events-none ml-1">
              {unit}
            </span>
          )}
        </div>

        {/* Кнопка плюс */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
