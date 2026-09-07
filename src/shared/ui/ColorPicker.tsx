'use client';

import React, { useRef } from 'react';
import { Pipette, Check } from 'lucide-react';
import { Tooltip } from './Tooltip';

export const DEFAULT_COLORS = [
  '#FFFFFF', // Белый
  '#000000', // Черный
  '#9CA3AF', // Серый
  '#EF4444', // Красный
  '#3B82F6', // Синий
  '#10B981', // Зеленый
  '#F59E0B', // Желтый/Оранжевый
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

export function ColorPicker({
  value = '#FFFFFF',
  onChange,
  label,
  className = '',
}: ColorPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDefaultColor = DEFAULT_COLORS.some(
    (c) => c.toUpperCase() === value.toUpperCase()
  );

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-[11px] font-mono text-neutral-400">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        {/* Палитра быстрых цветов */}
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/10 rounded-lg">
        {/* Стандартные цвета */}
        <div className="flex items-center gap-1.5">
          {DEFAULT_COLORS.map((color) => {
            const isSelected = value.toUpperCase() === color.toUpperCase();
            return (
              <Tooltip key={color} content={color}>
                <button
                  type="button"
                  onClick={() => onChange(color)}
                  className="w-5.5 h-5.5 rounded-full border border-black/30 cursor-pointer flex items-center justify-center relative shadow-inner"
                  style={{ backgroundColor: color }}
                >
                  {isSelected && (
                    <Check
                      size={11}
                      className={color === '#FFFFFF' ? 'text-black font-bold' : 'text-white font-bold'}
                    />
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Разделитель */}
        <div className="w-[1px] h-4 bg-white/10" />

        {/* Кнопка "Свой цвет" */}
        <Tooltip content={!isDefaultColor ? `Свой цвет: ${value}` : 'Выбрать свой цвет'}>
          <div
            className={`w-5.5 h-5.5 rounded-full border border-dashed flex items-center justify-center relative bg-neutral-950 overflow-hidden cursor-pointer ${
              !isDefaultColor
                ? 'border-cyan-400 text-cyan-400'
                : 'border-white/20 text-neutral-400 hover:text-white'
            }`}
            style={!isDefaultColor ? { backgroundColor: value } : {}}
          >
            {!isDefaultColor ? (
              <Check
                size={11}
                className={value.toUpperCase() === '#FFFFFF' ? 'text-black font-bold' : 'text-white font-bold'}
              />
            ) : (
              <Pipette size={11} />
            )}

            {/* Скрытый нативный input color */}
            <input
              ref={fileInputRef}
              type="color"
              value={value.startsWith('#') ? value : '#FFFFFF'}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>
        </Tooltip>
      </div>
    </div>
  </div>
);
}
