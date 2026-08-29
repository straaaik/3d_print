'use client';

import React from 'react';
import { Activity, Zap, CheckCircle2, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

export function TelemetrySection() {
  const events = [
    { time: '14:02:11', node: 'STOCK-NODE', event: 'Списание 245 г PETG Solid White', code: 'SPOOL-SYNC', status: 'OK', level: 'L1' },
    { time: '14:03:45', node: 'PRINT-01', event: 'Завершена печать: Шестерня М5 (x8)', code: 'JOB-COMPLETE', status: 'SUCCESS', level: 'L1' },
    { time: '14:04:20', node: 'ORDER-PIPE', event: 'Заказ #ORD-1082 переведен в «На печати»', code: 'STATUS-TRANS', status: 'OK', level: 'L2' },
    { time: '14:05:12', node: 'GOAL-ENGINE', event: 'Месячная цель достигла 74% (184 500 ₽)', code: 'GOAL-REACH', status: 'NOMINAL', level: 'L1' },
    { time: '14:06:05', node: 'LOCAL-STL', event: '3D-модель кэширована в IndexedDB (14.2 МБ)', code: 'CACHE-STORE', status: 'FAST', level: 'L1' },
    { time: '14:07:30', node: 'STOCK-WARN', event: 'FDPlast ABS Red: остаток 140 г (< 200 г)', code: 'LOW-STOCK', status: 'ALERT', level: 'L3' },
    { time: '14:08:15', node: 'PRICE-CALC', event: 'Расчет цены партии 50 шт: себестоимость 4 120 ₽', code: 'CALC-SOLVE', status: '12ms', level: 'L1' },
  ];

  return (
    <section id="telemetry" className="relative border-y border-white/15 bg-neutral-950/60 select-none">
      {/* Фоновая микро-сетка */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '8px 8px'
        }}
      />

      {/* Верхняя статусная лента */}
      <div className="border-b border-white/10 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-neutral-400">
          <div className="flex items-center gap-2 text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">ТЕЛЕМЕТРИЯ СТУДИИ · ВСЕ ПРОЦЕССЫ СИНХРОНИЗИРОВАНЫ</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <span>ЗАДЕРЖКА РАСЧЕТА: <strong>12ms</strong></span>
            <span>СОХРАННОСТЬ ДАННЫХ: <strong>100%</strong></span>
            <span>СТАТУС БАЗЫ: <strong>SUPABASE CONNECTED</strong></span>
          </div>
          <div>UTC 14:08:15</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Левая часть: ключевые бенчмарки в стиле Meridian */}
          <div className="lg:col-span-5 space-y-6">
            <div className="font-mono text-xs text-cyan-400 uppercase tracking-widest">
              § БЕНЧМАРКИ ЭФФЕКТИВНОСТИ · 3D LABS
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05]">
              Порядок вместо хаоса, <br />
              <em className="text-neutral-400 font-normal italic">прибыль вместо догадок.</em>
            </h2>

            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
              Владельцы ферм и студий 3D-печати ежедневно теряют до 20% выручки из-за неучтенного брака, электричества, забытых катушек и неточных расчетов на глаз. 3D Labs превращает студию в точный конвейер.
            </p>

            {/* Карточки сравнения ДО и ПОСЛЕ */}
            <div className="border border-white/10 rounded-2xl divide-y divide-white/10 bg-white/[0.02] overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-2xl font-bold text-neutral-400 line-through">15–20 мин</div>
                  <div className="text-xs text-neutral-500 font-mono">Расчет заказа в Excel / на калькуляторе</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-cyan-400">12 секунд</div>
                  <div className="text-xs text-cyan-300/80 font-mono">В 3D Labs с учетом всех издержек</div>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between bg-white/[0.03]">
                <div>
                  <div className="font-mono text-2xl font-bold text-neutral-400 line-through">30–40%</div>
                  <div className="text-xs text-neutral-500 font-mono">Средняя маржа при интуитивных ценах</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-emerald-400">68.7%</div>
                  <div className="text-xs text-emerald-300/80 font-mono">Фактическая маржа по формулам 3D Labs</div>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-2xl font-bold text-neutral-400 line-through">~4-6 катушек</div>
                  <div className="text-xs text-neutral-500 font-mono">Забытые остатки пластика в месяц</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-white">0 грамм</div>
                  <div className="text-xs text-neutral-400 font-mono">Сквозное списание при печати</div>
                </div>
              </div>
            </div>
          </div>

          {/* Правая часть: Телеметрическая таблица событий */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-mono text-xs text-neutral-400 uppercase">
                Живой лог событий и операций
              </span>
              <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> SYNC LIVE
              </span>
            </div>

            <div className="border border-white/10 rounded-2xl overflow-hidden bg-neutral-950/80">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-neutral-900/90 border-b border-white/10 text-[11px] text-neutral-400 uppercase">
                    <tr>
                      <th className="py-3 px-3.5">Время</th>
                      <th className="py-3 px-3.5">Узел</th>
                      <th className="py-3 px-3.5">Событие системы</th>
                      <th className="py-3 px-3.5 text-right">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {events.map((ev, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3.5 text-neutral-400 whitespace-nowrap">{ev.time}</td>
                        <td className="py-3 px-3.5">
                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300 text-[10px]">
                            {ev.node}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-white font-sans text-xs">{ev.event}</td>
                        <td className="py-3 px-3.5 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            ev.status === 'ALERT'
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-700/60'
                              : ev.status === 'SUCCESS' || ev.status === 'OK'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                              : 'bg-cyan-950/80 text-cyan-400 border border-cyan-700/60'
                          }`}>
                            {ev.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 pt-2 px-1">
              <span>ЛОГ ОПЕРАЦИЙ КЭШИРУЕТСЯ В ЛОКАЛЬНОМ ХРАНИЛИЩЕ</span>
              <span>ШИФРОВАНИЕ ДАННЫХ SSL/TLS</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
