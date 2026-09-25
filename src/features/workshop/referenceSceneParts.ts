import * as THREE from 'three';
import { roomPerimeterEdges, isTileOccupiedByRooms, type Furniture, type Room, type Workshop, type RoomSide } from './model';

/** Build parameterized furniture from the actual named Blender parts and PBR materials. */
export class ReferenceSceneParts {
  private geometries=new Map<string,THREE.BufferGeometry>();
  private materials=new Map<string,THREE.Material>();
  private textures=new Map<string,THREE.Texture>();
  constructor(private sources:Record<string,THREE.Group>){Object.values(sources).forEach(s=>s.updateMatrixWorld(true));}
  private material(source:THREE.Material):THREE.Material {
    if(this.materials.has(source.uuid))return this.materials.get(source.uuid)!;
    const result=source.clone();
    if(result instanceof THREE.MeshStandardMaterial && /Beech/i.test(result.name)){
      result.color.set('#c9bbac');result.roughness=.62;
    }
    for(const key of Object.keys(source)){
      const value=(source as unknown as Record<string,unknown>)[key];
      if(value instanceof THREE.Texture){
        if(!this.textures.has(value.uuid)){const texture=value.clone();texture.needsUpdate=true;this.textures.set(value.uuid,texture);}
        (result as unknown as Record<string,unknown>)[key]=this.textures.get(value.uuid);
      }
    }
    this.materials.set(source.uuid,result);return result;
  }
  private find(asset:string,name:string):THREE.Mesh {
    const item=this.sources[asset].getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
    if(!(item instanceof THREE.Mesh))throw new Error(`Missing Blender part: ${asset}/${name}`);
    return item;
  }
  part(parent:THREE.Group,asset:string,name:string,size:number[],position:number[]):THREE.Mesh {
    const source=this.find(asset,name),key=asset+'/'+name;
    if(!this.geometries.has(key)){
      const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);geometry.computeBoundingBox();
      const box=geometry.boundingBox!,extent=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
      geometry.translate(-center.x,-center.y,-center.z);geometry.scale(1/extent.x,1/extent.y,1/extent.z);this.geometries.set(key,geometry);
    }
    const material=Array.isArray(source.material)?source.material.map(m=>this.material(m)):this.material(source.material);
    const mesh=new THREE.Mesh(this.geometries.get(key),material);mesh.name=name;
    mesh.position.fromArray(position);mesh.scale.fromArray(size);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  copy(parent:THREE.Group,asset:string,prefix:string,offset:THREE.Vector3){
    this.sources[asset].traverse(source=>{
      if(!(source instanceof THREE.Mesh)||!source.name.startsWith(prefix))return;
      const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld).translate(offset.x,offset.y,offset.z);
      const material=Array.isArray(source.material)?source.material.map(m=>this.material(m)):this.material(source.material);
      const mesh=new THREE.Mesh(geometry,material);mesh.name=source.name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    });
  }
  furniture(parent:THREE.Group,f:Furniture,occupied:boolean){
    const table=f.kind==='table',printer=f.kind==='printer_rack',asset=table?'workbench':printer?'printerRack':'filamentRack';
    const label=table?'Workbench':'Printer';
    const shelfName=table?'Shelf_Workbench_Top_Wood':printer?'Shelf_Printer_0_Wood':'Shelf_Filament_0_Wood';
    const uprightName=table?'Leg_Workbench_00':printer?'Leg_Printer_00_Upright':'Leg_Filament_00_Upright';
    const sideName=table?'Frame_Workbench_UpperSideRail0':printer?'Frame_Printer_0_SideApron0':'Frame_Filament_0_SideApron0';
    const apronName=table?'Frame_Workbench_LongApron0':printer?'Frame_Printer_0_LongApron0':'Frame_Filament_0_LongApron0';
    const capLabel=table?label:printer?'Printer':'Filament';
    const heights=table?[f.height]:Array.from({length:f.levels},(_,i)=>.18+i*(f.height-.35)/f.levels);
    const postHeight=table?f.height-.05:printer?heights.at(-1)!+.10:f.height;
    const px=f.width/2-.045,pz=f.depth/2-.045;
    for(const x of [-px,px])for(const z of [-pz,pz]){
      this.part(parent,asset,uprightName,[.06,postHeight-.03,.06],[x,(postHeight+.03)/2,z]);
      this.part(parent,asset,`Foot_${capLabel}_00_RubberSole`,[.074,.024,.074],[x,.012,z]);
      this.part(parent,asset,`Foot_${capLabel}_00_Cap`,[.07,.017,.07],[x,.032,z]);
    }
    const shelves=(!table&&!printer)?[...heights,f.height-.085]:heights;
    for(const y of shelves){
      this.part(parent,asset,shelfName,[f.width-(table?0:.09),table?.048:.036,f.depth-(table?0:.008)],[0,y-(table?.024:.018),0]);
      for(const z of [-pz,pz])this.part(parent,asset,apronName,[f.width-.06,.065,.041],[0,y-.071,z]);
      for(const x of [-px,px]){
        this.part(parent,asset,sideName,[.043,.065,f.depth-.06],[x,y-.07,0]);
        for(const z of [-pz,pz]){
          this.part(parent,'workbench','Bolt_Workbench_00_Front_Washer',[.019,.019,.002],[x,y-.065,z+.033]);
          this.part(parent,'workbench','Bolt_Workbench_00_Front_Head',[.014,.014,.003],[x,y-.065,z+.035]);
          this.part(parent,'workbench','Bolt_Workbench_00_Front_Socket',[.005,.005,.0008],[x,y-.065,z+.037]);
        }
      }
      if(!this.materials.has('warm-strip'))this.materials.set('warm-strip',new THREE.MeshStandardMaterial({color:'#ffe0b3',emissive:'#ffc77a',emissiveIntensity:3.2,roughness:.45}));
      const strip=this.part(parent,asset,apronName,[Math.max(.1,f.width-.24),.013,.014],[0,y-.089,pz+.022]);
      strip.material=this.materials.get('warm-strip')!;strip.castShadow=false;
    }
    if(table){
      for(const x of [-px,px])this.part(parent,'workbench','Frame_Workbench_LowerSideRail0',[.044,.058,f.depth-.08],[x,.217,0]);
      if(!occupied&&f.width>=1.5&&f.depth>=.72)this.copy(parent,'workbench','Decor_',new THREE.Vector3(0,f.height-.85,0));
    }
  }
  room(parent:THREE.Group,room:Room, openSides: Set<string> = new Set(), origin: { x: number; z: number } = { x: 0, z: 0 }, state?: Workshop, isSelected = false){
    const surface = (key: string, color: string, roughness: number, emissive?: string, emissiveIntensity?: number) => {
      const fullKey = emissive ? `${key}-${color}-${emissive}-${emissiveIntensity}` : `${key}-${color}`;
      if (!this.materials.has(fullKey)) {
        this.materials.set(
          fullKey,
          new THREE.MeshStandardMaterial({
            color,
            roughness,
            metalness: emissive ? 0.08 : 0.04,
            emissive: emissive ? new THREE.Color(emissive) : new THREE.Color(0x000000),
            emissiveIntensity: emissiveIntensity ?? 0,
          })
        );
      }
      return this.materials.get(fullKey)!;
    };
    const concreteNormal = ['#7e828b', '#82858e', '#7b808a', '#888a93', '#80838c', '#7d828c'];
    const concreteSelected = ['#425d80', '#466487', '#3f5979', '#4c6c92', '#446083', '#415b7c'];
    const concrete = isSelected ? concreteSelected : concreteNormal;
    const tileEmissive = isSelected ? '#123860' : undefined;
    const tileEmissiveIntensity = isSelected ? 0.45 : 0;
    const wall=surface('room-wall','#636979',.86);
    const trim=surface('room-trim','#636b7a',.62);

    if (room.tiles && room.tiles.length > 0) {
      const tileTop = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      this.geometries.set('floor-top', tileTop);

      for (const [gx, gz] of room.tiles) {
        const lx = (gx + 0.5) - origin.x;
        const lz = (gz + 0.5) - origin.z;
        this.part(parent, 'room', 'FloorTile_Subfloor', [1.02, .34, 1.02], [lx, -.17, lz]).material = surface(
          isSelected ? 'room-plinth-sel' : 'room-plinth',
          isSelected ? '#243346' : '#353e50',
          .76
        );
        this.part(parent, 'room', 'FloorTile_Subfloor', [1.0, .015, 1.0], [lx, .005, lz]).material = surface(
          isSelected ? 'room-grout-sel' : 'room-grout',
          isSelected ? '#3b5577' : '#727780',
          .95,
          isSelected ? '#0e243d' : undefined,
          isSelected ? 0.3 : 0
        );

        const tile = this.part(parent, 'room', 'FloorTile_0_0', [1, 1, 1], [lx, .026, lz]);
        tile.geometry = tileTop;
        tile.castShadow = false;
        const tone = Math.abs(((gx * 73 + gz * 37) ^ (gx * gz * 11))) % concrete.length;
        tile.material = surface(
          (isSelected ? 'tile-sel-' : 'tile-') + tone,
          concrete[tone],
          isSelected ? 0.6 : 0.78,
          tileEmissive,
          tileEmissiveIntensity
        );
      }

      const isInteriorBoundary = (x: number, z: number, side: RoomSide): boolean => {
        if (!state) return false;
        let nx = x, nz = z;
        switch (side) {
          case 'north': nz = z - 1; break;
          case 'south': nz = z + 1; break;
          case 'east': nx = x + 1; break;
          case 'west': nx = x - 1; break;
        }
        return isTileOccupiedByRooms(state, nx, nz, room.id);
      };

      const edges = roomPerimeterEdges(room.tiles).filter(e => !isInteriorBoundary(e.x, e.z, e.side));
      const northEdges = edges.filter(e => e.side === 'north');
      const westEdges = edges.filter(e => e.side === 'west');
      const southEdges = edges.filter(e => e.side === 'south');
      const eastEdges = edges.filter(e => e.side === 'east');

      // Helper to group collinear adjacent edges into contiguous spans
      const groupHorizontal = (edgeList: typeof edges) => {
        const byZ = new Map<number, number[]>();
        for (const e of edgeList) {
          if (!byZ.has(e.z)) byZ.set(e.z, []);
          byZ.get(e.z)!.push(e.x);
        }
        const segments: Array<{ z: number; minX: number; maxX: number }> = [];
        for (const [z, xs] of byZ) {
          xs.sort((a, b) => a - b);
          let start = xs[0];
          let prev = xs[0];
          for (let i = 1; i < xs.length; i++) {
            if (xs[i] === prev + 1) {
              prev = xs[i];
            } else {
              segments.push({ z, minX: start, maxX: prev });
              start = xs[i];
              prev = xs[i];
            }
          }
          segments.push({ z, minX: start, maxX: prev });
        }
        return segments;
      };

      const groupVertical = (edgeList: typeof edges) => {
        const byX = new Map<number, number[]>();
        for (const e of edgeList) {
          if (!byX.has(e.x)) byX.set(e.x, []);
          byX.get(e.x)!.push(e.z);
        }
        const segments: Array<{ x: number; minZ: number; maxZ: number }> = [];
        for (const [x, zs] of byX) {
          zs.sort((a, b) => a - b);
          let start = zs[0];
          let prev = zs[0];
          for (let i = 1; i < zs.length; i++) {
            if (zs[i] === prev + 1) {
              prev = zs[i];
            } else {
              segments.push({ x, minZ: start, maxZ: prev });
              start = zs[i];
              prev = zs[i];
            }
          }
          segments.push({ x, minZ: start, maxZ: prev });
        }
        return segments;
      };

      if (!openSides.has('north')) {
        for (const seg of groupHorizontal(northEdges)) {
          const span = seg.maxX - seg.minX + 1;
          const segStartX = seg.minX - origin.x;
          const wallLz = seg.z - origin.z;
          const bays = Math.max(1, Math.round(span / 2.8));
          const bw = span / bays;
          for (let i = 0; i < bays; i++) {
            const bayCenterX = segStartX + (i + 0.5) * bw;
            this.part(parent, 'room', 'Panel_Back_Core', [bw - .06, 2.57, .07], [bayCenterX, 1.31, wallLz]);
            this.part(parent, 'room', 'Panel_Back_Face', [bw - .13, 2.26, .025], [bayCenterX, 1.36, wallLz + .052]).material = wall;
            this.part(parent, 'room', 'Skirting_Back', [bw - .12, .18, .055], [bayCenterX, .14, wallLz + .067]);
            this.part(parent, 'room', 'Panel_Back_TopRail', [bw, .065, .11], [bayCenterX, 2.61, wallLz]);
            for (const s of [-1, 1]) for (const y of [.3, 2.43]) {
              this.part(parent, 'room', 'Panel_Back_Fastener-1_0.281_Head', [.025, .025, .005], [bayCenterX + s * (bw / 2 - .15), y, wallLz + .068]);
            }
            if (bw >= 1.5) {
              this.copy(parent, 'room', 'Lamp', new THREE.Vector3(bayCenterX - .11, 2.27 - 1.393, wallLz + .88));
            }
          }
          for (let i = 0; i <= bays; i++) {
            this.part(parent, 'room', 'Pylon_Corner', [.21, 2.69, .24], [segStartX + i * bw, 1.345, wallLz + .03]).material = trim;
          }
        }
      }

      if (!openSides.has('west')) {
        for (const seg of groupVertical(westEdges)) {
          const span = seg.maxZ - seg.minZ + 1;
          const segStartZ = seg.minZ - origin.z;
          const wallLx = seg.x - origin.x;
          const bays = Math.max(1, Math.round(span / 2.8));
          const lw = span / bays;
          for (let i = 0; i < bays; i++) {
            const bayCenterZ = segStartZ + (i + 0.5) * lw;
            this.part(parent, 'room', 'Panel_Left_Core', [.07, 2.57, lw - .06], [wallLx, 1.31, bayCenterZ]);
            this.part(parent, 'room', 'Panel_Left_Face', [.025, 2.26, lw - .13], [wallLx + .052, 1.36, bayCenterZ]).material = wall;
            this.part(parent, 'room', 'Skirting_Left', [.055, .18, lw - .12], [wallLx + .067, .14, bayCenterZ]);
            this.part(parent, 'room', 'Panel_Left_TopRail', [.11, .065, lw], [wallLx, 2.61, bayCenterZ]);
          }
          for (let i = 0; i <= bays; i++) {
            this.part(parent, 'room', 'Pylon_Corner', [.24, 2.69, .21], [wallLx + .03, 1.345, segStartZ + i * lw]).material = trim;
          }
        }
      }

      for (const seg of groupHorizontal(southEdges)) {
        const span = seg.maxX - seg.minX + 1;
        const segStartX = seg.minX - origin.x;
        const segEndX = seg.maxX + 1 - origin.x;
        const wallLz = (seg.z + 1) - origin.z;
        const segCenterX = (segStartX + segEndX) / 2;
        this.part(parent, 'room', 'Skirting_Back', [span - .12, .18, .055], [segCenterX, .14, wallLz - .067]);
      }

      for (const seg of groupVertical(eastEdges)) {
        const span = seg.maxZ - seg.minZ + 1;
        const segStartZ = seg.minZ - origin.z;
        const segEndZ = seg.maxZ + 1 - origin.z;
        const wallLx = (seg.x + 1) - origin.x;
        const segCenterZ = (segStartZ + segEndZ) / 2;
        this.part(parent, 'room', 'Skirting_Left', [.055, .18, span - .12], [wallLx - .067, .14, segCenterZ]);
      }
      return;
    }
    const nx=Math.ceil(room.width),nz=Math.ceil(room.depth),dx=room.width/nx,dz=room.depth/nz;
    this.part(parent,'room','FloorTile_Subfloor',[room.width+.10,.34,room.depth+.10],[0,-.17,0]).material=surface(
      isSelected ? 'room-plinth-sel' : 'room-plinth',
      isSelected ? '#243346' : '#353e50',
      .76
    );
    this.part(parent,'room','FloorTile_Subfloor',[room.width,.015,room.depth],[0,.005,0]).material=surface(
      isSelected ? 'room-grout-sel' : 'room-grout',
      isSelected ? '#3b5577' : '#727780',
      .95,
      isSelected ? '#0e243d' : undefined,
      isSelected ? 0.3 : 0
    );
    // Continuous top faces avoid subpixel bevels / self-shadow aliasing in the
    // distant overview. The perimeter still uses the beveled Blender plinth.
    const tileTop=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
    this.geometries.set('floor-top',tileTop);
    for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){
      const tile=this.part(parent,'room','FloorTile_0_0',[dx,1,dz],[-room.width/2+(x+.5)*dx,.026,-room.depth/2+(z+.5)*dz]);
      tile.geometry=tileTop;tile.castShadow=false;
      const tone=((x*73+z*37)^(x*z*11))%concrete.length;
      tile.material=surface(
        (isSelected ? 'tile-sel-' : 'tile-') + tone,
        concrete[tone],
        isSelected ? 0.6 : 0.78,
        tileEmissive,
        tileEmissiveIntensity
      );
    }
    const backCount=Math.ceil(room.width/2.8),leftCount=Math.ceil(room.depth/2.8),bw=room.width/backCount,lw=room.depth/leftCount;
    for(let i=0;!openSides.has('north')&&i<backCount;i++){
      const x=-room.width/2+(i+.5)*bw,z=-room.depth/2;
      this.part(parent,'room','Panel_Back_Core',[bw-.06,2.57,.07],[x,1.31,z]);
      this.part(parent,'room','Panel_Back_Face',[bw-.13,2.26,.025],[x,1.36,z+.052]).material=wall;
      this.part(parent,'room','Skirting_Back',[bw-.12,.18,.055],[x,.14,z+.067]);
      this.part(parent,'room','Panel_Back_TopRail',[bw,.065,.11],[x,2.61,z]);
      for(const side of [-1,1])for(const y of [.3,2.43])this.part(parent,'room','Panel_Back_Fastener-1_0.281_Head',[.025,.025,.005],[x+side*(bw/2-.15),y,z+.068]);
      this.copy(parent,'room','Lamp',new THREE.Vector3(x-.11,2.27-1.393,z+.88));
    }
    for(let i=0;!openSides.has('west')&&i<leftCount;i++){
      const z=-room.depth/2+(i+.5)*lw,x=-room.width/2;
      this.part(parent,'room','Panel_Left_Core',[.07,2.57,lw-.06],[x,1.31,z]);
      this.part(parent,'room','Panel_Left_Face',[.025,2.26,lw-.13],[x+.052,1.36,z]).material=wall;
      this.part(parent,'room','Skirting_Left',[.055,.18,lw-.12],[x+.067,.14,z]);
      this.part(parent,'room','Panel_Left_TopRail',[.11,.065,lw],[x,2.61,z]);
    }
    for(let i=0;!openSides.has('north')&&i<=backCount;i++)this.part(parent,'room','Pylon_Corner',[.21,2.69,.24],[-room.width/2+i*bw,1.345,-room.depth/2+.03]).material=trim;
    for(let i=1;!openSides.has('west')&&i<=leftCount;i++)this.part(parent,'room','Pylon_Corner',[.24,2.69,.21],[-room.width/2+.03,1.345,-room.depth/2+i*lw]).material=trim;
  }
  dispose(){this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());}
}
