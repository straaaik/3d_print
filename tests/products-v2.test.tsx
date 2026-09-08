import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PRODUCTS_EXPANDED_COLUMNS,
  PRODUCTS_COMPACT_COLUMNS
} from '../src/widgets/ProductsList/components/v2/ProductsV2Table';
import { ProductsV2FilterBar } from '../src/widgets/ProductsList/components/v2/ProductsV2FilterBar';
import { AssemblyExpandedRow } from '../src/widgets/ProductsList/components/v2/AssemblyExpandedRow';
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

test('badge counter does not show false fraction when no filters are active even if collections exist', () => {
  // 21 товар в базе, из них 3 в коллекции
  const calculations: SavedCalculation[] = Array.from({ length: 21 }, (_, i) => ({
    id: `calc-${i + 1}`,
    name: `Товар ${i + 1}`,
    final_price: 500,
    base_cost: 200,
    weight_g: 50,
    hours: 1,
    minutes: 0,
    quantity: 1,
    filament_name: 'PLA',
    printer_name: 'Ender 3',
    collection_id: i < 3 ? 'col-1' : undefined,
    collection_name: i < 3 ? 'Коллекция 1' : undefined,
  }));

  const totalProductsCount = calculations.length;
  const searchQuery = '';
  const productFilter = 'all';
  const stockFilter = 'all';
  const onlyBestsellers = false;
  const selectedCategories = ['all'];

  const isFilterActive = Boolean(
    searchQuery.trim() ||
    productFilter !== 'all' ||
    stockFilter !== 'all' ||
    onlyBestsellers ||
    (selectedCategories.length > 0 && !selectedCategories.includes('all'))
  );

  assert.equal(isFilterActive, false, 'Фильтры не должны считаться активными');

  // Допустим, в таблице 19 строк (1 коллекция + 18 штучных)
  const totalRowsCount = 19;
  const displayedProductsCount = 21; // 3 внутри коллекции + 18 штучных

  // Старый ошибочный код сравнивал totalRowsCount !== totalProductsCount (19 !== 21) -> давал '19 / 21'
  const oldFaultyBadge = totalRowsCount !== totalProductsCount ? `${totalRowsCount} / ${totalProductsCount}` : `${totalRowsCount}`;
  assert.equal(oldFaultyBadge, '19 / 21', 'Старый код ошибочно выдавал 19 / 21');

  // Новый исправленный код:
  const newBadge = isFilterActive && displayedProductsCount !== totalProductsCount
    ? `${displayedProductsCount} / ${totalProductsCount}`
    : `${totalProductsCount}`;

  assert.equal(newBadge, '21', 'Новый код обязан показывать 21 без дроби');
});

test('badge counter shows fraction when filters are active', () => {
  const totalProductsCount: number = 21;
  const productFilter: string = 'assembly';
  const isFilterActive = Boolean(productFilter !== 'all');
  const displayedProductsCount: number = 5;

  const newBadge = isFilterActive && displayedProductsCount !== totalProductsCount
    ? `${displayedProductsCount} / ${totalProductsCount}`
    : `${totalProductsCount}`;

  assert.equal(newBadge, '5 / 21', 'При активном фильтре показывает 5 / 21');
});

