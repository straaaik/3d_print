import * as THREE from 'three';
import type { Printer } from '../../../shared/types';
import type { StationPosition } from './layout';
import type { InteractivePrinterGroup, InteractivePrinterUserData } from './types';
import { cloneBambuA1Model } from './bambuModelLoader';
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
  createPrinterScreenMaterial,
  createWarmLedMaterial,
  createPerimeterConcreteMaterial,
  createFoliageMaterial,
  createSoilMaterial,
  createSteelRackMaterial,
  createPlanterTextTexture,
  createStationPlaqueTexture,
  createHolographicOutlineMaterial,
  resolveColorHex,
} from './materials';

function createCurbSection(
  parent: THREE.Group,
  length: number,
  height: number,
  thickness: number,
  x: number,
  z: number,
  rotY: number,
  concreteMat: THREE.Material,
  ledMat: THREE.Material,
): void {
  const curbGroup = new THREE.Group();
  curbGroup.position.set(x, 0, z);
  curbGroup.rotation.y = rotY;

  const revealH = 0.035;
  const upperH = height - revealH;

  // Upper main concrete block
  const blockGeom = new THREE.BoxGeometry(length, upperH, thickness);
  const block = new THREE.Mesh(blockGeom, concreteMat);
  block.position.set(0, revealH + upperH / 2, 0);
  block.castShadow = true;
  block.receiveShadow = true;
  curbGroup.add(block);

  // Inset lower reveal base
  const revealGeom = new THREE.BoxGeometry(length, revealH, thickness - 0.06);
  const reveal = new THREE.Mesh(revealGeom, concreteMat);
  reveal.position.set(0, revealH / 2, 0);
  curbGroup.add(reveal);

  // Continuous warm LED light strip inside the recessed reveal
  const ledGeom = new THREE.BoxGeometry(length * 0.96, 0.016, 0.016);
  const ledStrip = new THREE.Mesh(ledGeom, ledMat);
  ledStrip.position.set(0, revealH / 2, thickness / 2 - 0.018);
  curbGroup.add(ledStrip);

  parent.add(curbGroup);
}

function createPlantCluster(width = 0.5, depth = 0.5): THREE.Group {
  const group = new THREE.Group();
  const foliageMat = createFoliageMaterial();

  const frondCount = 16;
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);
    const radius = 0.12 + (i % 3) * 0.08;
    const frondHeight = 0.24 + (i % 4) * 0.06;

    const leafGeom = new THREE.ConeGeometry(0.045, frondHeight, 5);
    const leaf = new THREE.Mesh(leafGeom, foliageMat);
    leaf.rotation.x = 0.35 + (i % 3) * 0.15;
    leaf.rotation.z = Math.sin(angle) * 0.3;
    leaf.rotation.y = angle;
    leaf.position.set(
      Math.cos(angle) * radius,
      frondHeight * 0.45,
      Math.sin(angle) * radius,
    );
    leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}

function createPlanter(
  width: number,
  height: number,
  depth: number,
  textLines?: { l1: string; l2?: string; l3?: string },
): THREE.Group {
  const planter = new THREE.Group();
  const concreteMat = createPerimeterConcreteMaterial();
  const soilMat = createSoilMaterial();
  const warmLedMat = createWarmLedMaterial();

  const wallThick = 0.06;
  const boxGeom = new THREE.BoxGeometry(width, height, depth);
  const box = new THREE.Mesh(boxGeom, concreteMat);
  box.position.y = height / 2;
  box.castShadow = true;
  box.receiveShadow = true;
  planter.add(box);

  // Recessed warm LED underglow strip along bottom front
  const underGlow = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.92, 0.016, 0.016),
    warmLedMat,
  );
  underGlow.position.set(0, 0.02, depth / 2 + 0.005);
  planter.add(underGlow);

  // Soil bed inside top
  const soilGeom = new THREE.BoxGeometry(width - wallThick * 2, 0.04, depth - wallThick * 2);
  const soil = new THREE.Mesh(soilGeom, soilMat);
  soil.position.y = height - 0.02;
  planter.add(soil);

  // Plant foliage clusters
  const plant = createPlantCluster(width, depth);
  plant.position.set(0, height, 0);
  planter.add(plant);

  if (textLines) {
    const textTexture = createPlanterTextTexture(textLines.l1, textLines.l2, textLines.l3);
    if (textTexture) {
      const plaqueMat = new THREE.MeshStandardMaterial({
        map: textTexture,
        roughness: 0.4,
        metalness: 0.5,
      });
      const plaqueMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(depth * 0.72, height * 0.45),
        plaqueMat,
      );
      plaqueMesh.rotation.y = Math.PI / 2;
      plaqueMesh.position.set(width / 2 + 0.002, height * 0.55, 0);
      planter.add(plaqueMesh);
    }
  }

  return planter;
}

