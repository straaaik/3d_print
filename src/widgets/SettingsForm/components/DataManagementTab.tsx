'use client';

import React, { useRef } from 'react';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
import { useToast } from '../../../entities/model/ToastProvider';
import { useData } from '../../../entities/model/DataProvider';
import { 
  Download, 
  Upload, 
  Sparkles, 
  Trash2, 
  Database, 
  ShieldAlert, 
  Cpu, 
  Layers, 
  Package, 
  ShoppingBag,
  FileJson
} from 'lucide-react';

interface DataManagementTabProps {
  isSeeding: boolean;
  setIsSeeding: (val: boolean) => void;
  isClearing: boolean;
  setIsClearing: (val: boolean) => void;
  isConfirmClearModalOpen: boolean;
  setIsConfirmClearModalOpen: (val: boolean) => void;
  isConfirmSeedModalOpen: boolean;
  setIsConfirmSeedModalOpen: (val: boolean) => void;
}

export function DataManagementTab({
  isSeeding,
  setIsSeeding,
  isClearing,
  setIsClearing,
  isConfirmClearModalOpen,
  setIsConfirmClearModalOpen,
  isConfirmSeedModalOpen,
  setIsConfirmSeedModalOpen,
}: DataManagementTabProps) {
  const { filaments, printers, savedCalculations, collections, seedRandomData, clearAllData } = useData();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Экспорт данных (Бэкап)
  const handleExportData = () => {
    if (typeof window === 'undefined') return;

    try {
      const backup = {
        filaments: localStorage.getItem('3d_calc_filaments') ? JSON.parse(localStorage.getItem('3d_calc_filaments')!) : filaments,
        printers: localStorage.getItem('3d_calc_printers') ? JSON.parse(localStorage.getItem('3d_calc_printers')!) : printers,
        settings: localStorage.getItem('3d_calc_settings') ? JSON.parse(localStorage.getItem('3d_calc_settings')!) : null,
        savedCalculations: localStorage.getItem('3d_calc_saved_calculations') ? JSON.parse(localStorage.getItem('3d_calc_saved_calculations')!) : savedCalculations,
        collections: localStorage.getItem('3d_calc_collections') ? JSON.parse(localStorage.getItem('3d_calc_collections')!) : collections,
        exportedAt: new Date().toISOString(),
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `3d_labs_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Резервная копия успешно экспортирована в JSON файл!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Ошибка при экспорте резервной копии.', 'error');
    }
  };

  // Импорт данных (Восстановление)
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);

        const isValidArray = (val: unknown) => !val || (Array.isArray(val) && val.every((item) => typeof item === 'object' && item !== null));
        const isValidObject = (val: unknown) => !val || (typeof val === 'object' && val !== null && !Array.isArray(val));

        if (!parsed || typeof parsed !== 'object') {
          showToast('Неверный формат файла резервной копии.', 'error');
          return;
        }

        if (parsed.filaments && !isValidArray(parsed.filaments)) {
          showToast('Ошибка: поле filaments имеет неверный формат.', 'error');
          return;
        }
        if (parsed.printers && !isValidArray(parsed.printers)) {
          showToast('Ошибка: поле printers имеет неверный формат.', 'error');
          return;
        }
        if (parsed.settings && !isValidObject(parsed.settings)) {
          showToast('Ошибка: поле settings имеет неверный формат.', 'error');
          return;
        }
        if (parsed.savedCalculations && !isValidArray(parsed.savedCalculations)) {
          showToast('Ошибка: поле savedCalculations имеет неверный формат.', 'error');
          return;
        }

        if (parsed.filaments || parsed.printers || parsed.settings || parsed.savedCalculations || parsed.collections) {
          if (parsed.filaments) localStorage.setItem('3d_calc_filaments', JSON.stringify(parsed.filaments));
          if (parsed.printers) localStorage.setItem('3d_calc_printers', JSON.stringify(parsed.printers));
          if (parsed.settings) localStorage.setItem('3d_calc_settings', JSON.stringify(parsed.settings));
          if (parsed.savedCalculations) localStorage.setItem('3d_calc_saved_calculations', JSON.stringify(parsed.savedCalculations));
          if (parsed.collections) localStorage.setItem('3d_calc_collections', JSON.stringify(parsed.collections));

          showToast('Данные успешно импортированы! Перезагрузка страницы...', 'success');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          showToast('В файле нет поддерживаемых данных для восстановления.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Ошибка при чтении файла резервной копии.', 'error');
      }
    };
    fileReader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Сводка текущего хранилища */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#16181d] border border-[#242930] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400">
            <Cpu size={18} />
          </div>
          <div>
            <span className="text-lg font-bold font-mono text-white">{printers.length}</span>
            <span className="text-xs text-gray-400 block">Принтеров в парке</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#16181d] border border-[#242930] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
            <Layers size={18} />
          </div>
          <div>
            <span className="text-lg font-bold font-mono text-white">{filaments.length}</span>
            <span className="text-xs text-gray-400 block">Катушек филамента</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#16181d] border border-[#242930] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Package size={18} />
          </div>
          <div>
            <span className="text-lg font-bold font-mono text-white">{savedCalculations.length}</span>
            <span className="text-xs text-gray-400 block">Товаров в каталоге</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#16181d] border border-[#242930] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
            <ShoppingBag size={18} />
          </div>
          <div>
            <span className="text-lg font-bold font-mono text-white">{collections.length}</span>
            <span className="text-xs text-gray-400 block">Коллекций / Папок</span>
          </div>
        </div>
      </div>

      {/* 2. Резервное копирование и Восстановление */}
      <Card
        title="Резервное копирование и экспорт в файл"
        stepNumber="💾"
        className="border-[#242930] bg-[#16181d]"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            Выгрузите полный слепок вашей базы (оборудование, палитру пластика, калькуляции, настройки и коллекции) в отдельный JSON-файл для надежного хранения или переноса на другое устройство.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <button
              type="button"
              onClick={handleExportData}
              className="p-4 rounded-xl bg-[#12141a] border border-[#242930] hover:border-primary/50 hover:bg-primary/5 flex items-center gap-3 text-left transition-all cursor-pointer select-none group"
            >
              <div className="p-3 rounded-xl bg-primary/15 text-primary group-hover:scale-110 transition-transform">
                <Download size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                  Экспортировать бэкап
                </span>
                <span className="text-[11px] text-gray-400">
                  Скачать JSON-файл со всеми таблицами
                </span>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-xl bg-[#12141a] border border-[#242930] hover:border-sky-500/50 hover:bg-sky-500/5 flex items-center gap-3 text-left transition-all cursor-pointer select-none group"
            >
              <div className="p-3 rounded-xl bg-sky-500/15 text-sky-400 group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">
                  Импортировать из файла
                </span>
                <span className="text-[11px] text-gray-400">
                  Восстановить данные из ранее сохраненного JSON
                </span>
              </div>
            </button>
          </div>
        </div>
      </Card>

      {/* 3. Генератор тестов и Опасная зона */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Генератор случайных данных */}
        <Card
          title="Генератор тестовых данных"
          stepNumber="🎲"
          className="border-[#242930] bg-[#16181d] flex flex-col justify-between"
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Автоматически наполнит базу реалистичным набором 3D-принтеров (Bambu Lab, Voron, Creality), палитрой пластиков, готовыми товарами, заказами и расходами.
            </p>

            <Button
              variant="primary"
              onClick={() => setIsConfirmSeedModalOpen(true)}
              disabled={isSeeding || isClearing}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold border-none shadow-md shadow-amber-500/20"
            >
              <Sparkles size={16} />
              {isSeeding ? 'Генерация...' : 'Сгенерировать демо-данные'}
            </Button>
          </div>
        </Card>

        {/* Опасная зона - Очистка */}
        <Card
          title="Опасная зона: Сброс базы"
          stepNumber="⚠️"
          className="border-red-500/20 bg-[#16181d] flex flex-col justify-between"
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs text-red-400/80 leading-relaxed">
              Полное удаление всех принтеров, катушек, товаров и заказов. Восстановить данные будет невозможно без заранее сохраненного бэкапа.
            </p>

            <Button
              variant="danger"
              onClick={() => setIsConfirmClearModalOpen(true)}
              disabled={isSeeding || isClearing}
              className="flex items-center justify-center gap-2 w-full py-2.5"
            >
              <Trash2 size={16} />
              {isClearing ? 'Очистка...' : 'Очистить все таблицы'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Модальное окно подтверждения генерации случайных данных */}
      <Modal
        isOpen={isConfirmSeedModalOpen}
        onClose={() => !isSeeding && setIsConfirmSeedModalOpen(false)}
        title="Сгенерировать случайные данные?"
        variant="warning"
        maxWidth="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" disabled={isSeeding} onClick={() => setIsConfirmSeedModalOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              disabled={isSeeding}
              onClick={async () => {
                setIsSeeding(true);
                try {
                  await seedRandomData();
                  setIsConfirmSeedModalOpen(false);
                  showToast('Случайные тестовые данные успешно созданы!', 'success');
                } catch (err) {
                  console.error(err);
                  showToast('Ошибка при генерации тестовых данных.', 'error');
                } finally {
                  setIsSeeding(false);
                }
              }}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {isSeeding ? 'Генерация...' : 'Сгенерировать'}
            </Button>
          </div>
        }
      >
        <div className="text-sm text-gray-300 space-y-2">
          <p>
            Все текущие таблицы будут наполнены новым случайно сгенерированным набором оборудования, пластика, каталога товаров и заказов.
          </p>
        </div>
      </Modal>

      {/* Модальное окно подтверждения полной очистки */}
      <Modal
        isOpen={isConfirmClearModalOpen}
        onClose={() => !isClearing && setIsConfirmClearModalOpen(false)}
        title="Очистить все таблицы базы данных?"
        variant="error"
        maxWidth="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" disabled={isClearing} onClick={() => setIsConfirmClearModalOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              disabled={isClearing}
              onClick={async () => {
                setIsClearing(true);
                try {
                  await clearAllData();
                  setIsConfirmClearModalOpen(false);
                  showToast('Все таблицы базы данных очищены.', 'info');
                } catch (err) {
                  console.error(err);
                  showToast('Ошибка при очистке таблиц.', 'error');
                } finally {
                  setIsClearing(false);
                }
              }}
            >
              {isClearing ? 'Очистка...' : 'Удалить всё'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-300">
          Вы действительно хотите полностью удалить все данные из всех таблиц? База данных и локальное хранилище станут пустыми.
        </p>
      </Modal>
    </div>
  );
}
