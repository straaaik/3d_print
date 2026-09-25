'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';

type RegistryAlign = 'left' | 'center' | 'right';

export interface InventoryRegistrySortPresets<S extends string> {
  asc: S;
  desc: S;
}

export interface InventoryRegistryColumn<T, S extends string> {
  id: string;
  header: React.ReactNode;
  render: (item: T, index: number) => React.ReactNode;
  align?: RegistryAlign;
  width?: string;
  minWidth?: string;
  expandedOnly?: boolean;
  sort?: InventoryRegistrySortPresets<S>;
  headerClassName?: string;
  cellClassName?: string | ((item: T) => string);
}

interface InventoryRegistryTableProps<T, S extends string> {
  ariaLabel: string;
  data: T[];
  columns: InventoryRegistryColumn<T, S>[];
  keyExtractor: (item: T, index: number) => string;
  renderMobileCard?: (
    item: T,
    index: number,
    isHovered?: boolean,
    onHover?: () => void,
  ) => React.ReactNode;
  renderCard?: (
    item: T,
    index: number,
    isHovered?: boolean,
    onHover?: () => void,
  ) => React.ReactNode;
  viewMode?: 'table' | 'cards';
  emptyState: React.ReactNode;
  isExpanded?: boolean;
  currentSort?: S;
  onSort?: (sort: S) => void;
  onRowClick?: (item: T) => void;
  minWidth?: string;
  visibleCount?: number;
  totalCount?: number;
  onLoadMore?: () => void;
  onShowAll?: () => void;
  registryLabel?: string;
}

export function nextInventorySort<S extends string>(
  current: S,
  presets: InventoryRegistrySortPresets<S>,
): S {
  return current === presets.asc ? presets.desc : presets.asc;
}

export function formatInventoryRegistryDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU', { timeZone: 'UTC' });
}

export function InventoryRegistryToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-30 flex flex-col gap-2 rounded-xl border border-white/10 bg-neutral-900/70 p-2.5 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  );
}

