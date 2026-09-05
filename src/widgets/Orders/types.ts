import React from 'react';
import { 
  Order, 
  OrderStatus, 
  ContactItem, 
  ContactType, 
  CostItem, 
  PaymentItem,
  SavedCalculation 
} from '../../shared/types';
import { 
  AlertCircle, 
  Cpu, 
  Clock, 
  Printer, 
  Palette, 
  Brush, 
  Package, 
  Truck, 
  CheckCircle2,
  ShoppingBag,
  Send,
  Play,
  Music,
  Camera,
  Share2,
  Globe,
  Phone,
  MessageCircle,
  Mail,
  ThumbsUp,
  MoreHorizontal,
  Compass,
  User
} from 'lucide-react';

export type { Order, OrderStatus, ContactItem, ContactType, CostItem, PaymentItem, SavedCalculation };

export type SortField = keyof Order | 'net_profit' | 'debt' | 'payment_status';
export type SortOrder = 'asc' | 'desc';
export type OrderTypeFilter = 'all' | 'in_progress' | 'completed' | 'income' | 'expense';
export type PaymentFilter = 'all' | 'paid' | 'unpaid' | 'partial';

export interface StatusBadgeConfig {
  value: OrderStatus;
  label: string;
  badgeStyle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  dotColor: string;
}

export const STATUS_CONFIG: Record<OrderStatus, StatusBadgeConfig> = {
  'Не в работе': {
    value: 'Не в работе',
    label: 'Не в работе',
    icon: AlertCircle,
    color: '#f43f5e',
    dotColor: 'bg-rose-500',
    badgeStyle: 'bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-950/30',
  },
  'Моделирование': {
    value: 'Моделирование',
    label: 'Моделирование',
    icon: Cpu,
    color: '#f59e0b',
    dotColor: 'bg-amber-500',
    badgeStyle: 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/30',
  },
  'Ждет печати': {
    value: 'Ждет печати',
    label: 'Ждет печати',
    icon: Clock,
    color: '#38bdf8',
    dotColor: 'bg-sky-500',
    badgeStyle: 'bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-950/30',
  },
  'Печать': {
    value: 'Печать',
    label: 'Печать',
    icon: Printer,
    color: '#60a5fa',
    dotColor: 'bg-blue-500',
    badgeStyle: 'bg-blue-500/15 text-blue-300 border border-blue-500/40 shadow-sm shadow-blue-950/40',
  },
  'Ждет покраски': {
    value: 'Ждет покраски',
    label: 'Ждет покраски',
    icon: Palette,
    color: '#eab308',
    dotColor: 'bg-yellow-500',
    badgeStyle: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/40 shadow-sm shadow-yellow-950/30',
  },
  'Покраска': {
    value: 'Покраска',
    label: 'Покраска',
    icon: Brush,
    color: '#c084fc',
    dotColor: 'bg-purple-500',
    badgeStyle: 'bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-950/40',
  },
  'Ждет отправки': {
    value: 'Ждет отправки',
    label: 'Ждет отправки',
    icon: Package,
    color: '#818cf8',
    dotColor: 'bg-indigo-500',
    badgeStyle: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-950/30',
  },
  'Отправлен': {
    value: 'Отправлен',
    label: 'Отправлен',
    icon: Truck,
    color: '#22d3ee',
    dotColor: 'bg-cyan-500',
    badgeStyle: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/40',
  },
  'Готово': {
    value: 'Готово',
    label: 'Готово',
    icon: CheckCircle2,
    color: '#34d399',
    dotColor: 'bg-emerald-500',
    badgeStyle: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/40',
  },
};

export const ALL_STATUSES: OrderStatus[] = [
  'Не в работе',
  'Моделирование',
  'Ждет печати',
  'Печать',
  'Ждет покраски',
  'Покраска',
  'Ждет отправки',
  'Отправлен',
  'Готово',
];

export const DEFAULT_CLIENT_BADGE_STYLE = 'bg-white/5 text-neutral-300 border-white/10 shadow-sm';
export const DEFAULT_CLIENT_COLOR = '#a3a3a3';

