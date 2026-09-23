import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  OrderContactsModal,
  OrderContactsModalContent,
} from '../src/widgets/Orders/components/v2/OrderContactsModal';
import { Order } from '../src/widgets/Orders/types';

const MOCK_ORDER: Order = {
  id: 'order-101',
  order_number: 101,
  type: 'income',
  client_name: 'Иван Тестов',
  client: 'Иван Тестов',
  contact: '+7 (999) 123-45-67',
  title: 'Шестерня редуктора',
  status: 'Печать',
  amount: 1500,
  cost: 500,
  payment: 0,
  date: '2026-09-17',
  deadline: '2026-09-20',
  notes: '',
  contacts: [
    { type: 'phone', value: '+7 (999) 123-45-67' },
    { type: 'telegram', value: '@ivan_test' },
  ],
};

test('OrderContactsModal does not render when closed or order is null', () => {
  const closedMarkup = renderToStaticMarkup(
    <OrderContactsModal
      isOpen={false}
      order={MOCK_ORDER}
      onClose={() => undefined}
      onSave={() => undefined}
      onCopyContact={() => undefined}
    />
  );
  assert.equal(closedMarkup, '');

  const nullOrderMarkup = renderToStaticMarkup(
    <OrderContactsModal
      isOpen={true}
      order={null}
      onClose={() => undefined}
      onSave={() => undefined}
      onCopyContact={() => undefined}
    />
  );
  assert.equal(nullOrderMarkup, '');
});

test('OrderContactsModal uses standard modal z-[9999] so portal dropdowns (z-99999) are never covered', () => {
  const markup = renderToStaticMarkup(
    <OrderContactsModalContent
      order={MOCK_ORDER}
      onClose={() => undefined}
      onSave={() => undefined}
      onCopyContact={() => undefined}
    />
  );

  // The modal MUST have z-[9999] (the standard modal z-index)
  assert.match(markup, /z-\[9999\]/, 'Modal should use standard modal z-[9999]');
  // The modal MUST NOT use z-[999999] (which would put it above portal dropdowns and tooltips)
  assert.doesNotMatch(markup, /999999/, 'Modal must not use z-[999999]');
  // Verify modal dialog structure
  assert.match(markup, /role="dialog"/);
  assert.match(markup, /Контакты клиента/);
  // Verify contacts are rendered
  assert.match(markup, /\+7 \(999\) 123-45-67/);
  assert.match(markup, /@ivan_test/);

  // Verify icon buttons are rendered (labels for primary, copy, link, delete)
  assert.match(markup, /aria-label="Основной контакт 1"/);
  assert.match(markup, /aria-label="Сделать контакт 2 основным"/);
  assert.match(markup, /aria-label="Скопировать контакт 1"/);
  assert.match(markup, /aria-label="Открыть ссылку для контакта 2"/);
  assert.match(markup, /aria-label="Удалить контакт 1"/);

  // Verify obsolete bottom text buttons are gone
  assert.doesNotMatch(markup, /сделать основным<\/span>/);
  assert.doesNotMatch(markup, />скопировать<\/span>/);

  // Verify primary contact uses gray/neutral styling without cyan/blue
  assert.doesNotMatch(markup, /border-cyan-500/);
  assert.doesNotMatch(markup, /fill-cyan-400/);
  assert.match(markup, /border-white\/25/);
  assert.match(markup, /fill-neutral-200/);
});


