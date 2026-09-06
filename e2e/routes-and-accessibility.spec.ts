import { expect, test } from '@playwright/test';

const protectedRoutes = [
  '/',
  '/calculator',
  '/orders',
  '/products',
  '/filaments',
  '/printers',
  '/stats',
  '/settings',
  '/admin',
] as const;

test.describe('маршруты приложения', () => {
  for (const path of protectedRoutes) {
    test(`${path} открывается с development-сессией`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      const response = await page.goto(path);
      expect(response?.ok(), `GET ${path} must succeed`).toBeTruthy();
      await expect(page).toHaveURL(path);
      if (path === '/') {
        await expect(page.getByText('OPERATIONS HUB', { exact: false })).toBeVisible();
      } else {
        await expect(page.getByRole('main')).toBeVisible();
      }
      await expect(page.locator('[data-nextjs-dialog], nextjs-portal [role="dialog"]')).toHaveCount(0);
      expect(pageErrors, `page errors on ${path}`).toEqual([]);
    });
  }

  test('публичные маршруты и отсутствующий маршрут имеют доступные поверхности', async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => window.localStorage.clear());

    const aboutErrors: string[] = [];
    page.on('pageerror', (error) => aboutErrors.push(error.message));
    const aboutResponse = await page.goto('/about');
    expect(aboutResponse?.ok(), 'GET /about must succeed for a guest').toBeTruthy();
    await expect(page).toHaveURL('/about');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[data-nextjs-dialog], nextjs-portal [role="dialog"]')).toHaveCount(0);
    expect(aboutErrors, 'guest /about page errors').toEqual([]);

  });

  test('неизвестный маршрут показывает устойчивую 404-поверхность в авторизованной сессии', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const missingResponse = await page.goto('/missing-workspace');
    expect(missingResponse?.status(), 'missing route must return 404').toBe(404);
    await expect(page.getByRole('heading', { name: 'Запрошенная рабочая область отсутствует' })).toBeVisible();
    await expect(page.getByRole('link', { name: /к заказам/i })).toBeVisible();
    await expect(page.locator('[data-nextjs-dialog], nextjs-portal [role="dialog"]')).toHaveCount(0);
    expect(pageErrors, 'page errors on missing route').toEqual([]);
  });
});

test.describe('доступность входа', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('форма входа и регистрации содержит именованные поля', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('Электронная почта')).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByLabel('Пароль доступа')).toHaveAttribute('name', 'password');
    await expect(page.getByRole('button', { name: 'Показать пароль' })).toBeVisible();

    await page.getByRole('button', { name: /регистрация/i }).click();
    await expect(page.getByLabel('Имя или название студии')).toHaveAttribute('name', 'name');
    await expect(page.getByLabel('Рабочая почта')).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByLabel(/Ключ доступа \(Invite Key\)/)).toHaveAttribute('name', 'registration_key');
    await expect(page.getByRole('button', { name: 'Показать пароль регистрации' })).toBeVisible();
  });
});

