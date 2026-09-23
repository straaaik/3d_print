import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { instanceTemplate, disposeAssets } from './instances';
import { createConcreteMaps, createFloorLighting, createSectorLabel, getShelfPlacements } from './roomSurfaces';
import type { RoomLayoutConfig } from './layout';

export interface RoomAssets {
  printer: THREE.Group;
  lod: THREE.Group;
  bench: THREE.Group;
  shelf: THREE.Group;
  tile: THREE.Group;
  benchLight: THREE.Texture;
  shelfLight: THREE.Texture;
}
export function roomModels(assets: RoomAssets): THREE.Group[] {
  return [assets.printer, assets.lod, assets.bench, assets.shelf, assets.tile];
}
export function disposeRoomAssets(assets: RoomAssets): void {
  disposeAssets(roomModels(assets)); assets.benchLight.dispose(); assets.shelfLight.dispose();
}
const paths = ['a1', 'a1-lod', 'workbench', 'shelf', 'room-kit'];
export async function loadRoomAssets(): Promise<RoomAssets> {
  const loader = new GLTFLoader(), textures = new THREE.TextureLoader();
  const [models, lighting] = await Promise.all([
    Promise.allSettled(paths.map(name => loader.loadAsync(`/models/printer-room/${name}.glb`))),
    Promise.allSettled(['bench-lightmap', 'shelf-lightmap'].map(name => textures.loadAsync(`/models/printer-room/${name}.png`))),
  ]);
  const scenes = models.flatMap(result => result.status === 'fulfilled' ? [result.value.scene] : []);
  const maps = lighting.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  if (scenes.length !== paths.length || maps.length !== 2) {
    disposeAssets(scenes); maps.forEach(map => map.dispose());
    throw new Error('Не удалось загрузить модели комнаты. Попробуйте ещё раз.');
  }
  for (const scene of scenes) scene.updateMatrixWorld(true);
  return { printer: scenes[0], lod: scenes[1], bench: scenes[2], shelf: scenes[3], tile: scenes[4], benchLight: maps[0], shelfLight: maps[1] };
}
export function translation(x: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeTranslation(x, y, z);
}

