'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  Database,
  Download,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '../../entities/model/AuthProvider';
import { useData } from '../../entities/model/DataProvider';
import { useToast } from '../../entities/model/ToastProvider';
import type { RegistrationKey, User, UserRole } from '../../shared/types';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { CockpitDropdown } from '../../shared/ui/CockpitDropdown';
import { CockpitModal } from '../../shared/ui/CockpitModal';
import { Input } from '../../shared/ui/Input';
import { Tooltip } from '../../shared/ui/Tooltip';
import { CockpitTiltCard } from '../../shared/ui/CockpitTiltCard';
import { usePersistentState } from '../../shared/lib/usePersistentState';
import {
  InventoryCockpitShell,
} from '../InventoryCockpit/InventoryCockpitShell';
import { GenerateKeyModal } from './components/GenerateKeyModal';
import { AdminWorkspaceNav, type AdminTab } from './components/AdminWorkspaceNav';
import {
  calculateAdminStats,
  calculateAdminUserStats,
  filterRegistrationKeys,
  getExportableKeys,
  getRegistrationKeyStatus,
  type RegistrationKeyStatus,
} from './model';

const KEY_FILTER_OPTIONS = [
  { value: 'all', label: 'Все ключи' },
  { value: 'active', label: 'Свободные', statusDotColor: 'green' as const },
  { value: 'used', label: 'Использованные', statusDotColor: 'cyan' as const },
  { value: 'expired', label: 'Истёкшие', statusDotColor: 'red' as const },
];

