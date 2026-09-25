export type FurnitureKind = 'table' | 'printer_rack' | 'filament_rack' | 'plant' | 'boxes' | 'cabinet';
export type EntityKind = 'printer' | 'filament';
export type ModelKey = 'a1' | 'p1';
export type RoomSide = 'north' | 'east' | 'south' | 'west';
export interface RoomLabel { id: string; text: string; color: string; surface: 'floor' | RoomSide; u: number; v: number; size: number; rotation?: number }
export interface Room { id: string; name: string; width: number; depth: number; attachment?: { roomId: string; side: RoomSide }; labels?: RoomLabel[]; camera?: { x: number; y: number; z: number; span: number; azimuth?: number; top?: boolean }; tiles?: Array<[number, number]> }
export interface Furniture { id: string; roomId: string; name: string; kind: FurnitureKind; x: number; z: number; rotation: number; width: number; depth: number; height: number; levels: number; columns: number }
export interface Slot { id: string; furnitureId: string; kind: EntityKind; index: number; x: number; y: number; z: number }
export interface Placement { id: string; entityId: string; kind: EntityKind; slotId: string; model: ModelKey }
export interface Workshop { version: 1; rooms: Room[]; furniture: Furniture[]; slots: Slot[]; placements: Placement[] }
export const furnitureNames: Record<FurnitureKind, string> = {
  table: 'Стол',
  printer_rack: 'Стойка',
  filament_rack: 'Стеллаж',
  plant: 'Кустик / Растение',
  boxes: 'Упаковочные коробки',
  cabinet: 'Инструментальная тумба',
};
export const uid = () => crypto.randomUUID();
export const snap = (n: number, grid: number) => Math.round(n / grid) * grid;
export function pickWorkshopTarget<T extends {userData:Record<string,unknown>}>(hits:{object:T}[],edit:boolean):T|undefined {
  return (!edit?hits.find(hit=>hit.object.userData.placementId)?.object:undefined)??hits[0]?.object;
}

