'use client';

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export function ComparisonSection() {
  const rows = [
    {
      num: '01',
      category: 'Расчет себестоимости',
      labs: 'Автоматический учет 8 факторов (пластик, время, износ сопла, мощность, брак, сборка, маржа). 12 секунд на расчет.',
      legacy: 'Расчет «на глаз» или громоздкая таблица Excel. Не учитывается износ сопла, брак и электричество.'
    },
    {
      num: '02',
      category: 'Учет катушек и склада',
      labs: 'Сквозное списание пластика с точностью до грамма при отправке в печать. Сигналы о низком остатке.',
      legacy: 'Пластик считается «на вес катушки в руке». Внезапная остановка печати посреди ночи из-за нехватки 50 грамм.'
    },
    {
      num: '03',
      category: 'Сложные сборки (Assemblies)',
      labs: 'Спецификация составных изделий: печатные детали + покупная фурнитура (болты, гайки, магниты, втулки).',
      legacy: 'Фурнитура не включается в себестоимость или считается вручную на бумажке. Детали теряются в папках.'
    },
    {
      num: '04',
      category: 'Управление заказами (CRM)',
      labs: 'Четкая воронка: Новый → В работе → Готов → Выдан. Учет предоплат, остатка и месячных финансовых целей.',
      legacy: 'Заказы разбросаны по перепискам Telegram, WhatsApp, Avito и стикерам. Сроки и клиенты забываются.'
    },
    {
      num: '05',
      category: 'Финансовая аналитика P&L',
      labs: 'Реальная чистая прибыль, выручка и маржинальность всей фермы обновляются в реальном времени.',
      legacy: 'Сведение итогов раз в месяц (или никогда). Непонятно, какие изделия приносят прибыль, а какие убыток.'
    },
    {
      num: '06',
      category: 'Хранение 3D-моделей (STL)',
      labs: 'Локальное IndexedDB хранилище прямо в браузере с быстрым предпросмотром 3D-файлов.',
      legacy: 'Файлы раскиданы по флешкам принтеров и Google Drive. Долгий поиск нужной версии модели.'
    },
    {
      num: '07',
      category: 'Надежность и доступность',
      labs: 'Двойная защита: автономный LocalStorage + облако Supabase. Приложение работает даже без интернета.',
      legacy: 'Один испорченный файл таблицы Excel или сбой облака блокирует работу всей мастерской.'
    }
  ];

  return (
    <section id="comparison" className="border-b border-white/15 bg-neutral-950/40 py-16 sm:py-24 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Заголовок секции */}
        <div className="border-b border-white/10 pb-4 mb-8 sm:mb-12 flex items-center justify-between font-mono text-xs text-neutral-400">
          <span>7 КАТЕГОРИЙ · ПРЯМОЕ СРАВНЕНИЕ</span>
          <span>ОБНОВЛЕНО · 2026</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end mb-10 sm:mb-14">
          <div>
            <div className="font-mono text-xs text-cyan-400 uppercase tracking-widest">3D LABS OS</div>
            <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mt-1">
              Профессиональная система.
            </h2>
          </div>
          <div className="md:text-right">
            <div className="font-mono text-xs text-neutral-500 uppercase tracking-widest">КЛАССИЧЕСКИЙ ПОДХОД</div>
            <h3 className="text-4xl sm:text-6xl font-bold tracking-tight text-neutral-600 line-through decoration-neutral-500/40 mt-1">
              Excel & Заметки.
            </h3>
          </div>
        </div>

        {/* Таблица сравнения на десктопе */}
        <div className="hidden md:block border-y border-white/15 divide-y divide-white/10">
          {rows.map((row) => (
            <div key={row.num} className="grid grid-cols-[200px_1fr_1fr] items-stretch text-xs sm:text-sm">
              
              {/* Колонка категории */}
              <div className="py-6 pr-6 border-r border-white/10 flex items-start gap-3">
                <span className="font-mono text-xs text-cyan-400 font-bold">{row.num}</span>
                <span className="font-bold text-white font-sans">{row.category}</span>
              </div>

              {/* Колонка 3D Labs */}
              <div className="py-6 px-6 border-r border-white/10 bg-cyan-950/[0.08] flex items-start gap-3 text-neutral-200 leading-relaxed font-sans">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <span>{row.labs}</span>
              </div>

              {/* Колонка Excel / Ручной учет */}
              <div className="py-6 pl-6 flex items-start gap-3 text-neutral-500 leading-relaxed font-sans">
                <XCircle className="w-5 h-5 text-neutral-600 shrink-0 mt-0.5" />
                <span className="line-through decoration-neutral-700">{row.legacy}</span>
              </div>

            </div>
          ))}
        </div>

        {/* Мобильная версия карточек сравнения */}
        <div className="md:hidden space-y-4">
          {rows.map((row) => (
            <div key={row.num} className="border border-white/10 bg-white/[0.02] p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-cyan-400 font-bold">{row.num}</span>
                <span className="text-white font-bold font-sans text-sm">{row.category}</span>
              </div>

              <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30 text-xs text-neutral-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{row.labs}</span>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-neutral-500 flex items-start gap-2 line-through">
                <XCircle className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
                <span>{row.legacy}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
