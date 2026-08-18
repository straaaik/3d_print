export interface ProductCategory {
  id: string;
  label: string;
  icon?: string;
  color?: string;
}

export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'Авто / Мото', label: 'Авто / Мото', icon: '🚗', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { id: 'Декор и Дом', label: 'Декор и Дом', icon: '🏠', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { id: 'Инженерия и Техника', label: 'Инженерия и Техника', icon: '⚙️', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { id: 'Гаджеты и Игры', label: 'Гаджеты и Игры', icon: '🎮', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { id: 'Фурнитура', label: 'Фурнитура', icon: '🔧', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { id: 'Разное', label: 'Разное', icon: '🏷️', color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
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
  } catch (err) {
    return INITIAL_PRODUCT_CATEGORIES;
  }
}

export function saveNewCategory(name: string, icon = '📁'): ProductCategory[] {
  const trimmed = name.trim();
  if (!trimmed) return getStoredCategories();

  const newCat: ProductCategory = {
    id: trimmed,
    label: trimmed,
    icon: icon || '📁',
    color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
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
  } catch (err) {
    return INITIAL_PRODUCT_CATEGORIES;
  }
}
