'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../entities/model/AuthProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { RegistrationKey, User, UserRole } from '../../shared/types';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { Modal } from '../../shared/ui/Modal';
import { Tooltip } from '../../shared/ui/Tooltip';
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
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Download,
  Terminal,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { usePersistentState } from '../../shared/lib/usePersistentState';

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

  const [activeTab, setActiveTab] = usePersistentState<'keys' | 'users' | 'database'>('3d_admin_active_tab', 'keys');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Состояния фильтрации ключей
  const [keySearch, setKeySearch] = usePersistentState('3d_admin_key_search', '');
  const [keyStatusFilter, setKeyStatusFilter] = usePersistentState<'all' | 'active' | 'used' | 'expired'>('3d_admin_key_status_filter', 'all');
  
  // Состояния фильтрации пользователей
  const [userSearch, setUserSearch] = usePersistentState('3d_admin_user_search', '');

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
      const matchesSearch = 
        !searchLower ||
        k.key.toLowerCase().includes(searchLower) ||
        (k.note && k.note.toLowerCase().includes(searchLower)) ||
        (k.used_by_email && k.used_by_email.toLowerCase().includes(searchLower)) ||
        (k.created_by && k.created_by.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

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

  const handleCopyKey = (keyString: string, id: string) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKeyId(id);
    showSuccess(`Ключ ${keyString} скопирован в буфер`);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

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

  const sqlScript = `-- 1. Создание таблицы профилей пользователей
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

-- 3. Добавление user_id ко всем таблицам
ALTER TABLE public.printers ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.filaments ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.saved_calculations ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Включение Row Level Security (RLS)
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
    <div className="rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden font-mono text-xs space-y-4">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3 bg-neutral-900/60 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-400/40 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 border border-yellow-400/40 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40 inline-block" />
          </div>

          <div className="flex items-center gap-2 pl-3 border-l border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-white font-mono font-bold text-xs sm:text-sm tracking-wider">
              § 3D-LABS // ПАНЕЛЬ АДМИНИСТРАТОРА
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <CockpitButton
            onClick={() => setIsGenerateModalOpen(true)}
            icon={Plus}
            isActive={true}
            className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
          >
            Сгенерировать ключ
          </CockpitButton>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Метрики */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-neutral-900 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400 shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-white font-mono">{stats.total}</div>
              <div className="text-[10px] text-neutral-400 uppercase">Всего ключей</div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-400 font-mono">{stats.active}</div>
              <div className="text-[10px] text-neutral-400 uppercase">Свободные</div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-cyan-400 font-mono">{stats.used}</div>
              <div className="text-[10px] text-neutral-400 uppercase">Использованные</div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-white font-mono">{stats.usersTotal}</div>
              <div className="text-[10px] text-neutral-400 uppercase">Пользователей</div>
            </div>
          </div>
        </div>

        {/* Переключатель вкладок админки */}
        <div className="bg-neutral-900 border border-white/10 p-1 rounded-xl flex items-center gap-1 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setActiveTab('keys')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'keys'
                ? 'bg-white/15 text-white border border-white/20 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Ключи доступа ({stats.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-white/15 text-white border border-white/20 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Пользователи ({stats.usersTotal})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-white/15 text-white border border-white/20 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>База данных и SQL</span>
          </button>
        </div>

        {/* ВКЛАДКА 1: КЛЮЧИ */}
        {activeTab === 'keys' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900 border border-white/10 p-3 rounded-xl">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={keySearch}
                  onChange={(e) => setKeySearch(e.target.value)}
                  placeholder="Поиск по ключу, заметке или email..."
                  className="w-full h-8 pl-8 pr-3 bg-neutral-950 border border-white/10 focus:border-cyan-400 rounded-lg text-xs text-white focus:outline-none placeholder-neutral-500 font-mono"
                />
              </div>

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
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      keyStatusFilter === filter.id
                        ? 'bg-white/15 text-white border border-white/20 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <CockpitButton
                type="button"
                onClick={handleExportKeys}
                icon={Download}
              >
                Экспорт TXT
              </CockpitButton>
            </div>

            {/* Таблица ключей */}
            <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-white/10 bg-neutral-950 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Ключ доступа</th>
                      <th className="py-2.5 px-3">Статус</th>
                      <th className="py-2.5 px-3">Роль</th>
                      <th className="py-2.5 px-3">Заметка</th>
                      <th className="py-2.5 px-3">Использован</th>
                      <th className="py-2.5 px-3">Срок</th>
                      <th className="py-2.5 px-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredKeys.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-500">
                          [ Ключи не найдены ]
                        </td>
                      </tr>
                    ) : (
                      filteredKeys.map((k) => {
                        const isExpired = !!k.expires_at && new Date(k.expires_at) < new Date();
                        const isCopied = copiedKeyId === k.id;

                        let statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                            Свободен
                          </span>
                        );

                        if (k.is_used) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                              Использован
                            </span>
                          );
                        } else if (isExpired) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40">
                              Истёк
                            </span>
                          );
                        }

                        return (
                          <tr key={k.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-amber-300 text-xs">
                                  {k.key}
                                </span>
                                <Tooltip content="Скопировать ключ">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyKey(k.key, k.id)}
                                    className="p-1 text-neutral-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                                  >
                                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </Tooltip>
                              </div>
                            </td>

                            <td className="py-2.5 px-3">{statusBadge}</td>

                            <td className="py-2.5 px-3">
                              <span className="text-[10px] font-mono uppercase text-neutral-300">
                                {k.role_to_grant === 'admin' ? 'Админ' : 'Пользователь'}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-neutral-400">
                              {k.note || '—'}
                            </td>

                            <td className="py-2.5 px-3 text-neutral-300">
                              {k.is_used ? k.used_by_email : '—'}
                            </td>

                            <td className="py-2.5 px-3 text-neutral-400">
                              {k.expires_at ? new Date(k.expires_at).toLocaleDateString('ru-RU') : 'Бессрочно'}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <Tooltip content="Удалить ключ">
                                <button
                                  type="button"
                                  onClick={() => setKeyToDelete(k)}
                                  className="p-1.5 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/40 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </Tooltip>
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

        {/* ВКЛАДКА 2: ПОЛЬЗОВАТЕЛИ */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 bg-neutral-900 border border-white/10 p-3 rounded-xl">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Поиск по имени или email..."
                  className="w-full h-8 pl-8 pr-3 bg-neutral-950 border border-white/10 focus:border-cyan-400 rounded-lg text-xs text-white focus:outline-none placeholder-neutral-500 font-mono"
                />
              </div>
              <div className="text-xs text-neutral-400 font-mono px-2">
                Всего: {filteredUsers.length}
              </div>
            </div>

            {/* Таблица пользователей */}
            <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-white/10 bg-neutral-950 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Пользователь</th>
                      <th className="py-2.5 px-3">Роль</th>
                      <th className="py-2.5 px-3">Статус</th>
                      <th className="py-2.5 px-3">Регистрация</th>
                      <th className="py-2.5 px-3">Ключ</th>
                      <th className="py-2.5 px-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredUsers.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      const initial = u.name ? u.name.charAt(0).toUpperCase() : '?';

                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shadow-sm text-xs shrink-0"
                                style={{ backgroundColor: u.avatar_color || '#8b5cf6' }}
                              >
                                {initial}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5 font-sans">
                                  <span>{u.name}</span>
                                  {isSelf && (
                                    <span className="px-1 py-0.2 rounded text-[9px] bg-purple-950/60 text-purple-300 border border-purple-800/40 font-mono">
                                      Вы
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-400">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => handleToggleUserRole(u)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1 border ${
                                u.role === 'admin'
                                  ? 'bg-purple-950/60 text-purple-300 border-purple-800/40'
                                  : 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40'
                              } ${isSelf ? 'cursor-default opacity-80' : 'cursor-pointer hover:scale-105'}`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>{u.role === 'admin' ? 'Админ' : 'Юзер'}</span>
                            </button>
                          </td>

                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all flex items-center gap-1 border ${
                                u.is_active
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                                  : 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                              } ${isSelf ? 'cursor-default opacity-80' : 'cursor-pointer hover:scale-105'}`}
                            >
                              {u.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              <span>{u.is_active ? 'Активен' : 'Блок'}</span>
                            </button>
                          </td>

                          <td className="py-2.5 px-3 text-neutral-400">
                            {new Date(u.created_at).toLocaleDateString('ru-RU')}
                          </td>

                          <td className="py-2.5 px-3">
                            {u.registration_key_used ? (
                              <span className="font-mono text-amber-300/90 text-[10px] bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-800/40">
                                {u.registration_key_used}
                              </span>
                            ) : (
                              <span className="text-neutral-600">—</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            {!isSelf && (
                              <Tooltip content="Удалить пользователя">
                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(u)}
                                  className="p-1.5 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/40 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </Tooltip>
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

        {/* ВКЛАДКА 3: DATABASE & SQL */}
        {activeTab === 'database' && (
          <div className="bg-neutral-900 border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  SQL-миграция для Supabase
                </h3>
                <p className="text-xs text-neutral-400 mt-1 font-sans leading-relaxed">
                  Выполните следующий SQL-запрос в разделе <strong>SQL Editor</strong> вашей панели Supabase для синхронизации схемы.
                </p>
              </div>

              <CockpitButton
                type="button"
                onClick={copySqlScript}
                icon={copiedSql ? Check : Copy}
                isActive={copiedSql}
              >
                {copiedSql ? 'Скопировано!' : 'Скопировать SQL'}
              </CockpitButton>
            </div>

            <div className="bg-neutral-950 border border-white/10 rounded-xl p-3.5 overflow-x-auto">
              <pre className="text-xs font-mono text-neutral-300 leading-relaxed">
                {sqlScript}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно генерации ключей */}
      <GenerateKeyModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
      />

      {/* Модальное окно удаления ключа */}
      <Modal
        isOpen={!!keyToDelete}
        onClose={() => setKeyToDelete(null)}
        title="§ 3D-LABS // DELETE_KEY"
        variant="error"
        maxWidth="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <CockpitButton onClick={() => setKeyToDelete(null)}>Отмена</CockpitButton>
            <CockpitButton
              onClick={handleConfirmDeleteKey}
              className="bg-rose-950/60 text-rose-300 border-rose-800/40 hover:bg-rose-900/80 hover:text-white font-bold"
            >
              Удалить
            </CockpitButton>
          </div>
        }
      >
        <p className="text-xs text-neutral-300 font-sans">
          Вы действительно хотите удалить ключ <strong className="text-amber-300 font-mono">{keyToDelete?.key}</strong>?
        </p>
      </Modal>

      {/* Модальное окно удаления пользователя */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="§ 3D-LABS // DELETE_USER"
        variant="error"
        maxWidth="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <CockpitButton onClick={() => setUserToDelete(null)}>Отмена</CockpitButton>
            <CockpitButton
              onClick={handleConfirmDeleteUser}
              className="bg-rose-950/60 text-rose-300 border-rose-800/40 hover:bg-rose-900/80 hover:text-white font-bold"
            >
              Удалить
            </CockpitButton>
          </div>
        }
      >
        <p className="text-xs text-neutral-300 font-sans">
          Вы действительно хотите удалить аккаунт <strong className="text-white font-mono">{userToDelete?.name}</strong> ({userToDelete?.email})?
        </p>
      </Modal>
    </div>
  );
}
