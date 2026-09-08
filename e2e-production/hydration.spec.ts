import { expect, test } from '@playwright/test';

test('production HTML supplies fresh CSP nonces to every executable script', async ({ request }) => {
  const nonces: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await request.get('/login');
    expect(response.ok()).toBe(true);
    const csp = response.headers()['content-security-policy'];
    const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();
    nonces.push(nonce!);
    const scripts = (await response.text()).match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(script, 'SSR and framework scripts must match the response CSP').toContain(`nonce="${nonce}"`);
    }
  }
  expect(nonces[0]).not.toBe(nonces[1]);
});

test('production login hydrates and responds to clicks without blocked scripts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /Content Security Policy|script-src|Refused to (load|execute)/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Вход в систему 3D Labs' })).toBeVisible();
  await page.getByRole('button', { name: /регистрация/i }).click();
  await expect(page.getByLabel('Имя или название студии')).toBeVisible();
  expect(errors).toEqual([]);
});
