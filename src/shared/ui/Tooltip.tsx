'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator as CalcIcon } from 'lucide-react';

/* ==========================================================================
   1. MINIMAL COCKPIT TOOLTIP (For buttons, icons, actions, tags)
   ========================================================================== */

export interface TooltipProps {
  content?: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  align?: 'start' | 'center' | 'end';
  delay?: number;
  shortcut?: string;
  subtext?: string;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
  offset?: number;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  align = 'center',
  delay = 120,
  shortcut,
  subtext,
  className = '',
  wrapperClassName = '',
  disabled = false,
  offset = 6,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    arrowLeft?: number;
    arrowTop?: number;
    placement: 'top' | 'bottom' | 'left' | 'right';
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const triggerRect = triggerRef.current.getBoundingClientRect();

    // Estimate or measure tooltip size
    const estimatedWidth = tooltipRef.current?.offsetWidth || (subtext ? 160 : 120);
    const estimatedHeight = tooltipRef.current?.offsetHeight || (subtext ? 44 : 28);
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const margin = 8;

    let placement: 'top' | 'bottom' | 'left' | 'right' = 'top';

    if (position === 'auto') {
      placement = triggerRect.top > estimatedHeight + offset + margin ? 'top' : 'bottom';
    } else if (position === 'top') {
      placement = triggerRect.top > estimatedHeight + offset + margin ? 'top' : 'bottom';
    } else if (position === 'bottom') {
      placement = screenH - triggerRect.bottom > estimatedHeight + offset + margin ? 'bottom' : 'top';
    } else if (position === 'left') {
      placement = triggerRect.left > estimatedWidth + offset + margin ? 'left' : 'right';
    } else if (position === 'right') {
      placement = screenW - triggerRect.right > estimatedWidth + offset + margin ? 'right' : 'left';
    }

    let top = 0;
    let left = 0;
    let arrowLeft: number | undefined;
    let arrowTop: number | undefined;

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;

    if (placement === 'top' || placement === 'bottom') {
      if (placement === 'top') {
        top = triggerRect.top - estimatedHeight - offset;
      } else {
        top = triggerRect.bottom + offset;
      }

      let baseLeft = triggerCenterX - estimatedWidth / 2;
      if (align === 'start') {
        baseLeft = triggerRect.left;
      } else if (align === 'end') {
        baseLeft = triggerRect.right - estimatedWidth;
      }

      // Clamp horizontally within screen
      left = Math.max(margin, Math.min(screenW - estimatedWidth - margin, baseLeft));
      arrowLeft = Math.max(8, Math.min(estimatedWidth - 8, triggerCenterX - left));
    } else {
      // Left or right placement
      if (placement === 'left') {
        left = triggerRect.left - estimatedWidth - offset;
      } else {
        left = triggerRect.right + offset;
      }

      const baseTop = triggerCenterY - estimatedHeight / 2;
      top = Math.max(margin, Math.min(screenH - estimatedHeight - margin, baseTop));
      arrowTop = Math.max(8, Math.min(estimatedHeight - 8, triggerCenterY - top));
    }