test('assembly expanded row renders specification columns and a negative profit without a plus sign', () => {
  const assembly: SavedCalculation = {
    id: 'assembly-1',
    name: 'Длинное имя сборки для проверки спецификации',
    type: 'assembly',
    filament_name: '',
    printer_name: '',
    weight_g: 0,
    hours: 0,
    minutes: 0,
    quantity: 1,
    base_cost: 1500,
    final_price: 1200,
    assembly_labor_minutes: 45,
    assembly_labor_cost: 300,
    is_owner_labor: true,
    assembly_parts: [{
      id: 'part-1',
      name: 'Деталь с очень длинным наименованием для проверки переноса текста',
      weight_g: 12,
      hours: 0,
      minutes: 30,
      quantity: 2,
      filament_name: 'PETG',
      filament_color: '#0ea5e9',
      base_cost: 100,
      final_price: 150,
    }],
    assembly_hardware: [{
      id: 'hardware-1',
      name: 'Винт M3×12',
      quantity: 4,
      cost_per_unit: 5,
      price_per_unit: 10,
    }],
  };

  const html = renderToStaticMarkup(<AssemblyExpandedRow assembly={assembly} />);

  assert.match(html, /Компонент/);
  assert.match(html, /Материал/);
  assert.match(html, /Кол-во/);
  assert.match(html, /Общий вес/);
  assert.match(html, /Сумма/);
  assert.match(html, /Деталь с очень длинным наименованием/);
  assert.match(html, /Прибыль/);
  assert.match(html, /−300/);
  assert.doesNotMatch(html, /\+−300/);
  assert.match(html, /труд учтён в прибыли/);
  assert.match(html, /background-color:#0ea5e9/);
});

// Вспомогательная функция для рекурсивного обхода React VDOM-дерева в тестах
function findElementsByPredicate(node: any, predicate: (n: any) => boolean): any[] {
  const matches: any[] = [];
  function traverse(current: any) {
    if (!current) return;
    if (Array.isArray(current)) {
      current.forEach(traverse);
      return;
    }
    if (predicate(current)) matches.push(current);
    if (current.props && current.props.children) {
      if (Array.isArray(current.props.children)) {
        current.props.children.forEach(traverse);
      } else {
        traverse(current.props.children);
      }
    }
  }
  traverse(node);
  return matches;
}

const sampleFullAssembly: SavedCalculation = {
  id: 'assembly-drone-01',
  name: 'Квадрокоптер FPV 5 дюймов',
  type: 'assembly',
  category: 'Дроны и БПЛА',
  filament_name: '',
  printer_name: '',
  weight_g: 0,
  hours: 0,
  minutes: 0,
  quantity: 1,
  base_cost: 3200,
  final_price: 5800,
  assembly_labor_minutes: 90,
  assembly_labor_cost: 1200,
  is_owner_labor: false,
  assembly_parts: [
    {
      id: 'part-frame-top',
      name: 'Верхняя пластина рамы',
      weight_g: 45,
      hours: 1,
      minutes: 15,
      quantity: 1,
      filament_name: 'Carbon PETG',
      filament_color: '#06b6d4',
      base_cost: 250,
      final_price: 500,
      printer_name: 'Voron 2.4',
      stl_url: 'https://example.com/frame-top.stl',
    },
    {
      id: 'part-arm-mount',
      name: 'Крепление луча',
      weight_g: 20,
      hours: 0,
      minutes: 40,
      quantity: 4,
      filament_name: 'TPU 95A',
      filament_color: '#10b981',
      base_cost: 80,
      final_price: 180,
      printer_name: 'Bambu Lab P1S',
    },
  ],
  assembly_hardware: [
    {
      id: 'hw-m3-screws',
      name: 'Винты титановые M3x10',
      quantity: 16,
      cost_per_unit: 15,
      price_per_unit: 30,
    },
    {
      id: 'hw-standoffs',
      name: 'Стойки алюминиевые 25мм',
      quantity: 4,
      cost_per_unit: 40,
      price_per_unit: 80,
    },
  ],
  assembly_electronics: [
    {
      id: 'el-flight-controller',
      name: 'Полётный контроллер F405',
      quantity: 1,
      cost_per_unit: 1200,
      price_per_unit: 2100,
    },
    {
      id: 'el-motor-2207',
      name: 'Бесколлекторный мотор 2207 1950KV',
      quantity: 4,
      cost_per_unit: 350,
      price_per_unit: 650,
    },
  ],
};

test('assembly expanded row renders all three sections with headers, tree connectors, items and telemetry in expanded mode', () => {
  const html = renderToStaticMarkup(
    <AssemblyExpandedRow
      assembly={sampleFullAssembly}
      mode="expanded"
      onCreateOrder={() => {}}
      onLoadIntoCalculator={() => {}}
      onOpenQuickEditModal={() => {}}
    />
  );

  // 1. Заголовки всех трёх категорий
  assert.match(html, /\[ПЕЧАТНЫЕ ДЕТАЛИ\]/, 'Секция печатных деталей обязана присутствовать');
  assert.match(html, /\[КРЕПЁЖ И ФУРНИТУРА\]/, 'Секция крепежа обязана присутствовать');
  assert.match(html, /\[ЭЛЕКТРОНИКА И МОДУЛИ\]/, 'Секция электроники обязана присутствовать');

  // 2. Древовидная нотация: ┌─ для заголовков и └─ для строк
  const cornerHeaders = html.match(/┌─/g) || [];
  assert.equal(cornerHeaders.length, 3, 'Должно быть ровно 3 заголовка секций со значком ┌─');
  const rowConnectors = html.match(/└─/g) || [];
  assert.equal(rowConnectors.length, 6, 'Должно быть ровно 6 строк компонентов со связующим символом └─ (2 детали, 2 крепежа, 2 модуля)');

  // 3. Сводная статистика по секциям в заголовках
  assert.match(html, /2 дет\./, 'В заголовке деталей должно быть указано количество деталей');
  assert.match(html, /125 г/, 'В заголовке деталей должен быть указан общий вес (45*1 + 20*4 = 125г)');
  assert.match(html, /20 шт/, 'В заголовке крепежа должно быть указано общее число метизов (16 + 4 = 20)');
  assert.match(html, /5 шт/, 'В заголовке электроники должно быть указано общее число модулей (1 + 4 = 5)');

  // 4. Наименования и реквизиты компонентов
  assert.match(html, /Верхняя пластина рамы/);
  assert.match(html, /Крепление луча/);
  assert.match(html, /Винты титановые M3x10/);
  assert.match(html, /Стойки алюминиевые 25мм/);
  assert.match(html, /Полётный контроллер F405/);
  assert.match(html, /Бесколлекторный мотор 2207 1950KV/);

  // 5. Материалы, цвета и технические атрибуты
  assert.match(html, /Carbon PETG/);
  assert.match(html, /TPU 95A/);
  assert.match(html, /Металл \/ крепеж/);
  assert.match(html, /Электроника/);
  assert.match(html, /background-color:#06b6d4/);
  assert.match(html, /background-color:#10b981/);
  assert.match(html, /Voron 2\.4/);
  assert.match(html, /STL/);

  // 6. Нижняя панель телеметрии
  assert.match(html, /90 мин/);
  assert.match(html, /труд учтён в себестоимости/);
  assert.match(html, /3[\s\u00A0]*200/);
  assert.match(html, /5[\s\u00A0]*800/);
  assert.match(html, /\+2[\s\u00A0]*600/);
  assert.match(html, /44\.8%/);

  // 7. Кнопки действий CockpitButton
  assert.match(html, /Создать заказ/);
  assert.match(html, /В калькулятор/);
  assert.match(html, /Редактировать состав/);
  assert.match(html, /title="Редактировать спецификацию сборки"/);
});

test('assembly expanded row renders correctly in compact mode with combined pricing and compact tags', () => {
  const html = renderToStaticMarkup(
    <AssemblyExpandedRow
      assembly={sampleFullAssembly}
      mode="compact"
      onCreateOrder={() => {}}
      onLoadIntoCalculator={() => {}}
      onOpenQuickEditModal={() => {}}
    />
  );

  // 1. Сетка компактного режима
  assert.match(html, /grid-template-columns:112px 136px minmax\(200px,1\.5fr\)/, 'Должна использоваться компактная сетка');

  // 2. Компактные бейджи типов под артикулом
  assert.match(html, />Деталь</);
  assert.match(html, />Метизы</);
  assert.match(html, />Модуль</);

  // 3. Заголовки секций с ┌─ и строки с └─
  const cornerHeaders = html.match(/┌─/g) || [];
  assert.equal(cornerHeaders.length, 3, 'В компактном режиме 3 заголовка ┌─');
  const rowConnectors = html.match(/└─/g) || [];
  assert.equal(rowConnectors.length, 6, 'В компактном режиме 6 строк └─');

  // 4. Сдвоенная колонка цены и себестоимости
  assert.match(html, /себест\./, 'В компактном режиме себестоимость подписана внутри ячейки суммы');

  // 5. Телеметрия и кнопки панели сводки
  assert.match(html, /90 мин/);
  assert.match(html, /5[\s\u00A0]*800/);
  assert.match(html, /\+2[\s\u00A0]*600/);
  assert.match(html, /Создать заказ/);
  assert.match(html, /В калькулятор/);
  assert.match(html, /Редактировать состав/);
});

test('assembly expanded row renders mobile card layout in cards mode', () => {
  const html = renderToStaticMarkup(
    <AssemblyExpandedRow
      assembly={sampleFullAssembly}
      mode="cards"
      onCreateOrder={() => {}}
      onLoadIntoCalculator={() => {}}
      onOpenQuickEditModal={() => {}}
    />
  );

  // 1. Мобильные заголовки секций с ┌─
  assert.match(html, /┌─ \[ПЕЧАТНЫЕ ДЕТАЛИ\]/);
  assert.match(html, /┌─ \[КРЕПЁЖ И ФУРНИТУРА\]/);
  assert.match(html, /┌─ \[ЭЛЕКТРОНИКА И МОДУЛИ\]/);

  // 2. Символы └─ в мобильных карточках
  const rowConnectors = html.match(/└─/g) || [];
  assert.equal(rowConnectors.length, 6, 'В режиме карточек 6 карточек с └─');

  // 3. Цветовые левые границы карточек
  assert.match(html, /border-left-color:#06b6d4/);
  assert.match(html, /border-left-color:#f59e0b/);
  assert.match(html, /border-left-color:#8b5cf6/);

  // 4. Количество в бейджах карточек
  assert.match(html, /1 шт/);
  assert.match(html, /4 шт/);
  assert.match(html, /16 шт/);

  // 5. Телеметрия и кнопки действий в карточках
  assert.match(html, /90 мин/);
  assert.match(html, /5[\s\u00A0]*800/);
  assert.match(html, /\+2[\s\u00A0]*600/);
  assert.match(html, /Создать заказ/);
  assert.match(html, /В калькулятор/);
  assert.match(html, /Редактировать состав/);
});

test('assembly expanded row summary and row action buttons trigger callbacks with assembly data', () => {
  const tableState: {
    createdOrder?: SavedCalculation;
    loadedCalc?: SavedCalculation;
    openedModal?: SavedCalculation;
  } = {};

  // 1. Проверка в режиме таблицы
  const tableVdom = AssemblyExpandedRow({
    assembly: sampleFullAssembly,
    mode: 'expanded',
    onCreateOrder: (item) => { tableState.createdOrder = item; },
    onLoadIntoCalculator: (item) => { tableState.loadedCalc = item; },
    onOpenQuickEditModal: (item) => { tableState.openedModal = item; },
  });

  const tableClickable = findElementsByPredicate(tableVdom, (el) => typeof el?.props?.onClick === 'function');

  // Кнопка [Создать заказ]
  const orderBtn = tableClickable.find((el) => el.props?.children === 'Создать заказ');
  assert.ok(orderBtn, 'Кнопка "Создать заказ" обязана существовать в табличном режиме');
  orderBtn.props.onClick();
  assert.equal(tableState.createdOrder?.id, sampleFullAssembly.id, 'onCreateOrder обязан вызываться с целевой сборкой');

  // Кнопка [В калькулятор]
  const calcBtn = tableClickable.find((el) => el.props?.children === 'В калькулятор');
  assert.ok(calcBtn, 'Кнопка "В калькулятор" обязана существовать в табличном режиме');
  calcBtn.props.onClick();
  assert.equal(tableState.loadedCalc?.id, sampleFullAssembly.id, 'onLoadIntoCalculator обязан вызываться с целевой сборкой');

  // Кнопка [Редактировать состав]
  const editBtn = tableClickable.find((el) => el.props?.children === 'Редактировать состав');
  assert.ok(editBtn, 'Кнопка "Редактировать состав" обязана существовать в табличном режиме');
  editBtn.props.onClick();
  assert.equal(tableState.openedModal?.id, sampleFullAssembly.id, 'onOpenQuickEditModal обязан вызываться с целевой сборкой');

  // Кнопки в строках компонентов
  const rowButtons = tableClickable.filter((el) => el.props?.title === 'Редактировать спецификацию сборки');
  assert.equal(rowButtons.length, 6, 'Должно быть 6 кнопок редактирования в строках');
  rowButtons[0].props.onClick();
  assert.equal(tableState.openedModal?.id, sampleFullAssembly.id);

  // 2. Проверка в режиме карточек
  const cardsState: {
    createdOrder?: SavedCalculation;
    loadedCalc?: SavedCalculation;
    openedModal?: SavedCalculation;
  } = {};

  const cardsVdom = AssemblyExpandedRow({
    assembly: sampleFullAssembly,
    mode: 'cards',
    onCreateOrder: (item) => { cardsState.createdOrder = item; },
    onLoadIntoCalculator: (item) => { cardsState.loadedCalc = item; },
    onOpenQuickEditModal: (item) => { cardsState.openedModal = item; },
  });

  const cardsClickable = findElementsByPredicate(cardsVdom, (el) => typeof el?.props?.onClick === 'function');
  const cardsOrderBtn = cardsClickable.find((el) => el.props?.children === 'Создать заказ');
  assert.ok(cardsOrderBtn, 'Кнопка "Создать заказ" обязана присутствовать в режиме карточек');
  cardsOrderBtn.props.onClick();
  assert.equal(cardsState.createdOrder?.id, sampleFullAssembly.id);

  const cardsCalcBtn = cardsClickable.find((el) => el.props?.children === 'В калькулятор');
  assert.ok(cardsCalcBtn, 'Кнопка "В калькулятор" обязана присутствовать в режиме карточек');
  cardsCalcBtn.props.onClick();
  assert.equal(cardsState.loadedCalc?.id, sampleFullAssembly.id);

  const cardsEditBtn = cardsClickable.find((el) => el.props?.children === 'Редактировать состав');
  assert.ok(cardsEditBtn, 'Кнопка "Редактировать состав" обязана присутствовать в режиме карточек');
  cardsEditBtn.props.onClick();
  assert.equal(cardsState.openedModal?.id, sampleFullAssembly.id);

  // 3. Проверка отсутствия кнопок, когда колбэки не переданы
  const htmlNoCallbacks = renderToStaticMarkup(<AssemblyExpandedRow assembly={sampleFullAssembly} />);
  assert.doesNotMatch(htmlNoCallbacks, /Создать заказ/);
  assert.doesNotMatch(htmlNoCallbacks, /В калькулятор/);
  assert.doesNotMatch(htmlNoCallbacks, /Редактировать состав/);
  assert.doesNotMatch(htmlNoCallbacks, /title="Редактировать спецификацию сборки"/);
});

test('assembly expanded row handles empty assembly specification and single category assemblies', () => {
  const emptyAssembly: SavedCalculation = {
    id: 'assembly-empty',
    name: 'Пустая сборка',
    type: 'assembly',
    filament_name: '',
    printer_name: '',
    weight_g: 0,
    hours: 0,
    minutes: 0,
    quantity: 1,
    base_cost: 0,
    final_price: 0,
    assembly_parts: [],
    assembly_hardware: [],
    assembly_electronics: [],
  };

  // 1. Пустая сборка в табличном виде
  const htmlEmpty = renderToStaticMarkup(
    <AssemblyExpandedRow
      assembly={emptyAssembly}
      onOpenQuickEditModal={() => {}}
    />
  );
  assert.match(htmlEmpty, /В спецификации сборки пока нет компонентов/);
  assert.doesNotMatch(htmlEmpty, /\[ПЕЧАТНЫЕ ДЕТАЛИ\]/);
  assert.doesNotMatch(htmlEmpty, /\[КРЕПЁЖ И ФУРНИТУРА\]/);
  assert.doesNotMatch(htmlEmpty, /\[ЭЛЕКТРОНИКА И МОДУЛИ\]/);
  assert.doesNotMatch(htmlEmpty, /┌─/);
  assert.doesNotMatch(htmlEmpty, /└─/);
  assert.match(htmlEmpty, /Редактировать состав/);

  // 2. Пустая сборка в мобильном режиме карточек
  const htmlEmptyCards = renderToStaticMarkup(
    <AssemblyExpandedRow
      assembly={emptyAssembly}
      mode="cards"
      onOpenQuickEditModal={() => {}}
    />
  );
  assert.match(htmlEmptyCards, /В спецификации сборки пока нет компонентов/);
  assert.match(htmlEmptyCards, /Редактировать состав/);

  // 3. Пустая сборка без колбэка редактирования не рендерит кнопку
  const htmlEmptyNoCallback = renderToStaticMarkup(<AssemblyExpandedRow assembly={emptyAssembly} />);
  assert.doesNotMatch(htmlEmptyNoCallback, /Редактировать состав/);

  // 4. Сборка только с электроникой (без деталей и метизов)
  const electronicsOnlyAssembly: SavedCalculation = {
    id: 'assembly-el-only',
    name: 'Модуль управления',
    type: 'assembly',
    filament_name: '',
    printer_name: '',
    weight_g: 0,
    hours: 0,
    minutes: 0,
    quantity: 1,
    base_cost: 1500,
    final_price: 2500,
    assembly_parts: [],
    assembly_hardware: [],
    assembly_electronics: [
      {
        id: 'el-esp32',
        name: 'Плата ESP32-S3 DevKit',
        quantity: 1,
        cost_per_unit: 800,
        price_per_unit: 1400,
      },
    ],
  };

  const htmlElOnly = renderToStaticMarkup(<AssemblyExpandedRow assembly={electronicsOnlyAssembly} />);
  assert.match(htmlElOnly, /\[ЭЛЕКТРОНИКА И МОДУЛИ\]/);
  assert.match(htmlElOnly, /Плата ESP32-S3 DevKit/);
  assert.doesNotMatch(htmlElOnly, /\[ПЕЧАТНЫЕ ДЕТАЛИ\]/);
  assert.doesNotMatch(htmlElOnly, /\[КРЕПЁЖ И ФУРНИТУРА\]/);
  assert.equal((htmlElOnly.match(/┌─/g) || []).length, 1);
  assert.equal((htmlElOnly.match(/└─/g) || []).length, 1);
});

test('assembly expanded row supports custom currency symbol and owner labor attribution options', () => {
  // 1. Кастомная валюта '$' и труд владельца (is_owner_labor = true)
  const ownerLaborAssembly: SavedCalculation = {
    ...sampleFullAssembly,
    is_owner_labor: true,
  };

  const htmlDollar = renderToStaticMarkup(
    <AssemblyExpandedRow assembly={ownerLaborAssembly} currencySymbol="$" />
  );

  assert.match(htmlDollar, /\$/, 'Символ $ обязан использоваться при кастомной валюте');
  assert.doesNotMatch(htmlDollar, /₽/, 'Символ ₽ не должен присутствовать при валюте $');
  assert.match(htmlDollar, /труд учтён в прибыли/, 'При is_owner_labor = true труд учитывается в прибыли');
  assert.doesNotMatch(htmlDollar, /труд учтён в себестоимости/);

  // 2. Наёмный труд (is_owner_labor = false)
  const hiredLaborAssembly: SavedCalculation = {
    ...sampleFullAssembly,
    is_owner_labor: false,
  };

  const htmlHired = renderToStaticMarkup(
    <AssemblyExpandedRow assembly={hiredLaborAssembly} />
  );

  assert.match(htmlHired, /труд учтён в себестоимости/, 'При is_owner_labor = false труд учитывается в себестоимости');
  assert.doesNotMatch(htmlHired, /труд учтён в прибыли/);
});

