import * as THREE from 'three';
import type { Printer } from '../../../shared/types';
import type { StationPosition } from './layout';
import type { InteractivePrinterGroup, InteractivePrinterUserData } from './types';
import {
  createPlatformMaterial,
  createFloorMaterial,
  createWallMaterial,
  createTabletopMaterial,
  createTableLegsMaterial,
  createPrinterFrameMaterial,
  createPrinterGlassMaterial,
  createPrinterBedMaterial,
  createHotendMaterial,
  createStatusLedMaterial,
  createMatMaterial,
  createMatEdgeMaterial,
  createSpoolMaterial,
  createContactShadowMaterial,
  resolveColorHex,
} from './materials';

export function createDioramaRoom(size: [number, number, number]): THREE.Group {
  const room = new THREE.Group();
  const [width, height, depth] = size;

  // 1. Base pedestal platform
  const baseGeom = new THREE.BoxGeometry(width, height, depth);
  const baseMat = createPlatformMaterial();
  const baseMesh = new THREE.Mesh(baseGeom, baseMat);
  baseMesh.position.y = -height / 2;
  baseMesh.receiveShadow = true;
  room.add(baseMesh);

  // 2. Floor plane with subtle grid
  const floorGeom = new THREE.PlaneGeometry(width * 0.98, depth * 0.98);
  const floorMat = createFloorMaterial();
  const floorMesh = new THREE.Mesh(floorGeom, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0.001;
  floorMesh.receiveShadow = true;
  room.add(floorMesh);

  const gridHelper = new THREE.GridHelper(
    Math.min(width, depth) * 0.96,
    Math.round(Math.min(width, depth) * 2),
    0x3f3f46,
    0x222228,
  );
  gridHelper.position.y = 0.002;
  room.add(gridHelper);

  // 3. Back & Left quarter walls (give diorama depth without occluding camera from front/right)
  const wallHeight = 2.4;
  const wallThickness = 0.18;

  // Back wall (z negative)
  const backWallGeom = new THREE.BoxGeometry(width, wallHeight, wallThickness);
  const wallMat = createWallMaterial();
  const backWall = new THREE.Mesh(backWallGeom, wallMat);
  backWall.position.set(0, wallHeight / 2, -depth / 2 + wallThickness / 2);
  backWall.receiveShadow = true;
  room.add(backWall);

  // Left wall (x negative)
  const leftWallGeom = new THREE.BoxGeometry(wallThickness, wallHeight, depth);
  const leftWall = new THREE.Mesh(leftWallGeom, wallMat);
  leftWall.position.set(-width / 2 + wallThickness / 2, wallHeight / 2, 0);
  leftWall.receiveShadow = true;
  room.add(leftWall);

  // Subtle wall accent trim (neon lab line along back wall)
  const trimGeom = new THREE.BoxGeometry(width * 0.85, 0.02, 0.02);
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x0cb4e0,
    emissive: 0x0cb4e0,
    emissiveIntensity: 0.8,
  });
  const trimMesh = new THREE.Mesh(trimGeom, trimMat);
  trimMesh.position.set(0, 1.8, -depth / 2 + wallThickness + 0.01);
  room.add(trimMesh);

  return room;
}

