import test from 'node:test';
import assert from 'node:assert/strict';
import { createCalculationDraft, addDraftItem, removeDraftItem, updateDraftForm, setDraftComparison,
  draftItemInputs, isCalculationDraft, emptyCalculatorForm, readCalculationDraft, writeCalculationDraft,
  calculationDraftKey } from '../src/shared/lib/calculationDraft';

let serial = 0;
const id = () => `draft-${++serial}`;

test('ten calculator cards keep independent values while navigating and duplicating', () => {
  let draft = createCalculationDraft('alice', emptyCalculatorForm(), id);
  const first = draft.activeItemId;
  draft = updateDraftForm(draft, first, { weight: '350', customCosts: [
    { id: 'cost', name: 'Hardware', amount: 7, isEnabled: true, mode: 'cost_no_markup' },
  ] });
  for (let index = 1; index < 10; index++) draft = addDraftItem(draft, id);
  draft = updateDraftForm(draft, draft.activeItemId, { weight: '100' });
  assert.equal(draft.items.length, 10);
  assert.equal(draft.items[0].form.weight, '350');
  assert.equal(draft.items[9].form.weight, '100');
  assert.equal(draft.items[1].form.weight, '');
  const duplicated = addDraftItem(draft, id, first);
  duplicated.items.at(-1)!.form.customCosts[0].amount = 20;
  assert.equal(draft.items[0].form.customCosts[0].amount, 7);
});

test('compare selection admits two existing distinct items and deletion repairs navigation', () => {
  let draft = createCalculationDraft('alice', emptyCalculatorForm(), id);
  draft = addDraftItem(addDraftItem(draft, id), id);
  const ids = draft.items.map(item => item.id);
  draft = setDraftComparison(draft, [ids[0], ids[1]]);
  assert.throws(() => setDraftComparison(draft, ids), /двух/);
  assert.throws(() => setDraftComparison(draft, ['missing']), /найден/);
  draft = removeDraftItem(draft, ids[1]);
  assert.deepEqual(draft.compareItemIds, [ids[0]]);
  draft = removeDraftItem(draft, draft.activeItemId);
  assert.equal(draft.activeItemId, ids[0]);
  assert.throws(() => removeDraftItem(draft, ids[0]), /последний/);
});

test('draft serialization preserves zero override, input text and user scope', () => {
  const draft = createCalculationDraft('alice', emptyCalculatorForm(), id);
  draft.project.agreed_price = 0;
  draft.items[0].form.weight = '12,5';
  const loaded: unknown = JSON.parse(JSON.stringify(draft));
  assert.equal(isCalculationDraft(loaded, 'alice'), true);
  assert.equal(isCalculationDraft(loaded, 'bob'), false);
  assert.equal(isCalculationDraft({ ...draft, version: 2 }, 'alice'), false);
});

test('active draft input resolves current resources, retains item discount and uses no project override', () => {
  const form = { ...emptyCalculatorForm(), weight: '100', quantity: '5', filamentId: 'f', discountValue: '10', markup: '0' };
  const inputs = draftItemInputs(form, [{ id: 'f', name: 'PLA', weight_g: 1000, price: 200 }], [], null);
  assert.equal(inputs.quantity, 5);
  assert.equal(inputs.weightG, 100);
  assert.equal(inputs.discountPercent, 10);
  assert.equal(inputs.markupPercent, 0);
  assert.equal(inputs.filament?.price, 200);
  assert.equal(inputs.agreedPrice, undefined);
});

test('draft writer cannot overwrite future or corrupted cache and quota failure leaves source unchanged', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
  const draft = createCalculationDraft('alice', emptyCalculatorForm(), id);
  const key = calculationDraftKey('alice');
  values.set(key, '{"version":2}');
  assert.throws(() => writeCalculationDraft(storage, draft), /несовместим/);
  assert.equal(values.get(key), '{"version":2}');
  values.set(key, '{broken');
  assert.throws(() => writeCalculationDraft(storage, draft), /повреждён/);
  values.delete(key);
  writeCalculationDraft(storage, draft);
  const source = values.get(key);
  const next = updateDraftForm(draft, draft.activeItemId, { weight: '900' });
  assert.throws(() => writeCalculationDraft({ ...storage, setItem: () => { throw new Error('quota'); } }, next), /quota/);
  assert.equal(values.get(key), source);
  assert.deepEqual(readCalculationDraft(storage, 'alice'), draft);
});
