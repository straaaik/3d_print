import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  CatalogTableRow, 
  SortField, 
  SortOrder, 
  SalesStatInfo,
  ProductFilter,
  StockFilter,
  formatProductArticle 
} from '../../types';
import { 
  SavedCalculation, 
  ProductCollection, 
  AssemblyPrintedPart, 
  Filament, 
  Printer 
} from '@/shared/types';
import { formatCurrency } from '@/shared/lib/format';
import { ProductCategory, getCategoryLucideIcon } from '@/shared/lib/categories';
import { 
  ChevronUp, 
  ChevronDown, 
  Edit2, 
  Copy, 
  Check, 
  Trash2, 
  ExternalLink, 
  Package, 
  Layers, 
  FolderPlus, 
  Flame, 
  Plus, 
  Minus, 
  Calculator as CalculatorIcon, 
  FileCode, 
  ShoppingCart, 
  MoreVertical, 
  ChevronRight,
  FolderInput,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '@/shared/ui/Tooltip';
import { CockpitStatusPill } from '@/shared/ui/CockpitTable/CockpitStatusPill';

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

  // Фильтрация внутри шапки таблицы
  productFilter: ProductFilter;
  setProductFilter: (filter: ProductFilter) => void;
  stockFilter: StockFilter;
  setStockFilter: (stock: StockFilter) => void;
  counts: {
    all: number;
    single: number;
    assembly: number;
    collections: number;
    inStock: number;
    lowStock: number;
    bestsellers: number;
  };

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

  // Действия
  onSelectForDrawer: (item: SavedCalculation) => void;
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

  // Контекстное меню
  contextMenu: { x: number; y: number; row: CatalogTableRow } | null;
  setContextMenu: (menu: { x: number; y: number; row: CatalogTableRow } | null) => void;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
}

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
  productFilter,
  setProductFilter,
  stockFilter,
  setStockFilter,
  counts,
  expandedItemIds,
  onToggleExpand,
  editingNameId,
  editingNameValue,
  setEditingNameValue,
  onSaveRename,
  onCancelRename,
  isInlineNameShaking,
  onStartRename,
  onSelectForDrawer,
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
  contextMenu,
  setContextMenu,
  contextMenuRef,
}: ProductsV2TableProps) {
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sentinel для бесконечной подгрузки
  useEffect(() => {
    if (visibleCount >= rows.length) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, rows.length, onLoadMore]);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const stagedIds = useMemo(
    () => stagedAssemblyParts.map((p) => p.product_id || p.id || '').filter(Boolean),
    [stagedAssemblyParts]
  );

  const renderSortIndicator = (field: SortField) => {
    const isActive = sortField === field;
    return (
      <span className="inline-flex items-center justify-center w-3 h-3 shrink-0">
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="w-3 h-3 text-cyan-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-cyan-400" />
          )
        ) : (
          <ChevronDown className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 transition-opacity" />
        )}
      </span>
    );
  };

  const handleContextMenu = (e: React.MouseEvent, row: CatalogTableRow) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      row,
    });
  };

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden flex flex-col font-sans select-none bg-neutral-950/40">
      
      {/* 1. ШАПКА-ТУЛБАР ТАБЛИЦЫ (ПРОДОЛЖЕНИЕ ТАБЛИЦЫ С СЕГМЕНТИРОВАННЫМИ ВКЛАДКАМИ) */}
      <div className="bg-neutral-900/90 border-b border-white/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Сегментированные переключатели категорий/типов */}
        <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl h-10 flex items-center gap-1 shadow-inner overflow-x-auto custom-scrollbar">
          {/* Все */}
          <button
            type="button"
            onClick={() => setProductFilter('all')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
              productFilter === 'all'
                ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Package className={`w-3.5 h-3.5 transition-colors ${
              productFilter === 'all' ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'
            }`} />
            <span>Все</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
              productFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
            }`}>
              {counts.all}
            </span>
          </button>

          {/* Поштучно */}
          <button
            type="button"
            onClick={() => setProductFilter('single')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
              productFilter === 'single'
                ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Tag className={`w-3.5 h-3.5 transition-colors ${
              productFilter === 'single' ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'
            }`} />
            <span>Поштучно</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
              productFilter === 'single' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
            }`}>
              {counts.single}
            </span>
          </button>

          {/* Сборки */}
          <button
            type="button"
            onClick={() => setProductFilter('assembly')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
              productFilter === 'assembly'
                ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 transition-colors ${
              productFilter === 'assembly' ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'
            }`} />
            <span>Сборки</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
              productFilter === 'assembly' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
            }`}>
              {counts.assembly}
            </span>
          </button>

          {/* Коллекции */}
          <button
            type="button"
            onClick={() => setProductFilter('collections')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
              productFilter === 'collections'
                ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <FolderPlus className={`w-3.5 h-3.5 transition-colors ${
              productFilter === 'collections' ? 'text-purple-400' : 'text-neutral-400 group-hover:text-white'
            }`} />
            <span>Коллекции</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
              productFilter === 'collections' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
            }`}>
              {counts.collections}
            </span>
          </button>

          {/* В наличии */}
          <button
            type="button"
            onClick={() => setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
              stockFilter === 'in_stock'
                ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 transition-colors ${
              stockFilter === 'in_stock' ? 'text-emerald-400' : 'text-neutral-400 group-hover:text-white'
            }`} />
            <span>В наличии</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
              stockFilter === 'in_stock' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
            }`}>
              {counts.inStock}
            </span>
          </button>

          {/* Мало */}
          <button
            type="button"
            onClick={() => setProductFilter(productFilter === 'low_stock' ? 'all' : 'low_stock')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
              productFilter === 'low_stock'
                ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 transition-colors ${
              productFilter === 'low_stock' ? 'text-amber-400' : 'text-neutral-400 group-hover:text-white'
            }`} />
            <span>Мало</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
              productFilter === 'low_stock' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
            }`}>
              {counts.lowStock}
            </span>
          </button>

          {/* Хиты */}
          <button
            type="button"
            onClick={() => setProductFilter(productFilter === 'bestsellers' ? 'all' : 'bestsellers')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
              productFilter === 'bestsellers'
                ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 transition-colors ${
              productFilter === 'bestsellers' ? 'text-amber-400' : 'text-neutral-400 group-hover:text-white'
            }`} />
            <span>Хиты</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
              productFilter === 'bestsellers' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
            }`}>
              {counts.bestsellers}
            </span>
          </button>
        </div>

        {/* Правая часть тулбара таблицы: Индикатор видимых строк */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-neutral-300 font-semibold">ПОЗИЦИЙ:</span>
            <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">
              {rows.length}
            </span>
          </span>
        </div>
      </div>

      {/* 2. ОСНОВНОЕ ТЕЛО ТАБЛИЦЫ */}
      <div className="overflow-x-auto w-full custom-scrollbar">
        {isExpanded ? (
          /* ========================================================================= */
          /* РАЗВЁРНУТЫЙ РЕЖИМ (14 РАЗДЕЛЬНЫХ СТОЛБЦОВ С МАКСИМАЛЬНОЙ ДЕТАЛИЗАЦИЕЙ)       */
          /* ========================================================================= */
          <table className="w-full text-left text-xs border-collapse min-w-[1680px]">
            <thead>
              <tr className="bg-neutral-900/95 border-b border-white/10 text-neutral-400 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider sticky top-0 z-20">
                {/* 1. № / АРТИКУЛ */}
                <th 
                  onClick={() => onSort('id')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-32 sticky left-0 bg-neutral-900 z-30 shadow-[2px_0_8px_rgba(0,0,0,0.4)] border-r border-white/10"
                >
                  <div className="flex items-center gap-1">
                    <span>АРТИКУЛ</span>
                    {renderSortIndicator('id')}
                  </div>
                </th>

                {/* 2. ТИП */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 text-center w-28">
                  <span>ТИП</span>
                </th>

                {/* 3. КАТЕГОРИЯ */}
                <th 
                  onClick={() => onSort('category')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-36"
                >
                  <div className="flex items-center gap-1">
                    <span>КАТЕГОРИЯ</span>
                    {renderSortIndicator('category')}
                  </div>
                </th>

                {/* 4. НАИМЕНОВАНИЕ / ДЕТАЛИ */}
                <th 
                  onClick={() => onSort('name')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-64"
                >
                  <div className="flex items-center gap-1">
                    <span>НАИМЕНОВАНИЕ / ДЕТАЛИ</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>

                {/* 5. ПЛАСТИК / МАТЕРИАЛ */}
                <th 
                  onClick={() => onSort('filament')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-36"
                >
                  <div className="flex items-center gap-1">
                    <span>ПЛАСТИК</span>
                    {renderSortIndicator('filament')}
                  </div>
                </th>

                {/* 6. ВЕС И ВРЕМЯ */}
                <th 
                  onClick={() => onSort('params')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-32"
                >
                  <div className="flex items-center gap-1">
                    <span>ВЕС / ВРЕМЯ</span>
                    {renderSortIndicator('params')}
                  </div>
                </th>

                {/* 7. ОСТАТОК СКЛАДА */}
                <th 
                  onClick={() => onSort('stock')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-44"
                >
                  <div className="flex items-center gap-1">
                    <span>ОСТАТОК СКЛАДА</span>
                    {renderSortIndicator('stock')}
                  </div>
                </th>

                {/* 8. СЕБЕСТОИМОСТЬ */}
                <th 
                  onClick={() => onSort('cost')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-32"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>СЕБЕСТОИМОСТЬ</span>
                    {renderSortIndicator('cost')}
                  </div>
                </th>

                {/* 9. ЦЕНА ПРОДАЖИ */}
                <th 
                  onClick={() => onSort('price')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-32"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ЦЕНА ПРОДАЖИ</span>
                    {renderSortIndicator('price')}
                  </div>
                </th>

                {/* 10. ЧИСТАЯ ПРИБЫЛЬ / МАРЖА */}
                <th 
                  onClick={() => onSort('profit')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ПРИБЫЛЬ / МАРЖА</span>
                    {renderSortIndicator('profit')}
                  </div>
                </th>

                {/* 11. ПРОДАЖИ */}
                <th 
                  onClick={() => onSort('sales')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-32"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ПРОДАЖИ (ЗАКАЗЫ)</span>
                    {renderSortIndicator('sales')}
                  </div>
                </th>

                {/* 12. 3D МОДЕЛЬ (STL) */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 text-center w-28">
                  <span>3D (STL)</span>
                </th>

                {/* 13. ДЕЙСТВИЯ */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 text-right w-44">
                  <span>ДЕЙСТВИЯ</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-neutral-500 font-mono">
                    <div className="max-w-xs mx-auto space-y-1.5">
                      <Package className="w-6 h-6 mx-auto text-neutral-600 opacity-50" />
                      <p className="font-bold text-neutral-400 text-xs">§ Товаров не найдено</p>
                      <p className="text-[11px] text-neutral-600">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте новый товар с помощью кнопки на панели'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const article = formatProductArticle(row);
                  const isCol = row.rowKind === 'collection';
                  const isAsm = row.rowKind === 'product' && row.item.type === 'assembly';
                  const isExpandedRow = Boolean(expandedItemIds[row.id]);
                  const isRenaming = editingNameId === row.id;

                  // Финансы
                  const finalPrice = row.final_price || 0;
                  const baseCost = row.base_cost || 0;
                  const profit = isCol ? row.totalProfit : Math.round((finalPrice - baseCost) * 100) / 100;
                  const marginPercent = finalPrice > 0 ? Math.round((profit / finalPrice) * 1000) / 10 : 0;
                  const markupPercent = baseCost > 0 ? Math.round((profit / baseCost) * 1000) / 10 : 0;

                  // Склад
                  const stock = row.stock_quantity || 0;
                  const isOutOfStock = stock === 0;
                  const isLowStock = stock > 0 && stock <= 2;

                  // Статистика продаж
                  const salesStat = row.rowKind === 'product' ? salesStatsMap.get(row.id) : undefined;
                  const isStaged = stagedIds.includes(row.id);

                  // Категория
                  const catName = row.category || 'Разное';
                  const catObj = categoriesList.find((c) => c.label === catName || c.id === catName);
                  const catLabel = catObj?.label || catName;
                  const CatIcon = getCategoryLucideIcon(catLabel);

                  // Пластик
                  const filName = row.rowKind === 'product' ? (row.item.filament_name || 'PLA') : '';
                  const filColor = row.rowKind === 'product' ? (row.item.filament_color || '#3b82f6') : '#888888';

                  // STL
                  const hasStl = row.rowKind === 'product' 
                    ? Boolean(row.item.stl_url || row.item.stl_file_data)
                    : (row.stlCount > 0);

                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onContextMenu={(e) => handleContextMenu(e, row)}
                        onClick={() => {
                          if (row.rowKind === 'product') {
                            onSelectForDrawer(row.item);
                          } else {
                            onToggleExpand(row.id);
                          }
                        }}
                        className="hover:bg-white/[0.04] transition-colors cursor-pointer group relative"
                      >
                        {/* 1. АРТИКУЛ (ЗАКРЕПЛЕНО СЛЕВА) */}
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold text-neutral-300 group-hover:text-cyan-300 sticky left-0 bg-neutral-950/95 z-10 shadow-[2px_0_8px_rgba(0,0,0,0.4)] border-r border-white/10">
                          <div className="flex flex-col gap-1 leading-tight">
                            <Tooltip content={`ID: ${row.id} (Клик для копирования)`}>
                              <button
                                type="button"
                                onClick={(e) => handleCopyId(e, row.id)}
                                className={`px-2 py-0.5 rounded text-[11px] font-mono w-fit font-bold border transition-colors flex items-center gap-1 ${
                                  isCol
                                    ? 'bg-purple-950/50 text-purple-300 border-purple-800/40 hover:bg-purple-900/60'
                                    : isAsm
                                    ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800/40 hover:bg-cyan-900/60'
                                    : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10 hover:text-cyan-300'
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

                            {salesStat && salesStat.soldQty > 0 && (
                              <span className="text-[8.5px] font-mono text-amber-400 bg-amber-950/50 border border-amber-800/40 px-1 py-0.2 rounded w-fit flex items-center gap-0.5 font-bold">
                                <Flame className="w-2.5 h-2.5 shrink-0" />
                                <span>ХИТ ({salesStat.soldQty})</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. ТИП */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-center">
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

                        {/* 3. КАТЕГОРИЯ */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Tooltip content="Сменить категорию">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (row.rowKind === 'product') {
                                  onOpenCategoryModal(row.item);
                                } else {
                                  onOpenEditCollection(row.collection);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono bg-neutral-900 text-neutral-300 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                            >
                              <CatIcon className={`w-3 h-3 ${isCol ? 'text-purple-400' : 'text-cyan-400'} shrink-0`} />
                              <span className="truncate max-w-[100px]">{catLabel}</span>
                            </button>
                          </Tooltip>
                        </td>

                        {/* 4. НАИМЕНОВАНИЕ / ДЕТАЛИ */}
                        <td className="py-2.5 px-3">
                          {isRenaming ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') onSaveRename();
                                  if (e.key === 'Escape') onCancelRename();
                                }}
                                autoFocus
                                className="px-2 py-0.5 bg-neutral-900 border border-cyan-400 text-white rounded text-xs font-sans outline-none w-full max-w-sm"
                              />
                              <button
                                type="button"
                                onClick={onSaveRename}
                                className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={onCancelRename}
                                className="p-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0 font-sans max-w-[240px]">
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

                              <span
                                className="font-bold text-white group-hover:text-cyan-300 transition-colors truncate text-xs sm:text-[13px] cursor-pointer"
                                title={row.name}
                              >
                                {row.name}
                              </span>

                              {/* Кнопка быстрого переименования */}
                              <Tooltip content="Переименовать">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStartRename(row.rowKind === 'product' ? row.item : row.collection);
                                  }}
                                  className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-neutral-400 hover:text-white transition-opacity p-0.5 cursor-pointer shrink-0"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                              </Tooltip>
                            </div>
                          )}
                        </td>

                        {/* 5. ПЛАСТИК / МАТЕРИАЛ */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isCol ? (
                            <div className="flex items-center gap-1 font-mono text-neutral-400">
                              {row.materialsColors.slice(0, 3).map((c, i) => (
                                <span
                                  key={i}
                                  className="w-2 h-2 rounded-full border border-white/20 shrink-0"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                              <span className="truncate max-w-[100px]">
                                {row.materialsList.length > 0 ? `${row.materialsList.length} мат.` : '—'}
                              </span>
                            </div>
                          ) : isAsm ? (
                            <span className="truncate max-w-[120px] font-mono text-cyan-300">
                              {(row.item.assembly_parts || []).length} дет.
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 font-mono text-neutral-300">
                              <span
                                className="w-2 h-2 rounded-full border border-white/20 shrink-0"
                                style={{ backgroundColor: filColor }}
                              />
                              <span className="truncate max-w-[110px]">{filName}</span>
                            </div>
                          )}
                        </td>

                        {/* 6. ВЕС И ВРЕМЯ */}
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs">
                          {isCol ? (
                            <span className="text-neutral-400">
                              {row.minWeight === row.maxWeight ? `${row.minWeight}г` : `${row.minWeight}–${row.maxWeight}г`}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5 leading-tight">
                              <span className="text-neutral-200 font-medium">{row.weight_g || 0} г</span>
                              <span className="text-[10px] text-neutral-500 font-semibold">
                                {row.hours || 0}ч {row.minutes || 0}м
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 7. ОСТАТОК СКЛАДА */}
                        <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {isOutOfStock ? (
                              <CockpitStatusPill label="0 шт (под заказ)" tone="neutral" dot={false} />
                            ) : isLowStock ? (
                              <CockpitStatusPill label={`Мало (${stock} шт)`} tone="yellow" pulse />
                            ) : (
                              <CockpitStatusPill label={`В наличии (${stock} шт)`} tone={isAsm ? 'cyan' : isCol ? 'purple' : 'emerald'} dot />
                            )}

                            {/* Кнопки быстрой регулировки остатка */}
                            {row.rowKind === 'product' && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-neutral-900 border border-white/10 rounded-md p-0.5">
                                <Tooltip content="Уменьшить остаток">
                                  <button
                                    type="button"
                                    onClick={() => onSetStock(row.item, Math.max(0, stock - 1))}
                                    disabled={stock <= 0}
                                    className="w-4 h-4 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                </Tooltip>
                                <span className="font-mono text-[10px] px-1 text-white font-bold">{stock}</span>
                                <Tooltip content="Увеличить остаток">
                                  <button
                                    type="button"
                                    onClick={() => onSetStock(row.item, stock + 1)}
                                    className="w-4 h-4 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </Tooltip>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 8. СЕБЕСТОИМОСТЬ */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                          {isCol ? (
                            <span className="text-neutral-400">
                              {row.minCost === row.maxCost
                                ? formatCurrency(row.minCost, currencySymbol)
                                : `${formatCurrency(row.minCost, currencySymbol)}–${formatCurrency(row.maxCost, currencySymbol)}`}
                            </span>
                          ) : (
                            <span className="font-bold text-neutral-200 text-xs">
                              {formatCurrency(baseCost, currencySymbol)}
                            </span>
                          )}
                        </td>

                        {/* 9. ЦЕНА ПРОДАЖИ */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                          {isCol ? (
                            <span className="font-bold text-purple-300 text-sm">
                              {row.minPrice === row.maxPrice
                                ? formatCurrency(row.minPrice, currencySymbol)
                                : `${formatCurrency(row.minPrice, currencySymbol)}–${formatCurrency(row.maxPrice, currencySymbol)}`}
                            </span>
                          ) : (
                            <span className={`font-bold text-sm ${isAsm ? 'text-cyan-300' : 'text-white'}`}>
                              {formatCurrency(finalPrice, currencySymbol)}
                            </span>
                          )}
                        </td>

                        {/* 10. ЧИСТАЯ ПРИБЫЛЬ / МАРЖА */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <span className={`font-bold font-mono text-sm ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {profit >= 0 ? `+${formatCurrency(profit, currencySymbol)}` : formatCurrency(profit, currencySymbol)}
                            </span>
                            {!isCol && finalPrice > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-neutral-400 justify-end">
                                <span className="text-emerald-400 font-medium">{marginPercent.toFixed(0)}% маржа</span>
                                {markupPercent > 0 && (
                                  <span className="text-neutral-500">• {markupPercent.toFixed(0)}% нац.</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 11. ПРОДАЖИ (ЗАКАЗЫ) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                          {salesStat && salesStat.soldQty > 0 ? (
                            <div className="flex flex-col items-end gap-0.5 leading-tight">
                              <span className="text-amber-400 font-bold font-mono text-xs">
                                {salesStat.soldQty} шт прод.
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {formatCurrency(salesStat.totalRevenue, currencySymbol)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-600 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* 12. 3D МОДЕЛЬ (STL) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                          {hasStl ? (
                            <Tooltip content="Открыть / Скачать 3D STL">
                              <button
                                type="button"
                                onClick={() => {
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

                        {/* 13. ДЕЙСТВИЯ */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {row.rowKind === 'collection' ? (
                              <>
                                <Tooltip content="Добавить вариант в коллекцию">
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
                                    className="p-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
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

                                <Tooltip content="Открыть в Калькуляторе">
                                  <button
                                    type="button"
                                    onClick={() => onLoadIntoCalculator(row.item)}
                                    className="p-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <CalculatorIcon className="w-3 h-3" />
                                  </button>
                                </Tooltip>

                                <Tooltip content={isStaged ? 'В черновике сборки' : 'Добавить в сборку'}>
                                  <button
                                    type="button"
                                    onClick={() => onStageForAssembly(row.item)}
                                    className={`p-1 rounded-md border transition-colors cursor-pointer ${
                                      isStaged
                                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
                                        : 'border-white/10 bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white'
                                    }`}
                                  >
                                    <Layers className="w-3 h-3" />
                                  </button>
                                </Tooltip>

                                <Tooltip content="Меню параметров">
                                  <button
                                    type="button"
                                    onClick={() => onOpenQuickEditModal(row.item)}
                                    className="p-1 rounded-md hover:bg-white/10 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <MoreVertical className="w-3 h-3" />
                                  </button>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </td>

                      </tr>

                      {/* Вложенные строки при раскрытии коллекции или сборки */}
                      {isExpandedRow && (
                        <tr>
                          <td colSpan={13} className="p-0 bg-neutral-950/90 border-b border-white/10">
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
                                  {row.childItems.map((child) => {
                                    const childProfit = Math.round(((child.final_price || 0) - (child.base_cost || 0)) * 100) / 100;
                                    const childMargin = child.final_price ? Math.round((childProfit / child.final_price) * 1000) / 10 : 0;
                                    const childStock = child.stock_quantity || 0;

                                    return (
                                      <div
                                        key={child.id}
                                        onClick={() => onSelectForDrawer(child)}
                                        className="py-2 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-lg cursor-pointer transition-colors"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-purple-400 font-bold select-none">└─</span>
                                          <span className="font-semibold text-white truncate max-w-xs">{child.name}</span>
                                          <span className="text-[10px] text-neutral-500">#{child.id.slice(0, 6)}</span>
                                          <span className="text-neutral-400">· {child.filament_name}</span>
                                        </div>

                                        <div className="flex items-center gap-4 text-right shrink-0">
                                          <CockpitStatusPill
                                            label={`${childStock} шт`}
                                            tone={childStock > 0 ? 'emerald' : 'neutral'}
                                            dot={childStock > 0}
                                          />
                                          <span className="text-neutral-400 font-mono text-xs">
                                            {formatCurrency(child.base_cost, currencySymbol)}
                                          </span>
                                          <span className="font-bold text-white font-mono text-xs">
                                            {formatCurrency(child.final_price, currencySymbol)}
                                          </span>
                                          <span className="text-emerald-400 font-mono text-xs">
                                            +{formatCurrency(childProfit, currencySymbol)} ({childMargin}%)
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : isAsm ? (
                              /* Детали сборки */
                              <div className="border-t border-cyan-500/20 px-6 py-3 space-y-3 font-mono text-xs">
                                <div className="flex items-center justify-between pb-1 border-b border-white/5 text-cyan-300">
                                  <span className="flex items-center gap-1.5 font-bold">
                                    <Layers size={13} className="text-cyan-400" />
                                    <span>Состав 3D-сборки «{row.name}» ({(row.item.assembly_parts || []).length} печатн. + {(row.item.assembly_hardware || []).length} фурн.)</span>
                                  </span>
                                </div>

                                <div className="divide-y divide-white/5">
                                  {(row.item.assembly_parts || []).map((p, idx) => (
                                    <div key={idx} className="py-1.5 flex items-center justify-between gap-3 text-neutral-300">
                                      <div className="flex items-center gap-2">
                                        <span className="text-cyan-400 font-bold">└─</span>
                                        <span className="text-white font-medium">{p.name}</span>
                                        <span className="text-[10px] text-neutral-400">({p.filament_name || 'PLA'}, {p.weight_g}г, {p.hours}ч {p.minutes}м)</span>
                                      </div>
                                      <div className="flex items-center gap-3 text-right">
                                        <span className="text-neutral-400">×{p.quantity} шт</span>
                                        <span className="font-bold text-cyan-300">{formatCurrency((p.final_price || p.base_cost || 0) * (p.quantity || 1), currencySymbol)}</span>
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
              {visibleCount < rows.length && (
                <tr ref={sentinelRef}>
                  <td colSpan={13} className="py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-neutral-400 font-mono animate-pulse">
                        Загрузка товаров...
                      </span>
                      <button
                        type="button"
                        onClick={onShowAll}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 rounded-lg text-xs font-mono transition-colors cursor-pointer"
                      >
                        Показать все ({rows.length})
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* ========================================================================= */
          /* КОМПАКТНЫЙ РЕЖИМ (9 СДВОЕННЫХ СТОЛБЦОВ — ТОЧНЫЙ АНАЛОГ ORDERS)            */
          /* ========================================================================= */
          <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-neutral-900/90 border-b border-white/10 text-neutral-400 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider">
                {/* 1. АРТИКУЛ / ТИП */}
                <th 
                  onClick={() => onSort('id')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-32 sticky left-0 bg-neutral-900/95 z-10"
                >
                  <div className="flex items-center gap-1">
                    <span>АРТИКУЛ / ТИП</span>
                    {renderSortIndicator('id')}
                  </div>
                </th>

                {/* 2. КАТЕГОРИЯ */}
                <th 
                  onClick={() => onSort('category')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-36"
                >
                  <div className="flex items-center gap-1">
                    <span>КАТЕГОРИЯ</span>
                    {renderSortIndicator('category')}
                  </div>
                </th>

                {/* 3. ИЗДЕЛИЕ / ДЕТАЛИ */}
                <th 
                  onClick={() => onSort('name')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-56"
                >
                  <div className="flex items-center gap-1">
                    <span>ИЗДЕЛИЕ / ДЕТАЛИ</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>

                {/* 4. ПЛАСТИК */}
                <th 
                  onClick={() => onSort('filament')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-32"
                >
                  <div className="flex items-center gap-1">
                    <span>ПЛАСТИК</span>
                    {renderSortIndicator('filament')}
                  </div>
                </th>

                {/* 5. ВЕС / ВРЕМЯ */}
                <th 
                  onClick={() => onSort('params')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-28"
                >
                  <div className="flex items-center gap-1">
                    <span>ВЕС / ВРЕМЯ</span>
                    {renderSortIndicator('params')}
                  </div>
                </th>

                {/* 6. ОСТАТОК СКЛАДА */}
                <th 
                  onClick={() => onSort('stock')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-36"
                >
                  <div className="flex items-center gap-1">
                    <span>ОСТАТОК СКЛАДА</span>
                    {renderSortIndicator('stock')}
                  </div>
                </th>

                {/* 7. СЕБЕСТ. / ЦЕНА */}
                <th 
                  onClick={() => onSort('price')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>СЕБЕСТ. / ЦЕНА</span>
                    {renderSortIndicator('price')}
                  </div>
                </th>

                {/* 8. ПРИБЫЛЬ / МАРЖА */}
                <th 
                  onClick={() => onSort('profit')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-32"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ПРИБЫЛЬ / МАРЖА</span>
                    {renderSortIndicator('profit')}
                  </div>
                </th>

                {/* 9. ДЕЙСТВИЯ */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 text-right w-36">
                  <span>ДЕЙСТВИЯ</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-neutral-500 font-mono">
                    <div className="max-w-xs mx-auto space-y-1.5">
                      <Package className="w-6 h-6 mx-auto text-neutral-600 opacity-50" />
                      <p className="font-bold text-neutral-400 text-xs">§ Товаров не найдено</p>
                      <p className="text-[11px] text-neutral-600">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте новый товар с помощью кнопки на панели'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const article = formatProductArticle(row);
                  const isCol = row.rowKind === 'collection';
                  const isAsm = row.rowKind === 'product' && row.item.type === 'assembly';
                  const isExpandedRow = Boolean(expandedItemIds[row.id]);

                  // Финансы
                  const finalPrice = row.final_price || 0;
                  const baseCost = row.base_cost || 0;
                  const profit = isCol ? row.totalProfit : Math.round((finalPrice - baseCost) * 100) / 100;
                  const marginPercent = finalPrice > 0 ? Math.round((profit / finalPrice) * 1000) / 10 : 0;

                  // Склад
                  const stock = row.stock_quantity || 0;
                  const isOutOfStock = stock === 0;
                  const isLowStock = stock > 0 && stock <= 2;

                  // Категория
                  const catName = row.category || 'Разное';
                  const catObj = categoriesList.find((c) => c.label === catName || c.id === catName);
                  const catLabel = catObj?.label || catName;
                  const CatIcon = getCategoryLucideIcon(catLabel);

                  // Пластик
                  const filName = row.rowKind === 'product' ? (row.item.filament_name || 'PLA') : '';
                  const filColor = row.rowKind === 'product' ? (row.item.filament_color || '#3b82f6') : '#888888';

                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        onContextMenu={(e) => handleContextMenu(e, row)}
                        onClick={() => {
                          if (row.rowKind === 'product') {
                            onSelectForDrawer(row.item);
                          } else {
                            onToggleExpand(row.id);
                          }
                        }}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer group relative"
                      >
                        {/* 1. АРТИКУЛ И ТИП */}
                        <td className="py-2 px-3 whitespace-nowrap font-bold text-neutral-300 group-hover:text-cyan-300 sticky left-0 bg-neutral-950/90 z-10">
                          <div className="flex flex-col gap-0.5 leading-tight">
                            <span className={`px-1.5 py-0.2 rounded text-[11px] font-mono w-fit font-bold border ${
                              isCol
                                ? 'bg-purple-950/50 text-purple-300 border-purple-800/40'
                                : isAsm
                                ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800/40'
                                : 'bg-white/5 text-neutral-300 border-white/10'
                            }`}>
                              {article}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono pl-0.5">
                              {isCol ? 'Коллекция' : isAsm ? 'Сборка' : 'Штучный'}
                            </span>
                          </div>
                        </td>

                        {/* 2. КАТЕГОРИЯ */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral-900 text-neutral-300 border border-white/10">
                            <CatIcon className={`w-2.5 h-2.5 ${isCol ? 'text-purple-400' : 'text-cyan-400'} shrink-0`} />
                            <span className="truncate max-w-[90px]">{catLabel}</span>
                          </span>
                        </td>

                        {/* 3. НАИМЕНОВАНИЕ / ДЕТАЛИ */}
                        <td className="py-2 px-3 font-sans font-medium text-white">
                          <div className="flex items-center gap-1.5 max-w-[220px]">
                            {(isCol || isAsm) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleExpand(row.id);
                                }}
                                className="p-0.5 text-neutral-400 hover:text-white"
                              >
                                <ChevronRight size={11} className={`transform transition-transform ${isExpandedRow ? 'rotate-90 text-cyan-400' : ''}`} />
                              </button>
                            )}
                            <span className="font-semibold text-neutral-200 text-xs truncate" title={row.name}>
                              {row.name}
                            </span>
                          </div>
                        </td>

                        {/* 4. ПЛАСТИК */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono text-xs">
                          {isCol ? (
                            <span className="text-neutral-400">{row.materialsList.length} мат.</span>
                          ) : isAsm ? (
                            <span className="text-cyan-300">{(row.item.assembly_parts || []).length} дет.</span>
                          ) : (
                            <div className="flex items-center gap-1 text-neutral-300">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: filColor }} />
                              <span className="truncate max-w-[90px]">{filName}</span>
                            </div>
                          )}
                        </td>

                        {/* 5. ВЕС / ВРЕМЯ */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono text-xs text-neutral-400">
                          {isCol ? (
                            <span>{row.minWeight}–{row.maxWeight}г</span>
                          ) : (
                            <span>{row.weight_g || 0}г · {row.hours || 0}ч</span>
                          )}
                        </td>

                        {/* 6. ОСТАТОК СКЛАДА */}
                        <td className="py-2 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            {isOutOfStock ? (
                              <CockpitStatusPill label="0 шт" tone="neutral" dot={false} />
                            ) : isLowStock ? (
                              <CockpitStatusPill label={`${stock} шт`} tone="yellow" pulse />
                            ) : (
                              <CockpitStatusPill label={`${stock} шт`} tone={isAsm ? 'cyan' : isCol ? 'purple' : 'emerald'} dot />
                            )}
                            {row.rowKind === 'product' && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => onSetStock(row.item, Math.max(0, stock - 1))}
                                  disabled={stock <= 0}
                                  className="w-3.5 h-3.5 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onSetStock(row.item, stock + 1)}
                                  className="w-3.5 h-3.5 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 7. СЕБЕСТ. / ЦЕНА */}
                        <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs">
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {formatCurrency(finalPrice, currencySymbol)}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              себест. {formatCurrency(baseCost, currencySymbol)}
                            </span>
                          </div>
                        </td>

                        {/* 8. ПРИБЫЛЬ / МАРЖА */}
                        <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs">
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <span className={`font-bold font-mono text-xs ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {profit >= 0 ? `+${formatCurrency(profit, currencySymbol)}` : formatCurrency(profit, currencySymbol)}
                            </span>
                            {!isCol && (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {marginPercent.toFixed(0)}% маржа
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 9. ДЕЙСТВИЯ */}
                        <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {row.rowKind === 'product' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onCreateOrder(row.item)}
                                  className="px-2 py-0.5 rounded bg-white text-neutral-950 font-bold text-[10px] hover:bg-neutral-200 cursor-pointer"
                                >
                                  Заказ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onLoadIntoCalculator(row.item)}
                                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 cursor-pointer"
                                >
                                  <CalculatorIcon className="w-2.5 h-2.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                      </tr>

                      {/* Вложенные строки в компактном режиме */}
                      {isExpandedRow && (
                        <tr>
                          <td colSpan={9} className="p-0 bg-neutral-950/90 border-b border-white/10">
                            {isCol ? (
                              <div className="border-t border-purple-500/20 px-4 py-2 space-y-1 font-mono text-xs">
                                {row.childItems.map((child) => (
                                  <div
                                    key={child.id}
                                    onClick={() => onSelectForDrawer(child)}
                                    className="py-1 flex items-center justify-between gap-2 hover:bg-white/[0.02] px-2 rounded cursor-pointer"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-purple-400">└─</span>
                                      <span className="text-white font-medium">{child.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-neutral-400">{child.stock_quantity || 0} шт</span>
                                      <span className="font-bold text-white">{formatCurrency(child.final_price, currencySymbol)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {visibleCount < rows.length && (
                <tr ref={sentinelRef}>
                  <td colSpan={9} className="py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-neutral-400 font-mono animate-pulse">
                        Загрузка товаров...
                      </span>
                      <button
                        type="button"
                        onClick={onShowAll}
                        className="px-2.5 py-0.5 bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 rounded text-xs font-mono transition-colors cursor-pointer"
                      >
                        Показать все ({rows.length})
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* КОНТЕКСТНОЕ МЕНЮ (ПКМ) */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 w-52 bg-neutral-950 border border-white/15 rounded-xl shadow-2xl p-1.5 space-y-1 font-mono text-xs backdrop-blur-2xl"
          >
            <div className="px-2 py-1 border-b border-white/10 text-[10px] text-neutral-400 truncate">
              {formatProductArticle(contextMenu.row)} • {contextMenu.row.name}
            </div>

            {contextMenu.row.rowKind === 'product' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'product') {
                      onSelectForDrawer(contextMenu.row.item);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Карточка товара</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'product') {
                      onCreateOrder(contextMenu.row.item);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Создать заказ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'product') {
                      onLoadIntoCalculator(contextMenu.row.item);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <CalculatorIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>В Калькулятор</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'product') {
                      onStageForAssembly(contextMenu.row.item);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>В черновик сборки</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'product') {
                      onOpenQuickEditModal(contextMenu.row.item);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Редактировать</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'product') {
                      onOpenMoveProduct(contextMenu.row.item);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <FolderInput className="w-3.5 h-3.5 text-purple-400" />
                  <span>В коллекцию</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'product') {
                      onOpenStlModal(contextMenu.row.item);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-sky-400" />
                  <span>3D Модель (STL)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'product') {
                      onOpenCategoryModal(contextMenu.row.item);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5 text-teal-400" />
                  <span>Сменить категорию</span>
                </button>

                <div className="border-t border-white/10 my-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'product') {
                      onDelete(contextMenu.row.item.id, contextMenu.row.item.name, contextMenu.row.item.type);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить позицию</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'collection') {
                      onOpenAddVariantModal(contextMenu.row.collection);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                  <span>Добавить вариант</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'collection') {
                      onOpenEditCollection(contextMenu.row.collection);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Свойства коллекции</span>
                </button>

                <div className="border-t border-white/10 my-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    if (contextMenu.row.rowKind === 'collection') {
                      onOpenDeleteCollection(contextMenu.row.collection);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить коллекцию</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
});