export function createWorkbench(width: number, depth: number, height: number): THREE.Group {
  const workbench = new THREE.Group();
  const topThickness = 0.05;
  const legSize = 0.06;

  // Tabletop
  const topGeom = new THREE.BoxGeometry(width, topThickness, depth);
  const topMat = createTabletopMaterial();
  const topMesh = new THREE.Mesh(topGeom, topMat);
  topMesh.position.y = height - topThickness / 2;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  workbench.add(topMesh);

  // 4 Legs
  const legHeight = height - topThickness;
  const legGeom = new THREE.BoxGeometry(legSize, legHeight, legSize);
  const legMat = createTableLegsMaterial();

  const xOffset = width / 2 - legSize / 2 - 0.06;
  const zOffset = depth / 2 - legSize / 2 - 0.06;
  const legY = legHeight / 2;

  const legPositions: [number, number, number][] = [
    [-xOffset, legY, -zOffset],
    [xOffset, legY, -zOffset],
    [-xOffset, legY, zOffset],
    [xOffset, legY, zOffset],
  ];

  legPositions.forEach((pos) => {
    const legMesh = new THREE.Mesh(legGeom, legMat);
    legMesh.position.set(...pos);
    legMesh.castShadow = true;
    legMesh.receiveShadow = true;
    workbench.add(legMesh);
  });

  // Sturdy crossbars
  const crossGeomX = new THREE.BoxGeometry(width - 0.18, 0.03, 0.03);
  const crossBack = new THREE.Mesh(crossGeomX, legMat);
  crossBack.position.set(0, 0.22, -zOffset);
  workbench.add(crossBack);

  const crossFront = new THREE.Mesh(crossGeomX, legMat);
  crossFront.position.set(0, 0.22, zOffset);
  workbench.add(crossFront);

  return workbench;
}

export function createPrinterMat(colorHex: string, width = 0.88, depth = 0.88): THREE.Group {
  const group = new THREE.Group();

  // Mat base with subtle neon border
  const borderGeom = new THREE.BoxGeometry(width + 0.03, 0.008, depth + 0.03);
  const borderMat = createMatEdgeMaterial(colorHex);
  const borderMesh = new THREE.Mesh(borderGeom, borderMat);
  borderMesh.position.y = 0.004;
  borderMesh.receiveShadow = true;
  group.add(borderMesh);

  // Main silicone pad
  const padGeom = new THREE.BoxGeometry(width, 0.012, depth);
  const padMat = createMatMaterial(colorHex);
  const padMesh = new THREE.Mesh(padGeom, padMat);
  padMesh.position.y = 0.008;
  padMesh.receiveShadow = true;
  group.add(padMesh);

  return group;
}

