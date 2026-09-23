import { Order, PaymentItem, ContactItem } from '../Orders/types';
import { SavedCalculation, ProductCollection, Printer, Filament } from '../../shared/types';

export const MOCK_PRINTERS: Printer[] = [
  {
    id: 'pr-1',
    name: 'Bambu Lab X1-Carbon',
    power_w: 350,
    price: 125000,
    lifespan_hours: 5000,
    color: '#10B981',
  },
  {
    id: 'pr-2',
    name: 'Voron 2.4 350',
    power_w: 450,
    price: 95000,
    lifespan_hours: 4000,
    color: '#F59E0B',
  },
];

export const MOCK_FILAMENTS: Filament[] = [
  {
    id: 'fil-1',
    name: 'PETG Carbon Black (FDplast)',
    weight_g: 1000,
    price: 1850,
    color: '#334155',
  },
  {
    id: 'fil-2',
    name: 'PLA Neon Orange (BestFilament)',
    weight_g: 1000,
    price: 2100,
    color: '#EA580C',
  },
];

export const MOCK_COLLECTION: ProductCollection = {
  id: 'col-1',
  name: 'Тактические аксессуары',
  category: 'Милитари',
  tags: ['airsoft', 'mount', 'custom'],
  description: 'Набор планок, рукояток и креплений для страйкбола',
  color: '#10B981',
};

export const MOCK_PRODUCT: SavedCalculation = {
  id: 'prod-1',
  name: 'Крепление камеры GoPro на шлем MICH',
  type: 'single',
  filament_name: 'PETG Carbon Black (FDplast)',
  filament_color: '#334155',
  printer_name: 'Bambu Lab X1-Carbon',
  weight_g: 45,
  hours: 2,
  minutes: 15,
  quantity: 1,
  base_cost: 320,
  final_price: 1200,
  category: 'Милитари',
  tags: ['airsoft', 'mount'],
  collection_id: 'col-1',
  collection_name: 'Тактические аксессуары',
  stl_url: 'https://example.com/models/gopro-mich-mount.stl',
};

export const MOCK_ASSEMBLY_PRODUCT: SavedCalculation = {
  id: 'prod-2',
  name: 'Поворотный узел манипулятора v3',
  type: 'assembly',
  filament_name: 'PETG Carbon Black (FDplast)',
  filament_color: '#334155',
  printer_name: 'Bambu Lab X1-Carbon',
  weight_g: 180,
  hours: 6,
  minutes: 40,
  quantity: 1,
  base_cost: 1450,
  final_price: 4500,
  category: 'Робототехника',
  tags: ['robotics', 'arm', 'gears'],
  assembly_parts: [
    {
      id: 'part-1',
      name: 'Основание редуктора',
      weight_g: 80,
      hours: 3,
      minutes: 10,
      quantity: 1,
      printer_name: 'Bambu Lab X1-Carbon',
      filament_name: 'PETG Carbon Black (FDplast)',
      base_cost: 600,
      final_price: 1800,
    },
    {
      id: 'part-2',
      name: 'Комплект шестерней (2 шт)',
      weight_g: 40,
      hours: 1,
      minutes: 30,
      quantity: 2,
      printer_name: 'Voron 2.4 350',
      filament_name: 'PLA Neon Orange (BestFilament)',
      base_cost: 400,
      final_price: 1200,
    },
  ],
};

export const MOCK_PAYMENTS: PaymentItem[] = [
  {
    id: 'pay-1',
    amount: 1500,
    date: '14.09.2026',
    note: 'Предоплата 50%',
  },
  {
    id: 'pay-2',
    amount: 1500,
    date: '15.09.2026',
    note: 'Финальный расчет при передаче',
  },
];

export const MOCK_CONTACTS: ContactItem[] = [
  {
    type: 'telegram',
    value: '@alex_print_master',
    label: 'Основной рабочий контакт',
  },
  {
    type: 'phone',
    value: '+7 (999) 123-45-67',
    label: 'Для звонков и доставки',
  },
];

export const MOCK_ORDER: Order = {
  id: 'ord-mock-001',
  order_number: 142,
  title: 'Партия шестерней редуктора (10 шт)',
  type: 'income',
  status: 'Печать',
  date: '2026-09-12',
  deadline: '2026-09-20',
  amount: 3000,
  cost: 850,
  payment: 1500,
  client: 'Telegram',
  client_name: 'Алексей Смирнов',
  contact: '@alex_print_master',
  contacts: MOCK_CONTACTS,
  payments: MOCK_PAYMENTS,
  notes: 'Печать слоем 0.16mm, сопло 0.4mm, заполнение 40% гироид.',
  cost_items: [
    {
      category: 'Материал',
      amount: 462.5,
      note: 'PETG 250г',
    },
    {
      category: 'Электроэнергия',
      amount: 42,
      note: '15 часов работы',
    },
  ],
};

export const MOCK_RECEIPT_RESULT = {
  materialCost: 380,
  depreciationCost: 120,
  electricityCost: 65,
  defectCost: 40,
  laborCost: 500,
  customCostsTotal: 150,
  customCostsBreakdown: [
    {
      id: 'cc-1',
      name: 'Упаковка и крафт-коробка',
      totalAmount: 150,
      isPerUnit: false,
    },
  ],
  discountTotal: 0,
  totalBaseCost: 1255,
  totalFinalPrice: 3200,
  profitTotal: 1945,
  marginPercent: 60.8,
};
