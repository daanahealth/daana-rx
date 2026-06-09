import { test, expect } from '@playwright/test';
import fs from 'node:fs';

// Drives a REAL check-in through the live UI with a real account, end to end:
// sign in -> Medication -> Location -> Label & place -> Confirm placed ->
// success, then verifies the item shows up in Inventory. Screenshots each step.
//
//   E2E_EMAIL=... E2E_PASSWORD=... npx playwright test e2e/checkin-flow.spec.ts --config e2e/playwright.config.ts

const EMAIL = process.env.E2E_EMAIL || '';
const PASSWORD = process.env.E2E_PASSWORD || '';
const STAMP = process.env.E2E_STAMP || `${Math.floor(Math.random() * 1e6)}`;
const MED_NAME = `DEMO-Amox-${STAMP}`;
const SHOT = 'e2e/screenshots';

async function signIn(page: any) {
  await page.goto('/auth/signin', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await page.waitForURL((u: URL) => !/\/auth\/signin/.test(u.toString()), { timeout: 60_000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
}

test('real browser check-in (live account)', async ({ page }) => {
  test.setTimeout(180_000);
  fs.mkdirSync(SHOT, { recursive: true });
  expect(EMAIL, 'E2E_EMAIL set').toBeTruthy();

  await signIn(page);
  await page.screenshot({ path: `${SHOT}/ci-01-signed-in.png`, fullPage: true });
  expect(/\/auth\/signin/.test(page.url()), 'signed in (left signin page)').toBeFalsy();

  // ---- Check-in wizard ----
  await page.goto('/checkin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_000);

  // Step 1 — Medication details
  const fill = async (loc: any, val: string) => { if (await loc.count()) await loc.first().fill(val); };
  await fill(page.getByPlaceholder(/Lisinopril/i), MED_NAME);
  await fill(page.getByPlaceholder('e.g. 10'), '500');
  await fill(page.getByPlaceholder(/mg, mcg/i), 'mg');
  await fill(page.getByPlaceholder(/CARDIO, PSYCH/i), 'INFECT'); // resolves to the INFECT bin
  // Medications require an expiry; use the spec's "10 years from today" fallback.
  const fallbackBtn = page.getByRole('button', { name: /10 years from today/i });
  if (await fallbackBtn.count()) await fallbackBtn.first().click();
  await page.screenshot({ path: `${SHOT}/ci-02-medication.png`, fullPage: true });
  await page.getByRole('button', { name: /Next: location/i }).click();

  // Step 2 — Location (auto-suggested from specialty=INFECT)
  await page.waitForTimeout(1_500);
  await page.screenshot({ path: `${SHOT}/ci-03-location.png`, fullPage: true });
  await page.getByRole('button', { name: /Next: label/i }).click();

  // Step 3 — Label & place (wait for the DRX code preview / counter to load)
  await page.waitForTimeout(3_500);
  await page.screenshot({ path: `${SHOT}/ci-04-label.png`, fullPage: true });
  const confirm = page.getByRole('button', { name: /Confirm placed/i });
  await expect(confirm).toBeEnabled({ timeout: 20_000 });
  await confirm.click();

  // ---- Result ----
  await page.waitForTimeout(4_000);
  await page.screenshot({ path: `${SHOT}/ci-05-result.png`, fullPage: true });
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  // eslint-disable-next-line no-console
  console.log('\n[result text] ' + body.slice(0, 500).replace(/\n+/g, ' | '));
  // The label step is gone once we submit (no more "Confirm placed").
  expect(body, 'left the label step (submitted)').not.toContain('Confirm placed');

  // Definitive proof: the item appears in Inventory search by its name.
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
