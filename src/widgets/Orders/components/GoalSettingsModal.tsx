'use client';

import React, { useState, useEffect } from 'react';
import { Target, RotateCcw, Check } from 'lucide-react';
import { CockpitModal } from '../../../shared/ui/CockpitModal';
import { CockpitButton } from '../../../shared/ui/CockpitButton';

interface GoalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: number;
  selectedMonthKey: string;
  monthLabel: string;
  onSave: (targetAmount: number, applyToAllMonths: boolean) => void;
}

const PRESET_AMOUNTS = [30000, 50000, 100000, 150000, 200000, 300000, 500000];

export function GoalSettingsModal({
  isOpen,
  onClose,
  currentGoal,
  selectedMonthKey,
  monthLabel,
  onSave,
}: GoalSettingsModalProps) {
  const [goalAmount, setGoalAmount] = useState<string>('');
  const [applyToAllMonths, setApplyToAllMonths] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setGoalAmount(currentGoal > 0 ? String(currentGoal) : '');
      setApplyToAllMonths(selectedMonthKey === 'all');
    }
  }, [isOpen, currentGoal, selectedMonthKey]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawNumber = Number(goalAmount.replace(/\D/g, '')) || 0;
    onSave(rawNumber, applyToAllMonths || selectedMonthKey === 'all');
    onClose();
  };

  const numericGoal = Number(goalAmount.replace(/\D/g, '') || 0);
  const formattedGoalDisplay = numericGoal > 0 ? numericGoal.toLocaleString('ru-RU') : '0';

  if (!isOpen) return null;

  return (
    <CockpitModal
      isOpen={isOpen}
      onClose={onClose}
      stamp="PROFIT_TARGET"
      variant="cyan"
      maxWidth="md"
      title={
        <span className="text-white font-mono text-sm uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          <span>Цель по чистой прибыли</span>
        </span>
      }
      subtitle={
        <span className="font-mono text-xs text-neutral-400">
          Период:{' '}
          <strong className="text-white font-bold">
            {selectedMonthKey === 'all' ? 'Все месяцы' : monthLabel}
          </strong>
        </span>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          {currentGoal > 0 ? (
            <button
              type="button"
              onClick={() => setGoalAmount('0')}
              className="text-xs font-mono text-neutral-500 hover:text-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>[ Сбросить ]</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <CockpitButton type="button" onClick={onClose}>
              Отмена
            </CockpitButton>
            <CockpitButton
              type="button"
              onClick={() => handleSave()}
              icon={Check}
              isActive={true}
              className="border-cyan-500/40 bg-cyan-950/60 text-cyan-300 font-bold hover:bg-cyan-900/80 shadow-sm"
            >
              Сохранить цель
            </CockpitButton>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-4 font-mono text-xs">
        {/* Карточка ввода суммы */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <label className="text-[11px] font-mono text-neutral-400 block uppercase tracking-wider">
            Целевая сумма прибыли (₽):
          </label>
          <div className="relative">
            <input
              type="text"
              value={goalAmount}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/\D/g, '');
                setGoalAmount(numericOnly);
              }}
              placeholder="Например: 100 000"
              autoFocus
              className="w-full bg-neutral-900 border border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-xl pl-3.5 pr-10 py-2.5 text-lg font-mono font-bold text-white placeholder-neutral-600 focus:outline-none transition-all"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono font-bold pointer-events-none">
              ₽
            </div>
          </div>

          {numericGoal > 0 && (
            <div className="pt-1.5 flex items-center justify-between text-[11px] text-neutral-400">
              <span className="text-neutral-500">Установленная цель:</span>
              <span className="text-emerald-400 font-bold font-mono">
                {formattedGoalDisplay} ₽
              </span>
            </div>
          )}
        </div>

        {/* Быстрые пресеты сумм */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
            Быстрый выбор планки:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_AMOUNTS.map((amt) => {
              const isSelected = numericGoal === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setGoalAmount(String(amt))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/50 font-bold shadow-sm'
                      : 'bg-neutral-900/80 border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {(amt / 1000).toLocaleString('ru-RU')}k ₽
                </button>
              );
            })}
          </div>
        </div>

        {/* Опция: сделать целью по умолчанию */}
        {selectedMonthKey !== 'all' && (
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyToAllMonths}
                onChange={(e) => setApplyToAllMonths(e.target.checked)}
                className="w-4 h-4 rounded bg-neutral-900 border-white/20 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-neutral-300">
                Сделать эту сумму целью по умолчанию для всех месяцев
              </span>
            </label>
          </div>
        )}
      </form>
    </CockpitModal>
  );
}
