import { expect, test } from '@playwright/test';

const routes = [
  { path: '/', snapshot: 'operations-hub.png', readyText: 'OPERATIONS HUB', imageCount: 6 },
  { path: '/calculator', snapshot: 'calculator.png', readyText: 'КАЛЬКУЛЯТОР' },
  { path: '/orders', snapshot: 'orders.png', readyText: 'ЗАКАЗЫ' },
] as const;

test.describe('визуальная стабильность основных экранов', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/_next/image?**', async (route) => {
      const optimizedUrl = new URL(route.request().url());
      const sourcePath = optimizedUrl.searchParams.get('url');

      if (!sourcePath) {
        await route.continue();
        return;
      }

      await route.continue({ url: new URL(sourcePath, optimizedUrl.origin).toString() });
    });
  });

  for (const route of routes) {
    test(`${route.path} соответствует эталонному дизайну`, async ({ page }) => {
      await page.goto(route.path);

      await expect(page).toHaveURL(route.path);
      await expect(page.getByText(route.readyText, { exact: false }).first()).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      if ('imageCount' in route) {
        await expect(page.locator('img')).toHaveCount(route.imageCount);
      }
      await page.waitForFunction(() =>
        Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
      );

      await expect(page).toHaveScreenshot(route.snapshot, { fullPage: true });
    });
  }
});