export function createFurniture(roomId: string, kind: FurnitureKind): Furniture {
  const isDecor = ['plant', 'boxes', 'cabinet'].includes(kind);
  return {
    id: uid(),
    roomId,
    kind,
    name: furnitureNames[kind],
    x: 0,
    z: 0,
    rotation: 0,
    width: kind === 'table' ? 3.6 : kind === 'printer_rack' ? 2.7 : kind === 'filament_rack' ? 1.8 : kind === 'cabinet' ? 1.0 : kind === 'boxes' ? 0.8 : 0.6,
    depth: kind === 'filament_rack' ? .45 : kind === 'cabinet' ? 0.6 : kind === 'boxes' ? 0.6 : kind === 'plant' ? 0.6 : .8,
    height: kind === 'table' ? .85 : kind === 'printer_rack' ? 2.35 : kind === 'filament_rack' ? 2.15 : kind === 'cabinet' ? 0.85 : kind === 'boxes' ? 0.65 : 0.9,
    levels: kind === 'printer_rack' ? 2 : kind === 'filament_rack' ? 4 : 1,
    columns: isDecor ? 0 : (kind === 'table' ? 4 : kind === 'printer_rack' ? 3 : 8),
  };
}
export function slotsFor(f: Furniture, previous: Slot[] = []): Slot[] {
  if (f.columns <= 0 || f.levels <= 0) return [];
  return Array.from({ length: f.levels * f.columns }, (_, index) => ({
    id: previous.find(s => s.index === index)?.id ?? uid(), furnitureId: f.id,
    kind: f.kind === 'filament_rack' ? 'filament' : 'printer', index,
    x: ((index % f.columns + .5) / f.columns - .5) * f.width,
    y: f.kind === 'table' ? f.height : .18 + Math.floor(index / f.columns) * (f.height - .35) / f.levels,
    z: 0,
  }));
}
export function footprint(f: Furniture) {
  return f.rotation % 180 === 0 ? { w: f.width, d: f.depth } : { w: f.depth, d: f.width };
}
export function validFurniture(state: Workshop, f: Furniture): boolean {
  const room = state.rooms.find(r => r.id === f.roomId);
  if (!room || !f.name.trim() || ![f.x,f.z,f.rotation,f.width,f.depth,f.height,f.levels,f.columns].every(Number.isFinite)) return false;
  if (![0,90,180,270].includes(f.rotation) || f.width < .3 || f.depth < .3 || f.height < .3 || f.height > 3 || f.levels < 1 || f.levels > 6 || f.columns < 0 || f.columns > 16 || !Number.isInteger(f.levels) || !Number.isInteger(f.columns)) return false;
  if (['plant', 'boxes', 'cabinet'].includes(f.kind)) {
    if (f.levels !== 1 || f.columns !== 0) return false;
  } else {
    if (f.columns < 1) return false;
    if (f.kind === 'table' && f.levels !== 1) return false;
    if (f.width / f.columns < (f.kind === 'filament_rack' ? .16 : .6) || (f.kind !== 'table' && (f.height - .35) / f.levels < (f.kind === 'filament_rack' ? .24 : .95))) return false;
  }
  const { w,d } = footprint(f);
  if (Math.abs(f.x) + w/2 > room.width/2 - .15 || Math.abs(f.z) + d/2 > room.depth/2 - .15) return false;
  return !state.furniture.some(other => {
    if (other.id === f.id || other.roomId !== f.roomId) return false;
    const o = footprint(other);
    return Math.abs(other.x - f.x) < (o.w+w)/2 + .08 && Math.abs(other.z - f.z) < (o.d+d)/2 + .08;
  });
}
export function getFurnitureCollisionReason(state: Workshop, f: Furniture): string | null {
  const room = state.rooms.find(r => r.id === f.roomId);
  if (!room) return 'Комната не найдена';

  const { w, d } = footprint(f);
  if (Math.abs(f.x) + w / 2 > room.width / 2 - 0.15 || Math.abs(f.z) + d / 2 > room.depth / 2 - 0.15) {
    return 'Выход за пределы комнаты';
  }

  const collidingOther = state.furniture.find(other => {
    if (other.id === f.id || other.roomId !== f.roomId) return false;
    const o = footprint(other);
    return Math.abs(other.x - f.x) < (o.w + w) / 2 + 0.08 && Math.abs(other.z - f.z) < (o.d + d) / 2 + 0.08;
  });
  if (collidingOther) {
    return `Пересечение с «${collidingOther.name}»`;
  }

  if (!validFurniture(state, f)) {
    return 'Недопустимые параметры объекта';
  }

  return null;
}
export function snapFurnitureToNeighbors(
  targetX: number,
  targetZ: number,
  f: Furniture,
  others: Furniture[],
  room: Room,
  snapDist = 0.2,
): { x: number; z: number; snappedX: boolean; snappedZ: boolean } {
  const { w, d } = footprint(f);
  const validOthers = others.filter(o => o.id !== f.id && (!o.roomId || o.roomId === room.id));

  let bestX = targetX;
  let minXDist = Infinity;

  const fOffsetsX = [-w / 2, 0, w / 2];
  for (const other of validOthers) {
    const { w: ow } = footprint(other);
    const otherPointsX = [other.x - ow / 2, other.x, other.x + ow / 2];
    for (const off of fOffsetsX) {
      for (const pt of otherPointsX) {
        const candX = pt - off;
        const dist = Math.abs(targetX - candX);
        if (dist < minXDist) {
          minXDist = dist;
          bestX = candX;
        }
      }
    }
  }

  const wallMarginX = room.width / 2 - w / 2 - 0.15;
  for (const wallX of [wallMarginX, -wallMarginX]) {
    const dist = Math.abs(targetX - wallX);
    if (dist < minXDist) {
      minXDist = dist;
      bestX = wallX;
    }
  }

  let bestZ = targetZ;
  let minZDist = Infinity;

  const fOffsetsZ = [-d / 2, 0, d / 2];
  for (const other of validOthers) {
    const { d: od } = footprint(other);
    const otherPointsZ = [other.z - od / 2, other.z, other.z + od / 2];
    for (const off of fOffsetsZ) {
      for (const pt of otherPointsZ) {
        const candZ = pt - off;
        const dist = Math.abs(targetZ - candZ);
        if (dist < minZDist) {
          minZDist = dist;
          bestZ = candZ;
        }
      }
    }
  }

  const wallMarginZ = room.depth / 2 - d / 2 - 0.15;
  for (const wallZ of [wallMarginZ, -wallMarginZ]) {
    const dist = Math.abs(targetZ - wallZ);
    if (dist < minZDist) {
      minZDist = dist;
      bestZ = wallZ;
    }
  }

  const snappedX = minXDist <= snapDist;
  const snappedZ = minZDist <= snapDist;

  return {
    x: snappedX ? Math.round(bestX * 10000) / 10000 : targetX,
    z: snappedZ ? Math.round(bestZ * 10000) / 10000 : targetZ,
    snappedX,
    snappedZ,
  };
}
export function slotWorld(f: Furniture, s: Slot): [number,number,number] {
  const angle = f.rotation * Math.PI / 180;
  return [f.x + s.x * Math.cos(angle) + s.z * Math.sin(angle), s.y, f.z - s.x * Math.sin(angle) + s.z * Math.cos(angle)];
}
export function updateFurniture(state: Workshop, f: Furniture): Workshop {
  if (!validFurniture(state,f)) throw new Error('Проверьте размеры, интервалы между слотами, границы комнаты и пересечения мебели.');
  const slots = slotsFor(f, state.slots.filter(s => s.furnitureId === f.id));
  const removed = new Set(state.slots.filter(s => s.furnitureId === f.id && !slots.some(n=>n.id===s.id)).map(s=>s.id));
  if (state.placements.some(p => removed.has(p.slotId))) throw new Error('Сначала освободите слоты, которые исчезнут после изменения.');
  return { ...state, furniture: state.furniture.some(x=>x.id===f.id) ? state.furniture.map(x=>x.id===f.id?f:x) : [...state.furniture,f], slots:[...state.slots.filter(s=>s.furnitureId!==f.id),...slots] };
}
export function placeEntity(state: Workshop, kind: EntityKind, entityId: string, slotId: string, model: ModelKey): Workshop {
  const slot = state.slots.find(s => s.id === slotId);
  if (!slot || slot.kind !== kind) throw new Error('Этот слот не подходит для выбранного объекта.');
  if (state.placements.some(p => p.slotId === slotId && (p.entityId !== entityId || p.kind !== kind))) throw new Error('Слот уже занят.');
  const old = state.placements.find(p=>p.kind===kind && p.entityId===entityId);
  return { ...state, placements: [...state.placements.filter(p=>p!==old), {id:old?.id??uid(),kind,entityId,slotId,model}] };
}

function resolvePrinterModel(printer: { model_3d?: string; name?: string }): ModelKey {
  if (printer.model_3d === 'p1' || printer.model_3d === 'a1') return printer.model_3d;
  if (printer.name && /(p1|p1s|p1p|x1|x1c|x1-carbon)/i.test(printer.name)) return 'p1';
  return 'a1';
}

