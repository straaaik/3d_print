import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.ao = new WorkshopAO(scene, camera, 1, 1);
    this.ao.updateGtaoMaterial({ radius: .65, thickness: 1.2, distanceFallOff: .8, scale: 1.2, samples: 16, screenSpaceRadius: false });
    this.ao.updatePdMaterial({ radius: 5, samples: 8, rings: 2 });
    this.ao.blendIntensity = .85;
    this.composer.addPass(this.ao);
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1), .14, .35, 1.8));
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new SMAAPass());
  }
  resize(width: number, height: number) {
    this.composer.setSize(Math.max(1, width), Math.max(1, height));
    // Contact shading at CSS resolution keeps high-DPI / mobile memory bounded.
    const scale = Math.min(1, 1400 / Math.max(width, height));
    this.ao.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  }
  render(top: boolean) {
    this.ao.enabled = !top;
    this.composer.render();
  }
  dispose() {
    this.composer.passes.forEach(pass => pass.dispose());
    this.composer.dispose();
  }
}
