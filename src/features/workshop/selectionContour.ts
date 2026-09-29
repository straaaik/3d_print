import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { filamentScale, filamentSlotX, type Furniture, type Slot } from './model';

/** Keep the mask on the animated spool, including its persistent selected pose. */
export function updateFilamentHighlight(outline: THREE.Mesh, furniture: Furniture, slot: Slot, progress: number): number {
  const amount = outline.userData.selectedMask ? 1 : THREE.MathUtils.clamp(progress, 0, 1);
  const scale = 1 + .05 * amount;
  const [axial, radial] = filamentScale(furniture);
  outline.position.set(filamentSlotX(furniture, slot), slot.y + .035 * amount - .11 * (scale - 1), slot.z + .07 * amount);
  outline.scale.set(axial * scale, radial * scale, radial * scale);
  return amount;
}

export function findSelectionMask(root: THREE.Object3D, selectedPlacementId: string | null): THREE.Mesh | undefined {
  if (!selectedPlacementId) return undefined;
  let selected: THREE.Mesh | undefined;
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !object.userData.selectionMask || object.userData.selectionKind === 'filament') return;
    if (object.userData.placementId === selectedPlacementId) selected = object;
  });
  return selected;
}

/** Opaque screen mask: overlapping components resolve to one silhouette. */
export function buildSelectionMask(model: THREE.Group): THREE.BufferGeometry {
  model.updateMatrixWorld(true);
  const inverse = model.matrixWorld.clone().invert();
  const parts: THREE.BufferGeometry[] = [];
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    for (const attribute of Object.keys(geometry.attributes)) {
      if (attribute !== 'position') geometry.deleteAttribute(attribute);
    }
    geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    parts.push(geometry);
  });
  const result = parts.length ? mergeGeometries(parts)! : new THREE.BufferGeometry();
  parts.forEach(part => part.dispose());
  return result;
}

/** One exterior envelope: internal mechanisms never contribute highlight lines. */
export function buildSelectionContour(model: THREE.Group, radius = .0018): THREE.BufferGeometry {
  model.updateMatrixWorld(true);
  const inverse = model.matrixWorld.clone().invert();
  const points = new Map<string, THREE.Vector3>();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh) || /nozzle/i.test(object.name)) return;
    const matrix = inverse.clone().multiply(object.matrixWorld);
    const position = object.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(matrix);
      const key = `${Math.round(p.x * 10000)},${Math.round(p.y * 10000)},${Math.round(p.z * 10000)}`;
      if (!points.has(key)) points.set(key, p);
    }
  });
  if (points.size < 4) return new THREE.BufferGeometry();
  const hull = new ConvexGeometry([...points.values()]);
  const edges = new THREE.EdgesGeometry(hull, 24);
  const positions = edges.getAttribute('position');
  const tubes: THREE.BufferGeometry[] = [];
  const bounds = new THREE.Box3().setFromPoints([...points.values()]);
  const center = bounds.getCenter(new THREE.Vector3());
  const start = new THREE.Vector3(), end = new THREE.Vector3(), direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < positions.count; i += 2) {
    start.fromBufferAttribute(positions, i).sub(center).multiplyScalar(1.008).add(center);
    end.fromBufferAttribute(positions, i + 1).sub(center).multiplyScalar(1.008).add(center);
    direction.subVectors(end, start);
    if (direction.lengthSq() < 1e-10) continue;
    const tube = new THREE.CylinderGeometry(radius, radius, direction.length(), 6, 1);
    tube.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()));
    tube.translate((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);
    tubes.push(tube);
  }
  const geometry = tubes.length ? mergeGeometries(tubes)! : new THREE.BufferGeometry();
  tubes.forEach(tube => tube.dispose());
  edges.dispose(); hull.dispose();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
