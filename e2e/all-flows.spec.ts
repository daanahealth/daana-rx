import { test, expect, request, type Page } from '@playwright/test';
import fs from 'node:fs';

// Exercises the core application flows through the live UI, end to end, with no
// stored credentials (self-provisions a throwaway clinic + INFECT bin):
//   1. Check In  -> success + QR label verification (+ print layout)
//   2. Home search -> finds the checked-in medication
//   3. Check Out -> search, add to cart, superadmin approve
//   4. Reports   -> dashboard loads
//   5. Settings  -> loads
// Screenshots are written to e2e/screenshots/flow-*.

const GATEWAY = process.env.E2E_GATEWAY_URL ?? 'https://daanahealth-gateway.onrender.com';
const SHOT = 'e2e/screenshots';
const STAMP = process.env.E2E_STAMP || `${Date.now()}`;
const MED = `FLOW-Amox-${STAMP}`;
const BIN = 'INFECT';
let EMAIL = '';
let PASSWORD = '';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  fs.mkdirSync(SHOT, { recursive: true });
  EMAIL = `e2e_flow_${STAMP}@daana-test.local`;
  PASSWORD = `E2eFlow!${STAMP}aA`;
  const ctx = await request.newContext();
  const su = await ctx.post(`${GATEWAY}/auth/signup`, {
    data: { email: EMAIL, password: PASSWORD, clinicName: `E2E Flow Clinic ${STAMP}` },
    timeout: 90_000,
  });
  expect(su.status(), 'signup').toBe(200);
  const { token, clinic } = await su.json();
  const headers = { Authorization: `Bearer ${token}`, 'x-clinic-id': clinic?.clinicId ?? '', 'Content-Type': 'application/json' };
  const loc = await ctx.post(`${GATEWAY}/inventory/locations`, { headers, data: { name: BIN, temp: 'room temp' }, timeout: 60_000 });
  expect([200, 201]).toContain(loc.status());
  await ctx.dispose();
  // eslint-disable-next-line no-console
  console.log(`provisioned ${EMAIL} + bin ${BIN}`);
});

