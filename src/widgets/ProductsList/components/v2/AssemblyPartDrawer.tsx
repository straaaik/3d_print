'use client';

import React from 'react';
import {
  SavedCalculation,
  AssemblyPrintedPart,
  Filament,
} from '../../../../shared/types';
import { CatalogTableRow, SalesStatInfo } from '../../types';
import { ProductRowDrawer } from './ProductRowDrawer';

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
    stock_quantity: part.quantity || 1,
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
  onInlineUpdateProduct?: (productId: string, updates: Partial<SavedCalculation>) => void;
  categoriesList?: { id: string; label: string }[];
  filaments?: Filament[];
  salesStat?: SalesStatInfo;
}

/**
 * Выдвижное меню печатной детали сборки.
 * Полностью идентично меню обычных строк каталога (ProductRowDrawer),
 * обеспечивая сквозное редактирование параметров детали в спецификации сборки.
 */
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
  onInlineUpdateProduct,
  categoriesList,
  filaments,
  salesStat,
}: AssemblyPartDrawerProps) {
  const partCalc = convertPartToSavedCalculation(part, parentAssembly, partIndex);

  const partRow: CatalogTableRow = {
    rowKind: 'product',
    id: partCalc.id,
    item: partCalc,
    parentCollectionName: parentAssembly.name,
    parentCollectionColor: '#06b6d4',
    isPart: true,
    name: partCalc.name,
    category: partCalc.category,
    final_price: partCalc.final_price,
    base_cost: partCalc.base_cost,
    stock_quantity: partCalc.quantity,
    weight_g: partCalc.weight_g,
    hours: partCalc.hours,
    minutes: partCalc.minutes,
    created_at: partCalc.created_at,
  };

  const handleInlineUpdateProduct = (_partId: string, updates: Partial<SavedCalculation>) => {
    if (!onInlineUpdateProduct) return;
    const currentParts = parentAssembly.assembly_parts || [];
    const nextParts = currentParts.map((p, idx) => {
      if (idx === partIndex || (p.id && p.id === part.id)) {
        return {
          ...p,
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.final_price !== undefined ? { final_price: updates.final_price } : {}),
          ...(updates.base_cost !== undefined ? { base_cost: updates.base_cost } : {}),
          ...(updates.weight_g !== undefined ? { weight_g: updates.weight_g } : {}),
          ...(updates.hours !== undefined ? { hours: updates.hours } : {}),
          ...(updates.minutes !== undefined ? { minutes: updates.minutes } : {}),
          ...(updates.quantity !== undefined ? { quantity: updates.quantity } : {}),
          ...(updates.stock_quantity !== undefined ? { quantity: updates.stock_quantity } : {}),
          ...(updates.printer_name !== undefined ? { printer_name: updates.printer_name } : {}),
          ...(updates.filament_name !== undefined ? { filament_name: updates.filament_name } : {}),
          ...(updates.filament_color !== undefined ? { filament_color: updates.filament_color } : {}),
        };
      }
      return p;
    });

    onInlineUpdateProduct(parentAssembly.id, {
      assembly_parts: nextParts,
    });
  };

  const handleSetStock = (_item: SavedCalculation, newStock: number) => {
    if (!onInlineUpdateProduct) return;
    const currentParts = parentAssembly.assembly_parts || [];
    const nextParts = currentParts.map((p, idx) => {
      if (idx === partIndex || (p.id && p.id === part.id)) {
        return {
          ...p,
          quantity: Math.max(1, newStock),
        };
      }
      return p;
    });

    onInlineUpdateProduct(parentAssembly.id, {
      assembly_parts: nextParts,
    });
  };

  const handleOpenQuickEditModal = () => {
    onOpenQuickEditModal?.(parentAssembly);
  };

  return (
    <div className="w-full">
      <ProductRowDrawer
        row={partRow}
        currencySymbol={currencySymbol}
        onInlineUpdateProduct={handleInlineUpdateProduct}
        onSetStock={handleSetStock}
        onOpenQuickEditModal={handleOpenQuickEditModal}
        onOpenStlModal={onOpenStlModal}
        onLoadIntoCalculator={onLoadIntoCalculator}
        onCreateOrder={onCreateOrder}
        onClose={onClose}
        categoriesList={categoriesList}
        filaments={filaments}
        salesStat={salesStat}
      />
    </div>
  );
}
