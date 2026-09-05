import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip } from '../Tooltip';

export interface MeridianModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  tag?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function MeridianModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}: MeridianModalProps) {
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
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none overflow-y-auto">
          {/* Темный стеклянный бэкдроп */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-opacity"
          />

          {/* Окно модалки */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative w-full ${maxWidthClasses} my-8 bg-neutral-950/95 border border-white/15 rounded-2xl shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-10 overflow-hidden font-mono flex flex-col`}
          >
            {/* 1. Верхняя панель (Cockpit Topbar: Red LED + Title + Live time) */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 bg-neutral-900/60 select-none shrink-0 gap-3">
              {/* Левая часть: красный терминальный кружок закрытия + заголовок раздела */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip content="Закрыть окно">
                    <button
                      type="button"
                      onClick={onClose}
                      title="Закрыть окно"
                      aria-label="Закрыть окно"
                      className="w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#f87171] hover:scale-125 active:scale-95 transition-all duration-150 cursor-pointer border-none outline-none shrink-0"
                    />
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-[#d4d4d8] min-w-0">
                  <span className="text-[#d4d4d8] font-normal truncate">
                    {title}
                  </span>
                  {subtitle && (
                    <>
                      <span className="text-[#52525b] shrink-0">·</span>
                      <span className="text-[#71717a] hidden sm:inline truncate">
                        {subtitle}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Правая часть: Только системное время (без крестика) */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="font-mono text-xs text-[#71717a] tabular-nums">
                  {currentTimeStr}
                </div>
              </div>
            </div>

            {/* Тело модалки */}
            <div className="p-6 sm:p-8 space-y-4">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
