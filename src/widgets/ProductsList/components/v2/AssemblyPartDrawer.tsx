'use client';

import React from 'react';
import {
  Layers,
  Printer,
  Clock,
  FileCode,
  ShoppingCart,
  Calculator,
  Edit2,
  X,
  Scale,
  TrendingUp,
  Percent,
} from 'lucide-react';
import {
  SavedCalculation,
  AssemblyPrintedPart,
} from '../../../../shared/types';
import { formatCurrency } from '../../../../shared/lib/format';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';

/**
 * Конвертирует печатную деталь сборки в самостоятельный расчет SavedCalculation (single)
 * для передачи в калькулятор, создание отдельного заказа или просмотрщик STL.
 */
export function convertPartToSavedCalculation(
  part: AssemblyPrintedPart,
  parentAssembly: SavedCalculation,
  partIndex: number
): SavedCalculation {
  return {
    id: part.id || `prt-${parentAssembly.id}-${partIndex}`,
    user_id: parentAssembly.user_id || '',
    name: part.name || `Деталь #${partIndex + 1}`,
    type: 'single',
    category: parentAssembly.category || 'Детали сборки',
    weight_g: part.weight_g || 0,
    hours: part.hours || 0,
    minutes: part.minutes || 0,
    quantity: part.quantity || 1,
    base_cost: part.base_cost || 0,
    final_price: part.final_price || part.base_cost || 0,
    filament_name: part.filament_name || 'PLA',
    filament_color: part.filament_color || '#06b6d4',
    printer_name: part.printer_name || '',
    stl_url: part.stl_url,
    stl_file_data: part.stl_file_data,
    stl_file_name: part.stl_file_name,
    created_at: parentAssembly.created_at || new Date().toISOString(),
  };
}

export interface AssemblyPartDrawerProps {
  part: AssemblyPrintedPart;
  partIndex: number;
  parentAssembly: SavedCalculation;
  currencySymbol?: string;
  onClose: () => void;
  onOpenQuickEditModal?: (item: SavedCalculation) => void;
  onCreateOrder?: (item: SavedCalculation) => void;
  onLoadIntoCalculator?: (item: SavedCalculation) => void;
  onOpenStlModal?: (item: SavedCalculation) => void;
}

