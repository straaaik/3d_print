import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { Printer } from '../src/shared/types';
import { PrinterInfoDrawer } from '../src/features/printers-room/components/PrinterInfoDrawer';
import { PrinterRoomOverlay } from '../src/features/printers-room/components/PrinterRoomOverlay';

const dummyPrinter: Printer = {
  id: 'printer-p1',
  name: 'Bambu Lab X1C',
  power_w: 350,
  price: 120000,
  lifespan_hours: 8000,
  color: '#0CB4E0',
};

test('PrinterInfoDrawer renders null when no printer is selected', () => {
  const html = renderToString(
    <PrinterInfoDrawer
      printer={null}
      electricityRate={6.5}
      currency="₽"
      onClose={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
    />,
  );
  assert.equal(html, '');
});

test('PrinterInfoDrawer renders printer telemetry and actions when selected', () => {
  const html = renderToString(
    <PrinterInfoDrawer
      printer={dummyPrinter}
      electricityRate={6.5}
      currency="₽"
      onClose={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
    />,
  );

  assert.ok(html.includes('Bambu Lab X1C'), 'Should render printer name');
  assert.ok(html.includes('350'), 'Should render power in watts');
  assert.ok(html.includes('Ресурс'), 'Should render resource section');
  assert.ok(html.includes('Редактировать'), 'Should include edit button');
  assert.ok(html.includes('Удалить'), 'Should include delete button');
});

test('PrinterRoomOverlay renders active printers count and hint', () => {
  const html = renderToString(
    <PrinterRoomOverlay
      printersCount={3}
      hasSelection={false}
      onResetFocus={() => {}}
    />,
  );

  assert.ok(html.includes('3D-ФЕРМА') || html.includes('3D-МАСТЕРСКАЯ'));
  assert.ok(html.includes('3'), 'Should display printer count');
});

test('PrinterRoomOverlay displays return to overview button when printer is selected', () => {
  const html = renderToString(
    <PrinterRoomOverlay
      printersCount={3}
      hasSelection={true}
      onResetFocus={() => {}}
    />,
  );

  assert.ok(html.includes('Вся комната') || html.includes('Обзор'));
});
