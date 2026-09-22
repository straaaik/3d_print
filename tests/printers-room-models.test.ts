import assert from 'node:assert/strict';
import test from 'node:test';
import type { Printer } from '../src/shared/types';
import type { StationPosition } from '../src/features/printers-room/scene/layout';
import {
  createDioramaRoom,
  createWorkbench,
  createPrinterMat,
  createProceduralPrinter,
  disposeHierarchy,
} from '../src/features/printers-room/scene/proceduralModels';

const dummyPrinter: Printer = {
  id: 'printer-123',
  name: 'Bambu Lab X1-Carbon',
  power_w: 350,
  price: 120000,
  lifespan_hours: 8000,
  color: '#8b5cf6', // Violet
};

const dummyStation: StationPosition = {
  index: 0,
  printerId: 'printer-123',
  position: [0, 0.85, 0],
  rotationY: 0,
  deskIndex: 0,
};

test('createDioramaRoom creates room group with platform and walls', () => {
  const room = createDioramaRoom([8, 0.35, 8]);
  assert.ok(room);
  assert.ok(room.children.length > 0);
  disposeHierarchy(room);
});

test('createWorkbench creates desk structure with tabletop and legs', () => {
  const desk = createWorkbench(3.2, 0.85, 1.3);
  assert.ok(desk);
  assert.ok(desk.children.length >= 4); // top + legs
  // Tabletop top surface should be exactly at height 0.85
  const topMesh = desk.children[0] as { position: { y: number } };
  assert.equal(Math.round((topMesh.position.y + 0.065 / 2) * 1000) / 1000, 0.85);
  disposeHierarchy(desk);
});

test('createPrinterMat creates mat with printer color applied', () => {
  const mat = createPrinterMat('#8b5cf6');
  assert.ok(mat);
  assert.ok(mat.children.length > 0);
  disposeHierarchy(mat);
});

test('createProceduralPrinter creates interactive group with proper userData and hierarchy', () => {
  const printerGroup = createProceduralPrinter(dummyPrinter, dummyStation);
  assert.ok(printerGroup);
  assert.equal(printerGroup.userData.isPrinter, true);
  assert.equal(printerGroup.userData.printer.id, 'printer-123');
  assert.ok(printerGroup.userData.matMesh);
  assert.ok(printerGroup.userData.shadowMesh);
  assert.ok(printerGroup.userData.bodyGroup);

  // Initial elevation should be 0
  assert.equal(printerGroup.userData.targetElevation, 0);
  assert.equal(printerGroup.userData.currentElevation, 0);

  // Position should match station
  assert.equal(printerGroup.position.x, 0);
  assert.equal(printerGroup.position.y, 0.85);
  assert.equal(printerGroup.position.z, 0);

  // Test disposal cleanly traverses without throwing
  disposeHierarchy(printerGroup);
});

test('createPrinterScreenMaterial and createPeiPlateMaterial initialize gracefully in non-DOM environment', () => {
  const {
    createPrinterScreenMaterial,
    createPeiPlateMaterial,
  } = require('../src/features/printers-room/scene/materials');
  const screenMat = createPrinterScreenMaterial('Bambu Lab X1', '#8b5cf6');
  assert.ok(screenMat);
  const peiMat = createPeiPlateMaterial();
  assert.ok(peiMat);
});

