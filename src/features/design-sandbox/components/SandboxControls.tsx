'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sliders,
  Palette,
  Type,
  Coins,
  FileText,
  RotateCcw,
  Copy,
  Check,
  BookmarkPlus,
  Trash2,
  Code2,
  Sparkles,
} from 'lucide-react';
import { DrawerDesignConfig, DesignPreset } from '../types';
import { BUILTIN_PRESETS, DEFAULT_CONFIG } from '../defaults';
import { APP_PALETTE } from '../palette';

interface Props {
  config: DrawerDesignConfig;
  onChange: (newConfig: DrawerDesignConfig) => void;
  customPresets: DesignPreset[];
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  onSelectPreset: (preset: DesignPreset) => void;
}

type TabType = 'geometry' | 'colors' | 'palette' | 'badges' | 'finance' | 'inputs';

// Фирменные цвета 3D Labs Cockpit для быстрой подстановки в инпуты
const quickColors = [
  { name: 'Cockpit Sand', hex: '#D2CCBB' },
  { name: 'Primary Cyan', hex: '#0CB4E0' },
  { name: 'Secondary Slate', hex: '#537D8E' },
  { name: 'Tertiary Amber', hex: '#FEB63D' },
  { name: 'Expense Rose', hex: '#fb7185' },
  { name: 'Income Emerald', hex: '#34d399' },
  { name: 'Warning Amber', hex: '#fbbf24' },
  { name: 'Order Cyan', hex: '#22d3ee' },
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Slate 500', hex: '#71717a' },
  { name: 'Dim 600', hex: '#52525b' },
  { name: 'Neutral 950', hex: '#09090b' },
  { name: 'Glass 2%', hex: 'rgba(255, 255, 255, 0.02)' },
  { name: 'Glass 5%', hex: 'rgba(255, 255, 255, 0.05)' },
  { name: 'Border 10%', hex: 'rgba(255, 255, 255, 0.1)' },
  { name: 'Prusa Orange', hex: '#EA580C' },
];

/**
 * Вынесенный компонент ползунка с поддержкой ручного ввода и индивидуальным сбросом
 */
interface ConfigSliderProps {
  label: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  onReset: () => void;
}

