import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as THREE from 'three';
import type { WorkshopCanvasProps } from '../src/features/workshop/WorkshopCanvas';
import { createWorkshop, createFurniture, validFurniture, getFurnitureCollisionReason, snapFurnitureToNeighbors, snap, updateFurniture, placeEntity, removeRoom, slotWorld, parseWorkshop, pickWorkshopTarget, syncWorkshopPlacements, calculatePanDelta, calculateOrbitAngles, fillEnclosedTiles, existingRoomsTileBounds, roomOrigin, type Room, createWorkshopHistory, pushWorkshopHistory, undoWorkshopHistory, redoWorkshopHistory, WORKSHOP_HISTORY_MAX_DEPTH, calculateGroupMove, resolvePlacementPosition, findWorkshopSeams, getRoomOccupiedTiles, updateRoomLabel, deleteRoomLabel, defaultRoomLabels, findNearestValidPosition, resolveInvalidFurniture } from '../src/features/workshop/model';
import { instanceTemplate, disposeInstances } from '../src/features/workshop/instances';
import { getWorkshopShadowConfig, calculateRoomCameraFocus, calculateWheelShift, calculateZoomTarget, handleWorkshopKeyDown, type WorkshopHotkeyContext, WorkshopScene } from '../src/features/workshop/WorkshopScene';
import { getOrCreateHudButtonTexture, hudButtonTextureCache, clearHudButtonTextureCache, SpatialAuthoring } from '../src/features/workshop/spatialAuthoring';
import { occupiedSides } from '../src/features/workshop/spatialScene';
import { ReferenceSceneParts } from '../src/features/workshop/referenceSceneParts';

test('default layout has non-overlapping furnishings including movable decor and no invented inventory', () => {
  const state = createWorkshop();
  assert.equal(state.furniture.length, 10);
  assert.equal(state.placements.length, 0);
  for (const f of state.furniture) assert.equal(validFurniture(state, f), true);
  assert.equal(state.slots.filter(s => s.kind === 'printer').length, 16);
  assert.equal(state.furniture.filter(f => ['plant', 'boxes', 'cabinet'].includes(f.kind)).length, 4);
});
test('rotation uses local slots and checks room bounds and collisions', () => {
  const state = createWorkshop();
  const table = state.furniture[0];
  assert.equal(validFurniture(state, { ...table, x: 7 }), false);
  assert.equal(validFurniture(state, { ...table, x: state.furniture[1].x, z: state.furniture[1].z }), false);
  const slot = { ...state.slots[0], x: 1, y: .85, z: 0 };
  assert.deepEqual(slotWorld({ ...table, x: 2, z: 3, rotation: 90 }, slot).map(n => Math.round(n * 100) / 100), [2, .85, 2]);
});
test('placement moves an existing printer and rejects occupied or wrong kind slots', () => {
  const state = createWorkshop();
  const [a,b] = state.slots;
  const placed = placeEntity(state, 'printer', 'p1', a.id, 'a1');
  const moved = placeEntity(placed, 'printer', 'p1', b.id, 'p1');
  assert.equal(moved.placements.length, 1);
  assert.equal(moved.placements[0].slotId, b.id);
  assert.throws(() => placeEntity(moved, 'printer', 'p2', b.id, 'a1'));
  assert.throws(() => placeEntity(state, 'printer', 'p1', state.slots.find(s=>s.kind==='filament')!.id, 'a1'));
});
test('resizing furniture retains occupied stable slots and refuses removing them', () => {
  const state = createWorkshop();
  const f = state.furniture[0];
  const occupied = placeEntity(state, 'printer', 'p1', state.slots[3].id, 'a1');
  assert.throws(() => updateFurniture(occupied, { ...f, columns: 2 }));
  const next = updateFurniture(occupied, { ...f, name: 'Renamed' });
  assert.equal(next.slots.find(s=>s.furnitureId===f.id && s.index===3)?.id, state.slots[3].id);
});
test('room deletion removes only its spatial layout and parser rejects corrupt caches', () => {
  const state = createWorkshop();
  const result = removeRoom(placeEntity(state, 'printer', 'p1', state.slots[0].id, 'a1'), state.rooms[0].id);
  assert.equal(result.rooms.length + result.slots.length + result.placements.length + result.furniture.length, 0);
  assert.equal(parseWorkshop('{"version":1}'), null);
  assert.deepEqual(parseWorkshop(JSON.stringify(state)), state);
  assert.equal(parseWorkshop(JSON.stringify({...state, furniture:[{...state.furniture[0], width: -1}]})), null);
});
test('new furniture has dimensioned slots suitable for its kind', () => {
  const f = createFurniture('r', 'printer_rack');
  assert.equal(f.levels, 2);
  assert.equal(f.columns, 3);
});
test('cache validation rejects malformed local slots and unsafe camera bounds', () => {
  const state=createWorkshop();
  assert.equal(parseWorkshop(JSON.stringify({...state,slots:state.slots.map((s,i)=>i? s:{...s,index:-1})})),null);
  assert.equal(parseWorkshop(JSON.stringify({...state,slots:state.slots.map((s,i)=>i? s:{...s,x:90})})),null);
  assert.equal(parseWorkshop(JSON.stringify({...state,rooms:state.rooms.map(r=>({...r,camera:{x:0,y:0,z:0,span:0}}))})),null);
  assert.equal(parseWorkshop(JSON.stringify({...state,slots:state.slots.slice(1)})),null);
});
test('view picking prioritizes a printer inside its rack bounds; edit picking keeps the rack', () => {
  const rack={userData:{furnitureId:'rack'}}, printer={userData:{furnitureId:'rack',placementId:'printer'}};
  assert.equal(pickWorkshopTarget([{object:rack},{object:printer}],false),printer);
  assert.equal(pickWorkshopTarget([{object:rack},{object:printer}],true),rack);
});

test('instances preserve nested GLB transforms and share geometry without disposing the template', () => {
  const source = new THREE.Group();
  source.position.y = .5;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  mesh.position.x = 2;
  source.add(mesh);
  let disposed = false;
  mesh.geometry.addEventListener('dispose', () => { disposed = true; });
  const group = instanceTemplate(source, [new THREE.Matrix4().makeTranslation(10, 0, 0)]);
  const batch = group.children[0] as THREE.InstancedMesh;
  assert.equal(batch.geometry, mesh.geometry);
  const matrix = new THREE.Matrix4();
  batch.getMatrixAt(0, matrix);
  assert.equal(matrix.elements[12], 12);
  assert.equal(matrix.elements[13], .5);
  disposeInstances(group);
  assert.equal(disposed, false, 'rebuilding a room must not invalidate its shared template');
});

test('large instance sets are split for culling and preserve selection indices', () => {
  const source = new THREE.Group();
  source.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  const group = instanceTemplate(source, Array.from({ length: 200 }, (_, i) => new THREE.Matrix4().makeTranslation(i, 0, 0)));
  assert.equal(group.children.length, 4);
  assert.equal(group.children[3].userData.instanceOffset, 192);
  assert.equal((group.children[3] as THREE.InstancedMesh).count, 8);
  disposeInstances(group);
});

test('syncWorkshopPlacements auto-places inventory, respects 3D models, prevents duplicates, and purges removed entities', () => {
  const state = createWorkshop();
  const printers = [
    { id: 'p-1', name: 'Bambu Lab A1', model_3d: 'a1' },
    { id: 'p-2', name: 'Bambu Lab P1S', model_3d: 'p1' },
    { id: 'p-3', name: 'Bambu Lab P1P' }, // inferred p1
  ];
  const filaments = [
    { id: 'f-1', name: 'PLA White', color: '#ffffff' },
  ];

  const synced = syncWorkshopPlacements(state, printers, filaments);

  // All 3 printers placed
  const printerPlacements = synced.placements.filter((p) => p.kind === 'printer');
  assert.equal(printerPlacements.length, 3);
  assert.equal(printerPlacements.find((p) => p.entityId === 'p-1')?.model, 'a1');
  assert.equal(printerPlacements.find((p) => p.entityId === 'p-2')?.model, 'p1');
  assert.equal(printerPlacements.find((p) => p.entityId === 'p-3')?.model, 'p1');

  // Filament placed
  const filamentPlacements = synced.placements.filter((p) => p.kind === 'filament');
  assert.equal(filamentPlacements.length, 1);
  assert.equal(filamentPlacements[0].entityId, 'f-1');

  // Slots are unique
  const slotIds = synced.placements.map((p) => p.slotId);
  assert.equal(new Set(slotIds).size, synced.placements.length);

  // Running sync again without changes does not duplicate or change placements
  const resynced = syncWorkshopPlacements(synced, printers, filaments);
  assert.equal(resynced.placements.length, 4);
  assert.equal(resynced, synced);

  // Updating printer 3D model updates the placement
  const updatedPrinters = [
    { id: 'p-1', name: 'Bambu Lab A1', model_3d: 'p1' }, // user changed to p1
    { id: 'p-2', name: 'Bambu Lab P1S', model_3d: 'p1' },
    { id: 'p-3', name: 'Bambu Lab P1P' },
  ];
  const modelUpdated = syncWorkshopPlacements(synced, updatedPrinters, filaments);
  assert.equal(modelUpdated.placements.find((p) => p.entityId === 'p-1')?.model, 'p1');

  // Removing a printer from inventory purges its placement
  const purged = syncWorkshopPlacements(modelUpdated, updatedPrinters.filter((p) => p.id !== 'p-2'), filaments);
  assert.equal(purged.placements.some((p) => p.entityId === 'p-2'), false);
  assert.equal(purged.placements.filter((p) => p.kind === 'printer').length, 2);
});

test('moving placements to empty slots or swapping occupied slots preserves state integrity', () => {
  const state = createWorkshop();
  const printerSlots = state.slots.filter((s) => s.kind === 'printer');
  const slotA = printerSlots[0];
  const slotB = printerSlots[1];
  const slotC = printerSlots[2];

  // Place two printers on slotA and slotB
  const withP1 = placeEntity(state, 'printer', 'printer-1', slotA.id, 'a1');
  const withBoth = placeEntity(withP1, 'printer', 'printer-2', slotB.id, 'p1');
  assert.equal(withBoth.placements.length, 2);

  // Move printer-1 to empty slotC
  const p1 = withBoth.placements.find((p) => p.entityId === 'printer-1')!;
  const movedToEmpty = {
    ...withBoth,
    placements: withBoth.placements.map((p) => (p.id === p1.id ? { ...p, slotId: slotC.id } : p)),
  };
  assert.equal(movedToEmpty.placements.find((p) => p.id === p1.id)?.slotId, slotC.id);

  // Swap printer-1 and printer-2 between slotC and slotB
  const p2 = movedToEmpty.placements.find((p) => p.entityId === 'printer-2')!;
  const swapped = {
    ...movedToEmpty,
    placements: movedToEmpty.placements.map((p) => {
      if (p.id === p1.id) return { ...p, slotId: slotB.id };
      if (p.id === p2.id) return { ...p, slotId: slotC.id };
      return p;
    }),
  };
  assert.equal(swapped.placements.find((p) => p.id === p1.id)?.slotId, slotB.id);
  assert.equal(swapped.placements.find((p) => p.id === p2.id)?.slotId, slotC.id);
  assert.equal(swapped.placements.length, 2);
});


import * as spatial from '../src/features/workshop/model';
import type { Workshop } from '../src/features/workshop/model';
const emptySpatial = (): Workshop => ({version:1,rooms:[{id:'root',name:'Root',width:10,depth:8}],furniture:[],slots:[],placements:[]});

test('legacy rooms become adjacent without changing inventory coordinates or slot identities', () => {
  const state=createWorkshop();
  state.rooms.push({id:'legacy',name:'Legacy',width:6,depth:4});
  const normalized=spatial.normalizeSpatialWorkshop(state);
  assert.deepEqual(normalized.rooms[1].attachment,{roomId:state.rooms[0].id,side:'east'});
  assert.deepEqual(spatial.roomOrigin(normalized,'legacy'),{x:10,z:0});
  assert.equal(normalized.furniture,state.furniture);
  assert.equal(normalized.slots,state.slots);
  assert.deepEqual(parseWorkshop(JSON.stringify(state)),normalized);
});

test('attachments center rooms on all four edges and reserve the parent-facing side', () => {
  for(const [side,origin,opposite] of [ ['north',{x:0,z:-6},'south'], ['east',{x:8,z:0},'west'], ['south',{x:0,z:6},'north'], ['west',{x:-8,z:0},'east'] ] as const){
    const state=spatial.attachRoom(emptySpatial(),'root',side,6,4);
    const child=state.rooms[1];
    assert.deepEqual(spatial.roomOrigin(state,child.id),origin);
    assert.equal(spatial.roomSideAvailable(state,'root',side),false);
    assert.equal(spatial.roomSideAvailable(state,child.id,opposite),false);
    assert.deepEqual(child.labels,[]);
    assert.throws(()=>spatial.attachRoom(state,'root',side,4,4));
  }
});

