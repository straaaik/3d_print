'use client';

import React, { startTransition, useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePageRouter as useRouter } from '../../shared/ui/page-transition/PageTransitionLink';
import { MotionConfig } from 'motion/react';
import { Clock, RefreshCw } from 'lucide-react';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { Tooltip } from '../../shared/ui/Tooltip';
import { usePixelCurtain } from '../../shared/ui/PixelCurtain';
import { CockpitContentTransition } from '../../shared/ui/CockpitContentTransition';
import { MotionPulse, MotionPulseDiv } from '../../shared/ui/MotionPrimitives';
import { useData } from '../../entities/model/DataProvider';
import { getMonthlyGoalsConfig, getOrders } from '../../shared/api/db';
import {
  buildStatsReport,
  filterOrdersByDateRange,
  formatMonthKeyLabel,
  getAvailableMonthKeys,
  getDateRangeForPreset,
  MONTH_NAMES_FULL,
  MONTH_NAMES_SHORT,
  type DateRange,
  type PeriodPreset,
} from './helpers/statsCalculator';
import type { FinancialMode } from './types';
import { AnalyticsModeToggle } from './components/AnalyticsModeToggle';
import { PeriodFilterBar } from './components/PeriodFilterBar';
import { StatsKpiCards } from './components/StatsKpiCards';
import { StatsEmptyState } from './components/StatsEmptyState';

const ChartSkeleton = () => <MotionPulseDiv data-page-pending="" className="min-h-64 rounded-xl border border-white/10 bg-white/[0.03]" />;

const FinancialDynamicsChart = dynamic(() => import('./components/FinancialDynamicsChart').then((module) => module.FinancialDynamicsChart), { loading: ChartSkeleton });
const PaymentGapChart = dynamic(() => import('./components/PaymentGapChart').then((module) => module.PaymentGapChart), { loading: ChartSkeleton });
const OrderStatusChart = dynamic(() => import('./components/OrderStatusChart').then((module) => module.OrderStatusChart), { loading: ChartSkeleton });
const ActivityHeatmap = dynamic(() => import('./components/ActivityHeatmap').then((module) => module.ActivityHeatmap), { loading: ChartSkeleton });
const ProductPerformanceChart = dynamic(() => import('./components/ProductPerformanceChart').then((module) => module.ProductPerformanceChart), { loading: ChartSkeleton });
const CostStructureChart = dynamic(() => import('./components/CostStructureChart').then((module) => module.CostStructureChart), { loading: ChartSkeleton });
const FilamentUsageChart = dynamic(() => import('./components/FilamentUsageChart').then((module) => module.FilamentUsageChart), { loading: ChartSkeleton });
const PrinterWorkloadChart = dynamic(() => import('./components/PrinterWorkloadChart').then((module) => module.PrinterWorkloadChart), { loading: ChartSkeleton });
const StatsInsights = dynamic(() => import('./components/StatsInsights').then((module) => module.StatsInsights), { loading: ChartSkeleton });

type LoadState = 'ready' | 'refreshing' | 'error';

function getOrdersCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} заказов`;
  if (mod10 === 1) return `${count} заказ`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} заказа`;
  return `${count} заказов`;
}

