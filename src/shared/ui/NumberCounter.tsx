'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NumberCounterProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

// Вспомогательный компонент для плавной анимации разряда числа
function Digit({ value, direction }: { value: string; direction: 'up' | 'down' }) {
  return (
    <span className="inline-block overflow-hidden relative w-[0.6em] h-5 text-center select-none pointer-events-none">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: direction === 'up' ? 14 : -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: direction === 'up' ? -14 : 14, opacity: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 300, 
            damping: 25,
            mass: 0.8
          }}
          className="absolute inset-0 flex items-center justify-center font-mono text-sm text-white font-bold"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
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
}: NumberCounterProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const [prevValue, setPrevValue] = useState(value);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const inputRef = useRef<HTMLInputElement>(null);

  // Синхронизация направления анимации
  useEffect(() => {
    if (value > prevValue) {
      setDirection('up');
    } else if (value < prevValue) {
      setDirection('down');
    }
    setPrevValue(value);
    setInputValue(value.toString());
  }, [value, prevValue]);

  // Фокусировка инпута при переходе в режим редактирования
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
      setInputValue(value.toString()); // Отмена изменений
    }
  };

  const commitValue = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed)) {
      setInputValue(value.toString());
      return;
    }
    
    // Загоняем значение в разрешенные рамки [min, max]
    const clamped = Math.max(min, Math.min(max, parsed));
    onChange(clamped);
    setInputValue(clamped.toString());
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-gray-300 text-xs sm:text-sm font-medium select-none">
          {label}
        </span>
      )}
      
      <div className={`flex items-center rounded-xl h-9 min-h-[36px] overflow-hidden transition-colors select-none ${
        disabled 
          ? 'bg-[#101217] border border-[#1e222b] opacity-60 cursor-not-allowed' 
          : 'bg-[#14161d] border border-[#242930] focus-within:border-[#FF6B00]'
      }`}>
        {/* Кнопка минус */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="h-full px-3 text-neutral-accent hover:text-white hover:bg-[#242930] active:scale-[0.88] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-accent disabled:active:scale-100 transition-all flex items-center justify-center border-r border-[#242930] cursor-pointer disabled:cursor-not-allowed"
        >
          <Minus size={14} />
        </button>

        {/* Центральное число (клик переключает на ввод) */}
        <div 
          onClick={() => !disabled && setIsFocused(true)}
          className={`flex-1 h-full flex items-center justify-center px-2 min-w-[50px] relative overflow-hidden ${
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
              className="w-full text-center bg-transparent border-none outline-none font-mono text-sm text-white font-bold p-0 focus:ring-0"
            />
          ) : (
            <div className="h-full flex items-center justify-center overflow-hidden">
              <div className="flex flex-row-reverse items-center justify-center h-full">
                {value
                  .toString()
                  .split('')
                  .reverse()
                  .map((digit, index) => (
                    <Digit 
                      key={index} 
                      value={digit} 
                      direction={direction} 
                    />
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Кнопка плюс */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className="h-full px-3 text-neutral-accent hover:text-white hover:bg-[#242930] active:scale-[0.88] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-accent disabled:active:scale-100 transition-all flex items-center justify-center border-l border-[#242930] cursor-pointer disabled:cursor-not-allowed"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
