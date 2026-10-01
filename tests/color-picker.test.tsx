import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ColorPicker } from '../src/shared/ui/ColorPicker';

test('ColorPicker renders on first load without a default variant or persisted selection', () => {
  const html = renderToStaticMarkup(<ColorPicker value="#123456" onChange={() => {}} inline />);
  assert.match(html, /3D КАТУШКА/);
  assert.match(html, /МАТРИЦА HUD/);
});

test('ColorPicker can render an explicit matrix variant before browser hydration', () => {
  const html = renderToStaticMarkup(<ColorPicker value="#123456" onChange={() => {}}
    defaultVariant="matrix" inline />);
  assert.match(html, /МАТРИЦА HUD/);
});
