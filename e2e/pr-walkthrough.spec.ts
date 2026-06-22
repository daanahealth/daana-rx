import { test, expect, request, type Page } from '@playwright/test';
import fs from 'node:fs';

// PR walkthrough: signs in with a test account and walks the key pages end to
// end through the live UI, asserting each renders (no error boundary) and
// capturing a labeled, full-page screenshot per page into e2e/screenshots/pr/.
// The `daana-e2e-pr` skill then publishes those screenshots into the PR body.
//
// Account strategy:
//   - If E2E_TEST_EMAIL + E2E_TEST_PASSWORD are set, signs in with that account
//     (use this to walk a clinic that already has real data / for visual diffs).
//   - Otherwise self-provisions a throwaway clinic via /auth/signup, exactly like
//     the existing all-flows spec (e2e_*@daana-test.local). No secrets needed.

const GATEWAY = process.env.E2E_GATEWAY_URL ?? 'https://daanahealth-gateway.onrender.com';
const SHOT = 'e2e/screenshots/pr';
const STAMP = process.env.E2E_STAMP || `${Date.now()}`;
const BIN = 'WALK';

let EMAIL = process.env.E2E_TEST_EMAIL ?? '';
let PASSWORD = process.env.E2E_TEST_PASSWORD ?? '';
const PROVISIONED = !EMAIL || !PASSWORD;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  fs.mkdirSync(SHOT, { recursive: true });
  if (!PROVISIONED) {
    // eslint-disable-next-line no-console
    console.log(`using provided test account ${EMAIL}`);
    return;
  }
  EMAIL = `e2e_walk_${STAMP}@daana-test.local`;
  PASSWORD = `E2eWalk!${STAMP}aA`;
  const ctx = await request.newContext();
  const su = await ctx.post(`${GATEWAY}/auth/signup`, {
    data: { email: EMAIL, password: PASSWORD, clinicName: `E2E Walkthrough Clinic ${STAMP}` },
    timeout: 90_000,
  });
  expect(su.status(), 'signup').toBe(200);
  const { token, clinic } = await su.json();
  const headers = {
    Authorization: `Bearer ${token}`,
    'x-clinic-id': clinic?.clinicId ?? '',
    'Content-Type': 'application/json',
  };
  const loc = await ctx.post(`${GATEWAY}/inventory/locations`, {
    headers, data: { name: BIN, temp: 'room temp' }, timeout: 60_000,
  });
  expect([200, 201]).toContain(loc.status());
  await ctx.dispose();
  // eslint-disable-next-line no-console
  console.log(`provisioned ${EMAIL} + bin ${BIN}`);
});

async function signIn(page: Page) {
  await page.goto('/auth/signin', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.screenshot({ path: `${SHOT}/01-signin.png` });
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await page.waitForURL((u: URL) => !/\/auth\/signin/.test(u.toString()), { timeout: 60_000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
}

// Pages to walk: [route, screenshot label, an element we expect to render].
const PAGES: Array<{ path: string; name: string; expect?: RegExp }> = [
  { path: '/', name: '03-home', expect: /search|inventory|home|dashboard/i },
  { path: '/inventory', name: '04-inventory', expect: /inventory|item|medication|stock/i },
  { path: '/checkin', name: '05-checkin', expect: /check.?in|medication|location/i },
  { path: '/checkout', name: '06-checkout', expect: /check.?out|cart|search/i },
  { path: '/reports', name: '07-reports', expect: /report|transaction|activity|dashboard/i },
  { path: '/settings', name: '08-settings', expect: /setting|profile|clinic|account/i },
];

test('PR walkthrough: sign in + capture every key page', async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page);

  // Confirm we actually authenticated (not bounced back to signin).
  await page.screenshot({ path: `${SHOT}/02-after-signin.png`, fullPage: true });
  expect(page.url(), 'should be signed in (not on /auth/signin)').not.toMatch(/\/auth\/signin/);

  const failures: string[] = [];
  for (const p of PAGES) {
    await test.step(`page ${p.path}`, async () => {
      const resp = await page.goto(p.path, { waitUntil: 'networkidle' }).catch(() => null);
      await page.waitForTimeout(1500);
      // Behavior check: page must not be a hard error / Next error boundary.
      const body = (await page.locator('body').innerText().catch(() => '')) || '';
      const errored =
        (resp && resp.status() >= 500) ||
        /application error|something went wrong|unhandled runtime error|404.*page could not be found/i.test(body);
      await page.screenshot({ path: `${SHOT}/${p.name}.png`, fullPage: true });
      if (errored) failures.push(`${p.path} rendered an error`);
      else if (p.expect && !p.expect.test(body)) {
        // Soft signal only — log, don't fail the whole run on a copy change.
        // eslint-disable-next-line no-console
        console.log(`note: ${p.path} did not match expected text ${p.expect}`);
      }
    });
  }

  expect(failures, `pages that errored: ${failures.join(', ')}`).toHaveLength(0);
});
