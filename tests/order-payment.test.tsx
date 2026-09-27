import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  applyFullPaymentPreset,
  OrderPaymentModal,
} from '../src/widgets/Orders/components/v2/OrderPaymentModal';
import { Order, PaymentItem } from '../src/widgets/Orders/types';

test('applyFullPaymentPreset adds a second receipt with the remaining balance when a partial payment already exists', () => {
  const initialItems: PaymentItem[] = [
    {
      id: 'pay-1',
      amount: 1000,
      date: '20.09.2026',
      note: 'Предоплата',
    },
  ];

  const totalOrderAmount = 4000;
  const todayStr = '26.09.2026';

  const result = applyFullPaymentPreset(initialItems, totalOrderAmount, todayStr, (prefix) => `${prefix}-custom-2`);

  // Should NOT overwrite the first receipt from 1000 to 4000.
  // Must return 2 receipts: 1000 and 3000.
  assert.equal(result.length, 2);
  assert.equal(result[0].amount, 1000);
  assert.equal(result[0].note, 'Предоплата');
  assert.equal(result[0].date, '20.09.2026');

  assert.equal(result[1].amount, 3000);
  assert.equal(result[1].note, 'Доплата до 100%');
  assert.equal(result[1].date, '26.09.2026');
});

test('applyFullPaymentPreset adds a third receipt when two partial payments already exist', () => {
  const initialItems: PaymentItem[] = [
    {
      id: 'pay-1',
      amount: 1000,
      date: '20.09.2026',
      note: 'Аванс 1',
    },
    {
      id: 'pay-2',
      amount: 1000,
      date: '22.09.2026',
      note: 'Аванс 2',
    },
  ];

  const totalOrderAmount = 4000;
  const todayStr = '26.09.2026';

  const result = applyFullPaymentPreset(initialItems, totalOrderAmount, todayStr);

  assert.equal(result.length, 3);
  assert.equal(result[0].amount, 1000);
  assert.equal(result[1].amount, 1000);
  assert.equal(result[2].amount, 2000);
  assert.equal(result[2].note, 'Доплата до 100%');
});

test('applyFullPaymentPreset sets a single 100% receipt when order is unpaid (0 rub)', () => {
  const initialItems: PaymentItem[] = [
    {
      id: 'pay-draft-0',
      amount: 0,
      date: '26.09.2026',
      note: '',
    },
  ];

  const totalOrderAmount = 4000;
  const todayStr = '26.09.2026';

  const result = applyFullPaymentPreset(initialItems, totalOrderAmount, todayStr);

  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 4000);
  assert.equal(result[0].note, 'Полная оплата (100%)');
});

test('applyFullPaymentPreset fills an existing trailing empty receipt instead of appending a duplicate', () => {
  const initialItems: PaymentItem[] = [
    {
      id: 'pay-1',
      amount: 1000,
      date: '20.09.2026',
      note: 'Аванс',
    },
    {
      id: 'pay-2',
      amount: 0,
      date: '26.09.2026',
      note: '',
    },
  ];

  const totalOrderAmount = 4000;
  const todayStr = '26.09.2026';

  const result = applyFullPaymentPreset(initialItems, totalOrderAmount, todayStr);

  assert.equal(result.length, 2);
  assert.equal(result[0].amount, 1000);
  assert.equal(result[1].id, 'pay-2');
  assert.equal(result[1].amount, 3000);
  assert.equal(result[1].note, 'Доплата до 100%');
});

test('applyFullPaymentPreset does nothing if order is already 100% paid', () => {
  const initialItems: PaymentItem[] = [
    {
      id: 'pay-1',
      amount: 4000,
      date: '20.09.2026',
      note: 'Оплачено',
    },
  ];

  const totalOrderAmount = 4000;
  const todayStr = '26.09.2026';

  const result = applyFullPaymentPreset(initialItems, totalOrderAmount, todayStr);

  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 4000);
});

test('OrderPaymentModal does not render when closed or order is null', () => {
  const dummyOrder: Order = {
    id: 'ord-1',
    order_number: 1,
    type: 'income',
    title: 'Тест',
    client: 'Авито',
    amount: 4000,
    cost: 1000,
    payment: 1000,
    date: '2026-09-20',
    deadline: '2026-09-25',
    status: 'Печать',
    contact: '',
    notes: '',
  };

  const closedMarkup = renderToStaticMarkup(
    <OrderPaymentModal
      order={dummyOrder}
      isOpen={false}
      onClose={() => undefined}
      onSave={() => undefined}
    />
  );
  assert.equal(closedMarkup, '');

  const nullOrderMarkup = renderToStaticMarkup(
    <OrderPaymentModal
      order={null}
      isOpen={true}
      onClose={() => undefined}
      onSave={() => undefined}
    />
  );
  assert.equal(nullOrderMarkup, '');
});
