import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ReferenceSceneParts } from './referenceSceneParts';
import { instanceTemplate, disposeAssets, disposeInstances } from './instances';
import { defaultRoomLabels, slotWorld, roomOrigin, type Room, type Workshop, type Furniture, type Slot, type Placement } from './model';
import type { Filament, Printer } from '../../shared/types';

export interface Assets { a1: THREE.Group; p1: THREE.Group; spool: THREE.Group; boxes: THREE.Group; plant: THREE.Group; cabinet: THREE.Group; workbench: THREE.Group; filamentRack: THREE.Group; printerRack: THREE.Group; room: THREE.Group }
// Shared CPU/GPU templates are leased by mounted scenes, never disposed by an instance.
let pending: Promise<Assets> | null = null;
let users=0;
export function acquireAssets(): Promise<Assets> {
  users++;
  if (!pending) {
    const loading=Promise.allSettled(['printer-a1','printer-p1','filament-spool','packing-boxes','plant','tool-cabinet','workbench','filament-rack','printer-rack','room-module'].map(async name=>{
    const loader=new GLTFLoader();
    // Embedded PNGs are images, not network requests. TextureLoader uses the
    // allowed img-src blob: path; ImageBitmapLoader would fetch them via connect-src.
    loader.register(parser=>({
      name:'WorkshopEmbeddedImages',
      loadTexture(index:number){
        const source=parser.json.textures[index].source;
        return typeof source==='number'
          ? parser.loadTextureImage(index,source,new THREE.TextureLoader(parser.options.manager))
          : null;
      },
    }));
    const gltf=await loader.loadAsync(`/models/workshop/${name}.glb?v=reference-20260924-r3`);
    const root=new THREE.Group();
    gltf.scene.rotation.x=-Math.PI/2; root.add(gltf.scene); root.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(root);
    gltf.scene.position.y-=box.min.y;
    root.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;
      for(const m of Array.isArray(o.material)?o.material:[o.material]) {
        if(m.name.toLowerCase().includes('glass')) {m.transparent=true;m.depthWrite=false;o.castShadow=false;}
      }
    }});
    root.updateMatrixWorld(true); return root;
    })).then(results=>{
      const failed=results.find(r=>r.status==='rejected');
      if(failed) {
        disposeAssets(results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]));
        throw failed.reason;
      }
      const [a1,p1,spool,boxes,plant,cabinet,workbench,filamentRack,printerRack,room]=results.map(r=>(r as PromiseFulfilledResult<THREE.Group>).value);
      return {a1,p1,spool,boxes,plant,cabinet,workbench,filamentRack,printerRack,room};
    }).catch(error=>{if(pending===loading)pending=null;throw error;});
    pending=loading;
  }
  return pending;
}
export function releaseAssets() {
  users=Math.max(0,users-1);
  if(users===0 && pending) {
    const old=pending; pending=null;
    void old.then(a=>disposeAssets(Object.values(a))).catch(()=>{});
  }
}
export interface SceneBuild {
  root: THREE.Group;
  picks: THREE.Object3D[];
  positions: Map<string, THREE.Vector3>;
  placements: Map<string, { f: Furniture; s: Slot; p: Placement; pos: THREE.Vector3 }>;
  previewFurniture: (id: string, x: number, z: number) => void;
  previewPlacement: (placementId: string, pos: THREE.Vector3, rotationY: number) => void;
  resetPlacementPreview: (placementId: string) => void;
  setPlacementHover: (placementId: string, progress: number) => void;
  setPrinterHover: (placementId: string, progress: number) => void;
  setFurnitureBorderColor: (id: string, color: string) => void;
  dispose: () => void;
}
export function buildWorkshop(
  state: Workshop,
  room: Room,
  assets: Assets,
  filaments: Filament[],
  printers: Printer[] = [],
  activePrinterIds: Set<string> = new Set(),
  openSides: Set<string> = new Set(),
  includeStage = true,
  isSelected = false
): SceneBuild {
  const root=new THREE.Group(), owned=new THREE.Group(), instances=new THREE.Group();root.add(owned,instances);
  const picks: THREE.Object3D[]=[], positions=new Map<string,THREE.Vector3>();
  const placementsMeta=new Map<string, { f: Furniture; s: Slot; p: Placement; pos: THREE.Vector3 }>();
  const furnitureGroups=new Map<string,THREE.Group>();
  const furnitureBorders=new Map<string,THREE.MeshBasicMaterial>();
  const bindings=new Map<string,{mesh:THREE.InstancedMesh;index:number;matrix:THREE.Matrix4}[]>();
  const placementBindings=new Map<string,{mesh:THREE.InstancedMesh;index:number;baseMatrix:THREE.Matrix4;localMatrix:THREE.Matrix4}[]>();
  const placementHits=new Map<string,{hit:THREE.Mesh;position:THREE.Vector3;placementId:string}[]>();
  const cube=new THREE.BoxGeometry(1,1,1);
  const hitMaterial=new THREE.MeshBasicMaterial({visible:false});
  const referenceParts=new ReferenceSceneParts({...assets});
  const materials=new Map<string,THREE.MeshStandardMaterial>();
  const material=(color:string)=>{
    if(!materials.has(color)) materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.65,metalness:color==='#171b22'?.35:.05}));
    return materials.get(color)!;
  };
  function box(parent:THREE.Object3D,size:number[],pos:number[],color:string) {
    const mesh=new THREE.Mesh(cube,material(color));mesh.scale.set(size[0],size[1],size[2]);mesh.position.set(pos[0],pos[1],pos[2]);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const origin = roomOrigin(state, room.id);
  referenceParts.room(owned, room, openSides, origin, state, isSelected);
  // A shadow-receiving studio ground gives the cutaway a visible foundation.
  const stage=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#08111c',roughness:1,metalness:0}));
  stage.rotation.x=-Math.PI/2;stage.position.y=-.36;stage.receiveShadow=true;
  stage.userData.keepSeparate=true;if(includeStage)owned.add(stage);else {stage.geometry.dispose();stage.material.dispose();}
  const textures:THREE.Texture[]=[];
  for(const label of room.labels ?? defaultRoomLabels(room)) {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle=label.color;ctx.font='600 104px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label.text,512,96,990);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
    const width=Math.min(label.size*5.33,label.surface==='east'||label.surface==='west'?room.depth-.3:room.width-.3);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,label.size),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    const x=(label.u-.5)*room.width,z=(label.u-.5)*room.depth,y=label.v*2.6;
    if(label.surface==='floor'){mesh.position.set(x,.045,(label.v-.5)*room.depth);mesh.rotation.set(-Math.PI/2,0,(label.rotation??0)*Math.PI/180);}
    if(label.surface==='north'){mesh.position.set(x,y,-room.depth/2+.09);}
    if(label.surface==='south'){mesh.position.set(x,y,room.depth/2-.09);mesh.rotation.y=Math.PI;}
    if(label.surface==='west'){mesh.position.set(-room.width/2+.09,y,z);mesh.rotation.y=Math.PI/2;}
    if(label.surface==='east'){mesh.position.set(room.width/2-.09,y,z);mesh.rotation.y=-Math.PI/2;}
    if(label.surface!=='floor')mesh.rotateZ((label.rotation??0)*Math.PI/180);
    mesh.userData={roomId:room.id,labelId:label.id,keepSeparate:true};owned.add(mesh);
  }
  for(const f of state.furniture.filter(f=>f.roomId===room.id)) {
    const group=new THREE.Group();group.position.set(f.x,0,f.z);group.rotation.y=f.rotation*Math.PI/180;owned.add(group);
    group.userData.furnitureId=f.id;
    const borderMat=new THREE.MeshBasicMaterial({color:'#b5b8ba',transparent:true,opacity:.38,depthWrite:false});
    furnitureBorders.set(f.id,borderMat);
    for(const sign of [-1,1]){
      const horizontal=new THREE.Mesh(new THREE.BoxGeometry(f.width+.38,.004,.02),borderMat);
      horizontal.position.set(0,.035,sign*(f.depth/2+.18));
      horizontal.userData.isBorder=true;
      group.add(horizontal);

      const vertical=new THREE.Mesh(new THREE.BoxGeometry(.02,.004,f.depth+.38),borderMat);
      vertical.position.set(sign*(f.width/2+.18),.035,0);
      vertical.userData.isBorder=true;
      group.add(vertical);
    }
    furnitureGroups.set(f.id,group);
    if (['plant', 'boxes', 'cabinet'].includes(f.kind)) {
      referenceParts.copy(group,f.kind,'',new THREE.Vector3(0,.03,0));
      const hit = new THREE.Mesh(cube, hitMaterial);
      hit.scale.set(f.width, f.height, f.depth);
      hit.position.set(0, f.height / 2, 0);
      hit.userData = { keepSeparate: true, isHit: true, furnitureId: f.id, kind: f.kind };
      group.add(hit);
      picks.push(hit);
      positions.set(f.id, new THREE.Vector3(f.x, f.height, f.z));
      continue;
    }
    const occupied=state.placements.some(p=>state.slots.some(s=>s.id===p.slotId&&s.furnitureId===f.id));
    referenceParts.furniture(group,f,occupied);
    const hit = new THREE.Mesh(cube, hitMaterial);
    hit.scale.set(f.width, f.height, f.depth);
    hit.position.set(0, f.height / 2, 0);
    hit.userData = { keepSeparate: true, isHit: true, furnitureId: f.id, kind: f.kind };
    group.add(hit);
    picks.push(hit);
    positions.set(f.id,new THREE.Vector3(f.x,f.height,f.z));
  }
  const models:{a1:THREE.Matrix4[];p1:THREE.Matrix4[]}={a1:[],p1:[]};
  const modelOwners:{a1:string[];p1:string[]}={a1:[],p1:[]};
  const modelPlacements:{a1:string[];p1:string[]}={a1:[],p1:[]};
  const spoolTransforms:THREE.Matrix4[]=[], spoolOwners:string[]=[], spoolColors:string[]=[], spoolPlacements:string[]=[];
  const furnitureById=new Map(state.furniture.map(f=>[f.id,f]));
  const slotsById=new Map(state.slots.map(s=>[s.id,s]));
  const filamentById=new Map(filaments.map(f=>[f.id,f]));
  const printerById=new Map(printers.map(p=>[p.id,p]));
  for(const p of state.placements) {
    const s=slotsById.get(p.slotId),f=s&&furnitureById.get(s.furnitureId);if(!s||!f||f.roomId!==room.id) continue;
    const pos=new THREE.Vector3(...slotWorld(f,s));
    const angle=f.rotation*Math.PI/180;
    const transform=new THREE.Matrix4().compose(pos,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),new THREE.Vector3(1,1,1));
    placementsMeta.set(p.id, { f, s, p, pos: pos.clone() });
    const fGroup = furnitureGroups.get(f.id);
    if(p.kind==='printer') {
      models[p.model].push(transform);
      modelOwners[p.model].push(f.id);
      modelPlacements[p.model].push(p.id);

      const printer = printerById.get(p.entityId);
      const hexColor = printer?.color && /^#[\da-f]{6}$/i.test(printer.color)
        ? printer.color
        : '#0CB4E0';

      // Калибровочный кубик рядом с каждым принтером, привязан к группе мебели для синхронного движения
      const cubeSize = 0.06;
      const colorCube = new THREE.Mesh(
        new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
        new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.25,
          metalness: 0.15,
        })
      );
      colorCube.position.set(s.x + 0.35, s.y + cubeSize / 2, s.z + 0.21);
      colorCube.rotation.y = 0.25;
      colorCube.castShadow = true;
      colorCube.receiveShadow = true;
      colorCube.userData = { keepSeparate: true };
      if (fGroup) {
        fGroup.add(colorCube);
      } else {
        owned.add(colorCube);
      }

      // Фоновое свечение в камере для принтеров с активным заказом на печать (также привязано к столу)
      const isActive = activePrinterIds.has(p.entityId) || activePrinterIds.has(p.id);
      if (isActive) {
        const chamberLight = new THREE.PointLight('#ffffff', 1.4, 1.2, 2);
        chamberLight.position.set(s.x, s.y + 0.38, s.z);
        if (fGroup) {
          fGroup.add(chamberLight);
        } else {
          owned.add(chamberLight);
        }
      }
    }
    else {
      const hex=filamentById.get(p.entityId)?.color;
      const color=hex&&/^#[\da-f]{6}$/i.test(hex)?hex:'#b7bcc5';
      // Present the recessed flange and windings together, while respecting slot width.
      const facing=f.width/f.columns>=.21?Math.PI/4:Math.PI/10;
      transform.multiply(new THREE.Matrix4().makeRotationY(facing));
      spoolTransforms.push(transform);spoolOwners.push(f.id);spoolColors.push(color);spoolPlacements.push(p.id);
    }
    const hit=new THREE.Mesh(cube,hitMaterial);hit.position.copy(pos).y+=p.kind==='printer'?.43:.12;hit.scale.set(p.kind==='printer'?.6:.18,p.kind==='printer'?.86:.26,p.kind==='printer'?.6:.32);hit.userData={keepSeparate:true,isHit:true,placementId:p.id,kind:p.kind,furnitureId:f.id};owned.add(hit);picks.unshift(hit);positions.set(p.id,pos.clone().add(new THREE.Vector3(0,.02,0)));
    hit.rotation.y=angle;
    if(!placementHits.has(f.id))placementHits.set(f.id,[]);
    placementHits.get(f.id)!.push({hit,position:hit.position.clone(),placementId:p.id});
  }
  function addInstances(template:THREE.Group,transforms:THREE.Matrix4[],owners:string[],colors?:string[],placementIds?:string[]) {
    const group=instanceTemplate(template,transforms);
    group.traverse(o=>{
      if(!(o instanceof THREE.InstancedMesh))return;
      o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const filament=colors&&/filament/i.test(o.name+' '+(Array.isArray(o.material)?o.material.map(m=>m.name).join(' '):o.material.name));
      for(let index=0;index<o.count;index++) {
        const source=index+(o.userData.instanceOffset as number);
        const id=owners[source];
        if(!bindings.has(id))bindings.set(id,[]);
        const matrix=new THREE.Matrix4();o.getMatrixAt(index,matrix);
        bindings.get(id)!.push({mesh:o,index,matrix});
        if(filament)o.setColorAt(index,new THREE.Color(colors![source]));
        if(placementIds && placementIds[source]) {
          const pId = placementIds[source];
          if(!placementBindings.has(pId)) placementBindings.set(pId, []);
          const meta=placementsMeta.get(pId)!;
          const slotTransform=new THREE.Matrix4().compose(meta.pos,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),meta.f.rotation*Math.PI/180),new THREE.Vector3(1,1,1));
          placementBindings.get(pId)!.push({mesh:o,index,baseMatrix:matrix.clone(),localMatrix:slotTransform.invert().multiply(matrix)});
        }
      }
      if(o.instanceColor)o.instanceColor.needsUpdate=true;
    });
    instances.add(group);
  }
  addInstances(assets.a1,models.a1,modelOwners.a1,undefined,modelPlacements.a1);
  addInstances(assets.p1,models.p1,modelOwners.p1,undefined,modelPlacements.p1);
  const spoolMaterials:THREE.Material[]=[];
  if(spoolTransforms.length) {
    const template=assets.spool.clone(true);
    template.traverse(o=>{if(o instanceof THREE.Mesh){
      const tint=(m:THREE.Material)=>{
        if(!/filament/i.test(o.name+' '+m.name))return m;
        const clone=m.clone();if(clone instanceof THREE.MeshStandardMaterial)clone.color.set('#ffffff');
        spoolMaterials.push(clone);return clone;
      };
      o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);
    }});
    addInstances(template,spoolTransforms,spoolOwners,spoolColors,spoolPlacements);
  }
  // Static room meshes share a handful of draws; furniture remains independently movable.
  function batch(parent:THREE.Group){
    const buckets=new Map<THREE.Material,THREE.Mesh[]>();
    for(const child of [...parent.children]){
      if(child instanceof THREE.Group){batch(child);continue;}
      if(
        !(child instanceof THREE.Mesh) ||
        !child.visible ||
        Array.isArray(child.material) ||
        child.material === hitMaterial ||
        child.userData.isBorder ||
        child.userData.isHit ||
        child.userData.keepSeparate ||
        child.userData.placementId ||
        child.userData.furnitureId
      ) continue;
      if(!buckets.has(child.material))buckets.set(child.material,[]);buckets.get(child.material)!.push(child);
    }
    for(const [mat,meshes] of buckets){
      if(meshes.length<2)continue;
      const geometries=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});
      const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
      const replacement=new THREE.Mesh(merged,mat);replacement.castShadow=meshes.some(mesh=>mesh.castShadow);replacement.receiveShadow=meshes.some(mesh=>mesh.receiveShadow);parent.add(replacement);
      meshes.forEach(mesh=>mesh.removeFromParent());
    }
  }
  batch(owned);
  const translated=new THREE.Matrix4();
  function previewFurniture(id:string,x:number,z:number) {
    const f=furnitureById.get(id),group=furnitureGroups.get(id);if(!f||!group)return;
    const dx=x-f.x,dz=z-f.z;group.position.set(x,0,z);
    positions.get(id)?.set(x,f.height,z);
    const changed=new Set<THREE.InstancedMesh>();
    for(const binding of bindings.get(id)??[]) {
      translated.copy(binding.matrix);translated.elements[12]+=dx;translated.elements[14]+=dz;
      binding.mesh.setMatrixAt(binding.index,translated);changed.add(binding.mesh);
    }
    for(const mesh of changed){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();}
    for(const item of placementHits.get(id)??[]){
      item.hit.position.copy(item.position);item.hit.position.x+=dx;item.hit.position.z+=dz;
      const pos=positions.get(item.placementId);if(pos){pos.x=item.position.x+dx;pos.z=item.position.z+dz;}
      const meta=placementsMeta.get(item.placementId);if(meta){meta.pos.x=item.position.x+dx;meta.pos.z=item.position.z+dz;}
      const pBinds = placementBindings.get(item.placementId);
      if(pBinds) {
        for(const b of pBinds) {
          b.baseMatrix.elements[12]+=dx;
          b.baseMatrix.elements[14]+=dz;
        }
      }
    }
    root.updateMatrixWorld(true);
  }
  const tempPos=new THREE.Vector3(), tempRot=new THREE.Quaternion(), tempScl=new THREE.Vector3(), elevated=new THREE.Matrix4();
  function setPlacementHover(placementId:string, progress:number) {
    const items=placementBindings.get(placementId);if(!items)return;
    const clamped=Math.max(0,Math.min(1,progress));
    const meta=placementsMeta.get(placementId);
    const isFilament=meta?.p.kind==='filament';
    const changed=new Set<THREE.InstancedMesh>();
    for(const item of items) {
      if(clamped<=0.0001){
        item.mesh.setMatrixAt(item.index,item.baseMatrix);
      } else {
        item.baseMatrix.decompose(tempPos,tempRot,tempScl);
        if(isFilament) {
          const angle = (meta ? meta.f.rotation : 0) * Math.PI / 180;
          const fx = Math.sin(angle);
          const fz = Math.cos(angle);
          const cx = meta?.pos.x ?? tempPos.x;
          const cy = (meta?.pos.y ?? tempPos.y) + 0.11;
          const cz = meta?.pos.z ?? tempPos.z;
          const scale = 1 + 0.05 * clamped;
          tempPos.x = cx + (tempPos.x - cx) * scale + fx * 0.07 * clamped;
          tempPos.y = cy + (tempPos.y - cy) * scale + 0.035 * clamped;
          tempPos.z = cz + (tempPos.z - cz) * scale + fz * 0.07 * clamped;
          tempScl.multiplyScalar(scale);
        } else {
          tempPos.y += clamped * 0.12;
          tempScl.multiplyScalar(1 + 0.04 * clamped);
        }
        elevated.compose(tempPos,tempRot,tempScl);
        item.mesh.setMatrixAt(item.index,elevated);
      }
      changed.add(item.mesh);
    }
    for(const m of changed){m.instanceMatrix.needsUpdate=true;}
  }
  function previewPlacement(placementId: string, pos: THREE.Vector3, rotationY: number) {
    const items = placementBindings.get(placementId);
    if (!items) return;
    const transform = new THREE.Matrix4().compose(
      pos,
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY),
      new THREE.Vector3(1, 1, 1)
    );
    for (const item of items) {
      item.mesh.setMatrixAt(item.index, transform.clone().multiply(item.localMatrix));
      item.mesh.instanceMatrix.needsUpdate = true;
    }
    const pPos = positions.get(placementId);
    if (pPos) pPos.copy(pos);
  }
  function resetPlacementPreview(placementId: string) {
    const items = placementBindings.get(placementId);
    if (!items) return;
    for (const item of items) {
      item.mesh.setMatrixAt(item.index, item.baseMatrix);
      item.mesh.instanceMatrix.needsUpdate = true;
    }
    const meta = placementsMeta.get(placementId);
    const pPos = positions.get(placementId);
    if (meta && pPos) pPos.copy(meta.pos);
  }
  function setFurnitureBorderColor(id:string, color:string) {
    furnitureBorders.get(id)?.color.set(color);
  }
  root.updateMatrixWorld(true);
  return {root,picks,positions,placements:placementsMeta,previewFurniture,previewPlacement,resetPlacementPreview,setPlacementHover,setPrinterHover:setPlacementHover,setFurnitureBorderColor,dispose:()=>{furnitureBorders.forEach(m=>m.dispose());disposeInstances(instances);disposeAssets([owned]);cube.dispose();referenceParts.dispose();if(!placementHits.size)hitMaterial.dispose();spoolMaterials.forEach(m=>m.dispose());root.removeFromParent();}};
}

