'use client';

import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type CheckboxVariant = 'primary' | 'cyan' | 'amber' | 'orange' | 'emerald' | 'purple' | 'rose';
export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: ((checked: boolean) => void) | React.ChangeEventHandler<HTMLInputElement>;
  variant?: CheckboxVariant;
  size?: CheckboxSize;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
  className?: string;
  checkboxClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
}

const variantStyles: Record<
  CheckboxVariant,
  {
    checked: string;
    indeterminate: string;
    focus: string;
    glow: string;
    hoverBorder: string;
    iconColor: string;
  }
> = {
  primary: {
    checked: 'bg-gradient-to-br from-[#0CB4E0] to-[#0996ba] border-[#29d0fb] text-[#0d0e12]',
    indeterminate: 'bg-[#0CB4E0]/20 border-[#0CB4E0] text-[#0CB4E0]',
    focus: 'focus-visible:ring-[#0CB4E0]/40',
    glow: 'shadow-[0_0_12px_rgba(12,180,224,0.35)]',
    hoverBorder: 'hover:border-[#0CB4E0]/60',
    iconColor: '#0d0e12',
  },
  cyan: {
    checked: 'bg-gradient-to-br from-cyan-400 to-cyan-600 border-cyan-300 text-black',
    indeterminate: 'bg-cyan-500/20 border-cyan-400 text-cyan-300',
    focus: 'focus-visible:ring-cyan-400/40',
    glow: 'shadow-[0_0_12px_rgba(34,211,238,0.4)]',
    hoverBorder: 'hover:border-cyan-400/60',
    iconColor: '#000000',
  },
  amber: {
    checked: 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-300 text-black',
    indeterminate: 'bg-amber-500/25 border-amber-400 text-amber-300',
    focus: 'focus-visible:ring-amber-400/40',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]',
    hoverBorder: 'hover:border-amber-400/60',
    iconColor: '#000000',
  },
  rose: {
    checked: 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400 text-white',
    indeterminate: 'bg-rose-500/25 border-rose-400 text-rose-300',
    focus: 'focus-visible:ring-rose-400/40',
    glow: 'shadow-[0_0_12px_rgba(244,63,94,0.4)]',
    hoverBorder: 'hover:border-rose-400/60',
    iconColor: '#ffffff',
  },
  orange: {
    checked: 'bg-gradient-to-br from-[#FF6B00] to-[#e05e00] border-[#ff8c3a] text-white',
    indeterminate: 'bg-[#FF6B00]/25 border-[#FF6B00] text-orange-300',
    focus: 'focus-visible:ring-[#FF6B00]/40',
    glow: 'shadow-[0_0_12px_rgba(255,107,0,0.4)]',
    hoverBorder: 'hover:border-[#FF6B00]/60',
    iconColor: '#ffffff',
  },
  emerald: {
    checked: 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-black',
    indeterminate: 'bg-emerald-500/25 border-emerald-400 text-emerald-300',
    focus: 'focus-visible:ring-emerald-400/40',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]',
    hoverBorder: 'hover:border-emerald-400/60',
    iconColor: '#000000',
  },
  purple: {
    checked: 'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-300 text-white',
    indeterminate: 'bg-purple-500/25 border-purple-400 text-purple-300',
    focus: 'focus-visible:ring-purple-400/40',
    glow: 'shadow-[0_0_12px_rgba(168,85,247,0.4)]',
    hoverBorder: 'hover:border-purple-400/60',
    iconColor: '#ffffff',
  },
};

const sizeStyles: Record<
  CheckboxSize,
  {
    box: string;
    svg: string;
    strokeWidth: number;
    text: string;
    gap: string;
    radius: string;
  }
