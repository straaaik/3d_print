'use client';

import React from 'react';
import { Card } from '../../../shared/ui/Card';
import { QuickStepper } from './QuickStepper';
import { Percent, Flame, AlertTriangle, TrendingUp, Info } from 'lucide-react';

interface PricingSettingsTabProps {
  currency: string;

  defaultMarkup: string;
  setDefaultMarkup: (val: string) => void;
  isDefaultMarkupChanged: boolean;

  defaultUrgencyPercent: string;
  setDefaultUrgencyPercent: (val: string) => void;
  isDefaultUrgencyPercentChanged: boolean;

  defaultDefect: string;
  setDefaultDefect: (val: string) => void;
  isDefaultDefectChanged: boolean;
}

export function PricingSettingsTab({
  currency,
  defaultMarkup,
  setDefaultMarkup,
  isDefaultMarkupChanged,
  defaultUrgencyPercent,
  setDefaultUrgencyPercent,
  isDefaultUrgencyPercentChanged,
  defaultDefect,
  setDefaultDefect,
  isDefaultDefectChanged,
}: PricingSettingsTabProps) {
  const markupNum = parseFloat(defaultMarkup) || 0;
  const marginPercent = markupNum > 0 ? ((markupNum / (100 + markupNum)) * 100).toFixed(1) : '0';
  const multiplierText = ((100 + markupNum) / 100).toFixed(2);

  return (
    <div className="flex flex-col gap-4 font-mono text-xs">
      {/* 1. Основные параметры наценки */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Базовая наценка */}
        <Card
          title="Базовая наценка"
          stepNumber="📈"
          className="flex flex-col justify-between"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Основная торговая надбавка на себестоимость печати и материалов.
              </p>
              {isDefaultMarkupChanged && (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 shrink-0 font-mono">
                  изменено
                </span>
              )}
            </div>

            <QuickStepper
              label="Наценка мастерской, %"
              value={parseInt(defaultMarkup, 10) || 0}
              onChange={(val) => setDefaultMarkup(val.toString())}
              min={0}
              max={1000}
              step={10}
              presets={[30, 50, 100, 150, 200, 300]}
              suffix="%"
              isModified={isDefaultMarkupChanged}
            />

            <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 flex flex-col gap-1 text-[11px] font-mono">
              <div className="flex justify-between text-neutral-300">
                <span>Множитель:</span>
                <span className="font-mono font-bold text-amber-400">×{multiplierText}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Маржинальность:</span>
                <span className="font-mono font-bold text-emerald-400">{marginPercent}%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Надбавка за срочность */}
        <Card
          title="Надбавка за срочность"
          stepNumber="⚡"
          className="flex flex-col justify-between"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Процент увеличения цены при включении флага «Срочный заказ» в калькуляторе.
              </p>
              {isDefaultUrgencyPercentChanged && (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 shrink-0 font-mono">
                  изменено
                </span>
              )}
            </div>

            <QuickStepper
              label="Коэффициент срочности, %"
              value={parseInt(defaultUrgencyPercent, 10) || 0}
              onChange={(val) => setDefaultUrgencyPercent(val.toString())}
              min={0}
              max={300}
              step={5}
              presets={[0, 15, 25, 50, 100]}
              suffix="%"
              isModified={isDefaultUrgencyPercentChanged}
            />

            <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 text-[11px] text-neutral-400 font-sans">
              🔥 При надбавке <strong>+{defaultUrgencyPercent}%</strong> заказ стоимостью 1000 {currency} станет стоить <strong>{(1000 * (1 + (parseFloat(defaultUrgencyPercent) || 0) / 100)).toFixed(0)} {currency}</strong>.
            </div>
          </div>
        </Card>

        {/* Учет брака */}
        <Card
          title="Резерв на брак и отходы"
          stepNumber="🛡️"
          className="flex flex-col justify-between"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Закладываемый процент неудачной печати, обрезков нити и чисток сопла в себестоимость.
              </p>
              {isDefaultDefectChanged && (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 shrink-0 font-mono">
                  изменено
                </span>
              )}
            </div>

            <QuickStepper
              label="Процент брака, %"
              value={parseInt(defaultDefect, 10) || 0}
              onChange={(val) => setDefaultDefect(val.toString())}
              min={0}
              max={50}
              step={1}
              presets={[0, 3, 5, 8, 10]}
              suffix="%"
              isModified={isDefaultDefectChanged}
            />

            <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 text-[11px] text-neutral-400 font-sans">
              Стандарт для мастерских — <strong>5%</strong>. Для сложных инженерных пластиков рекомендуется <strong>8–10%</strong>.
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Шпаргалка */}
      <Card
        title="Шпаргалка: Как наценка переводится в маржинальность"
        stepNumber="💡"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
          <div className="p-3 rounded-xl bg-neutral-900 border border-white/10">
            <div className="text-xs text-neutral-400 font-medium">50% наценка</div>
            <div className="text-base font-bold text-white mt-1">×1.50</div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-bold">Маржа: 33.3%</div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900 border border-cyan-500/40">
            <div className="text-xs text-cyan-400 font-medium">100% наценка (Х2)</div>
            <div className="text-base font-bold text-white mt-1">×2.00</div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-bold">Маржа: 50.0%</div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900 border border-white/10">
            <div className="text-xs text-neutral-400 font-medium">150% наценка</div>
            <div className="text-base font-bold text-white mt-1">×2.50</div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-bold">Маржа: 60.0%</div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900 border border-white/10">
            <div className="text-xs text-neutral-400 font-medium">200% наценка (Х3)</div>
            <div className="text-base font-bold text-white mt-1">×3.00</div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-bold">Маржа: 66.7%</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
