# E2E Smoke Tests

Live-environment smoke tests for DaanaRX.

## Targets

- Frontend: https://daanahealth-rx.onrender.com
- Gateway: https://daanahealth-gateway.onrender.com
- Auth / Inventory / Transaction / Notification: `https://daanahealth-<svc>.onrender.com`

## Run

```bash
# Backend-only (no browser, uses Node 18+ built-in fetch)
node e2e/backend-smoke.mjs

# Full Playwright suite (requires devDeps installed)
npx playwright install chromium
npx playwright test --config e2e/playwright.config.ts --reporter=list
```

## Notes

- Render free tier has cold starts; first request to each service can take 20-60s.
- The Playwright config sets generous timeouts and one retry.
- These tests are read-only — no accounts created, no live writes.
