import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHubIconStyle,
  getHubIconSrc,
  DEFAULT_HUB_ICON_STYLE,
  HUB_ICON_STYLES,
} from '../src/shared/lib/hubIconPreferences';

test('parseHubIconStyle возвращает дефолтный стиль при пустом или некорректном значении', () => {
  assert.equal(parseHubIconStyle(null), DEFAULT_HUB_ICON_STYLE);
  assert.equal(parseHubIconStyle(''), DEFAULT_HUB_ICON_STYLE);
  assert.equal(parseHubIconStyle('undefined'), DEFAULT_HUB_ICON_STYLE);
  assert.equal(parseHubIconStyle('{ broken json'), DEFAULT_HUB_ICON_STYLE);
  assert.equal(parseHubIconStyle(JSON.stringify({ style: 'unknown_style' })), DEFAULT_HUB_ICON_STYLE);
});

test('parseHubIconStyle корректно распознает оба стиля из JSON и строки', () => {
  assert.equal(parseHubIconStyle(JSON.stringify({ style: 'cyber' })), 'cyber');
  assert.equal(parseHubIconStyle(JSON.stringify({ style: 'classic' })), 'classic');
  assert.equal(parseHubIconStyle(JSON.stringify('cyber')), 'cyber');
  assert.equal(parseHubIconStyle(JSON.stringify('classic')), 'classic');
});

test('getHubIconSrc возвращает правильные пути для всех модулей хаба', () => {
  const sections = ['calculator', 'filaments', 'orders', 'printers', 'products', 'stats'];

  for (const section of sections) {
    assert.equal(getHubIconSrc(section, 'cyber'), `/images/hub/cyber/${section}.png`);
    assert.equal(getHubIconSrc(section, 'classic'), `/images/hub/classic/${section}.png`);
  }

  // При передаче неизвестного стиля переключается на безопасный дефолт
  assert.equal(getHubIconSrc('calculator', 'unknown' as any), '/images/hub/cyber/calculator.png');
});

test('HUB_ICON_STYLES содержит ровно 2 зарегистрированных стиля с описаниями и превью', () => {
  assert.equal(HUB_ICON_STYLES.length, 2);
  const ids = HUB_ICON_STYLES.map((s) => s.id);
  assert.deepEqual(ids, ['cyber', 'classic']);

  for (const item of HUB_ICON_STYLES) {
    assert.ok(item.name.length > 0);
    assert.ok(item.description.length > 0);
    assert.ok(item.previewIcons.length >= 3);
  }
});
