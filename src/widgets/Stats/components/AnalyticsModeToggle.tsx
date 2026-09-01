import { CircleDollarSign, Layers3 } from 'lucide-react';
import { SegmentedFilter, type SegmentedFilterOption } from '../../../shared/ui/SegmentedFilter';
import type { FinancialMode } from '../types';

interface AnalyticsModeToggleProps {
  value: FinancialMode;
  onChange: (mode: FinancialMode) => void;
  disabled?: boolean;
}

const OPTIONS: ReadonlyArray<SegmentedFilterOption<FinancialMode>> = [
  {
    value: 'accrual',
    label: 'По заказам',
    icon: Layers3,
    ariaLabel: 'По заказам: полная сумма созданных заказов',
  },
  {
    value: 'cash',
    label: 'По оплатам',
    icon: CircleDollarSign,
    ariaLabel: 'По оплатам: только фактически полученные деньги',
  },
];

export function AnalyticsModeToggle({ value, onChange, disabled = false }: AnalyticsModeToggleProps) {
  return (
    <SegmentedFilter
      value={value}
      onChange={onChange}
      options={OPTIONS}
      ariaLabel="Режим финансового расчёта"
      disabled={disabled}
    />
  );
}
