import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { matchesSearchProduct, matchesSearchCollection, getSearchAutoExpandedIds } from '../src/widgets/ProductsList/helpers';
import { SavedCalculation, ProductCollection } from '../src/shared/types';
import { CatalogTableRow } from '../src/widgets/ProductsList/types';
import { AssemblyExpandedRow } from '../src/widgets/ProductsList/components/v2/AssemblyExpandedRow';

describe('matchesSearchProduct', () => {
  const singleProduct: SavedCalculation = {
    id: 'prod-001-uuid',
    name: 'Корпус прибора',
    type: 'single',
    category: 'Корпуса',
    filament_name: 'PETG Серый',
    printer_name: 'Bambu Lab X1C',
    weight_g: 120,
    hours: 3,
    minutes: 15,
    quantity: 1,
    base_cost: 250,
    final_price: 600,
    tags: ['бокс', 'электроника', 'прототип'],
  };

  const assemblyProduct: SavedCalculation = {
    id: 'asm-002-uuid',
    name: 'Робот-манипулятор',
    type: 'assembly',
    category: 'Робототехника',
    filament_name: 'Несколько материалов',
    printer_name: 'Разные принтеры',
    weight_g: 450,
    hours: 8,
    minutes: 0,
    quantity: 1,
    base_cost: 1500,
    final_price: 3800,
    tags: ['механика', 'diy'],
    assembly_parts: [
      {
        name: 'Плечо манипулятора',
        filament_name: 'Carbon PETG',
        printer_name: 'Voron 2.4',
        weight_g: 180,
        hours: 4,
        minutes: 0,
        quantity: 1,
        base_cost: 400,
        final_price: 900,
      },
      {
        name: 'Захват клешни',
        filament_name: 'TPU 95A',
        printer_name: 'Prusa MK4',
        weight_g: 50,
        hours: 1,
        minutes: 30,
        quantity: 2,
        base_cost: 150,
        final_price: 400,
      },
    ],
    assembly_hardware: [
      {
        id: 'hw-1',
        name: 'Винты M3x12 DIN 912',
        quantity: 16,
        cost_per_unit: 4,
        price_per_unit: 8,
      },
      {
        id: 'hw-2',
        name: 'Втулки резьбовые M3',
        quantity: 8,
        cost_per_unit: 6,
        price_per_unit: 12,
      },
    ],
    assembly_electronics: [
      {
        id: 'el-1',
        name: 'Сервопривод SG90 Micro',
        quantity: 3,
        cost_per_unit: 120,
        price_per_unit: 250,
      },
      {
        id: 'el-2',
        name: 'Микроконтроллер Arduino Nano',
        quantity: 1,
        cost_per_unit: 300,
        price_per_unit: 650,
      },
    ],
  };

  it('matches single product by name, filament, tag, category, and ID', () => {
    assert.equal(matchesSearchProduct(singleProduct, 'корпус'), true);
    assert.equal(matchesSearchProduct(singleProduct, 'petg'), true);
    assert.equal(matchesSearchProduct(singleProduct, 'бокс'), true);
    assert.equal(matchesSearchProduct(singleProduct, 'корпуса'), true);
    assert.equal(matchesSearchProduct(singleProduct, 'prod-001'), true);
    assert.equal(matchesSearchProduct(singleProduct, 'несуществующий'), false);
  });

  it('matches assembly by assembly name, category, and tags', () => {
    assert.equal(matchesSearchProduct(assemblyProduct, 'манипулятор'), true);
    assert.equal(matchesSearchProduct(assemblyProduct, 'робототехника'), true);
    assert.equal(matchesSearchProduct(assemblyProduct, 'diy'), true);
  });

  it('matches assembly by printed parts (name, material, printer)', () => {
    assert.equal(matchesSearchProduct(assemblyProduct, 'плечо'), true);
    assert.equal(matchesSearchProduct(assemblyProduct, 'Carbon PETG'), true);
    assert.equal(matchesSearchProduct(assemblyProduct, 'клешни'), true);
    assert.equal(matchesSearchProduct(assemblyProduct, 'TPU'), true);
    assert.equal(matchesSearchProduct(assemblyProduct, 'Voron'), true);
  });

  it('matches assembly by hardware fasteners', () => {
    assert.equal(matchesSearchProduct(assemblyProduct, 'm3x12'), true);
    assert.equal(matchesSearchProduct(assemblyProduct, 'втулки'), true);
    assert.equal(matchesSearchProduct(assemblyProduct, 'din 912'), true);
  });

  it('matches assembly by electronic modules', () => {
    assert.equal(matchesSearchProduct(assemblyProduct, 'sg90'), true);
    assert.equal(matchesSearchProduct(assemblyProduct, 'arduino'), true);
    assert.equal(matchesSearchProduct(assemblyProduct, 'сервопривод'), true);
  });
});

