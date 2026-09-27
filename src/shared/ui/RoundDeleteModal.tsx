'use client';

import React, { useEffect, useRef, useState, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { AlertTriangle, Check, X } from 'lucide-react';

export interface RoundDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: React.ReactNode;
  itemName?: React.ReactNode;
  itemDetails?: React.ReactNode;
  description?: React.ReactNode;
  holdDurationMs?: number;
  isDeleting?: boolean;
  children?: React.ReactNode;
}

interface RadiatingWaveProps {
  delay: number;
  duration?: number;
  isHolding?: boolean;
}

const RadiatingWave = React.memo(function RadiatingWave({
  delay,
  duration = 2.4,
  isHolding = false,
}: RadiatingWaveProps) {
  const currentDuration = isHolding ? 0.8 : duration;
  const currentDelay = isHolding ? delay * (0.8 / 2.4) : delay;

  return (
    <motion.div
      className="absolute inset-0 rounded-full border border-rose-500/35 pointer-events-none"
      initial={{ scale: 1, opacity: 0 }}
      animate={{
        scale: [1, 1.46],
        opacity: [0, 0.45, 0],
      }}
      transition={{
        duration: currentDuration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: currentDelay,
        times: [0, 0.35, 1],
      }}
      style={{ willChange: 'transform, opacity' }}
    />
  );
});

const RadiatingWaves = React.memo(function RadiatingWaves({
  isHolding = false,
}: {
  isHolding?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 m-auto w-[280px] sm:w-[320px] aspect-square pointer-events-none flex items-center justify-center z-0"
    >
      <RadiatingWave delay={0} duration={2.4} isHolding={isHolding} />
      <RadiatingWave delay={0.8} duration={2.4} isHolding={isHolding} />
      <RadiatingWave delay={1.6} duration={2.4} isHolding={isHolding} />
    </div>
  );
});

