import React from 'react';
import { formatMoney } from '../../helpers';
import { TrendingUp, TrendingDown, Layers, ArrowUpRight, Printer, CreditCard, Settings } from 'lucide-react';
import { Tooltip } from '@/shared/ui/Tooltip';
import { CockpitTiltCard } from '@/shared/ui/CockpitTiltCard';

interface OrdersV2KpiCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netProfitTotal: number;
  totalMarginPercent: number;
  inProgressCount: number;
  printingCount: number;
  waitingCount: number;
  completedCount: number;
  incomeOrdersCount: number;
  unpaidSum: number;
  unpaidOrdersCount: number;
  currentMonthGoal: number;
  onOpenGoalModal?: () => void;
  selectedMonthLabel: string;
  isExpanded?: boolean;
}

export const OrdersV2KpiCards = React.memo(function OrdersV2KpiCards({
  totalIncome,
  totalExpenses,
  netProfitTotal,
  totalMarginPercent,
  inProgressCount,
  printingCount,
  waitingCount,
  completedCount,
  incomeOrdersCount,
  unpaidSum,
  unpaidOrdersCount,
  currentMonthGoal,
  onOpenGoalModal,
  isExpanded = false,
}: OrdersV2KpiCardsProps) {
  const hasGoal = currentMonthGoal > 0;
  const currentProfit = Math.max(0, netProfitTotal);
  const progressPercent = hasGoal ? Math.min(100, (currentProfit / currentMonthGoal) * 100) : 0;
  const isGoalReached = hasGoal && currentProfit >= currentMonthGoal;
  const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  const averageCheck = incomeOrdersCount > 0 ? Math.round(totalIncome / incomeOrdersCount) : 0;
  const averageProfit = incomeOrdersCount > 0 ? Math.round(netProfitTotal / incomeOrdersCount) : 0;
  const averageCost = incomeOrdersCount > 0 ? Math.round(totalExpenses / incomeOrdersCount) : 0;
  const totalPaid = Math.max(0, totalIncome - unpaidSum);
  const paidRatio = totalIncome > 0 ? Math.max(0, Math.min(100, (totalPaid / totalIncome) * 100)) : 100;
  const goalRemaining = hasGoal ? Math.max(0, currentMonthGoal - currentProfit) : 0;
  const completedRatio = incomeOrdersCount > 0 ? Math.round((completedCount / incomeOrdersCount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3 select-none">

      {/* КАРТОЧКА 1: ВЫРУЧКА */}
      <CockpitTiltCard
        tone="cyan"
        className="p-3 sm:p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                ВЫРУЧКА
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Ср. чек:</span>
                <span className="font-bold text-white tabular-nums">{formatMoney(averageCheck)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Собрано оплат:</span>
                <span className="font-semibold text-emerald-400 tabular-nums">{formatMoney(totalPaid)} ({paidRatio.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Всего заказов:</span>
                <span className="font-bold text-cyan-300 tabular-nums">{incomeOrdersCount} шт.</span>
              </div>
            </div>
          </div>
        )}
      >
        <div>
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
              ВЫРУЧКА
            </span>
            <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight leading-none mt-0.5">
            {formatMoney(totalIncome)}
          </div>
        </div>

        {/* Дополнительная подробная телеметрия в развернутом виде */}
        {isExpanded ? (
          <div className="mt-3 pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Ср. чек:</span>
              <span className="font-bold text-white">{formatMoney(averageCheck)}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>Собрано:</span>
              <span className="text-emerald-400 font-semibold">{formatMoney(totalPaid)} ({paidRatio.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400 pt-0.5 border-t border-white/5">
              <span>Всего заказов:</span>
              <span className="text-cyan-300 font-bold px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/20">
                {incomeOrdersCount} шт.
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-1 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
            <span className="text-neutral-400">Всего заказов:</span>
            <span className="text-cyan-300 font-bold font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/20">
              {incomeOrdersCount}
            </span>
          </div>
        )}
      </CockpitTiltCard>

      {/* КАРТОЧКА 2: РАСХОДЫ */}
      <CockpitTiltCard
        tone="rose"
        className="p-3 sm:p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                РАСХОДЫ
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Доля от выручки:</span>
                <span className="font-bold text-rose-400 tabular-nums">{expenseRatio.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Ср. расход на заказ:</span>
                <span className="font-semibold text-white tabular-nums">{formatMoney(averageCost)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Рентабельность:</span>
                <span className="font-bold text-emerald-400 tabular-nums">{(100 - expenseRatio).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
      >
        <div>
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
              РАСХОДЫ
            </span>
            <div className="p-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown className="w-3 h-3" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400 tracking-tight leading-none mt-0.5">
            {formatMoney(totalExpenses)}
          </div>
        </div>

        {/* Дополнительная подробная телеметрия в развернутом виде */}
        {isExpanded ? (
          <div className="mt-3 pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Доля от выручки:</span>
              <span className="font-bold text-rose-400">{expenseRatio.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>Ср. расход/зак:</span>
              <span className="text-neutral-300 font-semibold">{formatMoney(averageCost)}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400 pt-0.5 border-t border-white/5">
              <span>Чистая рентабельность:</span>
              <span className="text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                {(100 - expenseRatio).toFixed(1)}%
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-1 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
            <span className="text-neutral-400">От выручки:</span>
            <span className="text-rose-300 font-bold font-mono px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
              {expenseRatio.toFixed(1)}%
            </span>
          </div>
        )}
      </CockpitTiltCard>

      {/* КАРТОЧКА 3: ЧИСТАЯ ПРИБЫЛЬ С ПОЛОСОЙ ЦЕЛИ */}
      <CockpitTiltCard
        tone="emerald"
        className="p-3 sm:p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                ЧИСТАЯ ПРИБЫЛЬ
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Маржинальность:</span>
                <span className="font-bold text-emerald-400 tabular-nums">{totalMarginPercent.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Ср. прибыль/зак:</span>
                <span className="font-semibold text-white tabular-nums">+{formatMoney(averageProfit)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Цель периода:</span>
                <span className="font-bold text-cyan-300 tabular-nums">
                  {hasGoal ? `${progressPercent.toFixed(0)}%` : 'Не задана'}
                </span>
              </div>
            </div>
          </div>
        )}
      >
        <div>
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
              ЧИСТАЯ ПРИБЫЛЬ
            </span>
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight leading-none mt-0.5">
            {netProfitTotal >= 0 ? `+${formatMoney(netProfitTotal)}` : formatMoney(netProfitTotal)}
          </div>
        </div>

        {/* Полоса прогресса к цели */}
        <div className="mt-2">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full duration-500 ${
                isGoalReached
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]'
                  : hasGoal
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                    : 'bg-white/10'
              }`}
              style={{ width: `${hasGoal ? Math.max(progressPercent, 2) : 0}%` }}
            />
          </div>
        </div>

        {/* Подвал карточки: Маржа, Прибыль на заказ и Настройка цели */}
        <div className="mt-2 border-t border-white/5 pt-1.5 flex flex-col gap-1 text-[10px] font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">Маржа:</span>
              <span className={`px-1.5 py-0.2 rounded font-bold border ${
                totalMarginPercent >= 50
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : totalMarginPercent >= 25
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                {totalMarginPercent.toFixed(1)}%
              </span>
            </div>

            <Tooltip content={hasGoal ? `Цель: ${formatMoney(currentMonthGoal)} (выполнено ${progressPercent.toFixed(0)}%, осталось ${formatMoney(goalRemaining)})` : 'Указать финансовую цель на месяц'}>
              <button
                type="button"
                onClick={onOpenGoalModal}
                className="flex items-center gap-1 text-neutral-400 hover:text-cyan-300 cursor-pointer group"
              >
                <span className="group-hover:underline">
                  {hasGoal ? `${progressPercent.toFixed(0)}%` : 'Цель'}
                </span>
                <Settings className="w-3 h-3 text-neutral-500 group-hover:text-cyan-300 group-hover:rotate-45" />
              </button>
            </Tooltip>
          </div>

          {isExpanded && (
            <div className="flex items-center justify-between text-neutral-400 pt-0.5 border-t border-white/5">
              <span>Ср. прибыль/зак:</span>
              <span className="text-emerald-400 font-bold">+{formatMoney(averageProfit)}</span>
            </div>
          )}
        </div>
      </CockpitTiltCard>

      {/* КАРТОЧКА 4: ОСТАТОК К ОПЛАТЕ */}
      <CockpitTiltCard
        tone="amber"
        className="p-3 sm:p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                ОСТАТОК К ОПЛАТЕ
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Сбор выручки:</span>
                <span className="font-bold text-emerald-400 tabular-nums">{paidRatio.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Заказов с долгом:</span>
                <span className="font-semibold text-amber-300 tabular-nums">{unpaidOrdersCount} из {incomeOrdersCount}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">К получению:</span>
                <span className="font-bold text-amber-400 tabular-nums">{formatMoney(unpaidSum)}</span>
              </div>
            </div>
          </div>
        )}
      >
        <div>
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
              ОСТАТОК К ОПЛАТЕ
            </span>
            <div className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CreditCard className="w-3 h-3" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tracking-tight leading-none mt-0.5">
            {formatMoney(unpaidSum)}
          </div>
        </div>

        {/* Дополнительная подробная телеметрия в развернутом виде */}
        {isExpanded ? (
          <div className="mt-3 pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Сбор выручки:</span>
              <span className="font-bold text-emerald-400">{paidRatio.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${paidRatio}%` }} />
            </div>
            <div className="flex items-center justify-between text-neutral-400 pt-0.5">
              <span>С долгом:</span>
              <span className="text-amber-300 font-bold px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
                {unpaidOrdersCount} зак.
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-1 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
            <span className="text-neutral-400">С долгом:</span>
            <span className="text-amber-300 font-bold font-mono px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
              {unpaidOrdersCount} заказов
            </span>
          </div>
        )}
      </CockpitTiltCard>

      {/* КАРТОЧКА 5: ЗАКАЗОВ В РАБОТЕ */}
      <CockpitTiltCard
        tone="sky"
        className="p-3 sm:p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                ЗАКАЗОВ В РАБОТЕ
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">В очереди печати:</span>
                <span className="font-bold text-amber-300 tabular-nums">{waitingCount} шт.</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">В печати сейчас:</span>
                <span className="font-bold text-cyan-300 tabular-nums">{printingCount} шт.</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Сдано заказов:</span>
                <span className="font-semibold text-emerald-400 tabular-nums">{completedCount} ({completedRatio}%)</span>
              </div>
            </div>
          </div>
        )}
      >
        <div>
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
              ЗАКАЗОВ В РАБОТЕ
            </span>
            <div className="p-1 rounded bg-white/5 text-neutral-300 border border-white/10">
              <Layers className="w-3 h-3" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight leading-none">
              {inProgressCount}
            </span>
            {printingCount > 0 && (
              <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                <Printer className="w-3 h-3" /> {printingCount} печать
              </span>
            )}
          </div>
        </div>

        {/* Дополнительная подробная телеметрия в развернутом виде */}
        {isExpanded ? (
          <div className="mt-3 pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-amber-300">В очереди: {waitingCount}</span>
              <span className="text-emerald-400">Сдано: {completedCount}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400 pt-0.5 border-t border-white/5">
              <span>Готовность пула:</span>
              <span className="text-white font-bold px-1.5 py-0.2 rounded bg-white/10 border border-white/15">
                {completedRatio}% выполнено
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-1 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-neutral-400">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-amber-300 font-medium">В очереди: {waitingCount}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-emerald-400 font-medium">Сдано: {completedCount}</span>
            </div>
          </div>
        )}
      </CockpitTiltCard>

    </div>
  );
});
