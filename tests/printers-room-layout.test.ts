import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateRoomLayout,
  getFocusCameraTarget,
} from '../src/features/printers-room/scene/layout';

test('calculateRoomLayout handles 0 printers with a default empty showcase desk', () => {
  const layout = calculateRoomLayout([]);
  assert.equal(layout.stations.length, 0);
  assert.equal(layout.workbenches.length, 1);
  assert.ok(layout.roomSize[0] > 0);
  assert.ok(layout.roomSize[2] > 0);
  assert.equal(layout.overviewCameraPosition.length, 3);
  assert.equal(layout.overviewCameraTarget.length, 3);
});

test('calculateRoomLayout places 1 printer centrally on workbench', () => {
  const layout = calculateRoomLayout([{ id: 'p1' }]);
  assert.equal(layout.stations.length, 1);
  const st = layout.stations[0];
  assert.equal(st.printerId, 'p1');
  assert.equal(st.index, 0);
  // Centered along X
  assert.equal(st.position[0], 0);
  // Y coordinate is on the desk surface
  assert.ok(st.position[1] > 0.7);
});

test('calculateRoomLayout distributes multiple printers with adequate clearance', () => {
  const printers = [
    { id: 'p1' },
    { id: 'p2' },
    { id: 'p3' },
    { id: 'p4' },
  ];
  const layout = calculateRoomLayout(printers);
  assert.equal(layout.stations.length, 4);

  // Check that every printer has a unique position and minimum distance between each other
  for (let i = 0; i < layout.stations.length; i++) {
    for (let j = i + 1; j < layout.stations.length; j++) {
      const posA = layout.stations[i].position;
      const posB = layout.stations[j].position;
      const dx = posA[0] - posB[0];
      const dy = posA[1] - posB[1];
      const dz = posA[2] - posB[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      assert.ok(dist >= 1.0, `Printers ${i} and ${j} are too close (dist = ${dist})`);
    }
  }
});

test('getFocusCameraTarget maintains fixed isometric vector while framing printer', () => {
  const stationPos: [number, number, number] = [2, 0.85, -1];
  const focus = getFocusCameraTarget(stationPos);

  assert.ok(focus.target[0] === stationPos[0]);
  assert.ok(focus.target[1] >= stationPos[1]);
  assert.ok(focus.target[2] === stationPos[2]);

  // Position should be offset along positive X, Y, Z (fixed isometric direction)
  assert.ok(focus.position[0] > focus.target[0]);
  assert.ok(focus.position[1] > focus.target[1]);
  assert.ok(focus.position[2] > focus.target[2]);

  // Vector direction dx, dz should be equal for isometric 45 deg
  const dx = focus.position[0] - focus.target[0];
  const dz = focus.position[2] - focus.target[2];
  assert.ok(Math.abs(dx - dz) < 0.001, `Isometric X and Z offsets must match for 45 deg angle, got ${dx} and ${dz}`);
});
