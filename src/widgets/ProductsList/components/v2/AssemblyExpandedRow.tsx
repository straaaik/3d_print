'use client';

import React, { useState } from 'react';
import {
  Layers,
  Box,
  Wrench,
  Cpu,
  Clock,
  FileCode,
  ShoppingCart,
  Calculator,
  Edit2,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SavedCalculation,
  AssemblyPrintedPart,
  AssemblyHardwareItem,
  AssemblyElectronicsItem,
  Filament,
} from '../../../../shared/types';
import { CatalogTableRow, SalesStatInfo } from '../../types';
import { formatCurrency } from '../../../../shared/lib/format';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { AssemblyPartDrawer, convertPartToSavedCalculation } from './AssemblyPartDrawer';
import {
  ROW_ELEVATION_EASE,
  DRAWER_EXPAND_DURATION,
  ROW_ELEVATION_DURATION,
  DRAWER_OPACITY_DURATION,
} from '../../../../shared/lib/tableScrollHelper';

export const PRODUCTS_EXPANDED_COLUMNS = '112px 96px 144px minmax(220px,1.5fr) 136px 128px 144px 144px 144px 144px 112px 96px 160px';
export const PRODUCTS_COMPACT_COLUMNS = '112px 136px minmax(200px,1.5fr) 128px 120px 136px 156px 144px 160px';

interface AssemblyExpandedRowProps {
  assembly: SavedCalculation;
  currencySymbol?: string;
  mode?: 'expanded' | 'compact' | 'cards';
  searchQuery?: string;
  onOpenQuickEditModal?: (item: SavedCalculation) => void;
  onCreateOrder?: (item: SavedCalculation) => void;
  onLoadIntoCalculator?: (item: SavedCalculation) => void;
  onOpenStlModal?: (item: SavedCalculation) => void;
  onInlineUpdateProduct?: (productId: string, updates: Partial<SavedCalculation>) => void;
  categoriesList?: { id: string; label: string }[];
  filaments?: Filament[];
  salesStat?: SalesStatInfo;
  elevatedRow?: CatalogTableRow | null;
  setElevatedRow?: (row: CatalogTableRow | null) => void;
  expandedPartIndex?: number | null;
  onTogglePartIndex?: (index: number | null) => void;
}

