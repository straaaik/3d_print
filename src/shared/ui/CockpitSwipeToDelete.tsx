'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'motion/react';
import { ChevronsRight, Trash2, Loader2 } from 'lucide-react';

export interface CockpitSwipeToDeleteProps {
  onConfirm: () => void | Promise<void>;
  label?: string;
  confirmingLabel?: string;
  isPending?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CockpitSwipeToDelete({
  onConfirm,
  label = 'Удаление',
  confirmingLabel = 'УДАЛЕНИЕ...',
  isPending = false,
  disabled = false,
  className = '',
}: CockpitSwipeToDeleteProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const [maxDrag, setMaxDrag] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const x = useMotionValue(0);

  // Измерение доступной дистанции для свайпа
  const updateDimensions = useCallback(() => {
    if (!trackRef.current || !thumbRef.current) return;
    const trackWidth = trackRef.current.clientWidth;
    const thumbWidth = thumbRef.current.clientWidth;
    // 8px - суммарный внутренний отступ трека (p-1 = 4px с каждой стороны)
    const available = Math.max(0, trackWidth - thumbWidth - 8);
    setMaxDrag(available);
  }, []);

  useEffect(() => {
    updateDimensions();
    const ro = new ResizeObserver(() => updateDimensions());
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, [updateDimensions]);

  // Сброс при отмене или смене состояния ожидания
  useEffect(() => {
    if (!isPending && !disabled && isConfirmed) {
      const timeout = setTimeout(() => {
        setIsConfirmed(false);
        animate(x, 0, { type: 'spring', stiffness: 450, damping: 32 });
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isPending, disabled, isConfirmed, x]);

  // Вычисляемые стили на основе положения ползунка
  const fillWidth = useTransform(x, (currentX) => {
    const thumbOffset = thumbRef.current?.clientWidth || 44;
    return `${Math.max(0, currentX + thumbOffset + 4)}px`;
  });

  const labelOpacity = useTransform(x, [0, Math.max(1, maxDrag * 0.65)], [1, 0]);

  const handleDragStart = () => {
    if (disabled || isPending || isConfirmed) return;
    setIsDragging(true);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    if (disabled || isPending || isConfirmed || maxDrag <= 0) return;

    const currentX = x.get();
    const threshold = maxDrag * 0.82;
    const isFlickFast = info.velocity.x > 350 && currentX > maxDrag * 0.35;

    if (currentX >= threshold || isFlickFast) {
      // Достигнут порог подтверждения
      setIsConfirmed(true);
      animate(x, maxDrag, { type: 'spring', stiffness: 500, damping: 30 });

      try {
        const result = onConfirm();
        if (result instanceof Promise) {
          result.catch(() => {
            // При ошибке возвращаем ползунок назад
            setIsConfirmed(false);
            animate(x, 0, { type: 'spring', stiffness: 450, damping: 32 });
          });
        }
      } catch {
        setIsConfirmed(false);
        animate(x, 0, { type: 'spring', stiffness: 450, damping: 32 });
      }
    } else {
      // Не дотянули до конца — кинематографичный пружинный отскок на старт
      animate(x, 0, { type: 'spring', stiffness: 450, damping: 32 });
    }
  };

  // Поддержка клавиатуры (Enter / Space / Стрелка вправо для доступности)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || isPending || isConfirmed) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsConfirmed(true);
      animate(x, maxDrag, { type: 'spring', stiffness: 500, damping: 30 });
      onConfirm();
    }
  };

  const isBusy = isPending || isConfirmed;

  return (
    <div
      ref={trackRef}
      className={`relative h-12 w-full select-none overflow-hidden rounded-xl border border-rose-500/30 bg-neutral-950/80 p-1 font-mono shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-md ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      role="slider"
      aria-label="Свайп для подтверждения удаления"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={maxDrag > 0 ? Math.round((x.get() / maxDrag) * 100) : 0}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      {/* Динамическая заливка трека при свайпе */}
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-rose-950/40 via-rose-600/30 to-rose-500/40 border-r border-rose-500/60"
        style={{ width: fillWidth }}
      />

      {/* Текстовая подсказка в центре трека */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-12 text-center"
        style={{ opacity: isBusy ? 0 : labelOpacity }}
      >
        <span className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wide text-rose-300/90">
          {label}
        </span>
      </motion.div>

      {/* Текст во время выполнения / подтверждения */}
      {isBusy && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-12 text-center">
          <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-rose-400 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {confirmingLabel}
          </span>
        </div>
      )}

      {/* Подвижный ползунок (Thumb / Puck) */}
      <motion.div
        ref={thumbRef}
        drag={disabled || isBusy ? false : 'x'}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.06}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: 'none' }}
        className={`relative z-10 flex h-10 w-12 shrink-0 items-center justify-center rounded-lg border border-rose-400/40 bg-rose-600 text-white shadow-[0_2px_10px_rgba(225,29,72,0.4)] transition-colors ${
          disabled || isBusy
            ? 'cursor-not-allowed opacity-90'
            : isDragging
            ? 'cursor-grabbing bg-rose-500 border-rose-300'
            : 'cursor-grab hover:bg-rose-500 hover:border-rose-300'
        }`}
      >
        {isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : isDragging ? (
          <Trash2 className="h-4 w-4 text-white animate-pulse" />
        ) : (
          <div className="flex items-center justify-center gap-0.5">
            <ChevronsRight className="h-4 w-4 text-white" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
