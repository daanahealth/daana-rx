// Functional E2E across every gateway endpoint, against the live system.
// Signs up a throwaway clinic, then exercises reads + writes and asserts
// behavior (e.g. check-in then verify the item appears). Prints a matrix and
// records created ids for cleanup.
//
//   node e2e/functional-api.mjs            # live gateway
//   E2E_GATEWAY_URL=http://localhost:4000 node e2e/functional-api.mjs
//
// Exit code is non-zero if any "expected" assertion fails.

const GW = process.env.E2E_GATEWAY_URL || 'https://daanahealth-gateway.onrender.com';
const MASS_TYPE_ID = '98d7c841-3ed7-47bb-8263-7ec435ff0efc'; // public.item_types 'medication'

const stamp = Date.now();
const email = `e2e_${stamp}@daana-test.local`;
const password = `E2eTest!${stamp}`;
const clinicName = `E2E Test Clinic ${stamp}`;
const locCode = `E2E-LOC-${stamp}`;

let token = null;
let clinicId = null;
const created = { items: [], locations: [], carts: [] };
const rows = [];

function log(...a) { console.log(...a); }

async function call(method, path, { body, auth = true, expect } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
    if (clinicId) headers['x-clinic-id'] = clinicId;
  }
  let status = 0, data = null, err = null;
  try {
    const res = await fetch(`${GW}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    status = res.status;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  } catch (e) {
    err = e.message;
  }
  return { status, data, err };
}

function record(name, method, path, res, opts = {}) {
  const { expectStatus, expectOk } = opts;
  let verdict;
  if (res.err) verdict = 'ERR';
  else if (expectStatus) verdict = res.status === expectStatus ? 'PASS' : 'FAIL';
  else if (expectOk) verdict = res.status >= 200 && res.status < 300 ? 'PASS' : 'FAIL';
  else verdict = res.status >= 200 && res.status < 400 ? 'PASS' : (res.status < 500 ? 'WARN' : 'FAIL');
  const note = res.err
    ? res.err
    : (typeof res.data === 'object' && res.data && res.data.error)
      ? String(res.data.error).slice(0, 70)
      : '';
  rows.push({ name, method, path, status: res.status, verdict, note });
  return res;
}

async function main() {
  log(`\n=== Functional E2E vs ${GW} ===`);
  log(`test account: ${email}\n`);

  // ---- AUTH: signup (setup) ----
  let r = await call('POST', '/auth/signup', { auth: false, body: { email, password, clinicName } });
  record('signup', 'POST', '/auth/signup', r, { expectStatus: 200 });
  if (r.data && r.data.token) { token = r.data.token; clinicId = r.data.clinic?.clinicId; }
  if (!token) { log('FATAL: signup did not return a token; cannot continue authed tests.'); printMatrix(); process.exit(1); }
  log(`signed up — clinicId=${clinicId}\n`);

  // ---- AUTH reads ----
  record('me', 'GET', '/auth/me', await call('GET', '/auth/me'), { expectStatus: 200 });
  record('users', 'GET', '/auth/users', await call('GET', '/auth/users'), { expectOk: true });
  record('clinics', 'GET', '/auth/clinics', await call('GET', '/auth/clinics'), { expectOk: true });
  record('clinic', 'GET', '/auth/clinic', await call('GET', '/auth/clinic'), { expectOk: true });
  record('check-email', 'GET', '/auth/check-email?email=' + encodeURIComponent(email), await call('GET', '/auth/check-email?email=' + encodeURIComponent(email)), { expectOk: true });
  record('auth requires token', 'GET', '/auth/me (no token)', await call('GET', '/auth/me', { auth: false }), { expectStatus: 401 });

  // ---- INVENTORY reads ----
  record('stats', 'GET', '/inventory/stats', await call('GET', '/inventory/stats'), { expectOk: true });
  record('locations', 'GET', '/inventory/locations', await call('GET', '/inventory/locations'), { expectOk: true });
  record('locations/v2', 'GET', '/inventory/locations/v2', await call('GET', '/inventory/locations/v2'), { expectOk: true });
  record('drugs/search', 'GET', '/inventory/drugs/search?q=amoxicillin', await call('GET', '/inventory/drugs/search?q=amoxicillin'), { expectOk: true });
  record('items list', 'GET', '/inventory/items', await call('GET', '/inventory/items'), { expectOk: true });
  record('next-code', 'GET', '/inventory/items/next-code?location=E2E', await call('GET', '/inventory/items/next-code?location=E2E'), {});
  record('classification GET', 'GET', '/inventory/settings/classification', await call('GET', '/inventory/settings/classification'), { expectStatus: 200 });
  record('expiry/report', 'GET', '/inventory/expiry/report', await call('GET', '/inventory/expiry/report'), { expectOk: true });

  // ---- INVENTORY writes: create a location ----
  r = record('create location', 'POST', '/inventory/locations', await call('POST', '/inventory/locations', { body: { name: locCode, temp: 'room temp' } }), { expectOk: true });
  let legacyLocId = r.data?.location?.id || r.data?.location?.location_id || r.data?.location_id || r.data?.id;
  if (!legacyLocId) {
    const ll = await call('GET', '/inventory/locations/v2');
    const larr = Array.isArray(ll.data) ? ll.data : ll.data?.locations ?? [];
    legacyLocId = larr.find((l) => l.code === locCode)?.id;
  }
  if (legacyLocId) created.locations.push(legacyLocId);

  // next-code against the REAL location we just created (resolves by code,
  // uses the location's default item_type_id). Previously 500'd on locations.id.
  record('next-code (real location)', 'GET', `/inventory/items/next-code?location=${locCode}`,
    await call('GET', `/inventory/items/next-code?location=${encodeURIComponent(locCode)}`), { expectStatus: 200 });

  // ---- CHECK-IN (platform items schema) then verify it appears ----
  // The backend expects { type_id, location_id, attributes, expiry_date } and
  // resolves the location from the PLATFORM locations schema (id, code).
  const attributes = { medication_name: 'Amoxicillin', dosage: '500', unit: 'mg', form: 'Bottle', specialty_class: 'INFECT' };
  r = record('check-in (platform body: type_id+location_id)', 'POST', '/inventory/items', await call('POST', '/inventory/items', {
    body: { type_id: MASS_TYPE_ID, location_id: legacyLocId, attributes, expiry_date: '2030-01-01' },
  }), { expectStatus: 201 });
  const newItemId = r.data?.item?.id;
  if (newItemId) created.items.push(newItemId);

  // Verify behavior: the just-created item shows up in the inventory list.
  if (newItemId) {
    const list = await call('GET', '/inventory/items');
    const arr = Array.isArray(list.data) ? list.data : list.data?.items ?? [];
    const found = arr.some((i) => i.id === newItemId);
    rows.push({ name: 'check-in PERSISTS (item in list)', method: 'GET', path: '/inventory/items', status: list.status, verdict: found ? 'PASS' : 'FAIL', note: found ? 'item visible' : 'item NOT in list' });
  }

  // ---- Check-in via the FE's NATURAL body shape (typeName + locationCode) ----
  // This is exactly what src/app/checkin/page.tsx sends. Must persist.
  r = record('check-in (FE shape: typeName+locationCode)', 'POST', '/inventory/items', await call('POST', '/inventory/items', {
    body: { typeName: 'medication', locationCode: locCode, expiryDate: '2030-01-01', dateReceived: '2026-06-09', attributes },
  }), { expectStatus: 201 });
  const feItemId = r.data?.item?.id;
  if (feItemId) {
    created.items.push(feItemId);
    const list = await call('GET', '/inventory/items');
    const arr = Array.isArray(list.data) ? list.data : list.data?.items ?? [];
    const found = arr.some((i) => i.id === feItemId);
    rows.push({ name: 'FE-shape check-in PERSISTS', method: 'GET', path: '/inventory/items', status: list.status, verdict: found ? 'PASS' : 'FAIL', note: found ? 'item visible in inventory' : 'item NOT in list' });
  }

  // ---- CLASSIFICATION write then verify persisted ----
  const customGuide = [{ class_name: 'E2ETEST', common_examples: ['ZZZDrug'], location_code: 'E2EBIN', two_digit_code: 'ZZ', supervisor_review: true }];
  record('classification PATCH', 'PATCH', '/inventory/settings/classification', await call('PATCH', '/inventory/settings/classification', { body: { entries: customGuide } }), { expectStatus: 200 });
  {
    const g = await call('GET', '/inventory/settings/classification');
    const entries = g.data?.entries ?? [];
    const persisted = entries.some((e) => e.class_name === 'E2ETEST');
    rows.push({ name: 'classification PERSISTS', method: 'GET', path: '/inventory/settings/classification', status: g.status, verdict: persisted ? 'PASS' : 'FAIL', note: persisted ? 'override saved' : 'override NOT saved' });
  }

  // ---- TRANSACTION: carts + checkout + reports ----
  r = record('create cart', 'POST', '/transactions/carts', await call('POST', '/transactions/carts'), { expectOk: true });
  const cartId = r.data?.id || r.data?.cart?.id;
  if (cartId) created.carts.push(cartId);
  if (cartId && newItemId) {
    record('add to cart', 'POST', `/transactions/carts/${cartId}/items`, await call('POST', `/transactions/carts/${cartId}/items`, { body: { item_id: newItemId } }), {});
    record('approve cart', 'POST', `/transactions/carts/${cartId}/approve`, await call('POST', `/transactions/carts/${cartId}/approve`), {});
  }
  record('carts list', 'GET', '/transactions/carts', await call('GET', '/transactions/carts'), { expectOk: true });
  record('reports/expiring', 'GET', '/transactions/reports/expiring?window=30', await call('GET', '/transactions/reports/expiring?window=30'), { expectOk: true });
  record('reports/capacity', 'GET', '/transactions/reports/capacity', await call('GET', '/transactions/reports/capacity'), { expectOk: true });
  record('transaction log', 'GET', '/transactions?limit=10', await call('GET', '/transactions?limit=10'), { expectOk: true });

  // ---- NOTIFICATION ----
  record('feedback', 'POST', '/notifications/feedback', await call('POST', '/notifications/feedback', { body: { feedbackType: 'Bug', feedbackMessage: 'Title: e2e\n\nautomated functional test' } }), { expectOk: true });

  // ---- ITEM edit + remove (if we have one) ----
  // Use the FE-shape item (still active; the platform-body item gets checked
  // out via the cart flow above, so removing it would correctly 409).
  const editTarget = feItemId || newItemId;
  if (editTarget) {
    record('edit item', 'PATCH', `/inventory/items/${editTarget}`, await call('PATCH', `/inventory/items/${editTarget}`, { body: { attributes: { ...attributes, notes: 'edited by e2e' } } }), { expectOk: true });
    record('item transactions', 'GET', `/inventory/items/${editTarget}/transactions`, await call('GET', `/inventory/items/${editTarget}/transactions`), { expectOk: true });
    record('remove item', 'POST', `/inventory/items/${editTarget}/remove`, await call('POST', `/inventory/items/${editTarget}/remove`, { body: { reason: 'incorrect_entry', note: 'e2e cleanup' } }), { expectOk: true });
  }

  // ---- ACCOUNT password (throwaway user) ----
  record('account/password', 'POST', '/auth/account/password', await call('POST', '/auth/account/password', { body: { currentPassword: password, newPassword: password + 'X' } }), { expectOk: true });

  printMatrix();
  // Emit created ids as JSON on the last line for the cleanup step.
  log('\nCREATED_JSON=' + JSON.stringify({ email, clinicId, ...created }));
  const failed = rows.filter((x) => x.verdict === 'FAIL' || x.verdict === 'ERR').length;
  process.exit(failed > 0 ? 2 : 0);
}

function printMatrix() {
  log('\n  RESULT  STATUS  METHOD  ENDPOINT' + ' '.repeat(28) + 'NOTE');
  log('  ' + '-'.repeat(96));
  for (const x of rows) {
    const v = x.verdict.padEnd(6);
    const s = String(x.status).padEnd(6);
    const m = x.method.padEnd(6);
    const p = x.path.length > 44 ? x.path.slice(0, 43) + '…' : x.path.padEnd(44);
    log(`  ${v}  ${s}  ${m}  ${p} ${x.note}`);
  }
  const c = { PASS: 0, FAIL: 0, WARN: 0, ERR: 0 };
  rows.forEach((x) => { c[x.verdict] = (c[x.verdict] || 0) + 1; });
  log('\n  totals:', JSON.stringify(c));
}

main().catch((e) => { console.error('harness error:', e); process.exit(1); });
