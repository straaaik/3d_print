import { DrawerDesignConfig, DesignPreset } from './types';
import { Order } from '@/shared/types';

export const DEFAULT_CONFIG: DrawerDesignConfig = {
  // 1. Контейнер выпадающего блока
  drawerBg: '#09090b', // bg-neutral-950/98
  drawerBorderColor: 'rgba(255, 255, 255, 0.1)', // border-white/10
  drawerBorderWidth: 1,
  drawerPadding: 12, // p-3 (12px)
  drawerRadius: 0,
  sectionGap: 8, // space-y-2 (8px)

  // 2. Карточки / Блоки (Разделы 01, 02, 03, 04)
  cardBg: 'rgba(255, 255, 255, 0.02)', // bg-white/[0.02]
  cardBorderColor: 'rgba(255, 255, 255, 0.1)', // border-white/10
  cardBorderWidth: 1,
  cardRadius: 12, // rounded-xl (12px)
  cardPadding: 12, // p-3 (12px)
  cardDividerColor: 'rgba(255, 255, 255, 0.1)', // border-white/10

  // 3. Заголовки разделов (РАЗДЕЛ 01 · ...)
  headerFontSize: 9.5,
  headerTextColor: '#71717a', // text-[#71717a]
  headerTracking: 1.2,
  headerFontWeight: 'semibold',

  // 4. Раздел 01: Бейджи и Название
  orderNumberBg: 'rgba(255, 255, 255, 0.05)', // bg-white/5
  orderNumberColor: '#e5e5e5', // text-neutral-200
  orderNumberBorder: 'rgba(255, 255, 255, 0.1)', // border-white/10

  badgeExpenseBg: 'rgba(76, 5, 25, 0.4)', // bg-rose-950/40
  badgeExpenseColor: '#fb7185', // text-rose-400
  badgeExpenseBorder: 'rgba(159, 18, 57, 0.4)', // border-rose-800/40

  badgeIncomeBg: 'rgba(6, 78, 59, 0.4)', // bg-emerald-950/40
  badgeIncomeColor: '#34d399', // text-emerald-400
  badgeIncomeBorder: 'rgba(6, 95, 70, 0.4)', // border-emerald-800/40

  badgeRadius: 6, // rounded-md (6px)

  titleFontSize: 18, // text-lg (18px)
  titleColor: '#ffffff',
  titlePlaceholderColor: '#52525b',
  titleFontWeight: 'light',

  dateButtonBg: 'rgba(0, 0, 0, 0.6)',
  dateButtonBorder: 'rgba(255, 255, 255, 0.15)',
  dateButtonColor: '#d4d4d8',
  dateButtonRadius: 6,

  // 5. Раздел 02: Категории затрат
  searchBg: 'rgba(0, 0, 0, 0.4)',
  searchBorder: 'rgba(255, 255, 255, 0.1)',
  searchTextColor: '#ffffff',
  searchPlaceholderColor: '#52525b',
  searchRadius: 8,

  categoryColumns: 3,
  categoryFontSize: 12,
  categoryInactiveColor: '#71717a',
  categoryHoverColor: '#d4d4d8',
  categoryActiveColor: '#ffffff',
  categoryUnderlineColor: '#ffffff',
  categoryGapX: 20,
  categoryGapY: 8,

  addCategoryColor: '#71717a',
  addCategoryHoverColor: '#ffffff',

  // 6. Раздел 03: Сумма и Списание
  amountFontSize: 36, // text-4xl
  amountColor: '#ffffff',
  amountFontWeight: 'light',
  amountSuffixColor: '#fb7185', // text-rose-400
  amountSuffixFontSize: 16,

  presetActiveBg: 'rgba(244, 63, 94, 0.2)', // bg-rose-500/20
  presetActiveColor: '#fda4af', // text-rose-300
  presetActiveBorder: 'rgba(244, 63, 94, 0.4)', // border-rose-500/40

  presetInactiveBg: 'rgba(255, 255, 255, 0.02)', // bg-white/[0.02]
  presetInactiveColor: '#a1a1aa', // text-neutral-400
  presetInactiveBorder: 'rgba(255, 255, 255, 0.1)', // border-white/10
  presetRadius: 4, // rounded (4px)

  financeLabelColor: '#71717a',
  financeValueColor: '#fb7185',
  statusLabelColor: '#71717a',
  statusValueColor: '#fb7185',

  // 7. Раздел 04: Заметки и трекинг
  notesFontSize: 13,
  notesColor: '#ffffff',
  notesPlaceholderColor: '#52525b',
  notesMinHeight: 48,
};