/** Modular industrial diorama; local irradiance is authored in Blender, not N live lights. */
export function buildRoom(layout: RoomLayoutConfig, assets: RoomAssets): { group: THREE.Group; owned: THREE.Object3D[] } {
  const group = new THREE.Group(), owned: THREE.Object3D[] = [];
  const [width, , depth] = layout.roomSize;
  const ownedMesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const mesh = new THREE.Mesh(geometry, material); owned.push(mesh); return mesh;
  };
  const surface = (color: number, roughness = .65, metalness = .1) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
    const mesh = ownedMesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.castShadow = !material.transparent; group.add(mesh); return mesh;
  };
  const graphite = surface(0x30363d, .58, .32), recess = surface(0x11171d, .74);
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffce8c).multiplyScalar(3) });
  // Thick chamfered slab with a recessed illuminated service band and segmented fascias.
  box(width, .22, depth, 0, -.135, 0, graphite);
  box(width - .32, .28, depth - .32, 0, -.385, 0, recess);
  box(width - .06, .075, depth - .06, 0, -.53, 0, graphite);
  box(width - .15, .032, depth - .15, 0, -.35, 0, warm);
  const fascia = ownedMesh(new THREE.BoxGeometry(1.25, .2, .07), graphite);
  const fascias: THREE.Matrix4[] = [];
  for (let x = -width / 2 + .7; x < width / 2 - .3; x += 1.8) {
    fascias.push(translation(x, -.32, depth / 2 - .015), translation(x, -.32, -depth / 2 + .015));
  }
  for (let z = -depth / 2 + .7; z < depth / 2 - .3; z += 1.8) for (const x of [-width / 2, width / 2]) {
    fascias.push(translation(x, -.32, z).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)));
  }
  group.add(instanceTemplate(fascia, fascias));

  const maps = createConcreteMaps();
  for (const map of Object.values(maps)) map.repeat.set(width, depth);
  const lighting = createFloorLighting(layout, assets.benchLight.image as CanvasImageSource, assets.shelfLight.image as CanvasImageSource);
  const floorGeometry = new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2);
  floorGeometry.setAttribute('uv1', floorGeometry.getAttribute('uv').clone());
  const floor = ownedMesh(floorGeometry, new THREE.MeshStandardMaterial({
    color: 0xffffff, ...maps, roughness: .82, metalness: .12, bumpScale: .012,
    lightMap: lighting, lightMapIntensity: 7, envMapIntensity: .35,
  }));
  floor.position.y = -.02; floor.receiveShadow = true; group.add(floor);

  // A dark receiving floor anchors the raised platform instead of floating in a solid color.
  const ground = ownedMesh(new THREE.PlaneGeometry(width * 4, depth * 4).rotateX(-Math.PI / 2), surface(0x0b1015, .96, 0));
  ground.position.y = -.59; ground.receiveShadow = true; group.add(ground);

  const shelves = getShelfPlacements(layout);
  group.add(instanceTemplate(assets.shelf, shelves.map(p => translation(p.x, 0, p.z)
    .multiply(new THREE.Matrix4().makeRotationY(p.left ? Math.PI / 2 : 0)))));
  const shelfStrip = ownedMesh(new THREE.BoxGeometry(2.63, .018, .018), warm);
  const shelfFixtures = instanceTemplate(shelfStrip, shelves.flatMap(p => [.67, 1.31, 2.01].map(y =>
    translation(p.x, 0, p.z).multiply(new THREE.Matrix4().makeRotationY(p.left ? Math.PI / 2 : 0))
      .multiply(translation(0, y, .257)))));
  shelfFixtures.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = false; object.receiveShadow = false; } });
  group.add(shelfFixtures);
  // Sparse smoked safety panels leave the shelving freestanding, as in the reference.
  const glass = new THREE.MeshBasicMaterial({ color: 0x8299ad, transparent: true, opacity: .045,
    depthWrite: false });
  box(width, 1.5, .025, 0, .75, -depth / 2 + .05, glass);
  box(.025, 1.5, depth, -width / 2 + .05, .75, 0, glass);
  const rail = surface(0x46545e, .4, .65);
  box(width, .016, .025, 0, 1.5, -depth / 2 + .05, rail);
  box(.025, .016, depth, -width / 2 + .05, 1.5, 0, rail);
  group.add(instanceTemplate(assets.bench, layout.workbenches.map(bench => translation(...bench.position)
    .scale(new THREE.Vector3(bench.size[0] / 1.45, bench.size[1] / .85, bench.size[2] / 1.15)))));

  // Linear under-table fixtures, visible below the metal apron.
  const strip = ownedMesh(new THREE.BoxGeometry(.99, .022, .022), warm);
  const strips = layout.workbenches.flatMap(bench => [
    translation(bench.position[0], .606, bench.position[2] + .443),
    translation(bench.position[0], .606, bench.position[2] - .443),
  ]);
  const fixtures = instanceTemplate(strip, strips);
  fixtures.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = false; object.receiveShadow = false; } });
  group.add(fixtures);

  // Grounded, subtle station contact shadows also work when expensive shadows are disabled.
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(32, 32, 7, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(0,0,0,.85)'); gradient.addColorStop(.55, 'rgba(0,0,0,.4)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
  const contact = ownedMesh(new THREE.PlaneGeometry(.82, .75).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, opacity: .7 }));
  const contacts = instanceTemplate(contact, layout.stations.map(station => translation(station.position[0], station.position[1] + .006, station.position[2])));
  contacts.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = false; object.receiveShadow = false; } });
  group.add(contacts);

  const rows = [...new Set(layout.stations.map(station => station.position[2]))];
  for (let i = 0; i < rows.length; i += Math.max(1, Math.ceil(rows.length / 4))) {
    const label = createSectorLabel(`${String.fromCharCode(65 + i % 26)}1`, `РЯД ${String(i + 1).padStart(2, '0')}`);
    label.rotation.x = -Math.PI / 2;
    label.position.set(-width / 2 + 1.5, -.012, rows[i]);
    owned.push(label); group.add(label);
  }
  if (shelves.length > 1) {
    const label = createSectorLabel('МАТЕРИАЛЫ', 'ХРАНЕНИЕ ФИЛАМЕНТА');
    label.scale.setScalar(.8); label.position.set(width / 2 - 1.2, 1.55, -depth / 2 + .08);
    owned.push(label); group.add(label);
  }
  return { group, owned };
}