export function createIndustrialFilamentRack(height = 2.3, width = 0.65, depth = 1.45): THREE.Group {
  const rack = new THREE.Group();
  const steelMat = createSteelRackMaterial();
  const warmLedMat = createWarmLedMaterial();

  const postSize = 0.045;
  const postGeom = new THREE.BoxGeometry(postSize, height, postSize);

  const halfW = width / 2 - postSize / 2;
  const halfD = depth / 2 - postSize / 2;
  const halfH = height / 2;

  const postPositions: [number, number, number][] = [
    [-halfW, halfH, -halfD],
    [halfW, halfH, -halfD],
    [-halfW, halfH, halfD],
    [halfW, halfH, halfD],
  ];

  postPositions.forEach((pos) => {
    const post = new THREE.Mesh(postGeom, steelMat);
    post.position.set(...pos);
    post.castShadow = true;
    rack.add(post);
  });

  // Vertical warm LED strip on front-left post
  const verticalLedGeom = new THREE.BoxGeometry(0.016, height * 0.94, 0.016);
  const verticalLed = new THREE.Mesh(verticalLedGeom, warmLedMat);
  verticalLed.position.set(-halfW + postSize / 2 + 0.01, halfH, halfD + 0.01);
  rack.add(verticalLed);

  const shelfLevels = [0.25, 0.75, 1.25, 1.75];
  const shelfThick = 0.03;

  const shelfColors: string[][] = [
    ['#22c55e', '#16a34a', '#15803d', '#14532d'],
    ['#38bdf8', '#0284c7', '#1d4ed8', '#1e3a8a'],
    ['#facc15', '#f97316', '#ef4444', '#b91c1c'],
    ['#f8fafc', '#cbd5e1', '#64748b', '#1e293b'],
  ];

  shelfLevels.forEach((sy, tierIdx) => {
    const shelfGeom = new THREE.BoxGeometry(width, shelfThick, depth);
    const shelf = new THREE.Mesh(shelfGeom, steelMat);
    shelf.position.set(0, sy, 0);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    rack.add(shelf);

    const colors = shelfColors[tierIdx];
    const spoolsPerShelf = 4;
    const spoolSpacing = (depth - 0.25) / spoolsPerShelf;
    for (let s = 0; s < spoolsPerShelf; s++) {
      const color = colors[s % colors.length];
      const spool = createRealisticSpool(color, 0.12, 0.05);
      spool.rotation.y = Math.PI / 2;
      const sz = -depth / 2 + 0.16 + s * spoolSpacing;
      spool.position.set(0, sy + 0.13, sz);
      rack.add(spool);
    }
  });

  return rack;
}

