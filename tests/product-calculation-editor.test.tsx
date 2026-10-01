import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductCalculationEditor } from '../src/widgets/ProductsList/ProductCalculationEditor';
import { ProductRowDrawer } from '../src/widgets/ProductsList/components/v2/ProductRowDrawer';
import type { SavedCalculation } from '../src/shared/types';
import type { CatalogTableRow } from '../src/widgets/ProductsList/types';

const product: SavedCalculation = { id: 'p', name: 'Корпус', filament_id: 'f', filament_name: 'PLA',
  printer_id: 'r', printer_name: 'P1', weight_g: 100, hours: 1, minutes: 30, quantity: 5,
  base_cost: 77, final_price: 150, stock_quantity: 12 };

test('single editor renders full shared receipt, explicit controls and stored prices without requiring providers', () => {
  let saves = 0;
  const html = renderToStaticMarkup(<ProductCalculationEditor product={product}
    filaments={[{ id: 'f', name: 'PLA', weight_g: 1000, price: 1000 }]}
    printers={[{ id: 'r', name: 'P1', power_w: 100, price: 10000, lifespan_hours: 1000 }]}
    onSave={() => { saves++; }} onClose={() => {}} />);
  assert.match(html, /Сохранённая цена тиража/); assert.match(html, /150/);
  assert.match(html, /Сохранённая себестоимость тиража/); assert.match(html, /77/);
  for (const label of ['Количество в тираже', 'Труд за единицу', 'Согласованная цена тиража',
    'Смета предлагаемого расчёта', 'Электроэнергия', 'Амортизация', 'Брак и тесты',
    'Пересчитать по текущим ресурсам', 'Сохранить изменения', 'Отменить изменения']) {
    assert.ok(html.includes(label), label);
  }
  assert.equal(saves, 0);
});

test('assembly editor retains dedicated composition path and never renders single-print receipt', () => {
  const html = renderToStaticMarkup(<ProductCalculationEditor product={{ ...product, type: 'assembly',
    assembly_parts: [{ name: 'Деталь', weight_g: 10, hours: 0, minutes: 10, quantity: 3, base_cost: 5, final_price: 10 }],
    assembly_hardware: [{ id: 'h', name: 'Винт', quantity: 4, cost_per_unit: 1, price_per_unit: 2 }],
    assembly_electronics: [{ id: 'e', name: 'Плата', quantity: 1, cost_per_unit: 5, price_per_unit: 8 }] }}
    onSave={() => {}} onOpenEditAssembly={() => {}} onClose={() => {}} />);
  assert.match(html, /Спецификация сборки/); assert.match(html, /Деталь/);
  assert.match(html, /Винт/); assert.match(html, /Плата/);
  assert.doesNotMatch(html, /Смета предлагаемого расчёта|Пересчитать по текущим ресурсам/);
});

test('product drawer delegates to explicit editor instead of exposing old blur calculation fields', () => {
  const row = { rowKind: 'product', id: 'p', name: 'Корпус', item: product } as CatalogTableRow;
  const html = renderToStaticMarkup(<ProductRowDrawer row={row} onClose={() => {}}
    onInlineUpdateProduct={() => {}} />);
  assert.match(html, /Сохранить изменения/);
  assert.doesNotMatch(html, /Параметры синхронизированы|Рентабельность подтверждена/);
});
