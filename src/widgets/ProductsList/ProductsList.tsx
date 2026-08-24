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
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { productsTheme } from '../../shared/theme';
import { 
  getStoredCategories, 
  saveNewCategory, 
  ProductCategory, 
  getCategoryLucideIcon 
} from '../../shared/lib/categories';
import { recalculateAllProducts } from '../../features/calculate-cost/model/calculate';
import { 
  Package, 
  Layers, 
  FolderPlus, 
  RefreshCw, 
  RotateCcw, 
  Plus 
} from 'lucide-react';

import { CatalogTableRow, ProductFilter, SortField, SortOrder } from './types';
import { getWarehouseMetrics, getSalesStats, prepareDraftOrderFromProduct, round2 } from './helpers';
import { ProductsSummary } from './components/ProductsSummary';
import { ProductsFilterBar } from './components/ProductsFilterBar';
import { ProductsTableModern } from './components/ProductsTableModern';
import { ProductDrawer } from './components/ProductDrawer';

// Модальные окна
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

export function ProductsList() {
  const router = useRouter();
  const { showWarning, showSuccess } = useToast();
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
    setCalcDiscountType,
    setCalcDiscountValue,
    setCalcUrgencyType,
    setCalcUrgencyValue,
    setCalcCustomCostItems,
  } = useData();

  const currencySymbol = settings?.currency ?? '₽';
  const laborRate = settings?.labor_rate_per_hour ?? 600;

  // 1. Категории и теги
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setCategoriesList(getStoredCategories());
  }, []);

  const handleCreateCategory = (name: string, icon = 'tag') => {
    const updated = saveNewCategory(name, icon);
    setCategoriesList(updated);
    showSuccess(`Категория «${name}» создана!`, 'Категория добавлена');
  };

  const categoryFilterOptions = useMemo(() => {
    const allOpt = { value: 'all', label: 'Все категории', icon: Package };
    const catOpts = categoriesList.map((cat) => ({
      value: cat.id,
      label: cat.label,
      icon: getCategoryLucideIcon(cat.id),
      badgeStyle: cat.color || 'bg-gray-800 text-gray-300 border-gray-700',
    }));
    return [allOpt, ...catOpts];
  }, [categoriesList]);

  // 2. История заказов (для статистики продаж без мутации исторических данных)
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
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('saved_calculations_updated', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, []);

  const { map: salesStatsMap } = useMemo(() => {
    return getSalesStats(orders, savedCalculations);
  }, [orders, savedCalculations]);

  // 3. Складские метрики
  const warehouseMetrics = useMemo(() => {
    return getWarehouseMetrics(savedCalculations);
  }, [savedCalculations]);

  // 4. Фильтры и сортировка
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 5. Развернутые строки (ТОЛЬКО для коллекций и сборок)
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  const handleToggleExpand = (id: string) => {
    setExpandedItemIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 6. Выбор чекбоксами
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleToggleSelectAll = () => {
    const allIds = savedCalculations.map((c) => c.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  // 7. Стек отмены (Ctrl+Z)
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
      showWarning('Нет доступных действий для отмены', 'Отмена (Ctrl+Z)');
      return;
    }

    const previousState = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));

    try {
      await Promise.all([
        restoreAllSavedCalculations(previousState.calculations),
        restoreAllCollections(previousState.collections),
      ]);
      showSuccess('Изменения успешно отменены (Ctrl+Z)!', 'Откат назад');
    } catch (err) {
      console.error('Ошибка отката изменений:', err);
    }
  }, [historyStack, restoreAllSavedCalculations, showWarning, showSuccess]);

  // Глобальный слушатель Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // 8. Переименование на месте
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');
  const [isInlineNameShaking, setIsInlineNameShaking] = useState(false);
  const editingTargetRef = useRef<SavedCalculation | ProductCollection | null>(null);

  const handleStartRename = (target: SavedCalculation | ProductCollection) => {
    editingTargetRef.current = target;
    setEditingNameId(target.id);
    setEditingNameValue(target.name);
  };

  const handleSaveRename = async () => {
    if (!editingTargetRef.current || !editingNameValue.trim()) {
      setEditingNameId(null);
      return;
    }

    const trimmed = editingNameValue.trim();
    const target = editingTargetRef.current;

    try {
      pushHistory();
      if ('filament_name' in target || 'type' in target) {
        // Товар
        await updateSavedCalculation({
          ...(target as SavedCalculation),
          name: trimmed,
        });
      } else {
        // Коллекция
        await updateCollection({
          ...(target as ProductCollection),
          name: trimmed,
        });
        const childs = savedCalculations.filter((c) => c.collection_id === target.id);
        for (const child of childs) {
          await updateSavedCalculation({
            ...child,
            collection_name: trimmed,
          });
        }
      }
      showSuccess(`Переименовано в «${trimmed}»`, 'Готово');
    } catch (err) {
      console.error('Ошибка переименования:', err);
    } finally {
      setEditingNameId(null);
      editingTargetRef.current = null;
    }
  };

  // 9. Корректировка остатка
  const handleSetStock = async (item: SavedCalculation, newStock: number) => {
    try {
      pushHistory();
      await updateSavedCalculation({
        ...item,
        stock_quantity: Math.max(0, newStock),
      });
      showSuccess(`Остаток товара «${item.name}»: ${newStock} шт`, 'Склад обновлен');
    } catch (err) {
      console.error('Ошибка изменения остатка:', err);
    }
  };

  // 10. Переход в Заказы с предзаполнением
  const handleCreateOrder = (item: SavedCalculation) => {
    const draftData = prepareDraftOrderFromProduct(item);
    localStorage.setItem('draft_order_from_product', JSON.stringify(draftData));
    showSuccess(`Товар «${item.name}» перенесен в Заказы!`, 'Переход в Заказы');
    router.push('/orders');
  };

  // 11. Загрузка в калькулятор
  const handleLoadIntoCalculator = (calc: SavedCalculation) => {
    if (calc.filament_id && filaments.some((f) => f.id === calc.filament_id)) {
      setCalcFilamentId(calc.filament_id);
    }
    if (calc.printer_id && printers.some((p) => p.id === calc.printer_id)) {
      setCalcPrinterId(calc.printer_id);
    }
    setCalcWeight(calc.weight_g.toString());
    setCalcHours(calc.hours.toString());
    setCalcMinutes(calc.minutes.toString());
    setCalcQuantity(calc.quantity.toString());

    if (calc.labor_minutes !== undefined) setCalcLaborMinutes(calc.labor_minutes.toString());
    if (calc.labor_rate_per_hour !== undefined) setCalcLaborRate(calc.labor_rate_per_hour.toString());
    if (calc.markup_percent !== undefined) setCalcMarkup(calc.markup_percent.toString());
    if (calc.defect_percent !== undefined) setCalcDefect(calc.defect_percent.toString());
    if (calc.is_owner_labor !== undefined) setCalcIsOwnerLabor(Boolean(calc.is_owner_labor));
    if (calc.is_labor_per_unit !== undefined) setCalcIsLaborPerUnit(Boolean(calc.is_labor_per_unit));

    if (calc.discount_percent && calc.discount_percent > 0) {
      setCalcDiscountType('percent');
      setCalcDiscountValue(calc.discount_percent.toString());
    } else if (calc.discount_amount && calc.discount_amount > 0) {
      setCalcDiscountType('fixed');
      setCalcDiscountValue(calc.discount_amount.toString());
    } else {
      setCalcDiscountValue('');
    }

    if (calc.urgency_percent && calc.urgency_percent > 0) {
      setCalcUrgencyType('percent');
      setCalcUrgencyValue(calc.urgency_percent.toString());
    } else if (calc.urgency_amount && calc.urgency_amount > 0) {
      setCalcUrgencyType('fixed');
      setCalcUrgencyValue(calc.urgency_amount.toString());
    } else {
      setCalcUrgencyValue('');
    }

    if (calc.custom_cost_items && Array.isArray(calc.custom_cost_items)) {
      setCalcCustomCostItems(calc.custom_cost_items);
    } else {
      setCalcCustomCostItems([]);
    }

    router.push('/calculator');
  };

  // 12. Буфер деталей сборки
  const [stagedAssemblyParts, setStagedAssemblyParts] = useState<AssemblyPrintedPart[]>([]);

  const handleStageForAssembly = (prod: SavedCalculation) => {
    const existingIndex = stagedAssemblyParts.findIndex((p) => p.product_id === prod.id);

    if (existingIndex >= 0) {
      setStagedAssemblyParts((prev) =>
        prev.map((p, i) => (i === existingIndex ? { ...p, quantity: p.quantity + 1 } : p))
      );
      showSuccess(`Количество «${prod.name}» в сборке увеличено!`, 'Черновик сборки');
    } else {
      const newPart: AssemblyPrintedPart = {
        id: Math.random().toString(36).substring(2, 9),
        product_id: prod.id,
        name: prod.name,
        weight_g: round2(prod.weight_g),
        hours: prod.hours,
        minutes: prod.minutes,
        quantity: 1,
        filament_id: prod.filament_id,
        filament_name: prod.filament_name,
        filament_color: prod.filament_color,
        printer_id: prod.printer_id,
        printer_name: prod.printer_name,
        base_cost: round2(prod.base_cost),
        final_price: round2(prod.final_price),
        stl_url: prod.stl_url,
        stl_file_name: prod.stl_file_name,
        stl_file_data: prod.stl_file_data,
      };

      setStagedAssemblyParts((prev) => [...prev, newPart]);
      showSuccess(`Товар «${prod.name}» добавлен в черновик сборки!`, 'Добавлено');
    }
  };

  // 13. Состояния модальных окон
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

  // 14. Обработчики сохранения
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
      showSuccess(`Коллекция «${data.name}» обновлена!`, 'Сохранено');
    } else {
      const created = await addCollection({
        name: data.name,
        category: data.category,
        tags: data.tags,
        description: data.description,
      });
      colId = created.id;
      showSuccess(`Коллекция «${data.name}» создана!`, 'Создано');
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
      deleteWithProducts ? 'Коллекция и вложенные товары удалены' : 'Коллекция расформирована',
      'Удаление'
    );
  };

  const handleSaveAssembly = async (assemblyData: Partial<SavedCalculation>) => {
    pushHistory();
    if (editingAssembly) {
      await updateSavedCalculation({
        ...editingAssembly,
        ...assemblyData,
      } as SavedCalculation);
      showSuccess(`Сборка «${assemblyData.name}» обновлена!`, 'Обновлено');
    } else {
      await addSavedCalculation({
        ...assemblyData,
        created_at: new Date().toISOString(),
      } as SavedCalculation);
      showSuccess(`Сборка «${assemblyData.name}» создана!`, 'Создано');
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

    showSuccess(`Вариант «${data.name}» добавлен в коллекцию!`, 'Вариант создан');
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
        : `${ids.length} товаров перенесено в «${dest?.name}»`,
      'Группировка'
    );
    setSelectedIds([]);
  };

  const handleConfirmRecalculate = async (scope: 'selected' | 'all') => {
    setIsRecalculating(true);
    try {
      pushHistory();
      const targetIds = scope === 'selected' && selectedIds.length > 0 ? selectedIds : undefined;
      const fullyUpdated = recalculateAllProducts(savedCalculations, filaments, printers, settings, targetIds);
      await restoreAllSavedCalculations(fullyUpdated);
      const count = targetIds ? targetIds.length : fullyUpdated.length;
      showSuccess(`Себестоимость ${count} товаров успешно пересчитана!`, 'Цены обновлены');
      setIsRecalcModalOpen(false);
      setSelectedIds([]);
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
    showSuccess(`Категория товара «${item.name}» обновлена!`, 'Сохранено');
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
    showSuccess(`Товар «${updated.name}» успешно обновлен!`, 'Сохранено');
    if (activeDrawerItem?.id === updated.id) {
      setActiveDrawerItem(updated);
    }
  };

  // 15. Формирование строк таблицы с фильтрацией и сортировкой
  const tableData = useMemo<CatalogTableRow[]>(() => {
    const rows: CatalogTableRow[] = [];
    const query = searchQuery.toLowerCase().trim();

    // 1. Коллекции
    collections.forEach((col) => {
      let childs = savedCalculations.filter(
        (c) => c.collection_id === col.id || (Boolean(col.name) && Boolean(c.collection_name) && c.collection_name === col.name)
      );

      // Фильтр по типу
      if (productFilter === 'single') childs = childs.filter((c) => c.type !== 'assembly');
      if (productFilter === 'assembly') childs = childs.filter((c) => c.type === 'assembly');
      if (productFilter === 'low_stock') childs = childs.filter((c) => (c.stock_quantity || 0) <= 2);
      if (productFilter === 'bestsellers') {
        childs = childs.filter((c) => {
          const st = salesStatsMap.get(c.id);
          return st && st.soldQty > 0;
        });
      }

      // Фильтр по категории
      if (selectedCategory !== 'all' && (col.category || 'Разное') !== selectedCategory) {
        const hasMatchingChild = childs.some((c) => (c.category || 'Разное') === selectedCategory);
        if (!hasMatchingChild) return;
      }

      // Фильтр по поисковому запросу
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
          productFilter === 'bestsellers') &&
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

      rows.push(colRow);
    });

    // 2. Самостоятельные товары (не входящие в коллекции)
    if (productFilter !== 'collections') {
      const standalone = savedCalculations.filter((c) => {
        const hasColId = Boolean(c.collection_id && collections.some((col) => col.id === c.collection_id));
        const hasColName = Boolean(c.collection_name && collections.some((col) => col.name === c.collection_name));
        return !hasColId && !hasColName;
      });

      const filtered = standalone.filter((calc) => {
        if (productFilter === 'single' && calc.type === 'assembly') return false;
        if (productFilter === 'assembly' && calc.type !== 'assembly') return false;
        if (productFilter === 'low_stock' && (calc.stock_quantity || 0) > 2) return false;
        if (productFilter === 'bestsellers') {
          const st = salesStatsMap.get(calc.id);
          if (!st || st.soldQty <= 0) return false;
        }
        if (selectedCategory !== 'all' && (calc.category || 'Разное') !== selectedCategory) return false;

        if (query) {
          const matchName = calc.name.toLowerCase().includes(query);
          const matchFil = (calc.filament_name || '').toLowerCase().includes(query);
          const matchTag = (calc.tags || []).some((t) => t.toLowerCase().includes(query));
          if (!matchName && !matchFil && !matchTag) return false;
        }

        return true;
      });

      filtered.forEach((item) => {
        rows.push({
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

    // Сортировка строк (на верхнем уровне)
    rows.sort((a, b) => {
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
        cmp = a.final_price - b.final_price;
      } else if (sortField === 'cost') {
        cmp = a.base_cost - b.base_cost;
      } else if (sortField === 'stock') {
        cmp = a.stock_quantity - b.stock_quantity;
      } else if (sortField === 'params') {
        cmp = a.weight_g - b.weight_g;
      } else if (sortField === 'profit') {
        const pA = a.final_price - a.base_cost;
        const pB = b.final_price - b.base_cost;
        cmp = pA - pB;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [
    collections,
    savedCalculations,
    expandedItemIds,
    productFilter,
    selectedCategory,
    searchQuery,
    salesStatsMap,
    sortField,
    sortOrder,
  ]);

  // Счетчики для вкладок
  const counts = useMemo(() => {
    return {
      all: savedCalculations.length,
      single: savedCalculations.filter((c) => c.type !== 'assembly').length,
      assembly: savedCalculations.filter((c) => c.type === 'assembly').length,
      collections: collections.length,
      lowStock: savedCalculations.filter((c) => (c.stock_quantity || 0) <= 2).length,
      bestsellers: savedCalculations.filter((c) => (salesStatsMap.get(c.id)?.soldQty || 0) > 0).length,
      displayed: tableData.length,
    };
  }, [savedCalculations, collections, salesStatsMap, tableData.length]);

  return (
    <div className="flex flex-col gap-5">
      {/* Шапка страницы */}
      <PageHeader
        icon={Package}
        title="Каталог товаров"
        subtitle="Хранилище моделей, 3D-файлов, коллекций и составных сборок"
        accentColor={productsTheme.accentHex}
        className="p-4 sm:p-5"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Отмена последнего действия */}
            <Button
              onClick={handleUndo}
              disabled={historyStack.length === 0}
              variant="outline"
              size="md"
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 ${
                historyStack.length > 0
                  ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10 cursor-pointer shadow-sm'
                  : 'border-[#242930] text-gray-600 opacity-40 cursor-not-allowed'
              }`}
              title={historyStack.length > 0 ? 'Отменить последнее действие (Ctrl+Z)' : 'Нет действий для отмены'}
            >
              <RotateCcw className={`w-4 h-4 ${historyStack.length > 0 ? 'text-amber-400' : 'text-gray-600'}`} />
            </Button>

            {/* Пересчет цен */}
            <Button
              onClick={() => setIsRecalcModalOpen(true)}
              variant="outline"
              size="md"
              disabled={savedCalculations.length === 0 || isRecalculating}
              className={`border-amber-500/50 text-amber-300 hover:bg-amber-500/15 cursor-pointer flex items-center gap-2 transition-all shrink-0 ${
                selectedIds.length > 0 ? 'bg-amber-500/20 text-white font-bold shadow-md' : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>{selectedIds.length > 0 ? `Пересчитать (${selectedIds.length})` : 'Пересчитать цены'}</span>
            </Button>

            {/* Создать коллекцию */}
            <Button
              onClick={() => {
                setEditingCollection(null);
                setIsCollectionModalOpen(true);
              }}
              variant="outline"
              size="md"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/15 hover:border-purple-400 cursor-pointer flex items-center gap-2 transition-all shadow-sm rounded-xl font-bold"
            >
              <FolderPlus className="w-4 h-4 text-purple-400" />
              <span>+ Коллекция</span>
            </Button>

            {/* Создать сборку */}
            <Button
              onClick={() => {
                setEditingAssembly(null);
                setIsAssemblyModalOpen(true);
              }}
              variant="outline"
              size="md"
              className={`border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-400 cursor-pointer flex items-center gap-2 relative transition-all rounded-xl font-bold ${
                stagedAssemblyParts.length > 0 ? 'bg-cyan-500/20 shadow-md border-cyan-400' : ''
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>+ Сборка</span>
              {stagedAssemblyParts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-cyan-500 text-black text-xs font-mono font-extrabold shadow-sm">
                  {stagedAssemblyParts.reduce((acc, p) => acc + p.quantity, 0)}
                </span>
              )}
            </Button>
          </div>
        }
      >
        {/* KPI Сводка в шапке */}
        <div className="mt-3 pt-3 border-t border-[#242930]/80">
          <ProductsSummary
            metrics={warehouseMetrics}
            totalProductsCount={savedCalculations.length}
            currencySymbol={currencySymbol}
          />
        </div>
      </PageHeader>

      {/* Панель фильтров, поиска и категорий */}
      {(savedCalculations.length > 0 || collections.length > 0) && (
        <ProductsFilterBar
          productFilter={productFilter}
          setProductFilter={setProductFilter}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categoryFilterOptions={categoryFilterOptions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          counts={counts}
          selectedIds={selectedIds}
          totalSavedCalculationsCount={savedCalculations.length}
          onClearSelection={() => setSelectedIds([])}
          onOpenBatchMove={() => setIsBatchMoveOpen(true)}
          onOpenRecalcModal={() => setIsRecalcModalOpen(true)}
          isRecalculating={isRecalculating}
          canUndo={historyStack.length > 0}
          onUndo={handleUndo}
          onOpenBulkDelete={() => setIsBulkDeleteOpen(true)}
        />
      )}

      {/* Современная оптимизированная таблица товаров */}
      <ProductsTableModern
        rows={tableData}
        selectedIds={selectedIds}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleSelect={handleToggleSelect}
        expandedItemIds={expandedItemIds}
        onToggleExpand={handleToggleExpand}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        editingNameId={editingNameId}
        editingNameValue={editingNameValue}
        setEditingNameValue={setEditingNameValue}
        onSaveRename={handleSaveRename}
        onCancelRename={() => setEditingNameId(null)}
        isInlineNameShaking={isInlineNameShaking}
        onStartRename={handleStartRename}
        onSelectForDrawer={(item) => setActiveDrawerItem(item)}
        onSetStock={handleSetStock}
        onOpenCategoryModal={(item) => setEditingCategoryItem(item)}
        onOpenQuickEditModal={(item) => setQuickEditProductItem(item)}
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
        onOpenAddVariantModal={(col) => setActiveAddVariantCollection(col)}
        onOpenDeleteCollection={(col) => setDeletingCollection(col)}
        salesStatsMap={salesStatsMap}
        currencySymbol={currencySymbol}
        categoriesList={categoriesList}
        filaments={filaments}
        printers={printers}
        canUndo={historyStack.length > 0}
        onUndo={handleUndo}
        onOpenCreateCollection={() => {
          setEditingCollection(null);
          setIsCollectionModalOpen(true);
        }}
        onOpenNewAssemblyModal={() => {
          setEditingAssembly(null);
          setIsAssemblyModalOpen(true);
        }}
        onNavigateToCalculator={() => router.push('/calculator')}
      />

      {/* Боковая панель деталей товара (ProductDrawer) */}
      <ProductDrawer
        item={activeDrawerItem}
        onClose={() => setActiveDrawerItem(null)}
        onSetStock={handleSetStock}
        onCreateOrder={handleCreateOrder}
        onLoadIntoCalculator={handleLoadIntoCalculator}
        onOpenQuickEdit={(item) => setQuickEditProductItem(item)}
        onOpenMoveProduct={(item) => setMovingProduct(item)}
        onOpenStlModal={(item) => setEditingStlItem(item)}
        onDelete={(id, name, type) => setDeletingProductItem({ id, name, type })}
        salesStat={activeDrawerItem ? salesStatsMap.get(activeDrawerItem.id) : undefined}
        currencySymbol={currencySymbol}
        categoriesList={categoriesList}
        filaments={filaments}
        printers={printers}
        settings={settings}
      />

      {/* -------------------- МОДАЛЬНЫЕ ОКНА -------------------- */}

      {/* 1. Коллекция */}
      <CollectionModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        editingCollection={editingCollection}
        categoryOptions={categoryFilterOptions}
        savedCalculations={savedCalculations}
        currencySymbol={currencySymbol}
        onSave={handleSaveCollection}
      />

      {/* 2. Удаление коллекции */}
      <DeleteCollectionModal
        collection={deletingCollection}
        onClose={() => setDeletingCollection(null)}
        onConfirm={handleConfirmDeleteCollection}
      />

      {/* 3. Добавить вариант в коллекцию */}
      <AddVariantModal
        collection={activeAddVariantCollection}
        onClose={() => setActiveAddVariantCollection(null)}
        savedCalculations={savedCalculations}
        filaments={filaments}
        printers={printers}
        onConfirm={handleSaveAddVariant}
        onNavigateToCalculator={() => router.push('/calculator')}
      />

      {/* 4. Конструктор сборки */}
      <AssemblyModal
        isOpen={isAssemblyModalOpen}
        onClose={() => setIsAssemblyModalOpen(false)}
        editingAssembly={editingAssembly}
        stagedParts={stagedAssemblyParts}
        savedCalculations={savedCalculations}
        filaments={filaments}
        printers={printers}
        laborRate={laborRate}
        currencySymbol={currencySymbol}
        onSave={handleSaveAssembly}
      />

      {/* 5. Перемещение в коллекцию */}
      <MoveProductModal
        movingProduct={movingProduct}
        selectedIds={selectedIds}
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

      {/* 6. Пересчет цен */}
      <RecalculateModal
        isOpen={isRecalcModalOpen}
        onClose={() => setIsRecalcModalOpen(false)}
        selectedCount={selectedIds.length}
        totalCount={savedCalculations.length}
        isRecalculating={isRecalculating}
        onConfirm={handleConfirmRecalculate}
      />

      {/* 7. Редактирование STL */}
      <EditStlModal
        item={editingStlItem}
        onClose={() => setEditingStlItem(null)}
        onSave={handleSaveStl}
      />

      {/* 8. Категория и теги */}
      <CategoryModal
        item={editingCategoryItem}
        categoryOptions={categoryFilterOptions}
        onClose={() => setEditingCategoryItem(null)}
        onSave={handleSaveCategory}
        onCreateCategory={handleCreateCategory}
      />

      {/* 9. Удаление одного товара */}
      <DeleteProductModal
        item={deletingProductItem}
        onClose={() => setDeletingProductItem(null)}
        onConfirm={handleConfirmDeleteProduct}
      />

      {/* 10. Очистка каталога */}
      <ClearCatalogModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
      />

      {/* 11. Быстрое полное редактирование параметров товара */}
      <QuickEditProductModal
        item={quickEditProductItem}
        filaments={filaments}
        printers={printers}
        categoryOptions={categoryFilterOptions}
        onClose={() => setQuickEditProductItem(null)}
        onSave={handleSaveQuickEdit}
      />
    </div>
  );
}
