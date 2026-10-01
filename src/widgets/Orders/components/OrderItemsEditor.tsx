'use client';

import { useContext, useState } from 'react';
import { Plus } from 'lucide-react';
import { InventoryContext } from '../../../entities/model/inventoryContext';
import type { Order, SavedCalculation, Filament, Printer, Settings } from '../../../shared/types';
import type { FoundationState, OrderItem } from '../../../shared/types/foundation';
import { ProductCalculationEditor } from '../../ProductsList/ProductCalculationEditor';
import { CalculationReceipt } from '../../../shared/ui/CalculationReceipt';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { NumberInput } from '../../../shared/ui/NumberInput';
import { Input } from '../../../shared/ui/Input';
import { CockpitDropdown } from '../../../shared/ui/CockpitDropdown';
import { calculateOrderFinancials } from '../../../shared/lib/formulas';
import { formatCurrency } from '../../../shared/lib/format';
import { areOrderItemsLocked, buildOrderItem, createManualOrderProduct, orderItemToProduct, replaceOrderItem, summarizeOrderItems, updateOrderPaymentTotal } from '../orderItems';

export function OrderItemReceipts({ items, currency = '₽', state }: { items: OrderItem[]; currency?: string; state?: FoundationState | null }) {
  const inventory = useContext(InventoryContext);
  const current = state ?? inventory?.state;
  return <div className="space-y-4">{items.filter(item => !item.archived).map(item => {
    const inputs = item.snapshot.calculation?.inputs;
    const deficitSources = new Set([item.id, ...(current?.productionEvents
      .filter(event => event.order_item_id === item.id).map(event => event.id) ?? [])]);
    const deficits = current?.deficits.filter(row => deficitSources.has(row.source_id)) ?? [];
    const persisted = current?.orderItems.some(row => row.id === item.id);
    const available = persisted ? item.fulfilled_quantity : Math.min(item.quantity,
      current?.finishedBalances.find(row => row.source_product_id === item.product_id)?.quantity ?? 0);
    return <section key={item.id} className="space-y-2 font-mono text-xs">
      <h3 className="text-white">{item.name} · {item.quantity} шт.</h3>
      <p className="text-neutral-400">{inputs?.filament?.name ?? 'Материал не указан'} · {inputs?.filament?.color ?? ''} · {inputs?.weightG ?? 0} г · {inputs?.printer?.name ?? 'Принтер не указан'}</p>
      {item.snapshot.recipe?.product_snapshot?.type === 'assembly' && <div className="space-y-1 text-neutral-400">
        {item.snapshot.recipe.product_snapshot.assembly_parts?.map((part, index) => <p key={part.id ?? index}>
          {part.name} · {part.quantity * item.quantity} шт. · {part.filament_name ?? ''} · {part.weight_g * part.quantity * item.quantity} г
        </p>)}
      </div>}
      {item.snapshot.calculation ? <CalculationReceipt kind="print" result={item.snapshot.calculation.result}
        title={`Чек позиции · ${item.name}`} currency={currency} /> : <p className="text-neutral-500">Исторический заказ: детализированный расчёт не сохранён.</p>}
      {item.snapshot.calculation && <div className="text-xs font-mono text-neutral-400 space-y-1">
        <p>Наценка: {item.snapshot.calculation.result.appliedMarkupPercent}% · Срочность позиции: {item.snapshot.calculation.result.urgencyPercent}% · Скидка позиции: {item.snapshot.calculation.result.discountPercent}% · Брак: {inputs?.defectPercent ?? inputs?.settings?.default_defect_percent ?? 5}%</p>
        <p>Себестоимость расчёта: {formatCurrency(item.snapshot.calculation.result.baseCostPerUnit, currency)}/шт. · Цена: {formatCurrency(item.snapshot.calculation.result.finalPricePerUnit, currency)}/шт.</p>
        <p>Плановая прибыль за изделие: {formatCurrency(item.snapshot.calculation.result.profitPerUnit, currency)} · Маржа: {item.snapshot.calculation.result.marginPercent}%</p>
      </div>}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1">
        <p>Учтённая себестоимость: {formatCurrency(item.unit_cost, currency)}/шт. · {formatCurrency(item.total_cost, currency)} всего</p>
        <p className="text-neutral-400">Себестоимость: {item.cost_provenance === 'estimate' ? 'оценка оставшихся изделий' : item.cost_provenance === 'legacy' ? 'историческая' : item.fulfilled_quantity < item.quantity ? 'фактическая с оценкой остатка' : 'фактическая'}</p>
        <p>Заказано: {item.quantity} · Со склада: {item.reserved_quantity ?? 0} · Изготовлено: {item.production_quantity} · Учтено: {item.fulfilled_quantity} · Осталось изготовить: {Math.max(0, item.quantity - item.fulfilled_quantity)} · Возвращено: {item.returned_quantity ?? 0}</p>
        {item.quantity > available && <p role="status" className="text-amber-400">{available === 0 ? 'Товара нет в наличии на складе' : 'Недостаточно товара на складе'}. Остаток будет изготовлен для заказа.</p>}
        {deficits.map(deficit => <p key={deficit.id} role="status" className="text-amber-400">Дефицит материала {current?.variants.find(v => v.id === deficit.variant_id)?.name ?? deficit.variant_id}: {deficit.grams} г</p>)}
      </div>
    </section>;
  })}</div>;
}

