'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Download, Printer, Check, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../shared/lib/format';
import { usePersistentState } from '../../shared/lib/usePersistentState';
import { Tooltip } from '../../shared/ui/Tooltip';
import { useToast } from '../../entities/model/ToastProvider';

export interface CustomCostItemBreakdown {
  id: string;
  name: string;
  totalAmount: number;
  isPerUnit: boolean;
}

export interface ClientReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  quantity: string;
  weightG: string;
  printerName: string;
  filamentName: string;
  currencySymbol: string;
  result: {
    materialCost: number;
    depreciationCost: number;
    electricityCost: number;
    defectCost: number;
    laborCost: number;
    customCostsTotal: number;
    customCostsBreakdown: CustomCostItemBreakdown[];
    discountTotal: number;
    totalBaseCost: number;
    totalFinalPrice: number;
    profitTotal: number;
    marginPercent: number;
  };
}

export interface ReceiptExportRunOptions {
  run: () => Promise<void>;
  setIsExporting: (isExporting: boolean) => void;
  reportError: (message: string) => void;
}

export interface ReceiptPrintWindow {
  document: Pick<Document, 'write' | 'close'>;
  addEventListener: (type: 'load' | 'error', listener: () => void) => void;
  removeEventListener: (type: 'load' | 'error', listener: () => void) => void;
  print: () => void;
  close: () => void;
}

export type ReceiptAction = 'copy' | 'download' | 'print';
type ReceiptClipboardPayload = Record<string, Blob | PromiseLike<Blob> | string | PromiseLike<string>>;
type ReceiptRenderer = Pick<Required<ReceiptActionDependencies>, 'toBlob' | 'toPng'>;

export interface ReceiptActionDependencies {
  receiptNode: HTMLElement;
  orderNumber: string;
  toBlob?: (node: HTMLElement, options: { pixelRatio: number; cacheBust: boolean }) => Promise<Blob | null>;
  toPng?: (node: HTMLElement, options: { pixelRatio: number; cacheBust: boolean }) => Promise<string>;
  loadRenderer?: () => Promise<ReceiptRenderer>;
  clipboard?: Pick<Clipboard, 'write'>;
  createClipboardItem?: (items: ReceiptClipboardPayload) => ClipboardItem;
  downloadPng: (dataUrl: string) => void;
  openPrintWindow: () => ReceiptPrintWindow | null;
  onCopied: () => void;
  setIsExporting: (isExporting: boolean) => void;
  reportError: (message: string) => void;
  printTimeoutMs?: number;
}

export async function runReceiptExport({
  run,
  setIsExporting,
  reportError,
}: ReceiptExportRunOptions): Promise<void> {
  setIsExporting(true);
  try {
    await run();
  } catch {
    reportError('Не удалось подготовить чек. Повторите попытку.');
  } finally {
    setIsExporting(false);
  }
}

function downloadReceiptPng(dataUrl: string, orderNumber: string): void {
  const link = document.createElement('a');
  link.download = `3D_Labs_Check_${orderNumber}.png`;
  link.href = dataUrl;
  link.click();
}

