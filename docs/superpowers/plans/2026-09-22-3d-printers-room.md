# 3D Printers Room (Diorama View) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive 3D diorama room for the 3D printer fleet in `/printers`, featuring a fixed isometric camera, procedural CoreXY 3D printers, dynamic colored mats, hover levitation, and click-to-focus zoom with a detail drawer.

**Architecture:** Encapsulated Three.js scene (`PrinterRoomScene`) rendered within a React client component loaded dynamically (`next/dynamic` with `ssr: false`). Procedural geometry generation creates the diorama room, modular tables, colored mats, and CoreXY printers without external 3D asset downloads. Raycasting powers hover elevation and click selection, accompanied by a 2D `motion` UI overlay and detail drawer.

**Tech Stack:** Next.js 16 (App Router), React 19, Three.js, Motion (`motion/react`), Tailwind CSS v4, TypeScript.

**Spec:** [docs/superpowers/specs/2026-09-22-3d-printers-room-design.md](../../superpowers/specs/2026-09-22-3d-printers-room-design.md)

## Global Constraints

- **Dependency installation:** User has explicitly approved `three` and `@types/three`.
- **Bundle isolation:** The 3D scene must be dynamically imported via `next/dynamic({ ssr: false })` to avoid affecting initial page load.
- **Fixed camera constraint:** The camera angle must remain fixed at a classic isometric angle (45° angle looking down into the diorama) without free OrbitControls rotation.
- **Hover elevation:** Hovering over a printer elevates its mesh group smoothly along the Y axis (~0.18-0.22 units) with an expanding soft contact shadow.
- **Dynamic mat color:** The silicone mat under each printer must strictly use `printer.color` (with fallback `#0CB4E0`).
- **Focus zoom:** Clicking a printer dollies the camera closer to the selected printer and opens the detail drawer.
- **Tests:** Must keep `npm test` 100% green without regressions.

---

### Task 1: Install Dependencies (`three` and `@types/three`)

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: User approval for `three` and `@types/three`.
- Produces: Installed and typed `three` library in `node_modules`.

- [ ] **Step 1: Install packages**
  Run: `npm install three && npm install -D @types/three`

- [ ] **Step 2: Verify compilation and tests**
  Run: `npm test`
  Expected: PASS all 173 tests.

- [ ] **Step 3: Commit**
  Run: `git add package.json package-lock.json; git commit -m "chore: install three and @types/three for 3d diorama room"`

---

### Task 2: Mathematical Layout & Placement Utilities

**Files:**
- Create: `src/features/printers-room/scene/layout.ts`
- Create: `tests/printers-room-layout.test.ts`
- Modify: `scripts/test.mjs:7-38` (register `tests/printers-room-layout.test.ts`)

**Interfaces:**
- Consumes: `Printer[]`
- Produces:
  ```ts
  export interface StationPosition {
    index: number;
    printerId: string;
    position: [number, number, number]; // [x, y, z]
    rotationY: number;
  }
  export interface RoomLayoutConfig {
    roomSize: [number, number, number]; // [width, height, depth]
    stations: StationPosition[];
    overviewCameraPosition: [number, number, number];
    overviewCameraTarget: [number, number, number];
  }
  export function calculateRoomLayout(printers: Array<{ id: string }>): RoomLayoutConfig;
  export function getFocusCameraTarget(stationPos: [number, number, number]): {
    position: [number, number, number];
    target: [number, number, number];
  };
  ```

- [ ] **Step 1: Write the failing unit test**
  Create `tests/printers-room-layout.test.ts` checking layout calculation for 0, 1, 4, and 8 printers, station separation, and focus target coordinates.

- [ ] **Step 2: Register test in `scripts/test.mjs` and run**
  Run: `npm test`
  Expected: FAIL with "Cannot find module '../src/features/printers-room/scene/layout'".

