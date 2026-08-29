import React from 'react';
import { 
  Search, 
  X
} from 'lucide-react';
import { StockFilter, SortField, SortOrder } from '../../types';
import { ProductCategory } from '@/shared/lib/categories';
import { CockpitDropdown, CockpitDropdownOption } from '@/shared/ui/CockpitDropdown';
import { Tooltip } from '@/shared/ui/Tooltip';

interface ProductsV2FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  stockFilter: StockFilter;
  setStockFilter: (stock: StockFilter) => void;

  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categoriesList: ProductCategory[];

  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

export const ProductsV2FilterBar = React.memo(function ProductsV2FilterBar({
  searchQuery,
  setSearchQuery,
  stockFilter,
  setStockFilter,
  selectedCategory,
  setSelectedCategory,
  categoriesList,
  sortField,
  sortOrder,
  onSort,
}: ProductsV2FilterBarProps) {
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const isSearchActive = isSearchFocused || Boolean(searchQuery);

  // Опции категорий для CockpitDropdown
  const categoryDropdownOptions: CockpitDropdownOption[] = React.useMemo(() => {
    const opts: CockpitDropdownOption[] = [
      { value: 'all', label: 'Все категории', statusDotColor: 'gray' },
    ];
    categoriesList.forEach((cat) => {
      opts.push({
        value: cat.id,
        label: cat.label,
        statusDotColor: 'cyan',
      });
    });
    return opts;
  }, [categoriesList]);

  // Опции остатков для CockpitDropdown
  const stockDropdownOptions: CockpitDropdownOption[] = React.useMemo(() => {
    return [
      { value: 'all', label: 'Все остатки', statusDotColor: 'gray' },
      { value: 'in_stock', label: 'В наличии (>0)', statusDotColor: 'green' },
      { value: 'low_stock', label: 'Мало (≤2 шт)', statusDotColor: 'orange' },
      { value: 'out_of_stock', label: 'Под заказ (0)', statusDotColor: 'red' },
    ];
  }, []);

  // Опции сортировки для CockpitDropdown
  const sortDropdownOptions: CockpitDropdownOption[] = React.useMemo(() => {
    return [
      { value: 'name', label: 'По названию' },
      { value: 'price', label: 'По цене' },
      { value: 'cost', label: 'По себестоимости' },
      { value: 'profit', label: 'По прибыли / марже' },
      { value: 'stock', label: 'По остатку' },
      { value: 'date', label: 'По дате добавления' },
      { value: 'sales', label: 'По продажам' },
    ];
  }, []);

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 sm:px-3 sm:py-2 select-none shadow-sm flex flex-wrap items-center justify-between gap-2.5 relative z-30">
      
      {/* 1. СЛЕВА: Просторное поле поиска */}
      <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl flex-1 min-w-[200px] max-w-sm sm:max-w-md h-10 shadow-inner flex items-center">
        <div
          className={`flex items-center w-full h-full px-2.5 rounded-lg text-xs font-mono transition-all ${
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
            placeholder="Поиск по названию, артикулу, пластику..."
            className="w-full h-full bg-transparent text-xs font-mono text-white placeholder:text-neutral-500 outline-none"
          />
          {searchQuery && (
            <Tooltip content="Очистить поиск">
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors shrink-0 ml-1"
              >
                <X size={12} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 2. СПРАВА: Выпадающие меню фильтрации и сортировки */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {/* Фильтр по категории */}
        <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl w-[150px] sm:w-[160px] h-10 shrink-0 shadow-inner flex items-center">
          <CockpitDropdown
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categoryDropdownOptions}
            variant="filter"
            align="left"
            className="w-full h-full"
            placeholder="Все категории"
            hideStatusDot
          />
        </div>

        {/* Фильтр по остаткам */}
        <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl w-[150px] sm:w-[160px] h-10 shrink-0 shadow-inner flex items-center">
          <CockpitDropdown
            value={stockFilter}
            onChange={(v) => setStockFilter(v as StockFilter)}
            options={stockDropdownOptions}
            variant="filter"
            align="left"
            className="w-full h-full"
            placeholder="Все остатки"
          />
        </div>

        {/* Сортировка */}
        <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl w-[150px] sm:w-[160px] h-10 shrink-0 shadow-inner flex items-center">
          <CockpitDropdown
            value={sortField}
            onChange={(v) => onSort(v as SortField)}
            options={sortDropdownOptions}
            variant="filter"
            align="right"
            className="w-full h-full"
            placeholder="Сортировка"
            hideStatusDot
          />
        </div>
      </div>

    </div>
  );
});
