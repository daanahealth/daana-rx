#!/usr/bin/env bash
# Run the PR browser walkthrough and capture screenshots into e2e/screenshots/pr.
#
# Env:
#   E2E_FRONTEND_URL  target app (default live https://daanahealth-rx.onrender.com).
#                     For local PR validation, start the app and set this to
#                     http://localhost:3000 before running.
#   E2E_GATEWAY_URL   backend gateway (default live).
#   E2E_TEST_EMAIL / E2E_TEST_PASSWORD  optional existing account (else a
#                     throwaway clinic is self-provisioned).
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"

export E2E_FRONTEND_URL="${E2E_FRONTEND_URL:-https://daanahealth-rx.onrender.com}"
export E2E_GATEWAY_URL="${E2E_GATEWAY_URL:-https://daanahealth-gateway.onrender.com}"
echo "Frontend target: $E2E_FRONTEND_URL"
echo "Gateway target:  $E2E_GATEWAY_URL"
[ -n "${E2E_TEST_EMAIL:-}" ] && echo "Account: ${E2E_TEST_EMAIL} (provided)" || echo "Account: self-provisioned throwaway clinic"

npx playwright install --with-deps chromium >/dev/null 2>&1 || npx playwright install chromium
# E2E_PROJECT=mobile runs the phone viewport into e2e/screenshots/pr-mobile.
PROJECT="${E2E_PROJECT:-chromium}"
if [ "$PROJECT" = "mobile" ]; then export E2E_SHOT_DIR="e2e/screenshots/pr-mobile"; else export E2E_SHOT_DIR="e2e/screenshots/pr"; fi
rm -rf "$E2E_SHOT_DIR" && mkdir -p "$E2E_SHOT_DIR"
npx playwright test --config e2e/playwright.config.ts e2e/pr-walkthrough.spec.ts --project="$PROJECT" --reporter=list
