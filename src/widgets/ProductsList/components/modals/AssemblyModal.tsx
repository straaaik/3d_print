import React, { useState, useEffect, useMemo } from 'react';
import { AssemblyPrintedPart, AssemblyHardwareItem, SavedCalculation, Filament, Printer } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { Select } from '../../../../shared/ui/Select';
import { Button } from '../../../../shared/ui/Button';
import { Checkbox } from '../../../../shared/ui/Checkbox';
import { 
  Trash2, 
  Box, 
  Layers, 
  Plus, 
  Wrench, 
  Clock, 
  Search,
  X,
  Check
} from 'lucide-react';
import { calcAssemblyTotals, round2 } from '../../helpers';
import { formatCurrency } from '../../../../shared/lib/format';

interface AssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAssembly: SavedCalculation | null;
  stagedParts: AssemblyPrintedPart[];
  savedCalculations: SavedCalculation[];
  filaments: Filament[];
  printers: Printer[];
  laborRate: number;
  currencySymbol: string;
  onSave: (assemblyData: Partial<SavedCalculation>) => Promise<void>;
}

export function AssemblyModal({
  isOpen,
  onClose,
  editingAssembly,
  stagedParts,
  savedCalculations,
  filaments,
  printers,
  laborRate,
  currencySymbol,
  onSave,
}: AssemblyModalProps) {
  const [name, setName] = useState('');
  const [laborMinutes, setLaborMinutes] = useState('15');
  const [isOwnerLabor, setIsOwnerLabor] = useState(false);
  const [parts, setParts] = useState<AssemblyPrintedPart[]>([]);
  const [hardware, setHardware] = useState<AssemblyHardwareItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingAssembly) {
        setName(editingAssembly.name || '');
        setLaborMinutes((editingAssembly.assembly_labor_minutes || 15).toString());
        setIsOwnerLabor(Boolean(editingAssembly.is_owner_labor));
        setParts(editingAssembly.assembly_parts ? [...editingAssembly.assembly_parts] : []);
        setHardware(editingAssembly.assembly_hardware ? [...editingAssembly.assembly_hardware] : []);
      } else {
        setName('');
        setLaborMinutes('15');
        setIsOwnerLabor(false);
        setParts(stagedParts.length > 0 ? [...stagedParts] : []);
        setHardware([]);
      }
      setProductSearch('');
    }
  }, [isOpen, editingAssembly, stagedParts]);

  const singleProducts = useMemo(() => {
    return savedCalculations.filter((c) => c.type !== 'assembly');
  }, [savedCalculations]);

  // Фильтрация списка доступных деталей каталога
  const filteredSingleProducts = useMemo(() => {
    if (!productSearch.trim()) return singleProducts;
    const query = productSearch.toLowerCase();
    return singleProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.id && p.id.toLowerCase().includes(query)) ||
        (p.filament_name && p.filament_name.toLowerCase().includes(query))
    );
  }, [singleProducts, productSearch]);

  const totals = calcAssemblyTotals(parts, hardware, laborMinutes, laborRate, isOwnerLabor);
  const profit = totals.profit;
  const marginPercent = totals.marginPercent;
  const totalHwPieces = totals.totalHwPieces;

  // Добавление / удаление детали из каталога по клику на строку или чекбокс
  const handleToggleCatalogProduct = (prod: SavedCalculation) => {
    const existingIndex = parts.findIndex((p) => p.product_id === prod.id);
    if (existingIndex >= 0) {
      setParts((prev) => prev.filter((_, i) => i !== existingIndex));
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
      setParts((prev) => [...prev, newPart]);
    }
  };

  // Изменение количества детали
  const handleUpdateCatalogPartQty = (productId: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setParts((prev) =>
      prev.map((p) => {
        if (p.product_id !== productId) return p;
        const newQty = Math.max(1, (p.quantity || 1) + delta);
        return { ...p, quantity: newQty };
      })
    );
  };

  // Добавление произвольной детали вручную
  const handleAddCustomPart = () => {
    const defaultFilament = filaments[0];
    const defaultPrinter = printers[0];

    const newPart: AssemblyPrintedPart = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Деталь #${parts.length + 1}`,
      weight_g: 50,
      hours: 2,
      minutes: 0,
      quantity: 1,
      filament_id: defaultFilament?.id,
      filament_name: defaultFilament?.name || 'PLA (Стандарт)',
      filament_color: defaultFilament?.color || '#06b6d4',
      printer_id: defaultPrinter?.id,
      printer_name: defaultPrinter?.name || '3D Принтер',
      base_cost: 120,
      final_price: 250,
    };

    setParts((prev) => [...prev, newPart]);
  };

  // Добавление метизов
  const handleAddHardware = () => {
    const newHw: AssemblyHardwareItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: 'Винты M3x10',
      quantity: 4,
      cost_per_unit: 3,
      price_per_unit: 5,
    };
    setHardware((prev) => [...prev, newHw]);
  };

  const handleUpdateHwQty = (index: number, delta: number) => {
    setHardware((prev) =>
      prev.map((h, i) => {
        if (i !== index) return h;
        const newQty = Math.max(1, (h.quantity || 1) + delta);
        return { ...h, quantity: newQty };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const primaryFilament = parts[0]?.filament_name || 'Несколько материалов';
      const primaryPrinter = parts[0]?.printer_name || 'Разные принтеры';

      const assemblyData: Partial<SavedCalculation> = {
        name: name.trim(),
        type: 'assembly',
        filament_name: primaryFilament,
        printer_name: primaryPrinter,
        weight_g: totals.totalWeight,
        hours: totals.totalHours,
        minutes: totals.totalMins,
        quantity: 1,
        base_cost: totals.grandBaseCost,
        final_price: totals.grandFinalPrice,
        assembly_parts: parts,
        assembly_hardware: hardware,
        assembly_labor_minutes: parseInt(laborMinutes, 10) || 0,
        assembly_labor_cost: totals.laborCost,
        is_owner_labor: isOwnerLabor,
      };

      await onSave(assemblyData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Ручные детали (без product_id)
  const customManualParts = parts.filter((p) => !p.product_id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
            <Box size={18} />
          </div>
          <div>
            <span className="text-white font-bold">
              {editingAssembly ? `Редактирование сборки: «${editingAssembly.name}»` : 'Конструктор сборного изделия'}
            </span>
            <div className="text-[11px] text-gray-400 font-normal">
              Объединение 3D-печатных деталей, покупного крепежа и ручного труда мастера
            </div>
          </div>
        </div>
      }
      maxWidth="3xl"
      footer={
        <div className="flex items-center justify-between gap-3 select-none w-full flex-wrap">
          {/* Сводные итоги сборки */}
          <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Себестоимость:</span>
              <strong className="text-white">{formatCurrency(totals.grandBaseCost, currencySymbol)}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Продажа:</span>
              <strong className="text-cyan-300 text-sm font-extrabold">{formatCurrency(totals.grandFinalPrice, currencySymbol)}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">
                +{formatCurrency(profit, currencySymbol)} (▲{marginPercent}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="border-[#242930] text-gray-300">
              Отмена
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isSaving || !name.trim() || parts.length === 0}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold px-4 py-2 rounded-xl shadow-md shadow-cyan-500/25 cursor-pointer"
            >
              {isSaving ? 'Сохранение...' : editingAssembly ? 'Сохранить сборку' : 'Создать сборку'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 select-none">
        {/* Название изделия */}
        <div className="bg-[#121620] p-3 rounded-2xl border border-cyan-500/30 shadow-inner">
          <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1.5">
            Название сборного изделия *
          </label>
          <input
            type="text"
            placeholder="например: Модульный держатель катушки филамента Pro на подшипниках"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
            autoFocus
            className="w-full bg-[#0b0f17] border border-[#242930] hover:border-cyan-500/50 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-colors font-medium"
          />
        </div>

        {/* 1. СЕКЦИЯ: 3D-Печатные детали (интуитивный список как в коллекциях) */}
        <div className="bg-[#121620] border border-[#242930] rounded-2xl overflow-hidden">
          {/* Плашка шапки 3D-деталей */}
          <div className="p-3 bg-gradient-to-r from-cyan-500/20 via-[#141d2b] to-[#0f1520] border-b border-[#242930] flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Box size={16} className="text-cyan-400" />
              <span className="font-bold text-cyan-300 uppercase tracking-wider text-xs">
                3D-Печатные детали ({parts.length})
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                {totals.totalWeight} г • {totals.totalHours}ч {totals.totalMins}м
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddCustomPart}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
              >
                <Plus size={13} />
                <span>+ Деталь вручную</span>
              </button>
            </div>
          </div>

          <div className="p-3 space-y-2.5">
            {/* Поисковая строка фильтра по каталогу */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Фильтр по названию или ID детали из каталога..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-[#090d14] border border-[#242930] hover:border-cyan-500/40 focus:border-cyan-400 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Список деталей каталога с выбором чекбоксами и степперами */}
            <div className="max-h-52 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {filteredSingleProducts.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-4 bg-[#090d14] rounded-xl border border-dashed border-[#242930]">
                  Детали не найдены
                </p>
              ) : (
                filteredSingleProducts.map((prod) => {
                  const partMatch = parts.find((p) => p.product_id === prod.id);
                  const isChecked = Boolean(partMatch);
                  const qty = partMatch?.quantity || 1;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleToggleCatalogProduct(prod)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'bg-cyan-500/15 border-cyan-500/60 text-white font-medium shadow-sm'
                          : 'bg-[#0a0e17] border-[#242930] text-gray-400 hover:text-white hover:bg-[#101622]'
                      }`}
                    >
                      {/* Чекбокс и параметры */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isChecked}
                            onChange={() => handleToggleCatalogProduct(prod)}
                            variant="primary"
                            size="sm"
                          />
                        </div>

                        {prod.filament_color && (
                          <div
                            className="w-3 h-3 rounded-full border border-black/40 shrink-0 shadow-inner"
                            style={{ backgroundColor: prod.filament_color }}
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <span className={`truncate block font-semibold ${isChecked ? 'text-cyan-100' : 'text-gray-300'}`}>
                            {prod.name}
                          </span>
                          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                            <span>#{prod.id ? (prod.id.length > 6 ? prod.id.slice(0, 6) : prod.id) : ''}</span>
                            <span>•</span>
                            <span>{prod.filament_name || 'PLA'}</span>
                            <span>•</span>
                            <span>{prod.weight_g}г</span>
                            <span>•</span>
                            <span>{prod.hours}ч {prod.minutes}м</span>
                          </div>
                        </div>
                      </div>

                      {/* Степпер количества (если выбрано) и стоимость */}
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        {isChecked && (
                          <div
                            className="flex items-center bg-[#070a0f] border border-cyan-500/40 rounded-lg p-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleUpdateCatalogPartQty(prod.id, -1, e)}
                              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-[#242930] cursor-pointer font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-cyan-300 text-xs">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleUpdateCatalogPartQty(prod.id, 1, e)}
                              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-[#242930] cursor-pointer font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        )}

                        <span className={`font-mono text-xs font-bold shrink-0 min-w-[70px] text-right ${isChecked ? 'text-cyan-300' : 'text-gray-400'}`}>
                          {formatCurrency((prod.final_price || 0) * (isChecked ? qty : 1), currencySymbol)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Ручные кастомные детали (если добавлены) */}
            {customManualParts.length > 0 && (
              <div className="pt-2 border-t border-[#242930] space-y-1.5">
                <span className="text-[11px] font-bold text-cyan-400/80 uppercase tracking-wider block">
                  Нестандартные детали ({customManualParts.length}):
                </span>
                {customManualParts.map((part, index) => {
                  const actualIndex = parts.findIndex((p) => p.id === part.id);
                  return (
                    <div
                      key={part.id || index}
                      className="flex items-center justify-between bg-[#0e131d] p-2 rounded-xl border border-cyan-500/30 text-xs gap-2"
                    >
                      <input
                        type="text"
                        value={part.name}
                        onChange={(e) =>
                          setParts((prev) =>
                            prev.map((p, i) => (i === actualIndex ? { ...p, name: e.target.value } : p))
                          )
                        }
                        className="bg-transparent border-b border-gray-700 focus:border-cyan-400 text-white font-medium outline-none text-xs flex-1 min-w-[120px]"
                      />

                      <div className="flex items-center gap-2 font-mono text-gray-300 text-[11px]">
                        <span>{part.weight_g}г</span>
                        <span>•</span>
                        <span className="text-cyan-300 font-bold">{formatCurrency(part.final_price, currencySymbol)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setParts((prev) => prev.filter((_, i) => i !== actualIndex))}
                        className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2. СЕКЦИЯ: Покупная фурнитура и метизы */}
        <div className="bg-[#10141f] border border-[#242930] rounded-2xl overflow-hidden">
          {/* Плашка шапки фурнитуры */}
          <div className="p-3 bg-gradient-to-r from-blue-500/20 via-[#121a28] to-[#0e131f] border-b border-[#242930] flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-blue-400" />
              <span className="font-bold text-blue-300 uppercase tracking-wider text-xs">
                Фурнитура и метизы ({hardware.length})
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold">
                {totalHwPieces} шт
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddHardware}
              className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
            >
              <Plus size={13} />
              <span>+ Метиз/Крепеж</span>
            </button>
          </div>

          <div className="p-3">
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {hardware.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-3 bg-[#0a0e17] rounded-xl text-center border border-dashed border-[#242930]">
                  Фурнитура и покупные крепежи пока не добавлены
                </p>
              ) : (
                hardware.map((hw, index) => {
                  const hwTotal = (hw.price_per_unit || 0) * (hw.quantity || 1);
                  return (
                    <div
                      key={hw.id || index}
                      className="flex items-center justify-between bg-[#0c1018] p-2.5 rounded-xl border border-[#242930] text-xs gap-3 hover:border-blue-500/30 transition-colors"
                    >
                      {/* Название */}
                      <div className="flex-1 min-w-[140px]">
                        <input
                          type="text"
                          value={hw.name}
                          placeholder="Название (напр. Винты M3x12)"
                          onChange={(e) =>
                            setHardware((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item))
                            )
                          }
                          className="bg-[#06090f] border border-[#242930] focus:border-blue-400 rounded-lg px-2.5 py-1 text-white font-medium text-xs w-full focus:outline-none"
                        />
                      </div>

                      {/* Кол-во, Цена за шт, Итог */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Степер количества */}
                        <div className="flex items-center bg-[#06090f] border border-[#242930] rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateHwQty(index, -1)}
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-[#242930] cursor-pointer font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-mono font-bold text-blue-300 text-xs">
                            {hw.quantity || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateHwQty(index, 1)}
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-[#242930] cursor-pointer font-bold text-xs"
                          >
                            +
                          </button>
                        </div>

                        {/* Цена за единицу */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400">Цена/шт:</span>
                          <input
                            type="number"
                            min="0"
                            value={hw.price_per_unit}
                            onChange={(e) =>
                              setHardware((prev) =>
                                prev.map((item, i) =>
                                  i === index ? { ...item, price_per_unit: parseFloat(e.target.value) || 0 } : item
                                )
                              )
                            }
                            className="w-14 bg-[#06090f] border border-[#242930] focus:border-blue-400 rounded-lg px-1.5 py-0.5 text-center text-blue-300 font-mono text-xs focus:outline-none"
                          />
                        </div>

                        {/* Итого за фурнитуру */}
                        <span className="font-mono font-bold text-blue-300 min-w-[55px] text-right">
                          {formatCurrency(hwTotal, currencySymbol)}
                        </span>

                        <button
                          type="button"
                          onClick={() => setHardware((prev) => prev.filter((_, i) => i !== index))}
                          className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Удалить позицию"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 3. СЕКЦИЯ: Ручная сборка и подгонка */}
        <div className="bg-[#0f1715] border border-emerald-500/30 rounded-2xl p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Wrench size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                  Ручная сборка и подгонка мастером
                </span>
                <span className="text-[11px] text-gray-400">
                  Время мастера на соединение деталей, подгонку и тестирование
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono">
              <div className="flex items-center gap-1.5 bg-[#08100e] border border-emerald-500/30 rounded-xl px-2.5 py-1">
                <Clock size={13} className="text-emerald-400" />
                <input
                  type="number"
                  min="0"
                  value={laborMinutes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLaborMinutes(e.target.value)}
                  className="w-12 bg-transparent text-center text-emerald-300 font-bold text-xs focus:outline-none"
                />
                <span className="text-[11px] text-gray-400">мин</span>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400 block">
                  +{formatCurrency(totals.laborCost, currencySymbol)}
                </span>
                <span className="text-[10px] text-gray-400">
                  {isOwnerLabor ? 'в чистую прибыль' : 'в себестоимости'}
                </span>
              </div>
            </div>
          </div>

          {/* Галочка: Личный труд владельца (не включать в себестоимость) */}
          <div
            onClick={() => setIsOwnerLabor(!isOwnerLabor)}
            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all select-none ${
              isOwnerLabor
                ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-100 shadow-sm'
                : 'bg-[#08100e]/70 border-[#242930] text-gray-400 hover:text-white hover:bg-[#0c1412]'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs min-w-0 flex-1">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isOwnerLabor}
                  onChange={() => setIsOwnerLabor(!isOwnerLabor)}
                  variant="emerald"
                  size="sm"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className={`font-semibold block ${isOwnerLabor ? 'text-emerald-200' : 'text-gray-300'}`}>
                  Собираю сам (труд идет в чистую прибыль, а не в затратную себестоимость)
                </span>
                <span className="text-[10px] text-gray-400 block">
                  Сумма за сборку не увеличивает затраты на изделие, а переходит в чистый доход
                </span>
              </div>
            </div>

            {isOwnerLabor && (
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 ml-2">
                В прибыль
              </span>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