export function InventoryRegistryAction({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-lg border p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${danger ? 'border-rose-500/20 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10' : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function alignClass(align: RegistryAlign = 'left') {
  if (align === 'right') return 'text-right justify-end';
  if (align === 'center') return 'text-center justify-center';
  return 'text-left justify-start';
}

export function InventoryRegistryTable<T, S extends string>({
  ariaLabel,
  data,
  columns,
  keyExtractor,
  renderMobileCard,
  renderCard,
  viewMode,
  emptyState,
  isExpanded = false,
  currentSort,
  onSort,
  onRowClick,
  minWidth = '980px',
  visibleCount = data.length,
  totalCount = data.length,
  onLoadMore,
  onShowAll,
  registryLabel = 'REGISTRY READY',
}: InventoryRegistryTableProps<T, S>) {
  const visibleColumns = useMemo(
    () => columns.filter((column) => isExpanded || !column.expandedOnly),
    [columns, isExpanded],
  );
  const [hoveredCardKey, setHoveredCardKey] = useState<string | null>(null);
  const hasMore = visibleCount < totalCount;

  const renderTable = () => (
    <table aria-label={ariaLabel} className="w-full border-collapse text-left text-xs" style={{ minWidth }}>
      <thead>
        <tr className="sticky top-0 z-20 border-b border-white/10 bg-neutral-900/95 font-mono text-[10px] uppercase tracking-wider text-neutral-400 sm:text-[11px]">
          {visibleColumns.map((column) => {
            const activeDirection = currentSort === column.sort?.asc
              ? 'ascending'
              : currentSort === column.sort?.desc
                ? 'descending'
                : 'none';
            const sortable = Boolean(column.sort && onSort);
            return (
              <th
                key={column.id}
                aria-sort={sortable ? activeDirection : undefined}
                className={`whitespace-nowrap px-3 py-2.5 font-semibold ${column.headerClassName ?? ''}`}
                style={{ width: column.width, minWidth: column.minWidth }}
              >
                {sortable && column.sort ? (
                  <button
                    type="button"
                    onClick={() => onSort?.(nextInventorySort(currentSort ?? column.sort!.desc, column.sort!))}
                    className={`group flex w-full items-center gap-1 hover:text-white ${alignClass(column.align)}`}
                  >
                    <span>{column.header}</span>
                    <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center">
                      {activeDirection === 'ascending' ? <ChevronUp className="h-3 w-3 text-cyan-400" /> : null}
                      {activeDirection === 'descending' ? <ChevronDown className="h-3 w-3 text-cyan-400" /> : null}
                      {activeDirection === 'none' ? <ChevronDown className="h-3 w-3 text-neutral-600 opacity-0 group-hover:opacity-60" /> : null}
                    </span>
                  </button>
                ) : (
                  <div className={`flex items-center ${alignClass(column.align)}`}>{column.header}</div>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5 font-mono text-xs">
        {data.length === 0 ? (
          <tr><td colSpan={visibleColumns.length} className="px-4 py-12 text-center">{emptyState}</td></tr>
        ) : data.map((item, index) => (
          <tr
            key={keyExtractor(item, index)}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={() => onRowClick?.(item)}
            onKeyDown={(event) => {
              if (!onRowClick || (event.key !== 'Enter' && event.key !== ' ')) return;
              event.preventDefault();
              onRowClick(item);
            }}
            className={`group hover:bg-white/[0.04] ${onRowClick ? 'cursor-pointer focus-visible:bg-white/[0.04] focus-visible:outline-none' : ''}`}
          >
            {visibleColumns.map((column) => {
              const cellClassName = typeof column.cellClassName === 'function' ? column.cellClassName(item) : column.cellClassName ?? '';
              return (
                <td key={column.id} className={`px-3 py-2.5 ${alignClass(column.align)} ${cellClassName}`}>
                  {column.render(item, index)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-950/40 font-sans select-none">
      <AnimatePresence mode="wait">
        {viewMode === 'cards' ? (
          <motion.div
            key="cards"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="p-3 sm:p-4 space-y-4"
          >
            {data.length > 0 ? (
              <LayoutGroup id={ariaLabel ? `deck-${ariaLabel}` : 'deck'}>
                <div
                  onMouseLeave={() => setHoveredCardKey(null)}
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/60"
                >
                  {data.map((item, index) => {
                    const key = keyExtractor(item, index);
                    const isHovered = hoveredCardKey === key;
                    return (
                      <React.Fragment key={key}>
                        {(renderCard ?? renderMobileCard)?.(
                          item,
                          index,
                          isHovered,
                          () => setHoveredCardKey(key),
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </LayoutGroup>
            ) : (
              <div className="py-12 text-center">{emptyState}</div>
            )}

            {hasMore ? (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onLoadMore}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-[11px] text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  [ Ещё ]
                </button>
                <button
                  type="button"
                  onClick={onShowAll}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-[11px] text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  [ Показать все ]
                </button>
              </div>
            ) : null}
          </motion.div>
        ) : viewMode === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-x-auto w-full custom-scrollbar"
          >
            {renderTable()}
          </motion.div>
        ) : (
          <div key="default">
            <div className="lg:hidden p-3 space-y-2">
              {data.length > 0 ? data.map((item, index) => (
                <React.Fragment key={keyExtractor(item, index)}>
                  {renderMobileCard?.(item, index)}
                </React.Fragment>
              )) : emptyState}

              {hasMore ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" onClick={onLoadMore} className="rounded-lg border border-white/10 bg-white/5 py-2 font-mono text-[11px] text-neutral-300 hover:bg-white/10">Ещё</button>
                  <button type="button" onClick={onShowAll} className="rounded-lg border border-white/10 bg-white/5 py-2 font-mono text-[11px] text-neutral-300 hover:bg-white/10">Показать все</button>
                </div>
              ) : null}
            </div>

            <div className="hidden lg:block overflow-x-auto w-full custom-scrollbar">
              {renderTable()}
            </div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-neutral-900/90 px-4 py-2.5 font-mono text-[10px] text-neutral-500">
        <span>{registryLabel}</span>
        <div className="flex items-center gap-3">
          <span>RECORDS: {visibleCount}/{totalCount}</span>
          {hasMore ? (
            <>
              <button type="button" onClick={onLoadMore} className="text-neutral-300 hover:text-white">[ ЕЩЁ ]</button>
              <button type="button" onClick={onShowAll} className="text-neutral-300 hover:text-white">[ ВСЕ ]</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
