'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../entities/model/DataProvider';
import { Settings, SupabaseConfig } from '../../shared/types';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { getSupabaseConfig } from '../../shared/api/db';
import { 
  Settings as SettingsIcon, 
  Database, 
  CheckCircle, 
  XCircle, 
  Download, 
  Upload, 
  RefreshCw, 
  Info 
} from 'lucide-react';
import { PageHeader } from '../../shared/ui/PageHeader';

export function SettingsForm() {
  const { 
    settings, 
    printers, 
    isOnline, 
    updateSettings, 
    saveSupabaseConfig, 
    refreshConnection,
    setIsSettingsDirty,
    settingsSaveRef
  } = useData();

  // Состояние полей общих настроек
  const [currency, setCurrency] = useState('₽');
  const [electricityRate, setElectricityRate] = useState('4.89');
  const [defaultPrinterId, setDefaultPrinterId] = useState('');
  const [laborRate, setLaborRate] = useState('0');
  const [defaultMarkup, setDefaultMarkup] = useState('100');
  const [defaultDefect, setDefaultDefect] = useState('5');

  // Состояние полей Supabase
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Синхронизация полей с загруженными настройками
  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency);
      setElectricityRate(settings.electricity_rate.toString());
      setDefaultPrinterId(settings.default_printer_id || '');
      setLaborRate(settings.labor_rate_per_hour.toString());
      setDefaultMarkup(settings.default_markup_percent.toString());
      setDefaultDefect(settings.default_defect_percent.toString());
    }
  }, [settings]);

  // Синхронизация полей Supabase при старте
  useEffect(() => {
    const config = getSupabaseConfig();
    if (config) {
      setSupabaseUrl(config.url);
      setSupabaseAnonKey(config.anonKey);
    }
  }, []);

  // Автоматическое отслеживание изменений формы настроек
  useEffect(() => {
    if (!settings) return;

    const isDirty = 
      currency !== settings.currency ||
      electricityRate !== settings.electricity_rate.toString() ||
      defaultPrinterId !== (settings.default_printer_id || '') ||
      laborRate !== settings.labor_rate_per_hour.toString() ||
      defaultMarkup !== settings.default_markup_percent.toString() ||
      defaultDefect !== settings.default_defect_percent.toString();

    setIsSettingsDirty(isDirty);
  }, [
    settings,
    currency,
    electricityRate,
    defaultPrinterId,
    laborRate,
    defaultMarkup,
    defaultDefect,
    setIsSettingsDirty
  ]);

  // Сброс флага при уходе с вкладки
  useEffect(() => {
    return () => {
      setIsSettingsDirty(false);
    };
  }, [setIsSettingsDirty]);

  // Передаем функцию сохранения в глобальный реф для предупреждающей модалки
  useEffect(() => {
    if (settingsSaveRef) {
      settingsSaveRef.current = async () => {
        try {
          await updateSettings({
            currency: currency.trim() || '₽',
            electricity_rate: parseFloat(electricityRate) || 0,
            default_printer_id: defaultPrinterId || null,
            labor_rate_per_hour: parseFloat(laborRate) || 0,
            labor_time_minutes: settings?.labor_time_minutes || 15,
            default_markup_percent: parseFloat(defaultMarkup) || 0,
            default_defect_percent: parseFloat(defaultDefect) || 0,
          });
          return true;
        } catch (err) {
          console.error('Ошибка удаленного сохранения настроек:', err);
          return false;
        }
      };
    }
    return () => {
      if (settingsSaveRef) {
        settingsSaveRef.current = null;
      }
    };
  }, [
    settingsSaveRef,
    currency,
    electricityRate,
    defaultPrinterId,
    laborRate,
    defaultMarkup,
    defaultDefect,
    settings,
    updateSettings
  ]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      await updateSettings({
        currency: currency.trim() || '₽',
        electricity_rate: parseFloat(electricityRate) || 0,
        default_printer_id: defaultPrinterId || null,
        labor_rate_per_hour: parseFloat(laborRate) || 0,
        labor_time_minutes: settings?.labor_time_minutes || 15,
        default_markup_percent: parseFloat(defaultMarkup) || 0,
        default_defect_percent: parseFloat(defaultDefect) || 0,
      });
      alert('Общие настройки успешно сохранены!');
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении настроек.');
    }
  };

  const handleConnectSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      alert('Пожалуйста, заполните оба поля: URL проекта и Anon Key.');
      return;
    }

    setIsTestingConnection(true);
    try {
      // Сначала сохраняем конфигурацию
      const config: SupabaseConfig = {
        url: supabaseUrl.trim(),
        anonKey: supabaseAnonKey.trim(),
      };
      
      await saveSupabaseConfig(config);
      
      // Проверяем подключение
      const success = await refreshConnection();
      if (success) {
        alert('Успешно подключено к Supabase! Данные синхронизированы.');
      } else {
        alert('Ошибка при подключении. Пожалуйста, проверьте правильность введенных ключей и доступность сети.');
      }
    } catch (err) {
      console.error(err);
      alert('Произошла ошибка при тестировании подключения.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDisconnectSupabase = async () => {
    if (confirm('Вы уверены, что хотите отключить Supabase? Приложение вернется в Demo-режим и будет использовать локальные данные.')) {
      await saveSupabaseConfig(null);
      setSupabaseUrl('');
      setSupabaseAnonKey('');
      alert('Supabase отключен. Возвращено в Demo-режим.');
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    const success = await refreshConnection();
    setIsTestingConnection(false);
    if (success) {
      alert('Соединение с Supabase установлено!');
    } else {
      alert('Не удалось установить соединение. Проверьте настройки или подключение к интернету.');
    }
  };

  // Экспорт данных (Бэкап)
  const handleExportData = () => {
    if (typeof window === 'undefined') return;
    
    const backup = {
      filaments: localStorage.getItem('3d_calc_filaments') ? JSON.parse(localStorage.getItem('3d_calc_filaments')!) : [],
      printers: localStorage.getItem('3d_calc_printers') ? JSON.parse(localStorage.getItem('3d_calc_printers')!) : [],
      settings: localStorage.getItem('3d_calc_settings') ? JSON.parse(localStorage.getItem('3d_calc_settings')!) : null,
      savedCalculations: localStorage.getItem('3d_calc_saved_calculations') ? JSON.parse(localStorage.getItem('3d_calc_saved_calculations')!) : [],
      exportedAt: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `3d_calc_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Импорт данных (Восстановление)
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.filaments || parsed.printers || parsed.settings || parsed.savedCalculations) {
          if (parsed.filaments) localStorage.setItem('3d_calc_filaments', JSON.stringify(parsed.filaments));
          if (parsed.printers) localStorage.setItem('3d_calc_printers', JSON.stringify(parsed.printers));
          if (parsed.settings) localStorage.setItem('3d_calc_settings', JSON.stringify(parsed.settings));
          if (parsed.savedCalculations) localStorage.setItem('3d_calc_saved_calculations', JSON.stringify(parsed.savedCalculations));
          
          alert('Данные успешно импортированы! Перезагрузите страницу для применения изменений.');
          window.location.reload();
        } else {
          alert('Неверный формат файла резервной копии.');
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка при чтении файла резервной копии.');
      }
    };
    fileReader.readAsText(file);
  };

  const currencyOptions = [
    { value: '₽', label: 'Рубли (₽)' },
    { value: '$', label: 'Доллары ($)' },
    { value: '€', label: 'Евро (€)' },
  ];

  const defaultPrinterOptions = [
    { value: '', label: 'Не выбран' },
    ...printers.map((p) => ({
      value: p.id,
      label: p.name,
      color: p.color,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SettingsIcon}
        title="Настройки приложения"
        subtitle="Параметры стоимости, валюта, электричество и подключение облачной базы данных"
        accentColor="#94a3b8"
        badge={
          isOnline ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="w-3 h-3" /> Supabase подключен
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/30">
              <Database className="w-3 h-3" /> Demo-режим (локально)
            </span>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Левая панель - Общие настройки */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <Card title="Общие параметры расчета" stepNumber="⚙️">
          <form onSubmit={handleSaveGeneral} className="flex flex-col gap-5">
            {/* Валюта */}
            <Select
              label="Валюта"
              value={currency}
              options={currencyOptions}
              onChange={setCurrency}
            />

            {/* Электричество и принтер по умолчанию */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={`Электричество, ${currency}/кВт·ч`}
                type="number"
                step="any"
                min="0"
                placeholder="4.89"
                value={electricityRate}
                onChange={(e) => setElectricityRate(e.target.value)}
              />
              <Select
                label="Принтер по умолчанию"
                value={defaultPrinterId}
                options={defaultPrinterOptions}
                onChange={setDefaultPrinterId}
              />
            </div>

            {/* Труд мастера */}
            <Input
              label={`Стоимость труда, ${currency}/час`}
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={laborRate}
              onChange={(e) => setLaborRate(e.target.value)}
              hint="Почасовая ставка вашей работы для расчета себестоимости труда"
            />

            {/* Наценка и брак */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberCounter
                label="Наценка по умолчанию, %"
                value={parseInt(defaultMarkup) || 0}
                onChange={(val) => setDefaultMarkup(val.toString())}
                min={0}
              />
              <NumberCounter
                label="Процент брака, %"
                value={parseInt(defaultDefect) || 0}
                onChange={(val) => setDefaultDefect(val.toString())}
                min={0}
              />
            </div>

            <Button type="submit" className="mt-2 flex items-center justify-center gap-1.5 self-end">
              <SettingsIcon size={16} /> Сохранить настройки
            </Button>
          </form>
        </Card>

        {/* Резервное копирование данных */}
        <Card title="Резервное копирование и экспорт" stepNumber="💾">
          <div className="flex flex-col gap-4">
            <p className="text-gray-300 text-xs leading-relaxed select-none">
              Поскольку ваши данные хранятся локально в веб-браузере, вы можете скачать резервную копию, чтобы случайно не потерять добавленные филаменты и принтеры при очистке кэша браузера.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 select-none">
              <Button variant="outline" onClick={handleExportData} className="flex items-center justify-center gap-2 w-full">
                <Download size={15} /> Экспорт в файл
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 w-full">
                <Upload size={15} /> Импорт из файла
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Правая панель - Интеграция с Supabase */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <Card title="Синхронизация с Supabase" stepNumber="☁️">
          <div className="flex flex-col gap-5">
            {/* Статус соединения */}
            <div className="select-none">
              {isOnline ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3 text-green-400">
                  <CheckCircle size={20} className="shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold">Подключение установлено</h4>
                    <p className="text-[11px] text-green-400/80 leading-relaxed mt-0.5">
                      База данных подключена. Изменения автоматически синхронизируются в облаке.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-neutral-accent/10 border border-[#242930] rounded-lg flex items-center gap-3 text-[#9ca3af]">
                  <XCircle size={20} className="shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold">Demo-режим (Offline)</h4>
                    <p className="text-[11px] text-neutral-accent leading-relaxed mt-0.5">
                      Все данные сохраняются локально в вашем браузере. Подключите Supabase для резервного копирования в облаке.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Форма подключения к Supabase */}
            <div className="flex flex-col gap-4">
              <Input
                label="Supabase Project URL"
                type="text"
                placeholder="https://your-project-id.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
              <Input
                label="Supabase Anon Public Key"
                type="text"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
              />
            </div>

            {/* Информационный блок */}
            <div className="p-3.5 bg-[#242930]/30 border border-[#242930] rounded-lg flex gap-3 text-[#9ca3af] select-none leading-relaxed text-xs">
              <Info size={18} className="shrink-0 text-primary mt-0.5" />
              <div>
                Перед подключением убедитесь, что вы создали таблицы в панели Supabase. 
                SQL-скрипт для быстрой инициализации находится в файле <code className="text-primary px-1.5 py-0.5 bg-[#16181d] rounded">supabase_schema.sql</code> в корне проекта.
              </div>
            </div>

            {/* Действия Supabase */}
            <div className="flex flex-wrap items-center gap-3 mt-2 select-none">
              {getSupabaseConfig() ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} className={isTestingConnection ? 'animate-spin' : ''} />
                    Проверить связь
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={handleDisconnectSupabase}
                  >
                    Отключить БД
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={handleConnectSupabase}
                  disabled={isTestingConnection}
                  className="flex items-center gap-1.5 w-full sm:w-auto"
                >
                  {isTestingConnection ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Подключение...
                    </>
                  ) : (
                    <>
                      <Database size={14} /> Подключить базу данных
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
);
}
