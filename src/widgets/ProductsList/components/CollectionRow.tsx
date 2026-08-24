import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ProductCollection, SavedCalculation } from '../../../shared/types';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { 
  Layers, 
  ChevronRight, 
  Plus, 
  Edit2, 
  Trash2, 
  FileCode, 
  Copy, 
  Check, 
  Calendar 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../shared/lib/format';
import { ProductCategory, getCategoryLucideIcon } from '../../../shared/lib/categories';

interface CollectionRowProps {
  collection: ProductCollection;
  childItems: SavedCalculation[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  selectedIds: string[];
  onToggleSelectAllChilds: () => void;
  onStartRename: (col: ProductCollection) => void;
  onOpenEditModal: (col: ProductCollection) => void;
  onOpenAddVariantModal: (col: ProductCollection) => void;
  onOpenDeleteModal: (col: ProductCollection) => void;
  currencySymbol: string;
  categoriesList: ProductCategory[];
  onContextMenu?: (e: React.MouseEvent) => void;
  isContextMenuOpen?: boolean;
}

export const CollectionRow = React.memo(function CollectionRow({
  collection,
  childItems,
  isExpanded,
  onToggleExpand,
  selectedIds,
  onToggleSelectAllChilds,
  onStartRename,
  onOpenEditModal,
  onOpenAddVariantModal,
  onOpenDeleteModal,
  currencySymbol,
  categoriesList,
  onContextMenu,
  isContextMenuOpen = false,
}: CollectionRowProps) {
  const [copiedId, setCopiedId] = useState(false);

  const childIds = childItems.map((c) => c.id);
  const isAllChildsChecked = childIds.length > 0 && childIds.every((id) => selectedIds.includes(id));
  const isSomeChildsChecked = childIds.some((id) => selectedIds.includes(id)) && !isAllChildsChecked;

  const prices = childItems.map((c) => c.final_price || c.base_cost || 0);
  const costs = childItems.map((c) => c.base_cost || 0);
  const weights = childItems.map((c) => c.weight_g || 0);
  const minutesTotal = childItems.map((c) => (c.hours || 0) * 60 + (c.minutes || 0));

  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const minCost = costs.length > 0 ? Math.min(...costs) : 0;
  const maxCost = costs.length > 0 ? Math.max(...costs) : 0;

  const minWeight = weights.length > 0 ? Math.min(...weights) : 0;
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;

  const minTimeMins = minutesTotal.length > 0 ? Math.min(...minutesTotal) : 0;
  const maxTimeMins = minutesTotal.length > 0 ? Math.max(...minutesTotal) : 0;
  const minHours = Math.floor(minTimeMins / 60);
  const minMins = minTimeMins % 60;
  const maxHours = Math.floor(maxTimeMins / 60);
  const maxMins = maxTimeMins % 60;

  const totalStock = childItems.reduce((sum, c) => sum + (c.stock_quantity || 0), 0);
  const isOut = totalStock === 0;
  const totalProfit = childItems.reduce(
    (sum, c) => sum + ((c.final_price || 0) - (c.base_cost || 0)) * (c.stock_quantity || 1),
    0
  );

  const matNames = Array.from(new Set(childItems.map((c) => c.filament_name).filter(Boolean)));
  const matColors = Array.from(new Set(childItems.map((c) => c.filament_color).filter(Boolean))) as string[];
  const stlCount = childItems.filter((c) => c.stl_url || c.stl_file_data).length;

  const catObj = categoriesList.find((c) => c.label === collection.category || c.id === collection.category);
  const catLabel = catObj?.label || collection.category || 'Разное';
  const CatIcon = getCategoryLucideIcon(catLabel);
  const catBadgeStyle = catObj?.color || 'bg-gray-800 text-gray-400 border-gray-700';

  // Форматирование даты (только дата)
  const dateFormatted = collection.created_at
    ? new Date(collection.created_at).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  const shortId = collection.id ? (collection.id.length > 8 ? collection.id.slice(0, 6) : collection.id) : '—';

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (collection.id && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(collection.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    }
  };

  return (
    <tr
      className={`border-b transition-colors cursor-pointer select-none ${
        isContextMenuOpen
          ? 'bg-purple-500/20 border-purple-500/40 border-l-4 border-l-purple-500'
          : isExpanded
          ? 'bg-gradient-to-r from-purple-500/30 via-[#1c132c] to-[#140e21] border-t-2 border-b border-purple-500/60 font-semibold shadow-lg border-l-4 border-l-purple-400'
          : 'bg-[#141520]/90 hover:bg-purple-500/15 border-[#242930] font-medium'
      }`}
      onClick={onToggleExpand}
      onContextMenu={onContextMenu}
    >
      {/* Чекбокс */}
      <td
        className="w-8 px-2 py-3 text-center"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelectAllChilds();
        }}
      >
        <Checkbox
          checked={isAllChildsChecked}
          indeterminate={isSomeChildsChecked}
          onChange={onToggleSelectAllChilds}
          variant="purple"
          size="sm"
        />
      </td>

      {/* ID и Дата создания */}
      <td className="py-3 px-3 min-w-[105px] whitespace-nowrap cursor-pointer" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 hover:border-purple-500/50 w-fit shadow-sm cursor-pointer transition-colors"
            title={`ID коллекции: ${collection.id} (Нажмите, чтобы скопировать)`}
          >
            <span>#col-{shortId}</span>
            {copiedId ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-80" />
            )}
          </button>
          <span className="text-[11px] text-gray-400 font-mono tracking-tight" title={collection.created_at ? formatDate(collection.created_at) : 'Дата не указана'}>
            {dateFormatted}
          </span>
        </div>
      </td>

      {/* Название, категория и кнопка «+ Вариант» */}
      <td className="py-3 px-3">
        <div className="flex items-center justify-between gap-3">
          {/* Левая часть */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Кнопка раскрытия */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className={`p-1 rounded-lg transition-all shrink-0 cursor-pointer shadow-sm ${
                  isExpanded
                    ? 'bg-purple-500 text-white font-extrabold shadow-purple-500/30'
                    : 'bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                }`}
                title={isExpanded ? 'Свернуть коллекцию' : 'Раскрыть варианты коллекции'}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                >
                  <ChevronRight size={14} />
                </motion.div>
              </button>

              <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500/25 to-indigo-500/15 border border-purple-500/50 text-purple-300 text-[10px] font-bold uppercase tracking-wider rounded-lg shrink-0 flex items-center gap-1.5 shadow-sm">
                <Layers size={11} className="text-purple-400" />
                <span>Коллекция ({childItems.length})</span>
              </span>

              <span
                className="font-bold text-purple-200 hover:text-purple-300 transition-colors truncate block text-xs sm:text-sm cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename(collection);
                }}
                title="Нажмите, чтобы переименовать"
              >
                {collection.name}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pl-8">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditModal(collection);
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${catBadgeStyle} cursor-pointer hover:border-purple-500/50 transition-all`}
                title="Нажмите, чтобы редактировать параметры"
              >
                <CatIcon className="w-3 h-3 shrink-0" />
                <span>{catLabel}</span>
                <Edit2 size={9} className="text-purple-400 ml-0.5 opacity-70 hover:opacity-100" />
              </span>

              {collection.tags && collection.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  {collection.tags.map((tag, idx) => (
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

          {/* Правая часть: Выделенная главная кнопка «+ Вариант» */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAddVariantModal(collection);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-extrabold rounded-xl shadow-md shadow-purple-500/25 flex items-center gap-1.5 text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            title="Добавить новый товар в эту коллекцию"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>Вариант</span>
          </button>
        </div>
      </td>

      {/* Материалы */}
      <td className="py-3 px-3 min-w-[130px]">
        <div className="flex items-center gap-1.5 max-w-[140px]">
          {matColors.length > 0 && (
            <div className="flex items-center -space-x-1 shrink-0">
              {matColors.slice(0, 3).map((c, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border border-black/40 shadow-inner"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
          <span className="truncate font-medium text-xs text-purple-200" title={matNames.join(', ')}>
            {matNames.length > 0
              ? `${matNames.slice(0, 2).join(', ')}${matNames.length > 2 ? ` (+${matNames.length - 2})` : ''}`
              : 'Несколько'}
          </span>
        </div>
      </td>

      {/* Параметры печати */}
      <td className="py-3 px-3 min-w-[125px]">
        <div className="flex flex-col gap-0.5 font-mono text-xs">
          <span className="text-white font-semibold">
            {minWeight === maxWeight ? `${minWeight} г` : `${minWeight}–${maxWeight} г`}
          </span>
          <span className="text-gray-400 text-[11px]">
            {minHours === maxHours && minMins === maxMins
              ? `${minHours}ч ${minMins}м`
              : `${minHours}ч–${maxHours}ч`}
          </span>
        </div>
      </td>

      {/* Наличие на складе */}
      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-purple-300 font-mono font-bold text-xs bg-[#161822] px-2.5 py-1 rounded-lg border border-purple-500/30">
            {totalStock} <span className="text-gray-400 font-sans font-normal text-[10px]">шт</span>
          </span>
          {isOut ? (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-red-500/15 border border-red-500/30 text-red-400">
              Нет на складе
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300">
              Всего в коллекции
            </span>
          )}
        </div>
      </td>

      {/* Цены */}
      <td className="py-3 px-3 text-right">
        <div className="flex flex-col items-end justify-center font-mono whitespace-nowrap min-w-[95px] leading-tight">
          <span className="text-purple-300 font-extrabold text-sm">
            {minPrice === maxPrice
              ? formatCurrency(minPrice, currencySymbol)
              : `${formatCurrency(minPrice, currencySymbol)}–${formatCurrency(maxPrice, currencySymbol)}`}
          </span>
          <span className="text-[11px] text-gray-400 mt-0.5">
            себ:{' '}
            {minCost === maxCost
              ? formatCurrency(minCost, currencySymbol)
              : `${formatCurrency(minCost, currencySymbol)}–${formatCurrency(maxCost, currencySymbol)}`}
          </span>
        </div>
      </td>

      {/* Прибыль */}
      <td className="py-3 px-3 text-center">
        <div className="flex flex-col items-center justify-center gap-0.5 font-mono leading-tight whitespace-nowrap">
          <span className="font-extrabold text-xs sm:text-sm text-emerald-400">
            +{formatCurrency(totalProfit, currencySymbol)}
          </span>
          <span className="text-[10px] text-gray-400 font-sans">
            потенциал
          </span>
        </div>
      </td>

      {/* 3D STL */}
      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
        <span className="px-2 py-0.5 bg-[#1a1d24] border border-purple-500/30 text-purple-300 rounded-lg text-xs font-mono inline-flex items-center gap-1">
          <FileCode size={12} className="text-purple-400" />
          <span>{stlCount > 0 ? `${stlCount} STL` : '—'}</span>
        </span>
      </td>
    </tr>
  );
});
