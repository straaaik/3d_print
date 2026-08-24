'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../entities/model/AuthProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { RegistrationKey, User, UserRole } from '../../shared/types';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';
import { GenerateKeyModal } from './components/GenerateKeyModal';
import { 
  KeyRound, 
  ShieldCheck, 
  Users, 
  Database, 
  Plus, 
  Copy, 
  Trash2, 
  Check, 
  Search, 
  Clock, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  AlertTriangle, 
  Download,
  Terminal,
  Sparkles,
  CheckCircle2,
  Lock,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';

export function AdminPanel() {
  const { 
    currentUser, 
    users, 
    registrationKeys, 
    deleteKey, 
    updateUserRole, 
    toggleUserStatus, 
    deleteUser,
    refreshAuthData 
  } = useAuth();
  const { showSuccess, showError, showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'keys' | 'users' | 'database'>('keys');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Состояния фильтрации ключей
  const [keySearch, setKeySearch] = useState('');
  const [keyStatusFilter, setKeyStatusFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  
  // Состояния фильтрации пользователей
  const [userSearch, setUserSearch] = useState('');

  // Модальные окна подтверждения удаления
  const [keyToDelete, setKeyToDelete] = useState<RegistrationKey | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Копирование в буфер
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Статистика ключей
  const stats = useMemo(() => {
    const total = registrationKeys.length;
    let active = 0;
    let used = 0;
    let expired = 0;

    const now = new Date();
    registrationKeys.forEach((k) => {
      if (k.is_used) {
        used++;
      } else if (k.expires_at && new Date(k.expires_at) < now) {
        expired++;
      } else {
        active++;
      }
    });

    return {
      total,
      active,
      used,
      expired,
      usersTotal: users.length,
    };
  }, [registrationKeys, users]);

  // Фильтрация списка ключей
  const filteredKeys = useMemo(() => {
    const searchLower = keySearch.trim().toLowerCase();
    const now = new Date();

    return registrationKeys.filter((k) => {
      // Поиск
      const matchesSearch = 
        !searchLower ||
        k.key.toLowerCase().includes(searchLower) ||
        (k.note && k.note.toLowerCase().includes(searchLower)) ||
        (k.used_by_email && k.used_by_email.toLowerCase().includes(searchLower)) ||
        (k.created_by && k.created_by.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      // Статус
      const isExpired = !!k.expires_at && new Date(k.expires_at) < now;
      if (keyStatusFilter === 'active') return !k.is_used && !isExpired;
      if (keyStatusFilter === 'used') return k.is_used;
      if (keyStatusFilter === 'expired') return !k.is_used && isExpired;

      return true;
    });
  }, [registrationKeys, keySearch, keyStatusFilter]);

  // Фильтрация списка пользователей
  const filteredUsers = useMemo(() => {
    const searchLower = userSearch.trim().toLowerCase();
    if (!searchLower) return users;

    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower) ||
        (u.registration_key_used && u.registration_key_used.toLowerCase().includes(searchLower))
    );
  }, [users, userSearch]);

  // Копирование ключа
  const handleCopyKey = (keyString: string, id: string) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKeyId(id);
    showSuccess(`Ключ ${keyString} скопирован в буфер`);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Удаление ключа
  const handleConfirmDeleteKey = async () => {
    if (!keyToDelete) return;
    setIsDeleting(true);
    try {
      await deleteKey(keyToDelete.id);
      showSuccess('Ключ успешно удален');
      setKeyToDelete(null);
    } catch {
      showError('Не удалось удалить ключ');
    } finally {
      setIsDeleting(false);
    }
  };

  // Удаление пользователя
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser?.id) {
      showError('Вы не можете удалить собственный аккаунт');
      return;
    }
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      showSuccess(`Пользователь ${userToDelete.name} удален`);
      setUserToDelete(null);
    } catch {
      showError('Не удалось удалить пользователя');
    } finally {
      setIsDeleting(false);
    }
  };

  // Переключение роли пользователя
  const handleToggleUserRole = async (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('Нельзя изменить роль собственной учетной записи', 'warning');
      return;
    }
    const newRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await updateUserRole(user.id, newRole);
      showSuccess(`Роль пользователя ${user.name} изменена на: ${newRole === 'admin' ? 'Администратор' : 'Пользователь'}`);
    } catch {
      showError('Не удалось изменить роль');
    }
  };

  // Блокировка/разблокировка пользователя
  const handleToggleUserStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('Нельзя заблокировать собственный аккаунт', 'warning');
      return;
    }
    try {
      await toggleUserStatus(user.id);
      showSuccess(user.is_active ? `Пользователь ${user.name} заблокирован` : `Пользователь ${user.name} разблокирован`);
    } catch {
      showError('Не удалось изменить статус пользователя');
    }
  };

  // Экспорт списка активных ключей в текстовый файл
  const handleExportKeys = () => {
    const activeKeys = registrationKeys.filter((k) => !k.is_used);
    if (activeKeys.length === 0) {
      showToast('Нет активных ключей для экспорта', 'info');
      return;
    }

    const content = activeKeys
      .map(
        (k, i) =>
          `${i + 1}. Ключ: ${k.key}\n   Роль: ${k.role_to_grant === 'admin' ? 'Администратор' : 'Пользователь'}\n   Срок: ${k.expires_at ? new Date(k.expires_at).toLocaleDateString('ru-RU') : 'Бессрочно'}\n   Заметка: ${k.note || '—'}\n`
      )
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `3dlabs_keys_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('Список активных ключей сохранен');
  };

  // SQL скрипт для базы данных Supabase
  const sqlScript = `-- 1. Создание таблицы профилей пользователей (связана с auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  registration_key_used TEXT,
  avatar_color TEXT
);

-- 2. Создание таблицы регистрационных ключей
CREATE TABLE IF NOT EXISTS public.registration_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  key TEXT UNIQUE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by_email TEXT,
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT 'Администратор',
  expires_at TIMESTAMPTZ,
  role_to_grant TEXT NOT NULL DEFAULT 'user' CHECK (role_to_grant IN ('admin', 'user')),
  note TEXT
);

