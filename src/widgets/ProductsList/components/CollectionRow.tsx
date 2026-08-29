import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ProductCollection, SavedCalculation } from '../../../shared/types';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { CockpitStatusPill } from '../../../shared/ui/CockpitTable/CockpitStatusPill';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { 
  ChevronRight, 
  Plus, 
  Edit2, 
  Copy, 
  Check, 
  FolderPlus, 
  MoreVertical,
  FileCode
} from 'lucide-react';
import { formatCurrency } from '../../../shared/lib/format';
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

  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const minCost = costs.length > 0 ? Math.min(...costs) : 0;
  const maxCost = costs.length > 0 ? Math.max(...costs) : 0;

  const minWeight = weights.length > 0 ? Math.min(...weights) : 0;
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;

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
      className={`border-b transition-colors cursor-pointer select-none font-mono text-xs ${
        isContextMenuOpen
          ? 'bg-purple-950/40 border-purple-500/40'
          : isExpanded
          ? 'bg-purple-950/25 border-purple-500/40'
          : 'bg-neutral-900/40 hover:bg-neutral-900/80 border-white/5'
      }`}
      onClick={onToggleExpand}
      onContextMenu={onContextMenu}
    >
      {/* 1. Чекбокс */}
      <td
        className="w-8 px-3 py-2.5 text-center"
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

      {/* 2. № / Артикул (#COL-1080) */}
      <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <Tooltip content={`ID коллекции: ${collection.id} (Нажмите, чтобы скопировать)`}>
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1 font-mono font-semibold text-purple-300 hover:text-purple-200 transition-colors cursor-pointer"
          >
            <span>#COL-{shortId}</span>
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
        <Tooltip content="Свойства коллекции">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenEditModal(collection);
            }}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono bg-neutral-900 text-neutral-300 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
          >
            <CatIcon className="w-3 h-3 text-purple-400 shrink-0" />
            <span className="truncate max-w-[120px]">{catLabel}</span>
          </button>
        </Tooltip>
      </td>

      {/* 4. Название коллекции и варианты */}
      <td className="py-2.5 px-3 text-neutral-200 font-sans">
        <div className="flex items-center gap-2 min-w-0">
          {/* Кнопка раскрытия */}
          <Tooltip content={isExpanded ? 'Свернуть' : 'Раскрыть варианты'}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className={`p-1 rounded-md transition-all shrink-0 cursor-pointer ${
                isExpanded
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-950/80 text-purple-300 border border-purple-800/40 hover:bg-purple-900/60'
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
            label={`Коллекция (${childItems.length})`}
            tone="purple"
            icon={FolderPlus}
          />

          <span
            className="font-bold text-white hover:text-purple-300 transition-colors truncate text-xs sm:text-[13px] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename(collection);
            }}
          >
            {collection.name}
          </span>

          {stlCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 inline-flex items-center gap-1">
              <FileCode className="w-2.5 h-2.5" />
              <span>{stlCount} STL</span>
            </span>
          )}
        </div>
      </td>

      {/* 5. Статус склада */}
      <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        {isOut ? (
          <CockpitStatusPill label="0 шт на складе" tone="neutral" dot={false} />
        ) : (
          <CockpitStatusPill label={`${totalStock} шт в наличии`} tone="purple" dot />
        )}
      </td>

      {/* 6. Материалы в коллекции */}
      <td className="py-2.5 px-3 text-neutral-400 font-mono whitespace-nowrap">
        <div className="flex items-center gap-1">
          {matColors.slice(0, 3).map((c, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full border border-white/20 shrink-0"
              style={{ backgroundColor: c }}
            />
          ))}
          <span className="truncate max-w-[100px]">
            {matNames.length > 0 ? `${matNames.length} мат.` : '—'}
          </span>
        </div>
      </td>

      {/* 7. Параметры (Вес) */}
      <td className="py-2.5 px-3 text-neutral-400 font-mono whitespace-nowrap">
        {minWeight === maxWeight ? `${minWeight}г` : `${minWeight}–${maxWeight}г`}
      </td>

      {/* 8. Себестоимость (диапазон) */}
      <td className="py-2.5 px-3 text-right font-mono text-neutral-400 whitespace-nowrap">
        {minCost === maxCost
          ? formatCurrency(minCost, currencySymbol)
          : `${formatCurrency(minCost, currencySymbol)}–${formatCurrency(maxCost, currencySymbol)}`}
      </td>

      {/* 9. Цена (диапазон) */}
      <td className="py-2.5 px-3 text-right font-bold text-purple-300 font-mono whitespace-nowrap">
        {minPrice === maxPrice
          ? formatCurrency(minPrice, currencySymbol)
          : `${formatCurrency(minPrice, currencySymbol)}–${formatCurrency(maxPrice, currencySymbol)}`}
      </td>

      {/* 10. Прибыль */}
      <td className="py-2.5 px-3 text-right text-emerald-400 font-mono whitespace-nowrap">
        +{formatCurrency(totalProfit, currencySymbol)}
      </td>

      {/* 11. Действия */}
      <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {/* Добавить вариант */}
          <Tooltip content="Добавить вариант товара в коллекцию">
            <button
              type="button"
              onClick={() => onOpenAddVariantModal(collection)}
              className="px-2 py-1 rounded-md font-mono text-[11px] font-bold bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800/40 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Вариант</span>
            </button>
          </Tooltip>

          {/* Редактировать */}
          <Tooltip content="Свойства коллекции">
            <button
              type="button"
              onClick={() => onOpenEditModal(collection)}
              className="p-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
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
  );
});
