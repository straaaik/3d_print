# 3D Printers Room (Diorama View) Specification

**Date:** 2026-09-22  
**Status:** Approved  
**Author:** Antigravity & User  
**Target:** `src/features/printers-room/` and `src/widgets/PrinterList/`

---

## 1. Goal and Overview

Create an interactive 3D diorama room for the 3D printer fleet in 3D Labs (`/printers`). Instead of only seeing printers in a table or flat card grid, users can switch to a rich, dark-mode technical 3D laboratory scene where all their registered 3D printers stand on desks in a clean isometric room.

### Key Experience Requirements
1. **Fixed Isometric Camera**: The camera angle is locked to a classic isometric perspective (45° angle, looking down into the diorama). The user does not drag to orbit the entire scene; instead, the view is framed predictably and cleanly.
2. **Hover Levitation Effect**: Hovering the pointer over any printer causes the printer body to smoothly elevate (lift by ~18-20 mm in world scale) as if on a magnetic pad, with its drop shadow softening and expanding on the mat below.
3. **Dynamic Mat Color**: Each printer stands on a dedicated rubber/silicone workshop mat whose color dynamically matches the printer's chosen accent color (`printer.color`). The mat has a subtle colored edge glow.
4. **Cinematic Focus Zoom & Info Drawer**: Clicking on a printer triggers a smooth camera dolly/zoom towards that printer, centering it in view. An info drawer slides open with technical specs (cost per hour, power, lifespan, purchase price, edit/delete actions). Clicking back or pressing `Esc` smoothly returns the camera to the overview diorama view.
5. **Seamless Data Integration**: Directly synchronizes with `useData().printers`. Adding, editing, or deleting a printer dynamically updates the 3D room.

---

## 2. Technical Stack and Dependencies

- **Engine**: Three.js (`three` + `@types/three`).
- **Dynamic Loading**: Encapsulated in React client component and imported dynamically via `next/dynamic({ ssr: false })` in `PrinterList.tsx` to maintain fast initial page load (<160KB gzipped lazy chunk).
- **Animations & UI**: Three.js `requestAnimationFrame` render loop with lerp easing for camera and hover lift; `motion/react` for 2D UI drawer and view mode transitions.
- **Design System Alignment**: Dark aesthetic (`#09090b`, `#18181b`, `#27272a`, `#3f3f46`, neon accents) adhering strictly to `DESIGN_SYSTEM.md`.

---

## 3. Architecture & File Structure

```text
src/
├── features/
│   └── printers-room/
│       ├── components/
│       │   ├── PrinterRoom3D.tsx         # Main client component with Canvas + UI overlay
│       │   ├── PrinterRoomOverlay.tsx    # Header, view reset button, printer count badge
│       │   └── PrinterInfoDrawer.tsx     # Slide-out drawer with printer telemetry & actions
│       ├── scene/
│       │   ├── PrinterRoomScene.ts       # Three.js orchestrator (Renderer, Camera, Loop, Raycaster)
│       │   ├── proceduralModels.ts       # Procedural geometries: Room, Tables, Colored Mats, Printers
│       │   ├── materials.ts              # Reusable materials, shaders/emissives, color helpers
│       │   └── types.ts                  # Internal scene types, interactive object metadata
│       └── index.ts                      # Feature export
└── widgets/
    └── PrinterList/
        └── PrinterList.tsx               # Extends VIEW_MODE_OPTIONS to include 'room3d'
```

---

## 4. Scene Design & Geometry Details

### 4.1 Room & Environment
- **Base Platform**: Isometric beveled diorama base with dark slate/anthracite finish.
- **Floor**: Subtle engineering coordinate grid (fine lines, matte finish with soft ambient reflection).
- **Lighting**:
  - Balanced Ambient Light for shadow fill.
  - Key Directional Light with soft shadow mapping (`PCFSoftShadowMap`).
  - Warm/Cool subtle accent point lights emphasizing the tech lab atmosphere.

