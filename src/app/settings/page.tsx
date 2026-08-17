'use client';

import React, { useState, useCallback } from 'react';
import { SettingsForm } from '../../widgets/SettingsForm/SettingsForm';
import { MainNavbar } from '../../shared/ui/MainNavbar';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import { useData } from '../../entities/model/DataProvider';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const { isLoading, isSettingsDirty, setIsSettingsDirty, settingsSaveRef } = useData();

  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Перехватчик навигации — если есть несохранённые изменения, показываем модалку
  const handleNavigate = useCallback((href: string): boolean => {
    if (isSettingsDirty) {
      setPendingHref(href);
      setIsWarningOpen(true);
      return false; // Блокируем переход
    }
    return true; // Разрешаем переход
  }, [isSettingsDirty]);

  // Сохранить и уйти
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

  // Уйти без сохранения
  const handleDiscard = () => {
    setIsSettingsDirty(false);
    setIsWarningOpen(false);
    if (pendingHref) router.push(pendingHref);
  };

  // Остаться на странице
  const handleCancel = () => {
    setIsWarningOpen(false);
    setPendingHref(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-10 h-10 rounded-full border-4 border-[#242930] border-t-primary animate-spin" />
          <p className="text-gray-400 text-sm font-semibold animate-pulse">
            Загрузка настроек...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0e12]/60 flex flex-col justify-between font-sans">
      <main className="max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 md:py-6 space-y-4">
        <div className="flex justify-center">
          <MainNavbar onNavigate={handleNavigate} />
        </div>
        <SettingsForm />
      </main>

      <footer className="w-full text-center py-6 border-t border-[#242930]/30 select-none">
        <p className="text-[#6b7280] text-xs">
          Все данные хранятся локально в этом браузере (localStorage) и Supabase.
        </p>
      </footer>

      {/* Предупреждение о несохранённых изменениях */}
      <Modal
        isOpen={isWarningOpen}
        onClose={handleCancel}
        title="Несохранённые изменения"
        variant="error"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-3">
          <p className="text-gray-400 text-sm leading-relaxed">
            Вы изменили настройки, но не сохранили их. Сохранить перед уходом?
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button
              variant="primary"
              onClick={handleSaveAndLeave}
              disabled={isSaving}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={isSaving}
              className="border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 text-red-400"
            >
              Не сохранять
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
