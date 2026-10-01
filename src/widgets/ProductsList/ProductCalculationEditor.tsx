'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import type { CustomCostItem, Filament, Printer, SavedCalculation, Settings } from '../../shared/types';
import { productToCalculatorForm, calculatorFormToProductUpdates,
  type ProductCalculatorForm } from '../../shared/lib/productCalculation';
import { formatCurrency } from '../../shared/lib/format';
import { CalculationReceipt } from '../../shared/ui/CalculationReceipt';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../shared/ui/CockpitDropdown';
import { NumberInput } from '../../shared/ui/NumberInput';
import { Input } from '../../shared/ui/Input';
import { Checkbox } from '../../shared/ui/Checkbox';

export interface ProductCalculationEditorProps {
  product: SavedCalculation;
  filaments?: Filament[];
  printers?: Printer[];
  settings?: Settings | null;
  currencySymbol?: string;
  onSave?: (updates: Partial<SavedCalculation>) => Promise<void> | void;
  onClose: () => void;
  /** Embedded order drafts update locally on each field change; catalog save remains explicit. */
  embedded?: boolean;
  onDraftChange?: (updates: Partial<SavedCalculation>) => void;
  onLoadIntoCalculator?: (product: SavedCalculation) => void;
  onOpenEditAssembly?: (product: SavedCalculation) => void;
  onCreateOrder?: (product: SavedCalculation) => void;
  onOpenStlModal?: (product: SavedCalculation) => void;
  onSetStock?: (product: SavedCalculation, quantity: number) => void;
}

const EMPTY_FILAMENTS: Filament[] = [];
const EMPTY_PRINTERS: Printer[] = [];
const modes = [{ value: 'profit_only', label: 'Только в прибыль' },
  { value: 'cost_with_markup', label: 'В себестоимость с наценкой' },
  { value: 'cost_no_markup', label: 'В себестоимость без наценки' }];
const adjustments = [{ value: 'percent', label: 'Процент' }, { value: 'fixed', label: 'Сумма' }];

