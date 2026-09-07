import React from 'react';
import {
  Search,
  X,
  Layers,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { getOrderMonthKey } from '../../helpers';
import { ALL_CLIENTS, Order, OrderTypeFilter, PaymentFilter } from '../../types';
import { CockpitDropdown, CockpitDropdownOption } from '@/shared/ui/CockpitDropdown';
import { SegmentedFilter, type SegmentedFilterOption } from '@/shared/ui/SegmentedFilter';
import { Tooltip } from '@/shared/ui/Tooltip';
import { MonthSelector } from '@/shared/ui/MonthSelector';

interface OrdersV2FilterBarProps {
  orders: Order[];
  selectedMonthKey: string;
  setSelectedMonthKey: (key: string) => void;
  availableMonthKeys: string[];
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  monthOrdersCount: number;
  onOpenClearMonthModal: () => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  typeFilter: OrderTypeFilter;
  setTypeFilter: (filter: OrderTypeFilter) => void;

  clientFilter: string;
  setClientFilter: (client: string) => void;

  paymentFilter: PaymentFilter;
  setPaymentFilter: (payment: PaymentFilter) => void;

  totalFilteredCount: number;
  inProgressCount: number;
  completedCount: number;
  incomeOrdersCount: number;
  expenseCount: number;
}

export const OrdersV2FilterBar = React.memo(function OrdersV2FilterBar({
  orders,
  selectedMonthKey,
  setSelectedMonthKey,
  availableMonthKeys,
  handlePrevMonth,
  handleNextMonth,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  clientFilter,
  setClientFilter,
  paymentFilter,
  setPaymentFilter,
  totalFilteredCount,
  inProgressCount,
  completedCount,
  incomeOrdersCount,
  expenseCount,
}: OrdersV2FilterBarProps) {
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const isSearchActive = isSearchFocused || Boolean(searchQuery);

  // Подсчет количества заказов по каждому месяцу
  const monthOrdersCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const key = getOrderMonthKey(o);
      if (key) {
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [orders]);

  // Опции для выпадающего списка клиентов
  const clientDropdownOptions: CockpitDropdownOption[] = React.useMemo(() => {
    const opts: CockpitDropdownOption[] = [
      { value: 'all', label: 'Все клиенты' },
    ];
    ALL_CLIENTS.forEach((cl) => {
      opts.push({
        value: cl,
        label: cl,
      });
    });
    return opts;
  }, []);

  // Опции для выпадающего списка статуса оплаты
  const paymentDropdownOptions: CockpitDropdownOption[] = React.useMemo(() => {
    return [
      { value: 'all', label: 'Любая оплата', statusDotColor: 'gray' },
      { value: 'paid', label: '100% Оплачено', statusDotColor: 'green' },
      { value: 'partial', label: 'Частично', statusDotColor: 'cyan' },
      { value: 'unpaid', label: 'Не оплачено', statusDotColor: 'orange' },
    ];
  }, []);

  const typeFilterOptions: ReadonlyArray<SegmentedFilterOption<OrderTypeFilter>> = [
    { value: 'all', label: 'Все', icon: Layers, badge: totalFilteredCount },
    { value: 'income', label: 'Доход', icon: TrendingUp, badge: incomeOrdersCount },
    { value: 'expense', label: 'Расход', icon: TrendingDown, badge: expenseCount },
    { value: 'completed', label: 'Готово', icon: CheckCircle2, badge: completedCount },
    { value: 'in_progress', label: 'В работе', icon: Clock, badge: inProgressCount },
  ];

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 sm:px-3 sm:py-2 select-none shadow-sm flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between relative z-30">

      {/* 1. СЛЕВА: Поиск в стиле капсулы со скриншота */}
      <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl w-full sm:w-64 xl:w-48 h-10 shrink-0 shadow-inner flex items-center">
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
            placeholder="Поиск..."
            className="w-full h-full bg-transparent text-xs font-mono text-white placeholder:text-neutral-500 outline-none"
          />
          {searchQuery && (
            <Tooltip content="Очистить поиск">
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Очистить поиск заказов"
                title="Очистить поиск заказов"
                className="text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors shrink-0 ml-1"
              >
                <X size={12} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 2. ПО ЦЕНТРУ: Сегментированные кнопки фильтрации */}
      <SegmentedFilter
        value={typeFilter}
        onChange={setTypeFilter}
        options={typeFilterOptions}
        ariaLabel="Фильтр заказов"
        className="max-w-full"
      />

      {/* 3. СПРАВА: Месяцы, Клиенты, Оплата (Одинаковая ширина w-[160px] и высота h-10) */}
      <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:flex-nowrap xl:justify-end">
        {/* Блок переключения месяцев (w-[160px] h-10) */}
        <MonthSelector
          selectedMonthKey={selectedMonthKey}
          onSelectMonth={setSelectedMonthKey}
          availableMonthKeys={availableMonthKeys}
          monthCounts={monthOrdersCountMap}
          totalOrdersCount={orders.length}
          showAllOption
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          className="w-[160px] h-10"
        />

        {/* Фильтр по клиенту (w-[160px] h-10) */}
        <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl w-[160px] h-10 shrink-0 shadow-inner flex items-center">
          <CockpitDropdown
            value={clientFilter}
            onChange={setClientFilter}
            options={clientDropdownOptions}
            variant="filter"
            align="left"
            className="w-full h-full"
            placeholder="Все клиенты"
            ariaLabel="Фильтр клиентов"
            hideStatusDot
          />
        </div>

        {/* Фильтр по статусу оплаты (w-[160px] h-10) */}
        <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl w-[160px] h-10 shrink-0 shadow-inner flex items-center">
          <CockpitDropdown
            value={paymentFilter}
            onChange={(v) => setPaymentFilter(v as PaymentFilter)}
            options={paymentDropdownOptions}
            variant="filter"
            align="left"
            className="w-full h-full"
            placeholder="Любая оплата"
            ariaLabel="Фильтр оплаты"
          />
        </div>
      </div>

    </div>
  );
});
