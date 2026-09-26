import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrintCost, round2 } from '../src/shared/lib/formulas';
import { timeToHours } from '../src/shared/lib/format';
import type { Filament, Printer, Settings } from '../src/shared/types';

test('round2 корректно обрабатывает денежные границы', () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(-1.005), -1.01);
  assert.equal(round2(Number.NaN), 0);
});

test('тираж делит цену партии на штуки, не умножая данные слайсера', () => {
  const filament: Filament = {
    id: crypto.randomUUID(),
    name: 'PLA',
    color: '#fff',
    weight_g: 1000,
    price: 1000,
  };
  const printer: Printer = {
    id: crypto.randomUUID(),
    name: 'Test printer',
    power_w: 100,
    price: 0,
    lifespan_hours: 1000,
  };
  const settings: Settings = {
    currency: '₽',
    electricity_rate: 0,
    default_printer_id: null,
    labor_rate_per_hour: 0,
    labor_time_minutes: 0,
    default_markup_percent: 100,
    default_defect_percent: 0,
    enable_material_difficulty: false,
  };
  const common = {
    weightG: 100,
    hours: 1,
    minutes: 0,
    laborMinutes: 0,
    markupPercent: 100,
    defectPercent: 0,
    filament,
    printer,
    settings,
  };

  const one = calculatePrintCost({ ...common, quantity: 1 });
  const four = calculatePrintCost({ ...common, quantity: 4 });

  assert.equal(four.totalBaseCost, one.totalBaseCost);
  assert.equal(four.totalFinalPrice, one.totalFinalPrice);
  assert.equal(four.finalPricePerUnit, round2(one.totalFinalPrice / 4));
});

test('timeToHours корректно учитывает дни', () => {
  assert.equal(timeToHours(2, 30, 0), 2.5);
  assert.equal(timeToHours(2, 30, 1), 26.5);
  assert.equal(timeToHours(0, 0, 2), 48);
});

test('calculatePrintCost корректно учитывает дни в расчетном времени печати', () => {
  const printer: Printer = {
    id: crypto.randomUUID(),
    name: 'Depreciation printer',
    power_w: 100, // 0.1 кВт
    price: 100000,
    lifespan_hours: 1000, // 100 руб/час амортизация
  };
  const settings: Settings = {
    currency: '₽',
    electricity_rate: 10, // 1 руб/час электроэнергия при 100Вт
    default_printer_id: null,
    labor_rate_per_hour: 0,
    labor_time_minutes: 0,
    default_markup_percent: 0,
    default_defect_percent: 0,
    enable_material_difficulty: false,
  };

  // 1 день (24 часа) + 1 час = 25 часов
  const res = calculatePrintCost({
    weightG: 0,
    days: 1,
    hours: 1,
    minutes: 0,
    laborMinutes: 0,
    quantity: 1,
    markupPercent: 0,
    defectPercent: 0,
    filament: null,
    printer,
    settings,
  });

  // Электричество: 25 ч * 0.1 кВт * 10 руб = 25 руб
  assert.equal(res.electricityCost, 25);
  // Амортизация: 25 ч * (100000 / 1000) = 2500 руб
  assert.equal(res.depreciationCost, 2500);
});

