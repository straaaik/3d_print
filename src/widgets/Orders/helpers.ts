import { Order, OrderStatus, ContactType } from './types';
import { 
  round2 as roundTo2, 
  calculateOrderFinancials, 
  calculateOrdersSummaryKPI, 
  OrderFinancialsResult, 
  OrdersSummaryKPIResult 
} from '../../shared/lib/formulas';

export { roundTo2, calculateOrderFinancials, calculateOrdersSummaryKPI };
export type { OrderFinancialsResult, OrdersSummaryKPIResult };

export function formatMoney(num: number | undefined | null): string {
  const val = num || 0;
  return `${val.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₽`;
}

// Функция для склонения слова "день"
export function formatPluralDays(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${abs} дней`;
  if (mod10 === 1) return `${abs} день`;
  if (mod10 >= 2 && mod10 <= 4) return `${abs} дня`;
  return `${abs} дней`;
}

// Функция для расчета остатка дней до дедлайна
export function getDeadlineInfo(deadlineStr: string | undefined | null, orderStatus?: OrderStatus | string) {
  if (!deadlineStr || !deadlineStr.trim()) return null;

  // Если статус "Готово", дедлайн больше не тикает
  if (orderStatus === 'Готово') {
    return {
      daysDiff: 0,
      label: 'Сдан',
      badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      isOverdue: false,
      isNear: false,
    };
  }

  const str = deadlineStr.trim();
  let deadlineDate: Date | null = null;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    deadlineDate = new Date(y, m - 1, d);
  } else {
    const parts = str.split('.');
    if (parts.length >= 2) {
      const day = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const year = parts[2] ? (parts[2].length === 2 ? Number(`20${parts[2]}`) : Number(parts[2])) : new Date().getFullYear();
      deadlineDate = new Date(year, month, day);
    }
  }

  if (!deadlineDate || isNaN(deadlineDate.getTime())) return null;

  const today = new Date();
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const deadlineZero = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());

  const diffMs = deadlineZero.getTime() - todayZero.getTime();
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    const absDays = Math.abs(daysDiff);
    return {
      daysDiff,
      label: `–${absDays} дн`,
      badgeStyle: 'bg-rose-500/15 text-rose-300 border-rose-500/40 font-bold',
      isOverdue: true,
      isNear: false,
    };
  }
  if (daysDiff === 0) {
    return {
      daysDiff,
      label: 'Сегодня',
      badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold',
      isOverdue: false,
      isNear: true,
    };
  }
  if (daysDiff === 1) {
    return {
      daysDiff,
      label: 'Завтра',
      badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold',
      isOverdue: false,
      isNear: true,
    };
  }
  if (daysDiff <= 3) {
    return {
      daysDiff,
      label: `${daysDiff} дн`,
      badgeStyle: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30 font-medium',
      isOverdue: false,
      isNear: true,
    };
  }
  return {
    daysDiff,
    label: `${daysDiff} дн`,
    badgeStyle: 'bg-neutral-800/80 text-neutral-400 border-neutral-700/60',
    isOverdue: false,
    isNear: false,
  };
}

export const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export function getOrderMonthKey(order: Order): string {
  if (order.date) {
    const dStr = order.date.trim();
    if (/^\d{4}-\d{2}/.test(dStr)) {
      return dStr.slice(0, 7);
    }
    const parts = dStr.split('.');
    if (parts.length >= 2) {
      const month = String(Number(parts[1])).padStart(2, '0');
      const year = parts[2] ? (parts[2].length === 2 ? `20${parts[2]}` : parts[2]) : String(new Date().getFullYear());
      return `${year}-${month}`;
    }
  }

  if (order.created_at) {
    try {
      const date = new Date(order.created_at);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      }
    } catch {
      // Игнорируем
    }
  }

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthKeyLabel(key: string): string {
  if (!key || key === 'all') return 'Все месяцы';
  const [yearStr, monthStr] = key.split('-');
  const monthIdx = Number(monthStr) - 1;
  const monthName = MONTH_NAMES_RU[monthIdx] || monthStr;
  return `${monthName} ${yearStr}`;
}

export function getCurrentRealMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getContactHref(type: ContactType, val: string): string {
  if (!val) return '#';
  const cleanVal = val.trim();
  if (type === 'phone' || type === 'whatsapp') {
    const nums = cleanVal.replace(/\D/g, '');
    return type === 'phone' ? `tel:+${nums}` : `https://wa.me/${nums}`;
  }
  if (type === 'telegram') {
    const username = cleanVal.replace('@', '');
    return cleanVal.startsWith('http') ? cleanVal : `https://t.me/${username}`;
  }
  if (type === 'email') {
    return `mailto:${cleanVal}`;
  }
  if (cleanVal.startsWith('http')) return cleanVal;
  return `https://${cleanVal}`;
}
