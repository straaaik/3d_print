import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { findSelectionMask } from './selectionContour';

/** The shared proxy is visible only while rendering the selection mask. */
class SelectionOutlinePass extends OutlinePass {
  override render(renderer: THREE.WebGLRenderer, write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget, delta: number, mask: boolean) {
    for (const object of this.selectedObjects) object.visible = true;
    try { super.render(renderer, write, read, delta, mask); }
    finally { for (const object of this.selectedObjects) object.visible = false; }
  }
}

/** Glass and editor overlays must not become opaque occluders in the normal buffer. */
class WorkshopAO extends GTAOPass {
  override render(renderer: THREE.WebGLRenderer, write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean) {
    const hidden: THREE.Object3D[] = [];
    this.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || !object.visible) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.every(material => material.transparent || !material.depthTest)) {
        hidden.push(object);
        object.visible = false;
      }
    });
    try { super.render(renderer, write, read, deltaTime, maskActive); }
    finally { hidden.forEach(object => { object.visible = true; }); }
  }
}

/** Runs only when the scene is invalidated; no independent animation loop. */
export class ScenePresentation {
  private composer: EffectComposer;
  private ao: WorkshopAO;
  private outline: SelectionOutlinePass;
  private proxy = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  private emptyMask = this.proxy.geometry;
  private scene: THREE.Scene;
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.proxy.visible = false;
    this.proxy.matrixAutoUpdate = false;
    scene.add(this.proxy);
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.ao = new WorkshopAO(scene, camera, 1, 1);
    this.ao.updateGtaoMaterial({ radius: .65, thickness: 1.2, distanceFallOff: .8, scale: 1.2, samples: 16, screenSpaceRadius: false });
    this.ao.updatePdMaterial({ radius: 5, samples: 8, rings: 2 });
    this.ao.blendIntensity = .85;
    this.composer.addPass(this.ao);
    this.outline = new SelectionOutlinePass(new THREE.Vector2(1, 1), scene, camera);
    this.outline.visibleEdgeColor.set('#009dff');
    this.outline.hiddenEdgeColor.set('#000000');
    this.outline.edgeStrength = 4;
    this.outline.edgeThickness = 1.25;
    this.outline.edgeGlow = .65;
    this.outline.pulsePeriod = 0;
    // The mask duplicates an instanced model. A small depth tolerance avoids
    // classifying its own surface as an occluder, while shelves still hide it.
    this.outline.prepareMaskMaterial.fragmentShader = this.outline.prepareMaskMaterial.fragmentShader.replace(
      '-vPosition.z > viewZ', '-vPosition.z > viewZ + 0.008'
    );
    this.composer.addPass(this.outline);
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1), .14, .35, 1.8));
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new SMAAPass());
  }
  resize(width: number, height: number) {
    this.composer.setSize(Math.max(1, width), Math.max(1, height));
    // Contact shading at CSS resolution keeps high-DPI / mobile memory bounded.
    const scale = Math.min(1, 1400 / Math.max(width, height));
    this.ao.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    this.outline.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  }
  render(top: boolean, selectedPlacementId: string | null) {
    // The clicked placement is authoritative; hover/animation flags cannot
    // enable an outline or clear a persistent selection.
    const selection = findSelectionMask(this.scene, selectedPlacementId);
    this.outline.enabled = !!selection;
    if (selection) {
      selection.updateWorldMatrix(true, false);
      this.proxy.geometry = selection.userData.selectionMask;
      this.proxy.matrix.copy(selection.matrixWorld);
      this.proxy.matrixWorldNeedsUpdate = true;
      this.outline.selectedObjects = [this.proxy];
    } else {
      this.outline.selectedObjects = [];
      this.proxy.geometry = this.emptyMask;
    }
    this.ao.enabled = !top;
    this.composer.render();
    return selection?.userData.placementId as string | undefined;
  }
  dispose() {
    this.proxy.removeFromParent();
    this.proxy.material.dispose();
    this.emptyMask.dispose();
    this.composer.passes.forEach(pass => pass.dispose());
    this.composer.dispose();
  }
}
