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

test('inventory registry renders card grid when viewMode is cards', () => {
  const rows: ExampleRow[] = [{ id: 'row-1', name: 'PETG Carbon', cost: 2.1 }];
  const columns: InventoryRegistryColumn<ExampleRow, string>[] = [
    { id: 'name', header: 'Материал', render: (row) => row.name },
  ];

  const html = renderToStaticMarkup(
    <InventoryRegistryTable
      ariaLabel="Реестр филаментов"
      data={rows}
      columns={columns}
      keyExtractor={(row) => row.id}
      viewMode="cards"
      renderCard={(row) => <article className="filament-card">{row.name}</article>}
      emptyState={<p>Пусто</p>}
    />,
  );

  assert.match(html, /filament-card/);
  assert.match(html, /PETG Carbon/);
  assert.match(html, /grid-cols-1 sm:grid-cols-2 xl:grid-cols-3/);
  assert.doesNotMatch(html, /<table/);
});

test('inventory registry renders data table when viewMode is table', () => {
  const rows: ExampleRow[] = [{ id: 'row-1', name: 'ABS Red', cost: 1.1 }];
  const columns: InventoryRegistryColumn<ExampleRow, string>[] = [
    { id: 'name', header: 'Материал', render: (row) => row.name },
  ];

  const html = renderToStaticMarkup(
    <InventoryRegistryTable
      ariaLabel="Реестр филаментов"
      data={rows}
      columns={columns}
      keyExtractor={(row) => row.id}
      viewMode="table"
      renderCard={(row) => <article>{row.name}</article>}
      emptyState={<p>Пусто</p>}
    />,
  );

  assert.match(html, /<table/);
  assert.match(html, /ABS Red/);
  assert.doesNotMatch(html, /grid-cols-1 sm:grid-cols-2 xl:grid-cols-3/);
});
