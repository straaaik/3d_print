import * as THREE from 'three';
import type { RoomLayoutConfig } from './layout';

function surfaceCanvas(width: number, height = width): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}
function canvasTexture(canvas: HTMLCanvasElement, color = false): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** One repeatable concrete surface: layered mineral variation, pores and fine joints. */
export function createConcreteMaps(): { map: THREE.Texture; bumpMap: THREE.Texture; roughnessMap: THREE.Texture } {
  const canvas = surfaceCanvas(512), context = canvas.getContext('2d')!;
  const pixels = context.createImageData(512, 512);
  let seed = 41821;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const cloud = Math.sin(x * .039 + Math.sin(y * .031) * 2) * 1.2 + Math.cos(y * .047 - x * .019);
    const value = 105 + cloud + (random() - .5) * 5;
    const offset = (y * 512 + x) * 4;
    pixels.data[offset] = value; pixels.data[offset + 1] = value + 2; pixels.data[offset + 2] = value + 5; pixels.data[offset + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  context.strokeStyle = 'rgba(34,39,45,.38)'; context.lineWidth = 3;
  context.strokeRect(1.5, 1.5, 509, 509);
  context.strokeStyle = 'rgba(205,207,207,.12)'; context.lineWidth = 1; context.strokeRect(3.5, 3.5, 505, 505);
  const map = canvasTexture(canvas, true);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const bumpMap = canvasTexture(canvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  const rough = surfaceCanvas(128), rc = rough.getContext('2d')!;
  rc.fillStyle = '#939393'; rc.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) {
    rc.fillStyle = `rgba(255,255,255,${random() * .06})`;
    rc.fillRect(random() * 128, random() * 128, 2, 2);
  }
  const roughnessMap = canvasTexture(rough);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  return { map, bumpMap, roughnessMap };
}

/** Combine small Blender lighting studies into a bounded room lightmap, once per layout. */
export function createFloorLighting(layout: RoomLayoutConfig, benchImage?: CanvasImageSource, shelfImage?: CanvasImageSource): THREE.Texture {
  const [width, , depth] = layout.roomSize;
  const density = Math.min(100, 2048 / Math.max(width, depth));
  const canvas = surfaceCanvas(Math.ceil(width * density), Math.ceil(depth * density));
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#202832'; context.fillRect(0, 0, canvas.width, canvas.height);
  const feather = (image: CanvasImageSource) => {
    const patch = surfaceCanvas(256, 384), pc = patch.getContext('2d')!;
    pc.drawImage(image, 0, 0, 256, 384);
    pc.globalCompositeOperation = 'destination-in';
    const fade = pc.createLinearGradient(0, 0, 0, 384);
    fade.addColorStop(0, 'transparent'); fade.addColorStop(.16, '#fff');
    fade.addColorStop(.7, '#fff'); fade.addColorStop(1, 'transparent');
    pc.fillStyle = fade; pc.fillRect(0, 0, 256, 384);
    return patch;
  };
  const benchPatch = benchImage ? feather(benchImage) : undefined;
  const shelfPatch = shelfImage ? feather(shelfImage) : undefined;
  const draw = (image: CanvasImageSource, x: number, z: number, w: number, d: number, rotation = 0) => {
    context.save(); context.translate((x + width / 2) * density, (z + depth / 2) * density);
    context.rotate(rotation); context.drawImage(image, -w * density / 2, -d * density / 2, w * density, d * density); context.restore();
  };
  for (const bench of layout.workbenches) {
    if (benchPatch) draw(benchPatch, bench.position[0], bench.position[2], 1.12, 1.68);
    else {
      const x = (bench.position[0] + width / 2) * density, y = (bench.position[2] + depth / 2) * density;
      context.save(); context.translate(x, y); context.scale(1, .72);
      const gradient = context.createRadialGradient(0, 0, .1 * density, 0, 0, 1.2 * density);
      gradient.addColorStop(0, '#eccba1'); gradient.addColorStop(.5, '#806d57'); gradient.addColorStop(1, '#383d46');
      context.fillStyle = gradient; context.fillRect(-1.2 * density, -1.2 * density, 2.4 * density, 2.4 * density); context.restore();
    }
  }
  if (shelfPatch) for (const position of getShelfPlacements(layout)) {
    draw(shelfPatch, position.x + (position.left ? .55 : 0), position.z + (position.left ? 0 : .55), 2.8, 1.6, position.left ? -Math.PI / 2 : 0);
  }
  const texture = canvasTexture(canvas, true);
  texture.channel = 1;
  return texture;
}

export function getShelfPlacements(layout: RoomLayoutConfig): Array<{ x: number; z: number; left: boolean }> {
  const [width, , depth] = layout.roomSize;
  const backCount = Math.max(1, Math.floor((width - 1.8) / 3.15));
  const placements = Array.from({ length: backCount }, (_, index) => ({
    x: (index - (backCount - 1) / 2) * 3.15 + .4, z: -depth / 2 + .4, left: false,
  }));
  const leftCount = depth > 7 ? Math.max(1, Math.floor((depth - 3.8) / 3.3)) : 0;
  for (let index = 0; index < leftCount; index++) placements.push({
    x: -width / 2 + .4, z: (index - (leftCount - 1) / 2) * 3.3 + .3, left: true,
  });
  return placements;
}

export function createSectorLabel(title: string, subtitle: string): THREE.Mesh {
  const canvas = surfaceCanvas(512, 160), context = canvas.getContext('2d')!;
  context.fillStyle = '#293846'; context.font = '600 96px sans-serif'; context.fillText(title, 8, 90);
  context.font = '500 22px sans-serif'; context.fillText(subtitle, 10, 116);
  return new THREE.Mesh(new THREE.PlaneGeometry(2.4, .75), new THREE.MeshBasicMaterial({
    map: canvasTexture(canvas, true), transparent: true, depthWrite: false, toneMapped: false,
  }));
}
