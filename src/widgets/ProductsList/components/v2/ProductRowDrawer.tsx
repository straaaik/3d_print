'use client';

import React, { useState } from 'react';
import { SavedCalculation, ProductCollection, Filament } from '../../../../shared/types';
import { CatalogTableRow, formatProductArticle, SalesStatInfo } from '../../types';
import { formatCurrency } from '../../../../shared/lib/format';
import { getCategoryLucideIcon } from '../../../../shared/lib/categories';
import {
  FileCode,
  Edit2,
  Calculator,
  ShoppingCart,
  Plus,
  Check,
  Layers,
  Printer,
  Flame,
  Wrench,
  Folder,
  Box,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Tooltip } from '../../../../shared/ui/Tooltip';
import { AnimatedPriceNumber } from '../../../../shared/ui/AnimatedPriceNumber';

function CategoryIcon({ category }: { category: string }) {
  return React.createElement(getCategoryLucideIcon(category), {
    className: 'w-3.5 h-3.5 text-neutral-400 shrink-0',
  });
}

interface ProductRowDrawerProps {
  row: CatalogTableRow;
  collectionColor?: string;
  currencySymbol?: string;
  onInlineUpdateProduct?: (productId: string, updates: Partial<SavedCalculation>) => void;
  onInlineUpdateCollection?: (collectionId: string, updates: Partial<ProductCollection>) => void;
  onSetStock?: (item: SavedCalculation, newStock: number) => void;
  onOpenQuickEditModal?: (item: SavedCalculation) => void;
  onOpenStlModal?: (item: SavedCalculation) => void;
  onLoadIntoCalculator?: (item: SavedCalculation) => void;
  onCreateOrder?: (item: SavedCalculation) => void;
  onOpenEditCollection?: (col: ProductCollection) => void;
  onOpenAddVariantModal?: (col: ProductCollection) => void;
  onClose: () => void;
  categoriesList?: { id: string; label: string }[];
  filaments?: Filament[];
  salesStat?: SalesStatInfo;
}

