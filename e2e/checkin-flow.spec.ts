import { test, expect, request, type Page } from '@playwright/test';
import fs from 'node:fs';

// Drives a REAL check-in through the live UI, end to end — with NO stored
// credentials. beforeAll self-provisions a throwaway clinic (via /auth/signup)
// and an INFECT bin (a fresh clinic has no locations), so the wizard's
// specialty->location suggestion resolves to a real bin. Then the test signs in
// through the UI and walks Medication -> Location -> Label & place -> Confirm,
// and verifies the item appears in Inventory. Screenshots each step.

const GATEWAY = process.env.E2E_GATEWAY_URL ?? 'https://daanahealth-gateway.onrender.com';
const SHOT = 'e2e/screenshots';
const STAMP = process.env.E2E_STAMP || `${Date.now()}`;
const MED_NAME = `DEMO-Amox-${STAMP}`;
const BIN = 'INFECT'; // matches the classification-guide suggestion for INFECT meds

let EMAIL = '';
let PASSWORD = '';

test.beforeAll(async () => {
  fs.mkdirSync(SHOT, { recursive: true });
  EMAIL = `e2e_ci_${STAMP}@daana-test.local`;
  PASSWORD = `E2eCi!${STAMP}aA`; // >=10 chars, upper/lower/number/special (spec-compliant)

  const ctx = await request.newContext();
  const su = await ctx.post(`${GATEWAY}/auth/signup`, {
    data: { email: EMAIL, password: PASSWORD, clinicName: `E2E CI Clinic ${STAMP}` },
    timeout: 90_000,
  });
  expect(su.status(), 'signup throwaway clinic').toBe(200);
  const { token, clinic } = await su.json();

  const headers = {
    Authorization: `Bearer ${token}`,
    'x-clinic-id': clinic?.clinicId ?? '',
    'Content-Type': 'application/json',
  };
  const loc = await ctx.post(`${GATEWAY}/inventory/locations`, {
    headers,
    data: { name: BIN, temp: 'room temp' },
    timeout: 60_000,
  });
  expect([200, 201], 'create INFECT bin').toContain(loc.status());
  await ctx.dispose();
  // eslint-disable-next-line no-console
  console.log(`provisioned ${EMAIL} with bin ${BIN}`);
});

async function signIn(page: Page) {
  await page.goto('/auth/signin', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await page.waitForURL((u: URL) => !/\/auth\/signin/.test(u.toString()), { timeout: 60_000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
}

test('real browser check-in (self-provisioned account)', async ({ page }) => {
  test.setTimeout(180_000);

  await signIn(page);
  await page.screenshot({ path: `${SHOT}/ci-01-signed-in.png`, fullPage: true });
  expect(/\/auth\/signin/.test(page.url()), 'signed in').toBeFalsy();

  // Check-in wizard
  await page.goto('/checkin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_000);

  const fill = async (loc: any, val: string) => { if (await loc.count()) await loc.first().fill(val); };
  await fill(page.getByPlaceholder(/Lisinopril/i), MED_NAME);
  await fill(page.getByPlaceholder('e.g. 10'), '500');
  await fill(page.getByPlaceholder(/mg, mcg/i), 'mg');
  await fill(page.getByPlaceholder(/CARDIO, PSYCH/i), BIN); // -> INFECT bin
  const fallbackBtn = page.getByRole('button', { name: /10 years from today/i });
  if (await fallbackBtn.count()) await fallbackBtn.first().click(); // expiry fallback
  await page.screenshot({ path: `${SHOT}/ci-02-medication.png`, fullPage: true });
  await page.getByRole('button', { name: /Next: location/i }).click();

  await page.waitForTimeout(1_500);
  await page.screenshot({ path: `${SHOT}/ci-03-location.png`, fullPage: true });
  await page.getByRole('button', { name: /Next: label/i }).click();

  await page.waitForTimeout(3_500);
  await page.screenshot({ path: `${SHOT}/ci-04-label.png`, fullPage: true });
  const confirm = page.getByRole('button', { name: /Confirm placed/i });
  await expect(confirm).toBeEnabled({ timeout: 20_000 });
  await confirm.click();

  await page.waitForTimeout(4_000);
  await page.screenshot({ path: `${SHOT}/ci-05-result.png`, fullPage: true });
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  // eslint-disable-next-line no-console
  console.log('\n[result] ' + body.slice(0, 500).replace(/\n+/g, ' | '));
  expect(body, 'submitted (left the label step)').not.toContain('Confirm placed');

  // Definitive: the item appears in Inventory search.
  await page.goto('/inventory', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_500);
  const search = page.getByPlaceholder(/Medication, code/i);
  if (await search.count()) {
    await search.first().fill(MED_NAME);
    await page.waitForTimeout(3_000);
  }
  await page.screenshot({ path: `${SHOT}/ci-06-inventory.png`, fullPage: true });
  const invText = (await page.locator('body').innerText().catch(() => '')) || '';
  // eslint-disable-next-line no-console
  console.log('[inventory shows ' + MED_NAME + '] ' + invText.includes(MED_NAME));
  expect(invText, 'checked-in item visible in inventory').toContain(MED_NAME);
});
