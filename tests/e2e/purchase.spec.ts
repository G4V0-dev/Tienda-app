import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function register(page: Page, email: string) {
  await page.goto('/');
  await expect(page.locator('#auth-view')).toBeVisible();

  await page.fill('#auth-name', 'Cliente E2E');
  await page.fill('#auth-email', email);
  await page.fill('#auth-password', 'secreto123');
  await page.click('#register-btn');

  await expect(page.locator('#shop-view')).toBeVisible();
}

test('carrito, IVA y factura PDF de punta a punta', async ({ page }) => {
  await register(page, uniqueEmail('e2e-compra'));

  await expect(page.locator('#products .product')).toHaveCount(6);

  await page.click('[data-add="1"]');
  await page.click('[data-add="1"]');
  await page.click('[data-add="1"]');
  await page.click('[data-add="4"]');

  await expect(page.locator('#cart')).toContainText('Camiseta Clásica');
  await expect(page.locator('#cart')).toContainText('Hoodie Urbano');
  await expect(page.locator('#totals')).toContainText(/255\.000/);
  await expect(page.locator('#totals')).toContainText(/48\.450/);
  await expect(page.locator('#totals')).toContainText(/303\.450/);

  await page.reload();
  await expect(page.locator('#cart')).toContainText('Camiseta Clásica');
  await expect(page.locator('#totals')).toContainText(/303\.450/);

  await page.click('#checkout-btn');
  await expect(page.locator('#pay-modal')).toBeVisible();
  await expect(page.locator('#card-number')).toHaveValue('4242 4242 4242 4242');
  await expect(page.locator('#card-expiry')).toHaveValue('12/30');

  await page.click('#pay-btn');

  await expect(page.locator('#success-view')).toBeVisible();
  await expect(page.locator('#success-summary')).toContainText(/303\.450/);
  await expect(page.locator('#success-summary')).toContainText(/\*\*\*\* 4242/);
  await expect(page.locator('#success-summary')).toContainText('Camiseta Clásica x 3');

  const downloadPromise = page.waitForEvent('download');
  await page.click('#download-btn');
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^comprobante-[a-f0-9]{8}\.pdf$/);

  const filePath = test.info().outputPath('comprobante.pdf');
  await download.saveAs(filePath);

  const pdf = fs.readFileSync(filePath);
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(1000);

  await expect(page.locator('#success-msg')).toContainText(
    'Comprobante descargado'
  );

  await page.click('#continue-btn');
  await expect(page.locator('#shop-view')).toBeVisible();
  await expect(page.locator('#cart')).toContainText('Tu carrito está vacío');
});

test('un carrito vacío no permite iniciar el pago', async ({ page }) => {
  await register(page, uniqueEmail('e2e-vacio'));

  await expect(page.locator('#cart')).toContainText('Tu carrito está vacío');
  await expect(page.locator('#checkout-btn')).toBeDisabled();

  const totals = (await page.locator('#totals').innerText()).replace(/\s+/g, ' ');
  expect(totals).toContain('$ 0');
});
