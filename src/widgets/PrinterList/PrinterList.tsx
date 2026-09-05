'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  Banknote,
  BarChart3,
  Bolt,
  Cpu,
  Edit3,
  Gauge,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import { useData } from '../../entities/model/DataProvider';
import type { Printer } from '../../shared/types';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../shared/ui/CockpitDropdown';
import { CockpitModal } from '../../shared/ui/CockpitModal';
import { ColorPicker } from '../../shared/ui/ColorPicker';
import { Input } from '../../shared/ui/Input';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { formatCurrency } from '../../shared/lib/format';
import { usePersistentState } from '../../shared/lib/usePersistentState';
import {
  InventoryCockpitShell,
  InventoryKpiCard,
} from '../InventoryCockpit/InventoryCockpitShell';
import { PrinterMachineIcon } from '../InventoryCockpit/InventoryIcons';
import {
  formatInventoryRegistryDate,
  InventoryRegistryAction,
  InventoryRegistryToolbar,
  InventoryRegistryTable,
  type InventoryRegistryColumn,
} from '../InventoryCockpit/InventoryRegistryTable';
import {
  calculatePrinterMetrics,
  calculatePrinterInsights,
  filterAndSortPrinters,
  getPrinterHourlyCost,
  parseRequiredNonNegative,
  type PrinterSort,
} from '../InventoryCockpit/model';

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'По названию' },
  { value: 'name-desc', label: 'Название Я–А' },
  { value: 'hourly-cost-asc', label: 'Дешевле в час' },
  { value: 'hourly-cost-desc', label: 'Дороже в час' },
  { value: 'price-asc', label: 'Стоимость ↑' },
  { value: 'price-desc', label: 'Стоимость ↓' },
  { value: 'power-asc', label: 'Мощность ↑' },
  { value: 'power-desc', label: 'Мощность ↓' },
  { value: 'lifespan-asc', label: 'Ресурс ↑' },
  { value: 'lifespan-desc', label: 'Ресурс ↓' },
];

