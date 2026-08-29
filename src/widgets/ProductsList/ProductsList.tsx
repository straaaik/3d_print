'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '../../entities/model/DataProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { 
  SavedCalculation, 
  ProductCollection, 
  AssemblyPrintedPart, 
  Order 
} from '../../shared/types';
import { getOrders, restoreAllCollections } from '../../shared/api/db';
import { 
  getStoredCategories, 
  saveNewCategory, 
  ProductCategory, 
  getCategoryLucideIcon 
} from '../../shared/lib/categories';
import { recalculateAllProducts } from '../../features/calculate-cost/model/calculate';
import { SelectOption } from '../../shared/ui/Select';
import { usePersistentState } from '../../shared/lib/usePersistentState';
import { Package } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

import { 
  CatalogTableRow, 
  ProductFilter, 
  StockFilter, 
  SortField, 
  SortOrder 
} from './types';
import { 
  getWarehouseMetrics, 
  getSalesStats, 
  prepareDraftOrderFromProduct 
} from './helpers';
import { ProductsV2View } from './components/v2/ProductsV2View';
import { ProductDrawer } from './components/ProductDrawer';

// Modals
import { CollectionModal } from './components/modals/CollectionModal';
import { DeleteCollectionModal } from './components/modals/DeleteCollectionModal';
import { AddVariantModal } from './components/modals/AddVariantModal';
import { AssemblyModal } from './components/modals/AssemblyModal';
import { MoveProductModal } from './components/modals/MoveProductModal';
import { RecalculateModal } from './components/modals/RecalculateModal';
import { EditStlModal } from './components/modals/EditStlModal';
import { CategoryModal } from './components/modals/CategoryModal';
import { DeleteProductModal } from './components/modals/DeleteProductModal';
import { ClearCatalogModal } from './components/modals/ClearCatalogModal';
import { QuickEditProductModal } from './components/modals/QuickEditProductModal';

export interface ProductsListProps {
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
}

