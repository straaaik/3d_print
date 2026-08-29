'use client';

import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Calculator, 
  Package, 
  Layers, 
  Cpu, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Sparkles,
  Search,
  Activity,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CockpitPreview() {
  const [activeTab, setActiveTab] = useState<'orders' | 'calculator' | 'filaments' | 'printers' | 'analytics'>('orders');

  return (
    <div className="w-full select-none">
      {/* 3D Container & Tilt Frame */}
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
        
        {/* Консольная шапка в стиле окна macOS / Meridian Dashboard */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 px-4 py-3 bg-neutral-900/60 gap-3">
          <div className="flex items-center gap-3">
            {/* Точки терминала */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-400/40 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40 inline-block" />
            </div>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10">
              <span className="font-mono text-xs text-neutral-400">3dlabs · control-node-01</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                LIVE
              </span>
            </div>
          </div>

          {/* Интерактивные вкладки консоли */}
          <div className="flex items-center gap-1 overflow-x-auto p-0.5 rounded-lg bg-neutral-950/80 border border-white/10">
            {[
              { id: 'orders', label: 'Заказы (CRM)', icon: ShoppingBag },
              { id: 'calculator', label: 'Калькулятор', icon: Calculator },
              { id: 'filaments', label: 'Склад катушек', icon: Layers },
              { id: 'printers', label: 'Парк принтеров', icon: Cpu },
              { id: 'analytics', label: 'Статистика', icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-white bg-white/10 border border-white/20 shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-neutral-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-neutral-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <Activity className="w-3.5 h-3.5" /> 4/4 Печатают
            </span>
            <span className="text-white/20">|</span>
            <span>68% Маржа</span>
          </div>
        </div>

        {/* Интерактивное тело консоли */}
        <div className="p-4 sm:p-6 min-h-[480px] bg-gradient-to-b from-neutral-950 to-neutral-900/90">
          <AnimatePresence mode="wait">
            
            {/* 1. ЗАКАЗЫ (CRM) */}
            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Карточки KPI заказов */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="border border-white/10 bg-white/[0.02] p-3.5 rounded-xl">
                    <span className="font-mono text-[11px] text-neutral-400 uppercase">Выручка за месяц</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-bold text-white font-mono">184 500 ₽</span>
                      <span className="text-[11px] font-mono text-emerald-400">+28.4%</span>
                    </div>
                    <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: '74%' }} />
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 mt-1 block">Цель: 250 000 ₽</span>
                  </div>

                  <div className="border border-white/10 bg-white/[0.02] p-3.5 rounded-xl">
                    <span className="font-mono text-[11px] text-neutral-400 uppercase">Чистая прибыль</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">126 800 ₽</span>
                      <span className="text-[11px] font-mono text-neutral-400">68.7% маржа</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400/80 mt-3 block">Себестоимость: 57 700 ₽</span>
                  </div>

                  <div className="border border-white/10 bg-white/[0.02] p-3.5 rounded-xl">
                    <span className="font-mono text-[11px] text-neutral-400 uppercase">Заказов в работе</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-bold text-white font-mono">14</span>
                      <span className="text-[11px] font-mono text-yellow-400">4 на печати</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 mt-3 block">3 готовы к выдаче</span>
                  </div>

                  <div className="border border-white/10 bg-white/[0.02] p-3.5 rounded-xl">
                    <span className="font-mono text-[11px] text-neutral-400 uppercase">Сроки и дедлайны</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">98.6%</span>
                      <span className="text-[11px] font-mono text-neutral-400">вовремя</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 mt-3 block">Средний срок: 1.8 дня</span>
                  </div>
                </div>

                {/* Живая таблица заказов */}
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-neutral-900/80 border-b border-white/10 font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">№ / Заказ</th>
                          <th className="py-2.5 px-3">Клиент</th>
                          <th className="py-2.5 px-3">Изделие / Детали</th>
                          <th className="py-2.5 px-3">Статус</th>
                          <th className="py-2.5 px-3">Пластик</th>
                          <th className="py-2.5 px-3 text-right">Сумма</th>
                          <th className="py-2.5 px-3 text-right">Оплата</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-xs">
                        <tr className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-white">#ORD-1082</td>
                          <td className="py-2.5 px-3 text-neutral-300 font-sans">ООО «Аэротех»</td>
                          <td className="py-2.5 px-3 text-neutral-200 font-sans">Корпус датчика дрона (x8)</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-950/80 text-yellow-300 border border-yellow-700/60 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" /> На печати
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-400">PETG-CF Black</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">18 400 ₽</td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">100% Оплачено</td>
                        </tr>

                        <tr className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-white">#ORD-1081</td>
                          <td className="py-2.5 px-3 text-neutral-300 font-sans">Константин В.</td>
                          <td className="py-2.5 px-3 text-neutral-200 font-sans">Шестерня редуктора М5</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Готов
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-400">Nylon PA12</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">4 200 ₽</td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">100% Оплачено</td>
                        </tr>

                        <tr className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-white">#ORD-1080</td>
                          <td className="py-2.5 px-3 text-neutral-300 font-sans">Студия «ДизайнФорм»</td>
                          <td className="py-2.5 px-3 text-neutral-200 font-sans">Архитектурный макет 1:50</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-950/80 text-yellow-300 border border-yellow-700/60 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" /> На печати
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-400">PLA Matte White</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">36 000 ₽</td>
                          <td className="py-2.5 px-3 text-right text-yellow-400">Предоплата 50%</td>
                        </tr>

                        <tr className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-white">#ORD-1079</td>
                          <td className="py-2.5 px-3 text-neutral-300 font-sans">Иван Григорьев</td>
                          <td className="py-2.5 px-3 text-neutral-200 font-sans">Кастомные заглушки авто (x4)</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Выдан
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-400">ASA Black UV</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">2 800 ₽</td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">100% Оплачено</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. КАЛЬКУЛЯТОР СЕБЕСТОИМОСТИ */}
            {activeTab === 'calculator' && (
              <motion.div
                key="calculator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-5"
              >
                <div className="lg:col-span-7 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-mono text-xs text-neutral-400 uppercase">Параметры печати детали</span>
                    <span className="font-mono text-xs text-cyan-400">Bambu Lab X1-Carbon</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.03] border border-white/10 p-3 rounded-xl">
                      <label className="text-[11px] font-mono text-neutral-400 block">Вес детали (грамм)</label>
                      <div className="mt-1 text-lg font-bold font-mono text-white">245 г</div>
                      <span className="text-[10px] text-neutral-500 font-mono">Пластик: eSUN PETG Solid</span>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 p-3 rounded-xl">
                      <label className="text-[11px] font-mono text-neutral-400 block">Время печати</label>
                      <div className="mt-1 text-lg font-bold font-mono text-white">6 ч 40 мин</div>
                      <span className="text-[10px] text-neutral-500 font-mono">Скорость 250 мм/с</span>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 p-3 rounded-xl">
                      <label className="text-[11px] font-mono text-neutral-400 block">Электроэнергия + Износ</label>
                      <div className="mt-1 text-lg font-bold font-mono text-white">185 ₽ / час</div>
                      <span className="text-[10px] text-neutral-500 font-mono">Мощность 350W + сопло</span>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 p-3 rounded-xl">
                      <label className="text-[11px] font-mono text-neutral-400 block">Коэффициент наценки</label>
                      <div className="mt-1 text-lg font-bold font-mono text-emerald-400">2.8x (+180%)</div>
                      <span className="text-[10px] text-neutral-500 font-mono">Маржинальный профиль</span>
                    </div>
                  </div>

                  <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-sans">Включен учет брака (5%) и пост-обработки (15 мин)</span>
                    <span className="font-mono text-cyan-400 font-bold">+140 ₽</span>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white/[0.03] border border-white/10 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="font-mono text-xs text-neutral-400 uppercase block border-b border-white/10 pb-2">
                      Структура себестоимости
                    </span>

                    <div className="mt-3 space-y-2 text-xs font-mono">
                      <div className="flex justify-between text-neutral-300">
                        <span>Пластик (245 г × 1.8 ₽/г)</span>
                        <span className="text-white">441.00 ₽</span>
                      </div>
                      <div className="flex justify-between text-neutral-300">
                        <span>Амортизация принтера (6.67 ч)</span>
                        <span className="text-white">333.50 ₽</span>
                      </div>
                      <div className="flex justify-between text-neutral-300">
                        <span>Электроэнергия (2.33 кВт·ч)</span>
                        <span className="text-white">18.64 ₽</span>
                      </div>
                      <div className="flex justify-between text-neutral-300">
                        <span>Риск брака и перепечати (5%)</span>
                        <span className="text-white">39.65 ₽</span>
                      </div>
                      <div className="flex justify-between text-neutral-300">
                        <span>Снятие поддержек & очистка</span>
                        <span className="text-white">100.00 ₽</span>
                      </div>
                      <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-neutral-200">
                        <span>Итого себестоимость</span>
                        <span className="text-white font-mono">932.79 ₽</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/15 bg-neutral-950/60 p-3 rounded-lg">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-sans font-medium text-neutral-400">Рекомендуемая цена:</span>
                      <span className="text-2xl font-bold font-mono text-cyan-400">2 600 ₽</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-emerald-400 mt-1">
                      <span>Чистая прибыль с детали:</span>
                      <span className="font-bold">+1 667.21 ₽ (64.1%)</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. СКЛАД ФИЛАМЕНТОВ */}
            {activeTab === 'filaments' && (
              <motion.div
                key="filaments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="border border-white/10 bg-white/[0.02] p-3 rounded-xl">
                    <span className="text-[11px] font-mono text-neutral-400">Всего катушек на складе</span>
                    <div className="text-2xl font-bold font-mono text-white mt-1">28 шт. <span className="text-xs text-neutral-400 font-normal">(21.4 кг)</span></div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.02] p-3 rounded-xl">
                    <span className="text-[11px] font-mono text-neutral-400">Оценка стоимости склада</span>
                    <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">54 800 ₽</div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.02] p-3 rounded-xl">
                    <span className="text-[11px] font-mono text-neutral-400">Критический остаток (&lt; 200 г)</span>
                    <div className="text-2xl font-bold font-mono text-amber-400 mt-1">3 катушки</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { name: 'Bambu Lab PLA Matte', color: '#1a1a1a', label: 'Charcoal Black', remaining: 840, total: 1000, price: '2 100 ₽/кг' },
                    { name: 'eSUN PETG Solid', color: '#ffffff', label: 'Signal White', remaining: 620, total: 1000, price: '1 650 ₽/кг' },
                    { name: 'FDPlast ABS', color: '#dc2626', label: 'Flame Red', remaining: 140, total: 1000, price: '1 200 ₽/кг', warning: true },
                    { name: 'Polymaker PolyLite ASA', color: '#2563eb', label: 'Cobalt Blue', remaining: 910, total: 1000, price: '2 800 ₽/кг' },
                  ].map((spool, idx) => (
                    <div key={idx} className="border border-white/10 bg-white/[0.02] p-3.5 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full border-2 border-white/20 shadow-md shrink-0" 
                          style={{ backgroundColor: spool.color }}
                        />
                        <div>
                          <div className="font-bold text-white text-xs font-sans">{spool.name}</div>
                          <div className="text-[11px] text-neutral-400 font-mono">{spool.label} • {spool.price}</div>
                        </div>
                      </div>

                      <div className="text-right min-w-28">
                        <div className={`font-mono text-xs font-bold ${spool.warning ? 'text-amber-400' : 'text-white'}`}>
                          {spool.remaining} г / {spool.total} г
                        </div>
                        <div className="mt-1 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${spool.warning ? 'bg-amber-400' : 'bg-cyan-400'}`} 
                            style={{ width: `${(spool.remaining / spool.total) * 100}%` }}
                          />
                        </div>
                        {spool.warning && (
                          <span className="text-[9px] font-mono text-amber-400 block mt-0.5">Нужен дозаказ</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 4. ПАРК ПРИНТЕРОВ */}
            {activeTab === 'printers' && (
              <motion.div
                key="printers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {[
                  { name: 'Bambu Lab X1-Carbon #01', nozzle: '0.4mm Hardened', job: 'Корпус дрона (Деталь 3/8)', temp: '255°C / 80°C', progress: 78, timeLeft: '1 ч 12 м', status: 'printing' },
                  { name: 'Voron 2.4 350 #02', nozzle: '0.6mm Brass', job: 'Партия шестерен М5 (x12)', temp: '260°C / 100°C', progress: 42, timeLeft: '4 ч 20 м', status: 'printing' },
                  { name: 'Prusa MK4 #03', nozzle: '0.4mm Nextruder', job: 'Архитектурный макет', temp: '215°C / 60°C', progress: 91, timeLeft: '24 мин', status: 'printing' },
                  { name: 'Creality K1 Max #04', nozzle: '0.4mm Hardened', job: 'Ожидает следующего задания', temp: '24°C / 23°C', progress: 0, timeLeft: 'Свободен', status: 'idle' },
                ].map((printer, idx) => (
                  <div key={idx} className="border border-white/10 bg-white/[0.02] p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs sm:text-sm font-sans">{printer.name}</div>
                        <div className="text-[11px] text-neutral-400 font-mono">Сопло: {printer.nozzle}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                        printer.status === 'printing'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}>
                        {printer.status === 'printing' ? '● В ПЕЧАТИ' : '○ СВОБОДЕН'}
                      </span>
                    </div>

                    <div className="bg-neutral-950/60 border border-white/5 p-2.5 rounded-lg space-y-1.5">
                      <div className="text-[11px] text-neutral-300 truncate font-sans">
                        <span className="text-neutral-500 font-mono">Задание:</span> {printer.job}
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                        <span>Сопло / Стол: {printer.temp}</span>
                        <span>{printer.timeLeft}</span>
                      </div>
                      {printer.status === 'printing' && (
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${printer.progress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* 5. АНАЛИТИКА */}
            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="border border-white/10 bg-white/[0.02] p-3 rounded-xl">
                    <span className="text-[11px] font-mono text-neutral-400">Средний чек (AOV)</span>
                    <div className="text-xl font-bold font-mono text-white mt-1">13 180 ₽</div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.02] p-3 rounded-xl">
                    <span className="text-[11px] font-mono text-neutral-400">Расход пластика</span>
                    <div className="text-xl font-bold font-mono text-white mt-1">18.4 кг / мес</div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.02] p-3 rounded-xl">
                    <span className="text-[11px] font-mono text-neutral-400">Отработано машино-часов</span>
                    <div className="text-xl font-bold font-mono text-white mt-1">842 ч</div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.02] p-3 rounded-xl">
                    <span className="text-[11px] font-mono text-neutral-400">Маржинальность студии</span>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">68.7%</div>
                  </div>
                </div>

                <div className="border border-white/10 bg-white/[0.02] p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-neutral-400 uppercase">Динамика выручки и прибыли (2026)</span>
                    <span className="font-mono text-xs text-emerald-400">+42% YoY Growth</span>
                  </div>

                  <div className="h-36 flex items-end gap-2 sm:gap-3 pt-4 border-t border-white/10">
                    {[
                      { month: 'Янв', val: 110, profit: 75 },
                      { month: 'Фев', val: 125, profit: 86 },
                      { month: 'Мар', val: 140, profit: 98 },
                      { month: 'Апр', val: 155, profit: 108 },
                      { month: 'Май', val: 170, profit: 118 },
                      { month: 'Июн', val: 165, profit: 112 },
                      { month: 'Июл', val: 185, profit: 127 },
                    ].map((item, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <div className="w-full flex items-end justify-center gap-0.5 h-full">
                          <div 
                            className="w-full rounded-t bg-cyan-500/80 group-hover:bg-cyan-400 transition-all"
                            style={{ height: `${(item.val / 200) * 100}%` }}
                            title={`Выручка: ${item.val} тыс. ₽`}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">{item.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Подвал консоли со статусной строкой */}
        <div className="border-t border-white/10 px-4 py-2 bg-neutral-950 flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <div className="flex items-center gap-3">
            <span>DATABASE: SUPABASE CLOUD</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">CACHE: LOCALSTORAGE SYNCED</span>
          </div>
          <div>FPS: 60 · RESPONSE: 18ms</div>
        </div>

      </div>
    </div>
  );
}
