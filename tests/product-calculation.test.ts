import test from 'node:test';
import assert from 'node:assert/strict';
import { productToCalculatorForm, calculatorFormToProductUpdates, addProductToCalculationDraft,
  canCloseProductEditor } from '../src/shared/lib/productCalculation';
import { createCalculationDraft, emptyCalculatorForm } from '../src/shared/lib/calculationDraft';
import type { Filament, Printer, SavedCalculation } from '../src/shared/types';

const filaments: Filament[] = [{ id: 'red', name: 'PLA', color: '#ff0000', weight_g: 1000, price: 1000 },
  { id: 'blue', name: 'PLA', color: '#0000ff', weight_g: 1000, price: 2000 }];
const printers: Printer[] = [{ id: 'printer', name: 'P1', power_w: 100, price: 10000, lifespan_hours: 1000 }];
const product: SavedCalculation = { id: 'product', name: 'Корпус', filament_id: 'blue',
  filament_name: 'PLA', filament_color: '#0000ff', printer_id: 'printer', printer_name: 'P1',
  weight_g: 100, hours: 49, minutes: 15, quantity: 4, base_cost: 77, final_price: 150,
  labor_minutes: 30, labor_rate_per_hour: 600, is_owner_labor: false, is_labor_per_unit: true,
  markup_percent: 20, defect_percent: 10, discount_percent: 5, discount_amount: 7,
  urgency_percent: 15, urgency_amount: 9, agreed_price: 0, stock_quantity: 12,
  category: 'Корпуса', tags: ['tag'], collection_id: 'collection', stl_url: 'https://example.com/model.stl',
  custom_cost_items: [{ id: 'cost', name: 'Hardware', amount: 8, isEnabled: true, mode: 'cost_no_markup' }] };

test('product roundtrip preserves quantity, zero agreed price and every item adjustment without stock writes', () => {
  const form = productToCalculatorForm(product, filaments, printers);
  assert.equal(form.days, '2'); assert.equal(form.hours, '1'); assert.equal(form.minutes, '15');
  const patch = calculatorFormToProductUpdates(form, { filaments, printers, settings: null, product });
  for (const key of ['name', 'weight_g', 'hours', 'minutes', 'quantity', 'labor_minutes', 'labor_rate_per_hour',
    'is_owner_labor', 'is_labor_per_unit', 'markup_percent', 'defect_percent', 'discount_percent',
    'discount_amount', 'urgency_percent', 'urgency_amount', 'agreed_price', 'filament_id', 'printer_id'] as const) {
    assert.equal(patch[key], product[key], key);
  }
  assert.equal(patch.calculation_snapshot?.inputs.quantity, 4);
  assert.equal(patch.calculation_snapshot?.inputs.filament?.id, 'blue');
  assert.equal(patch.calculation_snapshot?.result.materialCost, 200);
  assert.equal(patch.final_price, 0);
  assert.equal(patch.base_cost, patch.calculation_snapshot!.result.totalBaseCost);
  for (const key of ['id', 'user_id', 'created_at', 'stock_quantity', 'category', 'tags', 'collection_id', 'stl_url']) {
    assert.equal(Object.hasOwn(patch, key), false, key);
  }
  form.customCosts[0].amount = 99;
  assert.equal(product.custom_cost_items![0].amount, 8);
});

test('legacy selection resolves exact color and never silently replaces a deleted resource with first resource', () => {
  assert.equal(productToCalculatorForm({ ...product, filament_id: undefined }, filaments, printers).filamentId, 'blue');
  const missing = { ...product, filament_id: 'deleted', printer_id: 'deleted-printer' };
  const form = productToCalculatorForm(missing, filaments, printers);
  const patch = calculatorFormToProductUpdates(form, { filaments, printers, settings: null, product: missing });
  assert.equal(patch.filament_id, 'deleted'); assert.equal(patch.printer_id, 'deleted-printer');
  assert.equal(patch.calculation_snapshot?.inputs.filament, null);
  assert.equal(patch.calculation_snapshot?.inputs.printer, null);
  assert.equal(patch.filament_name, 'PLA'); assert.equal(patch.filament_color, '#0000ff');
});