export function ProductsList({
  isExpanded: externalIsExpanded,
  onToggleExpand: externalOnToggleExpand,
}: ProductsListProps = {}) {
  const router = useRouter();
  const { showWarning, showSuccess, showInfo } = useToast();
  const {
    isOnline,
    savedCalculations,
    collections,
    addCollection,
    updateCollection,
    deleteCollection,
    addSavedCalculation,
    updateSavedCalculation,
    deleteSavedCalculation,
    clearAllSavedCalculations,
    restoreAllSavedCalculations,
    filaments,
    printers,
    settings,
    setCalcFilamentId,
    setCalcPrinterId,
    setCalcWeight,
    setCalcHours,
    setCalcMinutes,
    setCalcQuantity,
    setCalcLaborMinutes,
    setCalcLaborRate,
    setCalcMarkup,
    setCalcDefect,
    setCalcIsOwnerLabor,
    setCalcIsLaborPerUnit,
    setCalcCustomCostItems,
  } = useData();

  const currencySymbol = settings?.currency ?? '₽';
  const laborRate = settings?.labor_rate_per_hour ?? 600;

  // 1. Полноэкранный режим
  const [internalIsExpanded, setInternalIsExpanded] = usePersistentState<boolean>('3d_products_expanded_view', false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
  const setIsExpanded = externalOnToggleExpand || setInternalIsExpanded;

  // 2. Категории
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = usePersistentState<string>('3d_products_selected_category', 'all');
  const [searchQuery, setSearchQuery] = usePersistentState<string>('3d_products_search_query', '');

  useEffect(() => {
    setCategoriesList(getStoredCategories());
  }, []);

  const handleCreateCategory = (name: string, icon = 'tag') => {
    const updated = saveNewCategory(name, icon);
    setCategoriesList(updated);
    showSuccess(`Категория «${name}» создана!`, 'Категория добавлена');
  };

  const categoryFilterOptions = useMemo<SelectOption[]>(() => {
    const allOpt: SelectOption = { value: 'all', label: 'Все категории', icon: Package };
    const catOpts: SelectOption[] = categoriesList.map((cat) => ({
      value: cat.id,
      label: cat.label,
      icon: getCategoryLucideIcon(cat.id),
      badgeStyle: cat.color || 'bg-neutral-800 text-neutral-300 border-neutral-700',
    }));
    return [allOpt, ...catOpts];
  }, [categoriesList]);

  // 3. Заказы и статистика продаж
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const loadOrdersData = async () => {
      try {
        const data = await getOrders();
        setOrders(data);
      } catch (err) {
        console.error('Ошибка загрузки заказов:', err);
      }
    };
    loadOrdersData();

    const handleRefresh = () => loadOrdersData();
    window.addEventListener('saved_calculations_updated', handleRefresh);
    window.addEventListener('orders_updated', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('saved_calculations_updated', handleRefresh);
      window.removeEventListener('orders_updated', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, []);

  const { map: salesStatsMap } = useMemo(() => {
    return getSalesStats(orders, savedCalculations);
  }, [orders, savedCalculations]);

  // 4. Складские KPI метрики
  const warehouseMetrics = useMemo(() => {
    return getWarehouseMetrics(savedCalculations);
  }, [savedCalculations]);

  // 5. Фильтры и сортировка
  const [productFilter, setProductFilter] = usePersistentState<ProductFilter>('3d_products_product_filter', 'all');
  const [stockFilter, setStockFilter] = usePersistentState<StockFilter>('3d_products_stock_filter', 'all');
  const [sortField, setSortField] = usePersistentState<SortField>('3d_products_sort_field', 'name');
  const [sortOrder, setSortOrder] = usePersistentState<SortOrder>('3d_products_sort_order', 'asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 6. Пагинация порциями (Infinite Scroll)
  const PRODUCTS_CHUNK_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState<number>(PRODUCTS_CHUNK_SIZE);

  // Сброс порции при смене фильтров
  useEffect(() => {
    setVisibleCount(PRODUCTS_CHUNK_SIZE);
  }, [searchQuery, productFilter, stockFilter, selectedCategory]);

  // 7. Раскрытие коллекций и сборок
  const [expandedItemIds, setExpandedItemIds] = usePersistentState<Record<string, boolean>>('3d_products_expanded_ids', {});

  const handleToggleExpandRow = (id: string) => {
    setExpandedItemIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 8. Стек истории для Undo (Ctrl+Z / Alt+Z)
  const [historyStack, setHistoryStack] = useState<
    Array<{ calculations: SavedCalculation[]; collections: ProductCollection[] }>
  >([]);

  const pushHistory = () => {
    setHistoryStack((prev) => [
      ...prev.slice(-25),
      { calculations: [...savedCalculations], collections: [...collections] },
    ]);
  };

  const handleUndo = useCallback(async () => {
    if (historyStack.length === 0) {
      showWarning('История изменений пуста', 'Отмена (Ctrl+Z)');
      return;
    }

    const previousState = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));

    try {
      await Promise.all([
        restoreAllSavedCalculations(previousState.calculations),
        restoreAllCollections(previousState.collections),
      ]);
      showSuccess('Действие отменено (Ctrl+Z)!', 'Откат состояния');
    } catch (err) {
      console.error('Ошибка отката:', err);
    }
  }, [historyStack, restoreAllSavedCalculations, showWarning, showSuccess]);

  // Глобальный слушатель Ctrl+Z / Alt+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.code === 'KeyZ') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey)) {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // 9. Черновик сборки (Staged assembly)
  const [stagedAssemblyParts, setStagedAssemblyParts] = usePersistentState<AssemblyPrintedPart[]>('3d_products_staged_assembly', []);

  const handleStageForAssembly = (item: SavedCalculation) => {
    const foundFilament = filaments.find((f) => f.name === item.filament_name);
    const newPart: AssemblyPrintedPart = {
      id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: item.name,
      filament_id: foundFilament?.id,
      filament_name: item.filament_name || 'PLA',
      filament_color: item.filament_color || '#3b82f6',
      printer_name: item.printer_name,
      weight_g: item.weight_g || 0,
      hours: item.hours || 0,
      minutes: item.minutes || 0,
      quantity: 1,
      base_cost: item.base_cost,
      final_price: item.final_price,
      stl_url: item.stl_url,
      stl_file_name: item.stl_file_name,
      stl_file_data: item.stl_file_data,
      product_id: item.id,
    };

    setStagedAssemblyParts((prev) => [...prev, newPart]);
    showSuccess(`«${item.name}» добавлен в черновик сборки!`, 'В сборку');
  };

  // 10. Быстрое переименование
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');
  const [isInlineNameShaking, setIsInlineNameShaking] = useState(false);

  const handleStartRename = (itemOrCol: SavedCalculation | ProductCollection) => {
    setEditingNameId(itemOrCol.id);
    setEditingNameValue(itemOrCol.name);
  };

  const handleSaveRename = async () => {
    if (!editingNameId) return;
    const trimmed = editingNameValue.trim();
    if (!trimmed) {
      setIsInlineNameShaking(true);
      setTimeout(() => setIsInlineNameShaking(false), 500);
      return;
    }

    pushHistory();
    const isCol = collections.some((c) => c.id === editingNameId);
    if (isCol) {
      const col = collections.find((c) => c.id === editingNameId)!;
      await updateCollection({ ...col, name: trimmed });
      showSuccess(`Коллекция переименована в «${trimmed}»`, 'Переименование');
    } else {
      const item = savedCalculations.find((c) => c.id === editingNameId);
      if (item) {
        await updateSavedCalculation({ ...item, name: trimmed });
        showSuccess(`Товар переименован в «${trimmed}»`, 'Переименование');
      }
    }
    setEditingNameId(null);
  };

  const handleCancelRename = () => {
    setEditingNameId(null);
  };

  // 11. Быстрое изменение остатка
  const handleSetStock = async (item: SavedCalculation, newStock: number) => {
    pushHistory();
    const val = Math.max(0, Math.round(newStock));
    await updateSavedCalculation({
      ...item,
      stock_quantity: val,
    });
  };

  // 12. Создание заказа
  const handleCreateOrder = (item: SavedCalculation) => {
    const draftOrder = prepareDraftOrderFromProduct(item);
    if (typeof window !== 'undefined') {
      localStorage.setItem('draft_order_from_product', JSON.stringify(draftOrder));
      router.push('/orders');
    }
  };

  // 13. Загрузка в Калькулятор
  const handleLoadIntoCalculator = (item: SavedCalculation) => {
    const filament = filaments.find((f) => f.id === item.filament_id) || filaments.find((f) => f.name === item.filament_name);
    const printer = printers.find((p) => p.id === item.printer_id) || printers.find((p) => p.name === item.printer_name);

    if (filament) setCalcFilamentId(filament.id);
    if (printer) setCalcPrinterId(printer.id);
    setCalcWeight(String(item.weight_g || 0));
    setCalcHours(String(item.hours || 0));
    setCalcMinutes(String(item.minutes || 0));
    setCalcQuantity(String(item.quantity || 1));
    setCalcLaborMinutes(String(item.labor_minutes || 0));
    if (item.labor_rate_per_hour) setCalcLaborRate(String(item.labor_rate_per_hour));
    if (item.markup_percent) setCalcMarkup(String(item.markup_percent));
    if (item.defect_percent) setCalcDefect(String(item.defect_percent));
    if (item.is_owner_labor !== undefined) setCalcIsOwnerLabor(item.is_owner_labor);
    if (item.is_labor_per_unit !== undefined) setCalcIsLaborPerUnit(item.is_labor_per_unit);
    if (item.custom_cost_items) setCalcCustomCostItems(item.custom_cost_items);

    showSuccess(`Параметры «${item.name}» загружены в Калькулятор!`, 'Калькулятор');
    router.push('/calculator');
  };

  // 14. Состояния модалок
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<ProductCollection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<ProductCollection | null>(null);
  const [activeAddVariantCollection, setActiveAddVariantCollection] = useState<ProductCollection | null>(null);

  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState<SavedCalculation | null>(null);

  const [movingProduct, setMovingProduct] = useState<SavedCalculation | null>(null);
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);

  const [isRecalcModalOpen, setIsRecalcModalOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const [editingStlItem, setEditingStlItem] = useState<SavedCalculation | null>(null);
  const [editingCategoryItem, setEditingCategoryItem] = useState<SavedCalculation | null>(null);
  const [deletingProductItem, setDeletingProductItem] = useState<{ id: string; name: string; type?: string } | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const [quickEditProductItem, setQuickEditProductItem] = useState<SavedCalculation | null>(null);
  const [activeDrawerItem, setActiveDrawerItem] = useState<SavedCalculation | null>(null);

  // Контекстное меню
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: CatalogTableRow } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Закрытие контекстного меню
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleClose = () => setContextMenu(null);

    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleClose);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleClose);
    };
  }, []);

  // 15. Обработчики для модалок
  const handleSaveCollection = async (data: {
    name: string;
    category: string;
    tags: string[];
    description?: string;
    productIds: string[];
  }) => {
    pushHistory();
    let colId = editingCollection?.id;

    if (editingCollection) {
      await updateCollection({
        ...editingCollection,
        name: data.name,
        category: data.category,
        tags: data.tags,
        description: data.description,
      });
      showSuccess(`Коллекция «${data.name}» обновлена!`, 'Успешно');
    } else {
      const created = await addCollection({
        name: data.name,
        category: data.category,
        tags: data.tags,
        description: data.description,
      });
      colId = created.id;
      showSuccess(`Коллекция «${data.name}» создана!`, 'Готово');
    }

    if (colId) {
      for (const item of savedCalculations) {
        const shouldBeIn = data.productIds.includes(item.id);
        const isCurrentlyIn = item.collection_id === colId;

        if (shouldBeIn && !isCurrentlyIn) {
          await updateSavedCalculation({
            ...item,
            collection_id: colId,
            collection_name: data.name,
          });
        } else if (!shouldBeIn && isCurrentlyIn) {
          await updateSavedCalculation({
            ...item,
            collection_id: undefined,
            collection_name: undefined,
          });
        }
      }
    }
  };

  const handleConfirmDeleteCollection = async (colId: string, deleteWithProducts: boolean) => {
    pushHistory();
    await deleteCollection(colId, deleteWithProducts);
    showSuccess(
      deleteWithProducts ? 'Коллекция и входящие в неё товары удалены' : 'Коллекция расформирована',
      'Удалено'
    );
  };

  const handleSaveAssembly = async (assemblyData: Partial<SavedCalculation>) => {
    pushHistory();
    if (editingAssembly) {
      await updateSavedCalculation({
        ...editingAssembly,
        ...assemblyData,
      } as SavedCalculation);
      showSuccess(`Сборка «${assemblyData.name}» обновлена!`, 'Сохранено');
    } else {
      await addSavedCalculation({
        ...assemblyData,
        created_at: new Date().toISOString(),
      } as SavedCalculation);
      showSuccess(`Сборка «${assemblyData.name}» создана!`, 'Готово');
      setStagedAssemblyParts([]);
    }
  };

  const handleSaveAddVariant = async (data: {
    name: string;
    filamentId: string;
    weightG: number;
    sourceCalculation?: SavedCalculation;
  }) => {
    if (!activeAddVariantCollection) return;
    pushHistory();

    const chosenFilament = filaments.find((f) => f.id === data.filamentId) || filaments[0];
    const source = data.sourceCalculation;

    if (source) {
      const filCost = chosenFilament
        ? (chosenFilament.price / chosenFilament.weight_g) * data.weightG
        : source.base_cost;
      const newBaseCost = Math.round(filCost * 1.3);
      const newFinalPrice = Math.round(newBaseCost * 2);
      const { id, created_at, ...restSource } = source;

      await addSavedCalculation({
        ...restSource,
        name: data.name,
        filament_id: chosenFilament?.id,
        filament_name: chosenFilament?.name || source.filament_name,
        filament_color: chosenFilament?.color || source.filament_color,
        weight_g: data.weightG,
        base_cost: newBaseCost > 0 ? newBaseCost : source.base_cost,
        final_price: newFinalPrice > 0 ? newFinalPrice : source.final_price,
        collection_id: activeAddVariantCollection.id,
        collection_name: activeAddVariantCollection.name,
      });
    } else {
      await addSavedCalculation({
        name: data.name,
        type: 'single',
        filament_id: chosenFilament?.id,
        filament_name: chosenFilament?.name || 'PLA',
        filament_color: chosenFilament?.color || '#3b82f6',
        printer_name: printers[0]?.name || '3D Принтер',
        weight_g: data.weightG,
        hours: 2,
        minutes: 0,
        quantity: 1,
        base_cost: 150,
        final_price: 450,
        category: activeAddVariantCollection.category || 'Разное',
        collection_id: activeAddVariantCollection.id,
        collection_name: activeAddVariantCollection.name,
        stock_quantity: 0,
      });
    }

    showSuccess(`Вариант «${data.name}» добавлен в коллекцию!`, 'Товар добавлен');
  };

  const handleSaveProductMoveSingle = async (prod: SavedCalculation, targetColId: string) => {
    pushHistory();
    if (targetColId === 'none') {
      await updateSavedCalculation({
        ...prod,
        collection_id: undefined,
        collection_name: undefined,
      });
      showSuccess(`Товар «${prod.name}» извлечен из коллекции`, 'Каталог');
    } else {
      const dest = collections.find((c) => c.id === targetColId);
      await updateSavedCalculation({
        ...prod,
        collection_id: targetColId,
        collection_name: dest?.name,
      });
      showSuccess(`Товар «${prod.name}» перемещен в «${dest?.name}»`, 'Коллекция');
    }
  };

  const handleSaveProductMoveBatch = async (ids: string[], targetColId: string) => {
    pushHistory();
    const dest = collections.find((c) => c.id === targetColId);
    const selectedItems = savedCalculations.filter((c) => ids.includes(c.id));

    for (const item of selectedItems) {
      if (targetColId === 'none') {
        await updateSavedCalculation({
          ...item,
          collection_id: undefined,
          collection_name: undefined,
        });
      } else {
        await updateSavedCalculation({
          ...item,
          collection_id: targetColId,
          collection_name: dest?.name,
        });
      }
    }

    showSuccess(
      targetColId === 'none'
        ? `${ids.length} товаров извлечено из коллекций`
        : `${ids.length} товаров перемещено в «${dest?.name}»`,
      'Перемещение'
    );
  };

  const handleConfirmRecalculate = async (scope: 'selected' | 'all') => {
    setIsRecalculating(true);
    try {
      pushHistory();
      const fullyUpdated = recalculateAllProducts(savedCalculations, filaments, printers, settings);
      await restoreAllSavedCalculations(fullyUpdated);
      showSuccess(`Пересчитано ${fullyUpdated.length} позиций каталога!`, 'Цены обновлены');
      setIsRecalcModalOpen(false);
    } catch (err) {
      console.error('Ошибка пересчета:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleSaveStl = async (
    item: SavedCalculation,
    stlUrl?: string,
    stlFileName?: string,
    stlFileData?: string
  ) => {
    pushHistory();
    await updateSavedCalculation({
      ...item,
      stl_url: stlUrl,
      stl_file_name: stlFileName,
      stl_file_data: stlFileData,
    });
    showSuccess('Данные 3D-модели сохранены!', '3D-Модель');
  };

  const handleSaveCategory = async (item: SavedCalculation, category: string, tags: string[]) => {
    pushHistory();
    await updateSavedCalculation({
      ...item,
      category,
      tags,
    });
    showSuccess(`Категория товара «${item.name}» обновлена!`, 'Успешно');
  };

  const handleConfirmDeleteProduct = async (id: string) => {
    pushHistory();
    await deleteSavedCalculation(id);
    showSuccess('Позиция удалена. Нажмите Ctrl+Z для отмены.', 'Удалено');
  };

  const handleConfirmBulkDelete = async () => {
    pushHistory();
    await clearAllSavedCalculations();
    showSuccess('Каталог товаров очищен. Нажмите Ctrl+Z для отмены.', 'Каталог очищен');
  };

  const handleSaveQuickEdit = async (updated: SavedCalculation) => {
    pushHistory();
    await updateSavedCalculation(updated);
    showSuccess(`Товар «${updated.name}» успешно обновлен!`, 'Успешно');
    if (activeDrawerItem?.id === updated.id) {
      setActiveDrawerItem(updated);
    }
  };

  // 16. Преобразование данных в строки таблицы (CatalogTableRow)
  const tableData = useMemo<CatalogTableRow[]>(() => {
    const rowsList: CatalogTableRow[] = [];
    const query = searchQuery.toLowerCase().trim();

    // 1. Коллекции
    collections.forEach((col) => {
      let childs = savedCalculations.filter(
        (c) => c.collection_id === col.id || (Boolean(col.name) && Boolean(c.collection_name) && c.collection_name === col.name)
      );

      if (productFilter === 'single') childs = childs.filter((c) => c.type !== 'assembly');
      if (productFilter === 'assembly') childs = childs.filter((c) => c.type === 'assembly');
      if (productFilter === 'low_stock') childs = childs.filter((c) => (c.stock_quantity || 0) <= 2 && (c.stock_quantity || 0) > 0);
      if (productFilter === 'bestsellers') {
        childs = childs.filter((c) => {
          const st = salesStatsMap.get(c.id);
          return st && st.soldQty > 0;
        });
      }

      // Фильтр по остаткам
      if (stockFilter === 'in_stock') childs = childs.filter((c) => (c.stock_quantity || 0) > 0);
      if (stockFilter === 'low_stock') childs = childs.filter((c) => (c.stock_quantity || 0) <= 2 && (c.stock_quantity || 0) > 0);
      if (stockFilter === 'out_of_stock') childs = childs.filter((c) => (c.stock_quantity || 0) === 0);

      // Фильтр по категории
      if (selectedCategory !== 'all' && (col.category || 'Разное') !== selectedCategory) {
        const hasMatchingChild = childs.some((c) => (c.category || 'Разное') === selectedCategory);
        if (!hasMatchingChild) return;
      }

      // Поиск
      if (query) {
        const matchCol =
          col.name.toLowerCase().includes(query) ||
          (col.tags || []).some((t) => t.toLowerCase().includes(query));
        const matchedChilds = childs.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            (c.filament_name || '').toLowerCase().includes(query) ||
            (c.tags || []).some((t) => t.toLowerCase().includes(query))
        );
        if (!matchCol && matchedChilds.length === 0) return;
        if (!matchCol && matchedChilds.length > 0) childs = matchedChilds;
      }

      if (
        (productFilter === 'single' ||
          productFilter === 'assembly' ||
          productFilter === 'low_stock' ||
          productFilter === 'bestsellers' ||
          stockFilter !== 'all') &&
        childs.length === 0
      ) {
        return;
      }

      const prices = childs.map((c) => c.final_price || c.base_cost || 0);
      const costs = childs.map((c) => c.base_cost || 0);
      const weights = childs.map((c) => c.weight_g || 0);
      const minutesTotal = childs.map((c) => (c.hours || 0) * 60 + (c.minutes || 0));

      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const minCost = costs.length > 0 ? Math.min(...costs) : 0;
      const maxCost = costs.length > 0 ? Math.max(...costs) : 0;

      const minWeight = weights.length > 0 ? Math.min(...weights) : 0;
      const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;

      const minTimeMins = minutesTotal.length > 0 ? Math.min(...minutesTotal) : 0;
      const maxTimeMins = minutesTotal.length > 0 ? Math.max(...minutesTotal) : 0;

      const totalStock = childs.reduce((sum, c) => sum + (c.stock_quantity || 0), 0);
      const totalProfit = childs.reduce(
        (sum, c) => sum + ((c.final_price || 0) - (c.base_cost || 0)) * (c.stock_quantity || 1),
        0
      );

      const matNames = Array.from(new Set(childs.map((c) => c.filament_name).filter(Boolean)));
      const matColors = Array.from(
        new Set(childs.map((c) => c.filament_color).filter(Boolean))
      ) as string[];
      const stlCount = childs.filter((c) => c.stl_url || c.stl_file_data).length;

      const colRow: CatalogTableRow = {
        rowKind: 'collection',
        id: col.id,
        collection: col,
        childItems: childs,
        name: col.name,
        category: col.category || 'Разное',
        tags: col.tags || [],
        itemsCount: childs.length,
        singleCount: childs.filter((c) => c.type !== 'assembly').length,
        assemblyCount: childs.filter((c) => c.type === 'assembly').length,
        totalStock,
        minPrice,
        maxPrice,
        minCost,
        maxCost,
        totalProfit,
        materialsList: matNames,
        materialsColors: matColors,
        minWeight,
        maxWeight,
        minHours: Math.floor(minTimeMins / 60),
        maxHours: Math.floor(maxTimeMins / 60),
        minMins: minTimeMins % 60,
        maxMins: maxTimeMins % 60,
        stlCount,
        final_price: minPrice,
        base_cost: minCost,
        stock_quantity: totalStock,
        weight_g: minWeight,
        hours: Math.floor(minTimeMins / 60),
        minutes: minTimeMins % 60,
        created_at: col.created_at,
      };

      rowsList.push(colRow);
    });

    // 2. Одиночные товары и сборки
    if (productFilter !== 'collections') {
      const standalone = savedCalculations.filter((c) => {
        const hasColId = Boolean(c.collection_id && collections.some((col) => col.id === c.collection_id));
        const hasColName = Boolean(c.collection_name && collections.some((col) => col.name === c.collection_name));
        return !hasColId && !hasColName;
      });

      const filtered = standalone.filter((calc) => {
        if (productFilter === 'single' && calc.type === 'assembly') return false;
        if (productFilter === 'assembly' && calc.type !== 'assembly') return false;
        if (productFilter === 'low_stock' && ((calc.stock_quantity || 0) > 2 || (calc.stock_quantity || 0) === 0)) return false;
        if (productFilter === 'bestsellers') {
          const st = salesStatsMap.get(calc.id);
          if (!st || st.soldQty <= 0) return false;
        }

        // Фильтр остатков
        if (stockFilter === 'in_stock' && (calc.stock_quantity || 0) <= 0) return false;
        if (stockFilter === 'low_stock' && ((calc.stock_quantity || 0) > 2 || (calc.stock_quantity || 0) === 0)) return false;
        if (stockFilter === 'out_of_stock' && (calc.stock_quantity || 0) > 0) return false;

        // Категория
        if (selectedCategory !== 'all' && (calc.category || 'Разное') !== selectedCategory) return false;

        // Поиск
        if (query) {
          const matchName = calc.name.toLowerCase().includes(query);
          const matchFil = (calc.filament_name || '').toLowerCase().includes(query);
          const matchTag = (calc.tags || []).some((t) => t.toLowerCase().includes(query));
          if (!matchName && !matchFil && !matchTag) return false;
        }

        return true;
      });

      filtered.forEach((item) => {
        rowsList.push({
          rowKind: 'product',
          id: item.id,
          item,
          name: item.name,
          category: item.category || 'Разное',
          final_price: item.final_price,
          base_cost: item.base_cost,
          stock_quantity: item.stock_quantity || 0,
          weight_g: item.weight_g,
          hours: item.hours,
          minutes: item.minutes,
          created_at: item.created_at,
        });
      });
    }

    return rowsList;
  }, [
    collections,
    savedCalculations,
    productFilter,
    stockFilter,
    selectedCategory,
    searchQuery,
    salesStatsMap,
  ]);

  // Сортировка
  const sortedRows = useMemo(() => {
    return [...tableData].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name, 'ru');
      } else if (sortField === 'date') {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        cmp = timeA - timeB;
      } else if (sortField === 'id') {
        cmp = a.id.localeCompare(b.id);
      } else if (sortField === 'price') {
        cmp = (a.final_price || 0) - (b.final_price || 0);
      } else if (sortField === 'cost') {
        cmp = (a.base_cost || 0) - (b.base_cost || 0);
      } else if (sortField === 'stock') {
        cmp = (a.stock_quantity || 0) - (b.stock_quantity || 0);
      } else if (sortField === 'params') {
        cmp = (a.weight_g || 0) - (b.weight_g || 0);
      } else if (sortField === 'profit') {
        const pA = (a.final_price || 0) - (a.base_cost || 0);
        const pB = (b.final_price || 0) - (b.base_cost || 0);
        cmp = pA - pB;
      } else if (sortField === 'sales') {
        const sA = a.rowKind === 'product' ? (salesStatsMap.get(a.id)?.soldQty || 0) : 0;
        const sB = b.rowKind === 'product' ? (salesStatsMap.get(b.id)?.soldQty || 0) : 0;
        cmp = sA - sB;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [tableData, sortField, sortOrder, salesStatsMap]);

  const visibleRows = useMemo(() => {
    return sortedRows.slice(0, visibleCount);
  }, [sortedRows, visibleCount]);

  // Счетчики для табов
  const counts = useMemo(() => {
    return {
      all: savedCalculations.length,
      single: savedCalculations.filter((c) => c.type !== 'assembly').length,
      assembly: savedCalculations.filter((c) => c.type === 'assembly').length,
      collections: collections.length,
      inStock: savedCalculations.filter((c) => (c.stock_quantity || 0) > 0).length,
      lowStock: savedCalculations.filter((c) => (c.stock_quantity || 0) <= 2 && (c.stock_quantity || 0) > 0).length,
      bestsellers: savedCalculations.filter((c) => (salesStatsMap.get(c.id)?.soldQty || 0) > 0).length,
    };
  }, [savedCalculations, collections, salesStatsMap]);

  return (
    <div className="space-y-4">
      {/* ГЛАВНАЯ КОНСОЛЬ ТОВАРОВ V2 */}
      <ProductsV2View
        rows={tableData}
        sortedRows={sortedRows}
        visibleRows={visibleRows}
        visibleCount={visibleCount}
        totalRowsCount={sortedRows.length}
        onLoadMore={() => setVisibleCount((prev) => Math.min(prev + PRODUCTS_CHUNK_SIZE, sortedRows.length))}
        onShowAll={() => setVisibleCount(sortedRows.length)}
        warehouseMetrics={warehouseMetrics}
        singleCount={counts.single}
        assemblyCount={counts.assembly}
        collectionCount={counts.collections}
        inStockCount={counts.inStock}
        lowStockCount={counts.lowStock}
        outOfStockCount={savedCalculations.filter((c) => (c.stock_quantity || 0) === 0).length}
        stlCount={savedCalculations.filter((c) => c.stl_url || c.stl_file_data).length}
        bestsellerCount={counts.bestsellers}
        totalProductsCount={savedCalculations.length}
        currencySymbol={currencySymbol}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        productFilter={productFilter}
        setProductFilter={setProductFilter}
        stockFilter={stockFilter}
        setStockFilter={setStockFilter}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categoriesList={categoriesList}
        counts={counts}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        expandedItemIds={expandedItemIds}
        onToggleExpandRow={handleToggleExpandRow}
        editingNameId={editingNameId}
        editingNameValue={editingNameValue}
        setEditingNameValue={setEditingNameValue}
        onSaveRename={handleSaveRename}
        onCancelRename={handleCancelRename}
        isInlineNameShaking={isInlineNameShaking}
        onStartRename={handleStartRename}
        onUndo={handleUndo}
        canUndo={historyStack.length > 0}
        onSelectForDrawer={(item) => setActiveDrawerItem(item)}
        onSetStock={handleSetStock}
        onOpenCategoryModal={(item) => setEditingCategoryItem(item)}
        onOpenQuickEditModal={(item) => {
          if (item.type === 'assembly') {
            setEditingAssembly(item);
            setIsAssemblyModalOpen(true);
          } else {
            setQuickEditProductItem(item);
          }
        }}
        onCreateOrder={handleCreateOrder}
        onLoadIntoCalculator={handleLoadIntoCalculator}
        onStageForAssembly={handleStageForAssembly}
        stagedAssemblyParts={stagedAssemblyParts}
        onOpenMoveProduct={(item) => setMovingProduct(item)}
        onOpenStlModal={(item) => setEditingStlItem(item)}
        onDelete={(id, name, type) => setDeletingProductItem({ id, name, type })}
        onOpenEditCollection={(col) => {
          setEditingCollection(col);
          setIsCollectionModalOpen(true);
        }}
        onOpenAddVariantModal={(col) => {
          setActiveAddVariantCollection(col);
        }}
        onOpenDeleteCollection={(col) => {
          setDeletingCollection(col);
        }}
        onOpenCreateCollection={() => {
          setEditingCollection(null);
          setIsCollectionModalOpen(true);
        }}
        onOpenNewAssemblyModal={() => {
          setEditingAssembly(null);
          setIsAssemblyModalOpen(true);
        }}
        onOpenRecalcModal={() => setIsRecalcModalOpen(true)}
        onOpenBulkDelete={() => setIsBulkDeleteOpen(true)}
        isRecalculating={isRecalculating}
        salesStatsMap={salesStatsMap}
        filaments={filaments}
        printers={printers}
        isOnline={isOnline}
        isExpanded={isExpanded}
        onToggleExpand={setIsExpanded}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        contextMenuRef={contextMenuRef}
      />

      {/* Slide-Over Detail Drawer */}
      <AnimatePresence>
        {activeDrawerItem && (
          <ProductDrawer
            item={activeDrawerItem}
            onClose={() => setActiveDrawerItem(null)}
            onSetStock={handleSetStock}
            onCreateOrder={handleCreateOrder}
            onLoadIntoCalculator={handleLoadIntoCalculator}
            onOpenQuickEdit={(item) => {
              if (item.type === 'assembly') {
                setEditingAssembly(item);
                setIsAssemblyModalOpen(true);
              } else {
                setQuickEditProductItem(item);
              }
            }}
            onOpenMoveProduct={(item) => setMovingProduct(item)}
            onOpenStlModal={(item) => setEditingStlItem(item)}
            onDelete={(id, name, type) => setDeletingProductItem({ id, name, type })}
            salesStat={salesStatsMap.get(activeDrawerItem.id)}
            currencySymbol={currencySymbol}
            categoriesList={categoriesList}
            filaments={filaments}
            printers={printers}
            settings={settings}
          />
        )}
      </AnimatePresence>

      {/* Модальные окна */}
      {isCollectionModalOpen && (
        <CollectionModal
          isOpen={isCollectionModalOpen}
          onClose={() => {
            setIsCollectionModalOpen(false);
            setEditingCollection(null);
          }}
          editingCollection={editingCollection}
          categoryOptions={categoryFilterOptions}
          savedCalculations={savedCalculations}
          currencySymbol={currencySymbol}
          onSave={handleSaveCollection}
        />
      )}

      {deletingCollection && (
        <DeleteCollectionModal
          collection={deletingCollection}
          onClose={() => setDeletingCollection(null)}
          onConfirm={handleConfirmDeleteCollection}
        />
      )}

      {activeAddVariantCollection && (
        <AddVariantModal
          collection={activeAddVariantCollection}
          onClose={() => setActiveAddVariantCollection(null)}
          savedCalculations={savedCalculations}
          filaments={filaments}
          printers={printers}
          onConfirm={handleSaveAddVariant}
          onNavigateToCalculator={() => router.push('/calculator')}
        />
      )}

      {isAssemblyModalOpen && (
        <AssemblyModal
          isOpen={isAssemblyModalOpen}
          onClose={() => {
            setIsAssemblyModalOpen(false);
            setEditingAssembly(null);
          }}
          editingAssembly={editingAssembly}
          stagedParts={editingAssembly ? [] : stagedAssemblyParts}
          savedCalculations={savedCalculations}
          filaments={filaments}
          printers={printers}
          laborRate={laborRate}
          currencySymbol={currencySymbol}
          onSave={handleSaveAssembly}
        />
      )}

      {(movingProduct || isBatchMoveOpen) && (
        <MoveProductModal
          movingProduct={movingProduct}
          selectedIds={[]}
          isBatchMoveOpen={isBatchMoveOpen}
          collections={collections}
          savedCalculations={savedCalculations}
          onClose={() => {
            setMovingProduct(null);
            setIsBatchMoveOpen(false);
          }}
          onSaveSingle={handleSaveProductMoveSingle}
          onSaveBatch={handleSaveProductMoveBatch}
        />
      )}

      {isRecalcModalOpen && (
        <RecalculateModal
          isOpen={isRecalcModalOpen}
          onClose={() => setIsRecalcModalOpen(false)}
          selectedCount={savedCalculations.length}
          totalCount={savedCalculations.length}
          isRecalculating={isRecalculating}
          onConfirm={handleConfirmRecalculate}
        />
      )}

      {editingStlItem && (
        <EditStlModal
          item={editingStlItem}
          onClose={() => setEditingStlItem(null)}
          onSave={handleSaveStl}
        />
      )}

      {editingCategoryItem && (
        <CategoryModal
          item={editingCategoryItem}
          categoryOptions={categoryFilterOptions}
          onClose={() => setEditingCategoryItem(null)}
          onSave={handleSaveCategory}
          onCreateCategory={handleCreateCategory}
        />
      )}

      {deletingProductItem && (
        <DeleteProductModal
          item={deletingProductItem}
          onClose={() => setDeletingProductItem(null)}
          onConfirm={handleConfirmDeleteProduct}
        />
      )}

      {isBulkDeleteOpen && (
        <ClearCatalogModal
          isOpen={isBulkDeleteOpen}
          onClose={() => setIsBulkDeleteOpen(false)}
          onConfirm={handleConfirmBulkDelete}
        />
      )}

      {quickEditProductItem && (
        <QuickEditProductModal
          item={quickEditProductItem}
          filaments={filaments}
          printers={printers}
          categoryOptions={categoryFilterOptions}
          onClose={() => setQuickEditProductItem(null)}
          onSave={handleSaveQuickEdit}
        />
      )}
    </div>
  );
}
