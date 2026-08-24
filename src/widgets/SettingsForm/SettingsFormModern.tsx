'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../../entities/model/DataProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { SettingsTabs, SettingsTabId } from './components/SettingsTabs';
import { GeneralSettingsTab } from './components/GeneralSettingsTab';
import { LaborSettingsTab } from './components/LaborSettingsTab';
import { PricingSettingsTab } from './components/PricingSettingsTab';
import { MaterialsSettingsTab } from './components/MaterialsSettingsTab';
import { DataManagementTab } from './components/DataManagementTab';
import { LiveCalculationPreview } from './components/LiveCalculationPreview';
import { 
  Settings as SettingsIcon, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Sliders
} from 'lucide-react';

const getNormalizedMaterialMultipliers = (multipliers?: Record<string, number> | null): Record<string, number> => ({
  pla_petg: multipliers?.pla_petg ?? 100,
  abs_asa: multipliers?.abs_asa ?? 120,
  tpu_flex: multipliers?.tpu_flex ?? 140,
  nylon_cf: multipliers?.nylon_cf ?? 170,
});

const areMaterialMultipliersEqual = (a: Record<string, number>, b?: Record<string, number> | null): boolean => {
  const normB = getNormalizedMaterialMultipliers(b);
  const keys = ['pla_petg', 'abs_asa', 'tpu_flex', 'nylon_cf'];
  return keys.every((k) => (a[k] ?? 100) === (normB[k] ?? 100));
};