/** Local draft only; catalog writes happen exclusively through the awaited Save callback. */
export function ProductCalculationEditor({ product, filaments = EMPTY_FILAMENTS, printers = EMPTY_PRINTERS,
  settings = null, currencySymbol = '₽', onSave, onClose, onLoadIntoCalculator, onOpenEditAssembly,
  onCreateOrder, onOpenStlModal, onSetStock, embedded = false, onDraftChange }: ProductCalculationEditorProps) {
  const [form, setForm] = useState(() => productToCalculatorForm(product, filaments, printers));
  const [baseline, setBaseline] = useState(form);
  const [recalculate, setRecalculate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const allowCloseRef = useRef(false);
  const catalogRevisionRef = useRef(product.catalog_revision ?? 0);
  const fieldPrefix = useId();
  const assembly = product.type === 'assembly';
  const dirty = recalculate || JSON.stringify(form) !== JSON.stringify(baseline);
  const calculationChanged = recalculate || JSON.stringify({ ...form, name: '' }) !== JSON.stringify({ ...baseline, name: '' });
  const patch = assembly ? null : calculatorFormToProductUpdates(form, { filaments, printers, settings, product });
  const snapshot = patch?.calculation_snapshot;
  const missingResources = !assembly && (!snapshot?.inputs.filament || !snapshot.inputs.printer);
  const oldFilament = product.calculation_snapshot?.inputs.filament;
  const currentFilament = filaments.find(item => item.id === form.filamentId);
  const materialChanged = Boolean(oldFilament && currentFilament && oldFilament.weight_g > 0 && currentFilament.weight_g > 0
    && Math.abs(oldFilament.price / oldFilament.weight_g - currentFilament.price / currentFilament.weight_g) > 0.000001);

  const confirmLeave = () => !dirty || window.confirm('Есть несохранённые изменения товара. Отменить их и продолжить?');
  const leave = (action: () => void) => {
    if (!saving && confirmLeave()) {
      allowCloseRef.current = true;
      try { action(); } finally { allowCloseRef.current = false; }
    }
  };

  useEffect(() => {
    if (embedded || (!dirty && !saving)) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const closeEditor = (event: Event) => {
      if (allowCloseRef.current || (event as CustomEvent<{ productId: string }>).detail?.productId !== product.id) return;
      if (saving || !window.confirm('Есть несохранённые изменения товара. Отменить их и продолжить?')) event.preventDefault();
    };
    const navigation = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor || editorRef.current?.contains(anchor) || anchor.getAttribute('target') === '_blank'
        || anchor.getAttribute('href')?.startsWith('#') || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (saving || !window.confirm('Есть несохранённые изменения товара. Отменить их и продолжить?')) {
        event.preventDefault(); event.stopPropagation();
      } else {
        allowCloseRef.current = true;
        queueMicrotask(() => { allowCloseRef.current = false; });
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('3d-product-editor-close', closeEditor);
    document.addEventListener('click', navigation, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('3d-product-editor-close', closeEditor);
      document.removeEventListener('click', navigation, true);
    };
  }, [dirty, saving, product.id, embedded]);

  const update = (updates: Partial<ProductCalculatorForm>) => {
    const next = { ...form, ...updates };
    setForm(next); setError(''); setNotice('');
    if (onDraftChange && !assembly) onDraftChange(calculatorFormToProductUpdates(next, { filaments, printers, settings, product }));
  };
  const changeCost = (id: string, updates: Partial<CustomCostItem>) => update({
    customCosts: form.customCosts.map(item => item.id === id ? { ...item, ...updates } : item),
  });
  const numeric = (key: keyof ProductCalculatorForm, label: string, options?: { min?: number; max?: number; allowEmpty?: boolean }) => {
    const value = form[key] as string;
    return <NumberInput key={key} id={`${fieldPrefix}-${key}`} label={label}
      value={value === '' ? null : Number(value)} min={options?.min ?? 0} max={options?.max}
      allowEmpty={options?.allowEmpty} disabled={saving}
      onChange={next => update({ [key]: next === null ? '' : String(next) })} />;
  };
  const save = async () => {
    if (!onSave || !dirty || saving || !form.name.trim()) return;
    if (calculationChanged && missingResources) { setError('Выберите доступный вариант филамента и принтер.'); return; }
    setSaving(true); setError('');
    try {
      const savedForm = { ...form, name: form.name.trim() };
      await onSave({ ...(assembly || !calculationChanged ? { name: savedForm.name } : { ...patch!, name: savedForm.name }),
        catalog_revision: catalogRevisionRef.current });
      catalogRevisionRef.current += 1;
      setForm(savedForm); setBaseline(savedForm); setRecalculate(false); setNotice('Изменения сохранены');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось сохранить изменения. Черновик сохранён в редакторе.');
    } finally { setSaving(false); }
  };
  const cancel = () => {
    const restored = productToCalculatorForm(product, filaments, printers);
    catalogRevisionRef.current = product.catalog_revision ?? 0;
    setForm(restored); setBaseline(restored); setRecalculate(false); setError(''); setNotice('');
  };

  return <MotionConfig reducedMotion="user"><div ref={editorRef} data-product-editor={product.id}
    className="space-y-4 font-mono text-xs text-white" onKeyDown={event => {
      if (!embedded && event.key === 'Escape') { event.stopPropagation(); leave(onClose); }
    }}>
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
      <span>{embedded ? 'Расчёт позиции' : assembly ? 'Редактирование сборки' : 'Редактирование товара'} · {product.name}</span>
      <span role="status" className={dirty ? 'text-amber-400' : 'text-neutral-500'}>
        {saving ? 'Сохранение…' : dirty ? 'Есть несохранённые изменения' : notice || 'Без изменений'}
      </span>
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
      <fieldset disabled={saving} className="min-w-0 space-y-4">
        <Input id={`${fieldPrefix}-name`} label="Название" aria-label="Название товара" value={form.name}
          className="!bg-neutral-950/80 focus:!border-white/30 focus:!ring-0" onChange={event => update({ name: event.target.value })} />
        {assembly ? <div className="rounded-xl border border-white/10 p-3 space-y-3">
          <p className="text-neutral-400">Расчёт сборки изменяется через спецификацию. Здесь сохраняется название.</p>
          <ul className="space-y-1">
            {product.assembly_parts?.map((part, index) => <li key={part.id ?? index}>{part.name} · {part.quantity} шт.</li>)}
            {product.assembly_hardware?.map(item => <li key={`hardware-${item.id}`}>{item.name} · {item.quantity} шт.</li>)}
            {product.assembly_electronics?.map(item => <li key={`electronics-${item.id}`}>{item.name} · {item.quantity} шт.</li>)}
          </ul>
          {onOpenEditAssembly && <CockpitButton onClick={() => leave(() => onOpenEditAssembly(product))}>Спецификация сборки</CockpitButton>}
        </div> : <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CockpitDropdown label="Материал и цветовой вариант" ariaLabel="Материал и цветовой вариант"
              value={form.filamentId} disabled={saving} usePortal options={[
                ...(!currentFilament ? [{ value: form.filamentId, label: `${form.filamentName || 'Материал'} · недоступен`, color: form.filamentColor }] : []),
                ...filaments.map(item => ({ value: item.id, label: `${item.name} · ${item.color || 'без цвета'}`, color: item.color })),
              ]} onChange={id => { const selected = filaments.find(item => item.id === id);
                update({ filamentId: id, filamentName: selected?.name ?? form.filamentName, filamentColor: selected?.color }); }} />
            <CockpitDropdown label="Принтер" ariaLabel="Принтер" value={form.printerId} disabled={saving} usePortal
              options={[...(!printers.some(item => item.id === form.printerId) ? [{ value: form.printerId, label: `${form.printerName || 'Принтер'} · недоступен` }] : []),
                ...printers.map(item => ({ value: item.id, label: item.name }))]} onChange={id => update({ printerId: id,
                printerName: printers.find(item => item.id === id)?.name ?? form.printerName })} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {numeric('weight', 'Вес печати, г')}{numeric('quantity', 'Количество в тираже', { min: 1 })}
            {numeric('days', 'Время печати, дни')}{numeric('hours', 'Время печати, часы')}{numeric('minutes', 'Время печати, минуты')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {numeric('laborMinutes', 'Труд, минуты')}{numeric('laborRate', 'Ставка труда за час')}
            {numeric('defect', 'Брак, %')}{numeric('markup', 'Наценка, %')}
          </div>
          <div className="flex flex-wrap gap-4 text-neutral-300">
            <Checkbox variant="neutral" size="sm" checked={form.isOwnerLabor} label="Труд владельца в прибыль"
              onChange={(checked: boolean) => update({ isOwnerLabor: checked })} />
            <Checkbox variant="neutral" size="sm" checked={form.isLaborPerUnit} label="Труд за единицу"
              onChange={(checked: boolean) => update({ isLaborPerUnit: checked })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CockpitDropdown label="Режим скидки" ariaLabel="Режим скидки" value={form.discountType} options={adjustments}
              disabled={saving} usePortal onChange={value => update({ discountType: value as 'percent' | 'fixed' })} />
            {numeric('discountValue', form.discountType === 'percent' ? 'Скидка позиции, %' : 'Скидка позиции, сумма')}
            <CockpitDropdown label="Режим срочности" ariaLabel="Режим срочности" value={form.urgencyType} options={adjustments}
              disabled={saving} usePortal onChange={value => update({ urgencyType: value as 'percent' | 'fixed' })} />
            {numeric('urgencyValue', form.urgencyType === 'percent' ? 'Срочность, %' : 'Срочность, сумма')}
            {Number(baseline.discountExtraAmount) > 0 && numeric('discountExtraAmount', 'Дополнительная фиксированная скидка')}
            {Number(baseline.urgencyExtraAmount) > 0 && numeric('urgencyExtraAmount', 'Дополнительная фиксированная срочность')}
            {numeric('agreedPrice', 'Согласованная цена тиража', { allowEmpty: true })}
          </div>
          <p className="text-neutral-500">Пустая согласованная цена использует расчёт; 0 задаёт нулевую цену.</p>
          <div className="rounded-xl border border-white/10 p-3 space-y-3">
            <div className="flex justify-between items-center gap-2"><span>Дополнительные расходы</span>
              <CockpitButton onClick={() => update({ customCosts: [...form.customCosts, { id: crypto.randomUUID(), name: 'Новый расход',
                amount: 0, isEnabled: true, isPerUnit: false, mode: 'cost_with_markup' }] })}>Добавить расход</CockpitButton>
            </div>
            {form.customCosts.map(cost => <div key={cost.id} className="border-t border-white/10 pt-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input id={`${fieldPrefix}-cost-${cost.id}`} label="Название расхода" aria-label="Название расхода" value={cost.name}
                  className="focus:!border-white/30 focus:!ring-0"
                  onChange={event => changeCost(cost.id, { name: event.target.value })} />
                <NumberInput label="Сумма расхода" value={cost.amount} min={0} onChange={value => changeCost(cost.id, { amount: value ?? 0 })} />
                <CockpitDropdown label="Режим расхода" ariaLabel="Режим расхода" options={modes} disabled={saving} usePortal
                  value={cost.mode ?? (cost.target === 'profit' ? 'profit_only' : 'cost_with_markup')}
                  onChange={value => changeCost(cost.id, { mode: value as CustomCostItem['mode'] })} />
              </div>
              <div className="flex flex-wrap gap-3 items-center text-neutral-300">
                <Checkbox variant="neutral" size="sm" checked={cost.isEnabled} label="Учитывать"
                  onChange={(checked: boolean) => changeCost(cost.id, { isEnabled: checked })} />
                <Checkbox variant="neutral" size="sm" checked={cost.isPerUnit ?? false} label="За единицу"
                  onChange={(checked: boolean) => changeCost(cost.id, { isPerUnit: checked })} />
                <CockpitButton onClick={() => update({ customCosts: form.customCosts.filter(item => item.id !== cost.id) })}>Удалить расход</CockpitButton>
              </div>
            </div>)}
          </div>
        </>}
      </fieldset>
      <div className="min-w-0 space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <p>Сохранённая цена тиража: <strong>{formatCurrency(product.final_price, currencySymbol)}</strong></p>
          <p>Сохранённая себестоимость тиража: <strong>{formatCurrency(product.base_cost, currencySymbol)}</strong></p>
          <p className="text-neutral-500">Готовый остаток: {product.stock_quantity ?? 0} шт.</p>
          {onSetStock && <div className="flex gap-2">
            <CockpitButton disabled={saving || (product.stock_quantity ?? 0) <= 0}
              onClick={() => onSetStock(product, Math.max(0, (product.stock_quantity ?? 0) - 1))}>Остаток −1</CockpitButton>
            <CockpitButton disabled={saving} onClick={() => onSetStock(product, (product.stock_quantity ?? 0) + 1)}>Остаток +1</CockpitButton>
          </div>}
        </div>
        {!assembly && <>
          <p className="text-neutral-400">{embedded ? 'Изменения параметров сразу обновляют локальный расчёт позиции.' : 'Предпросмотр использует текущие ресурсы. Цена применяется при сохранении параметров или явном пересчёте.'}</p>
          {materialChanged && <p role="status" className="text-amber-400">Стоимость материала изменилась. Пересчёт применяется только после сохранения.</p>}
          {!oldFilament && <p className="text-neutral-500">Для старого товара исходная стоимость материала не сохранена; проверьте расчёт перед применением.</p>}
          {missingResources && <p role="status" className="text-amber-400">Исходный материал или принтер недоступен. Выберите ресурс для пересчёта.</p>}
          <CockpitButton disabled={saving || missingResources} onClick={() => { setRecalculate(true); setNotice(''); if (embedded && patch) onDraftChange?.(patch); }}>Пересчитать по текущим ресурсам</CockpitButton>
          {(embedded && !calculationChanged ? product.calculation_snapshot : snapshot) && <CalculationReceipt kind="print" result={(embedded && !calculationChanged ? product.calculation_snapshot : snapshot)!.result} title="Смета предлагаемого расчёта" currency={currencySymbol} />}
        </>}
      </div>
    </div>
    {error && <p role="alert" className="text-rose-400">{error}</p>}
    {!embedded && <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-3">
      <div className="flex flex-wrap gap-2">
        <CockpitButton disabled={!onSave || !dirty || saving || !form.name.trim() || (calculationChanged && missingResources)} onClick={save}>Сохранить изменения</CockpitButton>
        <CockpitButton disabled={!dirty || saving} onClick={cancel}>Отменить изменения</CockpitButton>
        {onLoadIntoCalculator && <CockpitButton disabled={saving} onClick={() => leave(() => onLoadIntoCalculator(product))}>Открыть в калькуляторе</CockpitButton>}
        {onCreateOrder && <CockpitButton disabled={saving} onClick={() => leave(() => onCreateOrder(product))}>Создать заказ</CockpitButton>}
        {onOpenStlModal && (product.stl_url || product.stl_file_data) && <CockpitButton disabled={saving} onClick={() => onOpenStlModal(product)}>3D Модель</CockpitButton>}
      </div>
      <CockpitButton disabled={saving} onClick={() => leave(onClose)}>Свернуть</CockpitButton>
    </div>}
  </div></MotionConfig>;
}
