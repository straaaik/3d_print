'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '../../entities/model/DataProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { SavedCalculation, AssemblyPrintedPart, AssemblyHardwareItem } from '../../shared/types';
import { Card } from '../../shared/ui/Card';
import { Table } from '../../shared/ui/Table';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { formatCurrency, formatDate } from '../../shared/lib/format';
import { 
  Package, Play, Trash2, Calculator, FileCode, ExternalLink, Download, 
  Edit2, Upload, ChevronRight, ChevronDown, Layers, Plus, Wrench, Box, Sparkles, X, AlertTriangle, RotateCcw, Check, ShoppingCart, Tag, Folder, Search
} from 'lucide-react';
import { PageHeader } from '../../shared/ui/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';

import { getStoredCategories, saveNewCategory, ProductCategory } from '../../shared/lib/categories';

export function ProductsList() {
  const router = useRouter();
  const { showWarning, showSuccess } = useToast();
  const { 
    isOnline,
    savedCalculations, 
    addSavedCalculation,
    updateSavedCalculation,
    deleteSavedCalculation,
    clearAllSavedCalculations,
    filaments,
    printers,
    settings,
    setCalcFilamentId,
    setCalcPrinterId,
    setCalcWeight,
    setCalcHours,
    setCalcMinutes,
    setCalcQuantity,
  } = useData();

  // Категории и теги
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingCategoryItem, setEditingCategoryItem] = useState<SavedCalculation | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<string>('Разное');
  const [tagsInputDraft, setTagsInputDraft] = useState<string>('');

  // Состояние создания новой категории
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');

  useEffect(() => {
    setCategoriesList(getStoredCategories());
  }, []);

  const handleConfirmCreateCategory = () => {
    if (!newCategoryName.trim()) {
      showWarning('Введите название новой категории', 'Заполните название');
      return;
    }
    const updated = saveNewCategory(newCategoryName.trim(), newCategoryIcon);
    setCategoriesList(updated);
    setCategoryDraft(newCategoryName.trim());
    setNewCategoryName('');
    setIsCreatingCategory(false);
    showSuccess(`Новая категория «${newCategoryName.trim()}» создана!`, 'Категория добавлена');
  };

  const handleOpenCategoryEditModal = (item: SavedCalculation) => {
    setEditingCategoryItem(item);
    setCategoryDraft(item.category || 'Разное');
    setTagsInputDraft(item.tags ? item.tags.join(', ') : '');
  };

  const handleSaveCategoryAndTags = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoryItem) return;

    const parsedTags = tagsInputDraft
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    try {
      setHistoryStack(prev => [...prev, [...savedCalculations]]);
      await updateSavedCalculation({
        ...editingCategoryItem,
        category: categoryDraft,
        tags: parsedTags,
      });
      showSuccess(`Категория и теги товара «${editingCategoryItem.name}» обновлены!`, 'Категория изменена');
    } catch (err) {
      console.error('Ошибка изменения категории:', err);
    } finally {
      setEditingCategoryItem(null);
    }
  };

  const currencySymbol = settings?.currency ?? '₽';
  const laborRate = settings?.labor_rate_per_hour ?? 600;

  // Состояние развернутых строк для составных товаров
  const [expandedAssemblyIds, setExpandedAssemblyIds] = useState<Record<string, boolean>>({});

  const toggleExpandAssembly = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedAssemblyIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Состояние модального окна выбора действий (когда есть и ссылка, и файл)
  const [activeStlChoiceItem, setActiveStlChoiceItem] = useState<SavedCalculation | null>(null);

  // Состояние модального окна редактирования / управления STL у товара
  const [editingStlItem, setEditingStlItem] = useState<SavedCalculation | null>(null);
  const [editStlUrl, setEditStlUrl] = useState('');
  const [editStlFileName, setEditStlFileName] = useState('');
  const [editStlFileData, setEditStlFileData] = useState('');

  // Состояние модального окна СОЗДАНИЯ / РЕДАКТИРОВАНИЯ СБОРКИ (Составного товара)
  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
  const [editingAssemblyId, setEditingAssemblyId] = useState<string | null>(null);
  const [assemblyName, setAssemblyName] = useState('');
  const [assemblyLaborMinutes, setAssemblyLaborMinutes] = useState('15');
  const [assemblyParts, setAssemblyParts] = useState<AssemblyPrintedPart[]>([]);
  const [assemblyHardware, setAssemblyHardware] = useState<AssemblyHardwareItem[]>([]);

  // Временное состояние для выпадающего списка добавления детали из существующих товаров
  const [selectedProductId, setSelectedProductId] = useState('');

  const handleLoadCalculation = (calc: SavedCalculation) => {
    if (calc.filament_id && filaments.some(f => f.id === calc.filament_id)) {
      setCalcFilamentId(calc.filament_id);
    }
    if (calc.printer_id && printers.some(p => p.id === calc.printer_id)) {
      setCalcPrinterId(calc.printer_id);
    }
    setCalcWeight(calc.weight_g.toString());
    setCalcHours(calc.hours.toString());
    setCalcMinutes(calc.minutes.toString());
    setCalcQuantity(calc.quantity.toString());

    router.push('/calculator');
  };

  // Состояние встроенного переименования товара / сборки по клику на название
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');
  const [isInlineNameShaking, setIsInlineNameShaking] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingNameId && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingNameId]);

  const handleStartRename = (item: SavedCalculation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNameId(item.id);
    setEditingNameValue(item.name);
    setIsInlineNameShaking(false);
  };

  const handleSaveRename = async (item: SavedCalculation) => {
    if (editingNameId !== item.id) return;

    const trimmed = editingNameValue.trim();
    if (!trimmed) {
      setIsInlineNameShaking(true);
      showWarning('Наименование не может быть пустым!', 'Ошибка');
      setTimeout(() => setIsInlineNameShaking(false), 800);
      return;
    }

    if (trimmed === item.name) {
      setEditingNameId(null);
      return;
    }

    try {
      setHistoryStack(prev => [...prev, [...savedCalculations]]);
      await updateSavedCalculation({
        ...item,
        name: trimmed
      });
      showSuccess(`Наименование изменено на «${trimmed}»`, 'Переименовано');
    } catch (err) {
      console.error('Ошибка переименования:', err);
    } finally {
      setEditingNameId(null);
    }
  };

  // Корректировка остатка на складе готовой продукции через компонент NumberCounter
  const handleSetStock = async (item: SavedCalculation, newStock: number) => {
    try {
      setHistoryStack(prev => [...prev, [...savedCalculations]]);
      await updateSavedCalculation({
        ...item,
        stock_quantity: Math.max(0, newStock),
      });
      showSuccess(`Остаток товара «${item.name}»: ${newStock} шт`, 'Склад обновлен');
    } catch (err) {
      console.error('Ошибка изменения остатка:', err);
    }
  };

  // Создание заказа на основе выбранного товара / сборки (переход в Заказы с автосписанием со склада)
  const handleCreateOrderFromProduct = async (item: SavedCalculation) => {
    let amount = 0;
    let cost = 0;
    let notes = '';
    let totalPrintHours = 0;
    const currentStock = item.stock_quantity || 0;
    const orderQty = item.quantity || 1;
    const isFromStock = currentStock >= orderQty;
    const deductedQty = Math.min(currentStock, orderQty);
    const newStock = Math.max(0, currentStock - orderQty);

    // Списание количества со склада при добавлении в заказ
    try {
      setHistoryStack(prev => [...prev, [...savedCalculations]]);
      await updateSavedCalculation({
        ...item,
        stock_quantity: newStock,
      });
    } catch (err) {
      console.error('Ошибка списания со склада:', err);
    }

    if (item.type === 'assembly') {
      const parts = item.assembly_parts || [];
      const hardware = item.assembly_hardware || [];

      const partsCost = parts.reduce((acc, p) => acc + (p.final_price || 0) * (p.quantity || 1), 0);
      const hwCost = hardware.reduce((acc, h) => acc + (h.cost_per_unit || 0) * (h.quantity || 1), 0);
      const hwPrice = hardware.reduce((acc, h) => acc + (h.price_per_unit || 0) * (h.quantity || 1), 0);
      const laborCost = item.assembly_labor_cost || 0;

      // Часы печати всех деталей сборки с учетом количества каждой
      totalPrintHours = parts.reduce((acc, p) => {
        const partHours = (p.hours || 0) + ((p.minutes || 0) / 60);
        return acc + (partHours * (p.quantity || 1));
      }, 0);

      cost = Math.round((partsCost + hwCost + laborCost) * 100) / 100;
      amount = Math.round((partsCost + hwPrice + laborCost) * 100) / 100;
      notes = `Составная сборка: ${item.name} (${parts.length} дет, ${hardware.length} мет)`;
    } else {
      totalPrintHours = ((item.hours || 0) + ((item.minutes || 0) / 60)) * orderQty;
      cost = item.base_cost || 0;
      amount = item.final_price || item.base_cost || 0;
      notes = `3D Печать: ${item.name} (${item.filament_name || 'Пластик'}, ${item.weight_g || 0}г)`;
    }

    // Если всё взято из наличия на складе — печать не требуется! Срок = 0 дней (сегодня)!
    let totalAddDays = 0;
    let printDays = 0;

    if (!isFromStock) {
      printDays = totalPrintHours > 0 ? Math.ceil(totalPrintHours / 24) : 0;
      totalAddDays = 2 + printDays;
    }

    const inDays = new Date();
    inDays.setDate(inDays.getDate() + totalAddDays);
    const deadlineStr = `${String(inDays.getDate()).padStart(2, '0')}.${String(inDays.getMonth() + 1).padStart(2, '0')}.${inDays.getFullYear()}`;

    if (currentStock > 0) {
      notes += ` • 📦 Списано со склада: ${deductedQty} шт (Остаток: ${newStock} шт)`;
    }

    const draftOrderData = {
      title: item.name,
      amount,
      cost,
      deadline: deadlineStr,
      notes,
      printDays,
      totalAddDays,
      totalPrintHours: Math.round(totalPrintHours * 10) / 10,
      isFromStock,
      deductedQty,
    };

    localStorage.setItem('draft_order_from_product', JSON.stringify(draftOrderData));
    showSuccess(
      isFromStock 
        ? `Товар «${item.name}» взят из наличия (-${orderQty} шт)! Срок изготовления: СЕГОДНЯ!`
        : `Товар «${item.name}» перенесен в заказы (остаток на складе: ${newStock} шт, +${totalAddDays} дн. изготовления)!`, 
      'Переход в Заказы'
    );
    router.push('/orders');
  };

  // Стек истории изменений для отмены операций (Ctrl+Z)
  const [historyStack, setHistoryStack] = useState<SavedCalculation[][]>([]);

  const handleUndo = async () => {
    if (historyStack.length === 0) {
      showWarning('Нет доступных действий для отмены', 'Отмена (Ctrl+Z)');
      return;
    }

    const previousState = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, -1));

    try {
      await clearAllSavedCalculations();
      for (const item of previousState) {
        await addSavedCalculation(item);
      }
      showSuccess('Изменения успешно отменены (Ctrl+Z)!', 'Откат назад');
    } catch (err) {
      console.error('Ошибка при откате изменений (Ctrl+Z):', err);
    }
  };

  // Глобальный слушатель горячих клавиш Ctrl+Z / Cmd+Z
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
  }, [historyStack, savedCalculations]);

  // Состояние модального окна подтверждения удаления
  const [deletingItem, setDeletingItem] = useState<{ id: string; name: string; type?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (id: string, name: string, type?: string) => {
    setDeletingItem({ id, name, type });
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      setHistoryStack(prev => [...prev, [...savedCalculations]]);
      await deleteSavedCalculation(deletingItem.id);
      showSuccess(`Объект «${deletingItem.name}» удален. Нажмите Ctrl+Z для отмены.`, 'Удалено');
      setDeletingItem(null);
    } catch (err) {
      console.error('Ошибка при удалении объекта:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Состояние модального окна массового удаления всех товаров
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleConfirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      setHistoryStack(prev => [...prev, [...savedCalculations]]);
      await clearAllSavedCalculations();
      showSuccess('Каталог товаров очищен. Нажмите Ctrl+Z для отмены.', 'Все товары удалены');
      setIsBulkDeleteModalOpen(false);
    } catch (err) {
      console.error('Ошибка массового удаления:', err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Быстрый выбор существующих товаров для добавления в сборку
  const handleAddSelectedProductToAssembly = () => {
    if (!selectedProductId) return;
    const prod = savedCalculations.find(p => p.id === selectedProductId);
    if (!prod) return;

    const round2 = (num: number) => Math.round((num || 0) * 100) / 100;

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

    setAssemblyParts(prev => [...prev, newPart]);
    setSelectedProductId('');
  };

  // Добавление произвольной детали вручную
  const handleAddCustomPartToAssembly = () => {
    const defaultFilament = filaments[0];
    const defaultPrinter = printers[0];

    const newPart: AssemblyPrintedPart = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Деталь #${assemblyParts.length + 1}`,
      weight_g: 50,
      hours: 2,
      minutes: 0,
      quantity: 1,
      filament_id: defaultFilament?.id,
      filament_name: defaultFilament?.name || 'PLA (Стандарт)',
      filament_color: defaultFilament?.color || '#3b82f6',
      printer_id: defaultPrinter?.id,
      printer_name: defaultPrinter?.name || '3D Принтер',
      base_cost: 120,
      final_price: 250,
    };

    setAssemblyParts(prev => [...prev, newPart]);
  };

  // Добавление покупной фурнитуры / метизов
  const handleAddHardwareToAssembly = () => {
    const newHw: AssemblyHardwareItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: 'Винты M3x10',
      quantity: 4,
      cost_per_unit: 3,
      price_per_unit: 5,
    };
    setAssemblyHardware(prev => [...prev, newHw]);
  };

  // Расчет агрегированных значений для сборки в режиме реального времени
  const calcAssemblyTotals = () => {
    const round2 = (num: number) => Math.round((num || 0) * 100) / 100;
    let totalWeight = 0;
    let totalMinutesTotal = 0;
    let partsBaseCost = 0;
    let partsFinalPrice = 0;

    assemblyParts.forEach(p => {
      totalWeight += (p.weight_g || 0) * (p.quantity || 1);
      totalMinutesTotal += ((p.hours || 0) * 60 + (p.minutes || 0)) * (p.quantity || 1);
      partsBaseCost += (p.base_cost || 0) * (p.quantity || 1);
      partsFinalPrice += (p.final_price || 0) * (p.quantity || 1);
    });

    let hwBaseCost = 0;
    let hwFinalPrice = 0;

    assemblyHardware.forEach(h => {
      hwBaseCost += (h.cost_per_unit || 0) * (h.quantity || 1);
      hwFinalPrice += (h.price_per_unit || 0) * (h.quantity || 1);
    });

    const laborMins = parseInt(assemblyLaborMinutes, 10) || 0;
    const laborCost = Math.round((laborMins / 60) * laborRate);

    const totalHours = Math.floor(totalMinutesTotal / 60);
    const totalMins = totalMinutesTotal % 60;

    const grandBaseCost = round2(partsBaseCost + hwBaseCost + laborCost);
    const grandFinalPrice = round2(partsFinalPrice + hwFinalPrice + laborCost);

    return {
      totalWeight: round2(totalWeight),
      totalHours,
      totalMins,
      partsBaseCost: round2(partsBaseCost),
      partsFinalPrice: round2(partsFinalPrice),
      hwBaseCost: round2(hwBaseCost),
      hwFinalPrice: round2(hwFinalPrice),
      laborCost,
      grandBaseCost,
      grandFinalPrice,
    };
  };

  // Фильтр отображения в таблице: Все / Только товары / Только сборки / Заканчиваются + Категории и Теги
  type ProductFilter = 'all' | 'single' | 'assembly' | 'low_stock';
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');

  const allCount = savedCalculations.length;
  const singleCount = savedCalculations.filter(c => c.type !== 'assembly').length;
  const assemblyCount = savedCalculations.filter(c => c.type === 'assembly').length;
  const lowStockCount = savedCalculations.filter(c => (c.stock_quantity || 0) <= 2).length;

  const filteredCalculations = savedCalculations.filter((calc) => {
    if (productFilter === 'single' && calc.type === 'assembly') return false;
    if (productFilter === 'assembly' && calc.type !== 'assembly') return false;
    if (productFilter === 'low_stock' && (calc.stock_quantity || 0) > 2) return false;
    if (selectedCategory !== 'all' && (calc.category || 'Разное') !== selectedCategory) return false;

    return true;
  });

  // Буфер товаров, отложенных в будущую сборку из таблицы (без мгновенного открытия модального окна)
  const [stagedAssemblyParts, setStagedAssemblyParts] = useState<AssemblyPrintedPart[]>([]);

  const handleOpenNewAssemblyModal = () => {
    setEditingAssemblyId(null);
    setAssemblyName('');
    setAssemblyLaborMinutes('15');
    // Переносим отложенные детали из буфера в форму редактирования
    setAssemblyParts(stagedAssemblyParts.length > 0 ? [...stagedAssemblyParts] : []);
    setAssemblyHardware([]);
    setIsAssemblyModalOpen(true);
  };

  const handleStageProductForAssembly = (prod: SavedCalculation) => {
    const round2 = (num: number) => Math.round((num || 0) * 100) / 100;
    
    // Проверяем, есть ли уже этот товар в черновике
    const existingIndex = stagedAssemblyParts.findIndex(p => p.product_id === prod.id);

    if (existingIndex >= 0) {
      // Если уже есть — увеличиваем количество на +1
      setStagedAssemblyParts(prev => 
        prev.map((p, i) => i === existingIndex ? { ...p, quantity: p.quantity + 1 } : p)
      );
      showSuccess(`Количество товара «${prod.name}» в сборке увеличено!`, 'Черновик сборки');
    } else {
      // Добавляем новую деталь в черновик
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

      setStagedAssemblyParts(prev => [...prev, newPart]);
      showSuccess(`Товар «${prod.name}» добавлен в будущую сборку!`, 'Добавлено в сборку');
    }
  };

  const handleEditAssembly = (item: SavedCalculation) => {
    setEditingAssemblyId(item.id);
    setAssemblyName(item.name);
    setAssemblyLaborMinutes((item.assembly_labor_minutes || 15).toString());
    setAssemblyParts(item.assembly_parts ? [...item.assembly_parts] : []);
    setAssemblyHardware(item.assembly_hardware ? [...item.assembly_hardware] : []);
    setStagedAssemblyParts([]);
    setIsAssemblyModalOpen(true);
  };

  // Анимация тряски для невалидного названия сборки
  const [isNameShaking, setIsNameShaking] = useState(false);

  const handleSaveAssembly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assemblyName.trim()) {
      setIsNameShaking(true);
      setTimeout(() => setIsNameShaking(false), 500);
      showWarning('Пожалуйста, введите название сборного изделия', 'Заполните название');
      return;
    }

    if (assemblyParts.length === 0 && assemblyHardware.length === 0) {
      showWarning('Добавьте хотя бы одну деталь или фурнитуру в сборку', 'Пустая сборка');
      return;
    }

    const totals = calcAssemblyTotals();
    const primaryFilament = assemblyParts[0]?.filament_name || 'Несколько материалов';
    const primaryPrinter = assemblyParts[0]?.printer_name || 'Разные принтеры';

    const assemblyData: SavedCalculation = {
      id: editingAssemblyId || (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9)),
      name: assemblyName.trim(),
      type: 'assembly',
      filament_name: primaryFilament,
      printer_name: primaryPrinter,
      weight_g: totals.totalWeight,
      hours: totals.totalHours,
      minutes: totals.totalMins,
      quantity: 1,
      base_cost: totals.grandBaseCost,
      final_price: totals.grandFinalPrice,
      assembly_parts: assemblyParts,
      assembly_hardware: assemblyHardware,
      assembly_labor_minutes: parseInt(assemblyLaborMinutes, 10) || 0,
      assembly_labor_cost: totals.laborCost,
      created_at: new Date().toISOString(),
    };

    if (editingAssemblyId) {
      await updateSavedCalculation(assemblyData);
      showSuccess(`Сборка «${assemblyName}» успешно обновлена!`, 'Сборка обновлена');
    } else {
      await addSavedCalculation(assemblyData);
      showSuccess(`Составной товар «${assemblyName}» успешно создан!`, 'Товар создан');
    }

    setStagedAssemblyParts([]);
    setIsAssemblyModalOpen(false);
  };

  // Обработчик клика по STL
  const handleStlClick = (item: SavedCalculation) => {
    const hasUrl = Boolean(item.stl_url && item.stl_url.trim());
    const hasFile = Boolean(item.stl_file_data);

    if (hasUrl && hasFile) {
      setActiveStlChoiceItem(item);
    } else if (hasUrl) {
      window.open(item.stl_url, '_blank');
    } else if (hasFile) {
      downloadStlFile(item);
    } else {
      handleOpenEditStl(item);
    }
  };

  const downloadStlFile = (item: SavedCalculation) => {
    if (!item.stl_file_data) return;
    const a = document.createElement('a');
    a.href = item.stl_file_data;
    a.download = item.stl_file_name || `${item.name}.stl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenEditStl = (item: SavedCalculation) => {
    setEditingStlItem(item);
    setEditStlUrl(item.stl_url || '');
    setEditStlFileName(item.stl_file_name || '');
    setEditStlFileData(item.stl_file_data || '');
  };

  const handleSaveStlEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStlItem) return;

    try {
      await updateSavedCalculation({
        ...editingStlItem,
        stl_url: editStlUrl.trim() || undefined,
        stl_file_name: editStlFileName || undefined,
        stl_file_data: editStlFileData || undefined,
      });
      setEditingStlItem(null);
      showSuccess('Данные 3D-модели обновлены');
    } catch (err) {
      console.error('Ошибка сохранения STL:', err);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Название товара / Сборки',
      sortable: true,
      render: (item: SavedCalculation) => {
        const isAssembly = item.type === 'assembly';
        const isExpanded = Boolean(expandedAssemblyIds[item.id]);

        const catObj = categoriesList.find(c => c.label === item.category || c.id === item.category);
        const catLabel = catObj?.label || item.category || 'Разное';
        const catIcon = catObj?.icon || '🏷️';
        const catBadgeStyle = catObj?.color || 'bg-gray-800 text-gray-400 border-gray-700';

        return (
          <div className="flex flex-col gap-1 py-1 max-w-[280px] sm:max-w-[360px] xl:max-w-[460px]">
            <div className="flex items-center gap-2">
              {isAssembly ? (
                <button
                  type="button"
                  onClick={(e) => toggleExpandAssembly(item.id, e)}
                  className="p-1 rounded-lg bg-[#242930] hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors shrink-0 cursor-pointer"
                  title={isExpanded ? 'Свернуть детализацию' : 'Раскрыть состав сборки'}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              ) : (
                <div className="w-5 shrink-0" />
              )}

              {editingNameId === item.id ? (
                <motion.div
                  animate={isInlineNameShaking ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
                  transition={{ duration: 0.5 }}
                  className="w-full min-w-0 flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editingNameValue}
                    onChange={(e) => {
                      setEditingNameValue(e.target.value);
                      if (isInlineNameShaking) setIsInlineNameShaking(false);
                    }}
                    onBlur={() => handleSaveRename(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(item);
                      if (e.key === 'Escape') setEditingNameId(null);
                    }}
                    className={`w-full bg-[#0d0e12] border rounded-lg px-2.5 py-1 text-xs text-white font-sans focus:outline-none shadow-sm transition-colors ${
                      isInlineNameShaking ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-amber-500 focus:ring-1 focus:ring-amber-500'
                    }`}
                  />
                </motion.div>
              ) : (
                <div 
                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                  onClick={(e) => handleStartRename(item, e)}
                >
                  {isAssembly && (
                    <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded-md shrink-0 flex items-center gap-1">
                      <Box size={11} /> Сборка
                    </span>
                  )}

                  <span 
                    className={`font-semibold truncate block transition-colors ${
                      isAssembly ? 'text-amber-200 hover:text-amber-400' : 'text-white hover:text-amber-400'
                    }`}
                  >
                    {item.name}
                  </span>
                </div>
              )}
            </div>

            {/* Категория и Теги прямо под названием */}
            <div className="flex flex-wrap items-center gap-1.5 pl-7">
              <span 
                onClick={(e) => { e.stopPropagation(); handleOpenCategoryEditModal(item); }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${catBadgeStyle} cursor-pointer hover:border-amber-500/50 transition-all select-none`}
                title="Нажмите, чтобы изменить категорию и теги"
              >
                <span>{catIcon}</span>
                <span>{catLabel}</span>
                <Tag size={9} className="text-amber-400 ml-0.5 opacity-70 hover:opacity-100" />
              </span>

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  {item.tags.map((tag, idx) => (
                    <span key={idx} className="px-1.5 py-0.2 bg-[#1a1d26] border border-[#262a36] text-gray-400 text-[10px] rounded font-sans">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'stl',
      header: '3D-Модель',
      align: 'center' as const,
      render: (item: SavedCalculation) => {
        if (item.type === 'assembly') {
          const partsCount = item.assembly_parts?.length || 0;
          const hwCount = item.assembly_hardware?.length || 0;
          return (
            <span className="px-2.5 py-1 bg-[#1a1d24] border border-[#242930] text-gray-400 rounded-lg text-xs font-mono select-none">
              {partsCount} дет • {hwCount} мет
            </span>
          );
        }

        const hasUrl = Boolean(item.stl_url && item.stl_url.trim());
        const hasFile = Boolean(item.stl_file_data);
        const hasStl = hasUrl || hasFile;

        return (
          <div className="flex items-center justify-center gap-1.5 select-none">
            <button
              onClick={() => handleStlClick(item)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border select-none ${
                hasStl
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30 shadow-md shadow-emerald-500/10'
                  : 'bg-[#242930]/40 text-gray-400 border-[#242930] hover:text-white hover:bg-[#242930]'
              }`}
            >
              <FileCode size={14} className={hasStl ? 'text-emerald-400 animate-pulse' : 'text-gray-400'} />
              <span>
                {hasStl 
                  ? (hasUrl && hasFile ? 'STL + Ссылка' : hasUrl ? 'Ссылка' : 'Файл STL') 
                  : '+ STL'}
              </span>
            </button>

            {hasStl && (
              <button
                onClick={() => handleOpenEditStl(item)}
                className="p-1 text-neutral-accent hover:text-white rounded hover:bg-[#242930] transition-colors cursor-pointer"
                title="Редактировать STL"
              >
                <Edit2 size={13} />
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'filament_name',
      header: 'Материал',
      sortable: true,
      render: (item: SavedCalculation) => {
        if (item.type === 'assembly') {
          return <span className="text-gray-400 text-xs italic">Составной набор</span>;
        }

        const liveFilament = item.filament_id ? filaments.find(f => f.id === item.filament_id) : null;
        const displayName = liveFilament?.name ?? item.filament_name;
        const displayColor = liveFilament?.color ?? item.filament_color;
        return (
          <div className="flex items-center gap-1.5 max-w-[180px] sm:max-w-[240px]">
            {displayColor && (
              <div 
                className="w-3 h-3 rounded-full border border-black/20 shrink-0 shadow-inner" 
                style={{ backgroundColor: displayColor }}
              />
            )}
            <span className="truncate font-medium block" title={displayName}>
              {displayName}
            </span>
          </div>
        );
      },
    },
    {
      key: 'printer_name',
      header: 'Принтер',
      sortable: true,
      render: (item: SavedCalculation) => {
        if (item.type === 'assembly') {
          return <span className="text-gray-400 text-xs italic">Разные принтеры</span>;
        }

        const livePrinter = item.printer_id ? printers.find(p => p.id === item.printer_id) : null;
        const displayName = livePrinter?.name ?? item.printer_name;
        return (
          <span className="truncate max-w-[140px] sm:max-w-[180px] block" title={displayName}>
            {displayName}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Добавлено',
      sortable: true,
      render: (item: SavedCalculation) => (
        <span className="text-gray-400 text-xs font-mono select-none" title={item.created_at}>
          {formatDate(item.created_at)}
        </span>
      ),
    },
    {
      key: 'params',
      header: 'Параметры печати',
      sortable: true,
      sortValue: (item: SavedCalculation) => item.weight_g,
      render: (item: SavedCalculation) => (
        <span className="font-mono text-xs text-neutral-accent">
          {item.weight_g}г • {item.hours}ч {item.minutes}м {item.quantity > 1 ? `• ${item.quantity}шт` : ''}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'В наличии',
      align: 'center' as const,
      sortable: true,
      sortValue: (item: SavedCalculation) => item.stock_quantity || 0,
      render: (item: SavedCalculation) => {
        const stock = item.stock_quantity || 0;
        const isOutOfStock = stock === 0;
        const isLowStock = stock > 0 && stock <= 2;

        return (
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center justify-center gap-1 my-0.5">
            <NumberCounter
              value={stock}
              min={0}
              onChange={(val) => handleSetStock(item, val)}
            />

            {/* Подсветка статуса наличия */}
            {isOutOfStock && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-400 font-sans flex items-center gap-0.5 select-none">
                ❌ Нет на складе
              </span>
            )}

            {isLowStock && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-500/40 text-amber-300 font-sans flex items-center gap-0.5 animate-pulse select-none">
                ⚠️ Заканчивается
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'prices',
      header: 'Стоимость',
      align: 'right' as const,
      sortable: true,
      sortValue: (item: SavedCalculation) => item.final_price,
      render: (item: SavedCalculation) => (
        <div className="flex flex-col items-end font-mono">
          <span className="text-primary font-bold text-sm">{formatCurrency(item.final_price, currencySymbol)}</span>
          <span className="text-gray-500 text-[10px]">себ: {formatCurrency(item.base_cost, currencySymbol)}</span>
        </div>
      ),
    },
    {
      key: 'profit',
      header: 'Прибыль',
      align: 'center' as const,
      sortable: true,
      sortValue: (item: SavedCalculation) => (item.final_price || 0) - (item.base_cost || 0),
      render: (item: SavedCalculation) => {
        const profit = Math.round(((item.final_price || 0) - (item.base_cost || 0)) * 100) / 100;
        const marginPercent = item.final_price && item.final_price > 0 
          ? Math.round((profit / item.final_price) * 1000) / 10 
          : 0;

        const isPositive = profit >= 0;

        return (
          <div className="flex flex-col items-center justify-center gap-0.5 select-none font-mono leading-tight py-0.5 whitespace-nowrap min-w-[90px] mx-auto">
            <span className={`font-extrabold text-xs sm:text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{formatCurrency(profit, currencySymbol)}
            </span>
            
            <span className={`text-xs font-bold ${isPositive ? 'text-emerald-400/90' : 'text-red-400/90'}`}>
              {isPositive ? '▲' : '▼'}{marginPercent}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Действия',
      align: 'center' as const,
      render: (item: SavedCalculation) => (
        <div className="flex items-center justify-center gap-1.5">
          {item.type !== 'assembly' && (
            <>
              <button
                onClick={() => handleLoadCalculation(item)}
                className="p-1.5 text-primary hover:text-white rounded hover:bg-primary/10 transition-colors cursor-pointer"
                title="Загрузить в калькулятор"
              >
                <Play size={14} fill="currentColor" />
              </button>
              {(() => {
                const stagedItem = stagedAssemblyParts.find(p => p.product_id === item.id);
                return (
                  <button
                    onClick={() => handleStageProductForAssembly(item)}
                    className={`p-1.5 text-amber-400 hover:text-amber-300 rounded hover:bg-amber-500/10 transition-colors cursor-pointer relative ${
                      stagedItem ? 'bg-amber-500/15' : ''
                    }`}
                    title="Добавить товар в черновик сборки"
                  >
                    <Layers size={14} />
                    {stagedItem && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-black text-[9px] font-mono font-extrabold rounded-full flex items-center justify-center border border-[#16181d] shadow-sm animate-scale-in">
                        {stagedItem.quantity}
                      </span>
                    )}
                  </button>
                );
              })()}
            </>
          )}

          <button
            onClick={() => handleCreateOrderFromProduct(item)}
            className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded hover:bg-emerald-500/10 transition-colors cursor-pointer"
            title="Создать новый заказ на основе этого товара (Изготовление +2 дня)"
          >
            <ShoppingCart size={14} />
          </button>

          {item.type === 'assembly' && (
            <>
              <button
                onClick={() => handleEditAssembly(item)}
                className="p-1.5 text-amber-400 hover:text-amber-300 rounded hover:bg-amber-500/10 transition-colors cursor-pointer"
                title="Редактировать состав сборки"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={(e) => toggleExpandAssembly(item.id, e)}
                className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                title="Развернуть/Свернуть состав сборки"
              >
                <Box size={14} />
              </button>
            </>
          )}

          <button
            onClick={() => handleDelete(item.id, item.name, item.type)}
            className="p-1.5 text-red-500/70 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Удалить товар"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Функция отрисовки раскрывающейся строки для составного товара (в виде вложенной таблицы)
  const renderSubRow = (item: SavedCalculation) => {
    if (item.type !== 'assembly' || !expandedAssemblyIds[item.id]) return null;

    const parts = item.assembly_parts || [];
    const hardware = item.assembly_hardware || [];
    const laborMins = item.assembly_labor_minutes || 0;
    const laborCost = item.assembly_labor_cost || Math.round(((laborMins || 0) / 60) * laborRate);

    return (
      <tr className="bg-[#101217] border-b border-[#242930]">
        <td colSpan={columns.length} className="p-0">
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="p-4 pl-6 sm:pl-8 border-l-4 border-amber-500/60 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Box size={16} className="text-amber-400" />
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Состав сборки: «{item.name}»
                </h4>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
                  {parts.length} печатных деталей • {hardware.length} метизов • {laborMins} мин сборки
                </span>

                {(() => {
                  const subProfit = Math.round(((item.final_price || 0) - (item.base_cost || 0)) * 100) / 100;
                  const subMargin = item.final_price && item.final_price > 0 
                    ? Math.round((subProfit / item.final_price) * 1000) / 10 
                    : 0;

                  return (
                    <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg font-mono">
                      Прибыль: +{formatCurrency(subProfit, currencySymbol)} (▲ {subMargin}% маржа)
                    </span>
                  );
                })()}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditAssembly(item)}
                  className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 flex items-center gap-1.5 py-1 px-2.5 cursor-pointer"
                >
                  <Edit2 size={12} />
                  <span>Изменить сборку</span>
                </Button>
              </div>
            </div>

            {/* Вложенная таблица состава сборки */}
            <div className="overflow-x-auto rounded-xl border border-[#242930] bg-[#14171f]/90 shadow-inner">
              <table className="w-full text-left font-sans text-xs border-collapse select-text">
                <thead>
                  <tr className="border-b border-[#242930] text-gray-400 font-semibold text-[10px] uppercase tracking-wider bg-[#1a1d26]">
                    <th className="py-2.5 px-3">Составляющий элемент</th>
                    <th className="py-2.5 px-3">Тип / Материал</th>
                    <th className="py-2.5 px-3 text-center">Кол-во</th>
                    <th className="py-2.5 px-3">Параметры</th>
                    <th className="py-2.5 px-3 text-right">Себестоимость</th>
                    <th className="py-2.5 px-3 text-right">Цена продажи</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242930]/60 text-gray-300 font-mono text-xs">
                  {/* 1. 3D-Печатные детали */}
                  {parts.map((part, idx) => (
                    <tr key={part.id || idx} className="hover:bg-[#1f2430]/60 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-semibold text-white">
                        <span className="flex items-center gap-1.5">
                          <Box size={13} className="text-amber-400 shrink-0" />
                          {part.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-amber-300/90 font-sans text-[11px]">
                        {part.filament_name || '3D-деталь'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">
                        {part.quantity} шт
                      </td>
                      <td className="py-2.5 px-3 text-gray-400 text-[11px]">
                        {Math.round((part.weight_g || 0) * (part.quantity || 1) * 100) / 100}г
                        {part.hours || part.minutes ? ` • ${part.hours || 0}ч ${part.minutes || 0}м` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400">
                        {formatCurrency(Math.round(((part.base_cost || 0) * (part.quantity || 1)) * 100) / 100, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                        {formatCurrency(Math.round(((part.final_price || 0) * (part.quantity || 1)) * 100) / 100, currencySymbol)}
                      </td>
                    </tr>
                  ))}

                  {/* 2. Покупная фурнитура и метизы */}
                  {hardware.map((hw, idx) => (
                    <tr key={hw.id || idx} className="hover:bg-[#1f2430]/60 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-semibold text-white">
                        <span className="flex items-center gap-1.5">
                          <Wrench size={13} className="text-blue-400 shrink-0" />
                          {hw.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-blue-400/90 font-sans text-[11px]">
                        Фурнитура / Метиз
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">
                        {hw.quantity} шт
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 italic text-[11px] font-sans">
                        —
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400">
                        {formatCurrency((hw.cost_per_unit || 0) * (hw.quantity || 1), currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                        {formatCurrency((hw.price_per_unit || 0) * (hw.quantity || 1), currencySymbol)}
                      </td>
                    </tr>
                  ))}

                  {/* 3. Работа мастера по сборке */}
                  {laborMins > 0 && (
                    <tr className="hover:bg-[#1f2430]/60 transition-colors bg-amber-500/5">
                      <td className="py-2.5 px-3 font-sans font-semibold text-amber-200">
                        <span className="flex items-center gap-1.5">
                          <Wrench size={13} className="text-amber-400 shrink-0" />
                          Работа мастера по сборке
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-amber-300/80 font-sans text-[11px]">
                        Свободная сборка
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-300">
                        {laborMins} мин
                      </td>
                      <td className="py-2.5 px-3 text-gray-400 text-[11px] font-sans">
                        Ставка {laborRate} {currencySymbol}/час
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400">
                        {formatCurrency(laborCost, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-400 font-bold">
                        +{formatCurrency(laborCost, currencySymbol)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </td>
      </tr>
    );
  };

  const totals = calcAssemblyTotals();

  return (
    <div className="flex flex-col gap-6">
      {/* Заголовок и кнопки создания товаров / сборок */}
      <PageHeader
        icon={Package}
        title="Каталог товаров"
        subtitle="Сохраненные изделия, 3D-модели и составные сборки"
        accentColor="#f59e0b"
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleUndo}
              disabled={historyStack.length === 0}
              variant="outline"
              size="md"
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 ${
                historyStack.length > 0
                  ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10 cursor-pointer shadow-sm animate-scale-in'
                  : 'border-[#242930] text-gray-600 opacity-40 cursor-not-allowed'
              }`}
              title={historyStack.length > 0 ? "Отменить последнее действие (Ctrl+Z)" : "Нет действий для отмены"}
            >
              <RotateCcw className={`w-4 h-4 ${historyStack.length > 0 ? 'text-amber-400' : 'text-gray-600'}`} />
            </Button>

            <Button
              onClick={handleOpenNewAssemblyModal}
              variant="outline"
              size="md"
              className={`border-amber-500/40 text-amber-400 hover:bg-amber-500/10 cursor-pointer flex items-center gap-2 relative transition-all ${
                stagedAssemblyParts.length > 0 ? 'bg-amber-500/20 border-amber-500 shadow-md shadow-amber-500/20 text-white font-bold' : ''
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>+ Создать сборку</span>
              {stagedAssemblyParts.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-black text-xs font-mono font-extrabold shadow-sm animate-pulse">
                  {stagedAssemblyParts.reduce((acc, p) => acc + p.quantity, 0)}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {/* Кнопки переключения фильтров списка: Все / Только товары / Только сборки */}
      {savedCalculations.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14171f] p-2 rounded-2xl border border-[#242930] select-none">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setProductFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                productFilter === 'all'
                  ? 'bg-amber-500/20 text-white border border-amber-500/50 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#1f2430]'
              }`}
            >
              <Package size={14} className={productFilter === 'all' ? 'text-amber-400' : 'text-gray-400'} />
              <span>Все позиции</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                productFilter === 'all' ? 'bg-amber-500 text-black font-extrabold' : 'bg-gray-800 text-gray-400'
              }`}>
                {allCount}
              </span>
            </button>

            <button
              onClick={() => setProductFilter('single')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                productFilter === 'single'
                  ? 'bg-primary/20 text-white border border-primary/50 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#1f2430]'
              }`}
            >
              <Box size={14} className={productFilter === 'single' ? 'text-primary' : 'text-gray-400'} />
              <span>Только товары</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                productFilter === 'single' ? 'bg-primary text-black font-extrabold' : 'bg-gray-800 text-gray-400'
              }`}>
                {singleCount}
              </span>
            </button>

            <button
              onClick={() => setProductFilter('assembly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                productFilter === 'assembly'
                  ? 'bg-amber-500/20 text-white border border-amber-500/50 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#1f2430]'
              }`}
            >
              <Layers size={14} className={productFilter === 'assembly' ? 'text-amber-400' : 'text-gray-400'} />
              <span>Только сборки</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                productFilter === 'assembly' ? 'bg-amber-500 text-black font-extrabold' : 'bg-gray-800 text-gray-400'
              }`}>
                {assemblyCount}
              </span>
            </button>

            {lowStockCount > 0 && (
              <button
                onClick={() => setProductFilter(productFilter === 'low_stock' ? 'all' : 'low_stock')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  productFilter === 'low_stock'
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-500/60 shadow-sm animate-pulse'
                    : 'text-amber-400 hover:bg-amber-500/10 border border-amber-500/30'
                }`}
                title="Показать только позиции с малым остатком или отсутствующие"
              >
                <AlertTriangle size={14} className="text-amber-400" />
                <span>Заканчиваются</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500 text-black font-extrabold">
                  {lowStockCount}
                </span>
              </button>
            )}

            <div className="flex items-center gap-1.5 pl-2 border-l border-[#242930] ml-1">
              <Folder size={13} className="text-amber-400 hidden sm:inline" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#0d0e12] border border-[#242930] text-xs text-gray-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer font-sans"
              >
                <option value="all">📦 Все категории</option>
                {categoriesList.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-xs text-gray-400 font-mono hidden md:block">
              Отображено: <strong className="text-white">{filteredCalculations.length}</strong> из {allCount}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleUndo}
              disabled={historyStack.length === 0}
              className={`p-2 rounded-xl transition-all flex items-center justify-center shrink-0 ${
                historyStack.length > 0
                  ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10 cursor-pointer shadow-sm animate-scale-in'
                  : 'border-[#242930] text-gray-600 opacity-40 cursor-not-allowed'
              }`}
              title={historyStack.length > 0 ? "Отменить последнее действие (Ctrl+Z)" : "Нет действий для отмены"}
            >
              <RotateCcw size={14} className={historyStack.length > 0 ? 'text-amber-400' : 'text-gray-600'} />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 py-1 px-2.5 cursor-pointer text-xs transition-colors shrink-0"
              title="Удалить все товары и сборки из каталога"
            >
              <Trash2 size={13} />
              <span>Удалить всё</span>
            </Button>
          </div>
        </div>
      )}

      {/* Единая Таблица товаров и сборок */}
      <Card>
        {savedCalculations.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-4 select-none">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
              <Package size={24} />
            </div>
            <div className="max-w-sm">
              <h3 className="text-white font-semibold text-base mb-1">Список товаров пуст</h3>
              <p className="text-neutral-accent text-xs">
                Сохраняйте расчеты из калькулятора или создавайте составные сборки изделий с фурнитурой.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {historyStack.length > 0 && (
                <Button size="sm" onClick={handleUndo} variant="outline" className="flex items-center gap-1.5 border-amber-500/50 text-amber-400 bg-amber-500/10 cursor-pointer">
                  <RotateCcw size={14} /> Отменить удаление (Ctrl+Z)
                </Button>
              )}
              <Button size="sm" onClick={handleOpenNewAssemblyModal} variant="outline" className="flex items-center gap-1.5 border-amber-500/40 text-amber-400">
                <Layers size={14} /> Создать сборку
              </Button>
              <Button size="sm" onClick={() => router.push('/calculator')} className="flex items-center gap-1.5">
                <Calculator size={14} /> В калькулятор
              </Button>
            </div>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredCalculations}
            keyExtractor={(item) => item.id}
            isSearchable={true}
            pageSize={15}
            renderSubRow={renderSubRow}
          />
        )}
      </Card>

      {/* Модальное окно создания / редактирования Составного товара (Сборки) */}
      <Modal
        isOpen={isAssemblyModalOpen}
        onClose={() => setIsAssemblyModalOpen(false)}
        title="Конструктор сборного изделия (Составной товар)"
        maxWidth="3xl"
        footer={
          savedCalculations.filter(c => c.type !== 'assembly').length === 0 ? (
            <div className="flex justify-end select-none">
              <Button type="button" variant="outline" onClick={() => setIsAssemblyModalOpen(false)}>
                Закрыть
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 select-none">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Итог продажи:</span>
                <span className="font-mono text-amber-400 font-bold text-sm">
                  {formatCurrency(totals.grandFinalPrice, currencySymbol)}
                </span>
                <span className="text-xs text-gray-500 font-mono">({totals.totalWeight}г • {totals.totalHours}ч {totals.totalMins}м)</span>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAssemblyModalOpen(false)}>
                  Отмена
                </Button>
                <Button 
                  type="button" 
                  variant="primary" 
                  onClick={() => {
                    const form = document.getElementById('assemblyForm') as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }} 
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-none shadow-lg shadow-amber-500/25 cursor-pointer"
                >
                  Сохранить сборку
                </Button>
              </div>
            </div>
          )
        }
      >
        {savedCalculations.filter(c => c.type !== 'assembly').length === 0 ? (
          <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col items-center justify-center gap-3 text-center select-none my-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">
                В каталоге пока нет сохраненных 3D-деталей
              </h4>
              <p className="text-xs text-gray-300 max-w-md leading-relaxed">
                Чтобы создать сборное изделие, сначала рассчитайте и сохраните хотя бы одну деталь в Калькуляторе.
              </p>
            </div>
            <Button
              type="button"
              size="md"
              onClick={() => {
                setIsAssemblyModalOpen(false);
                router.push('/calculator');
              }}
              className="mt-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs flex items-center gap-2 border-none shadow-lg shadow-amber-500/25 cursor-pointer"
            >
              <Calculator size={16} />
              <span>Перейти в Калькулятор</span>
            </Button>
          </div>
        ) : (
          <form id="assemblyForm" onSubmit={handleSaveAssembly} className="flex flex-col gap-5 select-none pr-1">
            {/* Пометка об отложенных товарах из таблицы */}
            {stagedAssemblyParts.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-medium">
                  <Sparkles size={16} className="text-amber-400 shrink-0" />
                  <span>Из таблицы предварительно добавлено: <strong className="text-white">{stagedAssemblyParts.reduce((acc, p) => acc + p.quantity, 0)} шт. деталей</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStagedAssemblyParts([]);
                    setAssemblyParts([]);
                  }}
                  className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-mono font-bold rounded-md cursor-pointer transition-colors"
                >
                  Очистить черновик
                </button>
              </div>
            )}

            {/* Название сборки */}
            <Input
              label="Название сборного изделия"
              placeholder="напр. Корпус квадрокоптера Mark-4 v2"
              value={assemblyName}
              onChange={(e) => {
                setAssemblyName(e.target.value);
                if (isNameShaking) setIsNameShaking(false);
              }}
              requiredStar={true}
              isShaking={isNameShaking}
              autoFocus
            />

            {/* Раздел 1: 3D-Печатные детали */}
            <div className="flex flex-col gap-2.5 p-4 bg-[#14171f] border border-[#242930] rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box size={16} className="text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    1. 3D-Печатные детали ({assemblyParts.length})
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomPartToAssembly}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Своя деталь
                </button>
              </div>

              {/* Выбор детали из существующих товаров */}
              <div className="flex items-center gap-2 mt-1">
                <Select
                  value={selectedProductId}
                  onChange={(val) => setSelectedProductId(val)}
                  isSearchable={true}
                  placeholder="-- Поиск или выбор детали из каталога --"
                  options={[
                    { value: '', label: '-- Поиск / Выбор детали из каталога товаров --' },
                    ...savedCalculations
                      .filter(c => c.type !== 'assembly')
                      .map(c => ({
                        value: c.id,
                        label: `${c.name} (${c.weight_g}г, ${c.hours}ч ${c.minutes}м, ${c.filament_name})`
                      }))
                  ]}
                  className="flex-1 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddSelectedProductToAssembly}
                  disabled={!selectedProductId}
                  className="shrink-0 text-xs border-amber-500/30 text-amber-400"
                >
                  Добавить
                </Button>
              </div>

            {/* Список добавленных печатных деталей */}
            {assemblyParts.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-[#242930] rounded-xl text-gray-500 text-xs">
                Нет добавленных 3D-деталей. Выберите из каталога или нажмите «Своя деталь».
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 mt-2">
                {assemblyParts.map((part, idx) => (
                  <div key={part.id || idx} className="p-3 bg-[#1c202a] border border-[#242930] rounded-xl flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3 border-b border-[#242930]/60 pb-2">
                      <span className="text-sm sm:text-base font-bold text-white tracking-wide truncate min-w-0 flex-1" title={part.name}>
                        {part.name}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        {part.filament_name && (
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-semibold rounded-md">
                            {part.filament_name}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setAssemblyParts(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Удалить деталь"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Кастомный каунтер количества + нередактируемые авто-расчитанные индикаторы */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14171f] p-2.5 rounded-lg border border-[#242930]/60">
                      <div className="shrink-0">
                        <NumberCounter
                          label="КОЛИЧЕСТВО (ШТ)"
                          value={part.quantity}
                          min={1}
                          max={99}
                          onChange={(newQty) => {
                            setAssemblyParts(prev => prev.map((p, i) => i === idx ? { ...p, quantity: newQty } : p));
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-4 font-mono text-xs text-right ml-auto">
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-sans">Сумм. Вес</span>
                          <span className="text-neutral-accent font-bold">
                            {Math.round((part.weight_g || 0) * part.quantity * 100) / 100}г
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-sans">Себестоимость</span>
                          <span className="text-gray-400 font-bold">
                            {formatCurrency(Math.round(((part.base_cost || 0) * part.quantity) * 100) / 100, currencySymbol)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-sans">Цена продажи</span>
                          <span className="text-emerald-400 font-bold">
                            {formatCurrency(Math.round(((part.final_price || 0) * part.quantity) * 100) / 100, currencySymbol)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Раздел 2: Покупная фурнитура и метизы */}
          <div className="flex flex-col gap-2.5 p-4 bg-[#14171f] border border-[#242930] rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench size={16} className="text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  2. Фурнитура и Метизы ({assemblyHardware.length})
                </h4>
              </div>

              <button
                type="button"
                onClick={handleAddHardwareToAssembly}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Метиз/Фурнитура
              </button>
            </div>

            {assemblyHardware.length === 0 ? (
              <div className="p-3 text-center border border-dashed border-[#242930] rounded-xl text-gray-500 text-xs">
                Фурнитура и метизы не добавлены (нажмите «+ Метиз/Фурнитура» для добавления винтов, магнитов, втулок).
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-1">
                {assemblyHardware.map((hw, idx) => (
                  <div key={hw.id || idx} className="p-3 bg-[#1c202a] border border-[#242930] rounded-xl flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <Input
                      placeholder="Название (напр. Винты M3x10)"
                      value={hw.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAssemblyHardware(prev => prev.map((h, i) => i === idx ? { ...h, name: val } : h));
                      }}
                      className="flex-1 text-xs font-semibold"
                    />

                    <div className="shrink-0">
                      <NumberCounter
                        value={hw.quantity}
                        min={1}
                        max={999}
                        onChange={(newQty) => {
                          setAssemblyHardware(prev => prev.map((h, i) => i === idx ? { ...h, quantity: newQty } : h));
                        }}
                      />
                    </div>

                    <div className="w-24 sm:w-28 shrink-0">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Закуп. (₽)"
                        value={hw.cost_per_unit}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setAssemblyHardware(prev => prev.map((h, i) => i === idx ? { ...h, cost_per_unit: val } : h));
                        }}
                        className="text-xs text-center"
                      />
                    </div>

                    <div className="w-24 sm:w-28 shrink-0">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Продажа (₽)"
                        value={hw.price_per_unit}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setAssemblyHardware(prev => prev.map((h, i) => i === idx ? { ...h, price_per_unit: val } : h));
                        }}
                        className="text-xs text-center"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setAssemblyHardware(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                      title="Удалить фурнитуру"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Раздел 3: Работа мастера по сборке */}
          <div className="p-4 bg-[#14171f] border border-[#242930] rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Wrench size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  3. Время работы мастера на сборку
                </h4>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                  Ставка: {laborRate} {currencySymbol}/час • Работа: {totals.laborCost} {currencySymbol}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <NumberCounter
                label="ВРЕМЯ (МИНУТ)"
                value={parseInt(assemblyLaborMinutes, 10) || 0}
                min={0}
                max={600}
                step={5}
                onChange={(newMins) => setAssemblyLaborMinutes(newMins.toString())}
              />
            </div>
          </div>

          {/* Итоговая экономика сборки */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-200">
              <span>Сводка по сборному изделию:</span>
              <span className="font-mono">{totals.totalWeight}г • {totals.totalHours}ч {totals.totalMins}м</span>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-xs">
              <span className="text-gray-300">Себестоимость сборки:</span>
              <span className="font-mono text-gray-400 font-bold">{formatCurrency(totals.grandBaseCost, currencySymbol)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-white font-bold">Рекомендуемая цена продажи:</span>
              <span className="font-mono text-amber-400 font-extrabold text-base">{formatCurrency(totals.grandFinalPrice, currencySymbol)}</span>
            </div>
          </div>
        </form>
      )}
      </Modal>

      {/* Модальное окно выбора когда есть и файл, и ссылка */}
      <Modal
        isOpen={Boolean(activeStlChoiceItem)}
        onClose={() => setActiveStlChoiceItem(null)}
        title="Выберите действие для 3D-модели"
      >
        {activeStlChoiceItem && (
          <div className="flex flex-col gap-4">
            <p className="text-gray-300 text-sm">
              Для товара <strong className="text-white">{activeStlChoiceItem.name}</strong> доступны и ссылка, и сохраненный файл:
            </p>

            <div className="flex flex-col gap-2.5">
              {activeStlChoiceItem.stl_url && (
                <Button
                  variant="primary"
                  onClick={() => {
                    window.open(activeStlChoiceItem.stl_url, '_blank');
                    setActiveStlChoiceItem(null);
                  }}
                  className="flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} /> Открыть ссылку ({activeStlChoiceItem.stl_url})
                </Button>
              )}

              {activeStlChoiceItem.stl_file_data && (
                <Button
                  variant="outline"
                  onClick={() => {
                    downloadStlFile(activeStlChoiceItem);
                    setActiveStlChoiceItem(null);
                  }}
                  className="flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Скачать файл ({activeStlChoiceItem.stl_file_name || 'модель.stl'})
                </Button>
              )}
            </div>

            <div className="flex justify-between border-t border-[#242930]/40 pt-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  const item = activeStlChoiceItem;
                  setActiveStlChoiceItem(null);
                  handleOpenEditStl(item);
                }}
                className="text-neutral-accent hover:text-white text-xs flex items-center gap-1 cursor-pointer"
              >
                <Edit2 size={13} /> Настройки STL
              </button>

              <Button variant="outline" size="sm" onClick={() => setActiveStlChoiceItem(null)}>
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Модальное окно управления STL у товара */}
      <Modal
        isOpen={Boolean(editingStlItem)}
        onClose={() => setEditingStlItem(null)}
        title={`Управление 3D-моделью: ${editingStlItem?.name}`}
      >
        {editingStlItem && (
          <form onSubmit={handleSaveStlEdit} className="flex flex-col gap-4 select-none">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9ca3af]">
                Ссылка на 3D-модель (Thingiverse, Printables, Облако)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="https://..."
                  value={editStlUrl}
                  onChange={(e) => setEditStlUrl(e.target.value)}
                  className="flex-1"
                />

                <div className="flex items-center gap-1 shrink-0">
                  {editStlUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => window.open(editStlUrl, '_blank')}
                        className="w-9 h-9 bg-[#242930] hover:bg-emerald-500/20 text-emerald-400 border border-[#242930] rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                        title="Проверить ссылку"
                      >
                        <ExternalLink size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStlUrl('')}
                        className="w-9 h-9 bg-[#242930] hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-[#242930] rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                        title="Удалить ссылку"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#9ca3af]">
                Файл STL / 3MF (для скачивания)
              </label>
              
              <div className="flex items-center justify-between gap-3 p-3 bg-[#1a1d24] border border-[#242930] rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    editStlFileName ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-[#242930] text-gray-500 border-[#242930]'
                  }`}>
                    <FileCode size={16} />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    {editStlFileName ? (
                      <span className="text-xs font-semibold text-emerald-400 font-mono truncate block" title={editStlFileName}>
                        {editStlFileName}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs truncate block select-none">Файл не загружен</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <label className="w-9 h-9 bg-[#242930] hover:bg-primary/20 text-gray-300 hover:text-white border border-[#242930] rounded-xl flex items-center justify-center transition-colors cursor-pointer" title={editStlFileName ? 'Заменить файл' : 'Загрузить файл'}>
                    <Upload size={15} />
                    <input
                      type="file"
                      accept=".stl,.3mf,.obj,.zip"
                      onChange={(e) => {
                        if (!isOnline) {
                          showWarning(
                            'Загрузка локальных файлов STL доступна только при подключенном Supabase (облачном хранилище). Используйте ссылку на 3D-модель или подключите Supabase в Настройках.',
                            'Требуется Supabase'
                          );
                          e.target.value = '';
                          return;
                        }
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setEditStlFileName(file.name);
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setEditStlFileData(evt.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>

                  {editStlFileData && (
                    <button
                      type="button"
                      onClick={() => downloadStlFile({ ...editingStlItem, stl_file_data: editStlFileData, stl_file_name: editStlFileName })}
                      className="w-9 h-9 bg-[#242930] hover:bg-emerald-500/20 text-emerald-400 border border-[#242930] rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      title="Скачать файл"
                    >
                      <Download size={15} />
                    </button>
                  )}

                  {editStlFileName && (
                    <button
                      type="button"
                      onClick={() => { setEditStlFileName(''); setEditStlFileData(''); }}
                      className="w-9 h-9 bg-[#242930] hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-[#242930] rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      title="Удалить файл"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#242930]/40 pt-4 mt-2">
              <div />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingStlItem(null)}>
                  Отмена
                </Button>
                <Button type="submit">
                  Сохранить
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Модальное окно подтверждения удаления товара / сборки */}
      <Modal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Подтверждение удаления"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingItem(null)}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-500 text-white border-none shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={15} />
              <span>{isDeleting ? 'Удаление...' : 'Да, удалить'}</span>
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-1 select-none">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 shrink-0 mt-0.5">
              <AlertTriangle size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-red-200 mb-1">
                Вы действительно хотите удалить {deletingItem?.type === 'assembly' ? 'сборку' : 'товар'}?
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                Наименование: <strong className="text-white">«{deletingItem?.name}»</strong>
              </p>
              <p className="text-[11px] text-gray-400 mt-2">
                ⚠️ Это действие нельзя будет отменить. Данный объект будет навсегда удален из вашего каталога.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Модальное окно массового удаления всех товаров */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Очистка всего каталога"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 select-none">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              disabled={isBulkDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleConfirmBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-500 text-white border-none shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={15} />
              <span>{isBulkDeleting ? 'Очистка...' : 'Да, удалить всё'}</span>
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-1 select-none">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 shrink-0 mt-0.5">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-red-200 mb-1">
                Вы действительно хотите полностью очистить весь каталог?
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                Будет безвозвратно удалено <strong className="text-white font-mono">{savedCalculations.length} позиций</strong> (все сохраненные 3D-детали и составные сборки).
              </p>
              <p className="text-[11px] text-gray-400 mt-2 font-mono">
                ⚠️ Внимание: Это действие нельзя отменить!
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Модальное окно быстрой смены Категории и Тегов товара */}
      <Modal
        isOpen={Boolean(editingCategoryItem)}
        onClose={() => { setEditingCategoryItem(null); setIsCreatingCategory(false); }}
        title={`Категория и теги: ${editingCategoryItem?.name || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveCategoryAndTags} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Folder size={14} className="text-amber-400" />
              Категория товара
            </label>

            {!isCreatingCategory ? (
              <select
                value={categoryDraft}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setIsCreatingCategory(true);
                  } else {
                    setCategoryDraft(e.target.value);
                  }
                }}
                className="w-full bg-[#1a1d26] border border-[#262a36] text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer font-sans"
              >
                {categoriesList.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
                <option value="__new__">➕ Создать новую категорию...</option>
              </select>
            ) : (
              <div className="p-3 bg-[#14171f] border border-amber-500/40 rounded-xl space-y-3 animate-scale-in">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Folder size={13} /> Создание новой категории
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    className="bg-[#1a1d26] border border-[#262a36] text-base rounded-xl p-2 focus:outline-none focus:border-amber-500 cursor-pointer shrink-0"
                  >
                    <option value="📦">📦</option>
                    <option value="🚗">🚗</option>
                    <option value="🏠">🏠</option>
                    <option value="⚙️">⚙️</option>
                    <option value="🎮">🎮</option>
                    <option value="🔧">🔧</option>
                    <option value="🏷️">🏷️</option>
                    <option value="💡">💡</option>
                    <option value="🚀">🚀</option>
                    <option value="🎁">🎁</option>
                    <option value="🧸">🧸</option>
                    <option value="🛠️">🛠️</option>
                  </select>

                  <Input
                    placeholder="Название (напр. Медицина, Модели)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCreatingCategory(false)}>
                    Отмена
                  </Button>
                  <Button type="button" size="sm" onClick={handleConfirmCreateCategory} className="bg-amber-500 hover:bg-amber-600 text-black font-bold border-none">
                    Создать
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Tag size={14} className="text-amber-400" />
              Теги товара (через запятую)
            </label>
            <Input
              placeholder="например: PLA, Срочно, Популярное, Авито"
              value={tagsInputDraft}
              onChange={(e) => setTagsInputDraft(e.target.value)}
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Указывайте любые ключевые слова через запятую. Они отобразятся в виде бэйджей #тег под товаром.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#242930]">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingCategoryItem(null)}>
              Отмена
            </Button>
            <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-bold border-none">
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
