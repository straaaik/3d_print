import React from 'react';
import {
  Order,
  OrderStatus,
  SortField,
  SortOrder,
  SavedCalculation,
  OrderTypeFilter,
  PaymentFilter
} from '../../types';
import { OrdersV2KpiCards } from './OrdersV2KpiCards';
import { OrdersV2FilterBar } from './OrdersV2FilterBar';
import { OrdersV2Table } from './OrdersV2Table';
import { formatMonthKeyLabel } from '../../helpers';
import { RotateCcw, CalendarPlus, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { CockpitButton } from '@/shared/ui/CockpitButton';
import { Tooltip } from '@/shared/ui/Tooltip';
import { usePixelCurtain } from '@/shared/ui/PixelCurtain';
import { CockpitContentTransition } from '@/shared/ui/CockpitContentTransition';
import { MotionPulse } from '@/shared/ui/MotionPrimitives';
import { motion, useReducedMotion } from 'motion/react';
import { ROW_ELEVATION_EASE, SURFACE_FADE_DURATION } from '@/shared/lib/tableScrollHelper';

const SURFACE_EASE = ROW_ELEVATION_EASE;

interface OrdersV2ViewProps {
  isOnline: boolean;
  orders: Order[];
  sortedOrders: Order[];
  visibleOrders: Order[];
  visibleCount: number;
  totalOrdersCount: number;
  onLoadMore: () => void;
  onShowAll: () => void;
  onOpenNewMonthModal?: () => void;

  // KPI метрики
  totalIncome: number;
  totalExpenses: number;
  netProfitTotal: number;
  totalMarginPercent: number;
  inProgressCount: number;
  printingCount: number;
  waitingCount: number;
  completedCount: number;
  incomeOrdersCount: number;
  unpaidSum: number;
  unpaidOrdersCount: number;
  currentMonthGoal: number;
  onOpenGoalModal: () => void;

  // Фильтры и поиск
  selectedMonthKey: string;
  setSelectedMonthKey: (key: string) => void;
  availableMonthKeys: string[];
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  monthOrdersCount: number;
  onOpenClearMonthModal: () => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  typeFilter: OrderTypeFilter;
  setTypeFilter: (filter: OrderTypeFilter) => void;

  clientFilter: string;
  setClientFilter: (client: string) => void;

  paymentFilter: PaymentFilter;
  setPaymentFilter: (payment: PaymentFilter) => void;

  totalFilteredCount: number;
  expenseCount: number;

  // Таблица и сортировка
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;

  // История действий
  onUndo: () => void;
  canUndo: boolean;

  // Действия и модальные окна
  onOpenEditModal: (order: Order) => void;
  onOpenAddModal: () => void;
  onUpdateStatus: (order: Order, newStatus: OrderStatus) => void;
  onToggleType: (order: Order) => void;
  onDuplicateOrder: (order: Order) => void;
  onRequestDelete: (order: Order) => void;
  onInlineUpdate: (orderId: string, updates: Partial<Order>) => void;
  savedCalculations?: SavedCalculation[];

  // Расширенный режим (Full-screen)
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  onResetFilters?: () => void;

  // Контекстное меню
  contextMenu: { x: number; y: number; order: Order } | null;
  setContextMenu: (menu: { x: number; y: number; order: Order } | null) => void;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  onCopyContact: (text: string) => void;
}

export const OrdersV2View = React.memo(function OrdersV2View({
  isOnline,
  orders,
  sortedOrders,
  visibleOrders,
  visibleCount,
  onLoadMore,
  onShowAll,
  onOpenNewMonthModal,
  totalIncome,
  totalExpenses,
  netProfitTotal,
  totalMarginPercent,
  inProgressCount,
  printingCount,
  waitingCount,
  completedCount,
  incomeOrdersCount,
  unpaidSum,
  unpaidOrdersCount,
  currentMonthGoal,
  onOpenGoalModal,
  selectedMonthKey,
  setSelectedMonthKey,
  availableMonthKeys,
  handlePrevMonth,
  handleNextMonth,
  monthOrdersCount,
  onOpenClearMonthModal,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  clientFilter,
  setClientFilter,
  paymentFilter,
  setPaymentFilter,
  totalFilteredCount,
  expenseCount,
  sortField,
  sortOrder,
  onSort,
  onUndo,
  canUndo,
  onOpenEditModal,
  onOpenAddModal,
  onUpdateStatus,
  onToggleType,
  onDuplicateOrder,
  onRequestDelete,
  onInlineUpdate,
  savedCalculations,
  isExpanded = false,
  onToggleExpand,
  contextMenu,
  setContextMenu,
  contextMenuRef,
  onCopyContact,
}: OrdersV2ViewProps) {
  const { navigate: curtainNavigate } = usePixelCurtain();
  const monthLabel = formatMonthKeyLabel(selectedMonthKey);
  const [isSideWingOpen, setIsSideWingOpen] = React.useState(true);
  const [elevatedOrder, setElevatedOrder] = React.useState<Order | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const surfaceTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: SURFACE_FADE_DURATION, ease: SURFACE_EASE };

  React.useEffect(() => {
    if (elevatedOrder && !orders.some((o) => o.id === elevatedOrder.id)) {
      setElevatedOrder(null);
    }
  }, [elevatedOrder, orders]);

  React.useEffect(() => {
    if (!elevatedOrder) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setElevatedOrder(null);
    };
    const handleGlobalClick = () => {
      setElevatedOrder(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      window.addEventListener('click', handleGlobalClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [elevatedOrder]);

  return (
    <div className={`w-full mx-auto select-none font-sans relative ${
      isExpanded ? 'max-w-none' : 'max-w-[1500px]'
    }`}>

      {/* ПЛАВАЮЩЕЕ БОКОВОЕ МЕНЮ (ФИКСИРУЕТСЯ НА ЭКРАНЕ ПРИ СКРОЛЛЕ, СКРЫВАЕТСЯ В РАЗВЕРНУТОМ РЕЖИМЕ) */}
      {!isExpanded && (
        <motion.div
          initial={false}
          animate={{
            opacity: elevatedOrder ? 0.35 : 1,
          }}
          transition={surfaceTransition}
          className={`hidden xl:block absolute left-0 top-24 bottom-0 z-30 ${
            elevatedOrder ? 'pointer-events-none select-none' : 'pointer-events-none'
          }`}
        >
          <div className="sticky top-28 pointer-events-auto">
            <aside
              className={`flex flex-col gap-2 rounded-l-2xl border-l border-y border-white/20 bg-neutral-900/60 backdrop-blur-2xl shadow-[-15px_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.2)] select-none overflow-hidden ${
                isSideWingOpen
                  ? 'w-[195px] -ml-[195px] p-2.5'
                  : 'w-[38px] -ml-[38px] p-1.5 cursor-pointer hover:bg-neutral-900/80 hover:border-white/35'
              }`}
              onClick={!isSideWingOpen ? () => setIsSideWingOpen(true) : undefined}
            >
              {/* Фоновый стеклянный блик */}
              <div className="absolute inset-0 rounded-l-2xl bg-gradient-to-b from-white/[0.12] via-white/[0.02] to-transparent pointer-events-none" />

              {isSideWingOpen ? (
                <>
                  {/* Шапка выдвинутого меню */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-mono text-[9px] text-neutral-400 uppercase tracking-wider relative z-10">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-300">ДЕЙСТВИЯ</span>
                      <span className="flex items-center gap-1 text-[8px] text-emerald-400 font-semibold">
                        <MotionPulse className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        READY
                      </span>
                    </div>

                    {/* Кнопка «Задвинуть» меню */}
                    <Tooltip content="Задвинуть меню (свернуть)" position="right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSideWingOpen(false);
                        }}
                        className="text-neutral-400 hover:text-white p-0.5 rounded hover:bg-white/10 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Кнопка создания нового заказа */}
                  <div className="relative z-10">
                    <CockpitButton
                      onClick={onOpenAddModal}
                      icon={Plus}
                      isActive={true}
                      className="w-full justify-center py-2 text-xs font-bold shadow-md shadow-white/5 whitespace-nowrap"
                      title="Создать новый заказ"
                    >
                      Новый заказ
                    </CockpitButton>
                  </div>

                  {/* Кнопка открытия нового месяца */}
                  <div className="relative z-10">
                    <CockpitButton
                      onClick={onOpenNewMonthModal}
                      icon={CalendarPlus}
                      className="w-full justify-center py-2 text-xs whitespace-nowrap"
                      title="Открыть новый месяц"
                    >
                      Новый месяц
                    </CockpitButton>
                  </div>

                  {/* Визуальный тонкий разделитель */}
                  <div className="h-px bg-white/15 my-0.5 relative z-10" />

                  {/* Кнопка очистки / удаления (внутри бокового меню) */}
                  <div className="relative z-10">
                    <CockpitButton
                      onClick={onOpenClearMonthModal}
                      disabled={orders.length === 0}
                      icon={Trash2}
                      className="w-full justify-center py-2 text-xs text-rose-400 hover:text-rose-300 border-rose-500/20 hover:border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 whitespace-nowrap"
                      title={
                        selectedMonthKey === 'all'
                          ? 'Очистить все записи журнала заказов'
                          : `Очистить все заказы за ${monthLabel}`
                      }
                    >
                      {selectedMonthKey === 'all' ? 'Очистить все' : 'Очистить месяц'}
                    </CockpitButton>
                  </div>
                </>
              ) : (
                /* Рукоятка задвинутого меню (клик выдвигает обратно) */
                <Tooltip content="Выдвинуть меню действий" position="left">
                  <div
                    className="flex flex-col items-center justify-center gap-2 py-2.5 w-full text-neutral-400 hover:text-white group cursor-pointer relative z-10"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 " />
                    <Plus className="w-3.5 h-3.5 text-neutral-300 group-hover:text-white" />
                    <span className="[writing-mode:vertical-lr] rotate-180 text-[8px] font-mono tracking-widest text-neutral-400 group-hover:text-cyan-300 uppercase font-bold py-1">
                      МЕНЮ
                    </span>
                  </div>
                </Tooltip>
              )}
            </aside>
          </div>
        </motion.div>
      )}

      {/* ГЛАВНОЕ ОКНО КОНСОЛИ (MERIDIAN COCKPIT CONTAINER) */}
      <div className="relative mx-auto rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">

        {/* Верхняя панель окна */}
        <motion.div
          initial={false}
          animate={{
            opacity: elevatedOrder ? 0.35 : 1,
          }}
          transition={surfaceTransition}
          className={`flex flex-wrap items-center justify-between border-b border-white/10 px-4 py-2.5 bg-neutral-900/60 gap-3 ${
            elevatedOrder ? 'pointer-events-none select-none' : ''
          }`}
        >

          {/* Левая часть: Точки терминала + Заголовок + Бейдж режима */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Точки терминала с точной анимацией из модальных окон */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Красная кнопка: переход на главную страницу (Hub) */}
              <Tooltip content="Закрыть реестр и перейти на главную">
                <button
                  type="button"
                  onClick={() => curtainNavigate('/')}
                  className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40 hover:bg-red-500 cursor-pointer outline-none shadow-sm shadow-red-500/30"
                />
              </Tooltip>

              {/* Желтая кнопка: свернуть в стандартный вид */}
              <Tooltip content={isExpanded ? 'Свернуть в стандартный вид' : 'Уже в стандартном виде'}>
                <button
                  type="button"
                  onClick={() => onToggleExpand?.(false)}
                  disabled={!isExpanded}
                  className={`w-3 h-3 rounded-full outline-none ${
                    isExpanded
                      ? 'bg-yellow-500/80 border border-yellow-400/40 hover:bg-yellow-400 cursor-pointer shadow-sm shadow-yellow-500/30'
                      : 'bg-[#36363c] border border-white/10 opacity-40 cursor-not-allowed '
                  }`}
                />
              </Tooltip>

              {/* Зеленая кнопка: развернуть на весь экран */}
              <Tooltip content={!isExpanded ? 'Развернуть на весь экран (детализация)' : 'Уже развернуто на полный экран'}>
                <button
                  type="button"
                  onClick={() => onToggleExpand?.(true)}
                  disabled={isExpanded}
                  className={`w-3 h-3 rounded-full outline-none ${
                    !isExpanded
                      ? 'bg-emerald-500/80 border border-emerald-400/40 hover:bg-emerald-400 cursor-pointer shadow-sm shadow-emerald-500/30'
                      : 'bg-[#36363c] border border-white/10 opacity-40 cursor-not-allowed '
                  }`}
                />
              </Tooltip>
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-white/10 font-mono text-xs text-neutral-300">
              <span className="text-white font-bold">KUMO-CRM</span>
              <span className="text-neutral-600">{'//'}</span>
              <span className="text-neutral-400 hidden sm:inline">ЗАКАЗЫ</span>

              {/* Динамический зеленый бейдж режима: FULLSCREEN / COMPACT */}
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
                <MotionPulse className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {isExpanded ? 'FULLSCREEN' : 'COMPACT'}
              </span>
            </div>
          </div>

          {/* Правая часть: Действия (Отменить) */}
          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
            {/* Кнопка отмены */}
            <CockpitButton
              onClick={onUndo}
              disabled={!canUndo}
              icon={RotateCcw}
              title={canUndo ? 'Отменить последнее действие (Alt+Z / Ctrl+Z)' : 'Нет действий для отмены'}
            >
              Отменить
            </CockpitButton>
          </div>

        </motion.div>

        {/* Внутреннее содержимое консоли заказов с анимацией перехода */}
        <CockpitContentTransition>
          <div className="p-3.5 sm:p-4 md:p-5 space-y-3 sm:space-y-3.5">

          {/* 1. ВЕРХНИЙ БЛОК: СТАТИСТИКА И KPI КАРТОЧКИ */}
          <motion.div
            initial={false}
            animate={{
              opacity: elevatedOrder ? 0.35 : 1,
            }}
            transition={surfaceTransition}
            className={`space-y-3 sm:space-y-3.5 ${
              elevatedOrder ? 'pointer-events-none select-none' : ''
            }`}
          >
            {/* РЯД ИЗ 5-ТИ КОМПАКТНЫХ KPI КАРТОЧЕК */}
            <OrdersV2KpiCards
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              netProfitTotal={netProfitTotal}
              totalMarginPercent={totalMarginPercent}
              inProgressCount={inProgressCount}
              printingCount={printingCount}
              waitingCount={waitingCount}
              completedCount={completedCount}
              incomeOrdersCount={incomeOrdersCount}
              unpaidSum={unpaidSum}
              unpaidOrdersCount={unpaidOrdersCount}
              currentMonthGoal={currentMonthGoal}
              onOpenGoalModal={onOpenGoalModal}
              selectedMonthLabel={selectedMonthKey === 'all' ? 'Все время' : monthLabel}
              isExpanded={isExpanded}
            />

            {/* 2. ОТДЕЛЬНЫЙ БЛОК ДЕЙСТВИЙ (ОТОБРАЖАЕТСЯ ВСЕГДА В ШАПКЕ ПАНЕЛИ ДЛЯ УДОБСТВА И СТАБИЛЬНОСТИ) */}
            {isExpanded && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:px-3.5 sm:py-2.5 bg-neutral-900/80 border border-white/10 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-neutral-200 font-bold uppercase tracking-wider flex items-center gap-2">
                    <MotionPulse className="w-2 h-2 rounded-full bg-emerald-400" />
                    ПАНЕЛЬ ДЕЙСТВИЙ
                  </span>
                  <span className="text-neutral-600 hidden sm:inline">|</span>
                  <span className="text-neutral-400 text-xs font-mono hidden md:inline">
                    {selectedMonthKey === 'all' ? 'Все периоды' : monthLabel} ({orders.length} записей)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <CockpitButton
                    onClick={onOpenAddModal}
                    icon={Plus}
                    isActive={true}
                    className="font-bold shadow-md whitespace-nowrap py-1.5"
                    title="Создать новый заказ"
                  >
                    [ + Новый заказ ]
                  </CockpitButton>

                  <CockpitButton
                    onClick={onOpenNewMonthModal}
                    icon={CalendarPlus}
                    className="whitespace-nowrap py-1.5"
                    title="Открыть новый месяц"
                  >
                    [ + Новый месяц ]
                  </CockpitButton>

                  <CockpitButton
                    onClick={onUndo}
                    disabled={!canUndo}
                    icon={RotateCcw}
                    className="whitespace-nowrap py-1.5"
                    title={canUndo ? 'Отменить последнее действие (Alt+Z / Ctrl+Z)' : 'Нет действий для отмены'}
                  >
                    [ ↩ Отменить ]
                  </CockpitButton>

                  <CockpitButton
                    onClick={onOpenClearMonthModal}
                    disabled={orders.length === 0}
                    icon={Trash2}
                    className="text-rose-400 hover:text-rose-300 border-rose-500/20 hover:border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 whitespace-nowrap py-1.5"
                    title={
                      selectedMonthKey === 'all'
                        ? 'Очистить все записи журнала заказов'
                        : `Очистить все заказы за ${monthLabel}`
                    }
                  >
                    {selectedMonthKey === 'all' ? '[ 🗑 Очистить всё ]' : `[ 🗑 Очистить ${monthLabel} ]`}
                  </CockpitButton>
                </div>
              </div>
            )}
          </motion.div>

          {/* 2. ПАНЕЛЬ ФИЛЬТРОВ, ПОИСКА И СТАТУСОВ (МЕЖДУ KPI И ТАБЛИЦЕЙ) */}
          <motion.div
            initial={false}
            animate={{
              opacity: elevatedOrder ? 0.35 : 1,
            }}
            transition={surfaceTransition}
            onClick={() => {
              if (elevatedOrder) setElevatedOrder(null);
            }}
            className={`relative z-20 ${
              elevatedOrder ? 'pointer-events-none select-none cursor-pointer' : ''
            }`}
          >
            <OrdersV2FilterBar
              orders={orders}
              selectedMonthKey={selectedMonthKey}
              setSelectedMonthKey={setSelectedMonthKey}
              availableMonthKeys={availableMonthKeys}
              handlePrevMonth={handlePrevMonth}
              handleNextMonth={handleNextMonth}
              monthOrdersCount={monthOrdersCount}
              onOpenClearMonthModal={onOpenClearMonthModal}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              clientFilter={clientFilter}
              setClientFilter={setClientFilter}
              paymentFilter={paymentFilter}
              setPaymentFilter={setPaymentFilter}
              totalFilteredCount={totalFilteredCount}
              inProgressCount={inProgressCount}
              completedCount={completedCount}
              incomeOrdersCount={incomeOrdersCount}
              expenseCount={expenseCount}
            />
          </motion.div>

          {/* 3. ТАБЛИЦА РЕЕСТРА ЗАКАЗОВ (КОМПАКТНАЯ / РАЗВЕРНУТАЯ С РАЗДЕЛЕННЫМИ КОЛОНКАМИ) */}
          <div className={`relative ${elevatedOrder ? 'z-40' : 'z-10'}`}>
            <OrdersV2Table
              orders={sortedOrders}
              visibleOrders={visibleOrders}
              visibleCount={visibleCount}
              totalOrdersCount={sortedOrders.length}
              onLoadMore={onLoadMore}
              onShowAll={onShowAll}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
              onOpenEditModal={onOpenEditModal}
              onOpenAddModal={onOpenAddModal}
              onUpdateStatus={onUpdateStatus}
              onToggleType={onToggleType}
              onDuplicateOrder={onDuplicateOrder}
              onRequestDelete={onRequestDelete}
              onInlineUpdate={onInlineUpdate}
              searchQuery={searchQuery}
              savedCalculations={savedCalculations}
              isExpanded={isExpanded}
              contextMenu={contextMenu}
              setContextMenu={setContextMenu}
              contextMenuRef={contextMenuRef}
              onCopyContact={onCopyContact}
              elevatedOrder={elevatedOrder}
              setElevatedOrder={setElevatedOrder}
            />
          </div>

        </div>
        </CockpitContentTransition>

        {/* 3. ПОДВАЛ КОНСОЛИ (В ТОЧНОСТИ КАК НА СКРИНШОТЕ КАЛЬКУЛЯТОРА) */}
        <motion.div
          initial={false}
          animate={{
            opacity: elevatedOrder ? 0.35 : 1,
          }}
          transition={surfaceTransition}
          className={`border-t border-white/10 px-5 py-2.5 bg-neutral-950 flex items-center justify-between text-[11px] font-mono text-neutral-500 ${
            elevatedOrder ? 'pointer-events-none select-none' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <span>DATABASE: {isOnline ? 'CONNECTED' : 'OFFLINE'}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">CACHE: {isOnline ? 'SYNCED' : 'PENDING SYNC'}</span>
            {isExpanded && (
              <>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline text-cyan-400 font-semibold">VIEW: FULLSCREEN SEPARATED</span>
              </>
            )}
          </div>
          <div>{isOnline ? 'SYNC: ONLINE' : 'SYNC: OFFLINE QUEUE'}</div>
        </motion.div>

      </div>

    </div>
  );
});
