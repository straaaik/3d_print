import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseNumericDraft, normalizeNumericValue } from '../src/shared/lib/numericInput';
import { NumberInput } from '../src/shared/ui/NumberInput';

test('draft parser accepts comma decimals and preserves trailing zeros', () => {
  assert.deepEqual(parseNumericDraft('12,050'), { kind: 'valid', draft: '12,050', value: 12.05 });
  assert.deepEqual(parseNumericDraft('01'), { kind: 'valid', draft: '1', value: 1 });
  assert.deepEqual(parseNumericDraft('0.05'), { kind: 'valid', draft: '0.05', value: 0.05 });
});

test('draft parser leaves transient edits uncommitted and rejects nonfinite or invalid input', () => {
  assert.equal(parseNumericDraft('').kind, 'transient');
  assert.equal(parseNumericDraft('.').kind, 'transient');
  assert.equal(parseNumericDraft('1e309').kind, 'invalid');
  assert.equal(parseNumericDraft('12a').kind, 'invalid');
});

test('blur normalization respects bounds and optional empty value', () => {
  assert.equal(normalizeNumericValue('12,5', 3, { min: 0, max: 10 }), 10);
  assert.equal(normalizeNumericValue('', 3, { allowEmpty: true }), null);
  assert.equal(normalizeNumericValue('.', 3, { min: 0 }), 3);
});

test('NumberInput associates label and exposes decimal text input semantics', () => {
  const html = renderToStaticMarkup(<NumberInput id="item-weight" label="Вес, г" value={0}
    onChange={() => {}} />);
  assert.match(html, /<label[^>]*for="item-weight"/);
  assert.match(html, /<input[^>]*id="item-weight"/);
  assert.match(html, /inputMode="decimal"|inputmode="decimal"/);
});
