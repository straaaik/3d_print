'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TableColumn<T> {
  key: string;
  header: string | React.ReactNode;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  sortable?: boolean; // Флаг, разрешающий сортировку по этой колонке
  sortValue?: (item: T) => string | number | boolean; // Кастомная функция извлечения значения для сортировки
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  className?: string;
  isSearchable?: boolean; // Добавляет панель поиска сверху таблицы
  pageSize?: number; // Количество строк на одной странице (для постраничной пагинации)
  renderSubRow?: (item: T) => React.ReactNode; // Функция отрисовки дочерней раскрывающейся строки
  infiniteScroll?: boolean; // Включает порционную подгрузку при прокрутке
  batchSize?: number; // Размер порции (по умолчанию 25)
  toolbarActions?: React.ReactNode; // Дополнительные элементы управления в строке поиска
  rowClassName?: (item: T) => string; // Кастомные стили для строки таблицы
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
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(batchSize);

  const [prevFilterKey, setPrevFilterKey] = useState('');
  const currentFilterKey = `${searchQuery}_${sortKey || ''}_${sortDirection}_${batchSize}`;

  // Сброс страницы и видимого количества при изменении поиска, сортировки или размера пачки
  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
    setVisibleCount(batchSize);
  }

  // Логика перетаскивания мышью (Drag-to-Scroll) с RAF-оптимизацией
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const rafIdRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // Игнорируем драг при клике на кнопки, заголовки сортировки th или инпуты
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
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown) return;

    const container = containerRef.current;
    if (!container) return;

    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5; // Коэффициент скорости перетаскивания

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (container) {
        container.scrollLeft = scrollLeftState - walk;
      }
    });
  };

  // Обработчик переключения сортировки
  const handleSort = (col: TableColumn<T>) => {
    if (!col.sortable) return;

    if (sortKey === col.key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null); // Сброс сортировки
      }
    } else {
      setSortKey(col.key);
      setSortDirection('asc');
    }
  };

  // 1. Сортировка данных в реальном времени
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    const column = columns.find((c) => c.key === sortKey);
    if (!column) return data;

    const sorted = [...data].sort((a, b) => {
      let valA = column.sortValue ? column.sortValue(a) : (a as any)[sortKey];
      let valB = column.sortValue ? column.sortValue(b) : (b as any)[sortKey];

      // Обработка пустых значений
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

  // 2. Фильтрация данных по поисковому запросу (с поддержкой тегов #, категорий и массивов)
  const filteredAndSortedData = useMemo(() => {
    if (!searchQuery.trim()) return sortedData;

    const query = searchQuery.toLowerCase().trim().replace(/^#/, '');

    return sortedData.filter((item) => {
      return Object.values(item as any).some((val) => {
        if (val === null || val === undefined) return false;

        if (Array.isArray(val)) {
          return val.some((element) =>
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

  // 3. Вычисление страниц для постраничной пагинации
  const totalPages = useMemo(() => {
    if (!pageSize) return 1;
    return Math.ceil(filteredAndSortedData.length / pageSize);
  }, [filteredAndSortedData, pageSize]);

  // Данные для отображения (в зависимости от режима: infinite scroll, pagination или все данные)
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

  // Sentinel для автоматической подгрузки при прокрутке
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (!infiniteScroll) return;
    if (visibleCount >= filteredAndSortedData.length) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + batchSize, filteredAndSortedData.length));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [infiniteScroll, visibleCount, filteredAndSortedData.length, batchSize]);

  const startIndex = pageSize ? (currentPage - 1) * pageSize : 0;
  const endIndex = startIndex + displayedData.length;

  return (
    <div className={`w-full overflow-hidden rounded-lg border border-[#242930] bg-[#16181d] flex flex-col ${className}`}>
      {/* Панель поиска и действий */}
      {(isSearchable || toolbarActions) && data.length > 0 && (
        <div className="p-2.5 border-b border-[#242930] flex flex-wrap items-center justify-between gap-3 bg-[#111317]/40 select-none min-h-[46px]">
          <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-sm">
            {isSearchable && (
              <div className="relative w-full">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-accent" />
                <input
                  type="text"
                  placeholder="Поиск по таблице..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1a1d24] border border-[#242930] focus:border-primary focus:outline-none rounded-lg px-2.5 py-1.5 pl-8 text-xs text-white placeholder-neutral-accent transition-colors"
                />
              </div>
            )}
            {searchQuery && !toolbarActions && (
              <span className="text-[10px] text-neutral-accent font-semibold shrink-0">
                Найдено: {filteredAndSortedData.length}
              </span>
            )}
          </div>

          {toolbarActions && (
            <div className="flex items-center gap-2.5 ml-auto">
              {toolbarActions}
            </div>
          )}
        </div>
      )}

      {/* Обертка для таблицы с минимальной высотой для предотвращения прыжков интерфейса */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        className={`w-full overflow-x-auto min-h-[160px] smooth-scroll transition-all duration-300 ${
          isMouseDown ? 'cursor-grabbing' : ''
        }`}
      >
        <table className="w-full text-left font-sans text-xs sm:text-sm border-collapse min-w-[600px] select-text">
          <thead>
            <tr className="border-b border-[#242930] text-[#9ca3af] font-semibold select-none bg-[#111317]">
              {columns.map((col) => {
                const alignClass = 
                  col.align === 'right' 
                    ? 'text-right' 
                    : col.align === 'center' 
                    ? 'text-center' 
                    : 'text-left';
                
                const isSorted = sortKey === col.key;
                const isSelectCol = col.key === 'select';
                const paddingClass = isSelectCol ? 'py-2 px-1.5 w-8 max-w-[32px]' : 'py-2 px-3';

                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col)}
                    className={`${paddingClass} text-xs uppercase tracking-wider font-bold transition-colors select-none group ${
                      col.sortable ? 'cursor-pointer hover:bg-[#242930]/40' : ''
                    } ${alignClass} ${col.className || ''}`}
                  >
                    <div className={`flex items-center gap-1.5 ${
                      col.align === 'right' 
                        ? 'justify-end' 
                        : col.align === 'center' 
                        ? 'justify-center' 
                        : 'justify-start'
                    }`}>
                      <span>{col.header}</span>
                      {col.sortable && (
                        <div className="text-primary shrink-0 flex items-center justify-center w-3 h-3">
                          {isSorted ? (
                            sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                          ) : (
                            <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary/30 relative">
            {displayedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center align-middle">
                  <div className="flex flex-col items-center justify-center gap-2 select-none">
                    {searchQuery ? (
                      <span className="text-neutral-accent text-xs font-medium">
                        Ничего не найдено по запросу «{searchQuery}»
                      </span>
                    ) : (
                      emptyState || (
                        <span className="text-neutral-accent text-xs font-medium">
                          Нет данных для отображения
                        </span>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              displayedData.map((item) => (
                <React.Fragment key={keyExtractor(item)}>
                  <tr
                    className={`text-gray-300 hover:text-white transition-colors table-row-optimized ${
                      rowClassName ? rowClassName(item) : 'hover:bg-[#242930]/30'
                    }`}
                  >
                    {columns.map((col) => {
                      const alignClass = 
                        col.align === 'right' 
                          ? 'text-right' 
                          : col.align === 'center' 
                          ? 'text-center' 
                          : 'text-left';
                      const isSelectCol = col.key === 'select';
                      const tdPadding = isSelectCol ? 'py-2 px-1.5 w-8 max-w-[32px]' : 'py-2.5 px-3';
                      return (
                        <td
                          key={col.key}
                          className={`${tdPadding} align-middle ${alignClass} ${col.className || ''}`}
                        >
                          {col.render ? col.render(item) : (item as any)[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                  {renderSubRow && renderSubRow(item)}
                </React.Fragment>
              ))
            )}
            {/* Невидимый маркер для Infinite Scroll */}
            {infiniteScroll && visibleCount < filteredAndSortedData.length && (
              <tr ref={sentinelRef}>
                <td colSpan={columns.length} className="py-2 text-center text-xs text-neutral-accent">
                  <div className="flex items-center justify-center gap-2 py-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    <span>Подгрузка данных...</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Панель Infinite Scroll */}
      {infiniteScroll && filteredAndSortedData.length > batchSize && (
        <div className="p-2.5 border-t border-[#242930] bg-[#111317]/40 flex items-center justify-between gap-4 text-xs select-none">
          <span className="text-neutral-accent font-medium">
            Показано {displayedData.length} из {filteredAndSortedData.length}
          </span>
          {visibleCount < filteredAndSortedData.length && (
            <button
              type="button"
              onClick={() => setVisibleCount(filteredAndSortedData.length)}
              className="px-2.5 py-1 rounded bg-[#1a1d24] border border-[#242930] hover:border-primary text-gray-300 hover:text-white transition-colors cursor-pointer text-xs font-medium"
            >
              Показать все ({filteredAndSortedData.length})
            </button>
          )}
        </div>
      )}

      {/* Панель пагинации (для постраничного режима) */}
      {!infiniteScroll && pageSize && totalPages > 1 && (
        <div className="p-3 border-t border-[#242930] bg-[#111317]/30 flex items-center justify-between gap-4 text-xs select-none">
          <span className="text-neutral-accent font-medium">
            Показано {startIndex + 1}–{endIndex} из {filteredAndSortedData.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage((prev) => Math.max(prev - 1, 1));
              }}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-[#1a1d24] border border-[#242930] hover:border-primary disabled:opacity-40 disabled:hover:border-[#242930] text-gray-400 hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Назад"
            >
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage(page);
                }}
                className={`w-7 h-7 rounded border font-mono font-medium transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-primary border-primary text-black font-bold'
                    : 'bg-[#1a1d24] border-[#242930] text-gray-400 hover:border-primary hover:text-white'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage((prev) => Math.min(prev + 1, totalPages));
              }}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-[#1a1d24] border border-[#242930] hover:border-primary disabled:opacity-40 disabled:hover:border-[#242930] text-gray-400 hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Вперед"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

