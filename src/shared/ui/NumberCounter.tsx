'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import NumberFlow from '@number-flow/react';

interface NumberCounterProps {
  label?: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  isModified?: boolean;
}

export function NumberCounter({
  label,
  value,
  onChange,
  min = 1,
  max = 9999,
  step = 1,
  disabled = false,
  className = '',
  isModified = false,
}: NumberCounterProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isFocused]);

  const handleIncrement = () => {
    if (value + step <= max) {
      onChange(value + step);
    }
  };

  const handleDecrement = () => {
    if (value - step >= min) {
      onChange(value - step);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleStartEditing = () => {
    if (disabled) return;
    setInputValue(value.toString());
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    commitValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsFocused(false);
      commitValue();
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      setInputValue(value.toString());
    }
  };

  const commitValue = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed)) {
      setInputValue(value.toString());
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    onChange(clamped);
    setInputValue(clamped.toString());
  };

  return (
    <div className={`flex flex-col gap-1.5 font-mono text-xs ${className}`}>
      {label && (
        <span className="text-neutral-400 text-xs font-mono uppercase tracking-wider select-none">
          {label}
        </span>
      )}

      <div data-number-counter-control className={`flex items-center rounded-xl h-9 min-h-[36px] overflow-hidden select-none ${
        disabled
          ? 'bg-neutral-950 border border-white/5 opacity-40 cursor-not-allowed'
          : isModified
          ? 'bg-neutral-900 border border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.15)] focus-within:border-cyan-400'
          : 'bg-neutral-900 border border-white/15 focus-within:border-cyan-400 hover:border-white/25'
      }`}>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="h-full px-2.5 text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 flex items-center justify-center border-r border-white/10 cursor-pointer disabled:cursor-not-allowed"
        >
          <Minus size={13} />
        </button>

        <div
          onClick={handleStartEditing}
          className={`flex-1 h-full flex items-center justify-center px-2 min-w-[40px] relative overflow-hidden ${
            disabled ? 'cursor-not-allowed' : 'cursor-text'
          }`}
        >
          {isFocused && !disabled ? (
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full text-center bg-transparent border-none outline-none font-mono text-xs text-white font-bold p-0 focus:ring-0"
            />
          ) : (
            <div className="h-full flex items-center justify-center overflow-hidden">
              <NumberFlow
                value={value}
                locales="ru-RU"
                format={{ maximumFractionDigits: 0, useGrouping: false }}
                respectMotionPreference
                className="font-mono text-xs font-bold text-white tabular-nums"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className="h-full px-2.5 text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 flex items-center justify-center border-l border-white/10 cursor-pointer disabled:cursor-not-allowed"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
