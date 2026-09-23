'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { Copy, Download, Printer, Check, X, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatCurrency } from '../../shared/lib/format';
import { usePersistentState } from '../../shared/lib/usePersistentState';
import { useReceiptTemplate } from '../../shared/lib/receiptTemplate';
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
  onCopied?: () => void;
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
        <title>Товарный чек ${orderNumber} - Kumo CRM</title>
        <style>
          @page { margin: 10mm; size: auto; }
          body {
            background: var(--cockpit-accent-color, #D2CCBB);
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
        dependencies.onCopied?.();
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

export interface ReceiptSpecRow {
  id: string;
  name: string;
  amount: number;
  amountStr?: string;
  isInformational?: boolean;
  isHidden?: boolean;
}

function ReceiptCloseButton({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <motion.button
      type="button"
      data-export-hide="true"
      onClick={onClose}
      aria-label="Закрыть чек"
      className="absolute top-2.5 right-2.5 z-30 w-6 h-6 rounded-full flex items-center justify-center bg-black/6 hover:bg-rose-500/15 text-[#525252] hover:text-rose-600 transition-colors border border-black/10 hover:border-rose-500/30 cursor-pointer outline-none select-none"
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
    >
      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
    </motion.button>
  );
}

const stickerVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.88,
    y: 28,
    rotate: -1.2,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotate: 0,
    transition: {
      type: 'spring',
      damping: 24,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.88,
    y: 24,
    rotate: 1.5,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const receiptVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
};

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 3 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
};

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
  const [copiedImage, setCopiedImage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { showError } = useToast();
  const { template } = useReceiptTemplate();

  // Неизменяемые реквизиты шапки (управляются строго через Настройки -> Шаблон чека)
  const companyParts: string[] = [];
  if (template.showCompanyName) {
    companyParts.push(template.companyName || 'KUMO CRM');
  }
  if (template.showCompanySubtitle && template.companySubtitle) {
    companyParts.push(template.companySubtitle);
  }
  const storeName = companyParts.join(' · ');
  const receiptType = template.receiptType;
  const showOrderNumber = template.showOrderNumber;
  const showReceiptType = template.showReceiptType;
  const showOrderDate = template.showOrderDate;
  const hasAnyHeaderContent = Boolean(storeName || showOrderNumber || showReceiptType || showOrderDate);

  // Редактируемые в модальном окне поля
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [customItemName, setCustomItemName] = usePersistentState('3d_calc_receipt_item_name', '');
  const [productTitle, setProductTitle] = useState('');
  const [printerAndFilament, setPrinterAndFilament] = useState('');
  const [weightText, setWeightText] = useState('');
  const [thanksText, setThanksText] = useState(() => template.thanksText);
  const [paymentDetails, setPaymentDetails] = useState(() => template.paymentDetails);
  const [showPaymentDetails, setShowPaymentDetails] = useState(() => template.showPaymentDetails);
  const [showBarcode, setShowBarcode] = useState(() => template.showBarcode);
  const [showPrinterAndFilament, setShowPrinterAndFilament] = useState(() => template.showPrinterAndFilament);
  const [showWeight, setShowWeight] = useState(() => template.showWeight);
  const [showUnitPrice, setShowUnitPrice] = useState(() => template.showUnitPrice);

  // Строки спецификации
  const [specRows, setSpecRows] = useState<ReceiptSpecRow[]>([]);
  const [editingRowAmountId, setEditingRowAmountId] = useState<string | null>(null);

  // Инициализация при открытии модального окна
  useEffect(() => {
    if (!isOpen) return;

    const randomSuffix =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8).toUpperCase()
        : Math.random().toString(36).substring(2, 10).toUpperCase();
    const nextOrderNumber = `№ 3DL-${randomSuffix}`;

    const nextOrderDate = new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const qtyNum = Math.max(1, parseInt(quantity, 10) || 1);
    const clientTotal = result.totalFinalPrice;

    const initialTitle =
      customItemName.trim() || (qtyNum > 1 ? `Партия деталей (${quantity} шт.)` : '3D-печать детали');
    const initialSubtitle = `${printerName || 'Bambu Lab X1-Carbon'} · ${filamentName || 'PETG Carbon Black'}`;
    const initialWeight = weightG && Number(weightG) > 0 ? `Вес детали: ~${weightG} г` : '';

    // Формирование начальных строк спецификации
    const customCostsTotal = result.customCostsBreakdown.reduce((sum, c) => sum + c.totalAmount, 0);
    const baseProductionCost = Math.max(
      0,
      clientTotal - customCostsTotal + (result.discountTotal > 0 ? result.discountTotal : 0)
    );

    const initialRows: ReceiptSpecRow[] = [];

    // 1. Изготовление детали (основная строка, нельзя скрыть или удалить)
    initialRows.push({
      id: 'production',
      name: `• Изготовление (${quantity} шт.)`,
      amount: baseProductionCost,
    });

    // 2. Выбранные дополнительные услуги из калькулятора (только ' (за штуку)' если услуга за шт., иначе без суффикса)
    result.customCostsBreakdown.forEach((service) => {
      const suffix = service.isPerUnit ? ' (за штуку)' : '';
      initialRows.push({
        id: service.id,
        name: `• ${service.name}${suffix}`,
        amount: service.totalAmount,
        isHidden: template.defaultHideSpecification,
      });
    });

    // 3. Скидка на заказ
    if (result.discountTotal > 0) {
      initialRows.push({
        id: 'discount',
        name: '• Скидка на заказ',
        amount: -result.discountTotal,
        isHidden: template.defaultHideSpecification,
      });
    }

    queueMicrotask(() => {
      setThanksText(template.thanksText);
      setPaymentDetails(template.paymentDetails);
      setShowPaymentDetails(template.showPaymentDetails);
      setShowBarcode(template.showBarcode);
      setShowPrinterAndFilament(template.showPrinterAndFilament);
      setShowWeight(template.showWeight);
      setShowUnitPrice(template.showUnitPrice);
      setOrderNumber(nextOrderNumber);
      setOrderDate(nextOrderDate);
      setProductTitle(initialTitle);
      setPrinterAndFilament(initialSubtitle);
      setWeightText(initialWeight);
      setSpecRows(initialRows);
      setEditingRowAmountId(null);
    });
  }, [isOpen, quantity, weightG, printerName, filamentName, result, customItemName, template]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Блокировка прокрутки фона при открытой модалке
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Сумма всех скрытых услуг (не информационных и не изготовления), которая переходит в изготовление
  const hiddenAbsorptionSum = useMemo(() => {
    return specRows
      .filter((r) => r.id !== 'production' && r.isHidden && !r.isInformational)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [specRows]);

  // Автоматический подсчет итога по строкам спецификации (исключая информационные)
  const autoCalculatedTotal = useMemo(() => {
    return specRows.reduce((sum, row) => {
      if (row.isInformational) return sum;
      return sum + (Number(row.amount) || 0);
    }, 0);
  }, [specRows]);

  const effectiveTotal = autoCalculatedTotal;
  const qtyNum = Math.max(1, parseInt(quantity, 10) || 1);

  // Управление строками спецификации
  const handleUpdateRowName = (id: string, name: string) => {
    setSpecRows((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
  };

  const handleUpdateRowAmount = (id: string, val: string) => {
    const cleanVal = val.replace(/\s+/g, '').replace(',', '.');
    const num = parseFloat(cleanVal);
    const parsedNum = isNaN(num) ? 0 : num;
    setSpecRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const baseAmount = r.id === 'production' ? parsedNum - hiddenAbsorptionSum : parsedNum;
        return {
          ...r,
          amount: baseAmount,
          amountStr: val,
        };
      })
    );
  };

  const handleBlurRowAmount = (id: string) => {
    setEditingRowAmountId(null);
    setSpecRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, amountStr: undefined } : r))
    );
  };

  const handleRemoveRow = (id: string) => {
    if (id === 'production') return;
    setSpecRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Переключение видимости отдельной строки (изготовление скрыть нельзя)
  const handleToggleRowVisibility = (id: string) => {
    if (id === 'production') return;
    setSpecRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isHidden: !r.isHidden } : r))
    );
  };

  // Строки, которые можно скрывать (все кроме изготовления)
  const hideableRows = useMemo(() => specRows.filter((r) => r.id !== 'production'), [specRows]);
  const areAllRowsHidden = hideableRows.length > 0 && hideableRows.every((r) => r.isHidden);

  // Переключение видимости всех строк спецификации кроме изготовления
  const handleToggleAllRows = () => {
    const nextHiddenState = !areAllRowsHidden;
    setSpecRows((prev) =>
      prev.map((r) => (r.id === 'production' ? r : { ...r, isHidden: nextHiddenState }))
    );
  };

  const handleAddRow = () => {
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9);
    setSpecRows((prev) => [
      ...prev,
      {
        id: newId,
        name: '• Дополнительная услуга',
        amount: 0,
      },
    ]);
  };

  // Экспорт чека
  const handleCopyImage = async () => {
    if (!receiptRef.current) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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

  const handleDownloadPng = async () => {
    if (!receiptRef.current) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await performReceiptAction('download', {
      receiptNode: receiptRef.current,
      orderNumber,
      loadRenderer: () => import('html-to-image'),
      downloadPng: (dataUrl) => downloadReceiptPng(dataUrl, orderNumber),
      openPrintWindow: () => window.open('', '_blank') as unknown as ReceiptPrintWindow | null,
      setIsExporting,
      reportError: showError,
    });
  };

  const handlePrint = async () => {
    if (!receiptRef.current) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await performReceiptAction('print', {
      receiptNode: receiptRef.current,
      orderNumber,
      loadRenderer: () => import('html-to-image'),
      downloadPng: (dataUrl) => downloadReceiptPng(dataUrl, orderNumber),
      openPrintWindow: () => window.open('', '_blank') as unknown as ReceiptPrintWindow | null,
      setIsExporting,
      reportError: showError,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Полупрозрачный оверлей */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            variants={stickerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-receipt-title"
            className="relative z-10 my-auto flex flex-col items-center gap-3 select-none"
            style={{ transformOrigin: 'top center' }}
          >
            {/* САМ БЛАНК ЧЕКА (ЗОНА ЭКСПОРТА) */}
            <motion.div
              ref={receiptRef}
              id="client-receipt-printable"
              style={{
                backgroundColor: 'var(--cockpit-accent-color, #CAC4B0)',
                color: '#0a0a0a',
                width: '340px',
                maxWidth: 'calc(100vw - 24px)',
                position: 'relative',
                userSelect: 'text',
              }}
              className="p-5 sm:p-6 flex flex-col gap-3 font-mono shadow-[0_25px_60px_-10px_rgba(0,0,0,0.75)] rounded-xs"
            >
              {/* Кнопка закрытия бланка чека (скрывается при экспорте) */}
              <ReceiptCloseButton onClose={onClose} />

              <motion.div variants={receiptVariants} initial="hidden" animate="visible" className="flex flex-col gap-3">
                {/* 1. Шапка чека: Название студии, Номер, Тип и Дата */}
                {hasAnyHeaderContent && (
                  <motion.div variants={lineVariants} className="pr-8">
                    {(Boolean(storeName) || showOrderNumber) && (
                      <div className="flex justify-between items-center text-[10.5px] font-semibold tracking-[0.05em]">
                        {storeName ? (
                          <span className="font-bold text-[#0a0a0a] px-0.5 select-none truncate max-w-[170px]" title={storeName}>
                            {storeName}
                          </span>
                        ) : (
                          <span />
                        )}
                        {showOrderNumber && (
                          <span className="text-right text-[#262626] font-mono px-0.5 select-none">
                            {orderNumber}
                          </span>
                        )}
                      </div>
                    )}

                    {(showReceiptType || showOrderDate) && (
                      <div className="flex justify-between items-center text-[9px] text-[#525252] pt-0.5 font-mono">
                        {showReceiptType ? (
                          <span className="text-[#525252] px-0.5 select-none">
                            {receiptType}
                          </span>
                        ) : (
                          <span />
                        )}
                        {showOrderDate && (
                          <input
                            type="text"
                            value={orderDate}
                            onChange={(e) => setOrderDate(e.target.value)}
                            aria-label="Дата и время чека"
                            className="text-right text-[#525252] bg-transparent border-b border-transparent hover:border-black/25 focus:border-black/70 focus:bg-black/5 outline-none w-[130px] px-0.5 rounded-xs transition-colors font-mono"
                          />
                        )}
                      </div>
                    )}

                    {/* Пунктирный разделитель */}
                    <div className="border-b border-dashed border-[#737373] mt-2" />
                  </motion.div>
                )}

                {/* 2. Название изделия и метаданные */}
                <motion.div variants={lineVariants} className="space-y-1">
                  <input
                    type="text"
                    value={productTitle}
                    onChange={(e) => {
                      setProductTitle(e.target.value);
                      setCustomItemName(e.target.value);
                    }}
                    placeholder="Название детали"
                    aria-label="Название детали"
                    className="w-full font-bold text-[16px] leading-tight text-[#0a0a0a] bg-transparent border-b border-transparent hover:border-black/25 focus:border-black/70 focus:bg-black/5 outline-none px-0.5 rounded-xs font-sans transition-colors"
                  />

                  {showPrinterAndFilament && (
                    <input
                      type="text"
                      value={printerAndFilament}
                      onChange={(e) => setPrinterAndFilament(e.target.value)}
                      placeholder="Принтер · Материал"
                      aria-label="Принтер и материал"
                      className="w-full font-mono text-[10px] text-[#404040] bg-transparent border-b border-transparent hover:border-black/25 focus:border-black/70 focus:bg-black/5 outline-none px-0.5 rounded-xs transition-colors"
                    />
                  )}

                  {showWeight && (
                    <input
                      type="text"
                      value={weightText}
                      onChange={(e) => setWeightText(e.target.value)}
                      placeholder="Вес детали (напр. Вес детали: ~250 г)"
                      aria-label="Вес детали"
                      className="w-full font-mono text-[9px] text-[#525252] bg-transparent border-b border-transparent hover:border-black/25 focus:border-black/70 focus:bg-black/5 outline-none px-0.5 rounded-xs transition-colors"
                    />
                  )}
                </motion.div>

                {/* 3. Спецификация заказа с инлайн-редактированием строк и цен */}
                <motion.div variants={lineVariants} className="flex flex-col gap-1.5 pt-0.5">
                  <div className="flex justify-between items-center text-[#525252] text-[9px] font-semibold tracking-[0.05em] pb-1 border-b border-black/10">
                    <div className="flex items-center gap-2">
                      <span>СПЕЦИФИКАЦИЯ</span>
                      {hideableRows.length > 0 && (
                        <button
                          type="button"
                          data-export-hide="true"
                          onClick={handleToggleAllRows}
                          title={
                            areAllRowsHidden
                              ? 'Показать все строки в чеке'
                              : 'Скрыть все строки кроме изготовления (суммы прибавятся к изготовлению)'
                          }
                          className="flex items-center gap-1 text-[8px] font-mono text-[#525252] hover:text-[#0a0a0a] px-1.5 py-0.5 rounded border border-black/10 hover:border-black/30 hover:bg-black/5 cursor-pointer transition-all"
                        >
                          {areAllRowsHidden ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                          <span>{areAllRowsHidden ? 'показать все' : 'скрыть все'}</span>
                        </button>
                      )}
                    </div>
                    <span className="text-right font-mono">СУММА</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {specRows.map((row) => {
                      const isProduction = row.id === 'production';
                      const effectiveAmount = isProduction ? row.amount + hiddenAbsorptionSum : row.amount;
                      const isAmountEditing = editingRowAmountId === row.id;
                      const displayAmountValue = isAmountEditing
                        ? row.amountStr ?? String(effectiveAmount)
                        : formatCurrency(effectiveAmount, currencySymbol);

                      return (
                        <div
                          key={row.id}
                          data-export-hide={row.isHidden ? 'true' : undefined}
                          className={`flex items-center justify-between gap-1 group/row min-h-[22px] ${
                            row.isHidden ? 'opacity-40 line-through' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0 flex items-center gap-1">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => handleUpdateRowName(row.id, e.target.value)}
                              aria-label={`Название строки ${row.name}`}
                              className="w-full text-[10.5px] text-[#262626] bg-transparent border-b border-transparent hover:border-black/25 focus:border-black/70 focus:bg-black/5 outline-none px-0.5 rounded-xs font-mono transition-colors"
                            />
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0" data-export-hide="true">
                            {!isProduction ? (
                              <>
                                {/* Переключение видимости отдельной строки */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleRowVisibility(row.id)}
                                  title={
                                    row.isHidden
                                      ? 'Показать строку в чеке'
                                      : 'Скрыть строку из чека для клиента (сумма прибавится к изготовлению)'
                                  }
                                  aria-label={row.isHidden ? 'Показать строку' : 'Скрыть строку'}
                                  className={`p-0.5 cursor-pointer border-none bg-transparent transition-colors ${
                                    row.isHidden
                                      ? 'text-amber-800 opacity-100'
                                      : 'opacity-0 group-hover/row:opacity-100 text-neutral-400 hover:text-neutral-900'
                                  }`}
                                >
                                  {row.isHidden ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                                </button>

                                {/* Удаление строки */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(row.id)}
                                  title="Удалить строку"
                                  aria-label="Удалить строку"
                                  className="opacity-0 group-hover/row:opacity-100 hover:text-rose-600 text-neutral-400 p-0.5 transition-opacity cursor-pointer border-none bg-transparent"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </>
                            ) : (
                              hiddenAbsorptionSum > 0 && (
                                <span
                                  data-export-hide="true"
                                  title={`В изготовление включено ${formatCurrency(hiddenAbsorptionSum, currencySymbol)} от скрытых услуг`}
                                  className="text-[7.5px] text-amber-900 bg-amber-500/20 px-1 py-0.2 rounded font-mono select-none"
                                >
                                  +{formatCurrency(hiddenAbsorptionSum, '')}
                                </span>
                              )
                            )}
                          </div>

                          {/* Сумма строки */}
                          <div className="shrink-0">
                            <input
                              type="text"
                              value={displayAmountValue}
                              onFocus={() => setEditingRowAmountId(row.id)}
                              onChange={(e) => handleUpdateRowAmount(row.id, e.target.value)}
                              onBlur={() => handleBlurRowAmount(row.id)}
                              aria-label={`Сумма строки ${row.name}`}
                              className={`w-24 text-right text-[10.5px] font-bold text-[#0a0a0a] bg-transparent border-b border-transparent hover:border-black/25 focus:border-black/70 focus:bg-black/5 outline-none pr-0 pl-1 rounded-xs font-mono transition-colors ${
                                effectiveAmount < 0 ? 'text-emerald-700' : ''
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Кнопка добавления строки спецификации */}
                  <button
                    type="button"
                    data-export-hide="true"
                    onClick={handleAddRow}
                    className="self-start text-[9.5px] font-mono text-[#525252] hover:text-[#0a0a0a] flex items-center gap-1 mt-1 cursor-pointer transition-colors opacity-70 hover:opacity-100 border-none bg-transparent p-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>добавить строку</span>
                  </button>
                </motion.div>

                {/* 4. Перфорация */}
                <motion.div variants={lineVariants}>
                  <div className="relative my-0.5 -mx-5 sm:-mx-6 h-4 flex items-center">
                    <div className="absolute -left-2 w-4 h-4 rounded-full bg-[#0a0a0a]" />
                    <div className="w-full border-b border-dashed border-[#737373]" />
                    <div className="absolute -right-2 w-4 h-4 rounded-full bg-[#0a0a0a]" />
                  </div>
                </motion.div>

                {/* 5. Итоговая стоимость для клиента (СТРОГО автоматический расчет) */}
                <motion.div variants={lineVariants}>
                  <div className="flex justify-between items-start font-mono">
                    <div className="flex-1 pr-2 pt-1">
                      <span className="text-[10px] font-bold text-[#262626] tracking-[0.05em] block uppercase select-none">
                        ИТОГО К ОПЛАТЕ
                      </span>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-right text-[20px] sm:text-[22px] font-bold text-[#0a0a0a] tracking-tight pr-0 font-mono select-none">
                        {formatCurrency(effectiveTotal, currencySymbol)}
                      </span>

                      {/* Расчёт цены за штуку под суммой */}
                      {showUnitPrice && qtyNum > 1 && (
                        <span className="text-right text-[9px] sm:text-[9.5px] text-[#525252] font-mono pr-0 select-none mt-0.5">
                          {formatCurrency(effectiveTotal / qtyNum, currencySymbol)} / шт. (за {qtyNum} шт.)
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* 6. Подвал чека: реквизиты оплаты, штрихкод и благодарность */}
                <motion.div variants={lineVariants} className="mt-1 space-y-2">
                  <div className="border-b border-dashed border-[#737373]" />

                  {/* Реквизиты для оплаты — заметный контрастный блок */}
                  {showPaymentDetails ? (
                    <div
                      data-export-hide={!paymentDetails.trim() ? 'true' : undefined}
                      className="p-2.5 rounded-lg bg-black/[0.07] border border-black/25 space-y-1 font-mono text-left shadow-xs"
                    >
                      <div className="flex items-center justify-between text-[8.5px] font-bold text-[#0a0a0a] uppercase tracking-wider select-none">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a]" />
                          <span>РЕКВИЗИТЫ ДЛЯ ОПЛАТЫ:</span>
                        </span>
                        <button
                          type="button"
                          data-export-hide="true"
                          onClick={() => setShowPaymentDetails(false)}
                          title="Скрыть реквизиты"
                          aria-label="Скрыть реквизиты"
                          className="text-[#525252] hover:text-[#0a0a0a] cursor-pointer p-0.5 border-none bg-transparent transition-colors"
                        >
                          <EyeOff className="w-3 h-3" />
                        </button>
                      </div>
                      <textarea
                        value={paymentDetails}
                        onChange={(e) => setPaymentDetails(e.target.value)}
                        placeholder="Впишите реквизиты (СБП, банк, карта, получатель)..."
                        rows={Math.min(4, Math.max(2, paymentDetails.split('\n').length))}
                        aria-label="Реквизиты для оплаты"
                        className="w-full text-[9.5px] font-semibold text-[#0a0a0a] bg-transparent border-b border-transparent hover:border-black/30 focus:border-black/70 focus:bg-black/5 outline-none px-0.5 py-0.5 rounded-xs transition-colors resize-none leading-relaxed font-mono placeholder:text-neutral-500"
                      />
                    </div>
                  ) : (
                    <div data-export-hide="true" className="pt-0.5 flex justify-start">
                      <button
                        type="button"
                        onClick={() => setShowPaymentDetails(true)}
                        className="text-[8.5px] font-mono text-[#525252] hover:text-[#0a0a0a] flex items-center gap-1 cursor-pointer transition-colors opacity-75 hover:opacity-100 border-none bg-transparent p-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>реквизиты оплаты</span>
                      </button>
                    </div>
                  )}

                  {/* Штрихкод */}
                  {showBarcode && (
                    <div className="flex items-center justify-center gap-[2px] h-[26px] py-[2px]">
                      {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2].map((w, i) => (
                        <div key={i} style={{ backgroundColor: '#0a0a0a', width: `${w}px`, height: '100%', borderRadius: '0.5px' }} />
                      ))}
                    </div>
                  )}

                  {/* Текст благодарности */}
                  <div className="text-center">
                    <input
                      type="text"
                      value={thanksText}
                      onChange={(e) => setThanksText(e.target.value)}
                      aria-label="Благодарность за заказ"
                      className="text-center font-bold text-[10px] sm:text-[10.5px] text-[#171717] bg-transparent border-b border-transparent hover:border-black/25 focus:border-black/70 focus:bg-black/5 outline-none w-full px-0.5 rounded-xs font-mono transition-colors"
                    />
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* ПАНЕЛЬ ДЕЙСТВИЙ (ПОД ЧЕКОМ, ВНЕ ЗОНЫ СКРИНШОТА) */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.12, duration: 0.22, ease: [0.16, 1, 0.3, 1] as const } }}
              exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18, ease: 'easeIn' as const } }}
              className="w-[340px] max-w-[calc(100vw-24px)] flex flex-col gap-2 font-mono"
            >
              {/* Кнопка: Копировать фото в буфер */}
              <Tooltip content="Скопировать чек в буфер обмена для вставки (Ctrl+V) в Telegram или WhatsApp">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={isExporting}
                  className={`w-full h-10 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
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
                {/* Кнопка: Скачать PNG */}
                <Tooltip content="Сохранить чек как изображение PNG">
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    disabled={isExporting}
                    className="w-full h-10 px-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Скачать PNG</span>
                  </button>
                </Tooltip>

                {/* Кнопка: Печать / PDF */}
                <Tooltip content="Распечатать или сохранить в PDF">
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={isExporting}
                    className="w-full h-10 px-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Печать / PDF</span>
                  </button>
                </Tooltip>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
