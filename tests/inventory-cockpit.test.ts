import assert from 'node:assert/strict';
import test from 'node:test';
import type { Filament, Printer } from '../src/shared/types';
import {
  calculateFilamentInsights,
  calculateFilamentMetrics,
  calculatePrinterInsights,
  calculatePrinterMetrics,
  filterAndSortFilaments,
  filterAndSortPrinters,
  getEffectivePrinterViewMode,
  getPrinterViewModeOptions,
  parseRequiredNonNegative,
} from '../src/widgets/InventoryCockpit/model';

const filaments: Filament[] = [
  { id: 'f-1', name: 'PLA Matte', weight_g: 1000, price: 1500, color: '#111111' },
  { id: 'f-2', name: 'PETG Clear', weight_g: 750, price: 1350, color: '#FFFFFF' },
  { id: 'f-3', name: 'PLA Basic', weight_g: 500, price: 600, color: '#111111' },
];

const printers: Printer[] = [
  { id: 'p-1', name: 'Bambu Lab A1', power_w: 350, price: 45000, lifespan_hours: 5000 },
  { id: 'p-2', name: 'Prusa MK4', power_w: 120, price: 80000, lifespan_hours: 8000 },
];

test('filament metrics aggregate real stock values and find the lowest unit cost', () => {
  const metrics = calculateFilamentMetrics(filaments);

  assert.deepEqual(metrics, {
    count: 3,
    totalWeightG: 2250,
    totalValue: 3450,
    averagePricePerGram: 3450 / 2250,
    uniqueColors: 2,
    bestValueName: 'PLA Basic',
    bestValuePerGram: 1.2,
  });
});

test('printer metrics include depreciation and configured electricity tariff', () => {
  const metrics = calculatePrinterMetrics(printers, 6.5);

  assert.equal(metrics.count, 2);
  assert.equal(metrics.totalValue, 125000);
  assert.equal(metrics.totalPowerW, 470);
  assert.equal(metrics.totalResourceHours, 13000);
  assert.equal(metrics.averageHourlyCost, ((45000 / 5000 + 0.35 * 6.5) + (80000 / 8000 + 0.12 * 6.5)) / 2);
  assert.equal(metrics.lowestHourlyCostName, 'Prusa MK4');
});

test('filament search is case-insensitive and unit-cost sorting does not mutate source data', () => {
  const sourceOrder = filaments.map((item) => item.id);
  const result = filterAndSortFilaments(filaments, 'pla', 'unit-cost-asc');

  assert.deepEqual(result.map((item) => item.id), ['f-3', 'f-1']);
  assert.deepEqual(filaments.map((item) => item.id), sourceOrder);
});

test('inventory table headers support both directions for price and power sorting', () => {
  const filaments = [
    { id: 'f1', name: 'Cheap', weight_g: 1000, price: 700 },
    { id: 'f2', name: 'Premium', weight_g: 1000, price: 1500 },
  ];
  const printers = [
    { id: 'p1', name: 'Low power', power_w: 120, price: 20000, lifespan_hours: 5000 },
    { id: 'p2', name: 'High power', power_w: 500, price: 50000, lifespan_hours: 5000 },
  ];

  assert.deepEqual(filterAndSortFilaments(filaments, '', 'price-asc').map((item) => item.id), ['f1', 'f2']);
  assert.deepEqual(filterAndSortPrinters(printers, '', 'power-asc', 5).map((item) => item.id), ['p1', 'p2']);
});

test('printer sorting can surface the cheapest real hourly operating cost', () => {
  const result = filterAndSortPrinters(printers, '', 'hourly-cost-asc', 6.5);

  assert.deepEqual(result.map((item) => item.id), ['p-2', 'p-1']);
});

test('required non-negative numeric fields reject blanks but preserve an explicit zero', () => {
  assert.equal(parseRequiredNonNegative(''), null);
  assert.equal(parseRequiredNonNegative('   '), null);
  assert.equal(parseRequiredNonNegative('-1'), null);
  assert.equal(parseRequiredNonNegative('zero'), null);
  assert.equal(parseRequiredNonNegative('0'), 0);
  assert.equal(parseRequiredNonNegative('12.5'), 12.5);
});

test('filament fullscreen insights rank inventory and expose the real cost corridor', () => {
  const insights = calculateFilamentInsights(filaments);

  assert.equal(insights.minUnitCost, 1.2);
  assert.equal(insights.maxUnitCost, 1.8);
  assert.equal(insights.heaviestName, 'PLA Matte');
  assert.equal(insights.highestValueName, 'PLA Matte');
  assert.deepEqual(insights.valueLeaders.map((item) => item.id), ['f-1', 'f-2', 'f-3']);
  assert.equal(insights.valueLeaders[0].sharePercent, 1500 / 3450 * 100);
});

test('printer fullscreen insights split hourly fleet cost into depreciation and energy', () => {
  const insights = calculatePrinterInsights(printers, 6.5);

  assert.equal(insights.totalDepreciationPerHour, 19);
  assert.ok(Math.abs(insights.totalEnergyPerHour - 3.055) < 1e-10);
  assert.equal(insights.highestPowerName, 'Bambu Lab A1');
  assert.deepEqual(insights.hourlyCostLeaders.map((item) => item.id), ['p-1', 'p-2']);
  assert.ok(Math.abs(insights.energySharePercent - 3.055 / 22.055 * 100) < 1e-10);
});

test('getEffectivePrinterViewMode allows 3D room in dev but safely falls back to cards in production', () => {
  assert.equal(getEffectivePrinterViewMode('room3d', true), 'room3d');
  assert.equal(getEffectivePrinterViewMode('room3d', false), 'cards');
  assert.equal(getEffectivePrinterViewMode('table', false), 'table');
  assert.equal(getEffectivePrinterViewMode('cards', false), 'cards');
  assert.equal(getEffectivePrinterViewMode('table', true), 'table');
  assert.equal(getEffectivePrinterViewMode('cards', true), 'cards');
});

test('getPrinterViewModeOptions excludes room3d in production and includes it in development', () => {
  const prodOptions = getPrinterViewModeOptions('icon-table', 'icon-cards', 'icon-3d', false);
  assert.deepEqual(
    prodOptions.map((opt) => opt.value),
    ['table', 'cards'],
    'Production options must not include room3d',
  );

  const devOptions = getPrinterViewModeOptions('icon-table', 'icon-cards', 'icon-3d', true);
  assert.deepEqual(
    devOptions.map((opt) => opt.value),
    ['table', 'cards', 'room3d'],
    'Development options must include room3d',
  );
});

