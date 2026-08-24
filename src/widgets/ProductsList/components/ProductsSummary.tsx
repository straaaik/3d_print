import React from 'react';
import { Package, ArrowUpRight, Receipt, DollarSign, HelpCircle, TrendingUp } from 'lucide-react';
import { WarehouseMetrics } from '../types';
import { formatCurrency } from '../../../shared/lib/format';
import { CustomTooltip } from '../../../shared/ui/Tooltip';

interface ProductsSummaryProps {
  metrics: WarehouseMetrics;
  totalProductsCount: number;
  currencySymbol: string;
}

export const ProductsSummary = React.memo(function ProductsSummary({
  metrics,
  totalProductsCount,
  currencySymbol,
}: ProductsSummaryProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Всего на складе */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

        <div className="flex items-center justify-between text-gray-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-gray-300">
            Остаток на складе
            <CustomTooltip
              title="Остаток готовой продукции"
              description="Общее количество готовых напечатанных изделий и сборок, доступных для немедленной отгрузки."
              formula="Сумма (stock_quantity) по всем товарам"
              accentColor="amber"
              align="left"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-amber-400 transition-colors cursor-help" />
            </CustomTooltip>
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Package className="w-4 h-4" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
          {metrics.totalUnits} <span className="text-xs sm:text-sm text-gray-400 font-sans font-normal">шт</span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
          <span className="font-medium text-gray-300 font-mono">{metrics.inStockPositionsCount}</span>
          <span>из {totalProductsCount} позиций в наличии</span>
        </div>
      </div>

      {/* 2. Оценка склада (Розничная) */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-emerald-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

        <div className="flex items-center justify-between text-gray-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-gray-300">
            Оценка склада
            <CustomTooltip
              title="Оценка склада в розничных ценах"
              description="Потенциальная выручка при продаже всего текущего складского остатка товаров."
              formula="Сумма (Розничная цена × Остаток)"
              accentColor="emerald"
              align="center"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-emerald-400 transition-colors cursor-help" />
            </CustomTooltip>
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
          {formatCurrency(metrics.totalRetailValue, currencySymbol)}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
          <span>Потенциальная выручка</span>
        </div>
      </div>

      {/* 3. Себестоимость склада */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

        <div className="flex items-center justify-between text-gray-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-gray-300">
            Себестоимость
            <CustomTooltip
              title="Замороженная себестоимость"
              description="Фактические затраты на пластик, энергию, амортизацию и фурнитуру в товарах на складе."
              formula="Сумма (Себестоимость × Остаток)"
              accentColor="amber"
              align="center"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-amber-400 transition-colors cursor-help" />
            </CustomTooltip>
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tracking-tight">
          {formatCurrency(metrics.totalCostValue, currencySymbol)}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
          <span>Заморожено в сырье и печати</span>
        </div>
      </div>

      {/* 4. Чистая прибыль & Маржа */}
      <div className="bg-[#16181d] border border-[#242930] hover:border-[#FF6B00]/40 rounded-2xl p-4 transition-all duration-200 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6B00]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#FF6B00]/10 transition-colors" />

        <div className="flex items-center justify-between text-gray-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-gray-300">
            Чистая прибыль
            <CustomTooltip
              title="Потенциальная чистая прибыль"
              description="Чистый доход за вычетом всех производственных затрат при реализации остатка склада."
              formula="Оценка склада − Себестоимость склада"
              accentColor="amber"
              align="right"
            >
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-amber-400 transition-colors cursor-help" />
            </CustomTooltip>
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
          +{formatCurrency(metrics.potentialProfit, currencySymbol)}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
          {metrics.totalRetailValue > 0 ? (
            <span className="font-bold text-emerald-400 font-mono">
              {metrics.profitMargin.toFixed(1)}% средняя маржа
            </span>
          ) : (
            <span>при полной распродаже</span>
          )}
        </div>
      </div>
    </div>
  );
});