export const BUILTIN_PRESETS: DesignPreset[] = [
  {
    id: 'current',
    name: 'Текущий (Default Dark)',
    description: 'Оригинальный интерфейс из вашего скриншота',
    config: { ...DEFAULT_CONFIG },
  },
  {
    id: 'clean-graphite',
    name: 'Чистый Графит (Soft & Modern)',
    description: 'Мягкие закругления 14px, графитовые подложки, глубокий контраст',
    config: {
      ...DEFAULT_CONFIG,
      cardBg: 'rgba(255, 255, 255, 0.04)',
      cardBorderColor: 'rgba(255, 255, 255, 0.14)',
      cardRadius: 14,
      cardPadding: 14,
      sectionGap: 10,
      headerFontSize: 10,
      headerTextColor: '#a1a1aa',
      badgeRadius: 8,
      presetRadius: 6,
      categoryFontSize: 12.5,
      amountFontSize: 40,
      amountFontWeight: 'normal',
      categoryUnderlineColor: '#38bdf8',
      categoryActiveColor: '#38bdf8',
    },
  },
  {
    id: 'cyber-matrix',
    name: 'Cyber Matrix (Tech Console)',
    description: 'Четкие углы 4px, бирюзовые и малиновые линии, технический терминал',
    config: {
      ...DEFAULT_CONFIG,
      drawerBg: '#050507',
      drawerBorderColor: 'rgba(34, 211, 238, 0.25)',
      cardBg: 'rgba(15, 23, 42, 0.4)',
      cardBorderColor: 'rgba(34, 211, 238, 0.2)',
      cardRadius: 4,
      badgeRadius: 2,
      presetRadius: 2,
      searchRadius: 4,
      dateButtonRadius: 4,
      headerTextColor: '#38bdf8',
      headerFontWeight: 'bold',
      categoryActiveColor: '#22d3ee',
      categoryUnderlineColor: '#22d3ee',
      amountFontSize: 38,
      presetActiveBg: 'rgba(244, 63, 94, 0.3)',
      presetActiveBorder: 'rgba(244, 63, 94, 0.6)',
      presetActiveColor: '#ffffff',
    },
  },
  {
    id: 'meridian-amber',
    name: 'Meridian Amber (Warm Industrial)',
    description: 'Теплый матовый стиль с янтарными акцентами и золотистым подчёркиванием',
    config: {
      ...DEFAULT_CONFIG,
      drawerBg: '#0c0a09',
      drawerBorderColor: 'rgba(245, 158, 11, 0.2)',
      cardBg: 'rgba(255, 255, 255, 0.03)',
      cardBorderColor: 'rgba(245, 158, 11, 0.15)',
      cardRadius: 10,
      headerTextColor: '#fbbf24',
      orderNumberBg: 'rgba(120, 53, 15, 0.3)',
      orderNumberColor: '#fcd34d',
      orderNumberBorder: 'rgba(180, 83, 9, 0.4)',
      badgeExpenseBg: 'rgba(153, 27, 27, 0.4)',
      badgeExpenseColor: '#fca5a5',
      badgeExpenseBorder: 'rgba(185, 28, 28, 0.4)',
      categoryActiveColor: '#fcd34d',
      categoryUnderlineColor: '#f59e0b',
      amountSuffixColor: '#f87171',
      presetActiveBg: 'rgba(245, 158, 11, 0.25)',
      presetActiveBorder: 'rgba(245, 158, 11, 0.5)',
      presetActiveColor: '#fef3c7',
    },
  },
  {
    id: 'oled-stealth',
    name: 'OLED Stealth (Absolute Black)',
    description: 'Глубокий чёрный фон #000000, ультратонкие рамки, чистый минимализм',
    config: {
      ...DEFAULT_CONFIG,
      drawerBg: '#000000',
      drawerBorderColor: 'rgba(255, 255, 255, 0.07)',
      cardBg: 'rgba(255, 255, 255, 0.015)',
      cardBorderColor: 'rgba(255, 255, 255, 0.07)',
      cardRadius: 12,
      headerTextColor: '#52525b',
      categoryInactiveColor: '#52525b',
      categoryActiveColor: '#ffffff',
      categoryUnderlineColor: '#ffffff',
      presetInactiveBg: 'rgba(0, 0, 0, 0.5)',
      presetInactiveBorder: 'rgba(255, 255, 255, 0.08)',
    },
  },
];

export const MOCK_EXPENSE_ORDER: Order = {
  id: 'mock-ord-1030',
  order_number: 1030,
  type: 'expense',
  title: 'Баллон грунтовки по пластику Kudo и матовый лак',
  client: 'Химия и изопропанол',
  client_name: '',
  contact: '',
  status: 'Готово',
  amount: 9700,
  cost: 9700,
  payment: 9700,
  quantity: 1,
  date: '20.08.2026',
  deadline: '20.08.2026',
  notes: 'Оплата по карте Ozon',
  payments: [9700],
  contacts: [],
};

export const MOCK_INCOME_ORDER: Order = {
  id: 'mock-ord-1029',
  order_number: 1029,
  type: 'income',
  title: 'Шарнирный дракон Mini (60%, карманный)',
  client: 'Авито',
  client_name: 'Алексей',
  contact: '',
  status: 'Печать',
  amount: 1450,
  cost: 320,
  payment: 1450,
  quantity: 2,
  date: '21.08.2026',
  deadline: '25.08.2026',
  notes: 'Отправка через Авито Доставку (Boxberry). Пластик eSUN PLA Silk Dual Color.',
  payments: [1450],
  contacts: [{ type: 'telegram', value: '@alex_dragon', label: 'Telegram' }],
};

export const SAMPLE_EXPENSE_CATEGORIES = [
  'Пластик и филамент',
  'Комплектующие и сопла',
  'Фотополимерная смола',
  'Химия и изопропанол',
  'Оборудование и 3D-принтеры',
  'Упаковка и коробки',
  'Доставка и логистика',
  'Аренда мастерской',
  'Электроэнергия и ЖКХ',
  'Реклама и продвижение',
  'Фурнитура и крепеж',
  '3D-модели и ПО',
  'Обслуживание и ремонт',
  'Налоги и эквайринг',
  'Обучение и курсы',
  'Прочие расходы',
];
