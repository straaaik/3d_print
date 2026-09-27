import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { ScenePresentation } from './scenePresentation';
import { animate, type AnimationPlaybackControls } from 'motion';
import { acquireAssets, releaseAssets, type Assets, type SceneBuild } from './sceneGeometry';
import { roomOrigin, findRoomAt, type FurnitureKind, snap, validFurniture, getFurnitureCollisionReason, snapFurnitureToNeighbors, pickWorkshopTarget, footprint, slotWorld, calculatePanDelta, calculateOrbitAngles, calculateRoomCameraFocus, calculateWheelShift, calculateZoomTarget, calculateGroupMove, resolvePlacementPosition, defaultRoomLabels, type Furniture, type Room, type Workshop, type Slot, type ModelKey, type Placement } from './model';
import { buildSpatialWorkshop, workshopBounds } from './spatialScene';
import { SpatialAuthoring, type SpatialCallbacks } from './spatialAuthoring';
import type { Filament, Printer } from '../../shared/types';

export interface HoverPlacementInfo {
  placementId: string;
  kind: 'printer' | 'filament';
  name: string;
  color?: string;
  isActive?: boolean;
  screenX: number;
  screenY: number;
}

export interface LabelScreenTransform {
  roomId: string;
  labelId: string;
  text: string;
  color: string;
  size: number;
  rotation: number;
  surface: 'floor' | 'north' | 'south' | 'west' | 'east';
  screenX: number;
  screenY: number;
  hudX: number;
  hudY: number;
  visible: boolean;
  isDraft?: boolean;
}

interface Options extends SpatialCallbacks {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  onSelect: (id: string, kind: 'furniture' | 'placement') => void;
  onMove: (id: string, x: number, z: number, roomId?: string) => void;
  onMovePlacement?: (placementId: string, targetSlotId: string) => void;
  onModelChange?: (placementId: string, model: ModelKey) => void;
  onRotate?: (id: string, rotation: number) => void;
  onDelete?: (id: string, kind: 'furniture' | 'placement') => void;
  onCamera: (camera: NonNullable<Room['camera']>) => void;
  onReady: () => void;
  onError: (message: string) => void;
  onHoverPlacement?: (info: HoverPlacementInfo | null) => void;
  onLabelTransform?: (transform: LabelScreenTransform | null) => void;
  onCollisionFeedback?: (reason: string) => void;
}

function createArrowGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.2, -0.06);
  shape.lineTo(0.04, -0.06);
  shape.lineTo(0.04, -0.15);
  shape.lineTo(0.26, 0);
  shape.lineTo(0.04, 0.15);
  shape.lineTo(0.04, 0.06);
  shape.lineTo(-0.2, 0.06);
  shape.closePath();
  const geom = new THREE.ShapeGeometry(shape);
  geom.rotateX(-Math.PI / 2);
  return geom;
}

function createDoubleArrowGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.13, 0);
  shape.lineTo(-0.06, 0.055);
  shape.lineTo(-0.06, 0.02);
  shape.lineTo(0.06, 0.02);
  shape.lineTo(0.06, 0.055);
  shape.lineTo(0.13, 0);
  shape.lineTo(0.06, -0.055);
  shape.lineTo(0.06, -0.02);
  shape.lineTo(-0.06, -0.02);
  shape.lineTo(-0.06, -0.055);
  shape.closePath();
  const geom = new THREE.ShapeGeometry(shape);
  geom.rotateX(-Math.PI / 2);
  return geom;
}

export interface WorkshopHotkeyContext {
  top: boolean;
  edit: boolean;
  selected: string | null;
  selectedFurnitureIds?: Set<string>;
  data: Workshop | null;
  options: Options;
  authoring: {
    cancelDraft: () => void;
    getSelectedLabelId: () => string | null;
    setSelectedLabel: (id: string | null) => void;
  };
  down?: any;
  dragged?: boolean;
  grid?: number;
  floor?: THREE.Plane;
  ray?: THREE.Raycaster;
  target?: THREE.Vector3;
  azimuth?: number;
  elevation?: number;
  highlightedFurnitureId?: string | null;
  onCancel?: () => void;
  select: (id: string | null) => void;
  moveCamera: (target: THREE.Vector3, span: number, azimuth?: number, elevation?: number, notify?: boolean) => void;
  workshopCenter: () => THREE.Vector3;
  overviewSpan: () => number;
  findAdjacentSlot?: (placementId: string, axis: 'x' | 'z', dir: number) => Slot | null;
  build?: {
    setFurnitureBorderColor?: (id: string, color: string) => void;
    previewFurniture?: (id: string, x: number, z: number) => void;
  } | null;
  invalidate?: () => void;
}

export function handleWorkshopKeyDown(ctx: WorkshopHotkeyContext, e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  const isInput =
    (typeof HTMLInputElement !== 'undefined' && target instanceof HTMLInputElement) ||
    (typeof HTMLTextAreaElement !== 'undefined' && target instanceof HTMLTextAreaElement) ||
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    Boolean(target?.isContentEditable);
  if (isInput) return false;

  if (e.key === 'Escape') {
    if (e.cancelable) e.preventDefault();
    ctx.onCancel?.();
    ctx.options.onSelect('', 'furniture');
    ctx.select(null);
    ctx.selectedFurnitureIds?.clear();
    ctx.authoring.cancelDraft();
    return true;
  }

  // Space key: Toggle 2D Top view / 3D Isometric view. If ctx.top, switch to 3D; if not ctx.top, switch to Top.
  if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
    if (e.cancelable) e.preventDefault();
    if (ctx.top) {
      ctx.top = false;
      ctx.moveCamera(ctx.workshopCenter(), ctx.overviewSpan(), Math.PI / 4, 16, true);
    } else {
      ctx.top = true;
      ctx.moveCamera(ctx.workshopCenter(), ctx.overviewSpan(), ctx.azimuth ?? Math.PI / 4, ctx.elevation ?? 16, true);
    }
    return true;
  }

  // Prevent browser page scrolling on PageUp, PageDown inside 3D workshop
  if (['PageUp', 'PageDown'].includes(e.key) && e.cancelable) {
    e.preventDefault();
  }

  // R key: If an object (furniture or placement) is selected in edit mode: rotate it by 90 degrees.
  if ((e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К' || e.code === 'KeyR') && ctx.edit && ctx.selected) {
    if (e.cancelable) e.preventDefault();
    let targetFurniture = ctx.data?.furniture.find((item) => item.id === ctx.selected);
    if (!targetFurniture && ctx.data) {
      const placement = ctx.data.placements.find((p) => p.id === ctx.selected);
      if (placement) {
        const slot = ctx.data.slots.find((s) => s.id === placement.slotId);
        targetFurniture = ctx.data.furniture.find((item) => item.id === (slot?.furnitureId ?? ctx.data?.slots.find(sl => sl.id === placement.slotId)?.furnitureId));
      }
    }
    if (targetFurniture && ctx.data) {
      const nextRot = (targetFurniture.rotation + 90) % 360;
      const next = { ...targetFurniture, rotation: nextRot };
      ctx.options.onRotate?.(targetFurniture.id, nextRot);
      const isValid = validFurniture(ctx.data, next);
      ctx.build?.setFurnitureBorderColor?.(targetFurniture.id, isValid ? '#38bdf8' : '#e87668');
    } else if (ctx.selected) {
      ctx.options.onRotate?.(ctx.selected, 90);
    }
    return true;
  }

  // G / M key: If furniture is selected in edit mode: start move mode / attach preview to mouse.
  if ((e.key === 'g' || e.key === 'G' || e.key === 'm' || e.key === 'M' || e.key === 'п' || e.key === 'П' || e.key === 'ь' || e.key === 'Ь' || e.code === 'KeyG' || e.code === 'KeyM') && ctx.edit && ctx.selected) {
    if (e.cancelable) e.preventDefault();
    const f = ctx.data?.furniture.find((item) => item.id === ctx.selected);
    if (f && ctx.data) {
      const fOrigin = roomOrigin(ctx.data, f.roomId);
      const fCenter = new THREE.Vector3(fOrigin.x + f.x, 0, fOrigin.z + f.z);
      const floorPlane = ctx.floor ?? new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const floorPt = ctx.ray?.ray.intersectPlane(floorPlane, new THREE.Vector3()) ?? fCenter.clone();
      ctx.down = {
        x: 0,
        y: 0,
        target: ctx.target ? ctx.target.clone() : new THREE.Vector3(),
        azimuth: ctx.azimuth ?? Math.PI / 4,
        furnitureId: f.id,
        start: floorPt.clone(),
        origin: fCenter.clone(),
        right: false,
      };
      ctx.dragged = true;
      if (ctx.options.canvas) ctx.options.canvas.style.cursor = 'grabbing';
      ctx.build?.setFurnitureBorderColor?.(f.id, '#38bdf8');
      ctx.invalidate?.();
    }
    return true;
  }

  // Delete / Backspace key: Delete selected furniture, placement, or label.
  if ((e.key === 'Delete' || e.key === 'Backspace' || e.code === 'Delete' || e.code === 'Backspace') && ctx.edit) {
    if (e.cancelable) e.preventDefault();
    const selectedLabelId = ctx.authoring.getSelectedLabelId();
    if (selectedLabelId && ctx.data) {
      for (const room of ctx.data.rooms) {
        const lbl = (room.labels ?? []).find((l) => l.id === selectedLabelId);
        if (lbl) {
          ctx.options.onDeleteLabel?.(room.id, selectedLabelId);
          ctx.authoring.setSelectedLabel(null);
          return true;
        }
      }
    }
    if (ctx.selectedFurnitureIds && ctx.selectedFurnitureIds.size > 1) {
      for (const id of ctx.selectedFurnitureIds) {
        ctx.options.onDelete?.(id, 'furniture');
      }
      ctx.selectedFurnitureIds.clear();
      ctx.select(null);
      return true;
    }
    if (ctx.selected) {
      const placement = ctx.data?.placements.find((p) => p.id === ctx.selected);
      if (placement) {
        ctx.options.onDelete?.(placement.id, 'placement');
        return true;
      }
      const f = ctx.data?.furniture.find((item) => item.id === ctx.selected);
      if (f) {
        ctx.options.onDelete?.(f.id, 'furniture');
        return true;
      }
      ctx.options.onDelete?.(ctx.selected, 'furniture');
      return true;
    }
    return true;
  }

  // Arrow keys: fine grid nudging
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && ctx.edit && ctx.selected) {
    if (e.cancelable) e.preventDefault();
    const axis = e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? 'x' : 'z';
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const placement = ctx.data?.placements.find((p) => p.id === ctx.selected);
    if (placement) {
      const nextSlot = ctx.findAdjacentSlot?.(placement.id, axis, dir);
      if (nextSlot) {
        ctx.options.onMovePlacement?.(placement.id, nextSlot.id);
      }
      return true;
    }
    const f = ctx.data?.furniture.find((item) => item.id === ctx.selected);
    if (f && ctx.data) {
      const grid = ctx.grid ?? 0.25;
      const step = grid * dir;
      const dx = axis === 'x' ? step : 0;
      const dz = axis === 'z' ? step : 0;

      // Multi-selection group movement
      if (ctx.selectedFurnitureIds && ctx.selectedFurnitureIds.size > 1 && ctx.selectedFurnitureIds.has(f.id)) {
        const result = calculateGroupMove(ctx.data, ctx.selectedFurnitureIds, dx, dz, grid);
        if (result.valid) {
          for (const item of result.moved) {
            ctx.options.onMove(item.id, item.x, item.z, item.roomId);
            ctx.build?.setFurnitureBorderColor?.(item.id, '#38bdf8');
          }
        } else {
          for (const gid of ctx.selectedFurnitureIds) {
            ctx.build?.setFurnitureBorderColor?.(gid, '#e87668');
          }
          ctx.options.onCollisionFeedback?.(result.reason ?? 'Недопустимое положение объекта');
          setTimeout(() => {
            for (const gid of ctx.selectedFurnitureIds!) {
              ctx.build?.setFurnitureBorderColor?.(gid, '#38bdf8');
            }
          }, 500);
        }
        return true;
      }

      const nextX = axis === 'x' ? snap(f.x + step, grid) : f.x;
      const nextZ = axis === 'z' ? snap(f.z + step, grid) : f.z;
      const next = { ...f, x: nextX, z: nextZ };
      ctx.options.onMove(f.id, nextX, nextZ, f.roomId);
      const isValid = validFurniture(ctx.data, next);
      ctx.build?.setFurnitureBorderColor?.(f.id, isValid ? '#38bdf8' : '#e87668');
    }
    return true;
  }

  return false;
}

/** Extends the prototype's demand rendering, orthographic framing and raycast controls
 * to user-authored layouts; shares its instanced model renderer and disposal helpers. */
