'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../entities/model/DataProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { Settings } from '../../shared/types';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';
import { NumberCounter } from '../../shared/ui/NumberCounter';
import { Checkbox } from '../../shared/ui/Checkbox';
import { MATERIAL_DIFFICULTY_CONFIGS, MaterialDifficultyCategory } from '../../shared/lib/materialDifficulty';
import { 
  Settings as SettingsIcon, 
  Download, 
  Upload, 
  Sparkles,
  Trash2,
  Wrench,
  Layers,
  Percent,
  Zap,
  Flame
} from 'lucide-react';
import { PageHeader } from '../../shared/ui/PageHeader';

export function SettingsForm() {
  const { 
    settings, 
    printers, 
    updateSettings, 
    setIsSettingsDirty,
    settingsSaveRef,
    seedRandomData,
    clearAllData
  } = useData();
  const { showToast } = useToast();

  // Состояние генератора и сброса данных
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = useState(false);
  const [isConfirmSeedModalOpen, setIsConfirmSeedModalOpen] = useState(false);

  // Состояние полей общих настроек
  const [currency, setCurrency] = useState('₽');
  const [electricityRate, setElectricityRate] = useState('4.89');
  const [defaultPrinterId, setDefaultPrinterId] = useState('');
  const [minOrderPrice, setMinOrderPrice] = useState('300');

  // Работа мастера по умолчанию
  const [laborRate, setLaborRate] = useState('0');
  const [laborTimeMinutes, setLaborTimeMinutes] = useState('15');
  const [isOwnerLaborDefault, setIsOwnerLaborDefault] = useState(true);
  const [isLaborPerUnitDefault, setIsLaborPerUnitDefault] = useState(false);

  // Наценка, срочность и брак
  const [defaultMarkup, setDefaultMarkup] = useState('100');
  const [defaultDefect, setDefaultDefect] = useState('5');
  const [defaultUrgencyPercent, setDefaultUrgencyPercent] = useState('25');

  // Сложность материалов
  const [enableMaterialDifficulty, setEnableMaterialDifficulty] = useState(true);
  const [materialMultipliers, setMaterialMultipliers] = useState<Record<string, number>>({
    pla_petg: 100,
    abs_asa: 120,
    tpu_flex: 140,
    nylon_cf: 170,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Синхронизация полей с загруженными настройками
  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency || '₽');
      setElectricityRate(settings.electricity_rate?.toString() ?? '4.89');
      setDefaultPrinterId(settings.default_printer_id || '');
      setMinOrderPrice((settings.min_order_price ?? 300).toString());
      setLaborRate((settings.labor_rate_per_hour ?? 0).toString());
      setLaborTimeMinutes((settings.labor_time_minutes ?? 15).toString());
      setIsOwnerLaborDefault(settings.is_owner_labor_default ?? true);
      setIsLaborPerUnitDefault(settings.is_labor_per_unit_default ?? false);
      setDefaultMarkup((settings.default_markup_percent ?? 100).toString());
      setDefaultDefect((settings.default_defect_percent ?? 5).toString());
      setDefaultUrgencyPercent((settings.default_urgency_percent ?? 25).toString());
      setEnableMaterialDifficulty(settings.enable_material_difficulty ?? true);
      if (settings.material_multipliers) {
        setMaterialMultipliers({
          pla_petg: settings.material_multipliers.pla_petg ?? 100,
          abs_asa: settings.material_multipliers.abs_asa ?? 120,
          tpu_flex: settings.material_multipliers.tpu_flex ?? 140,
          nylon_cf: settings.material_multipliers.nylon_cf ?? 170,
        });
      }
    }
  }, [settings]);

  // Автоматическое отслеживание изменений формы настроек
  useEffect(() => {
    if (!settings) return;

    const isDirty = 
      currency !== settings.currency ||
      electricityRate !== settings.electricity_rate?.toString() ||
      defaultPrinterId !== (settings.default_printer_id || '') ||
      minOrderPrice !== (settings.min_order_price ?? 300).toString() ||
      laborRate !== settings.labor_rate_per_hour?.toString() ||
      laborTimeMinutes !== (settings.labor_time_minutes ?? 15).toString() ||
      isOwnerLaborDefault !== (settings.is_owner_labor_default ?? true) ||
      isLaborPerUnitDefault !== (settings.is_labor_per_unit_default ?? false) ||
      defaultMarkup !== settings.default_markup_percent?.toString() ||
      defaultDefect !== settings.default_defect_percent?.toString() ||
      defaultUrgencyPercent !== (settings.default_urgency_percent ?? 25).toString() ||
      enableMaterialDifficulty !== (settings.enable_material_difficulty ?? true) ||
      JSON.stringify(materialMultipliers) !== JSON.stringify(settings.material_multipliers || {});

    setIsSettingsDirty(isDirty);
  }, [
    settings,
    currency,
    electricityRate,
    defaultPrinterId,
    minOrderPrice,
    laborRate,
    laborTimeMinutes,
    isOwnerLaborDefault,
    isLaborPerUnitDefault,
    defaultMarkup,
    defaultDefect,
    defaultUrgencyPercent,
    enableMaterialDifficulty,
    materialMultipliers,
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
            min_order_price: parseFloat(minOrderPrice) || 0,
            labor_rate_per_hour: parseFloat(laborRate) || 0,
            labor_time_minutes: parseInt(laborTimeMinutes) || 15,
            is_owner_labor_default: isOwnerLaborDefault,
            is_labor_per_unit_default: isLaborPerUnitDefault,
            default_markup_percent: parseFloat(defaultMarkup) || 100,
            default_defect_percent: parseFloat(defaultDefect) || 5,
            default_urgency_percent: parseFloat(defaultUrgencyPercent) || 25,
            enable_material_difficulty: enableMaterialDifficulty,
            material_multipliers: materialMultipliers,
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
    minOrderPrice,
    laborRate,
    laborTimeMinutes,
    isOwnerLaborDefault,
    isLaborPerUnitDefault,
    defaultMarkup,
    defaultDefect,
    defaultUrgencyPercent,
    enableMaterialDifficulty,
    materialMultipliers,
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
        min_order_price: parseFloat(minOrderPrice) || 0,
        labor_rate_per_hour: parseFloat(laborRate) || 0,
        labor_time_minutes: parseInt(laborTimeMinutes) || 15,
        is_owner_labor_default: isOwnerLaborDefault,
        is_labor_per_unit_default: isLaborPerUnitDefault,
        default_markup_percent: parseFloat(defaultMarkup) || 100,
        default_defect_percent: parseFloat(defaultDefect) || 5,
        default_urgency_percent: parseFloat(defaultUrgencyPercent) || 25,
        enable_material_difficulty: enableMaterialDifficulty,
        material_multipliers: materialMultipliers,
      });
      showToast('Общие настройки успешно сохранены!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Ошибка при сохранении настроек.', 'error');
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

        // Базовая валидация структуры
        const isValidArray = (val: unknown) => !val || (Array.isArray(val) && val.every(item => typeof item === 'object' && item !== null));
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

        if (parsed.filaments || parsed.printers || parsed.settings || parsed.savedCalculations) {
          if (parsed.filaments) localStorage.setItem('3d_calc_filaments', JSON.stringify(parsed.filaments));
          if (parsed.printers) localStorage.setItem('3d_calc_printers', JSON.stringify(parsed.printers));
          if (parsed.settings) localStorage.setItem('3d_calc_settings', JSON.stringify(parsed.settings));
          if (parsed.savedCalculations) localStorage.setItem('3d_calc_saved_calculations', JSON.stringify(parsed.savedCalculations));
          
          showToast('Данные успешно импортированы! Страница будет перезагружена.', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          showToast('Неверный формат файла резервной копии.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Ошибка при чтении файла резервной копии.', 'error');
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
        subtitle="Параметры стоимости, валюта, электричество и наценки"
        accentColor="#94a3b8"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Левая панель - Общие настройки */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card title="Общие параметры расчета" stepNumber="⚙️">
            <form onSubmit={handleSaveGeneral} className="flex flex-col gap-6">
              {/* 1. Блок: Базовые параметры мастерской */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#242930] pb-2">
                  <Zap size={14} className="text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    1. Базовые параметры и минимальный чек
                  </span>
                </div>

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

                {/* Минимальный чек заказа / порог запуска печати */}
                <div className="space-y-1">
                  <Input
                    label={`Минимальная стоимость заказа / печати, ${currency}`}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="300"
                    value={minOrderPrice}
                    onChange={(e) => setMinOrderPrice(e.target.value)}
                    hint="Если расчетная цена заказа меньше этой суммы, калькулятор автоматически округлит цену до минимального чека (0 = без порога)."
                  />
                </div>
              </div>

              {/* 2. Блок: Работа мастера по умолчанию */}
              <div className="space-y-4 pt-2 border-t border-[#242930]">
                <div className="flex items-center gap-2 border-b border-[#242930] pb-2">
                  <Wrench size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    2. Работа мастера (по умолчанию)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={`Ставка мастера, ${currency}/час`}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value)}
                    hint="Почасовая оплата ручного труда (шлифовка, удаление поддержек, сборка)"
                  />
                  <NumberCounter
                    label="Время работы по умолчанию, мин"
                    value={parseInt(laborTimeMinutes) || 0}
                    onChange={(val) => setLaborTimeMinutes(val.toString())}
                    min={0}
                  />
                </div>

                {/* Настройки начисления труда и личный труд */}
                <div className="p-3 bg-[#14161e] border border-[#242930] rounded-xl space-y-3">
                  <Checkbox
                    id="owner-labor-default-toggle"
                    checked={isOwnerLaborDefault}
                    onChange={setIsOwnerLaborDefault}
                    label="Мой личный труд по умолчанию (100% дохода идет в чистую прибыль)"
                  />

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#242930]/60">
                    <span className="text-xs text-gray-300 font-medium">
                      Начисление времени труда по умолчанию:
                    </span>
                    <div className="inline-flex gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setIsLaborPerUnitDefault(false)}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer select-none ${
                          !isLaborPerUnitDefault
                            ? 'bg-[#242930] text-white font-bold shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        За весь заказ
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsLaborPerUnitDefault(true)}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer select-none ${
                          isLaborPerUnitDefault
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        За каждую шт
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Блок: Наценка, срочность и брак */}
              <div className="space-y-4 pt-2 border-t border-[#242930]">
                <div className="flex items-center gap-2 border-b border-[#242930] pb-2">
                  <Percent size={14} className="text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    3. Базовая наценка, срочность и учет брака
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <NumberCounter
                    label="Базовая наценка, %"
                    value={parseInt(defaultMarkup) || 0}
                    onChange={(val) => setDefaultMarkup(val.toString())}
                    min={0}
                  />
                  <NumberCounter
                    label="Надбавка за срочность, %"
                    value={parseInt(defaultUrgencyPercent) || 0}
                    onChange={(val) => setDefaultUrgencyPercent(val.toString())}
                    min={0}
                  />
                  <NumberCounter
                    label="Процент брака, %"
                    value={parseInt(defaultDefect) || 0}
                    onChange={(val) => setDefaultDefect(val.toString())}
                    min={0}
                  />
                </div>
              </div>

              {/* 4. Блок: Дифференцированная наценка по сложности пластиков */}
              <div className="space-y-4 pt-2 border-t border-[#242930]">
                <div className="flex items-center justify-between border-b border-[#242930] pb-2">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      4. Наценки по сложности материалов
                    </span>
                  </div>
                  <Checkbox
                    id="enable-material-difficulty-toggle"
                    checked={enableMaterialDifficulty}
                    onChange={setEnableMaterialDifficulty}
                    label="Учитывать тип пластика"
                  />
                </div>

                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Инженерные и гибкие пластики требуют сушки, медленной печати и вызывают износ сопел. Калькулятор автоматически определит тип нити по названию катушки и применит соответствующую наценку.
                </p>

                {enableMaterialDifficulty && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(MATERIAL_DIFFICULTY_CONFIGS) as MaterialDifficultyCategory[]).map((catKey) => {
                      const cfg = MATERIAL_DIFFICULTY_CONFIGS[catKey];
                      const currentVal = materialMultipliers[catKey] ?? cfg.defaultMarkup;

                      return (
                        <div
                          key={cfg.id}
                          className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 bg-[#14161e] border-[#242930]`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{cfg.icon}</span>
                                <span>{cfg.shortLabel}</span>
                              </span>
                              <span className="text-[10px] text-gray-400 mt-0.5">
                                {cfg.keywords.slice(0, 4).join(', ').toUpperCase()}
                              </span>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.badgeColor} ${cfg.textColor} border ${cfg.borderColor}`}>
                              +{currentVal}%
                            </span>
                          </div>

                          <NumberCounter
                            label="Наценка для группы, %"
                            value={currentVal}
                            onChange={(val) => setMaterialMultipliers(prev => ({ ...prev, [catKey]: val }))}
                            min={0}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button type="submit" className="mt-4 flex items-center justify-center gap-1.5 self-end px-6 py-2.5 font-bold bg-primary hover:bg-primary/90 text-white">
                <SettingsIcon size={16} /> Сохранить настройки
              </Button>
            </form>
          </Card>
        </div>

        {/* Правая панель - Резервное копирование и Демо-данные */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Резервное копирование данных */}
          <Card title="Резервное копирование и экспорт" stepNumber="💾">
            <div className="flex flex-col gap-4">
              <p className="text-gray-300 text-xs leading-relaxed select-none">
                Вы можете сохранить резервную копию всех ваших принтеров, филаментов и расчетов в отдельный JSON-файл или восстановить их при необходимости.
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

          {/* Управление данными и Генерация случайных тестов */}
          <Card title="Управление данными и Генератор" stepNumber="🎲">
            <div className="flex flex-col gap-4">
              <p className="text-gray-300 text-xs leading-relaxed select-none">
                Сгенерируйте случайный набор реалистичных данных (принтеры, палитра филаментов, товары и составные сборки, заказы и расходы за последние месяцы) или полностью очистите свою базу.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 select-none">
                <Button 
                  variant="primary" 
                  onClick={() => setIsConfirmSeedModalOpen(true)} 
                  disabled={isSeeding || isClearing}
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-none shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Sparkles size={15} /> Сгенерировать данные
                </Button>
                <Button 
                  variant="danger" 
                  onClick={() => setIsConfirmClearModalOpen(true)} 
                  disabled={isSeeding || isClearing}
                  className="flex items-center justify-center gap-2 w-full"
                >
                  <Trash2 size={15} /> Очистить все таблицы
                </Button>
              </div>
            </div>
          </Card>
        </div>
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
          Все текущие таблицы (принтеры, филаменты, товары, заказы и настройки) будут очищены и наполнены новым случайно сгенерированным набором оборудования, пластика, каталога товаров и заказов.
        </p>
        <p className="text-xs text-amber-400 font-medium">
          Каждый запуск формирует уникальные параметры, комбинации материалов и расчеты.
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