export function syncWorkshopPlacements(
  state: Workshop,
  printers: Array<{ id: string; name?: string; model_3d?: string }>,
  filaments: Array<{ id: string; name?: string; color?: string }>,
): Workshop {
  const printerIds = new Set(printers.map(p => p.id));
  const filamentIds = new Set(filaments.map(f => f.id));
  const printersById = new Map(printers.map(p => [p.id, p]));

  let placements = state.placements.filter(p => {
    if (p.kind === 'printer') return printerIds.has(p.entityId);
    if (p.kind === 'filament') return filamentIds.has(p.entityId);
    return false;
  });

  let changed = placements.length !== state.placements.length;
  placements = placements.map(p => {
    if (p.kind === 'printer') {
      const printer = printersById.get(p.entityId);
      if (printer) {
        const expectedModel = resolvePrinterModel(printer);
        if (p.model !== expectedModel) {
          changed = true;
          return { ...p, model: expectedModel };
        }
      }
    }
    return p;
  });

  const occupiedSlots = new Set(placements.map(p => p.slotId));
  const placedPrinterIds = new Set(placements.filter(p => p.kind === 'printer').map(p => p.entityId));
  const placedFilamentIds = new Set(placements.filter(p => p.kind === 'filament').map(p => p.entityId));

  for (const printer of printers) {
    if (placedPrinterIds.has(printer.id)) continue;
    const freeSlot = state.slots.find(s => s.kind === 'printer' && !occupiedSlots.has(s.id));
    if (!freeSlot) break;
    const expectedModel = resolvePrinterModel(printer);
    placements.push({
      id: uid(),
      kind: 'printer',
      entityId: printer.id,
      slotId: freeSlot.id,
      model: expectedModel,
    });
    occupiedSlots.add(freeSlot.id);
    placedPrinterIds.add(printer.id);
    changed = true;
  }

  for (const filament of filaments) {
    if (placedFilamentIds.has(filament.id)) continue;
    const freeSlot = state.slots.find(s => s.kind === 'filament' && !occupiedSlots.has(s.id));
    if (!freeSlot) break;
    placements.push({
      id: uid(),
      kind: 'filament',
      entityId: filament.id,
      slotId: freeSlot.id,
      model: 'a1',
    });
    occupiedSlots.add(freeSlot.id);
    placedFilamentIds.add(filament.id);
    changed = true;
  }

  if (!changed) return state;
  return { ...state, placements };
}
export function removeFurniture(state: Workshop, id: string): Workshop {
  const slots = state.slots.filter(s=>s.furnitureId!==id), ids = new Set(slots.map(s=>s.id));
  return {...state,furniture:state.furniture.filter(f=>f.id!==id),slots,placements:state.placements.filter(p=>ids.has(p.slotId))};
}
export function resetWorkshop(): Workshop {
  return createWorkshop();
}
export function removeRoom(state: Workshop, id: string, cascade = false): Workshop {
  const toRemove = new Set<string>([id]);
  if (cascade) {
    let added = true;
    while (added) {
      added = false;
      for (const r of state.rooms) {
        if (r.attachment && toRemove.has(r.attachment.roomId) && !toRemove.has(r.id)) {
          toRemove.add(r.id);
          added = true;
        }
      }
    }
  } else if (state.rooms.some(room => room.attachment?.roomId === id)) {
    throw new Error('Сначала удалите примыкающие комнаты.');
  }

  let result = state;
  for (const f of state.furniture.filter(f => toRemove.has(f.roomId))) {
    result = removeFurniture(result, f.id);
  }

  let remaining = result.rooms.filter(r => !toRemove.has(r.id));
  if (remaining.length > 0 && !remaining.some(r => !r.attachment)) {
    remaining = remaining.map((r, i) => i === 0 ? { ...r, attachment: undefined } : r);
  }

  result = { ...result, rooms: remaining };
  if (remaining.length > 0) {
    validateSpatialRooms(result);
  }
  return result;
}
export function createWorkshop(): Workshop {
  const room: Room = {id:uid(),name:'Основная мастерская',width:14,depth:10};
  let state: Workshop = {version:1,rooms:[room],furniture:[],slots:[],placements:[]};
  for (const [i,position] of [[-2.8,1.6],[1.4,1.6],[-2.8,-.8],[1.4,-.8]].entries()) {
    state=updateFurniture(state,{...createFurniture(room.id,'table'),name:`Стол ${String.fromCharCode(65+i)}`,x:position[0],z:position[1]});
  }
  for (const [i,x] of [1.8,4.2].entries()) state=updateFurniture(state,{...createFurniture(room.id,'filament_rack'),name:`Материалы ${i+1}`,x,z:-4.1});
  state=updateFurniture(state,{...createFurniture(room.id,'cabinet'),name:'Шкаф с инструментом',x:-5.75,z:-4.25});
  state=updateFurniture(state,{...createFurniture(room.id,'boxes'),name:'Коробки',x:-4.25,z:-4.25});
  state=updateFurniture(state,{...createFurniture(room.id,'plant'),name:'Растение 1',x:-6.25,z:4.25});
  state=updateFurniture(state,{...createFurniture(room.id,'plant'),name:'Растение 2',x:6.25,z:-4.25});
  return state;
}
export function parseWorkshop(raw: string): Workshop | null {
  try {
    const s = JSON.parse(raw) as Workshop;
    if (s.version!==1 || ![s.rooms,s.furniture,s.slots,s.placements].every(Array.isArray)) return null;
    if (s.rooms.length>50 || s.furniture.length>500 || s.slots.length>10000) return null;
    const unique = (items: {id:string}[]) => items.every(x=>typeof x.id==='string' && x.id.length>0) && new Set(items.map(x=>x.id)).size===items.length;
    if (![s.rooms,s.furniture,s.slots,s.placements].every(unique)) return null;
    if (s.rooms.some(r=>typeof r.name!=='string' || !r.name.trim() || ![r.width,r.depth].every(n=>Number.isFinite(n)&&n>=2&&n<=40) || (r.camera && (! [r.camera.x,r.camera.y,r.camera.z,r.camera.span].every(n=>Number.isFinite(n)&&Math.abs(n)<1000) || r.camera.span<=0)))) return null;
    if (s.rooms.some(r=>r.camera&&((r.camera.azimuth!==undefined&&(!Number.isFinite(r.camera.azimuth)||Math.abs(r.camera.azimuth)>1000))||(r.camera.top!==undefined&&typeof r.camera.top!=='boolean')))) return null;
    if (s.rooms.some(r => r.tiles && (!Array.isArray(r.tiles) || r.tiles.length > 2000 || r.tiles.some(t => !Array.isArray(t) || t.length !== 2 || !t.every(Number.isFinite))))) return null;
    if (s.furniture.some(f=>typeof f.name!=='string' || !Object.hasOwn(furnitureNames,f.kind) || !validFurniture(s,f))) return null;
    if (s.slots.some(slot=>!s.furniture.some(f=>f.id===slot.furnitureId && (f.kind==='filament_rack'?'filament':'printer')===slot.kind) || ![slot.index,slot.x,slot.y,slot.z].every(Number.isFinite))) return null;
    if (new Set(s.slots.map(x=>`${x.furnitureId}:${x.index}`)).size!==s.slots.length) return null;
    for (const f of s.furniture) {
      const actual=s.slots.filter(slot=>slot.furnitureId===f.id);
      const expected=slotsFor(f,actual);
      if(actual.length!==expected.length || actual.some(slot=>!Number.isInteger(slot.index) || slot.index<0 || slot.index>=expected.length || ['x','y','z'].some(key=>Math.abs(slot[key as 'x']-expected[slot.index][key as 'x'])>1e-6))) return null;
    }
    if (s.placements.some(p=>typeof p.entityId!=='string' || !['a1','p1'].includes(p.model) || !s.slots.some(slot=>slot.id===p.slotId&&slot.kind===p.kind))) return null;
    if (new Set(s.placements.map(p=>p.slotId)).size!==s.placements.length || new Set(s.placements.map(p=>`${p.kind}:${p.entityId}`)).size!==s.placements.length) return null;
    return normalizeSpatialWorkshop(s);
  } catch { return null; }
}

