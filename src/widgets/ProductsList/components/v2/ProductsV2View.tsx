import React from 'react';
import { useRouter } from 'next/navigation';
import {
  CatalogTableRow,
  ProductFilter,
  StockFilter,
  SortField,
  SortOrder,
  SalesStatInfo,
  WarehouseMetrics
} from '../../types';
import {
  SavedCalculation,
  ProductCollection,
  AssemblyPrintedPart,
  Filament,
  Printer,
  Settings
} from '@/shared/types';
import { ProductCategory } from '@/shared/lib/categories';
import { ProductsV2KpiCards } from './ProductsV2KpiCards';
import { ProductsV2FilterBar } from './ProductsV2FilterBar';
import { ProductsV2Table } from './ProductsV2Table';
import { formatCurrency } from '@/shared/lib/format';
import {
  RotateCcw,
  Layers,
  FolderPlus,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calculator as CalculatorIcon,
  Package,
  HelpCircle
} from 'lucide-react';
import { CockpitButton } from '@/shared/ui/CockpitButton';
import { Tooltip } from '@/shared/ui/Tooltip';
import { usePixelCurtain } from '@/shared/ui/PixelCurtain';
import { CockpitContentTransition } from '@/shared/ui/CockpitContentTransition';
import { MotionPulse } from '@/shared/ui/MotionPrimitives';
import { motion, useReducedMotion } from 'motion/react';

const SURFACE_EASE = [0.16, 1, 0.3, 1] as const;

interface ProductsV2ViewProps {
  rows: CatalogTableRow[];
  sortedRows: CatalogTableRow[];
  visibleRows: CatalogTableRow[];
  visibleCount: number;
  totalRowsCount: number;
  onLoadMore: () => void;
  onShowAll: () => void;

  // Складские метрики KPI
  warehouseMetrics: WarehouseMetrics;
  singleCount: number;
  assemblyCount: number;
  collectionCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  stlCount: number;
  bestsellerCount: number;
  totalProductsCount: number;
  displayedProductsCount?: number;
  isFilterActive?: boolean;
  currencySymbol?: string;

  // Фильтры и поиск
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  productFilter: ProductFilter;
  setProductFilter: (filter: ProductFilter) => void;

  stockFilter: StockFilter;
  setStockFilter: (stock: StockFilter) => void;

  onlyBestsellers: boolean;
  setOnlyBestsellers: (val: boolean) => void;

  selectedCategories: string[];
  setSelectedCategories: (cats: string[]) => void;
  categoriesList: ProductCategory[];

  counts: {
    all: number;
    single: number;
    assembly: number;
    collections: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    bestsellers: number;
  };

  // Таблица и сортировка
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;

  // Раскрытие коллекций/сборок
  expandedItemIds: Record<string, boolean>;
  onToggleExpandRow: (id: string) => void;

