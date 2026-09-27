'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Check, Tag, ChevronDown, Wrench, Package, Calendar } from 'lucide-react';
import { DrawerDesignConfig } from '../types';
import { Order } from '@/shared/types';
import { SAMPLE_EXPENSE_CATEGORIES } from '../defaults';

interface Props {
  config: DrawerDesignConfig;
  order: Order;
  onOrderChange: (order: Order) => void;
}

/**
 * Рукописное подчёркивание с настраиваемым цветом через Motion
 */
function HandDrawnUnderline({
  isSelected,
  color = '#ffffff',
}: {
  isSelected: boolean;
  color?: string;
}) {
  return (
    <AnimatePresence>
      {isSelected && (
        <motion.svg
          className="absolute -bottom-1 left-0 w-full h-[5px] pointer-events-none overflow-visible z-10"
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.path
            d="M 1,4 C 25,6.5 75,2.5 99,5"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              visible: {
                pathLength: 1,
                opacity: 1,
                transition: {
                  pathLength: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
                  opacity: { duration: 0.08 },
                },
              },
              exit: {
                pathLength: 0,
                opacity: 0,
                transition: {
                  pathLength: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 0.08 },
                },
              },
            }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  );
}

export function CustomizableOrderDrawer({ config, order, onOrderChange }: Props) {
  const isExpense = order.type === 'expense';
  const [expenseCatSearch, setExpenseCatSearch] = useState('');
  const [categories, setCategories] = useState<string[]>(SAMPLE_EXPENSE_CATEGORIES);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [savedBadge, setSavedBadge] = useState(false);

  const triggerSaved = () => {
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 1400);
  };

  const filteredCategories = useMemo(() => {
    if (!expenseCatSearch.trim()) return categories;
    return categories.filter((c) =>
      c.toLowerCase().includes(expenseCatSearch.toLowerCase().trim())
    );
  }, [categories, expenseCatSearch]);

  const handleAddCategory = () => {
    const val = newCatInput.trim();
    if (!val) return;
    if (!categories.includes(val)) {
      setCategories((prev) => [val, ...prev]);
      onOrderChange({ ...order, client: val });
    }
    setNewCatInput('');
    setIsAddingCat(false);
    triggerSaved();
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: config.cardBg,
    borderColor: config.cardBorderColor,
    borderWidth: `${config.cardBorderWidth}px`,
    borderStyle: 'solid',
    borderRadius: `${config.cardRadius}px`,
    padding: `${config.cardPadding}px`,
  };

  const headerStyle: React.CSSProperties = {
    fontSize: `${config.headerFontSize}px`,
    color: config.headerTextColor,
    letterSpacing: `${config.headerTracking}px`,
    fontWeight: config.headerFontWeight,
    borderBottomColor: config.cardDividerColor,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
  };

  return (
    <div
      className="font-mono text-xs select-none transition-all duration-200"
      style={{
        backgroundColor: config.drawerBg,
        borderColor: config.drawerBorderColor,
        borderWidth: `${config.drawerBorderWidth}px`,
        borderStyle: 'solid',
        borderRadius: `${config.drawerRadius}px`,
        padding: `${config.drawerPadding}px`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${config.sectionGap}px` }}>
        {/* ========================================================================= */}
        {/* РАЗДЕЛ 01 · НАИМЕНОВАНИЕ И ПАРАМЕТРЫ                                     */}
        {/* ========================================================================= */}
        <div style={cardStyle} className="space-y-2">
          <div className="flex items-center justify-between pb-1" style={headerStyle}>
            <span className="uppercase">
              {isExpense ? 'РАЗДЕЛ 01 · НАИМЕНОВАНИЕ И ПАРАМЕТРЫ РАСХОДА' : 'РАЗДЕЛ 01 · ИЗДЕЛИЕ И ПАРАМЕТРЫ ЗАКАЗА'}
            </span>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {savedBadge && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="h-5 px-1.5 rounded text-[9.5px] font-bold border flex items-center gap-1 shrink-0 bg-emerald-950/70 text-emerald-400 border-emerald-800/50"
                  >
                    <Check className="w-2.5 h-2.5" />
                    СОХРАНЕНО
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="text-[9px] font-mono text-neutral-500">
                позиция #{order.order_number}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 min-h-[36px] pt-0.5 flex-wrap sm:flex-nowrap">
            {/* Номер заказа */}
            <span
              className="h-8 flex items-center justify-center font-mono text-xs font-bold px-2.5 tracking-wider shrink-0 transition-colors"
              style={{
                backgroundColor: config.orderNumberBg,
                color: config.orderNumberColor,
                borderColor: config.orderNumberBorder,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: `${config.badgeRadius}px`,
              }}
            >
              #{order.order_number}
            </span>

            {/* Тип Расход / Доход */}
            <span
              className="h-8 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider px-2.5 shrink-0 transition-colors"
              style={{
                backgroundColor: isExpense ? config.badgeExpenseBg : config.badgeIncomeBg,
                color: isExpense ? config.badgeExpenseColor : config.badgeIncomeColor,
                borderColor: isExpense ? config.badgeExpenseBorder : config.badgeIncomeBorder,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: `${config.badgeRadius}px`,
              }}
            >
              {isExpense ? 'РАСХОД' : 'ДОХОД'}
            </span>

            {/* Название */}
            <div className="flex-1 min-w-[160px]">
              <input
                type="text"
                placeholder={isExpense ? "Введите наименование расхода..." : "Введите наименование изделия..."}
                value={order.title || ''}
                onChange={(e) => onOrderChange({ ...order, title: e.target.value })}
                onBlur={triggerSaved}
                className="w-full bg-transparent border-none focus:outline-none p-0 tracking-tight font-mono transition-colors"
                style={{
                  fontSize: `${config.titleFontSize}px`,
                  color: config.titleColor,
                  fontWeight: config.titleFontWeight,
                }}
              />
            </div>

            {/* Дата */}
            <div
              className="h-8 flex items-center gap-1.5 px-2 text-[10.5px] select-none shrink-0 transition-colors"
              style={{
                backgroundColor: config.dateButtonBg,
                borderColor: config.dateButtonBorder,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: `${config.dateButtonRadius}px`,
                color: config.dateButtonColor,
              }}
            >
              <span className="text-[9.5px] font-mono uppercase opacity-60">ДАТА:</span>
              <span className="font-mono text-[11px] font-semibold text-white">
                {order.date || '20.08.2026'}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ДВУХКОЛОНОЧНЫЙ БЛОК: РАЗДЕЛ 02 + РАЗДЕЛ 03                                */}
        {/* ========================================================================= */}
        {isExpense ? (
          <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: `${config.sectionGap}px` }}>
            {/* РАЗДЕЛ 02 · КАТЕГОРИЯ ЗАТРАТ (7 колонок) */}
            <div
              style={cardStyle}
              className="flex flex-col justify-between space-y-2.5 lg:col-span-7"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1" style={headerStyle}>
                  <span className="uppercase">РАЗДЕЛ 02 · КАТЕГОРИЯ ЗАТРАТ</span>
                </div>

                {/* Поиск */}
                <div className="relative w-full max-w-sm pt-0.5 pb-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: config.searchPlaceholderColor }} />
                  <input
                    type="text"
                    placeholder="Поиск категории..."
                    value={expenseCatSearch}
                    onChange={(e) => setExpenseCatSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1 text-xs font-mono focus:outline-none transition-colors"
                    style={{
                      backgroundColor: config.searchBg,
                      borderColor: config.searchBorder,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderRadius: `${config.searchRadius}px`,
                      color: config.searchTextColor,
                    }}
                  />
                  {expenseCatSearch && (
                    <button
                      type="button"
                      onClick={() => setExpenseCatSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Сетка категорий */}
                <div
                  className="grid pt-0.5 font-mono select-none"
                  style={{
                    gridTemplateColumns: `repeat(${config.categoryColumns}, minmax(0, 1fr))`,
                    columnGap: `${config.categoryGapX}px`,
                    rowGap: `${config.categoryGapY}px`,
                    fontSize: `${config.categoryFontSize}px`,
                  }}
                >
                  {filteredCategories.map((catLabel) => {
                    const isSelected = (order.client || 'Химия и изопропанол') === catLabel;
                    return (
                      <div key={catLabel} className="flex items-center gap-1 group min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            onOrderChange({ ...order, client: catLabel });
                            triggerSaved();
                          }}
                          className="text-left font-mono cursor-pointer py-0.5 inline-flex items-center gap-1.5 transition-colors"
                          style={{
                            color: isSelected ? config.categoryActiveColor : config.categoryInactiveColor,
                            fontWeight: isSelected ? 'bold' : 'normal',
                          }}
                        >
                          <span className="relative inline-flex items-center">
                            <span>{catLabel}</span>
                            <HandDrawnUnderline isSelected={isSelected} color={config.categoryUnderlineColor} />
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Добавить свою категорию */}
              <div className="pt-2 font-mono border-t" style={{ borderColor: config.cardDividerColor }}>
                {isAddingCat ? (
                  <div className="flex items-center gap-2 max-w-sm pt-1">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Название категории..."
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCategory();
                        if (e.key === 'Escape') setIsAddingCat(false);
                      }}
                      className="flex-1 bg-black/60 border border-white/20 rounded px-2.5 py-1 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="p-1 text-emerald-400 hover:text-white cursor-pointer rounded hover:bg-white/10"
                      title="Добавить"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCat(false)}
                      className="p-1 text-neutral-400 hover:text-white cursor-pointer rounded hover:bg-white/10"
                      title="Отмена"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCat(true)}
                    className="text-xs font-mono cursor-pointer inline-flex items-center gap-1 pt-1 transition-colors group"
                    style={{ color: config.addCategoryColor }}
                  >
                    <span className="font-bold">+</span>
                    <span className="border-b border-dashed border-current pb-0.5 group-hover:opacity-100">
                      Добавить свою категорию в список
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* РАЗДЕЛ 03 · СУММА СПИСАНИЯ (5 колонок) */}
            <div
              style={cardStyle}
              className="flex flex-col justify-between space-y-2 lg:col-span-5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1" style={headerStyle}>
                  <span className="uppercase">РАЗДЕЛ 03 · СУММА СПИСАНИЯ</span>
                </div>

                <div className="space-y-3 pt-1 font-mono">
                  {/* Сумма списания */}
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: config.financeLabelColor }}>
                      СУММА СПИСАНИЯ
                    </div>
                    <div className="flex items-baseline gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={order.amount ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value.replace(/[^\d]/g, '')) || 0;
                          onOrderChange({ ...order, amount: val, payment: val });
                        }}
                        onBlur={triggerSaved}
                        className="font-mono tracking-tight bg-transparent border-none focus:outline-none p-0 inline-block cursor-text transition-colors"
                        style={{
                          fontSize: `${config.amountFontSize}px`,
                          color: config.amountColor,
                          fontWeight: config.amountFontWeight,
                          width: `${Math.max(1, String(order.amount || 0).length) * 0.65 + 0.15}em`,
                        }}
                      />
                      <span
                        className="font-mono select-none font-medium transition-colors"
                        style={{
                          color: config.amountSuffixColor,
                          fontSize: `${config.amountSuffixFontSize}px`,
                        }}
                      >
                        ₽ расход
                      </span>
                    </div>
                  </div>

                  {/* Пресеты сумм */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {[500, 1000, 2000, 3000, 5000, 10000].map((presetAmt) => {
                      const isSelected = Number(order.amount) === presetAmt;
                      return (
                        <button
                          key={presetAmt}
                          type="button"
                          onClick={() => {
                            onOrderChange({ ...order, amount: presetAmt, payment: presetAmt });
                            triggerSaved();
                          }}
                          className="px-2 py-0.5 text-xs font-mono cursor-pointer transition-all"
                          style={{
                            backgroundColor: isSelected ? config.presetActiveBg : config.presetInactiveBg,
                            color: isSelected ? config.presetActiveColor : config.presetInactiveColor,
                            borderColor: isSelected ? config.presetActiveBorder : config.presetInactiveBorder,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderRadius: `${config.presetRadius}px`,
                            fontWeight: isSelected ? 'bold' : 'normal',
                          }}
                        >
                          {presetAmt.toLocaleString('ru-RU')} ₽
                        </button>
                      );
                    })}
                  </div>

                  {/* Финансовая сводка */}
                  <div
                    className="pt-2.5 space-y-1.5 text-xs font-mono border-t"
                    style={{ borderColor: config.cardDividerColor }}
                  >
                    <div className="flex items-center justify-between" style={{ color: config.financeLabelColor }}>
                      <span>Влияние на кассу:</span>
                      <span className="font-bold font-mono" style={{ color: config.financeValueColor }}>
                        -{(order.amount || 0).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <div className="flex items-center justify-between" style={{ color: config.financeLabelColor }}>
                      <span>Статья затрат:</span>
                      <span className="text-neutral-300 truncate max-w-[200px]">
                        {order.client || 'Химия и изопропанол'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Подвал */}
              <div
                className="pt-2 flex items-center justify-between text-[10px] font-mono border-t"
                style={{ borderColor: config.cardDividerColor }}
              >
                <span style={{ color: config.statusLabelColor }}>СТАТУС СПИСАНИЯ</span>
                <span className="font-medium" style={{ color: config.statusValueColor }}>
                  Расход учтён в кассе
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* РЕЖИМ ДОХОД (Для тестирования обычных заказов) */
          <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: `${config.sectionGap}px` }}>
            <div style={cardStyle} className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between pb-1" style={headerStyle}>
                <span className="uppercase">РАЗДЕЛ 02 · ЗАКАЗЧИК И КАНАЛ СВЯЗИ</span>
              </div>
              <div className="space-y-1 pt-1">
                <div className="text-[10px] uppercase font-semibold text-neutral-400">ИМЯ КЛИЕНТА</div>
                <input
                  type="text"
                  value={order.client_name || ''}
                  onChange={(e) => onOrderChange({ ...order, client_name: e.target.value })}
                  placeholder="Введите имя клиента..."
                  className="w-full bg-transparent border-none focus:outline-none p-0 text-base font-mono text-white placeholder-neutral-500"
                />
              </div>
            </div>

            <div style={cardStyle} className="lg:col-span-5 space-y-2">
              <div className="flex items-center justify-between pb-1" style={headerStyle}>
                <span className="uppercase">РАЗДЕЛ 03 · ФИНАНСЫ И СТОИМОСТЬ</span>
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span
                  className="font-mono"
                  style={{
                    fontSize: `${config.amountFontSize}px`,
                    color: config.amountColor,
                    fontWeight: config.amountFontWeight,
                  }}
                >
                  {(order.amount || 0).toLocaleString('ru-RU')}
                </span>
                <span className="text-emerald-400 text-sm font-bold font-mono">₽ доход</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* РАЗДЕЛ 04 · ЗАМЕТКИ, ЧЕК И ТРЕКИНГ ЗАКУПКИ                              */}
        {/* ========================================================================= */}
        <div style={cardStyle} className="space-y-1.5">
          <div className="flex items-center justify-between pb-1" style={headerStyle}>
            <span className="uppercase">
              {isExpense ? 'РАЗДЕЛ 04 · ЗАМЕТКИ, ЧЕК И ТРЕКИНГ ЗАКУПКИ' : 'РАЗДЕЛ 04 · ЗАМЕТКИ И ПАРАМЕТРЫ ПЕЧАТИ'}
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] font-mono text-neutral-500">
                {(order.notes || '').length} симв.
              </span>
            </div>
          </div>

          <div className="pt-0.5">
            <textarea
              value={order.notes || ''}
              onChange={(e) => onOrderChange({ ...order, notes: e.target.value })}
              onBlur={triggerSaved}
              placeholder={isExpense ? "Номер накладной, трек-номер посылки, чек, ссылка на товар..." : "Детали заказа..."}
              rows={2}
              className="w-full bg-transparent border-none focus:outline-none p-0 tracking-tight font-mono resize-y leading-relaxed transition-colors"
              style={{
                fontSize: `${config.notesFontSize}px`,
                color: config.notesColor,
                minHeight: `${config.notesMinHeight}px`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
