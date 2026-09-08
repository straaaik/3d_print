'use client';

import React from 'react';
import { ProductCollection, SavedCalculation } from '../../../../shared/types';
import { formatCurrency } from '../../../../shared/lib/format';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { CockpitStatusPill } from '../../../../shared/ui/CockpitTable/CockpitStatusPill';
import { Tooltip } from '../../../../shared/ui/Tooltip';
import {
  Folder,
  Plus,
  Minus,
  ShoppingCart,
  Calculator,
  Edit2,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { motion } from 'motion/react';

interface CollectionExpandedRowProps {
  collection: ProductCollection;
  items: SavedCalculation[];
  currencySymbol?: string;
  onOpenAddVariantModal: (col: ProductCollection) => void;
  onOpenEditCollection: (col: ProductCollection) => void;
  onSelectProduct?: (item: SavedCalculation) => void;
  onOpenQuickEditModal?: (item: SavedCalculation) => void;
  onCreateOrder?: (item: SavedCalculation) => void;
  onLoadIntoCalculator?: (item: SavedCalculation) => void;
  onSetStock?: (item: SavedCalculation, newStock: number) => void;
}

export function CollectionExpandedRow({
  collection,
  items,
  currencySymbol = '₽',
  onOpenAddVariantModal,
  onOpenEditCollection,
  onSelectProduct,
  onOpenQuickEditModal,
  onCreateOrder,
  onLoadIntoCalculator,
  onSetStock,
}: CollectionExpandedRowProps) {
  const totalStock = items.reduce((acc, it) => acc + (it.stock_quantity || 0), 0);
  const prices = items.map((it) => it.final_price || 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const priceDisplay =
    prices.length === 0
      ? '—'
      : minPrice === maxPrice
      ? formatCurrency(minPrice, currencySymbol)
      : `${formatCurrency(minPrice, currencySymbol)} – ${formatCurrency(maxPrice, currencySymbol)}`;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden border-t border-white/10 bg-neutral-950/95"
    >
      <div className="p-3 sm:p-4 space-y-3 font-mono text-xs">
        {/* Cockpit Header */}
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-white/10 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-300">
              <Folder size={14} className="text-neutral-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide text-xs uppercase">
                  КОЛЛЕКЦИЯ // {collection.name}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 text-[10px] font-mono">
                  {items.length} ПОЗИЦИЙ
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    totalStock > 0
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                      : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                  }`}
                >
                  НА СКЛАДЕ: {totalStock} ШТ
                </span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-2">
                <span>ДИАПАЗОН ЦЕН: <span className="text-neutral-300 font-semibold">{priceDisplay}</span></span>
                {collection.category && (
                  <>
                    <span>•</span>
                    <span>КАТЕГОРИЯ: <span className="text-neutral-400">{collection.category}</span></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CockpitButton
              size="sm"
              icon={Plus}
              onClick={() => onOpenAddVariantModal(collection)}
            >
              Добавить вариант
            </CockpitButton>
            <CockpitButton
              size="sm"
              icon={Edit2}
              onClick={() => onOpenEditCollection(collection)}
            >
              Свойства
            </CockpitButton>
          </div>
        </div>

        {/* Список товаров внутри коллекции */}
        {items.length === 0 ? (
          <div className="py-6 px-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-2">
            <p className="text-neutral-400 font-sans text-xs">
              В этой коллекции пока нет позиций
            </p>
            <CockpitButton
              size="sm"
              icon={Plus}
              onClick={() => onOpenAddVariantModal(collection)}
            >
              Добавить первую позицию
            </CockpitButton>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
            {items.map((item) => {
              const currentStock = item.stock_quantity || 0;
              const profit = (item.final_price || 0) - (item.base_cost || 0);

              return (
                <div
                  key={item.id}
                  className="p-2.5 sm:px-3 sm:py-2 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Левая часть: иерархия, плашка, название */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-neutral-600 font-bold select-none shrink-0 font-mono">
                      └─
                    </span>

                    {/* Название позиции */}
                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onSelectProduct?.(item)}
                        className="font-medium text-white hover:text-cyan-300 text-left truncate max-w-[280px] sm:max-w-md cursor-pointer flex items-center gap-1 group/btn"
                        title="Открыть детали позиции"
                      >
                        <span className="truncate">{item.name}</span>
                        <ArrowUpRight
                          size={11}
                          className="opacity-0 group-hover/btn:opacity-100 text-cyan-400 transition-opacity shrink-0"
                        />
                      </button>

                      {item.type === 'assembly' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 shrink-0 flex items-center gap-0.5">
                          <Layers size={9} />
                          <span>Сборка</span>
                        </span>
                      )}

                      <span className="text-[10px] text-neutral-500 shrink-0 font-mono">
                        #{item.id.slice(0, 6)}
                      </span>
                    </div>
                  </div>

                  {/* Центр: Технические параметры */}
                  <div className="hidden md:flex items-center gap-3 text-[11px] text-neutral-400 shrink-0">
                    {item.weight_g ? (
                      <span className="font-mono tabular-nums">{item.weight_g} г</span>
                    ) : null}
                    {(item.hours || item.minutes) ? (
                      <span className="font-mono tabular-nums">
                        {item.hours ? `${item.hours}ч ` : ''}
                        {item.minutes ? `${item.minutes}м` : ''}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-mono bg-white/[0.03] text-neutral-300 border border-white/10 max-w-[130px]">
                      <span
                        className="w-2 h-2 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: item.filament_color || '#3b82f6' }}
                      />
                      <span className="truncate max-w-[90px]">
                        {item.filament_name || 'PLA'}
                      </span>
                    </span>
                  </div>

                  {/* Склад и Быстрое изменение наличия */}
                  <div className="flex items-center gap-1.5 shrink-0 select-none">
                    {onSetStock && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetStock(item, Math.max(0, currentStock - 1));
                        }}
                        disabled={currentStock <= 0}
                        title="Уменьшить остаток на 1"
                        className="w-5 h-5 rounded flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        <Minus size={10} />
                      </button>
                    )}

                    <CockpitStatusPill
                      label={`${currentStock} шт`}
                      tone={currentStock > 2 ? 'emerald' : currentStock > 0 ? 'amber' : 'neutral'}
                      dot={currentStock > 0}
                    />

                    {onSetStock && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetStock(item, currentStock + 1);
                        }}
                        title="Увеличить остаток на 1"
                        className="w-5 h-5 rounded flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
                      >
                        <Plus size={10} />
                      </button>
                    )}
                  </div>

                  {/* Цены */}
                  <div className="text-right shrink-0 min-w-[90px]">
                    <div className="font-bold text-white font-mono text-xs">
                      {formatCurrency(item.final_price || 0, currencySymbol)}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      себест. {formatCurrency(item.base_cost || 0, currencySymbol)}
                    </div>
                  </div>

                  {/* Быстрые действия */}
                  <div className="flex items-center gap-1 shrink-0">
                    {onCreateOrder && (
                      <Tooltip content="Создать заказ с этой позицией">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateOrder(item);
                          }}
                          className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white hover:text-neutral-950 text-neutral-300 transition-colors cursor-pointer"
                        >
                          <ShoppingCart size={12} />
                        </button>
                      </Tooltip>
                    )}

                    {onLoadIntoCalculator && (
                      <Tooltip content="Открыть в калькуляторе стоимости">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLoadIntoCalculator(item);
                          }}
                          className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Calculator size={12} />
                        </button>
                      </Tooltip>
                    )}

                    {onOpenQuickEditModal && (
                      <Tooltip content="Редактировать параметры позиции">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenQuickEditModal(item);
                          }}
                          className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
