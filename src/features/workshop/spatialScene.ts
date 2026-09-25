import * as THREE from 'three';
import { buildWorkshop, type Assets, type SceneBuild } from './sceneGeometry';
import { roomOrigin, type Workshop, type Room, type RoomSide } from './model';
import type { Filament, Printer } from '../../shared/types';

export function workshopBounds(state: Workshop) {
  const bounds = new THREE.Box3();
  for (const room of state.rooms) {
    const o = roomOrigin(state, room.id);
    bounds.expandByPoint(new THREE.Vector3(o.x-room.width/2, 0, o.z-room.depth/2));
    bounds.expandByPoint(new THREE.Vector3(o.x+room.width/2, 2.7, o.z+room.depth/2));
  }
  return bounds;
}

export const oppositeSide: Record<RoomSide, RoomSide> = { north:'south', south:'north', east:'west', west:'east' };
export function occupiedSides(state: Workshop, room: Room): Set<RoomSide> {
  const sides = new Set<RoomSide>();
  if (room.attachment) sides.add(oppositeSide[room.attachment.side]);
  for (const child of state.rooms) if (child.attachment?.roomId === room.id) sides.add(child.attachment.side);
  return sides;
}

/** Each room owns its GPU resources and local coordinates. The composite exposes world
 * positions for inspection/picking while all furniture mutation APIs remain room-local. */
