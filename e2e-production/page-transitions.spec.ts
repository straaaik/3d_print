import { expect, test } from '@playwright/test';

test('публичный production переход раскрывает готовый вход', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('[data-transition-phase]')).toHaveAttribute('data-transition-phase', 'idle');
  await page.getByRole('link', { name: 'Начать работу с Kumo CRM' }).first().click();
  await expect(page).toHaveURL('/login');
  await expect(page.locator('[data-transition-phase]')).toHaveAttribute('data-transition-phase', 'idle');
  await expect(page.getByTestId('page-loading-overlay')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Вход в систему Kumo CRM' })).toBeVisible();
});