describe('matchesSearchCollection', () => {
  const collection: ProductCollection = {
    id: 'col-robot-set',
    name: 'Набор робототехники 2026',
    category: 'Обучение',
    tags: ['роботы', 'stem'],
    description: 'Комплект модулей для сборки и моделирования',
  };

  const childAssembly: SavedCalculation = {
    id: 'asm-003',
    collection_id: 'col-robot-set',
    name: 'Колесная платформа',
    type: 'assembly',
    category: 'Робототехника',
    filament_name: 'PLA',
    printer_name: 'Bambu',
    weight_g: 200,
    hours: 3,
    minutes: 0,
    quantity: 1,
    base_cost: 800,
    final_price: 2000,
    assembly_electronics: [
      {
        id: 'el-motor',
        name: 'Мотор-редуктор N20 6V',
        quantity: 2,
        cost_per_unit: 180,
        price_per_unit: 350,
      },
    ],
  };

  const childSingle: SavedCalculation = {
    id: 'prd-wheel',
    collection_id: 'col-robot-set',
    name: 'Колесо резиновое',
    type: 'single',
    category: 'Комплектующие',
    filament_name: 'TPU Black',
    printer_name: 'Bambu',
    weight_g: 40,
    hours: 1,
    minutes: 0,
    quantity: 2,
    base_cost: 100,
    final_price: 300,
  };

  const childs = [childAssembly, childSingle];

  it('matches collection by its own metadata (name, tags, description, category)', () => {
    const resName = matchesSearchCollection(collection, childs, 'набор робототехники');
    assert.equal(resName.matches, true);
    assert.equal(resName.matchedChilds.length, 2);

    const resTag = matchesSearchCollection(collection, childs, 'stem');
    assert.equal(resTag.matches, true);
  });

  it('matches collection when a child product matches', () => {
    const resChild = matchesSearchCollection(collection, childs, 'резиновое');
    assert.equal(resChild.matches, true);
    assert.equal(resChild.matchedChilds.length, 1);
    assert.equal(resChild.matchedChilds[0].id, 'prd-wheel');
  });

  it('matches collection when a sub-component inside a child assembly matches', () => {
    const resEl = matchesSearchCollection(collection, childs, 'N20');
    assert.equal(resEl.matches, true);
    assert.equal(resEl.matchedChilds.length, 1);
    assert.equal(resEl.matchedChilds[0].id, 'asm-003');
  });
});

