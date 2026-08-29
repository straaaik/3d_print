import React, { useRef, useEffect, useState } from 'react';
import { Order, OrderStatus, SortField, SortOrder, SavedCalculation, CLIENT_CONFIG, ALL_STATUSES } from '../../types';
import { DrawerTab } from '../OrderDrawer';
import { formatMoney, getDeadlineInfo } from '../../helpers';
import { formatOrderNumber, getPaymentBadgeInfo, getStatusBadgeV2 } from './types';
import { 
  ChevronUp, 
  ChevronDown, 
  Edit2, 
  Copy, 
  Trash2, 
  ExternalLink, 
  Package, 
  Phone,
  Flame,
  MessageCircle,
  Mail,
  Send,
  ShoppingBag,
  Globe,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '@/shared/ui/Tooltip';

interface OrdersV2TableProps {
  orders: Order[];
  visibleOrders: Order[];
  visibleCount: number;
  totalOrdersCount: number;
  onLoadMore: () => void;
  onShowAll: () => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onOpenDrawer: (order: Order, tab?: DrawerTab) => void;
  onOpenEditModal: (order: Order) => void;
  onOpenAddModal: () => void;
  onUpdateStatus: (order: Order, newStatus: OrderStatus) => void;
  onToggleType: (order: Order) => void;
  onDuplicateOrder: (order: Order) => void;
  onRequestDelete: (order: Order) => void;
  searchQuery: string;
  savedCalculations?: SavedCalculation[];
  isExpanded?: boolean;

  // Контекстное меню
  contextMenu: { x: number; y: number; order: Order } | null;
  setContextMenu: (menu: { x: number; y: number; order: Order } | null) => void;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  onCopyContact: (text: string) => void;
}

// Вспомогательная функция для получения дня недели
const getDayOfWeek = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      return days[d.getDay()] || '';
    }
  } catch {
    return '';
  }
  return '';
};

