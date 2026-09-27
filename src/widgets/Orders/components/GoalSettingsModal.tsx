'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RotateCcw } from 'lucide-react';
import { formatMoney } from '../helpers';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { AnimatedPriceNumber } from '../../../shared/ui/AnimatedPriceNumber';
import { CockpitButton } from '../../../shared/ui/CockpitButton';

interface GoalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: number;
  selectedMonthKey: string;
  monthLabel: string;
  onSave: (targetAmount: number, applyToAllMonths: boolean) => void;
  currentProfit?: number;
}

const PRESET_AMOUNTS = [30000, 50000, 100000, 150000, 200000, 300000, 500000];

function WaveFill({ percent }: { percent: number }) {
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <motion.div
      className="absolute top-0 bottom-0 left-0 overflow-hidden pointer-events-none z-0"
      initial={false}
      animate={{ width: `${clampedPercent}%` }}
      transition={{ type: 'spring', stiffness: 140, damping: 22 }}
    >
      {/* Сплошной неброский серовато-зеленый фон без градиента */}
      <div className="absolute inset-0 bg-[#23332b]" />

      {/* Волна 1 (плавное горизонтальное движение) */}
      <motion.div
        className="absolute inset-y-0 left-0 w-[200%] flex opacity-30 pointer-events-none"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'linear' }}
      >
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 60">
          <path
            d="M 0 30 Q 100 12 200 30 T 400 30 T 600 30 T 800 30 L 800 60 L 0 60 Z"
            fill="#33463b"
          />
        </svg>
      </motion.div>

      {/* Волна 2 (встречное мягкое смещение для эффекта естественного колыхания) */}
      <motion.div
        className="absolute inset-y-0 left-0 w-[200%] flex opacity-20 pointer-events-none"
        animate={{ x: ['-50%', '0%'] }}
        transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
      >
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 60">
          <path
            d="M 0 35 Q 100 48 200 35 T 400 35 T 600 35 T 800 35 L 800 60 L 0 60 Z"
            fill="#3d5447"
          />
        </svg>
      </motion.div>

      {/* Тонкая разделительная кромка на фронте заполнения */}
      {clampedPercent > 0 && clampedPercent < 100 && (
        <div className="absolute right-0 top-0 bottom-0 w-[1.5px] bg-[#4a6354]/60" />
      )}
    </motion.div>
  );
}

