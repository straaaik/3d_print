'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
  color?: string; // Необязательное свойство для показа круглого индикатора цвета
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
  isSearchable?: boolean; // Флаг поддержки поиска в списке
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
  isSearchable = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Находим активную опцию
  const selectedOption = options.find((opt) => opt.value === value);

  // Сброс строки поиска при закрытии/открытии списка
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Закрытие по клику вне контейнера
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Закрытие по нажатию клавиши Escape
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
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-[#1a1d24] border border-[#242930] hover:border-secondary focus:border-primary focus:outline-none rounded-lg px-3 py-1.5 text-white text-sm font-sans transition-colors cursor-pointer select-none ${
            error ? 'border-red-500 focus:border-red-500' : ''
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            {/* Круглый индикатор цвета, если он есть у выбранного филамента */}
            {selectedOption?.color && (
              <div 
                className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-inner shrink-0"
                style={{ backgroundColor: selectedOption.color }}
              />
            )}
            <span className="truncate text-left text-sm">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          {/* Анимированная стрелочка */}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-primary shrink-0 flex items-center"
          >
            <ChevronDown size={16} />
          </motion.div>
        </button>

        {/* Выпадающий список вариантов */}
        <AnimatePresence>
          {isOpen && (
            <motion.ul
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="absolute z-40 w-full mt-1 bg-[#16181d] border border-[#242930] rounded-lg shadow-2xl max-h-56 overflow-y-auto p-1 focus:outline-none flex flex-col"
            >
              {/* Поле ввода для поиска */}
              {isSearchable && (
                <div className="p-1 border-b border-[#242930]/40 mb-1 sticky top-0 bg-[#16181d] z-10 flex items-center gap-1.5 pr-2">
                  <div className="relative w-full flex items-center">
                    <Search size={12} className="absolute left-2.5 text-neutral-accent" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Поиск по названию..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#1a1d24] border border-[#242930] focus:border-primary focus:outline-none rounded px-2 py-1 pl-7 text-[11px] text-white placeholder-neutral-accent"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Элементы списка */}
              <div className="overflow-y-auto flex-1 max-h-44">
                {filteredOptions.length === 0 ? (
                  <li className="px-3 py-2 text-neutral-accent text-xs select-none text-center">
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
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#242930] rounded-md cursor-pointer transition-colors select-none ${
                          isSelected ? 'bg-primary/10 text-primary hover:bg-primary/20' : ''
                        }`}
                      >
                        {opt.color && (
                          <div 
                            className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: opt.color }}
                          />
                        )}
                        <span className="truncate">{opt.label}</span>
                      </li>
                    );
                  })
                )}
              </div>
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {error && <span className="text-red-500 text-xs mt-0.5">{error}</span>}
      {hint && !error && <span className="text-neutral-accent text-xs mt-0.5 leading-relaxed">{hint}</span>}
    </div>
  );
}
