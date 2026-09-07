'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Box, Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../../entities/model/AuthProvider';
import { MotionPing } from '../../shared/ui/MotionPrimitives';

export function AboutHeader() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Обзор', href: '#overview' },
    { label: 'Модули', href: '#specs' },
    { label: 'Телеметрия', href: '#telemetry' },
    { label: 'Сравнение', href: '#comparison' },
    { label: 'Возможности', href: '#features' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <>
      {/* Верхний сервисный статус-бар (Meridian style) */}
      <div className="relative overflow-hidden bg-neutral-900 border-b border-white/10 text-neutral-300 text-xs py-2 px-4 select-none z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <MotionPing className="absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] text-neutral-300 tracking-wider">
              3D LABS OS · PRODUCTION RELEASE v2.4 · ВСЕ УЗЛЫ В НОРМЕ
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono text-neutral-400">
            <span>OFFLINE LOCALSTORAGE + CLOUD SYNC</span>
            <span className="text-white/20">|</span>
            <Link
              href={isAuthenticated ? '/orders' : '/login'}
              className="text-white hover:text-cyan-400 inline-flex items-center gap-1 font-sans font-semibold"
            >
              {isAuthenticated ? 'Перейти в консоль' : 'Войти в систему'}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Плавающая шапка в стиле капсулы Meridian */}
      <header
        className={`fixed top-10 left-0 right-0 z-40 duration-300 pointer-events-none px-4 sm:px-6`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Логотип 3D Labs */}
          <Link
            href="/about"
            className="pointer-events-auto flex items-center gap-2.5 bg-neutral-950/80 hover:bg-neutral-900/90 border border-white/15 backdrop-blur-xl px-3.5 py-2 rounded-xl text-white shadow-2xl group"
          >
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 ">
              <Box className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5 font-sans">
              <span className="font-bold tracking-tight text-white text-base">3D Labs</span>
              <span className="font-mono text-[10px] text-neutral-400">®</span>
            </div>
          </Link>

          {/* Центральное меню на десктопе */}
          <nav className="pointer-events-auto hidden md:flex items-center gap-1 bg-neutral-950/85 border border-white/15 p-1 rounded-xl shadow-2xl backdrop-blur-xl">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="relative px-3.5 py-1.5 text-xs font-mono tracking-wider text-neutral-400 hover:text-white duration-200 group"
              >
                <span className="text-neutral-600 group-hover:text-cyan-400 mr-0.5">[</span>
                <span className="font-sans font-medium text-xs">{item.label}</span>
                <span className="text-neutral-600 group-hover:text-cyan-400 ml-0.5">]</span>
              </a>
            ))}
          </nav>

          {/* Кнопка действия справа */}
          <div className="pointer-events-auto flex items-center gap-2">
            <Link
              href={isAuthenticated ? '/orders' : '/login'}
              className="relative inline-flex items-center justify-center rounded-xl font-semibold tracking-tight text-xs h-9 px-4 sm:px-5 bg-white text-neutral-950 hover:bg-neutral-200 shadow-[0_0_20px_-3px_rgba(255,255,255,0.4)] cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                {isAuthenticated ? 'Открыть панель' : 'Войти по ключу'}
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            {/* Кнопка мобильного меню */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-neutral-950/80 border border-white/15 text-white backdrop-blur-xl"
              aria-label="Меню"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Мобильное выпадающее меню */}
        {mobileMenuOpen && (
          <div className="pointer-events-auto mt-2 md:hidden bg-neutral-950 border border-white/15 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl space-y-2">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-neutral-300 hover:text-white hover:bg-white/5 font-mono"
              >
                [ {item.label} ]
              </a>
            ))}
            <div className="pt-2 border-t border-white/10">
              <Link
                href={isAuthenticated ? '/orders' : '/login'}
                className="w-full py-2.5 rounded-xl bg-cyan-500 text-neutral-950 font-bold text-center text-xs flex items-center justify-center gap-2"
              >
                {isAuthenticated ? 'В консоль 3D Labs' : 'Авторизация'}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
