'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { normalizeNumericValue, parseNumericDraft } from '../lib/numericInput';

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max'> {
  label: React.ReactNode;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
  error?: string;
  hint?: string;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { id, label, value, onChange, min, max, allowEmpty = false, error, hint, className = '',
    onFocus, onBlur, ...rest }, forwardedRef,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const focused = useRef(false);
  const [draft, setDraft] = useState(value === null ? '' : String(value));

  useEffect(() => {
    if (!focused.current) setDraft(value === null ? '' : String(value));
  }, [value]);

  const setRefs = (node: HTMLInputElement | null) => {
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  return (
    <div className="w-full flex flex-col gap-1.5 font-mono text-xs">
      <label htmlFor={inputId} className="text-neutral-400 uppercase tracking-wider select-none">{label}</label>
      <motion.div whileHover={{ borderColor: 'rgba(255,255,255,0.25)' }}
        transition={{ duration: 0.18 }}
        className="w-full h-9 min-h-[36px] bg-neutral-950/80 border border-white/15 focus-within:border-white/30 rounded-lg">
      <input
        {...rest}
        ref={setRefs}
        id={inputId}
        type="text"
        inputMode="decimal"
        value={draft}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`w-full h-full bg-transparent focus:outline-none px-3 text-white text-xs font-mono tabular-nums placeholder-neutral-600 disabled:opacity-40 ${className}`}
        onFocus={(event) => {
          focused.current = true;
          if (value === 0) event.currentTarget.select();
          onFocus?.(event);
        }}
        onChange={(event) => {
          const parsed = parseNumericDraft(event.currentTarget.value, min !== undefined && min < 0);
          if (parsed.kind === 'invalid') return;
          setDraft(parsed.draft);
          if (parsed.kind === 'valid' && !Object.is(parsed.value, value)) onChange(parsed.value);
          if (parsed.kind === 'transient' && parsed.draft === '' && allowEmpty && value !== null) onChange(null);
        }}
        onBlur={(event) => {
          focused.current = false;
          const normalized = normalizeNumericValue(draft, value, { min, max, allowEmpty });
          setDraft(normalized === null ? '' : String(normalized));
          if (!Object.is(normalized, value)) onChange(normalized);
          onBlur?.(event);
        }}
      />
      </motion.div>
      {error && <span id={`${inputId}-error`} className="text-rose-400 text-[11px]">{error}</span>}
      {hint && !error && <span id={`${inputId}-hint`} className="text-neutral-500 text-[10px]">{hint}</span>}
    </div>
  );
});

NumberInput.displayName = 'NumberInput';
