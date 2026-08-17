'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { formatCurrency } from '../lib/format';

interface AnimatedPriceProps {
  value: number;
  currencySymbol?: string;
  className?: string;
}

// Отдельный анимируемый символ цены с поддержкой Layout-перестроения по горизонтали
function Digit({ value, direction, className = '' }: { value: string; direction: 'up' | 'down'; className?: string }) {
  const isNumber = /^[0-9]$/.test(value);

  if (!isNumber) {
    if (value === ' ') {
      // Для пробела рендерим пустой блок фиксированной узкой ширины (избегаем двойных пробелов)
      return (
        <motion.span 
          layout="position"
          className={`inline-block select-none shrink-0 w-[0.22em] ${className}`}
        />
      );
    }

    return (
      <motion.span 
        layout="position"
        className={`inline-block font-mono select-none shrink-0 ${className}`}
      >
        {value}
      </motion.span>
    );
  }

  return (
    <motion.span 
      layout="size"
      className={`inline-block overflow-hidden relative w-[0.55em] h-[1.25em] text-center select-none pointer-events-none shrink-0 ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: direction === 'up' ? '100%' : '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: direction === 'up' ? '-100%' : '100%', opacity: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 350, 
            damping: 28,
            mass: 0.7
          }}
          className="absolute inset-0 flex items-center justify-center font-mono"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

export function AnimatedPrice({
  value,
  currencySymbol = '₽',
  className = '',
}: AnimatedPriceProps) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const lastUpdateRef = useRef(Date.now());

  // Умный дебаунс: разделяем быстрый клавиатурный ввод и редкие клики по кнопкам счетчика
  useEffect(() => {
    const now = Date.now();
    const timeDiff = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    if (timeDiff < 250) {
      // Если ввод происходит быстро, задерживаем обновление анимации
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, 350);

      return () => {
        clearTimeout(handler);
      };
    } else {
      // При одиночных кликах или старте обновляем мгновенно
      setDebouncedValue(value);
    }
  }, [value]);

  // Вычисление направления движения при изменении дебаунсированного значения
  useEffect(() => {
    if (debouncedValue > displayValue) {
      setDirection('up');
    } else if (debouncedValue < displayValue) {
      setDirection('down');
    }
  }, [debouncedValue]);

  // Анимация накручивания/скручивания числа
  useEffect(() => {
    // Если изменение незначительное (меньше 5 единиц), обновляем стейт сразу без анимации прокрутки
    // Это исключает мерцание копеек при мелких колебаниях цены
    if (Math.abs(debouncedValue - displayValue) < 5) {
      setDisplayValue(debouncedValue);
      return;
    }

    const controls = animate(displayValue, debouncedValue, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1], // плавное замедление (easeOutQuart)
      onUpdate: (latest) => {
        // Округляем промежуточные значения до целых во время движения, 
        // чтобы копейки не перегружали поток рендеринга.
        // В самом конце анимации устанавливаем точное дробное значение.
        if (Math.abs(latest - debouncedValue) < 0.5) {
          setDisplayValue(debouncedValue);
        } else {
          setDisplayValue(Math.round(latest));
        }
      }
    });
    return () => controls.stop();
  }, [debouncedValue]);

  // Форматируем текущее интерполированное число в валютную строку
  const formattedText = formatCurrency(displayValue, currencySymbol);

  return (
    <motion.div 
      layout 
      className="flex flex-row-reverse items-center justify-end h-full overflow-hidden"
    >
      {formattedText
        .split('')
        .reverse()
        .map((char, index) => (
          <Digit
            key={index}
            value={char}
            direction={direction}
            className={className}
          />
        ))}
    </motion.div>
  );
}
