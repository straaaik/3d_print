'use client';

import { useMemo, useSyncExternalStore } from 'react';

export const RECEIPT_TEMPLATE_STORAGE_KEY = '3dlabs.receipt_template.v1';

export interface ReceiptTemplate {
  companyName: string;
  companySubtitle: string;
  receiptType: string;
  authText: string;
  defaultStatus: string;
  thanksText: string;
  paymentDetails: string;
  showPaymentDetails: boolean;
  showBarcode: boolean;
  showPrinterAndFilament: boolean;
  showWeight: boolean;
  showUnitPrice: boolean;
  defaultHideSpecification: boolean;
  showCompanyName: boolean;
  showCompanySubtitle: boolean;
  showOrderNumber: boolean;
  showReceiptType: boolean;
  showOrderDate: boolean;
}

export const DEFAULT_RECEIPT_TEMPLATE: ReceiptTemplate = {
  companyName: 'KUMO CRM',
  companySubtitle: 'ПРОИЗВОДСТВЕННАЯ ЛАБОРАТОРИЯ',
  receiptType: 'ТОВАРНЫЙ ЧЕК',
  authText: 'ЭЛЕКТРОННЫЙ ДОКУМЕНТ',
  defaultStatus: 'ОПЛАЧЕНО',
  thanksText: 'СПАСИБО ЗА ДОВЕРИЕ К МАСТЕРСКОЙ!',
  paymentDetails: '',
  showPaymentDetails: true,
  showBarcode: true,
  showPrinterAndFilament: true,
  showWeight: true,
  showUnitPrice: true,
  defaultHideSpecification: false,
  showCompanyName: true,
  showCompanySubtitle: true,
  showOrderNumber: true,
  showReceiptType: true,
  showOrderDate: true,
};

export function parseReceiptTemplate(raw: string | null): ReceiptTemplate {
  if (!raw) return DEFAULT_RECEIPT_TEMPLATE;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') return DEFAULT_RECEIPT_TEMPLATE;
    return {
      companyName: typeof value.companyName === 'string' && value.companyName.trim() ? value.companyName : DEFAULT_RECEIPT_TEMPLATE.companyName,
      companySubtitle: typeof value.companySubtitle === 'string' ? value.companySubtitle : DEFAULT_RECEIPT_TEMPLATE.companySubtitle,
      receiptType: typeof value.receiptType === 'string' && value.receiptType.trim() ? value.receiptType : DEFAULT_RECEIPT_TEMPLATE.receiptType,
      authText: typeof value.authText === 'string' ? value.authText : DEFAULT_RECEIPT_TEMPLATE.authText,
      defaultStatus: typeof value.defaultStatus === 'string' ? value.defaultStatus : DEFAULT_RECEIPT_TEMPLATE.defaultStatus,
      thanksText: typeof value.thanksText === 'string' ? value.thanksText : DEFAULT_RECEIPT_TEMPLATE.thanksText,
      paymentDetails: typeof value.paymentDetails === 'string' ? value.paymentDetails : DEFAULT_RECEIPT_TEMPLATE.paymentDetails,
      showPaymentDetails: typeof value.showPaymentDetails === 'boolean' ? value.showPaymentDetails : DEFAULT_RECEIPT_TEMPLATE.showPaymentDetails,
      showBarcode: typeof value.showBarcode === 'boolean' ? value.showBarcode : DEFAULT_RECEIPT_TEMPLATE.showBarcode,
      showPrinterAndFilament: typeof value.showPrinterAndFilament === 'boolean' ? value.showPrinterAndFilament : DEFAULT_RECEIPT_TEMPLATE.showPrinterAndFilament,
      showWeight: typeof value.showWeight === 'boolean' ? value.showWeight : DEFAULT_RECEIPT_TEMPLATE.showWeight,
      showUnitPrice: typeof value.showUnitPrice === 'boolean' ? value.showUnitPrice : DEFAULT_RECEIPT_TEMPLATE.showUnitPrice,
      defaultHideSpecification: typeof value.defaultHideSpecification === 'boolean' ? value.defaultHideSpecification : DEFAULT_RECEIPT_TEMPLATE.defaultHideSpecification,
      showCompanyName: typeof value.showCompanyName === 'boolean' ? value.showCompanyName : DEFAULT_RECEIPT_TEMPLATE.showCompanyName,
      showCompanySubtitle: typeof value.showCompanySubtitle === 'boolean' ? value.showCompanySubtitle : DEFAULT_RECEIPT_TEMPLATE.showCompanySubtitle,
      showOrderNumber: typeof value.showOrderNumber === 'boolean' ? value.showOrderNumber : DEFAULT_RECEIPT_TEMPLATE.showOrderNumber,
      showReceiptType: typeof value.showReceiptType === 'boolean' ? value.showReceiptType : DEFAULT_RECEIPT_TEMPLATE.showReceiptType,
      showOrderDate: typeof value.showOrderDate === 'boolean' ? value.showOrderDate : DEFAULT_RECEIPT_TEMPLATE.showOrderDate,
    };
  } catch {
    return DEFAULT_RECEIPT_TEMPLATE;
  }
}

const listeners = new Set<() => void>();
let memoryValue: string | null = null;
let memoryOnly = false;

function getSnapshot(): string | null {
  if (memoryOnly) return memoryValue;
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(RECEIPT_TEMPLATE_STORAGE_KEY) : null;
  } catch {
    return memoryValue;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window === 'undefined') {
    return () => {
      listeners.delete(listener);
    };
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === RECEIPT_TEMPLATE_STORAGE_KEY || event.key === null) {
      memoryOnly = false;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const serverSnapshot = () => null;

export function saveReceiptTemplate(template: ReceiptTemplate): boolean {
  try {
    const raw = JSON.stringify(template);
    memoryValue = raw;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RECEIPT_TEMPLATE_STORAGE_KEY, raw);
    }
    listeners.forEach((l) => l());
    return true;
  } catch {
    memoryOnly = true;
    listeners.forEach((l) => l());
    return false;
  }
}

export function resetReceiptTemplate(): boolean {
  return saveReceiptTemplate(DEFAULT_RECEIPT_TEMPLATE);
}

/**
 * Хук для использования и обновления шаблона чека.
 * Синхронизируется реактивно между всеми вкладками и окнами браузера.
 */
export function useReceiptTemplate() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const template = useMemo(() => parseReceiptTemplate(raw), [raw]);

  const updateTemplate = (patch: Partial<ReceiptTemplate>): boolean => {
    const next = { ...template, ...patch };
    return saveReceiptTemplate(next);
  };

  return {
    template,
    updateTemplate,
    resetTemplate: resetReceiptTemplate,
  };
}
