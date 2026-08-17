'use client';

import React from 'react';
import { Pipette, Check } from 'lucide-react';

const DEFAULT_COLORS = [
  '#0CB4E0', // Голубой
  '#10B981', // Зеленый
  '#FEB63D', // Оранжевый
  '#F43F5E', // Красный
  '#8B5CF6', // Фиолетовый
  '#FFFFFF', // Белый
  '#72787B', // Серый
  '#242930', // Темный/Черный
];

interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ label, value, onChange, className = '' }: ColorPickerProps) {
  // Проверяем, является ли выбранный цвет одним из стандартных
  const isDefaultColor = DEFAULT_COLORS.includes(value.toUpperCase());

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="text-gray-300 text-xs sm:text-sm font-medium select-none">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2 bg-[#1a1d24] border border-[#242930] rounded-lg p-1.5 w-fit">
        {/* Стандартные цвета */}
        <div className="flex items-center gap-1.5">
          {DEFAULT_COLORS.map((color) => {
            const isSelected = value.toUpperCase() === color.toUpperCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => onChange(color)}
                className="w-5.5 h-5.5 rounded-full border border-black/25 cursor-pointer transition-all flex items-center justify-center relative hover:scale-105 active:scale-95"
                style={{ backgroundColor: color }}
                title={color}
              >
                {isSelected && (
                  <Check 
                    size={11} 
                    className={color === '#FFFFFF' ? 'text-black' : 'text-white'}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Разделитель */}
        <div className="w-[1px] h-4 bg-[#242930]" />

        {/* Кнопка "Свой цвет" */}
        <div 
          className={`w-5.5 h-5.5 rounded-full border border-dashed transition-all flex items-center justify-center relative hover:scale-105 active:scale-95 bg-[#0d0e12]/60 overflow-hidden cursor-pointer ${
            !isDefaultColor 
              ? 'border-primary text-primary' 
              : 'border-[#242930] text-neutral-accent hover:text-white'
          }`}
          style={!isDefaultColor ? { backgroundColor: value } : {}}
          title={!isDefaultColor ? `Свой цвет: ${value}` : 'Выбрать свой цвет'}
        >
          {/* Если выбран кастомный цвет, показываем галочку, иначе иконку пипетки */}
          {!isDefaultColor ? (
            <Check 
              size={11} 
              className={value.toUpperCase() === '#FFFFFF' ? 'text-black' : 'text-white'}
            />
          ) : (
            <Pipette size={11} />
          )}
          
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