export class WorkshopScene {
  private authoring: SpatialAuthoring;
  private touches = new Map<number, {x:number;y:number}>();
  private pinch: {distance:number;span:number}|null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
  private renderer: THREE.WebGLRenderer;
  private presentation: ScenePresentation;
  private environment: THREE.WebGLRenderTarget | null = null;
  private environmentRevision = 0;
  private assets: Assets | null = null;
  private build: SceneBuild | null = null;
  private data: Workshop | null = null;
  private room: Room | null = null;
  private filaments: Filament[] = [];
  private printers: Printer[] = [];
  private activePrinterIds: Set<string> = new Set();
  private selectedPrinterPlacementId: string | null = null;
  private target = new THREE.Vector3(0, 0.7, 0);
  private span = 16;
  private azimuth = Math.PI / 4;
  private elevation = 16;
  private top = false;
  private customView = false;
  private edit = false;
  private grid = 0.25;
  private invertControls = true;
  private frame: number | null = null;
  private disposed = false;
  private lost = false;
  private observer: ResizeObserver;
  private transition: AnimationPlaybackControls | null = null;
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private selected: string | null = null;
  public selectedFurnitureIds = new Set<string>();
  private highlightedFurnitureId: string | null = null;
  private down: {
    button?: number;
    x: number;
    y: number;
    target: THREE.Vector3;
    azimuth: number;
    furnitureId?: string;
    placementId?: string;
    downHitPlacementId?: string;
    downHitFurnitureId?: string;
    start: THREE.Vector3;
    origin: THREE.Vector3;
    right?: boolean;
    orbit?: boolean;
    elevation?: number;
    gizmoAxis?: 'x' | 'z';
    gizmoDir?: 1 | -1;
    gizmoAction?: string;
    initialWidth?: number;
    currentWidth?: number;
    isValidResize?: boolean;
  } | null = null;
  private dragged = false;
  private key: THREE.DirectionalLight;
  private saveCameraTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSceneSignature = '';

  // 3D Search highlight beacon (pulsing floor beacon for found printer)
  public searchBeaconGroup = new THREE.Group();
  private beaconRingMesh!: THREE.Mesh;
  private beaconMaterial!: THREE.MeshBasicMaterial;
  private beaconRaf: number | null = null;
  private beaconTimer: ReturnType<typeof setTimeout> | null = null;


  // Placement hover interactive system (smooth lift and scale on 3D printer and filament models)
  private hoveredPlacementId: string | null = null;
  private currentHoverInfo: HoverPlacementInfo | null = null;
  private hoverStates = new Map<string, { current: number; target: number }>();
  private hoverRaf: number | null = null;

