'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Box, CheckCircle2, AlertTriangle, Clock, Activity, Cpu, Layers, DollarSign } from 'lucide-react';

export function DynamicIslandPreview() {
  const [activeStep, setActiveStep] = useState(0);

  const activities = [
    {
      id: 'print',
      title: 'Печать в процессе',
      sub: 'Bambu Lab X1C · Слой 412/560',
      islandText: 'X1-Carbon · 78%',
      islandSub: '1 ч 12 м',
      color: 'bg-emerald-500',
      phoneCard: {
        badge: 'ACTIVE PRINT',
        title: 'Корпус датчика дрона (x8)',
        meta: 'Bambu Lab X1-Carbon #01 · 255°C / 80°C',
        statVal: '78%',
        statLabel: 'Прогресс печати (1 ч 12 мин осталось)',
        progress: 78,
        action: 'Пауза / Стоп',
        action2: 'Открыть камеру'
      }
    },
    {
      id: 'complete',
      title: 'Партия завершена',
      sub: 'Остывание стола · 38°C',
      islandText: 'Готово · Снимите деталь',
      islandSub: 'Prusa MK4',
      color: 'bg-cyan-400',
      phoneCard: {
        badge: 'JOB FINISHED',
        title: 'Шестерни редуктора М5',
        meta: 'Prusa MK4 #03 · Время печати 3 ч 40 м',
        statVal: '100%',
        statLabel: 'Стол остыл до 38°C. Готов к снятию',
        progress: 100,
        action: 'Подтвердить снятие',
        action2: 'Списать 120 г Nylon'
      }
    },
    {
      id: 'spool',
      title: 'Контроль остатка катушки',
      sub: 'FDPlast ABS Red · 140 г',
      islandText: 'Низкий остаток · 140 г',
      islandSub: 'Нужен дозаказ',
      color: 'bg-amber-400',
      phoneCard: {
        badge: 'LOW SPOOL WARNING',
        title: 'FDPlast ABS Flame Red',
        meta: 'Склад филаментов · Остаток ниже 200 г',
        statVal: '140 г',
        statLabel: 'Хватит на ~1 небольшую печать',
        progress: 14,
        action: 'Добавить в корзину поставщика',
        action2: 'Заменить на катушку #2'
      }
    },
    {
      id: 'order',
      title: 'Готовность и оплата',
      sub: 'Заказ #ORD-1082 · 18 400 ₽',
      islandText: 'Заказ готов · Оплачен',
      islandSub: 'ООО «Аэротех»',
      color: 'bg-purple-400',
      phoneCard: {
        badge: 'ORDER COMPLETED',
        title: 'Заказ #ORD-1082 (ООО «Аэротех»)',
        meta: 'Сумма: 18 400 ₽ · 100% Оплачено',
        statVal: '18 400 ₽',
        statLabel: 'Все 8 деталей упакованы и проверены',
        progress: 100,
        action: 'Отправить трек СДЭК',
        action2: 'Сформировать чек'
      }
    }
  ];

  const current = activities[activeStep];

  return (
    <section className="relative border-b border-white/15 bg-neutral-950 py-16 sm:py-24 select-none overflow-hidden">
      
      {/* Декоративный фоновый свет */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Заголовок секции */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest block mb-3">
            ОПЕРАТИВНЫЙ КОНТРОЛЬ · ВСЕ УСТРОЙСТВА
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05]">
            Все события вашей фермы — <br />
            <em className="text-neutral-400 font-normal italic">в реальном времени.</em>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400 leading-relaxed">
            Будьте в курсе каждого напечатанного слоя, остывания стола, оплаты счета и расхода пластика. Консоль 3D Labs адаптирована для экранов любых смартфонов, планшетов и рабочих станций.
          </p>
        </div>

        {/* Сетка: Интерактивные шаги слева + Мокап смартфона справа */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          
          {/* Левая колонка: 4 интерактивные карточки событий */}
          <div className="lg:col-span-6 space-y-3">
            {activities.map((item, idx) => {
              const isActive = activeStep === idx;
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveStep(idx)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white/[0.05] border-white/25 shadow-lg shadow-black/40'
                      : 'bg-white/[0.01] border-white/10 hover:bg-white/[0.03] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color} ${isActive ? 'animate-pulse' : 'opacity-60'}`} />
                      <span className="font-mono text-xs text-neutral-400">0{idx + 1} · СОБЫТИЕ</span>
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                        LIVE
                      </span>
                    )}
                  </div>

                  <h3 className={`mt-2 text-lg sm:text-xl font-bold tracking-tight ${isActive ? 'text-white' : 'text-neutral-300'}`}>
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                    {item.sub}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Правая колонка: Стилизованный мокап iPhone / Dynamic Island в стиле Meridian */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-[300px] sm:w-[340px] h-[600px] rounded-[3rem] border-[6px] border-neutral-700 bg-neutral-900 p-3 shadow-2xl shadow-black/90 select-none">
              
              {/* Экран телефона */}
              <div className="relative h-full w-full rounded-[2.25rem] bg-black overflow-hidden flex flex-col justify-between p-4 text-white">
                
                {/* Dynamic Island блок */}
                <div className="relative mx-auto mt-1 flex items-center justify-between gap-2 px-3.5 py-2 rounded-full bg-neutral-900 border border-white/15 text-xs shadow-lg max-w-[240px] w-full">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${current.color} animate-pulse`} />
                    <span className="font-mono text-[11px] font-bold text-white truncate">{current.islandText}</span>
                  </div>
                  <span className="font-mono text-[10px] text-neutral-400 shrink-0">{current.islandSub}</span>
                </div>

                {/* Центр экрана: Интерактивная карточка Live Activity */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 rounded-2xl bg-neutral-900/90 border border-white/15 space-y-3 shadow-xl backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                        {current.phoneCard.badge}
                      </span>
                      <span className="text-neutral-400">3D Labs OS</span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white leading-tight">
                        {current.phoneCard.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400 mt-1 font-mono">
                        {current.phoneCard.meta}
                      </p>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between items-baseline text-xs font-mono">
                        <span className="text-2xl font-bold text-white">{current.phoneCard.statVal}</span>
                        <span className="text-[10px] text-neutral-400">Статус</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${current.color}`} 
                          style={{ width: `${current.phoneCard.progress}%` }} 
                        />
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
                        {current.phoneCard.statLabel}
                      </span>
                    </div>

                    <div className="pt-2 space-y-1.5">
                      <button className="w-full py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors">
                        {current.phoneCard.action}
                      </button>
                      <button className="w-full py-2 rounded-xl border border-white/20 text-neutral-300 text-xs hover:bg-white/5 transition-colors">
                        {current.phoneCard.action2}
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Нижняя полоска Home bar */}
                <div className="w-28 h-1 bg-white/30 rounded-full mx-auto mb-1" />

              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
