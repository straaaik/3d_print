'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RotateCcw } from 'lucide-react';
import { formatMoney } from '../helpers';
import { Tooltip } from '../../../shared/ui/Tooltip';

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
  const [applyToAllMonths, setApplyToAllMonths] = useState<boolean>(
    selectedMonthKey === 'all'
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
    onSave(numericGoal, applyToAllMonths || selectedMonthKey === 'all');
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
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
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

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141416]/90 border border-[#26262b] focus-within:border-white/40 ">
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
                    className="bg-transparent border-none focus:outline-none p-0 text-2xl sm:text-3xl font-light font-mono text-white placeholder-[#52525b] w-full tracking-tight"
                  />
                  <div className="text-xl sm:text-2xl font-light text-[#71717a] font-mono select-none pl-3">
                    ₽
                  </div>
                </div>
              </div>

              {/* Быстрые пресеты планки */}
              <div className="space-y-2 select-none">
                <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                  БЫСТРЫЙ ВЫБОР ПЛАНКИ
                </div>
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap pt-0.5">
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
              </div>

              {/* Опция: сделать целью по умолчанию для всех месяцев */}
              {selectedMonthKey !== 'all' && (
                <div className="pt-2 border-t border-[#26262b]">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={applyToAllMonths}
                      onChange={(e) => setApplyToAllMonths(e.target.checked)}
                      className="w-4 h-4 rounded bg-[#121214] border-white/20 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs text-[#a1a1aa] group-hover:text-white ">
                      Сделать эту сумму целью по умолчанию для всех месяцев
                    </span>
                  </label>
                </div>
              )}

              {/* 4 Нижних тайла телеметрии (в стиле OrderFormModal) */}
              <div className="space-y-2 pt-2 border-t border-[#26262b]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Тайл 1: Текущая прибыль */}
                  <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2.5 font-mono">
                    <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">
                      ТЕКУЩАЯ ПРИБЫЛЬ
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-base sm:text-lg font-light text-emerald-400">
                        {currentProfit >= 0 ? `+${formatMoney(currentProfit)}` : formatMoney(currentProfit)}
                      </span>
                    </div>
                  </div>

                  {/* Тайл 2: Целевая планка */}
                  <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2.5 font-mono">
                    <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">
                      ЦЕЛЬ ПЕРИОДА
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-base sm:text-lg font-light text-white">
                        {numericGoal > 0 ? formatMoney(numericGoal) : '0 ₽'}
                      </span>
                    </div>
                  </div>

                  {/* Тайл 3: Прогресс выполнения */}
                  <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2.5 font-mono">
                    <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">
                      ВЫПОЛНЕНИЕ
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`text-base sm:text-lg font-light ${
                        isGoalReached ? 'text-emerald-400 font-normal' : numericGoal > 0 ? 'text-cyan-300' : 'text-[#71717a]'
                      }`}>
                        {numericGoal > 0 ? `${progressPercent.toFixed(0)}%` : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Тайл 4: Осталось */}
                  <div className="border border-[#2a2a30] bg-[#121214]/90 rounded-md p-2.5 font-mono">
                    <div className="text-[9px] sm:text-[10px] text-[#71717a] uppercase font-semibold">
                      ОСТАЛОСЬ
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`text-xs sm:text-sm font-light truncate ${
                        isGoalReached ? 'text-emerald-400 font-semibold' : 'text-neutral-300'
                      }`}>
                        {numericGoal === 0
                          ? '—'
                          : isGoalReached
                          ? 'Достигнута 🎉'
                          : formatMoney(goalRemaining)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Полоса прогресса к цели */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full ${
                      isGoalReached
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                        : numericGoal > 0
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                        : 'bg-white/10'
                    }`}
                    style={{ width: `${numericGoal > 0 ? Math.max(progressPercent, 2) : 0}%` }}
                  />
                </div>
              </div>

            </form>

            {/* 3. Нижняя панель телеметрии и кнопки */}
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 bg-neutral-900/60 font-mono text-xs shrink-0">
              <div className="flex items-center gap-2">
                {currentGoal > 0 ? (
                  <button
                    type="button"
                    onClick={() => setGoalAmount('0')}
                    className="text-xs font-mono text-[#71717a] hover:text-rose-400 flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>[ Сбросить цель ]</span>
                  </button>
                ) : (
                  <div />
                )}
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-[#a1a1aa] hover:text-white hover:bg-white/[0.08] hover:border-white/20 cursor-pointer text-xs font-mono select-none"
                >
                  [ Закрыть ]
                </button>

                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="px-4 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 cursor-pointer text-xs font-mono select-none shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>[ Сохранить цель ]</span>
                </button>
              </div>
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