> = {
  sm: {
    box: 'w-4 h-4 min-w-[16px] min-h-[16px]',
    svg: 'w-3 h-3',
    strokeWidth: 3.2,
    text: 'text-xs',
    gap: 'gap-2',
    radius: 'rounded-[5px]',
  },
  md: {
    box: 'w-5 h-5 min-w-[20px] min-h-[20px]',
    svg: 'w-3.5 h-3.5',
    strokeWidth: 3,
    text: 'text-sm',
    gap: 'gap-2.5',
    radius: 'rounded-[6px]',
  },
  lg: {
    box: 'w-6 h-6 min-w-[24px] min-h-[24px]',
    svg: 'w-4 h-4',
    strokeWidth: 2.8,
    text: 'text-base',
    gap: 'gap-3',
    radius: 'rounded-[7px]',
  },
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked = false,
      indeterminate = false,
      onChange,
      variant = 'primary',
      size = 'md',
      label,
      description,
      error,
      disabled = false,
      className = '',
      checkboxClassName = '',
      labelClassName = '',
      descriptionClassName = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || (label ? generatedId : undefined);

    const isChecked = Boolean(checked);
    const isIndeterminate = Boolean(indeterminate && !checked);
    const isActive = isChecked || isIndeterminate;

    const currentVariant = variantStyles[variant] || variantStyles.primary;
    const currentSize = sizeStyles[size] || sizeStyles.md;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (typeof onChange === 'function') {
        if (onChange.length === 1) {
          (onChange as (val: boolean) => void)(e.target.checked);
        } else {
          (onChange as React.ChangeEventHandler<HTMLInputElement>)(e);
        }
      }
    };

    return (
      <div
        className={`inline-flex items-start select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${className}`}
      >
        <label
          htmlFor={inputId}
          className={`group relative flex items-start ${currentSize.gap} ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {/* Скрытый нативный инпут для фокуса и доступности (a11y) */}
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={isChecked}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />

          {/* Анимированный визуальный контейнер чекбокса */}
          <motion.div
            whileTap={!disabled ? { scale: 0.88 } : undefined}
            animate={{
              scale: isActive ? [0.92, 1.05, 1] : 1,
            }}
            transition={{
              duration: 0.2,
              ease: 'easeOut',
            }}
            className={`relative flex items-center justify-center border transition-all duration-200 shrink-0 ${
              currentSize.box
            } ${currentSize.radius} ${
              isActive
                ? `${
                    isChecked ? currentVariant.checked : currentVariant.indeterminate
                  } ${currentVariant.glow}`
                : `bg-[#12141a] border-[#2b303d] ${
                    !disabled ? `${currentVariant.hoverBorder} hover:bg-[#181b23]` : ''
                  }`
            } ${
              error ? 'border-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.3)]' : ''
            } peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0d0e12] ${
              currentVariant.focus
            } ${checkboxClassName}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isChecked && (
                <svg
                  key="check"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`${currentSize.svg} pointer-events-none`}
                >
                  <motion.path
                    d="M4.5 12.5L9.5 17.5L19.5 6.5"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={currentSize.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 550,
                      damping: 32,
                      duration: 0.18,
                    }}
                  />
                </svg>
              )}

              {isIndeterminate && (
                <svg
                  key="minus"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`${currentSize.svg} pointer-events-none`}
                >
                  <motion.path
                    d="M5 12H19"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={currentSize.strokeWidth + 0.4}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 550,
                      damping: 32,
                      duration: 0.15,
                    }}
                  />
                </svg>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Текстовая метка (label) и описание (description) */}
          {(label || description || error) && (
            <div className="flex flex-col select-none pt-0.5">
              {label && (
                <span
                  className={`font-medium ${currentSize.text} leading-none transition-colors ${
                    disabled
                      ? 'text-gray-500'
                      : isChecked
                      ? 'text-white'
                      : 'text-gray-300 group-hover:text-white'
                  } ${labelClassName}`}
                >
                  {label}
                </span>
              )}
              {description && (
                <span
                  className={`text-[11px] leading-relaxed text-gray-400 mt-1 ${descriptionClassName}`}
                >
                  {description}
                </span>
              )}
              {error && (
                <span className="text-[11px] leading-tight text-red-400 font-medium mt-1">
                  {error}
                </span>
              )}
            </div>
          )}
        </label>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