export function AssemblyPartDrawer({
  part,
  partIndex,
  parentAssembly,
  currencySymbol = '₽',
  onClose,
  onOpenQuickEditModal,
  onCreateOrder,
  onLoadIntoCalculator,
  onOpenStlModal,
}: AssemblyPartDrawerProps) {
  const qty = Math.max(1, part.quantity || 1);
  const unitWeight = part.weight_g || 0;
  const totalWeight = unitWeight * qty;

  const unitHours = part.hours || 0;
  const unitMinutes = part.minutes || 0;
  const totalMinutesAll = (unitHours * 60 + unitMinutes) * qty;
  const totalHours = Math.floor(totalMinutesAll / 60);
  const totalMinutes = totalMinutesAll % 60;

  const unitCost = part.base_cost || 0;
  const totalCost = unitCost * qty;

  const unitPrice = part.final_price || part.base_cost || 0;
  const totalPrice = unitPrice * qty;

  const totalProfit = totalPrice - totalCost;
  const marginPercent = totalPrice > 0 ? (totalProfit / totalPrice) * 100 : 0;
  const markupPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const profitDisplay = totalProfit < 0
    ? `−${formatCurrency(Math.abs(totalProfit), currencySymbol)}`
    : totalProfit > 0
      ? `+${formatCurrency(totalProfit, currencySymbol)}`
      : formatCurrency(0, currencySymbol);

  const assemblyFinalPrice = parentAssembly.final_price || 0;
  const shareOfAssembly = assemblyFinalPrice > 0 ? (totalPrice / assemblyFinalPrice) * 100 : 0;

  const hasStl = Boolean(part.stl_url || part.stl_file_data || part.stl_file_name);
  const convertedPart = convertPartToSavedCalculation(part, parentAssembly, partIndex);
  const article = part.id ? `#${part.id.slice(0, 6)}` : `#PRT-${partIndex + 1}`;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="p-3 sm:p-4 font-mono text-xs select-none space-y-3 text-white border-y border-cyan-500/30 bg-cyan-950/20 backdrop-blur-md"
      style={{
        borderLeftWidth: '3px',
        borderLeftStyle: 'solid',
        borderLeftColor: '#06b6d4',
      }}
    >
      {/* Шапка меню детали */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-cyan-500/20 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shrink-0">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>ПЕЧАТНАЯ ДЕТАЛЬ</span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 font-semibold shrink-0">
            {article}
          </span>
          <span className="font-sans font-semibold text-sm text-white truncate" title={part.name}>
            {part.name || 'Деталь без названия'}
          </span>
          <span className="text-neutral-500 text-[11px] hidden md:inline">
            в составе «{parentAssembly.name}»
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            title="Свернуть меню детали"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Свернуть</span>
          </button>
        </div>
      </div>

      {/* 3 карточки телеметрии */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Карточка 1: Материал и 3D-принтер */}
        <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-neutral-950/70 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-cyan-400/80 uppercase tracking-wider font-semibold border-b border-white/5 pb-1">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>Параметры печати</span>
            </span>
            <span className="text-neutral-500">3D-LABS</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Материал:</span>
              <span className="inline-flex items-center gap-1.5 text-neutral-200">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                  style={{ backgroundColor: part.filament_color || '#06b6d4' }}
                />
                <span className="font-medium">{part.filament_name || 'PLA'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400">3D-принтер:</span>
              <span className="text-neutral-200 flex items-center gap-1">
                <Printer className="w-3 h-3 text-cyan-400" />
                <span>{part.printer_name || 'Не назначен'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400">3D-модель (STL):</span>
              {hasStl ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 inline-flex items-center gap-1">
                  <FileCode className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[110px]">{part.stl_file_name || 'Файл STL'}</span>
                </span>
              ) : (
                <span className="text-neutral-600 font-mono text-[10px]">Отсутствует</span>
              )}
            </div>
          </div>
        </div>

        {/* Карточка 2: Время, вес и тираж */}
        <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-neutral-950/70 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-cyan-400/80 uppercase tracking-wider font-semibold border-b border-white/5 pb-1">
            <span className="flex items-center gap-1">
              <Scale className="w-3 h-3" />
              <span>Вес, время и тираж</span>
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/40 tabular-nums">
              {qty} шт в сборке
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Вес пластика:</span>
              <div className="text-right">
                <span className="text-neutral-200 font-bold tabular-nums">{totalWeight} г</span>
                {qty > 1 && unitWeight > 0 && (
                  <span className="text-neutral-500 text-[10px] ml-1 tabular-nums">
                    ({unitWeight} г/шт)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Время печати:</span>
              <div className="text-right text-neutral-200 tabular-nums flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span className="font-bold">
                  {totalHours > 0 ? `${totalHours}ч ` : ''}{totalMinutes}м
                </span>
                {qty > 1 && (unitHours > 0 || unitMinutes > 0) && (
                  <span className="text-neutral-500 text-[10px] tabular-nums">
                    ({unitHours ? `${unitHours}ч ` : ''}{unitMinutes}м/шт)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Тираж в сборке:</span>
              <span className="text-cyan-300 font-bold tabular-nums">
                {qty} шт
              </span>
            </div>
          </div>
        </div>

        {/* Карточка 3: Экономика и маржинальность */}
        <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-neutral-950/70 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-cyan-400/80 uppercase tracking-wider font-semibold border-b border-white/5 pb-1">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Экономика и маржа</span>
            </span>
            <span className="text-neutral-400 text-[10px] tabular-nums flex items-center gap-0.5">
              <Percent className="w-2.5 h-2.5 text-cyan-400" />
              <span>{shareOfAssembly.toFixed(1)}% сборки</span>
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Себестоимость:</span>
              <div className="text-right">
                <span className="text-neutral-300 tabular-nums">{formatCurrency(totalCost, currencySymbol)}</span>
                {qty > 1 && unitCost > 0 && (
                  <span className="text-neutral-500 text-[10px] ml-1 tabular-nums">
                    ({formatCurrency(unitCost, currencySymbol)}/шт)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Цена продажи:</span>
              <div className="text-right">
                <span className="text-white font-bold tabular-nums">{formatCurrency(totalPrice, currencySymbol)}</span>
                {qty > 1 && unitPrice > 0 && (
                  <span className="text-neutral-500 text-[10px] ml-1 tabular-nums">
                    ({formatCurrency(unitPrice, currencySymbol)}/шт)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-neutral-400">Прибыль:</span>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold tabular-nums ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {profitDisplay}
                </span>
                <span className="text-[10px] text-neutral-400 tabular-nums">
                  ({marginPercent.toFixed(1)}% маржа, +{markupPercent.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Панель действий Cockpit */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-cyan-500/20">
        <div className="flex items-center gap-1.5 flex-wrap">
          {onLoadIntoCalculator && (
            <CockpitButton
              size="sm"
              icon={Calculator}
              onClick={() => onLoadIntoCalculator(convertedPart)}
              title="Загрузить параметры детали в калькулятор 3D-печати"
            >
              В калькулятор
            </CockpitButton>
          )}

          {onCreateOrder && (
            <CockpitButton
              size="sm"
              icon={ShoppingCart}
              onClick={() => onCreateOrder(convertedPart)}
              isActive
              title="Создать черновик заказа на эту деталь"
            >
              Создать заказ
            </CockpitButton>
          )}

          {hasStl && onOpenStlModal && (
            <CockpitButton
              size="sm"
              icon={FileCode}
              onClick={() => onOpenStlModal(convertedPart)}
              title="Открыть интерактивный 3D просмотрщик STL"
            >
              Просмотр STL
            </CockpitButton>
          )}

          {onOpenQuickEditModal && (
            <CockpitButton
              size="sm"
              icon={Edit2}
              onClick={() => onOpenQuickEditModal(parentAssembly)}
              title="Открыть спецификацию сборки для редактирования состава"
            >
              Редактировать сборку
            </CockpitButton>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 rounded-md text-[11px] font-mono text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors"
        >
          [ Закрыть ]
        </button>
      </div>
    </div>
  );
}
