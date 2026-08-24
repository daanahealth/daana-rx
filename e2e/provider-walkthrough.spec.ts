import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

// Provider Role v1 walkthrough with a SEEDED session and a MOCKED gateway.
// The live Supabase is paused (gateway returns "fetch failed") and the
// request endpoints (backend #13) are unmerged, so this drives the PR build
// with fixture responses that match the backend PR bodies (#11/#12/#13).
//
//   E2E_FRONTEND_URL=http://localhost:3000 npx playwright test --config e2e/playwright.config.ts \
//     e2e/provider-walkthrough.spec.ts --project=mobile
//
// Screenshots land in E2E_SHOT_DIR (default e2e/screenshots/provider).

const SHOT = process.env.E2E_SHOT_DIR ?? 'e2e/screenshots/provider';
const GATEWAY = process.env.E2E_GATEWAY_URL ?? 'https://daanahealth-gateway.onrender.com';

const CLINIC = {
  clinicId: 'c1',
  name: 'MASS Clinic',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};
const PROVIDER = {
  userId: 'u1',
  username: 'kpatel',
  email: 'karol.patel@massclinic.org',
  clinicId: 'c1',
  activeClinicId: 'c1',
  userRole: 'provider',
};
const SUPER = {
  userId: 'u2',
  username: 'kim',
  email: 'kim@massclinic.org',
  clinicId: 'c1',
  activeClinicId: 'c1',
  userRole: 'superadmin',
};
const PROFILE = { fullName: 'Karol Patel', credential: 'NP', specialty: 'CARDIO', active: true };

const card = (
  key: string,
  medicationName: string,
  dose: string,
  form: string,
  availableUnits: number,
  earliestExpiry: string | null,
  specialtyClass = 'CARDIO'
) => ({
  key,
  medicationName,
  dose,
  form,
  specialtyClass,
  availableUnits,
  availableQuantity: availableUnits,
  earliestExpiry,
});
const MEDS = [
  card('lisinopril', 'Lisinopril', '10 mg', 'Tablet', 12, '2027-03-07'),
  card('atorvastatin', 'Atorvastatin', '20 mg', 'Tablet', 8, '2026-09-10'),
  card('metoprolol', 'Metoprolol succinate', '50 mg', 'Tablet', 5, '2027-01-31'),
  card('amlodipine', 'Amlodipine', '5 mg', 'Tablet', 3, '2026-12-01'),
  card('losartan', 'Losartan', '50 mg', 'Tablet', 2, '2027-05-15'),
  card('metformin', 'Metformin', '500 mg', 'Tablet', 6, '2027-02-01', 'ENDOCRINE'),
];
const now = Date.now();
const iso = (offsetMin: number) => new Date(now + offsetMin * 60_000).toISOString();
const REQUESTS = [
  {
    id: 'r1',
    status: 'pending',
    medicationName: 'Lisinopril',
    dose: '10 mg',
    form: 'Tablet',
    quantity: 1,
    patientRef: '10423',
    denialReason: null,
    createdAt: iso(-12),
    expiresAt: iso(150),
    resolvedAt: null,
    provider: { userId: 'u1', ...PROFILE },
    ageSeconds: 720,
    units: [
      {
        itemId: 'i1',
        unitCode: 'DRX-MASS-CARDIO1-00042',
        locationCode: 'CARDIO1',
        expiryDate: '2027-03-07',
        status: 'pending_approval',
        released: false,
      },
    ],
  },
  {
    id: 'r2',
    status: 'pending',
    medicationName: 'Atorvastatin',
    dose: '20 mg',
    form: 'Tablet',
    quantity: 2,
    patientRef: null,
    denialReason: null,
    createdAt: iso(-4),
    expiresAt: iso(25),
    resolvedAt: null,
    provider: { userId: 'u3', fullName: 'Sam Ortiz', credential: 'MD', specialty: 'CARDIO' },
    ageSeconds: 240,
    units: [
      {
        itemId: 'i2',
        unitCode: 'DRX-MASS-CARDIO2-00007',
        locationCode: 'CARDIO2',
        expiryDate: '2026-09-10',
        status: 'pending_approval',
        released: false,
      },
      {
        itemId: 'i3',
        unitCode: 'DRX-MASS-CARDIO2-00008',
        locationCode: 'CARDIO2',
        expiryDate: '2026-09-10',
        status: 'pending_approval',
        released: false,
      },
    ],
  },
  {
    id: 'r3',
    status: 'fulfilled',
    medicationName: 'Amlodipine',
    dose: '5 mg',
    form: 'Tablet',
    quantity: 1,
    patientRef: '10311',
    denialReason: null,
    createdAt: iso(-90),
    expiresAt: iso(60),
    resolvedAt: iso(-80),
    provider: { userId: 'u1', ...PROFILE },
    ageSeconds: 5400,
    units: [
      {
        itemId: 'i4',
        unitCode: 'DRX-MASS-CARDIO1-00011',
        locationCode: 'CARDIO1',
        expiryDate: '2026-12-01',
        status: 'checked_out',
        released: true,
      },
    ],
  },
  {
    id: 'r4',
    status: 'denied',
    medicationName: 'Losartan',
    dose: '50 mg',
    form: 'Tablet',
    quantity: 1,
    patientRef: null,
    denialReason: 'could not locate',
    createdAt: iso(-200),
    expiresAt: iso(-10),
    resolvedAt: iso(-190),
    provider: { userId: 'u1', ...PROFILE },
    ageSeconds: 12000,
    units: [],
  },
];
const mine = REQUESTS.filter((r) => r.provider.userId === 'u1').map(
  ({ provider: _p, units: _u, ageSeconds: _a, ...r }) => r
);