const roomSides: RoomSide[] = ['north', 'east', 'south', 'west'];
const oppositeSide: Record<RoomSide, RoomSide> = { north:'south', east:'west', south:'north', west:'east' };
const validRoomSize = (width: number, depth: number) => [width,depth].every(n=>Number.isFinite(n)&&n>=2&&n<=40);

export function roomOrigin(state: Workshop, roomId: string): {x:number;z:number} {
  const visited=new Set<string>();
  function origin(id:string): {x:number;z:number} {
    const room=state.rooms.find(r=>r.id===id);
    if(!room || visited.has(id)) throw new Error('Связи комнат повреждены.');
    visited.add(id);
    if (room.tiles && room.tiles.length > 0) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [tx, tz] of room.tiles) {
        if (tx < minX) minX = tx;
        if (tx > maxX) maxX = tx;
        if (tz < minZ) minZ = tz;
        if (tz > maxZ) maxZ = tz;
      }
      return { x: (minX + maxX + 1) / 2, z: (minZ + maxZ + 1) / 2 };
    }
    if(!room.attachment) return {x:0,z:0};
    const parent=state.rooms.find(r=>r.id===room.attachment!.roomId);
    if(!parent || !roomSides.includes(room.attachment.side)) throw new Error('Связи комнат повреждены.');
    const point=origin(parent.id);
    switch(room.attachment.side){
      case 'north': return {x:point.x,z:point.z-(parent.depth+room.depth)/2};
      case 'south': return {x:point.x,z:point.z+(parent.depth+room.depth)/2};
      case 'east': return {x:point.x+(parent.width+room.width)/2,z:point.z};
      case 'west': return {x:point.x-(parent.width+room.width)/2,z:point.z};
    }
  }
  return origin(roomId);
}

export function findRoomAt(state: Workshop, worldX: number, worldZ: number): Room | undefined {
  let bestRoom: Room | undefined = undefined;
  let minDistance = Infinity;

  for (const room of state.rooms) {
    const o = roomOrigin(state, room.id);
    const halfW = room.width / 2;
    const halfD = room.depth / 2;
    if (Math.abs(worldX - o.x) <= halfW && Math.abs(worldZ - o.z) <= halfD) {
      return room;
    }
    const dx = Math.max(0, Math.abs(worldX - o.x) - halfW);
    const dz = Math.max(0, Math.abs(worldZ - o.z) - halfD);
    const dist = Math.hypot(dx, dz);
    if (dist < minDistance) {
      minDistance = dist;
      bestRoom = room;
    }
  }

  if (minDistance <= 0.5) {
    return bestRoom;
  }
  return undefined;
}

export function roomSideAvailable(state:Workshop, roomId:string, side:RoomSide):boolean {
  const room=state.rooms.find(r=>r.id===roomId);
  return !!room && roomSides.includes(side) && (!room.attachment || oppositeSide[room.attachment.side]!==side) && !state.rooms.some(r=>r.attachment?.roomId===roomId && r.attachment.side===side);
}

function validateRoomLabels(labels:RoomLabel[]):boolean {
  return Array.isArray(labels) && labels.length<=100 && new Set(labels.map(label=>label?.id)).size===labels.length && labels.every(label=>
    label && typeof label.id==='string' && label.id.length>0 && label.id.length<=128 &&
    typeof label.text==='string' && label.text.trim().length>0 && label.text.length<=120 && !/[\u0000-\u001f\u007f]/.test(label.text) &&
    typeof label.color==='string' && /^#[\da-f]{6}$/i.test(label.color) && ['floor',...roomSides].includes(label.surface) &&
    [label.u,label.v].every(n=>Number.isFinite(n)&&n>=0&&n<=1) && Number.isFinite(label.size) && label.size>=.1 && label.size<=10 &&
    (label.rotation===undefined || (Number.isFinite(label.rotation)&&Math.abs(label.rotation)<=360)));
}

function validateSpatialRooms(state:Workshop):void {
  if(state.rooms.length>50) throw new Error('Можно создать не более 50 комнат.');
  const positions=state.rooms.map(room=>{
    if(room.attachment!==undefined && (!room.attachment || typeof room.attachment!=='object')) throw new Error('Связи комнат повреждены.');
    if(!validRoomSize(room.width,room.depth)) throw new Error('Размеры комнаты должны быть от 2 до 40 м.');
    if(room.labels!==undefined && !validateRoomLabels(room.labels)) throw new Error('Проверьте текст, цвет, размер и положение надписи.');
    if(room.attachment){
      const parent=state.rooms.find(r=>r.id===room.attachment!.roomId);
      if(!parent || !roomSides.includes(room.attachment.side) || parent.attachment && oppositeSide[parent.attachment.side]===room.attachment.side || state.rooms.some(r=>r.id!==room.id && r.attachment?.roomId===parent.id && r.attachment.side===room.attachment!.side)) throw new Error('Сторона комнаты уже занята или связь повреждена.');
    }
    return roomOrigin(state,room.id);
  });
  for(let i=0;i<state.rooms.length;i++) for(let j=i+1;j<state.rooms.length;j++){
    const a=state.rooms[i],b=state.rooms[j];
    if (a.tiles && a.tiles.length > 0 && b.tiles && b.tiles.length > 0) {
      const bSet = new Set(b.tiles.map(([x, z]) => `${x},${z}`));
      if (a.tiles.some(([x, z]) => bSet.has(`${x},${z}`))) {
        throw new Error('Комнаты пересекаются. Выберите другую сторону или размер.');
      }
    } else {
      if(Math.abs(positions[i].x-positions[j].x)<(a.width+b.width)/2-1e-6 && Math.abs(positions[i].z-positions[j].z)<(a.depth+b.depth)/2-1e-6) throw new Error('Комнаты пересекаются. Выберите другую сторону или размер.');
    }
  }
}

