'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip } from '../../shared/ui/Tooltip';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  timestamp: string;
  duration: number;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number, action?: ToastAction) => void;
  showError: (message: string, title?: string, duration?: number, action?: ToastAction) => void;
  showWarning: (message: string, title?: string, duration?: number, action?: ToastAction) => void;
  showSuccess: (message: string, title?: string, duration?: number, action?: ToastAction) => void;
  showInfo: (message: string, title?: string, duration?: number, action?: ToastAction) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function formatCurrentTime(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

interface ToastStyleConfig {
  label: string;
  badgeClass: string;
  dotColor: string;
  dotGlow: string;
  progressBarClass: string;
  hoverBorderClass: string;
}

function getToastStyleConfig(type: ToastType): ToastStyleConfig {
  switch (type) {
    case 'error':
      return {
        label: 'СБОЙ',
        badgeClass: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
        dotColor: 'bg-rose-400',
        dotGlow: 'bg-rose-400/30',
        progressBarClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
        hoverBorderClass: 'hover:border-rose-500/40',
      };
    case 'warning':
      return {
        label: 'ВНИМАНИЕ',
        badgeClass: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
        dotColor: 'bg-amber-400',
        dotGlow: 'bg-amber-400/30',
        progressBarClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
        hoverBorderClass: 'hover:border-amber-500/40',
      };
    case 'success':
      return {
        label: 'УСПЕХ',
        badgeClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
        dotColor: 'bg-emerald-400',
        dotGlow: 'bg-emerald-400/30',
        progressBarClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
        hoverBorderClass: 'hover:border-emerald-500/40',
      };
    case 'info':
    default:
      return {
        label: 'ИНФО',
        badgeClass: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40',
        dotColor: 'bg-cyan-400',
        dotGlow: 'bg-cyan-400/30',
        progressBarClass: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]',
        hoverBorderClass: 'hover:border-cyan-500/40',
      };
  }
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [remainingTime, setRemainingTime] = useState(toast.duration);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);
  const config = getToastStyleConfig(toast.type);

  useEffect(() => {
    if (toast.duration <= 0) return;

    if (isPaused) {
      elapsedBeforePauseRef.current += Date.now() - startTimeRef.current;
      return;
    }

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const currentElapsed = elapsedBeforePauseRef.current + (Date.now() - startTimeRef.current);
      const nextRemaining = Math.max(0, toast.duration - currentElapsed);
      setRemainingTime(nextRemaining);

      if (nextRemaining <= 0) {
        clearInterval(interval);
        onRemove(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, toast.duration, toast.id, onRemove]);

  const progressPercent = toast.duration > 0 ? (remainingTime / toast.duration) * 100 : 100;
  const hasTitle = Boolean(toast.title && toast.title.trim().length > 0);
  const mainTitle = hasTitle ? toast.title : toast.message;
  const subtitle = hasTitle ? toast.message : '3D-LABS';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto group relative flex items-center justify-between gap-3 py-2.5 px-3.5 rounded-xl border border-white/15 bg-neutral-950/95 shadow-[0_12px_35px_rgba(0,0,0,0.85)] backdrop-blur-2xl font-mono text-xs hover:border-white/40 hover:bg-neutral-900/95 transition-all w-[300px] sm:w-[340px] overflow-hidden ${config.hoverBorderClass}`}
    >
      {/* Левая часть: Круглый индикатор со светящейся точкой и контент */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Круглый контейнер со светящейся точкой */}
        <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
          <div className="relative flex items-center justify-center">
            <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor} animate-pulse`} />
            <span className={`absolute w-4 h-4 rounded-full ${config.dotGlow} animate-ping`} />
          </div>
        </div>

        {/* Две строки информации */}
        <div className="flex flex-col min-w-0 flex-1">
          {/* Верхняя строка: Бейдж статуса + Заголовок */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-[9px] font-bold tracking-wider uppercase px-1 py-0.2 rounded border shrink-0 ${config.badgeClass}`}
            >
              {config.label}
            </span>
            <span className="text-white font-medium truncate text-xs">
              {mainTitle}
            </span>
          </div>

          {/* Нижняя строка: Описание / Сообщение + Время */}
          <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5 min-w-0">
            <span className="truncate max-w-[150px] sm:max-w-[180px] font-sans">
              {subtitle}
            </span>
            <span className="font-mono text-[9px] text-neutral-500 tabular-nums shrink-0 ml-1">
              {toast.timestamp}
            </span>
          </div>
        </div>
      </div>

      {/* Правая часть: Вертикальный разделитель + Кнопка действия + Кнопка закрытия */}
      <div className="flex items-center gap-1 shrink-0 border-l border-white/10 pl-2">
        {toast.action && (
          <Tooltip content={toast.action.label}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toast.action?.onClick();
                onRemove(toast.id);
              }}
              className="p-1 rounded-md text-neutral-400 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="text-xs">↗</span>
            </button>
          </Tooltip>
        )}

        <Tooltip content="Закрыть уведомление">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(toast.id);
            }}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="text-sm font-bold leading-none">×</span>
          </button>
        </Tooltip>
      </div>

      {/* Тонкая нижняя полоса телеметрии обратного отсчета */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 overflow-hidden pointer-events-none">
          <div
            className={`h-full transition-all duration-75 ease-linear ${config.progressBarClass}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      title?: string,
      duration = 4500,
      action?: ToastAction
    ) => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
      const timestamp = formatCurrentTime();

      setToasts((prev) => {
        const nextToasts = [...prev, { id, message, type, title, timestamp, duration, action }];
        // Ограничиваем количество одновременных уведомлений до 4
        if (nextToasts.length > 4) {
          return nextToasts.slice(nextToasts.length - 4);
        }
        return nextToasts;
      });
    },
    []
  );

  const showError = useCallback(
    (message: string, title?: string, duration?: number, action?: ToastAction) =>
      showToast(message, 'error', title, duration, action),
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title?: string, duration?: number, action?: ToastAction) =>
      showToast(message, 'warning', title, duration, action),
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string, title?: string, duration?: number, action?: ToastAction) =>
      showToast(message, 'success', title, duration, action),
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title?: string, duration?: number, action?: ToastAction) =>
      showToast(message, 'info', title, duration, action),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showError,
        showWarning,
        showSuccess,
        showInfo,
        removeToast,
        clearAllToasts,
      }}
    >
      {children}

      {/* Контейнер для всплывающих уведомлений в правом верхнем углу */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[9999] flex flex-col gap-2.5 max-w-[calc(100vw-32px)] sm:max-w-[420px] w-full pointer-events-none select-none items-end">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast должен использоваться внутри ToastProvider');
  }
  return context;
}