export function StatsDashboard() {
  const router = useRouter();
  const { navigate: curtainNavigate } = usePixelCurtain();
  const {
    savedCalculations,
    printers,
    filaments,
    isOnline,
    orders,
    setOrders,
    monthlyGoals: goals,
    setMonthlyGoals: setGoals,
  } = useData();
  const [loadState, setLoadState] = useState<LoadState>('ready');
  const [loadError, setLoadError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [mode, setMode] = useState<FinancialMode>('accrual');
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('month');
  const [customRange, setCustomRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeBucketKey, setActiveBucketKey] = useState<string | null>(null);
  const [pinnedBucketKey, setPinnedBucketKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadState('refreshing');
    setLoadError('');
    try {
      const [nextOrders, nextGoals] = await Promise.all([getOrders(), getMonthlyGoalsConfig()]);
      setOrders(nextOrders);
      const nextMonthKeys = getAvailableMonthKeys(nextOrders);
      setSelectedMonthKey((current) => nextOrders.length > 0 && !nextMonthKeys.includes(current) ? nextMonthKeys[0] : current);
      setGoals(nextGoals);
      setLastUpdatedAt(new Date());
      setLoadState('ready');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось обновить статистику');
      setLoadState('error');
    }
  }, [setGoals, setOrders]);

  const availableMonthKeys = useMemo(() => getAvailableMonthKeys(orders), [orders]);

  const actualRange = useMemo(
    () => getDateRangeForPreset(selectedPreset, customRange, selectedMonthKey),
    [customRange, selectedMonthKey, selectedPreset],
  );
  const filteredOrdersCount = useMemo(() => filterOrdersByDateRange(orders, actualRange).length, [actualRange, orders]);
  const report = useMemo(
    () => buildStatsReport({
      orders,
      products: savedCalculations,
      filaments,
      printers,
      goals,
      range: actualRange,
      preset: selectedPreset,
      mode,
    }),
    [actualRange, filaments, goals, mode, orders, printers, savedCalculations, selectedPreset],
  );

  const periodLabel = useMemo(() => {
    if (selectedPreset === 'month') return formatMonthKeyLabel(selectedMonthKey);
    if (selectedPreset === 'today') return 'Сегодня';
    if (selectedPreset === '7d') return 'Последние 7 дней';
    if (selectedPreset === '30d') return 'Последние 30 дней';
    if (selectedPreset === 'all') return 'Вся история';
    if (selectedPreset === 'this_month') {
      const now = new Date();
      return `${MONTH_NAMES_FULL[now.getMonth()]} ${now.getFullYear()}`;
    }
    if (selectedPreset === 'last_month') {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return `${MONTH_NAMES_FULL[date.getMonth()]} ${date.getFullYear()}`;
    }
    if (actualRange.startDate && actualRange.endDate) {
      return `${actualRange.startDate.getDate()} ${MONTH_NAMES_SHORT[actualRange.startDate.getMonth()]} — ${actualRange.endDate.getDate()} ${MONTH_NAMES_SHORT[actualRange.endDate.getMonth()]}`;
    }
    return 'Выбранный период';
  }, [actualRange.endDate, actualRange.startDate, selectedMonthKey, selectedPreset]);

  const handleModeChange = (nextMode: FinancialMode) => {
    startTransition(() => {
      setMode(nextMode);
      setActiveBucketKey(null);
      setPinnedBucketKey(null);
    });
  };
  const handlePresetChange = (preset: PeriodPreset) => {
    startTransition(() => {
      setSelectedPreset(preset);
      setActiveBucketKey(null);
      setPinnedBucketKey(null);
    });
  };
  const handleMonthChange = (key: string) => {
    startTransition(() => {
      setSelectedMonthKey(key);
      setSelectedPreset('month');
      setActiveBucketKey(null);
      setPinnedBucketKey(null);
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto w-full max-w-[1500px] select-none font-sans">
        <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-neutral-900/60 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex items-center gap-1.5 shrink-0">
                <Tooltip content="Закрыть статистику и перейти на главную">
                  <button
                    type="button"
                    onClick={() => curtainNavigate('/')}
                    aria-label="Закрыть статистику и перейти на главную"
                    className="w-3 h-3 rounded-full border border-rose-400/40 bg-rose-500/80 hover:bg-rose-500 cursor-pointer outline-none shadow-sm shadow-rose-500/30 transition-transform hover:scale-110"
                  />
                </Tooltip>
              </div>
              <div className="flex min-w-0 items-center gap-2 border-l border-white/10 pl-3 font-mono text-xs text-neutral-300">
                <span className="text-white font-bold">KUMO-CRM</span>
                <span className="text-neutral-600">{'//'}</span>
                <span className="text-neutral-400 hidden sm:inline">СТАТИСТИКА</span>
                <span
                  className={`flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                    isOnline
                      ? 'border-emerald-800/40 bg-emerald-950/60 text-emerald-400'
                      : 'border-white/10 bg-white/5 text-neutral-400'
                  }`}
                >
                  <MotionPulse className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs font-mono">
              {/* Плашка активного диапазона и количества заказов в дизайне «Тариф» */}
              <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-lg text-xs font-mono shadow-sm">
                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-neutral-400">Диапазон:</span>
                <span className="text-white font-bold">{periodLabel}</span>
                <span className="text-neutral-600 mx-0.5">•</span>
                <span className="text-neutral-300 font-semibold">{getOrdersCountLabel(filteredOrdersCount)}</span>
              </div>

              <CockpitButton icon={RefreshCw} onClick={() => void refresh()} disabled={loadState === 'refreshing'} title="Обновить статистику">
                <MotionPulse active={loadState === 'refreshing'}>Обновить</MotionPulse>
              </CockpitButton>
            </div>
          </header>

          {loadError ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/20 bg-rose-950/30 px-4 py-2 font-mono text-xs text-rose-300"><span>Не удалось обновить данные: {loadError}. Показан последний доступный срез.</span><CockpitButton onClick={() => void refresh()}>Повторить</CockpitButton></div>
          ) : null}

          <CockpitContentTransition>
            <div className="space-y-3.5 p-3.5 sm:p-4 md:p-5">
            <PeriodFilterBar
              selectedPreset={selectedPreset}
              onSelectPreset={handlePresetChange}
              selectedMonthKey={selectedMonthKey}
              onSelectMonthKey={handleMonthChange}
              availableMonthKeys={availableMonthKeys}
              customRange={customRange}
              onChangeCustomRange={setCustomRange}
              orders={orders}
              rightSlot={(
                <AnalyticsModeToggle
                  value={mode}
                  onChange={handleModeChange}
                  disabled={loadState === 'refreshing'}
                />
              )}
            />

            <StatsKpiCards kpi={report.kpi} deltas={report.deltas} mode={mode} goal={report.goal} />

            {orders.length === 0 ? (
              <StatsEmptyState title="Статистика ждёт первый заказ" description="Создайте заказ или сохраните расчёт товара — финансовые и производственные графики появятся автоматически." actionLabel="Перейти к заказам" onAction={() => router.push('/orders')} />
            ) : (
              <>
                {/* Календарь активности на всю ширину под KPI-карточками и выше финансовой динамики */}
                <ActivityHeatmap
                  data={report.activity}
                  range={actualRange}
                  activeBucketKey={activeBucketKey}
                  pinnedBucketKey={pinnedBucketKey}
                  onActiveBucketChange={setActiveBucketKey}
                  onPinnedBucketChange={setPinnedBucketKey}
                />

                <div className="grid gap-3 xl:grid-cols-2">
                  <div className="xl:col-span-2">
                    <FinancialDynamicsChart
                      data={report.dynamics}
                      periodLabel={periodLabel}
                      mode={mode}
                      activeBucketKey={activeBucketKey}
                      pinnedBucketKey={pinnedBucketKey}
                      onActiveBucketChange={setActiveBucketKey}
                      onPinnedBucketChange={setPinnedBucketKey}
                    />
                  </div>
                  <div className="xl:col-span-2">
                    <PaymentGapChart data={report.paymentGap} />
                  </div>
                  <OrderStatusChart data={report.statuses} />
                  <CostStructureChart data={report.costs} total={report.kpi.expenses} />
                  <ProductPerformanceChart data={report.products} />
                  <FilamentUsageChart data={report.filamentUsage} unknownG={report.quality.unknownFilamentG} />
                  <div className="xl:col-span-2">
                    <PrinterWorkloadChart data={report.printerWorkload} />
                  </div>
                </div>
                <StatsInsights insights={report.insights} />
              </>
            )}

            </div>
          </CockpitContentTransition>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-neutral-950 px-5 py-2.5 font-mono text-[11px] text-neutral-500 select-none">
            <div className="flex items-center gap-2 sm:gap-3">
              <span>DATABASE: {isOnline ? 'SUPABASE CLOUD' : 'OFFLINE'}</span>
              <span className="hidden sm:inline">•</span>
              <span>CACHE: LOCALSTORAGE</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">ORDERS: {orders.length}</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">PRODUCTS: {savedCalculations.length}</span>
            </div>
            <span>{lastUpdatedAt ? `CALCULATED: ${lastUpdatedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'RUNTIME READY'}</span>
          </footer>
        </div>
      </div>
    </MotionConfig>
  );
}
