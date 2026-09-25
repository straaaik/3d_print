import * as THREE from 'three';
import {
  resizeRoom,
  resizeFurnitureOnGrid,
  createFurniture,
  roomOrigin,
  snap,
  validFurniture,
  defaultRoomLabels,
  isTileOccupiedByRooms,
  existingRoomsTileBounds,
  fillEnclosedTiles,
  type Furniture,
  type FurnitureKind,
  type Room,
  type RoomSide,
  type RoomLabel,
  type Workshop,
} from './model';
import { occupiedSides } from './spatialScene';
import { ReferenceSceneParts } from './referenceSceneParts';
import type { Assets } from './sceneGeometry';

type Surface = 'floor' | RoomSide;

export interface SpatialCallbacks {
  onRoomSelect?: (id: string) => void;
  onResizeRoom?: (id: string, width: number, depth: number) => void;
  onDeleteRoom?: (id: string) => void;
  onResizeFurniture?: (id: string, width: number, depth: number) => void;
  onCreateFurniture?: (roomId: string, kind: FurnitureKind, x: number, z: number, width: number, depth: number) => void;
  onLabelSelect?: (roomId: string, labelId: string) => void;
  onLabelEditStart?: (roomId: string, labelId: string) => void;
  onMoveLabel?: (roomId: string, labelId: string, u: number, v: number, surface?: Surface) => void;
  onUpdateLabel?: (roomId: string, labelId: string, patch: Partial<RoomLabel>) => void;
  onDeleteLabel?: (roomId: string, labelId: string) => void;
  onPlaceLabel?: (roomId: string, surface: Surface, u: number, v: number, text?: string, color?: string, size?: number, rotation?: number) => void;
  onAuthoringHint?: (text: string | null) => void;
}

type Draft =
  | { type: 'room'; roomId: string; width: number; depth: number; snapped?: boolean }
  | { type: 'resize'; id: string; width: number; depth: number; axis: 'width' | 'depth' }
  | { type: 'furniture'; kind: FurnitureKind; roomId?: string; anchor?: THREE.Vector3; x: number; z: number; width: number; depth: number }
  | { type: 'label'; surface?: Surface; text?: string; color?: string; size?: number; rotation?: number };

export const hudButtonTextureCache = new Map<string, THREE.CanvasTexture>();

function makeCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  width = 512,
  height = 256
): THREE.CanvasTexture {
  let canvas: HTMLCanvasElement;
  if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      draw(ctx, width, height);
    }
  } else {
    canvas = { width, height } as HTMLCanvasElement;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export function getOrCreateHudButtonTexture(
  text: string,
  color: string,
  w: number
): THREE.CanvasTexture {
  const key = `${text}:${color}:${w}`;
  let texture = hudButtonTextureCache.get(key);
  if (!texture) {
    texture = makeCanvasTexture((ctx, cw, ch) => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, cw - 4, ch - 4);
      ctx.fillStyle = color;
      ctx.font = 'bold 64px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cw / 2, ch / 2);
    }, 128, 128);
    texture.userData = { isCached: true };
    hudButtonTextureCache.set(key, texture);
  }
  return texture;
}

export function clearHudButtonTextureCache(): void {
  for (const texture of hudButtonTextureCache.values()) {
    texture.dispose();
  }
  hudButtonTextureCache.clear();
}


