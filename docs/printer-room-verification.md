# Printer room verification — 2026-09-23

## Delivered

The existing Printers page now offers the redesigned room in development and production builds. It remains a lazy client bundle; table/card views do not mount the WebGL scene. No packages, database changes, commits or push were needed.

Blender 5.0 source: `assets/blender/printer-room/printer-room.blend`. Reproduce with `blender --background --python scripts/blender/build_printer_room.py`; verify exported files with `blender --background --python scripts/blender/verify_printer_room.py`. Generator backs up the previous master before replacing generated assets. Manual source edits should be kept separately from generated output.

GLB assets under `public/models/printer-room/` total 670,240 bytes:

| Asset | Triangles | Bytes |
| --- | ---: | ---: |
| A1 | 1,952 | 95,540 |
| A1 distant model | 600 | 37,620 |
| Workbench | 528 | 34,080 |
| Filament shelf | 10,892 | 499,392 |
| Floor tile | 44 | 3,608 |

Blender import verification compares mesh counts, triangles and world bounds. Original Blender render and imported A1 render are saved alongside the master. GLBs use metres, Y up, +Z forward, with the desk top at Y=0.85. Browser lighting follows the Blender-authored studio setup with a lower ACES exposure of 0.65 for the web renderer. Local pools use shared transparent textures instead of per-printer real-time lights.

## Browser checks

Checked in local development Chromium, using an isolated development-session inventory; no real user records were changed. Desktop viewport 1440×960 and mobile 390×844.

- Inventories with 0, 1, 12, 52 and 200 printers; compact layout and complete overview framing.
- Actual canvas click selects a printer; searchable picker opens the same detail drawer.
- 2D/top and 3D/isometric controls, zoom, overview, fullscreen portal; camera mode survives fullscreen changes.
- Mobile has no horizontal document overflow; selection and drawer close work.
- Empty room opens the existing add-printer form.
- Aborted A1 request displays a load error; Retry recovers after restoring the request.
- 200-printer overview uses low detail; zoom switches to detail; resizing correctly switches back.
- Forced `WEBGL_lose_context` / restore produces a pixel-identical canvas; restoration and subsequent unmount produce zero warnings/errors.

## Performance evidence and limits

| Inventory | Steady-view draw calls | Triangles | Mode |
| --- | ---: | ---: | --- |
| 12 | 28 | 55,744 | Detail |
| 52 | 30 | 184,672 | Detail |
| 200 | 82 | 352,944 | Low |

Draw counts exclude the one-time shadow refresh. For 52 printers the frame counter stayed at 48 over 1.5 seconds without input; for 200 it stayed at 289 over 1.2 seconds. No continuous render loop runs. Rendering is also suspended offscreen and when the document is hidden. Shared meshes/materials are instanced in chunks of 64; pixel ratio is capped at 1.5, or 1 for farms over 80, with real-time shadow maps disabled above that threshold. Instance buffers and source resources have separate ownership and cleanup.

A 120-browser-frame sample while zooming the 200-printer scene averaged 5.97 ms between callbacks, p95 6.2 ms on this machine. This is a local browser frame-interval observation, not GPU timing or a guarantee for slower devices. Static-scene rendering stops entirely once interaction settles. Geometry still grows with printer count; rendering an unlimited inventory is not claimed.

Live printing status is unavailable in the existing data model. The UI reports inventory counts, not invented online/printing/paused values. All inventory entries currently share the A1 visual; this is explicitly labelled in the room.

## Automated checks

`npm test`: 194 passed, 0 failed, including project TypeScript compilation. Added layout scaling/framing and instance-transform/resource-ownership regressions. Scoped ESLint: no findings. `git diff --check` on changed tracked room files: clean.

The full `npm run test:e2e` suite was not run because no final push was requested, per project rules. No new `playwright-report/index.html` was generated. Browser evidence is saved as `assets/blender/printer-room/web-52.png`, `web-200.png`, `web-focus.png`, `web-mobile.png`, and `web-mobile-focus.png`.
