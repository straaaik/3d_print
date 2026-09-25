export interface PaletteColor {
  name: string;
  hex: string;
  description: string;
  category: 'brand' | 'status' | 'surfaces' | 'typography' | 'filaments';
}

export const APP_PALETTE: PaletteColor[] = [
  // 1. Фирменные цвета Kumo CRM (Core Brand)
  {
    name: 'Cockpit Bone / Sand',
    hex: '#D2CCBB',
    description: 'Главный цвет светлого текста, чека и акцента темы',
    category: 'brand',
  },
  {
    name: 'Primary Cyan',
    hex: '#0CB4E0',
    description: 'Основной бирюзовый акцент системы',
    category: 'brand',
  },
  {
    name: 'Secondary Slate',
    hex: '#537D8E',
    description: 'Инженерный технологичный серо-синий оттенок',
    category: 'brand',
  },
  {
    name: 'Tertiary Amber',
    hex: '#FEB63D',
    description: 'Инженерный тёплый янтарный акцент',
    category: 'brand',
  },
  {
    name: 'Neutral Accent',
    hex: '#72787B',
    description: 'Сбалансированный нейтральный серый',
    category: 'brand',
  },

  // 2. Статусы и функциональные сигналы
  {
    name: 'Expense Rose',
    hex: '#fb7185',
    description: 'Расход, списание, отрицательный баланс (rose-400)',
    category: 'status',
  },
  {
    name: 'Income Emerald',
    hex: '#34d399',
    description: 'Доход, оплачено, положительный баланс (emerald-400)',
    category: 'status',
  },
  {
    name: 'Warning / Debt Amber',
    hex: '#fbbf24',
    description: 'Долг, дедлайн, ожидание оплаты (amber-400)',
    category: 'status',
  },
  {
    name: 'Order Number Cyan',
    hex: '#22d3ee',
    description: 'Артикул и номер позиции #ORD (cyan-400)',
    category: 'status',
  },
  {
    name: 'Signal Crimson',
    hex: '#f43f5e',
    description: 'Терминальная красная точка, критическая ошибка',
    category: 'status',
  },

  // 3. Поверхности и темные тона Cockpit
  {
    name: 'Absolute OLED Black',
    hex: '#000000',
    description: 'Абсолютно черный OLED',
    category: 'surfaces',
  },
  {
    name: 'App Background',
    hex: '#0a0a0a',
    description: 'Базовый фон приложения под точечной сеткой',
    category: 'surfaces',
  },
  {
    name: 'Cockpit Container',
    hex: '#09090b',
    description: 'Фон консоли Meridian (neutral-950)',
    category: 'surfaces',
  },
  {
    name: 'Dark Elevated Panel',
    hex: '#18181b',
    description: 'Приподнятые панели и дропдауны (neutral-900)',
    category: 'surfaces',
  },
  {
    name: 'Card Glass 2%',
    hex: 'rgba(255, 255, 255, 0.02)',
    description: 'Базовая прозрачная подложка карточек',
    category: 'surfaces',
  },
  {
    name: 'Card Glass 5%',
    hex: 'rgba(255, 255, 255, 0.05)',
    description: 'Hover-подложка карточек и кнопок',
    category: 'surfaces',
  },

  // 4. Типографика и рамки
  {
    name: 'Text Pure White',
    hex: '#ffffff',
    description: 'Главные заголовки и значения',
    category: 'typography',
  },
  {
    name: 'Text Muted Zinc',
    hex: '#a1a1aa',
    description: 'Второстепенный текст (zinc-400)',
    category: 'typography',
  },
  {
    name: 'Text Section Slate',
    hex: '#71717a',
    description: 'Заголовки разделов «РАЗДЕЛ 01...» (#71717a)',
    category: 'typography',
  },
  {
    name: 'Text Dim Placeholder',
    hex: '#52525b',
    description: 'Плейсхолдеры и неактивные элементы (#52525b)',
    category: 'typography',
  },
  {
    name: 'Border Subtle 10%',
    hex: 'rgba(255, 255, 255, 0.1)',
    description: 'Стандартная нейтральная рамка border-white/10',
    category: 'typography',
  },
  {
    name: 'Border Medium 15%',
    hex: 'rgba(255, 255, 255, 0.15)',
    description: 'Контурные рамки кокпита border-white/15',
    category: 'typography',
  },

  // 5. Популярные цвета филаментов Kumo CRM
  {
    name: 'Prusa Orange',
    hex: '#EA580C',
    description: 'Индустриальный оранжевый PETG / PLA',
    category: 'filaments',
  },
  {
    name: 'Cyber Cyan Filament',
    hex: '#06B6D4',
    description: 'Яркий бирюзовый пластик',
    category: 'filaments',
  },
  {
    name: 'Galaxy Silver',
    hex: '#94A3B8',
    description: 'Космическое серебро PLA',
    category: 'filaments',
  },
  {
    name: 'Silk Gold',
    hex: '#D4AF37',
    description: 'Шёлковое золото PLA Silk',
    category: 'filaments',
  },
  {
    name: 'Carbon Fiber',
    hex: '#1C1F26',
    description: 'Углеволокно / матовый графит PA-CF',
    category: 'filaments',
  },
];