async function seed(page: Page, user: typeof PROVIDER) {
  await page.addInitScript(
    ({ user, clinic }) => {
      const exp = Date.now() + 2 * 60 * 60 * 1000;
      localStorage.setItem('authToken', 'e2e-token');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('clinic', JSON.stringify(clinic));
      localStorage.setItem('clinics', JSON.stringify([clinic]));
      localStorage.setItem('authExpiresAt', String(exp));
      localStorage.setItem('lastActivity', String(Date.now()));
    },
    { user, clinic: CLINIC }
  );
}

async function mockGateway(
  page: Page,
  flags: Record<string, unknown>,
  opts: { conflict?: boolean } = {}
) {
  await page.route(`${GATEWAY}/**`, async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const method = route.request().method();
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (p === '/auth/clinics') return json([CLINIC]);
    if (p === '/auth/me') return json({ user: PROVIDER, clinic: CLINIC, providerProfile: PROFILE });
    if (p === '/inventory/settings/flags') return json({ flags });
    if (p === '/inventory/provider/home')
      return json({
        specialty: 'CARDIO',
        available: MEDS.filter((m) => m.specialtyClass === 'CARDIO'),
        topRequested: [],
      });
    if (p === '/inventory/provider/medications') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const sp = url.searchParams.get('specialty');
      let rows = MEDS.filter((m) => !sp || m.specialtyClass === sp.toUpperCase());
      if (q)
        rows = MEDS.filter((m) => m.medicationName.toLowerCase().includes(q)).concat(
          q.startsWith('war') ? [card('warfarin', 'Warfarin', '5 mg', 'Tablet', 0, null)] : []
        );
      return json({ medications: rows, total: rows.length });
    }
    const detail = /^\/inventory\/provider\/medications\/(.+)$/.exec(p);
    if (detail) {
      const m = MEDS.find((x) => x.key === decodeURIComponent(detail[1]));
      if (!m) return json({ error: 'Not found' }, 404);
      return json({
        medication: {
          ...m,
          nextExpiries: [
            { expiryDate: m.earliestExpiry, availableUnits: 1, availableQuantity: 1 },
            {
              expiryDate: '2027-08-01',
              availableUnits: m.availableUnits - 1,
              availableQuantity: m.availableUnits - 1,
            },
          ],
        },
      });
    }
    if (p === '/transactions/requests/top')
      return json({
        days: 30,
        topRequested: [
          {
            medicationKey: 'lisinopril',
            medicationName: 'Lisinopril',
            dose: '10 mg',
            form: 'Tablet',
            count: 14,
          },
          {
            medicationKey: 'atorvastatin',
            medicationName: 'Atorvastatin',
            dose: '20 mg',
            form: 'Tablet',
            count: 9,
          },
        ],
      });
    if (p === '/transactions/requests/mine') return json({ requests: mine });
    if (p === '/transactions/requests/count') return json({ pending: 2 });
    if (p === '/transactions/requests' && method === 'GET') {
      const status = url.searchParams.get('status') ?? 'pending';
      const rows = REQUESTS.filter((r) =>
        status === 'pending' ? r.status === 'pending' : r.status !== 'pending'
      );
      return json({ status, requests: rows, count: rows.length });
    }
    if (p === '/transactions/requests' && method === 'POST') {
      if (opts.conflict)
        return json(
          {
            error:
              'That unit was just reserved. Next available: Lisinopril, next FEFO expiry 2027-08-01',
            conflict: 'concurrent_reservation',
          },
          409
        );
      const body = route.request().postDataJSON();
      return json(
        {
          request: {
            id: 'r9',
            status: 'pending',
            medicationName: 'Lisinopril',
            dose: '10 mg',
            form: 'Tablet',
            quantity: body.quantity,
            patientRef: body.patientRef ?? null,
            denialReason: null,
            createdAt: iso(0),
            expiresAt: iso(180),
            resolvedAt: null,
          },
        },
        201
      );
    }
    if (/^\/transactions\/requests\/[^/]+\/(fulfill|deny|return|cancel)$/.test(p)) {
      const id = p.split('/')[3];
      const r = REQUESTS.find((x) => x.id === id)!;
      const action = p.split('/')[4];
      const status =
        action === 'fulfill'
          ? 'fulfilled'
          : action === 'deny'
            ? 'denied'
            : action === 'cancel'
              ? 'cancelled'
              : r.status;
      return json({
        request: {
          ...r,
          status,
          resolvedAt: iso(0),
          denialReason: action === 'deny' ? route.request().postDataJSON()?.reason : null,
        },
      });
    }
    if (p.startsWith('/notifications')) return json({ notifications: [], unread: 0 });
    if (p === '/inventory/stats')
      return json({
        totalUnits: 595,
        unitsExpiringSoon: 12,
        recentCheckIns: 30,
        recentCheckOuts: 18,
        lowStockAlerts: 2,
      });
    return json({ error: `unmocked ${method} ${p}` }, 404);
  });
}

