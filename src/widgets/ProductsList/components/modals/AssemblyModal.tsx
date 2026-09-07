import React, { useId, useMemo, useRef, useState } from 'react';
import { AssemblyPrintedPart, AssemblyHardwareItem, SavedCalculation, Filament, Printer } from '../../../../shared/types';
import { Modal } from '../../../../shared/ui/Modal';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import { Checkbox } from '../../../../shared/ui/Checkbox';
import { Tooltip } from '../../../../shared/ui/Tooltip';
import {
  Trash2,
  Box,
  Layers,
  Plus,
  Wrench,
  Clock,
  Search,
  X
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
  const [previousSource, setPreviousSource] = useState({ isOpen, editingAssembly, stagedParts });
  const localIdPrefix = useId();
  const nextLocalIdRef = useRef(0);

  if (
    previousSource.isOpen !== isOpen ||
    previousSource.editingAssembly !== editingAssembly ||
    previousSource.stagedParts !== stagedParts
  ) {
    setPreviousSource({ isOpen, editingAssembly, stagedParts });
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
  }

  const singleProducts = useMemo(() => {
    return savedCalculations.filter((c) => c.type !== 'assembly');
  }, [savedCalculations]);

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

  const handleToggleCatalogProduct = (prod: SavedCalculation) => {
    const existingIndex = parts.findIndex((p) => p.product_id === prod.id);
    if (existingIndex >= 0) {
      setParts((prev) => prev.filter((_, i) => i !== existingIndex));
    } else {
      nextLocalIdRef.current += 1;
      const newPart: AssemblyPrintedPart = {
        id: `${localIdPrefix}-catalog-${nextLocalIdRef.current}`,
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

  const handleAddCustomPart = () => {
    const defaultFilament = filaments[0];
    const defaultPrinter = printers[0];
    nextLocalIdRef.current += 1;

    const newPart: AssemblyPrintedPart = {
      id: `${localIdPrefix}-custom-${nextLocalIdRef.current}`,
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

  const handleAddHardware = () => {
    nextLocalIdRef.current += 1;
    const newHw: AssemblyHardwareItem = {
      id: `${localIdPrefix}-hardware-${nextLocalIdRef.current}`,
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

  const customManualParts = parts.filter((p) => !p.product_id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingAssembly ? 'Редактирование сборки' : 'Новая сборка'}
      subtitle={editingAssembly ? editingAssembly.name : 'Конструктор составного изделия'}
      maxWidth="3xl"
      footer={
        <div className="flex items-center justify-between gap-3 select-none w-full flex-wrap font-mono text-xs">
          {/* Сводные итоги сборки */}
          <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-neutral-500 uppercase">Себестоимость:</span>
              <strong className="text-neutral-200">{formatCurrency(totals.grandBaseCost, currencySymbol)}</strong>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-neutral-500 uppercase">Продажа:</span>
              <strong className="text-white font-bold">{formatCurrency(totals.grandFinalPrice, currencySymbol)}</strong>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-emerald-400 font-bold">
                +{formatCurrency(profit, currencySymbol)} ({marginPercent}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CockpitButton type="button" onClick={onClose} disabled={isSaving}>
              Закрыть
            </CockpitButton>
            <CockpitButton
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !name.trim() || parts.length === 0}
              isActive={true}
              className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
            >
              {isSaving ? 'Сохранение...' : editingAssembly ? 'Сохранить сборку' : 'Создать сборку'}
            </CockpitButton>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 pt-1 select-none font-mono text-xs">
        {/* Название изделия */}
        <div className="bg-neutral-900 p-3 rounded-xl border border-white/10">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
            Название сборного изделия *
          </label>
          <input
            type="text"
            placeholder="например: Модульный держатель катушки филамента Pro на подшипниках"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
            autoFocus
            className="w-full bg-neutral-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors font-mono"
          />
        </div>

        {/* 1. СЕКЦИЯ: 3D-Печатные детали */}
        <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-3 bg-neutral-950 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Box size={14} className="text-cyan-400" />
              <span className="font-bold text-neutral-300 uppercase tracking-wider text-xs font-mono">
                3D-Печатные детали ({parts.length})
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-neutral-300 text-[10px] font-mono">
                {totals.totalWeight} г • {totals.totalHours}ч {totals.totalMins}м
              </span>
            </div>

            <CockpitButton
              type="button"
              onClick={handleAddCustomPart}
              icon={Plus}
            >
              Деталь вручную
            </CockpitButton>
          </div>

          <div className="p-3 space-y-2">
            {/* Поисковая строка */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Фильтр деталей из каталога..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 focus:border-cyan-400 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition-colors font-mono"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Список деталей каталога */}
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredSingleProducts.length === 0 ? (
                <p className="text-center text-xs text-neutral-500 py-3 bg-neutral-950 rounded-lg">
                  [ Детали не найдены ]
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
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'bg-white/10 border-white/20 text-white font-medium'
                          : 'bg-neutral-950 border-white/5 text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
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
                            className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: prod.filament_color }}
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <span className={`truncate block font-mono text-xs ${isChecked ? 'text-white font-bold' : 'text-neutral-300'}`}>
                            {prod.name}
                          </span>
                          <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1.5">
                            <span>{prod.filament_name || 'PLA'}</span>
                            <span>•</span>
                            <span>{prod.weight_g}г</span>
                            <span>•</span>
                            <span>{prod.hours}ч {prod.minutes}м</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {isChecked && (
                          <div
                            className="flex items-center bg-neutral-900 border border-white/10 rounded p-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleUpdateCatalogPartQty(prod.id, -1, e)}
                              className="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-white/10 cursor-pointer font-mono font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-mono font-bold text-white text-xs">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleUpdateCatalogPartQty(prod.id, 1, e)}
                              className="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-white/10 cursor-pointer font-mono font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        )}

                        <span className={`font-mono text-xs font-bold shrink-0 min-w-[65px] text-right ${isChecked ? 'text-cyan-400' : 'text-neutral-500'}`}>
                          {formatCurrency((prod.final_price || 0) * (isChecked ? qty : 1), currencySymbol)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Ручные кастомные детали */}
            {customManualParts.length > 0 && (
              <div className="pt-2 border-t border-white/10 space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">
                  Нестандартные детали ({customManualParts.length}):
                </span>
                {customManualParts.map((part, index) => {
                  const actualIndex = parts.findIndex((p) => p.id === part.id);
                  return (
                    <div
                      key={part.id || index}
                      className="flex items-center justify-between bg-neutral-950 p-2 rounded-lg border border-white/10 text-xs gap-2"
                    >
                      <input
                        type="text"
                        value={part.name}
                        onChange={(e) =>
                          setParts((prev) =>
                            prev.map((p, i) => (i === actualIndex ? { ...p, name: e.target.value } : p))
                          )
                        }
                        className="bg-transparent border-b border-neutral-700 focus:border-cyan-400 text-white font-mono outline-none text-xs flex-1 min-w-[120px]"
                      />

                      <div className="flex items-center gap-2 font-mono text-neutral-300 text-[10px]">
                        <span>{part.weight_g}г</span>
                        <span>•</span>
                        <span className="text-cyan-400 font-bold">{formatCurrency(part.final_price, currencySymbol)}</span>
                      </div>

                      <Tooltip content="Удалить деталь">
                        <button
                          type="button"
                          onClick={() => setParts((prev) => prev.filter((_, i) => i !== actualIndex))}
                          className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2. СЕКЦИЯ: Покупная фурнитура */}
        <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-3 bg-neutral-950 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-purple-400" />
              <span className="font-bold text-neutral-300 uppercase tracking-wider text-xs font-mono">
                Фурнитура и метизы ({hardware.length})
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-neutral-300 text-[10px] font-mono">
                {totalHwPieces} шт
              </span>
            </div>

            <CockpitButton
              type="button"
              onClick={handleAddHardware}
              icon={Plus}
            >
              Метиз/Крепеж
            </CockpitButton>
          </div>

          <div className="p-3">
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
              {hardware.length === 0 ? (
                <p className="text-xs text-neutral-500 italic p-3 bg-neutral-950 rounded-lg text-center font-mono">
                  [ Фурнитура и покупные крепежи не добавлены ]
                </p>
              ) : (
                hardware.map((hw, index) => {
                  const hwTotal = (hw.price_per_unit || 0) * (hw.quantity || 1);
                  return (
                    <div
                      key={hw.id || index}
                      className="flex items-center justify-between bg-neutral-950 p-2 rounded-lg border border-white/10 text-xs gap-2"
                    >
                      <div className="flex-1 min-w-[120px]">
                        <input
                          type="text"
                          value={hw.name}
                          placeholder="Название (напр. Винты M3x12)"
                          onChange={(e) =>
                            setHardware((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item))
                            )
                          }
                          className="bg-neutral-900 border border-white/10 focus:border-cyan-400 rounded px-2 py-1 text-white font-mono text-xs w-full focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-neutral-900 border border-white/10 rounded p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateHwQty(index, -1)}
                            className="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-white/10 cursor-pointer font-mono font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-mono font-bold text-white text-xs">
                            {hw.quantity || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateHwQty(index, 1)}
                            className="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-white/10 cursor-pointer font-mono font-bold text-xs"
                          >
                            +
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-neutral-500 uppercase">Цена:</span>
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
                            className="w-12 bg-neutral-900 border border-white/10 focus:border-cyan-400 rounded px-1 py-0.5 text-center text-white font-mono text-xs focus:outline-none"
                          />
                        </div>

                        <span className="font-mono font-bold text-white min-w-[50px] text-right">
                          {formatCurrency(hwTotal, currencySymbol)}
                        </span>

                        <Tooltip content="Удалить фурнитуру">
                          <button
                            type="button"
                            onClick={() => setHardware((prev) => prev.filter((_, i) => i !== index))}
                            className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 3. СЕКЦИЯ: Ручная сборка */}
        <div className="bg-neutral-900 border border-white/10 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                <Wrench size={14} />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider block font-mono">
                  Ручная сборка и подгонка
                </span>
                <span className="text-[10px] text-neutral-400 font-sans">
                  Время мастера на соединение деталей и тестирование
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono">
              <div className="flex items-center gap-1.5 bg-neutral-950 border border-white/10 rounded-lg px-2 py-1">
                <Clock size={12} className="text-cyan-400" />
                <input
                  type="number"
                  min="0"
                  value={laborMinutes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLaborMinutes(e.target.value)}
                  className="w-10 bg-transparent text-center text-white font-bold text-xs focus:outline-none font-mono"
                />
                <span className="text-[10px] text-neutral-500">мин</span>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400 block font-mono">
                  +{formatCurrency(totals.laborCost, currencySymbol)}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {isOwnerLabor ? 'в прибыль' : 'в себестоимость'}
                </span>
              </div>
            </div>
          </div>

          <div
            onClick={() => setIsOwnerLabor(!isOwnerLabor)}
            className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all select-none ${
              isOwnerLabor
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-neutral-950 border-white/5 text-neutral-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 text-xs min-w-0 flex-1">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isOwnerLabor}
                  onChange={() => setIsOwnerLabor(!isOwnerLabor)}
                  variant="emerald"
                  size="sm"
                />
              </div>
              <div className="min-w-0 flex-1 font-sans text-xs">
                <span>Личный труд владельца (оплата сборки переходит в чистую прибыль)</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
