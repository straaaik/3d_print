'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  Package,
  Layers,
  Sparkles,
  Type,
  Trash2,
  Edit,
} from 'lucide-react';
import type { FurnitureKind, Room, Workshop } from './model';
import type { Filament, Printer } from '../../shared/types';

interface WorkshopAddCatalogProps {
  layout: Workshop;
  room: Room;
  printers: Printer[];
  filaments: Filament[];
  onAddFurniture: (kind: FurnitureKind) => void;
  onPlacePrinter: (printer: Printer) => void;
  onPlaceFilament: (filament: Filament) => void;
  onAddLabel?: (preset?: { text: string; color: string }) => void;
  onSelectLabel?: (roomId: string, labelId: string) => void;
  onDeleteLabel?: (roomId: string, labelId: string) => void;
}

/* ==========================================================================
   ИЗОМЕТРИЧЕСКИЕ ИЛЛЮСТРАЦИИ МЕБЕЛИ (SVG ДЛЯ СТОЛА, СТОЙКИ И СТЕЛЛАЖА)
   ========================================================================== */

function TableVisual({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 76" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="tblWoodTop" x1="16" y1="20" x2="84" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e3b679" />
          <stop offset="0.6" stopColor="#cca062" />
          <stop offset="1" stopColor="#b48749" />
        </linearGradient>
        <linearGradient id="tblWoodFront" x1="14" y1="36" x2="76" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#af7c3c" />
          <stop offset="1" stopColor="#8d602a" />
        </linearGradient>
        <linearGradient id="tblWoodSide" x1="76" y1="46" x2="88" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7a5223" />
          <stop offset="1" stopColor="#553815" />
        </linearGradient>
        <linearGradient id="tblLegSteel" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#353e4b" />
          <stop offset="1" stopColor="#1e242c" />
        </linearGradient>
      </defs>
      {/* Мягкая тень */}
      <ellipse cx="50" cy="67" rx="36" ry="5.5" fill="#000" fillOpacity="0.45" />
      {/* Задние ножки */}
      <rect x="33" y="24" width="4" height="36" rx="1" fill="#15191f" />
      <rect x="80" y="32" width="4" height="29" rx="1" fill="#15191f" />
      {/* Задняя перекладина жесткости */}
      <line x1="35" y1="48" x2="82" y2="54" stroke="#15191f" strokeWidth="2.5" />
      {/* Передние ножки */}
      <rect x="15" y="36" width="4.5" height="29" rx="1" fill="url(#tblLegSteel)" />
      <rect x="74" y="47" width="4.5" height="19" rx="1" fill="url(#tblLegSteel)" />
      {/* Передняя рама под столешницей */}
      <path d="M 18,39 L 76,50" stroke="#232a35" strokeWidth="3" strokeLinecap="round" />
      {/* Столешница: боковая грань */}
      <path d="M 76,46 L 88,34 L 88,38 L 76,50 Z" fill="url(#tblWoodSide)" />
      {/* Столешница: передняя грань */}
      <path d="M 14,35 L 76,46 L 76,50 L 14,39 Z" fill="url(#tblWoodFront)" />
      {/* Столешница: верхняя плоскость */}
      <path d="M 28,19 L 88,34 L 76,46 L 14,35 Z" fill="url(#tblWoodTop)" />
      {/* Текстурные линии дерева */}
      <path d="M 23,24 L 84,38" stroke="#a47233" strokeWidth="0.8" strokeOpacity="0.45" />
      <path d="M 19,30 L 80,42" stroke="#a47233" strokeWidth="0.8" strokeOpacity="0.45" />
      {/* Блик на передней фаске */}
      <path d="M 14,35 L 76,46" stroke="#f6d9a8" strokeWidth="0.75" strokeOpacity="0.7" />
    </svg>
  );
}

