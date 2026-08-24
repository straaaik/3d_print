'use client';

import React from 'react';
import { Card } from '../../../shared/ui/Card';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { QuickStepper } from './QuickStepper';
import { Printer } from '../../../shared/types';
import { Zap, Coins, Cpu, ShieldCheck, HelpCircle } from 'lucide-react';

interface GeneralSettingsTabProps {
  currency: string;
  setCurrency: (val: string) => void;
  isCurrencyChanged: boolean;

  electricityRate: string;
  setElectricityRate: (val: string) => void;
  isElectricityRateChanged: boolean;

  defaultPrinterId: string;
  setDefaultPrinterId: (val: string) => void;
  isDefaultPrinterChanged: boolean;
  printers: Printer[];

  minOrderPrice: string;
  setMinOrderPrice: (val: string) => void;
  isMinOrderPriceChanged: boolean;
}

const POPULAR_CURRENCIES = [
  { symbol: '₽', label: 'Рубль (₽)', desc: 'Россия' },
  { symbol: '$', label: 'Доллар ($)', desc: 'США' },
  { symbol: '€', label: 'Евро (€)', desc: 'Европа' },
  { symbol: '₸', label: 'Тенге (₸)', desc: 'Казахстан' },
  { symbol: 'Br', label: 'Бел. рубль (Br)', desc: 'Беларусь' },
];

const ELECTRICITY_PRESETS = [
  { rate: 4.89, label: 'Стандарт (4.89)' },
  { rate: 5.5, label: 'Город (5.50)' },
  { rate: 6.73, label: 'Москва (6.73)' },
  { rate: 8.2, label: 'Коммерческий (8.20)' },
];

export function GeneralSettingsTab({
  currency,
  setCurrency,
  isCurrencyChanged,
  electricityRate,
  setElectricityRate,
  isElectricityRateChanged,
  defaultPrinterId,
  setDefaultPrinterId,
  isDefaultPrinterChanged,
  printers,
  minOrderPrice,
  setMinOrderPrice,
  isMinOrderPriceChanged,
}: GeneralSettingsTabProps) {
  const defaultPrinterOptions = [
    { value: '', label: 'Не выбран (ручной выбор в калькуляторе)' },
    ...printers.map((p) => ({
      value: p.id,
      label: p.name,
      color: p.color,
    })),
  ];

  const selectedPrinter = printers.find((p) => p.id === defaultPrinterId);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Валюта мастерской */}
      <Card
        title="Валюта расчетов и отображения"
        stepNumber="💰"
        className="border-[#242930] bg-[#16181d]"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            Основной символ валюты, используемый для цен, себестоимости филаментов, электричества и заказов во всей системе.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {POPULAR_CURRENCIES.map((cur) => {
              const isSelected = currency === cur.symbol;
              return (
                <button
                  key={cur.symbol}
                  type="button"
                  onClick={() => setCurrency(cur.symbol)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-primary/15 border-primary text-white shadow-md shadow-primary/10'
                      : 'bg-[#12141a] border-[#242930] text-gray-300 hover:border-gray-600 hover:bg-[#1a1d24]'
                  }`}
                >
                  <span className="text-lg font-bold font-mono">{cur.symbol}</span>
                  <span className="text-[11px] font-medium text-gray-300">{cur.label}</span>
                  <span className="text-[9px] text-gray-400">{cur.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-gray-400 whitespace-nowrap">Свой символ валюты:</span>
            <div className="w-32">
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="₽"
                className="text-center font-bold font-mono"
                isModified={isCurrencyChanged}
              />
            </div>
            {isCurrencyChanged && (
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                изменено
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* 2. Электроэнергия и Оборудование по умолчанию */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Тариф на электричество */}
        <Card
          title="Тариф электроэнергии"
          stepNumber="⚡"
          className="border-[#242930] bg-[#16181d] flex flex-col justify-between"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-gray-400 leading-relaxed">
                Стоимость 1 кВт·ч для учета энергопотребления стола и экструдера принтера в себестоимости печати.
              </p>
              {isElectricityRateChanged && (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                  изменено
                </span>
              )}
            </div>

            <QuickStepper
              label={`Тариф за 1 кВт·ч, ${currency}`}
              value={parseFloat(electricityRate) || 0}
              onChange={(val) => setElectricityRate(val.toString())}
              min={0}
              max={100}
              step={0.1}
              suffix={` ${currency}`}
              isModified={isElectricityRateChanged}
            />

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-gray-400">Быстрый выбор тарифа:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {ELECTRICITY_PRESETS.map((p) => (
                  <button
                    key={p.rate}
                    type="button"
                    onClick={() => setElectricityRate(p.rate.toString())}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer text-left flex items-center justify-between ${
                      parseFloat(electricityRate) === p.rate
                        ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 font-bold'
                        : 'bg-[#12141a] border-[#242930] text-gray-400 hover:text-gray-200 hover:border-gray-600'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="text-[10px] opacity-75">{currency}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Принтер по умолчанию */}
        <Card
          title="Принтер по умолчанию"
          stepNumber="🖨️"
          className="border-[#242930] bg-[#16181d] flex flex-col justify-between"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-gray-400 leading-relaxed">
                Принтер, который будет автоматически подставляться при создании нового расчета стоимости.
              </p>
              {isDefaultPrinterChanged && (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                  изменено
                </span>
              )}
            </div>

            <Select
              label="Оборудование"
              value={defaultPrinterId}
              options={defaultPrinterOptions}
              onChange={setDefaultPrinterId}
              isModified={isDefaultPrinterChanged}
            />

            {selectedPrinter ? (
              <div className="p-3 rounded-xl bg-[#12141a] border border-[#242930] flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                  style={{ backgroundColor: selectedPrinter.color || '#00e676' }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">{selectedPrinter.name}</span>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Мощность: {selectedPrinter.power_w ?? 250} Вт • Амортизация: {(selectedPrinter.price / (selectedPrinter.lifespan_hours || 2000)).toFixed(1)} {currency}/ч
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#12141a]/60 border border-dashed border-[#242930] text-center text-xs text-gray-500">
                Принтер по умолчанию не выбран
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 3. Минимальная стоимость заказа */}
      <Card
        title="Минимальная стоимость заказа (Порог чека)"
        stepNumber="🛡️"
        className="border-[#242930] bg-[#16181d]"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Автоматическое округление до минимума</span>
              {isMinOrderPriceChanged && (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  изменено
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Защищает мастерскую от нерентабельной мелкой печати. Если расчетная розничная цена заказа ниже этого значения, калькулятор автоматически повысит итоговую цену до минимального чека.
            </p>
            <div className="text-[11px] text-sky-400/90 flex items-center gap-1.5 mt-1">
              <HelpCircle size={13} className="shrink-0" />
              <span>Установите <strong>0</strong>, если хотите рассчитывать без ограничения минимального чека.</span>
            </div>
          </div>

          <div className="md:col-span-5 bg-[#12141a] p-4 rounded-xl border border-[#242930] flex flex-col gap-3">
            <QuickStepper
              label={`Порог минимального чека, ${currency}`}
              value={parseFloat(minOrderPrice) || 0}
              onChange={(val) => setMinOrderPrice(val.toString())}
              min={0}
              max={10000}
              step={50}
              presets={[0, 150, 300, 500, 1000]}
              suffix={` ${currency}`}
              isModified={isMinOrderPriceChanged}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
