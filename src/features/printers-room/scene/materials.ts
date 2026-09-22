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

// Procedural Canvas Textures for PBR Details (zero network payload)
function createPeiPlateTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Dark textured base
  ctx.fillStyle = '#22232a';
  ctx.fillRect(0, 0, 512, 512);

  // 2. Micro powder-coated speckles
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Technical alignment grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  const step = 64;
  for (let x = step; x < 512; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x, 488);
    ctx.stroke();
  }
  for (let y = step; y < 512; y += step) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(488, y);
    ctx.stroke();
  }

  // 4. Center origin crosshair
  ctx.strokeStyle = 'rgba(12, 180, 224, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(256, 256, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(236, 256);
  ctx.lineTo(276, 256);
  ctx.moveTo(256, 236);
  ctx.lineTo(256, 276);
  ctx.stroke();

  // 5. Tech markings & brand text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TEXTURED PEI PLATE  •  256×256 mm', 256, 475);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createScreenTexture(printerName: string, colorHex: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Dark glass background
  ctx.fillStyle = '#0b0c10';
  ctx.fillRect(0, 0, 512, 320);

  // Top status bar
  ctx.fillStyle = '#13151c';
  ctx.fillRect(0, 0, 512, 44);

  // Status green dot
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(26, 22, 6, 0, Math.PI * 2);
  ctx.fill();

  // Printer name
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  const displayName = printerName.length > 20 ? printerName.slice(0, 19) + '…' : printerName;
  ctx.fillText(displayName.toUpperCase(), 42, 28);

  // Status text
  ctx.fillStyle = '#0cb4e0';
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('BAMBU OS v01.07', 490, 27);

  // Telemetry cards
  // Card 1: Nozzle
  ctx.fillStyle = '#161922';
  ctx.beginPath();
  ctx.roundRect(24, 60, 220, 100, 8);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('NOZZLE TEMP', 40, 85);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('220°C', 40, 120);

  ctx.fillStyle = '#0cb4e0';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('/ 220°C TARGET', 40, 142);

  // Card 2: Bed
  ctx.fillStyle = '#161922';
  ctx.beginPath();
  ctx.roundRect(268, 60, 220, 100, 8);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('BED TEMP', 284, 85);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('60°C', 284, 120);

  ctx.fillStyle = '#10b981';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('/ 60°C TARGET', 284, 142);

  // Main status panel
  ctx.fillStyle = '#141720';
  ctx.beginPath();
  ctx.roundRect(24, 180, 464, 115, 10);
  ctx.fill();

  // Filament color pill
  const resolvedHex = resolveColorHex(colorHex);
  ctx.fillStyle = resolvedHex;
  ctx.beginPath();
  ctx.arc(52, 235, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('STANDBY / READY', 82, 232);

  ctx.fillStyle = '#64748b';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('CHAMBER 32°C  •  FAN 100%  •  AMS SLOT 1 ACTIVE', 82, 255);

  // Clean border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, 510, 318);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createFloorMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x16161c,
    roughness: 0.65,
    metalness: 0.25,
  });
}

export function createWallMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x0c0c10,
    roughness: 0.9,
    metalness: 0.1,
  });
}