export function normalizeSpatialWorkshop(state:Workshop):Workshop {
  // Persisted trees may be returned in any order; only legacy layouts need chaining.
  if(state.rooms.some(room=>room.attachment!==undefined)) {
    validateSpatialRooms(state);
    return state;
  }
  let changed=false;
  const rooms=state.rooms.map((room,index)=>{
    if(index===0 || room.attachment!==undefined) return room;
    changed=true;
    return {...room,attachment:{roomId:state.rooms[index-1].id,side:'east' as const}};
  });
  const next=changed?{...state,rooms}:state;
  validateSpatialRooms(next);
  return next;
}

export function attachRoom(state:Workshop,parentId:string,side:RoomSide,width:number,depth:number):Workshop {
  if(!roomSideAvailable(state,parentId,side)) throw new Error('Эта сторона комнаты уже занята.');
  const room:Room={id:uid(),name:`Комната ${state.rooms.length+1}`,width,depth,attachment:{roomId:parentId,side},labels:[]};
  const next={...state,rooms:[...state.rooms,room]};
  validateSpatialRooms(next);
  return next;
}

export function resizeRoom(state:Workshop,id:string,width:number,depth:number):Workshop {
  if(!state.rooms.some(r=>r.id===id)) throw new Error('Комната не найдена.');
  const next={...state,rooms:state.rooms.map(room=>room.id===id?{...room,width,depth}:room)};
  validateSpatialRooms(next);
  if(next.furniture.some(f=>f.roomId===id && !validFurniture(next,f))) throw new Error('Мебель выходит за новые границы комнаты.');
  return next;
}

export function defaultRoomLabels(room:Room):RoomLabel[] {
  if(room.labels!==undefined) return room.labels;
  const bays=Math.ceil(room.width/2.8);
  return [
    {id:`${room.id}-a`,text:'A  /  ПРОТОТИПЫ',color:'#e0e2dd',surface:'floor',u:.27,v:.85,size:.625},
    {id:`${room.id}-a-wall`,text:'A   ПРОТОТИПЫ',color:'#e0e2dd',surface:'west',u:.48,v:1.95/2.6,size:.46},
    {id:`${room.id}-b`,text:'B   ПРОИЗВОДСТВО',color:'#e0e2dd',surface:'north',u:(bays>2?1.5:.5)/bays,v:1.95/2.6,size:.46},
    {id:`${room.id}-c`,text:'C   МАТЕРИАЛЫ',color:'#e0e2dd',surface:'north',u:1-.5/bays,v:1.95/2.6,size:.46},
    {id:`${room.id}-d`,text:'D  /  СБОРКА',color:'#e0e2dd',surface:'floor',u:.74,v:.85,size:.625},
  ];
}

export function updateRoomLabels(state:Workshop,id:string,labels:RoomLabel[]):Workshop {
  if(!state.rooms.some(room=>room.id===id)) throw new Error('Комната не найдена.');
  if(!validateRoomLabels(labels)) throw new Error('Проверьте текст (1–120 символов), цвет HEX, размер (0,1–10 м) и положение надписи.');
  return {...state,rooms:state.rooms.map(room=>room.id===id?{...room,labels:labels.map(label=>({...label}))}:room)};
}

export function resizeFurnitureOnGrid(state:Workshop,id:string,width:number,depth:number):Workshop {
  const furniture=state.furniture.find(f=>f.id===id);
  if(!furniture) throw new Error('Мебель не найдена.');
  if(![width,depth].every(Number.isFinite)) throw new Error('Укажите корректные размеры мебели.');
  width=snap(width,.5);depth=snap(depth,.5);
  const minimum=furniture.kind==='filament_rack'?.16:.6;
  const columns=furniture.columns===0?0:Math.min(16,Math.floor((width+1e-6)/minimum));
  if(width<.5 || depth<.5 || furniture.columns>0 && columns===0) throw new Error('Для принтера нужна ширина не менее 0,6 м; размеры задаются с шагом 0,5 м.');
  return updateFurniture(state,{...furniture,width,depth,columns});
}

export function updateRoomLabel(state: Workshop, roomId: string, labelId: string, patch: Partial<RoomLabel>): Workshop {
  const room = state.rooms.find(r => r.id === roomId);
  if (!room) throw new Error('Комната не найдена.');
  const labels = defaultRoomLabels(room).map(label => label.id === labelId ? { ...label, ...patch } : label);
  return updateRoomLabels(state, roomId, labels);
}

export function deleteRoomLabel(state: Workshop, roomId: string, labelId: string): Workshop {
  const room = state.rooms.find(r => r.id === roomId);
  if (!room) throw new Error('Комната не найдена.');
  const labels = defaultRoomLabels(room).filter(label => label.id !== labelId);
  return updateRoomLabels(state, roomId, labels);
}

export interface PerimeterEdge {
  x: number;
  z: number;
  side: RoomSide;
}

export function roomPerimeterEdges(tiles: Array<[number, number]>): PerimeterEdge[] {
  const set = new Set(tiles.map(([x, z]) => `${x},${z}`));
  const edges: PerimeterEdge[] = [];
  for (const [x, z] of tiles) {
    if (!set.has(`${x},${z - 1}`)) edges.push({ x, z, side: 'north' });
    if (!set.has(`${x + 1},${z}`)) edges.push({ x, z, side: 'east' });
    if (!set.has(`${x},${z + 1}`)) edges.push({ x, z, side: 'south' });
    if (!set.has(`${x - 1},${z}`)) edges.push({ x, z, side: 'west' });
  }
  return edges;
}

export function isTileOccupiedByRooms(state: Workshop, gx: number, gz: number, ignoreRoomId?: string): boolean {
  const cx = gx + 0.5;
  const cz = gz + 0.5;
  for (const room of state.rooms) {
    if (ignoreRoomId && room.id === ignoreRoomId) continue;
    if (room.tiles && room.tiles.length > 0) {
      if (room.tiles.some(([tx, tz]) => tx === gx && tz === gz)) {
        return true;
      }
    }
    const o = roomOrigin(state, room.id);
    const minX = o.x - room.width / 2;
    const maxX = o.x + room.width / 2;
    const minZ = o.z - room.depth / 2;
    const maxZ = o.z + room.depth / 2;
    if (cx > minX && cx < maxX && cz > minZ && cz < maxZ) {
      return true;
    }
  }
  return false;
}

