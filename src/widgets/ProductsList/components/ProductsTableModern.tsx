import React, { useState, useEffect, useRef } from 'react';
import { CatalogTableRow, SortField, SortOrder, SalesStatInfo } from '../types';
import { SavedCalculation, ProductCollection, Filament, Printer } from '../../../shared/types';
import { ProductCategory } from '../../../shared/lib/categories';
import { CollectionRow } from './CollectionRow';
import { AssemblyRow } from './AssemblyRow';
import { ProductRow } from './ProductRow';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { 
  ChevronUp, 
  ChevronDown, 
  Package, 
  Layers, 
  Plus, 
  RotateCcw, 
  Calculator as CalculatorIcon,
  ShoppingCart,
  Play,
  Edit2,
  FolderPlus,
  Copy,
  Trash2,
  Tag
} from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Редактирование имени
  editingNameId: string | null;
  editingNameValue: string;
  setEditingNameValue: (val: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  isInlineNameShaking: boolean;
  onStartRename: (itemOrCol: SavedCalculation | ProductCollection) => void;

  // Действия над товарами
  onSelectForDrawer: (item: SavedCalculation) => void;
  onSetStock: (item: SavedCalculation, newStock: number) => void;
  onOpenCategoryModal: (item: SavedCalculation) => void;
  onOpenQuickEditModal: (item: SavedCalculation) => void;
  onCreateOrder: (item: SavedCalculation) => void;
  onLoadIntoCalculator: (item: SavedCalculation) => void;
  onStageForAssembly: (item: SavedCalculation) => void;
  stagedAssemblyParts: any[];
  onOpenMoveProduct: (item: SavedCalculation) => void;
  onOpenStlModal: (item: SavedCalculation) => void;
  onDelete: (id: string, name: string, type?: string) => void;

  // Действия над коллекциями
  onOpenEditCollection: (col: ProductCollection) => void;
  onOpenAddVariantModal: (col: ProductCollection) => void;
  onOpenDeleteCollection: (col: ProductCollection) => void;

  // Справочники
  salesStatsMap: Map<string, SalesStatInfo>;
  currencySymbol: string;
  categoriesList: ProductCategory[];
  filaments: Filament[];
  printers: Printer[];

  // Пустое состояние
  canUndo: boolean;
  onUndo: () => void;
  onOpenCreateCollection: () => void;
  onOpenNewAssemblyModal: () => void;
  onNavigateToCalculator: () => void;
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
  isInlineNameShaking,
  onStartRename,
  onSelectForDrawer,
  onSetStock,
  onOpenCategoryModal,
  onOpenQuickEditModal,
  onCreateOrder,
  onLoadIntoCalculator,
  onStageForAssembly,
  stagedAssemblyParts,
  onOpenMoveProduct,
  onOpenStlModal,
  onDelete,
  onOpenEditCollection,
  onOpenAddVariantModal,
  onOpenDeleteCollection,
  salesStatsMap,
  currencySymbol,
  categoriesList,
  filaments,
  printers,
  canUndo,
  onUndo,
  onOpenCreateCollection,
  onOpenNewAssemblyModal,
  onNavigateToCalculator,
}: ProductsTableModernProps) {
  const [visibleCount, setVisibleCount] = useState(30);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Контекстное меню
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'product' | 'assembly' | 'collection';
    item?: SavedCalculation;
    collection?: ProductCollection;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleScroll = () => setContextMenu(null);

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const handleRowContextMenu = (
    e: React.MouseEvent,
    type: 'product' | 'assembly' | 'collection',
    item?: SavedCalculation,
    collection?: ProductCollection
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 240);
    const y = Math.min(e.clientY, window.innerHeight - 340);
    setContextMenu({ x, y, type, item, collection });
  };

  // Автоподгрузка строк при скролле
  useEffect(() => {
    if (visibleCount >= rows.length) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 30, rows.length));
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, rows.length]);

  const isAllSelected = rows.length > 0 && selectedIds.length >= rows.length;
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const renderSortIndicator = (field: SortField) => {
    const isActive = sortField === field;
    return (
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 shrink-0">
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#FF8800]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#FF8800]" />
          )
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </span>
    );
  };

  const visibleRows = rows.slice(0, visibleCount);

  // ПУСТОЕ СОСТОЯНИЕ
  if (rows.length === 0) {
    return (
      <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-12 text-center shadow-xl space-y-5">
        <div className="w-16 h-16 bg-[#1f222a] border border-[#2d323e] rounded-2xl flex items-center justify-center mx-auto text-gray-400">
          <Package size={32} />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-white">Каталог пуст</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            По вашим фильтрам ничего не найдено или в каталоге пока нет сохраненных расчетов и товаров.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {canUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              className="border-[#242930] text-gray-300 hover:text-white"
            >
              <RotateCcw size={14} className="mr-1.5 text-amber-400" />
              Отменить удаление
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCreateCollection}
            className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
          >
            <Plus size={14} className="mr-1.5 text-purple-400" />
            Создать коллекцию
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenNewAssemblyModal}
            className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
          >
            <Layers size={14} className="mr-1.5 text-cyan-400" />
            Создать сборку
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onNavigateToCalculator}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold"
          >
            <CalculatorIcon size={14} className="mr-1.5 text-black" />
            Перейти в калькулятор
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#16181d] border border-[#242930] rounded-2xl shadow-xl overflow-hidden relative">
      <div className="overflow-x-auto w-full custom-scrollbar">
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
          <thead>
            <tr className="bg-[#0d0e12] border-b border-[#242930] text-gray-400 uppercase tracking-wider font-bold text-xs select-none">
              {/* Чекбокс выбора всех */}
              <th className="w-8 px-2 py-3 text-center">
                <div
                  className="flex items-center justify-center cursor-pointer"
                  onClick={onToggleSelectAll}
                  title={isAllSelected ? 'Снять выбор со всех' : 'Выбрать все позиции'}
                >
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={onToggleSelectAll}
                    variant="amber"
                    size="sm"
                  />
                </div>
              </th>

              {/* ID / Дата создания */}
              <th
                onClick={() => onSort('date')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors group min-w-[95px]"
              >
                <div className="flex items-center gap-1">
                  <span>ID / Дата</span>
                  {renderSortIndicator('date')}
                </div>
              </th>

              {/* Название / Категория */}
              <th
                onClick={() => onSort('name')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors group min-w-[220px]"
              >
                <div className="flex items-center gap-1">
                  <span>Наименование / Категория</span>
                  {renderSortIndicator('name')}
                </div>
              </th>

              {/* Материал */}
              <th
                onClick={() => onSort('filament')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors group min-w-[130px]"
              >
                <div className="flex items-center gap-1">
                  <span>Материал</span>
                  {renderSortIndicator('filament')}
                </div>
              </th>

              {/* Параметры печати */}
              <th
                onClick={() => onSort('params')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors group min-w-[125px]"
              >
                <div className="flex items-center gap-1">
                  <span>Параметры</span>
                  {renderSortIndicator('params')}
                </div>
              </th>

              {/* Наличие на складе */}
              <th
                onClick={() => onSort('stock')}
                className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors group min-w-[95px]"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Наличие</span>
                  {renderSortIndicator('stock')}
                </div>
              </th>

              {/* Цены */}
              <th
                onClick={() => onSort('price')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group min-w-[105px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Стоимость</span>
                  {renderSortIndicator('price')}
                </div>
              </th>

              {/* Прибыль */}
              <th
                onClick={() => onSort('profit')}
                className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors group min-w-[95px]"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Прибыль</span>
                  {renderSortIndicator('profit')}
                </div>
              </th>

              {/* 3D-Модель */}
              <th className="py-3 px-2 text-center min-w-[80px]">
                <span>3D-Модель</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row) => {
              // 1. СТРОКА КОЛЛЕКЦИИ
              if (row.rowKind === 'collection') {
                const isExpanded = Boolean(expandedItemIds[row.id]);
                const childIds = row.childItems.map((c) => c.id);
                const isCollectionMenuOpen = contextMenu?.collection?.id === row.collection.id;

                return (
                  <React.Fragment key={`col-${row.id}`}>
                    <CollectionRow
                      collection={row.collection}
                      childItems={row.childItems}
                      isExpanded={isExpanded}
                      onToggleExpand={() => onToggleExpand(row.id)}
                      selectedIds={selectedIds}
                      onToggleSelectAllChilds={() => {
                        const allChecked = childIds.length > 0 && childIds.every((id) => selectedIds.includes(id));
                        if (allChecked) {
                          childIds.forEach((id) => onToggleSelect(id));
                        } else {
                          childIds.filter((id) => !selectedIds.includes(id)).forEach((id) => onToggleSelect(id));
                        }
                      }}
                      onStartRename={() => onStartRename(row.collection)}
                      onOpenEditModal={onOpenEditCollection}
                      onOpenAddVariantModal={onOpenAddVariantModal}
                      onOpenDeleteModal={onOpenDeleteCollection}
                      currencySymbol={currencySymbol}
                      categoriesList={categoriesList}
                      onContextMenu={(e) => handleRowContextMenu(e, 'collection', undefined, row.collection)}
                      isContextMenuOpen={isCollectionMenuOpen}
                    />

                    {/* Дочерние товары коллекции — рендерятся прямо в таблице для идеального совпадения столбцов */}
                    {isExpanded && row.childItems.length === 0 && (
                      <tr key={`col-empty-${row.id}`} className="bg-[#0b0c11]">
                        <td colSpan={9} className="p-4 text-center text-xs text-gray-400 border-b border-[#242930]/80 border-l-4 border-purple-500/60">
                          <div className="flex items-center justify-center gap-3">
                            <span>В коллекции «{row.collection.name}» пока нет товаров.</span>
                            <button
                              type="button"
                              onClick={() => onOpenAddVariantModal(row.collection)}
                              className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer underline"
                            >
                              + Добавить первый вариант
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {isExpanded &&
                      row.childItems.map((child) => {
                        const isChildChecked = selectedIds.includes(child.id);
                        const childSalesStat = salesStatsMap.get(child.id);
                        const isChildMenuOpen = contextMenu?.item?.id === child.id;

                        if (child.type === 'assembly') {
                          const isChildAssemblyExpanded = Boolean(expandedItemIds[child.id]);
                          return (
                            <AssemblyRow
                              key={`child-${child.id}`}
                              item={child}
                              isExpanded={isChildAssemblyExpanded}
                              onToggleExpand={() => onToggleExpand(child.id)}
                              isChecked={isChildChecked}
                              onToggleSelect={onToggleSelect}
                              onStartRename={onStartRename}
                              onSetStock={onSetStock}
                              onOpenCategoryModal={onOpenCategoryModal}
                              onCreateOrder={onCreateOrder}
                              onEditAssembly={() => onOpenQuickEditModal(child)}
                              onOpenMoveProduct={onOpenMoveProduct}
                              onDelete={onDelete}
                              salesStat={childSalesStat}
                              currencySymbol={currencySymbol}
                              categoriesList={categoriesList}
                              isChildInCollection={true}
                              onContextMenu={(e) => handleRowContextMenu(e, 'assembly', child)}
                              isContextMenuOpen={isChildMenuOpen}
                            />
                          );
                        }

                        return (
                          <ProductRow
                            key={`child-${child.id}`}
                            item={child}
                            isChecked={isChildChecked}
                            onToggleSelect={onToggleSelect}
                            onSelectForDrawer={onSelectForDrawer}
                            onStartRename={onStartRename}
                            onSetStock={onSetStock}
                            onOpenCategoryModal={onOpenCategoryModal}
                            onOpenQuickEditModal={onOpenQuickEditModal}
                            onCreateOrder={onCreateOrder}
                            onLoadIntoCalculator={onLoadIntoCalculator}
                            onStageForAssembly={onStageForAssembly}
                            isStagedInAssembly={stagedAssemblyParts.some((p) => p.product_id === child.id)}
                            stagedQty={stagedAssemblyParts.find((p) => p.product_id === child.id)?.quantity || 0}
                            onOpenMoveProduct={onOpenMoveProduct}
                            onOpenStlModal={onOpenStlModal}
                            onDelete={onDelete}
                            salesStat={childSalesStat}
                            currencySymbol={currencySymbol}
                            categoriesList={categoriesList}
                            filaments={filaments}
                            printers={printers}
                            isChildInCollection={true}
                            onContextMenu={(e) => handleRowContextMenu(e, 'product', child)}
                            isContextMenuOpen={isChildMenuOpen}
                          />
                        );
                      })}

                    {/* Итоговая разделительная плашка закрытия коллекции */}
                    {isExpanded && row.childItems.length > 0 && (
                      <tr
                        key={`col-end-${row.id}`}
                        className="bg-gradient-to-r from-purple-500/15 via-[#130f20] to-[#0c0a14] border-b-2 border-purple-500/50 border-l-4 border-l-purple-500 select-none"
                      >
                        <td colSpan={9} className="py-2 px-4 text-xs text-purple-300 font-mono">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                              <span className="font-semibold text-purple-200">
                                Конец коллекции «{row.collection.name}»
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                                {row.childItems.length} {row.childItems.length === 1 ? 'вариант' : row.childItems.length < 5 ? 'варианта' : 'вариантов'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onOpenAddVariantModal(row.collection)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <Plus size={13} strokeWidth={2.5} />
                              <span>Добавить вариант</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }

              // 2. СТРОКА ТОВАРА (ОДИНОЧНОГО ИЛИ ВЛОЖЕННОГО В КОЛЛЕКЦИЮ)
              const isChecked = selectedIds.includes(row.id);
              const salesStat = salesStatsMap.get(row.id);
              const stagedItem = stagedAssemblyParts.find((p) => p.product_id === row.id);
              const isMenuOpen = contextMenu?.item?.id === row.item.id;

              if (row.item.type === 'assembly') {
                const isExpanded = Boolean(expandedItemIds[row.id]);
                return (
                  <AssemblyRow
                    key={`item-${row.id}`}
                    item={row.item}
                    isExpanded={isExpanded}
                    onToggleExpand={() => onToggleExpand(row.id)}
                    isChecked={isChecked}
                    onToggleSelect={onToggleSelect}
                    onStartRename={onStartRename}
                    onSetStock={onSetStock}
                    onOpenCategoryModal={onOpenCategoryModal}
                    onCreateOrder={onCreateOrder}
                    onEditAssembly={() => onOpenQuickEditModal(row.item)}
                    onOpenMoveProduct={onOpenMoveProduct}
                    onDelete={onDelete}
                    salesStat={salesStat}
                    currencySymbol={currencySymbol}
                    categoriesList={categoriesList}
                    onContextMenu={(e) => handleRowContextMenu(e, 'assembly', row.item)}
                    isContextMenuOpen={isMenuOpen}
                  />
                );
              }

              return (
                <ProductRow
                  key={`item-${row.id}`}
                  item={row.item}
                  isChecked={isChecked}
                  onToggleSelect={onToggleSelect}
                  onSelectForDrawer={onSelectForDrawer}
                  onStartRename={onStartRename}
                  onSetStock={onSetStock}
                  onOpenCategoryModal={onOpenCategoryModal}
                  onOpenQuickEditModal={onOpenQuickEditModal}
                  onCreateOrder={onCreateOrder}
                  onLoadIntoCalculator={onLoadIntoCalculator}
                  onStageForAssembly={onStageForAssembly}
                  isStagedInAssembly={Boolean(stagedItem)}
                  stagedQty={stagedItem?.quantity || 0}
                  onOpenMoveProduct={onOpenMoveProduct}
                  onOpenStlModal={onOpenStlModal}
                  onDelete={onDelete}
                  salesStat={salesStat}
                  currencySymbol={currencySymbol}
                  categoriesList={categoriesList}
                  filaments={filaments}
                  printers={printers}
                  onContextMenu={(e) => handleRowContextMenu(e, 'product', row.item)}
                  isContextMenuOpen={isMenuOpen}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Невидимый sentinel для бесконечной подгрузки */}
      <div ref={sentinelRef} className="h-4 w-full" />

      {/* Индикатор количества */}
      {visibleCount < rows.length && (
        <div className="p-3 text-center text-xs text-gray-500 border-t border-[#242930] bg-[#111318]">
          Показано {visibleCount} из {rows.length} позиций (прокрутите вниз для подгрузки)
        </div>
      )}

      {/* Контекстное меню по правому клику (как в заказах) */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className={`fixed z-50 bg-[#16181d] border rounded-2xl shadow-2xl p-1.5 min-w-[240px] select-none backdrop-blur-xl text-xs sm:text-sm ${
              contextMenu.type === 'collection'
                ? 'border-purple-500/40 shadow-purple-500/15'
                : contextMenu.type === 'assembly'
                ? 'border-cyan-500/40 shadow-cyan-500/15'
                : 'border-[#FF6B00]/40 shadow-[#FF6B00]/15'
            }`}
          >
            {/* Шапка контекстного меню */}
            <div
              className={`px-3 py-1.5 text-[11px] font-bold border-b border-[#242930] truncate flex items-center justify-between gap-2 ${
                contextMenu.type === 'collection'
                  ? 'text-purple-400'
                  : contextMenu.type === 'assembly'
                  ? 'text-cyan-400'
                  : 'text-[#FF8800]'
              }`}
            >
              <span className="truncate">
                {contextMenu.item?.name || contextMenu.collection?.name}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                  contextMenu.type === 'collection'
                    ? 'text-purple-300 bg-purple-500/20'
                    : contextMenu.type === 'assembly'
                    ? 'text-cyan-300 bg-cyan-500/20'
                    : 'text-[#FF8800] bg-[#FF6B00]/20'
                }`}
              >
                {contextMenu.type === 'collection'
                  ? `#col-${contextMenu.collection?.id ? (contextMenu.collection.id.length > 8 ? contextMenu.collection.id.slice(0, 6) : contextMenu.collection.id) : 'col'}`
                  : contextMenu.type === 'assembly'
                  ? `#asm-${contextMenu.item?.id ? (contextMenu.item.id.length > 8 ? contextMenu.item.id.slice(0, 6) : contextMenu.item.id) : 'asm'}`
                  : `#prod-${contextMenu.item?.id ? (contextMenu.item.id.length > 8 ? contextMenu.item.id.slice(0, 6) : contextMenu.item.id) : 'prod'}`}
              </span>
            </div>

            <div className="py-1 space-y-0.5">
              {/* А. Меню для Одиночного Товара */}
              {contextMenu.type === 'product' && contextMenu.item && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onCreateOrder(contextMenu.item!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-emerald-500/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <span>Создать заказ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLoadIntoCalculator(contextMenu.item!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Play className="w-4 h-4 text-amber-400" fill="currentColor" />
                    <span>Открыть в калькуляторе</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onStageForAssembly(contextMenu.item!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-cyan-500/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Добавить в сборку</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenQuickEditModal(contextMenu.item!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Edit2 className="w-4 h-4 text-amber-400" />
                    <span>Редактировать параметры...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenCategoryModal(contextMenu.item!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Tag className="w-4 h-4 text-yellow-400" />
                    <span>Изменить категорию...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenMoveProduct(contextMenu.item!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-500/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <FolderPlus className="w-4 h-4 text-purple-400" />
                    <span>Переместить в коллекцию...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (contextMenu.item?.id) {
                        navigator.clipboard.writeText(contextMenu.item.id);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span>Скопировать ID товара</span>
                  </button>

                  <div className="my-1 border-t border-[#242930]" />

                  <button
                    type="button"
                    onClick={() => {
                      onDelete(contextMenu.item!.id, contextMenu.item!.name, contextMenu.item!.type);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-300 hover:text-rose-200 hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer text-left font-semibold"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Удалить товар</span>
                  </button>
                </>
              )}

              {/* Б. Меню для Сборки */}
              {contextMenu.type === 'assembly' && contextMenu.item && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onCreateOrder(contextMenu.item!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-emerald-500/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <span>Создать заказ со сборкой</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenQuickEditModal(contextMenu.item!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-cyan-500/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Edit2 className="w-4 h-4 text-cyan-400" />
                    <span>Редактировать состав сборки...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenCategoryModal(contextMenu.item!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-cyan-500/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Tag className="w-4 h-4 text-cyan-400" />
                    <span>Изменить категорию...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenMoveProduct(contextMenu.item!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-500/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <FolderPlus className="w-4 h-4 text-purple-400" />
                    <span>Переместить в коллекцию...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (contextMenu.item?.id) {
                        navigator.clipboard.writeText(contextMenu.item.id);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-cyan-500/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Copy className="w-4 h-4 text-cyan-400" />
                    <span>Скопировать ID сборки</span>
                  </button>

                  <div className="my-1 border-t border-[#242930]" />

                  <button
                    type="button"
                    onClick={() => {
                      onDelete(contextMenu.item!.id, contextMenu.item!.name, contextMenu.item!.type);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-300 hover:text-rose-200 hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer text-left font-semibold"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Удалить сборку</span>
                  </button>
                </>
              )}

              {/* В. Меню для Коллекции */}
              {contextMenu.type === 'collection' && contextMenu.collection && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAddVariantModal(contextMenu.collection!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-500/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Plus className="w-4 h-4 text-purple-400" />
                    <span>Добавить вариант товара...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenEditCollection(contextMenu.collection!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-500/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Edit2 className="w-4 h-4 text-purple-400" />
                    <span>Параметры коллекции...</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (contextMenu.collection?.id) {
                        navigator.clipboard.writeText(contextMenu.collection.id);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-500/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Copy className="w-4 h-4 text-purple-400" />
                    <span>Скопировать ID коллекции</span>
                  </button>

                  <div className="my-1 border-t border-[#242930]" />

                  <button
                    type="button"
                    onClick={() => {
                      onOpenDeleteCollection(contextMenu.collection!);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-300 hover:text-rose-200 hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer text-left font-semibold"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Удалить коллекцию</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