test('explicit recalculation uses current material price and rejects applying single-print formulas to an assembly', () => {
  const patch = calculatorFormToProductUpdates(productToCalculatorForm(product, filaments, printers),
    { filaments: filaments.map(f => ({ ...f, price: f.price * 2 })), printers, settings: null, product });
  assert.equal(patch.calculation_snapshot?.result.materialCost, 400);
  assert.equal(product.base_cost, 77); assert.equal(product.final_price, 150);
  assert.throws(() => calculatorFormToProductUpdates(productToCalculatorForm(product, filaments, printers),
    { filaments, printers, settings: null, product: { ...product, type: 'assembly' } }), /сборк/i);
});

test('snapshot-only optional parameters survive reopening while missing legacy settings remain dynamic', () => {
  const snapshotSource = calculatorFormToProductUpdates(productToCalculatorForm(product, filaments, printers),
    { filaments, printers, settings: null, product });
  const minimal: SavedCalculation = { id: 'legacy', name: 'Legacy', filament_name: 'PLA', printer_name: 'P1',
    weight_g: 100, hours: 1, minutes: 0, quantity: 2, base_cost: 50, final_price: 100,
    calculation_snapshot: snapshotSource.calculation_snapshot };
  const fromSnapshot = productToCalculatorForm(minimal, filaments, printers);
  assert.equal(fromSnapshot.agreedPrice, '0');
  assert.equal(fromSnapshot.discountValue, '5'); assert.equal(fromSnapshot.discountExtraAmount, '7');
  assert.equal(fromSnapshot.customCosts[0].amount, 8);
  const noSnapshot = productToCalculatorForm({ ...minimal, calculation_snapshot: undefined }, filaments, printers);
  assert.equal(noSnapshot.laborMinutes, ''); assert.equal(noSnapshot.laborRate, '');
  assert.equal(noSnapshot.markup, ''); assert.equal(noSnapshot.defect, '');
  assert.equal(noSnapshot.isOwnerLabor, true);
});

test('product calculator bridge appends one owner-scoped card retaining existing cards and revision baseline', () => {
  let serial = 0;
  const id = () => `card-${++serial}`;
  const source = createCalculationDraft('alice', { ...emptyCalculatorForm(), weight: '42' }, id);
  const next = addProductToCalculationDraft(source, 'alice', { ...product, catalog_revision: 7 }, filaments, printers, id);
  assert.equal(next.items.length, 2); assert.equal(source.items.length, 1);
  assert.deepEqual(next.items[0], source.items[0]);
  const imported = next.items[1];
  assert.equal(next.activeItemId, imported.id); assert.equal(imported.productId, 'product');
  assert.equal(imported.productRevision, 7); assert.equal(imported.productEditBaseline?.name, 'Корпус');
  assert.equal(imported.form.quantity, '4'); assert.equal(imported.form.agreedPrice, '0');
  imported.form.customCosts[0].amount = 99;
  assert.equal(imported.productEditBaseline?.form.customCosts[0].amount, 8);
  assert.throws(() => addProductToCalculationDraft(source, 'bob', product, filaments, printers, id), /владел/i);
  assert.throws(() => addProductToCalculationDraft(null, 'alice', { ...product, type: 'assembly' }, filaments, printers, id), /сборк/i);
});

test('close guard honors synchronous dirty cancellation for the specified product', () => {
  const target = new EventTarget();
  const prevent = (event: Event) => {
    if ((event as CustomEvent<{ productId: string }>).detail.productId === product.id) event.preventDefault();
  };
  target.addEventListener('3d-product-editor-close', prevent);
  assert.equal(canCloseProductEditor(product.id, target), false);
  assert.equal(canCloseProductEditor('other', target), true);
  target.removeEventListener('3d-product-editor-close', prevent);
  assert.equal(canCloseProductEditor(product.id, target), true);
});

test('disabled agreed-price override is explicitly null in serialized catalog patch', () => {
  const form = { ...productToCalculatorForm(product, filaments, printers), agreedPrice: '' };
  const patch = calculatorFormToProductUpdates(form, { filaments, printers, settings: null, product });
  assert.equal(JSON.parse(JSON.stringify(patch)).agreed_price, null);
});
