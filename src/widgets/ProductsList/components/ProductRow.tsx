import React, { useState } from 'react';
import { SavedCalculation, Filament, Printer } from '../../../shared/types';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { CockpitStatusPill } from '../../../shared/ui/CockpitTable/CockpitStatusPill';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { 
  ShoppingCart, 
  Calculator, 
  Layers, 
  FileCode, 
  Edit2, 
  Copy, 
  Check, 
  MoreVertical,
  Plus,
  Minus
} from 'lucide-react';
import { formatCurrency } from '../../../shared/lib/format';
import { ProductCategory, getCategoryLucideIcon } from '../../../shared/lib/categories';
import { SalesStatInfo } from '../types';

interface ProductRowProps {
  item: SavedCalculation;
  isChecked: boolean;
  onToggleSelect: (id: string) => void;
  onSelectForDrawer: (item: SavedCalculation) => void;
  onStartRename: (item: SavedCalculation) => void;
  onSetStock: (item: SavedCalculation, newStock: number) => void;
  onOpenCategoryModal: (item: SavedCalculation) => void;
  onOpenQuickEditModal: (item: SavedCalculation) => void;
  onCreateOrder: (item: SavedCalculation) => void;
  onLoadIntoCalculator: (item: SavedCalculation) => void;
  onStageForAssembly: (item: SavedCalculation) => void;
  isStagedInAssembly: boolean;
  stagedQty?: number;
  onOpenMoveProduct: (item: SavedCalculation) => void;
  onOpenStlModal: (item: SavedCalculation) => void;
  onDelete: (id: string, name: string, type?: string) => void;
  salesStat?: SalesStatInfo;
  currencySymbol: string;
  categoriesList: ProductCategory[];
  filaments: Filament[];
  printers: Printer[];
  isChildInCollection?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  isContextMenuOpen?: boolean;
}

