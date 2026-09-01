'use client';

import React, { useMemo } from 'react';
import { CircleDotDashed } from 'lucide-react';
import type { RankedDatum } from '../types';
import { normalizeSharePercentages } from '../helpers/statsCalculator';
import { StatsChartShell } from './StatsChartShell';
import { CockpitDonutChart, type DonutChartItem } from '../../../shared/ui/CockpitDonutChart';

const STATUS_COLORS = [
  '#3d6373', // Slate-Cyan
  '#73434d', // Slate-Red
  '#426656', // Slate-Green
  '#735d3d', // Slate-Amber
  '#584d6e', // Slate-Violet
  '#3d566e', // Slate-Blue
  '#6e4359', // Slate-Pink
  '#555d66', // Gunmetal Grey
  '#3d6661', // Slate-Teal
];

export function OrderStatusChart({ data }: { data: RankedDatum[] }) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
  const shares = useMemo(() => normalizeSharePercentages(data.map((item) => item.value)), [data]);

  const donutData = useMemo<DonutChartItem[]>(() => {
    return data.map((item, index) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      color: item.color || STATUS_COLORS[index % STATUS_COLORS.length],
      formattedValue: `${item.value} шт.`,
    }));
  }, [data]);

  return (
    <StatsChartShell
      title="Статусы заказов"
      description="Текущая структура производственного потока"
      summary={data.map((item, index) => `${item.label}: ${item.value} (${shares[index]}%)`).join('; ') || 'Заказов нет.'}
      icon={CircleDotDashed}
      className="h-full"
    >
      <div className="flex items-center justify-center py-1">
        <CockpitDonutChart
          data={donutData}
          centerLabel="ВСЕГО ЗАКАЗОВ"
          centerValue={String(total)}
          centerSubLabel="в пуле"
          palette={STATUS_COLORS}
          emptyLabel="Нет активных заказов"
          size={205}
          strokeWidth={17}
          activeStrokeWidth={22}
        />
      </div>
    </StatsChartShell>
  );
}