export function AssemblyExpandedRow({
  assembly,
  currencySymbol = '₽',
  mode = 'expanded',
  searchQuery = '',
  onOpenQuickEditModal,
  onCreateOrder,
  onLoadIntoCalculator,
  onOpenStlModal,
  onInlineUpdateProduct,
  categoriesList,
  filaments,
  salesStat,
  elevatedRow,
  setElevatedRow,
  expandedPartIndex: controlledExpandedPartIndex,
  onTogglePartIndex,
}: AssemblyExpandedRowProps) {
  const hasDispatcher = Boolean(
    (React as unknown as { __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H?: unknown } })
      ?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?.H ||
    (React as unknown as { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: { ReactCurrentDispatcher?: { current?: unknown } } })
      ?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher?.current
  );

  let internalExpandedIndex: number | null = null;
  let setInternalExpandedIndex: React.Dispatch<React.SetStateAction<number | null>> = () => {};

  if (hasDispatcher) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    [internalExpandedIndex, setInternalExpandedIndex] = useState<number | null>(null);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      if (!elevatedRow) {
        setInternalExpandedIndex(null);
      }
    }, [elevatedRow]);
  }

  const activeExpandedPartIndex = controlledExpandedPartIndex !== undefined
    ? controlledExpandedPartIndex
    : internalExpandedIndex;

  const isAnyElevated = Boolean(elevatedRow);

  const handleTogglePartIndex = (idx: number | null) => {
    const nextVal = activeExpandedPartIndex === idx ? null : idx;
    if (onTogglePartIndex) {
      onTogglePartIndex(nextVal);
    }
    setInternalExpandedIndex(nextVal);
  };

  const handleTogglePart = (partIdx: number, rowToElevate: CatalogTableRow) => {
    const isCurrentlyElevated = setElevatedRow !== undefined
      ? Boolean(elevatedRow && elevatedRow.id === rowToElevate.id)
      : elevatedRow
      ? elevatedRow.id === rowToElevate.id
      : activeExpandedPartIndex === partIdx;
    if (isCurrentlyElevated) {
      if (setElevatedRow) setElevatedRow(null);
      handleTogglePartIndex(null);
    } else {
      if (setElevatedRow) setElevatedRow(rowToElevate);
      handleTogglePartIndex(partIdx);
    }
  };

  const getPartRow = (part: AssemblyPrintedPart, idx: number): CatalogTableRow => {
    const partCalc = convertPartToSavedCalculation(part, assembly, idx);
    return {
      rowKind: 'product',
      id: partCalc.id,
      item: partCalc,
      parentCollectionName: assembly.name,
      parentCollectionColor: '#06b6d4',
      isPart: true,
      name: partCalc.name,
      category: partCalc.category,
      final_price: partCalc.final_price,
      base_cost: partCalc.base_cost,
      stock_quantity: partCalc.quantity,
      weight_g: partCalc.weight_g,
      hours: partCalc.hours,
      minutes: partCalc.minutes,
      created_at: partCalc.created_at,
    };
  };

  const parts: AssemblyPrintedPart[] = assembly.assembly_parts || [];
  const hardware: AssemblyHardwareItem[] = assembly.assembly_hardware || [];
  const electronics: AssemblyElectronicsItem[] = assembly.assembly_electronics || [];

  const isAnyPartElevated = parts.some((part, idx) => {
    const pRow = getPartRow(part, idx);
    return setElevatedRow !== undefined
      ? Boolean(elevatedRow && elevatedRow.id === pRow.id)
      : elevatedRow
      ? elevatedRow.id === pRow.id
      : activeExpandedPartIndex === idx;
  });

  const query = (searchQuery || '').trim().toLowerCase();

  const isPartMatch = (p: AssemblyPrintedPart) => {
    if (!query) return false;
    return Boolean(
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.filament_name && p.filament_name.toLowerCase().includes(query)) ||
      (p.printer_name && p.printer_name.toLowerCase().includes(query)) ||
      (p.id && p.id.toLowerCase().includes(query))
    );
  };

  const isHwMatch = (h: AssemblyHardwareItem) => {
    if (!query) return false;
    return Boolean(
      (h.name && h.name.toLowerCase().includes(query)) ||
      (h.id && h.id.toLowerCase().includes(query))
    );
  };

  const isElMatch = (e: AssemblyElectronicsItem) => {
    if (!query) return false;
    return Boolean(
      (e.name && e.name.toLowerCase().includes(query)) ||
      (e.id && e.id.toLowerCase().includes(query))
    );
  };

  const matchedPartsCount = parts.filter(isPartMatch).length;
  const matchedHwCount = hardware.filter(isHwMatch).length;
  const matchedElCount = electronics.filter(isElMatch).length;

  const laborMins = assembly.assembly_labor_minutes || 0;
  const laborCost = assembly.assembly_labor_cost || 0;
  const baseCost = assembly.base_cost || 0;
  const finalPrice = assembly.final_price || 0;
  const profit = Math.round((finalPrice - baseCost) * 100) / 100;
  const marginPercent = finalPrice > 0 ? Math.round((profit / finalPrice) * 1000) / 10 : 0;
  const profitDisplay = profit < 0
    ? `−${formatCurrency(Math.abs(profit), currencySymbol)}`
    : profit > 0
      ? `+${formatCurrency(profit, currencySymbol)}`
      : formatCurrency(0, currencySymbol);

  // Сводка по печатным деталям
  const totalWeight = parts.reduce((acc, p) => acc + (p.weight_g || 0) * (p.quantity || 1), 0);
  const partsCost = parts.reduce((acc, p) => acc + (p.base_cost || 0) * (p.quantity || 1), 0);
  const partsPrice = parts.reduce((acc, p) => acc + (p.final_price || p.base_cost || 0) * (p.quantity || 1), 0);

  // Сводка по крепежу
  const totalHwPieces = hardware.reduce((acc, h) => acc + (h.quantity || 1), 0);
  const hwCost = hardware.reduce((acc, h) => acc + (h.cost_per_unit || 0) * (h.quantity || 1), 0);
  const hwPrice = hardware.reduce((acc, h) => acc + (h.price_per_unit || h.cost_per_unit || 0) * (h.quantity || 1), 0);

  // Сводка по электронике
  const totalElPieces = electronics.reduce((acc, el) => acc + (el.quantity || 1), 0);
  const elCost = electronics.reduce((acc, el) => acc + (el.cost_per_unit || 0) * (el.quantity || 1), 0);
  const elPrice = electronics.reduce((acc, el) => acc + (el.price_per_unit || el.cost_per_unit || 0) * (el.quantity || 1), 0);

  const isEmpty = parts.length === 0 && hardware.length === 0 && electronics.length === 0;
  const isCompact = mode === 'compact';
  const gridCols = isCompact ? PRODUCTS_COMPACT_COLUMNS : PRODUCTS_EXPANDED_COLUMNS;

  // Мобильный режим карточек
  if (mode === 'cards') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full bg-neutral-950/95 font-mono text-xs border-y border-cyan-500/20"
      >
        <div className="p-3 space-y-3">
          {isEmpty ? (
            <div className="py-6 px-4 text-center space-y-2 text-neutral-500">
              <p className="text-xs text-neutral-400">В спецификации сборки пока нет компонентов</p>
              {onOpenQuickEditModal && (
                <CockpitButton size="sm" icon={Edit2} onClick={() => onOpenQuickEditModal(assembly)}>
                  Редактировать состав
                </CockpitButton>
              )}
            </div>
          ) : (
            <>
              {/* Секция печатных деталей */}
              {parts.length > 0 && (
                <div className="space-y-2">
                  <motion.div
                    animate={{ opacity: isAnyPartElevated ? 0.35 : 1 }}
                    transition={{ opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE } }}
                    className="bg-cyan-950/30 border border-cyan-500/20 rounded-lg py-1.5 px-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold flex-wrap">
                      <span>┌─ [ПЕЧАТНЫЕ ДЕТАЛИ]</span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-neutral-300 font-normal">{parts.length} дет.</span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-neutral-400 font-normal tabular-nums">{totalWeight} г</span>
                      {matchedPartsCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          Найдено: {matchedPartsCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-cyan-400 font-mono font-bold tabular-nums">
                      {formatCurrency(partsPrice, currencySymbol)}
                    </span>
                  </motion.div>
                  <div className="space-y-1.5 pl-2">
                    {parts.map((part, idx) => {
                      const partRow = getPartRow(part, idx);
                      const isPartElevated = setElevatedRow !== undefined
                        ? Boolean(elevatedRow && elevatedRow.id === partRow.id)
                        : elevatedRow
                        ? elevatedRow.id === partRow.id
                        : activeExpandedPartIndex === idx;
                      const isPartBlurred = Boolean(elevatedRow) && !isPartElevated;
                      const isMatched = isPartMatch(part);
                      const qty = part.quantity || 1;
                      const pWeight = (part.weight_g || 0) * qty;
                      const pCost = (part.base_cost || 0) * qty;
                      const pPrice = (part.final_price || part.base_cost || 0) * qty;
                      const pProfit = pPrice - pCost;
                      const pProfitDisplay = pProfit < 0
                        ? `−${formatCurrency(Math.abs(pProfit), currencySymbol)}`
                        : pProfit > 0
                          ? `+${formatCurrency(pProfit, currencySymbol)}`
                          : formatCurrency(0, currencySymbol);

                      return (
                        <motion.div
                          key={part.id || `part-${idx}`}
                          animate={{
                            y: isPartElevated ? -8 : 0,
                            scale: isPartElevated ? 1.02 : 1,
                            opacity: isPartBlurred ? 0.35 : 1,
                            backgroundColor: isPartElevated
                              ? 'rgba(15, 15, 15, 0.98)'
                              : isMatched
                              ? 'rgba(6, 182, 212, 0.15)'
                              : 'rgba(255, 255, 255, 0.02)',
                            borderColor: isPartElevated
                              ? 'rgba(255, 255, 255, 0.4)'
                              : isMatched
                              ? 'rgba(6, 182, 212, 0.4)'
                              : 'rgba(255, 255, 255, 0.1)',
                            borderRadius: isPartElevated ? 12 : 8,
                            boxShadow: isPartElevated
                              ? '0 20px 40px -10px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.2)'
                              : 'none',
                          }}
                          transition={{
                            y: { duration: ROW_ELEVATION_DURATION, ease: ROW_ELEVATION_EASE },
                            scale: { duration: ROW_ELEVATION_DURATION, ease: ROW_ELEVATION_EASE },
                            opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE },
                            borderRadius: { duration: 0.58, ease: ROW_ELEVATION_EASE },
                            boxShadow: { duration: ROW_ELEVATION_DURATION, ease: ROW_ELEVATION_EASE },
                          }}
                          className={`w-full block space-y-1 rounded-lg border p-2.5 transition-colors cursor-pointer ${
                            isPartElevated
                              ? '!z-50 relative'
                              : isPartBlurred
                              ? 'pointer-events-none select-none'
                              : 'hover:bg-white/[0.04]'
                          }`}
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftStyle: 'solid',
                            borderLeftColor: '#06b6d4',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePart(idx, partRow);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0" aria-label="Компонент">
                              <span className="text-cyan-400 font-bold text-xs select-none">└─</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/40">
                                {part.id ? `#${part.id.slice(0, 6)}` : `#PRT-${idx + 1}`}
                              </span>
                              <span className="font-sans font-medium text-xs text-white truncate" title={part.name}>
                                {part.name || 'Деталь'}
                              </span>
                              {isMatched && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                                  НАЙДЕНО
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-cyan-800/40 bg-cyan-950/40 text-cyan-300 tabular-nums" aria-label="Кол-во">
                                {qty} шт
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-cyan-400 transition-transform duration-200 ${
                                  isPartElevated ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-neutral-400 flex-wrap">
                            <span className="inline-flex items-center gap-1" aria-label="Материал">
                              <span
                                aria-label="Цвет материала"
                                className="w-2 h-2 rounded-full border border-white/20 shrink-0"
                                style={{ backgroundColor: part.filament_color || '#06b6d4' }}
                              />
                              <span>{part.filament_name || 'PLA'}</span>
                            </span>
                            {pWeight > 0 && (
                              <>
                                <span className="text-neutral-600">•</span>
                                <span className="tabular-nums" aria-label="Общий вес">{pWeight} г</span>
                              </>
                            )}
                            {(part.hours || part.minutes) && (
                              <>
                                <span className="text-neutral-600">•</span>
                                <span className="tabular-nums">
                                  {part.hours ? `${part.hours}ч ` : ''}{part.minutes ? `${part.minutes}м` : ''}
                                </span>
                              </>
                            )}
                            {(part.stl_url || part.stl_file_data || part.stl_file_name) && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 inline-flex items-center gap-0.5">
                                <FileCode className="w-2.5 h-2.5" />
                                <span>STL</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                            <span className="text-neutral-500 tabular-nums">
                              себест. {formatCurrency(pCost, currencySymbol)}
                            </span>
                            <div className="flex items-center gap-2" aria-label="Сумма">
                              <span className="text-white font-bold tabular-nums">
                                {formatCurrency(pPrice, currencySymbol)}
                              </span>
                              <span className={`tabular-nums text-[10px] ${pProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ({pProfitDisplay})
                              </span>
                            </div>
                          </div>

                          <AnimatePresence initial={false}>
                            {isPartElevated && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  height: { duration: DRAWER_EXPAND_DURATION, ease: ROW_ELEVATION_EASE },
                                  opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE },
                                }}
                                className="w-full overflow-hidden block rounded-lg border-t border-white/10 pt-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AssemblyPartDrawer
                                  part={part}
                                  partIndex={idx}
                                  parentAssembly={assembly}
                                  currencySymbol={currencySymbol}
                                  onClose={() => {
                                    if (setElevatedRow) setElevatedRow(null);
                                    handleTogglePartIndex(null);
                                  }}
                                  onOpenQuickEditModal={onOpenQuickEditModal}
                                  onCreateOrder={onCreateOrder}
                                  onLoadIntoCalculator={onLoadIntoCalculator}
                                  onOpenStlModal={onOpenStlModal}
                                  onInlineUpdateProduct={onInlineUpdateProduct}
                                  categoriesList={categoriesList}
                                  filaments={filaments}
                                  salesStat={salesStat}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Секция крепежа и фурнитуры */}
              {hardware.length > 0 && (
                <motion.div
                  animate={{ opacity: isAnyElevated ? 0.35 : 1 }}
                  transition={{ opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE } }}
                  className={`space-y-2 ${isAnyElevated ? 'pointer-events-none select-none' : ''}`}
                >
                  <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg py-1.5 px-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold flex-wrap">
                      <span>┌─ [КРЕПЁЖ И ФУРНИТУРА]</span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-neutral-300 font-normal">{hardware.length} поз.</span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-neutral-400 font-normal tabular-nums">{totalHwPieces} шт</span>
                      {matchedHwCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Найдено: {matchedHwCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-amber-400 font-mono font-bold tabular-nums">
                      {formatCurrency(hwPrice, currencySymbol)}
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-2">
                    {hardware.map((item, idx) => {
                      const isMatched = isHwMatch(item);
                      const qty = item.quantity || 1;
                      const hCost = (item.cost_per_unit || 0) * qty;
                      const hPrice = (item.price_per_unit || item.cost_per_unit || 0) * qty;
                      const hProfit = hPrice - hCost;
                      const hProfitDisplay = hProfit < 0
                        ? `−${formatCurrency(Math.abs(hProfit), currencySymbol)}`
                        : hProfit > 0
                          ? `+${formatCurrency(hProfit, currencySymbol)}`
                          : formatCurrency(0, currencySymbol);

                      return (
                        <div
                          key={item.id || `hw-${idx}`}
                          className={`border rounded-lg p-2.5 space-y-1.5 transition-colors ${
                            isMatched
                              ? 'border-amber-400/50 bg-amber-950/40 ring-1 ring-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                          }`}
                          style={{ borderLeftWidth: '3px', borderLeftColor: '#f59e0b' }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0" aria-label="Компонент">
                              <span className="text-amber-400 font-bold text-xs select-none">└─</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-800/40">
                                {item.id ? `#${item.id.slice(0, 6)}` : `#HW-${idx + 1}`}
                              </span>
                              <span className="font-sans font-medium text-xs text-white truncate" title={item.name}>
                                {item.name || 'Крепёж'}
                              </span>
                              {isMatched && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                  НАЙДЕНО
                                </span>
                              )}
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-amber-800/40 bg-amber-950/40 text-amber-300 tabular-nums shrink-0" aria-label="Кол-во">
                              {qty} шт
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/[0.03] text-neutral-400 border border-white/10" aria-label="Материал">
                              Металл / крепеж
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                            <span className="text-neutral-500 tabular-nums">
                              себест. {formatCurrency(hCost, currencySymbol)}
                            </span>
                            <div className="flex items-center gap-2" aria-label="Сумма">
                              <span className="text-white font-bold tabular-nums">
                                {formatCurrency(hPrice, currencySymbol)}
                              </span>
                              <span className={`tabular-nums text-[10px] ${hProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ({hProfitDisplay})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Секция электроники */}
              {electronics.length > 0 && (
                <motion.div
                  animate={{ opacity: isAnyElevated ? 0.35 : 1 }}
                  transition={{ opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE } }}
                  className={`space-y-2 ${isAnyElevated ? 'pointer-events-none select-none' : ''}`}
                >
                  <div className="bg-violet-950/20 border border-violet-500/20 rounded-lg py-1.5 px-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-violet-300 font-bold flex-wrap">
                      <span>┌─ [ЭЛЕКТРОНИКА И МОДУЛИ]</span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-neutral-300 font-normal">{electronics.length} поз.</span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-neutral-400 font-normal tabular-nums">{totalElPieces} шт</span>
                      {matchedElCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40">
                          Найдено: {matchedElCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-violet-400 font-mono font-bold tabular-nums">
                      {formatCurrency(elPrice, currencySymbol)}
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-2">
                    {electronics.map((item, idx) => {
                      const isMatched = isElMatch(item);
                      const qty = item.quantity || 1;
                      const eCost = (item.cost_per_unit || 0) * qty;
                      const ePrice = (item.price_per_unit || item.cost_per_unit || 0) * qty;
                      const eProfit = ePrice - eCost;
                      const eProfitDisplay = eProfit < 0
                        ? `−${formatCurrency(Math.abs(eProfit), currencySymbol)}`
                        : eProfit > 0
                          ? `+${formatCurrency(eProfit, currencySymbol)}`
                          : formatCurrency(0, currencySymbol);

                      return (
                        <div
                          key={item.id || `el-${idx}`}
                          className={`border rounded-lg p-2.5 space-y-1.5 transition-colors ${
                            isMatched
                              ? 'border-violet-400/50 bg-violet-950/40 ring-1 ring-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                              : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                          }`}
                          style={{ borderLeftWidth: '3px', borderLeftColor: '#8b5cf6' }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0" aria-label="Компонент">
                              <span className="text-violet-400 font-bold text-xs select-none">└─</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-violet-300 bg-violet-950/60 border border-violet-800/40">
                                {item.id ? `#${item.id.slice(0, 6)}` : `#ELC-${idx + 1}`}
                              </span>
                              <span className="font-sans font-medium text-xs text-white truncate" title={item.name}>
                                {item.name || 'Модуль'}
                              </span>
                              {isMatched && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40 shrink-0">
                                  НАЙДЕНО
                                </span>
                              )}
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-violet-800/40 bg-violet-950/40 text-violet-300 tabular-nums shrink-0" aria-label="Кол-во">
                              {qty} шт
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-violet-950/40 text-violet-300 border border-violet-800/30" aria-label="Материал">
                              Электроника
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                            <span className="text-neutral-500 tabular-nums">
                              себест. {formatCurrency(eCost, currencySymbol)}
                            </span>
                            <div className="flex items-center gap-2" aria-label="Сумма">
                              <span className="text-white font-bold tabular-nums">
                                {formatCurrency(ePrice, currencySymbol)}
                              </span>
                              <span className={`tabular-nums text-[10px] ${eProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ({eProfitDisplay})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Сводка и панель действий */}
        <motion.div
          animate={{ opacity: isAnyElevated ? 0.35 : 1 }}
          transition={{ opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE } }}
          className={`border-t border-white/10 bg-neutral-900/60 px-3 py-3 space-y-3 ${
            isAnyElevated ? 'pointer-events-none select-none' : ''
          }`}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-neutral-500">Труд</span>
              <span className="tabular-nums text-neutral-200">{laborMins} мин · {formatCurrency(laborCost, currencySymbol)}</span>
              <span className="mt-0.5 block text-[9px] text-neutral-500">
                {assembly.is_owner_labor ? 'труд учтён в прибыли' : 'труд учтён в себестоимости'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-neutral-500">Себестоимость</span>
              <span className="tabular-nums text-neutral-200">{formatCurrency(baseCost, currencySymbol)}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wide text-neutral-500">Цена</span>
              <span className="tabular-nums text-white font-bold">{formatCurrency(finalPrice, currencySymbol)}</span>
            </div>
            <div className={profit < 0 ? 'text-rose-400' : profit > 0 ? 'text-emerald-400' : 'text-neutral-300'}>
              <span className="block text-[10px] uppercase tracking-wide text-neutral-500">Прибыль</span>
              <span className="tabular-nums font-bold">{profitDisplay} ({marginPercent}%)</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
            {onCreateOrder && (
              <CockpitButton size="sm" icon={ShoppingCart} onClick={() => onCreateOrder(assembly)} isActive>
                Создать заказ
              </CockpitButton>
            )}
            {onLoadIntoCalculator && (
              <CockpitButton size="sm" icon={Calculator} onClick={() => onLoadIntoCalculator(assembly)}>
                В калькулятор
              </CockpitButton>
            )}
            {onOpenQuickEditModal && (
              <CockpitButton size="sm" icon={Edit2} onClick={() => onOpenQuickEditModal(assembly)}>
                Редактировать состав
              </CockpitButton>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Табличный режим ('expanded' или 'compact')
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full bg-neutral-950/95 font-mono text-xs border-y border-cyan-500/20 block"
    >
      {isEmpty ? (
        <div className="py-8 px-4 text-center space-y-2 text-neutral-500">
          <p className="text-xs text-neutral-400">В спецификации сборки пока нет компонентов</p>
          {onOpenQuickEditModal && (
            <CockpitButton size="sm" icon={Edit2} onClick={() => onOpenQuickEditModal(assembly)}>
              Редактировать состав
            </CockpitButton>
          )}
        </div>
      ) : (
        <div className="w-full divide-y divide-white/5 block">
          {/* СЕКЦИЯ 1: ПЕЧАТНЫЕ ДЕТАЛИ */}
          {parts.length > 0 && (
            <div className="w-full block">
              {/* Заголовок-разделитель секции печатных деталей */}
              <motion.div
                animate={{ opacity: isAnyPartElevated ? 0.35 : 1 }}
                transition={{ opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE } }}
                className={`w-full bg-cyan-950/25 border-y border-cyan-500/20 py-2 px-3 flex items-center justify-between text-xs font-mono select-none ${
                  isAnyPartElevated ? 'pointer-events-none' : ''
                }`}
                style={{
                  borderLeftWidth: '3px',
                  borderLeftStyle: 'solid',
                  borderLeftColor: '#06b6d4',
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-cyan-400 font-bold">┌─</span>
                  <span className="text-cyan-300 font-bold tracking-wider">[ПЕЧАТНЫЕ ДЕТАЛИ]</span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-300 tabular-nums">{parts.length} дет.</span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-400 tabular-nums">{totalWeight} г</span>
                  {matchedPartsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      Найдено: {matchedPartsCount}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 tabular-nums shrink-0">
                  себест. <span className="text-neutral-300">{formatCurrency(partsCost, currencySymbol)}</span>
                  {' · '}
                  цена <span className="text-cyan-300 font-bold">{formatCurrency(partsPrice, currencySymbol)}</span>
                </div>
              </motion.div>

              {/* Строки печатных деталей */}
              {parts.map((part, idx) => {
                const partRow = getPartRow(part, idx);
                const isPartElevated = setElevatedRow !== undefined
                  ? Boolean(elevatedRow && elevatedRow.id === partRow.id)
                  : elevatedRow
                  ? elevatedRow.id === partRow.id
                  : activeExpandedPartIndex === idx;
                const isPartBlurred = Boolean(elevatedRow) && !isPartElevated;
                const isMatched = isPartMatch(part);
                const qty = part.quantity || 1;
                const unitCost = part.base_cost || 0;
                const totalPartCost = unitCost * qty;
                const unitPrice = part.final_price || part.base_cost || 0;
                const totalPartPrice = unitPrice * qty;
                const partProfit = totalPartPrice - totalPartCost;
                const partMargin = totalPartPrice > 0 ? (partProfit / totalPartPrice) * 100 : 0;
                const partProfitDisplay = partProfit < 0
                  ? `−${formatCurrency(Math.abs(partProfit), currencySymbol)}`
                  : partProfit > 0
                    ? `+${formatCurrency(partProfit, currencySymbol)}`
                    : formatCurrency(0, currencySymbol);
                const partWeight = (part.weight_g || 0) * qty;
                const article = part.id ? `#${part.id.slice(0, 6)}` : `#PRT-${idx + 1}`;

                return (
                  <motion.div
                    key={part.id || `part-${idx}`}
                    animate={{
                      y: isPartElevated ? -14 : 0,
                      scale: 1,
                      opacity: isPartBlurred ? 0.35 : 1,
                      backgroundColor: isPartElevated
                        ? 'rgba(15, 15, 15, 0.98)'
                        : isMatched
                        ? 'rgba(6, 182, 212, 0.09)'
                        : 'rgba(0, 0, 0, 0)',
                      borderBottomColor: isPartElevated
                        ? 'rgba(255, 255, 255, 0.35)'
                        : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: isPartElevated ? 12 : 0,
                      boxShadow: isPartElevated
                        ? '0 24px 50px -10px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.22)'
                        : 'none',
                    }}
                    whileHover={!isPartElevated && !isPartBlurred ? {
                      backgroundColor: isMatched ? 'rgba(6, 182, 212, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                    } : undefined}
                    transition={{
                      y: { duration: ROW_ELEVATION_DURATION, ease: ROW_ELEVATION_EASE },
                      opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE },
                      backgroundColor: { duration: 0.35, ease: ROW_ELEVATION_EASE },
                      borderBottomColor: { duration: 0.58, ease: ROW_ELEVATION_EASE },
                      borderRadius: { duration: 0.58, ease: ROW_ELEVATION_EASE },
                      boxShadow: { duration: ROW_ELEVATION_DURATION, ease: ROW_ELEVATION_EASE },
                    }}
                    className={`group relative border-b w-full block transition-colors ${
                      isPartElevated
                        ? '!z-50 cursor-default ring-1 ring-white/20'
                        : isPartBlurred
                        ? 'pointer-events-none select-none border-white/5'
                        : 'border-white/5 cursor-pointer'
                    }`}
                    style={{
                      willChange: isPartElevated || isPartBlurred ? 'transform, opacity' : 'auto',
                      borderLeftWidth: '3px',
                      borderLeftStyle: 'solid',
                      borderLeftColor: '#06b6d4',
                    }}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePart(idx, partRow);
                      }}
                      className="grid w-full items-center"
                      style={{ gridTemplateColumns: gridCols }}
                    >
                      {/* 1. АРТИКУЛ (или АРТИКУЛ / ТИП в компактном) */}
                      <div className="py-2 px-3 whitespace-nowrap min-w-0 font-mono">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-cyan-400 font-bold select-none text-xs">└─</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 truncate font-semibold">
                            {article}
                          </span>
                          <ChevronDown
                            className={`w-3 h-3 text-neutral-400 group-hover:text-white shrink-0 transition-transform duration-200 ${
                              isPartElevated ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                        {isCompact && (
                          <div className="mt-0.5 pl-4">
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded w-fit border inline-flex items-center gap-0.5 bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
                              <Layers className="w-2 h-2" />
                              <span>Деталь</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 2. ТИП (только в expanded) */}
                      {!isCompact && (
                        <div className="py-2 px-3 whitespace-nowrap text-center min-w-0 font-mono">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
                            <Layers className="w-2.5 h-2.5" />
                            <span>Деталь</span>
                          </span>
                        </div>
                      )}

                      {/* КАТЕГОРИЯ */}
                      <div className="py-2 px-3 whitespace-nowrap min-w-0">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono bg-white/[0.03] text-neutral-300 border border-white/10 truncate max-w-[125px]">
                          <Box className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate">{assembly.category || 'Детали сборки'}</span>
                        </span>
                      </div>

                      {/* НАИМЕНОВАНИЕ / ДЕТАЛИ */}
                      <div className="py-2 px-3 min-w-0 font-sans" aria-label="Компонент">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium text-xs text-white truncate" title={part.name}>
                              {part.name || 'Деталь без названия'}
                            </span>
                            {isMatched && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                                НАЙДЕНО
                              </span>
                            )}
                          </div>
                          {part.printer_name && (
                            <span className="text-[10px] font-mono text-neutral-500 truncate flex items-center gap-1">
                              <Printer className="w-2.5 h-2.5" />
                              {part.printer_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ПЛАСТИК / МАТЕРИАЛ */}
                      <div className="py-2 px-3 whitespace-nowrap min-w-0" aria-label="Материал">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono bg-white/[0.03] text-neutral-300 border border-white/10 max-w-[125px]">
                          <span
                            aria-label="Цвет материала"
                            className="w-2 h-2 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: part.filament_color || '#06b6d4' }}
                          />
                          <span className="truncate max-w-[85px]">{part.filament_name || 'PLA'}</span>
                        </span>
                      </div>

                      {/* ВЕС / ВРЕМЯ */}
                      <div className="py-2 px-3 whitespace-nowrap text-center font-mono text-xs min-w-0" aria-label="Общий вес">
                        <div className="flex flex-col items-center gap-0.5 leading-tight">
                          <span className="text-neutral-200 tabular-nums">
                            {partWeight > 0 ? `${partWeight} г` : '—'}
                          </span>
                          {(part.hours || part.minutes) ? (
                            <span className="text-[10px] text-neutral-500 tabular-nums flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 inline text-neutral-500" />
                              {part.hours ? `${part.hours}ч ` : ''}{part.minutes ? `${part.minutes}м` : ''}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* КОЛИЧЕСТВО / ОСТАТОК СКЛАДА */}
                      <div className="py-2 px-3 whitespace-nowrap text-center min-w-0 font-mono" aria-label="Кол-во">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold border border-cyan-800/40 bg-cyan-950/40 text-cyan-300 tabular-nums inline-block">
                          {qty} шт
                        </span>
                      </div>

                      {/* СЕБЕСТОИМОСТЬ / СЕБЕСТ. И ЦЕНА В КОМПАКТНОМ */}
                      {isCompact ? (
                        <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0" aria-label="Сумма">
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <span className="font-bold text-white tabular-nums">
                              {formatCurrency(totalPartPrice, currencySymbol)}
                            </span>
                            <span className="text-[10px] text-neutral-500 tabular-nums">
                              себест. {formatCurrency(totalPartCost, currencySymbol)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0">
                            <div className="flex flex-col items-end gap-0.5 leading-tight">
                              <span className="text-neutral-300 tabular-nums">
                                {formatCurrency(totalPartCost, currencySymbol)}
                              </span>
                              {qty > 1 && unitCost > 0 && (
                                <span className="text-[10px] text-neutral-500 tabular-nums">
                                  ({formatCurrency(unitCost, currencySymbol)}/шт)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ЦЕНА ПРОДАЖИ */}
                          <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0" aria-label="Сумма">
                            <div className="flex flex-col items-end gap-0.5 leading-tight">
                              <span className="font-bold text-white tabular-nums">
                                {formatCurrency(totalPartPrice, currencySymbol)}
                              </span>
                              {qty > 1 && unitPrice > 0 && (
                                <span className="text-[10px] text-neutral-500 tabular-nums">
                                  ({formatCurrency(unitPrice, currencySymbol)}/шт)
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* ПРИБЫЛЬ / МАРЖА */}
                      <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          <span className={`font-bold tabular-nums ${partProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {partProfitDisplay}
                          </span>
                          <span className="text-[10px] text-neutral-500 tabular-nums">
                            {partMargin.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* ПРОДАЖИ (только expanded) */}
                      {!isCompact && (
                        <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0 text-neutral-600">
                          —
                        </div>
                      )}

                      {/* 3D STL (только expanded) */}
                      {!isCompact && (
                        <div className="py-2 px-3 whitespace-nowrap text-center min-w-0 font-mono">
                          {(part.stl_url || part.stl_file_data || part.stl_file_name) ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 inline-flex items-center gap-1">
                              <FileCode className="w-3 h-3" />
                              <span>STL</span>
                            </span>
                          ) : (
                            <span className="text-neutral-600 font-mono text-[11px]">—</span>
                          )}
                        </div>
                      )}

                      {/* ДЕЙСТВИЯ */}
                      <div className="py-2 px-3 whitespace-nowrap text-right font-mono min-w-0">
                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          {onOpenQuickEditModal && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e?.stopPropagation?.();
                                onOpenQuickEditModal(assembly);
                              }}
                              className="px-2 py-1 rounded-md font-mono text-[11px] bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Редактировать спецификацию сборки"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                              <span>Сборка</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e?.stopPropagation?.();
                              handleTogglePart(idx, partRow);
                            }}
                            className={`p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer shrink-0 transition-colors ${
                              isPartElevated ? 'bg-white/15 text-white font-bold' : ''
                            }`}
                            title={isPartElevated ? 'Свернуть меню детали' : 'Параметры и меню детали'}
                          >
                            •••
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isPartElevated && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            height: { duration: DRAWER_EXPAND_DURATION, ease: ROW_ELEVATION_EASE },
                            opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE },
                          }}
                          className="w-full overflow-hidden block border-t border-white/10"
                          style={{ willChange: 'height, opacity' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AssemblyPartDrawer
                            part={part}
                            partIndex={idx}
                            parentAssembly={assembly}
                            currencySymbol={currencySymbol}
                            onClose={() => {
                              if (setElevatedRow) setElevatedRow(null);
                              handleTogglePartIndex(null);
                            }}
                            onOpenQuickEditModal={onOpenQuickEditModal}
                            onCreateOrder={onCreateOrder}
                            onLoadIntoCalculator={onLoadIntoCalculator}
                            onOpenStlModal={onOpenStlModal}
                            onInlineUpdateProduct={onInlineUpdateProduct}
                            categoriesList={categoriesList}
                            filaments={filaments}
                            salesStat={salesStat}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* СЕКЦИЯ 2: КРЕПЁЖ И ФУРНИТУРА */}
          {hardware.length > 0 && (
            <motion.div
              animate={{ opacity: isAnyElevated ? 0.35 : 1 }}
              transition={{ opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE } }}
              className={`w-full block ${isAnyElevated ? 'pointer-events-none select-none' : ''}`}
            >
              {/* Заголовок-разделитель секции крепежа */}
              <div
                className="w-full bg-amber-950/20 border-y border-amber-500/20 py-2 px-3 flex items-center justify-between text-xs font-mono select-none"
                style={{
                  borderLeftWidth: '3px',
                  borderLeftStyle: 'solid',
                  borderLeftColor: '#f59e0b',
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-amber-400 font-bold">┌─</span>
                  <span className="text-amber-300 font-bold tracking-wider">[КРЕПЁЖ И ФУРНИТУРА]</span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-300 tabular-nums">{hardware.length} поз.</span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-400 tabular-nums">{totalHwPieces} шт</span>
                  {matchedHwCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Найдено: {matchedHwCount}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 tabular-nums shrink-0">
                  себест. <span className="text-neutral-300">{formatCurrency(hwCost, currencySymbol)}</span>
                  {' · '}
                  цена <span className="text-amber-300 font-bold">{formatCurrency(hwPrice, currencySymbol)}</span>
                </div>
              </div>

              {/* Строки крепежа */}
              {hardware.map((item, idx) => {
                const isMatched = isHwMatch(item);
                const qty = item.quantity || 1;
                const unitCost = item.cost_per_unit || 0;
                const totalHwCost = unitCost * qty;
                const unitPrice = item.price_per_unit || item.cost_per_unit || 0;
                const totalHwPrice = unitPrice * qty;
                const hwProfit = totalHwPrice - totalHwCost;
                const hwMargin = totalHwPrice > 0 ? (hwProfit / totalHwPrice) * 100 : 0;
                const hwProfitDisplay = hwProfit < 0
                  ? `−${formatCurrency(Math.abs(hwProfit), currencySymbol)}`
                  : hwProfit > 0
                    ? `+${formatCurrency(hwProfit, currencySymbol)}`
                    : formatCurrency(0, currencySymbol);
                const article = item.id ? `#${item.id.slice(0, 6)}` : `#HW-${idx + 1}`;

                return (
                  <motion.div
                    key={item.id || `hw-${idx}`}
                    whileHover={{ backgroundColor: isMatched ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.05)' }}
                    transition={{ duration: 0.15 }}
                    className={`group relative border-b border-white/5 grid w-full items-center transition-colors ${
                      isMatched ? 'bg-amber-500/[0.09]' : ''
                    }`}
                    style={{
                      gridTemplateColumns: gridCols,
                      borderLeftWidth: '3px',
                      borderLeftStyle: 'solid',
                      borderLeftColor: '#f59e0b',
                    }}
                  >
                    {/* 1. АРТИКУЛ */}
                    <div className="py-2 px-3 whitespace-nowrap min-w-0 font-mono">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-amber-400 font-bold select-none text-xs">└─</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-800/40 truncate font-semibold">
                          {article}
                        </span>
                      </div>
                      {isCompact && (
                        <div className="mt-0.5 pl-4">
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded w-fit border inline-flex items-center gap-0.5 bg-amber-500/10 text-amber-300 border-amber-500/20">
                            <Wrench className="w-2 h-2" />
                            <span>Метизы</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 2. ТИП (только в expanded) */}
                    {!isCompact && (
                      <div className="py-2 px-3 whitespace-nowrap text-center min-w-0 font-mono">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border-amber-500/20">
                          <Wrench className="w-2.5 h-2.5" />
                          <span>Метизы</span>
                        </span>
                      </div>
                    )}

                    {/* КАТЕГОРИЯ */}
                    <div className="py-2 px-3 whitespace-nowrap min-w-0">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono bg-white/[0.03] text-neutral-300 border border-white/10 truncate max-w-[125px]">
                        <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">Фурнитура</span>
                      </span>
                    </div>

                    {/* НАИМЕНОВАНИЕ / ДЕТАЛИ */}
                    <div className="py-2 px-3 min-w-0 font-sans" aria-label="Компонент">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-xs text-white truncate block" title={item.name}>
                          {item.name || 'Крепёж'}
                        </span>
                        {isMatched && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            НАЙДЕНО
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ПЛАСТИК / МАТЕРИАЛ */}
                    <div className="py-2 px-3 whitespace-nowrap min-w-0" aria-label="Материал">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono bg-white/[0.03] text-neutral-400 border border-white/10">
                        <span>Металл / крепеж</span>
                      </span>
                    </div>

                    {/* ВЕС / ВРЕМЯ */}
                    <div className="py-2 px-3 whitespace-nowrap text-center font-mono text-xs min-w-0" aria-label="Общий вес">
                      <span className="text-neutral-600 font-mono text-xs">—</span>
                    </div>

                    {/* КОЛИЧЕСТВО / ОСТАТОК СКЛАДА */}
                    <div className="py-2 px-3 whitespace-nowrap text-center min-w-0 font-mono" aria-label="Кол-во">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold border border-amber-800/40 bg-amber-950/40 text-amber-300 tabular-nums inline-block">
                        {qty} шт
                      </span>
                    </div>

                    {/* СЕБЕСТОИМОСТЬ / СЕБЕСТ. И ЦЕНА В КОМПАКТНОМ */}
                    {isCompact ? (
                      <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0" aria-label="Сумма">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          <span className="font-bold text-white tabular-nums">
                            {formatCurrency(totalHwPrice, currencySymbol)}
                          </span>
                          <span className="text-[10px] text-neutral-500 tabular-nums">
                            себест. {formatCurrency(totalHwCost, currencySymbol)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0">
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <span className="text-neutral-300 tabular-nums">
                              {formatCurrency(totalHwCost, currencySymbol)}
                            </span>
                            {qty > 1 && unitCost > 0 && (
                              <span className="text-[10px] text-neutral-500 tabular-nums">
                                ({formatCurrency(unitCost, currencySymbol)}/шт)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ЦЕНА ПРОДАЖИ */}
                        <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0" aria-label="Сумма">
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <span className="font-bold text-white tabular-nums">
                              {formatCurrency(totalHwPrice, currencySymbol)}
                            </span>
                            {qty > 1 && unitPrice > 0 && (
                              <span className="text-[10px] text-neutral-500 tabular-nums">
                                ({formatCurrency(unitPrice, currencySymbol)}/шт)
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* ПРИБЫЛЬ / МАРЖА */}
                    <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0">
                      <div className="flex flex-col items-end gap-0.5 leading-tight">
                        <span className={`font-bold tabular-nums ${hwProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {hwProfitDisplay}
                        </span>
                        <span className="text-[10px] text-neutral-500 tabular-nums">
                          {hwMargin.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* ПРОДАЖИ (только expanded) */}
                    {!isCompact && (
                      <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0 text-neutral-600">
                        —
                      </div>
                    )}

                    {/* 3D STL (только expanded) */}
                    {!isCompact && (
                      <div className="py-2 px-3 whitespace-nowrap text-center min-w-0 font-mono">
                        <span className="text-neutral-600 font-mono text-[11px]">—</span>
                      </div>
                    )}

                    {/* ДЕЙСТВИЯ */}
                    <div className="py-2 px-3 whitespace-nowrap text-right font-mono min-w-0">
                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                        {onOpenQuickEditModal && (
                          <button
                            type="button"
                            onClick={() => onOpenQuickEditModal(assembly)}
                            className="px-2 py-1 rounded-md font-mono text-[11px] bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Редактировать спецификацию сборки"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                            <span>Сборка</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* СЕКЦИЯ 3: ЭЛЕКТРОНИКА И МОДУЛИ */}
          {electronics.length > 0 && (
            <motion.div
              animate={{ opacity: isAnyElevated ? 0.35 : 1 }}
              transition={{ opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE } }}
              className={`w-full block ${isAnyElevated ? 'pointer-events-none select-none' : ''}`}
            >
              {/* Заголовок-разделитель секции электроники */}
              <div
                className="w-full bg-violet-950/20 border-y border-violet-500/20 py-2 px-3 flex items-center justify-between text-xs font-mono select-none"
                style={{
                  borderLeftWidth: '3px',
                  borderLeftStyle: 'solid',
                  borderLeftColor: '#8b5cf6',
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-violet-400 font-bold">┌─</span>
                  <span className="text-violet-300 font-bold tracking-wider">[ЭЛЕКТРОНИКА И МОДУЛИ]</span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-300 tabular-nums">{electronics.length} поз.</span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-400 tabular-nums">{totalElPieces} шт</span>
                  {matchedElCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40">
                      Найдено: {matchedElCount}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 tabular-nums shrink-0">
                  себест. <span className="text-neutral-300">{formatCurrency(elCost, currencySymbol)}</span>
                  {' · '}
                  цена <span className="text-violet-300 font-bold">{formatCurrency(elPrice, currencySymbol)}</span>
                </div>
              </div>

              {/* Строки электроники */}
              {electronics.map((item, idx) => {
                const isMatched = isElMatch(item);
                const qty = item.quantity || 1;
                const unitCost = item.cost_per_unit || 0;
                const totalElCost = unitCost * qty;
                const unitPrice = item.price_per_unit || item.cost_per_unit || 0;
                const totalElPrice = unitPrice * qty;
                const elProfit = totalElPrice - totalElCost;
                const elMargin = totalElPrice > 0 ? (elProfit / totalElPrice) * 100 : 0;
                const elProfitDisplay = elProfit < 0
                  ? `−${formatCurrency(Math.abs(elProfit), currencySymbol)}`
                  : elProfit > 0
                    ? `+${formatCurrency(elProfit, currencySymbol)}`
                    : formatCurrency(0, currencySymbol);
                const article = item.id ? `#${item.id.slice(0, 6)}` : `#ELC-${idx + 1}`;

                return (
                  <motion.div
                    key={item.id || `el-${idx}`}
                    whileHover={{ backgroundColor: isMatched ? 'rgba(139, 92, 246, 0.16)' : 'rgba(139, 92, 246, 0.05)' }}
                    transition={{ duration: 0.15 }}
                    className={`group relative border-b border-white/5 grid w-full items-center transition-colors ${
                      isMatched ? 'bg-violet-500/[0.09]' : ''
                    }`}
                    style={{
                      gridTemplateColumns: gridCols,
                      borderLeftWidth: '3px',
                      borderLeftStyle: 'solid',
                      borderLeftColor: '#8b5cf6',
                    }}
                  >
                    {/* 1. АРТИКУЛ */}
                    <div className="py-2 px-3 whitespace-nowrap min-w-0 font-mono">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-violet-400 font-bold select-none text-xs">└─</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-violet-300 bg-violet-950/60 border border-violet-800/40 truncate font-semibold">
                          {article}
                        </span>
                      </div>
                      {isCompact && (
                        <div className="mt-0.5 pl-4">
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded w-fit border inline-flex items-center gap-0.5 bg-violet-500/10 text-violet-300 border-violet-500/20">
                            <Cpu className="w-2 h-2" />
                            <span>Модуль</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 2. ТИП (только в expanded) */}
                    {!isCompact && (
                      <div className="py-2 px-3 whitespace-nowrap text-center min-w-0 font-mono">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 bg-violet-500/10 text-violet-300 border-violet-500/20">
                          <Cpu className="w-2.5 h-2.5" />
                          <span>Модуль</span>
                        </span>
                      </div>
                    )}

                    {/* КАТЕГОРИЯ */}
                    <div className="py-2 px-3 whitespace-nowrap min-w-0">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono bg-white/[0.03] text-neutral-300 border border-white/10 truncate max-w-[125px]">
                        <Cpu className="w-3 h-3 text-violet-400 shrink-0" />
                        <span className="truncate">Электроника</span>
                      </span>
                    </div>

                    {/* НАИМЕНОВАНИЕ / ДЕТАЛИ */}
                    <div className="py-2 px-3 min-w-0 font-sans" aria-label="Компонент">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-xs text-white truncate block" title={item.name}>
                          {item.name || 'Модуль'}
                        </span>
                        {isMatched && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40 shrink-0">
                            НАЙДЕНО
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ПЛАСТИК / МАТЕРИАЛ */}
                    <div className="py-2 px-3 whitespace-nowrap min-w-0" aria-label="Материал">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono bg-violet-950/40 text-violet-300 border border-violet-800/30">
                        <span>Электроника</span>
                      </span>
                    </div>

                    {/* ВЕС / ВРЕМЯ */}
                    <div className="py-2 px-3 whitespace-nowrap text-center font-mono text-xs min-w-0" aria-label="Общий вес">
                      <span className="text-neutral-600 font-mono text-xs">—</span>
                    </div>

                    {/* КОЛИЧЕСТВО / ОСТАТОК СКЛАДА */}
                    <div className="py-2 px-3 whitespace-nowrap text-center min-w-0 font-mono" aria-label="Кол-во">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold border border-violet-800/40 bg-violet-950/40 text-violet-300 tabular-nums inline-block">
                        {qty} шт
                      </span>
                    </div>

                    {/* СЕБЕСТОИМОСТЬ / СЕБЕСТ. И ЦЕНА В КОМПАКТНОМ */}
                    {isCompact ? (
                      <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0" aria-label="Сумма">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          <span className="font-bold text-white tabular-nums">
                            {formatCurrency(totalElPrice, currencySymbol)}
                          </span>
                          <span className="text-[10px] text-neutral-500 tabular-nums">
                            себест. {formatCurrency(totalElCost, currencySymbol)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0">
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <span className="text-neutral-300 tabular-nums">
                              {formatCurrency(totalElCost, currencySymbol)}
                            </span>
                            {qty > 1 && unitCost > 0 && (
                              <span className="text-[10px] text-neutral-500 tabular-nums">
                                ({formatCurrency(unitCost, currencySymbol)}/шт)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ЦЕНА ПРОДАЖИ */}
                        <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0" aria-label="Сумма">
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <span className="font-bold text-white tabular-nums">
                              {formatCurrency(totalElPrice, currencySymbol)}
                            </span>
                            {qty > 1 && unitPrice > 0 && (
                              <span className="text-[10px] text-neutral-500 tabular-nums">
                                ({formatCurrency(unitPrice, currencySymbol)}/шт)
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* ПРИБЫЛЬ / МАРЖА */}
                    <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0">
                      <div className="flex flex-col items-end gap-0.5 leading-tight">
                        <span className={`font-bold tabular-nums ${elProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {elProfitDisplay}
                        </span>
                        <span className="text-[10px] text-neutral-500 tabular-nums">
                          {elMargin.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* ПРОДАЖИ (только expanded) */}
                    {!isCompact && (
                      <div className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0 text-neutral-600">
                        —
                      </div>
                    )}

                    {/* 3D STL (только expanded) */}
                    {!isCompact && (
                      <div className="py-2 px-3 whitespace-nowrap text-center min-w-0 font-mono">
                        <span className="text-neutral-600 font-mono text-[11px]">—</span>
                      </div>
                    )}

                    {/* ДЕЙСТВИЯ */}
                    <div className="py-2 px-3 whitespace-nowrap text-right font-mono min-w-0">
                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                        {onOpenQuickEditModal && (
                          <button
                            type="button"
                            onClick={() => onOpenQuickEditModal(assembly)}
                            className="px-2 py-1 rounded-md font-mono text-[11px] bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Редактировать спецификацию сборки"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                            <span>Сборка</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      )}

      {/* НИЖНЯЯ ПАНЕЛЬ СВОДКИ И ДЕЙСТВИЙ */}
      <motion.div
        animate={{ opacity: isAnyElevated ? 0.35 : 1 }}
        transition={{ opacity: { duration: DRAWER_OPACITY_DURATION, ease: ROW_ELEVATION_EASE } }}
        className={`w-full border-t border-white/10 bg-neutral-900/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none ${
          isAnyElevated ? 'pointer-events-none select-none' : ''
        }`}
        style={{
          borderLeftWidth: '3px',
          borderLeftStyle: 'solid',
          borderLeftColor: '#06b6d4',
        }}
      >
        {/* Данные телеметрии */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div>
            <span className="block text-[10px] uppercase tracking-wide text-neutral-500">Труд</span>
            <span className="tabular-nums text-neutral-200">{laborMins} мин · {formatCurrency(laborCost, currencySymbol)}</span>
            <span className="mt-0.5 block text-[9px] text-neutral-500">
              {assembly.is_owner_labor ? 'труд учтён в прибыли' : 'труд учтён в себестоимости'}
            </span>
          </div>
          <div className="h-7 w-px bg-white/10 hidden sm:block" />
          <div>
            <span className="block text-[10px] uppercase tracking-wide text-neutral-500">Себестоимость</span>
            <span className="tabular-nums text-neutral-200">{formatCurrency(baseCost, currencySymbol)}</span>
          </div>
          <div className="h-7 w-px bg-white/10 hidden sm:block" />
          <div>
            <span className="block text-[10px] uppercase tracking-wide text-neutral-500">Цена</span>
            <span className="tabular-nums text-white font-bold">{formatCurrency(finalPrice, currencySymbol)}</span>
          </div>
          <div className="h-7 w-px bg-white/10 hidden sm:block" />
          <div className={profit < 0 ? 'text-rose-400' : profit > 0 ? 'text-emerald-400' : 'text-neutral-300'}>
            <span className="block text-[10px] uppercase tracking-wide text-neutral-500">Прибыль</span>
            <span className="tabular-nums font-bold">{profitDisplay} ({marginPercent}%)</span>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center gap-2 flex-wrap">
          {onCreateOrder && (
            <CockpitButton size="sm" icon={ShoppingCart} onClick={() => onCreateOrder(assembly)} isActive>
              Создать заказ
            </CockpitButton>
          )}
          {onLoadIntoCalculator && (
            <CockpitButton size="sm" icon={Calculator} onClick={() => onLoadIntoCalculator(assembly)}>
              В калькулятор
            </CockpitButton>
          )}
          {onOpenQuickEditModal && (
            <CockpitButton size="sm" icon={Edit2} onClick={() => onOpenQuickEditModal(assembly)}>
              Редактировать состав
            </CockpitButton>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