export const OrdersV2Table = React.memo(function OrdersV2Table({
  orders,
  visibleOrders,
  visibleCount,
  totalOrdersCount,
  onLoadMore,
  onShowAll,
  sortField,
  sortOrder,
  onSort,
  onOpenDrawer,
  onOpenEditModal,
  onOpenAddModal,
  onUpdateStatus,
  onToggleType,
  onDuplicateOrder,
  onRequestDelete,
  searchQuery,
  savedCalculations = [],
  isExpanded = false,
  contextMenu,
  setContextMenu,
  contextMenuRef,
  onCopyContact,
}: OrdersV2TableProps) {
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  const [activeStatusMenuId, setActiveStatusMenuId] = useState<string | null>(null);

  // Sentinel для бесконечной подгрузки
  useEffect(() => {
    if (visibleCount >= orders.length) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, orders.length, onLoadMore]);

  // Закрытие выпадающего меню статуса при клике вне
  useEffect(() => {
    const handleOutside = () => setActiveStatusMenuId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const renderSortIndicator = (field: SortField) => {
    const isActive = sortField === field;
    return (
      <span className="inline-flex items-center justify-center w-3 h-3 shrink-0">
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="w-3 h-3 text-cyan-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-cyan-400" />
          )
        ) : (
          <ChevronDown className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-60 transition-opacity" />
        )}
      </span>
    );
  };

  const handleContextMenu = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      order,
    });
  };

  // Поиск наименования связанного товара
  const getLinkedProductName = (productId?: string) => {
    if (!productId) return null;
    const found = savedCalculations.find(c => c.id === productId);
    return found ? found.name : null;
  };

  // Иконка для канала связи
  const getContactIcon = (type?: string) => {
    switch (type) {
      case 'phone':
        return Phone;
      case 'telegram':
        return Send;
      case 'whatsapp':
        return MessageCircle;
      case 'email':
        return Mail;
      default:
        return Phone;
    }
  };

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden flex flex-col font-sans select-none bg-neutral-950/40">
      
      {/* ОСНОВНОЕ ТЕЛО ТАБЛИЦЫ */}
      <div className="overflow-x-auto w-full custom-scrollbar">
        {isExpanded ? (
          /* ========================================================================= */
          /* РАЗВЁРНУТЫЙ РЕЖИМ (15 ОТДЕЛЬНЫХ СТОЛБЦОВ С МАКСИМАЛЬНОЙ ДЕТАЛИЗАЦИЕЙ)       */
          /* ========================================================================= */
          <table className="w-full text-left text-xs border-collapse min-w-[1680px]">
            <thead>
              <tr className="bg-neutral-900/95 border-b border-white/10 text-neutral-400 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider sticky top-0 z-20">
                {/* 1. № ЗАКАЗА */}
                <th 
                  onClick={() => onSort('order_number')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-32 sticky left-0 bg-neutral-900 z-30 shadow-[2px_0_8px_rgba(0,0,0,0.4)] border-r border-white/10"
                >
                  <div className="flex items-center gap-1">
                    <span>№ ЗАКАЗА</span>
                    {renderSortIndicator('order_number')}
                  </div>
                </th>

                {/* 2. ДАТА */}
                <th 
                  onClick={() => onSort('date')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-24"
                >
                  <div className="flex items-center gap-1">
                    <span>ДАТА</span>
                    {renderSortIndicator('date')}
                  </div>
                </th>

                {/* 3. ТИП */}
                <th 
                  onClick={() => onSort('type')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-center w-24"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ТИП</span>
                    {renderSortIndicator('type')}
                  </div>
                </th>

                {/* 4. КЛИЕНТ */}
                <th 
                  onClick={() => onSort('client')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-32"
                >
                  <div className="flex items-center gap-1">
                    <span>КЛИЕНТ</span>
                    {renderSortIndicator('client')}
                  </div>
                </th>

                {/* 5. КОНТАКТЫ */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 w-44">
                  <span>КОНТАКТЫ</span>
                </th>

                {/* 6. ИЗДЕЛИЕ / ТОВАР */}
                <th 
                  onClick={() => onSort('title')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-56"
                >
                  <div className="flex items-center gap-1">
                    <span>ИЗДЕЛИЕ / ТОВАР</span>
                    {renderSortIndicator('title')}
                  </div>
                </th>

                {/* 7. ЗАМЕТКИ */}
                <th className="py-2.5 px-3 font-semibold text-neutral-400 w-48">
                  <span>ЗАМЕТКИ</span>
                </th>

                {/* 8. ИТОГО */}
                <th 
                  onClick={() => onSort('amount')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-32"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ИТОГО</span>
                    {renderSortIndicator('amount')}
                  </div>
                </th>

                {/* 9. СЕБЕСТОИМОСТЬ */}
                <th 
                  onClick={() => onSort('cost')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>СЕБЕСТОИМОСТЬ</span>
                    {renderSortIndicator('cost')}
                  </div>
                </th>

                {/* 10. СТАТУС */}
                <th 
                  onClick={() => onSort('status')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-32"
                >
                  <div className="flex items-center gap-1">
                    <span>СТАТУС</span>
                    {renderSortIndicator('status')}
                  </div>
                </th>

                {/* 11. ДЕДЛАЙН */}
                <th 
                  onClick={() => onSort('deadline')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-28"
                >
                  <div className="flex items-center gap-1">
                    <span>ДЕДЛАЙН</span>
                    {renderSortIndicator('deadline')}
                  </div>
                </th>

                {/* 12. ОПЛАЧЕНО */}
                <th 
                  onClick={() => onSort('payment')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-32"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ОПЛАЧЕНО</span>
                    {renderSortIndicator('payment')}
                  </div>
                </th>

                {/* 13. ОСТАТОК (ДОЛГ) */}
                <th 
                  onClick={() => onSort('debt')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ОСТАТОК (ДОЛГ)</span>
                    {renderSortIndicator('debt')}
                  </div>
                </th>

                {/* 14. ЧИСТАЯ ПРИБЫЛЬ */}
                <th 
                  onClick={() => onSort('net_profit')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ПРИБЫЛЬ / МАРЖА</span>
                    {renderSortIndicator('net_profit')}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {visibleOrders.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-neutral-500 font-mono">
                    <div className="max-w-xs mx-auto space-y-1.5">
                      <Package className="w-6 h-6 mx-auto text-neutral-600 opacity-50" />
                      <p className="font-bold text-neutral-400 text-xs">§ Заказов не найдено</p>
                      <p className="text-[11px] text-neutral-600">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте новый заказ с помощью кнопки на панели'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleOrders.map((order, idx) => {
                  const statusInfo = getStatusBadgeV2(order.status || 'В РАБОТЕ');
                  const deadline = getDeadlineInfo(order.deadline, order.status);
                  const formattedNumber = formatOrderNumber(order, idx);
                  const isStatusMenuOpen = activeStatusMenuId === order.id;
                  const linkedProduct = getLinkedProductName(order.product_id);

                  // Финансовые расчеты
                  const isIncome = order.type === 'income';
                  const netProfit = isIncome ? (order.amount || 0) - (order.cost || 0) : -(order.amount || 0);
                  const marginPercent = isIncome && (order.amount || 0) > 0 ? ((netProfit / order.amount) * 100) : 0;
                  const markupPercent = isIncome && (order.cost || 0) > 0 ? ((netProfit / order.cost) * 100) : 0;
                  const debtAmount = isIncome ? Math.max(0, (order.amount || 0) - (order.payment || 0)) : 0;
                  const paidAmount = order.payment || 0;
                  const totalAmount = order.amount || 0;
                  const paidPercent = totalAmount > 0 ? Math.min(100, Math.max(0, (paidAmount / totalAmount) * 100)) : (paidAmount > 0 ? 100 : 0);
                  const quantity = order.quantity || 1;
                  const unitPrice = quantity > 0 ? (order.amount || 0) / quantity : (order.amount || 0);
                  const unitCost = quantity > 0 ? (order.cost || 0) / quantity : (order.cost || 0);
                  const unitProfit = quantity > 0 ? netProfit / quantity : netProfit;
                  const dayOfWeek = getDayOfWeek(order.date);

                  // Связанный расчёт калькулятора
                  const matchedCalc = savedCalculations?.find(
                    c => c.name === order.title
                  );

                  // Контакты
                  const allContacts = order.contacts && order.contacts.length > 0 
                    ? order.contacts 
                    : (order.contact ? [{ type: 'phone' as const, value: order.contact }] : []);

                  // Клиент инфо
                  const clientCfg = CLIENT_CONFIG[order.client] || CLIENT_CONFIG['Другое'];
                  const ClientIcon = clientCfg?.icon || Globe;

                  return (
                    <tr
                      key={order.id}
                      onContextMenu={(e) => handleContextMenu(e, order)}
                      onClick={() => onOpenDrawer(order)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group relative"
                    >
                      {/* 1. № ЗАКАЗА (ЗАКРЕПЛЕНО СЛЕВА) */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-neutral-300 group-hover:text-cyan-300 sticky left-0 bg-neutral-950/95 z-10 shadow-[2px_0_8px_rgba(0,0,0,0.4)] border-r border-white/10">
                        <div className="flex flex-col gap-1 leading-tight">
                          <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[11px] font-mono w-fit group-hover:text-cyan-300 font-bold">
                            {formattedNumber}
                          </span>
                          {linkedProduct && (
                            <Tooltip content={`Товар каталога: ${linkedProduct}`}>
                              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-800/40 px-1 py-0.2 rounded w-fit truncate max-w-[110px] flex items-center gap-1">
                                <Package className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{linkedProduct}</span>
                              </span>
                            </Tooltip>
                          )}
                          {Boolean(order.urgency_percent || order.urgency_amount) && (
                            <span className="text-[8.5px] font-mono text-rose-400 bg-rose-950/50 border border-rose-800/40 px-1 py-0.2 rounded w-fit flex items-center gap-0.5 font-bold">
                              <Flame className="w-2.5 h-2.5 shrink-0" />
                              <span>СРОЧНО</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. ДАТА И ДЕНЬ НЕДЕЛИ */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs">
                        <div className="flex flex-col gap-0.5 leading-tight">
                          <span className="text-neutral-200 font-medium">{order.date || '—'}</span>
                          {dayOfWeek && (
                            <span className="text-[9px] font-mono text-neutral-500 font-semibold uppercase">
                              {dayOfWeek}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. ТИП И СТАТУС ОПЛАТЫ */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            isIncome 
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          }`}>
                            {isIncome ? 'Доход' : 'Расход'}
                          </span>
                          {isIncome && (
                            <span className={`text-[8.5px] font-mono font-semibold px-1 py-0.2 rounded border ${
                              paidPercent >= 100
                                ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30'
                                : paidPercent > 0
                                ? 'text-amber-400 bg-amber-950/40 border-amber-800/30'
                                : 'text-neutral-500 bg-white/5 border-white/10'
                            }`}>
                              {paidPercent >= 100 ? '100% Оплачен' : paidPercent > 0 ? `Аванс ${paidPercent.toFixed(0)}%` : 'Без оплаты'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. КЛИЕНТ И КАНАЛ */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 leading-tight">
                          <span className="font-semibold text-white text-xs truncate max-w-[130px]" title={order.client}>
                            {order.client || 'Частный заказчик'}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border flex items-center gap-1 w-fit ${clientCfg?.badgeStyle || 'bg-white/5 border-white/10 text-neutral-300'}`}>
                              <ClientIcon className="w-2.5 h-2.5 shrink-0" />
                              <span>{order.client || 'Источник'}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 5. КОНТАКТЫ (ВСЕ КАНАЛЫ С КОПИРОВАНИЕМ В 1 КЛИК) */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1 max-w-[190px]">
                          {allContacts.length > 0 ? (
                            allContacts.map((c, cIdx) => {
                              const CIcon = getContactIcon(c.type);
                              return (
                                <div
                                  key={cIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCopyContact(c.value);
                                  }}
                                  className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-300 hover:text-cyan-300 transition-colors cursor-pointer group/contact truncate bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 px-1.5 py-0.5 rounded"
                                  title={`Клик для копирования контакта: ${c.value}`}
                                >
                                  <CIcon className="w-3 h-3 text-neutral-400 group-hover/contact:text-cyan-300 shrink-0" />
                                  <span className="truncate">{c.value}</span>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-[11px] font-mono text-neutral-600">—</span>
                          )}
                        </div>
                      </td>

                      {/* 6. ИЗДЕЛИЕ / ПАРАМЕТРЫ ПЕЧАТИ */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1 max-w-[240px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-100 text-xs truncate" title={order.title}>
                              {order.title || 'Печать 3D-детали'}
                            </span>
                            <span className="text-[10px] font-mono bg-white/10 text-neutral-200 px-1.5 py-0.2 rounded border border-white/15 shrink-0 font-bold">
                              ×{quantity}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-neutral-400">
                            {quantity > 1 && (
                              <span className="text-neutral-300 font-semibold">
                                {formatMoney(unitPrice)}/шт
                              </span>
                            )}
                            {matchedCalc && (
                              <span className="text-[9px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1 py-0.2 rounded truncate max-w-[120px]" title="Параметры из калькулятора">
                                {matchedCalc.filament_name || 'Калькулятор'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 7. ЗАМЕТКИ (ПОЛНЫЙ ТЕКСТ БЕЗ ОБРЕЗКИ) */}
                      <td className="py-2.5 px-3 font-sans text-neutral-400">
                        {order.notes ? (
                          <div 
                            className="bg-white/[0.02] border border-white/10 rounded-lg p-1.5 text-[11px] max-w-[220px] leading-snug text-neutral-200 whitespace-pre-wrap select-text cursor-text"
                            onClick={(e) => e.stopPropagation()}
                            title={order.notes}
                          >
                            {order.notes}
                          </div>
                        ) : (
                          <span className="text-neutral-600 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* 8. ИТОГО (ВЫРУЧКА) */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          <div className="flex items-center gap-1.5 justify-end">
                            {Boolean((order.base_amount && order.base_amount !== order.amount) || order.discount_percent || order.urgency_percent) && (
                              <span className="text-[10px] text-neutral-500 line-through">
                                {order.base_amount ? formatMoney(order.base_amount) : ''}
                              </span>
                            )}
                            <span className="font-bold text-white text-sm">
                              {formatMoney(order.amount || 0)}
                            </span>
                          </div>

                          {quantity > 1 && (
                            <span className="text-[9px] text-neutral-400">
                              {formatMoney(unitPrice)}/шт
                            </span>
                          )}

                          {/* Модификаторы */}
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            {Boolean(order.discount_percent || order.discount_amount) && (
                              <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                {order.discount_percent ? `-${order.discount_percent}%` : `-${formatMoney(order.discount_amount)}`}
                              </span>
                            )}
                            {Boolean(order.urgency_percent || order.urgency_amount) && (
                              <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" />
                                <span>{order.urgency_percent ? `+${order.urgency_percent}%` : `+${formatMoney(order.urgency_amount)}`}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 9. СЕБЕСТОИМОСТЬ И СТАТЬИ */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          <span className="font-bold text-neutral-200 text-xs">
                            {order.cost ? formatMoney(order.cost) : '0 ₽'}
                          </span>
                          {quantity > 1 && order.cost ? (
                            <span className="text-[10px] text-neutral-400">
                              {formatMoney(unitCost)}/шт
                            </span>
                          ) : null}

                          {/* Детализация статей затрат */}
                          {order.cost_items && order.cost_items.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1 mt-1 justify-end max-w-[160px]">
                              {order.cost_items.map((ci, ciIdx) => (
                                <span key={ciIdx} className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-white/5 border border-white/10 text-neutral-300">
                                  {ci.category}: {formatMoney(ci.amount)}
                                </span>
                              ))}
                            </div>
                          ) : (order.cost && order.amount) ? (
                            <span className="text-[9px] text-neutral-500">
                              {((order.cost / order.amount) * 100).toFixed(0)}% от цены
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* 10. СТАТУС */}
                      <td 
                        className="py-2.5 px-3 whitespace-nowrap relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStatusMenuId(isStatusMenuOpen ? null : order.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer shadow-sm ${statusInfo.badgeClass}`}
                        >
                          {statusInfo.label}
                        </button>

                        {/* Меню быстрой смены статуса */}
                        <AnimatePresence>
                          {isStatusMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              className="absolute left-3 top-9 z-50 w-44 bg-neutral-950 border border-white/15 rounded-xl shadow-2xl p-1.5 space-y-1 font-mono text-xs backdrop-blur-2xl"
                            >
                              {ALL_STATUSES.map((st) => {
                                const stCfg = getStatusBadgeV2(st);
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateStatus(order, st);
                                      setActiveStatusMenuId(null);
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-white/10 transition-colors ${
                                      order.status === st ? 'bg-white/15 text-white font-bold' : 'text-neutral-300'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dotClass}`} />
                                    <span>{st}</span>
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>

                      {/* 11. ДЕДЛАЙН */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-neutral-300">
                        <div className="flex flex-col gap-0.5 font-mono leading-tight">
                          <span className="text-[11px] text-neutral-200 font-semibold">{order.deadline || '—'}</span>
                          {deadline && (
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border w-fit ${deadline.badgeStyle}`}>
                              {deadline.label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 12. ОПЛАЧЕНО И ТРАНЗАКЦИИ */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          <span className="text-emerald-400 font-bold font-mono text-sm">
                            {formatMoney(paidAmount)}
                          </span>
                          
                          {/* История транзакций платежей */}
                          {order.payments && order.payments.length > 0 ? (
                            <div className="flex flex-col items-end gap-0.5 mt-0.5">
                              {order.payments.map((p, pIdx) => (
                                <span key={pIdx} className="text-[8.5px] text-neutral-400 font-mono">
                                  #{pIdx + 1}: {formatMoney(p)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[9px] text-neutral-500 font-mono">1 транзакция</span>
                          )}
                        </div>
                      </td>

                      {/* 13. ОСТАТОК (ДОЛГ) */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                        {debtAmount <= 0 ? (
                          <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                            Оплачено 100%
                          </span>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <span className="text-amber-400 font-bold font-mono text-xs">
                              {formatMoney(debtAmount)}
                            </span>
                            <Tooltip content={`Оплачено: ${paidPercent.toFixed(0)}% (${formatMoney(paidAmount)} из ${formatMoney(totalAmount)})`}>
                              <div className="flex items-center gap-1.5 w-[90px] mt-0.5">
                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      paidPercent >= 35
                                        ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]'
                                        : paidPercent > 0
                                          ? 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)]'
                                          : 'bg-transparent'
                                    }`}
                                    style={{ width: `${paidPercent}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-mono text-neutral-400 font-semibold shrink-0">
                                  {paidPercent.toFixed(0)}%
                                </span>
                              </div>
                            </Tooltip>
                          </div>
                        )}
                      </td>

                      {/* 14. ЧИСТАЯ ПРИБЫЛЬ И МАРЖА */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-xs">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          <span className={`font-bold font-mono text-sm ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {netProfit >= 0 ? `+${formatMoney(netProfit)}` : formatMoney(netProfit)}
                          </span>

                          {quantity > 1 && isIncome && (
                            <span className="text-[9px] text-emerald-400/80">
                              +{formatMoney(unitProfit)}/шт
                            </span>
                          )}

                          {isIncome && (order.amount || 0) > 0 ? (
                            <div className="flex items-center gap-1 text-[10px] text-neutral-400 justify-end mt-0.5">
                              <span className="text-emerald-400 font-medium">{marginPercent.toFixed(0)}% маржа</span>
                              {markupPercent > 0 && (
                                <span className="text-neutral-500">• {markupPercent.toFixed(0)}% нац.</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-600 font-mono">—</span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}

              {/* Sentinel для подгрузки */}
              {visibleCount < orders.length && (
                <tr ref={sentinelRef}>
                  <td colSpan={14} className="py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-neutral-400 font-mono animate-pulse">
                        Загрузка записей...
                      </span>
                      <button
                        type="button"
                        onClick={onShowAll}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 rounded-lg text-xs font-mono transition-colors"
                      >
                        Показать все ({orders.length})
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* ========================================================================= */
          /* КОМПАКТНЫЙ РЕЖИМ (9 СДВОЕННЫХ СТОЛБЦОВ — ТЕКУЩИЙ СТАНДАРТ)                */
          /* ========================================================================= */
          <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-neutral-900/90 border-b border-white/10 text-neutral-400 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider">
                {/* 1. № ЗАКАЗА И ДАТА */}
                <th 
                  onClick={() => onSort('order_number')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-28 sticky left-0 bg-neutral-900/95 z-10"
                >
                  <div className="flex items-center gap-1">
                    <span>№ / ДАТА</span>
                    {renderSortIndicator('order_number')}
                  </div>
                </th>

                {/* 2. ТИП */}
                <th 
                  onClick={() => onSort('type')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-center w-20"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ТИП</span>
                    {renderSortIndicator('type')}
                  </div>
                </th>

                {/* 3. КЛИЕНТ / КОНТАКТ */}
                <th 
                  onClick={() => onSort('client')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-40"
                >
                  <div className="flex items-center gap-1">
                    <span>КЛИЕНТ / КОНТАКТ</span>
                    {renderSortIndicator('client')}
                  </div>
                </th>

                {/* 4. ИЗДЕЛИЕ / ЗАМЕТКИ */}
                <th 
                  onClick={() => onSort('title')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-56"
                >
                  <div className="flex items-center gap-1">
                    <span>ИЗДЕЛИЕ / ЗАМЕТКИ</span>
                    {renderSortIndicator('title')}
                  </div>
                </th>

                {/* 7. ИТОГО / СЕБЕСТОИМОСТЬ */}
                <th 
                  onClick={() => onSort('amount')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ИТОГО / СЕБЕСТ.</span>
                    {renderSortIndicator('amount')}
                  </div>
                </th>

                {/* 5. СТАТУС */}
                <th 
                  onClick={() => onSort('status')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-32"
                >
                  <div className="flex items-center gap-1">
                    <span>СТАТУС</span>
                    {renderSortIndicator('status')}
                  </div>
                </th>

                {/* 6. ДЕДЛАЙН */}
                <th 
                  onClick={() => onSort('deadline')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group w-24"
                >
                  <div className="flex items-center gap-1">
                    <span>ДЕДЛАЙН</span>
                    {renderSortIndicator('deadline')}
                  </div>
                </th>

                {/* 8. ОПЛАТА / ОСТАТОК */}
                <th 
                  onClick={() => onSort('payment')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-36"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ОПЛАТА / ОСТАТОК</span>
                    {renderSortIndicator('payment')}
                  </div>
                </th>

                {/* 9. ЧИСТАЯ ПРИБЫЛЬ */}
                <th 
                  onClick={() => onSort('net_profit')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white transition-colors group text-right w-28"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>ПРИБЫЛЬ</span>
                    {renderSortIndicator('net_profit')}
                  </div>
                </th>
              </tr>
            </thead>

            {/* Строки заказов */}
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {visibleOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-neutral-500 font-mono">
                    <div className="max-w-xs mx-auto space-y-1.5">
                      <Package className="w-6 h-6 mx-auto text-neutral-600 opacity-50" />
                      <p className="font-bold text-neutral-400 text-xs">§ Заказов не найдено</p>
                      <p className="text-[11px] text-neutral-600">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте новый заказ с помощью кнопки выше'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleOrders.map((order, idx) => {
                  const statusInfo = getStatusBadgeV2(order.status || 'В РАБОТЕ');
                  const deadline = getDeadlineInfo(order.deadline, order.status);
                  const formattedNumber = formatOrderNumber(order, idx);
                  const isStatusMenuOpen = activeStatusMenuId === order.id;

                  // Расчетные величины
                  const isIncome = order.type === 'income';
                  const netProfit = isIncome ? (order.amount || 0) - (order.cost || 0) : -(order.amount || 0);
                  const marginPercent = isIncome && (order.amount || 0) > 0 ? ((netProfit / order.amount) * 100) : 0;
                  const debtAmount = isIncome ? Math.max(0, (order.amount || 0) - (order.payment || 0)) : 0;
                  const paidAmount = order.payment || 0;
                  const totalAmount = order.amount || 0;
                  const paidPercent = totalAmount > 0 ? Math.min(100, Math.max(0, (paidAmount / totalAmount) * 100)) : (paidAmount > 0 ? 100 : 0);

                  return (
                    <tr
                      key={order.id}
                      onContextMenu={(e) => handleContextMenu(e, order)}
                      onClick={() => onOpenDrawer(order)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group relative"
                    >
                      {/* 1. № ЗАКАЗА И ДАТА */}
                      <td className="py-2 px-3 whitespace-nowrap font-bold text-neutral-300 group-hover:text-cyan-300 sticky left-0 bg-neutral-950/90 z-10">
                        <div className="flex flex-col gap-0.5 leading-tight">
                          <span className="bg-white/5 border border-white/10 px-1.5 py-0.2 rounded text-[11px] font-mono w-fit group-hover:text-cyan-300">
                            {formattedNumber}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono pl-0.5">
                            {order.date || '—'}
                          </span>
                        </div>
                      </td>

                      {/* 2. ТИП */}
                      <td className="py-2 px-3 whitespace-nowrap text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          isIncome 
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}>
                          {isIncome ? 'Доход' : 'Расход'}
                        </span>
                      </td>

                      {/* 3. КЛИЕНТ И КОНТАКТ */}
                      <td className="py-2 px-3 font-sans font-medium text-white whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 leading-tight">
                          <span className="font-semibold text-neutral-200 text-xs truncate max-w-[160px]">
                            {order.client || 'Частный заказчик'}
                          </span>
                          {order.contact ? (
                            <Tooltip content="Скопировать контакт">
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCopyContact(order.contact);
                                }}
                                className="text-[10px] font-mono text-neutral-400 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1 w-fit"
                              >
                                <Phone className="w-2.5 h-2.5 text-neutral-500 hover:text-cyan-300" />
                                <span>{order.contact}</span>
                              </span>
                            </Tooltip>
                          ) : (
                            <span className="text-[10px] font-mono text-neutral-600">—</span>
                          )}
                        </div>
                      </td>

                      {/* 4. НАИМЕНОВАНИЕ, КОЛИЧЕСТВО И ЗАМЕТКИ */}
                      <td className="py-2 px-3 font-sans text-neutral-200">
                        <div className="flex flex-col gap-0.5 max-w-[240px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-neutral-200 text-xs truncate">
                              {order.title || 'Печать 3D-детали'}
                            </span>
                            <span className="text-[10px] font-mono bg-white/5 text-neutral-300 px-1.5 py-0.2 rounded border border-white/10 shrink-0">
                              ×{order.quantity || 1}
                            </span>
                          </div>
                          {order.notes ? (
                            <span className="text-[10px] text-neutral-400 font-sans truncate block leading-tight">
                              {order.notes}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* 7. ИТОГО И СЕБЕСТОИМОСТЬ (С МОДИФИКАТОРАМИ) */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          <div className="flex items-center gap-1.5 justify-end">
                            {Boolean((order.base_amount && order.base_amount !== order.amount) || order.discount_percent || order.urgency_percent) && (
                              <span className="text-[10px] text-neutral-500 line-through">
                                {order.base_amount ? formatMoney(order.base_amount) : ''}
                              </span>
                            )}
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {formatMoney(order.amount || 0)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 justify-end">
                            {Boolean(order.discount_percent || order.discount_amount) && (
                              <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                {order.discount_percent ? `-${order.discount_percent}%` : `-${formatMoney(order.discount_amount)}`}
                              </span>
                            )}
                            {Boolean(order.urgency_percent || order.urgency_amount) && (
                              <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" />
                                <span>{order.urgency_percent ? `+${order.urgency_percent}%` : `+${formatMoney(order.urgency_amount)}`}</span>
                              </span>
                            )}
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {order.cost ? `себест. ${formatMoney(order.cost)}` : '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 5. СТАТУС */}
                      <td 
                        className="py-2 px-3 whitespace-nowrap relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStatusMenuId(isStatusMenuOpen ? null : order.id);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${statusInfo.badgeClass}`}
                        >
                          {statusInfo.label}
                        </button>

                        <AnimatePresence>
                          {isStatusMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              className="absolute left-3 top-8 z-50 w-44 bg-neutral-950 border border-white/15 rounded-xl shadow-2xl p-1.5 space-y-1 font-mono text-xs backdrop-blur-2xl"
                            >
                              {ALL_STATUSES.map((st) => {
                                const stCfg = getStatusBadgeV2(st);
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateStatus(order, st);
                                      setActiveStatusMenuId(null);
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-white/10 transition-colors ${
                                      order.status === st ? 'bg-white/15 text-white font-bold' : 'text-neutral-300'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dotClass}`} />
                                    <span>{st}</span>
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>

                      {/* 6. ДЕДЛАЙН */}
                      <td className="py-2 px-3 whitespace-nowrap text-neutral-300">
                        <div className="flex flex-col gap-0.5 font-mono leading-tight">
                          <span className="text-[11px] text-neutral-200">{order.deadline || '—'}</span>
                          {deadline && (
                            <span className={`px-1 py-0.2 rounded text-[9px] font-mono border w-fit ${deadline.badgeStyle}`}>
                              {deadline.label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. ОПЛАТА И ОСТАТОК */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs w-36">
                        {paidPercent >= 100 ? (
                          <div className="flex items-center justify-end w-full">
                            <span className="text-emerald-400 font-bold font-mono text-xs sm:text-sm">
                              {formatMoney(paidAmount)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5 leading-tight">
                            <span className="text-emerald-400 font-bold font-mono text-xs sm:text-sm">
                              {formatMoney(paidAmount)}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              долг. {formatMoney(debtAmount)}
                            </span>
                            <Tooltip content={`Оплачено: ${paidPercent.toFixed(0)}% (${formatMoney(paidAmount)} из ${formatMoney(totalAmount)})`}>
                              <div className="flex items-center gap-1.5 w-[85px] mt-0.5">
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      paidPercent >= 35
                                        ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]'
                                        : paidPercent > 0
                                          ? 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)]'
                                          : 'bg-transparent'
                                    }`}
                                    style={{ width: `${paidPercent}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-mono text-neutral-500 font-semibold shrink-0">
                                  {paidPercent.toFixed(0)}%
                                </span>
                              </div>
                            </Tooltip>
                          </div>
                        )}
                      </td>

                      {/* 9. ЧИСТАЯ ПРИБЫЛЬ */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-xs w-28">
                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                          <span className={`font-bold font-mono text-xs sm:text-sm ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {netProfit >= 0 ? `+${formatMoney(netProfit)}` : formatMoney(netProfit)}
                          </span>
                          {isIncome && (order.amount || 0) > 0 ? (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {marginPercent.toFixed(0)}% маржа
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-600 font-mono">—</span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}

              {/* Sentinel для подгрузки */}
              {visibleCount < orders.length && (
                <tr ref={sentinelRef}>
                  <td colSpan={9} className="py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-neutral-400 font-mono animate-pulse">
                        Загрузка записей...
                      </span>
                      <button
                        type="button"
                        onClick={onShowAll}
                        className="px-2.5 py-0.5 bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 rounded text-xs font-mono transition-colors"
                      >
                        Показать все ({orders.length})
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* КОНТЕКСТНОЕ МЕНЮ (ПКМ) */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 w-48 bg-neutral-950 border border-white/15 rounded-xl shadow-2xl p-1.5 space-y-1 font-mono text-xs backdrop-blur-2xl"
          >
            <div className="px-2 py-1 border-b border-white/10 text-[10px] text-neutral-400 truncate">
              {formatOrderNumber(contextMenu.order)} • {contextMenu.order.title || 'Заказ'}
            </div>

            <button
              type="button"
              onClick={() => {
                onOpenDrawer(contextMenu.order);
                setContextMenu(null);
              }}
              className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Карточка</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenEditModal(contextMenu.order);
                setContextMenu(null);
              }}
              className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Редактировать</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDuplicateOrder(contextMenu.order);
                setContextMenu(null);
              }}
              className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Дублировать</span>
            </button>

            {contextMenu.order.contact && (
              <button
                type="button"
                onClick={() => {
                  onCopyContact(contextMenu.order.contact);
                  setContextMenu(null);
                }}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-sky-400" />
                <span>Копировать контакт</span>
              </button>
            )}

            <div className="border-t border-white/10 my-0.5" />

            <button
              type="button"
              onClick={() => {
                onRequestDelete(contextMenu.order);
                setContextMenu(null);
              }}
              className="w-full text-left px-2 py-1 rounded flex items-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
});

