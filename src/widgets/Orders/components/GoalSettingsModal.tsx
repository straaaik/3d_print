import React, { useState, useEffect } from 'react';
import { Target, DollarSign, RotateCcw } from 'lucide-react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { ordersTheme } from '../../../shared/theme';

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#FF6B00]/15 text-[#FF8800] border border-[#FF6B00]/30">
            <Target className="w-4 h-4" />
          </div>
          <span>Настройка цели по прибыли</span>
        </div>
      }
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between gap-2.5">
          {currentGoal > 0 ? (
            <button
              type="button"
              onClick={() => {
                setGoalAmount('0');
              }}
              className="text-xs text-gray-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить цель</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-[#242930] hover:bg-[#242930] text-gray-300 text-xs sm:text-sm px-4 py-2 rounded-xl cursor-pointer"
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleSave()}
              className={`${ordersTheme.primaryButton.gradient} ${ordersTheme.primaryButton.text} border-none ${ordersTheme.primaryButton.shadow} text-xs sm:text-sm font-bold px-5 py-2 rounded-xl cursor-pointer`}
            >
              Сохранить
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-4 pt-1">
        {/* Контекст месяца */}
        <div className="text-xs text-gray-400">
          Укажите желаемую цель по <span className="text-emerald-400 font-semibold">чистой прибыли</span> для{' '}
          <span className="font-semibold text-white">
            {selectedMonthKey === 'all' ? 'всех месяцев' : monthLabel}
          </span>
          .
        </div>

        {/* Поле ввода целевой суммы */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
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
              className="w-full bg-[#0d0e12] border border-[#242930] hover:border-gray-600 focus:border-[#FF6B00] rounded-xl pl-4 pr-12 py-2.5 text-base sm:text-lg font-mono font-bold text-white placeholder-gray-600 focus:outline-none transition-colors"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold pointer-events-none">
              ₽
            </div>
          </div>
          {numericGoal > 0 && (
            <div className="mt-1 text-right text-[11px] text-gray-400 font-mono">
              Цель: <span className="text-emerald-400 font-semibold">{formattedGoalDisplay} ₽</span>
            </div>
          )}
        </div>

        {/* Быстрые пресеты сумм */}
        <div>
          <span className="block text-[11px] font-semibold text-gray-400 mb-1.5">
            Быстрый выбор:
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
                      ? 'bg-[#FF6B00] text-white border-[#FF6B00] font-bold shadow-sm'
                      : 'bg-[#0d0e12] border-[#242930] text-gray-300 hover:text-white hover:border-gray-600'
                  }`}
                >
                  {(amt / 1000).toLocaleString('ru-RU')}k ₽
                </button>
              );
            })}
          </div>
        </div>

        {/* Опция: сделать целью по умолчанию для всех месяцев */}
        {selectedMonthKey !== 'all' && (
          <div className="pt-2 border-t border-[#242930]/60">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyToAllMonths}
                onChange={(e) => setApplyToAllMonths(e.target.checked)}
                className="w-4 h-4 rounded bg-[#0d0e12] border-[#242930] text-[#FF6B00] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-gray-300">
                Сделать эту сумму целью по умолчанию для всех месяцев
              </span>
            </label>
          </div>
        )}
      </form>
    </Modal>
  );
}
