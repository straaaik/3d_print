'use client';

import { useState } from 'react';
import { MousePointer2, Pencil, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../entities/model/AuthProvider';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { ProfileBadge } from '../../../shared/ui/ProfileBadge';
import { EditProfileModal } from '../../UserMenu/EditProfileModal';

export function ProfileSettingsTab() {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  if (!currentUser) return null;

  const joined = new Date(currentUser.created_at);
  const memberSince = Number.isNaN(joined.getTime()) ? '—' : joined.toLocaleDateString('ru-RU', { timeZone: 'UTC' });
  const memberId = currentUser.id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
  const role = currentUser.role === 'admin' ? 'Администратор' : 'Мастер 3D-печати';

  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="relative isolate min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#050606] px-2 pb-6 sm:px-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:96px_96px]" />
        <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[55%] w-full text-white/[0.07]" viewBox="0 0 1400 500" fill="none" preserveAspectRatio="none">
          <path d="M-100 400C160 370 360 80 500 220S720 530 930 210 1170 200 1500 250M-100 410C170 390 370 90 510 235S735 550 940 225 1180 220 1500 260M-100 460C210 340 280 270 400 340S650 570 980 300 1190 310 1500 420" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <ProfileBadge name={currentUser.name} email={currentUser.email} role={role} memberId={memberId} memberSince={memberSince} active={currentUser.is_active} />
        <p className="flex items-center justify-center gap-2 font-mono text-[10px] text-neutral-500 [@media(hover:none)]:hidden motion-reduce:hidden"><MousePointer2 className="h-3 w-3" />Наведите курсор на бейдж</p>
      </div>
      <div className="min-w-0 space-y-4">
        <section aria-label="Данные аккаунта" className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
            <span style={{ backgroundColor: currentUser.avatar_color || '#737373' }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-sans text-lg font-bold text-white">{currentUser.name?.charAt(0).toUpperCase() || '?'}</span>
            <div><h3 className="font-sans text-sm font-semibold text-white">Данные аккаунта</h3><p className="mt-1 font-mono text-[10px] text-neutral-500">ЛИЧНАЯ ИНФОРМАЦИЯ</p></div>
          </div>
          <dl className="space-y-4">
            {([['Имя', currentUser.name || 'Участник'], ['Электронная почта', currentUser.email || 'Не указана'], ['Роль', role], ['Дата регистрации', memberSince]]).map(([label, value]) => <div key={label}><dt className="font-sans text-[11px] text-neutral-400">{label}</dt><dd className="mt-1 break-words font-mono text-xs leading-relaxed text-neutral-200 tabular-nums">{value}</dd></div>)}
          </dl>
          <div className="mt-5 border-t border-white/10 pt-4"><CockpitButton icon={Pencil} onClick={() => setIsEditing(true)}>Редактировать профиль</CockpitButton></div>
        </section>
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-neutral-400" /><h3 className="font-sans text-sm font-semibold text-white">Доступ к аккаунту</h3></div>
          <p className="mt-3 font-sans text-xs leading-relaxed text-neutral-400">Имя, почта, цвет аватара и пароль меняются в окне редактирования профиля.</p>
          <p className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] text-neutral-300"><span className={`h-1.5 w-1.5 rounded-full ${currentUser.is_active ? 'bg-emerald-400' : 'bg-neutral-500'}`} />{currentUser.is_active ? 'АККАУНТ АКТИВЕН' : 'АККАУНТ НЕАКТИВЕН'}</p>
        </section>
      </div>
      <EditProfileModal isOpen={isEditing} onClose={() => setIsEditing(false)} />
    </div>
  );
}
