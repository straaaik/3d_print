import * as THREE from 'three';
import type { Printer } from '../../../shared/types';
import type { StationPosition } from './layout';

export interface InteractivePrinterUserData {
  isPrinter: true;
  printer: Printer;
  station: StationPosition;
  baseY: number;
  targetElevation: number;
  currentElevation: number;
  matMesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  bodyGroup: THREE.Group;
}

export type InteractivePrinterGroup = THREE.Group & {
  userData: InteractivePrinterUserData;
};
