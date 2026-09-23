'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Edit3,
  Trash2,
  Zap,
  Clock,
  Coins,
  ChevronLeft,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import type { Printer } from '../../../shared/types';
import { formatCurrency } from '../../../shared/lib/format';
import { getPrinterHourlyCost } from '../../../widgets/InventoryCockpit/model';

export interface PrinterInfoDrawerProps {
  printer: Printer | null;
  electricityRate?: number;
  currency?: string;
  onClose: () => void;
  onEdit: (printer: Printer) => void;
  onDelete: (printer: Printer) => void;
}

export function PrinterInfoDrawer({
  printer,
  electricityRate = 0,
  currency = '₽',
  onClose,
  onEdit,
  onDelete,
}: PrinterInfoDrawerProps) {
  if (!printer) return null;

  const hourlyCost = getPrinterHourlyCost(printer, electricityRate);
  const depreciationPerHour =
    printer.lifespan_hours > 0 ? printer.price / printer.lifespan_hours : 0;
  const powerKw = (printer.power_w || 0) / 1000;
  const energyPerHour = powerKw * electricityRate;
  const accentColor = printer.color || '#0CB4E0';

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, x: 40, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 40, scale: 0.96 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-4 right-4 bottom-4 w-[340px] max-w-[calc(100%-32px)] z-30 flex flex-col bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 overflow-y-auto text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-lg ring-2 ring-white/20"
              style={{ backgroundColor: accentColor }}
            />
            <div className="min-w-0">
              <h3 className="font-semibold text-base text-white truncate tracking-tight">
                {printer.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-0.5">
                <CheckCircle2 size={12} />
                <span>В парке оборудования</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть информацию"
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cost per hour highlight */}
        <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Себестоимость часа</span>
            <Coins size={14} className="text-cyan-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-white">
              {formatCurrency(hourlyCost, currency)}
            </span>
            <span className="text-xs text-neutral-400">/ час</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1.5 text-[11px] text-neutral-400">
            <div className="flex justify-between">
              <span>Амортизация:</span>
              <span className="text-neutral-300 font-mono">
                {formatCurrency(depreciationPerHour, currency)}/ч
              </span>
            </div>
            <div className="flex justify-between">
              <span>Электричество:</span>
              <span className="text-neutral-300 font-mono">
                {formatCurrency(energyPerHour, currency)}/ч
              </span>
            </div>
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="mt-4 space-y-2 text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Технические параметры
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                <Zap size={12} className="text-amber-400" />
                <span>Мощность</span>
              </div>
              <span className="font-semibold text-neutral-200">
                {printer.power_w} Вт
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                <Clock size={12} className="text-cyan-400" />
                <span>Ресурс</span>
              </div>
              <span className="font-semibold text-neutral-200">
                {Number(printer.lifespan_hours || 0).toLocaleString('ru-RU')} ч
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <span className="text-neutral-400 text-[11px]">Стоимость покупки:</span>
            <span className="font-semibold text-neutral-200">
              {formatCurrency(printer.price, currency)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto pt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onEdit(printer)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              <Edit3 size={13} />
              <span>Редактировать</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(printer)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-medium text-xs transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Удалить</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-transparent hover:bg-white/5 text-neutral-400 hover:text-neutral-200 text-xs transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span>Назад к комнате</span>
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
