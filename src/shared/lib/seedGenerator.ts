import { 
  Printer, 
  Filament, 
  Settings, 
  SavedCalculation, 
  Order, 
  OrderStatus, 
  ContactItem, 
  ContactType, 
  CostItem, 
  AssemblyPrintedPart, 
  AssemblyHardwareItem,
  ProductCollection
} from '../types';

export interface SeedDataResult {
  printers: Printer[];
  filaments: Filament[];
  settings: Settings;
  savedCalculations: SavedCalculation[];
  orders: Order[];
  collections: ProductCollection[];
}

export interface SeedOptions {
  printerCount?: number;
  filamentCount?: number;
  productCount?: number;
  orderCount?: number;
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ГЕНЕРАЦИИ СЛУЧАЙНЫХ ДАННЫХ
// ============================================================================

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const val = Math.random() * (max - min) + min;
  return Number(val.toFixed(decimals));
}

function randomChoice<T>(items: readonly T[] | T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomSample<T>(items: readonly T[] | T[], count: number): T[] {
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, items.length));
}

function randomDateInPast(daysAgoMin: number, daysAgoMax: number): Date {
  const now = new Date();
  const days = randomInt(daysAgoMin, daysAgoMax);
  const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  date.setHours(randomInt(9, 21), randomInt(0, 59), randomInt(0, 59));
  return date;
}

