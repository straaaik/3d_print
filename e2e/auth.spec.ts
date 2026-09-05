import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('закрытый экран перенаправляет гостя на вход', async ({ page }) => {
  await page.goto('/orders');

  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: 'Вход в систему 3D Labs' })).toBeVisible();
});
