'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, MoreHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ALL_STATUSES, CLIENT_CONFIG, STATUS_CONFIG, type OrderStatus } from '../types';

export function HandDrawnUnderline({
  isSelected,
  color = 'white',
}: {
  isSelected: boolean;
  color?: string;
}) {
  return (
    <AnimatePresence>
      {isSelected && (
        <motion.svg
          className="absolute -bottom-1 left-0 w-full h-[6px] pointer-events-none overflow-visible z-10"
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.path
            d="M 1,4 C 25,6.5 75,2.5 99,5"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              visible: {
                pathLength: 1,
                opacity: 1,
                transition: {
                  pathLength: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
                  opacity: { duration: 0.08 },
                },
              },
              exit: {
                pathLength: 0,
                opacity: 0,
                transition: {
                  pathLength: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 0.08 },
                },
              },
            }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}

export function HandDrawnStrikethrough({ isCrossedOut }: { isCrossedOut: boolean }) {
  return (
    <AnimatePresence>
      {isCrossedOut && (
        <motion.svg
          className="absolute top-1/2 -left-1 w-[calc(100%+8px)] h-[8px] -translate-y-1/2 pointer-events-none overflow-visible z-10"
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.path
            d="M 1,4.5 C 18,3 42,5.8 68,3.8 C 82,2.5 94,4.8 99,4"
            fill="none"
            stroke="#71717a"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              visible: {
                pathLength: 1,
                opacity: 0.9,
                transition: {
                  pathLength: { duration: 0.22, ease: [0.25, 1, 0.5, 1] },
                  opacity: { duration: 0.08 },
                },
              },
              exit: {
                pathLength: 0,
                opacity: 0,
                transition: {
                  pathLength: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 0.08 },
                },
              },
            }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}

export function PhysicsQuantitySlider({
  value,
  onChange,
  min = 1,
  max = 100,
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const clampedVal = Math.min(Math.max(value, min), max);
  const percent = ((clampedVal - min) / (max - min)) * 100;

  const updateFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const newVal = Math.round(min + pos * (max - min));
    onChange(newVal);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updateFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div className="pt-2 max-w-lg space-y-2 select-none font-mono">
      {/* 1. Интерактивная полоска без заполнения (только трек и бегунок) */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-6 flex items-center cursor-pointer group py-2 touch-none"
      >
        <div className="w-full h-1 bg-[#27272c] group-hover:bg-[#383840] rounded-full " />

        <div
          style={{ left: `${percent}%` }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 pointer-events-none"
        >
          <motion.div
            initial={false}
            animate={{ scale: isDragging ? 1.25 : 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.45 }}
            className="w-full h-full rounded-full bg-white flex items-center justify-center"
          >
            <div className="w-1.5 h-1.5 bg-[#121214] rounded-full" />
          </motion.div>
        </div>
      </div>

      {/* 2. Готовые пресеты тиража */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {[1, 2, 3, 5, 10, 20, 50, 100].map(qty => {
          const isSelected = value === qty;
          return (
            <button
              key={qty}
              type="button"
              onClick={() => onChange(qty)}
              className={`py-0.5 text-xs font-mono cursor-pointer ${
                isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
              }`}
            >
              <span className="relative inline-block">
                <span>{qty} шт</span>
                <HandDrawnUnderline isSelected={isSelected} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NativeVerticalStatusList({
  value,
  onChange,
}: {
  value: OrderStatus;
  onChange: (val: OrderStatus) => void;
}) {
  return (
    <div className="space-y-2 select-none font-mono">
      <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
        СТАТУС ЗАКАЗА
      </div>
      <div className="flex flex-col items-start gap-2 pt-0.5">
        {ALL_STATUSES.map(st => {
          const isSelected = st === value;
          const cfg = STATUS_CONFIG[st];
          const Icon = cfg?.icon || Clock;
          const iconColor =
            st === 'Готово'
              ? 'text-[#34d399]'
              : st === 'Не в работе'
              ? 'text-[#f87171]'
              : st === 'Моделирование' || st === 'Ждет покраски'
              ? 'text-[#fbbf24]'
              : 'text-[#38bdf8]';

          return (
            <button
              key={st}
              type="button"
              onClick={() => onChange(st)}
              className={`group flex items-center gap-2.5 py-1 text-sm font-mono cursor-pointer ${
                isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-[#d4d4d8]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : iconColor}`} />
              <span className="relative inline-block">
                <span>{st}</span>
                <HandDrawnUnderline isSelected={isSelected} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NativeVerticalChannelList({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const channels = ['Авито', 'Telegram', 'WhatsApp', 'VK', 'Сайт', 'Рекомендация', 'Другое'];
  return (
    <div className="space-y-2 select-none font-mono">
      <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
        ИСТОЧНИК / КАНАЛ СВЯЗИ
      </div>
      <div className="flex flex-col items-start gap-2 pt-0.5">
        {channels.map(ch => {
          const isSelected = ch === (value || 'Авито');
          const cfg = CLIENT_CONFIG[ch] || CLIENT_CONFIG['Другое'];
          const Icon = cfg?.icon || MoreHorizontal;

          return (
            <button
              key={ch}
              type="button"
              onClick={() => onChange(ch)}
              className={`group flex items-center gap-2.5 py-1 text-sm font-mono cursor-pointer ${
                isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-[#d4d4d8]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[#71717a] group-hover:text-[#d4d4d8]'}`} />
              <span className="relative inline-block">
                <span>{ch}</span>
                <HandDrawnUnderline isSelected={isSelected} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NativeEmbeddedCalendar({
  value,
  onChange,
  title = 'СРОК СДАЧИ (ДЕДЛАЙН)',
  emptyLabel = 'без дедлайна',
  valuePrefix = 'дедлайн:',
  presetsMode = 'future',
}: {
  value: string;
  onChange: (val: string) => void;
  title?: string;
  emptyLabel?: string;
  valuePrefix?: string;
  presetsMode?: 'future' | 'past';
}) {
  const selectedDate = useMemo(() => {
    if (!value) return new Date();
    const parts = value.split('.');
    if (parts.length >= 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  useEffect(() => {
    if (value) {
      const parts = value.split('.');
      if (parts.length >= 3) {
        queueMicrotask(() => {
          setViewYear(Number(parts[2]));
          setViewMonth(Number(parts[1]) - 1);
        });
      }
    }
  }, [value]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const getOffsetDateStr = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const yrStr = d.getFullYear();
    return `${dayStr}.${monthStr}.${yrStr}`;
  };

  const handleSelectDay = (day: number) => {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const yrStr = viewYear;
    onChange(`${dayStr}.${monthStr}.${yrStr}`);
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const presets =
    presetsMode === 'future'
      ? [
          { label: 'Завтра', dateStr: getOffsetDateStr(1) },
          { label: '+2 дня', dateStr: getOffsetDateStr(2) },
          { label: '+7 дней', dateStr: getOffsetDateStr(7) },
        ]
      : [
          { label: 'Сегодня', dateStr: getOffsetDateStr(0) },
          { label: 'Вчера', dateStr: getOffsetDateStr(-1) },
          { label: '-3 дня', dateStr: getOffsetDateStr(-3) },
        ];

  return (
    <div className="space-y-2.5 select-none font-mono">
      <div className="flex items-center justify-between text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
        <span>{title}</span>
        <span className={value ? 'text-white lowercase font-normal text-xs' : 'text-[#71717a] lowercase font-normal text-xs'}>
          {value ? `${valuePrefix} ${value}` : emptyLabel}
        </span>
      </div>

      {/* 2. Быстрые пресеты даты с подчеркиванием как в статусе заказа */}
      <div className="flex items-center gap-3 flex-wrap">
        {presets.map(p => {
          const isSelected = value === p.dateStr;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.dateStr)}
              className={`py-0.5 text-xs font-mono cursor-pointer ${
                isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
              }`}
            >
              <span className="relative inline-block">
                <span>{p.label}</span>
                <HandDrawnUnderline isSelected={isSelected} />
              </span>
            </button>
          );
        })}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="py-0.5 text-xs font-mono cursor-pointer text-[#f87171] hover:text-white"
          >
            <span>[сброс]</span>
          </button>
        )}
      </div>

      {/* 3. Полностью нативный бесшовный календарь увеличенного размера */}
      <div className="space-y-2 w-full max-w-[340px] pt-1">
        {/* Навигация по месяцам */}
        <div className="flex items-center justify-between text-sm py-1">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <span>{monthNames[viewMonth]} {viewYear}</span>
            <div className="flex items-center gap-1 ml-1.5">
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear(viewYear - 1);
                  } else {
                    setViewMonth(viewMonth - 1);
                  }
                }}
                className="w-5 h-5 rounded text-[#71717a] hover:text-white flex items-center justify-center cursor-pointer text-sm "
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear(viewYear + 1);
                  } else {
                    setViewMonth(viewMonth + 1);
                  }
                }}
                className="w-5 h-5 rounded text-[#71717a] hover:text-white flex items-center justify-center cursor-pointer text-sm "
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-[#71717a] font-medium">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <div key={d} className="w-8 sm:w-9 text-center">{d}</div>
          ))}
        </div>

        {/* Сетка дней (выбранное число анимированно подчеркивается) */}
        <div className="grid grid-cols-7 gap-1.5 text-sm">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="w-8 h-8 sm:w-9 sm:h-9" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isCurrentSelected =
              Boolean(value) &&
              selectedDate.getDate() === dayNum &&
              selectedDate.getMonth() === viewMonth &&
              selectedDate.getFullYear() === viewYear;

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => handleSelectDay(dayNum)}
                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center font-mono text-xs sm:text-sm cursor-pointer ${
                  isCurrentSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                }`}
              >
                <span className="relative inline-block">
                  <span>{dayNum}</span>
                  <HandDrawnUnderline isSelected={isCurrentSelected} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function NativeDualDateCalendar({
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
}: {
  startDate: string;
  endDate: string;
  onChangeStartDate: (val: string) => void;
  onChangeEndDate: (val: string) => void;
}) {
  const [activeDateType, setActiveDateType] = useState<'start' | 'end'>(() => {
    return !startDate ? 'start' : 'end';
  });

  const parseDate = (val?: string): Date | null => {
    if (!val) return null;
    const parts = val.split('.');
    if (parts.length >= 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(y, m, d);
      }
    }
    return null;
  };

  const initialViewDate = useMemo(() => {
    const target = activeDateType === 'start' ? startDate : endDate;
    return parseDate(target) || parseDate(startDate) || new Date();
  }, [activeDateType, startDate, endDate]);

  const [viewYear, setViewYear] = useState(initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const trailingEmpty = 42 - firstDayOfWeek - daysInMonth;

  const getOffsetDateStr = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const yrStr = d.getFullYear();
    return `${dayStr}.${monthStr}.${yrStr}`;
  };

  const handleSelectDay = (day: number) => {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const yrStr = viewYear;
    const formatted = `${dayStr}.${monthStr}.${yrStr}`;

    if (activeDateType === 'start') {
      onChangeStartDate(formatted);
    } else {
      onChangeEndDate(formatted);
    }
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const startPresets = [
    { label: 'Сегодня', dateStr: getOffsetDateStr(0) },
    { label: 'Вчера', dateStr: getOffsetDateStr(-1) },
    { label: '-3 дня', dateStr: getOffsetDateStr(-3) },
  ];

  const endPresets = [
    { label: 'Завтра', dateStr: getOffsetDateStr(1) },
    { label: '+2 дня', dateStr: getOffsetDateStr(2) },
    { label: '+7 дней', dateStr: getOffsetDateStr(7) },
    { label: '+14 дней', dateStr: getOffsetDateStr(14) },
  ];

  const startDateObj = parseDate(startDate);
  const endDateObj = parseDate(endDate);

  const durationDays = useMemo(() => {
    if (!startDateObj || !endDateObj) return null;
    const diffTime = endDateObj.getTime() - startDateObj.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [startDateObj, endDateObj]);

  const [daysInput, setDaysInput] = useState<string>(() => {
    if (durationDays !== null && durationDays >= 0) return String(durationDays);
    return '';
  });

  useEffect(() => {
    if (durationDays !== null && durationDays >= 0) {
      queueMicrotask(() => setDaysInput(String(durationDays)));
    } else if (!endDate) {
      queueMicrotask(() => setDaysInput(''));
    }
  }, [durationDays, endDate]);

  const handleDaysInputChange = (val: string) => {
    setDaysInput(val);
    if (val.trim() === '') {
      onChangeEndDate('');
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
      const base = startDateObj ? new Date(startDateObj.getTime()) : new Date();
      base.setDate(base.getDate() + num);
      const dayStr = String(base.getDate()).padStart(2, '0');
      const monthStr = String(base.getMonth() + 1).padStart(2, '0');
      const yrStr = base.getFullYear();
      const formatted = `${dayStr}.${monthStr}.${yrStr}`;
      onChangeEndDate(formatted);
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
  };

  const pluralizeDays = (count: number) => {
    const abs = Math.abs(count);
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod100 >= 11 && mod100 <= 19) return 'дней';
    if (mod10 === 1) return 'день';
    if (mod10 >= 2 && mod10 <= 4) return 'дня';
    return 'дней';
  };

  return (
    <div className="space-y-3 select-none font-mono">
      <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
        СРОКИ: ПРИЁМКА И СДАЧА
      </div>

      {/* 1. Нативное переключение дат приёмки и сдачи со стильным подчеркиванием без неона */}
      <div className="flex items-center gap-6 pt-0.5">
        {/* Дата приёмки */}
        <button
          type="button"
          onClick={() => {
            setActiveDateType('start');
            if (startDateObj) {
              setViewYear(startDateObj.getFullYear());
              setViewMonth(startDateObj.getMonth());
            }
          }}
          className={`flex items-center gap-2 text-sm font-mono cursor-pointer text-left ${
            activeDateType === 'start' ? 'text-white font-bold' : 'text-[#71717a] hover:text-[#d4d4d8]'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeDateType === 'start' ? 'bg-white' : 'bg-neutral-600'}`} />
          <span className="relative inline-block">
            <span>Приёмка: {startDate || 'не указана'}</span>
            <HandDrawnUnderline isSelected={activeDateType === 'start'} color="#ffffff" />
          </span>
        </button>

        {/* Дата сдачи */}
        <button
          type="button"
          onClick={() => {
            setActiveDateType('end');
            if (endDateObj) {
              setViewYear(endDateObj.getFullYear());
              setViewMonth(endDateObj.getMonth());
            }
          }}
          className={`flex items-center gap-2 text-sm font-mono cursor-pointer text-left ${
            activeDateType === 'end' ? 'text-white font-bold' : 'text-[#71717a] hover:text-[#d4d4d8]'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeDateType === 'end' ? 'bg-white' : 'bg-neutral-600'}`} />
          <span className="relative inline-block">
            <span>Сдача: {endDate || 'без дедлайна'}</span>
            <HandDrawnUnderline isSelected={activeDateType === 'end'} color="#ffffff" />
          </span>
        </button>
      </div>

      {/* 2. Единый календарь */}
      <div className="space-y-2 w-full max-w-[340px] pt-1">
        {/* Навигация по месяцам по центру */}
        <div className="flex items-center justify-center gap-3 text-sm py-1 font-semibold text-white">
          <button
            type="button"
            onClick={() => {
              if (viewMonth === 0) {
                setViewMonth(11);
                setViewYear(viewYear - 1);
              } else {
                setViewMonth(viewMonth - 1);
              }
            }}
            className="w-6 h-6 rounded text-[#71717a] hover:text-white flex items-center justify-center cursor-pointer text-base "
            title="Предыдущий месяц"
          >
            ‹
          </button>
          <span className="min-w-[130px] text-center tracking-tight font-mono font-bold">
            {monthNames[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={() => {
              if (viewMonth === 11) {
                setViewMonth(0);
                setViewYear(viewYear + 1);
              } else {
                setViewMonth(viewMonth + 1);
              }
            }}
            className="w-6 h-6 rounded text-[#71717a] hover:text-white flex items-center justify-center cursor-pointer text-base "
            title="Следующий месяц"
          >
            ›
          </button>
        </div>

        {/* Дни недели с разделительной линией в стиле Cockpit Console */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-[#71717a] font-medium pb-1.5 border-b border-[#222227]">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <div key={d} className="w-full text-center text-[11px] font-mono flex items-center justify-center">
              {d}
            </div>
          ))}
        </div>

        {/* Сетка дней (ровно 6 строк / 42 ячейки - предотвращает прыжки интерфейса) */}
        <div className="grid grid-cols-7 gap-1 text-sm pt-1 h-[216px]">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="w-full h-8 flex items-center justify-center pointer-events-none" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayDate = new Date(viewYear, viewMonth, dayNum);
            const dayStr = String(dayNum).padStart(2, '0');
            const monthStr = String(viewMonth + 1).padStart(2, '0');
            const formatted = `${dayStr}.${monthStr}.${viewYear}`;

            const isStart = startDate === formatted;
            const isEnd = endDate === formatted;
            const isBoth = isStart && isEnd;
            const isInRange =
              startDateObj &&
              endDateObj &&
              dayDate > startDateObj &&
              dayDate < endDateObj;

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => handleSelectDay(dayNum)}
                className={`w-full h-8 rounded flex items-center justify-center font-mono text-xs sm:text-sm cursor-pointer ${
                  isBoth
                    ? 'text-white font-bold bg-neutral-800'
                    : isStart
                    ? 'text-white font-bold'
                    : isEnd
                    ? 'text-white font-bold'
                    : isInRange
                    ? 'text-white bg-white/[0.04]'
                    : 'text-[#71717a] hover:text-white'
                }`}
              >
                <span className="relative inline-block">
                  <span>{dayNum}</span>
                  {/* Зелёное подчеркивание для даты приёмки */}
                  {isStart && <HandDrawnUnderline isSelected={true} color="#10b981" />}
                  {/* Красное подчеркивание для даты сдачи */}
                  {isEnd && !isBoth && <HandDrawnUnderline isSelected={true} color="#ef4444" />}
                  {/* Если обе даты совпали */}
                  {isBoth && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-white ring-1 ring-white/40" />
                  )}
                </span>
              </button>
            );
          })}
          {Array.from({ length: Math.max(0, trailingEmpty) }).map((_, i) => (
            <div key={`trail-${i}`} className="w-full h-8 flex items-center justify-center pointer-events-none" />
          ))}
        </div>
      </div>

      {/* 3. Срок выполнения в фирменном стиле приложения (без разделительной линии) */}
      <div className="space-y-1 pt-1">
        <div className="flex items-baseline gap-2.5">
          {/* Поле ввода цифры в фирменном стиле */}
          <input
            type="number"
            min="0"
            max="9999"
            value={daysInput}
            onChange={e => handleDaysInputChange(e.target.value)}
            placeholder="0"
            className="text-2xl sm:text-3xl font-light font-mono text-white tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-white/20"
            style={{ width: `${Math.max(1, String(daysInput || 0).length) * 0.65 + 0.15}em` }}
          />

          {/* Вертикальные кнопки + сверху и - снизу */}
          <div className="flex flex-col items-center justify-center font-mono select-none self-center leading-none">
            <button
              type="button"
              onClick={() => handleDaysInputChange(String((parseInt(daysInput, 10) || 0) + 1))}
              className="w-4 h-4 flex items-center justify-center text-sm font-bold text-[#71717a] hover:text-white cursor-pointer leading-none"
              title="Увеличить на 1 день"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => handleDaysInputChange(String(Math.max(0, (parseInt(daysInput, 10) || 0) - 1)))}
              disabled={(parseInt(daysInput, 10) || 0) <= 0}
              className="w-4 h-4 flex items-center justify-center text-sm font-bold text-[#71717a] hover:text-white disabled:text-[#3f3f46] disabled:cursor-not-allowed cursor-pointer leading-none"
              title="Уменьшить на 1 день"
            >
              −
            </button>
          </div>

          <span className="text-sm text-[#71717a] font-mono select-none">
            {pluralizeDays(parseInt(daysInput, 10) || 0)} срок выполнения
          </span>
        </div>

        {/* Быстрые пресеты для выбранного типа даты */}
        <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
          {(activeDateType === 'start' ? startPresets : endPresets).map(p => {
            const isSelected = (activeDateType === 'start' ? startDate : endDate) === p.dateStr;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  const dObj = parseDate(p.dateStr);
                  if (dObj) {
                    setViewYear(dObj.getFullYear());
                    setViewMonth(dObj.getMonth());
                  }
                  if (activeDateType === 'start') {
                    onChangeStartDate(p.dateStr);
                  } else {
                    onChangeEndDate(p.dateStr);
                  }
                }}
                className={`py-0.5 text-xs font-mono cursor-pointer ${
                  isSelected ? 'text-white font-bold' : 'text-[#71717a] hover:text-white'
                }`}
              >
                <span className="relative inline-block">
                  <span>{p.label}</span>
                  <HandDrawnUnderline
                    isSelected={isSelected}
                    color={activeDateType === 'start' ? '#10b981' : '#ef4444'}
                  />
                </span>
              </button>
            );
          })}
          {(activeDateType === 'start' ? startDate : endDate) && (
            <button
              type="button"
              onClick={() => (activeDateType === 'start' ? onChangeStartDate('') : onChangeEndDate(''))}
              className="py-0.5 text-xs font-mono cursor-pointer text-[#71717a] hover:text-[#f87171]"
            >
              <span>[сброс]</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
