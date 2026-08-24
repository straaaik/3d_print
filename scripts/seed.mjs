import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Чтение .env или .env.local если они есть
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...values] = trimmed.split('=');
          const val = values.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      });
    }
  }
}

loadEnv();

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ГЕНЕРАЦИИ СЛУЧАЙНЫХ ДАННЫХ
// ============================================================================

function randomId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  const val = Math.random() * (max - min) + min;
  return Number(val.toFixed(decimals));
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomSample(items, count) {
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, items.length));
}

function randomDateInPast(daysAgoMin, daysAgoMax) {
  const now = new Date();
  const days = randomInt(daysAgoMin, daysAgoMax);
  const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  date.setHours(randomInt(9, 21), randomInt(0, 59), randomInt(0, 59));
  return date;
}

function formatDateRu(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ============================================================================
// ПУЛЫ ДАННЫХ
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
  { name: 'Заглушка противотуманной фары VAG', category: 'Авто / Мото', tags: ['авто', 'abs', 'ремонт', 'vag'], weightG: 45, hours: 2, minutes: 15 },
  { name: 'Крепление регистратора на зеркало заднего вида', category: 'Авто / Мото', tags: ['авто', 'petg', 'крепление', 'гаджет'], weightG: 32, hours: 1, minutes: 40 },
  { name: 'Подиум под датчик 52мм в стойку', category: 'Авто / Мото', tags: ['авто', 'тюнинг', 'asa'], weightG: 78, hours: 3, minutes: 50 },
  { name: 'Клипса обшивки двери (комплект 10 шт)', category: 'Авто / Мото', tags: ['авто', 'petg', 'клипсы'], weightG: 25, hours: 1, minutes: 10 },
  { name: 'Геометрическое кашпо Origami для суккулентов', category: 'Декор и Дом', tags: ['декор', 'кашпо', 'дом', 'origami'], weightG: 110, hours: 4, minutes: 20 },
  { name: 'Светильник-ночник «Полигональная Луна» 16см', category: 'Декор и Дом', tags: ['декор', 'ночник', 'светильник', 'подарок'], weightG: 195, hours: 8, minutes: 45 },
  { name: 'Настенный органайзер для ключей с магнитами', category: 'Декор и Дом', tags: ['декор', 'дом', 'органайзер'], weightG: 65, hours: 2, minutes: 30 },
  { name: 'Дизайнерская ваза Спираль Spiral Vase', category: 'Декор и Дом', tags: ['ваза', 'декор', 'vase_mode', 'silk'], weightG: 85, hours: 2, minutes: 10 },
  { name: 'Шестерня редуктора коническая M1.5 Z=28', category: 'Инженерия и Техника', tags: ['инженерия', 'шестерня', 'редуктор', 'pa-cf'], weightG: 55, hours: 2, minutes: 50 },
  { name: 'Корпус для Raspberry Pi 5 с креплением на DIN-рейку', category: 'Инженерия и Техника', tags: ['корпус', 'rpi5', 'din-рейка', 'электроника'], weightG: 92, hours: 4, minutes: 15 },
  { name: 'Переходник системы аспирации ЧПУ 100мм -> 50мм', category: 'Инженерия и Техника', tags: ['чпу', 'адаптер', 'мастерская', 'petg'], weightG: 140, hours: 5, minutes: 10 },
  { name: 'Кронштейн шагового двигателя NEMA 17 усиленный', category: 'Инженерия и Техника', tags: ['nema17', 'кронштейн', 'чпу', '3d-принтер'], weightG: 48, hours: 1, minutes: 55 },
  { name: 'Настольная подставка для наушников DeskStand', category: 'Гаджеты и Игры', tags: ['гаджеты', 'наушники', 'подставка', 'рабочее_место'], weightG: 160, hours: 6, minutes: 30 },
  { name: 'Док-станция iPhone MagSafe + Apple Watch', category: 'Гаджеты и Игры', tags: ['apple', 'magsafe', 'док-станция', 'гаджет'], weightG: 125, hours: 5, minutes: 0 },
  { name: 'Подвесной держатель Mac Mini под столешницу', category: 'Гаджеты и Игры', tags: ['macmini', 'под_стол', 'органайзер'], weightG: 115, hours: 4, minutes: 40 },
  { name: 'Грипсы эргономичные для геймпада DualSense', category: 'Гаджеты и Игры', tags: ['ps5', 'dualsense', 'игры', 'tpu'], weightG: 38, hours: 1, minutes: 45 },
  { name: 'Угловой фиксатор 90° для столярной струбцины', category: 'Фурнитура', tags: ['столярка', 'инструмент', 'уголок'], weightG: 85, hours: 3, minutes: 10 },
  { name: 'Ручка-барашек M8 эргономичная (набор 5 шт)', category: 'Фурнитура', tags: ['ручки', 'фурнитура', 'm8'], weightG: 60, hours: 2, minutes: 20 },
  { name: 'Кондуктор-шаблон для врезки петель 35мм', category: 'Фурнитура', tags: ['шаблон', 'мебель', 'инструмент'], weightG: 70, hours: 2, minutes: 45 },
  { name: 'Органайзер ящика мастерской Gridfinity 3x4', category: 'Разное', tags: ['gridfinity', 'мастерская', 'органайзер'], weightG: 135, hours: 5, minutes: 20 },
  { name: 'Защитный кейс для 4-х аккумуляторов 18650 с защелкой', category: 'Разное', tags: ['кейс', '18650', 'аккумуляторы'], weightG: 52, hours: 2, minutes: 10 },
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
// ГЕНЕРАТОР
// ============================================================================

export function generateSeedData() {
  const printerCount = randomInt(4, 5);
  const filamentCount = randomInt(10, 14);
  const orderCount = randomInt(38, 48);

  // 1. Принтеры
  const selectedPrinterTemplates = randomSample(PRINTER_TEMPLATES, printerCount);
  const printers = selectedPrinterTemplates.map((tpl) => {
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

  const defaultPrinter = printers[0];

  // 2. Настройки
  const settings = {
    id: randomId(),
    updated_at: new Date().toISOString(),
    currency: '₽',
    electricity_rate: randomFloat(4.5, 6.2, 2),
    default_printer_id: defaultPrinter.id,
    labor_rate_per_hour: randomInt(55, 90) * 10,
    labor_time_minutes: 15,
    default_markup_percent: randomChoice([100, 120, 150, 180]),
    default_defect_percent: randomChoice([5, 6, 7, 8]),
  };

  // 3. Филаменты
  const filaments = [];
  for (let i = 0; i < filamentCount; i++) {
    const brand = randomChoice(FILAMENT_BRANDS);
    const fType = randomChoice(FILAMENT_TYPES);
    const colorObj = randomChoice(COLOR_PALETTE);
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

  // 4. Товары
  const savedCalculations = [];
  const selectedProducts = randomSample(PRODUCT_TEMPLATES, 14);

  for (const tpl of selectedProducts) {
    const f = randomChoice(filaments);
    const p = randomChoice(printers);

    const weightG = Math.round(tpl.weightG * randomFloat(0.85, 1.25));
    const hours = tpl.hours;
    const minutes = tpl.minutes;
    const totalPrintHours = hours + minutes / 60;

    const filamentCost = (f.price / f.weight_g) * weightG;
    const powerKw = p.power_w / 1000;
    const electricityCost = powerKw * totalPrintHours * settings.electricity_rate;
    const depreciationCost = (p.price / p.lifespan_hours) * totalPrintHours;
    const defectCost = (filamentCost + electricityCost + depreciationCost) * (settings.default_defect_percent / 100);
    const laborCost = (settings.labor_time_minutes / 60) * settings.labor_rate_per_hour;

    const baseCost = Math.round((filamentCost + electricityCost + depreciationCost + defectCost + laborCost) * 100) / 100;
    const markupFactor = 1 + (settings.default_markup_percent / 100);
    const finalPrice = Math.round((baseCost * markupFactor) / 10) * 10;

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
      stock_quantity: randomInt(0, 8),
      created_at: randomDateInPast(15, 120).toISOString(),
    });
  }

  // 4.1 Сборки
  for (const assemTpl of ASSEMBLY_TEMPLATES) {
    let totalWeight = 0;
    let totalMins = 0;
    let partsCost = 0;
    let partsPrice = 0;

    const assemblyParts = assemTpl.parts.map((part) => {
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
    const assemblyHardware = assemTpl.hardware.map((hw) => {
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

  // 5. Заказы
  const orders = [];
  let orderNumberSeq = 1001;

  const orderDates = [];
  for (let i = 0; i < orderCount; i++) {
    const daysAgo = Math.floor(Math.pow(Math.random(), 1.5) * 90);
    orderDates.push(randomDateInPast(daysAgo, daysAgo));
  }
  orderDates.sort((a, b) => a.getTime() - b.getTime());

  for (let i = 0; i < orderCount; i++) {
    const orderDate = orderDates[i];
    const orderNumber = orderNumberSeq++;
    const isExpense = Math.random() < 0.18;
    const daysAgo = Math.round((new Date().getTime() - orderDate.getTime()) / (1000 * 3600 * 24));

    if (isExpense) {
      const expenseTitle = randomChoice(ORDER_EXPENSE_TITLES);
      const expenseAmount = randomInt(20, 180) * 100;

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
      const matchedProduct = Math.random() < 0.65 ? randomChoice(savedCalculations) : null;
      const title = matchedProduct ? matchedProduct.name : randomChoice(ORDER_INCOME_TITLES);
      const clientName = randomChoice(CLIENT_NAMES);
      const clientChannel = randomChoice(CLIENT_CHANNELS);
      const qty = randomChoice([1, 1, 1, 2, 2, 3, 5, 10]);

      let unitAmount = matchedProduct ? matchedProduct.final_price : randomInt(70, 350) * 20;
      let unitCost = matchedProduct ? matchedProduct.base_cost : Math.round(unitAmount * randomFloat(0.35, 0.55));
      const amount = Math.round(unitAmount * qty);
      const cost = Math.round(unitCost * qty);

      const printCost = Math.round(cost * randomFloat(0.65, 0.8));
      const packageCost = Math.round(cost * randomFloat(0.08, 0.15));
      const laborCostItem = Math.round(cost * randomFloat(0.1, 0.2));
      const costItems = [
        { category: 'Печать', amount: printCost },
        { category: 'Упаковка', amount: packageCost },
        { category: 'Работа руками', amount: laborCostItem },
      ];

      let status = 'Готово';
      if (daysAgo <= 2) {
        status = randomChoice(['Печать', 'Ждет печати', 'Моделирование', 'Ждет покраски']);
      } else if (daysAgo <= 7) {
        status = randomChoice(['Ждет отправки', 'Отправлен', 'Покраска', 'Готово']);
      } else {
        status = 'Готово';
      }

      let payments = [];
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
        }
      }

      const phoneNum = `+7 (9${randomInt(10, 99)}) ${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(10, 99)}`;
      const tgHandle = `@${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${randomInt(10, 99)}`;
      const contacts = [
        { type: 'phone', value: phoneNum, label: 'Телефон' },
      ];
      if (Math.random() < 0.6) {
        contacts.push({ type: 'telegram', value: tgHandle, label: 'Telegram' });
      }

      const deadlineDate = new Date(orderDate.getTime() + randomInt(2, 6) * 24 * 60 * 60 * 1000);

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
        deadline: formatDateRu(deadlineDate),
        status,
        notes: randomChoice(ORDER_NOTES_POOL),
        product_id: matchedProduct ? matchedProduct.id : undefined,
      });
    }
  }

  orders.sort((a, b) => (b.order_number || 0) - (a.order_number || 0));

  return {
    printers,
    filaments,
    settings,
    savedCalculations,
    orders,
  };
}

// ============================================================================
// ЗАПУСК ОЧИСТКИ И ЗАПОЛНЕНИЯ
// ============================================================================

async function run() {
  console.log('🔄 Генерация случайных реалистичных данных для 3D студии...');
  const data = generateSeedData();

  console.log(`✅ Сгенерировано:`);
  console.log(`   - 🖨️ Принтеров: ${data.printers.length}`);
  console.log(`   - 🧵 Филаментов: ${data.filaments.length}`);
  console.log(`   - 📦 Товаров и сборок: ${data.savedCalculations.length}`);
  console.log(`   - 📋 Заказов и расходов: ${data.orders.length}`);
  console.log(`   - ⚙️ Принтер по умолчанию: ${data.printers[0].name}`);

  // Сохраняем в demo-данные (JSON файл бэкапа для быстрого импорта)
  const backupPath = path.join(rootDir, 'sample_seed_data.json');
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 Резервная копия сохранена в: ${backupPath}`);

  // Проверяем Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && supabaseUrl !== 'your-project-url' && supabaseKey !== 'your-anon-key') {
    console.log(`☁️ Подключение к Supabase: ${supabaseUrl}...`);
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    try {
      console.log('🗑️ Очистка всех таблиц в Supabase...');
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('saved_calculations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('filaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('printers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      console.log('📥 Вставка новых данных в Supabase...');
      if (data.printers.length > 0) await supabase.from('printers').insert(data.printers);
      if (data.filaments.length > 0) await supabase.from('filaments').insert(data.filaments);
      if (data.settings) await supabase.from('settings').insert(data.settings);
      if (data.savedCalculations.length > 0) await supabase.from('saved_calculations').insert(data.savedCalculations);
      if (data.orders.length > 0) await supabase.from('orders').insert(data.orders);

      console.log('🎉 Данные в Supabase успешно обновлены!');
    } catch (e) {
      console.error('❌ Ошибка синхронизации с Supabase:', e.message);
    }
  } else {
    console.log('ℹ️ Supabase не настроен в .env.local — данные сгенерированы для локального использования и кнопки в веб-интерфейсе.');
  }

  console.log('✨ Готово!');
}

run().catch(console.error);
