import React, { useState } from 'react';
import { 
  Order, 
  OrderStatus, 
  ContactItem 
} from '../types';
import { 
  STATUS_CONFIG, 
  CLIENT_CONFIG, 
  ALL_STATUSES 
} from '../types';
import { 
  formatMoney, 
  roundTo2, 
  getDeadlineInfo, 
  getContactHref 
} from '../helpers';
import { DrawerTab } from './OrderDrawer';
import { Select, SelectOption } from '../../../shared/ui/Select';
import { 
  Phone, 
  Send, 
  Copy, 
  Check, 
  Edit2, 
  ChevronRight, 
  Flame, 
  Tag, 
  CreditCard, 
  Receipt, 
  NotebookPen,
  MoreVertical,
  CheckCircle2,
  Clock,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const STATUS_OPTIONS: SelectOption[] = ALL_STATUSES.map((st) => {
  const cfg = STATUS_CONFIG[st];
  return {
    value: st,
    label: cfg.label,
    icon: cfg.icon,
    iconColor: cfg.color,
    badgeStyle: cfg.badgeStyle,
  };
});

interface OrderRowProps {
  order: Order;
  onOpenDrawer: (order: Order, tab?: DrawerTab) => void;
  onOpenEditModal: (order: Order) => void;
  onUpdateStatus: (order: Order, newStatus: OrderStatus) => void;
  onToggleType: (order: Order) => void;
  onContextMenu: (e: React.MouseEvent, order: Order) => void;
  isContextMenuOpen?: boolean;
}

export const OrderRow = React.memo(function OrderRow({
  order,
  onOpenDrawer,
  onOpenEditModal,
  onUpdateStatus,
  onToggleType,
  onContextMenu,
  isContextMenuOpen = false,
}: OrderRowProps) {
  const [isCopied, setIsCopied] = useState(false);

  const isIncome = order.type === 'income';
  const totalAmount = roundTo2(order.amount || 0);
  const totalPaid = roundTo2(order.payment || 0);
  const isFullyPaid = isIncome && totalPaid >= totalAmount && totalAmount > 0;
  const remainingToPay = Math.max(0, roundTo2(totalAmount - totalPaid));
  
  const costVal = roundTo2(order.cost || 0);
  const netProfit = roundTo2(isIncome ? totalAmount - costVal : -totalAmount);
  const marginPercent = isIncome && totalAmount > 0 ? (netProfit / totalAmount) * 100 : 0;

  const deadlineInfo = getDeadlineInfo(order.deadline, order.status);
  const statusCfg = STATUS_CONFIG[order.status || 'Готово'] || STATUS_CONFIG['Готово'];
  const StatusIcon = statusCfg.icon;

  const clientCfg = CLIENT_CONFIG[order.client || 'Авито'] || CLIENT_CONFIG['Авито'];
  const ClientIcon = clientCfg.icon;

  // Контакты
  const contactsList: ContactItem[] = order.contacts && order.contacts.length > 0
    ? order.contacts
    : (order.contact && order.contact.trim() !== '' ? [{ type: 'phone', value: order.contact }] : []);
  const primaryContact = contactsList[0];

  const handleCopyContact = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    if (!val) return;
    navigator.clipboard.writeText(val);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idToCopy = order.id || `#ord-${order.order_number}`;
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  return (
    <tr
      onContextMenu={(e) => onContextMenu(e, order)}
      className={`group cursor-default border-b transition-all duration-150 text-xs sm:text-[13px] select-text ${
        isContextMenuOpen
          ? 'bg-[#FF6B00]/15 border-[#FF8800]/40 border-l-4 border-l-[#FF8800]'
          : 'border-[#242930]/40 hover:bg-[#1b1e27]'
      }`}
    >
      {/* 1. Номер заказа (копирование ID) & Дата (клик открывает редактирование даты) */}
      <td 
        onClick={() => onOpenDrawer(order, 'date')}
        className="py-3 px-3 whitespace-nowrap w-[100px] cursor-pointer"
        title="Кликните для изменения даты заказа"
      >
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold text-[#FF8800] bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 border border-[#FF6B00]/30 hover:border-[#FF6B00]/50 w-fit shadow-sm cursor-pointer transition-colors"
            title={`ID: ${order.id} (Нажмите, чтобы скопировать)`}
          >
            <span>#ord-{order.order_number || order.id.slice(0, 4)}</span>
            {copiedId ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-80" />
            )}
          </button>
          <span className="text-[11px] text-gray-400 font-mono hover:text-purple-300 transition-colors">
            {order.date || '—'}
          </span>
        </div>
      </td>

      {/* 2. Колонка «Тип операции» (Доход / Расход) */}
      <td 
        onClick={() => onOpenDrawer(order, 'type')}
        className="py-3 px-2 whitespace-nowrap w-[85px] text-center cursor-pointer"
        title="Кликните для изменения типа операции"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleType(order);
          }}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold border cursor-pointer transition-transform active:scale-95 shadow-sm ${
            isIncome
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/50'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/50'
          }`}
          title="Кликните для быстрого переключения (Доход ⟷ Расход)"
        >
          {isIncome ? (
            <>
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              <span>Доход</span>
            </>
          ) : (
            <>
              <ArrowDownRight className="w-3 h-3 text-rose-400" />
              <span>Расход</span>
            </>
          )}
        </button>
      </td>

      {/* 3. Наименование изделия, количество и заметки (клик открывает редактирование заказа) */}
      <td 
        onClick={() => onOpenDrawer(order, 'order_info')}
        className="py-3 px-3 min-w-[180px] max-w-[280px] cursor-pointer"
        title="Кликните для изменения наименования, количества и заметок"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-bold text-white text-sm group-hover:text-[#FF8800] transition-colors leading-tight ${
              !isIncome ? 'text-rose-300' : ''
            }`}>
              {order.title || (isIncome ? 'Без названия' : 'Расход')}
            </span>

            {isIncome && (
              <span className="px-1.5 py-0.2 rounded bg-[#0d0e12] border border-[#242930] text-[11px] font-mono text-gray-300 font-bold">
                ×{order.quantity || 1}
              </span>
            )}
          </div>

          {order.notes && order.notes.trim() !== '' && (
            <div className="text-[11px] text-gray-400 hover:text-purple-300 truncate max-w-[240px] flex items-center gap-1 text-left transition-colors">
              <NotebookPen className="w-3 h-3 text-purple-400 shrink-0" />
              <span className="truncate">{order.notes}</span>
            </div>
          )}
        </div>
      </td>

      {/* 4. Клиент и контакт (клик открывает редактирование клиента и контактов) */}
      <td 
        onClick={() => onOpenDrawer(order, 'client')}
        className="py-3 px-3 whitespace-nowrap min-w-[140px] cursor-pointer group/client transition-colors"
        title="Кликните для изменения канала продаж и контактов клиента"
      >
        {isIncome ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className={`p-1 rounded-md ${clientCfg.badgeStyle} flex items-center justify-center shrink-0`}>
                <ClientIcon className="w-3 h-3" />
              </div>
              <span className="text-gray-200 font-semibold text-xs group-hover/client:text-sky-300 transition-colors">
                {clientCfg.label}
              </span>
            </div>

            {primaryContact ? (
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <span className="truncate max-w-[110px] font-mono">{primaryContact.value}</span>
                <button
                  type="button"
                  onClick={(e) => handleCopyContact(e, primaryContact.value)}
                  className="p-1 text-gray-400 hover:text-white rounded transition-colors"
                  title="Скопировать контакт"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-gray-500">Без контакта</span>
            )}
          </div>
        ) : (
          <span className="text-gray-600 font-mono text-xs">—</span>
        )}
      </td>

      {/* 5. Дедлайн (клик открывает редактирование срока) */}
      <td 
        onClick={() => onOpenDrawer(order, 'deadline')}
        className="py-3 px-3 whitespace-nowrap text-center min-w-[110px] cursor-pointer"
        title="Кликните для изменения срока сдачи (дедлайна)"
      >
        {isIncome && order.deadline ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono text-xs text-gray-300 hover:text-amber-300 transition-colors">{order.deadline}</span>
            {deadlineInfo && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${deadlineInfo.badgeStyle}`}>
                {deadlineInfo.label}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-500 hover:text-amber-400 transition-colors font-mono text-xs">+ срок</span>
        )}
      </td>

      {/* 6. Статус производства (быстрый выбор статуса) */}
      <td 
        onClick={() => onOpenDrawer(order, 'status')}
        className="py-2.5 px-3 whitespace-nowrap min-w-[135px] cursor-pointer"
        title="Кликните для выбора статуса заказа"
      >
        {isIncome ? (
          <div onClick={(e) => e.stopPropagation()} className="w-full">
            <Select
              variant="badge"
              size="sm"
              options={STATUS_OPTIONS}
              value={order.status || 'Готово'}
              onChange={(newSt) => onUpdateStatus(order, newSt as OrderStatus)}
              dropdownWidth={175}
              showChevron={false}
            />
          </div>
        ) : (
          <span className="text-gray-600 font-mono text-xs">—</span>
        )}
      </td>

      {/* 7. Сумма заказа & Наценки (клик открывает редактирование цен и скидок) */}
      <td 
        onClick={() => onOpenDrawer(order, 'pricing')}
        className="py-3 px-3 text-right whitespace-nowrap min-w-[100px] cursor-pointer"
        title="Кликните для изменения стоимости, наценок и скидок"
      >
        <div className="flex flex-col items-end">
          <span className="font-mono font-bold text-white text-sm hover:text-emerald-300 transition-colors">
            {formatMoney(totalAmount)}
          </span>

          {((order.urgency_percent && order.urgency_percent > 0) ||
            (order.urgency_amount && order.urgency_amount > 0) ||
            (order.discount_percent && order.discount_percent > 0) ||
            (order.discount_amount && order.discount_amount > 0)) && (
            <div className="flex items-center gap-1 mt-0.5 text-[9px] font-sans">
              {(Boolean(order.urgency_percent || order.urgency_amount)) && (
                <span className="px-1 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold flex items-center gap-0.5">
                  <Flame size={8} /> {order.urgency_percent ? `+${order.urgency_percent}%` : `+${order.urgency_amount} ₽`}
                </span>
              )}
              {(Boolean(order.discount_percent || order.discount_amount)) && (
                <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-0.5">
                  <Tag size={8} /> {order.discount_percent ? `-${order.discount_percent}%` : `-${order.discount_amount} ₽`}
                </span>
              )}
            </div>
          )}
        </div>
      </td>

      {/* 8. Оплата (клик открывает управление оплатами) */}
      <td 
        onClick={() => onOpenDrawer(order, 'payments')}
        className="py-3 px-3 text-right whitespace-nowrap min-w-[110px] cursor-pointer group/pay transition-colors"
        title="Кликните для внесения или редактирования оплат"
      >
        {isIncome ? (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span className={`font-mono font-bold text-xs group-hover/pay:underline transition-colors ${isFullyPaid ? 'text-emerald-400 group-hover/pay:text-emerald-300' : 'text-amber-400 group-hover/pay:text-amber-300'}`}>
                {formatMoney(totalPaid)}
              </span>
              {isFullyPaid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
            </div>

            {!isFullyPaid && (
              <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                долг: <strong className="text-amber-400">{formatMoney(remainingToPay)}</strong>
              </span>
            )}

            {/* Мини-полоска прогресса оплаты */}
            {totalAmount > 0 && (
              <div 
                className="w-full max-w-[85px] h-1.5 bg-[#0d0e12] border border-[#242930] rounded-full overflow-hidden mt-1 ml-auto"
                title={`Оплачено ${Math.min(100, Math.max(0, Math.round((totalPaid / totalAmount) * 100)))}% (${formatMoney(totalPaid)} из ${formatMoney(totalAmount)})`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFullyPaid
                      ? 'bg-emerald-400'
                      : totalPaid > 0
                      ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                      : 'bg-transparent'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, Math.round((totalPaid / totalAmount) * 100)))}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-600 font-mono text-xs">—</span>
        )}
      </td>

      {/* 9. Расход (клик открывает статьи себестоимости) */}
      <td 
        onClick={() => onOpenDrawer(order, 'costs')}
        className="py-3 px-3 text-right whitespace-nowrap min-w-[90px] cursor-pointer group/cost transition-colors"
        title="Кликните для добавления или изменения статей себестоимости"
      >
        {isIncome ? (
          <div className="flex flex-col items-end">
            <span className="font-mono text-gray-300 text-xs font-semibold group-hover/cost:text-[#FF8800] group-hover/cost:underline transition-colors">
              {formatMoney(costVal)}
            </span>
            {order.cost_items && order.cost_items.length > 0 && (
              <span className="text-[10px] text-gray-500 font-mono">
                {order.cost_items.length} {order.cost_items.length === 1 ? 'пункт' : 'пункта'}
              </span>
            )}
          </div>
        ) : (
          <span className="font-mono text-rose-400 font-bold text-xs">
            {formatMoney(totalAmount)}
          </span>
        )}
      </td>

      {/* 10. Чистая прибыль & маржа (клик открывает финансовую сводку) */}
      <td 
        onClick={() => onOpenDrawer(order, 'financials')}
        className="py-3 px-3 text-right whitespace-nowrap min-w-[110px] cursor-pointer"
        title="Кликните для просмотра финансовой аналитики и маржинальности"
      >
        <div className="flex flex-col items-end">
          <span className={`font-mono font-bold text-xs sm:text-sm ${
            netProfit > 0 ? 'text-emerald-400' : netProfit === 0 ? 'text-gray-300' : 'text-rose-400'
          }`}>
            {netProfit > 0 ? `+${formatMoney(netProfit)}` : formatMoney(netProfit)}
          </span>

          {isIncome && totalAmount > 0 && (
            <span className={`px-1.5 py-0.2 mt-0.5 rounded text-[10px] font-mono font-bold border ${
              marginPercent >= 50
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : marginPercent >= 20
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}>
              {marginPercent.toFixed(0)}% маржа
            </span>
          )}
        </div>
      </td>

      {/* 11. Кнопка-стрелочка в самом конце: открывает боковое меню ДЛЯ ВСЕГО заказа сразу */}
      <td className="py-3 px-2 text-center whitespace-nowrap w-[40px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDrawer(order, 'all');
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#FF6B00] transition-all cursor-pointer shadow-sm"
          title="Открыть полный вид боковой карточки (все разделы сразу)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
});
