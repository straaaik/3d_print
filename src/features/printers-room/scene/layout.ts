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
  size: [number, number, number];
}
export interface RoomLayoutConfig {
  roomSize: [number, number, number];
  stations: StationPosition[];
  workbenches: WorkbenchConfig[];
  overviewCameraPosition: [number, number, number];
  overviewCameraTarget: [number, number, number];
}
/** Balanced rows grow in both axes; each station has a modular desk and a clear aisle. */
export function calculateRoomLayout(printers: Array<{ id: string }>): RoomLayoutConfig {
  const count = Math.max(1, printers.length);
  const columns = Math.ceil(Math.sqrt(count * 1.5));
  const rows = Math.ceil(count / columns);
  const rowCapacity = Math.ceil(count / rows);
  const width = Math.max(5.6, rowCapacity * 1.12 + 3.4);
  const depth = Math.max(5.2, rows * 1.9 + 2.4);
  const stations: StationPosition[] = [];
  const workbenches: WorkbenchConfig[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / rowCapacity);
    const rowCount = Math.min(rowCapacity, count - row * rowCapacity);
    const x = (i % rowCapacity - (rowCount - 1) / 2) * 1.12 + (count > 1 ? .7 : 0);
    const z = (row - (rows - 1) / 2) * 1.9 + .55;
    workbenches.push({ id: `desk-${i}`, position: [x, 0, z], size: [1.1, .72, .88] });
    if (printers[i]) stations.push({ index: i, printerId: printers[i].id,
      position: [x, .72, z], rotationY: 0, deskIndex: i });
  }
  const distance = Math.max(width, depth);
  return { roomSize: [width, .28, depth], stations, workbenches,
    overviewCameraPosition: [distance, distance * .9, distance],
    overviewCameraTarget: [0, .4, 0] };
}
export function getFocusCameraTarget(position: [number, number, number]): {
  position: [number, number, number]; target: [number, number, number];
} {
  return { position: [position[0] + 2.4, position[1] + 2.39, position[2] + 2.4],
    target: [position[0], position[1] + .35, position[2]] };
}
/** Orthographic vertical span with room for the HUD, including narrow screens. */
export function getOverviewSpan(layout: RoomLayoutConfig, aspect: number, top = false): number {
  const [w, , d] = layout.roomSize;
  const horizontal = top ? w : (w + d) / Math.SQRT2;
  const vertical = top ? d : (w + d) * .34 + 2.6;
  return Math.max(vertical, horizontal / Math.max(.2, aspect)) * 1.1;
}
