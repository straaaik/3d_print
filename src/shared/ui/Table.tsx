'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TableColumn<T> {
  key: string;
  header: string;
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
  pageSize?: number; // Количество строк на одной странице
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  className = '',
  isSearchable = false,
  pageSize,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Сброс страницы на первую при изменении поискового запроса или сортировки
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortKey, sortDirection]);

  // Логика перетаскивания мышью (Drag-to-Scroll)
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    // Игнорируем драг при клике на кнопки, заголовки сортировки th или инпуты
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('th') ||
      target.closest('a')
    ) {
      return;
    }

    setIsMouseDown(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeftState(container.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown) return;

    const container = containerRef.current;
    if (!container) return;

    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5; // Коэффициент скорости перетаскивания
    container.scrollLeft = scrollLeftState - walk;
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

  // 2. Фильтрация данных по поисковому запросу
  const filteredAndSortedData = useMemo(() => {
    if (!searchQuery.trim()) return sortedData;

    const query = searchQuery.toLowerCase().trim();

    return sortedData.filter((item) => {
      // Ищем совпадения по всем свойствам объекта данных
      return Object.values(item as any).some((val) => {
        if (val === null || val === undefined) return false;
        
        // Для сложных объектов приводим к строке
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [sortedData, searchQuery]);

  // 3. Вычисление страниц
  const totalPages = useMemo(() => {
    if (!pageSize) return 1;
    return Math.ceil(filteredAndSortedData.length / pageSize);
  }, [filteredAndSortedData, pageSize]);

  // Данные для текущей страницы
  const paginatedData = useMemo(() => {
    if (!pageSize) return filteredAndSortedData;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const startIndex = pageSize ? (currentPage - 1) * pageSize : 0;
  const endIndex = startIndex + paginatedData.length;

  return (
    <div className={`w-full overflow-hidden rounded-lg border border-[#242930] bg-[#16181d] flex flex-col ${className}`}>
      {/* Панель поиска */}
      {isSearchable && data.length > 0 && (
        <div className="p-2.5 border-b border-[#242930] flex items-center justify-between gap-4 bg-[#111317]/40 select-none">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-accent" />
            <input
              type="text"
              placeholder="Поиск по таблице..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1d24] border border-[#242930] focus:border-primary focus:outline-none rounded-lg px-2.5 py-1.5 pl-8 text-xs text-white placeholder-neutral-accent transition-colors"
            />
          </div>
          {searchQuery && (
            <span className="text-[10px] text-neutral-accent font-semibold">
              Найдено: {filteredAndSortedData.length}
            </span>
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
        className={`w-full overflow-x-auto min-h-[160px] transition-all duration-300 select-none ${
          isMouseDown ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <table className="w-full text-left font-sans text-xs sm:text-sm border-collapse min-w-[600px]">
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

                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col)}
                    className={`py-2 px-3 text-xs uppercase tracking-wider font-bold transition-colors select-none group ${
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
            {paginatedData.length === 0 ? (
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
              paginatedData.map((item) => (
                <motion.tr
                  layout
                  key={keyExtractor(item)}
                  transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                  className="text-gray-300 hover:text-white hover:bg-[#242930]/30 transition-colors"
                >
                  {columns.map((col) => {
                    const alignClass = 
                      col.align === 'right' 
                        ? 'text-right' 
                        : col.align === 'center' 
                        ? 'text-center' 
                        : 'text-left';
                    return (
                      <td
                        key={col.key}
                        className={`py-2.5 px-3 align-middle ${alignClass} ${col.className || ''}`}
                      >
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </td>
                    );
                  })}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Панель пагинации */}
      {pageSize && totalPages > 1 && (
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