- [ ] **Step 3: Implement `layout.ts`**
  Write deterministic layout algorithms placing workbenches and printer stations neatly along workbench rows or L-shaped layouts with balanced camera framing.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test`
  Expected: PASS.

- [ ] **Step 5: Commit**
  Run: `git add scripts/test.mjs src/features/printers-room/scene/layout.ts tests/printers-room-layout.test.ts; git commit -m "feat(printers-room): add layout and camera coordinate math"`

---

### Task 3: Procedural 3D Models & Materials

**Files:**
- Create: `src/features/printers-room/scene/types.ts`
- Create: `src/features/printers-room/scene/materials.ts`
- Create: `src/features/printers-room/scene/proceduralModels.ts`
- Create: `tests/printers-room-models.test.ts`
- Modify: `scripts/test.mjs:7-38` (register `tests/printers-room-models.test.ts`)

**Interfaces:**
- Consumes: `Printer` data, `StationPosition`.
- Produces:
  ```ts
  export interface InteractivePrinterGroup extends THREE.Group {
    userData: {
      isPrinter: true;
      printerId: string;
      baseY: number;
      targetElevation: number;
      currentElevation: number;
      matMesh: THREE.Mesh;
      shadowMesh: THREE.Mesh;
    };
  }
  export function createDioramaRoom(size: [number, number, number]): THREE.Group;
  export function createWorkbench(width: number, depth: number, height: number): THREE.Group;
  export function createPrinterMat(colorHex: string): THREE.Mesh;
  export function createProceduralPrinter(printer: Printer, station: StationPosition): InteractivePrinterGroup;
  export function disposeHierarchy(object: THREE.Object3D): void;
  ```

- [ ] **Step 1: Write the failing test**
  Write tests in `tests/printers-room-models.test.ts` verifying that `createProceduralPrinter` creates valid mesh groups with proper `userData`, material color mapping, and clean disposal without memory leaks.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test`
  Expected: FAIL with missing module.

