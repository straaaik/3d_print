'use client';

import React, { useState, useCallback } from 'react';
import { SettingsForm } from '../../widgets/SettingsForm/SettingsForm';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { Modal } from '../../shared/ui/Modal';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import { useData } from '../../entities/model/DataProvider';
import { useRouter } from 'next/navigation';
import { Sliders, Database, RotateCcw, Check } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { isLoading, isSettingsDirty, setIsSettingsDirty, settingsSaveRef } = useData();

  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleNavigate = useCallback((href: string): boolean => {
    if (isSettingsDirty) {
      setPendingHref(href);
      setIsWarningOpen(true);
      return false;
    }
    return true;
  }, [isSettingsDirty]);

  const handleSaveAndLeave = async () => {
    if (settingsSaveRef?.current) {
      setIsSaving(true);
      const success = await settingsSaveRef.current();
      setIsSaving(false);
      if (success) {
        setIsSettingsDirty(false);
        setIsWarningOpen(false);
        if (pendingHref) router.push(pendingHref);
      } else {
        alert('Не удалось сохранить настройки. Проверьте правильность заполнения полей.');
      }
    }
  };

  const handleDiscard = () => {
    setIsSettingsDirty(false);
    setIsWarningOpen(false);
    if (pendingHref) router.push(pendingHref);
  };

  const handleCancel = () => {
    setIsWarningOpen(false);
    setPendingHref(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3 select-none">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin" />
          <p className="text-neutral-400 text-xs font-mono animate-pulse">
            Загрузка конфигурации мастерской...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dot-grid flex flex-col justify-between font-mono text-xs">
      <main className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 md:py-6 space-y-4">
        <div className="flex justify-center">
          <MainNavbar onNavigate={handleNavigate} />
        </div>

        {/* Cockpit Container */}
        <div className="rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
          {/* Terminal Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3 bg-neutral-900/60 select-none">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-400/40 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 border border-yellow-400/40 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40 inline-block" />
              </div>

              <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-white font-mono font-bold text-xs sm:text-sm tracking-wider">
                  § 3D-LABS // НАСТРОЙКИ МАСТЕРСКОЙ
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                <Database className="w-3 h-3" /> Supabase Cloud
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <SettingsForm />
          </div>
        </div>
      </main>

      <footer className="w-full text-center py-6 border-t border-white/10 bg-neutral-950 select-none font-mono text-[11px] text-neutral-500">
        <p>
          § 3D LABS · SETTINGS RUNTIME · Хранилище: LocalStorage + Supabase Cloud
        </p>
      </footer>

      {/* Предупреждение о несохранённых изменениях */}
      <Modal
        isOpen={isWarningOpen}
        onClose={handleCancel}
        title="§ 3D-LABS // UNSAVED_CHANGES"
        variant="warning"
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <CockpitButton
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Отмена
            </CockpitButton>
            <div className="flex items-center gap-2">
              <CockpitButton
                type="button"
                onClick={handleDiscard}
                disabled={isSaving}
                icon={RotateCcw}
                className="text-rose-300 bg-rose-950/60 border-rose-800/40 hover:bg-rose-900/80 hover:text-white"
              >
                Не сохранять
              </CockpitButton>
              <CockpitButton
                type="button"
                onClick={handleSaveAndLeave}
                disabled={isSaving}
                icon={Check}
                isActive={true}
                className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </CockpitButton>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-2 font-mono text-xs">
          <p className="text-neutral-300 font-sans leading-relaxed">
            Вы изменили настройки мастерской, но не сохранили их. Сохранить перед переходом?
          </p>
        </div>
      </Modal>
    </div>
  );
}
