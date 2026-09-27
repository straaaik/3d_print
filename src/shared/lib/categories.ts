import {
  Car, Home, Cpu, Gamepad2, Wrench, Tag, Folder, Sparkles, Box,
  Lightbulb, Rocket, Heart, Gift, Palette, Layers, LucideIcon
} from 'lucide-react';

export interface ProductCategory {
  id: string;
  label: string;
  iconName?: string;
  icon?: string; // для обратной совместимости со старыми записями
  color?: string;
}

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  car: Car,
  '🚗': Car,
  'авто / мото': Car,
  'авто': Car,
  home: Home,
  '🏠': Home,
  'декор и дом': Home,
  'декор': Home,
  cpu: Cpu,
  '⚙️': Cpu,
  'инженерия и техника': Cpu,
  'инженерия': Cpu,
  'техника': Cpu,
  gamepad: Gamepad2,
  '🎮': Gamepad2,
  'гаджеты и игры': Gamepad2,
  'игры': Gamepad2,
  wrench: Wrench,
  '🔧': Wrench,
  '🛠️': Wrench,
  'фурнитура': Wrench,
  'инструменты': Wrench,
  tag: Tag,
  '🏷️': Tag,
  'разное': Tag,
  box: Box,
  '📦': Box,
  folder: Folder,
  '📁': Folder,
  sparkles: Sparkles,
  '✨': Sparkles,
  lightbulb: Lightbulb,
  '💡': Lightbulb,
  rocket: Rocket,
  '🚀': Rocket,
  heart: Heart,
  '❤️': Heart,
  '🧸': Heart,
  gift: Gift,
  '🎁': Gift,
  palette: Palette,
  '🎨': Palette,
  layers: Layers,
};

export const AVAILABLE_CATEGORY_ICONS = [
  { id: 'tag', label: 'Ярлык', icon: Tag },
  { id: 'box', label: 'Коробка / Товар', icon: Box },
  { id: 'car', label: 'Авто / Мото', icon: Car },
  { id: 'home', label: 'Дом / Декор', icon: Home },
  { id: 'cpu', label: 'Техника / Инженерия', icon: Cpu },
  { id: 'gamepad', label: 'Игры / Гаджеты', icon: Gamepad2 },
  { id: 'wrench', label: 'Фурнитура / Инструмент', icon: Wrench },
  { id: 'sparkles', label: 'Декор / Особое', icon: Sparkles },
  { id: 'palette', label: 'Творчество / Арт', icon: Palette },
  { id: 'rocket', label: 'Проекты / Модели', icon: Rocket },
  { id: 'lightbulb', label: 'Идеи / Концепты', icon: Lightbulb },
  { id: 'heart', label: 'Подарки / Сувениры', icon: Heart },
];

export function getCategoryLucideIcon(categoryNameOrId: string | undefined): LucideIcon {
  if (!categoryNameOrId) return Tag;
  const lower = categoryNameOrId.toLowerCase().trim();

  if (CATEGORY_ICON_MAP[lower]) {
    return CATEGORY_ICON_MAP[lower];
  }

  // Поиск по ключевым словам
  if (lower.includes('авто') || lower.includes('машин') || lower.includes('мото')) return Car;
  if (lower.includes('дом') || lower.includes('декор') || lower.includes('интерьер')) return Home;
  if (lower.includes('инженер') || lower.includes('техник') || lower.includes('электрон') || lower.includes('робот')) return Cpu;
  if (lower.includes('игр') || lower.includes('гаджет') || lower.includes('джойстик') || lower.includes('плей')) return Gamepad2;
  if (lower.includes('фурнитур') || lower.includes('крепеж') || lower.includes('инструмент') || lower.includes('метиз')) return Wrench;
  if (lower.includes('арт') || lower.includes('краск') || lower.includes('покрас')) return Palette;
  if (lower.includes('подар') || lower.includes('сувенир') || lower.includes('сердц')) return Heart;
  if (lower.includes('модел') || lower.includes('ракета') || lower.includes('космос')) return Rocket;
  if (lower.includes('сборк') || lower.includes('набор')) return Box;

  return Tag;
}

export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'Авто / Мото', label: 'Авто / Мото', iconName: 'car', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { id: 'Декор и Дом', label: 'Декор и Дом', iconName: 'home', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { id: 'Инженерия и Техника', label: 'Инженерия и Техника', iconName: 'cpu', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { id: 'Гаджеты и Игры', label: 'Гаджеты и Игры', iconName: 'gamepad', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { id: 'Фурнитура', label: 'Фурнитура', iconName: 'wrench', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { id: 'Разное', label: 'Разное', iconName: 'tag', color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
];

export function getStoredCategories(): ProductCategory[] {
  if (typeof window === 'undefined') return INITIAL_PRODUCT_CATEGORIES;
  try {
    const raw = localStorage.getItem('custom_product_categories');
    if (!raw) return INITIAL_PRODUCT_CATEGORIES;
    const custom = JSON.parse(raw) as ProductCategory[];

    const combined = [...INITIAL_PRODUCT_CATEGORIES];
    for (const c of custom) {
      if (!combined.some(existing => existing.id.toLowerCase() === c.id.toLowerCase())) {
        combined.push(c);
      }
    }
    return combined;
  } catch {
    return INITIAL_PRODUCT_CATEGORIES;
  }
}

import { productsTheme } from '../theme';

export function saveNewCategory(name: string, iconName = 'tag'): ProductCategory[] {
  const trimmed = name.trim();
  if (!trimmed) return getStoredCategories();

  const newCat: ProductCategory = {
    id: trimmed,
    label: trimmed,
    iconName: iconName || 'tag',
    color: productsTheme.badge.subtle,
  };

  if (typeof window === 'undefined') return INITIAL_PRODUCT_CATEGORIES;
  try {
    const current = getStoredCategories();
    if (current.some(c => c.id.toLowerCase() === trimmed.toLowerCase())) {
      return current;
    }
    const updated = [...current, newCat];

    const customOnly = updated.filter(c => !INITIAL_PRODUCT_CATEGORIES.some(init => init.id.toLowerCase() === c.id.toLowerCase()));
    localStorage.setItem('custom_product_categories', JSON.stringify(customOnly));
    return updated;
  } catch {
    return INITIAL_PRODUCT_CATEGORIES;
  }
}
