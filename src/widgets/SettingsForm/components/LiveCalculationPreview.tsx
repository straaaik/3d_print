'use client';

import React, { useState } from 'react';
import { MaterialDifficultyCategory, MATERIAL_DIFFICULTY_CONFIGS } from '../../../shared/lib/materialDifficulty';
import { Calculator } from 'lucide-react';

interface LiveCalculationPreviewProps {
  currency: string;
  electricityRate: string;
  laborRate: string;
  laborTimeMinutes: string;
  isOwnerLaborDefault: boolean;
  defaultMarkup: string;
  defaultDefect: string;
  minOrderPrice: string;
  enableMaterialDifficulty: boolean;
  materialMultipliers: Record<string, number>;
}

export function LiveCalculationPreview({
  currency,
  electricityRate,
  laborRate,
  laborTimeMinutes,
  isOwnerLaborDefault,
  defaultMarkup,
  defaultDefect,
  minOrderPrice,
  enableMaterialDifficulty,
  materialMultipliers,
}: LiveCalculationPreviewProps) {
  const [testWeight, setTestWeight] = useState(100);
  const [testHours, setTestHours] = useState(3);
  const [testCategory, setTestCategory] = useState<MaterialDifficultyCategory>('pla_petg');

  const filamentCostPerKg = 1800;
  const rawFilamentCost = (testWeight / 1000) * filamentCostPerKg;

  const elRateNum = parseFloat(electricityRate) || 0;
  const powerKwh = (250 / 1000) * testHours;
  const electricityCost = powerKwh * elRateNum;

  const depreciationCost = 20 * testHours;

  const lRateNum = parseFloat(laborRate) || 0;
  const lMinutesNum = parseInt(laborTimeMinutes, 10) || 0;
  const laborCost = (lMinutesNum / 60) * lRateNum;

  const defectNum = parseFloat(defaultDefect) || 0;
  const defectMultiplier = 1 + defectNum / 100;

  const rawPrintBase = (rawFilamentCost + electricityCost + depreciationCost) * defectMultiplier;

  const totalBaseCost = isOwnerLaborDefault ? rawPrintBase : rawPrintBase + laborCost;

  const markupNum = parseFloat(defaultMarkup) || 0;

  const matMultiplier = enableMaterialDifficulty ? (materialMultipliers[testCategory] ?? 100) / 100 : 1.0;

  let finalPrice = (totalBaseCost * (1 + markupNum / 100) + (isOwnerLaborDefault ? laborCost : 0)) * matMultiplier;

  const minOrderNum = parseFloat(minOrderPrice) || 0;
  const isMinOrderApplied = minOrderNum > 0 && finalPrice < minOrderNum;
  if (isMinOrderApplied) {
    finalPrice = minOrderNum;
  }

  const netProfit = Math.max(0, finalPrice - (isOwnerLaborDefault ? rawPrintBase : totalBaseCost));
  const marginPercent = finalPrice > 0 ? ((netProfit / finalPrice) * 100).toFixed(1) : '0';

  return (
    <div className="p-4 rounded-2xl bg-neutral-950/90 border border-white/15 shadow-xl flex flex-col gap-3 font-mono text-xs">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
            <Calculator size={15} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2 font-mono uppercase">
              <span>§ LIVE_PREVIEW // СИМУЛЯЦИЯ РАСЧЕТА</span>
            </h4>
            <p className="text-[10px] text-neutral-400 font-sans">
              Показывает, как текущие настройки превратят тестовую печать в итоговую розничную цену и чистую прибыль.
            </p>
          </div>
        </div>

        {/* Выбор пластика для симуляции */}
        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          {(['pla_petg', 'abs_asa', 'tpu_flex', 'nylon_cf'] as MaterialDifficultyCategory[]).map((cat) => {
            const cfg = MATERIAL_DIFFICULTY_CONFIGS[cat];
            const isSelected = testCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setTestCategory(cat)}
                className={`px-2 py-0.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-white/15 text-white border border-white/20 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{cfg.icon}</span>
                <span className="hidden sm:inline">{cfg.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Параметры тестовой модели */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 flex flex-col">
          <span className="text-neutral-500 text-[10px] uppercase">Вес модели:</span>
          <span className="font-mono font-bold text-white mt-0.5">{testWeight} г</span>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 flex flex-col">
          <span className="text-neutral-500 text-[10px] uppercase">Время печати:</span>
          <span className="font-mono font-bold text-white mt-0.5">{testHours} ч</span>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 flex flex-col">
          <span className="text-neutral-500 text-[10px] uppercase">Пластик ({testCategory.toUpperCase()}):</span>
          <span className="font-mono font-bold text-cyan-400 mt-0.5">
            {rawFilamentCost.toFixed(0)} {currency}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 flex flex-col">
          <span className="text-neutral-500 text-[10px] uppercase">Энергия + Амортизация:</span>
          <span className="font-mono font-bold text-amber-400 mt-0.5">
            {(electricityCost + depreciationCost).toFixed(1)} {currency}
          </span>
        </div>
      </div>

      {/* Результат расчета */}
      <div className="p-3.5 rounded-xl bg-neutral-900 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">Себестоимость</span>
            <span className="text-sm font-bold font-mono text-neutral-200">
              {totalBaseCost.toFixed(0)} {currency}
            </span>
          </div>

          <div className="text-neutral-600 font-bold text-base hidden sm:block">+</div>

          <div>
            <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">Работа ({laborTimeMinutes} мин)</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              {laborCost.toFixed(0)} {currency}
            </span>
          </div>

          <div className="text-neutral-600 font-bold text-base hidden sm:block">×</div>

          <div>
            <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">Наценка и сложность</span>
            <span className="text-sm font-bold font-mono text-amber-400">
              +{defaultMarkup}% {enableMaterialDifficulty ? `(×${matMultiplier.toFixed(2)})` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/10 pt-2.5 sm:pt-0">
          <div className="text-right">
            <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">Итоговая розница</span>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-xl font-bold font-mono text-white">
                {finalPrice.toFixed(0)} {currency}
              </span>
              {isMinOrderApplied && (
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded font-mono">
                  Мин. чек
                </span>
              )}
            </div>
          </div>

          <div className="text-right pl-3 border-l border-white/10">
            <span className="text-emerald-400 block text-[10px] font-bold uppercase tracking-wider">Чистая прибыль</span>
            <span className="text-base font-bold font-mono text-emerald-400">
              +{netProfit.toFixed(0)} {currency} ({marginPercent}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
