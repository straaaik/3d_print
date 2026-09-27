import { expect, test } from '@playwright/test';

const key = '3dlabs.background.v1';

test('точки реагируют на клик, возвращаются и не перерисовываются в покое', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'На сенсорных устройствах фон статичен');
  await page.goto('/');
  const background = page.locator('[data-app-background]');
  await expect(background).toHaveAttribute('data-background-motion', 'interactive');
  const canvas = background.locator('canvas');
  await page.mouse.move(160, 200);
  // Wait for the finite hover spring, then compare the actual raster, not DOM markers.
  await page.waitForTimeout(2000);
  const snapshot = () => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  const before = await snapshot();
  await page.mouse.click(160, 200);
  await page.waitForTimeout(650);
  expect(await snapshot()).not.toBe(before);
  await expect.poll(snapshot).toBe(before);
  const idleDraws = () => canvas.evaluate(async (node: HTMLCanvasElement) => {
    const ctx = node.getContext('2d')!;
    const original = ctx.clearRect;
    let draws = 0;
    ctx.clearRect = function (...args) { draws++; original.apply(this, args); };
    await new Promise(resolve => setTimeout(resolve, 350));
    ctx.clearRect = original;
    return draws;
  });
  // Raster quantization can look settled while the softer, subpixel wake is still decaying.
  await expect.poll(idleDraws).toBe(0);
});
test('фон переключается в настройках и сохраняется после перезагрузки', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: /^Оформление/ }).click();
  const background = page.locator('[data-app-background]');
  await expect(page.getByRole('button', { name: 'Фон: Пиксели', exact: true })).toHaveCount(0);
  for (const [name, variant] of [['Крестики', 'crosses'], ['Графит', 'none'], ['Точки', 'dots']]) {
    const button = page.getByRole('button', { name: `Фон: ${name}`, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(background).toHaveAttribute('data-app-background', variant);
  }
  await page.getByRole('button', { name: 'Реакция фона на курсор', exact: true }).click();
  await expect(background).toHaveAttribute('data-background-motion', 'static');
  await page.getByRole('combobox', { name: 'Контраст фона', exact: true }).click();
  await page.getByRole('option', { name: 'Контраст: выраженный', exact: true }).click();
  await expect.poll(() => page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!).contrast, key)).toBe('clear');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Фон: Точки', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Реакция фона на курсор', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(background).toHaveAttribute('data-background-motion', 'static');
  await expect(page.getByRole('combobox', { name: 'Контраст фона', exact: true })).toContainText('выраженный');
  await page.goto('/calculator');
  await expect(background).toHaveAttribute('data-app-background', 'dots');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('выбор фона синхронизируется между вкладками', async ({ page, context }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: /^Оформление/ }).click();
  const second = await context.newPage();
  await second.goto('/calculator');
  await expect(second.locator('[data-app-background]')).toHaveAttribute('data-app-background', 'dots');
  await page.getByRole('button', { name: 'Фон: Крестики', exact: true }).click();
  await expect(second.locator('[data-app-background]')).toHaveAttribute('data-app-background', 'crosses');
  await second.close();
});

test('фон учитывает указатель и уменьшение движения', async ({ page }, testInfo) => {
  await page.goto('/');
  const background = page.locator('[data-app-background]');
  await expect(background).toHaveAttribute('data-app-background', 'dots');
  const canvas = background.locator('canvas');
  const energy = () => canvas.evaluate((node: HTMLCanvasElement) => {
    const data = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data;
    let total = 0;
    for (let i = 3; i < data.length; i += 4) total += data[i];
    return total;
  });
  await expect.poll(energy).toBeGreaterThan(0);
  const resting = await energy();
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(background).toHaveAttribute('data-background-motion', 'interactive');
    await page.mouse.move(160, 200);
    await expect.poll(energy).toBeGreaterThan(resting * 1.15);
  } else {
    await expect(background).toHaveAttribute('data-background-motion', 'static');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(background).toHaveAttribute('data-background-motion', 'static');
  await expect.poll(energy).toBe(resting);
  await page.mouse.move(250, 250);
  await page.mouse.click(250, 250);
  expect(await energy()).toBe(resting);
});

test('повреждённые настройки фона не ломают страницу', async ({ page }) => {
  await page.addInitScript(storageKey => localStorage.setItem(storageKey, '{broken'), key);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/settings');
  await expect(page.locator('[data-app-background]')).toHaveAttribute('data-app-background', 'dots');
  await expect(page.getByRole('main')).toBeVisible();
  expect(errors).toEqual([]);
});

