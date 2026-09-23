# Printer room — 2026-09-22

## Design and scope
Adapt the supplied isometric print-farm reference to the existing printer inventory. Build Bambu Lab A1, workbench, shelf and tile assets in Blender, with editable sources and compact GLB exports. Use real inventory counts; live print status is unavailable. Keep other model names in inventory, presenting this first visual model as A1 without claiming exact representations of other machines.

## Execution
- [x] Blender assets: model, export, verify bounds/materials and render source scene.
- [x] Layout: regression test compact scaling for 52/200 printers, implement balanced rows, table clearance and aspect-aware framing.
- [x] Runtime: instance reusable assets in spatial chunks, share materials, bound pixel ratio/shadows, render on demand, suspend offscreen, dispose resources, recover gracefully from load/WebGL failures.
- [x] UI: inventory counts, accessible selection, hover label, overview/top camera, zoom, floor-plan minimap; preserve edit/delete flow.
- [x] Verify: unit suite, TypeScript, browser visual and interaction checks, 1/12/52/200 printer performance and screenshots. No push requested; do not run full E2E suite.

## Rulings
Work in current `test` checkout so existing user changes remain present and the result is immediately reviewable. Modify only printer-room files and narrowly scoped integration; no package installs, DB changes, commits or push. User explicitly requested autonomous completion, so no design approval checkpoint. GLB replaces the attached workflow's Unity/FBX handoff because the target is the existing website.
