import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  rgbToHsl,
  hslToRgb,
  isValidHex,
  normalizeHex,
  getContrastTextColor,
} from '../src/shared/lib/colorUtils';

test('hexToRgb и rgbToHex корректно конвертируют основные цвета', () => {
  assert.deepEqual(hexToRgb('#FFFFFF'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
  assert.deepEqual(hexToRgb('#FF0000'), { r: 255, g: 0, b: 0 });
  assert.deepEqual(hexToRgb('00ff00'), { r: 0, g: 255, b: 0 });
  assert.deepEqual(hexToRgb('#0000ff'), { r: 0, g: 0, b: 255 });
  assert.deepEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255 });

  assert.equal(rgbToHex(255, 255, 255), '#FFFFFF');
  assert.equal(rgbToHex(0, 0, 0), '#000000');
  assert.equal(rgbToHex(255, 0, 0), '#FF0000');
  assert.equal(rgbToHex(12, 180, 224), '#0CB4E0');
});

test('rgbToHsv и hsvToRgb сохраняют цветовые координаты', () => {
  // Красный (360/0°, 100%, 100%)
  const redHsv = rgbToHsv(255, 0, 0);
  assert.equal(redHsv.h, 0);
  assert.equal(redHsv.s, 100);
  assert.equal(redHsv.v, 100);

  const redRgb = hsvToRgb(0, 100, 100);
  assert.deepEqual(redRgb, { r: 255, g: 0, b: 0 });

  // Чёрный
  const blackHsv = rgbToHsv(0, 0, 0);
  assert.equal(blackHsv.v, 0);
  assert.deepEqual(hsvToRgb(0, 0, 0), { r: 0, g: 0, b: 0 });
});

test('rgbToHsl и hslToRgb работают стабильно', () => {
  const whiteHsl = rgbToHsl(255, 255, 255);
  assert.equal(whiteHsl.l, 100);
  assert.deepEqual(hslToRgb(0, 0, 100), { r: 255, g: 255, b: 255 });

  const cyanRgb = hslToRgb(180, 100, 50);
  assert.equal(cyanRgb.r, 0);
  assert.equal(cyanRgb.g, 255);
  assert.equal(cyanRgb.b, 255);
});

test('isValidHex и normalizeHex валидируют ввод пользователя', () => {
  assert.equal(isValidHex('#fff'), true);
  assert.equal(isValidHex('#0CB4E0'), true);
  assert.equal(isValidHex('0CB4E0'), true);
  assert.equal(isValidHex('abc'), true);
  assert.equal(isValidHex('#xyz'), false);
  assert.equal(isValidHex('#12345'), false);

  assert.equal(normalizeHex('fff'), '#FFFFFF');
  assert.equal(normalizeHex('#0cb4e0'), '#0CB4E0');
  assert.equal(normalizeHex('invalid'), '#FFFFFF');
});

test('getContrastTextColor выбирает читаемый цвет текста', () => {
  assert.equal(getContrastTextColor('#FFFFFF'), '#000000');
  assert.equal(getContrastTextColor('#000000'), '#FFFFFF');
  assert.equal(getContrastTextColor('#121214'), '#FFFFFF');
  assert.equal(getContrastTextColor('#F8FAFC'), '#000000');
});
