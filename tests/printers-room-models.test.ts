import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { instanceTemplate, disposeInstances } from '../src/features/printers-room/scene/instances';
import type { Printer } from '../src/shared/types';
import type { StationPosition } from '../src/features/printers-room/scene/layout';
import {
  createDioramaRoom,
  createWorkbench,
  createPrinterMat,
  createProceduralPrinter,
  applyBambuA1ModelToPrinterGroup,
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

test('instances preserve nested GLB transforms and share geometry without disposing the template', () => {
  const source = new THREE.Group();
  source.position.y = .5;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  mesh.position.x = 2;
  source.add(mesh);
  let disposed = false;
  mesh.geometry.addEventListener('dispose', () => { disposed = true; });
  const group = instanceTemplate(source, [new THREE.Matrix4().makeTranslation(10, 0, 0)]);
  const batch = group.children[0] as THREE.InstancedMesh;
  assert.equal(batch.geometry, mesh.geometry);
  const matrix = new THREE.Matrix4();
  batch.getMatrixAt(0, matrix);
  assert.equal(matrix.elements[12], 12);
  assert.equal(matrix.elements[13], .5);
  disposeInstances(group);
  assert.equal(disposed, false, 'rebuilding a room must not invalidate its shared template');
});

test('large instance sets are split for culling and preserve selection indices', () => {
  const source = new THREE.Group();
  source.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  const group = instanceTemplate(source, Array.from({ length: 200 }, (_, i) => new THREE.Matrix4().makeTranslation(i, 0, 0)));
  assert.equal(group.children.length, 4);
  assert.equal(group.children[3].userData.instanceOffset, 192);
  assert.equal((group.children[3] as THREE.InstancedMesh).count, 8);
  disposeInstances(group);
});

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

test('createProceduralPrinter with glbTemplate attaches cloned model to bodyGroup', () => {
  const dummyTemplate = new THREE.Group();
  const dummyPart = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5));
  dummyTemplate.add(dummyPart);

  const printerGroup = createProceduralPrinter(dummyPrinter, dummyStation, dummyTemplate);
  assert.ok(printerGroup);
  assert.equal(printerGroup.userData.bodyGroup.children.length, 1);
  disposeHierarchy(printerGroup);
});

test('applyBambuA1ModelToPrinterGroup dynamically swaps procedural body for cloned template', () => {
  const printerGroup = createProceduralPrinter(dummyPrinter, dummyStation);
  assert.ok(printerGroup.userData.bodyGroup.children.length > 1);

  const dummyTemplate = new THREE.Group();
  dummyTemplate.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4)));

  applyBambuA1ModelToPrinterGroup(printerGroup, dummyTemplate);
  assert.equal(printerGroup.userData.bodyGroup.children.length, 1);
  disposeHierarchy(printerGroup);
});
