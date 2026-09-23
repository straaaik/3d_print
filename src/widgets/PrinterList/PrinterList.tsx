'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Activity,
  Banknote,
  BarChart3,
  Bolt,
  Box,
  Cpu,
  Edit3,
  Gauge,
  LayoutGrid,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Table,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useData } from '../../entities/model/DataProvider';
import type { Printer } from '../../shared/types';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../shared/ui/CockpitDropdown';
import { PrinterFormFields } from '../InventoryCockpit/InventoryFormFields';
import { CockpitModal } from '../../shared/ui/CockpitModal';
import { Input } from '../../shared/ui/Input';
import { CockpitDeleteModal } from '../../shared/ui/CockpitDeleteModal';
import { SegmentedFilter, type SegmentedFilterOption } from '../../shared/ui/SegmentedFilter';
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
  getEffectivePrinterViewMode,
  getPrinterHourlyCost,
  getPrinterViewModeOptions,
  parseRequiredNonNegative,
  type InventoryViewMode,
  type PrinterSort,
} from '../InventoryCockpit/model';

const is3DRoomEnabled = true;

const VIEW_MODE_OPTIONS: ReadonlyArray<SegmentedFilterOption<InventoryViewMode>> =
  getPrinterViewModeOptions(Table, LayoutGrid, Box, is3DRoomEnabled);

const PrinterRoom3DSkeleton = () => (
  <div className="w-full h-[580px] sm:h-[640px] rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center animate-pulse text-xs text-neutral-500">
    Загрузка 3D-комнаты...
  </div>
);

