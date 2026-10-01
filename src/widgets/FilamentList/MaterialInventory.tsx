'use client';

import React, { useState } from 'react';
import { Boxes, CircleAlert, PackagePlus, Pencil, Plus, RotateCw, Search } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useData } from '../../entities/model/DataProvider';
import { useInventory } from '../../entities/model/InventoryProvider';
import { formatCurrency, formatDate } from '../../shared/lib/format';
import { MATERIAL_DIFFICULTY_CONFIGS } from '../../shared/lib/materialDifficulty';
import type { InventoryCommand } from '../../shared/lib/inventoryEngine';
import type { FilamentManufacturer, FilamentVariant, MaterialLine, MaterialType } from '../../shared/types/foundation';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../shared/ui/CockpitDropdown';
import { CockpitModal } from '../../shared/ui/CockpitModal';
import { ColorPicker } from '../../shared/ui/ColorPicker';
import { Input } from '../../shared/ui/Input';
import { NumberInput } from '../../shared/ui/NumberInput';
import { InventoryCockpitShell } from '../InventoryCockpit/InventoryCockpitShell';

type Editor = { kind: 'manufacturer' | 'materialType' | 'materialLine' | 'variant'; entityId: string | null }
  | { kind: 'purchase'; variantId: string };
const grams = (value: number) => `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} г`;
const unitPrice = (value: number, currency: string) =>
  `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 5 })} ${currency}/г`;

