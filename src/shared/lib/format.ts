/**
 * Форматирует число в строку валюты с разделением тысяч и двумя знаками после запятой.
 * Пример: 1250.5 -> "1 250,50 ₽"
 */
export function formatCurrency(amount: number, currency: string = '₽'): string {
  if (isNaN(amount) || amount === null || amount === undefined || !isFinite(amount)) {
    amount = 0;
  }

  const formatted = amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatted} ${currency}`;
}

/**
 * Конвертирует часы и минуты в десятичные часы.
 * Пример: 1 ч 30 мин -> 1.5 ч
 */
export function timeToHours(hours: number, minutes: number): number {
  const safeHours = Math.max(0, hours || 0);
  const safeMinutes = Math.max(0, minutes || 0);
  return safeHours + safeMinutes / 60;
}

/**
 * Форматирует ISO-строку даты в понятный локализованный формат.
 * Пример: "2026-08-17T11:45:00Z" -> "17.08.2026 11:45"
 */
export function formatDate(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