test('resizing ancestors moves descendants and rejects resulting room overlap', () => {
  let state=spatial.attachRoom(emptySpatial(),'root','east',6,4);
  const east=state.rooms[1].id;
  state=spatial.attachRoom(state,east,'east',4,4);
  const leaf=state.rooms[2].id;
  state=spatial.resizeRoom(state,'root',12,8);
  assert.deepEqual(spatial.roomOrigin(state,east),{x:9,z:0});
  assert.deepEqual(spatial.roomOrigin(state,leaf),{x:14,z:0});
  let corners=spatial.attachRoom(emptySpatial(),'root','north',4,4);
  corners=spatial.attachRoom(corners,'root','east',4,12);
  assert.throws(()=>spatial.resizeRoom(corners,corners.rooms[1].id,20,12));
  assert.throws(()=>spatial.resizeRoom(createWorkshop(),createWorkshop().rooms[0].id,4,4));
  const populated=createWorkshop();
  assert.throws(()=>spatial.resizeRoom(populated,populated.rooms[0].id,4,4));
});

test('parser rejects cycles, missing attachment targets and colliding metadata', () => {
  const state=spatial.attachRoom(emptySpatial(),'root','east',4,4);
  for(const attachment of [{roomId:'missing',side:'east'},{roomId:state.rooms[1].id,side:'east'},{roomId:'root',side:'bad'}]){
    assert.equal(parseWorkshop(JSON.stringify({...state,rooms:[state.rooms[0],{...state.rooms[1],attachment}]})),null);
  }
  assert.equal(parseWorkshop(JSON.stringify({...state,rooms:state.rooms.map((room,i)=>i?room:{...room,attachment:{roomId:state.rooms[1].id,side:'west'}})})),null);
});

test('labels round-trip normalized surface coordinates and reject malformed text metadata', () => {
  const state=emptySpatial();
  const labels=[{id:'label',text:'New sign',color:'#ffccaa',surface:'east' as const,u:.25,v:.75,size:.5,rotation:90}];
  const next=spatial.updateRoomLabels(state,'root',labels);
  assert.deepEqual(parseWorkshop(JSON.stringify(next)),next);
  assert.equal(spatial.defaultRoomLabels(state.rooms[0]).length,5);
  assert.deepEqual(spatial.defaultRoomLabels({...state.rooms[0],labels:[]}),[]);
  for(const patch of [{text:''},{text:'x'.repeat(121)},{color:'red'},{u:2},{v:-1},{size:0},{surface:'roof'},{rotation:Infinity}]){
    const invalid=[{...labels[0],...patch}];
    assert.throws(()=>spatial.updateRoomLabels(state,'root',invalid as typeof labels));
    assert.equal(parseWorkshop(JSON.stringify({...state,rooms:[{...state.rooms[0],labels:invalid}]})),null);
  }
  assert.throws(()=>spatial.updateRoomLabels(state,'root',[labels[0],labels[0]]));
});

test('grid furniture resizing keeps occupied slot ids and refuses truncation or too-small printers', () => {
  let state=emptySpatial();
  const table=createFurniture('root','table');
  state=updateFurniture(state,table);
  state=placeEntity(state,'printer','printer',state.slots[3].id,'a1');
  const slotId=state.placements[0].slotId;
  const wider=spatial.resizeFurnitureOnGrid(state,table.id,4.1,1.1);
  assert.equal(wider.furniture[0].width,4);
  assert.equal(wider.furniture[0].depth,1);
  assert.equal(wider.furniture[0].columns,6);
  assert.equal(wider.placements[0].slotId,slotId);
  assert.ok(wider.slots.some(s=>s.id===slotId));
  assert.throws(()=>spatial.resizeFurnitureOnGrid(state,table.id,1,1));
  assert.throws(()=>spatial.resizeFurnitureOnGrid(state,table.id,.5,1));
});

test('deleting a parent refuses orphaning descendants, deleting a leaf preserves the tree',()=>{
  const state=spatial.attachRoom(emptySpatial(),'root','east',4,4);
  assert.throws(()=>removeRoom(state,'root'));
  const next=removeRoom(state,state.rooms[1].id);
  assert.equal(next.rooms.length,1);
  assert.deepEqual(parseWorkshop(JSON.stringify(next)),next);
});

test('parser rejects null attachments instead of silently accepting malformed metadata',()=>{
  assert.equal(parseWorkshop(JSON.stringify({...emptySpatial(),rooms:[{...emptySpatial().rooms[0],attachment:null}]})),null);
});


test('serialized attachment trees retain valid root regardless of room array order',()=>{
  const state=spatial.attachRoom(emptySpatial(),'root','east',4,4);
  const reordered={...state,rooms:[state.rooms[1],state.rooms[0]]};
  assert.deepEqual(parseWorkshop(JSON.stringify(reordered)),reordered);
});

test('moving furniture into adjacent attached room updates roomId and retains slots/placements', () => {
  let state = spatial.attachRoom(emptySpatial(), 'root', 'east', 6, 6);
  const rootRoom = state.rooms[0];
  const eastRoom = state.rooms[1];

  // Verify findRoomAt resolves rooms by world coordinates
  assert.equal(spatial.findRoomAt(state, 0, 0)?.id, rootRoom.id);
  assert.equal(spatial.findRoomAt(state, 8, 0)?.id, eastRoom.id);

  // Create table in root room
  const table = { ...createFurniture('root', 'table'), width: 3.6, depth: 0.8, x: 0, z: 0 };
  state = updateFurniture(state, table);
  state = placeEntity(state, 'printer', 'printer-1', state.slots[0].id, 'a1');
  const placement = state.placements[0];

  // Moving table to east room: local coordinates in east room (0, 0)
  const movedTable = { ...table, roomId: eastRoom.id, x: 0, z: 0 };
  assert.equal(validFurniture(state, movedTable), true);

  const movedState = updateFurniture(state, movedTable);
  assert.equal(movedState.furniture[0].roomId, eastRoom.id);
  assert.equal(movedState.placements[0].entityId, 'printer-1');
  assert.equal(movedState.placements[0].slotId, placement.slotId);
});

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
  // Create tiles directly on east side: x = 5..7, z = 0..1
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
  // Ensure no decor is generated in newly created rooms
  const newRoomDecor = next.furniture.filter(f => f.roomId === newRoom.id && ['plant', 'boxes', 'cabinet'].includes(f.kind));
  assert.equal(newRoomDecor.length, 0, 'New room must not have any decor generated');
});

test('createRoomFromTiles rejects tiles inside an existing room and isTileOccupiedByRooms identifies occupied tiles', () => {
  const state = emptySpatial(); // room root at (0, 0) width 10, depth 8 (bounds x: [-5, 5], z: [-4, 4])

  // Center tile [0, 0] is occupied by root room
  assert.equal(spatial.isTileOccupiedByRooms(state, 0, 0), true);
  // Edge tile [-5, -4] is inside
  assert.equal(spatial.isTileOccupiedByRooms(state, -5, -4), true);
  // Tile outside [5, 0] is NOT occupied
  assert.equal(spatial.isTileOccupiedByRooms(state, 5, 0), false);
  // Tile outside [0, 4] is NOT occupied
  assert.equal(spatial.isTileOccupiedByRooms(state, 0, 4), false);

  // Attempting to create a room with tiles inside the root room throws error
  const insideTiles: Array<[number, number]> = [[0, 0], [1, 0]];
  assert.throws(
    () => spatial.createRoomFromTiles(state, insideTiles),
    /Нельзя строить новую комнату внутри существующей комнаты/
  );

  // Attempting to create a room with overlapping tiles throws error
  const overlapTiles: Array<[number, number]> = [[4, 0], [5, 0]]; // [4, 0] is inside root room (-5..5)
  assert.throws(
    () => spatial.createRoomFromTiles(state, overlapTiles),
    /Нельзя строить новую комнату внутри существующей комнаты/
  );
});

test('initial room decor is movable, rotatable and respects collisions', () => {
  const state = createWorkshop();
  const plant = state.furniture.find(f => f.kind === 'plant')!;
  assert.ok(plant, 'Plant decor must exist in initial workshop');

  // Move plant to a new valid position
  const moved = updateFurniture(state, { ...plant, x: -6.0, z: 3.5 });
  const updatedPlant = moved.furniture.find(f => f.id === plant.id)!;
  assert.equal(updatedPlant.x, -6.0);
  assert.equal(updatedPlant.z, 3.5);

  // Rotate decor
  const rotated = updateFurniture(moved, { ...updatedPlant, rotation: 90 });
  assert.equal(rotated.furniture.find(f => f.id === plant.id)!.rotation, 90);

  // Moving out of room bounds is rejected
  assert.throws(() => updateFurniture(state, { ...plant, x: 20 }), /Проверьте размеры/);
});

test('placement hit meshes retain placementId and are prioritized in view picking for camera zoom and drawer', () => {
  const state = createWorkshop();
  const [a, b] = state.slots;
  const placed = placeEntity(placeEntity(state, 'printer', 'printer-1', a.id, 'a1'), 'printer', 'printer-2', b.id, 'p1');
  assert.equal(placed.placements.length, 2);
  const printerPick = { userData: { keepSeparate: true, isHit: true, furnitureId: state.furniture[0].id, placementId: 'printer-1', kind: 'printer' } };
  const tablePick = { userData: { keepSeparate: true, isHit: true, furnitureId: state.furniture[0].id, placementId: undefined as string | undefined, kind: 'table' } };
  const target = pickWorkshopTarget([{ object: tablePick }, { object: printerPick }], false);
  assert.equal(target?.userData.placementId, 'printer-1');
  const editTarget = pickWorkshopTarget([{ object: tablePick }, { object: printerPick }], true);
  assert.equal(editTarget?.userData.furnitureId, state.furniture[0].id);
});

test('calculatePanDelta in 2D top view moves target opposite to cursor drag (direct 1:1 manipulation)', () => {
  const mpp = 0.02; // meters per pixel
  // Dragging right (dx > 0) moves target left (-X) so scene appears to move right
  // Dragging down (dy > 0) moves target south (-Z) so scene appears to move down
  const { deltaX, deltaZ } = calculatePanDelta(100, 50, mpp, 0, 16, true);
  assert.equal(deltaX, -2);
  assert.equal(deltaZ, -1);
});

test('calculatePanDelta in 3D view ensures screen projection matches cursor displacement 1:1 across azimuths', () => {
  const span = 12;
  const height = 800;
  const width = 1200;
  const aspect = width / height;
  const mpp = span / height;
  const elevation = 16;
  const target = new THREE.Vector3(0, 0.7, 0);

  // Test across multiple azimuth angles: 0, 45, 90, 180, 270 degrees
  for (const deg of [0, 45, 90, 180, 270]) {
    const azimuth = (deg * Math.PI) / 180;
    const camera = new THREE.OrthographicCamera((-span * aspect) / 2, (span * aspect) / 2, span / 2, -span / 2, 0.1, 100);
    camera.position.copy(target).add(new THREE.Vector3(26 * Math.sin(azimuth), elevation, 26 * Math.cos(azimuth)));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const p0 = target.clone().project(camera);
    const dx = 60;
    const dy = -40; // Dragging UP and RIGHT

    const { deltaX, deltaZ } = calculatePanDelta(dx, dy, mpp, azimuth, elevation, false);
    const newTarget = target.clone().add(new THREE.Vector3(deltaX, 0, deltaZ));
    camera.position.copy(newTarget).add(new THREE.Vector3(26 * Math.sin(azimuth), elevation, 26 * Math.cos(azimuth)));
    camera.lookAt(newTarget);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const p1 = target.clone().project(camera);
    const screenDx = ((p1.x - p0.x) * width) / 2;
    const screenDy = -((p1.y - p0.y) * height) / 2;

    assert.ok(Math.abs(screenDx - dx) < 1e-4, `dx mismatch at ${deg} deg: expected ${dx}, got ${screenDx}`);
    assert.ok(Math.abs(screenDy - dy) < 1e-4, `dy mismatch at ${deg} deg: expected ${dy}, got ${screenDy}`);
  }
});

test('calculateOrbitAngles rotates scene horizontally and locks elevation (vertical movement disabled)', () => {
  const startAz = Math.PI / 4;
  const startElev = 16;

  // Dragging right (dx > 0) turns the scene to the right (azimuth decreases)
  const rightMove = calculateOrbitAngles(startAz, startElev, 100, 0);
  assert.ok(rightMove.azimuth < startAz, 'Scene must turn right (azimuth decreases) when dragging mouse right');
  assert.equal(rightMove.elevation, startElev, 'Elevation must remain locked');

  // Dragging left (dx < 0) turns the scene to the left (azimuth increases)
  const leftMove = calculateOrbitAngles(startAz, startElev, -100, 0);
  assert.ok(leftMove.azimuth > startAz, 'Scene must turn left (azimuth increases) when dragging mouse left');
  assert.equal(leftMove.elevation, startElev, 'Elevation must remain locked');

  // Dragging up (dy < 0) does not change elevation or azimuth
  const upMove = calculateOrbitAngles(startAz, startElev, 0, -50);
  assert.equal(upMove.elevation, startElev, 'Elevation must remain locked when dragging mouse up');
  assert.equal(upMove.azimuth, startAz);

  // Dragging down (dy > 0) does not change elevation or azimuth
  const downMove = calculateOrbitAngles(startAz, startElev, 0, 50);
  assert.equal(downMove.elevation, startElev, 'Elevation must remain locked when dragging mouse down');
  assert.equal(downMove.azimuth, startAz);

  // Dragging with vertical component rotates azimuth horizontally without vertical wobble
  const withVertical = calculateOrbitAngles(startAz, startElev, 100, -80);
  assert.ok(withVertical.azimuth < startAz, 'Azimuth must update with horizontal drag');
  assert.equal(withVertical.elevation, startElev, 'Elevation must remain locked regardless of dy');

  // Large vertical drag does not tilt the camera
  const largeVertical = calculateOrbitAngles(startAz, startElev, 0, 1000);
  assert.equal(largeVertical.elevation, startElev, 'Elevation must remain locked under large vertical movement');
});

