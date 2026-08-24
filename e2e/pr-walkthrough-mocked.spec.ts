import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';

// Offline PR walkthrough for the home / settings / auth lane. Seeds a session
// in localStorage and mocks the gateway so screenshots can be captured while
// Supabase is paused (the live gateway then answers "fetch failed").
//
//   E2E_FRONTEND_URL=http://localhost:3000 E2E_SHOT_DIR=e2e/screenshots/pr \
//     npx playwright test --config e2e/playwright.config.ts e2e/pr-walkthrough-mocked.spec.ts
//
// E2E_ROLE=employee walks the restricted-user variant of Home/Settings.

const SHOT = process.env.E2E_SHOT_DIR ?? 'e2e/screenshots/pr';
const ROLE = process.env.E2E_ROLE ?? 'superadmin';
const GATEWAY = /daanahealth-gateway\.onrender\.com|localhost:4000/;

const CLINIC = { clinicId: 'c-mock', name: 'MASS Clinic' };
const USER = {
  userId: 'u-mock',
  username: 'kim.m',
  email: 'kim@massclinic.org',
  clinicId: CLINIC.clinicId,
  userRole: ROLE,
};

const ITEMS = [
  {
    id: 'i1',
    unitCode: 'DRX-MASS-ENDO-00012',
    status: 'active',
    expiryDate: '2026-09-10',
    attributes: {
      medication_name: 'Metformin',
      dosage: 500,
      unit: 'mg',
      form: 'Tablet',
      location_code: 'ENDO1',
    },
  },
  {
    id: 'i2',
    unitCode: 'DRX-MASS-ENDO-00031',
    status: 'active',
    expiryDate: '2027-03-07',
    attributes: {
      medication_name: 'Metformin',
      dosage: 1000,
      unit: 'mg',
      form: 'Tablet',
      location_code: 'ENDO2',
    },
  },
  {
    id: 'i3',
    unitCode: 'DRX-MASS-ENDO-00044',
    status: 'active',
    expiryDate: '2027-11-30',
    attributes: {
      medication_name: 'Metformin ER',
      dosage: 750,
      unit: 'mg',
      form: 'Tablet',
      location_code: 'ENDO1',
    },
  },
];

const MOCK: Array<[RegExp, unknown | ((route: Route) => unknown)]> = [
  [/\/warmup/, { ok: true }],
  [/\/inventory\/items\?/, { items: ITEMS }],
  [
    /\/transactions\/reports\/expiring/,
    {
      window: 30,
      rows: [
        {
          unitId: '1',
          medicationName: 'Amoxicillin',
          dosage: '500 mg',
          expiryDate: '2026-09-02',
          daysUntilExpiry: 10,
          drxCode: 'X',
        },
        {
          unitId: '2',
          medicationName: 'Lisinopril',
          dosage: '10 mg',
          expiryDate: '2026-09-15',
          daysUntilExpiry: 23,
          drxCode: 'Y',
        },
      ],
    },
  ],
  [
    /\/transactions\/reports\/capacity/,
    {
      rows: [
        { locationId: 'a', name: 'CARDIO1', current: 47, capacity: 50, percent: 94 },
        { locationId: 'b', name: 'PSYCH2', current: 31, capacity: 50, percent: 62 },
      ],
    },
  ],
  [
    /\/transactions\/reports\/high-use/,
    {
      rows: [
        { drugId: 'd1', medicationName: 'Lisinopril', dosage: '10 mg', checkoutCount: 14 },
        { drugId: 'd2', medicationName: 'Metformin', dosage: '500 mg', checkoutCount: 9 },
        { drugId: 'd3', medicationName: 'Sertraline', dosage: '50 mg', checkoutCount: 6 },
      ],
    },
  ],
  [
    /\/transactions\/reports\/recently-checked-out/,
    {
      rows: [
        {
          transactionId: 't1',
          timestamp: '2026-08-22T15:10:00Z',
          actionType: 'check_out',
          medicationName: 'Sertraline',
          dosage: '50 mg',
        },
        {
          transactionId: 't2',
          timestamp: '2026-08-22T14:02:00Z',
          actionType: 'check_out',
          medicationName: 'Amlodipine',
          dosage: '5 mg',
        },
      ],
    },
  ],
  [
    /\/inventory\/locations$/,
    [
      {
        locationId: 'l1',
        code: 'CARDIO1',
        specialty: 'CARDIO',
        capacity: 50,
        item_type: 'Card',
        deactivated_at: null,
      },
      {
        locationId: 'l2',
        code: 'CARDIO2',
        specialty: 'CARDIO',
        capacity: 50,
        item_type: 'Bottle',
        deactivated_at: null,
      },
      {
        locationId: 'l3',
        code: 'PSYCH1',
        specialty: 'PSYCH',
        capacity: 30,
        item_type: 'Card',
        deactivated_at: null,
      },
      {
        locationId: 'l4',
        code: 'OLDBIN',
        specialty: 'GASTRO',
        capacity: 50,
        item_type: 'Other',
        deactivated_at: '2026-05-01T00:00:00Z',
      },
    ],
  ],
  [
    /\/auth\/users/,
    [
      { userId: 'u1', email: 'kim@massclinic.org', userRole: 'superadmin' },
      { userId: 'u2', email: 'volunteer@massclinic.org', userRole: 'employee', canCheckout: true },
      {
        userId: 'u3',
        email: 'intern@massclinic.org',
        userRole: 'employee',
        deactivated_at: '2026-06-01T00:00:00Z',
      },
    ],
  ],
  [
    /\/inventory\/settings\/classification/,
    (route: Route) => route.fulfill({ status: 404, body: '{}' }),
  ],
  [/\/auth\/clinics$/, [{ ...CLINIC, userRole: ROLE }]],
  [/\/auth\/clinic$/, { clinicId: CLINIC.clinicId, name: CLINIC.name, requireLotLocation: true }],
  [/\/transactions\/carts/, []],
];