test('панель фильтров заказов не вызывает горизонтальную прокрутку на 1000px', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto('/orders');
  await expect(page.getByRole('radiogroup', { name: 'Фильтр заказов' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('фильтр оплаты поддерживает клавиатурный listbox-контракт', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('3d_calc_orders', JSON.stringify([{
      id: '00000000-0000-4000-8000-000000000004',
      order_number: 1004,
      created_at: '2026-09-06T10:00:00.000Z',
      date: '06.09.2026',
      type: 'income',
      title: 'Заказ для проверки табуляции',
      quantity: 1,
      amount: 1000,
      cost: 500,
      payment: 0,
      client: 'Другое',
      contact: '',
      contacts: [],
      deadline: '07.09.2026',
      status: 'В РАБОТЕ',
      notes: '',
    }]));
  });
  await page.goto('/orders');
  const trigger = page.getByRole('combobox', { name: 'Фильтр оплаты' });

  await trigger.focus();
  await trigger.press('ArrowDown');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  const listboxId = await trigger.getAttribute('aria-controls');
  expect(listboxId).toBeTruthy();
  const listbox = page.locator(`[id="${listboxId}"]`);
  await expect(listbox).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-activedescendant', /option-/);

  await trigger.press('Home');
  await trigger.press('End');
  await trigger.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toContainText('Не оплачено');

  await trigger.press('ArrowDown');
  await trigger.press('Escape');
  await expect(listbox).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.press('ArrowDown');
  await trigger.press('Tab');
  await expect(listbox).toBeHidden();
  const nextControl = (page.viewportSize()?.width ?? 0) < 1024
    ? page.getByRole('button', { name: 'Открыть детали Заказ для проверки табуляции' })
    : page.locator('button[title="Клик для выбора даты заказа в календаре"]').first();
  await expect(nextControl).toBeFocused();
});

test('модалка контактов остаётся в границах мобильного экрана и показывает portal-меню', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('3d_calc_orders', JSON.stringify([{
      id: '00000000-0000-4000-8000-000000000001',
      order_number: 1001,
      created_at: '2026-09-06T10:00:00.000Z',
      date: '06.09.2026',
      type: 'income',
      title: 'Мобильный заказ',
      quantity: 1,
      amount: 1000,
      cost: 500,
      payment: 0,
      client: 'Другое',
      contact: '+7 999 111-22-33',
      contacts: [{ type: 'phone', value: '+7 999 111-22-33' }],
      deadline: '07.09.2026',
      status: 'В РАБОТЕ',
      notes: '',
    }]));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/orders');
  await expect(page.getByText('Мобильный заказ').first()).toBeVisible();
  await page.locator('button[title="Клик для изменения контактов"]:visible').click();

  const dialog = page.getByRole('dialog', { name: 'Контакты клиента' });
  await expect(dialog).toBeVisible();
  const contactType = page.getByRole('button', { name: 'Тип контакта 1' });
  await contactType.click();
  const listbox = page.getByRole('listbox', { name: 'Тип контакта 1: варианты' });
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole('textbox')).toHaveCount(0);
  await expect.poll(() => listbox.getByRole('option').evaluateAll((options) => options.every((option) => (option as HTMLElement).tabIndex === -1))).toBe(true);

  const search = page.getByRole('combobox', { name: 'Поиск в списке: Тип контакта 1' });
  const contactListboxId = await contactType.getAttribute('aria-controls');
  expect(contactListboxId).toBeTruthy();
  if (!contactListboxId) throw new Error('Контактный список не связан с триггером.');
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await expect(search).toHaveAttribute('aria-controls', contactListboxId);
  await search.fill('Tele');
  await search.press('Home');
  await search.press('ArrowDown');
  await expect(search).toHaveAttribute('aria-activedescendant', /option-/);
  await search.press('Enter');
  await expect(listbox).toBeHidden();
  await expect(contactType).toContainText('Telegram');

  await contactType.click();
  await page.getByRole('combobox', { name: 'Поиск в списке: Тип контакта 1' }).press('Escape');
  await expect(listbox).toBeHidden();
  await contactType.click();
  const tabbedSearch = page.getByRole('combobox', { name: 'Поиск в списке: Тип контакта 1' });
  await tabbedSearch.press('Tab');
  await expect(listbox).toBeHidden();
  await expect(dialog.getByLabel('Значение контакта 1')).toBeFocused();
  await contactType.click();
  await page.getByRole('combobox', { name: 'Поиск в списке: Тип контакта 1' }).press('Shift+Tab');
  await expect(listbox).toBeHidden();
  await expect(contactType).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect.poll(() => dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('мобильная карточка без клиента и контакта открывает добавление первого контакта', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('3d_calc_orders', JSON.stringify([{
      id: '00000000-0000-4000-8000-000000000002',
      order_number: 1002,
      created_at: '2026-09-06T10:00:00.000Z',
      date: '06.09.2026',
      type: 'income',
      title: 'Заказ без контакта',
      quantity: 1,
      amount: 1000,
      cost: 500,
      payment: 0,
      client: 'Другое',
      client_name: '',
      contact: '',
      contacts: [],
      deadline: '07.09.2026',
      status: 'В РАБОТЕ',
      notes: '',
    }]));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/orders');

  const card = page.getByRole('article').filter({ hasText: 'Заказ без контакта' });
  await expect(card).toBeVisible();
  await expect(card.locator('[role="button"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Добавить контакт для Заказ без контакта' }).click();
  const dialog = page.getByRole('dialog', { name: 'Контакты клиента' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Значение контакта 1')).toBeVisible();
});

test('мобильная карточка не подменяет пустое имя клиента legacy-контактом', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('3d_calc_orders', JSON.stringify([{
      id: '00000000-0000-4000-8000-000000000003',
      order_number: 1003,
      created_at: '2026-09-06T10:00:00.000Z',
      date: '06.09.2026',
      type: 'income',
      title: 'Заказ с legacy-контактом',
      quantity: 1,
      amount: 1000,
      cost: 500,
      payment: 0,
      client: 'Другое',
      client_name: '',
      contact: '@legacy_contact',
      contacts: [],
      deadline: '07.09.2026',
      status: 'В РАБОТЕ',
      notes: '',
    }]));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/orders');

  const card = page.getByRole('article').filter({ hasText: 'Заказ с legacy-контактом' });
  await expect(card).toContainText('Частный заказчик');
  await expect(card.getByText('@legacy_contact', { exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Изменить контакты клиента для Заказ с legacy-контактом' })).toBeVisible();
});
