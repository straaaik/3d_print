'use client';

import React from 'react';
import {
  Database,
  Zap,
  Cpu,
  KeyRound,
  HardDrive
} from 'lucide-react';

export function BentoWall() {
  const cards = [
    {
      icon: Database,
      tag: 'ARCHITECTURE',
      title: 'Двойное хранилище (Cloud + Local)',
      desc: 'Автономная работа: данные мгновенно сохраняются в браузере и при наличии сети синхронизируются с защищенным облаком Supabase.',
      colSpan: 'md:col-span-8',
      highlight: '100% автономность без страха потери данных'
    },
    {
      icon: KeyRound,
      tag: 'SECURITY',
      title: 'Лицензионные ключи доступа',
      desc: 'Закрытая регистрация и панель администратора для генерации одноразовых ключей сотрудникам и партнерам.',
      colSpan: 'md:col-span-4',
      highlight: 'Role-based access control'
    },
    {
      icon: HardDrive,
      tag: 'LOCAL 3D ENGINE',
      title: 'IndexedDB STL-хранилище',
      desc: 'Тяжелые 3D-модели хранятся прямо на вашем устройстве в IndexedDB, не нагружая сервер и открываясь мгновенно.',
      colSpan: 'md:col-span-4',
      highlight: 'Нулевая задержка открытия STL'
    },
    {
      icon: Zap,
      tag: 'INSTANT CALC',
      title: 'Экспорт коммерческих предложений',
      desc: 'Формирование готового текста с ценой, сроками и параметрами печати для отправки клиентам в Telegram или WhatsApp в 1 клик.',
      colSpan: 'md:col-span-4',
      highlight: 'Готовый расчет в буфер обмена'
    },
    {
      icon: Cpu,
      tag: 'FLEET LOGIC',
      title: 'Профили сопел и принтеров',
      desc: 'Учет разных типов сопел (латунь, закаленная сталь, рубин), мощностей нагревателей и стоимости износа каждого станка.',
      colSpan: 'md:col-span-4',
      highlight: 'Точный износ оборудования'
    },
  ];

  return (
    <section id="features" className="border-b border-white/15 bg-neutral-950 py-16 sm:py-24 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Заголовок */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest block mb-3">
            ИНЖЕНЕРНАЯ АРХИТЕКТУРА
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05]">
            Создано инженерами <br />
            <em className="text-neutral-400 font-normal italic">для студий 3D-печати.</em>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400 leading-relaxed">
            Каждая деталь системы разработана с учетом реальных вызовов производства: отключения интернета, тяжелые файлы моделей, расчет сложных сборок и строгий контроль прибыльности.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className={`${card.colSpan} border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all p-6 sm:p-8 rounded-2xl flex flex-col justify-between group shadow-lg hover:border-white/20`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[10px] text-neutral-400 uppercase px-2 py-0.5 rounded border border-white/10 bg-white/5">
                      {card.tag}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-6">
                    {card.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-3">
                    {card.desc}
                  </p>
                </div>

                <div className="pt-6 border-t border-white/10 mt-6 flex items-center justify-between font-mono text-xs text-neutral-400">
                  <span className="text-cyan-400 font-medium">{card.highlight}</span>
                  <span className="text-neutral-600">→</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
