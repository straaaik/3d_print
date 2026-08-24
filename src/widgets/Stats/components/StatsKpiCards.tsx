'use client';

import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Wallet, 
  HelpCircle, 
  Layers, 
  Printer, 
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { StatsKPI } from '../helpers/statsCalculator';
import { CustomTooltip } from '../../../shared/ui/Tooltip';

interface StatsKpiCardsProps {
  kpi: StatsKPI;
}

export function formatMoney(num: number | undefined | null): string {
  const val = num || 0;
  return `${val.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ₽`;
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} кг`;
  }
  return `${Math.round(grams)} г`;
}

export function formatPrintTime(decimalHours: number): string {
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} мин`;
  if (minutes === 0) return `${hours} ч`;
  return `${hours} ч ${minutes} мин`;
}

export function StatsKpiCards({ kpi }: StatsKpiCardsProps) {
  const isProfitPositive = kpi.netProfit >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 select-none">
      {/* 1. Выручка */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-emerald-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group flex flex-col justify-between min-h-[148px]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

        {/* Шапка карточки */}
        <div className="flex items-center justify-between gap-1.5 h-7">
          <div className="flex items-center gap-1 min-w-0 flex-1 pr-1">
            <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-gray-300 truncate">
              Выручка
            </span>
            <CustomTooltip
              title="Выручка (Оборот)"
              description="Суммарный объем продаж по всем заказам на 3D-печать и услуги за выбранный период."
              formula="Сумма всех (Сумма заказа) по доходным операциям"
              accentColor="emerald"
              align="left"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-emerald-400 transition-colors cursor-help shrink-0" />
            </CustomTooltip>
          </div>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Главное число */}
        <div className="my-auto py-1">
          <div className="text-xl xl:text-2xl font-bold font-mono text-emerald-400 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {formatMoney(kpi.totalRevenue)}
          </div>
        </div>

        {/* Подвал карточки */}
        <div className="border-t border-[#242930]/60 pt-2.5 pb-0.5 flex items-center justify-between text-[11px] text-gray-400 whitespace-nowrap">
          <span>Сделок: <strong className="text-gray-200 font-mono">{kpi.incomeOrdersCount}</strong></span>
          {kpi.incomeOrdersCount > 0 ? (
            <span>Ср. чек: <strong className="text-emerald-300 font-mono">{formatMoney(kpi.averageCheck)}</strong></span>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </div>
      </div>

      {/* 2. Расходы */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-rose-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group flex flex-col justify-between min-h-[148px]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-colors" />

        {/* Шапка карточки */}
        <div className="flex items-center justify-between gap-1.5 h-7">
          <div className="flex items-center gap-1 min-w-0 flex-1 pr-1">
            <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-gray-300 truncate">
              Расходы
            </span>
            <CustomTooltip
              title="Затраты и себестоимость"
              description="Себестоимость пластика, амортизация принтеров, электроэнергия, фурнитура и прямые расходы."
              formula="Себестоимость заказов + Прямые расходы"
              accentColor="rose"
              align="center"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-rose-400 transition-colors cursor-help shrink-0" />
            </CustomTooltip>
          </div>
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>

        {/* Главное число */}
        <div className="my-auto py-1">
          <div className="text-xl xl:text-2xl font-bold font-mono text-rose-400 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {formatMoney(kpi.totalExpenses)}
          </div>
        </div>

        {/* Подвал карточки */}
        <div className="border-t border-[#242930]/60 pt-2.5 pb-0.5 flex items-center justify-between text-[11px] text-gray-400 whitespace-nowrap">
          <span>Себестоимость</span>
          <span>Прямых: <strong className="text-gray-200 font-mono">{kpi.expenseOrdersCount}</strong></span>
        </div>
      </div>

      {/* 3. Чистая прибыль */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-[#FF6B00]/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group flex flex-col justify-between min-h-[148px]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6B00]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#FF6B00]/10 transition-colors" />

        {/* Шапка карточки */}
        <div className="flex items-center justify-between gap-1.5 h-7">
          <div className="flex items-center gap-1 min-w-0 flex-1 pr-1">
            <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-gray-300 truncate">
              Чистая прибыль
            </span>
            <CustomTooltip
              title="Чистая прибыль"
              description="Чистый финансовый доход мастерской после вычета себестоимости и всех прямых издержек."
              formula="Выручка − Все расходы. Маржа = (Прибыль / Выручка) × 100%"
              accentColor="orange"
              align="center"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-[#FF8800] transition-colors cursor-help shrink-0" />
            </CustomTooltip>
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#FF6B00]/10 text-[#FF8800] border border-[#FF6B00]/20 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        {/* Главное число */}
        <div className="my-auto py-1">
          <div className={`text-xl xl:text-2xl font-bold font-mono tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${
            isProfitPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isProfitPositive ? `+${formatMoney(kpi.netProfit)}` : formatMoney(kpi.netProfit)}
          </div>
        </div>

        {/* Подвал карточки */}
        <div className="border-t border-[#242930]/60 pt-2.5 pb-0.5 flex items-center justify-between text-[11px] text-gray-400 whitespace-nowrap">
          {kpi.totalRevenue > 0 ? (
            <>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-[10px] leading-tight border ${
                kpi.marginPercent >= 50
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : kpi.marginPercent >= 20
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}>
                маржа {kpi.marginPercent.toFixed(1)}%
              </span>
              <span className="text-[10px] text-gray-400">
                наценка {kpi.markupPercent.toFixed(0)}%
              </span>
            </>
          ) : (
            <span className="text-gray-500">Нет операций</span>
          )}
        </div>
      </div>

      {/* 4. Остаток к оплате */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group flex flex-col justify-between min-h-[148px]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

        {/* Шапка карточки */}
        <div className="flex items-center justify-between gap-1.5 h-7">
          <div className="flex items-center gap-1 min-w-0 flex-1 pr-1">
            <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-gray-300 truncate">
              Остаток к оплате
            </span>
            <CustomTooltip
              title="Дебиторская задолженность"
              description="Сумма, которую клиенты еще не доплатили по сформированным заказам за период."
              formula="Сумма (Сумма заказа − Оплачено)"
              accentColor="amber"
              align="center"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-amber-400 transition-colors cursor-help shrink-0" />
            </CustomTooltip>
          </div>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        {/* Главное число */}
        <div className="my-auto py-1">
          <div className="text-xl xl:text-2xl font-bold font-mono text-amber-400 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {formatMoney(kpi.unpaidSum)}
          </div>
        </div>

        {/* Подвал карточки */}
        <div className="border-t border-[#242930]/60 pt-2.5 pb-0.5 flex items-center justify-between text-[11px] text-gray-400 whitespace-nowrap">
          {kpi.unpaidSum > 0 ? (
            <span className="text-amber-400/90 font-medium">
              Ожидают: <strong className="font-mono">{kpi.unpaidOrdersCount}</strong>
            </span>
          ) : (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Оплачено
            </span>
          )}
          <span className="text-[10px] text-gray-400">
            В работе: <strong className="text-gray-300 font-mono">{kpi.inProgressOrdersCount}</strong>
          </span>
        </div>
      </div>

      {/* 5. Расход сырья */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-cyan-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group flex flex-col justify-between min-h-[148px]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />

        {/* Шапка карточки */}
        <div className="flex items-center justify-between gap-1.5 h-7">
          <div className="flex items-center gap-1 min-w-0 flex-1 pr-1">
            <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-gray-300 truncate">
              Расход сырья
            </span>
            <CustomTooltip
              title="Расход пластика / смолы"
              description="Общий вес затраченного филамента на изготовление изделий по заказам за выбранный период."
              formula="Сумма (Вес модели × Тираж заказа)"
              accentColor="cyan"
              align="center"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400 transition-colors cursor-help shrink-0" />
            </CustomTooltip>
          </div>
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {/* Главное число */}
        <div className="my-auto py-1">
          <div className="text-xl xl:text-2xl font-bold font-mono text-cyan-400 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {formatWeight(kpi.totalFilamentWeightG)}
          </div>
        </div>

        {/* Подвал карточки */}
        <div className="border-t border-[#242930]/60 pt-2.5 pb-0.5 flex items-center justify-between text-[11px] text-gray-400 whitespace-nowrap">
          <span>~ {((kpi.totalFilamentWeightG || 0) / 1000).toFixed(1)} кат.</span>
          <span className="text-cyan-300 font-mono font-medium">
            {kpi.totalFilamentWeightG > 0 ? `${Math.round(kpi.totalFilamentWeightG)} г` : '0 г'}
          </span>
        </div>
      </div>

      {/* 6. Часы печати */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-purple-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group flex flex-col justify-between min-h-[148px]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-colors" />

        {/* Шапка карточки */}
        <div className="flex items-center justify-between gap-1.5 h-7">
          <div className="flex items-center gap-1 min-w-0 flex-1 pr-1">
            <span className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-gray-300 truncate">
              Часы печати
            </span>
            <CustomTooltip
              title="Наработка оборудования (Машино-часы)"
              description="Суммарное расчетное время работы 3D-принтеров на выполнение заказов за выбранный период."
              formula="Сумма (Время печати изделия × Тираж)"
              accentColor="purple"
              align="right"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-purple-400 transition-colors cursor-help shrink-0" />
            </CustomTooltip>
          </div>
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Printer className="w-4 h-4" />
          </div>
        </div>

        {/* Главное число */}
        <div className="my-auto py-1">
          <div className="text-xl xl:text-2xl font-bold font-mono text-purple-400 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {formatPrintTime(kpi.totalPrintHours)}
          </div>
        </div>

        {/* Подвал карточки */}
        <div className="border-t border-[#242930]/60 pt-2.5 pb-0.5 flex items-center justify-between text-[11px] text-gray-400 whitespace-nowrap">
          <span>Сдано: <strong className="text-gray-200 font-mono">{kpi.completedOrdersCount}</strong></span>
          <span className="text-purple-300 font-mono font-medium">
            {kpi.totalPrintHours > 0 ? `${kpi.totalPrintHours.toFixed(1)} ч` : '0 ч'}
          </span>
        </div>
      </div>
    </div>
  );
}