async function seed(page: Page) {
  await page.addInitScript(
    ({ user, clinic }) => {
      const now = Date.now();
      localStorage.setItem('authToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('clinic', JSON.stringify(clinic));
      localStorage.setItem('clinics', JSON.stringify([clinic]));
      localStorage.setItem('authExpiresAt', String(now + 2 * 60 * 60 * 1000));
      localStorage.setItem('lastActivity', String(now));
    },
    { user: USER, clinic: CLINIC }
  );
  await page.route(GATEWAY, async (route) => {
    const url = route.request().url();
    for (const [re, body] of MOCK) {
      if (re.test(url)) {
        if (typeof body === 'function') return body(route);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(body),
        });
      }
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOT}/${name}.png`, fullPage: true });
}

test.beforeAll(() => fs.mkdirSync(SHOT, { recursive: true }));

test('auth pages', async ({ page }) => {
  await page.route(GATEWAY, (route) => route.fulfill({ status: 200, body: '{}' }));
  await page.goto('/auth/signin');
  await page.getByLabel('Email').fill('kim@massclinic.org');
  await shot(page, '01-signin');
  await page.goto('/auth/signin?reason=inactivity');
  await shot(page, '01b-signin-session-ended');
  await page.goto('/auth/signup');
  await page.getByLabel('Password', { exact: true }).fill('Abc');
  await shot(page, '02-signup');
  await page.goto('/auth/forgot-password');
  await shot(page, '02b-forgot-password');
  await page.goto('/auth/reset-password');
  await page.getByLabel('New password', { exact: true }).fill('LongEnough1!');
  await shot(page, '02c-reset-password');
});

test(`home + settings (${ROLE})`, async ({ page }) => {
  await seed(page);
  const prefix = ROLE === 'superadmin' ? '' : `${ROLE}-`;
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/looking for|Home/);
  await shot(page, `${prefix}03-home`);
  if (ROLE !== 'provider') {
    await page.getByLabel('Search medications').fill('metformin');
    await expect(page.getByText('3 results')).toBeVisible();
    await shot(page, `${prefix}03b-home-results`);
  }

  await page.goto('/settings');
  await shot(page, `${prefix}08-settings-locations`);
  if (ROLE === 'superadmin') {
    const tabs = ['users', 'classification', 'capacity', 'account'];
    for (const t of tabs) {
      const isSmall = (page.viewportSize()?.width ?? 1280) < 768;
      if (isSmall) {
        await page.getByLabel('Settings section').click();
        await page.getByRole('option', { name: new RegExp(t, 'i') }).click();
      } else {
        await page.getByRole('tab', { name: new RegExp(t, 'i') }).click();
      }
      await shot(page, `${prefix}08-settings-${t}`);
    }
    if ((page.viewportSize()?.width ?? 1280) >= 768) {
      await page.getByRole('tab', { name: /locations/i }).click();
      await page.getByRole('button', { name: /edit/i }).first().click();
      await shot(page, `${prefix}08b-settings-edit-location`);
      await page.keyboard.press('Escape');
    }
    await page.goto('/admin');
    await shot(page, `${prefix}09-admin`);
  }
});
