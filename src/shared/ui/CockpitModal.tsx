'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CockpitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  stamp?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  variant?: 'default' | 'error' | 'warning' | 'success' | 'cyan';
  showLeds?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export function CockpitModal({
  isOpen,
  onClose,
  title,
  subtitle,
  stamp = 'MODAL_WINDOW',
  badge,
  children,
  footer,
  maxWidth = 'lg',
  variant = 'default',
  showLeds = true,
}: CockpitModalProps) {
  // Блокировка прокрутки фона при открытой модалке
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [isOpen]);

  // Закрытие по клавише Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sizeClass = maxWidthClasses[maxWidth] || maxWidthClasses.lg;

  const getVariantAccent = () => {
    switch (variant) {
      case 'error':
        return 'border-rose-500/30 shadow-[0_20px_80px_-15px_rgba(244,63,94,0.15)]';
      case 'warning':
        return 'border-amber-500/30 shadow-[0_20px_80px_-15px_rgba(245,158,11,0.15)]';
      case 'success':
        return 'border-emerald-500/30 shadow-[0_20px_80px_-15px_rgba(16,185,129,0.15)]';
      case 'cyan':
        return 'border-cyan-500/30 shadow-[0_20px_80px_-15px_rgba(6,182,212,0.15)]';
      default:
        return 'border-white/15 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)]';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-6 overflow-y-auto select-none">
          {/* Стеклянный темный бэкдроп */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Главное окно в стиле Cockpit Console */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`relative w-full ${sizeClass} my-auto rounded-2xl border ${getVariantAccent()} bg-neutral-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] font-sans`}
          >
            {/* 1. Верхняя панель (Cockpit Topbar) */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-5 py-3 bg-neutral-900/60 shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Светодиоды терминала */}
                {showLeds && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-400/40 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 border border-yellow-400/40 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40 inline-block" />
                  </div>
                )}

                {/* Инженерный штамп */}
                <div className={`flex items-center gap-2 font-mono text-xs text-neutral-300 min-w-0 ${showLeds ? 'pl-3 border-l border-white/10' : ''}`}>
                  <span className="text-white font-bold shrink-0">§ 3D-LABS</span>
                  <span className="text-neutral-600 shrink-0">//</span>
                  <span className="text-neutral-400 truncate uppercase tracking-wider font-semibold">
                    {stamp}
                  </span>
                  {badge && <div className="shrink-0">{badge}</div>}
                </div>
              </div>

              {/* Кнопка закрытия */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Заголовок и подзаголовок (если задан) */}
            {(title || subtitle) && (
              <div className="px-4 sm:px-6 pt-4 pb-2 shrink-0">
                {title && (
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-neutral-400 mt-0.5 font-normal leading-relaxed font-sans">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* 3. Прокручиваемый рабочий контент */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar text-xs sm:text-sm text-neutral-200">
              {children}
            </div>

            {/* 4. Нижний футер (если передан) */}
            {footer && (
              <div className="border-t border-white/10 px-4 sm:px-6 py-3 bg-neutral-950 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-neutral-500 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
