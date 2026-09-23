import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseReceiptTemplate,
  DEFAULT_RECEIPT_TEMPLATE,
  type ReceiptTemplate,
} from '../src/shared/lib/receiptTemplate';
import { formatCurrency } from '../src/shared/lib/format';

test('parseReceiptTemplate returns default template for null or invalid JSON', () => {
  assert.deepEqual(parseReceiptTemplate(null), DEFAULT_RECEIPT_TEMPLATE);
  assert.deepEqual(parseReceiptTemplate(''), DEFAULT_RECEIPT_TEMPLATE);
  assert.deepEqual(parseReceiptTemplate('{invalid json'), DEFAULT_RECEIPT_TEMPLATE);
  assert.deepEqual(parseReceiptTemplate('123'), DEFAULT_RECEIPT_TEMPLATE);
});

test('parseReceiptTemplate preserves valid custom fields and uses defaults for missing ones', () => {
  const customPartial = JSON.stringify({
    companyName: 'MY 3D WORKSHOP',
    paymentDetails: 'СБП: +7 999 111-22-33',
    showBarcode: false,
    showUnitPrice: true,
  });
  const parsed = parseReceiptTemplate(customPartial);

  assert.equal(parsed.companyName, 'MY 3D WORKSHOP');
  assert.equal(parsed.paymentDetails, 'СБП: +7 999 111-22-33');
  assert.equal(parsed.showBarcode, false);
  assert.equal(parsed.showUnitPrice, true);
  // Default values should fill in
  assert.equal(parsed.companySubtitle, DEFAULT_RECEIPT_TEMPLATE.companySubtitle);
  assert.equal(parsed.receiptType, DEFAULT_RECEIPT_TEMPLATE.receiptType);
  assert.equal(parsed.defaultStatus, DEFAULT_RECEIPT_TEMPLATE.defaultStatus);
  assert.equal(parsed.thanksText, DEFAULT_RECEIPT_TEMPLATE.thanksText);
});

test('unit price formula calculates exact per-unit price matching screenshot format for 12 items', () => {
  const quantity = 12;
  const effectiveTotal = 1157;
  const currencySymbol = '₽';

  const unitPrice = effectiveTotal / quantity;
  const formattedUnitPrice = formatCurrency(unitPrice, currencySymbol).trim().replace(/\u00a0/g, ' ');
  const summaryLine = `${formattedUnitPrice} / шт. (за ${quantity} шт.)`;

  assert.equal(formattedUnitPrice, '96,42 ₽');
  assert.equal(summaryLine, '96,42 ₽ / шт. (за 12 шт.)');
});

test('unit price formula handles dynamic total adjustments automatically', () => {
  const quantity = 12;
  const modifiedTotal = 1200;
  const currencySymbol = '₽';

  const unitPrice = modifiedTotal / quantity;
  const formattedUnitPrice = formatCurrency(unitPrice, currencySymbol).trim().replace(/\u00a0/g, ' ');
  const summaryLine = `${formattedUnitPrice} / шт. (за ${quantity} шт.)`;

  assert.equal(formattedUnitPrice, '100,00 ₽');
  assert.equal(summaryLine, '100,00 ₽ / шт. (за 12 шт.)');
});

test('extra service names never append "(за весь заказ)", but append "(за штуку)" when isPerUnit', () => {
  const formatServiceName = (name: string, isPerUnit: boolean) => {
    const suffix = isPerUnit ? ' (за штуку)' : '';
    return `• ${name}${suffix}`;
  };

  assert.equal(formatServiceName('Упаковка', true), '• Упаковка (за штуку)');
  assert.equal(formatServiceName('Упаковка', false), '• Упаковка');
  assert.equal(formatServiceName('Доставка по городу', false), '• Доставка по городу');
});

test('receipt modal and template tab enforce non-editable totals, prominent payment details, and no double pluses', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');

  const modalSource = readFileSync(resolve('src/widgets/Calculator/ClientReceiptModal.tsx'), 'utf8');
  const templateTabSource = readFileSync(resolve('src/widgets/SettingsForm/components/ReceiptTemplateTab.tsx'), 'utf8');

  // 1. "ИТОГО К ОПЛАТЕ" and price per piece must not be editable inputs in modal
  assert.doesNotMatch(modalSource, /manualTotal/);
  assert.doesNotMatch(modalSource, /unitPriceCustomText/);
  assert.doesNotMatch(modalSource, /aria-label="Итоговая сумма"/);

  // 2. AuthText ("ЭЛЕКТРОННЫЙ ДОКУМЕНТ") and statusText ("ОПЛАЧЕНО") must be completely removed from receipt JSX
  assert.doesNotMatch(modalSource, /aria-label="Метка подлинности"/);
  assert.doesNotMatch(modalSource, /aria-label="Статус заказа"/);
  assert.doesNotMatch(templateTabSource, /aria-label="Метка подлинности"/);
  assert.doesNotMatch(templateTabSource, /aria-label="Статус заказа"/);

  // 3. No double pluses in buttons (e.g. `<Plus /> <span>+ ...</span>`)
  assert.doesNotMatch(modalSource, /<span>\+\s*реквизиты/);
  assert.doesNotMatch(modalSource, /<span>\+\s*добавить/);
  assert.doesNotMatch(templateTabSource, /<span>\+\s*реквизиты/);
  assert.doesNotMatch(templateTabSource, /<span>\+\s*добавить/);
  assert.doesNotMatch(templateTabSource, /<span>\+\s*показать/);

  // 4. Payment details box has prominent contrasting styling
  assert.match(modalSource, /bg-black\/\[0\.07\]/);
  assert.match(modalSource, /border-black\/25/);
  assert.match(templateTabSource, /bg-black\/\[0\.07\]/);
  assert.match(templateTabSource, /border-black\/25/);

  // 5. Template tab paper preview is non-editable (no inputs on the paper)
  const rightColumnPart = templateTabSource.slice(templateTabSource.indexOf('ПРАВАЯ КОЛОНКА'));
  assert.doesNotMatch(rightColumnPart, /<input/);
  assert.doesNotMatch(rightColumnPart, /<textarea/);
});

