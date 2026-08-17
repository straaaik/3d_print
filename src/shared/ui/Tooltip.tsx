'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Calculator as CalcIcon } from 'lucide-react';

export interface CustomTooltipProps {
  title: string;
  description: string;
  formula: string;
  children: React.ReactNode;
  accentColor?: 'emerald' | 'rose' | 'orange' | 'amber';
  position?: 'top' | 'bottom';
  align?: 'left' | 'center' | 'right';
}

export function CustomTooltip({
  title,
  description,
  formula,
  children,
  accentColor = 'orange',
  position = 'top',
  align = 'center',
}: CustomTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getAccentStyles = () => {
    switch (accentColor) {
      case 'emerald':
        return {
          border: 'border-emerald-500/50 shadow-emerald-500/10',
          bgGlow: 'bg-emerald-500/10',
          titleColor: 'text-emerald-400',
          formulaBg: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30',
        };
      case 'rose':
        return {
          border: 'border-rose-500/50 shadow-rose-500/10',
          bgGlow: 'bg-rose-500/10',
          titleColor: 'text-rose-400',
          formulaBg: 'bg-rose-950/70 text-rose-300 border-rose-500/30',
        };
      case 'amber':
        return {
          border: 'border-amber-500/50 shadow-amber-500/10',
          bgGlow: 'bg-amber-500/10',
          titleColor: 'text-amber-400',
          formulaBg: 'bg-amber-950/70 text-amber-300 border-amber-500/30',
        };
      case 'orange':
      default:
        return {
          border: 'border-[#FF6B00]/50 shadow-[#FF6B00]/10',
          bgGlow: 'bg-[#FF6B00]/10',
          titleColor: 'text-[#FF8800]',
          formulaBg: 'bg-[#FF6B00]/15 text-[#FF8800] border-[#FF6B00]/30',
        };
    }
  };

  const styles = getAccentStyles();

  // Позиционирование выпадающей подсказки (top vs bottom)
  const isTop = position === 'top';

  // Выравнивание по горизонтали относительно иконки
  const getAlignClass = () => {
    if (align === 'left') return 'left-0 translate-x-0';
    if (align === 'right') return 'right-0 translate-x-0';
    return 'left-1/2 -translate-x-1/2';
  };

  // Позиция стрелочки
  const getArrowAlignClass = () => {
    if (align === 'left') return 'left-3 -translate-x-0';
    if (align === 'right') return 'right-3 -translate-x-0';
    return 'left-1/2 -translate-x-1/2';
  };

  return (
    <div 
      className="relative inline-flex items-center z-30"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: isTop ? 6 : -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isTop ? 6 : -6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute ${getAlignClass()} ${
              isTop ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
            } w-72 sm:w-80 bg-[#16181d] border ${styles.border} rounded-2xl shadow-2xl p-4 backdrop-blur-2xl z-[100] pointer-events-none text-xs select-none`}
          >
            {/* Шапка тултипа */}
            <div className="flex items-center gap-2 mb-1.5 font-bold text-sm">
              <Info className={`w-4 h-4 ${styles.titleColor}`} />
              <span className={styles.titleColor}>{title}</span>
            </div>

            {/* Описание */}
            <p className="text-gray-200 leading-relaxed mb-3 font-normal">
              {description}
            </p>

            {/* Блок формулы расчета */}
            <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${styles.formulaBg}`}>
              <CalcIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[10px] uppercase tracking-wider opacity-85 mb-0.5">
                  Формула расчета:
                </div>
                <div className="font-mono font-semibold text-[11px] leading-snug">
                  {formula}
                </div>
              </div>
            </div>

            {/* Треугольная стрелка у вершины/основания тултипа */}
            {isTop ? (
              <div className={`absolute top-full ${getArrowAlignClass()} -mt-[1px] w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-[#16181d]`} />
            ) : (
              <div className={`absolute bottom-full ${getArrowAlignClass()} -mb-[1px] w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-[#16181d]`} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
