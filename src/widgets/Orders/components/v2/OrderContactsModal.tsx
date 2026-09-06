'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Order, 
  ContactItem, 
  ContactType,
  CONTACT_TYPES_CONFIG,
} from '../../types';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Check, 
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip } from '@/shared/ui/Tooltip';
import { CockpitDropdown, type CockpitDropdownOption } from '@/shared/ui/CockpitDropdown';

export interface OrderContactsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: string, contacts: ContactItem[], primaryContact: string) => void;
  onCopyContact: (text: string) => void;
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

function getInitialContacts(order: Order): ContactItem[] {
  if (order.contacts && order.contacts.length > 0) return [...order.contacts];
  if (!order.contact?.trim()) return [{ type: 'phone', value: '' }];

  const value = order.contact.trim();
  let type: ContactType = 'phone';
  if (value.startsWith('@') || value.includes('t.me')) type = 'telegram';
  else if (value.includes('@') && value.includes('.')) type = 'email';
  else if (value.includes('avito')) type = 'avito';
  else if (value.includes('vk.com')) type = 'vk';
  else if (!/^(\+7|8|\+375|\+380|\+)/.test(value)) type = 'other';
  return [{ type, value }];
}

export function OrderContactsModal({
  order,
  isOpen,
  onClose,
  onSave,
  onCopyContact,
}: OrderContactsModalProps) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Системное время для шапки модального окна
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} MSK`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Инициализация контактов заказа при открытии
  useEffect(() => {
    if (isOpen && order) {
      const initialContacts = getInitialContacts(order);
      queueMicrotask(() => setContacts(initialContacts));
    }
  }, [isOpen, order]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order || typeof window === 'undefined') return null;

  const handleAddContact = () => {
    setContacts((prev) => [...prev, { type: 'telegram', value: '' }]);
  };

  const handleUpdateContact = (index: number, updates: Partial<ContactItem>) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const handleRemoveContact = (index: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCopy = (val: string, index: number) => {
    if (!val) return;
    onCopyContact(val);
    setCopiedIdx(index);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const handleSave = () => {
    // Очищаем пустые значения
    const cleaned = contacts.filter((c) => c.value && c.value.trim().length > 0);
    const primary = cleaned[0]?.value || '';
    onSave(order.id, cleaned, primary);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 select-none font-mono">
          {/* ФОНОВЫЙ БЛЮР */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md cursor-pointer"
          />

          {/* КОНТЕЙНЕР МОДАЛКИ (COCKPIT CONSOLE STYLE) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contacts-modal-title"
            className="relative w-full max-w-lg bg-neutral-950/95 border border-white/20 rounded-2xl shadow-[0_25px_80px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl overflow-hidden text-xs flex flex-col max-h-[90vh]"
          >
            {/* 1. Верхняя панель (Cockpit Topbar: Red LED + Title + Live time) */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 bg-neutral-900/60 shrink-0 gap-3">
              {/* Левая часть: красный терминальный кружок закрытия + заголовок раздела */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip content="Закрыть окно">
                    <button
                      type="button"
                      onClick={onClose}
                      title="Закрыть окно"
                      aria-label="Закрыть окно"
                      className="w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#f87171] hover:scale-125 active:scale-95 transition-all duration-150 cursor-pointer border-none outline-none shrink-0"
                    />
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-[#d4d4d8] min-w-0">
                  <span id="contacts-modal-title" className="text-[#d4d4d8] font-normal truncate">
                    Контакты клиента
                  </span>
                  <span className="text-[#52525b] shrink-0">·</span>
                  <span className="text-[#71717a] hidden sm:inline truncate">
                    {order.client_name || 'Способы связи и ссылки'}
                  </span>
                </div>
              </div>

              {/* Правая часть: Только системное время (без крестика) */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="font-mono text-xs text-[#71717a] tabular-nums">
                  {currentTimeStr}
                </div>
              </div>
            </div>

            {/* 2. ТЕЛО С КОНТАКТАМИ */}
            <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span>Список каналов связи:</span>
                <button
                  type="button"
                  onClick={handleAddContact}
                  className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 text-white transition-all flex items-center gap-1.5 cursor-pointer text-[11px]"
                >
                  <Plus className="w-3 h-3 text-cyan-400" />
                  <span>[ + Добавить контакт ]</span>
                </button>
              </div>

              {contacts.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-white/15 rounded-xl bg-white/[0.02] text-neutral-500 space-y-2">
                  <User className="w-6 h-6 mx-auto opacity-40 text-neutral-400" />
                  <p className="text-xs">У этого заказа нет добавленных контактов</p>
                  <button
                    type="button"
                    onClick={handleAddContact}
                    className="px-3 py-1 rounded-lg border border-white/20 bg-white/5 hover:bg-white/15 text-neutral-200 text-[11px] cursor-pointer"
                  >
                    + Добавить первый контакт
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {contacts.map((c, idx) => {
                    const cfg = CONTACT_TYPES_CONFIG[c.type] || CONTACT_TYPES_CONFIG.other;
                    const href = getContactHref(c.type, c.value);
                    const isCopied = copiedIdx === idx;

                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 hover:border-white/20 transition-all"
                      >
                        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                          {/* Тип контакта */}
                          <div className="w-full shrink-0 sm:w-40">
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
                              buttonClassName="h-8"
                              usePortal
                            />
                          </div>

                          {/* Поле ввода значения контакта */}
                          <input
                            id={`contact-value-${idx}`}
                            name={`contact_value_${idx}`}
                            aria-label={`Значение контакта ${idx + 1}`}
                            type="text"
                            value={c.value}
                            onChange={(e) =>
                              handleUpdateContact(idx, { value: e.target.value })
                            }
                            placeholder={cfg.placeholder}
                            className="min-w-0 flex-1 bg-neutral-900 border border-white/15 text-white font-mono text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-400/60 placeholder:text-neutral-600"
                          />

                          {/* Кнопка удаления контакта */}
                          <Tooltip content="Удалить этот контакт">
                            <button
                              type="button"
                              onClick={() => handleRemoveContact(idx)}
                              aria-label={`Удалить контакт ${idx + 1}`}
                              title={`Удалить контакт ${idx + 1}`}
                              className="p-1.5 rounded-lg border border-white/10 hover:border-rose-500/40 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>

                        {/* Нижняя панель действий для этого контакта */}
                        {c.value.trim() && (
                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-neutral-400">
                            <span className="text-neutral-500 truncate max-w-[200px]">
                              {c.value}
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Кнопка Скопировать */}
                              <button
                                type="button"
                                onClick={() => handleCopy(c.value, idx)}
                                className={`px-2 py-0.5 rounded border text-[10px] font-mono transition-all flex items-center gap-1 cursor-pointer ${
                                  isCopied
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border-white/10'
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Скопировано!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-2.5 h-2.5" />
                                    <span>Скопировать</span>
                                  </>
                                )}
                              </button>

                              {/* Кнопка Перейти по ссылке (если есть ссылка) */}
                              {href && (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 transition-all flex items-center gap-1 cursor-pointer text-[10px]"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  <span>Перейти</span>
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. ПОДВАЛ МОДАЛКИ (ACTION BUTTONS) */}
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 bg-neutral-900/90 text-xs">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                [ Закрыть ]
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg border border-white/30 bg-white text-neutral-950 hover:bg-neutral-200 font-bold transition-all cursor-pointer shadow-lg shadow-white/10"
              >
                [ Сохранить контакты ]
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