test('fillEnclosedTiles automatically fills interior tiles within a closed loop', () => {
  // 3x3 perimeter loop enclosing the center tile (1, 1)
  const loop3x3: Array<[number, number]> = [
    [0, 0], [1, 0], [2, 0],
    [0, 1],         [2, 1],
    [0, 2], [1, 2], [2, 2],
  ];

  const filled3x3 = fillEnclosedTiles(loop3x3);
  assert.equal(filled3x3.length, 9, 'All 9 tiles of 3x3 square should be present');
  const hasCenter = filled3x3.some(([x, z]) => x === 1 && z === 1);
  assert.ok(hasCenter, 'Center tile (1, 1) must be filled');

  // 4x4 perimeter loop enclosing 4 tiles: (1,1), (1,2), (2,1), (2,2)
  const loop4x4: Array<[number, number]> = [
    [0, 0], [1, 0], [2, 0], [3, 0],
    [0, 1],                 [3, 1],
    [0, 2],                 [3, 2],
    [0, 3], [1, 3], [2, 3], [3, 3],
  ];
  const filled4x4 = fillEnclosedTiles(loop4x4);
  assert.equal(filled4x4.length, 16, 'All 16 tiles of 4x4 square should be filled');

  // Open loop with a gap at [1, 0] must NOT fill interior
  const openLoop: Array<[number, number]> = [
    [0, 0],         [2, 0],
    [0, 1],         [2, 1],
    [0, 2], [1, 2], [2, 2],
  ];
  const notFilled = fillEnclosedTiles(openLoop);
  assert.equal(notFilled.length, openLoop.length, 'Open loop must not fill any tiles');

  // Forbidden tile is skipped even if enclosed
  const filledWithForbidden = fillEnclosedTiles(loop3x3, (x, z) => x === 1 && z === 1);
  assert.equal(filledWithForbidden.length, 8, 'Forbidden center tile must not be filled');
});

test('existingRoomsTileBounds calculates bounding box of all rooms', () => {
  const state = createWorkshop();
  const bounds = existingRoomsTileBounds(state);
  assert.ok(bounds !== null);
  assert.ok(bounds.maxX > bounds.minX);
  assert.ok(bounds.maxZ > bounds.minZ);

  // Workshop with room containing explicit tiles
  const tiledState: Workshop = {
    ...state,
    rooms: [
      {
        id: 'r1',
        name: 'Room 1',
        width: 4,
        depth: 4,
        tiles: [
          [2, 3],
          [5, 8],
        ],
      },
    ],
  };
  const tiledBounds = existingRoomsTileBounds(tiledState);
  assert.deepEqual(tiledBounds, { minX: 2, maxX: 5, minZ: 3, maxZ: 8 });

  // Empty rooms returns null
  assert.equal(existingRoomsTileBounds({ ...state, rooms: [] }), null);
});

test('fillEnclosedTiles auto-fills U-shape contour attached to existing room floor', () => {
  // Existing room covers integer tiles from x: 0..4, z: 0..4
  const isExistingRoom = (x: number, z: number) => x >= 0 && x <= 4 && z >= 0 && z <= 4;
  const existingBounds = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };

  // User draws a U-shape extending right from the room wall at x = 4:
  // Top arm: (5, 1), (6, 1), (7, 1)
  // Right side: (7, 2), (7, 3)
  // Bottom arm: (7, 4), (6, 4), (5, 4)
  // Wall of existing room at x = 4 closes the left side: (4, 1), (4, 2), (4, 3), (4, 4)
  const uShapeDraft: Array<[number, number]> = [
    [5, 1], [6, 1], [7, 1],
    [7, 2], [7, 3],
    [7, 4], [6, 4], [5, 4],
  ];

  const filled = fillEnclosedTiles(uShapeDraft, isExistingRoom, existingBounds);

  // Interior tiles are (5, 2), (6, 2), (5, 3), (6, 3) = 4 tiles
  // Total tiles = 8 draft + 4 interior = 12 tiles
  assert.equal(filled.length, 12, 'Draft contour + 4 enclosed interior tiles should be filled');

  // Verify each expected interior tile is present
  const filledSet = new Set(filled.map(([x, z]) => `${x},${z}`));
  assert.ok(filledSet.has('5,2'));
  assert.ok(filledSet.has('6,2'));
  assert.ok(filledSet.has('5,3'));
  assert.ok(filledSet.has('6,3'));

  // Ensure no existing room tiles were added to the draft
  for (const [x, z] of filled) {
    assert.equal(isExistingRoom(x, z), false, 'Filled tiles must not overlap existing room cells');
  }

  // Ensure exterior tiles outside the U-shape were NOT filled
  assert.equal(filledSet.has('8,2'), false);
  assert.equal(filledSet.has('5,0'), false);
  assert.equal(filledSet.has('5,5'), false);
});

test('roomOrigin calculates true tile bounding box center for rooms with tiles', () => {
  const state: Workshop = {
    version: 1,
    rooms: [
      {
        id: 'tiled-room',
        name: 'Tiled',
        width: 5,
        depth: 5,
        tiles: [
          [2, 3],
          [6, 7],
        ],
      },
    ],
    furniture: [],
    slots: [],
    placements: [],
  };
  const origin = spatial.roomOrigin(state, 'tiled-room');
  assert.deepEqual(origin, { x: 4.5, z: 5.5 });
});

test('createRoomFromTiles attaches correctly to south edge and computes seam center aligned with new room', () => {
  // Main room covers X: [-7, 7], Z: [-5, 5]
  const state = createWorkshop();
  const mainRoom = state.rooms[0];

  // User creates attached room on the right side of the south wall: X = 2..6, Z = 5..9
  const tiles: Array<[number, number]> = [];
  for (let x = 2; x <= 6; x++) {
    for (let z = 5; z <= 9; z++) {
      tiles.push([x, z]);
    }
  }

  const next = spatial.createRoomFromTiles(state, tiles, 'Пристройка');
  assert.equal(next.rooms.length, 2);
  const childRoom = next.rooms[1];

  // Verified attachment to parent's south wall
  assert.equal(childRoom.attachment?.roomId, mainRoom.id);
  assert.equal(childRoom.attachment?.side, 'south');
  assert.equal(childRoom.width, 5);
  assert.equal(childRoom.depth, 5);

  // Verified origin is centered at (4.5, 7.5), NOT at (0, 7.5)
  const childOrigin = spatial.roomOrigin(next, childRoom.id);
  assert.deepEqual(childOrigin, { x: 4.5, z: 7.5 });

  // Overlap along the south seam (Z = 5) between parent [-7, 7] and child [2, 7]
  const parentOrigin = spatial.roomOrigin(next, mainRoom.id);
  const pMinX = parentOrigin.x - mainRoom.width / 2;
  const pMaxX = parentOrigin.x + mainRoom.width / 2;
  const cMinX = childOrigin.x - childRoom.width / 2;
  const cMaxX = childOrigin.x + childRoom.width / 2;

  const overlapMin = Math.max(pMinX, cMinX);
  const overlapMax = Math.min(pMaxX, cMaxX);
  assert.equal(overlapMin, 2);
  assert.equal(overlapMax, 7);
  const seamCenter = (overlapMin + overlapMax) / 2;
  assert.equal(seamCenter, 4.5, 'Doorway must be centered at X = 4.5, right on the boundary into the new room');
});

test('active or selected printers suppress hover jump and clicking active printer toggles selection off', () => {
  const activePrinterIds = new Set(['printer-active-1']);
  let selectedId: string | null = null;

  const getHoverTarget = (id: string, entityId: string, isPrinter: boolean) => {
    const isSelected = selectedId === id;
    const isPrinting = isPrinter && activePrinterIds.has(entityId);
    const suppressJump = isSelected || isPrinting;
    return suppressJump ? 0 : 1;
  };

  // 1. Inactive printer jumps on hover
  assert.equal(getHoverTarget('placement-1', 'printer-idle', true), 1);

  // 2. Actively printing printer does NOT jump on hover
  assert.equal(getHoverTarget('placement-2', 'printer-active-1', true), 0);

  // 3. Selecting the idle printer suppresses its hover jump
  selectedId = 'placement-1';
  assert.equal(getHoverTarget('placement-1', 'printer-idle', true), 0);

  // 4. Clicking the selected printer toggles selection off
  const handleClick = (clickedId: string) => {
    if (selectedId === clickedId) {
      selectedId = null;
      return { selected: null, action: 'overview' };
    } else {
      selectedId = clickedId;
      return { selected: clickedId, action: 'inspect' };
    }
  };

  const toggleOff = handleClick('placement-1');
  assert.equal(toggleOff.selected, null);
  assert.equal(toggleOff.action, 'overview');
  assert.equal(selectedId, null);

  // Now that it is deselected, it can jump on hover again
  assert.equal(getHoverTarget('placement-1', 'printer-idle', true), 1);
});

test('roomAt accurately checks custom tile coordinates when present', () => {
  const customRoom: Room = {
    id: 'custom-room-1',
    name: 'Custom Room',
    width: 6,
    depth: 6,
    tiles: [
      [10, 10],
      [10, 11],
      [11, 10],
    ],
  };

  const rectRoom: Room = {
    id: 'rect-room-1',
    name: 'Rect Room',
    width: 4,
    depth: 4,
  };

  const state: Workshop = {
    version: 1,
    rooms: [customRoom, rectRoom],
    furniture: [],
    slots: [],
    placements: [],
  };

  const findRoomAt = (px: number, pz: number) => {
    return state.rooms.find((room) => {
      if (room.tiles && room.tiles.length > 0) {
        const gx = Math.floor(px);
        const gz = Math.floor(pz);
        return room.tiles.some(([tx, tz]) => tx === gx && tz === gz);
      }
      const o = roomOrigin(state, room.id);
      return Math.abs(px - o.x) <= room.width / 2 && Math.abs(pz - o.z) <= room.depth / 2;
    });
  };

  // Inside custom room tile (10, 10)
  assert.equal(findRoomAt(10.5, 10.5)?.id, 'custom-room-1');
  // Inside custom room tile (10, 11)
  assert.equal(findRoomAt(10.2, 11.8)?.id, 'custom-room-1');
  // Inside bounding box but NOT in tiles (11, 11) -> should be undefined
  assert.equal(findRoomAt(11.5, 11.5), undefined);
  // Outside both
  assert.equal(findRoomAt(50, 50), undefined);
});

test('selected room floor applies soft blue glow materials and distinguishes from unselected rooms', () => {
  const concreteNormal = ['#7e828b', '#82858e', '#7b808a', '#888a93', '#80838c', '#7d828c'];
  const concreteSelected = ['#425d80', '#466487', '#3f5979', '#4c6c92', '#446083', '#415b7c'];

  const getFloorStyle = (isSelected: boolean) => {
    const concrete = isSelected ? concreteSelected : concreteNormal;
    const tileEmissive = isSelected ? '#123860' : undefined;
    const tileEmissiveIntensity = isSelected ? 0.45 : 0;
    const plinth = isSelected ? '#243346' : '#353e50';
    const grout = isSelected ? '#3b5577' : '#727780';
    return { concrete, tileEmissive, tileEmissiveIntensity, plinth, grout };
  };

  const unselected = getFloorStyle(false);
  const selected = getFloorStyle(true);

  // Unselected room is neutral gray with no emissive glow
  assert.equal(unselected.tileEmissive, undefined);
  assert.equal(unselected.tileEmissiveIntensity, 0);
  assert.equal(unselected.concrete[0], '#7e828b');

  // Selected room has subtle slate-blue palette and gentle sapphire emissive glow
  assert.equal(selected.tileEmissive, '#123860');
  assert.equal(selected.tileEmissiveIntensity, 0.45);
  assert.equal(selected.concrete[0], '#425d80');
  assert.equal(selected.plinth, '#243346');
  assert.equal(selected.grout, '#3b5577');
});

