import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { FilamentFormFields, PrinterFormFields } from '../src/widgets/InventoryCockpit/InventoryFormFields';

test('FilamentFormFields renders inputs on the left and spool color picker on the right', () => {
  const markup = renderToStaticMarkup(
    <FilamentFormFields
      values={{
        name: 'eSUN PLA+ Black',
        price: '1600',
        weightG: '1000',
        color: '#0CB4E0',
      }}
      onChange={() => undefined}
      currencySymbol="₽"
    />
  );

  // Inputs
  assert.match(markup, /Название материала/);
  assert.match(markup, /Вес, г/);
  assert.match(markup, /Цена/);

  // Spool color picker
  assert.match(markup, /data-filament-spool-picker="true"/);
  assert.match(markup, /SPOOL/);
  assert.match(markup, /#0CB4E0/);
});

test('FilamentFormFields passes updated color to the spool color picker', () => {
  const markup = renderToStaticMarkup(
    <FilamentFormFields
      values={{
        name: 'PETG Scarlet',
        price: '2100',
        weightG: '1000',
        color: '#E11D48',
      }}
      onChange={() => undefined}
      currencySymbol="₽"
    />
  );

  assert.match(markup, /#E11D48/);
});

test('PrinterFormFields renders inputs on the left and printer color picker on the right', () => {
  const markup = renderToStaticMarkup(
    <PrinterFormFields
      values={{
        name: 'Bambu Lab X1C',
        price: '120000',
        powerW: '350',
        lifespanHours: '5000',
        color: '#0CB4E0',
      }}
      onChange={() => undefined}
      currencySymbol="₽"
    />
  );

  // Inputs
  assert.match(markup, /Название принтера/);
  assert.match(markup, /Стоимость покупки/);
  assert.match(markup, /Мощность, Вт/);
  assert.match(markup, /Ресурс, ч/);

  // Printer color picker
  assert.match(markup, /data-printer-color-picker="true"/);
  assert.match(markup, /PRINTER/);
  assert.match(markup, /#0CB4E0/);
});

test('PrinterFormFields passes updated color to the printer color picker', () => {
  const markup = renderToStaticMarkup(
    <PrinterFormFields
      values={{
        name: 'Voron 2.4',
        price: '95000',
        powerW: '400',
        lifespanHours: '6000',
        color: '#10B981',
      }}
      onChange={() => undefined}
      currencySymbol="₽"
    />
  );

  assert.match(markup, /#10B981/);
});
