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
}

interface CustomSelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  className?: string;
  buttonClassName?: string;
  isSearchable?: boolean; // Флаг поддержки поиска в списке
  dropdownPosition?: 'top' | 'bottom' | 'auto'; // Направление выпадающего списка
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
  isSearchable = false,
  dropdownPosition = 'auto',
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
      } else if (dropdownPosition === 'auto' && spaceBelow < 260 && spaceAbove > 260) {
        openTop = true;
      }

      setCoords({
        top: openTop ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 180),
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
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`w-full flex flex-col gap-1 relative ${className}`}>
      {label && (
        <span className="text-gray-300 text-xs sm:text-sm font-medium select-none">
          {label}
        </span>
      )}
      
      <div className="relative">
        {/* Кнопка открытия/закрытия списка */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-[#14161d] border border-[#242930] hover:border-[#FF6B00]/50 focus:outline-none rounded-xl px-2.5 py-1 text-white text-xs sm:text-sm font-sans transition-colors cursor-pointer select-none shadow-sm ${
            error ? 'border-red-500' : ''
          } ${buttonClassName}`}
        >
          <div className="flex items-center gap-2 overflow-hidden mr-1.5 min-w-0 flex-1">
            {/* Круглый индикатор цвета */}
            {selectedOption?.color && (
              <div 
                className="w-2.5 h-2.5 rounded-full border border-black/20 shadow-inner shrink-0"
                style={{ backgroundColor: selectedOption.color }}
              />
            )}
            
            {/* Бейдж выбранной опции */}
            {selectedOption?.badgeStyle ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold shadow-sm max-w-full h-7 ${selectedOption.badgeStyle}`}>
                {SelectedIcon && <SelectedIcon className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{selectedOption.label}</span>
              </span>
            ) : (
              <div className="flex items-center gap-1.5 text-left text-xs sm:text-sm truncate h-7">
                {SelectedIcon && <SelectedIcon className="w-3.5 h-3.5 text-[#FF8800] shrink-0" />}
                <span className="truncate">
                  {selectedOption ? selectedOption.label : placeholder}
                </span>
              </div>
            )}
          </div>

          {/* Анимированная стрелочка */}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-gray-400 hover:text-white shrink-0 flex items-center ml-1"
          >
            <ChevronDown size={14} />
          </motion.div>
        </button>

        {/* Портал выпадающего списка прямо в document.body поверх всей таблицы */}
        {isOpen && coords && typeof window !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
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
                className="bg-[#14161d]/95 backdrop-blur-xl border border-[#FF6B00]/30 rounded-xl shadow-2xl shadow-black/80 max-h-64 overflow-y-auto p-1.5 focus:outline-none flex flex-col min-w-[180px]"
              >
                {/* Поле ввода для поиска */}
                {isSearchable && (
                  <div className="p-1 border-b border-[#242930] mb-1.5 sticky top-0 bg-[#14161d] z-10 flex items-center gap-1.5">
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
                <div className="overflow-y-auto flex-1 max-h-52 space-y-0.5">
                  {filteredOptions.length === 0 ? (
                    <li className="px-3 py-2.5 text-[#9ca3af] text-xs select-none text-center">
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
                          className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'bg-[#FF6B00]/20 text-white font-semibold border border-[#FF6B00]/40'
                              : 'text-gray-300 hover:text-white hover:bg-[#242930]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                            {opt.color && (
                              <div 
                                className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: opt.color }}
                              />
                            )}
                            
                            {opt.badgeStyle ? (
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${opt.badgeStyle}`}>
                                {OptionIcon && <OptionIcon className="w-3.5 h-3.5 shrink-0" />}
                                <span className="truncate">{opt.label}</span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-2 truncate">
                                {OptionIcon && <OptionIcon className="w-3.5 h-3.5 text-[#FF8800] shrink-0" />}
                                <span className="truncate">{opt.label}</span>
                              </div>
                            )}
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

      {error && <span className="text-red-500 text-xs mt-0.5">{error}</span>}
      {hint && !error && <span className="text-neutral-accent text-xs mt-0.5 leading-relaxed">{hint}</span>}
    </div>
  );
}