export function ProductRowDrawer({
  row,
  collectionColor,
  currencySymbol = '₽',
  onInlineUpdateProduct,
  onInlineUpdateCollection,
  onSetStock,
  onOpenQuickEditModal,
  onOpenStlModal,
  onLoadIntoCalculator,
  onCreateOrder,
  onOpenEditCollection,
  onOpenAddVariantModal,
  onClose,
  salesStat,
}: ProductRowDrawerProps) {
  const isProduct = row.rowKind === 'product';
  const item = isProduct ? row.item : null;
  const isCol = row.rowKind === 'collection';
  const isAsm = isProduct && item?.type === 'assembly';
  const isPart = isProduct && (Boolean(row.isPart) || row.id.toLowerCase().startsWith('prt-'));
  const effectiveColor = collectionColor || (row.rowKind === 'product' ? row.parentCollectionColor : row.color);

  // Локальные состояния инпутов для плавного реактивного ввода
  const [name, setName] = useState<string>(row.name || '');
  const [price, setPrice] = useState<string>(item ? String(item.final_price || 0) : String(row.final_price || 0));
  const [cost, setCost] = useState<string>(item ? String(item.base_cost || 0) : String(row.base_cost || 0));
  const [weight, setWeight] = useState<string>(item ? String(item.weight_g || 0) : String(row.weight_g || 0));
  const [hours, setHours] = useState<string>(item ? String(item.hours || 0) : String(row.hours || 0));
  const [minutes, setMinutes] = useState<string>(item ? String(item.minutes || 0) : String(row.minutes || 0));
  const [stock, setStock] = useState<number>(item ? item.stock_quantity || 0 : row.stock_quantity || 0);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [previousSource, setPreviousSource] = useState({ row, item });

  if (previousSource.row !== row || previousSource.item !== item) {
    setPreviousSource({ row, item });
    setName(row.name || '');
    if (item) {
      setPrice(String(item.final_price || 0));
      setCost(String(item.base_cost || 0));
      setWeight(String(item.weight_g || 0));
      setHours(String(item.hours || 0));
      setMinutes(String(item.minutes || 0));
      setStock(item.stock_quantity || 0);
    }
  }

  const showSavedBadge = () => {
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 1200);
  };

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === row.name) return;
    if (isProduct && item) {
      onInlineUpdateProduct?.(item.id, { name: trimmed });
    } else if (isCol) {
      onInlineUpdateCollection?.(row.collection.id, { name: trimmed });
    }
    showSavedBadge();
  };

  const numPrice = parseFloat(price.replace(/\s+/g, '').replace(',', '.')) || 0;
  const numCost = parseFloat(cost.replace(/\s+/g, '').replace(',', '.')) || 0;
  const profit = Math.round((numPrice - numCost) * 100) / 100;
  const marginPercent = numPrice > 0 ? Math.round((profit / numPrice) * 1000) / 10 : 0;
  const markupPercent = numCost > 0 ? Math.round((profit / numCost) * 1000) / 10 : 0;

  const handlePriceCommit = () => {
    if (!item) return;
    if (numPrice !== item.final_price) {
      onInlineUpdateProduct?.(item.id, { final_price: numPrice });
      showSavedBadge();
    }
  };

  const handleCostCommit = () => {
    if (!item) return;
    if (numCost !== item.base_cost) {
      onInlineUpdateProduct?.(item.id, { base_cost: numCost });
      showSavedBadge();
    }
  };

  const handleWeightCommit = () => {
    if (!item) return;
    const num = parseFloat(weight.replace(/\s+/g, '').replace(',', '.')) || 0;
    if (num !== item.weight_g) {
      onInlineUpdateProduct?.(item.id, { weight_g: num });
      showSavedBadge();
    }
  };

  const handleHoursCommit = () => {
    if (!item) return;
    const num = parseInt(hours.replace(/\s+/g, ''), 10) || 0;
    if (num !== item.hours) {
      onInlineUpdateProduct?.(item.id, { hours: num });
      showSavedBadge();
    }
  };

  const handleMinutesCommit = () => {
    if (!item) return;
    const num = parseInt(minutes.replace(/\s+/g, ''), 10) || 0;
    if (num !== item.minutes) {
      onInlineUpdateProduct?.(item.id, { minutes: num });
      showSavedBadge();
    }
  };

  const handleStockDelta = (delta: number) => {
    if (!item) return;
    const nextStock = Math.max(0, stock + delta);
    setStock(nextStock);
    onSetStock?.(item, nextStock);
    showSavedBadge();
  };

  const handleStockBlur = () => {
    if (!item) return;
    if (stock !== (item.stock_quantity || 0)) {
      onSetStock?.(item, stock);
      showSavedBadge();
    }
  };

  const handleApplyMarkupPreset = (percent: number) => {
    if (!item || numCost <= 0) return;
    const calculatedPrice = Math.round(numCost * (1 + percent / 100));
    setPrice(String(calculatedPrice));
    onInlineUpdateProduct?.(item.id, { final_price: calculatedPrice });
    showSavedBadge();
  };

  const hasStl = isProduct ? Boolean(item?.stl_url || item?.stl_file_data) : (row.stlCount || 0) > 0;
  const article = formatProductArticle(row);

  return (
    <div
      data-row-drawer="true"
      onClick={(e) => e.stopPropagation()}
      className="p-2.5 sm:p-3 font-mono text-xs select-none space-y-2 text-white border-t"
      style={{
        backgroundColor: effectiveColor ? `${effectiveColor}0a` : 'rgba(10, 10, 10, 0.98)',
        borderTopColor: effectiveColor ? `${effectiveColor}70` : 'rgba(255, 255, 255, 0.1)',
        borderTopWidth: effectiveColor ? '2px' : '1px',
      }}
    >
      {/* ========================================================================= */}
      {/* РАЗДЕЛ 01 · НАИМЕНОВАНИЕ И ПАРАМЕТРЫ ИЗДЕЛИЯ                              */}
      {/* ========================================================================= */}
      <div
        className="p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-2"
        style={effectiveColor ? { borderColor: `${effectiveColor}25`, backgroundColor: `${effectiveColor}06` } : undefined}
      >
        <div
          className="flex items-center justify-between pb-1 border-b border-white/10 font-mono text-[#71717a]"
          style={effectiveColor ? { borderBottomColor: `${effectiveColor}20` } : undefined}
        >
          <span
            className="text-[9.5px] uppercase tracking-wider font-semibold"
            style={effectiveColor ? { color: effectiveColor } : undefined}
          >
            {isCol
              ? 'РАЗДЕЛ 01 · НАИМЕНОВАНИЕ И СОСТАВ КОЛЛЕКЦИИ'
              : isPart
              ? 'РАЗДЕЛ 01 · НАИМЕНОВАНИЕ И ПАРАМЕТРЫ ДЕТАЛИ'
              : 'РАЗДЕЛ 01 · НАИМЕНОВАНИЕ И ПАРАМЕТРЫ ИЗДЕЛИЯ'}
          </span>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {isSavedNotice && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="h-5 px-1.5 rounded text-[9.5px] font-bold border flex items-center gap-1 shrink-0 bg-emerald-950/70 text-emerald-400 border-emerald-800/50"
                >
                  <Check className="w-2.5 h-2.5" />
                  СОХРАНЕНО
                </motion.div>
              )}
            </AnimatePresence>
            <span className="text-[9px] font-mono text-neutral-500">
              позиция {article}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center text-[11px]"
                title="Свернуть"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Единая строка: [Артикул] [Тип] [Название...] [Категория] [Остаток шт] */}
        <div className="flex items-center gap-2.5 min-h-[36px] pt-0.5 flex-wrap sm:flex-nowrap">
          {/* Слева от названия: Артикул + Тип */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="h-8 flex items-center justify-center font-mono text-xs font-bold px-2.5 rounded-md tracking-wider shrink-0 text-cyan-400 bg-cyan-950/40 border border-cyan-800/40"
              style={effectiveColor ? {
                color: effectiveColor,
                backgroundColor: `${effectiveColor}20`,
                borderColor: `${effectiveColor}50`,
              } : undefined}
            >
              {article}
            </span>

            <span className={`h-8 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider px-2.5 rounded-md border shrink-0 ${
              isCol
                ? 'bg-white/10 text-neutral-200 border-white/20'
                : isAsm || isPart
                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40'
                : 'bg-white/5 text-neutral-300 border-white/10'
            }`}>
              {isCol ? 'КОЛЛЕКЦИЯ' : isAsm ? 'СБОРКА' : isPart ? 'ДЕТАЛЬ' : 'ШТУЧНЫЙ'}
            </span>

            {row.rowKind === 'product' && row.parentCollectionName && (
              <span
                className="h-8 flex items-center gap-1.5 font-mono text-[10px] px-2.5 rounded-md border shrink-0 text-neutral-300 bg-white/5 border-white/10"
                style={effectiveColor ? {
                  color: effectiveColor,
                  backgroundColor: `${effectiveColor}18`,
                  borderColor: `${effectiveColor}40`,
                } : undefined}
                title={isPart ? `Входит в состав сборки «${row.parentCollectionName}»` : `Входит в коллекцию «${row.parentCollectionName}»`}
              >
                {isPart ? (
                  <Layers
                    className="w-3 h-3 text-cyan-400 shrink-0"
                    style={effectiveColor ? { color: effectiveColor } : undefined}
                  />
                ) : (
                  <Folder
                    className="w-3 h-3 text-neutral-400 shrink-0"
                    style={effectiveColor ? { color: effectiveColor } : undefined}
                  />
                )}
                <span className="truncate max-w-[140px]">{row.parentCollectionName}</span>
              </span>
            )}

            {salesStat?.isBestseller && (
              <Tooltip content={`Хит продаж: продано ${salesStat.soldQty} шт. (${salesStat.salesSharePercent}% от всех продаж)`}>
                <span className="h-8 flex items-center gap-1 font-mono text-[10px] font-bold px-2.5 rounded-md border shrink-0 text-rose-400 bg-rose-500/10 border-rose-500/20 select-none cursor-default">
                  <Flame className="w-3 h-3 shrink-0" />
                  <span>ХИТ</span>
                </span>
              </Tooltip>
            )}
          </div>

          {/* Название изделия или коллекции */}
          <div className="flex-1 min-w-[160px]">
            <input
              type="text"
              placeholder={isCol ? "Введите название коллекции..." : "Введите наименование изделия..."}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              className="w-full bg-transparent border-none focus:outline-none p-0 text-sm font-semibold font-mono tracking-tight text-white placeholder-[#52525b]"
            />
          </div>

          {/* Справа от названия: Категория и быстрые бейджи */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="h-8 flex items-center gap-1.5 border border-white/15 rounded-md px-2 text-[10.5px] bg-black/60 text-neutral-300 select-none shrink-0">
              <CategoryIcon category={row.category || 'Разное'} />
              <span className="text-[9.5px] font-mono uppercase text-neutral-500">КАТ:</span>
              <span className="font-mono text-[11px] font-semibold text-white truncate max-w-[100px]">
                {row.category || 'Разное'}
              </span>
            </div>

            {hasStl && (
              <span className="h-8 flex items-center gap-1 text-[10px] font-mono px-2 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 shrink-0">
                <FileCode className="w-3 h-3" />
                <span>STL</span>
              </span>
            )}
          </div>

          {/* Количество штук на складе с кнопками + и − */}
          {isProduct && (
            <div className="flex items-baseline gap-1.5 shrink-0 select-none pl-2 border-l border-white/10">
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                onBlur={handleStockBlur}
                className="text-sm font-semibold font-mono tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text text-white"
                style={{ width: `${Math.max(1, String(stock || 0).length) * 0.75 + 0.15}em` }}
              />

              {/* Вертикальные кнопки + сверху и − снизу */}
              <div className="flex flex-col items-center justify-center font-mono select-none self-center leading-none">
                <button
                  type="button"
                  onClick={() => handleStockDelta(1)}
                  className="w-3.5 h-3.5 flex items-center justify-center text-xs font-bold cursor-pointer leading-none text-[#71717a] hover:text-white"
                  title="Увеличить остаток на 1"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleStockDelta(-1)}
                  disabled={stock <= 0}
                  className="w-3.5 h-3.5 flex items-center justify-center text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer leading-none text-[#71717a] hover:text-white"
                  title="Уменьшить остаток на 1"
                >
                  −
                </button>
              </div>

              <span className="text-xs font-mono select-none text-[#71717a]">
                {isPart ? 'шт в сборке' : 'шт на складе'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ДВУХКОЛОНОЧНЫЙ БЛОК: РАЗДЕЛ 02 + РАЗДЕЛ 03                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* ----------------------------------------------------------------------- */}
        {/* РАЗДЕЛ 02 · ПРОИЗВОДСТВО И ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ (5 из 12 колонок)      */}
        {/* ----------------------------------------------------------------------- */}
        <div
          className="p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between space-y-2 lg:col-span-5"
          style={effectiveColor ? { borderColor: `${effectiveColor}25`, backgroundColor: `${effectiveColor}06` } : undefined}
        >
          <div className="space-y-2">
            <div
              className="flex items-center justify-between pb-1 border-b border-white/10 font-mono text-[#71717a]"
              style={effectiveColor ? { borderBottomColor: `${effectiveColor}20` } : undefined}
            >
              <span
                className="text-[9.5px] uppercase tracking-wider font-semibold"
                style={effectiveColor ? { color: effectiveColor } : undefined}
              >
                РАЗДЕЛ 02 · ПРОИЗВОДСТВО И ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ
              </span>
              <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400">
                {item?.printer_name || 'FDM / SLA'}
              </span>
            </div>

            {/* Две подколонки: Вес/Время слева, Пластик/Оборудование справа */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-0.5">
              {/* Левая часть: Вес и Время */}
              <div className="sm:col-span-6 space-y-2.5 font-mono">
                {/* 1. Вес изделия */}
                <div className="space-y-1">
                  <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                    ВЕС ИЗДЕЛИЯ
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      onBlur={handleWeightCommit}
                      className="text-sm font-semibold font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block cursor-text selection:bg-white/20"
                      style={{ width: `${Math.max(1, String(weight || 0).length) * 0.75 + 0.15}em` }}
                    />
                    <span className="text-xs font-mono select-none text-[#71717a]">
                      г вес
                    </span>
                  </div>
                </div>

                {/* 2. Время печати (Часы и минуты) */}
                <div className="space-y-1 pt-2 border-t border-white/[0.08]">
                  <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                    ВРЕМЯ ПЕЧАТИ
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="flex items-baseline gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        onBlur={handleHoursCommit}
                        className="text-sm font-semibold font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block cursor-text"
                        style={{ width: `${Math.max(1, String(hours || 0).length) * 0.75 + 0.15}em` }}
                      />
                      <span className="text-xs font-mono text-[#71717a]">ч</span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={minutes}
                        onChange={(e) => setMinutes(e.target.value)}
                        onBlur={handleMinutesCommit}
                        className="text-sm font-semibold font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block cursor-text"
                        style={{ width: `${Math.max(1, String(minutes || 0).length) * 0.75 + 0.15}em` }}
                      />
                      <span className="text-xs font-mono text-[#71717a]">м</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Правая часть: Пластик и принтер */}
              <div className="sm:col-span-6 sm:border-l sm:border-white/[0.08] sm:pl-3.5 space-y-2.5 font-mono select-none">
                <div className="space-y-1">
                  <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                    МАТЕРИАЛ И ЦВЕТ
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: item?.filament_color || '#3b82f6' }}
                    />
                    <span className="text-sm text-white font-medium truncate">
                      {item?.filament_name || (isCol ? 'Различные' : 'PLA')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-white/[0.08]">
                  <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                    ПРИНТЕР
                  </div>
                  <div className="text-xs text-neutral-300 flex items-center gap-1.5 pt-0.5">
                    <Printer className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span className="truncate">{item?.printer_name || 'Основной принтер'}</span>
                  </div>
                </div>

                {isAsm && (
                  <div className="space-y-1 pt-2 border-t border-white/[0.08]">
                    <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>Деталей в сборке: {item?.assembly_parts?.length || 0}</span>
                    </div>
                  </div>
                )}

                {isPart && (
                  <div className="space-y-1 pt-2 border-t border-white/[0.08]">
                    <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>В сборке: {stock} шт.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>ТЕХПРОЦЕСС</span>
            <span className="text-neutral-300 font-medium">Параметры синхронизированы</span>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* РАЗДЕЛ 03 · ЭКОНОМИКА, СЕБЕСТОИМОСТЬ И ЦЕНА (7 из 12 колонок)            */}
        {/* ----------------------------------------------------------------------- */}
        <div
          className="p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between space-y-2 lg:col-span-7"
          style={effectiveColor ? { borderColor: `${effectiveColor}25`, backgroundColor: `${effectiveColor}06` } : undefined}
        >
          <div className="space-y-2">
            <div
              className="flex items-center justify-between pb-1 border-b border-white/10 font-mono text-[#71717a]"
              style={effectiveColor ? { borderBottomColor: `${effectiveColor}20` } : undefined}
            >
              <span
                className="text-[9.5px] uppercase tracking-wider font-semibold"
                style={effectiveColor ? { color: effectiveColor } : undefined}
              >
                РАЗДЕЛ 03 · ЭКОНОМИКА, СЕБЕСТОИМОСТЬ И ЦЕНА
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[8.5px] font-mono uppercase px-1.5 py-0.2 rounded border font-semibold flex items-center gap-1 ${
                  marginPercent >= 60
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                    : marginPercent >= 30
                    ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                }`}>
                  <span>МАРЖА</span>
                  <AnimatedPriceNumber
                    value={marginPercent}
                    currencySymbol="%"
                    decimals={1}
                    className="font-bold text-[8.5px]"
                  />
                </span>
              </div>
            </div>

            {/* Две симметричные колонки: Слева Цена и Себестоимость, Справа Прибыль и Склад */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-0.5">
              {/* Левая колонка: Цена продажи и Себестоимость */}
              <div className="sm:col-span-6 space-y-2.5 font-mono">
                {/* 1. Цена продажи */}
                <div className="space-y-1">
                  <div className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                    ЦЕНА ПРОДАЖИ (РОЗНИЦА)
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      onBlur={handlePriceCommit}
                      className="text-sm sm:text-base font-semibold font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block cursor-text selection:bg-white/20"
                      style={{ width: `${Math.max(1, String(price || 0).length) * 0.75 + 0.15}em` }}
                    />
                    <span className="text-xs font-mono select-none text-[#71717a]">
                      {currencySymbol} цена
                    </span>
                  </div>
                </div>

                {/* 2. Себестоимость */}
                <div className="space-y-1 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                    <span>СЕБЕСТОИМОСТЬ</span>
                    <span className="text-white text-xs font-mono">{formatCurrency(numCost, currencySymbol)}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      onBlur={handleCostCommit}
                      className="text-sm sm:text-base font-semibold font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block cursor-text selection:bg-white/20"
                      style={{ width: `${Math.max(1, String(cost || 0).length) * 0.75 + 0.15}em` }}
                    />
                    <span className="text-xs font-mono select-none text-[#71717a]">
                      {currencySymbol} себест.
                    </span>
                  </div>
                </div>
              </div>

              {/* Правая колонка: Прибыль, Прогресс-бар маржи и Быстрые наценки */}
              <div className="sm:col-span-6 sm:border-l sm:border-white/[0.08] sm:pl-3.5 space-y-2.5 font-mono select-none">
                {/* 1. Чистая прибыль с единицы */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">
                    <span>ПРИБЫЛЬ С ЕДИНИЦЫ</span>
                    <AnimatedPriceNumber
                      value={profit}
                      currencySymbol={currencySymbol}
                      showPositiveSign={profit > 0}
                      className={`text-xs font-mono font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    />
                  </div>

                  {/* Быстрые пресеты наценки от себестоимости */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[9px] text-neutral-500 uppercase">Наценка:</span>
                    {[50, 100, 150, 200, 300].map((presetPct) => {
                      const isActive = Math.abs(markupPercent - presetPct) < 5;
                      return (
                        <button
                          key={presetPct}
                          type="button"
                          onClick={() => handleApplyMarkupPreset(presetPct)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer border ${
                            isActive
                              ? 'bg-white text-neutral-950 font-bold border-white'
                              : 'border-white/10 text-neutral-400 hover:text-white hover:border-white/20 bg-white/[0.02]'
                          }`}
                          title={`Установить цену с наценкой +${presetPct}% (${Math.round(numCost * (1 + presetPct / 100))} ${currencySymbol})`}
                        >
                          +{presetPct}%
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Полоска маржинальности */}
                <div className="pt-2 border-t border-white/[0.08] space-y-1.5 font-mono">
                  <div className="flex items-baseline justify-between text-xs flex-wrap gap-x-2 gap-y-0.5">
                    <span className="text-[10px] text-[#71717a] uppercase tracking-wider font-semibold">МАРЖИНАЛЬНОСТЬ:</span>
                    <AnimatedPriceNumber
                      value={marginPercent}
                      currencySymbol="%"
                      decimals={1}
                      className="text-white font-medium text-xs"
                    />
                  </div>

                  {/* Тонкий прогресс-бар в нативном стиле */}
                  <div className="w-full h-1 bg-[#222226] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full "
                      style={{ width: `${Math.min(100, Math.max(0, marginPercent))}%` }}
                    />
                  </div>

                  {/* Складская стоимость */}
                  <div className="flex items-center justify-between text-[11px] text-[#71717a] pt-0.5">
                    <span>Сумма в наличии:</span>
                    <span className="text-white font-bold font-mono">
                      {formatCurrency(stock * numPrice, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>СТАТУС ЭКОНОМИКИ</span>
            <span className="text-emerald-400 font-medium">Рентабельность подтверждена</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* РАЗДЕЛ 04 · УПРАВЛЕНИЕ, БЫСТРЫЕ ДЕЙСТВИЯ И ТЕЛЕМЕТРИЯ                    */}
      {/* ========================================================================= */}
      <div
        className="p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between gap-2 flex-wrap font-mono"
        style={effectiveColor ? { borderColor: `${effectiveColor}25`, backgroundColor: `${effectiveColor}06` } : undefined}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {isProduct && onCreateOrder && (
            <CockpitButton
              size="sm"
              icon={ShoppingCart}
              accentColor={effectiveColor}
              onClick={() => onCreateOrder(item!)}
            >
              Создать заказ
            </CockpitButton>
          )}

          {isProduct && onLoadIntoCalculator && (
            <CockpitButton
              size="sm"
              icon={Calculator}
              accentColor={effectiveColor}
              onClick={() => onLoadIntoCalculator(item!)}
            >
              В калькулятор
            </CockpitButton>
          )}

          {hasStl && onOpenStlModal && isProduct && (
            <CockpitButton
              size="sm"
              icon={FileCode}
              accentColor={effectiveColor}
              onClick={() => onOpenStlModal(item!)}
            >
              3D Модель
            </CockpitButton>
          )}

          {isProduct && onOpenQuickEditModal && (
            <CockpitButton
              size="sm"
              icon={isAsm || isPart ? Wrench : Edit2}
              accentColor={effectiveColor}
              onClick={() => onOpenQuickEditModal(item!)}
            >
              {isAsm || isPart ? 'Спецификация сборки' : 'Полный редактор'}
            </CockpitButton>
          )}

          {isCol && onOpenAddVariantModal && (
            <CockpitButton
              size="sm"
              icon={Plus}
              accentColor={effectiveColor}
              onClick={() => onOpenAddVariantModal(row.collection)}
            >
              Добавить вариант
            </CockpitButton>
          )}

          {isCol && onOpenEditCollection && (
            <CockpitButton
              size="sm"
              icon={Edit2}
              accentColor={effectiveColor}
              onClick={() => onOpenEditCollection(row.collection)}
            >
              Настройки коллекции
            </CockpitButton>
          )}
        </div>

        {onClose && (
          <div className="flex items-center gap-2 shrink-0">
            <CockpitButton
              size="sm"
              icon={X}
              onClick={onClose}
            >
              Свернуть
            </CockpitButton>
          </div>
        )}
      </div>
    </div>
  );
}
