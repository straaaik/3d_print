import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, HelpCircle, TrendingUp } from 'lucide-react';
import { CustomTooltip } from '../../../shared/ui/Tooltip';
import { formatMoney } from '../helpers';

interface OrdersSummaryProps {
  totalIncome: number;
  totalExpenses: number;
  netProfitTotal: number;
  totalMarginPercent: number;
  unpaidSum: number;
  incomeOrdersCount: number;
  unpaidOrdersCount: number;
}

export const OrdersSummary = React.memo(function OrdersSummary({
  totalIncome,
  totalExpenses,
  netProfitTotal,
  totalMarginPercent,
  unpaidSum,
  incomeOrdersCount,
  unpaidOrdersCount,
}: OrdersSummaryProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Выручка (Доходы) */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-emerald-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
        
        <div className="flex items-center justify-between text-gray-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-gray-300">
            Выручка
            <CustomTooltip
              title="Выручка (Доходы)"
              description="Общая сумма завершенных и текущих заказов на 3D-печать за выбранный период."
              formula="Сумма всех (Сумма заказа) по доходным операциям"
              accentColor="emerald"
              align="left"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-emerald-400 transition-colors cursor-help" />
            </CustomTooltip>
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
          {formatMoney(totalIncome)}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
          <span className="font-medium text-gray-300 font-mono">{incomeOrdersCount}</span>
          <span>{incomeOrdersCount === 1 ? 'заказ' : incomeOrdersCount < 5 ? 'заказа' : 'заказов'}</span>
        </div>
      </div>

      {/* 2. Расходы */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-rose-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-colors" />

        <div className="flex items-center justify-between text-gray-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-gray-300">
            Расходы
            <CustomTooltip
              title="Производственные и общие расходы"
              description="Затраты на сырье (пластик, смола), фурнитуру, покраску, брак и прямые операционные расходы."
              formula="Себестоимость заказов + Прямые расходы"
              accentColor="rose"
              align="center"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-rose-400 transition-colors cursor-help" />
            </CustomTooltip>
          </span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400 tracking-tight">
          {formatMoney(totalExpenses)}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
          <span>Себестоимость и закупки</span>
        </div>
      </div>

      {/* 3. Чистая прибыль & Маржа */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-[#FF6B00]/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6B00]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#FF6B00]/10 transition-colors" />

        <div className="flex items-center justify-between text-gray-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-gray-300">
            Чистая прибыль
            <CustomTooltip
              title="Чистая прибыль и маржа"
              description="Чистый финансовый остаток после вычета всей себестоимости материалов и расходов."
              formula="Выручка − Расходы. Маржа = (Прибыль / Выручка) × 100%"
              accentColor="orange"
              align="center"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-[#FF8800] transition-colors cursor-help" />
            </CustomTooltip>
          </span>
          <div className="p-2 rounded-xl bg-[#FF6B00]/10 text-[#FF8800] border border-[#FF6B00]/20">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${netProfitTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {netProfitTotal >= 0 ? `+${formatMoney(netProfitTotal)}` : formatMoney(netProfitTotal)}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px]">
          {totalIncome > 0 ? (
            <span className={`px-2 py-0.5 rounded-md font-mono font-bold border text-[10px] ${
              totalMarginPercent >= 50
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : totalMarginPercent >= 20
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}>
              маржа {totalMarginPercent.toFixed(1)}%
            </span>
          ) : (
            <span className="text-gray-500">Нет доходных операций</span>
          )}
        </div>
      </div>

      {/* 4. Остаток к получению (Дебиторка) */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

        <div className="flex items-center justify-between text-gray-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-gray-300">
            Остаток к оплате
            <CustomTooltip
              title="Дебиторская задолженность"
              description="Сумма, которую клиенты еще не доплатили по активным заказам."
              formula="Сумма (Сумма заказа − Оплачено)"
              accentColor="amber"
              align="right"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-amber-400 transition-colors cursor-help" />
            </CustomTooltip>
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tracking-tight">
          {formatMoney(unpaidSum)}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
          {unpaidSum > 0 ? (
            <span className="text-amber-400/90 font-medium">
              В ожидании оплаты: {unpaidOrdersCount}
            </span>
          ) : (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              ✓ Все заказы оплачены
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