export interface ClientBadgeConfig {
  value: string;
  label: string;
  badgeStyle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const CLIENT_CONFIG: Record<string, ClientBadgeConfig> = {
  'Авито': {
    value: 'Авито',
    label: 'Авито',
    icon: ShoppingBag,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Telegram': {
    value: 'Telegram',
    label: 'Telegram',
    icon: Send,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'WhatsApp': {
    value: 'WhatsApp',
    label: 'WhatsApp',
    icon: MessageCircle,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'VK': {
    value: 'VK',
    label: 'VK',
    icon: Share2,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'ВКонтакте': {
    value: 'ВКонтакте',
    label: 'ВКонтакте',
    icon: Share2,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Сайт': {
    value: 'Сайт',
    label: 'Сайт',
    icon: Globe,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Рекомендация': {
    value: 'Рекомендация',
    label: 'Рекомендация',
    icon: ThumbsUp,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Другое': {
    value: 'Другое',
    label: 'Другое',
    icon: MoreHorizontal,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'YouTube': {
    value: 'YouTube',
    label: 'YouTube',
    icon: Play,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'TikTok': {
    value: 'TikTok',
    label: 'TikTok',
    icon: Music,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Instagram': {
    value: 'Instagram',
    label: 'Instagram',
    icon: Camera,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Яндекс': {
    value: 'Яндекс',
    label: 'Яндекс',
    icon: Compass,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Ozon': {
    value: 'Ozon',
    label: 'Ozon',
    icon: Package,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'WB': {
    value: 'WB',
    label: 'WB',
    icon: ShoppingBag,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Лично': {
    value: 'Лично',
    label: 'Лично',
    icon: User,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Телеграмм': {
    value: 'Telegram',
    label: 'Telegram',
    icon: Send,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Инстаграмм': {
    value: 'Instagram',
    label: 'Instagram',
    icon: Camera,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Ютуб': {
    value: 'YouTube',
    label: 'YouTube',
    icon: Play,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
  'Тикток': {
    value: 'TikTok',
    label: 'TikTok',
    icon: Music,
    color: DEFAULT_CLIENT_COLOR,
    badgeStyle: DEFAULT_CLIENT_BADGE_STYLE,
  },
};

export const ALL_CLIENTS = ['Авито', 'Telegram', 'YouTube', 'TikTok', 'Instagram', 'ВКонтакте', 'Другое'];

export const ORDER_CHANNELS = [
  'Авито',
  'Telegram',
  'WhatsApp',
  'VK',
  'Сайт',
  'Рекомендация',
  'Другое',
] as const;

export const CONTACT_TYPES_CONFIG: Record<ContactType, { label: string; icon: React.ComponentType<{ className?: string }>; placeholder: string; badgeStyle: string }> = {
  phone: {
    label: 'Телефон',
    icon: Phone,
    placeholder: '+7 900 000-00-00',
    badgeStyle: 'bg-neutral-900 text-neutral-300 border-white/20',
  },
  telegram: {
    label: 'Telegram',
    icon: Send,
    placeholder: '@username или t.me/...',
    badgeStyle: 'bg-neutral-900 text-neutral-300 border-white/20',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    placeholder: '+7 900 000-00-00',
    badgeStyle: 'bg-neutral-900 text-neutral-300 border-white/20',
  },
  avito: {
    label: 'Авито профиль',
    icon: ShoppingBag,
    placeholder: 'Ссылка на профиль Авито',
    badgeStyle: 'bg-neutral-900 text-neutral-300 border-white/20',
  },
  vk: {
    label: 'VK профиль',
    icon: Share2,
    placeholder: 'Ссылка на страницу или ID',
    badgeStyle: 'bg-neutral-900 text-neutral-300 border-white/20',
  },
  instagram: {
    label: 'Instagram',
    icon: Camera,
    placeholder: '@username или ссылка',
    badgeStyle: 'bg-neutral-900 text-neutral-300 border-white/20',
  },
  email: {
    label: 'Email',
    icon: Mail,
    placeholder: 'example@mail.ru',
    badgeStyle: 'bg-neutral-900 text-neutral-300 border-white/20',
  },
  other: {
    label: 'Другой контакт / Ссылка',
    icon: Globe,
    placeholder: 'Любой контакт или комментарий',
    badgeStyle: 'bg-neutral-900 text-neutral-300 border-white/20',
  },
};