export function buildSpatialWorkshop(
  state: Workshop,
  assets: Assets,
  filaments: Filament[],
  printers: Printer[],
  active: Set<string>,
  selectedRoomId?: string
): SceneBuild {
  const root=new THREE.Group();
  const pieces=state.rooms.map((room,index)=>{
    const origin=roomOrigin(state,room.id);
    const isSelected = room.id === selectedRoomId;
    const build=buildWorkshop(state,room,assets,filaments,printers,active,occupiedSides(state,room),index===0,isSelected);
    build.root.position.set(origin.x,0,origin.z); root.add(build.root);
    return {room,origin,build};
  });
  const partitions = new THREE.Group();
  root.add(partitions);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#273142', roughness: 0.84, metalness: 0.05 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: '#7e8795', roughness: 0.45, metalness: 0.25 });
  const skirtingMaterial = new THREE.MeshStandardMaterial({ color: '#1d232e', roughness: 0.82, metalness: 0.05 });
  const doorLeafMaterial = new THREE.MeshStandardMaterial({ color: '#1e2530', roughness: 0.65, metalness: 0.15 });
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  const makeBox = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) => {
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return;
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    partitions.add(mesh);
  };

  for (const room of state.rooms) {
    if (!room.attachment) continue;
    const parent = state.rooms.find((r) => r.id === room.attachment!.roomId);
    if (!parent) continue;

    const po = roomOrigin(state, parent.id);
    const ro = roomOrigin(state, room.id);
    const side = room.attachment.side;
    const alongX = side === 'north' || side === 'south';

    let seamX = 0;
    let seamZ = 0;
    let pMin = 0;
    let pMax = 0;
    let cMin = 0;
    let cMax = 0;

    if (alongX) {
      seamZ = side === 'north' ? po.z - parent.depth / 2 : po.z + parent.depth / 2;
      pMin = po.x - parent.width / 2;
      pMax = po.x + parent.width / 2;
      cMin = ro.x - room.width / 2;
      cMax = ro.x + room.width / 2;

      if (room.tiles && room.tiles.length > 0) {
        const cTargetZ = side === 'north' ? Math.round(seamZ - 1) : Math.round(seamZ);
        const cTiles = room.tiles.filter(t => t[1] === cTargetZ);
        if (cTiles.length > 0) {
          cMin = Math.min(...cTiles.map(t => t[0]));
          cMax = Math.max(...cTiles.map(t => t[0])) + 1;
        }
      }
      if (parent.tiles && parent.tiles.length > 0) {
        const pTargetZ = side === 'north' ? Math.round(seamZ) : Math.round(seamZ - 1);
        const pTiles = parent.tiles.filter(t => t[1] === pTargetZ);
        if (pTiles.length > 0) {
          pMin = Math.min(...pTiles.map(t => t[0]));
          pMax = Math.max(...pTiles.map(t => t[0])) + 1;
        }
      }
    } else {
      seamX = side === 'west' ? po.x - parent.width / 2 : po.x + parent.width / 2;
      pMin = po.z - parent.depth / 2;
      pMax = po.z + parent.depth / 2;
      cMin = ro.z - room.depth / 2;
      cMax = ro.z + room.depth / 2;

      if (room.tiles && room.tiles.length > 0) {
        const cTargetX = side === 'west' ? Math.round(seamX - 1) : Math.round(seamX);
        const cTiles = room.tiles.filter(t => t[0] === cTargetX);
        if (cTiles.length > 0) {
          cMin = Math.min(...cTiles.map(t => t[1]));
          cMax = Math.max(...cTiles.map(t => t[1])) + 1;
        }
      }
      if (parent.tiles && parent.tiles.length > 0) {
        const pTargetX = side === 'west' ? Math.round(seamX) : Math.round(seamX - 1);
        const pTiles = parent.tiles.filter(t => t[0] === pTargetX);
        if (pTiles.length > 0) {
          pMin = Math.min(...pTiles.map(t => t[1]));
          pMax = Math.max(...pTiles.map(t => t[1])) + 1;
        }
      }
    }

    const overlapMin = Math.max(pMin, cMin);
    const overlapMax = Math.min(pMax, cMax);

    const overlapLength = overlapMax - overlapMin;
    if (overlapLength < 0.6) continue;

    const seamCenter = (overlapMin + overlapMax) / 2;

    // Minimum corner margin to ensure doorway never touches corner pylons
    const minMargin = 0.45;
    const available = overlapLength - 2 * minMargin;
    const doorway = available >= 0.8 ? Math.min(1.2, available) : Math.max(0.7, overlapLength - 0.2);
    const wing = (overlapLength - doorway) / 2;

    const doorStartX = alongX ? seamCenter - doorway / 2 : seamX;
    const doorEndX = alongX ? seamCenter + doorway / 2 : seamX;
    const doorStartZ = alongX ? seamZ : seamCenter - doorway / 2;
    const doorEndZ = alongX ? seamZ : seamCenter + doorway / 2;
    const doorCenterX = alongX ? seamCenter : seamX;
    const doorCenterZ = alongX ? seamZ : seamCenter;

    // 1. Continuous Top Rail across the entire overlap (y = 2.61m)
    makeBox(
      alongX ? seamCenter : seamX,
      2.61,
      alongX ? seamZ : seamCenter,
      alongX ? overlapLength : 0.11,
      0.065,
      alongX ? 0.11 : overlapLength,
      trimMaterial
    );

    // 2. Wings on both sides of the doorway: full-height wall panels and skirting
    for (const sign of [-1, 1]) {
      const wingLen = wing;
      if (wingLen > 0.02) {
        const offset = sign * (doorway / 2 + wingLen / 2);
        const wx = alongX ? seamCenter + offset : seamX;
        const wz = alongX ? seamZ : seamCenter + offset;

        // Wall panel: height 2.57m at y = 1.31m
        makeBox(
          wx,
          1.31,
          wz,
          alongX ? wingLen : 0.08,
          2.57,
          alongX ? 0.08 : wingLen,
          wallMaterial
        );

        // Skirting board at base: height 0.18m at y = 0.14m
        makeBox(
          wx,
          0.14,
          wz,
          alongX ? wingLen : 0.10,
          0.18,
          alongX ? 0.10 : wingLen,
          skirtingMaterial
        );
      }
    }

    // 3. Doorway Opening:
    // Left and right frame jambs: height 2.18m at y = 1.09m
    const postThick = 0.08;
    const postDepth = 0.14;
    makeBox(
      doorStartX,
      1.09,
      doorStartZ,
      alongX ? postThick : postDepth,
      2.18,
      alongX ? postDepth : postThick,
      trimMaterial
    );
    makeBox(
      doorEndX,
      1.09,
      doorEndZ,
      alongX ? postThick : postDepth,
      2.18,
      alongX ? postDepth : postThick,
      trimMaterial
    );

    // Header beam (lintel) across top of door frame at y = 2.18m
    makeBox(
      doorCenterX,
      2.18,
      doorCenterZ,
      alongX ? doorway + postThick : postDepth + 0.01,
      0.08,
      alongX ? postDepth + 0.01 : doorway + postThick,
      trimMaterial
    );

    // Transom wall panel above door header (from 2.22m to 2.58m, height 0.36m at y = 2.40m)
    makeBox(
      doorCenterX,
      2.40,
      doorCenterZ,
      alongX ? doorway : 0.08,
      0.36,
      alongX ? 0.08 : doorway,
      wallMaterial
    );

    // Floor threshold strip (height 0.015m at y = 0.015m)
    makeBox(
      doorCenterX,
      0.015,
      doorCenterZ,
      alongX ? doorway : 0.14,
      0.02,
      alongX ? 0.14 : doorway,
      trimMaterial
    );

    // 4. Door leaf:
    // If the wall wing is wide enough (>= 0.6m), place a door leaf swung open flat against the wall
    const leafWidth = doorway - 0.08;
    if (wing >= leafWidth * 0.7) {
      const hinge = new THREE.Group();
      hinge.position.set(doorStartX, 0.03, doorStartZ);
      // Swung open nearly flat against the wall: 82 degrees
      const swingAngle = Math.PI * 0.45;
      hinge.rotation.y = alongX ? swingAngle : -Math.PI / 2 + swingAngle;

      const leaf = new THREE.Mesh(geometry, doorLeafMaterial);
      leaf.scale.set(leafWidth, 2.10, 0.04);
      leaf.position.set(leafWidth / 2, 1.05, 0);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      hinge.add(leaf);

      const handle = new THREE.Mesh(geometry, trimMaterial);
      handle.scale.set(0.12, 0.03, 0.05);
      handle.position.set(leafWidth - 0.14, 1.02, 0.03);
      hinge.add(handle);

      partitions.add(hinge);
    }

    // 5. Residual exterior walls:
    // If either parent or child room extends beyond the overlap interval, build exterior walls
    for (const roomItem of [parent, room]) {
      const isParent = roomItem.id === parent.id;
      const roomEdge: RoomSide = isParent ? side : oppositeSide[side];
      const isFullHeight = roomEdge === 'north' || roomEdge === 'west';
      const rMin = isParent ? pMin : cMin;
      const rMax = isParent ? pMax : cMax;

      if (overlapMin - rMin > 0.02) {
        const span = overlapMin - rMin;
        const center = rMin + span / 2;
        const rx = alongX ? center : seamX;
        const rz = alongX ? seamZ : center;
        if (isFullHeight) {
          makeBox(rx, 1.31, rz, alongX ? span : 0.08, 2.57, alongX ? 0.08 : span, wallMaterial);
          makeBox(rx, 2.61, rz, alongX ? span : 0.11, 0.065, alongX ? 0.11 : span, trimMaterial);
        }
        makeBox(rx, 0.14, rz, alongX ? span : 0.10, 0.18, alongX ? 0.10 : span, skirtingMaterial);
      }
      if (rMax - overlapMax > 0.02) {
        const span = rMax - overlapMax;
        const center = overlapMax + span / 2;
        const rx = alongX ? center : seamX;
        const rz = alongX ? seamZ : center;
        if (isFullHeight) {
          makeBox(rx, 1.31, rz, alongX ? span : 0.08, 2.57, alongX ? 0.08 : span, wallMaterial);
          makeBox(rx, 2.61, rz, alongX ? span : 0.11, 0.065, alongX ? 0.11 : span, trimMaterial);
        }
        makeBox(rx, 0.14, rz, alongX ? span : 0.10, 0.18, alongX ? 0.10 : span, skirtingMaterial);
      }
    }
  }
  const positions:SceneBuild['positions']=new Map(),placements:SceneBuild['placements']=new Map();
  const sync=()=>{
    for(const {build,origin} of pieces){
      const offset=new THREE.Vector3(origin.x,0,origin.z);
      for(const [id,pos] of build.positions)positions.set(id,pos.clone().add(offset));
      for(const [id,meta] of build.placements)placements.set(id,{...meta,pos:meta.pos.clone().add(offset)});
    }
    root.updateMatrixWorld(true);
  };
  const owner=(id:string)=>pieces.find(p=>p.build.positions.has(id));
  sync();
  return {
    root,picks:pieces.flatMap(p=>p.build.picks),positions,placements,
    previewFurniture(id,x,z){owner(id)?.build.previewFurniture(id,x,z);sync();},
    previewPlacement(id,pos,rotation){const p=owner(id);if(p)p.build.previewPlacement(id,pos.clone().sub(new THREE.Vector3(p.origin.x,0,p.origin.z)),rotation);sync();},
    resetPlacementPreview(id){owner(id)?.build.resetPlacementPreview(id);sync();},
    setPlacementHover(id,progress){owner(id)?.build.setPlacementHover(id,progress);},
    setPrinterHover(id,progress){owner(id)?.build.setPrinterHover(id,progress);},
    setFurnitureBorderColor(id,color){owner(id)?.build.setFurnitureBorderColor(id,color);},
    dispose(){pieces.forEach(p=>p.build.dispose());geometry.dispose();wallMaterial.dispose();trimMaterial.dispose();skirtingMaterial.dispose();doorLeafMaterial.dispose();root.removeFromParent();},
  };
}
