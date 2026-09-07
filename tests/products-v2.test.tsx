import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PRODUCTS_EXPANDED_COLUMNS,
  PRODUCTS_COMPACT_COLUMNS
} from '../src/widgets/ProductsList/components/v2/ProductsV2Table';
import { ProductsV2FilterBar } from '../src/widgets/ProductsList/components/v2/ProductsV2FilterBar';
import { getSalesStats } from '../src/widgets/ProductsList/helpers';
import { Order, SavedCalculation } from '../src/shared/types';

test('products table grid templates define exact column counts matching orders specification', () => {
  // 13 колонок в развёрнутом режиме
  const expandedCols = PRODUCTS_EXPANDED_COLUMNS.trim().split(/\s+/);
  assert.equal(expandedCols.length, 13, 'Развёрнутый режим обязан содержать ровно 13 синхронизированных колонок');

  // 9 колонок в компактном режиме
  const compactCols = PRODUCTS_COMPACT_COLUMNS.trim().split(/\s+/);
  assert.equal(compactCols.length, 9, 'Компактный режим обязан содержать ровно 9 сдвоенных колонок как в Orders');
});

test('products filter bar renders segmented filter and search capsule', () => {
  const counts = {
    all: 10,
    single: 6,
    assembly: 2,
    collections: 2,
    inStock: 8,
    lowStock: 1,
    outOfStock: 1,
    bestsellers: 3,
  };

  const html = renderToStaticMarkup(
    <ProductsV2FilterBar
      searchQuery=""
      setSearchQuery={() => {}}
      productFilter="all"
      setProductFilter={() => {}}
      stockFilter="all"
      setStockFilter={() => {}}
      onlyBestsellers={false}
      setOnlyBestsellers={() => {}}
      selectedCategories={['all']}
      setSelectedCategories={() => {}}
      categoriesList={[]}
      counts={counts}
    />
  );

  assert.match(html, /placeholder="Поиск товаров\.\.\."/);
  assert.match(html, /aria-label="Тип позиций каталога"/);
  assert.match(html, /Все/);
  assert.match(html, /Штучные/);
  assert.match(html, /Сборки/);
  assert.match(html, /Коллекции/);
  assert.match(html, /Хиты/);
});

test('getSalesStats calculates percentage share and identifies bestsellers correctly', () => {
  const calculations: SavedCalculation[] = [
    { id: 'prod-1', name: 'Товар А (50%)' } as SavedCalculation,
    { id: 'prod-2', name: 'Товар Б (28%)' } as SavedCalculation,
    { id: 'prod-3', name: 'Товар В (12%)' } as SavedCalculation,
    { id: 'prod-4', name: 'Товар Г (10%)' } as SavedCalculation,
  ];

  const orders: Order[] = [
    { id: 'o-1', type: 'income', product_id: 'prod-1', quantity: 50, amount: 50000 } as Order,
    { id: 'o-2', type: 'income', product_id: 'prod-2', quantity: 28, amount: 28000 } as Order,
    { id: 'o-3', type: 'income', product_id: 'prod-3', quantity: 12, amount: 12000 } as Order,
    { id: 'o-4', type: 'income', product_id: 'prod-4', quantity: 10, amount: 10000 } as Order,
  ];

  const { map, totalAllTimeSold } = getSalesStats(orders, calculations);

  assert.equal(totalAllTimeSold, 100, 'Всего продано должно быть ровно 100 единиц');

  const p1 = map.get('prod-1');
  assert.equal(p1?.soldQty, 50);
  assert.equal(p1?.salesSharePercent, 50.0);
  assert.equal(p1?.isBestseller, true, 'Товар с долей 50% обязан иметь статус ХИТ');

  const p2 = map.get('prod-2');
  assert.equal(p2?.soldQty, 28);
  assert.equal(p2?.salesSharePercent, 28.0);
  assert.equal(p2?.isBestseller, false, 'Товар с долей 28% не должен быть хитом');

  const p3 = map.get('prod-3');
  assert.equal(p3?.salesSharePercent, 12.0);
  assert.equal(p3?.isBestseller, false);

  const p4 = map.get('prod-4');
  assert.equal(p4?.salesSharePercent, 10.0);
  assert.equal(p4?.isBestseller, false);
});

