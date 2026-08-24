import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SavedCalculation, AssemblyPrintedPart } from '../../../shared/types';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { NumberCounter } from '../../../shared/ui/NumberCounter';
import { 
  Box, 
  ChevronRight, 
  Layers, 
  Wrench, 
  ShoppingCart, 
  Edit2, 
  Trash2, 
  FolderPlus, 
  Tag, 
  Flame, 
  TrendingUp,
  Copy,
  Check,
  FileCode,
  Download,
  ExternalLink,
  Printer as PrinterIcon,
  Clock
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../shared/lib/format';
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
  const catBadgeStyle = catObj?.color || 'bg-gray-800 text-gray-400 border-gray-700';

  // Форматирование даты (только дата)
  const dateFormatted = item.created_at
    ? new Date(item.created_at).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

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
        className={`border-b transition-all duration-150 select-none cursor-pointer ${
          isContextMenuOpen
            ? 'bg-cyan-500/15 border-cyan-500/40 border-l-4 border-l-cyan-500'
            : isChildInCollection
            ? 'bg-[#0b121a]/90 hover:bg-[#101b27] border-l-2 border-l-cyan-500/50 animate-fade-in border-[#242930]'
            : 'bg-[#10151f]/85 hover:bg-[#141c28]'
        } ${isExpanded ? 'border-cyan-500/50 bg-[#121926]' : 'border-[#242930]'}`}
        onContextMenu={onContextMenu}
      >
        {/* Чекбокс */}
        <td
          className="w-8 px-2 py-3 text-center"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(item.id);
          }}
        >
          <Checkbox
            checked={isChecked}
            onChange={() => onToggleSelect(item.id)}
            variant="primary"
            size="sm"
          />
        </td>

        {/* ID и Дата создания */}
        <td className="py-3 px-3 min-w-[105px] whitespace-nowrap cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-500/50 w-fit shadow-sm cursor-pointer transition-colors"
              title={`ID: ${item.id} (Нажмите, чтобы скопировать)`}
            >
              <span>#asm-{shortId}</span>
              {copiedId ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-80" />
              )}
            </button>
            <span className="text-[11px] text-gray-400 font-mono tracking-tight" title={item.created_at ? formatDate(item.created_at) : 'Дата не указана'}>
              {dateFormatted}
            </span>
          </div>
        </td>

        {/* Название, категория и кнопка «Заказ» */}
        <td className={`py-3 px-3 ${isChildInCollection ? 'pl-5 sm:pl-7' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            {/* Левая часть */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                {isChildInCollection && (
                  <span className="text-cyan-500/70 font-mono text-xs select-none mr-0.5 font-bold">
                    └─
                  </span>
                )}

                {/* Кнопка раскрытия состава сборки */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand();
                  }}
                  className={`p-1 rounded-lg transition-all shrink-0 cursor-pointer shadow-sm ${
                    isExpanded
                      ? 'bg-cyan-500 text-black font-extrabold shadow-cyan-500/30'
                      : 'bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                  }`}
                  title={isExpanded ? 'Скрыть состав сборки' : 'Раскрыть состав сборки'}
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  >
                    <ChevronRight size={14} />
                  </motion.div>
                </button>

                <span className="px-1.5 py-0.2 bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase tracking-wider rounded-md shrink-0 flex items-center gap-1">
                  <Box size={11} className="text-cyan-400" /> Сборка ({parts.length})
                </span>

                <span
                  className="font-bold text-cyan-200 hover:text-cyan-300 transition-colors truncate block text-xs sm:text-sm cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartRename(item);
                  }}
                  title="Нажмите, чтобы переименовать"
                >
                  {item.name}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pl-6">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCategoryModal(item);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${catBadgeStyle} cursor-pointer hover:border-cyan-500/50 transition-all`}
                  title="Нажмите, чтобы изменить категорию"
                >
                  <CatIcon className="w-3 h-3 shrink-0" />
                  <span>{catLabel}</span>
                </span>

                {salesStat && salesStat.soldQty > 0 && (
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      salesStat.isBestseller
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : 'bg-[#1a1d26] text-amber-300 border border-[#242930]'
                    }`}
                  >
                    <Flame size={10} className="text-amber-400" />
                    <span>{salesStat.soldQty} шт</span>
                  </span>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.2 bg-[#1a1d26] border border-[#262a36] text-gray-400 text-[10px] rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Правая часть: Выделенная главная кнопка «Заказ» */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCreateOrder(item);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold rounded-xl shadow-md shadow-emerald-500/25 flex items-center gap-1.5 text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              title="Создать заказ со сборкой"
            >
              <ShoppingCart size={13} strokeWidth={2.5} />
              <span>Заказ</span>
            </button>
          </div>
        </td>

        {/* Материалы */}
        <td className="py-3 px-3 min-w-[130px]">
          <span className="text-cyan-300/90 text-xs font-medium">
            {parts.length} печатн. {parts.length === 1 ? 'деталь' : parts.length < 5 ? 'детали' : 'деталей'}
            {hardware.length > 0 ? ` + ${hardware.length} фурн.` : ''}
          </span>
        </td>

        {/* Параметры печати */}
        <td className="py-3 px-3 min-w-[125px]">
          <div className="flex flex-col gap-0.5 font-mono text-xs">
            <span className="text-white font-semibold">
              {item.weight_g || 0} г
            </span>
            <span className="text-gray-400 text-[11px]">
              {item.hours || 0}ч {item.minutes || 0}м
              {laborMins > 0 ? ` (+${laborMins}м сборка)` : ''}
            </span>
          </div>
        </td>

        {/* Наличие на складе */}
        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center justify-center gap-1">
            <NumberCounter
              value={stock}
              min={0}
              onChange={(val) => onSetStock(item, val)}
            />
            {isOutOfStock ? (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-red-500/15 border border-red-500/30 text-red-400">
                Нет на складе
              </span>
            ) : isLowStock ? (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                Заканчивается
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                В наличии
              </span>
            )}
          </div>
        </td>

        {/* Цены */}
        <td className="py-3 px-3 text-right">
          <div className="flex flex-col items-end justify-center font-mono whitespace-nowrap min-w-[95px] leading-tight">
            <span className="text-cyan-300 font-extrabold text-sm">
              {formatCurrency(item.final_price, currencySymbol)}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5">
              себ: {formatCurrency(item.base_cost, currencySymbol)}
            </span>
          </div>
        </td>

        {/* Прибыль */}
        <td className="py-3 px-3 text-center">
          <div className="flex flex-col items-center justify-center gap-0.5 font-mono leading-tight whitespace-nowrap">
            <span className={`font-extrabold text-xs sm:text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}
              {formatCurrency(profit, currencySymbol)}
            </span>
            <span className={`text-xs font-bold ${isPositive ? 'text-emerald-400/90' : 'text-red-400/90'}`}>
              {isPositive ? '▲' : '▼'}
              {marginPercent}%
            </span>
          </div>
        </td>

        {/* 3D STL / Состав */}
        <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggleExpand}
            className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer select-none mx-auto ${
              isExpanded
                ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-sm'
                : 'bg-[#141b24] text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/20'
            }`}
          >
            <span>{isExpanded ? 'Скрыть' : 'Состав'}</span>
          </button>
        </td>
      </tr>

      {/* Раскрывающийся состав сборки — полноформатные строки деталей и фурнитуры с колонками как в таблице */}
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            key={`assembly-expansion-${item.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-[#0b0e14]"
          >
            <td colSpan={9} className="p-0 overflow-hidden border-b border-[#242930]/80">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="overflow-hidden bg-[#090d14]/95 shadow-inner"
              >
                {/* 1. Шапка 3D-печатных деталей (Циан-плашка) */}
                <div className="p-3 px-4 bg-gradient-to-r from-cyan-500/15 via-[#131b26] to-[#0f141f] border-l-4 border-l-cyan-500 border-b border-[#242930] flex items-center justify-between gap-3 flex-wrap text-xs select-none">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Box size={16} className="text-cyan-400" />
                    <span className="font-bold text-cyan-300 uppercase tracking-wider text-xs">
                      3D-печатные детали: «{item.name}»
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[10px]">
                      {parts.length} поз. ({totalPartsPieces} шт)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
                    <span className="text-gray-400">
                      Себестоимость: <strong className="text-white">{formatCurrency(totalPartsCost, currencySymbol)}</strong>
                    </span>
                    <span className="text-gray-400">
                      Продажа: <strong className="text-cyan-300">{formatCurrency(totalPartsPrice, currencySymbol)}</strong>
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Прибыль: +{formatCurrency(totalPartsProfit, currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* 2. Таблица состава сборки: 3D-детали, фурнитура и ручной труд */}
                <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                  <colgroup>
                    <col className="w-8" />
                    <col className="w-[105px]" />
                    <col />
                    <col className="w-[130px]" />
                    <col className="w-[125px]" />
                    <col className="w-[95px]" />
                    <col className="w-[105px]" />
                    <col className="w-[95px]" />
                    <col className="w-[80px]" />
                  </colgroup>
                  <tbody>
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
                          className="border-b border-[#242930]/80 bg-[#090e17]/90 hover:bg-[#0e1624] border-l-2 border-l-cyan-500/50 transition-colors group"
                        >
                          {/* 1. Древовидная метка */}
                          <td className="w-8 px-2 py-2.5 text-center text-cyan-500/70 font-mono text-xs font-bold">
                            └─
                          </td>

                          {/* 2. ID / Номер детали */}
                          <td className="py-2.5 px-3 min-w-[105px] whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => handleCopyPartId(e, partId, pIdx)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-500/50 w-fit shadow-sm cursor-pointer transition-colors"
                                title={`ID детали: ${partId} (Нажмите, чтобы скопировать)`}
                              >
                                <span>#part-{partShortId}</span>
                                {copiedPartIndex === pIdx ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-80" />
                                )}
                              </button>
                              <span className="text-[10px] text-gray-500 font-mono">3D деталь</span>
                            </div>
                          </td>

                          {/* 3. Название детали */}
                          <td className="py-2.5 px-3 pl-4">
                            <div className="flex flex-col gap-0.5 max-w-[300px] sm:max-w-[400px]">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold font-mono text-[10px] shrink-0">
                                  × {part.quantity} шт
                                </span>
                                <span className="font-bold text-white tracking-tight truncate block text-xs">
                                  {part.name}
                                </span>
                              </div>
                              {part.printer_name && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                                  <PrinterIcon size={10} className="text-gray-500" />
                                  <span>{part.printer_name}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 4. Материал и цвет */}
                          <td className="py-2.5 px-3 min-w-[130px]">
                            <div className="flex items-center gap-1.5 max-w-[140px]">
                              {part.filament_color && (
                                <div
                                  className="w-3 h-3 rounded-full border border-black/30 shrink-0 shadow-inner"
                                  style={{ backgroundColor: part.filament_color }}
                                />
                              )}
                              <span className="truncate font-medium text-xs text-gray-200" title={part.filament_name || 'PLA'}>
                                {part.filament_name || 'PLA'}
                              </span>
                            </div>
                          </td>

                          {/* 5. Параметры печати */}
                          <td className="py-2.5 px-3 min-w-[125px]">
                            <div className="flex flex-col gap-0.5 font-mono text-xs">
                              <span className="text-white font-semibold">
                                {part.weight_g || 0} г
                                {part.quantity > 1 ? (
                                  <span className="text-[10px] text-gray-400 font-normal ml-1">
                                    ({(part.weight_g || 0) * part.quantity}г)
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-gray-400 text-[11px]">
                                {part.hours || 0}ч {part.minutes || 0}м
                              </span>
                            </div>
                          </td>

                          {/* 6. Количество в сборке */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex flex-col items-center justify-center gap-0.5 font-mono">
                              <span className="px-2 py-0.5 bg-[#121c2a] border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-bold">
                                {part.quantity} шт
                              </span>
                            </div>
                          </td>

                          {/* 7. Стоимость и себестоимость */}
                          <td className="py-2.5 px-3 text-right font-mono">
                            <div className="flex flex-col items-end justify-center whitespace-nowrap min-w-[95px] leading-tight">
                              <span className="text-cyan-300 font-bold text-xs sm:text-sm">
                                {formatCurrency((part.final_price || 0) * (part.quantity || 1), currencySymbol)}
                              </span>
                              <span className="text-[10px] text-gray-400 mt-0.5">
                                себ: {formatCurrency((part.base_cost || 0) * (part.quantity || 1), currencySymbol)}
                              </span>
                            </div>
                          </td>

                          {/* 8. Прибыль и маржа */}
                          <td className="py-2.5 px-3 text-center font-mono">
                            <div className="flex flex-col items-center justify-center gap-0.5 leading-tight whitespace-nowrap">
                              <span className="font-bold text-xs text-emerald-400">
                                +{formatCurrency(partProfit, currencySymbol)}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-400/90">
                                ▲{partMargin}%
                              </span>
                            </div>
                          </td>

                          {/* 9. 3D-Модель (STL) */}
                          <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              {hasStlFile && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadPartStl(e, part)}
                                  className="p-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 transition-colors cursor-pointer"
                                  title={`Скачать STL (${part.stl_file_name || 'файл'})`}
                                >
                                  <Download size={13} />
                                </button>
                              )}

                              {hasStlUrl && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(part.stl_url, '_blank');
                                  }}
                                  className="p-1 rounded-lg bg-[#1a1d26] hover:bg-[#242930] border border-[#242930] text-gray-300 transition-colors cursor-pointer"
                                  title="Открыть внешнюю ссылку на модель"
                                >
                                  <ExternalLink size={13} />
                                </button>
                              )}

                              {!hasStlFile && !hasStlUrl && (
                                <span className="text-gray-600 text-xs font-mono">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Б. Разделительная плашка фурнитуры (Синяя плашка, отделяющая секцию) */}
                    {hardware.length > 0 && (
                      <tr className="border-t-2 border-b border-[#242930] bg-gradient-to-r from-blue-500/20 via-[#101826] to-[#0d121c] border-l-4 border-l-blue-500 select-none">
                        <td colSpan={9} className="p-3 px-4">
                          <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Layers size={16} className="text-blue-400" />
                              <span className="font-bold text-blue-300 uppercase tracking-wider text-xs">
                                Фурнитура и комплектующие
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold text-[10px]">
                                {hardware.length} поз. ({totalHwPieces} шт)
                              </span>
                            </div>

                            <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
                              <span className="text-gray-400">
                                Себестоимость: <strong className="text-white">{formatCurrency(totalHwCost, currencySymbol)}</strong>
                              </span>
                              <span className="text-gray-400">
                                Продажа: <strong className="text-blue-300">{formatCurrency(totalHwPrice, currencySymbol)}</strong>
                              </span>
                              <span className="text-emerald-400 font-bold">
                                Прибыль: +{formatCurrency(totalHwProfit, currencySymbol)}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* В. Строки фурнитуры и покупных компонентов */}
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
                          className="border-b border-[#242930]/80 bg-[#080d18]/90 hover:bg-[#0d1526] border-l-2 border-l-blue-500/60 transition-colors group"
                        >
                          {/* 1. Древовидная метка */}
                          <td className="w-8 px-2 py-2.5 text-center text-blue-400/80 font-mono text-xs font-bold">
                            └─
                          </td>

                          {/* 2. ID фурнитуры */}
                          <td className="py-2.5 px-3 min-w-[105px] whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => handleCopyHwId(e, hwId, hIdx)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 hover:border-blue-500/50 w-fit shadow-sm cursor-pointer transition-colors"
                                title={`ID фурнитуры: ${hwId} (Нажмите, чтобы скопировать)`}
                              >
                                <span>#hw-{hwShortId}</span>
                                {copiedHwIndex === hIdx ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-80" />
                                )}
                              </button>
                              <span className="text-[10px] text-blue-400/70 font-mono">фурнитура</span>
                            </div>
                          </td>

                          {/* 3. Наименование фурнитуры */}
                          <td className="py-2.5 px-3 pl-4">
                            <div className="flex items-center gap-2 min-w-0 max-w-[300px] sm:max-w-[400px]">
                              <span className="px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold font-mono text-[10px] shrink-0">
                                × {hw.quantity} шт
                              </span>
                              <span className="font-semibold text-gray-200 truncate text-xs">
                                {hw.name}
                              </span>
                            </div>
                          </td>

                          {/* 4. Тип / Категория */}
                          <td className="py-2.5 px-3 min-w-[130px]">
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300/90 border border-blue-500/25 text-[11px] font-medium inline-flex items-center gap-1">
                              <Layers size={11} className="text-blue-400" />
                              <span>Метизы / Крепеж</span>
                            </span>
                          </td>

                          {/* 5. Цена за единицу */}
                          <td className="py-2.5 px-3 min-w-[125px]">
                            <div className="flex flex-col gap-0.5 font-mono text-xs text-gray-400">
                              <span>{formatCurrency(hw.cost_per_unit, currencySymbol)} / шт</span>
                              <span className="text-[10px] text-gray-500">себестоимость</span>
                            </div>
                          </td>

                          {/* 6. Количество */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex flex-col items-center justify-center gap-0.5 font-mono">
                              <span className="px-2 py-0.5 bg-[#0f1728] border border-blue-500/30 text-blue-300 rounded-lg text-xs font-bold">
                                {hw.quantity} шт
                              </span>
                            </div>
                          </td>

                          {/* 7. Стоимость и себестоимость */}
                          <td className="py-2.5 px-3 text-right font-mono">
                            <div className="flex flex-col items-end justify-center whitespace-nowrap min-w-[95px] leading-tight">
                              <span className="text-blue-300 font-bold text-xs sm:text-sm">
                                {formatCurrency(hwTotalPrice, currencySymbol)}
                              </span>
                              <span className="text-[10px] text-gray-400 mt-0.5">
                                себ: {formatCurrency(hwTotalCost, currencySymbol)}
                              </span>
                            </div>
                          </td>

                          {/* 8. Прибыль и маржа */}
                          <td className="py-2.5 px-3 text-center font-mono">
                            <div className="flex flex-col items-center justify-center gap-0.5 leading-tight whitespace-nowrap">
                              <span className={`font-bold text-xs ${hwProfit > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                                {hwProfit > 0 ? `+${formatCurrency(hwProfit, currencySymbol)}` : '0 ₽'}
                              </span>
                              <span className={`text-[10px] font-bold ${hwMargin > 0 ? 'text-emerald-400/90' : 'text-gray-500'}`}>
                                {hwMargin > 0 ? `▲${hwMargin}%` : '—'}
                              </span>
                            </div>
                          </td>

                          {/* 9. 3D-Модель */}
                          <td className="py-2.5 px-2 text-center text-gray-600 text-xs font-mono">
                            —
                          </td>
                        </tr>
                      );
                    })}

                    {/* Г. Разделительная плашка ручной сборки мастера */}
                    {laborCost > 0 && (
                      <tr className="border-t-2 border-b border-[#242930] bg-gradient-to-r from-emerald-500/20 via-[#0c1815] to-[#091210] border-l-4 border-l-emerald-500 select-none">
                        <td colSpan={9} className="p-3 px-4">
                          <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Wrench size={16} className="text-emerald-400" />
                              <span className="font-bold text-emerald-300 uppercase tracking-wider text-xs">
                                Ручная сборка и подгонка
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                                {laborMins} мин работы
                              </span>
                            </div>

                            <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
                              <span className="text-gray-400">
                                Труд мастера в себестоимости: <strong className="text-emerald-300">{formatCurrency(laborCost, currencySymbol)}</strong>
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Д. Строка ручного труда мастера */}
                    {laborCost > 0 && (
                      <tr className="border-b border-[#242930]/80 bg-[#071310]/85 hover:bg-[#0a1c17] border-l-2 border-l-emerald-500/60 transition-colors group">
                        {/* 1. Древовидная метка */}
                        <td className="w-8 px-2 py-2.5 text-center text-emerald-400/80 font-mono text-xs font-bold">
                          └─
                        </td>

                        {/* 2. ID труда */}
                        <td className="py-2.5 px-3 min-w-[105px] whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 w-fit shadow-sm">
                              #labor
                            </span>
                            <span className="text-[10px] text-emerald-400/70 font-mono">сборка</span>
                          </div>
                        </td>

                        {/* 3. Название */}
                        <td className="py-2.5 px-3 pl-4">
                          <div className="flex items-center gap-2 min-w-0 max-w-[300px] sm:max-w-[400px]">
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold font-mono text-[10px] shrink-0 flex items-center gap-1">
                              <Wrench size={10} /> {laborMins} мин
                            </span>
                            <span className="font-semibold text-emerald-200 truncate text-xs">
                              Ручная сборка и подгонка деталей
                            </span>
                          </div>
                        </td>

                        {/* 4. Тип */}
                        <td className="py-2.5 px-3 min-w-[130px]">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300/90 border border-emerald-500/25 text-[11px] font-medium inline-flex items-center gap-1">
                            <Clock size={11} className="text-emerald-400" />
                            <span>Труд мастера</span>
                          </span>
                        </td>

                        {/* 5. Параметры времени */}
                        <td className="py-2.5 px-3 min-w-[125px]">
                          <div className="flex flex-col gap-0.5 font-mono text-xs text-gray-400">
                            <span className="text-emerald-300 font-semibold">{laborMins} минут</span>
                            <span className="text-[10px] text-gray-500">время работы</span>
                          </div>
                        </td>

                        {/* 6. Количество */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex flex-col items-center justify-center gap-0.5 font-mono">
                            <span className="px-2 py-0.5 bg-[#0a1815] border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold">
                              1 цикл
                            </span>
                          </div>
                        </td>

                        {/* 7. Стоимость */}
                        <td className="py-2.5 px-3 text-right font-mono">
                          <div className="flex flex-col items-end justify-center whitespace-nowrap min-w-[95px] leading-tight">
                            <span className="text-emerald-300 font-bold text-xs sm:text-sm">
                              {formatCurrency(laborCost, currencySymbol)}
                            </span>
                            <span className="text-[10px] text-gray-400 mt-0.5">
                              в цене изделия
                            </span>
                          </div>
                        </td>

                        {/* 8. Прибыль */}
                        <td className="py-2.5 px-3 text-center font-mono">
                          <div className="flex flex-col items-center justify-center gap-0.5 leading-tight whitespace-nowrap">
                            <span className="font-bold text-xs text-emerald-400">
                              +{formatCurrency(laborCost, currencySymbol)}
                            </span>
                            <span className="text-[10px] text-emerald-400/90">
                              100% труд
                            </span>
                          </div>
                        </td>

                        {/* 9. 3D-Модель */}
                        <td className="py-2.5 px-2 text-center text-gray-600 text-xs font-mono">
                          —
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
});
