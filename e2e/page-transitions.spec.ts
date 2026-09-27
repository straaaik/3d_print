import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
  await expect(page.locator('[data-transition-id]')).not.toHaveAttribute('data-transition-id', '0');
  await expect(page.locator('[data-transition-phase]')).toHaveAttribute('data-transition-phase', 'idle');
  await expect(page.getByTestId('page-loading-overlay')).toHaveCount(0);
  await expect(page.getByTestId('page-transition-content')).not.toHaveAttribute('inert', '');
}

test('рабочие вкладки сохраняют оболочку и добавляют одну запись истории', async ({ page }) => {
  await page.goto('/orders');
  await ready(page);
  await page.locator('header').evaluate(node => node.setAttribute('data-original-navbar', 'true'));
  const history = await page.evaluate(() => window.history.length);
  await page.getByRole('link', { name: /Калькулятор/ }).click();
  await expect(page).toHaveURL('/calculator');
  await ready(page);
  await expect(page.locator('[data-cockpit-panel]')).toHaveAttribute('data-cockpit-panel', 'calculator');
  await expect(page.locator('[data-original-navbar]')).toHaveCount(1);
  expect(await page.evaluate(() => window.history.length)).toBe(history + 1);
  await page.goBack();
  await expect(page).toHaveURL('/orders');
  await ready(page);
  await expect(page.locator('[data-cockpit-panel]')).toHaveAttribute('data-cockpit-panel', 'orders');
  await page.goForward();
  await ready(page);
  await expect(page.locator('[data-cockpit-panel]')).toHaveAttribute('data-cockpit-panel', 'calculator');
});

test('медленный модуль удерживает незаполненный LOADING и скрывает промежуточный контент', async ({ page }) => {
  let hold = false;
  let blocked = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/_next/static/**/*.js', async route => {
    if (hold) { blocked += 1; await gate; }
    await route.continue();
  });
  await page.goto('/settings');
  await ready(page);
  hold = true;
  try {
    await page.getByRole('link', { name: /Статистика/ }).click();
    await expect.poll(() => blocked).toBeGreaterThan(0);
    const progress = page.getByRole('progressbar', { name: 'Подготовка страницы' });
    await expect(progress).toBeVisible();
    expect(Number(await progress.getAttribute('aria-valuenow'))).toBeLessThan(100);
    await expect(page.getByTestId('page-transition-content')).toHaveAttribute('inert', '');
    await expect(page.getByTestId('page-transition-content')).toHaveCSS('opacity', '0');
    const before = await progress.getAttribute('aria-valuenow');
    // A bounded observation interval proves time alone cannot complete the scale.
    await page.waitForTimeout(350);
    expect(Number(await progress.getAttribute('aria-valuenow'))).toBeLessThan(100);
    expect(Number(before)).toBeLessThan(100);
  } finally { hold = false; release(); }
  await expect(page).toHaveURL('/stats');
  await ready(page);
  await expect(page.locator('[data-page-pending]')).toHaveCount(0);
});

