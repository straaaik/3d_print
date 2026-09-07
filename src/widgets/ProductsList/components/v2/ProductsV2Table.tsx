import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CatalogTableRow,
  SortField,
  SortOrder,
  SalesStatInfo,
  formatProductArticle
} from '../../types';
import {
  SavedCalculation,
  ProductCollection,
  AssemblyPrintedPart,
  Filament,
  Printer,
  Settings
} from '../../../../shared/types';
import { formatCurrency } from '../../../../shared/lib/format';
import { round2 } from '../../../../shared/lib/formulas';
import { calculateCost } from '../../../../features/calculate-cost/model/calculate';
import { ProductCategory, getCategoryLucideIcon } from '../../../../shared/lib/categories';
import {
  ChevronUp,
  ChevronDown,
  Edit2,
  Copy,
  Check,
  Trash2,
  Package,
  Layers,
  FolderPlus,
  Flame,
  Plus,
  Minus,
  Calculator as CalculatorIcon,
  FileCode,
  ShoppingCart,
  ChevronRight,
  FolderInput,
  Tag,
  Clock,
  CheckSquare,
  X,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip } from '../../../../shared/ui/Tooltip';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { AnimatedPriceNumber } from '../../../../shared/ui/AnimatedPriceNumber';
import { CockpitStatusPill } from '../../../../shared/ui/CockpitTable/CockpitStatusPill';
import { ProductRowDrawer } from './ProductRowDrawer';

// Точные моноширинные сетки колонок (CSS Grid) — абсолютная синхронизация thead и tbody
export const PRODUCTS_EXPANDED_COLUMNS = '112px 96px 144px minmax(220px,1.5fr) 136px 128px 144px 128px 128px 144px 112px 96px 136px';
export const PRODUCTS_COMPACT_COLUMNS = '112px 136px minmax(200px,1.5fr) 128px 120px 136px 128px 128px 120px';

interface TableCategoryDropdownPortalProps {
  isOpen: boolean;
  targetRect: DOMRect | null;
  currentCategory: string;
  categoriesList: ProductCategory[];
  onSelect: (category: string) => void;
  onClose: () => void;
}

function TableCategoryDropdownPortal({
  isOpen,
  targetRect,
  currentCategory,
  categoriesList,
  onSelect,
  onClose,
}: TableCategoryDropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
      onClose();
    };

    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !targetRect || typeof window === 'undefined') return null;

  const width = Math.max(180, targetRect.width);
  const height = 280;
  const spaceBelow = window.innerHeight - targetRect.bottom;
  const isTop = spaceBelow < height && targetRect.top > spaceBelow;
  const top = isTop ? targetRect.top - height - 6 : targetRect.bottom + 6;
  let left = targetRect.left;
  if (left + width > window.innerWidth - 16) {
    left = window.innerWidth - width - 16;
  }
  if (left < 16) left = 16;

  return createPortal(
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, scale: 0.98, y: isTop ? 3 : -3 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: isTop ? 3 : -3 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'fixed',
        top: Math.max(12, top),
        left,
        width,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
      className="rounded-xl bg-neutral-950 border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden flex flex-col font-mono select-none text-xs"
    >
      <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-neutral-500 border-b border-white/5 font-semibold bg-white/[0.02]">
        ВЫБОР КАТЕГОРИИ
      </div>
      <div className="divide-y divide-white/[0.04] max-h-56 overflow-y-auto scrollbar-none p-1">
        {categoriesList.map((cat) => {
          const Icon = getCategoryLucideIcon(cat.label);
          const isSelected = currentCategory === cat.label;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                onSelect(cat.label);
                onClose();
              }}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer text-xs group ${
                isSelected
                  ? 'bg-white/10 text-white font-semibold'
                  : 'bg-transparent hover:bg-white/5 text-neutral-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`} />
                <span className="truncate">{cat.label}</span>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-white/80 shrink-0 ml-1.5" />}
            </button>
          );
        })}
      </div>
      <div className="px-3 py-1 bg-neutral-950 border-t border-white/5 text-[9px] font-mono text-neutral-500 uppercase tracking-wider flex items-center justify-between shrink-0">
        <span>{categoriesList.length} КАТЕГОРИЙ</span>
        <span className="text-neutral-600">3DLABS</span>
      </div>
    </motion.div>,
    document.body
  );
}

interface TableFilamentDropdownPortalProps {
  isOpen: boolean;
  targetRect: DOMRect | null;
  currentFilamentName: string;
  filaments: Filament[];
  onSelect: (filament: Filament) => void;
  onClose: () => void;
}

function TableFilamentDropdownPortal({
  isOpen,
  targetRect,
  currentFilamentName,
  filaments,
  onSelect,
  onClose,
}: TableFilamentDropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
      onClose();
    };

    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !targetRect || typeof window === 'undefined') return null;

  const width = Math.max(190, targetRect.width);
  const height = 280;
  const spaceBelow = window.innerHeight - targetRect.bottom;
  const isTop = spaceBelow < height && targetRect.top > spaceBelow;
  const top = isTop ? targetRect.top - height - 6 : targetRect.bottom + 6;
  let left = targetRect.left;
  if (left + width > window.innerWidth - 16) {
    left = window.innerWidth - width - 16;
  }
  if (left < 16) left = 16;

  return createPortal(
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, scale: 0.98, y: isTop ? 3 : -3 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: isTop ? 3 : -3 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'fixed',
        top: Math.max(12, top),
        left,
        width,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
      className="rounded-xl bg-neutral-950 border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden flex flex-col font-mono select-none text-xs"
    >
      <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-neutral-500 border-b border-white/5 font-semibold bg-white/[0.02]">
        ВЫБОР ПЛАСТИКА
      </div>
      <div className="divide-y divide-white/[0.04] max-h-56 overflow-y-auto scrollbar-none p-1">
        {filaments.map((f) => {
          const isSelected = currentFilamentName === f.name;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                onSelect(f);
                onClose();
              }}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer text-xs group ${
                isSelected
                  ? 'bg-white/10 text-white font-semibold'
                  : 'bg-transparent hover:bg-white/5 text-neutral-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                  style={{ backgroundColor: f.color || '#3b82f6' }}
                />
                <span className="truncate">{f.name}</span>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-white/80 shrink-0 ml-1.5" />}
            </button>
          );
        })}
      </div>
      <div className="px-3 py-1 bg-neutral-950 border-t border-white/5 text-[9px] font-mono text-neutral-500 uppercase tracking-wider flex items-center justify-between shrink-0">
        <span>{filaments.length} ТИПОВ МАТЕРИАЛА</span>
        <span className="text-neutral-600">3DLABS</span>
      </div>
    </motion.div>,
    document.body
  );
}

interface ProductsV2TableProps {
  rows: CatalogTableRow[];
  visibleRows: CatalogTableRow[];
  visibleCount: number;
  totalRowsCount: number;
  onLoadMore: () => void;
  onShowAll: () => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  searchQuery: string;
  isExpanded?: boolean;

  // Раскрытие коллекций и сборок
  expandedItemIds: Record<string, boolean>;
  onToggleExpand: (id: string) => void;

  // Инлайн переименование
  editingNameId: string | null;
  editingNameValue: string;
  setEditingNameValue: (val: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  isInlineNameShaking?: boolean;
  onStartRename: (itemOrCol: SavedCalculation | ProductCollection) => void;

  // Действия и инлайн-обновление
  onInlineUpdateProduct?: (productId: string, updates: Partial<SavedCalculation>) => void;
  onInlineUpdateCollection?: (collectionId: string, updates: Partial<ProductCollection>) => void;
  onSetStock: (item: SavedCalculation, newStock: number) => void;
  onOpenCategoryModal: (item: SavedCalculation) => void;
  onOpenQuickEditModal: (item: SavedCalculation) => void;
  onCreateOrder: (item: SavedCalculation) => void;
  onLoadIntoCalculator: (item: SavedCalculation) => void;
  onStageForAssembly: (item: SavedCalculation) => void;
  stagedAssemblyParts?: AssemblyPrintedPart[];
  onOpenMoveProduct: (item: SavedCalculation) => void;
  onOpenStlModal: (item: SavedCalculation) => void;
  onDelete: (id: string, name: string, type?: string) => void;
  onOpenEditCollection: (col: ProductCollection) => void;
  onOpenAddVariantModal: (col: ProductCollection) => void;
  onOpenDeleteCollection: (col: ProductCollection) => void;

  // Метаданные
  salesStatsMap: Map<string, SalesStatInfo>;
  currencySymbol?: string;
  categoriesList: ProductCategory[];
  filaments: Filament[];
  printers: Printer[];
  settings?: Settings | null;

  // Контекстное меню
  contextMenu: { x: number; y: number; row: CatalogTableRow } | null;
  setContextMenu: (menu: { x: number; y: number; row: CatalogTableRow } | null) => void;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;

  // Внешний контроль парения строки (Drawer)
  elevatedRow?: CatalogTableRow | null;
  setElevatedRow?: (row: CatalogTableRow | null) => void;

  // Множественный выбор строк (Multi-selection)
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  onClearSelection?: () => void;
  onBatchRecalculateSelected?: () => void;
  onBatchMoveSelected?: () => void;
  onBatchDeleteSelected?: () => void;
}

type EditableProductField = 'name' | 'final_price' | 'base_cost' | 'stock_quantity' | 'weight_g' | 'hours' | 'minutes';

export const ProductsV2Table = React.memo(function ProductsV2Table({
  rows,
  visibleRows,
  visibleCount,
  totalRowsCount,
  onLoadMore,
  onShowAll,
  sortField,
  sortOrder,
  onSort,
  searchQuery,
  isExpanded = false,
  expandedItemIds,
  onToggleExpand,
  editingNameId,
  editingNameValue,
  setEditingNameValue,
  onSaveRename,
  onCancelRename,
  isInlineNameShaking,
  onStartRename,
  onInlineUpdateProduct,
  onInlineUpdateCollection,
  onSetStock,
  onOpenCategoryModal,
  onOpenQuickEditModal,
  onCreateOrder,
  onLoadIntoCalculator,
  onStageForAssembly,
  stagedAssemblyParts = [],
  onOpenMoveProduct,
  onOpenStlModal,
  onDelete,
  onOpenEditCollection,
  onOpenAddVariantModal,
  onOpenDeleteCollection,
  salesStatsMap,
  currencySymbol = '₽',
  categoriesList,
  filaments,
  printers,
  settings,
  contextMenu,
  setContextMenu,
  contextMenuRef,
  elevatedRow: externalElevatedRow,
  setElevatedRow: externalSetElevatedRow,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onBatchRecalculateSelected,
  onBatchMoveSelected,
  onBatchDeleteSelected,
}: ProductsV2TableProps) {
  // Локальное состояние для строки в фокусе (парение), если не передано внешнее
  const [internalElevatedRow, setInternalElevatedRow] = useState<CatalogTableRow | null>(null);
  const elevatedRow = externalElevatedRow !== undefined ? externalElevatedRow : internalElevatedRow;
  const setElevatedRow = externalSetElevatedRow || setInternalElevatedRow;
  const lastElevatedCloseTimeRef = useRef<number>(0);

  // Состояние скопированного ID для тултипа
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  // Снятие выбора по нажатию Esc
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClearSelection?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds.length, onClearSelection]);

