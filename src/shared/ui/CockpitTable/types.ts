import React from 'react';
import { LucideIcon } from 'lucide-react';

export type CockpitTableAlign = 'left' | 'center' | 'right';

export interface CockpitTableColumn<T> {
  /** Уникальный идентификатор колонки */
  id: string;

  /** Заголовок колонки (текст или ReactNode) */
  header: React.ReactNode;

  /** Ключ поля объекта или функция-геттер */
  accessor?: keyof T | ((item: T) => unknown);

  /** Кастомная функция рендера ячейки */
  render?: (item: T, index: number) => React.ReactNode;

  /** Выравнивание текста */
  align?: CockpitTableAlign;

  /** Ширина колонки (например: '120px', '25%', 'w-32') */
  width?: string;

  /** Минимальная ширина колонки */
  minWidth?: string;

  /** Разрешена ли сортировка по этой колонке */
  sortable?: boolean;

  /** Ключ для внешней сортировки */
  sortKey?: string;

  /** Функция для вычисления значения при внутренней сортировке */
  sortValue?: (item: T) => string | number | boolean | Date;

  /** Дополнительные CSS классы для th */
  headerClassName?: string;

  /** Дополнительные CSS классы для td */
  cellClassName?: string | ((item: T) => string);

  /** Скрывать колонку на мобильных экранах */
  hideOnMobile?: boolean;
}

export type CockpitStatusTone =
  | 'yellow'
  | 'amber'
  | 'cyan'
  | 'emerald'
  | 'green'
  | 'rose'
  | 'red'
  | 'purple'
  | 'neutral'
  | 'blue';

export interface CockpitStatusPillProps {
  label: string;
  tone?: CockpitStatusTone;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  pulse?: boolean;
  dot?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export interface CockpitTableProps<T> {
  /** Массив определений колонок */
  columns: CockpitTableColumn<T>[];

  /** Массив данных таблицы */
  data: T[];

  /** Функция извлечения уникального ID строки */
  keyExtractor: (item: T, index: number) => string;

  /** Заголовок реестра (например: '3D-LABS // CATALOG_REGISTRY') */
  title?: string;

  /** Иконка в заголовке */
  icon?: LucideIcon;

  /** Индикатор статуса справа от заголовка (например, Supabase Cloud / Online) */
  statusBadge?: React.ReactNode;

  /** Кнопки быстрых действий в верхнем тулбаре */
  actions?: React.ReactNode;

  /** Отображать ли 3 аппаратных светодиода (rose/yellow/emerald) */
  showLeds?: boolean;

  /** Включение чекбоксов выбора строк */
  selectable?: boolean;

  /** Выбранные ID строк */
  selectedIds?: string[];

  /** Обработчик клика по чекбоксу строки */
  onToggleSelect?: (id: string, item: T) => void;

  /** Обработчик клика по мастер-чекбоксу */
  onToggleSelectAll?: () => void;

  /** Внешняя сортировка: текущее поле */
  sortField?: string;

  /** Внешняя сортировка: направление ('asc' | 'desc') */
  sortOrder?: 'asc' | 'desc';

  /** Обработчик клика по заголовку сортировки */
  onSort?: (field: string) => void;

  /** Встроенный поиск в таблице */
  isSearchable?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;

  /** Слот для дополнительных фильтров */
  filterSlot?: React.ReactNode;

  /** Панель групповых операций над выбранными строками */
  batchActionsSlot?: React.ReactNode;

  /** Обработчики кликов по строке */
  onRowClick?: (item: T, index: number) => void;
  onRowDoubleClick?: (item: T, index: number) => void;
  onRowContextMenu?: (e: React.MouseEvent, item: T, index: number) => void;

  /** Кастомные классы для строки */
  rowClassName?: string | ((item: T, index: number) => string);

  /** Раскрывающиеся строки (аккордеон/суб-таблицы) */
  isRowExpanded?: (item: T) => boolean;
  renderSubRow?: (item: T, index: number) => React.ReactNode;

  /** Кастомный рендер строки (если требуется полностью переопределить tr) */
  renderCustomRow?: (item: T, index: number, defaultCells: React.ReactNode) => React.ReactNode;

  /** Кастомное пустое состояние */
  emptyState?: React.ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;

  /** Состояние загрузки */
  isLoading?: boolean;

  /** Нижняя строка телеметрии / статус-бар */
  footer?: React.ReactNode;
  showDefaultFooter?: boolean;

  /** Вариант оформления */
  variant?: 'cockpit' | 'card' | 'embedded' | 'transparent';

  /** Дополнительные CSS классы контейнера */
  className?: string;

  /** Ключ для персистентного сохранения внутреннего поиска и сортировки в localStorage */
  storageKey?: string;
}
