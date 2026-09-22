import * as THREE from 'three';
import type { Printer } from '../../../shared/types';
import {
  calculateRoomLayout,
  getFocusCameraTarget,
  type RoomLayoutConfig,
} from './layout';
import {
  createDioramaRoom,
  createWorkbench,
  createProceduralPrinter,
  disposeHierarchy,
} from './proceduralModels';
import type { InteractivePrinterGroup } from './types';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface PrinterRoomSceneOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  printers: Printer[];
  onSelectPrinter: (printer: Printer | null) => void;
  onHoverPrinter: (printer: Printer | null) => void;
}

export class PrinterRoomScene {
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private printers: Printer[];
  private onSelectPrinter: (printer: Printer | null) => void;
  private onHoverPrinter: (printer: Printer | null) => void;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private printerGroups: InteractivePrinterGroup[] = [];
  private layoutConfig: RoomLayoutConfig;
  private hoveredGroup: InteractivePrinterGroup | null = null;
  private selectedPrinterId: string | null = null;

  private envTexture: THREE.Texture | null = null;

  private currentCamPos: THREE.Vector3;
  private targetCamPos: THREE.Vector3;
  private currentCamLookAt: THREE.Vector3;
  private targetCamLookAt: THREE.Vector3;

  private isDragging = false;
  private pointerDownPos = { x: 0, y: 0 };
  private rafId: number | null = null;
  private isDisposed = false;

  constructor(options: PrinterRoomSceneOptions) {
    this.canvas = options.canvas;
    this.container = options.container;
    this.printers = options.printers;
    this.onSelectPrinter = options.onSelectPrinter;
    this.onHoverPrinter = options.onHoverPrinter;

    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);

