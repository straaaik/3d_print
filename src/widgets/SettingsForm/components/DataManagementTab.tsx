'use client';

import React, { useRef } from 'react';
import { Card } from '../../../shared/ui/Card';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { Modal } from '../../../shared/ui/Modal';
import { useToast } from '../../../entities/model/ToastProvider';
import { useData } from '../../../entities/model/DataProvider';
import { 
  Download, 
  Upload, 
  Sparkles, 
  Trash2, 
  Database, 
  Cpu, 
  Layers, 
  Package, 
  ShoppingBag
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

  const isDev = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && localStorage.getItem('3d_dev_session') === 'true');

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
    <div className="flex flex-col gap-4 font-mono text-xs">
      {/* 1. Сводка текущего хранилища */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-neutral-950/90 border border-white/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
            <Cpu size={16} />
          </div>
          <div>
            <span className="text-base font-bold font-mono text-white">{printers.length}</span>
            <span className="text-[10px] text-neutral-400 block font-sans">Принтеров в парке</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-950/90 border border-white/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-950/60 text-purple-300 border border-purple-800/40">
            <Layers size={16} />
          </div>
          <div>
            <span className="text-base font-bold font-mono text-white">{filaments.length}</span>
            <span className="text-[10px] text-neutral-400 block font-sans">Катушек филамента</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-950/90 border border-white/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            <Package size={16} />
          </div>
          <div>
            <span className="text-base font-bold font-mono text-white">{savedCalculations.length}</span>
            <span className="text-[10px] text-neutral-400 block font-sans">Товаров в каталоге</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-950/90 border border-white/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
            <ShoppingBag size={16} />
          </div>
          <div>
            <span className="text-base font-bold font-mono text-white">{collections.length}</span>
            <span className="text-[10px] text-neutral-400 block font-sans">Коллекций / Папок</span>
          </div>
        </div>
      </div>

      {/* 2. Резервное копирование и Восстановление */}
      <Card
        title="Резервное копирование и экспорт в файл"
        stepNumber="💾"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-neutral-400 font-sans leading-relaxed">
            Выгрузите полный слепок вашей базы (оборудование, палитру пластика, калькуляции, настройки и коллекции) в отдельный JSON-файл для надежного хранения или переноса на другое устройство.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleExportData}
              className="p-3.5 rounded-xl bg-neutral-900 border border-white/10 hover:border-cyan-400/50 flex items-center gap-3 text-left transition-all cursor-pointer select-none group"
            >
              <div className="p-2.5 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 group-hover:scale-105 transition-transform">
                <Download size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors font-mono">
                  Экспортировать бэкап
                </span>
                <span className="text-[10px] text-neutral-400 font-sans">
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
              className="p-3.5 rounded-xl bg-neutral-900 border border-white/10 hover:border-cyan-400/50 flex items-center gap-3 text-left transition-all cursor-pointer select-none group"
            >
              <div className="p-2.5 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 group-hover:scale-105 transition-transform">
                <Upload size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors font-mono">
                  Импортировать из файла
                </span>
                <span className="text-[10px] text-neutral-400 font-sans">
                  Восстановить данные из ранее сохраненного JSON
                </span>
              </div>
            </button>
          </div>
        </div>
      </Card>

      {/* 3. DEV & Опасная зона */}
      <div className={`grid grid-cols-1 ${isDev ? 'md:grid-cols-2' : ''} gap-4`}>
        {isDev && (
          <Card
            title="Генератор тестовых данных"
            headerAction={
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-950/60 text-amber-400 border border-amber-800/40">
                DEV
              </span>
            }
            stepNumber="🎲"
            className="flex flex-col justify-between"
          >
            <div className="flex flex-col gap-3">
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Автоматически наполнит базу реалистичным набором 3D-принтеров (Bambu Lab, Voron, Creality), палитрой пластиков, готовыми товарами, заказами и расходами.
              </p>

              <CockpitButton
                type="button"
                onClick={() => setIsConfirmSeedModalOpen(true)}
                disabled={isSeeding || isClearing}
                icon={Sparkles}
                className="w-full justify-center py-2"
              >
                {isSeeding ? 'Генерация...' : 'Сгенерировать демо-данные'}
              </CockpitButton>
            </div>
          </Card>
        )}

        <Card
          title="Опасная зона: Сброс базы"
          stepNumber="⚠️"
          className="border-rose-800/30 flex flex-col justify-between"
        >
          <div className="flex flex-col gap-3">
            <p className="text-xs text-rose-300/80 font-sans leading-relaxed">
              Полное удаление всех принтеров, катушек, товаров и заказов. Восстановить данные будет невозможно без заранее сохраненного бэкапа.
            </p>

            <CockpitButton
              type="button"
              onClick={() => setIsConfirmClearModalOpen(true)}
              disabled={isSeeding || isClearing}
              icon={Trash2}
              className="w-full justify-center py-2 text-rose-300 bg-rose-950/60 border-rose-800/40 hover:bg-rose-900/80 hover:text-white"
            >
              {isClearing ? 'Очистка...' : 'Очистить все таблицы'}
            </CockpitButton>
          </div>
        </Card>
      </div>

      {/* Модальное окно подтверждения генерации */}
      {isDev && (
        <Modal
          isOpen={isConfirmSeedModalOpen}
          onClose={() => !isSeeding && setIsConfirmSeedModalOpen(false)}
          title="§ 3D-LABS // GENERATE_DEMO_DATA"
          variant="warning"
          maxWidth="sm"
          footer={
            <div className="flex gap-2 justify-end w-full">
              <CockpitButton disabled={isSeeding} onClick={() => setIsConfirmSeedModalOpen(false)}>
                Отмена
              </CockpitButton>
              <CockpitButton
                disabled={isSeeding}
                isActive={true}
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
                className="border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold"
              >
                {isSeeding ? 'Генерация...' : 'Сгенерировать'}
              </CockpitButton>
            </div>
          }
        >
          <div className="text-xs text-neutral-300 space-y-2 font-sans">
            <p>
              Все текущие таблицы будут наполнены новым случайно сгенерированным набором оборудования, пластика, каталога товаров и заказов.
            </p>
          </div>
        </Modal>
      )}

      {/* Модальное окно подтверждения полной очистки */}
      <Modal
        isOpen={isConfirmClearModalOpen}
        onClose={() => !isClearing && setIsConfirmClearModalOpen(false)}
        title="§ 3D-LABS // CLEAR_DATABASE"
        variant="error"
        maxWidth="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <CockpitButton disabled={isClearing} onClick={() => setIsConfirmClearModalOpen(false)}>
              Отмена
            </CockpitButton>
            <CockpitButton
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
              className="bg-rose-950/60 text-rose-300 border-rose-800/40 hover:bg-rose-900/80 hover:text-white font-bold"
            >
              {isClearing ? 'Очистка...' : 'Удалить всё'}
            </CockpitButton>
          </div>
        }
      >
        <p className="text-xs text-neutral-300 font-sans">
          Вы действительно хотите полностью удалить все данные из всех таблиц? База данных и локальное хранилище станут пустыми.
        </p>
      </Modal>
    </div>
  );
}
