'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { 
  Box, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Calculator, 
  ShoppingBag, 
  Package, 
  Layers, 
  Cpu, 
  TrendingUp,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../entities/model/AuthProvider';
import { AboutHeader } from '../../widgets/About/AboutHeader';
import { CockpitPreview } from '../../widgets/About/CockpitPreview';
import { SpecInteractive } from '../../widgets/About/SpecInteractive';
import { TelemetrySection } from '../../widgets/About/TelemetrySection';
import { DynamicIslandPreview } from '../../widgets/About/DynamicIslandPreview';
import { ComparisonSection } from '../../widgets/About/ComparisonSection';
import { BentoWall } from '../../widgets/About/BentoWall';
import { FaqSection } from '../../widgets/About/FaqSection';
import { AboutFooter } from '../../widgets/About/AboutFooter';

export default function AboutPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Шапка в стиле Meridian */}
      <AboutHeader />

      <main className="relative pt-24 sm:pt-28">
        
        {/* HERO СЕКЦИЯ */}
        <section id="overview" className="relative px-4 sm:px-6 pt-12 sm:pt-16 pb-16 sm:pb-24 overflow-hidden">
          
          {/* Декоративная подсветка фона */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/10 blur-[140px] pointer-events-none rounded-full" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/5 blur-[120px] pointer-events-none rounded-full" />

          <div className="max-w-7xl mx-auto space-y-12">
            
            {/* Текстовый блок Hero */}
            <div className="max-w-4xl space-y-6">
              
              {/* Верхний бейдж */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 font-mono text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>§ 3D-LABS OS · ВСЕМОГУЩИЙ УЧЕТ 3D-ПЕЧАТИ</span>
              </div>

              {/* Главный заголовок с акцентным курсивом (Meridian style) */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.02] text-balance">
                Операционная система <br />
                для студий и ферм <em className="text-neutral-400 font-normal italic">3D-печати.</em>
              </h1>

              {/* Описание */}
              <p className="text-base sm:text-xl text-neutral-400 max-w-2xl leading-relaxed">
                Единый центр управления производством: расчет себестоимости за 12 секунд, воронка заказов с контролем предоплат, склад катушек с автосписанием, учет парка принтеров и финансовая аналитика P&L.
              </p>

              {/* Кнопки действий */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={isAuthenticated ? '/orders' : '/login'}
                  className="inline-flex items-center justify-center rounded-xl font-bold tracking-tight text-sm h-12 px-7 bg-white text-neutral-950 hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-[0_0_25px_-5px_rgba(255,255,255,0.4)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {isAuthenticated ? 'Открыть панель управления' : 'Начать работу с 3D Labs'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>

                <a
                  href="#specs"
                  className="inline-flex items-center justify-center rounded-xl font-semibold text-sm h-12 px-6 border border-white/15 text-white hover:bg-white/5 transition-all"
                >
                  Все модули системы ↓
                </a>
              </div>

              {/* Микро-статы под кнопками */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10 font-mono text-xs text-neutral-400">
                <div>
                  <div className="text-white font-bold text-base font-mono">12 сек</div>
                  <span className="text-[11px]">Расчет себестоимости</span>
                </div>
                <div>
                  <div className="text-cyan-400 font-bold text-base font-mono">100%</div>
                  <span className="text-[11px]">Автосписание граммов</span>
                </div>
                <div>
                  <div className="text-emerald-400 font-bold text-base font-mono">68.7%</div>
                  <span className="text-[11px]">Маржинальность студии</span>
                </div>
                <div>
                  <div className="text-white font-bold text-base font-mono">Offline-First</div>
                  <span className="text-[11px]">Локальная надежность</span>
                </div>
              </div>

            </div>

            {/* Интерактивный 3D Cockpit консоли */}
            <div className="pt-4">
              <CockpitPreview />
            </div>

          </div>
        </section>


        {/* СЕКЦИЯ СПЕЦИФИКАЦИЙ (AT A GLANCE / МОДУЛИ A - F) */}
        <section id="specs" className="relative border-t border-white/15 bg-neutral-950/80 px-4 sm:px-6 py-16 sm:py-24 select-none">
          <div className="max-w-7xl mx-auto space-y-12">
            
            {/* Заголовок секции со штампом спецификации */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              <div className="md:col-span-8">
                <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest block mb-2">
                  § СПЕЦИФИКАЦИЯ СИСТЕМЫ · 6 МОДУЛЕЙ
                </span>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05]">
                  3D Labs, <em className="text-neutral-400 font-normal italic">в деталях.</em>
                </h2>
              </div>

              <div className="md:col-span-4 border border-white/15 bg-white/[0.02] p-3.5 rounded-xl font-mono text-xs text-neutral-400 hidden md:block">
                <div className="flex justify-between border-b border-white/10 pb-1.5 mb-1.5 text-white">
                  <span>§ 3D-LABS / 02</span>
                  <span>Rev 2.4</span>
                </div>
                <div className="flex justify-between">
                  <span>МАСШТАБ</span>
                  <span className="text-neutral-200">1 : 1 ПОЛНЫЙ ЦИКЛ</span>
                </div>
              </div>
            </div>

            {/* Интерактивный компонент спецификаций A-F */}
            <SpecInteractive />

          </div>
        </section>


        {/* СЕКЦИЯ ТЕЛЕМЕТРИИ И БЕНЧМАРКОВ */}
        <TelemetrySection />


        {/* СЕКЦИЯ МОБИЛЬНОГО КОНТРОЛЯ (DYNAMIC ISLAND) */}
        <DynamicIslandPreview />


        {/* СЕКЦИЯ СРАВНЕНИЯ (3D LABS VS EXCEL) */}
        <ComparisonSection />


        {/* СЕКЦИЯ BENTO GRID (ИНЖЕНЕРНАЯ АРХИТЕКТУРА) */}
        <BentoWall />


        {/* СЕКЦИЯ FAQ */}
        <FaqSection />

      </main>

      {/* Подвал страницы */}
      <AboutFooter />

    </div>
  );
}
