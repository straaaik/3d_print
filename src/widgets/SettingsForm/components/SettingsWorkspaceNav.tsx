'use client';

import type { ComponentType } from 'react';
import { BriefcaseBusiness, Database, Layers3, Percent, SlidersHorizontal } from 'lucide-react';
import type { SettingsTabId } from './SettingsTabs';

export const SETTINGS_SECTIONS: Array<{
  id: SettingsTabId;
  label: string;
  description: string;
  heading: string;
  intro: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: 'general', label: 'Основные', description: 'Валюта, электричество и принтер по умолчанию', heading: 'Основные параметры мастерской', intro: 'Задайте базовые значения, которые используются во всех новых расчётах.', icon: SlidersHorizontal },
  { id: 'labor', label: 'Работа мастера', description: 'Ставка, время и правила учёта труда', heading: 'Стоимость и режим работы мастера', intro: 'Определите, как ручная работа входит в себестоимость и итоговую цену.', icon: BriefcaseBusiness },
  { id: 'pricing', label: 'Цена и риски', description: 'Наценка, срочность и резерв на брак', heading: 'Правила ценообразования', intro: 'Настройте запас прибыли и компенсацию производственных рисков.', icon: Percent },
  { id: 'materials', label: 'Материалы', description: 'Коэффициенты сложности пластиков', heading: 'Сложность печати материалами', intro: 'Укажите, насколько технические и гибкие пластики повышают стоимость.', icon: Layers3 },
  { id: 'data', label: 'Данные', description: 'Резервная копия, импорт и тестовые данные', heading: 'Управление данными', intro: 'Создавайте резервные копии и восстанавливайте локальные данные мастерской.', icon: Database },
];

export function SettingsWorkspaceNav({ activeTab, onSelectTab, changesMap }: {
  activeTab: SettingsTabId;
  onSelectTab: (tab: SettingsTabId) => void;
  changesMap: Record<SettingsTabId, number>;
}) {
  return (
    <nav aria-label="Разделы настроек" className="rounded-xl border border-white/10 bg-neutral-950/65 p-2">
      <div className="px-2 pb-2 pt-1">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500">CONFIGURATION MAP</p>
        <p className="mt-1 font-sans text-xs leading-relaxed text-neutral-400">Выберите область — справа останутся только относящиеся к ней параметры.</p>
      </div>
      <div className="space-y-1">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeTab === section.id;
          const changedCount = changesMap[section.id];
          return (
            <button
              key={section.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(section.id)}
              className={`group flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                isActive ? 'border-white/15 bg-white/[0.08] text-white' : 'border-transparent text-neutral-400 hover:border-white/10 hover:bg-white/[0.035] hover:text-neutral-200'
              }`}
            >
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${isActive ? 'border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-400' : 'border-white/10 bg-neutral-950 text-neutral-500'}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-sans text-xs font-semibold">{section.label}</span>
                  {changedCount > 0 ? <span className="rounded border border-amber-800/40 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[8px] font-bold text-amber-400">{changedCount} {changedCount === 1 ? 'изменение' : 'изменения'}</span> : null}
                </span>
                <span className="mt-1 block font-sans text-[11px] leading-snug text-neutral-500">{section.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
