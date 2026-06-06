#!/usr/bin/env node
// Backend smoke tests using built-in fetch. Runs without Playwright.
// Outputs JSON results to stdout.

const SERVICES = {
  gateway: 'https://daanahealth-gateway.onrender.com',
  auth: 'https://daanahealth-auth.onrender.com',
  inventory: 'https://daanahealth-inventory.onrender.com',
  transaction: 'https://daanahealth-transaction.onrender.com',
  notification: 'https://daanahealth-notification.onrender.com',
};

const TIMEOUT_MS = 60_000;

async function timed(label, fn) {
  const t0 = Date.now();
  try {
    const out = await fn();
    return { label, ok: true, ms: Date.now() - t0, ...out };
  } catch (err) {
    return {
      label,
      ok: false,
      ms: Date.now() - t0,
      error: (err && err.message) || String(err),
    };
  }
}

async function doFetch(url, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const text = await res.text().catch(() => '');
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 400);
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const results = [];

  // 1) health checks per service
  for (const [name, base] of Object.entries(SERVICES)) {
    results.push(
      await timed(`health:${name}`, async () => {
        const r = await doFetch(`${base}/health`);
        return {
          status: r.status,
          pass: r.status === 200,
          body: r.body,
        };
      }),
    );
  }

  // 2) POST /carts without auth => expect 401
  results.push(
    await timed('transaction:POST /carts no-auth -> 401', async () => {
      const r = await doFetch(`${SERVICES.transaction}/carts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      return { status: r.status, pass: r.status === 401, body: r.body };
    }),
  );

  // 3) GET /items without auth => expect 401
  results.push(
    await timed('inventory:GET /items no-auth -> 401', async () => {
      const r = await doFetch(`${SERVICES.inventory}/items`);
      return { status: r.status, pass: r.status === 401, body: r.body };
    }),
  );

  // 4) gateway /health via gateway prefix also (already covered) - add a 404 sanity check
  results.push(
    await timed('gateway:GET /does-not-exist -> 404', async () => {
      const r = await doFetch(`${SERVICES.gateway}/__definitely_not_a_route__`);
      return {
        status: r.status,
        pass: r.status === 404 || r.status === 401 || r.status === 403,
        body: r.body,
      };
    }),
  );

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.ok && r.pass !== false).length,
    failed: results.filter((r) => !(r.ok && r.pass !== false)).length,
    results,
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('fatal', e);
  process.exit(2);
});