- [ ] **Step 3: Implement materials and procedural models**
  - Build `materials.ts`: Charcoal aluminum, technical acrylic, dark oak/slate bench tops, emissive status LEDs, dynamic colored rubber mat material with hex tint.
  - Build `proceduralModels.ts`:
    - Diorama base platform with bevel and coordinate grid.
    - Heavy industrial metal desk/table.
    - Silicone mat with rounded corners, thickness, and colored emissive edge.
    - CoreXY 3D printer: Extrusion frame, glass enclosure, Z-axis leadscrews, heated build plate, carriage gantry, hotend nozzle, spool holder with filament spool matching `printer.color`.
    - Local soft contact shadow mesh plane under the printer.
    - Helper `disposeHierarchy` for recursive disposal of geometries, materials, and textures.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test`
  Expected: PASS.

- [ ] **Step 5: Commit**
  Run: `git add scripts/test.mjs src/features/printers-room/scene/ tests/printers-room-models.test.ts; git commit -m "feat(printers-room): add procedural 3d models and dynamic materials"`

---

### Task 4: Three.js Scene Orchestrator with Fixed Isometric Camera, Hover Elevation & Focus Zoom

**Files:**
- Create: `src/features/printers-room/scene/PrinterRoomScene.ts`

**Interfaces:**
- Consumes: Canvas element, container element, `Printer[]`, callbacks (`onSelectPrinter`, `onHoverPrinter`).
- Produces:
  ```ts
  export class PrinterRoomScene {
    constructor(options: {
      canvas: HTMLCanvasElement;
      container: HTMLElement;
      printers: Printer[];
      onSelectPrinter: (printer: Printer | null) => void;
      onHoverPrinter: (printer: Printer | null) => void;
    });
    public updatePrinters(printers: Printer[]): void;
    public selectPrinterById(printerId: string | null): void;
    public resetFocus(): void;
    public handleResize(): void;
    public dispose(): void;
  }
  ```

- [ ] **Step 1: Implement `PrinterRoomScene` class**
  - **Renderer**: `THREE.WebGLRenderer` with `antialias: true`, `powerPreference: 'high-performance'`, soft shadows (`PCFSoftShadowMap`), tone mapping (`ACESFilmicToneMapping`).
  - **Camera**: Perspective camera set to a fixed isometric viewpoint (e.g., angle 45°, looking at room center). Free orbit controls are explicitly omitted.
  - **Lighting**: Soft ambient fill + warm/cool directional key light casting shadows + subtle ceiling accent lights.
  - **Hover Levitation**:
    - Pointer events cast rays via `THREE.Raycaster`.
    - When hovering a printer: `targetElevation = 0.22`, contact shadow scale expands and opacity decreases.
    - When unhovering: `targetElevation = 0.0`.
    - Render loop smoothly lerps `currentElevation += (targetElevation - currentElevation) * 0.16` on each tick.
  - **Focus Zoom**:
    - When a printer is selected: camera position smoothly interpolates (lerp) toward `focusTarget.position` and camera `lookAt` toward `focusTarget.target`.
    - When deselected (`resetFocus()`): camera position and target smoothly return to `overviewCameraPosition` and `overviewCameraTarget`.
  - **Dispose**: Removes all event listeners (`pointermove`, `pointerdown`, `resize`), stops `requestAnimationFrame`, disposes all scene children and renderer context.

- [ ] **Step 2: Commit**
  Run: `git add src/features/printers-room/scene/PrinterRoomScene.ts; git commit -m "feat(printers-room): implement 3d scene orchestrator with fixed camera and animations"`

---

### Task 5: 2D UI Overlay & Printer Info Drawer

**Files:**
- Create: `src/features/printers-room/components/PrinterInfoDrawer.tsx`
- Create: `src/features/printers-room/components/PrinterRoomOverlay.tsx`
- Create: `src/features/printers-room/components/PrinterRoom3D.tsx`
- Create: `src/features/printers-room/index.ts`
- Create: `tests/printers-room-ui.test.tsx`
- Modify: `scripts/test.mjs:7-38` (register test)

**Interfaces:**
- Consumes: `useData()` (`printers`, `settings`, `updatePrinter`, `deletePrinter`), `PrinterRoomScene`.
- Produces: `<PrinterRoom3D onEditPrinter={...} onDeletePrinter={...} />`

- [ ] **Step 1: Write test for UI components**
  Test in `tests/printers-room-ui.test.tsx` verifying:
  - WebGL capability detection / fallback rendering.
  - Info drawer renders telemetry (hourly cost, power, price, lifespan) with currency formatting.
  - Action callbacks trigger for edit, delete, and close.

- [ ] **Step 2: Register test in `scripts/test.mjs` and run**
  Run: `npm test`
  Expected: FAIL with missing component.

- [ ] **Step 3: Implement components**
  - `PrinterInfoDrawer`: Animated slide-over drawer styled with `#18181b`, `border-white/10`, showing printer name, status tag, color badge, hourly calculation, and action buttons.
  - `PrinterRoomOverlay`: Sleek floating HUD with "3D-ФЕРМА", count badge, "← Вся комната" reset button (visible when a printer is zoomed in), and hint ("Нажмите на принтер для деталей").
  - `PrinterRoom3D`: Canvas lifecycle container, resize observer, and connection with `PrinterRoomScene`.
  - `index.ts`: Clean export.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test`
  Expected: PASS.

- [ ] **Step 5: Commit**
  Run: `git add scripts/test.mjs src/features/printers-room/ tests/printers-room-ui.test.tsx; git commit -m "feat(printers-room): add 3d room container, hud overlay and info drawer"`

---

### Task 6: Integrate 'room3d' Mode into PrinterList & Verification

**Files:**
- Modify: `src/widgets/PrinterList/PrinterList.tsx`

**Interfaces:**
- Consumes: `PrinterRoom3D` via `next/dynamic`.
- Produces: Extended `VIEW_MODE_OPTIONS` with `'room3d'` option and interactive diorama view.

- [ ] **Step 1: Modify `PrinterList.tsx`**
  - Add `'room3d'` to `InventoryViewMode` (`type InventoryViewMode = 'table' | 'cards' | 'room3d';`).
  - Add option to `VIEW_MODE_OPTIONS`:
    `{ value: 'room3d', label: '3D-комната', icon: Box, ariaLabel: 'Режим 3D-комнаты' }`.
  - Dynamically import `PrinterRoom3D` (`next/dynamic(() => import('../../features/printers-room').then(m => m.PrinterRoom3D), { ssr: false, loading: () => <PrintersSkeleton /> })`).
  - When `viewMode === 'room3d'`, render `PrinterRoom3D` passing `onEditPrinter={(p) => { setEditingPrinter(p); setIsFormOpen(true); }}` and `onDeletePrinter={(p) => setDeleteTarget(p)}`.

- [ ] **Step 2: Run full test suite**
  Run: `npm test`
  Expected: All unit tests pass.

- [ ] **Step 3: Verify build / typecheck**
  Run: `node_modules/typescript/bin/tsc --noEmit`
  Expected: Clean compilation with 0 errors.

- [ ] **Step 4: Commit**
  Run: `git add src/widgets/PrinterList/PrinterList.tsx; git commit -m "feat(printers): integrate 3d diorama room view into printer cockpit"`

---

## Verification Plan

### Automated Tests
- `npm test` runs all unit tests including the new `printers-room-layout.test.ts`, `printers-room-models.test.ts`, and `printers-room-ui.test.tsx`.
- TypeScript verification (`tsc --noEmit`) to guarantee type safety across React 19 and Three.js.

### Manual Verification
- Open `/printers` in browser.
- Switch between `Таблица`, `Карточки`, and `3D-комната`.
- Verify the 3D diorama room renders with fixed 45° isometric perspective.
- Hover mouse over a printer: observe smooth levitation lift and soft shadow expansion.
- Verify the silicone mat under the printer matches the exact color selected for that printer.
- Click on a printer: camera dollies smoothly into close-up focus and detail drawer slides in.
- Click "Вся комната" or press `Esc`: camera returns smoothly to overview.
- Add/edit a printer and confirm immediate reactive update in the 3D room.
