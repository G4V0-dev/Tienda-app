import { expect, test, type Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin-e2e@example.com';
const ADMIN_PASSWORD = 'secreto123';

async function signInAsAdmin(page: Page) {
  await page.goto('/');
  await expect(page.locator('#auth-view')).toBeVisible();

  await page.fill('#auth-name', 'Admin E2E');
  await page.fill('#auth-email', ADMIN_EMAIL);
  await page.fill('#auth-password', ADMIN_PASSWORD);
  await page.click('#register-btn');

  const registered = await expect(page.locator('#shop-view'))
    .toBeVisible({ timeout: 6_000 })
    .then(() => true)
    .catch(() => false);

  if (!registered) {
    await page.click('#auth-form button[type="submit"]');
    await expect(page.locator('#shop-view')).toBeVisible();
  }

  await expect(page.locator('#admin-btn')).toBeVisible();
}

test('panel de administración: crear, ajustar stock y eliminar producto', async ({
  page
}) => {
  page.on('dialog', (dialog) => dialog.accept());

  await signInAsAdmin(page);
  await page.click('#admin-btn');

  await expect(page.locator('#admin-view')).toBeVisible();
  const initialCount = await page.locator('#admin-products .admin-product').count();
  expect(initialCount).toBeGreaterThanOrEqual(6);

  const name = `Producto E2E ${Date.now()}`;

  await page.fill('#p-name', name);
  await page.fill('#p-description', 'Creado desde el panel de administración.');
  await page.fill('#p-price', '12000');
  await page.fill('#p-stock', '4');
  await page.fill('#p-color', '#334455');
  await page.click('#product-form button[type="submit"]');

  await expect(page.locator('#admin-msg')).toContainText('creado');
  const card = page
    .locator('#admin-products .admin-product')
    .filter({ hasText: name });
  await expect(card).toHaveCount(1);
  await expect(card.locator('.badge')).toHaveText('Activo');

  await page.click('#admin-back');
  await expect(page.locator('#shop-view')).toBeVisible();

  const publicProduct = page
    .locator('#products .product')
    .filter({ hasText: name });
  await expect(publicProduct).toContainText('4 disponibles');
  await expect(publicProduct.locator('[data-add]')).toBeEnabled();

  await page.click('#admin-btn');
  await expect(card).toHaveCount(1);

  await card.locator('[data-field="stock"]').fill('1');
  await card.locator('[data-save]').click();
  await expect(page.locator('#admin-msg')).toContainText('actualizado');

  await page.click('#admin-back');
  await expect(publicProduct).toContainText('1 disponibles');

  await page.click('#admin-btn');
  await card.locator('[data-toggle]').click();
  await expect(page.locator('#admin-msg')).toContainText('eliminado');
  await expect(card.locator('.badge')).toHaveText('Inactivo');

  await page.click('#admin-back');
  await expect(publicProduct).toHaveCount(0);

  await page.click('#admin-btn');
  await card.locator('[data-toggle]').click();
  await expect(page.locator('#admin-msg')).toContainText('reactivado');
  await expect(card.locator('.badge')).toHaveText('Activo');

  await page.click('#admin-back');
  await expect(publicProduct).toHaveCount(1);
  await expect(publicProduct).toContainText('1 disponibles');

  await page.click('#admin-btn');
  await card.locator('[data-toggle]').click();
  await expect(card.locator('.badge')).toHaveText('Inactivo');
});

test('un usuario normal no ve el panel de administración', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#auth-view')).toBeVisible();

  await page.fill('#auth-name', 'Cliente E2E');
  await page.fill('#auth-email', `cliente-admin-${Date.now()}@example.com`);
  await page.fill('#auth-password', ADMIN_PASSWORD);
  await page.click('#register-btn');

  await expect(page.locator('#shop-view')).toBeVisible();
  await expect(page.locator('#admin-btn')).toHaveCount(0);
});
