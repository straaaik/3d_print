import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  InventoryRegistryToolbar,
  InventoryRegistryTable,
  nextInventorySort,
  type InventoryRegistryColumn,
} from '../src/widgets/InventoryCockpit/InventoryRegistryTable';

interface ExampleRow {
  id: string;
  name: string;
  cost: number;
}

test('inventory registry toolbar stays above the sticky table header', () => {
  const html = renderToStaticMarkup(
    <InventoryRegistryToolbar>
      <button type="button">Сортировка</button>
    </InventoryRegistryToolbar>,
  );

  assert.match(html, /class="relative z-30/);
  assert.match(html, />Сортировка<\/button>/);
});

test('inventory registry reuses the orders responsive table pattern', () => {
  const rows: ExampleRow[] = [{ id: 'row-1', name: 'PLA Basic', cost: 1.25 }];
  const columns: InventoryRegistryColumn<ExampleRow, string>[] = [
    { id: 'name', header: 'Материал', render: (row) => row.name },
    { id: 'cost', header: 'Цена', render: (row) => row.cost, align: 'right' },
  ];

  const html = renderToStaticMarkup(
    <InventoryRegistryTable
      ariaLabel="Реестр филаментов"
      data={rows}
      columns={columns}
      keyExtractor={(row) => row.id}
      renderMobileCard={(row) => <article>{row.name}</article>}
      emptyState={<p>Пусто</p>}
    />,
  );

  assert.match(html, /aria-label="Реестр филаментов"/);
  assert.match(html, /class="lg:hidden/);
  assert.match(html, /class="hidden lg:block/);
  assert.match(html, /<th[^>]*>[\s\S]*Материал[\s\S]*<\/th>/);
  assert.match(html, /PLA Basic/);
});

test('inventory registry sortable headers toggle between ascending and descending presets', () => {
  const presets = { asc: 'cost-asc', desc: 'cost-desc' };
  assert.equal(nextInventorySort('cost-asc', presets), 'cost-desc');
  assert.equal(nextInventorySort('cost-desc', presets), 'cost-asc');
  assert.equal(nextInventorySort('name-asc', presets), 'cost-asc');
});
