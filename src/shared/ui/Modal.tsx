import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence, type TargetAndTransition, type Transition } from 'motion/react';
import { Tooltip } from './Tooltip';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
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

type ModalAnimation = {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
};

const modalVariants: Record<NonNullable<ModalProps['variant']>, ModalAnimation> = {
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
  subtitle,
  children,
  footer,
  variant = 'default',
  maxWidth = 'md',
}: ModalProps) {
  const titleId = useId();
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} MSK`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const styleConfig = variantStyles[variant];
  const animConfig = modalVariants[variant];
  const sizeClass = maxWidthClasses[maxWidth];

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none">
          {/* Фон на весь экран */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
          />

          {/* Общая палитра окон каталога и системы по эталону заказов. */}
          <motion.div
            initial={animConfig.initial}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            animate={animConfig.animate}
            exit={animConfig.exit}
            transition={animConfig.transition}
            className={`cockpit-form-modal relative w-full ${sizeClass} my-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-10 max-h-[92vh] flex flex-col overflow-hidden font-mono`}
          >
            {/* 1. Верхняя панель (Cockpit Topbar: Red LED + Title + Live time) */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 bg-neutral-900/60 select-none shrink-0 gap-3">
              {/* Левая часть: красный терминальный кружок закрытия + заголовок раздела */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip content="Закрыть окно">
                    <motion.button
                      type="button"
                      onClick={onClose}
                      title="Закрыть окно"
                      aria-label="Закрыть окно"
                      initial={false}
                      whileHover={{ backgroundColor: '#f87171' }}
                      transition={{ duration: 0.18 }}
                      className="w-3 h-3 rounded-full bg-[#36363c] cursor-pointer border-none outline-none shrink-0 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                    />
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-neutral-300 min-w-0">
                  {styleConfig.icon}
                  <span id={titleId} className="text-neutral-300 font-normal truncate">
                    {title}
                  </span>
                  {subtitle && (
                    <>
                      <span className="hidden sm:inline text-[#52525b] shrink-0">·</span>
                      <span className="text-[#71717a] hidden sm:inline truncate">
                        {subtitle}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Правая часть: Системное время */}
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <div className="font-mono text-xs text-[#71717a] tabular-nums">
                  {currentTimeStr}
                </div>
              </div>
            </div>

            {/* 2. Контент */}
            <div className="p-5 sm:p-6 bg-[#18181c] overflow-y-auto flex-1 custom-scrollbar text-xs text-neutral-200 font-mono">
              {children}
            </div>

            {/* 3. Футер */}
            {footer && (
              <div className="border-t border-white/10 px-5 py-3 bg-neutral-900/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-500 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
}
