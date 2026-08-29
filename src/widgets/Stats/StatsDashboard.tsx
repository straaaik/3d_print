'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  Printer, 
  Calendar, 
  Wrench,
  ShoppingBag,
  ArrowRight,
  Zap,
  Target,
  PieChart
} from 'lucide-react';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { useData } from '../../entities/model/DataProvider';

export function StatsDashboard() {
  const router = useRouter();
  const { isOnline } = useData();

  const plannedModules = [
    {
      icon: TrendingUp,
      label: 'ФИНАНСЫ P&L',
      title: 'Прибыль и маржинальность',
      description: 'Автоматический расчет чистой прибыли, окупаемости оборудования и себестоимости каждого заказа.',
      accent: 'cyan',
    },
    {
      icon: Layers,
      label: 'МАТЕРИАЛЫ',
      title: 'Расход филаментов',
      description: 'Отслеживание расхода катушек, распределение по типам пластика и уведомления о закупке.',
      accent: 'emerald',
    },
    {
      icon: Printer,
      label: 'ОБОРУДОВАНИЕ',
      title: 'Загрузка принтеров',
      description: 'Учет машино-часов, статистика простоев, доходность на 1 час печати и контроль износа.',
      accent: 'purple',
    },
    {
      icon: Calendar,
      label: 'ДИНАМИКА',
      title: 'Тренды и графики',
      description: 'Интерактивные графики выручки с фильтрацией по дням, неделям, месяцам и кастомным интервалам.',
      accent: 'amber',
    },
    {
      icon: Target,
      label: 'ЦЕЛИ',
      title: 'План и факт',
      description: 'Установка месячных целей по выручке и визуализация прогресса выполнения плана.',
      accent: 'rose',
    },
    {
      icon: PieChart,
      label: 'СТРУКТУРА',
      title: 'Распределение расходов',
      description: 'Детальная разбивка себестоимости: материалы, электричество, амортизация, ручная работа.',
      accent: 'sky',
    },
  ];

  const accentClasses: Record<string, { bg: string; border: string; text: string; hoverBorder: string; dotBg: string }> = {
    cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-400',    hoverBorder: 'hover:border-cyan-500/30',    dotBg: 'bg-cyan-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', hoverBorder: 'hover:border-emerald-500/30', dotBg: 'bg-emerald-400' },
    purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  hoverBorder: 'hover:border-purple-500/30',  dotBg: 'bg-purple-400' },
    amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   hoverBorder: 'hover:border-amber-500/30',   dotBg: 'bg-amber-400' },
    rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-400',    hoverBorder: 'hover:border-rose-500/30',    dotBg: 'bg-rose-400' },
    sky:     { bg: 'bg-sky-500/10',     border: 'border-sky-500/20',     text: 'text-sky-400',     hoverBorder: 'hover:border-sky-500/30',     dotBg: 'bg-sky-400' },
  };

  return (
    <div className="w-full max-w-[1500px] mx-auto select-none font-sans">
      
      {/* ГЛАВНОЕ ОКНО КОНСОЛИ (MERIDIAN COCKPIT CONTAINER) */}
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
        
        {/* ═══ Верхняя панель: Terminal Header ═══ */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 px-4 py-2.5 bg-neutral-900/60 gap-3">
          
          {/* Левая часть: Точки терминала + Заголовок */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Точки терминала */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-400/40 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40 inline-block" />
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-white/10 font-mono text-xs text-neutral-300">
              <span className="text-white font-bold">§ 3D-LABS</span>
              <span className="text-neutral-600">//</span>
              <span className="text-neutral-400 hidden sm:inline">СТАТИСТИКА</span>
              
              {/* Бейдж «В РАЗРАБОТКЕ» в стиле Supabase Cloud бейджа */}
              <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded">
                <Wrench className="w-3 h-3" />
                В РАЗРАБОТКЕ
              </span>

              {isOnline ? (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Supabase Cloud
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                  LocalStorage
                </span>
              )}
            </div>
          </div>

          {/* Правая часть: Кнопки навигации */}
          <div className="flex items-center gap-2.5 text-xs font-mono shrink-0">
            <CockpitButton
              icon={ShoppingBag}
              onClick={() => router.push('/orders')}
              title="Перейти к реестру заказов"
            >
              Заказы
            </CockpitButton>

            <CockpitButton
              icon={Zap}
              onClick={() => router.push('/calculator')}
              title="Перейти к калькулятору себестоимости"
            >
              Калькулятор
            </CockpitButton>
          </div>
        </div>

        {/* ═══ Тело консоли ═══ */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-neutral-950 to-neutral-900/90 space-y-5">
          
          {/* Секция-разделитель: статус модуля */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider">
              // МОДУЛЬ АНАЛИТИКИ И СТАТИСТИКИ
            </span>
            <span className="font-mono text-[10px] text-amber-400 font-bold uppercase tracking-wider">
              STATUS: IN DEVELOPMENT
            </span>
          </div>

          {/* Центральный блок: информация «В разработке» */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto">
              <BarChart3 className="w-7 h-7 text-neutral-400" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h3 className="text-lg sm:text-xl font-bold text-white font-sans tracking-tight">
                Раздел статистики скоро будет доступен
              </h3>
              <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed font-sans">
                Комплексная аналитическая панель для финансового учета, мониторинга загрузки 3D-принтеров, расхода филаментов и маржинальности производства.
              </p>
            </div>
          </div>

          {/* Секция-разделитель: планируемые модули */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider">
              ПЛАНИРУЕМЫЕ МОДУЛИ
            </span>
            <span className="font-mono text-[10px] text-neutral-500">
              {plannedModules.length} КОМПОНЕНТОВ
            </span>
          </div>

          {/* Сетка модулей — стиль карточек параметров калькулятора */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plannedModules.map((mod) => {
              const Icon = mod.icon;
              const colors = accentClasses[mod.accent];
              return (
                <div
                  key={mod.label}
                  className={`bg-white/[0.03] border border-white/10 ${colors.hoverBorder} transition-all p-4 rounded-xl group`}
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border} ${colors.text}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className={`text-[10px] font-mono ${colors.text} font-bold uppercase tracking-wider block`}>
                        {mod.label}
                      </span>
                      <span className="text-sm font-semibold text-white font-sans block leading-tight">
                        {mod.title}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed font-sans">
                    {mod.description}
                  </p>
                  {/* Полоска статуса внизу карточки */}
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-600 uppercase">Статус</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      В очереди
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Быстрые действия */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <CockpitButton
              icon={ShoppingBag}
              size="md"
              onClick={() => router.push('/orders')}
            >
              Перейти к заказам
            </CockpitButton>

            <CockpitButton
              icon={Zap}
              size="md"
              onClick={() => router.push('/calculator')}
            >
              Открыть калькулятор
            </CockpitButton>

            <CockpitButton
              icon={ArrowRight}
              size="md"
              onClick={() => router.push('/filaments')}
            >
              Склад филаментов
            </CockpitButton>
          </div>
        </div>

        {/* ═══ Нижняя панель телеметрии ═══ */}
        <div className="border-t border-white/10 px-5 py-2.5 bg-neutral-950 flex flex-wrap items-center justify-between text-[11px] font-mono text-neutral-500 gap-2">
          <span>§ 3D-LABS · STATS_ENGINE · MODULE STATUS: PENDING</span>
          <span>DATABASE: SUPABASE CLOUD • CACHE: LOCALSTORAGE SYNCED</span>
        </div>
      </div>
    </div>
  );
}
