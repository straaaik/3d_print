import React from 'react';
import { 
  Search, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  RotateCcw, 
  Filter, 
  X,
  CheckCircle2,
  Clock,
  Layers,
  ShoppingBag,
  CreditCard
} from 'lucide-react';
import { ordersTheme } from '../../../shared/theme';
import { ALL_CLIENTS, CLIENT_CONFIG } from '../types';
import { formatMonthKeyLabel, getCurrentRealMonthKey } from '../helpers';
import { Select, SelectOption } from '../../../shared/ui/Select';

export type OrderTypeFilter = 'all' | 'in_progress' | 'completed' | 'income' | 'expense';
export type PaymentFilter = 'all' | 'paid' | 'unpaid';

const PAYMENT_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Все оплаты', icon: CreditCard },
  { value: 'paid', label: 'Оплачены', icon: CheckCircle2, iconColor: 'text-emerald-400' },
  { value: 'unpaid', label: 'Есть остаток', icon: Clock, iconColor: 'text-amber-400' },
];

const CLIENT_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Все каналы', icon: Filter },
  ...ALL_CLIENTS.map((cl) => {
    const cfg = CLIENT_CONFIG[cl];
    return {
      value: cl,
      label: cfg.label,
      icon: cfg.icon,
    };
  }),
];

interface OrdersFilterBarProps {
  // Месяцы
  selectedMonthKey: string;
  setSelectedMonthKey: (key: string) => void;
  availableMonthKeys: string[];
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  monthOrdersCount: number;
  onOpenClearMonthModal: () => void;

  // Поиск и фильтры
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: OrderTypeFilter;
  setTypeFilter: (filter: OrderTypeFilter) => void;
  clientFilter: string;
  setClientFilter: (client: string) => void;
  paymentFilter: PaymentFilter;
  setPaymentFilter: (filter: PaymentFilter) => void;

  // Счетчики
  totalFilteredCount: number;
  inProgressCount: number;
  completedCount: number;
  expenseCount: number;
}

export const OrdersFilterBar = React.memo(function OrdersFilterBar({
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
  expenseCount,
}: OrdersFilterBarProps) {
  const currentRealMonth = getCurrentRealMonthKey();

  return (
    <div className="space-y-3">
      {/* 1. Навигация по месяцам */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-[#16181d] border border-[#242930] p-2.5 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Стрелки переключения месяцев */}
          <div className="flex items-center gap-1 bg-[#0d0e12] border border-[#242930] p-1 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#242930] transition-colors cursor-pointer"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className={`flex items-center gap-2 px-3 py-1 bg-[#16181d] border ${ordersTheme.accent.borderSubtle} rounded-lg text-xs sm:text-sm font-bold text-white shadow-sm`}>
              <Calendar className={`w-3.5 h-3.5 ${ordersTheme.accent.text}`} />
              <span>{selectedMonthKey === 'all' ? 'Все время' : formatMonthKeyLabel(selectedMonthKey)}</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#242930] transition-colors cursor-pointer"
              title="Следующий месяц"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Быстрые вкладки месяцев */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full md:max-w-xl scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedMonthKey('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                selectedMonthKey === 'all'
                  ? `${ordersTheme.filterButton.active} font-bold`
                  : 'bg-[#0d0e12] text-gray-400 border-[#242930] hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              Все время
            </button>

            {availableMonthKeys.map((mKey: string) => {
              const isSelected = selectedMonthKey === mKey;
              return (
                <button
                  key={mKey}
                  type="button"
                  onClick={() => setSelectedMonthKey(mKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? `${ordersTheme.primaryButton.gradient} ${ordersTheme.primaryButton.text} border-none ${ordersTheme.primaryButton.shadow} font-bold`
                      : 'bg-[#0d0e12] text-gray-400 border-[#242930] hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  {formatMonthKeyLabel(mKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Правый блок: очистка и возврат к текущему месяцу */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          {selectedMonthKey !== currentRealMonth && (
            <button
              type="button"
              onClick={() => setSelectedMonthKey(currentRealMonth)}
              className="text-xs text-[#FF8800] hover:underline font-semibold flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-lg bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 border border-[#FF6B00]/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Текущий ({formatMonthKeyLabel(currentRealMonth)})
            </button>
          )}

          {selectedMonthKey !== 'all' && monthOrdersCount > 0 && (
            <button
              type="button"
              onClick={onOpenClearMonthModal}
              className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer font-semibold shadow-sm"
              title={`Очистить все ${monthOrdersCount} записей за ${formatMonthKeyLabel(selectedMonthKey)}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить месяц ({monthOrdersCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Поисковая строка и фильтры по статусам */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-[#16181d] border border-[#242930] p-2.5 rounded-2xl">
        {/* Поиск */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по № заказа, названию, клиенту или телефону..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d0e12] border border-[#242930] hover:border-gray-600 focus:border-[#FF6B00] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-colors font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Быстрые вкладки статуса/типа */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              typeFilter === 'all'
                ? `${ordersTheme.primaryButton.gradient} ${ordersTheme.primaryButton.text} border-none ${ordersTheme.primaryButton.shadow}`
                : 'bg-[#0d0e12] text-gray-400 border-[#242930] hover:text-white hover:border-gray-700'
            }`}
          >
            Все ({totalFilteredCount})
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'in_progress'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-950/50'
                : 'bg-[#0d0e12] text-blue-400/90 border-[#242930] hover:border-blue-500/40 hover:text-blue-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>В работе</span>
            <span className="font-mono text-[11px] opacity-80">({inProgressCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'completed'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/50'
                : 'bg-[#0d0e12] text-emerald-400/90 border-[#242930] hover:border-emerald-500/40 hover:text-emerald-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Готово</span>
            <span className="font-mono text-[11px] opacity-80">({completedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('expense')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'expense'
                ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/50'
                : 'bg-[#0d0e12] text-rose-400/90 border-[#242930] hover:border-rose-500/40 hover:text-rose-300'
            }`}
          >
            <span>Расход</span>
            <span className="font-mono text-[11px] opacity-80">({expenseCount})</span>
          </button>

          {/* Фильтр по оплате */}
          <div className="h-6 w-px bg-[#242930] mx-1 hidden sm:block" />

          <Select
            variant="compact"
            size="sm"
            dropdownWidth={160}
            options={PAYMENT_FILTER_OPTIONS}
            value={paymentFilter}
            onChange={(val) => setPaymentFilter(val as PaymentFilter)}
          />

          {/* Фильтр по источнику клиента */}
          <Select
            variant="compact"
            size="sm"
            dropdownWidth={170}
            options={CLIENT_FILTER_OPTIONS}
            value={clientFilter}
            onChange={setClientFilter}
          />
        </div>
      </div>
    </div>
  );
});
