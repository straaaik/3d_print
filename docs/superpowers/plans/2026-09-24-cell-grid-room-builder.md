# Интерактивный конструктор комнат по клеточкам (Cell-Grid Room Builder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать режим создания комнат по клеточкам: при нажатии кнопки «+ Добавить комнату» в верхней панели весь фон переходит в интерактивную сетку $1 \times 1$ метр, позволяя кликать/зажимать мышь для добавления 3D-плиток пола и стирания ластиком, с автоматическим возведением модульных стен по внешнему периметру любой формы.

**Architecture:** 
1. В модели данных комната расширяется массивом плиток `tiles?: Array<[number, number]>` с функциями расчёта внешнего периметра `roomPerimeterEdges` и генерации комнаты `createRoomFromTiles`.
2. В 3D-движке сцена получает режим глобальной сетки $1\text{м}$ и превью плиток в реальном времени, а рендерер комнат строит пол и стены строго по клеточкам периметра.
3. В интерфейсе появляется кнопка в Topbar и плавающий Cockpit HUD управления («Пол», «Ластик», счётчик м², «Создать комнату», «Отмена»).

**Tech Stack:** Next.js 16 (Turbopack), React 19, Three.js, TypeScript, Tailwind CSS, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-09-24-cell-grid-room-builder-design.md`

## Global Constraints
- Работать строго в ветке `test`. Никогда не трогать `main`.
- Не устанавливать новые npm-пакеты.
- `npm run test:e2e` во время разработки запрещён, только быстрый `npm test`.
- Полная обратная совместимость со схемой Supabase (данные `tiles` упаковываются в `spatial_metadata`).

---

### Task 1: Модель данных и алгоритм периметра стен

**Files:**
- Modify: `src/features/workshop/model.ts`
- Test: `tests/workshop.test.ts`

**Interfaces:**
- Produces:
  - `Room.tiles?: Array<[number, number]>`
  - `roomPerimeterEdges(tiles: Array<[number, number]>): Array<{ x: number; z: number; side: 'north' | 'east' | 'south' | 'west' }>`
  - `createRoomFromTiles(state: Workshop, tiles: Array<[number, number]>, name?: string): Workshop`

- [ ] **Step 1: Написать падающий юнит-тест на `roomPerimeterEdges` и `createRoomFromTiles`**

В файле `tests/workshop.test.ts` добавить тест:
```typescript
test('roomPerimeterEdges identifies correct exterior walls for L-shaped room', () => {
  // L-shaped tiles: (0,0), (1,0), (0,1)
  const tiles: Array<[number, number]> = [[0, 0], [1, 0], [0, 1]];
  const edges = spatial.roomPerimeterEdges(tiles);
  
  // (0,0) has no neighbor north (0,-1) and west (-1,0) -> 2 edges
  // (1,0) has no neighbor north (1,-1), east (2,0), south (1,1) -> 3 edges
  // (0,1) has no neighbor south (0,2), east (1,1), west (-1,1) -> 3 edges
  // Total edges = 8
  assert.equal(edges.length, 8);
  assert.ok(edges.some(e => e.x === 0 && e.z === 0 && e.side === 'north'));
  assert.ok(edges.some(e => e.x === 0 && e.z === 0 && e.side === 'west'));
  assert.ok(edges.some(e => e.x === 1 && e.z === 0 && e.side === 'east'));
  assert.ok(edges.some(e => e.x === 0 && e.z === 1 && e.side === 'south'));
});

test('createRoomFromTiles creates a valid attached room with custom tiles', () => {
  const state = emptySpatial(); // room root at (0, 0) width 10, depth 8 (bounds x: [-5, 5], z: [-4, 4])
  // Create tiles directly on east side: x = 5..8, z = 0..2
  const tiles: Array<[number, number]> = [
    [5, 0], [6, 0], [7, 0],
    [5, 1], [6, 1], [7, 1],
  ];
  const next = spatial.createRoomFromTiles(state, tiles, 'Новый цех');
  assert.equal(next.rooms.length, 2);
  const newRoom = next.rooms[1];
  assert.equal(newRoom.name, 'Новый цех');
  assert.equal(newRoom.width, 3);
  assert.equal(newRoom.depth, 2);
  assert.equal(newRoom.attachment?.side, 'east');
  assert.deepEqual(newRoom.tiles, tiles);
});
```

- [ ] **Step 2: Запустить тест и убедиться в падении**

Команда: `npm test`  
Ожидается: ошибка компиляции/отсутствия функций `roomPerimeterEdges` и `createRoomFromTiles`.

- [ ] **Step 3: Реализовать алгоритм в `src/features/workshop/model.ts`**

1. Добавить `tiles?: Array<[number, number]>;` в интерфейс `Room`.
2. Реализовать `roomPerimeterEdges`:
```typescript
export interface PerimeterEdge {
  x: number;
  z: number;
  side: RoomSide;
}