export function MaterialInventory() {
  const { state, isLoading, pendingCount, error, mode, execute, reload } = useInventory();
  const { settings } = useData();
  const currency = settings?.currency ?? '₽';
  const difficultyOptions = [
    { value: '', label: 'Не задана' },
    ...Object.values(MATERIAL_DIFFICULTY_CONFIGS).map((item) => ({
      value: item.id, label: item.name, subtext: item.description,
      badge: `${settings?.material_multipliers?.[item.id] ?? item.defaultMarkup}%`,
    })),
  ];
  const difficultyLabel = (id: string | null) => {
    if (!id) return 'Без категории сложности';
    const config = MATERIAL_DIFFICULTY_CONFIGS[id as keyof typeof MATERIAL_DIFFICULTY_CONFIGS];
    return config ? `${config.shortLabel} · ${settings?.material_multipliers?.[config.id] ?? config.defaultMarkup}%` : id;
  };
  const reducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0CB4E0');
  const [manufacturerId, setManufacturerId] = useState('');
  const [materialTypeId, setMaterialTypeId] = useState('');
  const [materialLineId, setMaterialLineId] = useState('');
  const [difficultyId, setDifficultyId] = useState('');
  const [weightG, setWeightG] = useState<number | null>(1000);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const manufacturers = state?.manufacturers ?? [];
  const types = state?.materialTypes ?? [];
  const lines = state?.materialLines ?? [];
  const variants = state?.variants ?? [];
  const manufacturerById = new Map(manufacturers.map((item) => [item.id, item]));
  const typeById = new Map(types.map((item) => [item.id, item]));
  const lineById = new Map(lines.map((item) => [item.id, item]));
  const visible = variants.filter((variant) => {
    const line = variant.material_line_id ? lineById.get(variant.material_line_id) : null;
    const maker = line?.manufacturer_id ? manufacturerById.get(line.manufacturer_id) : null;
    const type = line?.material_type_id ? typeById.get(line.material_type_id) : null;
    return [variant.name, line?.name, maker?.name, type?.name].join(' ').toLocaleLowerCase('ru-RU')
      .includes(query.trim().toLocaleLowerCase('ru-RU'));
  });
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;
  const selectedLine = selected?.material_line_id ? lineById.get(selected.material_line_id) : null;
  const selectedMaker = selectedLine?.manufacturer_id ? manufacturerById.get(selectedLine.manufacturer_id) : null;
  const selectedType = selectedLine?.material_type_id ? typeById.get(selectedLine.material_type_id) : null;
  const movements = (state?.filamentMovements ?? []).filter((item) => item.variant_id === selected?.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const deficits = (state?.deficits ?? []).filter((item) => item.variant_id === selected?.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const purchasesByEvent = new Map((state?.purchases ?? []).map((item) => [item.event_key, item]));
  const stock = variants.reduce((sum, item) => sum + item.stock_g, 0);
  const stockValue = variants.reduce((sum, item) => sum + item.stock_g * item.average_cost_per_g, 0);
  const deficitG = (state?.deficits ?? []).reduce((sum, item) => sum + item.grams, 0);

  const begin = (next: Editor) => {
    setEditor(next); setFormError(null); setName(''); setColor('#0CB4E0');
    setManufacturerId(''); setMaterialTypeId(''); setMaterialLineId(''); setDifficultyId('');
    setWeightG(1000); setTotalPrice(null);
  };
  const editManufacturer = (item?: FilamentManufacturer) => {
    begin({ kind: 'manufacturer', entityId: item?.id ?? null }); setName(item?.name ?? '');
  };
  const editType = (item?: MaterialType) => {
    begin({ kind: 'materialType', entityId: item?.id ?? null });
    setName(item?.name ?? ''); setDifficultyId(item?.difficulty_id ?? '');
  };
  const editLine = (item?: MaterialLine) => {
    begin({ kind: 'materialLine', entityId: item?.id ?? null });
    setName(item?.name ?? ''); setManufacturerId(item?.manufacturer_id ?? ''); setMaterialTypeId(item?.material_type_id ?? '');
  };
  const editVariant = (item?: FilamentVariant) => {
    begin({ kind: 'variant', entityId: item?.id ?? null });
    setName(item?.name ?? ''); setColor(item?.color ?? '#0CB4E0'); setMaterialLineId(item?.material_line_id ?? '');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || busy) return;
    const base = { id: crypto.randomUUID(), occurredAt: new Date().toISOString() };
    let command: InventoryCommand;
    if (editor.kind === 'purchase') {
      if (weightG === null || !Number.isFinite(weightG) || weightG <= 0 ||
        totalPrice === null || !Number.isFinite(totalPrice) || totalPrice < 0) {
        setFormError('Укажите вес больше нуля и стоимость от нуля.'); return;
      }
      command = { ...base, kind: 'purchase', variantId: editor.variantId, weightG, totalPrice };
    } else {
      if (!name.trim()) { setFormError('Укажите название.'); return; }
      const entityId = editor.entityId ?? crypto.randomUUID();
      if (editor.kind === 'manufacturer') command = { ...base, kind: 'saveManufacturer', entityId, name: name.trim() };
      else if (editor.kind === 'materialType') command = { ...base, kind: 'saveMaterialType', entityId, name: name.trim(), difficultyId: difficultyId || null };
      else if (editor.kind === 'materialLine') command = { ...base, kind: 'saveMaterialLine', entityId, name: name.trim(), manufacturerId: manufacturerId || null, materialTypeId: materialTypeId || null };
      else command = { ...base, kind: 'saveVariant', entityId, name: name.trim(), color, materialLineId: materialLineId || null };
    }
    setBusy(true); setFormError(null);
    try {
      await execute(command);
      if (command.kind === 'saveVariant') setSelectedId(command.entityId);
      if (command.kind === 'purchase') setSelectedId(command.variantId);
      setEditor(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Не удалось сохранить изменение.');
    } finally { setBusy(false); }
  };
  const title = editor?.kind === 'purchase' ? 'Закупка филамента' :
    editor?.kind === 'manufacturer' ? 'Производитель' : editor?.kind === 'materialType' ? 'Тип материала' :
      editor?.kind === 'materialLine' ? 'Линейка материала' : 'Цветовой вариант';

  return <InventoryCockpitShell section="МАТЕРИАЛЫ" sectionLabel="Склад материалов" icon={<Boxes className="h-5 w-5" />}
    isExpanded={expanded} onExpandedChange={setExpanded} isOnline={mode === 'cloud'}
    recordCount={variants.length} filteredCount={visible.length}
    actions={<>
      <span aria-live="polite" className="font-mono text-[10px] text-neutral-500">
        {pendingCount ? `Синхронизация: ${pendingCount}` : mode === 'cloud' ? 'Облако' : 'Локальный режим'}
      </span>
      <CockpitButton icon={RotateCw} onClick={() => { void reload(); }} disabled={isLoading} aria-label="Обновить склад">Обновить</CockpitButton>
      <CockpitButton icon={Plus} onClick={() => editVariant()} disabled={isLoading}>Новый вариант</CockpitButton>
    </>}>
    <div className="space-y-4 p-3 sm:p-5">
      {error && <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 font-mono text-xs text-rose-300">{error}</div>}
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Варианты" value={String(variants.length)} detail={`${lines.length} линеек`} />
        <Metric label="Остаток на складе" value={grams(stock)} detail={formatCurrency(stockValue, currency)} />
        <Metric label="Недостача при выпуске" value={grams(deficitG)} detail={`${state?.deficits.length ?? 0} записей`} warning={deficitG > 0} />
      </div>

      <section aria-label="Справочники материалов" className="rounded-xl border border-white/10 bg-neutral-900/35 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">Структура материалов</h2>
            <p className="mt-1 text-xs text-neutral-500">Производитель → тип → линейка → цветовой вариант.</p></div>
          <div className="flex flex-wrap gap-1.5">
            <CockpitButton icon={Plus} onClick={() => editManufacturer()}>Производитель</CockpitButton>
            <CockpitButton icon={Plus} onClick={() => editType()}>Тип</CockpitButton>
            <CockpitButton icon={Plus} onClick={() => editLine()}>Линейка</CockpitButton>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <Directory title="Производители" empty="Пока нет производителей">
            {manufacturers.map((item) => <DirectoryItem key={item.id} label={item.name} onEdit={() => editManufacturer(item)} />)}
          </Directory>
          <Directory title="Типы материала" empty="Пока нет типов">
            {types.map((item) => <DirectoryItem key={item.id} label={item.name}
              detail={difficultyLabel(item.difficulty_id)}
              onEdit={() => editType(item)} />)}
          </Directory>
          <Directory title="Линейки" empty="Пока нет линеек">
            {lines.map((item) => <DirectoryItem key={item.id} label={item.name}
              detail={[item.manufacturer_id ? manufacturerById.get(item.manufacturer_id)?.name : null,
                item.material_type_id ? typeById.get(item.material_type_id)?.name : null].filter(Boolean).join(' · ') || 'Без привязки'}
              onEdit={() => editLine(item)} />)}
          </Directory>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(350px,0.9fr)]">
        <section aria-label="Варианты филамента" className="min-w-0 rounded-xl border border-white/10 bg-neutral-900/35 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">Варианты на складе</h2>
              <p className="mt-1 text-xs text-neutral-500">Выберите вариант для операций и истории.</p></div>
            <CockpitButton icon={Plus} onClick={() => editVariant()}>Добавить вариант</CockpitButton>
          </div>
          <label className="mb-3 flex items-center gap-2 rounded-lg border border-white/15 bg-neutral-950/80 px-3 text-neutral-500">
            <Search className="h-4 w-4 shrink-0" /><span className="sr-only">Поиск материала</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название, линейка, производитель..."
              aria-label="Поиск материала" className="h-9 w-full bg-transparent font-mono text-xs text-white outline-none placeholder:text-neutral-600" />
          </label>
          {visible.length === 0 ? <div className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center text-xs text-neutral-500">
            {isLoading ? 'Загружаем материалы…' : variants.length ? 'По запросу ничего не найдено.' : 'Создайте первый цветовой вариант.'}
          </div> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{visible.map((variant) => {
            const line = variant.material_line_id ? lineById.get(variant.material_line_id) : null;
            const active = selected?.id === variant.id;
            return <motion.button key={variant.id} type="button" onClick={() => setSelectedId(variant.id)} aria-pressed={active}
              whileHover={reducedMotion ? undefined : { backgroundColor: 'rgba(255,255,255,0.065)', borderColor: 'rgba(255,255,255,0.25)' }}
              transition={{ duration: 0.18 }}
              className={`w-full rounded-xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${active ? 'border-white/30 bg-white/[0.07]' : 'border-white/10 bg-neutral-950/50'}`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: variant.color }} aria-hidden="true" />
                <div className="min-w-0 flex-1"><div className="truncate font-mono text-xs font-bold text-white">{variant.name}</div>
                  <div className="mt-0.5 truncate text-[11px] text-neutral-500">{line?.name ?? 'Без линейки'}</div></div>
                <span className="font-mono text-xs font-bold tabular-nums text-white">{grams(variant.stock_g)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 font-mono text-[10px] text-neutral-500">
                <span>Средняя себестоимость</span><span className="tabular-nums text-neutral-300">{unitPrice(variant.average_cost_per_g, currency)}</span>
              </div>
            </motion.button>;
          })}</div>}
        </section>

        <section aria-label="Детали материала" className="min-w-0 rounded-xl border border-white/10 bg-neutral-900/35 p-3 sm:p-4">
          {selected ? <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><span className="h-9 w-9 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: selected.color }} aria-hidden="true" />
                <div className="min-w-0"><h2 className="truncate font-mono text-sm font-bold text-white">{selected.name}</h2>
                  <p className="mt-0.5 text-[11px] text-neutral-500">{[selectedMaker?.name, selectedType?.name, selectedLine?.name].filter(Boolean).join(' · ') || 'Без привязки к линейке'}</p></div></div>
              <div className="flex gap-1.5"><CockpitButton icon={Pencil} onClick={() => editVariant(selected)}>Изменить</CockpitButton>
                <CockpitButton icon={PackagePlus} onClick={() => begin({ kind: 'purchase', variantId: selected.id })}>Закупка</CockpitButton></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metric label="Остаток" value={grams(selected.stock_g)} detail="доступно для печати" />
              <Metric label="Средняя за грамм" value={unitPrice(selected.average_cost_per_g, currency)} detail="по закупкам" />
            </div>
            {deficits.length > 0 && <div role="status" className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/15 px-3 py-2 font-mono text-[11px] text-amber-300">
              <CircleAlert className="mr-1.5 inline h-3.5 w-3.5" />Недостача для выпуска: {grams(deficits.reduce((sum, item) => sum + item.grams, 0))}. Записей: {deficits.length}.
            </div>}
            <div className="mt-4 border-t border-white/10 pt-3"><h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-300">Движение филамента</h3>
              <p className="mt-1 text-[11px] text-neutral-500">Остаток после операции и фактически списанные граммы.</p>
              <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {movements.length === 0 ? <p className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-neutral-500">Движений пока нет.</p> : movements.map((item) => {
                  const purchased = purchasesByEvent.get(item.event_key);
                  return <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-neutral-950/55 px-3 py-2 font-mono text-[11px]">
                    <div className="min-w-0"><div className="font-semibold text-neutral-200">{item.source === 'purchase' ? 'Закупка' : item.source === 'opening_balance' ? 'Начальный остаток' : item.source === 'production' ? 'Производство' : item.source === 'order' ? 'Заказ' : 'Корректировка'}</div>
                      <div className="text-neutral-500">{formatDate(item.created_at)}{purchased ? ` · ${formatCurrency(purchased.total_price, currency)}` : ''}</div></div>
                    <div className="text-right tabular-nums"><div className={item.delta_g < 0 ? 'text-amber-300' : 'text-emerald-300'}>{item.delta_g > 0 ? '+' : ''}{grams(item.delta_g)}</div>
                      <div className="text-neutral-500">После: {grams(item.balance_after_g)}</div></div>
                  </div>;
                })}
              </div>
            </div>
            {deficits.length > 0 && <div className="mt-4 border-t border-white/10 pt-3"><h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">Журнал недостач</h3>
              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">{deficits.map((item) => <div key={item.id} className="flex justify-between gap-2 font-mono text-[11px] text-neutral-400">
                <span>{formatDate(item.created_at)}</span><span className="tabular-nums text-amber-300">{grams(item.grams)}</span></div>)}</div></div>}
          </> : <div className="flex min-h-44 items-center justify-center text-center text-xs text-neutral-500">Выберите материал, чтобы увидеть остаток и журнал операций.</div>}
        </section>
      </div>
    </div>

    <CockpitModal isOpen={editor !== null} onClose={() => { if (!busy) setEditor(null); }} title={title}
      subtitle={editor?.kind === 'purchase' ? variants.find((item) => item.id === editor.variantId)?.name : undefined}
      footer={<><span>{editor?.kind === 'purchase' ? 'Закупка пересчитает среднюю себестоимость сырья.' : 'Изменения сохраняются в справочнике.'}</span>
        <CockpitButton type="submit" form="material-inventory-form" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</CockpitButton></>}>
      <form id="material-inventory-form" onSubmit={submit} className="space-y-4">
        {editor?.kind === 'purchase' ? <>
          <NumberInput label="Вес закупки, г" value={weightG} onChange={setWeightG} min={0.001} allowEmpty required hint="Положительное количество в граммах" />
          <NumberInput label={`Общая стоимость, ${currency}`} value={totalPrice} onChange={setTotalPrice} min={0} allowEmpty required
            hint="Средняя цена за грамм обновится по остатку и этой закупке" />
          {weightG !== null && weightG > 0 && totalPrice !== null && totalPrice >= 0 && <div className="rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 font-mono text-[11px] text-neutral-400">
            Цена закупки: <span className="text-white">{unitPrice(totalPrice / weightG, currency)}</span></div>}
        </> : <>
          <Input label="Название" aria-label="Название" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
          {editor?.kind === 'materialType' && <CockpitDropdown label="Сложность печати" ariaLabel="Сложность печати" value={difficultyId} onChange={setDifficultyId} options={difficultyOptions} usePortal />}
          {editor?.kind === 'materialLine' && <div className="grid gap-3 sm:grid-cols-2">
            <CockpitDropdown label="Производитель" ariaLabel="Производитель" value={manufacturerId} onChange={setManufacturerId}
              options={[{ value: '', label: 'Не задан' }, ...manufacturers.map((item) => ({ value: item.id, label: item.name }))]} usePortal />
            <CockpitDropdown label="Тип материала" ariaLabel="Тип материала" value={materialTypeId} onChange={setMaterialTypeId}
              options={[{ value: '', label: 'Не задан' }, ...types.map((item) => ({ value: item.id, label: item.name }))]} usePortal />
          </div>}
          {editor?.kind === 'variant' && <>
            <CockpitDropdown label="Линейка материала" ariaLabel="Линейка материала" value={materialLineId} onChange={setMaterialLineId}
              options={[{ value: '', label: 'Без линейки' }, ...lines.map((item) => ({ value: item.id, label: item.name,
                subtext: item.manufacturer_id ? manufacturerById.get(item.manufacturer_id)?.name : undefined }))]} usePortal />
            <ColorPicker label="Цвет филамента" value={color} onChange={setColor} defaultVariant="matrix" />
            {!editor.entityId && <p className="text-[11px] text-neutral-500">Новый вариант начинается с нулевым остатком. Добавьте закупку после сохранения.</p>}
          </>}
        </>}
        {formError && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">{formError}</p>}
      </form>
    </CockpitModal>
  </InventoryCockpitShell>;
}

