'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Monitor,
  Smartphone,
  Tablet,
  Maximize2,
  Table,
  Layers,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { DrawerDesignConfig, DesignPreset } from './types';
import { DEFAULT_CONFIG, MOCK_EXPENSE_ORDER, MOCK_INCOME_ORDER, BUILTIN_PRESETS } from './defaults';
import { CustomizableOrderDrawer } from './components/CustomizableOrderDrawer';
import { ContextTableRow } from './components/ContextTableRow';
import { SandboxControls } from './components/SandboxControls';
import { Order } from '@/shared/types';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { usePageTransition } from '../../shared/ui/page-transition/PageTransitionProvider';

export function DesignSandboxWorkspace() {
  const { settleFallback } = usePageTransition();

  useEffect(() => {
    settleFallback();
  }, [settleFallback]);

  const [config, setConfig] = useState<DrawerDesignConfig>(DEFAULT_CONFIG);
  const [customPresets, setCustomPresets] = useState<DesignPreset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('3d_labs_sandbox_config');
      if (savedConfig) setConfig(JSON.parse(savedConfig));
      const savedPresets = localStorage.getItem('3d_labs_sandbox_custom_presets');
      if (savedPresets) setCustomPresets(JSON.parse(savedPresets));
    } catch (e) {
      console.warn('Failed to load sandbox config from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const [orderMode, setOrderMode] = useState<'expense' | 'income'>('expense');
  const [order, setOrder] = useState<Order>(MOCK_EXPENSE_ORDER);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [showContextRow, setShowContextRow] = useState(true);
  const [viewportWidth, setViewportWidth] = useState<'full' | '1200px' | '960px' | '768px'>('full');

  // Синхронизация текущей конфигурации в localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('3d_labs_sandbox_config', JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config, isLoaded]);

  // Синхронизация кастомных пресетов
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('3d_labs_sandbox_custom_presets', JSON.stringify(customPresets));
    } catch {
      // ignore
    }
  }, [customPresets, isLoaded]);

  // Переключение режима Расход / Доход
  const handleToggleMode = (mode: 'expense' | 'income') => {
    setOrderMode(mode);
    setOrder(mode === 'expense' ? MOCK_EXPENSE_ORDER : MOCK_INCOME_ORDER);
  };

  const handleSavePreset = (name: string) => {
    const newPreset: DesignPreset = {
      id: `custom-${Date.now()}`,
      name,
      description: 'Пользовательский пресет дизайна',
      config: { ...config },
      isCustom: true,
    };
    setCustomPresets((prev) => [newPreset, ...prev]);
  };

  const handleDeletePreset = (id: string) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSelectPreset = (preset: DesignPreset) => {
    setConfig({ ...preset.config });
  };

  return (
    <div className="min-h-screen bg-dot-grid text-white flex flex-col justify-between font-sans selection:bg-cyan-500/30">
      <main className="w-full mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-5 max-w-[1720px] space-y-4">
        {/* Cockpit Shell */}
        <div className="relative rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden flex flex-col min-h-[90vh]">
          {/* 1. Cockpit Topbar */}
          <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/10 bg-neutral-900/60 font-mono text-xs select-none flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Терминальные точки */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </div>
              <div className="h-4 w-px bg-white/15" />
              {/* Инженерный штамп */}
              <span className="font-bold tracking-wider text-neutral-200 uppercase text-[11px] sm:text-xs">
                3D-LABS // ДИЗАЙН-ЛАБОРАТОРИЯ (SANDBOX)
              </span>
              <span className="text-[9.5px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold hidden xs:inline">
                DEV-ONLY
              </span>
            </div>

            {/* Быстрые переключатели холста и режима */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Переключатель компонента для масштабируемости */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-xs">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span className="text-neutral-400 text-[10.5px]">Компонент:</span>
                <span className="text-white font-bold text-[10.5px]">OrderRowDrawer (Выпадающее меню)</span>
              </div>

              {/* Переключатель Расход / Доход */}
              <div className="flex items-center bg-black/60 border border-white/15 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => handleToggleMode('expense')}
                  className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                    orderMode === 'expense'
                      ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                      : 'text-neutral-400 hover:text-white border border-transparent'
                  }`}
                >
                  Расход (Скриншот)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode('income')}
                  className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                    orderMode === 'income'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-neutral-400 hover:text-white border border-transparent'
                  }`}
                >
                  Доход
                </button>
              </div>

              {/* Переключатель контекстной строки */}
              <button
                type="button"
                onClick={() => setShowContextRow(!showContextRow)}
                className={`px-2 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ${
                  showContextRow
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-white/[0.02] text-neutral-400 border-white/10 hover:text-white'
                }`}
                title="Показать / скрыть строку таблицы сверху"
              >
                <Table className="w-3 h-3 text-neutral-400" />
                <span className="hidden sm:inline">Строка таблицы:</span>
                <span className={showContextRow ? 'text-cyan-400 font-bold' : 'text-neutral-500'}>
                  {showContextRow ? 'ВКЛ' : 'ВЫКЛ'}
                </span>
              </button>

              {/* Режимы ширины */}
              <div className="hidden lg:flex items-center bg-black/60 border border-white/15 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewportWidth('full')}
                  className={`p-1 rounded cursor-pointer ${
                    viewportWidth === 'full' ? 'bg-white/15 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Ширина 100%"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewportWidth('1200px')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer text-[10px] ${
                    viewportWidth === '1200px' ? 'bg-white/15 text-white font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Ширина 1200px"
                >
                  1200px
                </button>
                <button
                  type="button"
                  onClick={() => setViewportWidth('960px')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer text-[10px] ${
                    viewportWidth === '960px' ? 'bg-white/15 text-white font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Ширина 960px"
                >
                  960px
                </button>
                <button
                  type="button"
                  onClick={() => setViewportWidth('768px')}
                  className={`p-1 rounded cursor-pointer ${
                    viewportWidth === '768px' ? 'bg-white/15 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Ширина планшета 768px"
                >
                  <Tablet className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Рабочее пространство (2 колонки: Инструменты слева, Живой холст справа) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
            {/* Левая колонка: Панель параметров дизайна (5 из 12 на десктопе, 420px) */}
            <div className="lg:col-span-5 xl:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 p-3 bg-neutral-950/70 flex flex-col max-h-[550px] lg:max-h-[calc(90vh-80px)] overflow-hidden">
              <SandboxControls
                config={config}
                onChange={setConfig}
                customPresets={customPresets}
                onSavePreset={handleSavePreset}
                onDeletePreset={handleDeletePreset}
                onSelectPreset={handleSelectPreset}
              />
            </div>

            {/* Правая колонка: Интерактивный живой холст (7 из 12 на десктопе) */}
            <div className="lg:col-span-7 xl:col-span-8 p-3 sm:p-5 flex flex-col items-center overflow-y-auto bg-neutral-950/30">
              <div
                className="w-full transition-all duration-300 space-y-3"
                style={{
                  maxWidth: viewportWidth === 'full' ? '100%' : viewportWidth,
                }}
              >
                {/* Информационная плашка над холстом */}
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ИНТЕРАКТИВНЫЙ ПРЕДПРОСМОТР В РЕАЛЬНОМ ВРЕМЕНИ</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    Кликайте на любые элементы внутри для проверки
                  </span>
                </div>

                {/* Рамка таблицы заказов как в приложении */}
                <div className="border border-white/15 rounded-xl overflow-hidden bg-neutral-950/90 shadow-2xl">
                  {/* Строка таблицы над ящиком */}
                  {showContextRow && (
                    <ContextTableRow
                      order={order}
                      isOpen={isDrawerOpen}
                      onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
                    />
                  )}

                  {/* Раскрывающийся ящик с анимацией Motion */}
                  <AnimatePresence initial={false}>
                    {isDrawerOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
                          opacity: { duration: 0.22, ease: [0.25, 1, 0.5, 1] },
                        }}
                        className="overflow-hidden"
                      >
                        <CustomizableOrderDrawer
                          config={config}
                          order={order}
                          onOrderChange={setOrder}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Подсказка для пользователя */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 font-mono text-xs text-neutral-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-white font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Как это работает:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-400">
                    <li>
                      Двигайте ползунки и выбирайте цвета на панели слева — изменения мгновенно отражаются на карточке расхода.
                    </li>
                    <li>
                      Вкладка <strong>«Палитра»</strong> содержит все официальные цвета 3D Labs для быстрой вставки.
                    </li>
                    <li>
                      Когда вы настроите идеальный вид, нажмите <strong>«[ Экспорт и код дизайна ]»</strong> внизу панели настроек, скопируйте текст и отправьте мне — я сразу перенесу этот стиль в реальный интерфейс.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Cockpit Statusbar */}
          <div className="border-t border-white/10 px-4 py-2 bg-neutral-950 flex items-center justify-between text-[11px] font-mono text-neutral-500 select-none flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span>TARGET: OrderRowDrawer.tsx</span>
              <span>•</span>
              <span>ENVIRONMENT: LOCALHOST</span>
              <span>•</span>
              <span>STATE: SYNCHRONIZED</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>DEV RUNTIME READY</span>
            </div>
          </div>
        </div>
      </main>

      {/* Глобальный футер */}
      <footer className="w-full text-center py-4 border-t border-white/10 select-none bg-neutral-950/80 backdrop-blur-md font-mono text-xs text-neutral-500">
        <span>3D LABS · DESIGN SANDBOX v1.0 [DEV-ONLY]</span>
      </footer>
    </div>
  );
}
