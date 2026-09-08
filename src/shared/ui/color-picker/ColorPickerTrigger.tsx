'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { normalizeHex } from '../../lib/colorUtils';

interface ColorPickerTriggerProps {
  value: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
  children: (props: { close: () => void }) => React.ReactNode;
}

export function ColorPickerTrigger({
  value = '#0CB4E0',
  label,
  className = '',
  disabled = false,
  align = 'left',
  children,
}: ColorPickerTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; isTop: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hex = normalizeHex(value);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverEstimatedHeight = 440;
    const popoverEstimatedWidth = 310;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const isTop = spaceBelow < popoverEstimatedHeight && spaceAbove > spaceBelow;

    let left = align === 'right' ? rect.right - popoverEstimatedWidth : rect.left;
    if (left + popoverEstimatedWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverEstimatedWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    const top = isTop ? rect.top - 8 : rect.bottom + 8;

    setCoords({ top, left, isTop });
  }, [align]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen, updateCoords]);

  // Закрытие по клику вне компонента и клавише Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {label && (
        <label className="block mb-1.5 text-[11px] font-mono text-neutral-400 select-none">
          {label}
        </label>
      )}

      {/* Cockpit Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`h-9 px-3 rounded-lg border flex items-center gap-2.5 font-mono text-xs transition-colors select-none ${
          disabled
            ? 'opacity-40 border-white/5 bg-white/[0.02] text-neutral-600 cursor-not-allowed'
            : isOpen
            ? 'border-cyan-500/40 bg-neutral-900 text-white shadow-sm ring-1 ring-cyan-500/20'
            : 'border-white/15 bg-neutral-950/90 text-neutral-200 hover:border-white/25 hover:bg-neutral-900/80 cursor-pointer'
        }`}
      >
        {/* Swatch Pill */}
        <span
          className="w-4.5 h-4.5 rounded-md border border-white/20 shrink-0 shadow-inner"
          style={{ backgroundColor: hex }}
        />

        {/* HEX Value */}
        <span className="font-mono tabular-nums tracking-wider uppercase">{hex}</span>

        {/* Format Badge */}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400">
          HEX
        </span>

        {/* Animated Chevron */}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15, ease: 'easeInOut' }}
          className="text-neutral-400"
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>

      {/* Popover Card rendered via Portal */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && coords && (
              <motion.div
                ref={popoverRef}
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  transform: coords.isTop ? 'translateY(-100%)' : 'none',
                  transformOrigin: coords.isTop ? 'bottom center' : 'top center',
                  zIndex: 9999,
                }}
                initial={{ opacity: 0, y: coords.isTop ? 6 : -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: coords.isTop ? 6 : -6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-white/15 bg-neutral-950/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-3.5"
              >
                {children({ close: () => setIsOpen(false) })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
