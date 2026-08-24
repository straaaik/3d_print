export type MaterialDifficultyCategory = 'pla_petg' | 'abs_asa' | 'tpu_flex' | 'nylon_cf';

export interface MaterialDifficultyConfig {
  id: MaterialDifficultyCategory;
  name: string;
  shortLabel: string;
  description: string;
  defaultMarkup: number;
  keywords: string[];
  badgeColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
}

export const MATERIAL_DIFFICULTY_CONFIGS: Record<MaterialDifficultyCategory, MaterialDifficultyConfig> = {
  pla_petg: {
    id: 'pla_petg',
    name: 'Базовые пластики (PLA, PETG, Wood, Silk)',
    shortLabel: 'Базовый',
    description: 'Стандартная печать, не требует закрытой камеры и каленых сопел',
    defaultMarkup: 100,
    keywords: ['pla', 'petg', 'wood', 'silk', 'co-pet', 'copet'],
    badgeColor: 'bg-emerald-500/15',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    icon: '🟢',
  },
  abs_asa: {
    id: 'abs_asa',
    name: 'Технические пластики (ABS, ASA, HIPS, SBS, SAN)',
    shortLabel: 'Технический',
    description: 'Требуют термокамеру, подогрев и учет термоусадки детали',
    defaultMarkup: 120,
    keywords: ['abs', 'asa', 'hips', 'sbs', 'san', 'pp'],
    badgeColor: 'bg-amber-500/15',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    icon: '🟡',
  },
  tpu_flex: {
    id: 'tpu_flex',
    name: 'Гибкие пластики (TPU, TPE, FLEX, Rubber)',
    shortLabel: 'Гибкий (FLEX)',
    description: 'Медленная печать, риск зажевывания нити, сложная настройка ретрактов',
    defaultMarkup: 140,
    keywords: ['tpu', 'flex', 'tpe', 'rubber', 'd60', 'd70', 'd75', 'd85', 'd95'],
    badgeColor: 'bg-purple-500/15',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    icon: '🟣',
  },
  nylon_cf: {
    id: 'nylon_cf',
    name: 'Инженерные и композиты (Nylon, PA, Carbon, PC, CF/GF)',
    shortLabel: 'Инженерный (PRO)',
    description: 'Абразивный износ сопел (нужна закаленная сталь), сушка перед печатью, температуры 280°C+',
    defaultMarkup: 170,
    keywords: ['nylon', 'pa', 'pa6', 'pa12', 'carbon', 'cf', 'gf', 'pc', 'peek', 'pom', 'ultem', 'поликарбонат'],
    badgeColor: 'bg-rose-500/15',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    icon: '🔴',
  },
};

/**
 * Определение категории сложности материала по названию катушки филамента
 */
export function detectMaterialDifficulty(filamentName: string): MaterialDifficultyConfig {
  if (!filamentName) return MATERIAL_DIFFICULTY_CONFIGS.pla_petg;

  const lower = filamentName.toLowerCase();

  // 1. Проверяем высокотемпературные и композиты (приоритет 1, так как 'petg-cf' содержит и 'petg', и 'cf')
  for (const kw of MATERIAL_DIFFICULTY_CONFIGS.nylon_cf.keywords) {
    if (lower.includes(kw)) {
      return MATERIAL_DIFFICULTY_CONFIGS.nylon_cf;
    }
  }

  // 2. Проверяем гибкие пластики
  for (const kw of MATERIAL_DIFFICULTY_CONFIGS.tpu_flex.keywords) {
    if (lower.includes(kw)) {
      return MATERIAL_DIFFICULTY_CONFIGS.tpu_flex;
    }
  }

  // 3. Проверяем технические пластики
  for (const kw of MATERIAL_DIFFICULTY_CONFIGS.abs_asa.keywords) {
    if (lower.includes(kw)) {
      return MATERIAL_DIFFICULTY_CONFIGS.abs_asa;
    }
  }

  // 4. По умолчанию базовый
  return MATERIAL_DIFFICULTY_CONFIGS.pla_petg;
}
