import * as THREE from 'three';

/** Owns instance buffers only. Geometry/materials remain owned by the source asset. */
export function instanceTemplate(template: THREE.Object3D, transforms: THREE.Matrix4[], chunkSize = 64): THREE.Group {
  const group = new THREE.Group();
  const combined = new THREE.Matrix4();
  template.updateMatrixWorld(true);
  template.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (let offset = 0; offset < transforms.length; offset += chunkSize) {
      const count = Math.min(chunkSize, transforms.length - offset);
      const batch = new THREE.InstancedMesh(object.geometry, object.material, count);
      batch.name = object.name;
      batch.userData.instanceOffset = offset;
      batch.castShadow = true;
      batch.receiveShadow = true;
      for (let i = 0; i < count; i++) {
        combined.multiplyMatrices(transforms[offset + i], object.matrixWorld);
        batch.setMatrixAt(i, combined);
      }
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingBox();
      batch.computeBoundingSphere();
      group.add(batch);
    }
  });
  return group;
}

export function disposeInstances(group: THREE.Object3D): void {
  group.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
  group.removeFromParent();
}

/** Deduplicate shared GLB resources when releasing an entire scene. */
export function disposeAssets(objects: (THREE.Object3D | THREE.BufferGeometry | undefined)[]): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  for (const root of objects) {
    if (!root) continue;
    if (root instanceof THREE.BufferGeometry) {
      geometries.add(root);
      continue;
    }
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
  }
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}
