'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Check, Sparkles } from 'lucide-react';
import {
  HUB_ICON_STYLES,
  useHubIconPreferences,
  type HubIconStyle,
} from '../../../shared/lib/hubIconPreferences';
import { CockpitButton } from '../../../shared/ui/CockpitButton';

export function HubIconSettings() {
  const { style: activeStyle, setStyle } = useHubIconPreferences();
  const [storageFailed, setStorageFailed] = useState(false);

  const choose = (newStyle: HubIconStyle) => {
    setStorageFailed(!setStyle(newStyle));
  };

  return (
    <section aria-labelledby="hub-icons-heading" className="rounded-2xl border border-white/15 bg-neutral-950/90 p-4 sm:p-5">
      {/* Шапка секции */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-neutral-500">DISPLAY / 3D-ИКОНКИ ХАБА</p>
          <h2 id="hub-icons-heading" className="mt-1 font-mono text-sm font-bold text-white">
            Стиль оформления 3D-модулей
          </h2>
        </div>
        <span className="font-mono text-[10px] text-neutral-500">НА ЭТОМ УСТРОЙСТВЕ</span>
      </div>

      {/* Сетка выбора стилей */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {HUB_ICON_STYLES.map((preset) => {
          const isSelected = activeStyle === preset.id;

          return (
            <div
              key={preset.id}
              className={`group overflow-hidden rounded-xl border transition-all duration-200 bg-white/[0.03] ${
                isSelected
                  ? 'border-cyan-500/50 shadow-[0_0_24px_rgba(12,180,224,0.14)] ring-1 ring-cyan-500/30'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Превью-витрина из 3 иконок выбранного стиля */}
              <div className="relative h-36 sm:h-44 overflow-hidden border-b border-white/10 bg-neutral-950/80 flex items-center justify-center p-4">
                {/* Фоновая микросетка */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />

                {/* Бейдж тега стиля слева вверху */}
                <div className="absolute top-2.5 left-3 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-neutral-400 bg-neutral-900/90 px-2 py-0.5 rounded border border-white/10">
                  <span>{preset.tag}</span>
                  <span className="text-neutral-600">·</span>
                  <span className="text-neutral-300 font-sans">{preset.badge}</span>
                </div>

                {/* Индикатор выбора справа вверху */}
                {isSelected && (
                  <div className="absolute top-2.5 right-3 flex items-center gap-1 font-mono text-[9px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(12,180,224,0.2)]">
                    <Check className="w-3 h-3 text-cyan-400" />
                    <span>АКТИВЕН</span>
                  </div>
                )}

                {/* Связка 3D-иконок превью */}
                <div className="relative flex items-center justify-center -space-x-4 sm:-space-x-6 z-10 select-none">
                  {preset.previewIcons.map((iconName, idx) => (
                    <motion.div
                      key={iconName}
                      className="relative w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)]"
                      style={{ zIndex: idx === 1 ? 20 : 10 }}
                      whileHover={{ scale: 1.1, y: -4, transition: { duration: 0.2 } }}
                    >
                      <Image
                        src={`/images/hub/${preset.id}/${iconName}.png`}
                        alt=""
                        fill
                        unoptimized
                        className="object-contain pointer-events-none"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Описание и кнопка выбора */}
              <div className="p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                    {isSelected && <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{preset.name}</span>
                  </h3>
                  <span className="font-mono text-[10px] text-neutral-500">
                    6 МОДУЛЕЙ
                  </span>
                </div>

                <p className="min-h-11 font-sans text-xs leading-relaxed text-neutral-400">
                  {preset.description}
                </p>

                <CockpitButton
                  aria-label={`Стиль 3D-иконок: ${preset.name}`}
                  aria-pressed={isSelected}
                  isActive={isSelected}
                  onClick={() => choose(preset.id)}
                  className="w-full justify-center"
                >
                  {isSelected ? '[ Активный стиль ]' : `[ Выбрать ${preset.name} ]`}
                </CockpitButton>
              </div>
            </div>
          );
        })}
      </div>

      {/* Поясняющий текст */}
      <p className="mt-3 font-sans text-xs leading-relaxed text-neutral-500">
        Стиль переключает оформление всех 6 разделов Хаба (Заказы, Статистика, Калькулятор, Товары, Филамент, Принтеры). Выбор сохраняется локально на этом устройстве.
      </p>

      {/* Статус сохранения */}
      <p role="status" className="mt-2 font-sans text-xs text-neutral-400">
        {storageFailed
          ? 'Браузер ограничил локальное сохранение. Выбор действует до перезагрузки страницы.'
          : `Текущее оформление Хаба: «${HUB_ICON_STYLES.find((s) => s.id === activeStyle)?.name}».`}
      </p>
    </section>
  );
}