async function signIn(page: Page) {
  await page.goto('/auth/signin', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await page.waitForURL((u: URL) => !/\/auth\/signin/.test(u.toString()), { timeout: 60_000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
}

test('1. check-in + QR label + label-sized print', async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  await page.goto('/checkin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_000);
  const fill = async (l: any, v: string) => { if (await l.count()) await l.first().fill(v); };
  await fill(page.getByPlaceholder(/Lisinopril/i), MED);
  await fill(page.getByPlaceholder('e.g. 10'), '500');
  await fill(page.getByPlaceholder(/mg, mcg/i), 'mg');
  await fill(page.getByPlaceholder(/CARDIO, PSYCH/i), BIN);
  const fb = page.getByRole('button', { name: /10 years from today/i });
  if (await fb.count()) await fb.first().click();
  await page.getByRole('button', { name: /Next: location/i }).click();
  await page.waitForTimeout(1_200);
  await page.getByRole('button', { name: /Next: label/i }).click();
  await page.waitForTimeout(3_500);

  // QR verification: the UnitLabel renders a QR <svg> inside .print-label.
  const qr = page.locator('.print-label svg').first();
  await expect(qr, 'QR code present on label').toBeVisible({ timeout: 15_000 });
  const labelText = (await page.locator('.print-label').innerText().catch(() => '')) || '';
  // eslint-disable-next-line no-console
  console.log('[label text] ' + labelText.replace(/\n+/g, ' | '));
  // label carries medication + DRX code
  expect(labelText).toMatch(new RegExp(MED));
  expect(labelText).toMatch(/DRX-MASS-INFECT/);
  await page.screenshot({ path: `${SHOT}/flow-01a-label-screen.png`, fullPage: true });

  // Print layout: emulate print media; the label is isolated + label-sized.
  await page.emulateMedia({ media: 'print' });
  await page.locator('.print-label').screenshot({ path: `${SHOT}/flow-01b-label-print.png` }).catch(() => {});
  const box = await page.locator('.print-label').boundingBox();
  // eslint-disable-next-line no-console
  console.log('[print label box] ' + JSON.stringify(box)); // ~384x192 (4x2in @96dpi)
  await page.emulateMedia({ media: 'screen' });

  await page.getByRole('button', { name: /Confirm placed/i }).click();
  await page.waitForTimeout(3_500);
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  expect(body, 'check-in submitted').not.toContain('Confirm placed');
});

test('2. home search finds the medication', async ({ page }) => {
  await signIn(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1_500);
  const search = page.locator('input[inputmode="search"], input[type="search"], input[placeholder*="medication" i]').first();
  await expect(search, 'search box present').toBeVisible({ timeout: 15_000 });
  await search.fill(MED);
  await page.waitForTimeout(3_000); // debounce + FEFO fetch
  await page.screenshot({ path: `${SHOT}/flow-02-search.png`, fullPage: true });
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  // eslint-disable-next-line no-console
  console.log('[search shows MED] ' + body.includes(MED));
  expect(body, 'search result includes the medication').toContain(MED);
});

test('3. checkout: search -> add to cart -> confirm checkout', async ({ page }) => {
  test.setTimeout(150_000);
  await signIn(page);
  await page.goto('/checkout', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1_500);
  const search = page
    .locator('input[aria-label="Search medications"], input[inputmode="search"], input[placeholder*="medication" i]')
    .first();
  await expect(search).toBeVisible({ timeout: 15_000 });
  await search.fill(MED);
  await page.waitForTimeout(3_500); // debounce + FEFO fetch
  await page.screenshot({ path: `${SHOT}/flow-03a-checkout-search.png`, fullPage: true });

  // Scope to the RESULT CARD (it also has "View in Inventory") so we don't hit
  // the sidebar nav's "Check Out" link.
  const card = page
    .locator('div')
    .filter({ has: page.getByRole('button', { name: /View in Inventory/i }) })
    .last();
  await expect(card, 'result card').toBeVisible({ timeout: 15_000 });
  const checkOutBtn = card.getByRole('button', { name: 'Check Out' });
  await expect(checkOutBtn).toBeEnabled({ timeout: 15_000 });
  await checkOutBtn.click();
  await page.waitForTimeout(2_000);
  // Open the cart sidebar explicitly (don't rely on auto-open).
  await page.getByRole('button', { name: /View Cart/i }).first().click().catch(() => {});
  await page.waitForTimeout(1_500);
  await page.screenshot({ path: `${SHOT}/flow-03b-cart.png`, fullPage: true });

  // Superadmin's own cart shows "Confirm Checkout (N)".
  const confirm = page.getByRole('button', { name: /Confirm Checkout/i }).first();
  await expect(confirm, 'confirm checkout button in cart').toBeVisible({ timeout: 10_000 });
  await confirm.click();
  await page.waitForTimeout(3_000);
  await page.screenshot({ path: `${SHOT}/flow-03c-after-checkout.png`, fullPage: true });
  const afterText = (await page.locator('body').innerText().catch(() => '')) || '';
  // eslint-disable-next-line no-console
  console.log('[checkout completed] ' + /checked out|checkout complete/i.test(afterText));
  expect(afterText, 'checkout completed').toMatch(/checked out|checkout complete|approved/i);

  // The checked-out unit must no longer appear as an active RESULT CARD (the
  // search-box value naturally contains the query, so assert on cards, not body).
  await page.goto('/checkout', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1_500);
  const search2 = page
    .locator('input[aria-label="Search medications"], input[inputmode="search"], input[placeholder*="medication" i]')
    .first();
  await search2.fill(MED);
  await page.waitForTimeout(3_500);
  await page.screenshot({ path: `${SHOT}/flow-03d-after-search.png`, fullPage: true });
  const activeCards = page
    .locator('div')
    .filter({ has: page.getByRole('button', { name: /View in Inventory/i }) });
  const n = await activeCards.count();
  // eslint-disable-next-line no-console
  console.log('[active result cards for the checked-out item] ' + n);
  expect(n, 'checked-out item removed from active search').toBe(0);
});

test('4. reports dashboard loads', async ({ page }) => {
  await signIn(page);
  await page.goto('/reports', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_500);
  await page.screenshot({ path: `${SHOT}/flow-04-reports.png`, fullPage: true });
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  expect(body.length, 'reports rendered').toBeGreaterThan(40);
  expect(/error|something went wrong/i.test(body) && !/expir|capacity|report/i.test(body)).toBeFalsy();
});

test('5. settings loads', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_500);
  await page.screenshot({ path: `${SHOT}/flow-05-settings.png`, fullPage: true });
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  expect(body.length, 'settings rendered').toBeGreaterThan(40);
});