    this.layoutConfig = calculateRoomLayout(this.printers);
    this.currentCamPos = new THREE.Vector3(...this.layoutConfig.overviewCameraPosition);
    this.targetCamPos = this.currentCamPos.clone();
    this.currentCamLookAt = new THREE.Vector3(...this.layoutConfig.overviewCameraTarget);
    this.targetCamLookAt = this.currentCamLookAt.clone();

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentCamLookAt);

    this.initRenderer(width, height);
    this.initLights();
    this.rebuildScene();
    this.bindEvents();
    this.startLoop();
  }

  private initRenderer(width: number, height: number): void {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(width, height);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;

      // Infinite dark studio background & soft depth fog (seamless infinite floor)
      const bgColor = new THREE.Color(0x0e0f14);
      this.scene.background = bgColor;
      this.scene.fog = new THREE.Fog(0x0e0f14, 15, 38);

      // Setup IBL Studio Environment for realistic material reflections
      try {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        pmrem.compileEquirectangularShader();
        const roomEnv = new RoomEnvironment();
        this.envTexture = pmrem.fromScene(roomEnv).texture;
        this.scene.environment = this.envTexture;
        pmrem.dispose();
      } catch (e) {
        console.warn('Could not initialize IBL RoomEnvironment', e);
      }
    } catch (e) {
      console.error('Failed to initialize WebGLRenderer for 3D Printers Room', e);
      this.renderer = null;
    }
  }

  private initLights(): void {
    // 1. Soft atmospheric ambient fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    // 2. Warm Key directional light with soft shadow mapping
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 1.4);
    keyLight.position.set(8, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.bias = -0.0003;

    const shadowExtent = 8;
    keyLight.shadow.camera.left = -shadowExtent;
    keyLight.shadow.camera.right = shadowExtent;
    keyLight.shadow.camera.top = shadowExtent;
    keyLight.shadow.camera.bottom = -shadowExtent;
    this.scene.add(keyLight);

    // 3. Warm Table Spotlights creating inviting pools of light on the walnut wood
    const spotBack = new THREE.SpotLight(0xffdfba, 2.0, 14, Math.PI / 4, 0.75);
    spotBack.position.set(-0.2, 5.8, -1.25);
    spotBack.target.position.set(-0.2, 0.85, -1.25);
    this.scene.add(spotBack);
    this.scene.add(spotBack.target);

    const spotFront = new THREE.SpotLight(0xffdfba, 2.0, 14, Math.PI / 4, 0.75);
    spotFront.position.set(-0.2, 5.8, 1.25);
    spotFront.target.position.set(-0.2, 0.85, 1.25);
    this.scene.add(spotFront);
    this.scene.add(spotFront.target);

    // 4. Cool cyan rim light from back-left for printer contours
    const rimLight = new THREE.DirectionalLight(0x0cb4e0, 0.45);
    rimLight.position.set(-8, 7, -8);
    this.scene.add(rimLight);
  }

  private rebuildScene(): void {
    // Clear previous dynamic meshes (excluding lights)
    const objectsToRemove: THREE.Object3D[] = [];
    this.scene.children.forEach((child) => {
      if (!(child instanceof THREE.Light)) {
        objectsToRemove.push(child);
      }
    });

    objectsToRemove.forEach((obj) => {
      this.scene.remove(obj);
      disposeHierarchy(obj);
    });

    this.printerGroups = [];
    this.layoutConfig = calculateRoomLayout(this.printers);

    // 1. Diorama Room Base
    const room = createDioramaRoom(this.layoutConfig.roomSize);
    this.scene.add(room);

    // 2. Workbenches
    this.layoutConfig.workbenches.forEach((bench) => {
      const desk = createWorkbench(...bench.size);
      desk.position.set(...bench.position);
      this.scene.add(desk);
    });

    // 3. Procedural CoreXY 3D Printers
    this.layoutConfig.stations.forEach((station) => {
      const printer = this.printers.find((p) => p.id === station.printerId);
      if (printer) {
        const printerMesh = createProceduralPrinter(printer, station);
        this.printerGroups.push(printerMesh);
        this.scene.add(printerMesh);
      }
    });

    // If no printer is selected, maintain overview framing
    if (!this.selectedPrinterId) {
      this.targetCamPos.set(...this.layoutConfig.overviewCameraPosition);
      this.targetCamLookAt.set(...this.layoutConfig.overviewCameraTarget);
    } else {
      const selectedStation = this.layoutConfig.stations.find((s) => s.printerId === this.selectedPrinterId);
      if (selectedStation) {
        const focus = getFocusCameraTarget(selectedStation.position);
        this.targetCamPos.set(...focus.position);
        this.targetCamLookAt.set(...focus.target);
      } else {
        this.resetFocus();
      }
    }
  }

  public updatePrinters(printers: Printer[]): void {
    if (this.isDisposed) return;
    this.printers = printers;
    this.rebuildScene();
  }

  public selectPrinterById(printerId: string | null): void {
    if (this.isDisposed) return;
    this.selectedPrinterId = printerId;
    if (!printerId) {
      this.resetFocus();
      return;
    }

    const station = this.layoutConfig.stations.find((s) => s.printerId === printerId);
    const printer = this.printers.find((p) => p.id === printerId);
    if (station && printer) {
      const focus = getFocusCameraTarget(station.position);
      this.targetCamPos.set(...focus.position);
      this.targetCamLookAt.set(...focus.target);
      this.onSelectPrinter(printer);
    }
  }

  public resetFocus(): void {
    if (this.isDisposed) return;
    this.selectedPrinterId = null;
    this.targetCamPos.set(...this.layoutConfig.overviewCameraPosition);
    this.targetCamLookAt.set(...this.layoutConfig.overviewCameraTarget);
    this.onSelectPrinter(null);
  }

  public zoomIn(): void {
    if (this.isDisposed) return;
    this.targetCamPos.multiplyScalar(0.88);
  }

  public zoomOut(): void {
    if (this.isDisposed) return;
    this.targetCamPos.multiplyScalar(1.14);
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (this.isDisposed) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.printerGroups, true);

    let nextHovered: InteractivePrinterGroup | null = null;
    if (intersects.length > 0) {
      let curr: THREE.Object3D | null = intersects[0].object;
      while (curr && curr !== this.scene) {
        if ((curr as InteractivePrinterGroup).userData?.isPrinter) {
          nextHovered = curr as InteractivePrinterGroup;
          break;
        }
        curr = curr.parent;
      }
    }

    if (nextHovered !== this.hoveredGroup) {
      this.hoveredGroup = nextHovered;
      this.container.style.cursor = nextHovered ? 'pointer' : 'default';
      this.onHoverPrinter(nextHovered ? nextHovered.userData.printer : null);
    }

    // Update target elevations: elevated on hover, on floor otherwise
    this.printerGroups.forEach((group) => {
      const isHovered = group === this.hoveredGroup;
      group.userData.targetElevation = isHovered ? 0.20 : 0.0;
    });
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.isDragging = false;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.isDisposed) return;
    const dx = Math.abs(e.clientX - this.pointerDownPos.x);
    const dy = Math.abs(e.clientY - this.pointerDownPos.y);
    if (dx > 5 || dy > 5) {
      // Considered a drag, not a click
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.printerGroups, true);

    if (intersects.length > 0) {
      let curr: THREE.Object3D | null = intersects[0].object;
      while (curr && curr !== this.scene) {
        if ((curr as InteractivePrinterGroup).userData?.isPrinter) {
          const group = curr as InteractivePrinterGroup;
          this.selectPrinterById(group.userData.printer.id);
          return;
        }
        curr = curr.parent;
      }
    } else {
      // Clicked on empty space: return to overview if previously zoomed in
      if (this.selectedPrinterId) {
        this.resetFocus();
      }
    }
  };

  private onPointerLeave = (): void => {
    if (this.isDisposed) return;
    this.mouse.set(-999, -999);
    if (this.hoveredGroup) {
      this.hoveredGroup = null;
      this.container.style.cursor = 'default';
      this.onHoverPrinter(null);
    }
    this.printerGroups.forEach((group) => {
      group.userData.targetElevation = 0.0;
    });
  };

  private bindEvents(): void {
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('resize', this.handleResize);
  }

  private unbindEvents(): void {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('resize', this.handleResize);
  }

  public handleResize = (): void => {
    if (this.isDisposed || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private startLoop(): void {
    const animate = () => {
      if (this.isDisposed) return;
      this.rafId = requestAnimationFrame(animate);

      // 1. Smooth camera lerping for cinematic focus zoom
      const camLerp = 0.08;
      this.currentCamPos.lerp(this.targetCamPos, camLerp);
      this.currentCamLookAt.lerp(this.targetCamLookAt, camLerp);
      this.camera.position.copy(this.currentCamPos);
      this.camera.lookAt(this.currentCamLookAt);

      // 2. Smooth printer levitation physics & soft contact shadow dynamics
      this.printerGroups.forEach((group) => {
        const ud = group.userData;
        const diff = ud.targetElevation - ud.currentElevation;
        ud.currentElevation += diff * 0.16;

        // Elevate printer body
        ud.bodyGroup.position.y = 0.015 + ud.currentElevation;

        // Adjust contact shadow under printer
        const elevRatio = Math.max(0, Math.min(1, ud.currentElevation / 0.20));
        const shadowScale = 1.0 + elevRatio * 0.18;
        ud.shadowMesh.scale.set(shadowScale, 1, shadowScale);
        const shadowMat = ud.shadowMesh.material as THREE.MeshBasicMaterial;
        if (shadowMat) {
          shadowMat.opacity = 0.45 - elevRatio * 0.22;
        }
      });

      // 3. Crisp direct rendering without bloom/glow
      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    this.rafId = requestAnimationFrame(animate);
  }

  public dispose(): void {
    this.isDisposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.unbindEvents();

    this.scene.children.forEach((child) => {
      disposeHierarchy(child);
    });

    if (this.envTexture) {
      this.envTexture.dispose();
      this.envTexture = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
