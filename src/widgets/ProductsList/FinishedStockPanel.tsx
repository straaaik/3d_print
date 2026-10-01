'use client';

import { useRef, useState } from 'react';
import { useData } from '../../entities/model/DataProvider';
import { useInventory } from '../../entities/model/InventoryProvider';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../shared/ui/CockpitDropdown';
import { CockpitModal } from '../../shared/ui/CockpitModal';
import { Input } from '../../shared/ui/Input';
import { Factory, PackageCheck } from 'lucide-react';
import { NumberInput } from '../../shared/ui/NumberInput';
import { createProductionRecipe } from '../../shared/lib/productionRecipe';
import { formatCurrency } from '../../shared/lib/format';

export function FinishedStockPanel() {
  const { savedCalculations, filaments, printers, settings } = useData();
  const inventory = useInventory();
  const [expanded, setExpanded] = useState(false);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number | null>(0);
  const [unitCost, setUnitCost] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const product = savedCalculations.find(item => item.id === productId);
  const balance = inventory.state?.finishedBalances.find(item => item.source_product_id === productId);
  const currency = settings?.currency ?? '₽';
  const movements = (inventory.state?.finishedMovements ?? []).filter(item => item.source_product_id === productId).slice(-10).reverse();
  const run = async (produce: boolean) => {
    if (!product || !inventory.state || busyRef.current) return;
    busyRef.current = true; setBusy(true); setNotice(null);
    try {
      const base = { id: crypto.randomUUID(), occurredAt: new Date().toISOString(), productId: product.id };
      const result = await inventory.execute(produce ? { ...base, kind: 'produce', quantity: 1,
        recipe: createProductionRecipe(product, inventory.state, savedCalculations, filaments, printers, settings) }
        : { ...base, kind: 'adjustFinished', quantity: quantity ?? 0, unitCost: unitCost ?? 0,
          ...(reason.trim() ? { reason: reason.trim() } : {}) });
      const missing = result.state.deficits.filter(item => item.event_key === base.id).reduce((sum, item) => sum + item.grams, 0);
      const next = result.state.finishedBalances.find(item => item.source_product_id === product.id);
      setQuantity(next?.quantity ?? 0);
      if (!produce) setReason('');
      setNotice(`${produce ? 'Произведена 1 единица.' : 'Ручная корректировка сохранена.'}${missing ? ` Дефицит филамента: ${missing.toFixed(2)} г.` : ''}${result.pendingCount ? ' Сохранено на устройстве; ожидает синхронизации.' : ''}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Не удалось сохранить изменение.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <>
    <CockpitButton icon={PackageCheck} onClick={() => setExpanded(true)}>Готовый склад</CockpitButton>
    <CockpitModal isOpen={expanded} onClose={() => { if (!busy) setExpanded(false); }} title="Готовый склад"
      subtitle="Производство и ручная корректировка" maxWidth="3xl"
      footer={<span>Производство расходует филамент. Ручная корректировка меняет только готовый остаток. Розничная цена товара сохраняется.</span>}>
      <div className="space-y-4">
        {inventory.error && <p role="status" className="rounded-lg border border-amber-500/25 bg-amber-950/15 px-3 py-2 text-[11px] text-amber-300">{inventory.error}</p>}
        <CockpitDropdown label="Товар" value={productId} searchable usePortal disabled={busy || inventory.isLoading}
          placeholder="Выбрать товар"
          options={savedCalculations.map(item => ({ value: item.id, label: item.name }))}
          onChange={id => {
            setProductId(id); setNotice(null); setReason('');
            const item = savedCalculations.find(product => product.id === id);
            const stock = inventory.state?.finishedBalances.find(balance => balance.source_product_id === id);
            setQuantity(stock?.quantity ?? item?.stock_quantity ?? 0);
            setUnitCost(stock?.average_unit_cost ?? (item ? item.base_cost / (item.quantity || 1) : 0));
          }} />
        {product && <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Metric label="Готово" value={`${balance?.quantity ?? 0} шт.`} detail="физический остаток" />
            <Metric label="Средняя себестоимость" value={`${formatCurrency(balance?.average_unit_cost ?? 0, currency)}/шт.`} detail="по производству" />
            <Metric label="Цена каталога" value={`${formatCurrency(product.final_price / Math.max(1, product.quantity ?? 1), currency)}/шт.`} detail="не меняется складом" />
          </div>
          <div className="flex justify-end">
            <CockpitButton icon={Factory} disabled={busy || !inventory.state} onClick={() => { void run(true); }}>Произвести +1</CockpitButton>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 items-end border-t border-white/10 pt-4">
            <NumberInput label="Готовый остаток после корректировки, шт." min={0} value={quantity} onChange={setQuantity} disabled={busy} />
            <NumberInput label="Себестоимость добавляемой единицы" min={0} value={unitCost} onChange={setUnitCost} disabled={busy} />
            <div className="sm:col-span-2">
              <Input label="Причина корректировки (необязательно)" aria-label="Причина корректировки" value={reason} disabled={busy}
                onChange={event => setReason(event.target.value)} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <CockpitButton disabled={busy || !Number.isSafeInteger(quantity) || quantity === null || quantity < 0}
                onClick={() => { void run(false); }}>Сохранить ручной остаток</CockpitButton>
            </div>
          </div>
          <div className="border-t border-white/10 pt-3">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-300">Последние движения готового товара</h3>
            <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {movements.length === 0 ? <p className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-neutral-500">Движений пока нет.</p>
                : movements.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-neutral-950/55 px-3 py-2 text-[11px]">
                  <span className="font-semibold text-neutral-200">{SOURCE_LABELS[item.source] ?? item.source}</span>
                  <span className="tabular-nums text-neutral-500">{formatCurrency(item.unit_cost, currency)}/шт.</span>
                  <span className="text-right tabular-nums"><span className={item.delta_quantity < 0 ? 'text-amber-300' : 'text-emerald-300'}>{item.delta_quantity > 0 ? '+' : ''}{item.delta_quantity} шт.</span>
                    <span className="ml-2 text-neutral-500">После: {item.balance_after}</span></span>
                </div>)}
            </div>
          </div>
        </>}
        {notice && <p role="status" className="rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 text-[11px] text-neutral-300">{notice}</p>}
      </div>
    </CockpitModal>
  </>;
}

const SOURCE_LABELS: Record<string, string> = { production: 'Производство', manual_adjustment: 'Корректировка',
  opening_balance: 'Начальный остаток', order: 'Выдача в заказ', purchase: 'Закупка', finished_return: 'Возврат готового' };

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-white/10 bg-neutral-950/65 px-3 py-2.5">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</div>
    <div className="mt-1 truncate text-base font-bold tabular-nums text-white">{value}</div>
    <div className="mt-0.5 truncate text-[10px] text-neutral-500">{detail}</div>
  </div>;
}
