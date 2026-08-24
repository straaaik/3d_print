'use client';

import React from 'react';
import { Zap, Wrench, Percent, Layers, Database } from 'lucide-react';

export type SettingsTabId = 'general' | 'labor' | 'pricing' | 'materials' | 'data';

export interface TabConfig {
  id: SettingsTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  changedCount: number;
  badgeColor?: string;
}

interface SettingsTabsProps {
  activeTab: SettingsTabId;
  onSelectTab: (tab: SettingsTabId) => void;
  changesMap: Record<SettingsTabId, number>;
}

export function SettingsTabs({
  activeTab,
  onSelectTab,
  changesMap,
}: SettingsTabsProps) {
  const tabs: TabConfig[] = [
    {
      id: 'general',
      label: 'Основные параметры',
      shortLabel: 'Основные',
      icon: Zap,
      changedCount: changesMap.general,
      badgeColor: 'text-sky-400',
    },
    {
      id: 'labor',
      label: 'Работа мастера',
      shortLabel: 'Мастер',
      icon: Wrench,
      changedCount: changesMap.labor,
      badgeColor: 'text-emerald-400',
    },
    {
      id: 'pricing',
      label: 'Наценки и брак',
      shortLabel: 'Наценки',
      icon: Percent,
      changedCount: changesMap.pricing,
      badgeColor: 'text-amber-400',
    },
    {
      id: 'materials',
      label: 'Сложность пластиков',
      shortLabel: 'Материалы',
      icon: Layers,
      changedCount: changesMap.materials,
      badgeColor: 'text-purple-400',
    },
    {
      id: 'data',
      label: 'Данные и бэкап',
      shortLabel: 'Бэкап',
      icon: Database,
      changedCount: changesMap.data,
      badgeColor: 'text-indigo-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-[#16181d] border border-[#242930] rounded-2xl select-none shadow-inner overflow-hidden">
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const hasChanges = tab.changedCount > 0;
        const isLastOnMobile = idx === 4;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer min-w-0 relative ${
              isLastOnMobile ? 'col-span-2 sm:col-span-1' : ''
            } ${
              isActive
                ? 'bg-gradient-to-r from-[#28303d] to-[#1f2530] text-white shadow-md border border-[#3d4757]/60'
                : 'text-gray-400 hover:text-white hover:bg-[#1f232b]'
            }`}
          >
            <Icon
              size={15}
              className={`shrink-0 transition-colors ${
                isActive ? (tab.badgeColor || 'text-primary') : 'text-gray-400'
              }`}
            />
            <span className="truncate hidden lg:inline">{tab.label}</span>
            <span className="truncate inline lg:hidden">{tab.shortLabel}</span>

            {hasChanges && (
              <span className="flex items-center justify-center min-w-[17px] h-[17px] px-1 text-[10px] font-mono font-bold rounded-full bg-amber-500 text-black shadow-sm shrink-0 animate-in zoom-in-50">
                {tab.changedCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
