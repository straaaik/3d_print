import { Order, OrderStatus } from '../../types';

export interface OrdersV2FilterState {
  searchQuery: string;
  typeFilter: 'all' | 'income' | 'expense' | 'in_progress' | 'printing' | 'painting' | 'waiting_shipping' | 'completed';
  clientFilter: string;
  paymentFilter: 'all' | 'paid' | 'partial' | 'unpaid';
  selectedMonthKey: string;
}

export function formatOrderNumber(order: Order, fallbackIndex?: number): string {
  if (order.order_number) {
    return `#ORD-${String(order.order_number).padStart(4, '0')}`;
  }
  if (fallbackIndex !== undefined) {
    return `#ORD-${String(fallbackIndex + 1).padStart(4, '0')}`;
  }
  const digits = order.id.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `#ORD-${digits.slice(-4)}`;
  }
  return `#ORD-0001`;
}

export function getPaymentBadgeInfo(order: Order): {
  label: string;
  percentage: number;
  badgeClass: string;
  dotClass: string;
} {
  const amount = order.amount || 0;
  const payment = order.payment || 0;

  if (order.type === 'expense' || amount <= 0) {
    return {
      label: 'Расход',
      percentage: 100,
      badgeClass: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      dotClass: 'bg-rose-400',
    };
  }

  if (payment >= amount) {
    return {
      label: '100% Оплачен',
      percentage: 100,
      badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      dotClass: 'bg-emerald-400',
    };
  }

  if (payment > 0) {
    const percent = Math.round((payment / amount) * 100);
    return {
      label: `${percent}% Аванс`,
      percentage: percent,
      badgeClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
      dotClass: 'bg-cyan-400',
    };
  }

  return {
    label: 'Не оплачен',
    percentage: 0,
    badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    dotClass: 'bg-amber-400',
  };
}

export function getStatusBadgeV2(status: OrderStatus | string): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'Печать':
      return {
        label: 'Печать',
        badgeClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
        dotClass: 'bg-cyan-400',
      };
    case 'Ждет печати':
      return {
        label: 'Ждет печати',
        badgeClass: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
        dotClass: 'bg-sky-400',
      };
    case 'Моделирование':
      return {
        label: 'В работе',
        badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        dotClass: 'bg-amber-400',
      };
    case 'Покраска':
      return {
        label: 'Покраска',
        badgeClass: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
        dotClass: 'bg-purple-400',
      };
    case 'Ждет покраски':
      return {
        label: 'Ждет покраски',
        badgeClass: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
        dotClass: 'bg-purple-400',
      };
    case 'Ждет отправки':
      return {
        label: 'Ждет отправки',
        badgeClass: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
        dotClass: 'bg-indigo-400',
      };
    case 'Отправлен':
      return {
        label: 'Отправлен',
        badgeClass: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
        dotClass: 'bg-blue-400',
      };
    case 'Готово':
      return {
        label: 'Готово',
        badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
        dotClass: 'bg-emerald-400',
      };
    case 'Не в работе':
    default:
      return {
        label: 'Не в работе',
        badgeClass: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
        dotClass: 'bg-rose-400',
      };
  }
}