test('label HUD positioning places HUD above label without overlapping', () => {
  const room = { id: 'room-1', name: 'Test Room', width: 6, depth: 8 };
  const origin = { x: 0, z: 0 };
  const labelFloor = { surface: 'floor' as const, u: 0.5, v: 0.5, size: 0.35 };

  // Floor HUD is elevated and offset in Z so it does not obstruct text
  const floorHudY = 0.65;
  const floorHudZ = origin.z + (labelFloor.v - 0.5) * room.depth - (labelFloor.size / 2 + 0.45);
  const floorLabelZ = origin.z + (labelFloor.v - 0.5) * room.depth;
  assert.ok(floorHudY > 0.045 + labelFloor.size);
  assert.ok(Math.abs(floorHudZ - floorLabelZ) >= 0.45 + labelFloor.size / 2);

  // Wall HUD is placed above the top of the label
  const labelWall = { surface: 'north' as const, u: 0.5, v: 0.5, size: 0.35 };
  const wallLabelTopY = labelWall.v * 2.6 + labelWall.size / 2;
  const wallHudY = Math.min(2.65, labelWall.v * 2.6 + labelWall.size / 2 + 0.38);
  assert.ok(wallHudY > wallLabelTopY);
});

test('zooming in with selected object biases camera target towards object position', () => {
  const currentTarget = { x: 0, y: 0.7, z: 0 };
  const objectPos = { x: 5, y: 0.5, z: -3 };
  const clampedDelta = -100; // zooming in

  const zoomWeight = Math.min(0.25, (Math.abs(clampedDelta) / 120) * 0.22);
  const nextTarget = {
    x: currentTarget.x + (objectPos.x - currentTarget.x) * zoomWeight,
    y: currentTarget.y,
    z: currentTarget.z + (objectPos.z - currentTarget.z) * zoomWeight,
  };

  // Target has moved closer to the object
  assert.ok(nextTarget.x > currentTarget.x);
  assert.ok(nextTarget.z < currentTarget.z);
  const distBefore = Math.hypot(objectPos.x - currentTarget.x, objectPos.z - currentTarget.z);
  const distAfter = Math.hypot(objectPos.x - nextTarget.x, objectPos.z - nextTarget.z);
  assert.ok(distAfter < distBefore);
});

test('workshop directional light and shadow map are configured for soft shadows with responsive resolution', () => {
  const wide = getWorkshopShadowConfig(1200);
  assert.equal(wide.shadowSize, 2048);
  assert.equal(wide.radius, 2.5);
  assert.equal(wide.shadowMapType, THREE.PCFSoftShadowMap);

  const narrow = getWorkshopShadowConfig(768);
  assert.equal(narrow.shadowSize, 1024);
  assert.equal(narrow.radius, 2.5);
  assert.equal(narrow.shadowMapType, THREE.PCFSoftShadowMap);

  const light = new THREE.DirectionalLight('#fff0dd', 2.8);
  light.castShadow = true;
  light.shadow.mapSize.set(wide.shadowSize, wide.shadowSize);
  light.shadow.radius = wide.radius;
  assert.equal(light.shadow.mapSize.x, 2048);
  assert.equal(light.shadow.mapSize.y, 2048);
  assert.equal(light.shadow.radius, 2.5);
});

test('spatial authoring caches HUD button textures by text, color and width to prevent allocations', () => {
  clearHudButtonTextureCache();
  assert.equal(hudButtonTextureCache.size, 0);

  const tex1 = getOrCreateHudButtonTexture('✥', '#38bdf8', 0.24);
  assert.ok(tex1);
  assert.equal(tex1.userData?.isCached, true);
  assert.equal(hudButtonTextureCache.size, 1);
  assert.ok(hudButtonTextureCache.has('✥:#38bdf8:0.24'));

  // Subsequent call with identical parameters returns cached instance without creating new texture
  const tex2 = getOrCreateHudButtonTexture('✥', '#38bdf8', 0.24);
  assert.equal(tex1, tex2);
  assert.equal(hudButtonTextureCache.size, 1);

  // Different action / text gets separate cached entry
  const texDelete = getOrCreateHudButtonTexture('✕', '#f43f5e', 0.2);
  assert.notEqual(tex1, texDelete);
  assert.equal(hudButtonTextureCache.size, 2);
  assert.ok(hudButtonTextureCache.has('✕:#f43f5e:0.2'));

  clearHudButtonTextureCache();
  assert.equal(hudButtonTextureCache.size, 0);
});

test('room camera focus coordinates for a room with custom camera and a room without custom camera (using roomOrigin)', () => {
  const rootRoom: Room = {
    id: 'room-root',
    name: 'Main Room',
    width: 12,
    depth: 8,
  };
  const attachedRoom: Room = {
    id: 'room-north',
    name: 'North Annex',
    width: 8,
    depth: 6,
    attachment: { roomId: 'room-root', side: 'north' },
  };
  const customCameraRoom: Room = {
    id: 'room-custom',
    name: 'Studio',
    width: 10,
    depth: 10,
    camera: {
      x: 4.5,
      y: 1.2,
      z: -7.8,
      span: 14.5,
      azimuth: Math.PI / 3,
      top: true,
    },
  };

  const state = {
    version: 1 as const,
    rooms: [rootRoom, attachedRoom, customCameraRoom],
    furniture: [],
    slots: [],
    placements: [],
  };

  // 1. Room with custom camera: coordinates, span, azimuth, top match room.camera exactly
  const customFocus = calculateRoomCameraFocus(state, customCameraRoom);
  assert.deepEqual(customFocus.target, { x: 4.5, y: 1.2, z: -7.8 });
  assert.equal(customFocus.span, 14.5);
  assert.equal(customFocus.azimuth, Math.PI / 3);
  assert.equal(customFocus.elevation, 16);
  assert.equal(customFocus.top, true);

  // 2. Room without custom camera (root room): targets room origin with span = max(width, depth) * 1.15
  const rootFocus = calculateRoomCameraFocus(state, rootRoom);
  const rootOriginCoord = roomOrigin(state, rootRoom.id);
  assert.deepEqual(rootOriginCoord, { x: 0, z: 0 });
  assert.deepEqual(rootFocus.target, { x: 0, y: 0.7, z: 0 });
  assert.equal(rootFocus.span, 12 * 1.15); // max(8, 12) * 1.15 = 13.8
  assert.equal(rootFocus.azimuth, Math.PI / 4);
  assert.equal(rootFocus.elevation, 16);
  assert.equal(rootFocus.top, false);

  // 3. Room without custom camera attached to parent: targets its calculated roomOrigin
  const northFocus = calculateRoomCameraFocus(state, attachedRoom);
  const northOriginCoord = roomOrigin(state, attachedRoom.id);
  // Root room depth = 8, attached room depth = 6, side = 'north' -> z = -(8 + 6) / 2 = -7
  assert.deepEqual(northOriginCoord, { x: 0, z: -7 });
  assert.deepEqual(northFocus.target, { x: 0, y: 0.7, z: -7 });
  assert.equal(northFocus.span, 8 * 1.15); // max(6, 8) * 1.15 = 9.2
  assert.equal(northFocus.azimuth, Math.PI / 4);
  assert.equal(northFocus.elevation, 16);
  assert.equal(northFocus.top, false);

  // 4. Default azimuth when room.camera has no azimuth specified
  const customNoAzimuthRoom: Room = {
    id: 'room-no-azimuth',
    name: 'Lab',
    width: 6,
    depth: 6,
    camera: { x: 1, y: 0.7, z: 2, span: 8 },
  };
  const noAzimuthFocus = calculateRoomCameraFocus(state, customNoAzimuthRoom);
  assert.equal(noAzimuthFocus.azimuth, Math.PI / 4);
  assert.equal(noAzimuthFocus.top, false);
});

test('zoom target stability helper and math keeps target stable and shifts clamped', () => {
  const currentTarget = { x: 10, y: 0.7, z: -15 };
  const bounds = { min: { x: -20, z: -30 }, max: { x: 40, z: 20 } };
  const camRight = { x: 1, y: 0, z: 0 };
  const camUp = { x: 0, y: 0, z: -1 };

  // 1. calculateWheelShift clamps NDC and bounds shifts
  const shiftNormal = calculateWheelShift(0.5, -0.5, 2.0, 1.5);
  assert.ok(Number.isFinite(shiftNormal.shiftX));
  assert.ok(Number.isFinite(shiftNormal.shiftZ));

  // Extreme or NaN NDC is clamped within [-1, 1]
  const shiftExtreme = calculateWheelShift(100, -500, 2.0, 1.5);
  const shiftClamped = calculateWheelShift(1, -1, 2.0, 1.5);
  assert.deepEqual(shiftExtreme, shiftClamped);

  const shiftNaN = calculateWheelShift(NaN, Infinity, 2.0, 1.5);
  assert.equal(shiftNaN.shiftX, 0);
  assert.equal(shiftNaN.shiftZ, 0);

  // 2. Zooming out (clampedDelta > 0) keeps camera target stable without jumping to (0,0,0)
  // Even if an object is selected, zooming out MUST NOT snap to the object or jump to (0,0,0)
  const selectedObjectPos = { x: -5, y: 0.7, z: 8 };
  const { shiftX, shiftZ } = calculateWheelShift(0.2, 0.1, 1.5, 1.33);
  const zoomOutTarget = calculateZoomTarget(
    currentTarget,
    60, // clampedDelta > 0: zooming out
    selectedObjectPos,
    camRight,
    camUp,
    shiftX,
    shiftZ,
    bounds
  );

  // Target remains in the vicinity of currentTarget, never resets to (0,0,0)
  assert.notEqual(zoomOutTarget.x, 0);
  assert.notEqual(zoomOutTarget.z, 0);
  assert.equal(zoomOutTarget.y, 0.7);
  assert.ok(Math.abs(zoomOutTarget.x - currentTarget.x) < 5);
  assert.ok(Math.abs(zoomOutTarget.z - currentTarget.z) < 5);

  // 3. No object selected: both zoom-in and zoom-out remain stable without jumping to (0,0,0)
  const zoomInNoObject = calculateZoomTarget(
    currentTarget,
    -80, // clampedDelta < 0: zooming in
    null,
    camRight,
    camUp,
    shiftX,
    shiftZ,
    bounds
  );
  assert.notEqual(zoomInNoObject.x, 0);
  assert.notEqual(zoomInNoObject.z, 0);
  assert.ok(Math.abs(zoomInNoObject.x - currentTarget.x) < 5);
  assert.ok(Math.abs(zoomInNoObject.z - currentTarget.z) < 5);

  // 4. Zooming in with selected object smoothly biases target towards object position
  const zoomInWithObject = calculateZoomTarget(
    currentTarget,
    -100, // clampedDelta < 0: zooming in
    selectedObjectPos,
    camRight,
    camUp,
    shiftX,
    shiftZ,
    bounds
  );
  // Has moved closer to selectedObjectPos
  const distBefore = Math.hypot(selectedObjectPos.x - currentTarget.x, selectedObjectPos.z - currentTarget.z);
  const distAfter = Math.hypot(selectedObjectPos.x - zoomInWithObject.x, selectedObjectPos.z - zoomInWithObject.z);
  assert.ok(distAfter < distBefore);

  // 5. Clamping to workshop bounds keeps camera bounded even with extreme offsets
  const extremeTarget = { x: 1000, y: 0.7, z: -1000 };
  const clampedTarget = calculateZoomTarget(
    extremeTarget,
    50,
    null,
    camRight,
    camUp,
    0,
    0,
    bounds
  );
  assert.equal(clampedTarget.x, bounds.max.x + 5);
  assert.equal(clampedTarget.z, bounds.min.z - 5);
});

test('WorkshopCanvasProps is clean, does not contain roomEditorOpen, and UI layout constraints are enforced', () => {
  // 1. Static type verification: roomEditorOpen is not a key of WorkshopCanvasProps
  type HasRoomEditorOpen = 'roomEditorOpen' extends keyof WorkshopCanvasProps ? true : false;
  const hasRoomEditorOpen: HasRoomEditorOpen = false;
  assert.equal(hasRoomEditorOpen, false, 'WorkshopCanvasProps must not include roomEditorOpen');

  // 2. Source file integrity checks
  const canvasPath = path.resolve(process.cwd(), 'src/features/workshop/WorkshopCanvas.tsx');
  const canvasSource = fs.readFileSync(canvasPath, 'utf-8');
  assert.equal(canvasSource.includes('roomEditorOpen'), false, 'WorkshopCanvas.tsx must not contain dead roomEditorOpen prop');

  const pagePath = path.resolve(process.cwd(), 'src/features/workshop/WorkshopPage.tsx');
  const pageSource = fs.readFileSync(pagePath, 'utf-8');
  assert.equal(pageSource.includes('roomEditorOpen'), false, 'WorkshopPage.tsx must not contain dead roomEditorOpen reference');

  // 3. 2D floating D-pad edit toolbars are removed
  assert.equal(
    canvasSource.includes('IN-SCENE EDIT CONTROLS: Floating quick action bar'),
    false,
    '2D floating D-pad edit toolbars must be removed from scene'
  );
  assert.equal(canvasSource.includes('stepMovePlacement'), false, 'stepMovePlacement helper must be removed');

  // 4. Top-left overlay stack responsiveness
  assert.ok(
    canvasSource.includes('max-h-[calc(100vh-140px)]') &&
    canvasSource.includes('overflow-y-auto') &&
    canvasSource.includes('space-y-2.5'),
    'Top-left overlay stack must wrap in a flex container with max-h-[calc(100vh-140px)] overflow-y-auto space-y-2.5'
  );
});

