'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Box, Sparkles } from 'lucide-react';
import { normalizeHex } from '../lib/colorUtils';
import { ColorPickerTrigger } from './color-picker/ColorPickerTrigger';
import { IsometricSpoolPicker } from './color-picker/IsometricSpoolPicker';
import { CockpitMatrixPicker } from './color-picker/CockpitMatrixPicker';

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  inline?: boolean;
  /** Вариант по умолчанию: 'spool' (3D-катушка) или 'matrix' (Матрица HUD) */
  defaultVariant?: 'spool' | 'matrix';
  /** Выравнивание всплывающего окна: 'left' (по умолчанию) или 'right' */
  align?: 'left' | 'right';
}

export function ColorPicker({
  value = '#0CB4E0',
  onChange,
  label,
  className = '',
  disabled = false,
  inline = false,
  defaultVariant,
  align = 'left',
}: ColorPickerProps) {
  const [variant, setVariant] = useState<'spool' | 'matrix'>('spool');

  useEffect(() => {
    if (defaultVariant) {
      setVariant(defaultVariant);
      return;
    }
    const saved = localStorage.getItem('3d_labs_color_picker_mode');
    if (saved === 'matrix' || saved === 'spool') {
      setVariant(saved);
    }
  }, [defaultVariant]);

  const handleVariantChange = (newVariant: 'spool' | 'matrix') => {
    setVariant(newVariant);
    localStorage.setItem('3d_labs_color_picker_mode', newVariant);
  };

  const hex = normalizeHex(value);

  const pickerContent = (
    <div className="flex flex-col gap-2.5">
      {/* Верхний тактильный тумблер переключения режимов */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-mono text-[10px]">
        <span className="text-neutral-500 uppercase tracking-wider">РЕЖИМ ПИСТЕРА:</span>
        <div className="flex items-center gap-1 bg-neutral-900 border border-white/10 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => handleVariantChange('spool')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              variant === 'spool'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Box size={11} />
            <span>[ 3D КАТУШКА ]</span>
          </button>

          <button
            type="button"
            onClick={() => handleVariantChange('matrix')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              variant === 'matrix'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles size={11} />
            <span>[ МАТРИЦА HUD ]</span>
          </button>
        </div>
      </div>

      {/* Активный виджет */}
      <div>
        {variant === 'spool' ? (
          <IsometricSpoolPicker
            inline
            value={hex}
            onChange={onChange}
            disabled={disabled}
          />
        ) : (
          <CockpitMatrixPicker
            inline
            value={hex}
            onChange={onChange}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className={className}>
        {label && (
          <span className="block mb-1.5 text-[11px] font-mono text-neutral-400 select-none">
            {label}
          </span>
        )}
        {pickerContent}
      </div>
    );
  }

  return (
    <ColorPickerTrigger
      value={hex}
      label={label}
      className={className}
      disabled={disabled}
      align={align}
    >
      {() => pickerContent}
    </ColorPickerTrigger>
  );
}

// Экспорт отдельных вариантов для прямого использования
export { IsometricSpoolPicker, CockpitMatrixPicker };
