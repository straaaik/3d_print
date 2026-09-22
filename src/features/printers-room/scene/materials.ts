import * as THREE from 'three';
import { normalizeHex, isValidHex } from '../../../shared/lib/colorUtils';

export function resolveColorHex(color?: string, fallback = '#0CB4E0'): string {
  if (color && isValidHex(color)) {
    return normalizeHex(color);
  }
  return fallback;
}

export function createPlatformMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x121216,
    roughness: 0.85,
    metalness: 0.15,
  });
}

export function createFloorMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x16161b,
    roughness: 0.75,
    metalness: 0.2,
  });
}

export function createWallMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x0e0e12,
    roughness: 0.9,
    metalness: 0.1,
  });
}

export function createTabletopMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x1f1f26,
    roughness: 0.55,
    metalness: 0.35,
  });
}

export function createTableLegsMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x2b2b34,
    roughness: 0.4,
    metalness: 0.7,
  });
}

export function createPrinterFrameMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x24242c,
    roughness: 0.35,
    metalness: 0.75,
  });
}

export function createPrinterGlassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x10131a,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.6,
    ior: 1.5,
  });
}

export function createPrinterBedMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x33333d,
    roughness: 0.6,
    metalness: 0.4,
  });
}

export function createHotendMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x71717a,
    roughness: 0.25,
    metalness: 0.85,
  });
}

export function createStatusLedMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
}

export function createMatMaterial(colorHex: string): THREE.MeshStandardMaterial {
  const hex = resolveColorHex(colorHex);
  const color = new THREE.Color(hex);
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.5,
    metalness: 0.15,
    emissive: color,
    emissiveIntensity: 0.18,
  });
}

export function createMatEdgeMaterial(colorHex: string): THREE.MeshStandardMaterial {
  const hex = resolveColorHex(colorHex);
  const color = new THREE.Color(hex);
  return new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
}

export function createSpoolMaterial(colorHex: string): THREE.MeshStandardMaterial {
  const hex = resolveColorHex(colorHex);
  const color = new THREE.Color(hex);
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.4,
    metalness: 0.2,
  });
}

export function createContactShadowMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
}

export function createBrushedPillarMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x646975,
    roughness: 0.28,
    metalness: 0.85,
  });
}

export function createCarbonRodMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x18181d,
    roughness: 0.2,
    metalness: 0.75,
  });
}

export function createToolheadMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xdbe0e8,
    roughness: 0.35,
    metalness: 0.15,
  });
}

export function createChamberLedMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 3.5,
    roughness: 0.1,
  });
}

export function createPeiPlateMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x27282f,
    roughness: 0.6,
    metalness: 0.35,
  });
}

export function createPtfeTubeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.75,
    roughness: 0.25,
    metalness: 0.1,
  });
}

export function createSpoolFlangeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x24252c,
    roughness: 0.45,
    metalness: 0.3,
  });
}

