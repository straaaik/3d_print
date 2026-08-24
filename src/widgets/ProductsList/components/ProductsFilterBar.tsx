import React from 'react';
import { 
  Package, 
  Box, 
  Layers, 
  FolderPlus, 
  AlertTriangle, 
  Flame, 
  RotateCcw, 
  Trash2, 
  RefreshCw, 
  CheckSquare 
} from 'lucide-react';
import { ProductFilter } from '../types';
import { Button } from '../../../shared/ui/Button';
import { Select, SelectOption } from '../../../shared/ui/Select';
import { TableFilterBar, FilterTabItem } from '../../../shared/ui/TableFilterBar';

interface ProductsFilterBarProps {
  productFilter: ProductFilter;
  setProductFilter: (filter: ProductFilter) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categoryFilterOptions: SelectOption[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  counts: {
    all: number;
    single: number;
    assembly: number;
    collections: number;
    lowStock: number;
    bestsellers: number;
    displayed: number;
  };
  selectedIds: string[];
  totalSavedCalculationsCount: number;
  onClearSelection: () => void;
  onOpenBatchMove: () => void;
  onOpenRecalcModal: () => void;
  isRecalculating: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onOpenBulkDelete: () => void;
}

export const ProductsFilterBar = React.memo(function ProductsFilterBar({
  productFilter,
  setProductFilter,
  selectedCategory,
  setSelectedCategory,
  categoryFilterOptions,
  searchQuery,
  setSearchQuery,
  counts,
  selectedIds,
  totalSavedCalculationsCount,
  onClearSelection,
  onOpenBatchMove,
  onOpenRecalcModal,
  isRecalculating,
  canUndo,
  onUndo,
  onOpenBulkDelete,
}: ProductsFilterBarProps) {
  const selectedCount = selectedIds.length;

  const tabs: FilterTabItem<ProductFilter>[] = [
    { id: 'all', label: 'Все', count: counts.all, icon: Package, variant: 'default' },
    { id: 'single', label: 'Товары', count: counts.single, icon: Box, variant: 'default' },
    { id: 'assembly', label: 'Сборки', count: counts.assembly, icon: Layers, variant: 'cyan' },
    { id: 'collections', label: 'Коллекции', count: counts.collections, icon: FolderPlus, variant: 'purple' },
    { id: 'low_stock', label: 'Заканчиваются', count: counts.lowStock, icon: AlertTriangle, variant: 'rose' },
    { id: 'bestsellers', label: 'Хиты продаж', count: counts.bestsellers, icon: Flame, variant: 'amber' },
  ];

  return (
    <div className="space-y-3 select-none">
      {/* Единый горизонтальный блок фильтрации как в Заказах на базе переиспользуемого компонента TableFilterBar */}
      <TableFilterBar<ProductFilter>
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Поиск по ID, названию изделия, материалу или тегу..."
        tabs={tabs}
        activeTab={productFilter}
        onTabChange={setProductFilter}
        selects={
          <Select
            variant="compact"
            size="sm"
            dropdownWidth={180}
            options={categoryFilterOptions.filter((o) => o.value !== '__new__')}
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
          />
        }
        actions={
          <div className="flex items-center gap-1.5">
            {canUndo && (
              <button
                type="button"
                onClick={onUndo}
                className="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer font-semibold shadow-sm"
                title="Отменить последнее действие (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Отменить (Ctrl+Z)</span>
              </button>
            )}

            {totalSavedCalculationsCount > 0 && (
              <button
                type="button"
                onClick={onOpenBulkDelete}
                className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer font-semibold shadow-sm"
                title="Очистить каталог товаров"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Очистить каталог</span>
              </button>
            )}
          </div>
        }
      />

      {/* Плавающая панель массовых действий при выборе чекбоксами */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-amber-500/15 via-[#181c26] to-[#16181d] border border-amber-500/50 rounded-2xl animate-fade-in shadow-xl">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-white">
              Выбрано позиций: <strong className="text-amber-400 font-mono text-sm">{selectedCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenBatchMove}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/15 text-xs py-1.5 px-3 rounded-xl"
            >
              <FolderPlus size={13} className="mr-1" />
              <span>В коллекцию...</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onOpenRecalcModal}
              disabled={isRecalculating}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/15 text-xs py-1.5 px-3 rounded-xl"
            >
              <RefreshCw size={13} className={`mr-1 ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>Пересчитать ({selectedCount})</span>
            </Button>

            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Снять выбор
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
