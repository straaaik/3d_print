import React from 'react';
import { WarehouseMetrics } from '../types';
import { formatCurrency } from '../../../shared/lib/format';
import { CustomTooltip } from '../../../shared/ui/Tooltip';
import { HelpCircle } from 'lucide-react';

interface ProductsSummaryProps {
  metrics: WarehouseMetrics;
  totalProductsCount: number;
  currencySymbol: string;
  singleCount?: number;
  assemblyCount?: number;
  collectionsCount?: number;
  lowStockCount?: number;
}

export const ProductsSummary = React.memo(function ProductsSummary({
  metrics,
  totalProductsCount,
  currencySymbol,
  singleCount = 0,
  assemblyCount = 0,
  collectionsCount = 0,
  lowStockCount = 0,
}: ProductsSummaryProps) {
  const stockPercentage = totalProductsCount > 0 
    ? Math.min(100, Math.round((metrics.inStockPositionsCount / totalProductsCount) * 100))
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 select-none">
      {/* 1. Оценка склада (Выручка) */}
      <div className="border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all p-3.5 rounded-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
              Оценка склада (розница)
            </span>
            <CustomTooltip
              title="Оценка склада в розничных ценах"
              description="Потенциальная выручка при продаже всего текущего складского остатка товаров."
              formula="Сумма (Розничная цена × Остаток)"
              accentColor="cyan"
              align="left"
            >
              <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white transition-colors cursor-help" />
            </CustomTooltip>
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-white font-mono">
              {formatCurrency(metrics.totalRetailValue, currencySymbol)}
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              +{metrics.profitMargin.toFixed(1)}%
            </span>
          </div>

          <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${stockPercentage}%` }}
            />
          </div>
        </div>

        <span className="text-[10px] font-mono text-neutral-400 mt-2 block">
          {metrics.inStockPositionsCount} из {totalProductsCount} позиций в наличии
        </span>
      </div>

      {/* 2. Чистая прибыль */}
      <div className="border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all p-3.5 rounded-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
              Чистая прибыль склада
            </span>
            <CustomTooltip
              title="Потенциальная чистая прибыль"
              description="Чистый доход за вычетом всех производственных затрат при реализации остатка склада."
              formula="Оценка склада − Себестоимость склада"
              accentColor="emerald"
              align="center"
            >
              <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white transition-colors cursor-help" />
            </CustomTooltip>
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
              +{formatCurrency(metrics.potentialProfit, currencySymbol)}
            </span>
            <span className="text-[11px] font-mono text-neutral-400">
              {metrics.profitMargin.toFixed(1)}% маржа
            </span>
          </div>
        </div>

        <span className="text-[10px] font-mono text-neutral-400 mt-3 block">
          Себестоимость: {formatCurrency(metrics.totalCostValue, currencySymbol)}
        </span>
      </div>

      {/* 3. Позиций в каталоге */}
      <div className="border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all p-3.5 rounded-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
              Позиций в каталоге
            </span>
            <CustomTooltip
              title="Позиции каталога 3D Labs"
              description="Общее число созданных карточек товаров, включая сборки и коллекции."
              formula="Кол-во сохраненных моделей"
              accentColor="cyan"
              align="center"
            >
              <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white transition-colors cursor-help" />
            </CustomTooltip>
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-white font-mono">
              {totalProductsCount}
            </span>
            <span className="text-[11px] font-mono text-cyan-400">
              {singleCount} деталей
            </span>
          </div>
        </div>

        <span className="text-[10px] font-mono text-neutral-400 mt-3 block">
          {assemblyCount} сборок · {collectionsCount} коллекций
        </span>
      </div>

      {/* 4. Складской остаток и дефицит */}
      <div className="border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all p-3.5 rounded-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
              Складские остатки
            </span>
            <CustomTooltip
              title="Остаток готовой продукции"
              description="Общее количество готовых изделий на складе, готовых к мгновенной отгрузке."
              formula="Сумма (stock_quantity)"
              accentColor="amber"
              align="right"
            >
              <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white transition-colors cursor-help" />
            </CustomTooltip>
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-bold font-mono ${lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {metrics.totalUnits} <span className="text-xs font-normal text-neutral-400 font-sans">шт</span>
            </span>
            {lowStockCount > 0 ? (
              <span className="text-[11px] font-mono text-amber-400">
                {lowStockCount} в дефиците
              </span>
            ) : (
              <span className="text-[11px] font-mono text-emerald-400">
                Готово к отгрузке
              </span>
            )}
          </div>
        </div>

        <span className="text-[10px] font-mono text-neutral-400 mt-3 block">
          {lowStockCount > 0 ? `Критический остаток (≤ 2 шт): ${lowStockCount}` : 'Склад в оптимальном состоянии'}
        </span>
      </div>
    </div>
  );
});

