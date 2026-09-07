'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../../entities/model/DataProvider';
import { useToast } from '../../entities/model/ToastProvider';
import { CockpitButton } from '../../shared/ui/CockpitButton';
import type { SettingsTabId } from './components/SettingsTabs';
import { SETTINGS_SECTIONS, SettingsWorkspaceNav } from './components/SettingsWorkspaceNav';
import { GeneralSettingsTab } from './components/GeneralSettingsTab';
import { LaborSettingsTab } from './components/LaborSettingsTab';
import { PricingSettingsTab } from './components/PricingSettingsTab';
import { MaterialsSettingsTab } from './components/MaterialsSettingsTab';
import { DataManagementTab } from './components/DataManagementTab';
import { LiveCalculationPreview } from './components/LiveCalculationPreview';
import { Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { usePersistentState } from '../../shared/lib/usePersistentState';
import { hasNumericSettingChanged, isSettingsDraftEquivalent, normalizeWholeMinutes, parseNonNegativeSetting } from './model';

const getNormalizedMaterialMultipliers = (multipliers?: Record<string, number> | null): Record<string, number> => ({
  pla_petg: multipliers?.pla_petg ?? 100,
  abs_asa: multipliers?.abs_asa ?? 120,
  tpu_flex: multipliers?.tpu_flex ?? 140,
  nylon_cf: multipliers?.nylon_cf ?? 170,
});

export function SettingsFormModern({ isExpanded = false }: { isExpanded?: boolean }) {
  const {
    settings,
    printers,
    updateSettings,
    setIsSettingsDirty,
    settingsSaveRef
  } = useData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = usePersistentState<SettingsTabId>('3d_settings_active_tab', 'general');
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
  const [previousSettings, setPreviousSettings] = useState(settings);

  if (settings && settings !== previousSettings) {
    const shouldHydrate = previousSettings ? isSettingsDraftEquivalent({
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
    }, previousSettings) : true;
    setPreviousSettings(settings);
    if (shouldHydrate) {
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
  }

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
  const isElectricityRateChanged = hasNumericSettingChanged(electricityRate, settings?.electricity_rate ?? 4.89);
  const isDefaultPrinterChanged = defaultPrinterId !== (settings?.default_printer_id || '');
  const isMinOrderPriceChanged = hasNumericSettingChanged(minOrderPrice, settings?.min_order_price ?? 300);

  const isLaborRateChanged = hasNumericSettingChanged(laborRate, settings?.labor_rate_per_hour ?? 0);
  const isLaborTimeMinutesChanged = hasNumericSettingChanged(laborTimeMinutes, settings?.labor_time_minutes ?? 15);
  const isOwnerLaborDefaultChanged = isOwnerLaborDefault !== (settings?.is_owner_labor_default ?? true);
  const isLaborPerUnitDefaultChanged = isLaborPerUnitDefault !== (settings?.is_labor_per_unit_default ?? false);

  const isDefaultMarkupChanged = hasNumericSettingChanged(defaultMarkup, settings?.default_markup_percent ?? 100);
  const isDefaultUrgencyPercentChanged = hasNumericSettingChanged(defaultUrgencyPercent, settings?.default_urgency_percent ?? 25);
  const isDefaultDefectChanged = hasNumericSettingChanged(defaultDefect, settings?.default_defect_percent ?? 5);

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
  const currentSection = SETTINGS_SECTIONS.find((section) => section.id === activeTab) ?? SETTINGS_SECTIONS[0];
  const CurrentSectionIcon = currentSection.icon;

  const settingsPayload = useMemo(() => ({
    currency: currency.trim() || '₽',
    electricity_rate: parseNonNegativeSetting(electricityRate, settings?.electricity_rate ?? 0),
    default_printer_id: defaultPrinterId || null,
    min_order_price: parseNonNegativeSetting(minOrderPrice, settings?.min_order_price ?? 0),
    labor_rate_per_hour: parseNonNegativeSetting(laborRate, settings?.labor_rate_per_hour ?? 0),
    labor_time_minutes: normalizeWholeMinutes(parseNonNegativeSetting(laborTimeMinutes, settings?.labor_time_minutes ?? 15)),
    is_owner_labor_default: isOwnerLaborDefault,
    is_labor_per_unit_default: isLaborPerUnitDefault,
    default_markup_percent: parseNonNegativeSetting(defaultMarkup, settings?.default_markup_percent ?? 100),
    default_defect_percent: parseNonNegativeSetting(defaultDefect, settings?.default_defect_percent ?? 5),
    default_urgency_percent: parseNonNegativeSetting(defaultUrgencyPercent, settings?.default_urgency_percent ?? 25),
    enable_material_difficulty: enableMaterialDifficulty,
    material_multipliers: materialMultipliers,
  }), [
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
  ]);

  useEffect(() => {
    setIsSettingsDirty(isDirty);
    return () => {
      setIsSettingsDirty(false);
    };
  }, [isDirty, setIsSettingsDirty]);

  const handleSave = useCallback(async () => {
    if (!settings || isSaving) return;
    setIsSaving(true);

    try {
      await updateSettings(settingsPayload);

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
    settingsPayload,
    showToast,
  ]);

  useEffect(() => {
    if (settingsSaveRef) {
      settingsSaveRef.current = async () => {
        try {
          await updateSettings(settingsPayload);
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
    settingsPayload,
  ]);

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
    <div className="space-y-3 font-mono text-xs">
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">WORKSHOP CONFIGURATION</p>
            <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[9px] font-bold ${isDirty ? 'border-amber-800/40 bg-amber-950/60 text-amber-400' : 'border-emerald-800/40 bg-emerald-950/60 text-emerald-400'}`}>
              {isDirty ? `${totalModifiedCount} НЕ СОХРАНЕНО` : 'СИНХРОНИЗИРОВАНО'}
            </span>
            {isExpanded ? <span className="rounded border border-white/10 bg-neutral-950 px-2 py-0.5 font-mono text-[9px] text-neutral-500">ПОДРОБНЫЙ РЕЖИМ</span> : null}
          </div>
          <h2 className="mt-1.5 font-sans text-base font-bold text-white">Настройки расчётов без лишнего шума</h2>
          <p className="mt-1 font-sans text-xs text-neutral-400">Слева выберите область, измените параметры в центре и сохраните их одной кнопкой.</p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          {isDirty ? <CockpitButton type="button" onClick={handleResetToSaved} disabled={isSaving} icon={RotateCcw}>Сбросить</CockpitButton> : null}
          <CockpitButton
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            icon={isDirty ? Save : CheckCircle2}
            isActive={isDirty}
            className={isDirty ? 'border-white/20 bg-white text-neutral-950 hover:bg-neutral-200 font-bold' : ''}
          >
            {isSaving ? 'Сохранение...' : isDirty ? 'Сохранить изменения' : 'Всё сохранено'}
          </CockpitButton>
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[250px_minmax(0,1fr)]">
        <SettingsWorkspaceNav activeTab={activeTab} onSelectTab={setActiveTab} changesMap={changesMap} />

        <section aria-labelledby="settings-section-title" className="min-w-0 rounded-xl border border-white/10 bg-white/[0.025] p-3 sm:p-4">
          <div className="mb-4 flex items-start gap-3 border-b border-white/10 pb-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] text-cyan-400">
              <CurrentSectionIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500">{currentSection.id.toUpperCase()} SETTINGS</p>
              <h2 id="settings-section-title" className="mt-1 font-sans text-base font-bold text-white">{currentSection.heading}</h2>
              <p className="mt-1 font-sans text-xs leading-relaxed text-neutral-400">{currentSection.intro}</p>
            </div>
          </div>

          <div className="transition-opacity duration-150">
        {activeTab === 'general' ? (
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
        ) : null}

        {activeTab === 'labor' ? (
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
        ) : null}

        {activeTab === 'pricing' ? (
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
        ) : null}

        {activeTab === 'materials' ? (
          <MaterialsSettingsTab
            enableMaterialDifficulty={enableMaterialDifficulty}
            setEnableMaterialDifficulty={setEnableMaterialDifficulty}
            isEnableMaterialDifficultyChanged={isEnableMaterialDifficultyChanged}
            materialMultipliers={materialMultipliers}
            setMaterialMultipliers={setMaterialMultipliers}
            isMaterialMultiplierChanged={isMaterialMultiplierChanged}
          />
        ) : null}

        {activeTab === 'data' ? (
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
        ) : null}
          </div>
        </section>
      </div>

      {isExpanded ? (
        <div className="grid items-start gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
          <SettingsSnapshot
            currency={currency}
            electricityRate={electricityRate}
            laborRate={laborRate}
            laborTimeMinutes={laborTimeMinutes}
            defaultMarkup={defaultMarkup}
            defaultDefect={defaultDefect}
            minOrderPrice={minOrderPrice}
            defaultPrinterName={printers.find((printer) => printer.id === defaultPrinterId)?.name ?? 'Не выбран'}
          />
          {activeTab !== 'data' ? (
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
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">DATA SAFETY</p>
              <h3 className="mt-2 font-sans text-base font-bold text-white">Безопасный порядок работы с данными</h3>
              <ol className="mt-4 space-y-3 font-sans text-xs leading-relaxed text-neutral-400">
                <li className="rounded-lg border border-white/10 bg-neutral-950/55 p-3"><strong className="text-white">1. Экспортируйте копию</strong><br />Сохраните актуальный JSON перед массовыми изменениями.</li>
                <li className="rounded-lg border border-white/10 bg-neutral-950/55 p-3"><strong className="text-white">2. Проверьте источник</strong><br />Импортируйте только файл, созданный этой мастерской.</li>
                <li className="rounded-lg border border-white/10 bg-neutral-950/55 p-3"><strong className="text-white">3. Обновите страницу</strong><br />После восстановления интерфейс перечитает локальное хранилище.</li>
              </ol>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SettingsSnapshot({
  currency,
  electricityRate,
  laborRate,
  laborTimeMinutes,
  defaultMarkup,
  defaultDefect,
  minOrderPrice,
  defaultPrinterName,
}: {
  currency: string;
  electricityRate: string;
  laborRate: string;
  laborTimeMinutes: string;
  defaultMarkup: string;
  defaultDefect: string;
  minOrderPrice: string;
  defaultPrinterName: string;
}) {
  const facts = [
    ['Электроэнергия', `${electricityRate || '0'} ${currency}/кВт⋅ч`],
    ['Работа мастера', `${laborRate || '0'} ${currency}/ч`],
    ['Время на заказ', `${laborTimeMinutes || '0'} мин`],
    ['Базовая наценка', `${defaultMarkup || '0'}%`],
    ['Резерв на брак', `${defaultDefect || '0'}%`],
    ['Минимальный чек', `${minOrderPrice || '0'} ${currency}`],
  ];
  return (
    <aside aria-label="Сводка текущих настроек" className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">FULLSCREEN · CONFIG SNAPSHOT</p>
      <h3 className="mt-1.5 font-sans text-base font-bold text-white">Что сейчас применяет калькулятор</h3>
      <p className="mt-1 font-sans text-xs text-neutral-400">Сводка обновляется сразу, даже до сохранения черновика.</p>
      <div className="mt-4 divide-y divide-white/5 rounded-lg border border-white/10 bg-neutral-950/55 px-3">
        {facts.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2.5">
            <span className="font-sans text-[11px] text-neutral-500">{label}</span>
            <span className="font-mono text-[11px] font-bold text-white tabular-nums">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-cyan-500/15 bg-cyan-500/[0.04] p-3">
        <p className="font-mono text-[9px] uppercase tracking-wider text-cyan-400">ПРИНТЕР ПО УМОЛЧАНИЮ</p>
        <p className="mt-1 truncate font-sans text-xs font-semibold text-white">{defaultPrinterName}</p>
      </div>
    </aside>
  );
}