function getReceiptPrintMarkup(imageUrl: string, orderNumber: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Товарный чек ${orderNumber} - 3D Labs</title>
        <style>
          @page { margin: 10mm; size: auto; }
          body {
            background: #f4f4f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: var(--font-jetbrains-mono), monospace;
            margin: 0;
          }
          img { width: 300px; max-width: 100%; height: auto; }
          @media print { body { background: transparent; } }
        </style>
      </head>
      <body><img src="${imageUrl}" alt="Товарный чек" /></body>
    </html>`;
}

export async function printReceiptImage(
  imageUrl: string,
  orderNumber: string,
  printWindow: ReceiptPrintWindow,
  timeoutMs = 15_000,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const safelyClose = () => {
      try {
        printWindow.close();
      } catch {
        // The original lifecycle failure is more useful than a close failure.
      }
    };
    const cleanup = () => {
      clearTimeout(timeoutId);
      printWindow.removeEventListener('load', onLoad);
      printWindow.removeEventListener('error', onError);
    };
    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onLoad = () => {
      try {
        printWindow.print();
        printWindow.close();
        settle();
      } catch (error) {
        safelyClose();
        settle(error instanceof Error ? error : new Error('Не удалось распечатать чек.'));
      }
    };
    const onError = () => {
      safelyClose();
      settle(new Error('Не удалось загрузить чек для печати.'));
    };
    const timeoutId = setTimeout(() => {
      safelyClose();
      settle(new Error('Превышено время ожидания окна печати.'));
    }, timeoutMs);

    printWindow.addEventListener('load', onLoad);
    printWindow.addEventListener('error', onError);

    try {
      printWindow.document.write(getReceiptPrintMarkup(imageUrl, orderNumber));
      printWindow.document.close();
    } catch (error) {
      safelyClose();
      settle(error instanceof Error ? error : new Error('Не удалось подготовить окно печати.'));
    }
  });
}

export function createReceiptExportOperations(dependencies: ReceiptActionDependencies): Record<ReceiptAction, () => Promise<void>> {
  const renderOptions = { pixelRatio: 3, cacheBust: true };
  const loadRenderer = (): ReceiptRenderer | Promise<ReceiptRenderer> => {
    if (dependencies.toBlob && dependencies.toPng) {
      return { toBlob: dependencies.toBlob, toPng: dependencies.toPng };
    }
    if (dependencies.loadRenderer) return dependencies.loadRenderer();
    throw new Error('Рендерер чека недоступен.');
  };

  return {
    copy: async () => {
      const rendererSource = loadRenderer();
      const renderer = rendererSource instanceof Promise ? await rendererSource : rendererSource;
      const blob = await renderer.toBlob(dependencies.receiptNode, renderOptions);
      if (blob && dependencies.clipboard && dependencies.createClipboardItem) {
        await dependencies.clipboard.write([dependencies.createClipboardItem({ 'image/png': blob })]);
        dependencies.onCopied();
        return;
      }
      dependencies.downloadPng(await renderer.toPng(dependencies.receiptNode, renderOptions));
    },
    download: async () => {
      const rendererSource = loadRenderer();
      const renderer = rendererSource instanceof Promise ? await rendererSource : rendererSource;
      dependencies.downloadPng(await renderer.toPng(dependencies.receiptNode, renderOptions));
    },
    print: async () => {
      const printWindow = dependencies.openPrintWindow();
      if (!printWindow) {
        throw new Error('Браузер заблокировал окно печати.');
      }

      let imageUrl: string;
      try {
        const rendererSource = loadRenderer();
        const renderer = rendererSource instanceof Promise ? await rendererSource : rendererSource;
        imageUrl = await renderer.toPng(dependencies.receiptNode, renderOptions);
      } catch (error) {
        try {
          printWindow.close();
        } catch {
          // Preserve the renderer error reported by the surrounding export lifecycle.
        }
        throw error;
      }

      await printReceiptImage(
        imageUrl,
        dependencies.orderNumber,
        printWindow,
        dependencies.printTimeoutMs,
      );
    },
  };
}

export async function performReceiptAction(action: ReceiptAction, dependencies: ReceiptActionDependencies): Promise<void> {
  const operations = createReceiptExportOperations(dependencies);
  await runReceiptExport({
    run: operations[action],
    setIsExporting: dependencies.setIsExporting,
    reportError: dependencies.reportError,
  });
}

export function ClientReceiptModal({
  isOpen,
  onClose,
  quantity,
  weightG,
  printerName,
  filamentName,
  currencySymbol,
  result,
}: ClientReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [customItemName, setCustomItemName] = usePersistentState('3d_calc_receipt_item_name', '');
  const [copiedImage, setCopiedImage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const { showError } = useToast();

  // Изначально все доп. услуги выключены
  useEffect(() => {
    if (isOpen) {
      const nextOrderNumber = `3DL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const nextOrderDate = new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      queueMicrotask(() => {
        setSelectedServiceIds([]);
        setOrderNumber(nextOrderNumber);
        setOrderDate(nextOrderDate);
      });
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    }
  }, [isOpen]);

  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} MSK`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Фильтрация выбранных пользователем доп. услуг для отображения в чеке
  const activeCustomServices = useMemo(() => {
    return result.customCostsBreakdown.filter((s: CustomCostItemBreakdown) => selectedServiceIds.includes(s.id));
  }, [result.customCostsBreakdown, selectedServiceIds]);

  const activeServicesTotal = useMemo(() => {
    return activeCustomServices.reduce((sum: number, s: CustomCostItemBreakdown) => sum + s.totalAmount, 0);
  }, [activeCustomServices]);

  // Общая стоимость чека СТРОГО равна расчету из калькулятора
  const clientTotalFinalPrice = result.totalFinalPrice;
  const qtyNum = Math.max(1, parseInt(quantity, 10) || 1);
  const pricePerPiece = clientTotalFinalPrice / qtyNum;

  // Стоимость изготовления вычисляется как разница между общим итогом и выделенными в чек услугами
  const printAndLaborFinalPrice = Math.max(
    0,
    clientTotalFinalPrice - activeServicesTotal + (result.discountTotal > 0 ? result.discountTotal : 0)
  );

  const displayTitle = customItemName.trim() || (qtyNum > 1 ? `Партия деталей (${quantity} шт.)` : '3D-печать детали');

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Копирование картинки в буфер обмена
  const handleCopyImage = async () => {
    if (!receiptRef.current) return;
    await performReceiptAction('copy', {
      receiptNode: receiptRef.current,
      orderNumber,
      loadRenderer: () => import('html-to-image'),
      clipboard: navigator.clipboard,
      createClipboardItem: (items) => new ClipboardItem(items),
      downloadPng: (dataUrl) => downloadReceiptPng(dataUrl, orderNumber),
      openPrintWindow: () => window.open('', '_blank') as unknown as ReceiptPrintWindow | null,
      onCopied: () => {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      },
      setIsExporting,
      reportError: showError,
    });
  };

  // Скачивание PNG
  const handleDownloadPng = async () => {
    if (!receiptRef.current) return;
    await performReceiptAction('download', {
      receiptNode: receiptRef.current,
      orderNumber,
      loadRenderer: () => import('html-to-image'),
      downloadPng: (dataUrl) => downloadReceiptPng(dataUrl, orderNumber),
      openPrintWindow: () => window.open('', '_blank') as unknown as ReceiptPrintWindow | null,
      onCopied: () => undefined,
      setIsExporting,
      reportError: showError,
    });
  };

  // Печать / Сохранить в PDF
  const handlePrint = async () => {
    if (!receiptRef.current) return;
    await performReceiptAction('print', {
      receiptNode: receiptRef.current,
      orderNumber,
      loadRenderer: () => import('html-to-image'),
      downloadPng: (dataUrl) => downloadReceiptPng(dataUrl, orderNumber),
      openPrintWindow: () => window.open('', '_blank') as unknown as ReceiptPrintWindow | null,
      onCopied: () => undefined,
      setIsExporting,
      reportError: showError,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Главное окно модалки в точном стиле консоли калькулятора */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-receipt-title"
          className="relative w-full max-w-6xl rounded-2xl border border-white/15 bg-neutral-950/90 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[94vh]"
        >
          {/* 1. Верхняя панель (Cockpit Topbar: Red LED + Title + Live time) */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 bg-neutral-900/60 shrink-0 gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <Tooltip content="Закрыть окно">
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    title="Закрыть окно"
                    aria-label="Закрыть чек"
                    className="w-3 h-3 rounded-full bg-[#36363c] hover:bg-[#f87171] hover:scale-125 active:scale-95 transition-all duration-150 cursor-pointer border-none outline-none shrink-0"
                  />
                </Tooltip>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs text-[#d4d4d8] min-w-0">
                <span id="client-receipt-title" className="text-[#d4d4d8] font-normal truncate">
                  Чек для клиента
                </span>
                <span className="text-[#52525b] shrink-0">·</span>
                <span className="text-[#71717a] hidden sm:inline truncate">
                  Клиентский вид
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="font-mono text-xs text-[#71717a] tabular-nums">
                {currentTimeStr}
              </div>
            </div>
          </div>

          {/* 2. ОСНОВНОЕ ТЕЛО МОДАЛКИ (ДВЕ КОЛОНКИ: СЛЕВА НАСТРОЙКИ И ДАННЫЕ, СПРАВА ЧЕК) */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-stretch">

              {/* ЛЕВАЯ КОЛОНКА: ИНФОРМАЦИЯ И ПАРАМЕТРЫ ЧЕКА (РАСТЯГИВАЕТСЯ НА ВСЮ ВЫСОТУ) */}
              <div className="flex flex-col justify-between h-full space-y-4">

                {/* Верхняя группа карточек */}
                <div className="space-y-4">
                  {/* Карточка 1: Название изделия для чека */}
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Название товара в чеке</span>
                      </label>
                      {customItemName && (
                        <button
                          type="button"
                          onClick={() => setCustomItemName('')}
                          className="text-[11px] font-mono text-neutral-400 hover:text-white cursor-pointer"
                        >
                          [ Очистить ]
                        </button>
                      )}
                    </div>

                    <input
                      aria-label="Название товара в чеке"
                      type="text"
                      placeholder="напр. Корпус прибора / Шестерня редуктора / Кронштейн"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      className="w-full h-10 bg-neutral-950 border border-white/15 rounded-lg px-3.5 text-xs font-medium text-white focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
                    />

                    {/* Быстрые теги */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-mono text-neutral-500">Быстрый выбор:</span>
                      {['Корпус прибора', 'Шестерня', 'Кронштейн', 'Прототип детали', 'Партия изделий'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCustomItemName(preset)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                            customItemName === preset
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                              : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Карточка 2: Сводные данные заказа для клиента */}
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10 space-y-3">
                    <div className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center justify-between">
                      <span>Спецификация изделия</span>
                      <span className="text-[11px] text-cyan-300 font-mono">
                        {formatCurrency(pricePerPiece, currencySymbol)} / шт.
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-neutral-950/70 border border-white/5">
                        <span className="text-[10px] font-mono text-neutral-500 block">Тираж:</span>
                        <span className="text-xs font-mono font-bold text-white">{quantity} шт.</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-neutral-950/70 border border-white/5">
                        <span className="text-[10px] font-mono text-neutral-500 block">Цена за шт.:</span>
                        <span className="text-xs font-mono font-bold text-cyan-300 truncate block">
                          {formatCurrency(pricePerPiece, currencySymbol)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-neutral-950/70 border border-white/5">
                        <span className="text-[10px] font-mono text-neutral-500 block">Материал:</span>
                        <span className="text-xs font-mono font-bold text-neutral-200 truncate block">
                          {filamentName || 'Пластик'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-neutral-950/70 border border-white/5">
                        <span className="text-[10px] font-mono text-neutral-500 block">Вес партии:</span>
                        <span className="text-xs font-mono font-bold text-white">
                          {weightG && Number(weightG) > 0 ? `~${Number(weightG) * qtyNum} г` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Карточка 3: Выбор дополнительных услуг в чек */}
                  {result.customCostsBreakdown.length > 0 && (
                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Дополнительные услуги в чеке
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">
                          Выбрано: {activeCustomServices.length} из {result.customCostsBreakdown.length}
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-400">
                        Отметьте услуги, которые должны быть явно прописаны отдельными строками в чеке для покупателя.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {result.customCostsBreakdown.map((item) => {
                          const isSelected = selectedServiceIds.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleService(item.id)}
                              className={`p-3 rounded-lg text-xs font-mono flex items-center justify-between transition-all cursor-pointer border text-left ${
                                isSelected
                                  ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-xs'
                                  : 'bg-neutral-950/70 border-white/5 text-neutral-400 hover:text-white'
                              }`}
                            >
                              <span className="truncate pr-2 font-medium">• {item.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-[11px] text-cyan-300">
                                  +{formatCurrency(item.totalAmount, currencySymbol)}
                                </span>
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] transition-colors ${
                                    isSelected
                                      ? 'bg-cyan-500 border-cyan-400 text-neutral-950 font-bold'
                                      : 'border-white/20 text-transparent'
                                  }`}
                                >
                                  ✓
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Карточка 4: Конфиденциальность (всегда прижата к самому низу колонки) */}
                <div className="mt-auto p-3.5 rounded-xl bg-neutral-900/40 border border-white/5 flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    <strong className="text-neutral-200">Конфиденциальность:</strong> В клиентском чеке скрыты себестоимость пластика, электричество, амортизация принтера, процент брака, стоимость часа и маржинальная прибыль.
                  </p>
                </div>

              </div>

              {/* ПРАВАЯ КОЛОНКА: САМ ТЕПЛОВОЙ ЧЕК И КНОПКИ ЭКСПОРТА */}
              <div className="flex flex-col items-center space-y-4">

                {/* Сам бланк чека */}
                <div
                  ref={receiptRef}
                  style={{
                    backgroundColor: '#b8b6ae',
                    color: '#0a0a0a',
                    width: '300px',
                    padding: '24px 18px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                    userSelect: 'none',
                  }}
                >
                  {/* 1. Верхняя шапка чека */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#262626', fontWeight: 600, letterSpacing: '0.05em', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                      <span style={{ fontWeight: 'bold', color: '#0a0a0a' }}>3D LABS · PRODUCTION</span>
                      <span>№ {orderNumber}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#525252', paddingTop: '3px', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                      <span>ТОВАРНЫЙ ЧЕК</span>
                      <span>{orderDate}</span>
                    </div>

                    {/* Пунктирный разделитель */}
                    <div style={{ borderBottom: '1px dashed #737373', margin: '8px 0' }} />
                  </div>

                  {/* 2. Название изделия и метаданные */}
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: '1.25', margin: 0, color: '#0a0a0a', fontFamily: 'var(--font-inter), sans-serif' }}>
                      {displayTitle}
                    </h3>
                    <p style={{ fontSize: '10px', color: '#404040', margin: '3px 0 0 0', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                      {printerName || '3D-печать'} · {filamentName || 'Пластик'}
                    </p>
                    {weightG && Number(weightG) > 0 && (
                      <p style={{ fontSize: '9px', color: '#525252', margin: '2px 0 0 0', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                        Вес детали: ~{weightG} г
                      </p>
                    )}
                  </div>

                  {/* 3. Спецификация для клиента */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: '10.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#525252', fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em' }}>
                      <span>СПЕЦИФИКАЦИЯ</span>
                      <span>СУММА</span>
                    </div>

                    {/* Изготовление детали */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#262626' }}>• Изготовление ({quantity} шт.)</span>
                      <span style={{ fontWeight: 'bold', color: '#0a0a0a' }}>
                        {formatCurrency(printAndLaborFinalPrice, currencySymbol)}
                      </span>
                    </div>

                    {/* Цена за штуку */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#333333' }}>
                      <span style={{ color: '#333333' }}>• Стоимость за 1 шт.</span>
                      <span style={{ fontWeight: 'bold', color: '#0a0a0a' }}>
                        {formatCurrency(pricePerPiece, currencySymbol)}
                      </span>
                    </div>

                    {/* Выбранные доп. услуги */}
                    {activeCustomServices.map((service) => (
                      <div key={service.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#262626' }}>• {service.name}</span>
                        <span style={{ fontWeight: 'bold', color: '#0a0a0a' }}>
                          +{formatCurrency(service.totalAmount, currencySymbol)}
                        </span>
                      </div>
                    ))}

                    {/* Скидка */}
                    {result.discountTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#065f46' }}>
                        <span>• Скидка на заказ</span>
                        <span style={{ fontWeight: 'bold' }}>
                          -{formatCurrency(result.discountTotal, currencySymbol)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 4. Перфорация (разделитель с круглыми вырезами) */}
                  <div style={{ position: 'relative', margin: '4px -18px', height: '14px', display: 'flex', alignItems: 'center' }}>
                    {/* Левый круглый вырез */}
                    <div style={{ position: 'absolute', left: '-7px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#0a0a0a' }} />
                    {/* Линия перфорации */}
                    <div style={{ width: '100%', borderBottom: '1px dashed #737373' }} />
                    {/* Правый круглый вырез */}
                    <div style={{ position: 'absolute', right: '-7px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#0a0a0a' }} />
                  </div>

                  {/* 5. Итоговая стоимость для клиента */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#404040', letterSpacing: '0.05em', display: 'block' }}>
                        ИТОГО К ОПЛАТЕ
                      </span>
                      <span style={{ fontSize: '9px', color: '#525252' }}>
                        {qtyNum > 1 ? `${quantity} шт. × ${formatCurrency(pricePerPiece, currencySymbol)}` : 'за 1 шт.'}
                      </span>
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0a0a0a', letterSpacing: '-0.02em', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                      {formatCurrency(clientTotalFinalPrice, currencySymbol)}
                    </span>
                  </div>

                  {/* 6. Подвал клиентского чека: Штрихкод и контакты */}
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ borderBottom: '1px dashed #737373', margin: '10px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#525252', fontWeight: 500 }}>
                        <span>AUTH · 3DLABS-VERIFIED</span>
                        <span>STATUS · READY</span>
                      </div>

                      {/* Штрихкод */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', height: '26px', padding: '3px 0' }}>
                        {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2].map((w, i) => (
                          <div key={i} style={{ backgroundColor: '#0a0a0a', width: `${w}px`, height: '100%', borderRadius: '0.5px' }} />
                        ))}
                      </div>

                      <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#171717', margin: '4px 0 0 0' }}>
                        СПАСИБО ЗА ВАШ ЗАКАЗ!
                      </p>
                    </div>
                  </div>

                </div>

                {/* Кнопки действий под чеком */}
                <div className="w-[300px] space-y-2 font-mono">
                  {/* 1. Скопировать картинку */}
                  <Tooltip content="Скопировать картинку для вставки (Ctrl+V) в Telegram или WhatsApp">
                    <button
                      type="button"
                      onClick={handleCopyImage}
                      disabled={isExporting}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] ${
                        copiedImage
                          ? 'bg-emerald-500 text-neutral-950 shadow-md'
                          : 'bg-white text-neutral-950 hover:bg-neutral-200 shadow-sm'
                      }`}
                    >
                      {copiedImage ? <Check className="w-4 h-4 text-neutral-950" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedImage ? 'Скопировано в буфер!' : 'Копировать фото'}</span>
                    </button>
                  </Tooltip>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 2. Скачать PNG */}
                    <Tooltip content="Сохранить чек как изображение PNG">
                      <button
                        type="button"
                        onClick={handleDownloadPng}
                        disabled={isExporting}
                        className="py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.99]"
                      >
                        <Download className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Скачать PNG</span>
                      </button>
                    </Tooltip>

                    {/* 3. Печать / PDF */}
                    <Tooltip content="Распечатать или сохранить в PDF">
                      <button
                        type="button"
                        onClick={handlePrint}
                        disabled={isExporting}
                        className="py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.99]"
                      >
                        <Printer className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Печать / PDF</span>
                      </button>
                    </Tooltip>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* 3. ПОДВАЛ ОКНА МОДАЛКИ (КАК В КАЛЬКУЛЯТОРЕ) */}
          <div className="border-t border-white/10 px-4 sm:px-6 py-2.5 bg-neutral-950 flex items-center justify-between text-[11px] font-mono text-neutral-500 shrink-0">
            <div className="flex items-center gap-3">
              <span>EXPORT: LOCAL DEVICE</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">FORMAT: PNG / PRINT</span>
            </div>
            <div>{isExporting ? 'STATUS: EXPORTING' : 'STATUS: READY'}</div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
