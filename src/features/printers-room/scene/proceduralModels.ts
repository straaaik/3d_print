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
  createBrushedPillarMaterial,
  createCarbonRodMaterial,
  createToolheadMaterial,
  createChamberLedMaterial,
  createPeiPlateMaterial,
  createPtfeTubeMaterial,
  createSpoolFlangeMaterial,
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

export function createWorkbench(width: number, height: number, depth: number): THREE.Group {
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
  const px = pWidth / 2;
  const py = pHeight / 2;
  const pz = pDepth / 2;

  const frameMat = createPrinterFrameMaterial();
  const brushedPillarMat = createBrushedPillarMaterial();
  const carbonMat = createCarbonRodMaterial();
  const toolheadMat = createToolheadMaterial();
  const ledMat = createChamberLedMaterial();
  const peiMat = createPeiPlateMaterial();
  const glassMat = createPrinterGlassMaterial();
  const tubeMat = createPtfeTubeMaterial();
  const spoolMat = createSpoolMaterial(printerColor);

  // --- A. OUTER CHASSIS & ROUNDED PILLARS (Bambu Lab CoreXY) ---

  // 1. Distinctive Front-Left Brushed Metallic Column (rounded pillar)
  const pillarRadius = 0.042;
  const leftColGeom = new THREE.CylinderGeometry(pillarRadius, pillarRadius, pHeight, 20);
  const leftCol = new THREE.Mesh(leftColGeom, brushedPillarMat);
  leftCol.position.set(-px + pillarRadius, py, pz - pillarRadius);
  leftCol.castShadow = true;
  bodyGroup.add(leftCol);

  // 2. Front-Right, Rear-Left, Rear-Right Posts (dark slate)
  const cornerSize = 0.038;
  const postGeom = new THREE.BoxGeometry(cornerSize, pHeight, cornerSize);

  const rightFrontPost = new THREE.Mesh(postGeom, frameMat);
  rightFrontPost.position.set(px - cornerSize / 2, py, pz - cornerSize / 2);
  rightFrontPost.castShadow = true;
  bodyGroup.add(rightFrontPost);

  const leftRearPost = new THREE.Mesh(postGeom, frameMat);
  leftRearPost.position.set(-px + cornerSize / 2, py, -pz + cornerSize / 2);
  leftRearPost.castShadow = true;
  bodyGroup.add(leftRearPost);

  const rightRearPost = new THREE.Mesh(postGeom, frameMat);
  rightRearPost.position.set(px - cornerSize / 2, py, -pz + cornerSize / 2);
  rightRearPost.castShadow = true;
  bodyGroup.add(rightRearPost);

  // 3. Bottom Base Plate & 4 Feet
  const baseGeom = new THREE.BoxGeometry(pWidth - 0.01, 0.035, pDepth - 0.01);
  const basePlate = new THREE.Mesh(baseGeom, frameMat);
  basePlate.position.set(0, 0.0175, 0);
  basePlate.castShadow = true;
  bodyGroup.add(basePlate);

  // 4. Top Frame & Rear AMS Deck
  const topFrontBar = new THREE.Mesh(
    new THREE.BoxGeometry(pWidth - 0.02, 0.035, 0.045),
    frameMat,
  );
  topFrontBar.position.set(0, pHeight - 0.0175, pz - 0.0225);
  topFrontBar.castShadow = true;
  bodyGroup.add(topFrontBar);

  const topRearDeck = new THREE.Mesh(
    new THREE.BoxGeometry(pWidth - 0.02, 0.035, pDepth * 0.46),
    frameMat,
  );
  topRearDeck.position.set(0, pHeight - 0.0175, -pz * 0.54);
  topRearDeck.castShadow = true;
  bodyGroup.add(topRearDeck);

  const topSideLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.035, pDepth),
    frameMat,
  );
  topSideLeft.position.set(-px + 0.02, pHeight - 0.0175, 0);
  bodyGroup.add(topSideLeft);

  const topSideRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.035, pDepth),
    frameMat,
  );
  topSideRight.position.set(px - 0.02, pHeight - 0.0175, 0);
  bodyGroup.add(topSideRight);

  // 5. Right Exterior Panel with Profiled Inset
  const rightPanelGeom = new THREE.BoxGeometry(0.01, pHeight - 0.07, pDepth - 0.08);
  const rightPanel = new THREE.Mesh(rightPanelGeom, frameMat);
  rightPanel.position.set(px - 0.005, py, 0);
  rightPanel.castShadow = true;
  bodyGroup.add(rightPanel);

  const rightInsetGeom = new THREE.BoxGeometry(0.008, pHeight * 0.52, pDepth * 0.38);
  const rightInset = new THREE.Mesh(rightInsetGeom, brushedPillarMat);
  rightInset.position.set(px + 0.002, py, 0.02);
  bodyGroup.add(rightInset);

  // 6. Back Exterior Panel & Spool Hub Relief
  const backPanelGeom = new THREE.BoxGeometry(pWidth - 0.04, pHeight - 0.07, 0.01);
  const backPanel = new THREE.Mesh(backPanelGeom, frameMat);
  backPanel.position.set(0, py, -pz + 0.005);
  backPanel.castShadow = true;
  bodyGroup.add(backPanel);

  // 7. Left Side Glass Window
  const leftGlassGeom = new THREE.BoxGeometry(0.008, pHeight * 0.65, pDepth - 0.08);
  const leftGlass = new THREE.Mesh(leftGlassGeom, glassMat);
  leftGlass.position.set(-px + 0.005, py + 0.06, 0);
  bodyGroup.add(leftGlass);

  const leftLowerPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, pHeight * 0.28, pDepth - 0.08),
    frameMat,
  );
  leftLowerPanel.position.set(-px + 0.005, py * 0.3, 0);
  bodyGroup.add(leftLowerPanel);

  // 8. Front Glass Door with Handle Latch
  const doorGeom = new THREE.BoxGeometry(pWidth - 0.085, pHeight - 0.075, 0.008);
  const frontDoor = new THREE.Mesh(doorGeom, glassMat);
  frontDoor.position.set(0.018, py, pz - 0.004);
  bodyGroup.add(frontDoor);

  const handleGeom = new THREE.BoxGeometry(0.012, 0.045, 0.016);
  const handle = new THREE.Mesh(handleGeom, brushedPillarMat);
  handle.position.set(-0.04, py - 0.04, pz + 0.006);
  bodyGroup.add(handle);

  // --- B. CHAMBER INTERIOR & LIGHTING ---

  // 9. Chamber Neon LED Light Strip along upper left frame
  const ledStripGeom = new THREE.BoxGeometry(0.016, 0.016, pDepth * 0.66);
  const ledStrip = new THREE.Mesh(ledStripGeom, ledMat);
  ledStrip.position.set(-px + 0.065, pHeight - 0.038, 0);
  bodyGroup.add(ledStrip);

  // Real cyan point light illuminating the chamber interior
  const chamberLight = new THREE.PointLight(0x00f0ff, 1.4, 1.6);
  chamberLight.position.set(-px + 0.08, pHeight - 0.06, 0);
  bodyGroup.add(chamberLight);

  // 10. Dual Carbon-Fiber X-Rods
  const rodLength = pWidth - 0.13;
  const rodGeom = new THREE.CylinderGeometry(0.0075, 0.0075, rodLength, 16);

  const upperCarbonRod = new THREE.Mesh(rodGeom, carbonMat);
  upperCarbonRod.rotation.z = Math.PI / 2;
  upperCarbonRod.position.set(0, 0.49, 0.015);
  bodyGroup.add(upperCarbonRod);

  const lowerCarbonRod = new THREE.Mesh(rodGeom, carbonMat);
  lowerCarbonRod.rotation.z = Math.PI / 2;
  lowerCarbonRod.position.set(0, 0.44, 0.015);
  bodyGroup.add(lowerCarbonRod);

  // Y-axis side carriages
  const carriageGeom = new THREE.BoxGeometry(0.035, 0.085, 0.065);
  const leftCarriage = new THREE.Mesh(carriageGeom, frameMat);
  leftCarriage.position.set(-px + 0.065, 0.465, 0.015);
  bodyGroup.add(leftCarriage);

  const rightCarriage = new THREE.Mesh(carriageGeom, frameMat);
  rightCarriage.position.set(px - 0.065, 0.465, 0.015);
  bodyGroup.add(rightCarriage);

  // 11. Sculpted Light-Grey Toolhead (Bambu Lab Printhead)
  const toolheadGroup = new THREE.Group();
  toolheadGroup.position.set(0.01, 0.465, 0.015);

  const thBodyGeom = new THREE.BoxGeometry(0.095, 0.115, 0.095);
  const thBody = new THREE.Mesh(thBodyGeom, toolheadMat);
  thBody.castShadow = true;
  toolheadGroup.add(thBody);

  // Circular fan intake grill on front face
  const fanGrillGeom = new THREE.CylinderGeometry(0.026, 0.026, 0.006, 24);
  const fanGrill = new THREE.Mesh(fanGrillGeom, frameMat);
  fanGrill.rotation.x = Math.PI / 2;
  fanGrill.position.set(0, 0.005, 0.049);
  toolheadGroup.add(fanGrill);

  const fanHubGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.008, 16);
  const fanHub = new THREE.Mesh(fanHubGeom, carbonMat);
  fanHub.rotation.x = Math.PI / 2;
  fanHub.position.set(0, 0.005, 0.049);
  toolheadGroup.add(fanHub);

  // Nozzle
  const nozzleGeom = new THREE.ConeGeometry(0.012, 0.022, 12);
  const nozzle = new THREE.Mesh(nozzleGeom, createHotendMaterial());
  nozzle.rotation.x = Math.PI;
  nozzle.position.set(0, -0.068, 0);
  toolheadGroup.add(nozzle);

  bodyGroup.add(toolheadGroup);

  // 12. Textured PEI Build Plate with Front Handle
  const bedGroup = new THREE.Group();
  bedGroup.position.set(0, 0.22, 0);

  const heatbed = new THREE.Mesh(
    new THREE.BoxGeometry(0.40, 0.018, 0.40),
    frameMat,
  );
  heatbed.castShadow = true;
  bedGroup.add(heatbed);

  const peiSheet = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.01, 0.42),
    peiMat,
  );
  peiSheet.position.y = 0.012;
  peiSheet.receiveShadow = true;
  bedGroup.add(peiSheet);

  // Front pull-tab
  const pullTab = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.008, 0.035),
    frameMat,
  );
  pullTab.position.set(0, 0.012, 0.225);
  bedGroup.add(pullTab);

  bodyGroup.add(bedGroup);

  // Z-axis dual leadscrews
  const leadRodGeom = new THREE.CylinderGeometry(0.007, 0.007, pHeight - 0.14, 12);
  const leftLead = new THREE.Mesh(leadRodGeom, createHotendMaterial());
  leftLead.position.set(-0.14, py, -0.16);
  bodyGroup.add(leftLead);

  const rightLead = new THREE.Mesh(leadRodGeom, createHotendMaterial());
  rightLead.position.set(0.14, py, -0.16);
  bodyGroup.add(rightLead);

  // --- C. TOP AMS MULTI-SPOOL MODULE (As in photo) ---

  const amsTray = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.035, 0.25),
    frameMat,
  );
  amsTray.position.set(0.03, pHeight + 0.02, -0.12);
  amsTray.castShadow = true;
  bodyGroup.add(amsTray);

  // Spool 1 (Right): Active spool with printer color & cutout holes
  const spool1 = createRealisticSpool(printerColor, 0.075, 0.042);
  spool1.position.set(0.12, pHeight + 0.09, -0.12);
  bodyGroup.add(spool1);

  // Spool 2 (Left): Complementary grey spool as in photo
  const spool2 = createRealisticSpool('#94a3b8', 0.075, 0.042);
  spool2.position.set(-0.04, pHeight + 0.09, -0.12);
  bodyGroup.add(spool2);

  // Left side hanging spool (as on the far left edge of the photo)
  const sideHolderGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.08, 12);
  const sideHolder = new THREE.Mesh(sideHolderGeom, frameMat);
  sideHolder.rotation.z = Math.PI / 2;
  sideHolder.position.set(-px - 0.035, py + 0.05, -0.08);
  bodyGroup.add(sideHolder);

  const sideSpool = createRealisticSpool(printerColor, 0.11, 0.048);
  sideSpool.position.set(-px - 0.065, py + 0.05, -0.08);
  bodyGroup.add(sideSpool);

  // --- D. CURVED PTFE FILAMENT TUBE (Looping into printhead) ---

  const tubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, pHeight + 0.09, -0.06),
    new THREE.Vector3(0.07, pHeight + 0.14, 0.02),
    new THREE.Vector3(0.04, pHeight + 0.08, 0.08),
    new THREE.Vector3(0.01, 0.54, 0.015),
  ]);

  const ptfeGeom = new THREE.TubeGeometry(tubeCurve, 28, 0.006, 8, false);
  const ptfeMesh = new THREE.Mesh(ptfeGeom, tubeMat);
  bodyGroup.add(ptfeMesh);

  const filamentCurveMesh = new THREE.Mesh(
    new THREE.TubeGeometry(tubeCurve, 28, 0.003, 6, false),
    spoolMat,
  );
  bodyGroup.add(filamentCurveMesh);

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

