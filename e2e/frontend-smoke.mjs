#!/usr/bin/env node
// Fallback frontend smoke when Playwright (browser) is unavailable.
// We fetch HTML and assert presence of key markers via simple string checks.

const FE = process.env.E2E_FRONTEND_URL ?? 'https://daanahealth-rx.onrender.com';
const TIMEOUT = 60_000;

async function getPage(path) {
  const t0 = Date.now();
  const controller = new AbortController();
  const tm = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${FE}${path}`, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': 'daana-e2e-smoke/1.0' },
    });
    const html = await res.text().catch(() => '');
    return {
      path,
      status: res.status,
      location: res.headers.get('location'),
      ms: Date.now() - t0,
      length: html.length,
      // Cheap markers
      hasTitle: /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? null,
      hasSearchInput:
        /input[^>]+type=["']?search["']?/i.test(html) ||
        /placeholder=["'][^"']*search/i.test(html),
      hasEmailInput:
        /input[^>]+type=["']?email["']?/i.test(html) ||
        /name=["']email["']/i.test(html),
      hasPasswordInput:
        /input[^>]+type=["']?password["']?/i.test(html) ||
        /name=["']password["']/i.test(html),
    };
  } finally {
    clearTimeout(tm);
  }
}

async function follow(path) {
  // Manually follow up to 5 redirects so we know what /inventory resolves to
  let cur = path;
  const chain = [];
  for (let i = 0; i < 5; i++) {
    const r = await getPage(cur);
    chain.push({ path: cur, status: r.status, location: r.location });
    if (r.status >= 300 && r.status < 400 && r.location) {
      const next = r.location.startsWith('http')
        ? r.location.replace(FE, '')
        : r.location;
      cur = next;
      continue;
    }
    return { chain, final: r };
  }
  return { chain, final: null };
}

async function main() {
  const results = {};
  results.t1_home = await getPage('/');
  results.t2_signin = await getPage('/auth/signin');
  results.t3_forgot = await getPage('/auth/forgot-password');
  results.t4_inventory_redirect = await follow('/inventory');
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
