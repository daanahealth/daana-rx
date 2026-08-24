import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

// Inventory walkthrough against a MOCKED gateway. Seeds a superadmin session
// into localStorage and answers every gateway call in-page, so it runs when
// Supabase is paused (signup/signin fail with "fetch failed") and needs no
// backend at all. Captures the inventory list, the details drawer, the
// quick-checkout hand-off, the edit drawer and the history drawer, desktop
// and mobile (--project=mobile prefixes files with "mobile-").
//
//   E2E_FRONTEND_URL=http://localhost:3000 npx playwright test -c e2e/playwright.config.ts e2e/inventory-mocked.spec.ts
//   … --project=mobile

const SHOT = process.env.E2E_SHOT_DIR ?? 'e2e/screenshots/pr';
const CLINIC_ID = 'f6e0c90c-0000-4000-8000-000000000001';
const CLINIC = {
  clinicId: CLINIC_ID,
  name: 'MASS Clinic',
  userRole: 'superadmin',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const LOCATIONS = ['CARDIO1', 'CARDIO2', 'PSYCH1', 'GASTRO1', 'ENDOCRINE1'].map((code, i) => ({
  id: `loc-${i + 1}`,
  code,
  temp: 'room temp',
}));

const MEDS: Array<[string, string, string, string, string]> = [
  ['Lisinopril', '10', 'mg', 'Card', 'CARDIO1'],
  ['Atorvastatin', '20', 'mg', 'Bottle', 'CARDIO1'],
  ['Metoprolol Succinate', '25', 'mg', 'Card', 'CARDIO2'],
  ['Sertraline', '50', 'mg', 'Bottle', 'PSYCH1'],
  ['Escitalopram', '10', 'mg', 'Card', 'PSYCH1'],
  ['Omeprazole', '20', 'mg', 'Bottle', 'GASTRO1'],
  ['Pantoprazole', '40', 'mg', 'Card', 'GASTRO1'],
  ['Metformin', '500', 'mg', 'Bottle', 'ENDOCRINE1'],
  ['Insulin Glargine', '100', 'units/mL', 'Insulin Pen', 'ENDOCRINE1'],
  ['Amlodipine', '5', 'mg', 'Card', 'CARDIO2'],
  ['Losartan', '50', 'mg', 'Card', 'CARDIO1'],
  ['Bupropion XL', '150', 'mg', 'Bottle', 'PSYCH1'],
  ['Empagliflozin', '10', 'mg', 'Card', 'ENDOCRINE1'],
];

function daysFromNow(d: number): string {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
}

const STATUSES = [
  'active',
  'active',
  'active',
  'in_cart',
  'active',
  'pending_approval',
  'active',
  'checked_out',
  'active',
  'expired',
  'active',
  'removed',
  'active',
];
const EXPIRY_DAYS = [400, 12, 90, 200, -3, 45, 700, 300, 20, -40, 150, 365, 0];

const ITEMS = MEDS.map(([name, dosage, unit, form, loc], i) => {
  const location = LOCATIONS.find((l) => l.code === loc)!;
  const bin = loc.replace(/\d+$/, '');
  return {
    id: `item-${i + 1}`,
    type_id: '98d7c841-3ed7-47bb-8263-7ec435ff0efc',
    status: STATUSES[i],
    location_id: location.id,
    location: { code: location.code },
    expiry_date: EXPIRY_DAYS[i] === 0 ? null : daysFromNow(EXPIRY_DAYS[i]),
    unit_code: `DRX-MASS-${bin}-${String(i + 12).padStart(5, '0')}`,
    attributes: {
      medication_name: name,
      dosage,
      unit,
      form,
      quantity: (i % 4) + 1,
      specialty_class: bin,
    },
    created_at: new Date(Date.now() - (i + 1) * 86_400_000 * 3).toISOString(),
    created_by_name: i % 2 ? 'Kim' : 'Priya',
    last_edited_at: i % 3 === 0 ? new Date(Date.now() - 86_400_000).toISOString() : null,
    last_edited_by_name: i % 3 === 0 ? 'Kim' : null,
  };
});

const TRANSACTIONS = [
  {
    id: 'tx-2',
    action: 'edit',
    actorName: 'Kim',
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    oldValue: { quantity: 2, locationId: 'loc-2' },
    newValue: { quantity: 1, locationId: 'loc-1' },
    note: 'Moved to CARDIO1 after recount',
  },
  {
    id: 'tx-1',
    action: 'check_in',
    actorName: 'Priya',
    createdAt: new Date(Date.now() - 86_400_000 * 6).toISOString(),
    oldValue: null,
    newValue: null,
  },
];

async function seedSessionAndMockGateway(page: Page) {
  const now = Date.now();
  const user = {
    userId: 'user-1',
    username: 'kim',
    email: 'kim@massclinic.org',
    clinicId: CLINIC_ID,
    activeClinicId: CLINIC_ID,
    userRole: 'superadmin',
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  const clinic = {
    clinicId: CLINIC_ID,
    name: 'MASS Clinic',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  await page.addInitScript(
    ({ user, clinic, now }) => {
      localStorage.setItem('authToken', 'e2e-mock-token');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('clinic', JSON.stringify(clinic));
      localStorage.setItem('clinics', JSON.stringify([clinic]));
      localStorage.setItem('authExpiresAt', String(now + 2 * 60 * 60 * 1000));
      localStorage.setItem('lastActivity', String(now));
    },
    { user, clinic, now }
  );

  await page.route(/\/(inventory|transactions|notifications|auth)(\/|\?|$)/, async (route) => {
    // Only gateway calls — never the page document or Next assets.
    const type = route.request().resourceType();
    if (type !== 'fetch' && type !== 'xhr') return route.fallback();
    const url = new URL(route.request().url());
    const p = url.pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (p.endsWith('/auth/clinics')) return json([CLINIC]);
    if (p.endsWith('/inventory/locations/v2')) return json({ locations: LOCATIONS });
    if (/\/inventory\/items\/[^/]+\/transactions$/.test(p))
      return json({ transactions: TRANSACTIONS });
    if (p.endsWith('/inventory/items')) {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const status = url.searchParams.get('status');
      const loc = url.searchParams.get('locationId');
      const items = ITEMS.filter(
        (it) =>
          (!q || `${it.attributes.medication_name} ${it.unit_code}`.toLowerCase().includes(q)) &&
          (!status || it.status === status) &&
          (!loc || it.location_id === loc)
      );
      return json({ items, total: items.length });
    }
    // eslint-disable-next-line no-console -- surface unmocked gateway calls
    console.log('unmocked gateway call:', route.request().method(), p + url.search);
    return json({});
  });
}

test.beforeAll(() => fs.mkdirSync(SHOT, { recursive: true }));

test('inventory (mocked gateway): list, details, quick checkout, edit, history', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const mobile = testInfo.project.name === 'mobile';
  const shot = async (name: string) => {
    // Let sheet/dialog slide-in animations settle before capturing.
    await page.waitForTimeout(600);
    await page.screenshot({
      path: `${SHOT}/${mobile ? 'mobile-' : ''}${name}.png`,
      fullPage: true,
    });
  };

  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await seedSessionAndMockGateway(page);
  await page.goto('/inventory', { waitUntil: 'networkidle' });
  expect(pageErrors, 'client-side exceptions').toEqual([]);
  await expect(page.getByRole('heading', { level: 1, name: 'Inventory' })).toBeVisible();
  await expect(
    page.getByText('DRX-MASS-CARDIO-00012').filter({ visible: true }).first()
  ).toBeVisible();
  await shot('04-inventory');

  // Details: first row's medication button on desktop, the Details button on phones.
  if (mobile) {
    await page.getByRole('button', { name: 'Details' }).first().click();
  } else {
    await page.locator('table tbody tr').first().locator('button').first().click();
  }
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('svg[height="132"]')).toBeVisible();
  await expect(dialog.getByText('Quantity', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Transaction history')).toBeVisible();
  await expect(dialog.getByText('Check In', { exact: true })).toBeVisible();
  await shot('09-details-drawer');

  await dialog.getByRole('button', { name: /quick checkout/i }).click();
  await expect(page.getByText('Check out medication')).toBeVisible();
  await expect(page.getByRole('button', { name: /confirm checkout/i })).toBeVisible();
  await shot('10-quick-checkout-handoff');
  await page.getByRole('button', { name: /^cancel$/i }).click();
  await expect(page.getByText('Check out medication')).toBeHidden();

  // Edit via the row kebab.
  await page.getByRole('button', { name: 'Open actions menu' }).first().click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await expect(page.getByText('Edit inventory item')).toBeVisible();
  await shot('11-edit-drawer');
  await page.getByRole('button', { name: /^cancel$/i }).click();

  // History via the row kebab.
  await page.getByRole('button', { name: 'Open actions menu' }).first().click();
  await page.getByRole('menuitem', { name: 'View transaction history' }).click();
  await expect(page.getByRole('dialog').getByText('Moved to CARDIO1')).toBeVisible();
  await shot('12-history-drawer');
  await page.keyboard.press('Escape');

  // Filtered to no matches.
  await page.getByRole('searchbox', { name: 'Search inventory' }).fill('zzz-nothing');
  await expect(page.getByText('No medications match the current filters.')).toBeVisible();
  await shot('13-no-matches');
});