export function existingRoomsTileBounds(state: Workshop): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
  if (!state.rooms || state.rooms.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const room of state.rooms) {
    if (room.tiles && room.tiles.length > 0) {
      for (const [tx, tz] of room.tiles) {
        if (tx < minX) minX = tx;
        if (tx > maxX) maxX = tx;
        if (tz < minZ) minZ = tz;
        if (tz > maxZ) maxZ = tz;
      }
    } else {
      const o = roomOrigin(state, room.id);
      const rMinX = Math.floor(o.x - room.width / 2);
      const rMaxX = Math.ceil(o.x + room.width / 2);
      const rMinZ = Math.floor(o.z - room.depth / 2);
      const rMaxZ = Math.ceil(o.z + room.depth / 2);
      if (rMinX < minX) minX = rMinX;
      if (rMaxX > maxX) maxX = rMaxX;
      if (rMinZ < minZ) minZ = rMinZ;
      if (rMaxZ > maxZ) maxZ = rMaxZ;
    }
  }

  return Number.isFinite(minX) ? { minX, maxX, minZ, maxZ } : null;
}

/**
 * Automatically detects closed loops / contours formed by draft tiles and
 * fills all interior tiles that are fully enclosed by the contour (or enclosed
 * between the draft contour and existing room walls/floors).
 */
export function fillEnclosedTiles(
  tiles: Array<[number, number]>,
  isForbidden?: (gx: number, gz: number) => boolean,
  extraBounds?: { minX: number; maxX: number; minZ: number; maxZ: number }
): Array<[number, number]> {
  if (tiles.length < 5) return tiles;

  const tileSet = new Set(tiles.map(([x, z]) => `${x},${z}`));
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const [x, z] of tiles) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  // Need at least 2 tiles span in both dimensions to enclose anything
  if (maxX - minX < 1 || maxZ - minZ < 1) return tiles;

  let totalMinX = minX;
  let totalMaxX = maxX;
  let totalMinZ = minZ;
  let totalMaxZ = maxZ;

  if (extraBounds) {
    totalMinX = Math.min(totalMinX, extraBounds.minX);
    totalMaxX = Math.max(totalMaxX, extraBounds.maxX);
    totalMinZ = Math.min(totalMinZ, extraBounds.minZ);
    totalMaxZ = Math.max(totalMaxZ, extraBounds.maxZ);
  }

  const boxMinX = totalMinX - 2;
  const boxMaxX = totalMaxX + 2;
  const boxMinZ = totalMinZ - 2;
  const boxMaxZ = totalMaxZ + 2;

  const isObstacle = (x: number, z: number): boolean => {
    const key = `${x},${z}`;
    if (tileSet.has(key)) return true;
    if (isForbidden && isForbidden(x, z)) return true;
    return false;
  };

  // Flood fill from all exterior boundary cells of the expanded bounding box
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [];

  const enqueue = (x: number, z: number) => {
    const key = `${x},${z}`;
    if (!isObstacle(x, z) && !visited.has(key)) {
      visited.add(key);
      queue.push([x, z]);
    }
  };

  for (let x = boxMinX; x <= boxMaxX; x++) {
    enqueue(x, boxMinZ);
    enqueue(x, boxMaxZ);
  }
  for (let z = boxMinZ; z <= boxMaxZ; z++) {
    enqueue(boxMinX, z);
    enqueue(boxMaxX, z);
  }

  let head = 0;
  while (head < queue.length) {
    const [cx, cz] = queue[head++];
    const neighbors: Array<[number, number]> = [
      [cx + 1, cz],
      [cx - 1, cz],
      [cx, cz + 1],
      [cx, cz - 1],
    ];
    for (const [nx, nz] of neighbors) {
      if (nx >= boxMinX && nx <= boxMaxX && nz >= boxMinZ && nz <= boxMaxZ) {
        enqueue(nx, nz);
      }
    }
  }

  // Any tile inside [searchMinX, searchMaxX] x [searchMinZ, searchMaxZ] that was NOT reached
  // by exterior flood fill and is not forbidden is enclosed!
  const searchMinX = Math.max(boxMinX + 1, minX - 1);
  const searchMaxX = Math.min(boxMaxX - 1, maxX + 1);
  const searchMinZ = Math.max(boxMinZ + 1, minZ - 1);
  const searchMaxZ = Math.min(boxMaxZ - 1, maxZ + 1);

  const filled = [...tiles];
  for (let x = searchMinX; x <= searchMaxX; x++) {
    for (let z = searchMinZ; z <= searchMaxZ; z++) {
      const key = `${x},${z}`;
      if (!tileSet.has(key) && !visited.has(key)) {
        if (!isForbidden || !isForbidden(x, z)) {
          tileSet.add(key);
          filled.push([x, z]);
        }
      }
    }
  }

  return filled;
}