test('полное заполнение сразу переходит в плавное раскрытие', async ({ page }) => {
  await page.goto('/orders');
  await ready(page);
  await page.evaluate(() => {
    const frames: Array<{ phase: string; opacity: number; filled: boolean; time: number }> = [];
    (window as unknown as { transitionFrames: typeof frames }).transitionFrames = frames;
    const sample = () => {
      const root = document.querySelector('[data-transition-phase]');
      const overlay = document.querySelector<HTMLElement>('[data-testid="page-loading-overlay"]');
      const fill = overlay?.querySelector<HTMLElement>('span[style*="clip-path"]');
      const clip = fill ? getComputedStyle(fill).clipPath : '';
      frames.push({ phase: root?.getAttribute('data-transition-phase') ?? '', opacity: overlay ? Number(getComputedStyle(overlay).opacity) : 0,
        filled: clip === 'inset(0%)' || clip === 'inset(0% 0% 0% 0%)', time: performance.now() });
      if (frames.length < 180 && !(frames.length > 5 && frames.some(frame => frame.phase === 'revealing') && root?.getAttribute('data-transition-phase') === 'idle')) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByRole('link', { name: /Калькулятор/ }).click();
  await expect(page).toHaveURL('/calculator');
  await ready(page);
  const frames = await page.evaluate(() => (window as unknown as { transitionFrames: Array<{ phase: string; opacity: number; filled: boolean; time: number }> }).transitionFrames);
  expect(frames.some(frame => frame.phase === 'finishing')).toBe(true);
  expect(frames.some(frame => frame.phase === 'revealing' && frame.opacity > 0 && frame.opacity < 1)).toBe(true);
  const full = frames.find(frame => frame.filled && frame.opacity > 0);
  expect(full).toBeTruthy();
  const fading = frames.find(frame => frame.time >= full!.time && frame.opacity < 0.999);
  expect(fading).toBeTruthy();
  expect(fading!.time - full!.time).toBeLessThan(100);
});

test('отмена ухода с черновиком не запускает заставку', async ({ page }) => {
  await page.goto('/settings?section=general');
  await ready(page);
  await page.getByPlaceholder('₽', { exact: true }).fill('DRAFT');
  const id = await page.locator('[data-transition-id]').getAttribute('data-transition-id');
  await page.getByRole('link', { name: /Заказы/ }).click();
  const dialog = page.getByRole('dialog', { name: /Несохраненные изменения/ });
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('page-loading-overlay')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Закрыть окно', exact: true }).click();
  await expect(page).toHaveURL('/settings?section=general');
  await expect(page.locator('[data-transition-id]')).toHaveAttribute('data-transition-id', id!);
  await expect(page.getByPlaceholder('₽', { exact: true })).toHaveValue('DRAFT');
  await page.getByRole('link', { name: /Заказы/ }).click();
  await dialog.getByRole('button', { name: /Не сохранять/ }).click();
  await expect(page).toHaveURL('/orders');
  await ready(page);
});

test('query и повторная ссылка не создают отдельную загрузку страницы', async ({ page }) => {
  await page.goto('/settings?section=profile');
  await ready(page);
  const id = await page.locator('[data-transition-id]').getAttribute('data-transition-id');
  await page.getByRole('navigation', { name: 'Разделы настроек' }).getByRole('button', { name: /Оформление/ }).click();
  await expect(page).toHaveURL('/settings?section=appearance');
  await expect(page.locator('[data-transition-id]')).toHaveAttribute('data-transition-id', id!);
  await expect(page.getByTestId('page-loading-overlay')).toHaveCount(0);
});

test('уменьшенное движение завершает переход и возвращает фокус', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/orders');
  await ready(page);
  await page.getByRole('link', { name: /Калькулятор/ }).click();
  await expect(page).toHaveURL('/calculator');
  await ready(page);
  await expect(page.getByRole('main')).toBeFocused();
});

test('повреждённые картинки и 404 не оставляют вечную заставку', async ({ page }) => {
  await page.route('**/_next/image?**', route => route.abort());
  await page.route('**/images/hub/**', route => route.abort());
  await page.goto('/');
  await ready(page);
  await expect(page.getByText('OPERATIONS HUB')).toBeVisible();
  await page.goto('/missing-loading-test');
  await ready(page);
  await expect(page.getByRole('heading', { name: 'Запрошенная рабочая область отсутствует' })).toBeVisible();
});

test('раскрытая страница сохраняет геометрию и не выходит за экран', async ({ page }) => {
  await page.goto('/orders');
  await ready(page);
  await page.getByRole('link', { name: /Калькулятор/ }).click();
  await expect(page).toHaveURL('/calculator');
  await ready(page);
  const before = await page.locator('header').boundingBox();
  await page.waitForTimeout(350);
  const after = await page.locator('header').boundingBox();
  expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('переход на главный хаб использует PixelCurtain вместо LOADING заставки', async ({ page }) => {
  await page.goto('/calculator');
  await ready(page);

  // Нажимаем на красную кнопку терминала для возврата на главный хаб
  const closeButton = page.locator('button.bg-red-500\\/80');
  await closeButton.click();

  // Должен появиться PixelCurtain
  await expect(page.getByTestId('pixel-curtain')).toBeVisible();

  // При этом заставка LOADING не должна появляться вовсе
  await expect(page.getByTestId('page-loading-overlay')).toHaveCount(0);

  // URL должен измениться на главный хаб
  await expect(page).toHaveURL('/');
  await ready(page);
  await expect(page.getByText('OPERATIONS HUB')).toBeVisible();
  await expect(page.getByTestId('pixel-curtain')).toHaveCount(0);
});

test('переход с главного хаба в рабочую область использует PixelCurtain', async ({ page }) => {
  await page.goto('/');
  await ready(page);

  // Кликаем по карточке перехода в калькулятор
  await page.locator('a[href="/calculator"]').click();

  // Должен появиться PixelCurtain
  await expect(page.getByTestId('pixel-curtain')).toBeVisible();

  // При этом заставка LOADING не должна появляться
  await expect(page.getByTestId('page-loading-overlay')).toHaveCount(0);

  // Завершение перехода на /calculator
  await expect(page).toHaveURL('/calculator');
  await ready(page);
  await expect(page.locator('[data-cockpit-panel]')).toHaveAttribute('data-cockpit-panel', 'calculator');
  await expect(page.getByTestId('pixel-curtain')).toHaveCount(0);
});

test('переход между рабочими вкладками выполняет анимацию LOADING внутри блока без склейки окна', async ({ page }) => {
  await page.goto('/calculator');
  await ready(page);

  // Отслеживаем состояние оболочки во время перехода
  await page.evaluate(() => {
    const frames: Array<{ phase: string; opacity: number; inBlock: boolean; contentOpacity: number }> = [];
    (window as unknown as { inBlockFrames: typeof frames }).inBlockFrames = frames;
    const sample = () => {
      const root = document.querySelector('[data-transition-phase]');
      const overlay = document.querySelector<HTMLElement>('[data-testid="page-loading-overlay"]');
      const content = document.querySelector<HTMLElement>('[data-testid="page-transition-content"]');
      const panel = document.querySelector('[data-cockpit-panel]');
      frames.push({
        phase: root?.getAttribute('data-transition-phase') ?? '',
        opacity: overlay ? Number(getComputedStyle(overlay).opacity) : 0,
        inBlock: Boolean(overlay && panel && panel.contains(overlay)),
        contentOpacity: content ? Number(getComputedStyle(content).opacity) : 1,
      });
      if (frames.length < 180 && !(frames.length > 5 && frames.some(frame => frame.phase === 'revealing') && root?.getAttribute('data-transition-phase') === 'idle')) {
        requestAnimationFrame(sample);
      }
    };
    requestAnimationFrame(sample);
  });

  // Задержка модуля stats для снимка экрана в момент перехода
  let hold = true;
  await page.route('**/_next/static/**', async (route) => {
    if (hold && route.request().url().includes('stats')) {
      await new Promise(r => setTimeout(r, 600));
    }
    await route.continue();
  });

  await page.getByRole('link', { name: /Статистика/ }).click();
  const overlay = page.locator('[data-testid="page-loading-overlay"]');
  await expect(overlay).toBeVisible();
  await page.screenshot({ path: 'C:/Users/Igor/.gemini/antigravity/brain/d4405342-303e-4b7a-89df-2b638c717f62/scratch/in_block_transition.png' });
  hold = false;

  await expect(page).toHaveURL('/stats');
  await ready(page);

  const frames = await page.evaluate(() => (window as unknown as { inBlockFrames: Array<{ phase: string; opacity: number; inBlock: boolean; contentOpacity: number }> }).inBlockFrames);
  const activeFrames = frames.filter(f => f.phase !== 'idle' && f.opacity > 0);
  expect(activeFrames.length).toBeGreaterThan(0);
  expect(activeFrames.every(f => f.inBlock)).toBe(true);
  expect(activeFrames.every(f => f.contentOpacity > 0.9)).toBe(true);
  await expect(page.locator('[data-cockpit-panel]')).toHaveAttribute('data-cockpit-panel', 'stats');
});