export function PrinterList() {
  const { printers, settings, isOnline, addPrinter, updatePrinter, deletePrinter } = useData();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Printer | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = usePersistentState<PrinterSort>('3d_printers_sort', 'name-asc');

  const [name, setName] = usePersistentState('3d_printer_draft_name', '');
  const [powerW, setPowerW] = usePersistentState('3d_printer_draft_power', '300');
  const [price, setPrice] = usePersistentState('3d_printer_draft_price', '');
  const [lifespanHours, setLifespanHours] = usePersistentState('3d_printer_draft_lifespan', '5000');
  const [color, setColor] = usePersistentState('3d_printer_draft_color', '#0CB4E0');
  const [errors, setErrors] = useState<{ name?: string; powerW?: string; price?: string; lifespanHours?: string }>({});

  const currencySymbol = settings?.currency ?? '₽';
  const electricityRate = settings?.electricity_rate ?? 0;
  const metrics = useMemo(
    () => calculatePrinterMetrics(printers, electricityRate),
    [printers, electricityRate],
  );
  const insights = useMemo(
    () => calculatePrinterInsights(printers, electricityRate),
    [printers, electricityRate],
  );
  const visiblePrinters = useMemo(
    () => filterAndSortPrinters(printers, query, sort, electricityRate),
    [printers, query, sort, electricityRate],
  );
  const previewPrinter: Printer = {
    id: 'preview',
    name: name || 'Новый принтер',
    power_w: Number(powerW || 0),
    price: Number(price || 0),
    lifespan_hours: Number(lifespanHours || 0),
    color,
  };
  const previewHourlyCost = getPrinterHourlyCost(previewPrinter, electricityRate);

  const openAdd = () => {
    setEditingPrinter(null);
    setName('');
    setPowerW('300');
    setPrice('');
    setLifespanHours('5000');
    setColor('#0CB4E0');
    setErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (printer: Printer) => {
    setEditingPrinter(printer);
    setName(printer.name);
    setPowerW(String(printer.power_w));
    setPrice(String(printer.price));
    setLifespanHours(String(printer.lifespan_hours));
    setColor(printer.color || '#0CB4E0');
    setErrors({});
    setIsFormOpen(true);
  };

  const validate = () => {
    const nextErrors: typeof errors = {};
    const parsedPrice = parseRequiredNonNegative(price);
    if (!name.trim()) nextErrors.name = 'Укажите название принтера';
    if (!Number.isFinite(Number(powerW)) || Number(powerW) <= 0) nextErrors.powerW = 'Мощность должна быть больше 0';
    if (parsedPrice === null) nextErrors.price = 'Укажите стоимость от 0 и выше';
    if (!Number.isFinite(Number(lifespanHours)) || Number(lifespanHours) <= 0) nextErrors.lifespanHours = 'Ресурс должен быть больше 0';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        power_w: Number(powerW),
        price: parseRequiredNonNegative(price) ?? 0,
        lifespan_hours: Number(lifespanHours),
        color,
      };
      if (editingPrinter) await updatePrinter({ ...payload, id: editingPrinter.id });
      else await addPrinter(payload);
      setIsFormOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deletePrinter(deleteTarget.id);
    setDeleteTarget(null);
  };

  const printerColumns: InventoryRegistryColumn<Printer, PrinterSort>[] = [
    {
      id: 'name',
      header: 'Оборудование',
      minWidth: '270px',
      sort: { asc: 'name-asc', desc: 'name-desc' },
      render: (printer) => {
        const isDefault = settings?.default_printer_id === printer.id;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-neutral-950" style={{ color: printer.color || '#D4D4D4' }}>
              <PrinterMachineIcon className="h-7 w-7" title={`3D-принтер ${printer.name}`} />
            </span>
            <div className="min-w-0">
              <span className="block truncate font-sans text-sm font-semibold text-white group-hover:text-cyan-300">{printer.name}</span>
              {isDefault ? <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[9px] font-bold text-cyan-400"><Settings2 className="h-2.5 w-2.5" /> DEFAULT UNIT</span> : <span className="mt-0.5 block font-mono text-[9px] text-neutral-600">AVAILABLE UNIT</span>}
            </div>
          </div>
        );
      },
    },
    {
      id: 'power',
      header: 'Мощность',
      sort: { asc: 'power-asc', desc: 'power-desc' },
      render: (printer) => <span className="tabular-nums text-neutral-300">{printer.power_w.toLocaleString('ru-RU')} Вт</span>,
    },
    {
      id: 'price',
      header: 'Цена покупки',
      align: 'right',
      sort: { asc: 'price-asc', desc: 'price-desc' },
      render: (printer) => <span className="tabular-nums text-neutral-300">{formatCurrency(printer.price, currencySymbol)}</span>,
    },
    {
      id: 'lifespan',
      header: 'Ресурс',
      align: 'right',
      sort: { asc: 'lifespan-asc', desc: 'lifespan-desc' },
      render: (printer) => <span className="tabular-nums text-neutral-300">{printer.lifespan_hours.toLocaleString('ru-RU')} ч</span>,
    },
    {
      id: 'hourly-cost',
      header: 'Себестоимость часа',
      align: 'right',
      sort: { asc: 'hourly-cost-asc', desc: 'hourly-cost-desc' },
      render: (printer) => <span className="font-bold tabular-nums text-cyan-400">{getPrinterHourlyCost(printer, electricityRate).toFixed(2)} {currencySymbol}/ч</span>,
    },
    {
      id: 'depreciation',
      header: 'Амортизация',
      align: 'right',
      expandedOnly: true,
      render: (printer) => <span className="tabular-nums text-neutral-400">{(printer.lifespan_hours > 0 ? printer.price / printer.lifespan_hours : 0).toFixed(2)} {currencySymbol}/ч</span>,
    },
    {
      id: 'energy',
      header: 'Электроэнергия',
      align: 'right',
      expandedOnly: true,
      render: (printer) => <span className="tabular-nums text-neutral-400">{(printer.power_w / 1000 * electricityRate).toFixed(2)} {currencySymbol}/ч</span>,
    },
    {
      id: 'created',
      header: 'Добавлено',
      expandedOnly: true,
      render: (printer) => <span className="tabular-nums text-neutral-400">{formatInventoryRegistryDate(printer.created_at)}</span>,
    },
    {
      id: 'identifier',
      header: 'ID принтера',
      expandedOnly: true,
      render: (printer) => <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-400">{printer.id.slice(0, 8).toUpperCase()}</span>,
    },
    {
      id: 'actions',
      header: 'Действия',
      align: 'right',
      minWidth: '104px',
      render: (printer) => (
        <div className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
          <InventoryRegistryAction icon={Edit3} label={`Редактировать ${printer.name}`} onClick={() => openEdit(printer)} />
          <InventoryRegistryAction icon={Trash2} label={`Удалить ${printer.name}`} onClick={() => setDeleteTarget(printer)} danger />
        </div>
      ),
    },
  ];

  const renderMobilePrinter = (printer: Printer) => {
    const isDefault = settings?.default_printer_id === printer.id;
    return (
      <article
        tabIndex={0}
        role="button"
        onClick={() => openEdit(printer)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openEdit(printer);
          }
        }}
        className="rounded-xl border border-white/10 bg-white/[0.03] p-3 focus:border-cyan-400/60 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-neutral-950" style={{ color: printer.color || '#D4D4D4' }}>
              <PrinterMachineIcon className="h-8 w-8" title={`3D-принтер ${printer.name}`} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white">{printer.name}</h3>
              <p className="mt-1 font-mono text-[10px] text-neutral-500">{printer.power_w.toLocaleString('ru-RU')} Вт · {printer.lifespan_hours.toLocaleString('ru-RU')} ч</p>
            </div>
          </div>
          {isDefault ? <span className="shrink-0 rounded-md border border-cyan-800/40 bg-cyan-950/60 px-2 py-1 font-mono text-[9px] font-bold text-cyan-400">DEFAULT</span> : null}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/5 pt-2">
          <div>
            <div className="font-mono text-base font-bold text-white">{formatCurrency(printer.price, currencySymbol)}</div>
            <span className="mt-1 inline-flex rounded border border-cyan-800/40 bg-cyan-950/50 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400">{getPrinterHourlyCost(printer, electricityRate).toFixed(2)} {currencySymbol}/ч</span>
          </div>
          <div className="flex gap-1.5" onClick={(event) => event.stopPropagation()}>
            <InventoryRegistryAction icon={Edit3} label={`Редактировать ${printer.name}`} onClick={() => openEdit(printer)} />
            <InventoryRegistryAction icon={Trash2} label={`Удалить ${printer.name}`} onClick={() => setDeleteTarget(printer)} danger />
          </div>
        </div>
      </article>
    );
  };

  return (
    <InventoryCockpitShell
      section="PRINTER_FLEET"
      sectionLabel="Парк 3D-принтеров"
      icon={<PrinterMachineIcon className="h-full w-full" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      isOnline={isOnline}
      recordCount={printers.length}
      filteredCount={visiblePrinters.length}
      actions={(
        <CockpitButton onClick={openAdd} icon={Plus} isActive title="Добавить новый принтер">
          Добавить принтер
        </CockpitButton>
      )}
    >
      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-5">
        <div className={`grid grid-cols-2 gap-2 ${isExpanded ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          <InventoryKpiCard label="Принтеров в парке" value={metrics.count} detail={settings?.default_printer_id ? 'назначен принтер по умолчанию' : 'принтер по умолчанию не задан'} icon={Activity} accent="cyan" />
          <InventoryKpiCard label="Стоимость парка" value={formatCurrency(metrics.totalValue, currencySymbol)} detail="по цене покупки" icon={Banknote} accent="amber" />
          <InventoryKpiCard label="Суммарная мощность" value={`${metrics.totalPowerW.toLocaleString('ru-RU')} Вт`} detail={`${(metrics.totalPowerW / 1000).toFixed(2)} кВт`} icon={Bolt} />
          <InventoryKpiCard label="Средняя ставка" value={`${metrics.averageHourlyCost.toFixed(2)} ${currencySymbol}/ч`} detail={`электричество ${electricityRate.toFixed(2)} ${currencySymbol}/кВт⋅ч`} icon={Gauge} />
          {isExpanded ? <div className="col-span-2 lg:col-span-1">
            <InventoryKpiCard label="Лучший тариф" value={metrics.lowestHourlyCostName} detail={`${metrics.totalResourceHours.toLocaleString('ru-RU')} ч общего ресурса`} icon={TrendingDown} accent="emerald" />
          </div> : null}
        </div>

        {isExpanded ? (
          <PrinterExpandedAnalytics insights={insights} currencySymbol={currencySymbol} electricityRate={electricityRate} />
        ) : null}

        <InventoryRegistryToolbar>
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <Input aria-label="Поиск принтера" placeholder="Поиск по названию..." value={query} onChange={(event) => setQuery(event.target.value)} className="pl-8" />
          </div>
          <div className="flex items-center gap-2">
            <CockpitDropdown
              value={sort}
              onChange={(value) => setSort(value as PrinterSort)}
              options={SORT_OPTIONS}
              variant="ghost"
              align="right"
              icon={Gauge}
              hideStatusDot
              dropdownWidth={220}
            />
          </div>
        </InventoryRegistryToolbar>

        <InventoryRegistryTable
          ariaLabel="Реестр 3D-принтеров"
          data={visiblePrinters}
          columns={printerColumns}
          keyExtractor={(printer) => printer.id}
          renderMobileCard={renderMobilePrinter}
          emptyState={<EmptyState hasRecords={printers.length > 0} onAdd={openAdd} onReset={() => setQuery('')} />}
          isExpanded={isExpanded}
          currentSort={sort}
          onSort={setSort}
          onRowClick={openEdit}
          minWidth={isExpanded ? '1560px' : '1080px'}
          visibleCount={visiblePrinters.length}
          totalCount={visiblePrinters.length}
          registryLabel="PRINTER FLEET REGISTRY"
        />
      </div>

      <CockpitModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingPrinter ? 'Редактирование принтера' : 'Новый 3D-принтер'}
        subtitle="Параметры оборудования"
        variant="cyan"
        maxWidth="2xl"
        badge={<span className="rounded border border-cyan-800/40 bg-cyan-950/60 px-2 py-0.5 text-[9px] font-bold text-cyan-400">MACHINE</span>}
        footer={(
          <div className="flex w-full items-center justify-between gap-3">
            <span>HOURLY COST: {previewHourlyCost.toFixed(2)} {currencySymbol}/ч</span>
            <div className="flex gap-2">
              <CockpitButton onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Закрыть</CockpitButton>
              <CockpitButton type="submit" form="printer-form" isActive disabled={isSubmitting}>
                {isSubmitting ? 'Сохранение...' : editingPrinter ? 'Сохранить' : 'Добавить'}
              </CockpitButton>
            </div>
          </div>
        )}
      >
        <form id="printer-form" onSubmit={submit} className="grid gap-5 md:grid-cols-[190px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center" style={{ color }}>
            <PrinterMachineIcon className="h-28 w-28" title="Предпросмотр 3D-принтера" />
            <span className="mt-3 rounded border border-white/10 bg-neutral-950/80 px-2 py-1 font-mono text-[10px] text-neutral-300">{color.toUpperCase()}</span>
          </div>
          <div className="space-y-4">
            <Input label="Название 3D-принтера" placeholder="Bambu Lab A1" value={name} onChange={(event) => setName(event.target.value)} error={errors.name} autoFocus requiredStar />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <NumberCounter label="Мощность, Вт" value={Number.parseInt(powerW, 10) || 0} onChange={(value) => setPowerW(String(value))} min={1} max={10000} />
                {errors.powerW && <p className="mt-1 text-[11px] text-rose-400">{errors.powerW}</p>}
              </div>
              <Input label={`Цена покупки, ${currencySymbol}`} type="number" min="0" step="any" placeholder="0.00" value={price} onChange={(event) => setPrice(event.target.value)} error={errors.price} requiredStar />
            </div>
            <div>
              <NumberCounter label="Расчётный ресурс, ч" value={Number.parseInt(lifespanHours, 10) || 0} onChange={(value) => setLifespanHours(String(value))} min={1} max={1000000} step={100} />
              {errors.lifespanHours && <p className="mt-1 text-[11px] text-rose-400">{errors.lifespanHours}</p>}
            </div>
            <ColorPicker label="Цвет оборудования" value={color} onChange={setColor} />
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-neutral-950/60 p-3 font-mono">
              <MachineMetric label="Энергия" value={`${(Number(powerW || 0) / 1000 * electricityRate).toFixed(2)} ${currencySymbol}/ч`} />
              <MachineMetric label="Полная ставка" value={`${previewHourlyCost.toFixed(2)} ${currencySymbol}/ч`} bordered accent />
            </div>
          </div>
        </form>
      </CockpitModal>

      <CockpitModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удаление принтера"
        subtitle={deleteTarget ? deleteTarget.name : 'Подтверждение действия'}
        variant="warning"
        maxWidth="md"
        footer={(
          <div className="flex w-full justify-end gap-2">
            <CockpitButton onClick={() => setDeleteTarget(null)}>Закрыть</CockpitButton>
            <CockpitButton onClick={confirmDelete} icon={Trash2} className="border-rose-500/30 bg-rose-950/50 text-rose-300 hover:bg-rose-900/60">Удалить принтер</CockpitButton>
          </div>
        )}
      >
        {deleteTarget && (
          <div className="flex items-center gap-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-neutral-950" style={{ color: deleteTarget.color || '#D4D4D4' }}>
              <PrinterMachineIcon className="h-11 w-11" title={`3D-принтер ${deleteTarget.name}`} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-sans text-sm font-bold text-white">{deleteTarget.name}</p>
              <p className="mt-1 font-mono text-[11px] text-neutral-400">{deleteTarget.power_w.toLocaleString('ru-RU')} Вт · {formatCurrency(deleteTarget.price, currencySymbol)}</p>
            </div>
          </div>
        )}
      </CockpitModal>
    </InventoryCockpitShell>
  );
}

function PrinterExpandedAnalytics({
  insights,
  currencySymbol,
  electricityRate,
}: {
  insights: ReturnType<typeof calculatePrinterInsights>;
  currencySymbol: string;
  electricityRate: number;
}) {
  const maxHourlyCost = Math.max(0, ...insights.hourlyCostLeaders.map((item) => item.hourlyCost));
  const depreciationShare = 100 - insights.energySharePercent;

  return (
    <section aria-label="Расширенная аналитика принтеров" className="grid gap-3 xl:grid-cols-[1.25fr_.75fr]">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">FULLSCREEN · FLEET LOAD MAP</p>
            <h2 className="mt-1 font-sans text-base font-bold text-white">Сравнение реальной ставки оборудования</h2>
            <p className="mt-1 font-sans text-xs text-neutral-400">Стоимость часа включает амортизацию принтера и электроэнергию по текущему тарифу.</p>
          </div>
          <BarChart3 className="h-5 w-5 shrink-0 text-cyan-400" />
        </div>
        {insights.hourlyCostLeaders.length > 0 ? (
          <div className="mt-4 space-y-3">
            {insights.hourlyCostLeaders.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3">
                <span className="font-mono text-[10px] text-neutral-600">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="truncate font-sans text-xs font-semibold text-neutral-200">{item.name}</span>
                    <span className="font-mono text-[10px] text-neutral-500">{maxHourlyCost > 0 ? (item.hourlyCost / maxHourlyCost * 100).toFixed(0) : 0}% MAX</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${maxHourlyCost > 0 ? Math.max(4, item.hourlyCost / maxHourlyCost * 100) : 0}%`, backgroundColor: item.color || '#22d3ee' }} />
                  </div>
                </div>
                <span className="font-mono text-[11px] font-bold text-white tabular-nums">{item.hourlyCost.toFixed(2)} {currencySymbol}/ч</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 font-sans text-xs text-neutral-500">Добавьте принтеры, чтобы сравнить стоимость их работы.</p>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500">FLEET COST STRUCTURE</p>
            <h2 className="mt-1 font-sans text-base font-bold text-white">Из чего складывается час</h2>
          </div>
          <Cpu className="h-5 w-5 shrink-0 text-neutral-400" />
        </div>
        <div className="mt-4 overflow-hidden rounded-full bg-white/5">
          <div className="flex h-2 w-full">
            <div className="bg-cyan-400/75" style={{ width: `${depreciationShare}%` }} />
            <div className="bg-amber-400/75" style={{ width: `${insights.energySharePercent}%` }} />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <FleetCostFact label="Амортизация" value={`${insights.totalDepreciationPerHour.toFixed(2)} ${currencySymbol}/ч`} share={depreciationShare} tone="cyan" />
          <FleetCostFact label="Электроэнергия" value={`${insights.totalEnergyPerHour.toFixed(2)} ${currencySymbol}/ч`} share={insights.energySharePercent} tone="amber" />
        </div>
        <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-neutral-950/55 p-3 font-mono text-[10px]">
          <div className="flex items-center justify-between gap-3"><span className="text-neutral-500">ТАРИФ ЭНЕРГИИ</span><span className="font-bold text-white tabular-nums">{electricityRate.toFixed(2)} {currencySymbol}/кВт⋅ч</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-neutral-500">ПИК МОЩНОСТИ</span><span className="truncate font-bold text-white">{insights.highestPowerName}</span></div>
        </div>
      </div>
    </section>
  );
}

