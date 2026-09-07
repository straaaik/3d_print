'use client';

import React, { useState } from 'react';
import {
  Calculator,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpecItem {
  id: string;
  letter: string;
  category: string;
  title: string;
  desc: string;
  badge: string;
  details: string[];
  metrics: { label: string; value: string }[];
}

const SPECS: SpecItem[] = [
  {
    id: 'calculator',
    letter: 'A',
    category: 'Калькулятор себестоимости',
    title: 'Мгновенный расчет себестоимости и цен до копейки',
    desc: 'Учитывает вес пластика в граммах, время печати, мощность принтера, износ сопел, риск брака, постобработку и заданную маржу студии.',
    badge: 'ACCURACY 99.4%',
    details: [
      'Автоматический расчет энергопотребления (кВт·ч по тарифу)',
      'Амортизация принтера и сменных сопел по часам работы',
      'Страховочный коэффициент брака и перепечати',
      'Быстрый перенос расчета в новый заказ или каталог товаров'
    ],
    metrics: [
      { label: 'Скорость расчета', value: '12 сек' },
      { label: 'Точность маржи', value: '100%' },
      { label: 'Учет факторов', value: '8 параметров' },
    ]
  },
  {
    id: 'orders',
    letter: 'B',
    category: 'Воронка заказов & CRM',
    title: 'Полный контроль заказов от заявки до отгрузки',
    desc: 'Управление жизненным циклом: отслеживание предоплат, дедлайнов, статусов печати, карточек клиентов и выполнения ежемесячных финансовых целей.',
    badge: 'LIFECYCLE PIPELINE',
    details: [
      'Статусы: Новый → На печати → Готов → Выдан → Архив',
      'Учет предоплат, остатка и способов расчетов',
      'Интерактивные помесячные цели с контролем темпа выручки',
      'Мгновенная фильтрация, поиск по клиенту и артикулам'
    ],
    metrics: [
      { label: 'Соблюдение сроков', value: '98.6%' },
      { label: 'Потери заказов', value: '0%' },
      { label: 'Конверсия в оплату', value: '94%' },
    ]
  },
  {
    id: 'products',
    letter: 'C',
    category: 'Каталог изделий & Сборки',
    title: 'Сложные составные изделия и встроенный STL-Viewer',
    desc: 'Поддержка сборок (Assemblies): объединение печатных деталей с фурнитурой (болты, гайки, магниты, втулки) и локальное IndexedDB хранилище 3D-моделей.',
    badge: '3D ASSEMBLIES & STL',
    details: [
      'Многокомпонентные сборки с калькуляцией покупной фурнитуры',
      'Привязка и локальный предпросмотр STL-файлов',
      'Организация номенклатуры по категориям и коллекциям',
      'Управление цветовыми вариациями и материалами изделий'
    ],
    metrics: [
      { label: 'Хранение STL', value: 'Локально' },
      { label: 'Сложность сборок', value: 'Любая' },
      { label: 'Поиск моделей', value: '&lt; 0.1 сек' },
    ]
  },
  {
    id: 'filaments',
    letter: 'D',
    category: 'Склад филаментов',
    title: 'Учет граммов пластика и автосписание при заказах',
    desc: 'База катушек по производителям, типам (PLA, PETG, ABS, TPU, Nylon, Carbon) и цветам. Контроль остатков и защита от остановки печати.',
    badge: 'SPOOL TELEMETRY',
    details: [
      'Точный учет остатка в граммах и стоимости остатка на складе',
      'Автоматическое списание пластика при переводе заказа в печать',
      'Визуальная цветовая палитра катушек с HEX-кодами',
      'Предупреждения о низком уровне остатка (< 200 г)'
    ],
    metrics: [
      { label: 'Точность списания', value: '1 грамм' },
      { label: 'Экономия пластика', value: '+18%' },
      { label: 'Снижение простоев', value: '-85%' },
    ]
  },
  {
    id: 'printers',
    letter: 'E',
    category: 'Парк 3D-принтеров',
    title: 'Управление оборудованием и учет машино-часов',
    desc: 'Мониторинг парка принтеров (Bambu Lab, Voron, Prusa, Creality). Расчет стоимости часа работы, учет диаметров сопел и распределение очереди.',
    badge: 'FLEET DISPATCH',
    details: [
      'Параметры мощности (W) и расчет стоимости машино-часа',
      'Учет диаметра установленных сопел (0.2, 0.4, 0.6, 0.8 мм)',
      'Индикация статуса готовности и текущего задания',
      'Оценка ресурса и графика технического обслуживания'
    ],
    metrics: [
      { label: 'Загрузка парка', value: '88%' },
      { label: 'Точность амортизации', value: '100%' },
      { label: 'Поддержка моделей', value: 'Все типы' },
    ]
  },
  {
    id: 'analytics',
    letter: 'F',
    category: 'Финансовая аналитика',
    title: 'P&L дашборд: выручка, чистая прибыль и маржинальность',
    desc: 'Прозрачная финансовая отчетность в реальном времени. Динамика прибыли, структура расходов, средний чек и рейтинг доходных позиций.',
    badge: 'EXECUTIVE P&L',
    details: [
      'Помесячные графики чистой прибыли и выручки',
      'Расчет средней маржинальности всей фермы',
      'Статистика расхода материалов по видам пластика',
      'Метрики среднего чека (AOV) и LTV постоянных заказчиков'
    ],
    metrics: [
      { label: 'Рост прибыли', value: '+42% YoY' },
      { label: 'Прозрачность P&L', value: '100%' },
      { label: 'Время на отчеты', value: '0 мин' },
    ]
  }
];

export function SpecInteractive() {
  const [selectedSpec, setSelectedSpec] = useState<SpecItem>(SPECS[0]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start select-none">

      {/* Левая колонка: Интерактивный список зон A-F в стиле Meridian */}
      <div className="lg:col-span-6 border-y border-white/15 divide-y divide-white/10">
        {SPECS.map((spec) => {
          const isSelected = selectedSpec.id === spec.id;
          return (
            <div
              key={spec.id}
              onClick={() => setSelectedSpec(spec)}
              className={`relative py-5 px-3 cursor-pointer transition-all duration-200 group ${
                isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Полоса активного индикатора слева */}
              {isSelected && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400" />
              )}

              <div className="grid grid-cols-[2.5rem_1fr] items-baseline gap-4">
                {/* Буква зоны */}
                <div className={`font-mono text-2xl font-bold transition-colors ${
                  isSelected ? 'text-cyan-400' : 'text-neutral-500 group-hover:text-white'
                }`}>
                  {spec.letter}.
                </div>

                {/* Содержимое */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                      {spec.category}
                    </span>
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                      isSelected
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                        : 'bg-white/5 text-neutral-400 border-white/10'
                    }`}>
                      {spec.badge}
                    </span>
                  </div>

                  <h3 className={`text-base sm:text-lg font-bold tracking-tight transition-colors ${
                    isSelected ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                  }`}>
                    {spec.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed line-clamp-2">
                    {spec.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Правая колонка: Детальная витрина выбранного модуля */}
      <div className="lg:col-span-6 lg:sticky lg:top-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedSpec.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="border border-white/15 bg-neutral-950/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-6"
          >
            {/* Штамп спецификации */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 font-mono text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-white font-bold">МОДУЛЬ [{selectedSpec.letter}] · {selectedSpec.category.toUpperCase()}</span>
              </div>
              <span>3D LABS v2.4</span>
            </div>

            {/* Заголовок и описание */}
            <div>
              <h4 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                {selectedSpec.title}
              </h4>
              <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
                {selectedSpec.desc}
              </p>
            </div>

            {/* Метрики модуля */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {selectedSpec.metrics.map((m, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ transform: 'translateY(-2px)' }}
                  className="border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors p-3 rounded-xl"
                >
                  <div className="font-mono text-lg sm:text-xl font-bold text-cyan-400">{m.value}</div>
                  <div className="font-mono text-[10px] text-neutral-400 mt-1 uppercase">{m.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Пункты возможностей */}
            <div className="border-t border-white/10 pt-4">
              <span className="font-mono text-xs text-neutral-400 uppercase block mb-3">
                Ключевые возможности модуля:
              </span>
              <ul className="space-y-2.5">
                {selectedSpec.details.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-300 font-sans">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Статусная сноска */}
            <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs font-mono text-neutral-500">
              <span>Синхронизация: Supabase Cloud</span>
              <span className="text-emerald-400">● Готов к работе</span>
            </div>

          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
