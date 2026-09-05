'use client';

import React, { useRef, useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { motion } from 'motion/react';

interface AnimatedPriceNumberProps {
  value: number;
  currencySymbol?: string;
  className?: string;
  decimals?: number;
  prefix?: string;
  showPositiveSign?: boolean;
  currencyClassName?: string;
}

export function AnimatedPriceNumber({
  value,
  currencySymbol = '₽',
  className = '',
  decimals = 0,
  prefix = '',
  showPositiveSign = false,
  currencyClassName,
}: AnimatedPriceNumberProps) {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const roundedValue = decimals > 0 
    ? Math.round(safeValue * Math.pow(10, decimals)) / Math.pow(10, decimals)
    : Math.round(safeValue);

  const prevValueRef = useRef<number>(roundedValue);
  const [hasChanged, setHasChanged] = useState<boolean>(false);

  useEffect(() => {
    if (prevValueRef.current !== roundedValue) {
      prevValueRef.current = roundedValue;
      setHasChanged(true);
      const timer = setTimeout(() => {
        setHasChanged(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [roundedValue]);

  const defaultCurrencyClass = currencySymbol === '%'
    ? 'font-normal ml-0.5 select-none'
    : 'text-neutral-500 font-normal ml-0.5 select-none';

  return (
    <motion.span
      animate={
        hasChanged
          ? {
              scale: [1, 1.05, 1],
              filter: ['brightness(1)', 'brightness(1.35)', 'brightness(1)'],
            }
          : { scale: 1, filter: 'brightness(1)' }
      }
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-flex items-baseline gap-0.5 tabular-nums font-mono ${className}`}
    >
      {showPositiveSign && roundedValue > 0 && (
        <span className="select-none mr-0.5">+</span>
      )}
      {prefix && (
        <span className="select-none mr-0.5">{prefix}</span>
      )}
      <NumberFlow
        value={roundedValue}
        locales="ru-RU"
        format={{
          maximumFractionDigits: decimals,
          minimumFractionDigits: decimals,
        }}
        respectMotionPreference
      />
      {currencySymbol && (
        <span className={currencyClassName ?? defaultCurrencyClass}>{currencySymbol}</span>
      )}
    </motion.span>
  );
}
