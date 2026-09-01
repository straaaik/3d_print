'use client';

import React, { useEffect } from 'react';
import { X, AlertOctagon, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'error' | 'success' | 'warning' | 'info';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

const variantStyles = {
  default: {
    borderColor: 'border-white/15',
    icon: null,
  },
  error: {
    borderColor: 'border-rose-500/40',
    icon: <AlertOctagon className="text-rose-400 shrink-0" size={18} />,
  },
  warning: {
    borderColor: 'border-amber-500/40',
    icon: <AlertTriangle className="text-amber-400 shrink-0" size={18} />,
  },
  success: {
    borderColor: 'border-emerald-500/40',
    icon: <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />,
  },
  info: {
    borderColor: 'border-cyan-500/40',
    icon: <Info className="text-cyan-400 shrink-0" size={18} />,
  },
};

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

const modalVariants: Record<string, any> = {
  default: {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 8 },
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  error: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { 
      opacity: 1, 
      scale: 1,
      x: [0, -10, 8, -8, 6, -4, 2, 0],
    },
    exit: { opacity: 0, scale: 0.95, y: 6 },
    transition: { duration: 0.35, ease: 'easeOut' },
  },
  warning: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  success: {
    initial: { opacity: 0, scale: 0.92, y: -6 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.92, y: 6 },
    transition: { type: 'spring', stiffness: 350, damping: 25 },
  },
  info: {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: 0.18, ease: 'easeOut' },
  },
};

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  footer,
  variant = 'default',
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const styleConfig = variantStyles[variant];
  const animConfig = modalVariants[variant];
  const sizeClass = maxWidthClasses[maxWidth];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none">
          {/* Фон */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Контейнер модального окна в стиле Meridian Cockpit */}
          <motion.div
            initial={animConfig.initial}
            animate={animConfig.animate}
            exit={animConfig.exit}
            transition={animConfig.transition}
            className={`relative w-full ${sizeClass} my-auto rounded-2xl border ${styleConfig.borderColor} bg-neutral-950/95 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-10 max-h-[90vh] flex flex-col overflow-hidden font-sans`}
          >
            {/* Шапка в стиле Cockpit Topbar */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-5 py-3 bg-neutral-900/60 select-none shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* 3 Терминальные светодиода */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-400/40 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 border border-yellow-400/40 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40 inline-block" />
                </div>

                <div className="flex items-center gap-2 pl-3 border-l border-white/10 min-w-0">
                  {styleConfig.icon}
                  <h3 className="text-white text-sm sm:text-base font-bold tracking-tight truncate">
                    {title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            {/* Прокручиваемый контент */}
            <div className="text-neutral-200 overflow-y-auto p-4 sm:p-6 flex-1 min-h-0 custom-scrollbar text-xs sm:text-sm">
              {children}
            </div>

            {/* Фиксированный нижний футер кнопок */}
            {footer && (
              <div className="border-t border-white/10 px-4 sm:px-6 py-3 shrink-0 bg-neutral-950 flex items-center justify-between font-mono text-[11px]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