export const ProductRow = React.memo(function ProductRow({
  item,
  isChecked,
  onToggleSelect,
  onSelectForDrawer,
  onStartRename,
  onSetStock,
  onOpenCategoryModal,
  onOpenQuickEditModal,
  onCreateOrder,
  onLoadIntoCalculator,
  onStageForAssembly,
  isStagedInAssembly,
  stagedQty = 0,
  onOpenMoveProduct,
  onOpenStlModal,
  onDelete,
  salesStat,
  currencySymbol,
  categoriesList,
  filaments,
  printers,
  isChildInCollection = false,
  onContextMenu,
  isContextMenuOpen = false,
}: ProductRowProps) {
  const [copiedId, setCopiedId] = useState(false);

  const stock = item.stock_quantity || 0;
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock <= 2;

  const profit = Math.round(((item.final_price || 0) - (item.base_cost || 0)) * 100) / 100;
  const marginPercent =
    item.final_price && item.final_price > 0 ? Math.round((profit / item.final_price) * 1000) / 10 : 0;
  const isPositive = profit >= 0;

  // Цвет филамента
  const filObj = filaments.find(
    (f) => f.name.toLowerCase() === (item.filament_name || '').toLowerCase() || f.id === item.filament_id
  );
  const filColor = item.filament_color || filObj?.color || '#888888';

  // Категория
  const catObj = categoriesList.find((c) => c.label === item.category || c.id === item.category);
  const catLabel = catObj?.label || item.category || 'Разное';
  const CatIcon = getCategoryLucideIcon(catLabel);

  const shortId = item.id ? (item.id.length > 8 ? item.id.slice(0, 6) : item.id) : '—';
  const hasStl = Boolean(item.stl_url || item.stl_file_data);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.id && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(item.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    }
  };

  return (
    <tr
      className={`border-b border-white/5 transition-colors cursor-pointer select-none group font-mono text-xs ${
        isContextMenuOpen
          ? 'bg-cyan-950/40 border-cyan-500/40'
          : isChecked
          ? 'bg-white/[0.04]'
          : isChildInCollection
          ? 'bg-neutral-950/60 hover:bg-neutral-900/60'
          : 'hover:bg-white/[0.02]'
      }`}
      onClick={() => onSelectForDrawer(item)}
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

      {/* 2. № / Артикул (#PRD-1082) */}
      <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <Tooltip content={`Артикул: ${item.id} (Нажмите, чтобы скопировать)`}>
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1 text-white hover:text-cyan-400 transition-colors cursor-pointer font-mono font-semibold"
          >
            <span>#PRD-{shortId}</span>
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

      {/* 4. Изделие / Детали */}
      <td className={`py-2.5 px-3 text-neutral-200 font-sans ${isChildInCollection ? 'pl-6' : ''}`}>
        <div className="flex items-center gap-2 min-w-0">
          {isChildInCollection && (
            <span className="text-purple-400 font-mono text-xs font-bold select-none shrink-0">
              └─
            </span>
          )}

          <span
            className="font-bold text-white group-hover:text-cyan-300 transition-colors truncate text-xs sm:text-[13px]"
            onClick={(e) => {
              e.stopPropagation();
              onSelectForDrawer(item);
            }}
          >
            {item.name}
          </span>

          {/* Быстрое переименование */}
          <Tooltip content="Переименовать">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartRename(item);
              }}
              className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-neutral-400 hover:text-white transition-opacity p-0.5"
            >
              <Edit2 className="w-2.5 h-2.5" />
            </button>
          </Tooltip>

          {/* STL метка */}
          {hasStl && (
            <Tooltip content="Открыть 3D STL">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenStlModal(item);
                }}
                className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 inline-flex items-center gap-1 cursor-pointer hover:bg-cyan-900/80"
              >
                <FileCode className="w-2.5 h-2.5" />
                <span>STL</span>
              </button>
            </Tooltip>
          )}
        </div>
      </td>

      {/* 5. Статус склада (CockpitStatusPill) */}
      <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {isOutOfStock ? (
            <CockpitStatusPill label="Под заказ" tone="neutral" dot={false} />
          ) : isLowStock ? (
            <CockpitStatusPill label={`Мало (${stock} шт)`} tone="yellow" pulse />
          ) : (
            <CockpitStatusPill label={`В наличии (${stock} шт)`} tone="emerald" dot />
          )}

          {/* Кнопки регулировки остатка */}
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

      {/* 6. Пластик */}
      <td className="py-2.5 px-3 text-neutral-400 font-mono whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full border border-white/20 shrink-0"
            style={{ backgroundColor: filColor }}
          />
          <Tooltip content={`Филамент: ${item.filament_name || 'Не указан'}`}>
            <span className="truncate max-w-[130px]">
              {item.filament_name || '—'}
            </span>
          </Tooltip>
        </div>
      </td>

      {/* 7. Параметры (Вес / Время) */}
      <td className="py-2.5 px-3 text-neutral-400 font-mono whitespace-nowrap">
        {item.weight_g || 0}г · {item.hours || 0}ч {item.minutes || 0}м
      </td>

      {/* 8. Себестоимость */}
      <td className="py-2.5 px-3 text-right font-mono text-neutral-400 whitespace-nowrap">
        {formatCurrency(item.base_cost, currencySymbol)}
      </td>

      {/* 9. Цена */}
      <td className="py-2.5 px-3 text-right font-bold text-white font-mono whitespace-nowrap">
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
          {/* Создать заказ */}
          <Tooltip content="Создать заказ в CRM">
            <button
              type="button"
              onClick={() => onCreateOrder(item)}
              className="px-2 py-1 rounded-md font-mono text-[11px] font-bold bg-white text-neutral-950 hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <ShoppingCart className="w-3 h-3" />
              <span>Заказ</span>
            </button>
          </Tooltip>

          {/* В Калькулятор */}
          <Tooltip content="Открыть в Калькуляторе">
            <button
              type="button"
              onClick={() => onLoadIntoCalculator(item)}
              className="p-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <Calculator className="w-3 h-3" />
            </button>
          </Tooltip>

          {/* В Сборку */}
          <Tooltip content={isStagedInAssembly ? `В черновике сборки (${stagedQty} шт)` : 'Добавить в сборку'}>
            <button
              type="button"
              onClick={() => onStageForAssembly(item)}
              className={`p-1 rounded-md border transition-colors cursor-pointer ${
                isStagedInAssembly
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
  );
});

