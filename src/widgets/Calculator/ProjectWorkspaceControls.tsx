'use client';

import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Copy, Plus, Save, Trash2 } from 'lucide-react';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../shared/ui/CockpitDropdown';
import { NumberInput } from '../../shared/ui/NumberInput';
import { Checkbox } from '../../shared/ui/Checkbox';
import { addDraftItem, createCalculationDraft, emptyCalculatorForm, removeDraftItem, setDraftComparison, type CalculationDraft } from '../../shared/lib/calculationDraft';
import type { CalculationProject } from '../../shared/types/foundation';
import type { DetailedCalculationResult, ProjectTotalsResult } from '../../shared/lib/formulas';
import { calculateProjectResources, type CalculateCostParams } from '../../shared/lib/formulas';
import { formatCurrency } from '../../shared/lib/format';

export interface ProjectWorkspaceLine {
  inputs?: CalculateCostParams;
  id: string;
  name: string;
  quantity: number;
  result: DetailedCalculationResult;
}
interface ProjectWorkspaceControlsProps {
  draft: CalculationDraft;
  lines: ProjectWorkspaceLine[];
  totals: ProjectTotalsResult;
  projects: CalculationProject[];
  onUpdate: (change: CalculationDraft | ((draft: CalculationDraft) => CalculationDraft)) => void;
  onSave: () => void;
  onLoad: (projectId: string) => void;
  isSaving: boolean;
  mode: 'local' | 'cloud';
  pendingCount: number;
  currency?: string;
}