function PrinterRackVisual({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 76" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="prWoodTop" x1="16" y1="20" x2="84" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e3b679" />
          <stop offset="1" stopColor="#b48749" />
        </linearGradient>
        <linearGradient id="prWoodFront" x1="14" y1="36" x2="76" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#af7c3c" />
          <stop offset="1" stopColor="#8d602a" />
        </linearGradient>
        <linearGradient id="prLegGrad" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#3d4756" />
          <stop offset="1" stopColor="#1e242c" />
        </linearGradient>
      </defs>
      {/* Тень */}
      <ellipse cx="50" cy="69" rx="36" ry="5" fill="#000" fillOpacity="0.45" />
      {/* Задние стойки */}
      <rect x="33" y="10" width="3.5" height="52" rx="1" fill="#15191f" />
      <rect x="80" y="18" width="3.5" height="46" rx="1" fill="#15191f" />
      {/* Нижний ярус */}
      <path d="M 74,56 L 84,48 L 84,51 L 74,59 Z" fill="#6d4b21" />
      <path d="M 18,47 L 74,56 L 74,59 L 18,50 Z" fill="url(#prWoodFront)" />
      <path d="M 28,38 L 84,48 L 74,56 L 18,47 Z" fill="url(#prWoodTop)" />
      {/* Верхний ярус */}
      <path d="M 74,32 L 84,24 L 84,27 L 74,35 Z" fill="#6d4b21" />
      <path d="M 18,23 L 74,32 L 74,35 L 18,26 Z" fill="url(#prWoodFront)" />
      <path d="M 28,14 L 84,24 L 74,32 L 18,23 Z" fill="url(#prWoodTop)" />
      {/* Передние вертикальные стойки */}
      <rect x="15" y="20" width="4" height="48" rx="1" fill="url(#prLegGrad)" />
      <rect x="74" y="29" width="4" height="40" rx="1" fill="url(#prLegGrad)" />
      {/* Боковая диагональ */}
      <line x1="76" y1="36" x2="82" y2="58" stroke="#252d38" strokeWidth="1.5" strokeOpacity="0.8" />
    </svg>
  );
}

function FilamentRackVisual({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 76" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="frLegGrad" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#384250" />
          <stop offset="1" stopColor="#1a1f26" />
        </linearGradient>
      </defs>
      {/* Тень */}
      <ellipse cx="50" cy="70" rx="32" ry="4.5" fill="#000" fillOpacity="0.45" />
      {/* Задние стойки */}
      <rect x="38" y="6" width="3" height="58" rx="1" fill="#14181e" />
      <rect x="74" y="12" width="3" height="53" rx="1" fill="#14181e" />
      {/* 4 Полки */}
      {[
        { yF: 59, yB: 50, yL: 52 },
        { yF: 45, yB: 36, yL: 38 },
        { yF: 31, yB: 22, yL: 24 },
        { yF: 17, yB: 8,  yL: 10 },
      ].map((s, idx) => (
        <g key={idx}>
          <path
            d={`M 34,${s.yL} L 74,${s.yB} L 66,${s.yB + 6} L 24,${s.yF} Z`}
            fill="#cca062"
          />
          <path
            d={`M 24,${s.yF} L 66,${s.yB + 6} L 66,${s.yB + 8} L 24,${s.yF + 2} Z`}
            fill="#9b6e32"
          />
          {/* Иконки катушек на полках */}
          {idx > 0 && (
            <>
              <circle cx="38" cy={s.yL + 3} r="2.8" fill="#38bdf8" fillOpacity="0.85" />
              <circle cx="48" cy={s.yL + 5} r="2.8" fill="#f97316" fillOpacity="0.85" />
              <circle cx="58" cy={s.yL + 7} r="2.8" fill="#a855f7" fillOpacity="0.85" />
            </>
          )}
        </g>
      ))}
      {/* Передние стойки */}
      <rect x="23" y="14" width="3.5" height="56" rx="1" fill="url(#frLegGrad)" />
      <rect x="66" y="21" width="3.5" height="50" rx="1" fill="url(#frLegGrad)" />
      {/* Боковые крестовины */}
      <line x1="25" y1="22" x2="39" y2="40" stroke="#252d38" strokeWidth="1.2" />
      <line x1="25" y1="40" x2="39" y2="22" stroke="#252d38" strokeWidth="1.2" />
      <line x1="25" y1="42" x2="39" y2="60" stroke="#252d38" strokeWidth="1.2" />
      <line x1="25" y1="60" x2="39" y2="42" stroke="#252d38" strokeWidth="1.2" />
    </svg>
  );
}

/* ==========================================================================
   ОСНОВНОЙ КОМПОНЕНТ КАТАЛОГА 3D-ОБЪЕКТОВ
   ========================================================================== */

