'use client';

import { useState } from 'react';
import { Pencil, MousePointer2 } from 'lucide-react';
import { useAuth } from '@/entities/model/AuthProvider';
import { MainNavbar } from '@/shared/ui/MainNavbar';
import { CockpitButton } from '@/shared/ui/CockpitButton';
import { ProfileBadge } from '@/shared/ui/ProfileBadge';
import { EditProfileModal } from '@/widgets/UserMenu/EditProfileModal';

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  if (!currentUser) return null;

  const joined = new Date(currentUser.created_at);
  const memberSince = Number.isNaN(joined.getTime()) ? '—' : joined.toLocaleDateString('ru-RU', { timeZone: 'UTC' });
  const memberId = currentUser.id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-dot-grid text-white flex flex-col justify-between">
      <main className="w-full max-w-[1540px] mx-auto px-3 sm:px-6 py-4 md:py-6 space-y-5">
        <MainNavbar />
        <section aria-label="Профиль пользователя" className="relative overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/90 backdrop-blur-2xl shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)]">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-neutral-900/60 px-4 sm:px-5 py-3 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" /></div>
              <span className="h-4 w-px bg-white/15" />
              <span className="font-bold tracking-wider text-neutral-200">3D-LABS // ПРОФИЛЬ</span>
            </div>
            <CockpitButton icon={Pencil} onClick={() => setIsEditing(true)}>Редактировать профиль</CockpitButton>
          </div>
          <div className="relative isolate overflow-hidden bg-[#050606] px-5 pb-7 sm:px-8">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:96px_96px]" />
            <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[55%] w-full text-white/[0.07]" viewBox="0 0 1400 500" fill="none" preserveAspectRatio="none">
              <path d="M-100 400C160 370 360 80 500 220S720 530 930 210 1170 200 1500 250M-100 410C170 390 370 90 510 235S735 550 940 225 1180 220 1500 260M-100 460C210 340 280 270 400 340S650 570 980 300 1190 310 1500 420M-100 500C200 230 450 600 300 470S250 220 550 370 800 550 1200 460 1400 480 1500 500" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <ProfileBadge name={currentUser.name} email={currentUser.email} role={currentUser.role === 'admin' ? 'Администратор' : 'Мастер 3D-печати'} memberId={memberId} memberSince={memberSince} active={currentUser.is_active} />
            <p className="mx-auto flex items-center justify-center gap-2 text-center font-mono text-[10px] tracking-wide text-neutral-500 [@media(hover:none)]:hidden motion-reduce:hidden"><MousePointer2 className="h-3 w-3" />Наведите курсор на бейдж</p>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-white/10 bg-neutral-950 px-5 py-2.5 font-mono text-[11px] text-neutral-500 tabular-nums"><span>ЛИЧНЫЙ ПРОФИЛЬ · {currentUser.is_active ? 'АКТИВЕН' : 'НЕАКТИВЕН'}</span><span>3D LABS MEMBERSHIP</span></div>
        </section>
      </main>
      <footer className="border-t border-white/10 bg-neutral-950/80 py-5 text-center font-mono text-[11px] text-neutral-500">3D LABS · PROFILE RUNTIME</footer>
      <EditProfileModal isOpen={isEditing} onClose={() => setIsEditing(false)} />
    </div>
  );
}
