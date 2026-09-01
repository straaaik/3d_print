'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  SavedCalculation, 
  ProductCollection, 
  AssemblyPrintedPart, 
  Filament, 
  Printer 
} from '../../../shared/types';
import { CockpitTable } from '../../../shared/ui/CockpitTable/CockpitTable';
import { CockpitTableColumn } from '../../../shared/ui/CockpitTable/types';
import { CockpitStatusPill } from '../../../shared/ui/CockpitTable/CockpitStatusPill';
import { formatCurrency } from '../../../shared/lib/format';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { ProductCategory, getCategoryLucideIcon } from '../../../shared/lib/categories';
import { CatalogTableRow, SortField, SortOrder, SalesStatInfo } from '../types';

import {
  Package,
  Layers,
  FolderPlus,
  Flame,
  Plus,
  Minus,
  Calculator as CalculatorIcon,
  X,
  Copy,
  Check,
  Edit2,
  FileCode,
  ShoppingCart,
  MoreVertical,
  ChevronRight
} from 'lucide-react';

interface ProductsTableModernProps {
  rows: CatalogTableRow[];
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  expandedItemIds: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  editingNameId: string | null;
  editingNameValue: string;
  setEditingNameValue: (val: string) => void;
  onSaveRename: (id: string, newName: string, isCol: boolean) => void;
  onCancelRename: () => void;
  isInlineNameShaking?: boolean;
  onStartRename: (item: SavedCalculation | ProductCollection) => void;
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
  salesStatsMap: Map<string, SalesStatInfo>;
  currencySymbol: string;
  categoriesList: ProductCategory[];
  filaments: Filament[];
  printers: Printer[];
  canUndo?: boolean;
  onUndo?: () => void;
  onOpenCreateCollection?: () => void;
  onOpenNewAssemblyModal?: () => void;
  onNavigateToCalculator?: () => void;
}