/** Compact per-item card for the editing step; the full itemised receipt lives in the finance step. */
export function OrderItemSummary({ item, currency = '₽', state }: { item: OrderItem; currency?: string; state?: FoundationState | null }) {
  const inputs = item.snapshot.calculation?.inputs;
  const result = item.snapshot.calculation?.result;
  const persisted = state?.orderItems.some(row => row.id === item.id);
  const available = persisted ? item.fulfilled_quantity : Math.min(item.quantity,
    state?.finishedBalances.find(row => row.source_product_id === item.product_id)?.quantity ?? 0);
  const remaining = Math.max(0, item.quantity - item.fulfilled_quantity);
  const tiles: [string, string][] = result ? [
    ['Цена за шт.', formatCurrency(result.finalPricePerUnit, currency)],
    ['Себестоимость за шт.', formatCurrency(item.unit_cost, currency)],
    ['Плановая прибыль', formatCurrency(result.profitTotal, currency)],
  ] : [['Себестоимость за шт.', formatCurrency(item.unit_cost, currency)]];
  return <div className="space-y-2 font-mono text-xs">
    <p className="text-neutral-400">{inputs?.filament?.name ?? 'Материал не указан'}{inputs?.filament?.color ? ` · ${inputs.filament.color}` : ''} · {inputs?.weightG ?? 0} г · {inputs?.printer?.name ?? 'Принтер не указан'}</p>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {tiles.map(([label, value]) => <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
        <div className="mt-1 font-bold tabular-nums text-white">{value}</div>
      </div>)}
    </div>
    <p className="text-neutral-500">Со склада: {item.reserved_quantity ?? 0} · Изготовлено: {item.production_quantity} · Осталось изготовить: {remaining}</p>
    {item.quantity > available && <p role="status" className="text-amber-400">{available === 0 ? 'Товара нет в наличии на складе' : 'Недостаточно товара на складе'}. Остаток будет изготовлен для заказа.</p>}
  </div>;
}

interface EditorProps { order: Partial<Order>; onChange: (order: Partial<Order>) => void;
  filaments: Filament[]; printers: Printer[]; settings: Settings | null; state: FoundationState | null; userId: string; currency?: string }
export function OrderItemsEditor({ order, onChange, filaments, printers, settings, state, userId, currency = '₽' }: EditorProps) {
  const [editing, setEditing] = useState<{ index: number; product: SavedCalculation } | null>(null);
  const [error, setError] = useState('');
  const items = order.items ?? [];
  const locked = areOrderItemsLocked(order, state);
  const variantFor = (id?: string) => state?.variants.find(row => row.id === id || row.legacy_filament_id === id)?.id;
  const change = (next: OrderItem[]) => onChange(summarizeOrderItems(order, next));
  const add = () => {
    const product = createManualOrderProduct(userId, filaments, printers, settings);
    const item = buildOrderItem(product, 1, { userId, orderId: order.id ?? '', variantId: variantFor(product.filament_id) });
    change([...items, item]); setEditing({ index: items.length, product: orderItemToProduct(item) });
  };
  return <div className="space-y-4">
    <Input label="Название заказа" aria-label="Название заказа" value={order.title ?? ''}
      onChange={event => onChange({ ...order, title: event.target.value })} />
    {locked && <p role="status" className="text-amber-400 text-xs">После начала выполнения заказа количество и расчётные параметры защищены. Финансы, контакты и статус можно редактировать.</p>}
    <CockpitButton icon={Plus} disabled={locked} onClick={add}>Добавить деталь</CockpitButton>
    {!items.length && <p className="text-neutral-400 text-xs">Добавьте деталь вручную или выберите сохранённый товар слева.</p>}
    {items.map((item, index) => <section key={index} className="space-y-3 rounded-xl border border-white/10 p-3">
      <div className="flex items-center justify-between gap-2 text-xs font-mono">
        <span className="text-white font-bold">{item.name} · {item.quantity} шт.</span>
        <div className="flex gap-2">
          <CockpitButton disabled={locked || item.snapshot.recipe?.product_snapshot?.type === 'assembly'} onClick={() => setEditing(editing?.index === index ? null : { index, product: orderItemToProduct(item) })}>{editing?.index === index ? 'Свернуть расчёт' : 'Редактировать расчёт'}</CockpitButton>
          <CockpitButton disabled={locked} onClick={() => { setEditing(null); change(items.filter((_, position) => position !== index)); }}>Удалить деталь</CockpitButton>
        </div>
      </div>
      {item.snapshot.recipe?.product_snapshot?.type === 'assembly' && <div className="space-y-2 text-xs text-neutral-400">
        <p>Состав сборки сохранён в snapshot заказа. Изменение состава выполняется в каталоге для новых заказов.</p>
        <NumberInput label="Количество сборок" value={item.quantity} min={1} disabled={locked} onChange={value => {
          const recipe = item.snapshot.recipe!;
          const product = { ...orderItemToProduct(item), type: 'assembly' as const };
          const persisted = state?.orderItems.some(row => row.id === item.id);
          const replacement = buildOrderItem(product, value ?? 1, { userId: item.user_id, orderId: item.source_order_id,
            id: persisted ? crypto.randomUUID() : item.id, recipe });
          replacement.created_at = item.created_at;
          change(items.map((row, position) => position === index ? replacement : row));
        }} />
      </div>}
      {!locked && editing?.index === index ? <ProductCalculationEditor embedded product={editing.product}
        filaments={filaments} printers={printers} settings={settings} currencySymbol={currency} onClose={() => setEditing(null)}
        onDraftChange={patch => {
          try {
            const product = { ...editing.product, ...patch };
            const variantId = variantFor(product.filament_id);
            if (product.weight_g > 0 && !variantId) setError('Назначьте складской вариант материала для производства.');
            const persisted = state?.orderItems.some(row => row.id === item.id);
            const replacement = replaceOrderItem(item, product, variantId, persisted ? crypto.randomUUID() : item.id);
            // Stable presentation key keeps active inputs focused while canonical identity changes.
            replacement.created_at = item.created_at;
            change(items.map((row, position) => position === index ? replacement : row));
            if (!product.weight_g || variantId) setError('');
          } catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось изменить расчёт.'); }
        }} /> : <OrderItemSummary item={item} currency={currency} state={state} />}
    </section>)}
    {error && <p role="alert" className="text-rose-400 text-xs">{error}</p>}
  </div>;
}

