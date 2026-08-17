'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
  color?: string; // Необязательное свойство для показа круглого индикатора цвета
  badgeStyle?: string; // Кастомные стили бейджа
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

  // Динамический расчет фиксированных координат портала поверх всех контейнеров
  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let openTop = false;
      if (dropdownPosition === 'top') {
        openTop = true;
      } else if (dropdownPosition === 'auto' && spaceBelow < 220 && spaceAbove > 220) {
        openTop = true;
      }

      setCoords({
        top: openTop ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 160),
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
          className={`w-full flex items-center justify-between bg-[#1a1d24] border border-[#242930] hover:border-secondary focus:border-primary focus:outline-none rounded-lg px-3 py-1.5 text-white text-sm font-sans transition-all cursor-pointer select-none ${
            error ? 'border-red-500 focus:border-red-500' : ''
          } ${buttonClassName}`}
        >
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            {/* Круглый индикатор цвета */}
            {selectedOption?.color && (
              <div 
                className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-inner shrink-0"
                style={{ backgroundColor: selectedOption.color }}
              />
            )}
            
            {/* Бейдж выбранной опции */}
            {selectedOption?.badgeStyle ? (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedOption.badgeStyle}`}>
                {selectedOption.label}
              </span>
            ) : (
              <span className="truncate text-left text-sm">
                {selectedOption ? selectedOption.label : placeholder}
              </span>
            )}
          </div>

          {/* Анимированная стрелочка */}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-[#9ca3af] shrink-0 flex items-center"
          >
            <ChevronDown size={15} />
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
                initial={{ opacity: 0, y: coords.isTop ? 4 : -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: coords.isTop ? 4 : -4, scale: 0.98 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="bg-[#16181d] border border-[#242930] rounded-xl shadow-2xl max-h-60 overflow-y-auto p-1.5 focus:outline-none flex flex-col min-w-[160px]"
              >
                {/* Поле ввода для поиска */}
                {isSearchable && (
                  <div className="p-1 border-b border-[#242930]/40 mb-1 sticky top-0 bg-[#16181d] z-10 flex items-center gap-1.5 pr-2">
                    <div className="relative w-full flex items-center">
                      <Search size={12} className="absolute left-2.5 text-[#9ca3af]" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1a1d24] border border-[#242930] focus:border-primary focus:outline-none rounded px-2 py-1 pl-7 text-xs text-white placeholder-[#6b7280]"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* Элементы списка */}
                <div className="overflow-y-auto flex-1 max-h-48 space-y-1">
                  {filteredOptions.length === 0 ? (
                    <li className="px-3 py-2 text-[#9ca3af] text-xs select-none text-center">
                      Ничего не найдено
                    </li>
                  ) : (
                    filteredOptions.map((opt) => {
                      const isSelected = opt.value === value;
                      return (
                        <li
                          key={opt.value}
                          onClick={() => {
                            onChange(opt.value);
                            setIsOpen(false);
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#242930] rounded-lg cursor-pointer transition-colors select-none ${
                            isSelected ? 'bg-[#242930] font-semibold text-white' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {opt.color && (
                              <div 
                                className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: opt.color }}
                              />
                            )}
                            {opt.badgeStyle ? (
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${opt.badgeStyle}`}>
                                {opt.label}
                              </span>
                            ) : (
                              <span className="truncate">{opt.label}</span>
                            )}
                          </div>
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
