import React from 'react';
import { 
  Order, 
  OrderStatus, 
  ContactItem, 
  ContactType, 
  CostItem, 
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
  Mail
} from 'lucide-react';

export type { Order, OrderStatus, ContactItem, ContactType, CostItem, SavedCalculation };

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
    color: '#f59e0b',
    badgeStyle: 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/30',
  },
  'Telegram': {
    value: 'Telegram',
    label: 'Telegram',
    icon: Send,
    color: '#38bdf8',
    badgeStyle: 'bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-950/30',
  },
  'YouTube': {
    value: 'YouTube',
    label: 'YouTube',
    icon: Play,
    color: '#ef4444',
    badgeStyle: 'bg-red-500/15 text-red-300 border border-red-500/40 shadow-sm shadow-red-950/30',
  },
  'TikTok': {
    value: 'TikTok',
    label: 'TikTok',
    icon: Music,
    color: '#c084fc',
    badgeStyle: 'bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-950/30',
  },
  'Instagram': {
    value: 'Instagram',
    label: 'Instagram',
    icon: Camera,
    color: '#f472b6',
    badgeStyle: 'bg-pink-500/15 text-pink-300 border border-pink-500/40 shadow-sm shadow-pink-950/30',
  },
  'ВКонтакте': {
    value: 'ВКонтакте',
    label: 'ВКонтакте',
    icon: Share2,
    color: '#818cf8',
    badgeStyle: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-950/30',
  },
  'Другое': {
    value: 'Другое',
    label: 'Другое',
    icon: Globe,
    color: '#9ca3af',
    badgeStyle: 'bg-gray-500/15 text-gray-300 border border-gray-500/40 shadow-sm',
  },
  'Телеграмм': {
    value: 'Telegram',
    label: 'Telegram',
    icon: Send,
    color: '#38bdf8',
    badgeStyle: 'bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-950/30',
  },
  'Инстаграмм': {
    value: 'Instagram',
    label: 'Instagram',
    icon: Camera,
    color: '#f472b6',
    badgeStyle: 'bg-pink-500/15 text-pink-300 border border-pink-500/40 shadow-sm shadow-pink-950/30',
  },
  'Ютуб': {
    value: 'YouTube',
    label: 'YouTube',
    icon: Play,
    color: '#ef4444',
    badgeStyle: 'bg-red-500/15 text-red-300 border border-red-500/40 shadow-sm shadow-red-950/30',
  },
  'Тикток': {
    value: 'TikTok',
    label: 'TikTok',
    icon: Music,
    color: '#c084fc',
    badgeStyle: 'bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-950/30',
  },
};

export const ALL_CLIENTS = ['Авито', 'Telegram', 'YouTube', 'TikTok', 'Instagram', 'ВКонтакте', 'Другое'];

export const CONTACT_TYPES_CONFIG: Record<ContactType, { label: string; icon: React.ComponentType<{ className?: string }>; placeholder: string; badgeStyle: string }> = {
  phone: {
    label: 'Телефон',
    icon: Phone,
    placeholder: '+7 900 000-00-00',
    badgeStyle: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
  },
  telegram: {
    label: 'Telegram',
    icon: Send,
    placeholder: '@username или t.me/...',
    badgeStyle: 'bg-sky-950/80 text-sky-300 border-sky-500/40',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    placeholder: '+7 900 000-00-00',
    badgeStyle: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
  },
  avito: {
    label: 'Авито профиль',
    icon: ShoppingBag,
    placeholder: 'Ссылка на профиль Авито',
    badgeStyle: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
  },
  vk: {
    label: 'ВКонтакте',
    icon: Share2,
    placeholder: 'vk.com/id...',
    badgeStyle: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
  },
  instagram: {
    label: 'Instagram',
    icon: Camera,
    placeholder: '@username или ссылка',
    badgeStyle: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
  },
  email: {
    label: 'Email',
    icon: Mail,
    placeholder: 'example@mail.ru',
    badgeStyle: 'bg-teal-950/80 text-teal-300 border-teal-500/40',
  },
  other: {
    label: 'Другой контакт / Ссылка',
    icon: Globe,
    placeholder: 'Любой контакт или комментарий',
    badgeStyle: 'bg-gray-800 text-gray-200 border-gray-700',
  },
};
