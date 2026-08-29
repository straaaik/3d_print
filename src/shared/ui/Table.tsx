'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Search, X, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePersistentState } from '../lib/usePersistentState';

export interface TableColumn<T> {
  key: string;
  header: string | React.ReactNode;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  sortable?: boolean;
  sortValue?: (item: T) => string | number | boolean;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  className?: string;
  isSearchable?: boolean;
  pageSize?: number;
  renderSubRow?: (item: T) => React.ReactNode;
  infiniteScroll?: boolean;
  batchSize?: number;
  toolbarActions?: React.ReactNode;
  rowClassName?: (item: T) => string;
  storageKey?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  className = '',
  isSearchable = false,
  pageSize,
  renderSubRow,
  infiniteScroll = false,
  batchSize = 25,
  toolbarActions,
  rowClassName,
  storageKey,
}: TableProps<T>) {
  const [persistedSortKey, setPersistedSortKey] = usePersistentState<string | null>(storageKey ? `table_${storageKey}_sortKey` : '__noop_sk__', null);
  const [persistedSortDirection, setPersistedSortDirection] = usePersistentState<'asc' | 'desc'>(storageKey ? `table_${storageKey}_sortDir` : '__noop_sd__', 'asc');
  const [persistedSearchQuery, setPersistedSearchQuery] = usePersistentState<string>(storageKey ? `table_${storageKey}_search` : '__noop_sq__', '');

  const [localSortKey, setLocalSortKey] = useState<string | null>(null);
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc'>('asc');
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  const sortKey = storageKey ? persistedSortKey : localSortKey;
  const setSortKey = storageKey ? setPersistedSortKey : setLocalSortKey;
  const sortDirection = storageKey ? persistedSortDirection : setLocalSortDirection;
  const setSortDirection = storageKey ? setPersistedSortDirection : setLocalSortDirection;
  const searchQuery = storageKey ? persistedSearchQuery : localSearchQuery;
  const setSearchQuery = storageKey ? setPersistedSearchQuery : setLocalSearchQuery;

  const [currentPage, setCurrentPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(batchSize);

  const [prevFilterKey, setPrevFilterKey] = useState('');
  const currentFilterKey = `${searchQuery}_${sortKey || ''}_${sortDirection}_${batchSize}`;

  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
    setVisibleCount(batchSize);
  }

  // Drag-to-scroll
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const rafIdRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('th') ||
      target.closest('a') ||
      target.closest('select')
    ) {
      return;
    }

    setIsMouseDown(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeftState(container.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsMouseDown(false);
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown) return;
    const container = containerRef.current;
    if (!container) return;

    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (container) {
        container.scrollLeft = scrollLeftState - walk;
      }
    });
  };

  const handleSort = (col: TableColumn<T>) => {
    if (!col.sortable) return;

    if (sortKey === col.key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(col.key);
      setSortDirection('asc');
    }
  };

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    const column = columns.find((c) => c.key === sortKey);
    if (!column) return data;

    const sorted = [...data].sort((a, b) => {
      let valA = column.sortValue ? column.sortValue(a) : (a as any)[sortKey];
      let valB = column.sortValue ? column.sortValue(b) : (b as any)[sortKey];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB, 'ru', { numeric: true, sensitivity: 'base' });
      }

      if (valA < valB) return -1;
      if (valA > valB) return 1;
      return 0;
    });

    return sortDirection === 'desc' ? sorted.reverse() : sorted;
  }, [data, sortKey, sortDirection, columns]);

  // Search
  const filteredAndSortedData = useMemo(() => {
    if (!searchQuery.trim()) return sortedData;

    const query = searchQuery.toLowerCase().trim().replace(/^#/, '');

    return sortedData.filter((item) => {
      return Object.values(item as any).some((val) => {
        if (val === null || val === undefined) return false;

        if (Array.isArray(val)) {
          return val.some(
            (element) =>
              element !== null &&
              element !== undefined &&
              String(element).toLowerCase().replace(/^#/, '').includes(query)
          );
        }

        if (typeof val === 'object') {
          return JSON.stringify(val).toLowerCase().includes(query);
        }

        return String(val).toLowerCase().replace(/^#/, '').includes(query);
      });
    });
  }, [sortedData, searchQuery]);

  const totalPages = useMemo(() => {
    if (!pageSize) return 1;
    return Math.ceil(filteredAndSortedData.length / pageSize);
  }, [filteredAndSortedData, pageSize]);

  const displayedData = useMemo(() => {
    if (infiniteScroll) {
      return filteredAndSortedData.slice(0, visibleCount);
    }
    if (pageSize) {
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return filteredAndSortedData.slice(startIndex, endIndex);
    }
    return filteredAndSortedData;
  }, [filteredAndSortedData, infiniteScroll, visibleCount, pageSize, currentPage]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!infiniteScroll || visibleCount >= filteredAndSortedData.length) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + batchSize, filteredAndSortedData.length));
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [infiniteScroll, visibleCount, filteredAndSortedData.length, batchSize]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search & Actions Toolbar */}
      {(isSearchable || toolbarActions) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 select-none">
          {isSearchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по реестру..."
                className="w-full pl-8.5 pr-8 py-1.5 bg-neutral-950/90 border border-white/10 focus:border-white/25 rounded-xl text-xs font-mono text-neutral-200 placeholder:text-neutral-600 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {toolbarActions && (
            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {toolbarActions}
            </div>
          )}
        </div>
      )}

      {/* Main Table Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        className={`w-full overflow-x-auto rounded-2xl border border-white/10 bg-neutral-950/80 backdrop-blur-xl shadow-2xl custom-scrollbar ${
          isMouseDown ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
      >
        <table className="w-full text-left text-xs border-collapse font-sans min-w-[600px]">
          <thead>
            <tr className="bg-neutral-900/90 border-b border-white/10 text-neutral-400 font-mono text-[11px] uppercase tracking-wider select-none">
              {columns.map((col) => {
                const isSortActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col)}
                    className={`py-3 px-3.5 whitespace-nowrap transition-colors ${
                      col.sortable ? 'cursor-pointer hover:text-white group' : ''
                    } ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${col.className || ''}`}
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        col.align === 'right'
                          ? 'justify-end'
                          : col.align === 'center'
                          ? 'justify-center'
                          : 'justify-start'
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="inline-flex items-center justify-center w-3 h-3 shrink-0">
                          {isSortActive ? (
                            sortDirection === 'asc' ? (
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

          <tbody className="divide-y divide-white/5 font-mono text-xs">
            {displayedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  {emptyState || (
                    <div className="max-w-md mx-auto space-y-2 font-mono">
                      <div className="w-10 h-10 bg-neutral-900 border border-white/10 rounded-xl flex items-center justify-center mx-auto text-neutral-400">
                        <Package size={20} />
                      </div>
                      <div className="text-sm font-bold text-white">§ РЕЕСТР ПУСТ</div>
                      <div className="text-xs text-neutral-400 font-sans">
                        Записи не найдены или список пуст.
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              displayedData.map((item) => {
                const key = keyExtractor(item);
                const customClass = rowClassName ? rowClassName(item) : '';

                return (
                  <React.Fragment key={key}>
                    <tr className={`hover:bg-white/[0.03] transition-colors ${customClass}`}>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`py-3 px-3.5 ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          } ${col.className || ''}`}
                        >
                          {col.render ? col.render(item) : (item as any)[col.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                    {renderSubRow && (
                      <tr className="bg-neutral-950/90">
                        <td colSpan={columns.length} className="p-0">
                          {renderSubRow(item)}
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

      {/* Infinite Scroll Sentinel */}
      {infiniteScroll && visibleCount < filteredAndSortedData.length && (
        <div ref={sentinelRef} className="p-3 text-center font-mono text-xs text-neutral-500">
          Загрузка записей... ({visibleCount} из {filteredAndSortedData.length})
        </div>
      )}

      {/* Pagination Footer */}
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-950/80 border border-white/10 rounded-xl text-xs font-mono select-none">
          <span className="text-neutral-400">
            Страница <strong className="text-white">{currentPage}</strong> из{' '}
            <strong className="text-white">{totalPages}</strong> ({filteredAndSortedData.length} записей)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
