'use client';

import React from 'react';
import { Card } from '../../../shared/ui/Card';
import { QuickStepper } from './QuickStepper';
import { normalizeWholeMinutes } from '../model';
import { UserCheck, Users, Layers, Package } from 'lucide-react';

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
    <div className="flex flex-col gap-4 font-mono text-xs">
      {/* 1. Ставка и время работы мастера */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Почасовая ставка */}
        <Card
          title="Почасовая ставка труда"
          stepNumber="LAB 01"
          className="flex flex-col justify-between"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Стоимость 1 часа ручной постобработки: удаление поддержек, шлифовка, сборка, покраска и упаковка.
              </p>
              {isLaborRateChanged && (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 shrink-0 font-mono">
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

            <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 text-[11px] text-neutral-400">
              При ставке <strong>{laborRate || '0'} {currency}/ч</strong> минута ручного труда стоит <strong>{((parseFloat(laborRate) || 0) / 60).toFixed(2)} {currency}</strong>.
            </div>
          </div>
        </Card>

        {/* Время по умолчанию */}
        <Card
          title="Время работы по умолчанию"
          stepNumber="LAB 02"
          className="flex flex-col justify-between"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Количество минут постобработки, которое автоматически подставляется при создании каждого нового расчета.
              </p>
              {isLaborTimeMinutesChanged && (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 shrink-0 font-mono">
                  изменено
                </span>
              )}
            </div>

            <QuickStepper
              label="Минут на обработку детали"
              value={parseInt(laborTimeMinutes, 10) || 0}
              onChange={(val) => setLaborTimeMinutes(normalizeWholeMinutes(val).toString())}
              min={0}
              max={600}
              step={5}
              presets={[0, 10, 15, 30, 45, 60]}
              suffix=" мин"
              isModified={isLaborTimeMinutesChanged}
            />

            <div className="p-2.5 rounded-xl bg-neutral-900 border border-white/10 text-[11px] text-neutral-400">
              По умолчанию для стандартной модели обычно требуется <strong>10–15 минут</strong> на снятие поддержек и осмотр.
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Модель распределения дохода */}
      <Card
        title="Модель распределения дохода от труда"
        stepNumber="LAB 03"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Определяет, куда направляется стоимость ручной работы в финансовой отчетности и аналитике прибыли.
            </p>
            {isOwnerLaborDefaultChanged && (
              <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 shrink-0 font-mono">
                изменено
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Опция 1: Личный труд владельца */}
            <div
              onClick={() => setIsOwnerLaborDefault(true)}
              className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer select-none ${
                isOwnerLaborDefault
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                  : 'bg-neutral-900 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isOwnerLaborDefault ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-white/5 text-neutral-400'}`}>
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">Личный труд владельца</h4>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-mono">100% идет в прибыль</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isOwnerLaborDefault ? 'border-emerald-400 bg-emerald-500' : 'border-neutral-600'}`}>
                  {isOwnerLaborDefault && <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                </div>
              </div>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Вы делаете работу сами. Оплата за ручной труд не увеличивает расходную себестоимость, а полностью суммируется с чистой прибылью мастерской.
              </p>
            </div>

            {/* Опция 2: Наемный мастер */}
            <div
              onClick={() => setIsOwnerLaborDefault(false)}
              className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer select-none ${
                !isOwnerLaborDefault
                  ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm'
                  : 'bg-neutral-900 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${!isOwnerLaborDefault ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40' : 'bg-white/5 text-neutral-400'}`}>
                    <Users size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">Наемный специалист</h4>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider font-mono">Расходная себестоимость</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!isOwnerLaborDefault ? 'border-cyan-400 bg-cyan-500' : 'border-neutral-600'}`}>
                  {!isOwnerLaborDefault && <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                </div>
              </div>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Работу выполняет наемный мастер. Оплата труда вычитается как прямые затраты мастерской (себестоимость) перед расчетом чистой прибыли.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Способ начисления времени труда при тиражах */}
      <Card
        title="Начисление времени работы при тиражах (Кол-во > 1)"
        stepNumber="LAB 04"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Как рассчитывать общее время работы мастера, если клиент заказывает тираж из нескольких копий (например, 10 шт).
            </p>
            {isLaborPerUnitDefaultChanged && (
              <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 shrink-0 font-mono">
                изменено
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* За весь заказ */}
            <div
              onClick={() => setIsLaborPerUnitDefault(false)}
              className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer select-none ${
                !isLaborPerUnitDefault
                  ? 'bg-amber-950/40 border-amber-500/50 shadow-sm'
                  : 'bg-neutral-900 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${!isLaborPerUnitDefault ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40' : 'bg-white/5 text-neutral-400'}`}>
                    <Package size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">Фиксированно за весь заказ</h4>
                    <span className="text-[10px] text-amber-400 font-bold font-mono">Время × 1</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!isLaborPerUnitDefault ? 'border-amber-400 bg-amber-500' : 'border-neutral-600'}`}>
                  {!isLaborPerUnitDefault && <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                </div>
              </div>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Время учитывается 1 раз на всю партию (подготовка стола, нарезка слайсера, запаковка посылки). Идеально для оптовых заказов.
              </p>
            </div>

            {/* За каждую штуку */}
            <div
              onClick={() => setIsLaborPerUnitDefault(true)}
              className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer select-none ${
                isLaborPerUnitDefault
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                  : 'bg-neutral-900 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isLaborPerUnitDefault ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-white/5 text-neutral-400'}`}>
                    <Layers size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">Умножать на каждую штуку</h4>
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">Время × Количество</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isLaborPerUnitDefault ? 'border-emerald-400 bg-emerald-500' : 'border-neutral-600'}`}>
                  {isLaborPerUnitDefault && <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                </div>
              </div>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Время тратится на каждую единицу отдельно (ручная шлифовка, сборка винтов в каждой детали). Рекомендуется при штучной доработке.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
