'use client';

import React, { useId } from 'react';
import { motion } from 'motion/react';
import { Search, X, LucideIcon } from 'lucide-react';
import { Tooltip } from './Tooltip';

export type FilterTabVariant = 'default' | 'amber' | 'cyan' | 'purple' | 'emerald' | 'blue' | 'rose';

export interface FilterTabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: LucideIcon;
  variant?: FilterTabVariant;
}

export interface TableFilterBarProps<T extends string = string> {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  tabs?: FilterTabItem<T>[];
  activeTab?: T;
  onTabChange?: (tabId: T) => void;
  selects?: React.ReactNode;
  actions?: React.ReactNode;
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
  const generatedId = useId();
  return (
    <div
      className={`flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 bg-neutral-950/80 border border-white/10 p-2 rounded-xl select-none font-mono text-xs ${className}`}
    >
      {/* 1. Поисковая строка слева */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-8 bg-neutral-900 border border-white/10 hover:border-white/20 focus:border-cyan-400 focus:outline-none rounded-lg pl-8 pr-7 text-xs text-white placeholder-neutral-600 font-mono transition-colors"
        />
        {searchQuery && (
          <Tooltip content="Очистить поиск">
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        )}
      </div>

      {/* 2. Табы, селекты и кнопки справа */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {/* Табы фильтров */}
        {tabs &&
          tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange && onTabChange(tab.id)}
                className={`relative px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 select-none ${
                  isActive
                    ? 'text-white font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId={`tableFilterTabActive-${generatedId}`}
                    className="absolute inset-0 bg-white/15 border border-white/30 rounded-lg shadow-sm"
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 32,
                      mass: 0.8,
                    }}
                  />
                )}
                {Icon && (
                  <Icon
                    size={13}
                    className={`relative z-10 transition-colors ${isActive ? 'text-cyan-400' : 'text-neutral-500'}`}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`relative z-10 px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
                      isActive ? 'bg-white/20 text-white font-bold' : 'bg-white/5 text-neutral-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

        {/* Дополнительные селекты */}
        {selects && (
          <>
            {tabs && tabs.length > 0 && (
              <div className="h-5 w-px bg-white/10 mx-0.5 hidden sm:block" />
            )}
            {selects}
          </>
        )}

        {/* Дополнительные кнопки действий */}
        {actions && (
          <>
            <div className="h-5 w-px bg-white/10 mx-0.5 hidden sm:block" />
            {actions}
          </>
        )}
      </div>
    </div>
  );
}