export const ProductsTableModern = React.memo(function ProductsTableModern({
  rows,
  selectedIds,
  onToggleSelectAll,
  onToggleSelect,
  expandedItemIds,
  onToggleExpand,
  sortField,
  sortOrder,
  onSort,
  editingNameId,
  editingNameValue,
  setEditingNameValue,
  onSaveRename,
  onCancelRename,
  onStartRename,
  onSelectForDrawer,
  onSetStock,
  onOpenCategoryModal,
  onOpenQuickEditModal,
  onCreateOrder,
  onLoadIntoCalculator,
  onStageForAssembly,
  stagedAssemblyParts = [],
  onOpenStlModal,
  onOpenEditCollection,
  onOpenAddVariantModal,
  salesStatsMap,
  currencySymbol,
  categoriesList,
  filaments,
}: ProductsTableModernProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Конфигурация колонок таблицы CockpitTable
  const columns = useMemo<CockpitTableColumn<CatalogTableRow>[]>(() => {
    return [
      // 1. № / АРТИКУЛ
      {
        id: 'date',
        sortKey: 'date',
        header: '№ / АРТИКУЛ',
        width: '120px',
        render: (row) => {
          const isCol = row.rowKind === 'collection';
          const isAsm = row.rowKind === 'product' && row.item.type === 'assembly';
          const prefix = isCol ? '#COL-' : isAsm ? '#ASM-' : '#PRD-';
          const shortId = row.id.length > 8 ? row.id.slice(0, 6) : row.id;
          const isCopied = copiedId === row.id;

          const textColor = isCol
            ? 'text-purple-300 hover:text-purple-200'
            : isAsm
            ? 'text-cyan-300 hover:text-cyan-200'
            : 'text-white hover:text-cyan-400';

          return (
            <Tooltip content={`ID: ${row.id} (Нажмите, чтобы скопировать)`}>
              <button
                type="button"
                onClick={(e) => handleCopyId(e, row.id)}
                className={`inline-flex items-center gap-1 font-mono text-xs font-semibold ${textColor} transition-colors cursor-pointer`}
              >
                <span>{prefix}{shortId}</span>
                {isCopied ? (
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  <Copy className="w-2.5 h-2.5 opacity-20 hover:opacity-80 transition-opacity" />
                )}
              </button>
            </Tooltip>
          );
        },
      },

      // 2. КАТЕГОРИЯ
      {
        id: 'category',
        sortKey: 'category',
        header: 'КАТЕГОРИЯ',
        width: '130px',
        render: (row) => {
          const catName = row.category || 'Разное';
          const catObj = categoriesList.find((c) => c.label === catName || c.id === catName);
          const catLabel = catObj?.label || catName;
          const CatIcon = getCategoryLucideIcon(catLabel);
          const isCol = row.rowKind === 'collection';

          return (
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
          );
        },
      },

      // 3. ИЗДЕЛИЕ / ДЕТАЛИ
      {
        id: 'name',
        sortKey: 'name',
        header: 'ИЗДЕЛИЕ / ДЕТАЛИ',
        render: (row) => {
          const isExpanded = Boolean(expandedItemIds[row.id]);
          const isRenaming = editingNameId === row.id;

          if (isRenaming) {
            return (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveRename(row.id, editingNameValue, row.rowKind === 'collection');
                    if (e.key === 'Escape') onCancelRename();
                  }}
                  autoFocus
                  className="px-2 py-0.5 bg-neutral-900 border border-cyan-400 text-white rounded text-xs font-sans outline-none w-full max-w-sm"
                />
                <button
                  type="button"
                  onClick={() => onSaveRename(row.id, editingNameValue, row.rowKind === 'collection')}
                  className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={onCancelRename}
                  className="p-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                >
                  <X size={12} />
                </button>
              </div>
            );
          }

          if (row.rowKind === 'collection') {
            return (
              <div className="flex items-center gap-2 min-w-0 font-sans">
                <Tooltip content={isExpanded ? 'Свернуть' : 'Раскрыть варианты'}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(row.id);
                    }}
                    className={`p-1 rounded-md transition-all shrink-0 cursor-pointer ${
                      isExpanded
                        ? 'bg-purple-500 text-white'
                        : 'bg-purple-950/80 text-purple-300 border border-purple-800/40 hover:bg-purple-900/60'
                    }`}
                  >
                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                      <ChevronRight size={12} />
                    </motion.div>
                  </button>
                </Tooltip>

              <CockpitStatusPill
                label={`Коллекция (${row.childItems.length})`}
                tone="purple"
                icon={FolderPlus}
              />

              <span
                className="font-bold text-white hover:text-purple-300 transition-colors truncate text-xs sm:text-[13px] cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename(row.collection);
                }}
              >
                {row.name}
              </span>

              {row.stlCount > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 inline-flex items-center gap-1">
                  <FileCode className="w-2.5 h-2.5" />
                  <span>{row.stlCount} STL</span>
                </span>
              )}
            </div>
          );
        }

        // Single Product or Assembly
        const isAsm = row.item.type === 'assembly';
        const parts = row.item.assembly_parts || [];
        const hasStl = Boolean(row.item.stl_url || row.item.stl_file_data);
        const salesStat = salesStatsMap.get(row.id);

        return (
          <div className="flex items-center gap-2 min-w-0 font-sans">
            {isAsm && (
              <Tooltip content={isExpanded ? 'Скрыть детали' : 'Раскрыть состав'}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(row.id);
                  }}
                  className={`p-1 rounded-md transition-all shrink-0 cursor-pointer ${
                    isExpanded
                      ? 'bg-cyan-500 text-neutral-950 font-bold'
                      : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 hover:bg-cyan-900/60'
                  }`}
                >
                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                    <ChevronRight size={12} />
                  </motion.div>
                </button>
              </Tooltip>
            )}

            {isAsm && (
              <CockpitStatusPill
                label={`Сборка (${parts.length})`}
                tone="cyan"
                icon={Layers}
              />
            )}

            <span
              className="font-bold text-white group-hover:text-cyan-300 transition-colors truncate text-xs sm:text-[13px] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectForDrawer(row.item);
              }}
            >
              {row.name}
            </span>

            {/* Переименование */}
            <Tooltip content="Переименовать">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename(row.item);
                }}
                className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-neutral-400 hover:text-white transition-opacity p-0.5"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            </Tooltip>

            {/* STL */}
            {hasStl && (
              <Tooltip content="Открыть 3D STL">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenStlModal(row.item);
                  }}
                  className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 inline-flex items-center gap-1 cursor-pointer hover:bg-cyan-900/80"
                >
                  <FileCode className="w-2.5 h-2.5" />
                  <span>STL</span>
                </button>
              </Tooltip>
            )}

              {/* Хит продаж */}
              {salesStat && salesStat.soldQty > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-950/60 text-amber-400 border border-amber-800/40 inline-flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5" />
                  <span>{salesStat.soldQty} прод.</span>
                </span>
              )}
            </div>
          );
        },
      },

      // 4. СТАТУС СКЛАДА
      {
        id: 'stock',
        sortKey: 'stock',
        header: 'СТАТУС СКЛАДА',
        width: '160px',
        render: (row) => {
          if (row.rowKind === 'collection') {
            const isOut = row.totalStock === 0;
            return isOut ? (
              <CockpitStatusPill label="0 шт на складе" tone="neutral" dot={false} />
            ) : (
              <CockpitStatusPill label={`${row.totalStock} шт в наличии`} tone="purple" dot />
            );
          }

          const stock = row.item.stock_quantity || 0;
          const isOut = stock === 0;
          const isLow = stock > 0 && stock <= 2;
          const isAsm = row.item.type === 'assembly';

          return (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {isOut ? (
                <CockpitStatusPill label="Под заказ" tone="neutral" dot={false} />
              ) : isLow ? (
                <CockpitStatusPill label={`Мало (${stock} шт)`} tone="yellow" pulse />
              ) : (
                <CockpitStatusPill label={`В наличии (${stock} шт)`} tone={isAsm ? 'cyan' : 'emerald'} dot />
              )}

              {/* Кнопки регулировки остатка */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-neutral-900 border border-white/10 rounded-md p-0.5">
                <Tooltip content="Уменьшить">
                  <button
                    type="button"
                    onClick={() => onSetStock(row.item, Math.max(0, stock - 1))}
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
                    onClick={() => onSetStock(row.item, stock + 1)}
                    className="w-3.5 h-3.5 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <Plus className="w-2 h-2" />
                  </button>
                </Tooltip>
              </div>
            </div>
          );
        },
      },

      // 5. ПЛАСТИК
      {
        id: 'filament',
        sortKey: 'filament',
        header: 'ПЛАСТИК',
        width: '140px',
        render: (row) => {
          if (row.rowKind === 'collection') {
            return (
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
            );
          }

          if (row.item.type === 'assembly') {
            const parts = row.item.assembly_parts || [];
            const hw = row.item.assembly_hardware || [];
            return (
              <span className="truncate max-w-[130px] font-mono text-neutral-400">
                {parts.length} дет.{hw.length > 0 ? ` + ${hw.length} фурн.` : ''}
              </span>
            );
          }

          const filObj = filaments.find(
            (f) => f.name.toLowerCase() === (row.item.filament_name || '').toLowerCase() || f.id === row.item.filament_id
          );
          const filColor = row.item.filament_color || filObj?.color || '#888888';

          return (
            <div className="flex items-center gap-1.5 font-mono text-neutral-400">
              <span
                className="w-2 h-2 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: filColor }}
              />
              <Tooltip content={`Филамент: ${row.item.filament_name || 'Не указан'}`}>
                <span className="truncate max-w-[120px]">
                  {row.item.filament_name || '—'}
                </span>
              </Tooltip>
            </div>
          );
        },
      },

      // 6. ВЕС / ВРЕМЯ
      {
        id: 'params',
        sortKey: 'params',
        header: 'ВЕС / ВРЕМЯ',
        width: '120px',
        render: (row) => {
          if (row.rowKind === 'collection') {
            return (
              <span className="font-mono text-neutral-400">
                {row.minWeight === row.maxWeight ? `${row.minWeight}г` : `${row.minWeight}–${row.maxWeight}г`}
              </span>
            );
          }

          return (
            <span className="font-mono text-neutral-400">
              {row.weight_g || 0}г · {row.hours || 0}ч {row.minutes || 0}м
            </span>
          );
        },
      },

      // 7. СЕБЕСТОИМОСТЬ
      {
        id: 'cost',
        sortKey: 'cost',
        header: 'СЕБЕСТОИМ.',
        align: 'right',
        width: '100px',
        render: (row) => {
          if (row.rowKind === 'collection') {
            return (
              <span className="font-mono text-neutral-400">
                {row.minCost === row.maxCost
                  ? formatCurrency(row.minCost, currencySymbol)
                  : `${formatCurrency(row.minCost, currencySymbol)}–${formatCurrency(row.maxCost, currencySymbol)}`}
              </span>
            );
          }

          return (
            <span className="font-mono text-neutral-400">
              {formatCurrency(row.base_cost, currencySymbol)}
            </span>
          );
        },
      },

      // 8. ЦЕНА
      {
        id: 'price',
        sortKey: 'price',
        header: 'ЦЕНА',
        align: 'right',
        width: '110px',
        render: (row) => {
          if (row.rowKind === 'collection') {
            return (
              <span className="font-mono font-bold text-purple-300">
                {row.minPrice === row.maxPrice
                  ? formatCurrency(row.minPrice, currencySymbol)
                  : `${formatCurrency(row.minPrice, currencySymbol)}–${formatCurrency(row.maxPrice, currencySymbol)}`}
              </span>
            );
          }

          const isAsm = row.item.type === 'assembly';
          return (
            <span className={`font-mono font-bold ${isAsm ? 'text-cyan-300' : 'text-white'}`}>
              {formatCurrency(row.final_price, currencySymbol)}
            </span>
          );
        },
      },

      // 9. ПРИБЫЛЬ
      {
        id: 'profit',
        sortKey: 'profit',
        header: 'ПРИБЫЛЬ',
        align: 'right',
        width: '130px',
        render: (row) => {
          if (row.rowKind === 'collection') {
            return (
              <span className="font-mono text-emerald-400">
                +{formatCurrency(row.totalProfit, currencySymbol)}
              </span>
            );
          }

          const profit = Math.round(((row.final_price || 0) - (row.base_cost || 0)) * 100) / 100;
          const margin = row.final_price > 0 ? Math.round((profit / row.final_price) * 1000) / 10 : 0;
          const isPos = profit >= 0;

          return (
            <span className="font-mono text-emerald-400 whitespace-nowrap">
              {isPos ? '+' : ''}{formatCurrency(profit, currencySymbol)}
              <span className="text-[10px] text-neutral-500 ml-1">({margin}%)</span>
            </span>
          );
        },
      },

      // 10. ДЕЙСТВИЯ
      {
        id: 'actions',
        header: 'ДЕЙСТВИЯ',
        align: 'right',
        width: '130px',
        render: (row) => {
          if (row.rowKind === 'collection') {
            return (
              <div className="flex items-center justify-end gap-1 font-mono" onClick={(e) => e.stopPropagation()}>
                <Tooltip content="Добавить вариант товара в коллекцию">
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
              </div>
            );
          }

          const isStaged = stagedIds.includes(row.id);
          const stagedQty = stagedAssemblyParts.find((p) => (p.product_id || p.id) === row.id)?.quantity || 0;

          return (
            <div className="flex items-center justify-end gap-1 font-mono" onClick={(e) => e.stopPropagation()}>
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

              <Tooltip content={isStaged ? `В черновике сборки (${stagedQty} шт)` : 'Добавить в сборку'}>
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

              <Tooltip content="Редактировать параметры">
                <button
                  type="button"
                  onClick={() => onOpenQuickEditModal(row.item)}
                  className="p-1 rounded-md hover:bg-white/10 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              </Tooltip>
            </div>
          );
        },
      },
    ];
  }, [
    categoriesList,
    copiedId,
    expandedItemIds,
    editingNameId,
    editingNameValue,
    filaments,
    salesStatsMap,
    stagedIds,
    stagedAssemblyParts,
    currencySymbol,
    onOpenCategoryModal,
    onOpenEditCollection,
    onToggleExpand,
    onStartRename,
    onSaveRename,
    onCancelRename,
    setEditingNameValue,
    onSelectForDrawer,
    onOpenStlModal,
    onSetStock,
    onOpenAddVariantModal,
    onCreateOrder,
    onLoadIntoCalculator,
    onStageForAssembly,
    onOpenQuickEditModal,
  ]);

  // Подстроки для раскрытия коллекций и сборок
  const renderSubRow = (row: CatalogTableRow) => {
    // 1. Варианты коллекции
    if (row.rowKind === 'collection') {
      return (
        <div className="bg-neutral-950/90 border-t border-purple-500/20 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between font-mono text-xs text-purple-300 pb-1 border-b border-white/5">
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

          <div className="divide-y divide-white/5 font-mono text-xs">
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
      );
    }

    // 2. Детали сборки
    if (row.rowKind === 'product' && row.item.type === 'assembly') {
      const parts = row.item.assembly_parts || [];
      const hardware = row.item.assembly_hardware || [];

      return (
        <div className="bg-neutral-950/90 border-t border-cyan-500/20 p-3 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-white/5 text-cyan-300">
            <span className="flex items-center gap-1.5 font-bold">
              <Layers size={13} className="text-cyan-400" />
              <span>Состав 3D-сборки «{row.name}» ({parts.length} печатн. + {hardware.length} фурн.)</span>
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {parts.map((p, idx) => (
              <div key={idx} className="py-1.5 flex items-center justify-between gap-3 text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">└─</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 font-bold text-[10px]">
                    × {p.quantity} шт
                  </span>
                  <span className="font-semibold text-white">{p.name}</span>
                  <span className="text-neutral-500">· {p.filament_name || 'PLA'} ({p.weight_g}г)</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-neutral-400">себ: {formatCurrency(p.base_cost, currencySymbol)}</span>
                  <span className="font-bold text-cyan-300">{formatCurrency(p.final_price, currencySymbol)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <CockpitTable<CatalogTableRow>
      variant="embedded"
      selectable={true}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      sortField={sortField}
      sortOrder={sortOrder}
      onSort={(fieldId) => onSort(fieldId as SortField)}
      columns={columns}
      data={rows}
      keyExtractor={(row) => row.id}
      isRowExpanded={(row) => Boolean(expandedItemIds[row.id])}
      renderSubRow={renderSubRow}
      onRowClick={(row) => {
        if (row.rowKind === 'product') {
          onSelectForDrawer(row.item);
        } else {
          onToggleExpand(row.id);
        }
      }}
    />
  );
});
