export type NumericDraft =
  | { kind: 'valid'; draft: string; value: number }
  | { kind: 'transient'; draft: string }
  | { kind: 'invalid'; draft: string };

export interface NumericBounds {
  min?: number;
  max?: number;
  allowEmpty?: boolean;
}

/** Parses an edit without erasing incomplete decimal input or trailing zeros. */
export function parseNumericDraft(raw: string, allowNegative = false): NumericDraft {
  const draft = raw.replace(/^(-?)0+(?=\d)/, '$1');
  if (draft === '' || draft === '.' || draft === ',' ||
    (allowNegative && (draft === '-' || draft === '-.' || draft === '-,')) ||
    /^-?\d+[.,]$/.test(draft)) {
    return { kind: 'transient', draft };
  }
  const pattern = allowNegative ? /^-?(?:\d+|\d*[.,]\d+)$/ : /^(?:\d+|\d*[.,]\d+)$/;
  if (!pattern.test(draft)) return { kind: 'invalid', draft };
  const value = Number(draft.replace(',', '.'));
  return Number.isFinite(value) ? { kind: 'valid', draft, value } : { kind: 'invalid', draft };
}

/** Commits an edit at blur; transient or invalid input falls back to the last value. */
export function normalizeNumericValue(raw: string, previous: number | null, bounds: NumericBounds = {}): number | null {
  if (raw.trim() === '' && bounds.allowEmpty) return null;
  const normalized = raw.replace(',', '.');
  const parsed = normalized.trim() && /^-?(?:\d+|\d*\.\d+|\d+\.)$/.test(normalized)
    ? Number(normalized) : Number.NaN;
  const fallback = previous !== null && Number.isFinite(previous) ? previous : (bounds.min ?? 0);
  const value = Number.isFinite(parsed) ? parsed : fallback;
  const min = Number.isFinite(bounds.min) ? bounds.min! : Number.NEGATIVE_INFINITY;
  const max = Number.isFinite(bounds.max) ? bounds.max! : Number.POSITIVE_INFINITY;
  return Math.min(max, Math.max(min, value));
}
