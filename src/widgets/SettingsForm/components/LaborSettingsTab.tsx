'use client';

import React from 'react';
import { Card } from '../../../shared/ui/Card';
import { QuickStepper } from './QuickStepper';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { Wrench, Clock, UserCheck, Users, Layers, Package } from 'lucide-react';

interface LaborSettingsTabProps {
  currency: string;

  laborRate: string;
  setLaborRate: (val: string) => void;
  isLaborRateChanged: boolean;

  laborTimeMinutes: string;
  setLaborTimeMinutes: (val: string) => void;
  isLaborTimeMinutesChanged: boolean;

  isOwnerLaborDefault: boolean;
  setIsOwnerLaborDefault: (val: boolean) => void;
  isOwnerLaborDefaultChanged: boolean;

  isLaborPerUnitDefault: boolean;
  setIsLaborPerUnitDefault: (val: boolean) => void;
  isLaborPerUnitDefaultChanged: boolean;
}

export function LaborSettingsTab({
  currency,
  laborRate,
  setLaborRate,
  isLaborRateChanged,
  laborTimeMinutes,
  setLaborTimeMinutes,
  isLaborTimeMinutesChanged,
  isOwnerLaborDefault,
  setIsOwnerLaborDefault,
  isOwnerLaborDefaultChanged,
  isLaborPerUnitDefault,
  setIsLaborPerUnitDefault,
  isLaborPerUnitDefaultChanged,
}: LaborSettingsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Ставка и время работы мастера */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Почасовая ставка */}
        <Card
          title="Почасовая ставка труда"
          stepNumber="⏱️"
          className="border-[#242930] bg-[#16181d] flex flex-col justify-between"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-gray-400 leading-relaxed">
                Стоимость 1 часа ручной постобработки: удаление поддержек, шлифовка, сборка, покраска и упаковка.
              </p>
              {isLaborRateChanged && (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                  изменено
                </span>
              )}
            </div>

            <QuickStepper
              label={`Ставка за час, ${currency}/ч`}
              value={parseFloat(laborRate) || 0}
              onChange={(val) => setLaborRate(val.toString())}
              min={0}
              max={10000}
              step={50}
              presets={[0, 300, 500, 800, 1200]}
              suffix={` ${currency}/ч`}
              isModified={isLaborRateChanged}
            />

            <div className="p-2.5 rounded-xl bg-[#12141a] border border-[#242930] text-[11px] text-gray-400">
              💡 При ставке <strong>{laborRate || '0'} {currency}/ч</strong> минута ручного труда стоит <strong>{((parseFloat(laborRate) || 0) / 60).toFixed(2)} {currency}</strong>.
            </div>
          </div>
        </Card>

        {/* Время по умолчанию */}
        <Card
          title="Время работы по умолчанию"
          stepNumber="⏳"
          className="border-[#242930] bg-[#16181d] flex flex-col justify-between"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-gray-400 leading-relaxed">
                Количество минут постобработки, которое автоматически подставляется при создании каждого нового расчета.
              </p>
              {isLaborTimeMinutesChanged && (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                  изменено
                </span>
              )}
            </div>

            <QuickStepper
              label="Минут на обработку детали"
              value={parseInt(laborTimeMinutes, 10) || 0}
              onChange={(val) => setLaborTimeMinutes(val.toString())}
              min={0}
              max={600}
              step={5}
              presets={[0, 10, 15, 30, 45, 60]}
              suffix=" мин"
              isModified={isLaborTimeMinutesChanged}
            />

            <div className="p-2.5 rounded-xl bg-[#12141a] border border-[#242930] text-[11px] text-gray-400">
              По умолчанию для стандартной модели обычно требуется <strong>10–15 минут</strong> на снятие поддержек и осмотр.
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Модель распределения дохода (Личный труд владельца vs Наемный сотрудник) */}
      <Card
        title="Модель распределения дохода от труда"
        stepNumber="💼"
        className="border-[#242930] bg-[#16181d]"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 leading-relaxed">
              Определяет, куда направляется стоимость ручной работы в финансовой отчетности и аналитике прибыли.
            </p>
            {isOwnerLaborDefaultChanged && (
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                изменено
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Опция 1: Личный труд владельца */}
            <div
              onClick={() => setIsOwnerLaborDefault(true)}
              className={`p-4 rounded-xl border flex flex-col gap-2.5 transition-all cursor-pointer select-none ${
                isOwnerLaborDefault
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  : 'bg-[#12141a] border-[#242930] hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${isOwnerLaborDefault ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#242930] text-gray-400'}`}>
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Личный труд владельца</h4>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">100% идет в прибыль</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isOwnerLaborDefault ? 'border-emerald-400 bg-emerald-500' : 'border-gray-600'}`}>
                  {isOwnerLaborDefault && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Вы делаете работу сами. Оплата за ручной труд не увеличивает расходную себестоимость, а полностью суммируется с чистой прибылью мастерской.
              </p>
            </div>

            {/* Опция 2: Наемный мастер / Зарплата */}
            <div
              onClick={() => setIsOwnerLaborDefault(false)}
              className={`p-4 rounded-xl border flex flex-col gap-2.5 transition-all cursor-pointer select-none ${
                !isOwnerLaborDefault
                  ? 'bg-sky-500/10 border-sky-500/50 shadow-md shadow-sky-500/10'
                  : 'bg-[#12141a] border-[#242930] hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${!isOwnerLaborDefault ? 'bg-sky-500/20 text-sky-400' : 'bg-[#242930] text-gray-400'}`}>
                    <Users size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Наемный специалист</h4>
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Расходная себестоимость</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${!isOwnerLaborDefault ? 'border-sky-400 bg-sky-500' : 'border-gray-600'}`}>
                  {!isOwnerLaborDefault && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Работу выполняет наемный мастер. Оплата труда вычитается как прямые затраты мастерской (себестоимость) перед расчетом чистой прибыли.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Способ начисления времени труда при тиражах */}
      <Card
        title="Начисление времени работы при печати тиража (Кол-во > 1)"
        stepNumber="📦"
        className="border-[#242930] bg-[#16181d]"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 leading-relaxed">
              Как рассчитывать общее время работы мастера, если клиент заказывает тираж из нескольких копий (например, 10 шт).
            </p>
            {isLaborPerUnitDefaultChanged && (
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                изменено
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* За весь заказ */}
            <div
              onClick={() => setIsLaborPerUnitDefault(false)}
              className={`p-4 rounded-xl border flex flex-col gap-2.5 transition-all cursor-pointer select-none ${
                !isLaborPerUnitDefault
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                  : 'bg-[#12141a] border-[#242930] hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${!isLaborPerUnitDefault ? 'bg-amber-500/20 text-amber-400' : 'bg-[#242930] text-gray-400'}`}>
                    <Package size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Фиксированно за весь заказ</h4>
                    <span className="text-[10px] text-amber-400 font-bold font-mono">Время × 1</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${!isLaborPerUnitDefault ? 'border-amber-400 bg-amber-500' : 'border-gray-600'}`}>
                  {!isLaborPerUnitDefault && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Время учитывается 1 раз на всю партию (подготовка стола, нарезка слайсера, запаковка посылки). Идеально для оптовых заказов.
              </p>
            </div>

            {/* За каждую штуку */}
            <div
              onClick={() => setIsLaborPerUnitDefault(true)}
              className={`p-4 rounded-xl border flex flex-col gap-2.5 transition-all cursor-pointer select-none ${
                isLaborPerUnitDefault
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  : 'bg-[#12141a] border-[#242930] hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${isLaborPerUnitDefault ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#242930] text-gray-400'}`}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Умножать на каждую штуку</h4>
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">Время × Количество</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isLaborPerUnitDefault ? 'border-emerald-400 bg-emerald-500' : 'border-gray-600'}`}>
                  {isLaborPerUnitDefault && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Время тратится на каждую единицу отдельно (ручная шлифовка, сборка винтов в каждой детали). Рекомендуется при штучной доработке.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
