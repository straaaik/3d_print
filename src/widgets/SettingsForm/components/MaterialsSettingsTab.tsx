'use client';

import React from 'react';
import { Card } from '../../../shared/ui/Card';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { QuickStepper } from './QuickStepper';
import { MATERIAL_DIFFICULTY_CONFIGS, MaterialDifficultyCategory } from '../../../shared/lib/materialDifficulty';
import { Layers } from 'lucide-react';

interface MaterialsSettingsTabProps {
  enableMaterialDifficulty: boolean;
  setEnableMaterialDifficulty: (val: boolean) => void;
  isEnableMaterialDifficultyChanged: boolean;

  materialMultipliers: Record<string, number>;
  setMaterialMultipliers: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  isMaterialMultiplierChanged: (key: string) => boolean;
}

export function MaterialsSettingsTab({
  enableMaterialDifficulty,
  setEnableMaterialDifficulty,
  isEnableMaterialDifficultyChanged,
  materialMultipliers,
  setMaterialMultipliers,
  isMaterialMultiplierChanged,
}: MaterialsSettingsTabProps) {
  const categories: MaterialDifficultyCategory[] = ['pla_petg', 'abs_asa', 'tpu_flex', 'nylon_cf'];

  return (
    <div className="flex flex-col gap-4 font-mono text-xs">
      {/* Главный переключатель учета сложности */}
      <Card
        title="Дифференцированные наценки по типу нити"
        stepNumber="MAT 01"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-neutral-900 border border-white/10">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono uppercase">Автоматический учет категории материала</span>
                {isEnableMaterialDifficultyChanged && (
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 font-mono">
                    изменено
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed max-w-2xl">
                При включении этой опции калькулятор определяет тип нити по названию катушки (PLA, ABS, TPU, Nylon, Carbon) и применяет дополнительный коэффициент сложности печати к розничной цене.
              </p>
            </div>

            <Checkbox
              id="materials-difficulty-master-toggle"
              checked={enableMaterialDifficulty}
              onChange={setEnableMaterialDifficulty}
              label={enableMaterialDifficulty ? 'Включено' : 'Выключено'}
            />
          </div>
        </div>
      </Card>

      {/* Карточки 4 групп материалов */}
      {enableMaterialDifficulty ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((catKey, index) => {
            const cfg = MATERIAL_DIFFICULTY_CONFIGS[catKey];
            const currentVal = materialMultipliers[catKey] ?? cfg.defaultMarkup;
            const isChanged = isMaterialMultiplierChanged(catKey);

            return (
              <div
                key={cfg.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 bg-neutral-950/90 transition-all ${
                  isChanged
                    ? 'border-amber-500/60 shadow-sm'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Шапка карточки */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 font-mono text-[10px] font-bold text-cyan-400">M{index + 1}</span>
                    <div className="flex flex-col">
                      <h4 className="text-xs font-bold text-white tracking-wide font-mono uppercase">{cfg.name}</h4>
                      <span className="text-[11px] text-neutral-400 mt-0.5 font-sans">
                        {cfg.description}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${cfg.badgeColor} ${cfg.textColor} border ${cfg.borderColor}`}
                    >
                      +{currentVal}%
                    </span>
                    {isChanged && (
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40 font-mono">
                        изменено
                      </span>
                    )}
                  </div>
                </div>

                {/* Ключевые слова */}
                <div className="flex flex-wrap items-center gap-1.5 select-none">
                  <span className="text-[10px] text-neutral-500 font-mono uppercase mr-1">Ключевые слова:</span>
                  {cfg.keywords.slice(0, 6).map((kw) => (
                    <span
                      key={kw}
                      className="px-1.5 py-0.5 rounded-md bg-neutral-900 border border-white/10 text-[10px] font-mono text-neutral-400"
                    >
                      {kw.toUpperCase()}
                    </span>
                  ))}
                </div>

                {/* Счетчик наценки */}
                <div className="pt-2 border-t border-white/10">
                  <QuickStepper
                    label="Наценка для категории, %"
                    value={currentVal}
                    onChange={(val) =>
                      setMaterialMultipliers((prev) => ({ ...prev, [catKey]: val }))
                    }
                    min={0}
                    max={500}
                    step={10}
                    presets={[100, 120, 140, 170, 200]}
                    suffix="%"
                    isModified={isChanged}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-neutral-950/90 border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-2">
          <Layers size={28} className="text-neutral-600" />
          <p className="text-xs font-semibold text-neutral-400 font-mono">
            [ Дифференциация по сложности пластиков отключена ]
          </p>
          <p className="text-xs text-neutral-500 max-w-md font-sans">
            Все типы пластика (PLA, ABS, TPU, Nylon) рассчитываются по единой базовой наценке мастерской.
          </p>
        </div>
      )}
    </div>
  );
}
