'use client';

import type { Order } from '../../../shared/types';
import type { CalculationProjectOrderDraft } from '../../../shared/lib/calculationProjects';
import { calculateProjectTotals } from '../../../shared/lib/formulas';
import { CockpitModal } from '../../../shared/ui/CockpitModal';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { CalculationReceipt } from '../../../shared/ui/CalculationReceipt';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { Input } from '../../../shared/ui/Input';
import { DatePicker } from '../../../shared/ui/DatePicker';

interface Props {
  draft: CalculationProjectOrderDraft;
  order: Partial<Order>;
  onChange: (order: Partial<Order>) => void;
  onClose: () => void;
  onSave: () => Promise<Order | null>;
  isSaving: boolean;
  currency: string;
}
/** Review preserves separate frozen positions; only client details/payment are edited here. */
export function ProjectOrderReviewModal({ draft, order, onChange, onClose, onSave, isSaving, currency }: Props) {
  const lines = draft.items.map(item => ({ name: item.name, quantity: item.quantity,
    inputs: item.snapshot.calculation!.inputs, result: item.snapshot.calculation!.result }));
  const totals = calculateProjectTotals({ lines, discountAmount: draft.order.discount_amount ?? 0,
    urgencyAmount: draft.order.urgency_amount ?? 0, agreedPrice: draft.order.agreed_price ?? null, payment: order.payment ?? 0 });
  const field = (key: 'title' | 'client_name' | 'contact' | 'notes', label: string) => <Input label={label} aria-label={label}
    value={order[key] ?? ''} onChange={event => onChange({ ...order, [key]: event.target.value })} />;
  const dateField = (key: 'date' | 'deadline', label: string) => <DatePicker label={label} format="DD.MM.YYYY"
    value={order[key] ?? ''} onChange={value => onChange({ ...order, [key]: value })} />;
  return <CockpitModal isOpen onClose={onClose} title="Заказ из проекта" subtitle={`${draft.items.length} позиций · Проверка перед созданием`}
    stamp="ЗАКАЗ" maxWidth="3xl" footer={<>
      <span>Новый заказ создаётся в статусе «Не в работе».</span>
      <CockpitButton onClick={() => { void onSave(); }} disabled={isSaving}>{isSaving ? 'Сохранение…' : 'Создать заказ'}</CockpitButton>
    </>}>
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-3">
        {field('title', 'Название заказа')}
        <div className="grid grid-cols-2 gap-3">{dateField('date', 'Дата')}{dateField('deadline', 'Дедлайн')}</div>
        {field('client_name', 'Клиент')}{field('contact', 'Контакт')}{field('notes', 'Заметки')}
        <NumberInput label="Получено оплат" value={order.payment ?? 0} min={0} onChange={value => {
          const payment = value ?? 0;
          onChange({ ...order, payment, payments: payment ? [payment] : [] });
        }} />
      </div>
      <div className="space-y-4">
        {lines.map((line, index) => <section key={draft.items[index].calculation_item_id} className="space-y-2 text-xs font-mono">
          <p>{line.name} · {line.quantity} шт. · {line.inputs?.filament?.name ?? ''} · {line.inputs?.weightG ?? 0} г</p>
          <CalculationReceipt kind="print" title={`Чек позиции · ${line.name}`} result={line.result} currency={currency} />
        </section>)}
        <CalculationReceipt kind="project" title="Чек проекта" result={totals} lines={lines} currency={currency} />
      </div>
    </div>
  </CockpitModal>;
}
