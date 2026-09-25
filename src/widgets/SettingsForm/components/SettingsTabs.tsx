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
    },
    {
      id: 'labor',
      label: 'Работа мастера',
      shortLabel: 'Мастер',
      icon: Wrench,
      changedCount: changesMap.labor,
    },
    {
      id: 'pricing',
      label: 'Наценки и брак',
      shortLabel: 'Наценки',
      icon: Percent,
      changedCount: changesMap.pricing,
    },
    {
      id: 'materials',
      label: 'Сложность пластиков',
      shortLabel: 'Материалы',
      icon: Layers,
      changedCount: changesMap.materials,
    },
    {
      id: 'data',
      label: 'Данные и бэкап',
      shortLabel: 'Бэкап',
      icon: Database,
      changedCount: changesMap.data,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-neutral-950/80 border border-white/10 rounded-2xl select-none font-mono text-xs">
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
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl text-xs font-mono font-semibold cursor-pointer min-w-0 ${
              isLastOnMobile ? 'col-span-2 sm:col-span-1' : ''
            } ${
              isActive
                ? 'bg-white/15 text-white border border-white/20 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Icon
              size={14}
              className={`shrink-0 ${isActive ? 'text-cyan-400' : 'text-neutral-500'}`}
            />
            <span className="truncate hidden lg:inline">{tab.label}</span>
            <span className="truncate inline lg:hidden">{tab.shortLabel}</span>

            {hasChanges && (
              <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-mono font-bold rounded-full bg-amber-400 text-neutral-950 shadow-sm shrink-0">
                {tab.changedCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