export function AdminPanel() {
  const {
    currentUser,
    users,
    registrationKeys,
    deleteKey,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    refreshAuthData,
  } = useAuth();
  const { isOnline } = useData();
  const { showSuccess, showError, showToast } = useToast();
  const [activeTab, setActiveTab] = usePersistentState<AdminTab>('3d_admin_active_tab_v2', 'keys');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [keySearch, setKeySearch] = usePersistentState('3d_admin_key_search', '');
  const [keyStatusFilter, setKeyStatusFilter] = usePersistentState<RegistrationKeyStatus | 'all'>('3d_admin_key_status_filter', 'all');
  const [userSearch, setUserSearch] = usePersistentState('3d_admin_user_search', '');
  const [keyToDelete, setKeyToDelete] = useState<RegistrationKey | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const stats = useMemo(
    () => calculateAdminStats(registrationKeys, users.length),
    [registrationKeys, users.length],
  );
  const userStats = useMemo(() => calculateAdminUserStats(users), [users]);
  const filteredKeys = useMemo(
    () => filterRegistrationKeys(registrationKeys, keySearch, keyStatusFilter),
    [registrationKeys, keySearch, keyStatusFilter],
  );
  const filteredUsers = useMemo(() => {
    const normalizedQuery = userSearch.trim().toLocaleLowerCase('ru');
    if (!normalizedQuery) return users;
    return users.filter((user) => [user.name, user.email, user.registration_key_used]
      .some((value) => value?.toLocaleLowerCase('ru').includes(normalizedQuery)));
  }, [users, userSearch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAuthData();
      showSuccess('Данные панели синхронизированы');
    } catch {
      showError('Не удалось обновить данные панели');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyKey = async (key: RegistrationKey) => {
    try {
      await navigator.clipboard.writeText(key.key);
      setCopiedKeyId(key.id);
      showSuccess('Ключ скопирован в буфер');
      window.setTimeout(() => setCopiedKeyId(null), 1800);
    } catch {
      showError('Браузер не разрешил доступ к буферу обмена');
    }
  };

  const handleExportKeys = () => {
    const activeKeys = getExportableKeys(registrationKeys);
    if (activeKeys.length === 0) {
      showToast('Нет действующих свободных ключей для экспорта', 'info');
      return;
    }
    const content = activeKeys.map((key, index) => [
      `${index + 1}. ${key.key}`,
      `   Роль: ${key.role_to_grant === 'admin' ? 'Администратор' : 'Пользователь'}`,
      `   Срок: ${key.expires_at ? new Date(key.expires_at).toLocaleDateString('ru-RU') : 'Бессрочно'}`,
      `   Заметка: ${key.note || '—'}`,
    ].join('\n')).join('\n\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `3dlabs_active_keys_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess(`Экспортировано ключей: ${activeKeys.length}`);
  };

  const confirmDeleteKey = async () => {
    if (!keyToDelete) return;
    setIsDeleting(true);
    try {
      const success = await deleteKey(keyToDelete.id);
      if (!success) throw new Error('delete rejected');
      setKeyToDelete(null);
      showSuccess('Ключ удалён');
    } catch {
      showError('Не удалось удалить ключ');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser?.id) {
      showError('Нельзя удалить собственный аккаунт');
      return;
    }
    setIsDeleting(true);
    try {
      const success = await deleteUser(userToDelete.id);
      if (!success) throw new Error('delete rejected');
      setUserToDelete(null);
      showSuccess(`Аккаунт ${userToDelete.name} удалён`);
    } catch {
      showError('Не удалось удалить пользователя');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleRole = async (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('Роль собственной учётной записи защищена', 'warning');
      return;
    }
    const nextRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      const success = await updateUserRole(user.id, nextRole);
      if (!success) throw new Error('role update rejected');
      showSuccess(`${user.name}: роль изменена на «${nextRole === 'admin' ? 'Администратор' : 'Пользователь'}»`);
    } catch {
      showError('Не удалось изменить роль');
    }
  };

  const toggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('Собственную учётную запись нельзя заблокировать', 'warning');
      return;
    }
    try {
      const success = await toggleUserStatus(user.id);
      if (!success) throw new Error('status update rejected');
      showSuccess(`${user.name}: ${user.is_active ? 'доступ заблокирован' : 'доступ восстановлен'}`);
    } catch {
      showError('Не удалось изменить статус');
    }
  };

  const recordCount = activeTab === 'keys' ? registrationKeys.length : activeTab === 'users' ? users.length : 3;
  const filteredCount = activeTab === 'keys' ? filteredKeys.length : activeTab === 'users' ? filteredUsers.length : 3;
  const sectionCopy = activeTab === 'keys'
    ? { eyebrow: 'ACCESS KEYS', title: 'Ключи для регистрации', description: 'Создавайте приглашения, проверяйте срок действия и удаляйте больше не нужные ключи.' }
    : activeTab === 'users'
      ? { eyebrow: 'USER ACCESS', title: 'Пользователи и роли', description: 'Контролируйте активность аккаунтов и выдавайте административные права осознанно.' }
      : { eyebrow: 'SYSTEM STATUS', title: 'Состояние контура доступа', description: 'Проверьте подключение, текущую роль и встроенные ограничения безопасности.' };

  return (
    <InventoryCockpitShell
      section="ADMIN_CONTROL"
      sectionLabel="Панель администратора"
      icon={<ShieldCheck className="h-full w-full" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      isOnline={isOnline}
      recordCount={recordCount}
      filteredCount={filteredCount}
      actions={(
        <>
          <CockpitButton onClick={handleRefresh} icon={RefreshCw} disabled={isRefreshing} title="Синхронизировать пользователей и ключи">
            {isRefreshing ? 'Синхронизация...' : 'Обновить'}
          </CockpitButton>
          {activeTab === 'keys' ? <CockpitButton onClick={() => setIsGenerateModalOpen(true)} icon={Plus} isActive>Создать ключ</CockpitButton> : null}
        </>
      )}
    >
      <div className="space-y-3 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">ADMIN WORKSPACE</p>
              <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold ${isOnline ? 'border-emerald-800/40 bg-emerald-950/60 text-emerald-400' : 'border-amber-800/40 bg-amber-950/60 text-amber-400'}`}>{isOnline ? 'CLOUD ONLINE' : 'LOCAL MODE'}</span>
              {isExpanded ? <span className="rounded border border-white/10 bg-neutral-950 px-2 py-0.5 font-mono text-[9px] text-neutral-500">ПОДРОБНЫЙ РЕЖИМ</span> : null}
            </div>
            <h2 className="mt-1.5 font-sans text-base font-bold text-white">Управление доступом по понятным сценариям</h2>
            <p className="mt-1 font-sans text-xs text-neutral-400">Выберите слева ключи, пользователей или состояние системы — остальные блоки не будут мешать.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-neutral-950/55 px-3 py-2 text-right">
            <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">ТЕКУЩАЯ СЕССИЯ</p>
            <p className="mt-1 font-sans text-xs font-semibold text-white">{currentUser?.name ?? 'Администратор'}</p>
            <p className="font-mono text-[9px] text-emerald-400">ADMINISTRATOR</p>
          </div>
        </div>

        <div className="grid items-start gap-3 lg:grid-cols-[250px_minmax(0,1fr)]">
          <AdminWorkspaceNav activeTab={activeTab} onSelectTab={setActiveTab} keyCount={stats.total} userCount={userStats.total} />

          <section aria-labelledby="admin-section-title" className="min-w-0 rounded-xl border border-white/10 bg-white/[0.025] p-3 sm:p-4">
            <div className="mb-4 border-b border-white/10 pb-4">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500">{sectionCopy.eyebrow}</p>
              <h2 id="admin-section-title" className="mt-1 font-sans text-base font-bold text-white">{sectionCopy.title}</h2>
              <p className="mt-1 font-sans text-xs leading-relaxed text-neutral-400">{sectionCopy.description}</p>
            </div>

        {activeTab === 'keys' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <MiniAdminMetric label="Свободные" value={stats.active} detail="можно выдать" tone="good" />
              <MiniAdminMetric label="Использованы" value={stats.used} detail="аккаунты созданы" />
              <MiniAdminMetric label="Истекли" value={stats.expired} detail="не действуют" tone="warn" />
            </div>
            <div className="relative z-20 flex flex-col gap-2 rounded-xl border border-white/10 bg-neutral-900/70 p-2.5 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                <Input aria-label="Поиск ключа" placeholder="Ключ, заметка, email..." value={keySearch} onChange={(event) => setKeySearch(event.target.value)} className="pl-8" />
              </div>
              <CockpitDropdown
                value={keyStatusFilter}
                onChange={(value) => setKeyStatusFilter(value as RegistrationKeyStatus | 'all')}
                options={KEY_FILTER_OPTIONS}
                variant="ghost"
                align="right"
                dropdownWidth={210}
              />
              <CockpitButton onClick={handleExportKeys} icon={Download}>Экспорт действующих</CockpitButton>
            </div>
            <KeysTable keys={filteredKeys} copiedKeyId={copiedKeyId} onCopy={handleCopyKey} onDelete={setKeyToDelete} />
          </div>
        ) : null}

        {activeTab === 'users' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <MiniAdminMetric label="Активны" value={userStats.active} detail={`${userStats.activePercent.toFixed(0)}% аккаунтов`} tone="good" />
              <MiniAdminMetric label="Заблокированы" value={userStats.blocked} detail="доступ остановлен" tone="warn" />
              <MiniAdminMetric label="Администраторы" value={userStats.admins} detail="расширенные права" />
            </div>
            <div className="relative flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-900/70 p-2.5">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                <Input aria-label="Поиск пользователя" placeholder="Имя, email или регистрационный ключ..." value={userSearch} onChange={(event) => setUserSearch(event.target.value)} className="pl-8" />
              </div>
              <span className="hidden font-mono text-[10px] text-neutral-500 sm:inline">FOUND: {filteredUsers.length}</span>
            </div>
            <UsersTable users={filteredUsers} currentUserId={currentUser?.id} onToggleRole={toggleRole} onToggleStatus={toggleStatus} onDelete={setUserToDelete} />
          </div>
        ) : null}

        {activeTab === 'system' ? (
          <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-sans text-sm font-bold text-white">Подключение и права</h3>
                  <p className="mt-1 font-sans text-xs text-neutral-400">Основные признаки, что панель может безопасно выполнять операции.</p>
                </div>
                <Activity className={`h-5 w-5 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
              </div>
              <div className="divide-y divide-white/5">
                <SystemRow label="База данных" value={isOnline ? 'SUPABASE CLOUD · ONLINE' : 'LOCAL CACHE · OFFLINE'} tone={isOnline ? 'good' : 'warn'} />
                <SystemRow label="Текущая роль" value={currentUser?.role === 'admin' ? 'ADMINISTRATOR' : 'USER'} tone={currentUser?.role === 'admin' ? 'good' : 'warn'} />
                <SystemRow label="Активные аккаунты" value={`${users.filter((user) => user.is_active).length} / ${users.length}`} />
                <SystemRow label="Свободные ключи" value={String(stats.active)} />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="font-sans text-sm font-bold text-white">Что панель не позволит сделать</h3>
              <div className="mt-3 space-y-2">
                <SecurityNote icon={ShieldCheck} title="Самозащита аккаунта" text="Нельзя удалить, заблокировать или понизить собственную учётную запись из этой панели." />
                <SecurityNote icon={KeyRound} title="Экспорт без просроченных" text="В файл попадают только свободные ключи с действующим сроком." />
                <SecurityNote icon={Database} title="Серверная авторизация" text="Изменение ролей выполняется через административную RPC; политики RLS остаются источником истины." />
              </div>
            </div>
          </div>
        ) : null}
          </section>
        </div>

        {isExpanded ? (
          <AdminExpandedOverview stats={stats} userStats={userStats} isOnline={isOnline} currentUserName={currentUser?.name ?? 'Администратор'} />
        ) : null}
      </div>

      <GenerateKeyModal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} />

      <CockpitModal
        isOpen={Boolean(keyToDelete)}
        onClose={() => !isDeleting && setKeyToDelete(null)}
        title="Удаление ключа"
        subtitle="Регистрационный доступ"
        variant="error"
        maxWidth="md"
        footer={(
          <div className="flex w-full justify-end gap-2">
            <CockpitButton onClick={() => setKeyToDelete(null)} disabled={isDeleting}>Закрыть</CockpitButton>
            <CockpitButton onClick={confirmDeleteKey} icon={Trash2} disabled={isDeleting} className="border-rose-800/40 bg-rose-950/60 text-rose-300">
              {isDeleting ? 'Удаление...' : 'Удалить ключ'}
            </CockpitButton>
          </div>
        )}
      >
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4 font-mono text-sm font-bold tracking-wider text-amber-300">{keyToDelete?.key}</div>
      </CockpitModal>

      <CockpitModal
        isOpen={Boolean(userToDelete)}
        onClose={() => !isDeleting && setUserToDelete(null)}
        title="Удаление пользователя"
        subtitle={userToDelete?.name || 'Аккаунт'}
        variant="error"
        maxWidth="md"
        footer={(
          <div className="flex w-full justify-end gap-2">
            <CockpitButton onClick={() => setUserToDelete(null)} disabled={isDeleting}>Закрыть</CockpitButton>
            <CockpitButton onClick={confirmDeleteUser} icon={Trash2} disabled={isDeleting} className="border-rose-800/40 bg-rose-950/60 text-rose-300">
              {isDeleting ? 'Удаление...' : 'Удалить аккаунт'}
            </CockpitButton>
          </div>
        )}
      >
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
          <p className="font-sans text-sm font-bold text-white">{userToDelete?.name}</p>
          <p className="mt-1 font-mono text-[11px] text-neutral-400">{userToDelete?.email}</p>
        </div>
      </CockpitModal>
    </InventoryCockpitShell>
  );
}

