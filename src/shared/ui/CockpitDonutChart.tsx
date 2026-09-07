'use client';

import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface DonutChartItem {
  id: string;
  label: string;
  value: number;
  color?: string;
  formattedValue?: string;
  subLabel?: string;
}

export interface CockpitDonutChartProps {
  data: DonutChartItem[];
  centerLabel?: string;
  centerValue?: string;
  centerSubLabel?: string;
  emptyLabel?: string;
  size?: number;
  strokeWidth?: number;
  activeStrokeWidth?: number;
  showLegend?: boolean;
  maxLegendItems?: number;
  formatValue?: (value: number) => string;
  className?: string;
  palette?: string[];
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
}

export const COCKPIT_DONUT_COLORS = [
  '#3d6373', // Slate-Cyan (серо-голубой)
  '#73434d', // Slate-Red (серо-красный)
  '#426656', // Slate-Green (серо-зелёный)
  '#735d3d', // Slate-Amber (серо-янтарный / бронзовый)
  '#584d6e', // Slate-Violet (серо-фиолетовый)
  '#3d566e', // Slate-Blue (серо-синий)
  '#6e4359', // Slate-Rose (серо-розовый)
  '#3d6661', // Slate-Teal (серо-бирюзовый)
  '#555d66', // Gunmetal Grey (оружейный серый)
  '#69717d', // Cool Slate (светлый серо-стальной)
];

export function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: Number((centerX + radius * Math.cos(angleInRadians)).toFixed(2)),
    y: Number((centerY + radius * Math.sin(angleInRadians)).toFixed(2)),
  };
}

/**
 * Generates an SVG path for an annular sector (donut slice) with subtle 2.5px rounded corners.
 */
export function describeRoundedAnnularSector(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  startAngle: number,
  endAngle: number,
  cornerRadius = 2.5,
) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.05) return '';

  // Full 360 ring
  if (sweep >= 359.9) {
    const p1Out = polarToCartesian(cx, cy, rOut, 0);
    const p2Out = polarToCartesian(cx, cy, rOut, 180);
    const p1In = polarToCartesian(cx, cy, rIn, 0);
    const p2In = polarToCartesian(cx, cy, rIn, 180);

    return [
      `M ${p1Out.x} ${p1Out.y}`,
      `A ${rOut} ${rOut} 0 1 1 ${p2Out.x} ${p2Out.y}`,
      `A ${rOut} ${rOut} 0 1 1 ${p1Out.x} ${p1Out.y}`,
      `M ${p1In.x} ${p1In.y}`,
      `A ${rIn} ${rIn} 0 1 0 ${p2In.x} ${p2In.y}`,
      `A ${rIn} ${rIn} 0 1 0 ${p1In.x} ${p1In.y}`,
      'Z',
    ].join(' ');
  }

  const thickness = rOut - rIn;
  const cr = Math.min(cornerRadius, thickness / 2 - 0.5, 3.5);

  const dThetaOut = (cr / rOut) * (180 / Math.PI);
  const dThetaIn = (cr / rIn) * (180 / Math.PI);

  if (sweep < (dThetaOut + dThetaIn) * 1.05) {
    const scale = sweep / ((dThetaOut + dThetaIn) * 1.1);
    return describeRoundedAnnularSector(cx, cy, rIn, rOut, startAngle, endAngle, cr * scale);
  }

  const largeArcOut = (sweep - 2 * dThetaOut) > 180 ? 1 : 0;
  const largeArcIn = (sweep - 2 * dThetaIn) > 180 ? 1 : 0;

  const pOutStartBefore = polarToCartesian(cx, cy, rOut - cr, startAngle);
  const pOutStartArc = polarToCartesian(cx, cy, rOut, startAngle + dThetaOut);

  const pOutEndArc = polarToCartesian(cx, cy, rOut, endAngle - dThetaOut);
  const pOutEndAfter = polarToCartesian(cx, cy, rOut - cr, endAngle);

  const pInEndBefore = polarToCartesian(cx, cy, rIn + cr, endAngle);
  const pInEndArc = polarToCartesian(cx, cy, rIn, endAngle - dThetaIn);

  const pInStartArc = polarToCartesian(cx, cy, rIn, startAngle + dThetaIn);
  const pInStartAfter = polarToCartesian(cx, cy, rIn + cr, startAngle);

  return [
    `M ${pInStartAfter.x} ${pInStartAfter.y}`,
    `L ${pOutStartBefore.x} ${pOutStartBefore.y}`,
    `A ${cr} ${cr} 0 0 1 ${pOutStartArc.x} ${pOutStartArc.y}`,
    `A ${rOut} ${rOut} 0 ${largeArcOut} 1 ${pOutEndArc.x} ${pOutEndArc.y}`,
    `A ${cr} ${cr} 0 0 1 ${pOutEndAfter.x} ${pOutEndAfter.y}`,
    `L ${pInEndBefore.x} ${pInEndBefore.y}`,
    `A ${cr} ${cr} 0 0 1 ${pInEndArc.x} ${pInEndArc.y}`,
    `A ${rIn} ${rIn} 0 ${largeArcIn} 0 ${pInStartArc.x} ${pInStartArc.y}`,
    `A ${cr} ${cr} 0 0 1 ${pInStartAfter.x} ${pInStartAfter.y}`,
    'Z',
  ].join(' ');
}

