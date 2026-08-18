'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      const nextToasts = [...prev, { id, message, type, title }];
      // Если уведомлений больше 3, автоматически удаляем самое первое (старое)
      if (nextToasts.length > 3) {
        return nextToasts.slice(nextToasts.length - 3);
      }
      return nextToasts;
    });

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const showError = useCallback((message: string, title?: string) => showToast(message, 'error', title), [showToast]);
  const showWarning = useCallback((message: string, title?: string) => showToast(message, 'warning', title), [showToast]);
  const showSuccess = useCallback((message: string, title?: string) => showToast(message, 'success', title), [showToast]);
  const showInfo = useCallback((message: string, title?: string) => showToast(message, 'info', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showError, showWarning, showSuccess, showInfo }}>
      {children}

      {/* Контейнер для всплывающих уведомлений (Toasts) в правом нижнем углу */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const getStyles = () => {
              switch (toast.type) {
                case 'error':
                  return {
                    bg: 'bg-[#1c1315]/95 border-red-500/50 text-red-200 shadow-red-500/20',
                    icon: AlertCircle,
                    iconColor: 'text-red-400',
                  };
                case 'warning':
                  return {
                    bg: 'bg-[#1e1a12]/95 border-amber-500/50 text-amber-200 shadow-amber-500/20',
                    icon: AlertTriangle,
                    iconColor: 'text-amber-400',
                  };
                case 'success':
                  return {
                    bg: 'bg-[#121c17]/95 border-emerald-500/50 text-emerald-200 shadow-emerald-500/20',
                    icon: CheckCircle2,
                    iconColor: 'text-emerald-400',
                  };
                default:
                  return {
                    bg: 'bg-[#121722]/95 border-blue-500/50 text-blue-200 shadow-blue-500/20',
                    icon: Info,
                    iconColor: 'text-blue-400',
                  };
              }
            };

            const styles = getStyles();
            const IconComp = styles.icon;

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl ${styles.bg}`}
              >
                <div className={`p-1.5 rounded-xl bg-black/30 shrink-0 ${styles.iconColor}`}>
                  <IconComp size={18} />
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  {toast.title && (
                    <h4 className="text-xs font-bold text-white mb-0.5 tracking-wide">
                      {toast.title}
                    </h4>
                  )}
                  <p className="text-xs text-gray-300 leading-relaxed font-medium">
                    {toast.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                  title="Закрыть"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
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
