'use client';

import React, { useId, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CockpitDropdownOption {
  value: string;
  label: string;
  color?: string;
  badge?: string;
  subtext?: string;
  statusDotColor?: 'cyan' | 'green' | 'orange' | 'red' | 'gray';
  icon?: React.ComponentType<{ className?: string }>;
}

export interface CockpitDropdownProps {
  value?: string;
  onChange?: (value: string) => void;
  multiSelect?: boolean;
  values?: string[];
  onMultiChange?: (values: string[]) => void;
  options: CockpitDropdownOption[];
  placeholder?: string;
  footerText?: string;
  variant?: 'ghost' | 'card' | 'input' | 'pill' | 'filter';
  align?: 'left' | 'right';
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  dropdownWidth?: number | string;
  hideStatusDot?: boolean;
  ariaLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  showChevron?: boolean;
  usePortal?: boolean;
  portalZIndex?: number;
}

export function CockpitDropdown({
  value,
  onChange,
  multiSelect = false,
  values,
  onMultiChange,
  options,
  placeholder = 'ВЫБРАТЬ...',
  footerText,
  variant = 'input',
  align = 'left',
  label,
  sublabel,
  searchable,
  disabled = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  dropdownWidth,
  hideStatusDot = false,
  ariaLabel,
  icon: LeadingIcon,
  showChevron = true,
  usePortal = false,
  portalZIndex,
}: CockpitDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const listboxId = `cockpit-dropdown-${generatedId}`;

  const selectedOption = options.find((opt) => opt.value === value);
  const isSearchEnabled = searchable ?? options.length > 7;
  const filteredOptions = isSearchEnabled && search.trim()
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(search.toLowerCase()) ||
          (opt.badge && opt.badge.toLowerCase().includes(search.toLowerCase())) ||
          (opt.subtext && opt.subtext.toLowerCase().includes(search.toLowerCase()))
      )
    : options;
  const activeIndex = Math.min(Math.max(activeOptionIndex, 0), Math.max(filteredOptions.length - 1, 0));
  const activeOption = filteredOptions[activeIndex];
  const getOptionId = (option: CockpitDropdownOption) => `${listboxId}-option-${encodeURIComponent(option.value)}`;

  const openMenu = (preferredIndex?: number) => {
    if (disabled) return;
    if (containerRef.current) {
      setTargetRect(containerRef.current.getBoundingClientRect());
    }
    const selectedIndex = filteredOptions.findIndex((option) => isOptionSelected(option.value));
    setActiveOptionIndex(preferredIndex ?? (selectedIndex >= 0 ? selectedIndex : 0));
    setIsOpen(true);
  };

  const closeMenu = (returnFocus = false) => {
    setIsOpen(false);
    setSearch('');
    if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleToggle = () => {
    if (isOpen) closeMenu();
    else openMenu();
  };

  const isOptionSelected = (optValue: string) => {
    if (multiSelect) {
      if (optValue === 'all') {
        return !values || values.length === 0 || values.includes('all');
      }
      return Boolean(values && values.includes(optValue));
    }
    return optValue === value;
  };

  const getDisplayText = () => {
    if (multiSelect) {
      const activeVals = (values || []).filter((v) => v !== 'all');
      if (activeVals.length === 0) return placeholder || 'Все категории';
      if (activeVals.length === 1) {
        const opt = options.find((o) => o.value === activeVals[0]);
        return opt ? opt.label : activeVals[0];
      }
      return `Категории (${activeVals.length})`;
    }
    return selectedOption ? selectedOption.label : <span className="text-neutral-500">{placeholder}</span>;
  };

  const handleOptionClick = (optValue: string) => {
    if (multiSelect) {
      if (!onMultiChange) return;
      if (optValue === 'all') {
        onMultiChange(['all']);
      } else {
        const currentWithoutAll = (values || []).filter((v) => v !== 'all');
        let next: string[];
        if (currentWithoutAll.includes(optValue)) {
          next = currentWithoutAll.filter((v) => v !== optValue);
          if (next.length === 0) next = ['all'];
        } else {
          next = [...currentWithoutAll, optValue];
        }
        onMultiChange(next);
      }
    } else {
      onChange?.(optValue);
      closeMenu();
    }
  };

  const moveActiveOption = (direction: 1 | -1) => {
    if (filteredOptions.length === 0) return;
    setActiveOptionIndex((current) => (current + direction + filteredOptions.length) % filteredOptions.length);
  };

  const moveFocusFromTrigger = (direction: 1 | -1) => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === 'undefined') return;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const controls = Array.from(document.querySelectorAll<HTMLElement>(focusableSelector)).filter((control) => {
      const styles = window.getComputedStyle(control);
      return control.tabIndex >= 0 && styles.visibility !== 'hidden' && styles.display !== 'none' && control.getClientRects().length > 0;
    });
    const triggerIndex = controls.indexOf(trigger);
    const target = controls[triggerIndex + direction];
    const focusTarget = () => {
      if (document.activeElement === document.body) target?.focus();
    };
    target?.focus();
    queueMicrotask(focusTarget);
    window.setTimeout(focusTarget, 160);
  };

  const returnFocusToTrigger = () => {
    const focusTrigger = () => {
      if (document.activeElement === document.body) triggerRef.current?.focus();
    };
    triggerRef.current?.focus();
    queueMicrotask(focusTrigger);
    window.setTimeout(focusTrigger, 160);
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
      return;
    }
    if (event.key === 'Tab' && isOpen) {
      event.preventDefault();
      closeMenu();
      moveFocusFromTrigger(event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (isOpen) moveActiveOption(event.key === 'ArrowDown' ? 1 : -1);
      else openMenu(event.key === 'ArrowDown' ? 0 : Math.max(filteredOptions.length - 1, 0));
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (isOpen) setActiveOptionIndex(event.key === 'Home' ? 0 : Math.max(filteredOptions.length - 1, 0));
      else openMenu(event.key === 'Home' ? 0 : Math.max(filteredOptions.length - 1, 0));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen && activeOption) handleOptionClick(activeOption.value);
      else handleToggle();
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveOption(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActiveOptionIndex(event.key === 'Home' ? 0 : Math.max(filteredOptions.length - 1, 0));
      return;
    }
    if (event.key === 'Enter' && activeOption) {
      event.preventDefault();
      handleOptionClick(activeOption.value);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      closeMenu();
      if (event.shiftKey) returnFocusToTrigger();
      else moveFocusFromTrigger(1);
    }
  };

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        return;
      }
      if (dropdownMenuRef.current && dropdownMenuRef.current.contains(e.target as Node)) {
        return;
      }
      closeMenu();
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Закрытие по нажатию Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu(true);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Закрытие при скролле или изменении размера окна для портала
  useEffect(() => {
    if (!isOpen || !usePortal) return;
    const handleScrollOrResize = (e: Event) => {
      if (dropdownMenuRef.current && dropdownMenuRef.current.contains(e.target as Node)) return;
      closeMenu();
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, usePortal]);

  // Фокус на поиск при открытии
  useEffect(() => {
    if (!isOpen || !isSearchEnabled) return;
    const focusTimer = window.setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen, isSearchEnabled]);

  // Определение цвета точки статуса (чистые матовые цвета без неона)
  const getDotColorClass = (type?: string, isSelected?: boolean) => {
    if (type === 'green') return 'bg-emerald-400';
    if (type === 'orange') return 'bg-amber-400';
    if (type === 'red') return 'bg-rose-400';
    if (type === 'cyan' || (isSelected && type !== 'gray')) return 'bg-cyan-400';
    if (type === 'gray') return 'bg-neutral-500';
    return 'bg-neutral-500';
  };

  // Стили кнопок-триггеров в точной палитре интерфейса (neutral-950 / white/10)
  const getButtonStyles = () => {
    if (variant === 'ghost') {
      return `bg-neutral-950/80 hover:bg-neutral-900 text-white font-mono text-[11px] font-bold py-1.5 px-2.5 rounded-lg border border-white/15 hover:border-white/25 flex items-center justify-between gap-2 cursor-pointer select-none tracking-wider uppercase backdrop-blur-md shadow-sm ${
        isOpen ? 'border-white/30 ring-1 ring-white/10 bg-neutral-900 text-white' : ''
      }`;
    }

    if (variant === 'card') {
      return `bg-neutral-950/80 hover:bg-neutral-900 text-white font-mono text-[11px] font-bold py-1.5 px-2.5 rounded-lg border border-white/10 hover:border-white/20 flex items-center justify-between gap-2 cursor-pointer select-none max-w-full tracking-wider uppercase backdrop-blur-md shadow-sm ${
        isOpen ? 'border-white/30 ring-1 ring-white/10 bg-neutral-900 text-white' : ''
      }`;
    }

    if (variant === 'pill') {
      return `bg-neutral-950/80 hover:bg-neutral-900 border border-white/15 hover:border-white/25 text-white font-mono text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-between gap-2 cursor-pointer select-none tracking-wider uppercase backdrop-blur-md shadow-sm ${
        isOpen ? 'border-white/30 ring-1 ring-white/10 bg-neutral-900 text-white' : ''
      }`;
    }

    if (variant === 'filter') {
      const isFilterActive = multiSelect
        ? Boolean(values && values.length > 0 && !values.includes('all'))
        : Boolean(value && value !== 'all');
      return `w-full h-full rounded-lg px-3 text-xs font-mono flex items-center ${
        showChevron ? 'justify-between' : 'justify-center'
      } gap-2 cursor-pointer select-none tracking-wide ${
        isFilterActive || isOpen
          ? 'bg-neutral-800 border border-white/15 text-white shadow-sm'
          : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
      }`;
    }

    // Default: 'input'
    return `w-full h-9 bg-neutral-950/80 border border-white/15 hover:border-white/25 rounded-lg px-2.5 flex items-center justify-between gap-2 text-left font-mono text-xs text-white cursor-pointer select-none tracking-wider uppercase shadow-inner ${
      isOpen ? 'border-white/30 ring-1 ring-white/10 bg-neutral-900' : ''
    }`;
  };

  const hasStatusDot = !multiSelect && !hideStatusDot && !LeadingIcon && Boolean(selectedOption?.color || selectedOption?.statusDotColor);

  return (
    <div className={`relative inline-flex items-center ${variant === 'input' ? 'w-full' : ''} ${className}`} ref={containerRef}>
      {/* Метки поля ввода */}
      {(label || sublabel) && (
        <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider select-none mb-1">
          {label && <label className="font-bold text-neutral-300">{label}</label>}
          {sublabel && <span className="text-neutral-500 text-[9px]">{sublabel}</span>}
        </div>
      )}

      {/* КНОПКА ОТКРЫТИЯ ДРОПДАУНА */}
      <button
        ref={triggerRef}
        type="button"
        role={isSearchEnabled ? undefined : 'combobox'}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={!isSearchEnabled && isOpen && activeOption ? getOptionId(activeOption) : undefined}
        className={`${getButtonStyles()} ${buttonClassName} disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <div className={`flex items-center gap-2 min-w-0 ${showChevron ? 'flex-1 justify-start' : 'w-full justify-center'} overflow-hidden`}>
          {/* Иконка слева (если передана явно или задана в выбранной опции) */}
          {(LeadingIcon || selectedOption?.icon) && (
            (() => {
              const IconComp = LeadingIcon || selectedOption?.icon;
              return IconComp ? <IconComp className="w-3.5 h-3.5 shrink-0 text-neutral-400" /> : null;
            })()
          )}

          {/* Точка слева (ТОЛЬКО если задана и не multiSelect) */}
          {hasStatusDot && (
            selectedOption?.color ? (
              <span
                className="w-2 h-2 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: selectedOption.color }}
              />
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDotColorClass(selectedOption?.statusDotColor, true)}`} />
            )
          )}

          <span className="truncate font-mono text-xs text-neutral-200">
            {getDisplayText()}
          </span>

          {/* Рамочный бейдж параметра */}
          {!multiSelect && selectedOption?.badge && (
            <span className="px-1.5 py-0.2 rounded border border-white/15 text-neutral-300 text-[9px] font-mono shrink-0 bg-white/5">
              {selectedOption.badge}
            </span>
          )}
        </div>

        {showChevron && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-neutral-400 shrink-0 ml-1.5 ${
              isOpen ? 'rotate-180 text-white' : ''
            }`}
          />
        )}
      </button>

      {/* ВЫПАДАЮЩЕЕ МЕНЮ В СТИЛЕ ИНТЕРФЕЙСА (КОМПАКТНОЕ И БЕЗ НЕОНА) */}
      {(() => {
        const portalWidth = dropdownWidth || (targetRect ? targetRect.width : undefined);
        const portalHeight = 280;
        const spaceBelow = typeof window !== 'undefined' && targetRect ? window.innerHeight - targetRect.bottom : 300;
        const isPortalTop = spaceBelow < portalHeight && targetRect && targetRect.top > spaceBelow;
        const portalTop = targetRect ? (isPortalTop ? targetRect.top - portalHeight - 6 : targetRect.bottom + 6) : 0;
        let portalLeft = targetRect ? targetRect.left : 0;
        if (typeof window !== 'undefined' && targetRect) {
          const numWidth = typeof portalWidth === 'number' ? portalWidth : targetRect.width;
          if (portalLeft + numWidth > window.innerWidth - 16) {
            portalLeft = window.innerWidth - numWidth - 16;
          }
          if (portalLeft < 16) portalLeft = 16;
        }

        const menuContent = (
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={dropdownMenuRef}
                initial={{ opacity: 0, y: usePortal && isPortalTop ? -3 : 3, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: usePortal && isPortalTop ? -3 : 3, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                style={
                  usePortal && targetRect
                    ? {
                        position: 'fixed',
                        top: Math.max(12, portalTop),
                        left: portalLeft,
                        width: portalWidth || targetRect.width,
                        zIndex: portalZIndex ?? 99999,
                      }
                    : { width: dropdownWidth || undefined }
                }
                onClick={(e) => e.stopPropagation()}
                className={`${
                  usePortal
                    ? ''
                    : `absolute ${
                        variant === 'filter'
                          ? `${align === 'right' ? 'right-0 min-w-[210px] w-max max-w-[300px]' : '-left-1 -right-1 w-[calc(100%+8px)]'} top-full mt-2`
                          : `${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-full min-w-[165px]`
                      }`
                } z-50 rounded-xl bg-neutral-950 border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden flex flex-col font-mono select-none ${dropdownClassName}`}
              >
                {/* Поле поиска (если опций много) */}
                {isSearchEnabled && (
                  <div className="px-2 py-1.5 border-b border-white/10 bg-neutral-900/60 shrink-0">
                    <div className="relative flex items-center">
                      <Search className="w-3 h-3 text-neutral-500 absolute left-2 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        role="combobox"
                        aria-label={ariaLabel ? `Поиск в списке: ${ariaLabel}` : 'Поиск в списке вариантов'}
                        aria-autocomplete="list"
                        aria-expanded={isOpen}
                        aria-haspopup="listbox"
                        aria-controls={listboxId}
                        aria-activedescendant={activeOption ? getOptionId(activeOption) : undefined}
                        placeholder="ПОИСК..."
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setActiveOptionIndex(0);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full h-6 pl-6 pr-2 bg-neutral-950 border border-white/10 focus:border-white/25 focus:outline-none rounded-md text-[11px] text-white placeholder-neutral-500 font-mono uppercase tracking-wide"
                      />
                    </div>
                  </div>
                )}

                {/* СПИСОК ЭЛЕМЕНТОВ */}
                <div
                  id={listboxId}
                  role="listbox"
                  aria-label={ariaLabel ? `${ariaLabel}: варианты` : undefined}
                  aria-multiselectable={multiSelect || undefined}
                  className="divide-y divide-white/[0.04] max-h-60 overflow-y-auto scrollbar-none"
                >
                  {filteredOptions.map((opt, index) => {
                      const isSelected = isOptionSelected(opt.value);
                      const optionHasDot = !multiSelect && Boolean(opt.color || opt.statusDotColor);

                      return (
                        <button
                          key={opt.value}
                          id={getOptionId(opt)}
                          type="button"
                          role="option"
                          tabIndex={-1}
                          aria-selected={isSelected}
                          onClick={() => handleOptionClick(opt.value)}
                          onMouseEnter={() => setActiveOptionIndex(index)}
                          className={`relative w-full px-3 py-2 text-left flex items-center justify-between gap-2 cursor-pointer text-xs group ${
                            isSelected
                              ? 'bg-white/10 text-white font-semibold'
                              : index === activeIndex
                              ? 'bg-white/5 text-white'
                              : 'bg-transparent hover:bg-white/5 text-neutral-300 hover:text-white'
                          }`}
                        >
                          {/* Тонкая белая полоса слева у выбранного элемента в обычном режиме */}
                          {!multiSelect && isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white" />
                          )}

                          {/* Чекбокс слева в multiSelect режиме */}
                          {multiSelect && (
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-white text-neutral-950'
                                  : 'border border-white/25 bg-white/5 group-hover:border-white/40'
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                              )}
                            </div>
                          )}

                          {/* Левая часть: название и бейдж в рамочке */}
                          <div className="flex items-center gap-2 min-w-0 flex-1 pl-0.5">
                            {/* Бесцветная иконка опции (если есть) */}
                            {opt.icon && (
                              <opt.icon className="w-3.5 h-3.5 shrink-0 text-neutral-400 group-hover:text-white " />
                            )}

                            <span className="truncate text-xs font-mono leading-none">
                              {opt.label}
                            </span>

                            {/* Рамочный бейдж параметра */}
                            {opt.badge && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono shrink-0 border border-white/10 bg-white/5 text-neutral-400">
                                {opt.badge}
                              </span>
                            )}
                          </div>

                          {/* Правая часть: цветная точка статуса (ТОЛЬКО если задана) */}
                          {optionHasDot && (
                            <div className="shrink-0 flex items-center">
                              {opt.color ? (
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    isSelected ? 'ring-1 ring-white/40' : 'border border-white/20'
                                  }`}
                                  style={{ backgroundColor: opt.color }}
                                />
                              ) : (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDotColorClass(opt.statusDotColor, isSelected)}`}
                                />
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
                {filteredOptions.length === 0 && (
                  <p role="status" className="py-4 text-center text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
                    [ НИЧЕГО НЕ НАЙДЕНО ]
                  </p>
                )}

                {/* ПОДВАЛ МЕНЮ */}
                <div className="px-3 py-1.5 bg-neutral-950 border-t border-white/5 text-[9px] font-mono text-neutral-500 uppercase tracking-wider flex items-center justify-between shrink-0">
                  {multiSelect && values && values.length > 0 && !values.includes('all') ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMultiChange?.(['all']);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    >
                      [ СБРОСИТЬ ВСЕ ]
                    </button>
                  ) : (
                    <span>{footerText || `${options.length} ОПЦИЙ`}</span>
                  )}
                  <span className="text-neutral-600">KUMO CRM</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        );

        return usePortal && typeof window !== 'undefined'
          ? createPortal(menuContent, document.body)
          : menuContent;
      })()}
    </div>
  );
}
