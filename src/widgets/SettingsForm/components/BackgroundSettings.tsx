'use client';

import { useState } from 'react';
import { Check, MousePointer2 } from 'lucide-react';
import { BACKGROUND_OPTIONS, useBackgroundPreferences, type BackgroundPreferences } from '../../../shared/lib/backgroundPreferences';
import { BackgroundPattern } from '../../../shared/ui/BackgroundPattern';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../../shared/ui/CockpitDropdown';

export function BackgroundSettings() {
  const { preferences, update } = useBackgroundPreferences();
  const [storageFailed, setStorageFailed] = useState(false);
  const choose = (patch: Partial<BackgroundPreferences>) => setStorageFailed(!update(patch));

  return (
    <section aria-labelledby="background-heading" className="rounded-2xl border border-white/15 bg-neutral-950/90 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-neutral-500">DISPLAY / ФОН ИНТЕРФЕЙСА</p>
          <h2 id="background-heading" className="mt-1 font-mono text-sm font-bold text-white">Поверхность рабочего пространства</h2>
        </div>
        <span className="font-mono text-[10px] text-neutral-500">НА ЭТОМ УСТРОЙСТВЕ</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {BACKGROUND_OPTIONS.map(option => (
          <div key={option.id} className={`overflow-hidden rounded-xl border bg-white/[0.03] ${preferences.variant === option.id ? 'border-white/30' : 'border-white/10'}`}>
            <div className="relative h-24 overflow-hidden border-b border-white/10 bg-neutral-950">
              <BackgroundPattern variant={option.id} className="absolute inset-0 text-white/25" />
              <span className="absolute bottom-2 left-3 font-mono text-[9px] uppercase tracking-widest text-neutral-500">{option.id}</span>
              {preferences.variant === option.id && <Check aria-hidden="true" className="absolute right-3 top-3 h-4 w-4 text-neutral-300" />}
            </div>
            <div className="space-y-3 p-3">
              <p className="min-h-10 font-sans text-xs leading-relaxed text-neutral-400">{option.description}</p>
              <CockpitButton aria-label={`Фон: ${option.name}`} aria-pressed={preferences.variant === option.id}
                isActive={preferences.variant === option.id} onClick={() => choose({ variant: option.id })} className="w-full justify-center">
                {option.name}
              </CockpitButton>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="w-56 max-w-full">
          <CockpitDropdown ariaLabel="Контраст фона" value={preferences.contrast}
            disabled={preferences.variant === 'none'}
            options={[{ value: 'quiet', label: 'Контраст: мягкий' }, { value: 'balanced', label: 'Контраст: средний' }, { value: 'clear', label: 'Контраст: выраженный' }]}
            onChange={value => choose({ contrast: value as BackgroundPreferences['contrast'] })} />
        </div>
        <CockpitButton aria-label="Реакция фона на курсор" aria-pressed={preferences.interactive}
          disabled={preferences.variant === 'none'} icon={MousePointer2} isActive={preferences.interactive}
          onClick={() => choose({ interactive: !preferences.interactive })}>
          Реакция на курсор
        </CockpitButton>
      </div>
      <p className="mt-3 font-sans text-xs leading-relaxed text-neutral-500">
        Мышь оставляет на точках мягкий затухающий след, клик запускает рябь. Крестики вращаются и слегка тянутся к мыши — без подсветки. Выбор сохраняется сразу в этом браузере. На сенсорных устройствах и при уменьшении движения фон статичен.
      </p>
      <p role="status" className="mt-2 font-sans text-xs text-neutral-400">
        {storageFailed ? 'Браузер запретил сохранение. Выбор действует до перезагрузки страницы.' : `Выбран фон «${BACKGROUND_OPTIONS.find(option => option.id === preferences.variant)?.name}».`}
      </p>
    </section>
  );
}