// Procedural Walnut Wood Tabletop Texture (warm rich wood grain)
export function createWalnutWoodTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Base warm walnut gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, '#754b2b');
  grad.addColorStop(0.3, '#845431');
  grad.addColorStop(0.7, '#6b4326');
  grad.addColorStop(1, '#7a4e2d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // 2. Wood grain fibrous lines along X
  ctx.lineWidth = 1.2;
  for (let y = 0; y < 512; y += 2) {
    const freq = 0.02 + ((y % 40) / 40) * 0.015;
    const alpha = 0.08 + Math.sin(y * 0.12) * 0.06;
    ctx.strokeStyle = y % 4 === 0 ? `rgba(45, 25, 12, ${alpha + 0.08})` : `rgba(160, 110, 68, ${alpha})`;
    ctx.beginPath();
    for (let x = 0; x < 512; x += 8) {
      const wave = Math.sin(x * freq) * 3.5 + Math.cos(x * 0.006 + y * 0.05) * 2;
      if (x === 0) {
        ctx.moveTo(x, y + wave);
      } else {
        ctx.lineTo(x, y + wave);
      }
    }
    ctx.stroke();
  }

  // 3. Subtle organic wood knots & grain swirls
  for (let k = 0; k < 3; k++) {
    const kx = 120 + k * 140;
    const ky = 160 + (k % 2) * 180;
    const radial = ctx.createRadialGradient(kx, ky, 2, kx, ky, 65);
    radial.addColorStop(0, 'rgba(40, 20, 10, 0.25)');
    radial.addColorStop(0.4, 'rgba(65, 35, 18, 0.12)');
    radial.addColorStop(1, 'rgba(120, 75, 40, 0)');
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 70, 18, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

export function createPlanterTextTexture(
  line1: string,
  line2?: string,
  line3?: string,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#22242a';
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = '#9aa1af';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';

  let y = 80;
  ctx.fillText(line1.toUpperCase(), 40, y);
  if (line2) {
    y += 44;
    ctx.fillText(line2.toUpperCase(), 40, y);
  }
  if (line3) {
    y += 44;
    ctx.fillText(line3.toUpperCase(), 40, y);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createStationPlaqueTexture(name: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#53341d';
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cleanName = name.length > 8 ? name.slice(0, 7) : name;
  ctx.fillText(cleanName.toUpperCase(), 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createTabletopMaterial(): THREE.MeshStandardMaterial {
  const woodTexture = createWalnutWoodTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x825330,
    roughness: 0.38,
    metalness: 0.08,
  });
  if (woodTexture) {
    mat.map = woodTexture;
  }
  return mat;
}

export function createWarmLedMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffaa44,
    emissive: 0xffaa44,
    emissiveIntensity: 3.5,
    roughness: 0.1,
  });
}

export function createPerimeterConcreteMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x22242a,
    roughness: 0.85,
    metalness: 0.15,
  });
}

export function createFoliageMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x1d5838,
    roughness: 0.42,
    metalness: 0.06,
  });
}

export function createSoilMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x141210,
    roughness: 0.95,
  });
}

export function createSteelRackMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x1c1d22,
    roughness: 0.35,
    metalness: 0.82,
  });
}

export function createHolographicOutlineMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 3.2,
    roughness: 0.1,
  });
}

export function createTableLegsMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x1e1f24,
    roughness: 0.4,
    metalness: 0.8,
  });
}

export function createPrinterFrameMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x22232a,
    roughness: 0.32,
    metalness: 0.8,
  });
}

export function createPrinterGlassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x111622,
    transparent: true,
    opacity: 0.52,
    roughness: 0.05,
    metalness: 0.08,
    transmission: 0.82,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
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
    roughness: 0.45,
    metalness: 0.15,
    emissive: color,
    emissiveIntensity: 0.15,
  });
}

export function createMatEdgeMaterial(colorHex: string): THREE.MeshStandardMaterial {
  const hex = resolveColorHex(colorHex);
  const color = new THREE.Color(hex);
  return new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.75,
    roughness: 0.25,
  });
}

export function createSpoolMaterial(colorHex: string): THREE.MeshStandardMaterial {
  const hex = resolveColorHex(colorHex);
  const color = new THREE.Color(hex);
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.35,
    metalness: 0.25,
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
    color: 0x6e7482,
    roughness: 0.22,
    metalness: 0.9,
  });
}

export function createCarbonRodMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x16171b,
    roughness: 0.22,
    metalness: 0.75,
  });
}

export function createToolheadMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xdde2ea,
    roughness: 0.32,
    metalness: 0.18,
  });
}

export function createChamberLedMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 2.8,
    roughness: 0.1,
  });
}

export function createPeiPlateMaterial(): THREE.MeshStandardMaterial {
  const texture = createPeiPlateTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2c2d36,
    roughness: 0.52,
    metalness: 0.4,
  });
  if (texture) {
    mat.map = texture;
  }
  return mat;
}

export function createPtfeTubeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.8,
    roughness: 0.2,
    metalness: 0.1,
  });
}

export function createSpoolFlangeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x22232a,
    roughness: 0.4,
    metalness: 0.35,
  });
}

export function createPrinterScreenMaterial(
  printerName: string,
  colorHex: string,
): THREE.MeshStandardMaterial {
  const texture = createScreenTexture(printerName, colorHex);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.1,
  });
  if (texture) {
    mat.map = texture;
    mat.emissive = new THREE.Color(0xffffff);
    mat.emissiveMap = texture;
    mat.emissiveIntensity = 0.9;
  }
  return mat;
}