export function CockpitDonutChart({
  data,
  centerLabel,
  centerValue,
  centerSubLabel,
  emptyLabel = 'Нет данных',
  size = 205,
  strokeWidth = 17,
  showLegend = true,
  maxLegendItems = 8,
  formatValue,
  className = '',
  palette = COCKPIT_DONUT_COLORS,
  activeId: controlledActiveId,
  onActiveChange,
}: CockpitDonutChartProps) {
  const reducedMotion = useReducedMotion();
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);

  const activeId = controlledActiveId !== undefined ? controlledActiveId : internalActiveId;
  const setActiveId = (id: string | null) => {
    if (controlledActiveId === undefined) {
      setInternalActiveId(id);
    }
    onActiveChange?.(id);
  };

  const total = useMemo(() => data.reduce((sum, item) => sum + Math.max(0, item.value), 0), [data]);

  // Coordinate space inside SVG
  const viewBoxSize = 200;
  const center = viewBoxSize / 2;
  const outerRadius = 90;
  const innerRadius = outerRadius - strokeWidth;

  // Calculate arc segments with subtle corner fillets and clean gaps
  const segments = useMemo(() => {
    const validItems = data.filter((item) => item.value > 0);
    if (total <= 0 || validItems.length === 0) return [];

    const numItems = validItems.length;

    if (numItems === 1) {
      const single = validItems[0];
      return [{
        item: single,
        color: single.color || palette[0],
        path: describeRoundedAnnularSector(center, center, innerRadius, outerRadius, 0, 360, 0),
        percentage: 100,
        formattedVal: single.formattedValue || (formatValue ? formatValue(single.value) : String(single.value)),
        isSingle: true,
      }];
    }

    // Gap in degrees between sectors
    const desiredGapDeg = numItems <= 4 ? 4 : numItems <= 8 ? 3 : 2;
    const minSpanPerSlice = desiredGapDeg + 8; // Guarantee at least 8 deg solid arc per slice

    const rawSpans = validItems.map((item) => (item.value / total) * 360);
    let adjustedSpans = [...rawSpans];

    let iterations = 0;
    while (iterations < 10) {
      let smallItemsTotal = 0;
      let smallItemsCount = 0;
      let largeItemsValue = 0;

      for (let i = 0; i < numItems; i++) {
        if (adjustedSpans[i] < minSpanPerSlice) {
          smallItemsTotal += minSpanPerSlice;
          smallItemsCount++;
        } else {
          largeItemsValue += validItems[i].value;
        }
      }

      if (smallItemsCount === 0 || smallItemsCount === numItems) {
        if (smallItemsCount === numItems) {
          adjustedSpans = adjustedSpans.map(() => 360 / numItems);
        }
        break;
      }

      const remainingDegrees = 360 - smallItemsTotal;
      let changed = false;
      for (let i = 0; i < numItems; i++) {
        if (adjustedSpans[i] < minSpanPerSlice) {
          adjustedSpans[i] = minSpanPerSlice;
        } else {
          const nextVal = (validItems[i].value / largeItemsValue) * remainingDegrees;
          if (nextVal < minSpanPerSlice) {
            adjustedSpans[i] = minSpanPerSlice;
            changed = true;
          } else {
            adjustedSpans[i] = nextVal;
          }
        }
      }
      if (!changed) break;
      iterations++;
    }

    let currentAngle = 0;
    return validItems.map((item, index) => {
      const span = adjustedSpans[index];
      const percentage = Math.max(1, Math.round((item.value / total) * 100));
      const color = item.color || palette[index % palette.length];

      const startAngle = currentAngle + desiredGapDeg / 2;
      const endAngle = currentAngle + span - desiredGapDeg / 2;

      currentAngle += span;

      return {
        item,
        color,
        path: describeRoundedAnnularSector(center, center, innerRadius, outerRadius, startAngle, endAngle, 2.5),
        percentage,
        formattedVal: item.formattedValue || (formatValue ? formatValue(item.value) : String(item.value)),
        isSingle: false,
      };
    });
  }, [center, data, formatValue, innerRadius, outerRadius, palette, total]);

  const activeSegment = useMemo(
    () => segments.find((s) => s.item.id === activeId) || null,
    [activeId, segments],
  );

  // Center display values
  const displayPercentage = activeSegment ? `${activeSegment.percentage}%` : (centerValue || '100%');
  const displayLabel = activeSegment ? activeSegment.item.label : (centerLabel || 'Всего');
  const displaySubLabel = activeSegment
    ? activeSegment.formattedVal
    : (centerSubLabel || (formatValue ? formatValue(total) : total > 0 ? String(total) : ''));
  const activeColor = activeSegment ? activeSegment.color : '#a3a3a3';

  if (total <= 0 || segments.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-6 font-mono ${className}`}>
        <div className="relative mb-2 flex h-28 w-28 items-center justify-center rounded-full border border-dashed border-white/10 bg-white/[0.01]">
          <span className="text-xs text-neutral-600">{emptyLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 select-none ${className}`}>
      {/* LEFT: SVG Donut Ring */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={displayLabel}
        >
          {/* Background subtle track ring */}
          <path
            d={describeRoundedAnnularSector(center, center, innerRadius, outerRadius, 0, 360, 0)}
            fill="rgba(255, 255, 255, 0.04)"
          />

          {/* Dynamic Sectors */}
          {segments.map(({ item, color, path }) => {
            const isHovered = activeId === item.id;
            const hasOtherHovered = activeId !== null && !isHovered;

            return (
              <motion.path
                key={item.id}
                d={path}
                fill={color}
                style={{
                  cursor: 'pointer',
                  transformOrigin: `${center}px ${center}px`,
                  filter: isHovered ? `drop-shadow(0 0 8px ${color})` : undefined,
                }}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
                animate={{
                  opacity: hasOtherHovered ? 0.35 : 1,
                  scale: isHovered ? 1.04 : 1,
                }}
                transition={
                  reducedMotion
                    ? { duration: 0.1 }
                    : {
                        scale: { type: 'spring', stiffness: 450, damping: 28 },
                        opacity: { duration: 0.18 },
                      }
                }
                onMouseEnter={() => setActiveId(item.id)}
                onMouseLeave={() => setActiveId(null)}
                tabIndex={0}
                role="button"
                aria-label={`${item.label}: ${item.value}`}
                onFocus={() => setActiveId(item.id)}
                onBlur={() => setActiveId(null)}
                className="outline-none"
              />
            );
          })}
        </svg>

        {/* HUD Center Readout - Compact & Refined Typography */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center font-mono"
          aria-live="polite"
        >
          <motion.div
            key={activeId || '__total__'}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.92, y: 2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center px-2"
          >
            <strong className="text-xl sm:text-2xl font-bold tracking-tight text-white tabular-nums drop-shadow-sm leading-none">
              {displayPercentage}
            </strong>

            <span
              className="mt-1 max-w-[100px] sm:max-w-[110px] truncate text-[9.5px] sm:text-[10px] uppercase tracking-wider font-semibold leading-tight"
              style={{ color: activeSegment ? activeColor : '#a3a3a3' }}
              title={displayLabel}
            >
              {displayLabel}
            </span>

            {displaySubLabel ? (
              <span className="mt-0.5 max-w-[100px] sm:max-w-[110px] truncate text-[9px] sm:text-[9.5px] font-mono text-neutral-400 tabular-nums">
                {displaySubLabel}
              </span>
            ) : null}
          </motion.div>
        </div>
      </div>

      {/* RIGHT: Compact Side Legend */}
      {showLegend && data.length > 0 ? (
        <div className="flex flex-col gap-1 w-full sm:w-auto min-w-[200px] max-w-[290px]">
          {data.slice(0, maxLegendItems).map((item, index) => {
            const color = item.color || palette[index % palette.length];
            const isHovered = activeId === item.id;
            const hasOtherHovered = activeId !== null && !isHovered;
            const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
            const formattedVal = item.formattedValue || (formatValue ? formatValue(item.value) : String(item.value));

            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActiveId(item.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(item.id)}
                onBlur={() => setActiveId(null)}
                className={`group flex items-center gap-2 rounded-md border px-2 py-1 text-left font-mono text-[10.5px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50 ${
                  isHovered
                    ? 'border-white/25 bg-white/10 shadow-sm'
                    : hasOtherHovered
                    ? 'border-transparent bg-transparent opacity-40 hover:opacity-100'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]'
                }`}
              >
                {/* Color Dot */}
                <span
                  className="h-2 w-2 shrink-0 rounded-full transition-transform group-hover:scale-125"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />

                {/* Label */}
                <span className="truncate text-neutral-300 group-hover:text-white" title={item.label}>
                  {item.label}
                </span>

                {/* Value directly adjacent with small right margin */}
                <span className="ml-auto shrink-0 flex items-center gap-1.5 tabular-nums pl-2 text-right">
                  <strong className="text-neutral-200 text-[10.5px] font-semibold">{formattedVal}</strong>
                  <span className="text-[9.5px] text-neutral-500">{share}%</span>
                </span>
              </button>
            );
          })}

          {data.length > maxLegendItems ? (
            <p className="mt-0.5 text-right font-mono text-[9px] text-neutral-500">
              и ещё {data.length - maxLegendItems} поз.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
