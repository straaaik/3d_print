'use client';

import React, { useState } from 'react';
import { useData } from '../entities/model/DataProvider';
import { Header } from '../widgets/Header/Header';
import { Calculator } from '../widgets/Calculator/Calculator';
import { FilamentList } from '../widgets/FilamentList/FilamentList';
import { PrinterList } from '../widgets/PrinterList/PrinterList';
import { SettingsForm } from '../widgets/SettingsForm/SettingsForm';
import { Modal } from '../shared/ui/Modal';
import { Button } from '../shared/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<string>('calculator');
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { 
    isLoading,
    isSettingsDirty,
    setIsSettingsDirty,
    settingsSaveRef
  } = useData();

  // Обработчик переключения вкладок с блокировкой при несохраненных настройках
  const handleTabChange = (newTab: string) => {
    if (activeTab === 'settings' && isSettingsDirty) {
      setPendingTab(newTab);
      setIsWarningOpen(true);
    } else {
      setActiveTab(newTab);
    }
  };

  // Удаленное сохранение настроек из модального окна
  const handleConfirmSave = async () => {
    if (settingsSaveRef && settingsSaveRef.current) {
      setIsSaving(true);
      const success = await settingsSaveRef.current();
      setIsSaving(false);
      
      if (success) {
        setIsSettingsDirty(false);
        setIsWarningOpen(false);
        if (pendingTab) {
          setActiveTab(pendingTab);
          setPendingTab(null);
        }
      } else {
        alert('Не удалось сохранить настройки. Проверьте правильность заполнения полей.');
      }
    }
  };

  // Выход без сохранения настроек
  const handleDiscardChanges = () => {
    setIsSettingsDirty(false);
    setIsWarningOpen(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  // Отмена перехода
  const handleCancelTransition = () => {
    setIsWarningOpen(false);
    setPendingTab(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-10 h-10 rounded-full border-4 border-[#242930] border-t-primary animate-spin" />
          <p className="text-neutral-accent text-sm font-semibold animate-pulse">
            Инициализация калькулятора...
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'calculator':
        return <Calculator setActiveTab={handleTabChange} />;
      case 'filaments':
        return <FilamentList />;
      case 'printers':
        return <PrinterList />;
      case 'settings':
        return <SettingsForm />;
      default:
        return <Calculator setActiveTab={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0e12]/60 flex flex-col justify-between font-sans">
      <main className="max-w-5xl w-full mx-auto px-4 py-4 md:py-6">
        <Header activeTab={activeTab} setActiveTab={handleTabChange} />
        
        {/* Контент с анимацией Framer Motion */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Предупреждение о несохраненных настройках при смене вкладок */}
      <Modal
        isOpen={isWarningOpen}
        onClose={handleCancelTransition}
        title="Несохраненные изменения"
        variant="error"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-gray-300 text-sm leading-relaxed select-none">
            Вы изменили настройки стоимости 3D-печати, но не сохранили их. Сохранить изменения перед переходом на другую вкладку?
          </p>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="primary"
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDiscardChanges}
              disabled={isSaving}
              className="flex-1 border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 text-red-400 transition-colors"
            >
              Не сохранять
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCancelTransition}
              disabled={isSaving}
              className="flex-1"
            >
              Отмена
            </Button>
          </div>
        </div>
      </Modal>

      {/* Футер */}
      <footer className="w-full text-center py-6 border-t border-[#242930]/30 select-none">
        <p className="text-[#6b7280] text-xs">
          Все данные хранятся локально в этом браузере (localStorage) и никуда не отправляются.
        </p>
      </footer>
    </div>
  );
}
