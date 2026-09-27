# Переработка сборок в стиле коллекций с поддержкой электроники: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Унифицировать отображение сборных изделий в каталоге товаров (`ProductsV2Table`) с поведением коллекций (вложенные строки идеально согласованы с колонками таблицы), добавить древовидное разделение состава на «Печатные детали», «Крепёж и фурнитуру» и «Электронику», а также поддержать управление электроникой в модальном окне сборки и формулах.

**Architecture:** 
1. Расширение типов `AssemblyElectronicsItem` и расчетных формул сметы сборки и драфта заказов.
2. Обновление `supabase_schema.sql` (колонка `assembly_electronics jsonb`) с мгновенным `localStorage` fallback.
3. Добавление управления электроникой в `AssemblyModal.tsx` (вкладка электроники, карточки, степперы, себестоимость и цена).
4. Переработка `AssemblyExpandedRow.tsx` и `ProductsV2Table.tsx`: рендеринг раскрытой сборки в виде согласованных строк таблицы (`PRODUCTS_EXPANDED_COLUMNS` и `PRODUCTS_COMPACT_COLUMNS`) с заголовками секций `┌─`, строками `└─` и подвалом телеметрии/действий. Поддержка мобильных карточек.

**Tech Stack:** Next.js, React 19, TypeScript, Tailwind CSS v4, Motion (`motion/react`), Lucide React, Supabase.

