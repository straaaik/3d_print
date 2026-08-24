import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Target, 
  Trophy, 
  Flame, 
  Sparkles, 
  Edit3, 
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  getMonthlyGoalsConfig, 
  getCachedMonthlyGoalsConfig,
  saveMonthlyGoal,
  saveMonthlyGoalsConfig, 
  MonthlyGoalsConfig 
} from '../../../shared/api/db';
import { formatMoney, formatMonthKeyLabel } from '../helpers';
import { GoalSettingsModal } from './GoalSettingsModal';

interface OrdersMonthlyGoalProps {
  selectedMonthKey: string;
  totalIncome?: number;
  netProfitTotal: number;
  incomeOrdersCount?: number;
}

export const OrdersMonthlyGoal = React.memo(function OrdersMonthlyGoal({
  selectedMonthKey,
  netProfitTotal,
}: OrdersMonthlyGoalProps) {
  const [goalsConfig, setGoalsConfig] = useState<MonthlyGoalsConfig>(getCachedMonthlyGoalsConfig);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Синхронизация с базой данных Supabase и localStorage
  const refreshConfig = useCallback(async () => {
    const config = await getMonthlyGoalsConfig();
    setGoalsConfig(config);
  }, []);

  useEffect(() => {
    refreshConfig();
    const handleUpdate = () => {
      setGoalsConfig(getCachedMonthlyGoalsConfig());
    };
    window.addEventListener('monthly_goals_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('monthly_goals_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshConfig]);

  // Определение целевой суммы для выбранного месяца (по умолчанию 0)
  const currentMonthGoal = useMemo(() => {
    if (selectedMonthKey && selectedMonthKey !== 'all') {
      if (typeof goalsConfig.monthlyGoals[selectedMonthKey] === 'number') {
        return goalsConfig.monthlyGoals[selectedMonthKey];
      }
    }
    return goalsConfig.defaultGoal || 0;
  }, [goalsConfig, selectedMonthKey]);

  // Фактическое текущее значение — строго чистая прибыль
  const currentProfit = useMemo(() => {
    return Math.max(0, netProfitTotal || 0);
  }, [netProfitTotal]);

  const hasGoal = currentMonthGoal > 0;

  // Процент выполнения
  const progressPercent = useMemo(() => {
    if (currentMonthGoal <= 0) return 0;
    return (currentProfit / currentMonthGoal) * 100;
  }, [currentProfit, currentMonthGoal]);

  const displayPercent = progressPercent.toFixed(1);
  const clampedPercent = Math.min(100, Math.max(0, progressPercent));
  const isGoalReached = hasGoal && progressPercent >= 100;
  const isOverachieved = hasGoal && progressPercent > 100;

  // Остаток до цели
  const remainingValue = Math.max(0, currentMonthGoal - currentProfit);
  const overachievementValue = currentProfit > currentMonthGoal ? currentProfit - currentMonthGoal : 0;

  // Сохранение цели в БД и кэш
  const handleSaveGoal = async (newGoal: number, applyToAll: boolean) => {
    const updatedMonthly = { ...goalsConfig.monthlyGoals };
    if (applyToAll || selectedMonthKey === 'all') {
      const updated: MonthlyGoalsConfig = {
        defaultGoal: newGoal,
        targetType: 'profit',
        monthlyGoals: selectedMonthKey !== 'all' ? { ...updatedMonthly, [selectedMonthKey]: newGoal } : updatedMonthly,
      };
      setGoalsConfig(updated);
      await saveMonthlyGoalsConfig(updated);
    } else {
      updatedMonthly[selectedMonthKey] = newGoal;
      const updated: MonthlyGoalsConfig = {
        ...goalsConfig,
        targetType: 'profit',
        monthlyGoals: updatedMonthly,
      };
      setGoalsConfig(updated);
      await saveMonthlyGoal(selectedMonthKey, newGoal);
    }
  };

  const monthLabel = formatMonthKeyLabel(selectedMonthKey);

  return (
    <>
      <div className={`bg-[#16181d] border ${
        isGoalReached 
          ? 'border-emerald-500/40 shadow-lg shadow-emerald-950/20' 
          : 'border-[#242930] hover:border-gray-700/80 shadow-md'
      } rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 transition-all duration-200 relative overflow-hidden group`}>
        
        {/* Фоновый легкий светящийся градиент */}
        <div className={`absolute top-0 right-0 w-60 h-24 ${
          isGoalReached ? 'bg-emerald-500/10' : 'bg-[#FF6B00]/5 group-hover:bg-[#FF6B00]/10'
        } rounded-full blur-2xl pointer-events-none transition-colors`} />

        {/* Верхняя строка с информацией и действиями */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 relative z-10">
          
          {/* Левый блок: Иконка + Заголовок */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className={`p-1.5 rounded-lg ${
              isGoalReached
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#FF6B00]/15 text-[#FF8800] border border-[#FF6B00]/30'
            } shrink-0`}>
              {isGoalReached ? (
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Target className="w-3.5 h-3.5" />
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
              <span>Цель по прибыли:</span>
              <span className="text-gray-400 font-medium text-xs">
                {selectedMonthKey === 'all' ? 'Все время (общая)' : monthLabel}
              </span>
            </div>
          </div>

          {/* Правый блок: Прогресс в рублях + Бейдж процента + Кнопка изменить */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 flex-wrap">
            {hasGoal ? (
              <>
                {/* Суммы: факт прибыли / цель */}
                <div className="flex items-baseline gap-1.5 text-xs sm:text-sm font-mono">
                  <span className={`font-black ${isGoalReached ? 'text-emerald-400' : 'text-white'}`}>
                    {formatMoney(currentProfit)}
                  </span>
                  <span className="text-gray-500">/</span>
                  <span className="text-gray-400 font-semibold">
                    {formatMoney(currentMonthGoal)}
                  </span>
                </div>

                {/* Процент */}
                <div className={`px-2 py-0.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 ${
                  isOverachieved
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isGoalReached
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : progressPercent >= 50
                    ? 'bg-[#FF6B00]/15 text-[#FF8800] border-[#FF6B00]/30'
                    : 'bg-[#242930] text-gray-300 border-gray-700'
                }`}>
                  {isOverachieved && <Flame className="w-3 h-3 text-amber-400" />}
                  <span>{displayPercent}%</span>
                </div>

                {/* Статус / Остаток */}
                <div className="text-[11px] font-mono hidden md:block">
                  {isOverachieved ? (
                    <span className="text-amber-400 font-semibold">
                      + {formatMoney(overachievementValue)}
                    </span>
                  ) : isGoalReached ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Достигнута!
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      осталось: <span className="text-gray-200 font-semibold">{formatMoney(remainingValue)}</span>
                    </span>
                  )}
                </div>

                {/* Кнопка быстрого изменения */}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="p-1 sm:px-2 sm:py-1 rounded-lg bg-[#0d0e12] hover:bg-[#242930] border border-[#242930] hover:border-gray-600 text-gray-400 hover:text-white text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  title="Изменить целевую сумму прибыли"
                >
                  <Edit3 className="w-3 h-3" />
                  <span className="hidden sm:inline">Изменить</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Цель не задана</span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-[#FF6B00]/15 hover:bg-[#FF6B00]/25 border border-[#FF6B00]/40 text-[#FF8800] hover:text-orange-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Указать цель</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Компактная полоска прогресса */}
        <div className="w-full h-2 sm:h-2.5 bg-[#0d0e12] rounded-full border border-[#242930] overflow-hidden p-0.5 relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clampedPercent}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`h-full rounded-full relative transition-all duration-300 ${
              isOverachieved
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : isGoalReached
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : progressPercent >= 50
                ? 'bg-gradient-to-r from-[#FF6B00] via-[#FF8800] to-emerald-500'
                : 'bg-gradient-to-r from-[#FF5500] to-[#FF8800]'
            }`}
          />
        </div>
      </div>

      {/* Модальное окно настройки цели */}
      <GoalSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentGoal={currentMonthGoal}
        selectedMonthKey={selectedMonthKey}
        monthLabel={monthLabel}
        onSave={handleSaveGoal}
      />
    </>
  );
});
