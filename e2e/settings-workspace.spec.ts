import { expect, test } from '@playwright/test';

test('единые настройки разделяют профиль, оформление и мастерскую', async ({ page }) => {
  await page.goto('/settings?section=profile');
  await expect(page.getByRole('article', { name: 'Бейдж профиля' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Разделы настроек' });
  await expect(nav.getByRole('button')).toHaveCount(8);
  await nav.getByRole('button', { name: /Оформление/ }).click();
  await expect(page).toHaveURL('/settings?section=appearance');
  await expect(page.getByRole('heading', { name: 'Поверхность рабочего пространства' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Бейдж профиля' })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('article', { name: 'Бейдж профиля' })).toBeVisible();
  await page.reload();
  await expect(nav.getByRole('button', { name: /Профиль/ })).toHaveAttribute('aria-current', 'page');
});

test('черновик мастерской сохраняется при переключении на профиль', async ({ page }) => {
  await page.goto('/settings?section=general');
  await expect(page.locator('[data-transition-phase]')).toHaveAttribute('data-transition-phase', 'idle');
  const nav = page.getByRole('navigation', { name: 'Разделы настроек' });
  const currency = page.getByPlaceholder('₽', { exact: true });
  await currency.fill('TEST');
  await nav.getByRole('button', { name: /Профиль/ }).click();
  await expect(page.getByRole('article', { name: 'Бейдж профиля' })).toBeVisible();
  await nav.getByRole('button', { name: /Основные/ }).click();
  await expect(currency).toHaveValue('TEST');
  await expect(nav.getByRole('button', { name: /Основные/ })).toContainText('1 изменение');
  await page.getByRole('link', { name: /Заказы/ }).click();
  await expect(page.getByRole('dialog', { name: /Несохраненные изменения/ })).toBeVisible();
  await page.getByRole('button', { name: /Не сохранять/ }).click();
  await expect(page).toHaveURL('/orders');
});
