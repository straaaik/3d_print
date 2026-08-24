'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Calculator as CalcIcon } from 'lucide-react';

export interface CustomTooltipProps {
  title: string;
  description: string;
  formula: string;
  children: React.ReactNode;
  accentColor?: 'emerald' | 'rose' | 'orange' | 'amber' | 'cyan' | 'purple' | 'primary' | 'gray' | 'neutral';
  position?: 'top' | 'bottom' | 'auto';
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
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    rectTop: number;
    rectBottom: number;
    left: number;
    arrowLeft: number;
    placement: 'top' | 'bottom';
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(320, window.innerWidth - 24);
    const estimatedHeight = 170;

    // Check space above vs below
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    let placement: 'top' | 'bottom' = 'top';
    if (position === 'bottom') {
      placement = 'bottom';
    } else if (position === 'top') {
      placement = spaceAbove >= estimatedHeight || spaceAbove >= spaceBelow ? 'top' : 'bottom';
    } else {
      placement = spaceAbove >= estimatedHeight ? 'top' : 'bottom';
    }

    const triggerCenterX = rect.left + rect.width / 2;

    let baseLeft = triggerCenterX - tooltipWidth / 2;
    if (align === 'left') {
      baseLeft = rect.left - 12;
    } else if (align === 'right') {
      baseLeft = rect.right - tooltipWidth + 12;
    }

    const clampedLeft = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, baseLeft));
    const arrowLeft = Math.max(16, Math.min(tooltipWidth - 16, triggerCenterX - clampedLeft));

    setCoords({
      rectTop: rect.top,
      rectBottom: rect.bottom,
      left: clampedLeft,
      arrowLeft,
      placement,
    });
  }, [align, position]);

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  const getAccentStyles = () => {
    switch (accentColor) {
      case 'cyan':
      case 'primary':
        return {
          border: 'border-[#0CB4E0]/50 shadow-[#0CB4E0]/15',
          bgGlow: 'bg-[#0CB4E0]/10',
          titleColor: 'text-[#0CB4E0]',
          formulaBg: 'bg-[#0CB4E0]/15 text-[#0CB4E0] border-[#0CB4E0]/30',
        };
      case 'gray':
      case 'neutral':
        return {
          border: 'border-[#383e4a] shadow-black/40',
          bgGlow: 'bg-white/5',
          titleColor: 'text-gray-200',
          formulaBg: 'bg-[#1a1d24] text-gray-300 border-[#2f3542]',
        };
      case 'emerald':
        return {
          border: 'border-emerald-500/50 shadow-emerald-500/10',
          bgGlow: 'bg-emerald-500/10',
          titleColor: 'text-emerald-400',
          formulaBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
        };
      case 'rose':
        return {
          border: 'border-rose-500/50 shadow-rose-500/10',
          bgGlow: 'bg-rose-500/10',
          titleColor: 'text-rose-400',
          formulaBg: 'bg-rose-950/80 text-rose-300 border-rose-500/30',
        };
      case 'purple':
        return {
          border: 'border-purple-500/50 shadow-purple-500/10',
          bgGlow: 'bg-purple-500/10',
          titleColor: 'text-purple-400',
          formulaBg: 'bg-purple-950/80 text-purple-300 border-purple-500/30',
        };
      case 'amber':
        return {
          border: 'border-amber-500/50 shadow-amber-500/10',
          bgGlow: 'bg-amber-500/10',
          titleColor: 'text-amber-400',
          formulaBg: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
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

  return (
    <>
      <div 
        ref={triggerRef}
        className="inline-flex items-center cursor-help"
        onMouseEnter={() => {
          updateCoords();
          setIsOpen(true);
        }}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
      </div>

      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && coords && (
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.96, 
                y: coords.placement === 'top' ? 4 : -4 
              }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0 
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.96, 
                y: coords.placement === 'top' ? 4 : -4 
              }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                ...(coords.placement === 'top'
                  ? { bottom: typeof window !== 'undefined' ? window.innerHeight - coords.rectTop + 8 : 'auto', top: 'auto' }
                  : { top: coords.rectBottom + 8, bottom: 'auto' }),
                left: coords.left,
                width: Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 24 : 320),
                zIndex: 99999,
              }}
              className={`bg-[#16181d] border ${styles.border} rounded-2xl shadow-2xl p-4 backdrop-blur-2xl pointer-events-none text-xs select-none`}
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

              {/* Треугольная стрелка */}
              {coords.placement === 'top' ? (
                <div 
                  style={{ left: coords.arrowLeft }}
                  className="absolute top-full -translate-x-1/2 -mt-[1px] w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-[#16181d]" 
                />
              ) : (
                <div 
                  style={{ left: coords.arrowLeft }}
                  className="absolute bottom-full -translate-x-1/2 -mb-[1px] w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-[#16181d]" 
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
