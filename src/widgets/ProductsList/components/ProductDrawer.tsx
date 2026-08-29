'use client';

import React, { useState, useEffect } from 'react';
import { SavedCalculation, Filament, Printer, Settings } from '../../../shared/types';
import { calculateCost } from '../../../features/calculate-cost/model/calculate';
import { formatCurrency, formatDate } from '../../../shared/lib/format';
import { ProductCategory, getCategoryLucideIcon } from '../../../shared/lib/categories';
import { SalesStatInfo } from '../types';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { 
  X, 
  ShoppingCart, 
  Calculator as CalculatorIcon, 
  Edit2, 
  Trash2, 
  FileCode, 
  ExternalLink, 
  Download, 
  Tag, 
  Flame, 
  Printer as PrinterIcon, 
  Clock, 
  Wrench, 
  Package, 
  DollarSign, 
  Layers, 
  FolderPlus, 
  Copy, 
  Check, 
  Calendar, 
  CheckCircle2, 
  Minus, 
  Plus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ProductDrawerTab = 'all' | 'pricing' | 'print' | 'stl' | 'sales';

interface ProductDrawerProps {
  item: SavedCalculation | null;
  onClose: () => void;
  onSetStock: (item: SavedCalculation, newStock: number) => void;
  onCreateOrder: (item: SavedCalculation) => void;
  onLoadIntoCalculator: (item: SavedCalculation) => void;
  onOpenQuickEdit: (item: SavedCalculation) => void;
  onOpenMoveProduct: (item: SavedCalculation) => void;
  onOpenStlModal: (item: SavedCalculation) => void;
  onDelete: (id: string, name: string, type?: string) => void;
  salesStat?: SalesStatInfo;
  currencySymbol: string;
  categoriesList: ProductCategory[];
  filaments: Filament[];
  printers: Printer[];
  settings: Settings | null;
}

export function ProductDrawer({
  item,
  onClose,
  onSetStock,
  onCreateOrder,
  onLoadIntoCalculator,
  onOpenQuickEdit,
  onOpenMoveProduct,
  onOpenStlModal,
  onDelete,
  salesStat,
  currencySymbol,
  categoriesList,
  filaments,
  printers,
  settings,
}: ProductDrawerProps) {
  const [activeTab, setActiveTab] = useState<ProductDrawerTab>('all');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (item) {
      setActiveTab('all');
    }
  }, [item?.id]);

  if (!item) return null;

  const liveFilament = item.filament_id
    ? filaments.find((f) => f.id === item.filament_id)
    : filaments.find((f) => f.name === item.filament_name) || null;

  const livePrinter = item.printer_id
    ? printers.find((p) => p.id === item.printer_id)
    : printers.find((p) => p.name === item.printer_name) || null;

  const breakdown = calculateCost({
    weightG: item.weight_g || 0,
    hours: item.hours || 0,
    minutes: item.minutes || 0,
    laborMinutes: item.labor_minutes || 0,
    laborRatePerHour: item.labor_rate_per_hour,
    markupPercent: item.markup_percent,
    defectPercent: item.defect_percent,
    customCostItems: item.custom_cost_items || [],
    quantity: item.quantity || 1,
    filament: liveFilament || null,
    printer: livePrinter || null,
    settings,
  });

  const profit = Math.round(((item.final_price || 0) - (item.base_cost || 0)) * 100) / 100;
  const marginPercent =
    item.final_price && item.final_price > 0 ? Math.round((profit / item.final_price) * 1000) / 10 : 0;
  const isPositive = profit >= 0;

  const stock = item.stock_quantity || 0;
  const catObj = categoriesList.find((c) => c.label === item.category || c.id === item.category);
  const catLabel = catObj?.label || item.category || 'Разное';
  const CatIcon = getCategoryLucideIcon(catLabel);

  const hasUrl = Boolean(item.stl_url && item.stl_url.trim());
  const hasFile = Boolean(item.stl_file_data);

  const downloadStl = () => {
    if (!item.stl_file_data) return;
    const a = document.createElement('a');
    a.href = item.stl_file_data;
    a.download = item.stl_file_name || `${item.name}.stl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyId = () => {
    if (item.id && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(item.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="w-screen max-w-lg bg-neutral-950 border-l border-white/10 shadow-2xl flex flex-col justify-between text-xs text-neutral-300 font-mono"
        >
          {/* 1. Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-neutral-900/80 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 3 Terminal LEDs */}
                <div className="flex items-center gap-1.5 mr-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>

                {/* ID Badge */}
                <Tooltip content={`ID: ${item.id} (Нажмите для копирования)`}>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="px-2 py-0.5 rounded font-mono text-xs font-bold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>#PRD-{item.id.slice(0, 6)}</span>
                    {copiedId ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </Tooltip>

                <span className="px-2 py-0.5 rounded text-[10px] bg-white/[0.04] text-neutral-300 border border-white/10 flex items-center gap-1">
                  <CatIcon className="w-2.5 h-2.5 text-neutral-400" />
                  <span>{catLabel}</span>
                </span>

                {item.collection_name && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800/40">
                    Коллекция: {item.collection_name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Tooltip content="Редактировать параметры">
                  <button
                    type="button"
                    onClick={() => onOpenQuickEdit(item)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>

                <Tooltip content="Закрыть панель" shortcut="Esc">
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Product Title */}
            <div>
              <h2 className="text-base font-bold text-white font-sans tracking-tight">
                {item.name}
              </h2>
              <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-2">
                <span>Создан: {formatDate(item.created_at)}</span>
              </div>
            </div>

            {/* Quick Filter Capsules */}
            <div className="flex items-center gap-1 pt-1 border-t border-white/5">
              {(
                [
                  { id: 'all', label: 'ОБЗОР' },
                  { id: 'pricing', label: 'КАЛЬКУЛЯЦИЯ' },
                  { id: 'print', label: 'ПЕЧАТЬ' },
                  { id: 'stl', label: 'STL // 3D' },
                  { id: 'sales', label: 'ПРОДАЖИ' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-neutral-950 font-bold shadow-sm'
                      : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200 border border-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] text-neutral-500 uppercase">Себестоимость</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {formatCurrency(item.base_cost, currencySymbol)}
                </div>
              </div>

              <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] text-neutral-500 uppercase">Цена продажи</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {formatCurrency(item.final_price, currencySymbol)}
                </div>
              </div>

              <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] text-neutral-500 uppercase">Чистая маржа</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  +{formatCurrency(profit, currencySymbol)} ({marginPercent}%)
                </div>
              </div>

              <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] text-neutral-500 uppercase">Остаток на складе</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-white">{stock} шт</span>
                  <div className="flex items-center gap-1 bg-neutral-950 border border-white/10 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => onSetStock(item, Math.max(0, stock - 1))}
                      className="w-4 h-4 rounded flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetStock(item, stock + 1)}
                      className="w-4 h-4 rounded flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Swiss Ledger Breakdown */}
            {(activeTab === 'all' || activeTab === 'pricing') && (
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl p-3.5 space-y-2">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  § СТРУКТУРА СЕБЕСТОИМОСТИ
                </div>
                <div className="divide-y divide-white/5 text-xs">
                  <div className="flex justify-between py-1.5">
                    <span className="text-neutral-400">Пластик ({item.weight_g || 0}г)</span>
                    <span className="text-white font-bold">{formatCurrency(breakdown.materialCost, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-neutral-400">Электроэнергия</span>
                    <span className="text-white font-bold">{formatCurrency(breakdown.electricityCost, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-neutral-400">Амортизация принтера</span>
                    <span className="text-white font-bold">{formatCurrency(breakdown.depreciationCost, currencySymbol)}</span>
                  </div>
                  {breakdown.laborCost > 0 && (
                    <div className="flex justify-between py-1.5">
                      <span className="text-neutral-400">Труд мастера ({item.labor_minutes || 0} мин)</span>
                      <span className="text-white font-bold">{formatCurrency(breakdown.laborCost, currencySymbol)}</span>
                    </div>
                  )}
                  {breakdown.defectCost > 0 && (
                    <div className="flex justify-between py-1.5">
                      <span className="text-neutral-400">Брак / резерв ({item.defect_percent || 0}%)</span>
                      <span className="text-white font-bold">{formatCurrency(breakdown.defectCost, currencySymbol)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 pt-2.5 font-bold border-t border-white/10">
                    <span className="text-neutral-300">Итого себестоимость</span>
                    <span className="text-white">{formatCurrency(item.base_cost, currencySymbol)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Print Specs */}
            {(activeTab === 'all' || activeTab === 'print') && (
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl p-3.5 space-y-2">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  § ПАРАМЕТРЫ 3D-ПЕЧАТИ
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] text-neutral-500">Материал</div>
                    <div className="text-neutral-200 font-bold font-sans mt-0.5">
                      {item.filament_name || 'PLA'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-500">Принтер</div>
                    <div className="text-neutral-200 font-bold font-sans mt-0.5">
                      {item.printer_name || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-500">Вес изделия</div>
                    <div className="text-neutral-200 font-bold mt-0.5">
                      {item.weight_g || 0} г
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-500">Время печати</div>
                    <div className="text-neutral-200 font-bold mt-0.5">
                      {item.hours || 0}ч {item.minutes || 0}м
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3D STL Model */}
            {(activeTab === 'all' || activeTab === 'stl') && (
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl p-3.5 space-y-2">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  § 3D МОДЕЛЬ (STL)
                </div>
                {hasFile || hasUrl ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {hasFile && (
                      <button
                        type="button"
                        onClick={downloadStl}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Скачать STL ({item.stl_file_name || 'файл'})</span>
                      </button>
                    )}
                    {hasUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(item.stl_url, '_blank')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ExternalLink size={13} />
                        <span>Открыть ссылку</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-neutral-500 text-xs">
                    К позиции не прикреплен файл STL или ссылка на 3D модель.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Bottom Action Dock */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-neutral-900/90 flex items-center justify-between gap-2">
            <Tooltip content="Удалить товар">
              <button
                type="button"
                onClick={() => onDelete(item.id, item.name, item.type)}
                className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/40 border border-white/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Tooltip>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLoadIntoCalculator(item)}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CalculatorIcon className="w-3.5 h-3.5" />
                <span>Калькулятор</span>
              </button>

              <button
                type="button"
                onClick={() => onCreateOrder(item)}
                className="px-4 py-2 rounded-xl bg-white text-neutral-950 hover:bg-neutral-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>+ Создать заказ</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
