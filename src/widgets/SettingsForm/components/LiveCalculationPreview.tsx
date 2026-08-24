'use client';

import React, { useState } from 'react';
import { MaterialDifficultyCategory, MATERIAL_DIFFICULTY_CONFIGS } from '../../../shared/lib/materialDifficulty';
import { Sparkles, Calculator, ArrowRight, TrendingUp, DollarSign, CheckCircle2 } from 'lucide-react';

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
  const [testWeight, setTestWeight] = useState(100); // 100 грамм
  const [testHours, setTestHours] = useState(3); // 3 часа
  const [testCategory, setTestCategory] = useState<MaterialDifficultyCategory>('pla_petg');

  // Параметры тестовой катушки филамента (1800 ₽ за 1 кг)
  const filamentCostPerKg = 1800;
  const rawFilamentCost = (testWeight / 1000) * filamentCostPerKg;

  // Электричество: средний принтер 250 Вт = 0.25 кВт
  const elRateNum = parseFloat(electricityRate) || 0;
  const powerKwh = (250 / 1000) * testHours;
  const electricityCost = powerKwh * elRateNum;

  // Амортизация принтера (условно 20 ₽/час)
  const depreciationCost = 20 * testHours;

  // Труд мастера
  const lRateNum = parseFloat(laborRate) || 0;
  const lMinutesNum = parseInt(laborTimeMinutes, 10) || 0;
  const laborCost = (lMinutesNum / 60) * lRateNum;

  // Брак
  const defectNum = parseFloat(defaultDefect) || 0;
  const defectMultiplier = 1 + defectNum / 100;

  // Затраты на печать (пластик + энергия + амортизация) с учетом брака
  const rawPrintBase = (rawFilamentCost + electricityCost + depreciationCost) * defectMultiplier;

  // Себестоимость: если личный труд владельца — труд не входит в расходную себестоимость
  const totalBaseCost = isOwnerLaborDefault ? rawPrintBase : rawPrintBase + laborCost;

  // Торговая наценка
  const markupNum = parseFloat(defaultMarkup) || 0;

  // Коэффициент материала
  const matMultiplier = enableMaterialDifficulty ? (materialMultipliers[testCategory] ?? 100) / 100 : 1.0;

  // Расчет итоговой цены
  let finalPrice = (totalBaseCost * (1 + markupNum / 100) + (isOwnerLaborDefault ? laborCost : 0)) * matMultiplier;

  // Порог минимального заказа
  const minOrderNum = parseFloat(minOrderPrice) || 0;
  const isMinOrderApplied = minOrderNum > 0 && finalPrice < minOrderNum;
  if (isMinOrderApplied) {
    finalPrice = minOrderNum;
  }

  // Чистая прибыль
  const netProfit = Math.max(0, finalPrice - (isOwnerLaborDefault ? rawPrintBase : totalBaseCost));
  const marginPercent = finalPrice > 0 ? ((netProfit / finalPrice) * 100).toFixed(1) : '0';

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-[#16181f] to-[#12141a] border border-primary/20 shadow-xl flex flex-col gap-4">
      {/* Шапка интерактивного превью */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#242930] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
            <Calculator size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Симуляция расчета в реальном времени</span>
              <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full border border-primary/30 uppercase tracking-wider">
                Live Preview
              </span>
            </h4>
            <p className="text-[11px] text-gray-400">
              Показывает, как текущие настройки превратят тестовую печать в итоговую розничную цену и чистую прибыль.
            </p>
          </div>
        </div>

        {/* Выбор пластика для симуляции */}
        <div className="flex items-center gap-1 bg-[#0d0e12] p-1 rounded-xl border border-[#242930] self-start sm:self-auto">
          {(['pla_petg', 'abs_asa', 'tpu_flex', 'nylon_cf'] as MaterialDifficultyCategory[]).map((cat) => {
            const cfg = MATERIAL_DIFFICULTY_CONFIGS[cat];
            const isSelected = testCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setTestCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1d24]'
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
        <div className="p-2.5 rounded-xl bg-[#0e1015] border border-[#242930] flex flex-col">
          <span className="text-gray-400 text-[11px]">Вес модели:</span>
          <span className="font-mono font-bold text-white mt-0.5">{testWeight} г</span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#0e1015] border border-[#242930] flex flex-col">
          <span className="text-gray-400 text-[11px]">Время печати:</span>
          <span className="font-mono font-bold text-white mt-0.5">{testHours} часа</span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#0e1015] border border-[#242930] flex flex-col">
          <span className="text-gray-400 text-[11px]">Пластик ({testCategory.toUpperCase()}):</span>
          <span className="font-mono font-bold text-sky-400 mt-0.5">
            {rawFilamentCost.toFixed(0)} {currency}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#0e1015] border border-[#242930] flex flex-col">
          <span className="text-gray-400 text-[11px]">Энергия + Амортизация:</span>
          <span className="font-mono font-bold text-amber-400 mt-0.5">
            {(electricityCost + depreciationCost).toFixed(1)} {currency}
          </span>
        </div>
      </div>

      {/* Результат расчета */}
      <div className="p-4 rounded-xl bg-[#0d0e12] border border-[#242930] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Себестоимость</span>
            <span className="text-base font-bold font-mono text-gray-200">
              {totalBaseCost.toFixed(0)} {currency}
            </span>
          </div>

          <div className="text-gray-600 font-bold text-lg hidden sm:block">+</div>

          <div>
            <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Работа мастера ({laborTimeMinutes} мин)</span>
            <span className="text-base font-bold font-mono text-emerald-400">
              {laborCost.toFixed(0)} {currency}
            </span>
          </div>

          <div className="text-gray-600 font-bold text-lg hidden sm:block">×</div>

          <div>
            <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Наценка и сложность</span>
            <span className="text-base font-bold font-mono text-amber-400">
              +{defaultMarkup}% {enableMaterialDifficulty ? `(×${matMultiplier.toFixed(2)})` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-[#242930] pt-3 sm:pt-0">
          <div className="text-right">
            <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Итоговая розница</span>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-2xl font-black font-mono text-primary">
                {finalPrice.toFixed(0)} {currency}
              </span>
              {isMinOrderApplied && (
                <span className="text-[10px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 rounded">
                  Мин. чек
                </span>
              )}
            </div>
          </div>

          <div className="text-right pl-3 border-l border-[#242930]">
            <span className="text-emerald-400 block text-[10px] font-bold uppercase tracking-wider">Чистая прибыль</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              +{netProfit.toFixed(0)} {currency} ({marginPercent}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
