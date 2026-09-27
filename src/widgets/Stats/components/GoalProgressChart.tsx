'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Target } from 'lucide-react';
import { StatsChartShell } from './StatsChartShell';
import { formatMoney } from './StatsKpiCards';
import { describeRoundedAnnularSector } from '../../../shared/ui/CockpitDonutChart';

interface GoalProgressChartProps {
  goal: { target: number; actual: number; progressPercent: number | null };
  resultLabel: string;
}

export function GoalProgressChart({ goal, resultLabel }: GoalProgressChartProps) {
  const reducedMotion = useReducedMotion();
  const visualProgress = Math.max(0, Math.min(100, goal.progressPercent || 0));
  const rawProgress = goal.progressPercent !== null ? goal.progressPercent : 0;

  const isMet = goal.actual >= goal.target;
  const isNegative = goal.actual < 0;

  // Slate-tinted colors (muted, technical, non-neon)
  const progressColor = isMet
    ? '#426656' // Slate-Emerald (цель выполнена)
    : isNegative
    ? '#73434d' // Slate-Red (отрицательный результат)
    : '#3d6373'; // Slate-Cyan (в процессе выполнения)

  const summary = goal.progressPercent === null
    ? 'Финансовая цель для выбранного периода не задана.'
    : `Цель ${formatMoney(goal.target)}, выполнено ${goal.progressPercent.toFixed(1)} процента.`;

  const viewBoxSize = 200;
  const center = viewBoxSize / 2;
  const outerRadius = 90;
  const strokeWidth = 17;
  const innerRadius = outerRadius - strokeWidth;

  const progressAngle = Math.max(0.1, (visualProgress / 100) * 360);

  return (
    <StatsChartShell
      title="План"
      description={`Прогресс показателя «${resultLabel}»`}
      summary={summary}
      icon={Target}
      className="h-full"
    >
      {goal.progressPercent === null ? (
        <div className="flex min-h-48 flex-col items-center justify-center text-center font-mono">
          <div className="relative mb-3 flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-white/10 bg-white/[0.01]">
            <Target className="h-7 w-7 text-neutral-600" />
          </div>
          <strong className="text-sm font-semibold text-white">Цель не задана</strong>
          <p className="mt-1 max-w-xs text-xs text-neutral-500">
            Установите месячную цель в разделе заказов — статистика подхватит её автоматически.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-7 py-1 select-none font-mono">
          {/* Gauge Ring */}
          <div className="relative shrink-0" style={{ width: 165, height: 165 }}>
            <svg
              viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
              className="h-full w-full overflow-visible"
              role="img"
              aria-label={`Выполнено ${rawProgress.toFixed(0)}%`}
            >
              {/* Background subtle track ring */}
              <path
                d={describeRoundedAnnularSector(center, center, innerRadius, outerRadius, 0, 360, 0)}
                fill="rgba(255, 255, 255, 0.04)"
              />

              {/* Progress Sector */}
              {visualProgress > 0 ? (
                <motion.path
                  d={describeRoundedAnnularSector(center, center, innerRadius, outerRadius, 0, progressAngle, 2.5)}
                  fill={progressColor}
                  style={{
                    filter: `drop-shadow(0 0 8px ${progressColor})`,
                    transformOrigin: `${center}px ${center}px`,
                  }}
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              ) : null}
            </svg>

            {/* Center HUD */}
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center font-mono"
              aria-live="polite"
            >
              <strong className="text-xl sm:text-2xl font-bold tracking-tight text-white tabular-nums drop-shadow-sm leading-none">
                {rawProgress.toFixed(0)}%
              </strong>
              <span className="mt-1 text-[9px] sm:text-[9.5px] uppercase tracking-wider font-semibold text-neutral-400">
                {isMet ? 'достигнуто' : 'выполнено'}
              </span>
            </div>
          </div>

          {/* Right: Telemetry data rows */}
          <div className="flex flex-col gap-1.5 w-full sm:w-auto min-w-[190px] max-w-[260px] text-xs">
            <div className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
              <span className="text-neutral-400">Факт</span>
              <strong className="text-white text-[13px] font-semibold tabular-nums">{formatMoney(goal.actual)}</strong>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
              <span className="text-neutral-400">Цель</span>
              <strong className="text-neutral-300 text-[12px] tabular-nums">{formatMoney(goal.target)}</strong>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
              <span className="text-neutral-400">
                {isMet ? 'Сверх плана' : 'Осталось'}
              </span>
              <strong className={`text-[12px] tabular-nums ${isMet ? 'text-emerald-400' : 'text-neutral-300'}`}>
                {formatMoney(Math.abs(goal.target - goal.actual))}
              </strong>
            </div>
          </div>
        </div>
      )}
    </StatsChartShell>
  );
}

