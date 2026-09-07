'use client';

import type { ComponentType } from 'react';
import { KeyRound, ServerCog, Users } from 'lucide-react';

export type AdminTab = 'keys' | 'users' | 'system';

const ADMIN_SECTIONS: Array<{
  id: AdminTab;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: 'keys', label: 'Ключи доступа', description: 'Приглашения и одноразовый доступ', icon: KeyRound },
  { id: 'users', label: 'Пользователи', description: 'Учетные записи и роли', icon: Users },
  { id: 'system', label: 'Состояние системы', description: 'Состояние подключения и ограничения', icon: ServerCog },
];

export function AdminWorkspaceNav({ activeTab, onSelectTab, keyCount, userCount }: {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  keyCount: number;
  userCount: number;
}) {
  return (
    <nav aria-label="Разделы администрирования" className="rounded-xl border border-white/10 bg-neutral-950/65 p-2">
      <div className="px-2 pb-2 pt-1">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500">ACCESS CONTROL</p>
        <p className="mt-1 font-sans text-xs leading-relaxed text-neutral-400">Управляйте доступом по одному сценарию за раз.</p>
      </div>
      <div className="space-y-1">
        {ADMIN_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeTab === section.id;
          const count = section.id === 'keys' ? keyCount : section.id === 'users' ? userCount : null;
          return (
            <button
              key={section.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(section.id)}
              className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${isActive ? 'border-white/15 bg-white/[0.08]' : 'border-transparent hover:border-white/10 hover:bg-white/[0.035]'}`}
            >
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${isActive ? 'border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-400' : 'border-white/10 bg-neutral-950 text-neutral-500'}`}><Icon className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={`font-sans text-xs font-semibold ${isActive ? 'text-white' : 'text-neutral-300'}`}>{section.label}</span>
                  {count !== null ? <span className="font-mono text-[10px] text-neutral-500 tabular-nums">{count}</span> : null}
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
