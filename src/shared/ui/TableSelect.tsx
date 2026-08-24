'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TableSelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string; // Цветовой акцент / индикатор
  badgeStyle?: string; // Кастомные стили бейджа (фон, цвет текста, бордер)
  description?: string; // Вспомогательное описание
  disabled?: boolean;
}

export interface TableSelectProps {
  options: TableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  headerTitle?: string;
  className?: string;
  buttonClassName?: string;
  align?: 'left' | 'right' | 'auto';
  dropdownPosition?: 'top' | 'bottom' | 'auto';
  isSearchable?: boolean;
  disabled?: boolean;
  showChevron?: boolean;
}

export function TableSelect({
  options,
  value,
  onChange,
  placeholder = 'Выбрать...',
  headerTitle,
  className = '',
  buttonClassName = '',
  align = 'auto',
  dropdownPosition = 'auto',
  isSearchable = false,
  disabled = false,
  showChevron = true,
}: TableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    isTop: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Находим активную опцию
  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value) || null;
  }, [options, value]);

  const SelectedIcon = selectedOption?.icon;

  // Динамический расчет фиксированных координат портала поверх всей страницы
  const updateCoords = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.left;

      let openTop = false;
      if (dropdownPosition === 'top') {
        openTop = true;
      } else if (dropdownPosition === 'auto' && spaceBelow < 280 && spaceAbove > 280) {
        openTop = true;
      }

      const dropdownWidth = Math.max(rect.width, 210);
      let calculatedLeft = rect.left;

      if (align === 'right' || (align === 'auto' && spaceRight < dropdownWidth + 10)) {
        calculatedLeft = rect.right - dropdownWidth;
      }

      // Ограничение границами экрана
      calculatedLeft = Math.max(8, Math.min(calculatedLeft, window.innerWidth - dropdownWidth - 8));

      setCoords({
        top: openTop ? rect.top - 6 : rect.bottom + 6,
        left: calculatedLeft,
        width: dropdownWidth,
        isTop: openTop,
      });
    }
  }, [dropdownPosition, align]);

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
  }, [isOpen, updateCoords]);

  // Закрытие по клику вне кнопки и портала
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Сброс строки поиска при открытии / закрытии
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
    } else if (isSearchable || options.length >= 7) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isSearchable, options.length]);

  // Фильтрация опций по поисковому запросу
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query) ||
        (opt.description && opt.description.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  // Навигация с клавиатуры
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const targetOpt = filteredOptions[highlightedIndex];
        if (!targetOpt.disabled) {
          onChange(targetOpt.value);
          setIsOpen(false);
          buttonRef.current?.focus();
        }
      }
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const shouldShowSearch = isSearchable || options.length >= 7;

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Кнопка триггер в ячейке таблицы */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`group w-full h-[28px] px-2.5 py-1 rounded-lg flex items-center justify-between gap-1.5 transition-all text-xs sm:text-[13px] font-semibold cursor-pointer select-none outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.98]'
        } ${
          isOpen ? 'ring-2 ring-[#FF6B00]/40 border-[#FF6B00]/60' : ''
        } ${
          selectedOption?.badgeStyle
            ? selectedOption.badgeStyle
            : 'bg-[#14161d] border border-[#242930] text-gray-200 hover:border-[#FF6B00]/40'
        } ${buttonClassName}`}
        title={selectedOption ? `Текущее: ${selectedOption.label}` : placeholder}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          {selectedOption?.color && !selectedOption.badgeStyle && (
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}

          {SelectedIcon && (
            <SelectedIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity" />
          )}

          <span className="truncate text-left text-xs sm:text-[13px] font-semibold tracking-tight">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        {showChevron && (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="text-current opacity-50 group-hover:opacity-100 shrink-0 ml-0.5 flex items-center"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
        )}
      </button>

      {/* Портал выпадающего меню прямо в document.body поверх всей таблицы */}
      {isOpen && coords && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: coords.isTop ? 'auto' : coords.top,
            bottom: coords.isTop ? window.innerHeight - coords.top : 'auto',
            left: coords.left,
            width: Math.max(coords.width, 175),
            zIndex: 99999,
          }}
        >
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: coords.isTop ? 6 : -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: coords.isTop ? 6 : -6 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#13151c]/95 backdrop-blur-2xl border border-[#2e3444] rounded-xl shadow-2xl shadow-black/90 p-1.5 flex flex-col focus:outline-none select-none text-xs sm:text-[13px]"
            >
              {/* Заголовок меню (если задан) */}
              {headerTitle && (
                <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#242930]/80 mb-1 flex items-center justify-between">
                  <span>{headerTitle}</span>
                  <span className="text-[10px] text-gray-500 font-mono font-normal">
                    {options.length} вар.
                  </span>
                </div>
              )}

              {/* Строка быстрого поиска (если вариантов много) */}
              {shouldShowSearch && (
                <div className="relative mb-1 px-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-[#0b0d12] border border-[#242930] focus:border-[#FF6B00] focus:outline-none rounded-lg px-2.5 py-1.5 pl-8 text-xs sm:text-[13px] text-white placeholder-gray-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Список вариантов */}
              <div className="overflow-y-auto max-h-64 space-y-0.5 pr-0.5">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-3 text-center text-xs text-gray-400 select-none">
                    Ничего не найдено
                  </div>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const isSelected = opt.value === value;
                    const isHighlighted = idx === highlightedIndex;
                    const OptIcon = opt.icon;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => handleSelect(opt.value)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold cursor-pointer transition-all text-left ${
                          isSelected
                            ? 'bg-[#FF6B00]/15 text-white border border-[#FF6B00]/30 shadow-sm shadow-[#FF6B00]/10'
                            : isHighlighted
                            ? 'bg-[#1f232e] text-white'
                            : 'text-gray-300 hover:text-white hover:bg-[#1a1d25]'
                        } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                          {/* Индикатор или цвет бейджа */}
                          {opt.badgeStyle ? (
                            <span
                              className={`inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold border shrink-0 ${opt.badgeStyle}`}
                            >
                              {OptIcon && <OptIcon className="w-3.5 h-3.5 shrink-0" />}
                              <span className="truncate">{opt.label}</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0 truncate">
                              {opt.color && (
                                <div
                                  className="w-2.5 h-2.5 rounded-full border border-black/30 shrink-0 shadow-sm"
                                  style={{ backgroundColor: opt.color }}
                                />
                              )}
                              {OptIcon && (
                                <OptIcon className="w-4 h-4 text-[#FF8800] shrink-0" />
                              )}
                              <span className="truncate">{opt.label}</span>
                            </div>
                          )}

                          {opt.description && (
                            <span className="text-[11px] text-gray-500 font-normal truncate hidden sm:inline">
                              {opt.description}
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-[#FF8800] shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
}