function createGridGeometry(width: number, depth: number, step = 1.0): THREE.BufferGeometry {
  const points: number[] = [];
  const halfW = width / 2;
  const halfD = depth / 2;
  const y = 0.035;

  for (let x = -halfW; x <= halfW + 1e-4; x += step) {
    points.push(x, y, -halfD, x, y, halfD);
  }
  if (points.length >= 6 && Math.abs(points[points.length - 6] - halfW) > 1e-3) {
    points.push(halfW, y, -halfD, halfW, y, halfD);
  }

  for (let z = -halfD; z <= halfD + 1e-4; z += step) {
    points.push(-halfW, y, z, halfW, y, z);
  }
  if (points.length >= 6 && Math.abs(points[points.length - 2] - halfD) > 1e-3) {
    points.push(-halfW, y, halfD, halfW, y, halfD);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geom;
}

function createBoxOutlineGeometry(width: number, depth: number, y = 0.04): THREE.BufferGeometry {
  const halfW = width / 2;
  const halfD = depth / 2;
  const points = [
    new THREE.Vector3(-halfW, y, -halfD),
    new THREE.Vector3(halfW, y, -halfD),
    new THREE.Vector3(halfW, y, halfD),
    new THREE.Vector3(-halfW, y, halfD),
  ];
  return new THREE.BufferGeometry().setFromPoints(points);
}

export class SpatialAuthoring {
  private controlsGroup = new THREE.Group();
  private controlsMeshes: THREE.Mesh[] = [];
  private hoveredMesh: THREE.Mesh | null = null;

  // 3D Ghost elements for building/resizing rooms and furniture by squares
  private ghostGroup = new THREE.Group();
  private ghostSubfloor: THREE.Mesh;
  private ghostFloor: THREE.Mesh;
  private ghostGrid: THREE.LineSegments;
  private ghostOutline: THREE.LineLoop;

  // 3D Dynamic furniture preview for real-time model scaling (not just a flat box)
  private referenceParts: ReferenceSceneParts | null = null;
  private furniturePreviewGroup = new THREE.Group();
  private previewOutline: THREE.LineLoop;
  private hiddenFurnitureId: string | null = null;
  private activeGripMesh: THREE.Mesh | null = null;

  // Interactive Grid Room Builder (Cell-Grid Room Builder)
  private gridBuilderActive = false;
  private gridBuilderTool: 'brush' | 'eraser' = 'brush';
  private isDrawingGrid = false;
  private draftTiles = new Map<string, [number, number]>();
  private draftTileMeshes = new Map<string, THREE.Group>();
  private gridBuilderGroup = new THREE.Group();
  private gridDarkPlane: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private gridTilesGroup = new THREE.Group();
  private cellHoverGroup: THREE.Group;
  private cellHoverFill: THREE.Mesh;
  private cellHoverOutline: THREE.LineLoop;
  private onDraftTilesChange?: (count: number) => void;

  private draft: Draft | null = null;
  private pressed: { x: number; y: number } | null = null;
  private state: Workshop | null = null;
  private edit = false;
  private selected: string | null = null;
  private activeRoom: string | null = null;
  private selectedLabelId: string | null = null;
  private draggingLabel: {
    roomId: string;
    labelId: string;
    surface: Surface;
    startU: number;
    startV: number;
    currentU: number;
    currentV: number;
    hasMoved: boolean;
  } | null = null;
  private labelHudGroup: THREE.Group | null = null;
  private selectedLabelFrame: THREE.LineSegments | null = null;
  private labelPreviewGroup = new THREE.Group();
  private labelPreviewMesh: THREE.Mesh | null = null;
  private labelPreviewFrame: THREE.LineSegments | null = null;
  private currentPreviewKey = '';
  private lastHit: { room: Room; surface: Surface; p: THREE.Vector3; u: number; v: number } | null = null;
  private interactingWithControl = false;
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private valid = true;

  constructor(
    private container: HTMLElement,
    private canvas: HTMLCanvasElement,
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private callbacks: SpatialCallbacks,
    private invalidate: () => void
  ) {
    this.scene.add(this.controlsGroup);
    this.scene.add(this.labelPreviewGroup);
    this.labelPreviewGroup.visible = false;

    // Ghost 3D Room Floor Slab elements initialization
    this.ghostSubfloor = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.8,
        metalness: 0.1,
      })
    );

    this.ghostFloor = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: '#0284c7',
        transparent: true,
        opacity: 0.65,
        roughness: 0.4,
        metalness: 0.1,
      })
    );

    this.ghostGrid = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: '#38bdf8',
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      })
    );

    this.ghostOutline = new THREE.LineLoop(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: '#7dd3fc',
        depthTest: false,
      })
    );

    this.ghostGroup.add(this.ghostSubfloor, this.ghostFloor, this.ghostGrid, this.ghostOutline);
    this.ghostGroup.visible = false;
    this.scene.add(this.ghostGroup);

    // 3D Furniture Live Preview initialization
    this.previewOutline = new THREE.LineLoop(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: '#38bdf8',
        depthTest: false,
      })
    );
    this.scene.add(this.furniturePreviewGroup);
    this.scene.add(this.previewOutline);
    this.furniturePreviewGroup.visible = false;
    this.previewOutline.visible = false;

    // Interactive Grid Room Builder (Cell-Grid Room Builder) initialization
    this.gridDarkPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#182232', depthWrite: false })
    );
    this.gridDarkPlane.position.y = 0.001;

    this.gridHelper = new THREE.GridHelper(80, 80, '#94a3b8', '#475569');
    this.gridHelper.position.y = 0.003;

    this.cellHoverFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: '#94a3b8',
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    );
    this.cellHoverOutline = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.48, 0, -0.48),
        new THREE.Vector3(0.48, 0, -0.48),
        new THREE.Vector3(0.48, 0, 0.48),
        new THREE.Vector3(-0.48, 0, 0.48),
      ]),
      new THREE.LineBasicMaterial({ color: '#f1f5f9', depthTest: false })
    );
    this.cellHoverGroup = new THREE.Group();
    this.cellHoverGroup.position.y = 0.026;
    this.cellHoverGroup.add(this.cellHoverFill, this.cellHoverOutline);
    this.cellHoverGroup.visible = false;

    this.gridBuilderGroup.add(this.gridDarkPlane, this.gridHelper, this.gridTilesGroup, this.cellHoverGroup);
    this.gridBuilderGroup.visible = false;
    this.scene.add(this.gridBuilderGroup);
  }

  setAssets(assets: Assets) {
    this.referenceParts = new ReferenceSceneParts({ ...assets });
  }

  update(state: Workshop, edit: boolean, selected: string | null, activeRoom: string | null, selectedLabelId?: string | null) {
    this.state = state;
    this.edit = edit;
    this.selected = selected;
    this.activeRoom = activeRoom;
    if (selectedLabelId !== undefined) {
      this.selectedLabelId = selectedLabelId;
    }
    if (!edit) {
      this.cancel();
      if (this.gridBuilderActive) {
        this.cancelGridRoomBuilder();
      }
    }
    this.rebuildControls();
  }

  setSelectedLabel(id: string | null) {
    this.selectedLabelId = id;
    this.rebuildControls();
    this.invalidate();
  }

  private disposeControls() {
    this.unhover();
    for (const child of this.controlsGroup.children) {
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m.map && !m.map.userData?.isCached) m.map.dispose();
              m.dispose();
            });
          } else if (obj.material) {
            if (obj.material.map && !obj.material.map.userData?.isCached) obj.material.map.dispose();
            obj.material.dispose();
          }
        }
      });
    }
    this.controlsGroup.clear();
    this.controlsMeshes = [];
    this.labelHudGroup = null;
    this.selectedLabelFrame = null;
  }

  private rebuildControls() {
    this.disposeControls();
    if (!this.edit || !this.state || this.draft || this.gridBuilderActive) return;

    // 3D Floating HUD над выбранной надписью
    if (this.selectedLabelId) {
      for (const r of this.state.rooms) {
        const lbl = (r.labels ?? defaultRoomLabels(r)).find((item) => item.id === this.selectedLabelId);
        if (lbl) {
          this.create3DLabelHud(r, lbl);
          break;
        }
      }
    }

    this.invalidate();
  }

  private getLabelHudTransform(room: Room, label: { surface: Surface; u: number; v: number; size: number }) {
    const o = roomOrigin(this.state!, room.id);
    let worldX = o.x + (label.u - 0.5) * room.width;
    let worldZ = o.z + (label.v - 0.5) * room.depth;
    let worldY = 0.65;
    let rotX = 0;
    let rotY = 0;

    if (label.surface === 'floor') {
      worldX = o.x + (label.u - 0.5) * room.width;
      worldZ = o.z + (label.v - 0.5) * room.depth - (label.size / 2 + 0.45);
      worldY = 0.65;
      rotX = -Math.PI / 4;
      rotY = 0;
    } else if (label.surface === 'north') {
      worldX = o.x + (label.u - 0.5) * room.width;
      worldZ = o.z - room.depth / 2 + 0.16;
      worldY = Math.min(2.65, label.v * 2.6 + label.size / 2 + 0.38);
      rotX = 0;
      rotY = 0;
    } else if (label.surface === 'south') {
      worldX = o.x + (label.u - 0.5) * room.width;
      worldZ = o.z + room.depth / 2 - 0.16;
      worldY = Math.min(2.65, label.v * 2.6 + label.size / 2 + 0.38);
      rotX = 0;
      rotY = Math.PI;
    } else if (label.surface === 'west') {
      worldX = o.x - room.width / 2 + 0.16;
      worldZ = o.z + (label.u - 0.5) * room.depth;
      worldY = Math.min(2.65, label.v * 2.6 + label.size / 2 + 0.38);
      rotX = 0;
      rotY = Math.PI / 2;
    } else if (label.surface === 'east') {
      worldX = o.x + room.width / 2 - 0.16;
      worldZ = o.z + (label.u - 0.5) * room.depth;
      worldY = Math.min(2.65, label.v * 2.6 + label.size / 2 + 0.38);
      rotX = 0;
      rotY = -Math.PI / 2;
    }

    return { worldX, worldY, worldZ, rotX, rotY };
  }

  /**
   * 3D Floating Glass HUD над выбранной надписью для быстрого перемещения, смены цвета, размера и удаления
   */
  private create3DLabelHud(room: Room, label: RoomLabel) {
    const t = this.getLabelHudTransform(room, label);

    const hudGroup = new THREE.Group();
    hudGroup.position.set(t.worldX, t.worldY, t.worldZ);
    hudGroup.rotation.set(t.rotX, t.rotY, 0);
    this.labelHudGroup = hudGroup;

    // Стеклянная плашка HUD (action: 'panel' - клики по фону поглощаются, не вызывая перетаскивания)
    const panelGeom = new THREE.BoxGeometry(2.5, 0.44, 0.02);
    const panelMat = new THREE.MeshPhysicalMaterial({
      color: '#071526',
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.4,
      ior: 1.45,
    });
    const panel = new THREE.Mesh(panelGeom, panelMat);
    panel.userData = {
      is3DControl: true,
      type: 'label_hud',
      action: 'panel',
      roomId: room.id,
      labelId: label.id,
    };
    const panelEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(panelGeom),
      new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.7, depthTest: false })
    );
    panel.add(panelEdges);
    hudGroup.add(panel);
    this.controlsMeshes.push(panel);

    // Кнопка ✥ Переместить (Drag)
    const createHudBtn = (x: number, text: string, action: string, w = 0.22, color = '#38bdf8') => {
      const btnGeom = new THREE.BoxGeometry(w, 0.22, 0.04);
      const texture = getOrCreateHudButtonTexture(text, color, w);
      const btnMat = new THREE.MeshStandardMaterial({ map: texture, transparent: true, opacity: 0.98 });
      const btn = new THREE.Mesh(btnGeom, btnMat);
      btn.position.set(x, 0, 0.03);
      btn.userData = {
        is3DControl: true,
        type: 'label_hud',
        action,
        roomId: room.id,
        labelId: label.id,
      };
      hudGroup.add(btn);
      this.controlsMeshes.push(btn);
    };

    createHudBtn(-1.0, '✥', 'drag', 0.24, '#38bdf8');

    // Кнопки цветов
    const colors = ['#ffffff', '#38bdf8', '#f59e0b', '#f43f5e'];
    colors.forEach((col, idx) => {
      const btnGeom = new THREE.BoxGeometry(0.18, 0.18, 0.04);
      const btnMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.45 });
      const btn = new THREE.Mesh(btnGeom, btnMat);
      btn.position.set(-0.68 + idx * 0.22, 0, 0.03);
      btn.userData = {
        is3DControl: true,
        type: 'label_hud',
        action: 'color',
        value: col,
        roomId: room.id,
        labelId: label.id,
      };
      hudGroup.add(btn);
      this.controlsMeshes.push(btn);
    });

    createHudBtn(0.35, '-', 'size_dec');
    createHudBtn(0.60, '+', 'size_inc');
    createHudBtn(0.88, '90°', 'rotate', 0.26);
    createHudBtn(1.12, '✕', 'delete', 0.20, '#f43f5e');

    this.controlsGroup.add(hudGroup);

    // Неоновая рамка выделения прямо вокруг самой надписи
    const o = roomOrigin(this.state!, room.id);
    const width = Math.min(
      label.size * 5.33,
      label.surface === 'east' || label.surface === 'west' ? room.depth - 0.3 : room.width - 0.3
    );
    const labelFrameGeom = new THREE.EdgesGeometry(new THREE.PlaneGeometry(width + 0.08, label.size + 0.08));
    const labelFrameMat = new THREE.LineBasicMaterial({ color: '#38bdf8', depthTest: false, transparent: true, opacity: 0.85 });
    const labelFrame = new THREE.LineSegments(labelFrameGeom, labelFrameMat);
    labelFrame.userData = { is3DControl: true, type: 'label_frame', roomId: room.id, labelId: label.id };

    if (label.surface === 'floor') {
      labelFrame.position.set(o.x + (label.u - 0.5) * room.width, 0.046, o.z + (label.v - 0.5) * room.depth);
      labelFrame.rotation.set(-Math.PI / 2, 0, ((label.rotation ?? 0) * Math.PI) / 180);
    } else if (label.surface === 'north') {
      labelFrame.position.set(o.x + (label.u - 0.5) * room.width, label.v * 2.6, o.z - room.depth / 2 + 0.091);
      labelFrame.rotation.set(0, 0, ((label.rotation ?? 0) * Math.PI) / 180);
    } else if (label.surface === 'south') {
      labelFrame.position.set(o.x + (label.u - 0.5) * room.width, label.v * 2.6, o.z + room.depth / 2 - 0.091);
      labelFrame.rotation.set(0, Math.PI, -((label.rotation ?? 0) * Math.PI) / 180);
    } else if (label.surface === 'west') {
      labelFrame.position.set(o.x - room.width / 2 + 0.091, label.v * 2.6, o.z + (label.u - 0.5) * room.depth);
      labelFrame.rotation.set(0, Math.PI / 2, ((label.rotation ?? 0) * Math.PI) / 180);
    } else if (label.surface === 'east') {
      labelFrame.position.set(o.x + room.width / 2 - 0.091, label.v * 2.6, o.z + (label.u - 0.5) * room.depth);
      labelFrame.rotation.set(0, -Math.PI / 2, -((label.rotation ?? 0) * Math.PI) / 180);
    }
    this.controlsGroup.add(labelFrame);
    this.selectedLabelFrame = labelFrame;
  }

  private findLabelMesh(labelId: string): THREE.Mesh | null {
    let result: THREE.Mesh | null = null;
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData?.labelId === labelId) {
        result = o;
      }
    });
    return result;
  }

  private updateLabelMeshPosition(labelId: string, room: Room, surface: Surface, u: number, v: number) {
    const mesh = this.findLabelMesh(labelId);
    const o = roomOrigin(this.state!, room.id);
    const x = (u - 0.5) * room.width;
    const z = (v - 0.5) * room.depth;
    const y = v * 2.6;

    const lbl = (room.labels ?? defaultRoomLabels(room)).find((l) => l.id === labelId);
    const rotDeg = lbl?.rotation ?? 0;
    const rotRad = (rotDeg * Math.PI) / 180;

    if (mesh) {
      if (surface === 'floor') {
        mesh.position.set(x, 0.045, z);
        mesh.rotation.set(-Math.PI / 2, 0, rotRad);
      } else if (surface === 'north') {
        mesh.position.set(x, y, -room.depth / 2 + 0.09);
        mesh.rotation.set(0, 0, rotRad);
      } else if (surface === 'south') {
        mesh.position.set(x, y, room.depth / 2 - 0.09);
        mesh.rotation.set(0, Math.PI, -rotRad);
      } else if (surface === 'west') {
        mesh.position.set(-room.width / 2 + 0.09, y, (u - 0.5) * room.depth);
        mesh.rotation.set(0, Math.PI / 2, rotRad);
      } else if (surface === 'east') {
        mesh.position.set(room.width / 2 - 0.09, y, (u - 0.5) * room.depth);
        mesh.rotation.set(0, -Math.PI / 2, -rotRad);
      }
    }

    if (this.selectedLabelFrame) {
      if (surface === 'floor') {
        this.selectedLabelFrame.position.set(o.x + x, 0.046, o.z + z);
        this.selectedLabelFrame.rotation.set(-Math.PI / 2, 0, rotRad);
      } else if (surface === 'north') {
        this.selectedLabelFrame.position.set(o.x + x, y, o.z - room.depth / 2 + 0.091);
        this.selectedLabelFrame.rotation.set(0, 0, rotRad);
      } else if (surface === 'south') {
        this.selectedLabelFrame.position.set(o.x + x, y, o.z + room.depth / 2 - 0.091);
        this.selectedLabelFrame.rotation.set(0, Math.PI, -rotRad);
      } else if (surface === 'west') {
        this.selectedLabelFrame.position.set(o.x - room.width / 2 + 0.091, y, o.z + (u - 0.5) * room.depth);
        this.selectedLabelFrame.rotation.set(0, Math.PI / 2, rotRad);
      } else if (surface === 'east') {
        this.selectedLabelFrame.position.set(o.x + room.width / 2 - 0.091, y, o.z + (u - 0.5) * room.depth);
        this.selectedLabelFrame.rotation.set(0, -Math.PI / 2, -rotRad);
      }
    }
  }

  private updateLabelHudPosition(room: Room, surface: Surface, u: number, v: number) {
    if (!this.labelHudGroup || !this.state) return;
    const label = (room.labels ?? defaultRoomLabels(room)).find((l) => l.id === this.selectedLabelId);
    const size = label ? label.size : 0.35;
    const t = this.getLabelHudTransform(room, { surface, u, v, size });
    this.labelHudGroup.position.set(t.worldX, t.worldY, t.worldZ);
    this.labelHudGroup.rotation.set(t.rotX, t.rotY, 0);
  }

  private handleLabelHudClick(u: { action: string; value?: string; roomId: string; labelId: string }) {
    const room = this.state?.rooms.find((r) => r.id === u.roomId);
    if (!room) return;
    const label = (room.labels ?? defaultRoomLabels(room)).find((l) => l.id === u.labelId);
    if (!label) return;

    if (u.action === 'color' && u.value) {
      label.color = u.value;
      this.callbacks.onUpdateLabel?.(room.id, label.id, { color: u.value });
      this.rebuildControls();
    } else if (u.action === 'size_inc') {
      const nextSize = Math.min(5, Number((label.size + 0.05).toFixed(2)));
      label.size = nextSize;
      this.callbacks.onUpdateLabel?.(room.id, label.id, { size: nextSize });
      this.rebuildControls();
    } else if (u.action === 'size_dec') {
      const nextSize = Math.max(0.15, Number((label.size - 0.05).toFixed(2)));
      label.size = nextSize;
      this.callbacks.onUpdateLabel?.(room.id, label.id, { size: nextSize });
      this.rebuildControls();
    } else if (u.action === 'rotate') {
      const nextRot = ((label.rotation ?? 0) + 90) % 360;
      label.rotation = nextRot;
      this.callbacks.onUpdateLabel?.(room.id, label.id, { rotation: nextRot });
      this.rebuildControls();
    } else if (u.action === 'delete') {
      this.selectedLabelId = null;
      this.callbacks.onDeleteLabel?.(room.id, label.id);
      this.rebuildControls();
    }
  }

  private hoverMesh(mesh: THREE.Mesh) {
    this.hoveredMesh = mesh;
    const u = mesh.userData;
    if (u.initialY !== undefined) {
      mesh.position.y = u.initialY + 0.05;
    }
    if (u.outline) {
      const outline = u.outline as THREE.LineSegments;
      if (!Array.isArray(outline.material)) {
        (outline.material as THREE.LineBasicMaterial).color.set('#ffffff');
      }
    }
    this.invalidate();
  }

  private unhover() {
    if (!this.hoveredMesh) return;
    const u = this.hoveredMesh.userData;
    if (u.initialY !== undefined) {
      this.hoveredMesh.position.y = u.initialY;
    }
    if (u.outline) {
      const origColor =
        u.type === 'room_delete'
          ? '#f43f5e'
          : u.type === 'furniture_resize'
          ? '#c084fc'
          : '#38bdf8';
      const outline = u.outline as THREE.LineSegments;
      if (!Array.isArray(outline.material)) {
        (outline.material as THREE.LineBasicMaterial).color.set(origColor);
      }
    }
    this.hoveredMesh = null;
    this.invalidate();
  }

  private start(draft: Draft, e?: PointerEvent) {
    this.draft = draft;
    this.pressed = e && e.pointerId ? { x: e.clientX, y: e.clientY } : null;
    if (e?.pointerId) this.canvas.setPointerCapture(e.pointerId);
    this.callbacks.onAuthoringHint?.('Измените размер по квадратам. Кликните для подтверждения; Esc — отмена.');
    this.rebuildControls();
    this.invalidate();
  }

  beginFurniture(kind: FurnitureKind) {
    if (!this.edit) return;
    this.start({ type: 'furniture', kind, width: 1, depth: 1, x: 0, z: 0 });
    this.callbacks.onAuthoringHint?.('Нажмите на пол и протяните размер мебели. Второй щелчок подтверждает. Esc — отмена.');
  }

  beginLabel(surface?: Surface, text?: string, color?: string, size = 0.35, rotation = 0) {
    if (this.edit) {
      this.selectedLabelId = null;
      this.start({ type: 'label', surface, text, color, size, rotation });
      this.callbacks.onAuthoringHint?.('Нажмите на пол или стену, чтобы нанести надпись. Esc — отмена.');
    }
  }

  updateDraftLabel(patch: { text?: string; color?: string; size?: number; rotation?: number }) {
    if (this.draft?.type !== 'label') return;
    if (patch.text !== undefined) this.draft.text = patch.text;
    if (patch.color !== undefined) this.draft.color = patch.color;
    if (patch.size !== undefined) this.draft.size = patch.size;
    if (patch.rotation !== undefined) this.draft.rotation = patch.rotation;
    this.currentPreviewKey = '';
    if (this.lastHit) {
      this.updateLabelPreview(this.lastHit);
    }
    this.invalidate();
  }

  startDraggingSelectedLabel(e: PointerEvent): boolean {
    if (!this.selectedLabelId || !this.state) return false;
    for (const room of this.state.rooms) {
      const lbl = (room.labels ?? defaultRoomLabels(room)).find((item) => item.id === this.selectedLabelId);
      if (lbl) {
        this.draggingLabel = {
          roomId: room.id,
          labelId: lbl.id,
          surface: lbl.surface,
          startU: lbl.u,
          startV: lbl.v,
          currentU: lbl.u,
          currentV: lbl.v,
          hasMoved: false,
        };
        if (typeof this.canvas.setPointerCapture === 'function' && e.pointerId !== undefined) {
          try {
            this.canvas.setPointerCapture(e.pointerId);
          } catch {}
        }
        this.callbacks.onAuthoringHint?.('Перетаскивайте надпись по поверхности. Отпустите для подтверждения.');
        this.invalidate();
        return true;
      }
    }
    return false;
  }

  getLabelPreviewPosition(): { worldPos: THREE.Vector3; surface: Surface; roomId: string } | null {
    if (!this.draft || this.draft.type !== 'label' || !this.lastHit) return null;
    return {
      worldPos: this.lastHit.p.clone(),
      surface: this.lastHit.surface,
      roomId: this.lastHit.room.id,
    };
  }

  isLabelPreviewVisible(): boolean {
    return this.labelPreviewGroup.visible && this.draft?.type === 'label';
  }

  cancel() {
    if (this.gridBuilderActive) {
      this.cancelGridRoomBuilder();
    }
    this.cleanupFurniturePreview();
    this.cleanupLabelPreview();
    this.draft = null;
    this.pressed = null;
    this.draggingLabel = null;
    this.ghostGroup.visible = false;
    this.callbacks.onAuthoringHint?.(null);
    this.rebuildControls();
    this.invalidate();
  }

  private cleanupLabelPreview() {
    this.labelPreviewGroup.visible = false;
    this.currentPreviewKey = '';
    this.lastHit = null;
    if (this.labelPreviewMesh) {
      if (this.labelPreviewMesh.material instanceof THREE.Material) {
        if ((this.labelPreviewMesh.material as any).map) (this.labelPreviewMesh.material as any).map.dispose();
        this.labelPreviewMesh.material.dispose();
      }
      this.labelPreviewMesh.geometry.dispose();
      this.labelPreviewGroup.remove(this.labelPreviewMesh);
      this.labelPreviewMesh = null;
    }
    if (this.labelPreviewFrame) {
      this.labelPreviewFrame.geometry.dispose();
      (this.labelPreviewFrame.material as THREE.Material).dispose();
      this.labelPreviewGroup.remove(this.labelPreviewFrame);
      this.labelPreviewFrame = null;
    }
  }

  findSurfaceHitForRoom(
    e: PointerEvent,
    room: Room
  ): { surface: Surface; p: THREE.Vector3; u: number; v: number } | null {
    if (!this.state) return null;
    this.cast(e);
    const o = roomOrigin(this.state, room.id);
    const occupied = occupiedSides(this.state, room);
    const surfaces: Surface[] = [
      'floor',
      'north',
      'west',
      ...(['east', 'south'] as const).filter((side) => occupied.has(side)),
    ];

    const hits: { surface: Surface; p: THREE.Vector3; distance: number; u: number; v: number }[] = [];

    for (const surface of surfaces) {
      const normal =
        surface === 'floor'
          ? new THREE.Vector3(0, 1, 0)
          : surface === 'north' || surface === 'south'
          ? new THREE.Vector3(0, 0, 1)
          : new THREE.Vector3(1, 0, 0);

      const constant =
        surface === 'floor'
          ? 0
          : surface === 'north'
          ? -(o.z - room.depth / 2)
          : surface === 'south'
          ? -(o.z + room.depth / 2)
          : surface === 'west'
          ? -(o.x - room.width / 2)
          : -(o.x + room.width / 2);

      const p = this.ray.ray.intersectPlane(new THREE.Plane(normal, constant), new THREE.Vector3());
      if (
        !p ||
        p.y < -0.01 ||
        p.y > 2.6 ||
        Math.abs(p.x - o.x) > room.width / 2 + 0.05 ||
        Math.abs(p.z - o.z) > room.depth / 2 + 0.05
      )
        continue;

      const u =
        surface === 'east' || surface === 'west'
          ? (p.z - o.z) / room.depth + 0.5
          : (p.x - o.x) / room.width + 0.5;
      const v = surface === 'floor' ? (p.z - o.z) / room.depth + 0.5 : p.y / 2.6;

      hits.push({
        surface,
        p,
        distance: p.distanceTo(this.ray.ray.origin),
        u: THREE.MathUtils.clamp(u, 0.05, 0.95),
        v: THREE.MathUtils.clamp(v, 0.05, 0.95),
      });
    }

    hits.sort((a, b) => a.distance - b.distance);
    return hits[0] ?? null;
  }

  private findSurfaceHit(e: PointerEvent): { room: Room; surface: Surface; p: THREE.Vector3; u: number; v: number } | null {
    if (!this.state || !this.draft || this.draft.type !== 'label') {
      this.lastHit = null;
      return null;
    }
    this.cast(e);
    const hits: { room: Room; surface: Surface; p: THREE.Vector3; distance: number }[] = [];
    for (const room of this.state.rooms) {
      const o = roomOrigin(this.state, room.id);
      const occupied = occupiedSides(this.state, room);
      const surfaces: Surface[] = this.draft.surface
        ? [this.draft.surface]
        : ['floor', 'north', 'west', ...(['east', 'south'] as const).filter((side) => occupied.has(side))];

      for (const surface of surfaces) {
        const normal =
          surface === 'floor'
            ? new THREE.Vector3(0, 1, 0)
            : surface === 'north' || surface === 'south'
            ? new THREE.Vector3(0, 0, 1)
            : new THREE.Vector3(1, 0, 0);

        const constant =
          surface === 'floor'
            ? 0
            : surface === 'north'
            ? -(o.z - room.depth / 2)
            : surface === 'south'
            ? -(o.z + room.depth / 2)
            : surface === 'west'
            ? -(o.x - room.width / 2)
            : -(o.x + room.width / 2);

        const p = this.ray.ray.intersectPlane(new THREE.Plane(normal, constant), new THREE.Vector3());
        if (!p || p.y < -0.01 || p.y > 2.6 || Math.abs(p.x - o.x) > room.width / 2 + 0.01 || Math.abs(p.z - o.z) > room.depth / 2 + 0.01) continue;
        hits.push({ room, surface, p, distance: p.distanceTo(this.ray.ray.origin) });
      }
    }
    const hit = hits.sort((a, b) => a.distance - b.distance)[0];
    if (!hit) {
      this.lastHit = null;
      return null;
    }

    const o = roomOrigin(this.state, hit.room.id);
    const u =
      hit.surface === 'east' || hit.surface === 'west'
        ? (hit.p.z - o.z) / hit.room.depth + 0.5
        : (hit.p.x - o.x) / hit.room.width + 0.5;
    const v = hit.surface === 'floor' ? (hit.p.z - o.z) / hit.room.depth + 0.5 : hit.p.y / 2.6;

    const res = {
      room: hit.room,
      surface: hit.surface,
      p: hit.p,
      u: THREE.MathUtils.clamp(u, 0.05, 0.95),
      v: THREE.MathUtils.clamp(v, 0.05, 0.95),
    };
    this.lastHit = res;
    return res;
  }

  private updateLabelPreview(hit: { room: Room; surface: Surface; p: THREE.Vector3; u: number; v: number } | null) {
    if (!hit || !this.draft || this.draft.type !== 'label') {
      this.labelPreviewGroup.visible = false;
      return;
    }

    const text = this.draft.text && this.draft.text.trim() ? this.draft.text.trim() : 'Новая надпись';
    const color = this.draft.color || '#38bdf8';
    const size = this.draft.size || 0.35;
    const rotation = this.draft.rotation || 0;
    const rotRad = (rotation * Math.PI) / 180;
    const previewKey = `${text}_${color}_${size}_${rotation}`;

    if (!this.labelPreviewMesh || this.currentPreviewKey !== previewKey) {
      this.currentPreviewKey = previewKey;
      if (this.labelPreviewMesh) {
        if (this.labelPreviewMesh.material instanceof THREE.Material) {
          if ((this.labelPreviewMesh.material as any).map) (this.labelPreviewMesh.material as any).map.dispose();
          this.labelPreviewMesh.material.dispose();
        }
        this.labelPreviewMesh.geometry.dispose();
        this.labelPreviewGroup.remove(this.labelPreviewMesh);
        this.labelPreviewMesh = null;
      }
      if (this.labelPreviewFrame) {
        this.labelPreviewFrame.geometry.dispose();
        (this.labelPreviewFrame.material as THREE.Material).dispose();
        this.labelPreviewGroup.remove(this.labelPreviewFrame);
        this.labelPreviewFrame = null;
      }

      const texture = makeCanvasTexture((ctx, cw, ch) => {
        ctx.fillStyle = color;
        ctx.font = '600 104px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, cw / 2, ch / 2, cw - 32);
      }, 1024, 192);

      const w = size * 5.33;
      const geom = new THREE.PlaneGeometry(w, size);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.labelPreviewMesh = new THREE.Mesh(geom, mat);
      this.labelPreviewGroup.add(this.labelPreviewMesh);

      const frameGeom = new THREE.EdgesGeometry(geom);
      const frameMat = new THREE.LineBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.8,
        depthTest: false,
      });
      this.labelPreviewFrame = new THREE.LineSegments(frameGeom, frameMat);
      this.labelPreviewGroup.add(this.labelPreviewFrame);
    }

    const o = roomOrigin(this.state!, hit.room.id);
    if (hit.surface === 'floor') {
      this.labelPreviewGroup.position.set(hit.p.x, 0.046, hit.p.z);
      this.labelPreviewGroup.rotation.set(-Math.PI / 2, 0, rotRad);
    } else if (hit.surface === 'north') {
      this.labelPreviewGroup.position.set(hit.p.x, hit.p.y, o.z - hit.room.depth / 2 + 0.091);
      this.labelPreviewGroup.rotation.set(0, 0, rotRad);
    } else if (hit.surface === 'south') {
      this.labelPreviewGroup.position.set(hit.p.x, hit.p.y, o.z + hit.room.depth / 2 - 0.091);
      this.labelPreviewGroup.rotation.set(0, Math.PI, -rotRad);
    } else if (hit.surface === 'west') {
      this.labelPreviewGroup.position.set(o.x - hit.room.width / 2 + 0.091, hit.p.y, hit.p.z);
      this.labelPreviewGroup.rotation.set(0, Math.PI / 2, rotRad);
    } else if (hit.surface === 'east') {
      this.labelPreviewGroup.position.set(o.x + hit.room.width / 2 - 0.091, hit.p.y, hit.p.z);
      this.labelPreviewGroup.rotation.set(0, -Math.PI / 2, -rotRad);
    }
    this.labelPreviewGroup.visible = true;
  }

  private createDraftTileGroup(): THREE.Group {
    const group = new THREE.Group();
    const subfloor = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.34, 1.0),
      new THREE.MeshStandardMaterial({
        color: '#334155',
        roughness: 0.8,
        metalness: 0.1,
      })
    );
    subfloor.position.y = -0.17;

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(0.98, 0.05, 0.98),
      new THREE.MeshStandardMaterial({
        color: '#64748b',
        roughness: 0.4,
        metalness: 0.15,
      })
    );
    slab.position.y = 0.025;

    const outline = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.49, 0.051, -0.49),
        new THREE.Vector3(0.49, 0.051, -0.49),
        new THREE.Vector3(0.49, 0.051, 0.49),
        new THREE.Vector3(-0.49, 0.051, 0.49),
      ]),
      new THREE.LineBasicMaterial({ color: '#cbd5e1', depthTest: false })
    );

    group.add(subfloor, slab, outline);
    return group;
  }

  cancelDraft() {
    this.cancel();
  }

  getActiveDraft(): Draft | null {
    return this.draft;
  }

  getDraftTiles(): Array<[number, number]> {
    return Array.from(this.draftTiles.values());
  }

  getGridBuilderTool(): 'brush' | 'eraser' {
    return this.gridBuilderTool;
  }

  getCellHoverFillColor(): string {
    const mat = this.cellHoverFill.material as THREE.MeshBasicMaterial;
    return `#${mat.color.getHexString()}`;
  }

  private applyGridTool(gx: number, gz: number, tool: 'brush' | 'eraser' = this.gridBuilderTool) {
    const key = `${gx},${gz}`;
    if (tool === 'brush') {
      if (this.state && isTileOccupiedByRooms(this.state, gx, gz)) {
        return;
      }
      if (!this.draftTiles.has(key)) {
        this.draftTiles.set(key, [gx, gz]);
        const tileMesh = this.createDraftTileGroup();
        tileMesh.position.set(gx + 0.5, 0, gz + 0.5);
        this.gridTilesGroup.add(tileMesh);
        this.draftTileMeshes.set(key, tileMesh);
        this.onDraftTilesChange?.(this.draftTiles.size);
      }
    } else if (tool === 'eraser') {
      if (this.draftTiles.has(key)) {
        this.draftTiles.delete(key);
        const tileMesh = this.draftTileMeshes.get(key);
        if (tileMesh) {
          tileMesh.traverse((obj) => {
            if (obj instanceof THREE.Mesh || obj instanceof THREE.LineLoop) {
              obj.geometry.dispose();
              if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
              else obj.material.dispose();
            }
          });
          tileMesh.removeFromParent();
          this.draftTileMeshes.delete(key);
        }
        this.onDraftTilesChange?.(this.draftTiles.size);
      }
    }
  }

  private updateGridHover(gx: number, gz: number, isEraser?: boolean) {
    this.cellHoverGroup.position.set(gx + 0.5, 0.026, gz + 0.5);
    this.cellHoverGroup.visible = true;
    const isOccupied = this.state ? isTileOccupiedByRooms(this.state, gx, gz) : false;
    const eraser = isEraser ?? (this.gridBuilderTool === 'eraser');
    if (eraser) {
      (this.cellHoverFill.material as THREE.MeshBasicMaterial).color.set('#ef4444');
      (this.cellHoverOutline.material as THREE.LineBasicMaterial).color.set('#f87171');
      this.canvas.style.cursor = 'crosshair';
    } else if (isOccupied) {
      (this.cellHoverFill.material as THREE.MeshBasicMaterial).color.set('#ef4444');
      (this.cellHoverOutline.material as THREE.LineBasicMaterial).color.set('#f87171');
      this.canvas.style.cursor = 'not-allowed';
    } else {
      (this.cellHoverFill.material as THREE.MeshBasicMaterial).color.set('#94a3b8');
      (this.cellHoverOutline.material as THREE.LineBasicMaterial).color.set('#f1f5f9');
      this.canvas.style.cursor = 'cell';
    }
  }

  startGridRoomBuilder(tool: 'brush' | 'eraser' = 'brush', onDraftChange?: (count: number) => void) {
    this.cancel();
    this.gridBuilderActive = true;
    this.gridBuilderTool = tool;
    this.onDraftTilesChange = onDraftChange;
    this.clearDraftTiles();
    this.gridBuilderGroup.visible = true;
    this.controlsGroup.visible = false;
    this.unhover();
    this.onDraftTilesChange?.(0);
    this.canvas.style.cursor = tool === 'eraser' ? 'crosshair' : 'cell';
    this.invalidate();
  }

  setGridRoomBuilderTool(tool: 'brush' | 'eraser') {
    this.gridBuilderTool = tool;
    this.canvas.style.cursor = tool === 'eraser' ? 'crosshair' : 'cell';
    this.invalidate();
  }

  finishGridRoomBuilder(): Array<[number, number]> | null {
    if (!this.gridBuilderActive) return null;
    const tiles = Array.from(this.draftTiles.values());
    this.cancelGridRoomBuilder();
    return tiles.length > 0 ? tiles : null;
  }

  cancelGridRoomBuilder() {
    this.clearDraftTiles();
    this.gridBuilderActive = false;
    this.isDrawingGrid = false;
    this.gridBuilderGroup.visible = false;
    this.cellHoverGroup.visible = false;
    this.controlsGroup.visible = true;
    this.canvas.style.cursor = 'default';
    this.onDraftTilesChange?.(0);
    this.rebuildControls();
    this.invalidate();
  }

  isGridRoomBuilderActive(): boolean {
    return this.gridBuilderActive;
  }

  private clearDraftTiles() {
    this.draftTiles.clear();
    for (const [, tileMesh] of this.draftTileMeshes) {
      tileMesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineLoop) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      tileMesh.removeFromParent();
    }
    this.draftTileMeshes.clear();
  }

  private setFurnitureMeshVisibility(id: string | null, visible: boolean) {
    if (!id) return;
    this.scene.traverse((obj) => {
      if (obj.userData?.furnitureId === id) {
        obj.visible = visible;
      }
    });
    this.invalidate();
  }

  public cleanupFurniturePreview() {
    if (this.hiddenFurnitureId) {
      this.setFurnitureMeshVisibility(this.hiddenFurnitureId, true);
      this.hiddenFurnitureId = null;
    }
    while (this.furniturePreviewGroup.children.length > 0) {
      const child = this.furniturePreviewGroup.children[0];
      this.furniturePreviewGroup.remove(child);
    }
    this.furniturePreviewGroup.visible = false;
    this.previewOutline.visible = false;
    this.activeGripMesh = null;
    this.ghostGroup.visible = false;
  }

  public renderFurnitureResize3D(f: Furniture, width: number, depth: number, valid: boolean) {
    this.valid = valid;
    if (!this.state) return;
    if (this.hiddenFurnitureId !== f.id) {
      this.hiddenFurnitureId = f.id;
      this.setFurnitureMeshVisibility(f.id, false);
    }
    const o = roomOrigin(this.state, f.roomId);

    // 1. Позиционируем и очищаем группу превью
    this.furniturePreviewGroup.position.set(o.x + f.x, 0, o.z + f.z);
    this.furniturePreviewGroup.rotation.y = (f.rotation * Math.PI) / 180;
    this.furniturePreviewGroup.visible = true;

    while (this.furniturePreviewGroup.children.length > 0) {
      const child = this.furniturePreviewGroup.children[0];
      this.furniturePreviewGroup.remove(child);
    }

    // 2. Строим настоящую 3D-модель мебели с изменённой длиной
    const columns =
      f.columns === 0 ? 0 : Math.min(16, Math.floor((width + 1e-6) / (f.kind === 'filament_rack' ? 0.16 : 0.6)));
    const previewF: Furniture = {
      ...f,
      width,
      depth,
      columns,
    };

    if (this.referenceParts) {
      this.referenceParts.furniture(this.furniturePreviewGroup, previewF, false);
      if (!valid) {
        this.furniturePreviewGroup.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            obj.material = obj.material.clone();
            obj.material.emissive = new THREE.Color('#ef4444');
            obj.material.emissiveIntensity = 0.5;
          }
        });
      }
    }

    // 3. Контур на полу для наглядных габаритов (без парящих плашек с текстом!)
    this.previewOutline.geometry.dispose();
    this.previewOutline.geometry = createBoxOutlineGeometry(width + 0.08, depth + 0.08, 0.02);
    this.previewOutline.position.set(o.x + f.x, 0, o.z + f.z);
    this.previewOutline.rotation.y = (f.rotation * Math.PI) / 180;
    (this.previewOutline.material as THREE.LineBasicMaterial).color.set(valid ? '#38bdf8' : '#ef4444');
    this.previewOutline.visible = true;
    this.ghostGroup.visible = false;

    // 5. Перемещаем 3D-рукоятку вслед за изменяющимся краем стола
    if (this.activeGripMesh) {
      const size = 0.5;
      const angle = (f.rotation * Math.PI) / 180;
      const localX = width / 2 + size / 2;
      const posX = o.x + f.x + localX * Math.cos(angle);
      const posZ = o.z + f.z - localX * Math.sin(angle);
      this.activeGripMesh.position.set(posX, f.height + 0.06, posZ);
    }

    this.invalidate();
  }

  private cast(e: PointerEvent) {
    const r = typeof this.canvas.getBoundingClientRect === 'function'
      ? this.canvas.getBoundingClientRect()
      : { left: 0, top: 0, width: 800, height: 600 };
    const width = r.width || 800;
    const height = r.height || 600;
    this.pointer.set(((e.clientX - r.left) / width) * 2 - 1, -((e.clientY - r.top) / height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
  }

  private floor(e: PointerEvent) {
    this.cast(e);
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  }

  roomAt(p: THREE.Vector3) {
    return this.state?.rooms.find((room) => {
      if (room.tiles && room.tiles.length > 0) {
        const gx = Math.floor(p.x);
        const gz = Math.floor(p.z);
        return room.tiles.some(([tx, tz]) => tx === gx && tz === gz);
      }
      const o = roomOrigin(this.state!, room.id);
      return Math.abs(p.x - o.x) <= room.width / 2 && Math.abs(p.z - o.z) <= room.depth / 2;
    });
  }

  pointerDown(e: PointerEvent): boolean {
    if (!this.edit) return false;

    if (this.gridBuilderActive) {
      if (e.button !== 0 && e.button !== 2) return false;
      this.cast(e);
      const p = this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
      if (p) {
        const gx = Math.floor(p.x);
        const gz = Math.floor(p.z);
        this.isDrawingGrid = true;
        const isEraser = this.gridBuilderTool === 'eraser' || e.shiftKey || (e.buttons & 2) !== 0 || e.button === 2;
        this.applyGridTool(gx, gz, isEraser ? 'eraser' : 'brush');
        if (typeof this.canvas.setPointerCapture === 'function' && e.pointerId !== undefined) {
          try {
            this.canvas.setPointerCapture(e.pointerId);
          } catch {
            // Safe fallback if mock canvas in tests
          }
        }
        this.invalidate();
        return true;
      }
      return true;
    }

    if (e.button !== 0) return false;

    // 1. Завершение активного режима (чертежа)
    if (this.draft) {
      if (this.draft.type === 'label') {
        this.placeLabel(e);
        return true;
      }
      if (this.draft.type === 'furniture' && !this.draft.anchor) {
        const p = this.floor(e);
        const room = p && this.roomAt(p);
        if (!room || !p) return true;
        this.draft.roomId = room.id;
        this.draft.anchor = p.clone();
        this.pressed = { x: e.clientX, y: e.clientY };
        this.canvas.setPointerCapture(e.pointerId);
        this.pointerMove(e);
        return true;
      }
      this.pointerMove(e);
      this.commit();
      return true;
    }

    // 2. Проверка клика по 3D-кнопкам и 3D-платформам управления
    this.cast(e);
    const hit = this.ray.intersectObjects(this.controlsMeshes, true)[0];
    let controlObj: THREE.Object3D | null = hit?.object ?? null;
    while (controlObj && !controlObj.userData.is3DControl && controlObj.parent) {
      controlObj = controlObj.parent;
    }
    if (controlObj && controlObj.userData.is3DControl) {
      this.interactingWithControl = true;
      const u = controlObj.userData;
      if (u.action === 'panel') {
        return true;
      }
      if (u.type === 'room_select') {
        this.callbacks.onRoomSelect?.(u.roomId);
        return true;
      }
      if (u.type === 'room_delete') {
        const r = this.state?.rooms.find((rm) => rm.id === u.roomId);
        if (confirm(`Удалить комнату «${r?.name ?? ''}»? Все привязанные к ней смежные комнаты также будут удалены.`)) {
          this.callbacks.onDeleteRoom?.(u.roomId);
        }
        return true;
      }
      if (u.type === 'label_hud') {
        if (u.action === 'drag') {
          const room = this.state?.rooms.find((r) => r.id === u.roomId);
          const lbl = room && (room.labels ?? defaultRoomLabels(room)).find((item) => item.id === u.labelId);
          if (room && lbl) {
            this.draggingLabel = {
              roomId: u.roomId,
              labelId: u.labelId,
              surface: lbl.surface,
              startU: lbl.u,
              startV: lbl.v,
              currentU: lbl.u,
              currentV: lbl.v,
              hasMoved: false,
            };
            this.canvas.setPointerCapture(e.pointerId);
            this.callbacks.onAuthoringHint?.('Перетаскивайте надпись по поверхности. Отпустите для подтверждения.');
          }
          return true;
        }
        this.handleLabelHudClick(u as { action: string; value?: string; roomId: string; labelId: string });
        return true;
      }
      if (u.type === 'label_frame') {
        const room = this.state?.rooms.find((r) => r.id === u.roomId);
        const lbl = room && (room.labels ?? defaultRoomLabels(room)).find((item) => item.id === u.labelId);
        if (room && lbl) {
          this.draggingLabel = {
            roomId: u.roomId,
            labelId: u.labelId,
            surface: lbl.surface,
            startU: lbl.u,
            startV: lbl.v,
            currentU: lbl.u,
            currentV: lbl.v,
            hasMoved: false,
          };
          this.canvas.setPointerCapture(e.pointerId);
          this.callbacks.onAuthoringHint?.('Перетаскивайте надпись по поверхности. Отпустите для подтверждения.');
        }
        return true;
      }
    }

    // 3. Проверка клика по надписи для выбора и перетаскивания прямо в 3D
    const labelMeshes: THREE.Object3D[] = [];
    this.scene.traverse((o) => {
      if (o.userData?.labelId) labelMeshes.push(o);
    });
    const labelHit = this.ray.intersectObjects(labelMeshes, false)[0];
    if (labelHit) {
      const { roomId, labelId } = labelHit.object.userData;
      this.selectedLabelId = labelId;
      this.callbacks.onLabelSelect?.(roomId, labelId);

      const room = this.state?.rooms.find((r) => r.id === roomId);
      const lbl = room && (room.labels ?? defaultRoomLabels(room)).find((item) => item.id === labelId);
      if (room && lbl) {
        this.draggingLabel = {
          roomId,
          labelId,
          surface: lbl.surface,
          startU: lbl.u,
          startV: lbl.v,
          currentU: lbl.u,
          currentV: lbl.v,
          hasMoved: false,
        };
        this.canvas.setPointerCapture(e.pointerId);
        this.callbacks.onAuthoringHint?.('Перетаскивайте надпись по поверхности. Отпустите для подтверждения.');
      }
      this.rebuildControls();
      return true;
    }

    return false;
  }

  pointerMove(e: PointerEvent): boolean {
    if (this.gridBuilderActive) {
      // If user is rotating the camera with middle mouse button, don't intercept!
      if ((e.buttons & 4) !== 0) {
        return false;
      }
      const isEraser = this.gridBuilderTool === 'eraser' || e.shiftKey || (e.buttons & 2) !== 0 || e.button === 2;
      this.cast(e);
      const p = this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
      if (p) {
        const gx = Math.floor(p.x);
        const gz = Math.floor(p.z);
        this.updateGridHover(gx, gz, isEraser);
        if (this.isDrawingGrid) {
          this.applyGridTool(gx, gz, isEraser ? 'eraser' : 'brush');
        }
        this.canvas.style.cursor = isEraser ? 'crosshair' : 'cell';
        this.invalidate();
      }
      return true;
    }

    // 1. Перетаскивание существующей надписи в 3D
    if (this.draggingLabel && this.state) {
      const room = this.state.rooms.find((r) => r.id === this.draggingLabel!.roomId);
      if (!room) return true;

      const hit = this.findSurfaceHitForRoom(e, room);
      if (hit) {
        this.draggingLabel.surface = hit.surface;
        this.draggingLabel.currentU = hit.u;
        this.draggingLabel.currentV = hit.v;
        this.draggingLabel.hasMoved = true;

        this.updateLabelMeshPosition(this.draggingLabel.labelId, room, hit.surface, hit.u, hit.v);
        this.updateLabelHudPosition(room, hit.surface, hit.u, hit.v);
        this.canvas.style.cursor = 'grabbing';
        this.invalidate();
      }
      return true;
    }

    // 2. Если нет драфта — hover подсветка для 3D-кнопок и надписей
    if (!this.draft) {
      this.cast(e);
      const hit = this.ray.intersectObjects(this.controlsMeshes, true)[0];
      let controlObj: THREE.Object3D | null = hit?.object ?? null;
      while (controlObj && !controlObj.userData.is3DControl && controlObj.parent) {
        controlObj = controlObj.parent;
      }
      if (controlObj && controlObj.userData.is3DControl) {
        if (this.hoveredMesh !== controlObj) {
          this.unhover();
          this.hoverMesh(controlObj as THREE.Mesh);
        }
        this.canvas.style.cursor = 'pointer';
        return false;
      } else {
        if (this.hoveredMesh) {
          this.unhover();
        }
      }

      // Hover подсветка курсора над 3D-надписями
      const labelMeshes: THREE.Object3D[] = [];
      this.scene.traverse((o) => {
        if (o.userData?.labelId) labelMeshes.push(o);
      });
      const labelHit = this.ray.intersectObjects(labelMeshes, false)[0];
      if (labelHit) {
        this.canvas.style.cursor = 'grab';
        return false;
      }

      this.canvas.style.cursor = 'default';
      return false;
    }

    // 3. Активный драфт: добавление/изменение комнат по квадратам
    const draft = this.draft;
    if (!this.state) return false;

    if (draft.type === 'label') {
      const hit = this.findSurfaceHit(e);
      this.updateLabelPreview(hit);
      this.canvas.style.cursor = hit ? 'crosshair' : 'not-allowed';
      this.invalidate();
      return true;
    }

    this.cast(e);

    const resizeTarget = draft.type === 'resize' ? this.state.furniture.find((f) => f.id === draft.id) : undefined;
    const p = this.ray.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), resizeTarget ? -(resizeTarget.height + 0.12) : 0),
      new THREE.Vector3()
    );
    if (!p) return true;

    if (draft.type === 'room') {
      const room = this.state.rooms.find((r) => r.id === draft.roomId)!;
      const o = roomOrigin(this.state, room.id);
      // Изменение размера существующей комнаты углом
      const rawW = Math.abs(p.x - o.x + room.width / 2);
      const rawD = Math.abs(p.z - o.z + room.depth / 2);
      let w = Math.max(2, Math.round(rawW));
      let d = Math.max(2, Math.round(rawD));

      let snapped = false;
      if (room.attachment) {
        const parent = this.state.rooms.find((r) => r.id === room.attachment!.roomId);
        if (parent) {
          const side = room.attachment.side;
          if ((side === 'east' || side === 'west') && Math.abs(d - parent.depth) <= 0.6) {
            d = parent.depth;
            snapped = true;
          } else if ((side === 'north' || side === 'south') && Math.abs(w - parent.width) <= 0.6) {
            w = parent.width;
            snapped = true;
          }
        }
      }

      draft.width = w;
      draft.depth = d;
      draft.snapped = snapped;
      this.updateRoomGhost();
    } else if (draft.type === 'resize') {
      const f = this.state.furniture.find((item) => item.id === draft.id)!;
      const o = roomOrigin(this.state, f.roomId);
      const angle = (f.rotation * Math.PI) / 180;
      const dx = p.x - o.x - f.x;
      const dz = p.z - o.z - f.z;
      const localX = dx * Math.cos(angle) - dz * Math.sin(angle);
      const minWidth = f.kind === 'filament_rack' ? 0.5 : 1.0;
      draft.width = Math.max(minWidth, snap(Math.abs(localX) * 2, 0.5));
      draft.depth = f.depth; // СТРОГО: столы и стеллажи нельзя увеличивать в ширину!
      let valid = true;
      try {
        resizeFurnitureOnGrid(this.state, f.id, draft.width, draft.depth);
      } catch {
        valid = false;
      }
      this.renderFurnitureResize3D(f, draft.width, draft.depth, valid);
    } else if (draft.type === 'furniture') {
      const room = draft.roomId ? this.state.rooms.find((r) => r.id === draft.roomId) : this.roomAt(p);
      if (!room) {
        this.cleanupFurniturePreview();
        return true;
      }
      const o = roomOrigin(this.state, room.id);
      if (draft.anchor) {
        const ax = draft.anchor.x - o.x;
        const az = draft.anchor.z - o.z;
        const bx = snap(p.x - o.x, 0.5);
        const bz = snap(p.z - o.z, 0.5);
        draft.width = Math.max(0.5, Math.abs(bx - ax));
        draft.x = (ax + bx) / 2;
        draft.z = (az + bz) / 2;
      } else {
        draft.x = snap(p.x - o.x, 0.5);
        draft.z = snap(p.z - o.z, 0.5);
      }
      const base = createFurniture(room.id, draft.kind);
      const decor = base.columns === 0;
      if (decor) {
        draft.width = base.width;
        draft.depth = base.depth;
      } else {
        draft.width = Math.max(draft.kind === 'filament_rack' ? 0.5 : 1, draft.width);
        draft.depth = base.depth; // СТРОГО: в ширину увеличивать нельзя!
      }
      const columns =
        decor ? 0 : Math.min(16, Math.max(1, Math.floor(draft.width / (draft.kind === 'filament_rack' ? 0.16 : 0.6))));
      const f: Furniture = { ...base, x: draft.x, z: draft.z, width: draft.width, depth: draft.depth, columns };
      const valid = validFurniture(this.state, f);
      this.renderFurnitureResize3D(f, draft.width, draft.depth, valid);
    }
    return true;
  }

  pointerUp(e: PointerEvent): boolean {
    if (this.draggingLabel) {
      const { roomId, labelId, currentU, currentV, surface, hasMoved } = this.draggingLabel;
      this.draggingLabel = null;
      this.interactingWithControl = false;
      this.callbacks.onAuthoringHint?.(null);
      if (typeof this.canvas.releasePointerCapture === 'function' && e.pointerId !== undefined) {
        try {
          if (typeof this.canvas.hasPointerCapture === 'function' ? this.canvas.hasPointerCapture(e.pointerId) : true) {
            this.canvas.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Safe release
        }
      }
      this.canvas.style.cursor = 'default';
      if (hasMoved) {
        this.callbacks.onMoveLabel?.(roomId, labelId, currentU, currentV, surface);
      } else {
        this.callbacks.onLabelEditStart?.(roomId, labelId);
      }
      this.rebuildControls();
      return true;
    }

    if (this.interactingWithControl) {
      this.interactingWithControl = false;
      return true;
    }

    if (this.gridBuilderActive) {
      if (e.button !== 0 && e.button !== 2 && !this.isDrawingGrid) {
        return false;
      }
      if (this.isDrawingGrid) {
        this.isDrawingGrid = false;
        if (typeof this.canvas.releasePointerCapture === 'function' && e.pointerId !== undefined) {
          try {
            if (typeof this.canvas.hasPointerCapture === 'function' ? this.canvas.hasPointerCapture(e.pointerId) : true) {
              this.canvas.releasePointerCapture(e.pointerId);
            }
          } catch {
            // Ignore capture error in test/mock environment
          }
        }
        const isEraser = this.gridBuilderTool === 'eraser' || e.shiftKey || (e.buttons & 2) !== 0 || e.button === 2;
        if (this.gridBuilderTool === 'brush' && !isEraser) {
          const currentTiles = Array.from(this.draftTiles.values());
          const extraBounds = this.state ? existingRoomsTileBounds(this.state) : null;
          const filled = fillEnclosedTiles(
            currentTiles,
            (x, z) => (this.state ? isTileOccupiedByRooms(this.state, x, z) : false),
            extraBounds ?? undefined
          );
          if (filled.length > currentTiles.length) {
            for (const [fx, fz] of filled) {
              const key = `${fx},${fz}`;
              if (!this.draftTiles.has(key)) {
                this.draftTiles.set(key, [fx, fz]);
                const tileMesh = this.createDraftTileGroup();
                tileMesh.position.set(fx + 0.5, 0, fz + 0.5);
                this.gridTilesGroup.add(tileMesh);
                this.draftTileMeshes.set(key, tileMesh);
              }
            }
            this.onDraftTilesChange?.(this.draftTiles.size);
          }
        }
        this.invalidate();
      }
      return true;
    }


    if (!this.draft) return false;
    if (this.pressed && Math.abs(e.clientX - this.pressed.x) + Math.abs(e.clientY - this.pressed.y) > 5) {
      this.pointerMove(e);
      this.commit();
    }
    this.pressed = null;
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    return true;
  }

  selectRoomAt(e: PointerEvent): boolean {
    const p = this.floor(e);
    const room = p && this.roomAt(p);
    if (room) {
      this.callbacks.onRoomSelect?.(room.id);
      return true;
    }
    return false;
  }

  private updateRoomGhost() {
    const d = this.draft;
    if (d?.type !== 'room' || !this.state) return;
    const room = this.state.rooms.find((r) => r.id === d.roomId)!;
    const o = roomOrigin(
      { ...this.state, rooms: this.state.rooms.map((r) => (r.id === room.id ? { ...r, width: d.width, depth: d.depth } : r)) },
      room.id
    );
    let valid = true;
    try {
      resizeRoom(this.state, d.roomId, d.width, d.depth);
    } catch {
      valid = false;
    }
    this.renderGhostRoom(o.x, o.z, d.width, d.depth, valid, d.snapped);
  }

  private renderGhostRoom(x: number, z: number, w: number, d: number, valid: boolean, snapped = false) {
    this.valid = valid;
    this.ghostGroup.visible = true;

    // 1. Ghost Subfloor Plinth (3D architectural base)
    this.ghostSubfloor.position.set(x, -0.17, z);
    this.ghostSubfloor.scale.set(w + 0.1, 0.34, d + 0.1);
    this.ghostSubfloor.visible = true;

    // 2. Ghost Floor Slab (3D top surface)
    this.ghostFloor.position.set(x, 0.026 - 0.025, z);
    this.ghostFloor.scale.set(w, 0.05, d);
    (this.ghostFloor.material as THREE.MeshStandardMaterial).color.set(
      valid ? (snapped ? '#38bdf8' : '#0284c7') : '#ef4444'
    );
    (this.ghostFloor.material as THREE.MeshStandardMaterial).opacity = valid ? 0.65 : 0.75;
    this.ghostFloor.visible = true;

    // 3. Ghost 3D Grid Lines (1m x 1m squares)
    this.ghostGrid.geometry.dispose();
    this.ghostGrid.geometry = createGridGeometry(w, d, 1.0);
    this.ghostGrid.position.set(x, 0.032, z);
    (this.ghostGrid.material as THREE.LineBasicMaterial).color.set(valid ? '#7dd3fc' : '#f87171');
    this.ghostGrid.visible = true;

    // 4. Ghost Outline
    this.ghostOutline.geometry.dispose();
    this.ghostOutline.geometry = createBoxOutlineGeometry(w, d, 0.038);
    this.ghostOutline.position.set(x, 0, z);
    (this.ghostOutline.material as THREE.LineBasicMaterial).color.set(valid ? '#38bdf8' : '#ef4444');
    this.ghostOutline.visible = true;

    this.invalidate();
  }

  private commit() {
    const d = this.draft;
    if (!d || !this.valid) {
      this.cancel();
      return;
    }
    if (d.type === 'room') {
      this.callbacks.onResizeRoom?.(d.roomId, d.width, d.depth);
    }
    if (d.type === 'resize') {
      const f = this.state?.furniture.find((item) => item.id === d.id);
      const fixedDepth = f ? f.depth : d.depth;
      this.callbacks.onResizeFurniture?.(d.id, d.width, fixedDepth);
    }
    if (d.type === 'furniture' && d.roomId) {
      const base = createFurniture(d.roomId, d.kind);
      this.callbacks.onCreateFurniture?.(d.roomId, d.kind, d.x, d.z, d.width, base.depth);
    }
    this.cancel();
  }

  private placeLabel(e: PointerEvent) {
    if (!this.state || this.draft?.type !== 'label') return;
    const hit = this.findSurfaceHit(e);
    if (!hit) return;

    this.callbacks.onPlaceLabel?.(
      hit.room.id,
      hit.surface,
      hit.u,
      hit.v,
      this.draft.text,
      this.draft.color,
      this.draft.size,
      this.draft.rotation
    );
    this.cancel();
  }

  getSelectedLabelId(): string | null {
    return this.selectedLabelId;
  }

  getSelectedLabelPosition(): THREE.Vector3 | null {
    if (!this.selectedLabelId || !this.state) return null;
    for (const room of this.state.rooms) {
      const lbl = (room.labels ?? defaultRoomLabels(room)).find((l) => l.id === this.selectedLabelId);
      if (lbl) {
        const o = roomOrigin(this.state, room.id);
        const x = o.x + (lbl.u - 0.5) * room.width;
        const z = o.z + (lbl.v - 0.5) * room.depth;
        const y = lbl.surface === 'floor' ? 0.045 : lbl.v * 2.6;
        if (lbl.surface === 'north') return new THREE.Vector3(x, y, o.z - room.depth / 2 + 0.09);
        if (lbl.surface === 'south') return new THREE.Vector3(x, y, o.z + room.depth / 2 - 0.09);
        if (lbl.surface === 'west') return new THREE.Vector3(o.x - room.width / 2 + 0.09, y, o.z + (lbl.u - 0.5) * room.depth);
        if (lbl.surface === 'east') return new THREE.Vector3(o.x + room.width / 2 - 0.09, y, o.z + (lbl.u - 0.5) * room.depth);
        return new THREE.Vector3(x, 0.045, z);
      }
    }
    return null;
  }

  project() {
    // 3D scene-native controls are rendered directly by WebGL with camera projections.
  }

  dispose() {
    this.disposeControls();
    this.cleanupFurniturePreview();
    this.cleanupLabelPreview();
    this.labelPreviewGroup.removeFromParent();
    this.furniturePreviewGroup.removeFromParent();
    this.previewOutline.geometry.dispose();
    (this.previewOutline.material as THREE.Material).dispose();
    this.previewOutline.removeFromParent();
    this.controlsGroup.removeFromParent();
    this.ghostGroup.removeFromParent();
    this.ghostSubfloor.geometry.dispose();
    (this.ghostSubfloor.material as THREE.Material).dispose();
    this.ghostFloor.geometry.dispose();
    (this.ghostFloor.material as THREE.Material).dispose();
    this.ghostGrid.geometry.dispose();
    (this.ghostGrid.material as THREE.Material).dispose();
    this.ghostOutline.geometry.dispose();
    (this.ghostOutline.material as THREE.Material).dispose();
    this.clearDraftTiles();
    this.gridDarkPlane.geometry.dispose();
    (this.gridDarkPlane.material as THREE.Material).dispose();
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();
    this.cellHoverFill.geometry.dispose();
    (this.cellHoverFill.material as THREE.Material).dispose();
    this.cellHoverOutline.geometry.dispose();
    (this.cellHoverOutline.material as THREE.Material).dispose();
    this.gridBuilderGroup.removeFromParent();
  }
}
