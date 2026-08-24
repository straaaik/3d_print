import React, { useRef, useEffect } from 'react';
import { Order, OrderStatus, SortField, SortOrder } from '../types';
import { OrderRow } from './OrderRow';
import { DrawerTab } from './OrderDrawer';
import { 
  ChevronUp, 
  ChevronDown, 
  ShoppingBag, 
  Plus, 
  Edit2, 
  Copy, 
  Trash2, 
  CreditCard, 
  PhoneCall, 
  Share2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrdersTableModernProps {
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

  // Контекстное меню
  contextMenu: { x: number; y: number; order: Order } | null;
  setContextMenu: (menu: { x: number; y: number; order: Order } | null) => void;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  onCopyContact: (text: string) => void;
}

export const OrdersTableModern = React.memo(function OrdersTableModern({
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
  contextMenu,
  setContextMenu,
  contextMenuRef,
  onCopyContact,
}: OrdersTableModernProps) {
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);

  // Sentinel для автоматической подгрузки при прокрутке
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

  const renderSortIndicator = (field: SortField) => {
    const isActive = sortField === field;
    return (
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 shrink-0">
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#FF8800]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#FF8800]" />
          )
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </span>
    );
  };

  const handleRowContextMenu = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 230);
    const y = Math.min(e.clientY, window.innerHeight - 250);
    setContextMenu({ x, y, order });
  };

  return (
    <div className="bg-[#16181d] border border-[#242930] rounded-2xl shadow-xl overflow-hidden relative">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs sm:text-[13px] border-collapse min-w-[950px]">
          <thead>
            <tr className="bg-[#0d0e12] border-b border-[#242930] text-gray-400 uppercase tracking-wider font-bold text-xs select-none">
              <th
                onClick={() => onSort('order_number')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors group min-w-[120px] whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>№ / Дата</span>
                  {renderSortIndicator('order_number')}
                </div>
              </th>

              <th
                onClick={() => onSort('type')}
                className="py-3 px-2 text-center cursor-pointer hover:text-white transition-colors group min-w-[85px] whitespace-nowrap"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Тип</span>
                  {renderSortIndicator('type')}
                </div>
              </th>

              <th
                onClick={() => onSort('title')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors group min-w-[180px] whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Заказ</span>
                  {renderSortIndicator('title')}
                </div>
              </th>

              <th
                onClick={() => onSort('client')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors group min-w-[140px] whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Клиент</span>
                  {renderSortIndicator('client')}
                </div>
              </th>

              <th
                onClick={() => onSort('deadline')}
                className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors group min-w-[110px] whitespace-nowrap"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Дедлайн</span>
                  {renderSortIndicator('deadline')}
                </div>
              </th>

              <th
                onClick={() => onSort('status')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors group min-w-[135px] whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Статус</span>
                  {renderSortIndicator('status')}
                </div>
              </th>

              <th
                onClick={() => onSort('amount')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group min-w-[100px] whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Сумма</span>
                  {renderSortIndicator('amount')}
                </div>
              </th>

              <th
                onClick={() => onSort('payment')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group min-w-[110px] whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Оплата</span>
                  {renderSortIndicator('payment')}
                </div>
              </th>

              <th
                onClick={() => onSort('cost')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group min-w-[90px] whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Расход</span>
                  {renderSortIndicator('cost')}
                </div>
              </th>

              <th
                onClick={() => onSort('net_profit')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group min-w-[110px] whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Прибыль</span>
                  {renderSortIndicator('net_profit')}
                </div>
              </th>

              <th className="py-3 px-2 text-center w-[40px] whitespace-nowrap">
                <span className="sr-only">Действия</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#242930]/40">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#0d0e12] border border-[#242930] flex items-center justify-center text-gray-400">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-300">
                        {searchQuery ? 'Заказы не найдены' : 'В этом списке пока нет заказов'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {searchQuery ? 'Попробуйте изменить поисковый запрос или сбросить фильтры' : 'Добавьте ваш первый заказ или выберите другой период'}
                      </p>
                    </div>
                    {!searchQuery && (
                      <button
                        type="button"
                        onClick={onOpenAddModal}
                        className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF8800] hover:from-[#FF6600] hover:to-[#FF9900] text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#FF6B00]/25 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Добавить заказ
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              visibleOrders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onOpenDrawer={onOpenDrawer}
                  onOpenEditModal={onOpenEditModal}
                  onUpdateStatus={onUpdateStatus}
                  onToggleType={onToggleType}
                  onContextMenu={handleRowContextMenu}
                  isContextMenuOpen={contextMenu?.order?.id === order.id}
                />
              ))
            )}

            {/* Невидимый маркер для Infinite Scroll */}
            {visibleCount < orders.length && (
              <tr ref={sentinelRef}>
                <td colSpan={11} className="py-3 text-center text-xs text-gray-400 bg-[#0d0e12]/40">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[#FF6B00]/30 border-t-[#FF6B00] animate-spin" />
                    <span>Подгрузка следующих заказов...</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Информационная панель Infinite Scroll */}
      {orders.length > 25 && (
        <div className="p-3 border-t border-[#242930] bg-[#111317]/80 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
          <div className="flex items-center gap-2 text-gray-400 font-medium">
            <span>
              Показано <strong className="text-white font-mono">{visibleOrders.length}</strong> из <strong className="text-white font-mono">{orders.length}</strong> заказов
            </span>
            {visibleCount >= orders.length && (
              <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> Все записи отображены
              </span>
            )}
          </div>

          {visibleCount < orders.length && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLoadMore}
                className="px-3 py-1 rounded-lg bg-[#1a1d24] border border-[#242930] hover:border-[#FF6B00] text-gray-300 hover:text-white transition-colors cursor-pointer text-xs font-medium"
              >
                +25 ещё
              </button>
              <button
                type="button"
                onClick={onShowAll}
                className="px-3 py-1 rounded-lg bg-[#FF6B00]/15 border border-[#FF6B00]/40 hover:bg-[#FF6B00]/25 text-[#FF8800] hover:text-white transition-colors cursor-pointer text-xs font-bold shadow-sm"
              >
                Показать все ({orders.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Кастомное контекстное меню по правой кнопке мыши */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className="fixed z-50 bg-[#16181d] border border-[#FF6B00]/40 rounded-2xl shadow-2xl p-1.5 min-w-[220px] select-none backdrop-blur-xl text-xs sm:text-sm"
          >
            <div className="px-3 py-1.5 text-[11px] font-bold text-[#FF8800] border-b border-[#242930] truncate flex items-center justify-between gap-2">
              <span className="truncate">{contextMenu.order.title}</span>
              <span className="text-[10px] text-[#FF8800] bg-[#FF6B00]/20 px-1.5 py-0.2 rounded font-mono">
                #ord-{contextMenu.order.order_number || contextMenu.order.id.slice(0, 4)}
              </span>
            </div>

            <div className="py-1 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  onOpenDrawer(contextMenu.order, 'all');
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
              >
                <ShoppingBag className="w-4 h-4 text-[#FF8800]" />
                <span>Открыть подробности</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenEditModal(contextMenu.order);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
              >
                <Edit2 className="w-4 h-4 text-[#FF8800]" />
                <span>Редактировать...</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDuplicateOrder(contextMenu.order);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
              >
                <Copy className="w-4 h-4 text-blue-400" />
                <span>Дублировать запись</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.order.id || `#ord-${contextMenu.order.order_number}`);
                  onCopyContact('ID заказа скопирован!');
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
              >
                <Copy className="w-4 h-4 text-amber-400" />
                <span>Скопировать ID заказа</span>
              </button>

              {(() => {
                const firstContact = contextMenu.order.contacts?.[0]?.value || contextMenu.order.contact;
                if (!firstContact) return null;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      onCopyContact(firstContact);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-[#FF6B00]/20 rounded-xl transition-colors cursor-pointer text-left font-medium"
                  >
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    <span>Скопировать контакт</span>
                  </button>
                );
              })()}

              <div className="my-1 border-t border-[#242930]" />

              <button
                type="button"
                onClick={() => {
                  onRequestDelete(contextMenu.order);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-300 hover:text-rose-200 hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer text-left font-semibold"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Удалить запись</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
