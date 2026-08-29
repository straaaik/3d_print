import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SavedCalculation, AssemblyPrintedPart } from '../../../shared/types';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { CockpitStatusPill } from '../../../shared/ui/CockpitTable/CockpitStatusPill';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { 
  Box, 
  ChevronRight, 
  Layers, 
  Wrench, 
  ShoppingCart, 
  Edit2, 
  Trash2, 
  FolderPlus, 
  Copy, 
  Check, 
  FileCode, 
  Download, 
  ExternalLink,
  MoreVertical,
  Plus,
  Minus
} from 'lucide-react';
import { formatCurrency } from '../../../shared/lib/format';
import { ProductCategory, getCategoryLucideIcon } from '../../../shared/lib/categories';
import { SalesStatInfo } from '../types';

interface AssemblyRowProps {
  item: SavedCalculation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isChecked: boolean;
  onToggleSelect: (id: string) => void;
  onStartRename: (item: SavedCalculation) => void;
  onSetStock: (item: SavedCalculation, newStock: number) => void;
  onOpenCategoryModal: (item: SavedCalculation) => void;
  onCreateOrder: (item: SavedCalculation) => void;
  onEditAssembly: (item: SavedCalculation) => void;
  onOpenMoveProduct: (item: SavedCalculation) => void;
  onDelete: (id: string, name: string, type?: string) => void;
  salesStat?: SalesStatInfo;
  currencySymbol: string;
  categoriesList: ProductCategory[];
  isChildInCollection?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  isContextMenuOpen?: boolean;
}