  // Инлайн редактирование ячеек таблицы
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: EditableProductField } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEditing = (row: CatalogTableRow, field: EditableProductField, initialValue: string | number) => {
    setEditingCell({ rowId: row.id, field });
    setEditValue(String(initialValue ?? ''));
  };

  const commitEdit = (row: CatalogTableRow, field: EditableProductField, value: string) => {
    setEditingCell(null);
    const trimmed = value.trim();

    if (field === 'name') {
      if (trimmed && trimmed !== row.name) {
        if (row.rowKind === 'product') {
          onInlineUpdateProduct?.(row.item.id, { name: trimmed });
        } else {
          onInlineUpdateCollection?.(row.collection.id, { name: trimmed });
        }
      }
      return;
    }

    if (row.rowKind !== 'product') return;
    const num = parseFloat(trimmed.replace(/\s+/g, '').replace(',', '.'));

    switch (field) {
      case 'final_price':
        if (!isNaN(num) && num >= 0 && num !== row.final_price) {
          onInlineUpdateProduct?.(row.item.id, { final_price: num });
        }
        break;
      case 'base_cost':
        if (!isNaN(num) && num >= 0 && num !== row.base_cost) {
          onInlineUpdateProduct?.(row.item.id, { base_cost: num });
        }
        break;
      case 'stock_quantity':
        if (!isNaN(num) && num >= 0 && num !== row.stock_quantity) {
          onSetStock(row.item, Math.round(num));
        }
        break;
      case 'weight_g':
        if (!isNaN(num) && num >= 0 && num !== row.weight_g) {
          onInlineUpdateProduct?.(row.item.id, { weight_g: num });
        }
        break;
      case 'hours':
        if (!isNaN(num) && num >= 0 && num !== row.hours) {
          onInlineUpdateProduct?.(row.item.id, { hours: Math.round(num) });
        }
        break;
      case 'minutes':
        if (!isNaN(num) && num >= 0 && num !== row.minutes) {
          onInlineUpdateProduct?.(row.item.id, { minutes: Math.round(num) });
        }
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: CatalogTableRow, field: EditableProductField) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(row, field, editValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
    }
  };

  // Быстрое изменение остатка кнопками - и +
  const handleStockDelta = (e: React.MouseEvent, row: CatalogTableRow, delta: number) => {
    e.stopPropagation();
    if (row.rowKind !== 'product') return;
    const current = row.stock_quantity || 0;
    const next = Math.max(0, current + delta);
    onSetStock(row.item, next);
  };

  // Sentinel бесконечной подгрузки
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    if (visibleCount >= totalRowsCount) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '350px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, totalRowsCount, onLoadMore]);

  // Портальные селекторы категорий и пластика
  const [categoryPicker, setCategoryPicker] = useState<{
    row: CatalogTableRow;
    targetRect: DOMRect;
  } | null>(null);

  const [filamentPicker, setFilamentPicker] = useState<{
    row: CatalogTableRow;
    targetRect: DOMRect;
  } | null>(null);

  // Контекстное меню по правому клику
  const handleContextMenu = (e: React.MouseEvent, row: CatalogTableRow) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      row,
    });
  };

  const menuCoords = useMemo(() => {
    if (!contextMenu || typeof window === 'undefined') return null;
    const menuWidth = 220;
    const menuHeight = 240;
    let x = contextMenu.x;
    let y = contextMenu.y;

    if (x + menuWidth > window.innerWidth - 12) {
      x = Math.max(12, window.innerWidth - menuWidth - 12);
    }
    if (y + menuHeight > window.innerHeight - 12) {
      y = Math.max(12, window.innerHeight - menuHeight - 12);
    }

    return { x, y };
  }, [contextMenu]);

  // Индикатор сортировки колонок
  const renderSortIndicator = (field: SortField) => {
    const isActive = sortField === field;
    return (
      <span className="inline-flex items-center justify-center w-3 h-3 shrink-0 ml-1">
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="w-3 h-3 text-white" />
          ) : (
            <ChevronDown className="w-3 h-3 text-white" />
          )
        ) : (
          <ChevronDown className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 transition-opacity" />
        )}
      </span>
    );
  };

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden flex flex-col font-sans select-none bg-neutral-950/40">

      {/* 1. МОБИЛЬНАЯ ВЕРСИЯ (КАРТОЧКИ < lg) */}
      <div className="lg:hidden p-3 space-y-2">
        {visibleRows.map((row) => {
          const isCol = row.rowKind === 'collection';
          const isAsm = row.rowKind === 'product' && row.item.type === 'assembly';
          const isElevated = elevatedRow?.id === row.id;
          const isBlurred = Boolean(elevatedRow) && !isElevated;
          const article = formatProductArticle(row);
          const salesStat = salesStatsMap.get(row.id);
          const stock = row.stock_quantity || 0;
          const CatIcon = getCategoryLucideIcon(row.category || 'Разное');

          return (
            <motion.article
              layout
              key={row.id}
              animate={{
                y: isElevated ? -10 : 0,
                scale: 1,
                filter: isBlurred ? 'blur(4px) opacity(0.35)' : 'blur(0px) opacity(1)',
              }}
              transition={{
                y: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                filter: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
              }}
              tabIndex={0}
              role="button"
              onClick={() => setElevatedRow(isElevated ? null : row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setElevatedRow(isElevated ? null : row);
                }
              }}
              className={`rounded-xl border p-3 focus:outline-none cursor-pointer transition-all ${
                isElevated
                  ? '!z-50 !border-white/40 !bg-neutral-900/98 !shadow-[0_25px_60px_-10px_rgba(0,0,0,0.95)] ring-1 ring-white/20'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] text-neutral-500">{article}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                      isCol
                        ? 'bg-purple-950/60 text-purple-300 border-purple-800/40'
                        : isAsm
                        ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40'
                        : 'bg-white/5 text-neutral-400 border-white/10'
                    }`}>
                      {isCol ? 'КОЛЛЕКЦИЯ' : isAsm ? 'СБОРКА' : 'ШТУЧНЫЙ'}
                    </span>
                    {salesStat?.isBestseller && (
                      <Tooltip content={`Хит продаж: продано ${salesStat.soldQty} шт. (${salesStat.salesSharePercent}% от всех продаж)`}>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 font-bold select-none cursor-default">
                          <Flame className="w-2.5 h-2.5 shrink-0" />
                          <span>ХИТ</span>
                        </span>
                      </Tooltip>
                    )}
                  </div>

                  <h3 className="mt-1 text-sm font-semibold text-white truncate max-w-[240px]">
                    {row.name}
                  </h3>

                  <div className="mt-1.5 flex items-center gap-2 text-xs font-mono text-neutral-400 flex-wrap">
                    <span className="flex items-center gap-1 text-neutral-300">
                      <CatIcon className="w-3 h-3 text-neutral-400 shrink-0" />
                      <span>{row.category || 'Разное'}</span>
                    </span>
                    <span>•</span>
                    <span className="text-white font-semibold tabular-nums">
                      {formatCurrency(row.final_price || 0, currencySymbol)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    stock > 2
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                      : stock > 0
                      ? 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                      : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                  }`}>
                    {stock > 0 ? `${stock} шт` : 'Нет'}
                  </span>
                  <div className="mt-1 text-[11px] font-mono text-neutral-500">
                    {row.weight_g ? `${row.weight_g} г` : '—'}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <span>Себест: {formatCurrency(row.base_cost || 0, currencySymbol)}</span>
                  <span>•</span>
                  <span className="text-emerald-400">
                    +{(row.final_price || 0) - (row.base_cost || 0)} {currencySymbol}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {row.rowKind === 'product' && (
                    <button
                      type="button"
                      aria-label="В калькулятор"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadIntoCalculator(row.item);
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-neutral-300 hover:text-white"
                    >
                      <CalculatorIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {row.rowKind === 'product' ? (
                    <button
                      type="button"
                      aria-label="Создать заказ"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateOrder(row.item);
                      }}
                      className="rounded-lg border border-white/10 bg-white p-1.5 text-neutral-950 font-bold"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Свойства коллекции"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditCollection(row.collection);
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-neutral-300 hover:text-white"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}

        {visibleRows.length === 0 && (
          <div className="py-10 text-center font-mono text-xs text-neutral-500">Товары не найдены</div>
        )}

        {visibleCount < totalRowsCount && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onShowAll}
              className="rounded-lg border border-white/10 bg-white/5 py-2 px-4 text-xs font-mono text-neutral-300 hover:text-white transition-colors"
            >
              Показать все ({totalRowsCount})
            </button>
          </div>
        )}
      </div>

      {/* 2. ОСНОВНОЕ ТЕЛО ТАБЛИЦЫ (ДЕСКТОП >= lg) */}
      <div
        onClick={() => {
          if (elevatedRow) setElevatedRow(null);
        }}
        className={`hidden lg:block overflow-x-auto w-full custom-scrollbar p-1.5 sm:p-2.5 relative ${
          elevatedRow ? 'z-40 cursor-pointer' : 'z-10'
        }`}
      >
        {isExpanded ? (
          /* ========================================================================= */
          /* РАЗВЁРНУТЫЙ РЕЖИМ (13 РАЗДЕЛЬНЫХ КОЛОНОК С ПОЛНОЙ ДЕТАЛИЗАЦИЕЙ)            */
          /* ========================================================================= */
          <table className="w-full text-left text-xs border-collapse min-w-[1680px] block">
            <thead
              className={`block w-full ${elevatedRow ? 'pointer-events-none select-none' : ''}`}
              style={{
                filter: elevatedRow ? 'blur(4px) opacity(0.35)' : 'blur(0px) opacity(1)',
                transition: 'filter 0.4s ease, opacity 0.4s ease'
              }}
            >
              <tr
                className="bg-neutral-900/95 border-b border-white/10 text-neutral-400 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider sticky top-0 z-20 grid items-center select-none"
                style={{ gridTemplateColumns: PRODUCTS_EXPANDED_COLUMNS }}
              >
                {/* 1. АРТИКУЛ */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedIds.length === visibleRows.length) {
                            onClearSelection?.();
                          } else {
                            onSelectAll?.(visibleRows.map((r) => r.id));
                          }
                        }}
                        className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                          selectedIds.length === visibleRows.length
                            ? 'bg-white border-white text-neutral-950 font-bold'
                            : 'bg-white/20 border-white/40 text-white font-bold'
                        }`}
                        title={selectedIds.length === visibleRows.length ? 'Снять выбор со всех' : 'Выбрать все'}
                      >
                        {selectedIds.length === visibleRows.length ? (
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        ) : (
                          <Minus className="w-2.5 h-2.5 stroke-[3]" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSort('id')}
                      className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
                    >
                      <span>АРТИКУЛ</span>
                      {renderSortIndicator('id')}
                    </button>
                  </div>
                </th>

                {/* 2. ТИП */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 text-center min-w-0">
                  <span>ТИП</span>
                </th>

                {/* 3. КАТЕГОРИЯ */}
                <th
                  onClick={() => onSort('category')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group min-w-0"
                >
                  <div className="flex items-center gap-1">
                    <span>КАТЕГОРИЯ</span>
                    {renderSortIndicator('category')}
                  </div>
                </th>

                {/* 4. НАИМЕНОВАНИЕ / ДЕТАЛИ */}
                <th
                  onClick={() => onSort('name')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group min-w-0"
                >
                  <div className="flex items-center gap-1">
                    <span>НАИМЕНОВАНИЕ / ДЕТАЛИ</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>

                {/* 5. ПЛАСТИК */}
                <th
                  onClick={() => onSort('filament')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group min-w-0"
                >
                  <div className="flex items-center gap-1">
                    <span>ПЛАСТИК</span>
                    {renderSortIndicator('filament')}
                  </div>
                </th>

                {/* 6. ВЕС / ВРЕМЯ */}
                <th
                  onClick={() => onSort('params')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-center min-w-0"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ВЕС / ВРЕМЯ</span>
                    {renderSortIndicator('params')}
                  </div>
                </th>

                {/* 7. ОСТАТОК СКЛАДА */}
                <th
                  onClick={() => onSort('stock')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-center min-w-0"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ОСТАТОК СКЛАДА</span>
                    {renderSortIndicator('stock')}
                  </div>
                </th>

                {/* 8. СЕБЕСТОИМОСТЬ */}
                <th
                  onClick={() => onSort('cost')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right min-w-0"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>СЕБЕСТОИМОСТЬ</span>
                    {renderSortIndicator('cost')}
                  </div>
                </th>

                {/* 9. ЦЕНА ПРОДАЖИ */}
                <th
                  onClick={() => onSort('price')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right min-w-0"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ЦЕНА ПРОДАЖИ</span>
                    {renderSortIndicator('price')}
                  </div>
                </th>

                {/* 10. ПРИБЫЛЬ / МАРЖА */}
                <th
                  onClick={() => onSort('profit')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right min-w-0"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ПРИБЫЛЬ / МАРЖА</span>
                    {renderSortIndicator('profit')}
                  </div>
                </th>

                {/* 11. ПРОДАЖИ (ЗАКАЗЫ) */}
                <th
                  onClick={() => onSort('sales')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right min-w-0"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ПРОДАЖИ</span>
                    {renderSortIndicator('sales')}
                  </div>
                </th>

                {/* 12. 3D (STL) */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 text-center min-w-0">
                  <span>3D (STL)</span>
                </th>

                {/* 13. ДЕЙСТВИЯ */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 text-right min-w-0">
                  <span>ДЕЙСТВИЯ</span>
                </th>
              </tr>
            </thead>

            <tbody className="block w-full divide-y divide-white/5 font-mono text-xs">
              {visibleRows.length === 0 ? (
                <tr className="block w-full">
                  <td colSpan={13} className="block w-full py-14 text-center text-neutral-500 font-mono">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Package className="w-7 h-7 mx-auto text-neutral-600 opacity-50" />
                      <p className="font-bold text-neutral-300 text-sm">Товаров не найдено</p>
                      <p className="text-xs text-neutral-500">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос или сбросить фильтры' : 'Добавьте новый товар с помощью кнопки в боковом меню'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const isCol = row.rowKind === 'collection';
                  const isAsm = row.rowKind === 'product' && row.item.type === 'assembly';
                  const isElevated = elevatedRow?.id === row.id;
                  const isBlurred = Boolean(elevatedRow) && !isElevated;
                  const isExpandedRow = Boolean(expandedItemIds[row.id]);
                  const isSelected = selectedIds.includes(row.id);
                  const article = formatProductArticle(row);
                  const salesStat = salesStatsMap.get(row.id);
                  const stock = row.stock_quantity || 0;
                  const finalPrice = row.final_price || 0;
                  const baseCost = row.base_cost || 0;
                  const profit = Math.round((finalPrice - baseCost) * 100) / 100;
                  const marginPercent = finalPrice > 0 ? (profit / finalPrice) * 100 : 0;
                  const CatIcon = getCategoryLucideIcon(row.category || 'Разное');
                  const hasStl = isCol ? (row.stlCount || 0) > 0 : Boolean(row.item?.stl_url || row.item?.stl_file_data);
                  const isContextMenuActive = contextMenu?.row.id === row.id;

                  return (
                    <React.Fragment key={row.id}>
                      <motion.tr
                        animate={{
                          y: isElevated ? -10 : 0,
                          scale: 1,
                          filter: isBlurred ? 'blur(5px) opacity(0.35)' : 'blur(0px) opacity(1)',
                          backgroundColor: isElevated ? 'rgba(15, 15, 15, 0.98)' : 'rgba(0, 0, 0, 0)',
                          borderColor: isElevated ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                          borderRadius: isElevated ? 14 : 0,
                          boxShadow: isElevated ? '0 25px 60px -10px rgba(0, 0, 0, 0.95)' : 'none',
                        }}
                        whileHover={!isElevated && !isBlurred ? { backgroundColor: 'rgba(255, 255, 255, 0.04)' } : undefined}
                        transition={{
                          y: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                          filter: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                          backgroundColor: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                          borderColor: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                          borderRadius: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                          boxShadow: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                        }}
                        onContextMenu={(e) => !isBlurred && handleContextMenu(e, row)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isElevated) {
                            lastElevatedCloseTimeRef.current = Date.now();
                            setElevatedRow(null);
                          } else {
                            if (Date.now() - lastElevatedCloseTimeRef.current < 450) return;
                            setElevatedRow(row);
                          }
                        }}
                        className={`transition-colors group relative border-b grid w-full items-center ${
                          isElevated
                            ? '!z-50 ring-1 ring-white/20 cursor-default'
                            : isBlurred
                            ? 'pointer-events-none select-none border-white/5'
                            : isSelected
                            ? '!bg-white/[0.08] !border-white/20 cursor-pointer'
                            : isContextMenuActive
                            ? '!bg-neutral-800/90 text-white border-white/5 cursor-pointer'
                            : 'border-white/5 cursor-pointer'
                        }`}
                        style={{ gridTemplateColumns: PRODUCTS_EXPANDED_COLUMNS }}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-1 bottom-1 w-1 bg-white/70 rounded-r z-10" />
                        )}

                        {/* 1. АРТИКУЛ */}
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold text-neutral-300 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {selectedIds.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleSelect?.(row.id);
                                }}
                                className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                                  isSelected
                                    ? 'bg-white border-white text-neutral-950 font-bold'
                                    : 'border-white/20 hover:border-white/50 bg-neutral-900/60'
                                }`}
                                title={isSelected ? 'Снять выбор' : 'Выбрать'}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </button>
                            )}

                            <div className="flex flex-col gap-1 leading-tight min-w-0">
                              <Tooltip content={`ID: ${row.id} (Клик для копирования)`}>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyId(e, row.id)}
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono w-fit font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                                    isCol
                                      ? 'bg-purple-950/50 text-purple-300 border-purple-800/40 hover:bg-purple-900/60'
                                      : isAsm
                                      ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800/40 hover:bg-cyan-900/60'
                                      : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  <span>{article}</span>
                                  {copiedId === row.id ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 opacity-30 hover:opacity-100" />
                                  )}
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                        </td>

                        {/* 2. ТИП */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-center min-w-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            isCol
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              : isAsm
                              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                              : 'bg-white/5 text-neutral-300 border-white/10'
                          }`}>
                            {isCol ? 'Коллекция' : isAsm ? 'Сборка' : 'Штучный'}
                          </span>
                        </td>

                        {/* 3. КАТЕГОРИЯ (ПОРТАЛЬНЫЙ ВЫПАДАЮЩИЙ СПИСОК) */}
                        <td className="py-2.5 px-3 whitespace-nowrap min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setCategoryPicker({ row, targetRect: rect });
                              setFilamentPicker(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-neutral-900/90 text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
                            title="Клик для быстрой смены категории"
                          >
                            <CatIcon className="w-3 h-3 text-neutral-400 group-hover:text-neutral-300 shrink-0" />
                            <span className="truncate max-w-[100px]">{row.category || 'Разное'}</span>
                          </button>
                        </td>

                        {/* 4. НАИМЕНОВАНИЕ / ДЕТАЛИ (ИНЛАЙН-РЕДАКТИРОВАНИЕ ПО КЛИКУ) */}
                        <td className="py-2.5 px-3 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 font-sans group/name">
                            {(isCol || isAsm) && (
                              <Tooltip content={isExpandedRow ? 'Свернуть состав' : 'Раскрыть состав'}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleExpand(row.id);
                                  }}
                                  className={`p-1 rounded-md transition-all shrink-0 cursor-pointer ${
                                    isExpandedRow
                                      ? isCol ? 'bg-purple-500 text-white' : 'bg-cyan-500 text-neutral-950 font-bold'
                                      : isCol
                                      ? 'bg-purple-950/80 text-purple-300 border border-purple-800/40 hover:bg-purple-900/60'
                                      : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 hover:bg-cyan-900/60'
                                  }`}
                                >
                                  <motion.div animate={{ rotate: isExpandedRow ? 90 : 0 }}>
                                    <ChevronRight size={12} />
                                  </motion.div>
                                </button>
                              </Tooltip>
                            )}

                            <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                              {editingCell?.rowId === row.id && editingCell?.field === 'name' ? (
                                <input
                                  ref={inputRef as React.RefObject<HTMLInputElement>}
                                  type="text"
                                  value={editValue}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => commitEdit(row, 'name', editValue)}
                                  onKeyDown={(e) => handleKeyDown(e, row, 'name')}
                                  className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-white font-semibold text-xs min-w-[120px] max-w-full flex-1 p-0 m-0 leading-tight"
                                  placeholder="Название товара"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(row, 'name', row.name);
                                  }}
                                  className="font-semibold text-white hover:text-neutral-300 transition-colors block truncate cursor-text"
                                  title={`${row.name} (Клик для редактирования названия)`}
                                >
                                  {row.name}
                                </span>
                              )}

                              {row.rowKind === 'product' && row.parentCollectionName && (
                                <span className="text-[10px] font-mono text-purple-400 block truncate">
                                  Коллекция: {row.parentCollectionName}
                                </span>
                              )}

                              {salesStat?.isBestseller && (
                                <Tooltip content={`Хит продаж: продано ${salesStat.soldQty} шт. (${salesStat.salesSharePercent}% от всех продаж)`}>
                                  <span className="text-[8.5px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1 py-0.2 rounded w-fit flex items-center gap-0.5 font-bold select-none shrink-0 cursor-default">
                                    <Flame className="w-2.5 h-2.5 shrink-0" />
                                    <span>ХИТ</span>
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 5. ПЛАСТИК / МАТЕРИАЛ */}
                        <td className="py-2.5 px-3 whitespace-nowrap min-w-0">
                          {row.rowKind === 'collection' ? (
                            <div className="flex items-center gap-1 overflow-hidden">
                              {(row.materialsColors || []).slice(0, 3).map((col, idx) => (
                                <span
                                  key={idx}
                                  className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                                  style={{ backgroundColor: col }}
                                />
                              ))}
                              <span className="text-[11px] text-neutral-400 font-mono">
                                {(row.materialsList || []).join(', ') || 'Различный'}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setFilamentPicker({ row, targetRect: rect });
                                setCategoryPicker(null);
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono bg-white/[0.03] text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                              title="Клик для быстрой смены пластика"
                            >
                              <span
                                className="w-2 h-2 rounded-full border border-white/20 shrink-0"
                                style={{ backgroundColor: row.item.filament_color || '#3b82f6' }}
                              />
                              <span className="truncate max-w-[85px]">{row.item.filament_name || 'PLA'}</span>
                            </button>
                          )}
                        </td>

                        {/* 6. ВЕС / ВРЕМЯ (ПО ЦЕНТРУ) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-center font-mono text-xs min-w-0">
                          <div className="flex flex-col items-center gap-0.5 leading-tight">
                            <span className="text-neutral-200 tabular-nums">
                              {row.weight_g ? `${row.weight_g} г` : '—'}
                            </span>
                            {(row.hours || row.minutes) ? (
                              <span className="text-[10px] text-neutral-500 tabular-nums flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5 inline" />
                                {row.hours ? `${row.hours}ч ` : ''}{row.minutes ? `${row.minutes}м` : ''}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 7. ОСТАТОК СКЛАДА С БЫСТРЫМИ КНОПКАМИ +/- */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-center min-w-0">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {row.rowKind === 'product' && (
                              <button
                                type="button"
                                onClick={(e) => handleStockDelta(e, row, -1)}
                                className="w-5 h-5 rounded flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-95"
                                title="Уменьшить остаток на 1"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                            )}

                            <span
                              onClick={(e) => {
                                if (row.rowKind === 'product') {
                                  e.stopPropagation();
                                  startEditing(row, 'stock_quantity', stock);
                                }
                              }}
                              className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border tabular-nums transition-colors cursor-text ${
                                stock > 2
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                  : stock > 0
                                  ? 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                                  : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                              }`}
                              title="Клик для ввода точного числа"
                            >
                              {editingCell?.rowId === row.id && editingCell?.field === 'stock_quantity' ? (
                                <input
                                  ref={inputRef as React.RefObject<HTMLInputElement>}
                                  type="text"
                                  value={editValue}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => commitEdit(row, 'stock_quantity', editValue)}
                                  onKeyDown={(e) => handleKeyDown(e, row, 'stock_quantity')}
                                  className="w-8 bg-transparent text-center border-none outline-none focus:outline-none focus:ring-0 text-white font-mono p-0 m-0 text-xs"
                                  autoFocus
                                />
                              ) : (
                                `${stock} шт`
                              )}
                            </span>

                            {row.rowKind === 'product' && (
                              <button
                                type="button"
                                onClick={(e) => handleStockDelta(e, row, 1)}
                                className="w-5 h-5 rounded flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-95"
                                title="Увеличить остаток на 1"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 8. СЕБЕСТОИМОСТЬ (СПРАВА) */}
                        <td
                          onClick={(e) => {
                            if (row.rowKind === 'product') {
                              e.stopPropagation();
                              startEditing(row, 'base_cost', baseCost);
                            }
                          }}
                          className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0 cursor-text"
                        >
                          {editingCell?.rowId === row.id && editingCell?.field === 'base_cost' ? (
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type="text"
                              value={editValue}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(row, 'base_cost', editValue)}
                              onKeyDown={(e) => handleKeyDown(e, row, 'base_cost')}
                              className="w-20 bg-transparent text-right border-none outline-none focus:outline-none focus:ring-0 text-white font-mono p-0 m-0 text-xs font-bold"
                              autoFocus
                            />
                          ) : (
                            <AnimatedPriceNumber
                              value={baseCost}
                              currencySymbol={currencySymbol}
                              className="text-neutral-400 hover:text-white transition-colors"
                            />
                          )}
                        </td>

                        {/* 9. ЦЕНА ПРОДАЖИ (СПРАВА) */}
                        <td
                          onClick={(e) => {
                            if (row.rowKind === 'product') {
                              e.stopPropagation();
                              startEditing(row, 'final_price', finalPrice);
                            }
                          }}
                          className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0 cursor-text"
                        >
                          {editingCell?.rowId === row.id && editingCell?.field === 'final_price' ? (
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type="text"
                              value={editValue}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(row, 'final_price', editValue)}
                              onKeyDown={(e) => handleKeyDown(e, row, 'final_price')}
                              className="w-20 bg-transparent text-right border-none outline-none focus:outline-none focus:ring-0 text-white font-mono p-0 m-0 text-xs font-bold"
                              autoFocus
                            />
                          ) : (
                            <AnimatedPriceNumber
                              value={finalPrice}
                              currencySymbol={currencySymbol}
                              className="text-white font-bold hover:text-neutral-300 transition-colors"
                            />
                          )}
                        </td>

                        {/* 10. ПРИБЫЛЬ / МАРЖА (СПРАВА) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0">
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <AnimatedPriceNumber
                              value={profit}
                              currencySymbol={currencySymbol}
                              showPositiveSign={profit > 0}
                              className={`font-bold tabular-nums ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                            />
                            {finalPrice > 0 && (
                              <div className={`text-[10px] tabular-nums flex items-center justify-end gap-0.5 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                <AnimatedPriceNumber
                                  value={marginPercent}
                                  currencySymbol="%"
                                  decimals={0}
                                  className={`font-medium text-[10px] ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                                  currencyClassName={`font-medium text-[10px] select-none ml-0.5 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                                />
                                <span className={profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>маржа</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 11. ПРОДАЖИ (ЗАКАЗЫ) (СПРАВА) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0">
                          {salesStat && salesStat.soldQty > 0 ? (
                            <div className="flex flex-col items-end gap-0.5 leading-tight">
                              <span className="text-amber-400 font-bold tabular-nums flex items-baseline gap-1">
                                <span>{salesStat.soldQty} шт</span>
                                {salesStat.salesSharePercent > 0 && (
                                  <span className="text-[10px] text-neutral-400 font-normal">
                                    ({salesStat.salesSharePercent}%)
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-neutral-500 tabular-nums">
                                {formatCurrency(salesStat.totalRevenue, currencySymbol)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-600 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* 12. 3D МОДЕЛЬ (STL) (ПО ЦЕНТРУ) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-center min-w-0">
                          {hasStl ? (
                            <Tooltip content="Открыть 3D-модель (STL)">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (row.rowKind === 'product') {
                                    onOpenStlModal(row.item);
                                  }
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 inline-flex items-center gap-1 cursor-pointer hover:bg-cyan-900/80 transition-colors"
                              >
                                <FileCode className="w-3 h-3" />
                                <span>{isCol ? `${row.stlCount} STL` : 'STL'}</span>
                              </button>
                            </Tooltip>
                          ) : (
                            <span className="text-neutral-600 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* 13. ДЕЙСТВИЯ (СПРАВА) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono min-w-0">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {row.rowKind === 'collection' ? (
                              <>
                                <Tooltip content="Добавить вариант">
                                  <button
                                    type="button"
                                    onClick={() => onOpenAddVariantModal(row.collection)}
                                    className="px-2 py-1 rounded-md font-mono text-[11px] font-bold bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800/40 flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Вариант</span>
                                  </button>
                                </Tooltip>
                                <Tooltip content="Свойства коллекции">
                                  <button
                                    type="button"
                                    onClick={() => onOpenEditCollection(row.collection)}
                                    className="p-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </Tooltip>
                              </>
                            ) : (
                              <>
                                <Tooltip content="Создать заказ в CRM">
                                  <button
                                    type="button"
                                    onClick={() => onCreateOrder(row.item)}
                                    className="px-2 py-1 rounded-md font-mono text-[11px] font-bold bg-white text-neutral-950 hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                  >
                                    <ShoppingCart className="w-3 h-3" />
                                    <span>Заказ</span>
                                  </button>
                                </Tooltip>

                                <Tooltip content="В Калькулятор">
                                  <button
                                    type="button"
                                    onClick={() => onLoadIntoCalculator(row.item)}
                                    className="p-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <CalculatorIcon className="w-3 h-3" />
                                  </button>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Нижняя выезжающая панель: ProductRowDrawer */}
                        <AnimatePresence>
                          {isElevated && (
                            <td
                              className="p-0 border-0 col-span-full w-full"
                              style={{ gridColumn: '1 / -1' }}
                            >
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  height: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                                  opacity: { duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] },
                                }}
                                className="w-full overflow-hidden"
                              >
                                <ProductRowDrawer
                                  row={row}
                                  currencySymbol={currencySymbol}
                                  onInlineUpdateProduct={onInlineUpdateProduct}
                                  onInlineUpdateCollection={onInlineUpdateCollection}
                                  onSetStock={onSetStock}
                                  onOpenQuickEditModal={onOpenQuickEditModal}
                                  onOpenStlModal={onOpenStlModal}
                                  onLoadIntoCalculator={onLoadIntoCalculator}
                                  onCreateOrder={onCreateOrder}
                                  onOpenEditCollection={onOpenEditCollection}
                                  onOpenAddVariantModal={onOpenAddVariantModal}
                                  onClose={() => {
                                    lastElevatedCloseTimeRef.current = Date.now();
                                    setElevatedRow(null);
                                  }}
                                  categoriesList={categoriesList}
                                  filaments={filaments}
                                  salesStat={salesStat}
                                />
                              </motion.div>
                            </td>
                          )}
                        </AnimatePresence>
                      </motion.tr>

                      {/* Вложенные строки при раскрытии коллекции или сборки */}
                      {isExpandedRow && (
                        <tr className="block w-full">
                          <td colSpan={13} className="block w-full p-0 bg-neutral-950/90 border-b border-white/10">
                            {isCol ? (
                              /* Варианты коллекции */
                              <div className="border-t border-purple-500/20 px-6 py-3 space-y-2 font-mono text-xs">
                                <div className="flex items-center justify-between text-purple-300 pb-1 border-b border-white/5">
                                  <span className="flex items-center gap-1.5 font-bold">
                                    <FolderPlus size={13} className="text-purple-400" />
                                    <span>Варианты коллекции «{row.name}» ({row.childItems.length})</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onOpenAddVariantModal(row.collection)}
                                    className="text-[11px] font-bold text-purple-300 hover:text-purple-200 underline cursor-pointer"
                                  >
                                    + Добавить вариант
                                  </button>
                                </div>
                                <div className="divide-y divide-white/5">
                                  {row.childItems.map((child) => (
                                    <div key={child.id} className="py-2 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-purple-400 font-bold select-none">└─</span>
                                        <span className="font-semibold text-white truncate max-w-xs">{child.name}</span>
                                        <span className="text-[10px] text-neutral-500">#{child.id.slice(0, 6)}</span>
                                      </div>
                                      <div className="flex items-center gap-4 text-right shrink-0">
                                        <CockpitStatusPill label={`${child.stock_quantity || 0} шт`} tone={(child.stock_quantity || 0) > 0 ? 'emerald' : 'neutral'} dot={(child.stock_quantity || 0) > 0} />
                                        <span className="font-bold text-white font-mono text-xs">{formatCurrency(child.final_price || 0, currencySymbol)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : isAsm ? (
                              /* Состав сборки */
                              <div className="border-t border-cyan-500/20 px-6 py-3 space-y-3 font-mono text-xs">
                                <div className="flex items-center justify-between pb-1 border-b border-white/5 text-cyan-300">
                                  <span className="flex items-center gap-1.5 font-bold">
                                    <Layers size={13} className="text-cyan-400" />
                                    <span>Состав сборки «{row.name}» ({(row.item.assembly_parts || []).length} дет.)</span>
                                  </span>
                                </div>
                                <div className="divide-y divide-white/5">
                                  {(row.item.assembly_parts || []).map((p, idx) => (
                                    <div key={idx} className="py-2 flex items-center justify-between gap-3 text-neutral-300">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-cyan-400 font-bold select-none">└─</span>
                                        <span className="font-semibold text-white truncate">{p.name}</span>
                                      </div>
                                      <div className="flex items-center gap-4 text-right shrink-0 font-mono">
                                        <span className="text-neutral-400">×{p.quantity} шт</span>
                                        <span className="font-bold text-white">{formatCurrency((p.final_price || p.base_cost || 0) * (p.quantity || 1), currencySymbol)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {/* Sentinel для подгрузки */}
              {visibleCount < totalRowsCount && (
                <tr ref={sentinelRef} className="block w-full">
                  <td colSpan={13} className="block w-full py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-neutral-400 font-mono animate-pulse">
                        Загрузка товаров...
                      </span>
                      <button
                        type="button"
                        onClick={onShowAll}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 rounded-lg text-xs font-mono transition-colors cursor-pointer"
                      >
                        Показать все ({totalRowsCount})
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* ========================================================================= */
          /* КОМПАКТНЫЙ РЕЖИМ (9 СДВОЕННЫХ КОЛОНОК — ТОЧНЫЙ ЭТАЛОН РЕЕСТРА ORDERS)     */
          /* ========================================================================= */
          <table className="w-full text-left text-xs border-collapse min-w-[1050px] block">
            <thead
              className={`block w-full ${elevatedRow ? 'pointer-events-none select-none' : ''}`}
              style={{
                filter: elevatedRow ? 'blur(4px) opacity(0.35)' : 'blur(0px) opacity(1)',
                transition: 'filter 0.4s ease, opacity 0.4s ease'
              }}
            >
              <tr
                className="bg-neutral-900/90 border-b border-white/10 text-neutral-400 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider grid items-center select-none"
                style={{ gridTemplateColumns: PRODUCTS_COMPACT_COLUMNS }}
              >
                {/* 1. АРТИКУЛ / ТИП */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedIds.length === visibleRows.length) {
                            onClearSelection?.();
                          } else {
                            onSelectAll?.(visibleRows.map((r) => r.id));
                          }
                        }}
                        className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                          selectedIds.length === visibleRows.length
                            ? 'bg-white border-white text-neutral-950 font-bold'
                            : 'bg-white/20 border-white/40 text-white font-bold'
                        }`}
                        title={selectedIds.length === visibleRows.length ? 'Снять выбор со всех' : 'Выбрать все'}
                      >
                        {selectedIds.length === visibleRows.length ? (
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        ) : (
                          <Minus className="w-2.5 h-2.5 stroke-[3]" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSort('id')}
                      className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
                    >
                      <span>АРТИКУЛ / ТИП</span>
                      {renderSortIndicator('id')}
                    </button>
                  </div>
                </th>

                {/* 2. КАТЕГОРИЯ */}
                <th
                  onClick={() => onSort('category')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group min-w-0"
                >
                  <div className="flex items-center gap-1">
                    <span>КАТЕГОРИЯ</span>
                    {renderSortIndicator('category')}
                  </div>
                </th>

                {/* 3. ИЗДЕЛИЕ / ДЕТАЛИ */}
                <th
                  onClick={() => onSort('name')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group min-w-0"
                >
                  <div className="flex items-center gap-1">
                    <span>ИЗДЕЛИЕ / ДЕТАЛИ</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>

                {/* 4. ПЛАСТИК */}
                <th
                  onClick={() => onSort('filament')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group min-w-0"
                >
                  <div className="flex items-center gap-1">
                    <span>ПЛАСТИК</span>
                    {renderSortIndicator('filament')}
                  </div>
                </th>

                {/* 5. ВЕС / ВРЕМЯ */}
                <th
                  onClick={() => onSort('params')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-center min-w-0"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ВЕС / ВРЕМЯ</span>
                    {renderSortIndicator('params')}
                  </div>
                </th>

                {/* 6. ОСТАТОК СКЛАДА */}
                <th
                  onClick={() => onSort('stock')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-center min-w-0"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ОСТАТОК СКЛАДА</span>
                    {renderSortIndicator('stock')}
                  </div>
                </th>

                {/* 7. СЕБЕСТ. / ЦЕНА */}
                <th
                  onClick={() => onSort('price')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right min-w-0"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>СЕБЕСТ. / ЦЕНА</span>
                    {renderSortIndicator('price')}
                  </div>
                </th>

                {/* 8. ПРИБЫЛЬ / МАРЖА */}
                <th
                  onClick={() => onSort('profit')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right min-w-0"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ПРИБЫЛЬ / МАРЖА</span>
                    {renderSortIndicator('profit')}
                  </div>
                </th>

                {/* 9. ДЕЙСТВИЯ */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 text-right min-w-0">
                  <span>ДЕЙСТВИЯ</span>
                </th>
              </tr>
            </thead>

            <tbody className="block w-full divide-y divide-white/5 font-mono text-xs">
              {visibleRows.length === 0 ? (
                <tr className="block w-full">
                  <td colSpan={9} className="block w-full py-12 text-center text-neutral-500 font-mono">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Package className="w-7 h-7 mx-auto text-neutral-600 opacity-50" />
                      <p className="font-bold text-neutral-300 text-sm">Товаров не найдено</p>
                      <p className="text-xs text-neutral-500">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте новый товар с помощью кнопки в боковом меню'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const isCol = row.rowKind === 'collection';
                  const isAsm = row.rowKind === 'product' && row.item.type === 'assembly';
                  const isElevated = elevatedRow?.id === row.id;
                  const isBlurred = Boolean(elevatedRow) && !isElevated;
                  const isExpandedRow = Boolean(expandedItemIds[row.id]);
                  const isSelected = selectedIds.includes(row.id);
                  const article = formatProductArticle(row);
                  const salesStat = salesStatsMap.get(row.id);
                  const stock = row.stock_quantity || 0;
                  const finalPrice = row.final_price || 0;
                  const baseCost = row.base_cost || 0;
                  const profit = Math.round((finalPrice - baseCost) * 100) / 100;
                  const marginPercent = finalPrice > 0 ? (profit / finalPrice) * 100 : 0;
                  const CatIcon = getCategoryLucideIcon(row.category || 'Разное');
                  const isContextMenuActive = contextMenu?.row.id === row.id;

                  return (
                    <React.Fragment key={row.id}>
                      <motion.tr
                        animate={{
                          y: isElevated ? -10 : 0,
                          scale: 1,
                          filter: isBlurred ? 'blur(5px) opacity(0.35)' : 'blur(0px) opacity(1)',
                          backgroundColor: isElevated ? 'rgba(15, 15, 15, 0.98)' : 'rgba(0, 0, 0, 0)',
                          borderColor: isElevated ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                          borderRadius: isElevated ? 14 : 0,
                          boxShadow: isElevated ? '0 25px 60px -10px rgba(0, 0, 0, 0.95)' : 'none',
                        }}
                        whileHover={!isElevated && !isBlurred ? { backgroundColor: 'rgba(255, 255, 255, 0.04)' } : undefined}
                        transition={{
                          y: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                          filter: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                          backgroundColor: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                          borderColor: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                          borderRadius: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                          boxShadow: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                        }}
                        onContextMenu={(e) => !isBlurred && handleContextMenu(e, row)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isElevated) {
                            lastElevatedCloseTimeRef.current = Date.now();
                            setElevatedRow(null);
                          } else {
                            if (Date.now() - lastElevatedCloseTimeRef.current < 450) return;
                            setElevatedRow(row);
                          }
                        }}
                        className={`transition-colors group relative border-b grid w-full items-center ${
                          isElevated
                            ? '!z-50 ring-1 ring-white/20 cursor-default'
                            : isBlurred
                            ? 'pointer-events-none select-none border-white/5'
                            : isSelected
                            ? '!bg-white/[0.08] !border-white/20 cursor-pointer'
                            : isContextMenuActive
                            ? '!bg-neutral-800/90 text-white border-white/5 cursor-pointer'
                            : 'border-white/5 cursor-pointer'
                        }`}
                        style={{ gridTemplateColumns: PRODUCTS_COMPACT_COLUMNS }}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-1 bottom-1 w-1 bg-white/70 rounded-r z-10" />
                        )}

                        {/* 1. АРТИКУЛ / ТИП */}
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold text-neutral-300 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {selectedIds.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleSelect?.(row.id);
                                }}
                                className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                                  isSelected
                                    ? 'bg-white border-white text-neutral-950 font-bold'
                                    : 'border-white/20 hover:border-white/50 bg-neutral-900/60'
                                }`}
                                title={isSelected ? 'Снять выбор' : 'Выбрать'}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </button>
                            )}

                            <div className="flex flex-col gap-1 leading-tight">
                              <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[11px] font-mono w-fit text-neutral-200 font-bold">
                                {article}
                              </span>
                              <span className={`text-[9px] font-mono px-1 py-0.2 rounded w-fit border ${
                                isCol ? 'text-purple-300 border-purple-800/40 bg-purple-950/40' : isAsm ? 'text-cyan-300 border-cyan-800/40 bg-cyan-950/40' : 'text-neutral-400 border-white/10'
                              }`}>
                                {isCol ? 'Коллекция' : isAsm ? 'Сборка' : 'Штучный'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. КАТЕГОРИЯ (ПОРТАЛЬНЫЙ ВЫПАДАЮЩИЙ СПИСОК) */}
                        <td className="py-2.5 px-3 whitespace-nowrap min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setCategoryPicker({ row, targetRect: rect });
                              setFilamentPicker(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono bg-white/[0.03] text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
                            title="Клик для быстрой смены категории"
                          >
                            <CatIcon className="w-3 h-3 text-neutral-400 group-hover:text-neutral-300 shrink-0" />
                            <span className="truncate max-w-[95px]">{row.category || 'Разное'}</span>
                          </button>
                        </td>

                        {/* 3. ИЗДЕЛИЕ / ДЕТАЛИ (ИНЛАЙН-РЕДАКТИРОВАНИЕ ПО КЛИКУ) */}
                        <td className="py-2.5 px-3 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 font-sans group/name">
                            {(isCol || isAsm) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleExpand(row.id);
                                }}
                                className={`p-1 rounded-md transition-all shrink-0 cursor-pointer ${
                                  isExpandedRow
                                    ? isCol ? 'bg-purple-500 text-white' : 'bg-cyan-500 text-neutral-950 font-bold'
                                    : isCol
                                    ? 'bg-purple-950/80 text-purple-300 border border-purple-800/40'
                                    : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40'
                                }`}
                              >
                                <motion.div animate={{ rotate: isExpandedRow ? 90 : 0 }}>
                                  <ChevronRight size={12} />
                                </motion.div>
                              </button>
                            )}

                            <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                              {editingCell?.rowId === row.id && editingCell?.field === 'name' ? (
                                <input
                                  ref={inputRef as React.RefObject<HTMLInputElement>}
                                  type="text"
                                  value={editValue}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => commitEdit(row, 'name', editValue)}
                                  onKeyDown={(e) => handleKeyDown(e, row, 'name')}
                                  className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-white font-semibold text-xs min-w-[120px] max-w-full flex-1 p-0 m-0 leading-tight"
                                  placeholder="Название товара"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(row, 'name', row.name);
                                  }}
                                  className="font-semibold text-white hover:text-neutral-300 transition-colors block truncate cursor-text"
                                  title={`${row.name} (Клик для редактирования названия)`}
                                >
                                  {row.name}
                                </span>
                              )}

                              {salesStat?.isBestseller && (
                                <Tooltip content={`Хит продаж: продано ${salesStat.soldQty} шт. (${salesStat.salesSharePercent}% от всех продаж)`}>
                                  <span className="text-[8.5px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1 py-0.2 rounded w-fit flex items-center gap-0.5 font-bold select-none shrink-0 cursor-default">
                                    <Flame className="w-2.5 h-2.5 shrink-0" />
                                    <span>ХИТ</span>
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 4. ПЛАСТИК */}
                        <td className="py-2.5 px-3 whitespace-nowrap min-w-0">
                          {row.rowKind === 'collection' ? (
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {(row.materialsList || []).slice(0, 2).join(', ') || 'Различный'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setFilamentPicker({ row, targetRect: rect });
                                setCategoryPicker(null);
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono bg-white/[0.03] text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                              title="Клик для смены пластика"
                            >
                              <span
                                className="w-2 h-2 rounded-full border border-white/20 shrink-0"
                                style={{ backgroundColor: row.item.filament_color || '#3b82f6' }}
                              />
                              <span className="truncate max-w-[85px]">{row.item.filament_name || 'PLA'}</span>
                            </button>
                          )}
                        </td>

                        {/* 5. ВЕС / ВРЕМЯ (ПО ЦЕНТРУ) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-center font-mono text-xs min-w-0">
                          <div className="flex flex-col items-center gap-0.5 leading-tight">
                            <span className="text-neutral-200 tabular-nums">
                              {row.weight_g ? `${row.weight_g} г` : '—'}
                            </span>
                            {(row.hours || row.minutes) ? (
                              <span className="text-[10px] text-neutral-500 tabular-nums">
                                {row.hours ? `${row.hours}ч ` : ''}{row.minutes ? `${row.minutes}м` : ''}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 6. ОСТАТОК СКЛАДА С КНОПКАМИ +/- */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-center min-w-0">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {row.rowKind === 'product' && (
                              <button
                                type="button"
                                onClick={(e) => handleStockDelta(e, row, -1)}
                                className="w-5 h-5 rounded flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-95"
                                title="Уменьшить остаток на 1"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                            )}

                            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border tabular-nums ${
                              stock > 2
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                : stock > 0
                                ? 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                                : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                            }`}>
                              {stock} шт
                            </span>

                            {row.rowKind === 'product' && (
                              <button
                                type="button"
                                onClick={(e) => handleStockDelta(e, row, 1)}
                                className="w-5 h-5 rounded flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-95"
                                title="Увеличить остаток на 1"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 7. СЕБЕСТ. / ЦЕНА (СДВОЕННЫЙ СТОЛБЕЦ) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0">
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <AnimatedPriceNumber
                              value={finalPrice}
                              currencySymbol={currencySymbol}
                              className="text-white font-bold"
                            />
                            <span className="text-[10px] text-neutral-500 tabular-nums flex items-baseline gap-0.5">
                              <span>Себ:</span>
                              <AnimatedPriceNumber
                                value={baseCost}
                                currencySymbol={currencySymbol}
                                className="text-[10px] text-neutral-500"
                              />
                            </span>
                          </div>
                        </td>

                        {/* 8. ПРИБЫЛЬ / МАРЖА */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs min-w-0">
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <AnimatedPriceNumber
                              value={profit}
                              currencySymbol={currencySymbol}
                              showPositiveSign={profit > 0}
                              className={`font-bold tabular-nums ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                            />
                            {finalPrice > 0 && (
                              <div className={`text-[10px] tabular-nums flex items-center justify-end gap-0.5 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                <AnimatedPriceNumber
                                  value={marginPercent}
                                  currencySymbol="%"
                                  decimals={0}
                                  className={`font-medium text-[10px] ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                                  currencyClassName={`font-medium text-[10px] select-none ml-0.5 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                                />
                                <span className={profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>маржа</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 9. ДЕЙСТВИЯ (БЕЗ ТРЁХ ТОЧЕК) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono min-w-0">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {row.rowKind === 'product' ? (
                              <>
                                <Tooltip content="В заказ">
                                  <button
                                    type="button"
                                    onClick={() => onCreateOrder(row.item)}
                                    className="px-2 py-1 rounded-md font-mono text-[11px] font-bold bg-white text-neutral-950 hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                  >
                                    <ShoppingCart className="w-3 h-3" />
                                    <span>Заказ</span>
                                  </button>
                                </Tooltip>
                                <Tooltip content="В Калькулятор">
                                  <button
                                    type="button"
                                    onClick={() => onLoadIntoCalculator(row.item)}
                                    className="p-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <CalculatorIcon className="w-3 h-3" />
                                  </button>
                                </Tooltip>
                              </>
                            ) : (
                              <Tooltip content="Свойства коллекции">
                                <button
                                  type="button"
                                  onClick={() => onOpenEditCollection(row.collection)}
                                  className="p-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </td>

                        {/* Нижняя выезжающая панель: ProductRowDrawer */}
                        <AnimatePresence>
                          {isElevated && (
                            <td
                              className="p-0 border-0 col-span-full w-full"
                              style={{ gridColumn: '1 / -1' }}
                            >
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  height: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                                  opacity: { duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] },
                                }}
                                className="w-full overflow-hidden"
                              >
                                <ProductRowDrawer
                                  row={row}
                                  currencySymbol={currencySymbol}
                                  onInlineUpdateProduct={onInlineUpdateProduct}
                                  onInlineUpdateCollection={onInlineUpdateCollection}
                                  onSetStock={onSetStock}
                                  onOpenQuickEditModal={onOpenQuickEditModal}
                                  onOpenStlModal={onOpenStlModal}
                                  onLoadIntoCalculator={onLoadIntoCalculator}
                                  onCreateOrder={onCreateOrder}
                                  onOpenEditCollection={onOpenEditCollection}
                                  onOpenAddVariantModal={onOpenAddVariantModal}
                                  onClose={() => {
                                    lastElevatedCloseTimeRef.current = Date.now();
                                    setElevatedRow(null);
                                  }}
                                  categoriesList={categoriesList}
                                  filaments={filaments}
                                  salesStat={salesStat}
                                />
                              </motion.div>
                            </td>
                          )}
                        </AnimatePresence>
                      </motion.tr>

                      {/* Вложенные строки при раскрытии коллекции или сборки */}
                      {isExpandedRow && (
                        <tr className="block w-full">
                          <td colSpan={9} className="block w-full p-0 bg-neutral-950/90 border-b border-white/10">
                            {isCol ? (
                              <div className="border-t border-purple-500/20 px-6 py-3 space-y-2 font-mono text-xs">
                                <div className="flex items-center justify-between text-purple-300 pb-1 border-b border-white/5">
                                  <span className="flex items-center gap-1.5 font-bold">
                                    <FolderPlus size={13} className="text-purple-400" />
                                    <span>Варианты коллекции «{row.name}» ({row.childItems.length})</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onOpenAddVariantModal(row.collection)}
                                    className="text-[11px] font-bold text-purple-300 hover:text-purple-200 underline cursor-pointer"
                                  >
                                    + Добавить вариант
                                  </button>
                                </div>
                                <div className="divide-y divide-white/5">
                                  {row.childItems.map((child) => (
                                    <div key={child.id} className="py-2 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-purple-400 font-bold select-none">└─</span>
                                        <span className="font-semibold text-white truncate max-w-xs">{child.name}</span>
                                        <span className="text-[10px] text-neutral-500">#{child.id.slice(0, 6)}</span>
                                      </div>
                                      <div className="flex items-center gap-4 text-right shrink-0">
                                        <CockpitStatusPill label={`${child.stock_quantity || 0} шт`} tone={(child.stock_quantity || 0) > 0 ? 'emerald' : 'neutral'} dot={(child.stock_quantity || 0) > 0} />
                                        <span className="font-bold text-white font-mono text-xs">{formatCurrency(child.final_price || 0, currencySymbol)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : isAsm ? (
                              <div className="border-t border-cyan-500/20 px-6 py-3 space-y-2 font-mono text-xs">
                                <div className="pb-1 border-b border-white/5 text-cyan-300 font-bold">
                                  Состав сборки «{row.name}»:
                                </div>
                                <div className="divide-y divide-white/5">
                                  {(row.item.assembly_parts || []).map((p, idx) => (
                                    <div key={idx} className="py-1.5 flex items-center justify-between gap-3 text-neutral-300">
                                      <div className="flex items-center gap-2">
                                        <span className="text-cyan-400 font-bold">└─</span>
                                        <span className="text-white font-medium">{p.name}</span>
                                      </div>
                                      <span className="text-neutral-400 font-mono">×{p.quantity} шт</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {/* Sentinel для подгрузки */}
              {visibleCount < totalRowsCount && (
                <tr ref={sentinelRef} className="block w-full">
                  <td colSpan={9} className="block w-full py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-neutral-400 font-mono animate-pulse">
                        Загрузка товаров...
                      </span>
                      <button
                        type="button"
                        onClick={onShowAll}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 rounded-lg text-xs font-mono transition-colors cursor-pointer"
                      >
                        Показать все ({totalRowsCount})
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ПОРТАЛЬНОЕ ВЫПАДАЮЩЕЕ МЕНЮ КАТЕГОРИЙ */}
      <TableCategoryDropdownPortal
        isOpen={Boolean(categoryPicker)}
        targetRect={categoryPicker?.targetRect || null}
        currentCategory={categoryPicker?.row.category || 'Разное'}
        categoriesList={categoriesList}
        onSelect={(newCat) => {
          if (!categoryPicker) return;
          if (categoryPicker.row.rowKind === 'product') {
            onInlineUpdateProduct?.(categoryPicker.row.item.id, { category: newCat });
          } else {
            onInlineUpdateCollection?.(categoryPicker.row.collection.id, { category: newCat });
          }
          setCategoryPicker(null);
        }}
        onClose={() => setCategoryPicker(null)}
      />

      {/* ПОРТАЛЬНОЕ ВЫПАДАЮЩЕЕ МЕНЮ ПЛАСТИКА С АВТОПЕРЕСЧЕТОМ */}
      <TableFilamentDropdownPortal
        isOpen={Boolean(filamentPicker)}
        targetRect={filamentPicker?.targetRect || null}
        currentFilamentName={filamentPicker?.row.rowKind === 'product' ? (filamentPicker.row.item.filament_name || 'PLA') : ''}
        filaments={filaments}
        onSelect={(newFilament) => {
          if (!filamentPicker) return;
          if (filamentPicker.row.rowKind === 'product') {
            const pItem = filamentPicker.row.item;
            const livePrinter = pItem.printer_id ? printers.find((p) => p.id === pItem.printer_id) : null;
            const res = calculateCost({
              weightG: pItem.weight_g || 0,
              hours: pItem.hours || 0,
              minutes: pItem.minutes || 0,
              laborMinutes: pItem.labor_minutes ?? 15,
              laborRatePerHour: pItem.labor_rate_per_hour,
              isOwnerLabor: pItem.is_owner_labor,
              isLaborPerUnit: pItem.is_labor_per_unit,
              markupPercent: pItem.markup_percent,
              defectPercent: pItem.defect_percent,
              discountPercent: pItem.discount_percent,
              discountAmount: pItem.discount_amount,
              urgencyPercent: pItem.urgency_percent,
              urgencyAmount: pItem.urgency_amount,
              customCostItems: pItem.custom_cost_items,
              quantity: pItem.quantity || 1,
              filament: newFilament,
              printer: livePrinter || null,
              settings: settings || null,
            });

            onInlineUpdateProduct?.(pItem.id, {
              filament_id: newFilament.id,
              filament_name: newFilament.name,
              filament_color: newFilament.color,
              base_cost: round2(res.totalBaseCost),
              final_price: round2(res.totalFinalPrice),
            });
          }
          setFilamentPicker(null);
        }}
        onClose={() => setFilamentPicker(null)}
      />

      {/* ПЛАВАЮЩАЯ ПАНЕЛЬ МНОЖЕСТВЕННОГО ВЫБОРА (COCKPIT SELECTION TOOLBAR) */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[8000] flex items-center gap-2 p-2 px-3.5 rounded-2xl bg-neutral-950/98 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl font-mono text-xs select-none"
          >
            <div className="flex items-center gap-2 pr-3 border-r border-white/10">
              <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse shrink-0" />
              <span className="text-white font-bold tracking-wider text-[11px]">
                ВЫБРАНО: <span className="text-white font-mono font-black">{selectedIds.length}</span>
              </span>
            </div>

            <CockpitButton
              size="sm"
              onClick={() => {
                if (selectedIds.length === visibleRows.length) {
                  onClearSelection?.();
                } else {
                  onSelectAll?.(visibleRows.map((r) => r.id));
                }
              }}
            >
              {selectedIds.length === visibleRows.length ? 'Снять все' : 'Выбрать все'}
            </CockpitButton>

            {onBatchRecalculateSelected && (
              <CockpitButton
                size="sm"
                icon={RefreshCw}
                onClick={onBatchRecalculateSelected}
              >
                Пересчитать
              </CockpitButton>
            )}

            {onBatchMoveSelected && (
              <CockpitButton
                size="sm"
                icon={FolderInput}
                onClick={onBatchMoveSelected}
              >
                В коллекцию
              </CockpitButton>
            )}

            {onBatchDeleteSelected && (
              <CockpitButton
                size="sm"
                icon={Trash2}
                className="!text-rose-400 hover:!text-rose-300 hover:!bg-rose-950/50 hover:!border-rose-800/50"
                onClick={onBatchDeleteSelected}
              >
                Удалить
              </CockpitButton>
            )}

            <button
              type="button"
              onClick={onClearSelection}
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Снять выделение (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ПОРТАЛЬНОЕ КОНТЕКСТНОЕ МЕНЮ (ПРАВЫЙ КЛИК МЫШИ) */}
      {typeof document !== 'undefined' && contextMenu && menuCoords && createPortal(
        <div
          ref={contextMenuRef}
          style={{ top: `${menuCoords.y}px`, left: `${menuCoords.x}px` }}
          className="fixed z-[9999] min-w-[210px] rounded-xl border border-white/15 bg-neutral-950/98 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl font-mono text-xs select-none space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1.5 border-b border-white/10 text-[10px] text-neutral-400 flex items-center justify-between font-bold">
            <span className="truncate max-w-[140px]">{contextMenu.row.name}</span>
            <span className="text-neutral-500">{formatProductArticle(contextMenu.row)}</span>
          </div>

          {/* ПУНКТ ВЫБОРА СТРОКИ */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(contextMenu.row.id);
              setContextMenu(null);
            }}
            className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-neutral-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
          >
            <CheckSquare className={`w-3.5 h-3.5 ${selectedIds.includes(contextMenu.row.id) ? 'text-white' : 'text-neutral-400'}`} />
            <span>{selectedIds.includes(contextMenu.row.id) ? 'Снять выбор' : 'Выбрать'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              handleCopyId(e, contextMenu.row.id);
              setContextMenu(null);
            }}
            className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-neutral-400" />
            <span>Скопировать ID</span>
          </button>

          {contextMenu.row.rowKind === 'product' ? (
            (() => {
              const pRow = contextMenu.row;
              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onCreateOrder(pRow.item);
                      setContextMenu(null);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-neutral-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-bold"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Создать заказ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLoadIntoCalculator(pRow.item);
                      setContextMenu(null);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <CalculatorIcon className="w-3.5 h-3.5 text-neutral-400" />
                    <span>В Калькулятор</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onStageForAssembly(pRow.item);
                      setContextMenu(null);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-neutral-400" />
                    <span>В черновик сборки</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenStlModal(pRow.item);
                      setContextMenu(null);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-neutral-400" />
                    <span>3D STL модель</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenCategoryModal(pRow.item);
                      setContextMenu(null);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Сменить категорию</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenMoveProduct(pRow.item);
                      setContextMenu(null);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <FolderInput className="w-3.5 h-3.5 text-purple-400" />
                    <span>В коллекцию...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenQuickEditModal(pRow.item);
                      setContextMenu(null);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Редактировать</span>
                  </button>
                </>
              );
            })()
          ) : (
            (() => {
              const cRow = contextMenu.row;
              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAddVariantModal(cRow.collection);
                      setContextMenu(null);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-purple-300 hover:text-white hover:bg-purple-950/50 transition-colors text-left cursor-pointer font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-400" />
                    <span>+ Вариант в коллекцию</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenEditCollection(cRow.collection);
                      setContextMenu(null);
                    }}
                    className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Настройки коллекции</span>
                  </button>
                </>
              );
            })()
          )}

          <div className="h-px bg-white/10 my-1" />

          <button
            type="button"
            onClick={() => {
              const activeRow = contextMenu.row;
              if (activeRow.rowKind === 'product') {
                onDelete(activeRow.id, activeRow.name, activeRow.item.type);
              } else {
                onOpenDeleteCollection(activeRow.collection);
              }
              setContextMenu(null);
            }}
            className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить позицию</span>
          </button>
        </div>,
        document.body
      )}

    </div>
  );
});