function MiniAdminMetric({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  detail: string;
  tone?: 'neutral' | 'good' | 'warn';
}) {
  const valueClass = tone === 'good' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : 'text-white';
  const tiltTone = tone === 'good' ? 'emerald' : tone === 'warn' ? 'amber' : 'cyan';

  return (
    <CockpitTiltCard
      tone={tiltTone}
      className="p-3 flex flex-col justify-between"
      backContent={(
        <div className="flex h-full flex-col justify-between font-mono text-[10px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400 truncate">
              {label}
            </span>
          </div>
          <div className="my-auto space-y-1.5 py-1">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Количество:</span>
              <span className="font-bold text-white tabular-nums">{value}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-neutral-500">Статус:</span>
              <span className="text-neutral-300 tabular-nums">{detail}</span>
            </div>
          </div>
        </div>
      )}
    >
      <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${valueClass}`}>{value}</p>
      <p className="truncate font-sans text-[10px] text-neutral-500">{detail}</p>
    </CockpitTiltCard>
  );
}

function AdminExpandedOverview({
  stats,
  userStats,
  isOnline,
  currentUserName,
}: {
  stats: ReturnType<typeof calculateAdminStats>;
  userStats: ReturnType<typeof calculateAdminUserStats>;
  isOnline: boolean;
  currentUserName: string;
}) {
  const keyTotal = Math.max(1, stats.total);
  return (
    <section aria-label="Расширенная аналитика администрирования" className="grid gap-3 xl:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">FULLSCREEN · ACCESS OVERVIEW</p>
        <h2 className="mt-1.5 font-sans text-base font-bold text-white">Карта доступа мастерской</h2>
        <p className="mt-1 font-sans text-xs text-neutral-400">Подробная сводка показывает не записи, а состояние жизненного цикла доступа.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-neutral-950/55 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-sans text-xs font-semibold text-white">Регистрационные ключи</span>
              <span className="font-mono text-[10px] text-neutral-500 tabular-nums">{stats.total} ВСЕГО</span>
            </div>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/5">
              <div className="bg-emerald-400/75" style={{ width: `${stats.active / keyTotal * 100}%` }} />
              <div className="bg-cyan-400/75" style={{ width: `${stats.used / keyTotal * 100}%` }} />
              <div className="bg-rose-400/70" style={{ width: `${stats.expired / keyTotal * 100}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[9px]">
              <AccessLegend color="bg-emerald-400" label="Свободны" value={stats.active} />
              <AccessLegend color="bg-cyan-400" label="Выданы" value={stats.used} />
              <AccessLegend color="bg-rose-400" label="Истекли" value={stats.expired} />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-neutral-950/55 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-sans text-xs font-semibold text-white">Учетные записи</span>
              <span className="font-mono text-[10px] text-neutral-500 tabular-nums">{userStats.total} ВСЕГО</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-emerald-400/75" style={{ width: `${userStats.activePercent}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[9px]">
              <AccessLegend color="bg-emerald-400" label="Активны" value={userStats.active} />
              <AccessLegend color="bg-amber-400" label="Блок" value={userStats.blocked} />
              <AccessLegend color="bg-cyan-400" label="Админы" value={userStats.admins} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500">SESSION & GUARDRAILS</p>
        <h2 className="mt-1.5 font-sans text-base font-bold text-white">Контрольная сводка</h2>
        <div className="mt-3 divide-y divide-white/5 rounded-lg border border-white/10 bg-neutral-950/55 px-3">
          <SystemRow label="Подключение" value={isOnline ? 'SUPABASE CLOUD · ONLINE' : 'LOCAL CACHE · OFFLINE'} tone={isOnline ? 'good' : 'warn'} />
          <SystemRow label="Оператор" value={currentUserName} />
          <SystemRow label="Роль" value="ADMINISTRATOR" tone="good" />
        </div>
        <div className="mt-3 space-y-2">
          <SecurityNote icon={ShieldCheck} title="Собственный аккаунт защищён" text="Панель блокирует удаление, деактивацию и смену собственной роли." />
          <SecurityNote icon={KeyRound} title="Экспорт очищен" text="В выгрузку попадают только свободные ключи с действующим сроком." />
        </div>
      </div>
    </section>
  );
}