const GRAFFITI_PRESETS = [
  { text: 'A // ПРОТОТИПИРОВАНИЕ', color: '#38bdf8', category: 'Зона печати' },
  { text: 'B // СЕРИЙНАЯ ПЕЧАТЬ', color: '#f59e0b', category: 'Зона производства' },
  { text: 'C // СКЛАД МАТЕРИАЛОВ', color: '#10b981', category: 'Хранение' },
  { text: 'D // ПОСТОБРАБОТКА', color: '#a855f7', category: 'Техзона' },
  { text: 'ОСТОРОЖНО: ГОРЯЧО', color: '#ef4444', category: 'Безопасность' },
  { text: '3D LABS WORKSHOP', color: '#ffffff', category: 'Брендинг' },
  { text: 'ВХОД / ЗОНА ПРИЁМКИ', color: '#60a5fa', category: 'Навигация' },
  { text: 'ТЕХНИЧЕСКАЯ ЗОНА', color: '#fb923c', category: 'Техзона' },
];

export function WorkshopAddCatalog({
  layout,
  room,
  printers,
  filaments,
  onAddFurniture,
  onPlacePrinter,
  onPlaceFilament,
  onAddLabel,
  onSelectLabel,
  onDeleteLabel,
}: WorkshopAddCatalogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'furniture' | 'inventory' | 'graffiti'>('furniture');

  const addFurniture = (kind: FurnitureKind) => { onAddFurniture(kind); setIsOpen(false); };

  // Неразмещённые принтеры
  const placedPrinterIds = new Set(
    layout.placements.filter((p) => p.kind === 'printer').map((p) => p.entityId)
  );
  const unplacedPrinters = printers.filter((p) => !placedPrinterIds.has(p.id));

  // Неразмещённый филамент
  const placedFilamentIds = new Set(
    layout.placements.filter((p) => p.kind === 'filament').map((p) => p.entityId)
  );
  const unplacedFilaments = filaments.filter((f) => !placedFilamentIds.has(f.id));

  const totalUnplaced = unplacedPrinters.length + unplacedFilaments.length;

  if (!isOpen) {
    return (
      <div className="absolute right-4 top-4 z-20">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-neutral-950/90 px-3.5 py-2.5 font-mono text-xs text-white shadow-2xl backdrop-blur-md transition-all hover:bg-white/10 active:scale-95"
        >
          <Plus className="h-4 w-4 text-cyan-400" />
          <span>Каталог 3D-объектов</span>
          {totalUnplaced > 0 && (
            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] text-cyan-300">
              {totalUnplaced}
            </span>
          )}
          <ChevronLeft className="h-4 w-4 text-neutral-400" />
        </button>
      </div>
    );
  }

  return (
    <motion.aside
      aria-label="Каталог 3D-объектов"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-4 top-4 bottom-4 z-20 flex w-[350px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/95 font-mono text-white shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
    >
      {/* Шапка каталога */}
      <div className="flex items-center justify-between border-b border-white/10 bg-neutral-900/60 px-4 py-2.5 text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wider text-neutral-200 uppercase">
            3D-КАТАЛОГ // ОБЪЕКТЫ
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          title="Свернуть каталог"
          className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Вкладки: Модели мастерской / Склад / Граффити */}
      <div className="grid grid-cols-3 border-b border-white/10 bg-white/[0.02] p-1 text-xs select-none">
        <button
          type="button"
          onClick={() => setTab('furniture')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-center transition-all ${
            tab === 'furniture'
              ? 'bg-white/15 text-white font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Модели</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('inventory')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-center transition-all ${
            tab === 'inventory'
              ? 'bg-white/15 text-white font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Package className="h-3.5 w-3.5" />
          <span>Склад</span>
          {totalUnplaced > 0 && (
            <span className="rounded-full bg-cyan-500/25 px-1.5 py-0.2 text-[10px] text-cyan-300">
              {totalUnplaced}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('graffiti')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-center transition-all ${
            tab === 'graffiti'
              ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm border border-cyan-500/30'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Type className="h-3.5 w-3.5" />
          <span>Граффити</span>
          {(room.labels?.length ?? 0) > 0 && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-neutral-300">
              {room.labels?.length}
            </span>
          )}
        </button>
      </div>

      {/* Тело каталога */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {tab === 'furniture' ? (
          <>
            {/* Раздел 1: Мебель для печати */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
                <span>Мебель мастерской</span>
                <span className="text-[10px] text-neutral-500">СЛОТЫ</span>
              </div>

              <div className="space-y-2">
                {/* Стол для 3D-принтера */}
                <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.04] transition-all">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-900/90 shadow-inner group-hover:border-cyan-500/40 transition-colors">
                    <TableVisual className="h-full w-full p-1 group-hover:scale-105 transition-transform duration-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate text-xs group-hover:text-cyan-200 transition-colors">
                      Стол для принтеров
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                      3.6 × 0.8 м · 4 места
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-neutral-400 border border-white/5">
                        4 СЛОТА
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addFurniture('table')}
                    title="Добавить стол в комнату"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-200 hover:border-cyan-500/50 hover:bg-cyan-950/40 hover:text-cyan-300 active:scale-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Добавить</span>
                  </button>
                </div>

                {/* Стойка для принтеров */}
                <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.04] transition-all">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-900/90 shadow-inner group-hover:border-cyan-500/40 transition-colors">
                    <PrinterRackVisual className="h-full w-full p-1 group-hover:scale-105 transition-transform duration-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate text-xs group-hover:text-cyan-200 transition-colors">
                      Стойка для принтеров
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                      2.7 × 0.8 м · 2 яруса
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-neutral-400 border border-white/5">
                        6 СЛОТОВ
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addFurniture('printer_rack')}
                    title="Добавить стойку в комнату"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-200 hover:border-cyan-500/50 hover:bg-cyan-950/40 hover:text-cyan-300 active:scale-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Добавить</span>
                  </button>
                </div>

                {/* Стеллаж для филамента */}
                <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.04] transition-all">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-900/90 shadow-inner group-hover:border-cyan-500/40 transition-colors">
                    <FilamentRackVisual className="h-full w-full p-1 group-hover:scale-105 transition-transform duration-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate text-xs group-hover:text-cyan-200 transition-colors">
                      Стеллаж для катушек
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                      1.8 × 0.45 м · 4 полки
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-neutral-400 border border-white/5">
                        32 КАТУШКИ
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addFurniture('filament_rack')}
                    title="Добавить стеллаж в комнату"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-200 hover:border-cyan-500/50 hover:bg-cyan-950/40 hover:text-cyan-300 active:scale-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Добавить</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Раздел 2: Окружение и 3D-декор */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
                <span>Окружение и 3D-декор</span>
                <span className="text-[10px] text-neutral-500">BLENDER GLB</span>
              </div>

              <div className="space-y-2">
                {/* Кустик / Растение */}
                <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.04] transition-all">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-900/90 shadow-inner group-hover:border-emerald-500/40 transition-colors">
                    <img
                      src="/images/workshop/plant.png"
                      alt="Кустик / Растение"
                      loading="lazy"
                      className="h-full w-full object-contain p-1 drop-shadow transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate text-xs group-hover:text-emerald-300 transition-colors">
                      Растение в кадке
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                      0.6 × 0.6 м · Озеленение
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400 border border-emerald-500/20">
                        ДЕКОР
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addFurniture('plant')}
                    title="Добавить растение в комнату"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-500/60 active:scale-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Добавить</span>
                  </button>
                </div>

                {/* Коробки для упаковки */}
                <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.04] transition-all">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-900/90 shadow-inner group-hover:border-amber-500/40 transition-colors">
                    <img
                      src="/images/workshop/packing-boxes.png"
                      alt="Упаковочные коробки"
                      loading="lazy"
                      className="h-full w-full object-contain p-1 drop-shadow transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate text-xs group-hover:text-amber-300 transition-colors">
                      Упаковочные коробки
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                      0.8 × 0.6 м · Склад и тара
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-400 border border-amber-500/20">
                        СКЛАД
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addFurniture('boxes')}
                    title="Добавить коробки в комнату"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-950/30 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-900/50 hover:border-amber-500/60 active:scale-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Добавить</span>
                  </button>
                </div>

                {/* Инструментальная тумба */}
                <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.04] transition-all">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-900/90 shadow-inner group-hover:border-cyan-500/40 transition-colors">
                    <img
                      src="/images/workshop/tool-cabinet.png"
                      alt="Инструментальная тумба"
                      loading="lazy"
                      className="h-full w-full object-contain p-1 drop-shadow transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate text-xs group-hover:text-cyan-300 transition-colors">
                      Инструментальная тумба
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                      1.0 × 0.6 м · Стальной шкаф
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400 border border-cyan-500/20">
                        ТУМБА
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addFurniture('cabinet')}
                    title="Добавить тумбу в комнату"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-1.5 text-xs text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-500/60 active:scale-95 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Добавить</span>
                  </button>
                </div>

                {/* 3D-Надпись / Граффити */}
                <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cyan-500/20 bg-cyan-950/30 shadow-inner group-hover:border-cyan-500/40 transition-colors">
                    <Type className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate text-xs group-hover:text-cyan-200 transition-colors">
                      3D-Надпись / Граффити
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                      Разметка зон, текст на пол и стены
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400 border border-cyan-500/20">
                        ТЕКСТ
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('graffiti')}
                    title="Перейти в каталог надписей и граффити"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1.5 text-xs text-cyan-300 hover:bg-cyan-900/60 active:scale-95 transition-all"
                  >
                    <span>Граффити</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : tab === 'inventory' ? (
          <>
            {/* Неразмещённые принтеры */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
                <span>3D-Принтеры в резерве</span>
                <span className="text-[10px] text-neutral-500">{unplacedPrinters.length} ШТ</span>
              </div>

              {unplacedPrinters.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center text-neutral-500 text-[11px]">
                  Все принтеры из базы данных уже размещены в мастерской.
                </div>
              ) : (
                <div className="space-y-2">
                  {unplacedPrinters.map((printer) => {
                    const isA1 =
                      printer.model_3d === 'a1' ||
                      printer.name.toLowerCase().includes('a1');
                    const imageSrc = isA1
                      ? '/images/workshop/printer-a1.png'
                      : '/images/workshop/printer-p1.png';

                    return (
                      <div
                        key={printer.id}
                        className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.04] transition-all"
                      >
                        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-900/90 shadow-inner group-hover:border-cyan-500/40 transition-colors">
                          <img
                            src={imageSrc}
                            alt={printer.name}
                            loading="lazy"
                            className="h-full w-full object-contain p-1 drop-shadow transition-transform duration-200 group-hover:scale-105"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-white truncate text-xs group-hover:text-cyan-200 transition-colors">
                            {printer.name}
                          </div>
                          <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                            {printer.power_w} Вт · {printer.price.toLocaleString('ru-RU')} ₽
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400 border border-cyan-500/20">
                              {isA1 ? 'A1 ОТКРЫТЫЙ' : 'P1 ЗАКРЫТЫЙ'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onPlacePrinter(printer)}
                          title="Разместить на свободном столе"
                          className="flex shrink-0 items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1.5 text-xs text-cyan-300 hover:bg-cyan-900/60 active:scale-95 transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>На стол</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Неразмещённый филамент */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
                <span>Филамент на складе</span>
                <span className="text-[10px] text-neutral-500">{unplacedFilaments.length} ШТ</span>
              </div>

              {unplacedFilaments.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center text-neutral-500 text-[11px]">
                  Все катушки из базы данных уже выставлены на стеллажи.
                </div>
              ) : (
                <div className="space-y-2">
                  {unplacedFilaments.map((filament) => (
                    <div
                      key={filament.id}
                      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.04] transition-all"
                    >
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-900/90 shadow-inner group-hover:border-emerald-500/40 transition-colors">
                        <img
                          src="/images/workshop/filament-spool.png"
                          alt={filament.name}
                          loading="lazy"
                          className="h-full w-full object-contain p-1 drop-shadow transition-transform duration-200 group-hover:scale-105"
                        />
                        <span
                          className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border border-white/30 shadow-md ring-1 ring-black/40"
                          style={{ backgroundColor: filament.color || '#e2e8f0' }}
                          title={`Цвет: ${filament.color || 'По умолчанию'}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white truncate text-xs group-hover:text-emerald-200 transition-colors">
                          {filament.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                          {filament.weight_g} г · {filament.price.toLocaleString('ru-RU')} ₽
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400 border border-emerald-500/20">
                            {/(PLA|PETG|ABS|TPU|ASA|NYLON|PC)/i.exec(filament.name)?.[0]?.toUpperCase() || 'КАТУШКА'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPlaceFilament(filament)}
                        title="Выставить на свободный стеллаж"
                        className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-900/60 active:scale-95 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>На полку</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* GRAFFITI & LABELS TAB */
          <div className="space-y-4">
            {/* Top Action Card */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyan-300 text-xs flex items-center gap-1.5">
                  <Type className="h-4 w-4 text-cyan-400" />
                  <span>3D-Надписи и указатели</span>
                </span>
                <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[9px] text-cyan-400 border border-cyan-500/20">
                  ВЕКТОР
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-300">
                Нанесите маркировку зон, предупреждающие таблички или брендинг на стены и пол вашей мастерской.
              </p>
              <button
                type="button"
                onClick={() => {
                  onAddLabel?.();
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-200 transition-all hover:bg-cyan-500/30 hover:border-cyan-400 active:scale-95"
              >
                <Plus className="h-4 w-4 text-cyan-300" />
                <span>Нанести новую надпись</span>
              </button>
              <div className="text-[10px] text-neutral-400 text-center">
                Кликните по стене или полу в 3D для размещения
              </div>
            </div>

            {/* Быстрые штампы / готовые пресеты */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
                <span>Быстрые штампы зон</span>
                <span className="text-[10px] text-neutral-500">КЛИК ДЛЯ ВЫБОРА</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {GRAFFITI_PRESETS.map((preset) => (
                  <div
                    key={preset.text}
                    className="group flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-white/30 shadow-sm"
                        style={{ backgroundColor: preset.color }}
                      />
                      <div className="truncate">
                        <div className="font-semibold text-xs text-white group-hover:text-cyan-200 transition-colors truncate">
                          {preset.text}
                        </div>
                        <div className="text-[10px] text-neutral-500 truncate">
                          {preset.category}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onAddLabel?.({ text: preset.text, color: preset.color });
                        setIsOpen(false);
                      }}
                      title="Нанести этот штамп в 3D"
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-200 hover:border-cyan-500/50 hover:bg-cyan-950/40 hover:text-cyan-300 active:scale-95 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Нанести</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Список надписей в активной комнате */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
                <span>В комнате «{room.name}»</span>
                <span className="text-[10px] text-neutral-500">{room.labels?.length ?? 0} ШТ</span>
              </div>

              {(!room.labels || room.labels.length === 0) ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center text-neutral-500 text-[11px]">
                  В этой комнате пока нет надписей. Выберите штамп выше или нажмите «Нанести новую надпись».
                </div>
              ) : (
                <div className="space-y-2">
                  {room.labels.map((lbl) => {
                    const surfaceName =
                      lbl.surface === 'floor'
                        ? 'ПОЛ'
                        : lbl.surface === 'north'
                        ? 'СЕВЕРНАЯ СТЕНА'
                        : lbl.surface === 'south'
                        ? 'ЮЖНАЯ СТЕНА'
                        : lbl.surface === 'west'
                        ? 'ЗАПАДНАЯ СТЕНА'
                        : 'ВОСТОЧНАЯ СТЕНА';

                    return (
                      <div
                        key={lbl.id}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2 hover:border-white/20 hover:bg-white/[0.04] transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                              style={{ backgroundColor: lbl.color }}
                            />
                            <span className="font-semibold text-white text-xs truncate">
                              {lbl.text}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-neutral-400 border border-white/5">
                              {surfaceName}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectLabel?.(room.id, lbl.id);
                              setIsOpen(false);
                            }}
                            title="Редактировать надпись"
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-neutral-300 hover:border-cyan-500/50 hover:bg-cyan-950/40 hover:text-cyan-300 active:scale-95 transition-all"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteLabel?.(room.id, lbl.id)}
                            title="Удалить надпись"
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-rose-400 hover:border-rose-500/50 hover:bg-rose-950/40 hover:text-rose-300 active:scale-95 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Подвал с подсказкой */}
      <div className="border-t border-white/10 bg-neutral-900/60 px-4 py-2 text-[10px] text-neutral-500 select-none">
        КЛИК НА ОБЪЕКТ В СЦЕНЕ — ПЕРЕМЕЩЕНИЕ И ПОВОРОТ [R]
      </div>
    </motion.aside>
  );
}

