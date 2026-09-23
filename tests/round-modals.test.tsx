import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoundDeleteModal } from '../src/shared/ui/RoundDeleteModal';
import { CockpitDeleteModal } from '../src/shared/ui/CockpitDeleteModal';

test('RoundDeleteModal does not render when closed', () => {
  const markup = renderToStaticMarkup(
    <RoundDeleteModal isOpen={false} onClose={() => undefined} onConfirm={() => undefined} />
  );
  assert.equal(markup, '');
});

test('RoundDeleteModal accepts props and children without throwing', () => {
  const markup = renderToStaticMarkup(
    <RoundDeleteModal
      isOpen={false}
      onClose={() => undefined}
      onConfirm={() => undefined}
      title="Удаление"
      itemName="Корпус дрона"
      itemDetails="Деталь #42"
      holdDurationMs={1600}
    >
      <span>Дополнительная опция</span>
    </RoundDeleteModal>
  );
  assert.equal(markup, '');
});

test('CockpitDeleteModal delegates to RoundDeleteModal without throwing', () => {
  const markup = renderToStaticMarkup(
    <CockpitDeleteModal
      isOpen={false}
      onClose={() => undefined}
      onConfirm={() => undefined}
      title="Удаление принтера"
      itemName="Voron 2.4"
      itemDetails="350 Вт"
      description="Удалить принтер из парка?"
    />
  );
  assert.equal(markup, '');
});
