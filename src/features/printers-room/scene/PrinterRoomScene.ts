import * as THREE from 'three';
import { animate, type AnimationPlaybackControls } from 'motion';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { Printer } from '../../../shared/types';
import { calculateRoomLayout, getOverviewSpan } from './layout';
import { buildRoom, loadRoomAssets, disposeRoomAssets, roomModels, translation, type RoomAssets } from './roomAssets';
import { disposeAssets, disposeInstances, instanceTemplate } from './instances';
import { RoomPostProcessing } from './roomPostProcessing';

export interface PrinterRoomSceneOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  printers: Printer[];
  onSelectPrinter: (printer: Printer | null) => void;
  onHoverPrinter: (printer: Printer | null) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
}

/** A static, instanced farm. There is deliberately no continuous render loop. */
export class PrinterRoomScene {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-10, 10, 10, -10, .1, 2000);
  private renderer: THREE.WebGLRenderer | null = null;
  private environment: THREE.WebGLRenderTarget | null = null;
  private post: RoomPostProcessing | null = null;
  private assets: RoomAssets | null = null;
  private architecture: THREE.Group | null = null;
  private architectureOwned: THREE.Object3D[] = [];
  private machines: THREE.Group | null = null;
  private picks: THREE.InstancedMesh | null = null;
  private markers: THREE.InstancedMesh | null = null;
  private selection: THREE.LineSegments;
  private lights: THREE.Light[] = [];
  private key: THREE.DirectionalLight;
  private backWash: THREE.RectAreaLight;
  private leftWash: THREE.RectAreaLight;
  private layout;
  private printers: Printer[];
  private target = new THREE.Vector3(0, .4, 0);
  private span = 10;
  private top = false;
  private selectedId: string | null = null;
  private hoveredId: string | null = null;
  private frame: number | null = null;
  private frames = 0;
  private disposed = false;
  private visible = true;
  private lost = false;
  private lod = false;
  private transition: AnimationPlaybackControls | null = null;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private down: { x: number; y: number; target: THREE.Vector3 } | null = null;
  private dragged = false;

  constructor(private options: PrinterRoomSceneOptions) {
    this.printers = options.printers;
    this.layout = calculateRoomLayout(this.printers);
    this.scene.background = new THREE.Color('#10171d');
    const outline = new THREE.EdgesGeometry(new THREE.BoxGeometry(.94, .012, .8));
    this.selection = new THREE.LineSegments(outline, new THREE.LineBasicMaterial({ color: '#6cbdff', depthTest: false }));
    this.selection.renderOrder = 10;
    this.selection.visible = false;
    this.scene.add(this.selection);
    this.key = new THREE.DirectionalLight('#d8e1ef', .8);
    this.key.position.set(-6, 12, 8);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -.0006;
    this.key.shadow.normalBias = .06;
    this.key.shadow.radius = 5;
    this.key.shadow.blurSamples = 6;
    const fill = new THREE.DirectionalLight('#a9cfff', .18);
    fill.position.set(8, 7, -5);
    RectAreaLightUniformsLib.init();
    this.backWash = new THREE.RectAreaLight('#ffd09a', 3.2, 10, .18);
    this.leftWash = new THREE.RectAreaLight('#ffd09a', 2.4, 10, .18);
    this.lights = [this.key, fill, this.backWash, this.leftWash, new THREE.HemisphereLight('#c5d9ee', '#191b21', .2), new THREE.AmbientLight('#b7c8de', .035)];
    this.scene.add(...this.lights);
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.intersectionObserver = new IntersectionObserver(entries => {
      this.visible = entries[0]?.isIntersecting ?? true;
      if (!this.visible) this.stopTransition();
      else this.invalidate();
    });
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: options.canvas, antialias: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = .92;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.VSMShadowMap;
      this.renderer.shadowMap.autoUpdate = false;
      this.createEnvironment();
      this.resizeObserver.observe(options.container);
      this.intersectionObserver.observe(options.container);
      this.bindEvents();
      this.handleResize();
      void this.load();
    } catch {
      options.onError?.('3D-режим недоступен. Используйте таблицу или карточки принтеров.');
    }
  }

  private createEnvironment(): void {
    if (!this.renderer) return;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environmentScene = new RoomEnvironment();
    try {
      const replacement = pmrem.fromScene(environmentScene, .04);
      this.environment?.dispose();
      this.environment = replacement;
      this.scene.environment = replacement.texture;
      this.scene.environmentIntensity = .5;
    } finally {
      environmentScene.dispose(); pmrem.dispose();
    }
  }

  private async load(): Promise<void> {
    try {
      const assets = await loadRoomAssets();
      if (this.disposed) { disposeRoomAssets(assets); return; }
      this.assets = assets;
      this.rebuild();
      this.options.onReady?.();
    } catch (error) {
      if (!this.disposed) this.options.onError?.(error instanceof Error ? error.message : 'Не удалось открыть комнату.');
    }
  }

  private clearRoom(): void {
    if (this.architecture) disposeInstances(this.architecture);
    if (this.machines) disposeInstances(this.machines);
    if (this.picks) { this.picks.dispose(); this.picks.removeFromParent(); disposeAssets([this.picks]); }
    if (this.markers) { this.markers.dispose(); this.markers.removeFromParent(); disposeAssets([this.markers]); }
    disposeAssets(this.architectureOwned);
    this.architectureOwned = [];
    this.architecture = null; this.machines = null; this.picks = null; this.markers = null;
  }

  private rebuild(): void {
    if (!this.assets || !this.renderer) return;
    this.stopTransition();
    this.clearRoom();
    this.layout = calculateRoomLayout(this.printers);
    const room = buildRoom(this.layout, this.assets);
    this.architecture = room.group;
    this.architectureOwned = room.owned;
    this.scene.add(room.group);
    const [roomWidth, , roomDepth] = this.layout.roomSize;
    this.backWash.width = roomWidth - 1;
    this.backWash.position.set(0, 2.12, -roomDepth / 2 + 1);
    this.backWash.lookAt(0, .7, -roomDepth / 2 + .3);
    this.leftWash.width = roomDepth - 3;
    this.leftWash.position.set(-roomWidth / 2 + 1, 2.12, 0);
    this.leftWash.lookAt(-roomWidth / 2 + .3, .7, 0);
    // Invisible simple boxes make hit testing independent of GLB triangle count.
    this.picks = new THREE.InstancedMesh(new THREE.BoxGeometry(.95, .85, .85),
      new THREE.MeshBasicMaterial({ visible: false }), this.printers.length);
    this.picks.visible = false;
    this.markers = new THREE.InstancedMesh(new THREE.BoxGeometry(.065, .018, .065),
      new THREE.MeshBasicMaterial(), this.printers.length);
    const color = new THREE.Color();
    for (let i = 0; i < this.layout.stations.length; i++) {
      const [x, y, z] = this.layout.stations[i].position;
      this.picks.setMatrixAt(i, translation(x, y + .42, z));
      this.markers.setMatrixAt(i, translation(x - .46, y + .01, z + .37));
      const hex = this.printers[i].color;
      color.set(hex && /^#[\da-f]{6}$/i.test(hex) ? hex : '#8094a3');
      this.markers.setColorAt(i, color);
    }
    this.picks.computeBoundingSphere(); this.markers.computeBoundingSphere();
    this.scene.add(this.picks, this.markers);
    const extent = Math.max(this.layout.roomSize[0], this.layout.roomSize[2]);
    this.key.position.set(-extent * .7, extent * 1.5, -extent * .3);
    Object.assign(this.key.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, far: extent * 5 });
    this.key.shadow.camera.updateProjectionMatrix();
    this.renderer.shadowMap.enabled = this.printers.length <= 80;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.printers.length > 80 ? 1 : 1.5));
    this.updatePostProcessing();
    this.hoveredId = null;
    this.options.onHoverPrinter(null);
    if (this.selectedId && this.printers.some(p => p.id === this.selectedId)) this.selectPrinterById(this.selectedId);
    else this.resetFocus();
    this.updateModels(true);
    this.renderer.shadowMap.needsUpdate = true;
    this.invalidate();
  }

  private updatePostProcessing(): void {
    if (!this.renderer) return;
    const enabled = this.printers.length <= 80 && this.options.container.clientWidth >= 700;
    if (enabled && !this.post) this.post = new RoomPostProcessing(this.renderer, this.scene, this.camera);
    if (!enabled && this.post) { this.post.dispose(); this.post = null; }
    this.post?.resize(this.options.container.clientWidth, this.options.container.clientHeight);
  }

  private updateModels(force = false): void {
    if (!this.assets) return;
    const useLod = this.printers.length > 80 && this.span > 8;
    if (!force && this.machines && this.lod === useLod) return;
    this.lod = useLod;
    if (this.machines) disposeInstances(this.machines);
    this.machines = instanceTemplate(useLod ? this.assets.lod : this.assets.printer,
      this.layout.stations.map(station => translation(...station.position)));
    this.scene.add(this.machines);
    if (this.renderer) this.renderer.shadowMap.needsUpdate = true;
  }

  public updatePrinters(printers: Printer[]): void {
    if (this.disposed || this.printers === printers) return;
    this.printers = printers;
    this.rebuild();
  }
  public selectPrinterById(id: string | null): void {
    if (this.disposed) return;
    const index = this.printers.findIndex(p => p.id === id);
    if (index < 0) { this.resetFocus(); return; }
    this.selectedId = id;
    const position = this.layout.stations[index].position;
    this.updateSelection();
    // Leave room on the right for the detail drawer on desktop.
    this.moveCamera(new THREE.Vector3(position[0] + (this.aspect > 1.3 ? .8 : 0), position[1] + .3, position[2]),
      this.aspect > 1.3 ? 3.8 : 5.5);
    this.options.onSelectPrinter(this.printers[index]);
  }
  public resetFocus(): void {
    if (this.disposed) return;
    this.selectedId = null;
    this.updateSelection();
    this.moveCamera(new THREE.Vector3(0, .4, 0), getOverviewSpan(this.layout, this.aspect, this.top));
    this.options.onSelectPrinter(null);
  }
  public setTopView(top: boolean): void {
    this.top = top;
    this.resetFocus();
  }
  public zoomIn(): void { this.moveCamera(this.target.clone(), Math.max(2.4, this.span * .8)); }
  public zoomOut(): void {
    this.moveCamera(this.target.clone(), Math.min(getOverviewSpan(this.layout, this.aspect, this.top) * 1.8, this.span * 1.25));
  }
  private get aspect(): number { return Math.max(1, this.options.container.clientWidth) / Math.max(1, this.options.container.clientHeight); }

  private stopTransition(): void { this.transition?.stop(); this.transition = null; }
  private moveCamera(target: THREE.Vector3, span: number): void {
    this.stopTransition();
    const start = this.target.clone(), startSpan = this.span;
    if (!this.visible || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.target.copy(target); this.span = span; this.updateModels(); this.invalidate(); return;
    }
    this.transition = animate(0, 1, { duration: .38, ease: [.16, 1, .3, 1], onUpdate: value => {
      this.target.lerpVectors(start, target, value);
      this.span = THREE.MathUtils.lerp(startSpan, span, value);
      this.updateModels(); this.invalidate();
    } });
  }

  private updateSelection(): void {
    const id = this.selectedId ?? this.hoveredId;
    const station = this.layout.stations.find(s => s.printerId === id);
    this.selection.visible = Boolean(station);
    if (station) this.selection.position.set(station.position[0], station.position[1] + .015, station.position[2]);
    this.invalidate();
  }
  private pick(event: PointerEvent): Printer | null {
    if (!this.picks) return null;
    const rect = this.options.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.picks, false)[0];
    return hit?.instanceId !== undefined ? this.printers[hit.instanceId] ?? null : null;
  }
  private onMove = (event: PointerEvent): void => {
    if (this.down && (Math.abs(event.clientX - this.down.x) + Math.abs(event.clientY - this.down.y) > 5 || this.dragged)) {
      this.dragged = true; this.stopTransition();
      const scale = this.span / Math.max(1, this.options.container.clientHeight);
      const dx = (event.clientX - this.down.x) * scale;
      const dy = (event.clientY - this.down.y) * scale;
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
      this.target.copy(this.down.target).addScaledVector(right, -dx).addScaledVector(up, dy);
      this.invalidate(); return;
    }
    const printer = this.pick(event);
    if ((printer?.id ?? null) !== this.hoveredId) {
      this.hoveredId = printer?.id ?? null;
      this.options.canvas.style.cursor = printer ? 'pointer' : 'grab';
      this.options.onHoverPrinter(printer); this.updateSelection();
    }
  };
  private onDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.down = { x: event.clientX, y: event.clientY, target: this.target.clone() };
    this.dragged = false;
    this.options.canvas.setPointerCapture(event.pointerId);
  };
  private onUp = (event: PointerEvent): void => {
    if (!this.down) return;
    if (!this.dragged) this.selectPrinterById(this.pick(event)?.id ?? null);
    this.down = null;
    if (this.options.canvas.hasPointerCapture(event.pointerId)) this.options.canvas.releasePointerCapture(event.pointerId);
  };
  private onLeave = (): void => {
    this.hoveredId = null; this.options.onHoverPrinter(null); this.updateSelection();
  };
  private onCancel = (): void => { this.down = null; this.dragged = false; this.onLeave(); };
  private onVisibility = (): void => { if (document.hidden) this.stopTransition(); else this.invalidate(); };
  private onContextLost = (event: Event): void => {
    event.preventDefault(); this.lost = true; this.stopTransition();
    this.post?.dispose(); this.post = null;
    // Detach old-context disposal listeners before Three creates its new GPU state.
    this.scene.environment = null;
    this.environment?.dispose(); this.environment = null;
    this.key.shadow.dispose();
    this.key.shadow.map = null;
    this.key.shadow.mapPass = null;
    // Dispose GPU bindings while the old context is still lost. CPU geometry and
    // canvas/image textures remain intact and are uploaded again after restoration.
    this.scene.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
    disposeAssets([this.scene, ...(this.assets ? roomModels(this.assets) : [])]);
    this.selection.geometry.dispose();
    (this.selection.material as THREE.Material).dispose();
  };
  private onContextRestored = (): void => {
    if (this.disposed) return;
    this.lost = false;
    try {
      // Render targets have no CPU pixels to restore after losing the GPU context.
      this.createEnvironment();
      this.updatePostProcessing();
      if (this.renderer) this.renderer.shadowMap.needsUpdate = true;
      this.invalidate();
    } catch {
      this.options.onError?.('Не удалось восстановить 3D-комнату. Попробуйте открыть её ещё раз.');
    }
  };
  private bindEvents(): void {
    const canvas = this.options.canvas;
    canvas.addEventListener('pointermove', this.onMove); canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointerup', this.onUp); canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('webglcontextlost', this.onContextLost); canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    document.addEventListener('visibilitychange', this.onVisibility);
  }
  public handleResize = (): void => {
    if (!this.renderer || this.disposed) return;
    const { clientWidth: width, clientHeight: height } = this.options.container;
    if (!width || !height) return;
    this.stopTransition();
    this.renderer.setSize(width, height, false);
    this.updatePostProcessing();
    if (!this.selectedId) this.span = getOverviewSpan(this.layout, width / height, this.top);
    this.updateModels();
    this.invalidate();
  };
  private invalidate = (): void => {
    if (this.frame !== null || this.disposed || this.lost || !this.visible || document.hidden) return;
    this.frame = requestAnimationFrame(this.render);
  };
  private render = (): void => {
    this.frame = null;
    if (this.disposed || this.lost || !this.visible || document.hidden || !this.renderer) return;
    const half = this.span / 2;
    Object.assign(this.camera, { left: -half * this.aspect, right: half * this.aspect, top: half, bottom: -half });
    const distance = Math.max(this.layout.roomSize[0], this.layout.roomSize[2], 20);
    this.camera.far = distance * 5;
    this.camera.position.copy(this.target).add(this.top ? new THREE.Vector3(0, distance, .001) : new THREE.Vector3(distance, distance * .78, distance));
    this.camera.lookAt(this.target); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    if (this.post) this.post.render();
    else this.renderer.render(this.scene, this.camera);
    // Passive renderer diagnostics; useful for checking large real inventories.
    Object.assign(this.options.canvas.dataset, { frames: String(++this.frames), drawCalls: String(this.renderer.info.render.calls),
      triangles: String(this.renderer.info.render.triangles), geometries: String(this.renderer.info.memory.geometries), lod: this.lod ? 'low' : 'detail' });
  };
  public dispose(): void {
    this.disposed = true; this.stopTransition();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect(); this.intersectionObserver.disconnect();
    const canvas = this.options.canvas;
    canvas.removeEventListener('pointermove', this.onMove); canvas.removeEventListener('pointerdown', this.onDown);
    canvas.removeEventListener('pointerup', this.onUp); canvas.removeEventListener('pointerleave', this.onLeave);
    canvas.removeEventListener('pointercancel', this.onCancel);
    canvas.removeEventListener('webglcontextlost', this.onContextLost); canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.clearRoom();
    this.post?.dispose(); this.post = null;
    if (this.assets) disposeRoomAssets(this.assets);
    this.selection.geometry.dispose(); (this.selection.material as THREE.Material).dispose();
    for (const light of this.lights) light.dispose();
    this.environment?.dispose();
    this.renderer?.dispose(); this.renderer = null;
  }
}
