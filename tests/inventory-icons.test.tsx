import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilamentSpoolIcon, PrinterMachineIcon } from '../src/widgets/InventoryCockpit/InventoryIcons';

test('filament icon exposes a spool-specific accessible label', () => {
  const markup = renderToStaticMarkup(<FilamentSpoolIcon title="Катушка PLA" />);

  assert.match(markup, /role="img"/);
  assert.match(markup, /Катушка PLA/);
  assert.match(markup, /<path/);
});

test('printer icon exposes a machine-specific accessible label', () => {
  const markup = renderToStaticMarkup(<PrinterMachineIcon title="Принтер A1" />);

  assert.match(markup, /role="img"/);
  assert.match(markup, /Принтер A1/);
  assert.match(markup, /<rect/);
});
