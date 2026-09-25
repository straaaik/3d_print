import type { Filament, Order, Printer, SavedCalculation } from '../../shared/types';

export type FinancialMode = 'accrual' | 'cash';

export type MetricDelta = {
  value: number;
  percent: number | null;
};

export type RankedDatum = {
  id: string;
  label: string;
  value: number;
  secondary: number;
  color?: string;
};

export type StatsInsight = {
  id: string;
  severity: 'positive' | 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  value: number;
  href?: '/orders' | '/products' | '/filaments' | '/printers';
};

export type StatsReportKpi = {
  revenue: number;
  expenses: number;
  result: number;
  margin: number;
  averageCheck: number;
  receivables: number;
  unpaidOrders: number;
  incomeOrders: number;
  expenseOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  filamentG: number;
  printHours: number;
};

export type StatsReportInput = {
  orders: Order[];
  products: SavedCalculation[];
  filaments: Filament[];
  printers: Printer[];
  goals: {
    defaultGoal: number;
    monthlyGoals: Record<string, number>;
  };
  range: {
    startDate: Date | null;
    endDate: Date | null;
  };
  preset: import('./helpers/statsCalculator').PeriodPreset;
  mode: FinancialMode;
  now?: Date;
};

export type StatsReport = {
  kpi: StatsReportKpi;
  previousKpi: StatsReportKpi | null;
  deltas: Record<'revenue' | 'expenses' | 'result' | 'margin' | 'averageCheck', MetricDelta>;
  dynamics: import('./helpers/statsCalculator').ChartBucket[];
  paymentGap: { ordered: number; paid: number; receivable: number };
  goal: { target: number; actual: number; progressPercent: number | null };
  statuses: RankedDatum[];
  products: Array<RankedDatum & { revenue: number; profit: number; quantity: number }>;
  costs: RankedDatum[];
  filamentUsage: RankedDatum[];
  printerWorkload: Array<RankedDatum & { hours: number; profitPerHour: number }>;
  activity: Array<{ key: string; date: Date; orders: number; revenue: number; result: number }>;
  insights: StatsInsight[];
  quality: { unlinkedOrders: number; unknownFilamentG: number; unknownPrinterHours: number };
};

export type FinancialLabels = {
  revenue: string;
  result: string;
};
