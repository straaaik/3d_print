import React from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  X, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMonthKeyLabel, getOrderMonthKey } from '../../helpers';
import { ALL_CLIENTS, Order, OrderTypeFilter, PaymentFilter } from '../../types';
import { CockpitDropdown, CockpitDropdownOption } from '@/shared/ui/CockpitDropdown';
import { Tooltip } from '@/shared/ui/Tooltip';

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
  monthOrdersCount,
  onOpenClearMonthModal,
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

  const [isMonthMenuOpen, setIsMonthMenuOpen] = React.useState(false);
  const monthMenuRef = React.useRef<HTMLDivElement>(null);

  // Закрытие выпадающего меню месяца при клике вне компонента
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthMenuRef.current && !monthMenuRef.current.contains(e.target as Node)) {
        setIsMonthMenuOpen(false);
      }
    };
    if (isMonthMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMonthMenuOpen]);

  // Закрытие по Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMonthMenuOpen(false);
    };
    if (isMonthMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMonthMenuOpen]);

  // Гарантируем, что текущий выбранный месяц всегда присутствует в списке опций
  const allMonthOptions = React.useMemo(() => {
    const set = new Set(availableMonthKeys);
    if (selectedMonthKey && selectedMonthKey !== 'all') {
      set.add(selectedMonthKey);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [availableMonthKeys, selectedMonthKey]);

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

  // Опции для выпадающего списка месяцев
  const monthDropdownOptions = React.useMemo(() => {
    const opts: Array<{ value: string; label: string; badge?: string }> = [
      {
        value: 'all',
        label: `Все месяцы`,
        badge: `${orders.length}`,
      },
    ];
    allMonthOptions.forEach((k) => {
      const count = monthOrdersCountMap.get(k) || 0;
      opts.push({
        value: k,
        label: formatMonthKeyLabel(k),
        badge: `${count}`,
      });
    });
    return opts;
  }, [allMonthOptions, orders.length, monthOrdersCountMap]);

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

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 sm:px-3 sm:py-2 select-none shadow-sm flex items-center justify-between gap-2 relative z-30">
      
      {/* 1. СЛЕВА: Поиск в стиле капсулы со скриншота */}
      <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl w-48 sm:w-56 h-10 shrink-0 shadow-inner flex items-center">
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
                className="text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors shrink-0 ml-1"
              >
                <X size={12} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 2. ПО ЦЕНТРУ: Сегментированные кнопки фильтрации */}
      <div className="bg-neutral-950/80 border border-white/10 p-1 rounded-xl h-10 flex items-center gap-1 shrink-0 shadow-inner overflow-x-auto">
        {/* Все */}
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
            typeFilter === 'all'
              ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Layers className={`w-3.5 h-3.5 transition-colors ${
            typeFilter === 'all' ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'
          }`} />
          <span>Все</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
            typeFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
          }`}>
            {totalFilteredCount}
          </span>
        </button>

        {/* Доход */}
        <button
          type="button"
          onClick={() => setTypeFilter('income')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
            typeFilter === 'income'
              ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <TrendingUp className={`w-3.5 h-3.5 transition-colors ${
            typeFilter === 'income' ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'
          }`} />
          <span>Доход</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
            typeFilter === 'income' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
          }`}>
            {incomeOrdersCount}
          </span>
        </button>

        {/* Расход */}
        <button
          type="button"
          onClick={() => setTypeFilter('expense')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
            typeFilter === 'expense'
              ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <TrendingDown className={`w-3.5 h-3.5 transition-colors ${
            typeFilter === 'expense' ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'
          }`} />
          <span>Расход</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
            typeFilter === 'expense' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
          }`}>
            {expenseCount}
          </span>
        </button>

        {/* Готово */}
        <button
          type="button"
          onClick={() => setTypeFilter('completed')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
            typeFilter === 'completed'
              ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <CheckCircle2 className={`w-3.5 h-3.5 transition-colors ${
            typeFilter === 'completed' ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'
          }`} />
          <span>Готово</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
            typeFilter === 'completed' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
          }`}>
            {completedCount}
          </span>
        </button>

        {/* В работе */}
        <button
          type="button"
          onClick={() => setTypeFilter('in_progress')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-full rounded-lg text-xs font-medium transition-all cursor-pointer group ${
            typeFilter === 'in_progress'
              ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 transition-colors ${
            typeFilter === 'in_progress' ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'
          }`} />
          <span>В работе</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
            typeFilter === 'in_progress' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
          }`}>
            {inProgressCount}
          </span>
        </button>
      </div>

      {/* 3. СПРАВА: Месяцы, Клиенты, Оплата (Одинаковая ширина w-[160px] и высота h-10) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Блок переключения месяцев (w-[160px] h-10) */}
        <div 
          ref={monthMenuRef}
          className="relative bg-neutral-950/80 border border-white/10 p-1 rounded-xl w-[160px] h-10 flex items-center justify-between shrink-0 shadow-inner"
        >
          <Tooltip content="Предыдущий месяц">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-6 h-full rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all cursor-pointer flex items-center justify-center shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          {/* Центральная кнопка месяца */}
          <Tooltip content="Нажмите, чтобы выбрать месяц">
            <button
              type="button"
              onClick={() => setIsMonthMenuOpen(!isMonthMenuOpen)}
              className={`flex-1 h-full flex items-center justify-center gap-1.5 px-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer truncate ${
                selectedMonthKey !== 'all' || isMonthMenuOpen
                  ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
                  : 'bg-transparent border border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate font-medium text-[11px]">
                {selectedMonthKey === 'all' ? `Все (${orders.length})` : formatMonthKeyLabel(selectedMonthKey)}
              </span>
            </button>
          </Tooltip>

          <Tooltip content="Следующий месяц">
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-6 h-full rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all cursor-pointer flex items-center justify-center shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          {/* Всплывающее меню месяцев — строго заподлицо под капсулой */}
          <AnimatePresence>
            {isMonthMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 3, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 3, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 right-0 top-full mt-2 z-50 w-full rounded-xl bg-neutral-950 border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden flex flex-col font-mono select-none"
              >
                <div className="divide-y divide-white/[0.04] max-h-60 overflow-y-auto custom-scrollbar">
                  {monthDropdownOptions.map((opt) => {
                    const isSelected = opt.value === selectedMonthKey;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedMonthKey(opt.value);
                          setIsMonthMenuOpen(false);
                        }}
                        className={`relative w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-white/10 text-white font-semibold'
                            : 'bg-transparent hover:bg-white/5 text-neutral-300 hover:text-white'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white" />
                        )}

                        <span className="truncate text-xs font-mono pl-0.5">
                          {opt.label}
                        </span>

                        {opt.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono shrink-0 border border-white/10 bg-white/5 text-neutral-400">
                            {opt.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="px-3 py-1.5 bg-neutral-950 border-t border-white/5 text-[9px] font-mono text-neutral-500 uppercase tracking-wider flex items-center justify-between shrink-0">
                  <span>{monthDropdownOptions.length} ОПЦИЙ</span>
                  <span className="text-neutral-600">3DLABS</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
          />
        </div>
      </div>

    </div>
  );
});
