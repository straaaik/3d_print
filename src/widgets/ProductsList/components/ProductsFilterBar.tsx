import React, { useMemo } from 'react';
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
  CheckSquare,
  Search,
  X
} from 'lucide-react';
import { ProductFilter } from '../types';
import { CockpitDropdown, CockpitDropdownOption } from '../../../shared/ui/CockpitDropdown';
import { SelectOption } from '../../../shared/ui/Select';

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

  const tabs = [
    { id: 'all' as ProductFilter, label: 'Все', count: counts.all, icon: Package },
    { id: 'single' as ProductFilter, label: 'Товары', count: counts.single, icon: Box },
    { id: 'assembly' as ProductFilter, label: 'Сборки', count: counts.assembly, icon: Layers },
    { id: 'collections' as ProductFilter, label: 'Коллекции', count: counts.collections, icon: FolderPlus },
    { id: 'low_stock' as ProductFilter, label: 'Заканчиваются', count: counts.lowStock, icon: AlertTriangle, warning: counts.lowStock > 0 },
    { id: 'bestsellers' as ProductFilter, label: 'Хиты продаж', count: counts.bestsellers, icon: Flame },
  ];

  const categoryDropdownOptions: CockpitDropdownOption[] = useMemo(() => {
    return categoryFilterOptions
      .filter((opt) => opt.value !== '__new__')
      .map((opt) => ({
        value: String(opt.value),
        label: opt.label,
        icon: opt.icon,
      }));
  }, [categoryFilterOptions]);

  return (
    <div className="space-y-3 select-none font-sans">
      {/* Главный блок поиска, табов и фильтрации */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-2.5 rounded-xl bg-neutral-900/40 border border-white/10 backdrop-blur-md">
        {/* Поиск и категории */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          {/* Поисковое поле */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, ID, пластику..."
              className="w-full bg-neutral-950/80 border border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-xl pl-8 pr-7 py-1.5 text-xs font-mono text-white placeholder:text-neutral-500 transition-all outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Селектор категорий */}
          <div className="w-44 shrink-0">
            <CockpitDropdown
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryDropdownOptions}
              variant="pill"
              placeholder="Категория"
              dropdownWidth={220}
            />
          </div>
        </div>

        {/* Табы-фильтры по типу позиций */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = productFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProductFilter(tab.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? 'bg-white/10 text-white border-white/25 shadow-sm font-semibold'
                    : 'bg-white/[0.02] text-neutral-400 border-white/5 hover:border-white/15 hover:text-neutral-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : tab.warning
                    ? 'bg-amber-950/80 text-amber-400 border border-amber-800/40'
                    : 'bg-white/5 text-neutral-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Быстрые действия */}
        <div className="flex items-center gap-1.5 shrink-0">
          {canUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/40 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Отменить последнее действие (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ctrl+Z</span>
            </button>
          )}

          {totalSavedCalculationsCount > 0 && (
            <button
              type="button"
              onClick={onOpenBulkDelete}
              className="text-xs font-mono text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Очистить каталог товаров"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Очистить</span>
            </button>
          )}
        </div>
      </div>

      {/* Панель массовых действий при выборе чекбоксами */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 bg-neutral-900/90 border border-cyan-500/40 rounded-xl animate-fade-in shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 font-mono text-xs">
            <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-white">
              ВЫБРАНО ПОЗИЦИЙ: <strong className="text-cyan-400 font-bold text-sm">{selectedCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
            <button
              type="button"
              onClick={onOpenBatchMove}
              className="px-2.5 py-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 hover:bg-purple-950/70 text-purple-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>[ В коллекцию... ]</span>
            </button>

            <button
              type="button"
              onClick={onOpenRecalcModal}
              disabled={isRecalculating}
              className="px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 hover:bg-amber-950/70 text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>[ Пересчитать ({selectedCount}) ]</span>
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              className="px-2.5 py-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-transparent"
            >
              Снять выбор
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

