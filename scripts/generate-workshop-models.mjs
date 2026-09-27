/** Legacy Three.js prototype, retained for comparison. Current assets use Blender.
 * node scripts/generate-workshop-models.mjs
 * Uses Z-up exports to keep the supplied pack's loader convention. */
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdirSync,writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const output=fileURLToPath(new URL('../.codex-tmp/workshop-legacy-models/',import.meta.url));
mkdirSync(output,{recursive:true});
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();});}
};
const mat=(name,color,metalness=.15,roughness=.42,opacity=1)=>new T.MeshStandardMaterial({name,color,metalness,roughness,transparent:opacity<1,opacity,depthWrite:opacity===1});
const materials={
  light:mat('LightBody','#c9cdd1',.32),dark:mat('Graphite','#252c36',.4),black:mat('Mechanics','#10151c',.5),
  silver:mat('Rails','#b6bcc4',.8,.25),bed:mat('BuildPlate','#414449',.2,.8),blue:mat('Display','#2374c6',.1),
  glass:mat('TintedGlass','#3c5266',.1,.18,.24),brass:mat('Nozzle','#c99d41',.65),
  filament:mat('Spool_Filament','#ffffff',.05,.4),wood:mat('Wood','#c49663',.05,.7),card:mat('Cardboard','#b48651',0,.9),
  tape:mat('PackingTape','#d3ab79',0,.65),leaf:mat('Leaf','#5c9130',0,.9),leaf2:mat('LeafLight','#82ae40',0,.8),soil:mat('Soil','#342c22',0,1),green:mat('CuttingMat','#22655b',0,.7),
};
function builder(){
  const group=new T.Group();
  const add=(geometry,material,pos=[0,0,0],rotation=[0,0,0])=>{const mesh=new T.Mesh(geometry,material);mesh.position.set(...pos);mesh.rotation.set(...rotation);group.add(mesh);return mesh;};
  const box=(size,pos,material,r=.003)=>add(r?new RoundedBoxGeometry(...size,1,r):new T.BoxGeometry(...size),material,pos);
  const cylinder=(radius,length,pos,material,rotation=[0,0,0],segments=16)=>add(new T.CylinderGeometry(radius,radius,length,segments),material,pos,rotation);
  const tube=(points,radius,material)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),20,radius,6,false),material);
  return {group,add,box,cylinder,tube};
}
function head(b,x,y,z){
  b.box([.094,.102,.072],[x,y,z],materials.light,.008);
  b.box([.08,.06,.025],[x,y-.061,z],materials.black);
  b.cylinder(.029,.006,[x,y,z+.039],materials.black,[Math.PI/2,0,0],20);
  b.cylinder(.013,.009,[x,y,z+.044],materials.dark,[Math.PI/2,0,0],16);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const blade=b.box([.008,.02,.003],[x+Math.sin(a)*.02,y+Math.cos(a)*.02,z+.043],materials.silver,.001);blade.rotation.z=-a-.3;}
  b.add(new T.ConeGeometry(.009,.024,8),materials.brass,[x,y-.084,z],[Math.PI,0,0]);
  for(const dx of [-.035,.035])for(const dy of [-.038,.038])b.cylinder(.003,.003,[x+dx,y+dy,z+.039],materials.black,[Math.PI/2,0,0],8);
}
function a1(){const b=builder();
  b.box([.52,.06,.46],[0,.045,0],materials.light,.014);
  b.box([.48,.018,.43],[0,.01,0],materials.black,.007);
  for(const x of [-.19,.19])for(const z of [-.17,.17])b.cylinder(.025,.018,[x,.009,z],materials.black);
  for(const x of [-.105,.105])b.cylinder(.006,.34,[x,.084,.01],materials.silver,[Math.PI/2,0,0]);
  b.box([.34,.028,.34],[0,.112,.025],materials.black,.006);
  b.box([.35,.008,.35],[0,.132,.025],materials.bed,.003);
  for(const x of [-.215,.215]){
    b.box([.044,.56,.057],[x,.36,-.1],materials.light,.005);
    b.box([.05,.033,.062],[x,.653,-.1],materials.dark,.005);
    b.cylinder(.006,.51,[x+.008,.36,-.061],materials.silver);
    b.box([.012,.51,.007],[x-.009,.36,-.068],materials.black,0);
  }
  b.box([.45,.039,.055],[0,.651,-.1],materials.light,.004);
  b.box([.485,.045,.049],[0,.427,-.055],materials.dark,.004);
  for(const y of [.414,.44])b.cylinder(.004,.43,[0,y,-.022],materials.silver,[0,0,Math.PI/2]);
  head(b,.042,.4,.01);
  b.tube([[.04,.46,.01],[.03,.71,-.02],[.16,.78,-.09],[.24,.66,-.14],[.23,.33,-.13]],.006,materials.light);
  const display=b.box([.10,.077,.024],[.214,.117,.216],materials.light,.008);display.rotation.x=-.38;
  const screen=b.box([.08,.055,.004],[.214,.122,.231],materials.black,.002);screen.rotation.x=-.38;
  return b.group;
}
function p1(){const b=builder();
  b.box([.48,.055,.48],[0,.038,0],materials.dark,.01);
  for(const x of [-.219,.219])for(const z of [-.219,.219])b.box([.045,.59,.045],[x,.35,z],materials.dark,.006);
  for(const z of [-.219,.219])b.box([.48,.064,.049],[0,.637,z],materials.dark,.008);
  for(const x of [-.219,.219])b.box([.043,.055,.44],[x,.637,0],materials.dark,.006);
  b.box([.399,.505,.009],[0,.355,-.237],materials.black,.003);
  for(const x of [-.238,.238])b.box([.006,.49,.387],[x,.345,0],materials.glass,.002);
  b.box([.389,.49,.007],[0,.343,.24],materials.glass,.002);
  b.box([.017,.16,.018],[.181,.345,.251],materials.black,.003);
  for(const x of [-.155,.155])b.cylinder(.005,.46,[x,.32,-.135],materials.silver);
  b.box([.35,.025,.35],[0,.155,0],materials.black,.004);
  b.box([.354,.005,.354],[0,.172,0],materials.bed,.001);
  for(const z of [-.035,-.07])b.cylinder(.004,.38,[0,.492,z],materials.silver,[0,0,Math.PI/2]);
  head(b,.04,.466,-.006);
  b.tube([[.04,.52,-.015],[.05,.595,-.03],[.13,.6,-.12],[.17,.56,-.16]],.009,materials.black);
  b.box([.135,.056,.016],[.12,.634,.247],materials.black,.005);
  b.box([.082,.037,.004],[.107,.635,.257],materials.blue,.002);
  b.cylinder(.014,.006,[.168,.635,.262],materials.dark,[Math.PI/2,0,0]);
  for(const x of [-.016,.016])for(const y of [-.008,.008])b.box([.017,.011,.001],[.107+x,.635+y,.26],materials.light,.001);
  return b.group;
}
function spool(){const b=builder();
  for(const x of [-.041,.041]){
    const ring=new T.Shape();ring.absarc(0,0,.105,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,.027,0,Math.PI*2,true);ring.holes.push(hole);
    const geo=new T.ExtrudeGeometry(ring,{steps:1,depth:.009,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.001,bevelThickness:.001,curveSegments:16});
    b.add(geo,materials.dark,[x,.107,0],[0,Math.PI/2,0]);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const spoke=b.box([.002,.055,.014],[x+.011,.107+Math.cos(a)*.064,Math.sin(a)*.064],materials.black,.001);spoke.rotation.x=a;}
  }
  b.cylinder(.081,.075,[0,.107,0],materials.filament,[0,0,Math.PI/2],32);
  for(let i=0;i<10;i++)b.add(new T.TorusGeometry(.081,.0012,4,32),materials.filament,[-.032+i*.007,.107,0],[0,Math.PI/2,0]);
  return b.group;
}
function boxes(){const b=builder();
  for(const [x,y,z,w,h,d] of [[-.22,.19,0,.4,.38,.36],[.19,.15,.03,.36,.3,.4],[.16,.45,.02,.28,.29,.29]]){
    b.box([w,h,d],[x,y,z],materials.card,.006);b.box([.04,.002,d+.003],[x,y+h/2+.001,z],materials.tape,.001);b.box([.04,h*.35,.002],[x,y+h*.325,z+d/2+.002],materials.tape,.001);
    b.box([w*.2,h*.18,.002],[x+w*.2,y-h*.15,z+d/2+.003],materials.dark,.001);
  }return b.group;
}
function plant(){const b=builder();
  b.add(new T.CylinderGeometry(.18,.13,.37,4),materials.dark,[0,.185,0],[0,Math.PI/4,0]);
  b.box([.245,.015,.245],[0,.36,0],materials.soil,0);
  for(let i=0;i<7;i++){
    const a=i*2.4,reach=.15+(i%3)*.05,h=.5+(i%4)*.12,x=Math.cos(a)*reach,z=Math.sin(a)*reach;
    b.tube([[0,.34,0],[x*.3,.53,z*.3],[x,h+.3,z]],.008,materials.leaf);
    const leaf=b.add(new T.OctahedronGeometry(1,0),i%2?materials.leaf:materials.leaf2,[x*.7,.42+h*.6,z*.7]);leaf.scale.set(.085,h*.48,.025);leaf.rotation.z=-x;leaf.rotation.y=a;
  }return b.group;
}
function cabinet(){const b=builder();
  b.box([.85,.76,.48],[0,.48,0],materials.dark,.014);b.box([.9,.052,.54],[0,.89,0],materials.wood,.005);
  for(let i=0;i<5;i++){b.box([.77,.13,.025],[0,.22+i*.14,.252],materials.black,.003);b.box([.65,.015,.02],[0,.26+i*.14,.273],materials.silver,.003);}
  for(const x of [-.32,.32])for(const z of [-.17,.17])b.cylinder(.06,.035,[x,.07,z],materials.black,[0,0,Math.PI/2]);
  b.box([.8,.49,.035],[0,1.16,-.22],materials.dark,.004);
  for(let x=-.33;x<=.34;x+=.06)for(let y=.97;y<1.37;y+=.06)b.box([.009,.009,.001],[x,y,-.201],materials.black,0);
  for(const x of [-.22,-.08,.09,.25]){b.box([.022,.1,.027],[x,1.14,-.17],materials.blue,.004);b.cylinder(.004,.1,[x,1.24,-.17],materials.silver);}
  return b.group;
}
const metrics=[];
for(const [name,model] of [['printer-a1',a1()],['printer-p1',p1()],['filament-spool',spool()],['packing-boxes',boxes()],['plant',plant()],['tool-cabinet',cabinet()]]){
  model.updateMatrixWorld(true);const buckets=new Map();
  model.traverse(o=>{if(!o.isMesh)return;let geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);geo.rotateX(Math.PI/2);if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(geo);});
  const packed=new T.Group();packed.name=name;
  for(const [material,geometries] of buckets){const mesh=new T.Mesh(mergeGeometries(geometries),material);mesh.name=material.name;packed.add(mesh);geometries.forEach(g=>g.dispose());}
  const glb=await new GLTFExporter().parseAsync(packed,{binary:true});writeFileSync(output+name+'.glb',Buffer.from(glb));
  const box=new T.Box3().setFromObject(packed),size=box.getSize(new T.Vector3());let triangles=0;packed.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
  metrics.push({name,triangles,bytes:glb.byteLength,size_z_up:size.toArray(),materials:buckets.size});
}
writeFileSync(output+'metrics.json',JSON.stringify(metrics,null,2)+'\n');console.log(metrics);
