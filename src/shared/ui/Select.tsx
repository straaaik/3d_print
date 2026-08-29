'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  badgeStyle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  description?: string;
}

export interface CustomSelectProps {
  label?: React.ReactNode;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  isSearchable?: boolean;
  dropdownPosition?: 'top' | 'bottom' | 'auto';
  variant?: 'default' | 'badge' | 'compact' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  dropdownWidth?: number | string;
  align?: 'left' | 'right';
  showChevron?: boolean;
  disabled?: boolean;
  isModified?: boolean;
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
  isModified = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; isTop: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const SelectedIcon = selectedOption?.icon;

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

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return 'h-7 min-h-[28px] px-2 py-1 text-[11px] rounded-lg';
      case 'sm':
        return 'h-8 min-h-[32px] px-2.5 py-1.5 text-xs rounded-xl';
      case 'lg':
        return 'h-11 min-h-[44px] px-4 py-2.5 text-sm rounded-2xl';
      default:
        return 'h-9 min-h-[36px] px-3 py-2 text-xs rounded-xl';
    }
  };

  const getVariantButtonStyles = () => {
    if (variant === 'badge' && selectedOption?.badgeStyle) {
      return `${selectedOption.badgeStyle} border font-semibold shadow-sm`;
    }

    if (variant === 'badge') {
      return 'bg-neutral-900 border border-white/15 hover:border-cyan-400 text-neutral-200 font-semibold';
    }

    if (variant === 'compact') {
      return 'bg-neutral-900 hover:bg-neutral-800 border border-white/15 hover:border-white/25 focus:border-cyan-400 text-neutral-200 font-medium shadow-sm';
    }

    if (variant === 'ghost') {
      return 'bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 text-neutral-300 hover:text-white';
    }

    return 'bg-neutral-900 border border-white/15 hover:border-white/25 focus:border-cyan-400 text-white shadow-sm';
  };

  return (
    <div ref={containerRef} className={`flex flex-col gap-1.5 relative font-mono text-xs ${variant === 'compact' || variant === 'badge' ? 'inline-block w-auto' : 'w-full'} ${className}`}>
      {label && (
        <span className="text-neutral-400 text-xs font-mono uppercase tracking-wider select-none">
          {label}
        </span>
      )}
      
      <div className="relative inline-block w-full">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }}
          className={`w-full flex items-center justify-between gap-1.5 focus:outline-none transition-all cursor-pointer select-none font-mono ${getSizeStyles()} ${getVariantButtonStyles()} ${
            isModified ? '!border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.15)] bg-amber-500/[0.03]' : ''
          } ${
            error ? '!border-rose-500' : ''
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${buttonClassName}`}
        >
          <div className="flex items-center gap-1.5 overflow-hidden min-w-0 flex-1">
            {selectedOption?.color && (
              <div 
                className="w-2.5 h-2.5 rounded-full border border-black/20 shadow-inner shrink-0"
                style={{ backgroundColor: selectedOption.color }}
              />
            )}
            
            {SelectedIcon && (
              <SelectedIcon className={`w-3.5 h-3.5 shrink-0 ${selectedOption?.iconColor || (variant === 'badge' ? '' : 'text-cyan-400')}`} />
            )}
            
            <span className="truncate text-left font-mono">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          {showChevron && (
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.15 }}
              className="text-neutral-400 hover:text-white shrink-0 flex items-center ml-0.5"
            >
              <ChevronDown size={size === 'xs' ? 12 : 14} />
            </motion.div>
          )}
        </button>

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
                className={`bg-neutral-950 border border-white/15 rounded-xl shadow-2xl max-h-[80vh] overflow-x-hidden overflow-y-auto p-1 focus:outline-none flex flex-col backdrop-blur-2xl custom-scrollbar font-mono text-xs ${dropdownClassName}`}
              >
                {isSearchable && (
                  <div className="p-1 border-b border-white/10 mb-1 sticky top-0 bg-neutral-950 z-10 flex items-center gap-1.5">
                    <div className="relative w-full flex items-center">
                      <Search size={12} className="absolute left-2.5 text-neutral-500" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/15 focus:border-cyan-400 focus:outline-none rounded-lg px-2 py-1 pl-7 text-xs text-white placeholder-neutral-500 font-mono"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                <div className="overflow-x-hidden overflow-y-auto flex-1 max-h-[75vh] space-y-0.5 custom-scrollbar">
                  {filteredOptions.length === 0 ? (
                    <li className="px-3 py-2 text-neutral-500 text-xs select-none text-center font-mono">
                      [ Ничего не найдено ]
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
                          className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors select-none whitespace-nowrap gap-2 font-mono ${
                            isSelected
                              ? (opt.badgeStyle 
                                  ? `${opt.badgeStyle} font-bold border` 
                                  : 'bg-white/15 text-white font-bold border border-white/20 shadow-sm')
                              : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {opt.color && (
                              <div 
                                className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 shadow-inner" 
                                style={{ backgroundColor: opt.color }}
                              />
                            )}
                            
                            {OptionIcon && (
                              <OptionIcon className={`w-3.5 h-3.5 shrink-0 ${opt.iconColor || ''}`} />
                            )}

                            <div className="min-w-0 flex-1">
                              <span className="truncate block font-medium">{opt.label}</span>
                              {opt.description && (
                                <span className="text-[10px] text-neutral-500 block truncate font-normal">
                                  {opt.description}
                                </span>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
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

      {error && <span className="text-rose-400 text-xs font-mono mt-0.5">{error}</span>}
      {hint && !error && <span className="text-neutral-500 text-xs font-mono mt-0.5 leading-relaxed">{hint}</span>}
    </div>
  );
}