export function createContactShadow(width = 0.74, depth = 0.74): THREE.Mesh {
  const geom = new THREE.PlaneGeometry(width, depth);
  const mat = createContactShadowMaterial();
  const shadow = new THREE.Mesh(geom, mat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  return shadow;
}

export function createProceduralPrinter(
  printer: Printer,
  station: StationPosition,
): InteractivePrinterGroup {
  const root = new THREE.Group() as unknown as InteractivePrinterGroup;
  root.position.set(...station.position);
  if (station.rotationY) {
    root.rotation.y = station.rotationY;
  }

  const printerColor = resolveColorHex(printer.color);

  // 1. Silicone colored mat on desk
  const matGroup = createPrinterMat(printerColor);
  root.add(matGroup);

  // 2. Soft contact shadow on mat
  const shadowMesh = createContactShadow();
  root.add(shadowMesh);

  // 3. Body group: this elevates on hover
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.015;

  const pWidth = 0.58;
  const pHeight = 0.68;
  const pDepth = 0.58;
  const pillarSize = 0.032;

  const frameMat = createPrinterFrameMaterial();
  const glassMat = createPrinterGlassMaterial();
  const bedMat = createPrinterBedMaterial();
  const hotendMat = createHotendMaterial();
  const ledMat = createStatusLedMaterial();
  const spoolMat = createSpoolMaterial(printerColor);

  // 4 Corner pillars
  const pillarGeom = new THREE.BoxGeometry(pillarSize, pHeight, pillarSize);
  const px = pWidth / 2 - pillarSize / 2;
  const pz = pDepth / 2 - pillarSize / 2;
  const py = pHeight / 2;

  const pillarCoords: [number, number, number][] = [
    [-px, py, -pz],
    [px, py, -pz],
    [-px, py, pz],
    [px, py, pz],
  ];

  pillarCoords.forEach((coords) => {
    const pillar = new THREE.Mesh(pillarGeom, frameMat);
    pillar.position.set(...coords);
    pillar.castShadow = true;
    bodyGroup.add(pillar);
  });

  // Top & Bottom frame beams
  const beamGeomX = new THREE.BoxGeometry(pWidth, pillarSize, pillarSize);
  const beamGeomZ = new THREE.BoxGeometry(pillarSize, pillarSize, pDepth - pillarSize * 2);

  // Bottom frame
  const botFront = new THREE.Mesh(beamGeomX, frameMat);
  botFront.position.set(0, pillarSize / 2, pz);
  bodyGroup.add(botFront);

  const botBack = new THREE.Mesh(beamGeomX, frameMat);
  botBack.position.set(0, pillarSize / 2, -pz);
  bodyGroup.add(botBack);

  const botLeft = new THREE.Mesh(beamGeomZ, frameMat);
  botLeft.position.set(-px, pillarSize / 2, 0);
  bodyGroup.add(botLeft);

  const botRight = new THREE.Mesh(beamGeomZ, frameMat);
  botRight.position.set(px, pillarSize / 2, 0);
  bodyGroup.add(botRight);

  // Bottom chassis base plate
  const basePlateGeom = new THREE.BoxGeometry(pWidth - 0.04, 0.04, pDepth - 0.04);
  const basePlate = new THREE.Mesh(basePlateGeom, frameMat);
  basePlate.position.set(0, 0.02, 0);
  basePlate.castShadow = true;
  bodyGroup.add(basePlate);

  // Top frame
  const topY = pHeight - pillarSize / 2;
  const topFront = new THREE.Mesh(beamGeomX, frameMat);
  topFront.position.set(0, topY, pz);
  bodyGroup.add(topFront);

  const topBack = new THREE.Mesh(beamGeomX, frameMat);
  topBack.position.set(0, topY, -pz);
  bodyGroup.add(topBack);

  const topLeft = new THREE.Mesh(beamGeomZ, frameMat);
  topLeft.position.set(-px, topY, 0);
  bodyGroup.add(topLeft);

  const topRight = new THREE.Mesh(beamGeomZ, frameMat);
  topRight.position.set(px, topY, 0);
  bodyGroup.add(topRight);

  // Top glass lid
  const topGlassGeom = new THREE.BoxGeometry(pWidth - 0.04, 0.01, pDepth - 0.04);
  const topGlass = new THREE.Mesh(topGlassGeom, glassMat);
  topGlass.position.set(0, pHeight, 0);
  bodyGroup.add(topGlass);

  // Enclosure side glass panels
  const sideGlassGeom = new THREE.BoxGeometry(0.008, pHeight - pillarSize * 2, pDepth - pillarSize * 2);
  const leftGlass = new THREE.Mesh(sideGlassGeom, glassMat);
  leftGlass.position.set(-px + 0.01, py, 0);
  bodyGroup.add(leftGlass);

  const rightGlass = new THREE.Mesh(sideGlassGeom, glassMat);
  rightGlass.position.set(px - 0.01, py, 0);
  bodyGroup.add(rightGlass);

  // Back panel (opaque dark metal with cable routes)
  const backPanelGeom = new THREE.BoxGeometry(pWidth - pillarSize * 2, pHeight - pillarSize * 2, 0.01);
  const backPanel = new THREE.Mesh(backPanelGeom, frameMat);
  backPanel.position.set(0, py, -pz + 0.01);
  backPanel.castShadow = true;
  bodyGroup.add(backPanel);

  // Front glass door
  const frontDoorGeom = new THREE.BoxGeometry(pWidth - pillarSize * 2, pHeight - pillarSize * 2, 0.008);
  const frontDoor = new THREE.Mesh(frontDoorGeom, glassMat);
  frontDoor.position.set(0, py, pz - 0.01);
  bodyGroup.add(frontDoor);

  // Interior: Heated build bed
  const bedGeom = new THREE.BoxGeometry(0.40, 0.015, 0.40);
  const bed = new THREE.Mesh(bedGeom, bedMat);
  bed.position.set(0, 0.22, 0);
  bed.castShadow = true;
  bodyGroup.add(bed);

  // Interior: Z-axis leadscrew rods
  const rodGeom = new THREE.CylinderGeometry(0.006, 0.006, pHeight - 0.1, 8);
  const rodLeft = new THREE.Mesh(rodGeom, hotendMat);
  rodLeft.position.set(-0.18, py, -0.16);
  bodyGroup.add(rodLeft);

  const rodRight = new THREE.Mesh(rodGeom, hotendMat);
  rodRight.position.set(0.18, py, -0.16);
  bodyGroup.add(rodRight);

  // Interior: CoreXY crossbar and Toolhead Extruder
  const gantryBarGeom = new THREE.BoxGeometry(pWidth - 0.08, 0.015, 0.015);
  const gantryBar = new THREE.Mesh(gantryBarGeom, hotendMat);
  gantryBar.position.set(0, 0.48, 0.02);
  bodyGroup.add(gantryBar);

  const toolheadGeom = new THREE.BoxGeometry(0.07, 0.07, 0.07);
  const toolhead = new THREE.Mesh(toolheadGeom, frameMat);
  toolhead.position.set(0.02, 0.48, 0.02);
  toolhead.castShadow = true;
  bodyGroup.add(toolhead);

  // Nozzle tip
  const nozzleGeom = new THREE.ConeGeometry(0.012, 0.02, 8);
  const nozzle = new THREE.Mesh(nozzleGeom, hotendMat);
  nozzle.rotation.x = Math.PI;
  nozzle.position.set(0.02, 0.435, 0.02);
  bodyGroup.add(nozzle);

  // Front bezel details: Touchscreen & Glowing LED
  const screenGeom = new THREE.BoxGeometry(0.12, 0.07, 0.01);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.2,
    metalness: 0.8,
  });
  const screen = new THREE.Mesh(screenGeom, screenMat);
  screen.rotation.x = -0.3; // tilted screen
  screen.position.set(0.16, topY - 0.04, pz + 0.015);
  bodyGroup.add(screen);

  const ledGeom = new THREE.SphereGeometry(0.01, 12, 12);
  const led = new THREE.Mesh(ledGeom, ledMat);
  led.position.set(-0.20, topY, pz + 0.01);
  bodyGroup.add(led);

  // Top spool holder & colored filament spool
  const spoolHolderGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8);
  const spoolHolder = new THREE.Mesh(spoolHolderGeom, frameMat);
  spoolHolder.rotation.z = Math.PI / 2;
  spoolHolder.position.set(-0.08, pHeight + 0.06, -0.12);
  bodyGroup.add(spoolHolder);

  const spoolGeom = new THREE.TorusGeometry(0.06, 0.024, 12, 24);
  const spool = new THREE.Mesh(spoolGeom, spoolMat);
  spool.rotation.y = Math.PI / 2;
  spool.position.set(-0.08, pHeight + 0.06, -0.12);
  spool.castShadow = true;
  bodyGroup.add(spool);

  root.add(bodyGroup);

  // Setup user data
  const userData: InteractivePrinterUserData = {
    isPrinter: true,
    printer,
    station,
    baseY: 0,
    targetElevation: 0,
    currentElevation: 0,
    matMesh: matGroup as unknown as THREE.Mesh,
    shadowMesh,
    bodyGroup,
  };
  root.userData = userData;

  return root;
}

export function disposeHierarchy(object: THREE.Object3D): void {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            disposeMaterial(mat);
          });
        } else {
          disposeMaterial(mesh.material);
        }
      }
    }
  });
}

function disposeMaterial(mat: THREE.Material): void {
  // Dispose textures if present
  const standard = mat as THREE.MeshStandardMaterial;
  if (standard.map) standard.map.dispose();
  if (standard.lightMap) standard.lightMap.dispose();
  if (standard.bumpMap) standard.bumpMap.dispose();
  if (standard.normalMap) standard.normalMap.dispose();
  if (standard.roughnessMap) standard.roughnessMap.dispose();
  if (standard.metalnessMap) standard.metalnessMap.dispose();
  if (standard.emissiveMap) standard.emissiveMap.dispose();
  mat.dispose();
}