function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return <div className="rounded-xl border border-white/10 bg-neutral-950/65 px-3 py-2.5 font-mono">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</div>
    <div className={`mt-1 truncate text-base font-bold tabular-nums ${warning ? 'text-amber-300' : 'text-white'}`}>{value}</div>
    <div className="mt-0.5 truncate text-[10px] text-neutral-500">{detail}</div>
  </div>;
}

function Directory({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  return <div className="min-w-0 rounded-lg border border-white/10 bg-neutral-950/55 p-2.5">
    <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">{title}</h3>
    <div className="max-h-36 space-y-1 overflow-y-auto">{React.Children.count(children) ? children : <p className="py-2 text-[11px] text-neutral-600">{empty}</p>}</div>
  </div>;
}

function DirectoryItem({ label, detail, onEdit }: { label: string; detail?: string; onEdit: () => void }) {
  return <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-white/5 bg-white/[0.025] px-2 py-1.5">
    <div className="min-w-0"><div className="truncate font-mono text-[11px] text-neutral-200">{label}</div>
      {detail && <div className="truncate text-[10px] text-neutral-500">{detail}</div>}</div>
    <CockpitButton icon={Pencil} onClick={onEdit} aria-label={`Изменить ${label}`}>Изменить</CockpitButton>
  </div>;
}