export function createRoomFromTiles(state: Workshop, tiles: Array<[number, number]>, name?: string): Workshop {
  if (!tiles || tiles.length === 0) throw new Error('Выберите хотя бы одну клетку для создания комнаты.');

  const tileSet = new Set<string>();
  const uniqueTiles: Array<[number, number]> = [];
  for (const [x, z] of tiles) {
    const key = `${x},${z}`;
    if (!tileSet.has(key)) {
      tileSet.add(key);
      uniqueTiles.push([x, z]);
    }
  }

  for (const [x, z] of uniqueTiles) {
    if (isTileOccupiedByRooms(state, x, z)) {
      throw new Error('Нельзя строить новую комнату внутри существующей комнаты.');
    }
  }

  const minX = Math.min(...uniqueTiles.map(t => t[0]));
  const maxX = Math.max(...uniqueTiles.map(t => t[0]));
  const minZ = Math.min(...uniqueTiles.map(t => t[1]));
  const maxZ = Math.max(...uniqueTiles.map(t => t[1]));

  for (const other of state.rooms) {
    const oo = roomOrigin(state, other.id);
    const otherMinX = oo.x - other.width / 2;
    const otherMaxX = oo.x + other.width / 2;
    const otherMinZ = oo.z - other.depth / 2;
    const otherMaxZ = oo.z + other.depth / 2;
    if (minX < otherMaxX - 1e-4 && maxX + 1 > otherMinX + 1e-4 &&
        minZ < otherMaxZ - 1e-4 && maxZ + 1 > otherMinZ + 1e-4) {
      throw new Error('Нельзя строить новую комнату поверх существующей.');
    }
  }

  const width = Math.max(2, maxX - minX + 1);
  const depth = Math.max(2, maxZ - minZ + 1);

  if (width > 40 || depth > 40) {
    throw new Error('Размеры создаваемой комнаты не могут превышать 40 м.');
  }

  const roomName = name?.trim() || `Комната ${state.rooms.length + 1}`;
  const roomId = uid();

  if (state.rooms.length === 0) {
    const room: Room = {
      id: roomId,
      name: roomName,
      width,
      depth,
      labels: [],
      tiles: uniqueTiles,
    };
    const next: Workshop = { ...state, rooms: [room] };
    validateSpatialRooms(next);
    return next;
  }

  const childMinX = minX;
  const childMaxX = maxX + 1;
  const childMinZ = minZ;
  const childMaxZ = maxZ + 1;

  interface Candidate {
    parentId: string;
    side: RoomSide;
    overlap: number;
    dist: number;
  }
  const touchingCandidates: Candidate[] = [];
  const fallbackCandidates: Candidate[] = [];

  for (const parent of state.rooms) {
    const po = roomOrigin(state, parent.id);
    const pMinX = po.x - parent.width / 2;
    const pMaxX = po.x + parent.width / 2;
    const pMinZ = po.z - parent.depth / 2;
    const pMaxZ = po.z + parent.depth / 2;

    for (const side of roomSides) {
      if (!roomSideAvailable(state, parent.id, side)) continue;

      let touching = false;
      let overlap = 0;

      if (side === 'south') {
        if (Math.abs(childMinZ - pMaxZ) < 0.05) {
          overlap = Math.min(childMaxX, pMaxX) - Math.max(childMinX, pMinX);
          if (overlap > 0.5) touching = true;
        }
      } else if (side === 'north') {
        if (Math.abs(childMaxZ - pMinZ) < 0.05) {
          overlap = Math.min(childMaxX, pMaxX) - Math.max(childMinX, pMinX);
          if (overlap > 0.5) touching = true;
        }
      } else if (side === 'east') {
        if (Math.abs(childMinX - pMaxX) < 0.05) {
          overlap = Math.min(childMaxZ, pMaxZ) - Math.max(childMinZ, pMinZ);
          if (overlap > 0.5) touching = true;
        }
      } else if (side === 'west') {
        if (Math.abs(childMaxX - pMinX) < 0.05) {
          overlap = Math.min(childMaxZ, pMaxZ) - Math.max(childMinZ, pMinZ);
          if (overlap > 0.5) touching = true;
        }
      }

      const tilesCenterX = minX + width / 2;
      const tilesCenterZ = minZ + depth / 2;
      let coX = po.x;
      let coZ = po.z;
      switch (side) {
        case 'north': coZ = po.z - (parent.depth + depth) / 2; break;
        case 'south': coZ = po.z + (parent.depth + depth) / 2; break;
        case 'east': coX = po.x + (parent.width + width) / 2; break;
        case 'west': coX = po.x - (parent.width + width) / 2; break;
      }
      const dist = (coX - tilesCenterX) ** 2 + (coZ - tilesCenterZ) ** 2;

      if (touching) {
        touchingCandidates.push({ parentId: parent.id, side, overlap, dist });
      } else {
        fallbackCandidates.push({ parentId: parent.id, side, overlap: 0, dist });
      }
    }
  }

  let bestCandidate: Candidate | null = null;
  if (touchingCandidates.length > 0) {
    touchingCandidates.sort((a, b) => b.overlap - a.overlap || a.dist - b.dist);
    bestCandidate = touchingCandidates[0];
  } else if (fallbackCandidates.length > 0) {
    fallbackCandidates.sort((a, b) => a.dist - b.dist);
    bestCandidate = fallbackCandidates[0];
  }

  if (!bestCandidate) {
    throw new Error('Не удалось найти свободную сторону для присоединения новой комнаты. Проверьте расположение клеток.');
  }

  const newRoom: Room = {
    id: roomId,
    name: roomName,
    width,
    depth,
    attachment: { roomId: bestCandidate.parentId, side: bestCandidate.side },
    labels: [],
    tiles: uniqueTiles,
  };

  const next: Workshop = { ...state, rooms: [...state.rooms, newRoom] };
  validateSpatialRooms(next);
  return next;
}

/**
 * Calculates 1:1 camera-relative pan delta for 2D top view and 3D orthographic view.
 * Ensures grab-to-pan moves ground geometry synchronously with the cursor in all directions and azimuths.
 */
export function calculatePanDelta(
  dx: number,
  dy: number,
  mpp: number,
  azimuth: number,
  elevation: number,
  isTopView = false
): { deltaX: number; deltaZ: number } {
  if (isTopView) {
    return {
      deltaX: -dx * mpp,
      deltaZ: -dy * mpp,
    };
  }
  const sinElev = elevation / Math.hypot(26, elevation);
  return {
    deltaX: -dx * mpp * Math.cos(azimuth) - (dy * mpp / sinElev) * Math.sin(azimuth),
    deltaZ: dx * mpp * Math.sin(azimuth) - (dy * mpp / sinElev) * Math.cos(azimuth),
  };
}
/**
 * Calculates updated camera azimuth and elevation during 3D orbit.
 * Orbit rotation is restricted to horizontal (left/right yaw) only:
 * - Horizontal: Dragging mouse right turns the scene to the right (azimuth decreases).
 *   Dragging mouse left turns the scene to the left (azimuth increases).
 * - Vertical: Camera elevation is locked to startElevation (no vertical tilt / pitch).
 */
export function calculateOrbitAngles(
  startAzimuth: number,
  startElevation: number,
  dx: number,
  _dy = 0,
  hSpeed = 0.005,
  _vSpeed = 0.0035,
  _minElev = 3,
  _maxElev = 40
): { azimuth: number; elevation: number } {
  return {
    azimuth: startAzimuth - dx * hSpeed,
    elevation: startElevation,
  };
}

