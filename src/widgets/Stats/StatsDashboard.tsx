'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart3, 
  RotateCcw, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  ShoppingBag,
  Layers,
  Printer,
  Calendar,
  Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../shared/ui/PageHeader';
import { useData } from '../../entities/model/DataProvider';
import { getOrders } from '../../shared/api/db';
import { Order } from '../../shared/types';
import { 
  PeriodPreset, 
  DateRange, 
  getDateRangeForPreset, 
  filterOrdersByDateRange, 
  calculateStatsKPI, 
  generateDynamicsChartData,
  getAvailableMonthKeys,
  formatMonthKeyLabel,
  MONTH_NAMES_FULL,
  MONTH_NAMES_SHORT
} from './helpers/statsCalculator';
import { PeriodFilterBar } from './components/PeriodFilterBar';
import { StatsKpiCards } from './components/StatsKpiCards';
import { FinancialDynamicsChart } from './components/FinancialDynamicsChart';

export function StatsDashboard() {
  const router = useRouter();
  const { savedCalculations, printers, filaments, isLoading: isDataLoading } = useData();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Список месяцев, где есть заказы
  const availableMonthKeys = useMemo(() => {
    return getAvailableMonthKeys(orders);
  }, [orders]);

  // Выбранный месяц по умолчанию — самый свежий месяц из доступных
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('month');
  const [customRange, setCustomRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  // Загрузка заказов
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoadingOrders(true);
      const data = await getOrders();
      setOrders(data);

      // Если текущий выбранный месяц не в списке, но есть доступные месяцы — ставим самый свежий
      if (data.length > 0) {
        const keys = getAvailableMonthKeys(data);
        if (keys.length > 0 && (!selectedMonthKey || !keys.includes(selectedMonthKey))) {
          setSelectedMonthKey(keys[0]);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки заказов для статистики:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [selectedMonthKey]);

  useEffect(() => {
    fetchOrders();

    const handleUpdate = () => {
      fetchOrders();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('orders_updated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('orders_updated', handleUpdate);
    };
  }, [fetchOrders]);

  // Обработчик выбора конкретного месяца (Май, Июнь, Июль и т.д.)
  const handleSelectMonthKey = useCallback((mKey: string) => {
    setSelectedMonthKey(mKey);
    setSelectedPreset('month');
  }, []);

  // Вычисляем фактический диапазон дат
  const actualRange = useMemo(() => {
    return getDateRangeForPreset(selectedPreset, customRange, selectedMonthKey);
  }, [selectedPreset, customRange, selectedMonthKey]);

  // Фильтруем заказы
  const filteredOrders = useMemo(() => {
    return filterOrdersByDateRange(orders, actualRange);
  }, [orders, actualRange]);

  // Рассчитываем KPI
  const kpi = useMemo(() => {
    return calculateStatsKPI(filteredOrders, savedCalculations);
  }, [filteredOrders, savedCalculations]);

  // Данные для графика динамики
  const chartData = useMemo(() => {
    return generateDynamicsChartData(filteredOrders, actualRange, selectedPreset, savedCalculations);
  }, [filteredOrders, actualRange, selectedPreset, savedCalculations]);

  // Текстовая метка периода для заголовка графика
  const periodLabel = useMemo(() => {
    if (selectedPreset === 'month') {
      return formatMonthKeyLabel(selectedMonthKey);
    }
    if (selectedPreset === 'this_month') {
      const now = new Date();
      return `${MONTH_NAMES_FULL[now.getMonth()]} ${now.getFullYear()}`;
    }
    if (selectedPreset === 'last_month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return `${MONTH_NAMES_FULL[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (selectedPreset === 'today') return 'Сегодня';
    if (selectedPreset === '7d') return 'Последние 7 дней';
    if (selectedPreset === '30d') return 'Последние 30 дней';
    if (selectedPreset === 'all') return 'Вся история (по месяцам)';
    if (actualRange.startDate && actualRange.endDate) {
      const s = actualRange.startDate;
      const e = actualRange.endDate;
      return `${s.getDate()} ${MONTH_NAMES_SHORT[s.getMonth()]} — ${e.getDate()} ${MONTH_NAMES_SHORT[e.getMonth()]}`;
    }
    return 'Выбранный период';
  }, [selectedPreset, selectedMonthKey, actualRange]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto py-1 animate-in fade-in duration-200">
      {/* Шапка страницы статистики */}
      <PageHeader
        icon={BarChart3}
        title="Аналитика и Статистика"
        subtitle="Финансовый учет, динамика выручки и расчет производственных показателей мастерской"
        accentColor="#10b981"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchOrders}
              className="p-2.5 rounded-xl bg-[#16181d] hover:bg-[#222730] border border-[#242930] text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Обновить данные статистики"
            >
              <RotateCcw className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => router.push('/orders')}
              className="px-3.5 py-2 rounded-xl bg-[#16181d] hover:bg-[#222730] border border-[#242930] hover:border-emerald-500/40 text-gray-200 hover:text-white font-medium text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>Заказы</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        }
      />

      {/* 1. Панель фильтрации периодов и месяцев */}
      <PeriodFilterBar
        selectedPreset={selectedPreset}
        onSelectPreset={setSelectedPreset}
        selectedMonthKey={selectedMonthKey}
        onSelectMonthKey={handleSelectMonthKey}
        availableMonthKeys={availableMonthKeys}
        customRange={customRange}
        onChangeCustomRange={setCustomRange}
        actualRange={actualRange}
        ordersCount={filteredOrders.length}
      />

      {/* 2. Верхние KPI карточки */}
      <StatsKpiCards kpi={kpi} />

      {/* 3. Главный интерактивный график динамики */}
      <FinancialDynamicsChart 
        data={chartData} 
        periodLabel={periodLabel} 
      />

      {/* 4. Информационный блок с полезными инсайтами */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Инсайт 1: Эффективность печати */}
        <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Доходность на 1 час печати</h4>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              {kpi.totalPrintHours > 0 ? (
                <>В среднем 1 час работы 3D-принтера приносит <strong className="text-emerald-300 font-mono">{(kpi.netProfit / kpi.totalPrintHours).toFixed(0)} ₽</strong> чистой прибыли.</>
              ) : (
                'Для расчета метрики привязывайте модели из каталога к заказам.'
              )}
            </p>
          </div>
        </div>

        {/* Инсайт 2: Загрузка парка принтеров */}
        <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Парк оборудования</h4>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              В системе зарегистрировано <strong className="text-purple-300 font-mono">{printers.length}</strong> принтеров. Всего за период отработано <strong className="text-white font-mono">{kpi.totalPrintHours.toFixed(1)}</strong> машино-часов.
            </p>
          </div>
        </div>

        {/* Инсайт 3: Склад материалов */}
        <div className="bg-[#16181d] border border-[#242930] rounded-2xl p-4 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Материалы и катушки</h4>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Активных позиций пластика: <strong className="text-cyan-300 font-mono">{filaments.length}</strong>. За выбранный интервал израсходовано <strong className="text-white font-mono">{(kpi.totalFilamentWeightG / 1000).toFixed(2)} кг</strong> сырья.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
