'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface MeridianSelectOption {
  value: string;
  label: string;
  color?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badgeStyle?: string;
  subtext?: string;
}

export interface MeridianSelectProps {
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  value?: string;
  options: MeridianSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  isSearchable?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MeridianSelect({
  label,
  sublabel,
  value,
  options,
  onChange,
  placeholder = 'Выберите...',
  isSearchable = false,
  disabled = false,
  className = '',
}: MeridianSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = isSearchable
    ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className={`flex flex-col gap-1.5 w-full relative ${className}`} ref={containerRef}>
      {(label || sublabel) && (
        <div className="flex items-center justify-between gap-2 text-xs select-none">
          {label && <label className="font-semibold text-neutral-300">{label}</label>}
          {sublabel && <span className="text-neutral-400 font-mono text-[11px]">{sublabel}</span>}
        </div>
      )}

      {/* Кнопка-триггер селекта */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 sm:h-11 bg-neutral-900 border border-white/15 hover:border-white/30 rounded-xl px-3.5 flex items-center justify-between text-left duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-inner ${
          isOpen ? 'border-cyan-400 ring-1 ring-cyan-400/30' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedOption?.color && (
            <span
              className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-sm"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}

          {selectedOption?.icon && (
            <selectedOption.icon className="w-4 h-4 text-cyan-400 shrink-0" />
          )}

          <span className={`text-xs sm:text-sm truncate font-medium ${selectedOption ? 'text-white' : 'text-neutral-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-neutral-400 duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Выпадающий список в стиле Meridian Glass */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl bg-neutral-950/95 border border-white/15 p-1.5 shadow-2xl shadow-black/80 backdrop-blur-2xl max-h-64 overflow-y-auto scrollbar-none"
          >
            {isSearchable && (
              <div className="p-1.5 border-b border-white/10 mb-1 sticky top-0 bg-neutral-950/95 z-10">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Поиск..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                    className="w-full h-8 pl-8 pr-3 bg-neutral-900 border border-white/10 focus:border-cyan-400 focus:outline-none rounded-lg text-xs text-white placeholder-neutral-500 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-neutral-500 font-mono">
                  Ничего не найдено
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  const IconComp = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold'
                          : 'text-neutral-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {opt.color && (
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 shrink-0 shadow-sm"
                            style={{ backgroundColor: opt.color }}
                          />
                        )}
                        {IconComp && <IconComp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                        <span className="truncate">{opt.label}</span>
                      </div>

                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
