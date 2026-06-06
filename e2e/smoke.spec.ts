import { test, expect, request } from '@playwright/test';

const GATEWAY_URL =
  process.env.E2E_GATEWAY_URL ?? 'https://daanahealth-gateway.onrender.com';

test.describe('DaanaRX smoke', () => {
  test('t1 home page or auth redirect', async ({ page }) => {
    // Authed users see the search hero; unauthed users redirect to /auth/signin
    // (SessionGuard). Either is correct MVP behavior. Page is fully client-
    // rendered so wait for hydration before asserting.
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/DaanaRX/i);
    // Either branch must surface within 15s of hydration.
    const anyInput = page.locator(
      'input[inputmode="search"], input[type="email"], input[name="email"]',
    );
    await expect(anyInput.first()).toBeVisible({ timeout: 15_000 });
  });

  test('t2 signin loads', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(
      page.locator('input[type="email"], input[name="email"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('input[type="password"], input[name="password"]').first(),
    ).toBeVisible();
  });

  test('t3 forgot password loads', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(
      page.locator('input[type="email"], input[name="email"]').first(),
    ).toBeVisible();
  });

  test('t4 inventory route either redirects to signin or renders', async ({
    page,
  }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle').catch(() => {});
    const url = page.url();
    const onSignin = /\/auth\/signin/.test(url);
    const onInventory = /\/inventory/.test(url);
    expect(onSignin || onInventory).toBeTruthy();
  });

  test('t5 backend gateway health', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${GATEWAY_URL}/health`, { timeout: 60_000 });
    expect(res.status()).toBe(200);
    // Be permissive: some health endpoints return text/plain
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      const body = await res.json();
      expect(body).toBeTruthy();
    } else {
      const text = await res.text();
      expect(text.length).toBeGreaterThan(0);
    }
    await ctx.dispose();
  });
});