function AccessLegend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="min-w-0">
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${color}`} />
      <span className="text-neutral-500">{label}</span>
      <span className="mt-1 block font-bold text-white tabular-nums">{value}</span>
    </div>
  );
}

function KeysTable({ keys, copiedKeyId, onCopy, onDelete }: { keys: RegistrationKey[]; copiedKeyId: string | null; onCopy: (key: RegistrationKey) => void; onDelete: (key: RegistrationKey) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left font-mono text-xs">
          <thead className="border-b border-white/10 bg-neutral-950 text-[9px] uppercase tracking-wider text-neutral-500">
            <tr><th className="px-3 py-2.5">Ключ</th><th className="px-3 py-2.5">Статус</th><th className="px-3 py-2.5">Роль</th><th className="px-3 py-2.5">Заметка</th><th className="px-3 py-2.5">Получатель</th><th className="px-3 py-2.5">Срок</th><th className="px-3 py-2.5 text-right">Действия</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {keys.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-12 text-center text-neutral-500">[ КЛЮЧИ НЕ НАЙДЕНЫ ]</td></tr>
            ) : keys.map((key) => {
              const status = getRegistrationKeyStatus(key);
              return (
                <tr key={key.id} className=" hover:bg-white/[0.035]">
                  <td className="px-3 py-3"><span className="font-bold tracking-wider text-amber-300">{key.key}</span></td>
                  <td className="px-3 py-3"><KeyStatusBadge status={status} /></td>
                  <td className="px-3 py-3 text-neutral-300">{key.role_to_grant === 'admin' ? 'ADMIN' : 'USER'}</td>
                  <td className="max-w-48 truncate px-3 py-3 text-neutral-400">{key.note || '—'}</td>
                  <td className="max-w-52 truncate px-3 py-3 text-neutral-400">{key.used_by_email || '—'}</td>
                  <td className="px-3 py-3 text-neutral-400">{key.expires_at ? new Date(key.expires_at).toLocaleDateString('ru-RU') : 'Бессрочно'}</td>
                  <td className="px-3 py-3"><div className="flex justify-end gap-1">
                    <Tooltip content="Скопировать ключ"><button type="button" onClick={() => onCopy(key)} className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-neutral-400 hover:text-white" aria-label="Скопировать ключ">{copiedKeyId === key.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button></Tooltip>
                    <Tooltip content="Удалить ключ"><button type="button" onClick={() => onDelete(key)} className="rounded-lg border border-rose-500/15 bg-rose-500/5 p-1.5 text-rose-400 hover:bg-rose-500/10" aria-label="Удалить ключ"><Trash2 className="h-3.5 w-3.5" /></button></Tooltip>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KeyStatusBadge({ status }: { status: RegistrationKeyStatus }) {
  const styles = status === 'active' ? 'border-emerald-800/40 bg-emerald-950/60 text-emerald-400' : status === 'used' ? 'border-cyan-800/40 bg-cyan-950/60 text-cyan-400' : 'border-rose-800/40 bg-rose-950/60 text-rose-400';
  return <span className={`rounded border px-2 py-0.5 text-[9px] font-bold ${styles}`}>{status === 'active' ? 'СВОБОДЕН' : status === 'used' ? 'ИСПОЛЬЗОВАН' : 'ИСТЁК'}</span>;
}

function UsersTable({ users, currentUserId, onToggleRole, onToggleStatus, onDelete }: { users: User[]; currentUserId?: string; onToggleRole: (user: User) => void; onToggleStatus: (user: User) => void; onDelete: (user: User) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-left font-mono text-xs">
          <thead className="border-b border-white/10 bg-neutral-950 text-[9px] uppercase tracking-wider text-neutral-500"><tr><th className="px-3 py-2.5">Пользователь</th><th className="px-3 py-2.5">Роль</th><th className="px-3 py-2.5">Статус</th><th className="px-3 py-2.5">Регистрация</th><th className="px-3 py-2.5">Ключ</th><th className="px-3 py-2.5 text-right">Действия</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {users.length === 0 ? <tr><td colSpan={6} className="px-3 py-12 text-center text-neutral-500">[ ПОЛЬЗОВАТЕЛИ НЕ НАЙДЕНЫ ]</td></tr> : users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className=" hover:bg-white/[0.035]">
                  <td className="px-3 py-3"><div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 font-sans font-bold text-white" style={{ backgroundColor: user.avatar_color || '#262626' }}>{user.name?.charAt(0).toUpperCase() || '?'}</span><div className="min-w-0"><div className="flex items-center gap-1.5"><span className="truncate font-sans font-semibold text-white">{user.name}</span>{isSelf && <span className="rounded border border-white/10 bg-white/5 px-1.5 text-[8px] text-neutral-400">ВЫ</span>}</div><span className="block truncate text-[10px] text-neutral-500">{user.email}</span></div></div></td>
                  <td className="px-3 py-3"><button type="button" disabled={isSelf} onClick={() => onToggleRole(user)} className={`rounded border px-2 py-1 text-[9px] font-bold ${user.role === 'admin' ? 'border-amber-800/40 bg-amber-950/50 text-amber-300' : 'border-cyan-800/40 bg-cyan-950/50 text-cyan-300'} disabled:cursor-default disabled:opacity-60`}>{user.role === 'admin' ? 'ADMIN' : 'USER'}</button></td>
                  <td className="px-3 py-3"><button type="button" disabled={isSelf} onClick={() => onToggleStatus(user)} className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-bold ${user.is_active ? 'border-emerald-800/40 bg-emerald-950/50 text-emerald-400' : 'border-rose-800/40 bg-rose-950/50 text-rose-400'} disabled:cursor-default disabled:opacity-60`}>{user.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}{user.is_active ? 'ACTIVE' : 'BLOCKED'}</button></td>
                  <td className="px-3 py-3 text-neutral-400">{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                  <td className="max-w-44 truncate px-3 py-3 text-[10px] text-amber-300/80">{user.registration_key_used || '—'}</td>
                  <td className="px-3 py-3 text-right">{!isSelf && <Tooltip content="Удалить пользователя"><button type="button" onClick={() => onDelete(user)} className="rounded-lg border border-rose-500/15 bg-rose-500/5 p-1.5 text-rose-400 hover:bg-rose-500/10" aria-label="Удалить пользователя"><Trash2 className="h-3.5 w-3.5" /></button></Tooltip>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SystemRow({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' }) {
  return <div className="flex items-center justify-between gap-4 py-3 font-mono text-[11px]"><span className="text-neutral-500">{label}</span><span className={`text-right font-semibold ${tone === 'good' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : 'text-neutral-200'}`}>{value}</span></div>;
}

function SecurityNote({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return <div className="flex gap-3 rounded-lg border border-white/5 bg-neutral-950/50 p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" /><div><p className="font-mono text-[10px] font-bold uppercase tracking-wider text-white">{title}</p><p className="mt-1 font-sans text-xs leading-relaxed text-neutral-400">{text}</p></div></div>;
}