export const AssemblyRow = React.memo(function AssemblyRow({
  item,
  isExpanded,
  onToggleExpand,
  isChecked,
  onToggleSelect,
  onStartRename,
  onSetStock,
  onOpenCategoryModal,
  onCreateOrder,
  onEditAssembly,
  onOpenMoveProduct,
  onDelete,
  salesStat,
  currencySymbol,
  categoriesList,
  isChildInCollection = false,
  onContextMenu,
  isContextMenuOpen = false,
}: AssemblyRowProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPartIndex, setCopiedPartIndex] = useState<number | null>(null);
  const [copiedHwIndex, setCopiedHwIndex] = useState<number | null>(null);

  const parts = item.assembly_parts || [];
  const hardware = item.assembly_hardware || [];
  const laborMins = item.assembly_labor_minutes || 0;
  const laborCost = item.assembly_labor_cost || 0;

  const totalPartsCost = parts.reduce((acc, p) => acc + (p.base_cost || 0) * (p.quantity || 1), 0);
  const totalPartsPrice = parts.reduce((acc, p) => acc + (p.final_price || 0) * (p.quantity || 1), 0);
  const totalPartsProfit = Math.round((totalPartsPrice - totalPartsCost) * 100) / 100;
  const totalPartsPieces = parts.reduce((acc, p) => acc + (p.quantity || 1), 0);

  const totalHwCost = hardware.reduce((acc, h) => acc + (h.cost_per_unit || 0) * (h.quantity || 1), 0);
  const totalHwPrice = hardware.reduce((acc, h) => acc + (h.price_per_unit || 0) * (h.quantity || 1), 0);
  const totalHwProfit = Math.round((totalHwPrice - totalHwCost) * 100) / 100;
  const totalHwPieces = hardware.reduce((acc, h) => acc + (h.quantity || 1), 0);

  const stock = item.stock_quantity || 0;
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock <= 2;

  const profit = Math.round(((item.final_price || 0) - (item.base_cost || 0)) * 100) / 100;
  const marginPercent =
    item.final_price && item.final_price > 0 ? Math.round((profit / item.final_price) * 1000) / 10 : 0;
  const isPositive = profit >= 0;

  const catObj = categoriesList.find((c) => c.label === item.category || c.id === item.category);
  const catLabel = catObj?.label || item.category || 'Разное';
  const CatIcon = getCategoryLucideIcon(catLabel);

  const shortId = item.id ? (item.id.length > 8 ? item.id.slice(0, 6) : item.id) : '—';

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.id && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(item.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    }
  };

  const handleCopyPartId = (e: React.MouseEvent, partId: string, index: number) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(partId);
      setCopiedPartIndex(index);
      setTimeout(() => setCopiedPartIndex(null), 1500);
    }
  };

  const handleCopyHwId = (e: React.MouseEvent, hwId: string, index: number) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(hwId);
      setCopiedHwIndex(index);
      setTimeout(() => setCopiedHwIndex(null), 1500);
    }
  };

  const handleDownloadPartStl = (e: React.MouseEvent, part: AssemblyPrintedPart) => {
    e.stopPropagation();
    if (!part.stl_file_data) return;
    const a = document.createElement('a');
    a.href = part.stl_file_data;
    a.download = part.stl_file_name || `${part.name}.stl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <tr
        className={`border-b border-white/5 transition-colors select-none cursor-pointer font-mono text-xs ${
          isContextMenuOpen
            ? 'bg-cyan-950/40 border-cyan-500/40'
            : isExpanded
            ? 'bg-cyan-950/25 border-cyan-500/30'
            : isChildInCollection
            ? 'bg-neutral-950/60 hover:bg-neutral-900/60'
            : 'bg-neutral-900/40 hover:bg-neutral-900/80'
        }`}
        onContextMenu={onContextMenu}
      >
        {/* 1. Чекбокс */}
        <td
          className="w-8 px-3 py-2.5 text-center"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(item.id);
          }}
        >
          <Checkbox
            checked={isChecked}
            onChange={() => onToggleSelect(item.id)}
            variant="cyan"
            size="sm"
          />
        </td>

        {/* 2. ID и Дата создания (#ASM-1081) */}
        <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <Tooltip content={`ID сборки: ${item.id} (Нажмите, чтобы скопировать)`}>
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 font-mono font-semibold text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
            >
              <span>#ASM-{shortId}</span>
              {copiedId ? (
                <Check className="w-2.5 h-2.5 text-emerald-400" />
              ) : (
                <Copy className="w-2.5 h-2.5 opacity-20 group-hover:opacity-70 transition-opacity" />
              )}
            </button>
          </Tooltip>
        </td>

        {/* 3. Категория */}
        <td className="py-2.5 px-3 text-neutral-300 font-sans whitespace-nowrap">
          <Tooltip content="Сменить категорию">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCategoryModal(item);
              }}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono bg-neutral-900 text-neutral-300 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
            >
              <CatIcon className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate max-w-[120px]">{catLabel}</span>
            </button>
          </Tooltip>
        </td>

        {/* 4. Название, бейджи и кнопки */}
        <td className={`py-2.5 px-3 text-neutral-200 font-sans ${isChildInCollection ? 'pl-6' : ''}`}>
          <div className="flex items-center gap-2 min-w-0">
            {isChildInCollection && (
              <span className="text-cyan-500/70 font-mono text-xs select-none mr-0.5 font-bold">
                └─
              </span>
            )}

            {/* Кнопка раскрытия состава сборки */}
            <Tooltip content={isExpanded ? 'Скрыть детали' : 'Раскрыть состав сборки'}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className={`p-1 rounded-md transition-all shrink-0 cursor-pointer ${
                  isExpanded
                    ? 'bg-cyan-500 text-neutral-950 font-bold'
                    : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 hover:bg-cyan-900/60'
                }`}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                >
                  <ChevronRight size={12} />
                </motion.div>
              </button>
            </Tooltip>

            <CockpitStatusPill
              label={`Сборка (${parts.length})`}
              tone="cyan"
              icon={Layers}
            />

            <span
              className="font-bold text-white hover:text-cyan-300 transition-colors truncate block text-xs sm:text-[13px] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onStartRename(item);
              }}
            >
              {item.name}
            </span>
          </div>
        </td>

        {/* 5. Наличие на складе */}
        <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            {isOutOfStock ? (
              <CockpitStatusPill label="Под заказ" tone="neutral" dot={false} />
            ) : isLowStock ? (
              <CockpitStatusPill label={`Мало (${stock} шт)`} tone="yellow" pulse />
            ) : (
              <CockpitStatusPill label={`В наличии (${stock} шт)`} tone="cyan" dot />
            )}

            {/* Быстрые кнопки инкремента */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-neutral-900 border border-white/10 rounded-md p-0.5">
              <Tooltip content="Уменьшить">
                <button
                  type="button"
                  onClick={() => onSetStock(item, Math.max(0, stock - 1))}
                  disabled={stock <= 0}
                  className="w-3.5 h-3.5 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                >
                  <Minus className="w-2 h-2" />
                </button>
              </Tooltip>
              <span className="font-mono text-[10px] px-1 text-white font-bold">{stock}</span>
              <Tooltip content="Увеличить">
                <button
                  type="button"
                  onClick={() => onSetStock(item, stock + 1)}
                  className="w-3.5 h-3.5 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <Plus className="w-2 h-2" />
                </button>
              </Tooltip>
            </div>
          </div>
        </td>

        {/* 6. Материалы и узлы */}
        <td className="py-2.5 px-3 text-neutral-400 font-mono whitespace-nowrap">
          <span className="truncate max-w-[130px]">
            {parts.length} дет.{hardware.length > 0 ? ` + ${hardware.length} фурн.` : ''}
          </span>
        </td>

        {/* 7. Параметры печати */}
        <td className="py-2.5 px-3 text-neutral-400 font-mono whitespace-nowrap">
          {item.weight_g || 0}г · {item.hours || 0}ч {item.minutes || 0}м
        </td>

        {/* 8. Себестоимость */}
        <td className="py-2.5 px-3 text-right font-mono text-neutral-400 whitespace-nowrap">
          {formatCurrency(item.base_cost, currencySymbol)}
        </td>

        {/* 9. Цена */}
        <td className="py-2.5 px-3 text-right font-bold text-cyan-300 font-mono whitespace-nowrap">
          {formatCurrency(item.final_price, currencySymbol)}
        </td>

        {/* 10. Маржа / Прибыль */}
        <td className="py-2.5 px-3 text-right text-emerald-400 font-mono whitespace-nowrap">
          {isPositive ? '+' : ''}{formatCurrency(profit, currencySymbol)}
          <span className="text-[10px] text-neutral-500 ml-1">({marginPercent}%)</span>
        </td>

        {/* 11. Действия */}
        <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {/* Кнопка Заказ */}
            <Tooltip content="Создать заказ со сборкой">
              <button
                type="button"
                onClick={() => onCreateOrder(item)}
                className="px-2 py-1 rounded-md font-mono text-[11px] font-bold bg-white text-neutral-950 hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <ShoppingCart className="w-3 h-3" />
                <span>Заказ</span>
              </button>
            </Tooltip>

            {/* Редактировать сборку */}
            <Tooltip content="Редактировать компоненты сборки">
              <button
                type="button"
                onClick={() => onEditAssembly(item)}
                className="p-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </Tooltip>

            {/* Переключить состав */}
            <Tooltip content={isExpanded ? 'Скрыть детали' : 'Показать детали'}>
              <button
                type="button"
                onClick={onToggleExpand}
                className={`p-1 rounded-md border text-xs font-mono transition-colors cursor-pointer ${
                  isExpanded
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
                    : 'border-white/10 bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" />
              </button>
            </Tooltip>

            {/* Меню */}
            <Tooltip content="Опции">
              <button
                type="button"
                onClick={(e) => {
                  if (onContextMenu) onContextMenu(e);
                }}
                className="p-1 rounded-md hover:bg-white/10 text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <MoreVertical className="w-3 h-3" />
              </button>
            </Tooltip>
          </div>
        </td>
      </tr>

      {/* Раскрывающийся состав сборки — полноформатные строки деталей и фурнитуры */}
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            key={`assembly-expansion-${item.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-neutral-950/80"
          >
            <td colSpan={11} className="p-0 overflow-hidden border-b border-white/10">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="overflow-hidden bg-neutral-950 shadow-inner p-2 space-y-2 font-mono text-xs"
              >
                {/* 1. Шапка 3D-печатных деталей */}
                <div className="p-2.5 px-3.5 bg-cyan-950/30 border border-cyan-500/30 rounded-xl flex items-center justify-between gap-3 flex-wrap select-none">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Box size={14} className="text-cyan-400" />
                    <span className="font-bold text-cyan-300 uppercase tracking-wider text-xs font-sans">
                      3D-печатные детали: «{item.name}»
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-bold text-[10px]">
                      {parts.length} поз. ({totalPartsPieces} шт)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="text-neutral-400">
                      Себестоимость: <strong className="text-white">{formatCurrency(totalPartsCost, currencySymbol)}</strong>
                    </span>
                    <span className="text-neutral-400">
                      Продажа: <strong className="text-cyan-300">{formatCurrency(totalPartsPrice, currencySymbol)}</strong>
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Прибыль: +{formatCurrency(totalPartsProfit, currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* 2. Таблица деталей */}
                <div className="border border-white/10 rounded-xl overflow-hidden bg-neutral-950/60">
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody className="divide-y divide-white/5">
                      {/* А. 3D-печатные детали */}
                      {parts.map((part, pIdx) => {
                        const partId = part.id || `part-${pIdx + 1}`;
                        const partShortId = part.id ? (part.id.length > 8 ? part.id.slice(0, 6) : part.id) : `${pIdx + 1}`;
                        const partProfit = Math.round(((part.final_price || 0) - (part.base_cost || 0)) * (part.quantity || 1) * 100) / 100;
                        const partMargin =
                          part.final_price && part.final_price > 0
                            ? Math.round((((part.final_price - part.base_cost) / part.final_price) * 1000)) / 10
                            : 0;

                        const hasStlFile = Boolean(part.stl_file_data);
                        const hasStlUrl = Boolean(part.stl_url && part.stl_url.trim());

                        return (
                          <tr
                            key={partId}
                            className="hover:bg-white/[0.02] transition-colors group"
                          >
                            <td className="w-8 px-3 py-2.5 text-center text-cyan-400 font-bold">
                              └─
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <Tooltip content={`ID детали: ${partId} (Нажмите, чтобы скопировать)`}>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyPartId(e, partId, pIdx)}
                                  className="inline-flex items-center gap-1 font-mono text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-colors w-fit cursor-pointer"
                                >
                                  <span>#part-{partShortId}</span>
                                  {copiedPartIndex === pIdx ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 opacity-30 group-hover:opacity-80" />
                                  )}
                                </button>
                              </Tooltip>
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-bold text-[10px] shrink-0">
                                  × {part.quantity} шт
                                </span>
                                <span className="font-bold text-white truncate block text-xs font-sans">
                                  {part.name}
                                </span>
                                {part.printer_name && (
                                  <span className="text-[10px] text-neutral-500 hidden sm:inline">
                                    • {part.printer_name}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {part.filament_color && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                                    style={{ backgroundColor: part.filament_color }}
                                  />
                                )}
                                <span className="truncate text-xs text-neutral-300 font-sans">
                                  {part.filament_name || 'PLA'}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap text-neutral-400">
                              {part.weight_g || 0}г · {part.hours || 0}ч {part.minutes || 0}м
                            </td>

                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex flex-col items-end">
                                <span className="text-cyan-300 font-bold">
                                  {formatCurrency((part.final_price || 0) * (part.quantity || 1), currencySymbol)}
                                </span>
                                <span className="text-[10px] text-neutral-500">
                                  себ: {formatCurrency((part.base_cost || 0) * (part.quantity || 1), currencySymbol)}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className="text-emerald-400 font-bold">
                                +{formatCurrency(partProfit, currencySymbol)} ({partMargin}%)
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {hasStlFile && (
                                  <Tooltip content={`Скачать STL (${part.stl_file_name || 'файл'})`}>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDownloadPartStl(e, part)}
                                      className="p-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-950 border border-emerald-800/40 text-emerald-400 transition-colors cursor-pointer"
                                    >
                                      <Download size={13} />
                                    </button>
                                  </Tooltip>
                                )}

                                {hasStlUrl && (
                                  <Tooltip content="Открыть внешнюю ссылку на модель">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(part.stl_url, '_blank');
                                      }}
                                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 transition-colors cursor-pointer"
                                    >
                                      <ExternalLink size={13} />
                                    </button>
                                  </Tooltip>
                                )}

                                {!hasStlFile && !hasStlUrl && (
                                  <span className="text-neutral-600 text-xs">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Б. Разделитель фурнитуры */}
                      {hardware.length > 0 && (
                        <tr className="bg-neutral-900/60 border-t border-b border-white/10 select-none">
                          <td colSpan={9} className="p-2.5 px-3.5">
                            <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Layers size={14} className="text-purple-400" />
                                <span className="font-bold text-purple-300 uppercase tracking-wider text-xs font-sans">
                                  Фурнитура и комплектующие
                                </span>
                                <span className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 font-bold text-[10px]">
                                  {hardware.length} поз. ({totalHwPieces} шт)
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs flex-wrap">
                                <span className="text-neutral-400">
                                  Себестоимость: <strong className="text-white">{formatCurrency(totalHwCost, currencySymbol)}</strong>
                                </span>
                                <span className="text-neutral-400">
                                  Продажа: <strong className="text-purple-300">{formatCurrency(totalHwPrice, currencySymbol)}</strong>
                                </span>
                                <span className="text-emerald-400 font-bold">
                                  Прибыль: +{formatCurrency(totalHwProfit, currencySymbol)}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* В. Строки фурнитуры */}
                      {hardware.map((hw, hIdx) => {
                        const hwId = hw.id || `hw-${hIdx + 1}`;
                        const hwShortId = hw.id ? (hw.id.length > 8 ? hw.id.slice(0, 6) : hw.id) : `${hIdx + 1}`;
                        const hwTotalCost = (hw.cost_per_unit || 0) * (hw.quantity || 1);
                        const hwTotalPrice = (hw.price_per_unit || 0) * (hw.quantity || 1);
                        const hwProfit = Math.round((hwTotalPrice - hwTotalCost) * 100) / 100;
                        const hwMargin =
                          hwTotalPrice > 0
                            ? Math.round(((hwProfit / hwTotalPrice) * 1000)) / 10
                            : 0;

                        return (
                          <tr
                            key={hwId}
                            className="hover:bg-white/[0.02] transition-colors group"
                          >
                            <td className="w-8 px-3 py-2.5 text-center text-purple-400 font-bold">
                              └─
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <Tooltip content={`ID фурнитуры: ${hwId} (Нажмите, чтобы скопировать)`}>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyHwId(e, hwId, hIdx)}
                                  className="inline-flex items-center gap-1 font-mono text-xs font-bold text-purple-300 hover:text-purple-200 transition-colors w-fit cursor-pointer"
                                >
                                  <span>#hw-{hwShortId}</span>
                                  {copiedHwIndex === hIdx ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 opacity-30 group-hover:opacity-80" />
                                  )}
                                </button>
                              </Tooltip>
                            </td>

                            <td className="py-2.5 px-3" colSpan={2}>
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 font-bold text-[10px] shrink-0">
                                  × {hw.quantity} шт
                                </span>
                                <span className="font-semibold text-neutral-200 truncate text-xs font-sans">
                                  {hw.name}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap text-neutral-400">
                              {formatCurrency(hw.cost_per_unit, currencySymbol)} / шт
                            </td>

                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex flex-col items-end">
                                <span className="text-purple-300 font-bold">
                                  {formatCurrency(hwTotalPrice, currencySymbol)}
                                </span>
                                <span className="text-[10px] text-neutral-500">
                                  себ: {formatCurrency(hwTotalCost, currencySymbol)}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className="text-emerald-400 font-bold">
                                {hwProfit > 0 ? `+${formatCurrency(hwProfit, currencySymbol)}` : '0 ₽'}
                                {hwMargin > 0 ? ` (${hwMargin}%)` : ''}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right text-neutral-600">
                              —
                            </td>
                          </tr>
                        );
                      })}

                      {/* Г. Строка ручной сборки */}
                      {laborCost > 0 && (
                        <tr className="bg-neutral-900/40 border-t border-white/5">
                          <td className="w-8 px-3 py-2.5 text-center text-emerald-400 font-bold">
                            └─
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-400">
                              #labor
                            </span>
                          </td>

                          <td className="py-2.5 px-3" colSpan={3}>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-bold text-[10px] shrink-0 flex items-center gap-1">
                                <Wrench size={10} /> {laborMins} мин
                              </span>
                              <span className="font-semibold text-neutral-200 text-xs font-sans">
                                Ручная сборка, пайка и подгонка
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className="text-emerald-400 font-bold">
                              {formatCurrency(laborCost, currencySymbol)}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap text-neutral-400">
                            Труд мастера
                          </td>

                          <td className="py-2.5 px-3 text-right text-neutral-600">
                            —
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
});