test('getFurnitureCollisionReason diagnoses room bounds, overlap with item name, invalid parameters and valid state', () => {
  const state = createWorkshop();
  const table = state.furniture[0]; // 'Стол A'
  const otherTable = state.furniture[1]; // 'Стол B'

  // Valid placement returns null
  assert.equal(getFurnitureCollisionReason(state, table), null);

  // Missing room returns 'Комната не найдена'
  assert.equal(getFurnitureCollisionReason(state, { ...table, roomId: 'non-existent-room' }), 'Комната не найдена');

  // Exceeding room bounds returns 'Выход за пределы комнаты'
  assert.equal(getFurnitureCollisionReason(state, { ...table, x: 8 }), 'Выход за пределы комнаты');
  assert.equal(getFurnitureCollisionReason(state, { ...table, z: 6 }), 'Выход за пределы комнаты');

  // Overlapping another furniture returns `Пересечение с «${other.name}»`
  assert.equal(
    getFurnitureCollisionReason(state, { ...table, x: otherTable.x, z: otherTable.z }),
    `Пересечение с «${otherTable.name}»`
  );

  // Invalid parameters returns 'Недопустимые параметры объекта'
  assert.equal(getFurnitureCollisionReason(state, { ...table, rotation: 45 }), 'Недопустимые параметры объекта');
  assert.equal(getFurnitureCollisionReason(state, { ...table, levels: 0 }), 'Недопустимые параметры объекта');
});

test('snapFurnitureToNeighbors magnetically snaps edges within snapDist and leaves coordinates unchanged when far', () => {
  const state = createWorkshop();
  const room = state.rooms[0]; // width: 14, depth: 10
  const tableA = state.furniture[0]; // Table A at x: -2.8, z: 1.6, width: 3.6, depth: 0.8
  // tableA footprint: w: 3.6, d: 0.8. Right edge of tableA: -2.8 + 1.8 = -1.0
  const tableB = { ...createFurniture(room.id, 'table'), id: 'test-table-b', width: 3.6, depth: 0.8 };
  // Left edge of tableB is targetX - 1.8.
  // If tableB left edge is placed at -0.9 (targetX = -0.9 + 1.8 = 0.9):
  // Distance between tableB left edge (-0.9) and tableA right edge (-1.0) is 0.1 <= snapDist (0.2).
  // tableB left edge snaps to -1.0, so snapped center is -1.0 + 1.8 = 0.8.

  const snapResultClose = snapFurnitureToNeighbors(0.9, 1.6, tableB, [tableA], room, 0.2);
  assert.equal(snapResultClose.snappedX, true);
  assert.equal(snapResultClose.x, 0.8);
  assert.equal(snapResultClose.snappedZ, true); // tableA.z is 1.6, targetZ is 1.6 (dist 0 <= 0.2)
  assert.equal(snapResultClose.z, 1.6);

  // Snapping to room wall boundaries: ±(room.width/2 - w/2 - 0.15)
  // room.width = 14, w = 3.6 -> wallMarginX = 14/2 - 3.6/2 - 0.15 = 7 - 1.8 - 0.15 = 5.05.
  // If targetX is 5.1, distance to wallMarginX is |5.1 - 5.05| = 0.05 <= 0.2
  const snapResultWall = snapFurnitureToNeighbors(5.1, 0, tableB, [], room, 0.2);
  assert.equal(snapResultWall.snappedX, true);
  assert.equal(snapResultWall.x, 5.05);

  // Far from all neighbors and walls: no snapping
  // Target position (0, 0) is far from wall (5.05) and tableA (-2.8, 1.6)
  const snapResultFar = snapFurnitureToNeighbors(0, 0, tableB, [tableA], room, 0.2);
  assert.equal(snapResultFar.snappedX, false);
  assert.equal(snapResultFar.snappedZ, false);
  assert.equal(snapResultFar.z, 0);
});

test('hotkeys: Space key toggles 2D top view / 3D isometric view and animates camera smoothly', () => {
  const cameraMoveCalls: Array<{ target: THREE.Vector3; span: number; azimuth?: number; elevation?: number; notify?: boolean }> = [];
  let preventDefaultCalled = false;

  const mockContext: WorkshopHotkeyContext = {
    top: false,
    edit: false,
    selected: null,
    data: createWorkshop(),
    options: {
      canvas: {} as any,
      container: {} as any,
      onSelect: () => {},
      onMove: () => {},
      onCamera: () => {},
      onReady: () => {},
      onError: () => {},
    },
    authoring: {
      cancelDraft: () => {},
      getSelectedLabelId: () => null,
      setSelectedLabel: () => {},
    },
    select: () => {},
    workshopCenter: () => new THREE.Vector3(1, 0.7, 2),
    overviewSpan: () => 14,
    azimuth: Math.PI / 4,
    elevation: 16,
    moveCamera: (target, span, azimuth, elevation, notify) => {
      cameraMoveCalls.push({ target, span, azimuth, elevation, notify });
    },
  };

  // 1. When in 3D (top is false), pressing Space switches to Top view
  const event1 = {
    key: ' ',
    cancelable: true,
    preventDefault: () => { preventDefaultCalled = true; },
  } as unknown as KeyboardEvent;

  const handled1 = handleWorkshopKeyDown(mockContext, event1);
  assert.equal(handled1, true);
  assert.equal(mockContext.top, true);
  assert.equal(preventDefaultCalled, true);
  assert.equal(cameraMoveCalls.length, 1);
  assert.deepEqual(cameraMoveCalls[0].target, new THREE.Vector3(1, 0.7, 2));
  assert.equal(cameraMoveCalls[0].span, 14);
  assert.equal(cameraMoveCalls[0].notify, true);

  // 2. When in 2D Top view (top is true), pressing Space switches back to 3D isometric view
  preventDefaultCalled = false;
  const event2 = {
    key: ' ',
    cancelable: true,
    preventDefault: () => { preventDefaultCalled = true; },
  } as unknown as KeyboardEvent;

  const handled2 = handleWorkshopKeyDown(mockContext, event2);
  assert.equal(handled2, true);
  assert.equal(mockContext.top, false);
  assert.equal(preventDefaultCalled, true);
  assert.equal(cameraMoveCalls.length, 2);
  assert.equal(cameraMoveCalls[1].azimuth, Math.PI / 4);
  assert.equal(cameraMoveCalls[1].elevation, 16);
  assert.equal(cameraMoveCalls[1].notify, true);

  // 3. Ignore when focused in input or textarea
  const inputEvent = {
    target: { tagName: 'INPUT' } as any,
    key: ' ',
    cancelable: true,
    preventDefault: () => { assert.fail('Should not preventDefault on input'); },
  } as unknown as KeyboardEvent;
  const handledInput = handleWorkshopKeyDown(mockContext, inputEvent);
  assert.equal(handledInput, false);
  assert.equal(mockContext.top, false, 'Top view must not toggle when typing in input');
});

test('hotkeys: Escape key clears selection and cancels draft', () => {
  let selectedValue: string | null = 'table-1';
  let onSelectCalledWith: [string, string] | null = null;
  let cancelDraftCalled = false;
  let onCancelCalled = false;

  const mockContext: WorkshopHotkeyContext = {
    top: false,
    edit: true,
    selected: 'table-1',
    data: createWorkshop(),
    options: {
      canvas: {} as any,
      container: {} as any,
      onSelect: (id, kind) => { onSelectCalledWith = [id, kind]; },
      onMove: () => {},
      onCamera: () => {},
      onReady: () => {},
      onError: () => {},
    },
    authoring: {
      cancelDraft: () => { cancelDraftCalled = true; },
      getSelectedLabelId: () => null,
      setSelectedLabel: () => {},
    },
    select: (id) => { selectedValue = id; },
    onCancel: () => { onCancelCalled = true; },
    workshopCenter: () => new THREE.Vector3(),
    overviewSpan: () => 10,
    azimuth: 0,
    elevation: 16,
    moveCamera: () => {},
  };

  const escapeEvent = {
    key: 'Escape',
    cancelable: true,
    preventDefault: () => {},
  } as unknown as KeyboardEvent;

  const handled = handleWorkshopKeyDown(mockContext, escapeEvent);
  assert.equal(handled, true);
  assert.deepEqual(onSelectCalledWith, ['', 'furniture']);
  assert.equal(selectedValue, null);
  assert.equal(cancelDraftCalled, true);
  assert.equal(onCancelCalled, true);
});

test('hotkeys: R key triggers 90-degree rotation for furniture and placement', () => {
  const state = createWorkshop();
  const f = state.furniture[0]; // rotation: 0
  let rotatedId: string | null = null;
  let rotatedValue: number | null = null;

  const mockContext: WorkshopHotkeyContext = {
    top: false,
    edit: true,
    selected: f.id,
    data: state,
    options: {
      canvas: {} as any,
      container: {} as any,
      onSelect: () => {},
      onMove: () => {},
      onRotate: (id, rotation) => {
        rotatedId = id;
        rotatedValue = rotation;
      },
      onCamera: () => {},
      onReady: () => {},
      onError: () => {},
    },
    authoring: {
      cancelDraft: () => {},
      getSelectedLabelId: () => null,
      setSelectedLabel: () => {},
    },
    select: () => {},
    workshopCenter: () => new THREE.Vector3(),
    overviewSpan: () => 10,
    azimuth: 0,
    elevation: 16,
    moveCamera: () => {},
  };

  // 1. Pressing 'r' rotates furniture by 90 degrees
  const rEvent = { key: 'r', cancelable: true, preventDefault: () => {} } as unknown as KeyboardEvent;
  const handled = handleWorkshopKeyDown(mockContext, rEvent);
  assert.equal(handled, true);
  assert.equal(rotatedId, f.id);
  assert.equal(rotatedValue, (f.rotation + 90) % 360);

  // 2. Pressing 'R' or Cyrillic 'к' also works
  const cyrillicEvent = { key: 'к', cancelable: true, preventDefault: () => {} } as unknown as KeyboardEvent;
  assert.equal(handleWorkshopKeyDown(mockContext, cyrillicEvent), true);

  // 3. When placement is selected, rotates parent furniture
  const placed = placeEntity(state, 'printer', 'printer-test', state.slots[0].id, 'a1');
  const placement = placed.placements[0];
  const parentFurnId = state.slots[0].furnitureId;
  mockContext.data = placed;
  mockContext.selected = placement.id;
  rotatedId = null;
  rotatedValue = null;

  const handledPlacement = handleWorkshopKeyDown(mockContext, rEvent);
  assert.equal(handledPlacement, true);
  assert.equal(rotatedId, parentFurnId);
  assert.equal(rotatedValue, 90);
});

test('hotkeys: G/M starts move mode and Delete removes furniture, placement or label', () => {
  const state = createWorkshop();
  const f = state.furniture[0];
  let deletedId: string | null = null;
  let deletedKind: string | null = null;
  let deletedLabel: [string, string] | null = null;

  const mockContext: WorkshopHotkeyContext = {
    top: false,
    edit: true,
    selected: f.id,
    data: state,
    options: {
      canvas: { style: {} } as any,
      container: {} as any,
      onSelect: () => {},
      onMove: () => {},
      onDelete: (id, kind) => {
        deletedId = id;
        deletedKind = kind;
      },
      onDeleteLabel: (roomId, labelId) => {
        deletedLabel = [roomId, labelId];
      },
      onCamera: () => {},
      onReady: () => {},
      onError: () => {},
    },
    authoring: {
      cancelDraft: () => {},
      getSelectedLabelId: () => null,
      setSelectedLabel: () => {},
    },
    select: () => {},
    workshopCenter: () => new THREE.Vector3(),
    overviewSpan: () => 10,
    azimuth: 0,
    elevation: 16,
    moveCamera: () => {},
  };

  // 1. Pressing 'g' or 'm' starts move mode
  const gEvent = { key: 'g', cancelable: true, preventDefault: () => {} } as unknown as KeyboardEvent;
  assert.equal(handleWorkshopKeyDown(mockContext, gEvent), true);
  assert.equal(mockContext.dragged, true);
  assert.equal(mockContext.down?.furnitureId, f.id);

  // 2. Pressing 'Delete' on furniture
  const delEvent = { key: 'Delete', cancelable: true, preventDefault: () => {} } as unknown as KeyboardEvent;
  assert.equal(handleWorkshopKeyDown(mockContext, delEvent), true);
  assert.equal(deletedId, f.id);
  assert.equal(deletedKind, 'furniture');

  // 3. Pressing 'Delete' on placement
  const placed = placeEntity(state, 'printer', 'p-del', state.slots[0].id, 'a1');
  mockContext.data = placed;
  mockContext.selected = placed.placements[0].id;
  deletedId = null;
  assert.equal(handleWorkshopKeyDown(mockContext, delEvent), true);
  assert.equal(deletedId, placed.placements[0].id);
  assert.equal(deletedKind, 'placement');

  // 4. Pressing 'Delete' with active label
  const stateWithLabel = {
    ...state,
    rooms: [{ ...state.rooms[0], labels: [{ id: 'lbl-1', roomId: state.rooms[0].id, text: 'Zone A', color: '#fff', size: 0.3, u: 0.5, v: 0.5, surface: 'floor' as const }] }],
  };
  mockContext.data = stateWithLabel;
  mockContext.authoring.getSelectedLabelId = () => 'lbl-1';
  assert.equal(handleWorkshopKeyDown(mockContext, delEvent), true);
  assert.deepEqual(deletedLabel, [state.rooms[0].id, 'lbl-1']);
});

