'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
  color?: string; // Необязательное свойство для показа круглого индикатора цвета
  badgeStyle?: string; // Кастомные стили бейджа
  icon?: React.ComponentType<{ className?: string }>; // Иконка опции
  iconColor?: string; // Цвет иконки
  description?: string; // Дополнительное описание опции
}

export interface CustomSelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  isSearchable?: boolean; // Флаг поддержки поиска в списке
  dropdownPosition?: 'top' | 'bottom' | 'auto'; // Направление выпадающего списка
  variant?: 'default' | 'badge' | 'compact' | 'ghost'; // Вариант отображения кнопки
  size?: 'xs' | 'sm' | 'md' | 'lg'; // Размер
  dropdownWidth?: number | string; // Ширина выпадающего меню
  align?: 'left' | 'right'; // Выравнивание меню относительно кнопки
  showChevron?: boolean;
  disabled?: boolean;
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  error,
  hint,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  isSearchable = false,
  dropdownPosition = 'auto',
  variant = 'default',
  size = 'md',
  dropdownWidth,
  align = 'left',
  showChevron = true,
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; isTop: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Находим активную опцию
  const selectedOption = options.find((opt) => opt.value === value);
  const SelectedIcon = selectedOption?.icon;

  // Динамический расчет фиксированных координат портала поверх всех контейнеров
  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let openTop = false;
      if (dropdownPosition === 'top') {
        openTop = true;
      } else if (dropdownPosition === 'auto' && spaceBelow < 260 && spaceAbove > spaceBelow) {
        openTop = true;
      }

      let targetWidth = typeof dropdownWidth === 'number' 
        ? dropdownWidth 
        : (dropdownWidth ? parseInt(String(dropdownWidth), 10) || rect.width : Math.max(rect.width, variant === 'compact' || variant === 'badge' ? 170 : 220));

      let left = rect.left;
      if (align === 'right') {
        left = rect.right - targetWidth;
      }

      if (typeof window !== 'undefined') {
        if (left + targetWidth > window.innerWidth - 12) {
          left = Math.max(12, window.innerWidth - targetWidth - 12);
        }
        if (left < 12) {
          left = 12;
        }
      }

      setCoords({
        top: openTop ? rect.top - 6 : rect.bottom + 6,
        left,
        width: targetWidth,
        isTop: openTop,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  // Сброс строки поиска при закрытии/открытии списка
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Закрытие по клику вне кнопки и портала
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Закрытие по клавише Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Фильтрация опций по поисковому запросу
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Стили кнопки в зависимости от варианта и размера
  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return 'h-7 min-h-[28px] px-2 py-1 text-[11px] rounded-lg';
      case 'sm':
        return 'h-8 min-h-[32px] px-2.5 py-1.5 text-xs rounded-xl';
      case 'lg':
        return 'h-11 min-h-[44px] px-4 py-2.5 text-sm sm:text-base rounded-2xl';
      default:
        return 'h-9 min-h-[36px] px-3 py-2 text-xs sm:text-sm rounded-xl';
    }
  };

  const getVariantButtonStyles = () => {
    if (variant === 'badge' && selectedOption?.badgeStyle) {
      return `${selectedOption.badgeStyle} border font-semibold shadow-sm`;
    }

    if (variant === 'badge') {
      return 'bg-[#0d0e12] border border-[#242930] hover:border-[#FF6B00]/50 text-gray-200 font-semibold';
    }

    if (variant === 'compact') {
      return 'bg-[#0d0e12] hover:bg-[#16181d] border border-[#242930] hover:border-gray-600 focus:border-[#FF6B00] text-gray-200 font-medium shadow-sm';
    }

    if (variant === 'ghost') {
      return 'bg-transparent hover:bg-[#16181d] border border-transparent hover:border-[#242930] text-gray-300 hover:text-white';
    }

    return 'bg-[#14161d] border border-[#242930] hover:border-[#FF6B00]/50 focus:border-[#FF6B00] text-white shadow-sm';
  };

  return (
    <div ref={containerRef} className={`flex flex-col gap-1.5 relative ${variant === 'compact' || variant === 'badge' ? 'inline-block w-auto' : 'w-full'} ${className}`}>
      {label && (
        <span className="text-gray-300 text-xs sm:text-sm font-medium select-none">
          {label}
        </span>
      )}
      
      <div className="relative inline-block w-full">
        {/* Кнопка открытия/закрытия списка */}
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }}
          className={`w-full flex items-center justify-between gap-1.5 focus:outline-none transition-all cursor-pointer select-none ${getSizeStyles()} ${getVariantButtonStyles()} ${
            error ? 'border-rose-500' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
        >
          <div className="flex items-center gap-1.5 overflow-hidden min-w-0 flex-1">
            {/* Круглый индикатор цвета */}
            {selectedOption?.color && (
              <div 
                className="w-2.5 h-2.5 rounded-full border border-black/20 shadow-inner shrink-0"
                style={{ backgroundColor: selectedOption.color }}
              />
            )}
            
            {/* Иконка выбранной опции */}
            {SelectedIcon && (
              <SelectedIcon className={`w-3.5 h-3.5 shrink-0 ${selectedOption?.iconColor || (variant === 'badge' ? '' : 'text-[#FF8800]')}`} />
            )}
            
            {/* Текст выбранной опции */}
            <span className="truncate text-left">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          {/* Анимированная стрелочка */}
          {showChevron && (
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.15 }}
              className="text-gray-400 hover:text-white shrink-0 flex items-center ml-0.5 opacity-70"
            >
              <ChevronDown size={size === 'xs' ? 12 : 14} />
            </motion.div>
          )}
        </button>

        {/* Портал выпадающего списка прямо в document.body поверх всей таблицы */}
        {isOpen && coords && typeof window !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.isTop ? 'auto' : coords.top,
              bottom: coords.isTop ? window.innerHeight - coords.top : 'auto',
              left: coords.left,
              width: coords.width,
              zIndex: 99999,
            }}
          >
            <AnimatePresence>
              <motion.ul
                initial={{ opacity: 0, y: coords.isTop ? 6 : -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: coords.isTop ? 6 : -6, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className={`bg-[#16181d] border border-[#242930] rounded-xl shadow-2xl shadow-black/80 max-h-[80vh] overflow-x-hidden overflow-y-auto p-1 focus:outline-none flex flex-col backdrop-blur-xl custom-scrollbar ${dropdownClassName}`}
              >
                {/* Поле ввода для поиска */}
                {isSearchable && (
                  <div className="p-1 border-b border-[#242930] mb-1 sticky top-0 bg-[#16181d] z-10 flex items-center gap-1.5">
                    <div className="relative w-full flex items-center">
                      <Search size={12} className="absolute left-2.5 text-[#9ca3af]" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0d0e12] border border-[#242930] focus:border-[#FF6B00] focus:outline-none rounded-lg px-2 py-1 pl-7 text-xs text-white placeholder-[#6b7280]"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* Элементы списка */}
                <div className="overflow-x-hidden overflow-y-auto flex-1 max-h-[75vh] space-y-0.5 custom-scrollbar">
                  {filteredOptions.length === 0 ? (
                    <li className="px-3 py-2 text-[#9ca3af] text-xs select-none text-center">
                      Ничего не найдено
                    </li>
                  ) : (
                    filteredOptions.map((opt) => {
                      const isSelected = opt.value === value;
                      const OptionIcon = opt.icon;

                      return (
                        <li
                          key={opt.value}
                          onClick={() => {
                            onChange(opt.value);
                            setIsOpen(false);
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors select-none whitespace-nowrap gap-2 ${
                            isSelected
                              ? (opt.badgeStyle 
                                  ? `${opt.badgeStyle} font-bold border` 
                                  : 'bg-[#FF6B00]/20 text-[#FF8800] font-bold border border-[#FF6B00]/30 shadow-sm')
                              : 'text-gray-300 hover:bg-[#242930] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Индикатор цвета */}
                            {opt.color && (
                              <div 
                                className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 shadow-inner" 
                                style={{ backgroundColor: opt.color }}
                              />
                            )}
                            
                            {/* Иконка опции */}
                            {OptionIcon && (
                              <OptionIcon className={`w-3.5 h-3.5 shrink-0 ${opt.iconColor || ''}`} />
                            )}

                            <div className="min-w-0 flex-1">
                              <span className="truncate block font-medium">{opt.label}</span>
                              {opt.description && (
                                <span className="text-[10px] text-gray-400 block truncate font-normal">
                                  {opt.description}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Галочка выбранного элемента */}
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#FF8800] shrink-0 ml-1" />
                          )}
                        </li>
                      );
                    })
                  )}
                </div>
              </motion.ul>
            </AnimatePresence>
          </div>,
          document.body
        )}
      </div>

      {error && <span className="text-rose-400 text-xs mt-0.5">{error}</span>}
      {hint && !error && <span className="text-gray-400 text-xs mt-0.5 leading-relaxed">{hint}</span>}
    </div>
  );
}