export function roomPerimeterEdges(tiles: Array<[number, number]>): PerimeterEdge[] {
  const set = new Set(tiles.map(([x, z]) => `${x}:${z}`));
  const edges: PerimeterEdge[] = [];

  for (const [x, z] of tiles) {
    if (!set.has(`${x}:${z - 1}`)) edges.push({ x, z, side: 'north' });
    if (!set.has(`${x}:${z + 1}`)) edges.push({ x, z, side: 'south' });
    if (!set.has(`${x + 1}:${z}`)) edges.push({ x, z, side: 'east' });
    if (!set.has(`${x - 1}:${z}`)) edges.push({ x, z, side: 'west' });
  }

  return edges;
}
```
3. Реализовать `createRoomFromTiles`:
```typescript
export function createRoomFromTiles(
  state: Workshop,
  tiles: Array<[number, number]>,
  name?: string
): Workshop {
  if (!tiles || tiles.length === 0) throw new Error('Выберите хотя бы одну клетку для пола комнаты.');
  
  const xs = tiles.map(t => t[0]);
  const zs = tiles.map(t => t[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs) + 1;
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs) + 1;
  const width = Math.max(2, maxX - minX);
  const depth = Math.max(2, maxZ - minZ);

  // Находим смежную родительскую комнату
  let parentRoom = state.rooms[0];
  let parentSide: RoomSide = 'east';
  let bestDist = Infinity;

  for (const room of state.rooms) {
    const o = roomOrigin(state, room.id);
    const halfW = room.width / 2;
    const halfD = room.depth / 2;
    
    // Проверяем 4 стороны
    const distEast = Math.abs(minX - (o.x + halfW));
    if (distEast < bestDist) { bestDist = distEast; parentRoom = room; parentSide = 'east'; }
    const distWest = Math.abs(maxX - (o.x - halfW));
    if (distWest < bestDist) { bestDist = distWest; parentRoom = room; parentSide = 'west'; }
    const distSouth = Math.abs(minZ - (o.z + halfD));
    if (distSouth < bestDist) { bestDist = distSouth; parentRoom = room; parentSide = 'south'; }
    const distNorth = Math.abs(maxZ - (o.z - halfD));
    if (distNorth < bestDist) { bestDist = distNorth; parentRoom = room; parentSide = 'north'; }
  }

  const room: Room = {
    id: uid(),
    name: name?.trim() || `Комната ${state.rooms.length + 1}`,
    width,
    depth,
    attachment: { roomId: parentRoom.id, side: parentSide },
    tiles,
    labels: [],
  };

  const next = { ...state, rooms: [...state.rooms, room] };
  return next;
}
```
4. Обновить валидатор `parseWorkshop`, чтобы `tiles` сохранялись и проверялись:
```typescript
if (r.tiles && (!Array.isArray(r.tiles) || r.tiles.some(t => !Array.isArray(t) || t.length !== 2 || !t.every(Number.isFinite)))) return null;
```

- [ ] **Step 4: Запустить юнит-тесты и проверить прохождение**

Команда: `npm test`  
Ожидается: 211+ тестов проходят успешно.

---

### Task 2: 3D-рендеринг пола и внешних стен по клеточкам

**Files:**
- Modify: `src/features/workshop/referenceSceneParts.ts`
- Modify: `src/features/workshop/spatialScene.ts`

**Interfaces:**
- Consumes: `Room.tiles`, `roomPerimeterEdges`
- Produces: 3D-модели пола и стен, точно повторяющие форму клеточек комнаты.

- [ ] **Step 1: Обновить `referenceSceneParts.ts` для поддержки модульного пола `room.tiles`**

В методе `room(parent: THREE.Group, room: Room, openSides: Set<string> = new Set())`:
- Если `room.tiles && room.tiles.length > 0`:
  - Рассчитываем смещение плиток относительно локального центра комнаты `(o.x, o.z)`.
  - Для каждой плитки строим цоколь subfloor `[1.0, 0.34, 1.0]` и верхнюю плитку `[1.0, 0.026, 1.0]` со случайным оттенком фабричного бетона.
  - По вычисленным `roomPerimeterEdges(room.tiles)` возводим стеновые панели `Panel_Back_Core / Panel_Left_Core`, плинтусы и угловые пилоны.
- Если `room.tiles` нет:
  - Выполняется существующая прямоугольная генерация пола и стен.

- [ ] **Step 2: Запустить `npx tsc --noEmit` и `npm test`**

Команда: `npx tsc --noEmit && npm test`  
Ожидается: 0 ошибок типизации, все тесты зеленые.

---

### Task 3: 3D-интерактивность режима конструктора (`SpatialAuthoring`)

**Files:**
- Modify: `src/features/workshop/spatialAuthoring.ts`
- Modify: `src/features/workshop/WorkshopScene.ts`

**Interfaces:**
- Produces:
  - `startGridRoomBuilder(tool?: 'brush' | 'eraser'): void`
  - `setGridRoomBuilderTool(tool: 'brush' | 'eraser'): void`
  - `finishGridRoomBuilder(): Array<[number, number]> | null`
  - `cancelGridRoomBuilder(): void`
  - Колбэк `onDraftTilesChange?: (count: number) => void`

- [ ] **Step 1: Добавить в `SpatialAuthoring` плоскость глобальной сетки и драфт плиток**

1. Сетка $60 \times 60$ м:
   `gridPlane`: `THREE.GridHelper(60, 60, '#38bdf8', '#1e293b')` на `y = 0.001`.
2. Подсвечивающийся курсор-квадрат:
   `cellHoverMesh`: `THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)`.
3. Набор драфт-плиток `draftTiles = new Map<string, THREE.Mesh>()`.
4. Обработка клика и движения с зажатой кнопкой:
   - При зажатой ЛКМ: в режиме `brush` добавлять клетку `[gx, gz]`, создавать 3D-плитку пола в сцене.
   - В режиме `eraser`: удалять клетку `[gx, gz]`, удалять 3D-плитку пола из сцены.
   - Вызывать `onDraftTilesChange(draftTiles.size)`.

- [ ] **Step 2: Экспортировать методы управления в `WorkshopScene.ts`**

Пробросить методы активации/инструментов/завершения/отмены из `authoring` в `WorkshopScene`.

- [ ] **Step 3: Проверить типизацию**

Команда: `npx tsc --noEmit`  
Ожидается: 0 ошибок.

---

### Task 4: UI Topbar кнопка и плавающий Cockpit HUD

**Files:**
- Modify: `src/features/workshop/WorkshopCanvas.tsx`
- Modify: `src/features/workshop/WorkshopPage.tsx`

**Interfaces:**
- Produces:
  - Кнопка «+ Добавить комнату» в Topbar редактора.
  - Плавающий Cockpit HUD снизу:
    - Инструмент «Пол» / «Ластик».
    - Индикатор площади `Выбрано: N м²`.
    - Кнопки «Создать комнату» и «Отмена».

- [ ] **Step 1: Добавить кнопку «+ Добавить комнату» в `WorkshopCanvas.tsx`**

В секцию кнопок Topbar (`edit` режим):
```tsx
<button
  type="button"
  onClick={handleToggleGridBuilder}
  className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
