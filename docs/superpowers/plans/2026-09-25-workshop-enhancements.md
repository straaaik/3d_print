# Workshop Ergonomics, Optimization & Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve identified 3D workshop bugs, remove redundant UI, optimize Three.js rendering performance, add smart snapping, undo/redo history, hotkeys, search highlighting, and cell-grid ergonomics.

**Architecture:** 
Enhance the existing Three.js runtime ([WorkshopScene.ts](file:///g:/3d/3D%20Labs/src/features/workshop/WorkshopScene.ts), [spatialAuthoring.ts](file:///g:/3d/3D%20Labs/src/features/workshop/spatialAuthoring.ts)) and React cockpit wrappers ([WorkshopPage.tsx](file:///g:/3d/3D%20Labs/src/features/workshop/WorkshopPage.tsx), [WorkshopCanvas.tsx](file:///g:/3d/3D%20Labs/src/features/workshop/WorkshopCanvas.tsx)) with modular sub-features. Keep database persistence untouched while maintaining strict compliance with `DESIGN_SYSTEM.md` (no neon glows, deep matte graphite `#0a0d12`, crisp cockpit accents).

**Tech Stack:** Three.js, React 19, TypeScript, Tailwind CSS, Motion (`motion/react`).

**Spec:** User audit requirements from 2026-09-25 across Sections 1 (Bugs), 2 (Ergonomics), 3 (Redundant UI), 4 (Missing Features), and 5 (Optimization).

## Global Constraints
- Target branch is `test` (staging). Never touch `main`.
- Strictly follow `DESIGN_SYSTEM.md`. Reference pages are `/calculator` and `/orders`.
- No new npm packages (`npm install` is prohibited without explicit permission).
- Intermediate verification must use fast `npm test`. Do NOT run `npm run test:e2e` until final completion.
- Zero TypeScript errors (`npx tsc --noEmit`).

---

### Task 1: Performance & 3D Optimization (Section 5 & Section 1.3)

**Files:**
- Modify: `src/features/workshop/WorkshopScene.ts:180-205, 1963-1967`
- Modify: `src/features/workshop/spatialAuthoring.ts:46-62, 418-445`
- Test: `tests/workshop.test.ts`

**Interfaces:**
- Consumes: Three.js `WebGLRenderer`, `DirectionalLight`, `CanvasTexture`.
- Produces: Optimized `shadowMap` (2048/1024 PCFSoftShadowMap), cached 2D canvas textures for 3D buttons, zero idle RAF when `document.hidden`.

- [ ] **Step 1: Write test for shadow map & performance configuration**
Verify that shadow map resolution is capped at 2048 and shadow filter is `PCFSoftShadowMap`.

- [ ] **Step 2: Update shadow map and visibility pause in WorkshopScene**
In `WorkshopScene.ts`:
- Set `shadowSize = options.container.clientWidth > 900 ? 2048 : 1024;`
- Set `this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;`
- Set `this.key.shadow.radius = 2.5;`
- In `onVisibility`, cancel active `this.frame` on `document.hidden` and resume on visible.

- [ ] **Step 3: Memoize HUD button textures in spatialAuthoring**
In `spatialAuthoring.ts`:
- Create a texture cache `Map<string, THREE.CanvasTexture>` for standard 3D HUD action buttons (`drag`, `rotate`, `delete`, color swatches) so they are created once and reused across selections.

- [ ] **Step 4: Run unit tests**
Run: `npm test`
Expected: PASS.

---

### Task 2: Camera Stability & Smooth Room Switching (Section 1.2 & Section 1.4)

**Files:**
- Modify: `src/features/workshop/WorkshopScene.ts:693-712, 1935-1956`
- Modify: `src/features/workshop/WorkshopCanvas.tsx:150-175`
- Test: `tests/workshop.test.ts`

**Interfaces:**
- Consumes: `Room.camera`, `workshopBounds()`, `calculatePanDelta()`.
- Produces: Smooth camera transitions when switching rooms without losing custom view settings or defaulting to whole-world overview.

- [ ] **Step 1: Write test for room switch camera behavior**
Verify room switch focuses on active room bounds or room's saved camera rather than dropping to generic (0,0,0).

- [ ] **Step 2: Implement room-centric camera focus in WorkshopScene**
In `WorkshopScene.ts`:
- When `roomChanged` is true, check `room.camera`. If present, animate camera to `room.camera`.
- If no custom camera saved, calculate the room's center via `roomOrigin(this.data, room.id)` and animate target to the room center with an appropriate room-fitting span.
- Reset `this.customView = false` so subsequent room switches don't get blocked by leftover custom view flags.

- [ ] **Step 3: Stabilize wheel zoom target transitions**
In `WorkshopScene.ts:onWheel`:
- When zooming out (`deltaY > 0`) or when no object is selected, keep camera target stable using smooth dampening without jumping to the origin.

- [ ] **Step 4: Run unit tests**
Run: `npm test`
Expected: PASS.

---

### Task 3: UI Streamlining & Dead Code Cleanup (Section 1.1, 3.1, 3.2, 3.3)

**Files:**
- Modify: `src/features/workshop/WorkshopCanvas.tsx:40-45, 600-745`
- Modify: `src/features/workshop/WorkshopPage.tsx:400-480`
- Test: `tests/workshop.test.ts`

**Interfaces:**
- Consumes: `selectedFurniture`, `selectedPlacement`, `onSelect`.
- Produces: Clean viewport free from duplicate 2D bottom D-pad floating toolbars, removed `roomEditorOpen` dead prop, clean stacked cockpit cards on top-left.

- [ ] **Step 1: Remove duplicate 2D floating D-pad bars from WorkshopCanvas**
- Remove the redundant floating action bars at `bottom-4 left-1/2` for selected furniture and selected placement (lines 601-750). All movement, rotation, and deletion are handled via the 3D floor Gizmo and keyboard shortcuts.
- Keep a subtle, compact selection pill in the status line if needed, without interactive D-pads that clash with 3D gizmos.

- [ ] **Step 2: Clean up dead props and modals**
- Remove unused `roomEditorOpen` from `WorkshopCanvasProps`.
- Remove leftover references to obsolete room modals.

- [ ] **Step 3: Streamline top-left status cards**
- In `WorkshopCanvas.tsx`, ensure room info card and printer info card stack neatly without vertical overlap on smaller screens (e.g., using max-h with smooth scroll or compact accordion format).

- [ ] **Step 4: Run unit tests**
Run: `npm test`
Expected: PASS.

---

### Task 4: Collision Diagnosis & Smart Snapping (Section 2.3 & Section 4.1)

**Files:**
- Modify: `src/features/workshop/model.ts:55-75`
- Modify: `src/features/workshop/WorkshopScene.ts:1530-1565, 1730-1775`
- Modify: `src/features/workshop/WorkshopCanvas.tsx:45-55`
- Test: `tests/workshop.test.ts`

**Interfaces:**
- Consumes: `Workshop`, `Furniture`, `Room`.
- Produces: `getFurnitureCollisionReason(state, furniture): string | null`, magnetic edge-snapping to neighboring furniture within 0.2m, cockpit collision toast message.

- [ ] **Step 1: Write unit tests for collision reason helper & snapping**
Test that `getFurnitureCollisionReason`:
- Returns `"Выход за пределы комнаты"` when coordinates exceed room bounds.
- Returns `"Пересечение с <Название>"` when bounding boxes overlap.
- Returns `null` when valid.
Test that `snapFurnitureToNeighbors` aligns edge-to-edge when close to neighbor.

- [ ] **Step 2: Implement collision diagnostics in model.ts**
Add `getFurnitureCollisionReason(state: Workshop, f: Furniture): string | null` detailing the exact reason why placement is invalid.

- [ ] **Step 3: Implement magnetic snapping in WorkshopScene**
During furniture drag (`onMove`):
- Find nearest other furniture in the same room.
- If distance between opposing edges is `< 0.2m`, magnetically snap `x` or `z` so furniture touches edge-to-edge.
- Also snap to room walls if within `< 0.2m` of wall padding.

- [ ] **Step 4: Display collision feedback toast/badge**
When invalid movement is attempted, emit `options.onCollisionFeedback(reason)` and show a sleek cockpit warning badge in the HUD for 1.8 seconds.

- [ ] **Step 5: Run unit tests**
Run: `npm test`
Expected: PASS.

---

### Task 5: Hotkeys & Cell-Grid Eraser Ergonomics (Section 2.2 & Section 2.4)

**Files:**
- Modify: `src/features/workshop/WorkshopScene.ts:380-425`
- Modify: `src/features/workshop/spatialAuthoring.ts:1080-1120, 1220-1240`
- Test: `tests/workshop.test.ts`

**Interfaces:**
- Consumes: Window keyboard events, Pointer events with `shiftKey` / right button.
- Produces: Keyboard controls (`G` for grab, `R` for rotate, `Del` for delete, `Space` for 2D/3D toggle, `Esc` for cancel), `Shift+Click` or right-click to instantly erase cells in grid builder.

- [ ] **Step 1: Write test for hotkey actions**
Verify hotkeys trigger appropriate callbacks (`onMove`, `onRotate`, `onDelete`, toggle 2D/3D).

- [ ] **Step 2: Add keyboard shortcut handlers in WorkshopScene**
In `WorkshopScene.ts:onKeyDown`:
- `Space`: Toggle between `top` (2D top-down) and isometric 3D view.
- `Escape`: Cancel current selection or exit authoring tool.
- `R`: Rotate selected furniture or placement by 90°.
- `G` / `M`: Start move/drag mode for selected item.
- `Delete` / `Backspace`: Delete selected furniture or placement.

- [ ] **Step 3: Support Shift+Click / Right-click eraser in Cell-Grid Room Builder**
In `spatialAuthoring.ts`:
- In `pointerDown` & `pointerMove`, check if `e.shiftKey` or right-click is active: treat tool as `eraser` automatically without needing to manually toggle tool in the UI.

- [ ] **Step 4: Run unit tests**
Run: `npm test`
Expected: PASS.

---

### Task 6: Action History (Undo / Redo Stack) (Section 2.1)

**Files:**
- Modify: `src/features/workshop/WorkshopPage.tsx:50-95, 140-155, 400-430`
- Test: `tests/workshop.test.ts`

**Interfaces:**
- Consumes: `layout: Workshop`, `change(next: Workshop)`.
- Produces: `undo()`, `redo()`, `canUndo`, `canRedo`, `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z` listener, toolbar buttons.

- [ ] **Step 1: Write unit test for undo/redo stack transitions**
Test that committing states pushes to undo stack, undo restores previous state and populates redo stack, redo restores next state.

- [ ] **Step 2: Implement Undo/Redo stack in WorkshopPage**
In `WorkshopPage.tsx`:
- Maintain `undoStack = useRef<Workshop[]>([])` and `redoStack = useRef<Workshop[]>([])`.
- In `commit(next)`: push deep-cloned copy of current layout to `undoStack` (max 40 items), clear `redoStack`.
- Add `handleUndo()`: pop from `undoStack`, push current to `redoStack`, call `change(previous)`.
- Add `handleRedo()`: pop from `redoStack`, push current to `undoStack`, call `change(next)`.
- Add global keyboard listener for `Ctrl+Z` (Undo) and `Ctrl+Y` / `Ctrl+Shift+Z` (Redo).

- [ ] **Step 3: Add Undo/Redo cockpit buttons in top action bar**
Add compact Undo (`RotateCcw`) and Redo (`RotateCw`) buttons with tooltips in the top workspace controls, disabled when stack is empty.

- [ ] **Step 4: Run unit tests**
Run: `npm test`
Expected: PASS.

---

### Task 7: Printer Search Beacon & Multi-selection (Section 4.2 & Section 4.3)

**Files:**
- Modify: `src/features/workshop/WorkshopScene.ts:320-335, 1780-1820`
- Modify: `src/features/workshop/WorkshopCanvas.tsx:150-180`
- Test: `tests/workshop.test.ts`

**Interfaces:**
- Consumes: Selected placement ID, printer search selection.
- Produces: Pulsing 3D floor beacon beneath searched printer, Shift+click multi-selection support for furniture.

- [ ] **Step 1: Write test for search beacon trigger and positioning**
Test that searching for a printer focuses camera and activates beacon on printer's floor coordinates.

- [ ] **Step 2: Add 3D search beacon ring in WorkshopScene**
- Create `searchBeaconGroup` with an animated pulsing ring on the floor (`RingGeometry` with emissive cyan glow).
- When a printer is selected via search/dropdown, activate beacon at printer's ground location for 3.5 seconds with gentle pulse animation, then fade out.

- [ ] **Step 3: Support Shift+Click multi-selection for furniture**
In `WorkshopScene.ts` / `WorkshopCanvas.tsx`:
- If `e.shiftKey` is held during click on furniture, add to / remove from multi-selection set.
- When moving multi-selected furniture with arrow keys or gizmo, shift all selected items by the same step.

- [ ] **Step 4: Run unit tests**
Run: `npm test`
Expected: PASS.

---

### Task 8: Full Verification & Automated Tests

**Files:**
- Test: Run full `npm test` suite
- Check: `npx tsc --noEmit`

- [ ] **Step 1: Execute project test suite**
Run: `npm test`
Expected: All 228+ tests passing.

- [ ] **Step 2: Verify TypeScript compiler**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Verify git status on test branch**
Check modified files and clean state.