**Spec:** [`docs/superpowers/specs/2026-09-09-assemblies-redesign-design.md`](file:///g:/3d/3D%20Labs/docs/superpowers/specs/2026-09-09-assemblies-redesign-design.md)

## Global Constraints
- Не устанавливать сторонние npm-пакеты без предварительного разрешения пользователя.
- Все анимации раскрытия и переходов — строго через библиотеку `motion` (`motion/react`).
- Дизайн-система — Meridian Cockpit Console (`DESIGN_SYSTEM.md`): моноширинные числа `tabular-nums`, скобочные кнопки `<CockpitButton>`, темная палитра `bg-neutral-950/90`.
- Никаких фиктивных заглушек (TODO, TBD).

---

### Task 1: TypeScript типы и движок формул (расчет электроники)

**Files:**
- Modify: `src/shared/types/index.ts:40-60`
- Modify: `src/shared/lib/formulas.ts:420-490`
- Modify: `src/widgets/ProductsList/helpers.ts:14-25,108-150`
- Test: `tests/assembly-totals.test.ts`

**Interfaces:**
- Consumes: `SavedCalculation`, `AssemblyPrintedPart`, `AssemblyHardwareItem`
- Produces: `AssemblyElectronicsItem`, обновленный `calculateAssemblyTotals(parts, hardware, assemblyLaborMinutes, laborRate, isOwnerLabor, electronics)` и `prepareDraftOrderFromProduct(item)`

- [ ] **Step 1: Написать failing test на расчет сборки с электроникой**

Создать `tests/assembly-totals.test.ts`:
```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAssemblyTotals } from '../src/shared/lib/formulas';
import { AssemblyPrintedPart, AssemblyHardwareItem, AssemblyElectronicsItem } from '../src/shared/types';

describe('calculateAssemblyTotals with electronics', () => {
  it('correctly sums electronics base cost and final price into grand totals', () => {
    const parts: AssemblyPrintedPart[] = [
      {
        name: 'Корпус',
        weight_g: 100,
        hours: 2,
        minutes: 0,
        quantity: 1,
        base_cost: 200,
        final_price: 500,
      },
    ];
    const hardware: AssemblyHardwareItem[] = [
      {
        id: 'hw-1',
        name: 'Винт M3',
        quantity: 4,
        cost_per_unit: 5,
        price_per_unit: 10,
      },
    ];
    const electronics: AssemblyElectronicsItem[] = [
      {
        id: 'el-1',
        name: 'Сервопривод SG90',
        quantity: 2,
        cost_per_unit: 150,
        price_per_unit: 300,
      },
    ];

    const result = calculateAssemblyTotals(parts, hardware, 30, 600, false, electronics);

    // partsBaseCost: 200, hwBaseCost: 20 (4*5), electronicsBaseCost: 300 (2*150), laborCost: 300 (0.5 * 600)
    assert.equal(result.partsBaseCost, 200);
    assert.equal(result.hwBaseCost, 20);
    assert.equal(result.electronicsBaseCost, 300);
    assert.equal(result.totalElectronicsPieces, 2);
    assert.equal(result.grandBaseCost, 200 + 20 + 300 + 300); // 820

    // partsFinalPrice: 500, hwFinalPrice: 40 (4*10), electronicsFinalPrice: 600 (2*300), labor: 300
    assert.equal(result.electronicsFinalPrice, 600);
    assert.equal(result.grandFinalPrice, 500 + 40 + 600 + 300); // 1440
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться в ошибке (FAIL)**

Run: `node --test tests/assembly-totals.test.ts`
Expected: FAIL из-за отсутствия типа `AssemblyElectronicsItem` или поля `electronicsBaseCost`.

- [ ] **Step 3: Реализовать типы и расширение `calculateAssemblyTotals` и `prepareDraftOrderFromProduct`**

В `src/shared/types/index.ts`:
```ts
export interface AssemblyElectronicsItem {
  id: string;
  name: string;
  quantity: number;
  cost_per_unit: number;
  price_per_unit: number;
}
```
В `SavedCalculation`:
```ts
assembly_electronics?: AssemblyElectronicsItem[];
```

В `src/shared/lib/formulas.ts`:
Добавить в `AssemblyTotalsResult`:
```ts
electronicsBaseCost: number;
electronicsFinalPrice: number;
totalElectronicsPieces: number;
```
Обновить `calculateAssemblyTotals`:
```ts
export function calculateAssemblyTotals(
  parts: AssemblyPrintedPart[],
  hardware: AssemblyHardwareItem[],
  assemblyLaborMinutes: number | string,
  laborRate: number = 600,
  isOwnerLabor: boolean = false,
  electronics: AssemblyElectronicsItem[] = []
): AssemblyTotalsResult {
  // ...
  let electronicsBaseCost = 0;
  let electronicsFinalPrice = 0;
  let totalElectronicsPieces = 0;

  electronics.forEach((el) => {
    const qty = el.quantity || 1;
    totalElectronicsPieces += qty;
    electronicsBaseCost += (el.cost_per_unit || 0) * qty;
    electronicsFinalPrice += (el.price_per_unit || 0) * qty;
  });

  const grandBaseCost = round2(partsBaseCost + hwBaseCost + electronicsBaseCost + effectiveLaborBaseCost);
  const grandFinalPrice = round2(partsFinalPrice + hwFinalPrice + electronicsFinalPrice + (isOwnerLabor ? 0 : laborCost));
  // ...
```

В `src/widgets/ProductsList/helpers.ts`:
Пробросить `electronics` в `calcAssemblyTotals`.
В `prepareDraftOrderFromProduct(item)`:
Добавить учет `assembly_electronics` в смету заказа:
```ts
const electronics = item.assembly_electronics || [];
const elCost = electronics.reduce((acc, el) => acc + (el.cost_per_unit || 0) * (el.quantity || 1), 0);
const elPrice = electronics.reduce((acc, el) => acc + (el.price_per_unit || 0) * (el.quantity || 1), 0);
// прибавить к unitCost и unitAmount
if (elCost > 0) {
  cost_items.push({
    category: 'Электроника и компоненты',
    amount: Math.round(elCost * orderQty * 100) / 100,
    note: `${electronics.length} поз. электроники`,
  });
}
```

- [ ] **Step 4: Запустить тест и убедиться в прохождении (PASS)**

Run: `node --test tests/assembly-totals.test.ts`
Expected: PASS.

- [ ] **Step 5: Закоммитить изменения**

```bash
git add src/shared/types/index.ts src/shared/lib/formulas.ts src/widgets/ProductsList/helpers.ts tests/assembly-totals.test.ts
git commit -m "feat(assembly): add electronics types and calculation formulas"
```

---

### Task 2: Обновление схемы Supabase и поддержка локального хранилища

**Files:**
- Modify: `supabase_schema.sql:110-130`
- Modify: `src/shared/api/db.ts` (при необходимости для безопасного маппинга)

- [ ] **Step 1: Обновить `supabase_schema.sql`**

Добавить колонку `assembly_electronics jsonb` в таблицу `saved_calculations`:
```sql
create table if not exists public.saved_calculations (
  -- ...
  assembly_parts jsonb,
  assembly_hardware jsonb,
  assembly_electronics jsonb,
  assembly_labor_minutes integer,
  -- ...
);
```

- [ ] **Step 2: Проверить работу localStorage fallback**

Убедиться, что `db.ts` при операциях с `SAVED_CALCULATIONS` сохраняет и читает объект `SavedCalculation` целиком, включая `assembly_electronics`.

- [ ] **Step 3: Закоммитить изменения**

```bash
git add supabase_schema.sql
git commit -m "chore(schema): add assembly_electronics column to saved_calculations"
```

---

### Task 3: Добавление управления электроникой в `AssemblyModal`

**Files:**
- Modify: `src/widgets/ProductsList/components/modals/AssemblyModal.tsx`

**Interfaces:**
- Consumes: `AssemblyModalProps`, `AssemblyElectronicsItem`, `calcAssemblyTotals`
- Produces: обновленная форма с сохранением `assembly_electronics`

- [ ] **Step 1: Добавить состояние для электроники**

В `AssemblyModal.tsx`:
```ts
const [electronics, setElectronics] = useState<AssemblyElectronicsItem[]>([]);
```
В блоке сброса/инициализации (`previousSource`):
```ts
setElectronics(editingAssembly?.assembly_electronics ? [...editingAssembly.assembly_electronics] : []);
```

- [ ] **Step 2: Реализовать переключение разделов и UI добавления электроники**

Добавить табы: `Печатные детали`, `Крепеж и фурнитура`, `Электроника`.
В секции электроники:
* Кнопка добавления:
```ts
const handleAddElectronics = () => {
  nextLocalIdRef.current += 1;
  const newEl: AssemblyElectronicsItem = {
    id: `${localIdPrefix}-electronics-${nextLocalIdRef.current}`,
    name: 'Электронный компонент',
    quantity: 1,
    cost_per_unit: 100,
    price_per_unit: 200,
  };
  setElectronics((prev) => [...prev, newEl]);
};
```
* Карточки компонентов: редактирование названия, количества (+/-), себестоимости и цены продажи за штуку, кнопка удаления.

- [ ] **Step 3: Обновить расчет и сохранение**

Передать `electronics` в `calcAssemblyTotals`:
```ts
const totals = calcAssemblyTotals(parts, hardware, laborMinutes, laborRate, isOwnerLabor, electronics);
```
В `handleSubmit`:
```ts
const assemblyData: Partial<SavedCalculation> = {
  // ...
  assembly_parts: parts,
  assembly_hardware: hardware,
  assembly_electronics: electronics,
  // ...
};
```

- [ ] **Step 4: Проверить сборку TypeScript и тесты**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Закоммитить изменения**

```bash
git add src/widgets/ProductsList/components/modals/AssemblyModal.tsx
git commit -m "feat(assembly-modal): add electronics components tab and management"
```

---

### Task 4: Переработка отображения раскрытых сборок (`AssemblyExpandedRow.tsx` и `ProductsV2Table.tsx`)

**Files:**
- Modify: `src/widgets/ProductsList/components/v2/AssemblyExpandedRow.tsx`
- Modify: `src/widgets/ProductsList/components/v2/ProductsV2Table.tsx`

**Interfaces:**
- Consumes: `assembly: SavedCalculation`, `currencySymbol`, действия `onCreateOrder`, `onLoadIntoCalculator`, `onOpenQuickEditModal`
- Produces: согласованное отображение строк сборки в сетке таблицы (`PRODUCTS_EXPANDED_COLUMNS`, `PRODUCTS_COMPACT_COLUMNS`, карточки)

- [ ] **Step 1: Создать переиспользуемый компонент строк состава сборки**

В `AssemblyExpandedRow.tsx`:
Реализовать отображение с учетом колонок таблицы:
* Принимать `mode: 'expanded' | 'compact' | 'cards'`.
* **Заголовки секций:**
  * `┌─ [ПЕЧАТНЫЕ ДЕТАЛИ] · {parts.length} дет. · {totalWeight} г`
  * `┌─ [КРЕПЁЖ И ФУРНИТУРА] · {hardware.length} поз. · {totalHwPieces} шт`
  * `┌─ [ЭЛЕКТРОНИКА И МОДУЛИ] · {electronics.length} поз. · {totalElPieces} шт`
* **Строки компонентов:**
  * Для печатных деталей: Артикул `#PRT-{index}`, Тип `Печать`, Категория, Название, Пластик с цветной точкой, Вес/Время, Количество (`{qty} шт`), Себестоимость, Наценка, Цена, Прибыль, Маржа.
  * Для крепежа: Артикул `#HW-{index}`, Тип `Метизы`, Категория `Фурнитура`, Название, `Металл / крепеж`, прочерк в весе/времени, Количество, Себестоимость, Наценка, Цена, Прибыль, Маржа.
  * Для электроники: Артикул `#ELC-{index}`, Тип `Модуль`, Категория `Электроника`, Название, `Электроника`, прочерк в весе/времени, Количество, Себестоимость, Наценка, Цена, Прибыль, Маржа.
* Древовидный префикс `└─` с подсветкой сборки в цвет темы (cyan/teal).
* **Нижняя панель сводки:**
  * Кнопки `CockpitButton`: `[Создать заказ]`, `[В калькулятор]`, `[Редактировать состав]`.
  * Данные телеметрии: Труд мастера, Общая себестоимость, Итоговая цена, Прибыль и маржа.
* Все анимации раскрытия — через `motion/react`.

- [ ] **Step 2: Встроить компонент в `ProductsV2Table.tsx` во все 3 режима**

1. В подробном режиме (13 колонок): передать `mode="expanded"`.
2. В компактном режиме (9 колонок): передать `mode="compact"`.
3. В мобильном режиме (карточки): передать `mode="cards"`.

- [ ] **Step 3: Проверить TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Закоммитить изменения**

```bash
git add src/widgets/ProductsList/components/v2/AssemblyExpandedRow.tsx src/widgets/ProductsList/components/v2/ProductsV2Table.tsx
git commit -m "feat(products-table): redesign assembly expanded rows to match collections grid with categories"
```

---

### Task 5: Комплексное тестирование и валидация

**Files:**
- Modify: `tests/products-v2.test.tsx` (добавить тесты на рендеринг раскрытой сборки с электроникой)

- [ ] **Step 1: Написать интеграционный тест на отображение сборки**

В `tests/products-v2.test.tsx`:
Проверить, что при раскрытии сборки:
* Отображаются заголовки секций `ПЕЧАТНЫЕ ДЕТАЛИ`, `КРЕПЁЖ И ФУРНИТУРА`, `ЭЛЕКТРОНИКА И МОДУЛИ`.
* Рендерятся строки деталей, крепежа и электроники.
* Отображается нижняя панель сводки с кнопками действий.

- [ ] **Step 2: Запустить полный набор тестов `npm test`**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Закоммитить тесты**

```bash
git add tests/products-v2.test.tsx
git commit -m "test: add tests for assembly expanded rows and electronics rendering"
```

---

### Task 6: Финальная проверка Playwright E2E и скриншоты

**Files:**
- Verification: браузерная проверка через Playwright E2E.

- [ ] **Step 1: Запустить E2E тесты**

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 2: Зафиксировать статус и предоставить отчет пользователю**