function createRealisticSpool(colorHex: string, radius = 0.075, width = 0.042): THREE.Group {
  const spool = new THREE.Group();
  const flangeMat = createSpoolFlangeMaterial();
  const filamentMat = createSpoolMaterial(colorHex);
  const hubMat = createPrinterFrameMaterial();

  // Central hub
  const hubGeom = new THREE.CylinderGeometry(radius * 0.32, radius * 0.32, width, 16);
  const hub = new THREE.Mesh(hubGeom, hubMat);
  hub.rotation.z = Math.PI / 2;
  spool.add(hub);

  // Wound filament cylinder
  const filamentGeom = new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, width * 0.9, 24);
  const filament = new THREE.Mesh(filamentGeom, filamentMat);
  filament.rotation.z = Math.PI / 2;
  filament.castShadow = true;
  spool.add(filament);

  // Two side flanges with cutout holes
  const flangeThickness = 0.0035;
  const xOffsets = [-width / 2 - flangeThickness / 2, width / 2 + flangeThickness / 2];

  xOffsets.forEach((xOff) => {
    const discGeom = new THREE.CylinderGeometry(radius, radius, flangeThickness, 24);
    const disc = new THREE.Mesh(discGeom, flangeMat);
    disc.rotation.z = Math.PI / 2;
    disc.position.x = xOff;
    spool.add(disc);

    // 4 radial cutout circles on each flange face (as on the Bambu spools in the photo)
    const holeCount = 4;
    const holeRadius = radius * 0.22;
    const distFromCenter = radius * 0.58;
    for (let h = 0; h < holeCount; h++) {
      const angle = (h / holeCount) * Math.PI * 2;
      const hy = Math.cos(angle) * distFromCenter;
      const hz = Math.sin(angle) * distFromCenter;
      const holeGeom = new THREE.CylinderGeometry(holeRadius, holeRadius, flangeThickness + 0.001, 12);
      const holeMesh = new THREE.Mesh(holeGeom, hubMat);
      holeMesh.rotation.z = Math.PI / 2;
      holeMesh.position.set(xOff, hy, hz);
      spool.add(holeMesh);
    }
  });

  return spool;
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