const FLAGS_ON = {
  provider_requests_enabled: true,
  patient_ref_enabled: true,
  attestation_mode: 'none',
  request_ttl: 'end_of_day',
};
const FLAGS_OFF = { ...FLAGS_ON, provider_requests_enabled: false };

test.beforeAll(() => fs.mkdirSync(SHOT, { recursive: true }));

test('provider: home, search, request modal, conflict, confirmation, inventory, my requests', async ({
  page,
}) => {
  await seed(page, PROVIDER);
  await mockGateway(page, FLAGS_ON);
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Karol Patel, NP');
  await expect(page.getByText('Available in Cardiology')).toBeVisible();
  await expect(page.getByText('Top requested')).toBeVisible();
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/DRX-|CARDIO1/);
  await page.screenshot({ path: `${SHOT}/01-provider-home.png`, fullPage: true });

  await page.getByRole('searchbox').fill('war');
  await expect(page.getByText('None available').first()).toBeVisible();
  await page.screenshot({ path: `${SHOT}/02-provider-search-none.png`, fullPage: true });
  await page.getByRole('searchbox').fill('lis');
  await expect(page.getByText('Results for')).toBeVisible();

  await page.getByRole('button', { name: 'Request dispense' }).first().click();
  await expect(page.getByText('Earliest expiry that would be reserved')).toBeVisible();
  await expect(page.getByTestId('earliest-expiry-hint')).toContainText('03/07/2027');
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await page.getByLabel(/Patient reference/).fill('10423');
  await page.screenshot({ path: `${SHOT}/03-request-modal.png`, fullPage: true });
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByTestId('request-confirmation')).toBeVisible();
  await expect(page.getByText('Track in My Requests')).toBeVisible();
  await page.screenshot({ path: `${SHOT}/04-request-confirmation.png`, fullPage: true });
  await page.getByRole('button', { name: 'Done' }).click();

  // Conflict path (E2/T3): the unit was reserved by someone else meanwhile.
  await page.unroute(`${GATEWAY}/**`);
  await mockGateway(page, FLAGS_ON, { conflict: true });
  await page.getByRole('button', { name: 'Request dispense' }).first().click();
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.locator('[data-error-kind="conflict"]')).toBeVisible();
  await page.screenshot({ path: `${SHOT}/05-request-conflict.png`, fullPage: true });
  await page.keyboard.press('Escape');

  await page.goto('/inventory', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Inventory');
  await expect(page.getByText('Lisinopril').locator('visible=true').first()).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/DRX-|CARDIO1/);
  await page.screenshot({ path: `${SHOT}/06-provider-inventory.png`, fullPage: true });

  await page.goto('/requests', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('My Requests');
  await expect(
    page.getByText('Denied: could not locate').locator('visible=true').first()
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel request' }).first()).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/DRX-|CARDIO1/);
  await page.screenshot({ path: `${SHOT}/07-my-requests.png`, fullPage: true });
});

