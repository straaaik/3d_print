import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CockpitSwipeToDelete } from '../src/shared/ui/CockpitSwipeToDelete';

test('CockpitSwipeToDelete renders slider with accessible attributes and label', () => {
  const markup = renderToStaticMarkup(
    <CockpitSwipeToDelete onConfirm={() => undefined} label="[ Сдвиньте для удаления >>> ]" />
  );

  assert.match(markup, /role="slider"/);
  assert.match(markup, /aria-label="Свайп для подтверждения удаления"/);
  assert.match(markup, /Сдвиньте для удаления/);
});

test('CockpitSwipeToDelete renders disabled state with negative tabIndex', () => {
  const markup = renderToStaticMarkup(
    <CockpitSwipeToDelete onConfirm={() => undefined} disabled={true} />
  );

  assert.match(markup, /tabindex="-1"/i);
  assert.match(markup, /opacity-50/);
});

test('CockpitSwipeToDelete displays confirming label when isPending is true', () => {
  const markup = renderToStaticMarkup(
    <CockpitSwipeToDelete
      onConfirm={() => undefined}
      isPending={true}
      confirmingLabel="УДАЛЕНИЕ ЗАПИСИ..."
    />
  );

  assert.match(markup, /УДАЛЕНИЕ ЗАПИСИ\.\.\./);
});