-- 3. Добавление user_id ко всем таблицам данных
ALTER TABLE public.printers ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.filaments ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.saved_calculations ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_reg_keys_key ON public.registration_keys(key);
CREATE INDEX IF NOT EXISTS idx_reg_keys_is_used ON public.registration_keys(is_used);

-- 5. Включение Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;`;

  const copySqlScript = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    showSuccess('SQL-скрипт скопирован в буфер обмена');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Шапка раздела */}
      <PageHeader
        icon={ShieldCheck}
        title="Панель администратора"
        subtitle="Генерация ключей доступа, управление пользователями и безопасность системы"
        accentColor="#8b5cf6"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Сгенерировать ключ</span>
            </button>
          </div>
        }
      />

      {/* Метрики / Карточки статистики */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Карточка: Всего ключей */}
        <div className="bg-[#14161d] border border-[#242930] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-lg relative overflow-hidden">
          <div className="w-11 h-11 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400 shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white font-mono">
              {stats.total}
            </div>
            <div className="text-xs text-gray-400 font-medium">Всего ключей</div>
          </div>
        </div>

        {/* Карточка: Свободные ключи */}
        <div className="bg-[#14161d] border border-[#242930] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-lg relative overflow-hidden">
          <div className="w-11 h-11 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
              {stats.active}
            </div>
            <div className="text-xs text-gray-400 font-medium">Свободные (готовы)</div>
          </div>
        </div>

        {/* Карточка: Использованные ключи */}
        <div className="bg-[#14161d] border border-[#242930] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-lg relative overflow-hidden">
          <div className="w-11 h-11 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-blue-400 font-mono">
              {stats.used}
            </div>
            <div className="text-xs text-gray-400 font-medium">Использованные</div>
          </div>
        </div>

        {/* Карточка: Пользователи */}
        <div className="bg-[#14161d] border border-[#242930] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-lg relative overflow-hidden">
          <div className="w-11 h-11 rounded-xl bg-[#1f2430] border border-[#2e374a] flex items-center justify-center text-indigo-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white font-mono">
              {stats.usersTotal}
            </div>
            <div className="text-xs text-gray-400 font-medium">Пользователей</div>
          </div>
        </div>
      </div>

      {/* Переключатель вкладок админки */}
      <div className="bg-[#14161d] border border-[#242930] p-1 rounded-2xl flex items-center gap-1 overflow-x-auto select-none">
        <button
          type="button"
          onClick={() => setActiveTab('keys')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'keys'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Ключи регистрации ({stats.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Пользователи ({stats.usersTotal})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'database'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>База данных и SQL</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* ВКЛАДКА 1: КЛЮЧИ РЕГИСТРАЦИИ                                         */}
      {/* ==================================================================== */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          {/* Панель поиска, фильтров и действий */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#14161d] border border-[#242930] p-3 rounded-2xl">
            {/* Поисковая строка */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={keySearch}
                onChange={(e) => setKeySearch(e.target.value)}
                placeholder="Поиск по ключу, заметке или email..."
                className="w-full h-9 pl-9 pr-3 bg-[#0d0e12] border border-[#242930] focus:border-purple-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none placeholder-gray-500"
              />
            </div>

            {/* Фильтры статуса */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'all', label: `Все (${stats.total})` },
                { id: 'active', label: `🟢 Свободные (${stats.active})` },
                { id: 'used', label: `🔵 Использованные (${stats.used})` },
                { id: 'expired', label: `⏳ Истёкшие (${stats.expired})` },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setKeyStatusFilter(filter.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    keyStatusFilter === filter.id
                      ? 'bg-purple-950/60 text-purple-300 border border-purple-700/60 font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Экспорт */}
            <button
              type="button"
              onClick={handleExportKeys}
              className="px-3 py-1.5 bg-[#1b1f29] hover:bg-[#242936] text-gray-300 hover:text-white border border-[#2d3444] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Экспортировать активные ключи в .TXT"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт TXT</span>
            </button>
          </div>

          {/* Таблица ключей */}
          <div className="bg-[#14161d] border border-[#242930] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#242930] bg-[#0f1117] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Ключ доступа</th>
                    <th className="py-3 px-3">Статус</th>
                    <th className="py-3 px-3">Роль</th>
                    <th className="py-3 px-3">Заметка</th>
                    <th className="py-3 px-3">Использован кем</th>
                    <th className="py-3 px-3">Срок действия</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242930]/60 text-xs">
                  {filteredKeys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        <KeyRound className="w-8 h-8 mx-auto text-gray-600 mb-2 opacity-50" />
                        <p className="font-semibold text-gray-400">Ключи не найдены</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Сгенерируйте новые ключи с помощью кнопки «Сгенерировать ключ»
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredKeys.map((k) => {
                      const isExpired = !!k.expires_at && new Date(k.expires_at) < new Date();
                      const isCopied = copiedKeyId === k.id;

                      let statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Свободен
                        </span>
                      );

                      if (k.is_used) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-400 border border-blue-800/50">
                            Использован
                          </span>
                        );
                      } else if (isExpired) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-800/50">
                            Истёк
                          </span>
                        );
                      }

                      return (
                        <tr key={k.id} className="hover:bg-white/[0.02] transition-colors">
                          {/* Ключ */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-300 tracking-wide text-xs sm:text-sm">
                                {k.key}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyKey(k.key, k.id)}
                                className={`p-1 rounded-md transition-colors cursor-pointer ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                                title="Скопировать ключ"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Создан: {new Date(k.created_at).toLocaleDateString('ru-RU')} ({k.created_by})
                            </div>
                          </td>

                          {/* Статус */}
                          <td className="py-3 px-3">{statusBadge}</td>

                          {/* Роль */}
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                k.role_to_grant === 'admin'
                                  ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
                                  : 'bg-blue-950/60 text-blue-300 border border-blue-800/60'
                              }`}
                            >
                              {k.role_to_grant === 'admin' ? 'Администратор' : 'Пользователь'}
                            </span>
                          </td>

                          {/* Заметка */}
                          <td className="py-3 px-3 text-gray-300">
                            {k.note ? <span className="italic">{k.note}</span> : <span className="text-gray-600">—</span>}
                          </td>

                          {/* Использован кем */}
                          <td className="py-3 px-3">
                            {k.is_used ? (
                              <div>
                                <div className="font-medium text-white">{k.used_by_email}</div>
                                <div className="text-[10px] text-gray-500">
                                  {k.used_at ? new Date(k.used_at).toLocaleString('ru-RU') : '—'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>

                          {/* Срок действия */}
                          <td className="py-3 px-3 text-gray-400">
                            {k.expires_at ? (
                              <span className={isExpired ? 'text-red-400 font-semibold' : ''}>
                                {new Date(k.expires_at).toLocaleDateString('ru-RU')}
                              </span>
                            ) : (
                              <span className="text-gray-500 font-medium">Бессрочно</span>
                            )}
                          </td>

                          {/* Действия */}
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setKeyToDelete(k)}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Удалить ключ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ВКЛАДКА 2: ПОЛЬЗОВАТЕЛИ СИСТЕМЫ                                      */}
      {/* ==================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Поиск пользователей */}
          <div className="flex items-center justify-between gap-3 bg-[#14161d] border border-[#242930] p-3 rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Поиск по имени, email или регистрационному ключу..."
                className="w-full h-9 pl-9 pr-3 bg-[#0d0e12] border border-[#242930] focus:border-purple-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none placeholder-gray-500"
              />
            </div>
            <div className="text-xs text-gray-400 font-semibold px-2">
              Всего: {filteredUsers.length}
            </div>
          </div>

          {/* Таблица пользователей */}
          <div className="bg-[#14161d] border border-[#242930] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#242930] bg-[#0f1117] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Пользователь</th>
                    <th className="py-3 px-3">Роль</th>
                    <th className="py-3 px-3">Статус</th>
                    <th className="py-3 px-3">Регистрация</th>
                    <th className="py-3 px-3">Ключ регистрации</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242930]/60 text-xs">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const initial = u.name ? u.name.charAt(0).toUpperCase() : '?';

                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Имя и email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0"
                              style={{ backgroundColor: u.avatar_color || '#8b5cf6' }}
                            >
                              {initial}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-600/30 text-purple-300 border border-purple-500/40">
                                    Вы
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Роль */}
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleToggleUserRole(u)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isSelf ? 'cursor-default opacity-80' : 'cursor-pointer hover:scale-105 active:scale-95'
                            } ${
                              u.role === 'admin'
                                ? 'bg-purple-950/60 text-purple-300 border border-purple-700/60'
                                : 'bg-blue-950/60 text-blue-300 border border-blue-700/60'
                            }`}
                            title={isSelf ? 'Нельзя изменить роль собственной учетной записи' : 'Нажмите, чтобы сменить роль'}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{u.role === 'admin' ? 'Администратор' : 'Пользователь'}</span>
                          </button>
                        </td>

                        {/* Статус */}
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                              isSelf ? 'cursor-default opacity-80' : 'cursor-pointer hover:scale-105 active:scale-95'
                            } ${
                              u.is_active
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                                : 'bg-red-950/40 text-red-400 border border-red-800/40'
                            }`}
                            title={isSelf ? 'Нельзя заблокировать себя' : 'Нажмите, чтобы заблокировать/разблокировать'}
                          >
                            {u.is_active ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            <span>{u.is_active ? 'Активен' : 'Заблокирован'}</span>
                          </button>
                        </td>

                        {/* Дата регистрации */}
                        <td className="py-3 px-3 text-gray-400">
                          {new Date(u.created_at).toLocaleDateString('ru-RU')}
                          {u.last_login_at && (
                            <div className="text-[10px] text-gray-500">
                              Вход: {new Date(u.last_login_at).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                        </td>

                        {/* Ключ */}
                        <td className="py-3 px-3">
                          {u.registration_key_used ? (
                            <span className="font-mono text-amber-300/90 text-[11px] bg-amber-950/30 px-2 py-0.5 rounded border border-amber-800/40">
                              {u.registration_key_used}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        {/* Действия */}
                        <td className="py-3 px-4 text-right">
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Удалить пользователя"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ВКЛАДКА 3: БАЗА ДАННЫХ И SQL                                         */}
      {/* ==================================================================== */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          <div className="bg-[#14161d] border border-[#242930] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-purple-400" />
                  SQL-миграция для Supabase
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-relaxed">
                  Если вы используете облачную базу Supabase, выполните следующий SQL-запрос в разделе <strong>SQL Editor</strong> вашей панели Supabase для создания таблиц пользователей и ключей.
                </p>
              </div>

              <button
                type="button"
                onClick={copySqlScript}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  copiedSql
                    ? 'bg-emerald-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/25'
                }`}
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Скопировать SQL</span>
                  </>
                )}
              </button>
            </div>

            {/* Блок с кодом SQL */}
            <div className="bg-[#090a0e] border border-[#242930] rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-purple-300 leading-relaxed">
                {sqlScript}
              </pre>
            </div>

            <div className="bg-[#181a24] border border-purple-900/40 rounded-xl p-3 text-xs text-gray-300 space-y-1">
              <div className="font-bold text-purple-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Безопасность и хранение:
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Пароли пользователей автоматически хешируются по алгоритму <strong>SHA-256</strong> с солью перед сохранением. Исходные пароли нигде не сохраняются в открытом виде.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно генерации ключей */}
      <GenerateKeyModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
      />

      {/* Модальное окно подтверждения удаления ключа */}
      <Modal
        isOpen={!!keyToDelete}
        onClose={() => setKeyToDelete(null)}
        title="Удаление ключа доступа"
        variant="error"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            Вы действительно хотите удалить ключ <strong className="text-amber-300 font-mono">{keyToDelete?.key}</strong>?
          </p>
          {keyToDelete?.is_used && (
            <div className="p-2.5 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs text-blue-300">
              Этот ключ уже был использован пользователем {keyToDelete.used_by_email}.
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setKeyToDelete(null)}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDeleteKey}
              disabled={isDeleting}
            >
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно подтверждения удаления пользователя */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="Удаление пользователя"
        variant="error"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            Вы действительно хотите удалить аккаунт <strong className="text-white">{userToDelete?.name}</strong> ({userToDelete?.email})?
          </p>
          <div className="p-2.5 bg-red-950/40 border border-red-800/40 rounded-xl text-xs text-red-300">
            Внимание: пользователь потеряет доступ к системе и не сможет войти.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setUserToDelete(null)}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