test('сохранённые пиксели заменяются точками', async ({ page }) => {
  await page.addInitScript(storageKey => localStorage.setItem(storageKey, JSON.stringify({
    variant: 'pixels', contrast: 'quiet', interactive: false,
  })), key);
  await page.goto('/settings?section=appearance');
  await expect(page.locator('[data-app-background]')).toHaveAttribute('data-app-background', 'dots');
  await expect(page.getByRole('combobox', { name: 'Контраст фона' })).toContainText('мягкий');
});

test('крестики вращаются без подсветки и не стягиваются при клике', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'На сенсорных устройствах фон статичен');
  await page.addInitScript(storageKey => localStorage.setItem(storageKey, JSON.stringify({
    variant: 'crosses', contrast: 'clear', interactive: true,
  })), key);
  await page.goto('/');
  await expect(page.locator('[data-app-background]')).toHaveAttribute('data-background-motion', 'interactive');
  const canvas = page.locator('[data-app-background] canvas');
  const raster = () => canvas.evaluate((node: HTMLCanvasElement) => {
    const ratio = node.width / node.clientWidth;
    const data = node.getContext('2d')!.getImageData(0, 0, Math.round(350 * ratio), Math.round(390 * ratio)).data;
    let alpha = 0;
    for (let i = 3; i < data.length; i += 4) alpha += data[i];
    // The resting mark nearest (200, 200) is to the right of the pointer at (160, 200).
    const offsetX = (node.clientWidth - Math.ceil(node.clientWidth / 26) * 26) / 2;
    const offsetY = (node.clientHeight - Math.ceil(node.clientHeight / 26) * 26) / 2;
    const markX = offsetX + Math.round((200 - offsetX) / 26) * 26;
    const markY = offsetY + Math.round((200 - offsetY) / 26) * 26;
    const side = Math.round(20 * ratio);
    const cell = node.getContext('2d')!.getImageData(Math.round((markX - 10) * ratio), Math.round((markY - 10) * ratio), side, side).data;
    let mass = 0;
    let moment = 0;
    for (let i = 3; i < cell.length; i += 4) { mass += cell[i]; moment += ((i - 3) / 4 % side) * cell[i]; }
    return { image: node.toDataURL(), alpha, centerX: moment / mass / ratio };
  });
  await expect.poll(async () => (await raster()).alpha).toBeGreaterThan(0);
  const resting = await raster();
  await page.mouse.move(160, 200);
  await page.waitForTimeout(2000);
  const hovered = await raster();
  expect(hovered.image).not.toBe(resting.image);
  expect(hovered.alpha / resting.alpha).toBeGreaterThan(0.95);
  expect(hovered.alpha / resting.alpha).toBeLessThan(1.05);
  expect(hovered.centerX).toBeLessThan(resting.centerX - 0.3);
  await page.mouse.click(160, 200);
  await page.waitForTimeout(650);
  expect((await raster()).image).toBe(hovered.image);
  await page.mouse.move(-1, -1);
  await expect.poll(async () => (await raster()).image).toBe(resting.image);
});

test('движение мыши оставляет на точках локальный затухающий след', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'На сенсорных устройствах фон статичен');
  await page.goto('/');
  await expect(page.locator('[data-app-background]')).toHaveAttribute('data-background-motion', 'interactive');
  const energy = () => page.locator('[data-app-background] canvas').evaluate((node: HTMLCanvasElement) => {
    const ratio = node.width / node.clientWidth;
    const data = node.getContext('2d')!.getImageData(Math.round(110 * ratio), Math.round(160 * ratio), Math.round(80 * ratio), Math.round(80 * ratio)).data;
    let total = 0;
    for (let i = 3; i < data.length; i += 4) total += data[i];
    return total;
  });
  await expect.poll(energy).toBeGreaterThan(0);
  const resting = await energy();
  await page.mouse.move(150, 200);
  await page.waitForTimeout(1000);
  await page.mouse.move(550, 200, { steps: 20 });
  await page.waitForTimeout(450);
  // The pointer is far outside this cell: a follower disc alone cannot pass this check.
  expect(await energy()).toBeGreaterThan(resting * 1.025);
  await expect.poll(energy).toBe(resting);
});

test('выбор фона работает при недоступном localStorage', async ({ page }) => {
  await page.addInitScript(storageKey => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === storageKey) throw new DOMException('Storage disabled', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, key);
  await page.goto('/settings');
  await page.getByRole('button', { name: /^Оформление/ }).click();
  await page.getByRole('button', { name: 'Фон: Крестики', exact: true }).click();
  await expect(page.locator('[data-app-background]')).toHaveAttribute('data-app-background', 'crosses');
  await expect(page.getByText('Браузер запретил сохранение.', { exact: false })).toBeVisible();
});
