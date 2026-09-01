import React from 'react';
import { WarehouseMetrics } from '../types';
import { formatCurrency } from '../../../shared/lib/format';
import { CustomTooltip } from '../../../shared/ui/Tooltip';
import { HelpCircle } from 'lucide-react';
import { CockpitTiltCard } from '../../../shared/ui/CockpitTiltCard';

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
      <CockpitTiltCard
        tone="cyan"
        className="p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                ОЦЕНКА СКЛАДА
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">В наличии:</span>
                <span className="font-semibold text-emerald-400 tabular-nums">{metrics.inStockPositionsCount} из {totalProductsCount} поз.</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Заполненность:</span>
                <span className="font-bold text-cyan-300 tabular-nums">{stockPercentage}%</span>
              </div>
            </div>
          </div>
        )}
      >
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
      </CockpitTiltCard>

      {/* 2. Чистая прибыль */}
      <CockpitTiltCard
        tone="emerald"
        className="p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                ЧИСТАЯ ПРИБЫЛЬ
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Себестоимость:</span>
                <span className="font-bold text-rose-400 tabular-nums">{formatCurrency(metrics.totalCostValue, currencySymbol)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Маржа каталога:</span>
                <span className="font-bold text-emerald-400 tabular-nums">{metrics.profitMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
      >
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
      </CockpitTiltCard>

      {/* 3. Позиций в каталоге */}
      <CockpitTiltCard
        tone="cyan"
        className="p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                ПОЗИЦИИ КАТАЛОГА
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Одиночных деталей:</span>
                <span className="font-bold text-white tabular-nums">{singleCount} шт.</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Сборок:</span>
                <span className="font-semibold text-cyan-300 tabular-nums">{assemblyCount} шт.</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Коллекций:</span>
                <span className="font-semibold text-purple-300 tabular-nums">{collectionsCount} шт.</span>
              </div>
            </div>
          </div>
        )}
      >
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
      </CockpitTiltCard>

      {/* 4. Складской остаток и дефицит */}
      <CockpitTiltCard
        tone={lowStockCount > 0 ? 'amber' : 'emerald'}
        className="p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                СКЛАДСКИЕ ОСТАТКИ
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Всего изделий:</span>
                <span className="font-bold text-white tabular-nums">{metrics.totalUnits} шт.</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Дефицит (≤ 2 шт):</span>
                <span className="font-semibold text-amber-300 tabular-nums">{lowStockCount} поз.</span>
              </div>
            </div>
          </div>
        )}
      >
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
      </CockpitTiltCard>
    </div>
  );
});

