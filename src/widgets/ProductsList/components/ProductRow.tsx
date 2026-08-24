import React, { useState } from 'react';
import { SavedCalculation, Filament, Printer } from '../../../shared/types';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { NumberCounter } from '../../../shared/ui/NumberCounter';
import { 
  ShoppingCart, 
  Play, 
  Layers, 
  FolderPlus, 
  Trash2, 
  FileCode, 
  Edit2, 
  Tag, 
  Flame, 
  TrendingUp, 
  Printer as PrinterIcon,
  Copy,
  Check,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../shared/lib/format';
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

  // Поиск цвета филамента
  const filObj = filaments.find(
    (f) => f.name.toLowerCase() === (item.filament_name || '').toLowerCase() || f.id === item.filament_id
  );
  const filColor = item.filament_color || filObj?.color || '#888888';

  // Поиск категории
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

  const hasStl = Boolean(item.stl_url || item.stl_file_data);
  const hasUrl = Boolean(item.stl_url);
  const hasFile = Boolean(item.stl_file_data);

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
      className={`border-b transition-all duration-150 cursor-pointer select-none group ${
        isContextMenuOpen
          ? 'bg-amber-500/15 border-amber-500/40 border-l-4 border-l-amber-500'
          : isChildInCollection
          ? 'bg-[#151124]/95 hover:bg-[#1d1732] border-[#2f2247] border-l-4 border-l-purple-500 animate-fade-in shadow-inner'
          : 'bg-[#12141a]/60 hover:bg-[#181c26] border-[#242930]'
      }`}
      onClick={() => onSelectForDrawer(item)}
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
          variant={isChildInCollection ? 'purple' : 'amber'}
          size="sm"
        />
      </td>

      {/* ID и Дата создания */}
      <td className="py-3 px-3 min-w-[105px] whitespace-nowrap cursor-pointer" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleCopyId}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold w-fit shadow-sm cursor-pointer transition-colors ${
              isChildInCollection
                ? 'text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 hover:border-purple-500/60'
                : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50'
            }`}
            title={`ID: ${item.id} (Нажмите, чтобы скопировать)`}
          >
            <span>#prod-{shortId}</span>
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
          {/* Левая часть: название и теги */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {isChildInCollection && (
                <>
                  <span className="text-purple-400 font-mono text-sm select-none font-bold mr-0.5">
                    └─
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-300 border border-purple-500/40 text-[9px] font-bold font-mono shrink-0 uppercase tracking-wider">
                    Вариант
                  </span>
                </>
              )}

              <span
                className={`font-semibold transition-colors truncate block text-xs sm:text-[13px] cursor-pointer ${
                  isChildInCollection ? 'text-purple-100 hover:text-purple-300 font-bold' : 'text-white hover:text-amber-400'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename(item);
                }}
                title="Нажмите, чтобы переименовать"
              >
                {item.name}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCategoryModal(item);
                }}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${catBadgeStyle} cursor-pointer hover:border-amber-500/50 transition-all`}
                title="Изменить категорию"
              >
                <CatIcon className="w-3 h-3 shrink-0" />
                <span>{catLabel}</span>
                <Edit2 size={9} className="text-amber-400 ml-0.5 opacity-70" />
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
            title="Создать заказ из этого товара"
          >
            <ShoppingCart size={13} strokeWidth={2.5} />
            <span>Заказ</span>
          </button>
        </div>
      </td>

      {/* Материал и принтер */}
      <td className="py-3 px-3 min-w-[130px]">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 max-w-[140px]">
            <div
              className="w-3 h-3 rounded-full border border-black/30 shrink-0 shadow-inner"
              style={{ backgroundColor: filColor }}
            />
            <span className="truncate font-medium text-xs text-gray-200" title={item.filament_name || 'Не указан'}>
              {item.filament_name || '—'}
            </span>
          </div>
          {item.printer_name && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
              <PrinterIcon size={10} className="text-gray-500" />
              <span className="truncate max-w-[120px]">{item.printer_name}</span>
            </div>
          )}
        </div>
      </td>

      {/* Параметры печати */}
      <td className="py-3 px-3 min-w-[125px]">
        <div className="flex flex-col gap-0.5 font-mono text-xs">
          <span className="text-white font-semibold">
            {item.weight_g || 0} г
          </span>
          <span className="text-gray-400 text-[11px]">
            {item.hours || 0}ч {item.minutes || 0}м
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
            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              В наличии
            </span>
          )}
        </div>
      </td>

      {/* Цены */}
      <td className="py-3 px-3 text-right">
        <div className="flex flex-col items-end justify-center font-mono whitespace-nowrap min-w-[95px] leading-tight">
          <span className="text-amber-400 font-extrabold text-sm">
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

      {/* 3D STL */}
      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onOpenStlModal(item)}
          className={`px-2 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer border select-none ${
            hasStl
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-[#242930]/40 text-gray-400 border-[#242930] hover:text-white hover:bg-[#242930]'
          }`}
          title={hasStl ? (hasUrl && hasFile ? 'STL файл + Ссылка' : hasUrl ? 'Ссылка на 3D-модель' : 'Скачать STL файл') : 'Добавить 3D-модель'}
        >
          <FileCode size={13} className={hasStl ? 'text-emerald-400' : 'text-gray-400'} />
          <span>{hasStl ? (hasUrl && hasFile ? 'STL+' : hasUrl ? 'Ссылка' : 'Файл') : '+ STL'}</span>
        </button>
      </td>
    </tr>
  );
});