export function SettingsFormModern() {
  const { 
    settings, 
    printers, 
    updateSettings, 
    setIsSettingsDirty,
    settingsSaveRef 
  } = useData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const [isSaving, setIsSaving] = useState(false);

  // Состояние генератора и сброса данных
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = useState(false);
  const [isConfirmSeedModalOpen, setIsConfirmSeedModalOpen] = useState(false);

  // Состояние полей
  const [currency, setCurrency] = useState(() => settings?.currency || '₽');
  const [electricityRate, setElectricityRate] = useState(() => (settings?.electricity_rate ?? 4.89).toString());
  const [defaultPrinterId, setDefaultPrinterId] = useState(() => settings?.default_printer_id || '');
  const [minOrderPrice, setMinOrderPrice] = useState(() => (settings?.min_order_price ?? 300).toString());

  // Работа мастера
  const [laborRate, setLaborRate] = useState(() => (settings?.labor_rate_per_hour ?? 0).toString());
  const [laborTimeMinutes, setLaborTimeMinutes] = useState(() => (settings?.labor_time_minutes ?? 15).toString());
  const [isOwnerLaborDefault, setIsOwnerLaborDefault] = useState(() => settings?.is_owner_labor_default ?? true);
  const [isLaborPerUnitDefault, setIsLaborPerUnitDefault] = useState(() => settings?.is_labor_per_unit_default ?? false);

  // Наценки
  const [defaultMarkup, setDefaultMarkup] = useState(() => (settings?.default_markup_percent ?? 100).toString());
  const [defaultDefect, setDefaultDefect] = useState(() => (settings?.default_defect_percent ?? 5).toString());
  const [defaultUrgencyPercent, setDefaultUrgencyPercent] = useState(() => (settings?.default_urgency_percent ?? 25).toString());

  // Сложность материалов
  const [enableMaterialDifficulty, setEnableMaterialDifficulty] = useState(() => settings?.enable_material_difficulty ?? true);
  const [materialMultipliers, setMaterialMultipliers] = useState<Record<string, number>>(() =>
    getNormalizedMaterialMultipliers(settings?.material_multipliers)
  );

  // Синхронизация полей с внешними данными
  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency || '₽');
      setElectricityRate((settings.electricity_rate ?? 4.89).toString());
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
      setMaterialMultipliers(getNormalizedMaterialMultipliers(settings.material_multipliers));
    }
  }, [settings]);

  // Сброс изменений к исходным сохраненным значениям
  const handleResetToSaved = useCallback(() => {
    if (!settings) return;
    setCurrency(settings.currency || '₽');
    setElectricityRate((settings.electricity_rate ?? 4.89).toString());
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
    setMaterialMultipliers(getNormalizedMaterialMultipliers(settings.material_multipliers));
    showToast('Изменения сброшены к сохраненным параметрам', 'info');
  }, [settings, showToast]);

  // Флаги изменений полей
  const isCurrencyChanged = currency !== (settings?.currency || '₽');
  const isElectricityRateChanged = electricityRate !== (settings?.electricity_rate ?? 4.89).toString();
  const isDefaultPrinterChanged = defaultPrinterId !== (settings?.default_printer_id || '');
  const isMinOrderPriceChanged = minOrderPrice !== (settings?.min_order_price ?? 300).toString();

  const isLaborRateChanged = laborRate !== (settings?.labor_rate_per_hour ?? 0).toString();
  const isLaborTimeMinutesChanged = laborTimeMinutes !== (settings?.labor_time_minutes ?? 15).toString();
  const isOwnerLaborDefaultChanged = isOwnerLaborDefault !== (settings?.is_owner_labor_default ?? true);
  const isLaborPerUnitDefaultChanged = isLaborPerUnitDefault !== (settings?.is_labor_per_unit_default ?? false);

  const isDefaultMarkupChanged = defaultMarkup !== (settings?.default_markup_percent ?? 100).toString();
  const isDefaultUrgencyPercentChanged = defaultUrgencyPercent !== (settings?.default_urgency_percent ?? 25).toString();
  const isDefaultDefectChanged = defaultDefect !== (settings?.default_defect_percent ?? 5).toString();

  const isEnableMaterialDifficultyChanged = enableMaterialDifficulty !== (settings?.enable_material_difficulty ?? true);

  const isMaterialMultiplierChanged = useCallback((catKey: string) => {
    const savedNorm = getNormalizedMaterialMultipliers(settings?.material_multipliers);
    return (materialMultipliers[catKey] ?? 100) !== (savedNorm[catKey] ?? 100);
  }, [settings?.material_multipliers, materialMultipliers]);

  // Подсчет изменений по вкладкам
  const changesMap = useMemo(() => {
    const generalChanges = [
      isCurrencyChanged,
      isElectricityRateChanged,
      isDefaultPrinterChanged,
      isMinOrderPriceChanged,
    ].filter(Boolean).length;

    const laborChanges = [
      isLaborRateChanged,
      isLaborTimeMinutesChanged,
      isOwnerLaborDefaultChanged,
      isLaborPerUnitDefaultChanged,
    ].filter(Boolean).length;

    const pricingChanges = [
      isDefaultMarkupChanged,
      isDefaultUrgencyPercentChanged,
      isDefaultDefectChanged,
    ].filter(Boolean).length;

    const materialKeys = ['pla_petg', 'abs_asa', 'tpu_flex', 'nylon_cf'];
    const materialsChanges = [
      isEnableMaterialDifficultyChanged,
      ...materialKeys.map((k) => isMaterialMultiplierChanged(k)),
    ].filter(Boolean).length;

    return {
      general: generalChanges,
      labor: laborChanges,
      pricing: pricingChanges,
      materials: materialsChanges,
      data: 0,
    };
  }, [
    isCurrencyChanged,
    isElectricityRateChanged,
    isDefaultPrinterChanged,
    isMinOrderPriceChanged,
    isLaborRateChanged,
    isLaborTimeMinutesChanged,
    isOwnerLaborDefaultChanged,
    isLaborPerUnitDefaultChanged,
    isDefaultMarkupChanged,
    isDefaultUrgencyPercentChanged,
    isDefaultDefectChanged,
    isEnableMaterialDifficultyChanged,
    isMaterialMultiplierChanged,
  ]);

  const totalModifiedCount = changesMap.general + changesMap.labor + changesMap.pricing + changesMap.materials;
  const isDirty = totalModifiedCount > 0;

  // Синхронизация с DataProvider для блокировки переходов
  useEffect(() => {
    setIsSettingsDirty(isDirty);
    return () => {
      setIsSettingsDirty(false);
    };
  }, [isDirty, setIsSettingsDirty]);

  // Функция сохранения настроек
  const handleSave = useCallback(async () => {
    if (!settings || isSaving) return;
    setIsSaving(true);

    try {
      await updateSettings({
        currency: currency.trim() || '₽',
        electricity_rate: parseFloat(electricityRate) || 0,
        default_printer_id: defaultPrinterId || null,
        min_order_price: parseFloat(minOrderPrice) || 0,
        labor_rate_per_hour: parseFloat(laborRate) || 0,
        labor_time_minutes: parseInt(laborTimeMinutes, 10) || 15,
        is_owner_labor_default: isOwnerLaborDefault,
        is_labor_per_unit_default: isLaborPerUnitDefault,
        default_markup_percent: parseFloat(defaultMarkup) || 100,
        default_defect_percent: parseFloat(defaultDefect) || 5,
        default_urgency_percent: parseFloat(defaultUrgencyPercent) || 25,
        enable_material_difficulty: enableMaterialDifficulty,
        material_multipliers: materialMultipliers,
      });

      showToast('Настройки успешно сохранены!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Ошибка при сохранении настроек.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [
    settings,
    isSaving,
    updateSettings,
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
    showToast,
  ]);

  // Передаем функцию сохранения в реф DataProvider для всплывающей модалки
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
            labor_time_minutes: parseInt(laborTimeMinutes, 10) || 15,
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
          console.error(err);
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
    updateSettings,
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
  ]);

  // Горячая клавиша сохранения: Ctrl + S / Cmd + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <div className="space-y-6">
      {/* Шапка страницы */}
      <PageHeader
        icon={SettingsIcon}
        title="Настройки мастерской"
        subtitle="Параметры калькулятора, тарифы, работа мастера, наценки и коэффициенты материалов"
        accentColor="#0CB4E0"
      />

      {/* Верхняя фиксированная панель статуса и быстрых действий */}
      <div className="sticky top-2 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 bg-[#16181d]/90 backdrop-blur-xl border border-[#242930] rounded-2xl shadow-xl transition-all">
        {/* Индикатор статуса */}
        <div className="flex items-center gap-3">
          {totalModifiedCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Несохранённых изменений: <strong className="font-mono font-bold text-amber-200">{totalModifiedCount}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <CheckCircle2 size={15} />
              <span>Все параметры сохранены</span>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {totalModifiedCount > 0 && (
            <button
              type="button"
              onClick={handleResetToSaved}
              disabled={isSaving}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-[#1a1d24] border border-[#242930] hover:border-gray-600 transition-all cursor-pointer select-none flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Сбросить</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || totalModifiedCount === 0}
            className={`group relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-300 select-none cursor-pointer ${
              totalModifiedCount > 0
                ? 'bg-[linear-gradient(115deg,#0CB4E0_0%,#38bdf8_20%,#f59e0b_50%,#ff6b00_75%,#0CB4E0_100%)] animate-shimmer-flow hover:animate-shimmer-flow-fast text-white shadow-[0_4px_16px_rgba(12,180,224,0.35),0_4px_24px_rgba(255,107,0,0.25)] hover:shadow-[0_0_28px_rgba(12,180,224,0.55),0_0_40px_rgba(255,107,0,0.45)] hover:scale-[1.03] active:scale-[0.97]'
                : 'bg-[#242930] text-gray-400 border border-transparent cursor-not-allowed opacity-70'
            }`}
          >
            {/* Анимированный скользящий световой блик при наведении */}
            {totalModifiedCount > 0 && (
              <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -skew-x-25 -translate-x-[200%] group-hover:translate-x-[350%] transition-transform duration-1000 ease-out pointer-events-none" />
            )}

            <Save
              size={16}
              className={`shrink-0 transition-transform duration-300 ${
                totalModifiedCount > 0 ? 'group-hover:rotate-[-12deg] group-hover:scale-110' : ''
              }`}
            />
            <span className="relative z-10 drop-shadow-sm">
              {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
            </span>
          </button>
        </div>
      </div>

      {/* Вкладки настроек */}
      <SettingsTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        changesMap={changesMap}
      />

      {/* Содержимое активной вкладки */}
      <div className="transition-all duration-150">
        {activeTab === 'general' && (
          <GeneralSettingsTab
            currency={currency}
            setCurrency={setCurrency}
            isCurrencyChanged={isCurrencyChanged}
            electricityRate={electricityRate}
            setElectricityRate={setElectricityRate}
            isElectricityRateChanged={isElectricityRateChanged}
            defaultPrinterId={defaultPrinterId}
            setDefaultPrinterId={setDefaultPrinterId}
            isDefaultPrinterChanged={isDefaultPrinterChanged}
            printers={printers}
            minOrderPrice={minOrderPrice}
            setMinOrderPrice={setMinOrderPrice}
            isMinOrderPriceChanged={isMinOrderPriceChanged}
          />
        )}

        {activeTab === 'labor' && (
          <LaborSettingsTab
            currency={currency}
            laborRate={laborRate}
            setLaborRate={setLaborRate}
            isLaborRateChanged={isLaborRateChanged}
            laborTimeMinutes={laborTimeMinutes}
            setLaborTimeMinutes={setLaborTimeMinutes}
            isLaborTimeMinutesChanged={isLaborTimeMinutesChanged}
            isOwnerLaborDefault={isOwnerLaborDefault}
            setIsOwnerLaborDefault={setIsOwnerLaborDefault}
            isOwnerLaborDefaultChanged={isOwnerLaborDefaultChanged}
            isLaborPerUnitDefault={isLaborPerUnitDefault}
            setIsLaborPerUnitDefault={setIsLaborPerUnitDefault}
            isLaborPerUnitDefaultChanged={isLaborPerUnitDefaultChanged}
          />
        )}

        {activeTab === 'pricing' && (
          <PricingSettingsTab
            currency={currency}
            defaultMarkup={defaultMarkup}
            setDefaultMarkup={setDefaultMarkup}
            isDefaultMarkupChanged={isDefaultMarkupChanged}
            defaultUrgencyPercent={defaultUrgencyPercent}
            setDefaultUrgencyPercent={setDefaultUrgencyPercent}
            isDefaultUrgencyPercentChanged={isDefaultUrgencyPercentChanged}
            defaultDefect={defaultDefect}
            setDefaultDefect={setDefaultDefect}
            isDefaultDefectChanged={isDefaultDefectChanged}
          />
        )}

        {activeTab === 'materials' && (
          <MaterialsSettingsTab
            enableMaterialDifficulty={enableMaterialDifficulty}
            setEnableMaterialDifficulty={setEnableMaterialDifficulty}
            isEnableMaterialDifficultyChanged={isEnableMaterialDifficultyChanged}
            materialMultipliers={materialMultipliers}
            setMaterialMultipliers={setMaterialMultipliers}
            isMaterialMultiplierChanged={isMaterialMultiplierChanged}
          />
        )}

        {activeTab === 'data' && (
          <DataManagementTab
            isSeeding={isSeeding}
            setIsSeeding={setIsSeeding}
            isClearing={isClearing}
            setIsClearing={setIsClearing}
            isConfirmClearModalOpen={isConfirmClearModalOpen}
            setIsConfirmClearModalOpen={setIsConfirmClearModalOpen}
            isConfirmSeedModalOpen={isConfirmSeedModalOpen}
            setIsConfirmSeedModalOpen={setIsConfirmSeedModalOpen}
          />
        )}
      </div>

      {/* Интерактивное Live Sandbox превью расчетов */}
      {activeTab !== 'data' && (
        <LiveCalculationPreview
          currency={currency}
          electricityRate={electricityRate}
          laborRate={laborRate}
          laborTimeMinutes={laborTimeMinutes}
          isOwnerLaborDefault={isOwnerLaborDefault}
          defaultMarkup={defaultMarkup}
          defaultDefect={defaultDefect}
          minOrderPrice={minOrderPrice}
          enableMaterialDifficulty={enableMaterialDifficulty}
          materialMultipliers={materialMultipliers}
        />
      )}
    </div>
  );
}
