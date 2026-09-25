'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Input } from '../../shared/ui/Input';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { ColorPicker } from '../../shared/ui/ColorPicker';
import { ModalDetails } from '../../shared/ui/ModalDetails';
import { IsometricSpoolPicker } from '../../shared/ui/color-picker/IsometricSpoolPicker';
import { IsometricPrinterPicker } from '../../shared/ui/color-picker/IsometricPrinterPicker';
import { CockpitDropdown } from '../../shared/ui/CockpitDropdown';
import { PRINTER_MODEL_OPTIONS, type Printer3DModel } from './model';
import { FilamentSpoolIcon, PrinterMachineIcon } from './InventoryIcons';

export interface PrinterFormValues {
  name: string;
  price: string;
  powerW: string;
  lifespanHours: string;
  color: string;
  model3d?: Printer3DModel;
}

export interface FilamentFormValues {
  name: string;
  price: string;
  weightG: string;
  color: string;
}

interface FieldsProps<T> {
  values: T;
  onChange: (field: keyof T, value: string) => void;
  errors?: Partial<Record<keyof T, string>>;
  currencySymbol: string;
}

function ItemColor({ color, onChange, label }: { color: string; onChange: (value: string) => void; label: string }) {
  return (
    <ModalDetails title={label} summary={<span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: color }} />}>
      <ColorPicker value={color} onChange={onChange} defaultVariant="matrix" inline />
    </ModalDetails>
  );
}

export function PrinterFormFields({ values, onChange, errors = {}, currencySymbol }: FieldsProps<PrinterFormValues>) {
  const printerColor = values.color || '#0CB4E0';
  const price = Number(values.price) || 0;
  const lifespan = Number(values.lifespanHours) || 0;
  const power = Number(values.powerW) || 0;
  const depreciationPerHour = lifespan > 0 ? price / lifespan : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Левая колонка: поля ввода и расчет амортизации */}
      <div className="space-y-4">
        <Input
          label="Название принтера"
          aria-label="Название принтера"
          placeholder="Например, Bambu Lab A1"
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          error={errors.name}
          required
          autoFocus
        />

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300">
            3D-модель для Мастерской
          </label>
          <CockpitDropdown
            ariaLabel="3D-модель для Мастерской"
            variant="input"
            value={values.model3d || 'a1'}
            options={PRINTER_MODEL_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
            onChange={(val) => onChange('model3d', val)}
          />
          <p className="text-[11px] text-neutral-500">
            Подбирается автоматически по названию или выбирается вручную.
          </p>
        </div>

        <Input
          label={'Стоимость покупки, ' + currencySymbol}
          aria-label="Стоимость покупки"
          type="number"
          min="0"
          value={values.price}
          onChange={(e) => onChange('price', e.target.value)}
          error={errors.price}
          placeholder="0"
          required
        />

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <NumberCounter
              label="Мощность, Вт"
              value={Number.parseInt(values.powerW, 10) || 0}
              onChange={(value) => onChange('powerW', String(value))}
              min={1}
              max={10000}
            />
            {errors.powerW && <p className="mt-1 text-[11px] text-rose-400">{errors.powerW}</p>}
          </div>

          <div>
            <NumberCounter
              label="Ресурс, ч"
              value={Number.parseInt(values.lifespanHours, 10) || 0}
              onChange={(value) => onChange('lifespanHours', String(value))}
              min={1}
              max={1000000}
              step={100}
            />
            {errors.lifespanHours && <p className="mt-1 text-[11px] text-rose-400">{errors.lifespanHours}</p>}
          </div>
        </div>

        {/* Инженерная плашка с расчетом амортизации за час */}
        <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-4 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 uppercase tracking-wider text-[10px]">Амортизация принтера</span>
            <span className="text-cyan-400 font-bold text-[10px] tracking-wider">1 ЧАС</span>
          </div>
          <div className="flex items-baseline justify-between pt-1.5 border-t border-white/5">
            <span className="text-xs text-neutral-400 tabular-nums">
              {price > 0 && lifespan > 0
                ? `${price.toLocaleString('ru-RU')} ${currencySymbol} / ${lifespan.toLocaleString('ru-RU')} ч`
                : power > 0 ? `Потребление: ${power} Вт` : '—'}
            </span>
            <span className="text-base font-bold text-white tabular-nums tracking-tight">
              {depreciationPerHour > 0 ? `${depreciationPerHour.toFixed(2)} ${currencySymbol}/ч` : `0.00 ${currencySymbol}/ч`}
            </span>
          </div>
        </div>
      </div>

      {/* Правая колонка: колорпикер в виде 3D-принтера */}
      <div data-printer-color-picker="true" className="w-full flex justify-center">
        <IsometricPrinterPicker
          inline
          value={printerColor}
          onChange={(newColor) => onChange('color', newColor)}
          className="w-full"
        />
      </div>
    </div>
  );
}

export function FilamentFormFields({ values, onChange, errors = {}, currencySymbol }: FieldsProps<FilamentFormValues>) {
  const filamentColor = values.color || '#0CB4E0';
  const weight = Number(values.weightG) || 0;
  const price = Number(values.price) || 0;
  const unitCost = weight > 0 ? price / weight : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Левая колонка: поля ввода и расчет себестоимости */}
      <div className="space-y-4">
        <Input
          label="Название материала"
          aria-label="Название материала"
          placeholder="Например, PLA Matte Black"
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          error={errors.name}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <NumberCounter
              label="Вес, г"
              value={Number.parseInt(values.weightG, 10) || 0}
              onChange={(value) => onChange('weightG', String(value))}
              min={1}
              max={100000}
            />
            {errors.weightG && <p className="mt-1 text-[11px] text-rose-400">{errors.weightG}</p>}
          </div>

          <Input
            label={'Цена, ' + currencySymbol}
            aria-label="Цена катушки"
            type="number"
            min="0"
            placeholder="0"
            value={values.price}
            onChange={(e) => onChange('price', e.target.value)}
            error={errors.price}
            required
          />
        </div>

        {/* Инженерная плашка с расчетом себестоимости за грамм */}
        <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-4 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 uppercase tracking-wider text-[10px]">Себестоимость пластика</span>
            <span className="text-cyan-400 font-bold text-[10px] tracking-wider">1 ГРАММ</span>
          </div>
          <div className="flex items-baseline justify-between pt-1.5 border-t border-white/5">
            <span className="text-xs text-neutral-400 tabular-nums">
              {weight > 0 && price > 0
                ? `${price.toLocaleString('ru-RU')} ${currencySymbol} / ${weight.toLocaleString('ru-RU')} г`
                : '—'}
            </span>
            <span className="text-base font-bold text-white tabular-nums tracking-tight">
              {unitCost > 0 ? `${unitCost.toFixed(2)} ${currencySymbol}/г` : `0.00 ${currencySymbol}/г`}
            </span>
          </div>
        </div>
      </div>

      {/* Правая колонка: колорпикер в виде катушки пластика */}
      <div data-filament-spool-picker="true" className="w-full flex justify-center">
        <IsometricSpoolPicker
          inline
          value={filamentColor}
          onChange={(newColor) => onChange('color', newColor)}
          className="w-full"
        />
      </div>
    </div>
  );
}