test('provider: flag off = read-only, no request UI', async ({ page }) => {
  await seed(page, PROVIDER);
  await mockGateway(page, FLAGS_OFF);
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByText('Dispense requests are turned off')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request dispense' })).toHaveCount(0);
  await page.screenshot({ path: `${SHOT}/08-provider-flag-off.png`, fullPage: true });
});

test('superadmin: request queue with badge, deny needs a reason, settings panel', async ({
  page,
}) => {
  await seed(page, SUPER);
  await mockGateway(page, FLAGS_ON);
  await page.goto('/requests', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Requests');
  await expect(page.getByText('Karol Patel, NP')).toBeVisible();
  await expect(page.getByText('DRX-MASS-CARDIO1-00042')).toBeVisible();
  await expect(page.locator('[data-ttl="live"]').first()).toBeVisible();
  await page.screenshot({ path: `${SHOT}/09-queue-pending.png`, fullPage: true });

  await page.getByRole('button', { name: 'Deny' }).first().click();
  await page.getByRole('button', { name: 'Deny request' }).click();
  await expect(page.getByText('A reason is required')).toBeVisible();
  await page.getByRole('button', { name: 'Could not locate' }).click();
  await page.screenshot({ path: `${SHOT}/10-queue-deny.png`, fullPage: true });
  await page.getByRole('button', { name: 'Deny request' }).click();
  await expect(page.locator('[data-request-id="r1"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Fulfill' }).first().click();
  await expect(page.locator('[data-request-id="r2"]')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Resolved' }).click();
  await expect(page.getByRole('button', { name: 'Return to shelf' }).first()).toBeVisible();
  await page.screenshot({ path: `${SHOT}/11-queue-resolved.png`, fullPage: true });

  await page.goto('/settings', { waitUntil: 'networkidle' });
  const isSmall = (page.viewportSize()?.width ?? 1280) < 768;
  if (isSmall) {
    await page.getByRole('combobox', { name: 'Settings section' }).click();
    await page.getByRole('option', { name: 'Provider requests' }).click();
  } else {
    await page.getByRole('tab', { name: 'Provider requests' }).click();
  }
  await expect(page.getByText('Allow dispense requests')).toBeVisible();
  await page.screenshot({ path: `${SHOT}/12-settings-provider-requests.png`, fullPage: true });
});
