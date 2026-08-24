import React from 'react';
import { Search, X, LucideIcon } from 'lucide-react';

export type FilterTabVariant = 'default' | 'amber' | 'cyan' | 'purple' | 'emerald' | 'blue' | 'rose';

export interface FilterTabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: LucideIcon;
  variant?: FilterTabVariant;
}

const TAB_VARIANTS: Record<
  FilterTabVariant,
  {
    active: string;
    inactive: string;
    badgeActive: string;
    badgeInactive: string;
    iconColor?: string;
  }
> = {
  amber: {
    active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold border-none shadow-md shadow-amber-500/25',
    inactive: 'bg-[#0d0e12] text-gray-400 border-[#242930] hover:text-white hover:border-gray-700',
    badgeActive: 'bg-black/20 text-black',
    badgeInactive: 'bg-gray-800 text-gray-400',
    iconColor: 'text-amber-400',
  },
  cyan: {
    active: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-extrabold border-none shadow-md shadow-cyan-500/25',
    inactive: 'bg-[#0d0e12] text-gray-400 border-[#242930] hover:text-cyan-400 hover:border-cyan-500/40',
    badgeActive: 'bg-black/20 text-black',
    badgeInactive: 'bg-cyan-500/15 text-cyan-300',
    iconColor: 'text-cyan-400',
  },
  purple: {
    active: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-extrabold border-none shadow-md shadow-purple-500/25',
    inactive: 'bg-[#0d0e12] text-gray-400 border-[#242930] hover:text-purple-400 hover:border-purple-500/40',
    badgeActive: 'bg-white/20 text-white',
    badgeInactive: 'bg-purple-500/15 text-purple-300',
    iconColor: 'text-purple-400',
  },
  rose: {
    active: 'bg-rose-600 text-white font-extrabold border-rose-500 shadow-md shadow-rose-950/50',
    inactive: 'bg-[#0d0e12] text-rose-400/90 border-[#242930] hover:border-rose-500/40 hover:text-rose-300',
    badgeActive: 'bg-white/20 text-white',
    badgeInactive: 'bg-rose-500/20 text-rose-300',
    iconColor: 'text-rose-400',
  },
  blue: {
    active: 'bg-blue-600 text-white font-extrabold border-blue-500 shadow-md shadow-blue-950/50',
    inactive: 'bg-[#0d0e12] text-blue-400/90 border-[#242930] hover:border-blue-500/40 hover:text-blue-300',
    badgeActive: 'bg-white/20 text-white',
    badgeInactive: 'bg-blue-500/20 text-blue-300',
    iconColor: 'text-blue-400',
  },
  emerald: {
    active: 'bg-emerald-600 text-white font-extrabold border-emerald-500 shadow-md shadow-emerald-950/50',
    inactive: 'bg-[#0d0e12] text-emerald-400/90 border-[#242930] hover:border-emerald-500/40 hover:text-emerald-300',
    badgeActive: 'bg-white/20 text-white',
    badgeInactive: 'bg-emerald-500/20 text-emerald-300',
    iconColor: 'text-emerald-400',
  },
  default: {
    active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold border-none shadow-md shadow-amber-500/25',
    inactive: 'bg-[#0d0e12] text-gray-400 border-[#242930] hover:text-white hover:border-gray-700',
    badgeActive: 'bg-black/20 text-black',
    badgeInactive: 'bg-gray-800 text-gray-400',
    iconColor: 'text-gray-400',
  },
};

export interface TableFilterBarProps<T extends string = string> {
  // Поиск
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;

  // Табы фильтрации
  tabs?: FilterTabItem<T>[];
  activeTab?: T;
  onTabChange?: (tabId: T) => void;

  // Выпадающие списки (например, Категории, Клиенты, Оплаты)
  selects?: React.ReactNode;

  // Дополнительные кнопки (например, Отменить, Очистить, Экспорт)
  actions?: React.ReactNode;

  // Кастомный класс для контейнера
  className?: string;
}

export function TableFilterBar<T extends string = string>({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Поиск...',
  tabs,
  activeTab,
  onTabChange,
  selects,
  actions,
  className = '',
}: TableFilterBarProps<T>) {
  return (
    <div
      className={`flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-[#16181d] border border-[#242930] p-2.5 rounded-2xl select-none ${className}`}
    >
      {/* 1. Поисковая строка слева */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-[#0d0e12] border border-[#242930] hover:border-gray-600 focus:border-[#FF6B00] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-colors font-sans"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-md cursor-pointer"
            title="Очистить поиск"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Табы, селекты и кнопки справа в едином ряду */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {/* Табы фильтров */}
        {tabs &&
          tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const variantKey = tab.variant || 'default';
            const style = TAB_VARIANTS[variantKey] || TAB_VARIANTS.default;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange && onTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive ? style.active : style.inactive
                }`}
              >
                {Icon && (
                  <Icon
                    size={14}
                    className={isActive ? (variantKey === 'purple' || variantKey === 'rose' || variantKey === 'blue' || variantKey === 'emerald' ? 'text-white' : 'text-black') : (style.iconColor || 'text-gray-400')}
                  />
                )}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? style.badgeActive : style.badgeInactive
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

        {/* Дополнительные селекты (выпадающие списки) */}
        {selects && (
          <>
            {tabs && tabs.length > 0 && (
              <div className="h-6 w-px bg-[#242930] mx-1 hidden sm:block" />
            )}
            {selects}
          </>
        )}

        {/* Дополнительные кнопки действий (Отменить, Очистить и т.д.) */}
        {actions && (
          <>
            <div className="h-6 w-px bg-[#242930] mx-1 hidden sm:block" />
            {actions}
          </>
        )}
      </div>
    </div>
  );
}
