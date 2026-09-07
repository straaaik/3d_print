'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Как рассчитывается себестоимость в калькуляторе 3D Labs?',
      a: 'Формула включает 8 параметров: точный вес детали (цена за грамм выбранного филамента), время печати (амортизация оборудования + электроэнергия по тарифу региона), износ сопла, процент риска брака/перепечати, время на снятие поддержек и постобработку, а также стоимость покупной фурнитуры (болты, гайки, магниты).'
    },
    {
      q: 'Будет ли система работать, если временно отключится интернет в мастерской?',
      a: 'Да! В 3D Labs реализована двухуровневая архитектура. Все операции кэшируются в локальном хранилище браузера (localStorage + IndexedDB). Вы можете продолжать рассчитывать заказы, редактировать каталог и учитывать катушки. При появлении интернета данные бесшовно синхронизируются с облаком Supabase.'
    },
    {
      q: 'Как работает учет сложных сборок (Assemblies)?',
      a: 'Вы можете создавать составные товары, состоящие из нескольких 3D-печатных деталей (разных цветов и пластиков) и покупных комплектующих (метизы, магниты, подшипники, сервоприводы). Система автоматически суммирует себестоимость всех компонентов и формирует итоговую цену изделия.'
    },
    {
      q: 'Как происходит списание катушек со склада?',
      a: 'При создании и переводе заказа в статус «На печати» или «Готов» вы можете выбрать конкретные катушки из наличия. Указанный вес детали автоматически вычитается из остатка катушки. Если остаток падает ниже 200 г, система выдает предупреждение о необходимости дозаказа.'
    },
    {
      q: 'Как осуществляется доступ и безопасность учетных записей?',
      a: 'Доступ осуществляется через защищенную аутентификацию Supabase Auth с закрытой регистрацией по лицензионным ключам доступа (Access Keys). Администратор мастерской может генерировать ключи для сотрудников и партнеров, управляя правами доступа.'
    }
  ];

  return (
    <section id="faq" className="border-b border-white/15 bg-neutral-950/60 py-16 sm:py-24 select-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Заголовок */}
        <div className="text-center mb-12 sm:mb-16">
          <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest block mb-3">
            ЧАСТО ЗАДАВАЕМЫЕ ВОПРОСЫ
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05]">
            Ответы на ключевые вопросы <br />
            <em className="text-neutral-400 font-normal italic">по работе с системой.</em>
          </h2>
        </div>

        {/* Аккордеон */}
        <div className="border-y border-white/15 divide-y divide-white/10">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-5">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-4 font-sans text-base sm:text-lg font-bold text-white hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs text-neutral-500 font-normal">0{idx + 1}.</span>
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-neutral-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-cyan-400' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="pt-4 text-xs sm:text-sm text-neutral-300 leading-relaxed pl-7">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
