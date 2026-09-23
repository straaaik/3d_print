'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Check,
  User,
  Star,
} from 'lucide-react';
import { Tooltip } from '../../../../shared/ui/Tooltip';
import { CockpitDropdown, type CockpitDropdownOption } from '../../../../shared/ui/CockpitDropdown';
import { CockpitButton } from '../../../../shared/ui/CockpitButton';
import {
  Order,
  ContactItem,
  ContactType,
  CONTACT_TYPES_CONFIG,
} from '../../types';
import { formatOrderNumber } from './types';

export interface OrderContactsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: string, contacts: ContactItem[], primaryContact: string) => void;
  onCopyContact: (text: string) => void;
}

interface LocalContactItem extends ContactItem {
  _id: string;
}

export function getContactHref(type: ContactType, value: string): string | null {
  if (!value || !value.trim()) return null;
  const val = value.trim();

  // 1. Прямой веб-URL (http:// или https://)
  if (/^https?:\/\//i.test(val)) {
    return val;
  }

  // 2. Ссылки с известными доменами без протокола (например: t.me/..., vk.com/..., avito.ru/..., wa.me/...)
  if (/^(t\.me|vk\.com|instagram\.com|wa\.me|chat\.whatsapp\.com|avito\.ru|youtube\.com|youtu\.be|tiktok\.com|github\.com)\//i.test(val)) {
    return `https://${val}`;
  }

  // 3. Telegram: @username или t.me/...
  if (type === 'telegram') {
    if (val.startsWith('@') && val.length > 1 && !val.includes(' ')) {
      return `https://t.me/${val.slice(1)}`;
    }
    if (val.startsWith('t.me/')) {
      return `https://${val}`;
    }
    if (/^[a-zA-Z0-9_]{4,32}$/.test(val)) {
      return `https://t.me/${val}`;
    }
    return null;
  }

  // 4. ВКонтакте: vk.com/... или username/id
  if (type === 'vk') {
    if (val.startsWith('vk.com/')) return `https://${val}`;
    if (/^(id\d+|[a-zA-Z0-9_.]{3,32})$/.test(val) && !val.includes(' ')) {
      return `https://vk.com/${val}`;
    }
    return null;
  }

  // 5. Instagram: @username или ссылка
  if (type === 'instagram') {
    if (val.startsWith('@') && val.length > 1 && !val.includes(' ')) {
      return `https://instagram.com/${val.slice(1)}`;
    }
    if (val.startsWith('instagram.com/')) return `https://${val}`;
    if (/^[a-zA-Z0-9_.]{2,30}$/.test(val) && !val.includes(' ')) {
      return `https://instagram.com/${val}`;
    }
    return null;
  }

  // 6. Авито профиль / объявление
  if (type === 'avito') {
    if (val.includes('avito.ru')) {
      return val.startsWith('http') ? val : `https://${val}`;
    }
    return null;
  }

  // 7. WhatsApp: wa.me/... или номер
  if (type === 'whatsapp') {
    if (val.startsWith('wa.me/')) return `https://${val}`;
    const digits = val.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `https://wa.me/${digits}`;
    }
  }

  // 8. Email: mailto
  if (type === 'email' && val.includes('@')) {
    return `mailto:${val}`;
  }

  // 9. Общий паттерн для доменов / веб-ссылок (напр. domain.ru/path, example.com)
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(\/[^\s]*)?$/.test(val) && !val.includes(' ') && (val.includes('.ru') || val.includes('.com') || val.includes('.org') || val.includes('.io') || val.includes('.me') || val.includes('.net') || val.includes('.app') || val.includes('.dev') || val.includes('.su') || val.includes('.by') || val.includes('.kz'))) {
    return `https://${val}`;
  }

  // Обычные номера телефонов (напр. +7 999 123-45-67), имена или простой текст — НЕ являются ссылками
  return null;
}

export const ALL_CONTACT_TYPES: ContactType[] = [
  'phone',
  'telegram',
  'whatsapp',
  'avito',
  'vk',
  'instagram',
  'email',
  'other',
];

const CONTACT_TYPE_OPTIONS: CockpitDropdownOption[] = ALL_CONTACT_TYPES.map((type) => ({
  value: type,
  label: CONTACT_TYPES_CONFIG[type]?.label || type,
  icon: CONTACT_TYPES_CONFIG[type]?.icon,
}));

