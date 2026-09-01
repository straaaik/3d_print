import React from 'react';
import { formatCurrency } from '@/shared/lib/format';
import { TrendingUp, TrendingDown, Layers, ArrowUpRight, Package, Box, Boxes, Sparkles } from 'lucide-react';
import { Tooltip } from '@/shared/ui/Tooltip';
import { CockpitTiltCard } from '@/shared/ui/CockpitTiltCard';

interface ProductsV2KpiCardsProps {
  totalRetailValue: number;
  totalCostValue: number;
  potentialProfit: number;
  profitMargin: number;
  totalUnits: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  singleCount: number;
  assemblyCount: number;
  collectionCount: number;
  stlCount: number;
  bestsellerCount: number;
  currencySymbol?: string;
  isExpanded?: boolean;
  totalProductsCount: number;
}

export const ProductsV2KpiCards = React.memo(function ProductsV2KpiCards({
  totalRetailValue,
  totalCostValue,
  potentialProfit,
  profitMargin,
  totalUnits,
  inStockCount,
  lowStockCount,
  outOfStockCount,
  singleCount,
  assemblyCount,
  collectionCount,
  stlCount,
  bestsellerCount,
  currencySymbol = '₽',
  isExpanded = false,
  totalProductsCount,
}: ProductsV2KpiCardsProps) {
  const costRatio = totalRetailValue > 0 ? (totalCostValue / totalRetailValue) * 100 : 0;
  const averagePrice = totalProductsCount > 0 ? Math.round(totalRetailValue / Math.max(1, totalUnits || totalProductsCount)) : 0;
  const averageCost = totalProductsCount > 0 ? Math.round(totalCostValue / Math.max(1, totalUnits || totalProductsCount)) : 0;
  const averageProfit = totalProductsCount > 0 ? Math.round(potentialProfit / Math.max(1, totalUnits || totalProductsCount)) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3 select-none">
      
      {/* КАРТОЧКА 1: РОЗНИЧНАЯ СТОИМОСТЬ */}
      <CockpitTiltCard
        tone="cyan"
        className="p-3 sm:p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                РОЗНИЦА СКЛАДА
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Ср. цена позиции:</span>
                <span className="font-bold text-white tabular-nums">{formatCurrency(averagePrice, currencySymbol)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Всего единиц:</span>
                <span className="font-semibold text-emerald-400 tabular-nums">{totalUnits} шт.</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Всего позиций:</span>
                <span className="font-bold text-cyan-300 tabular-nums">{totalProductsCount} поз.</span>
              </div>
            </div>
          </div>
        )}
      >
        <div>
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
              РОЗНИЦА СКЛАДА
            </span>
            <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight leading-none mt-0.5">
            {formatCurrency(totalRetailValue, currencySymbol)}
          </div>
        </div>

        {/* Дополнительная подробная телеметрия в развернутом виде */}
        {isExpanded ? (
          <div className="mt-3 pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Ср. цена шт:</span>
              <span className="font-bold text-white">{formatCurrency(averagePrice, currencySymbol)}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>Всего в наличии:</span>
              <span className="text-emerald-400 font-semibold">{totalUnits} шт.</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400 pt-0.5 border-t border-white/5">
              <span>Позиций в каталоге:</span>
              <span className="text-cyan-300 font-bold px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/20">
                {totalProductsCount} поз.
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-1 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
            <span className="text-neutral-400">Всего позиций:</span>
            <span className="text-cyan-300 font-bold font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/20">
              {totalProductsCount}
            </span>
          </div>
        )}
      </CockpitTiltCard>

      {/* КАРТОЧКА 2: СЕБЕСТОИМОСТЬ СКЛАДА */}
      <CockpitTiltCard
        tone="rose"
        className="p-3 sm:p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                СЕБЕСТОИМОСТЬ
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Доля от розницы:</span>
                <span className="font-bold text-rose-400 tabular-nums">{costRatio.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Ср. затраты на шт:</span>
                <span className="font-semibold text-white tabular-nums">{formatCurrency(averageCost, currencySymbol)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Рентабельность:</span>
                <span className="font-bold text-emerald-400 tabular-nums">{(100 - costRatio).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
      >
        <div>
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
              СЕБЕСТОИМОСТЬ
            </span>
            <div className="p-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown className="w-3 h-3" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400 tracking-tight leading-none mt-0.5">
            {formatCurrency(totalCostValue, currencySymbol)}
          </div>
        </div>

        {/* Дополнительная подробная телеметрия в развернутом виде */}
        {isExpanded ? (
          <div className="mt-3 pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">Доля от розницы:</span>
              <span className="font-bold text-rose-400">{costRatio.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>Ср. себест/шт:</span>
              <span className="text-neutral-300 font-semibold">{formatCurrency(averageCost, currencySymbol)}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400 pt-0.5 border-t border-white/5">
              <span>Рентабельность:</span>
              <span className="text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                {(100 - costRatio).toFixed(1)}%
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-1 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
            <span className="text-neutral-400">От розницы:</span>
            <span className="text-rose-300 font-bold font-mono px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
              {costRatio.toFixed(1)}%
            </span>
          </div>
        )}
      </CockpitTiltCard>

      {/* КАРТОЧКА 3: ПОТЕНЦИАЛЬНАЯ ПРИБЫЛЬ */}
      <CockpitTiltCard
        tone="emerald"
        className="p-3 sm:p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                ПРИБЫЛЬ СКЛАДА
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Маржинальность:</span>
                <span className="font-bold text-emerald-400 tabular-nums">{profitMargin.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Ср. прибыль/шт:</span>
                <span className="font-semibold text-white tabular-nums">+{formatCurrency(averageProfit, currencySymbol)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Оценка прибыли:</span>
                <span className="font-bold text-emerald-400 tabular-nums">+{formatCurrency(potentialProfit, currencySymbol)}</span>
              </div>
            </div>
          </div>
        )}
      >
        <div>
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
              ПРИБЫЛЬ СКЛАДА
            </span>
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight leading-none mt-0.5">
            +{formatCurrency(potentialProfit, currencySymbol)}
          </div>
        </div>

        {/* Полоса прогресса маржинальности */}
        <div className="mt-2">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
            <div 
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-teal-500 to-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
              style={{ width: `${Math.min(100, Math.max(5, profitMargin))}%` }}
            />
          </div>
        </div>

        {/* Подвал карточки: Маржа и средняя прибыль */}
        <div className="mt-2 border-t border-white/5 pt-1.5 flex flex-col gap-1 text-[10px] font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">Маржа:</span>
              <span className={`px-1.5 py-0.2 rounded font-bold border ${
                profitMargin >= 50
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : profitMargin >= 25
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                {profitMargin.toFixed(1)}%
              </span>
            </div>

            <Tooltip content="Средняя расчетная маржинальность товаров в каталоге">
              <span className="text-neutral-400 text-[10px]">
                {profitMargin >= 50 ? 'Высокая' : 'Стандарт'}
              </span>
            </Tooltip>
          </div>

          {isExpanded && (
            <div className="flex items-center justify-between text-neutral-400 pt-0.5 border-t border-white/5">
              <span>Ср. прибыль/шт:</span>
              <span className="text-emerald-400 font-bold">+{formatCurrency(averageProfit, currencySymbol)}</span>
            </div>
          )}
        </div>
      </CockpitTiltCard>

      {/* КАРТОЧКА 4: ОСТАТКИ НА СКЛАДЕ */}
      <CockpitTiltCard
        tone="amber"
        className="p-3 sm:p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                ОСТАТКИ ГОТОВОГО
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">В наличии:</span>
                <span className="font-bold text-emerald-400 tabular-nums">{inStockCount} поз.</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Мало (≤ 2 шт):</span>
                <span className="font-semibold text-amber-300 tabular-nums">{lowStockCount} поз.</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Под заказ:</span>
                <span className="font-bold text-neutral-400 tabular-nums">{outOfStockCount} поз.</span>
              </div>
            </div>
          </div>
        )}
      >
        <div>
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
              ОСТАТКИ ГОТОВОГО
            </span>
            <div className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Boxes className="w-3 h-3" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tracking-tight leading-none mt-0.5">
            {totalUnits} шт
          </div>
        </div>

        {/* Дополнительная подробная телеметрия в развернутом виде */}
        {isExpanded ? (
          <div className="mt-3 pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-neutral-400">В наличии:</span>
              <span className="font-bold text-emerald-400">{inStockCount} поз.</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>Мало (≤2 шт):</span>
              <span className="text-amber-300 font-semibold">{lowStockCount} поз.</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400 pt-0.5 border-t border-white/5">
              <span>Под заказ (0 шт):</span>
              <span className="text-neutral-400 font-bold px-1.5 py-0.2 rounded bg-white/5 border border-white/10">
                {outOfStockCount} поз.
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-1 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
            <span className="text-neutral-400">В наличии:</span>
            <span className="text-amber-300 font-bold font-mono px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
              {inStockCount} поз.
            </span>
          </div>
        )}
      </CockpitTiltCard>

      {/* КАРТОЧКА 5: СТРУКТУРА КАТАЛОГА */}
      <CockpitTiltCard
        tone="sky"
        className="p-3 sm:p-3.5 flex flex-col justify-between"
        backContent={(
          <div className="flex h-full flex-col justify-between font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                СТРУКТУРА КАТАЛОГА
              </span>
            </div>
            <div className="my-auto space-y-2 py-1">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Сборок:</span>
                <span className="font-bold text-cyan-300 tabular-nums">{assemblyCount} шт.</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">Коллекций:</span>
                <span className="font-semibold text-purple-300 tabular-nums">{collectionCount} шт.</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-400">STL моделей:</span>
                <span className="font-bold text-emerald-400 tabular-nums">{stlCount} шт.</span>
              </div>
            </div>
          </div>
        )}
      >
        <div>
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
              СТРУКТУРА КАТАЛОГА
            </span>
            <div className="p-1 rounded bg-white/5 text-neutral-300 border border-white/10">
              <Layers className="w-3 h-3" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight leading-none">
              {singleCount} шт
            </span>
            {assemblyCount > 0 && (
              <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                <Layers className="w-3 h-3" /> {assemblyCount} сб
              </span>
            )}
          </div>
        </div>

        {/* Дополнительная подробная телеметрия в развернутом виде */}
        {isExpanded ? (
          <div className="mt-3 pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="text-purple-300">Коллекций: {collectionCount}</span>
              <span className="text-cyan-400">STL: {stlCount}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400 pt-0.5 border-t border-white/5">
              <span>Хитов продаж:</span>
              <span className="text-white font-bold px-1.5 py-0.2 rounded bg-white/10 border border-white/15">
                {bestsellerCount} товаров
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-1 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-neutral-400">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-purple-300 font-medium">{collectionCount} колл.</span>
              <span className="text-neutral-600">•</span>
              <span className="text-cyan-400 font-medium">{stlCount} STL</span>
            </div>
          </div>
        )}
      </CockpitTiltCard>

    </div>
  );
});
