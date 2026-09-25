export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number; // 0..360
  s: number; // 0..100
  v: number; // 0..100
}

export interface HSL {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
}

export interface FilamentPreset {
  name: string;
  category: 'base' | 'engineering' | 'metallic';
  hex: string;
  ral?: string;
}

export const FILAMENT_PRESETS: FilamentPreset[] = [
  // Базовые цвета
  { name: 'Jet Black (Глубокий чёрный)', category: 'base', hex: '#121214', ral: 'RAL 9005' },
  { name: 'Pure White (Белоснежный)', category: 'base', hex: '#F8FAFC', ral: 'RAL 9003' },
  { name: 'Cyber Cyan (Неоновый циан)', category: 'base', hex: '#06B6D4' },
  { name: 'Cobalt Blue (Кобальтовый)', category: 'base', hex: '#2563EB', ral: 'RAL 5002' },
  { name: 'Signal Red (Сигнальный красный)', category: 'base', hex: '#DC2626', ral: 'RAL 3001' },
  { name: 'Prusa Orange (Индустриальный оранжевый)', category: 'base', hex: '#EA580C', ral: 'RAL 2004' },
  { name: 'Emerald Green (Изумрудный)', category: 'base', hex: '#059669', ral: 'RAL 6029' },
  { name: 'Signal Yellow (Жёлтый сигнальный)', category: 'base', hex: '#EAB308', ral: 'RAL 1023' },

  // Инженерные материалы
  { name: 'Carbon Fiber (Углеволокно)', category: 'engineering', hex: '#1C1F26' },
  { name: 'Military Olive (Армейский оливковый)', category: 'engineering', hex: '#44513E', ral: 'RAL 6003' },
  { name: 'Industrial Grey (Станочный серый)', category: 'engineering', hex: '#64748B', ral: 'RAL 7035' },
  { name: 'Desert Khaki (Пустынный койот)', category: 'engineering', hex: '#8C7B67', ral: 'RAL 1020' },
  { name: 'Deep Navy (Морской синий)', category: 'engineering', hex: '#1E293B', ral: 'RAL 5011' },
  { name: 'Translucent Clear (Полупрозрачный)', category: 'engineering', hex: '#CBD5E1' },

  // Металлики и спецэффекты
  { name: 'Galaxy Silver (Космическое серебро)', category: 'metallic', hex: '#94A3B8' },
  { name: 'Silk Gold (Шёлковое золото)', category: 'metallic', hex: '#D4AF37' },
  { name: 'Antique Bronze (Античная бронза)', category: 'metallic', hex: '#785436' },
  { name: 'Copper Red (Медный блеск)', category: 'metallic', hex: '#B45309' },
  { name: 'Gunmetal (Оружейная сталь)', category: 'metallic', hex: '#374151' },
  { name: 'Titanium (Титановый сатин)', category: 'metallic', hex: '#4B5563' },
];

/** Преобразует HEX в RGB */
export function hexToRgb(hex: string): RGB {
  let cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  if (cleaned.length !== 6) {
    return { r: 255, g: 255, b: 255 };
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/** Преобразует RGB в HEX (#RRGGBB) */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** RGB в HSV */
export function rgbToHsv(r: number, g: number, b: number): HSV {
  const rNorm = Math.max(0, Math.min(255, r)) / 255;
  const gNorm = Math.max(0, Math.min(255, g)) / 255;
  const bNorm = Math.max(0, Math.min(255, b)) / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const v = Math.round(max * 100);

  return { h, s, v };
}

/** HSV в RGB */
export function hsvToRgb(h: number, s: number, v: number): RGB {
  const hNorm = ((h % 360) + 360) % 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const vNorm = Math.max(0, Math.min(100, v)) / 100;

  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = vNorm - c;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hNorm >= 0 && hNorm < 60) {
    rPrime = c;
    gPrime = x;
  } else if (hNorm >= 60 && hNorm < 120) {
    rPrime = x;
    gPrime = c;
  } else if (hNorm >= 120 && hNorm < 180) {
    rPrime = c;
    bPrime = x;
  } else if (hNorm >= 180 && hNorm < 240) {
    rPrime = x;
    bPrime = c;
  } else if (hNorm >= 240 && hNorm < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

/** RGB в HSL */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** HSL в RGB */
export function hslToRgb(h: number, s: number, l: number): RGB {
  const hNorm = ((h % 360) + 360) % 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hNorm >= 0 && hNorm < 60) {
    rPrime = c;
    gPrime = x;
    bPrime = 0;
  } else if (hNorm >= 60 && hNorm < 120) {
    rPrime = x;
    gPrime = c;
    bPrime = 0;
  } else if (hNorm >= 120 && hNorm < 180) {
    rPrime = 0;
    gPrime = c;
    bPrime = x;
  } else if (hNorm >= 180 && hNorm < 240) {
    rPrime = 0;
    gPrime = x;
    bPrime = c;
  } else if (hNorm >= 240 && hNorm < 300) {
    rPrime = x;
    gPrime = 0;
    bPrime = c;
  } else {
    rPrime = c;
    gPrime = 0;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

/** HEX в HSV */
export function hexToHsv(hex: string): HSV {
  const rgb = hexToRgb(hex);
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
}

/** HEX в HSL */
export function hexToHsl(hex: string): HSL {
  const rgb = hexToRgb(hex);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/** HSV в HEX */
export function hsvToHex(h: number, s: number, v: number): string {
  const rgb = hsvToRgb(h, s, v);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/** HSL в HEX */
export function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/** Проверяет валидность HEX строки (#fff, #ffffff, fff, ffffff) */
export function isValidHex(hex: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

/** Нормализует HEX до формата #RRGGBB в верхнем регистре */
export function normalizeHex(hex: string): string {
  let cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  if (cleaned.length === 6 && /^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  return '#FFFFFF';
}

/** Рассчитывает контрастный цвет текста (чёрный или белый) по яркости */
export function getContrastTextColor(hex: string): '#000000' | '#FFFFFF' {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#000000' : '#FFFFFF';
}

/** Захват цвета через нативный EyeDropper браузера */
export async function pickScreenColor(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const EyeDropperClass = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
  if (!EyeDropperClass) return null;

  try {
    const eyeDropper = new EyeDropperClass();
    const result = await eyeDropper.open();
    return result.sRGBHex.toUpperCase();
  } catch {
    // Пользователь нажал Escape или отменил пипетку
    return null;
  }
}

/** Проверяет доступность EyeDropper API в браузере */
export function hasEyeDropperSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as unknown as { EyeDropper?: unknown }).EyeDropper !== 'undefined';
}
