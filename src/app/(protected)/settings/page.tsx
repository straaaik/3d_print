'use client';

import { ProtectedPageReady } from '../../../shared/ui/page-transition/PageReadySurface';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePageTransition } from '../../../shared/ui/page-transition/PageTransitionProvider';
import { Check, Database, RotateCcw, Sliders } from 'lucide-react';
import { SettingsForm } from '../../../widgets/SettingsForm/SettingsForm';
import { InventoryCockpitShell } from '../../../widgets/InventoryCockpit/InventoryCockpitShell';
import { MainNavbar } from '../../../shared/ui/MainNavbar';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { CockpitModal } from '../../../shared/ui/CockpitModal';
import { useData } from '../../../entities/model/DataProvider';
import { usePixelCurtain } from '../../../shared/ui/PixelCurtain';
import { usePersistentState } from '../../../shared/lib/usePersistentState';
import { SettingsSkeleton } from '../../../shared/ui/CockpitSkeleton';

export default function SettingsPage() {
  const { registerGuard } = usePageTransition();
  const leavingRef = useRef(false);
  const { navigate: curtainNavigate } = usePixelCurtain();
  const { isLoading, isOnline, isSettingsDirty, setIsSettingsDirty, settingsSaveRef } = useData();
  const [isExpanded, setIsExpanded] = usePersistentState<boolean>('3d_settings_expanded_view', false);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleNavigate = useCallback(async (href: string): Promise<boolean> => {
    if (leavingRef.current) return true;
    if (href === '/settings' || href.startsWith('/settings?')) return true;
    if (isSettingsDirty) {
      setPendingHref(href);
      setIsWarningOpen(true);
      return false;
    }
    return true;
  }, [isSettingsDirty]);

  useEffect(() => registerGuard(handleNavigate), [registerGuard, handleNavigate]);

  const closeSection = async () => {
    curtainNavigate('/');
  };

  const handleSaveAndLeave = async () => {
    if (!settingsSaveRef?.current) return;
    setIsSaving(true);
    const success = await settingsSaveRef.current();
    setIsSaving(false);
    if (!success) return;
    leavingRef.current = true;
    setIsSettingsDirty(false);
    setIsWarningOpen(false);
    if (pendingHref) curtainNavigate(pendingHref);
  };

  const handleDiscard = () => {
    leavingRef.current = true;
    setIsSettingsDirty(false);
    setIsWarningOpen(false);
    if (pendingHref) curtainNavigate(pendingHref);
  };

  const handleCancel = () => {
    setIsWarningOpen(false);
    setPendingHref(null);
  };

  return (
    <ProtectedPageReady viewKey="/settings">
    <div className="flex min-h-screen flex-col justify-between bg-dot-grid font-sans text-white selection:bg-white/20 selection:text-white">
      <main className="mx-auto w-full max-w-none space-y-6 px-3 py-4 sm:px-6 md:py-6">
        <div className="flex justify-center"><MainNavbar /></div>

        {isLoading ? (
          <SettingsSkeleton />
        ) : (
          <InventoryCockpitShell
            section="ПРОФИЛЬ И НАСТРОЙКИ"
            sectionLabel="Профиль и настройки"
            icon={<Sliders className="h-full w-full" />}
            isExpanded={isExpanded}
            onExpandedChange={setIsExpanded}
            onRequestClose={closeSection}
            isOnline={isOnline}
            recordCount={7}
            filteredCount={7}
            actions={(
              <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[9px] font-bold tracking-wider ${
                isSettingsDirty
                  ? 'border-amber-800/40 bg-amber-950/60 text-amber-400'
                  : 'border-emerald-800/40 bg-emerald-950/60 text-emerald-400'
              }`}>
                <Database className="h-3 w-3" />
                {isSettingsDirty ? 'ЕСТЬ ЧЕРНОВИК' : 'НАСТРОЙКИ МАСТЕРСКОЙ СОХРАНЕНЫ'}
              </span>
            )}
          >
            <div className="p-3 sm:p-4 md:p-5"><SettingsForm isExpanded={isExpanded} /></div>
          </InventoryCockpitShell>
        )}
      </main>

      <footer className="w-full select-none border-t border-white/10 bg-neutral-950/80 py-6 font-mono text-[11px] text-neutral-500 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-2 px-4 sm:flex-row">
          <span>3D LABS · SETTINGS RUNTIME v2.4</span>
          <span>CONFIG: SECURE SYNCED RUNTIME</span>
        </div>
      </footer>

      <CockpitModal
        isOpen={isWarningOpen}
        onClose={handleCancel}
        title="Несохраненные изменения"
        subtitle="Конфигурация"
        maxWidth="md"
        footer={(
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <CockpitButton onClick={handleCancel} disabled={isSaving}>Закрыть</CockpitButton>
            <CockpitButton onClick={handleDiscard} disabled={isSaving} icon={RotateCcw} className="border-rose-800/40 bg-rose-950/50 text-rose-300">Не сохранять</CockpitButton>
            <CockpitButton onClick={handleSaveAndLeave} disabled={isSaving} icon={Check} isActive>
              {isSaving ? 'Сохранение...' : 'Сохранить и перейти'}
            </CockpitButton>
          </div>
        )}
      >
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <p className="font-sans text-sm leading-relaxed text-neutral-300">
            Несохранённые параметры влияют на цены, амортизацию, оплату труда и правила материалов. При отказе от сохранения текущий черновик будет отброшен.
          </p>
        </div>
      </CockpitModal>
    </div>
    </ProtectedPageReady>
  );
}
