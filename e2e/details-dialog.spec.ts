import { test, expect, request, type Page } from '@playwright/test';
import fs from 'node:fs';

// Focused behavior test for the inventory ItemDetailsModal (PR: details modal +
// quantity column + pagination). Provisions a throwaway clinic (same strategy as
// pr-walkthrough.spec.ts), opens the details dialog from the inventory table, and
// asserts the dialog's specific behavior:
//   1. opens with a QR code, the detail summary (incl. Quantity), the DRX code,
//      and the transaction-history section;
//   2. the superadmin "Quick checkout" hands off to the checkout-confirm dialog;
//   3. "Close" dismisses the dialog.
// Screenshots land in e2e/screenshots/pr so the daana-e2e-pr publish step embeds
// them in the PR body alongside the page walkthrough shots.

const GATEWAY = process.env.E2E_GATEWAY_URL ?? 'https://daanahealth-gateway.onrender.com';
const SHOT = 'e2e/screenshots/pr';
const STAMP = process.env.E2E_STAMP || `${Date.now()}`;

let EMAIL = process.env.E2E_TEST_EMAIL ?? '';
let PASSWORD = process.env.E2E_TEST_PASSWORD ?? '';
const PROVISIONED = !EMAIL || !PASSWORD;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  fs.mkdirSync(SHOT, { recursive: true });
  if (!PROVISIONED) return;
  EMAIL = `e2e_dlg_${STAMP}@daana-test.local`;
  PASSWORD = `E2eDlg!${STAMP}aA`;
  const ctx = await request.newContext();
  const su = await ctx.post(`${GATEWAY}/auth/signup`, {
    data: { email: EMAIL, password: PASSWORD, clinicName: `E2E Dialog Clinic ${STAMP}` },
    timeout: 90_000,
  });
  expect(su.status(), 'signup').toBe(200);
  await ctx.dispose();
  // eslint-disable-next-line no-console
  console.log(`provisioned ${EMAIL}`);
});

async function signIn(page: Page) {
  await page.goto('/auth/signin', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page
    .getByRole('button', { name: /sign in/i })
    .first()
    .click();
  await page
    .waitForURL((u: URL) => !/\/auth\/signin/.test(u.toString()), { timeout: 60_000 })
    .catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
}

test('inventory details dialog: QR + history + superadmin quick-checkout hand-off', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1366, height: 900 }); // ≥lg → desktop table
  await signIn(page);
  expect(page.url(), 'should be signed in').not.toMatch(/\/auth\/signin/);

  await page.goto('/inventory', { waitUntil: 'networkidle' });

  // Need at least one seeded unit to open. Fail clearly if the clinic is empty.
  const firstRow = page.locator('table tbody tr').first();
  await firstRow.waitFor({ state: 'visible', timeout: 30_000 });

  // Open the dialog by clicking the medication-name button in the first row.
  await firstRow.locator('button').first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // 1a. QR code — qrcode.react renders an <svg> sized to `size` (132).
  await expect(dialog.locator('svg[height="132"]')).toBeVisible();

  // 1b. Detail summary includes the new Quantity field + the DRX code.
  await expect(dialog.getByText('Quantity')).toBeVisible();
  await expect(dialog.getByText(/DRX-MASS-/i).first()).toBeVisible();

  // 1c. Transaction-history section renders (entries or the empty message — i.e.
  //     it resolved out of the loading state, not stuck spinning).
  await expect(dialog.getByText('Transaction history')).toBeVisible();
  await expect(dialog.getByText(/Check In|No transactions recorded/i).first()).toBeVisible({
    timeout: 30_000,
  });

  // 1d. Superadmin sees Quick checkout.
  const quickCheckout = dialog.getByRole('button', { name: /quick checkout/i });
  await expect(quickCheckout).toBeVisible();

  await page.screenshot({ path: `${SHOT}/09-details-dialog.png`, fullPage: true });

  // 2. Quick checkout hands off to the existing superadmin-gated confirm dialog.
  await quickCheckout.click();
  await expect(page.getByText('Check out medication')).toBeVisible();
  await expect(page.getByRole('button', { name: /confirm checkout/i })).toBeVisible();
  await page.screenshot({ path: `${SHOT}/10-quick-checkout-handoff.png`, fullPage: true });

  // Don't actually check out — cancel the confirm so the test stays read-only.
  await page.getByRole('button', { name: /^cancel$/i }).click();
  await expect(page.getByText('Check out medication')).toBeHidden();

  // 3. Re-open details and verify Close dismisses the dialog.
  await firstRow.locator('button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('button', { name: /^close$/i })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeHidden();
});
