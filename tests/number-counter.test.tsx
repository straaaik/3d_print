import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { NumberCounter } from '../src/shared/ui/NumberCounter';

function textContent(markup: string): string {
  return markup
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, '\u00a0')
    .replace(/&amp;/g, '&')
    .replace(/[\s\u00a0]/g, '');
}

test('NumberCounter сохраняет естественный порядок цифр для вспомогательных технологий', () => {
  const markup = renderToStaticMarkup(
    <NumberCounter label="Количество" value={1234} onChange={() => undefined} />,
  );

  const renderedText = textContent(markup);

  assert.match(renderedText, /1234/);
  assert.doesNotMatch(renderedText, /4321/);
});


