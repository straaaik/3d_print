import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrintCost, round2 } from '../src/shared/lib/formulas';
import { timeToHours } from '../src/shared/lib/format';
import type { Filament, Printer, Settings } from '../src/shared/types';

test('print calculation rejects negative and non-finite physical inputs', () => {
  for (const invalid of [-100, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = calculatePrintCost({
      weightG: invalid, days: invalid, hours: invalid, minutes: invalid,
      laborMinutes: invalid, quantity: 1,
      filament: { id: 'f', name: 'PLA', color: '#fff', price: 1000, weight_g: 1000 },
      printer: { id: 'p', name: 'Printer', price: 10000, lifespan_hours: 1000, power_w: 100 },
      settings: null,
    });
    assert.equal(result.materialCost, 0);
    assert.equal(result.electricityCost, 0);
    assert.equal(result.depreciationCost, 0);
    assert.equal(result.effectiveLaborMinutes, 0);
    assert.equal(result.totalBaseCost, 0);
  }
});

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

test('чек калькулятора: слагаемые себестоимости сходятся с totalBaseCost, а слагаемые прибыли — с profitTotal', () => {
  const filament: Filament = {
    id: 'fil-1',
    name: 'ABS НИТ',
    color: '#000000',
    weight_g: 1000,
    price: 730.77,
  };

  const printer: Printer = {
    id: 'pr-1',
    name: 'Bambu Lab A1',
    power_w: 300,
    price: 25000,
    lifespan_hours: 1000,
  };

  const settings: Settings = {
    currency: '₽',
    electricity_rate: 4.90,
    default_printer_id: 'pr-1',
    labor_rate_per_hour: 300,
    labor_time_minutes: 15,
    default_markup_percent: 100,
    default_defect_percent: 5,
    min_order_price: 500,
    enable_material_difficulty: false,
    is_owner_labor_default: true,
  };

  // Режим личного труда мастера (в прибыль) с минимальным заказом
  const resOwner = calculatePrintCost({
    weightG: 13,
    hours: 1,
    minutes: 0,
    laborMinutes: 15,
    laborRatePerHour: 300,
    isOwnerLabor: true,
    markupPercent: 100,
    defectPercent: 5,
    quantity: 4,
    filament,
    printer,
    settings,
  });

  // Брак и прямые затраты должны давать totalBaseCost
  const directPrintCost = round2(resOwner.materialCost + resOwner.depreciationCost + resOwner.electricityCost);
  assert.equal(resOwner.printDirectCost, directPrintCost);
  assert.ok(resOwner.defectCost > 0);
  assert.equal(resOwner.totalBaseCost, round2(resOwner.printDirectCost + resOwner.defectCost));

  // Составляющие прибыли
  const printMarkupAmount = Math.max(0, resOwner.printFinalPrice - resOwner.totalBaseCost);
  const minOrderSupplement = resOwner.isMinOrderApplied
    ? Math.max(0, resOwner.totalFinalPrice - resOwner.calculatedFinalPrice)
    : 0;

  const profitSum = round2(printMarkupAmount + resOwner.laborCost + minOrderSupplement - resOwner.discountTotal);
  assert.equal(resOwner.profitTotal, profitSum);
  assert.equal(round2(resOwner.totalBaseCost + resOwner.profitTotal), resOwner.totalFinalPrice);

  // Режим наемного труда мастера (в себестоимость)
  const resHired = calculatePrintCost({
    weightG: 13,
    hours: 1,
    minutes: 0,
    laborMinutes: 15,
    laborRatePerHour: 300,
    isOwnerLabor: false,
    markupPercent: 100,
    defectPercent: 5,
    quantity: 4,
    filament,
    printer,
    settings: { ...settings, min_order_price: 0 },
  });

  assert.equal(resHired.totalBaseCost, round2(resHired.printBaseSubtotal + resHired.laborCost));
  const hiredMarkupAmount = Math.max(0, resHired.printFinalPrice - resHired.totalBaseCost);
  assert.equal(resHired.profitTotal, hiredMarkupAmount);
  assert.equal(round2(resHired.totalBaseCost + resHired.profitTotal), resHired.totalFinalPrice);
});

test('дополнительные услуги: разделение на себестоимость и прибыль', () => {
  const filament: Filament = { id: 'f', name: 'PLA', color: '#fff', price: 1000, weight_g: 1000 };
  const printer: Printer = { id: 'p', name: 'P', power_w: 100, price: 10000, lifespan_hours: 1000 };
  const settings: Settings = {
    currency: '₽',
    electricity_rate: 5,
    default_printer_id: null,
    labor_rate_per_hour: 0,
    labor_time_minutes: 0,
    default_markup_percent: 0,
    default_defect_percent: 0,
    min_order_price: 0,
    enable_material_difficulty: false,
  };

  const res = calculatePrintCost({
    weightG: 100,
    hours: 1,
    minutes: 0,
    laborMinutes: 0,
    quantity: 1,
    markupPercent: 0,
    defectPercent: 0,
    filament,
    printer,
    settings,
    customCostItems: [
      { id: 'c1', name: 'Упаковка', amount: 150, isEnabled: true, target: 'cost' },
      { id: 'c2', name: '3D-Моделирование', amount: 500, isEnabled: true, target: 'profit' },
    ],
  });

  assert.equal(res.customCostsExpenseTotal, 150);
  assert.equal(res.customCostsProfitTotal, 500);
  assert.equal(res.customCostsTotal, 650);

  assert.equal(res.totalBaseCost, round2(res.printBaseSubtotal + 150));
  assert.equal(res.totalFinalPrice, round2(res.printBaseSubtotal + 150 + 500));
  assert.equal(res.profitTotal, 500);
  assert.equal(round2(res.totalBaseCost + res.profitTotal), res.totalFinalPrice);
});

test('дополнительные услуги: разделение на себестоимость и прибыль с наценкой (Вариант 1)', () => {
  const filament: Filament = { id: 'f', name: 'PLA', color: '#fff', price: 1000, weight_g: 1000 };
  const printer: Printer = { id: 'p', name: 'P', power_w: 100, price: 10000, lifespan_hours: 1000 };
  const settings: Settings = {
    currency: '₽',
    electricity_rate: 5,
    default_printer_id: null,
    labor_rate_per_hour: 0,
    labor_time_minutes: 0,
    default_markup_percent: 100,
    default_defect_percent: 0,
    min_order_price: 0,
    enable_material_difficulty: false,
  };

  const res = calculatePrintCost({
    weightG: 100,
    hours: 1,
    minutes: 0,
    laborMinutes: 0,
    quantity: 1,
    markupPercent: 100,
    defectPercent: 0,
    filament,
    printer,
    settings,
    customCostItems: [
      { id: 'c1', name: 'Упаковка', amount: 150, isEnabled: true, target: 'cost' },
      { id: 'c2', name: '3D-Моделирование', amount: 500, isEnabled: true, target: 'profit' },
    ],
  });

  // Себестоимость: печать (110.5) + упаковка (150) = 260.5
  assert.equal(res.totalBaseCost, round2(res.printBaseSubtotal + 150));

  // Коэффициент 2.0x (+100%) умножает ВСЮ себестоимость: 260.5 * 2 = 521.00
  assert.equal(res.printFinalPrice, round2(res.totalBaseCost * 2));

  // Итоговая цена: 521 (себестоимость с наценкой) + 500 (моделирование в прибыль) = 1021.00
  assert.equal(res.totalFinalPrice, round2(res.printFinalPrice + 500));

  // Прибыль: наценка на себестоимость (260.50) + услуга в прибыль (500) = 760.50
  assert.equal(res.profitTotal, round2(res.totalBaseCost + 500));
  assert.equal(round2(res.totalBaseCost + res.profitTotal), res.totalFinalPrice);
});