const PrinterRoom3D = is3DRoomEnabled
  ? dynamic(
      () => import('../../features/printers-room').then((m) => m.PrinterRoom3D),
      {
        ssr: false,
        loading: PrinterRoom3DSkeleton,
      },
    )
  : null;

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
  const [viewMode, setViewMode] = usePersistentState<InventoryViewMode>('3d_printers_view_mode', 'cards');
  const effectiveViewMode = getEffectivePrinterViewMode(viewMode, is3DRoomEnabled);

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
              <span className="block truncate font-sans text-sm font-semibold text-white group-hover:text-neutral-300">{printer.name}</span>
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
      render: (printer) => <span className="font-bold tabular-nums text-neutral-300">{getPrinterHourlyCost(printer, electricityRate).toFixed(2)} {currencySymbol}/ч</span>,
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

  const renderPrinterCard = (
    printer: Printer,
    _index?: number,
    isHovered?: boolean,
    onHover?: () => void,
  ) => {
    const isDefault = settings?.default_printer_id === printer.id;
    const hourlyCost = getPrinterHourlyCost(printer, electricityRate);
    const printerColor = printer.color || '#0CB4E0';

    return (
      <motion.article
        key={printer.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        tabIndex={0}
        role="button"
        aria-label={`3D-принтер ${printer.name}`}
        onClick={() => openEdit(printer)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openEdit(printer);
          }
        }}
        onMouseEnter={onHover}
        onFocus={onHover}
        className={`group relative flex flex-col justify-between p-4 text-left border -ml-px -mt-px bg-white/[0.02] transition-colors focus-visible:border-cyan-400/60 focus-visible:outline-none cursor-pointer select-none min-h-[170px] ${
          isHovered ? 'z-20 border-transparent' : 'z-10 border-white/10'
        }`}
      >
        {/* Перемещающийся анимированный фон цвета обводки, скрывающий границу */}
        {isHovered && (
          <motion.div
            layoutId="printer-card-hover-bg"
            className="absolute -inset-px z-0 bg-white/10 pointer-events-none"
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 30,
              mass: 0.8,
            }}
          />
        )}

        {/* Область фоновых элементов (с обрезкой по краям карточки) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Фоновая изометрическая 3D-модель принтера справа - поднимается и немного увеличивается */}
          <motion.div
            animate={isHovered ? 'hover' : 'rest'}
            variants={{
              rest: {
                y: 0,
                scale: 1,
                opacity: 0.2,
                transition: { type: 'spring', stiffness: 300, damping: 24 },
              },
              hover: {
                y: -10,
                scale: 1.12,
                opacity: 0.35,
                transition: { type: 'spring', stiffness: 300, damping: 20 },
              },
            }}
            className="absolute -right-4 -bottom-4 h-44 w-44 sm:h-52 sm:w-52 select-none"
            style={{ color: printerColor }}
            aria-hidden="true"
          >
            <PrinterMachineIcon className="h-full w-full" />
          </motion.div>

          {/* Мягкий матовый оттенок цвета принтера в фоне карточки */}
          <motion.div
            animate={isHovered ? 'hover' : 'rest'}
            variants={{
              rest: {
                scale: 1,
                opacity: 0.15,
                transition: { type: 'spring', stiffness: 300, damping: 24 },
              },
              hover: {
                scale: 1.15,
                opacity: 0.28,
                transition: { type: 'spring', stiffness: 300, damping: 20 },
              },
            }}
            className="absolute -right-10 -bottom-10 h-44 w-44 sm:h-52 sm:w-52 rounded-full blur-3xl"
            style={{ backgroundColor: printerColor }}
            aria-hidden="true"
          />
        </div>

        {/* Передний план: Заголовок, статус, ID и действия */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-sans text-sm font-bold text-white group-hover:text-neutral-300 transition-colors">
                {printer.name}
              </h3>
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-neutral-400">
              {isDefault ? (
                <span className="inline-flex items-center gap-1 rounded border border-cyan-800/40 bg-cyan-950/60 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-400">
                  <Settings2 className="h-2.5 w-2.5" /> DEFAULT UNIT
                </span>
              ) : (
                <span className="rounded bg-white/5 px-1.5 py-0.5 border border-white/5 text-[9px] text-neutral-400">
                  ID: {printer.id.slice(0, 8).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="relative z-20 flex shrink-0 items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
            <InventoryRegistryAction
              icon={Edit3}
              label={`Редактировать ${printer.name}`}
              onClick={() => openEdit(printer)}
            />
            <InventoryRegistryAction
              icon={Trash2}
              label={`Удалить ${printer.name}`}
              onClick={() => setDeleteTarget(printer)}
              danger
            />
          </div>
        </div>

        {/* Передний план: Параметры и себестоимость */}
        <div className="relative z-10 mt-4 border-t border-white/10 pt-3">
          <div className="grid grid-cols-4 gap-2 items-end">
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-neutral-500">Мощность</span>
              <span className="font-mono text-xs font-semibold tabular-nums text-neutral-200">
                {printer.power_w.toLocaleString('ru-RU')} Вт
              </span>
            </div>
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-neutral-500">Ресурс</span>
              <span className="font-mono text-xs font-semibold tabular-nums text-neutral-200">
                {printer.lifespan_hours.toLocaleString('ru-RU')} ч
              </span>
            </div>
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-neutral-500">Стоимость</span>
              <span className="font-mono text-xs font-bold tabular-nums text-white">
                {formatCurrency(printer.price, currencySymbol)}
              </span>
            </div>
            <div className="text-right">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-neutral-500">В час</span>
              <span className="inline-flex rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-neutral-300">
                {hourlyCost.toFixed(2)} {currencySymbol}/ч
              </span>
            </div>
          </div>
        </div>
      </motion.article>
    );
  };

  return (
    <InventoryCockpitShell
      section="PRINTER_FLEET"
      sectionLabel="Парк 3D-принтеров"
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      isOnline={isOnline}
      recordCount={printers.length}
      filteredCount={visiblePrinters.length}
      actions={(
        <CockpitButton onClick={openAdd} icon={Plus} title="Добавить новый принтер">
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
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedFilter
              value={effectiveViewMode}
              onChange={(value) => setViewMode(value as InventoryViewMode)}
              options={VIEW_MODE_OPTIONS}
              ariaLabel="Режим отображения принтеров"
              layoutId="printers-view-mode-indicator"
            />
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

        {is3DRoomEnabled && effectiveViewMode === 'room3d' && PrinterRoom3D ? (
          <PrinterRoom3D
            printers={visiblePrinters}
            electricityRate={electricityRate}
            currency={currencySymbol}
            onEditPrinter={openEdit}
            onDeletePrinter={(printer) => setDeleteTarget(printer)}
            onAddPrinter={openAdd}
          />
        ) : (
          <InventoryRegistryTable
            ariaLabel="Реестр 3D-принтеров"
            data={visiblePrinters}
            columns={printerColumns}
            keyExtractor={(printer) => printer.id}
            viewMode={effectiveViewMode === 'room3d' ? 'cards' : effectiveViewMode}
            renderCard={renderPrinterCard}
            renderMobileCard={renderPrinterCard}
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
        )}
      </div>

      <CockpitModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingPrinter ? 'Редактирование принтера' : 'Новый 3D-принтер'}
        subtitle="Параметры оборудования"
        maxWidth="3xl"
        footer={(
          <div className="flex w-full items-center justify-between gap-3">
            <span>Час печати: {previewHourlyCost.toFixed(2)} {currencySymbol}/ч</span>
            <CockpitButton type="submit" form="printer-form" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : editingPrinter ? 'Сохранить' : 'Добавить'}
            </CockpitButton>
          </div>
        )}
      >
        <form id="printer-form" onSubmit={submit}>
          <PrinterFormFields
            values={{ name, price, powerW, lifespanHours, color }}
            onChange={(field, value) => ({ name: setName, price: setPrice, powerW: setPowerW, lifespanHours: setLifespanHours, color: setColor })[field](value)}
            errors={errors}
            currencySymbol={currencySymbol}
          />
        </form>
      </CockpitModal>

      <CockpitDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Удаление принтера"
        itemName={deleteTarget?.name}
        itemDetails={
          deleteTarget
            ? `${deleteTarget.power_w.toLocaleString('ru-RU')} Вт · ${formatCurrency(deleteTarget.price, currencySymbol)}`
            : undefined
        }
        description="Вы действительно хотите удалить этот 3D-принтер из производственного парка? Действие необратимо."
      />
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
      <CockpitButton onClick={hasRecords ? onReset : onAdd} icon={hasRecords ? Sparkles : Plus} className="mt-4">
        {hasRecords ? 'Сбросить поиск' : 'Добавить принтер'}
      </CockpitButton>
    </div>
  );
}