### 4.2 Workbenches & Layout
- Modular dark-metal industrial workbenches.
- Layout algorithm positions desks based on printer count:
  - 1-2 printers: Centered spacious workbench.
  - 3-6 printers: Dual/L-bench workshop configuration.
  - 7+ printers: Organized multi-station farm layout.
- Each station has dedicated cable runners and technical details.

### 4.3 Colored Mats
- Placed directly under each printer on top of the workbench.
- Beveled silicone/rubber anti-vibration pad.
- Material color derived from `printer.color` (fallback to `#0CB4E0` cyan).
- Subtle emissive edge highlight matching the accent color.

### 4.4 Procedural 3D Printer Model
Built from performant procedural Three.js primitives without external heavy 3D assets:
- **Frame**: Anodized aluminum extrusion profiles (charcoal/gunmetal).
- **Enclosure**: Tinted semi-transparent acrylic/glass panels.
- **Bed & Gantry**: Heated bed plate on Z-axis rods, CoreXY crossbar and hotend carriage.
- **Top Spool**: Spool mount with filament spool matching the printer's accent color.
- **Electronics**: Front bezel with a glowing status LED (green/cyan for ready) and miniature touchscreen panel.

---

## 5. Interaction & Animation Mechanics

### 5.1 Hover Elevation (Levitation)
- **Detection**: Mouse/pointer movements are cast into the scene using `THREE.Raycaster`.
- **Interpolation**:
  ```ts
  // On hover enter: targetElevation = 0.22 (world units)
  // On hover leave: targetElevation = 0.0
  meshGroup.position.y += (targetElevation - meshGroup.position.y) * 0.16;
  ```
- **Shadow Expansion**: The local contact shadow or shadow intensity smoothly adjusts in tandem with elevation.
- **Cursor**: Sets `document.body.style.cursor = 'pointer'` when hovering an interactive printer.

### 5.2 Cinematic Camera Dolly / Focus
- **Overview State**: Camera positioned at fixed isometric vector (e.g. `[14, 12, 14]`, looking at `[0, 1, 0]`).
- **Focus State**: When printer $i$ is clicked:
  - Camera target position shifts towards `printerPosition + isometricOffset * 0.45`.
  - Camera `lookAt` smoothly interpolates to `printerPosition`.
  - Duration: ~650ms with smooth cubic/lerp dampening.
- **Return to Overview**:
  - Triggered by clicking empty room space, the "← Обзор комнаты" button, or pressing `Escape`.
  - Returns camera smoothly to initial overview framing.

### 5.3 Printer Info Drawer
- Rendered via `motion.aside` in the 2D overlay layer.
- Displays:
  - Printer name and color badge.
  - Real-time hourly cost calculation based on project formulas (`power_w`, `price`, `lifespan_hours`, `electricity_rate`).
  - Total purchase cost, power rating, and remaining resource hours.
  - Action buttons: "Редактировать" (opens the edit modal in `PrinterList`) and "Удалить" (opens confirmation).

---

## 6. Performance & Lifecycle Management

- **Memory Cleanup**: On component unmount, `PrinterRoomScene.dispose()` traverses all meshes, disposes all geometries and materials, removes DOM canvas listeners, and cancels the `requestAnimationFrame` loop.
- **Resize Observer**: Automatically updates camera aspect ratio and renderer pixel ratio on container resize.
- **WebGL Fallback**: Graceful detection of WebGL context availability; displays a clean fallback card if WebGL is unsupported or disabled.

---

## 7. Verification Plan

1. **Unit & Logic Tests**:
   - Verify layout placement calculation for varying numbers of printers (1, 3, 8).
   - Verify color normalization and fallback logic.
2. **Integration Verification**:
   - Check switching between `table`, `cards`, and `room3d` modes in `PrinterList`.
   - Verify hover elevation triggers correctly and smoothly.
   - Verify click-to-focus camera animation and Drawer opening.
   - Verify edit/delete actions connect seamlessly with existing `useData` handlers.
   - Test `npm test` to ensure existing suite passes without regressions.
