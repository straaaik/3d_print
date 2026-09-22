import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let cachedTemplate: THREE.Group | null = null;
let loadPromise: Promise<THREE.Group | null> | null = null;

export const BAMBU_A1_MODEL_URL = '/models/bambulab-a1.glb';
export const BAMBU_A1_TARGET_HEIGHT = 0.65; // meters

/**
 * Loads and prepares the Bambu Lab A1 GLB model template.
 * Normalizes scale to BAMBU_A1_TARGET_HEIGHT, centers X/Z, and sets bottom at Y=0.
 */
export function loadBambuA1Template(url = BAMBU_A1_MODEL_URL): Promise<THREE.Group | null> {
  if (cachedTemplate) {
    return Promise.resolve(cachedTemplate);
  }
  if (loadPromise) {
    return loadPromise;
  }

  // Graceful guard for SSR or non-browser test runners
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  loadPromise = new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        try {
          const rawModel = gltf.scene;
          rawModel.updateMatrixWorld(true);

          const box = new THREE.Box3().setFromObject(rawModel);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);

          const scale = BAMBU_A1_TARGET_HEIGHT / (size.y || 1);

          rawModel.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              if (mesh.material) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.roughness = Math.max(mat.roughness ?? 0.5, 0.3);
                mat.metalness = Math.min(mat.metalness ?? 0.5, 0.7);
                mat.envMapIntensity = 1.0;
                mat.needsUpdate = true;
              }
            }
          });

          // Wrapper group with normalized origin:
          // X: 0 (center), Y: 0 (bottom feet sitting on mat), Z: 0 (center)
          const wrapper = new THREE.Group();
          wrapper.name = 'BambuLabA1Template';
          rawModel.scale.set(scale, scale, scale);
          rawModel.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
          wrapper.add(rawModel);

          cachedTemplate = wrapper;
          resolve(wrapper);
        } catch (e) {
          console.warn('Error processing Bambu Lab A1 GLB template', e);
          resolve(null);
        }
      },
      undefined,
      (error) => {
        console.warn('Could not load Bambu Lab A1 GLB model, falling back to procedural model', error);
        resolve(null);
      },
    );
  });

  return loadPromise;
}

export function cloneBambuA1Model(template: THREE.Group): THREE.Group {
  return template.clone(true);
}