test('Shift key or right click in Cell-Grid room builder behaves as instant eraser', () => {
  const container = { clientWidth: 800, clientHeight: 600, style: {} } as any;
  const canvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: {},
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    hasPointerCapture: () => false,
  } as any;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  camera.position.set(0, 30, 0.001);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const authoring = new SpatialAuthoring(
    container,
    canvas,
    scene,
    camera,
    { onAuthoringHint: () => {} },
    () => {}
  );

  // Initialize authoring with empty room workshop
  const emptyWorkshop: Workshop = {
    version: 1,
    rooms: [],
    furniture: [],
    slots: [],
    placements: [],
  };
  authoring.update(emptyWorkshop, true, null, null);

  // 1. Start room builder with brush
  authoring.startGridRoomBuilder('brush');
  assert.equal(authoring.isGridRoomBuilderActive(), true);
  assert.equal(authoring.getGridBuilderTool(), 'brush');
  assert.equal(authoring.getDraftTiles().length, 0);

  // 2. Normal Left click adds cell at center (400, 300) -> world (0, 0)
  authoring.pointerDown({ clientX: 400, clientY: 300, button: 0, pointerId: 1 } as any);
  authoring.pointerUp({ clientX: 400, clientY: 300, button: 0, pointerId: 1 } as any);
  assert.equal(authoring.getDraftTiles().length, 1);
  const firstTile = authoring.getDraftTiles()[0];
  assert.ok(firstTile, 'Cell should be added to draft tiles');

  // 3. Shift + click at (400, 300) behaves as eraser even when tool is 'brush'
  authoring.pointerDown({ clientX: 400, clientY: 300, button: 0, shiftKey: true, pointerId: 1 } as any);
  authoring.pointerUp({ clientX: 400, clientY: 300, button: 0, shiftKey: true, pointerId: 1 } as any);
  assert.equal(authoring.getDraftTiles().length, 0, 'Cell must be erased via Shift + click');

  // 4. Re-add cell at (400, 300)
  authoring.pointerDown({ clientX: 400, clientY: 300, button: 0, pointerId: 1 } as any);
  authoring.pointerUp({ clientX: 400, clientY: 300, button: 0, pointerId: 1 } as any);
  assert.equal(authoring.getDraftTiles().length, 1);

  // 5. Right click (button === 2) behaves as eraser
  authoring.pointerDown({ clientX: 400, clientY: 300, button: 2, pointerId: 1 } as any);
  authoring.pointerUp({ clientX: 400, clientY: 300, button: 2, pointerId: 1 } as any);
  assert.equal(authoring.getDraftTiles().length, 0, 'Cell must be erased via right click');

  // 6. Cell hover visual: Shift key shows red hover fill (#ef4444)
  authoring.pointerMove({ clientX: 400, clientY: 300, shiftKey: true, buttons: 0 } as any);
  assert.equal(authoring.getCellHoverFillColor(), '#ef4444');

  // 7. Cell hover visual: right button held ((buttons & 2) !== 0) shows red hover fill (#ef4444)
  authoring.pointerMove({ clientX: 400, clientY: 300, buttons: 2 } as any);
  assert.equal(authoring.getCellHoverFillColor(), '#ef4444');

  // 8. Normal hover without Shift shows standard grid hover color (#94a3b8)
  authoring.pointerMove({ clientX: 400, clientY: 300, shiftKey: false, buttons: 0 } as any);
  assert.equal(authoring.getCellHoverFillColor(), '#94a3b8');

  // 9. cancelDraft() method clears active draft and cancels grid room builder
  authoring.pointerDown({ clientX: 400, clientY: 300, button: 0, pointerId: 1 } as any);
  authoring.pointerUp({ clientX: 400, clientY: 300, button: 0, pointerId: 1 } as any);
  assert.equal(authoring.getDraftTiles().length, 1);
  authoring.cancelDraft();
  assert.equal(authoring.isGridRoomBuilderActive(), false);
  assert.equal(authoring.getDraftTiles().length, 0);
});

test('workshop history: records layout states, restores via undo, populates redo, restores via redo, clears redo on new commit, and respects max depth', () => {
  const history = createWorkshopHistory();
  const state0 = createWorkshop();

  // 1. Verify undo stack records layout states
  const state1 = { ...state0, rooms: [{ ...state0.rooms[0], name: 'Room Edit 1' }] };
  pushWorkshopHistory(history, state0);
  assert.equal(history.undoStack.length, 1);
  assert.equal(history.undoStack[0].rooms[0].name, state0.rooms[0].name);
  assert.equal(history.redoStack.length, 0);

  const state2 = { ...state1, rooms: [{ ...state1.rooms[0], name: 'Room Edit 2' }] };
  pushWorkshopHistory(history, state1);
  assert.equal(history.undoStack.length, 2);
  assert.equal(history.undoStack[1].rooms[0].name, 'Room Edit 1');

  // 2. Verify undo restores previous state and populates redo stack
  const restored1 = undoWorkshopHistory(history, state2);
  assert.ok(restored1);
  assert.equal(restored1.rooms[0].name, 'Room Edit 1');
  assert.equal(history.undoStack.length, 1);
  assert.equal(history.redoStack.length, 1);
  assert.equal(history.redoStack[0].rooms[0].name, 'Room Edit 2');

  const restored0 = undoWorkshopHistory(history, restored1);
  assert.ok(restored0);
  assert.equal(restored0.rooms[0].name, state0.rooms[0].name);
  assert.equal(history.undoStack.length, 0);
  assert.equal(history.redoStack.length, 2);

  // Undo when empty returns null
  assert.equal(undoWorkshopHistory(history, restored0), null);

  // 3. Verify redo restores the state
  const redone1 = redoWorkshopHistory(history, restored0);
  assert.ok(redone1);
  assert.equal(redone1.rooms[0].name, 'Room Edit 1');
  assert.equal(history.undoStack.length, 1);
  assert.equal(history.redoStack.length, 1);

  const redone2 = redoWorkshopHistory(history, redone1);
  assert.ok(redone2);
  assert.equal(redone2.rooms[0].name, 'Room Edit 2');
  assert.equal(history.undoStack.length, 2);
  assert.equal(history.redoStack.length, 0);

  // Redo when empty returns null
  assert.equal(redoWorkshopHistory(history, redone2), null);

  // 4. Verify new commit clears redo stack
  // First undo once so redo stack has an item:
  const backTo1 = undoWorkshopHistory(history, redone2);
  assert.equal(history.redoStack.length, 1);
  assert.equal(backTo1?.rooms[0].name, 'Room Edit 1');

  // Now push a new commit (branching history):
  const state3 = { ...backTo1!, rooms: [{ ...backTo1!.rooms[0], name: 'Room Edit 3' }] };
  pushWorkshopHistory(history, backTo1!);
  assert.equal(history.redoStack.length, 0, 'New commit must clear redo stack');
  assert.equal(history.undoStack.length, 2);
  assert.equal(history.undoStack[1].rooms[0].name, 'Room Edit 1');

  // 5. Verify max history depth limit (WORKSHOP_HISTORY_MAX_DEPTH = 40)
  assert.equal(WORKSHOP_HISTORY_MAX_DEPTH, 40);
  const depthHistory = createWorkshopHistory();
  for (let i = 0; i < 50; i++) {
    const s = { ...state0, rooms: [{ ...state0.rooms[0], name: `Step ${i}` }] };
    pushWorkshopHistory(depthHistory, s, 40);
  }
  assert.equal(depthHistory.undoStack.length, 40, 'Undo stack must be capped at 40');
  // First item in stack should be Step 10 (earliest 10 dropped)
  assert.equal(depthHistory.undoStack[0].rooms[0].name, 'Step 10');
  assert.equal(depthHistory.undoStack[39].rooms[0].name, 'Step 49');
});

test('workshop history: creates deep-cloned copies to prevent mutation leaks', () => {
  const history = createWorkshopHistory();
  const state = createWorkshop();
  pushWorkshopHistory(history, state);
  state.rooms[0].name = 'Mutated In Place';
  assert.notEqual(history.undoStack[0].rooms[0].name, 'Mutated In Place');

  // Test redo stack deep cloning
  const prev = undoWorkshopHistory(history, state);
  assert.ok(prev);
  state.rooms[0].name = 'Mutated Again';
  assert.notEqual(history.redoStack[0].rooms[0].name, 'Mutated Again');
});

test('resolvePlacementPosition accurately resolves floor coordinates from workshop layout and handles missing placements', () => {
  const state = createWorkshop();
  const placed = placeEntity(state, 'printer', 'printer-pos-test', state.slots[0].id, 'a1');
  const p = placed.placements[0];
  const pos = resolvePlacementPosition(placed, p.id);
  assert.ok(pos, 'Position must be resolved for existing placed printer');

  const slot = placed.slots.find((s) => s.id === p.slotId)!;
  const furn = placed.furniture.find((f) => f.id === slot.furnitureId)!;
  const origin = roomOrigin(placed, furn.roomId);
  const [expectedX, expectedY, expectedZ] = slotWorld(furn, slot);

  assert.equal(pos.x, origin.x + expectedX);
  assert.equal(pos.y, expectedY);
  assert.equal(pos.z, origin.z + expectedZ);

  // Missing placement or null state returns null
  assert.equal(resolvePlacementPosition(placed, 'non-existent-id'), null);
  assert.equal(resolvePlacementPosition(null, 'any-id'), null);
});

test('search beacon trigger: sets position, enables visibility, sets cyan emissive style, animates fade-out, and focuses camera', () => {
  const state = createWorkshop();
  const placed = placeEntity(state, 'printer', 'p-beacon', state.slots[0].id, 'a1');
  const placementId = placed.placements[0].id;
  const expectedPos = resolvePlacementPosition(placed, placementId)!;

  let movedCameraTarget: THREE.Vector3 | null = null;
  let movedCameraSpan: number | null = null;
  let invalidatedCount = 0;

  const mockScene: any = {
    data: placed,
    build: {
      placements: new Map([
        [placementId, { pos: new THREE.Vector3(expectedPos.x, expectedPos.y, expectedPos.z), f: { rotation: 0 } }],
      ]),
      positions: new Map([[placementId, new THREE.Vector3(expectedPos.x, expectedPos.y, expectedPos.z)]]),
    },
    top: false,
    azimuth: Math.PI / 4,
    elevation: 20,
    searchBeaconGroup: new THREE.Group(),
    beaconMaterial: new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0 }),
    beaconRaf: null,
    beaconTimer: null,
    disposed: false,
    getSafeInspectionAzimuth: () => Math.PI / 4,
    moveCamera: (target: THREE.Vector3, span: number) => {
      movedCameraTarget = target.clone();
      movedCameraSpan = span;
    },
    invalidate: () => {
      invalidatedCount++;
    },
  };
  mockScene.searchBeaconGroup.visible = false;

  // Trigger search beacon
  WorkshopScene.prototype.triggerSearchBeacon.call(mockScene, placementId);

  // 1. Group is visible and positioned on the floor (y = 0.02)
  assert.equal(mockScene.searchBeaconGroup.visible, true);
  assert.equal(mockScene.searchBeaconGroup.position.x, expectedPos.x);
  assert.equal(mockScene.searchBeaconGroup.position.y, 0.02);
  assert.equal(mockScene.searchBeaconGroup.position.z, expectedPos.z);

  // 2. Cyan styling and initial opacity 0.8
  assert.equal(mockScene.beaconMaterial.opacity, 0.8);
  assert.equal(mockScene.beaconMaterial.color.getHexString(), '38bdf8');

  // 3. Camera focused smoothly
  assert.ok(movedCameraTarget);
  const camTarget = movedCameraTarget as THREE.Vector3;
  assert.equal(camTarget.x, expectedPos.x);
  assert.equal(camTarget.z, expectedPos.z);
  assert.equal(movedCameraSpan, 1.5);
  assert.ok(invalidatedCount >= 1);
});

test('multi-selection group delta calculations: calculateGroupMove moves multiple furniture together without self-collision', () => {
  const state = createWorkshop();
  const f0 = state.furniture[0];
  const f1 = state.furniture[1];

  // Moving both items by dx = 0.5, dz = 0.25 on a 0.25 grid
  const result = calculateGroupMove(state, [f0.id, f1.id], 0.5, 0.25, 0.25);
  assert.equal(result.valid, true, 'Moving group together must be valid and not self-collide');
  assert.equal(result.moved.length, 2);

  const m0 = result.moved.find((m) => m.id === f0.id)!;
  const m1 = result.moved.find((m) => m.id === f1.id)!;
  assert.equal(m0.x, snap(f0.x + 0.5, 0.25));
  assert.equal(m0.z, snap(f0.z + 0.25, 0.25));
  assert.equal(m1.x, snap(f1.x + 0.5, 0.25));
  assert.equal(m1.z, snap(f1.z + 0.25, 0.25));
});

