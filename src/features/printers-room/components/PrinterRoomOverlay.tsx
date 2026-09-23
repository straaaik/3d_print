'use client';

import React, { useMemo } from 'react';
import { Minus, Plus, Scan, Maximize2 } from 'lucide-react';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../../shared/ui/CockpitDropdown';
import type { Printer } from '../../../shared/types';
import { calculateRoomLayout } from '../scene/layout';

export interface PrinterRoomOverlayProps {
  printersCount: number;
  printers?: Printer[];
  selectedId?: string;
  hasSelection: boolean;
  topView?: boolean;
  onResetFocus: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onTopView?: (top: boolean) => void;
  onSelect?: (id: string) => void;
  onFullscreen?: () => void;
}
export function PrinterRoomOverlay({ printersCount, printers = [], selectedId, hasSelection, topView = false,
  onResetFocus, onZoomIn, onZoomOut, onTopView, onSelect, onFullscreen }: PrinterRoomOverlayProps) {
  const layout = useMemo(() => calculateRoomLayout(printers), [printers]);
  const options = useMemo(() => printers.map(p => ({ value: p.id, label: p.name, color: p.color })), [printers]);
  const [width, , depth] = layout.roomSize;
  const rows = new Set(layout.stations.map(s => s.position[2])).size;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 select-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          {[{ label: 'Принтеров', value: printersCount }, { label: 'Рядов', value: rows }].map(item => (
            <div key={item.label} className="min-w-20 sm:min-w-24 rounded-lg border border-white/10 bg-[#151e25]/90 px-3 py-2 sm:py-3 backdrop-blur-md">
              <div className="text-xl text-neutral-100 font-mono tabular-nums">{item.value}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-neutral-400"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />{item.label}</div>
            </div>
          ))}
        </div>
        <div className="pointer-events-auto flex gap-2">
          <CockpitButton onClick={onResetFocus} className="hidden sm:flex bg-[#151e25]/90" icon={Scan}>Общий вид</CockpitButton>
          {onFullscreen && <CockpitButton aria-label="Развернуть комнату" title="Развернуть комнату" onClick={onFullscreen} icon={Maximize2} className="bg-[#151e25]/90" />}
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <p className="hidden sm:block text-[10px] text-neutral-400 font-mono">Перетаскивайте сцену · Нажмите на принтер</p>
          {printers.length > 0 && <div className="pointer-events-auto max-w-60">
            <CockpitDropdown options={options} value={selectedId} onChange={onSelect} placeholder="Найти принтер" ariaLabel="Выбрать принтер в комнате"
              searchable usePortal dropdownWidth={280} buttonClassName="bg-[#151e25]/95" />
          </div>}
          <div className="pointer-events-auto flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-[#151e25]/95 p-1.5 backdrop-blur-md">
            <CockpitButton isActive={topView} aria-pressed={topView} aria-label="Вид сверху" onClick={() => onTopView?.(true)}>2D</CockpitButton>
            <CockpitButton isActive={!topView} aria-pressed={!topView} aria-label="Изометрический вид" onClick={() => onTopView?.(false)}>3D</CockpitButton>
            <CockpitButton aria-label="Общий вид" onClick={onResetFocus} icon={Scan} />
            <CockpitButton aria-label="Отдалить" onClick={onZoomOut} icon={Minus} />
            <CockpitButton aria-label="Приблизить" onClick={onZoomIn} icon={Plus} />
          </div>
        </div>
        <div className="hidden sm:block w-36 shrink-0 rounded-lg border border-white/10 bg-[#151e25]/90 p-2 backdrop-blur-md">
          <svg viewBox={`${-width / 2} ${-depth / 2} ${width} ${depth}`} className="w-full h-24" role="img" aria-label="План размещения принтеров">
            <rect x={-width / 2} y={-depth / 2} width={width} height={depth} fill="#28323b" />
            {layout.stations.map(station => <rect key={station.printerId} x={station.position[0] - .5} y={station.position[2] - .4}
              width={1} height={.8} rx={.08} fill={station.printerId === selectedId ? '#76bfff' : '#9ba4ad'} />)}
          </svg>
          <p className="mt-1 text-center text-[9px] font-mono text-neutral-400">{hasSelection ? 'ВЫБРАННЫЙ ПРИНТЕР' : 'ПЛАН МАСТЕРСКОЙ'}</p>
        </div>
      </div>
    </div>
  );
}