function formatDateRu(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ============================================================================
// ПУЛЫ ДАННЫХ ДЛЯ ГЕНЕРАЦИИ
// ============================================================================

const PRINTER_TEMPLATES = [
  { name: 'Bambu Lab X1-Carbon', power: 350, price: 139000, lifespan: 6000, color: '#10b981' },
  { name: 'Bambu Lab P1S Combo', power: 350, price: 84900, lifespan: 5000, color: '#38bdf8' },
  { name: 'Bambu Lab A1 Combo', power: 300, price: 54900, lifespan: 4500, color: '#f59e0b' },
  { name: 'Bambu Lab A1 Mini', power: 150, price: 32900, lifespan: 4000, color: '#06b6d4' },
  { name: 'Creality K1 Max', power: 1000, price: 79000, lifespan: 5000, color: '#6366f1' },
  { name: 'Creality K1C', power: 350, price: 46000, lifespan: 4500, color: '#8b5cf6' },
  { name: 'Elegoo Neptune 4 Pro', power: 400, price: 34500, lifespan: 4000, color: '#ec4899' },
  { name: 'Prusa MK4', power: 300, price: 92000, lifespan: 8000, color: '#f97316' },
  { name: 'Flashforge Adventurer 5M Pro', power: 350, price: 49900, lifespan: 4500, color: '#14b8a6' },
  { name: 'Voron 2.4 R2 350', power: 650, price: 125000, lifespan: 7500, color: '#a855f7' },
  { name: 'Anycubic Kobra 2 Pro', power: 380, price: 37900, lifespan: 4000, color: '#84cc16' },
  { name: 'QIDI Tech X-Plus 3', power: 800, price: 68000, lifespan: 5000, color: '#ef4444' },
];

const FILAMENT_TYPES = [
  { type: 'PLA Basic', weight: 1000, priceMin: 1200, priceMax: 1800 },
  { type: 'PLA Matte', weight: 1000, priceMin: 1400, priceMax: 2100 },
  { type: 'PETG Standard', weight: 1000, priceMin: 1100, priceMax: 1700 },
  { type: 'PETG-CF (Углеволокно)', weight: 1000, priceMin: 2800, priceMax: 4200 },
  { type: 'ABS Pro', weight: 1000, priceMin: 1300, priceMax: 1900 },
  { type: 'ASA UV-стойкий', weight: 1000, priceMin: 1800, priceMax: 2600 },
  { type: 'TPU 95A Эластомер', weight: 1000, priceMin: 2400, priceMax: 3600 },
  { type: 'PA12-CF Нейлон Карбон', weight: 750, priceMin: 3900, priceMax: 5600 },
  { type: 'Silk PLA Шелковый', weight: 1000, priceMin: 1600, priceMax: 2400 },
  { type: 'Wood PLA (Древесный)', weight: 1000, priceMin: 2100, priceMax: 2900 },
  { type: 'Glow PLA (Светящийся)', weight: 1000, priceMin: 1900, priceMax: 2700 },
];

const FILAMENT_BRANDS = ['eSun', 'Bambu Lab', 'Polymaker', 'Sunlu', 'Bestfilament', 'REC 3D', 'FDplast', 'Eryone', 'Kingroon'];

const COLOR_PALETTE = [
  { name: 'Черный матовый', hex: '#1e2022' },
  { name: 'Белый жемчуг', hex: '#f8fafc' },
  { name: 'Серый графит', hex: '#4b5563' },
  { name: 'Синий океан', hex: '#2563eb' },
  { name: 'Небесно-голубой', hex: '#38bdf8' },
  { name: 'Красный сигнал', hex: '#ef4444' },
  { name: 'Оранжевый огонь', hex: '#f97316' },
  { name: 'Изумрудно-зеленый', hex: '#10b981' },
  { name: 'Оливковый хаки', hex: '#65a30d' },
  { name: 'Солнечный желтый', hex: '#eab308' },
  { name: 'Фиолетовый баклажан', hex: '#8b5cf6' },
  { name: 'Шелковое золото', hex: '#d97706' },
  { name: 'Розовый неон', hex: '#ec4899' },
  { name: 'Прозрачный Clear', hex: '#cbd5e1' },
];

const PRODUCT_TEMPLATES = [
  // Авто / Мото
  {
    name: 'Заглушка противотуманной фары VAG',
    category: 'Авто / Мото',
    tags: ['авто', 'abs', 'ремонт', 'vag'],
    weightG: 45,
    hours: 2,
    minutes: 15,
    stl_file_name: 'fog_light_plug_vag.stl',
    stl_url: 'https://www.thingiverse.com/thing:5421098',
  },
  {
    name: 'Крепление регистратора на зеркало заднего вида',
    category: 'Авто / Мото',
    tags: ['авто', 'petg', 'крепление', 'гаджет'],
    weightG: 32,
    hours: 1,
    minutes: 40,
    stl_file_name: 'dashcam_mount_mirror.stl',
  },
  {
    name: 'Подиум под датчик 52мм в стойку',
    category: 'Авто / Мото',
    tags: ['авто', 'тюнинг', 'asa'],
    weightG: 78,
    hours: 3,
    minutes: 50,
    stl_file_name: 'gauge_pod_52mm.stl',
  },
  {
    name: 'Клипса обшивки двери (комплект 10 шт)',
    category: 'Авто / Мото',
    tags: ['авто', 'petg', 'клипсы'],
    weightG: 25,
    hours: 1,
    minutes: 10,
    stl_file_name: 'door_panel_clips_x10.stl',
  },

  // Декор и Дом
  {
    name: 'Геометрическое кашпо Origami для суккулентов',
    category: 'Декор и Дом',
    tags: ['декор', 'кашпо', 'дом', 'origami'],
    weightG: 110,
    hours: 4,
    minutes: 20,
    stl_file_name: 'origami_planter_v3.stl',
    stl_url: 'https://printables.com/model/492100-origami-succulent-planter',
  },
  {
    name: 'Светильник-ночник «Полигональная Луна» 16см',
    category: 'Декор и Дом',
    tags: ['декор', 'ночник', 'светильник', 'подарок'],
    weightG: 195,
    hours: 8,
    minutes: 45,
    stl_file_name: 'moon_lamp_lithophane_16cm.stl',
    stl_url: 'https://makerworld.com/en/models/284102',
  },
  {
    name: 'Настенный органайзер для ключей с магнитами',
    category: 'Декор и Дом',
    tags: ['декор', 'дом', 'органайзер'],
    weightG: 65,
    hours: 2,
    minutes: 30,
    stl_file_name: 'magnetic_key_holder_wall.stl',
  },
  {
    name: 'Дизайнерская ваза Спираль Spiral Vase',
    category: 'Декор и Дом',
    tags: ['ваза', 'декор', 'vase_mode', 'silk'],
    weightG: 85,
    hours: 2,
    minutes: 10,
    stl_file_name: 'spiral_twist_vase.stl',
  },

  // Инженерия и Техника
  {
    name: 'Шестерня редуктора коническая M1.5 Z=28',
    category: 'Инженерия и Техника',
    tags: ['инженерия', 'шестерня', 'редуктор', 'pa-cf'],
    weightG: 55,
    hours: 2,
    minutes: 50,
    stl_file_name: 'bevel_gear_m15_z28.stl',
  },
  {
    name: 'Корпус для Raspberry Pi 5 с креплением на DIN-рейку',
    category: 'Инженерия и Техника',
    tags: ['корпус', 'rpi5', 'din-рейка', 'электроника'],
    weightG: 92,
    hours: 4,
    minutes: 15,
    stl_file_name: 'rpi5_din_rail_case_fanned.stl',
    stl_url: 'https://www.printables.com/model/678910-raspberry-pi-5-din-case',
  },
  {
    name: 'Переходник системы аспирации ЧПУ 100мм -> 50мм',
    category: 'Инженерия и Техника',
    tags: ['чпу', 'адаптер', 'мастерская', 'petg'],
    weightG: 140,
    hours: 5,
    minutes: 10,
    stl_file_name: 'dust_collection_adapter_100_50.stl',
  },
  {
    name: 'Кронштейн шагового двигателя NEMA 17 усиленный',
    category: 'Инженерия и Техника',
    tags: ['nema17', 'кронштейн', 'чпу', '3d-принтер'],
    weightG: 48,
    hours: 1,
    minutes: 55,
    stl_file_name: 'nema17_reinforced_bracket.stl',
  },

  // Гаджеты и Игры
  {
    name: 'Настольная подставка для наушников DeskStand',
    category: 'Гаджеты и Игры',
    tags: ['гаджеты', 'наушники', 'подставка', 'рабочее_место'],
    weightG: 160,
    hours: 6,
    minutes: 30,
    stl_file_name: 'headphone_desk_stand_curved.stl',
    stl_url: 'https://www.thingiverse.com/thing:4891234',
  },
  {
    name: 'Док-станция iPhone MagSafe + Apple Watch',
    category: 'Гаджеты и Игры',
    tags: ['apple', 'magsafe', 'док-станция', 'гаджет'],
    weightG: 125,
    hours: 5,
    minutes: 0,
    stl_file_name: 'magsafe_dual_charger_stand.stl',
  },
  {
    name: 'Подвесной держатель Mac Mini под столешницу',
    category: 'Гаджеты и Игры',
    tags: ['macmini', 'под_стол', 'органайзер'],
    weightG: 115,
    hours: 4,
    minutes: 40,
    stl_file_name: 'underdesk_mac_mini_m2_bracket.stl',
  },
  {
    name: 'Грипсы эргономичные для геймпада DualSense',
    category: 'Гаджеты и Игры',
    tags: ['ps5', 'dualsense', 'игры', 'tpu'],
    weightG: 38,
    hours: 1,
    minutes: 45,
    stl_file_name: 'dualsense_tpu_ergogrips.stl',
  },

  // Фурнитура
  {
    name: 'Угловой фиксатор 90° для столярной струбцины',
    category: 'Фурнитура',
    tags: ['столярка', 'инструмент', 'уголок'],
    weightG: 85,
    hours: 3,
    minutes: 10,
    stl_file_name: '90deg_corner_clamp_jig.stl',
  },
  {
    name: 'Ручка-барашек M8 эргономичная (набор 5 шт)',
    category: 'Фурнитура',
    tags: ['ручки', 'фурнитура', 'm8'],
    weightG: 60,
    hours: 2,
    minutes: 20,
    stl_file_name: 'knob_m8_hex_insert_x5.stl',
  },
  {
    name: 'Кондуктор-шаблон для врезки петель 35мм',
    category: 'Фурнитура',
    tags: ['шаблон', 'мебель', 'инструмент'],
    weightG: 70,
    hours: 2,
    minutes: 45,
    stl_file_name: 'hinge_jig_35mm_cabinet.stl',
  },

  // Разное
  {
    name: 'Органайзер ящика мастерской Gridfinity 3x4',
    category: 'Разное',
    tags: ['gridfinity', 'мастерская', 'органайзер'],
    weightG: 135,
    hours: 5,
    minutes: 20,
    stl_file_name: 'gridfinity_3x4_bin_divided.stl',
    stl_url: 'https://www.printables.com/model/174348-gridfinity-baseplates',
  },
  {
    name: 'Защитный кейс для 4-х аккумуляторов 18650 с защелкой',
    category: 'Разное',
    tags: ['кейс', '18650', 'аккумуляторы'],
    weightG: 52,
    hours: 2,
    minutes: 10,
    stl_file_name: 'battery_case_4x_18650.stl',
  },
];

const ASSEMBLY_TEMPLATES = [
  {
    name: 'Модульный держатель катушки филамента Pro (на подшипниках)',
    category: 'Инженерия и Техника',
    tags: ['сборка', 'филамент', 'подшипники', 'инструмент'],
    laborMinutes: 20,
    parts: [
      { name: 'Левая стойка корпуса', weight_g: 65, hours: 2, minutes: 30 },
      { name: 'Правая стойка корпуса', weight_g: 65, hours: 2, minutes: 30 },
      { name: 'Вращающийся вал катушки', weight_g: 45, hours: 1, minutes: 45 },
      { name: 'Фиксирующие гайки конусы (2 шт)', weight_g: 30, hours: 1, minutes: 15 },
    ],
    hardware: [
      { name: 'Подшипник 608RS', quantity: 2, cost_per_unit: 45, price_per_unit: 80 },
      { name: 'Винты M4x25 и гайки с нейлоном', quantity: 4, cost_per_unit: 6, price_per_unit: 12 },
      { name: 'Силиконовые демпферные ножки', quantity: 4, cost_per_unit: 10, price_per_unit: 20 },
    ],
  },
  {
    name: 'Артикулированная подвижная фигурка «Меха-Дракон»',
    category: 'Декор и Дом',
    tags: ['сборка', 'дракон', 'игрушка', 'подвижный'],
    laborMinutes: 30,
    parts: [
      { name: 'Голова и челюсть дракона', weight_g: 50, hours: 2, minutes: 0 },
      { name: 'Сегменты тела (8 звеньев)', weight_g: 120, hours: 4, minutes: 30 },
      { name: 'Крылья шарнирные (пара)', weight_g: 75, hours: 3, minutes: 10 },
      { name: 'Хвост с наконечником', weight_g: 45, hours: 1, minutes: 40 },
    ],
    hardware: [
      { name: 'Латунные соединительные штифты 2мм', quantity: 12, cost_per_unit: 8, price_per_unit: 15 },
      { name: 'Магниты неодимовые 5x2мм для крыльев', quantity: 4, cost_per_unit: 15, price_per_unit: 30 },
    ],
  },
  {
    name: 'Поворотный настольный кронштейн монитора VESA 75/100',
    category: 'Гаджеты и Игры',
    tags: ['сборка', 'vesa', 'монитор', 'кронштейн'],
    laborMinutes: 25,
    parts: [
      { name: 'Базовая струбцина к столу (усиленная)', weight_g: 140, hours: 5, minutes: 20 },
      { name: 'Основное колено штанги', weight_g: 110, hours: 4, minutes: 10 },
      { name: 'Поворотная пластина VESA 75/100', weight_g: 80, hours: 3, minutes: 0 },
    ],
    hardware: [
      { name: 'Болт M8x60 с барашковой гайкой', quantity: 2, cost_per_unit: 35, price_per_unit: 60 },
      { name: 'Винты VESA M4x12', quantity: 4, cost_per_unit: 5, price_per_unit: 10 },
      { name: 'Фторопластовые упорные шайбы', quantity: 4, cost_per_unit: 12, price_per_unit: 25 },
    ],
  },
];

const CLIENT_CHANNELS = ['Авито', 'Telegram', 'YouTube', 'TikTok', 'Instagram', 'ВКонтакте', 'Другое'];

const CLIENT_NAMES = [
  'Александр Морозов', 'Дмитрий Власов', 'Екатерина Соколова', 'Михаил TechLab',
  'Артем Васильев', 'Иван Сергеевич (Автосервис)', 'ООО «СпецАвтоДеталь»', 'Максим Ковалев',
  'Мария Румянцева', 'Сергей Поляков', 'Денис @denis_custom', 'Анна Воронова',
  'Владимир Петров', 'Константин И.', 'Николай Орлов', 'Ольга Смирнова',
  'Роман FPV-Пилот', 'Виктор Архитектура', 'Студия Робототехники', 'Павел Кузнецов'
];

const ORDER_INCOME_TITLES = [
  'Печать партии корпусов приборов (10 шт)',
  'Кастомная шестерня для мясорубки Kenwood',
  'Светильник Ночник Луна + дизайнерская подставка',
  'Крепление под стол Mac mini M2 (2 шт)',
  'Изготовление мастер-модели по STL клиента',
  'Срочная печать прототипа детали дрона',
  'Набор геометрических кашпо Origami (4 шт)',
  'Партия сувенирных брелоков с логотипом (30 шт)',
  'Ремонтный кронштейн бокового зеркала BMW E39',
  'Подиум под датчик давления турбины 52мм',
  'Настольная подставка под наушники DeskStand',
  'Комплект органайзеров Gridfinity в мастерскую',
  'Шестерни привода штор (набор 4 шт)',
  'Корпус лабораторного блока питания',
  'Док-станция MagSafe iPhone + Watch (White)',
  'Артикулированный дракон 45см (Silk Gold)',
  'Кронштейн эхолота на транец лодки',
  'Заглушки бампера и клипсы Toyota (комплект)',
  'Насадка циклона для строительного пылесоса',
  'Держатель катушек филамента на подшипниках'
];

const ORDER_EXPENSE_TITLES = [
  'Закупка филамента eSun PETG (4 катушки)',
  'Заказ сопел из закаленной стали 0.4 и 0.6 мм',
  'Коробки картонные для отправки 200x200x200 (30 шт)',
  'Пленка стрейч и воздушно-пузырьковая упаковочная',
  'Изопропиловый спирт 99.9% 5л для обезжиривания',
  'Адгезивный клей для 3D-печати The3D (2 флакона)',
  'Оплата электроэнергии мастерской 3D-печати',
  'Запасные зубчатые ремни Gates 2GT и ролики',
  'Набор латунных резьбовых втулок M3, M4, M5 (300 шт)',
  'Баллон грунтовки по пластику Kudo и матовый лак'
];

const ORDER_NOTES_POOL = [
  'Пластик PETG черный, 4 периметра, заполнение 40% гироид. Отправить СДЭКом до ПВЗ.',
  'Покраска в матовый графит. Клиент оплатил 50% предоплату.',
  'Самовывоз по готовности, предупредить за 1 час.',
  'Заполнение 100%, максимальная прочность для авто.',
  'Клиент постоянный, скидка 10% учтена в итоговой стоимости.',
  'Упаковать в двойную пупырку для бережной отправки Почтой.',
  'Срочный заказ, изготовление за 24 часа.',
  'Печать соплом 0.6мм с высотой слоя 0.24мм для ускорения.',
  'Предоплата на карту Сбера, остаток при получении в руки.',
  'Отправка через Авито Доставку (Boxberry).'
];

// ============================================================================
// ГЛАВНЫЙ ГЕНЕРАТОР ТЕСТОВЫХ ДАННЫХ
// ============================================================================

export function generateRandomSeedData(options: SeedOptions = {}): SeedDataResult {
  const printerCount = options.printerCount ?? randomInt(3, 5);
  const filamentCount = options.filamentCount ?? randomInt(8, 12);
  const productCount = options.productCount ?? randomInt(14, 18);
  const orderCount = options.orderCount ?? randomInt(35, 45);

  // 1. Генерация принтеров
  const selectedPrinterTemplates = randomSample(PRINTER_TEMPLATES, printerCount);
  const printers: Printer[] = selectedPrinterTemplates.map((tpl) => {
    const priceVariance = randomFloat(0.9, 1.1);
    return {
      id: randomId(),
      name: tpl.name,
      power_w: tpl.power,
      price: Math.round((tpl.price * priceVariance) / 100) * 100,
      lifespan_hours: tpl.lifespan,
      color: tpl.color,
      created_at: randomDateInPast(60, 180).toISOString(),
    };
  });

  const defaultPrinter = printers[0] || null;

  // 2. Генерация настроек
  const settings: Settings = {
    id: randomId(),
    updated_at: new Date().toISOString(),
    currency: '₽',
    electricity_rate: randomFloat(4.5, 6.2, 2),
    default_printer_id: defaultPrinter ? defaultPrinter.id : null,
    labor_rate_per_hour: randomInt(50, 90) * 10, // 500 - 900 ₽
    labor_time_minutes: 15,
    default_markup_percent: randomChoice([100, 120, 150, 180]),
    default_defect_percent: randomChoice([5, 6, 7, 8]),
  };

  // 3. Генерация филаментов
  const filaments: Filament[] = [];
  const usedColors = new Set<string>();

  for (let i = 0; i < filamentCount; i++) {
    const brand = randomChoice(FILAMENT_BRANDS);
    const fType = randomChoice(FILAMENT_TYPES);
    const colorObj = randomChoice(COLOR_PALETTE);
    usedColors.add(colorObj.hex);

    const price = randomInt(Math.floor(fType.priceMin / 50), Math.floor(fType.priceMax / 50)) * 50;

    filaments.push({
      id: randomId(),
      name: `${brand} ${fType.type} ${colorObj.name}`,
      weight_g: fType.weight,
      price,
      color: colorObj.hex,
      created_at: randomDateInPast(30, 150).toISOString(),
    });
  }

  // 4. Генерация каталога товаров и сборок (saved_calculations)
  const savedCalculations: SavedCalculation[] = [];
  const selectedProductTemplates = randomSample(PRODUCT_TEMPLATES, Math.min(productCount - 2, PRODUCT_TEMPLATES.length));

  // 4.1 Одиночные товары
  for (const tpl of selectedProductTemplates) {
    const f = randomChoice(filaments);
    const p = randomChoice(printers);

    const weightG = Math.round(tpl.weightG * randomFloat(0.85, 1.25));
    const hours = tpl.hours;
    const minutes = tpl.minutes;
    const totalPrintHours = hours + minutes / 60;

    // Расчет себестоимости:
    // Масса * цена пластика/г
    const filamentCost = (f.price / f.weight_g) * weightG;
    // Электричество
    const powerKw = p.power_w / 1000;
    const electricityCost = powerKw * totalPrintHours * settings.electricity_rate;
    // Амортизация принтера
    const depreciationCost = (p.price / p.lifespan_hours) * totalPrintHours;
    // Брак
    const defectCost = (filamentCost + electricityCost + depreciationCost) * (settings.default_defect_percent / 100);
    // Труд
    const laborCost = (settings.labor_time_minutes / 60) * settings.labor_rate_per_hour;

    const baseCost = Math.round((filamentCost + electricityCost + depreciationCost + defectCost + laborCost) * 100) / 100;
    const markupFactor = 1 + (settings.default_markup_percent / 100);
    const finalPrice = Math.round((baseCost * markupFactor) / 10) * 10;

    const stockQty = randomInt(0, 10);

    savedCalculations.push({
      id: randomId(),
      name: tpl.name,
      type: 'single',
      filament_name: f.name,
      filament_color: f.color,
      printer_name: p.name,
      filament_id: f.id,
      printer_id: p.id,
      weight_g: weightG,
      hours,
      minutes,
      quantity: 1,
      base_cost: baseCost,
      final_price: finalPrice,
      labor_minutes: settings.labor_time_minutes,
      category: tpl.category,
      tags: tpl.tags,
      stock_quantity: stockQty,
      stl_file_name: tpl.stl_file_name,
      stl_url: tpl.stl_url,
      created_at: randomDateInPast(15, 120).toISOString(),
    });
  }

  // 4.2 Составные сборки (Assembly)
  for (const assemTpl of ASSEMBLY_TEMPLATES) {
    let totalWeight = 0;
    let totalMins = 0;
    let partsCost = 0;
    let partsPrice = 0;

    const assemblyParts: AssemblyPrintedPart[] = assemTpl.parts.map((part) => {
      const f = randomChoice(filaments);
      const p = randomChoice(printers);
      const partHours = part.hours + part.minutes / 60;
      
      const partFilCost = (f.price / f.weight_g) * part.weight_g;
      const partElec = (p.power_w / 1000) * partHours * settings.electricity_rate;
      const partDeprec = (p.price / p.lifespan_hours) * partHours;
      const partDefect = (partFilCost + partElec + partDeprec) * 0.05;
      const partBaseCost = Math.round((partFilCost + partElec + partDeprec + partDefect) * 100) / 100;
      const partFinalPrice = Math.round((partBaseCost * 2.2) / 10) * 10;

      totalWeight += part.weight_g;
      totalMins += part.hours * 60 + part.minutes;
      partsCost += partBaseCost;
      partsPrice += partFinalPrice;

      return {
        id: randomId(),
        name: part.name,
        weight_g: part.weight_g,
        hours: part.hours,
        minutes: part.minutes,
        quantity: 1,
        filament_id: f.id,
        filament_name: f.name,
        filament_color: f.color,
        printer_id: p.id,
        printer_name: p.name,
        base_cost: partBaseCost,
        final_price: partFinalPrice,
      };
    });

    let hwCost = 0;
    let hwPrice = 0;
    const assemblyHardware: AssemblyHardwareItem[] = assemTpl.hardware.map((hw) => {
      hwCost += hw.cost_per_unit * hw.quantity;
      hwPrice += hw.price_per_unit * hw.quantity;
      return {
        id: randomId(),
        name: hw.name,
        quantity: hw.quantity,
        cost_per_unit: hw.cost_per_unit,
        price_per_unit: hw.price_per_unit,
      };
    });

    const assemblyLaborCost = Math.round((assemTpl.laborMinutes / 60) * settings.labor_rate_per_hour);
    const grandBaseCost = Math.round(partsCost + hwCost + assemblyLaborCost);
    const grandFinalPrice = Math.round(partsPrice + hwPrice + assemblyLaborCost);

    savedCalculations.push({
      id: randomId(),
      name: assemTpl.name,
      type: 'assembly',
      filament_name: assemblyParts[0]?.filament_name || 'Несколько материалов',
      printer_name: assemblyParts[0]?.printer_name || 'Разные принтеры',
      weight_g: totalWeight,
      hours: Math.floor(totalMins / 60),
      minutes: totalMins % 60,
      quantity: 1,
      base_cost: grandBaseCost,
      final_price: grandFinalPrice,
      category: assemTpl.category,
      tags: assemTpl.tags,
      stock_quantity: randomInt(1, 4),
      assembly_parts: assemblyParts,
      assembly_hardware: assemblyHardware,
      assembly_labor_minutes: assemTpl.laborMinutes,
      assembly_labor_cost: assemblyLaborCost,
      created_at: randomDateInPast(10, 90).toISOString(),
    });
  }

  // 4.3 Коллекции (Collections) и вариации
  const collections: ProductCollection[] = [
    {
      id: randomId(),
      name: 'Серия шарнирных драконов',
      category: 'Декор и Дом',
      tags: ['дракон', 'игрушка', 'антистресс', 'коллекция'],
      description: 'Линейка подвижных шарнирных драконов в различных размерах и материалах печати.',
      created_at: randomDateInPast(30, 100).toISOString(),
    },
    {
      id: randomId(),
      name: 'Модули мастерской Gridfinity',
      category: 'Разное',
      tags: ['gridfinity', 'мастерская', 'органайзер', 'коллекция'],
      description: 'Стандартизированные блоки и ячейки системы Gridfinity для хранения крепежа и инструмента.',
      created_at: randomDateInPast(20, 90).toISOString(),
    }
  ];

  // Привязываем часть сгенерированных товаров или добавляем варианты в коллекции
  const dragonCollection = collections[0];
  const gridfinityCollection = collections[1];

  // Привязываем существующие совпадения
  savedCalculations.forEach((item) => {
    if (item.name.toLowerCase().includes('дракон')) {
      item.collection_id = dragonCollection.id;
      item.collection_name = dragonCollection.name;
    } else if (item.name.toLowerCase().includes('gridfinity')) {
      item.collection_id = gridfinityCollection.id;
      item.collection_name = gridfinityCollection.name;
    }
  });

  // Добавим пару выразительных вариаций для драконов (Mini 60% и Giant 180%)
  const fSilk = filaments.find(f => f.name.toLowerCase().includes('pla') || f.name.toLowerCase().includes('silk')) || filaments[0];
  const fPetg = filaments.find(f => f.name.toLowerCase().includes('petg') || f.name.toLowerCase().includes('abs')) || filaments[1] || filaments[0];
  const pFast = printers[0];

  savedCalculations.push({
    id: randomId(),
    name: 'Шарнирный дракон Mini (60%, карманный)',
    type: 'single',
    filament_name: fSilk.name,
    filament_color: fSilk.color,
    printer_name: pFast.name,
    filament_id: fSilk.id,
    printer_id: pFast.id,
    weight_g: 42,
    hours: 2,
    minutes: 15,
    quantity: 1,
    base_cost: 165,
    final_price: 550,
    collection_id: dragonCollection.id,
    collection_name: dragonCollection.name,
    category: dragonCollection.category,
    tags: ['дракон', 'mini', 'подвижный'],
    stock_quantity: 6,
    stl_file_name: 'articulated_dragon_mini_60pct.stl',
    created_at: randomDateInPast(15, 60).toISOString(),
  });

  savedCalculations.push({
    id: randomId(),
    name: 'Шарнирный дракон Giant (180%, коллекционный)',
    type: 'single',
    filament_name: fPetg.name,
    filament_color: fPetg.color,
    printer_name: pFast.name,
    filament_id: fPetg.id,
    printer_id: pFast.id,
    weight_g: 210,
    hours: 11,
    minutes: 30,
    quantity: 1,
    base_cost: 720,
    final_price: 2200,
    collection_id: dragonCollection.id,
    collection_name: dragonCollection.name,
    category: dragonCollection.category,
    tags: ['дракон', 'giant', 'коллекция'],
    stock_quantity: 2,
    stl_file_name: 'articulated_dragon_giant_180pct.stl',
    created_at: randomDateInPast(10, 45).toISOString(),
  });

  // Добавим вариацию для Gridfinity
  savedCalculations.push({
    id: randomId(),
    name: 'Gridfinity Блок 1x2 для винтов и метизов',
    type: 'single',
    filament_name: fPetg.name,
    filament_color: fPetg.color,
    printer_name: pFast.name,
    filament_id: fPetg.id,
    printer_id: pFast.id,
    weight_g: 38,
    hours: 1,
    minutes: 40,
    quantity: 1,
    base_cost: 110,
    final_price: 320,
    collection_id: gridfinityCollection.id,
    collection_name: gridfinityCollection.name,
    category: gridfinityCollection.category,
    tags: ['gridfinity', '1x2', 'метизы'],
    stock_quantity: 8,
    stl_file_name: 'gridfinity_1x2_divided_bin.stl',
    created_at: randomDateInPast(8, 30).toISOString(),
  });

  // 5. Генерация заказов (orders) с хронологическим распределением за последние ~90 дней
  const orders: Order[] = [];
  let orderNumberSeq = 1001;

  // Генерируем даты для заказов с распределением
  const orderDates: Date[] = [];
  for (let i = 0; i < orderCount; i++) {
    // Больше заказов в последние 30-60 дней
    const daysAgo = Math.floor(Math.pow(Math.random(), 1.5) * 90);
    orderDates.push(randomDateInPast(daysAgo, daysAgo));
  }
  // Сортируем даты по возрастанию (от старых к новым) для правильной нумерации order_number
  orderDates.sort((a, b) => a.getTime() - b.getTime());

  for (let i = 0; i < orderCount; i++) {
    const orderDate = orderDates[i];
    const orderNumber = orderNumberSeq++;
    const isExpense = Math.random() < 0.18; // ~18% расходов
    const daysAgo = Math.round((new Date().getTime() - orderDate.getTime()) / (1000 * 3600 * 24));

    if (isExpense) {
      const expenseTitle = randomChoice(ORDER_EXPENSE_TITLES);
      const expenseAmount = randomInt(20, 180) * 100; // 2000 - 18000 ₽

      orders.push({
        id: randomId(),
        order_number: orderNumber,
        created_at: orderDate.toISOString(),
        date: formatDateRu(orderDate),
        type: 'expense',
        title: expenseTitle,
        quantity: 1,
        amount: expenseAmount,
        cost: expenseAmount,
        cost_items: [{ category: 'Печать', amount: expenseAmount }],
        payments: [expenseAmount],
        payment: expenseAmount,
        client: 'Другое',
        contact: '',
        contacts: [],
        deadline: formatDateRu(orderDate),
        status: 'Готово',
        notes: randomChoice(['Чек в бухгалтерии', 'Оплата по карте Ozon', 'Материалы для мастерской', 'СДЭК Маркет']),
      });
    } else {
      // Income заказ
      const matchedProduct = Math.random() < 0.65 ? randomChoice(savedCalculations) : null;
      const title = matchedProduct ? matchedProduct.name : randomChoice(ORDER_INCOME_TITLES);
      const clientName = randomChoice(CLIENT_NAMES);
      const clientChannel = randomChoice(CLIENT_CHANNELS);
      const qty = randomChoice([1, 1, 1, 2, 2, 3, 5, 10]);

      let unitAmount = matchedProduct ? matchedProduct.final_price : randomInt(70, 350) * 20;
      let unitCost = matchedProduct ? matchedProduct.base_cost : Math.round(unitAmount * randomFloat(0.35, 0.55));
      const amount = Math.round(unitAmount * qty);
      const cost = Math.round(unitCost * qty);

      // Детализация расходов
      const printCost = Math.round(cost * randomFloat(0.65, 0.8));
      const packageCost = Math.round(cost * randomFloat(0.08, 0.15));
      const laborCostItem = Math.round(cost * randomFloat(0.1, 0.2));
      const costItems: CostItem[] = [
        { category: 'Печать', amount: printCost },
        { category: 'Упаковка', amount: packageCost },
        { category: 'Работа руками', amount: laborCostItem },
      ];

      // Статус заказа в зависимости от давности даты
      let status: OrderStatus = 'Готово';
      if (daysAgo <= 2) {
        status = randomChoice(['Печать', 'Ждет печати', 'Моделирование', 'Ждет покраски']);
      } else if (daysAgo <= 7) {
        status = randomChoice(['Ждет отправки', 'Отправлен', 'Покраска', 'Готово']);
      } else {
        status = 'Готово';
      }

      // Оплата (для готовых - полная, для свежих - возможна предоплата)
      let payments: number[] = [];
      let paymentTotal = 0;

      if (status === 'Готово' || status === 'Отправлен') {
        payments = [amount];
        paymentTotal = amount;
      } else {
        const hasPrepayment = Math.random() < 0.7;
        if (hasPrepayment) {
          const prepay = Math.round((amount * 0.5) / 100) * 100;
          payments = [prepay];
          paymentTotal = prepay;
        } else {
          payments = [];
          paymentTotal = 0;
        }
      }

      // Контакты
      const phoneNum = `+7 (9${randomInt(10, 99)}) ${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(10, 99)}`;
      const tgHandle = `@${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${randomInt(10, 99)}`;
      const contacts: ContactItem[] = [
        { type: 'phone', value: phoneNum, label: 'Телефон' },
      ];
      if (Math.random() < 0.6) {
        contacts.push({ type: 'telegram', value: tgHandle, label: 'Telegram' });
      }

      // Дедлайн
      const deadlineDate = new Date(orderDate.getTime() + randomInt(2, 6) * 24 * 60 * 60 * 1000);
      const deadlineStr = formatDateRu(deadlineDate);

      orders.push({
        id: randomId(),
        order_number: orderNumber,
        created_at: orderDate.toISOString(),
        date: formatDateRu(orderDate),
        type: 'income',
        title,
        quantity: qty,
        amount,
        cost,
        cost_items: costItems,
        payments,
        payment: paymentTotal,
        client: clientChannel,
        contact: phoneNum,
        contacts,
        deadline: deadlineStr,
        status,
        notes: randomChoice(ORDER_NOTES_POOL),
        product_id: matchedProduct ? matchedProduct.id : undefined,
      });
    }
  }

  // Сортируем заказы по номеру заказа от большего к меньшему (desc), как в UI
  orders.sort((a, b) => (b.order_number || 0) - (a.order_number || 0));

  return {
    printers,
    filaments,
    settings,
    savedCalculations,
    orders,
    collections,
  };
}