describe('getSearchAutoExpandedIds', () => {
  it('returns IDs of collections and assemblies that matched by internal items/components', () => {
    const rows: CatalogTableRow[] = [
      {
        rowKind: 'collection',
        id: 'col-1',
        name: 'Комплект',
        category: 'Разное',
        itemsCount: 1,
        singleCount: 1,
        assemblyCount: 0,
        totalStock: 1,
        minPrice: 100,
        maxPrice: 100,
        minCost: 50,
        maxCost: 50,
        totalProfit: 50,
        materialsList: ['PLA'],
        materialsColors: ['#fff'],
        minWeight: 10,
        maxWeight: 10,
        minHours: 1,
        maxHours: 1,
        minMins: 0,
        maxMins: 0,
        stlCount: 0,
        final_price: 100,
        base_cost: 50,
        stock_quantity: 1,
        weight_g: 10,
        hours: 1,
        minutes: 0,
        collection: { id: 'col-1', name: 'Комплект' },
        childItems: [
          {
            id: 'child-1',
            name: 'Шестерня M1',
            type: 'single',
            filament_name: 'Nylon',
            printer_name: 'X1',
            weight_g: 10,
            hours: 1,
            minutes: 0,
            quantity: 1,
            base_cost: 50,
            final_price: 100,
          },
        ],
      },
      {
        rowKind: 'product',
        id: 'asm-1',
        name: 'Сборка дрона',
        category: 'Авиа',
        final_price: 5000,
        base_cost: 2000,
        stock_quantity: 1,
        weight_g: 300,
        hours: 5,
        minutes: 0,
        item: {
          id: 'asm-1',
          name: 'Сборка дрона',
          type: 'assembly',
          filament_name: 'PETG',
          printer_name: 'X1',
          weight_g: 300,
          hours: 5,
          minutes: 0,
          quantity: 1,
          base_cost: 2000,
          final_price: 5000,
          assembly_hardware: [
            {
              id: 'hw-bolt',
              name: 'Болт титановый M2x6',
              quantity: 8,
              cost_per_unit: 20,
              price_per_unit: 50,
            },
          ],
        },
      },
    ];

    const expandedForGear = getSearchAutoExpandedIds(rows, 'шестерня', {});
    assert.equal(expandedForGear['col-1'], true);

    const expandedForBolt = getSearchAutoExpandedIds(rows, 'титановый', {});
    assert.equal(expandedForBolt['asm-1'], true);
  });

  it('respects explicit collapse (false) set by user during search', () => {
    const rows: CatalogTableRow[] = [
      {
        rowKind: 'collection',
        id: 'col-closed',
        name: 'Комплект закрытый',
        childItems: [{ id: 'c-1', name: 'Деталь X' } as SavedCalculation],
      } as unknown as CatalogTableRow,
    ];

    const res = getSearchAutoExpandedIds(rows, 'деталь', { 'col-closed': false });
    assert.equal(res['col-closed'], false, 'Явно свернутая пользователем строка не должна принудительно раскрываться');
  });

  it('matches sub-components by ID in getSearchAutoExpandedIds', () => {
    const rows: CatalogTableRow[] = [
      {
        rowKind: 'product',
        id: 'asm-by-id',
        item: {
          id: 'asm-by-id',
          name: 'Сборка',
          type: 'assembly',
          assembly_hardware: [{ id: 'hw-special-code-99', name: 'Винт' }],
        } as unknown as SavedCalculation,
      } as unknown as CatalogTableRow,
    ];

    const res = getSearchAutoExpandedIds(rows, 'special-code', {});
    assert.equal(res['asm-by-id'], true);
  });
});

describe('AssemblyExpandedRow search query highlighting', () => {
  const sampleAssembly: SavedCalculation = {
    id: 'asm-search-demo',
    name: 'Роботизированная рука',
    type: 'assembly',
    final_price: 10000,
    base_cost: 4000,
    assembly_parts: [
      {
        name: 'Кисть робота',
        filament_name: 'PLA Carbon',
        printer_name: 'Bambu X1C',
        weight_g: 100,
        hours: 1,
        minutes: 0,
        quantity: 1,
        base_cost: 500,
        final_price: 1200,
      },
    ],
    assembly_hardware: [
      {
        id: 'hw-m4',
        name: 'Винт M4x20 DIN 912',
        quantity: 10,
        cost_per_unit: 5,
        price_per_unit: 10,
      },
    ],
    assembly_electronics: [
      {
        id: 'el-driver',
        name: 'Драйвер шагового двигателя A4988',
        quantity: 2,
        cost_per_unit: 150,
        price_per_unit: 350,
      },
    ],
  } as unknown as SavedCalculation;

  it('highlights matched hardware component and shows count in section header', () => {
    const html = renderToStaticMarkup(
      <AssemblyExpandedRow assembly={sampleAssembly} searchQuery="m4x20" />
    );

    assert.match(html, /Найдено:\s*1/);
    assert.match(html, /НАЙДЕНО/);
    assert.match(html, /Винт M4x20 DIN 912/);
  });

  it('highlights matched electronics module and shows count in section header', () => {
    const html = renderToStaticMarkup(
      <AssemblyExpandedRow assembly={sampleAssembly} searchQuery="a4988" />
    );

    assert.match(html, /Найдено:\s*1/);
    assert.match(html, /НАЙДЕНО/);
    assert.match(html, /Драйвер шагового двигателя A4988/);
  });

  it('highlights matched printed part and shows count in section header', () => {
    const html = renderToStaticMarkup(
      <AssemblyExpandedRow assembly={sampleAssembly} searchQuery="кисть" />
    );

    assert.match(html, /Найдено:\s*1/);
    assert.match(html, /НАЙДЕНО/);
    assert.match(html, /Кисть робота/);
  });

  it('highlights matched component in cards mode for mobile', () => {
    const html = renderToStaticMarkup(
      <AssemblyExpandedRow assembly={sampleAssembly} mode="cards" searchQuery="a4988" />
    );

    assert.match(html, /Найдено:\s*1/);
    assert.match(html, /НАЙДЕНО/);
    assert.match(html, /Драйвер шагового двигателя A4988/);
  });
});