export function RoundDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Подтверждение удаления',
  itemName = 'Выбранная запись',
  itemDetails,
  description = 'Вы действительно хотите удалить эту запись? Действие необратимо.',
  holdDurationMs = 1800,
  isDeleting = false,
  children,
}: RoundDeleteModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  // Режим выхода: 'confirm' (зелёный круг, галочка) или 'cancel' (оранжевый круг, крестик)
  const [exitMode, setExitMode] = useState<'confirm' | 'cancel' | null>(null);

  const progress = useMotionValue(0);
  const animRef = useRef<any>(null);
  const titleId = useId();
  const orbitPathId = useId();

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  // Закрытие (отмена) с оранжевой анимацией крестика и быстрой имплозией
  const handleClose = useCallback(() => {
    if (isDeleting || exitMode) return;
    if (animRef.current) animRef.current.stop();
    setIsHolding(false);
    setExitMode('cancel');

    setTimeout(() => {
      onCloseRef.current();
    }, 520);
  }, [isDeleting, exitMode]);

  // Сброс состояния при открытии/закрытии
  useEffect(() => {
    if (!isOpen) {
      setIsHovered(false);
      setIsHolding(false);
      setIsConfirmed(false);
      setExitMode(null);
      if (animRef.current) animRef.current.stop();
      progress.set(0);
    }
  }, [isOpen, progress]);

  // Закрытие по клавише Escape (запускает оранжевую анимацию закрытия)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleClose]);

  // Блокировка прокрутки страницы
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Начало удержания — нарастание прогресса с бархатной кривой
  const startHold = () => {
    if (isDeleting || isConfirmed || exitMode) return;
    setIsHolding(true);

    if (animRef.current) animRef.current.stop();

    animRef.current = animate(progress, 1, {
      duration: holdDurationMs / 1000,
      ease: [0.4, 0, 0.2, 1],
      onComplete: () => {
        setIsConfirmed(true);
        setIsHolding(false);
        // Активируем взрывную анимацию уничтожения
        setExitMode('confirm');

        setTimeout(async () => {
          try {
            const res = onConfirmRef.current();
            if (res instanceof Promise) {
              await res;
            }
            onCloseRef.current();
          } catch {
            setIsConfirmed(false);
            setExitMode(null);
            progress.set(0);
          }
        }, 520);
      },
    });
  };

  // Преждевременное отпускание — плавный откат к центру
  const cancelHold = () => {
    if (isConfirmed || exitMode || !isHolding) return;
    setIsHolding(false);
    if (animRef.current) animRef.current.stop();

    animate(progress, 0, { duration: 0.35, ease: [0.25, 1, 0.5, 1] });
  };

  const isExiting = Boolean(exitMode);
  const isConfirmExit = exitMode === 'confirm';
  const isCancelExit = exitMode === 'cancel';

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none overflow-hidden font-mono">
          {/* 1. Бэкдроп с кинематографичным затемнением и размытием */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
          />

          {/* 2. Внешняя оболочка модального окна (пружинный вход и сворачивание при закрытии) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 16, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{
              opacity: 0,
              scale: 0.82,
              y: 8,
              filter: 'blur(8px)',
              transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
            }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Волны, излучаемые наружу в синхронном такте (скрываются при выходе) */}
            {!isExiting && <RadiatingWaves isHolding={isHolding} />}

            {/* Мягкий пульсирующий ореол за окном */}
            <motion.div
              aria-hidden="true"
              className={`absolute inset-0 m-auto w-[280px] sm:w-[320px] aspect-square rounded-full blur-2xl pointer-events-none z-0 transition-colors duration-300 ease-out ${
                isConfirmExit
                  ? 'bg-emerald-500/40'
                  : isCancelExit
                  ? 'bg-amber-500/40'
                  : 'bg-rose-600/20'
              }`}
              animate={{
                opacity: isExiting ? 0 : isHolding ? 0.6 : [0.16, 0.36, 0.16],
                scale: isExiting ? [1, 1.4, 0] : isHolding ? 1.06 : [1, 1.03, 1],
              }}
              transition={{
                duration: isExiting ? 0.52 : isHolding ? 0.45 : 2.4,
                repeat: isExiting ? 0 : Infinity,
                ease: 'easeInOut',
              }}
              style={{ willChange: 'transform, opacity' }}
            />

            {/* ЭФФЕКТЫ ИМПЛОЗИИ: УДАРНАЯ ВОЛНА И ДИСПЕРСИЯ ИСКР */}
            {isExiting && (
              <>
                {/* Взрывная ударная волна: яркое кольцо с размытием молниеносно расширяется наружу (scale: 2.5, угасание opacity) */}
                <motion.div
                  className={`absolute inset-0 m-auto rounded-full border-2 pointer-events-none z-30 ${
                    isConfirmExit
                      ? 'border-emerald-400 shadow-[0_0_20px_#10b981]'
                      : 'border-amber-400 shadow-[0_0_20px_#f59e0b]'
                  }`}
                  initial={{ scale: 0.9, opacity: 1 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.div
                  className={`absolute inset-0 m-auto rounded-full blur-xl pointer-events-none z-30 ${
                    isConfirmExit ? 'bg-emerald-500/40' : 'bg-amber-500/40'
                  }`}
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 0.48, ease: 'easeOut' }}
                />
                {/* Радиальные искры: 8 микро-частиц дисперсии разлетаются по лучам под углами 45° */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const angle = (i * 45 * Math.PI) / 180;
                  const x = Math.cos(angle) * 165;
                  const y = Math.sin(angle) * 165;
                  return (
                    <motion.div
                      key={i}
                      className={`absolute w-1.5 h-1.5 rounded-full pointer-events-none z-30 ${
                        isConfirmExit
                          ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                          : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                      }`}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x, y, opacity: 0, scale: 0.2 }}
                      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                    />
                  );
                })}
              </>
            )}

            {/* 3. САМО МОДАЛЬНОЕ ОКНО */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              animate={
                isExiting
                  ? {
                      scale: [1, 1.1, 0],
                      x: isConfirmExit ? [0, 24, 0] : [0, -24, 0],
                      y: isConfirmExit ? [0, -24, 0] : [0, 24, 0],
                      rotate: isConfirmExit ? [0, 8, -16] : [0, -8, 16],
                      opacity: [1, 1, 0],
                      filter: ['blur(0px)', 'blur(3px)', 'blur(18px)'],
                    }
                  : {
                      scale: isHolding
                        ? [0.985, 1.025, 0.985]
                        : [1, 1.016, 0.992, 1.016, 0.992, 1.016, 1],
                      borderColor: isHolding
                        ? ['rgba(244,63,94,0.45)', 'rgba(244,63,94,0.7)', 'rgba(244,63,94,0.45)']
                        : [
                            'rgba(244,63,94,0.28)',
                            'rgba(244,63,94,0.42)',
                            'rgba(244,63,94,0.28)',
                            'rgba(244,63,94,0.42)',
                            'rgba(244,63,94,0.28)',
                            'rgba(244,63,94,0.42)',
                            'rgba(244,63,94,0.28)',
                          ],
                    }
              }
              transition={
                isExiting
                  ? { duration: 0.52, ease: [0.36, 0, 0.66, -0.56] }
                  : {
                      duration: isHolding ? 0.45 : 2.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      times: isHolding ? [0, 0.5, 1] : [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1],
                    }
              }
              style={{ willChange: 'transform, opacity, filter' }}
              onPointerDown={startHold}
              onPointerUp={cancelHold}
              onPointerCancel={cancelHold}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => {
                setIsHovered(false);
                cancelHold();
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  if (!isHolding) startHold();
                }
              }}
              onKeyUp={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  cancelHold();
                }
              }}
              className={`relative w-[280px] sm:w-[320px] aspect-square rounded-full border shadow-[0_25px_90px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl overflow-hidden z-10 flex flex-col items-center justify-center p-6 text-center touch-none transition-all duration-300 ease-out ${
                isConfirmExit
                  ? 'border-emerald-500/70 shadow-[0_0_35px_rgba(16,185,129,0.3)]'
                  : isCancelExit
                  ? 'border-amber-500/70 shadow-[0_0_35px_rgba(245,158,11,0.3)]'
                  : 'border-rose-500/28 hover:border-rose-500/45'
              } ${
                isExiting || isConfirmed
                  ? 'cursor-default'
                  : isHolding
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
              }`}
            >
              {/* Фоновые градиенты с мягким cross-fade переходом */}
              <div className="absolute inset-0 bg-[#080203] pointer-events-none" />
              <div
                className={`absolute inset-0 bg-gradient-to-b from-[#1a0709]/95 via-[#120406]/98 to-[#080203]/99 pointer-events-none transition-opacity duration-300 ease-out ${
                  isExiting ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <div
                className={`absolute inset-0 bg-gradient-to-b from-[#04140b]/98 via-[#020b06]/99 to-[#010503] pointer-events-none transition-opacity duration-300 ease-out ${
                  isConfirmExit ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <div
                className={`absolute inset-0 bg-gradient-to-b from-[#1c1205]/98 via-[#130d04]/99 to-[#0a0702] pointer-events-none transition-opacity duration-300 ease-out ${
                  isCancelExit ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Вращающиеся по контуру надписи на орбите */}
              <svg
                viewBox="0 0 320 320"
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                aria-hidden="true"
              >
                <defs>
                  <path
                    id={orbitPathId}
                    d="M 160, 160 m -147, 0 a 147,147 0 1,1 294,0 a 147,147 0 1,1 -294,0"
                  />
                </defs>
                <motion.g
                  animate={{
                    rotate: isExiting
                      ? (isConfirmExit ? 720 : -720)
                      : 360,
                  }}
                  transition={{
                    duration: isExiting ? 0.52 : (isHolding ? 10 : 28),
                    repeat: isExiting ? 0 : Infinity,
                    ease: isExiting ? 'easeIn' : 'linear',
                  }}
                  style={{ transformOrigin: '160px 160px' }}
                >
                  <text
                    className={`text-[8px] font-mono tracking-widest uppercase select-none transition-colors duration-300 ease-out ${
                      isConfirmExit
                        ? 'fill-emerald-400/70'
                        : isCancelExit
                        ? 'fill-amber-400/70'
                        : 'fill-neutral-400/40'
                    }`}
                  >
                    <textPath
                      href={`#${orbitPathId}`}
                      startOffset="0%"
                      textLength="920"
                      lengthAdjust="spacing"
                    >
                      {isConfirmExit
                        ? 'CONFIRMED • DELETED • COMPLETED • CONFIRMED • DELETED • COMPLETED • '
                        : isCancelExit
                        ? 'CANCELLED • ABORTED • CLOSED • CANCELLED • ABORTED • CLOSED • '
                        : 'DANGER • DANGER • DANGER • DANGER • DANGER • DANGER • DANGER • DANGER • '}
                    </textPath>
                  </text>
                </motion.g>
              </svg>

              {/* Радиальное заполнение круга при удержании или выходе с плавным переходом цветов */}
              <motion.div
                className="absolute inset-0 m-auto w-full h-full rounded-full pointer-events-none origin-center flex items-center justify-center"
                style={{ scale: isExiting ? 1 : progress }}
              >
                {/* Rose radial */}
                <div
                  className={`absolute inset-2 rounded-full blur-xl bg-rose-600/50 transition-opacity duration-300 ease-out ${
                    isExiting ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <div
                  className={`absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.65)_0%,rgba(225,29,72,0.5)_50%,rgba(244,63,94,0.3)_75%,transparent_96%)] transition-opacity duration-300 ease-out ${
                    isExiting ? 'opacity-0' : 'opacity-100'
                  }`}
                />

                {/* Emerald radial */}
                <div
                  className={`absolute inset-2 rounded-full blur-xl bg-emerald-500/50 transition-opacity duration-300 ease-out ${
                    isConfirmExit ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <div
                  className={`absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.7)_0%,rgba(5,150,105,0.5)_50%,rgba(4,120,87,0.3)_75%,transparent_96%)] transition-opacity duration-300 ease-out ${
                    isConfirmExit ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {/* Amber radial */}
                <div
                  className={`absolute inset-2 rounded-full blur-xl bg-amber-500/50 transition-opacity duration-300 ease-out ${
                    isCancelExit ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <div
                  className={`absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.7)_0%,rgba(217,119,6,0.5)_50%,rgba(180,83,9,0.3)_75%,transparent_96%)] transition-opacity duration-300 ease-out ${
                    isCancelExit ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </motion.div>

              {/* ЗНАЧОК НА ФОНЕ — ПЛАВНЫЙ МОРФИНГ ТОЧНО ПО ЦЕНТРУ БЕЗ СМЕЩЕНИЙ */}
              <div className="absolute inset-0 pointer-events-none z-0">
                <AnimatePresence>
                  {isConfirmExit ? (
                    <motion.div
                      key="confirm-check"
                      initial={{ scale: 0.35, rotate: -35, opacity: 0, filter: 'blur(8px)' }}
                      animate={{ scale: 1, rotate: 0, opacity: 0.65, filter: 'blur(0px)' }}
                      exit={{ scale: 0.3, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 flex items-center justify-center text-emerald-400"
                    >
                      <Check className="w-44 h-44 sm:w-48 sm:h-48 stroke-[1.8]" />
                    </motion.div>
                  ) : isCancelExit ? (
                    <motion.div
                      key="cancel-cross"
                      initial={{ scale: 0.35, rotate: 35, opacity: 0, filter: 'blur(8px)' }}
                      animate={{ scale: 1, rotate: 0, opacity: 0.65, filter: 'blur(0px)' }}
                      exit={{ scale: 0.3, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 flex items-center justify-center text-amber-400"
                    >
                      <X className="w-44 h-44 sm:w-48 sm:h-48 stroke-[1.8]" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="hazard-triangle"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        color: '#f43f5e',
                        opacity: isHolding ? 0.42 : isHovered ? 0.25 : 0.1,
                        scale: isHolding ? 1.05 : 1,
                      }}
                      exit={{
                        scale: 0.55,
                        rotate: 15,
                        opacity: 0,
                        filter: 'blur(8px)',
                      }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 flex items-center justify-center text-rose-500"
                    >
                      <AlertTriangle className="w-44 h-44 sm:w-48 sm:h-48 stroke-[1.2]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Информация об удалении в центре круга */}
              <div className="relative z-20 flex flex-col items-center justify-center space-y-2 max-w-[210px] sm:max-w-[230px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {title && (
                  <span
                    id={titleId}
                    className={`text-[9px] uppercase tracking-widest font-mono font-semibold transition-colors duration-300 ease-out ${
                      isConfirmExit
                        ? 'text-emerald-300'
                        : isCancelExit
                        ? 'text-amber-300'
                        : 'text-rose-300/85'
                    }`}
                  >
                    {isConfirmExit
                      ? 'ДЕЙСТВИЕ ПОДТВЕРЖДЕНО'
                      : isCancelExit
                      ? 'ДЕЙСТВИЕ ОТМЕНЕНО'
                      : title}
                  </span>
                )}

                <div className="text-sm sm:text-base font-bold text-white leading-snug break-words">
                  {itemName}
                </div>

                {itemDetails && (
                  <div
                    className={`text-[11px] font-mono transition-colors duration-300 ease-out ${
                      isConfirmExit
                        ? 'text-emerald-200/90'
                        : isCancelExit
                        ? 'text-amber-200/90'
                        : 'text-rose-200/80'
                    }`}
                  >
                    {itemDetails}
                  </div>
                )}

                {description && !isExiting && (
                  <div className="text-[10px] text-neutral-300 font-sans leading-relaxed pt-0.5">
                    {description}
                  </div>
                )}

                {children && !isExiting && (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-left pt-1"
                  >
                    {children}
                  </div>
                )}

                {/* Статус-индикатор */}
                <div
                  className={`h-4 flex items-center justify-center text-[8.5px] font-mono uppercase tracking-widest transition-colors duration-300 ease-out ${
                    isConfirmExit
                      ? 'text-emerald-300'
                      : isCancelExit
                      ? 'text-amber-300'
                      : 'text-rose-400/80'
                  }`}
                >
                  {isConfirmExit
                    ? 'УНИЧТОЖЕНИЕ...'
                    : isCancelExit
                    ? 'ОТМЕНА ДЕЙСТВИЯ...'
                    : isHolding
                    ? 'УДЕРЖАНИЕ...'
                    : null}
                </div>

                {/* Анимированный центральный бейдж с галочкой (зеленый) или крестиком (оранжевый) */}
                <AnimatePresence>
                  {isConfirmExit ? (
                    <motion.div
                      key="status-confirmed"
                      initial={{ opacity: 0, scale: 0.6, y: 6 }}
                      animate={{ opacity: 1, scale: 1.05, y: 0 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="pt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider font-mono"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-200 stroke-[3]" />
                      <span>УДАЛЕНО</span>
                    </motion.div>
                  ) : isCancelExit ? (
                    <motion.div
                      key="status-cancelled"
                      initial={{ opacity: 0, scale: 0.6, y: 6 }}
                      animate={{ opacity: 1, scale: 1.05, y: 0 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="pt-1 flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider font-mono"
                    >
                      <X className="w-3.5 h-3.5 text-amber-200 stroke-[3]" />
                      <span>ОТМЕНЕНО</span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.div>
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