    setCoords({
      top,
      left,
      arrowLeft,
      arrowTop,
      placement,
    });
  }, [position, align, offset, subtext]);

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      calculatePosition();
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  // Close on Escape or scroll
  useEffect(() => {
    if (!isOpen) return;
    calculatePosition();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, calculatePosition]);

  if (!content || disabled) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-flex items-center ${wrapperClassName}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>

      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && coords && (
            <motion.div
              ref={tooltipRef}
              initial={{
                opacity: 0,
                scale: 0.96,
                y: coords.placement === 'top' ? 2 : coords.placement === 'bottom' ? -2 : 0,
                x: coords.placement === 'left' ? 2 : coords.placement === 'right' ? -2 : 0,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                x: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.96,
                y: coords.placement === 'top' ? 2 : coords.placement === 'bottom' ? -2 : 0,
                x: coords.placement === 'left' ? 2 : coords.placement === 'right' ? -2 : 0,
              }}
              transition={{ duration: 0.08, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                zIndex: 99999,
              }}
              className={`pointer-events-none select-none rounded-lg border border-white/15 bg-neutral-950/95 px-2.5 py-1 font-mono text-[11px] text-neutral-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.9)] backdrop-blur-xl ${className}`}
            >
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-mono text-neutral-200 font-normal whitespace-nowrap">
                  {content}
                </span>

                {shortcut && (
                  <kbd className="ml-0.5 inline-flex items-center justify-center rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[9px] font-mono text-neutral-400 leading-none">
                    {shortcut}
                  </kbd>
                )}
              </div>

              {subtext && (
                <div className="mt-1 text-[10px] font-mono text-neutral-400 leading-snug">
                  {subtext}
                </div>
              )}

              {/* Minimal Arrow Pointer */}
              {coords.placement === 'top' && coords.arrowLeft !== undefined && (
                <div
                  style={{ left: coords.arrowLeft }}
                  className="absolute top-full -translate-x-1/2 -mt-[1px] w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-950"
                />
              )}
              {coords.placement === 'bottom' && coords.arrowLeft !== undefined && (
                <div
                  style={{ left: coords.arrowLeft }}
                  className="absolute bottom-full -translate-x-1/2 -mb-[1px] w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-neutral-950"
                />
              )}
              {coords.placement === 'left' && coords.arrowTop !== undefined && (
                <div
                  style={{ top: coords.arrowTop }}
                  className="absolute left-full -translate-y-1/2 -ml-[1px] w-0 h-0 border-y-4 border-y-transparent border-l-4 border-l-neutral-950"
                />
              )}
              {coords.placement === 'right' && coords.arrowTop !== undefined && (
                <div
                  style={{ top: coords.arrowTop }}
                  className="absolute right-full -translate-y-1/2 -mr-[1px] w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-neutral-950"
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

// Alias for explicit Cockpit naming convention
export const CockpitTooltip = Tooltip;


/* ==========================================================================
   2. RICH PARAMETER TOOLTIP (For formulas, complex calculations, KPI help)
   ========================================================================== */

export interface CustomTooltipProps {
  title: string;
  description: string;
  formula?: string;
  children: React.ReactNode;
  accentColor?: 'emerald' | 'rose' | 'orange' | 'amber' | 'cyan' | 'purple' | 'primary' | 'gray' | 'neutral' | string;
  position?: 'top' | 'bottom' | 'auto';
  align?: 'left' | 'center' | 'right';
}

export function CustomTooltip({
  title,
  description,
  formula,
  children,
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
    const estimatedHeight = 160;

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
                scale: 0.97,
                y: coords.placement === 'top' ? 4 : -4
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                scale: 0.97,
                y: coords.placement === 'top' ? 4 : -4
              }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                ...(coords.placement === 'top'
                  ? { bottom: typeof window !== 'undefined' ? window.innerHeight - coords.rectTop + 8 : 'auto', top: 'auto' }
                  : { top: coords.rectBottom + 8, bottom: 'auto' }),
                left: coords.left,
                width: Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 24 : 320),
                zIndex: 99999,
              }}
              className="bg-neutral-950/95 border border-white/10 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.9)] p-3.5 backdrop-blur-xl pointer-events-none text-xs select-none space-y-2.5 font-sans"
            >
              {/* Техническая шапка тултипа */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-mono font-bold text-white text-xs tracking-tight">
                  {title}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 font-medium">
                  [ СПРАВКА ]
                </span>
              </div>

              {/* Описание */}
              <p className="text-neutral-400 text-[11px] leading-relaxed font-normal">
                {description}
              </p>

              {/* Блок формулы расчета в стиле карточки калькулятора */}
              {formula && (
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <CalcIcon className="w-3 h-3 text-neutral-400 shrink-0" />
                      <span>Формула расчета:</span>
                    </span>
                    <span className="text-neutral-500 font-mono text-[9px]">[ MATH ]</span>
                  </div>
                  <div className="font-mono font-bold text-xs text-white leading-snug break-words tracking-wide pt-0.5">
                    {formula}
                  </div>
                </div>
              )}

              {/* Треугольная стрелка */}
              {coords.placement === 'top' ? (
                <div
                  style={{ left: coords.arrowLeft }}
                  className="absolute top-full -translate-x-1/2 -mt-[1px] w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-neutral-950"
                />
              ) : (
                <div
                  style={{ left: coords.arrowLeft }}
                  className="absolute bottom-full -translate-x-1/2 -mb-[1px] w-0 h-0 border-x-6 border-x-transparent border-b-6 border-b-neutral-950"
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
