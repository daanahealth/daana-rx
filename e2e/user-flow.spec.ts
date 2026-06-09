import { test, expect, request, Page } from '@playwright/test';
import fs from 'node:fs';

// Drives the live frontend as a real user would: creates an account (via the
// gateway API in beforeAll), signs in through the UI, then crawls the core
// pages — capturing screenshots and any console / network errors per page.

const GATEWAY = process.env.E2E_GATEWAY_URL ?? 'https://daanahealth-gateway.onrender.com';
const SHOT_DIR = 'e2e/screenshots';

let EMAIL = process.env.E2E_EMAIL ?? '';
let PASSWORD = process.env.E2E_PASSWORD ?? '';

test.beforeAll(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  if (EMAIL && PASSWORD) return;
  // Mint a throwaway clinic so the UI sign-in has valid credentials.
  const stamp = Date.now();
  EMAIL = `e2e_ui_${stamp}@daana-test.local`;
  PASSWORD = `E2eUi!${stamp}`;
  const ctx = await request.newContext();
  const res = await ctx.post(`${GATEWAY}/auth/signup`, {
    data: { email: EMAIL, password: PASSWORD, clinicName: `E2E UI Clinic ${stamp}` },
    timeout: 90_000,
  });
  expect(res.status(), 'signup for UI test account').toBe(200);
  await ctx.dispose();
  // eslint-disable-next-line no-console
  console.log(`UI test account: ${EMAIL}`);
});

// Collect console errors + failed responses while on a page.
function attachErrorCollectors(page: Page) {
  const consoleErrors: string[] = [];
  const failed: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.url()}`); });
  return { consoleErrors, failed };
}

test('user signs in through the UI', async ({ page }) => {
  await page.goto('/auth/signin', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.screenshot({ path: `${SHOT_DIR}/01-signin-filled.png`, fullPage: true });
  await Promise.all([
    page.waitForURL((u) => !/\/auth\/signin/.test(u.toString()), { timeout: 60_000 }).catch(() => {}),
    page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")').first().click(),
  ]);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.screenshot({ path: `${SHOT_DIR}/02-after-signin.png`, fullPage: true });
  // Signed in => should NOT still be sitting on the signin form.
  expect(/\/auth\/signin/.test(page.url()), `landed at ${page.url()}`).toBeFalsy();
});

const PAGES = [
  { path: '/', name: '03-home' },
  { path: '/inventory', name: '04-inventory' },
  { path: '/checkin', name: '05-checkin' },
  { path: '/settings', name: '06-settings' },
];

for (const p of PAGES) {
  test(`crawl ${p.path} as a user`, async ({ page }) => {
    // sign in first (each test gets a fresh context)
    await page.goto('/auth/signin', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")').first().click();
    await page.waitForURL((u) => !/\/auth\/signin/.test(u.toString()), { timeout: 60_000 }).catch(() => {});

    const { consoleErrors, failed } = attachErrorCollectors(page);
    await page.goto(p.path, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(2500); // let client fetches settle
    await page.screenshot({ path: `${SHOT_DIR}/${p.name}.png`, fullPage: true });

    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    // eslint-disable-next-line no-console
    console.log(`\n[${p.path}] url=${page.url()} chars=${bodyText.length} consoleErrors=${consoleErrors.length} failed5xx=${failed.length}`);
    if (consoleErrors.length) console.log('  console errors:', consoleErrors.slice(0, 5));
    if (failed.length) console.log('  5xx responses:', failed.slice(0, 5));

    // The page must render *something* (not a blank crash).
    expect(bodyText.length, `rendered content on ${p.path}`).toBeGreaterThan(40);
  });
}