export function OrderItemsFinancials({ order, onChange, currency = '₽', state }: {
  order: Partial<Order>; onChange: (order: Partial<Order>) => void; currency?: string; state?: FoundationState | null;
}) {
  const financials = calculateOrderFinancials(order);
  const finalAmount = financials.finalAmount;
  const outcome = financials;
  const update = (patch: Partial<Order>) => {
    const next = { ...order, ...patch };
    onChange({ ...next, amount: next.agreed_price ?? calculateOrderFinancials(next).finalAmount });
  };
  return <div className="space-y-4">
    <OrderItemReceipts items={order.items ?? []} currency={currency} state={state} />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <CockpitDropdown label="Скидка всего заказа" ariaLabel="Скидка всего заказа" value={order.discount_type ?? 'percent'}
        options={[{value:'percent',label:'Процент'},{value:'fixed',label:'Сумма'}]}
        onChange={value => update({discount_type:value as 'percent'|'fixed',discount_percent:0,discount_amount:0})} />
      <NumberInput label={order.discount_type === 'fixed' ? 'Скидка заказа, сумма' : 'Скидка заказа, %'} min={0} max={order.discount_type === 'fixed' ? undefined : 100}
        value={order.discount_type === 'fixed' ? order.discount_amount ?? 0 : order.discount_percent ?? 0}
        onChange={value => update(order.discount_type === 'fixed' ? {discount_amount:value ?? 0} : {discount_percent:value ?? 0})} />
      <CockpitDropdown label="Срочность всего заказа" ariaLabel="Срочность всего заказа" value={order.urgency_type ?? 'percent'}
        options={[{value:'percent',label:'Процент'},{value:'fixed',label:'Сумма'}]}
        onChange={value => update({urgency_type:value as 'percent'|'fixed',urgency_percent:0,urgency_amount:0})} />
      <NumberInput label={order.urgency_type === 'fixed' ? 'Срочность заказа, сумма' : 'Срочность заказа, %'} min={0}
        value={order.urgency_type === 'fixed' ? order.urgency_amount ?? 0 : order.urgency_percent ?? 0}
        onChange={value => update(order.urgency_type === 'fixed' ? {urgency_amount:value ?? 0} : {urgency_percent:value ?? 0})} />
      <NumberInput label="Согласованная цена заказа" value={order.agreed_price ?? null} min={0} allowEmpty
        hint="Пустое поле использует расчёт. 0 задаёт нулевую цену." onChange={value => update({agreed_price:value})} />
      <NumberInput label="Получено оплат" value={order.payment ?? 0} min={0}
        onChange={value => onChange(updateOrderPaymentTotal(order, value ?? 0))} />
    </div>
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs font-mono space-y-2" aria-label="Итог заказа">
      {[
        ['Сумма деталей', order.base_amount ?? 0], ['Себестоимость', order.cost ?? 0],
        ['Скидка заказа', financials.discountTotal], ['Срочность заказа', financials.urgencyCost],
        ['Итого клиенту', finalAmount], ['Получено', order.payment ?? 0],
        ['Осталось оплатить', outcome.debt], ['Фактическая прибыль', outcome.actualProfit], ['Плановая прибыль', outcome.plannedProfit],
      ].map(([label, value]) => <p key={label as string} className="flex justify-between gap-3"><span>{label}</span><strong>{formatCurrency(value as number, currency)}</strong></p>)}
    </div>
  </div>;
}
