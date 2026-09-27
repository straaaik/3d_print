'use client';

import React, { useMemo, useState } from 'react';
import {
  Boxes,
  BarChart3,
  Coins,
  Edit3,
  LayoutGrid,
  Palette,
  Plus,
  Search,
  Sparkles,
  Table,
  Trash2,
  TrendingDown,
  Weight,
  ScanLine,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useData } from '../../entities/model/DataProvider';
import type { Filament } from '../../shared/types';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../shared/ui/CockpitDropdown';
import { FilamentFormFields } from '../InventoryCockpit/InventoryFormFields';
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
import { FilamentSpoolIcon } from '../InventoryCockpit/InventoryIcons';
import {
  formatInventoryRegistryDate,
  InventoryRegistryAction,
  InventoryRegistryToolbar,
  InventoryRegistryTable,
  type InventoryRegistryColumn,
} from '../InventoryCockpit/InventoryRegistryTable';
import {
  calculateFilamentInsights,
  calculateFilamentMetrics,
  filterAndSortFilaments,
  getFilamentUnitCost,
  parseRequiredNonNegative,
  type FilamentSort,
} from '../InventoryCockpit/model';

type InventoryViewMode = 'table' | 'cards';

const VIEW_MODE_OPTIONS: ReadonlyArray<SegmentedFilterOption<InventoryViewMode>> = [
  { value: 'table', label: 'Таблица', icon: Table, ariaLabel: 'Режим таблицы' },
  { value: 'cards', label: 'Карточки', icon: LayoutGrid, ariaLabel: 'Режим карточек' },
];

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'По названию' },
  { value: 'name-desc', label: 'Название Я–А' },
  { value: 'unit-cost-asc', label: 'Сначала выгодные' },
  { value: 'unit-cost-desc', label: 'Цена за грамм ↓' },
  { value: 'price-asc', label: 'Цена катушки ↑' },
  { value: 'price-desc', label: 'Цена катушки ↓' },
  { value: 'weight-asc', label: 'Вес катушки ↑' },
  { value: 'weight-desc', label: 'Вес катушки ↓' },
];