export function createDioramaRoom(size: [number, number, number]): THREE.Group {
  const room = new THREE.Group();
  const [width] = size;

  // 1. Expansive Infinite Floor Plane (smoothly blends with fog into background)
  const floorGeom = new THREE.PlaneGeometry(120, 120);
  const floorMat = createFloorMaterial();
  const floorMesh = new THREE.Mesh(floorGeom, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  room.add(floorMesh);

  // 2. Freestanding 4-Tier Industrial Filament Spool Rack on Right Side
  const filamentRack = createIndustrialFilamentRack();
  filamentRack.position.set(width / 2 - 1.25, 0, -0.6);
  room.add(filamentRack);

  return room;
}

export function createWorkbench(width: number, height: number, depth: number): THREE.Group {
  const workbench = new THREE.Group();
  const topThickness = 0.065;
  const legSize = 0.06;

  // 1. Solid Walnut Tabletop
  const topGeom = new THREE.BoxGeometry(width, topThickness, depth);
  const topMat = createTabletopMaterial();
  const topMesh = new THREE.Mesh(topGeom, topMat);
  topMesh.position.y = height - topThickness / 2;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  workbench.add(topMesh);

  // 2. 4 Steel Square Tube Legs
  const legHeight = height - topThickness;
  const legGeom = new THREE.BoxGeometry(legSize, legHeight, legSize);
  const legMat = createTableLegsMaterial();

  const xOffset = width / 2 - legSize / 2 - 0.08;
  const zOffset = depth / 2 - legSize / 2 - 0.08;
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

  // 3. Industrial Floor Runner Bars
  const runnerGeom = new THREE.BoxGeometry(legSize, 0.035, depth - 0.16 + legSize);
  const leftRunner = new THREE.Mesh(runnerGeom, legMat);
  leftRunner.position.set(-xOffset, 0.0175, 0);
  leftRunner.castShadow = true;
  workbench.add(leftRunner);

  const rightRunner = new THREE.Mesh(runnerGeom, legMat);
  rightRunner.position.set(xOffset, 0.0175, 0);
  rightRunner.castShadow = true;
  workbench.add(rightRunner);

  // 4. Suspended Under-Desk Drawer Units
  const drawerUnitW = 0.52;
  const drawerUnitH = 0.32;
  const drawerUnitD = depth * 0.72;

  const drawerXPositions = width > 3.0 ? [-width * 0.26, width * 0.26] : [0];
  drawerXPositions.forEach((dx) => {
    const drawerUnit = new THREE.Group();
    drawerUnit.position.set(dx, height - topThickness - drawerUnitH / 2 - 0.01, 0);

    const unitBox = new THREE.Mesh(
      new THREE.BoxGeometry(drawerUnitW, drawerUnitH, drawerUnitD),
      legMat,
    );
    unitBox.castShadow = true;
    drawerUnit.add(unitBox);

    const dFaceH = drawerUnitH * 0.44;
    const dFaceY = [-drawerUnitH * 0.24, drawerUnitH * 0.24];
    dFaceY.forEach((fy) => {
      const dFace = new THREE.Mesh(
        new THREE.BoxGeometry(drawerUnitW - 0.02, dFaceH - 0.015, 0.01),
        createPrinterFrameMaterial(),
      );
      dFace.position.set(0, fy, drawerUnitD / 2 + 0.005);
      drawerUnit.add(dFace);

      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.018, 0.016),
        createBrushedPillarMaterial(),
      );
      handle.position.set(0, fy, drawerUnitD / 2 + 0.016);
      drawerUnit.add(handle);
    });

    workbench.add(drawerUnit);
  });

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
  glbTemplate?: THREE.Group | null,
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

  if (glbTemplate) {
    bodyGroup.add(cloneBambuA1Model(glbTemplate));
  } else {
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

  // Angled Bambu OS Touchscreen Display on top front
  const screenGroup = new THREE.Group();
  screenGroup.position.set(0.06, pHeight + 0.034, pz - 0.015);
  screenGroup.rotation.x = -Math.PI / 5.5;

  const bezelGeom = new THREE.BoxGeometry(0.14, 0.088, 0.012);
  const bezel = new THREE.Mesh(bezelGeom, frameMat);
  bezel.castShadow = true;
  screenGroup.add(bezel);

  const displayGeom = new THREE.PlaneGeometry(0.13, 0.078);
  const displayMat = createPrinterScreenMaterial(printer.name, printerColor);
  const display = new THREE.Mesh(displayGeom, displayMat);
  display.position.z = 0.0065;
  screenGroup.add(display);

  bodyGroup.add(screenGroup);

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

  // Status LED and logo bar on toolhead
  const thLedGeom = new THREE.BoxGeometry(0.024, 0.006, 0.004);
  const thLed = new THREE.Mesh(thLedGeom, createStatusLedMaterial());
  thLed.position.set(0, 0.042, 0.049);
  toolheadGroup.add(thLed);

  // Filament manual release lever on top of toolhead
  const leverGeom = new THREE.BoxGeometry(0.014, 0.018, 0.012);
  const lever = new THREE.Mesh(leverGeom, createHotendMaterial());
  lever.position.set(-0.025, 0.065, 0);
  toolheadGroup.add(lever);

  // Brass Nozzle
  const nozzleGeom = new THREE.ConeGeometry(0.012, 0.022, 12);
  const nozzle = new THREE.Mesh(nozzleGeom, createHotendMaterial());
  nozzle.rotation.x = Math.PI;
  nozzle.position.set(0, -0.068, 0);
  toolheadGroup.add(nozzle);

  bodyGroup.add(toolheadGroup);

  // Auxiliary Part Cooling Fan (on Left Inner Chamber Wall)
  const auxFanGroup = new THREE.Group();
  auxFanGroup.position.set(-px + 0.025, 0.32, 0.02);
  const auxHousingGeom = new THREE.BoxGeometry(0.02, 0.16, 0.22);
  const auxHousing = new THREE.Mesh(auxHousingGeom, frameMat);
  auxFanGroup.add(auxHousing);

  const auxGrilleGeom = new THREE.BoxGeometry(0.005, 0.12, 0.18);
  const auxGrille = new THREE.Mesh(auxGrilleGeom, carbonMat);
  auxGrille.position.x = 0.01;
  auxFanGroup.add(auxGrille);
  bodyGroup.add(auxFanGroup);

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
  }

  root.add(bodyGroup);

  // Front wooden rim station plaque (e.g. P1S, A1, K1 as in reference image)
  const plaqueTex = createStationPlaqueTexture(printer.name);
  if (plaqueTex) {
    const pMat = new THREE.MeshStandardMaterial({
      map: plaqueTex,
      roughness: 0.35,
      metalness: 0.15,
    });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.045), pMat);
    plaque.position.set(0, -0.032, 0.651);
    root.add(plaque);
  }

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

export function applyBambuA1ModelToPrinterGroup(
  printerGroup: InteractivePrinterGroup,
  template: THREE.Group,
): void {
  const bodyGroup = printerGroup.userData?.bodyGroup;
  if (!bodyGroup) return;

  while (bodyGroup.children.length > 0) {
    const child = bodyGroup.children[0];
    bodyGroup.remove(child);
    disposeHierarchy(child);
  }

  bodyGroup.add(cloneBambuA1Model(template));
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
