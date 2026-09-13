import { expect, test } from '@playwright/test';

test('профиль открывается из хаба и рабочих разделов', async ({ page }) => {
  for (const route of ['/', '/orders']) {
    await page.goto(route);
    await page.getByRole('link', { name: 'Открыть профиль' }).click();
    await expect(page).toHaveURL('/settings?section=profile');
    const badge = page.getByRole('article', { name: 'Бейдж профиля' });
    await expect(badge.getByText('Kumo', { exact: true })).toBeVisible();
    await expect(badge.getByText('dev@3dlabs.pro', { exact: true })).toBeVisible();
    await expect(badge.getByText('Администратор', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Открыть профиль' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: /Заказы/ })).not.toHaveAttribute('aria-current', 'page');
  }
});

test('страница профиля сохраняет меню и открывает редактирование', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('article', { name: 'Бейдж профиля' })).toBeVisible();
  await page.getByRole('button', { name: 'Меню пользователя' }).click();
  await expect(page.getByRole('link', { name: 'Настройки мастерской' })).toBeVisible();
  await page.getByRole('button', { name: 'Меню пользователя' }).press('Escape');
  await expect(page.getByRole('link', { name: 'Настройки мастерской' })).toHaveCount(0);
  await page.getByRole('button', { name: /Редактировать профиль/ }).click();
  await expect(page.getByPlaceholder('Ваше имя')).toBeVisible();
  await expect(page.getByPlaceholder('Ваше имя')).toHaveValue('Kumo');
  await page.getByRole('button', { name: 'Закрыть окно' }).click();
  await expect(page.getByPlaceholder('Ваше имя')).toHaveCount(0);
});

test('бейдж плавно наклоняется и возвращается после ухода курсора', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Наклон включён только для мыши');
  await page.goto('/profile');
  await expect(page.locator('[data-transition-phase]')).toHaveAttribute('data-transition-phase', 'idle');
  await expect(page.getByRole('article', { name: 'Бейдж профиля' })).toBeVisible();
  const scene = page.getByTestId('badge-scene');
  const rig = page.getByTestId('badge-rig');
  await scene.scrollIntoViewIfNeeded();
  const box = await scene.boundingBox();
  if (!box) throw new Error('Badge scene is missing');
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.6);
  await expect.poll(() => rig.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
  await page.mouse.move(5, 5);
  await expect.poll(() => rig.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
});

test('уменьшенное движение отключает наклон', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/profile');
  await page.getByTestId('badge-scene').hover({ position: { x: 20, y: 240 } });
  await expect(page.getByTestId('badge-rig')).toHaveCSS('transform', 'none');
});

test('бейдж помещается на узком экране и не перехватывает касания', async ({ page, isMobile }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/profile');
  const badge = page.getByRole('article', { name: 'Бейдж профиля' });
  await expect(badge).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  if (isMobile) {
    await badge.tap();
    await expect(page.getByTestId('badge-rig')).toHaveCSS('transform', 'none');
  }
});

test('профиль недоступен без сессии', async ({ page }) => {
  await page.context().clearCookies();
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/profile');
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('article', { name: 'Бейдж профиля' })).toHaveCount(0);
});
