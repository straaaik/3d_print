'use client';

import React, { useEffect } from 'react';
import { X, AlertOctagon, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode; // Зафиксированный нижний футер с кнопками
  variant?: 'default' | 'error' | 'success' | 'warning' | 'info';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

const variantStyles = {
  default: {
    borderColor: 'border-[#242930]',
    icon: null,
  },
  error: {
    borderColor: 'border-red-500/40',
    icon: <AlertOctagon className="text-red-500 shrink-0" size={20} />,
  },
  warning: {
    borderColor: 'border-amber-500/40',
    icon: <AlertTriangle className="text-amber-500 shrink-0" size={20} />,
  },
  success: {
    borderColor: 'border-emerald-500/40',
    icon: <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />,
  },
  info: {
    borderColor: 'border-[#0CB4E0]/40',
    icon: <Info className="text-primary shrink-0" size={20} />,
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

// Анимационные пресеты для вариантов
const modalVariants: Record<string, any> = {
  default: {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 8 },
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  error: {
    initial: { opacity: 0, scale: 0.95 },
    // Эффект тряски (shake) при возникновении ошибки
    animate: { 
      opacity: 1, 
      scale: 1,
      x: [0, -10, 8, -8, 6, -4, 2, 0],
    },
    exit: { opacity: 0, scale: 0.95, y: 6 },
    transition: { duration: 0.38, ease: 'easeOut' },
  },
  warning: {
    initial: { opacity: 0, scale: 0.95, rotate: -1 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 0.95, rotate: 1 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  success: {
    initial: { opacity: 0, scale: 0.85, y: -8 },
    // Pop-up с легким отскоком (spring bounce)
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 6 },
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
  info: {
    initial: { opacity: 0, y: -12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: 0.22, ease: 'easeOut' },
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
          {/* Фон */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Контейнер модального окна */}
          <motion.div
            initial={animConfig.initial}
            animate={animConfig.animate}
            exit={animConfig.exit}
            transition={animConfig.transition}
            className={`relative w-full ${sizeClass} bg-[#16181d] border ${styleConfig.borderColor} rounded-2xl shadow-2xl p-4 sm:p-6 z-10 max-h-[90vh] flex flex-col`}
          >
            {/* Шапка */}
            <div className="flex items-center justify-between mb-4 pb-3.5 border-b border-[#242930] select-none shrink-0">
              <div className="flex items-center gap-2.5">
                {styleConfig.icon}
                <h3 className="text-white text-base sm:text-lg font-bold tracking-wide">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-accent hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#242930] focus:outline-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Прокручиваемый контент */}
            <div className="text-gray-300 overflow-y-auto pr-1 flex-1 min-h-0">
              {children}
            </div>

            {/* Фиксированный нижний футер кнопок */}
            {footer && (
              <div className="mt-4 pt-3 border-t border-[#242930] shrink-0 bg-[#16181d]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