function HandDrawnUnderline({
  isSelected,
  color = 'white',
}: {
  isSelected: boolean;
  color?: string;
}) {
  return (
    <AnimatePresence>
      {isSelected && (
        <motion.svg
          className="absolute -bottom-1 left-0 w-full h-[6px] pointer-events-none overflow-visible z-10"
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.path
            d="M 1,4 C 25,6.5 75,2.5 99,5"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              visible: {
                pathLength: 1,
                opacity: 1,
                transition: {
                  pathLength: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
                  opacity: { duration: 0.08 },
                },
              },
              exit: {
                pathLength: 0,
                opacity: 0,
                transition: {
                  pathLength: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 0.08 },
                },
              },
            }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}

type GoalSettingsModalContentProps = Omit<GoalSettingsModalProps, 'isOpen'>;

function GoalSettingsModalContent({
  onClose,
  currentGoal,
  selectedMonthKey,
  monthLabel,
  onSave,
  currentProfit = 0,
}: GoalSettingsModalContentProps) {
  const [goalAmount, setGoalAmount] = useState<string>(
    currentGoal > 0 ? String(currentGoal) : ''
  );
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Живые часы в шапке
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      setCurrentTimeStr(`${hours}:${mins}:${secs} MSK`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const numericGoal = useMemo(() => {
    return Number(goalAmount.replace(/\D/g, '') || 0);
  }, [goalAmount]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSave(numericGoal, selectedMonthKey === 'all');
    onClose();
  };

  const safeProfit = Math.max(0, currentProfit);
  const progressPercent = numericGoal > 0 ? Math.min(100, (safeProfit / numericGoal) * 100) : 0;
  const isGoalReached = numericGoal > 0 && safeProfit >= numericGoal;
  const goalRemaining = numericGoal > 0 ? Math.max(0, numericGoal - safeProfit) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none overflow-hidden font-mono">
          {/* Стеклянный темный бэкдроп */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
          />

          {/* Главное окно консоли в стиле Meridian Cockpit */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-modal-title"
            className="relative w-full max-w-[640px] rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden z-10 flex flex-col font-mono"
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

                <div className="flex items-center gap-2 font-mono text-xs text-neutral-300 min-w-0">
                  <span id="goal-modal-title" className="text-neutral-300 font-normal truncate">
                    Финансовая цель
                  </span>
                  <span className="text-[#52525b] shrink-0">·</span>
                  <span className="text-[#71717a] hidden sm:inline truncate">
                    {selectedMonthKey === 'all' ? 'Все месяцы' : monthLabel}
                  </span>
                </div>
              </div>

              {/* Правая часть: Только системное время */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="font-mono text-xs text-[#71717a] tabular-nums">
                  {currentTimeStr}
                </div>
              </div>
            </div>

            {/* 2. Тело модального окна */}
            <form onSubmit={handleSave} className="p-5 sm:p-6 bg-[#18181c] space-y-5 font-mono">

              {/* Поле ввода целевой суммы */}
              <div className="space-y-2 select-none">
                <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                  <span>ЦЕЛЕВАЯ ЧИСТАЯ ПРИБЫЛЬ</span>
                  {currentGoal > 0 && (
                    <span className="text-neutral-400 font-normal lowercase">
                      текущая: {formatMoney(currentGoal)}
                    </span>
                  )}
                </div>

                <div className="relative overflow-hidden flex items-center justify-between p-3.5 rounded-xl bg-[#141416]/90 border border-[#26262b] focus-within:border-white/40">
                  {/* Волновой серовато-зеленый слой заполнения */}
                  <WaveFill percent={progressPercent} />

                  <input
                    type="text"
                    inputMode="numeric"
                    value={goalAmount ? Number(goalAmount).toLocaleString('ru-RU') : ''}
                    onChange={(e) => {
                      const numericOnly = e.target.value.replace(/\D/g, '');
                      setGoalAmount(numericOnly);
                    }}
                    placeholder="0"
                    autoFocus
                    className="relative z-10 bg-transparent border-none focus:outline-none p-0 text-2xl sm:text-3xl font-light font-mono text-white placeholder-[#52525b] w-full tracking-tight"
                  />

                  {(numericGoal > 0 || currentGoal > 0) && (
                    <button
                      type="button"
                      onClick={() => setGoalAmount('0')}
                      title="Сбросить цель"
                      className="relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-xs font-mono text-[#71717a] hover:text-rose-400 cursor-pointer select-none transition-colors shrink-0 mr-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="hidden sm:inline">Сбросить цель</span>
                      <span className="sm:hidden">Сбросить</span>
                    </button>
                  )}

                  <div className="relative z-10 text-xl sm:text-2xl font-light text-[#71717a] font-mono select-none pl-1">
                    ₽
                  </div>
                </div>
              </div>

              {/* Быстрые пресеты планки без текстового заголовка */}
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap select-none pt-0.5">
                {PRESET_AMOUNTS.map((amt) => {
                  const isSelected = numericGoal === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setGoalAmount(String(amt))}
                      className={`py-0.5 text-xs font-mono cursor-pointer ${
                        isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                      }`}
                    >
                      <span className="relative inline-block">
                        <span>{(amt / 1000).toLocaleString('ru-RU')}k ₽</span>
                        <HandDrawnUnderline isSelected={isSelected} />
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 2 Нижних тайла телеметрии (Текущая прибыль с прогрессом и Осталось) */}
              <div className="pt-2 border-t border-[#26262b]">
                <div className="grid grid-cols-2 gap-2">
                  {/* Тайл 1: Текущая прибыль */}
                  <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2.5 font-mono">
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">
                        ТЕКУЩАЯ ПРИБЫЛЬ
                      </div>
                      {numericGoal > 0 && (
                        <div className="text-xs font-mono text-neutral-400 font-normal">
                          {Math.round(progressPercent)}%
                        </div>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 mt-1">
                      <AnimatedPriceNumber
                        value={currentProfit}
                        showPositiveSign={currentProfit > 0}
                        className="text-base sm:text-lg font-light text-emerald-400"
                        currencyClassName="text-emerald-400/80 font-normal ml-0.5"
                      />
                    </div>
                  </div>

                  {/* Тайл 2: Осталось */}
                  <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2.5 font-mono">
                    <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">
                      ОСТАЛОСЬ
                    </div>
                    <div className="flex items-baseline gap-1 mt-1 min-h-[28px]">
                      <AnimatePresence mode="wait">
                        {numericGoal === 0 ? (
                          <motion.span
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-base sm:text-lg font-light text-[#71717a]"
                          >
                            —
                          </motion.span>
                        ) : isGoalReached ? (
                          <motion.span
                            key="reached"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="text-base sm:text-lg font-light text-emerald-400 truncate"
                          >
                            Достигнута
                          </motion.span>
                        ) : (
                          <motion.div
                            key="remaining"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <AnimatedPriceNumber
                              value={goalRemaining}
                              className="text-base sm:text-lg font-light text-white truncate"
                              currencyClassName="text-neutral-400 font-normal ml-0.5"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>

            </form>

            {/* 3. Нижняя панель действий */}
            <div className="flex items-center justify-end border-t border-white/10 px-5 py-3 bg-neutral-900/60 font-mono text-xs shrink-0">
              <CockpitButton
                type="button"
                onClick={() => handleSave()}
                icon={Check}
              >
                Сохранить цель
              </CockpitButton>
            </div>

          </motion.div>
    </div>
  );
}

export function GoalSettingsModal({ isOpen, ...contentProps }: GoalSettingsModalProps) {
  const formKey = `${contentProps.selectedMonthKey}:${contentProps.currentGoal}`;

  return (
    <AnimatePresence>
      {isOpen && <GoalSettingsModalContent key={formKey} {...contentProps} />}
    </AnimatePresence>
  );
}
