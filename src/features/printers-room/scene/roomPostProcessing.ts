import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

class OcclusionPass extends SSAOPass {
  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    const excluded: THREE.Object3D[] = [];
    this.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || !object.visible) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some(material => material.transparent || !material.visible)) {
        excluded.push(object); object.visible = false;
      }
    });
    try { super.render(renderer, writeBuffer, readBuffer, 0, false); }
    finally { for (const object of excluded) object.visible = true; }
  }
}

/** Static contact depth at half resolution. Runs only when the scene is invalidated. */
export class RoomPostProcessing {
  private composer: EffectComposer;
  private ao: SSAOPass;
  private output = new OutputPass();
  private bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .14, .3, .95);
  private beauty: RenderPass;
  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene, private camera: THREE.OrthographicCamera) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 2 });
    this.composer = new EffectComposer(renderer, target);
    this.beauty = new RenderPass(scene, camera);
    this.ao = new OcclusionPass(scene, camera, 1, 1, 16);
    this.ao.ssaoMaterial.defines.PERSPECTIVE_CAMERA = 0;
    this.ao.depthRenderMaterial.defines.PERSPECTIVE_CAMERA = 0;
    this.ao.kernelRadius = .65;
    this.ao.minDistance = .0001;
    this.ao.maxDistance = .025;
    this.composer.addPass(this.beauty);
    this.composer.addPass(this.ao);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
  }
  resize(width: number, height: number): void {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(width, height);
    this.ao.setSize(Math.max(1, Math.round(width * .65)), Math.max(1, Math.round(height * .65)));
    this.bloom.setSize(Math.max(1, Math.round(width * .5)), Math.max(1, Math.round(height * .5)));
  }
  render(): void {
    const uniforms = this.ao.ssaoMaterial.uniforms;
    uniforms.cameraNear.value = this.camera.near;
    uniforms.cameraFar.value = this.camera.far;
    uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix);
    uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse);
    this.composer.render();
  }
  dispose(): void {
    this.ao.dispose(); this.ao.ssaoMaterial.dispose(); this.ao.noiseTexture.dispose();
    this.beauty.dispose(); this.bloom.dispose(); this.output.dispose(); this.composer.dispose();
  }
}
