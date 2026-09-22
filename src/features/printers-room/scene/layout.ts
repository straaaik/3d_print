export interface StationPosition {
  index: number;
  printerId: string;
  position: [number, number, number];
  rotationY: number;
  deskIndex: number;
}

export interface WorkbenchConfig {
  id: string;
  position: [number, number, number];
  size: [number, number, number]; // [width, height, depth]
}

export interface RoomLayoutConfig {
  roomSize: [number, number, number]; // [width, height, depth]
  stations: StationPosition[];
  workbenches: WorkbenchConfig[];
  overviewCameraPosition: [number, number, number];
  overviewCameraTarget: [number, number, number];
}

const TABLE_HEIGHT = 0.85;
const TABLE_DEPTH = 1.3;
const PRINTER_SPACING_X = 1.45;

// Fixed 45-degree isometric direction vector
const ISO_X = 1;
const ISO_Y = 0.85;
const ISO_Z = 1;
const ISO_LEN = Math.sqrt(ISO_X * ISO_X + ISO_Y * ISO_Y + ISO_Z * ISO_Z);
const ISO_DIR: [number, number, number] = [
  ISO_X / ISO_LEN,
  ISO_Y / ISO_LEN,
  ISO_Z / ISO_LEN,
];

export function calculateRoomLayout(printers: Array<{ id: string }>): RoomLayoutConfig {
  const count = printers.length;

  if (count === 0) {
    const defaultTableWidth = 3.2;
    const workbenches: WorkbenchConfig[] = [
      {
        id: 'desk-0',
        position: [0, 0, 0],
        size: [defaultTableWidth, TABLE_HEIGHT, TABLE_DEPTH],
      },
    ];
    return {
      roomSize: [7.5, 0.35, 7.5],
      stations: [],
      workbenches,
      overviewCameraPosition: [
        10.5 * ISO_DIR[0],
        10.5 * ISO_DIR[1],
        10.5 * ISO_DIR[2],
      ],
      overviewCameraTarget: [0, TABLE_HEIGHT + 0.2, 0],
    };
  }

  const stations: StationPosition[] = [];
  const workbenches: WorkbenchConfig[] = [];

  if (count <= 3) {
    // Single row along X
    const deskWidth = Math.max(3.0, count * PRINTER_SPACING_X + 0.8);
    workbenches.push({
      id: 'desk-0',
      position: [0, 0, 0],
      size: [deskWidth, TABLE_HEIGHT, TABLE_DEPTH],
    });

    const startX = -((count - 1) / 2) * PRINTER_SPACING_X;
    for (let i = 0; i < count; i++) {
      stations.push({
        index: i,
        printerId: printers[i].id,
        position: [startX + i * PRINTER_SPACING_X, TABLE_HEIGHT, 0],
        rotationY: 0,
        deskIndex: 0,
      });
    }

    const roomW = Math.max(8.0, deskWidth + 3.0);
    const roomD = 8.0;
    const camDist = Math.max(10.5, roomW * 1.15);

    return {
      roomSize: [roomW, 0.35, roomD],
      stations,
      workbenches,
      overviewCameraPosition: [
        camDist * ISO_DIR[0],
        camDist * ISO_DIR[1],
        camDist * ISO_DIR[2],
      ],
      overviewCameraTarget: [0, TABLE_HEIGHT + 0.35, 0],
    };
  }

  // 4 or more printers: 2 rows (back row at z = -1.25, front row at z = 1.25)
  const half = Math.ceil(count / 2);
  const row0Count = half;
  const row1Count = count - half;
  const maxInRow = Math.max(row0Count, row1Count);
  const deskWidth = Math.max(3.2, maxInRow * PRINTER_SPACING_X + 0.8);

  const rowZOffset = 1.25;

  // Back row
  workbenches.push({
    id: 'desk-back',
    position: [0, 0, -rowZOffset],
    size: [deskWidth, TABLE_HEIGHT, TABLE_DEPTH],
  });

  // Front row
  workbenches.push({
    id: 'desk-front',
    position: [0, 0, rowZOffset],
    size: [deskWidth, TABLE_HEIGHT, TABLE_DEPTH],
  });

  // Back row stations
  const startXBack = -((row0Count - 1) / 2) * PRINTER_SPACING_X;
  for (let i = 0; i < row0Count; i++) {
    stations.push({
      index: i,
      printerId: printers[i].id,
      position: [startXBack + i * PRINTER_SPACING_X, TABLE_HEIGHT, -rowZOffset],
      rotationY: 0,
      deskIndex: 0,
    });
  }

  // Front row stations
  const startXFront = -((row1Count - 1) / 2) * PRINTER_SPACING_X;
  for (let i = 0; i < row1Count; i++) {
    const idx = row0Count + i;
    stations.push({
      index: idx,
      printerId: printers[idx].id,
      position: [startXFront + i * PRINTER_SPACING_X, TABLE_HEIGHT, rowZOffset],
      rotationY: 0,
      deskIndex: 1,
    });
  }

  const roomW = Math.max(9.0, deskWidth + 3.0);
  const roomD = Math.max(9.0, rowZOffset * 2 + TABLE_DEPTH + 3.0);
  const maxDim = Math.max(roomW, roomD);
  const camDist = maxDim * 1.25;

  return {
    roomSize: [roomW, 0.35, roomD],
    stations,
    workbenches,
    overviewCameraPosition: [
      camDist * ISO_DIR[0],
      camDist * ISO_DIR[1],
      camDist * ISO_DIR[2],
    ],
    overviewCameraTarget: [0, TABLE_HEIGHT + 0.35, 0],
  };
}

export function getFocusCameraTarget(stationPos: [number, number, number]): {
  position: [number, number, number];
  target: [number, number, number];
} {
  const focusDistance = 3.6;
  const targetYOffset = 0.35;

  const target: [number, number, number] = [
    stationPos[0],
    stationPos[1] + targetYOffset,
    stationPos[2],
  ];

  const position: [number, number, number] = [
    target[0] + focusDistance * ISO_DIR[0],
    target[1] + focusDistance * ISO_DIR[1],
    target[2] + focusDistance * ISO_DIR[2],
  ];

  return { position, target };
}