  // Инлайн переименование
  editingNameId: string | null;
  editingNameValue: string;
  setEditingNameValue: (val: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  isInlineNameShaking?: boolean;
  onStartRename: (itemOrCol: SavedCalculation | ProductCollection) => void;

  // История действий (Undo)
  onUndo: () => void;
  canUndo: boolean;

  // Инлайн-обновление и действия
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
  onOpenCreateCollection: () => void;
  onOpenNewAssemblyModal: () => void;
  onOpenRecalcModal: () => void;
  onOpenBulkDelete: () => void;
  isRecalculating?: boolean;

  // Метаданные
  salesStatsMap: Map<string, SalesStatInfo>;
  filaments: Filament[];
  printers: Printer[];
  settings?: Settings | null;
  isOnline?: boolean;

  // Полноэкранный режим
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;

  // Контекстное меню
  contextMenu: { x: number; y: number; row: CatalogTableRow } | null;
  setContextMenu: (menu: { x: number; y: number; row: CatalogTableRow } | null) => void;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;

  // Множественный выбор строк (Multi-selection)
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  onClearSelection?: () => void;
  onBatchRecalculateSelected?: () => void;
  onBatchMoveSelected?: () => void;
  onBatchDeleteSelected?: () => void;
}

export const ProductsV2View = React.memo(function ProductsV2View({
  rows,
  sortedRows,
  visibleRows,
  visibleCount,
  totalRowsCount,
  onLoadMore,
  onShowAll,
  warehouseMetrics,
  singleCount,
  assemblyCount,
  collectionCount,
  inStockCount,
  lowStockCount,
  outOfStockCount,
  stlCount,
  bestsellerCount,
  totalProductsCount,
  displayedProductsCount,
  isFilterActive = false,
  currencySymbol = '₽',
  searchQuery,
  setSearchQuery,
  productFilter,
  setProductFilter,
  stockFilter,
  setStockFilter,
  onlyBestsellers,
  setOnlyBestsellers,
  selectedCategories,
  setSelectedCategories,
  categoriesList,
  counts,
  sortField,
  sortOrder,
  onSort,
  expandedItemIds,
  onToggleExpandRow,
  editingNameId,
  editingNameValue,
  setEditingNameValue,
  onSaveRename,
  onCancelRename,
  isInlineNameShaking,
  onStartRename,
  onUndo,
  canUndo,
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
  onOpenCreateCollection,
  onOpenNewAssemblyModal,
  onOpenRecalcModal,
  onOpenBulkDelete,
  isRecalculating = false,
  salesStatsMap,
  filaments,
  printers,
  settings,
  isOnline = false,
  isExpanded = false,
  onToggleExpand,
  contextMenu,
  setContextMenu,
  contextMenuRef,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onBatchRecalculateSelected,
  onBatchMoveSelected,
  onBatchDeleteSelected,
}: ProductsV2ViewProps) {
  const router = useRouter();
  const { navigate: curtainNavigate } = usePixelCurtain();
  const [isSideWingOpen, setIsSideWingOpen] = React.useState(true);
  const [elevatedRow, setElevatedRow] = React.useState<CatalogTableRow | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const surfaceTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: SURFACE_EASE };

  React.useEffect(() => {
    if (!elevatedRow) return;
    const exists = rows.some(
      (r) =>
        r.id === elevatedRow.id ||
        (r.rowKind === 'collection' && r.childItems?.some((c) => c.id === elevatedRow.id))
    );
    if (!exists) {
      setElevatedRow(null);
    }
  }, [elevatedRow, rows]);

  React.useEffect(() => {
    if (!elevatedRow) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setElevatedRow(null);
    };
    const handleGlobalClick = () => {
      setElevatedRow(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      window.addEventListener('click', handleGlobalClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [elevatedRow]);

  return (
    <div className={`w-full mx-auto select-none font-sans relative ${
      isExpanded ? 'max-w-none' : 'max-w-[1500px]'
    }`}>

      {/* ПЛАВАЮЩЕЕ БОКОВОЕ МЕНЮ (ФИКСИРУЕТСЯ НА ЭКРАНЕ ПРИ СКРОЛЛЕ, СКРЫВАЕТСЯ В РАЗВЕРНУТОМ РЕЖИМЕ) */}
      {!isExpanded && (
        <motion.div
          initial={false}
          animate={{
            filter: elevatedRow ? 'blur(4px)' : 'blur(0px)',
            opacity: elevatedRow ? 0.35 : 1,
          }}
          transition={surfaceTransition}
          className={`hidden xl:block absolute left-0 top-24 bottom-0 z-30 ${
            elevatedRow ? 'pointer-events-none select-none' : 'pointer-events-none'
          }`}
        >
          <div className="sticky top-28 pointer-events-auto">
            <aside
              className={`flex flex-col gap-2 rounded-l-2xl border-l border-y border-white/20 bg-neutral-900/60 backdrop-blur-2xl shadow-[-15px_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.2)] select-none overflow-hidden ${
                isSideWingOpen
                  ? 'w-[195px] -ml-[195px] p-2.5'
                  : 'w-[38px] -ml-[38px] p-1.5 cursor-pointer hover:bg-neutral-900/80 hover:border-white/35'
              }`}
              onClick={!isSideWingOpen ? () => setIsSideWingOpen(true) : undefined}
            >
              {/* Фоновый стеклянный блик */}
              <div className="absolute inset-0 rounded-l-2xl bg-gradient-to-b from-white/[0.12] via-white/[0.02] to-transparent pointer-events-none" />

              {isSideWingOpen ? (
                <>
                  {/* Шапка выдвинутого меню */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-mono text-[9px] text-neutral-400 uppercase tracking-wider relative z-10">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-300">ДЕЙСТВИЯ</span>
                      <span className="flex items-center gap-1 text-[8px] text-emerald-400 font-semibold">
                        <MotionPulse className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        READY
                      </span>
                    </div>

                    {/* Кнопка «Задвинуть» меню */}
                    <Tooltip content="Задвинуть меню (свернуть)" position="right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSideWingOpen(false);
                        }}
                        className="text-neutral-400 hover:text-white p-0.5 rounded hover:bg-white/10 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Кнопка перехода в Калькулятор (новый товар) */}
                  <div className="relative z-10">
                    <CockpitButton
                      onClick={() => router.push('/calculator')}
                      icon={CalculatorIcon}
                      isActive={true}
                      className="w-full justify-center py-2 text-xs font-bold shadow-md shadow-white/5 whitespace-nowrap"
                      title="Рассчитать и сохранить новый товар"
                    >
                      В Калькулятор
                    </CockpitButton>
                  </div>

                  {/* Кнопка создания сборки */}
                  <div className="relative z-10">
                    <CockpitButton
                      onClick={onOpenNewAssemblyModal}
                      icon={Layers}
                      className="w-full justify-center py-2 text-xs whitespace-nowrap text-cyan-300 border-cyan-500/30 hover:border-cyan-500/50 bg-cyan-950/30 hover:bg-cyan-950/60"
                      title="Создать составную 3D-сборку"
                    >
                      <span>+ Сборка</span>
                      {stagedAssemblyParts.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-400 text-neutral-950 font-mono text-[9px] font-extrabold ml-1">
                          {stagedAssemblyParts.reduce((acc, p) => acc + p.quantity, 0)}
                        </span>
                      )}
                    </CockpitButton>
                  </div>

                  {/* Кнопка создания коллекции */}
                  <div className="relative z-10">
                    <CockpitButton
                      onClick={onOpenCreateCollection}
                      icon={FolderPlus}
                      className="w-full justify-center py-2 text-xs whitespace-nowrap"
                      title="Создать коллекцию товаров"
                    >
                      + Коллекция
                    </CockpitButton>
                  </div>

                  {/* Кнопка пересчета цен */}
                  <div className="relative z-10">
                    <CockpitButton
                      onClick={onOpenRecalcModal}
                      icon={RefreshCw}
                      disabled={totalProductsCount === 0 || isRecalculating}
                      className="w-full justify-center py-2 text-xs whitespace-nowrap"
                      title="Пересчитать цены по актуальной стоимости пластика и тарифам"
                    >
                      Пересчитать цены
                    </CockpitButton>
                  </div>

                  {/* Визуальный тонкий разделитель */}
                  <div className="h-px bg-white/15 my-0.5 relative z-10" />

                  {/* Кнопка очистки каталога */}
                  <div className="relative z-10">
                    <CockpitButton
                      onClick={onOpenBulkDelete}
                      disabled={totalProductsCount === 0}
                      icon={Trash2}
                      className="w-full justify-center py-2 text-xs text-rose-400 hover:text-rose-300 border-rose-500/20 hover:border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 whitespace-nowrap"
                      title="Очистить все товары каталога"
                    >
                      Очистить каталог
                    </CockpitButton>
                  </div>
                </>
              ) : (
                /* Рукоятка задвинутого меню */
                <Tooltip content="Выдвинуть меню действий" position="left">
                  <div
                    className="flex flex-col items-center justify-center gap-2 py-2.5 w-full text-neutral-400 hover:text-white group cursor-pointer relative z-10"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 " />
                    <Plus className="w-3.5 h-3.5 text-neutral-300 group-hover:text-white" />
                    <span className="[writing-mode:vertical-lr] rotate-180 text-[8px] font-mono tracking-widest text-neutral-400 group-hover:text-cyan-300 uppercase font-bold py-1">
                      МЕНЮ
                    </span>
                  </div>
                </Tooltip>
              )}
            </aside>
          </div>
        </motion.div>
      )}

      {/* ГЛАВНОЕ ОКНО КОНСОЛИ (MERIDIAN COCKPIT CONTAINER) */}
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">

        {/* Верхняя панель окна */}
        <motion.div
          initial={false}
          animate={{
            filter: elevatedRow ? 'blur(4px)' : 'blur(0px)',
            opacity: elevatedRow ? 0.35 : 1,
          }}
          transition={surfaceTransition}
          className={`flex flex-wrap items-center justify-between border-b border-white/10 px-4 py-2.5 bg-neutral-900/60 gap-3 ${
            elevatedRow ? 'pointer-events-none select-none' : ''
          }`}
        >

          {/* Левая часть: Точки терминала + Заголовок + Бейдж Supabase Cloud */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Точки терминала */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Красная кнопка: переход на главную страницу (Hub) */}
              <Tooltip content="Закрыть каталог и перейти на главную">
                <button
                  type="button"
                  onClick={() => curtainNavigate('/')}
                  className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40 hover:bg-red-500 cursor-pointer outline-none shadow-sm shadow-red-500/30"
                />
              </Tooltip>

              {/* Желтая кнопка: свернуть в стандартный вид */}
              <Tooltip content={isExpanded ? 'Свернуть в стандартный вид' : 'Уже в стандартном виде'}>
                <button
                  type="button"
                  onClick={() => onToggleExpand?.(false)}
                  disabled={!isExpanded}
                  className={`w-3 h-3 rounded-full outline-none ${
                    isExpanded
                      ? 'bg-yellow-500/80 border border-yellow-400/40 hover:bg-yellow-400 cursor-pointer shadow-sm shadow-yellow-500/30'
                      : 'bg-[#36363c] border border-white/10 opacity-40 cursor-not-allowed '
                  }`}
                />
              </Tooltip>

              {/* Зеленая кнопка: развернуть на весь экран */}
              <Tooltip content={!isExpanded ? 'Развернуть на весь экран (детализация)' : 'Уже развернуто на полный экран'}>
                <button
                  type="button"
                  onClick={() => onToggleExpand?.(true)}
                  disabled={isExpanded}
                  className={`w-3 h-3 rounded-full outline-none ${
                    !isExpanded
                      ? 'bg-emerald-500/80 border border-emerald-400/40 hover:bg-emerald-400 cursor-pointer shadow-sm shadow-emerald-500/30'
                      : 'bg-[#36363c] border border-white/10 opacity-40 cursor-not-allowed '
                  }`}
                />
              </Tooltip>
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-white/10 font-mono text-xs text-neutral-300">
              <span className="text-white font-bold">3D-LABS</span>
              <span className="text-neutral-600">{'//'}</span>
              <span className="text-neutral-400 hidden sm:inline">ТОВАРЫ</span>

              {/* Динамический зеленый бейдж режима: FULLSCREEN / COMPACT */}
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
                <MotionPulse className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {isExpanded ? 'FULLSCREEN' : 'COMPACT'}
              </span>
            </div>
          </div>

          {/* Правая часть: Бейдж позиций и Кнопка отмены */}
          <div className="flex items-center gap-2.5 text-xs font-mono shrink-0">
            {/* Бейдж количества позиций в монохромном стиле */}
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-lg">
              <Package className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-neutral-400">Позиций:</span>
              <span className="text-white font-bold">
                {isFilterActive ? (displayedProductsCount ?? totalRowsCount) : totalProductsCount}
              </span>
              {isFilterActive && (displayedProductsCount ?? totalRowsCount) !== totalProductsCount && (
                <span className="text-neutral-500 font-normal">/{totalProductsCount}</span>
              )}
              <Tooltip
                content={
                  isFilterActive && (displayedProductsCount ?? totalRowsCount) !== totalProductsCount
                    ? `Отображается ${displayedProductsCount ?? totalRowsCount} из ${totalProductsCount} позиций с учётом активных фильтров`
                    : `Всего позиций в каталоге: ${totalProductsCount}`
                }
              >
                <HelpCircle className="w-3 h-3 text-neutral-500 hover:text-white ml-0.5 shrink-0 cursor-help" />
              </Tooltip>
            </div>

            {/* Кнопка отмены */}
            <CockpitButton
              onClick={onUndo}
              disabled={!canUndo}
              icon={RotateCcw}
              title={canUndo ? 'Отменить последнее действие (Ctrl+Z / Alt+Z)' : 'Нет действий для отмены'}
            >
              Отменить
            </CockpitButton>
          </div>

        </motion.div>

        {/* Внутреннее содержимое консоли товаров с анимацией перехода */}
        <CockpitContentTransition>
          <div className="p-3.5 sm:p-4 md:p-5 space-y-3 sm:space-y-3.5">

          {/* 1. ВЕРХНИЙ БЛОК: СТАТИСТИКА КАТАЛОГА И ДЕЙСТВИЯ */}
          <motion.div
            initial={false}
            animate={{
              filter: elevatedRow ? 'blur(4px)' : 'blur(0px)',
              opacity: elevatedRow ? 0.35 : 1,
            }}
            transition={surfaceTransition}
            className={`space-y-3 sm:space-y-3.5 ${
              elevatedRow ? 'pointer-events-none select-none' : ''
            }`}
          >
            {/* 1. РЯД ИЗ 5-ТИ КОМПАКТНЫХ KPI КАРТОЧЕК */}
            <ProductsV2KpiCards
              totalRetailValue={warehouseMetrics.totalRetailValue}
              totalCostValue={warehouseMetrics.totalCostValue}
              potentialProfit={warehouseMetrics.potentialProfit}
              profitMargin={warehouseMetrics.profitMargin}
              totalUnits={warehouseMetrics.totalUnits}
              inStockCount={inStockCount}
              lowStockCount={lowStockCount}
              outOfStockCount={outOfStockCount}
              singleCount={singleCount}
              assemblyCount={assemblyCount}
              collectionCount={collectionCount}
              stlCount={stlCount}
              bestsellerCount={bestsellerCount}
              totalProductsCount={totalProductsCount}
              currencySymbol={currencySymbol}
              isExpanded={isExpanded}
            />

            {/* 2. ОТДЕЛЬНЫЙ БЛОК ДЕЙСТВИЙ В РАЗВЁРНУТОМ РЕЖИМЕ */}
            {isExpanded && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:px-3.5 sm:py-2.5 bg-neutral-900/80 border border-white/10 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-neutral-200 font-bold uppercase tracking-wider flex items-center gap-2">
                    <MotionPulse className="w-2 h-2 rounded-full bg-emerald-400" />
                    ПАНЕЛЬ ДЕЙСТВИЙ КАТАЛОГА
                  </span>
                  <span className="text-neutral-600 hidden sm:inline">|</span>
                  <span className="text-neutral-400 text-xs font-mono hidden md:inline">
                    {selectedCategories.length === 0 || selectedCategories.includes('all') ? 'Все категории' : selectedCategories.length === 1 ? selectedCategories[0] : `Категории (${selectedCategories.length})`} ({totalProductsCount} позиций)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <CockpitButton
                    onClick={() => router.push('/calculator')}
                    icon={CalculatorIcon}
                    isActive={true}
                    className="font-bold shadow-md whitespace-nowrap py-1.5"
                    title="Перейти в Калькулятор"
                  >
                    [ + В Калькулятор ]
                  </CockpitButton>

                  <CockpitButton
                    onClick={onOpenNewAssemblyModal}
                    icon={Layers}
                    className="whitespace-nowrap py-1.5 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/50 bg-cyan-950/30"
                    title="Создать новую сборку"
                  >
                    [ + Сборка ]
                  </CockpitButton>

                  <CockpitButton
                    onClick={onOpenCreateCollection}
                    icon={FolderPlus}
                    className="whitespace-nowrap py-1.5"
                    title="Создать новую коллекцию"
                  >
                    [ + Коллекция ]
                  </CockpitButton>

                  <CockpitButton
                    onClick={onOpenRecalcModal}
                    icon={RefreshCw}
                    disabled={totalProductsCount === 0 || isRecalculating}
                    className="whitespace-nowrap py-1.5"
                    title="Пересчитать цены"
                  >
                    [ 🔄 Пересчитать ]
                  </CockpitButton>

                  <CockpitButton
                    onClick={onUndo}
                    disabled={!canUndo}
                    icon={RotateCcw}
                    className="whitespace-nowrap py-1.5"
                    title={canUndo ? 'Отменить последнее действие (Ctrl+Z)' : 'Нет действий для отмены'}
                  >
                    [ ↩ Отменить ]
                  </CockpitButton>

                  <CockpitButton
                    onClick={onOpenBulkDelete}
                    disabled={totalProductsCount === 0}
                    icon={Trash2}
                    className="text-rose-400 hover:text-rose-300 border-rose-500/20 hover:border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 whitespace-nowrap py-1.5"
                    title="Очистить весь каталог"
                  >
                    [ 🗑 Очистить каталог ]
                  </CockpitButton>
                </div>
              </div>
            )}
          </motion.div>

          {/* 2. ПАНЕЛЬ ФИЛЬТРОВ И ПОИСКА КАТАЛОГА (ЭТАЛОН MERIDIAN COCKPIT) */}
          <motion.div
            initial={false}
            animate={{
              filter: elevatedRow ? 'blur(4px)' : 'blur(0px)',
              opacity: elevatedRow ? 0.35 : 1,
            }}
            transition={surfaceTransition}
            onClick={() => {
              if (elevatedRow) setElevatedRow(null);
            }}
            className={`relative z-20 ${
              elevatedRow ? 'pointer-events-none select-none cursor-pointer' : ''
            }`}
          >
            <ProductsV2FilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              productFilter={productFilter}
              setProductFilter={setProductFilter}
              stockFilter={stockFilter}
              setStockFilter={setStockFilter}
              onlyBestsellers={onlyBestsellers}
              setOnlyBestsellers={setOnlyBestsellers}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              categoriesList={categoriesList}
              counts={counts}
              onResetFilters={() => {
                setSearchQuery('');
                setProductFilter('all');
                setStockFilter('all');
                setOnlyBestsellers(false);
                setSelectedCategories(['all']);
              }}
            />
          </motion.div>

          {/* 3. ТАБЛИЦА РЕЕСТРА ТОВАРОВ */}
          <div className={`relative ${elevatedRow ? 'z-40' : 'z-10'}`}>
            <ProductsV2Table
              rows={sortedRows}
              visibleRows={visibleRows}
              visibleCount={visibleCount}
              totalRowsCount={sortedRows.length}
              onLoadMore={onLoadMore}
              onShowAll={onShowAll}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
              searchQuery={searchQuery}
              isExpanded={isExpanded}
              expandedItemIds={expandedItemIds}
              onToggleExpand={onToggleExpandRow}
              editingNameId={editingNameId}
              editingNameValue={editingNameValue}
              setEditingNameValue={setEditingNameValue}
              onSaveRename={onSaveRename}
              onCancelRename={onCancelRename}
              isInlineNameShaking={isInlineNameShaking}
              onStartRename={onStartRename}
              onInlineUpdateProduct={onInlineUpdateProduct}
              onInlineUpdateCollection={onInlineUpdateCollection}
              onSetStock={onSetStock}
              onOpenCategoryModal={onOpenCategoryModal}
              onOpenQuickEditModal={onOpenQuickEditModal}
              onCreateOrder={onCreateOrder}
              onLoadIntoCalculator={onLoadIntoCalculator}
              onStageForAssembly={onStageForAssembly}
              stagedAssemblyParts={stagedAssemblyParts}
              onOpenMoveProduct={onOpenMoveProduct}
              onOpenStlModal={onOpenStlModal}
              onDelete={onDelete}
              onOpenEditCollection={onOpenEditCollection}
              onOpenAddVariantModal={onOpenAddVariantModal}
              onOpenDeleteCollection={onOpenDeleteCollection}
              salesStatsMap={salesStatsMap}
              currencySymbol={currencySymbol}
              categoriesList={categoriesList}
              filaments={filaments}
              printers={printers}
              settings={settings}
              contextMenu={contextMenu}
              setContextMenu={setContextMenu}
              contextMenuRef={contextMenuRef}
              elevatedRow={elevatedRow}
              setElevatedRow={setElevatedRow}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onSelectAll={onSelectAll}
              onClearSelection={onClearSelection}
              onBatchRecalculateSelected={onBatchRecalculateSelected}
              onBatchMoveSelected={onBatchMoveSelected}
              onBatchDeleteSelected={onBatchDeleteSelected}
            />
          </div>

        </div>
        </CockpitContentTransition>

        {/* 4. ПОДВАЛ КОНСОЛИ / ТЕЛЕМЕТРИЯ (STATUSBAR) */}
        <motion.div
          initial={false}
          animate={{
            filter: elevatedRow ? 'blur(4px)' : 'blur(0px)',
            opacity: elevatedRow ? 0.35 : 1,
          }}
          transition={surfaceTransition}
          className={`border-t border-white/10 px-5 py-2.5 bg-neutral-950 flex flex-wrap items-center justify-between text-[11px] font-mono text-neutral-500 gap-2 select-none ${
            elevatedRow ? 'pointer-events-none select-none' : ''
          }`}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span>DATABASE: {isOnline ? 'SUPABASE CLOUD' : 'OFFLINE'}</span>
            <span>•</span>
            <span>CACHE: LOCALSTORAGE SYNCED</span>
            <span>•</span>
            <span>ПОКАЗАНО: {visibleRows.length} ИЗ {totalRowsCount}</span>
            {isExpanded && (
              <>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">VIEW: FULLSCREEN SEPARATED</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span>СОРТИРОВКА: {sortField.toUpperCase()} ({sortOrder.toUpperCase()})</span>
            <span>•</span>
            <span>ОЦЕНКА СКЛАДА: {formatCurrency(warehouseMetrics.totalRetailValue, currencySymbol)}</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">RUNTIME READY</span>
          </div>
        </motion.div>

      </div>

    </div>
  );
});