/**
 * Calculates camera target, span, azimuth, elevation and top-down flag for focusing on a room.
 * When room.camera is present, uses its saved coordinates.
 * When room.camera is absent, centers camera on the room's origin with span covering the room bounds.
 */
export function calculateRoomCameraFocus(
  state: Workshop | null,
  room: Room
): {
  target: { x: number; y: number; z: number };
  span: number;
  azimuth: number;
  elevation: number;
  top: boolean;
} {
  if (room.camera) {
    return {
      target: { x: room.camera.x, y: room.camera.y, z: room.camera.z },
      span: room.camera.span,
      azimuth: room.camera.azimuth ?? Math.PI / 4,
      elevation: 16,
      top: room.camera.top ?? false,
    };
  }

  let o = { x: 0, z: 0 };
  if (state) {
    try {
      o = roomOrigin(state, room.id);
    } catch {
      // Fallback in case of corrupted room graph
    }
  }

  return {
    target: { x: o.x, y: 0.7, z: o.z },
    span: Math.max(room.depth * 1.15, room.width * 1.15),
    azimuth: Math.PI / 4,
    elevation: 16,
    top: false,
  };
}

/**
 * Calculates bounded camera panning shift in NDC space during mouse wheel zoom.
 * Ensures NDC coordinates and resulting screen-space shifts are clamped and bounded.
 */
export function calculateWheelShift(
  ndcX: number,
  ndcY: number,
  dSpan: number,
  aspect: number
): { shiftX: number; shiftZ: number } {
  const boundedNdcX = Math.max(-1, Math.min(1, Number.isFinite(ndcX) ? ndcX : 0));
  const boundedNdcY = Math.max(-1, Math.min(1, Number.isFinite(ndcY) ? ndcY : 0));
  const boundedAspect = Math.max(0.2, Math.min(5, Number.isFinite(aspect) ? aspect : 1));
  const maxShift = Math.abs(dSpan) * 2;
  const rawShiftX = boundedNdcX * (boundedAspect * dSpan * 0.45);
  const rawShiftZ = boundedNdcY * (dSpan * 0.45);
  return {
    shiftX: Math.max(-maxShift, Math.min(maxShift, rawShiftX)),
    shiftZ: Math.max(-maxShift, Math.min(maxShift, rawShiftZ)),
  };
}

/**
 * Calculates updated camera target during wheel zoom with stability guarantees.
 * When zooming in (clampedDelta < 0) with an object selected, smoothly biases target towards the object.
 * When zooming out (clampedDelta > 0) or when no object is selected, shifts target stably based on cursor NDC projection
 * without jumping to (0,0,0) or drifting outside workshop bounds.
 */
export function calculateZoomTarget(
  currentTarget: { x: number; y: number; z: number },
  clampedDelta: number,
  selectedPos: { x: number; y: number; z: number } | null | undefined,
  camRight: { x: number; y: number; z: number },
  camUp: { x: number; y: number; z: number },
  shiftX: number,
  shiftZ: number,
  bounds?: { min: { x: number; z: number }; max: { x: number; z: number } } | null
): { x: number; y: number; z: number } {
  let nextX = currentTarget.x;
  const nextY = currentTarget.y;
  let nextZ = currentTarget.z;

  if (selectedPos && clampedDelta < 0) {
    const zoomWeight = Math.min(0.25, (Math.abs(clampedDelta) / 120) * 0.22);
    nextX += (selectedPos.x - nextX) * zoomWeight;
    nextZ += (selectedPos.z - nextZ) * zoomWeight;
  } else {
    nextX += camRight.x * shiftX + camUp.x * shiftZ;
    nextZ += camRight.z * shiftX + camUp.z * shiftZ;
  }

  if (bounds) {
    const minX = bounds.min.x - 5;
    const maxX = bounds.max.x + 5;
    const minZ = bounds.min.z - 5;
    const maxZ = bounds.max.z + 5;
    nextX = Math.max(minX, Math.min(maxX, nextX));
    nextZ = Math.max(minZ, Math.min(maxZ, nextZ));
  }

  return {
    x: Number.isFinite(nextX) ? nextX : currentTarget.x,
    y: Number.isFinite(nextY) ? nextY : currentTarget.y,
    z: Number.isFinite(nextZ) ? nextZ : currentTarget.z,
  };
}

export const WORKSHOP_HISTORY_MAX_DEPTH = 40;

export interface WorkshopHistoryState {
  undoStack: Workshop[];
  redoStack: Workshop[];
}

export function createWorkshopHistory(): WorkshopHistoryState {
  return {
    undoStack: [],
    redoStack: [],
  };
}

export function pushWorkshopHistory(
  history: WorkshopHistoryState,
  layout: Workshop,
  maxDepth: number = WORKSHOP_HISTORY_MAX_DEPTH
): void {
  const cloned = JSON.parse(JSON.stringify(layout)) as Workshop;
  history.undoStack.push(cloned);
  if (history.undoStack.length > maxDepth) {
    history.undoStack.splice(0, history.undoStack.length - maxDepth);
  }
  history.redoStack.length = 0;
}

export function undoWorkshopHistory(
  history: WorkshopHistoryState,
  current: Workshop,
  maxDepth: number = WORKSHOP_HISTORY_MAX_DEPTH
): Workshop | null {
  const prev = history.undoStack.pop();
  if (!prev) return null;
  const currentCloned = JSON.parse(JSON.stringify(current)) as Workshop;
  history.redoStack.push(currentCloned);
  if (history.redoStack.length > maxDepth) {
    history.redoStack.splice(0, history.redoStack.length - maxDepth);
  }
  return prev;
}

export function redoWorkshopHistory(
  history: WorkshopHistoryState,
  current: Workshop,
  maxDepth: number = WORKSHOP_HISTORY_MAX_DEPTH
): Workshop | null {
  const next = history.redoStack.pop();
  if (!next) return null;
  const currentCloned = JSON.parse(JSON.stringify(current)) as Workshop;
  history.undoStack.push(currentCloned);
  if (history.undoStack.length > maxDepth) {
    history.undoStack.splice(0, history.undoStack.length - maxDepth);
  }
  return next;
}



