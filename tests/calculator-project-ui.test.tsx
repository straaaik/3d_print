import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectWorkspaceControls } from '../src/widgets/Calculator/ProjectWorkspaceControls';
import { addDraftItem, createCalculationDraft, draftItemInputs, emptyCalculatorForm, setDraftComparison, updateDraftForm } from '../src/shared/lib/calculationDraft';
import { calculatePrintCost, calculateProjectTotals } from '../src/shared/lib/formulas';
import { CalculationReceipt } from '../src/shared/ui/CalculationReceipt';

test('workspace renders ten individually addressable cards and limits comparison to two', () => {
  let serial = 0;
  const id = () => `item-${++serial}`;
  let draft = createCalculationDraft('alice', emptyCalculatorForm(), id);
  for (let index = 1; index < 10; index++) draft = addDraftItem(draft, id);
  draft = setDraftComparison(draft, draft.items.slice(0, 2).map(item => item.id));
  const result = calculatePrintCost({ weightG: 0, hours: 0, minutes: 0, laborMinutes: 0,
    quantity: 1, filament: null, printer: null, settings: null });
  const lines = draft.items.map(item => ({ id: item.id, name: item.name, quantity: 1, result }));
  const totals = calculateProjectTotals({ lines });
  const html = renderToStaticMarkup(<ProjectWorkspaceControls draft={draft} lines={lines}
    totals={totals} projects={[]} onUpdate={() => {}} onSave={() => {}} onLoad={() => {}}
    isSaving={false} mode="local" pendingCount={1} />);
  assert.equal((html.match(/aria-label="Открыть расчёт/g) ?? []).length, 10);
  assert.equal((html.match(/disabled=""[^>]* aria-label="Сравнить расчёт/g) ?? []).length, 8);
  assert.match(html, /Себестоимость за шт\./);
  for (const label of ['Материал', 'Вес партии', 'Время печати', 'Электроэнергия', 'Амортизация', 'Труд', 'Дополнительные расходы', 'Скидка позиции']) {
    assert.ok(html.includes(label), `Missing comparison metric: ${label}`);
  }
  assert.match(html, /Согласованная цена проекта/);
  assert.match(html, /Скидка проекта/);
  assert.doesNotMatch(html, /<select/);
});

test('comparison and aggregate receipt reflect edits and an explicit zero agreed price', () => {
  let serial = 0;
  let draft = createCalculationDraft('alice', emptyCalculatorForm(), () => `live-${++serial}`);
  draft = updateDraftForm(draft, draft.activeItemId, { customCosts: [
    { id: 'cost', name: 'Упаковка', isEnabled: true, mode: 'cost_no_markup', amount: 123.45, isPerUnit: true },
  ] });
  draft = addDraftItem(draft, () => `live-${++serial}`);
  draft = setDraftComparison(draft, draft.items.map(item => item.id));
  const render = () => {
    const lines = draft.items.map(item => ({ id: item.id, name: item.name,
      quantity: Number(item.form.quantity), result: calculatePrintCost(draftItemInputs(item.form, [], [], null)) }));
    const totals = calculateProjectTotals({ lines, agreedPrice: draft.project.agreed_price });
    return {
      controls: renderToStaticMarkup(<ProjectWorkspaceControls draft={draft} lines={lines} totals={totals}
        projects={[]} onUpdate={() => {}} onSave={() => {}} onLoad={() => {}}
        isSaving={false} mode="local" pendingCount={0} />),
      receipt: renderToStaticMarkup(<CalculationReceipt kind="project" lines={lines} result={totals} />), totals,
    };
  };
  const before = render();
  draft = updateDraftForm(draft, draft.items[0].id, { quantity: '2' });
  draft.project.agreed_price = 0;
  const after = render();
  assert.notEqual(before.controls, after.controls);
  assert.equal(after.totals.totalBaseCost, 246.9);
  assert.equal(after.totals.totalFinalPrice, 0);
  assert.match(after.controls, /Цена проекта ниже себестоимости/);
  assert.match(after.receipt, /Корректировка цены/);
  assert.match(after.receipt, /Цена ниже себестоимости/);
});
