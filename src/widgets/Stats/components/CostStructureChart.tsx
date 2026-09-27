'use client';

import React, { useMemo } from 'react';
import { PieChart } from 'lucide-react';
import type { RankedDatum } from '../types';
import { normalizeSharePercentages } from '../helpers/statsCalculator';
import { StatsChartShell } from './StatsChartShell';
import { formatMoney } from './StatsKpiCards';
import { CockpitDonutChart, type DonutChartItem } from '../../../shared/ui/CockpitDonutChart';

const COST_COLORS = [
  '#73434d', // Slate-Red
  '#735d3d', // Slate-Amber
  '#584d6e', // Slate-Violet
  '#3d6373', // Slate-Cyan
  '#3d566e', // Slate-Blue
  '#6e4359', // Slate-Pink
  '#3d6661', // Slate-Teal
  '#555d66', // Gunmetal Grey
];

export function CostStructureChart({ data, total }: { data: RankedDatum[]; total: number }) {
  const shares = useMemo(() => normalizeSharePercentages(data.map((item) => item.value)), [data]);

  const donutData = useMemo<DonutChartItem[]>(() => {
    return data.map((item, index) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      color: item.color || COST_COLORS[index % COST_COLORS.length],
      formattedValue: formatMoney(item.value),
    }));
  }, [data]);

  return (
    <StatsChartShell
      title="Структура затрат"
      description="Все статьи сверены с общей суммой расходов"
      summary={data.map((item, index) => `${item.label}: ${formatMoney(item.value)}, ${shares[index]}%`).join('; ') || 'Расходов нет.'}
      icon={PieChart}
      className="h-full"
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-center py-1">
          <CockpitDonutChart
            data={donutData}
            centerLabel="РАСХОДЫ"
            centerValue={formatMoney(total)}
            centerSubLabel="всего"
            palette={COST_COLORS}
            emptyLabel="Расходов нет"
            size={205}
            strokeWidth={17}
            activeStrokeWidth={22}
          />
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 font-mono text-[10px] text-neutral-500">
          <span>RECONCILIATION: OK</span>
          <strong className="text-neutral-300">{formatMoney(total)}</strong>
        </div>
      </div>
    </StatsChartShell>
  );
}


