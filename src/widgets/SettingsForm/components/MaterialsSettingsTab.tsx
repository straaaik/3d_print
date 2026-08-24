'use client';

import React from 'react';
import { Card } from '../../../shared/ui/Card';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { QuickStepper } from './QuickStepper';
import { MATERIAL_DIFFICULTY_CONFIGS, MaterialDifficultyCategory } from '../../../shared/lib/materialDifficulty';
import { Layers, Sparkles, AlertCircle } from 'lucide-react';

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
    <div className="flex flex-col gap-6">
      {/* Главный переключатель учета сложности */}
      <Card
        title="Дифференцированные наценки по типу нити"
        stepNumber="🧬"
        className="border-[#242930] bg-[#16181d]"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#12141a] border border-[#242930]">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Автоматический учет категории материала</span>
                {isEnableMaterialDifficultyChanged && (
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    изменено
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
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
          {categories.map((catKey) => {
            const cfg = MATERIAL_DIFFICULTY_CONFIGS[catKey];
            const currentVal = materialMultipliers[catKey] ?? cfg.defaultMarkup;
            const isChanged = isMaterialMultiplierChanged(catKey);

            return (
              <div
                key={cfg.id}
                className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between gap-4 bg-[#16181d] transition-all duration-200 ${
                  isChanged
                    ? 'border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.14)]'
                    : 'border-[#242930] hover:border-gray-700'
                }`}
              >
                {/* Шапка карточки */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl select-none">{cfg.icon}</span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-wide">{cfg.name}</h4>
                      </div>
                      <span className="text-xs text-gray-400 mt-0.5 leading-snug">
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
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        изменено
                      </span>
                    )}
                  </div>
                </div>

                {/* Ключевые слова */}
                <div className="flex flex-wrap items-center gap-1.5 select-none">
                  <span className="text-[10px] text-gray-500 font-medium uppercase mr-1">Ключевые слова:</span>
                  {cfg.keywords.slice(0, 6).map((kw) => (
                    <span
                      key={kw}
                      className="px-1.5 py-0.5 rounded-md bg-[#12141a] border border-[#242930] text-[10px] font-mono text-gray-400"
                    >
                      {kw.toUpperCase()}
                    </span>
                  ))}
                </div>

                {/* Счетчик наценки */}
                <div className="pt-2 border-t border-[#242930]">
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
        <div className="p-8 rounded-2xl bg-[#16181d] border border-dashed border-[#242930] text-center flex flex-col items-center justify-center gap-2">
          <Layers size={32} className="text-gray-600" />
          <p className="text-sm font-semibold text-gray-400">
            Дифференциация по сложности пластиков отключена
          </p>
          <p className="text-xs text-gray-500 max-w-md">
            Все типы пластика (PLA, ABS, TPU, Nylon) рассчитываются по единой базовой наценке мастерской. Включите опцию выше, чтобы настроить индивидуальные наценки.
          </p>
        </div>
      )}
    </div>
  );
}