export function FilamentList() {
  const { filaments, settings, isOnline, addFilament, updateFilament, deleteFilament } = useData();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Filament | null>(null);
  const [query, setQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(25);
  const [sort, setSort] = usePersistentState<FilamentSort>('3d_filaments_sort', 'name-asc');
  const [viewMode, setViewMode] = usePersistentState<InventoryViewMode>('3d_filaments_view_mode', 'cards');

  const [name, setName] = usePersistentState('3d_filament_draft_name', '');
  const [weightG, setWeightG] = usePersistentState('3d_filament_draft_weight', '1000');
  const [price, setPrice] = usePersistentState('3d_filament_draft_price', '');
  const [color, setColor] = usePersistentState('3d_filament_draft_color', '#0CB4E0');
  const [errors, setErrors] = useState<{ name?: string; weightG?: string; price?: string }>({});

  const currencySymbol = settings?.currency ?? '₽';
  const metrics = useMemo(() => calculateFilamentMetrics(filaments), [filaments]);
  const insights = useMemo(() => calculateFilamentInsights(filaments), [filaments]);
  const filteredFilaments = useMemo(
    () => filterAndSortFilaments(filaments, query, sort),
    [filaments, query, sort],
  );
  const visibleFilaments = filteredFilaments.slice(0, visibleLimit);
  const previewUnitCost = Number(weightG) > 0 ? Number(price || 0) / Number(weightG) : 0;

  const openAdd = () => {
    setEditingFilament(null);
    setName('');
    setWeightG('1000');
    setPrice('');
    setColor('#0CB4E0');
    setErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (filament: Filament) => {
    setEditingFilament(filament);
    setName(filament.name);
    setWeightG(String(filament.weight_g));
    setPrice(String(filament.price));
    setColor(filament.color || '#0CB4E0');
    setErrors({});
    setIsFormOpen(true);
  };

  const validate = () => {
    const nextErrors: typeof errors = {};
    const parsedPrice = parseRequiredNonNegative(price);
    if (!name.trim()) nextErrors.name = 'Укажите название филамента';
    if (!Number.isFinite(Number(weightG)) || Number(weightG) <= 0) nextErrors.weightG = 'Вес должен быть больше 0';
    if (parsedPrice === null) nextErrors.price = 'Укажите цену от 0 и выше';
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
        weight_g: Number(weightG),
        price: parseRequiredNonNegative(price) ?? 0,
        color,
      };
      if (editingFilament) await updateFilament({ ...payload, id: editingFilament.id });
      else await addFilament(payload);
      setIsFormOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteFilament(deleteTarget.id);
    setDeleteTarget(null);
  };

  const filamentColumns: InventoryRegistryColumn<Filament, FilamentSort>[] = [
    {
      id: 'name',
      header: 'Материал',
      minWidth: '260px',
      sort: { asc: 'name-asc', desc: 'name-desc' },
      render: (filament) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-neutral-950" style={{ color: filament.color || '#D4D4D4' }}>
            <FilamentSpoolIcon className="h-7 w-7" title={`Катушка ${filament.name}`} />
          </span>
          <div className="min-w-0">
            <span className="block truncate font-sans text-sm font-semibold text-white group-hover:text-neutral-300">{filament.name}</span>
            <span className="mt-0.5 block font-mono text-[9px] text-neutral-600">{filament.color?.toUpperCase() || '#D4D4D4'}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'weight',
      header: 'Вес',
      sort: { asc: 'weight-asc', desc: 'weight-desc' },
      render: (filament) => <span className="tabular-nums text-neutral-300">{filament.weight_g.toLocaleString('ru-RU')} г</span>,
    },
    {
      id: 'price',
      header: 'Цена катушки',
      align: 'right',
      sort: { asc: 'price-asc', desc: 'price-desc' },
      render: (filament) => <span className="tabular-nums text-neutral-300">{formatCurrency(filament.price, currencySymbol)}</span>,
    },
    {
      id: 'unit-cost',
      header: 'За грамм',
      align: 'right',
      sort: { asc: 'unit-cost-asc', desc: 'unit-cost-desc' },
      render: (filament) => <span className="font-bold tabular-nums text-neutral-300">{getFilamentUnitCost(filament).toFixed(2)} {currencySymbol}/г</span>,
    },
    {
      id: 'created',
      header: 'Добавлено',
      expandedOnly: true,
      render: (filament) => <span className="tabular-nums text-neutral-400">{formatInventoryRegistryDate(filament.created_at)}</span>,
    },
    {
      id: 'identifier',
      header: 'ID катушки',
      expandedOnly: true,
      render: (filament) => <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-400">{filament.id.slice(0, 8).toUpperCase()}</span>,
    },
    {
      id: 'actions',
      header: 'Действия',
      align: 'right',
      minWidth: '104px',
      render: (filament) => (
        <div className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
          <InventoryRegistryAction icon={Edit3} label={`Редактировать ${filament.name}`} onClick={() => openEdit(filament)} />
          <InventoryRegistryAction icon={Trash2} label={`Удалить ${filament.name}`} onClick={() => setDeleteTarget(filament)} danger />
        </div>
      ),
    },
  ];

  const renderFilamentCard = (
    filament: Filament,
    _index?: number,
    isHovered?: boolean,
    onHover?: () => void,
  ) => {
    const unitCost = getFilamentUnitCost(filament);
    const filamentColor = filament.color || '#D4D4D4';

    return (
      <motion.article
        key={filament.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        tabIndex={0}
        role="button"
        aria-label={`Филамент ${filament.name}`}
        onClick={() => openEdit(filament)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openEdit(filament);
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
            layoutId="filament-card-hover-bg"
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
          {/* Фоновая изометрическая 3D-катушка филамента справа - поднимается и немного увеличивается */}
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
            style={{ color: filamentColor }}
            aria-hidden="true"
          >
            <FilamentSpoolIcon className="h-full w-full" />
          </motion.div>

          {/* Мягкий матовый оттенок цвета пластика в фоне карточки */}
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
            style={{ backgroundColor: filamentColor }}
            aria-hidden="true"
          />
        </div>

        {/* Передний план: Заголовок, цвет, ID и действия */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-sans text-sm font-bold text-white group-hover:text-neutral-300 transition-colors">
                {filament.name}
              </h3>
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-neutral-400">
              <span>{filamentColor.toUpperCase()}</span>
              <span className="text-neutral-600">·</span>
              <span className="rounded bg-white/5 px-1.5 py-0.5 border border-white/5 text-[9px] text-neutral-400">
                ID: {filament.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>

          <div className="relative z-20 flex shrink-0 items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
            <InventoryRegistryAction
              icon={Edit3}
              label={`Редактировать ${filament.name}`}
              onClick={() => openEdit(filament)}
            />
            <InventoryRegistryAction
              icon={Trash2}
              label={`Удалить ${filament.name}`}
              onClick={() => setDeleteTarget(filament)}
              danger
            />
          </div>
        </div>

        {/* Передний план: Параметры и стоимость */}
        <div className="relative z-10 mt-4 border-t border-white/10 pt-3">
          <div className="grid grid-cols-3 gap-2 items-end">
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-neutral-500">Масса</span>
              <span className="font-mono text-xs font-semibold tabular-nums text-neutral-200">
                {filament.weight_g.toLocaleString('ru-RU')} г
              </span>
            </div>
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-neutral-500">Катушка</span>
              <span className="font-mono text-xs font-bold tabular-nums text-white">
                {formatCurrency(filament.price, currencySymbol)}
              </span>
            </div>
            <div className="text-right">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-neutral-500">За грамм</span>
              <span className="inline-flex rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-neutral-300">
                {unitCost.toFixed(2)} {currencySymbol}/г
              </span>
            </div>
          </div>
        </div>
      </motion.article>
    );
  };

  return (
    <InventoryCockpitShell
      section="FILAMENT_STORAGE"
      sectionLabel="Каталог филаментов"
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      isOnline={isOnline}
      recordCount={filaments.length}
      filteredCount={filteredFilaments.length}
      actions={(
        <CockpitButton onClick={openAdd} icon={Plus} title="Добавить новую катушку">
          Добавить филамент
        </CockpitButton>
      )}
    >
      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-5">
        <div className={`grid grid-cols-2 gap-2 ${isExpanded ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          <InventoryKpiCard label="Катушек в каталоге" value={metrics.count} detail={`${metrics.uniqueColors} уник. цветов`} icon={Boxes} accent="cyan" />
          <InventoryKpiCard label="Суммарный вес" value={`${(metrics.totalWeightG / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} кг`} detail={`${metrics.totalWeightG.toLocaleString('ru-RU')} грамм`} icon={Weight} />
          <InventoryKpiCard label="Стоимость запасов" value={formatCurrency(metrics.totalValue, currencySymbol)} detail="по цене закупки" icon={Coins} accent="amber" />
          <InventoryKpiCard label="Средняя цена" value={`${metrics.averagePricePerGram.toFixed(2)} ${currencySymbol}/г`} detail="взвешено по массе" icon={Palette} />
          {isExpanded ? <div className="col-span-2 lg:col-span-1">
            <InventoryKpiCard label="Самый выгодный" value={metrics.bestValueName} detail={`${metrics.bestValuePerGram.toFixed(2)} ${currencySymbol}/г`} icon={TrendingDown} accent="emerald" />
          </div> : null}
        </div>

        {isExpanded ? (
          <FilamentExpandedAnalytics
            insights={insights}
            averageUnitCost={metrics.averagePricePerGram}
            currencySymbol={currencySymbol}
          />
        ) : null}

        <InventoryRegistryToolbar>
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <Input
              aria-label="Поиск филамента"
              placeholder="Поиск по названию..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleLimit(25);
              }}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedFilter
              value={viewMode}
              onChange={(value) => setViewMode(value as InventoryViewMode)}
              options={VIEW_MODE_OPTIONS}
              ariaLabel="Режим отображения филаментов"
              layoutId="filaments-view-mode-indicator"
            />
            <CockpitDropdown
              value={sort}
              onChange={(value) => {
                setSort(value as FilamentSort);
                setVisibleLimit(25);
              }}
              options={SORT_OPTIONS}
              variant="ghost"
              align="right"
              icon={TrendingDown}
              hideStatusDot
              dropdownWidth={220}
            />
          </div>
        </InventoryRegistryToolbar>

        <InventoryRegistryTable
          ariaLabel="Реестр филаментов"
          data={visibleFilaments}
          columns={filamentColumns}
          keyExtractor={(filament) => filament.id}
          viewMode={viewMode}
          renderCard={renderFilamentCard}
          renderMobileCard={renderFilamentCard}
          emptyState={<EmptyState hasRecords={filaments.length > 0} onAdd={openAdd} onReset={() => setQuery('')} />}
          isExpanded={isExpanded}
          currentSort={sort}
          onSort={(nextSort) => {
            setSort(nextSort);
            setVisibleLimit(25);
          }}
          onRowClick={openEdit}
          minWidth={isExpanded ? '1220px' : '920px'}
          visibleCount={visibleFilaments.length}
          totalCount={filteredFilaments.length}
          onLoadMore={() => setVisibleLimit((limit) => limit + 25)}
          onShowAll={() => setVisibleLimit(filteredFilaments.length)}
          registryLabel="FILAMENT REGISTRY"
        />
      </div>

      <CockpitModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingFilament ? 'Редактирование катушки' : 'Новая катушка'}
        subtitle="Параметры материала"
        maxWidth="3xl"
        footer={(
          <div className="flex w-full items-center justify-between gap-3">
            <span>Стоимость: {previewUnitCost.toFixed(2)} {currencySymbol}/г</span>
            <CockpitButton type="submit" form="filament-form" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : editingFilament ? 'Сохранить' : 'Добавить'}
            </CockpitButton>
          </div>
        )}
      >
        <form id="filament-form" onSubmit={submit}>
          <FilamentFormFields
            values={{ name, price, weightG, color }}
            onChange={(field, value) => ({ name: setName, price: setPrice, weightG: setWeightG, color: setColor })[field](value)}
            errors={errors}
            currencySymbol={currencySymbol}
          />
        </form>
      </CockpitModal>

      <CockpitDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Удаление катушки"
        itemName={deleteTarget?.name}
        itemDetails={
          deleteTarget
            ? `${deleteTarget.weight_g.toLocaleString('ru-RU')} г · ${formatCurrency(deleteTarget.price, currencySymbol)}`
            : undefined
        }
        description="Вы действительно хотите списать эту катушку филамента со склада? Действие необратимо."
      />
    </InventoryCockpitShell>
  );
}

function FilamentExpandedAnalytics({
  insights,
  averageUnitCost,
  currencySymbol,
}: {
  insights: ReturnType<typeof calculateFilamentInsights>;
  averageUnitCost: number;
  currencySymbol: string;
}) {
  return (
    <section aria-label="Расширенная аналитика филаментов" className="grid gap-3 xl:grid-cols-[1.25fr_.75fr]">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">FULLSCREEN · INVENTORY MAP</p>
            <h2 className="mt-1 font-sans text-base font-bold text-white">Где сосредоточена стоимость склада</h2>
            <p className="mt-1 font-sans text-xs text-neutral-400">Пять самых дорогих катушек и их доля в общей закупочной стоимости.</p>
          </div>
          <BarChart3 className="h-5 w-5 shrink-0 text-cyan-400" />
        </div>
        {insights.valueLeaders.length > 0 ? (
          <div className="mt-4 space-y-3">
            {insights.valueLeaders.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3">
                <span className="font-mono text-[10px] text-neutral-600">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="truncate font-sans text-xs font-semibold text-neutral-200">{item.name}</span>
                    <span className="font-mono text-[10px] text-neutral-500 tabular-nums">{item.sharePercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(4, item.sharePercent)}%`, backgroundColor: item.color || '#22d3ee' }} />
                  </div>
                </div>
                <span className="font-mono text-[11px] font-bold text-white tabular-nums">{formatCurrency(item.value, currencySymbol)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 font-sans text-xs text-neutral-500">Данные появятся после добавления первой катушки.</p>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500">COST CORRIDOR</p>
            <h2 className="mt-1 font-sans text-base font-bold text-white">Ориентиры склада</h2>
          </div>
          <ScanLine className="h-5 w-5 shrink-0 text-neutral-400" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ExpandedFact label="Минимум за грамм" value={`${insights.minUnitCost.toFixed(2)} ${currencySymbol}`} tone="good" />
          <ExpandedFact label="Среднее за грамм" value={`${averageUnitCost.toFixed(2)} ${currencySymbol}`} />
          <ExpandedFact label="Максимум за грамм" value={`${insights.maxUnitCost.toFixed(2)} ${currencySymbol}`} tone="warn" />
          <ExpandedFact label="Самая тяжёлая" value={insights.heaviestName} />
        </div>
        <div className="mt-3 rounded-lg border border-cyan-500/15 bg-cyan-500/[0.04] p-3">
          <p className="font-mono text-[9px] uppercase tracking-wider text-cyan-400">Крупнейший актив склада</p>
          <p className="mt-1 truncate font-sans text-xs font-semibold text-white">{insights.highestValueName}</p>
        </div>
      </div>
    </section>
  );
}

function ExpandedFact({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' }) {
  const toneClass = tone === 'good' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : 'text-white';
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-neutral-950/55 p-3">
      <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-1.5 truncate font-mono text-xs font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function EmptyState({ hasRecords, onAdd, onReset }: { hasRecords: boolean; onAdd: () => void; onReset: () => void }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-950/30 text-cyan-400">
        {hasRecords ? <Search className="h-7 w-7" /> : <FilamentSpoolIcon className="h-11 w-11" />}
      </span>
      <h3 className="mt-4 font-mono text-sm font-bold text-white">{hasRecords ? 'Филаменты не найдены' : 'Каталог филаментов пуст'}</h3>
      <p className="mt-2 max-w-md font-sans text-xs leading-relaxed text-neutral-400">
        {hasRecords ? 'Измените поисковый запрос, чтобы вернуть материалы в выдачу.' : 'Добавьте первую катушку — её цена и вес станут основой расчёта стоимости материала.'}
      </p>
      <CockpitButton onClick={hasRecords ? onReset : onAdd} icon={hasRecords ? Sparkles : Plus} className="mt-4">
        {hasRecords ? 'Сбросить поиск' : 'Добавить филамент'}
      </CockpitButton>
    </div>
  );
}