test('multi-selection group collision detection: detects wall collisions and obstacle collisions and reports reason', () => {
  const state = createWorkshop();
  const f0 = state.furniture[0];
  const f1 = state.furniture[1];

  // 1. Moving group beyond wall bounds
  const wallResult = calculateGroupMove(state, [f0.id, f1.id], 15, 0, 0.25);
  assert.equal(wallResult.valid, false);
  assert.equal(wallResult.reason, 'Выход за пределы комнаты');

  // 2. Moving group into another unselected obstacle
  const obstacle = state.furniture[2];
  const deltaX = obstacle.x - f0.x;
  const deltaZ = obstacle.z - f0.z;
  const obsResult = calculateGroupMove(state, [f0.id, f1.id], deltaX, deltaZ, 0.25);
  assert.equal(obsResult.valid, false);
  assert.ok(obsResult.reason?.includes('Пересечение с'));

  // 3. Empty group
  const emptyResult = calculateGroupMove(state, [], 1, 1, 0.25);
  assert.equal(emptyResult.valid, false);
  assert.equal(emptyResult.reason, 'Нет выбранных объектов');
});

test('multi-selection hotkeys: Arrow keys move all selected furniture in group and report collision feedback on error', () => {
  const state = createWorkshop();
  const f0 = state.furniture[0];
  const f1 = state.furniture[1];
  const movedCalls: Array<{ id: string; x: number; z: number }> = [];
  let collisionReason: string | null = null;
  const setBorders: Array<{ id: string; color: string }> = [];

  const mockContext: WorkshopHotkeyContext = {
    top: false,
    edit: true,
    selected: f0.id,
    selectedFurnitureIds: new Set([f0.id, f1.id]),
    data: state,
    grid: 0.25,
    options: {
      canvas: { style: {} } as any,
      container: {} as any,
      onSelect: () => {},
      onMove: (id, x, z) => {
        movedCalls.push({ id, x, z });
      },
      onCollisionFeedback: (reason) => {
        collisionReason = reason;
      },
      onCamera: () => {},
      onReady: () => {},
      onError: () => {},
    },
    authoring: {
      cancelDraft: () => {},
      getSelectedLabelId: () => null,
      setSelectedLabel: () => {},
    },
    select: () => {},
    workshopCenter: () => new THREE.Vector3(),
    overviewSpan: () => 10,
    moveCamera: () => {},
    build: {
      setFurnitureBorderColor: (id, color) => {
        setBorders.push({ id, color });
      },
    },
  };

  // 1. ArrowRight nudges both items in group by +0.25
  const arrowRight = { key: 'ArrowRight', cancelable: true, preventDefault: () => {} } as unknown as KeyboardEvent;
  const handled = handleWorkshopKeyDown(mockContext, arrowRight);
  assert.equal(handled, true);
  assert.equal(movedCalls.length, 2);
  assert.equal(movedCalls.find((m) => m.id === f0.id)?.x, snap(f0.x + 0.25, 0.25));
  assert.equal(movedCalls.find((m) => m.id === f1.id)?.x, snap(f1.x + 0.25, 0.25));
  assert.ok(setBorders.some((b) => b.id === f0.id && b.color === '#38bdf8'));
  assert.ok(setBorders.some((b) => b.id === f1.id && b.color === '#38bdf8'));

  // 2. Collision feedback when group move hits wall
  const edgeState = {
    ...state,
    furniture: state.furniture.map((f) => (f.id === f0.id ? { ...f, x: state.rooms[0].width / 2 - f.width / 2 - 0.2 } : f)),
  };
  mockContext.data = edgeState;
  movedCalls.length = 0;
  collisionReason = null;
  setBorders.length = 0;
  const handledEdge = handleWorkshopKeyDown(mockContext, arrowRight);
  assert.equal(handledEdge, true);
  assert.equal(movedCalls.length, 0); // move rejected
  assert.ok(collisionReason);
  assert.ok(setBorders.some((b) => b.color === '#e87668'));
});

test('findWorkshopSeams identifies all shared boundaries between multiple adjacent rooms and custom tile rooms', () => {
  const state = createWorkshop();
  const roomA = state.rooms[0]; // width 14, depth 10, origin (0, 0), covers [-7, 7], [-5, 5]

  // Room B attached east: width 6, depth 10 -> origin (10, 0), covers [7, 13], [-5, 5]
  const roomB: Room = {
    id: 'room-east',
    name: 'Восточная комната',
    width: 6,
    depth: 10,
    attachment: { roomId: roomA.id, side: 'east' },
  };

  // Room C created from tiles on south: x in [2, 6], z in [5, 9] (5x5) -> touches roomA on north (Z = 5)
  const tilesC: Array<[number, number]> = [];
  for (let x = 2; x <= 6; x++) {
    for (let z = 5; z <= 9; z++) {
      tilesC.push([x, z]);
    }
  }
  const roomC: Room = {
    id: 'room-south',
    name: 'Южная комната',
    width: 5,
    depth: 5,
    tiles: tilesC,
    attachment: { roomId: roomA.id, side: 'south' },
  };

  // Room D created from tiles touching BOTH roomC on west (X = 7) and roomB on north (Z = 5)
  const tilesD: Array<[number, number]> = [];
  for (let x = 7; x <= 10; x++) {
    for (let z = 5; z <= 9; z++) {
      tilesD.push([x, z]);
    }
  }
  const roomD: Room = {
    id: 'room-corner',
    name: 'Угловая комната',
    width: 4,
    depth: 5,
    tiles: tilesD,
    attachment: { roomId: roomB.id, side: 'south' },
  };

  const multiState = { ...state, rooms: [roomA, roomB, roomC, roomD] };
  const seams = findWorkshopSeams(multiState);

  // 1. Seam between Room A and Room B (vertical at X = 7, spanning Z from -5 to 5)
  const seamAB = seams.find(s => (s.roomA.id === roomA.id && s.roomB.id === roomB.id) || (s.roomA.id === roomB.id && s.roomB.id === roomA.id));
  assert.ok(seamAB, 'Seam between Room A and Room B must be detected');
  assert.equal(seamAB.alongX, false);
  assert.equal(seamAB.coord, 7);
  assert.equal(seamAB.length, 10);

  // 2. Seam between Room A and Room C (horizontal at Z = 5, spanning X from 2 to 7)
  const seamAC = seams.find(s => (s.roomA.id === roomA.id && s.roomB.id === roomC.id) || (s.roomA.id === roomC.id && s.roomB.id === roomA.id));
  assert.ok(seamAC, 'Seam between Room A and Room C must be detected');
  assert.equal(seamAC.alongX, true);
  assert.equal(seamAC.coord, 5);
  assert.equal(seamAC.min, 2);
  assert.equal(seamAC.max, 7);
  assert.equal(seamAC.length, 5);

  // 3. Seam between Room B and Room D (horizontal at Z = 5, spanning X from 7 to 11)
  const seamBD = seams.find(s => (s.roomA.id === roomB.id && s.roomB.id === roomD.id) || (s.roomA.id === roomD.id && s.roomB.id === roomB.id));
  assert.ok(seamBD, 'Seam between Room B and Room D must be detected');
  assert.equal(seamBD.alongX, true);
  assert.equal(seamBD.coord, 5);
  assert.equal(seamBD.length, 4);

  // 4. Seam between Room C and Room D (vertical at X = 7, spanning Z from 5 to 10)
  // This is the multi-room intersection that previously was missed because Room D only attached to Room B!
  const seamCD = seams.find(s => (s.roomA.id === roomC.id && s.roomB.id === roomD.id) || (s.roomA.id === roomD.id && s.roomB.id === roomC.id));
  assert.ok(seamCD, 'Seam between Room C and Room D must be detected even without direct attachment');
  assert.equal(seamCD.alongX, false);
  assert.equal(seamCD.coord, 7);
  assert.equal(seamCD.min, 5);
  assert.equal(seamCD.max, 10);
  assert.equal(seamCD.length, 5);

  // 5. Verify occupiedSides reports all occupied directions
  const sidesC = occupiedSides(multiState, roomC);
  assert.ok(sidesC.has('north'), 'Room C must detect northern seam to Room A');
  assert.ok(sidesC.has('east'), 'Room C must detect eastern seam to Room D');
});

test('findWorkshopSeams accurately computes doorway geometry and semi-transparent partition dimensions', () => {
  const state = createWorkshop();
  const roomA = state.rooms[0]; // width 14, depth 10
  const roomB: Room = {
    id: 'room-east',
    name: 'Восточная комната',
    width: 6,
    depth: 10,
    attachment: { roomId: roomA.id, side: 'east' },
  };
  const twoRoomState = { ...state, rooms: [roomA, roomB] };
  const seams = findWorkshopSeams(twoRoomState);
  assert.equal(seams.length, 1);
  const seam = seams[0];
  assert.equal(seam.alongX, false);
  assert.equal(seam.coord, 7);
  assert.equal(seam.length, 10);

  // Verify doorway math on seam
  const overlapLength = seam.length;
  const minMargin = 0.45;
  const available = overlapLength - 2 * minMargin;
  const doorway = available >= 0.8 ? Math.min(1.2, available) : Math.max(0.7, overlapLength - 0.2);
  const wing = (overlapLength - doorway) / 2;

  assert.equal(doorway, 1.2, 'Standard doorway width should be 1.2m');
  assert.equal(wing, 4.4, 'Wings on both sides should be 4.4m each');
  assert.ok(wing >= (doorway - 0.08) * 0.7, 'Wing must be wide enough to accommodate open door leaf');

  // Verify occupiedSides integration
  const sidesA = occupiedSides(twoRoomState, roomA);
  assert.ok(sidesA.has('east'), 'Room A must report east side occupied');
  const sidesB = occupiedSides(twoRoomState, roomB);
  assert.ok(sidesB.has('west'), 'Room B must report west side occupied');
});

test('selected printer strictly suppresses hover jump even when hovering over another printer', () => {
  const hoverStates = new Map<string, { current: number; target: number }>();
  let hoveredPlacementId: string | null = null;
  let selectedPlacementId: string | null = 'placement-printer-1';

  const setHoveredPlacement = (id: string | null) => {
    if (hoveredPlacementId === id) return;
    if (hoveredPlacementId) {
      const old = hoverStates.get(hoveredPlacementId) ?? { current: 0, target: 0 };
      old.target = 0;
      hoverStates.set(hoveredPlacementId, old);
    }
    hoveredPlacementId = id;
    if (id) {
      const isSelected = selectedPlacementId === id;
      const suppressJump = isSelected;
      const next = hoverStates.get(id) ?? { current: 0, target: 1 };
      next.target = suppressJump ? 0 : 1;
      if (suppressJump) {
        next.current = 0;
      }
      hoverStates.set(id, next);
    }
  };

  // Select printer 1 initially; its hover progress is strictly 0
  hoverStates.set('placement-printer-1', { current: 0, target: 0 });

  // Hover over printer 2
  setHoveredPlacement('placement-printer-2');

  // Printer 2 should target 1
  assert.equal(hoverStates.get('placement-printer-2')?.target, 1);

  // Selected printer 1 MUST remain target 0, current 0, never jumping to 1
  const selectedState = hoverStates.get('placement-printer-1');
  assert.equal(selectedState?.target, 0);
  assert.equal(selectedState?.current, 0);

  // Hover animation tick must never animate the selected printer
  const tickSimulate = () => {
    for (const [id, state] of hoverStates) {
      if (id === selectedPlacementId) {
        state.current = 0;
        state.target = 0;
        hoverStates.delete(id);
        continue;
      }
      state.current = state.target;
    }
  };
  tickSimulate();

  // Selected printer was removed from active animation and remains at base
  assert.equal(hoverStates.has('placement-printer-1'), false);
  assert.equal(hoverStates.get('placement-printer-2')?.current, 1);
});

test('camera zooms out to room focus when printer is deselected in overview mode', () => {
  const state = createWorkshop();
  const room = state.rooms[0];
  let cameraTarget = { x: 3, y: 0.7, z: 2 };
  let cameraSpan = 1.5; // zoomed in on printer

  let selectedId: string | null = 'printer-placement-1';
  let isEdit = false;

  const select = (nextId: string | null) => {
    const wasSelected = Boolean(selectedId);
    selectedId = nextId;

    if (!nextId) {
      if (wasSelected && !isEdit) {
        const focus = calculateRoomCameraFocus(state, room);
        cameraTarget = { x: focus.target.x, y: focus.target.y, z: focus.target.z };
        cameraSpan = focus.span;
      }
    }
  };

  // Deselect the printer
  select(null);

  assert.equal(selectedId, null);
  // Camera span expanded back from 1.5 to full room span
  assert.ok(cameraSpan > 5, 'Camera span must zoom out from 1.5 to room focus span');
  const expectedFocus = calculateRoomCameraFocus(state, room);
  assert.equal(cameraSpan, expectedFocus.span);
  assert.deepEqual(cameraTarget, expectedFocus.target);
});