/** The editor below this toolbar always edits the explicitly selected card. */
export function ProjectWorkspaceControls({ draft, lines, totals, projects, onUpdate, onSave,
  onLoad, isSaving, mode, pendingCount, currency = '₽' }: ProjectWorkspaceControlsProps) {
  const active = draft.items.find(item => item.id === draft.activeItemId)!;
  const compared = lines.filter(line => draft.compareItemIds.includes(line.id));
  const projectPatch = (patch: Partial<CalculationProject>) => onUpdate(previous => ({ ...previous,
    project: { ...previous.project, ...patch } }));
  const metricRows = [
    { label: 'Материал', value: (line: ProjectWorkspaceLine) => line.inputs?.filament?.name ?? 'Не выбран', unit: '', financial: false },
    { label: 'Вес партии', value: (line: ProjectWorkspaceLine) => line.inputs?.weightG ?? 0, unit: 'г', financial: false },
    { label: 'Количество', value: (line: ProjectWorkspaceLine) => line.quantity, unit: 'шт.', financial: false },
    { label: 'Время печати', value: (line: ProjectWorkspaceLine) => calculateProjectResources([line]).printHours.toFixed(2), unit: 'ч', financial: false },
    { label: 'Себестоимость материала', value: (line: ProjectWorkspaceLine) => line.result.materialCost, financial: true },
    { label: 'Себестоимость партии', value: (line: ProjectWorkspaceLine) => line.result.totalBaseCost, financial: true },
    { label: 'Себестоимость за шт.', value: (line: ProjectWorkspaceLine) => line.result.baseCostPerUnit, financial: true },
    { label: 'Цена партии', value: (line: ProjectWorkspaceLine) => line.result.totalFinalPrice, financial: true },
    { label: 'Цена за шт.', value: (line: ProjectWorkspaceLine) => line.result.finalPricePerUnit, financial: true },
    { label: 'Плановая прибыль', value: (line: ProjectWorkspaceLine) => line.result.profitTotal, financial: true },
    { label: 'Маржа', value: (line: ProjectWorkspaceLine) => line.result.marginPercent, unit: '%', financial: false },
    { label: 'Электроэнергия', value: (line: ProjectWorkspaceLine) => line.result.electricityCost, financial: true },
    { label: 'Амортизация', value: (line: ProjectWorkspaceLine) => line.result.depreciationCost, financial: true },
    { label: 'Труд', value: (line: ProjectWorkspaceLine) => line.result.laborCost, financial: true },
    { label: 'Дополнительные расходы', value: (line: ProjectWorkspaceLine) => line.result.customCostsTotal, financial: true },
    { label: 'Скидка позиции', value: (line: ProjectWorkspaceLine) => line.result.discountTotal, financial: true },
  ];
  const fieldClass = 'h-9 w-full rounded-lg border border-white/15 bg-neutral-950/80 px-3 text-white text-xs focus:outline-none focus:border-white/30 hover:border-white/25 transition-colors duration-150';
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
    <section aria-label="Проект расчётов" className="space-y-4 border-b border-white/10 bg-neutral-950/70 px-4 sm:px-6 py-4 font-mono text-xs">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
        <span className="text-neutral-400 uppercase tracking-wider">Проект расчётов</span>
        <span className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase text-neutral-400">
          <span className={`h-1.5 w-1.5 rounded-full ${mode === 'cloud' ? 'bg-emerald-500/80' : 'bg-amber-500/80'}`} />
          {mode === 'cloud' ? 'Облако' : 'Локальный кэш'} · в очереди {pendingCount}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,260px)_auto_auto] md:items-end">
        <label className="min-w-0 space-y-1.5">
          <span className="block text-neutral-400 uppercase tracking-wider">Название проекта</span>
          <input aria-label="Название проекта" value={draft.project.name}
            onChange={event => projectPatch({ name: event.target.value })} className={fieldClass} />
        </label>
        <CockpitDropdown label="Сохранённые проекты" value="" onChange={onLoad} disabled={isSaving} ariaLabel="Загрузить сохранённый проект" placeholder="Загрузить проект"
          options={projects.map(project => ({ value: project.id, label: project.name }))} />
        <CockpitButton icon={Plus} className="h-9" disabled={isSaving}
          onClick={() => onUpdate(previous => createCalculationDraft(previous.user_id, emptyCalculatorForm()))}>Новый проект</CockpitButton>
        <CockpitButton icon={Save} className="h-9" onClick={onSave} disabled={isSaving || !draft.project.name.trim()}>
          {isSaving ? 'Сохранение' : 'Сохранить проект'}
        </CockpitButton>
      </div>
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-neutral-500">{draft.items.length} позиций · сравнение {compared.length}/2</span>
          <div className="flex flex-wrap items-center gap-2">
            <CockpitButton icon={Plus} onClick={() => onUpdate(previous => addDraftItem(previous))}>Добавить расчёт</CockpitButton>
            <CockpitButton icon={Copy} onClick={() => onUpdate(previous => addDraftItem(previous, undefined, previous.activeItemId))}>Копировать расчёт</CockpitButton>
            <CockpitButton icon={Trash2} disabled={draft.items.length === 1}
              onClick={() => onUpdate(previous => removeDraftItem(previous, previous.activeItemId))}>Удалить расчёт</CockpitButton>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Карточки расчётов">
          <AnimatePresence initial={false} mode="popLayout">
            {draft.items.map((item, index) => {
              const selected = draft.compareItemIds.includes(item.id);
              const line = lines.find(row => row.id === item.id);
              const isActive = item.id === active.id;
              return <motion.div key={item.id} layout="position" initial={{ opacity: 0, transform: 'translateY(8px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }} exit={{ opacity: 0, transform: 'translateY(-8px)' }}
                whileHover={{ borderColor: 'rgba(255,255,255,0.25)' }}
                className={`w-44 shrink-0 rounded-lg border p-2.5 ${isActive ? 'bg-white/10 border-white/25' : 'bg-white/[0.03] border-white/10'}`}>
                <div className="flex items-start justify-between gap-2">
                  <button type="button" aria-label={`Открыть расчёт ${index + 1}: ${item.name}`} aria-pressed={isActive}
                    onClick={() => onUpdate(previous => ({ ...previous, activeItemId: item.id }))}
                    className="min-w-0 flex-1 text-left cursor-pointer focus-visible:outline focus-visible:outline-white/40">
                    <span className={`block truncate ${isActive ? 'text-white' : 'text-neutral-200'}`}>{index + 1}. {item.name || 'Без названия'}</span>
                    <span className="mt-1 block text-neutral-400 tabular-nums">{line?.quantity ?? 1} шт. · {formatCurrency(line?.result.totalFinalPrice ?? 0, currency)}</span>
                  </button>
                  <Checkbox variant="neutral" size="sm" aria-label={`Сравнить расчёт ${index + 1}`} checked={selected}
                    disabled={!selected && compared.length === 2} className="mt-0.5"
                    onChange={() => onUpdate(previous => setDraftComparison(previous, selected
                      ? previous.compareItemIds.filter(id => id !== item.id) : [...previous.compareItemIds, item.id]))} />
                </div>
              </motion.div>;
            })}
          </AnimatePresence>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-1.5">
          <span className="block text-neutral-400 uppercase tracking-wider">Название активного расчёта</span>
          <input aria-label="Название активного расчёта" value={active.name}
            onChange={event => onUpdate(previous => ({ ...previous,
              items: previous.items.map(item => item.id === active.id ? { ...item, name: event.target.value } : item) }))}
            className={fieldClass} />
        </label>
        <NumberInput label="Скидка проекта, %" value={draft.project.discount_percent} min={0} max={100}
          onChange={value => projectPatch({ discount_percent: Math.min(100, Math.max(0, value ?? 0)) })} />
        <NumberInput label={`Скидка проекта, ${currency}`} value={draft.project.discount_amount} min={0}
          onChange={value => projectPatch({ discount_amount: Math.max(0, value ?? 0) })} />
        <NumberInput label={`Согласованная цена проекта, ${currency}`} value={draft.project.agreed_price} min={0} allowEmpty
          hint="Пусто — по расчёту. Ноль — цена 0. Применяется последней."
          onChange={value => projectPatch({ agreed_price: value === null ? null : Math.max(0, value) })} />
      </div>
      {totals.isBelowCost && <p role="status" className="text-amber-400">Цена проекта ниже себестоимости: {formatCurrency(totals.totalBaseCost, currency)}.</p>}
      {compared.length > 0 && <div className="overflow-x-auto">
        <table aria-label="Сравнение расчётов" className="w-full text-left border-collapse tabular-nums">
          <caption className="text-left text-neutral-400 pb-2">Сравнение · показатели обновляются при редактировании</caption>
          <thead><tr className="border-b border-white/10"><th className="py-2 font-normal">Показатель</th>
            {compared.map(line => <th key={line.id} className="px-3 py-2 font-normal text-white">{line.name}</th>)}</tr></thead>
          <tbody>{metricRows.map(metric => <tr key={metric.label} className="border-b border-white/5">
            <td className="py-2 text-neutral-400">{metric.label}</td>
            {compared.map(line => <td key={line.id} className={`px-3 py-2 ${metric.label === 'Плановая прибыль'
              ? Number(metric.value(line)) < 0 ? 'text-rose-400' : 'text-emerald-400' : 'text-neutral-200'}`}>
              {metric.financial ? formatCurrency(Number(metric.value(line)), currency) : `${metric.value(line)} ${metric.unit ?? ''}`}
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </MotionConfig>;
}