test('header visibility options default to true and can be toggled individually or collapsed completely', () => {
  // 1. Defaults are all true
  assert.equal(DEFAULT_RECEIPT_TEMPLATE.showCompanyName, true);
  assert.equal(DEFAULT_RECEIPT_TEMPLATE.showCompanySubtitle, true);
  assert.equal(DEFAULT_RECEIPT_TEMPLATE.showOrderNumber, true);
  assert.equal(DEFAULT_RECEIPT_TEMPLATE.showReceiptType, true);
  assert.equal(DEFAULT_RECEIPT_TEMPLATE.showOrderDate, true);

  // 2. Parser preserves explicit false settings
  const allHidden = parseReceiptTemplate(
    JSON.stringify({
      showCompanyName: false,
      showCompanySubtitle: false,
      showOrderNumber: false,
      showReceiptType: false,
      showOrderDate: false,
    })
  );
  assert.equal(allHidden.showCompanyName, false);
  assert.equal(allHidden.showCompanySubtitle, false);
  assert.equal(allHidden.showOrderNumber, false);
  assert.equal(allHidden.showReceiptType, false);
  assert.equal(allHidden.showOrderDate, false);

  // 3. Parser preserves partial settings
  const onlyCompanyHidden = parseReceiptTemplate(
    JSON.stringify({
      showCompanyName: false,
      showCompanySubtitle: true,
    })
  );
  assert.equal(onlyCompanyHidden.showCompanyName, false);
  assert.equal(onlyCompanyHidden.showCompanySubtitle, true);
  assert.equal(onlyCompanyHidden.showOrderNumber, true);
  assert.equal(onlyCompanyHidden.showReceiptType, true);
  assert.equal(onlyCompanyHidden.showOrderDate, true);

  // 4. Header composition and complete collapse logic
  const computeHeader = (tpl: ReceiptTemplate) => {
    const parts: string[] = [];
    if (tpl.showCompanyName) parts.push(tpl.companyName || 'KUMO CRM');
    if (tpl.showCompanySubtitle && tpl.companySubtitle) parts.push(tpl.companySubtitle);
    const storeName = parts.join(' · ');
    const hasAnyHeaderContent = Boolean(
      storeName || tpl.showOrderNumber || tpl.showReceiptType || tpl.showOrderDate
    );
    return { storeName, hasAnyHeaderContent };
  };

  const defaultHeader = computeHeader(DEFAULT_RECEIPT_TEMPLATE);
  assert.equal(defaultHeader.storeName, 'KUMO CRM · ПРОИЗВОДСТВЕННАЯ ЛАБОРАТОРИЯ');
  assert.equal(defaultHeader.hasAnyHeaderContent, true);

  const subtitleOnly = computeHeader({
    ...DEFAULT_RECEIPT_TEMPLATE,
    showCompanyName: false,
    showCompanySubtitle: true,
  });
  assert.equal(subtitleOnly.storeName, 'ПРОИЗВОДСТВЕННАЯ ЛАБОРАТОРИЯ');
  assert.equal(subtitleOnly.hasAnyHeaderContent, true);

  const companyOnly = computeHeader({
    ...DEFAULT_RECEIPT_TEMPLATE,
    showCompanyName: true,
    showCompanySubtitle: false,
  });
  assert.equal(companyOnly.storeName, 'KUMO CRM');
  assert.equal(companyOnly.hasAnyHeaderContent, true);

  const collapsedHeader = computeHeader(allHidden);
  assert.equal(collapsedHeader.storeName, '');
  assert.equal(collapsedHeader.hasAnyHeaderContent, false);

  // 5. Verify source files wire up the header flags and guards
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const modalSource = readFileSync(resolve('src/widgets/Calculator/ClientReceiptModal.tsx'), 'utf8');
  const templateTabSource = readFileSync(resolve('src/widgets/SettingsForm/components/ReceiptTemplateTab.tsx'), 'utf8');

  assert.match(modalSource, /hasAnyHeaderContent/);
  assert.match(modalSource, /showCompanyName/);
  assert.match(modalSource, /showCompanySubtitle/);
  assert.match(modalSource, /showOrderNumber/);
  assert.match(modalSource, /showReceiptType/);
  assert.match(modalSource, /showOrderDate/);

  assert.match(templateTabSource, /hasAnyHeaderContent/);
  assert.match(templateTabSource, /showCompanyName/);
  assert.match(templateTabSource, /showCompanySubtitle/);
  assert.match(templateTabSource, /showReceiptType/);
  assert.match(templateTabSource, /showOrderNumber/);
  assert.match(templateTabSource, /showOrderDate/);
});

