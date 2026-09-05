'use client';

import React, { useState, useMemo } from 'react';
import { 
  CockpitTableProps, 
  CockpitTableColumn, 
  CockpitTableAlign 
} from './types';
import { Checkbox } from '../Checkbox';
import { Tooltip } from '../Tooltip';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  X, 
  Package, 
  Database,
  Activity,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePersistentState } from '../../lib/usePersistentState';

export function CockpitTable<T>({
  columns,
  data,
  keyExtractor,
  title,
  icon: TitleIcon,
  statusBadge,
  actions,
  showLeds = false,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  sortField: externalSortField,
  sortOrder: externalSortOrder,
  onSort: externalOnSort,
  isSearchable = false,
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  searchPlaceholder = 'Поиск по реестру...',
  filterSlot,
  batchActionsSlot,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
  rowClassName,
  isRowExpanded,
  renderSubRow,
  renderCustomRow,
  emptyState,
  emptyTitle = 'РЕЕСТР ПУСТ',
  emptySubtitle = 'По заданным параметрам записи не найдены.',
  emptyIcon: EmptyIcon = Package,
  emptyAction,
  isLoading = false,
  footer,
  showDefaultFooter = false,
  variant = 'cockpit',
  className = '',
  storageKey,
}: CockpitTableProps<T>) {
  // 1. Internal search state (if not controlled)
  const [persistedInternalSearch, setPersistedInternalSearch] = usePersistentState<string>(
    storageKey ? `cockpit_${storageKey}_search` : '__noop_csearch__',
    ''
  );
  const [localInternalSearch, setLocalInternalSearch] = useState('');
  const internalSearch = storageKey ? persistedInternalSearch : localInternalSearch;
  const setInternalSearch = storageKey ? setPersistedInternalSearch : setLocalInternalSearch;

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearch;
  const handleSearchChange = (val: string) => {
    if (externalOnSearchChange) {
      externalOnSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  // 2. Internal sort state (if not controlled)
  const [persistedInternalSortField, setPersistedInternalSortField] = usePersistentState<string | null>(
    storageKey ? `cockpit_${storageKey}_sortField` : '__noop_csortField__',
    null
  );
  const [persistedInternalSortOrder, setPersistedInternalSortOrder] = usePersistentState<'asc' | 'desc'>(
    storageKey ? `cockpit_${storageKey}_sortOrder` : '__noop_csortOrder__',
    'asc'
  );
  const [localInternalSortField, setLocalInternalSortField] = useState<string | null>(null);
  const [localInternalSortOrder, setLocalInternalSortOrder] = useState<'asc' | 'desc'>('asc');

  const internalSortField = storageKey ? persistedInternalSortField : localInternalSortField;
  const setInternalSortField = storageKey ? setPersistedInternalSortField : setLocalInternalSortField;
  const internalSortOrder = storageKey ? persistedInternalSortOrder : localInternalSortOrder;
  const setInternalSortOrder = storageKey ? setPersistedInternalSortOrder : setLocalInternalSortOrder;

  const sortField = externalSortField !== undefined ? externalSortField : internalSortField;
  const sortOrder = externalSortOrder !== undefined ? externalSortOrder : internalSortOrder;

  const handleSort = (fieldId: string) => {
    if (externalOnSort) {
      externalOnSort(fieldId);
    } else {
      if (internalSortField === fieldId) {
        setInternalSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setInternalSortField(fieldId);
        setInternalSortOrder('asc');
      }
    }
  };

  // 3. Processed and filtered data (for internal mode)
  const processedData = useMemo(() => {
    if (externalOnSearchChange || externalOnSort) {
      // Data is controlled outside
      return data;
    }

    let items = [...data];

    // Local Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((item) => {
        return columns.some((col) => {
          if (col.accessor) {
            const val = typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor];
            return String(val ?? '').toLowerCase().includes(q);
          }
          return false;
        });
      });
    }

    // Local Sort
    if (sortField) {
      const col = columns.find((c) => (c.sortKey || c.id) === sortField);
      if (col) {
        items.sort((a, b) => {
          let valA: any;
          let valB: any;

          if (col.sortValue) {
            valA = col.sortValue(a);
            valB = col.sortValue(b);
          } else if (col.accessor) {
            valA = typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor];
            valB = typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor];
          }

          if (valA === valB) return 0;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;

          let cmp = 0;
          if (typeof valA === 'number' && typeof valB === 'number') {
            cmp = valA - valB;
          } else {
            cmp = String(valA).localeCompare(String(valB), 'ru', { numeric: true });
          }

          return sortOrder === 'asc' ? cmp : -cmp;
        });
      }
    }

    return items;
  }, [data, columns, searchQuery, sortField, sortOrder, externalOnSearchChange, externalOnSort]);

  // 4. Selection checks
  const isAllSelected = selectable && processedData.length > 0 && selectedIds.length >= processedData.length;
  const isSomeSelected = selectable && selectedIds.length > 0 && !isAllSelected;

  // 5. Align classes helper
  const getAlignClass = (align?: CockpitTableAlign) => {
    if (align === 'right') return 'text-right justify-end';
    if (align === 'center') return 'text-center justify-center';
    return 'text-left justify-start';
  };

  // 6. Variant container styles
  const containerClasses = useMemo(() => {
    switch (variant) {
      case 'cockpit':
        return 'relative rounded-2xl border border-white/10 bg-neutral-950/80 backdrop-blur-xl shadow-2xl overflow-hidden';
      case 'card':
        return 'relative rounded-xl border border-white/10 bg-neutral-900/60 overflow-hidden';
      case 'transparent':
        return 'relative w-full bg-transparent overflow-hidden';
      case 'embedded':
      default:
        return 'relative w-full rounded-xl border border-white/10 bg-neutral-950/60 overflow-hidden';
    }
  }, [variant]);

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* 1. Cockpit Header / Top Toolbar */}
      {(title || actions || showLeds || statusBadge || isSearchable || filterSlot) && (
        <div className="border-b border-white/10 bg-neutral-900/90 select-none">
          {/* Top Title & Actions Bar */}
          {(title || actions || showLeds || statusBadge) && (
            <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
              {/* Left: Terminal LEDs & Title */}
              <div className="flex items-center gap-3">
                {showLeds && (
                  <div className="flex items-center gap-1.5 mr-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                )}

                {showLeds && <div className="h-4 w-px bg-white/15" />}

                {title && (
                  <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
                    {TitleIcon && <TitleIcon size={14} className="text-white shrink-0" />}
                    <span>{title}</span>
                  </div>
                )}

                {statusBadge}
              </div>

              {/* Right: Actions Slot */}
              {actions && (
                <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                  {actions}
                </div>
              )}
            </div>
          )}

          {/* Search & Filter Bar */}
          {(isSearchable || filterSlot) && (
            <div className="px-4 py-2.5 border-t border-white/5 bg-neutral-950/40 flex items-center justify-between gap-3 flex-wrap">
              {isSearchable && (
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-8.5 pr-8 py-1.5 bg-neutral-950/90 border border-white/10 focus:border-white/25 rounded-lg text-xs font-mono text-neutral-200 placeholder:text-neutral-600 outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              {filterSlot && (
                <div className="flex items-center gap-2 flex-wrap">
                  {filterSlot}
                </div>
              )}
            </div>
          )}

          {/* Batch Actions Bar */}
          {batchActionsSlot && selectedIds.length > 0 && (
            <div className="px-4 py-2 bg-neutral-900 border-t border-white/10 flex items-center justify-between gap-3">
              {batchActionsSlot}
            </div>
          )}
        </div>
      )}

      {/* 2. Table Element */}
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse font-sans min-w-[600px]">
          {/* Table Head */}
          <thead>
            <tr className="bg-neutral-900/90 border-b border-white/10 text-neutral-400 font-mono text-[11px] uppercase tracking-wider select-none">
              {/* Select All Checkbox */}
              {selectable && (
                <th className="w-8 px-3 py-3 text-center">
                  <Tooltip content={isAllSelected ? 'Снять выделение со всех' : 'Выбрать все'}>
                    <div
                      className="flex items-center justify-center cursor-pointer"
                      onClick={onToggleSelectAll}
                    >
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={isSomeSelected}
                        onChange={onToggleSelectAll || (() => {})}
                        variant="cyan"
                        size="sm"
                      />
                    </div>
                  </Tooltip>
                </th>
              )}

              {/* Columns Header */}
              {columns.map((col) => {
                const isSortActive = (col.sortKey || col.id) === sortField;
                const canSort = col.sortable !== false && (col.accessor !== undefined || col.sortValue !== undefined || Boolean(col.sortKey));

                return (
                  <th
                    key={col.id}
                    onClick={() => canSort && handleSort(col.sortKey || col.id)}
                    style={{ width: col.width, minWidth: col.minWidth }}
                    className={`py-3 px-3.5 whitespace-nowrap transition-colors ${
                      canSort ? 'cursor-pointer hover:text-white group' : ''
                    } ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${
                      col.headerClassName || ''
                    }`}
                  >
                    <div className={`flex items-center gap-1 ${getAlignClass(col.align)}`}>
                      <span>{col.header}</span>
                      {canSort && (
                        <span className="inline-flex items-center justify-center w-3 h-3 shrink-0">
                          {isSortActive ? (
                            sortOrder === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-white" />
                            )
                          ) : (
                            <ChevronDown className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 transition-opacity" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-white/5 font-mono text-xs">
            {/* Loading state skeleton */}
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  {selectable && (
                    <td className="py-3 px-3 text-center">
                      <div className="w-4 h-4 bg-white/5 rounded mx-auto" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={`skel-col-${col.id}`} className="py-3 px-3.5">
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : processedData.length === 0 ? (
              /* Empty state row */
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 px-4 text-center"
                >
                  {emptyState || (
                    <div className="max-w-md mx-auto space-y-3 font-mono">
                      <div className="w-12 h-12 bg-neutral-900 border border-white/10 rounded-xl flex items-center justify-center mx-auto text-neutral-400">
                        <EmptyIcon size={24} />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-white">{emptyTitle}</div>
                        <div className="text-xs text-neutral-400 font-sans">{emptySubtitle}</div>
                      </div>
                      {emptyAction && <div className="pt-2">{emptyAction}</div>}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              /* Data Rows */
              processedData.map((item, rowIndex) => {
                const key = keyExtractor(item, rowIndex);
                const isSelected = selectable && selectedIds.includes(key);
                const isExpanded = isRowExpanded ? isRowExpanded(item) : false;

                const customRowClass =
                  typeof rowClassName === 'function' ? rowClassName(item, rowIndex) : rowClassName || '';

                const defaultCells = (
                  <>
                    {/* Checkbox Cell */}
                    {selectable && (
                      <td
                        className="w-8 px-3 py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => onToggleSelect && onToggleSelect(key, item)}
                          variant="cyan"
                          size="sm"
                        />
                      </td>
                    )}

                    {/* Content Columns */}
                    {columns.map((col) => {
                      let cellContent: React.ReactNode = null;

                      if (col.render) {
                        cellContent = col.render(item, rowIndex);
                      } else if (col.accessor) {
                        const rawVal =
                          typeof col.accessor === 'function'
                            ? col.accessor(item)
                            : (item as any)[col.accessor];
                        cellContent = rawVal !== undefined && rawVal !== null ? String(rawVal) : '—';
                      }

                      const cellClass =
                        typeof col.cellClassName === 'function'
                          ? col.cellClassName(item)
                          : col.cellClassName || '';

                      return (
                        <td
                          key={col.id}
                          className={`py-3 px-3.5 ${getAlignClass(col.align)} ${
                            col.hideOnMobile ? 'hidden md:table-cell' : ''
                          } ${cellClass}`}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </>
                );

                return (
                  <React.Fragment key={key}>
                    <tr
                      onClick={() => onRowClick && onRowClick(item, rowIndex)}
                      onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(item, rowIndex)}
                      onContextMenu={(e) => onRowContextMenu && onRowContextMenu(e, item, rowIndex)}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isSelected ? 'bg-white/[0.04]' : ''
                      } ${onRowClick ? 'cursor-pointer' : ''} ${customRowClass}`}
                    >
                      {renderCustomRow
                        ? renderCustomRow(item, rowIndex, defaultCells)
                        : defaultCells}
                    </tr>

                    {/* Subrow / Accordion */}
                    {isExpanded && renderSubRow && (
                      <tr className="bg-neutral-950/90">
                        <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-0">
                          {renderSubRow(item, rowIndex)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Footer / Telemetry Bar */}
      {footer ? (
        <div className="px-4 py-2.5 border-t border-white/10 bg-neutral-900/90 select-none">
          {footer}
        </div>
      ) : showDefaultFooter ? (
        <div className="px-4 py-2.5 border-t border-white/10 bg-neutral-900/90 flex items-center justify-between text-[11px] font-mono text-neutral-400 select-none flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <Database size={11} className="text-white" />
              <span>REGISTRY READY</span>
            </span>
            <span>•</span>
            <span className="text-emerald-400">FPS: 60</span>
          </div>

          <div className="flex items-center gap-3 text-neutral-300">
            <span>RECORDS: {processedData.length}</span>
            {selectedIds.length > 0 && (
              <>
                <span>•</span>
                <span className="text-cyan-400 font-bold">SELECTED: {selectedIds.length}</span>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
