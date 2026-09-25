import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { motionValue } from 'motion/react';
import { PageLoadingOverlay } from '../src/shared/ui/page-transition/PageLoadingOverlay';

test('loading surface exposes milestone progress without announcing duplicate text', () => {
  const html = renderToStaticMarkup(<PageLoadingOverlay progress={motionValue(0.5)} opacity={motionValue(1)}
    realProgress={0.5} phase="loading" error={null} slow={false} onRetry={() => {}} onHome={() => {}} />);
  assert.equal((html.match(/role="progressbar"/g) ?? []).length, 1);
  assert.match(html, /aria-valuenow="50"/);
  assert.match(html, /aria-label="Подготовка страницы"/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /aria-valuenow="100"/);
});

test('a failed transition exposes recovery rather than successful progress', () => {
  const html = renderToStaticMarkup(<PageLoadingOverlay progress={motionValue(0.5)} opacity={motionValue(1)}
    realProgress={0.5} phase="error" error="Не удалось открыть страницу" slow={false} onRetry={() => {}} onHome={() => {}} />);
  assert.match(html, /Не удалось открыть страницу/);
  assert.match(html, /повторить/);
  assert.match(html, /на главную/);
  assert.doesNotMatch(html, /aria-valuenow="100"/);
});
