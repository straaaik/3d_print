'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Order } from '../types';
import { getOrderMonthKey, formatMonthKeyLabel, formatMoney } from '../helpers';
import { Tooltip } from '../../../shared/ui/Tooltip';

const MONTH_NAMES = [
  { num: 1, name: 'Январь', short: 'Янв', code: '01' },
  { num: 2, name: 'Февраль', short: 'Фев', code: '02' },
  { num: 3, name: 'Март', short: 'Мар', code: '03' },
  { num: 4, name: 'Апрель', short: 'Апр', code: '04' },
  { num: 5, name: 'Май', short: 'Май', code: '05' },
  { num: 6, name: 'Июнь', short: 'Июн', code: '06' },
  { num: 7, name: 'Июль', short: 'Июл', code: '07' },
  { num: 8, name: 'Август', short: 'Авг', code: '08' },
  { num: 9, name: 'Сентябрь', short: 'Сен', code: '09' },
  { num: 10, name: 'Октябрь', short: 'Окт', code: '10' },
  { num: 11, name: 'Ноябрь', short: 'Ноя', code: '11' },
  { num: 12, name: 'Декабрь', short: 'Дек', code: '12' },
];

function HandDrawnUnderline({
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
            strokeWidth="1.6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            exit={{ pathLength: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}

interface OpenNewMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMonth: (monthKey: string) => void;
  selectedMonthKey: string;
  orders: Order[];
}

export function OpenNewMonthModal({
  isOpen,
  onClose,
  onSelectMonth,
  selectedMonthKey,
  orders,
}: OpenNewMonthModalProps) {
  const initialYear = useMemo(() => {
    if (selectedMonthKey && selectedMonthKey !== 'all') {
      const [y] = selectedMonthKey.split('-').map(Number);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
  }, [selectedMonthKey]);

  const [year, setYear] = useState<number>(initialYear);
  const [pickedMonthKey, setPickedMonthKey] = useState<string>(
    selectedMonthKey !== 'all'
      ? selectedMonthKey
      : `${initialYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Часы в шапке
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      setCurrentTimeStr(`${hours}:${mins}:${secs} MSK`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Закрытие по клавише Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setYear(initialYear);
      setPickedMonthKey(
        selectedMonthKey !== 'all'
          ? selectedMonthKey
          : `${initialYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      );
    }
  }, [isOpen, initialYear, selectedMonthKey]);

  const monthStatsMap = useMemo(() => {
    const map = new Map<string, { count: number; income: number; expense: number }>();
    orders.forEach((o) => {
      const key = getOrderMonthKey(o);
      if (key && key.startsWith(`${year}-`)) {
        const current = map.get(key) || { count: 0, income: 0, expense: 0 };
        current.count += 1;
        if (o.type === 'income') {
          current.income += o.amount || 0;
        } else {
          current.expense += o.amount || 0;
        }
        map.set(key, current);
      }
    });
    return map;
  }, [orders, year]);

  const handleConfirm = () => {
    if (pickedMonthKey) {
      onSelectMonth(pickedMonthKey);
      onClose();
    }
  };

  const realCurrentKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const pickedStats = monthStatsMap.get(pickedMonthKey) || { count: 0, income: 0, expense: 0 };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none overflow-hidden">
          {/* Стеклянный темный бэкдроп */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Главное окно консоли в стиле Meridian Cockpit */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-[820px] rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden z-10 flex flex-col font-mono"
          >
            {/* 1. Верхняя панель (Cockpit Topbar: Red LED + Title + Live time) */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 bg-neutral-900/60 shrink-0 gap-3">
              {/* Левая часть: красный терминальный кружок закрытия + заголовок раздела */}
              <div className="flex items-center gap-4 min-w-0">
                {/* Терминальная кнопка закрытия */}
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip content="Закрыть окно">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#f87171] hover:scale-125 active:scale-95 transition-all duration-150 cursor-pointer border-none outline-none"
                    />
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-[#d4d4d8] min-w-0">
                  <span className="text-[#d4d4d8] font-normal truncate">
                    Выбор отчетного периода
                  </span>
                  <span className="text-[#52525b] shrink-0">·</span>
                  <span className="text-[#71717a] hidden sm:inline truncate">
                    {year} год
                  </span>
                </div>
              </div>

              {/* Правая часть: Живые часы и статус */}
              <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                <span className="text-[#a1a1aa] hidden sm:inline text-[11px]">
                  {currentTimeStr}
                </span>
                <span className="text-neutral-600 hidden sm:inline">|</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-[#a1a1aa] uppercase tracking-wider font-semibold">
                  {year} ГОД
                </span>
              </div>
            </div>

            {/* 2. Тело модального окна */}
            <div className="p-5 sm:p-6 bg-[#18181c] space-y-4">

              {/* Переключатель года в стиле Cockpit */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141416]/80 border border-[#26262b]">
                <Tooltip content="Предыдущий год">
                  <button
                    type="button"
                    onClick={() => setYear((y) => y - 1)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs font-mono"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">{year - 1}</span>
                  </button>
                </Tooltip>

                <div className="flex items-center gap-2.5">
                  <span className="text-base font-bold text-white tracking-widest font-mono">
                    {year} ГОД
                  </span>
                  {year === new Date().getFullYear() && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 font-bold uppercase tracking-wider">
                      ТЕКУЩИЙ
                    </span>
                  )}
                </div>

                <Tooltip content="Следующий год">
                  <button
                    type="button"
                    onClick={() => setYear((y) => y + 1)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs font-mono"
                  >
                    <span className="hidden sm:inline">{year + 1}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>

              {/* Сетка 12 месяцев (4 колонки x 3 строки) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {MONTH_NAMES.map((m) => {
                  const monthKey = `${year}-${m.code}`;
                  const stats = monthStatsMap.get(monthKey);
                  const isPicked = pickedMonthKey === monthKey;
                  const isCurrentMonth = monthKey === realCurrentKey;

                  return (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() => setPickedMonthKey(monthKey)}
                      onDoubleClick={() => {
                        onSelectMonth(monthKey);
                        onClose();
                      }}
                      className={`p-3 rounded-xl font-mono text-left transition-all cursor-pointer border flex flex-col justify-between min-h-[82px] relative overflow-hidden group ${
                        isPicked
                          ? 'bg-[#1e1e22] text-white border-white/40 shadow-lg ring-1 ring-white/20'
                          : 'bg-[#141416]/70 border-[#222226] text-[#a1a1aa] hover:text-white hover:bg-[#18181c] hover:border-[#383840]'
                      }`}
                    >
                      {/* Верхняя строка: Код + Название + Галочка */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-[10px] font-mono ${isPicked ? 'text-amber-400' : 'text-[#71717a]'}`}>
                            {m.code}
                          </span>
                          <span className="relative inline-flex items-center font-bold text-xs text-white">
                            <span>{m.name}</span>
                            <HandDrawnUnderline isSelected={isPicked} />
                          </span>
                        </div>

                        {isPicked && (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>

                      {/* Нижняя строка: Заказы + Бейдж СЕЙЧАС */}
                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#71717a] w-full">
                        <span>
                          {stats?.count ? (
                            <span className="font-mono text-neutral-300 font-medium">
                              {stats.count} {stats.count === 1 ? 'запись' : stats.count < 5 ? 'записи' : 'записей'}
                            </span>
                          ) : (
                            <span className="text-[#52525b]">нет записей</span>
                          )}
                        </span>

                        {isCurrentMonth && (
                          <span className="text-[9px] text-emerald-400 font-semibold px-1 py-0.2 rounded bg-emerald-950/40 border border-emerald-500/30">
                            СЕЙЧАС
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Информационная сводка выбранного месяца */}
              <div className="p-3 bg-[#141416]/80 border border-[#26262b] rounded-xl flex items-center justify-between text-xs font-mono text-[#a1a1aa]">
                <div className="flex items-center gap-2">
                  <span className="text-[#71717a] uppercase text-[10px] tracking-wider">ВЫБРАН:</span>
                  <span className="text-white font-bold tracking-wide">
                    {formatMonthKeyLabel(pickedMonthKey)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  {pickedStats.count > 0 && (
                    <span className="text-emerald-400 font-medium">
                      +{formatMoney(pickedStats.income)}
                    </span>
                  )}
                  <span className="text-[#52525b] text-[10px] hidden sm:inline">
                    Двойной клик для быстрого открытия
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Нижняя панель телеметрии и кнопки */}
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 bg-neutral-900/60 font-mono text-xs shrink-0">
              <div className="text-[11px] text-[#71717a] hidden sm:flex items-center gap-2">
                <span>Календарь заказов</span>
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-[#a1a1aa] hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer text-xs font-mono select-none"
                >
                  [ Закрыть ]
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-neutral-200 transition-all cursor-pointer text-xs font-mono select-none shadow-md"
                >
                  [ Открыть {formatMonthKeyLabel(pickedMonthKey)} → ]
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
