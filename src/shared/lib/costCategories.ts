import React from 'react';
import { 
  Printer, 
  Package, 
  Wrench, 
  Palette, 
  Truck, 
  AlertTriangle, 
  Tag, 
  Cpu, 
  Sparkles, 
  Layers, 
  Receipt
} from 'lucide-react';

export interface CostCategoryConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeStyle: string;
  description: string;
  defaultAmount?: number;
  isPerUnit?: boolean;
}

export const DEFAULT_COST_CATEGORIES: CostCategoryConfig[] = [
  {
    id: 'print',
    name: 'Печать',
    icon: Printer,
    color: 'text-blue-400',
    badgeStyle: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
    description: 'Материал, нить / смола, электричество, амортизация',
    defaultAmount: 250,
    isPerUnit: true,
  },
  {
    id: 'package',
    name: 'Упаковка',
    icon: Package,
    color: 'text-amber-400',
    badgeStyle: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    description: 'Коробка, пупырка, zip-пакет, брендированный скотч',
    defaultAmount: 100,
    isPerUnit: false,
  },
  {
    id: 'labor',
    name: 'Работа руками',
    icon: Wrench,
    color: 'text-emerald-400',
    badgeStyle: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    description: 'Снятие поддержек, зачистка, шлифовка, сборка',
    defaultAmount: 150,
    isPerUnit: true,
  },
  {
    id: 'painting',
    name: 'Покраска',
    icon: Palette,
    color: 'text-purple-400',
    badgeStyle: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
    description: 'Грунтовка, акриловые эмали, аэрограф, лак',
    defaultAmount: 300,
    isPerUnit: true,
  },
  {
    id: 'delivery',
    name: 'Доставка',
    icon: Truck,
    color: 'text-cyan-400',
    badgeStyle: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
    description: 'Курьер, отправка СДЭК, Почта, Яндекс',
    defaultAmount: 350,
    isPerUnit: false,
  },
  {
    id: 'defect',
    name: 'Брак / Тесты',
    icon: AlertTriangle,
    color: 'text-rose-400',
    badgeStyle: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
    description: 'Отбраковка, подбор настроек печати, тесты',
    defaultAmount: 50,
    isPerUnit: false,
  },
  {
    id: 'modeling',
    name: '3D-Моделирование',
    icon: Cpu,
    color: 'text-indigo-400',
    badgeStyle: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    description: 'Разработка, правка сетки STL, подготовка к печати',
    defaultAmount: 500,
    isPerUnit: false,
  },
  {
    id: 'hardware',
    name: 'Фурнитура и метизы',
    icon: Layers,
    color: 'text-yellow-400',
    badgeStyle: 'bg-yellow-950/80 text-yellow-300 border-yellow-500/40',
    description: 'Вплавляемые латунные резьбовые втулки, винты, магниты',
    defaultAmount: 80,
    isPerUnit: true,
  },
  {
    id: 'consumables',
    name: 'Расходники и химия',
    icon: Sparkles,
    color: 'text-teal-400',
    badgeStyle: 'bg-teal-950/80 text-teal-300 border-teal-500/40',
    description: '3D-лак для стола, спирт IPA, смазка осей',
    defaultAmount: 50,
    isPerUnit: false,
  },
  {
    id: 'tax',
    name: 'Налог / Комиссия',
    icon: Receipt,
    color: 'text-orange-400',
    badgeStyle: 'bg-orange-950/80 text-orange-300 border-orange-500/40',
    description: 'Налог самозанятого (4-6%), комиссия Авито/маркетплейса',
    defaultAmount: 70,
    isPerUnit: false,
  },
];

export function getCategoryConfig(categoryName: string): CostCategoryConfig {
  if (!categoryName) {
    return {
      id: 'custom',
      name: 'Расход',
      icon: Tag,
      color: 'text-orange-400',
      badgeStyle: 'bg-orange-950/80 text-orange-300 border-orange-500/40',
      description: 'Пользовательский пункт расхода',
    };
  }

  const clean = categoryName.replace(/^[\p{Emoji}\s]+/u, '').trim().toLowerCase();

  // Прямое сопоставление
  const direct = DEFAULT_COST_CATEGORIES.find(
    c => c.name.toLowerCase() === clean || c.id.toLowerCase() === clean
  );
  if (direct) return direct;

  // Нечеткое сопоставление по ключевым словам
  if (clean.includes('печат') || clean.includes('пластик') || clean.includes('материал') || clean.includes('нить') || clean.includes('филамент')) {
    return DEFAULT_COST_CATEGORIES[0]; // Печать
  }
  if (clean.includes('упаковк') || clean.includes('коробк') || clean.includes('пленк') || clean.includes('пакет')) {
    return DEFAULT_COST_CATEGORIES[1]; // Упаковка
  }
  if (clean.includes('работ') || clean.includes('мастер') || clean.includes('труд') || clean.includes('шлифовк') || clean.includes('постобработк') || clean.includes('зачистк')) {
    return DEFAULT_COST_CATEGORIES[2]; // Работа руками
  }
  if (clean.includes('краск') || clean.includes('покраск') || clean.includes('грунт') || clean.includes('эмал') || clean.includes('лак')) {
    return DEFAULT_COST_CATEGORIES[3]; // Покраска
  }
  if (clean.includes('доставк') || clean.includes('курьер') || clean.includes('сдэк') || clean.includes('почт') || clean.includes('транспорт')) {
    return DEFAULT_COST_CATEGORIES[4]; // Доставка
  }
  if (clean.includes('брак') || clean.includes('тест') || clean.includes('отбраковк')) {
    return DEFAULT_COST_CATEGORIES[5]; // Брак
  }
  if (clean.includes('модел') || clean.includes('слайс') || clean.includes('stl') || clean.includes('cad')) {
    return DEFAULT_COST_CATEGORIES[6]; // Моделирование
  }
  if (clean.includes('фурнитур') || clean.includes('метиз') || clean.includes('втулк') || clean.includes('винт') || clean.includes('магнит') || clean.includes('болт')) {
    return DEFAULT_COST_CATEGORIES[7]; // Фурнитура
  }
  if (clean.includes('расходник') || clean.includes('хими') || clean.includes('спирт') || clean.includes('смазк')) {
    return DEFAULT_COST_CATEGORIES[8]; // Расходники
  }
  if (clean.includes('налог') || clean.includes('комисси') || clean.includes('авито') || clean.includes('эквайринг')) {
    return DEFAULT_COST_CATEGORIES[9]; // Налог
  }

  return {
    id: 'custom',
    name: categoryName.replace(/^[\p{Emoji}\s]+/u, '').trim(),
    icon: Tag,
    color: 'text-[#FF8800]',
    badgeStyle: 'bg-orange-950/80 text-orange-300 border-orange-500/40',
    description: 'Пользовательский пункт расхода',
  };
}
