'use client';

import type { ComponentType } from 'react';
import { BriefcaseBusiness, Database, Layers3, Palette, Percent, Receipt, SlidersHorizontal, UserRound } from 'lucide-react';
import type { SettingsTabId } from './SettingsTabs';

export type SettingsSectionId = SettingsTabId | 'profile' | 'appearance' | 'receipt';

export const SETTINGS_SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  description: string;
  heading: string;
  intro: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: 'profile', label: 'Профиль', description: 'Личный бейдж, данные аккаунта и пароль', heading: 'Личный профиль', intro: 'Ваш пропуск в мастерскую и информация об аккаунте.', icon: UserRound },
  { id: 'appearance', label: 'Оформление', description: 'Фон, реакция на курсор и 3D-иконки', heading: 'Оформление рабочего пространства', intro: 'Настройте интерфейс под себя. Изменения применяются сразу и сохраняются на этом устройстве.', icon: Palette },
  { id: 'general', label: 'Основные', description: 'Валюта, электричество и принтер по умолчанию', heading: 'Основные параметры мастерской', intro: 'Задайте базовые значения, которые используются во всех новых расчётах.', icon: SlidersHorizontal },
  { id: 'labor', label: 'Работа мастера', description: 'Ставка, время и правила учёта труда', heading: 'Стоимость и режим работы мастера', intro: 'Определите, как ручная работа входит в себестоимость и итоговую цену.', icon: BriefcaseBusiness },
  { id: 'pricing', label: 'Цена и риски', description: 'Наценка, срочность и резерв на брак', heading: 'Правила ценообразования', intro: 'Настройте запас прибыли и компенсацию производственных рисков.', icon: Percent },
  { id: 'materials', label: 'Материалы', description: 'Коэффициенты сложности пластиков', heading: 'Сложность печати материалами', intro: 'Укажите, насколько технические и гибкие пластики повышают стоимость.', icon: Layers3 },
  { id: 'receipt', label: 'Шаблон чека', description: 'Заготовка чека, реквизиты оплаты и видимость', heading: 'Шаблон товарного чека', intro: 'Настройте стандартную заготовку чека для клиентов: постоянные надписи, реквизиты оплаты и видимость блоков.', icon: Receipt },
  { id: 'data', label: 'Данные', description: 'Резервная копия, импорт и тестовые данные', heading: 'Управление данными', intro: 'Создавайте резервные копии и восстанавливайте локальные данные мастерской.', icon: Database },
];

export function SettingsWorkspaceNav({ activeTab, onSelectTab, changesMap }: {
  activeTab: SettingsSectionId;
  onSelectTab: (tab: SettingsSectionId) => void;
  changesMap: Record<SettingsTabId, number>;
}) {
  return (
    <nav aria-label="Разделы настроек" className="min-w-0 rounded-xl border border-white/10 bg-neutral-950/65 p-2 lg:sticky lg:top-4">
      <div className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
        {SETTINGS_SECTIONS.map((section, index) => {
          const Icon = section.icon;
          const isActive = activeTab === section.id;
          const changedCount = section.id === 'profile' || section.id === 'appearance' || section.id === 'receipt' ? 0 : changesMap[section.id];
          return (
            <div key={section.id} className="shrink-0 lg:shrink">
              {(index === 0 || index === 2 || index === 7) && <p className="hidden px-3 pb-2 pt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-500 lg:block">{index === 0 ? 'Аккаунт' : index === 2 ? 'Мастерская' : 'Хранилище'}</p>}
            <button
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(section.id)}
              className={`group flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 lg:items-start lg:gap-3 ${
                isActive ? 'border-white/15 bg-white/[0.08] text-white' : 'border-transparent text-neutral-400 hover:border-white/10 hover:bg-white/[0.035] hover:text-neutral-200'
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${isActive ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-neutral-950 text-neutral-500'}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="whitespace-nowrap font-sans text-xs font-semibold">{section.label}</span>
                  {changedCount > 0 ? <span className="rounded border border-amber-800/40 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[8px] font-bold text-amber-400">{changedCount} {changedCount === 1 ? 'изменение' : 'изменения'}</span> : null}
                </span>
                <span className="mt-1 hidden font-sans text-[11px] leading-snug text-neutral-400 lg:block">{section.description}</span>
              </span>
            </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
