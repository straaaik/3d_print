import React from 'react';
import { formatCurrency } from '../lib/format';
import type { CustomCostBreakdownItem, DetailedCalculationResult,
  ProjectTotalsResult, CalculateCostParams } from '../lib/formulas';
import { calculateProjectResources } from '../lib/formulas';

export interface ReceiptProjectLine {
  inputs?: CalculateCostParams;
  name: string;
  quantity: number;
  result: DetailedCalculationResult;
}

export type CalculationReceiptProps =
  | { kind: 'print'; result: DetailedCalculationResult; title?: string; currency?: string }
  | { kind: 'project'; result: ProjectTotalsResult; lines: ReceiptProjectLine[];
      title?: string; currency?: string };

const modeLabels: Record<CustomCostBreakdownItem['mode'], string> = {
  profit_only: 'В прибыль',
  cost_with_markup: 'С наценкой',
  cost_no_markup: 'Без наценки',
};

function ReceiptRow({ label, value, currency, strong = false }: {
  label: string; value: number; currency: string; strong?: boolean;
}) {
  return <div className={`flex items-baseline justify-between gap-3 py-1 ${strong ? 'font-semibold' : ''}`}>
    <span>{label}</span><span className="tabular-nums whitespace-nowrap">{formatCurrency(value, currency)}</span>
  </div>;
}

function PriceSummary({ result, currency }: {
  result: DetailedCalculationResult | ProjectTotalsResult; currency: string;
}) {
  return <>
    <ReceiptRow label="Себестоимость" value={result.totalBaseCost} currency={currency} />
    <ReceiptRow label="Цена до общих корректировок" value={result.baseRetailPrice} currency={currency} />
    {result.urgencyCost > 0 && <ReceiptRow label="Срочность" value={result.urgencyCost} currency={currency} />}
    {result.discountTotal > 0 && <ReceiptRow label="Скидка" value={-result.discountTotal} currency={currency} />}
    {result.isMinOrderApplied && <ReceiptRow label="Минимальная цена" value={result.computedFinalPrice} currency={currency} />}
    {result.agreedPrice !== null && <>
      <ReceiptRow label="Расчётная цена" value={result.computedFinalPrice} currency={currency} />
      <ReceiptRow label="Корректировка цены" value={result.priceAdjustment} currency={currency} />
      <ReceiptRow label="Согласованная цена" value={result.agreedPrice} currency={currency} strong />
    </>}
    <div className="border-t border-neutral-950/20 mt-1 pt-1">
      <ReceiptRow label="Итоговая цена" value={result.totalFinalPrice} currency={currency} strong />
      <ReceiptRow label="Плановая прибыль" value={result.plannedProfit} currency={currency} />
    </div>
    {result.isBelowCost && <p role="status" className="mt-2 border border-rose-900/40 bg-rose-950/10 px-2 py-1 text-rose-950 font-semibold">
      Цена ниже себестоимости
    </p>}
  </>;
}

function PrintDetails({ result, currency }: { result: DetailedCalculationResult; currency: string }) {
  return <>
    <ReceiptRow label="Материал" value={result.materialCost} currency={currency} />
    <ReceiptRow label="Электроэнергия" value={result.electricityCost} currency={currency} />
    <ReceiptRow label="Амортизация" value={result.depreciationCost} currency={currency} />
    <ReceiptRow label="Брак и тесты" value={result.defectCost} currency={currency} />
    <ReceiptRow label={result.isOwnerLabor ? 'Труд владельца' : 'Труд мастера'}
      value={result.laborCost} currency={currency} />
    {result.customCostsBreakdown.map(item => <div key={item.id} className="flex justify-between gap-3 py-1">
      <span>{item.name} <span className="text-neutral-700">· {modeLabels[item.mode ?? (item.target === 'profit' ? 'profit_only' : 'cost_with_markup')]}{item.isPerUnit ? ' · за шт.' : ''}</span></span>
      <span className="tabular-nums whitespace-nowrap">{formatCurrency(item.totalAmount, currency)}</span>
    </div>)}
  </>;
}

/** Reusable, read-only receipt for a single print batch or a calculation project. */
export function CalculationReceipt(props: CalculationReceiptProps) {
  const currency = props.currency ?? '₽';
  const resources = props.kind === 'project' ? calculateProjectResources(props.lines) : null;
  return <section aria-label={props.title ?? 'Смета расчёта'}
    className="rounded-xl border border-white/10 bg-[var(--cockpit-accent-color)] text-neutral-950 p-4 font-mono text-xs">
    <h2 className="mb-3 border-b border-neutral-950/20 pb-2 font-semibold uppercase tracking-wider">
      {props.title ?? (props.kind === 'project' ? 'Смета проекта' : 'Смета печати')}
    </h2>
    {props.kind === 'print' ? <>
      <PrintDetails result={props.result} currency={currency} />
      <PriceSummary result={props.result} currency={currency} />
    </> : <>
      <div className="mb-3 border-b border-neutral-950/20 pb-2 space-y-1 tabular-nums">
        <p>Позиций: {resources!.positionCount} · Изделий: {props.result.quantity} шт.</p>
        <p>Общий вес: {resources!.weightG.toLocaleString('ru-RU', { maximumFractionDigits: 3 })} г</p>
        <p>Время печати: {resources!.printHours.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ч</p>
        {resources!.materials.map(material => <p key={material.id}>{material.name}: {material.grams.toLocaleString('ru-RU', { maximumFractionDigits: 3 })} г</p>)}
      </div>
      <div className="mb-3 space-y-3">
        {props.lines.map((line, index) => <div key={`${line.name}-${index}`} className="border-b border-neutral-950/15 pb-2">
          <div className="flex justify-between gap-3 font-semibold">
            <span>{line.name} · {line.quantity} шт.</span>
            <span className="tabular-nums">{formatCurrency(line.result.totalFinalPrice, currency)}</span>
          </div>
          <div className="mt-1 pl-3 text-neutral-800"><PrintDetails result={line.result} currency={currency} /></div>
        </div>)}
      </div>
      <PriceSummary result={props.result} currency={currency} />
      <p className="py-1">Маржа проекта: {props.result.marginPercent.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%</p>
      <ReceiptRow label="Получено оплат" value={props.result.payment}
        currency={currency} />
      <ReceiptRow label="Фактическая прибыль" value={props.result.actualProfit} currency={currency} />
      <ReceiptRow label="Долг" value={props.result.debt} currency={currency} />
    </>}
  </section>;
}