  // In-scene floor edit gizmo (move arrows, rotation button, delete button, resize length button)
  private gizmoGroup = new THREE.Group();
  private gizmoMeshes: THREE.Mesh[] = [];
  private hoveredGizmo: THREE.Mesh | null = null;
  private arrowPosX!: THREE.Mesh;
  private arrowNegX!: THREE.Mesh;
  private arrowPosZ!: THREE.Mesh;
  private arrowNegZ!: THREE.Mesh;
  private rotateBtnGroup = new THREE.Group();
  private rotateBtn!: THREE.Mesh;
  private rotateIcon!: THREE.Mesh;
  private deleteBtnGroup = new THREE.Group();
  private deleteBtn!: THREE.Mesh;
  private deleteCross1!: THREE.Mesh;
  private deleteCross2!: THREE.Mesh;
  private resizeBtnGroup = new THREE.Group();
  private resizeBtn!: THREE.Mesh;
  private resizeIcon!: THREE.Mesh;
  private gizmoMatArrow = new THREE.MeshBasicMaterial({ color: '#38bdf8', depthTest: false });
  private gizmoMatRotate = new THREE.MeshBasicMaterial({ color: '#818cf8', depthTest: false });
  private gizmoMatDelete = new THREE.MeshBasicMaterial({ color: '#ef4444', depthTest: false });
  private gizmoMatResize = new THREE.MeshBasicMaterial({ color: '#0ea5e9', depthTest: false });
  private gizmoMatResizeHover = new THREE.MeshBasicMaterial({ color: '#38bdf8', depthTest: false });
  private gizmoMatWhite = new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false });
  private gizmoMatHover = new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false });
  private gizmoMatDeleteHover = new THREE.MeshBasicMaterial({ color: '#fca5a5', depthTest: false });

  // Inspection lighting rig for selected printer (active when reading info about printer)
  private inspectionRig = new THREE.Group();
  private inspectionChamberLight!: THREE.PointLight;
  private inspectionSpotlight!: THREE.SpotLight;
  private inspectionSpotTarget = new THREE.Object3D();

  constructor(private options: Options) {
    this.scene.background = new THREE.Color('#101923');
    this.scene.add(new THREE.HemisphereLight('#dce5f4', '#4d4852', .65));
    this.key = new THREE.DirectionalLight('#fff0dd', 2.8);
    this.key.position.set(-3, 12, 7);
    this.key.castShadow = true;
    const shadowSize = options.container.clientWidth > 900 ? 2048 : 1024;
    this.key.shadow.mapSize.set(shadowSize, shadowSize);
    this.key.shadow.normalBias = 0.014;
    this.key.shadow.bias = -0.00015;
    this.key.shadow.radius = 2.5;
    Object.assign(this.key.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, far: 80 });
    this.scene.add(this.key);
    const fill = new THREE.DirectionalLight('#c5d7ff', .55);
    fill.position.set(8, 7, -4);
    this.scene.add(fill);

    this.renderer = new THREE.WebGLRenderer({ canvas: options.canvas, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .9;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.prepareEnvironment();
    this.presentation = new ScenePresentation(this.renderer, this.scene, this.camera);
    this.authoring = new SpatialAuthoring(options.container,options.canvas,this.scene,this.camera,options,this.invalidate);
    this.renderer.info.autoReset = false;
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(options.container);
    const c = options.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onCancel);
    c.addEventListener('pointerleave', this.onLeave);
    c.addEventListener('mousedown', this.onMouseDown);
    c.addEventListener('auxclick', this.onAuxClick);
    c.addEventListener('contextmenu', this.onMenu);
    c.addEventListener('webglcontextlost', this.onLost);
    c.addEventListener('webglcontextrestored', this.onRestored);

    options.container.addEventListener('wheel', this.onWheel, { passive: false });
    options.container.addEventListener('touchmove', this.onTouchMove, { passive: false });
    options.container.addEventListener('gesturestart', this.onGesture);
    options.container.addEventListener('gesturechange', this.onGesture);
    options.container.addEventListener('gestureend', this.onGesture);
    options.container.addEventListener('contextmenu', this.onMenu);

    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('keydown', this.onKeyDown);

    // Setup in-scene floor edit gizmo (move arrows, rotation button, delete button)
    const arrowGeom = createArrowGeometry();
    const circleGeom = new THREE.CircleGeometry(0.22, 28);
    circleGeom.rotateX(-Math.PI / 2);
    const ringGeom = new THREE.RingGeometry(0.1, 0.15, 24, 1, 0, 1.5 * Math.PI);
    ringGeom.rotateX(-Math.PI / 2);
    const crossGeom = new THREE.PlaneGeometry(0.22, 0.045);
    crossGeom.rotateX(-Math.PI / 2);

    this.arrowPosX = new THREE.Mesh(arrowGeom, this.gizmoMatArrow);
    this.arrowPosX.userData = { isGizmo: true, action: 'move', axis: 'x', dir: 1 };
    this.arrowPosX.renderOrder = 999;

    this.arrowNegX = new THREE.Mesh(arrowGeom, this.gizmoMatArrow);
    this.arrowNegX.rotation.y = Math.PI;
    this.arrowNegX.userData = { isGizmo: true, action: 'move', axis: 'x', dir: -1 };
    this.arrowNegX.renderOrder = 999;

    this.arrowPosZ = new THREE.Mesh(arrowGeom, this.gizmoMatArrow);
    this.arrowPosZ.rotation.y = -Math.PI / 2;
    this.arrowPosZ.userData = { isGizmo: true, action: 'move', axis: 'z', dir: 1 };
    this.arrowPosZ.renderOrder = 999;

    this.arrowNegZ = new THREE.Mesh(arrowGeom, this.gizmoMatArrow);
    this.arrowNegZ.rotation.y = Math.PI / 2;
    this.arrowNegZ.userData = { isGizmo: true, action: 'move', axis: 'z', dir: -1 };
    this.arrowNegZ.renderOrder = 999;

    // Rotate button
    this.rotateBtn = new THREE.Mesh(circleGeom, this.gizmoMatRotate);
    this.rotateBtn.userData = { isGizmo: true, action: 'rotate' };
    this.rotateBtn.renderOrder = 998;
    this.rotateIcon = new THREE.Mesh(ringGeom, this.gizmoMatWhite);
    this.rotateIcon.position.y = 0.001;
    this.rotateIcon.userData = { isGizmo: true, action: 'rotate' };
    this.rotateIcon.renderOrder = 999;
    this.rotateBtnGroup.add(this.rotateBtn, this.rotateIcon);

    // Delete button
    this.deleteBtn = new THREE.Mesh(circleGeom, this.gizmoMatDelete);
    this.deleteBtn.userData = { isGizmo: true, action: 'delete' };
    this.deleteBtn.renderOrder = 998;
    this.deleteCross1 = new THREE.Mesh(crossGeom, this.gizmoMatWhite);
    this.deleteCross1.position.y = 0.001;
    this.deleteCross1.rotation.y = Math.PI / 4;
    this.deleteCross1.userData = { isGizmo: true, action: 'delete' };
    this.deleteCross1.renderOrder = 999;
    this.deleteCross2 = new THREE.Mesh(crossGeom, this.gizmoMatWhite);
    this.deleteCross2.position.y = 0.001;
    this.deleteCross2.rotation.y = -Math.PI / 4;
    this.deleteCross2.userData = { isGizmo: true, action: 'delete' };
    this.deleteCross2.renderOrder = 999;
    this.deleteBtnGroup.add(this.deleteBtn, this.deleteCross1, this.deleteCross2);

    // Length Resize button (styled identically to rotate and delete buttons)
    const resizeGeom = createDoubleArrowGeometry();
    this.resizeBtn = new THREE.Mesh(circleGeom, this.gizmoMatResize);
    this.resizeBtn.userData = { isGizmo: true, action: 'resize' };
    this.resizeBtn.renderOrder = 998;
    this.resizeIcon = new THREE.Mesh(resizeGeom, this.gizmoMatWhite);
    this.resizeIcon.position.y = 0.001;
    this.resizeIcon.userData = { isGizmo: true, action: 'resize' };
    this.resizeIcon.renderOrder = 999;
    this.resizeBtnGroup.add(this.resizeBtn, this.resizeIcon);

    this.gizmoGroup.add(
      this.arrowPosX,
      this.arrowNegX,
      this.arrowPosZ,
      this.arrowNegZ,
      this.rotateBtnGroup,
      this.deleteBtnGroup,
      this.resizeBtnGroup
    );
    this.gizmoMeshes = [
      this.arrowPosX,
      this.arrowNegX,
      this.arrowPosZ,
      this.arrowNegZ,
      this.rotateBtn,
      this.rotateIcon,
      this.deleteBtn,
      this.deleteCross1,
      this.deleteCross2,
      this.resizeBtn,
      this.resizeIcon,
    ];
    this.gizmoGroup.visible = false;
    this.scene.add(this.gizmoGroup);

    // Setup inspection lighting rig for printer examination (illuminates only the printer)
    this.inspectionChamberLight = new THREE.PointLight('#ffffff', 0, 1.4, 2);
    this.inspectionChamberLight.castShadow = false;

    this.inspectionSpotlight = new THREE.SpotLight('#f4f8ff', 0, 3.2, Math.PI / 7, 0.5, 1.8);
    this.inspectionSpotlight.castShadow = false;
    this.inspectionSpotlight.target = this.inspectionSpotTarget;

    this.inspectionRig.add(
      this.inspectionChamberLight,
      this.inspectionSpotlight,
      this.inspectionSpotTarget
    );
    this.inspectionRig.visible = true;
    this.scene.add(this.inspectionRig);

    // Setup 3D Search Highlight Beacon (pulsing floor ring)
    const beaconGeom = new THREE.RingGeometry(0.35, 0.58, 36);
    beaconGeom.rotateX(-Math.PI / 2);
    this.beaconMaterial = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.beaconRingMesh = new THREE.Mesh(beaconGeom, this.beaconMaterial);
    this.beaconRingMesh.renderOrder = 998;
    this.searchBeaconGroup.add(this.beaconRingMesh);
    this.searchBeaconGroup.visible = false;
    this.scene.add(this.searchBeaconGroup);

    void acquireAssets()
      .then((assets) => {
        if (this.disposed) return;
        this.assets = assets;
        this.authoring.setAssets(assets);
        this.rebuild();
        try {
          this.renderer.compile(this.scene, this.camera);
        } catch {}
        options.onReady();
      })
      .catch((error: unknown) => {
        console.error('Workshop scene initialization failed', error);
        if (!this.disposed) options.onError('Не удалось загрузить 3D-модели. Перезагрузите страницу.');
      });
    this.resize();
  }

  onKeyDown = (e: KeyboardEvent) => {
    handleWorkshopKeyDown(this as unknown as WorkshopHotkeyContext, e);
  };

  public triggerSearchBeacon(placementId: string) {
    if (!placementId) return;

    let pos: THREE.Vector3 | null =
      this.build?.placements.get(placementId)?.pos?.clone() ??
      this.build?.positions.get(placementId)?.clone() ??
      null;

    if (!pos && this.data) {
      const resolved = resolvePlacementPosition(this.data, placementId);
      if (resolved) {
        pos = new THREE.Vector3(resolved.x, resolved.y, resolved.z);
      }
    }

    if (!pos) return;

    this.searchBeaconGroup.position.set(pos.x, 0.02, pos.z);
    this.searchBeaconGroup.scale.set(1, 1, 1);
    this.beaconMaterial.opacity = 0.8;
    this.searchBeaconGroup.visible = true;

    const target = new THREE.Vector3(pos.x, pos.y ? pos.y + 0.32 : 0.7, pos.z);
    const span = this.top ? 2.2 : 1.5;
    const placementMeta = this.build?.placements.get(placementId);
    const azimuth = placementMeta ? this.getSafeInspectionAzimuth(target, placementMeta.f.rotation) : this.azimuth;
    this.moveCamera(target, span, azimuth, 20, false);

    if (this.beaconRaf !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.beaconRaf);
      this.beaconRaf = null;
    }
    if (this.beaconTimer !== null) {
      clearTimeout(this.beaconTimer);
      this.beaconTimer = null;
    }

    const duration = 3500;
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const tick = () => {
      if (this.disposed) return;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      const pulse = 1 + 0.22 * Math.sin(progress * Math.PI * 6);
      this.searchBeaconGroup.scale.set(pulse, 1, pulse);

      this.beaconMaterial.opacity = Math.max(0, 0.8 * (1 - progress));
      this.invalidate();

      if (progress < 1) {
        if (typeof requestAnimationFrame !== 'undefined') {
          this.beaconRaf = requestAnimationFrame(tick);
        } else {
          this.beaconTimer = setTimeout(tick, 16);
        }
      } else {
        this.searchBeaconGroup.visible = false;
        this.beaconRaf = null;
        this.beaconTimer = null;
        this.invalidate();
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      this.beaconRaf = requestAnimationFrame(tick);
    } else {
      this.beaconTimer = setTimeout(tick, 16);
    }

    this.invalidate();
  }

  public findAdjacentSlot(placementId: string, axis: 'x' | 'z', dir: number): Slot | null {
    if (!this.data) return null;
    const placement = this.data.placements.find((p) => p.id === placementId);
    if (!placement) return null;
    const currentSlot = this.data.slots.find((s) => s.id === placement.slotId);
    if (!currentSlot) return null;
    const currentFurn = this.data.furniture.find((f) => f.id === currentSlot.furnitureId);
    if (!currentFurn) return null;

    const currentOrigin=roomOrigin(this.data,currentFurn.roomId);
    const [localX,cy,localZ]=slotWorld(currentFurn,currentSlot),cx=localX+currentOrigin.x,cz=localZ+currentOrigin.z;

    // Candidates in same room and same kind
    const candidateSlots: { slot: Slot; distSq: number }[] = [];
    for (const slot of this.data.slots) {
      if (slot.id === currentSlot.id || slot.kind !== placement.kind) continue;
      const furn = this.data.furniture.find((f) => f.id === slot.furnitureId);
      if (!furn) continue;
      const origin=roomOrigin(this.data,furn.roomId);
      const [lx,sy,lz]=slotWorld(furn,slot),sx=lx+origin.x,sz=lz+origin.z;
      const dx = sx - cx;
      const dz = sz - cz;
      const dot = axis === 'x' ? dx * dir : dz * dir;
      if (dot > 0.05) {
        const distSq = dx * dx + (sy - cy) * (sy - cy) + dz * dz;
        candidateSlots.push({ slot, distSq });
      }
    }

    if (candidateSlots.length > 0) {
      candidateSlots.sort((a, b) => a.distSq - b.distSq);
      return candidateSlots[0].slot;
    }

    // Fallback: If on the same furniture, cycle to adjacent slot by index
    const furnSlots = this.data.slots
      .filter((s) => s.furnitureId === currentFurn.id && s.kind === placement.kind)
      .sort((a, b) => a.index - b.index);
    if (furnSlots.length > 1) {
      const curIdx = furnSlots.findIndex((s) => s.id === currentSlot.id);
      if (curIdx !== -1) {
        const nextIdx = (curIdx + dir + furnSlots.length) % furnSlots.length;
        return furnSlots[nextIdx];
      }
    }

    return null;
  }

  public findNearestSlot(
    placementId: string,
    point: THREE.Vector3
  ): { slot: Slot; worldPos: THREE.Vector3; rotationY: number } | null {
    if (!this.data) return null;
    const placement = this.data.placements.find((p) => p.id === placementId);
    if (!placement) return null;

    let best: { slot: Slot; worldPos: THREE.Vector3; rotationY: number; distSq: number } | null = null;
    for (const slot of this.data.slots) {
      if (slot.kind !== placement.kind) continue;
      const furn = this.data.furniture.find((f) => f.id === slot.furnitureId);
      if (!furn) continue;
      const origin=roomOrigin(this.data,furn.roomId);
      const [lx,sy,lz]=slotWorld(furn,slot),sx=lx+origin.x,sz=lz+origin.z;
      const dx = sx - point.x;
      const dz = sz - point.z;
      const distSq = dx * dx + dz * dz;
      if (!best || distSq < best.distSq) {
        best = {
          slot,
          worldPos: new THREE.Vector3(sx, sy, sz),
          rotationY: (furn.rotation * Math.PI) / 180,
          distSq,
        };
      }
    }
    return best&&best.distSq<2.25?best:null;
  }

  private updateGizmoForPlacementPosition(pos: THREE.Vector3, placementId: string) {
    if (!this.edit) {
      this.hideGizmo();
      return;
    }
    const px = pos.x;
    const py = pos.y + 0.015;
    const pz = pos.z;
    const radius = 0.42;
    const btnRadius = 0.36;

    this.arrowPosX.position.set(px + radius, py, pz);
    this.arrowPosX.userData.furnitureId = undefined;
    this.arrowPosX.userData.placementId = placementId;

    this.arrowNegX.position.set(px - radius, py, pz);
    this.arrowNegX.userData.furnitureId = undefined;
    this.arrowNegX.userData.placementId = placementId;

    this.arrowPosZ.position.set(px, py, pz + radius);
    this.arrowPosZ.userData.furnitureId = undefined;
    this.arrowPosZ.userData.placementId = placementId;

    this.arrowNegZ.position.set(px, py, pz - radius);
    this.arrowNegZ.userData.furnitureId = undefined;
    this.arrowNegZ.userData.placementId = placementId;

    this.rotateBtnGroup.position.set(px + btnRadius, py, pz + btnRadius);
    this.rotateBtn.userData.furnitureId = undefined;
    this.rotateBtn.userData.placementId = placementId;
    this.rotateIcon.userData.furnitureId = undefined;
    this.rotateIcon.userData.placementId = placementId;

    this.deleteBtnGroup.position.set(px - btnRadius, py, pz + btnRadius);
    this.deleteBtn.userData.furnitureId = undefined;
    this.deleteBtn.userData.placementId = placementId;
    this.deleteCross1.userData.furnitureId = undefined;
    this.deleteCross1.userData.placementId = placementId;
    this.deleteCross2.userData.furnitureId = undefined;
    this.deleteCross2.userData.placementId = placementId;

    this.resizeBtnGroup.visible = false;
    this.gizmoGroup.visible = true;
    this.invalidate();
  }

  private updateGizmoForPlacement(placementId: string) {
    const meta = this.build?.placements.get(placementId);
    if (!meta) return;
    this.updateGizmoForPlacementPosition(meta.pos, placementId);
  }

  private updateGizmo(f: Furniture) {
    if (!this.edit) {
      this.hideGizmo();
      return;
    }
    const origin=this.data?roomOrigin(this.data,f.roomId):{x:0,z:0};
    f={...f,x:f.x+origin.x,z:f.z+origin.z};
    const { w, d } = footprint(f);
    const arrowMargin = 0.45;
    const btnMargin = 0.38;

    this.arrowPosX.position.set(f.x + w / 2 + arrowMargin, 0.015, f.z);
    this.arrowPosX.userData.furnitureId = f.id;
    this.arrowPosX.userData.placementId = undefined;

    this.arrowNegX.position.set(f.x - w / 2 - arrowMargin, 0.015, f.z);
    this.arrowNegX.userData.furnitureId = f.id;
    this.arrowNegX.userData.placementId = undefined;

    this.arrowPosZ.position.set(f.x, 0.015, f.z + d / 2 + arrowMargin);
    this.arrowPosZ.userData.furnitureId = f.id;
    this.arrowPosZ.userData.placementId = undefined;

    this.arrowNegZ.position.set(f.x, 0.015, f.z - d / 2 - arrowMargin);
    this.arrowNegZ.userData.furnitureId = f.id;
    this.arrowNegZ.userData.placementId = undefined;

    this.rotateBtnGroup.position.set(f.x + w / 2 + btnMargin, 0.015, f.z + d / 2 + btnMargin);
    this.rotateBtn.userData.furnitureId = f.id;
    this.rotateBtn.userData.placementId = undefined;
    this.rotateIcon.userData.furnitureId = f.id;
    this.rotateIcon.userData.placementId = undefined;

    this.deleteBtnGroup.position.set(f.x - w / 2 - btnMargin, 0.015, f.z + d / 2 + btnMargin);
    this.deleteBtn.userData.furnitureId = f.id;
    this.deleteBtn.userData.placementId = undefined;
    this.deleteCross1.userData.furnitureId = f.id;
    this.deleteCross1.userData.placementId = undefined;
    this.deleteCross2.userData.furnitureId = f.id;
    this.deleteCross2.userData.placementId = undefined;

    const isLengthResizable = f.kind === 'table' || f.kind === 'printer_rack' || f.kind === 'filament_rack';
    this.resizeBtnGroup.visible = isLengthResizable;
    if (isLengthResizable) {
      this.resizeBtnGroup.position.set(f.x + w / 2 + btnMargin, 0.015, f.z - d / 2 - btnMargin);
      this.resizeBtn.userData.furnitureId = f.id;
      this.resizeBtn.userData.placementId = undefined;
      this.resizeIcon.userData.furnitureId = f.id;
      this.resizeIcon.userData.placementId = undefined;
    }

    this.gizmoGroup.visible = true;
    this.invalidate();
  }

  private hideGizmo() {
    this.gizmoGroup.visible = false;
    this.setHoveredGizmo(null);
    this.invalidate();
  }

  private setHoveredGizmo(mesh: THREE.Mesh | null) {
    if (this.hoveredGizmo === mesh) return;
    if (this.hoveredGizmo) {
      const u = this.hoveredGizmo.userData;
      if (u.action === 'move') this.hoveredGizmo.material = this.gizmoMatArrow;
      else if (u.action === 'rotate') this.rotateBtn.material = this.gizmoMatRotate;
      else if (u.action === 'delete') this.deleteBtn.material = this.gizmoMatDelete;
      else if (u.action === 'resize') this.resizeBtn.material = this.gizmoMatResize;
    }
    this.hoveredGizmo = mesh;
    if (mesh) {
      const u = mesh.userData;
      if (u.action === 'move') mesh.material = this.gizmoMatHover;
      else if (u.action === 'rotate') this.rotateBtn.material = this.gizmoMatHover;
      else if (u.action === 'delete') this.deleteBtn.material = this.gizmoMatDeleteHover;
      else if (u.action === 'resize') this.resizeBtn.material = this.gizmoMatResizeHover;
    }
    this.invalidate();
  }

  private getSceneSignature(
    data: Workshop,
    filaments: Filament[],
    printers: Printer[],
    activePrinterIds: Set<string>
  ): string {
    const rSig = data.rooms.map(r => `${r.id}:${r.width}x${r.depth}:${r.attachment?.roomId ?? ''}_${r.attachment?.side ?? ''}:${(r.labels ?? []).map(l => `${l.id}_${l.u}_${l.v}_${l.text}_${l.color}_${l.size}_${l.rotation ?? 0}`).join(';')}`).join('|');
    const fSig = data.furniture.map(f => `${f.id}:${f.roomId}:${f.kind}:${f.x}:${f.z}:${f.rotation}:${f.width}:${f.depth}:${f.height}:${f.levels}:${f.columns}`).join('|');
    const pSig = data.placements.map(p => `${p.id}:${p.slotId}:${p.kind}:${p.entityId}:${p.model ?? ''}`).join('|');
    const aSig = Array.from(activePrinterIds).sort().join(',');
    const filSig = filaments.map(f => `${f.id}:${f.color}`).join('|');
    const prSig = printers.map(p => `${p.id}:${p.model_3d ?? ''}`).join('|');
    return `${rSig}#${fSig}#${pSig}#${aSig}#${filSig}#${prSig}`;
  }

  private saveCameraDebounced(delay = 500) {
    if (this.saveCameraTimer !== null) {
      clearTimeout(this.saveCameraTimer);
    }
    this.saveCameraTimer = setTimeout(() => {
      this.saveCameraTimer = null;
      this.saveCamera();
    }, delay);
  }

  update(
    data: Workshop,
    room: Room,
    filaments: Filament[],
    printers: Printer[] = [],
    activePrinterIds: Set<string> = new Set()
  ) {
    const roomChanged = !this.room || this.room.id !== room.id;
    const structureChanged = this.data && JSON.stringify(this.data.rooms.map(r => [r.id, r.width, r.depth, r.attachment])) !== JSON.stringify(data.rooms.map(r => [r.id, r.width, r.depth, r.attachment]));
    const sig = this.getSceneSignature(data, filaments, printers, activePrinterIds);
    const sceneChanged = !this.build || sig !== this.lastSceneSignature;
    this.lastSceneSignature = sig;

    this.data = data;
    this.room = room;
    this.filaments = filaments;
    this.printers = printers;
    this.activePrinterIds = activePrinterIds;

    this.authoring.update(
      this.data,
      this.edit,
      this.selected,
      this.room?.id ?? null,
      this.authoring.getSelectedLabelId()
    );

    if (sceneChanged) {
      this.rebuild();
    } else {
      this.build?.setSelectedRoom?.(this.edit ? this.room?.id : undefined);
    }

    if (roomChanged) {
      this.customView = false;
      this.selectedFurnitureIds.clear();
      this.highlightedFurnitureId = null;
      this.hideGizmo();
      if (room) {
        const focus = calculateRoomCameraFocus(this.data, room);
        const targetAzimuth = room.camera?.azimuth ?? this.azimuth;
        if (room.camera?.top !== undefined) {
          this.top = room.camera.top;
        }
        this.moveCamera(
          new THREE.Vector3(focus.target.x, focus.target.y, focus.target.z),
          focus.span,
          targetAzimuth,
          focus.elevation,
          false
        );
      } else {
        this.top = false;
        const target = this.workshopCenter();
        const span = this.overviewSpan() * .88;
        this.moveCamera(target, span, Math.PI / 4, 16, false);
      }
    } else {
      if (structureChanged) {
        this.target.copy(this.workshopCenter());
        this.span = this.overviewSpan() * (this.edit ? 1.12 : 1);
      }
      if (this.highlightedFurnitureId) {
        this.build?.setFurnitureBorderColor(this.highlightedFurnitureId, '#38bdf8');
      }
      for (const fid of this.selectedFurnitureIds) {
        this.build?.setFurnitureBorderColor(fid, '#38bdf8');
      }
      if (this.edit && this.selected) {
        const f = data.furniture.find((item) => item.id === this.selected);
        if (f) {
          this.updateGizmo(f);
        } else {
          const placement = data.placements.find((p) => p.id === this.selected);
          if (placement) {
            this.updateGizmoForPlacement(placement.id);
          } else {
            this.hideGizmo();
          }
        }
      } else {
        this.hideGizmo();
      }
    }
    this.invalidate();
  }

  /**
   * Checks whether the camera at target + 26*(sin(a), ..., cos(a)) stays safely away
   * from the rear wall (z = -room.depth/2) and left wall (x = -room.width/2).
   */
  private isAzimuthSafe(target: THREE.Vector3, azimuth: number, margin = 1.0): boolean {
    if (!this.room) return true;
    const origin=this.data?roomOrigin(this.data,this.room.id):{x:0,z:0};
    const minSafeX = origin.x-this.room.width / 2 + margin;
    const minSafeZ = origin.z-this.room.depth / 2 + margin;
    const camX = target.x + 26 * Math.sin(azimuth);
    const camZ = target.z + 26 * Math.cos(azimuth);
    return camX >= minSafeX && camZ >= minSafeZ;
  }

  /**
   * Returns a safe azimuth that never places the camera behind room walls.
   * If desiredAzimuth is safe, returns it; otherwise clamps/selects the closest safe angle
   * from the open front-right quadrant (0° to 90°).
   */
  private getSafeAzimuth(target: THREE.Vector3, desiredAzimuth: number): number {
    if (!this.room) return desiredAzimuth;

    if (this.isAzimuthSafe(target, desiredAzimuth, 1.2)) {
      return desiredAzimuth;
    }

    const safeOptions = [
      Math.PI / 4, // 45° standard isometric
      Math.PI / 3, // 60°
      Math.PI / 6, // 30°
      0.35,        // ~20°
      Math.PI / 2 - 0.35, // ~70°
    ];

    let best = Math.PI / 4;
    let minDiff = Infinity;
    for (const opt of safeOptions) {
      if (this.isAzimuthSafe(target, opt, 1.2)) {
        const diff = Math.abs(((opt - desiredAzimuth + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (diff < minDiff) {
          minDiff = diff;
          best = opt;
        }
      }
    }
    return best;
  }

  /**
   * Calculates the best safe viewing angle for inspecting an object.
   * If the object faces into the room, views it from front / 3/4 front.
   * If the object is turned facing a wall, views it from the open room side without crossing walls.
   */
  private getSafeInspectionAzimuth(target: THREE.Vector3, objectRotationDeg: number): number {
    const frontRad = (objectRotationDeg * Math.PI) / 180;

    // Prefer a nice 3/4 front view if safe, or direct front if safe
    const preferredCandidates = [
      frontRad + Math.PI / 6, // 30° offset from front
      frontRad - Math.PI / 6,
      frontRad,
    ];

    for (const cand of preferredCandidates) {
      if (this.isAzimuthSafe(target, cand, 1.2)) {
        return cand;
      }
    }

    // Object is turned facing a wall: pick closest safe angle from open quadrant
    return this.getSafeAzimuth(target, frontRad);
  }

  private showPrinterInspectionLight(placementMeta: { f: Furniture; s: Slot; p: Placement; pos: THREE.Vector3 }) {
    // Внутренние лампы и резкие прожекторы отключены: используется аккуратный контур 3D-модели
    this.inspectionChamberLight.intensity = 0;
    this.inspectionSpotlight.intensity = 0;
    this.selectedPrinterPlacementId = placementMeta.p.id;
    this.build?.setPrinterOutline?.(placementMeta.p.id, 'selected');
    this.invalidate();
  }

  private hidePrinterInspectionLight() {
    if (this.selectedPrinterPlacementId && this.selected !== this.selectedPrinterPlacementId) {
      this.build?.setPrinterOutline?.(this.selectedPrinterPlacementId, null);
      this.selectedPrinterPlacementId = null;
    }
    if (this.inspectionChamberLight.intensity > 0 || this.inspectionSpotlight.intensity > 0) {
      this.inspectionChamberLight.intensity = 0;
      this.inspectionSpotlight.intensity = 0;
      this.invalidate();
    }
  }

  setEdit(edit: boolean, grid: number) {
    const editChanged = this.edit !== edit;
    this.edit = edit;
    if (this.data) this.authoring.update(this.data, edit, this.selected, this.room?.id ?? null);
    this.grid = grid;
    this.hidePrinterInspectionLight();
    if (editChanged && this.build) {
      this.build.setSelectedRoom?.(this.edit ? this.room?.id : undefined);
      this.invalidate();
    }
    if (edit) {
      this.setHoveredPlacement(null);
      if (this.selected) {
        const f = this.data?.furniture.find((item) => item.id === this.selected);
        if (f) {
          this.updateGizmo(f);
        } else {
          const placement = this.data?.placements.find((p) => p.id === this.selected);
          if (placement) {
            this.updateGizmoForPlacement(placement.id);
          } else {
            this.hideGizmo();
          }
        }
      }
    } else {
      this.hideGizmo();
    }
  }

  select(id: string | null) {
    if (this.selected === id && id !== null) {
      return;
    }

    const wasSelected = Boolean(this.selected);

    // Reset previous highlighted floor border back to white
    if (this.highlightedFurnitureId) {
      this.build?.setFurnitureBorderColor(this.highlightedFurnitureId, '#d6d6cd');
      this.highlightedFurnitureId = null;
    }

    if (this.selectedPrinterPlacementId && this.selectedPrinterPlacementId !== id) {
      this.build?.setPrinterOutline?.(this.selectedPrinterPlacementId, null);
      this.selectedPrinterPlacementId = null;
    }

    if (!id) {
      for (const fid of this.selectedFurnitureIds) {
        this.build?.setFurnitureBorderColor(fid, '#d6d6cd');
      }
      this.selectedFurnitureIds.clear();
    } else if (!this.selectedFurnitureIds.has(id)) {
      for (const fid of this.selectedFurnitureIds) {
        this.build?.setFurnitureBorderColor(fid, '#d6d6cd');
      }
      this.selectedFurnitureIds = new Set([id]);
    }

    // Reset hover animation on the selected placement so it sits firmly on its base
    if (id) {
      this.hoverStates.set(id, { current: 0, target: 0 });
      this.build?.setPlacementHover(id, 0);
    }
    if (id && this.hoveredPlacementId === id) {
      this.updateHoverPlacementBadge();
    }

    this.selected = id;
    if(this.data)this.authoring.update(this.data,this.edit,id,this.room?.id??null);

    if (!id || !this.data) {
      this.hideGizmo();
      this.hidePrinterInspectionLight();
      if (wasSelected && !this.edit) {
        if (this.room) {
          const focus = calculateRoomCameraFocus(this.data, this.room);
          const targetAzimuth = this.room.camera?.azimuth ?? this.azimuth;
          this.moveCamera(
            new THREE.Vector3(focus.target.x, focus.target.y, focus.target.z),
            focus.span,
            targetAzimuth,
            focus.elevation,
            false
          );
        } else {
          this.overview();
        }
      }
      return;
    }

    // 1. Placement (printer or filament)
    const placementMeta = this.build?.placements.get(id);
    if (placementMeta) {
      const isPrinter = placementMeta.p.kind === 'printer';
      if (this.edit) {
        this.hidePrinterInspectionLight();
        this.highlightedFurnitureId = placementMeta.f.id;
        this.build?.setFurnitureBorderColor(placementMeta.f.id, '#38bdf8');
        this.updateGizmoForPlacement(id);
        if (isPrinter) {
          this.selectedPrinterPlacementId = id;
          this.build?.setPrinterOutline?.(id, 'selected');
        }
        return;
      }

      this.hideGizmo();

      if (isPrinter) {
        this.showPrinterInspectionLight(placementMeta);
      } else {
        this.hidePrinterInspectionLight();
      }

      if (!this.top) {
        if (isPrinter) {
          // Zoom into printer with close, crisp framing (1.5m) so the printer is large and clear
          const target = new THREE.Vector3(placementMeta.pos.x, placementMeta.pos.y + 0.32, placementMeta.pos.z);
          const inspectionAzimuth = this.getSafeInspectionAzimuth(target, placementMeta.f.rotation);
          this.moveCamera(target, 1.5, inspectionAzimuth, 20, false);
        } else {
          // Filament on rack: zoom to front of filament rack (1.8m)
          const o = roomOrigin(this.data, placementMeta.f.roomId);
          const target = new THREE.Vector3(o.x + placementMeta.f.x, placementMeta.f.height * 0.5, o.z + placementMeta.f.z);
          this.moveCamera(target, 1.8, this.azimuth, 14, false);
        }
      } else {
        if (isPrinter || placementMeta.p.kind === 'filament') {
          this.moveCamera(new THREE.Vector3(placementMeta.pos.x, 0.7, placementMeta.pos.z), 2.2, this.azimuth, 25, false);
        }
      }
      return;
    }

    // 2. Furniture
    this.hidePrinterInspectionLight();
    const furniture = this.data.furniture.find((item) => item.id === id);
    if (furniture) {
      if (this.edit) {
        this.highlightedFurnitureId = furniture.id;
        this.build?.setFurnitureBorderColor(furniture.id, '#38bdf8');
        for (const fid of this.selectedFurnitureIds) {
          this.build?.setFurnitureBorderColor(fid, '#38bdf8');
        }
        this.updateGizmo(furniture);
      } else {
        this.hideGizmo();
        // Camera zooms ONLY to filament rack, NOT to tables or printer racks!
        if (!this.top && furniture.kind === 'filament_rack') {
          const o = roomOrigin(this.data, furniture.roomId);
          const target = new THREE.Vector3(o.x + furniture.x, furniture.height * 0.5, o.z + furniture.z);
          this.moveCamera(target, 1.8, this.azimuth, 14, false);
        } else {
          this.overview();
        }
      }
      return;
    }

    this.hideGizmo();
  }

  overview() {
    if (this.highlightedFurnitureId) {
      this.build?.setFurnitureBorderColor(this.highlightedFurnitureId, '#d6d6cd');
      this.highlightedFurnitureId = null;
    }
    for (const fid of this.selectedFurnitureIds) {
      this.build?.setFurnitureBorderColor(fid, '#d6d6cd');
    }
    this.selectedFurnitureIds.clear();
    this.selected = null;
    this.hideGizmo();
    this.hidePrinterInspectionLight();
    const target = this.workshopCenter();
    const span = this.overviewSpan();
    this.moveCamera(target, span, this.azimuth, this.elevation, false);
    this.invalidate();
  }

  setTop(top: boolean) {
    this.top = top;
    this.target.copy(this.workshopCenter());
    this.span = this.overviewSpan();
    this.invalidate();
    this.saveCamera();
  }

  zoom(factor: number) {
    this.customView = true;
    this.transition?.stop();
    const minSpan = 0.7;
    const maxSpan = Math.max(20, this.overviewSpan() * 1.8);
    const nextSpan = THREE.MathUtils.clamp(this.span * factor, minSpan, maxSpan);
    if (Math.abs(nextSpan - this.span) > 0.005) {
      this.span = nextSpan;
      this.invalidate();
      this.saveCameraDebounced();
    }
  }

  zoomIn() {
    this.zoom(0.85);
  }

  zoomOut() {
    this.zoom(1.18);
  }

  rotateView(deltaAzimuth: number) {
    if (this.top) return;
    this.customView = true;
    this.transition?.stop();
    const targetAzimuth = this.azimuth + deltaAzimuth;
    this.moveCamera(this.target, this.span, targetAzimuth, this.elevation, true);
  }

  setInvertControls(invert: boolean) {
    this.invertControls = invert;
  }

  overviewSpan() {
    if (!this.room) return 7;
    const size=this.data?workshopBounds(this.data).getSize(new THREE.Vector3()):new THREE.Vector3(this.room.width,2.7,this.room.depth);
    const w = size.x;
    const d = size.z;
    if (this.top) {
      return Math.max(d * 1.12, (w * 1.12) / Math.max(0.2, this.aspect));
    }
    // Project all room corners, including the walls and plinth, into the
    // overview camera. The former flat-floor estimate cropped both ends.
    const view = new THREE.PerspectiveCamera();
    view.position.set(26 / Math.SQRT2, 16.7, 26 / Math.SQRT2);
    view.lookAt(0, .7, 0);
    view.updateMatrixWorld();
    let extentX = 0, extentY = 0;
    for (const x of [-w / 2 - .12, w / 2 + .12])
      for (const z of [-d / 2 - .12, d / 2 + .12])
        for (const y of [-.4, 2.7]) {
          const corner = new THREE.Vector3(x, y, z).applyMatrix4(view.matrixWorldInverse);
          extentX = Math.max(extentX, Math.abs(corner.x));
          extentY = Math.max(extentY, Math.abs(corner.y));
        }
    return Math.max(extentY * 2, extentX * 2 / Math.max(.2, this.aspect));
  }

  beginLabelPlacement(surface?: 'floor'|'north'|'east'|'south'|'west', text?: string, color?: string, size = 0.35, rotation = 0) {
    this.authoring.beginLabel(surface, text, color, size, rotation);
    this.invalidate();
  }
  updateDraftLabel(patch: { text?: string; color?: string; size?: number; rotation?: number }) {
    this.authoring.updateDraftLabel(patch);
    this.invalidate();
  }
  startDraggingSelectedLabel(e: PointerEvent): boolean {
    return this.authoring.startDraggingSelectedLabel(e);
  }
  isDraftingLabel(): boolean {
    return this.authoring.getActiveDraft()?.type === 'label';
  }
  setSelectedLabel(id: string | null) {
    this.authoring.setSelectedLabel(id);
    this.invalidate();
  }
  beginFurniturePlacement(kind: FurnitureKind) {this.authoring.beginFurniture(kind);}
  cancelAuthoring() {this.authoring.cancelDraft();}

  isTopView(): boolean {
    return this.top;
  }

  getSelectedId(): string | null {
    return this.selected;
  }

  isMoveModeActive(): boolean {
    return !!(this.down?.furnitureId && this.dragged);
  }

  getAuthoring(): SpatialAuthoring {
    return this.authoring;
  }

  startGridRoomBuilder(tool: 'brush' | 'eraser' = 'brush', onDraftChange?: (count: number) => void) {
    this.authoring.startGridRoomBuilder(tool, onDraftChange);
  }
  setGridRoomBuilderTool(tool: 'brush' | 'eraser') {
    this.authoring.setGridRoomBuilderTool(tool);
  }
  finishGridRoomBuilder(): Array<[number, number]> | null {
    return this.authoring.finishGridRoomBuilder();
  }
  cancelGridRoomBuilder() {
    this.authoring.cancelGridRoomBuilder();
  }
  isGridRoomBuilderActive(): boolean {
    return this.authoring.isGridRoomBuilderActive();
  }
  workshopCenter() {const center=this.data?workshopBounds(this.data).getCenter(new THREE.Vector3()):new THREE.Vector3();center.y=.7;return center;}
  private get aspect() {
    return Math.max(1, this.options.container.clientWidth) / Math.max(1, this.options.container.clientHeight);
  }

  private rebuild() {
    if (!this.assets || !this.data || !this.room) return;
    this.authoring?.setAssets(this.assets);
    this.build?.dispose();
    const selectedRoomId = this.edit ? this.room.id : undefined;
    this.build = buildSpatialWorkshop(this.data,this.assets,this.filaments,this.printers,this.activePrinterIds,selectedRoomId);
    this.scene.add(this.build.root);
    this.authoring?.update(this.data,this.edit,this.selected,this.room.id);
    for (const fid of this.selectedFurnitureIds) {
      this.build?.setFurnitureBorderColor(fid, '#38bdf8');
    }
    const bounds=workshopBounds(this.data),size=bounds.getSize(new THREE.Vector3()),center=this.workshopCenter();
    this.key.position.set(center.x-3,12,center.z+7);this.key.target.position.copy(center);this.scene.add(this.key.target);
    const shadowExtent = Math.hypot(size.x, size.z) * .56 + 2;
    Object.assign(this.key.shadow.camera, { left: -shadowExtent, right: shadowExtent, top: shadowExtent, bottom: -shadowExtent });
    this.key.shadow.camera.updateProjectionMatrix();
    if (this.selected) {
      const placementMeta = this.build.placements.get(this.selected);
      if (placementMeta && placementMeta.p.kind === 'printer') {
        this.selectedPrinterPlacementId = this.selected;
        this.build?.setPrinterOutline?.(this.selected, 'selected');
      } else {
        this.hidePrinterInspectionLight();
      }
    } else {
      this.hidePrinterInspectionLight();
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.invalidate();
  }

  private saveCamera() {
    this.options.onCamera({
      x: this.target.x,
      y: this.target.y,
      z: this.target.z,
      span: this.span,
      azimuth: this.azimuth,
      top: this.top,
    });
  }

  moveCamera(
    target: THREE.Vector3,
    span: number,
    targetAzimuth = this.azimuth,
    targetElevation = this.elevation,
    notify = false
  ) {
    this.transition?.stop();
    const startTarget = this.target.clone();
    const fromSpan = this.span;
    const fromAzimuth = this.azimuth;
    const fromElevation = this.elevation;
    const angleDiff = ((targetAzimuth - fromAzimuth + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.target.copy(target);
      this.span = span;
      this.azimuth = targetAzimuth;
      this.elevation = targetElevation;
      this.invalidate();
      if (notify) this.saveCamera();
      return;
    }

    this.transition = animate(0, 1, {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate: (v) => {
        this.target.lerpVectors(startTarget, target, v);
        this.span = THREE.MathUtils.lerp(fromSpan, span, v);
        this.azimuth = fromAzimuth + angleDiff * v;
        this.elevation = THREE.MathUtils.lerp(fromElevation, targetElevation, v);
        this.invalidate();
      },
      onComplete: () => {
        this.transition = null;
        if (notify) this.saveCamera();
      },
    });
  }

  // Hover interactive animation on the 3D model itself (printers lift & scale, filament steps forward & lifts)
  private setHoveredPlacement(id: string | null) {
    if (this.hoveredPlacementId === id) return;
    if (this.hoveredPlacementId) {
      const old = this.hoverStates.get(this.hoveredPlacementId) ?? { current: 0, target: 0 };
      old.target = 0;
      this.hoverStates.set(this.hoveredPlacementId, old);
    }
    this.hoveredPlacementId = id;
    if (id) {
      const meta = this.build?.placements.get(id);
      const isSelected = this.selected === id;
      const isPrinter = meta?.p.kind === 'printer';
      const isPrinting = isPrinter && meta ? (this.activePrinterIds.has(meta.p.entityId) || this.activePrinterIds.has(meta.p.id)) : false;
      const suppressJump = isSelected || isPrinting;

      const next = this.hoverStates.get(id) ?? { current: 0, target: 1 };
      next.target = suppressJump ? 0 : 1;
      if (suppressJump) {
        next.current = 0;
        this.build?.setPlacementHover(id, 0);
      }
      this.hoverStates.set(id, next);
    }
    this.updateHoverPlacementBadge();
    this.startHoverAnimation();
  }

  private updateHoverPlacementBadge() {
    if (!this.hoveredPlacementId || this.edit || !this.build || this.selected === this.hoveredPlacementId) {
      if (this.currentHoverInfo !== null) {
        this.currentHoverInfo = null;
        this.options.onHoverPlacement?.(null);
      }
      return;
    }

    const meta = this.build.placements.get(this.hoveredPlacementId);
    if (!meta) {
      if (this.currentHoverInfo !== null) {
        this.currentHoverInfo = null;
        this.options.onHoverPlacement?.(null);
      }
      return;
    }

    let name = '';
    let color: string | undefined;
    let isActive = false;

    if (meta.p.kind === 'printer') {
      const printer = this.printers.find((p) => p.id === meta.p.entityId);
      name = printer?.name || (meta.p.model === 'p1' ? 'Bambu Lab P1S' : 'Bambu Lab A1');
      isActive = this.activePrinterIds.has(meta.p.entityId);
    } else if (meta.p.kind === 'filament') {
      const filament = this.filaments.find((f) => f.id === meta.p.entityId);
      name = filament?.name || 'Филамент';
      color = filament?.color;
    }

    const hoverProgress = this.hoverStates.get(this.hoveredPlacementId)?.current ?? 0;
    const hoverLift = (meta.p.kind === 'printer' ? 0.12 : 0.05) * hoverProgress;
    const baseHeight = meta.p.kind === 'printer' ? 0.65 : 0.35;
    const worldPoint = new THREE.Vector3(meta.pos.x, meta.pos.y + baseHeight + hoverLift, meta.pos.z);

    worldPoint.project(this.camera);
    const rect = this.options.canvas.getBoundingClientRect();
    const screenX = ((worldPoint.x + 1) / 2) * rect.width;
    const screenY = ((-worldPoint.y + 1) / 2) * rect.height;

    if (worldPoint.z < -1 || worldPoint.z > 1) {
      if (this.currentHoverInfo !== null) {
        this.currentHoverInfo = null;
        this.options.onHoverPlacement?.(null);
      }
      return;
    }

    const nextInfo: HoverPlacementInfo = {
      placementId: this.hoveredPlacementId,
      kind: meta.p.kind,
      name,
      color,
      isActive,
      screenX,
      screenY,
    };

    this.currentHoverInfo = nextInfo;
    this.options.onHoverPlacement?.(nextInfo);
  }

  public updateLabelTransform() {
    if (!this.options.onLabelTransform) return;
    const transform = this.getSelectedOrDraftLabelTransform();
    this.options.onLabelTransform(transform);
  }

  public getSelectedOrDraftLabelTransform(): LabelScreenTransform | null {
    if (!this.edit || !this.data) return null;

    // 1. Check if drafting a new label
    const draft = this.authoring.getActiveDraft();
    if (draft && draft.type === 'label') {
      const previewPos = this.authoring.getLabelPreviewPosition();
      if (previewPos && this.authoring.isLabelPreviewVisible()) {
        const rect = this.options.canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;

        const textProj = previewPos.worldPos.clone().project(this.camera);
        if (textProj.z < -1 || textProj.z > 1) return null;

        const screenX = ((textProj.x + 1) / 2) * rect.width;
        const screenY = ((-textProj.y + 1) / 2) * rect.height;

        const hudWorldPos = previewPos.worldPos.clone();
        if (previewPos.surface === 'floor') {
          hudWorldPos.z -= 0.45;
          hudWorldPos.y += 0.35;
        } else {
          hudWorldPos.y = Math.min(2.65, hudWorldPos.y + 0.35);
        }
        const hudProj = hudWorldPos.project(this.camera);
        const hudX = ((hudProj.x + 1) / 2) * rect.width;
        const hudY = ((-hudProj.y + 1) / 2) * rect.height;

        return {
          roomId: previewPos.roomId,
          labelId: 'draft',
          text: draft.text || 'Новая надпись',
          color: draft.color || '#38bdf8',
          size: draft.size || 0.35,
          rotation: draft.rotation || 0,
          surface: previewPos.surface,
          screenX,
          screenY,
          hudX,
          hudY,
          visible: true,
          isDraft: true,
        };
      }
    }

    // 2. Check if a label is selected
    const selectedLabelId = this.authoring.getSelectedLabelId();
    if (!selectedLabelId) return null;

    for (const room of this.data.rooms) {
      const lbl = (room.labels ?? defaultRoomLabels(room)).find((l) => l.id === selectedLabelId);
      if (!lbl) continue;

      const o = roomOrigin(this.data, room.id);
      let worldX = o.x + (lbl.u - 0.5) * room.width;
      let worldZ = o.z + (lbl.v - 0.5) * room.depth;
      let worldY = 0.05;

      let hudWorldX = worldX;
      let hudWorldZ = worldZ;
      let hudWorldY = worldY;

      if (lbl.surface === 'floor') {
        worldY = 0.05;
        hudWorldZ = worldZ - (lbl.size / 2 + 0.45);
        hudWorldY = 0.35;
      } else if (lbl.surface === 'north') {
        worldZ = o.z - room.depth / 2 + 0.09;
        worldY = lbl.v * 2.6;
        hudWorldY = Math.min(2.65, lbl.v * 2.6 + lbl.size / 2 + 0.35);
      } else if (lbl.surface === 'south') {
        worldZ = o.z + room.depth / 2 - 0.09;
        worldY = lbl.v * 2.6;
        hudWorldY = Math.min(2.65, lbl.v * 2.6 + lbl.size / 2 + 0.35);
      } else if (lbl.surface === 'west') {
        worldX = o.x - room.width / 2 + 0.09;
        worldY = lbl.v * 2.6;
        hudWorldY = Math.min(2.65, lbl.v * 2.6 + lbl.size / 2 + 0.35);
      } else if (lbl.surface === 'east') {
        worldX = o.x + room.width / 2 - 0.09;
        worldY = lbl.v * 2.6;
        hudWorldY = Math.min(2.65, lbl.v * 2.6 + lbl.size / 2 + 0.35);
      }

      const rect = this.options.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const textProj = new THREE.Vector3(worldX, worldY, worldZ).project(this.camera);
      if (textProj.z < -1 || textProj.z > 1) return null;

      const hudProj = new THREE.Vector3(hudWorldX, hudWorldY, hudWorldZ).project(this.camera);

      const screenX = ((textProj.x + 1) / 2) * rect.width;
      const screenY = ((-textProj.y + 1) / 2) * rect.height;
      const hudX = ((hudProj.x + 1) / 2) * rect.width;
      const hudY = ((-hudProj.y + 1) / 2) * rect.height;

      return {
        roomId: room.id,
        labelId: lbl.id,
        text: lbl.text,
        color: lbl.color,
        size: lbl.size,
        rotation: lbl.rotation ?? 0,
        surface: lbl.surface,
        screenX,
        screenY,
        hudX,
        hudY,
        visible: true,
        isDraft: false,
      };
    }

    return null;
  }

  private startHoverAnimation() {
    if (this.hoverRaf !== null) return;
    const tick = () => {
      let active = false;
      for (const [placementId, state] of this.hoverStates) {
        if (placementId === this.selected) {
          state.current = 0;
          state.target = 0;
          this.build?.setPlacementHover(placementId, 0);
          this.hoverStates.delete(placementId);
          continue;
        }
        state.current = THREE.MathUtils.lerp(state.current, state.target, 0.22);
        if (Math.abs(state.current - state.target) < 0.005) {
          state.current = state.target;
        }
        this.build?.setPlacementHover(placementId, state.current);

        if (state.current === 0 && state.target === 0) {
          this.hoverStates.delete(placementId);
        } else {
          active = true;
        }
      }

      this.invalidate();

      if (active) {
        this.hoverRaf = requestAnimationFrame(tick);
      } else {
        this.hoverRaf = null;
      }
    };
    this.hoverRaf = requestAnimationFrame(tick);
  }

  private cast(e: PointerEvent) {
    const rect = this.options.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
  }

  private pick(e: PointerEvent) {
    this.cast(e);
    return pickWorkshopTarget(this.ray.intersectObjects(this.build?.picks ?? [], false), this.edit);
  }

  private floorPoint(e: PointerEvent) {
    this.cast(e);
    return this.ray.ray.intersectPlane(this.floor, new THREE.Vector3()) ?? new THREE.Vector3();
  }

  private onDown = (e: PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    if(this.authoring.pointerDown(e))return;
    if(e.pointerType==='touch'){
      this.touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.touches.size===2){const [a,b]=[...this.touches.values()];this.pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),span:this.span};this.down=null;this.options.canvas.setPointerCapture(e.pointerId);return;}
    }

    // Middle Mouse Button (1) or Right Mouse Button (2) = Orbit (360° rotation)
    if (e.button === 1 || e.button === 2) {
      this.transition?.stop();
      this.down = {
        button: e.button,
        x: e.clientX,
        y: e.clientY,
        target: this.target.clone(),
        azimuth: this.azimuth,
        elevation: this.elevation,
        start: this.floorPoint(e),
        origin: new THREE.Vector3(),
        right: e.button === 2,
        orbit: !this.top,
      };
      this.dragged = false;
      this.options.canvas.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) {
      return;
    }

    this.transition?.stop();

    if (this.edit && this.gizmoGroup.visible) {
      this.cast(e);
      const gizmoHit = this.ray.intersectObjects(this.gizmoMeshes, true)[0];
      if (gizmoHit && gizmoHit.object.userData.isGizmo) {
        const u = gizmoHit.object.userData;
        if (u.placementId) {
          const placementMeta = this.build?.placements.get(u.placementId);
          if (!placementMeta) return;
          if (u.action === 'rotate') {
            const nextModel: ModelKey = placementMeta.p.model === 'a1' ? 'p1' : 'a1';
            this.options.onModelChange?.(u.placementId, nextModel);
            return;
          }
          if (u.action === 'delete') {
            this.options.onDelete?.(u.placementId, 'placement');
            return;
          }
          if (u.action === 'move') {
            this.down = {
              x: e.clientX,
              y: e.clientY,
              target: this.target.clone(),
              azimuth: this.azimuth,
              placementId: u.placementId,
              start: this.floorPoint(e),
              origin: placementMeta.pos.clone(),
              right: false,
              gizmoAxis: u.axis as 'x' | 'z',
              gizmoDir: u.dir as 1 | -1,
            };
            this.dragged = false;
            this.options.canvas.setPointerCapture(e.pointerId);
            return;
          }
        }
        const f = this.data?.furniture.find((item) => item.id === u.furnitureId);
        if (!f) return;
        if (u.action === 'rotate') {
          const nextRot = (f.rotation + 90) % 360;
          const next = { ...f, rotation: nextRot };
          this.options.onRotate?.(f.id, nextRot);
          const isValid = validFurniture(this.data!, next);
          this.build?.setFurnitureBorderColor(f.id, isValid ? '#38bdf8' : '#e87668');
          return;
        }
        if (u.action === 'delete') {
          this.options.onDelete?.(f.id, 'furniture');
          return;
        }
        if (u.action === 'move') {
          const fOrigin = roomOrigin(this.data!, f.roomId);
          this.down = {
            x: e.clientX,
            y: e.clientY,
            target: this.target.clone(),
            azimuth: this.azimuth,
            furnitureId: f.id,
            start: this.floorPoint(e),
            origin: new THREE.Vector3(fOrigin.x + f.x, 0, fOrigin.z + f.z),
            right: false,
            gizmoAxis: u.axis as 'x' | 'z',
            gizmoDir: u.dir as 1 | -1,
          };
          this.dragged = false;
          this.options.canvas.setPointerCapture(e.pointerId);
          return;
        }
        if (u.action === 'resize') {
          this.down = {
            x: e.clientX,
            y: e.clientY,
            target: this.target.clone(),
            azimuth: this.azimuth,
            furnitureId: f.id,
            start: this.floorPoint(e),
            origin: new THREE.Vector3(f.x, 0, f.z),
            right: false,
            gizmoAction: 'resize',
            initialWidth: f.width,
            currentWidth: f.width,
            isValidResize: true,
          };
          this.dragged = false;
          this.options.canvas.setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    const hit = this.pick(e);
    if (this.edit && e.button === 0) {
      const pId = hit?.userData.placementId as string | undefined;
      if (pId) {
        const placementMeta = this.build?.placements.get(pId);
        if (placementMeta) {
          this.down = {
            x: e.clientX,
            y: e.clientY,
            target: this.target.clone(),
            azimuth: this.azimuth,
            placementId: pId,
            start: this.floorPoint(e),
            origin: placementMeta.pos.clone(),
            right: false,
          };
          this.dragged = false;
          this.options.canvas.setPointerCapture(e.pointerId);
          return;
        }
      }
      const fId = hit?.userData.furnitureId as string | undefined;
      const f = this.data?.furniture.find((item) => item.id === fId);
      const fOrigin = f && this.data ? roomOrigin(this.data, f.roomId) : { x: 0, z: 0 };
      if (f) {
        this.down = {
          x: e.clientX,
          y: e.clientY,
          target: this.target.clone(),
          azimuth: this.azimuth,
          furnitureId: fId,
          start: this.floorPoint(e),
          origin: new THREE.Vector3(fOrigin.x + f.x, 0, fOrigin.z + f.z),
          right: false,
        };
        this.dragged = false;
        this.options.canvas.setPointerCapture(e.pointerId);
        return;
      }
    }

    // Default Left Click on background (or view mode):
    // Dragging = Pan (перемещение камеры), Clicking = Select / Deselect
    this.down = {
      button: 0,
      x: e.clientX,
      y: e.clientY,
      target: this.target.clone(),
      azimuth: this.azimuth,
      elevation: this.elevation,
      furnitureId: undefined,
      downHitPlacementId: hit?.userData.placementId as string | undefined,
      downHitFurnitureId: hit?.userData.furnitureId as string | undefined,
      start: this.floorPoint(e),
      origin: new THREE.Vector3(),
      right: false,
      orbit: false,
    };
    this.dragged = false;
    this.options.canvas.setPointerCapture(e.pointerId);
  };

  private onMove = (e: PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    if(e.pointerType==='touch'&&this.touches.has(e.pointerId)){
      this.touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.pinch&&this.touches.size===2){
        const [a,b]=[...this.touches.values()];
        const distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
        this.span=THREE.MathUtils.clamp(this.pinch.span*this.pinch.distance/distance,.9,this.overviewSpan()*1.8);
        this.invalidate();return;
      }
    }
    if(this.authoring.pointerMove(e))return;
    const d = this.down;
    if (d && d.placementId && this.data && (this.dragged || Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 5)) {
      this.dragged = true;
      const fp = this.floorPoint(e);
      let targetPoint = fp;
      if (d.gizmoAxis === 'x') {
        targetPoint = new THREE.Vector3(fp.x, d.origin.y, d.origin.z);
      } else if (d.gizmoAxis === 'z') {
        targetPoint = new THREE.Vector3(d.origin.x, d.origin.y, fp.z);
      }
      const nearest = this.findNearestSlot(d.placementId, targetPoint);
      if (nearest) {
        this.build?.previewPlacement(d.placementId, nearest.worldPos, nearest.rotationY);
        this.updateGizmoForPlacementPosition(nearest.worldPos, d.placementId);
      }
      this.options.canvas.style.cursor = 'grabbing';
      this.invalidate();
      return;
    }

    if (d && d.furnitureId && d.gizmoAction === 'resize' && this.data && (this.dragged || Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 5)) {
      this.dragged = true;
      const f = this.data.furniture.find((item) => item.id === d.furnitureId)!;
      const fp = this.floorPoint(e);
      const angle = (f.rotation * Math.PI) / 180;
      const dx = fp.x - f.x;
      const dz = fp.z - f.z;
      const lengthAlongAxis = Math.abs(dx * Math.cos(angle) - dz * Math.sin(angle)) * 2;
      const step = f.kind === 'filament_rack' ? 0.3 : 0.6;
      let newWidth = Math.max(f.kind === 'filament_rack' ? 0.9 : 1.2, Math.min(12, Math.round(lengthAlongAxis / step) * step));
      newWidth = Math.round(newWidth * 10) / 10;
      d.currentWidth = newWidth;

      const columns = f.columns === 0 ? 0 : Math.min(16, Math.max(1, Math.floor((newWidth + 1e-6) / (f.kind === 'filament_rack' ? 0.16 : 0.6))));
      const testF = { ...f, width: newWidth, columns };
      const isValid = validFurniture(this.data, testF);
      d.isValidResize = isValid;

      this.authoring.renderFurnitureResize3D(f, newWidth, f.depth, isValid);
      const { w, d: depthFootprint } = footprint({ ...f, width: newWidth });
      const btnMargin = 0.38;
      this.resizeBtnGroup.position.set(f.x + w / 2 + btnMargin, 0.015, f.z - depthFootprint / 2 - btnMargin);
      this.options.canvas.style.cursor = 'ew-resize';
      this.invalidate();
      return;
    }

    if (d && d.furnitureId && d.gizmoAction !== 'resize' && this.data && (this.dragged || Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 5)) {
      this.dragged = true;
      const f = this.data.furniture.find((f) => f.id === d.furnitureId)!;
      const fOrigin = roomOrigin(this.data, f.roomId);
      const p = this.floorPoint(e).sub(d.start).add(d.origin);
      let worldX = snap(p.x, this.grid);
      let worldZ = snap(p.z, this.grid);
      if (d.gizmoAxis === 'x') worldZ = fOrigin.z + f.z;
      else if (d.gizmoAxis === 'z') worldX = fOrigin.x + f.x;

      const targetRoom = findRoomAt(this.data, worldX, worldZ) ?? this.data.rooms.find((r) => r.id === f.roomId);
      let isValid = false;
      if (targetRoom) {
        const targetOrigin = roomOrigin(this.data, targetRoom.id);
        let localX = snap(worldX - targetOrigin.x, this.grid);
        let localZ = snap(worldZ - targetOrigin.z, this.grid);

        const snapped = snapFurnitureToNeighbors(
          localX,
          localZ,
          { ...f, roomId: targetRoom.id },
          this.data.furniture,
          targetRoom
        );
        if (d.gizmoAxis !== 'z' && snapped.snappedX) localX = snapped.x;
        if (d.gizmoAxis !== 'x' && snapped.snappedZ) localZ = snapped.z;

        if (this.selectedFurnitureIds.size > 1 && this.selectedFurnitureIds.has(f.id)) {
          const dx = localX - f.x;
          const dz = localZ - f.z;
          const groupResult = calculateGroupMove(this.data, this.selectedFurnitureIds, dx, dz, this.grid);
          isValid = groupResult.valid;
          for (const gid of this.selectedFurnitureIds) {
            const gf = this.data.furniture.find((item) => item.id === gid);
            if (gf) {
              this.build?.previewFurniture(gf.id, gf.x + dx, gf.z + dz);
              this.build?.setFurnitureBorderColor(gf.id, isValid ? '#38bdf8' : '#e87668');
            }
          }
          this.updateGizmo({ ...f, roomId: targetRoom.id, x: localX, z: localZ });
        } else {
          worldX = targetOrigin.x + localX;
          worldZ = targetOrigin.z + localZ;
          const previewX = worldX - fOrigin.x;
          const previewZ = worldZ - fOrigin.z;
          this.build?.previewFurniture(f.id, previewX, previewZ);

          isValid = validFurniture(this.data, { ...f, roomId: targetRoom.id, x: localX, z: localZ });
          this.updateGizmo({ ...f, roomId: targetRoom.id, x: localX, z: localZ });
          this.build?.setFurnitureBorderColor(f.id, isValid ? '#38bdf8' : '#e87668');
        }
      } else {
        const previewX = worldX - fOrigin.x;
        const previewZ = worldZ - fOrigin.z;
        this.build?.previewFurniture(f.id, previewX, previewZ);
        this.updateGizmo({ ...f, x: previewX, z: previewZ });
        this.build?.setFurnitureBorderColor(f.id, '#e87668');
      }

      this.renderer.shadowMap.needsUpdate = true;
      this.options.canvas.style.cursor = 'grabbing';
      this.invalidate();
      return;
    }

    if (this.edit && this.gizmoGroup.visible) {
      this.cast(e);
      const gizmoHit = this.ray.intersectObjects(this.gizmoMeshes, true)[0];
      if (gizmoHit && gizmoHit.object.userData.isGizmo) {
        this.setHoveredGizmo(gizmoHit.object as THREE.Mesh);
        this.options.canvas.style.cursor = 'pointer';
        return;
      } else {
        this.setHoveredGizmo(null);
      }
    }

    if (d && !d.placementId && !d.furnitureId && (this.dragged || Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 8)) {
      this.customView = true;
      this.dragged = true;
      if (this.hoveredPlacementId) {
        this.setHoveredPlacement(null);
      }
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      const mpp = this.span / Math.max(1, this.options.container.clientHeight);

      if (d.orbit && !this.top) {
        // Orbit mode (3D view): horizontal-only rotation (left/right yaw); vertical tilt is locked
        const { azimuth, elevation } = calculateOrbitAngles(
          d.azimuth,
          d.elevation ?? 16,
          dx,
          dy
        );
        this.azimuth = azimuth;
        this.elevation = elevation;
      } else {
        // Pan mode: uniform 1:1 camera-relative floor displacement
        const { deltaX, deltaZ } = calculatePanDelta(
          dx,
          dy,
          mpp,
          d.azimuth ?? this.azimuth,
          d.elevation ?? this.elevation,
          this.top
        );
        this.target.x = d.target.x + deltaX;
        this.target.z = d.target.z + deltaZ;
      }

      if (this.data) {
        const bounds = workshopBounds(this.data);
        this.target.x = THREE.MathUtils.clamp(this.target.x, bounds.min.x - 5, bounds.max.x + 5);
        this.target.z = THREE.MathUtils.clamp(this.target.z, bounds.min.z - 5, bounds.max.z + 5);
      }
      this.options.canvas.style.cursor = 'grabbing';
      this.invalidate();
      return;
    }

    const hit = this.pick(e);
    const pId = hit?.userData.placementId as string | undefined;
    const kind = hit?.userData.kind as string | undefined;

    if (pId && (kind === 'printer' || kind === 'filament') && !this.edit) {
      this.setHoveredPlacement(pId);
      this.options.canvas.style.cursor = 'pointer';
    } else {
      this.setHoveredPlacement(null);
      this.options.canvas.style.cursor = hit ? 'pointer' : 'default';
    }
  };

  private onUp = (e: PointerEvent) => {
    if (e.cancelable) e.preventDefault();
    if(this.authoring.pointerUp(e))return;
    if(e.pointerType==='touch'){
      this.touches.delete(e.pointerId);
      if(this.pinch){this.pinch=null;this.down=null;this.saveCamera();if(this.options.canvas.hasPointerCapture(e.pointerId))this.options.canvas.releasePointerCapture(e.pointerId);return;}
    }
    const d = this.down;
    if (!d) return;

    if (d.button === 1 || d.button === 2) {
      if (this.dragged) {
        this.saveCameraDebounced();
      }
      this.onCancel();
      if (this.options.canvas.hasPointerCapture(e.pointerId)) {
        this.options.canvas.releasePointerCapture(e.pointerId);
      }
      return;
    }

    if (d.placementId) {
      if (this.dragged) {
        const fp = this.floorPoint(e);
        let targetPoint = fp;
        if (d.gizmoAxis === 'x') {
          targetPoint = new THREE.Vector3(fp.x, d.origin.y, d.origin.z);
        } else if (d.gizmoAxis === 'z') {
          targetPoint = new THREE.Vector3(d.origin.x, d.origin.y, fp.z);
        }
        const nearest = this.findNearestSlot(d.placementId, targetPoint);
        if (nearest) {
          this.options.onMovePlacement?.(d.placementId, nearest.slot.id);
        } else {
          this.build?.resetPlacementPreview(d.placementId);
          this.updateGizmoForPlacement(d.placementId);
        }
      } else if (d.gizmoAxis) {
        const nextSlot = this.findAdjacentSlot(d.placementId, d.gizmoAxis, d.gizmoDir ?? 1);
        if (nextSlot) {
          this.options.onMovePlacement?.(d.placementId, nextSlot.id);
        }
      } else {
        if (this.selected === d.placementId) {
          this.options.onSelect('', 'furniture');
          this.select(null);
        } else {
          this.options.onSelect(d.placementId, 'placement');
          this.select(d.placementId);
        }
      }
    } else if (d.furnitureId && d.gizmoAction === 'resize') {
      const f = this.data?.furniture.find((item) => item.id === d.furnitureId);
      this.authoring.cleanupFurniturePreview();
      if (f) {
        if (this.dragged && d.currentWidth && d.currentWidth !== f.width) {
          if (d.isValidResize) {
            this.options.onResizeFurniture?.(f.id, d.currentWidth, f.depth);
          } else {
            this.build?.setFurnitureBorderColor(f.id, '#e87668');
            setTimeout(() => {
              if (this.selected === f.id) this.build?.setFurnitureBorderColor(f.id, '#38bdf8');
            }, 600);
          }
        } else if (!this.dragged) {
          const step = f.kind === 'filament_rack' ? 0.3 : 0.6;
          const maxW = f.kind === 'filament_rack' ? 3.6 : 4.8;
          const minW = f.kind === 'filament_rack' ? 0.9 : 1.8;
          let nextWidth = f.width + step;
          if (nextWidth > maxW + 0.05) nextWidth = minW;
          nextWidth = Math.round(nextWidth * 10) / 10;
          const columns = f.columns === 0 ? 0 : Math.min(16, Math.max(1, Math.floor((nextWidth + 1e-6) / (f.kind === 'filament_rack' ? 0.16 : 0.6))));
          const testF = { ...f, width: nextWidth, columns };
          if (validFurniture(this.data!, testF)) {
            this.options.onResizeFurniture?.(f.id, nextWidth, f.depth);
          } else {
            this.build?.setFurnitureBorderColor(f.id, '#e87668');
            setTimeout(() => {
              if (this.selected === f.id) this.build?.setFurnitureBorderColor(f.id, '#38bdf8');
            }, 600);
          }
        }
      }
      this.onCancel();
      if (this.options.canvas.hasPointerCapture(e.pointerId)) {
        this.options.canvas.releasePointerCapture(e.pointerId);
      }
      return;
    } else if (this.dragged && d.furnitureId) {
      const f = this.data?.furniture.find((item) => item.id === d.furnitureId);
      if (f && this.data) {
        const fOrigin = roomOrigin(this.data, f.roomId);
        const p = this.floorPoint(e).sub(d.start).add(d.origin);
        let worldX = snap(p.x, this.grid);
        let worldZ = snap(p.z, this.grid);
        if (d.gizmoAxis === 'x') worldZ = fOrigin.z + f.z;
        else if (d.gizmoAxis === 'z') worldX = fOrigin.x + f.x;

        const targetRoom = findRoomAt(this.data, worldX, worldZ) ?? this.data.rooms.find((r) => r.id === f.roomId);
        if (targetRoom) {
          const targetOrigin = roomOrigin(this.data, targetRoom.id);
          let localX = snap(worldX - targetOrigin.x, this.grid);
          let localZ = snap(worldZ - targetOrigin.z, this.grid);
          const snapped = snapFurnitureToNeighbors(
            localX,
            localZ,
            { ...f, roomId: targetRoom.id },
            this.data.furniture,
            targetRoom
          );
          if (d.gizmoAxis !== 'z' && snapped.snappedX) localX = snapped.x;
          if (d.gizmoAxis !== 'x' && snapped.snappedZ) localZ = snapped.z;

          // Multi-selection group movement
          if (this.selectedFurnitureIds.size > 1 && this.selectedFurnitureIds.has(f.id)) {
            const dx = localX - f.x;
            const dz = localZ - f.z;
            if (dx !== 0 || dz !== 0) {
              const result = calculateGroupMove(this.data, this.selectedFurnitureIds, dx, dz, this.grid);
              if (result.valid) {
                for (const item of result.moved) {
                  this.options.onMove(item.id, item.x, item.z, item.roomId);
                  this.build?.setFurnitureBorderColor(item.id, '#38bdf8');
                }
              } else {
                for (const gid of this.selectedFurnitureIds) {
                  const gf = this.data.furniture.find((item) => item.id === gid);
                  if (gf) this.build?.previewFurniture(gf.id, gf.x, gf.z);
                  this.build?.setFurnitureBorderColor(gid, '#e87668');
                }
                this.options.onCollisionFeedback?.(result.reason ?? 'Недопустимое положение объекта');
                setTimeout(() => {
                  for (const gid of this.selectedFurnitureIds) {
                    this.build?.setFurnitureBorderColor(gid, '#38bdf8');
                  }
                }, 600);
              }
            }
          } else {
            const testF = { ...f, roomId: targetRoom.id, x: localX, z: localZ };
            this.options.onMove(f.id, localX, localZ, targetRoom.id);
            const isValid = validFurniture(this.data, testF);
            this.build?.setFurnitureBorderColor(f.id, isValid ? '#38bdf8' : '#e87668');
            this.updateGizmo(testF);
          }
        } else {
          const fOrigin = roomOrigin(this.data, f.roomId);
          const localX = snap(worldX - fOrigin.x, this.grid);
          const localZ = snap(worldZ - fOrigin.z, this.grid);
          const testF = { ...f, x: localX, z: localZ };
          this.options.onMove(f.id, localX, localZ, f.roomId);
          this.build?.setFurnitureBorderColor(f.id, '#e87668');
          this.updateGizmo(testF);
        }
      }
    } else if (!this.dragged && d?.furnitureId && d?.gizmoAxis) {
      const f = this.data?.furniture.find((item) => item.id === d.furnitureId);
      if (f && this.data) {
        const step = this.grid * (d.gizmoDir ?? 1);
        const dx = d.gizmoAxis === 'x' ? snap(step, this.grid) : 0;
        const dz = d.gizmoAxis === 'z' ? snap(step, this.grid) : 0;
        if (this.selectedFurnitureIds.size > 1 && this.selectedFurnitureIds.has(f.id)) {
          const result = calculateGroupMove(this.data, this.selectedFurnitureIds, dx, dz, this.grid);
          if (result.valid) {
            for (const item of result.moved) {
              this.options.onMove(item.id, item.x, item.z, item.roomId);
              this.build?.setFurnitureBorderColor(item.id, '#38bdf8');
            }
          } else {
            for (const gid of this.selectedFurnitureIds) {
              this.build?.setFurnitureBorderColor(gid, '#e87668');
            }
            this.options.onCollisionFeedback?.(result.reason ?? 'Недопустимое положение объекта');
            setTimeout(() => {
              for (const gid of this.selectedFurnitureIds) {
                this.build?.setFurnitureBorderColor(gid, '#38bdf8');
              }
            }, 500);
          }
        } else {
          const fOrigin = roomOrigin(this.data, f.roomId);
          let worldX = fOrigin.x + (d.gizmoAxis === 'x' ? snap(f.x + step, this.grid) : f.x);
          let worldZ = fOrigin.z + (d.gizmoAxis === 'z' ? snap(f.z + step, this.grid) : f.z);
          const targetRoom = findRoomAt(this.data, worldX, worldZ) ?? this.data.rooms.find((r) => r.id === f.roomId);
          if (targetRoom) {
            const targetOrigin = roomOrigin(this.data, targetRoom.id);
            const localX = snap(worldX - targetOrigin.x, this.grid);
            const localZ = snap(worldZ - targetOrigin.z, this.grid);
            const next = { ...f, roomId: targetRoom.id, x: localX, z: localZ };
            this.options.onMove(f.id, next.x, next.z, targetRoom.id);
            const isValid = validFurniture(this.data, next);
            this.build?.setFurnitureBorderColor(f.id, isValid ? '#38bdf8' : '#e87668');
          }
        }
      }
    } else if (this.dragged && !d.placementId && !d.furnitureId) {
      this.saveCameraDebounced();
    } else if (!this.dragged) {
      const hit = this.pick(e);
      const placementId = (hit?.userData.placementId as string | undefined) ?? d.downHitPlacementId;
      const furnitureId = (hit?.userData.furnitureId as string | undefined) ?? d.downHitFurnitureId ?? d.furnitureId;
      if (placementId) {
        for (const prevId of this.selectedFurnitureIds) {
          this.build?.setFurnitureBorderColor(prevId, '#d6d6cd');
        }
        this.selectedFurnitureIds.clear();
        if (this.selected === placementId) {
          this.options.onSelect('', 'furniture');
          this.select(null);
        } else {
          this.options.onSelect(placementId, 'placement');
          this.select(placementId);
        }
      } else if (furnitureId) {
        if (this.edit) {
          if (e.shiftKey) {
            // Shift+click multi-selection in edit mode:
            if (this.selectedFurnitureIds.has(furnitureId)) {
              this.selectedFurnitureIds.delete(furnitureId);
              this.build?.setFurnitureBorderColor(furnitureId, '#d6d6cd');
              if (this.selectedFurnitureIds.size === 0) {
                this.selected = null;
                this.options.onSelect('', 'furniture');
                this.hideGizmo();
              } else {
                const nextPrimary = Array.from(this.selectedFurnitureIds)[0];
                this.selected = nextPrimary;
                this.options.onSelect(nextPrimary, 'furniture');
                const pf = this.data?.furniture.find((item) => item.id === nextPrimary);
                if (pf) this.updateGizmo(pf);
              }
            } else {
              this.selectedFurnitureIds.add(furnitureId);
              this.selected = furnitureId;
              this.options.onSelect(furnitureId, 'furniture');
              const pf = this.data?.furniture.find((item) => item.id === furnitureId);
              if (pf) this.updateGizmo(pf);
            }
            // Update borders: all items in selectedFurnitureIds get #38bdf8 border color
            for (const id of this.selectedFurnitureIds) {
              this.build?.setFurnitureBorderColor(id, '#38bdf8');
            }
            this.invalidate();
          } else {
            // Click without shiftKey:
            if (this.selected === furnitureId && this.selectedFurnitureIds.size === 1) {
              this.build?.setFurnitureBorderColor(furnitureId, '#d6d6cd');
              this.selectedFurnitureIds.clear();
              this.options.onSelect('', 'furniture');
              this.select(null);
            } else {
              for (const prevId of this.selectedFurnitureIds) {
                if (prevId !== furnitureId) {
                  this.build?.setFurnitureBorderColor(prevId, '#d6d6cd');
                }
              }
              this.selectedFurnitureIds = new Set([furnitureId]);
              this.options.onSelect(furnitureId, 'furniture');
              this.select(furnitureId);
              this.build?.setFurnitureBorderColor(furnitureId, '#38bdf8');
            }
          }
        } else {
          for (const prevId of this.selectedFurnitureIds) {
            this.build?.setFurnitureBorderColor(prevId, '#d6d6cd');
          }
          this.selectedFurnitureIds.clear();
          const f = this.data?.furniture.find((item) => item.id === furnitureId);
          if (f?.kind === 'filament_rack') {
            this.options.onSelect(furnitureId, 'furniture');
            this.select(furnitureId);
          } else {
            this.options.onSelect('', 'furniture');
            this.overview();
          }
        }
      } else if (this.edit) {
        for (const prevId of this.selectedFurnitureIds) {
          this.build?.setFurnitureBorderColor(prevId, '#d6d6cd');
        }
        this.selectedFurnitureIds.clear();
        const roomClicked = this.authoring.selectRoomAt(e);
        if (roomClicked) {
          this.options.onSelect('', 'furniture');
          this.select(null);
        }
      } else if (!this.edit) {
        for (const prevId of this.selectedFurnitureIds) {
          this.build?.setFurnitureBorderColor(prevId, '#d6d6cd');
        }
        this.selectedFurnitureIds.clear();
        const roomClicked = this.authoring.selectRoomAt(e);
        if (!roomClicked) {
          this.options.onSelect('', 'furniture');
          this.select(null);
          this.overview();
        }
      }
    }
    this.onCancel();
    if (this.options.canvas.hasPointerCapture(e.pointerId)) {
      this.options.canvas.releasePointerCapture(e.pointerId);
    }
  };

  private onCancel = (event?: PointerEvent) => {
    if(event){this.touches.clear();this.pinch=null;this.authoring.cancel();}
    this.authoring.cleanupFurniturePreview();
    if (this.down?.placementId) {
      this.build?.resetPlacementPreview(this.down.placementId);
      this.updateGizmoForPlacement(this.down.placementId);
    }
    const f = this.data?.furniture.find((f) => f.id === this.down?.furnitureId);
    if (f) {
      if (this.selectedFurnitureIds.size > 1 && this.selectedFurnitureIds.has(f.id)) {
        for (const gid of this.selectedFurnitureIds) {
          const gf = this.data?.furniture.find((item) => item.id === gid);
          if (gf) {
            this.build?.previewFurniture(gf.id, gf.x, gf.z);
            this.build?.setFurnitureBorderColor(gf.id, '#38bdf8');
          }
        }
      } else {
        this.build?.previewFurniture(f.id, f.x, f.z);
        this.updateGizmo(f);
        if (this.highlightedFurnitureId !== f.id) {
          this.build?.setFurnitureBorderColor(f.id, '#d6d6cd');
        }
      }
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.down = null;
    this.setHoveredPlacement(null);
    this.setHoveredGizmo(null);
  };

  private onLeave = () => {
    if (!this.down) {
      this.setHoveredPlacement(null);
      this.setHoveredGizmo(null);
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if ((e.button === 1 || e.button === 2) && e.cancelable) {
      e.preventDefault();
    }
  };

  private onAuxClick = (e: MouseEvent) => {
    if (e.cancelable) e.preventDefault();
  };

  private onTouchMove = (e: TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.overflow-y-auto, .overflow-auto, textarea, input, select')) return;
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  private onGesture = (e: Event) => {
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  private getSelectedObjectPosition(): THREE.Vector3 | null {
    if (this.selected) {
      const placement = this.build?.placements.get(this.selected);
      if (placement) {
        return placement.pos.clone();
      }
      if (this.data) {
        const f = this.data.furniture.find((item) => item.id === this.selected);
        if (f) {
          const o = roomOrigin(this.data, f.roomId);
          return new THREE.Vector3(o.x + f.x, f.height / 2, o.z + f.z);
        }
      }
    }
    const labelPos = this.authoring.getSelectedLabelPosition();
    if (labelPos) {
      return labelPos;
    }
    return null;
  }

  private onWheel = (e: WheelEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.overflow-y-auto, .overflow-auto, textarea, input, select')) {
      return;
    }
    if (e.cancelable) e.preventDefault();

    this.customView = true;
    this.transition?.stop();

    let deltaY = e.deltaY;
    if (e.deltaMode === 1) deltaY *= 20;
    else if (e.deltaMode === 2) deltaY *= 400;

    const clampedDelta = THREE.MathUtils.clamp(deltaY, -120, 120);
    const factor = Math.pow(1.0018, clampedDelta);

    const minSpan = 0.7;
    const maxSpan = Math.max(20, this.overviewSpan() * 1.8);
    const oldSpan = this.span;
    const newSpan = THREE.MathUtils.clamp(oldSpan * factor, minSpan, maxSpan);

    if (Math.abs(newSpan - oldSpan) > 0.001) {
      const rect = this.options.canvas.getBoundingClientRect();
      const rawNdcX = rect.width > 0 ? ((e.clientX - rect.left) / rect.width) * 2 - 1 : 0;
      const rawNdcY = rect.height > 0 ? -((e.clientY - rect.top) / rect.height) * 2 + 1 : 0;

      const dSpan = newSpan - oldSpan;
      const { shiftX, shiftZ } = calculateWheelShift(rawNdcX, rawNdcY, dSpan, this.aspect);

      const camRight = new THREE.Vector3();
      const camUp = new THREE.Vector3();
      this.camera.matrixWorld.extractBasis(camRight, camUp, new THREE.Vector3());

      camRight.y = 0;
      if (camRight.lengthSq() > 1e-6) {
        camRight.normalize();
      } else {
        camRight.set(1, 0, 0);
      }

      camUp.y = 0;
      if (camUp.lengthSq() > 1e-6) {
        camUp.normalize();
      } else {
        camUp.set(0, 0, -1);
      }

      const selectedPos = this.getSelectedObjectPosition();
      const bounds = this.data ? workshopBounds(this.data) : null;
      const nextTarget = calculateZoomTarget(
        this.target,
        clampedDelta,
        selectedPos,
        camRight,
        camUp,
        shiftX,
        shiftZ,
        bounds
      );

      this.target.set(nextTarget.x, nextTarget.y, nextTarget.z);
      this.span = newSpan;
      this.invalidate();
      this.saveCameraDebounced();
    }
  };

  private onMenu = (e: Event) => {
    if (e.cancelable) e.preventDefault();
  };

  private onVisibility = () => {
    if (document.hidden) {
      if (this.frame !== null) {
        cancelAnimationFrame(this.frame);
        this.frame = null;
      }
      this.transition?.stop();
    } else {
      this.invalidate();
    }
  };

  private onLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    this.transition?.stop();
    this.options.onError('Видеоконтекст потерян. Ожидаем восстановления…');
  };

  private prepareEnvironment() {
    const revision = ++this.environmentRevision;
    this.environment?.dispose();
    const studio = new RoomEnvironment(),
      generator = new THREE.PMREMGenerator(this.renderer);
    this.environment = generator.fromScene(studio, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = .48;
    studio.dispose();
    generator.dispose();
    void new HDRLoader().loadAsync('/images/workshop/studio-softbox.hdr').then(texture => {
      if(this.disposed || this.lost || revision!==this.environmentRevision){texture.dispose();return;}
      const pmrem=new THREE.PMREMGenerator(this.renderer);
      try {
        const environment=pmrem.fromEquirectangular(texture);
        this.environment?.dispose();
        this.environment=environment;
        this.scene.environment=environment.texture;
        this.scene.environmentIntensity=.55;
        this.options.canvas.dataset.environment='studio-hdri';
        this.invalidate();
      } finally {texture.dispose();pmrem.dispose();}
    }).catch(() => {
      // The synchronous studio environment remains usable offline / on failed fetch.
      if(!this.disposed && revision===this.environmentRevision)this.options.canvas.dataset.environment='studio-fallback';
    });
  }

  private onRestored = () => {
    this.lost = false;
    this.prepareEnvironment();
    this.presentation.dispose();
    this.presentation = new ScenePresentation(this.renderer, this.scene, this.camera);
    this.presentation.resize(this.options.container.clientWidth, this.options.container.clientHeight);
    this.renderer.shadowMap.needsUpdate = true;
    this.options.onReady();
    this.invalidate();
  };

  private resize = () => {
    if (this.disposed) return;
    this.renderer.setSize(this.options.container.clientWidth, this.options.container.clientHeight, false);
    this.presentation.resize(this.options.container.clientWidth, this.options.container.clientHeight);
    this.invalidate();
  };

  private invalidate = () => {
    if (this.frame !== null || this.disposed || this.lost || document.hidden) return;
    this.frame = requestAnimationFrame(this.render);
  };

  private render = () => {
    this.frame = null;
    const half = this.span / 2;
    Object.assign(this.camera, {
      left: -half * this.aspect,
      right: half * this.aspect,
      top: half,
      bottom: -half,
    });
    this.camera.position
      .copy(this.target)
      .add(
        this.top
          ? new THREE.Vector3(0, 30, 0.001)
          : new THREE.Vector3(26 * Math.sin(this.azimuth), this.elevation, 26 * Math.cos(this.azimuth))
      );
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.authoring.project();
    this.renderer.info.reset();
    this.presentation.render(this.top);
    this.options.canvas.dataset.drawCalls = String(this.renderer.info.render.calls);
    if (this.hoveredPlacementId) {
      this.updateHoverPlacementBadge();
    }
    this.updateLabelTransform();
  };

  dispose() {
    this.disposed = true;
    this.authoring.dispose();
    this.transition?.stop();
    if (this.saveCameraTimer !== null) {
      clearTimeout(this.saveCameraTimer);
      this.saveCameraTimer = null;
    }
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    if (this.hoverRaf !== null) cancelAnimationFrame(this.hoverRaf);
    if (this.beaconRaf !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.beaconRaf);
      this.beaconRaf = null;
    }
    if (this.beaconTimer !== null) {
      clearTimeout(this.beaconTimer);
      this.beaconTimer = null;
    }
    this.searchBeaconGroup.removeFromParent();
    this.beaconRingMesh?.geometry.dispose();
    this.beaconMaterial?.dispose();
    this.observer.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    this.gizmoGroup.removeFromParent();
    this.arrowPosX.geometry.dispose();
    this.rotateBtn.geometry.dispose();
    this.rotateIcon.geometry.dispose();
    this.deleteCross1.geometry.dispose();
    this.gizmoMatArrow.dispose();
    this.gizmoMatRotate.dispose();
    this.gizmoMatDelete.dispose();
    this.gizmoMatWhite.dispose();
    this.gizmoMatHover.dispose();
    this.gizmoMatDeleteHover.dispose();
    const c = this.options.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onCancel);
    c.removeEventListener('pointerleave', this.onLeave);
    c.removeEventListener('mousedown', this.onMouseDown);
    c.removeEventListener('auxclick', this.onAuxClick);
    c.removeEventListener('contextmenu', this.onMenu);
    c.removeEventListener('webglcontextlost', this.onLost);
    c.removeEventListener('webglcontextrestored', this.onRestored);

    this.options.container.removeEventListener('wheel', this.onWheel);
    this.options.container.removeEventListener('touchmove', this.onTouchMove);
    this.options.container.removeEventListener('gesturestart', this.onGesture);
    this.options.container.removeEventListener('gesturechange', this.onGesture);
    this.options.container.removeEventListener('gestureend', this.onGesture);
    this.options.container.removeEventListener('contextmenu', this.onMenu);

    document.removeEventListener('visibilitychange', this.onVisibility);
    this.build?.dispose();
    this.inspectionRig.removeFromParent();
    this.inspectionChamberLight.dispose();
    this.inspectionSpotlight.dispose();
    this.key.shadow.dispose();
    this.scene.environment = null;
    this.environment?.dispose();
    this.presentation.dispose();
    this.renderer.dispose();
    releaseAssets();
  }
}

export function getWorkshopShadowConfig(containerWidth: number) {
  const shadowSize = containerWidth > 900 ? 2048 : 1024;
  return {
    shadowSize,
    radius: 2.5,
    shadowMapType: THREE.PCFShadowMap,
  };
}

export { calculateRoomCameraFocus, calculateWheelShift, calculateZoomTarget } from './model';

