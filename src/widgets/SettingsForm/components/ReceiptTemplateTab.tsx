'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  Receipt,
  Check,
  CreditCard,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useReceiptTemplate } from '../../../shared/lib/receiptTemplate';
import { CockpitButton } from '../../../shared/ui/CockpitButton';
import { Card } from '../../../shared/ui/Card';
import { Input } from '../../../shared/ui/Input';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { useToast } from '../../../entities/model/ToastProvider';

export function ReceiptTemplateTab() {
  const { template, updateTemplate, resetTemplate } = useReceiptTemplate();
  const { showToast } = useToast();
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = () => {
    resetTemplate();
    setResetSuccess(true);
    showToast('Шаблон чека сброшен к стандартным настройкам', 'info');
    setTimeout(() => setResetSuccess(false), 2000);
  };

  const paymentPresets = [
    {
      label: 'СБП (Т-Банк)',
      value: 'СБП: +7 (999) 000-00-00\nБанк: Т-Банк\nПолучатель: Иван И.',
    },
    {
      label: 'СБП (Сбербанк)',
      value: 'СБП: +7 (999) 000-00-00\nБанк: Сбербанк\nПолучатель: Иван И.',
    },
    {
      label: 'По счёту (ИП / ООО)',
      value: 'Оплата по счёту / QR-коду\nИП Иванов И. И.\nИНН 123456789012',
    },
  ];

  const companyParts: string[] = [];
  if (template.showCompanyName) {
    companyParts.push(template.companyName || 'KUMO CRM');
  }
  if (template.showCompanySubtitle && template.companySubtitle) {
    companyParts.push(template.companySubtitle);
  }
  const previewStoreName = companyParts.join(' · ');
  const hasAnyHeaderContent = Boolean(
    previewStoreName ||
    template.showOrderNumber ||
    template.showReceiptType ||
    template.showOrderDate
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start font-mono text-xs">
      {/* ЛЕВАЯ КОЛОНКА: СТРУКТУРИРОВАННЫЕ НАСТРОЙКИ (КАРТОЧКИ) */}
      <div className="flex flex-col gap-4">
        {/* Карточка 1: Название мастерской и тексты чека */}
        <Card
          title="Шапка и надписи чека"
          stepNumber="RECEIPT 01"
          headerAction={
            <CockpitButton
              size="sm"
              onClick={handleReset}
              icon={resetSuccess ? Check : RotateCcw}
              className={resetSuccess ? 'border-emerald-500/40 text-emerald-400' : ''}
            >
              {resetSuccess ? 'Сброшено' : 'Сбросить шаблон'}
            </CockpitButton>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Постоянные реквизиты студии и надписи, которые будут отображаться в каждом сформированном чеке.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Название студии"
                value={template.companyName}
                onChange={(e) => updateTemplate({ companyName: e.target.value })}
                placeholder="KUMO CRM"
                hint="Основной заголовок в верхнем левом углу чека"
              />

              <Input
                label="Подзаголовок / профиль"
                value={template.companySubtitle}
                onChange={(e) => updateTemplate({ companySubtitle: e.target.value })}
                placeholder="ПРОИЗВОДСТВЕННАЯ ЛАБОРАТОРИЯ"
                hint="Отображается через точку рядом с названием"
              />

              <Input
                label="Тип документа"
                value={template.receiptType}
                onChange={(e) => updateTemplate({ receiptType: e.target.value })}
                placeholder="ТОВАРНЫЙ ЧЕК"
                hint="Например: ТОВАРНЫЙ ЧЕК или КВИТАНЦИЯ"
              />

              <Input
                label="Благодарность в подвале"
                value={template.thanksText}
                onChange={(e) => updateTemplate({ thanksText: e.target.value })}
                placeholder="СПАСИБО ЗА ДОВЕРИЕ К МАСТЕРСКОЙ!"
                hint="Финальная строчка в самом низу чека"
              />
            </div>

            {/* Видимость элементов шапки чека */}
            <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Видимость элементов в шапке
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const allHidden =
                      !template.showCompanyName &&
                      !template.showCompanySubtitle &&
                      !template.showReceiptType &&
                      !template.showOrderNumber &&
                      !template.showOrderDate;
                    const nextVal = allHidden;
                    updateTemplate({
                      showCompanyName: nextVal,
                      showCompanySubtitle: nextVal,
                      showReceiptType: nextVal,
                      showOrderNumber: nextVal,
                      showOrderDate: nextVal,
                    });
                  }}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors cursor-pointer"
                >
                  {!template.showCompanyName &&
                  !template.showCompanySubtitle &&
                  !template.showReceiptType &&
                  !template.showOrderNumber &&
                  !template.showOrderDate
                    ? 'Показать все'
                    : 'Скрыть все'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Checkbox
                  variant="cyan"
                  checked={template.showCompanyName}
                  onChange={(checked: boolean) => updateTemplate({ showCompanyName: !!checked })}
                  label="Название студии"
                  description="Заголовок студии в верхнем левом углу"
                />

                <Checkbox
                  variant="cyan"
                  checked={template.showCompanySubtitle}
                  onChange={(checked: boolean) => updateTemplate({ showCompanySubtitle: !!checked })}
                  label="Подзаголовок / профиль"
                  description="Подпись через точку рядом с названием"
                />

                <Checkbox
                  variant="cyan"
                  checked={template.showReceiptType}
                  onChange={(checked: boolean) => updateTemplate({ showReceiptType: !!checked })}
                  label="Тип документа"
                  description="Надпись «ТОВАРНЫЙ ЧЕК» или аналогичная"
                />

                <Checkbox
                  variant="cyan"
                  checked={template.showOrderNumber}
                  onChange={(checked: boolean) => updateTemplate({ showOrderNumber: !!checked })}
                  label="Номер заказа"
                  description="Идентификатор чека (№ 3DL-...)"
                />

                <Checkbox
                  variant="cyan"
                  checked={template.showOrderDate}
                  onChange={(checked: boolean) => updateTemplate({ showOrderDate: !!checked })}
                  label="Дата и время"
                  description="Штамп даты и времени создания"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Карточка 2: Реквизиты для оплаты */}
        <Card
          title="Реквизиты для оплаты"
          stepNumber="RECEIPT 02"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Выделите блок оплаты, чтобы клиенты сразу видели номер СБП или карты для перевода средств.
              </p>
            </div>

            <Checkbox
              variant="cyan"
              checked={template.showPaymentDetails}
              onChange={(checked: boolean) => updateTemplate({ showPaymentDetails: !!checked })}
              label="Показывать блок реквизитов для оплаты на чеке"
              description="Выводит контрастную плашку с реквизитами над штрихкодом"
            />

            {template.showPaymentDetails && (
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Текст реквизитов</span>
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Поддерживает несколько строк
                  </span>
                </div>

                <textarea
                  value={template.paymentDetails}
                  onChange={(e) => updateTemplate({ paymentDetails: e.target.value })}
                  placeholder="Впишите реквизиты (СБП, банк, карта, получатель)..."
                  rows={4}
                  className="w-full bg-neutral-900 border border-white/15 hover:border-white/25 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 focus:outline-none rounded-xl p-3 text-white text-xs font-mono placeholder-neutral-600 transition-colors resize-none leading-relaxed"
                />

                {/* Быстрые заготовки */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Шаблоны:</span>
                  </span>
                  {paymentPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updateTemplate({ paymentDetails: preset.value })}
                      className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Карточка 3: Параметры отображения элементов */}
        <Card
          title="Отображение элементов и спецификации"
          stepNumber="RECEIPT 03"
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Настройте, какие технические поля и данные отображаются клиенту по умолчанию.
            </p>

            <div className="flex flex-col gap-3">
              <Checkbox
                variant="cyan"
                checked={template.showBarcode}
                onChange={(checked: boolean) => updateTemplate({ showBarcode: !!checked })}
                label="Штрихкод в подвале чека"
                description="Декоративный аутентичный штрихкод кассового чека"
              />

              <Checkbox
                variant="cyan"
                checked={template.showPrinterAndFilament}
                onChange={(checked: boolean) => updateTemplate({ showPrinterAndFilament: !!checked })}
                label="Принтер и материал в шапке изделия"
                description="Показывать строчку с моделью принтера и типом пластика"
              />

              <Checkbox
                variant="cyan"
                checked={template.showWeight}
                onChange={(checked: boolean) => updateTemplate({ showWeight: !!checked })}
                label="Вес изделия"
                description="Показывать ориентировочный вес детали в граммах"
              />

              <Checkbox
                variant="cyan"
                checked={template.showUnitPrice}
                onChange={(checked: boolean) => updateTemplate({ showUnitPrice: !!checked })}
                label="Стоимость за 1 штуку под итогом"
                description="Автоматический расчет цены за единицу (например: 96,42 ₽ / шт. за 12 шт.)"
              />

              <div className="pt-2 border-t border-white/10">
                <Checkbox
                  variant="amber"
                  checked={template.defaultHideSpecification}
                  onChange={(checked: boolean) => updateTemplate({ defaultHideSpecification: !!checked })}
                  label="По умолчанию скрывать спецификацию доп. услуг"
                  description="Скрывает строчки услуг (упаковка, постобработка), а их стоимость автоматически прибавляет к строке «Изготовление»"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ПРАВАЯ КОЛОНКА: СТАТИЧНЫЙ ЖИВОЙ ПРЕДПРОСМОТР ЧЕКА */}
      <div className="xl:sticky xl:top-4 flex flex-col items-center gap-3">
        {/* Шапка над чеком */}
        <div className="w-[340px] max-w-[calc(100vw-24px)] flex items-center justify-between font-mono text-[11px] text-neutral-400 px-1">
          <span className="flex items-center gap-1.5 text-neutral-300 font-semibold">
            <Receipt className="w-3.5 h-3.5 text-cyan-400" />
            <span>ПРЕДПРОСМОТР ЧЕКА</span>
          </span>
          <span className="text-[10px] font-mono text-neutral-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            ЖИВОЙ ВИД
          </span>
        </div>

        {/* САМ БЛАНК ЧЕКА — ТОЧНАЯ СТАТИЧНАЯ КОПИЯ ДИЗАЙНА ИЗ КАЛЬКУЛЯТОРА */}
        <div
          style={{
            backgroundColor: 'var(--cockpit-accent-color, #CAC4B0)',
            color: '#0a0a0a',
            width: '340px',
            maxWidth: 'calc(100vw - 24px)',
            position: 'relative',
            userSelect: 'none',
          }}
          className="p-5 sm:p-6 flex flex-col gap-3 font-mono shadow-[0_25px_60px_-10px_rgba(0,0,0,0.75)] rounded-xs"
        >
          {/* Внутреннее содержимое чека */}
          <div className="flex flex-col gap-3">
            {/* 1. Шапка чека: Название, Номер, Тип и Дата */}
            {hasAnyHeaderContent && (
              <div className="pr-1">
                {(Boolean(previewStoreName) || template.showOrderNumber) && (
                  <div className="flex justify-between items-center text-[10.5px] font-semibold tracking-[0.05em]">
                    {previewStoreName ? (
                      <span className="font-bold text-[#0a0a0a] px-0.5 select-none truncate max-w-[170px]" title={previewStoreName}>
                        {previewStoreName}
                      </span>
                    ) : (
                      <span />
                    )}
                    {template.showOrderNumber && (
                      <span className="text-right text-[#262626] font-mono px-0.5 select-none">
                        № 3DL-EXAMPLE
                      </span>
                    )}
                  </div>
                )}

                {(template.showReceiptType || template.showOrderDate) && (
                  <div className="flex justify-between items-center text-[9px] text-[#525252] pt-0.5 font-mono">
                    {template.showReceiptType ? (
                      <span className="text-[#525252] px-0.5 select-none">
                        {template.receiptType || 'ТОВАРНЫЙ ЧЕК'}
                      </span>
                    ) : (
                      <span />
                    )}
                    {template.showOrderDate && (
                      <span className="text-right text-[#525252] px-0.5 font-mono select-none">
                        01.01.2026, 12:00
                      </span>
                    )}
                  </div>
                )}

                {/* Пунктирный разделитель */}
                <div className="border-b border-dashed border-[#737373] mt-2" />
              </div>
            )}

            {/* 2. Название изделия и метаданные */}
            <div className="space-y-1">
              <p className="w-full font-bold text-[16px] leading-tight text-[#0a0a0a] px-0.5 rounded-xs font-sans select-none">
                Пример изделия (образец детали)
              </p>

              {template.showPrinterAndFilament && (
                <p className="w-full font-mono text-[10px] text-[#404040] px-0.5 select-none">
                  Bambu Lab X1-Carbon · PETG Carbon Black
                </p>
              )}

              {template.showWeight && (
                <p className="w-full font-mono text-[9px] text-[#525252] px-0.5 select-none">
                  Вес детали: ~45 г
                </p>
              )}
            </div>

            {/* 3. Спецификация заказа */}
            <div className="flex flex-col gap-1.5 pt-0.5">
              <div className="flex justify-between items-center text-[#525252] text-[9px] font-semibold tracking-[0.05em] pb-1 border-b border-black/10">
                <span>СПЕЦИФИКАЦИЯ</span>
                <span className="text-right font-mono">СУММА</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {/* Строка изготовления */}
                <div className="flex items-center justify-between gap-1 min-h-[22px]">
                  <div className="flex-1 min-w-0 flex items-center gap-1">
                    <span className="text-[10.5px] text-[#262626] px-0.5 font-mono select-none">
                      • Изготовление (12 шт.)
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {template.defaultHideSpecification && (
                      <span
                        title="В изготовление включено 157 ₽ от скрытых услуг"
                        className="text-[7.5px] text-amber-900 bg-amber-500/20 px-1 py-0.2 rounded font-mono select-none"
                      >
                        +157
                      </span>
                    )}
                  </div>

                  <div className="shrink-0">
                    <span className="w-24 text-right text-[10.5px] font-bold text-[#0a0a0a] pr-0 pl-1 rounded-xs font-mono block select-none">
                      {template.defaultHideSpecification ? '1 157,00 ₽' : '1 000,00 ₽'}
                    </span>
                  </div>
                </div>

                {/* Строка дополнительной услуги */}
                <div
                  className={`flex items-center justify-between gap-1 min-h-[22px] ${
                    template.defaultHideSpecification ? 'opacity-40 line-through' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-1">
                    <span className="text-[10.5px] text-[#262626] px-0.5 font-mono select-none">
                      • Упаковка (за штуку)
                    </span>
                    {template.defaultHideSpecification && (
                      <span className="text-[7.5px] text-amber-900 bg-amber-500/20 px-1 py-0.2 rounded font-mono shrink-0 select-none">
                        скрыто
                      </span>
                    )}
                  </div>

                  <div className="shrink-0">
                    <span className="w-24 text-right text-[10.5px] font-bold text-[#0a0a0a] pr-0 pl-1 rounded-xs font-mono block select-none">
                      157,00 ₽
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Перфорация (разделитель с круглыми вырезами по бокам) */}
            <div>
              <div className="relative my-0.5 -mx-5 sm:-mx-6 h-4 flex items-center">
                <div className="absolute -left-2 w-4 h-4 rounded-full bg-[#0a0a0a]" />
                <div className="w-full border-b border-dashed border-[#737373]" />
                <div className="absolute -right-2 w-4 h-4 rounded-full bg-[#0a0a0a]" />
              </div>
            </div>

            {/* 5. Итоговая стоимость для клиента */}
            <div>
              <div className="flex justify-between items-start font-mono">
                <div className="flex-1 pr-2 pt-1">
                  <span className="text-[10px] font-bold text-[#262626] tracking-[0.05em] block uppercase select-none">
                    ИТОГО К ОПЛАТЕ
                  </span>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="text-right text-[20px] sm:text-[22px] font-bold text-[#0a0a0a] tracking-tight pr-0 font-mono select-none">
                    1 157,00 ₽
                  </span>

                  {/* Расчёт цены за штуку под суммой */}
                  {template.showUnitPrice && (
                    <span className="text-right text-[9px] sm:text-[9.5px] text-[#525252] font-mono pr-0 select-none mt-0.5">
                      96,42 ₽ / шт. (за 12 шт.)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 6. Подвал чека: реквизиты оплаты, штрихкод и благодарность */}
            <div className="mt-1 space-y-2">
              <div className="border-b border-dashed border-[#737373]" />

              {/* Реквизиты для оплаты — заметный контрастный блок */}
              {template.showPaymentDetails && (
                <div className="p-2.5 rounded-lg bg-black/[0.07] border border-black/25 space-y-1 font-mono text-left shadow-xs">
                  <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-[#0a0a0a] uppercase tracking-wider select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a]" />
                    <span>РЕКВИЗИТЫ ДЛЯ ОПЛАТЫ:</span>
                  </div>
                  <div className="text-[9.5px] font-semibold text-[#0a0a0a] whitespace-pre-wrap leading-relaxed select-none">
                    {template.paymentDetails.trim() || 'СБП: +7 (999) 000-00-00 (Т-Банк, Иван И.)'}
                  </div>
                </div>
              )}

              {/* Штрихкод */}
              {template.showBarcode && (
                <div className="flex items-center justify-center gap-[2px] h-[26px] py-[2px]">
                  {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2].map((w, i) => (
                    <div key={i} style={{ backgroundColor: '#0a0a0a', width: `${w}px`, height: '100%', borderRadius: '0.5px' }} />
                  ))}
                </div>
              )}

              {/* Текст благодарности */}
              <div className="text-center">
                <span className="block text-center font-bold text-[10px] sm:text-[10.5px] text-[#171717] px-0.5 font-mono select-none">
                  {template.thanksText || 'СПАСИБО ЗА ВАШ ЗАКАЗ!'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Поясняющая подсказка снизу */}
        <p className="w-[340px] max-w-[calc(100vw-24px)] text-center font-sans text-xs text-neutral-500 leading-relaxed">
          Все параметры слева сохраняются автоматически и становятся шаблоном для всех новых расчётов.
        </p>
      </div>
    </div>
  );
}
