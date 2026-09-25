'use client';

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Printer as PrinterIcon,
  Layers,
  Coins,
  Clock,
  Zap,
  Gauge,
  MapPin,
  Box,
} from 'lucide-react';
import type { Placement, Furniture, Slot, Room, ModelKey } from './model';
import type { Printer, Filament } from '../../shared/types';
import { CockpitButton } from '../../shared/ui/CockpitButton';

interface WorkshopInspectionMenuProps {
  placement: Placement;
  entity: Printer | Filament | null | undefined;
  furniture: Furniture | undefined;
  slot: Slot | undefined;
  room: Room;
  isActive?: boolean;
  onClose: () => void;
  onToggleActive?: (printerId: string) => void;
  onModelChange?: (placementId: string, model: ModelKey) => void;
}

export function WorkshopInspectionMenu({
  placement,
  entity,
  furniture,
  slot,
  room,
  isActive = false,
  onClose,
  onToggleActive,
  onModelChange,
}: WorkshopInspectionMenuProps) {
  const isPrinter = placement.kind === 'printer';
  const printer = isPrinter && entity ? (entity as Printer) : null;
  const filament = !isPrinter && entity ? (entity as Filament) : null;

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Расчет экономических показателей для принтера
  const printerPrice = printer?.price ?? 0;
  const lifespanHours = printer?.lifespan_hours ?? 0;
  const powerW = printer?.power_w ?? 0;
  const depreciationPerHour = lifespanHours > 0 ? printerPrice / lifespanHours : 0;
  // Тариф на электроэнергию (базовый средний 5.5 ₽/кВт·ч)
  const powerCostPerHour = (powerW * 0.001) * 5.5;
  const totalCostPerHour = depreciationPerHour + powerCostPerHour;

  // Расчет экономических показателей для филамента
  const filamentPrice = filament?.price ?? 0;
  const filamentWeightG = filament?.weight_g ?? 0;
  const pricePerGram = filamentWeightG > 0 ? filamentPrice / filamentWeightG : 0;
  const pricePer100g = pricePerGram * 100;

  // Распознавание типа полимера из названия катушки
  const polymerMatch = filament?.name.match(/\b(PLA\+?|PETG|ABS\+?|TPU|ASA|NYLON|PC|PVA|HIPS|CARBON)\b/i);
  const polymerType = polymerMatch ? polymerMatch[0].toUpperCase() : 'ТЕРМОПЛАСТ';

  // Определение полки / ряда для мебели
  const shelfIndex = furniture && slot ? Math.floor(slot.index / Math.max(1, furniture.columns)) + 1 : 1;
  const colIndex = furniture && slot ? (slot.index % Math.max(1, furniture.columns)) + 1 : 1;

  return (
    <motion.aside
      aria-label="Инспекция оборудования"
      initial={{ opacity: 0, x: 28, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 28, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-4 right-4 z-30 flex max-h-[calc(100%-2rem)] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/95 font-mono text-white shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
    >
      {/* 1. Шапка (Topbar) в строгом стандарте DESIGN_SYSTEM.md */}
      <div className="flex items-center justify-between border-b border-white/10 bg-neutral-900/60 px-4 py-2.5 text-xs select-none">
        <div className="flex items-center gap-2.5">
          {/* Активный красный кружочек закрытия */}
          <button
            type="button"
            onClick={onClose}
            title="Закрыть инспекцию [Esc]"
            className="h-3 w-3 rounded-full bg-[#36363c] transition-all hover:scale-125 hover:bg-[#f87171] focus:outline-none"
          />
          <div className="h-3.5 w-px bg-white/15" />
          <span className="font-bold tracking-wider text-neutral-300 uppercase">
            {isPrinter ? 'ПРИНТЕР' : 'ФИЛАМЕНТ'} · ИНСПЕКЦИЯ
          </span>
        </div>

        {/* Статус-бейдж */}
        {isPrinter ? (
          <span
            className={`rounded border px-2 py-0.5 text-[10px] ${
              isActive
                ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-400'
                : 'bg-cyan-950/60 border-cyan-800/40 text-cyan-400'
            }`}
          >
            {isActive ? 'В РАБОТЕ // ПЕЧАТЬ' : 'В СЕТИ // ГОТОВ'}
          </span>
        ) : (
          <span className="rounded bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 text-[10px] text-emerald-400">
            НА СКЛАДЕ
          </span>
        )}
      </div>

      {/* 2. Рабочее тело карточки со скроллом */}
      <div className="overflow-y-auto p-4 space-y-4 text-xs">
        {/* Hero-блок объекта */}
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          {isPrinter ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-400">
              <PrinterIcon className="h-6 w-6" />
            </div>
          ) : (
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-neutral-900 shadow-inner">
              <div
                className="h-7 w-7 rounded-full border border-white/30 shadow-md"
                style={{ backgroundColor: filament?.color || '#e2e8f0' }}
              />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-sm font-semibold tracking-wide text-white truncate">
              {entity?.name ?? (isPrinter ? '3D-Принтер' : 'Катушка филамента')}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-400">
              {isPrinter ? (
                <>
                  <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-neutral-300">
                    3D: BAMBU LAB {placement.model.toUpperCase()}
                  </span>
                  {printer?.color && (
                    <div className="flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full border border-white/20"
                        style={{ backgroundColor: printer.color }}
                      />
                      <span>Цвет: {printer.color.toUpperCase()}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-neutral-300">
                    {polymerType}
                  </span>
                  <span>ЦВЕТ: {filament?.color ? filament.color.toUpperCase() : 'БЕЛЫЙ'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 3. Инженерно-экономическая телеметрия */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
            <span>Экономика и параметры</span>
            <span className="text-[10px] text-neutral-500">ТЕЛЕМЕТРИЯ</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {isPrinter ? (
              <>
                {/* Стоимость принтера */}
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Coins className="h-3.5 w-3.5" />
                    <span className="text-[10px]">СТОИМОСТЬ</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-white">
                    {printerPrice.toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-[9px] text-neutral-500">Балансовая цена</div>
                </div>

                {/* Ресурс работы */}
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-[10px]">РЕСУРС</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-white">
                    {lifespanHours.toLocaleString('ru-RU')} ч
                  </div>
                  <div className="text-[9px] text-neutral-500">Заявленный срок</div>
                </div>

                {/* Амортизация */}
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <Gauge className="h-3.5 w-3.5" />
                    <span className="text-[10px] text-neutral-400">АМОРТИЗАЦИЯ</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-cyan-300">
                    {depreciationPerHour.toFixed(2)} ₽/ч
                  </div>
                  <div className="text-[9px] text-neutral-500">Износ оборудования</div>
                </div>

                {/* Энергопотребление */}
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="text-[10px] text-neutral-400">МОЩНОСТЬ</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-white">
                    {powerW} Вт
                  </div>
                  <div className="text-[9px] text-neutral-500">~{powerCostPerHour.toFixed(2)} ₽/ч эл-ва</div>
                </div>
              </>
            ) : (
              <>
                {/* Стоимость катушки */}
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Coins className="h-3.5 w-3.5" />
                    <span className="text-[10px]">ЦЕНА КАТУШКИ</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-white">
                    {filamentPrice.toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-[9px] text-neutral-500">Закупочная цена</div>
                </div>

                {/* Масса / Вес */}
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Layers className="h-3.5 w-3.5" />
                    <span className="text-[10px]">МАССА</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-white">
                    {filamentWeightG.toLocaleString('ru-RU')} г
                  </div>
                  <div className="text-[9px] text-neutral-500">{(filamentWeightG / 1000).toFixed(2)} кг намотки</div>
                </div>

                {/* Себестоимость 1 грамма */}
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Gauge className="h-3.5 w-3.5" />
                    <span className="text-[10px] text-neutral-400">ЗА 1 ГРАММ</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-emerald-300">
                    {pricePerGram.toFixed(2)} ₽/г
                  </div>
                  <div className="text-[9px] text-neutral-500">Базовый расход</div>
                </div>

                {/* Расход на 100 грамм */}
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Box className="h-3.5 w-3.5" />
                    <span className="text-[10px] text-neutral-400">ЗА 100 Г</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-white">
                    {pricePer100g.toFixed(1)} ₽
                  </div>
                  <div className="text-[9px] text-neutral-500">Средняя модель</div>
                </div>
              </>
            )}
          </div>

          {/* Итоговая строка себестоимости */}
          <div className="rounded-lg border border-white/10 bg-neutral-900/60 p-2.5 text-[11px] text-neutral-300">
            {isPrinter ? (
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Себестоимость часа печати:</span>
                <span className="font-semibold text-cyan-300 tabular-nums">
                  ~{totalCostPerHour.toFixed(2)} ₽/ч
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Запас для производства:</span>
                <span className="font-semibold text-emerald-300 tabular-nums">
                  ~{Math.max(1, Math.floor(filamentWeightG / 30))} средних деталей
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Размещение в мастерской */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
            <MapPin className="h-3.5 w-3.5 text-cyan-400" />
            <span>Локация в мастерской</span>
          </div>

          <div className="space-y-1.5 text-[11px] text-neutral-300">
            <div className="flex justify-between">
              <span className="text-neutral-400">Помещение:</span>
              <span className="text-white font-medium">{room.name} ({room.width} × {room.depth} м)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Основание:</span>
              <span className="text-white font-medium">{furniture?.name ?? 'Рабочая зона'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Слот / Полка:</span>
              <span className="text-white font-medium">
                {isPrinter
                  ? `Позиция #${slot ? slot.index + 1 : 1}`
                  : `Полка #${shelfIndex}, ячейка #${colIndex}`}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Переключатель 3D-модели (только для 3D-принтера) */}
        {isPrinter && onModelChange && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-400 font-semibold uppercase tracking-wider">3D-модель в сцене</span>
              <span className="text-[10px] text-neutral-500">GLB 3D LABS</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onModelChange(placement.id, 'a1')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-mono transition-all active:scale-95 ${
                  placement.model === 'a1'
                    ? 'border-cyan-500/60 bg-cyan-950/50 text-cyan-300 font-bold shadow-inner'
                    : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Box className="h-3.5 w-3.5" />
                <span>Bambu A1</span>
              </button>

              <button
                type="button"
                onClick={() => onModelChange(placement.id, 'p1')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-mono transition-all active:scale-95 ${
                  placement.model === 'p1'
                    ? 'border-cyan-500/60 bg-cyan-950/50 text-cyan-300 font-bold shadow-inner'
                    : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Box className="h-3.5 w-3.5" />
                <span>Bambu P1</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Футер со стандартной кнопкой CockpitButton */}
      <div className="flex items-center justify-between border-t border-white/10 bg-neutral-900/60 px-4 py-2.5 font-mono text-xs select-none">
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
          ESC · ВЕРНУТЬСЯ
        </span>
        <CockpitButton size="sm" onClick={onClose}>
          [ Общий вид ]
        </CockpitButton>
      </div>
    </motion.aside>
  );
}
