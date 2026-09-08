import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip } from './Tooltip';

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
  stamp = 'ОКНО',
  badge,
  children,
  footer,
  maxWidth = 'lg',
  variant = 'default',
}: CockpitModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Системное время для правой части шапки (как в GoalSettingsModal)
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
  // Блокировка прокрутки фона при открытой модалке
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    window.requestAnimationFrame(() => {
      const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector);
      (firstFocusable ?? dialog)?.focus();
    });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeClass = maxWidthClasses[maxWidth] || maxWidthClasses.lg;

  const getVariantAccent = () => {
    switch (variant) {
      case 'error':
        return 'shadow-[0_25px_90px_-15px_rgba(244,63,94,0.3)]';
      case 'warning':
        return 'shadow-[0_25px_90px_-15px_rgba(245,158,11,0.3)]';
      case 'success':
        return 'shadow-[0_25px_90px_-15px_rgba(16,185,129,0.3)]';
      case 'cyan':
        return 'shadow-[0_25px_90px_-15px_rgba(6,182,212,0.3)]';
      default:
        return 'shadow-[0_25px_90px_-15px_rgba(0,0,0,0.95)]';
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 lg:p-6 overflow-y-auto select-none">
          {/* Стеклянный темный бэкдроп на весь экран с глубоким размытием */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          />

          {/* Главное окно в стиле Cockpit Console с эффектом кинематографичного подъема без внешней обводки */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : stamp}
            data-cockpit-modal="true"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${sizeClass} my-auto rounded-2xl ${getVariantAccent()} bg-neutral-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] font-sans border-0`}
          >
            {/* 1. Верхняя панель (Cockpit Topbar: Red LED + Title + Live time) */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 bg-neutral-900/60 shrink-0 gap-3">
              {/* Левая часть: красный терминальный кружок закрытия + заголовок раздела */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip content="Закрыть окно">
                    <button
                      type="button"
                      onClick={onClose}
                      title="Закрыть окно"
                      aria-label="Закрыть окно"
                      className="w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#f87171] cursor-pointer border-none outline-none"
                    />
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-[#d4d4d8] min-w-0">
                  <span id={titleId} className="text-[#d4d4d8] font-normal truncate">
                    {title || stamp}
                  </span>
                  {subtitle && (
                    <>
                      <span className="text-[#52525b] shrink-0">·</span>
                      <span className="text-[#71717a] hidden sm:inline truncate">
                        {subtitle}
                      </span>
                    </>
                  )}
                  {badge && <div className="shrink-0">{badge}</div>}
                </div>
              </div>

              {/* Правая часть: Только системное время (без крестика) */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="font-mono text-xs text-[#71717a] tabular-nums">
                  {currentTimeStr}
                </div>
              </div>
            </div>

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

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
}