>
  <Plus className="w-3.5 h-3.5" />
  Добавить комнату
</button>
```

- [ ] **Step 2: Создать плавающий Cockpit HUD для режима конструктора**

При `gridBuilderActive === true`:
Рендерить плавающий пульт по центру экрана снизу:
- Кнопка `[ ✏ Пол ]` (активна по умолчанию, подсветка голубым).
- Кнопка `[ ⌫ Ластик ]` (подсветка оранжевым/красным).
- Текст: `Выбрано: {tileCount} м² ({tileCount} плиток)`.
- Кнопка `[ ✓ Создать комнату ]` (дизейблится если `tileCount === 0`, отправляет вызов `onCreateRoomFromTiles`).
- Кнопка `[ ✕ Отмена ]` (сбрасывает конструктор).

- [ ] **Step 3: Реализовать обработчик в `WorkshopPage.tsx`**

```tsx
function handleCreateRoomFromTiles(tiles: Array<[number, number]>) {
  attempt(() => {
    const next = createRoomFromTiles(layout!, tiles);
    commit(next);
    switchRoom(next.rooms.at(-1)!.id);
    setMessage(`Комната «${next.rooms.at(-1)!.name}» успешно создана (${tiles.length} м²).`);
  });
}
```

- [ ] **Step 4: Проверить типизацию и сборку**

Команда: `npx tsc --noEmit && npm run build`  
Ожидается: успешная компиляция без ошибок.

---

### Task 5: Финальная верификация и тестирование

**Files:**
- Test: `tests/workshop.test.ts`
- Shell commands: `npx tsc --noEmit`, `npm test`, `npm run build`

- [ ] **Step 1: Запустить быстрый `npm test`**

Команда: `npm test`  
Ожидается: 211+ тестов проходят, 0 упавших.

- [ ] **Step 2: Запустить полный `npm run build`**

Команда: `npm run build`  
Ожидается: успешная генерация всех 19 маршрутов.