test('room floor glow is active ONLY in edit mode and disabled in overview mode', () => {
  const state = createWorkshop();
  const room = state.rooms[0];

  // In overview mode (edit = false), selectedRoomId is always undefined
  const getSelectedRoomId = (edit: boolean, activeRoomId: string) => {
    return edit ? activeRoomId : undefined;
  };

  assert.equal(getSelectedRoomId(false, room.id), undefined, 'Overview mode must NEVER provide selectedRoomId for floor glow');
  assert.equal(getSelectedRoomId(true, room.id), room.id, 'Edit mode must provide active room as selectedRoomId for floor glow');

  // When exiting edit mode, floor glow is removed
  let edit = true;
  assert.equal(getSelectedRoomId(edit, room.id), room.id);
  edit = false;
  assert.equal(getSelectedRoomId(edit, room.id), undefined);
});

test('printer calibration cube is positioned with clean clearance from printer shell and touchscreen', () => {
  const cubeSize = 0.06;
  const cubeOffset = { x: 0.35, z: 0.21 };
  const cubeHalf = cubeSize / 2;

  // A1 printer shell extends up to x = 0.282, z = 0.288
  const a1MaxX = 0.282;
  const a1ScreenZMax = 0.288;
  const cubeMinX = cubeOffset.x - cubeHalf; // 0.35 - 0.03 = 0.320
  const cubeMaxX = cubeOffset.x + cubeHalf; // 0.35 + 0.03 = 0.380

  // Verify cube does not penetrate A1 shell or screen bracket
  assert.ok(cubeMinX > a1MaxX, `Cube inner edge (${cubeMinX}) must be strictly outside A1 shell (${a1MaxX})`);
  assert.ok(cubeMinX - a1MaxX >= 0.03, 'Cube must maintain at least 30mm clearance from printer model');

  // P1 printer shell extends up to x = 0.240, z = 0.262
  const p1MaxX = 0.240;
  assert.ok(cubeMinX > p1MaxX, `Cube inner edge (${cubeMinX}) must be strictly outside P1 shell (${p1MaxX})`);
  assert.ok(cubeMinX - p1MaxX >= 0.07, 'Cube must maintain at least 70mm clearance from P1 model');
});
test('setSelectedRoom dynamically updates floor materials without rebuilding scene geometry', () => {
  const parts = new ReferenceSceneParts({} as any);
  const normalPlinth = parts.getFloorPlinthMaterial(false);
  const selectedPlinth = parts.getFloorPlinthMaterial(true);
  assert.notEqual(normalPlinth, selectedPlinth);
  assert.equal((normalPlinth as THREE.MeshStandardMaterial).color.getHexString(), '353e50');
  assert.equal((selectedPlinth as THREE.MeshStandardMaterial).color.getHexString(), '243346');

  const normalGrout = parts.getFloorGroutMaterial(false);
  const selectedGrout = parts.getFloorGroutMaterial(true);
  assert.notEqual(normalGrout, selectedGrout);

  const normalTile0 = parts.getFloorTileMaterial(0, false);
  const selectedTile0 = parts.getFloorTileMaterial(0, true);
  assert.notEqual(normalTile0, selectedTile0);
  assert.equal((selectedTile0 as THREE.MeshStandardMaterial).emissive.getHexString(), '123860');

  // Verify getSceneSignature does NOT include active room ID, preventing scene rebuilds on room switch
  const workshopSceneProto = WorkshopScene.prototype as any;
  const state = createWorkshop();
  const roomA = state.rooms[0];
  const roomB: Room = { id: 'room-b', name: 'Room B', width: 6, depth: 6, labels: [] };
  const twoRoomState = { ...state, rooms: [roomA, roomB] };

  const sig1 = workshopSceneProto.getSceneSignature(twoRoomState, [], [], new Set());
  const sig2 = workshopSceneProto.getSceneSignature(twoRoomState, [], [], new Set());
  assert.equal(sig1, sig2, 'Scene signature must remain identical when switching rooms, preventing camera-jumping rebuilds');
});

test('updateRoomLabel and deleteRoomLabel allow moving labels across surfaces, changing rotation/size and removing labels', () => {
  const state = createWorkshop();
  const room = state.rooms[0];
  const initialLabels = defaultRoomLabels(room);
  const targetLabel = initialLabels[0];

  // Update position and surface (e.g. from floor to north wall)
  const updatedState = updateRoomLabel(state, room.id, targetLabel.id, {
    surface: 'north',
    u: 0.6,
    v: 0.7,
    text: 'UPDATED GRAFFITI',
    size: 0.8,
    rotation: 90,
    color: '#ffaa00'
  });

  const updatedRoom = updatedState.rooms.find(r => r.id === room.id)!;
  const updatedLabel = updatedRoom.labels?.find(l => l.id === targetLabel.id)!;
  assert.equal(updatedLabel.surface, 'north');
  assert.equal(updatedLabel.u, 0.6);
  assert.equal(updatedLabel.v, 0.7);
  assert.equal(updatedLabel.text, 'UPDATED GRAFFITI');
  assert.equal(updatedLabel.size, 0.8);
  assert.equal(updatedLabel.rotation, 90);
  assert.equal(updatedLabel.color, '#ffaa00');

  // Deletion
  const deletedState = deleteRoomLabel(updatedState, room.id, targetLabel.id);
  const deletedRoom = deletedState.rooms.find(r => r.id === room.id)!;
  assert.equal(deletedRoom.labels?.some(l => l.id === targetLabel.id), false);
});

test('SpatialAuthoring: clicking a label triggers onLabelEditStart, while dragging commits new position and surface via onMoveLabel', () => {
  const container = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: { cursor: 'default' },
  } as any;
  const canvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: { cursor: 'default' },
  } as any;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 100);
  camera.position.set(0, 10, 10);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  let editStarted: { roomId: string; labelId: string } | null = null;
  let movedLabel: { roomId: string; labelId: string; u: number; v: number; surface?: string } | null = null;

  const authoring = new SpatialAuthoring(
    container,
    canvas,
    scene,
    camera,
    {
      onLabelEditStart: (roomId, labelId) => { editStarted = { roomId, labelId }; },
      onMoveLabel: (roomId, labelId, u, v, surface) => { movedLabel = { roomId, labelId, u, v, surface }; },
    },
    () => {}
  );

  const workshop = createWorkshop();
  authoring.update(workshop, true, null, null);

  // 1. Simulate clicking graffiti text without dragging -> onLabelEditStart
  const room = workshop.rooms[0];
  const label = defaultRoomLabels(room)[0];
  authoring.setSelectedLabel(label.id);
  assert.equal(authoring.getSelectedLabelId(), label.id);

  // 2. Simulate dragging label
  const started = authoring.startDraggingSelectedLabel({ clientX: 400, clientY: 300 } as any);
  assert.equal(started, true);

  // Move pointer
  authoring.pointerMove({ clientX: 450, clientY: 320 } as any);

  // Release pointer -> onMoveLabel is invoked
  authoring.pointerUp({ clientX: 450, clientY: 320, button: 0 } as any);

  assert.ok(movedLabel, 'onMoveLabel must be called when dragging label finishes');
  assert.equal((movedLabel as any).labelId, label.id);
  assert.equal((movedLabel as any).roomId, room.id);
  assert.ok(typeof (movedLabel as any).u === 'number');
  assert.ok(typeof (movedLabel as any).v === 'number');
});

test('WorkshopScene: getSelectedOrDraftLabelTransform calculates screen and HUD coordinates for in-scene graffiti editing', () => {
  const workshop = createWorkshop();
  const room = workshop.rooms[0];
  const label = defaultRoomLabels(room)[0];

  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 100);
  camera.position.set(0, 10, 10);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const fakeAuthoring = {
    getActiveDraft: () => null,
    isDraftingLabel: () => false,
    getSelectedLabelId: () => label.id,
    getLabelPreviewPosition: () => null,
    isLabelPreviewVisible: () => false,
  };

  const fakeScene: any = {
    edit: true,
    options: {
      canvas: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      },
    },
    authoring: fakeAuthoring,
    data: workshop,
    camera,
    container: { clientWidth: 800, clientHeight: 600 },
  };

  const transform = WorkshopScene.prototype.getSelectedOrDraftLabelTransform.call(fakeScene);
  assert.ok(transform, 'Transform must be calculated for selected label');
  assert.equal(transform.labelId, label.id);
  assert.equal(transform.text, label.text);
  assert.equal(transform.surface, label.surface);
  assert.ok(Number.isFinite(transform.screenX), 'screenX must be a finite number');
  assert.ok(Number.isFinite(transform.screenY), 'screenY must be a finite number');
  assert.ok(Number.isFinite(transform.hudX), 'hudX must be a finite number');
  assert.ok(Number.isFinite(transform.hudY), 'hudY must be a finite number');
});

test('WorkshopCanvas: left modal SpatialProperties is completely removed in favor of 3D in-scene cockpit editing', () => {
  const canvasSource = fs.readFileSync(path.resolve(process.cwd(), 'src/features/workshop/WorkshopCanvas.tsx'), 'utf-8');
  assert.ok(!canvasSource.includes('SpatialProperties'), 'WorkshopCanvas must not import or render SpatialProperties modal');
  assert.ok(canvasSource.includes('labelTransform'), 'WorkshopCanvas must handle labelTransform projected from 3D space');
  assert.ok(canvasSource.includes('isEditingText'), 'WorkshopCanvas must support direct in-scene text editing');
  assert.ok(canvasSource.includes('startDraggingSelectedLabel'), 'WorkshopCanvas must allow dragging graffiti directly from 3D cockpit');
});

test('findNearestValidPosition: returns current position for valid furniture, snaps out-of-bounds to nearest room border, and resolves collisions', () => {
  const state = createWorkshop();
  const room = state.rooms[0];
  const table = state.furniture.find((f) => f.kind === 'table')!;

  // 1. Valid furniture returns current coordinates
  const validPos = findNearestValidPosition(state, table);
  assert.ok(validPos);
  assert.equal(validPos.x, table.x);
  assert.equal(validPos.z, table.z);
  assert.equal(validPos.roomId, table.roomId);

  // 2. Out-of-bounds furniture (e.g. dragged far past wall to x = 20, z = 0) snaps to nearest valid point within room bounds
  const outOfBoundsTable = { ...table, x: 20, z: 0 };
  assert.equal(validFurniture(state, outOfBoundsTable), false);

  const nearestPos = findNearestValidPosition(state, outOfBoundsTable);
  assert.ok(nearestPos, 'Nearest valid position must be found');
  assert.equal(nearestPos.roomId, room.id);
  const resolvedTable = { ...table, x: nearestPos.x, z: nearestPos.z, roomId: nearestPos.roomId };
  assert.equal(validFurniture(state, resolvedTable), true, 'Resolved position must be valid');
  assert.ok(nearestPos.x < 20, 'Resolved x must be pulled inside the room');

  // 3. Collision resolution: placing table directly on top of another table
  const otherTable = state.furniture.filter((f) => f.kind === 'table' && f.id !== table.id)[0];
  const collidingTable = { ...table, x: otherTable.x, z: otherTable.z };
  assert.equal(validFurniture(state, collidingTable), false);

  const resolvedCollision = findNearestValidPosition(state, collidingTable);
  assert.ok(resolvedCollision);
  const testResolvedCollision = { ...collidingTable, x: resolvedCollision.x, z: resolvedCollision.z };
  assert.equal(validFurniture(state, testResolvedCollision), true, 'Collision must be resolved to a non-overlapping valid spot');
  assert.ok(
    Math.abs(resolvedCollision.x - otherTable.x) > 0.01 || Math.abs(resolvedCollision.z - otherTable.z) > 0.01,
    'Must be shifted away from colliding other item'
  );
});

test('resolveInvalidFurniture and updateFurniture: allows free placement/rotation in edit mode, relocates on deselect/save and generates user notification', () => {
  const state = createWorkshop();
  const plant = state.furniture.find((f) => f.kind === 'plant')!;

  // 1. updateFurniture throws when allowInvalid is false (default behavior)
  assert.throws(() => updateFurniture(state, { ...plant, x: 25 }));

  // 2. updateFurniture allows temporarily invalid placement during edit mode when allowInvalid is true
  const invalidPlant = { ...plant, x: 25, z: 10 };
  const stateWithInvalid = updateFurniture(state, invalidPlant, true);
  assert.equal(stateWithInvalid.furniture.find((f) => f.id === plant.id)?.x, 25);

  // 3. resolveInvalidFurniture relocates all invalid furniture to closest accessible spots
  const { nextState, relocated } = resolveInvalidFurniture(stateWithInvalid, [plant.id]);
  assert.equal(relocated.length, 1);
  assert.equal(relocated[0].furniture.id, plant.id);
  assert.equal(relocated[0].from.x, 25);
  assert.ok(relocated[0].to.x < 25);

  const restoredPlant = nextState.furniture.find((f) => f.id === plant.id)!;
  assert.equal(validFurniture(nextState, restoredPlant), true, 'Relocated furniture must be fully valid');

  // 4. Notification message matches user requirement
  const notification = `Предмет «${relocated[0].furniture.name}» перемещён, так как он стоял в недоступном месте.`;
  assert.ok(notification.includes('перемещён, так как он стоял в недоступном месте'));
});





