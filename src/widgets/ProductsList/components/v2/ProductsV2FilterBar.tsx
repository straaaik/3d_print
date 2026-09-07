'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  X,
  Layers,
  Package,
  Boxes,
  FolderPlus,
  Flame,
  RotateCcw,
  Tag
} from 'lucide-react';
import { ProductFilter, StockFilter } from '../../types';
import { ProductCategory, getCategoryLucideIcon } from '../../../../shared/lib/categories';
import { CockpitDropdown, CockpitDropdownOption } from '../../../../shared/ui/CockpitDropdown';
import { SegmentedFilter, SegmentedFilterOption } from '../../../../shared/ui/SegmentedFilter';
import { Tooltip } from '../../../../shared/ui/Tooltip';

interface ProductsV2FilterBarProps {
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

  onResetFilters?: () => void;
}

export const ProductsV2FilterBar = React.memo(function ProductsV2FilterBar({
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
  onResetFilters,
}: ProductsV2FilterBarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isSearchActive = isSearchFocused || Boolean(searchQuery);

  // Опции для SegmentedFilter типов
  const typeFilterOptions: ReadonlyArray<SegmentedFilterOption<ProductFilter>> = useMemo(() => [
    { value: 'all', label: 'Все', icon: Layers, badge: counts.all },
    { value: 'single', label: 'Штучные', icon: Package, badge: counts.single },
    { value: 'assembly', label: 'Сборки', icon: Boxes, badge: counts.assembly },
    { value: 'collections', label: 'Коллекции', icon: FolderPlus, badge: counts.collections },
  ], [counts.all, counts.single, counts.assembly, counts.collections]);

  // Опции для выпадающего списка остатка
  const stockDropdownOptions: CockpitDropdownOption[] = useMemo(() => [
    { value: 'all', label: 'Все остатки', statusDotColor: 'gray', badge: String(counts.all) },
    { value: 'in_stock', label: 'В наличии', statusDotColor: 'green', badge: String(counts.inStock) },
    { value: 'low_stock', label: 'Мало (≤2 шт)', statusDotColor: 'orange', badge: String(counts.lowStock) },
    { value: 'out_of_stock', label: 'Нет на складе', statusDotColor: 'red', badge: String(counts.outOfStock) },
  ], [counts.all, counts.inStock, counts.lowStock, counts.outOfStock]);

  // Опции категорий
  const categoryDropdownOptions: CockpitDropdownOption[] = useMemo(() => {
    const allOpt: CockpitDropdownOption = {
      value: 'all',
      label: 'Все категории',
      icon: Tag,
    };
    const catOpts: CockpitDropdownOption[] = categoriesList.map((cat) => ({
      value: cat.label,
      label: cat.label,
      icon: getCategoryLucideIcon(cat.label),
    }));
    return [allOpt, ...catOpts];
  }, [categoriesList]);

  // Активны ли фильтры (для кнопки быстрого сброса)
  const hasActiveFilters = Boolean(
    searchQuery ||
    productFilter !== 'all' ||
    stockFilter !== 'all' ||
    onlyBestsellers ||
    (selectedCategories.length > 0 && !selectedCategories.includes('all'))
  );

  const handleReset = () => {
    setSearchQuery('');
    setProductFilter('all');
    setStockFilter('all');
    setOnlyBestsellers(false);
    setSelectedCategories(['all']);
    onResetFilters?.();
  };

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 sm:px-3 sm:py-2 select-none shadow-sm flex flex-wrap items-center justify-between gap-2.5 relative z-30">

      {/* 1. СЛЕВА: Поиск в стиле капсулы */}
      <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl w-48 sm:w-56 h-10 shrink-0 shadow-inner flex items-center">
        <div
          className={`flex items-center w-full h-full px-2.5 rounded-lg text-xs font-mono ${
            isSearchActive
              ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
              : 'bg-transparent border border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-neutral-400 mr-2 shrink-0 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Поиск товаров..."
            className="w-full h-full bg-transparent text-xs font-mono text-white placeholder:text-neutral-500 outline-none"
          />
          {searchQuery && (
            <Tooltip content="Очистить поиск">
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer shrink-0 ml-1"
              >
                <X size={12} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 2. ПО ЦЕНТРУ: Сегментированный переключатель типов (Motion Spring) */}
      <SegmentedFilter
        value={productFilter}
        onChange={setProductFilter}
        options={typeFilterOptions}
        ariaLabel="Тип позиций каталога"
      />

      {/* 3. СПРАВА: Выпадающие списки и опции (Унифицированная высота h-10) */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {/* Фильтр по остаткам (w-[155px] h-10) */}
        <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl w-[155px] h-10 shrink-0 shadow-inner flex items-center">
          <CockpitDropdown
            value={stockFilter}
            onChange={(val) => setStockFilter(val as StockFilter)}
            options={stockDropdownOptions}
            variant="filter"
            align="right"
            className="w-full h-full"
            placeholder="Остаток"
          />
        </div>

        {/* Фильтр по категориям (w-[160px] h-10) */}
        <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl w-[160px] h-10 shrink-0 shadow-inner flex items-center">
          <CockpitDropdown
            multiSelect={true}
            values={selectedCategories}
            onMultiChange={setSelectedCategories}
            options={categoryDropdownOptions}
            variant="filter"
            align="right"
            className="w-full h-full"
            placeholder="Категория"
            hideStatusDot
          />
        </div>

        {/* Кнопка-тумблер «Хиты» */}
        <button
          type="button"
          onClick={() => setOnlyBestsellers(!onlyBestsellers)}
          className={`flex items-center gap-1.5 px-3 h-10 rounded-xl border text-xs font-mono font-medium cursor-pointer select-none ${
            onlyBestsellers
              ? 'bg-amber-950/50 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
              : 'bg-neutral-950/80 border-white/10 text-neutral-400 hover:text-neutral-200 hover:border-white/20'
          }`}
          title="Показать только хиты продаж"
        >
          <Flame className={`w-3.5 h-3.5 ${onlyBestsellers ? 'text-amber-400' : 'text-neutral-500'}`} />
          <span>Хиты</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
            onlyBestsellers ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-white/5 text-neutral-400'
          }`}>
            {counts.bestsellers}
          </span>
        </button>

        {/* Кнопка сброса активных фильтров */}
        {hasActiveFilters && (
          <Tooltip content="Сбросить все фильтры">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-neutral-950/80 text-neutral-400 hover:text-white hover:border-white/25 hover:bg-white/5 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        )}
      </div>

    </div>
  );
});