function FleetCostFact({ label, value, share, tone }: { label: string; value: string; share: number; tone: 'cyan' | 'amber' }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-neutral-950/55 p-3">
      <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
        <span className={`h-1.5 w-1.5 rounded-full ${tone === 'cyan' ? 'bg-cyan-400' : 'bg-amber-400'}`} />
        {label}
      </div>
      <p className="mt-1.5 truncate font-mono text-xs font-bold text-white tabular-nums">{value}</p>
      <p className="mt-1 font-mono text-[9px] text-neutral-500 tabular-nums">{share.toFixed(1)}% общей ставки</p>
    </div>
  );
}

function MachineMetric({ label, value, bordered = false, accent = false }: { label: string; value: string; bordered?: boolean; accent?: boolean }) {
  return (
    <div className={`min-w-0 px-3 py-2.5 ${bordered ? 'border-x border-white/10' : ''}`}>
      <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-1 truncate font-mono text-[11px] font-semibold tabular-nums sm:text-xs ${accent ? 'text-cyan-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function EmptyState({ hasRecords, onAdd, onReset }: { hasRecords: boolean; onAdd: () => void; onReset: () => void }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-950/30 text-cyan-400">
        {hasRecords ? <Search className="h-7 w-7" /> : <PrinterMachineIcon className="h-11 w-11" />}
      </span>
      <h3 className="mt-4 font-mono text-sm font-bold text-white">{hasRecords ? 'Принтеры не найдены' : 'Парк оборудования пуст'}</h3>
      <p className="mt-2 max-w-md font-sans text-xs leading-relaxed text-neutral-400">
        {hasRecords ? 'Измените поисковый запрос, чтобы вернуть оборудование в выдачу.' : 'Добавьте первый принтер — консоль рассчитает его амортизацию и стоимость электроэнергии на час печати.'}
      </p>
      <CockpitButton onClick={hasRecords ? onReset : onAdd} icon={hasRecords ? Sparkles : Plus} isActive className="mt-4">
        {hasRecords ? 'Сбросить поиск' : 'Добавить принтер'}
      </CockpitButton>
    </div>
  );
}