function ConfigSlider({
  label,
  value,
  defaultValue,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  onReset,
}: ConfigSliderProps) {
  const isModified = value !== defaultValue;
  const [textValue, setTextValue] = useState<string>(String(value));

  useEffect(() => {
    setTextValue(String(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextValue(raw);
    if (raw === '' || raw === '-') return;
    const val = parseFloat(raw);
    if (!isNaN(val)) {
      onChange(val);
    }
  };

  const handleBlur = () => {
    if (textValue === '' || isNaN(parseFloat(textValue))) {
      setTextValue(String(value));
    } else {
      const num = parseFloat(textValue);
      const clamped = Math.min(Math.max(num, min), max);
      setTextValue(String(clamped));
      if (clamped !== value) {
        onChange(clamped);
      }
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={isModified ? 'text-cyan-300 font-semibold' : 'text-neutral-300'}>
            {label}
          </span>
          {isModified && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Параметр изменён" />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isModified && (
            <button
              type="button"
              onClick={onReset}
              className="p-1 rounded text-neutral-400 hover:text-amber-300 hover:bg-white/10 cursor-pointer transition-colors"
              title={`Сбросить к исходному значению (${defaultValue}${unit})`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={textValue}
              onChange={handleTextChange}
              onBlur={handleBlur}
              className={`w-14 text-right font-mono font-bold text-[11px] border rounded px-1.5 py-0.5 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                isModified
                  ? 'text-cyan-300 bg-cyan-950/60 border-cyan-800/60 focus:border-cyan-400'
                  : 'text-neutral-300 bg-black/60 border-white/15 focus:border-white/30'
              }`}
              title="Введите значение вручную или двигайте ползунок"
            />
            {unit && (
              <span className="text-[10px] text-neutral-500 select-none pl-0.5">{unit}</span>
            )}
          </div>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
      />
    </div>
  );
}

/**
 * Вынесенный компонент выбора цвета с индивидуальным сбросом
 */
interface ConfigColorProps {
  label: string;
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
  onReset: () => void;
}

function ConfigColor({
  label,
  value,
  defaultValue,
  onChange,
  onReset,
}: ConfigColorProps) {
  const isModified = value.toLowerCase() !== defaultValue.toLowerCase();

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={isModified ? 'text-cyan-300 font-semibold' : 'text-neutral-300'}>
            {label}
          </span>
          {isModified && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Параметр изменён" />
          )}
        </div>
        {isModified && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-amber-300 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
            title={`Сбросить к исходному (${defaultValue})`}
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span className="text-[9.5px]">Сброс</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Индикатор цвета с нативным пикером */}
        <label
          className="w-6 h-6 rounded border border-white/20 shrink-0 cursor-pointer shadow-inner relative overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: value }}
          title="Кликните для выбора цвета"
        >
          <input
            type="color"
            value={value.startsWith('#') && value.length === 7 ? value : '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
            className="opacity-0 w-0 h-0 absolute cursor-pointer"
          />
        </label>
        {/* Текстовый ввод для hex / rgba */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-black/60 border border-white/15 focus:border-cyan-400 rounded px-2 py-0.5 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none"
        />
      </div>
      {/* Быстрые фишки из палитры */}
      <div className="flex items-center gap-1 overflow-x-auto pt-0.5 no-scrollbar">
        {quickColors.map((qc, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(qc.hex)}
            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 hover:scale-125 transition-transform cursor-pointer"
            style={{ backgroundColor: qc.hex }}
            title={`${qc.name}: ${qc.hex}`}
          />
        ))}
      </div>
    </div>
  );
}

export function SandboxControls({
  config,
  onChange,
  customPresets,
  onSavePreset,
  onDeletePreset,
  onSelectPreset,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('geometry');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  const update = <K extends keyof DrawerDesignConfig>(key: K, value: DrawerDesignConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const resetField = <K extends keyof DrawerDesignConfig>(key: K) => {
    onChange({ ...config, [key]: DEFAULT_CONFIG[key] });
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 1800);
  };

  const allPresets = [...BUILTIN_PRESETS, ...customPresets];

  // Проверка: изменен ли хоть один параметр по сравнению с DEFAULT_CONFIG
  const modifiedCount = (Object.keys(DEFAULT_CONFIG) as (keyof DrawerDesignConfig)[]).filter(
    (k) => String(config[k]).toLowerCase() !== String(DEFAULT_CONFIG[k]).toLowerCase()
  ).length;

  // Генерируем CSS-переменные
  const cssVariablesSnippet = `:root {
  --sb-drawer-bg: ${config.drawerBg};
  --sb-drawer-border: ${config.drawerBorderColor};
  --sb-drawer-padding: ${config.drawerPadding}px;
  --sb-card-bg: ${config.cardBg};
  --sb-card-border: ${config.cardBorderColor};
  --sb-card-radius: ${config.cardRadius}px;
  --sb-card-padding: ${config.cardPadding}px;
  --sb-section-gap: ${config.sectionGap}px;
  --sb-title-font-size: ${config.titleFontSize}px;
  --sb-title-color: ${config.titleColor};
  --sb-amount-font-size: ${config.amountFontSize}px;
  --sb-amount-color: ${config.amountColor};
  --sb-badge-radius: ${config.badgeRadius}px;
  --sb-cat-active-color: ${config.categoryActiveColor};
  --sb-cat-underline-color: ${config.categoryUnderlineColor};
}`;

  // Генерируем инструкцию для AI-агента
  const aiPromptSnippet = `Привет! Перенеси выбранный дизайн выпадающего меню (OrderRowDrawer) в основной код:
- Фон ящика: ${config.drawerBg}
- Рамка ящика: ${config.drawerBorderColor} (${config.drawerBorderWidth}px)
- Внутренний отступ ящика: ${config.drawerPadding}px
- Скругление карточек: ${config.cardRadius}px
- Отступ внутри карточек: ${config.cardPadding}px
- Фон карточек: ${config.cardBg}
- Рамка карточек: ${config.cardBorderColor} (${config.cardBorderWidth}px)
- Зазор между разделами: ${config.sectionGap}px
- Размер заголовков разделов: ${config.headerFontSize}px (${config.headerTextColor})
- Номер заказа: bg ${config.orderNumberBg}, color ${config.orderNumberColor}, border ${config.orderNumberBorder}, radius ${config.badgeRadius}px
- Бейдж расхода: bg ${config.badgeExpenseBg}, color ${config.badgeExpenseColor}, border ${config.badgeExpenseBorder}
- Инпут названия: ${config.titleFontSize}px, color ${config.titleColor}
- Категории: ${config.categoryColumns} колонки, размер ${config.categoryFontSize}px, активный цвет ${config.categoryActiveColor}, линия подчёркивания ${config.categoryUnderlineColor}
- Сумма расхода: ${config.amountFontSize}px, цвет ${config.amountColor}, суффикс ${config.amountSuffixColor}
- Кнопки сумм: активная bg ${config.presetActiveBg} / color ${config.presetActiveColor}, неактивная bg ${config.presetInactiveBg}
- Заметки: шрифт ${config.notesFontSize}px, min-h ${config.notesMinHeight}px`;

  return (
    <div className="flex flex-col h-full bg-neutral-950/80 border border-white/10 rounded-xl overflow-hidden font-mono select-none">
      {/* 1. Верхний бар пресетов */}
      <div className="p-3 border-b border-white/10 bg-neutral-900/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Готовые пресеты</span>
            {modifiedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                +{modifiedCount} изм.
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_CONFIG })}
              className="px-2 py-0.5 rounded text-[11px] text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
              title="Сбросить все параметры к исходному состоянию"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Сбросить всё
            </button>
            <button
              type="button"
              onClick={() => setIsSavingPreset(!isSavingPreset)}
              className="px-2 py-0.5 rounded text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 flex items-center gap-1 cursor-pointer transition-colors"
              title="Сохранить текущие параметры как новый пресет"
            >
              <BookmarkPlus className="w-2.5 h-2.5" />
              Сохранить
            </button>
          </div>
        </div>

        {/* Быстрое сохранение кастомного пресета */}
        <AnimatePresence>
          {isSavingPreset && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-1.5 pt-1 overflow-hidden"
            >
              <input
                type="text"
                autoFocus
                placeholder="Имя пресета (напр. Неон V2)..."
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPresetName.trim()) {
                    onSavePreset(newPresetName.trim());
                    setNewPresetName('');
                    setIsSavingPreset(false);
                  }
                }}
                className="flex-1 bg-black/80 border border-white/20 rounded px-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (newPresetName.trim()) {
                    onSavePreset(newPresetName.trim());
                    setNewPresetName('');
                    setIsSavingPreset(false);
                  }
                }}
                className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 rounded text-xs cursor-pointer font-bold"
              >
                ОК
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Список кнопок пресетов с горизонтальным скроллом */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {allPresets.map((pr) => (
            <div key={pr.id} className="relative group shrink-0 flex items-center">
              <button
                type="button"
                onClick={() => onSelectPreset(pr)}
                className="px-2.5 py-1 rounded text-xs bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/10 hover:border-white/20 cursor-pointer transition-colors"
                title={pr.description}
              >
                {pr.name}
              </button>
              {pr.isCustom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePreset(pr.id);
                  }}
                  className="ml-0.5 p-1 text-neutral-500 hover:text-rose-400 cursor-pointer"
                  title="Удалить пресет"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Табы категорий настроек */}
      <div className="flex border-b border-white/10 bg-neutral-900/30 text-xs overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('geometry')}
          className={`flex-1 min-w-[70px] py-2 px-1 text-center flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
            activeTab === 'geometry'
              ? 'border-cyan-400 text-white font-bold bg-white/5'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Сетка</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('colors')}
          className={`flex-1 min-w-[70px] py-2 px-1 text-center flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
            activeTab === 'colors'
              ? 'border-cyan-400 text-white font-bold bg-white/5'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Цвета</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('palette')}
          className={`flex-1 min-w-[75px] py-2 px-1 text-center flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
            activeTab === 'palette'
              ? 'border-cyan-400 text-white font-bold bg-white/5'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Палитра</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('badges')}
          className={`flex-1 min-w-[70px] py-2 px-1 text-center flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
            activeTab === 'badges'
              ? 'border-cyan-400 text-white font-bold bg-white/5'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Бейджи</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('finance')}
          className={`flex-1 min-w-[70px] py-2 px-1 text-center flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
            activeTab === 'finance'
              ? 'border-cyan-400 text-white font-bold bg-white/5'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Суммы</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('inputs')}
          className={`flex-1 min-w-[70px] py-2 px-1 text-center flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
            activeTab === 'inputs'
              ? 'border-cyan-400 text-white font-bold bg-white/5'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Инпуты</span>
        </button>
      </div>

      {/* 3. Содержимое активного таба (с удобной прокруткой) */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs font-mono">
        {/* ТАБ 1: ГЕОМЕТРИЯ И ОТСТУПЫ */}
        {activeTab === 'geometry' && (
          <div className="space-y-3.5">
            <ConfigSlider
              label="Внутренний отступ ящика (padding)"
              value={config.drawerPadding}
              defaultValue={DEFAULT_CONFIG.drawerPadding}
              min={4}
              max={32}
              unit="px"
              onChange={(v) => update('drawerPadding', v)}
              onReset={() => resetField('drawerPadding')}
            />
            <ConfigSlider
              label="Зазор между разделами 01-04 (gap)"
              value={config.sectionGap}
              defaultValue={DEFAULT_CONFIG.sectionGap}
              min={0}
              max={28}
              unit="px"
              onChange={(v) => update('sectionGap', v)}
              onReset={() => resetField('sectionGap')}
            />
            <ConfigSlider
              label="Внутренний отступ карточек (padding)"
              value={config.cardPadding}
              defaultValue={DEFAULT_CONFIG.cardPadding}
              min={4}
              max={28}
              unit="px"
              onChange={(v) => update('cardPadding', v)}
              onReset={() => resetField('cardPadding')}
            />
            <ConfigSlider
              label="Скругление карточек-разделов (radius)"
              value={config.cardRadius}
              defaultValue={DEFAULT_CONFIG.cardRadius}
              min={0}
              max={28}
              unit="px"
              onChange={(v) => update('cardRadius', v)}
              onReset={() => resetField('cardRadius')}
            />
            <ConfigSlider
              label="Скругление внешнего ящика"
              value={config.drawerRadius}
              defaultValue={DEFAULT_CONFIG.drawerRadius}
              min={0}
              max={24}
              unit="px"
              onChange={(v) => update('drawerRadius', v)}
              onReset={() => resetField('drawerRadius')}
            />
            <ConfigSlider
              label="Скругление бейджей (#ORD, Расход)"
              value={config.badgeRadius}
              defaultValue={DEFAULT_CONFIG.badgeRadius}
              min={0}
              max={16}
              unit="px"
              onChange={(v) => update('badgeRadius', v)}
              onReset={() => resetField('badgeRadius')}
            />
            <ConfigSlider
              label="Скругление кнопок сумм (500 ₽...)"
              value={config.presetRadius}
              defaultValue={DEFAULT_CONFIG.presetRadius}
              min={0}
              max={16}
              unit="px"
              onChange={(v) => update('presetRadius', v)}
              onReset={() => resetField('presetRadius')}
            />
            <ConfigSlider
              label="Толщина рамок карточек"
              value={config.cardBorderWidth}
              defaultValue={DEFAULT_CONFIG.cardBorderWidth}
              min={0}
              max={4}
              unit="px"
              onChange={(v) => update('cardBorderWidth', v)}
              onReset={() => resetField('cardBorderWidth')}
            />
            <ConfigSlider
              label="Толщина внешней рамки ящика"
              value={config.drawerBorderWidth}
              defaultValue={DEFAULT_CONFIG.drawerBorderWidth}
              min={0}
              max={4}
              unit="px"
              onChange={(v) => update('drawerBorderWidth', v)}
              onReset={() => resetField('drawerBorderWidth')}
            />
          </div>
        )}

        {/* ТАБ 2: ЦВЕТА И ПОВЕРХНОСТИ */}
        {activeTab === 'colors' && (
          <div className="space-y-3.5">
            <ConfigColor
              label="Фон основного ящика"
              value={config.drawerBg}
              defaultValue={DEFAULT_CONFIG.drawerBg}
              onChange={(v) => update('drawerBg', v)}
              onReset={() => resetField('drawerBg')}
            />
            <ConfigColor
              label="Рамка основного ящика"
              value={config.drawerBorderColor}
              defaultValue={DEFAULT_CONFIG.drawerBorderColor}
              onChange={(v) => update('drawerBorderColor', v)}
              onReset={() => resetField('drawerBorderColor')}
            />
            <ConfigColor
              label="Фон карточек (Разделы 01-04)"
              value={config.cardBg}
              defaultValue={DEFAULT_CONFIG.cardBg}
              onChange={(v) => update('cardBg', v)}
              onReset={() => resetField('cardBg')}
            />
            <ConfigColor
              label="Рамка карточек"
              value={config.cardBorderColor}
              defaultValue={DEFAULT_CONFIG.cardBorderColor}
              onChange={(v) => update('cardBorderColor', v)}
              onReset={() => resetField('cardBorderColor')}
            />
            <ConfigColor
              label="Линии разделителей внутри карточек"
              value={config.cardDividerColor}
              defaultValue={DEFAULT_CONFIG.cardDividerColor}
              onChange={(v) => update('cardDividerColor', v)}
              onReset={() => resetField('cardDividerColor')}
            />
          </div>
        )}

        {/* ТАБ: ФИРМЕННАЯ ПАЛИТРА 3D LABS */}
        {activeTab === 'palette' && (
          <div className="space-y-4">
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10 text-[11px] text-neutral-300 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Официальная палитра 3D Labs Cockpit</span>
              </div>
              Кликните <span className="text-cyan-400 font-semibold">HEX</span> чтобы скопировать цвет в буфер, либо нажмите кнопки быстрого применения к блокам.
            </div>

            {[
              { id: 'brand', title: '🏛 Фирменные Cockpit цвета' },
              { id: 'status', title: '⚡ Статусы и индикаторы' },
              { id: 'surfaces', title: '🌑 Поверхности и темные тона' },
              { id: 'typography', title: '🔲 Типографика и рамки' },
              { id: 'filaments', title: '🧵 Популярные филаменты (3D-печать)' },
            ].map((cat) => {
              const catColors = APP_PALETTE.filter((c) => c.category === cat.id);
              return (
                <div key={cat.id} className="space-y-2 pt-1">
                  <div className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider pb-1 border-b border-white/10">
                    {cat.title}
                  </div>
                  <div className="space-y-1.5">
                    {catColors.map((color) => (
                      <div
                        key={color.name}
                        className="p-2 rounded-lg bg-neutral-900/60 border border-white/10 hover:border-white/20 transition-all flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-inner"
                              style={{ backgroundColor: color.hex }}
                            />
                            <span className="font-semibold text-white truncate text-[11px]">
                              {color.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(color.hex, color.name)}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-cyan-300 border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Скопировать HEX"
                          >
                            {copiedType === color.name ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                            <span>{color.hex}</span>
                          </button>
                        </div>
                        <div className="text-[10px] text-neutral-500 leading-tight">
                          {color.description}
                        </div>
                        {/* Кнопки быстрого применения к дизайну */}
                        <div className="flex items-center gap-1 pt-1 flex-wrap text-[9.5px]">
                          <span className="text-neutral-500 mr-0.5">В дизайн:</span>
                          <button
                            type="button"
                            onClick={() => update('drawerBg', color.hex)}
                            className="px-1.5 py-0.2 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 cursor-pointer"
                          >
                            Ящик
                          </button>
                          <button
                            type="button"
                            onClick={() => update('cardBg', color.hex)}
                            className="px-1.5 py-0.2 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 cursor-pointer"
                          >
                            Карточки
                          </button>
                          <button
                            type="button"
                            onClick={() => update('cardBorderColor', color.hex)}
                            className="px-1.5 py-0.2 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 cursor-pointer"
                          >
                            Рамка
                          </button>
                          <button
                            type="button"
                            onClick={() => update('categoryUnderlineColor', color.hex)}
                            className="px-1.5 py-0.2 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 cursor-pointer"
                          >
                            Подчёркивание
                          </button>
                          <button
                            type="button"
                            onClick={() => update('amountColor', color.hex)}
                            className="px-1.5 py-0.2 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 cursor-pointer"
                          >
                            Сумма
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ТАБ 3: БЕЙДЖИ И ШАПКИ */}
        {activeTab === 'badges' && (
          <div className="space-y-3.5">
            <ConfigSlider
              label="Размер текста заголовков (РАЗДЕЛ 01...)"
              value={config.headerFontSize}
              defaultValue={DEFAULT_CONFIG.headerFontSize}
              min={8}
              max={14}
              step={0.5}
              unit="px"
              onChange={(v) => update('headerFontSize', v)}
              onReset={() => resetField('headerFontSize')}
            />
            <ConfigColor
              label="Цвет текста заголовков разделов"
              value={config.headerTextColor}
              defaultValue={DEFAULT_CONFIG.headerTextColor}
              onChange={(v) => update('headerTextColor', v)}
              onReset={() => resetField('headerTextColor')}
            />
            <div className="pt-2 border-t border-white/10 font-semibold text-neutral-400 uppercase text-[10px]">
              Бейдж номера заказа (#ORD-1030)
            </div>
            <ConfigColor
              label="Фон бейджа #ORD"
              value={config.orderNumberBg}
              defaultValue={DEFAULT_CONFIG.orderNumberBg}
              onChange={(v) => update('orderNumberBg', v)}
              onReset={() => resetField('orderNumberBg')}
            />
            <ConfigColor
              label="Текст бейджа #ORD"
              value={config.orderNumberColor}
              defaultValue={DEFAULT_CONFIG.orderNumberColor}
              onChange={(v) => update('orderNumberColor', v)}
              onReset={() => resetField('orderNumberColor')}
            />
            <ConfigColor
              label="Рамка бейджа #ORD"
              value={config.orderNumberBorder}
              defaultValue={DEFAULT_CONFIG.orderNumberBorder}
              onChange={(v) => update('orderNumberBorder', v)}
              onReset={() => resetField('orderNumberBorder')}
            />
            <div className="pt-2 border-t border-white/10 font-semibold text-neutral-400 uppercase text-[10px]">
              Бейдж типа списания (РАСХОД)
            </div>
            <ConfigColor
              label="Фон бейджа Расход"
              value={config.badgeExpenseBg}
              defaultValue={DEFAULT_CONFIG.badgeExpenseBg}
              onChange={(v) => update('badgeExpenseBg', v)}
              onReset={() => resetField('badgeExpenseBg')}
            />
            <ConfigColor
              label="Текст бейджа Расход"
              value={config.badgeExpenseColor}
              defaultValue={DEFAULT_CONFIG.badgeExpenseColor}
              onChange={(v) => update('badgeExpenseColor', v)}
              onReset={() => resetField('badgeExpenseColor')}
            />
            <ConfigColor
              label="Рамка бейджа Расход"
              value={config.badgeExpenseBorder}
              defaultValue={DEFAULT_CONFIG.badgeExpenseBorder}
              onChange={(v) => update('badgeExpenseBorder', v)}
              onReset={() => resetField('badgeExpenseBorder')}
            />
            <div className="pt-2 border-t border-white/10 font-semibold text-neutral-400 uppercase text-[10px]">
              Кнопка выбора даты
            </div>
            <ConfigColor
              label="Фон кнопки ДАТА"
              value={config.dateButtonBg}
              defaultValue={DEFAULT_CONFIG.dateButtonBg}
              onChange={(v) => update('dateButtonBg', v)}
              onReset={() => resetField('dateButtonBg')}
            />
            <ConfigColor
              label="Рамка кнопки ДАТА"
              value={config.dateButtonBorder}
              defaultValue={DEFAULT_CONFIG.dateButtonBorder}
              onChange={(v) => update('dateButtonBorder', v)}
              onReset={() => resetField('dateButtonBorder')}
            />
          </div>
        )}

        {/* ТАБ 4: СУММЫ, КАТЕГОРИИ И ПРЕСЕТЫ */}
        {activeTab === 'finance' && (
          <div className="space-y-3.5">
            <ConfigSlider
              label="Размер шрифта суммы списания"
              value={config.amountFontSize}
              defaultValue={DEFAULT_CONFIG.amountFontSize}
              min={24}
              max={56}
              unit="px"
              onChange={(v) => update('amountFontSize', v)}
              onReset={() => resetField('amountFontSize')}
            />
            <ConfigColor
              label="Цвет цифр суммы списания"
              value={config.amountColor}
              defaultValue={DEFAULT_CONFIG.amountColor}
              onChange={(v) => update('amountColor', v)}
              onReset={() => resetField('amountColor')}
            />
            <ConfigColor
              label="Цвет суффикса «₽ расход»"
              value={config.amountSuffixColor}
              defaultValue={DEFAULT_CONFIG.amountSuffixColor}
              onChange={(v) => update('amountSuffixColor', v)}
              onReset={() => resetField('amountSuffixColor')}
            />
            <ConfigSlider
              label="Размер суффикса «₽ расход»"
              value={config.amountSuffixFontSize}
              defaultValue={DEFAULT_CONFIG.amountSuffixFontSize}
              min={12}
              max={24}
              unit="px"
              onChange={(v) => update('amountSuffixFontSize', v)}
              onReset={() => resetField('amountSuffixFontSize')}
            />

            <div className="pt-2 border-t border-white/10 font-semibold text-neutral-400 uppercase text-[10px]">
              Сетка категорий затрат
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className={config.categoryColumns !== DEFAULT_CONFIG.categoryColumns ? 'text-cyan-300 font-semibold' : 'text-neutral-400'}>
                    Количество колонок категорий
                  </span>
                  {config.categoryColumns !== DEFAULT_CONFIG.categoryColumns && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Параметр изменён" />
                  )}
                </div>
                {config.categoryColumns !== DEFAULT_CONFIG.categoryColumns && (
                  <button
                    type="button"
                    onClick={() => resetField('categoryColumns')}
                    className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-amber-300 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                    title={`Сбросить к исходному (${DEFAULT_CONFIG.categoryColumns} колонки)`}
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span className="text-[9.5px]">Сброс</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                {[2, 3, 4].map((cols) => (
                  <button
                    key={cols}
                    type="button"
                    onClick={() => update('categoryColumns', cols)}
                    className={`flex-1 py-1 rounded text-xs cursor-pointer border ${
                      config.categoryColumns === cols
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                        : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {cols} колонки
                  </button>
                ))}
              </div>
            </div>
            <ConfigSlider
              label="Размер шрифта категорий"
              value={config.categoryFontSize}
              defaultValue={DEFAULT_CONFIG.categoryFontSize}
              min={10}
              max={16}
              step={0.5}
              unit="px"
              onChange={(v) => update('categoryFontSize', v)}
              onReset={() => resetField('categoryFontSize')}
            />
            <ConfigColor
              label="Цвет неактивной категории"
              value={config.categoryInactiveColor}
              defaultValue={DEFAULT_CONFIG.categoryInactiveColor}
              onChange={(v) => update('categoryInactiveColor', v)}
              onReset={() => resetField('categoryInactiveColor')}
            />
            <ConfigColor
              label="Цвет выбранной категории"
              value={config.categoryActiveColor}
              defaultValue={DEFAULT_CONFIG.categoryActiveColor}
              onChange={(v) => update('categoryActiveColor', v)}
              onReset={() => resetField('categoryActiveColor')}
            />
            <ConfigColor
              label="Цвет подчёркивания (Hand-drawn)"
              value={config.categoryUnderlineColor}
              defaultValue={DEFAULT_CONFIG.categoryUnderlineColor}
              onChange={(v) => update('categoryUnderlineColor', v)}
              onReset={() => resetField('categoryUnderlineColor')}
            />

            <div className="pt-2 border-t border-white/10 font-semibold text-neutral-400 uppercase text-[10px]">
              Кнопки сумм (500 ₽, 1000 ₽...)
            </div>
            <ConfigColor
              label="Фон активной кнопки суммы"
              value={config.presetActiveBg}
              defaultValue={DEFAULT_CONFIG.presetActiveBg}
              onChange={(v) => update('presetActiveBg', v)}
              onReset={() => resetField('presetActiveBg')}
            />
            <ConfigColor
              label="Текст активной кнопки суммы"
              value={config.presetActiveColor}
              defaultValue={DEFAULT_CONFIG.presetActiveColor}
              onChange={(v) => update('presetActiveColor', v)}
              onReset={() => resetField('presetActiveColor')}
            />
            <ConfigColor
              label="Рамка активной кнопки суммы"
              value={config.presetActiveBorder}
              defaultValue={DEFAULT_CONFIG.presetActiveBorder}
              onChange={(v) => update('presetActiveBorder', v)}
              onReset={() => resetField('presetActiveBorder')}
            />
            <ConfigColor
              label="Фон неактивной кнопки суммы"
              value={config.presetInactiveBg}
              defaultValue={DEFAULT_CONFIG.presetInactiveBg}
              onChange={(v) => update('presetInactiveBg', v)}
              onReset={() => resetField('presetInactiveBg')}
            />
            <ConfigColor
              label="Текст неактивной кнопки суммы"
              value={config.presetInactiveColor}
              defaultValue={DEFAULT_CONFIG.presetInactiveColor}
              onChange={(v) => update('presetInactiveColor', v)}
              onReset={() => resetField('presetInactiveColor')}
            />
          </div>
        )}

        {/* ТАБ 5: ИНПУТЫ И ЗАМЕТКИ */}
        {activeTab === 'inputs' && (
          <div className="space-y-3.5">
            <ConfigSlider
              label="Размер шрифта названия расхода"
              value={config.titleFontSize}
              defaultValue={DEFAULT_CONFIG.titleFontSize}
              min={13}
              max={26}
              unit="px"
              onChange={(v) => update('titleFontSize', v)}
              onReset={() => resetField('titleFontSize')}
            />
            <ConfigColor
              label="Цвет текста названия"
              value={config.titleColor}
              defaultValue={DEFAULT_CONFIG.titleColor}
              onChange={(v) => update('titleColor', v)}
              onReset={() => resetField('titleColor')}
            />
            <ConfigColor
              label="Цвет плейсхолдера названия"
              value={config.titlePlaceholderColor}
              defaultValue={DEFAULT_CONFIG.titlePlaceholderColor}
              onChange={(v) => update('titlePlaceholderColor', v)}
              onReset={() => resetField('titlePlaceholderColor')}
            />

            <div className="pt-2 border-t border-white/10 font-semibold text-neutral-400 uppercase text-[10px]">
              Поле поиска категории
            </div>
            <ConfigColor
              label="Фон поля поиска"
              value={config.searchBg}
              defaultValue={DEFAULT_CONFIG.searchBg}
              onChange={(v) => update('searchBg', v)}
              onReset={() => resetField('searchBg')}
            />
            <ConfigColor
              label="Рамка поля поиска"
              value={config.searchBorder}
              defaultValue={DEFAULT_CONFIG.searchBorder}
              onChange={(v) => update('searchBorder', v)}
              onReset={() => resetField('searchBorder')}
            />
            <ConfigSlider
              label="Скругление поля поиска"
              value={config.searchRadius}
              defaultValue={DEFAULT_CONFIG.searchRadius}
              min={2}
              max={16}
              unit="px"
              onChange={(v) => update('searchRadius', v)}
              onReset={() => resetField('searchRadius')}
            />

            <div className="pt-2 border-t border-white/10 font-semibold text-neutral-400 uppercase text-[10px]">
              Раздел 04: Заметки и чек
            </div>
            <ConfigSlider
              label="Размер шрифта заметок"
              value={config.notesFontSize}
              defaultValue={DEFAULT_CONFIG.notesFontSize}
              min={10}
              max={16}
              unit="px"
              onChange={(v) => update('notesFontSize', v)}
              onReset={() => resetField('notesFontSize')}
            />
            <ConfigColor
              label="Цвет текста заметок"
              value={config.notesColor}
              defaultValue={DEFAULT_CONFIG.notesColor}
              onChange={(v) => update('notesColor', v)}
              onReset={() => resetField('notesColor')}
            />
            <ConfigSlider
              label="Минимальная высота поля заметок"
              value={config.notesMinHeight}
              defaultValue={DEFAULT_CONFIG.notesMinHeight}
              min={32}
              max={120}
              unit="px"
              onChange={(v) => update('notesMinHeight', v)}
              onReset={() => resetField('notesMinHeight')}
            />
          </div>
        )}
      </div>

      {/* 4. Нижняя панель действий: Экспорт / Скопировать стили */}
      <div className="p-3 border-t border-white/10 bg-neutral-900/60 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExportOpen(true)}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>[ Экспорт и код дизайна ]</span>
        </button>
      </div>

      {/* Модальное окно экспорта кода */}
      <AnimatePresence>
        {isExportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-neutral-950 border border-white/20 rounded-2xl p-5 space-y-4 shadow-2xl font-mono text-xs max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-sm text-white">Экспорт готового дизайна</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportOpen(false)}
                  className="p-1 text-neutral-400 hover:text-white cursor-pointer rounded hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* 1. Промпт для AI-ассистента */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="font-semibold text-cyan-300 uppercase tracking-wider text-[11px]">
                      1. Текст для AI-агента (чтобы сразу внедрить в код):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(aiPromptSnippet, 'ai')}
                      className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer bg-white/5 px-2 py-0.5 rounded border border-white/10"
                    >
                      {copiedType === 'ai' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedType === 'ai' ? 'Скопировано!' : 'Скопировать'}
                    </button>
                  </div>
                  <pre className="p-2.5 bg-black/80 border border-white/10 rounded-lg text-[11px] text-neutral-300 overflow-x-auto whitespace-pre-wrap select-text">
                    {aiPromptSnippet}
                  </pre>
                </div>

                {/* 2. CSS-переменные */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                      2. CSS-переменные:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(cssVariablesSnippet, 'css')}
                      className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer bg-white/5 px-2 py-0.5 rounded border border-white/10"
                    >
                      {copiedType === 'css' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedType === 'css' ? 'Скопировано!' : 'Скопировать'}
                    </button>
                  </div>
                  <pre className="p-2.5 bg-black/80 border border-white/10 rounded-lg text-[11px] text-neutral-400 overflow-x-auto select-text">
                    {cssVariablesSnippet}
                  </pre>
                </div>

                {/* 3. JSON конфигурация */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                      3. JSON конфигурации (для сохранения):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(config, null, 2), 'json')}
                      className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer bg-white/5 px-2 py-0.5 rounded border border-white/10"
                    >
                      {copiedType === 'json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedType === 'json' ? 'Скопировано!' : 'Скопировать'}
                    </button>
                  </div>
                  <pre className="p-2.5 bg-black/80 border border-white/10 rounded-lg text-[10px] text-neutral-500 overflow-x-auto max-h-36 select-text">
                    {JSON.stringify(config, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsExportOpen(false)}
                  className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