let contactIdCounter = 0;
function createLocalContact(type: ContactType, value: string, label?: string): LocalContactItem {
  contactIdCounter += 1;
  return {
    _id: `contact-${Date.now()}-${contactIdCounter}`,
    type,
    value,
    label,
  };
}

function getInitialLocalContacts(order: Order): LocalContactItem[] {
  if (order.contacts && order.contacts.length > 0) {
    return order.contacts.map((c) => createLocalContact(c.type, c.value, c.label));
  }
  if (!order.contact?.trim()) {
    return [createLocalContact('phone', '')];
  }

  const value = order.contact.trim();
  let type: ContactType = 'phone';
  if (value.startsWith('@') || value.includes('t.me')) type = 'telegram';
  else if (value.includes('@') && value.includes('.')) type = 'email';
  else if (value.includes('avito')) type = 'avito';
  else if (value.includes('vk.com')) type = 'vk';
  else if (!/^(\+7|8|\+375|\+380|\+)/.test(value)) type = 'other';

  return [createLocalContact(type, value)];
}

export interface OrderContactsModalContentProps {
  order: Order;
  onClose: () => void;
  onSave: (orderId: string, contacts: ContactItem[], primaryContact: string) => void;
  onCopyContact: (text: string) => void;
}

export function OrderContactsModalContent({
  order,
  onClose,
  onSave,
  onCopyContact,
}: OrderContactsModalContentProps) {
  const [contacts, setContacts] = useState<LocalContactItem[]>(() => getInitialLocalContacts(order));
  const [primaryIndex, setPrimaryIndex] = useState<number>(() => {
    if (!order.contact?.trim()) return 0;
    const initial = getInitialLocalContacts(order);
    const target = order.contact.trim().toLowerCase();
    const idx = initial.findIndex((c) => c.value.trim().toLowerCase() === target);
    return idx >= 0 ? idx : 0;
  });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Живые часы в шапке (ЧЧ:ММ:СС MSK)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setCurrentTimeStr(`${hours}:${mins}:${secs} MSK`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAddContact = () => {
    setContacts((prev) => [...prev, createLocalContact('telegram', '')]);
  };

  const handleUpdateContact = (index: number, updates: Partial<ContactItem>) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const handleRemoveContact = (index: number) => {
    setContacts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        return [createLocalContact('phone', '')];
      }
      return next;
    });

    setPrimaryIndex((prev) => {
      if (prev === index) return 0;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const handleCopy = (val: string, index: number) => {
    if (!val || !val.trim()) return;
    onCopyContact(val);
    setCopiedIdx(index);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Очищаем пустые значения
    const cleaned: ContactItem[] = contacts
      .filter((c) => c.value && c.value.trim().length > 0)
      .map(({ type, value, label }) => ({
        type,
        value: value.trim(),
        ...(label ? { label } : {}),
      }));

    // Определяем основной контакт
    const primaryItem = contacts[primaryIndex];
    const primary =
      primaryItem && primaryItem.value.trim().length > 0
        ? primaryItem.value.trim()
        : cleaned[0]?.value || '';

    onSave(order.id, cleaned, primary);
    onClose();
  };

  const nonEmptyCount = contacts.filter((c) => c.value && c.value.trim().length > 0).length;
  const validLinksCount = contacts.filter(
    (c) => c.value && getContactHref(c.type, c.value) !== null
  ).length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 select-none font-mono">
      {/* 1. Стеклянный темный бэкдроп */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-sm cursor-pointer"
      />

      {/* 2. Контейнер консоли Meridian Cockpit */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contacts-modal-title"
        className="relative w-full max-w-[640px] bg-neutral-950/90 border border-white/15 rounded-2xl shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden z-10 flex flex-col font-mono max-h-[88vh]"
      >
        {/* Шапка модального окна (Topbar: Red LED + Title + Live MSK clock) */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 bg-neutral-900/60 shrink-0 gap-3 select-none">
          {/* Левая часть: красный терминальный кружок закрытия + заголовок раздела */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Tooltip content="Закрыть окно">
                <button
                  type="button"
                  onClick={onClose}
                  title="Закрыть окно"
                  aria-label="Закрыть окно"
                  className="w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#f87171] hover:scale-125 cursor-pointer border-none outline-none shrink-0 transition-all"
                />
              </Tooltip>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-neutral-300 min-w-0">
              <span id="contacts-modal-title" className="text-neutral-300 font-normal shrink-0">
                Контакты клиента
              </span>
              <span className="text-[#52525b] shrink-0">·</span>
              <span className="text-[#71717a] truncate min-w-0">
                Способы связи и ссылки
              </span>
            </div>
          </div>

          {/* Правая часть: системное время (без крестика) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="font-mono text-xs text-[#71717a] tabular-nums">
              {currentTimeStr}
            </div>
          </div>
        </div>

        {/* Рабочее тело со списком контактов (bg-[#18181c]) */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 bg-[#18181c] space-y-4 overflow-y-auto custom-scrollbar font-mono flex-1">
          {/* Панель телеметрии заказа */}
          <div className="border border-[#26262b] bg-[#121214]/90 rounded-xl p-3 flex items-center justify-between text-[11px] font-mono select-none">
            <div className="flex items-center gap-2 truncate max-w-[320px] min-w-0">
              <User className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
              <span className="text-neutral-200 font-medium truncate">
                {formatOrderNumber(order)} {order.title ? `• ${order.title}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <span className="text-[10px] text-[#71717a] uppercase font-semibold">Клиент:</span>
              <span className="px-2 py-0.5 rounded bg-[#1e1e22] border border-[#2e2e34] text-neutral-300 text-[11px] truncate max-w-[180px]">
                {order.client_name || order.client || 'Не указан'}
              </span>
            </div>
          </div>

          {/* Заголовок секции с кнопкой добавления */}
          <div className="flex items-center justify-between text-[11px] font-mono select-none pt-1">
            <span className="text-[#71717a] uppercase tracking-wider font-semibold">
              СПОСОБЫ СВЯЗИ И ССЫЛКИ ({contacts.length})
            </span>
            <CockpitButton size="sm" onClick={handleAddContact} icon={Plus}>
              Добавить контакт
            </CockpitButton>
          </div>

          {contacts.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-[#2e2e34] rounded-xl bg-[#141416]/60 text-[#71717a] space-y-3 select-none">
              <User className="w-7 h-7 mx-auto text-[#71717a] stroke-[1.5]" />
              <div className="space-y-1">
                <p className="text-xs text-neutral-300 font-mono">У этого заказа нет добавленных контактов</p>
                <p className="text-[11px] text-[#71717a] font-mono">
                  Добавьте номер телефона, ссылку на Telegram, WhatsApp или профиль клиента
                </p>
              </div>
              <div className="flex justify-center pt-1">
                <CockpitButton size="sm" onClick={handleAddContact} icon={Plus}>
                  Добавить первый контакт
                </CockpitButton>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence initial={false}>
                {contacts.map((c, idx) => {
                  const cfg = CONTACT_TYPES_CONFIG[c.type] || CONTACT_TYPES_CONFIG.other;
                  const href = getContactHref(c.type, c.value);
                  const isCopied = copiedIdx === idx;
                  const isPrimary = primaryIndex === idx;

                  return (
                    <motion.div
                      key={c._id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={`p-3 rounded-xl border transition-colors ${
                        isPrimary
                          ? 'bg-[#18181d] border-white/25 shadow-sm'
                          : 'bg-[#141416]/90 border border-[#26262b] hover:border-[#383840]'
                      }`}
                    >
                      {/* Строка контакта: Выбор типа + Поле ввода (с кнопками внутри) + Иконки действий */}
                      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        {/* Селектор типа контакта */}
                        <div className="w-full shrink-0 sm:w-44">
                          <CockpitDropdown
                            value={c.type}
                            onChange={(type) =>
                              handleUpdateContact(idx, {
                                type: type as ContactType,
                              })
                            }
                            options={CONTACT_TYPE_OPTIONS}
                            ariaLabel={`Тип контакта ${idx + 1}`}
                            className="w-full"
                            buttonClassName="h-8 text-xs font-mono bg-[#121214] border-[#26262b] focus:border-white/40"
                            dropdownWidth={220}
                            usePortal
                          />
                        </div>

                        {/* Поле ввода значения контакта со встроенными кнопками Открыть и Скопировать */}
                        <div className="relative flex-1 min-w-0 flex items-center">
                          <input
                            id={`contact-value-${c._id}`}
                            name={`contact_value_${c._id}`}
                            aria-label={`Значение контакта ${idx + 1}`}
                            type="text"
                            value={c.value}
                            onChange={(e) =>
                              handleUpdateContact(idx, { value: e.target.value })
                            }
                            placeholder={cfg.placeholder}
                            className={`w-full bg-[#121214] border border-[#26262b] text-white font-mono text-xs rounded-lg pl-3 py-1.5 focus:outline-none focus:border-white/40 placeholder-[#52525b] transition-colors ${
                              href && c.value.trim() ? 'pr-14' : href || c.value.trim() ? 'pr-8' : 'pr-3'
                            }`}
                          />

                          {/* Встроенные в инпут кнопки: Открыть ссылку и Скопировать */}
                          <div className="absolute right-1.5 flex items-center gap-0.5">
                            {/* Открыть ссылку (если применимо) */}
                            {href && (
                              <Tooltip content="Открыть ссылку в браузере">
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Открыть ссылку для контакта ${idx + 1}`}
                                  className="w-6 h-6 rounded flex items-center justify-center text-[#71717a] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </Tooltip>
                            )}

                            {/* Скопировать значение контакта */}
                            {c.value.trim() && (
                              <Tooltip content={isCopied ? 'Скопировано!' : 'Скопировать контакт'}>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(c.value, idx)}
                                  aria-label={isCopied ? 'Скопировано' : `Скопировать контакт ${idx + 1}`}
                                  className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                                    isCopied
                                      ? 'text-emerald-400 bg-emerald-950/40'
                                      : 'text-[#71717a] hover:text-white hover:bg-white/10'
                                  }`}
                                >
                                  {isCopied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </div>

                        {/* Панель действий строки контакта */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Основной контакт (серый акцент) */}
                          <Tooltip content={isPrimary ? 'Основной контакт' : 'Сделать основным контактом'}>
                            <button
                              type="button"
                              onClick={() => setPrimaryIndex(idx)}
                              aria-label={isPrimary ? `Основной контакт ${idx + 1}` : `Сделать контакт ${idx + 1} основным`}
                              className={`h-8 w-8 rounded-lg border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                                isPrimary
                                  ? 'border-white/30 bg-white/10 text-neutral-200 hover:bg-white/15 hover:border-white/40'
                                  : 'border-[#26262b] bg-[#121214] text-[#71717a] hover:text-neutral-300 hover:border-[#383840] hover:bg-[#18181c]'
                              }`}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  isPrimary ? 'fill-neutral-200 text-neutral-200' : ''
                                }`}
                              />
                            </button>
                          </Tooltip>

                          {/* Удалить контакт */}
                          <Tooltip content="Удалить этот контакт">
                            <button
                              type="button"
                              onClick={() => handleRemoveContact(idx)}
                              aria-label={`Удалить контакт ${idx + 1}`}
                              className="h-8 w-8 rounded-lg border border-[#26262b] bg-[#121214] hover:bg-rose-500/10 hover:border-rose-500/30 text-[#71717a] hover:text-rose-400 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </motion.div>


                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </form>

        {/* 3. Инженерный подвал (Statusbar & Action bar) */}
        <div className="border-t border-white/10 px-5 py-3 bg-neutral-900/60 font-mono text-xs flex items-center justify-between shrink-0 select-none">
          <div className="text-[11px] text-[#71717a] flex items-center gap-2">
            <span>КОНТАКТОВ: {nonEmptyCount}</span>
            {validLinksCount > 0 && (
              <>
                <span>·</span>
                <span className="text-neutral-400">ССЫЛОК: {validLinksCount}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <CockpitButton size="sm" onClick={() => handleSave()} icon={Check}>
              Сохранить контакты
            </CockpitButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function OrderContactsModal({
  order,
  isOpen,
  onClose,
  onSave,
  onCopyContact,
}: OrderContactsModalProps) {
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && order && (
        <OrderContactsModalContent
          key={order.id}
          order={order}
          onClose={onClose}
          onSave={onSave}
          onCopyContact={onCopyContact}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
